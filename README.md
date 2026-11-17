# React Laravel CMS

A headless CMS with a Laravel API backend and a React + TypeScript frontend.

## Stack

- Backend: PHP 8.3+, Laravel 13, Laravel Sanctum.
- Frontend: React, TypeScript, Vite, Tiptap.
- Database: SQLite for local development by default; MySQL/MariaDB can be configured in `backend/.env`.

## First-time setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `APP_URL`, database settings, and the initial administrator credentials:
   - `CMS_ADMIN_NAME`
   - `CMS_ADMIN_EMAIL`
   - `CMS_ADMIN_PASSWORD` (minimum 12 characters)
3. From `backend/`, run:

   ```sh
   composer install
   php artisan key:generate
   php artisan migrate --seed
   npm ci
   npm run build
   ```

4. From `frontend/`, set `VITE_API_BASE_URL` in `.env`, then run:

   ```sh
   npm ci
   npm run build
   ```

The database seeder always creates or updates the standard CMS roles. It creates the first administrator only when all three `CMS_ADMIN_*` values are configured. It never assigns the administrator role to an existing account or resets an existing account's password. If the credentials are omitted, no administrator is created; configure them and run `php artisan db:seed` before signing in.

After provisioning the first administrator, remove `CMS_ADMIN_PASSWORD` from the runtime environment. Keep `.env` private and set `APP_DEBUG=false` in production. Serve the application over HTTPS.
