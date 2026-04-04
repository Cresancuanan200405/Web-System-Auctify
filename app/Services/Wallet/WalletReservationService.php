<?php

namespace App\Services\Wallet;

use App\Models\Auction;
use App\Models\Bid;
use App\Models\BidWinner;
use App\Models\User;
use App\Models\WalletReservation;
use Illuminate\Support\Facades\Schema;

class WalletReservationService
{
    public function getActiveAmountForUser(int $userId, ?int $excludeAuctionId = null): float
    {
        if (! Schema::hasTable('wallet_reservations')) {
            return 0.0;
        }

        $query = WalletReservation::query()
            ->active()
            ->where('user_id', $userId);

        if ($excludeAuctionId) {
            $query->where('auction_id', '!=', $excludeAuctionId);
        }

        return round((float) ($query->sum('amount') ?: 0), 2);
    }

    public function getAvailableBalanceForUser(User $user, ?int $excludeAuctionId = null): float
    {
        $totalBalance = round((float) $user->wallet_balance, 2);
        $reservedAmount = $this->getActiveAmountForUser($user->id, $excludeAuctionId);

        return round(max(0, $totalBalance - $reservedAmount), 2);
    }

    public function getActiveReservationForAuctionAndUser(int $auctionId, int $userId): ?WalletReservation
    {
        if (! Schema::hasTable('wallet_reservations')) {
            return null;
        }

        return WalletReservation::query()
            ->active()
            ->where('auction_id', $auctionId)
            ->where('user_id', $userId)
            ->first();
    }

    public function reserveForLeadingBid(Auction $auction, Bid $leadingBid): WalletReservation
    {
        if (! Schema::hasTable('wallet_reservations')) {
            return new WalletReservation([
                'user_id' => $leadingBid->user_id,
                'auction_id' => $auction->id,
                'bid_id' => $leadingBid->id,
                'amount' => $leadingBid->amount,
                'status' => WalletReservation::STATUS_ACTIVE,
                'reserved_at' => now(),
            ]);
        }

        $reservation = WalletReservation::query()
            ->where('auction_id', $auction->id)
            ->first();

        $now = now();

        if (! $reservation) {
            return WalletReservation::query()->create([
                'user_id' => $leadingBid->user_id,
                'auction_id' => $auction->id,
                'bid_id' => $leadingBid->id,
                'amount' => $leadingBid->amount,
                'status' => WalletReservation::STATUS_ACTIVE,
                'reserved_at' => $now,
                'released_at' => null,
                'consumed_at' => null,
                'release_reason' => null,
            ]);
        }

        $reservation->forceFill([
            'user_id' => $leadingBid->user_id,
            'bid_id' => $leadingBid->id,
            'amount' => $leadingBid->amount,
            'status' => WalletReservation::STATUS_ACTIVE,
            'reserved_at' => $now,
            'released_at' => null,
            'consumed_at' => null,
            'release_reason' => null,
        ])->save();

        return $reservation;
    }

    public function consumeForWinner(BidWinner $winner): void
    {
        if (! Schema::hasTable('wallet_reservations')) {
            return;
        }

        $reservation = WalletReservation::query()
            ->where('auction_id', $winner->auction_id)
            ->first();

        if (! $reservation) {
            return;
        }

        $reservation->forceFill([
            'user_id' => $winner->winner_user_id,
            'bid_id' => $winner->bid_id,
            'amount' => $winner->winning_amount,
            'status' => WalletReservation::STATUS_CONSUMED,
            'consumed_at' => now(),
            'released_at' => null,
            'release_reason' => null,
        ])->save();
    }

    public function releaseForClosedAuction(Auction $auction, string $reason = 'Auction closed without winner settlement'): void
    {
        if (! Schema::hasTable('wallet_reservations')) {
            return;
        }

        $reservation = WalletReservation::query()
            ->where('auction_id', $auction->id)
            ->first();

        if (! $reservation || $reservation->status !== WalletReservation::STATUS_ACTIVE) {
            return;
        }

        $reservation->forceFill([
            'status' => WalletReservation::STATUS_RELEASED,
            'released_at' => now(),
            'release_reason' => $reason,
        ])->save();
    }
}
