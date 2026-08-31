# 🗺️ E-Commerce Store API: Feature Roadmap

> A living roadmap for the E-Commerce Store API project. Each phase includes enough context for any contributor or AI agent to pick up tasks in a fresh session.
>
> **Companion docs**: `[AGENT.md](../AGENT.md)` (coding guidelines), `[docs/architecture/DDD-HEXAGONAL.md](architecture/DDD-HEXAGONAL.md)` (strict DDD reference), `[docs/architecture/CQRS.md](architecture/CQRS.md)` (CQRS read-path analysis), `[docs/integration/INTEGRATION-PATTERNS.md](integration/INTEGRATION-PATTERNS.md)` (cross-context communication), `[docs/security/SECRETS-MANAGEMENT.md](security/SECRETS-MANAGEMENT.md)` (secrets & env management)

---

## How to Use This File

- `[ ]`: Not started
- `[/]`: In progress
- `[x]`: Completed
- Open a new chat, reference this file, and pick the next unchecked task in top-to-bottom order.
- Complete work sequentially by following the priority order below.

---

## ✅ Completed Phases: Summary

> Full implementation detail has been collapsed for readability. The history and decisions are preserved in git.

| Phase   | Name                                        | Status  | Key Deliverables                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Location                                                                                                                                               |
| ------- | ------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **0**   | Foundation                                  | ✅ Done | DDD/Hexagonal scaffold · 10 modules (Authentication, Authorization, Carts, Health, Identity, Inventory, Notifications, Orders, Payments, Products) · JWT auth · Passport strategies · Redis WebSocket adapter · BullMQ jobs · Swagger/OpenAPI                                                                                                                                                                                                                                                                  | `src/modules/`, `src/infrastructure/`                                                                                                                  |
| **1**   | ACL Gateway & SAGA                          | ✅ Done | 8 ACL Gateways across Orders, Carts, Authentication · BullMQ checkout SAGA with `CheckoutFailureListener` compensation (refund, stock release, order cancellation) · Gateway DTOs decoupled from domain entities                                                                                                                                                                                                                                                                                               | `src/modules/orders/`, `src/modules/carts/`                                                                                                            |
| **2**   | Result Pattern & Idempotency                | ✅ Done | Functional `Result<T, E>` across all layers · `@Idempotent()` decorator with Redis `SET NX` store for checkout protection · idempotency **fail-closed** on Redis errors (HTTP 503)                                                                                                                                                                                                                                                                                                                             | `src/shared-kernel/`, `src/infrastructure/idempotency/`                                                                                                |
| **3**   | Decorator-based Caching                     | ✅ Done | `CachedRepository` decorator pattern wrapping Postgres repositories with Redis cache-aside                                                                                                                                                                                                                                                                                                                                                                                                                     | `src/modules/*/secondary-adapters/repositories/cached-*/`                                                                                              |
| **4**   | Test Suite Foundation                       | ✅ Done | Use case unit tests (all modules) · mock-based repository specs · controller/guard tests · architecture boundary tests (`test:arch`) · shared test helpers · Docker Compose for local dev (PostgreSQL + Redis Stack)                                                                                                                                                                                                                                                                                           | `src/modules/*/`, `src/testing/`, `test/architecture/`                                                                                                 |
| **5**   | Code Quality (v0.2.0)                       | ✅ Done | Removed redundant try/catch from use case/service files · Trimmed orders table indexes · Migration CLI scripts configured (`data-source.ts`, `scripts/docker-migrate.js`)                                                                                                                                                                                                                                                                                                                                      | `data-source.ts`, `package.json`                                                                                                                       |
| **6**   | Deployment Blockers                         | ✅ Done | Multi-stage `Dockerfile` (Node 24 Alpine, tini, non-root) · `GlobalExceptionFilter` · graceful shutdown (`SIGTERM` drain) · `docker-entrypoint.sh` migration runner · `docker-compose.prod.yml` hardening (healthchecks, log rotation, memory limits, network isolation) · `scripts/generate-envs.js`                                                                                                                                                                                                          | `Dockerfile`, `docker-compose.prod.yml`, `scripts/`                                                                                                    |
| **7**   | Security & Authentication                   | ✅ Done | Helmet · CORS whitelist · XSS sanitization · `ValidationPipe` hardening (`forbidNonWhitelisted`) · pagination `@Max(100)` · RSA RS256 JWT · refresh token rotation + reuse detection · session tracking · full RBAC (roles/permissions/guards) · logout/logout-all · authentication endpoint `@Throttle`                                                                                                                                                                                                       | `src/main.ts`, `src/modules/authentication/`, `src/infrastructure/jwt/`                                                                                |
| **8**   | Observability & SaaS                        | ✅ Done | Winston structured logging · `/health` · correlation ID middleware (`X-Request-Id`) · BullMQ job correlation propagation · API versioning (`/v1`) · Redis-backed rate limiting · Prometheus (`/metrics`) · Grafana/Loki/Tempo stack · OpenTelemetry tracing · hexagonal boundary audit · agent docs (`AGENT.md`, `.agents/`, `docs/ai/`)                                                                                                                                                                       | `src/infrastructure/logging/`, `src/infrastructure/metrics/`, `docker/monitoring/`, `AGENT.md`                                                         |
| **9**   | Local DB Seeding                            | ✅ Done | `npm run db:seed` · module-owned seed use cases · admin & customer accounts · 15-product catalog · inventory levels · documented credentials                                                                                                                                                                                                                                                                                                                                                                   | `scripts/`, `src/modules/*/core/application/seed/`, `docs/development/`                                                                                |
| **10**  | Security Hardening Phase 2                  | ✅ Done | OWASP Top 10:2025 audit document (`OWASP-COMPLIANCE.md`) · Dependabot + CI `npm audit` scanning · `eslint-plugin-security` static analysis · Winston PII log redaction · `GlobalExceptionFilter` production error code masking · User-scoped `UserThrottlerGuard` rate limiting                                                                                                                                                                                                                                | `.github/`, `docs/security/`, `src/infrastructure/`                                                                                                    |
| **11**  | Data Integrity & Concurrency                | ✅ Done | OCC version locking (`@VersionColumn`, HTTP 409 conflict filter) · Pessimistic inventory reservation row locking (`SELECT FOR UPDATE`) · Redis-backed cart TTL (30 days) with RedisJSON storage & graceful re-initialization · BullMQ inventory reconciliation audit job (`inventory_drift_count` Prometheus metric) · Transaction isolation level audit & query composite/partial index optimization                                                                                                          | `src/modules/*/`, `src/infrastructure/database/`, `docs/data/`                                                                                         |
| **12**  | CQRS Read Path                              | ✅ Done | Query ports & flat read DTOs (7 modules) · TypeORM JOIN query adapters & mappers · read use case refactor · controller presentation updates · application command contracts · Testcontainers integration specs · `EXPLAIN ANALYZE` index verification · 18/18 architecture boundary rules                                                                                                                                                                                                                      | `src/modules/*/core/application/queries/`, `src/modules/*/secondary-adapters/query/`, `test/integration/`, `docs/testing/`                             |
| **12b** | CI/CD Pipeline (GitHub Actions)             | ✅ Done | Fan-out/fan-in CI (`lint`, `typecheck`, `unit`, `arch`, `audit`, `build`, `integration`, `e2e`, `smoke`) · **CI Status Check** aggregator · `prepare-test-env` composite action · blocking `npm audit --omit=dev --audit-level=high` · PR dependency review · Docker validate (PR) · GHCR publish (`master` + semver tags) · `scripts/smoke-test.js` · `start:test` · liveness/readiness probes · Bitbucket Pipelines removed · `PROJECT-PIPELINE.md` updated                                                  | `.github/workflows/ci.yml`, `.github/actions/prepare-test-env/`, `scripts/smoke-test.js`, `docs/infrastructure/cicd/`                                  |
| **13**  | Production Confidence & Integration Testing | ✅ Done | Typed gateway/repo mocks & testing barrels · Domain entity GWT specs + `OrderWorkflow` / shipping-address · Real-DB repository integration + concurrent checkout lock proof · Atomic OCC `save` predicates (Product/Order/User/Cart) · E2E auth lifecycle, IDOR, checkout SAGA, CQRS shapes · HTTP cart/payment/refresh-cookie contracts · HTTP-only E2E · Checkout idempotency E2E · E2E suite quality + optional business specs · Domain test polish (dead VO removal, `order-items`/`payment-status` specs) | `src/modules/*/core/domain/`, `src/modules/*/secondary-adapters/repositories/`, `src/modules/*/testing/`, `src/testing/`, `test/e2e/`, `docs/testing/` |

