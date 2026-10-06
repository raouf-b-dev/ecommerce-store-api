# Conventions

Rules for generating and refactoring code here. Procedures live in skills (see [AGENTS.md](../../AGENTS.md)). Section numbers are cited by ADRs and docs: do not renumber.

## 1. Layers

Paths are under `src/modules/<module>/`.

- **Domain** (`core/domain`): pure business logic. No ORM or NestJS decorators. No repository injection in domain services.
- **Application** (`core/application`): use cases orchestrate domain and ports. Depend on domain only. Emit domain events. No business rules in application services.
- **Primary adapters** (`primary-adapters`): controllers, DTOs, listeners, job handlers. Call a use case and return its result. Never inject `DomainEventPublisher` or emit events.
- **Secondary adapters** (`secondary-adapters`, `src/infrastructure`): repositories, gateways, schedulers, ORM entities, mappers. The only place external libraries are allowed.

## 2. Boundaries

1. Dependencies point inward. Core never imports infrastructure.
2. No cross-context repository or entity imports. Use ACL gateways.

## 3. ACL (cross-context)

1. Define the gateway port in `core/application/ports`; implement it in `secondary-adapters/adapters/module-<x>.gateway.ts`, calling the other module's exported use case or query service with `SYSTEM_CALLER_CONTEXT`.
2. `secondary-adapters/gateways/` is only for external SDK adapters (notifications websocket, payments Stripe), never for cross-context calls.
3. Use downstream DTOs at the port boundary.
4. A use case that mutates several contexts lives in the context that owns the workflow.

```typescript
// orders/secondary-adapters/adapters/module-user.gateway.ts (abridged: the real file maps the fields inline)
@Injectable()
export class ModuleUserGateway implements UserGateway {
  constructor(private readonly getUserUseCase: GetUserUseCase) {}

  async getUserInfo(userId: number) {
    const result = await this.getUserUseCase.execute({
      userId,
      callerContext: SYSTEM_CALLER_CONTEXT,
    });
    if (isFailure(result)) {
      return result;
    }
    return Result.success(toUserInfo(result.value)); // maps to the orders-owned CheckoutUserInfoResult
  }
}
```

`orders.module.ts` binds `{ provide: USER_GATEWAY, useClass: ModuleUserGateway }` and `{ provide: UserGateway, useExisting: USER_GATEWAY }`, and imports the identity module for `GetUserUseCase`.

## 4. Mappers (Domain to ORM)

1. Type the payload with `CreateFromEntity<TEntity>` and build it from `toPrimitives()`.
2. Create the entity with `Object.assign(new Entity(), payload)`.
3. For OCC updates use `UpdateFromEntity<TEntity, ExcludeKeys>` and `toUpdatePayload()`. `ExcludeKeys` lists what persistence owns: `id`, `version`, `@CreateDateColumn` / `@UpdateDateColumn`, and relations saved in a separate step.

Utilities: `src/infrastructure/mappers/utils/`. Full pattern: `write-repository` skill.

## 5. Notifications and real time

1. Use cases call `NotificationScheduler`, never the delivery gateway.
2. Emit websocket events through the notifications gateway: the `NotificationGateway` port (`notifications/core/domain/gateways`), implemented by `WebsocketNotificationGateway` over `src/infrastructure/websocket`.
3. Notifications for persistent or action-required events; sockets for ephemeral sync.

## 6. Jobs

1. Names are kebab-case, action first (`process-checkout`). Files: `<action>.job.ts`, `bullmq-<module>.scheduler.ts`. (Notifications still has four legacy `*.process.ts` handlers: do not copy that name.)
2. Schedulers are secondary adapters (`secondary-adapters/schedulers/`) implementing a port from `core/domain/schedulers/`.
3. Handlers are primary adapters (`primary-adapters/jobs/`) extending `BaseJobHandler`. They delegate to a use case, hold no business logic, publish no events, and stay idempotent.
4. No `@Cron()` for work that must run once across instances. Use BullMQ repeatable jobs.
5. Retry and options come from `JobConfigService`.

Checklist: `add-job` skill.

## 7. Testing

