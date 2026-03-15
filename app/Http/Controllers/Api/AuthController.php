<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\AdminNotification;
use App\Models\AdminSetting;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Laravel\Socialite\Facades\Socialite;

class AuthController extends Controller
{
    public function googleRedirect(Request $request)
    {
        $frontend = $this->resolveFrontendUrl($request->query('frontend'));
        $statePayload = base64_encode(json_encode([
            'frontend' => $frontend,
        ]));

        /** @var \Laravel\Socialite\Two\AbstractProvider $provider */
        $provider = Socialite::driver('google');

        return $provider
            ->stateless()
            ->with(['state' => $statePayload])
            ->redirect();
    }

    public function googleCallback(Request $request)
    {
        $state = $this->extractState($request);
        $frontendUrl = $this->resolveFrontendUrl($state['frontend'] ?? null);
        $googleUser = null;

        try {
            /** @var \Laravel\Socialite\Two\AbstractProvider $provider */
            $provider = Socialite::driver('google');
            /** @var \Laravel\Socialite\Two\User $googleUser */
            $googleUser = $provider->stateless()->user();
        } catch (\Throwable $error) {
            return redirect()->away($frontendUrl . '/login?google_error=auth_failed');
        }

        if (! $googleUser) {
            return redirect()->away($frontendUrl . '/login?google_error=auth_failed');
        }

        $googleEmail = strtolower(trim((string) $googleUser->getEmail()));
        if ($googleEmail === '') {
            return redirect()->away($frontendUrl . '/login?google_error=auth_failed');
        }

        $deletedAccount = $this->findDeletedAccountRecord($googleEmail);
        if ($deletedAccount) {
            $reasonQuery = $deletedAccount['reason'] !== ''
                ? '&google_reason=' . urlencode($deletedAccount['reason'])
                : '';

            return redirect()->away($frontendUrl . '/login?google_error=account_deleted' . $reasonQuery);
        }

        $user = User::where('google_id', $googleUser->getId())
            ->orWhere('email', $googleEmail)
            ->first();
        $isNewGoogleAccount = false;

        if (! $user) {
            if (! (bool) AdminSetting::getValue('allow_registrations', true)) {
                return redirect()->away($frontendUrl . '/login?google_error=registrations_disabled');
            }

            $isNewGoogleAccount = true;
            $user = User::create([
                'name' => $googleUser->getName() ?: $googleUser->getNickname() ?: 'Google User',
                'email' => $googleEmail,
                'google_id' => $googleUser->getId(),
                'avatar' => $googleUser->getAvatar(),
                'password' => Hash::make(Str::random(64)),
            ]);

            $user->email_verified_at = Carbon::now();
            $user->last_login_at = Carbon::now();
            $user->save();
        } else {
            if (! $user->google_id) {
                $user->google_id = $googleUser->getId();
            }

            if (! $user->avatar && $googleUser->getAvatar()) {
                $user->avatar = $googleUser->getAvatar();
            }

            if (! $user->email_verified_at) {
                $user->email_verified_at = Carbon::now();
            }

            $user->last_login_at = Carbon::now();

            $user->save();
        }

        if ($user->is_suspended) {
            if ($user->suspended_until && now()->greaterThanOrEqualTo($user->suspended_until)) {
                $user->forceFill([
                    'is_suspended' => false,
                    'suspended_reason' => null,
                    'suspended_at' => null,
                    'suspended_until' => null,
                ])->save();
            }
        }

        if ($user->is_suspended) {
            $reasonQuery = $user->suspended_reason
                ? '&google_reason=' . urlencode((string) $user->suspended_reason)
                : '';
            $untilQuery = $user->suspended_until
                ? '&google_until=' . urlencode((string) optional($user->suspended_until)?->toIso8601String())
                : '';

            return redirect()->away($frontendUrl . '/login?google_error=account_suspended' . $reasonQuery . $untilQuery);
        }

        $token = $user->createToken('auth')->plainTextToken;
        $userPayload = base64_encode(json_encode([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'is_verified' => (bool) $user->is_verified,
            'verified_at' => $user->verified_at,
        ]));

        $redirectUrl = $frontendUrl
            . '/login?google_token=' . urlencode($token)
            . '&google_user=' . urlencode($userPayload)
            . '&google_created=' . ($isNewGoogleAccount ? '1' : '0');

        return redirect()->away($redirectUrl);
    }

    private function resolveFrontendUrl(?string $candidate): string
    {
        if (is_string($candidate) && preg_match('/^https?:\/\//i', $candidate)) {
            return rtrim($candidate, '/');
        }

        return rtrim(config('services.frontend.url'), '/');
    }

    private function extractState(Request $request): array
    {
        $stateRaw = $request->query('state');

        if (! is_string($stateRaw) || $stateRaw === '') {
            return [];
        }

        $decoded = json_decode(base64_decode($stateRaw, true) ?: '', true);

        if (is_array($decoded)) {
            return $decoded;
        }

        return [];
    }

