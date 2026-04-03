<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminOnly
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->is_admin) {
            return response()->json([
                'message' => 'Admin access is required.',
            ], 403);
        }

        if ($user->admin_deactivated_at) {
            return response()->json([
                'message' => 'Admin account is inactive.',
                'account_status' => 'admin_inactive',
            ], 403);
        }

        $path = (string) $request->path();
        $isAccountStateExemptPath = in_array($path, [
            'api/admin/change-password',
            'api/admin/logout',
            'api/admin/session',
        ], true);

        if ($user->admin_password_reset_required_at && ! $isAccountStateExemptPath) {
            return response()->json([
                'message' => 'Password reset is required before continuing.',
                'account_status' => 'admin_password_reset_required',
            ], 403);
        }

        return $next($request);
    }
}
