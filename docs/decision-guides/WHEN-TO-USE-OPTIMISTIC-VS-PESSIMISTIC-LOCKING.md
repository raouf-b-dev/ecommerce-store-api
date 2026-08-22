# Decision Guide: Optimistic vs. Pessimistic Locking

This decision guide defines the rules and trade-offs for selecting between **Optimistic Concurrency Control (OCC)** and **Pessimistic Locking** in `ecommerce-store-api`.

---

## 1. Quick Decision Matrix

| Scenario / Pattern                                                 | Contention Level | Write Pattern                    | Recommended Strategy               | Protocol / Implementation                                    |
| :----------------------------------------------------------------- | :--------------- | :------------------------------- | :--------------------------------- | :----------------------------------------------------------- |
| **Standard CRUD Aggregates** (Orders, Products, Customer Profiles) | Low to Medium    | Single-entity overwrite          | **Optimistic Concurrency Control** | `@VersionColumn` + explicit `WHERE version = :expected`      |
| **Shared Numeric Balances** (Inventory Available Stock)            | High             | Concurrent decrement / increment | **Pessimistic Write Lock**         | `SELECT ... FOR UPDATE` inside `REPEATABLE READ` transaction |
| **Financial / Payment Transactions**                               | Low              | Append-only intent & capture     | **Optimistic + Idempotency**       | `@Idempotent()` interceptor + versioning                     |

---

## 2. When to Use Optimistic Concurrency Control (OCC)

Use OCC when:

- **Low Contention**: Concurrent updates to the same record occur infrequently.
- **Human Response Time**: The state was read by a user/API client and sent back seconds or minutes later.
- **Aggregate Root Integrity**: You need to ensure another process did not modify the entity since it was read.

### Implementation Checklist:

1. Include `@VersionColumn() version: number` in the TypeORM schema.
2. Accept `expectedVersion` in repository `save()` / update application use cases.
3. Execute explicit conditional SQL updates checking `WHERE id = :id AND version = :expectedVersion`.
4. Throw `HttpStatus.CONFLICT` (`409 Conflict`) if zero rows are updated.
5. Map application-owned columns with `UpdateFromEntity` / `toUpdatePayload()`. Exclude persistence-owned `id`, `version`, `@CreateDateColumn`, `@UpdateDateColumn`, and separately persisted relations. Stamp `version` and `updatedAt` in the QueryBuilder `.set()` — TypeORM hooks do not run on QueryBuilder `UPDATE`.

---

## 3. When to Use Pessimistic Locking

Use Pessimistic Locking when:

- **High Contention**: Multiple checkout threads simultaneously compete to reserve stock for the same high-demand product.
- **Retry Overhead is Unacceptable**: High failure/conflict retry loops under optimistic locking would degrade API response latency.
- **Multi-Step Transactional Mutations**: The operation reads stock, checks business rules, and decrements stock in a single atomic database unit of work.

### Implementation Checklist:

1. Open a database transaction with `REPEATABLE READ` isolation level.
2. Query the target entity with `lock: { mode: 'pessimistic_write' }` (`SELECT ... FOR UPDATE`).
3. Perform validation and mutations within the active transaction scope.
4. Keep the transaction duration as short as possible to prevent lock escalation and connection pool starvation.
