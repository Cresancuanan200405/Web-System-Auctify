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
        'mini_slides',
        'video_ads',
        'updated_by_admin_user_id',
    ];

    protected function casts(): array
    {
        return [
            'circles' => 'array',
            'slides' => 'array',
            'mini_slides' => 'array',
            'video_ads' => 'array',
            'updated_by_admin_user_id' => 'integer',
        ];
    }
}
