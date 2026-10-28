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

- The hosted demo has a single seeded account: the viewer (`ADMIN_READONLY`, from `DEMO_VIEWER_*`). The seed does not create or update writable local operators, and it creates no demo customer, cart, orders, or payments (`DEMO_CUSTOMER_*` is ignored). Catalog and inventory are still seeded. The seed fails, without touching credentials, if an existing account at `DEMO_VIEWER_EMAIL` does not have `ADMIN_READONLY`. See [SEEDING.md](../development/SEEDING.md).
- The viewer cannot change its password: change-password returns 403 for `ADMIN_READONLY`, so the published login keeps working for every visitor.
- Public admin visitors use the viewer account: `access_admin`, `view_all_products`, `view_all_orders`, `view_all_inventory`, no `manage_*`. It has no `view_all_users` or `view_all_payments`, so the users and payments pages (and the payments analytics chart) stay hidden from public visitors who may have registered their own accounts. The admin SPA and `PermissionsGuard` enforce that the same way as Admin vs `manage_roles`.
- Storefront visitors **register** with their own credentials; there is no seeded shop login.
- The viewer sees no customer personal data: order and payment responses mask it unless the caller owns the record or holds the `view_customer_pii` permission (`ADMIN` and `SUPER_ADMIN` have it, `ADMIN_READONLY` does not). The customer name shows as `Customer #<user id>`, the email as a placeholder such as `j***@***.com`, and the shipping address (with the recipient phone) as `null`. List filters on customer data return 403 without it. Order numbers, items, totals, statuses, payment status, and dates stay visible.
- The hosted demo is a click-through test environment, not production. Tell visitors not to enter real data. For the full experience (writable admin, seeded customer, cart, and orders), run it locally with `DEMO_READ_ONLY=false`.
- Private writable owner (optional): set `ADMIN_EMAIL` / `ADMIN_PASSWORD` once on the VM so boot creates a Super Admin, change the password on first login, then clear or rotate the env secret. See [ADMIN-BOOTSTRAP.md](../security/ADMIN-BOOTSTRAP.md). Do not publish that account in the README.
- If the database volume was previously seeded with local writable demo accounts, wipe it or use a fresh volume before enabling `DEMO_READ_ONLY`.
- Pair with a scheduled demo reset below so catalog baselines heal; shopper-created accounts are not deleted.

## Demo reset

`POST /v1/admin/demo/reset` is an **ops** surface under `src/infrastructure/demo/` (same tier as health/platform; not a domain bounded context). See [ADR-0009](../architecture/adr/ADR-0009-demo-reset-ops-infrastructure.md). It reconciles demo data for a scheduled job (GitHub Actions or similar). It is off unless both of these are set on the host:

- `DEMO_RESET_ENABLED=true`
- `DEMO_RESET_TOKEN` at least 32 characters. Generate a high-entropy secret on the host. Never commit the real value. `.env.example` leaves it empty.

The cron sends header `X-Demo-Reset-Token`. There is no user JWT. Missing and wrong tokens both return 401 with the same body. When the flag is false the route returns 404.

On success the handler runs the same pipeline as `npm run db:seed`:

- Demo accounts match the mode and env credentials: with `DEMO_READ_ONLY=true`, the viewer only (see [SEEDING.md](../development/SEEDING.md)); with the flag false, the local writable trio.
- Categories and products are upserted.
- Demo SKU stock is reset to catalog baselines, then (with `DEMO_READ_ONLY=false` only) the four fixture orders are applied again. Shopper checkouts do not keep reducing that baseline.
- Shopper-created accounts and orders are not deleted. `npm run db:seed` stays non-destructive in that same way, and it still refuses `NODE_ENV=production`. The HTTP route is the opt-in for a hosted demo that runs with production mode.

The route is limited to 5 requests per minute and rejects a second in-process reset with 409 while one is running. The single-flight lock is per process (this demo is a single instance). Logs use the event names `demo_reset_succeeded`, `demo_reset_failed`, and `demo_reset_rejected` and do not include the token.

If the process stops halfway through a reset, run it again. Upserts and the stock rebuild are safe to repeat. The seed writes local payment rows only; it does not call a payment gateway.
