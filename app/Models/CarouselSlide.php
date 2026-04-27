<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CarouselSlide extends Model
{
    use HasFactory;

    protected $fillable = [
        'small_header_text',
        'main_title',
        'discount_text',
        'brand_tags',
        'image_path',
        'description_text',
        'sort_order',
        'is_active',
        'updated_by_admin_user_id',
    ];

    protected function casts(): array
    {
        return [
            'brand_tags' => 'array',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
            'updated_by_admin_user_id' => 'integer',
        ];
    }
}
