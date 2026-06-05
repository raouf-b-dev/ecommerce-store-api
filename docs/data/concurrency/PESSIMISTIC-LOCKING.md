# Pessimistic Concurrency Control (PCC)

A deep-dive into pessimistic locking: Two-Phase Locking theory, PostgreSQL's lock mode hierarchy, row-level locking with `SELECT ... FOR UPDATE` and its variants, deadlock detection and prevention, advisory locks, and TypeORM implementation patterns. Includes the e-commerce stock reservation problem as a worked case study.

> _Part of the [Concurrency Control](CONCURRENCY-FOUNDATIONS.md) series._

---

## 1. Theory

> _Source: Gray, J. & Reuter, A. (1992). Transaction Processing: Concepts and Techniques. Morgan Kaufmann._

Pessimistic Concurrency Control (PCC) assumes that conflicts are **likely** and acquires locks **before** accessing data, preventing concurrent transactions from reading or modifying the locked resource until the lock is released.

The foundational protocol is **Two-Phase Locking (2PL)**:

1. **Growing phase**: The transaction acquires all necessary locks. No lock is released.
2. **Shrinking phase**: The transaction releases its locks (typically at commit or abort). No new lock is acquired.

> **Theorem (Eswaran et al., 1976)**: If all transactions in a schedule follow the Two-Phase Locking protocol, then the schedule is serialisable.

---

## 2. PostgreSQL Lock Modes

PostgreSQL implements a hierarchy of lock modes, from least restrictive to most restrictive:

| Lock Mode             | Abbreviation | Conflicts With                      | Use Case                                   |
| :-------------------- | :----------- | :---------------------------------- | :----------------------------------------- |
| `ACCESS SHARE`        | AS           | `ACCESS EXCLUSIVE`                  | `SELECT` — reading a row                   |
| `ROW SHARE`           | RS           | `EXCLUSIVE`, `ACCESS EXCLUSIVE`     | `SELECT ... FOR UPDATE` targeting          |
| `ROW EXCLUSIVE`       | RX           | `SHARE`, `SRX`, `EXCLUSIVE`, `AX`   | `UPDATE`, `DELETE`, `INSERT`               |
| `SHARE`               | S            | `RX`, `SRX`, `EXCLUSIVE`, `AX`      | `CREATE INDEX` (non-concurrent)            |
| `SHARE ROW EXCLUSIVE` | SRX          | `RX`, `S`, `SRX`, `EXCLUSIVE`, `AX` | —                                          |
| `EXCLUSIVE`           | X            | All except `ACCESS SHARE`           | Blocks concurrent writes                   |
| `ACCESS EXCLUSIVE`    | AX           | All locks                           | `ALTER TABLE`, `DROP TABLE`, `VACUUM FULL` |

> _Source: PostgreSQL Documentation, §13.3: Explicit Locking. https://www.postgresql.org/docs/current/explicit-locking.html_

---

## 3. Row-Level Locking (`SELECT ... FOR UPDATE`)

The most relevant pessimistic lock for application development is `SELECT ... FOR UPDATE`, which acquires an **exclusive row-level lock** on the selected rows. Other transactions attempting to lock, update, or delete the same rows will **block** until the lock is released.

```sql
BEGIN;

-- Acquire exclusive lock on the inventory row
SELECT stock_level FROM inventory
WHERE product_id = 42
FOR UPDATE;
-- → stock_level = 5

-- Decrement stock within the same transaction
UPDATE inventory
SET stock_level = stock_level - 1
WHERE product_id = 42;
-- → stock_level = 4

COMMIT;
-- Lock is released when the transaction ends
```

### 3.1 Row-Level Lock Variants

| SQL Clause               | Lock Type               | Behaviour                                                                                |
| :----------------------- | :---------------------- | :--------------------------------------------------------------------------------------- |
| `FOR UPDATE`             | Exclusive               | Blocks other `FOR UPDATE`, `UPDATE`, `DELETE`. Strongest row lock.                       |
| `FOR NO KEY UPDATE`      | Weaker exclusive        | Like `FOR UPDATE` but does not block `FOR KEY SHARE`. Use when updating non-key columns. |
| `FOR SHARE`              | Shared                  | Allows other `FOR SHARE` but blocks writes. Used for read-only assertions.               |
| `FOR KEY SHARE`          | Weakest shared          | Only blocks `FOR UPDATE` and key column changes. Used by foreign key checks.             |
| `FOR UPDATE NOWAIT`      | Exclusive, non-blocking | Returns an error immediately if the row is already locked.                               |
| `FOR UPDATE SKIP LOCKED` | Exclusive, skip-locked  | Skips already-locked rows. Useful for task/queue processing.                             |

