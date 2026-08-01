# 🗺️ E-Commerce Store API — Feature Roadmap

> A living roadmap for the E-Commerce Store API project. Each phase includes enough context for any contributor or AI agent to pick up tasks in a fresh session.
>
> **Companion docs**: [`AGENT.md`](../AGENT.md) (coding guidelines), [`docs/architecture/DDD-HEXAGONAL.md`](architecture/DDD-HEXAGONAL.md) (strict DDD reference), [`docs/architecture/CQRS.md`](architecture/CQRS.md) (CQRS read-path analysis), [`docs/integration/INTEGRATION-PATTERNS.md`](integration/INTEGRATION-PATTERNS.md) (cross-context communication), [`docs/security/SECRETS-MANAGEMENT.md`](security/SECRETS-MANAGEMENT.md) (secrets & env management)

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

| Phase  | Name                         | Status  | Key Deliverables                                                                                                                                                                                                                                                                                                                         | Location                                                                                       |
| :----- | :--------------------------- | :------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------- |
| **0**  | Foundation                   | ✅ Done | DDD/Hexagonal scaffold · 10 modules (Authentication, Authorization, Carts, Health, Identity, Inventory, Notifications, Orders, Payments, Products) · JWT auth · Passport strategies · Redis WebSocket adapter · BullMQ jobs · Swagger/OpenAPI                                                                                            | `src/modules/`, `src/infrastructure/`                                                          |
| **1**  | ACL Gateway & SAGA           | ✅ Done | 8 ACL Gateways across Orders, Carts, Authentication · BullMQ checkout SAGA with `CheckoutFailureListener` compensation (refund, stock release, order cancellation) · Gateway DTOs decoupled from domain entities                                                                                                                         | `src/modules/orders/`, `src/modules/carts/`                                                    |
| **2**  | Result Pattern & Idempotency | ✅ Done | Functional `Result<T, E>` across all layers · `@Idempotent()` decorator with Redis-backed store for checkout protection · idempotency fail-open on Redis errors                                                                                                                                                                          | `src/shared-kernel/`, `src/infrastructure/idempotency/`                                        |
| **3**  | Decorator-based Caching      | ✅ Done | `CachedRepository` decorator pattern wrapping Postgres repositories with Redis cache-aside                                                                                                                                                                                                                                               | `src/modules/*/secondary-adapters/repositories/cached-*/`                                      |
| **4**  | Test Suite Foundation        | ✅ Done | Use case unit tests (all modules) · mock-based repository specs · controller/guard tests · architecture boundary tests (`test:arch`) · shared test helpers · Docker Compose for local dev (PostgreSQL + Redis Stack)                                                                                                                     | `src/modules/*/`, `src/testing/`, `test/architecture/`                                         |
| **5**  | Code Quality (v0.2.0)        | ✅ Done | Removed redundant try/catch from use case/service files · Trimmed orders table indexes · Migration CLI scripts configured (`data-source.ts`, `scripts/docker-migrate.js`)                                                                                                                                                                | `data-source.ts`, `package.json`                                                               |
| **6**  | Deployment Blockers          | ✅ Done | Multi-stage `Dockerfile` (Node 24 Alpine, tini, non-root) · `GlobalExceptionFilter` · graceful shutdown (`SIGTERM` drain) · `docker-entrypoint.sh` migration runner · `docker-compose.prod.yml` hardening (healthchecks, log rotation, memory limits, network isolation) · `scripts/generate-envs.js`                                    | `Dockerfile`, `docker-compose.prod.yml`, `scripts/`                                            |
| **7**  | Security & Authentication    | ✅ Done | Helmet · CORS whitelist · XSS sanitization · `ValidationPipe` hardening (`forbidNonWhitelisted`) · pagination `@Max(100)` · RSA RS256 JWT · refresh token rotation + reuse detection · session tracking · full RBAC (roles/permissions/guards) · logout/logout-all · authentication endpoint `@Throttle`                                 | `src/main.ts`, `src/modules/authentication/`, `src/infrastructure/jwt/`                        |
| **8**  | Observability & SaaS         | ✅ Done | Winston structured logging · `/health` · correlation ID middleware (`X-Request-Id`) · BullMQ job correlation propagation · API versioning (`/v1`) · Redis-backed rate limiting · Prometheus (`/metrics`) · Grafana/Loki/Tempo stack · OpenTelemetry tracing · hexagonal boundary audit · agent docs (`AGENT.md`, `.agents/`, `docs/ai/`) | `src/infrastructure/logging/`, `src/infrastructure/metrics/`, `docker/monitoring/`, `AGENT.md` |
| **9**  | Local DB Seeding             | ✅ Done | `npm run db:seed` · module-owned seed use cases · admin & customer accounts · 15-product catalog · inventory levels · documented credentials                                                                                                                                                                                             | `scripts/`, `src/modules/*/core/application/seed/`, `docs/development/`                        |
| **10** | Security Hardening Phase 2   | ✅ Done | OWASP Top 10:2025 audit document (`OWASP-COMPLIANCE.md`) · Dependabot + CI `npm audit` scanning · `eslint-plugin-security` static analysis · Winston PII log redaction · `GlobalExceptionFilter` production error code masking · User-scoped `UserThrottlerGuard` rate limiting                                                          | `.github/`, `docs/security/`, `src/infrastructure/`                                            |

