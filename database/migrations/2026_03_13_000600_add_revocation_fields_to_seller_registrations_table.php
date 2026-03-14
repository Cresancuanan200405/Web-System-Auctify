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
        Schema::table('seller_registrations', function (Blueprint $table) {
            $table->text('revoked_reason')->nullable()->after('status');
            $table->timestamp('revoked_at')->nullable()->after('revoked_reason');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('seller_registrations', function (Blueprint $table) {
            $table->dropColumn(['revoked_reason', 'revoked_at']);
        });
    }
};
