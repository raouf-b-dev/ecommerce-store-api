# E-Commerce Store API: Feature Roadmap

> A living roadmap for the E-Commerce Store API project. Each phase includes enough context for any contributor or AI agent to pick up tasks in a fresh session.
>
> **Companion docs**: [`AGENT.md`](../AGENT.md) (coding guidelines), [`docs/architecture/DDD-HEXAGONAL.md`](architecture/DDD-HEXAGONAL.md) (strict DDD reference), [`docs/architecture/CQRS.md`](architecture/CQRS.md) (CQRS read-path analysis), [`docs/integration/INTEGRATION-PATTERNS.md`](integration/INTEGRATION-PATTERNS.md) (cross-context communication), [`docs/security/SECRETS-MANAGEMENT.md`](security/SECRETS-MANAGEMENT.md) (secrets & env management)

---

## How to Use This File

- `[ ]`: Not started
- `[/]`: In progress
- `[x]`: Completed
- Open a new chat, reference this file, and pick the next unchecked task in top-to-bottom order.
- **Across phases**: work sequentially unless a track is marked non-blocking / parallel.
- **Within a phase**: **Parallel tracks** (e.g. `15-A`, `15-B`) may run in any order; the phase is not done until every track is `[x]`.

---

## Now / Next / Later

Work top to bottom. Letter suffixes (`15b`, `14c`, `16b`, ...) are stable IDs - do not renumber them. Renumbering history lives in [`ROADMAP-CHANGELOG.md`](ROADMAP-CHANGELOG.md).

**Now**

1. **Phase 16b** - Demo catalog media (small; any client gets a real-looking catalog from a fresh seed).

**Next**

2. **Phase 16c** - Hosted staging and public demo (single instance, demo data protected by RBAC).
3. **Phase 16d** - Full-stack local DX (run-the-stack guide, port table, Loki off `3100`, PR template).
4. **Phase 16e** - Stable error codes (one documented error envelope).
5. **Phase 18** - Real Stripe SDK and webhook idempotency.

**Later**

6. **Phase 19** - Multi-instance and distributed consistency. **Complete before 2+ application instances.**
7. **Phases 21 → 25** in the pending table. Phase **25** items are demand-driven.

Phases **15-17** and **20** are done.

---

## Completed Phases: Summary

> Full implementation detail has been collapsed for readability. The history and decisions are preserved in git.

