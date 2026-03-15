<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class HomepageContentUpdated implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(
        public string $updatedAt,
    ) {
    }

    public function broadcastOn(): array
    {
        return [new Channel('homepage-content')];
    }

    public function broadcastAs(): string
    {
        return 'homepage.content.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'updated_at' => $this->updatedAt,
        ];
    }
}
