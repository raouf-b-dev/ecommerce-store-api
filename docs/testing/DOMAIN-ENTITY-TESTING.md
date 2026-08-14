---
type: Applied
---

# Domain Entity Testing

> Executable specifications for domain invariants, state machines, and value objects.
> Phase 13 methodology — apply to all new specs under `src/modules/*/core/domain/`.

## Workflow

```text
read actual domain implementation
        ↓
extract business invariants
        ↓
define test matrix / checklist
        ↓
write tests that document those rules
```

Tests document **current** domain code. They do not silently redefine behaviour.

## Structure — Given / When / Then

Nest `describe` by **behaviour**, then **precondition**:

```ts
describe('Order', () => {
  describe('confirmPayment', () => {
    describe('when order is PENDING_PAYMENT', () => {
      it('transitions order to CONFIRMED', () => {
        // Arrange (Given)
        // Act (When)
        // Assert (Then)
      });
    });
  });
});
```

Prefer names that read as domain rules: _"transitions order to CONFIRMED"_ over _"should confirm payment"_.

## Parameterized tests — `it.each`

Use when the **rule is the same** but **input varies**:

```ts
it.each([OrderStatus.PENDING_PAYMENT, OrderStatus.CONFIRMED])(
  'allows cancellation when status is %s',
  (status) => {
    /* ... */
  },
);
```

Do not use `it.each` when each case needs different setup or assertions.

## State machines — transition matrix

Maintain an **independent expected specification** in the test file. Assert production policy against it — never derive expected values from production code (that is tautological).

```ts
// order-workflow.spec.ts (top) — independent business specification
const allowedTransitions: [OrderStatus, OrderStatus][] = [
  [OrderStatus.PENDING_PAYMENT, OrderStatus.CONFIRMED],
  // ...
];

it.each(allowedTransitions)('allows transition from %s to %s', (from, to) => {
  expect(OrderWorkflow.canTransition(from, to)).toBe(true);
});
```

## Fixtures

Use module test factories via `src/modules/<module>/testing`:

```ts
const order = OrderTestFactory.createDomainOrder({
  status: OrderStatus.PENDING_PAYMENT,
});
```

Prefer `createDomain*()` helpers over inline 20-line prop objects.

## Assertions

- `Result<T, E>` → `ResultAssertionHelper` from `src/testing`
- Constructor validation → `expect(() => new Entity(...)).toThrow(...)`
- Temporal behaviour → `jest.useFakeTimers()`; restore in `afterEach`

## Layer taxonomy

| Layer         | Location                     | Domain phase focus                                      |
| ------------- | ---------------------------- | ------------------------------------------------------- |
| Value objects | `core/domain/value-objects/` | Validation, normalization, calculations, transitions    |
| Entities      | `core/domain/entities/`      | Invariants, transitions, mutation guards, serialization |
| Aggregates    | entity + children            | Order + items, Cart + items, User + addresses           |
| Use cases     | `core/application/`          | Separate — orchestration, ports, auth                   |
| Repositories  | `secondary-adapters/`        | Separate — integration tests                            |

## Anti-patterns

| Avoid                               | Why                          |
| ----------------------------------- | ---------------------------- |
| Generic `testAllEntities()` helpers | Hides domain-specific rules  |
| Optimizing for test count           | Cover invariants explicitly  |
| Property-based testing in baseline  | Defer until specs are stable |
| Changing domain to match tests      | Specs follow code            |

## Verification

```bash
npm run typecheck
npx jest "src/modules/*/core/domain/**/*.spec.ts"
npm test
```