> **Note**: Health probes, smoke runner, backup/restore scripts, and release runbook shipped with Phase 14. Phase 0 shipped 10 modules and Passport JWT; the tree now has **11 modules** (Analytics added later) and RS256 via `jose`.

---

## 📋 Pending Work: Execution Sequence

> **Execution guide**: Pick tasks in priority order. Phase 14 (single-instance production deploy gate) is complete.
>
> - **Parallel Work Exception**: **Phase 14e** (developer onboarding, 1-command quickstart, architecture assets) is a `[P0]` DX enabler that **does not block Phase 14c, 14d, or Phase 15** and can be run immediately in parallel.
> - **Phase 14c** and **Phase 14d** do not block Phase 15. Complete **Phase 15** before scaling to multiple application instances.

| Phase   | Name                                              | Status | Priority | Target / Focus                                                                                          |
| ------- | ------------------------------------------------- | ------ | :------: | ------------------------------------------------------------------------------------------------------- |
| **10**  | Security Hardening Phase 2                        | `[x]`  |    -     | **Security**: OWASP audit, Dependabot, user-scoped rate limits                                          |
| **11**  | Data Integrity & Concurrency                      | `[x]`  |    -     | **Data & Stock**: OCC version locking, inventory audit, cart TTL                                        |
| **12**  | CQRS Read Path                                    | `[x]`  |    -     | **Read Path**: flat read DTOs, cross-context SQL JOIN adapters across all modules                       |
| **13**  | Production Confidence & Integration Testing       | `[x]`  |    -     | **Integration confidence**: real DB repos, concurrent checkout proof, E2E core flows                    |
| **14**  | Single-Instance Production Gate                   | `[x]`  |    -     | **First Production Ship**: baseline migration, Redis cleanup + degradation, probes, backup/smoke        |
| **14b** | Forced Credential Rotation                        | `[x]`  |    -     | **Auth hardening**: `mustChangePassword` signal, change-password endpoint, global guard, session revoke |
| **14c** | OpenAPI truthfulness                              | `[ ]`  |  `[P1]`  | **Contract**: Swagger matches handlers (types, schemas, copy); no new HTTP                              |
| **14d** | Operator HTTP gaps                                | `[ ]`  |  `[P1]`  | **Operator contract**: product activate/deactivate + assign/replace user role over HTTP                 |
| **14e** | Developer Onboarding & 60s Time-to-Value          | `[ ]`  |  `[P0]`  | **Instant DX**: 1-command quickstart (`docker-compose.quickstart.yml`), value matrix, C4 assets, Bruno  |
| **15**  | Multi-Instance & Distributed Consistency          | `[ ]`  |  `[P1]`  | **Horizontal scale**: outbox, singleton jobs, SAGA recovery, search reconciliation                      |
| **16**  | Performance Engineering                           | `[ ]`  |  `[P2]`  | **Performance**: k6 baselines, V8 profiling, RED/USE Grafana alert rules                                |
| **17a** | Customer Catalog Read Path & Notifications        | `[ ]`  |  `[P1]`  | **Storefront Read**: `@Public()` catalog queries, real email providers, abandoned cart recovery         |
| **17b** | Real Stripe SDK Integration & Webhooks            | `[ ]`  |  `[P1]`  | **Payments**: Stripe SDK adapter, signed webhook handler, Redis event idempotency deduplication         |
| **17c** | Commercial Loop Integration (`store-web`)         | `[ ]`  |  `[P1]`  | **Ecosystem**: Storefront checkout -> SAGA -> Admin Dashboard live WebSocket toast verification         |
| **18**  | Conditional Enterprise & Infrastructure Evolution | `[ ]`  |  `[P2]`  | **When justified**: message broker, multi-tenancy, K8s, encrypted off-site backups                      |

