<?php

use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\AccountVerificationController;
use App\Http\Controllers\Api\AuctionController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BidController;
use App\Http\Controllers\Api\SellerRegistrationController;
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

Route::get('auctions', [AuctionController::class, 'index']);
Route::get('auctions/{auction}', [AuctionController::class, 'show']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('seller/products', [AuctionController::class, 'mine']);
    Route::post('auctions', [AuctionController::class, 'store']);
    Route::patch('auctions/{auction}', [AuctionController::class, 'update']);
    Route::delete('auctions/{auction}', [AuctionController::class, 'destroy']);

    Route::post('auctions/{auction}/bids', [BidController::class, 'store']);

    Route::get('addresses', [AddressController::class, 'index']);
    Route::post('addresses', [AddressController::class, 'store']);
    Route::patch('addresses/{address}', [AddressController::class, 'update']);
    Route::delete('addresses/{address}', [AddressController::class, 'destroy']);

    Route::post('seller/registration', [SellerRegistrationController::class, 'store']);
    Route::get('seller/registration', [SellerRegistrationController::class, 'show']);
});
