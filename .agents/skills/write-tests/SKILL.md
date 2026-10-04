---
name: write-tests
description: Write or fix Jest specs with typed mocks and no casts. Use when adding or editing a *.spec.ts or a test mock/factory, when covering a use case, controller, job handler, repository adapter, or domain entity, or when removing `as`/`any` from an existing spec.
---

# Write tests

Copy the closest golden spec in [references/golden-specs.md](references/golden-specs.md), then adapt it.

## Rules

1. Co-locate `<name>.spec.ts`. One `describe` per class, `it('<result> when <condition>')`.
2. Cover success, every failure branch, and authorization (own resource, other user's resource, admin).
3. Build data with module factories (`modules/<m>/testing/factories`) and callers with `createUserCallerContext` or `AuthPayloadFactory`. No large inline literals.
4. Narrow results with `ResultAssertionHelper.assertResultSuccess(result)`; check failures with `assertResultFailure(result, message, ErrorClass, cause?)`, or `expect(result).toMatchObject({ isFailure: true, error: { statusCode: HttpStatus.CONFLICT } })` for a status. Never wrap expectations in `if (result.isSuccess)` or `if (result.isFailure)`: the test would pass when the branch is skipped.
5. Assert behavior at the boundary: the port called with the right arguments, and the returned `Result`. Not private state.
6. Fake time with `src/testing/helpers/clock-test.helper.ts`, not `Date.now` stubs.

## Typed mocks, in order of preference

Repo convention: hand-written `Mock*` classes. `modules/<m>/testing/mocks` holds one per port (`MockInventoryRepository`, `MockOrderQueryService`, `ReservationRepositoryMockFactory`); `src/testing` holds shared ones (`MockCorrelationService`, `createMockQueue`, `createMockQueryBuilder`).

1. **Port or repository** (abstract class): a mock class that `implements` it, one `jest.fn<Return, [Args]>()` per method, plus `mockX()` helpers. Reuse the module's; add to it when a method is missing.
2. **Anything else you stub** (use cases, services, ORM repos, metrics): create the stub before the module, type each function from the real method, and pass the same reference to `useValue`:

   ```typescript
   const execute: jest.MockedFunction<GetOrderUseCase['execute']> = jest.fn();
   providers: [{ provide: GetOrderUseCase, useValue: { execute } }];
   ```

   `mockResolvedValue` and `mockReturnValue` are now checked against the real signature. `satisfies Partial<jest.Mocked<T>>` only checks method names: use it for collaborators you never configure.

3. **Subject under test**: `module.get(TheClass)`. It is the only `module.get` you need. Never `module.get<jest.Mocked<T>>(...)` or `const x: jest.Mocked<T> = module.get(TOKEN)`: `module.get` returns whatever type you ask for, so both are unchecked casts. Use `.useMocker(...)` to stub the untouched dependencies of a controller.
4. **Library objects**: the `src/testing` factories list only some methods. Declare the extra one locally with a typed `jest.MockedFunction`, and build a BullMQ `Job` with `new Job(Object.assign(createMockQueue(), { toKey: jest.fn(), keys: {} }), name, data)`.
5. **Class you instantiate yourself**: `jest.spyOn(instance, 'method').mockImplementation()`.

Forbidden: AGENTS.md rule 1 (`as`, `as unknown as`, `any`, `@ts-ignore`). A test that must feed invalid input uses `// @ts-expect-error <reason>`. If a third-party type cannot be built, stop and ask: do not cast.

### Replacing existing `as unknown as` (about 43)

Fix them when you touch the file, not in one sweep, then run `npm run lint:prune`.

- `{ execute: jest.fn() } as unknown as jest.Mocked<UseCase>` (jobs, processors, reconcile): typed `jest.MockedFunction` stub plus `useValue`, as in item 2. Where the spec calls `new Subject(stub)`, build the subject through `Test.createTestingModule`.
- `{...} as unknown as Job<T>`: a real `Job` as in item 4.
- `null as unknown as X` for invalid input: `// @ts-expect-error <reason>` on that line.
- `(service as unknown as { field })`: assert through the public API, or `jest.spyOn(service, 'method')`.
- Shared fixtures (`typeorm.mocks.ts`, `nestjs-context.fixture.ts`, `health.mock.ts`): replace with a `Mock*` class, or a typed object with the members the code uses, one file per change. They stay baselined until then.

## By layer

- **Use case**: instantiate through `Test.createTestingModule` with port mocks; assert the `Result`.
- **Controller**: assert delegation (`toHaveBeenCalledWith`) and metadata (`REQUIRED_PERMISSIONS_KEY`, `IS_PUBLIC_KEY`). No logic belongs here, so no logic tests.
- **Job handler**: mock the use case and metrics; run `handle(job)`; assert the delegation and side effects.
- **Repository adapter (unit)**: mock the ORM repo and query builder; cover insert, OCC update (`WHERE version = :expectedVersion`), zero rows to 409, and not found. Real database specs follow [INTEGRATION-TESTING-GUIDE.md](../../../docs/testing/INTEGRATION-TESTING-GUIDE.md) section 6.
- **Domain entity**: [DOMAIN-ENTITY-TESTING.md](../../../docs/testing/DOMAIN-ENTITY-TESTING.md).
- **Authorization**: every use case on an owned resource has a test where another user's `CallerContext` is denied.

## Run

`npx jest <path>` while iterating, then `npm run verify`. After removing a baselined cast, run `npm run lint:prune` (see AGENTS.md rule 1).
