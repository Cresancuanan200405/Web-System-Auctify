<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallet_reservations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('auction_id')->constrained()->cascadeOnDelete()->unique();
            $table->foreignId('bid_id')->nullable()->constrained('bids')->nullOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('status', 20)->default('active');
            $table->timestamp('reserved_at')->nullable();
            $table->timestamp('released_at')->nullable();
            $table->timestamp('consumed_at')->nullable();
            $table->string('release_reason', 255)->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['auction_id', 'status']);
            $table->index('reserved_at');
            $table->index('released_at');
            $table->index('consumed_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_reservations');
    }
};