---

## 🚧 Pre-Production Checklist

---

### Step 1: Single-Instance Production Ship Blockers (Must complete before first deploy)

| Task / Item                                                                                                                                        | Phase         | Critical Purpose                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------- |
| [x] IDOR / object-level access control on carts, orders, payments & customer profile                                                               | **10**        | Resolved via `CallerContext`, `CartOwnershipValidator` & `OwnedResourceAccessPolicy`     |
| [x] OWASP audit doc + dependency scanning in CI (`.github/dependabot.yml` + blocking `npm audit:check` + PR dependency review)                     | **10**        | Prevents supply-chain vulnerabilities; high/critical prod deps block merge               |
| [x] Production error stack masking & PII log audit verified                                                                                        | **10**        | Verifies `GlobalExceptionFilter` & Winston do not leak sensitive payloads/stacks in prod |
| [x] Optimistic concurrency (schema @VersionColumn + 409 on conflict + pure domain isolation per CONVENTIONS.md §13)                                | **11**        | Prevents lost updates during concurrent edits by multiple users or admins                |
| [x] Shopping Cart Expiration & Redis-backed cart TTL enforcement                                                                                   | **11**        | Automatically cleans up stale cart instances (RedisJSON storage, key TTL)                |
| [x] CQRS read path: query ports, JOIN adapters, flat list/detail DTOs (Orders, Inventory, Payments, Products, Carts, Identity, Notifications done) | **12**        | Solves UI N+1 queries by returning resolved customer names/SKUs in a single SQL query    |
| [x] Admin analytics query module (`/v1/admin/analytics/*`) + indexes                                                                               | **CQRS read** | Operational dashboard aggregates (UTC, 90-day cap); ADR-0007; not Prometheus             |

| [x] Initial database baseline migration generated & verified | **14** | `src/migrations/*InitialBaseline*` · clean run + revert verified · CI uses `migration:run` only |
| [x] Redis graceful degradation & `trust proxy` hardening | **14** | Prevents 5xx HTTP drops on Redis disconnects & captures real client IP behind proxy |
| [x] Redis infrastructure cleanup (layering, one fail-open path, key-space recovery) | **14** | Ship a clean Redis model with the first production instance: not a later refactor |
| [x] Liveness, Readiness & `ProcessHealthIndicator` probes | **14** | `/health/liveness` (process) and `/health/readiness` (PostgreSQL required; Redis via `/health`) |
| [x] Backup, restore, rollback runbook & smoke test runner | **14** | `db:backup` / `db:restore` / `db:restore:drill` · `scripts/smoke/` · [RELEASE-BACKUP-RECOVERY.md](infrastructure/RELEASE-BACKUP-RECOVERY.md) |
| [x] Production secret rotation procedures documented | **14** | Rotate JWT, DB, Redis, and third-party secrets without breaking production |

---

### Step 2: Verification & Test Safety Net

| Task / Item                                                                                         | Phase     | Critical Purpose                                                           |
| --------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------- |
| [x] E2E core flow tests: auth lifecycle + IDOR denial + SAGA happy path + CQRS list shapes          | **13**    | Pre-deploy verification via `supertest`; not post-deploy smoke probes      |
| [x] HTTP checkout/auth contract completeness (cart id, payment intent id, versioned refresh cookie) | **13**    | Lets clients and E2E drive checkout without reaching into repositories     |
| [x] Checkout idempotency E2E: same key replay must not create a second checkout                     | **13**    | Proves `@Idempotent()` on checkout; do after HTTP contracts exist          |
| [x] E2E suite quality polish (error bodies, spec naming, remaining optional specs)                  | **13**    | Optional P2: does not block first deploy                                   |
| [x] HTTP idempotency hardening (namespace, dual headers, persist-on-complete)                       | **14 P2** | After checkout idempotency E2E; does **not** block first deploy            |
| [x] Order lifecycle domain policy (`OrderWorkflow`, shipping-address validation)                    | **13**    | Centralized transition policy and domain specs                             |
| [x] Repository integration tests (Testcontainers / real DB)                                         | **13**    | All postgres write adapters + cached wrappers (except cached cart)         |
| [x] Concurrent checkout integration proof (pessimistic lock verification)                           | **13**    | Repository-level reservation proof: parallel saves against last stock unit |

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

## 🚀 Phase 14: Single-Instance Production Deploy Gate

