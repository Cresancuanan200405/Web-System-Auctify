<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('admin_mfa_enabled')->default(false)->after('is_admin');
            $table->text('admin_mfa_secret')->nullable()->after('admin_mfa_enabled');
            $table->json('admin_mfa_recovery_codes')->nullable()->after('admin_mfa_secret');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'admin_mfa_enabled',
                'admin_mfa_secret',
                'admin_mfa_recovery_codes',
            ]);
        });
    }
};
