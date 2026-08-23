# Index Design

A deep-dive into practical index design: composite index column ordering rules, covering indexes (`INCLUDE`), partial indexes, the write penalty of indexes, and applied index recommendations for the e-commerce store API modules.

> _Part of the [Database Performance](PERFORMANCE-FOUNDATIONS.md) series. For index type internals (B-tree, GIN, etc.), see [Index Internals](INDEX-INTERNALS.md)._

---

## 1. Composite Index Column Ordering

The order of columns in a composite index significantly affects which queries can use it and how efficiently.

### 1.1 Rule 1: Equality Columns First, Range Columns Last

```sql
-- Query: WHERE user_id = ? AND created_at > ?
-- ✅ Optimal: equality first, range second
CREATE INDEX idx_optimal ON orders (user_id, created_at);
-- PostgreSQL navigates to the exact user_id, then scans the range

-- ❌ Suboptimal: range first
CREATE INDEX idx_suboptimal ON orders (created_at, user_id);
-- Scans the date range, then filters by user_id within each date
```

### 1.2 Rule 2: High-Selectivity Columns First (Both Equality)

```sql
-- user_id: 10,000 distinct values; status: 5 distinct values
-- ✅ Optimal: high-selectivity first
CREATE INDEX idx_optimal ON orders (user_id, status);
-- Narrows to ~0.01% immediately

-- ⚠️ Less optimal: low-selectivity first
CREATE INDEX idx_suboptimal ON orders (status, user_id);
-- Narrows to ~20% first, then filters
```

### 1.3 Rule 3: Match `ORDER BY` Direction

```sql
-- Query: WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
-- ✅ Optimal: index provides both filter and sort
CREATE INDEX idx_optimal ON orders (user_id, created_at DESC);
-- No separate sort step needed

-- ❌ Suboptimal: sort column missing or wrong direction
CREATE INDEX idx_suboptimal ON orders (user_id);
-- Must fetch all matches and sort them
```

> **Column ordering principle (Winand, 2012)**: Place equality-filtered columns first, then range-filtered columns last. This maximises the number of index columns the query can utilise.

---

## 2. Covering Indexes (Index-Only Scans)

A **covering index** includes all columns required by a query, enabling PostgreSQL to satisfy the query entirely from the index without accessing the table heap. This is called an **index-only scan**.

```sql
-- Query: SELECT user_id, status, created_at FROM orders
--        WHERE user_id = ? AND status = 'ACTIVE'
--        ORDER BY created_at DESC;

-- Standard index (requires heap access for created_at):
CREATE INDEX idx_orders_user_status ON orders (user_id, status);

-- Covering index (enables index-only scan):
CREATE INDEX idx_orders_user_status_covering
ON orders (user_id, status)
INCLUDE (created_at);
```

### 2.1 The `INCLUDE` Clause (PostgreSQL 11+)

`INCLUDE` adds columns to index leaf pages as **non-key** columns:

- ✅ Stored in leaf pages (enables index-only scans)
- ❌ Do NOT participate in sort order (payload, not keys)
- ❌ Do NOT increase internal node size (leaf-only)
- ❌ Cannot be used in `WHERE` clauses

> _"An index-only scan can be 10-100x faster than an index scan with heap fetches, because it eliminates the random I/O pattern of looking up each row in the heap."_
> Source: Winand, M. (2012). SQL Performance Explained, §3.3.

### 2.2 Visibility Map Requirement

Index-only scans require the **Visibility Map** (VM) to confirm that heap pages contain only all-visible tuples. Recently modified pages not yet vacuumed force a fallback to regular index scan. This is why **regular vacuuming is essential** for index-only scan performance. See [Storage & Maintenance](STORAGE-AND-MAINTENANCE.md) §2.

---

## 3. Partial Indexes

A **partial index** includes only rows satisfying a `WHERE` clause, reducing size and focusing the index on the queried subset.

```sql
-- Only active carts (most queries filter for active)
CREATE INDEX idx_carts_active ON carts (user_id) WHERE is_active = true;

-- Only pending orders (monitoring and processing)
CREATE INDEX idx_orders_pending ON orders (created_at) WHERE status = 'PENDING_PAYMENT';

-- Only non-null verification tokens
CREATE INDEX idx_users_verification ON users (verification_token) WHERE verification_token IS NOT NULL;
```

### 3.1 Benefits

| Benefit                      | Explanation                                                            |
| :--------------------------- | :--------------------------------------------------------------------- |
| **Smaller size**             | 5% active rows → ~5% the size of a full index.                         |
| **Faster maintenance**       | Fewer entries to update on writes.                                     |
| **Better cache utilisation** | Smaller index fits entirely in shared buffers.                         |
| **Stronger optimisation**    | PostgreSQL uses it when the query's WHERE implies the index predicate. |

