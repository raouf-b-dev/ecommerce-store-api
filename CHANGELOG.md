# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.11.1] - 2026-10-18

### Added

- `npm run env:init:merge` appends only missing keys from `.env.example` into existing env files.

### Changed

- `DELETE` for products, categories, users, roles and user addresses now returns 204 No Content, as the OpenAPI spec already documented (was 200 with an empty body). Admin and web clients already expect 204; no regeneration needed.
- `db:backup`, `db:restore` and `db:restore:drill` fail fast when `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD` or `DB_DATABASE` is unset instead of falling back to local defaults.

### Fixed

- Production Docker image copies scripts/lib/env-bool.js so scripts/docker-migrate.js can run (0.11.0 image failed with Cannot find module './lib/env-bool').
- Stock checks and add-to-cart no longer read cached inventory that is stale after a reservation is placed, released, confirmed or expired; each reservation write now evicts the affected inventory cache keys.
- The `.secrets` missing-key warning no longer recommends a blind overwrite of CI credentials and names every value `--overwrite` resets.
- `env:init` exits 1 and writes nothing when the env or secrets template is missing or has no keys (for example a mistyped `--from`).
- Setup / `env:init` detect env files that are missing keys from the templates and exit with guidance to merge or force.

[Compare v0.11.0...v0.11.1](https://github.com/raouf-b-dev/ecommerce-store-api/compare/v0.11.0...v0.11.1)

## [Unreleased]

## [0.11.0] - 2026-10-16

OpenAPI clients should regenerate if they consume cart/order schemas that newly allow null. No forced admin/web bump.

### Added

- Optional Postgres SSL (`DB_SSL`, `DB_SSL_REJECT_UNAUTHORIZED`) and Redis TLS (`REDIS_TLS`) for managed hosts.
- `SWAGGER_ENABLED` to control `/api/docs` (fail-closed default; production rejects `true` at boot).
- `npm run verify` phase banners via `scripts/verify.mjs` (aligned with admin/web DX).

### Changed

- Staging may enable `PAYMENT_MOCK_AUTO_COMPLETE` for demo checkout; production still rejects it at startup.
- Staging mock checkout may omit `STRIPE_WEBHOOK_SECRET` when mock auto-complete is on.
- `env:init` sets mock auto-complete and Swagger on for staging/dev, OTEL off for staging/production, Swagger off for production.
- Cart `id` and order customer/shipping presentation fields may be null instead of placeholder values.
- Persistence/DTO money major-unit conversion goes through `Money.toMajorUnits` via `requireMajorUnitsFromMinor`.
- Cart free-shipping totals live in domain policy `applyCartShipping` (Money), shared by presentation and query mappers.
- Postgres container name/image stay Compose/script concerns; Nest no longer validates `POSTGRES_*`.
- ESLint uses `--cache` for faster local lint.

### Fixed

- Cart query mapper no longer invents zero prices or `Unknown Product`.
- Order list/detail query mapping no longer invents `Unknown User`, empty totals, or `N/A` shipping.
- OpenAPI nullable order fields emit explicit `type: string` (audit:openapi).
- Docker migrate entrypoint parses `DB_SSL` / `DB_SSL_REJECT_UNAUTHORIZED` like envalid (`true`/`t`/`yes`/`on`/`1`, `false`/`f`/`no`/`off`/`0`).
- `scripts/verify.mjs` resolves the npm CLI from `npm_execpath` (set by `npm run`).
- Removed unused `RecordCodPaymentDto`.
- Order detail reads items from their purchase snapshot, so deleting a product no longer breaks `GET /orders/:id`; checkout snapshots product `sku` onto cart and order items (nullable `cart_items.sku`); item `sku` may be null; cart item responses also expose nullable `sku`.
- Order item product names are required at the database level (blank means whitespace-only: spaces, tabs or newlines; blank legacy names backfilled from the catalog; migration stops if any remain), and the order item mapper no longer substitutes "Unknown Product".

### Security

- Production rejects `SWAGGER_ENABLED=true` and unverified Postgres TLS (`DB_SSL=true` with `DB_SSL_REJECT_UNAUTHORIZED=false`).
- Documented archunit/braces npm audit noise as accepted **dev-only** risk; CI/`audit:check` still use `--omit=dev`.

[Compare v0.10.0...v0.11.0](https://github.com/raouf-b-dev/ecommerce-store-api/compare/v0.10.0...v0.11.0)

## [0.10.0] - 2026-10-15

Admin v0.5.0 and web v0.4.0 are the matching client releases; older clients send `STRIPE` and fail.

### Added

- `GET /v1/platform/config` returns the default currency, its minor-unit exponent, and the supported currencies (#313).
- `POST /v1/orders/:id/payments` creates a payment for an order the caller can see. The server charges the order total and currency, and the request is idempotent (#306).
- Provider-neutral payment port with a fake Stripe provider behind it (#316).
- Error responses always carry a stable `code` (#300).
- E2E: cross-user order and payment reads return the same result as a missing id and leak no fields.
- Pull request template and a full-stack local guide (`docs/development/FULL-STACK.md`).

### Changed

- **Breaking:** Payment method `STRIPE` is now `CARD` in requests and responses. A migration rewrites existing orders and payments (#316).
- **Breaking:** `POST /v1/orders/checkout` requires the `Idempotency-Key` header. The `x-idempotency-key` header and the body `idempotencyKey` field are no longer read (#300, #314).
- **Breaking:** `POST /v1/payments` is removed. Create payments with `POST /v1/orders/:id/payments`; clients no longer send the amount, currency, or owner (#306).
- **Breaking:** Local dev: the Loki host port default is `13100`, not `3100` (#286).
- Money is held as integer minor units internally, with per-currency decimal places and scale-3 money columns. HTTP amounts stay major-unit decimals, as in 0.9.2 (#300, #301, #305, #313).
- NestJS 12. Unit, e2e, integration, and chaos suites run on Vitest; Jest remains only for `test:arch` (#307).
- Platform and health modules moved under `src/infrastructure` (#313).
- Five new migrations (inventory stock check constraints, order currency, payment provider and `CARD` method, scale-3 money columns, currency column alignment). Run them before starting 0.10.0.
- CI: sharded unit tests and Codecov coverage reporting (#307). Contributor test guardrails and agent tooling (#291, #295, #297).

### Fixed

- Carts: 100x pricing regression and strict currency matching (#301); `GET` cart returns 404 when the cart does not exist (#298).
- Orders: the currency snapshotted from the cart is persisted (#304); a payment charges the owned order total (#306); cancelling a paid order refunds it (#294); local mock checkout confirms orders (#315).
- Payments: amounts in responses and refund and COD requests are major-unit decimals again, after #300 briefly switched them to minor units during this cycle (#305); the capture domain failure is returned unchanged (#302); webhooks are reliable and idempotent (#289).
- Inventory: reservation release, expiry, and stock constraints are safe (#293).
- Auth: refresh rotation is rejected after the session expires (#303).

### Security

- Reusing a refresh token revokes all of the user's sessions (#299).
- Stripe webhook signatures are verified over the raw request body (#292).
- Sanitize interceptor is scoped to handlers, skips auth and webhook routes, and preserves passwords on registration (#285).
- Dependency bumps: `socket.io` (#275), `undici` (#264), `piscina` (#267), `brace-expansion`, and `js-yaml`.

[Compare v0.9.2...v0.10.0](https://github.com/raouf-b-dev/ecommerce-store-api/compare/v0.9.2...v0.10.0)

## [0.9.2] - 2026-09-29

### Added

- Cart line `imageUrl` is snapshotted onto demo orders and order lines so clients can render product images on past orders.

### Changed

- CI: Docker publish is gated on the required jobs, including redis-chaos tests.

### Security

- Bump `multer` from 2.3.0 to 2.4.0 (`GHSA-3pph-fpjx-jg34`). This landed on `master` first and is included here so the next tag does not drop it.

## [0.9.1] - 2026-09-28

Patch with no application changes since 0.9.0.

### Changed

- CI: Docker Validate on pull requests; Docker Publish on `master` and version tags. First versioned image: `ghcr.io/raouf-b-dev/ecommerce-store-api:0.9.1`.
- Pre-push hook blocks direct pushes to `master` and `develop` by destination so tag pushes work.
- GitHub Actions dependency updates (checkout, download-artifact, Docker actions).

[Compare v0.9.0...v0.9.1](https://github.com/raouf-b-dev/ecommerce-store-api/compare/v0.9.0...v0.9.1)

## [0.9.0] - 2026-09-28

### Added

- Demo product images served from `/media` with long-lived caching; seed populates and refreshes them.
- `imageUrl` on order-item detail responses.
- Required `PUBLIC_BASE_URL` for the externally reachable API origin (HTTPS in production/staging).

### Changed

- App version is read from `package.json` for OpenTelemetry and Swagger.
- Typed `CheckStockQueryDto`: `GET /inventory/check/:productId` rejects a `quantity` that is not an integer >= 1.

[Compare v0.8.0...v0.9.0](https://github.com/raouf-b-dev/ecommerce-store-api/compare/v0.8.0...v0.9.0)

## [0.8.0] - 2026-09-20

Shopper HTTP contract, mock checkout webhook simulation, money/cart currency alignment, fail-closed Stripe webhook path (mock adapter), CQRS fields for companion UIs, and CI/community hygiene. Live Stripe and hosted staging stayed out of scope.

[Compare v0.7.0...v0.8.0](https://github.com/raouf-b-dev/ecommerce-store-api/compare/v0.7.0...v0.8.0)

## [0.7.0] - 2026-09-06

Categories, product activate/deactivate, HTTP role assignment, addresses on user detail, admin analytics, shopper catalog GETs, OpenAPI generate/audit, forced password rotation, and `npm run setup`.

[Compare v0.6.0...v0.7.0](https://github.com/raouf-b-dev/ecommerce-store-api/compare/v0.6.0...v0.7.0)

## [0.6.0] - 2026-08-22

Single-instance production foundation: OWASP map, OCC and inventory locks, CQRS read path, fan-out CI, E2E/integration confidence, baseline migration, Redis degradation, health probes, backup/restore, secret rotation. Payments still mock.

[Compare v0.5.0...v0.6.0](https://github.com/raouf-b-dev/ecommerce-store-api/compare/v0.5.0...v0.6.0)

## [0.5.0] - 2026-07-27

IAM split into Identity, Authentication, and Authorization; IDOR ownership policies; database seeding; stricter TypeScript and ArchUnit gates.

[Compare v0.4.1...v0.5.0](https://github.com/raouf-b-dev/ecommerce-store-api/compare/v0.4.1...v0.5.0)

## [0.4.1] - 2026-05-17

Hexagonal boundary hardening, Command/Query ports, JWT and cache ports, type-safety sweep, shared test infrastructure.

[Compare v0.4.0...v0.4.1](https://github.com/raouf-b-dev/ecommerce-store-api/compare/v0.4.0...v0.4.1)

## [0.4.0] - 2026-05-13

Observability, RBAC, and architecture hardening. See the GitHub release for the full note.

[Compare v0.3.0...v0.4.0](https://github.com/raouf-b-dev/ecommerce-store-api/compare/v0.3.0...v0.4.0)

## [0.3.0] - 2026-04-24

Security hardening, production readiness, and observability.

[Compare v0.2.0...v0.3.0](https://github.com/raouf-b-dev/ecommerce-store-api/compare/v0.2.0...v0.3.0)

## [0.2.0] - 2026-04-11

Architecture polish and DDD hardening.

[Compare v0.1.0...v0.2.0](https://github.com/raouf-b-dev/ecommerce-store-api/compare/v0.1.0...v0.2.0)