---

## 📋 Pending Work — Execution Sequence

> **Execution guide**: Pick tasks strictly in order from top to bottom. Do not deploy the first production release until **Phase 14 (Single-Instance Production Deploy Gate)** is completed. Complete **Phase 15** before scaling to multiple application instances.

| Phase  | Name                             | Status | Target / Focus                                                                       |
| :----- | :------------------------------- | :----- | :----------------------------------------------------------------------------------- |
| **10** | Security Hardening Phase 2       | `[x]`  | **Security** — OWASP audit, Dependabot, user-scoped rate limits                      |
| **11** | Data Integrity & Concurrency     | `[/]`  | **Data & Stock** — OCC version locking, inventory audit, cart TTL                    |
| **12** | CQRS Read Path                   | `[ ]`  | **Frontend DX** — flat read DTOs, cross-context SQL JOIN adapters                    |
| **13** | Minimum Viable Test Coverage     | `[/]`  | **Quality Safety Net** — domain, repo integration, concurrent checkout & E2E         |
| **14** | Single-Instance Production Gate  | `[ ]`  | **First Production Ship** — baseline migration, Redis failover, probes, backup/smoke |
| **15** | Multi-Instance & Scale Readiness | `[ ]`  | **Horizontal Scale** — Transactional Outbox, SAGA DLQ timeout, search sync, locks    |
| **16** | Performance Engineering          | `[ ]`  | **Observability** — k6 load baselines, V8 profiling, RED/USE Grafana alert rules     |
| **17** | Product Ecosystem & Integrations | `[ ]`  | **Features & Payments** — real email, cart recovery, webhooks, Stripe webhook dedup  |
| **18** | Enterprise Scale & GitOps        | `[ ]`  | **Infrastructure & Enterprise** — Kafka/RabbitMQ, K8s, Canary, S3 backup encryption  |

---

## 🚧 Pre-Production Checklist

---

### Step 1: Single-Instance Production Ship Blockers (Must complete before first deploy)

| Task / Item                                                                              | Phase  | Critical Purpose                                                                         |
| :--------------------------------------------------------------------------------------- | :----- | :--------------------------------------------------------------------------------------- |
| [x] IDOR / object-level access control on carts, orders, payments & customer profile     | **10** | Resolved via `CallerContext`, `CartOwnershipValidator` & `OwnedResourceAccessPolicy`     |
| [x] OWASP audit doc + dependency scanning in CI (`.github/dependabot.yml` + `npm audit`) | **10** | Prevents supply-chain vulnerabilities and documents security baseline                    |
| [x] Production error stack masking & PII log audit verified                              | **10** | Verifies `GlobalExceptionFilter` & Winston do not leak sensitive payloads/stacks in prod |
| Optimistic concurrency (`version` column + 409 on conflict)                              | **11** | Prevents lost updates during concurrent edits by multiple users or admins                |
| Shopping Cart Expiration & Redis TTL enforcement                                         | **11** | Automatically cleans up stale RedisJSON cart instances                                   |
| CQRS read path — query ports, JOIN adapters, flat list/detail DTOs                       | **12** | Solves UI N+1 queries by returning resolved customer names/SKUs in a single SQL query    |
| Initial database baseline migration generated & verified                                 | **14** | Schema must be reproducible without relying on `synchronize: true`                       |
| Redis graceful degradation & `trust proxy` hardening                                     | **14** | Prevents 5xx HTTP drops on Redis disconnects & captures real client IP behind proxy      |
| Liveness, Readiness & `ProcessHealthIndicator` probes                                    | **14** | Exposes `/health/liveness` and `/health/readiness` with event loop & memory thresholds   |
| Backup, restore, rollback runbook & smoke test runner                                    | **14** | Documented runbooks & Node.js scripts (`db-backup.js`, `db-restore.js`, `smoke-test.js`) |

