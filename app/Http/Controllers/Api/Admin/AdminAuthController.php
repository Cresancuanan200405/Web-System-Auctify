<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AdminAudit;
use Illuminate\Support\Facades\Cache;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
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

        if ($user->admin_deactivated_at) {
            return response()->json([
                'message' => 'Admin account is inactive.',
                'account_status' => 'admin_inactive',
            ], 403);
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
                'requires_password_reset' => (bool) $user->admin_password_reset_required_at,
                'admin_deactivated_at' => optional($user->admin_deactivated_at)?->toIso8601String(),
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
                'requires_password_reset' => (bool) $user->admin_password_reset_required_at,
                'admin_deactivated_at' => optional($user->admin_deactivated_at)?->toIso8601String(),
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
        $user->forceFill([
            'admin_password_reset_required_at' => null,
        ])->save();

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
                'requires_password_reset' => false,
                'admin_deactivated_at' => optional($user->admin_deactivated_at)?->toIso8601String(),
            ],
        ]);
    }

    public function accounts(Request $request)
    {
        $currentAdminId = (int) $request->user()->id;

        $admins = User::query()
            ->where('is_admin', true)
            ->orderByDesc('last_login_at')
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'email',
                'last_login_at',
                'admin_password_reset_required_at',
                'admin_deactivated_at',
                'admin_deactivation_reason',
                'created_at',
                'updated_at',
            ]);

        $adminIds = $admins->pluck('id')->all();

        $activityByTarget = collect();

        if (count($adminIds) > 0) {
            $activityRows = DB::table('admin_user_actions as action_log')
                ->leftJoin('users as actor', 'actor.id', '=', 'action_log.admin_user_id')
                ->whereIn('action_log.target_user_id', $adminIds)
                ->whereIn('action_log.action', [
                    'admin-force-logout',
                    'admin-require-password-reset',
                    'admin-deactivate-account',
                    'admin-reactivate-account',
                ])
                ->orderByDesc('action_log.created_at')
                ->get([
                    'action_log.target_user_id',
                    'action_log.action',
                    'action_log.reason',
                    'action_log.created_at',
                    'actor.name as actor_name',
                    'actor.email as actor_email',
                ]);

            $activityByTarget = $activityRows
                ->groupBy('target_user_id')
                ->map(static fn ($items) => collect($items)
                    ->take(6)
                    ->map(static fn ($item) => [
                        'action' => (string) $item->action,
                        'reason' => (string) $item->reason,
                        'triggeredByName' => $item->actor_name,
                        'triggeredByEmail' => $item->actor_email,
                        'createdAt' => $item->created_at
                            ? \Illuminate\Support\Carbon::parse((string) $item->created_at)->toIso8601String()
                            : null,
                    ])
                    ->values()
                    ->all());
        }

        $accounts = $admins
            ->map(fn (User $admin) => [
                'id' => $admin->id,
                'name' => $admin->name,
                'email' => $admin->email,
                'isCurrent' => $admin->id === $currentAdminId,
                'requiresPasswordReset' => (bool) $admin->admin_password_reset_required_at,
                'isInactive' => (bool) $admin->admin_deactivated_at,
                'inactiveAt' => optional($admin->admin_deactivated_at)?->toIso8601String(),
                'inactiveReason' => $admin->admin_deactivation_reason,
                'lastSeenAt' => optional($admin->last_login_at ?? $admin->updated_at)?->toIso8601String(),
                'createdAt' => optional($admin->created_at)?->toIso8601String(),
                'recentActivity' => $activityByTarget->get($admin->id, []),
            ])
            ->values();

        return response()->json([
            'accounts' => $accounts,
        ]);
    }

    public function forceLogoutAccount(Request $request, User $user)
    {
        if (! $user->is_admin) {
            return response()->json([
                'message' => 'Target account is not an admin identity.',
            ], 422);
        }

        $user->tokens()->where('name', 'admin')->delete();

        Cache::forget('admin-mfa-step-up:'.$user->id);

        AdminAudit::log(
            $request,
            'admin-force-logout',
            'Forced admin logout.',
            $user->id,
            ['target_admin_id' => $user->id],
        );

        return response()->json([
            'message' => 'Admin sessions were revoked successfully.',
        ]);
    }

    public function requirePasswordReset(Request $request, User $user)
    {
        if (! $user->is_admin) {
            return response()->json([
                'message' => 'Target account is not an admin identity.',
            ], 422);
        }

        $user->forceFill([
            'admin_password_reset_required_at' => now(),
        ])->save();

        $user->tokens()->where('name', 'admin')->delete();

        Cache::forget('admin-mfa-step-up:'.$user->id);

        AdminAudit::log(
            $request,
            'admin-require-password-reset',
            'Required password reset for admin account.',
            $user->id,
            ['target_admin_id' => $user->id],
        );

        return response()->json([
            'message' => 'Admin password reset requirement has been set.',
        ]);
    }

    public function deactivateAccount(Request $request, User $user)
    {
        if (! $user->is_admin) {
            return response()->json([
                'message' => 'Target account is not an admin identity.',
            ], 422);
        }

        if ((int) $request->user()->id === (int) $user->id) {
            return response()->json([
                'message' => 'You cannot deactivate your own admin account.',
            ], 422);
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
        ]);

        $user->forceFill([
            'admin_deactivated_at' => now(),
            'admin_deactivation_reason' => $validated['reason'],
        ])->save();

        $user->tokens()->where('name', 'admin')->delete();
        Cache::forget('admin-mfa-step-up:'.$user->id);

        AdminAudit::log(
            $request,
            'admin-deactivate-account',
            'Deactivated admin account.',
            $user->id,
            [
                'target_admin_id' => $user->id,
                'reason' => $validated['reason'],
            ],
        );

        return response()->json([
            'message' => 'Admin account marked as inactive.',
        ]);
    }

    public function reactivateAccount(Request $request, User $user)
    {
        if (! $user->is_admin) {
            return response()->json([
                'message' => 'Target account is not an admin identity.',
            ], 422);
        }

        $user->forceFill([
            'admin_deactivated_at' => null,
            'admin_deactivation_reason' => null,
        ])->save();

        AdminAudit::log(
            $request,
            'admin-reactivate-account',
            'Reactivated admin account.',
            $user->id,
            ['target_admin_id' => $user->id],
        );

        return response()->json([
            'message' => 'Admin account reactivated successfully.',
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
