# Decision Guide: Data Normalization vs. Denormalization

This decision guide defines the architectural criteria for deciding when to normalize database schemas versus when to intentionally denormalize fields in `ecommerce-store-api`.

---

## 1. Core Rule

> **Normalize by default.**  
> _Denormalize ONLY when performance benchmarks or concurrency bottlenecks justify the operational cost of auditing consistency._

---

## 2. Evaluation Framework

Before adding a denormalized column or duplicated field to an entity schema, answer these four questions:

1. **What expensive operation does this field avoid?**
   - _Valid Rationale_: Avoiding `SUM(quantity)` over millions of `reservation_items` during high-throughput checkout reservations.
   - _Invalid Rationale_: Saving a single addition `availableQuantity + reservedQuantity` (this should be a computed domain getter).
2. **What is the consistency model?**
   - Is it transactionally updated in the same database unit of work?
   - Is it eventually consistent via background reconciliation?
3. **How is drift detected?**
   - Every denormalized field MUST have an associated background audit or reconciliation mechanism (e.g., `InventoryReconciliationJob`).
4. **Is the computation pure?**
   - If a value can be computed deterministically in memory from properties on the same aggregate root, **do NOT persist it**.

---

## 3. Reference Summary

| Field                   | Persisted?      | Classification      | Justification                                                                                                      |
| :---------------------- | :-------------- | :------------------ | :----------------------------------------------------------------------------------------------------------------- |
| **`availableQuantity`** | Yes             | Transactional State | Instant availability checks during order placement without reading reservation items.                              |
| **`reservedQuantity`**  | Yes             | Denormalized State  | Eliminates multi-table `SUM()` read amplification during checkout; periodically audited by reconciliation.         |
| **`totalQuantity`**     | **No** (Getter) | Pure Derived Value  | Derived dynamically in domain aggregate (`available + reserved`); persisting it creates redundant invariant state. |
