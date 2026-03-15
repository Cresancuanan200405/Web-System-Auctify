<?php

return [
    'stateful' => array_values(array_filter(array_map(
        static fn (string $value): string => trim($value),
        explode(',', env('SANCTUM_STATEFUL_DOMAINS', 'localhost,localhost:3000,localhost:5173,127.0.0.1,127.0.0.1:3000,127.0.0.1:5173'))
    ))),

    'guard' => ['web'],

    'expiration' => env('SANCTUM_EXPIRATION') !== null
        ? (int) env('SANCTUM_EXPIRATION')
        : (env('APP_ENV', 'production') === 'production' ? 480 : null),

    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

    'middleware' => [
        'authenticate_session' => Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
        'encrypt_cookies' => Illuminate\Cookie\Middleware\EncryptCookies::class,
        'validate_csrf_token' => Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
    ],
];