> **Goal**: Prove you can **operate** a single application instance without being reckless (migrations, Redis/proxy, backup/restore, secrets, smoke). This is the **first private production deployment gate**, not a claim that the API is a production-grade ecommerce platform. Phases 15-17 still contain major capabilities.
>
> **Required for the ship gate:** baseline migration, Redis/proxy behavior, Redis infrastructure cleanup, backup/restore/rollback, secret rotation, smoke.
>
> **Optional (do not block first deploy):** Redis polish (post-ship gate); HTTP idempotency hardening; staging environment.

---

### [x] Initial Database Baseline Migration

**What**: Generate the initial database schema baseline migration from the current TypeORM entities to enable safe production schema updates.

**Scope**:

- [x] Generate the baseline database migration script utilizing TypeORM CLI (`npm run migration:generate:prod`).
- [x] Run forward migrations on a **clean** PostgreSQL database (schema from scratch).
- [x] Run forward migrations against an **existing** database (upgrade path).
- [x] Verify migration **rollback** scripts function properly.
- [x] Document and verify **migration failure** behavior (startup abort, no partial corrupt state).
- [x] Confirm **`synchronize: true` is never enabled in production**.
- [x] Update deployment configurations to execute migrations automatically on server startup via `docker-entrypoint.sh`.

**Location**: `src/migrations/`, `scripts/docker-migrate.js`

> **Existing local DBs** that already have tables from Nest `synchronize` (non-production): either reset the volume, or stamp the baseline as applied (`INSERT INTO typeorm_migrations ...`) after verifying the schema matches: do not re-run `InitialBaseline` against a populated synchronized schema.

---

### [x] Graceful Degradation & Reverse Proxy Hardening (`trust proxy` & Redis)

**What**: Configure reverse proxy compatibility and ensure caching, rate limiting, and session layers degrade gracefully if Redis goes offline.

**Scope**:

- [x] Configure Express `trust proxy` in NestJS bootstrap (`src/main.ts`) to match the **actual production proxy topology** (CDN / load balancer / reverse proxy hop count). `trust proxy = 1` is only correct for a single trusted hop: verify client-IP and rate-limit behavior; do not assume `1` is always right.
- [x] Harden central Redis client configuration with connection retry strategies and drop event handlers.
- [x] Refactor cache-aside repository wrappers to query the database directly on cache misses when Redis is offline.
- [x] Treat Redis-down as **per-concern**, not one policy: cache → DB fallback; throttler → documented degraded/fallback; idempotency → **fail-closed** (HTTP 503); session/refresh → as designed; carts → RedisJSON persistence behavior; BullMQ → operational impact (jobs stop). Catch disconnects with logged warnings instead of unexplained 5xx HTTP drops for cache paths.

**Location**: `src/main.ts`, `src/infrastructure/redis/`, `src/infrastructure/idempotency/`

---

### [x] Redis Infrastructure Cleanup (Ship Gate)

**What**: Simplify the Redis stack so first production ships with one clear degradation model: not overlapping resilience layers that grew during Phase 14 hardening.

> **Blocks the Phase 14 ship gate.** Behavior already degrades safely; this pass cleans structure so the production baseline is maintainable.

**Scope**:

- [x] Collapse Redis layering to a **connection/lifecycle owner** + **`CachePort` adapter**. Remove thin pass-through clients (`RedisJsonClient`, `RedisKeyClient`, and equivalents that only forward to `RedisService`) unless a real second implementation needs them.
- [x] Remove `createHealthAwareProxy` from module DI. Cache-aside repositories always sit behind `CachePort`; when Redis is down, the adapter fails open to DB without a second DI switch.
- [x] Keep **one** fail-open policy in the cache/Redis adapter (`isReady` + try/catch safe returns). Do not duplicate the same guards across `RedisService` methods, the Proxy, and every cached repository.
- [x] Document Redis **roles** explicitly (cache-aside vs cart RedisJSON SoR vs idempotency locks vs throttler vs BullMQ vs Socket.IO pub/sub) in infrastructure docs or module README: different concerns, different failure modes.
- [x] Replace reconnect `SCAN` domain-key flush with **key-space versioning** (bump generation/prefix so stale keys expire naturally) or an equivalent cheap invalidation; keep index re-init on reconnect.
- [x] Prefer **atomic JSON write + TTL** where the client API allows (avoid `json.set` then separate `expire` races).
- [x] Type the Redis client (drop `client: any`).
- [x] Centralize shared Redis connection options (host/port/password/db/reconnect). Separate library clients (`ioredis` throttler, BullMQ, Socket.IO) may remain, but must share config: do not invent a fourth ad-hoc connection setup.
- [x] Update unit/integration specs and module factories after the DI simplification; keep existing per-concern degradation contracts (cache → DB, throttler → memory, idempotency → fail-closed).

**Location**: `src/infrastructure/redis/`, `src/infrastructure/resilience/`, `src/modules/*/…module.ts`, `docs/infrastructure/REDIS.md`

---

### [x] Redis Polish (Post-Ship Gate)

**What**: Close remaining Redis polish gaps after Infrastructure Cleanup: options/DI consistency, slimmer hexagonal ports, typed cache reads, keep `CacheService` as the port adapter (do not merge into `RedisService`), split oversized `RedisService` into helpers, and prove reconnect under load with Redis Stack Testcontainers.