---

### Step 2: Verification & Test Safety Net

| Task / Item                                                                         | Phase  | Critical Purpose                                                                  |
| :---------------------------------------------------------------------------------- | :----- | :-------------------------------------------------------------------------------- |
| E2E smoke tests — auth lifecycle + IDOR denial + SAGA happy path + CQRS list shapes | **13** | Validates HTTP-level security, auth rotation, checkout SAGA, and read projections |
| Repository integration tests (Testcontainers / real DB)                             | **13** | Validates transactional persistence against a real PostgreSQL instance            |
| Concurrent checkout integration proof (pessimistic lock verification)               | **13** | Proves simultaneous checkouts on last stock unit cannot oversell                  |

---

### Step 3: Multi-Instance & Horizontal Scale Readiness (Before scaling to 2+ pods)

| Task / Item                                                      | Phase  | Critical Purpose                                                                     |
| :--------------------------------------------------------------- | :----- | :----------------------------------------------------------------------------------- |
| Transactional Outbox Pattern for domain events                   | **15** | Guarantees at-least-once event delivery across process crashes                       |
| Singleton background jobs & distributed locks (BullMQ / Redlock) | **15** | Prevents duplicated `@Cron()` / BullMQ job execution across multiple pods            |
| Checkout SAGA Timeout & Dead-Letter Queue (DLQ) Recovery Engine  | **15** | Recovers stuck checkout transactions and dispatches alerts on unrecoverable failures |
| Product Search Index Reconciliation Job                          | **15** | Reconciles RedisSearch catalog indexes with PostgreSQL source of truth               |
| [x] User-scoped adaptive rate limiting                           | **10** | Scopes rate limiting per authenticated user ID (`sub`) to stop targeted user abuse   |

---

## 🛡️ Phase 11 — Data Integrity, Concurrency & Inventory Control

> **Goal**: Protect the persistence layer from silent data corruption under concurrent writes — especially inventory during flash-sale checkout. **Complete before Phase 14 deployment.**

---

### [ ] Optimistic Concurrency Control (Version-based Locking)

**What**: Add version-based optimistic concurrency control (OCC) to core aggregates to prevent the classic lost update problem.

**Scope**:

- Add a `@VersionColumn()` field named `version` to core TypeORM database entities (`OrderEntity`, `CartEntity`, `CustomerEntity`, `InventoryEntity`, `ProductEntity`).
- Propagate the `version` field from ORM entities up to Domain Entities and ensure it is returned in all read DTOs.
- Require the entity's current `version` in all HTTP PUT/PATCH update payloads.
- Map TypeORM `OptimisticLockVersionMismatchError` to a clean `409 Conflict` HTTP response via `GlobalExceptionFilter`.
- Write dedicated unit tests simulating concurrent updates — first succeeds, second returns 409.

**Location**: `src/modules/*/core/domain/entities/`, `src/modules/*/secondary-adapters/database/`

---

### [x] Pessimistic Locking for Stock Reservations

**What**: Row-level locking (`SELECT ... FOR UPDATE`) for inventory reservation during checkout.

**Status**: **Implemented** in `PostgresReservationRepository` — inventory rows are locked with `pessimistic_write` inside a transaction before decrementing `availableQuantity`.

**Location**: `src/modules/inventory/secondary-adapters/repositories/postgres-reservation-repository/`

---

### [ ] Shopping Cart Expiration & Redis TTL Enforcement

