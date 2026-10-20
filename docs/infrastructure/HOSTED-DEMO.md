# Hosted demo

Type: Applied. How to point hybrid clients (Cloudflare Pages, Vercel, or any other origin) at a public API and refresh the demo data.

The API is the public origin. Admin and storefront are separate sites. They call this API with credentialed CORS. They do not share a parent domain, so the refresh cookie cannot stay `SameSite=Strict`.

## Public URL and cookies

- Set `PUBLIC_BASE_URL` to the https origin browsers use to reach the API (for example `https://api.example.com`). Staging and production already reject plain `http` except on loopback. Demo image URLs are built from this origin.
- Set `AUTH_COOKIE_SAMESITE=none` so Pages or Vercel pages can send the refresh cookie. Boot fails unless `PUBLIC_BASE_URL` is `https`, and the cookie is always `Secure` and `HttpOnly`. The path stays `/v1/authentication`.
- Leave `AUTH_COOKIE_SAMESITE=strict` (the default) for local http development.
- Set `CORS_ALLOWED_ORIGINS` to the exact UI origins, comma-separated, for example `https://admin.example.com,https://shop.example.com`. Credentials are enabled. Do not use `*`.

## Shared demo accounts (RBAC)

For a **public** admin URL, set `DEMO_READ_ONLY=true` on the host (default is `false` for local Compose).

- Seed creates the viewer (`ADMIN_READONLY`, from `DEMO_VIEWER_*`) plus a silent fixture customer (from `DEMO_CUSTOMER_*`, for demo orders/cart only). It does not create or update writable local operators. See [SEEDING.md](../development/SEEDING.md).
- Public admin visitors use the viewer account: `access_admin` + `view_all_*`, no `manage_*`. The admin SPA and `PermissionsGuard` enforce that the same way as Admin vs `manage_roles`.
- Storefront visitors **register** with their own credentials. Do not publish the fixture customer as the shop login.
- Private writable owner (optional): set `ADMIN_EMAIL` / `ADMIN_PASSWORD` once on the VM so boot creates a Super Admin, change the password on first login, then clear or rotate the env secret. See [ADMIN-BOOTSTRAP.md](../security/ADMIN-BOOTSTRAP.md). Do not publish that account in the README.
- If the database volume was previously seeded with local writable demo accounts, wipe it or use a fresh volume before enabling `DEMO_READ_ONLY`.
- Pair with a scheduled demo reset below so catalog baselines heal; shopper-created accounts are not deleted.

## Demo reset

`POST /v1/admin/demo/reset` is an **ops** surface under `src/infrastructure/demo/` (same tier as health/platform; not a domain bounded context). See [ADR-0009](../architecture/adr/ADR-0009-demo-reset-ops-infrastructure.md). It reconciles demo data for a scheduled job (GitHub Actions or similar). It is off unless both of these are set on the host:

- `DEMO_RESET_ENABLED=true`
- `DEMO_RESET_TOKEN` at least 32 characters. Generate a high-entropy secret on the host. Never commit the real value. `.env.example` leaves it empty.

The cron sends header `X-Demo-Reset-Token`. There is no user JWT. Missing and wrong tokens both return 401 with the same body. When the flag is false the route returns 404.

On success the handler runs the same pipeline as `npm run db:seed`:

- Demo accounts match the mode and env credentials: with `DEMO_READ_ONLY=true`, viewer + silent fixture customer (see [SEEDING.md](../development/SEEDING.md)); with the flag false, the local writable trio.
- Categories and products are upserted.
- Demo SKU stock is reset to catalog baselines, then the four fixture orders are applied again. Shopper checkouts do not keep reducing that baseline.
- Shopper-created accounts and orders are not deleted. `npm run db:seed` stays non-destructive in that same way, and it still refuses `NODE_ENV=production`. The HTTP route is the opt-in for a hosted demo that runs with production mode.

The route is limited to 5 requests per minute and rejects a second in-process reset with 409 while one is running. The single-flight lock is per process (this demo is a single instance). Logs use the event names `demo_reset_succeeded`, `demo_reset_failed`, and `demo_reset_rejected` and do not include the token.

If the process stops halfway through a reset, run it again. Upserts and the stock rebuild are safe to repeat. The seed writes local payment rows only; it does not call a payment gateway.
