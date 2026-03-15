<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminSetting;
use App\Models\DirectMessageAttachment;
use App\Models\DirectMessage;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class DirectMessageController extends Controller
{
    public function threads(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($response = $this->ensureAccountCanUseDirectMessages($user)) {
            return $response;
        }

        $messages = DirectMessage::query()
            ->with(['attachments', 'sender.sellerRegistration', 'recipient.sellerRegistration'])
            ->where(function ($query) use ($user) {
                $query
                    ->where('sender_id', $user->id)
                    ->orWhere('recipient_id', $user->id);
            })
            ->latest('created_at')
            ->get();

        $threads = $messages
            ->groupBy(function (DirectMessage $message) use ($user) {
                return $message->sender_id === $user->id ? $message->recipient_id : $message->sender_id;
            })
            ->map(function (Collection $threadMessages) use ($user) {
                /** @var DirectMessage $latestMessage */
                $latestMessage = $threadMessages->first();
                $counterpart = $latestMessage->sender_id === $user->id
                    ? $latestMessage->recipient
                    : $latestMessage->sender;

                $unreadCount = $threadMessages
                    ->filter(fn (DirectMessage $message) => $message->recipient_id === $user->id && $message->read_at === null)
                    ->count();

                return [
                    'user' => $this->transformUser($counterpart),
                    'latest_message' => $this->buildThreadPreview($latestMessage),
                    'latest_message_at' => $latestMessage->created_at?->toISOString(),
                    'unread_count' => $unreadCount,
                ];
            })
            ->sortByDesc('latest_message_at')
            ->values();

        return response()->json([
            'threads' => $threads,
        ]);
    }

    public function index(Request $request, User $user): JsonResponse
    {
        if ($response = $this->ensureAccountCanUseDirectMessages($request->user())) {
            return $response;
        }

        if ($response = $this->ensureContactIsAvailable($user)) {
            return $response;
        }

        if ((int) $user->id === (int) $request->user()->id) {
            return response()->json([
                'message' => 'You cannot open a direct message thread with yourself.',
            ], 422);
        }

        $authUser = $request->user();

        $messages = DirectMessage::query()
            ->with(['attachments', 'sender.sellerRegistration', 'recipient.sellerRegistration'])
            ->where(function ($query) use ($authUser, $user) {
                $query
                    ->where('sender_id', $authUser->id)
                    ->where('recipient_id', $user->id);
            })
            ->orWhere(function ($query) use ($authUser, $user) {
                $query
                    ->where('sender_id', $user->id)
                    ->where('recipient_id', $authUser->id);
            })
            ->orderBy('created_at')
            ->get();

        DirectMessage::query()
            ->where('sender_id', $user->id)
            ->where('recipient_id', $authUser->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'user' => $this->transformUser($user),
            'messages' => $messages->map(fn (DirectMessage $message) => $this->transformMessage($message))->values(),
        ]);
    }

    public function store(Request $request, User $user): JsonResponse
    {
        if ($response = $this->ensureAccountCanUseDirectMessages($request->user())) {
            return $response;
        }

        if ($response = $this->ensureContactIsAvailable($user)) {
            return $response;
        }

        if ((int) $user->id === (int) $request->user()->id) {
            return response()->json([
                'message' => 'You cannot send a direct message to yourself.',
            ], 422);
        }

        $validated = $request->validate([
            'message' => ['nullable', 'string', 'max:2000'],
            'attachments' => ['nullable', 'array', 'max:' . max(1, (int) AdminSetting::getValue('direct_message_max_attachments', 5))],
            'attachments.*' => ['file', 'max:10240'],
        ]);

        $files = $request->file('attachments', []);
        $messageText = trim((string) ($validated['message'] ?? ''));

        if ($messageText === '' && count($files) === 0) {
            return response()->json([
                'message' => 'Add a message or at least one attachment before sending.',
            ], 422);
        }

        $message = DirectMessage::create([
            'sender_id' => $request->user()->id,
            'recipient_id' => $user->id,
            'message' => $messageText,
        ]);

        foreach ($files as $file) {
            $message->attachments()->create([
                'file_path' => $file->store('direct-messages', 'public'),
                'file_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getClientMimeType(),
                'file_size' => $file->getSize(),
            ]);
        }

        $message->load(['attachments', 'sender.sellerRegistration', 'recipient.sellerRegistration']);

        return response()->json($this->transformMessage($message), 201);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($response = $this->ensureAccountCanUseDirectMessages($request->user())) {
            return $response;
        }

        if ($response = $this->ensureContactIsAvailable($user)) {
            return $response;
        }

        $authUser = $request->user();

        $deleted = DirectMessage::query()
            ->with('attachments')
            ->where(function ($query) use ($authUser, $user) {
                $query
                    ->where('sender_id', $authUser->id)
                    ->where('recipient_id', $user->id);
            })
            ->orWhere(function ($query) use ($authUser, $user) {
                $query
                    ->where('sender_id', $user->id)
                    ->where('recipient_id', $authUser->id);
            })
            ->get();

        foreach ($deleted as $message) {
            /** @var DirectMessage $message */
            foreach ($message->attachments as $attachment) {
                Storage::disk('public')->delete($attachment->file_path);
            }
            $message->attachments()->delete();
            $message->delete();
        }

        return response()->json(['message' => 'Conversation deleted.']);
    }

    public function attachment(DirectMessageAttachment $attachment)
    {
        if (! Storage::disk('public')->exists($attachment->file_path)) {
            abort(404);
        }

        $absolutePath = Storage::disk('public')->path($attachment->file_path);

        return response()->file($absolutePath, [
            'Content-Disposition' => 'inline; filename="'.$attachment->file_name.'"',
        ]);
    }

    private function transformMessage(DirectMessage $message): array
    {
        return [
            'id' => $message->id,
            'sender_id' => $message->sender_id,
            'recipient_id' => $message->recipient_id,
            'message' => $message->message,
            'read_at' => $message->read_at?->toISOString(),
            'created_at' => $message->created_at?->toISOString(),
            'updated_at' => $message->updated_at?->toISOString(),
            'sender' => $this->transformUser($message->sender),
            'recipient' => $this->transformUser($message->recipient),
            'attachments' => $message->attachments->map(fn (DirectMessageAttachment $attachment) => [
                'id' => $attachment->id,
                'file_name' => $attachment->file_name,
                'mime_type' => $attachment->mime_type,
                'file_size' => $attachment->file_size,
                'url' => url("/api/direct-message-attachments/{$attachment->id}"),
            ])->values(),
        ];
    }

    private function buildThreadPreview(DirectMessage $message): string
    {
        $text = trim($message->message);
        if ($text !== '') {
            return $text;
        }

        $attachmentCount = $message->attachments->count();
        if ($attachmentCount === 1) {
            return 'Sent an attachment';
        }

        if ($attachmentCount > 1) {
            return "Sent {$attachmentCount} attachments";
        }

        return 'New message';
    }

    private function transformUser(?User $user): ?array
    {
        if (! $user) {
            return null;
        }

        $sellerRegistration = $user->sellerRegistration;
        $canExposeSellerShop = $sellerRegistration
            && in_array((string) $sellerRegistration->status, ['submitted', 'approved'], true)
            && ! $user->verification_revoked_at;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'seller_registration' => $canExposeSellerShop
                ? ['shop_name' => $sellerRegistration->shop_name]
                : null,
        ];
    }

    private function ensureAccountCanUseDirectMessages(?User $user): ?JsonResponse
    {
        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if ($deletedAccount = $this->findDeletedAccountRecord($user->email)) {
            $message = $deletedAccount['reason'] !== ''
                ? 'This account was deleted by admin. Reason: ' . $deletedAccount['reason']
                : 'This account was deleted by admin and can no longer use direct messages.';

            return response()->json([
                'message' => $message,
                'account_status' => 'deleted',
                'status_target' => 'account',
                'reason' => $deletedAccount['reason'] !== '' ? $deletedAccount['reason'] : null,
            ], 403);
        }

        if ($user->is_suspended && $user->suspended_until && now()->greaterThanOrEqualTo($user->suspended_until)) {
            $user->forceFill([
                'is_suspended' => false,
                'suspended_reason' => null,
                'suspended_at' => null,
                'suspended_until' => null,
            ])->save();
        }

        if ($user->is_suspended) {
            $message = $user->suspended_reason
                ? 'This account is suspended. Reason: ' . $user->suspended_reason
                : 'This account is suspended. Please contact support.';

            return response()->json([
                'message' => $message,
                'account_status' => 'suspended',
                'status_target' => 'account',
                'reason' => $user->suspended_reason,
                'suspended_until' => optional($user->suspended_until)?->toIso8601String(),
            ], 403);
        }

        return null;
    }

    private function ensureContactIsAvailable(User $user): ?JsonResponse
    {
        if ($deletedAccount = $this->findDeletedAccountRecord($user->email)) {
            $message = $deletedAccount['reason'] !== ''
                ? 'This account was deleted by admin. Reason: ' . $deletedAccount['reason']
                : 'This account was deleted by admin and can no longer receive direct messages.';

            return response()->json([
                'message' => $message,
                'account_status' => 'deleted',
                'status_target' => 'contact',
                'reason' => $deletedAccount['reason'] !== '' ? $deletedAccount['reason'] : null,
            ], 403);
        }

        if ($user->is_suspended) {
            $message = $user->suspended_reason
                ? 'This account is suspended. Reason: ' . $user->suspended_reason
                : 'This account is suspended and unavailable for direct messages.';

            return response()->json([
                'message' => $message,
                'account_status' => 'suspended',
                'status_target' => 'contact',
                'reason' => $user->suspended_reason,
                'suspended_until' => optional($user->suspended_until)?->toIso8601String(),
            ], 403);
        }

        return null;
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