<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CarouselSlide;
use App\Models\PromoCircle;
use App\Models\VideoAd;
use Illuminate\Http\Request;

class HomepageContentPageController extends Controller
{
    public function index()
    {
        return view('admin.homepage-content', [
            'promoCircles' => PromoCircle::query()->orderBy('sort_order')->orderBy('id')->get(),
            'carouselSlides' => CarouselSlide::query()->orderBy('sort_order')->orderBy('id')->get(),
            'videoAds' => VideoAd::query()->orderBy('sort_order')->orderByDesc('id')->get(),
        ]);
    }

    public function storePromoCircle(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'subtitle_text' => ['required', 'string', 'max:160'],
            'color' => ['required', 'string', 'max:32'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        PromoCircle::query()->create($validated + ['is_active' => $request->boolean('is_active')]);

        return back()->with('status', 'Promo circle added.');
    }

    public function updatePromoCircle(Request $request, PromoCircle $promoCircle)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'subtitle_text' => ['required', 'string', 'max:160'],
            'color' => ['required', 'string', 'max:32'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $promoCircle->update($validated + ['is_active' => $request->boolean('is_active')]);

        return back()->with('status', 'Promo circle updated.');
    }

    public function destroyPromoCircle(PromoCircle $promoCircle)
    {
        $promoCircle->delete();

        return back()->with('status', 'Promo circle deleted.');
    }

    public function storeCarouselSlide(Request $request)
    {
        $validated = $request->validate([
            'small_header_text' => ['required', 'string', 'max:160'],
            'main_title' => ['required', 'string', 'max:160'],
            'discount_text' => ['required', 'string', 'max:120'],
            'brand_tags' => ['nullable', 'string'],
            'image_path' => ['nullable', 'string', 'max:500'],
            'description_text' => ['nullable', 'string', 'max:2000'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        CarouselSlide::query()->create([
            'small_header_text' => $validated['small_header_text'],
            'main_title' => $validated['main_title'],
            'discount_text' => $validated['discount_text'],
            'brand_tags' => $this->parseTags($validated['brand_tags'] ?? ''),
            'image_path' => $validated['image_path'] ?? null,
            'description_text' => $validated['description_text'] ?? null,
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_active' => $request->boolean('is_active'),
        ]);

        return back()->with('status', 'Carousel slide added.');
    }

    public function updateCarouselSlide(Request $request, CarouselSlide $carouselSlide)
    {
        $validated = $request->validate([
            'small_header_text' => ['required', 'string', 'max:160'],
            'main_title' => ['required', 'string', 'max:160'],
            'discount_text' => ['required', 'string', 'max:120'],
            'brand_tags' => ['nullable', 'string'],
            'image_path' => ['nullable', 'string', 'max:500'],
            'description_text' => ['nullable', 'string', 'max:2000'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $carouselSlide->update([
            'small_header_text' => $validated['small_header_text'],
            'main_title' => $validated['main_title'],
            'discount_text' => $validated['discount_text'],
            'brand_tags' => $this->parseTags($validated['brand_tags'] ?? ''),
            'image_path' => $validated['image_path'] ?? null,
            'description_text' => $validated['description_text'] ?? null,
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_active' => $request->boolean('is_active'),
        ]);

        return back()->with('status', 'Carousel slide updated.');
    }

    public function destroyCarouselSlide(CarouselSlide $carouselSlide)
    {
        $carouselSlide->delete();

        return back()->with('status', 'Carousel slide deleted.');
    }

    public function storeVideoAd(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:2000'],
            'video_url' => ['nullable', 'url', 'max:500'],
            'image_url' => ['nullable', 'string', 'max:500'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        VideoAd::query()->create($validated + ['is_active' => $request->boolean('is_active')]);

        return back()->with('status', 'Video ad added.');
    }

    public function updateVideoAd(Request $request, VideoAd $videoAd)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:2000'],
            'video_url' => ['nullable', 'url', 'max:500'],
            'image_url' => ['nullable', 'string', 'max:500'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $videoAd->update($validated + ['is_active' => $request->boolean('is_active')]);

        return back()->with('status', 'Video ad updated.');
    }

    public function destroyVideoAd(VideoAd $videoAd)
    {
        $videoAd->delete();

        return back()->with('status', 'Video ad deleted.');
    }

    private function parseTags(string $value): array
    {
        return array_values(array_filter(array_map(
            static fn (string $tag): string => trim($tag),
            explode(',', $value)
        )));
    }
}
