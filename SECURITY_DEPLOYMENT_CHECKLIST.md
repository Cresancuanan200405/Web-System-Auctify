# Security Deployment Checklist

This repository now enforces stronger application-level controls, but deployment still needs explicit production setup.

## Before Go-Live

1. Set `APP_ENV=production` and `APP_DEBUG=false`.
2. Force HTTPS at the reverse proxy and set `SESSION_SECURE_COOKIE=true`.
3. Set a real `SESSION_DOMAIN` and `SANCTUM_STATEFUL_DOMAINS` for your production hostnames.
4. Set a non-empty `SANCTUM_EXPIRATION` value.
5. Set `CORS_ALLOWED_ORIGINS` to the exact frontend origins that are allowed to send credentialed requests.
6. If frontend and API are on different sites, review `SESSION_SAME_SITE` and use `none` only together with secure cookies over HTTPS.
7. After deploying config changes, run `php artisan config:clear` or rebuild config cache so Sanctum/CORS settings actually take effect.
8. Provide `SEED_ADMIN_PASSWORD` only for one-time provisioning, then rotate it immediately.
9. Remove any development mailers, debug services, and local callback URLs from production config.

## Admin Access

1. Keep admin access on same-origin or same-site domains so Sanctum cookie auth remains protected.
2. Add MFA for every admin account before public launch.
3. Set `ADMIN_TRUSTED_IPS` or enforce admin access at the network layer with VPN, IP allowlist, or an identity-aware proxy.
4. Review the `admin_user_actions` table regularly or export it to centralized logging.
5. Collect and monitor `storage/logs/security-*.log` for admin login failures, MFA failures, and access-denied events.

## Storage And Uploads

1. Keep public uploads on non-executable storage.
2. Prefer private buckets plus signed delivery URLs for sensitive documents.
3. Scan uploaded files with your hosting provider or an AV service if available.
4. Back up both the database and uploaded media on a schedule.

## Infrastructure

1. Run the database on a private network and use least-privilege credentials.
2. Enable automated backups and test restore procedures.
3. Put the app behind a firewall or WAF if your platform supports it.
4. Turn on uptime monitoring, error monitoring, and alerting for auth failures and 5xx spikes.
5. Keep Composer, npm, PHP, Node, and OS packages patched.

## Verification After Deploy

1. Confirm admin login works with cookies and no bearer token is stored in browser storage.
2. Confirm rate limits return 429 responses on repeated login, OTP, upload, bid, and messaging abuse.
3. Confirm CSP and security headers are present in production responses.
4. Confirm sessions expire as expected and admin logout clears the session.