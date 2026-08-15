# 🗺️ E-Commerce Store API — Feature Roadmap

> A living roadmap for the E-Commerce Store API project. Each phase includes enough context for any contributor or AI agent to pick up tasks in a fresh session.
>
> **Companion docs**: `[AGENT.md](../AGENT.md)` (coding guidelines), `[docs/architecture/DDD-HEXAGONAL.md](architecture/DDD-HEXAGONAL.md)` (strict DDD reference), `[docs/architecture/CQRS.md](architecture/CQRS.md)` (CQRS read-path analysis), `[docs/integration/INTEGRATION-PATTERNS.md](integration/INTEGRATION-PATTERNS.md)` (cross-context communication), `[docs/security/SECRETS-MANAGEMENT.md](security/SECRETS-MANAGEMENT.md)` (secrets & env management)

---

## How to Use This File

- `[ ]` — Not started
- `[/]` — In progress
- `[x]` — Completed
- Open a new chat, reference this file, and pick the next unchecked task in top-to-bottom order.
- Complete work sequentially by following the priority order below.

---

## ✅ Completed Phases — Summary

> Full implementation detail has been collapsed for readability. The history and decisions are preserved in git.

| Phase   | Name                            | Status  | Key Deliverables                                                                                                                                                                                                                                                                                                                                                                                                                                              | Location                                                                                                                   |
| ------- | ------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **0**   | Foundation                      | ✅ Done | DDD/Hexagonal scaffold · 10 modules (Authentication, Authorization, Carts, Health, Identity, Inventory, Notifications, Orders, Payments, Products) · JWT auth · Passport strategies · Redis WebSocket adapter · BullMQ jobs · Swagger/OpenAPI                                                                                                                                                                                                                 | `src/modules/`, `src/infrastructure/`                                                                                      |
| **1**   | ACL Gateway & SAGA              | ✅ Done | 8 ACL Gateways across Orders, Carts, Authentication · BullMQ checkout SAGA with `CheckoutFailureListener` compensation (refund, stock release, order cancellation) · Gateway DTOs decoupled from domain entities                                                                                                                                                                                                                                              | `src/modules/orders/`, `src/modules/carts/`                                                                                |
| **2**   | Result Pattern & Idempotency    | ✅ Done | Functional `Result<T, E>` across all layers · `@Idempotent()` decorator with Redis-backed store for checkout protection · idempotency fail-open on Redis errors                                                                                                                                                                                                                                                                                               | `src/shared-kernel/`, `src/infrastructure/idempotency/`                                                                    |
| **3**   | Decorator-based Caching         | ✅ Done | `CachedRepository` decorator pattern wrapping Postgres repositories with Redis cache-aside                                                                                                                                                                                                                                                                                                                                                                    | `src/modules/*/secondary-adapters/repositories/cached-*/`                                                                  |
| **4**   | Test Suite Foundation           | ✅ Done | Use case unit tests (all modules) · mock-based repository specs · controller/guard tests · architecture boundary tests (`test:arch`) · shared test helpers · Docker Compose for local dev (PostgreSQL + Redis Stack)                                                                                                                                                                                                                                          | `src/modules/*/`, `src/testing/`, `test/architecture/`                                                                     |
| **5**   | Code Quality (v0.2.0)           | ✅ Done | Removed redundant try/catch from use case/service files · Trimmed orders table indexes · Migration CLI scripts configured (`data-source.ts`, `scripts/docker-migrate.js`)                                                                                                                                                                                                                                                                                     | `data-source.ts`, `package.json`                                                                                           |
| **6**   | Deployment Blockers             | ✅ Done | Multi-stage `Dockerfile` (Node 24 Alpine, tini, non-root) · `GlobalExceptionFilter` · graceful shutdown (`SIGTERM` drain) · `docker-entrypoint.sh` migration runner · `docker-compose.prod.yml` hardening (healthchecks, log rotation, memory limits, network isolation) · `scripts/generate-envs.js`                                                                                                                                                         | `Dockerfile`, `docker-compose.prod.yml`, `scripts/`                                                                        |
| **7**   | Security & Authentication       | ✅ Done | Helmet · CORS whitelist · XSS sanitization · `ValidationPipe` hardening (`forbidNonWhitelisted`) · pagination `@Max(100)` · RSA RS256 JWT · refresh token rotation + reuse detection · session tracking · full RBAC (roles/permissions/guards) · logout/logout-all · authentication endpoint `@Throttle`                                                                                                                                                      | `src/main.ts`, `src/modules/authentication/`, `src/infrastructure/jwt/`                                                    |
| **8**   | Observability & SaaS            | ✅ Done | Winston structured logging · `/health` · correlation ID middleware (`X-Request-Id`) · BullMQ job correlation propagation · API versioning (`/v1`) · Redis-backed rate limiting · Prometheus (`/metrics`) · Grafana/Loki/Tempo stack · OpenTelemetry tracing · hexagonal boundary audit · agent docs (`AGENT.md`, `.agents/`, `docs/ai/`)                                                                                                                      | `src/infrastructure/logging/`, `src/infrastructure/metrics/`, `docker/monitoring/`, `AGENT.md`                             |
| **9**   | Local DB Seeding                | ✅ Done | `npm run db:seed` · module-owned seed use cases · admin & customer accounts · 15-product catalog · inventory levels · documented credentials                                                                                                                                                                                                                                                                                                                  | `scripts/`, `src/modules/*/core/application/seed/`, `docs/development/`                                                    |
| **10**  | Security Hardening Phase 2      | ✅ Done | OWASP Top 10:2025 audit document (`OWASP-COMPLIANCE.md`) · Dependabot + CI `npm audit` scanning · `eslint-plugin-security` static analysis · Winston PII log redaction · `GlobalExceptionFilter` production error code masking · User-scoped `UserThrottlerGuard` rate limiting                                                                                                                                                                               | `.github/`, `docs/security/`, `src/infrastructure/`                                                                        |
| **11**  | Data Integrity & Concurrency    | ✅ Done | OCC version locking (`@VersionColumn`, HTTP 409 conflict filter) · Pessimistic inventory reservation row locking (`SELECT FOR UPDATE`) · Redis-backed cart TTL (30 days) with RedisJSON storage & graceful re-initialization · BullMQ inventory reconciliation audit job (`inventory_drift_count` Prometheus metric) · Transaction isolation level audit & query composite/partial index optimization                                                         | `src/modules/*/`, `src/infrastructure/database/`, `docs/data/`                                                             |
| **12**  | CQRS Read Path                  | ✅ Done | Query ports & flat read DTOs (7 modules) · TypeORM JOIN query adapters & mappers · read use case refactor · controller presentation updates · application command contracts · Testcontainers integration specs · `EXPLAIN ANALYZE` index verification · 18/18 architecture boundary rules                                                                                                                                                                     | `src/modules/*/core/application/queries/`, `src/modules/*/secondary-adapters/query/`, `test/integration/`, `docs/testing/` |
| **12b** | CI/CD Pipeline (GitHub Actions) | ✅ Done | Fan-out/fan-in CI (`lint`, `typecheck`, `unit`, `arch`, `audit`, `build`, `integration`, `e2e`, `smoke`) · **CI Status Check** aggregator · `prepare-test-env` composite action · blocking `npm audit --omit=dev --audit-level=high` · PR dependency review · Docker validate (PR) · GHCR publish (`master` + semver tags) · `scripts/smoke-test.js` · `start:test` · liveness/readiness probes · Bitbucket Pipelines removed · `PROJECT-PIPELINE.md` updated | `.github/workflows/ci.yml`, `.github/actions/prepare-test-env/`, `scripts/smoke-test.js`, `docs/infrastructure/cicd/`      |

