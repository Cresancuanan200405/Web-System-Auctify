<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Queue\SerializesModels;

class AuctionMessageDeleted implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public int $auctionId, public int $messageId)
    {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('auction.'.$this->auctionId)];
    }

    public function broadcastAs(): string
    {
        return 'auction.message.deleted';
    }

    public function broadcastWith(): array
    {
        return [
            'message_id' => $this->messageId,
        ];
    }
}