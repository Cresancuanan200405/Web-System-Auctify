#!/usr/bin/env sh
set -eu

cd /var/www/html

if [ -z "${APP_KEY:-}" ]; then
    echo "APP_KEY is required. Set it in Render environment variables."
    exit 1
fi

if [ -n "${DB_URL:-}" ]; then
    echo "Boot config: DB_URL detected and ignored in favor of DB_HOST/DB_PORT/DB_USERNAME"
    unset DB_URL
fi

# Compatibility fallback for stale Render env values that still point to direct
# Supabase host (IPv6-only on some paths). Force IPv4-friendly pooler settings.
if [ "${DB_HOST:-}" = "db.zakjudasfkoahkupdnju.supabase.co" ]; then
    echo "Boot config: rewriting DB_HOST from direct endpoint to session pooler"
    export DB_HOST="aws-0-ap-southeast-1.pooler.supabase.com"
    export DB_PORT="5432"

    if [ "${DB_USERNAME:-}" = "auctifyapp" ]; then
        export DB_USERNAME="auctifyapp.zakjudasfkoahkupdnju"
    fi
fi

echo "Boot config: DB_HOST=${DB_HOST:-unset} DB_PORT=${DB_PORT:-unset} DB_USERNAME=${DB_USERNAME:-unset}"

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    php artisan migrate --force
fi

php artisan storage:link >/dev/null 2>&1 || true
php artisan config:cache

exec php artisan serve --host=0.0.0.0 --port="${PORT:-10000}"