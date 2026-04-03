<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bid_winner_id')->constrained('bid_winners')->cascadeOnDelete()->unique();
            $table->foreignId('auction_id')->constrained()->cascadeOnDelete();
            $table->foreignId('buyer_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('seller_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('shipping_address_id')->nullable()->constrained('addresses')->nullOnDelete();
            $table->string('order_number', 60)->nullable()->unique();
            $table->decimal('subtotal_amount', 12, 2)->default(0);
            $table->decimal('shipping_fee', 12, 2)->default(0);
            $table->decimal('service_fee', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2);
            $table->string('currency', 3)->default('PHP');
            $table->string('status', 30)->default('pending_confirmation');
            $table->string('payment_status', 30)->default('pending');
            $table->string('shipping_status', 30)->default('pending');
            $table->timestamp('placed_at')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancellation_reason', 255)->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['buyer_user_id', 'status', 'created_at']);
            $table->index(['seller_user_id', 'status', 'created_at']);
            $table->index(['auction_id', 'created_at']);
            $table->index(['payment_status', 'shipping_status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
