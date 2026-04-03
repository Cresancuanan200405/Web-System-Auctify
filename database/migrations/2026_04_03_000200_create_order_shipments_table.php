<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_shipments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('shipped_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('shipping_method', 30)->default('standard');
            $table->string('carrier', 80)->nullable();
            $table->string('service_level', 80)->nullable();
            $table->string('tracking_number', 120)->nullable();
            $table->string('status', 30)->default('pending');
            $table->timestamp('shipped_at')->nullable();
            $table->timestamp('estimated_delivery_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->text('notes')->nullable();
            $table->json('shipping_snapshot')->nullable();
            $table->string('shipping_label_path', 255)->nullable();
            $table->string('proof_of_delivery_path', 255)->nullable();
            $table->timestamps();

            $table->index(['order_id', 'status', 'created_at']);
            $table->index(['tracking_number']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_shipments');
    }
};