**What**: Enforce strict Time-To-Live (TTL) on RedisJSON shopping carts to automatically evict abandoned carts and free memory.

**Scope**:

- Configure configurable TTL (e.g. 7 days for guest carts, 30 days for user carts) on Redis keys created by `RedisCartRepository`.
- Refresh TTL on every cart update operation.
- Implement graceful handling when a client attempts to access an expired cart (auto-initialize a fresh cart cleanly).

**Location**: `src/modules/carts/secondary-adapters/repositories/`

---

### [ ] Inventory Reconciliation Audit Job

**What**: Implement a periodic background audit job that verifies inventory mathematical invariants (`totalQuantity == availableQuantity + reservedQuantity + soldQuantity`) and flags discrepancies.

**Scope**:

- Write a BullMQ cron job that scans inventory records and calculates reserved stock against active reservations.
- Detect stock leaks or drift caused by unhandled system crashes.
- Log structured warnings and emit Prometheus metrics (`inventory_drift_count`) when discrepancies are detected.

**Location**: `src/modules/inventory/primary-adapters/jobs/`

---

### [/] Transaction Isolation Level Audit & Query Optimization

**What**: Review transaction isolation configurations, analyze slow queries, and provision composite and partial indexes.

**Scope**:

- Audit transactional boundaries for isolation overrides (e.g. `REPEATABLE READ` for complex inventory adjustments).
- Execute `EXPLAIN ANALYZE` on primary search/filter queries under realistic mock database sizes (10k+ rows).
- Provision composite indexes based on filter frequencies (e.g. `(userID, status)` on orders).
- Add partial indexes on active flags where missing (e.g. active carts, non-deleted products).

**Location**: `src/infrastructure/database/migrations/`, `docs/data/`

---

## ⚡ Phase 12 — CQRS Read Path & Presentation Projections

> **Goal**: Ship list and detail endpoints that return flat, presentation-ready DTOs with resolved customer names, emails, and product SKUs — in a single SQL query per page. **Complete before Phase 14 deployment** so the frontend is not forced to N+1-resolve IDs across orders, inventory, and payments.

---

### [ ] Dedicated Query Ports & Read-Model DTOs

**What**: Create query-specific ports (separate from domain repositories) returning flat, presentation-optimized DTOs.

**Scope**:

- Define `OrderListItemDTO`, `OrderDetailDTO`, `InventoryListItemDTO`, `PaymentListItemDTO` with resolved names/SKUs alongside ID fields.
- Create query port abstract classes: `OrderQueryService`, `InventoryQueryService`, `PaymentQueryService` in the application layer.
- Port contracts are infrastructure-agnostic — no assumptions about JOINs, views, or caching.

**Location**: `src/modules/*/core/application/ports/`

---

### [ ] Cross-Context Query Adapters

**What**: TypeORM `QueryBuilder` adapters with controlled cross-context `LEFT JOIN` on the read path only.

**Scope**:

- Implement adapters in `secondary-adapters/query/` (not `repositories/`).
- JOIN orders → `customers` (name, email), `products` (SKU, catalog details) in one query per list/detail request.
- Document each cross-context JOIN: owning bounded context, why read-only JOIN is acceptable.

**Location**: `src/modules/*/secondary-adapters/query/`

---

### [ ] Query Use Case Refactoring

**What**: Refactor read-only use cases to inject query ports instead of domain repositories.

**Scope**:

- Update `ListOrdersUseCase` and `GetOrderUseCase` to inject `OrderQueryService`.
- Update `ListInventoryUseCase` and payment list/detail use cases similarly.
- Remove costly `.toPrimitives()` mapping on full domain entity arrays for list/search routes.

**Location**: `src/modules/*/core/application/usecases/`

---

### [ ] Controller & Presentation Model Updates

**What**: Update controllers and Swagger schemas to expose flat read-model DTOs.

**Scope**:

- Update REST GET list/detail endpoints in `OrdersController`, `InventoryController`, and `PaymentsController`.
- Create response DTOs with `customerName`, `customerEmail`, `productSku`, etc. explicitly typed in OpenAPI.

**Location**: `src/modules/*/primary-adapters/controllers/`, `src/modules/*/primary-adapters/dtos/`

---

## 🧪 Phase 13 — Minimum Viable Test Coverage

