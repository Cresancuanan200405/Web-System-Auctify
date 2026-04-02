#!/usr/bin/env sh
set -eu

cd /var/www/html

if [ -z "${APP_KEY:-}" ]; then
    echo "APP_KEY is required. Set it in Render environment variables."
    exit 1
fi

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    php artisan migrate --force
fi

php artisan storage:link >/dev/null 2>&1 || true
php artisan config:cache

exec php artisan serve --host=0.0.0.0 --port="${PORT:-10000}"