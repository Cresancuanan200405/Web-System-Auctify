<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('seller_registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade')->unique();
            $table->string('shop_name')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('contact_phone')->nullable();
            $table->text('pickup_address_summary')->nullable();
            $table->string('submit_business_mode')->default('now');
            $table->string('seller_type')->nullable();
            $table->string('company_registered_name')->nullable();
            $table->string('registered_last_name')->nullable();
            $table->string('registered_first_name')->nullable();
            $table->string('registered_middle_name')->nullable();
            $table->string('registered_suffix')->nullable();
            $table->string('general_location')->nullable();
            $table->text('registered_address')->nullable();
            $table->string('zip_code')->nullable();
            $table->string('primary_document_type')->nullable();
            $table->string('primary_document_name')->nullable();
            $table->string('government_id_type')->nullable();
            $table->string('government_id_front_name')->nullable();
            $table->string('business_email')->nullable();
            $table->string('business_email_otp')->nullable();
            $table->string('business_phone_number')->nullable();
            $table->string('business_phone_otp')->nullable();
            $table->string('tax_tin')->nullable();
            $table->string('vat_status')->nullable();
            $table->string('bir_certificate_name')->nullable();
            $table->string('submit_sworn_declaration')->nullable();
            $table->boolean('agree_business_terms')->default(false);
            $table->string('status')->default('submitted');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('seller_registrations');
    }
};