> **Note**: Health probes and smoke runner shipped with CI; backup/restore scripts and runbook remain for Phase 14.

---

## 📋 Pending Work — Execution Sequence

> **Execution guide**: Pick tasks strictly in order from top to bottom. Do not deploy the first production release until **Phase 14 (Single-Instance Production Deploy Gate)** is completed. Complete **Phase 15** before scaling to multiple application instances.

| Phase  | Name                                              | Status | Target / Focus                                                                                   |
| ------ | ------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| **10** | Security Hardening Phase 2                        | `[x]`  | **Security** — OWASP audit, Dependabot, user-scoped rate limits                                  |
| **11** | Data Integrity & Concurrency                      | `[x]`  | **Data & Stock** — OCC version locking, inventory audit, cart TTL                                |
| **12** | CQRS Read Path                                    | `[x]`  | **Read Path** — flat read DTOs, cross-context SQL JOIN adapters across all modules               |
| **13** | Production Confidence & Integration Testing       | `[/]`  | **Integration confidence** — real DB repos, concurrent checkout proof, E2E core flows            |
| **14** | Single-Instance Production Gate                   | `[ ]`  | **First Production Ship** — baseline migration, Redis graceful degradation, probes, backup/smoke |
| **15** | Multi-Instance & Distributed Consistency          | `[ ]`  | **Horizontal scale** — outbox, singleton jobs, SAGA recovery, search reconciliation              |
| **16** | Performance Engineering                           | `[ ]`  | **Performance** — k6 baselines, V8 profiling, RED/USE Grafana alert rules                        |
| **17** | Product Ecosystem & Integrations                  | `[ ]`  | **Features & Payments** — real email, cart recovery, webhooks, Stripe webhook dedup              |
| **18** | Conditional Enterprise & Infrastructure Evolution | `[ ]`  | **When justified** — message broker, multi-tenancy, K8s, encrypted off-site backups              |

---

## 🚧 Pre-Production Checklist

---

### Step 1: Single-Instance Production Ship Blockers (Must complete before first deploy)

| Task / Item                                                                                                                                         | Phase  | Critical Purpose                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------- |
| [x] IDOR / object-level access control on carts, orders, payments & customer profile                                                                | **10** | Resolved via `CallerContext`, `CartOwnershipValidator` & `OwnedResourceAccessPolicy`     |
| [x] OWASP audit doc + dependency scanning in CI (`.github/dependabot.yml` + blocking `npm audit:check` + PR dependency review)                      | **10** | Prevents supply-chain vulnerabilities; high/critical prod deps block merge               |
| [x] Production error stack masking & PII log audit verified                                                                                         | **10** | Verifies `GlobalExceptionFilter` & Winston do not leak sensitive payloads/stacks in prod |
| [x] Optimistic concurrency (schema @VersionColumn + 409 on conflict + pure domain isolation per CONVENTIONS.md §13)                                 | **11** | Prevents lost updates during concurrent edits by multiple users or admins                |
| [x] Shopping Cart Expiration & Redis-backed cart TTL enforcement                                                                                    | **11** | Automatically cleans up stale cart instances (RedisJSON storage, key TTL)                |
| [x] CQRS read path — query ports, JOIN adapters, flat list/detail DTOs (Orders, Inventory, Payments, Products, Carts, Identity, Notifications done) | **12** | Solves UI N+1 queries by returning resolved customer names/SKUs in a single SQL query    |

