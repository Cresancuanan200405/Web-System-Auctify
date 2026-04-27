<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PromoCircle extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'subtitle_text',
        'color',
        'sort_order',
        'is_active',
        'updated_by_admin_user_id',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
            'updated_by_admin_user_id' => 'integer',
        ];
    }
}
