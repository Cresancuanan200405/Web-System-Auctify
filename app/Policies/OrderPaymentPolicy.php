<?php

namespace App\Policies;

use App\Models\OrderPayment;
use App\Models\User;

class OrderPaymentPolicy
{
    public function before(User $user, string $ability): bool|null
    {
        return $user->is_admin ? true : null;
    }

    public function viewAny(User $user): bool
    {
        return $user->is_admin;
    }

    public function view(User $user, OrderPayment $payment): bool
    {
        return $user->id === $payment->payer_user_id || $user->id === $payment->payee_user_id;
    }

    public function create(User $user, OrderPayment $payment): bool
    {
        return $user->id === $payment->payer_user_id || $user->id === $payment->payee_user_id;
    }
}
