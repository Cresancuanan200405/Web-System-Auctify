<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Bid\StoreBidRequest;
use App\Models\Auction;
use Illuminate\Support\Carbon;

class BidController extends Controller
{
    public function store(StoreBidRequest $request, Auction $auction)
    {
        if ($auction->status === 'open' && $auction->ends_at && Carbon::parse($auction->ends_at)->isPast()) {
            $auction->update(['status' => 'closed']);
            $auction->refresh();
        }

        if ($auction->starts_at && Carbon::parse($auction->starts_at)->isFuture()) {
            return response()->json([
                'message' => 'This auction has not started yet.',
            ], 422);
        }

        if (! $auction->isOpen()) {
            return response()->json([
                'message' => 'This auction is closed.',
            ], 422);
        }

        $amount = $request->validated()['amount'];
        $minBid = max($auction->starting_price, $auction->current_price ?? 0);

        if ($amount <= $minBid) {
            return response()->json([
                'message' => 'Bid amount must be higher than the current price.',
            ], 422);
        }

        $bid = $auction->bids()->create([
            'user_id' => $request->user()->id,
            'amount' => $amount,
        ]);

        $auction->update([
            'current_price' => $amount,
        ]);

        return response()->json($bid, 201);
    }
}
