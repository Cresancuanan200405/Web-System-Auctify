# Deploy Auctify to Render with Supabase (Docker)

This repository is now prepared for Docker-based deployment on Render with a Supabase Postgres database.

## What is already prepared

- Docker image build and runtime startup: Dockerfile
- Render startup script: docker/render-start.sh
- Render blueprint configuration: render.yaml
- Production env template: .env.render.example

## Supabase setup

1. Supabase project has been created: auctify-prod.
2. Project reference: zakjudasfkoahkupdnju.
3. Host to use on Render: aws-0-ap-southeast-1.pooler.supabase.com.
4. Port: 5432.
5. Database: postgres.
6. Username: postgres.zakjudasfkoahkupdnju.
7. Set DB_PASSWORD in Render to your Supabase database password (from Dashboard -> Project Settings -> Database).
8. Use sslmode=require.

## Supabase Storage setup (required for media persistence)

1. In Supabase, go to Storage and create a bucket named media.
2. Set the media bucket visibility to Public.
3. In Supabase, copy Project URL and Service Role key from Project Settings -> API.
4. In Render environment variables, set:
  - SUPABASE_URL=https://your-project-ref.supabase.co
  - SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  - SUPABASE_STORAGE_ENABLED=true
  - SUPABASE_STORAGE_BUCKET=media
5. Redeploy Render service after setting these variables.

## Render setup

1. In Render, create a new Web Service from this GitHub repository.
2. Choose Docker runtime.
3. Render will detect Dockerfile automatically.
4. Set environment variables from .env.render.example.
5. Set APP_URL to your Render public URL.
6. Set SANCTUM_STATEFUL_DOMAINS and CORS_ALLOWED_ORIGINS to your deployed domain.
7. Keep RUN_MIGRATIONS=true for first deploy to auto-run migrations.

## First deploy checks

1. Confirm the service health check path / returns 200.
2. Confirm migrations succeeded in logs.
3. Visit /api/auth/wallet after login to verify database-backed wallet calls.
4. Test seller/admin and wallet top-up flows.

## Notes

- This setup uses a single web container running php artisan serve.
- For higher traffic, move to php-fpm + nginx and add dedicated worker services.
- If you use queued jobs heavily, add a Render Worker service with command:
  php artisan queue:work --sleep=3 --tries=3