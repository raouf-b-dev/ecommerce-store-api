# Database Coding Standards & Schema Conventions

This document defines project-wide coding conventions for database schemas, table/column naming, primary/foreign keys, and migration rules in `ecommerce-store-api`.

---

## 1. Naming Conventions

- **Table Names**: MUST be `snake_case` plural (e.g. `inventories`, `reservations`, `reservation_items`).
- **Column Names**: MUST be `snake_case` (e.g. `product_id`, `available_quantity`, `expires_at`).
- **Foreign Key Columns**: MUST use `{singular_entity}_id` naming (e.g. `order_id`, `product_id`).
- **Index Names**: MUST follow explicit naming standards:
  - Single Column: `idx_{table}_{column}`
  - Composite: `idx_{table}_{col1}_{col2}`
  - Partial Index: `idx_{table}_{purpose}`

---

## 2. Primary Keys & Foreign Keys

- **Primary Keys**: Primary keys MUST be auto-incrementing integers (`PrimaryGeneratedColumn('increment')`) or UUIDs.
- **Foreign Key Constraints**: Foreign keys MUST explicitly define cascade policies (e.g. `onDelete: 'CASCADE'`) for child entities owned by an aggregate root.

---

## 3. Mandatory Audit Columns & Concurrency Fields

- **Audit Timestamps**: Every relational table MUST include `created_at` (`@CreateDateColumn`) and `updated_at` (`@UpdateDateColumn`).
- **Optimistic Concurrency Version**: Every aggregate root table supporting concurrent writes MUST include `@VersionColumn() version: number`.
- **QueryBuilder OCC updates**: `@UpdateDateColumn()` and `@VersionColumn()` are **not** applied on QueryBuilder `UPDATE`. Adapters MUST set `updated_at = CURRENT_TIMESTAMP` and `version = version + 1` in `.set()`, and MUST include `WHERE id = :id AND version = :expectedVersion`.

---

## 4. Migration Rules

- Schema alterations MUST be created as explicit TypeORM migration scripts in `src/infrastructure/database/migrations/`.
- Direct `synchronize: true` is strictly prohibited in production environments.
