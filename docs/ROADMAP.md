# 🗺️ E-Commerce Store API — Feature Roadmap

> A living roadmap for the E-Commerce Store API project. Each phase includes enough context for any contributor or AI agent to pick up tasks in a fresh session.
>
> **Companion docs**: [`codebase_assessment.md`](../codebase_assessment.md) (honest codebase assessment), [`CQRS.md`](architecture/CQRS.md) (strict DDD/CQRS reference & N+1 analysis)

---

## How to Use This File

- `[ ]` — Not started
- `[/]` — In progress
- `[x]` — Completed
- Open a new chat, reference this file, and pick the next unchecked task.

---

## ✅ Completed Phases — Summary

> Full implementation detail has been collapsed for readability. The history and decisions are preserved in git.

| Phase   | Name                         | Status  | Key Deliverables                                                                                                                                                                                             | Location                                                                           |
| :------ | :--------------------------- | :------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------- |
| **0**   | Foundation                   | ✅ Done | DDD/Hexagonal scaffold · 8 modules (Auth, Carts, Customers, Inventory, Orders, Payments, Products, Notifications) · JWT auth · Passport strategies · Redis WebSocket adapter · BullMQ jobs · Swagger/OpenAPI | `src/modules/`, `src/infrastructure/`                                              |
| **1**   | ACL Gateway & SAGA           | ✅ Done | 7 ACL Gateways across Orders, Carts, Auth · BullMQ-based checkout SAGA with `CheckoutFailureListener` compensation (refund, stock release, order cancellation) · Gateway DTOs decoupled from domain entities | `src/modules/orders/`, `src/modules/carts/`                                        |
| **2**   | Result Pattern & Idempotency | ✅ Done | Functional `Result<T, E>` across all layers · `@Idempotent()` decorator with Redis-backed store for checkout protection                                                                                      | `src/shared-kernel/`, `src/infrastructure/idempotency/`                            |
| **3**   | Decorator-based Caching      | ✅ Done | `CachedRepository` decorator pattern wrapping Postgres repositories with Redis cache-aside                                                                                                                   | `src/modules/*/secondary-adapters/repositories/cached-*/`                          |
| **4**   | Test Suite Foundation        | ✅ Done | Comprehensive spec files: Use case unit tests (all modules), repository integration tests (Postgres + cached), controller tests · Docker Compose for local dev (PostgreSQL 18 + Redis Stack)                 | `src/modules/*/`                                                                   |
| **5**   | Code Quality (v0.2.0)        | ✅ Done | Removed redundant try/catch from all 61 use case/service files · Trimmed orders table from 12 to 4 indexes · Migration CLI scripts configured (`data-source.ts`)                                             | `data-source.ts`, `package.json`                                                   |
| **6**   | Deployment Blockers          | ✅ Done | Multi-stage `Dockerfile` (Node.js 24 Alpine) · `GlobalExceptionFilter` for JSON error standardization · Application Graceful Shutdown handling (`SIGTERM` & connections drain)                               | `Dockerfile`, `src/filters/`, `src/main.ts`                                        |
| **7**   | Security Hardening           | ✅ Done | `helmet` security headers · CORS with env-based origin whitelist · XSS sanitization interceptor (`sanitize-html`) · Pagination `@Max(100)` on all query DTOs                                                 | `src/main.ts`, `src/interceptors/`, `src/config/`                                  |
| **7.5** | Auth Overhaul (RBAC)         | ✅ Done | RSA RS256 JWT, Refresh Token Rotation, Session Tracking, Full RBAC (Roles/Permissions/Guards)                                                                                                                | `src/infrastructure/jwt/`, `src/modules/auth/`                                     |
| **7.6** | Auth Hardening & Quality     | ✅ Done | Abstract `PasswordHasher`, Session reuse detection, Architectural polish, Strict typed JWT payloads, Thin controllers                                                                                        | `src/modules/auth/`                                                                |
| **8**   | Observability                | ✅ Done | Winston structured JSON logging · Health checks (`/health`) · Correlation ID Middleware (`X-Request-Id`) · End-to-end `correlationId` propagation into all 18 BullMQ job handlers and schedulers             | `src/infrastructure/logging/`, `src/infrastructure/jobs/`                          |
| **8.1** | Logging Activation           | ✅ Done | Winston logger injected into NestJS application lifecycle, replacing manual error handlers                                                                                                                   | `src/main.ts`                                                                      |
| **8.5** | Architecture Hardening       | ✅ Done | Full Hexagonal audit: fixed 20+ boundary violations, enforced strict domain isolation, eliminated DTO leakage into domain/application layers.                                                                | `src/modules/*/`                                                                   |
| **8.6** | SaaS & Monitoring            | ✅ Done | API Versioning (`v1`) · Rate Limiting (Redis-backed) · Prometheus metrics (`/metrics`) · Grafana Stack (Loki, Tempo, Dashboards) · OTel Distributed Tracing                                                  | `src/infrastructure/metrics/`, `src/infrastructure/tracing/`, `docker/monitoring/` |
| **9**   | Local DB Seeding             | ✅ Done | Thin CLI seed adapters · Module-owned seed use cases · Admin & Customer accounts · 15-product catalog with 4 stock levels · Escaped search cached repositories                                               | `scripts/`, `src/modules/*/core/application/seed/`, `docs/development/`            |

---