> **Critical requirement**: Pessimistic locks **require** an active transaction. The lock is held for the transaction's duration and released on `COMMIT` or `ROLLBACK`. Using `pessimistic_write` outside a transaction has no effect.

---

## 4. Deadlocks

When two or more transactions each hold a lock that the other needs, a **deadlock** occurs — a circular wait condition where no transaction can proceed.

```
Transaction T₁                          Transaction T₂
──────────────                          ──────────────
LOCK row A ✅                           LOCK row B ✅

LOCK row B                              LOCK row A
→ BLOCKED (T₂ holds B)                 → BLOCKED (T₁ holds A)

         ┌──────────────────────┐
         │   CIRCULAR WAIT      │
         │   T₁ waits for T₂   │
         │   T₂ waits for T₁   │
         │   = DEADLOCK         │
         └──────────────────────┘
```

**PostgreSQL's deadlock resolution**: A **deadlock detector** (configurable via `deadlock_timeout`, default 1 second) aborts one transaction with error `40P01`. The aborted transaction must be retried.

### 4.1 Prevention Strategies

1. **Consistent lock ordering**: Always acquire locks in a deterministic order (e.g., by primary key ascending). If T₁ and T₂ both lock row A before row B, circular waits are impossible.
2. **Short transactions**: Acquire locks early, commit promptly. The longer a transaction holds locks, the higher the deadlock probability.
3. **`NOWAIT` or `SKIP LOCKED`**: Instead of blocking, fail fast or skip contested rows.
4. **Lock escalation avoidance**: Avoid upgrading from shared to exclusive locks mid-transaction.

---

## 5. Advisory Locks

PostgreSQL provides **advisory locks** — application-defined locks not tied to any specific table or row. These are useful for application-level mutual exclusion:

```sql
-- Acquire a transaction-level advisory lock
SELECT pg_advisory_xact_lock(42);

-- ... critical section ...

-- Lock is released automatically on COMMIT or ROLLBACK
```

| Type                   | Function                     | Release                                           |
| :--------------------- | :--------------------------- | :------------------------------------------------ |
| **Session-level**      | `pg_advisory_lock(key)`      | Explicit `pg_advisory_unlock(key)` or session end |
| **Transaction-level**  | `pg_advisory_xact_lock(key)` | Automatic on `COMMIT` or `ROLLBACK`               |
| **Try (non-blocking)** | `pg_try_advisory_lock(key)`  | Returns `false` immediately if already held       |

Advisory locks are useful for coordinating work across multiple processes sharing the same database — e.g., ensuring only one instance of a cron job runs at a time. For coordination across processes that don't share a database, see [Distributed Locking](DISTRIBUTED-LOCKING.md).

---

## 6. The Overselling Problem — A Worked Case Study

The most critical concurrency problem in e-commerce systems is **overselling**: concurrent checkout transactions each read sufficient stock, each decrement — resulting in a negative stock level.

```
Invariant: stock_level >= 0 (must NEVER be violated)
Initial state: product_id=42, stock_level=1

Checkout T₁ (Customer A)                Checkout T₂ (Customer B)
────────────────────────                ────────────────────────
BEGIN;                                  BEGIN;

SELECT stock_level FROM inventory
WHERE product_id = 42;
→ stock_level = 1 (sufficient)
                                        SELECT stock_level FROM inventory
                                        WHERE product_id = 42;
                                        → stock_level = 1 (sufficient)

UPDATE inventory SET stock_level = 0;
COMMIT;
                                        UPDATE inventory SET stock_level = -1;
                                        COMMIT;

Final state: stock_level = -1 → INVARIANT VIOLATED
```

### 6.1 Solution: `SELECT ... FOR UPDATE`

```
Checkout T₁ (Customer A)                Checkout T₂ (Customer B)
────────────────────────                ────────────────────────
BEGIN;                                  BEGIN;

SELECT stock_level FROM inventory
WHERE product_id = 42
FOR UPDATE;
→ stock_level = 1, row LOCKED ✅
                                        SELECT stock_level FROM inventory
                                        WHERE product_id = 42
                                        FOR UPDATE;
                                        → BLOCKED ⏳ (waiting for T₁)

UPDATE inventory SET stock_level = 0;
COMMIT; (lock released)
                                        → Lock acquired!
                                        → stock_level = 0 (reads committed value)
                                        → 0 < 1 → INSUFFICIENT STOCK
                                        → ROLLBACK

Final state: stock_level = 0 ✅ (invariant preserved)
```

### 6.2 Defense in Depth: CHECK Constraint

