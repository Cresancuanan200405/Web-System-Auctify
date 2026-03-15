<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\AdminSetting;
use App\Support\AdminAudit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class AdminSettingController extends Controller
{
    private function mapSetting(AdminSetting $s): array
    {
        return [
            'key'         => $s->key,
            'value'       => $s->value ?? '',
            'type'        => $s->type,
            'label'       => $s->label,
            'description' => $s->description,
            'group'       => $s->group,
        ];
    }

    public function index(): JsonResponse
    {
        $settings = AdminSetting::orderBy('group')->orderBy('label')->get()
            ->map(fn (AdminSetting $s) => $this->mapSetting($s));

        return response()->json(['settings' => $settings]);
    }

    public function publicIndex(): JsonResponse
    {
        return response()->json([
            'settings' => [
                'allow_registrations' => (bool) AdminSetting::getValue('allow_registrations', true),
                'maintenance_mode' => (bool) AdminSetting::getValue('maintenance_mode', false),
                'maintenance_message' => (string) AdminSetting::getValue('maintenance_message', 'Auctify is currently under maintenance. Please check back soon.'),
                'enable_video_ads' => (bool) AdminSetting::getValue('enable_video_ads', true),
                'enable_carousel' => (bool) AdminSetting::getValue('enable_carousel', true),
                'enable_promo_circles' => (bool) AdminSetting::getValue('enable_promo_circles', true),
                'enable_live_chat' => (bool) AdminSetting::getValue('enable_live_chat', true),
                'enable_seller_store' => (bool) AdminSetting::getValue('enable_seller_store', true),
                'enable_home_search_suggestions' => (bool) AdminSetting::getValue('enable_home_search_suggestions', true),
                'max_listing_media_files' => max(1, (int) AdminSetting::getValue('max_listing_media_files', 10)),
                'direct_message_max_attachments' => max(1, (int) AdminSetting::getValue('direct_message_max_attachments', 5)),
                'max_home_search_results' => max(3, min(20, (int) AdminSetting::getValue('max_home_search_results', 8))),
                'max_admin_search_results' => max(3, min(20, (int) AdminSetting::getValue('max_admin_search_results', 8))),
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'settings'   => 'required|array',
            'settings.*' => 'nullable|string|max:2000',
        ]);

        foreach ($validated['settings'] as $key => $value) {
            AdminSetting::where('key', $key)->update([
                'value'      => $value,
                'updated_at' => now(),
            ]);
        }

        AdminAudit::log($request, 'admin-update-settings', 'Admin updated platform settings.', null, [
            'keys' => array_keys($validated['settings']),
        ]);

        $settings = AdminSetting::orderBy('group')->orderBy('label')->get()
            ->map(fn (AdminSetting $s) => $this->mapSetting($s));

        return response()->json([
            'message'  => 'Settings saved successfully.',
            'settings' => $settings,
        ]);
    }
}
