<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Bid\StoreBidRequest;
use App\Models\AdminNotification;
use App\Models\AdminSetting;
use App\Models\Auction;
use App\Models\User;
use App\Services\Wallet\WalletReservationService;
use Illuminate\Support\Facades\DB;

class BidController extends Controller
{
    public function __construct(private readonly WalletReservationService $reservationService)
    {
    }

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

        $isFirstBid = ! $request->user()->bids()->exists();
        $acknowledgedAutoDeduct = $request->boolean('acknowledge_auto_deduct');

        if ($isFirstBid && ! $acknowledgedAutoDeduct) {
            return response()->json([
                'message' => 'Please confirm that winning bids are automatically deducted from your wallet.',
                'code' => 'FIRST_BID_ACK_REQUIRED',
                'requires_acknowledgement' => true,
            ], 409);
        }

        $amount = (int) $request->validated()['amount'];

        $result = DB::transaction(function () use ($auction, $request, $amount) {
            /** @var Auction $lockedAuction */
            $lockedAuction = Auction::query()
                ->whereKey($auction->id)
                ->lockForUpdate()
                ->firstOrFail();

            $computedStatus = $lockedAuction->getComputedStatus();

            if ($computedStatus === 'scheduled') {
                return [
                    'error' => 'This auction has not started yet.',
                    'status' => 422,
                ];
            }

            if ($computedStatus === 'closed') {
                return [
                    'error' => 'This auction is closed.',
                    'status' => 422,
                ];
            }

            $currentBase = (int) ceil(max((float) $lockedAuction->starting_price, (float) ($lockedAuction->current_price ?? 0)));
            $minimumStep = max(1, (int) ceil((float) ($lockedAuction->max_increment ?? 0)));
            $minBid = $currentBase + $minimumStep;

            if ($amount < $minBid) {
                return [
                    'error' => sprintf('Bid must be at least %d based on the configured increment.', $minBid),
                    'status' => 422,
                ];
            }

            /** @var User|null $lockedBidder */
            $lockedBidder = User::query()
                ->whereKey($request->user()->id)
                ->lockForUpdate()
                ->first();

            if (! $lockedBidder) {
                return [
                    'error' => 'Unable to resolve bidder account.',
                    'status' => 422,
                ];
            }

            $existingOwnReservation = $this->reservationService
                ->getActiveReservationForAuctionAndUser($lockedAuction->id, $lockedBidder->id);

            $currentReservedForThisAuction = (float) ($existingOwnReservation?->amount ?? 0);
            $requiredReservationDelta = max(0, round($amount - $currentReservedForThisAuction, 2));
            $availableExcludingCurrentAuction = $this->reservationService
                ->getAvailableBalanceForUser($lockedBidder, $lockedAuction->id);

            if ($requiredReservationDelta > $availableExcludingCurrentAuction) {
                return [
                    'error' => 'Your available wallet balance is not enough for this bid once active reservations are considered.',
                    'status' => 422,
                ];
            }

            $bid = $lockedAuction->bids()->create([
                'user_id' => $lockedBidder->id,
                'amount' => $amount,
            ]);

            $lockedAuction->update([
                'current_price' => number_format($amount, 2, '.', ''),
            ]);

            $this->reservationService->reserveForLeadingBid($lockedAuction, $bid);

            return [
                'bid' => $bid,
                'auction' => $lockedAuction,
            ];
        });

        if (isset($result['error'])) {
            return response()->json([
                'message' => $result['error'],
            ], (int) ($result['status'] ?? 422));
        }

        $bid = $result['bid'];
        /** @var Auction $auction */
        $auction = $result['auction'];

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
