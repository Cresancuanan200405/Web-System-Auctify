<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\AdminNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class AdminNotificationController extends Controller
{
    public function unreadCount(): JsonResponse
    {
        return response()->json([
            'unreadCount' => AdminNotification::whereNull('read_at')->count(),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $notifications = AdminNotification::query()
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(fn (AdminNotification $n) => [
                'id'        => $n->id,
                'type'      => $n->type,
                'title'     => $n->title,
                'message'   => $n->message,
                'data'      => $n->data,
                'readAt'    => $n->read_at?->toIso8601String(),
                'createdAt' => $n->created_at->toIso8601String(),
            ]);

        $unreadCount = AdminNotification::whereNull('read_at')->count();

        return response()->json([
            'notifications' => $notifications,
            'unreadCount'   => $unreadCount,
        ]);
    }

    public function markRead(AdminNotification $notification): JsonResponse
    {
        $notification->markAsRead();

        return response()->json(['message' => 'Notification marked as read.']);
    }

    public function markAllRead(): JsonResponse
    {
        AdminNotification::whereNull('read_at')->update(['read_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }

    public function destroy(AdminNotification $notification): JsonResponse
    {
        $notification->delete();

        return response()->json(['message' => 'Notification deleted.']);
    }
}
