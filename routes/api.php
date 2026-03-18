<?php

use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\Admin\AdminAuthController;
use App\Http\Controllers\Api\Admin\AdminNotificationController;
use App\Http\Controllers\Api\Admin\AdminSettingController;
use App\Http\Controllers\Api\Admin\CarouselSlideController as AdminCarouselSlideController;
use App\Http\Controllers\Api\Admin\HomepageConfigController as AdminHomepageConfigController;
use App\Http\Controllers\Api\Admin\HomepageMediaUploadController;
use App\Http\Controllers\Api\Admin\PromoCircleController as AdminPromoCircleController;
use App\Http\Controllers\Api\Admin\UserMonitorController;
use App\Http\Controllers\Api\Admin\VideoAdController as AdminVideoAdController;
use App\Http\Controllers\Api\AccountVerificationController;
use App\Http\Controllers\Api\AuctionController;
use App\Http\Controllers\Api\AuctionMessageController;
use App\Http\Controllers\Api\DirectMessageController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BidController;
use App\Http\Controllers\Api\BidNotificationController;
use App\Http\Controllers\Api\HomepageContentController;
use App\Http\Controllers\Api\HomepageConfigController;
use App\Http\Controllers\Api\SellerRegistrationController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:auth-register');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:auth-login');
    Route::get('google/redirect', [AuthController::class, 'googleRedirect']);
    Route::get('google/callback', [AuthController::class, 'googleCallback']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
        Route::post('update-profile', [AuthController::class, 'updateProfile']);
        Route::delete('delete-account', [AuthController::class, 'deleteAccount']);

        Route::prefix('verification')->group(function () {
            Route::get('status', [AccountVerificationController::class, 'status']);
            Route::post('send-otp', [AccountVerificationController::class, 'sendOtp'])->middleware('throttle:verification-otp-send');
            Route::post('confirm-otp', [AccountVerificationController::class, 'confirmOtp'])->middleware('throttle:verification-otp-confirm');
            Route::post('upload-documents', [AccountVerificationController::class, 'uploadDocuments'])->middleware('throttle:document-uploads');
            Route::post('finalize', [AccountVerificationController::class, 'finalize'])->middleware('throttle:document-uploads');
            Route::post('revoke', [AccountVerificationController::class, 'revoke'])->middleware('throttle:document-uploads');
        });
    });
});

Route::get('media/{path}', [AuctionController::class, 'media'])->where('path', '.*');
Route::get('homepage-media/{path}', [HomepageMediaUploadController::class, 'show'])->where('path', '.*');
Route::get('direct-message-attachments/{attachment}', [DirectMessageController::class, 'attachment']);
Route::get('homepage-config', [HomepageConfigController::class, 'show']);
Route::get('homepage-content', [HomepageContentController::class, 'index']);
Route::get('settings/public', [AdminSettingController::class, 'publicIndex']);

