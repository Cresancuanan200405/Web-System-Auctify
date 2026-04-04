<?php

namespace App\Services\Bids;

use App\Models\Auction;
use App\Models\Bid;
use App\Models\BidWinner;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Services\Wallet\WalletReservationService;
use Illuminate\Support\Facades\DB;

class BidWinnerSettlementService
{
    public function __construct(private readonly WalletReservationService $reservationService)
    {
    }

    public function syncForAuction(Auction $auction): ?BidWinner
    {
        if ($auction->getComputedStatus() !== 'closed') {
            return null;
        }

        $winningBid = $this->resolveWinningBid($auction);

        if (! $winningBid) {
            $this->reservationService->releaseForClosedAuction(
                $auction,
                'Auction closed without a valid winning bid.'
            );
            return null;
        }

        $winner = BidWinner::query()->updateOrCreate(
            ['auction_id' => $auction->id],
            [
                'bid_id' => $winningBid->id,
                'winner_user_id' => $winningBid->user_id,
                'seller_user_id' => $auction->user_id,
                'winning_amount' => $winningBid->amount,
                'won_at' => $winningBid->created_at,
            ]
        );

        return $this->settleWallet($winner);
    }

    public function settleWallet(BidWinner $winner): BidWinner
    {
        if ($winner->wallet_deducted_at) {
            return $winner;
        }

        return DB::transaction(function () use ($winner): BidWinner {
            /** @var BidWinner|null $lockedWinner */
            $lockedWinner = BidWinner::query()
                ->whereKey($winner->id)
                ->lockForUpdate()
                ->first();

            if (! $lockedWinner) {
                return $winner;
            }

            if ($lockedWinner->wallet_deducted_at) {
                return $lockedWinner;
            }

            $reference = $this->walletReference($lockedWinner->id);
            $existingSpend = WalletTransaction::query()
                ->where('user_id', $lockedWinner->winner_user_id)
                ->where('type', 'spend')
                ->where('reference', $reference)
                ->latest('id')
                ->first();

            if ($existingSpend) {
                $lockedWinner->forceFill([
                    'wallet_deducted_at' => $existingSpend->created_at ?? now(),
                    'wallet_deduction_failed_at' => null,
                    'wallet_deduction_failure_reason' => null,
                ])->save();

                $this->reservationService->consumeForWinner($lockedWinner);

                return $lockedWinner;
            }

            /** @var User|null $winnerUser */
            $winnerUser = User::query()
                ->whereKey($lockedWinner->winner_user_id)
                ->lockForUpdate()
                ->first();

            if (! $winnerUser) {
                $lockedWinner->forceFill([
                    'wallet_deduction_failed_at' => now(),
                    'wallet_deduction_failure_reason' => 'Winning bidder account not found.',
                ])->save();

                return $lockedWinner;
            }

            $winningAmount = round((float) $lockedWinner->winning_amount, 2);
            $balanceBefore = round((float) $winnerUser->wallet_balance, 2);

            if ($balanceBefore < $winningAmount) {
                $lockedWinner->forceFill([
                    'wallet_deduction_failed_at' => now(),
                    'wallet_deduction_failure_reason' => 'Insufficient wallet balance at auction close.',
                ])->save();

                return $lockedWinner;
            }

            $balanceAfter = round($balanceBefore - $winningAmount, 2);
            $winnerUser->forceFill([
                'wallet_balance' => $balanceAfter,
            ])->save();

            WalletTransaction::query()->create([
                'user_id' => $winnerUser->id,
                'type' => 'spend',
                'amount' => $winningAmount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'reference' => $reference,
                'description' => 'Automatic deduction for winning auction #' . $lockedWinner->auction_id,
            ]);

            $lockedWinner->forceFill([
                'wallet_deducted_at' => now(),
                'wallet_deduction_failed_at' => null,
                'wallet_deduction_failure_reason' => null,
            ])->save();

            $this->reservationService->consumeForWinner($lockedWinner);

            return $lockedWinner;
        });
    }

    /**
     * @return array{processed:int,settled:int,failed:int}
     */
    public function settleClosedAuctions(int $limit = 300): array
    {
        $auctions = Auction::query()
            ->where('ends_at', '<=', now())
            ->whereHas('bids')
            ->orderBy('ends_at')
            ->limit(max(1, $limit))
            ->get();

        $processed = 0;
        $settled = 0;
        $failed = 0;

        foreach ($auctions as $auction) {
            if (! $auction instanceof Auction) {
                continue;
            }

            $processed++;
            $winner = $this->syncForAuction($auction);

            if (! $winner) {
                continue;
            }

            if ($winner->wallet_deducted_at) {
                $settled++;
                continue;
            }

            if ($winner->wallet_deduction_failed_at) {
                $failed++;
            }
        }

        return [
            'processed' => $processed,
            'settled' => $settled,
            'failed' => $failed,
        ];
    }

    private function resolveWinningBid(Auction $auction): ?Bid
    {
        return $auction->bids()
            ->where('amount', $auction->current_price)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->first();
    }

    private function walletReference(int $winnerId): string
    {
        return 'auction-win-' . $winnerId;
    }
}
