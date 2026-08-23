# ADR-0005: Typed Atomic OCC Update Contract

- **Status**: Accepted
- **Date**: 2026-08-14
- **Deciders**: Engineering Core Team
- **Context**: Versioned write-side aggregates (Product, Order, User, Cart); extends [ADR-0004](ADR-0004-inventory-integrity-and-concurrency.md) Decision 3 beyond Inventory
- **Does not supersede**: ADR-0004

---

## 1. Context & Problem Statement

ADR-0004 required Inventory updates to use atomic SQL `WHERE id = :id AND version = :expectedVersion`. Product, Order, User, and Cart still stamped `entity.version = expectedVersion` and called TypeORM `save()` on a **detached** mapped entity. Against PostgreSQL that increment could succeed without the version predicate, so a stale `expectedVersion` did not fail (lost update, HTTP 409 never fired).

Once those adapters moved to QueryBuilder `UPDATE`, a second problem appeared: listing every mutable column in `.set({...})` silently dropped new fields, and spreading the ORM entity would write `id`, `version`, timestamps, and relations. `@UpdateDateColumn()` / `@VersionColumn()` also do **not** run on QueryBuilder `UPDATE`, so `updatedAt` would stay stale unless the adapter stamped it.

We needed to record:

1. Atomic OCC is the contract for every `@VersionColumn` aggregate, not only Inventory.
2. Which columns the application owns vs persistence owns.
3. Why the update payload is a typed mapper method, not `...entity` or TypeORM metadata.

How-to lives in [CONVENTIONS.md](../../ai/CONVENTIONS.md) §4 and §13. This ADR records **why**.

---

## 2. Decision Outcomes

### Decision 1: Atomic OCC for every versioned aggregate save

- **Decision**: When `expectedVersion` is passed, Product, Order, User, and Cart persist with QueryBuilder `UPDATE … SET version = version + 1 WHERE id = :id AND version = :expectedVersion`. `affected === 0` and the row exists → `RepositoryError` with `HttpStatus.CONFLICT` (409). Inserts omit `expectedVersion` and keep TypeORM `save()`. Parent OCC runs first in a transaction; children (order items/shipping, user addresses, cart items) persist only after the lock succeeds.
- **Rationale**: Detached `Object.assign(new Entity(), …)` graphs are not TypeORM-managed, so `@VersionColumn()` on `save()` is not a reliable predicate. The Inventory proof from ADR-0004 applies to all concurrent CRUD aggregates in [WHEN-TO-USE-OPTIMISTIC-VS-PESSIMISTIC-LOCKING.md](../../decision-guides/WHEN-TO-USE-OPTIMISTIC-VS-PESSIMISTIC-LOCKING.md).

### Decision 2: Application-owned columns via `UpdateFromEntity` / `toUpdatePayload()`

- **Decision**: Each OCC mapper exposes `toUpdatePayload()` typed as `UpdateFromEntity<TEntity, ExcludeKeys>` (`src/infrastructure/mappers/utils/update-from-entity.type.ts`). Repositories spread that payload into `.set()` and add only persistence-owned SQL expressions. Adding an ORM column that is not in `ExcludeKeys` is a compile error until the payload accounts for it.
- **Rationale**: The repository must not know which domain fields are mutable. A handwritten `.set({ name, slug, … })` list drifts. The type makes omission a `tsc` failure instead of a silent no-op.

### Decision 3: Exclusion list is ownership, not a skip list

- **Decision**: `ExcludeKeys` names fields persistence owns or that are written in a separate step: `id`, `version`, `@CreateDateColumn` / `@UpdateDateColumn`, and relations (`items`, `shippingAddress`, `addresses`). QueryBuilder `.set()` stamps `version: () => 'version + 1'` and `updatedAt: () => 'CURRENT_TIMESTAMP'`. `createdAt` is never updated. Domain entities still do not carry `version`.
- **Rationale**: `@UpdateDateColumn()` applies on `repository.save()`, not on QueryBuilder `UPDATE`. Product’s previous `@Column({ onUpdate: 'CURRENT_TIMESTAMP' })` is MySQL-only and a no-op on PostgreSQL. Putting `updatedAt` in `toUpdatePayload()` would duplicate ownership with the database clock. Spreading the entity would SET identity, version, and relations.

---

## 3. Alternatives Considered

1. **TypeORM `save()` after stamping `entity.version`**:  
 _Rejected_: proven against real PostgreSQL on Product: version incremented, stale save did not fail.
2. **Load managed entity, `Object.assign`, `save()`**:  
 _Rejected_: the version check and write are not one atomic `UPDATE`, so two transactions can both pass the in-memory check (lost update).
3. **`.set({ ...entity, version: () => 'version + 1' })`**:  
 _Rejected_: ORM entities include `id`, `version`, timestamps, and relations that must not appear in a parent `UPDATE`.
4. **Drive `.set()` from TypeORM column metadata**:  
 _Rejected_: “which columns are application-mutable” is an architectural ownership rule, not a schema fact. Metadata would happily update `tenantId`, `deletedAt`, or similar once added.
5. **Include `updatedAt` in `toUpdatePayload()` from domain `new Date()`**:  
 _Rejected_: timestamps are persistence-owned (`@UpdateDateColumn`). The adapter stamps `CURRENT_TIMESTAMP` next to `version` so QueryBuilder still has a single owner.

---

## 4. Consequences

### Positive

- Stale `expectedVersion` fails with 409 on Product, Order, User, and Cart, matching Inventory.
- New mutable columns fail `npm run typecheck` until `toUpdatePayload()` is updated.
- Child rows are not written when the OCC parent update fails.
- QueryBuilder updates keep `updatedAt` in sync without putting timestamps on the domain OCC contract.

### Negative

- Inventory’s OCC `.set()` still lists scalars by hand (ADR-0004 path). Aligning it to `UpdateFromEntity` is optional follow-up, not required by this ADR.
- `UpdateFromEntity` guards ORM columns, not domain props. A domain field with no matching column still will not fail this type.
- Parent-only `UPDATE` cannot cascade relations; Order/User/Cart adapters must keep explicit child sync in the same transaction.

### Follow-through (not part of the decision)

Applied conventions and tests: [CONVENTIONS.md](../../ai/CONVENTIONS.md) §4 / §7 / §13, [DATABASE-STANDARDS.md](../../database/DATABASE-STANDARDS.md), [INTEGRATION-TESTING-GUIDE.md](../../testing/INTEGRATION-TESTING-GUIDE.md) §6 (stale version, children unchanged, OCC column parity).
