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
        Schema::table('addresses', function (Blueprint $table) {
            $table->string('building_name')->nullable()->after('street');
            $table->string('unit_floor')->nullable()->after('building_name');
            $table->string('postal_code')->nullable()->after('unit_floor');
            $table->text('notes')->nullable()->after('postal_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('addresses', function (Blueprint $table) {
            $table->dropColumn(['building_name', 'unit_floor', 'postal_code', 'notes']);
        });
    }
};
