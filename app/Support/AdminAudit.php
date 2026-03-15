<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminAudit
{
    public static function log(Request $request, string $action, string $reason, ?int $targetUserId = null, array $details = []): void
    {
        $context = array_filter([
            'ip' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 1024),
            'route' => optional($request->route())->uri(),
        ]);

        DB::table('admin_user_actions')->insert([
            'admin_user_id' => $request->user()?->id,
            'target_user_id' => $targetUserId,
            'action' => $action,
            'reason' => $reason,
            'details' => json_encode(array_merge($details, $context), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}