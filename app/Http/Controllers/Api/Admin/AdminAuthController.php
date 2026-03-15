<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AdminAudit;
use App\Support\Totp;
use Illuminate\Support\Facades\Cache;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AdminAuthController extends Controller
{
    private const MFA_CHALLENGE_TTL_SECONDS = 300;
    private const MFA_STEP_UP_SESSION_KEY = 'admin_mfa_last_verified_at';
    private const MFA_STEP_UP_CACHE_PREFIX = 'admin-mfa-step-up:';

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $throttleKey = $this->throttleKey($request);

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);

            Log::channel('security')->warning('Admin login rate limit exceeded.', [
                'email' => strtolower((string) $request->input('email')),
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'message' => "Too many admin login attempts. Try again in {$seconds} seconds.",
            ], 429);
        }

        $user = User::query()
            ->where('email', $validated['email'])
            ->where('is_admin', true)
            ->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            RateLimiter::hit($throttleKey, 300);

            Log::channel('security')->warning('Admin login failed.', [
                'email' => strtolower((string) $validated['email']),
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'message' => 'Invalid admin credentials.',
            ], 422);
        }

        RateLimiter::clear($throttleKey);

        $user->forceFill([
            'last_login_at' => now(),
        ])->save();

        $user->tokens()->where('name', 'admin')->delete();

        if ((bool) $user->admin_mfa_enabled) {
            $challengeToken = Str::random(80);

            Cache::put($this->challengeCacheKey($challengeToken), [
                'admin_user_id' => $user->id,
                'ip' => $request->ip(),
            ], now()->addSeconds(self::MFA_CHALLENGE_TTL_SECONDS));

            return response()->json([
                'mfa_required' => true,
                'challenge_token' => $challengeToken,
                'message' => 'Enter your MFA code to complete admin sign in.',
            ], 202);
        }

        Auth::guard('web')->login($user);
        $request->session()->regenerate();
        $this->markStepUpVerified($request);

        AdminAudit::log($request, 'admin-login', 'Admin signed in successfully.', $user->id);

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_admin' => (bool) $user->is_admin,
            ],
        ]);
    }

    public function verifyMfa(Request $request)
    {
        $validated = $request->validate([
            'challenge_token' => ['required', 'string', 'size:80'],
            'code' => ['nullable', 'string'],
            'recovery_code' => ['nullable', 'string'],
        ]);

        $challengeToken = $validated['challenge_token'];
        $challenge = Cache::get($this->challengeCacheKey($challengeToken));

        if (! is_array($challenge)) {
            return response()->json([
                'message' => 'MFA challenge expired. Please sign in again.',
            ], 422);
        }

        $user = User::query()
            ->where('id', (int) ($challenge['admin_user_id'] ?? 0))
            ->where('is_admin', true)
            ->first();

        if (! $user || ! $user->admin_mfa_enabled || ! is_string($user->admin_mfa_secret) || trim($user->admin_mfa_secret) === '') {
            Cache::forget($this->challengeCacheKey($challengeToken));

            return response()->json([
                'message' => 'MFA verification is unavailable for this account.',
            ], 422);
        }

        $valid = false;
        $usedRecoveryCode = false;
        $recoveryCodeInput = trim((string) ($validated['recovery_code'] ?? ''));
        $totpInput = trim((string) ($validated['code'] ?? ''));

        if ($recoveryCodeInput !== '') {
            $valid = $this->consumeRecoveryCode($user, $recoveryCodeInput);
            $usedRecoveryCode = $valid;
        } else {
            $secret = decrypt($user->admin_mfa_secret);
            $valid = Totp::verifyCode($secret, $totpInput);
        }

        if (! $valid) {
            Log::channel('security')->warning('Admin MFA login verification failed.', [
                'admin_user_id' => $user->id,
                'ip' => $request->ip(),
                'used_recovery_code' => $recoveryCodeInput !== '',
            ]);

            return response()->json([
                'message' => 'Invalid MFA code. Please try again.',
            ], 422);
        }

        Cache::forget($this->challengeCacheKey($challengeToken));

        $user->tokens()->where('name', 'admin')->delete();
        Auth::guard('web')->login($user);
        $request->session()->regenerate();
        $this->markStepUpVerified($request);

        AdminAudit::log($request, 'admin-login-mfa-verified', $usedRecoveryCode ? 'Admin signed in using MFA recovery code.' : 'Admin MFA verification successful.', $user->id);

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_admin' => (bool) $user->is_admin,
            ],
        ]);
    }

    public function session(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_admin' => (bool) $user->is_admin,
            ],
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();

        if ($user) {
            $user->tokens()->where('name', 'admin')->delete();
            Cache::forget($this->stepUpCacheKey($user->id));
            AdminAudit::log($request, 'admin-logout', 'Admin signed out.', $user->id);
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Admin logged out successfully.',
        ]);
    }

    public function changePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password'      => ['required', 'string'],
            'new_password'          => ['required', 'string', Password::defaults(), 'confirmed'],
        ]);

        $user = $request->user();

        if (! Hash::check($validated['current_password'], $user->password)) {
            return response()->json(['message' => 'Current password is incorrect.'], 422);
        }

        $user->forceFill(['password' => Hash::make($validated['new_password'])])->save();

        $user->tokens()->delete();
        $request->session()->regenerate();

        AdminAudit::log($request, 'admin-change-password', 'Admin password changed.', $user->id);

        return response()->json([
            'message' => 'Password changed successfully.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_admin' => (bool) $user->is_admin,
            ],
        ]);
    }

    public function mfaStatus(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'enabled' => (bool) $user->admin_mfa_enabled,
            'recovery_codes_remaining' => count($user->admin_mfa_recovery_codes ?? []),
        ]);
    }

    public function mfaSetup(Request $request)
    {
        $user = $request->user();
        $secret = Totp::generateSecret();
        $otpauthUri = Totp::provisioningUri(config('app.name', 'Auctify Admin'), $user->email, $secret);

        return response()->json([
            'secret' => $secret,
            'otpauth_uri' => $otpauthUri,
        ]);
    }

    public function mfaEnable(Request $request)
    {
        $validated = $request->validate([
            'secret' => ['required', 'string', 'min:16', 'max:128'],
            'code' => ['required', 'string'],
        ]);

        $user = $request->user();

        if (! Totp::verifyCode($validated['secret'], $validated['code'])) {
            Log::channel('security')->warning('Admin MFA enable verification failed.', [
                'admin_user_id' => $user->id,
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'message' => 'Invalid MFA setup code. Please try again.',
            ], 422);
        }

        $recoveryCodesPlain = $this->generateRecoveryCodes();
        $recoveryCodesHashed = array_map(static fn (string $code): string => Hash::make($code), $recoveryCodesPlain);

        $user->forceFill([
            'admin_mfa_enabled' => true,
            'admin_mfa_secret' => encrypt($validated['secret']),
            'admin_mfa_recovery_codes' => $recoveryCodesHashed,
        ])->save();

        AdminAudit::log($request, 'admin-mfa-enabled', 'Admin enabled MFA.', $user->id);

        return response()->json([
            'message' => 'MFA enabled successfully. Store your recovery codes in a secure location.',
            'recovery_codes' => $recoveryCodesPlain,
        ]);
    }

    public function mfaDisable(Request $request)
    {
        $validated = $request->validate([
            'code' => ['required', 'string'],
        ]);

        $user = $request->user();

        if (! $user->admin_mfa_enabled || ! is_string($user->admin_mfa_secret) || trim($user->admin_mfa_secret) === '') {
            return response()->json([
                'message' => 'MFA is already disabled.',
            ], 422);
        }

        $secret = decrypt($user->admin_mfa_secret);

        if (! Totp::verifyCode($secret, $validated['code'])) {
            Log::channel('security')->warning('Admin MFA disable verification failed.', [
                'admin_user_id' => $user->id,
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'message' => 'Invalid MFA code. Please try again.',
            ], 422);
        }

        $user->forceFill([
            'admin_mfa_enabled' => false,
            'admin_mfa_secret' => null,
            'admin_mfa_recovery_codes' => null,
        ])->save();

        Cache::forget($this->stepUpCacheKey($user->id));

        AdminAudit::log($request, 'admin-mfa-disabled', 'Admin disabled MFA.', $user->id);

        return response()->json([
            'message' => 'MFA disabled successfully.',
        ]);
    }

    public function stepUpMfa(Request $request)
    {
        $validated = $request->validate([
            'code' => ['nullable', 'string'],
            'recovery_code' => ['nullable', 'string'],
        ]);

        $user = $request->user();

        if (! $user || ! $user->is_admin) {
            return response()->json([
                'message' => 'Admin authentication required.',
            ], 403);
        }

        if (! $user->admin_mfa_enabled || ! is_string($user->admin_mfa_secret) || trim($user->admin_mfa_secret) === '') {
            return response()->json([
                'message' => 'Enable admin MFA to perform this action.',
                'code' => 'admin_mfa_required',
            ], 403);
        }

        $recoveryCodeInput = trim((string) ($validated['recovery_code'] ?? ''));
        $totpInput = trim((string) ($validated['code'] ?? ''));

        $valid = false;
        $usedRecoveryCode = false;

        if ($recoveryCodeInput !== '') {
            $valid = $this->consumeRecoveryCode($user, $recoveryCodeInput);
            $usedRecoveryCode = $valid;
        } else {
            $secret = decrypt($user->admin_mfa_secret);
            $valid = Totp::verifyCode($secret, $totpInput);
        }

        if (! $valid) {
            Log::channel('security')->warning('Admin MFA step-up verification failed.', [
                'admin_user_id' => $user->id,
                'ip' => $request->ip(),
                'used_recovery_code' => $recoveryCodeInput !== '',
            ]);

            return response()->json([
                'message' => 'Invalid MFA code. Please try again.',
            ], 422);
        }

        $this->markStepUpVerified($request);

        AdminAudit::log(
            $request,
            'admin-mfa-step-up-verified',
            $usedRecoveryCode
                ? 'Admin completed MFA step-up with recovery code.'
                : 'Admin completed MFA step-up verification.',
            $user->id,
        );

        return response()->json([
            'message' => 'MFA step-up verified.',
            'verified_until_unix' => (int) $request->session()->get(self::MFA_STEP_UP_SESSION_KEY),
        ]);
    }

    protected function throttleKey(Request $request): string
    {
        return Str::lower((string) $request->input('email')).'|'.$request->ip();
    }

    private function challengeCacheKey(string $token): string
    {
        return 'admin-mfa-challenge:'.$token;
    }

    private function stepUpCacheKey(int $adminUserId): string
    {
        return self::MFA_STEP_UP_CACHE_PREFIX.$adminUserId;
    }

    private function generateRecoveryCodes(int $count = 8): array
    {
        $codes = [];

        for ($index = 0; $index < $count; $index++) {
            $codes[] = strtoupper(Str::random(4).'-'.Str::random(4));
        }

        return $codes;
    }

    private function consumeRecoveryCode(User $user, string $candidate): bool
    {
        $recoveryCodes = $user->admin_mfa_recovery_codes ?? [];

        if (! is_array($recoveryCodes) || count($recoveryCodes) === 0) {
            return false;
        }

        $normalizedCandidate = strtoupper(str_replace(' ', '', $candidate));
        $remaining = [];
        $used = false;

        foreach ($recoveryCodes as $hashed) {
            if (! is_string($hashed)) {
                continue;
            }

            if (! $used && Hash::check($normalizedCandidate, $hashed)) {
                $used = true;
                continue;
            }

            $remaining[] = $hashed;
        }

        if (! $used) {
            return false;
        }

        $user->forceFill([
            'admin_mfa_recovery_codes' => $remaining,
        ])->save();

        return true;
    }

    private function markStepUpVerified(Request $request): void
    {
        $verifiedAt = time();
        $stepUpTtl = (int) config('security.admin_mfa_step_up_ttl_seconds', 600);

        if (method_exists($request, 'hasSession') && $request->hasSession()) {
            $request->session()->put(self::MFA_STEP_UP_SESSION_KEY, $verifiedAt);
        }

        if ($request->user()?->id) {
            Cache::put($this->stepUpCacheKey((int) $request->user()->id), $verifiedAt, now()->addSeconds(max(60, $stepUpTtl)));
        }
    }
}
