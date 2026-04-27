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
        Schema::table('admin_notifications', function (Blueprint $table) {
            $table->foreignId('admin_user_id')
                ->nullable()
                ->after('id')
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignId('target_user_id')
                ->nullable()
                ->after('admin_user_id')
                ->constrained('users')
                ->nullOnDelete();
        });

        Schema::table('admin_settings', function (Blueprint $table) {
            $table->foreignId('updated_by_admin_user_id')
                ->nullable()
                ->after('group')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('admin_notifications', function (Blueprint $table) {
            $table->dropConstrainedForeignId('target_user_id');
            $table->dropConstrainedForeignId('admin_user_id');
        });

        Schema::table('admin_settings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('updated_by_admin_user_id');
        });
    }
};
