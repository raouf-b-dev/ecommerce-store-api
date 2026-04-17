# 🗺️ E-Commerce Store API — Feature Roadmap

> A living roadmap for the E-Commerce Store API project. Each phase includes enough context for any contributor or AI agent to pick up tasks in a fresh session.
>
> **Companion docs**: [`AGENT.md`](../AGENT.md), [`ARCHITECTURE.md`](ARCHITECTURE.md), [`EAV-PATTERN.md`](EAV-PATTERN.md)

---

## How to Use This File

- `[ ]` — Not started
- `[/]` — In progress
- `[x]` — Completed
- Open a new chat, reference this file, and pick the next unchecked task.

---

## ✅ Completed Phases — Summary

> Full implementation detail has been collapsed for readability. The history and decisions are preserved in git.

| Phase | Name                         | Status  | Key Deliverables                                                                                                                                                                                             | Location                                                  |
| :---- | :--------------------------- | :------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------- |
| **0** | Foundation                   | ✅ Done | DDD/Hexagonal scaffold · 8 modules (Auth, Carts, Customers, Inventory, Orders, Payments, Products, Notifications) · JWT auth · Passport strategies · Redis WebSocket adapter · BullMQ jobs · Swagger/OpenAPI | `src/modules/`, `src/infrastructure/`                     |
| **1** | ACL Gateway & SAGA           | ✅ Done | 7 ACL Gateways across Orders, Carts, Auth · BullMQ-based checkout SAGA with `CheckoutFailureListener` compensation (refund, stock release, order cancellation) · Gateway DTOs decoupled from domain entities | `src/modules/orders/`, `src/modules/carts/`               |
| **2** | Result Pattern & Idempotency | ✅ Done | Functional `Result<T, E>` across all layers · `@Idempotent()` decorator with Redis-backed store for checkout protection                                                                                      | `src/shared-kernel/`, `src/infrastructure/idempotency/`   |
| **3** | Decorator-based Caching      | ✅ Done | `CachedRepository` decorator pattern wrapping Postgres repositories with Redis cache-aside                                                                                                                   | `src/modules/*/secondary-adapters/repositories/cached-*/` |
| **4** | Test Suite Foundation        | ✅ Done | 45 spec files: Use case unit tests (all modules), repository integration tests (Postgres + cached), controller tests · Docker Compose for local dev (PostgreSQL 18 + Redis Stack)                            | `src/modules/*/`                                          |
| **5** | Code Quality (v0.2.0)        | ✅ Done | Removed redundant try/catch from all 61 use case/service files · Trimmed orders table from 12 to 4 indexes · Migration CLI scripts configured (`data-source.ts`)                                             | `data-source.ts`, `package.json`                          |

---

## 🚨 Phase 6 — Deployment Blockers

> **Goal**: Fix the issues that **literally prevent** deploying to a fresh production environment. Do these first.

---

### [x] Dockerfile (🔴 Blocker)

**What**: The project has **no Dockerfile**. There is no way to containerize the application for deployment.
**Risk**: Cannot deploy to Docker, Kubernetes, AWS ECS, Cloud Run, or any container-based platform.

**Scope**:

1. Create multi-stage `Dockerfile` (`node:24-alpine` build → production)
2. Separate `docker-compose.dev.yml` and `docker-compose.prod.yml` (currently one `docker-compose.yaml` serves both)
3. Add health check in Docker config
4. Environment variable documentation for production containers

---

### [ ] Global Exception Filter

**What**: No `ExceptionFilter` exists anywhere in the codebase. Unhandled exceptions leak raw NestJS error objects (including stack traces) to clients.
**Risk**: Stack trace leakage in production responses, inconsistent error response format, no centralized error logging.

**Scope**:

1. Create `src/filters/global-exception.filter.ts` — catch-all exception filter
2. Log full error (with correlation ID once implemented) via logger
3. Return sanitized, consistent JSON error response (no stack traces in production)
4. Register globally in `main.ts` via `app.useGlobalFilters()`

