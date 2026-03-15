<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'is_admin',
        'admin_mfa_enabled',
        'admin_mfa_secret',
        'admin_mfa_recovery_codes',
        'is_suspended',
        'suspended_reason',
        'suspended_at',
        'suspended_until',
        'birthday',
        'google_id',
        'avatar',
        'is_verified',
        'verified_at',
        'verification_revoked_at',
        'last_login_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'admin_mfa_secret',
        'admin_mfa_recovery_codes',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
            'admin_mfa_enabled' => 'boolean',
            'admin_mfa_recovery_codes' => 'array',
            'is_suspended' => 'boolean',
            'suspended_at' => 'datetime',
            'suspended_until' => 'datetime',
            'birthday' => 'date',
            'is_verified' => 'boolean',
            'verified_at' => 'datetime',
            'verification_revoked_at' => 'datetime',
            'last_login_at' => 'datetime',
        ];
    }

    public function auctions(): HasMany
    {
        return $this->hasMany(Auction::class);
    }

    public function bids(): HasMany
    {
        return $this->hasMany(Bid::class);
    }

    public function auctionMessages(): HasMany
    {
        return $this->hasMany(AuctionMessage::class);
    }

    public function auctionMessageReads(): HasMany
    {
        return $this->hasMany(AuctionMessageRead::class);
    }

    public function sentDirectMessages(): HasMany
    {
        return $this->hasMany(DirectMessage::class, 'sender_id');
    }

    public function receivedDirectMessages(): HasMany
    {
        return $this->hasMany(DirectMessage::class, 'recipient_id');
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(Address::class);
    }

    public function accountVerifications(): HasMany
    {
        return $this->hasMany(AccountVerification::class);
    }

    public function sellerRegistration(): HasOne
    {
        return $this->hasOne(SellerRegistration::class);
    }
}