> **Goal**: Establish deployment confidence with smoke-level E2E tests, repository integration tests, and SAGA concurrency proofs.

---

### [/] Test Infrastructure, Fixture & Mock Baseline

**What**: Standardize shared helpers and create typed gateway/repository mock classes.

**Scope**:

- Create `testing/index.ts` barrel files for **Authentication**, **Carts**, **Inventory**, and **Payments** modules to unify exports.
- Create reusable, typed **ACL Gateway Mock** classes for the 8 gateway ports.
- Fix the **Products** testing barrel to export all helpers.

**Location**: `src/testing/`, `src/modules/*/testing/`

---

### [ ] Domain Entity Unit Tests

**What**: Isolated unit tests for core business invariants, state machines, and value objects.

**Scope**:

- Cover order state transitions, cart invariants, address promotion, reservation TTL, payment capture/refund rules, product SKU/price invariants.

**Location**: `src/modules/*/core/domain/entities/`

---

### [ ] Repository Integration Tests (Real DB) & Pessimistic Lock Proof

**What**: Test transactional persistence boundaries against a real database (PostgreSQL Testcontainers).

**Scope**:

- Run postgres and cached repository specs against real PostgreSQL — **not** mocked TypeORM repositories.
- **Concurrent Checkout Proof**: Write a multi-threaded test running simultaneous checkouts against the last remaining stock unit to verify pessimistic lock prevents overselling.
- Test cached repository wrappers: cache hit/miss, invalidation on write, Redis unavailable fallback.

**Location**: `src/modules/*/secondary-adapters/repositories/`

---

### [ ] E2E Smoke Tests

**What**: End-to-end HTTP tests for core flows, security IDOR denial, and CQRS read shapes via `supertest`.

**Scope**:

- Auth: register → login → get token → use token → refresh (with rotation) → logout
- Security: Customer A blocked from reading/updating Customer B's carts, orders, and payments (IDOR prevention)
- Checkout SAGA: full purchase happy path + compensation flow on simulated payment failure
- CQRS projections: verify order list endpoint returns resolved `customerName` and `productSku` fields

**Location**: `test/`

---

## 🚀 Phase 14 — Single-Instance Production Deploy Gate

> **Goal**: Complete core infrastructure and operational requirements for a safe, non-destructive first production deployment on a single application instance.
>
> **Complete all tasks in this phase to deploy your first production release.**

---

### [ ] Initial Database Baseline Migration

**What**: Generate the initial database schema baseline migration from the current TypeORM entities to enable safe production schema updates.

**Scope**:

- Generate the baseline database migration script utilizing TypeORM CLI (`npm run migration:generate:prod`).
- Run migrations on a clean PostgreSQL database to ensure schemas build correctly from scratch.
- Verify migration rollback scripts function properly.
- Update deployment configurations to execute migrations automatically on server startup via `docker-entrypoint.sh`.

**Location**: `src/infrastructure/database/migrations/`, `scripts/docker-migrate.js`

---

### [ ] Graceful Degradation & Reverse Proxy Hardening (`trust proxy` & Redis)

**What**: Configure reverse proxy compatibility and ensure caching, rate limiting, and session layers degrade gracefully if Redis goes offline.

**Scope**:

- Configure `app.set('trust proxy', 1)` in NestJS bootstrap (`src/main.ts`) so Express correctly reads real client IPs from `X-Forwarded-For` when deployed behind reverse proxies.
- Harden central Redis client configuration with connection retry strategies and drop event handlers.
- Refactor cache-aside repository wrappers to query the database directly on cache misses when Redis is offline.
- Ensure rate-limiting (throttler), idempotency, and session stores catch Redis disconnects and degrade gracefully with logged warnings instead of 5xx HTTP drops.

**Location**: `src/main.ts`, `src/infrastructure/redis/`, `src/infrastructure/idempotency/`

---

### [ ] Liveness, Readiness & Process Health Probes

**What**: Expose dedicated health check endpoints for container runtime orchestrators, including V8 runtime process checks.

**Scope**:

- Implement `ProcessHealthIndicator` measuring event loop lag (`max 300ms`) and heap memory limits (`max 85%`).
- Implement `/health/liveness` returning process viability.
- Implement `/health/readiness` checking external dependencies (PostgreSQL + Redis).
- Expose probes in HealthController and update Swagger documentation.

