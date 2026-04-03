<?php

namespace App\Providers;

use App\Models\Order;
use App\Models\OrderPayment;
use App\Policies\OrderPaymentPolicy;
use App\Policies\OrderPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        Order::class => OrderPolicy::class,
        OrderPayment::class => OrderPaymentPolicy::class,
    ];

    public function boot(): void
    {
        $this->registerPolicies();

        Gate::before(function ($user) {
            return $user->is_admin ? true : null;
        });
    }
}
