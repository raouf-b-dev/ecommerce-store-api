# Multi-Version Concurrency Control (MVCC) & Isolation Levels

A deep-dive into PostgreSQL's MVCC implementation — how row versioning, snapshot isolation, and visibility rules work internally — and a rigorous treatment of the four SQL isolation levels with worked concurrent-transaction examples.

> _Part of the [Concurrency Control](CONCURRENCY-FOUNDATIONS.md) series._

---

## 1. MVCC — Core Concept

> _Source: PostgreSQL Documentation, Chapter 13: Concurrency Control. https://www.postgresql.org/docs/current/mvcc.html_

MVCC is PostgreSQL's fundamental concurrency control mechanism. Rather than using read locks that block writers (or write locks that block readers), PostgreSQL maintains **multiple physical versions** of each row simultaneously. Each transaction sees a **consistent snapshot** of the database as it existed at a specific point in time, determined by the transaction's isolation level.

**Key principle**: _Readers never block writers. Writers never block readers._ This is achieved because readers see old row versions while writers create new ones.

---

## 2. Row Versioning Internals

Every row (tuple) in PostgreSQL contains hidden system columns that track its visibility:

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Physical Tuple                                │
├──────────┬──────────┬─────────┬─────────┬───────────────────────────┤
│  t_xmin  │  t_xmax  │ t_cid   │ t_ctid  │   User-visible columns   │
│ (create) │ (delete) │ (cmd)   │ (self)  │                           │
├──────────┼──────────┼─────────┼─────────┼───────────────────────────┤
│   100    │    0     │    0    │ (0, 1)  │ stock_level = 50          │
└──────────┴──────────┴─────────┴─────────┴───────────────────────────┘
```

| Column   | Purpose                                                                                           |
| :------- | :------------------------------------------------------------------------------------------------ |
| `t_xmin` | The transaction ID that **created** (inserted) this tuple version.                                |
| `t_xmax` | The transaction ID that **deleted** (or updated) this tuple version. `0` means the tuple is live. |
| `t_cid`  | The command sequence number within the creating transaction (for intra-transaction visibility).   |
| `t_ctid` | A pointer to the next version of the same logical row (forming a **version chain**).              |

### 2.1 How an UPDATE Creates a New Version

An `UPDATE` in PostgreSQL does not modify a tuple in place. Instead, it:

1. Marks the old tuple as dead by setting its `t_xmax` to the current transaction ID.
2. Inserts a **new tuple** with the updated values and `t_xmin` set to the current transaction ID.
3. Updates the old tuple's `t_ctid` to point to the new tuple's physical location.

```
Time ──────────────────────────────────────────────────────────►

Transaction 100 inserts the row:
  ┌──────────────────────────────────────────────────┐
  │ Tuple v1: t_xmin=100, t_xmax=0, stock_level=50  │  ← LIVE
  └──────────────────────────────────────────────────┘

Transaction 200 updates stock_level to 48:
  ┌──────────────────────────────────────────────────┐
  │ Tuple v1: t_xmin=100, t_xmax=200, stock_level=50│  ← DEAD (superseded)
  │              t_ctid ──────────────────────┐      │
  └──────────────────────────────────────────│──────┘
                                              ▼
  ┌──────────────────────────────────────────────────┐
  │ Tuple v2: t_xmin=200, t_xmax=0, stock_level=48  │  ← LIVE
  └──────────────────────────────────────────────────┘

Transaction 150 (started before 200) still sees Tuple v1:
  → Visibility rule: t_xmin (100) < 150 AND t_xmax (200) > 150
  → Transaction 150 reads stock_level = 50 (the snapshot value)
