<?php

namespace App\Services\Orders;

use App\Models\Address;
use App\Models\BidWinner;
use App\Models\Order;
use App\Models\OrderPayment;
use App\Models\OrderShipment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderLifecycleService
{
    public function createOrderFromBidWinner(User $actor, BidWinner $winner, array $payload): Order
    {
        if ($winner->winner_user_id !== $actor->id && ! $actor->is_admin) {
            throw ValidationException::withMessages([
                'bid_winner_id' => 'You are not allowed to create an order for this bid winner.',
            ]);
        }

        $existing = Order::query()
            ->where('bid_winner_id', $winner->id)
            ->first();

        if ($existing) {
            return $this->loadOrderGraph($existing);
        }

        $addressId = $payload['shipping_address_id'] ?? null;
        $shippingAddress = null;

        if ($addressId) {
            $shippingAddress = Address::query()
                ->where('id', $addressId)
                ->where('user_id', $winner->winner_user_id)
                ->first();

            if (! $shippingAddress) {
                throw ValidationException::withMessages([
                    'shipping_address_id' => 'The selected shipping address is invalid for this buyer.',
                ]);
            }
        }

        $subtotal = round((float) ($payload['subtotal_amount'] ?? $winner->winning_amount), 2);
        $shippingFee = round((float) ($payload['shipping_fee'] ?? 0), 2);
        $serviceFee = round((float) ($payload['service_fee'] ?? 0), 2);
        $total = round((float) ($payload['total_amount'] ?? ($subtotal + $shippingFee + $serviceFee)), 2);

        return DB::transaction(function () use ($actor, $winner, $shippingAddress, $subtotal, $shippingFee, $serviceFee, $total, $payload): Order {
            $order = Order::query()->create([
                'bid_winner_id' => $winner->id,
                'auction_id' => $winner->auction_id,
                'buyer_user_id' => $winner->winner_user_id,
                'seller_user_id' => $winner->seller_user_id,
                'shipping_address_id' => $shippingAddress?->id,
                'subtotal_amount' => $subtotal,
                'shipping_fee' => $shippingFee,
                'service_fee' => $serviceFee,
                'total_amount' => $total,
                'currency' => 'PHP',
                'status' => 'pending_confirmation',
                'payment_status' => 'pending',
                'shipping_status' => 'pending',
                'placed_at' => now(),
                'meta' => $payload['meta'] ?? null,
            ]);

            $order->forceFill([
                'order_number' => $this->generateOrderNumber($order),
            ])->save();

            if (($payload['capture_payment'] ?? false) && isset($payload['payment']) && is_array($payload['payment'])) {
                $this->capturePaymentRecord($order, $actor, $payload['payment']);
            }

            return $this->loadOrderGraph($order);
        });
    }

    public function updateShippingStatus(Order $order, User $actor, array $payload): Order
    {
        if ($order->seller_user_id !== $actor->id && ! $actor->is_admin) {
            throw ValidationException::withMessages([
                'order_id' => 'You are not allowed to update shipping for this order.',
            ]);
        }

        $status = (string) $payload['status'];

        OrderShipment::query()->create([
            'order_id' => $order->id,
            'shipped_by_user_id' => $actor->id,
            'shipping_method' => $payload['shipping_method'] ?? 'standard',
            'carrier' => $payload['carrier'] ?? null,
            'service_level' => $payload['service_level'] ?? null,
            'tracking_number' => $payload['tracking_number'] ?? null,
            'status' => $status,
            'shipped_at' => in_array($status, ['shipped', 'in_transit', 'delivered'], true)
                ? ($payload['shipped_at'] ?? now())
                : null,
            'estimated_delivery_at' => $payload['estimated_delivery_at'] ?? null,
            'delivered_at' => $status === 'delivered'
                ? ($payload['delivered_at'] ?? now())
                : null,
            'failed_at' => in_array($status, ['failed', 'cancelled'], true)
                ? now()
                : null,
            'notes' => $payload['notes'] ?? null,
            'shipping_snapshot' => $payload['shipping_snapshot'] ?? null,
            'shipping_label_path' => $payload['shipping_label_path'] ?? null,
            'proof_of_delivery_path' => $payload['proof_of_delivery_path'] ?? null,
        ]);

        $updates = [
            'shipping_status' => $status,
        ];

        if (in_array($status, ['packed', 'shipped', 'in_transit'], true)) {
            $updates['status'] = 'processing';
            $updates['confirmed_at'] = $order->confirmed_at ?: now();
        }

        if ($status === 'delivered') {
            $updates['status'] = 'completed';
            $updates['completed_at'] = $payload['delivered_at'] ?? now();
        }

        if (in_array($status, ['failed', 'cancelled'], true)) {
            $updates['status'] = 'cancelled';
            $updates['cancelled_at'] = now();
            $updates['cancellation_reason'] = $payload['notes'] ?? $order->cancellation_reason;
        }

        $order->forceFill($updates)->save();

        return $this->loadOrderGraph($order->fresh());
    }

    public function capturePaymentRecord(Order $order, User $actor, array $payload): OrderPayment
    {
        $isAllowed = $actor->is_admin
            || $order->buyer_user_id === $actor->id
            || $order->seller_user_id === $actor->id;

        if (! $isAllowed) {
            throw ValidationException::withMessages([
                'order_id' => 'You are not allowed to capture payment for this order.',
            ]);
        }

        $amount = round((float) ($payload['amount'] ?? $order->total_amount), 2);
        $status = (string) ($payload['status'] ?? 'paid');

        $payment = OrderPayment::query()->create([
            'order_id' => $order->id,
            'payer_user_id' => (int) ($payload['payer_user_id'] ?? $order->buyer_user_id),
            'payee_user_id' => (int) ($payload['payee_user_id'] ?? $order->seller_user_id),
            'method' => (string) ($payload['method'] ?? 'manual'),
            'provider' => $payload['provider'] ?? null,
            'provider_reference' => $payload['provider_reference'] ?? null,
            'status' => $status,
            'amount' => $amount,
            'currency' => (string) ($payload['currency'] ?? $order->currency ?? 'PHP'),
            'paid_at' => $status === 'paid' ? ($payload['paid_at'] ?? now()) : null,
            'failed_at' => $status === 'failed' ? now() : null,
            'failure_reason' => $payload['failure_reason'] ?? null,
            'metadata' => $payload['metadata'] ?? null,
        ]);

        $orderUpdates = [
            'payment_status' => $status,
        ];

        if ($status === 'paid' && $order->status === 'pending_confirmation') {
            $orderUpdates['status'] = 'processing';
            $orderUpdates['confirmed_at'] = now();
        }

        if ($status === 'failed') {
            $orderUpdates['status'] = 'pending_confirmation';
        }

        $order->forceFill($orderUpdates)->save();

        return $payment;
    }

    private function loadOrderGraph(Order $order): Order
    {
        return $order->load([
            'auction.media',
            'buyer',
            'seller',
            'shippingAddress',
            'shipments' => fn ($query) => $query->latest()->limit(1),
            'payments' => fn ($query) => $query->latest()->limit(10),
        ]);
    }

    private function generateOrderNumber(Order $order): string
    {
        return sprintf('AUCT-%s-%06d', now()->format('Ymd'), $order->id);
    }
}