| [ ] Initial database baseline migration generated & verified | **14** | Schema must be reproducible without relying on `synchronize: true` |
| [ ] Redis graceful degradation & `trust proxy` hardening | **14** | Prevents 5xx HTTP drops on Redis disconnects & captures real client IP behind proxy |
| [x] Liveness, Readiness & `ProcessHealthIndicator` probes | **14** | `/health/liveness` (process) and `/health/readiness` (PostgreSQL + Redis) |
| [/] Backup, restore, rollback runbook & smoke test runner | **14** | Smoke runner in CI done; script cleanup + backup/restore runbook pending |
| [ ] Production secret rotation procedures documented | **14** | Rotate JWT, DB, Redis, and third-party secrets without breaking production |

---

### Step 2: Verification & Test Safety Net

| Task / Item                                                                                         | Phase     | Critical Purpose                                                            |
| --------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------- |
| [x] E2E core flow tests — auth lifecycle + IDOR denial + SAGA happy path + CQRS list shapes         | **13**    | Pre-deploy verification via `supertest`; not post-deploy smoke probes       |
| [x] HTTP checkout/auth contract completeness (cart id, payment intent id, versioned refresh cookie) | **13**    | Lets clients and E2E drive checkout without reaching into repositories      |
| [x] Checkout idempotency E2E — same key replay must not create a second checkout                    | **13**    | Proves `@Idempotent()` on checkout; do after HTTP contracts exist           |
| [ ] E2E suite quality polish (error bodies, spec naming, remaining optional specs)                  | **13**    | Optional P2 — does not block first deploy                                   |
| [ ] HTTP idempotency hardening (namespace, dual headers, persist-on-complete)                       | **14 P2** | After checkout idempotency E2E; does **not** block first deploy             |
| [x] Order lifecycle domain policy (`OrderWorkflow`, shipping-address validation)                    | **13**    | Centralized transition policy and domain specs                              |
| [x] Repository integration tests (Testcontainers / real DB)                                         | **13**    | All postgres write adapters + cached wrappers (except cached cart)          |
| [x] Concurrent checkout integration proof (pessimistic lock verification)                           | **13**    | Repository-level reservation proof — parallel saves against last stock unit |

---

### Step 3: Multi-Instance & Distributed Consistency (Before scaling to 2+ pods)

| Task / Item                                                          | Phase  | Critical Purpose                                                                     |
| -------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| [ ] Transactional Outbox Pattern for domain events                   | **15** | Durable, at-least-once event publication across process crashes                      |
| [ ] Singleton background jobs & distributed locks (BullMQ / Redlock) | **15** | Only one pod executes a singleton scheduled job at a time                            |
| [ ] Checkout SAGA Timeout & Dead-Letter Queue (DLQ) Recovery Engine  | **15** | Recovers stuck checkout transactions and dispatches alerts on unrecoverable failures |
| [ ] Product Search Index Reconciliation Job                          | **15** | Reconciles RedisSearch catalog indexes with PostgreSQL source of truth               |
| [x] User-scoped adaptive rate limiting                               | **10** | Scopes rate limiting per authenticated user ID (`sub`) to stop targeted user abuse   |

---

## 🧪 Phase 13 — Production Confidence & Integration Testing

> **Goal**: Prove the application **behaves correctly** (real DB, concurrency, E2E core flows). Operating a live instance is Phase 14.

**Required to leave Phase 13** (this order): HTTP checkout/auth contracts → HTTP-only E2E → checkout idempotency E2E.

**Optional (do not block Phase 14):** E2E suite quality, extra business specs, domain test polish.

HTTP idempotency **hardening** is Phase 14 optional P2 — not a remaining Phase 13 task.

---

### [x] Test Infrastructure, Fixture & Mock Baseline

**What**: Standardize shared helpers and create typed gateway/repository mock classes.

**Scope**:

- [x] Create `testing/index.ts` barrel files for **Authentication**, **Carts**, **Inventory**, and **Payments** modules to unify exports.
- [x] Create reusable, typed **ACL Gateway Mock** classes for the 8 gateway ports.
- [x] Fix the **Products** testing barrel to export all helpers.

**Location**: `src/testing/`, `src/modules/*/testing/`

---

### [x] Domain Entity Unit Tests

**What**: Isolated unit tests for core business invariants, state machines, and value objects.

**Scope**:

- [x] Cover order state transitions, cart invariants, address promotion, reservation TTL, payment capture/refund rules, product SKU/price invariants.

**Location**: `src/modules/*/core/domain/entities/`

**Methodology**: [`docs/testing/DOMAIN-ENTITY-TESTING.md`](testing/DOMAIN-ENTITY-TESTING.md)

---

### [x] Order Lifecycle Domain Policy Polish

**What**: Fix `isTerminal()` semantics, centralize order transitions in `OrderWorkflow`, add independent workflow tests and `shipping-address.spec.ts`.

