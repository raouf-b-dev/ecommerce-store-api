# ADR-0004: Inventory Data Integrity, Concurrency & Schema Optimization

- **Status**: Accepted
- **Date**: 2026-08-07
- **Deciders**: Engineering Core Team
- **Context**: Inventory Management Context

---

## 1. Context & Problem Statement

The inventory module previously contained a redundant CQRS read-port abstraction (`InventoryAuditQueryPort`), persisted an unjustified derived field (`totalQuantity`), and lacked an automated background audit mechanism to detect drift in the intentionally denormalized `reservedQuantity` field.

We needed to record why specific design decisions were made regarding total quantity persistence, query repository interfaces, optimistic locking implementation, and background reconciliation.

---

## 2. Decision Outcomes

### Decision 1: Remove Persisted `totalQuantity`

- **Decision**: Remove `@Column() totalQuantity` from `InventoryEntity` ORM schema and calculate it in memory via aggregate getter `get totalQuantity(): number`.
- **Rationale**: `totalQuantity` is a derived value (`available + reserved`). Persisting it created a database column that required manual synchronization across every stock operation. Removing column persistence eliminates an entire class of database state corruption.

### Decision 2: Remove Redundant CQRS Read Port

- **Decision**: Remove `InventoryAuditQueryPort` and `PostgresInventoryAuditQueryAdapter`.
- **Rationale**: Querying the write-model `inventory` table without projections, JOINs, or separate read databases is not CQRS; it was redundant mapping over the write table. Domain queries are handled directly via repository methods (`findMany`, `findBatch`).

### Decision 3: Enforce SQL-Level Atomic Optimistic Concurrency

- **Decision**: Replace TypeORM implicit `save()` versioning on manual mapping with explicit atomic SQL update statements checking `WHERE id = :id AND version = :expectedVersion`.
- **Rationale**: Standard ORM mapping constructs can silently bypass version validation when mapping domain aggregates back to ORM entities. Explicit atomic SQL update predicates guarantee `HttpStatus.CONFLICT` (409) errors if concurrent writes occur.

### Decision 4: Expose Keyset Cursor Pagination (`findBatch`) for Maintenance Jobs

- **Decision**: Expose `findBatch(query: InventoryBatchQuery)` using deterministic primary key cursor pagination (`WHERE id > :afterId ORDER BY id ASC LIMIT :limit`) alongside user-facing search `findMany()`.
- **Rationale**: Full-table maintenance scans using `OFFSET` pagination suffer performance degradation and skipped records as PostgreSQL scans offset pages. Keyset cursor pagination provides $O(1)$ index seeks.

### Decision 5: Make Reconciliation Audit Read-Only

- **Decision**: `ReconcileInventoryUseCase` detects and logs `reservation_drift` without auto-repairing database records.
- **Rationale**: Automated database writes during reconciliation risk masking root-cause software bugs and overwriting legitimate concurrent checkout transactions.

---

## 3. Alternatives Considered

1. **Keep Persisting `totalQuantity`**:  
   _Rejected_ because it duplicates derived state and introduces database-level synchronization risks.
2. **Compute `reservedQuantity` on demand during checkout**:  
   _Rejected_ because checkout allocation would require expensive `SUM()` aggregations over `reservation_items` during every stock check under high concurrency.
3. **Automated Reconciliation Repair**:  
   _Rejected_ because reconciliation is intended to be observational. Automatic repair could overwrite legitimate concurrent changes or mask underlying software defects.

---

## 4. Consequences

### Positive

- **Eliminates Persistence of Derived Values**: Prevents column state drift between total, available, and reserved stock.
- **SQL-Enforced Concurrency**: Atomic conditional updates prevent lost updates when `expectedVersion` is supplied.
- **High-Performance Batch Auditing**: ID keyset cursor pagination avoids $O(N)$ scan penalties during full table scans.

### Negative

- **Denormalized State**: `reservedQuantity` remains denormalized on `inventory` to maintain high checkout throughput, requiring ongoing background audit monitoring.
- **Transient Discrepancy Reports**: High checkout activity may temporarily produce discrepancy reports while concurrent transactions are in progress; these resolve naturally on subsequent runs.
