<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('account_verifications', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('draft');
            $table->string('full_name')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('phone')->nullable();
            $table->text('address')->nullable();
            $table->timestamp('privacy_agreed_at')->nullable();
            $table->string('phone_otp_code')->nullable();
            $table->timestamp('phone_otp_expires_at')->nullable();
            $table->timestamp('phone_verified_at')->nullable();
            $table->string('government_id_path')->nullable();
            $table->string('selfie_path')->nullable();
            $table->string('utility_bill_path')->nullable();
            $table->string('bank_statement_path')->nullable();
            $table->boolean('terms_agreed')->default(false);
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_verifications');
    }
};
