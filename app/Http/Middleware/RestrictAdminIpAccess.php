<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class RestrictAdminIpAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $allowlist = config('security.admin_ip_allowlist', []);

        if (! is_array($allowlist) || count($allowlist) === 0) {
            return $next($request);
        }

        $requestIp = (string) $request->ip();

        if (in_array($requestIp, $allowlist, true)) {
            return $next($request);
        }

        Log::channel('security')->warning('Blocked admin route access from non-allowlisted IP.', [
            'ip' => $requestIp,
            'path' => $request->path(),
        ]);

        return response()->json([
            'message' => 'Admin access is not allowed from this network.',
            'code' => 'admin_ip_not_allowed',
        ], 403);
    }
}
