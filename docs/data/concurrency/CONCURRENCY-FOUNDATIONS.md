# Concurrency Control — Foundations

An introduction to the theory of database concurrency control: the anomalies that arise from uncoordinated concurrent access, the two fundamental strategies for preventing them, and a decision framework for choosing between them. This document serves as the hub for the concurrency deep-dive series.

> _This is a technology-agnostic primer. For PostgreSQL-specific internals, see the linked deep-dives._

---

## Deep-Dive Index

| Document                                             | Scope                                                                                                                                    |
| :--------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| **[MVCC & Isolation Levels](MVCC-AND-ISOLATION.md)** | PostgreSQL's Multi-Version Concurrency Control, tuple versioning, VACUUM, and the four SQL isolation levels with worked examples         |
| **[Optimistic Locking](OPTIMISTIC-LOCKING.md)**      | Version-based conflict detection, the Lost Update problem, conflict resolution strategies, and TypeORM `@VersionColumn()` implementation |
| **[Pessimistic Locking](PESSIMISTIC-LOCKING.md)**    | Row-level locks (`SELECT ... FOR UPDATE`), Two-Phase Locking, deadlocks, advisory locks, and TypeORM lock modes                          |
| **[Distributed Locking](DISTRIBUTED-LOCKING.md)**    | Locking across processes and services: Redis `SETNX`, the Redlock algorithm, fencing tokens, and lease-based coordination                |

**Related series**: [Consistency Foundations](../consistency/CONSISTENCY-FOUNDATIONS.md) (ACID vs BASE, CAP theorem, eventual consistency, idempotency, sagas)

---

## 1. The Concurrency Problem

> _Source: Bernstein, P.A., Hadzilacos, V., & Goodman, N. (1987). Concurrency Control and Recovery in Database Systems. Addison-Wesley._

A database system must serve multiple transactions simultaneously. Without coordination, concurrent transactions that read and write shared data can produce **anomalous results** — outcomes that are impossible under any sequential (serial) execution of those same transactions. The discipline of **concurrency control** exists to prevent these anomalies while maximising throughput.

**Formal definition**: A **schedule** is a sequence of interleaved read and write operations from multiple transactions. A schedule is **serialisable** if its effect on the database is equivalent to some serial execution of the same transactions — that is, as if the transactions had run one after another in some order, with no interleaving (Bernstein et al., 1987, §1.4).

---

## 2. Anomaly Taxonomy

The ANSI SQL standard (ANSI, 1992) identifies three classical anomalies. Berenson et al. (1995) extended this taxonomy to include additional phenomena observed in real database systems.

| Anomaly                 | Also Known As               | Description                                                                                                                                                     | Example                                                                                                                             |
| :---------------------- | :-------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| **Dirty Read**          | P1 / Uncommitted Dependency | Transaction T₂ reads a value written by T₁ before T₁ commits. If T₁ aborts, T₂ has acted on data that never existed.                                            | T₁ sets `stock = 0`, T₂ reads `stock = 0` and rejects checkout, T₁ aborts. Customer was incorrectly denied.                         |
| **Non-Repeatable Read** | P2 / Fuzzy Read             | T₁ reads a row, T₂ modifies and commits that row, T₁ re-reads and gets a different value.                                                                       | T₁ reads `price = 49.99`, T₂ updates `price = 59.99` and commits, T₁ reads `price = 59.99`. Order computed with inconsistent price. |
| **Phantom Read**        | P3                          | T₁ executes a predicate query (e.g., `WHERE status = 'ACTIVE'`), T₂ inserts or deletes a matching row and commits, T₁ re-executes and sees a different row set. | T₁ counts active carts for rate limiting, T₂ creates a new cart, T₁ re-counts and gets a different number.                          |
| **Lost Update**         | P4                          | T₁ and T₂ both read the same value, each computes a new value based on what they read, and each writes. The last write silently overwrites the first.           | Two admins both read `stock = 10`, each decrements by 1, both write `stock = 9`. One decrement is lost.                             |
| **Write Skew**          | A5B                         | Two transactions each read a value that the other writes, producing a state that violates a constraint that neither transaction violated individually.          | Two doctors each check that at least one is on call, each removes themselves, both commit — no doctor is on call.                   |

> **Note on the Lost Update**: The Lost Update is not explicitly named in ANSI SQL-92's isolation level definitions, but it is the most practically impactful anomaly in application development. Berenson et al. (1995) classify it as anomaly P4 and demonstrate that it can occur under `READ COMMITTED`. See [Optimistic Locking](OPTIMISTIC-LOCKING.md) §1 for a full worked example and solution.

---

## 3. The Two Fundamental Approaches

Concurrency control strategies divide into two philosophical families:

```
                    Concurrency Control
                          │
              ┌───────────┴───────────┐
              │                       │
      Pessimistic                Optimistic
   "Prevent conflicts"      "Detect conflicts"
              │                       │
    ┌─────────┴─────────┐    ┌────────┴────────┐
    │                   │    │                 │
 Lock-based          MVCC  Version-based    Timestamp-based
 (2PL, S/X)    (PostgreSQL) (App-level)    (Serialisable SI)
```

| Approach        | Philosophy                                                                                                    | When to Use                                                                                                                             | Cost Model                                                             |
| :-------------- | :------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------- |
| **Pessimistic** | Assume conflicts are likely; acquire locks before accessing data to prevent conflicts from occurring.         | High-contention resources where conflicts are frequent and retry costs are high (e.g., inventory stock during flash sales).             | Blocking cost: transactions wait for locks. Deadlock risk.             |
| **Optimistic**  | Assume conflicts are rare; allow transactions to proceed without locks, then detect conflicts at commit time. | Low-contention resources where conflicts are rare and the cost of occasionally retrying is acceptable (e.g., customer profile updates). | Retry cost: conflicting transactions must be re-executed. No blocking. |

