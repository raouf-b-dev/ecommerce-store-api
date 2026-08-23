# Database Architecture & Operations

This directory contains technical reference documents for data modeling, transaction isolation policies, indexing strategies, and database coding standards across `ecommerce-store-api`.

---

## 1. What Belongs Here

- **Data Modeling (`DATABASE-DESIGN.md`)**: Normalization rules, denormalization criteria, aggregate persistence, and relationship patterns.
- **Transaction Policies (`TRANSACTIONS.md`)**: Isolation level rules (`READ COMMITTED` vs `REPEATABLE READ`) and active implementation mappings.
- **Index Inventory & Policy (`INDEXES.md`)**: Indexing rules, composite ordering guidelines, partial status indexes, and active provisioned index inventory.
- **Schema Coding Standards (`DATABASE-STANDARDS.md`)**: `snake_case` naming conventions, table/column rules, primary key types, and mandatory audit timestamps.

---

## 2. What Does Not Belong Here

- **Application & Domain Architecture**: Domain aggregate boundaries, use case interfaces, and hexagonal layering rules live in `docs/architecture/`.
- **Infrastructure & Deployment Scripts**: TypeORM migration configuration and Docker compose live in `src/infrastructure/` and the repo root. Database backup/restore scripts and the release runbook live in `scripts/` and [RELEASE-BACKUP-RECOVERY.md](../infrastructure/RELEASE-BACKUP-RECOVERY.md).
- **Database CS Theory**: Academic deep dives into B-Tree node split algorithms or MVCC page visibility live in `docs/data/`.

---

## 3. Recommended Reading Order

1. [DATABASE-DESIGN.md](DATABASE-DESIGN.md): Relational schema design and data modeling.
2. [TRANSACTIONS.md](TRANSACTIONS.md): Transaction isolation policies and locking rules.
3. [INDEXES.md](INDEXES.md): Indexing policies and provisioned index inventory.
4. [DATABASE-STANDARDS.md](DATABASE-STANDARDS.md): Schema conventions and migration rules.
