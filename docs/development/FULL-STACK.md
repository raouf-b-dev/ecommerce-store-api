# Full-Stack Local Setup

Type: Applied. How to run this API together with the operator dashboard and the storefront on one machine, without port clashes.

The API owns the contract. Both clients consume it through typed clients generated from its OpenAPI document, and they never depend on each other. Start the API first.

---

## 1. Clone order

1. [`ecommerce-store-api`](https://github.com/raouf-b-dev/ecommerce-store-api) (this repository).
2. [`ecommerce-admin-dashboard`](https://github.com/raouf-b-dev/ecommerce-admin-dashboard) and [`ecommerce-store-web`](https://github.com/raouf-b-dev/ecommerce-store-web), in any order.

Keep the three folders side by side. If you use the workspace repository that groups these projects, `npm run setup` from its root clones the missing ones (`npm run setup -- --pull` fast-forwards clean checkouts). That command is not the same as this repository's `npm run setup`, which bootstraps the API environment and containers.

## 2. Environment per repository

| Repository | Steps                                                                                                                                 |
| :--------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| API        | `npm run setup` (or `npm run env:init`, then the boot order in [`LOCAL-SETUP.md`](LOCAL-SETUP.md)). The API reads `.env.development`. |
| Admin      | Copy `.env.example` to `.env.local`. Set `VITE_API_BASE_URL=http://localhost:3000`.                                                   |
| Storefront | Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000`.                                            |

With the API running, `npm run api:generate` in either client reads `http://localhost:3000/api/docs-json` (override with `API_OPENAPI_URL`) and rewrites `src/lib/api/generated/schema.d.ts`. Regenerate after any API contract change. Any other client can generate its types from the same `/api/docs-json` document with its own tooling. Swagger and its JSON document are served only when `NODE_ENV` is not `production`.

## 3. CORS

The API sends credentialed CORS (`credentials: true`), so the refresh cookie works across origins. Allowed origins come from `CORS_ALLOWED_ORIGINS`; `.env.example` already lists `http://localhost:3000`, `http://localhost:3100`, `http://localhost:5173`, and `http://localhost:5174`. If you move a client to another port, add that exact origin. Never use `*`: browsers reject a wildcard origin on credentialed requests, and it would expose the API to any site. Cross-origin hosted clients (Pages, Vercel) need `AUTH_COOKIE_SAMESITE=none`, an https `PUBLIC_BASE_URL`, and those UI origins on the allowlist. See [HOSTED-DEMO.md](../infrastructure/HOSTED-DEMO.md).

## 4. Seeded accounts

Run `npm run db:seed` in the API after its first boot. Accounts, roles, and catalog are listed in [`SEEDING.md`](SEEDING.md). Operator accounts need the `access_admin` permission to open the dashboard; shopper accounts use the storefront.

## 5. Port table

| Service              | Default port | Where it is set                                                                |
| :------------------- | :----------- | :----------------------------------------------------------------------------- |
| API                  | `3000`       | `PORT` in `.env.development`                                                   |
| Redis Insight        | `8001`       | `REDIS_INSIGHT_PORT`                                                           |
| Grafana              | `3001`       | `GRAFANA_HOST_PORT` (observability profile)                                    |
| Loki                 | `13100`      | `LOKI_HOST_PORT` (observability profile; container port stays `3100`)          |
| Storefront (Next.js) | `3100`       | `next dev --port 3100` in `ecommerce-store-web/package.json`                   |
| Admin (Vite)         | `5174`       | `server.port` and `preview.port` in `ecommerce-admin-dashboard/vite.config.ts` |

Postgres (`5432`), Redis (`6379`), and the rest of the observability ports are in [`LOCAL-SETUP.md`](LOCAL-SETUP.md). On Windows, any of these ports can fall in a reserved TCP range; see [`TROUBLESHOOTING.md`](../infrastructure/TROUBLESHOOTING.md).

## 6. Checkout flow to expect

Checkout is asynchronous: `POST /v1/orders/checkout` (with an `Idempotency-Key` header) returns `orderId` and `jobId`. The clients poll the order, not the job.