    public function register(RegisterRequest $request)
    {
        if (! (bool) AdminSetting::getValue('allow_registrations', true)) {
            return response()->json([
                'message' => 'New account registrations are currently disabled by admin.',
            ], 403);
        }

        $validated = $request->validated();
        $deletedAccount = $this->findDeletedAccountRecord((string) ($validated['email'] ?? ''));

        if ($deletedAccount) {
            $message = $deletedAccount['reason'] !== ''
                ? 'This account was deleted by admin. Reason: ' . $deletedAccount['reason']
                : 'This account was deleted by admin and cannot be restored automatically.';

            return response()->json([
                'message' => $message,
                'account_status' => 'deleted',
                'reason' => $deletedAccount['reason'] !== '' ? $deletedAccount['reason'] : null,
            ], 403);
        }

        $user = User::create($validated);
        $user->forceFill([
            'last_login_at' => Carbon::now(),
        ])->save();
        $token = $user->createToken('auth')->plainTextToken;

        AdminNotification::notify(
            'user',
            'New user registered',
            "{$user->name} ({$user->email}) just created an account.",
            ['user_id' => $user->id]
        );

        return response()->json([
            'token' => $token,
            'user' => $user,
        ], 201);
    }

    public function login(LoginRequest $request)
    {
        $credentials = $request->validated();
        $email = strtolower(trim((string) ($credentials['email'] ?? '')));

        $deletedAccount = $this->findDeletedAccountRecord($email);

        $user = User::where('email', $email)->first();

        if (! $user && $deletedAccount) {
            $message = $deletedAccount['reason'] !== ''
                ? 'This account was deleted by admin. Reason: ' . $deletedAccount['reason']
                : 'This account was deleted by admin and can no longer sign in.';

            return response()->json([
                'message' => $message,
                'account_status' => 'deleted',
                'reason' => $deletedAccount['reason'] !== '' ? $deletedAccount['reason'] : null,
            ], 403);
        }

        if ($user && ! empty($user->google_id)) {
            return response()->json([
                'message' => 'This account uses Google sign-in. Please continue with Google.',
            ], 422);
        }

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'message' => 'The provided credentials are incorrect.',
            ], 422);
        }

        if ($user->is_suspended) {
            if ($user->suspended_until && now()->greaterThanOrEqualTo($user->suspended_until)) {
                $user->forceFill([
                    'is_suspended' => false,
                    'suspended_reason' => null,
                    'suspended_at' => null,
                    'suspended_until' => null,
                ])->save();
            }
        }

        if ($user->is_suspended) {
            $message = $user->suspended_reason
                ? 'This account is suspended. Reason: ' . $user->suspended_reason
                : 'This account is suspended. Please contact support.';

            return response()->json([
                'message' => $message,
                'account_status' => 'suspended',
                'reason' => $user->suspended_reason,
                'suspended_until' => optional($user->suspended_until)?->toIso8601String(),
            ], 403);
        }

        $user->forceFill([
            'last_login_at' => Carbon::now(),
        ])->save();

        $token = $user->createToken('auth')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user,
        ]);
    }

    public function me(Request $request)
    {
        return response()->json([
            'user' => $request->user(),
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()?->tokens()->delete();

        return response()->json([
            'message' => 'Signed out successfully.',
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'first_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'birthday' => ['nullable', 'date'],
            'gender' => ['nullable', 'string', 'in:male,female'],
            'current_password' => ['nullable', 'string'],
            'password' => ['nullable', 'string', Password::defaults(), 'confirmed'],
        ]);

        if (isset($validated['first_name']) || isset($validated['last_name'])) {
            $firstName = $validated['first_name'] ?? '';
            $lastName = $validated['last_name'] ?? '';
            $user->name = trim($firstName . ' ' . $lastName);
        }

        if (isset($validated['email'])) {
            $user->email = $validated['email'];
        }

        if (isset($validated['birthday'])) {
            $user->birthday = $validated['birthday'];
        }

        if (isset($validated['current_password']) && isset($validated['password'])) {
            if (! Hash::check($validated['current_password'], $user->password)) {
                return response()->json([
                    'message' => 'Current password is incorrect.',
                ], 422);
            }

            $user->password = Hash::make($validated['password']);
            $user->tokens()->delete();
        }

        $user->save();

        if (isset($validated['password'])) {
            $token = $user->createToken('auth')->plainTextToken;

            return response()->json([
                'user' => $user,
                'token' => $token,
                'message' => 'Profile updated successfully. Please log in with your new password.',
            ]);
        }

        return response()->json([
            'user' => $user,
            'message' => 'Profile updated successfully.',
        ]);
    }

    public function deleteAccount(Request $request)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json([
            'message' => 'Account deleted successfully.',
        ]);
    }

    private function findDeletedAccountRecord(string $email): ?array
    {
        $normalizedEmail = strtolower(trim($email));
        if ($normalizedEmail === '') {
            return null;
        }

        $actions = DB::table('admin_user_actions')
            ->where('action', 'delete-account')
            ->whereNotNull('details')
            ->latest('id')
            ->get(['reason', 'details']);

        foreach ($actions as $action) {
            $details = json_decode((string) $action->details, true);
            if (! is_array($details)) {
                continue;
            }

            $actionEmail = strtolower(trim((string) ($details['email'] ?? '')));
            if ($actionEmail === $normalizedEmail) {
                return [
                    'reason' => trim((string) ($action->reason ?? '')),
                ];
            }
        }

        return null;
    }
}
