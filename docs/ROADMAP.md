# 🗺️ E-Commerce Store API — Feature Roadmap

> A living roadmap for the E-Commerce Store API project. Each phase includes enough context for any contributor or AI agent to pick up tasks in a fresh session.

---

## How to Use This File

- `[ ]` — Not started
- `[/]` — In progress
- `[x]` — Completed
- Open a new chat, reference this file, and pick the next unchecked task.

---

## ✅ Completed Phases — Summary

> Full implementation detail has been collapsed for readability. The history and decisions are preserved in git.

| Phase   | Name                         | Status  | Key Deliverables                                                                                                                                                                                             | Location                                                  |
| :------ | :--------------------------- | :------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------- |
| **0**   | Foundation                   | ✅ Done | DDD/Hexagonal scaffold · 8 modules (Auth, Carts, Customers, Inventory, Orders, Payments, Products, Notifications) · JWT auth · Passport strategies · Redis WebSocket adapter · BullMQ jobs · Swagger/OpenAPI | `src/modules/`, `src/infrastructure/`                     |
| **1**   | ACL Gateway & SAGA           | ✅ Done | 7 ACL Gateways across Orders, Carts, Auth · BullMQ-based checkout SAGA with `CheckoutFailureListener` compensation (refund, stock release, order cancellation) · Gateway DTOs decoupled from domain entities | `src/modules/orders/`, `src/modules/carts/`               |
| **2**   | Result Pattern & Idempotency | ✅ Done | Functional `Result<T, E>` across all layers · `@Idempotent()` decorator with Redis-backed store for checkout protection                                                                                      | `src/shared-kernel/`, `src/infrastructure/idempotency/`   |
| **3**   | Decorator-based Caching      | ✅ Done | `CachedRepository` decorator pattern wrapping Postgres repositories with Redis cache-aside                                                                                                                   | `src/modules/*/secondary-adapters/repositories/cached-*/` |
| **4**   | Test Suite Foundation        | ✅ Done | Comprehensive spec files: Use case unit tests (all modules), repository integration tests (Postgres + cached), controller tests · Docker Compose for local dev (PostgreSQL 18 + Redis Stack)                 | `src/modules/*/`                                          |
| **5**   | Code Quality (v0.2.0)        | ✅ Done | Removed redundant try/catch from all 61 use case/service files · Trimmed orders table from 12 to 4 indexes · Migration CLI scripts configured (`data-source.ts`)                                             | `data-source.ts`, `package.json`                          |
| **6**   | Deployment Blockers          | ✅ Done | Multi-stage `Dockerfile` (Node.js 24 Alpine) · `GlobalExceptionFilter` for JSON error standardization · Application Graceful Shutdown handling (`SIGTERM` & connections drain)                               | `Dockerfile`, `src/filters/`, `src/main.ts`               |
| **7**   | Security Hardening           | ✅ Done | `helmet` security headers · CORS with env-based origin whitelist · XSS sanitization interceptor (`sanitize-html`) · Pagination `@Max(100)` on all query DTOs                                                 | `src/main.ts`, `src/interceptors/`, `src/config/`         |
| **7.5** | Auth Overhaul (RBAC)         | ✅ Done | RSA RS256 JWT, Refresh Token Rotation, Session Tracking, Full RBAC (Roles/Permissions/Guards)                                                                                                                | `src/infrastructure/jwt/`, `src/modules/auth/`            |
| **7.6** | Auth Hardening & Quality     | ✅ Done | Abstract `PasswordHasher`, Session reuse detection, Architectural polish, Strict typed JWT payloads, Thin controllers                                                                                        | `src/modules/auth/`                                       |
| **8**   | Observability                | ✅ Done | Winston structured JSON logging · Health checks (`/health`) · Correlation ID Middleware (`X-Request-Id`) · End-to-end `correlationId` propagation into all 18 BullMQ job handlers and schedulers             | `src/infrastructure/logging/`, `src/infrastructure/jobs/` |
| **8.1** | Logging Activation           | ✅ Done | Winston logger injected into NestJS application lifecycle, replacing manual error handlers                                                                                                                   | `src/main.ts`                                             |
| **8.5** | Architecture Hardening       | ✅ Done | Abstract ports for payments services, thin notifications controller, strict NotificationPayload and OrderItemPrimitives typing                                                                               | `src/modules/payments/`, `src/modules/notifications/`     |

