# Architectural Invariants

Applied policy. A violation is an architectural defect, not a style issue.

## 1. Invariants

1. **Domain isolation**: domain entities and value objects never import infrastructure, NestJS, or ORM decorators.
2. **Persistence ignorance**: aggregates expose no `@Column()` or schema types.
3. **Repository boundaries**: repositories take and return domain entities only. ORM entities and query builders never reach the application layer.
4. **Thin primary adapters**: controllers, job handlers, and listeners hold no business rules and no multi-step orchestration. They call a use case.
5. **No events from primary adapters**: they never inject `DomainEventPublisher`. Use cases own event emission.
6. **Cross-context isolation**: no cross-context JOINs and no imports of another context's repository. Use ACL gateways or domain events. Query-only modules (Analytics) read through SQL projections instead.
7. **Atomic aggregate mutations**: a change to an aggregate root leaves every invariant valid inside one transaction.
8. **Normalize by default**: denormalizing a field needs a benchmark and a read-only reconciliation audit.
9. **Read-only reconciliation**: audit jobs observe and report. They never write, so they cannot mask defects or race live transactions.
10. **Explicit optimistic concurrency** (canonical rule): `version` is persistence-only and never appears on a domain entity, props, or mapper output. The repository port returns it beside the entity and accepts it as `expectedVersion`; use cases pass it as a plain value. The adapter runs one atomic `UPDATE ... WHERE id = :id AND version = :expectedVersion`, stamps `version + 1` and `updatedAt`, and returns `409 Conflict` when zero rows change. Never `save()` a detached entity with a hand-set version and never cache versions in the repository. Code: `write-repository` skill; rationale: [ADR-0005](../architecture/adr/ADR-0005-typed-atomic-occ-update-contract.md).

## 2. Dependency direction

```
Primary adapters (controllers, jobs, listeners)
        |  call
        v
Application core (use cases, ports, DTOs)
        |  use
        v
Domain core (entities, value objects, policies)
        ^
        |  implement ports
Secondary adapters (Postgres, Redis, ACL gateways)
```

Forbidden:

- Primary adapter to ORM entity or schema.
- Primary adapter to `DomainEventPublisher`.
- Application core to a secondary adapter or infrastructure implementation.
- Domain core to NestJS, TypeORM, or any framework library.
- Secondary adapter to another context's repository or table (use an ACL gateway).

Layer direction, cross-module core isolation, and no DTOs in core are enforced by `npm run test:arch`; the rest by review (`architecture-boundary-guard`).