Route::prefix('admin')->middleware(['web', 'admin.ip'])->group(function () {
    Route::post('login', [AdminAuthController::class, 'login']);
    Route::post('verify-mfa', [AdminAuthController::class, 'verifyMfa'])->middleware('throttle:admin-mfa');

    Route::middleware(['auth:sanctum', 'admin', 'throttle:admin-actions'])->group(function () {
        Route::get('session', [AdminAuthController::class, 'session']);
        Route::post('logout', [AdminAuthController::class, 'logout']);
        Route::get('mfa/status', [AdminAuthController::class, 'mfaStatus']);
        Route::post('mfa/setup', [AdminAuthController::class, 'mfaSetup']);
        Route::post('mfa/enable', [AdminAuthController::class, 'mfaEnable']);
        Route::post('mfa/disable', [AdminAuthController::class, 'mfaDisable']);
        Route::post('mfa/step-up', [AdminAuthController::class, 'stepUpMfa'])->middleware('throttle:admin-mfa');
        Route::get('homepage-config', [AdminHomepageConfigController::class, 'show']);
        Route::put('homepage-config', [AdminHomepageConfigController::class, 'update']);
        Route::post('homepage-media/upload', [HomepageMediaUploadController::class, 'store'])->middleware('throttle:admin-uploads');
        Route::apiResource('promo-circles', AdminPromoCircleController::class);
        Route::apiResource('carousel-slides', AdminCarouselSlideController::class);
        Route::apiResource('video-ads', AdminVideoAdController::class);
        Route::get('users', [UserMonitorController::class, 'index']);
        Route::get('users/{user}', [UserMonitorController::class, 'show']);
        Route::get('users/{user}/verification-media/{key}', [UserMonitorController::class, 'verificationMedia']);
        Route::post('users/{user}/suspend', [UserMonitorController::class, 'suspend'])->middleware('admin.mfa.recent');
        Route::post('users/{user}/unsuspend', [UserMonitorController::class, 'unsuspend']);
        Route::post('users/{user}/revoke-seller', [UserMonitorController::class, 'revokeSeller'])->middleware('admin.mfa.recent');
        Route::post('users/{user}/unrevoke-seller', [UserMonitorController::class, 'unrevokeSeller']);
        Route::post('users/{user}/delete', [UserMonitorController::class, 'destroy'])->middleware('admin.mfa.recent');

        // Admin notifications
        Route::get('notifications', [AdminNotificationController::class, 'index']);
        Route::get('notifications/unread-count', [AdminNotificationController::class, 'unreadCount']);
        Route::post('notifications/read-all', [AdminNotificationController::class, 'markAllRead']);
        Route::post('notifications/{notification}/read', [AdminNotificationController::class, 'markRead']);
        Route::delete('notifications/{notification}', [AdminNotificationController::class, 'destroy']);

        // Admin settings
        Route::get('settings', [AdminSettingController::class, 'index']);
        Route::put('settings', [AdminSettingController::class, 'update']);

        // Admin account security
        Route::post('change-password', [AdminAuthController::class, 'changePassword']);
    });
});

Route::get('auctions', [AuctionController::class, 'index']);
Route::get('auctions/{auction}', [AuctionController::class, 'show']);
Route::get('auctions/{auction}/messages', [AuctionMessageController::class, 'index']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('broadcasting/auth', function (Request $request) {
        return Broadcast::auth($request);
    });

    Route::get('seller/products', [AuctionController::class, 'mine']);
    Route::get('bag/won-auctions', [AuctionController::class, 'won']);
    Route::post('auctions', [AuctionController::class, 'store']);
    Route::patch('auctions/{auction}', [AuctionController::class, 'update']);
    Route::delete('auctions/{auction}', [AuctionController::class, 'destroy']);

    Route::get('notifications/bids', [BidNotificationController::class, 'index']);
    Route::post('auctions/{auction}/bids', [BidController::class, 'store'])->middleware('throttle:bids');
    Route::post('auctions/{auction}/messages', [AuctionMessageController::class, 'store'])->middleware('throttle:messages');
    Route::patch('auctions/{auction}/messages/{message}', [AuctionMessageController::class, 'update'])->middleware('throttle:messages');
    Route::delete('auctions/{auction}/messages/{message}', [AuctionMessageController::class, 'destroy'])->middleware('throttle:messages');
    Route::post('auctions/{auction}/messages/read', [AuctionMessageController::class, 'markRead'])->middleware('throttle:messages');

    Route::get('direct-messages/threads', [DirectMessageController::class, 'threads']);
    Route::get('direct-messages/threads/{user}', [DirectMessageController::class, 'index']);
    Route::post('direct-messages/threads/{user}', [DirectMessageController::class, 'store'])->middleware('throttle:messages');
    Route::delete('direct-messages/threads/{user}', [DirectMessageController::class, 'destroy'])->middleware('throttle:messages');

    Route::get('addresses', [AddressController::class, 'index']);
    Route::post('addresses', [AddressController::class, 'store']);
    Route::patch('addresses/{address}', [AddressController::class, 'update']);
    Route::delete('addresses/{address}', [AddressController::class, 'destroy']);

    Route::post('seller/registration', [SellerRegistrationController::class, 'store']);
    Route::get('seller/registration', [SellerRegistrationController::class, 'show']);
    Route::patch('seller/shipping-settings', [SellerRegistrationController::class, 'updateShippingSettings']);
});