## 🧪 Phase 9 — Test Suite Expansion

> **Goal**: Expand existing test coverage to production-grade confidence. The project already has 45 spec files — build on this foundation.

---

### [ ] E2E Tests

**What**: `test/app.e2e-spec.ts` and `test/jest-e2e.json` exist as scaffolding but contain only the default NestJS boilerplate test. No real end-to-end HTTP tests exist.

**Scope**: Happy path CRUD via `supertest`:

- Auth: register → login → get token → use token → refresh
- Products: create → list → get → update → delete
- Inventory: adjust → check → reserve → confirm → release
- Customers: create → add address → set default → update → delete
- Carts: create → add items → update → checkout
- Orders: full checkout SAGA → verify order created → verify compensation on failure
- Payments: create → capture → verify → refund

---

### [ ] Domain Entity Tests

**What**: The spec files focus on use cases, repositories, and controllers. The domain entities themselves (value objects, aggregates, state transitions) may lack direct unit tests.

**Scope**: Test domain invariants:

- `OrderEntity` lifecycle: status transitions, total calculations, item management
- `PaymentEntity` state machine: pending → captured → refunded
- Value objects: `Money`, `Address`, `PaymentMethod` construction and equality
- `InventoryEntity` stock rules: reservation limits, negative stock prevention

---

### [ ] Repository Integration Tests (Real DB)

**What**: Repository spec files exist but may use mocks. Transactional operations need testing against a real PostgreSQL instance.

**Scope**: Test against a real PostgreSQL instance (Docker test container):

- Order creation with order items (transactional)
- Inventory reservation/release atomicity
- Customer address management with default promotion
- Concurrent stock reservation edge cases

---

## 📋 Phase 10 — SaaS Features & Monitoring

> **Goal**: Enterprise-grade features for SaaS deployment and full-stack observability.

---

### [x] API Versioning

**What**: Enable URI versioning (`/v1/...`) before first client deployment.
**Scope**: Enable NestJS versioning in `main.ts`, add `@Version('1')` to all controllers.

---

### [x] Rate Limiting & Throttling

**What**: Protect the API with `@nestjs/throttler`. Global defaults + stricter limits on auth endpoints.

**Scope**:

1. Install `@nestjs/throttler` with Redis store for multi-instance support
2. Global defaults (100 req/min) + strict limits on `/auth/login`, `/auth/register`, `/auth/refresh`
3. Exclude `/health` from throttling

---

### [ ] Prometheus Metrics Endpoint

**What**: Expose application metrics via `GET /metrics` in Prometheus exposition format. Currently the system has **zero metrics** — no counters, histograms, or gauges.

**Scope**:

1. Install `prom-client` (the standard Prometheus client for Node.js)
2. Create `src/infrastructure/metrics/` module with a `MetricsService` that registers:
   - **HTTP metrics** (auto-instrumented via middleware): `http_requests_total` (counter by method, route, status), `http_request_duration_seconds` (histogram)
   - **Business metrics**: `orders_created_total`, `checkout_saga_completed_total`, `checkout_saga_failed_total`, `payments_captured_total`, `payments_refunded_total`
   - **Infrastructure metrics**: `db_pool_active_connections` (gauge), `redis_health_status` (gauge 0/1), `bullmq_queue_depth` (gauge per queue), `websocket_connections_active` (gauge)
3. Expose `GET /metrics` endpoint (no auth, Prometheus scrape target)
4. Add default labels: `app=ecommerce-store-api`, `env=production|development`

**Location**: `src/infrastructure/metrics/`

---

### [ ] Grafana Monitoring Stack (Docker Compose)

**What**: Add Prometheus + Grafana to the Docker Compose setup for local and production monitoring.

**Scope**:

1. Add `prometheus` service to `docker-compose.yaml` with scrape config targeting `:3000/metrics`
2. Add `grafana` service with provisioned data source (Prometheus) and pre-built dashboards
3. Add `loki` service (Grafana Loki) for log aggregation from JSON stdout
4. Create pre-built Grafana dashboards:
   - **API Overview**: Request rate, error rate, P50/P95/P99 latency, active connections
   - **Business Metrics**: Orders created, SAGA success/failure rates, payments captured/refunded
   - **Infrastructure**: DB pool usage, Redis health, BullMQ queue depths, WebSocket connections
