<?php

namespace App\Http\Controllers\Api\Admin;

use App\Events\HomepageContentUpdated;
use App\Http\Controllers\Controller;
use App\Models\CarouselSlide;
use App\Models\HomepageConfig;
use App\Models\PromoCircle;
use App\Models\VideoAd;
use App\Support\AdminAudit;
use App\Support\HomepageContentMapper;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class HomepageConfigController extends Controller
{
    public function show()
    {
        return response()->json([
            'config' => HomepageContentMapper::configPayload(),
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'circles' => ['required', 'array', 'min:1'],
            'circles.*.id' => ['required', 'string', 'max:120'],
            'circles.*.label' => ['required', 'string', 'max:120'],
            'circles.*.discount' => ['required', 'string', 'max:120'],
            'circles.*.tone' => ['required', 'string', 'in:yellow,black,green,blue,red,purple,teal,navy,silver'],
            'slides' => ['required', 'array', 'min:1'],
            'slides.*.id' => ['required', 'string', 'max:120'],
            'slides.*.subtitle' => ['required', 'string', 'max:160'],
            'slides.*.title' => ['required', 'string', 'max:160'],
            'slides.*.price' => ['required', 'string', 'max:120'],
            'slides.*.brands' => ['required', 'array'],
            'slides.*.brands.*' => ['required', 'string', 'max:120'],
            'slides.*.disclaimer' => ['required', 'string', 'max:500'],
            'slides.*.image' => ['nullable', 'string', 'max:500'],
            'miniSlides' => ['required', 'array', 'min:1'],
            'miniSlides.*.id' => ['required', 'string', 'max:120'],
            'miniSlides.*.subtitle' => ['required', 'string', 'max:160'],
            'miniSlides.*.title' => ['required', 'string', 'max:160'],
            'miniSlides.*.price' => ['required', 'string', 'max:120'],
            'miniSlides.*.brands' => ['required', 'array'],
            'miniSlides.*.brands.*' => ['required', 'string', 'max:120'],
            'miniSlides.*.disclaimer' => ['nullable', 'string', 'max:500'],
            'miniSlides.*.image' => ['nullable', 'string', 'max:500'],
            'videoAds' => ['required', 'array', 'min:1'],
            'videoAds.*.id' => ['required', 'string', 'max:120'],
            'videoAds.*.image' => ['nullable', 'string', 'max:500'],
            'videoAds.*.videoUrl' => ['nullable', 'string', 'max:500'],
            'videoAds.*.imageUrl' => ['nullable', 'string', 'max:500'],
        ]);

        DB::transaction(function () use ($validated) {
            PromoCircle::query()->delete();
            foreach ($validated['circles'] as $index => $circle) {
                PromoCircle::query()->create([
                    'title' => $circle['label'],
                    'subtitle_text' => $circle['discount'],
                    'color' => $circle['tone'],
                    'sort_order' => $index,
                    'is_active' => true,
                ]);
            }

            CarouselSlide::query()->delete();
            foreach ($validated['slides'] as $index => $slide) {
                CarouselSlide::query()->create([
                    'small_header_text' => $slide['subtitle'],
                    'main_title' => $slide['title'],
                    'discount_text' => $slide['price'],
                    'brand_tags' => $slide['brands'] ?? [],
                    'image_path' => $this->nullableTrimmed($slide['image'] ?? null),
                    'description_text' => $this->nullableTrimmed($slide['disclaimer'] ?? null),
                    'sort_order' => $index,
                    'is_active' => true,
                ]);
            }

            VideoAd::query()->delete();
            foreach ($validated['videoAds'] as $index => $video) {
                VideoAd::query()->create([
                    'video_url' => $this->nullableTrimmed($video['videoUrl'] ?? null),
                    'image_url' => $this->nullableTrimmed($video['imageUrl'] ?? $video['image'] ?? null),
                    'sort_order' => $index,
                    'is_active' => true,
                ]);
            }

            $legacyConfig = HomepageConfig::query()->first();
            $legacyPayload = [
                'circles' => $validated['circles'],
                'slides' => $validated['slides'],
                'mini_slides' => $validated['miniSlides'],
                'video_ads' => $validated['videoAds'],
            ];

            if ($legacyConfig) {
                $legacyConfig->update($legacyPayload);
            } else {
                HomepageConfig::query()->create($legacyPayload);
            }
        });

        $config = HomepageContentMapper::configPayload();

        try {
            event(new HomepageContentUpdated(Carbon::now()->toIso8601String()));
        } catch (Throwable $exception) {
            Log::warning('Homepage content update broadcast failed.', [
                'message' => $exception->getMessage(),
            ]);
        }

        AdminAudit::log($request, 'admin-update-homepage', 'Admin updated homepage content.', null, [
            'circle_count' => count($validated['circles']),
            'slide_count' => count($validated['slides']),
            'mini_slide_count' => count($validated['miniSlides']),
            'video_count' => count($validated['videoAds']),
        ]);

        return response()->json([
            'message' => 'Homepage config saved successfully.',
            'config' => $config,
        ]);
    }

    private function nullableTrimmed(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim($value);
        return $trimmed === '' ? null : $trimmed;
    }
}
