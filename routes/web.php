<?php

use App\Http\Controllers\Admin\HomepageContentPageController;
use App\Http\Controllers\HomepageViewController;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'name' => config('app.name'),
        'status' => 'API running',
    ]);
});

$serveSpa = function () {
    $spaIndex = public_path('build/index.html');

    if (file_exists($spaIndex)) {
        $html = file_get_contents($spaIndex);

        if ($html !== false) {
            $html = str_replace('/build/favicon.svg', '/favicon.svg', $html);

            return response($html, 200, [
                'Content-Type' => 'text/html; charset=UTF-8',
                'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            ]);
        }

        return response()->file($spaIndex, [
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
        ]);
    }

    return response()->json([
        'name' => config('app.name'),
        'status' => 'Frontend build not found. Run npm run build.',
    ], 503);
};

Route::get('/', $serveSpa);

Route::get('/favicon.ico', function () {
    return response()->file(public_path('icons/Admin Logo.png'));
});

Route::get('/homepage', [HomepageViewController::class, 'index'])->name('homepage.dynamic');

Route::prefix('admin/homepage-content')->name('admin.homepage-content.')->group(function () {
    Route::get('/', [HomepageContentPageController::class, 'index'])->name('index');

    Route::post('/promo-circles', [HomepageContentPageController::class, 'storePromoCircle'])->name('promo-circles.store');
    Route::put('/promo-circles/{promoCircle}', [HomepageContentPageController::class, 'updatePromoCircle'])->name('promo-circles.update');
    Route::delete('/promo-circles/{promoCircle}', [HomepageContentPageController::class, 'destroyPromoCircle'])->name('promo-circles.destroy');

    Route::post('/carousel-slides', [HomepageContentPageController::class, 'storeCarouselSlide'])->name('carousel-slides.store');
    Route::put('/carousel-slides/{carouselSlide}', [HomepageContentPageController::class, 'updateCarouselSlide'])->name('carousel-slides.update');
    Route::delete('/carousel-slides/{carouselSlide}', [HomepageContentPageController::class, 'destroyCarouselSlide'])->name('carousel-slides.destroy');

    Route::post('/video-ads', [HomepageContentPageController::class, 'storeVideoAd'])->name('video-ads.store');
    Route::put('/video-ads/{videoAd}', [HomepageContentPageController::class, 'updateVideoAd'])->name('video-ads.update');
    Route::delete('/video-ads/{videoAd}', [HomepageContentPageController::class, 'destroyVideoAd'])->name('video-ads.destroy');
});

Route::get('/{any}', $serveSpa)->where('any', '^(?!api(?:/|$)|sanctum(?:/|$)|health$|homepage(?:/|$)|admin/homepage-content(?:/|$)).*');