**Scope**:

- [x] Fix `isTerminal()` — terminal = `CANCELLED`, `REFUNDED` only
- [x] Extract `OrderWorkflow` (`canTransition`, `ensureTransition`, `isTerminal`)
- [x] Wire `OrderStatusVO` and `Order` to delegate to `OrderWorkflow`
- [x] `order-workflow.spec.ts` with independent transition matrix
- [x] Slim `order-status.spec.ts`; add `shipping-address.spec.ts`
- [x] Update `DOMAIN-ENTITY-TESTING.md`

**Location**: `src/modules/orders/core/domain/policies/`, `src/modules/orders/core/domain/value-objects/`

---

### [x] Repository Integration Tests (Real DB) & Pessimistic Lock Proof

**What**: Test transactional persistence boundaries against a real database (PostgreSQL Testcontainers).

**Scope**:

- [x] Run postgres and cached repository specs against real PostgreSQL — **not** mocked TypeORM repositories.
- [x] **Concurrent Checkout Proof**: Execute simultaneous checkout operations against the last remaining stock unit and verify PostgreSQL row locking serializes reservation attempts and prevents overselling.
- [x] Test cached repository wrappers: cache hit/miss, invalidation on write, Redis unavailable fallback.

**Location**: `src/modules/*/secondary-adapters/repositories/`

---

### [x] Atomic OCC save predicates (follow-up — not blocking E2E)

**What**: Align Product / Order / User / Cart `save(entity, expectedVersion)` with Inventory's atomic `UPDATE … WHERE version = :expectedVersion` so stale versions fail (HTTP 409).

**Why**: Policy (`WHEN-TO-USE-OPTIMISTIC-VS-PESSIMISTIC-LOCKING.md`, CONVENTIONS.md §13) requires OCC on concurrent CRUD aggregates. Real-DB tests showed Product TypeORM `save()` on a detached entity **increments** `@VersionColumn` but **does not reject** a stale `expectedVersion`. Inventory already enforces the predicate.

**Location**: `src/modules/{products,orders,identity,carts}/secondary-adapters/repositories/`

---

### [x] E2E Core Flow Tests

**What**: Pre-deploy end-to-end HTTP verification of core flows, security IDOR denial, and CQRS read shapes via `supertest`.

**Scope**:

- [x] Auth: register → login → get token → use token → refresh (with rotation) → logout
- [x] Security: Customer A blocked from reading/updating Customer B's carts, orders, and payments (IDOR prevention)
- [x] Checkout SAGA: full purchase happy path + compensation flow on simulated payment failure
- [x] CQRS projections: order list returns resolved `userName`; order detail items return `sku`

**Location**: `test/` (`authentication-lifecycle.e2e-spec.ts`, `security-idor.e2e-spec.ts`, `checkout-saga.e2e-spec.ts`)

---

### Remaining required

### [x] HTTP Checkout & Auth Contract Completeness (E2E follow-up)

**What**: Close HTTP gaps that forced checkout/IDOR E2E to resolve cart, payment-intent, and inventory state via `moduleRef`. Do **not** apply DDD/Hexagonal to E2E or smoke scripts — keep those black-box HTTP.

**Why**: `POST /carts` does not return a cart id; payment read DTOs omit `gatewayPaymentIntentId`; refresh cookies are set for path `/authentication` while the API is URI-versioned (`/v1/authentication/...`). Storefront clients and HTTP-only E2E need the same contracts.

**Order**: Fix these production contracts first → make E2E HTTP-only → **checkout idempotency E2E** (existing interceptor contract) → **stop polishing E2E** → Phase 14 ship gate. Remaining optional specs and idempotency hardening must not delay the first deploy.

**Scope**:

- [x] `POST /v1/carts` returns the created cart (or the existing user cart) including `id`.
- [x] Payment detail / get-by-order includes `gatewayPaymentIntentId` (needed for webhook-driven checkout).
- [x] `RefreshTokenCookieInterceptor` matches versioned routes (`/v1/authentication/login`, `/refresh`, `/logout`, `/logout-all`) so HttpOnly refresh cookies attach in browsers.
- [x] After the contracts exist: remove `CartRepository`, `PaymentRepository`, and `InventoryQueryService` from `test/checkout-saga.e2e-spec.ts` and `test/security-idor.e2e-spec.ts` (HTTP-only).
- [x] **Checkout idempotency E2E** — encode the **existing** interceptor contract (`IdempotencyInterceptor` + Redis store), do not invent a new one:
  - Key: `x-idempotency-key` header, else `body.idempotencyKey`. Missing key = no idempotency.
  - Protects the **HTTP checkout command** (cached response), not the whole SAGA worker chain.
  - Completed key: replay returns the **cached original response** (same `orderId` / `jobId`). Key is not bound to payload — same key + different body still replays the first result (do not assert a 409 unless the implementation is changed to fingerprint the body).
  - In-progress key: HTTP **409** `A request with this idempotency key is already in progress`.
  - Failed first request: key is **released** so a retry may proceed.
  - TTL: 24 hours (`IDEMPOTENCY_REDIS.EXPIRATION`). Fail-open if Redis errors.
  - Assert: one order, not two; replay does not create a second reservation/payment as a consequence of a second checkout HTTP success.

