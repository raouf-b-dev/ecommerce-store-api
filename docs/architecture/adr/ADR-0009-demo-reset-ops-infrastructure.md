# ADR-0009: Hosted Demo Reset as Ops Infrastructure

- **Status**: Accepted
- **Date**: 2026-10-19
- **Deciders**: Engineering Core Team
- **Context**: Hybrid hosted demo seed reconcile for cron
- **Companion**: [HOSTED-DEMO.md](../../infrastructure/HOSTED-DEMO.md), [SEEDING.md](../../development/SEEDING.md)

---

## 1. Context & Problem Statement

The hosted demo needs `POST /v1/admin/demo/reset` (token-gated) and a shared pipeline with `npm run db:seed`. That work orchestrates seed use cases already owned by Authentication, Products, Inventory, Carts, Orders, and Payments.

Placing it under `src/modules/demo` implied a domain bounded context. Demo has no aggregates, no ubiquitous language beyond "reset fixtures", and no write model of its own.

---

## 2. Decision

### Decision 1: Live under `src/infrastructure/demo/`

- **Decision**: Register `DemoModule` next to `HealthModule` / `PlatformModule` in `AppModule`. Keep a thin use case, secret guard, and a `DemoSeedRunner` port whose adapter calls **exported seed use cases** from the real BCs.
- **Rationale**: Matches generic / ops tooling (Evans: not core domain; Cockburn: primary adapter at the edge). Same packaging tier as health and platform config in this repo.

### Decision 2: Do not invent a Demo bounded context

- **Decision**: No demo domain entities. Catalog, auth, and stock rules stay in their modules.
- **Rationale**: Evans bounded contexts bound a model. Inventing a fake aggregate would be cargo-cult DDD (Vernon IDDD: application services may coordinate without owning the model).

### Decision 3: Keep Analytics in `src/modules/analytics/`

- **Decision**: Do not move Analytics into infrastructure.
- **Rationale**: ADR-0007 already defined Analytics as a **query-only composition / supporting** package with reporting language and SQL projections. Demo is ops cron, not an operator reporting subdomain.

### Decision 4: Wire via AppModule, not inside `InfrastructureModule`

- **Decision**: Import `DemoModule` from `AppModule` the way `HealthModule` is imported. Do not nest it under the global `InfrastructureModule` that domain modules already depend on for Redis/DB.
- **Rationale**: Avoid Nest circular module graphs (`InfrastructureModule` -> domain modules -> Redis).

---

## 3. Consequences

- **Positive**: Folder map matches theory (ops vs domain). Architecture tests do not treat Demo as a BC peer of Orders.
- **Trade-off**: Infrastructure package depends on domain Nest modules for DI. Acceptable for a composition root / ops adapter; seed use cases remain the boundary.
- **Rejected**: Host/`src/app` composition package (cleaner in some Clean Architecture trees, unused in this Nest layout). Splitting reset endpoints into each BC (worse ops API). Fake Demo aggregates.

---

## 4. References

1. Evans, E. (2003). _Domain-Driven Design_. Addison-Wesley. Bounded Context; Core / Supporting / Generic Subdomains.
2. Cockburn, A. (2005). Hexagonal Architecture. Primary adapters drive the application from outside.
3. Vernon, V. (2013). _Implementing Domain-Driven Design_. Addison-Wesley. Application services coordinate; do not invent empty aggregates.
4. Fowler, M. _Service Layer_ / Process Manager notes: cross-aggregate orchestration without owning the domain model.
