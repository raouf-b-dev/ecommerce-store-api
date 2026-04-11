# 🗺️ Roadmap

> Prioritized by **production-readiness** and **career impact**.

---

## ✅ Completed

### [x] ACL Gateway & SAGA Cleanup

Eliminated all cross-module imports violating Domain-Driven Design boundaries in the Orders module.

- Moved `PaymentMethod` to `shared-kernel` to resolve downstream dependencies
- Gateway ports define their own downstream DTOs (e.g. `CheckoutCustomerInfo`)
- Decoupled `OrderEntity` and `ProductEntity` foreign key relationships in the ORM Layer
- Rewired BullMQ SAGA job handlers to inject Application Services (Use Cases) instead of Secondary Adapters
- Removed direct repository-level cross-context database transactions (`postgres.order-repository.ts` now exclusively manages `orders` and `order_items` tables)

### [x] Strict DDD & Hexagonal Architecture

Full Hexagonal structure across all 8 modules. Domain layer is framework-free, application layer orchestrates via use cases, adapters are cleanly separated into primary (driving) and secondary (driven).

### [x] Anti-Corruption Layer (ACL) Gateways

Cross-module communication uses Gateway ports + adapters. 7 gateways implemented across Orders, Carts, and Auth modules.

| Gateway                       | Downstream → Upstream | What It Wraps                          |
| ----------------------------- | --------------------- | -------------------------------------- |
| `CustomerGateway`             | Orders → Customers    | Customer lookup for checkout           |
| `CartGateway`                 | Orders → Carts        | Cart retrieval and clearing            |
| `InventoryReservationGateway` | Orders → Inventory    | Stock reservation/release/confirmation |
| `PaymentGateway`              | Orders → Payments     | Payment processing                     |
| `ProductGateway`              | Carts → Products      | Product validation for cart items      |
| `InventoryGateway`            | Carts → Inventory     | Stock availability checks              |
| `CustomerGateway`             | Auth → Customers      | Customer creation on registration      |

### [x] API Documentation (Swagger/OpenAPI)

`@nestjs/swagger` configured in `main.ts`, `@ApiTags` on all 8 controllers. Swagger UI at `/api/docs`.

### [x] Docker Compose

`docker-compose.yaml` with PostgreSQL 18 and Redis Stack for local development.

### [x] Result Pattern & Idempotency

Functional `Result<T, E>` across all layers. `@Idempotent()` decorator with Redis-backed store for checkout protection.

### [x] SAGA Pattern & Compensation

BullMQ-based checkout SAGA with `CheckoutFailureListener` for automatic compensation (refund, stock release, order cancellation).

### [x] Real-time Notifications

BullMQ nested flow (Save → Send → Update) with WebSocket delivery via Socket.io.

### [x] Decorator-based Caching

`CachedRepository` decorator pattern wrapping Postgres repositories with Redis cache-aside.

### [x] Try/Catch Cleanup (v0.2.0)

Removed redundant try/catch from all 61 use case/service files. Repositories handle exceptions, use cases work with `Result`.

### [x] Index Optimization (v0.2.0)

Trimmed orders table from 12 to 4 indexes. Removed speculative indexes with no matching query pattern.

---

## 📋 Backlog — Prioritized

### 🏆 Phase 1 — Production Infrastructure

> Table-stakes for deployment. The app is not production-ready without these.

---

#### [ ] Health Checks (`@nestjs/terminus`)

- `GET /health` endpoint (public, no auth)
- Indicators: PostgreSQL (TypeORM ping), Redis (PING), BullMQ queue health
- Dedicated health module: `src/modules/health/`

#### [ ] Structured Logging (Winston/Pino)

- Replace NestJS default logger with Winston or Pino
- JSON format in production, pretty-print in development
- Daily rotation, compression, 90-day retention
- Log files: combined, error, http, exceptions
- Location: `src/infrastructure/logging/`

#### [ ] Correlation IDs

- `CorrelationIdMiddleware` with `AsyncLocalStorage`
- Auto-inject into every log line
- Return `X-Request-Id` in response headers
- Propagate to BullMQ job logs (job ID, queue, attempt)

#### [ ] Dockerfile (Production-Ready)

- Multi-stage build (`node:20-alpine` build → production)
- Separate `docker-compose.dev.yml` and `docker-compose.prod.yml`
- Health check in Docker config
- Environment variable documentation

#### [ ] Global Exception Filter & Graceful Shutdown