## 🚀 Phase 9 — Local Database Seeding (Development Prerequisite)

> **Goal**: Provide a clean local data seed script to enable immediate, consistent testing of RBAC permissions, store catalogs, administrative tasks, and secure customer purchase scenarios under developer-configured conditions.

---

### [x] Build Database Seed Script

**What**: The local environment needs system roles, a realistic catalog, management credentials, and a testing customer profile to be interactive and testable.

**Scope**:

- Create an `npm run db:seed` script.
- Consume predefined RBAC Roles and Permissions (which are initialized automatically on NestJS application bootstrap, a prerequisite for any user authorization).
- Seed a catalog of 10-20 realistic products with pricing and varying inventory levels (allowing any customer to browse and purchase).
- Seed an initial Store Admin / Manager account to allow testing administrative/destructive REST endpoints.
- Seed a dummy Customer account (complete with a default shipping address) to allow reviewers to immediately log in and test checkout workflows.
- Document both the pre-seeded credentials and the custom registration flow (`/auth/register`) so reviewers can register new accounts to test registration and multi-user isolation.

**Location**: `scripts/seed.ts`, `src/modules/*/core/application/seed/`

---

## 🛡️ Phase 10 — Data Integrity & Concurrency Control (High Priority)

> **Goal**: Protect the persistence layer from silent data corruption, lost updates, and race conditions under heavy concurrent write loads (such as flash sales) by implementing optimistic locking across major aggregates, applying pessimistic row-level locking for critical checkout inventory reservations, auditing database transaction isolation levels, and generating target documentation.

---

### [ ] Optimistic Concurrency Control (Version-based Locking)

**What**: Add version-based optimistic concurrency control (OCC) to core aggregates to prevent the classic lost update problem where concurrent updates silently overwrite each other's changes.

**Scope**:

- Add a `@VersionColumn()` field named `version` to all core TypeORM database entities (`OrderEntity`, `CartEntity`, `CustomerEntity`, `InventoryEntity`, `ProductEntity`).
- Propagate the `version` field from ORM entities up to Domain Entities and ensure it is returned in all read DTOs.
- Require the entity's current `version` in all HTTP PUT/PATCH update payloads.
- Map TypeORM `OptimisticLockVersionMismatchError` to a clean `409 Conflict` HTTP response via the global `GlobalExceptionFilter`.
- Write dedicated unit tests using simulated concurrent threads to verify that simultaneous updates to the same entity result in a successful first update and a rejected (409) second update.

**Location**: `src/modules/*/core/domain/entities/`, `src/modules/*/secondary-adapters/database/`

---

### [ ] Pessimistic Locking for Stock Reservations

**What**: Implement row-level locking (`SELECT ... FOR UPDATE`) for transactional boundaries that read and then write stateful properties, ensuring complete sequential isolation.

**Scope**:

- Identify transactional read-then-write code blocks that are vulnerable to race conditions (specifically in the inventory stock reservation step within checkout).
- Apply `.setLock('pessimistic_write')` in TypeORM repository queries inside the inventory reserve stock code.
- Optimize the `adjustStock` and `reserveStock` use cases to perform locked operations so that concurrent cart checkouts do not oversell inventory items.
- Write robust integration tests that run concurrent workers checking out the last stock of a product simultaneously, asserting that inventory never drops below zero and overselling is physically blocked.

**Location**: `src/modules/inventory/secondary-adapters/repositories/`

---

### [ ] Transaction Isolation Level Audit & Query Optimization

**What**: Review transaction isolation configurations, analyze slow queries using database execution plans, and provision composite and partial indexes.

**Scope**:

- Audit the modular monolith's transactional boundaries to evaluate if any use case requires overriding PostgreSQL's default `READ COMMITTED` isolation level (e.g. `REPEATABLE READ` or `SERIALIZABLE` for complex inventory adjustments).
- Execute `EXPLAIN ANALYZE` on all primary search and filter queries under realistic mock database sizes (10k+ rows).
- Provision database indexes based on filter frequencies (e.g. composite index on `(customerId, status)` on orders).
- Add partial indexes on fields that represent active flags (e.g., `WHERE isActive = true` or active carts).
- Address any N+1 relational query loops detected in TypeORM logging.

**New documentation**:

- `docs/data/CONCURRENCY-AND-LOCKING.md` — Academic & applied guide covering optimistic vs. pessimistic locking, MVCC in PostgreSQL, isolation level selection, and race conditions in e-commerce stock reservations.
- `docs/data/DATABASE-PERFORMANCE.md` — Performance guide covering B-tree and GIN index internals, EXPLAIN plan analysis, covering and partial indexes, connection pool optimization, and query tuning.

**Location**: `src/infrastructure/database/migrations/`, `docs/data/`

---

## ⚡ Phase 11 — CQRS Read Path & Frontend Response Simplification (High Priority)