1. Specs are co-located `*.spec.ts`. Use `modules/<m>/testing/{factories,mocks}` and `src/testing`.
2. Mocks are typed without casts: hand-written `Mock*` classes for ports, `jest.MockedFunction` stubs for the rest. See `write-tests`.
3. Every behavior change gets success, failure, and authorization cases.
4. Domain entity and value-object specs follow [DOMAIN-ENTITY-TESTING.md](../testing/DOMAIN-ENTITY-TESTING.md).
5. Write-side OCC adapters follow [INTEGRATION-TESTING-GUIDE.md](../testing/INTEGRATION-TESTING-GUIDE.md) section 6: stale `expectedVersion` fails, child rows stay unchanged, one parity spec persists every column from `toUpdatePayload()`.

## 8. Redis

1. Use constants from `src/infrastructure/redis/constants/redis.constants.ts`.
2. Searchable schema fields live in `redis.schemas.ts`.
3. Keep index initialization and versioning intact when the schema changes.

## 9. Verification

Run `npm run verify` (see AGENTS.md). Narrow while iterating: `npm run typecheck`, `npx jest <path>`, `npm run test:arch` when layers, ports, or adapters change.

## 10. Docs and comments

ASCII only (AGENTS.md rule 2; `npm run lint:check` enforces it; ADR bodies are immutable and exempt). No emoji in comments. Doc placement, types, and naming: `write-docs` skill.

## 11. Entities and relations

Wrap every bidirectional relation property in TypeORM `Relation<T>` (avoids TDZ crashes under SWC).

## 12. Types

1. `as` and `any` are banned: AGENTS.md rule 1. Narrow `unknown`.
2. Type callback parameters explicitly.
3. Third-party types that force a cast are wrapped once in a typed adapter, not cast at call sites.
4. ESLint does not enforce `!` non-null assertions or `no-unsafe-assignment`, `-member-access`, `-call`, `-return` (typed `any` from legacy code flows through silently). Treat them as if they were on: narrow instead.

## 13. Optimistic locking

Canonical rule: [ARCHITECTURE-INVARIANTS.md](ARCHITECTURE-INVARIANTS.md) invariant 10. Port, mapper, and adapter code: `write-repository` skill. Rationale: [ADR-0005](../architecture/adr/ADR-0005-typed-atomic-occ-update-contract.md).

## 14. Errors

When a call already returned a `Result` failure, return that failure. Do not build a new `ErrorFactory` error around it.

A new error is only for a decision this function makes itself: a missing input, a business rule, an empty cart. Copying `message` into `UseCaseError`, `InfrastructureError`, `RepositoryError`, `QueryError`, or `DomainError` drops `code`, `statusCode`, and `retryable` unless every field is copied, and it hides the layer that failed. The HTTP filter already reads those fields off `AppError`, so the original error is the response.

This applies inside a use case, a domain method, a repository, a query adapter, and an ACL gateway.

Pass only the fields you are setting. The second argument of `ErrorFactory` and of `new DomainError`, `UseCaseError`, `ServiceError`, `RepositoryError`, `InfrastructureError`, and `QueryError` may be an options object (`cause`, `status`, `retryable`, `code`). `(message)` and `(message, cause)` stay valid. Do not pass `undefined` to reach a later argument.

```typescript
return ErrorFactory.UseCaseError('Cart is empty', {
  code: ErrorCode.CART_EMPTY,
});
```

Unknown thrown values still go through the helpers below. Do not stringify them by hand.

- `toErrorMessage(err)`: a log or response string.
- `toError(err)`: an `Error` to log, rethrow, or pass on; keeps `cause`.
- `toOptionalError(err)`: a cause that may be absent (`ErrorFactory` arguments).

Redis logging: `logRedisError(logger, source, err)`. Banned (ESLint and `test/architecture/error-handling.spec.ts`): `err instanceof Error ? err.message : String(err)`, `new Error(String(err))`. Plain `if (err instanceof Error)` control flow is fine.

## 15. Docs taxonomy

Every doc is Reference, Applied, or Hybrid. Rules and naming: `write-docs` skill.

## 16. References

[AGENTS.md](../../AGENTS.md), [DDD-HEXAGONAL.md](../architecture/DDD-HEXAGONAL.md), [INTEGRATION-PATTERNS.md](../integration/INTEGRATION-PATTERNS.md), [ARCHITECTURE-INVARIANTS.md](ARCHITECTURE-INVARIANTS.md), [ANTI-PATTERNS.md](ANTI-PATTERNS.md).
