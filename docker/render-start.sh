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

schema_has_users_table() {
    php -r '$host=getenv("DB_HOST");$port=getenv("DB_PORT")?:"5432";$user=getenv("DB_USERNAME");$pass=getenv("DB_PASSWORD")?:"";$db=getenv("DB_DATABASE")?:"postgres";$ssl=getenv("DB_SSLMODE")?:"require";try{$pdo=new PDO("pgsql:host={$host};port={$port};dbname={$db};sslmode={$ssl}",$user,$pass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);$stmt=$pdo->query("select to_regclass(\x27public.users\x27)");$val=$stmt?$stmt->fetchColumn():null;exit($val?0:1);}catch(Throwable $e){fwrite(STDERR,$e->getMessage());exit(1);}';
}

schema_has_migrations_table() {
    php -r '$host=getenv("DB_HOST");$port=getenv("DB_PORT")?:"5432";$user=getenv("DB_USERNAME");$pass=getenv("DB_PASSWORD")?:"";$db=getenv("DB_DATABASE")?:"postgres";$ssl=getenv("DB_SSLMODE")?:"require";try{$pdo=new PDO("pgsql:host={$host};port={$port};dbname={$db};sslmode={$ssl}",$user,$pass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);$stmt=$pdo->query("select to_regclass(\x27public.migrations\x27)");$val=$stmt?$stmt->fetchColumn():null;exit($val?0:1);}catch(Throwable $e){fwrite(STDERR,$e->getMessage());exit(1);}';
}

backfill_all_local_migration_rows() {
    php -r '$host=getenv("DB_HOST");$port=getenv("DB_PORT")?:"5432";$user=getenv("DB_USERNAME");$pass=getenv("DB_PASSWORD")?:"";$db=getenv("DB_DATABASE")?:"postgres";$ssl=getenv("DB_SSLMODE")?:"require";try{$pdo=new PDO("pgsql:host={$host};port={$port};dbname={$db};sslmode={$ssl}",$user,$pass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);$files=glob("/var/www/html/database/migrations/*.php")?:[];sort($files);$batch=((int)$pdo->query("select coalesce(max(batch), 0) from migrations")->fetchColumn())+1;$migrationExists=$pdo->prepare("select count(*) from migrations where migration = ?");$insert=$pdo->prepare("insert into migrations (migration, batch) values (?, ?)");$inserted=0;foreach($files as $file){$migration=pathinfo($file, PATHINFO_FILENAME);$migrationExists->execute([$migration]);$already=(int)$migrationExists->fetchColumn()>0;if($already){continue;}$insert->execute([$migration,$batch]);$inserted++;}fwrite(STDOUT,"Boot config: backfilled {$inserted} local migration row(s)\n");exit(0);}catch(Throwable $e){fwrite(STDERR,$e->getMessage());exit(1);}';
}

ensure_bid_winner_wallet_columns() {
    php -r '$host=getenv("DB_HOST");$port=getenv("DB_PORT")?:"5432";$user=getenv("DB_USERNAME");$pass=getenv("DB_PASSWORD")?:"";$db=getenv("DB_DATABASE")?:"postgres";$ssl=getenv("DB_SSLMODE")?:"require";try{$pdo=new PDO("pgsql:host={$host};port={$port};dbname={$db};sslmode={$ssl}",$user,$pass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);$pdo->exec("alter table if exists public.bid_winners add column if not exists wallet_deducted_at timestamp null");$pdo->exec("alter table if exists public.bid_winners add column if not exists wallet_deduction_failed_at timestamp null");$pdo->exec("alter table if exists public.bid_winners add column if not exists wallet_deduction_failure_reason varchar(255) null");$pdo->exec("create index if not exists bid_winners_wallet_deducted_at_index on public.bid_winners(wallet_deducted_at)");$pdo->exec("create index if not exists bid_winners_wallet_deduction_failed_at_index on public.bid_winners(wallet_deduction_failed_at)");exit(0);}catch(Throwable $e){fwrite(STDERR,$e->getMessage());exit(1);}';
}

ensure_wallet_reservations_table() {
    php -r '$host=getenv("DB_HOST");$port=getenv("DB_PORT")?:"5432";$user=getenv("DB_USERNAME");$pass=getenv("DB_PASSWORD")?:"";$db=getenv("DB_DATABASE")?:"postgres";$ssl=getenv("DB_SSLMODE")?:"require";try{$pdo=new PDO("pgsql:host={$host};port={$port};dbname={$db};sslmode={$ssl}",$user,$pass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);$pdo->exec("create table if not exists public.wallet_reservations (id bigserial primary key, user_id bigint not null references public.users(id) on delete cascade, auction_id bigint not null references public.auctions(id) on delete cascade, bid_id bigint null references public.bids(id) on delete set null, amount numeric(12,2) not null, status varchar(20) not null default $$active$$, reserved_at timestamp null, released_at timestamp null, consumed_at timestamp null, release_reason varchar(255) null, meta jsonb null, created_at timestamp null, updated_at timestamp null)");$pdo->exec("create unique index if not exists wallet_reservations_auction_id_unique on public.wallet_reservations(auction_id)");$pdo->exec("create index if not exists wallet_reservations_user_id_status_index on public.wallet_reservations(user_id, status)");$pdo->exec("create index if not exists wallet_reservations_auction_id_status_index on public.wallet_reservations(auction_id, status)");$pdo->exec("create index if not exists wallet_reservations_reserved_at_index on public.wallet_reservations(reserved_at)");$pdo->exec("create index if not exists wallet_reservations_released_at_index on public.wallet_reservations(released_at)");$pdo->exec("create index if not exists wallet_reservations_consumed_at_index on public.wallet_reservations(consumed_at)");exit(0);}catch(Throwable $e){fwrite(STDERR,$e->getMessage());exit(1);}';
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
    # On environments where schema was restored outside Laravel migrations,
    # rerunning bootstrap migrations causes duplicate-table deploy failures.
    if [ "${SKIP_MIGRATIONS_IF_SCHEMA_PRESENT:-true}" = "true" ] && schema_has_users_table >/dev/null 2>&1; then
        if schema_has_migrations_table >/dev/null 2>&1; then
            echo "Boot config: schema exists and migrations table present; backfilling local migration history and skipping replay"
            if backfill_all_local_migration_rows; then
                echo "Boot config: local migration history reconciled; skipping php artisan migrate for restored schema"
            else
                echo "Boot config: migration history reconciliation failed; skipping replay to avoid duplicate-table crash"
            fi
        else
            echo "Boot config: users table exists without migrations history; skipping auto migrations"
            echo "Boot config: applying safe additive schema patch for bid winner wallet deduction fields"
            ensure_bid_winner_wallet_columns || true
            echo "Boot config: ensuring wallet reservations table exists for bidding holds"
            ensure_wallet_reservations_table || true
        fi
    else
        php artisan migrate --force
    fi
fi

if [ "${RUN_SEEDERS:-true}" = "true" ]; then
    php artisan db:seed --force
fi

if [ "${RUN_AUCTION_SETTLEMENT_AT_BOOT:-true}" = "true" ]; then
    php artisan auctions:settle-winners --limit=500 || true
fi

if [ "${RUN_SCHEDULER_WORKER:-true}" = "true" ]; then
    echo "Boot config: starting scheduler worker"
    php artisan schedule:work >/dev/null 2>&1 &
fi

php artisan storage:link >/dev/null 2>&1 || true
php artisan config:cache

exec php artisan serve --host=0.0.0.0 --port="${PORT:-10000}"