> **Does not block the Phase 14 ship gate.** Do this **after** [Redis Infrastructure Cleanup (Ship Gate)](#x-redis-infrastructure-cleanup-ship-gate). Separate TCP clients remain (library constraints); polish the shared options contract and docs, not a single-socket merge.

**Scope**:

- [x] Share BullMQ connection options via one DI token / provider (`queue.module`, `FlowProducer`, `QueueEvents`); document a **client inventory** in [`REDIS.md`](infrastructure/REDIS.md) (role → library → why separate sockets).
- [x] Slim `CachePort` to KV + RediSearch (`isAvailable`, `get`/`getMany`, `set`/`setAll`, `delete`, `search`); drop unused Redis-shaped APIs (`path`, `scanKeys`, `deletePattern`, `merge`/`mergeAll`, `getAll`, unused `exists`/`ttl`).
- [x] Port reads use typed `get<T>` / `search<T>`; `*CacheMapper.fromCache` maps `*ForCache` wire DTOs (epoch-ms dates) to domain (bad payload → `null` → miss → Postgres). Idempotency narrows locally after `get`.
- [x] **Keep `CacheService`** as the `CachePort` adapter. Keep `RedisService` as one Nest injectable (key builders live in `cache-key-space.ts`). Prune methods that only served removed port passthroughs.
- [x] Redis Stack Testcontainers chaos suite: restart under concurrent get/set; assert fail-open during outage, generation bump + flag clears after recovery, stable idempotency keys. Script `test:redis:chaos` + short note in the integration testing guide.

**Location**: `src/shared-kernel/domain/interfaces/cache.port.ts`, `src/infrastructure/redis/`, `src/infrastructure/queue/`, `src/modules/*/secondary-adapters/`, `test/integration/redis/`, `docs/infrastructure/REDIS.md`, ADR-0006

---

### [x] Liveness, Readiness & Process Health Probes

**What**: Expose dedicated health check endpoints for container runtime orchestrators, including V8 runtime process checks.

**Scope**:

- [x] Implement `ProcessHealthIndicator` measuring event loop lag and RSS memory limits.
- [x] Implement `/health/liveness` returning process viability.
- [x] Implement `/health/readiness` checking required dependencies (PostgreSQL only: Redis degradation is reported via `/health` and metrics).
- [x] Expose probes in HealthController; Dockerfile uses liveness, Compose prod uses readiness.
- [ ] Update Swagger documentation for probe endpoints.

**Location**: `src/modules/health/`

---

### [x] Release, Rollback, Backup Procedures & Smoke Test Runner

**What**: Build deployment pipeline smoke tests, database backup scripts, and disaster recovery runbooks.

**Scope**:

- [x] Write Node.js scripts to automate PG database backups (`db-backup.js`) and restore procedures (`db-restore.js`).
- [x] Build a post-deploy smoke test runner (`smoke-test.js`) targeting liveness/readiness, `/metrics`, register/login, and authenticated profile access.
- [x] Wire smoke runner into GitHub Actions CI (Postgres + Redis services, `dist` artifact, migrations).
- [x] Refactor `scripts/smoke-test.js` into small HTTP helpers under `scripts/smoke/`: **not** Nest use cases. Smoke runs against a deployed process; it cannot `app.get()` module ports.
- [x] Keep smoke as process-alive probes only (no checkout SAGA, queues, or Stripe). That remains `npm run test:e2e`.
- [x] Soften the success log so it does not claim “production deployment verified”; it verifies probes answered.
- [x] Document comprehensive release, rollback, disaster recovery procedures in `docs/infrastructure/RELEASE-BACKUP-RECOVERY.md`.
- [x] **Restore drill (definition of done)**: backup → destroy/clean disposable DB → restore → migrate if needed → app starts → smoke tests pass.

**Location**: `scripts/`, `docs/infrastructure/RELEASE-BACKUP-RECOVERY.md`

---

### [x] Production Secret Rotation Procedures

**What**: Document how to rotate production secrets without breaking running sessions or deployments.

**Scope**:

- [x] Document rotation procedure for JWT signing keys (consider active session impact).
- [x] Document rotation for database and Redis credentials.
- [x] Document rotation for metrics/API keys and third-party secrets (Stripe, webhooks, email providers).
- [x] Cross-reference [`SECRETS-MANAGEMENT.md`](security/SECRETS-MANAGEMENT.md) where procedures already exist.

**Location**: `docs/security/SECRET-ROTATION.md`

---

### [x] HTTP Idempotency Hardening (Optional: P2)

> **Does not block the Phase 14 ship gate.** Do this **after** checkout idempotency E2E exists. Do **not** open a design/plan workstream. Current `@Idempotent()` + Redis `SET NX` is good enough to ship; this is a short implementation pass.

**What**: Tighten HTTP command idempotency without changing SAGA/outbox semantics.

**Scope**:

- [x] Namespace Redis keys with authenticated `userId` + HTTP method + route (stop cross-user / cross-route key collisions).
- [x] Accept `Idempotency-Key` as well as `x-idempotency-key` (body `idempotencyKey` remains fallback).
- [x] If `SET NX` fails and `GET` misses (TTL race), retry as a new lock: do not 409.
- [x] If `complete()` cannot persist the cached body, fail the request (logged error); do not succeed HTTP and then allow a retry to create a second checkout.
- [x] Optional: `Retry-After` on in-progress **409**.
- [x] Align docs with the store: Redis `SET NX` (not Redlock); **fail-closed** on Redis errors (HTTP 503); interceptor covers the HTTP checkout command, not the worker chain (`FEATURES.md`, `OWASP-COMPLIANCE.md`, README).
- [x] Update checkout idempotency E2E to the hardened contract (dual headers, namespaced keys). Do **not** add payload fingerprinting, Redlock, or SAGA-wide idempotency here (Phase 15/17).

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

## Phase 14b: Forced Credential Rotation (mustChangePassword)

> **Goal**: Enforce bootstrap and demo password rotation in the API and unblock admin first-login UX.
> **Prerequisite**: Phase 14 complete.

**Scope:**

- [x] Extend login/refresh/change-password responses with `mustChangePassword`
- [x] `ChangePasswordUseCase` + `POST /v1/authentication/change-password` (revoke-all + new tokens)
- [x] `Credential.changePassword()` domain method
- [x] Global `MustChangePasswordGuard` with route allowlist
- [x] Claim-gated guard: `mustChangePassword` embedded in the access token only when set, so the credential lookup runs only for flagged tokens
- [x] Unit, guard, and E2E tests
- [x] Update ADMIN-BOOTSTRAP, SEEDING, FEATURES docs

**Done when:** User with `mustChangePassword: true` cannot call domain APIs until password change; change-password clears flag and reissues session; tests green.

---

## Phase 14c: OpenAPI truthfulness

> **Goal**: Make the published OpenAPI document match runtime handlers so generated clients stay accurate. **No new HTTP.** Does **not** block Phase 15.
>
> **Prerequisite**: Phase 14b complete.

**What**: Defect **classes**, not a frozen path inventory. On start, fetch live `/api/docs-json` and fix what is still wrong.

**Scope:**

- [ ] Nullable `@ApiPropertyOptional` / `@ApiProperty` without an explicit `type` (generated clients get `object` / `Record<string, never>` instead of string/number)
- [ ] Handler return vs documented DTO (example found: low-stock documented as `InventoryStockResponseDto` while the handler returns `IInventory` primitives)
- [ ] Operations in the spec with empty summary and/or no 200/201 body schema
- [ ] 200 + `null` described in prose but not in the schema
- [ ] Stale copy (order confirm still mentioning COD; COD is not an active checkout path)
- [ ] Auth refresh/logout documented as a JSON body while the HttpOnly cookie is the real token
- [x] [`docs/development/LOCAL-SETUP.md`](development/LOCAL-SETUP.md) Swagger URL (`/api/docs`)
- [ ] Probe endpoint Swagger (moved here from Phase 14 health probes)

Do **not** add `POST /v1/payments/webhooks/stripe` to Swagger (`@ApiExcludeEndpoint` is correct).

**Location**: controller/DTO Swagger decorators, `src/main.ts` document setup, `docs/development/LOCAL-SETUP.md`

**Done when:** Regenerating an OpenAPI client does not invent `object` for nullable scalars; documented response shapes match handlers for the operations you touch. LOCAL-SETUP already documents `/api/docs`.

---

## Phase 14d: Operator HTTP gaps

> **Goal**: Expose operator actions the domain already has but HTTP does not (product activate/deactivate, assign/replace user role). Does **not** block Phase 15.

**Scope:**

- [ ] Product activate / deactivate HTTP (dedicated actions, same idea as users, e.g. `POST /v1/products/{id}/activate` and `deactivate`, `manage_products`). Do **not** silently add `isActive` to PATCH if the domain treats catalog status as a dedicated action
- [ ] Assign or replace a user's role over HTTP (`AssignRoleUseCase` exists today with no controller)
- [ ] OpenAPI + tests for those operations

**Location**: `src/modules/products/`, `src/modules/identity/` (or authorization), matching use-case tests / HTTP e2e

**Done when:** An authenticated caller with the right permission can take a product off the catalog and change a user's role over HTTP without SQL or seed scripts; OpenAPI documents the new operations.

---

## ⚡ Phase 14e: Developer Onboarding, Architecture Storytelling & 60s Time-to-Value [P0]

> **Goal**: Reduce developer time-to-first-run from 10 minutes to 60 seconds, provide optional 1-command ecosystem orchestration, and visually articulate the architectural superpowers (SAGA, OCC, Hexagonal DDD).
>
> _(Note: Non-blocking DX enabler. Can be executed immediately in parallel with Phase 14c/14d and Phase 15)._

### [ ] 1-Command Unified Quickstart (`docker-compose.quickstart.yml`)

**What**: Single Docker Compose file orchestrating PostgreSQL, Redis, the NestJS API, automatic migrations, seeding, and optionally serving the Admin Dashboard SPA if cloned alongside the API.

**Standalone vs Ecosystem Policy**:

- **API is 100% Standalone by Default**: Anyone cloning only `ecommerce-store-api` uses `npm run d:up:dev && npm run start:dev` with zero frontend dependency.
- **Multi-App Workspace Layout (Optional)**: If cloned as siblings under a parent directory (e.g. `ES/ecommerce-store-api` and `ES/ecommerce-admin-dashboard`), `npm run quickstart` mounts the sibling dashboard.
- **Graceful Fallback**: If the sibling dashboard directory is missing, `docker-compose.quickstart.yml` falls back gracefully to running the backend + database + Redis + Swagger with a helpful log notice.

**Scope**:

- [ ] Create `docker-compose.quickstart.yml` at repository root.
- [ ] Configure sibling build context for Admin Dashboard (`ADMIN_DASHBOARD_PATH=${ADMIN_DASHBOARD_PATH:-../ecommerce-admin-dashboard}`).
- [ ] Add single-command boot script: `npm run quickstart` (or `docker compose -f docker-compose.quickstart.yml up -d`).
- [ ] Include container healthchecks ensuring the API waits for PostgreSQL and Redis readiness before running migrations and seeding.
- [ ] Provide reverse proxy routing `/` to the Admin Dashboard and `/api` to the backend when the dashboard profile is active.
      **Location**: `docker-compose.quickstart.yml`, `package.json`

### [ ] Architecture Value Matrix & "Why Choose This Engine?" in README

**What**: Top-level decision matrix comparing this codebase against basic Node.js tutorials, MedusaJS, and monolithic SaaS platforms.
**Scope**:

- [ ] Document key guarantees: Zero Overselling (pessimistic lock), SAGA Compensation (automatic refunds/stock release on failure), OCC Update Contracts (HTTP 409 lost update prevention), Audit-Ready Security (JWKS RSA + rotation runbooks).
- [ ] Embed 30-second elevator pitch for CTOs, Full-Stack Engineers, and E-Commerce Businesses.
      **Location**: `README.md`, `docs/README.md`

### [ ] Visual Architecture Diagrams & Media Assets

**What**: Export publication-quality SVG/PNG diagrams for the README and docs.
**Scope**:

- [ ] Export high-res C4 System Context & Container diagrams to `docs/assets/c4-architecture.svg`.
- [ ] Create annotated SAGA Checkout Sequence diagram (`docs/assets/saga-checkout-sequence.svg`).
- [ ] Create Swagger UI screenshot with highlighted DDD module tags (`docs/assets/swagger-overview.png`).
- [ ] (Optional) Record a 3-minute video/GIF architectural walkthrough explaining ACL gateways, SAGA failure compensation, and CQRS read adapters.
      **Location**: `docs/assets/`, `README.md`

### [ ] Interactive API Playground & Client Collection

**What**: Make trying endpoints zero-friction.
**Scope**:

- [ ] Provide exportable Bruno and Postman collections in `docs/data/collections/` with pre-configured environment variables (token refresh, admin login).
- [ ] Enhance Swagger UI documentation with curl request/response examples for all 11 modules.
      **Location**: `docs/data/collections/`, `src/main.ts`

---

## 🛡️ Phase 15: Multi-Instance & Distributed Consistency

> **Goal**: Prepare for multi-pod scaling behind a load balancer: distributed consistency for events, jobs, SAGA recovery, and derived search indexes. **Complete before deploying to 2+ application instances.**

---

### [ ] Transactional Outbox Pattern (Cross-Instance Event Backbone)

**What**: Store domain events in an `outbox_events` table within the same database transaction as aggregate mutations to provide durable, at-least-once event publication across process crashes.

**Scope**:

- [ ] Create `outbox_events` table schema: `id`, `eventName`, `payload` (JSON), `status`, `retries`, `correlationId`, timestamps.
- [ ] Ensure aggregate mutation and outbox record commit atomically in one DB transaction.
- [ ] Implement outbox processor to claim pending rows (e.g. PostgreSQL `SKIP LOCKED`) and publish to subscribers.
- [ ] Schedule/trigger processing (BullMQ or equivalent: implementation detail, not the guarantee).
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

## 📈 Phase 16: Performance Engineering & Observability Maturity

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

### [x] Cache Role Permission Resolution

**What**: `PermissionsGuard` runs on every authenticated request and calls `ResolveRolePermissionsService`, which issues two uncached Postgres queries: a `roles` lookup by code, then a `role_permissions` fetch joined to `permission`. Role-to-permission mappings change rarely, so this is the largest per-request database cost left in the guard chain.

**Scope**:

- [x] Cache resolved permission codes per role code in Redis with a bounded TTL.
- [x] Invalidate on role and role-permission mutations so authorization changes take effect immediately.
- [x] Fall back to Postgres when the cache is unavailable, matching the degradation behaviour used elsewhere.

**Location**: `src/modules/authorization/core/application/services/resolve-role-permissions.service.ts`

---

### [ ] Node.js Runtime Profiling & Performance Tuning

**What**: Profile Node's V8 engine and event loop performance under heavy loads to find memory leaks and CPU-heavy hot paths.

**Scope**:

- [ ] Implement Prometheus metrics tracking Event Loop Lag (`nodejs_eventloop_lag_seconds`).
- [ ] Document heap-dump capture procedures.
- [ ] Generate CPU flame graphs using `clinic.js` or `0x` under simulated k6 load tests.

**New documentation**:

- [ ] `docs/infrastructure/PERFORMANCE-ENGINEERING.md`: Performance engineering guide covering k6, capacity planning, profiling, and caching.

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

## 📦 Phase 17: Product Ecosystem, Webhooks & Real Integrations

> **Goal**: Elevate store value by integrating real communication providers, automated cart recovery, outbound webhook subscriptions, production Stripe payments with webhook deduplication, and verifying the end-to-end commercial loop with the customer storefront.

---

### Phase 17a: Customer Catalog Read Path & Notifications [P1]

#### [ ] Customer Catalog Read Path (Storefront API)

**What**: Let a `CUSTOMER` (or public shopper) list and get products for shopping without admin catalog permissions.

**Why**: `GET /v1/products` currently requires `view_all_products` / create requires `manage_products`. A storefront cannot browse the catalog with the default customer role. This is a store API gap, not a SAGA design gap.

**Scope**:

- [ ] Introduce customer-scoped (or `@Public()` read) product list/detail permissions distinct from admin `manage_products`.
- [ ] Keep mutations (`POST`/`PATCH`/`DELETE` products) admin-only.
- [ ] E2E or API contract: registered customer can list a product created by admin and add it to a cart without `manage_products`.

**Location**: `src/modules/products/`, `src/modules/authorization/core/domain/reference-data/`

#### [ ] Real Email and Notification Providers

**What**: Integrate real email delivery gateways (SendGrid/Resend) behind the existing notification gateway port.

**Scope**:

- [ ] Implement Resend or SendGrid secondary adapters for the notification gateway port.
- [ ] Build BullMQ queues to handle outbound email sending asynchronously with retry policies.
- [ ] Wire up order confirmations, password resets, and shipping updates to trigger real emails.

**Location**: `src/modules/notifications/secondary-adapters/mail/`

#### [ ] Automated Abandoned Cart Recovery & Shipping Notification Engine

**What**: Implement background job schedulers that scan for inactive carts and dispatch recovery emails.

**Scope**:

- [ ] Implement a BullMQ scheduler job scanning inactive carts (e.g. 12+ hours).
- [ ] Generate recovery email templates with single-click checkout restoration links.
- [ ] Dispatch real-time WebSocket events and emails when order shipping status changes.

**Location**: `src/modules/carts/primary-adapters/jobs/`

#### [ ] Outbound Webhook Subscription System

**What**: Build a secure webhook subscription framework that allows external merchant applications to receive real-time order and payment event payloads.

**Scope**:

- [ ] Create `WebhookSubscription` aggregate: `id`, `targetUrl`, `secret`, `events` (e.g. `order.created`, `payment.captured`), `isActive`, `createdAt`.
- [ ] Implement admin CRUD endpoints under RBAC.
- [ ] Build BullMQ webhook delivery queue signing payloads with HMAC-SHA256 signatures in headers.
- [ ] Maintain `WebhookDeliveryLog` table recording delivery status, HTTP status codes, and latencies.

**Location**: `src/modules/webhooks/`

---

### Phase 17b: Real Stripe SDK Integration & Webhook Idempotency [P1]

#### [ ] Real Stripe Integration & Webhook Idempotency

**What**: Replace mock payment gateway with production Stripe SDK integration and explicit webhook event deduplication.
_(Note: End-to-end commercial loop and WebSocket notifications function with the built-in mock payment adapter; Phase 17b provides production payment gateway hardening)._

**Scope**:

- [ ] Implement Stripe SDK secondary adapter for `PaymentIntent` creation, capture, and refunds.
- [ ] Implement signed Stripe webhook controller verifying `stripe-signature` header.
- [ ] **Stripe Webhook Idempotency**: Persist processed `event.id` values to Redis/DB with TTL to prevent duplicate processing of replayed webhook events.

**Location**: `src/modules/payments/secondary-adapters/stripe/`

---

### Phase 17c: End-to-End Storefront Commercial Loop (`ecommerce-store-web`) [P1]

#### [ ] Commercial Loop Verification & Cross-Repo Push

**What**: Connect customer checkout on `ecommerce-store-web` to the API SAGA and push live WebSocket notifications to `ecommerce-admin-dashboard`.

**Scope**:

- [ ] Document and verify the 4-step cross-repo loop:
  1. Customer adds item to cart and executes checkout on Storefront (`ecommerce-store-web`).
  2. API locks inventory and executes SAGA orchestration with BullMQ.
  3. API WebSocket gateway broadcasts `orders.created` event.
  4. Admin Dashboard (`ecommerce-admin-dashboard`) displays real-time toast and updates order table live.
- [ ] Add cross-repo integration runbook: `docs/integration/COMMERCIAL-LOOP-INTEGRATION.md`.

**Location**: `src/modules/orders/`, `src/modules/notifications/`, `docs/integration/COMMERCIAL-LOOP-INTEGRATION.md`

---

## 🌐 Phase 18: Conditional Enterprise & Infrastructure Evolution

> **Goal**: Optional enterprise capabilities and infrastructure: only when product or operational requirements justify them. Message broker adapters build on Phase 15 outbox (outbox = durable handoff; broker = cross-process transport when needed).

---

### [ ] Message Broker Adapter (Kafka or RabbitMQ)

**What**: Broker adapter for cross-process event streaming when the outbox processor needs external transport. Builds on Phase 15 transactional outbox: the outbox remains the durable handoff from DB writes; the broker is the transport layer when justified.

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

> Future tooling only: completed CI/CD and supply-chain work lives in Phases 10 and 12b.

- [ ] **Dependency upgrade policy**: `docs/security/DEPENDENCY-UPGRADE-POLICY.md`.
- [/] **Automated architecture linting**: extend `npm run test:arch` with dependency-cruiser and additional layer rules.
- [ ] **Architecture drift detection**: verify module exports and layer dependencies against `docs/architecture/domains/`.
- [ ] **Living architecture dependency graphs**: auto-generate directional dependency maps in CI.
- [ ] **Module architecture scorecards**: per-bounded-context health metrics (entities, repos, events, tests).
- [ ] **ADR validation in CI**: require linked ADR when core architectural policies change.
- [ ] **Pin GitHub Actions to full commit SHAs**: replace mutable `@vN` tags in `.github/workflows/ci.yml` (and composite actions) with verified full-length SHAs + release-version comments. Dedicated hardening PR across all jobs: do not mix into feature work.
- [ ] **Bounded CI job timeouts**: add `timeout-minutes` to long-running jobs (especially `redis-chaos-tests`, integration, e2e) so hung runners fail closed instead of burning minutes.
- [ ] **Redis chaos: drop Jest `forceExit`**: after open-handle cleanup is proven (`detectOpenHandles`, quit/disconnect Testcontainers clients), remove `forceExit` from `test/integration/redis/jest-redis-chaos.json` so leaked Redis handles surface again.
- [ ] **Modularize CONVENTIONS.md**: split when file exceeds ~500-700 lines.
- [ ] **Property-based domain testing**: evaluate `fast-check` for value-object validation.
- [ ] **Mutation testing**: evaluate Stryker on domain layer.

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
