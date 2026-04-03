<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderPayment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderManagementController extends Controller
{
    public function shipments(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Order::class);

        $validated = $request->validate([
            'status' => ['nullable', 'string', 'max:30'],
            'search' => ['nullable', 'string', 'max:120'],
        ]);

        $statusFilter = strtolower(trim((string) ($validated['status'] ?? 'all')));
        $search = trim((string) ($validated['search'] ?? ''));

        $query = Order::query()
            ->with([
                'auction.media',
                'buyer',
                'seller',
                'shippingAddress',
                'shipments' => fn ($shipmentQuery) => $shipmentQuery->latest()->limit(1),
                'payments' => fn ($paymentQuery) => $paymentQuery->latest()->limit(1),
            ])
            ->latest();

        if ($statusFilter !== '' && $statusFilter !== 'all') {
            $query->where('shipping_status', $statusFilter);
        }

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder->where('order_number', 'like', '%' . $search . '%')
                    ->orWhereHas('auction', fn ($auctionQuery) => $auctionQuery->where('title', 'like', '%' . $search . '%'))
                    ->orWhereHas('buyer', fn ($buyerQuery) => $buyerQuery->where('name', 'like', '%' . $search . '%'))
                    ->orWhereHas('seller', fn ($sellerQuery) => $sellerQuery->where('name', 'like', '%' . $search . '%'));
            });
        }

        $orders = $query->limit(200)->get();

        return response()->json([
            'orders' => $orders,
        ]);
    }

    public function payments(Request $request): JsonResponse
    {
        $this->authorize('viewAny', OrderPayment::class);

        $validated = $request->validate([
            'status' => ['nullable', 'string', 'max:30'],
            'search' => ['nullable', 'string', 'max:120'],
            'method' => ['nullable', 'string', 'max:40'],
        ]);

        $statusFilter = strtolower(trim((string) ($validated['status'] ?? 'all')));
        $methodFilter = strtolower(trim((string) ($validated['method'] ?? 'all')));
        $search = trim((string) ($validated['search'] ?? ''));

        $query = OrderPayment::query()
            ->with(['order.auction', 'order.buyer', 'order.seller', 'payer', 'payee'])
            ->latest();

        if ($statusFilter !== '' && $statusFilter !== 'all') {
            $query->where('status', $statusFilter);
        }

        if ($methodFilter !== '' && $methodFilter !== 'all') {
            $query->where('method', $methodFilter);
        }

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder->where('provider_reference', 'like', '%' . $search . '%')
                    ->orWhereHas('order', fn ($orderQuery) => $orderQuery->where('order_number', 'like', '%' . $search . '%'))
                    ->orWhereHas('payer', fn ($payerQuery) => $payerQuery->where('name', 'like', '%' . $search . '%'))
                    ->orWhereHas('payee', fn ($payeeQuery) => $payeeQuery->where('name', 'like', '%' . $search . '%'));
            });
        }

        $payments = $query->limit(250)->get();

        return response()->json([
            'payments' => $payments,
        ]);
    }
}
