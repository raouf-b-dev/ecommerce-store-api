# Architectural Invariants & Constitutional Rules

---

Document Type: Applied Policy
Audience: System Architects, Backend Developers & AI Agents
Status: Active
Owner: Architecture & Core Engineering Team

---

This document defines the **non-negotiable constitutional rules** of `ecommerce-store-api`. Violations of these invariants are treated as architectural defects, not code-style preferences.

---

## 1. The Non-Negotiable Invariants

1. **Domain Isolation**: Core domain entities and value objects MUST NOT import infrastructure, NestJS decorators, or ORM decorators.
2. **Persistence Ignorance**: Domain aggregates MUST be completely persistence-ignorant. Entity properties MUST NOT expose ORM `@Column()` or database schema types.
3. **Repository Boundaries**: Repositories operate exclusively on domain entities and aggregates. Repositories MUST NEVER leak ORM entities (`InventoryEntity`, `OrderEntity`) or database query builders to the application layer.
4. **Thin Controllers**: Primary adapters (controllers, job handlers, event listeners) MUST NOT contain business rules or perform multi-step orchestrations. Controllers delegate execution directly to use cases.
5. **No Domain Event Emission in Primary Adapters**: Controllers and job handlers MUST NOT inject `DomainEventPublisher` or emit domain events. Domain event emission is owned exclusively by application use cases.
6. **Cross-Context Isolation**: Bounded contexts MUST NOT perform cross-domain database JOINs or import repositories from other contexts. Cross-context communication MUST use Anti-Corruption Layer (ACL) gateways or domain events.
7. **Atomic Aggregate Mutations**: Mutations of an aggregate root MUST leave all encapsulated business invariants in a valid state atomically within a single transactional boundary.
8. **Normalize by Default**: Relational persistence schemas MUST be normalized by default. Denormalizing a field requires explicit performance benchmarking and MUST be paired with a background observational reconciliation audit.
9. **Read-Only Reconciliation**: Automated reconciliation and background audit jobs MUST be strictly read-only observational processes. They MUST NOT perform automated database writes to avoid masking software defects or corrupting concurrent transactions.
10. **Explicit Optimistic Concurrency**: Aggregate root updates providing an `expectedVersion` MUST execute atomic SQL updates checking `WHERE id = :id AND version = :expectedVersion` and throw `HttpStatus.CONFLICT` (`409 Conflict`) if zero rows are updated.

---

## 2. Dependency Direction Matrix

```
[ Primary Adapters ] (Controllers, Jobs, Listeners)
       │ (Allowed: calls Use Cases)
       ▼
[ Application Core ] (Use Cases, DTOs, Ports)
       │ (Allowed: uses Domain Models)
       ▼
[ Pure Domain Core ] (Entities, Value Objects, Invariants)
       ▲
       │ (Allowed: implements Domain Ports)
[ Secondary Adapters ] (Postgres Repositories, Redis, ACL Gateways)

Forbidden Dependency Violations (Architectural Defects):
❌ Primary Adapter ─────> ORM Entity / Database Schema
❌ Primary Adapter ─────> DomainEventPublisher (Event emission owned by Use Case)
❌ Application Core ───> Secondary Adapter / Infrastructure Implementation
❌ Pure Domain Core ────> NestJS / TypeORM / Framework Libraries
❌ Secondary Adapter ───> Cross-Context Repository / Table (Must use ACL Gateway)
```
