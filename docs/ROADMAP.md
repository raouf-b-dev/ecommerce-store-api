# 🗺️ E-Commerce Store API — Feature Roadmap

> A living roadmap for the E-Commerce Store API project. Each phase includes enough context for any contributor or AI agent to pick up tasks in a fresh session.
>
> **Companion docs**: [`AGENT.md`](../AGENT.md) (coding guidelines), [`docs/architecture/DDD-HEXAGONAL.md`](architecture/DDD-HEXAGONAL.md) (strict DDD reference), [`docs/architecture/CQRS.md`](architecture/CQRS.md) (CQRS read-path analysis), [`docs/integration/INTEGRATION-PATTERNS.md`](integration/INTEGRATION-PATTERNS.md) (cross-context communication), [`docs/security/SECRETS-MANAGEMENT.md`](security/SECRETS-MANAGEMENT.md) (secrets & env management)

---

## How to Use This File

- `[ ]` — Not started
- `[/]` — In progress
- `[x]` — Completed
- Open a new chat, reference this file, and pick the next unchecked task.
- **Completed phases 0–9** keep their original numbers. **Pending work starts at Phase 10** (priority-ordered).

---

## ✅ Completed Phases — Summary

> Full implementation detail has been collapsed for readability. The history and decisions are preserved in git.
>
> Sub-phases (7.5, 7.6, 8.1, 8.5, 8.6) are merged into their parent rows below.

| Phase | Name                         | Status  | Key Deliverables                                                                                                                                                                                                                                                                                                                         | Location                                                                                       |
| :---- | :--------------------------- | :------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------- |
| **0** | Foundation                   | ✅ Done | DDD/Hexagonal scaffold · 10 modules (Authentication, Authorization, Carts, Health, Identity, Inventory, Notifications, Orders, Payments, Products) · JWT auth · Passport strategies · Redis WebSocket adapter · BullMQ jobs · Swagger/OpenAPI                                                                                            | `src/modules/`, `src/infrastructure/`                                                          |
| **1** | ACL Gateway & SAGA           | ✅ Done | 8 ACL Gateways across Orders, Carts, Authentication · BullMQ checkout SAGA with `CheckoutFailureListener` compensation (refund, stock release, order cancellation) · Gateway DTOs decoupled from domain entities                                                                                                                         | `src/modules/orders/`, `src/modules/carts/`                                                    |
| **2** | Result Pattern & Idempotency | ✅ Done | Functional `Result<T, E>` across all layers · `@Idempotent()` decorator with Redis-backed store for checkout protection · idempotency fail-open on Redis errors                                                                                                                                                                          | `src/shared-kernel/`, `src/infrastructure/idempotency/`                                        |
| **3** | Decorator-based Caching      | ✅ Done | `CachedRepository` decorator pattern wrapping Postgres repositories with Redis cache-aside                                                                                                                                                                                                                                               | `src/modules/*/secondary-adapters/repositories/cached-*/`                                      |
| **4** | Test Suite Foundation        | ✅ Done | Use case unit tests (all modules) · mock-based repository specs · controller/guard tests · architecture boundary tests (`test:arch`) · shared test helpers · Docker Compose for local dev (PostgreSQL + Redis Stack)                                                                                                                     | `src/modules/*/`, `src/testing/`, `test/architecture/`                                         |
| **5** | Code Quality (v0.2.0)        | ✅ Done | Removed redundant try/catch from use case/service files · Trimmed orders table indexes · Migration CLI scripts configured (`data-source.ts`, `scripts/docker-migrate.js`)                                                                                                                                                                | `data-source.ts`, `package.json`                                                               |
| **6** | Deployment Blockers          | ✅ Done | Multi-stage `Dockerfile` (Node 24 Alpine, tini, non-root) · `GlobalExceptionFilter` · graceful shutdown (`SIGTERM` drain) · `docker-entrypoint.sh` migration runner · `docker-compose.prod.yml` hardening (healthchecks, log rotation, memory limits, network isolation) · `scripts/generate-envs.js`                                    | `Dockerfile`, `docker-compose.prod.yml`, `scripts/`                                            |
| **7** | Security & Authentication    | ✅ Done | Helmet · CORS whitelist · XSS sanitization · `ValidationPipe` hardening (`forbidNonWhitelisted`) · pagination `@Max(100)` · RSA RS256 JWT · refresh token rotation + reuse detection · session tracking · full RBAC (roles/permissions/guards) · logout/logout-all · authentication endpoint `@Throttle`                                 | `src/main.ts`, `src/modules/authentication/`, `src/infrastructure/jwt/`                        |
| **8** | Observability & SaaS         | ✅ Done | Winston structured logging · `/health` · correlation ID middleware (`X-Request-Id`) · BullMQ job correlation propagation · API versioning (`/v1`) · Redis-backed rate limiting · Prometheus (`/metrics`) · Grafana/Loki/Tempo stack · OpenTelemetry tracing · hexagonal boundary audit · agent docs (`AGENT.md`, `.agents/`, `docs/ai/`) | `src/infrastructure/logging/`, `src/infrastructure/metrics/`, `docker/monitoring/`, `AGENT.md` |
| **9** | Local DB Seeding             | ✅ Done | `npm run db:seed` · module-owned seed use cases · admin & customer accounts · 15-product catalog · inventory levels · documented credentials                                                                                                                                                                                             | `scripts/`, `src/modules/*/core/application/seed/`, `docs/development/`                        |

