# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.13.0] - 2026-10-28

### Added

- `ADMIN_READONLY` system role (`access_admin` + `view_all_*`) and hosted viewer seed when `DEMO_READ_ONLY=true` ([#360](https://github.com/raouf-b-dev/ecommerce-store-api/pull/360)).
- `DEMO_READ_ONLY` (default `false`): seeds viewer + silent fixture customer only (does not create or update writable local operators) and skips forced password change on those accounts. Mutations stay on RBAC; private writable owner uses `ADMIN_EMAIL` / `ADMIN_PASSWORD` ([#360](https://github.com/raouf-b-dev/ecommerce-store-api/pull/360)).
- Demo seed emails/passwords via `DEMO_SUPERADMIN_*`, `DEMO_ADMIN_*`, `DEMO_VIEWER_*`, and `DEMO_CUSTOMER_*` (defaults match documented public demo accounts) ([#360](https://github.com/raouf-b-dev/ecommerce-store-api/pull/360)).

### Changed

- bullmq 5.65.1 -> 6.3.14 ([#380](https://github.com/raouf-b-dev/ecommerce-store-api/pull/380)), then 6.5.0 ([#381](https://github.com/raouf-b-dev/ecommerce-store-api/pull/381), includes the 6.4.1 msgpackr security bump; the app only uses `upsertJobScheduler`, so no API changes). The legacy-repeatables cleanup below only applies to an existing deployment whose persistent Redis still holds v5 repeatable entries; a fresh install has none and can skip it. On such an environment, before deploying, run the cleanup from the previous bullmq 5 release (develop at `22a31bf`, [#373](https://github.com/raouf-b-dev/ecommerce-store-api/pull/373)): `npm run queue:clean-legacy-repeatables` (dry run), then `node scripts/bullmq-clean-legacy-repeatables.js --yes` (`docs/infrastructure/REDIS.md`, "BullMQ v6 migration").
- Cron jobs (inventory reconciliation, reservation sweeper, notifications cleanup, expire pending orders) are BullMQ Job Schedulers (`upsertJobScheduler`) instead of v5 repeatable jobs, to prepare the bullmq 6 upgrade ([#373](https://github.com/raouf-b-dev/ecommerce-store-api/pull/373)).
- Job ids and fake payment references use Node `crypto.randomUUID` instead of the undeclared transitive `uuid` package (bullmq 6 no longer ships it) ([#373](https://github.com/raouf-b-dev/ecommerce-store-api/pull/373)).
- Node.js 26 LTS is the supported runtime: `engines` is `node >=26.0.0`, `npm >=11.6.0` (a lower bound; the npm pin is `devEngines.packageManager`), and `devEngines.runtime` enforces the Node range ([#378](https://github.com/raouf-b-dev/ecommerce-store-api/pull/378), [#379](https://github.com/raouf-b-dev/ecommerce-store-api/pull/379)).
- CI reads the Node version from `.nvmrc` (`node-version-file`). The `Dockerfile` base image is pinned to `node:26.12.1-alpine3.24` by digest ([#378](https://github.com/raouf-b-dev/ecommerce-store-api/pull/378)).
- Dependabot tracks the `Dockerfile` base image and ignores Node major updates. Node majors change in `.nvmrc`, the `Dockerfile` pin, `engines.node`, and `devEngines.runtime` together (see CONTRIBUTING, "Node version policy") ([#378](https://github.com/raouf-b-dev/ecommerce-store-api/pull/378), [#381](https://github.com/raouf-b-dev/ecommerce-store-api/pull/381)).
- npm 12.2.1 is pinned through `package.json` `devEngines.packageManager` (`onFail: error`); CI (new `.github/actions/setup-node-ci` composite action replacing 16 setup-node copies) and the `Dockerfile` install it explicitly because no Node release bundles npm 12 yet. `devEngines.runtime` (`node >=26.0.0`, `onFail: error`) keeps the Node guardrail, since npm 12 no longer enforces root `engines.node` ([#379](https://github.com/raouf-b-dev/ecommerce-store-api/pull/379)).
- typeorm 0.3.31 -> 1.1.2: repositories use the object syntax for `relations` / `select` (string arrays were removed in 1.0); the `overrides.typeorm.redis` block is dropped ([#371](https://github.com/raouf-b-dev/ecommerce-store-api/pull/371)).
- NestJS 12.3.2 and body-parser 2.4.0 (security audit) ([#370](https://github.com/raouf-b-dev/ecommerce-store-api/pull/370)); production-deps group: NestJS 12.2.0, `@opentelemetry/auto-instrumentations-node` 0.81.2, jose 6.2.13, sanitize-html 2.18.1 ([#361](https://github.com/raouf-b-dev/ecommerce-store-api/pull/361)).
- Dev dependencies: undici 8.12.3 ([#368](https://github.com/raouf-b-dev/ecommerce-store-api/pull/368)), fast-uri 3.1.9 ([#366](https://github.com/raouf-b-dev/ecommerce-store-api/pull/366)), dotenv 18.0.9 ([#364](https://github.com/raouf-b-dev/ecommerce-store-api/pull/364)), and the dev-deps group refresh ([#376](https://github.com/raouf-b-dev/ecommerce-store-api/pull/376): `@nestjs/cli` 12.0.9, `@nestjs/schematics` 12.0.9, vitest 5.0.5, eslint 10.13.0, typescript-eslint 8.72.0 and others). chokidar was bumped to 6.0.0 ([#363](https://github.com/raouf-b-dev/ecommerce-store-api/pull/363)) and set back to `^5.0.0` in [#376](https://github.com/raouf-b-dev/ecommerce-store-api/pull/376) to match `@nestjs/cli` and its peers.
- Migration `RenameProductsCategoryForeignKey1787400000011` renames the products -> categories foreign key from `FK_products_category` to the TypeORM generated name, so `migration:generate` no longer proposes dropping and re-adding it ([#381](https://github.com/raouf-b-dev/ecommerce-store-api/pull/381)).

### Fixed

- `PostgresUserRepository.save` with an `expectedVersion` returns a `RepositoryError` for a user without an id instead of passing a null id into TypeORM `where` (which throws) ([#381](https://github.com/raouf-b-dev/ecommerce-store-api/pull/381)).

### Removed

- `npm run queue:clean-legacy-repeatables` and `scripts/bullmq-clean-legacy-repeatables.js` (with `scripts/lib/bullmq-legacy-repeatables.js`): they rely on `Queue.getRepeatableJobs` / `removeRepeatableByKey`, which bullmq 6 removed. Run them from the bullmq 5 release instead ([#380](https://github.com/raouf-b-dev/ecommerce-store-api/pull/380)).

[Compare v0.12.0...v0.13.0](https://github.com/raouf-b-dev/ecommerce-store-api/compare/v0.12.0...v0.13.0)

## [0.12.0] - 2026-10-19

### Added

- Demo catalog is 29 products across 7 categories, with stock headroom for public click-through checkout (`ELEC-EWM-005` stays out of stock; `ELEC-PRJ-003` stays at its low-stock threshold).
- `POST /v1/admin/demo/reset` reconciles the demo seed for a scheduled job (`src/infrastructure/demo/`, ADR-0009). Off unless `DEMO_RESET_ENABLED=true` and `DEMO_RESET_TOKEN` is at least 32 characters. Header `X-Demo-Reset-Token`. Rate-limited, single-flight, constant-time token compare. Returns 404 when disabled.
- `AUTH_COOKIE_SAMESITE=strict|lax|none` (default `strict`). `none` requires an https `PUBLIC_BASE_URL` and the refresh cookie stays `Secure`.

### Changed

- `db:seed` and the demo reset rebuild inventory from the four fixture orders, so shopper checkouts do not permanently drain demo stock. Shopper accounts and orders are not deleted. `db:seed` still refuses `NODE_ENV=production`.
- Demo product photos: one unique WebP per SKU under `assets/demo-media/v2/` (`DEMO_MEDIA_VERSION=v2`). Only the current version folder is shipped; the path segment is a cache bust, not a second photo set.

[Compare v0.11.3...v0.12.0](https://github.com/raouf-b-dev/ecommerce-store-api/compare/v0.11.3...v0.12.0)

## [0.11.3] - 2026-10-18

### Changed

- Docker Validate/Publish build each arch on a native runner (`ubuntu-latest` / `ubuntu-24.04-arm`) and merge multi-arch manifests by digest (no QEMU).

[Compare v0.11.2...v0.11.3](https://github.com/raouf-b-dev/ecommerce-store-api/compare/v0.11.2...v0.11.3)

## [0.11.2] - 2026-10-18

### Added

- Dockerfile `seed` stage and GHCR image `ecommerce-store-api-seed` (same semver tags as the API) for the ecommerce-platform demo seed job.

### Changed

- Docker validate/publish builds `linux/amd64` and `linux/arm64` for the API and seed images.

[Compare v0.11.1...v0.11.2](https://github.com/raouf-b-dev/ecommerce-store-api/compare/v0.11.1...v0.11.2)

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