```

### 2.2 Visibility Rules (Snapshot Isolation)

A tuple is **visible** to a transaction T if and only if:

1. The tuple was created by a transaction that **committed before T's snapshot** was taken (`t_xmin` is committed and `t_xmin < T`).
2. The tuple has **not been deleted** by any transaction that committed before T's snapshot (`t_xmax` is either `0`, or the deleting transaction has not yet committed from T's perspective).

> **Consequence**: Two concurrent transactions can each read and modify the same logical row without blocking each other. Each sees the version that was current at the time of its snapshot. Conflicts are detected at write time, not read time.

---

## 3. VACUUM and Dead Tuple Cleanup

Because updates create new tuple versions rather than modifying existing ones, dead tuples accumulate on disk. PostgreSQL's **VACUUM** process (and its automated variant, **autovacuum**) reclaims this space:

1. Identifies tuples whose `t_xmax` transaction has committed and is older than the oldest active transaction's snapshot.
2. Marks the space as reusable for future inserts.
3. Updates the **Visibility Map** (VM) and **Free Space Map** (FSM) to track available space.

> _"VACUUM is not optional maintenance — it is a fundamental requirement of MVCC. Without it, tables grow without bound (table bloat) and index performance degrades as dead tuples accumulate."_
> — PostgreSQL Documentation, §25.1: Routine Vacuuming

For autovacuum tuning as a performance concern, see [Storage & Maintenance](../performance/STORAGE-AND-MAINTENANCE.md).

---

## 4. MVCC and Write Locks

MVCC eliminates the need for **read locks** but does **not** eliminate the need for **write locks**. When two transactions attempt to update the same row:

1. The first transaction (`T₁`) acquires an exclusive **row-level lock** and proceeds.
2. The second transaction (`T₂`) blocks on the row-level lock until `T₁` commits or aborts.
3. After `T₁` commits, the behaviour depends on the isolation level (see §5).

This write-write conflict resolution is where the isolation levels diverge.

---

## 5. Transaction Isolation Levels

> _Source: ANSI/ISO SQL-92 Standard, §4.28; Berenson, H. et al. (1995). "A Critique of ANSI SQL Isolation Levels." Proceedings of ACM SIGMOD, pp. 1–10._

### 5.1 The ANSI SQL Isolation Levels

| Isolation Level      | Dirty Read | Non-Repeatable Read | Phantom Read | Lost Update | Write Skew |
| :------------------- | :--------: | :-----------------: | :----------: | :---------: | :--------: |
| **READ UNCOMMITTED** |  Possible  |      Possible       |   Possible   |  Possible   |  Possible  |
| **READ COMMITTED**   | Prevented  |      Possible       |   Possible   |  Possible   |  Possible  |
| **REPEATABLE READ**  | Prevented  |      Prevented      |  Possible\*  |  Prevented  |  Possible  |
| **SERIALIZABLE**     | Prevented  |      Prevented      |  Prevented   |  Prevented  | Prevented  |

> \*PostgreSQL's `REPEATABLE READ` (Snapshot Isolation) also prevents phantom reads in practice. Berenson et al. (1995) demonstrate that SI is strictly stronger than ANSI `REPEATABLE READ` but strictly weaker than `SERIALIZABLE` — it permits write skew.

### 5.2 PostgreSQL's Implementation

PostgreSQL implements only three distinct behaviours, because it uses MVCC rather than lock-based isolation:

| Requested Level    | PostgreSQL Behaviour                      | Snapshot Timing                                                                       |
| :----------------- | :---------------------------------------- | :------------------------------------------------------------------------------------ |
| `READ UNCOMMITTED` | Treated as **`READ COMMITTED`**           | Per-statement                                                                         |
| `READ COMMITTED`   | **`READ COMMITTED`**                      | Per-statement (each statement sees a fresh snapshot)                                  |
| `REPEATABLE READ`  | **Snapshot Isolation (SI)**               | Per-transaction (snapshot taken at first statement, fixed for the entire transaction) |
| `SERIALIZABLE`     | **Serializable Snapshot Isolation (SSI)** | Per-transaction + dependency tracking                                                 |

> _Source: Ports, D.R.K. & Grittner, K. (2012). "Serializable Snapshot Isolation in PostgreSQL." Proceedings of the VLDB Endowment, 5(12), pp. 1850–1861._

### 5.3 READ COMMITTED — The Default

Each **SQL statement** within a transaction sees a snapshot of all data committed at the instant the statement begins. Different statements within the same transaction may see different committed states.

```
Transaction T₁                          Transaction T₂
──────────────                          ──────────────
BEGIN;                                  BEGIN;

SELECT stock FROM inventory
WHERE product_id = 42;
→ stock = 10

                                        UPDATE inventory
                                        SET stock = stock - 3
                                        WHERE product_id = 42;
                                        COMMIT;

SELECT stock FROM inventory
WHERE product_id = 42;
→ stock = 7  ← T₁ sees T₂'s committed change
              (non-repeatable read — same query, different result)

COMMIT;
```

**Key property under concurrent `UPDATE`**: When T₁ executes an `UPDATE` and the target row has been modified by a concurrent committed transaction, PostgreSQL **re-evaluates** the `WHERE` clause against the newly committed row version. If the row still matches, the update proceeds on the new version. If not, the row is skipped.

This prevents dirty writes but does **not** prevent the application-level Lost Update pattern (read → compute → write). See [Optimistic Locking](OPTIMISTIC-LOCKING.md) §1.

### 5.4 REPEATABLE READ (Snapshot Isolation)

The transaction's snapshot is taken at the first SQL statement and held constant for the entire transaction.

```
Transaction T₁ (REPEATABLE READ)        Transaction T₂
────────────────────────────────        ──────────────
BEGIN ISOLATION LEVEL REPEATABLE READ;  BEGIN;

