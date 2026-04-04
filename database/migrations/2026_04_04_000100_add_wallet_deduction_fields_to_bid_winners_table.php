<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bid_winners', function (Blueprint $table) {
            $table->timestamp('wallet_deducted_at')->nullable()->after('won_at');
            $table->timestamp('wallet_deduction_failed_at')->nullable()->after('wallet_deducted_at');
            $table->string('wallet_deduction_failure_reason', 255)->nullable()->after('wallet_deduction_failed_at');

            $table->index('wallet_deducted_at');
            $table->index('wallet_deduction_failed_at');
        });
    }

    public function down(): void
    {
        Schema::table('bid_winners', function (Blueprint $table) {
            $table->dropIndex(['wallet_deducted_at']);
            $table->dropIndex(['wallet_deduction_failed_at']);
            $table->dropColumn([
                'wallet_deducted_at',
                'wallet_deduction_failed_at',
                'wallet_deduction_failure_reason',
            ]);
        });
    }
};
