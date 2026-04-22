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
            if (Schema::hasColumn('video_ads', 'title')) {
                $table->dropColumn('title');
            }

            if (Schema::hasColumn('video_ads', 'description')) {
                $table->dropColumn('description');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('video_ads', function (Blueprint $table) {
            if (! Schema::hasColumn('video_ads', 'title')) {
                $table->string('title', 160)->default('Video ad');
            }

            if (! Schema::hasColumn('video_ads', 'description')) {
                $table->text('description')->nullable();
            }
        });
    }
};
