# Hosted demo

Type: Applied. How to point hybrid clients (Cloudflare Pages, Vercel, or any other origin) at a public API and refresh the demo data.

The API is the public origin. Admin and storefront are separate sites. They call this API with credentialed CORS. They do not share a parent domain, so the refresh cookie cannot stay `SameSite=Strict`.

## Public URL and cookies

- Set `PUBLIC_BASE_URL` to the https origin browsers use to reach the API (for example `https://api.example.com`). Staging and production already reject plain `http` except on loopback. Demo image URLs are built from this origin.
- Set `AUTH_COOKIE_SAMESITE=none` so Pages or Vercel pages can send the refresh cookie. Boot fails unless `PUBLIC_BASE_URL` is `https`, and the cookie is always `Secure` and `HttpOnly`. The path stays `/v1/authentication`.
- Leave `AUTH_COOKIE_SAMESITE=strict` (the default) for local http development.
- Set `CORS_ALLOWED_ORIGINS` to the exact UI origins, comma-separated, for example `https://admin.example.com,https://shop.example.com`. Credentials are enabled. Do not use `*`.

## Demo reset

`POST /v1/admin/demo/reset` is an **ops** surface under `src/infrastructure/demo/` (same tier as health/platform; not a domain bounded context). See [ADR-0009](../architecture/adr/ADR-0009-demo-reset-ops-infrastructure.md). It reconciles demo data for a scheduled job (GitHub Actions or similar). It is off unless both of these are set on the host:

- `DEMO_RESET_ENABLED=true`
- `DEMO_RESET_TOKEN` at least 32 characters. Generate a high-entropy secret on the host. Never commit the real value. `.env.example` leaves it empty.

The cron sends header `X-Demo-Reset-Token`. There is no user JWT. Missing and wrong tokens both return 401 with the same body. When the flag is false the route returns 404.

On success the handler runs the same pipeline as `npm run db:seed`:

- Demo account passwords return to the values in [SEEDING.md](../development/SEEDING.md) (`superadmin@store.local`, `admin@store.local`, `customer@store.local`).
- Categories and products are upserted.
- Demo SKU stock is reset to catalog baselines, then the four fixture orders are applied again. Shopper checkouts do not keep reducing that baseline.
- Shopper-created accounts and orders are not deleted. `npm run db:seed` stays non-destructive in that same way, and it still refuses `NODE_ENV=production`. The HTTP route is the opt-in for a hosted demo that runs with production mode.

The route is limited to 5 requests per minute and rejects a second in-process reset with 409 while one is running. The single-flight lock is per process (this demo is a single instance). Logs use the event names `demo_reset_succeeded`, `demo_reset_failed`, and `demo_reset_rejected` and do not include the token.

If the process stops halfway through a reset, run it again. Upserts and the stock rebuild are safe to repeat. The seed writes local payment rows only; it does not call a payment gateway.
