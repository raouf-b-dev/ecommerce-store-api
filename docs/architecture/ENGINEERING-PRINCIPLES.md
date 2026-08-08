# Engineering & Architectural Principles

This document defines the core principles, evaluation criteria, and project philosophy used to guide software design in `ecommerce-store-api`.

---

## 1. Architectural Principles

1. **Dependencies Point Inward**: Core domain models and business rules have ZERO dependencies on frameworks, ORMs, or NestJS infrastructure.
2. **Domain Logic is Pure**: Core business rules and invariants MUST be encapsulated inside domain entities and value objects.
3. **Repositories Accept and Return Domain Aggregates**: Repositories operate exclusively on domain entities and aggregates. Repositories MUST NEVER leak ORM entities or SQL structures.
4. **Normalize Persistence Schemas by Default**: Store normalized relational state by default. Denormalize a field ONLY when measurable performance benchmarks justify the consistency cost.
5. **Every Denormalized Field Requires an Operational Audit**: Any field that duplicates derived state MUST be monitored by a background reconciliation process.
6. **Prefer Optimistic Locking Unless Contention is High**: Default to version-based Optimistic Concurrency Control (OCC) for entity updates. Reserve pessimistic row locking strictly for high-contention shared numeric resources.
7. **Reconciliation is Read-Only Observational**: Automated audit processes detect and log state drift; they do NOT perform automatic database writes to prevent masking root-cause software bugs.
8. **Significant Architectural Changes Require an ADR**: Any change modifying module boundaries, persistence patterns, transaction isolation levels, or core invariants MUST record its rationale in an Architecture Decision Record (`docs/architecture/adr/`).
