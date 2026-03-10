<?php

namespace App\Events;

use App\Models\AuctionMessage;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Queue\SerializesModels;

class AuctionMessageUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public AuctionMessage $message)
    {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('auction.'.$this->message->auction_id)];
    }

    public function broadcastAs(): string
    {
        return 'auction.message.updated';
    }

    public function broadcastWith(): array
    {
        $message = $this->message->loadMissing(['user.sellerRegistration']);

        return [
            'message' => [
                ...$message->toArray(),
                'is_unread' => false,
            ],
        ];
    }
}