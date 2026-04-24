# 📚 Feature Documentation

> Detailed reference for every feature implemented in the E-Commerce Store API.
> For a quick overview, see the [Feature Catalog](../README.md#feature-catalog) in the README.

## 📋 Table of Contents

- [🏗️ Architecture](#architecture)
- [🔄 Distributed Systems](#distributed-systems)
- [⚡ Data & Performance](#data-performance)
- [🔐 Security](#security)
- [📦 Infrastructure](#infrastructure)
- [🔭 Observability](#observability)
- [🧪 Testing](#testing)
- [📜 Available Scripts](#available-scripts)

---

<a id="architecture"></a>

## 🏗️ Architecture

### Domain-Driven Design (Strategic)

The system is decomposed into explicit **Subdomains** (Core, Generic, Supporting) and **Bounded Contexts** that map directly to NestJS modules. Each context owns its domain model, repositories, and use cases — zero shared mutable state.

**Location**: `src/modules/` · **Deep-dive**: [ARCHITECTURE.md](ARCHITECTURE.md)

### Domain-Driven Design (Tactical)

Every module follows tactical DDD patterns: **Entities**, **Value Objects**, **Aggregates**, **Domain Services**, and **Repository Ports**. Domain objects enforce their own invariants — no anaemic models.

**Location**: `src/modules/*/core/domain/` · **Deep-dive**: [DDD-HEXAGONAL.md](DDD-HEXAGONAL.md)

### Hexagonal Architecture (Ports & Adapters)

The core domain has zero dependency on infrastructure. All external concerns (database, cache, queues) are behind **Port** interfaces implemented by **Adapters**. Swapping PostgreSQL for another store means writing a new adapter — the domain doesn't change.

**Location**: `src/modules/*/secondary-adapters/` · **Deep-dive**: [DDD-HEXAGONAL.md](DDD-HEXAGONAL.md)

### ACL Gateway Pattern

8 bounded contexts communicate through **7 Gateway ports**. Zero cross-module executable imports. Each module defines its own interface for what it needs from other modules, preventing domain model leakage.

**Location**: `src/modules/orders/secondary-adapters/gateways/` · **Deep-dive**: [INTEGRATION-PATTERNS.md](INTEGRATION-PATTERNS.md)

### Modular Monolith

All 9 modules (Auth, Carts, Customers, Health, Inventory, Notifications, Orders, Payments, Products) live in one deployable unit but are strictly isolated. Designed for future microservice extraction without refactoring domain logic.

**Location**: `src/modules/`

### Result Pattern

A functional `Result<T, E>` type replaces exception-driven control flow across all layers. Use cases return success or typed failure — never throw. A global `ResultInterceptor` maps results to HTTP responses.

**Location**: `src/shared-kernel/domain/`

---

<a id="distributed-systems"></a>

## 🔄 Distributed Systems

### SAGA Orchestration with Compensation

The checkout flow is a multi-step SAGA: **Validate → Reserve Stock → Process Payment → Confirm Order**. If any step fails, a `CheckoutFailureListener` automatically triggers compensation — releasing stock, issuing refunds, and cancelling the order.

**Location**: `src/modules/orders/primary-adapters/jobs/` · **Deep-dive**: [INTEGRATION-PATTERNS.md](INTEGRATION-PATTERNS.md)

### Idempotency (Redis-Backed)

A custom `@Idempotent()` decorator with a Redis-backed distributed lock ensures critical operations (like checkout) execute **exactly once**, even under network retries. The interceptor stores results and replays them for duplicate requests.

**Location**: `src/infrastructure/idempotency/`, `src/infrastructure/decorators/`, `src/infrastructure/interceptors/`

### BullMQ Nested Flows

Background job processing using BullMQ with nested flow orchestration. The Notifications module uses `FlowProducer` to compose complex multi-step notification delivery pipelines.

**Location**: `src/modules/notifications/`, `src/infrastructure/queue/`

### Hybrid Payment Orchestration (COD + Online)

A unified **Strategy Pattern** handles both payment types through the same checkout flow:

- **Online**: Full SAGA (Validate → Reserve → Pay → Confirm)
- **COD**: Async Pause (Validate → Reserve → **Stop & Wait** → Manual Confirm)

**Location**: `src/modules/payments/`, `src/modules/orders/`

---

<a id="data-performance"></a>

## ⚡ Data & Performance

### Redis Stack (RedisJSON + RedisSearch)

- **RedisJSON**: Stores Shopping carts as native JSON documents — no SQL joins for frequently accessed data.
- **RedisSearch**: Full-text search and advanced filtering on products directly from Redis, replacing slow SQL `LIKE` queries.

**Location**: `src/infrastructure/redis/`, `src/modules/products/secondary-adapters/`, `src/modules/carts/secondary-adapters/`

### Decorator-Based Cache-Aside

A `CachedRepository` decorator pattern wraps PostgreSQL repositories with Redis cache-aside. Cache invalidation is handled transparently — the domain layer is unaware of caching.

**Location**: `src/modules/*/secondary-adapters/repositories/cached-*/`

### TypeORM + PostgreSQL

Relational persistence with TypeORM, including automated migration CLI scripts for all environments (dev, staging, prod, test). Entity schemas map cleanly to the domain model.

**Location**: `src/infrastructure/database/`, `data-source.ts`

---

<a id="security"></a>

## 🔐 Security

### RSA JWT Authentication (RS256 + JWKS)

Production-grade JWT authentication using RSA RS256 (replacing HMAC). Includes a `GET /auth/.well-known/jwks.json` endpoint for public key distribution. Key ID (`kid`) uses RFC 7638 SHA-256 thumbprint.

**Location**: `src/infrastructure/jwt/` · **Deep-dive**: [JWT-RSA-JWKS.md](JWT-RSA-JWKS.md)

### Refresh Token Rotation

Session-based refresh tokens stored in PostgreSQL with SHA-256 hashing. Supports: token rotation (old token invalidated on use), single-session logout, and all-session logout. Refresh tokens are transported via HttpOnly cookies.

**Location**: `src/modules/auth/core/domain/entities/`, `src/modules/auth/secondary-adapters/`

### Helmet Security Headers

Standard security headers applied via `helmet` middleware (X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, etc.).

**Location**: `src/main.ts`

### CORS with Environment Whitelist

CORS origins are configured per-environment via `.env` files. No wildcard `*` in production.

**Location**: `src/main.ts`, `src/config/`

### XSS Input Sanitization

A global interceptor sanitizes all incoming request bodies using `sanitize-html`, stripping malicious HTML/script tags before they reach the domain layer.

**Location**: `src/interceptors/`

### Input Validation & Pagination Safety

All DTOs use `class-validator` decorators for type-safe input validation. Pagination query DTOs enforce `@Max(100)` to prevent resource exhaustion.

**Location**: `src/modules/*/primary-adapters/dtos/`

---

<a id="infrastructure"></a>

## 📦 Infrastructure

### Multi-Stage Docker Build

A 4-stage Dockerfile (`deps` → `build` → `prod-deps` → `production`) produces a minimal Node.js 24 Alpine image (~495MB). Uses `tini` as PID 1, runs as non-root `appuser`, and includes automatic migration execution via `docker-entrypoint.sh`.

**Location**: `Dockerfile`, `docker-entrypoint.sh`, `docker-compose.prod.yml`

### Graceful Shutdown

Full lifecycle shutdown handling: `SIGTERM`/`SIGINT` signal capture, HTTP connection draining, BullMQ worker cleanup, Redis connection closure, and WebSocket adapter teardown — all orchestrated through NestJS lifecycle hooks with `tini` for proper signal forwarding in Docker. See → [PROCESS-LIFECYCLE.md](PROCESS-LIFECYCLE.md)

**Location**: `src/infrastructure/shutdown/`, `src/main.ts`

### Health Checks

Production health endpoint (`GET /health`) using @nestjs/terminus to monitor PostgreSQL and Redis connectivity. Docker-native healthcheck configured for container orchestration readiness.

**Location**: `src/modules/health/`

### Multi-Environment Configuration

4 environment profiles (development, staging, production, test) with type-safe configuration validation using `class-validator`. Secrets managed separately from config — see [SECRETS-MANAGEMENT.md](SECRETS-MANAGEMENT.md).

**Location**: `src/config/`, `.env.example`, `.secrets.example`

---

<a id="observability"></a>

## 🔭 Observability

### Structured JSON Logging (Winston)

Production-grade structured logging with Winston. JSON output format for log aggregators, with human-readable console transport for development.

**Location**: `src/infrastructure/logging/`

### Correlation ID Propagation

A middleware injects/reads `X-Request-Id` headers and propagates the correlation ID through the entire request lifecycle — including all 18 BullMQ job handlers and schedulers. Enables end-to-end request tracing across synchronous and asynchronous flows.

**Location**: `src/infrastructure/logging/`, `src/infrastructure/jobs/`

### CI/CD (GitHub Actions)

Automated pipeline: lint → build → test (with coverage) → publish. Environment secrets injected at CI time for RSA key generation.

**Location**: `.github/workflows/`

---

<a id="testing"></a>

## 🧪 Testing

### Test Suite Strategy

Comprehensive test infrastructure across all layers:

- **Unit Tests**: Domain logic, use cases, services, and utilities
- **Integration Tests**: Database interactions and Redis caching
- **E2E Tests**: Complete API endpoint testing scaffolding
- **Coverage**: Detailed metrics via `npm run test:cov`

### Test Factories & Typed Mocks

Each module has its own `testing/` directory with:

- **Factories**: Generate domain objects for specific scenarios (e.g., `OrderTestFactory.createCashOnDeliveryOrder()`)
- **Typed Mocks**: Implement real repository interfaces with helper methods for common test setups

**Location**: `src/modules/*/testing/`

---

<a id="available-scripts"></a>

## 📜 Available Scripts

### Development

| Script                | Description              |
| :-------------------- | :----------------------- |
| `npm run start:dev`   | Start in watch mode      |
| `npm run start:debug` | Start with debugging     |
| `npm run build`       | Build for production     |
| `npm run lint`        | Run ESLint with auto-fix |

### Testing

| Script               | Description              |
| :------------------- | :----------------------- |
| `npm test`           | Run unit tests           |
| `npm run test:watch` | Run tests in watch mode  |
| `npm run test:cov`   | Generate coverage report |
| `npm run test:e2e`   | Run end-to-end tests     |
| `npm run test:ci`    | CI mode (GitHub Actions) |

### Database Migrations

| Script                           | Description                            |
| :------------------------------- | :------------------------------------- |
| `npm run migration:generate:dev` | Generate migration from entity changes |
| `npm run migration:create:dev`   | Create empty migration                 |
| `npm run migration:run:dev`      | Run pending migrations                 |
| `npm run migration:revert:dev`   | Revert last migration                  |
| `npm run migration:show:dev`     | Show migration status                  |

> Replace `:dev` with `:prod`, `:staging`, or `:test` for different environments.

### Docker

| Script                     | Description                             |
| :------------------------- | :-------------------------------------- |
| `npm run d:up:dev`         | Start infrastructure (Postgres + Redis) |
| `npm run d:down:dev`       | Stop infrastructure                     |
| `npm run d:reset:dev`      | Reset infrastructure (⚠️ wipes data)    |
| `npm run d:build:image`    | Build production Docker image           |
| `npm run d:up:full:prod`   | Start full production stack             |
| `npm run d:down:full:prod` | Stop full production stack              |

### Utilities

| Script             | Description                    |
| :----------------- | :----------------------------- |
| `npm run env:init` | Generate all environment files |
| `npm run clean`    | Remove build artifacts         |
