<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Address extends Model
{
    protected $fillable = [
        'user_id',
        'first_name',
        'last_name',
        'phone',
        'region',
        'province',
        'city',
        'barangay',
        'street',
        'building_name',
        'unit_floor',
        'postal_code',
        'notes',
        'house_no',
    ];

    protected $appends = [
        'street_address',
    ];

    public function getStreetAddressAttribute(): string
    {
        return $this->street;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'shipping_address_id')->latest();
    }
}
