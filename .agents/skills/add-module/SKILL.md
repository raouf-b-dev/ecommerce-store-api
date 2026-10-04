---
name: add-module
description: Scaffold or extend a bounded context following the hexagonal layout. Use when creating a module, use case, endpoint, ACL gateway, query service, or permission in src/modules, or when deciding which layer new code belongs in.
---

# Add a module, use case, or endpoint

Layer rules: [CONVENTIONS.md](../../../docs/ai/CONVENTIONS.md) sections 1 to 5. Locations: [CODE-MAP.md](../../../docs/ai/CODE-MAP.md). Copy a small existing module (`carts`, `inventory`) instead of inventing structure.

## New module layout

```
src/modules/<m>/
  <m>.module.ts  <m>.controller.ts  <m>.token.ts  <m>.processor.ts (only with jobs)
  core/domain/{entities,value-objects,repositories,schedulers,policies}
  core/application/{usecases,commands,queries,ports}
  primary-adapters/{dto,jobs,listeners}
  secondary-adapters/{orm,persistence/mappers,repositories,query,adapters,schedulers}
  testing/{factories,mocks,index.ts}
```

`secondary-adapters/adapters/` holds the cross-context ACL gateways (`module-<x>.gateway.ts`). Add `secondary-adapters/gateways/` only for an external SDK client (as notifications websocket and payments Stripe do).

1. Register `<M>Module` in `src/app.module.ts`.
2. Ports are abstract classes. In the module bind `{ provide: Port, useExisting: TOKEN }`, where `TOKEN` is a `Symbol` in `<m>.token.ts` bound to the adapter.
3. Export only the use cases and query services other modules need.

## New use case

1. Command or query type in `core/application/commands|queries`. Add `callerContext: CallerContext` when the resource is owned.
2. `@Injectable()` class extending `UseCase<In, Out, UseCaseError>` in `usecases/<name>/<name>.usecase.ts`. Return `Result`; wrap lower failures with `ErrorFactory.UseCaseError(message, cause)`. Authorize with `OwnedResourceAccessPolicy.canViewResource|canMutateResource|resolveListScope|resolveResourceScope` (carts: `CartOwnershipValidator`). Emit domain events here, never in adapters.
3. Provide it in the module.
4. Write the spec with the `write-tests` skill, including the authorization denial.

## New endpoint

1. Controller method: `@RequirePermissions('<permission>')` or `@Public()`, `@CallerCtx()` when ownership applies, then `return await this.useCase.execute(...)`. Nothing else.
2. Swagger: `@ApiOperation`, `@ApiResponse` (success and 403/404), `@ApiBearerAuth()`. Check with `npm run audit:openapi`.
3. New permission: add it to `src/modules/authorization/core/domain/reference-data/permission-definitions.ts` and grant it in `system-roles.ts` where needed.
4. A mutating endpoint that clients may retry (checkout in `orders.controller.ts` is the only user today): `@Idempotent()` from `src/infrastructure/decorators/idempotent.decorator.ts`.
5. DTO validation in `primary-adapters/dto` with class-validator.

## New cross-context call

Port (abstract class) in the caller's `core/application/ports`; adapter `secondary-adapters/adapters/module-<x>.gateway.ts` calling the other module's exported use case or query service. Bind a `Symbol` token to the class and the port to the token, and import the other module. Pass `SYSTEM_CALLER_CONTEXT` for internal calls. Never import the other module's repository or entity. Pattern and example: [CONVENTIONS.md](../../../docs/ai/CONVENTIONS.md) section 3.

## Finish

`npm run verify`. Update docs per the `write-docs` skill. For a new module also add it to [CODE-MAP.md](../../../docs/ai/CODE-MAP.md) and check the ADR triggers.