| Phase   | Name                                        | Status | Key Deliverables                                                                                                                                                                                                                                                                                                                                                                                      | Location                                                                                                                   |
| ------- | ------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **0**   | Foundation                                  | Done   | DDD/Hexagonal scaffold · 10 modules (Authentication, Authorization, Carts, Health, Identity, Inventory, Notifications, Orders, Payments, Products) · JWT auth · Passport strategies · Redis WebSocket adapter · BullMQ jobs · Swagger/OpenAPI                                                                                                                                                         | `src/modules/`, `src/infrastructure/`                                                                                      |
| **1**   | ACL Gateway & SAGA                          | Done   | 8 ACL Gateways across Orders, Carts, Authentication · BullMQ checkout SAGA with `CheckoutFailureListener` compensation (refund, stock release, order cancellation) · Gateway DTOs decoupled from domain entities                                                                                                                                                                                      | `src/modules/orders/`, `src/modules/carts/`                                                                                |
| **2**   | Result Pattern & Idempotency                | Done   | Functional `Result<T, E>` across all layers · `@Idempotent()` decorator with Redis `SET NX` store for checkout protection · idempotency **fail-closed** on Redis errors (HTTP 503)                                                                                                                                                                                                                    | `src/shared-kernel/`, `src/infrastructure/idempotency/`                                                                    |
| **3**   | Decorator-based Caching                     | Done   | `CachedRepository` decorator pattern wrapping Postgres repositories with Redis cache-aside                                                                                                                                                                                                                                                                                                            | `src/modules/*/secondary-adapters/repositories/cached-*/`                                                                  |
| **4**   | Test Suite Foundation                       | Done   | Use case unit tests (all modules) · mock-based repository specs · controller/guard tests · architecture boundary tests (`test:arch`) · shared test helpers · Docker Compose for local dev (PostgreSQL + Redis Stack)                                                                                                                                                                                  | `src/modules/*/`, `src/testing/`, `test/architecture/`                                                                     |
| **5**   | Code Quality (v0.2.0)                       | Done   | Removed redundant try/catch from use case/service files · Trimmed orders table indexes · Migration CLI scripts configured (`data-source.ts`, `scripts/docker-migrate.js`)                                                                                                                                                                                                                             | `data-source.ts`, `package.json`                                                                                           |
| **6**   | Deployment Blockers                         | Done   | Multi-stage `Dockerfile` (Node 24 Alpine, tini, non-root) · `GlobalExceptionFilter` · graceful shutdown (`SIGTERM` drain) · `docker-entrypoint.sh` migration runner · `docker-compose.prod.yml` hardening (healthchecks, log rotation, memory limits, network isolation) · `scripts/generate-envs.js`                                                                                                 | `Dockerfile`, `docker-compose.prod.yml`, `scripts/`                                                                        |
| **7**   | Security & Authentication                   | Done   | Helmet · CORS whitelist · XSS sanitization · `ValidationPipe` hardening (`forbidNonWhitelisted`) · pagination `@Max(100)` · RSA RS256 JWT · refresh token rotation + reuse detection · session tracking · full RBAC (roles/permissions/guards) · logout/logout-all · authentication endpoint `@Throttle`                                                                                              | `src/main.ts`, `src/modules/authentication/`, `src/infrastructure/jwt/`                                                    |
| **8**   | Observability & SaaS                        | Done   | Winston structured logging · `/health` · correlation ID middleware (`X-Request-Id`) · BullMQ job correlation propagation · API versioning (`/v1`) · Redis-backed rate limiting · Prometheus (`/metrics`) · Grafana/Loki/Tempo stack · OpenTelemetry tracing · hexagonal boundary audit · agent docs (`AGENT.md`, `.agents/`, `docs/ai/`)                                                              | `src/infrastructure/logging/`, `src/infrastructure/metrics/`, `docker/monitoring/`, `AGENT.md`                             |
| **9**   | Local DB Seeding                            | Done   | `npm run db:seed` · module-owned seed use cases · admin & customer accounts · 15-product catalog · inventory levels · documented credentials                                                                                                                                                                                                                                                          | `scripts/`, `src/modules/*/core/application/seed/`, `docs/development/`                                                    |
| **10**  | Security Hardening Phase 2                  | Done   | OWASP Top 10:2025 audit document (`OWASP-COMPLIANCE.md`) · Dependabot + CI `npm audit` scanning · `eslint-plugin-security` static analysis · Winston PII log redaction · `GlobalExceptionFilter` production error code masking · User-scoped `UserThrottlerGuard` rate limiting                                                                                                                       | `.github/`, `docs/security/`, `src/infrastructure/`                                                                        |
| **11**  | Data Integrity & Concurrency                | Done   | OCC version locking (`@VersionColumn`, HTTP 409 conflict filter) · Pessimistic inventory reservation row locking (`SELECT FOR UPDATE`) · Redis-backed cart TTL (30 days) with RedisJSON storage & graceful re-initialization · BullMQ inventory reconciliation audit job (`inventory_drift_count` Prometheus metric) · Transaction isolation level audit & query composite/partial index optimization | `src/modules/*/`, `src/infrastructure/database/`, `docs/data/`                                                             |
| **12**  | CQRS Read Path                              | Done   | Query ports & flat read DTOs (7 modules) · TypeORM JOIN query adapters & mappers · read use case refactor · controller presentation updates · application command contracts · Testcontainers integration specs · `EXPLAIN ANALYZE` index verification · 18/18 architecture boundary rules                                                                                                             | `src/modules/*/core/application/queries/`, `src/modules/*/secondary-adapters/query/`, `test/integration/`, `docs/testing/` |
| **12b** | CI/CD Pipeline (GitHub Actions)             | Done   | Fan-out/fan-in CI · CI Status Check aggregator · blocking `npm audit` · PR dependency review · Docker validate (PR) · GHCR publish · smoke · liveness/readiness                                                                                                                                                                                                                                       | `.github/workflows/ci.yml`, `.github/actions/prepare-test-env/`, `scripts/smoke-test.js`, `docs/infrastructure/cicd/`      |
| **13**  | Production Confidence & Integration Testing | Done   | Typed mocks · domain GWT specs · real-DB repos · concurrent checkout lock proof · E2E auth/IDOR/SAGA/idempotency/cookies                                                                                                                                                                                                                                                                              | `src/modules/*/`, `src/testing/`, `test/e2e/`, `docs/testing/`                                                             |
| **14**  | Single-Instance Production Gate             | Done   | Baseline migration · Redis cleanup + degradation · probes · backup/restore/smoke · secret rotation docs                                                                                                                                                                                                                                                                                               | `src/migrations/`, `scripts/`, `docs/infrastructure/`                                                                      |
| **14b** | Forced Credential Rotation                  | Done   | `mustChangePassword` · change-password endpoint · global guard · session revoke                                                                                                                                                                                                                                                                                                                       | `src/modules/authentication/`, `src/guards/`                                                                               |
| **14c** | OpenAPI Truthfulness                        | Done   | `generate:openapi` + `audit:openapi` · handler-aligned DTOs · cookie-first auth docs                                                                                                                                                                                                                                                                                                                  | `scripts/`, `src/infrastructure/swagger/`, `src/modules/*/primary-adapters/`                                               |
| **14d** | Operator HTTP Gaps                          | Done   | Product activate/deactivate HTTP · assign/replace user role over HTTP                                                                                                                                                                                                                                                                                                                                 | `src/modules/products/`, `src/modules/identity/`                                                                           |
| **14e** | Developer Onboarding (bootstrap slice)      | Done   | `npm run setup` / `setup:down` / `setup:reset` (env → infra wait → migrations → seed). Value matrix, C4 assets, Bruno deferred to **Phase 16**                                                                                                                                                                                                                                                        | `scripts/setup.js`, `package.json`                                                                                         |
| **14f** | User Detail Address Projection              | Done   | `GET /v1/users/{id}` returns `addresses[]`                                                                                                                                                                                                                                                                                                                                                            | `src/modules/identity/`                                                                                                    |
| **15b** | Shopper HTTP contract                       | Done   | `GET /v1/users/me` · `GET /v1/carts/current` (404 = no cart) · lock public inventory to `view_all_inventory` · `MUST_CHANGE_PASSWORD` code · checkout default-shipping + typed `Retry-After` OpenAPI. Required for checkout-capable HTTP clients. Detail in git.                                                                                                                                      | `src/modules/identity/`, `carts/`, `inventory/`, `orders/`, `src/guards/`                                                  |
| **17a** | Customer Catalog Read Path (slice)          | Done   | Shopper catalog list/detail via `@OptionalAuth` + `CatalogVisibilityPolicy`. Emails/webhooks/cart recovery deferred to **Phase 21**                                                                                                                                                                                                                                                                   | `src/modules/products/`                                                                                                    |

