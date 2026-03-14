<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HomepageConfig extends Model
{
    use HasFactory;

    protected $fillable = [
        'circles',
        'slides',
        'video_ads',
    ];

    protected function casts(): array
    {
        return [
            'circles' => 'array',
            'slides' => 'array',
            'video_ads' => 'array',
        ];
    }
}
