# Architecture Decision Records (ADRs)

---

Document Type: Reference & Index
Audience: Software Engineers & System Architects
Status: Active
Owner: Core Architecture Team

---

This directory records all historical Architecture Decision Records for `ecommerce-store-api`.

---

## 1. What is an ADR?

An Architecture Decision Record (ADR) captures a single significant architectural decision, including its context, rationale, alternatives considered, and consequences.

ADRs are **immutable historical documents**. They record _why_ a decision was made at a specific point in time. If a decision is changed later, a new ADR is written superseding the previous one.

---

## 2. ADR Naming Standard

All ADR filenames MUST follow 4-digit zero-padded numbering:
`ADR-XXXX-[short-title].md`

---

## 3. ADR Index Table

| ADR                                                             | Status   | Title / Summary                                                                                                                                                               | Date       | Supersedes | Superseded By | Target Scope                                                                     |
| :-------------------------------------------------------------- | :------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------- | :--------- | :------------ | :------------------------------------------------------------------------------- |
| **[ADR-0004](ADR-0004-inventory-integrity-and-concurrency.md)** | Accepted | Inventory Data Integrity, Concurrency & Schema Refactoring (Removal of `totalQuantity` persistence, CQRS read ports, atomic OCC update predicates, read-only reconciliation). | 2026-08-07 | —          | —             | `src/modules/inventory/`                                                         |
| **[ADR-0005](ADR-0005-typed-atomic-occ-update-contract.md)**    | Accepted | Typed atomic OCC update contract for versioned aggregates (`UpdateFromEntity` / `toUpdatePayload()`, ownership exclusions, QueryBuilder stamps `version` and `updatedAt`).    | 2026-08-14 | —          | —             | `src/modules/{products,orders,identity,carts}/`, `src/infrastructure/mappers/`   |
| **[ADR-0006](ADR-0006-redis-fail-open-cache-aside.md)**         | Accepted | Redis fail-open cache-aside (no health Proxy), fail-closed idempotency, generation invalidation + index drop, shared connection options + metrics.                            | 2026-08-21 | —          | —             | `src/infrastructure/redis/`, idempotency, cached repository DI, readiness/health |
