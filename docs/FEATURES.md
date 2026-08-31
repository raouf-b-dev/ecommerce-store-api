# Feature Documentation

Detailed reference for features implemented in the E-Commerce Store API.
For a short list on the homepage, see [Capabilities](../README.md#capabilities) in the README.

## Table of Contents

- [Architecture](#architecture)
- [Distributed Systems](#distributed-systems)
- [Data and Performance](#data-performance)
- [Security](#security)
- [Infrastructure](#infrastructure)
- [Observability](#observability)
- [Testing](#testing)
- [Database Seeding](#database-seeding)
- [Available Scripts](#available-scripts)

---

<a id="architecture"></a>

## Architecture

### Domain-Driven Design (Strategic)

The system is split into explicit **Subdomains** (Core, Generic, Supporting) and **Bounded Contexts** that map to NestJS modules. Each context owns its domain model, repositories, and use cases. There is no shared mutable state across contexts.

**Location**: `src/modules/` · **Deep-dive**: [ARCHITECTURE.md](architecture/ARCHITECTURE.md)

### Domain-Driven Design (Tactical)

Modules use tactical DDD: **Entities**, **Value Objects**, **Aggregates**, **Domain Services**, and **Repository Ports**. Domain objects enforce their own invariants.

**Location**: `src/modules/*/core/domain/` · **Deep-dive**: [DDD-HEXAGONAL.md](architecture/DDD-HEXAGONAL.md)

### Hexagonal Architecture (Ports and Adapters)

The domain core does not depend on infrastructure. Databases, caches, and queues sit behind **Port** interfaces implemented by **Adapters**. Swapping a store means writing a new adapter; the domain stays the same.

**Location**: `src/modules/*/secondary-adapters/` · **Deep-dive**: [DDD-HEXAGONAL.md](architecture/DDD-HEXAGONAL.md)

### ACL Gateway Pattern

Eleven modules live under `src/modules/`. Write-side contexts talk through **eight ACL gateway ports** (Orders, Carts, Authentication). Analytics composes reads in SQL ([domains/ANALYTICS.md](architecture/domains/ANALYTICS.md)); Health has no gateways. There are no direct executable imports of another module's domain.

**Location**: `src/modules/*/secondary-adapters/adapters/` · **Deep-dive**: [INTEGRATION-PATTERNS.md](integration/INTEGRATION-PATTERNS.md), [ARCHITECTURE.md](architecture/ARCHITECTURE.md)

### Modular Monolith

All eleven modules (Analytics, Authentication, Authorization, Carts, Health, Identity, Inventory, Notifications, Orders, Payments, Products) ship as one deployable unit with strict isolation. Extraction to services later should not require rewriting domain logic.

**Location**: `src/modules/`

### Result Pattern

`Result<T, E>` replaces exception-driven control flow in domain and application layers. Use cases return success or typed failure. A global `ResultInterceptor` maps results to HTTP responses.

**Location**: `src/shared-kernel/domain/`

### CQRS Read Path

List and detail reads use query ports and flat read DTOs. TypeORM adapters under `secondary-adapters/query/` resolve related fields (for example customer names and SKUs) in a single SQL query instead of N+1 round trips. Coverage spans Orders, Inventory, Payments, Products, Carts, Identity, Notifications, and Analytics (query-only composition).

**Location**: `src/modules/*/core/application/queries/`, `src/modules/*/secondary-adapters/query/` · **Deep-dive**: [CQRS.md](architecture/CQRS.md)

---

<a id="distributed-systems"></a>

## Distributed Systems

### SAGA Orchestration with Compensation

Checkout is a multi-step SAGA: **Validate → Reserve Stock → Process Payment → Confirm Order**. On failure, `CheckoutFailureListener` runs compensation: release stock, refund if needed, cancel the order.

**Location**: `src/modules/orders/primary-adapters/jobs/` · **Deep-dive**: [INTEGRATION-PATTERNS.md](integration/INTEGRATION-PATTERNS.md)

### Idempotency (Redis-Backed)

`@Idempotent()` with a Redis store protects the HTTP checkout command so retries do not create duplicate side effects. Keys are namespaced by authenticated `userId` + method + route. Clients may send `Idempotency-Key` or `x-idempotency-key` (body `idempotencyKey` as fallback). The interceptor replays completed responses, returns 409 + `Retry-After` while in progress, and **fails closed** with HTTP 503 if Redis is unavailable. It does **not** cover the BullMQ worker or SAGA compensation chain.

**Location**: `src/infrastructure/idempotency/`, `src/infrastructure/decorators/`, `src/infrastructure/interceptors/`

### BullMQ Nested Flows

Background job processing with nested flow orchestration. Notifications use `FlowProducer` for ordered save → send → update pipelines.

**Location**: `src/modules/notifications/`, `src/infrastructure/queue/`

### Payment Gateway (Mock Adapter)

Payments use a gateway **port** and strategy resolver. The Stripe adapter is a **mock** used for local and CI checkout proofs. A live Stripe SDK and production webhook signature verification are not wired yet. The architecture is ready for a real provider when you add one.

- **Flow**: SAGA Validate Cart → Reserve Stock → Process Payment (gateway) → Confirm Order
- **Webhooks**: Handler and job path exist; signature verification is stubbed for testing

**Location**: `src/modules/payments/`, `src/modules/orders/`

---

<a id="data-performance"></a>

## Data and Performance

### Redis Stack (RedisJSON + RedisSearch)

- **RedisJSON**: Shopping carts as JSON documents.
- **RedisSearch**: Catalog search and filters from Redis.

**Location**: `src/infrastructure/redis/`, `src/modules/products/secondary-adapters/`, `src/modules/carts/secondary-adapters/`

### Decorator-Based Cache-Aside

`CachedRepository` wraps PostgreSQL repositories with Redis cache-aside. The domain layer does not know about caching.

**Location**: `src/modules/*/secondary-adapters/repositories/cached-*/`

### Optimistic and Pessimistic Concurrency

Versioned aggregates use `@VersionColumn` with HTTP 409 on conflict. Inventory reservations use `SELECT FOR UPDATE`. See ADRs 0004 and 0005.

**Location**: `src/modules/*/`, [ADR-0004](architecture/adr/ADR-0004-inventory-integrity-and-concurrency.md), [ADR-0005](architecture/adr/ADR-0005-typed-atomic-occ-update-contract.md)

### TypeORM + PostgreSQL

Relational persistence with TypeORM and migration CLI scripts for all environments. Entity schemas map to the domain model.

**Location**: `src/infrastructure/database/`, `data-source.ts`

---

<a id="security"></a>

## Security

### RSA JWT Authentication (RS256 + JWKS)

JWT authentication with RSA RS256 and a `GET /authentication/.well-known/jwks.json` endpoint. Key ID (`kid`) uses RFC 7638 SHA-256 thumbprint.

**Location**: `src/infrastructure/jwt/` · **Deep-dive**: [JWT-RSA-JWKS.md](security/JWT-RSA-JWKS.md)

### Refresh Token Rotation

Session refresh tokens in PostgreSQL with SHA-256 hashing: rotation, single-session logout, and logout-all. Tokens travel via HttpOnly cookies.

**Location**: `src/modules/authentication/core/domain/entities/`, `src/modules/authentication/secondary-adapters/`

### Helmet Security Headers

Security headers via `helmet` (X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, and others).

**Location**: `src/main.ts`

### CORS with Environment Whitelist

CORS origins come from `.env` files. No wildcard `*` in production.

**Location**: `src/main.ts`, `src/config/`

### XSS Input Sanitization

A global interceptor sanitizes request bodies with `sanitize-html` before they reach the domain layer.

**Location**: `src/interceptors/`

### Input Validation and Pagination Safety

DTOs use `class-validator`. Pagination query DTOs enforce `@Max(100)`.

**Location**: `src/modules/*/primary-adapters/dtos/`

### RBAC with Normalized Permissions

Normalized Role-Based Access Control with `@RequirePermissions()` and `PermissionsGuard`. Roles and permissions seed on boot.

**Location**: `src/modules/authorization/`

### Forced Credential Rotation (mustChangePassword)

Seeded and bootstrap credentials set `mustChangePassword = true`. Login and refresh return the flag; `POST /v1/authentication/change-password` clears it, revokes other sessions, and reissues tokens. `MustChangePasswordGuard` returns HTTP 403 (`MUST_CHANGE_PASSWORD`) on other authenticated routes until rotation.

The access token carries a `mustChangePassword` claim, but only when the flag is set. Clean tokens omit it, so the guard short-circuits without a database read on virtually all traffic; a token that does carry the claim is still checked against `credentials` so the gate can never outlive the flag.

**Location**: `src/modules/authentication/`, `src/guards/must-change-password.guard.ts`, `docs/security/ADMIN-BOOTSTRAP.md`

### Rate Limiting and Throttling

`@nestjs/throttler` backed by Redis, with **user-scoped** limiting via `UserThrottlerGuard` (authenticated user id) or IP for anonymous requests. A single global `default` profile (`THROTTLE_GLOBAL_LIMIT` / 60s) applies to all routes; auth credential routes tighten that profile via `@Throttle` (`throttle.constants.ts`). Do not register a second named profile in `forRoot`: Nest would apply it to every route.

**Location**: `src/infrastructure/throttler/`

---

<a id="infrastructure"></a>

## Infrastructure

### Multi-Stage Docker Build

Four-stage Dockerfile (`deps` → `build` → `prod-deps` → `production`) on Node.js 24 Alpine. Uses `tini` as PID 1, runs as non-root `appuser`, and runs migrations via `docker-entrypoint.sh`.

**Location**: `Dockerfile`, `docker-entrypoint.sh`, `docker-compose.prod.yml`

### Graceful Shutdown

`SIGTERM`/`SIGINT` handling: drain HTTP, stop BullMQ workers, close Redis and WebSocket adapters through NestJS lifecycle hooks and `tini`. See [PROCESS-LIFECYCLE.md](infrastructure/PROCESS-LIFECYCLE.md).

**Location**: `src/infrastructure/shutdown/`, `src/main.ts`

### Health Checks

- `GET /health`: PostgreSQL, Redis, and WebSocket indicators
- `GET /health/liveness`: process health (`ProcessHealthIndicator`)
- `GET /health/readiness`: PostgreSQL required (Redis degradation is reported on `/health` and metrics)

**Location**: `src/modules/health/`

### Backup, Restore, and Smoke

Ops scripts: `db:backup`, `db:restore`, `db:restore:drill`, `smoke-test`. Runbook: [RELEASE-BACKUP-RECOVERY.md](infrastructure/RELEASE-BACKUP-RECOVERY.md).

### Multi-Environment Configuration

Four profiles (development, staging, production, test) with typed env validation. Secrets stay separate from config. See [SECRETS-MANAGEMENT.md](security/SECRETS-MANAGEMENT.md).

**Location**: `src/config/`, `.env.example`, `.secrets.example`

---

<a id="observability"></a>

## Observability

### Structured JSON Logging (Winston)

Winston JSON for aggregators; human-readable console in development. PII redaction in structured logs.

**Location**: `src/infrastructure/logging/`

### Correlation ID Propagation

`X-Request-Id` on HTTP and BullMQ jobs so async work stays linked to the originating request.

**Location**: `src/infrastructure/logging/`, `src/infrastructure/jobs/`

### Prometheus and Tracing

`GET /metrics` (RED + domain counters). OpenTelemetry OTLP gRPC to Tempo. Grafana stack: [MONITORING-STACK-GUIDE.md](observability/MONITORING-STACK-GUIDE.md).

### CI/CD (GitHub Actions)

Fan-out pipeline: lint, typecheck, unit, arch, audit, build, integration, e2e, smoke, restore-drill, with a single required status aggregator. GHCR publish on `master` and semver tags. Detail: [PROJECT-PIPELINE.md](infrastructure/cicd/PROJECT-PIPELINE.md).

**Location**: `.github/workflows/`

---

<a id="testing"></a>

## Testing

### Test Suite Strategy

- **Unit**: Domain logic, use cases, services, utilities
- **Integration**: PostgreSQL Testcontainers for query adapters and write repositories (transactions, locks, cache-aside)
- **E2E**: Auth lifecycle, IDOR denial, checkout SAGA, idempotency, CQRS read shapes
- **Architecture**: Hexagonal and module boundary rules (`npm run test:arch`)
- **Coverage**: `npm run test:cov`

### Test Factories and Typed Mocks

Each module has `testing/` with factories and typed mocks for gateways and repositories.

**Location**: `src/modules/*/testing/`

---

<a id="database-seeding"></a>

## Database Seeding

### Mock Catalog and Test Accounts

`npm run db:seed` loads local accounts and a catalog. Blocked when `NODE_ENV=production`. Idempotent on reruns.

- **Admin**: `admin@store.local` / `Admin123!`
- **Customer**: `customer@store.local` / `Customer123!`
- **Catalog**: 15 products across categories with varied stock levels

**Location**: `scripts/seed.ts`, module seed use cases · **Deep-dive**: [SEEDING.md](development/SEEDING.md)

---

<a id="available-scripts"></a>

## Available Scripts

### Development

| Script                | Description              |
| :-------------------- | :----------------------- |
| `npm run start:dev`   | Start in watch mode      |
| `npm run start:debug` | Start with debugging     |
| `npm run build`       | Build for production     |
| `npm run lint`        | Run ESLint with auto-fix |

### Testing

| Script                     | Description                   |
| :------------------------- | :---------------------------- |
| `npm test`                 | Unit tests                    |
| `npm run test:watch`       | Watch mode                    |
| `npm run test:cov`         | Coverage                      |
| `npm run test:integration` | Real DB / Redis integration   |
| `npm run test:e2e`         | End-to-end HTTP flows         |
| `npm run test:arch`        | Architecture boundary rules   |
| `npm run test:redis:chaos` | Redis reconnect / degradation |
| `npm run smoke-test`       | Live-process smoke probes     |
| `npm run test:ci`          | CI mode                       |

### Database Migrations

| Script                           | Description                            |
| :------------------------------- | :------------------------------------- |
| `npm run migration:generate:dev` | Generate migration from entity changes |
| `npm run migration:create:dev`   | Create empty migration                 |
| `npm run migration:run:dev`      | Run pending migrations                 |
| `npm run migration:revert:dev`   | Revert last migration                  |
| `npm run migration:show:dev`     | Show migration status                  |

> Replace `:dev` with `:prod`, `:staging`, or `:test` for other environments.

### Docker and Ops

| Script                     | Description                       |
| :------------------------- | :-------------------------------- |
| `npm run d:up:dev`         | Start Postgres + Redis            |
| `npm run d:down:dev`       | Stop infrastructure               |
| `npm run d:reset:dev`      | Reset infrastructure (wipes data) |
| `npm run d:build:image`    | Build production Docker image     |
| `npm run d:up:full:prod`   | Start full production stack       |
| `npm run db:backup`        | PostgreSQL backup                 |
| `npm run db:restore`       | PostgreSQL restore                |
| `npm run db:restore:drill` | Backup then restore drill         |

### Utilities

| Script             | Description                |
| :----------------- | :------------------------- |
| `npm run db:seed`  | Seed development database  |
| `npm run env:init` | Generate environment files |
| `npm run clean`    | Remove build artifacts     |