**Location**: `src/modules/health/`

---

### [ ] Release, Rollback, Backup Procedures & Smoke Test Runner

**What**: Build deployment pipeline smoke tests, database backup scripts, and disaster recovery runbooks.

**Scope**:

- Write Node.js scripts to automate PG database backups (`db-backup.js`) and restore procedures (`db-restore.js`).
- Build a post-deploy smoke test runner (`smoke-test.js`) targeting `/health`, `/metrics`, auth flows, catalog browse, and checkout happy path.
- Document comprehensive release, rollback, disaster recovery procedures, and security hardening in `docs/infrastructure/RELEASE-BACKUP-RECOVERY.md`.

**Location**: `scripts/`, `docs/infrastructure/RELEASE-BACKUP-RECOVERY.md`

---

### [ ] Public Demo / Staging Deployment

**What**: Deploy a constrained staging environment for reviewers once security and migrations are verified.

**Scope**:

- Deploy API + managed PostgreSQL/Redis to hosting platform (Railway/Render/Fly.io).
- Expose Swagger/OpenAPI publicly; protect `/metrics` via API key.
- Execute seed data script (`npm run db:seed`).

**Location**: `scripts/`, `docs/infrastructure/`

---

## 🛡️ Phase 15 — Multi-Instance & Horizontal Scale Readiness

> **Goal**: Prepare the application for multi-pod scaling behind a load balancer and protect SAGA workflows from background failures. **Complete before deploying to 2+ application instances.**

---

### [ ] Transactional Outbox Pattern (Cross-Instance Event Backbone)

**What**: Store domain events in an `outbox_events` table within the same database transaction as aggregate mutations to guarantee at-least-once cross-instance event propagation.

**Scope**:

- Create `outbox_events` table schema: `id`, `eventName`, `payload` (JSON), `status`, `retries`, `correlationId`, timestamps.
- Refactor domain event publisher to intercept domain events emitted during write transactions (`OrderCreated`, `InventoryReserved`, `PaymentCaptured`) and append to `outbox_events`.
- Implement `ProcessOutboxQueueJob` running via BullMQ / PostgreSQL `SKIP LOCKED` to pull pending outbox events, dispatch to subscribers, and mark `PROCESSED`.
- Audit domain event listeners to ensure they are **idempotent**.

**Location**: `src/infrastructure/events/outbox/`

---

### [ ] Singleton Background Jobs & Distributed Locking

**What**: Implement distributed locking mechanisms to ensure background schedulers and cron tasks run on exactly one pod at a time in multi-instance deployments.

**Scope**:

- Configure BullMQ repeatable job locks / Redis Redlock wrappers for recurring tasks.
- Prevent duplicate execution of background scheduled jobs (outbox processor, cart recovery, inventory audit) across concurrent API pods.

**Location**: `src/infrastructure/jobs/`

---

### [ ] Checkout SAGA Timeout & Dead-Letter Queue (DLQ) Recovery Engine

**What**: Implement max-duration timeouts and automated compensation trigger for hanging or orphaned checkout SAGA executions.

**Scope**:

- Add SAGA step execution timeout monitor (e.g. 5 minutes max per checkout session).
- Automatically trigger `CheckoutFailureListener` compensation handlers if a SAGA step crashes without resolving.
- Route unrecoverable SAGA failures to a dedicated BullMQ Dead-Letter Queue (DLQ) and fire Prometheus alert counters.

**Location**: `src/modules/orders/primary-adapters/jobs/`

---

### [ ] Product Search Index Reconciliation Job

**What**: Build a scheduled background worker to reconcile RedisSearch product catalog indexes with PostgreSQL canonical data.

**Scope**:

- Implement a BullMQ job that periodically scans PostgreSQL products and re-indexes missing or modified items into RedisSearch.
- Fix catalog search drift caused by direct DB updates or cache flushes.

**Location**: `src/modules/products/primary-adapters/jobs/`

---

## 📈 Phase 16 — Performance Engineering & Observability Maturity

> **Goal**: Define reliability metrics, establish automated performance test baselines, profile the runtime, and provision alert dashboards.