---

## 📋 Pending Work — Priority Order

> Historical phase numbers **0–9** are fixed (completed work). **Pending phases are renumbered 10+** by execution priority — security and integrity first, CQRS read path second (frontend N+1), tests third, deployment gate last among pre-prod work.
>
> **Pick the next task**: start at Phase 10 and work downward. Do not start Phase 14 (Deployment) until every **Required** pre-production blocker below is checked off.

| Phase  | Name                              | Status | When                                                                                        |
| :----- | :-------------------------------- | :----- | :------------------------------------------------------------------------------------------ |
| **10** | Security Hardening Phase 2        | `[/]`  | **First** — IDOR controls implemented; OWASP audit/rate limits remain                       |
| **11** | Data Integrity & Concurrency      | `[/]`  | Before prod load — prevent silent corruption & overselling regressions                      |
| **12** | CQRS Read Path                    | `[ ]`  | Before ship — flat list/detail DTOs; stop N+1 name resolution hitting the frontend          |
| **13** | Test Suite (remaining)            | `[/]`  | After Phases 10–12 — validate security, integrity, and read projections with real DB & HTTP |
| **14** | Deployment & Production Hardening | `[ ]`  | **Production gate** — migrations, resilience, backup, demo deploy                           |
| **15** | Reliable Event Infrastructure     | `[ ]`  | Before multi-instance / high-reliability prod                                               |
| **16** | Performance Engineering           | `[ ]`  | Staging baseline — SLOs, load tests, alerting maturity                                      |
| **17** | Product Ecosystem & Automation    | `[ ]`  | Post-MVP — email, abandoned cart recovery, shipping notifications                           |
| **18** | Message Broker Adapter            | `[ ]`  | Enterprise scale — Kafka/RabbitMQ durable event backbone                                    |
| **19** | Outbound Webhooks                 | `[ ]`  | Merchant integrations — order/payment event subscriptions                                   |
| **20** | Payment Provider Integrations     | `[ ]`  | Production Stripe adapter replacing mock gateway                                            |
| **21** | Access Control & SaaS Readiness   | `[ ]`  | Only when needed — multi-tenant, audit trail, bulk import/export                            |
| **22** | Deployment Maturity & GitOps      | `[ ]`  | After first prod deploy — K8s, feature flags, canary rollouts                               |

---

## 🚧 Pre-Production Blockers

> Consolidated checklist of tasks that **must not ship to production without resolution**. Items map to phases above; several were previously buried in later phases (Security Phase 15, CQRS Phase 11, Deployment Phase 16) and are now ordered before the Deployment gate (Phase 14).
>
> **Already done in this codebase** (not listed as blockers): refresh token rotation · session reuse detection · RBAC infrastructure · checkout SAGA · pessimistic inventory locking at reservation time · production error stack masking · Docker prod compose hardening · migration runner script (`docker-entrypoint.sh`).

### Required (production gate)

