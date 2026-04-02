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
        Schema::create('bid_winners', function (Blueprint $table) {
            $table->id();
            $table->foreignId('auction_id')->constrained()->cascadeOnDelete()->unique();
            $table->foreignId('bid_id')->constrained('bids')->cascadeOnDelete()->unique();
            $table->foreignId('winner_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('seller_user_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('winning_amount', 12, 2);
            $table->timestamp('won_at');
            $table->timestamps();

            $table->index(['winner_user_id', 'won_at']);
            $table->index(['seller_user_id', 'won_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bid_winners');
    }
};
