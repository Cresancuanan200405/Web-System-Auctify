<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SellerRegistration extends Model
{
    protected $fillable = [
        'user_id',
        'shop_name',
        'contact_email',
        'contact_phone',
        'pickup_address_summary',
        'submit_business_mode',
        'seller_type',
        'company_registered_name',
        'registered_last_name',
        'registered_first_name',
        'registered_middle_name',
        'registered_suffix',
        'general_location',
        'registered_address',
        'zip_code',
        'primary_document_type',
        'primary_document_name',
        'government_id_type',
        'government_id_front_name',
        'business_email',
        'business_email_otp',
        'business_phone_number',
        'business_phone_otp',
        'tax_tin',
        'vat_status',
        'bir_certificate_name',
        'submit_sworn_declaration',
        'agree_business_terms',
        'status',
        'submitted_at',
    ];

    protected $casts = [
        'agree_business_terms' => 'boolean',
        'submitted_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
