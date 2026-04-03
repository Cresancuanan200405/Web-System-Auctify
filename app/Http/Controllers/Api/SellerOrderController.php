<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderPayment;
use App\Services\Orders\OrderLifecycleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SellerOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $orders = Order::query()
            ->with([
                'auction.media',
                'buyer',
                'seller',
                'shippingAddress',
                'shipments' => fn ($query) => $query->latest()->limit(1),
                'payments' => fn ($query) => $query->latest()->limit(10),
            ])
            ->where('seller_user_id', $user?->id)
            ->latest()
            ->limit(120)
            ->get();

        return response()->json([
            'orders' => $orders,
        ]);
    }

    public function updateShippingStatus(Request $request, Order $order, OrderLifecycleService $lifecycle): JsonResponse
    {
        $this->authorize('updateShipping', $order);

        $validated = $request->validate([
            'status' => ['required', 'in:pending,packed,shipped,in_transit,delivered,failed,cancelled'],
            'shipping_method' => ['nullable', 'string', 'max:30'],
            'carrier' => ['nullable', 'string', 'max:80'],
            'service_level' => ['nullable', 'string', 'max:80'],
            'tracking_number' => ['nullable', 'string', 'max:120'],
            'estimated_delivery_at' => ['nullable', 'date'],
            'delivered_at' => ['nullable', 'date'],
            'shipped_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:3000'],
            'shipping_snapshot' => ['nullable', 'array'],
            'shipping_label_path' => ['nullable', 'string', 'max:255'],
            'proof_of_delivery_path' => ['nullable', 'string', 'max:255'],
        ]);

        $updatedOrder = $lifecycle->updateShippingStatus($order, $request->user(), $validated);

        return response()->json([
            'message' => 'Shipping status updated successfully.',
            'order' => $updatedOrder,
        ]);
    }

    public function capturePayment(Request $request, Order $order, OrderLifecycleService $lifecycle): JsonResponse
    {
        $this->authorize('capturePayment', $order);

        $validated = $request->validate([
            'method' => ['required', 'string', 'max:40'],
            'provider' => ['nullable', 'string', 'max:80'],
            'provider_reference' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'in:pending,paid,failed,refunded,partially_refunded'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'failure_reason' => ['nullable', 'string', 'max:255'],
            'metadata' => ['nullable', 'array'],
            'payer_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'payee_user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $payment = $lifecycle->capturePaymentRecord($order, $request->user(), $validated);

        return response()->json([
            'message' => 'Payment record captured successfully.',
            'payment' => $payment,
            'order' => $order->fresh(),
        ]);
    }

    public function paymentHistory(Request $request): JsonResponse
    {
        $user = $request->user();

        $payments = OrderPayment::query()
            ->with(['order.auction', 'order.buyer', 'order.seller', 'payer', 'payee'])
            ->whereHas('order', fn ($query) => $query->where('seller_user_id', $user?->id))
            ->latest()
            ->limit(150)
            ->get();

        return response()->json([
            'payments' => $payments,
        ]);
    }
}
