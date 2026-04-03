<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('payer_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('payee_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('method', 40);
            $table->string('provider', 80)->nullable();
            $table->string('provider_reference', 120)->nullable();
            $table->string('status', 30)->default('pending');
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('PHP');
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->string('failure_reason', 255)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['order_id', 'status', 'created_at']);
            $table->index(['payer_user_id', 'created_at']);
            $table->index(['payee_user_id', 'created_at']);
            $table->index(['provider_reference']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_payments');
    }
};
