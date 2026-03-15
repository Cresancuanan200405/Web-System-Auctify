<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class Auction extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'category',
        'subcategory',
        'description',
        'starting_price',
        'max_increment',
        'current_price',
        'page_views',
        'starts_at',
        'ends_at',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'starting_price' => 'decimal:2',
            'max_increment' => 'decimal:2',
            'current_price' => 'decimal:2',
            'page_views' => 'integer',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function bids(): HasMany
    {
        return $this->hasMany(Bid::class)->latest();
    }

    public function media(): HasMany
    {
        return $this->hasMany(AuctionMedia::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(AuctionMessage::class)->latest();
    }

    public function messageReads(): HasMany
    {
        return $this->hasMany(AuctionMessageRead::class);
    }

    public function getComputedStatus(?Carbon $referenceTime = null): string
    {
        $reference = $referenceTime ?? now();

        $startsAt = $this->starts_at instanceof Carbon
            ? $this->starts_at
            : ($this->starts_at ? Carbon::parse($this->starts_at) : null);

        $endsAt = $this->ends_at instanceof Carbon
            ? $this->ends_at
            : ($this->ends_at ? Carbon::parse($this->ends_at) : null);

        if ($endsAt && $endsAt->lte($reference)) {
            return 'closed';
        }

        if ($startsAt && $startsAt->gt($reference)) {
            return 'scheduled';
        }

        if ($this->status === 'closed' && ! $endsAt) {
            return 'closed';
        }

        return 'open';
    }

    public function isOpen(): bool
    {
        return $this->getComputedStatus() === 'open';
    }
}