SELECT stock FROM inventory
WHERE product_id = 42;
→ stock = 10

                                        UPDATE inventory
                                        SET stock = stock - 3
                                        WHERE product_id = 42;
                                        COMMIT;

SELECT stock FROM inventory
WHERE product_id = 42;
→ stock = 10  ← T₁ still sees the snapshot value

UPDATE inventory
SET stock = stock - 1
WHERE product_id = 42;
→ ERROR: could not serialize access due to concurrent update
  (PostgreSQL error code 40001)
```

**Key property**: If T₁ attempts to `UPDATE` a row modified and committed by another transaction since T₁'s snapshot, PostgreSQL aborts T₁ with error `40001`. The application **must** catch this error and retry the entire transaction.

### 5.5 SERIALIZABLE (SSI)

The strongest guarantee: the result of any set of concurrent transactions is equivalent to **some** serial ordering. PostgreSQL implements this using **Serializable Snapshot Isolation (SSI)**, which extends SI with runtime detection of **dangerous structures** — read-write dependency cycles (Cahill et al., 2008).

**When to use**: Business invariants that span multiple rows or tables and cannot be enforced by a single `SELECT ... FOR UPDATE` or version check. The classic example is **write skew**:

```
-- Business rule: At least one doctor must always be on call.

Transaction T₁ (Alice)                  Transaction T₂ (Bob)
──────────────────────                  ──────────────────
BEGIN ISOLATION LEVEL SERIALIZABLE;     BEGIN ISOLATION LEVEL SERIALIZABLE;

SELECT count(*) FROM doctors
WHERE on_call = true;
→ 2 (safe to remove one)
                                        SELECT count(*) FROM doctors
                                        WHERE on_call = true;
                                        → 2 (safe to remove one)

UPDATE doctors SET on_call = false
WHERE name = 'Alice';
                                        UPDATE doctors SET on_call = false
                                        WHERE name = 'Bob';

COMMIT; ✅
                                        COMMIT; ❌ ERROR 40001
                                        (SSI detects the rw-antidependency cycle)
```

**Cost**: SSI adds overhead for tracking read and write dependencies. Every transaction must be prepared for serialisation failures and implement retry logic.

### 5.6 Choosing an Isolation Level

| Scenario                                       | Recommended Level               | Rationale                                                                                                                                          |
| :--------------------------------------------- | :------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| Most CRUD operations                           | `READ COMMITTED` (default)      | Sufficient when protected by OCC (version columns) or explicit `FOR UPDATE`.                                                                       |
| Financial aggregates used in subsequent writes | `REPEATABLE READ`               | Consistent snapshot across multiple reads within the same transaction.                                                                             |
| Multi-row invariant enforcement                | `SERIALIZABLE`                  | Only level that prevents write skew. Required when constraints span multiple rows.                                                                 |
| Background batch processing                    | `READ COMMITTED`                | Combined with `FOR UPDATE SKIP LOCKED` for queue-like processing.                                                                                  |
| Inventory stock reservation                    | `READ COMMITTED` + `FOR UPDATE` | Row-level pessimistic lock is more efficient than raising isolation for the entire transaction. See [Pessimistic Locking](PESSIMISTIC-LOCKING.md). |

---

## 6. References

- ANSI (1992). _ANSI X3.135-1992 — Database Language SQL_. §4.28: SQL-transactions.
- Berenson, H. et al. (1995). "A Critique of ANSI SQL Isolation Levels." _Proceedings of ACM SIGMOD_, pp. 1–10. DOI: 10.1145/223784.223785
- Cahill, M.J., Röhm, U., & Fekete, A.D. (2008). "Serializable Isolation for Snapshot Databases." _Proceedings of ACM SIGMOD_, pp. 729–738.
- Ports, D.R.K. & Grittner, K. (2012). "Serializable Snapshot Isolation in PostgreSQL." _Proceedings of the VLDB Endowment_, 5(12), pp. 1850–1861.
- PostgreSQL Global Development Group. _Chapter 13: Concurrency Control_. https://www.postgresql.org/docs/current/mvcc.html
- PostgreSQL Global Development Group. _§25.1: Routine Vacuuming_. https://www.postgresql.org/docs/current/routine-vacuuming.html
