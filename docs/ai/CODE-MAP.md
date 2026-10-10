# Code Map

Where things live. Load it when you need to locate code; verify with `rg` because layout drifts. Update it when a module, gateway, or infrastructure component is added or removed.

## Modules (`src/modules/`)

Write-side contexts talk through ACL gateways and domain events. Analytics is query-only (SQL projections). Health is probes only.

- `identity`: users, addresses, customer profile.
- `authentication`: RS256 JWT, refresh rotation with reuse detection, sessions.
- `authorization`: roles, permissions, assignments (RBAC). Permission codes: `core/domain/reference-data/permission-definitions.ts`; system roles: `system-roles.ts`.
- `carts`: carts in RedisJSON, `CartOwnershipValidator`.
- `products`: catalog, categories, RedisSearch queries.
- `inventory`: stock levels, reservations, pessimistic row locks, reconciliation job.
- `orders`: core domain. Checkout saga with `CheckoutFailureListener` compensation (stock release, refund, cancel).
- `payments`: payment intents, transactions, `PaymentProvider` port with `FakeStripeGateway` adapter.
- `notifications`: email and SMS orchestration through BullMQ flows.
- `analytics`: `/v1/admin/analytics/*` reports. See [ANALYTICS.md](../architecture/domains/ANALYTICS.md).
- `health`: liveness, readiness, Postgres and Redis checks.

Each module follows `core/{domain,application}`, `primary-adapters`, `secondary-adapters`, `testing`, plus `<m>.module.ts`, `<m>.controller.ts`, `<m>.token.ts`.

## Access control and shared code

- `src/shared-kernel/domain/interfaces/caller-context.interface.ts`: `CallerContext` (`userId`, `role`, `permissions`, `kind: 'user' | 'system'`), `SYSTEM_CALLER_CONTEXT` (jobs, gateways, internal calls), `createUserCallerContext`.
- `src/shared-kernel/domain/policies/owned-resource-access.policy.ts`: `OwnedResourceAccessPolicy` (`canViewResource`, `canMutateResource`, `resolveListScope`, `resolveResourceScope`). Carts use `CartOwnershipValidator` (`modules/carts/core/application/services`).
- Controllers: `@CallerCtx()` supplies the context; `@RequirePermissions()` plus `PermissionsGuard` enforce RBAC.
- `src/shared-kernel/domain/`: `result.ts` (`Result`, `isFailure`), `interfaces/base.usecase.ts` (`UseCase`), `exceptions/` (error classes, `ErrorFactory`). `src/shared-kernel/infra/lang/error.utils.ts`.
- `src/infrastructure/`: `database`, `redis`, `queue`, `jobs` (`job-names.ts`, `job-retry-policies.ts`, `BaseJobHandler`), `idempotency` and `decorators/idempotent.decorator.ts` (`@Idempotent()`), `throttler`, `events` (`DomainEventPublisher` over EventEmitter2), `logging` (Winston, `X-Request-Id`), `metrics` (`/metrics`), `tracing` (OpenTelemetry), `shutdown`, `websocket` (Socket.io gateway, Redis adapter), `mappers/utils`, `jwt`, `swagger`.
- `src/config/`: env schema and validation. `src/guards`, `src/filters`, `src/interceptors` (`ResultInterceptor` maps `Result` to HTTP).
- `data-source.ts`: TypeORM CLI. `src/migrations/`: migrations.

## Cross-context gateways

ACL gateways are `modules/<m>/secondary-adapters/adapters/module-<x>.gateway.ts` (orders: user, cart, payment, inventory-reservation; carts: product, inventory; authentication: identity, authorization; identity: authorization). `secondary-adapters/gateways/` holds external SDK and provider adapters: `notifications` websocket and `payments` `FakeStripeGateway`. Ports are in `core/application/ports` (including `PaymentProvider`).

## Tests

- Unit specs are co-located. Per-module factories and mocks: `src/modules/<m>/testing`. Shared helpers and mocks: `src/testing` (`helpers`, `mocks`, `factories`, `fixtures`).
- `test/architecture` (boundary rules), `test/integration` (real services), `test/e2e` (full HTTP app).

## Project state

Feature list: `docs/FEATURES.md`. Plan and history: `docs/ROADMAP.md`, `docs/ROADMAP-CHANGELOG.md`. Search them with `rg`; do not load them whole.
