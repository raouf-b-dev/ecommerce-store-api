# Decision Guide: Database Index Design Strategy

This decision guide establishes principles for provisioning, naming, and maintaining PostgreSQL indexes in `ecommerce-store-api`.

---

## 1. Indexing Principles

1. **Query-Driven Provisioning**: Every index must be justified by specific `WHERE`, `ORDER BY`, or `GROUP BY` patterns in production or background jobs.
2. **Minimize Write Amplification**: Indexes speed up reads but slow down `INSERT`, `UPDATE`, and `DELETE` operations. Avoid adding indexes for low-frequency queries.
3. **Use Partial Indexes for Status Filters**: When filtering on low-cardinality status columns (e.g., `WHERE status = 'PENDING'`), use partial indexes (`WHERE`) to keep index sizes small and fast.

---

## 2. Index Classification & Naming Conventions

| Index Type        | Naming Standard             | Example                            | When to Use                                       |
| :---------------- | :-------------------------- | :--------------------------------- | :------------------------------------------------ |
| **Single Column** | `idx_{table}_{column}`      | `idx_reservation_items_product_id` | Foreign key lookups and single-column filters.    |
| **Composite**     | `idx_{table}_{col1}_{col2}` | `idx_payments_user_status`         | Queries filtering on `(col1 AND col2)`.           |
| **Partial Index** | `idx_{table}_{purpose}`     | `idx_reservations_pending_status`  | Status-driven scans (`WHERE status = 'PENDING'`). |

---

## 3. Keyset Cursor Index Requirement

All background batch maintenance operations (reconciliation, exports, cleanup) MUST sort by primary key or indexed unique keys (`ORDER BY id ASC`) to leverage keyset cursor pagination (`WHERE id > :afterId LIMIT :limit`), avoiding `OFFSET` performance degradation.
