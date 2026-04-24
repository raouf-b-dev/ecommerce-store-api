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
| **4** | Test Suite Foundation        | ✅ Done | Comprehensive spec files: Use case unit tests (all modules), repository integration tests (Postgres + cached), controller tests · Docker Compose for local dev (PostgreSQL 18 + Redis Stack)                 | `src/modules/*/`                                          |
| **5** | Code Quality (v0.2.0)        | ✅ Done | Removed redundant try/catch from all 61 use case/service files · Trimmed orders table from 12 to 4 indexes · Migration CLI scripts configured (`data-source.ts`)                                             | `data-source.ts`, `package.json`                          |
| **6** | Deployment Blockers          | ✅ Done | Multi-stage `Dockerfile` (Node.js 24 Alpine) · `GlobalExceptionFilter` for JSON error standardization · Application Graceful Shutdown handling (`SIGTERM` & connections drain)                               | `Dockerfile`, `src/filters/`, `src/main.ts`               |
| **7** | Security Hardening           | ✅ Done | `helmet` security headers · CORS with env-based origin whitelist · XSS sanitization interceptor (`sanitize-html`) · Pagination `@Max(100)` on all query DTOs                                                 | `src/main.ts`, `src/interceptors/`, `src/config/`         |
| **8** | Observability                | ✅ Done | Winston structured JSON logging · Health checks (`/health`) · Correlation ID Middleware (`X-Request-Id`) · End-to-end `correlationId` propagation into all 18 BullMQ job handlers and schedulers             | `src/infrastructure/logging/`, `src/infrastructure/jobs/` |

---

## 🔐 Phase 7.5 — Auth Overhaul (RSA + Refresh Tokens + RBAC)

> **Goal**: Production-grade authentication and authorization. Replace HMAC JWT with RSA (RS256) using `jose`, add refresh token rotation with session management, and introduce a full RBAC system with roles, permissions, and guards.
>
> **Architecture decisions**: Per-user permission overrides and Identity/Access module split are deferred to future phases.
>
> **Execution**: 4 incremental waves — each independently testable and mergeable.

---

### Wave 1 — RSA JWT Core

**What**: Replace HMAC-based JWT signing (`@nestjs/jwt` + `@nestjs/passport`) with RSA RS256 using `jose`. Move JWT infrastructure to a global module. All existing auth continues to work — just the signing mechanism changes.

- [x] Install `jose`, remove `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`
- [x] Create `src/infrastructure/jwt/` global module
  - `JwksService` — RSA PEM parsing, public key derivation, JWKS export
  - `JwtSignerService` — RS256 signing for access + refresh tokens
  - `JwtVerifierService` — RS256 verification with 30s clock tolerance
  - `JwtModule` — `@Global()` module exporting all services
- [x] Create `src/guards/auth.guard.ts` — custom `CanActivate` guard (replaces Passport-based `JWTAuthGuard`)
- [x] Update env config pipeline
  - `validate-env.ts` — replace `JWT_SECRET`/`JWT_EXPIRES_IN` with `JWT_PRIVATE_KEY`/`JWT_ACCESS_TOKEN_TTL`/`JWT_REFRESH_TOKEN_TTL`
  - `configuration.ts` — new `jwt: { privateKey, accessTokenTtl, refreshTokenTtl }` shape
  - `env-config.service.ts` — updated getter
  - `.env.example` / `.secrets.example`
- [x] Update `LoginUserUseCase` to use `JwtSignerService` instead of `JwtService`
- [x] Add `GET /auth/.well-known/jwks.json` endpoint
- [x] Delete old `JWTAuthGuard`, `JwtStrategy`; update `auth.module.ts` (remove `PassportModule`, `JwtModule.registerAsync()`)
- [x] Migrate all controllers from `JWTAuthGuard` → new `AuthGuard`
- [x] Update/write tests: JWT signer/verifier/JWKS specs, AuthGuard spec, login usecase spec, auth controller spec

**Location**: `src/infrastructure/jwt/`, `src/guards/`, `src/config/`

---

### Wave 2 — Refresh Token Rotation

**What**: Add refresh tokens alongside access tokens. Sessions stored in PostgreSQL with SHA-256 hashed tokens. Supports token rotation (old refresh token invalidated on use), single-session logout, and all-session logout.

