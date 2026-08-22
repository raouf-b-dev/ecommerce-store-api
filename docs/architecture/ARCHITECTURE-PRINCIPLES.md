# Architectural & Engineering Principles

This document defines the core principles and evaluation criteria used to guide architectural, design, and implementation decisions in `ecommerce-store-api`.

---

## 1. Domain-Driven Design & Hexagonal Integrity

1. **Domain Logic Belongs in Entities & Aggregates**: Core business rules, invariants, and state transitions MUST be encapsulated inside domain entities and value objects. Use cases coordinate workflows; they do not contain business logic.
2. **Aggregates Protect Invariants**: Aggregates are the sole boundary for transactional consistency. Mutating an aggregate root must leave all encapsulated invariants in a valid state.
3. **Repositories Accept and Return Domain Aggregates**: Repositories operate exclusively on domain entities and aggregates. Repositories MUST NEVER leak ORM entities, database schemas, or SQL structures to the application layer.
4. **Cross-Context Boundaries Use Explicit Ports**: Bounded contexts do NOT perform cross-domain database JOINs. Communication between bounded contexts happens exclusively via public application services, Anti-Corruption Layer (ACL) gateways, or domain events.

---

## 2. Persistence & Concurrency Principles

5. **Normalize Persistence Schemas by Default**: Store normalized relational state by default. Denormalize a field ONLY when measurable performance benchmarks or write-contention bottlenecks justify the consistency and maintenance cost.
6. **Every Denormalized Field Requires an Operational Audit**: Any field that duplicates derived state MUST be monitored by a background reconciliation or audit process.
7. **Prefer Optimistic Locking Unless Contention is High**: Default to version-based Optimistic Concurrency Control (OCC) for entity updates. Reserve pessimistic row locking (`SELECT ... FOR UPDATE`) strictly for high-contention shared numeric resources (e.g. stock allocation).

---

## 3. Operations & Maintenance Principles

8. **Reconciliation is Read-Only Observational**: Automated audit processes detect and log state drift; they do NOT perform automatic database writes to prevent masking root-cause software bugs or corrupting concurrent transactions.
9. **Maintenance Scans Use Keyset Cursor Pagination**: Background batch jobs and maintenance scans MUST use primary key cursor pagination (`findBatch`) rather than deep `OFFSET` pagination to avoid $O(N)$ index scan penalties.
10. **Significant Architectural Changes Require an ADR**: Any change modifying module boundaries, persistence patterns, transaction isolation levels, or core invariants MUST record its rationale in an Architecture Decision Record (`docs/architecture/adr/`).
