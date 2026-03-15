<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Bid\StoreBidRequest;
use App\Models\AdminNotification;
use App\Models\AdminSetting;
use App\Models\Auction;

class BidController extends Controller
{
    public function store(StoreBidRequest $request, Auction $auction)
    {
        if ((bool) AdminSetting::getValue('require_verified_for_bidding', false) && ! (bool) $request->user()?->is_verified) {
            return response()->json([
                'message' => 'Only verified users can place bids right now.',
            ], 422);
        }

        $dailyBidCap = max(1, (int) AdminSetting::getValue('max_daily_bids_per_user', 200));
        $todayBidCount = $request->user()
            ->bids()
            ->where('created_at', '>=', now()->startOfDay())
            ->count();

        if ($todayBidCount >= $dailyBidCap) {
            return response()->json([
                'message' => 'You have reached today\'s bid limit. Please try again tomorrow.',
            ], 429);
        }

        if ((int) $auction->user_id === (int) $request->user()->id) {
            return response()->json([
                'message' => 'You cannot bid on your own product.',
            ], 422);
        }

        $computedStatus = $auction->getComputedStatus();

        if ($computedStatus === 'scheduled') {
            return response()->json([
                'message' => 'This auction has not started yet.',
            ], 422);
        }

        if ($computedStatus === 'closed') {
            return response()->json([
                'message' => 'This auction is closed.',
            ], 422);
        }

        $amount = (int) $request->validated()['amount'];
        $currentBase = (int) ceil(max((float) $auction->starting_price, (float) ($auction->current_price ?? 0)));
        $minimumStep = max(1, (int) ceil((float) ($auction->max_increment ?? 0)));
        $minBid = $currentBase + $minimumStep;

        if ($amount < $minBid) {
            return response()->json([
                'message' => sprintf('Bid must be at least %d based on the configured increment.', $minBid),
            ], 422);
        }

        $bid = $auction->bids()->create([
            'user_id' => $request->user()->id,
            'amount' => $amount,
        ]);

        $auction->update([
            'current_price' => number_format($amount, 2, '.', ''),
        ]);

        $auction->loadMissing('user');
        AdminNotification::notify(
            'bid',
            'New bid placed',
            "{$request->user()->name} placed ₱" . number_format($amount, 2) . " on \"{$auction->title}\".",
            [
                'auction_id' => $auction->id,
                'seller_user_id' => $auction->user_id,
                'seller_name' => $auction->user?->name,
                'bidder_user_id' => $request->user()->id,
                'bid_amount' => $amount,
                'analytics' => AdminNotification::userSellerAnalyticsSnapshot(),
            ]
        );

        return response()->json($bid, 201);
    }
}
