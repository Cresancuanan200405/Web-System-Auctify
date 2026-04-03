<?php

namespace App\Policies;

use App\Models\BidWinner;
use App\Models\Order;
use App\Models\User;

class OrderPolicy
{
    public function before(User $user, string $ability): bool|null
    {
        return $user->is_admin ? true : null;
    }

    public function viewAny(User $user): bool
    {
        return $user->is_admin;
    }

    public function view(User $user, Order $order): bool
    {
        return $user->id === $order->buyer_user_id || $user->id === $order->seller_user_id;
    }

    public function create(User $user, BidWinner $winner): bool
    {
        return $user->id === $winner->winner_user_id;
    }

    public function updateShipping(User $user, Order $order): bool
    {
        return $user->id === $order->seller_user_id;
    }

    public function capturePayment(User $user, Order $order): bool
    {
        return $user->id === $order->buyer_user_id || $user->id === $order->seller_user_id;
    }
}