> **Note**: Phase 0 shipped 10 modules and Passport JWT; the tree now has **11 modules** (Analytics added later) and RS256 via `jose`. Cached role-permission resolution is complete.

---

## Pending Work: Execution Sequence

> **Execution guide**: Phases **15-17** and **20** are complete. Pick the next unchecked phase in this order: **16b → 16c → 16d → 16e → 18**. Complete **Phase 19** before deploying to 2+ application instances.
>
> - **16c** needs **16b** (seeded image URLs use the public base URL) and stays single-instance.
> - **16d** and **16e** are independent of **16c** and can run in parallel with it.
> - Remaining notifications work is Phase **21**.
> - Phase **25** items are demand-driven; pick one only when a client needs it.

| Phase   | Name                                              | Status | Priority | Target / Focus                                                                                      |
| ------- | ------------------------------------------------- | ------ | :------: | --------------------------------------------------------------------------------------------------- |
| **15**  | Platform Hygiene & Supply-Chain Alignment         | `[x]`  |  `[P0]`  | engines, migration script NODE_ENV, OpenAPI in CI, webhook fail-closed, Actions SHA pins / timeouts |
| **16**  | Complete Onboarding DX & Architecture Assets      | `[x]`  |  `[P0]`  | Remainder of 14e: value matrix, C4/SAGA assets, Bruno/Postman                                       |
| **16b** | Demo Catalog Media                                | `[ ]`  |  `[P1]`  | API-served seed product images; public base URL config; cross-origin image loading                  |
| **16c** | Hosted Staging & Public Demo                      | `[ ]`  |  `[P1]`  | Single-instance deploy; sibling-subdomain cookies; public Swagger flag; RBAC demo role; seed reset  |
| **16d** | Full-Stack Local DX                               | `[ ]`  |  `[P1]`  | Run-the-stack guide + port table; Loki off `3100`; PR template                                      |
| **16e** | Stable Error Codes                                | `[ ]`  |  `[P1]`  | Framework errors mapped to stable machine codes; one error schema in OpenAPI; ADR; e2e assertions   |
| **17**  | Money & Currency Domain Alignment                 | `[x]`  |  `[P1]`  | Pricing truth before real Stripe (Money VO + explicit shipping; FX deferred)                        |
| **18**  | Real Stripe SDK & Webhook Idempotency             | `[ ]`  |  `[P1]`  | HMAC + event.id dedupe (mock fail-closed already in 15)                                             |
| **19**  | Multi-Instance & Distributed Consistency          | `[ ]`  |  `[P1]`  | Outbox, singleton jobs, SAGA DLQ, search reconciliation                                             |
| **20**  | Checkout SAGA & order events                      | `[x]`  |  `[P1]`  | HTTP checkout, BullMQ SAGA, `orders.created` WebSocket                                              |
| **21**  | Notifications, Webhooks & Cart Recovery           | `[ ]`  |  `[P2]`  | Email, abandoned cart, outbound webhooks                                                            |
| **22**  | Performance Engineering                           | `[ ]`  |  `[P2]`  | k6, V8, RED/USE                                                                                     |
| **23**  | Analytics Attention & Operational Facts           | `[ ]`  |  `[P2]`  | Gated on real payment/storefront traffic                                                            |
| **24**  | Conditional Enterprise & Infrastructure Evolution | `[ ]`  |  `[P2]`  | Broker, multi-tenancy, K8s, encrypted off-site backups                                              |
| **25**  | Catalog & Order Contract Extensions               | `[ ]`  |  `[P2]`  | Media upload, product gallery, category image, slug lookup, order status history, `inStock` filter  |

> Phase renumbering history (old → new mapping) is in [`ROADMAP-CHANGELOG.md`](ROADMAP-CHANGELOG.md).

---

## Pre-Production Checklist

### Step 1: Single-Instance Production Ship Blockers

| Task / Item                                                                                | Phase            | Critical Purpose                                                   |
| ------------------------------------------------------------------------------------------ | ---------------- | ------------------------------------------------------------------ |
| [x] IDOR / object-level access control on carts, orders, payments & customer profile       | **10**           | `CallerContext`, ownership validators, `OwnedResourceAccessPolicy` |
| [x] OWASP audit + Dependabot + blocking `npm audit` + PR dependency review                 | **10** / **12b** | Supply-chain gate                                                  |
| [x] Production error masking & PII log redaction                                           | **10**           | Filter + Winston                                                   |
| [x] OCC + inventory pessimistic lock + cart TTL                                            | **11**           | Data integrity                                                     |
| [x] CQRS read path + admin analytics                                                       | **12**           | N+1 / dashboard reads                                              |
| [x] Baseline migration · Redis degradation · probes · backup/smoke · secret rotation       | **14**           | First private production instance                                  |
| [x] Forced credential rotation                                                             | **14b**          | Bootstrap password change                                          |
| [x] OpenAPI truthfulness tooling                                                           | **14c**          | Contract honesty                                                   |
| [x] Shopper HTTP contract (`/me`, `/carts/current`, inventory ACL, `MUST_CHANGE_PASSWORD`) | **15b**          | Required for checkout-capable HTTP clients                         |

