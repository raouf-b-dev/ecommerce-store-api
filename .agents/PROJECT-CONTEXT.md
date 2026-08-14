# Project Context Accelerator

> **Purpose:** Read this file first for fast orientation. It gives you a high-level summary of `ecommerce-store-api` without needing to read multiple verbose files or execute directory listings. Keep it updated as the architecture evolves.
>
> **This file does NOT replace canonical references.** For any generation or refactor work, you **must** still load and apply [`docs/ai/CONVENTIONS.md`](../docs/ai/CONVENTIONS.md) (layer rules, mappers, jobs, testing, docs). For architecture constraints, read [`docs/architecture/DDD-HEXAGONAL.md`](../docs/architecture/DDD-HEXAGONAL.md). This file is a fast-start companion, not a substitute.

## Tech Stack

- **Framework**: NestJS 11
- **Language**: TypeScript (Strict mode)
- **Database**: PostgreSQL (via TypeORM)
- **Caching & Search**: Redis Stack (RedisJSON + RedisSearch)
- **Background Jobs**: BullMQ
- **Real-Time**: Socket.io with Redis adapter
- **Architecture**: Domain-Driven Design (DDD) + Hexagonal Architecture (Ports & Adapters) + Modular Monolith

## System Architecture

The application is a Modular Monolith split into 10 strictly isolated **Bounded Contexts** (Modules) under `src/modules/`. Modules communicate _only_ via ACL Gateways and Domain Events.

### IDOR Prevention & Access Control Subsystem (`src/shared-kernel/domain/policies/`)

- **`CallerContext`**: Unified domain representation of execution caller (`userId`, `role`, `permissions: ReadonlySet<string>`, `kind: 'user' | 'system'`).
- **`SYSTEM_CALLER_CONTEXT`**: Immutable system caller context (`kind: 'system'`) reserved for background jobs, ACL gateways, and internal processes. Bypasses user ownership checks cleanly.
- **`OwnedResourceAccessPolicy`**: Centralized domain policy evaluating resource ownership and fine-grained permissions:
  - `canViewResource()`: Validates `viewAll` or (`viewOwn` + resource ownership match).
  - `canMutateResource()`: Validates `manageAll` or (`manageOwn` + resource ownership match).
  - `resolveListScope()`: Automatic list query scoping returning allowed state and target `userId` constraint.
- **`CartOwnershipValidator`**: Domain validator ensuring cart access and checkout operations are strictly scoped to the authenticated user account.
- **Primary Adapter Integration**: `@CallerCtx()` parameter decorator extracts verified JWT user payload and resolved role permissions into `UserCallerContext`. `@RequirePermissions()` metadata paired with `PermissionsGuard` enforces route-level RBAC.

### Module Inventory & Key Entities

1. **Identity** (`user`, `address`): Manages user profiles, contact details, address management, and customer account scoping.
2. **Authentication** (`credential`, `session-token`): Handles RSA RS256 JWT authentication, refresh token rotation with reuse detection, and session tracking.
3. **Authorization** (`role`, `permission`, `role-permission`, `user-role-assignment`): Manages roles, fine-grained permissions, and user role assignments (RBAC).
4. **Carts** (`cart`, `cart-item`): Shopping carts stored in RedisJSON with ownership validation (`CartOwnershipValidator`).
5. **Health**: System health checks (PostgreSQL + Redis connectivity, liveness/readiness probes).
6. **Inventory** (`stock-level`, `reservation`): Product stock levels and concurrent reservations with pessimistic row locking (`SELECT ... FOR UPDATE`).
7. **Notifications** (`notification`, `template`): Event-driven email/SMS orchestration via BullMQ flow producers.
8. **Orders** (`order`, `order-item`, `payment-details`): Core Domain. Orchestrates the checkout SAGA with `CheckoutFailureListener` compensation (stock release, refund, order cancellation).
9. **Payments** (`payment-intent`, `transaction`): Handles payment processing and gateway abstractions.
10. **Products** (`product`, `category`): Manages product catalog with RedisSearch fast querying and category hierarchies.

### Infrastructure & Core Components (`src/infrastructure/` & `src/shared-kernel/`)

