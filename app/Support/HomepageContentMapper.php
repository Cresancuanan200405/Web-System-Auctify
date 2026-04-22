<?php

namespace App\Support;

use App\Models\CarouselSlide;
use App\Models\HomepageConfig;
use App\Models\PromoCircle;
use App\Models\VideoAd;

class HomepageContentMapper
{
    private const CIRCLE_TONES = ['yellow', 'black', 'green', 'blue', 'red', 'purple', 'teal', 'navy', 'silver'];

    private static function normalizeMediaReference(?string $value): string
    {
        $trimmed = trim((string) $value);

        if ($trimmed === '') {
            return '';
        }

        if (str_starts_with($trimmed, '/api/homepage-media/') || str_starts_with($trimmed, '/api/media/')) {
            return $trimmed;
        }

        if (str_starts_with($trimmed, 'api/homepage-media/') || str_starts_with($trimmed, 'api/media/')) {
            return '/'.$trimmed;
        }

        if (preg_match('/^https?:\/\//i', $trimmed) === 1) {
            $path = (string) parse_url($trimmed, PHP_URL_PATH);
            $query = (string) parse_url($trimmed, PHP_URL_QUERY);

            if ($path !== '' && (
                str_starts_with($path, '/api/homepage-media/')
                || str_starts_with($path, '/api/media/')
            )) {
                return $query !== '' ? $path.'?'.$query : $path;
            }
        }

        return $trimmed;
    }

    private static function normalizeLegacySlides(array $slides): array
    {
        return array_map(function (array $slide): array {
            $slide['image'] = self::normalizeMediaReference($slide['image'] ?? '');

            return $slide;
        }, $slides);
    }

    private static function normalizeLegacyVideoAds(array $videoAds): array
    {
        return array_map(function (array $videoAd): array {
            $videoAd['image'] = self::normalizeMediaReference($videoAd['image'] ?? '');
            $videoAd['imageUrl'] = self::normalizeMediaReference($videoAd['imageUrl'] ?? '');
            $videoAd['videoUrl'] = self::normalizeMediaReference($videoAd['videoUrl'] ?? '');

            return $videoAd;
        }, $videoAds);
    }

    /**
     * Build the config payload used by the existing React homepage/admin UI.
     */
    public static function configPayload(): array
    {
        $circles = PromoCircle::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $slides = CarouselSlide::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $videoAds = VideoAd::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $legacy = HomepageConfig::query()->first();
        $miniSlides = is_array($legacy?->mini_slides) ? $legacy->mini_slides : [];

        if ($circles->isNotEmpty() || $slides->isNotEmpty() || $videoAds->isNotEmpty() || ! empty($miniSlides)) {
            return [
                'circles' => $circles->map(function (PromoCircle $circle): array {
                    $tone = in_array($circle->color, self::CIRCLE_TONES, true) ? $circle->color : 'black';

                    return [
                        'id' => (string) $circle->id,
                        'label' => $circle->title,
                        'discount' => $circle->subtitle_text,
                        'tone' => $tone,
                    ];
                })->all(),
                'slides' => $slides->map(function (CarouselSlide $slide): array {
                    return [
                        'id' => (string) $slide->id,
                        'subtitle' => $slide->small_header_text,
                        'title' => $slide->main_title,
                        'price' => $slide->discount_text,
                        'brands' => $slide->brand_tags ?? [],
                        'disclaimer' => $slide->description_text ?? '',
                        'image' => self::normalizeMediaReference($slide->image_path ?? ''),
                    ];
                })->all(),
                'miniSlides' => self::normalizeLegacySlides($miniSlides),
                'videoAds' => $videoAds->map(function (VideoAd $videoAd): array {
                    return [
                        'id' => (string) $videoAd->id,
                        'image' => self::normalizeMediaReference($videoAd->image_url ?? ''),
                        'videoUrl' => self::normalizeMediaReference($videoAd->video_url ?? ''),
                        'imageUrl' => self::normalizeMediaReference($videoAd->image_url ?? ''),
                    ];
                })->all(),
            ];
        }

        if ($legacy) {
            return [
                'circles' => $legacy->circles ?? [],
                'slides' => self::normalizeLegacySlides($legacy->slides ?? []),
                'miniSlides' => self::normalizeLegacySlides($legacy->mini_slides ?? []),
                'videoAds' => self::normalizeLegacyVideoAds($legacy->video_ads ?? []),
            ];
        }

        return [
            'circles' => [],
            'slides' => [],
            'miniSlides' => [],
            'videoAds' => [],
        ];
    }
}