**Location**: `src/modules/carts/`, `src/modules/payments/`, `src/modules/authentication/primary-adapters/interceptors/`, `test/`

---

### Optional (does not block Phase 14)

### [ ] E2E Suite Quality (Optional — P2)

**What**: Improve readability and flake resistance of existing E2E without adding hexagonal layers to tests. Does **not** block Phase 14.

**Scope**:

- [ ] Rename or move `test/authentication.e2e-spec.ts` so it is clearly a **mocked controller contract** test, not a full-app E2E.
- [ ] Assert HTTP error **payload** shape (status + `message`/`error`) on failure paths, not status ranges alone.
- [ ] Do not tight-loop `GET /v1/inventory/products/:id` (public throttler → 429). Wait via slower polls or one HTTP assert after the SAGA settles.

**Optional extra full-app specs** (priority order — only after HTTP-only checkout + idempotency E2E exist; do not turn into a mini-project):

1. [ ] Empty cart / insufficient stock HTTP contracts (no payment intent / no confirmed order).
2. [ ] Admin ship/cancel after confirm.
3. [ ] Ignored Stripe webhook event type (lowest value for first deploy).

**Location**: `test/`

---

### [ ] Domain Test Polish (Optional — P2)

> Pick up when touching related modules. Not on the critical path to production.

**Scope**:

- [ ] `notification.spec.ts` — status transitions if notification lifecycle grows
- [ ] `user-role-assignment.spec.ts` — only if assignment invariants become non-trivial
- [ ] `order-items.spec.ts`, `payment-status.spec.ts` — entity specs partially cover these today
- [ ] Refactor legacy domain specs (`user.spec.ts`, `role.spec.ts`) to GWT when modified
- [ ] Dead/unused value-object audit — `Email`, `Phone`, `CartTotal`, `CartOwner`, `StockReservation`: wire into domain or remove
- [ ] ADR (`ADR-XXXX`) if order lifecycle rules change materially (refund-from-delivered policy, new terminal states)

**Location**: `src/modules/*/core/domain/`

---

## 🚀 Phase 14 — Single-Instance Production Deploy Gate

> **Goal**: Prove you can **operate** a single application instance without being reckless (migrations, Redis/proxy, backup/restore, secrets, smoke). This is the **first private production deployment gate**, not a claim that the API is a production-grade ecommerce platform. Phases 15–17 still contain major capabilities.
>
> **Required for the ship gate:** baseline migration, Redis/proxy behavior, backup/restore/rollback, secret rotation, smoke.
>
> **Optional (do not block first deploy):** HTTP idempotency hardening; staging environment.

---

### [ ] Initial Database Baseline Migration

**What**: Generate the initial database schema baseline migration from the current TypeORM entities to enable safe production schema updates.

**Scope**:

- [ ] Generate the baseline database migration script utilizing TypeORM CLI (`npm run migration:generate:prod`).
- [ ] Run forward migrations on a **clean** PostgreSQL database (schema from scratch).
- [ ] Run forward migrations against an **existing** database (upgrade path).
- [ ] Verify migration **rollback** scripts function properly.
- [ ] Document and verify **migration failure** behavior (startup abort, no partial corrupt state).
- [ ] Confirm **`synchronize: true` is never enabled in production**.
- [ ] Update deployment configurations to execute migrations automatically on server startup via `docker-entrypoint.sh`.

**Location**: `src/infrastructure/database/migrations/`, `scripts/docker-migrate.js`

---

### [ ] Graceful Degradation & Reverse Proxy Hardening (`trust proxy` & Redis)

**What**: Configure reverse proxy compatibility and ensure caching, rate limiting, and session layers degrade gracefully if Redis goes offline.

**Scope**:

- [ ] Configure Express `trust proxy` in NestJS bootstrap (`src/main.ts`) to match the **actual production proxy topology** (CDN / load balancer / reverse proxy hop count). `trust proxy = 1` is only correct for a single trusted hop — verify client-IP and rate-limit behavior; do not assume `1` is always right.
- [ ] Harden central Redis client configuration with connection retry strategies and drop event handlers.
- [ ] Refactor cache-aside repository wrappers to query the database directly on cache misses when Redis is offline.
- [ ] Treat Redis-down as **per-concern**, not one policy: cache → DB fallback; throttler → documented degraded/fallback; idempotency → documented fail-open tradeoff; session/refresh → as designed; carts → RedisJSON persistence behavior; BullMQ → operational impact (jobs stop). Catch disconnects with logged warnings instead of unexplained 5xx HTTP drops.

**Location**: `src/main.ts`, `src/infrastructure/redis/`, `src/infrastructure/idempotency/`

---

### [x] Liveness, Readiness & Process Health Probes

**What**: Expose dedicated health check endpoints for container runtime orchestrators, including V8 runtime process checks.

**Scope**:

- [x] Implement `ProcessHealthIndicator` measuring event loop lag and RSS memory limits.
- [x] Implement `/health/liveness` returning process viability.
- [x] Implement `/health/readiness` checking external dependencies (PostgreSQL + Redis).
- [x] Expose probes in HealthController; Dockerfile uses liveness, Compose prod uses readiness.
- [ ] Update Swagger documentation for probe endpoints.

**Location**: `src/modules/health/`

---

### [/] Release, Rollback, Backup Procedures & Smoke Test Runner

**What**: Build deployment pipeline smoke tests, database backup scripts, and disaster recovery runbooks.