| Blocker                                                                               | Phase  | Why it blocks prod                                                                                                                                                                                               |
| :------------------------------------------------------------------------------------ | :----- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IDOR / ownership on carts, orders, payments, customers                                | **10** | **Addressed**                                                                                                                                                                                                    |
| User-scoped permissions (`view_own_profile`, `manage_own_addresses`)                  | **10** | **Addressed** — user role permissions and session validation are implemented                                                                                                                                     |
| OWASP audit doc + dependency scanning in CI (`npm audit`, fail on high/critical)      | **10** | No systematic security review or supply-chain gate in pipeline (CI runs lint/test/build only)                                                                                                                    |
| Production PII/payment data masking verified in logs                                  | **10** | `GlobalExceptionFilter` hides stacks in prod; payment payloads and customer PII in structured logs still need audit                                                                                              |
| Optimistic concurrency (`version` column + 409 on conflict)                           | **11** | Concurrent admin/customer updates can silently overwrite each other — no `@VersionColumn()` on core entities yet                                                                                                 |
| Hot-path query audit (`EXPLAIN ANALYZE`) + missing composite/partial indexes          | **11** | Theory docs exist under `docs/data/` and orders indexes were trimmed (Phase 5), but prod-scale filter queries are not benchmarked                                                                                |
| CQRS read path — query ports, JOIN adapters, flat list/detail DTOs                    | **12** | `ListOrdersUseCase` / `GetOrderUseCase` hydrate full domain aggregates via write repositories; frontends must N+1-fetch customer names and product SKUs per row — poor UX and unsustainable API chatter at scale |
| Cross-context SQL JOINs on read path (orders ↔ customers, products)                  | **12** | Without single-query projections, every admin order list forces the client to resolve IDs — the N+1 problem is delegated to the UI                                                                               |
| Concurrent checkout integration proof (pessimistic lock regression)                   | **13** | Pessimistic locking is implemented in `PostgresReservationRepository`, but no real-DB concurrent worker test proves oversell prevention                                                                          |
| Repository integration tests (Testcontainers / CI Postgres)                           | **13** | Repository specs exist but use mocked TypeORM repositories — transactional paths untested against real PostgreSQL                                                                                                |
| E2E tests — authentication lifecycle + IDOR denial + checkout SAGA + CQRS list shapes | **13** | `test/security-idor.e2e-spec.ts` exists with HTTP IDOR denial proofs; remaining authentication/SAGA/CQRS E2E coverage is scheduled                                                                               |
| Initial database baseline migration generated & verified                              | **14** | No files under `src/infrastructure/database/migrations/`; non-prod still uses `synchronize: true`                                                                                                                |
| Redis graceful degradation (cache, throttler, idempotency, sessions)                  | **14** | Idempotency fails open; cached repositories and throttler still throw or fail when Redis is unavailable                                                                                                          |
| Backup, restore, release, and rollback runbooks + smoke test runner                   | **14** | No verified recovery path or post-deploy health verification scripts                                                                                                                                             |
| Public demo/staging deploy with migrations (not `synchronize`)                        | **14** | Demo deployment belongs at the production gate once Phases 10–13 are complete                                                                                                                                    |

### Recommended before multi-instance / high-traffic production

| Blocker                                                                | Phase  | Why                                                                              |
| :--------------------------------------------------------------------- | :----- | :------------------------------------------------------------------------------- |
| Transactional outbox for domain events                                 | **15** | In-process events can be lost if the process crashes after DB commit             |
| User-scoped adaptive rate limiting (beyond authentication `@Throttle`) | **10** | Global IP-based limiter; checkout and catalog abuse needs per-user keys          |
| k6 load baseline + p95 SLO thresholds                                  | **16** | Unknown capacity limits before traffic spikes (flash sales, concurrent checkout) |
| Alert rules + RED/USE Grafana dashboards                               | **16** | Observability stack exists (Phase 8) but actionable alerting is incomplete       |

---

## 🔐 Phase 10 — Security Hardening Phase 2 (OWASP Compliance)

> **Goal**: Close access-control gaps left after Phase 7 transport/input hardening. **Complete before Phase 13 E2E tests** so security scenarios can be asserted in the test suite.
>
> Phase 7 covered Helmet, CORS, sanitization, validation, RBAC guards, refresh rotation, and authentication rate limits. Phase 10 covers **who can access which records** — especially customer-owned carts, orders, and payments.

---

### [x] IDOR (Insecure Direct Object Reference) Prevention

**Status**: Implemented. See E2E suite [test/security-idor.e2e-spec.ts](../test/security-idor.e2e-spec.ts).

**What**: Entity-level access control so customers can only access resources they own. Shopping carts strictly bound to authenticated user accounts (`userId: number`).

**Delivered**:

- Customer-scoped permissions including `view_own_profile`, `manage_own_addresses`, `view_own_orders`, `view_own_payments`, `manage_own_cart`
- `OwnedResourceAccessPolicy` in shared-kernel for orders, payments, customers
- `CartOwnershipValidator` for authenticated user cart validation
- Checkout cart validation via `validateCartForCheckout` with real `CallerContext`
- `@RequirePermissions` + `@CallerCtx()` on customer, order, payment endpoints
- Full-app IDOR E2E tests (requires PostgreSQL + Redis)

**Location**: `src/shared-kernel/domain/policies/`, `src/modules/*/core/application/usecases/`, `test/security-idor.e2e-spec.ts`