- Catch-all exception filter: logs full error (with correlation ID), returns sanitized response
- `app.enableShutdownHooks()`, drain BullMQ workers, close DB pool on SIGTERM
- No stack trace leakage in production responses

---

### 🥇 Phase 2 — Resilience & Reliability

---

#### [ ] Graceful Degradation (Redis Failover)

- Health-aware proxy at DI level (`createHealthAwareProxy()` pattern)
- If Redis dies → route directly to Postgres repositories
- Recovery service to flush stale caches on reconnection
- Zero changes to repository implementations

#### [ ] Outbox Pattern for Reliable Events

- `outbox` table for at-least-once event delivery
- Use cases write events in same DB transaction as aggregate changes
- Scheduled BullMQ job polls and dispatches unprocessed events
- Prevents lost notifications/events on crashes

#### [ ] Domain Events (Explicit Event Bus)

- `DomainEventPublisher` port in shared kernel
- In-process adapter for tests, BullMQ adapter for production
- Events: `OrderPlaced`, `PaymentCompleted`, `StockReserved`

#### [ ] EAV Product Attributes

- Dynamic product attributes via Entity-Attribute-Value pattern
- `product_attribute_definitions` + `product_attribute_values` tables
- Seedable per product category (electronics, clothing, food)
- Admin API for definition CRUD, per-product value management
- See: [`EAV-PATTERN.md`](EAV-PATTERN.md)

---

### 🥈 Phase 3 — API Hardening

---

#### [ ] Rate Limiting & Throttling

- `@nestjs/throttler` with Redis store for multi-instance support
- Global defaults (100 req/min) + strict limits on `/auth/login`, `/auth/refresh`
- Exclude `/health` from throttling

#### [ ] CORS & Security Headers

- Explicit CORS configuration in `main.ts`
- Helmet.js for security headers
- Input sanitization beyond DTO validation

#### [ ] API Versioning

- NestJS URI versioning (`/v1/orders`)
- `@Version('1')` on all existing controllers
- Deprecation policy documentation

---

### 🥉 Phase 4 — Observability Stack

---

#### [ ] Prometheus Metrics

- `prom-client` npm package for custom metrics
- Expose `GET /metrics` endpoint (internal, no auth)
- Key metrics: `http_request_duration_seconds`, `http_requests_total`, `bullmq_job_duration_seconds`, `db_active_connections`
- NestJS interceptor for automatic HTTP metric collection

#### [ ] Grafana + Loki Integration

- `docker-compose` additions: Prometheus, Loki, Promtail, Grafana
- Grafana dashboards: request rate, error rate, latency percentiles, queue depth
- Loki data source for log aggregation (consumes Winston/Pino JSON output)
- Alert rules for error rate spikes and queue backlogs

#### [ ] OpenAPI Contract Testing

- Generate OpenAPI spec to JSON
- E2E tests validate responses against schema
- Gate in CI pipeline

---

### 💳 Phase 5 — Payment Integrations

---

#### [ ] Real Stripe Integration

- Stripe SDK (`stripe` npm package) for payment intents and charges
- Webhook signature verification (`stripe-signature` header)
- Idempotent payment creation (use existing `IdempotencyStore`)
- Handle edge cases: double-charge prevention, partial captures, refund flows
- Test mode with Stripe test keys

#### [ ] Real PayPal Integration

- PayPal REST SDK for order creation and capture
- Webhook signature verification
- Map PayPal statuses to domain `PaymentStatus` value object

---

### 📦 Phase 6 — Ecosystem

---

#### [ ] Admin Dashboard (Frontend)

- React/Next.js admin panel
- Order management, inventory dashboard
- Demonstrates full-stack capability

#### [ ] WebSocket Notifications (Client-facing)

- Real-time order status updates for customers
- Socket.IO gateway as primary adapter

#### [ ] Real Email Notifications

- SendGrid or Resend adapter for `NotificationGateway`
- Order confirmation, payment receipts, email templates

---

## ❌ Skipped (Premature)

| Task           | Reason                                                                            |
| -------------- | --------------------------------------------------------------------------------- |
| DB Sharding    | PostgreSQL handles millions of rows. Far too early.                               |
| CQRS           | Added complexity with no current need. Reconsider if read/write patterns diverge. |
| Event Sourcing | Overkill for this domain. State-based persistence is fine.                        |
| Data Archival  | Only relevant when orders table exceeds ~500K rows.                               |
