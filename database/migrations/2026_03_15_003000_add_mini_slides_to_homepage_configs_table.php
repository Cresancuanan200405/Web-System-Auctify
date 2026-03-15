<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('homepage_configs', function (Blueprint $table) {
            if (! Schema::hasColumn('homepage_configs', 'mini_slides')) {
                $table->json('mini_slides')->nullable()->after('slides');
            }
        });
    }

    public function down(): void
    {
        Schema::table('homepage_configs', function (Blueprint $table) {
            if (Schema::hasColumn('homepage_configs', 'mini_slides')) {
                $table->dropColumn('mini_slides');
            }
        });
    }
};
