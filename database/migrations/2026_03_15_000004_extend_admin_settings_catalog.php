<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $upserts = [
            [
                'key' => 'enable_seller_store',
                'value' => 'true',
                'type' => 'boolean',
                'label' => 'Enable Seller Stores',
                'description' => 'Allow users to open seller storefront pages.',
                'group' => 'features',
            ],
            [
                'key' => 'enable_home_search_suggestions',
                'value' => 'true',
                'type' => 'boolean',
                'label' => 'Enable Home Search Suggestions',
                'description' => 'Show live product/seller/shop suggestions in header search.',
                'group' => 'features',
            ],
            [
                'key' => 'max_home_search_results',
                'value' => '8',
                'type' => 'integer',
                'label' => 'Max Home Search Results',
                'description' => 'Maximum number of live search results in the user header.',
                'group' => 'limits',
            ],
            [
                'key' => 'max_admin_search_results',
                'value' => '8',
                'type' => 'integer',
                'label' => 'Max Admin Search Results',
                'description' => 'Maximum number of quick results in admin global search.',
                'group' => 'limits',
            ],
            [
                'key' => 'require_verified_for_bidding',
                'value' => 'false',
                'type' => 'boolean',
                'label' => 'Require Verified Users For Bidding',
                'description' => 'Only allow verified accounts to place bids.',
                'group' => 'compliance',
            ],
            [
                'key' => 'max_daily_bids_per_user',
                'value' => '200',
                'type' => 'integer',
                'label' => 'Max Daily Bids Per User',
                'description' => 'Soft operational cap used for anti-spam moderation.',
                'group' => 'limits',
            ],
        ];

        foreach ($upserts as $setting) {
            DB::table('admin_settings')->updateOrInsert(
                ['key' => $setting['key']],
                [
                    'value' => $setting['value'],
                    'type' => $setting['type'],
                    'label' => $setting['label'],
                    'description' => $setting['description'],
                    'group' => $setting['group'],
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }

    public function down(): void
    {
        DB::table('admin_settings')
            ->whereIn('key', [
                'enable_seller_store',
                'enable_home_search_suggestions',
                'max_home_search_results',
                'max_admin_search_results',
                'require_verified_for_bidding',
                'max_daily_bids_per_user',
            ])
            ->delete();
    }
};