- [x] Create `SessionToken` domain entity — `create()`, `revoke()`, `isValid`, `isExpired`, `isTokenMatch(rawToken)`
- [x] Create `SessionTokenRepository` abstract port — `save()`, `findById()`, `revokeAllForUser()`, `deleteExpired()`
- [x] Create `session_tokens` TypeORM schema + `PostgresSessionTokenRepository`
- [x] Update `LoginUserUseCase` — create session, return `{ access_token, refresh_token }`
- [x] Create `RefreshTokenUseCase` — verify refresh JWT, validate session, rotate tokens
- [x] Create `LogoutUseCase` — revoke current session
- [x] Create `LogoutAllUseCase` — revoke all sessions for user
- [x] Add `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/logout-all` endpoints
- [x] Update `auth.module.ts` — register session token entity/repo/use cases
- [x] Write tests: SessionToken entity spec, refresh/logout use case specs, auth controller spec updates
- [x] **HttpOnly Cookie Transport** — Move refresh token from response body to `Set-Cookie` (HttpOnly, Secure, SameSite=Strict, Path=/auth). Controller reads from `req.cookies` instead of body. See `docs/JWT-RSA-JWKS.md` §4.4
- [x] **JWKS `kid` Thumbprint** — Replace hardcoded `kid: '1'` in `JwksService` with RFC 7638 SHA-256 thumbprint derived from public key material. See `docs/JWT-RSA-JWKS.md` §3.4

**Location**: `src/modules/auth/core/domain/entities/`, `src/modules/auth/secondary-adapters/`

---

### Wave 3 — RBAC (Roles + Permissions + Guards)

**What**: Full role-based access control. Three seeded system roles (`SUPER_ADMIN`, `ADMIN`, `CUSTOMER`) with a permission matrix. `PermissionsGuard` resolves permissions per request. `@RequirePermissions()` decorator protects endpoints. Admins can create custom roles.

**System Roles** (seeded on first boot, immutable):

| Role          | Description                                                                                                                                             |
| :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SUPER_ADMIN` | All management permissions granted. Cannot be deleted or modified. System owner                                                                         |
| `ADMIN`       | All management permissions except `canManageRoles`. Upgradeable by `SUPER_ADMIN`                                                                        |
| `CUSTOMER`    | All management permissions `false`. Can still access own resources (cart, orders, profile) via auth-scoped endpoints. Default role for registered users |

**Permission Flags** (e-commerce domain):

`canManageProducts`, `canViewAllProducts`, `canManageOrders`, `canViewAllOrders`, `canManageCustomers`, `canViewAllCustomers`, `canManageInventory`, `canViewAllInventory`, `canManagePayments`, `canViewAllPayments`, `canManageUsers`, `canViewAllUsers`, `canManageRoles`, `canManageCarts`

**Scope**:

- [ ] Create `Role` domain entity — system role protection, `updateName()`, `updatePermissions()`, `validateNotSystemForDeletion()`
- [ ] Create `PermissionSet` value object — typed boolean flags for all e-commerce permissions
- [ ] Create system roles reference data (`SYSTEM_ROLES` array)
- [ ] Create `RoleRepository` abstract port + TypeORM schema + `PostgresRoleRepository`
- [ ] Create `RoleSystemDataInitializer` — `OnApplicationBootstrap` seeder (idempotent)
- [ ] Create `GetPermissionsUseCase` — loads role permissions by role code
- [ ] Create `PermissionsGuard` in `src/guards/` — reads `@RequirePermissions()` metadata, resolves permissions, attaches to `request.userPermissions`
- [ ] Create `@RequirePermissions()` decorator + `@UserPermissions()` param decorator
- [ ] Update `UserRole` value object — from hardcoded enum (`ADMIN`/`CUSTOMER`) to dynamic role code (string)
- [ ] Update `auth.module.ts` — register role entity/repo/initializer
- [ ] Write tests: Role entity spec, PermissionsGuard spec, GetPermissionsUseCase spec, seeder spec

**Location**: `src/modules/auth/core/domain/`, `src/guards/`, `src/modules/auth/decorators/`

---

### Wave 4 — Role Management API + Controller Permission Wiring

**What**: Admin CRUD endpoints for roles. Wire `@RequirePermissions(...)` to every protected endpoint across all controllers.

- [ ] Create role management use cases: `CreateRoleUseCase`, `UpdateRoleUseCase`, `DeleteRoleUseCase`, `FindAllRolesUseCase`
- [ ] Create `roles.controller.ts` — `GET/POST/PATCH/DELETE /roles` (requires `canManageRoles`)
- [ ] Wire all domain controllers with `@UseGuards(AuthGuard, PermissionsGuard)` + `@RequirePermissions(...)`:
  - Products: `canManageProducts` / `canViewAllProducts`
  - Orders: `canManageOrders` / `canViewAllOrders`
  - Customers: `canManageCustomers` / `canViewAllCustomers`
  - Inventory: `canManageInventory` / `canViewAllInventory`
  - Payments: `canManagePayments` / `canViewAllPayments`
  - Carts: `canManageCarts`
  - Roles: `canManageRoles`
- [ ] Write tests: Role CRUD use case specs, roles controller spec

**Location**: `src/modules/auth/`, all domain controllers

---

### Future — Deferred Items

- [ ] **Per-User Permission Overrides** — Admin can grant/revoke individual permissions per user (stored in `user_permission_overrides` table, merged at resolution time)
- [ ] **Identity / Access Module Split** — Separate user identity management and token/session management into independent bounded contexts for microservice extraction

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
