<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        $seedAdminEmail = (string) env('SEED_ADMIN_EMAIL', 'admin@auctify.com');
        $seedAdminPassword = env('SEED_ADMIN_PASSWORD');

        if (is_string($seedAdminPassword) && trim($seedAdminPassword) !== '') {
            User::query()->updateOrCreate(
                ['email' => $seedAdminEmail],
                [
                    'name' => 'Auctify Administrator',
                    'password' => $seedAdminPassword,
                    'is_admin' => true,
                    'email_verified_at' => now(),
                ]
            );
        } elseif (! app()->isProduction()) {
            $generatedPassword = Str::password(24);

            User::query()->updateOrCreate(
                ['email' => $seedAdminEmail],
                [
                    'name' => 'Auctify Administrator',
                    'password' => $generatedPassword,
                    'is_admin' => true,
                    'email_verified_at' => now(),
                ]
            );

            $this->command?->warn('Seeded local admin account with generated password.');
            $this->command?->line("Email: {$seedAdminEmail}");
            $this->command?->line("Password: {$generatedPassword}");
            $this->command?->warn('Set SEED_ADMIN_PASSWORD in your environment to control this value explicitly.');
        } else {
            $this->command?->warn('Skipping admin seeding because SEED_ADMIN_PASSWORD is not set.');
        }

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);
    }
}
