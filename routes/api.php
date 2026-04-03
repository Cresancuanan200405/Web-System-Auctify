<?php

use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\Admin\AdminAuthController;
use App\Http\Controllers\Api\Admin\AdminNotificationController;
use App\Http\Controllers\Api\Admin\OrderManagementController;
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
use App\Http\Controllers\Api\OrderLifecycleController;
use App\Http\Controllers\Api\SellerOrderController;
use App\Http\Controllers\Api\SellerRegistrationController;
use App\Http\Controllers\Api\WalletController;
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
        Route::get('wallet', [WalletController::class, 'show']);
        Route::get('wallet/history', [WalletController::class, 'history']);
        Route::post('wallet/top-up', [WalletController::class, 'topUp']);
        Route::post('wallet/spend', [WalletController::class, 'spend']);

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

    Route::middleware(['auth:sanctum', 'admin', 'throttle:admin-actions'])->group(function () {
        Route::get('session', [AdminAuthController::class, 'session']);
        Route::post('logout', [AdminAuthController::class, 'logout']);
        Route::get('homepage-config', [AdminHomepageConfigController::class, 'show']);
        Route::put('homepage-config', [AdminHomepageConfigController::class, 'update']);
        Route::post('homepage-media/upload', [HomepageMediaUploadController::class, 'store'])->middleware('throttle:admin-uploads');
        Route::apiResource('promo-circles', AdminPromoCircleController::class);
        Route::apiResource('carousel-slides', AdminCarouselSlideController::class);
        Route::apiResource('video-ads', AdminVideoAdController::class);
        Route::get('users', [UserMonitorController::class, 'index']);
        Route::get('users/{user}', [UserMonitorController::class, 'show']);
        Route::get('users/{user}/verification-media/{key}', [UserMonitorController::class, 'verificationMedia']);
        Route::post('users/{user}/suspend', [UserMonitorController::class, 'suspend']);
        Route::post('users/{user}/unsuspend', [UserMonitorController::class, 'unsuspend']);
        Route::post('users/{user}/approve-seller', [UserMonitorController::class, 'approveSeller']);
        Route::post('users/{user}/reject-seller', [UserMonitorController::class, 'rejectSeller']);
        Route::post('users/{user}/revoke-seller', [UserMonitorController::class, 'revokeSeller']);
        Route::post('users/{user}/unrevoke-seller', [UserMonitorController::class, 'unrevokeSeller']);
        Route::post('users/{user}/delete', [UserMonitorController::class, 'destroy']);
        Route::get('orders/shipments', [OrderManagementController::class, 'shipments']);
        Route::get('orders/payments', [OrderManagementController::class, 'payments']);

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
    Route::post('orders/from-bid-winner', [OrderLifecycleController::class, 'storeFromBidWinner']);
    Route::get('seller/orders', [SellerOrderController::class, 'index']);
    Route::patch('seller/orders/{order}/shipping-status', [SellerOrderController::class, 'updateShippingStatus']);
    Route::post('seller/orders/{order}/payments', [SellerOrderController::class, 'capturePayment']);
    Route::get('seller/orders/payments/history', [SellerOrderController::class, 'paymentHistory']);
});