---

### [ ] OWASP Top 10 Audit & Vulnerability Scanning

**What**: Perform a comprehensive security audit, add CI dependency scanning, and document controls.

**Scope**:

- Systematically audit the system against OWASP Top 10 categories; map each to existing or new controls.
- Integrate `npm audit` (fail CI on high/critical) — not present in `.github/workflows/ci.yml` today.
- Verify error details are completely masked in production responses and logs.
- Audit payment webhook endpoints and checkout flows for injection and replay risks.

**New documentation**:

- `docs/security/OWASP-COMPLIANCE.md` — **Created** — A01 access control mapping; extend with full Top 10 audit in remaining Phase 10 work.

**Location**: `docs/security/`, `.github/workflows/`

---

### [ ] Adaptive, User-Scoped Rate Limiting

**What**: Refine the global IP-based limiter with per-authenticated-user keys and progressive limits on high-risk endpoints.

**Scope**:

- Scope rate limit keys using authenticated user IDs (`sub` / `customerId`) in addition to IP addresses once `AuthGuard` has run.
- Apply stricter limits to `/authentication/login`, `/authentication/refresh` (extend existing `@Throttle` on auth controller), `/orders/checkout`, and cart mutation endpoints.
- Expose standard rate limit headers on throttled responses.

**Location**: `src/infrastructure/throttler/`

---

## 🛡️ Phase 11 — Data Integrity & Concurrency Control

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

**Reference**: Theory docs already exist at `docs/data/concurrency/OPTIMISTIC-LOCKING.md`.

**Location**: `src/modules/*/core/domain/entities/`, `src/modules/*/secondary-adapters/database/`

---

### [x] Pessimistic Locking for Stock Reservations

**What**: Row-level locking (`SELECT ... FOR UPDATE`) for inventory reservation during checkout.

**Status**: **Implemented** in `PostgresReservationRepository` — inventory rows are locked with `pessimistic_write` inside a transaction before decrementing `availableQuantity`.

**Remaining** (tracked in Phase 13): concurrent integration test proving two simultaneous checkouts cannot oversell the last unit.

**Location**: `src/modules/inventory/secondary-adapters/repositories/postgres-reservation-repository/`

---

### [/] Transaction Isolation Level Audit & Query Optimization

**What**: Review transaction isolation configurations, analyze slow queries, and provision composite and partial indexes.

**Status**: **Partial** — concurrency theory docs exist under `docs/data/concurrency/` and `docs/data/performance/`; orders table indexes were trimmed in Phase 5; pessimistic reservation path uses explicit transactions.

**Scope** (remaining):

- Audit transactional boundaries for isolation overrides (e.g. `REPEATABLE READ` for complex inventory adjustments).
- Execute `EXPLAIN ANALYZE` on primary search/filter queries under realistic mock database sizes (10k+ rows).
- Provision composite indexes based on filter frequencies (e.g. `(customerId, status)` on orders — partial index exists; audit other hot tables).
- Add partial indexes on active flags where missing (e.g. active carts, non-deleted products).
- Address any N+1 relational query loops detected in TypeORM logging.

**Location**: `src/infrastructure/database/migrations/`, `docs/data/`

---

## ⚡ Phase 12 — CQRS Read Path & Frontend Response Simplification

> **Goal**: Ship list and detail endpoints that return flat, presentation-ready DTOs with resolved customer names, emails, and product SKUs — in a single SQL query per page. **Complete before Phase 14 deployment** so the frontend is not forced to N+1-resolve IDs across orders, inventory, and payments.
>
> **Why this is a pre-production blocker**: Today `ListOrdersUseCase` and `GetOrderUseCase` load full domain aggregates via write repositories. Any admin order list or customer order history forces the UI to fetch customer and product details per row — delegating the N+1 problem to the client, multiplying API calls, and degrading UX under real catalog sizes.
>
> **Architectural note**: Controlled cross-context SQL JOINs on the **read path only**. Write paths continue to use ACL Gateways exclusively. See [`docs/architecture/CQRS.md`](architecture/CQRS.md) for full rationale.

---

### [ ] Dedicated Query Ports & Read-Model DTOs

**What**: Create query-specific ports (separate from domain repositories) returning flat, presentation-optimized DTOs.

**Scope**:

- Define `OrderListItemDTO`, `OrderDetailDTO`, `InventoryListItemDTO`, `PaymentListItemDTO` with resolved names/SKUs alongside ID fields.
- Create query port abstract classes: `OrderQueryService`, `InventoryQueryService`, `PaymentQueryService` in the application layer.
- Port contracts are infrastructure-agnostic — no assumptions about JOINs, views, or caching.
- **Do NOT** add read-projection methods to existing domain repositories (`OrderRepository`, `ProductRepository`, etc.).