> **Goal**: Unblock frontend development velocity and optimize search/list query performance by introducing clean, dedicated read-model projections (CQRS Phase 2) that return flat DTOs with linked names (Customer, Product, Inventory details) alongside ID fields, bypassing rich Domain Entity construction.
>
> **Architectural Note — Cross-Context Read Access**:
> This phase introduces **controlled cross-context SQL JOINs on the read path only**. The Orders query adapter will JOIN against `customers` and `products` tables to resolve names/SKUs alongside IDs. This is a **deliberate pragmatic compromise** for the modular monolith — reads don't mutate state and don't need invariant enforcement. The write path (commands) continues to use ACL Gateways exclusively.
>
> **Microservice migration impact**: When extracting bounded contexts to separate services, only the query **adapters** need rewriting (from SQL JOINs to batched HTTP/gRPC calls). The query **port contracts** remain identical — this is the Hexagonal Architecture payoff.
>
> For the full architectural rationale, tradeoff analysis, and industry precedent, see the companion analysis in [CQRS.md](file:///e:/dev/ES/ecommerce-store-api/docs/architecture/CQRS.md).

---

### [ ] Dedicated Query Ports & Read-Model DTOs

**What**: Create new query-specific ports (separate from domain repositories) that return flat, presentation-optimized DTOs. Domain repositories (`OrderRepository`, `ProductRepository`) remain untouched — they continue dealing exclusively with domain aggregates for write operations.

**Why a separate port?** The `OrderRepository` is a **domain concept** in `core/domain/repositories/` — it manages `Order` aggregates for write operations and must never depend on presentation-layer DTOs. Read projections are a **query concern** that belongs in the application layer as a dedicated port.

**Scope**:

- Define flat, read-only DTO interfaces shaped for frontend consumption (e.g., `OrderListItemDTO`, `InventoryListItemDTO`, `PaymentListItemDTO`) containing both IDs and resolved attributes (`customerId` + `customerName`/`customerEmail`, `productId` + `productName`/`productSku`).
- Create new query port abstract classes in the **application layer** (not the domain layer):
  - `OrderQueryService` in `src/modules/orders/core/application/ports/order-query.service.ts`
  - `InventoryQueryService` in `src/modules/inventory/core/application/ports/inventory-query.service.ts`
  - `PaymentQueryService` in `src/modules/payments/core/application/ports/payment-query.service.ts`
- These ports define query methods like `findAllForList(filters): Promise<Result<PaginatedResult<OrderListItemDTO>, RepositoryError>>`.
- The port contracts are **infrastructure-agnostic** — they return plain DTOs, not domain entities, and make no assumptions about JOINs, views, or caching.
- **Do NOT add read-projection methods to the existing `OrderRepository` or `InventoryRepository`** — those are domain-layer write ports.

**Location**: `src/modules/*/core/application/ports/`

---

### [ ] Cross-Context Query Adapters

**What**: Implement the query port adapters that use TypeORM `QueryBuilder` with cross-context `LEFT JOIN` operations to resolve related names/details in a single optimized SQL query.

**Scope**:

- Implement `PostgresOrderQueryAdapter` in `secondary-adapters/query/` (not in `secondary-adapters/repositories/` — this is a query adapter, not a domain repository adapter).
- Use `QueryBuilder.select([...]).leftJoin(...).getRawMany()` to build flat projections, bypassing domain entity hydration entirely.
- JOIN within the Orders context (same-context, no boundary concern):
  - `order_items`, `shipping_addresses`
- JOIN across bounded context boundaries (pragmatic monolith compromise — **read path only**):
  - `customers` table (Customers context) → resolve `customerFirstName`, `customerLastName`, and `customerEmail`
  - `products` table (Products context) → resolve `productSku`, catalog details, and enforce category listings
- Each cross-context JOIN must be documented with a comment explaining:
  1. Which bounded context owns the joined table
  2. Why the JOIN is acceptable (read-only projection, no mutations)
  3. What changes on microservice extraction (adapter rewrite to HTTP/gRPC batch calls)
- Ensure that the existing `OrderRepository` and `PostgresOrderRepository` (write path) are **completely untouched**.

**Location**: `src/modules/*/secondary-adapters/query/`

---

### [ ] Query Use Case Refactoring (CQRS Phase 2 Graduation)

**What**: Refactor read-only application use cases to inject the new query ports instead of domain repositories, completing the CQRS Phase 2 graduation.

**Scope**:

- Update `ListOrdersUseCase` and `GetOrderUseCase` to inject `OrderQueryService` (query port) and call `findAllForList()` / `findOneForDetail()` instead of `OrderRepository.findAll()`.
- Update `ListInventoryUseCase` similarly to inject `InventoryQueryService`.
- Completely remove the costly `.toPrimitives()` mapping steps on full domain entity arrays for search/list routes.
- Establish clean separation: read paths use query ports returning light DTOs, write paths continue using domain repository ports with rich entities.
- Verify that ACL gateways are NOT utilized on the query path — the query adapter resolves names directly via JOINs.

**Location**: `src/modules/*/core/application/usecases/`

---

### [ ] Controller & Presentation Model Updates

**What**: Update HTTP adapters (controllers) and Swagger schemas to expose the new flat read-model DTOs to frontend consumers.

**Scope**:

- Update the REST GET (list/search) endpoints in `OrdersController`, `InventoryController`, and `PaymentsController` to return the new flattened DTO schemas.
- Create class-validator response DTOs matching the new structure containing names/SKUs alongside IDs.
- Verify through OpenAPI/Swagger schemas that fields like `customerName`, `customerEmail`, and `productSku` are explicitly typed and populated.
- Review with the frontend team to ensure that their manual ID-to-name mapping layers can be completely decommissioned.

**Location**: `src/modules/*/primary-adapters/controllers/`, `src/modules/*/primary-adapters/dtos/`

---

## 🧪 Phase 12 — Test Suite (High Priority)

> **Goal**: Establish deep confidence for production deployment by addressing testing gaps, refactoring ad-hoc inline mocks, and upgrading integration/E2E test pipelines to run against a real database harness.
>
> **Mandatory prerequisite before starting any Phase 12 item**:
>
> 1. Follow the testing standards outline in [`docs/testing/TESTING-TASK-TEMPLATE.md`](file:///e:/dev/ES/ecommerce-store-api/docs/testing/TESTING-TASK-TEMPLATE.md) for checklist + evidence in every task.
> 2. Ensure test scope and scenario matrices are explicitly mapped prior to writing specs.
> 3. For Repository Integration and E2E work, define the database harness + cleanup plan up front (PostgreSQL Testcontainers + shared database-test helper) before writing specs.

---

### [/] Test Infrastructure Baseline (Phase 12 Entry Gate)

**What**: Standardize and complete the shared reusable test infrastructure.

**Scope**:

- _Done:_ Shared helpers under `src/testing/helpers/` are fully implemented:
  - `result-assertion.helper.ts` (fluent result success/failure assertions)
  - `database-test.helper.ts` (TypeORM init, truncate DB, rollback helper)
  - `e2e-test-app.helper.ts` (TestingModule bootrapper, supertest agent factory)
  - `auth-test.helper.ts` (E2E auth helper routes)
  - `clock-test.helper.ts` (time manipulation/fixed-date utility)
  - `nestjs-context.fixture.ts` (mock execution context/request shapes)
- _Remaining:_ Create `testing/index.ts` barrel files for **Auth**, **Carts**, **Inventory**, and **Payments** modules to unify exports and prevent deep, brittle import paths.

**Location**: `src/testing/`, `src/modules/*/testing/`

---

### [/] Fixture, Factory, and Mock Baseline (Phase 12 Entry Gate)

**What**: Standardize deterministic test data builders, scenario factories, and reusable mock classes across all modules.

**Scope**:

- _Done:_ 47 fixture/builder/mock files exist across all 7 modules.
- _Remaining:_
  - Create reusable, typed **ACL Gateway Mock** classes for the 8 gateway ports to replace duplicated, untyped inline mocks:
    - `CustomerGateway`, `CartGateway`, `InventoryReservationGateway`, `PaymentGateway` (in `orders/testing/mocks/`)
    - `PaymentGatewayResolver` (in `payments/testing/mocks/`)
    - `NotificationGateway` (in `notifications/testing/mocks/`)
    - `ProductGateway`, `InventoryGateway` (in `carts/testing/mocks/`)
  - Fix the **Products** testing barrel (`products/testing/index.ts`) to export all internal helpers (builders, factories, mocks) rather than just `product-entity.factory`.
  - Remove the redundant `ReservationRepositoryMockFactory` wrapper class from `reservation-repository.mock.factory.ts` (instantiate `MockReservationRepository` directly).
  - Adopt unused builders: Refactor specs that use raw `ProductTestFactory` overrides to use `ProductBuilder` and `InventoryBuilder`.
  - Create `CartBuilder` and `PaymentBuilder` to achieve feature parity across all modules.

**Location**: `src/modules/*/testing/`

---

### [ ] Domain Entity Unit Tests

**What**: Establish isolated unit tests for all core business invariants, state machines, and value objects.

**Scope**:

- _Status:_ Done for **Auth** module (5 specs). Missing for all other modules.
- _Remaining:_ Write dedicated entity specs to cover:
  - **Orders**: `Order` state transitions (`PENDING_PAYMENT` → `CONFIRMED` → `PROCESSING` → `SHIPPED` → `DELIVERED`, cancellation rules) and pricing calculations.
  - **Carts**: `Cart` item management invariants (`addItem`, `removeItem`, `updateQuantity`).
  - **Customers**: Address updates, primary address promotion, and validations.
  - **Inventory**: `Inventory` stock adjustments and `Reservation` lock-time/release logic.
  - **Payments**: `Payment` capture/refund rules and transaction log mutations.
  - **Products**: SKU formatting and price invariants.

**Location**: `src/modules/*/core/domain/entities/`

---

### [/] Use Case Unit Tests

**What**: Ensure application use cases use clean mock layers instead of fragile, untyped inline mocking.

**Scope**:

- _Status:_ Core use cases have 40+ spec files.
- _Remaining:_ Refactor spec files that use widespread inline `jest.fn()` mocks (e.g. `checkout.usecase.spec.ts`, `create-order-from-cart.usecase.spec.ts`, `validate-checkout.usecase.spec.ts`, `reserve-stock.job.spec.ts`, `checkout-failure.listener.spec.ts`) to import and use the centralized mock repository/gateway classes.

**Location**: `src/modules/*/core/application/usecases/`

---

### [/] Controller and Guard Tests

**What**: Clean up HTTP adapter controllers and security/idempotency guards tests to use standardized mock helpers.

**Scope**:

- _Status:_ Controller specs and guards exist.
- _Remaining:_ Refactor controller specs to inject use-cases utilizing a generic `MockUseCase<T>` class rather than inlining `{ execute: jest.fn() }` objects.

**Location**: `src/modules/*/primary-adapters/controllers/`, `src/modules/*/primary-adapters/guards/`

---

### [ ] Repository Integration Tests (Real DB)

**What**: Transactional operations and persistence mappings tested against a live database instance.

**Scope**:

- Run all postgres and cached repository specs against a real PostgreSQL instance inside Docker Testcontainers using `database-test.helper.ts`.
- Verify SAGA transactional database operations, row-level locks, and complex tag/category filtering under realistic conditions.
- Test cached repository wrappers: cache hits, misses, writes, cache invalidations, and graceful degradation behavior when Redis goes offline.

**Location**: `src/modules/*/secondary-adapters/repositories/`

---

### [ ] E2E Tests

**What**: End-to-end HTTP flows using `supertest` to verify multi-system workflows and observability.

**Scope**: Happy paths and critical failure flows:

- **Auth & Profile**: customer registration → login → token usage → address creation.
- **Catalog & Purchase**: browse catalog → add items to cart → complete SAGA checkout.
- **SAGA Success**: checkout executes successfully → verify inventory deducted, order marked `PAID`, payment captured.
- **SAGA Compensation**: trigger checkout payment failure → verify inventory released automatically, order updated to `PAYMENT_FAILED` or `CANCELLED`, and compensations fully logged.
- **Observability verification**: assert correlation IDs (`X-Request-Id`) flow through API responses and appear correctly in Winston logging streams during load.

**Location**: `test/`

---

## 🌐 Phase 13 — Message Broker Adapter (Kafka or RabbitMQ) (Low Priority)

> **Goal**: Transition from local memory event propagation to a distributed event backbone for durable, multi-instance cross-process event streaming.

---

### [ ] Message Broker Adapter (Kafka or RabbitMQ)

**What**: Replace or supplement the local memory event bus with a real message broker adapter for durable, multi-instance cross-process event streaming.

**Scope**:

- Set up Kafka or RabbitMQ container configurations in Docker Compose.
- Implement the broker adapter implementing the shared-kernel `DomainEventPublisher` port.
- Enable consumer group scaling for at-least-once delivery, configure dead-letter exchanges, and establish event schema versioning.
- Add broker health checks to `/health` and track consumer lag metrics.

**New documentation**:

- `docs/integration/MESSAGE-BROKER-PATTERNS.md` — Academic reference covering Kafka vs. RabbitMQ vs. NATS, delivery guarantees, consumer group architecture, partitioning, and dead-letter strategies in e-commerce event streams.

**Location**: `src/infrastructure/events/broker/`

---

## 🚢 Phase 14 — Reliable Event Infrastructure & Resilience (Medium Priority)

> **Goal**: Add advanced architectural resilience patterns, complete outbox implementations, and automate administrative tasks to support safe, repeatable, and robust operations in staging and production environments.

---

### [ ] Graceful Degradation (Redis Failover)

**What**: Implement resilient fault boundaries so that caching, rate limiting, and session layers degrade gracefully (fail open) rather than crashing the application if Redis goes offline.

**Scope**:

- Harden the central Redis client configuration with robust connection retry strategies and connection drop event handlers.
- Refactor the cache-aside repository wrappers to catch Redis connection errors and query the database directly on cache misses when Redis is down.
- Ensure that rate-limiting (throttler), idempotency decorators, and session stores catch Redis disconnects and degrade gracefully with logged warnings rather than throwing 5xx errors.
- Write integration tests that simulate Redis being stopped and started while executing API requests, verifying that the API never drops traffic.

**Location**: `src/infrastructure/redis/`, `src/infrastructure/idempotency/`

---

### [ ] Transactional Outbox Event Persistence

**What**: Store domain events in an `outbox_events` table within the same database transaction as the aggregate state mutations, preventing data loss if the process crashes mid-transaction.

**Scope**:

- Design the `outbox_events` table schema: `id`, `eventName`, `payload` (JSON), `status` (PENDING, PROCESSED, FAILED), `retries`, `correlationId`, `createdAt`, `updatedAt`.
- Create the `OutboxEventRepository` interface and its TypeORM secondary adapter.
- Refactor the transactional boundary handler to intercept domain events emitted during write transactions (`OrderCreated`, `InventoryReserved`, `PaymentCaptured`) and write them to the `outbox_events` table in the database as part of the active transaction.

**Location**: `src/infrastructure/events/outbox/`

---

### [ ] Resilient BullMQ Outbox Poller and Dispatcher

**What**: Implement a BullMQ recurring task that polls pending outbox events, dispatches them to their subscribers, and marks them as processed.

**Scope**:

- Implement `ProcessOutboxQueueJob` running on a high-frequency schedule to pull pending outbox events in batches.
- Inject the events into local `EventEmitter2` listeners or external brokers (Phase 13).
- Mark dispatched events as `PROCESSED` on success, or update status to `FAILED` with incremented retries and error traces on failure.
- Audit all existing domain event listeners to ensure they are **idempotent** (safe to receive duplicate events during retries).
- Expose Prometheus metrics tracking pending outbox lag and delivery failure rates.

**Location**: `src/infrastructure/events/outbox/jobs/`

---

### [ ] Real Email and Notification Providers

**What**: Integrate real email delivery gateways (SendGrid/Resend) behind the existing notification gateway port.

**Scope**:

- Implement Resend or SendGrid secondary adapters for the notification gateway port.
- Build BullMQ queues to handle outbound email sending asynchronously, ensuring retry limits and dead-letter queue isolation are configured.
- Wire up system events (auth password resets, order confirmations, receipt notifications) to trigger real emails.
- Add structured logging to track deliverability events.

**Location**: `src/modules/notifications/secondary-adapters/mail/`

---

### [ ] Release, Rollback, and Backup Procedures

**What**: Build deployment pipeline smoke tests, database backup scripts, and disaster recovery runbooks.

**Scope**:

- Write shell or Node.js scripts to automate PG database backups and verify restore procedures.
- Build a post-deploy smoke test runner that targets key endpoints (`/health`, `/metrics`, auth flows, basic search) to confirm environment health.
- Define a structured release and rollback checklist covering migration execution, blue-green switches, and smoke test verifications.

**Location**: `scripts/`, `docs/infrastructure/`

---

### [ ] Automated Abandoned Cart Recovery & Shipping Notification Engine

**What**: Implement background job schedulers that scan for abandoned shopping carts and automatically dispatch reminders, and notify users of shipping changes.

**Scope**:

- Implement a BullMQ scheduler job that runs on a cron schedule to scan active carts that have been inactive for more than a configured duration (e.g. 12 hours).
- Compile recovery email templates with checkout recovery links, bypassing rich domain commands for simple read projections.
- Dispatch real-time WebSocket events and email alerts when order shipping status changes occur.
- Ensure that reminders are marked as sent to prevent duplicate transmissions.

**Location**: `src/modules/carts/primary-adapters/jobs/`, `src/modules/notifications/`

---

## 🔐 Phase 15 — Security Hardening Phase 2 (OWASP Compliance) (Medium Priority)

> **Goal**: Perform complete application security audits and implement strict IDOR (Insecure Direct Object Reference) prevention to secure customer data, alongside fine-grained, adaptive rate limiting.

---

### [ ] OWASP Top 10 Audit & Vulnerability Scanning

**What**: Perform a comprehensive security audit of the API, set up dependency vulnerability scans, and implement threat modeling.

**Scope**:

- Systematically audit the system against the OWASP Top 10 categories.
- Integrate `npm audit` scanning into CI pipelines.
- Ensure customer payment secrets, personal data, and credentials are fully masked in logs.

**New documentation**:

- `docs/security/OWASP-COMPLIANCE.md` — Security compliance guide covering OWASP Top 10 mapping to NestJS/TypeORM, customer IDOR prevention patterns, and payment endpoint injection mitigations.

**Location**: `docs/security/`

---

### [ ] IDOR (Insecure Direct Object Reference) Prevention

**What**: Implement entity-level access control filters to guarantee customers can only access, view, or mutate entities they explicitly own or are authorized to see.

**Scope**:

- Implement `@OwnershipGuard()` or use-case-level scope validators that check customer ID matching before loading or updating active carts, orders, and payment histories.
- Restrict standard e-commerce endpoints to context-scoped results (e.g. non-admin customers only view their own orders).
- Write E2E/integration tests verifying that Customer A is strictly blocked (403 Forbidden) from retrieving or modifying Customer B's resources.

**Location**: `src/modules/*/primary-adapters/guards/`, `src/modules/*/core/application/usecases/`

---

### [ ] Adaptive, User-Scoped Rate Limiting

**What**: Refine the global rate limiter to restrict request frequencies per authenticated User ID and implement progressive penalties on high-risk endpoints.

**Scope**:

- Scope rate limit keys using authenticated customer IDs in addition to IP addresses.
- Apply stricter rate limits to `/auth/login`, `/auth/refresh`, and checkout endpoints.
- Map rate limit headers to client responses.

**Location**: `src/infrastructure/throttler/`

---

## 🌐 Phase 16 — Public Demo Deployment (Blocker Priority)

> **Goal**: Expose a secure, fully seeded, and production-ready staging environment with a public API interface, protected by robust security controls and migrations, allowing reviewers to interact with a live Swagger instance.

---

### [ ] Generate Initial Database Migration

**What**: Migration CLI infrastructure is fully implemented, but no migration files exist. The app still relies on `synchronize: true` which is highly dangerous for production.

**Scope**:

- Run `npm run migration:generate:dev -- src/migrations/InitialSchema`
- Verify migration runs cleanly on an empty database.
- Update `package.json` to ensure `migration:run` executes on production startup before serving traffic.

**Location**: `src/infrastructure/database/migrations/`

---

### [ ] Public Demo Deployment

**What**: Deploy a constrained demo environment.

**Scope**:

- Deploy the API (and a managed Postgres/Redis) to a fast-iteration platform (e.g., Railway, Render, Fly.io).
- Expose Swagger/OpenAPI documentation publicly.
- Protect admin/destructive operations via the RBAC guards.
- Ensure `/health` is public but `/metrics` remains protected.

**Location**: `scripts/`

---

## 🔔 Phase 17 — Outbound Webhook Subscription System (Medium Priority)

> **Goal**: Build a secure, outbound webhook subscription framework that allows external client applications (merchant systems, inventory logs, CRM platforms) to receive real-time updates when key e-commerce state mutations occur (e.g., `order.placed`, `payment.captured`, `shipment.dispatched`).

---

### [ ] Webhook Subscription Management

**What**: Create the webhook subscription aggregate, persistent repository layers, and admin CRUD controllers.

**Scope**:

- Design `WebhookSubscription` aggregate: `id`, `targetUrl`, `secret` (for HMAC verification), `subscribedEvents` (array of topics), `isActive`, `createdAt`, `updatedAt`.
- Build secondary TypeORM database entities and repository adapters.
- Implement admin controllers under RBAC guard protections allowing clients to subscribe, unsubscribe, rotate keys, and toggle states.
- Ensure Swagger models correctly define subscription parameters and authentication requirements.

**Location**: `src/modules/webhooks/`

---

### [ ] Webhook Delivery Engine & Logging

**What**: Build a reliable, asynchronous webhook dispatching engine powered by BullMQ queues, complete with HMAC signatures and transaction logs.

**Scope**:

- Hook into the Outbox poller or event listeners to capture relevant domain events.
- Implement a BullMQ dispatching queue with exponential backoff retries and dead-letter queue isolation for dead URLs.
- Sign all webhook payloads with HMAC-SHA256 signatures in headers (`X-Webhook-Signature`) so receiving services can verify payload authenticity.
- Maintain a `WebhookDeliveryLog` table recording delivery status, HTTP status codes, latencies, payloads, and retries.
- Build an admin endpoint to view delivery histories and manually trigger redeliveries of failed dispatches.

**Location**: `src/modules/webhooks/infrastructure/`, `src/modules/webhooks/primary-adapters/`

---

## 💳 Phase 18 — Payment Integrations (Medium Priority)

> **Goal**: Replace mock payment adapters with real payment provider integrations to demonstrate 3rd-party vendor handling, tokenized captures, secure redirect pathways, and webhook reconciliations.

---

### [ ] Real Stripe Integration

**What**: Integrate the Stripe SDK for handling real-time credit card processing, payment intents, and secure transactions.

**Scope**:

- Import the Stripe SDK (`stripe` npm package) and configure secure backend environment secrets.
- Implement a Stripe payment gateway adapter that interfaces with Stripe PaymentIntents API.
- Support secure webhook listeners validating `stripe-signature` headers to process asynchronous payment updates (`charge.succeeded`, `payment_intent.failed`).
- Wire up payment capture and refund flows, integrating with the `Checkout` SAGA for compensation triggers.

**Location**: `src/modules/payments/secondary-adapters/stripe/`

---

### [ ] Real PayPal Integration

**What**: Integrate the PayPal REST SDK to provide alternative checkout pathways.

**Scope**:

- Implement the PayPal REST SDK and configure gateway client connections.
- Support PayPal order creation, captures, and transaction tracking.
- Handle Paypal webhook events and reconcile internal order states accordingly.

**Location**: `src/modules/payments/secondary-adapters/paypal/`

---

## 📈 Phase 19 — Performance Engineering & Observability Maturity (Low Priority)

> **Goal**: Define reliability metrics, establish automated performance test baselines, profile the runtime, and provision alert dashboards.

---

### [ ] k6 Load Testing Baseline

**What**: Build and run k6 load testing suites to discover bottlenecks and establish baseline API latency metrics under stress.

**Scope**:

- Write k6 scripts targeting auth lifecycles, catalog searches, cart operations, and concurrent checkout state updates.
- Set up load profiles (smoke, stress, spike) and define strict target SLO thresholds (e.g. p95 latency < 150ms).
- Configure CI checks to fail the pipeline if recent changes cause latency SLO violations.

**Location**: `test/load/`

---

### [ ] Node.js Runtime Profiling & Performance Tuning

**What**: Profile Node's V8 engine and event loop performance under heavy loads to find memory leaks and CPU-heavy hot paths.

**Scope**:

- Implement Prometheus metrics tracking Event Loop Lag (`nodejs_eventloop_lag_seconds`).
- Document heap-dump capture procedures.
- Generate and evaluate CPU flame graphs using `clinic.js` or `0x` under simulated k6 load tests.
- Resolve synchronous blocking loops or memory leaks found in profiling.

**New documentation**:

- `docs/infrastructure/PERFORMANCE-ENGINEERING.md` — Performance engineering guide covering k6, Capacity Planning, profiling, event loop mechanics, and caching patterns.

**Location**: `test/load/results/`, `docs/infrastructure/`

---

### [ ] Alert Rules, RED/USE Dashboards, and SLOs

**What**: Formulate actionable alerting rules, provision custom Grafana dashboards, and document operational runbooks.

**Scope**:

- Define quantitative SLIs/SLOs for latencies, checkout success rates, and queue lags.
- Build RED (Rate, Errors, Duration) dashboards for the API and USE (Utilization, Saturation, Errors) dashboards for PostgreSQL/Redis/BullMQ.
- Setup Prometheus Alertmanager rules for 5xx spikes, high latency, queue backlog depths, and failed checkout background jobs.
- Draft clear, symptom-driven troubleshooting runbooks for each alert category.

**Location**: `docker/monitoring/`, `docs/observability/`

---

## 🔐 Phase 20 — Access Control & SaaS Readiness (Low Priority)

> **Goal**: Support advanced multi-tenant SaaS scaling (multi-merchant storefronts), immutable administration trails, user permission exceptions, and high-volume data exchanges.

---

### [ ] User-Level Permission Overrides

**What**: Wire up the database `user_permission_overrides` schema inside NestJS guards to support granular permission exclusions for store admins and moderators.

**Scope**:

- Refactor permission checkers to fetch role permissions and merge them with explicit user overrides (`granted: boolean`).
- Enable NestJS guards to validate against the composite resolved permission set.
- Implement cache invalidation for updated user override permissions.

**Location**: `src/modules/auth/`, `src/modules/users/`

---

### [ ] Multi-Tenant Isolation Model

**What**: Enable rigid tenant data isolation (multi-merchant scopes) using schema-per-tenant or row-level tenant fields across all database tables.

**Scope**:

- Design `Merchant` / `Tenant` models.
- Apply automatic row-level query filters or dynamic schema selection using TypeORM connection pooling.
- Resolve incoming tenant context from JWT payload attributes.

**Location**: `src/infrastructure/database/multi-tenancy/`

---

### [ ] Immutable Admin Audit Trail

**What**: Design a robust, append-only administration audit log recording sensitive actions (e.g. price overrides, order status overrides, stock reconciliations).

**Scope**:

- Create `AuditLog` entity: action type, actor details, before/after payloads, correlation IDs, timestamps.
- Implement asynchronous, non-blocking audit logging pipelines.

**Location**: `src/modules/audit/`

---

### [ ] Bulk Data Import and Export

**What**: Build background CSV/Excel import and export processors.

**Scope**:

- Implement background BullMQ import tasks with dry-run support and detailed row-level error reporting (e.g., uploading 10,000 catalog products).
- Implement secure segment exports for orders and transactions.

**Location**: `src/modules/data-exchange/`

---

## 🚀 Phase 21 — Deployment Maturity & GitOps (Low Priority)

> **Goal**: Decouple deployments from feature releases using feature flags, establish Kubernetes container orchestration, and enable automated Canary/Blue-Green release rollouts.

---

### [ ] Feature Flags System

**What**: Implement a Feature Flag framework to toggle features dynamically without requiring code redeployments.

**Scope**:

- Build `FeatureFlagService` and `@FeatureFlag('flag-name')` controller routing decorators.
- Support boolean toggles, user-list targeting, and percentage rollouts.

**Location**: `src/infrastructure/feature-flags/`

---

### [ ] Kubernetes Deployment Configuration

**What**: Package the API monolith using production-grade Kubernetes resource manifests.

**Scope**:

- Write Pod Deployments, Service routes, Ingress gateways, and Horizontal Pod Autoscalers (HPA) templates.
- Configure secure ConfigMap and external secrets injection templates.

**Location**: `k8s/`

---

### [ ] Zero-Downtime Releases (Canary & Blue-Green)

**What**: Design automated pipelines that route percentages of real traffic to new versions and rollback on error spikes.

**Scope**:

- Establish Canary routing configurations in Kubernetes Ingress controllers.
- Hook deployment metrics into rollback scripts to auto-recover on SLO drops.

**New documentation**:

- `docs/infrastructure/CONTAINER-ORCHESTRATION.md` — Deployment guide covering Kubernetes objects, scaling limits, and Canary rollouts.

**Location**: `k8s/rollouts/`, `docs/infrastructure/`

---

## 📉 Phase 22 — Deferred / Low Priority

> **Goal**: Tasks that are valuable for a massive production system, but not strictly necessary for demonstrating immediate competence in an interview scenario.

---

### [ ] Admin Dashboard (Frontend)

A React/Next.js admin panel to demonstrate full-stack capability. (Deferred to focus strictly on backend positioning).

---

## ❌ Skipped (Premature)

| Task                        | Reason                                                                                                                                                                                                                          | Reconsider When                                                                                                                  |
| :-------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------- |
| DB Sharding                 | PostgreSQL handles millions of rows with proper indexing (Phase 12). Horizontal partitioning adds massive operational complexity.                                                                                               | Single-node PostgreSQL becomes the bottleneck after index optimization and read replicas are exhausted.                          |
| Event Sourcing              | Overkill for this domain. State-based persistence with proper audit logging is fine.                                                                                                                                            | Domain requires reconstructing full historical state at any millisecond.                                                         |
| Data Archival               | Only relevant when orders table exceeds ~500K rows.                                                                                                                                                                             | Database storage costs or list queries degrade due to table size.                                                                |
| GraphQL                     | REST + Swagger is sufficient for current clients. GraphQL adds resolver complexity, N+1 risks (DataLoader), and a new security surface.                                                                                         | Multiple frontends (web, mobile, third-party) need significantly different response shapes from the same data.                   |
| Microservices               | Modular monolith is clean, isolated, and perfectly decoupled. Extraction is trivial if needed.                                                                                                                                  | Scaling limits or organizational silos require independent deployment lifecycles.                                                |
| Full Dual-Database CQRS     | CQRS Phase 2 (dedicated read methods, Phase 10) gives 80% of the performance benefit at 10% of the complexity. Separate read/write databases require eventual consistency, projection infrastructure, and operational overhead. | Read traffic needs independent horizontal scaling from write traffic, or read latency SLOs cannot be met with a single database. |
| gRPC Internal Communication | REST is sufficient for modular monolith. gRPC shines for inter-service communication with strict contracts and low latency.                                                                                                     | Microservice extraction happens and services need typed, low-latency internal APIs.                                              |
| Identity/Access Split       | Separate modules for identity and token/session management is an optimization for microservices extraction.                                                                                                                     | Auth becomes a separate microservice under independent load.                                                                     |
