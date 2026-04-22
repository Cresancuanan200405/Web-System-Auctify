<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        if ($user->is_suspended) {
            if ($user->suspended_until && now()->greaterThanOrEqualTo($user->suspended_until)) {
                $user->forceFill([
                    'is_suspended' => false,
                    'suspended_reason' => null,
                    'suspended_at' => null,
                    'suspended_until' => null,
                ])->save();
            } else {
                $message = $user->suspended_reason
                    ? 'This account is suspended. Reason: ' . $user->suspended_reason
                    : 'This account is suspended. Please contact support.';

                $user->tokens()->delete();

                return response()->json([
                    'message' => $message,
                    'account_status' => 'suspended',
                    'reason' => $user->suspended_reason,
                    'suspended_until' => optional($user->suspended_until)?->toIso8601String(),
                ], 403);
            }
        }

        return $next($request);
    }
}
