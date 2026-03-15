<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('admin_settings')
            ->whereIn('key', [
                'site_name',
                'site_tagline',
                'bid_increment_min',
                'auction_extension_mins',
            ])
            ->delete();

        $upserts = [
            [
                'key' => 'maintenance_message',
                'value' => 'Auctify is currently under maintenance. Please check back soon.',
                'type' => 'string',
                'label' => 'Maintenance Message',
                'description' => 'Message shown to users when maintenance mode is active.',
                'group' => 'general',
            ],
            [
                'key' => 'trust_and_safety_notice',
                'value' => 'Report suspicious listings via support to keep the marketplace safe.',
                'type' => 'string',
                'label' => 'Trust & Safety Notice',
                'description' => 'General trust/safety guidance for platform operations.',
                'group' => 'general',
            ],
            [
                'key' => 'max_listing_media_files',
                'value' => '10',
                'type' => 'integer',
                'label' => 'Max Listing Media Files',
                'description' => 'Maximum image/video files allowed per seller listing.',
                'group' => 'limits',
            ],
            [
                'key' => 'direct_message_max_attachments',
                'value' => '5',
                'type' => 'integer',
                'label' => 'Max Chat Attachments',
                'description' => 'Maximum files allowed in a single direct message.',
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
                'maintenance_message',
                'trust_and_safety_notice',
                'max_listing_media_files',
                'direct_message_max_attachments',
            ])
            ->delete();

        $legacy = [
            [
                'key' => 'site_name',
                'value' => 'Auctify',
                'type' => 'string',
                'label' => 'Site Name',
                'description' => 'The public name of the platform.',
                'group' => 'general',
            ],
            [
                'key' => 'site_tagline',
                'value' => 'Bid Smart. Win Big.',
                'type' => 'string',
                'label' => 'Site Tagline',
                'description' => 'Short tagline shown on the homepage.',
                'group' => 'general',
            ],
            [
                'key' => 'bid_increment_min',
                'value' => '1',
                'type' => 'integer',
                'label' => 'Minimum Bid Increment (₱)',
                'description' => 'Minimum amount a bid must exceed the current price.',
                'group' => 'auction',
            ],
            [
                'key' => 'auction_extension_mins',
                'value' => '5',
                'type' => 'integer',
                'label' => 'Auction Extension (mins)',
                'description' => 'Minutes added when a bid is placed in the last N minutes.',
                'group' => 'auction',
            ],
        ];

        foreach ($legacy as $setting) {
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
};
