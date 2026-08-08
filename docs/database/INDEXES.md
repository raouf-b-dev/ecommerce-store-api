# Database Indexing Policy & Inventory

This document defines the database indexing policy and tracks active provisioned database indexes across `ecommerce-store-api`.

---

## 1. Timeless Indexing Policy & Rules

1. **Query-Driven Provisioning**: Indexes MUST be justified by specific access patterns (`WHERE`, `ORDER BY`, `GROUP BY`) on high-volume routes.
2. **Minimize Write Amplification**: Avoid indexes on low-cardinality columns or low-frequency routes to protect write throughput.
3. **Partial Indexes for Status Scans**: Use partial indexes (`WHERE`) for low-cardinality status columns (e.g. `WHERE status = 'PENDING'`) to minimize index size and write overhead.
4. **Keyset Cursor Requirement for Maintenance Scans**: All background maintenance scans (reconciliation, exports, cleanup) MUST use primary key cursor pagination (`WHERE id > :afterId ORDER BY id ASC LIMIT :limit`) to leverage $O(1)$ B-tree index seeks.

---

## 2. Current Provisioned Index Inventory

### 2.1 Payments Schema (`payments`)

- **`idx_payments_user_status`**: Composite index on `(user_id, status)` optimizing customer payment history queries.

### 2.2 Products Schema (`products`)

- **`idx_products_active`**: Partial index on `is_active` (`WHERE is_active = true`) optimizing active catalog browsing routes.
- **`idx_products_category_active`**: Partial composite index on `(category_id, is_active)` (`WHERE is_active = true`) for category-filtered catalog queries.

### 2.3 Inventory & Reservation Schemas (`reservations`, `inventory`, `reservation_items`)

- **`idx_reservations_pending_status`**: Partial index on `status` (`WHERE status = 'PENDING'`) optimizing periodic expiration cleanup and background reconciliation scans.
- **`idx_reservation_items_product_id`**: Single-column index on `product_id` optimizing reconciliation aggregation queries (`GROUP BY product_id`).
- **`idx_inventory_product_id`**: Normalized unique index on `product_id`.
- **`idx_inventory_available_quantity`**: Normalized index on `available_quantity` for low stock threshold queries.
