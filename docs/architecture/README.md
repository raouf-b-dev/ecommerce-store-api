# Architecture Documentation

This directory contains system architecture context, domain design documents, codebase implementation patterns, architecture decision records (ADRs), and decision guides for `ecommerce-store-api`.

---

## 1. What Belongs Here

- **System Architecture**: High-level system context, bounded context maps, domain flows, and core engineering principles.
- **Domain Architecture (`domains/`)**: System-specific domain design, aggregate boundaries, mathematical invariants, and sequence flows (e.g. `domains/INVENTORY.md`, `domains/ANALYTICS.md`).
- **Project Patterns (`project-patterns/`)**: Implementation conventions specific to this codebase (e.g. `REPOSITORY-PATTERN.md`, `RESULT-PATTERN.md`).
- **Decision Guides (`decision-guides/`)**: Frameworks helping engineers choose between patterns.
- **ADRs (`adr/`)**: Historical records explaining _why_ architectural decisions were made.

---

## 2. What Does Not Belong Here

- **Data Persistence & Indexing Policies**: Database schema rules, indexing strategies, and transaction isolation policies live in `docs/database/`.
- **Infrastructure & Operational Runbooks**: Kubernetes manifests, process lifecycles, and deployment pipelines live in `docs/infrastructure/`.
- **Timeless Computer Science Foundations**: Generic academic explanations of MVCC, Sagas, or B-tree internals live in `docs/data/`.

---

## 3. Recommended Reading Order

1. [ARCHITECTURE.md](ARCHITECTURE.md): System context and bounded context map.
2. [ENGINEERING-PRINCIPLES.md](ENGINEERING-PRINCIPLES.md): Architectural principles and DDD rules.
3. [ARCHITECTURAL-DECISION-RULES.md](ARCHITECTURAL-DECISION-RULES.md): Meta-rules for system growth.
4. [domains/INVENTORY.md](domains/INVENTORY.md): Inventory domain architecture reference.
5. [domains/ANALYTICS.md](domains/ANALYTICS.md): Admin analytics read models (revenue, periods, permissions).
6. [project-patterns/REPOSITORY-PATTERN.md](project-patterns/REPOSITORY-PATTERN.md): Repository implementation conventions.
