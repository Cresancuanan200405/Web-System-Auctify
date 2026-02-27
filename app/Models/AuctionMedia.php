<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuctionMedia extends Model
{
    use HasFactory;

    protected $fillable = [
        'auction_id',
        'file_path',
        'media_type',
    ];

    protected $appends = ['url'];

    public function auction(): BelongsTo
    {
        return $this->belongsTo(Auction::class);
    }

    public function getUrlAttribute(): string
    {
        return url('api/media/' . ltrim($this->file_path, '/'));
    }
}
