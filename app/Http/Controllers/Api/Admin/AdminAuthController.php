<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AdminAudit;
use Illuminate\Support\Facades\Cache;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use RuntimeException;

class AdminAuthController extends Controller
{
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

        Auth::guard('web')->login($user);
        $this->regenerateSessionIfAvailable($request);
        $token = $this->issueAdminToken($user);

        AdminAudit::log($request, 'admin-login', 'Admin signed in successfully.', $user->id);

        return response()->json([
            'token' => $token,
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
        $user->tokens()->where('name', 'admin')->delete();
        $token = $this->issueAdminToken($user);

        return response()->json([
            'token' => $token,
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
            AdminAudit::log($request, 'admin-logout', 'Admin signed out.', $user->id);
        }

        Auth::guard('web')->logout();
        $this->invalidateSessionIfAvailable($request);

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
        $this->regenerateSessionIfAvailable($request);
        $token = $this->issueAdminToken($user);

        AdminAudit::log($request, 'admin-change-password', 'Admin password changed.', $user->id);

        return response()->json([
            'message' => 'Password changed successfully.',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_admin' => (bool) $user->is_admin,
            ],
        ]);
    }

    protected function throttleKey(Request $request): string
    {
        return Str::lower((string) $request->input('email')).'|'.$request->ip();
    }

    private function issueAdminToken(User $user): string
    {
        return $user->createToken('admin')->plainTextToken;
    }

    private function regenerateSessionIfAvailable(Request $request): void
    {
        try {
            if (method_exists($request, 'hasSession') && $request->hasSession()) {
                $request->session()->regenerate();
            }
        } catch (RuntimeException) {
            // Ignore requests that do not carry a session store.
        }
    }

    private function invalidateSessionIfAvailable(Request $request): void
    {
        try {
            if (method_exists($request, 'hasSession') && $request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }
        } catch (RuntimeException) {
            // Ignore requests that do not carry a session store.
        }
    }
}