- **Database**: TypeORM configuration, DataSource CLI setup, and migrations.
- **Redis**: Centralized Redis client for cache, rate limiting, and BullMQ.
- **Queue**: BullMQ setup, flow producer, and global job handlers.
- **Idempotency**: `@Idempotent()` decorator + interceptor backed by Redis for checkout and payment protection.
- **Throttler**: `@nestjs/throttler` setup backed by Redis.
- **Shutdown**: Graceful shutdown hook handlers draining HTTP traffic and closing DB/Redis pools on `SIGTERM`.
- **Logging**: Winston logger configured for JSON output with correlation ID propagation (`X-Request-Id`).
- **Metrics**: Prometheus metrics via `prom-client` (`GET /metrics`) — HTTP auto-instrumentation, domain counters, infrastructure gauges.
- **Tracing**: OpenTelemetry auto-instrumentation with OTLP gRPC export to Tempo.
- **Events**: `DomainEventPublisher` interface (shared-kernel) backed by `EventEmitter2DomainEventPublisher` adapter.
- **Testing Helpers**: `src/testing/helpers/` (`auth-payload.factory.ts`, `database-test.helper.ts`, `e2e-test-app.ts`, `result-assertion.helper.ts`).

## Key Implementation Patterns

- **Gateways (ACL)**: `Orders` needs user info? It calls `UserGateway` (in its `core/application/ports`), implemented by `ModuleUserGateway` (in `secondary-adapters/adapters`), calling `Identity`. System operations pass `SYSTEM_CALLER_CONTEXT`. No direct entity/repo imports across modules.
- **IDOR & Authorization Control**: Controllers extract `@CallerCtx()` and pass `callerContext` to application use cases. Use cases query `OwnedResourceAccessPolicy` to verify ownership or call `resolveListScope()` to filter lists by owner.
- **Result Pattern**: We never `throw` errors in domain or application layers. Use `Result<T, E>` and `ErrorFactory`. Global `ResultInterceptor` maps it to HTTP responses.
- **Mappers**: Domain ↔ ORM uses `CreateFromEntity<TEntity>` and `toPrimitives()`. OCC QueryBuilder updates use `UpdateFromEntity` + `toUpdatePayload()`; `version` / `updatedAt` are persistence-owned and stamped in SQL.
- **Jobs**: Kebab-case naming. Implement `BaseJobHandler`. Schedulers trigger jobs; job handlers execute them with `SYSTEM_CALLER_CONTEXT`. Primary adapters must never contain business logic directly.
- **Domain Events**: Use cases emit domain events via `DomainEventPublisher` (injected port). Primary adapters (controllers, jobs, listeners) must never emit events directly.

## Quick File Locator

- `package.json` -> Root
- `data-source.ts` -> TypeORM CLI configuration
- `src/main.ts` -> App bootstrap & graceful shutdown hooks
- `src/config/` -> Environment schema and validation (envalid)
- `src/shared-kernel/` -> Base classes (`Result`, `UseCase`, `AggregateRoot`, `CallerContext`, `OwnedResourceAccessPolicy`)
- `src/testing/helpers/` -> Security payload and command test factories (`auth-payload.factory.ts`)
- `.agents/skills/` -> Available agent skills
- `docs/` -> Comprehensive technical reference guides

## Feature Status Checklist

- ✅ JWT Auth + Refresh Tokens (RS256 + Refresh Rotation)
- ✅ RBAC (Normalized, Role & Permission matrices)
- ✅ IDOR Prevention & Resource Access Control (`CallerContext`, `OwnedResourceAccessPolicy`, `CartOwnershipValidator`, `@CallerCtx()`)
- ✅ Customer Scoped Permissions (`view_own_orders`, `view_own_payments`, `manage_own_cart`, `view_own_profile`)
- ✅ Admin CLI Seeder (`npm run seed:admin`)
- ✅ Local DB Seeder (`npm run db:seed`)
- ✅ Forced Credential Rotation (`mustChangePassword`)
- ✅ Rate Limiting (Redis Throttler)
- ✅ Shopping Carts (RedisJSON)
- ✅ Checkout SAGA with Compensation (`CheckoutFailureListener`)
- ✅ Pessimistic Stock Reservation (`SELECT ... FOR UPDATE`)
- ✅ Idempotency (`@Idempotent()` Redis Interceptor)
- ✅ API Versioning (URI-based, NestJS `VersioningType.URI`)
- ✅ Prometheus Metrics (`GET /metrics`, API-key protected)
- ✅ OpenTelemetry Distributed Tracing (OTLP gRPC → Tempo)
- ✅ Grafana Monitoring Stack (Loki, Tempo, Dashboards)
- ✅ Domain Event Bus (`DomainEventPublisher` + EventEmitter2)
- ✅ Persistent Notifications (BullMQ)
- ❌ Multi-Tenancy (Planned)
- ❌ User-Level Permission Overrides (Planned)
- ❌ Outbound Webhook Framework (Planned)
- ❌ Production Stripe SDK Integration (Mock active)