### Step 2: Verification & Test Safety Net

| Task / Item                                                      | Phase  | Critical Purpose           |
| ---------------------------------------------------------------- | ------ | -------------------------- |
| [x] E2E auth + IDOR + SAGA + CQRS shapes + idempotency + cookies | **13** | Pre-deploy HTTP confidence |
| [x] Repository integration + concurrent checkout lock proof      | **13** | Real DB + stock race       |

### Step 3: Multi-Instance (Before 2+ pods)

| Task / Item                              | Phase  | Critical Purpose                    |
| ---------------------------------------- | ------ | ----------------------------------- |
| [ ] Transactional Outbox                 | **19** | At-least-once events across crashes |
| [ ] Singleton jobs & distributed locks   | **19** | One pod runs singleton schedulers   |
| [ ] Checkout SAGA timeout & DLQ recovery | **19** | Stuck checkout compensation         |
| [ ] Product search index reconciliation  | **19** | RedisSearch vs Postgres             |
| [x] User-scoped adaptive rate limiting   | **10** | Already shipped                     |

---

## Phase 15: Platform Hygiene & Supply-Chain Alignment `[P0]`

> **Goal**: Backport hygiene gaps and close the forgeable public Stripe webhook hole. Full Stripe SDK stays Phase 18.
>
> **Parallel tracks**: `15-A` through `15-D` may run concurrently.

### [x] Track 15-A: Node Engines & Migration Script Hygiene

**What**: Align package metadata and TypeORM create scripts.

**Scope**:

- Add `"engines": { "node": ">=24.0.0" }` to `package.json` (README already claims Node 24).
- Fix `migration:create:prod` / `:staging` / `:test` forcing `NODE_ENV=development` (copy-paste).

**Location**: `package.json`

---

### [x] Track 15-B: CI Automation Hardening

**What**: Enforce OpenAPI audit and runner hygiene.

**Scope**:

- Wire `npm run audit:openapi` into GitHub Actions CI.
- Pin GitHub Actions to full commit SHAs + version comments.
- Add `timeout-minutes` to long jobs (integration, e2e, redis-chaos).
- Drop Jest `forceExit` from `jest-redis-chaos.json` once open handles are proven clean.

**Location**: `.github/workflows/ci.yml`, `test/integration/redis/jest-redis-chaos.json`

---

### [x] Track 15-C: Fail-Closed Stripe Webhook Signature (Mock Era)

**What**: `POST /v1/payments/webhooks/stripe` is `@Public()` and `StripeSignatureService.verify()` currently returns `true` always - forgeable in any environment that exposes the route.

**Scope**:

- In production (and staging): reject unless a real secret verifies the signature (or disable the route until Phase 18).
- Keep local/test paths explicit (documented bypass only when `NODE_ENV=test` or equivalent).
- Do **not** treat full Stripe SDK / PaymentIntent adapter as P0 - that is Phase 18.
- Optionally rename/clarify mock `StripeGateway` vs real adapter to reduce confusion.

**Location**: `src/modules/payments/secondary-adapters/services/stripe-signature.service.ts`, `payments.controller.ts`, env docs

---

### [x] Track 15-D: Docs Cross-Pollination & CQRS Status Refresh

**What**: Import useful CRM docs; fix stale CQRS current-status text.

**Scope**:

- Copy/adapt `GRAPHQL-EVALUATION.md` and UTC frontend guide from CRM into ecommerce docs.
- Update `docs/architecture/CQRS.md` §2.2 to Phase 2 query adapters (not legacy `toPrimitives()` reads).

**Location**: `docs/architecture/`, `docs/frontend-guides/` (or equivalent)

---

## Phase 16: Complete Developer Onboarding & Architecture Assets `[P0]`

> **Goal**: Finish the Phase 14e remainder so the repo is a showcase reference. Bootstrap (`npm run setup`) is already done.
>
> **Status**: Complete. The staging track moved to Phase **16c**.

### [x] Architecture Value Matrix & "Why Choose This Engine?" in README

**What**: Decision matrix vs tutorials / Medusa / SaaS monoliths; elevator pitch for CTOs and full-stack engineers.

**Location**: `README.md`, `docs/README.md`

---

### [x] Visual Architecture Diagrams & Media Assets

**What**: C4 context/container SVG; annotated SAGA checkout sequence; Swagger overview screenshot; optional short walkthrough GIF.

**Location**: `docs/assets/`, `README.md`

---

### [x] Interactive API Playground & Client Collection

**What**: Bruno and/or Postman collections under `docs/data/collections/` with token refresh + admin login env; enhance Swagger examples.

**Location**: `docs/data/collections/`, `src/main.ts`