**Location**: `src/modules/*/core/application/ports/`

---

### [ ] Cross-Context Query Adapters

**What**: TypeORM `QueryBuilder` adapters with controlled cross-context `LEFT JOIN` on the read path only.

**Scope**:

- Implement adapters in `secondary-adapters/query/` (not `repositories/`).
- JOIN orders → `customers` (name, email), `products` (SKU, catalog details) in one query per list/detail request.
- Document each cross-context JOIN: owning bounded context, why read-only JOIN is acceptable, what changes on microservice extraction.
- Leave write-path repositories completely untouched.

**Location**: `src/modules/*/secondary-adapters/query/`

---

### [ ] Query Use Case Refactoring (CQRS Phase 2 Graduation)

**What**: Refactor read-only use cases to inject query ports instead of domain repositories.

**Scope**:

- Update `ListOrdersUseCase` and `GetOrderUseCase` to inject `OrderQueryService`.
- Update `ListInventoryUseCase` and payment list/detail use cases similarly.
- Remove costly `.toPrimitives()` mapping on full domain entity arrays for list/search routes.
- Establish clean separation: read paths → query ports + light DTOs; write paths → domain repository ports + rich entities.

**Location**: `src/modules/*/core/application/usecases/`

---

### [ ] Controller & Presentation Model Updates

**What**: Update controllers and Swagger schemas to expose flat read-model DTOs.

**Scope**:

- Update REST GET list/detail endpoints in `OrdersController`, `InventoryController`, and `PaymentsController`.
- Create response DTOs with `customerName`, `customerEmail`, `productSku`, etc. explicitly typed in OpenAPI.
- Coordinate with frontend to decommission manual ID-to-name mapping layers.

**Location**: `src/modules/*/primary-adapters/controllers/`, `src/modules/*/primary-adapters/dtos/`

---

## 🧪 Phase 13 — Test Suite _(in progress)_

> **Goal**: Establish confidence for production deployment. **Run after Phases 10–12** so E2E tests can assert IDOR denial, concurrency behavior, CQRS read projections, and real DB transactions.
>
> **Completed** (see summary table): use case unit tests · mock-based repository specs · controller/guard tests · architecture boundary tests · shared test helpers.
>
> **Mandatory prerequisite before starting any remaining Phase 13 item**:
>
> 1. Follow the testing standards in [`docs/testing/TESTING-TASK-TEMPLATE.md`](testing/TESTING-TASK-TEMPLATE.md) for checklist + evidence in every task/PR
> 2. Ensure test scope and scenario matrices are explicitly mapped prior to writing specs
> 3. For Repository Integration/E2E work, define harness + cleanup plan up front (PostgreSQL Testcontainers or CI service containers + `database-test.helper.ts`) before writing specs
> 4. **Phase 10 IDOR controls must be implemented** before writing IDOR E2E scenarios (or mark those scenarios as `@pending` with linked issue)

---

### [/] Test Infrastructure Baseline (Phase 13 Entry Gate)

**What**: Standardize and complete the shared reusable test infrastructure.

**Scope**:

- _Done:_ Shared helpers under `src/testing/helpers/` (`result-assertion`, `database-test`, `e2e-test-app`, `auth-test`, `clock-test`, `nestjs-context.fixture`).
- _Remaining:_ Create `testing/index.ts` barrel files for **Authentication**, **Carts**, **Inventory**, and **Payments** modules to unify exports.

**Location**: `src/testing/`, `src/modules/*/testing/`

---

### [/] Fixture, Factory, and Mock Baseline (Phase 13 Entry Gate)

**What**: Standardize deterministic test data builders and reusable mock classes.

**Scope**:

- _Done:_ 47+ fixture/builder/mock files across modules.
- _Remaining:_
  - Create reusable, typed **ACL Gateway Mock** classes for the 8 gateway ports (orders, payments, carts, notifications).
  - Fix the **Products** testing barrel to export all helpers.
  - Remove redundant `ReservationRepositoryMockFactory` wrapper.
  - Adopt unused builders (`ProductBuilder`, `InventoryBuilder`); create `CartBuilder` and `PaymentBuilder`.

**Location**: `src/modules/*/testing/`

---

### [ ] Domain Entity Unit Tests

**What**: Isolated unit tests for core business invariants, state machines, and value objects.

**Scope**:

