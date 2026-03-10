<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DirectMessageAttachment extends Model
{
    use HasFactory;

    protected $fillable = [
        'direct_message_id',
        'file_path',
        'file_name',
        'mime_type',
        'file_size',
    ];

    public function directMessage(): BelongsTo
    {
        return $this->belongsTo(DirectMessage::class);
    }
}