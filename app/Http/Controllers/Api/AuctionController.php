<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auction\StoreAuctionRequest;
use App\Models\Auction;
use Illuminate\Http\Request;

class AuctionController extends Controller
{
    public function index()
    {
        $auctions = Auction::query()
            ->withCount('bids')
            ->latest()
            ->get();

        return response()->json($auctions);
    }

    public function show(Auction $auction)
    {
        $auction->load(['bids.user']);

        return response()->json($auction);
    }

    public function store(StoreAuctionRequest $request)
    {
        $auction = Auction::create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
            'current_price' => $request->validated()['starting_price'],
        ]);

        return response()->json($auction, 201);
    }

    public function update(StoreAuctionRequest $request, Auction $auction)
    {
        if ($auction->user_id !== $request->user()->id) {
            return response()->json([
                'message' => 'You are not allowed to update this auction.',
            ], 403);
        }

        $auction->update($request->validated());

        return response()->json($auction);
    }

    public function destroy(Request $request, Auction $auction)
    {
        if ($auction->user_id !== $request->user()->id) {
            return response()->json([
                'message' => 'You are not allowed to delete this auction.',
            ], 403);
        }

        $auction->delete();

        return response()->json([
            'message' => 'Auction deleted.',
        ]);
    }
}