- _Status:_ Done for **Authentication** module (5 specs). Missing for Orders, Carts, Customers, Inventory, Payments, Products.
- Cover order state transitions, cart invariants, address promotion, reservation TTL, payment capture/refund rules, product SKU/price invariants.

**Location**: `src/modules/*/core/domain/entities/`

---

### [/] Use Case Unit Tests

**What**: Refactor specs using centralized mock layers instead of fragile inline `jest.fn()` mocks.

**Scope**:

- _Status:_ 40+ use case spec files exist.
- _Remaining:_ Refactor checkout/SAGA specs (`checkout.usecase.spec.ts`, `create-order-from-cart.usecase.spec.ts`, `validate-checkout.usecase.spec.ts`, `reserve-stock.job.spec.ts`, `checkout-failure.listener.spec.ts`) to use centralized gateway/repository mocks.

**Location**: `src/modules/*/core/application/usecases/`

---

### [/] Controller and Guard Tests

**What**: Standardize controller specs to use `MockUseCase<T>` instead of inline mocks.

**Location**: `src/modules/*/primary-adapters/controllers/`, `src/modules/*/primary-adapters/guards/`

---

### [ ] Repository Integration Tests (Real DB)

**What**: Transactional operations and persistence mappings tested against a live PostgreSQL instance.

**Scope**:

- Run postgres and cached repository specs against real PostgreSQL (Docker Testcontainers or CI service containers) using `database-test.helper.ts` — **not** mocked TypeORM repositories.
- Verify SAGA transactional operations, pessimistic lock behavior, and tag/category filtering.
- Test cached repository wrappers: cache hit/miss, invalidation on write, Redis unavailable fallback.

**Location**: `src/modules/*/secondary-adapters/repositories/`

---

### [ ] E2E Tests

**What**: End-to-end HTTP flows using `supertest` against the full NestJS application.

**Scope**:

- _Status:_ `test/authentication.e2e-spec.ts` exists but mocks use cases — not a full-app integration test.
- Authentication: register → login → token usage → refresh (with rotation) → logout
- **Security**: Customer A blocked from reading/updating Customer B's carts, orders, and payments (Phase 10 IDOR)
- Catalog & purchase: browse → add to cart → checkout SAGA success
- **SAGA compensation**: payment failure → inventory released, order cancelled, compensations logged
- **Concurrency**: simultaneous checkout on last stock unit — exactly one succeeds (Phase 11)
- **CQRS read path**: order/inventory list responses include resolved `customerName`, `productSku` without extra round-trips (Phase 12)
- Observability: `X-Request-Id` flows through responses, logs, and traces

**Location**: `test/`

---

## 🚢 Phase 14 — Deployment and Production Hardening

> **Goal**: **Production deployment gate.** Harden infrastructure and operational scripts for safe, repeatable staging and production releases. **Do not deploy until Phases 10–13 required blockers are complete.**

---

### [ ] Initial Database Migration

**What**: Generate the initial database schema baseline migration from current TypeORM entities.

**Scope**:

- Run `npm run migration:generate:dev -- src/infrastructure/database/migrations/InitialSchema` (or equivalent path aligned with `data-source.ts`).
- Verify migration runs cleanly on an empty database and rollback works.
- Confirm `docker-entrypoint.sh` → `scripts/docker-migrate.js` executes migrations before serving traffic in production.
- Disable reliance on `synchronize: true` for staging/demo environments.

**Location**: `src/infrastructure/database/migrations/`, `scripts/docker-migrate.js`

---

### [ ] Graceful Degradation Hardening (Redis Failover)

**What**: Ensure caching, rate limiting, and session layers degrade gracefully (fail open) when Redis goes offline.

**Scope**:

- Harden central Redis client configuration with retry strategies and connection drop handlers.
- Refactor cache-aside repository wrappers to catch Redis errors and query Postgres directly on cache miss when Redis is down.
- Ensure throttler, idempotency (already fail-open), and session stores degrade with logged warnings rather than 5xx errors.
- Write integration tests simulating Redis stop/start during API requests.

**Location**: `src/infrastructure/redis/`, `src/infrastructure/idempotency/`, `src/infrastructure/throttler/`

---

### [ ] Release, Rollback, and Backup Procedures

**What**: Build deployment smoke tests, database backup scripts, and disaster recovery runbooks.

**Scope**:

- Write scripts to automate PG database backups and verify restore procedures.
- Build a post-deploy smoke test runner targeting `/health`, `/metrics`, auth flows, catalog browse, and checkout happy path.
- Define a structured release and rollback checklist covering migration execution and smoke test verification.

**Location**: `scripts/`, `docs/infrastructure/`

---

### [ ] Public Demo / Staging Deployment