> **Critical matching rule**: PostgreSQL only uses a partial index if the query's `WHERE` clause **logically implies** the index predicate. The implication must be syntactically recognisable. `WHERE status IN ('PENDING', 'CONFIRMED')` does **not** match `WHERE status = 'PENDING'`.

---

## 4. The Write Penalty

Every index adds a **write penalty**: each `INSERT`, `UPDATE` (of indexed columns), or `DELETE` must update every relevant index.

| Factor          | Impact                                                                                                                                                            |
| :-------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Insert**      | Each index requires an O(log n) write per row.                                                                                                                    |
| **Update**      | Old index entry marked dead, new entry created (delete + insert).                                                                                                 |
| **Delete**      | Entry marked dead; reclaimed by VACUUM.                                                                                                                           |
| **HOT updates** | If updated columns are NOT indexed and the new tuple fits on the same page, PostgreSQL skips index updates entirely. Excessive indexing **prevents** HOT updates. |

> **Guideline**: Every index must justify its existence by a measurable read improvement. Audit unused indexes periodically via `pg_stat_user_indexes.idx_scan`.

---

## 5. Index Health Monitoring

### 5.1 Finding Unused Indexes

```sql
SELECT
  schemaname, relname AS table_name,
  indexrelname AS index_name,
  idx_scan AS times_used,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### 5.2 Finding Duplicate Indexes

```sql
SELECT
  a.indrelid::regclass AS table_name,
  a.indexrelid::regclass AS index_a,
  b.indexrelid::regclass AS index_b,
  pg_size_pretty(pg_relation_size(a.indexrelid)) AS size_a
FROM pg_index a
JOIN pg_index b ON a.indrelid = b.indrelid
  AND a.indexrelid < b.indexrelid
  AND a.indkey = b.indkey;
```

### 5.3 Table I/O Statistics (Cache Hit Ratio)

```sql
SELECT
  relname AS table_name,
  heap_blks_read AS disk_reads,
  heap_blks_hit AS cache_hits,
  round(100.0 * heap_blks_hit / NULLIF(heap_blks_hit + heap_blks_read, 0), 2) AS cache_hit_pct
FROM pg_statio_user_tables
ORDER BY heap_blks_read DESC LIMIT 10;
```

---

## 6. Applied Index Strategy: E-Commerce Store API

### 6.1 Orders Module

```sql
CREATE INDEX idx_orders_user_status ON orders (user_id, status);
CREATE INDEX idx_orders_user_created ON orders (user_id, created_at DESC);

CREATE INDEX idx_orders_pending ON orders (created_at)
WHERE status IN ('PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING');

CREATE INDEX idx_orders_list_covering
ON orders (user_id, status, created_at DESC) INCLUDE (total_amount);
```

### 6.2 Inventory Module

```sql
CREATE INDEX idx_inventory_low_stock ON inventory (stock_level) WHERE stock_level <= 10;

CREATE INDEX idx_reservations_status_expires ON reservations (status, expires_at)
WHERE status = 'ACTIVE';
```

### 6.3 Products Module

```sql
CREATE INDEX idx_products_category_active ON products (category_id) WHERE is_active = true;

CREATE INDEX idx_products_category_price ON products (category_id, price)
WHERE is_active = true;
```

### 6.4 Identity Module

```sql
CREATE INDEX idx_users_active ON users (last_login_at DESC) WHERE is_active = true;
```

---

## 7. Index Audit Checklist

Before deploying new indexes:

```
□ The index addresses a MEASURED slow query (not hypothetical)
□ EXPLAIN ANALYZE confirms the index is used by the planner
□ Column order matches the query's filter/sort pattern
□ A partial index was considered (can the scope be narrowed?)
□ A covering index was considered (can heap fetches be eliminated?)
□ The index does not duplicate an existing index
□ The write penalty is acceptable (write frequency × index count)
□ The index size is reasonable (pg_relation_size)
□ Autovacuum thresholds are tuned for high-update tables
```

---

## 8. References

- Winand, M. (2012). _SQL Performance Explained_. https://use-the-index-luke.com/
- PostgreSQL Documentation. _Chapter 11: Indexes_. https://www.postgresql.org/docs/current/indexes.html
- PostgreSQL Documentation. _§11.8: Partial Indexes_. https://www.postgresql.org/docs/current/indexes-partial.html
- PostgreSQL Documentation. _§11.9: Index-Only Scans and Covering Indexes_. https://www.postgresql.org/docs/current/indexes-index-only-scans.html

