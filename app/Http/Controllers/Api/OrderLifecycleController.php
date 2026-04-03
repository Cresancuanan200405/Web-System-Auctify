<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\BidWinner;
use App\Services\Orders\OrderLifecycleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderLifecycleController extends Controller
{
    public function storeFromBidWinner(Request $request, OrderLifecycleService $lifecycle): JsonResponse
    {
        $validated = $request->validate([
            'bid_winner_id' => ['required', 'integer', 'exists:bid_winners,id'],
            'shipping_address_id' => ['nullable', 'integer', 'exists:addresses,id'],
            'subtotal_amount' => ['nullable', 'numeric', 'min:0'],
            'shipping_fee' => ['nullable', 'numeric', 'min:0'],
            'service_fee' => ['nullable', 'numeric', 'min:0'],
            'total_amount' => ['nullable', 'numeric', 'min:0'],
            'meta' => ['nullable', 'array'],
            'capture_payment' => ['nullable', 'boolean'],
            'payment' => ['nullable', 'array'],
            'payment.method' => ['required_if:capture_payment,true', 'string', 'max:40'],
            'payment.provider' => ['nullable', 'string', 'max:80'],
            'payment.provider_reference' => ['nullable', 'string', 'max:120'],
            'payment.status' => ['nullable', 'string', 'max:30'],
            'payment.amount' => ['nullable', 'numeric', 'min:0'],
            'payment.currency' => ['nullable', 'string', 'size:3'],
            'payment.failure_reason' => ['nullable', 'string', 'max:255'],
            'payment.metadata' => ['nullable', 'array'],
        ]);

        $winner = BidWinner::query()->findOrFail((int) $validated['bid_winner_id']);

        $this->authorize('create', [Order::class, $winner]);

        $order = $lifecycle->createOrderFromBidWinner($request->user(), $winner, $validated);

        return response()->json([
            'message' => 'Order created successfully.',
            'order' => $order,
        ]);
    }
}
