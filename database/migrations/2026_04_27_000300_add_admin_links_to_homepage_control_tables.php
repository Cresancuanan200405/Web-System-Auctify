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
        Schema::table('video_ads', function (Blueprint $table) {
            $table->foreignId('updated_by_admin_user_id')
                ->nullable()
                ->after('is_active')
                ->constrained('users')
                ->nullOnDelete();
        });

        Schema::table('carousel_slides', function (Blueprint $table) {
            $table->foreignId('updated_by_admin_user_id')
                ->nullable()
                ->after('is_active')
                ->constrained('users')
                ->nullOnDelete();
        });

        Schema::table('promo_circles', function (Blueprint $table) {
            $table->foreignId('updated_by_admin_user_id')
                ->nullable()
                ->after('is_active')
                ->constrained('users')
                ->nullOnDelete();
        });

        Schema::table('homepage_configs', function (Blueprint $table) {
            $table->foreignId('updated_by_admin_user_id')
                ->nullable()
                ->after('video_ads')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('video_ads', function (Blueprint $table) {
            $table->dropConstrainedForeignId('updated_by_admin_user_id');
        });

        Schema::table('carousel_slides', function (Blueprint $table) {
            $table->dropConstrainedForeignId('updated_by_admin_user_id');
        });

        Schema::table('promo_circles', function (Blueprint $table) {
            $table->dropConstrainedForeignId('updated_by_admin_user_id');
        });

        Schema::table('homepage_configs', function (Blueprint $table) {
            $table->dropConstrainedForeignId('updated_by_admin_user_id');
        });
    }
};