**Scope**:

- [ ] Write Node.js scripts to automate PG database backups (`db-backup.js`) and restore procedures (`db-restore.js`).
- [x] Build a post-deploy smoke test runner (`smoke-test.js`) targeting liveness/readiness, `/metrics`, register/login, and authenticated profile access.
- [x] Wire smoke runner into GitHub Actions CI (Postgres + Redis services, `dist` artifact, migrations).
- [ ] Refactor `scripts/smoke-test.js` into small HTTP helpers under `scripts/smoke/` — **not** Nest use cases. Smoke runs against a deployed process; it cannot `app.get()` module ports.
- [ ] Keep smoke as process-alive probes only (no checkout SAGA, queues, or Stripe). That remains `npm run test:e2e`.
- [ ] Soften the success log so it does not claim “production deployment verified”; it verifies probes answered.
- [ ] Document comprehensive release, rollback, disaster recovery procedures in `docs/infrastructure/RELEASE-BACKUP-RECOVERY.md`.
- [ ] **Restore drill (definition of done)**: backup → destroy/clean disposable DB → restore → migrate if needed → app starts → smoke tests pass.

**Location**: `scripts/`, `docs/infrastructure/RELEASE-BACKUP-RECOVERY.md`

---

### [ ] Production Secret Rotation Procedures

**What**: Document how to rotate production secrets without breaking running sessions or deployments.

**Scope**:

- [ ] Document rotation procedure for JWT signing keys (consider active session impact).
- [ ] Document rotation for database and Redis credentials.
- [ ] Document rotation for metrics/API keys and third-party secrets (Stripe, webhooks, email providers).
- [ ] Cross-reference [`SECRETS-MANAGEMENT.md`](security/SECRETS-MANAGEMENT.md) where procedures already exist.

**Location**: `docs/security/SECRET-ROTATION.md`

---

### [ ] HTTP Idempotency Hardening (Optional — P2)

> **Does not block the Phase 14 ship gate.** Do this **after** checkout idempotency E2E exists. Do **not** open a design/plan workstream. Current `@Idempotent()` + Redis `SET NX` is good enough to ship; this is a short implementation pass.

**What**: Tighten HTTP command idempotency without changing SAGA/outbox semantics.

**Scope**:

- [ ] Namespace Redis keys with authenticated `userId` + HTTP method + route (stop cross-user / cross-route key collisions).
- [ ] Accept `Idempotency-Key` as well as `x-idempotency-key` (body `idempotencyKey` remains fallback).
- [ ] If `SET NX` fails and `GET` misses (TTL race), retry as a new lock — do not 409.
- [ ] If `complete()` cannot persist the cached body, fail the request (logged error); do not succeed HTTP and then allow a retry to create a second checkout.
- [ ] Optional: `Retry-After` on in-progress **409**.
- [ ] Align docs with the store: Redis `SET NX` (not Redlock); fail-open on Redis errors is not exactly-once; interceptor covers the HTTP checkout command, not the worker chain (`FEATURES.md`, `OWASP-COMPLIANCE.md`, README).
- [ ] Update checkout idempotency E2E to the hardened contract (dual headers, namespaced keys). Do **not** add payload fingerprinting, Redlock, or SAGA-wide idempotency here (Phase 15/17).

**Location**: `src/infrastructure/idempotency/`, `src/infrastructure/interceptors/idempotency.interceptor.ts`, `test/`

---

### [ ] Staging / Production-Like Environment (Recommended)

> Recommended before public demo or stakeholder review. **Not required** to ship the first private production instance.

**What**: Deploy a constrained staging environment mirroring production topology.

**Scope**:

- [ ] Deploy API + managed PostgreSQL/Redis to hosting platform (Railway/Render/Fly.io).
- [ ] Expose Swagger/OpenAPI publicly; protect `/metrics` via API key.
- [ ] Execute seed data script (`npm run db:seed`).

**Location**: `scripts/`, `docs/infrastructure/`

---

## 🛡️ Phase 15 — Multi-Instance & Distributed Consistency

> **Goal**: Prepare for multi-pod scaling behind a load balancer — distributed consistency for events, jobs, SAGA recovery, and derived search indexes. **Complete before deploying to 2+ application instances.**

---

### [ ] Transactional Outbox Pattern (Cross-Instance Event Backbone)

**What**: Store domain events in an `outbox_events` table within the same database transaction as aggregate mutations to provide durable, at-least-once event publication across process crashes.

**Scope**:

- [ ] Create `outbox_events` table schema: `id`, `eventName`, `payload` (JSON), `status`, `retries`, `correlationId`, timestamps.
- [ ] Ensure aggregate mutation and outbox record commit atomically in one DB transaction.
- [ ] Implement outbox processor to claim pending rows (e.g. PostgreSQL `SKIP LOCKED`) and publish to subscribers.
- [ ] Schedule/trigger processing (BullMQ or equivalent — implementation detail, not the guarantee).
- [ ] Audit domain event listeners to ensure they are **idempotent**.

**Location**: `src/infrastructure/events/outbox/`

---

### [ ] Singleton Background Jobs & Distributed Locking

**What**: Implement distributed locking so only one pod executes a singleton scheduled job at a time in multi-instance deployments.

**Scope**:

- [ ] Configure BullMQ repeatable job locks / Redis Redlock wrappers for recurring tasks.
- [ ] Prevent duplicate execution of background scheduled jobs (outbox processor, cart recovery, inventory audit) across concurrent API pods.

**Location**: `src/infrastructure/jobs/`

---

### [ ] Checkout SAGA Timeout & Dead-Letter Queue (DLQ) Recovery Engine

**What**: Implement max-duration timeouts and automated compensation trigger for hanging or orphaned checkout SAGA executions.

**Scope**:

- [ ] Add SAGA step execution timeout monitor (e.g. 5 minutes max per checkout session).
- [ ] Automatically trigger `CheckoutFailureListener` compensation handlers if a SAGA step crashes without resolving.
- [ ] Route unrecoverable SAGA failures to a dedicated BullMQ Dead-Letter Queue (DLQ) and fire Prometheus alert counters.

**Location**: `src/modules/orders/primary-adapters/jobs/`

---

### [ ] Product Search Index Reconciliation Job

**What**: Build a scheduled background worker to reconcile RedisSearch product catalog indexes with PostgreSQL canonical data.

**Scope**:

- [ ] Implement a BullMQ job that periodically scans PostgreSQL products and re-indexes missing or modified items into RedisSearch.
- [ ] Fix catalog search drift caused by direct DB updates or cache flushes.

**Location**: `src/modules/products/primary-adapters/jobs/`

---

## 📈 Phase 16 — Performance Engineering & Observability Maturity

> **Goal**: Define reliability metrics, establish automated performance test baselines, profile the runtime, and provision alert dashboards.

---

### [ ] k6 Load Testing Baseline

**What**: Build and run k6 load testing suites to discover bottlenecks and establish baseline API latency metrics under stress.

**Scope**:

- [ ] Write k6 scripts targeting auth lifecycles, catalog searches, cart operations, and concurrent checkout SAGA.
- [ ] Run load profiles (smoke, stress, spike) and capture measured latency/reliability baselines per endpoint.
- [ ] Define endpoint-specific SLO targets from baseline data before enforcing thresholds in CI.
- [ ] Configure CI checks to fail only after SLO targets are established and agreed.

**Location**: `test/load/`

---

### [ ] Node.js Runtime Profiling & Performance Tuning

**What**: Profile Node's V8 engine and event loop performance under heavy loads to find memory leaks and CPU-heavy hot paths.

**Scope**:

- [ ] Implement Prometheus metrics tracking Event Loop Lag (`nodejs_eventloop_lag_seconds`).
- [ ] Document heap-dump capture procedures.
- [ ] Generate CPU flame graphs using `clinic.js` or `0x` under simulated k6 load tests.

**New documentation**:

- [ ] `docs/infrastructure/PERFORMANCE-ENGINEERING.md` — Performance engineering guide covering k6, capacity planning, profiling, and caching.

**Location**: `test/load/results/`, `docs/infrastructure/`

---

### [ ] Alert Rules, RED/USE Dashboards, and SLOs

**What**: Formulate actionable alerting rules, provision custom Grafana dashboards, and document operational runbooks.

**Scope**:

- [ ] Define endpoint-specific SLIs/SLOs (latency, checkout success, queue lag) from measured baselines.
- [ ] Build RED dashboards for the API and USE dashboards for PostgreSQL/Redis/BullMQ.
- [ ] Setup Prometheus Alertmanager rules for 5xx spikes, high latency, queue backlog depths, and failed background jobs.

**Location**: `docker/monitoring/`, `docs/observability/`

---

## 📦 Phase 17 — Product Ecosystem, Webhooks & Real Integrations

> **Goal**: Elevate store value by integrating real communication providers, automated cart recovery, outbound webhook subscriptions, and production Stripe payments with webhook deduplication.

---

### [ ] Customer Catalog Read Path (Storefront API)

**What**: Let a `CUSTOMER` (or public shopper) list and get products for shopping without admin catalog permissions.

**Why**: `GET /v1/products` currently requires `view_all_products` / create requires `manage_products`. A storefront cannot browse the catalog with the default customer role. This is a store API gap, not a SAGA design gap.

**Scope**:

- [ ] Introduce customer-scoped (or `@Public()` read) product list/detail permissions distinct from admin `manage_products`.
- [ ] Keep mutations (`POST`/`PATCH`/`DELETE` products) admin-only.
- [ ] E2E or API contract: registered customer can list a product created by admin and add it to a cart without `manage_products`.

**Location**: `src/modules/products/`, `src/modules/authorization/core/domain/reference-data/`

---

### [ ] Real Email and Notification Providers

**What**: Integrate real email delivery gateways (SendGrid/Resend) behind the existing notification gateway port.

**Scope**:

- [ ] Implement Resend or SendGrid secondary adapters for the notification gateway port.
- [ ] Build BullMQ queues to handle outbound email sending asynchronously with retry policies.
- [ ] Wire up order confirmations, password resets, and shipping updates to trigger real emails.

**Location**: `src/modules/notifications/secondary-adapters/mail/`

---

### [ ] Automated Abandoned Cart Recovery & Shipping Notification Engine

**What**: Implement background job schedulers that scan for inactive carts and dispatch recovery emails.

**Scope**:

- [ ] Implement a BullMQ scheduler job scanning inactive carts (e.g. 12+ hours).
- [ ] Generate recovery email templates with single-click checkout restoration links.
- [ ] Dispatch real-time WebSocket events and emails when order shipping status changes.

