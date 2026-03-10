<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Bid\StoreBidRequest;
use App\Models\Auction;
class BidController extends Controller
{
    public function store(StoreBidRequest $request, Auction $auction)
    {
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

        return response()->json($bid, 201);
    }
}
