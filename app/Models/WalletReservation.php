<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property int $auction_id
 * @property int|null $bid_id
 * @property string $amount
 * @property string $status
 * @property Carbon|null $reserved_at
 * @property Carbon|null $released_at
 * @property Carbon|null $consumed_at
 * @property string|null $release_reason
 * @property array<string,mixed>|null $meta
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class WalletReservation extends Model
{
    use HasFactory;

    public const STATUS_ACTIVE = 'active';
    public const STATUS_RELEASED = 'released';
    public const STATUS_CONSUMED = 'consumed';

    protected $fillable = [
        'user_id',
        'auction_id',
        'bid_id',
        'amount',
        'status',
        'reserved_at',
        'released_at',
        'consumed_at',
        'release_reason',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'reserved_at' => 'datetime',
            'released_at' => 'datetime',
            'consumed_at' => 'datetime',
            'meta' => 'array',
        ];
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function auction(): BelongsTo
    {
        return $this->belongsTo(Auction::class);
    }

    public function bid(): BelongsTo
    {
        return $this->belongsTo(Bid::class);
    }
}
