<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        RateLimiter::for('auth-login', function (Request $request) {
            return [
                Limit::perMinute(5)->by(strtolower((string) $request->input('email')).'|'.$request->ip()),
                Limit::perHour(25)->by($request->ip()),
            ];
        });

        RateLimiter::for('auth-register', function (Request $request) {
            return [
                Limit::perMinute(3)->by($request->ip()),
                Limit::perHour(10)->by($request->ip()),
            ];
        });

        RateLimiter::for('verification-otp-send', function (Request $request) {
            $key = ($request->user()?->id ?? 'guest').'|'.$request->ip();

            return [
                Limit::perMinute(3)->by($key),
                Limit::perHour(10)->by($key),
            ];
        });

        RateLimiter::for('verification-otp-confirm', function (Request $request) {
            $key = ($request->user()?->id ?? 'guest').'|'.$request->ip();

            return [
                Limit::perMinute(6)->by($key),
                Limit::perHour(20)->by($key),
            ];
        });

        RateLimiter::for('document-uploads', function (Request $request) {
            $key = ($request->user()?->id ?? 'guest').'|'.$request->ip();

            return [
                Limit::perMinute(6)->by($key),
                Limit::perHour(20)->by($key),
            ];
        });

        RateLimiter::for('bids', function (Request $request) {
            return Limit::perMinute(40)->by(($request->user()?->id ?? 'guest').'|'.$request->ip());
        });

        RateLimiter::for('messages', function (Request $request) {
            return Limit::perMinute(30)->by(($request->user()?->id ?? 'guest').'|'.$request->ip());
        });

        RateLimiter::for('admin-actions', function (Request $request) {
            return Limit::perMinute(180)->by(($request->user()?->id ?? 'guest').'|'.$request->ip());
        });

        RateLimiter::for('admin-uploads', function (Request $request) {
            return [
                Limit::perMinute(10)->by(($request->user()?->id ?? 'guest').'|'.$request->ip()),
                Limit::perHour(40)->by(($request->user()?->id ?? 'guest').'|'.$request->ip()),
            ];
        });

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null
        );
    }
}
