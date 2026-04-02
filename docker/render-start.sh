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

    if [ "${DB_USERNAME:-}" = "auctifyapp" ] || [ "${DB_USERNAME:-}" = "auctifyapp.zakjudasfkoahkupdnju" ]; then
        export DB_USERNAME="postgres.zakjudasfkoahkupdnju"
    fi
fi

try_db_connection() {
    DB_HOST_TRY="$1" DB_PORT_TRY="$2" DB_USER_TRY="$3" DB_PASS_TRY="$4" DB_NAME_TRY="$5" DB_SSLMODE_TRY="$6" \
    php -r '$host=getenv("DB_HOST_TRY");$port=getenv("DB_PORT_TRY");$user=getenv("DB_USER_TRY");$pass=getenv("DB_PASS_TRY");$db=getenv("DB_NAME_TRY");$ssl=getenv("DB_SSLMODE_TRY")?:"require";try{$pdo=new PDO("pgsql:host={$host};port={$port};dbname={$db};sslmode={$ssl}",$user,$pass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);$pdo->query("select 1");exit(0);}catch(Throwable $e){fwrite(STDERR,$e->getMessage());exit(1);}';
}

# Supabase pooler can vary by host shard, mode, and username format.
# Probe safe combinations and pick the first working one.
if [ -n "${DB_PASSWORD:-}" ]; then
    DB_PROJECT_REF="zakjudasfkoahkupdnju"
    DB_REGION="ap-southeast-1"
    DB_NAME_CANDIDATE="${DB_DATABASE:-postgres}"
    DB_SSLMODE_CANDIDATE="${DB_SSLMODE:-require}"

    DEFAULT_HOST="${DB_HOST:-aws-0-${DB_REGION}.pooler.supabase.com}"
    HOSTS_TO_TRY="${DEFAULT_HOST} aws-0-${DB_REGION}.pooler.supabase.com aws-1-${DB_REGION}.pooler.supabase.com aws-2-${DB_REGION}.pooler.supabase.com"

    USERS_TO_TRY="${DB_USERNAME:-} postgres.${DB_PROJECT_REF} postgres auctifyapp.${DB_PROJECT_REF} auctifyapp"
    PORTS_TO_TRY="${DB_PORT:-5432} 5432 6543"

    SELECTED_HOST=""
    SELECTED_USER=""
    SELECTED_PORT=""

    for host_candidate in $HOSTS_TO_TRY; do
        for port_candidate in $PORTS_TO_TRY; do
            for user_candidate in $USERS_TO_TRY; do
                if [ -z "${user_candidate}" ]; then
                    continue
                fi

                if try_db_connection "${host_candidate}" "${port_candidate}" "${user_candidate}" "${DB_PASSWORD}" "${DB_NAME_CANDIDATE}" "${DB_SSLMODE_CANDIDATE}" >/dev/null 2>&1; then
                    SELECTED_HOST="${host_candidate}"
                    SELECTED_USER="${user_candidate}"
                    SELECTED_PORT="${port_candidate}"
                    break
                fi
            done

            if [ -n "${SELECTED_USER}" ]; then
                break
            fi
        done

        if [ -n "${SELECTED_USER}" ]; then
            break
        fi
    done

    if [ -n "${SELECTED_USER}" ]; then
        export DB_HOST="${SELECTED_HOST}"
        export DB_USERNAME="${SELECTED_USER}"
        export DB_PORT="${SELECTED_PORT}"
        echo "Boot config: selected working Supabase pooler host/user/port"
    else
        echo "Boot config: no Supabase pooler host/user/port combination succeeded"
    fi
fi

echo "Boot config: DB_HOST=${DB_HOST:-unset} DB_PORT=${DB_PORT:-unset} DB_USERNAME=${DB_USERNAME:-unset}"

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    php artisan migrate --force
fi

php artisan storage:link >/dev/null 2>&1 || true
php artisan config:cache

exec php artisan serve --host=0.0.0.0 --port="${PORT:-10000}"