---

### Staging / Production-Like Environment

Moved to Phase **16c**.

---

## Phase 16b: Demo Catalog Media `[P1]`

> **Goal**: `npm run setup` produces a catalog whose products have images served by this API, so any client (admin, storefront, third-party) renders a realistic catalog without extra setup. The contract is unchanged: `imageUrl` already exists on products.

### [ ] API-Served Demo Product Images

**What**:

- Commit a small set of optimized demo images (WebP, redistributable licence recorded next to them) in this repository and serve them from a versioned static path with long-lived cache headers.
- Add a public base URL setting (the externally reachable origin of this API), validated in `src/config/validate-env.ts`. Seeded `imageUrl` values are absolute URLs built from it, never a hardcoded host.
- `demo-products.ts` declares an image per demo product; the seed sets `imageUrl` when a product has none and refreshes URLs that point at the demo media path. It never overwrites an operator-set URL.
- `helmet()` currently sends `Cross-Origin-Resource-Policy: same-origin`, which blocks images loaded from other origins. Allow cross-origin loading for the demo media path only.
- No references to files in client repositories and no third-party image hosts.
- Document for HTTP clients: the public base URL host must be added to their image allow-lists (framework remote-image patterns, CSP `img-src`); the demo media path sends `Cross-Origin-Resource-Policy: cross-origin`.

**Done when**: after a fresh `npm run setup`, `GET /v1/products` returns an `imageUrl` for every demo product and each URL loads in a page served from a different origin. Seeding docs mention the new setting.

**Location**: `src/modules/products/core/application/seed/`, `src/main.ts`, `src/config/`, `docs/development/SEEDING.md`

---

## Phase 16c: Hosted Staging & Public Demo `[P1]`

> **Goal**: A public, seeded, read-mostly deployment any HTTP client can target, so evaluators can try the API without Docker. Single instance only; multi-instance stays Phase **19**.
>
> **Prerequisite**: Phase **16b** (seeded image URLs are built from the public base URL).

### [ ] Single-Instance Hosted Deployment

**What**: Deploy the API image with managed Postgres and Redis on one host (Railway or equivalent). Migrations run on deploy; health probes gate traffic.

**Scope**:

- Custom domain with sibling subdomains (for example `api.<domain>` for this API, clients on other subdomains of the same domain). The refresh cookie is `Secure`, `SameSite=Strict` and host-only (`refresh-token-cookie.interceptor.ts`). Platform default domains are separate sites, so the cookie would not reach the API from a client hosted on another platform domain.
- `CORS_ALLOWED_ORIGINS` lists the exact client origins; credentials stay enabled. Document the refresh cookie attributes (`Secure`, `SameSite`, host-only, path) and why they work with sibling subdomains.
- The public base URL setting from Phase **16b** points at the hosted origin.
- Swagger: add an explicit env flag so `/api/docs` can be public in staging while production defaults stay closed. Today `src/main.ts` mounts Swagger only when `NODE_ENV !== 'production'`.
- `/metrics` already rejects requests when `METRICS_API_KEY` is empty (`metrics-auth.guard.ts`). Add a boot-time check: env validation fails when the key is empty and either the public Swagger flag is on or `NODE_ENV=production`.

**Done when**: a client on a sibling subdomain can log in, silently refresh, and read the catalog against the hosted API; `/api/docs` loads publicly; `/metrics` returns 401 without the key; booting with the Swagger flag on and no metrics key fails.

**Location**: `src/main.ts`, `src/config/validate-env.ts`, `src/modules/authentication/primary-adapters/interceptors/`, `docs/infrastructure/`

---

### [ ] Demo Data Protection (RBAC)

**What**: Keep the public demo usable for the next visitor by using the existing role and permission model. No route blocklist and no setting that changes authentication or authorization rules.

**Scope**:

- Seed a demo operator role that has read permissions and non-destructive catalog, inventory, and order operations, but no delete, user-management, or role-management permissions. Seed a demo operator account with that role and a demo shopper account.
- Demo accounts are seeded with `mustChangePassword: false` (today the demo seed sets `true`). Their credentials are documented as demo-only. Bootstrap and production operator accounts keep forced rotation.
- Scheduled reset: truncate and re-run the seed on a schedule (for example nightly), as a singleton job or a platform cron.
- A demo setting that only drives the reset schedule and reporting. The existing public health response exposes `demoMode` and `nextResetAt` so any client can show a notice. No client-specific wording in the API.

**Done when**: the demo operator gets 403 with the existing permission error code on delete and user/role writes; a reset restores the seed; the health response reports `demoMode` and `nextResetAt` and both are in OpenAPI.

**Location**: `src/modules/authorization/`, `src/modules/authentication/core/application/seed/`, `src/modules/*/core/application/seed/`, `src/modules/health/`, `docs/development/SEEDING.md`

---

## Phase 16d: Full-Stack Local DX `[P1]`

> **Goal**: A newcomer runs this API with companion HTTP clients locally without port clashes, and contributions follow one PR checklist.

### [ ] Run-the-Stack Guide & Port Table

**What**: `docs/development/FULL-STACK.md`: clone order, env steps, CORS origins for local clients, seeded accounts, and one port table (API `3000`, Redis Insight `8001`, Grafana `3001`, Loki, and the ports the companion clients use by default). Link it from `README.md` "Related repositories".