**Location**: `src/modules/carts/primary-adapters/jobs/`

---

### [ ] Outbound Webhook Subscription System

**What**: Build a secure webhook subscription framework that allows external merchant applications to receive real-time order and payment event payloads.

**Scope**:

- [ ] Create `WebhookSubscription` aggregate: `id`, `targetUrl`, `secret`, `events` (e.g. `order.created`, `payment.captured`), `isActive`, `createdAt`.
- [ ] Implement admin CRUD endpoints under RBAC.
- [ ] Build BullMQ webhook delivery queue signing payloads with HMAC-SHA256 signatures in headers.
- [ ] Maintain `WebhookDeliveryLog` table recording delivery status, HTTP status codes, and latencies.

**Location**: `src/modules/webhooks/`

---

### [ ] Real Stripe Integration & Webhook Idempotency

**What**: Replace mock payment gateway with production Stripe SDK integration and explicit webhook event deduplication.

**Scope**:

- [ ] Implement Stripe SDK secondary adapter for `PaymentIntent` creation, capture, and refunds.
- [ ] Implement signed Stripe webhook controller verifying `stripe-signature` header.
- [ ] **Stripe Webhook Idempotency**: Persist processed `event.id` values to Redis/DB with TTL to prevent duplicate processing of replayed webhook events.

**Location**: `src/modules/payments/secondary-adapters/stripe/`

---

## 🌐 Phase 18 — Conditional Enterprise & Infrastructure Evolution

> **Goal**: Optional enterprise capabilities and infrastructure — only when product or operational requirements justify them. Message broker adapters build on Phase 15 outbox (outbox = durable handoff; broker = cross-process transport when needed).

---

### [ ] Message Broker Adapter (Kafka or RabbitMQ)

**What**: Broker adapter for cross-process event streaming when the outbox processor needs external transport. Builds on Phase 15 transactional outbox — the outbox remains the durable handoff from DB writes; the broker is the transport layer when justified.

**Trigger**: Implement only when cross-process throughput, independent consumer scaling, durability, or organizational boundaries require a dedicated broker.

**Scope**:

- [ ] Implement broker adapter implementing `DomainEventPublisher` port.
- [ ] Enable consumer group scaling, dead-letter exchanges, and schema versioning.

**New documentation**:

- [ ] `docs/integration/MESSAGE-BROKER-PATTERNS.md`

**Location**: `src/infrastructure/events/broker/`

---

### [ ] Enterprise SaaS Readiness (Multi-Tenancy, Audit Log & Data Exchange)

**What**: Multi-merchant SaaS scaling, user permission overrides, immutable admin audit trails, and bulk CSV/Excel import/export.

**Scope**:

- [ ] Implement schema-per-tenant or row-level tenant data isolation.
- [ ] Implement user-level permission overrides merging role permissions with explicit user exceptions.
- [ ] Implement append-only `AuditLog` entity recording sensitive admin actions.
- [ ] Build background CSV/Excel import/export processors with dry-run support.

**Location**: `src/infrastructure/database/multi-tenancy/`, `src/modules/audit/`, `src/modules/data-exchange/`

---

### [ ] Kubernetes Deployment Configuration & Zero-Downtime Rollouts

**What**: Package the API monolith using production-grade Kubernetes resource manifests and Canary deployment rollouts.

**Trigger**: Implement only when deployment needs pod orchestration, HPA, or multi-region rollout beyond Docker + managed DB/Redis + load balancer.

**Scope**:

- [ ] Write Pod Deployments, Service routes, Ingress gateways, and HPA templates.
- [ ] Configure Canary routing configurations in Kubernetes Ingress controllers with automated SLO rollback.

**New documentation**:

- [ ] `docs/infrastructure/CONTAINER-ORCHESTRATION.md`

**Location**: `k8s/`, `docs/infrastructure/`

---

### [ ] Backup Encryption & Off-Site Cloud Storage

**What**: Encrypt database backup dumps and automate off-site storage to cloud object stores for disaster recovery.

**Scope**:

- [ ] Wrap `db-backup.js` with GPG asymmetric encryption.
- [ ] Automate upload of encrypted backups to cloud object stores (AWS S3 / GCS) with retention policies.

---

## 🛠️ Engineering Platform & Tooling Backlog

> Future tooling only — completed CI/CD and supply-chain work lives in Phases 10 and 12b.

- [ ] **Dependency upgrade policy** — `docs/security/DEPENDENCY-UPGRADE-POLICY.md`.
- [/] **Automated architecture linting** — extend `npm run test:arch` with dependency-cruiser and additional layer rules.
- [ ] **Architecture drift detection** — verify module exports and layer dependencies against `docs/architecture/domains/`.
- [ ] **Living architecture dependency graphs** — auto-generate directional dependency maps in CI.
- [ ] **Module architecture scorecards** — per-bounded-context health metrics (entities, repos, events, tests).
- [ ] **ADR validation in CI** — require linked ADR when core architectural policies change.
- [ ] **Modularize CONVENTIONS.md** — split when file exceeds ~500–700 lines.
- [ ] **Property-based domain testing** — evaluate `fast-check` for value-object validation.
- [ ] **Mutation testing** — evaluate Stryker on domain layer.

---

## ❌ Skipped (Premature)

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
