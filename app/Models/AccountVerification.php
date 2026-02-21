<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property string $status
 * @property string|null $full_name
 * @property Carbon|null $date_of_birth
 * @property string|null $phone
 * @property string|null $address
 * @property Carbon|null $privacy_agreed_at
 * @property string|null $phone_otp_code
 * @property Carbon|null $phone_otp_expires_at
 * @property Carbon|null $phone_verified_at
 * @property string|null $government_id_path
 * @property string|null $selfie_path
 * @property string|null $utility_bill_path
 * @property string|null $bank_statement_path
 * @property bool $terms_agreed
 * @property Carbon|null $submitted_at
 * @property Carbon|null $reviewed_at
 * @property string|null $notes
 */
class AccountVerification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'status',
        'full_name',
        'date_of_birth',
        'phone',
        'address',
        'privacy_agreed_at',
        'phone_otp_code',
        'phone_otp_expires_at',
        'phone_verified_at',
        'government_id_path',
        'selfie_path',
        'utility_bill_path',
        'bank_statement_path',
        'terms_agreed',
        'submitted_at',
        'reviewed_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'privacy_agreed_at' => 'datetime',
            'phone_otp_expires_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'terms_agreed' => 'boolean',
            'submitted_at' => 'datetime',
            'reviewed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