> _"Optimistic methods are superior when the probability of conflict is low; pessimistic methods are superior when conflicts are frequent and the cost of rollback is high."_
> — Kung, H.T. & Robinson, J.T. (1981). "On Optimistic Methods for Concurrency Control." ACM Transactions on Database Systems, 6(2), pp. 213–226.

---

## 4. Scope Spectrum — Where Concurrency Control Applies

Concurrency control is not a single-layer concern. Different mechanisms operate at different layers of the stack:

```
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                          │
│  Idempotency keys, API-level deduplication, request queuing     │
│  → See: consistency/IDEMPOTENCY.md                              │
├─────────────────────────────────────────────────────────────────┤
│                      Framework Layer                            │
│  ORM version columns, application-level OCC (@VersionColumn)    │
│  → See: OPTIMISTIC-LOCKING.md                                   │
├─────────────────────────────────────────────────────────────────┤
│                      Database Layer                             │
│  MVCC, isolation levels, row-level locks, advisory locks        │
│  → See: MVCC-AND-ISOLATION.md, PESSIMISTIC-LOCKING.md           │
├─────────────────────────────────────────────────────────────────┤
│                      Distributed Layer                          │
│  Redis distributed locks, Redlock, fencing tokens, leases       │
│  → See: DISTRIBUTED-LOCKING.md                                  │
├─────────────────────────────────────────────────────────────────┤
│                      Architectural Layer                        │
│  Sagas, eventual consistency, compensating transactions         │
│  → See: consistency/SAGAS-AND-COMPENSATION.md                   │
└─────────────────────────────────────────────────────────────────┘
```

Each layer addresses a different failure mode. A well-designed system uses **multiple layers** — for example, a checkout flow might use:

1. **Idempotency key** (application layer) — prevents duplicate checkout submissions
2. **`SELECT ... FOR UPDATE`** (database layer) — prevents overselling inventory
3. **Version column** (framework layer) — prevents lost updates on order edits
4. **Saga compensation** (architectural layer) — handles cross-step failures in the checkout pipeline

---

## 5. Decision Framework — Choosing a Strategy

### 5.1 Decision Matrix

| Factor                  | Optimistic (OCC)                                         | Pessimistic (PCC)                                           |
| :---------------------- | :------------------------------------------------------- | :---------------------------------------------------------- |
| **Conflict frequency**  | Low (< 1% of operations conflict)                        | High (> 5%, or contention spikes during events)             |
| **Cost of retry**       | Low (client can re-read and resubmit)                    | High (complex transaction expensive to re-execute)          |
| **Latency sensitivity** | Tolerant (can absorb occasional retries)                 | Intolerant (each operation must succeed on first attempt)   |
| **User interaction**    | Interactive (human can review conflict)                  | Automated (background job, no human in the loop)            |
| **Data access pattern** | Read-heavy, write-light (profile updates, catalog edits) | Write-heavy on hot rows (stock counters, seat reservations) |
| **Scalability**         | Higher throughput (no lock waiting)                      | Lower throughput (serialised access on contended rows)      |

### 5.2 Applied to Common API Entities

| Entity / Operation                                                  | Strategy                       | Rationale                                                                                                                                        |
| :------------------------------------------------------------------ | :----------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Product** (catalog updates by admin)                              | Optimistic (version column)    | Low contention — few admins update products simultaneously.                                                                                      |
| **Customer** (profile updates)                                      | Optimistic (version column)    | Very low contention — a customer updates their own profile.                                                                                      |
| **Order** (status transitions)                                      | Optimistic (version column)    | Status transitions are driven by the SAGA. Concurrent transitions indicate a system bug; `409 Conflict` serves as a safety net.                  |
| **Cart** (item updates)                                             | Optimistic (version column)    | Carts are customer-owned. Concurrent edits are rare (same customer, multiple tabs).                                                              |
| **Inventory** (stock reservation)                                   | **Pessimistic** (`FOR UPDATE`) | High contention during flash sales. Cost of SAGA compensation on failure is high. Stock invariant (`stock >= 0`) must be enforced atomically.    |
| **Inventory** (admin adjustment)                                    | Optimistic (version column)    | Low contention — admin operations are infrequent and can be retried.                                                                             |
| **Cross-process coordination** (cron deduplication, singleton jobs) | **Distributed lock** (Redis)   | Multiple application instances may attempt the same job. Database locks don't span processes. See [Distributed Locking](DISTRIBUTED-LOCKING.md). |

---

## 6. References

- Bernstein, P.A., Hadzilacos, V., & Goodman, N. (1987). _Concurrency Control and Recovery in Database Systems_. Addison-Wesley.
- Berenson, H., Bernstein, P., Gray, J., Melton, J., O'Neil, E., & O'Neil, P. (1995). "A Critique of ANSI SQL Isolation Levels." _Proceedings of ACM SIGMOD_, pp. 1–10.
- Kung, H.T. & Robinson, J.T. (1981). "On Optimistic Methods for Concurrency Control." _ACM Transactions on Database Systems_, 6(2), pp. 213–226.
- Gray, J. & Reuter, A. (1992). _Transaction Processing: Concepts and Techniques_. Morgan Kaufmann.
- Kleppmann, M. (2017). _Designing Data-Intensive Applications_. O'Reilly. Chapter 7: "Transactions."
