<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'bid_winner_id',
        'auction_id',
        'buyer_user_id',
        'seller_user_id',
        'shipping_address_id',
        'order_number',
        'subtotal_amount',
        'shipping_fee',
        'service_fee',
        'total_amount',
        'currency',
        'status',
        'payment_status',
        'shipping_status',
        'placed_at',
        'confirmed_at',
        'completed_at',
        'cancelled_at',
        'cancellation_reason',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'subtotal_amount' => 'decimal:2',
            'shipping_fee' => 'decimal:2',
            'service_fee' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'placed_at' => 'datetime',
            'confirmed_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'meta' => 'array',
        ];
    }

    public function bidWinner(): BelongsTo
    {
        return $this->belongsTo(BidWinner::class);
    }

    public function auction(): BelongsTo
    {
        return $this->belongsTo(Auction::class);
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_user_id');
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_user_id');
    }

    public function shippingAddress(): BelongsTo
    {
        return $this->belongsTo(Address::class, 'shipping_address_id');
    }

    public function shipments(): HasMany
    {
        return $this->hasMany(OrderShipment::class)->latest();
    }

    public function payments(): HasMany
    {
        return $this->hasMany(OrderPayment::class)->latest();
    }
}
