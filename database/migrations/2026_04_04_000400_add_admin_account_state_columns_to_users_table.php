<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('admin_password_reset_required_at')->nullable()->after('last_login_at');
            $table->timestamp('admin_deactivated_at')->nullable()->after('admin_password_reset_required_at');
            $table->string('admin_deactivation_reason', 1000)->nullable()->after('admin_deactivated_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'admin_password_reset_required_at',
                'admin_deactivated_at',
                'admin_deactivation_reason',
            ]);
        });
    }
};
