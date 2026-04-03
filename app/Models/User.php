<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property string|null $phone
 * @property string|null $avatar
 * @property \Illuminate\Support\Carbon|null $birthday
 * @property bool $is_admin
 * @property bool $is_suspended
 * @property string|null $suspended_reason
 * @property \Illuminate\Support\Carbon|null $suspended_at
 * @property \Illuminate\Support\Carbon|null $suspended_until
 * @property bool $is_verified
 * @property float|string $wallet_balance
 * @property \Illuminate\Support\Carbon|null $verified_at
 * @property \Illuminate\Support\Carbon|null $verification_revoked_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
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
        'wallet_balance',
        'last_login_at',
        'admin_password_reset_required_at',
        'admin_deactivated_at',
        'admin_deactivation_reason',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
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
            'is_suspended' => 'boolean',
            'suspended_at' => 'datetime',
            'suspended_until' => 'datetime',
            'birthday' => 'date',
            'is_verified' => 'boolean',
            'wallet_balance' => 'decimal:2',
            'verified_at' => 'datetime',
            'verification_revoked_at' => 'datetime',
            'last_login_at' => 'datetime',
            'admin_password_reset_required_at' => 'datetime',
            'admin_deactivated_at' => 'datetime',
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

    public function walletTransactions(): HasMany
    {
        return $this->hasMany(\App\Models\WalletTransaction::class)->latest();
    }

    public function buyerOrders(): HasMany
    {
        return $this->hasMany(Order::class, 'buyer_user_id')->latest();
    }

    public function sellerOrders(): HasMany
    {
        return $this->hasMany(Order::class, 'seller_user_id')->latest();
    }

    public function paymentsMade(): HasMany
    {
        return $this->hasMany(OrderPayment::class, 'payer_user_id')->latest();
    }

    public function paymentsReceived(): HasMany
    {
        return $this->hasMany(OrderPayment::class, 'payee_user_id')->latest();
    }

    public function shipmentsFulfilled(): HasMany
    {
        return $this->hasMany(OrderShipment::class, 'shipped_by_user_id')->latest();
    }
}
