<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class AdminSetting extends Model
{
    protected $fillable = [
        'key',
        'value',
        'type',
        'label',
        'description',
        'group',
        'updated_by_admin_user_id',
    ];

    /**
     * Canonical admin settings catalog used to self-heal after DB truncation.
     *
     * @var array<int, array<string, string>>
     */
    private const DEFAULT_CATALOG = [
        ['key' => 'maintenance_message', 'value' => 'Auctify is currently under maintenance. Please check back soon.', 'type' => 'string', 'label' => 'Maintenance Message', 'description' => 'Message shown to users when maintenance mode is active.', 'group' => 'general'],
        ['key' => 'trust_and_safety_notice', 'value' => 'Report suspicious listings via support to keep the marketplace safe.', 'type' => 'string', 'label' => 'Trust & Safety Notice', 'description' => 'General notice shown in admin reference and future surfaces.', 'group' => 'general'],
        ['key' => 'contact_email', 'value' => 'support@auctify.com', 'type' => 'string', 'label' => 'Support Email', 'description' => 'Public contact email address.', 'group' => 'contact'],
        ['key' => 'contact_phone', 'value' => '', 'type' => 'string', 'label' => 'Contact Phone', 'description' => 'Public contact phone number.', 'group' => 'contact'],
        ['key' => 'maintenance_mode', 'value' => 'false', 'type' => 'boolean', 'label' => 'Maintenance Mode', 'description' => 'Show maintenance page to all non-admin users.', 'group' => 'general'],
        ['key' => 'allow_registrations', 'value' => 'true', 'type' => 'boolean', 'label' => 'Allow New Registrations', 'description' => 'Allow new users to register an account.', 'group' => 'general'],
        ['key' => 'max_listing_media_files', 'value' => '10', 'type' => 'integer', 'label' => 'Max Listing Media Files', 'description' => 'Maximum image/video files allowed per seller listing.', 'group' => 'limits'],
        ['key' => 'direct_message_max_attachments', 'value' => '5', 'type' => 'integer', 'label' => 'Max Chat Attachments', 'description' => 'Maximum files allowed in a single direct message.', 'group' => 'limits'],
        ['key' => 'enable_video_ads', 'value' => 'true', 'type' => 'boolean', 'label' => 'Enable Video Ads', 'description' => 'Show video ad blocks on the homepage.', 'group' => 'features'],
        ['key' => 'enable_carousel', 'value' => 'true', 'type' => 'boolean', 'label' => 'Enable Hero Carousel', 'description' => 'Show the hero carousel on the homepage.', 'group' => 'features'],
        ['key' => 'enable_promo_circles', 'value' => 'true', 'type' => 'boolean', 'label' => 'Enable Promo Circles', 'description' => 'Show the promo circle row on the homepage.', 'group' => 'features'],
        ['key' => 'enable_live_chat', 'value' => 'true', 'type' => 'boolean', 'label' => 'Enable Live Chat', 'description' => 'Allow auction message chat on listing pages.', 'group' => 'features'],
        ['key' => 'enable_seller_store', 'value' => 'true', 'type' => 'boolean', 'label' => 'Enable Seller Stores', 'description' => 'Allow users to open seller storefront pages.', 'group' => 'features'],
        ['key' => 'enable_home_search_suggestions', 'value' => 'true', 'type' => 'boolean', 'label' => 'Enable Home Search Suggestions', 'description' => 'Show live product/seller/shop suggestions in header search.', 'group' => 'features'],
        ['key' => 'max_home_search_results', 'value' => '8', 'type' => 'integer', 'label' => 'Max Home Search Results', 'description' => 'Maximum number of live search results in the user header.', 'group' => 'limits'],
        ['key' => 'max_admin_search_results', 'value' => '8', 'type' => 'integer', 'label' => 'Max Admin Search Results', 'description' => 'Maximum number of quick results in admin global search.', 'group' => 'limits'],
        ['key' => 'require_verified_for_bidding', 'value' => 'false', 'type' => 'boolean', 'label' => 'Require Verified Users For Bidding', 'description' => 'Only allow verified accounts to place bids.', 'group' => 'compliance'],
        ['key' => 'max_daily_bids_per_user', 'value' => '200', 'type' => 'integer', 'label' => 'Max Daily Bids Per User', 'description' => 'Soft operational cap used for anti-spam moderation.', 'group' => 'limits'],
    ];

    public static function ensureCatalog(): void
    {
        $now = now();

        foreach (self::DEFAULT_CATALOG as $setting) {
            DB::table('admin_settings')->updateOrInsert(
                ['key' => $setting['key']],
                [
                    'value' => $setting['value'],
                    'type' => $setting['type'],
                    'label' => $setting['label'],
                    'description' => $setting['description'],
                    'group' => $setting['group'],
                    'updated_at' => $now,
                    'created_at' => $now,
                ],
            );
        }
    }

    /**
     * Get a setting value by key, with an optional default.
     */
    public static function getValue(string $key, mixed $default = null): mixed
    {
        $setting = self::where('key', $key)->first();

        if (! $setting) {
            return $default;
        }

        return match ($setting->type) {
            'boolean' => in_array(strtolower((string) $setting->value), ['true', '1', 'yes'], true),
            'integer' => (int) $setting->value,
            default   => $setting->value,
        };
    }

    /**
     * Set a setting value by key.
     */
    public static function setValue(string $key, mixed $value): void
    {
        self::where('key', $key)->update(['value' => (string) $value]);
    }
}