**What**: Deploy a constrained demo environment for reviewers once security and migrations are ready.

**Scope**:

- Deploy API + managed Postgres/Redis to a fast-iteration platform (Railway, Render, Fly.io, etc.).
- Expose Swagger/OpenAPI publicly.
- Protect admin/destructive operations via RBAC guards.
- Ensure `/health` is public; protect `/metrics` (API key or network restriction).
- Seed demo data via `npm run db:seed`.

**Location**: `scripts/`, `docs/infrastructure/`

---

## 🔄 Phase 15 — Reliable Event Infrastructure: The Outbox Pattern

> **Goal**: Guarantee at-least-once delivery of cross-context and external events via the Transactional Outbox pattern.
>
> **Recommended before multi-instance production** — see Pre-Production Blockers table. Safe to defer for a single-instance staging deploy if domain-event loss on crash is accepted temporarily.

---

### [ ] Outbox Event Persistence

**What**: Store domain events in an `outbox_events` table within the same database transaction as aggregate mutations.

**Scope**:

- Design `outbox_events` table schema: `id`, `eventName`, `payload` (JSON), `status`, `retries`, `correlationId`, timestamps.
- Create `OutboxEventRepository` interface and TypeORM secondary adapter.
- Intercept domain events during write transactions (`OrderCreated`, `InventoryReserved`, `PaymentCaptured`) and persist to outbox in the same transaction.

**Location**: `src/infrastructure/events/outbox/`

---

### [ ] Resilient BullMQ Outbox Poller and Dispatcher

**What**: BullMQ recurring task polling pending outbox events, dispatching to subscribers, marking processed/failed.

**Scope**:

- Implement `ProcessOutboxQueueJob` on a high-frequency schedule.
- Inject events into local `EventEmitter2` listeners or external brokers (Phase 18).
- Audit all domain event listeners for **idempotency**.
- Expose Prometheus metrics for outbox lag and delivery failure rates.

**Location**: `src/infrastructure/events/outbox/jobs/`

---

## 📈 Phase 16 — Performance Engineering & Observability Maturity

> **Goal**: Define reliability metrics, establish automated performance test baselines, profile the runtime, and provision alert dashboards.
>
> **Run against staging** after Phase 14 first deploy — establishes SLO baselines before scaling traffic.

---

### [ ] k6 Load Testing Baseline

**What**: Build and run k6 load testing suites to discover bottlenecks and establish baseline API latency metrics.

**Scope**:

- Write k6 scripts targeting auth lifecycles, catalog searches, cart operations, and concurrent checkout.
- Set up load profiles (smoke, stress, spike) and define SLO thresholds (e.g. p95 latency < 150ms, checkout success rate > 99%).
- Configure CI checks to fail on SLO violations (optional initially).

**Location**: `test/load/`

---

### [ ] Node.js Runtime Profiling & Performance Tuning

**What**: Profile Node's V8 engine and event loop under heavy loads.

**Scope**:

- Implement Prometheus metrics for Event Loop Lag (`nodejs_eventloop_lag_seconds`).
- Document heap-dump capture procedures.
- Generate CPU flame graphs using `clinic.js` or `0x` under k6 load.
- Resolve synchronous blocking loops or memory leaks found in profiling.

**New documentation**:

- `docs/infrastructure/PERFORMANCE-ENGINEERING.md` — k6, capacity planning, profiling, event loop mechanics, caching patterns.

**Location**: `test/load/results/`, `docs/infrastructure/`

---

### [ ] Alert Rules, RED/USE Dashboards, and SLOs

**What**: Formulate actionable alerting rules, provision Grafana dashboards, and document operational runbooks.

**Scope**:

- Define SLIs/SLOs for latencies, checkout success rates, and queue lags.
- Build RED dashboards for the API and USE dashboards for PostgreSQL/Redis/BullMQ.
- Setup Prometheus Alertmanager rules for 5xx spikes, high latency, queue backlog, and failed checkout jobs.
- Draft symptom-driven troubleshooting runbooks for each alert category.

**Location**: `docker/monitoring/`, `docs/observability/`

---

## 📦 Phase 17 — Product Ecosystem & Automation

> **Goal**: Integrate real communication providers and background automation for cart recovery and shipping notifications.

---

### [ ] Real Email and Notification Providers

**What**: Integrate SendGrid/Resend behind the existing notification gateway port.

**Scope**:

- Implement real mail secondary adapters.
- Build BullMQ queues for outbound email with retry limits and DLQ isolation.
- Wire order confirmations, password resets, and shipping updates to trigger real emails.

**Location**: `src/modules/notifications/secondary-adapters/mail/`

