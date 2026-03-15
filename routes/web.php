<?php

use App\Http\Controllers\Admin\HomepageContentPageController;
use App\Http\Controllers\HomepageViewController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'name' => config('app.name'),
        'status' => 'API running',
    ]);
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
