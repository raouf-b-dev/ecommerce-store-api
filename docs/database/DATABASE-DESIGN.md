---
Document Type: Applied Policy & Architecture
Audience: Database Engineers & Backend Developers
Status: Stable
Owner: Data & Persistence Team
Last Reviewed: 2026-08-07
---

# Database Design & Data Modeling

This document defines the data modeling decisions, aggregate persistence rules, normalization strategies, and active implementation details across `ecommerce-store-api`.

---

## 1. Timeless Data Modeling Policy

1. **Normalize Persistence Schemas by Default**: Relational entity schemas are normalized by default to minimize redundant data storage and eliminate state synchronization bugs.
2. **Denormalization Framework**: Fields are denormalized ONLY when performance benchmarks or write-contention bottlenecks justify the consistency and maintenance cost (e.g. `reservedQuantity` on `InventoryEntity`).
3. **Derived In-Memory Properties**: Values that can be computed dynamically from properties on the same aggregate root (e.g. `Inventory.totalQuantity`) are derived in memory and MUST NOT be persisted as database columns.
4. **Aggregate Persistence Boundaries**: Each relational table maps directly to a domain entity or aggregate root. Child entities owned strictly by an aggregate root use cascading persistence (`cascade: true`). Cross-aggregate references MUST store raw scalar IDs (`orderId`, `productId`) rather than establishing hard database ORM foreign key joins across context boundaries.

---

## 2. Current Implementation Appendix

### 2.1 Product Catalog Context

- **Access Pattern**: High-volume read queries for active catalog items filtered by category and availability.
- **Implementation**: PostgreSQL schema `products` mapping `ProductEntity` ORM definitions. Partial B-tree indexes (`WHERE is_active = true`) optimize read latency without write amplification.

### 2.2 Inventory & Reservation Context

- **Access Pattern**: High-frequency concurrent reads and writes for stock allocation during checkout; periodic full-table maintenance scans for reservation reconciliation and cleanup.
- **Implementation**: PostgreSQL schema `inventory` mapping `InventoryEntity` and `ReservationEntity`. `reservedQuantity` is denormalized on `InventoryEntity` and periodically audited by `ReconcileInventoryUseCase`. `findBatch` uses ID-based keyset cursor pagination (`WHERE id > :afterId ORDER BY id ASC LIMIT :limit`).

### 2.3 Customer Payments Context

- **Access Pattern**: Account-scoped history lookups and financial transaction status checks.
- **Implementation**: PostgreSQL schema `payments` mapping `PaymentEntity`. Composite user-status indexes optimize customer payment history lookups.
