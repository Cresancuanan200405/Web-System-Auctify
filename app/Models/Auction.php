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
        'description',
        'starting_price',
        'max_increment',
        'current_price',
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

    public function isOpen(): bool
    {
        $startsAt = $this->starts_at instanceof Carbon
            ? $this->starts_at
            : ($this->starts_at ? Carbon::parse($this->starts_at) : null);
        $endsAt = $this->ends_at instanceof Carbon ? $this->ends_at : Carbon::parse($this->ends_at);

        if ($this->status !== 'open') {
            return false;
        }

        if ($startsAt && $startsAt->isFuture()) {
            return false;
        }

        return $endsAt->isFuture();
    }
}
