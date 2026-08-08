# Project Pattern: Repository Pattern Implementation

This document defines how the Repository Pattern is implemented across bounded contexts in `ecommerce-store-api`.

---

## 1. Architectural Role

In `ecommerce-store-api`, repositories serve as the gateway between domain aggregates and secondary storage adapters.

```
Application Use Case
        │
        ▼ (Depends on abstract contract)
[Domain Repository Interface]  <── Defined in src/modules/[module]/core/domain/repositories/
        ▲
        │ (Implements abstract contract)
[Postgres Repository Adapter]  <── Defined in src/modules/[module]/secondary-adapters/repositories/
        │
        ▼ (Maps between ORM Entity and Domain Aggregate)
   [TypeORM ORM]
```

---

## 2. Implementation Rules

1. **Abstract Class Contracts**: Domain repository contracts are defined as NestJS abstract classes in `core/domain/repositories/` so they serve as both TypeScript types and NestJS dependency injection tokens.
2. **Domain Aggregate Boundary**: Repository signatures accept and return pure domain entities or `Result<DomainEntity, RepositoryError>` monads. They **never** accept or return ORM entities (`InventoryEntity`, `OrderEntity`).
3. **Explicit Optimistic Concurrency**: Update operations accepting `expectedVersion` execute explicit atomic update statements checking `WHERE id = :id AND version = :expectedVersion` and returning `HttpStatus.CONFLICT` (409) if zero rows are updated.
4. **Pass-Through Caching**: Cached repository adapters decorate the PostgreSQL repository adapter, handling Redis serialization transparently without leaking cache logic to use cases.