---

### [ ] Graceful Shutdown

**What**: No `enableShutdownHooks()`, no `OnApplicationShutdown` lifecycle hooks anywhere in the codebase. On SIGTERM, the process terminates immediately.
**Risk**: Dropped in-flight requests, stalled BullMQ jobs, mid-transaction DB corruption, ungraceful WebSocket disconnections.

**Scope**:

1. Add `app.enableShutdownHooks()` to `main.ts`
2. Implement `OnApplicationShutdown` in critical services (Redis client, BullMQ workers, WebSocket gateway)
3. Add connection draining for HTTP server

---

## 🔒 Phase 7 — Security Hardening

> **Goal**: Quick security wins — most are < 30 minutes each. Hardens the API surface before exposing it to real users.

---

### [ ] Security Headers (Helmet)

**What**: No HTTP security headers are set. `helmet` is not installed or configured. Responses lack `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Content-Security-Policy`.
**Risk**: Clickjacking, MIME sniffing attacks, missing HSTS.

**Scope**: `npm install helmet`, add `app.use(helmet())` to `main.ts`.

---

### [ ] CORS Restriction

**What**: `main.ts` has **no CORS configuration at all** — `enableCors()` is never called. By default, NestJS rejects cross-origin requests, but this is not explicitly configured.
**Risk**: No documented CORS policy. When a frontend is deployed, CORS will need to be configured — and without explicit configuration, it's easy to accidentally allow all origins.

**Scope**: Add `app.enableCors()` with explicit `origin` whitelist, `credentials: true`, and allowed methods. Add `CORS_ALLOWED_ORIGINS` env var.

---

### [ ] Input Sanitization (XSS)

**What**: No input sanitization exists. `class-validator` enforces shape (types, max length) but does not strip HTML/JavaScript from string fields. Raw user input is stored directly to PostgreSQL.
**Risk**: Stored XSS — malicious HTML/JS in product names, customer names, order notes rendered by any frontend consuming the API.

**Scope**: Add a global sanitization layer (custom interceptor or `class-sanitizer`) that strips HTML from all string inputs before persistence.

---

### [ ] Pagination Safety

**What**: The search/list endpoints may lack `@Max()` constraints on pagination `limit` fields. A caller could potentially set `limit=999999` and dump entire tables in one request.
**Risk**: Performance DoS, data exfiltration.

**Scope**: Audit all list/search DTOs across all 8 modules. Add `@Max(100)` to every `limit` field, set defaults to `20`.

---

### [ ] Logout Endpoint

**What**: No `POST /auth/logout` endpoint exists. Users cannot invalidate their JWT sessions. Once a token is issued, it remains valid until expiry.
**Risk**: Compromised tokens cannot be revoked; users must wait for natural token expiry.

**Scope**:

1. Create `LogoutUseCase` — invalidates the current session/token
2. Add `POST /auth/logout` endpoint (authenticated)
3. Optional: `POST /auth/logout-all` — revoke all sessions for the user

---

## 📊 Phase 8 — Observability

> **Goal**: Make production debuggable. Without these, you're flying blind when issues occur.

---

### [ ] Structured Logging (Winston/Pino)

**What**: The project uses the **default NestJS logger** (`Logger` from `@nestjs/common`). No structured logging library (Winston, Pino) is installed. Log output is unstructured text — not parseable by log aggregation tools.
**Risk**: Zero log visibility in containerized deployments. No JSON-structured logs for CloudWatch, Loki, Datadog, or ELK. No log levels, no rotation, no file output.

**Scope**:

1. Install Winston (or Pino) and configure as NestJS custom logger
2. JSON format in production, pretty-print in development
3. Daily rotation, compression, 90-day retention (for file transports)
4. Log files: combined, error, http, exceptions
5. Add `LOG_TRANSPORT` env var: `file`, `console`, or `both`
6. Ensure all log entries include: `timestamp`, `level`, `message`, `context`, `stack` (if error)