5. Expose Grafana on port `3001` (default login: admin/admin)

**Location**: `docker-compose.yaml`, `docker/monitoring/` (Prometheus config, Grafana provisioning, dashboard JSON)

---

### [ ] OpenTelemetry Distributed Tracing

**What**: Add end-to-end request tracing with span propagation across HTTP, BullMQ jobs, and domain events.

**Scope**:

1. Install `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`
2. Create `src/infrastructure/tracing/tracing.ts` — OTel SDK bootstrap (before NestJS starts)
3. Auto-instrument: HTTP, PostgreSQL (pg), Redis (ioredis), BullMQ
4. Export spans to Grafana Tempo (or Jaeger) via OTLP
5. Add Tempo service to Docker Compose and Grafana data source
6. Correlate traces with logs via `traceId` injected into log metadata

**Location**: `src/infrastructure/tracing/`

---

## 💳 Phase 11 — Payment Integrations

> **Goal**: Replace mock payment adapters with real payment provider integrations.

---

### [ ] Real Stripe Integration

- Stripe SDK (`stripe` npm package) for payment intents and charges
- Webhook signature verification (`stripe-signature` header)
- Idempotent payment creation (use existing `IdempotencyStore`)
- Handle edge cases: double-charge prevention, partial captures, refund flows
- Test mode with Stripe test keys

### [ ] Real PayPal Integration

- PayPal REST SDK for order creation and capture
- Webhook signature verification
- Map PayPal statuses to domain `PaymentStatus` value object

---

## 📦 Phase 12 — Ecosystem

> **Goal**: Full-stack capabilities and real-world integrations.

---

### [ ] Admin Dashboard (Frontend)

- React/Next.js admin panel
- Order management, inventory dashboard
- Demonstrates full-stack capability

### [ ] Real Email Notifications

- SendGrid or Resend adapter for `NotificationGateway`
- Order confirmation, payment receipts, email templates

### [ ] Graceful Degradation (Redis Failover)

- Health-aware proxy at DI level (`createHealthAwareProxy()` pattern)
- If Redis dies → route directly to Postgres repositories
- Recovery service to flush stale caches on reconnection
- Zero changes to repository implementations

### [ ] Outbox Pattern for Reliable Events

- `outbox` table for at-least-once event delivery
- Use cases write events in same DB transaction as aggregate changes
- Scheduled BullMQ job polls and dispatches unprocessed events
- Prevents lost notifications/events on crashes

---

## 🚀 Phase 13 — Pre-Deployment Checklist

> **Goal**: Final steps to execute right before the first production release.

---

### [ ] Generate Initial Migration

**What**: Migration CLI infrastructure is **fully implemented** — `data-source.ts`, per-environment npm scripts (`generate`, `run`, `revert`, `show`), and `migrationsTableName` are all configured. No migration files exist yet because the project is still in active development with `synchronize: true`. Before first production deploy, generate the initial migration from the current 15 entity schemas.
**Risk**: None until production deploy. `synchronize: true` is appropriate for active development.

**Scope** (when ready to deploy):

1. `npm run migration:generate:dev -- src/migrations/InitialSchema`
2. Verify migration runs cleanly on empty database
3. Add `migration:run` to the production start flow in `package.json`

---

## ❌ Skipped (Premature)

| Task                  | Reason                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| DB Sharding           | PostgreSQL handles millions of rows. Far too early.                                                         |
| CQRS                  | Added complexity with no current need. Reconsider if read/write patterns diverge.                           |
| Event Sourcing        | Overkill for this domain. State-based persistence is fine.                                                  |
| Data Archival         | Only relevant when orders table exceeds ~500K rows.                                                         |
| GraphQL               | REST + Swagger is sufficient for current clients. Reconsider if frontend needs flexible queries.            |
| Microservices         | Modular monolith first. Extract when scaling demands it.                                                    |
| Multi-Tenancy         | Only relevant for SaaS deployment model. Premature until first paying tenant.                               |
| Per-User Permissions  | RBAC covers standard use cases. Individual overrides add complexity and can be deferred until required.     |
| Identity/Access Split | Separate modules for identity and token/session management is an optimization for microservices extraction. |
