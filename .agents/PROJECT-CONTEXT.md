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

The application is a Modular Monolith split into 9 strictly isolated **Bounded Contexts** (Modules) under `src/modules/`. Modules communicate _only_ via ACL Gateways.

### Module Inventory & Key Entities

1. **Auth** (`user`, `role`, `permission`): Handles JWT authentication, RBAC, and refresh tokens.
2. **Carts** (`cart`, `cart-item`): Manages shopping carts (stored in RedisJSON).
3. **Customers** (`customer`, `address`): Manages customer profiles and shipping addresses.
4. **Health**: System health checks.
5. **Inventory** (`stock-level`, `reservation`): Manages product stock and concurrent reservations.
6. **Notifications** (`notification`, `template`): Orchestrates email/SMS delivery via BullMQ flow producers.
7. **Orders** (`order`, `order-item`, `payment-details`): The core domain. Orchestrates the checkout SAGA.
8. **Payments** (`payment-intent`, `transaction`): Handles payment gateway integrations.
9. **Products** (`product`, `category`): Manages product catalog (uses RedisSearch for fast queries).

### Infrastructure Components (`src/infrastructure/`)

- **Database**: TypeORM configuration and migrations.
- **Redis**: Centralized Redis client for cache, rate limiting, and BullMQ.
- **Queue**: BullMQ setup and global job handlers.
- **Idempotency**: `@Idempotent()` decorator + interceptor for exactly-once execution.
- **Throttler**: `@nestjs/throttler` setup backed by Redis.
- **Shutdown**: Graceful shutdown hook handlers.
- **Logging**: Winston logger configured for JSON output.

## Key Implementation Patterns

- **Gateways (ACL)**: `Orders` needs customer info? It calls `CustomerGatewayPort` (in its `core/application/ports`), which is implemented by `CustomerGatewayAdapter` (in `secondary-adapters/gateways`), which calls the `Customers` module use case via HTTP or direct injection. No direct entity/repo imports across modules.
- **Result Pattern**: We never `throw` errors in the domain or application layers. Use `Result<T, E>` and `ErrorFactory`. A global `ResultInterceptor` maps it to HTTP responses.
- **Mappers**: When transforming ORM entities to Domain entities (or vice versa), use `CreateFromEntity<TEntity>` and `toPrimitives()`.
- **Jobs**: Kebab-case naming. Implement `BaseJobHandler`. Schedulers (Cron) trigger jobs, they don't process them directly.

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
- ❌ Event-Driven Notifications (Pending)