**Location**: `docs/development/`, `README.md`

---

### [ ] Move Loki Off Port 3100

**What**: `3100` is a common dev-server port for HTTP clients. Change the `LOKI_HOST_PORT` default (for example `3110`) in `.env.example`, the `docker-compose.yaml` port mapping and healthcheck URL, and the port tables in `docs/observability/MONITORING-STACK-GUIDE.md`, so the monitoring stack and a client on `3100` run together.

**Location**: `.env.example`, `docker-compose.yaml`, `docs/observability/`

---

### [ ] Pull Request Template

**What**: Add `.github/pull_request_template.md` (summary, linked issue, tests run, OpenAPI regenerated, docs touched) next to the existing issue templates.

**Location**: `.github/`

---

## Phase 16e: Stable Error Codes `[P1]`

> **Goal**: Every error body has one documented shape, and `code` is always a stable machine-readable value that clients can branch on.

### [ ] One Documented Error Envelope

**What**: Today `GlobalExceptionFilter` copies Nest's `error` field into `code` for framework `HttpException`s (`code = exceptionResponse.code || exceptionResponse.error`), so `code` can be human text such as `Bad Request` or `Unauthorized`. Validation failures and unhandled errors return no `code`, and outside production the body also carries an `error` field with debug detail.

**Scope**:

- Map framework exceptions to stable codes (for example `VALIDATION_FAILED`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `RATE_LIMITED`, `INTERNAL_ERROR`); domain `AppError` codes stay as they are. `code` is always present.
- One error schema (`success`, `statusCode`, `code`, `message`, optional `errors[]`, `timestamp`) published in OpenAPI and referenced by every documented error response. Non-production debug fields are renamed so they cannot be confused with `code`, and documented as development-only.
- ADR recording the envelope and the code naming rule.
- Release note: clients that branch on the old human-text `code` values must switch to the stable codes.

**Done when**: `audit:openapi` covers the error schema and e2e specs assert the shape and code for 400/401/403/404/409/429.

**Location**: `src/filters/global-exception.filter.ts`, `src/infrastructure/swagger/`, `docs/architecture/adr/`, `test/e2e/`

---

## Phase 17: Money & Currency Domain Alignment `[P1]`

> **Goal**: Pricing truth across carts/orders **before** real Stripe.
>
> **MVP foundation already**: cart lines snapshot ISO 4217 currency; mixed currencies rejected; DTOs expose currency.
>
> **HTTP client note**: shipping/tax/discount line items and structured shipping address for honest totals belong here (not in 15b). Until this ships, clients must not invent "Free" shipping without API authority.

### [x] Align Cart/Order Lines on Shared-Kernel `Money`

**What**: Replace raw `price: number` + sibling `currency` on cart (and eventually product write models) with shared-kernel `Money`.

**Scope**:

- `CartItem` stores unit price as `Money`.
- Checkout / order factory maps cart line `Money` without inventing USD defaults.
- Product write path adopts `Money` or keeps explicit DTO mapping so ACL currency stays truthful.
- OpenAPI remains amount + currency fields.

**Location**: `src/shared-kernel/domain/value-objects/money.ts`, `src/modules/carts/`, `src/modules/orders/`, `src/modules/products/`

---

### [ ] Multi-Currency Catalog & FX (Production)

**What**: Multi-market pricing with explicit FX policy.

**Trigger**: Only when business requires non-USD / multi-market.

**Scope**: Store default currency port; cart single-currency policy ADR; FX source/rounding/settlement for Stripe; ADR for major vs minor units.

**Location**: `docs/architecture/adr/`, `src/modules/carts/`, `src/modules/payments/`

---

## Phase 18: Real Stripe SDK Integration & Webhook Idempotency `[P1]`

> **Goal**: Replace mock payment gateway with production Stripe processing.
>
> **Prerequisite**: Phase 15 webhook fail-closed; Phase 17 Money alignment preferred.

### [ ] Real Stripe Integration & Webhook Idempotency

**What**: Stripe SDK adapter + authentic signature verification + event.id dedupe.

**Scope**:

- Stripe SDK secondary adapter for PaymentIntent create/capture/refund.
- Resolve TODO in `stripe-signature.service.ts` with real HMAC verification using webhook secret.
- Persist processed Stripe `event.id` (Redis/DB + TTL) to ignore replays.
- Checkout SAGA (Phase 20) can still run on mock if Stripe is not ready; do not block 20 solely on this.

**Location**: `src/modules/payments/secondary-adapters/stripe/`, `src/modules/payments/secondary-adapters/services/`

---

## Phase 19: Multi-Instance & Distributed Consistency `[P1]`

> **Goal**: Consistent events, jobs, and search across instances. **Complete before deploying to 2+ application instances.**

### [ ] Transactional Outbox Pattern

**What**: `outbox_events` in the same DB transaction as aggregate mutations; processor with `SKIP LOCKED` / BullMQ; idempotent listeners.

**Location**: `src/infrastructure/events/outbox/`

---

### [ ] Singleton Background Jobs & Distributed Locking

**What**: BullMQ repeatable locks / Redlock so only one pod runs singleton schedulers (outbox, cart recovery, inventory audit).

