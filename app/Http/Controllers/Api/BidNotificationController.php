<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Auction;
use App\Models\Bid;
use App\Services\Bids\BidWinnerSettlementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BidNotificationController extends Controller
{
    public function __construct(private readonly BidWinnerSettlementService $settlementService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $userId = (int) $user->id;

        $auctions = Auction::query()
            ->with([
                'bids' => function ($query) {
                    $query->select(['id', 'auction_id', 'user_id', 'amount', 'created_at'])
                        ->orderByDesc('created_at');
                },
                'messages' => function ($query) {
                    $query->select(['id', 'auction_id', 'user_id', 'message', 'created_at'])
                        ->orderByDesc('created_at');
                },
                'media',
            ])
            ->whereHas('bids', function ($query) use ($userId) {
                $query->where('user_id', $userId);
            })
            ->latest('updated_at')
            ->limit(120)
            ->get();

        $notifications = collect();

        foreach ($auctions as $auction) {
            /** @var Auction $auction */
            $bids = $auction->bids;
            if ($bids->isEmpty()) {
                continue;
            }

            $myBids = $bids->where('user_id', $userId)->values();
            if ($myBids->isEmpty()) {
                continue;
            }

            $myHighest = (float) $myBids->max(function (Bid $bid) {
                return (float) $bid->amount;
            });
            $myLatestBid = $myBids->sortByDesc('created_at')->first();

            /** @var Bid|null $highestBid */
            $highestBid = $bids->sort(function (Bid $left, Bid $right) {
                $leftAmount = (float) $left->amount;
                $rightAmount = (float) $right->amount;

                if ($leftAmount === $rightAmount) {
                    return strtotime((string) $right->created_at) <=> strtotime((string) $left->created_at);
                }

                return $rightAmount <=> $leftAmount;
            })->first();

            $latestOtherBid = $bids->first(function (Bid $bid) use ($userId) {
                return (int) $bid->user_id !== $userId;
            });

            $auctionEnded = $auction->ends_at && $auction->ends_at->lessThanOrEqualTo(now());
            $winnerRecord = $auctionEnded
                ? $this->settlementService->syncForAuction($auction)
                : null;
            $firstMedia = $auction->media->first();
            $mediaUrl = $firstMedia?->url;
            $myLatestBidAtIso = $myLatestBid?->created_at?->toISOString();

            if (! $auctionEnded && $latestOtherBid && (! $myLatestBid || $latestOtherBid->created_at?->greaterThan($myLatestBid->created_at))) {
                $notifications->push([
                    'key' => 'new-bid-' . $auction->id . '-' . $latestOtherBid->id,
                    'type' => 'new-bid',
                    'auction_id' => $auction->id,
                    'auction_title' => $auction->title,
                    'message' => 'Another user placed a new bid on this auction.',
                    'created_at' => $latestOtherBid->created_at?->toISOString(),
                    'media_url' => $mediaUrl,
                ]);
            }

            if (! $auctionEnded && $highestBid && (int) $highestBid->user_id !== $userId && (float) $highestBid->amount > $myHighest) {
                $notifications->push([
                    'key' => 'outbid-' . $auction->id . '-' . $highestBid->id,
                    'type' => 'outbid',
                    'auction_id' => $auction->id,
                    'auction_title' => $auction->title,
                    'message' => 'You were outbid on this product.',
                    'created_at' => $highestBid->created_at?->toISOString(),
                    'media_url' => $mediaUrl,
                ]);
            }

            if ($auctionEnded) {
                $won = $winnerRecord
                    ? (int) $winnerRecord->winner_user_id === $userId
                    : ($highestBid && (int) $highestBid->user_id === $userId);

                $notifications->push([
                    'key' => ($won ? 'won-' : 'ended-') . $auction->id,
                    'type' => $won ? 'won' : 'ended',
                    'auction_id' => $auction->id,
                    'auction_title' => $auction->title,
                    'message' => $won
                        ? 'Auction ended. You won this bid.'
                        : 'Auction ended for this product.',
                    'created_at' => optional($auction->ends_at)?->toISOString(),
                    'media_url' => $mediaUrl,
                ]);
            }

            $latestSellerMessage = $auction->messages->first(function ($message) use ($auction) {
                return (int) $message->user_id === (int) $auction->user_id;
            });

            if (
                $latestSellerMessage
                && ! $auctionEnded
                && (! $myLatestBid || $latestSellerMessage->created_at?->greaterThan($myLatestBid->created_at))
            ) {
                $notifications->push([
                    'key' => 'seller-comment-' . $auction->id . '-' . $latestSellerMessage->id,
                    'type' => 'seller-comment',
                    'auction_id' => $auction->id,
                    'auction_title' => $auction->title,
                    'message' => 'Seller posted a new comment in live chat.',
                    'created_at' => $latestSellerMessage->created_at?->toISOString(),
                    'media_url' => $mediaUrl,
                ]);
            }

            if ($myLatestBidAtIso) {
                $notifications->push([
                    'key' => 'watching-' . $auction->id,
                    'type' => 'watching',
                    'auction_id' => $auction->id,
                    'auction_title' => $auction->title,
                    'message' => 'You have an active bid on this product.',
                    'created_at' => $myLatestBidAtIso,
                    'media_url' => $mediaUrl,
                ]);
            }
        }

        $items = $notifications
            ->sortByDesc('created_at')
            ->unique('key')
            ->values()
            ->take(100)
            ->all();

        return response()->json([
            'items' => $items,
            'count' => count($items),
        ]);
    }
}
