<?php

use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\Admin\AdminAuthController;
use App\Http\Controllers\Api\Admin\HomepageConfigController as AdminHomepageConfigController;
use App\Http\Controllers\Api\Admin\UserMonitorController;
use App\Http\Controllers\Api\AccountVerificationController;
use App\Http\Controllers\Api\AuctionController;
use App\Http\Controllers\Api\AuctionMessageController;
use App\Http\Controllers\Api\DirectMessageController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BidController;
use App\Http\Controllers\Api\HomepageConfigController;
use App\Http\Controllers\Api\SellerRegistrationController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
    Route::get('google/redirect', [AuthController::class, 'googleRedirect']);
    Route::get('google/callback', [AuthController::class, 'googleCallback']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
        Route::post('update-profile', [AuthController::class, 'updateProfile']);
        Route::delete('delete-account', [AuthController::class, 'deleteAccount']);

        Route::prefix('verification')->group(function () {
            Route::get('status', [AccountVerificationController::class, 'status']);
            Route::post('send-otp', [AccountVerificationController::class, 'sendOtp']);
            Route::post('confirm-otp', [AccountVerificationController::class, 'confirmOtp']);
            Route::post('upload-documents', [AccountVerificationController::class, 'uploadDocuments']);
            Route::post('finalize', [AccountVerificationController::class, 'finalize']);
            Route::post('revoke', [AccountVerificationController::class, 'revoke']);
        });
    });
});

Route::get('media/{path}', [AuctionController::class, 'media'])->where('path', '.*');
Route::get('direct-message-attachments/{attachment}', [DirectMessageController::class, 'attachment']);
Route::get('homepage-config', [HomepageConfigController::class, 'show']);

Route::prefix('admin')->group(function () {
    Route::post('login', [AdminAuthController::class, 'login']);

    Route::middleware(['auth:sanctum', 'admin'])->group(function () {
        Route::post('logout', [AdminAuthController::class, 'logout']);
        Route::get('homepage-config', [AdminHomepageConfigController::class, 'show']);
        Route::put('homepage-config', [AdminHomepageConfigController::class, 'update']);
        Route::get('users', [UserMonitorController::class, 'index']);
        Route::get('users/{user}', [UserMonitorController::class, 'show']);
        Route::post('users/{user}/suspend', [UserMonitorController::class, 'suspend']);
        Route::post('users/{user}/unsuspend', [UserMonitorController::class, 'unsuspend']);
        Route::post('users/{user}/revoke-seller', [UserMonitorController::class, 'revokeSeller']);
        Route::post('users/{user}/unrevoke-seller', [UserMonitorController::class, 'unrevokeSeller']);
        Route::post('users/{user}/delete', [UserMonitorController::class, 'destroy']);
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

    Route::post('auctions/{auction}/bids', [BidController::class, 'store']);
    Route::post('auctions/{auction}/messages', [AuctionMessageController::class, 'store']);
    Route::patch('auctions/{auction}/messages/{message}', [AuctionMessageController::class, 'update']);
    Route::delete('auctions/{auction}/messages/{message}', [AuctionMessageController::class, 'destroy']);
    Route::post('auctions/{auction}/messages/read', [AuctionMessageController::class, 'markRead']);

    Route::get('direct-messages/threads', [DirectMessageController::class, 'threads']);
    Route::get('direct-messages/threads/{user}', [DirectMessageController::class, 'index']);
    Route::post('direct-messages/threads/{user}', [DirectMessageController::class, 'store']);
    Route::delete('direct-messages/threads/{user}', [DirectMessageController::class, 'destroy']);

    Route::get('addresses', [AddressController::class, 'index']);
    Route::post('addresses', [AddressController::class, 'store']);
    Route::patch('addresses/{address}', [AddressController::class, 'update']);
    Route::delete('addresses/{address}', [AddressController::class, 'destroy']);

    Route::post('seller/registration', [SellerRegistrationController::class, 'store']);
    Route::get('seller/registration', [SellerRegistrationController::class, 'show']);
    Route::patch('seller/shipping-settings', [SellerRegistrationController::class, 'updateShippingSettings']);
});
