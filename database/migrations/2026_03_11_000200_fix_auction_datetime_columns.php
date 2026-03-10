<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE auctions MODIFY starts_at DATETIME NULL');
        DB::statement('ALTER TABLE auctions MODIFY ends_at DATETIME NOT NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE auctions MODIFY starts_at TIMESTAMP NULL DEFAULT NULL');
        DB::statement('ALTER TABLE auctions MODIFY ends_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    }
};