---

### [ ] k6 Load Testing Baseline

**What**: Build and run k6 load testing suites to discover bottlenecks and establish baseline API latency metrics under stress.

**Scope**:

- Write k6 scripts targeting auth lifecycles, catalog searches, cart operations, and concurrent checkout SAGA.
- Set up load profiles (smoke, stress, spike) and define strict target SLO thresholds (e.g. p95 latency < 150ms, checkout success rate > 99%).
- Configure CI checks to fail the pipeline if recent changes cause latency SLO violations.

**Location**: `test/load/`

---

### [ ] Node.js Runtime Profiling & Performance Tuning

**What**: Profile Node's V8 engine and event loop performance under heavy loads to find memory leaks and CPU-heavy hot paths.

**Scope**:

- Implement Prometheus metrics tracking Event Loop Lag (`nodejs_eventloop_lag_seconds`).
- Document heap-dump capture procedures.
- Generate CPU flame graphs using `clinic.js` or `0x` under simulated k6 load tests.

**New documentation**:

- `docs/infrastructure/PERFORMANCE-ENGINEERING.md` — Performance engineering guide covering k6, capacity planning, profiling, and caching.

**Location**: `test/load/results/`, `docs/infrastructure/`

---

### [ ] Alert Rules, RED/USE Dashboards, and SLOs

**What**: Formulate actionable alerting rules, provision custom Grafana dashboards, and document operational runbooks.

**Scope**:

- Define quantitative SLIs/SLOs for latencies, checkout success rates, and queue lags.
- Build RED dashboards for the API and USE dashboards for PostgreSQL/Redis/BullMQ.
- Setup Prometheus Alertmanager rules for 5xx spikes, high latency, queue backlog depths, and failed background jobs.

**Location**: `docker/monitoring/`, `docs/observability/`

---

## 📦 Phase 17 — Product Ecosystem, Webhooks & Real Integrations

> **Goal**: Elevate store value by integrating real communication providers, automated cart recovery, outbound webhook subscriptions, and production Stripe payments with webhook deduplication.

---

### [ ] Real Email and Notification Providers

**What**: Integrate real email delivery gateways (SendGrid/Resend) behind the existing notification gateway port.

**Scope**:

- Implement Resend or SendGrid secondary adapters for the notification gateway port.
- Build BullMQ queues to handle outbound email sending asynchronously with retry policies.
- Wire up order confirmations, password resets, and shipping updates to trigger real emails.

**Location**: `src/modules/notifications/secondary-adapters/mail/`

---

### [ ] Automated Abandoned Cart Recovery & Shipping Notification Engine

**What**: Implement background job schedulers that scan for inactive carts and dispatch recovery emails.

**Scope**:

- Implement a BullMQ scheduler job scanning inactive carts (e.g. 12+ hours).
- Generate recovery email templates with single-click checkout restoration links.
- Dispatch real-time WebSocket events and emails when order shipping status changes.

**Location**: `src/modules/carts/primary-adapters/jobs/`

---

### [ ] Outbound Webhook Subscription System

**What**: Build a secure webhook subscription framework that allows external merchant applications to receive real-time order and payment event payloads.

**Scope**:

- Create `WebhookSubscription` aggregate: `id`, `targetUrl`, `secret`, `events` (e.g. `order.created`, `payment.captured`), `isActive`, `createdAt`.
- Implement admin CRUD endpoints under RBAC.
- Build BullMQ webhook delivery queue signing payloads with HMAC-SHA256 signatures in headers.
- Maintain `WebhookDeliveryLog` table recording delivery status, HTTP status codes, and latencies.

**Location**: `src/modules/webhooks/`

---

### [ ] Real Stripe Integration & Webhook Idempotency

**What**: Replace mock payment gateway with production Stripe SDK integration and explicit webhook event deduplication.

**Scope**:

- Implement Stripe SDK secondary adapter for `PaymentIntent` creation, capture, and refunds.
- Implement signed Stripe webhook controller verifying `stripe-signature` header.
- **Stripe Webhook Idempotency**: Persist processed `event.id` values to Redis/DB with TTL to prevent duplicate processing of replayed webhook events.

**Location**: `src/modules/payments/secondary-adapters/stripe/`

