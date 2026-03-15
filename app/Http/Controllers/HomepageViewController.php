<?php

namespace App\Http\Controllers;

use App\Models\CarouselSlide;
use App\Models\PromoCircle;
use App\Models\VideoAd;

class HomepageViewController extends Controller
{
    public function index()
    {
        $promoCircles = PromoCircle::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $carouselSlides = CarouselSlide::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $videoAds = VideoAd::query()
            ->where('is_active', true)
            ->orderByDesc('id')
            ->orderByDesc('sort_order')
            ->get();

        return view('homepage.index', [
            'promoCircles' => $promoCircles,
            'carouselSlides' => $carouselSlides,
            'videoAds' => $videoAds,
        ]);
    }
}
