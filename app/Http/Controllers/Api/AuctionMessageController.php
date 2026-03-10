<?php

namespace App\Http\Controllers\Api;

use App\Events\AuctionMessageCreated;
use App\Events\AuctionMessageDeleted;
use App\Events\AuctionMessageUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auction\StoreAuctionMessageRequest;
use App\Models\Auction;
use App\Models\AuctionMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AuctionMessageController extends Controller
{
    private function safeBroadcast(object $event): void
    {
        try {
            broadcast($event);
        } catch (\Throwable $exception) {
            Log::warning('Auction realtime broadcast failed.', [
                'event' => $event::class,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    public function index(Request $request, Auction $auction)
    {
        $viewer = $request->user();
        $lastReadAt = $viewer
            ? optional(
                $auction->messageReads()
                    ->where('user_id', $viewer->id)
                    ->first()
            )->last_read_at
            : null;

        $messages = $auction->messages()
            ->with(['user.sellerRegistration'])
            ->oldest()
            ->get()
            ->map(function (AuctionMessage $message) use ($viewer, $lastReadAt) {
                return [
                    ...$message->toArray(),
                    'is_unread' => (bool) (
                        $viewer
                        && (int) $message->user_id !== (int) $viewer->id
                        && (! $lastReadAt || $message->created_at?->gt($lastReadAt))
                    ),
                ];
            })
            ->values();

        return response()->json([
            'messages' => $messages,
            'unread_count' => $messages->where('is_unread', true)->count(),
        ]);
    }

    public function store(StoreAuctionMessageRequest $request, Auction $auction)
    {
        $computedStatus = $auction->getComputedStatus();

        if ($computedStatus === 'scheduled') {
            return response()->json([
                'message' => 'Comments will open once this auction starts.',
            ], 422);
        }

        if ($computedStatus === 'closed') {
            return response()->json([
                'message' => 'Comments are no longer available because this auction is already closed.',
            ], 422);
        }

        $message = $auction->messages()->create([
            'user_id' => $request->user()->id,
            'message' => $request->validated()['message'],
        ]);

        $message->load(['user.sellerRegistration']);

        $auction->messageReads()->updateOrCreate(
            ['user_id' => $request->user()->id],
            ['last_read_at' => now()]
        );

        $this->safeBroadcast(new AuctionMessageCreated($message));

        return response()->json([
            ...$message->toArray(),
            'is_unread' => false,
        ], 201);
    }

    public function update(StoreAuctionMessageRequest $request, Auction $auction, AuctionMessage $message)
    {
        if ((int) $message->auction_id !== (int) $auction->id) {
            abort(404);
        }

        if ((int) $message->user_id !== (int) $request->user()->id) {
            return response()->json([
                'message' => 'You can only edit your own messages.',
            ], 403);
        }

        $message->update([
            'message' => $request->validated()['message'],
        ]);

        $message->load(['user.sellerRegistration']);

        $this->safeBroadcast(new AuctionMessageUpdated($message));

        return response()->json([
            ...$message->toArray(),
            'is_unread' => false,
        ]);
    }

    public function destroy(Request $request, Auction $auction, AuctionMessage $message)
    {
        if ((int) $message->auction_id !== (int) $auction->id) {
            abort(404);
        }

        if ((int) $message->user_id !== (int) $request->user()->id) {
            return response()->json([
                'message' => 'You can only delete your own messages.',
            ], 403);
        }

        $messageId = (int) $message->id;
        $message->delete();

        $this->safeBroadcast(new AuctionMessageDeleted((int) $auction->id, $messageId));

        return response()->json([
            'message' => 'Message deleted.',
            'message_id' => $messageId,
        ]);
    }

    public function markRead(Request $request, Auction $auction)
    {
        $auction->messageReads()->updateOrCreate(
            ['user_id' => $request->user()->id],
            ['last_read_at' => now()]
        );

        return response()->json([
            'message' => 'Messages marked as read.',
        ]);
    }
}