**Location**: `src/infrastructure/jobs/`

---

### [ ] Checkout SAGA Timeout & DLQ Recovery Engine

**What**: Max-duration monitor; trigger compensation on orphaned steps; DLQ + Prometheus counters for unrecoverable failures.

**Location**: `src/modules/orders/primary-adapters/jobs/`

---

### [ ] Product Search Index Reconciliation Job

**What**: Periodic Postgres → RedisSearch reconciliation for catalog drift.

**Location**: `src/modules/products/primary-adapters/jobs/`

---

## Phase 20: Checkout SAGA & Order Events `[P1]`

> **Goal**: Stable HTTP checkout command, BullMQ SAGA, and `orders.created` WebSocket broadcast. Placed **before** email/webhooks; works with mock or real Stripe.
>
> **Hard prerequisite:** Shopper HTTP contract **15b** (done).
>
> **Deferred from 15b** (do not block this phase): self-profile PATCH (`manage_own_profile`) `[P1]`; `GET /v1/orders/mine`, register returns tokens, remove unused body `idempotencyKey` `[P2]`. Shipping/tax/discount → **17**. Receipt email → **21**.

### [x] Checkout SAGA & real-time order events

**What**: Verify at the API boundary:

1. `POST /v1/orders/checkout` returns 201 + `orderId`; idempotency and SAGA jobs run.
2. Inventory lock, mock payment, compensation on failure.
3. `GET /v1/orders/{id}` reflects lifecycle states through `confirmed` / `payment_failed` / `cancelled`.
4. WebSocket `orders.created` emitted on successful order creation.

**Client verification**: companion HTTP clients document their own end-to-end checks; this repository does not own app walkthroughs.

**Location**: `src/modules/orders/`, `src/modules/notifications/`

---

## Phase 21: Notifications, Webhooks & Abandoned Cart Engine `[P2]`

> **Goal**: Outbound email, abandoned cart recovery, and webhook subscriptions (catalog GETs already shipped).
>
> **Storefront note**: do not claim "we emailed a receipt" until order-confirmation email from this phase exists.

### [ ] Real Email and Notification Providers

**What**: Resend/SendGrid adapters; BullMQ outbound mail; order confirmations, password resets, shipping updates.

**Location**: `src/modules/notifications/secondary-adapters/mail/`

---

### [ ] Automated Abandoned Cart Recovery & Shipping Notification Engine

**What**: Cron scan of inactive carts; recovery email links; WebSocket/email on shipping status changes.

**Location**: `src/modules/carts/primary-adapters/jobs/`

---

### [ ] Outbound Webhook Subscription System

**What**: `WebhookSubscription` aggregate; admin CRUD; BullMQ HMAC delivery; `WebhookDeliveryLog`.

**Location**: `src/modules/webhooks/`

---

## Phase 22: Performance Engineering & Observability Maturity `[P2]`

> **Goal**: Measured baselines, runtime profiling, and SLO alerting. (Role-permission cache already shipped.)

### [ ] k6 Load Testing Baseline

**What**: Auth, catalog, cart, concurrent checkout SAGA; smoke/stress/spike; baselines before CI SLO fails.

**Location**: `test/load/`

---

### [ ] Node.js Runtime Profiling & Performance Tuning

**What**: Event loop lag metric; heap dumps; flame graphs under k6.

**New documentation**: `docs/infrastructure/PERFORMANCE-ENGINEERING.md`

**Location**: `test/load/results/`, `docs/infrastructure/`

---

### [ ] Alert Rules, RED/USE Dashboards, and SLOs

**What**: Endpoint SLIs/SLOs; RED/USE dashboards; Alertmanager for 5xx, latency, queue lag, failed jobs.

**Location**: `docker/monitoring/`, `docs/observability/`

---

## Phase 23: Analytics Attention & Operational Facts `[P2]`

> **Goal**: Operational facts for the admin analytics read path. **Trigger**: after real Stripe (18) and live storefront traffic (20).

### [ ] Operational Pulse & Inventory Sell-Through Facts

**What**:

- Add `payment_failed` to attention statuses; expose oldest timestamps.
- Overview KPIs: failed/pending payment counts.
- Low-stock alerts: `unitsSold7d`, expose `reservedQuantity`.

**Location**: `src/modules/analytics/`

---

## Phase 24: Conditional Enterprise & Infrastructure Evolution `[P2]`

> **Goal**: Only when product/ops requirements justify it. Builds on Phase 19 outbox.

### [ ] Message Broker Adapter (Kafka or RabbitMQ)

**What**: Broker transport for outbox processor; consumer groups; DLX; schema versioning.

**New documentation**: `docs/integration/MESSAGE-BROKER-PATTERNS.md`

**Location**: `src/infrastructure/events/broker/`

---

### [ ] Enterprise SaaS Readiness (Multi-Tenancy, Audit Log & Data Exchange)

**What**: Tenant isolation; user permission overrides (if not already sufficient); append-only audit log; CSV/Excel import/export.

**Location**: `src/infrastructure/database/multi-tenancy/`, `src/modules/audit/`, `src/modules/data-exchange/`

---

### [ ] Kubernetes Deployment Configuration & Zero-Downtime Rollouts

**What**: Deployments, Services, Ingress, HPA; canary with SLO rollback.