```sql
ALTER TABLE inventory
ADD CONSTRAINT chk_stock_non_negative CHECK (stock_level >= 0);
```

This is a **safety net**, not a replacement for proper locking — the application should detect insufficient stock _before_ attempting the decrement to provide a clean error message.

### 6.3 Flash Sale Contention Strategies

During flash sales, `FOR UPDATE` creates a serialisation bottleneck. Mitigation strategies:

| Strategy                    | Description                                                                                           | Tradeoff                                                     |
| :-------------------------- | :---------------------------------------------------------------------------------------------------- | :----------------------------------------------------------- |
| **Atomic decrement**        | `UPDATE inventory SET stock = stock - 1 WHERE product_id = 42 AND stock >= 1;` Check `affected_rows`. | Simplest. Still serialises writes on the same row.           |
| **Queue-based reservation** | Place checkouts in a BullMQ queue, process sequentially per product.                                  | Eliminates DB contention; adds latency and complexity.       |
| **Sharded counters**        | Split stock into N sub-counters. Each checkout decrements a random shard.                             | Reduces per-row contention by factor N. Complex rebalancing. |
| **Pre-claimed tokens**      | Pre-generate N claim tokens. Each checkout claims one via `FOR UPDATE SKIP LOCKED`.                   | Natural queue ordering. Useful for ticket/event systems.     |

---

## 7. Implementation — TypeORM Lock Modes

### 7.1 Using QueryBuilder

```typescript
const inventory = await queryRunner.manager
  .createQueryBuilder(InventoryEntity, 'inv')
  .setLock('pessimistic_write') // → SELECT ... FOR UPDATE
  .where('inv.productId = :productId', { productId })
  .getOne();
```

### 7.2 Using FindOptions

```typescript
const inventory = await queryRunner.manager.findOne(InventoryEntity, {
  where: { productId },
  lock: { mode: 'pessimistic_write' },
});
```

### 7.3 TypeORM Lock Mode Mappings

| TypeORM Mode                  | SQL Generated       | Use Case                                          |
| :---------------------------- | :------------------ | :------------------------------------------------ |
| `'pessimistic_read'`          | `FOR SHARE`         | Read locks — allow concurrent reads, block writes |
| `'pessimistic_write'`         | `FOR UPDATE`        | Write locks — block reads-for-update and writes   |
| `'pessimistic_partial_write'` | `FOR NO KEY UPDATE` | Weaker write lock — doesn't block FK checks       |
| `'pessimistic_write_or_fail'` | `FOR UPDATE NOWAIT` | Fail immediately if locked                        |
| `'for_key_share'`             | `FOR KEY SHARE`     | Weakest — only blocks key column changes          |

### 7.4 Transaction Management

```typescript
const queryRunner = dataSource.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction();

try {
  const inventory = await queryRunner.manager.findOne(InventoryEntity, {
    where: { productId },
    lock: { mode: 'pessimistic_write' },
  });

  if (inventory.stockLevel < requestedQuantity) {
    throw new InsufficientStockError(productId);
  }

  inventory.stockLevel -= requestedQuantity;
  await queryRunner.manager.save(inventory);

  await queryRunner.commitTransaction();
} catch (error) {
  await queryRunner.rollbackTransaction();
  throw error;
} finally {
  await queryRunner.release();
}
```

---

## 8. Monitoring Lock Contention

```sql
-- View blocked queries and what is blocking them
SELECT
  blocked.pid AS blocked_pid,
  blocked.query AS blocked_query,
  blocking.pid AS blocking_pid,
  blocking.query AS blocking_query
FROM pg_stat_activity blocked
JOIN pg_locks blocked_locks ON blocked.pid = blocked_locks.pid
JOIN pg_locks blocking_locks
  ON blocked_locks.locktype = blocking_locks.locktype
  AND blocked_locks.relation = blocking_locks.relation
JOIN pg_stat_activity blocking ON blocking_locks.pid = blocking.pid
WHERE NOT blocked_locks.granted AND blocking_locks.granted;
```

---

## 9. References

- Eswaran, K.P. et al. (1976). "The Notions of Consistency and Predicate Locks in a Database System." _Communications of the ACM_, 19(11), pp. 624–633.
- Gray, J. & Reuter, A. (1992). _Transaction Processing: Concepts and Techniques_. Morgan Kaufmann.
- Kleppmann, M. (2017). _Designing Data-Intensive Applications_. O'Reilly. §7.2: "Weak Isolation Levels."
- PostgreSQL Documentation. _§13.3: Explicit Locking_. https://www.postgresql.org/docs/current/explicit-locking.html
- TypeORM. _Lock Modes_. https://typeorm.io/select-query-builder#lock-modes
