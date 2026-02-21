<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->boolean('is_verified')->default(false)->after('avatar');
            $table->timestamp('verified_at')->nullable()->after('is_verified');
            $table->timestamp('verification_revoked_at')->nullable()->after('verified_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['is_verified', 'verified_at', 'verification_revoked_at']);
        });
    }
};
