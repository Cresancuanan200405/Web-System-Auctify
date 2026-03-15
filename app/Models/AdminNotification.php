<?php

namespace App\Models;

use App\Models\Auction;
use App\Models\Bid;
use App\Models\SellerRegistration;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class AdminNotification extends Model
{
    protected $fillable = [
        'type',
        'title',
        'message',
        'data',
        'read_at',
    ];

    protected $casts = [
        'data'    => 'array',
        'read_at' => 'datetime',
    ];

    public function isRead(): bool
    {
        return $this->read_at !== null;
    }

    public function markAsRead(): void
    {
        if ($this->read_at === null) {
            $this->update(['read_at' => now()]);
        }
    }

    public static function notify(string $type, string $title, string $message, array $data = []): self
    {
        return self::create([
            'type'    => $type,
            'title'   => $title,
            'message' => $message,
            'data'    => $data ?: null,
        ]);
    }

    public static function userSellerAnalyticsSnapshot(): array
    {
        $totalUsers = User::query()->count();
        $activeSellers = SellerRegistration::query()
            ->whereIn('status', ['submitted', 'approved'])
            ->count();
        $revokedSellers = SellerRegistration::query()
            ->where('status', 'revoked')
            ->count();
        $activeListings = Auction::query()
            ->where('starts_at', '<=', now())
            ->where('ends_at', '>', now())
            ->count();
        $totalBids = Bid::query()->count();
        $salesClosed = Auction::query()
            ->where('ends_at', '<=', now())
            ->whereHas('bids')
            ->sum(DB::raw('CAST(current_price AS DECIMAL(12,2))'));

        return [
            'users' => [
                'total' => $totalUsers,
            ],
            'sellers' => [
                'active' => $activeSellers,
                'revoked' => $revokedSellers,
            ],
            'marketplace' => [
                'active_listings' => $activeListings,
                'total_bids' => $totalBids,
                'closed_sales' => (float) $salesClosed,
            ],
        ];
    }
}
