<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $auction_id
 * @property int $bid_id
 * @property int $winner_user_id
 * @property int $seller_user_id
 * @property string $winning_amount
 * @property Carbon|null $won_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class BidWinner extends Model
{
    use HasFactory;

    protected $fillable = [
        'auction_id',
        'bid_id',
        'winner_user_id',
        'seller_user_id',
        'winning_amount',
        'won_at',
    ];

    protected function casts(): array
    {
        return [
            'winning_amount' => 'decimal:2',
            'won_at' => 'datetime',
        ];
    }

    public function auction(): BelongsTo
    {
        return $this->belongsTo(Auction::class);
    }

    public function bid(): BelongsTo
    {
        return $this->belongsTo(Bid::class);
    }

    public function winner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'winner_user_id');
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_user_id');
    }

    public function order(): HasOne
    {
        return $this->hasOne(Order::class);
    }
}
