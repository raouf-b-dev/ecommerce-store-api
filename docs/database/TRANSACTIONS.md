# Transaction Isolation & Locking Policy

This document defines the transaction isolation policies, concurrency control rules, and active implementation mappings across `ecommerce-store-api`.

---

## 1. Timeless Policy & Rules

### 1.1 Default Isolation Policy

Operations executing single-aggregate reads and writes MUST use standard snapshot isolation without lock escalation.

### 1.2 Multi-Step Invariant Protection Policy

Operations that:

- Read multiple entities or shared balances,
- Calculate business invariants (e.g. stock reservation allocation), and
- Subsequently mutate those records within the same workflow,

**MUST execute within a transactional boundary that guarantees a stable snapshot throughout the transaction execution.**

### 1.3 High-Contention Locking Policy

Shared numeric resources subject to concurrent writes (e.g. physical stock quantities) MUST acquire explicit row-level write locks (`FOR UPDATE`) inside transactions to serialize concurrent mutations and prevent Lost Update anomalies.

---

## 2. Current System Implementation Mappings

| Bounded Context | Operations / Repositories                        | Isolation Policy           | Concurrency & Safety Controls                   | Current Implementation                                                       |
| :-------------- | :----------------------------------------------- | :------------------------- | :---------------------------------------------- | :--------------------------------------------------------------------------- |
| **Inventory**   | Stock Reservation (`save`, `release`, `confirm`) | Multi-Step Stable Snapshot | Pessimistic Write Lock + Stable Snapshot        | PostgreSQL `REPEATABLE READ` transaction + `SELECT ... FOR UPDATE` row lock. |
| **Orders**      | Order State Transitions                          | Single-Aggregate Default   | Optimistic Concurrency Control                  | PostgreSQL `READ COMMITTED` + atomic SQL `WHERE version = :expectedVersion`. |
| **Carts**       | Cart Session Storage                             | Ephemeral Scoped State     | `@Idempotent()` Interceptor + User Scoping      | Ephemeral RedisJSON state.                                                   |
| **Products**    | Catalog Management                               | Single-Aggregate Default   | Optimistic Concurrency Control                  | PostgreSQL `READ COMMITTED` + `@VersionColumn`.                              |
| **Payments**    | Payment Capture & Intent                         | Financial Intent Logging   | `@Idempotent()` Interceptor + SAGA Compensation | PostgreSQL `READ COMMITTED` + SAGA compensation listeners.                   |
