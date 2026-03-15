<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

class RequireRecentAdminMfa
{
    private const SESSION_KEY = 'admin_mfa_last_verified_at';
    private const CACHE_KEY_PREFIX = 'admin-mfa-step-up:';

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->is_admin) {
            return response()->json([
                'message' => 'Admin authentication required.',
            ], 403);
        }

        if (! $user->admin_mfa_enabled) {
            Log::channel('security')->warning('Blocked destructive admin action because MFA is disabled.', [
                'admin_user_id' => $user->id,
                'ip' => $request->ip(),
                'path' => $request->path(),
            ]);

            return response()->json([
                'message' => 'Enable admin MFA to perform this action.',
                'code' => 'admin_mfa_required',
            ], 403);
        }

        $verifiedAt = 0;

        try {
            if (method_exists($request, 'hasSession') && $request->hasSession()) {
                $verifiedAt = (int) $request->session()->get(self::SESSION_KEY, 0);
            }
        } catch (RuntimeException) {
            $verifiedAt = 0;
        }

        if ($verifiedAt <= 0) {
            $verifiedAt = (int) Cache::get(self::CACHE_KEY_PREFIX.$user->id, 0);
        }

        $stepUpTtl = (int) config('security.admin_mfa_step_up_ttl_seconds', 600);

        if ($verifiedAt <= 0 || (time() - $verifiedAt) > max(60, $stepUpTtl)) {
            Log::channel('security')->warning('Blocked destructive admin action because recent MFA step-up is missing or expired.', [
                'admin_user_id' => $user->id,
                'ip' => $request->ip(),
                'path' => $request->path(),
            ]);

            return response()->json([
                'message' => 'MFA step-up required. Verify your authenticator code and try again.',
                'code' => 'admin_mfa_step_up_required',
            ], 403);
        }

        return $next($request);
    }
}
