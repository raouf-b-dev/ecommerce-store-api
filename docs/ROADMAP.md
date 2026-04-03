# 🗺️ Roadmap

> Prioritized by **production-readiness** and **career impact**.

---

## ✅ Completed

### [x] Strict DDD & Hexagonal Architecture

Full Hexagonal structure across all 8 modules. Domain layer is framework-free, application layer orchestrates via use cases, adapters are cleanly separated into primary (driving) and secondary (driven).

### [x] Anti-Corruption Layer (ACL) Gateways

All cross-module communication uses explicit Gateway ports + adapters. Zero direct cross-context executable imports.

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

### 🏆 Phase 1 — Production Credibility

> Features that turn this from "learning project" into "I can ship production systems."

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

#### [ ] Dockerfile (Production-Ready)

- Multi-stage build (build → production)
- Separate `docker-compose.dev.yml` and `docker-compose.prod.yml`
- Health check in Docker config
- Environment variable documentation

#### [ ] Health Checks (`@nestjs/terminus`)

- `GET /health` endpoint (public, no auth)
- Indicators: PostgreSQL (TypeORM ping), Redis (PING), BullMQ queue health
- Dedicated health module: `src/modules/health/`

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

### 🥉 Phase 4 — Observability

---

#### [ ] Structured Logging (Winston)

- Replace NestJS default logger with Winston
- Daily rotation, compression, 90-day retention
- Log files: combined, error, http, exceptions
- Logging infrastructure: `src/infrastructure/logging/`

#### [ ] Correlation IDs

- `CorrelationIdMiddleware` with `AsyncLocalStorage`
- Auto-inject into every Winston log line
- Return `X-Request-Id` in response headers
- Structured BullMQ job logs (job ID, queue, attempt)

#### [ ] OpenAPI Contract Testing

- Generate OpenAPI spec to JSON
- E2E tests validate responses against schema
- Gate in CI pipeline

---

### 📦 Phase 5 — Ecosystem

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