---

## 🌐 Phase 18 — Enterprise Scale, GitOps & Deployment Maturity

> **Goal**: Support high-scale message streaming, multi-merchant enterprise SaaS capabilities, Kubernetes container orchestration, and zero-downtime Canary deployment pipelines.

---

### [ ] Message Broker Adapter (Kafka or RabbitMQ)

**What**: Replace or supplement local event bus with a real message broker adapter for durable, multi-instance cross-process event streaming.

**Scope**:

- Implement broker adapter implementing `DomainEventPublisher` port.
- Enable consumer group scaling, dead-letter exchanges, and schema versioning.

**New documentation**:

- `docs/integration/MESSAGE-BROKER-PATTERNS.md`

**Location**: `src/infrastructure/events/broker/`

---

### [ ] Enterprise SaaS Readiness (Multi-Tenancy, Audit Log & Data Exchange)

**What**: Multi-merchant SaaS scaling, user permission overrides, immutable admin audit trails, and bulk CSV/Excel import/export.

**Scope**:

- Implement schema-per-tenant or row-level tenant data isolation.
- Implement user-level permission overrides merging role permissions with explicit user exceptions.
- Implement append-only `AuditLog` entity recording sensitive admin actions.
- Build background CSV/Excel import/export processors with dry-run support.

**Location**: `src/infrastructure/database/multi-tenancy/`, `src/modules/audit/`, `src/modules/data-exchange/`

---

### [ ] Kubernetes Deployment Configuration & Zero-Downtime Rollouts

**What**: Package the API monolith using production-grade Kubernetes resource manifests and Canary deployment rollouts.

**Scope**:

- Write Pod Deployments, Service routes, Ingress gateways, and HPA templates.
- Configure Canary routing configurations in Kubernetes Ingress controllers with automated SLO rollback.

**New documentation**:

- `docs/infrastructure/CONTAINER-ORCHESTRATION.md`

**Location**: `k8s/`, `docs/infrastructure/`

---

### [ ] Backup Encryption & Off-Site Cloud Storage

**What**: Encrypt database backup dumps and automate off-site storage to cloud object stores for disaster recovery.

**Scope**:

- Wrap `db-backup.js` with GPG asymmetric encryption.
- Automate upload of encrypted backups to cloud object stores (AWS S3 / GCS) with retention policies.

**Location**: `scripts/`, `docs/infrastructure/RELEASE-BACKUP-RECOVERY.md`

---

## ❌ Skipped (Premature)

| Task                        | Reason                                                                                                                                                                                        | Reconsider When                                                                                                                  |
| :-------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| DB Sharding                 | PostgreSQL handles millions of rows with proper indexing (Phase 11). Horizontal partitioning adds massive operational complexity.                                                             | Single-node PostgreSQL becomes the bottleneck after index optimization and read replicas are exhausted.                          |
| Event Sourcing              | State-based persistence with SAGA compensation is correct for e-commerce. Event sourcing adds projection/replay complexity with no current benefit.                                           | Domain requires reconstructing full historical state at any millisecond.                                                         |
| Data Archival               | Only relevant when orders table exceeds ~500K rows.                                                                                                                                           | Database storage costs or list queries degrade due to table size.                                                                |
| GraphQL                     | REST + Swagger is sufficient for current clients. GraphQL adds resolver complexity, N+1 risks, and a new security surface.                                                                    | Multiple frontends need significantly different response shapes from the same data.                                              |
| Microservices               | Modular monolith with ACL gateways and domain events is architecturally ready for extraction. Extraction is an operational decision requiring independent deployment and on-call per service. | A single module needs independent scaling, release cadence, or technology stack.                                                 |
| Full Dual-Database CQRS     | CQRS Phase 2 (dedicated read methods, Phase 12) gives most performance benefit at fraction of complexity. Separate read/write DBs require eventual consistency and projection infrastructure. | Read traffic needs independent horizontal scaling from write traffic, or read latency SLOs cannot be met with a single database. |
| gRPC Internal Communication | REST is sufficient for modular monolith. gRPC shines for inter-service communication with strict contracts and low latency.                                                                   | Microservice extraction happens and services need typed, low-latency internal APIs.                                              |
