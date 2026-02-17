<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
        'house_no',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
