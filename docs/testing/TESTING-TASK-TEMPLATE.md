# Testing Task Template (Checklist)

Use this template for every testing task. It is mandatory with `AGENT.md` §9.

---

## 1. Task Header (Copy/Paste)

```md
## Testing Task

- Roadmap item:
- Layer: Domain | Use Case | Repository Integration | E2E
- Feature/module:
- Risk level: Low | Medium | High
- PR/branch:
```

---

## 2. Fixture and Harness Decision (Copy/Paste)

```md
## Fixture + Harness Decision

- Module testing barrel: `src/modules/[module]/testing/index.ts` (new/existing)
- Fixture files planned:
  - Builders:
  - Factories:
  - Mocks:
- Builder contract (if domain-heavy): `buildPrimitives()` + `buildEntity()` (or explicit equivalent)
- Shared helpers used/added:
  - `src/testing/helpers/result-assertion.helper.ts`
  - `src/testing/helpers/database-test.helper.ts` (integration only)
  - `src/testing/helpers/e2e-test-app.helper.ts` / `auth-test.helper.ts` (e2e only)
- Integration harness (if applicable): PostgreSQL Testcontainers + migration/bootstrap approach
- Cleanup strategy: rollback | truncate | recreate schema (specify)
```

---

## 3. Mandatory Checklist (Copy/Paste)

```md
## Mandatory Checklist

- [ ] Arrange / Act / Assert structure is clear in every new test.
- [ ] (Optional) Given/When/Then comments map directly to AAA flow.
- [ ] Success path is covered.
- [ ] Failure/edge path is covered.
- [ ] Side effects are asserted (calls, events, cache, status changes).
- [ ] Negative interaction assertions exist where needed (`not.toHaveBeenCalled`).
- [ ] No silent branches left unasserted.
- [ ] Time-sensitive logic uses controlled clock (if applicable).
- [ ] Tests are deterministic (no random/timezone/order fragility).
- [ ] `Result<T, E>` assertions use shared helper style.
- [ ] Builder strategy is explicit for domain scenarios (`buildPrimitives()` and `buildEntity()` or justified equivalent).
- [ ] Imports avoid deep relative chains and prefer stable `src/...` or module testing barrel.
```

---

## 4. Scenario Matrix (Minimum Coverage)

| Test Type                  | Required Scenarios                                                                                                                                       |
| :------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Domain**                 | Valid transition, invalid transition (`DomainError`), invariant preservation, primitives round-trip, controlled-time timestamp behavior                  |
| **Use Case**               | Happy path orchestration, dependency failure propagation, validation/authorization failure, side-effect call contract, forbidden-path non-call assertion |
| **Repository Integration** | CRUD happy path, transaction atomicity behavior, mapper round-trip, filter/sort/pagination correctness, expected DB error mapping                        |
| **E2E**                    | Auth/token lifecycle, bounded-context happy path, failure contract (status + payload), cross-context integration behavior                                |

---

## 5. Definition of Done (DoD)

A testing task is done only if:

- All mandatory checklist items are marked complete.
- Scenario matrix requirements for the selected test type are satisfied.
- Tests run successfully with command output captured in PR/task evidence.
- Any uncovered intentional gap is explicitly documented with rationale and follow-up item.

---

## 6. Evidence Format for PR / Task Update (Copy/Paste)

````md
## Evidence

### Implemented

- Files added:
- Files updated:

### Fixture/Harness Compliance

- Module testing barrel path:
- Fixture naming used (`*.factory.ts`, `*.builder.ts`, `*.mock.ts`):
- Shared helpers used:
- Integration/E2E harness notes:

### Scenarios Covered

- [ID] scenario name -> pass/fail
- [ID] scenario name -> pass/fail

### Commands Run

```bash
npm run test -- <target>
```

### Result Summary

- Passed:
- Failed:
- Notes:

### Residual Risks / Follow-Ups

- Risk:
- Planned follow-up:
````

---

## 7. Dry-Run Examples (Planning Exercise)

### A. Domain Example: `Activity.start() / close() / cancel()`

- Valid `start()` updates `statusId`, `startDate`, `startTime`, `updatedAt`.
- Valid `close()` sets `closedAt`, `endTime`, optional `notes`, and `statusId`.
- `close()` when already closed throws `DomainError`.
- Valid `cancel()` sets cancelled status and closure timestamp.
- `cancel()` when already closed throws `DomainError`.
- `toPrimitives()` -> `fromPrimitives()` retains lifecycle fields.
- All timestamp assertions use controlled clock.

### B. Use Case Example: `CreateActivityUseCase`

- Happy path: valid user + partner/contact (active), repository save success.
- Failure: assigned user not found.
- Failure: assigned user inactive.
- Failure: partner inactive or not found.
- Failure: contact inactive or not found.
- Failure: contact/partner mismatch.
- Failure propagation: gateway/repository returns `Result.failure`.
- Call contract: save called once only on valid branch, no save on invalid branches.
