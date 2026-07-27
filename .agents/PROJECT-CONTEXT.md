# Project Context Accelerator

> **Purpose:** Read this file first for fast orientation. It gives you a high-level summary of the `ecommerce-store-api` without needing to read multiple verbose files or execute directory listings. Keep it updated as the architecture evolves.
>
> **This file does NOT replace canonical references.** For any generation or refactor work, you **must** still load and apply [`docs/ai/CONVENTIONS.md`](../docs/ai/CONVENTIONS.md) (layer rules, mappers, jobs, testing, docs). For architecture constraints, read [`docs/architecture/DDD-HEXAGONAL.md`](../docs/architecture/DDD-HEXAGONAL.md). This file is a fast-start companion, not a substitute.

## Tech Stack

- **Framework**: NestJS 11
- **Language**: TypeScript (Strict mode)
- **Database**: PostgreSQL (via TypeORM)
- **Caching & Search**: Redis Stack (RedisJSON + RedisSearch)
- **Background Jobs**: BullMQ
- **Architecture**: Domain-Driven Design (DDD) + Hexagonal Architecture (Ports & Adapters) + Modular Monolith

## System Architecture

The application is a Modular Monolith split into 10 strictly isolated **Bounded Contexts** (Modules) under `src/modules/`. Modules communicate _only_ via ACL Gateways.

### Module Inventory & Key Entities

1. **Identity** (`user`, `address`): Manages user profiles, contact details, and addresses.
2. **Authentication** (`credential`, `session-token`): Handles JWT authentication, credential verification, token signing/verification, and refresh token sessions.
3. **Authorization** (`role`, `permission`, `role-permission`, `user-role-assignment`): Manages roles, permissions, and user role assignments (RBAC).
4. **Carts** (`cart`, `cart-item`): Manages shopping carts (stored in RedisJSON).
5. **Health**: System health checks.
6. **Inventory** (`stock-level`, `reservation`): Manages product stock and concurrent reservations.
7. **Notifications** (`notification`, `template`): Orchestrates email/SMS delivery via BullMQ flow producers.
8. **Orders** (`order`, `order-item`, `payment-details`): The core domain. Orchestrates the checkout SAGA.
9. **Payments** (`payment-intent`, `transaction`): Handles payment gateway integrations.
10. **Products** (`product`, `category`): Manages product catalog (uses RedisSearch for fast queries).

### Infrastructure Components (`src/infrastructure/`)

- **Database**: TypeORM configuration and migrations.
- **Redis**: Centralized Redis client for cache, rate limiting, and BullMQ.
- **Queue**: BullMQ setup and global job handlers.
- **Idempotency**: `@Idempotent()` decorator + interceptor for exactly-once execution.
- **Throttler**: `@nestjs/throttler` setup backed by Redis.
- **Shutdown**: Graceful shutdown hook handlers.
- **Logging**: Winston logger configured for JSON output.
- **Metrics**: Prometheus metrics via `prom-client` — HTTP auto-instrumentation (middleware), business counters (domain event listeners), infrastructure gauges (DB pool, Redis, BullMQ).
- **Events**: `DomainEventPublisher` interface (shared-kernel) backed by `EventEmitter2DomainEventPublisher` adapter — enables decoupled domain event emission from use cases without infrastructure coupling.

## Key Implementation Patterns

- **Gateways (ACL)**: `Orders` needs user info? It calls `UserGateway` (in its `core/application/ports`), which is implemented by `ModuleUserGateway` (in `secondary-adapters/adapters`), which calls the `Identity` module use case. No direct entity/repo imports across modules.
- **Result Pattern**: We never `throw` errors in the domain or application layers. Use `Result<T, E>` and `ErrorFactory`. A global `ResultInterceptor` maps it to HTTP responses.
- **Mappers**: When transforming ORM entities to Domain entities (or vice versa), use `CreateFromEntity<TEntity>` and `toPrimitives()`.
- **Jobs**: Kebab-case naming. Implement `BaseJobHandler`. Schedulers (Cron) trigger jobs, they don't process them directly. Job handlers are primary adapters — they must never publish domain events or contain business logic.
- **Domain Events**: Use cases emit domain events via `DomainEventPublisher` (injected port). Primary adapters (controllers, jobs, listeners) must never emit events directly.

## Quick File Locator

- `package.json` -> Root
- `data-source.ts` -> TypeORM CLI configuration
- `src/main.ts` -> App bootstrap
- `src/config/` -> Environment schema and validation
- `src/shared-kernel/` -> Base classes (`Result`, `UseCase`, `AggregateRoot`)
- `.agents/skills/` -> Available agent skills
- `docs/` -> Comprehensive technical reference guides

## Feature Status Checklist

- ✅ JWT Auth + Refresh Tokens
- ✅ RBAC (Normalized)
- ✅ Admin CLI Seeder (`npm run seed:admin`)
- ✅ Forced Credential Rotation (`mustChangePassword`)
- ✅ Rate Limiting (Redis Throttler)
- ✅ Shopping Carts (RedisJSON)
- ✅ Checkout SAGA
- ✅ Idempotency (Redis)
- ✅ API Versioning (URI-based, NestJS `VersioningType.URI`)
- ✅ Prometheus Metrics (`GET /metrics`, API-key protected)
- ✅ Domain Event Bus (`DomainEventPublisher` + EventEmitter2)
- ✅ OpenTelemetry Distributed Tracing
- ✅ Grafana Monitoring Stack (Loki, Tempo, Dashboards)
- ✅ Event-Driven Notifications
- ✅ Local Database Seeding (`npm run db:seed`)