**Location**: `src/infrastructure/logging/`

---

### [ ] Health Checks (`@nestjs/terminus`)

**What**: No health check endpoint exists. Container orchestrators (Docker, Kubernetes, ECS) have no way to determine application readiness or liveness.
**Risk**: Unhealthy instances continue receiving traffic. No automated recovery. Load balancers cannot detect failures.

**Scope**:

1. Install `@nestjs/terminus`
2. Create `src/modules/health/` module
3. `GET /health` endpoint (public, no auth) with indicators: PostgreSQL (TypeORM ping), Redis (PING), BullMQ queue health
4. Add health check to Dockerfile (`HEALTHCHECK` directive)

---

### [ ] Correlation ID Middleware

**What**: No request correlation exists. When debugging production issues, there is no way to trace a single request across log lines — all logs from concurrent requests are interleaved with no grouping key.
**Risk**: Production incidents are nearly impossible to debug when multiple requests produce logs simultaneously.

**Scope**:

1. Create `CorrelationIdMiddleware` — generates UUID per request, stores in `AsyncLocalStorage`
2. Read incoming `X-Request-Id` header (if present) or generate a new one
3. Inject `correlationId` into all log metadata automatically (extend logger service)
4. Return `X-Request-Id` in response headers for client-side correlation
5. Propagate to WebSocket events and BullMQ job metadata

**Location**: `src/infrastructure/logging/middleware/correlation-id.middleware.ts`

---

### [ ] Structured Console Logging (Container-Ready)

**What**: In production deployments (Docker, Kubernetes, AWS ECS, Cloud Run), the standard practice is to write structured JSON to `stdout` and let the platform's log driver (CloudWatch, Loki, Datadog, ELK) collect it. The project currently has no mechanism for this.
**Risk**: Zero log visibility in containerized deployments. Log aggregation tools cannot ingest unstructured console output.

**Scope**:

1. Add a JSON console transport in production mode (structured `winston.format.json()` to stdout)
2. Keep file transports as a configurable option (useful for VM deployments)
3. Ensure all log entries include: `timestamp`, `level`, `message`, `context`, `correlationId`, `stack` (if error)

**Note**: Depends on Structured Logging and Correlation ID tasks above.

---

### [x] Secrets Management Documentation

**What**: The project has the tooling (`.env.example`, `.secrets.example`, `generate-envs.js`, `envalid` validation) but no documentation explaining the secrets lifecycle, configuration taxonomy, or deployment injection patterns.
**Risk**: Contributors and future deployments have no reference for how to handle secrets safely.

**Scope**: Create `docs/SECRETS-MANAGEMENT.md` covering:

1. Configuration taxonomy (T1 secrets / T2 sensitive / T3 non-sensitive)
2. Project file layout and git boundaries
3. Environment variables reference table
4. Boot-time configuration pipeline (`envalid` → `configuration.ts` → `EnvConfigService`)
5. Secret injection patterns by deployment model (manual, CI/CD, Docker, K8s, external vault)
6. The `generate-envs` toolchain documentation

---

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

### [ ] API Versioning

**What**: Enable URI versioning (`/v1/...`) before first client deployment.
**Scope**: Enable NestJS versioning in `main.ts`, add `@Version('1')` to all controllers.

---

### [ ] Rate Limiting & Throttling

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

| Task           | Reason                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------ |
| DB Sharding    | PostgreSQL handles millions of rows. Far too early.                                              |
| CQRS           | Added complexity with no current need. Reconsider if read/write patterns diverge.                |
| Event Sourcing | Overkill for this domain. State-based persistence is fine.                                       |
| Data Archival  | Only relevant when orders table exceeds ~500K rows.                                              |
| GraphQL        | REST + Swagger is sufficient for current clients. Reconsider if frontend needs flexible queries. |
| Microservices  | Modular monolith first. Extract when scaling demands it.                                         |
| Multi-Tenancy  | Only relevant for SaaS deployment model. Premature until first paying tenant.                    |