---

### [ ] Automated Abandoned Cart Recovery & Shipping Notification Engine

**What**: Background schedulers for abandoned carts and shipping status changes.

**Scope**:

- BullMQ cron job scanning inactive carts (e.g. 12+ hours).
- Recovery email templates with checkout links.
- WebSocket + email alerts on shipping status changes.
- Mark reminders as sent to prevent duplicates.

**Location**: `src/modules/carts/primary-adapters/jobs/`, `src/modules/notifications/`

---

## 🌐 Phase 18 — Message Broker Adapter (Kafka or RabbitMQ)

> **Goal**: Transition from local in-process event propagation to a durable, multi-instance event backbone.

---

### [ ] Message Broker Adapter (Kafka or RabbitMQ)

**What**: Replace or supplement the local event bus with a broker adapter implementing `DomainEventPublisher`.

**Scope**:

- Set up Kafka or RabbitMQ in Docker Compose.
- Enable consumer group scaling, dead-letter exchanges, and event schema versioning.
- Add broker health checks to `/health` and consumer lag metrics.

**New documentation**:

- `docs/integration/MESSAGE-BROKER-PATTERNS.md`

**Location**: `src/infrastructure/events/broker/`

---

## 🔔 Phase 19 — Outbound Webhook Subscription System

> **Goal**: Secure webhook framework for merchant systems to receive real-time order/payment/shipment events.

---

### [ ] Webhook Subscription Management

**What**: `WebhookSubscription` aggregate, repository, and admin CRUD controllers under RBAC.

**Location**: `src/modules/webhooks/`

---

### [ ] Webhook Delivery Engine & Logging

**What**: BullMQ dispatching queue with HMAC-SHA256 signatures, retries, and `WebhookDeliveryLog`.

**Location**: `src/modules/webhooks/infrastructure/`, `src/modules/webhooks/primary-adapters/`

---

## 💳 Phase 20 — Payment Provider Integrations

> **Goal**: Replace mock payment gateway with production Stripe integration.

> **Note**: Webhook controller stub (`handleStripeWebhook`) exists; SDK adapter under `secondary-adapters/stripe/` will handle live PaymentIntents and signed webhook events.

---

### [ ] Real Stripe Integration

**What**: Stripe SDK for PaymentIntents, captures, refunds, and signed webhook reconciliation.

**Location**: `src/modules/payments/secondary-adapters/stripe/`

---

## 🔐 Phase 21 — Access Control & SaaS Readiness (Only When Needed)

> **Goal**: Multi-merchant SaaS scaling, immutable admin audit trails, permission overrides, and bulk data exchange.

---

### [ ] User-Level Permission Overrides

**What**: Wire `user_permission_overrides` schema into guards for granular store-admin exceptions.

**Location**: `src/modules/authentication/`

---

### [ ] Multi-Tenant Isolation Model

**What**: Row-level or schema-per-tenant isolation across all tables for multi-merchant storefronts.

**Location**: `src/infrastructure/database/multi-tenancy/`

---

### [ ] Immutable Admin Audit Trail

**What**: Append-only audit log for price overrides, order status changes, stock reconciliations.

**Location**: `src/modules/audit/`

---

### [ ] Bulk Data Import and Export

**What**: Background CSV/Excel import/export with dry-run and row-level error reporting.

**Location**: `src/modules/data-exchange/`

---

## 🚀 Phase 22 — Deployment Maturity & GitOps

> **Goal**: Feature flags, Kubernetes orchestration, and Canary/Blue-Green release rollouts.

---

### [ ] Feature Flags System

**What**: Redis-backed feature flag framework with `@FeatureFlag()` decorators.

**Location**: `src/infrastructure/feature-flags/`

---

### [ ] Kubernetes Deployment Configuration

**What**: Production-grade K8s manifests (Deployments, Services, Ingress, HPA, ConfigMaps).

**Location**: `k8s/`

---

### [ ] Zero-Downtime Releases (Canary & Blue-Green)

**What**: Automated pipelines routing traffic percentages to new versions with SLO-based rollback.

**New documentation**:

- `docs/infrastructure/CONTAINER-ORCHESTRATION.md`

**Location**: `k8s/rollouts/`, `docs/infrastructure/`

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
| Identity/Access Split       | Separate identity and session modules is an optimization for microservice extraction.                                                                                                         | Auth becomes a separate microservice under independent load.                                                                     |
| Admin Dashboard (Frontend)  | React/Next.js admin panel deferred to focus on backend positioning.                                                                                                                           | Full-stack demo or merchant self-service portal is required.                                                                     |
