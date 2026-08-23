---
Document Type: Applied Domain Architecture
Audience: Backend Engineers & System Architects
Status: Stable
Owner: Inventory Core Team
Last Reviewed: 2026-08-07
---

# Inventory Domain Architecture

This document defines the timeless domain architecture, aggregate boundaries, lifecycle flows, and consistency models of the Inventory Bounded Context in `ecommerce-store-api`.

---

## 1. Domain Responsibilities

The Inventory Bounded Context is responsible for:

- Tracking physical product stock quantities (`availableQuantity`, `reservedQuantity`).
- Processing stock reservation and confirmation during checkout flows.
- Releasing reserved stock upon order cancellation or reservation expiration.
- Maintaining inventory health alerts (low stock threshold notifications).
- Periodically auditing denormalized inventory state against active reservation items.

---

## 2. Aggregate Boundaries & Entities

```
+-------------------------------------------------------------+
|                     Inventory Aggregate                     |
+-------------------------------------------------------------+
| - id: number (PK)                                           |
| - productId: number (Unique Index)                          |
| - availableQuantity: StockQuantity (Value Object)           |
| - reservedQuantity: StockQuantity (Value Object)            |
| - lowStockThreshold: number                                 |
| - lastRestockDate: Date | null                              |
| - version: number (Optimistic Concurrency Control)          |
|                                                             |
| Computed Property:                                          |
| + get totalQuantity(): number = available + reserved        |
+-------------------------------------------------------------+

+-------------------------------------------------------------+
|                    Reservation Aggregate                    |
+-------------------------------------------------------------+
| - id: number (PK)                                           |
| - orderId: number                                           |
| - status: ReservationStatus ('PENDING', 'CONFIRMED',        |
|                                'RELEASED', 'EXPIRED')       |
| - expiresAt: Date                                           |
| - items: ReservationItem[] (1:N)                            |
|     - productId: number                                     |
|     - quantity: number                                      |
+-------------------------------------------------------------+
```

---

## 3. Mathematical Business Invariants

### 3.1 Total Stock Derivative

$$\text{inventory.totalQuantity} = \text{inventory.availableQuantity} + \text{inventory.reservedQuantity}$$

### 3.2 Reservation Audit Invariant

$$\text{inventory.reservedQuantity} = \sum_{\substack{r \in \text{Reservations} \\ r.\text{status} = \text{PENDING} \\ r.\text{expiresAt} > \text{asOfDate}}} \text{item.quantity}$$

---

## 4. Denormalization Rationale

- **`reservedQuantity`**: Intentionally denormalized on `InventoryEntity`. During checkout, calculating `SUM(quantity)` over millions of `reservation_items` rows under high concurrent write loads would cause extreme DB read amplification. Maintaining `reservedQuantity` on `InventoryEntity` allows stock checks in $\mathcal{O}(1)$ time.
- **`availableQuantity`**: Maintained transactionally to perform instant stock availability validations during order reservation.
- **`totalQuantity`**: **Derived in memory**. Not persisted to database columns because saving it creates a redundant invariant (`total = available + reserved`) that can drift. `Inventory.totalQuantity` is computed dynamically as `this._availableQuantity.add(this._reservedQuantity).value`.

---

## 5. Stock Reservation & Confirmation Lifecycle

```
Customer                Checkout / Order          Reservation System           Inventory Aggregate
   │                           │                          │                             │
   │─── 1. Reserve Stock ─────>│                          │                             │
   │                           │── 2. Create PENDING ────>│                             │
   │                           │      Reservation         │                             │
   │                           │                          │── 3. Decrement Available ──>│
   │                           │                          │      Increment Reserved     │
   │                           │                          │      (Pessimistic Lock)     │
   │                           │<── 4. Reservation OK ────│                             │
   │                           │                          │                             │
   │─── 5. Payment Success ───>│                          │                             │
   │                           │── 6. Confirm Reservation>│                             │
   │                           │                          │── 7. Decrement Reserved ───>│
   │                           │                          │      (Stock Fulfilled)      │
```

---

## 6. Concurrency & Locking Strategy

1. **Checkout Stock Allocation**: Executed within a transactional boundary that guarantees a consistent snapshot for multi-step stock allocation while acquiring write locks on the aggregate root to serialize concurrent stock allocations for the same product.  
   _(Current implementation: PostgreSQL `REPEATABLE READ` transaction paired with pessimistic `FOR UPDATE` lock)._
2. **Standard Administrative Stock Updates**: Enforced via atomic conditional version matching to prevent lost updates when concurrent modifications occur.  
   _(Current implementation: Atomic SQL predicate `WHERE id = :id AND version = :expectedVersion` raising `409 Conflict` on zero rows affected)._

---

## 7. Background Reconciliation & Observational Audit

- **Purpose**: Audits the denormalized `reservedQuantity` state against active `PENDING` reservation totals without blocking production transactions.
- **Execution Mode**: Strictly **read-only**. Does NOT perform automated database repairs to avoid masking underlying software defects or overwriting concurrent write operations.
- **Batch Scanning**: Uses ID-based keyset cursor pagination (`findBatch({ afterId, limit })`) executing `SELECT * FROM inventory WHERE id > :afterId ORDER BY id ASC LIMIT :limit` for $O(1)$ index cursor seeks.
- **Reference Timestamp**: Captures `reconciliationAsOfDate = new Date()` at batch start to evaluate `expires_at > :reconciliationAsOfDate`, eliminating false drift reports from un-swept expired reservations.

---

## 8. Failure Scenarios & Recovery Procedures

| Scenario                             | Symptom                                              | Diagnostic Procedure                                                         | Recovery Action                                                                              |
| :----------------------------------- | :--------------------------------------------------- | :--------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------- |
| **Concurrent Version Mismatch**      | `HttpStatus.CONFLICT` (409)                          | Check concurrent stock update operations for the target product ID.          | Client retries stock update with latest `version`.                                           |
| **Reservation Drift Detected**       | `inventory_drift_count` Prometheus metric increments | Inspect `InventoryReconciliationJob` logger output for affected `productId`. | Operationally audit reservation log and issue inventory adjustment via `AdjustStockUseCase`. |
| **Expired Reservation Accumulation** | High pending reservation count                       | Inspect `ReservationCleanupJob` queue status in BullMQ dashboard.            | Trigger manual execution of reservation cleanup job.                                         |

---

## 9. Related Documents

- [docs/database/DATABASE-DESIGN.md](../../database/DATABASE-DESIGN.md): Relational schema access patterns and data modeling decisions.
- [docs/database/TRANSACTIONS.md](../../database/TRANSACTIONS.md): Transaction isolation policies and current locking implementations.
- [ADR-0004](../adr/ADR-0004-inventory-integrity-and-concurrency.md): Architectural rationale for totalQuantity removal, atomic OCC, and reconciliation.
- [WHEN-TO-DENORMALIZE-DATA.md](../../decision-guides/WHEN-TO-DENORMALIZE-DATA.md): Data denormalization evaluation framework.