**New documentation**: `docs/infrastructure/CONTAINER-ORCHESTRATION.md`

**Location**: `k8s/`, `docs/infrastructure/`

---

### [ ] Backup Encryption & Off-Site Cloud Storage

**What**: GPG-encrypt dumps; S3/GCS upload + retention.

**Location**: `scripts/`, `docs/infrastructure/RELEASE-BACKUP-RECOVERY.md`

---

## Phase 25: Catalog & Order Contract Extensions `[P2]`

> **Goal**: Capabilities clients need but the contract does not expose yet. Each item is a real API change: domain model, persistence, OpenAPI, tests. **Trigger**: a client is about to build the feature. Clients must not work around a missing item (no base64 fields, no client-side storage, no derived slugs).
>
> Rules for every item: design for any consumer, not a specific app; replace old shapes in the same change instead of adding compatibility fields; regenerate the OpenAPI snapshot.

### [ ] Media Upload

**What**: Multipart upload operation for product images behind a storage port (local-disk adapter for development, object-storage adapter for deployments). Validate type, size, and dimensions; strip metadata; return an API-served `imageUrl` that products reference. Admin-only permission.

**Location**: `src/modules/media/` (new bounded context), `src/modules/products/`

### [ ] Product Image Gallery

**What**: Ordered image collection per product (primary image first) replacing the single `imageUrl` in one contract change. Depends on Media Upload.

**Location**: `src/modules/products/`

### [ ] Category Image

**What**: Optional image on categories, exposed in category responses and editable through category write operations.

**Location**: `src/modules/products/` (categories)

### [ ] Product Lookup by Slug

**What**: Unique, stable product slugs (generated on create, editable, with uniqueness enforced in the database) and a public read-by-slug operation for human-readable client routes.

**Location**: `src/modules/products/`

### [ ] Order Status History

**What**: Append-only status transitions per order (status, timestamp, actor type) recorded by the order aggregate and exposed on order detail for both shopper and operator reads.

**Location**: `src/modules/orders/`

### [ ] Catalog `inStock` Filter

**What**: Optional `inStock` query parameter on the product list, answered by the read model rather than per-product inventory calls.

**Location**: `src/modules/products/`, catalog read adapters

---

## Engineering Platform & Tooling Backlog

> Future tooling only. Items moved into Phase **15** (Action SHA pins, job timeouts, redis chaos `forceExit`) are tracked there - do not duplicate as pending here once Phase 15 closes them.

- [ ] **Dependency upgrade policy**: `docs/security/DEPENDENCY-UPGRADE-POLICY.md`.
- [/] **Automated architecture linting**: extend `npm run test:arch` with dependency-cruiser and additional layer rules.
- [ ] **Architecture drift detection**: verify module exports and layer dependencies against `docs/architecture/domains/`.
- [ ] **Living architecture dependency graphs**: auto-generate directional dependency maps in CI.
- [ ] **Module architecture scorecards**: per-bounded-context health metrics (entities, repos, events, tests).
- [ ] **ADR validation in CI**: require linked ADR when core architectural policies change.
- [ ] **Modularize CONVENTIONS.md**: split when file exceeds ~500-700 lines.
- [ ] **Property-based domain testing**: evaluate `fast-check` for value-object validation.
- [ ] **Mutation testing**: evaluate Stryker on domain layer.

---

## Skipped (Premature)

| Task                        | Reason                                                                                                                                                                                        | Reconsider When                                                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| DB Sharding                 | PostgreSQL handles millions of rows with proper indexing (Phase 11). Horizontal partitioning adds massive operational complexity.                                                             | Single-node PostgreSQL becomes the bottleneck after index optimization and read replicas are exhausted.                          |
| Event Sourcing              | State-based persistence with SAGA compensation is correct for e-commerce. Event sourcing adds projection/replay complexity with no current benefit.                                           | Domain requires reconstructing full historical state at any millisecond.                                                         |
| Data Archival               | Only relevant when orders table exceeds ~500K rows.                                                                                                                                           | Database storage costs or list queries degrade due to table size.                                                                |
| GraphQL                     | REST + Swagger is sufficient for current clients. GraphQL adds resolver complexity, N+1 risks, and a new security surface.                                                                    | Multiple frontends need significantly different response shapes from the same data.                                              |
| Microservices               | Modular monolith with ACL gateways and domain events is architecturally ready for extraction. Extraction is an operational decision requiring independent deployment and on-call per service. | A single module needs independent scaling, release cadence, or technology stack.                                                 |
| Full Dual-Database CQRS     | CQRS Phase 2 (dedicated read methods, Phase 12) gives most performance benefit at fraction of complexity. Separate read/write DBs require eventual consistency and projection infrastructure. | Read traffic needs independent horizontal scaling from write traffic, or read latency SLOs cannot be met with a single database. |
| gRPC Internal Communication | REST is sufficient for modular monolith. gRPC shines for inter-service communication with strict contracts and low latency.                                                                   | Microservice extraction happens and services need typed, low-latency internal APIs.                                              |
| Redis Cluster / Sentinel    | Single Redis instance is sufficient until availability, memory, throughput, or failover requirements justify distributed Redis topology.                                                      | Redis becomes a production availability bottleneck or exceeds single-instance capacity.                                          |
