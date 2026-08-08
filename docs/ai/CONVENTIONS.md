# Conventions

This is the single source of truth for generation and refactor conventions used by skills and agent adapters.

## 1. Layer Placement Matrix

### Domain Layer

Path: `src/modules/[module]/core/domain`

- Pure business logic only.
- No ORM decorators.
- No NestJS decorators.
- No repository injection in domain services.

### Application Layer

Path: `src/modules/[module]/core/application`

- Depends on domain only.
- Use cases orchestrate domain logic.
- No infrastructure implementation dependencies.
- No business rules in application services.

### Primary Adapters

Path: `src/modules/[module]/primary-adapters`

- Controllers, DTOs, listeners, job handlers.
- Controllers inject and call use cases directly.
- Thin controller rule: return use-case result directly.
- **No domain event publishing.** Primary adapters (controllers, job handlers, listeners) must never inject `DomainEventPublisher` or emit domain events. Domain events are the responsibility of the Application Layer (use cases). Primary adapters only extract input, delegate to a use case, and return the result.

### Secondary Adapters

Paths: `src/modules/[module]/secondary-adapters`, `src/infrastructure`

- Repositories, gateways, schedulers, persistence entities, mappers.
- External libraries are allowed here only.

## 2. Dependency and Boundary Rules

1. Dependencies always point inward.
2. Do not import infrastructure into domain/application core.
3. Do not bypass ports with direct cross-context repository/entity imports.
4. Use ACL gateways for all cross-context operations.

## 3. ACL and Cross-Context Rules

1. Define gateway ports in `core/application/ports`.
2. Implement gateways in `secondary-adapters/gateways`.
3. Use downstream DTOs at port boundaries.
4. Place multi-context mutating use cases in the core domain owning the primary workflow.

## 4. Mapper Standard

For Domain <-> ORM mapping:

1. Define typed payload with `CreateFromEntity<TEntity>`.
2. Extract with `toPrimitives()` from domain entity.
3. Build explicit typed payload.
4. Create entity via `Object.assign(new Entity(), payload)`.

Reference utility:

- `src/infrastructure/mappers/utils/create-from-entity.type`

## 5. Notifications and Real-Time Rules

1. Use `NotificationScheduler` from use cases.
2. Do not call delivery gateway/service directly from use cases.
3. Use `SocketEventEmitter` abstraction for websocket events.
4. Use notifications for persistent/action-required events; sockets for ephemeral real-time sync.

## 6. Jobs and Scheduling Rules

### Naming

1. Job names: kebab-case prefixed by action (`process-checkout`, `deliver-notification`).
2. Process files: `[action].process.ts`.
3. Scheduler files: `bullmq.[module]-scheduler.ts` or `bullmq-[feature].scheduler.ts`.

### Structure & Architectural Placement (DIP Enforcement)

1. **Schedulers are Secondary (Outbound) Adapters**: Schedulers enqueue or configure background/cron jobs (e.g. BullMQ repeatable jobs). They MUST live in `secondary-adapters/schedulers/` and implement an abstract scheduler contract (port) defined in `core/domain/schedulers/` or `core/application/ports/` (e.g., `InventoryScheduler`, `NotificationScheduler`).
2. **Job Handlers are Primary (Inbound) Adapters**: Job handlers live in `primary-adapters/jobs/` and extend `BaseJobHandler<TData, TResult>`. They receive job executions from the processor/queue worker and delegate to application use cases.
3. **Distributed Jobs Must Not Rely on In-Process Scheduling**: Do not use NestJS `@Cron()` directly for jobs that must execute once across multiple API instances. `@Cron()` is process-local, so every active instance registers its own schedule. Use BullMQ repeatable/scheduled jobs configured via secondary adapter schedulers (`secondary-adapters/schedulers/`) for distributed execution safety and centralized Redis locking. Job handlers should also remain idempotent.
4. Cron patterns and job defaults must use `JobConfigService` for retry policies and options.

### New Scheduled Job Checklist

1. Add job name to `src/infrastructure/jobs/job-names.ts`.
2. Add retry policy to `src/infrastructure/jobs/job-retry-policies.ts`.
3. Add abstract scheduler port class in `core/domain/schedulers/` (or `core/application/ports/`).
4. Add secondary scheduler adapter in `secondary-adapters/schedulers/` implementing `OnModuleInit` and the scheduler port.
5. Add primary job handler in `primary-adapters/jobs/` extending `BaseJobHandler`.
6. Update processor routing in `[module].processor.ts`.
7. Register abstract port -> concrete adapter and job handler providers in `[module].module.ts`.

### Boundary Rule

Job handlers are **primary adapters** — they follow the same rules as controllers:

1. Extract data from the job payload.
2. Delegate to a use case.
3. Return the result.

Job handlers must **not** contain business logic, publish domain events, or inject `DomainEventPublisher`. If a SAGA step needs to emit an event (e.g., `checkout.saga.compensation`), that event must be emitted from the use case the job delegates to.

## 7. Testing Conventions

1. Co-locate unit tests with source (`*.spec.ts`).
2. Use module factories under `modules/[module]/testing/factories`.
3. Use typed mock repositories under `modules/[module]/testing/mocks`.
4. Every behavior change requires test impact analysis.

## 8. Redis Conventions

1. Use constants from `src/infrastructure/redis/constants/redis.constants.ts`.
2. Keep searchable schema fields in `src/infrastructure/redis/constants/redis.schemas.ts`.
3. Preserve index initialization/versioning behavior when schema changes.

## 9. Verification and Handoff

1. Classify risk (low/medium/high).
2. Run verification commands for changed behavior:
   - `npm run typecheck` — TypeScript compile check (`tsc --noEmit`); run for any code change.
   - `npm test` (or targeted `npx jest <path>`) — unit/integration tests for affected behavior.
   - `npm run test:arch` — hexagonal and cross-module boundary rules; run when layers, modules, ports, or adapters change.
3. Report outcomes, gaps, assumptions, residual risks.
4. Use handoff order: summary, changed scope, evidence, risks, assumptions.

## 10. Documentation Conventions

All documents under `docs/` fall into one of two categories. Every document must be clearly identified as one or the other.

### 10.1 Reference Documents (Academic, Portable)

Reference documents explain **universal concepts, patterns, and theory**. They are designed to be imported into any project and consumed by any engineer without modification.

**Identification**: The document's opening paragraph or subtitle explicitly states it is project-agnostic (e.g., _"This document is designed to be consumed by any engineering team."_).

**Rules**:

1. **Project-agnostic** — No project-specific tables, controller lists, module names, env vars, or "Current State" sections. No references to specific bounded contexts (e.g., "our Orders module").
2. **Reference-backed** — Every significant claim must cite a trusted source: published book with ISBN, IETF RFC, official framework documentation, POSIX/IEEE standard, or peer-reviewed paper. Do not cite uncertain chapter numbers or unverifiable sources.
3. **Framework examples are allowed** — Use NestJS, Express, or other framework code for illustration, but present them as _examples of the pattern_, not as the only way.
4. **Anti-patterns section** — Include an anti-patterns table so engineers know what to avoid.
5. **Decision rationale** — Explain _why_ the chosen approach was selected over alternatives, not just _what_ was chosen.
6. **No companion doc links** — Do not reference sibling project files (e.g., `ROADMAP.md`, `ARCHITECTURE.md`). The document must stand alone.

**Current reference documents**:

| Folder            | Document                                                               | Topic                               |
| ----------------- | ---------------------------------------------------------------------- | ----------------------------------- |
| `architecture/`   | `DDD-HEXAGONAL.md`, `CQRS.md`, `API-VERSIONING.md`, `RATE-LIMITING.md` | Architectural patterns              |
| `data/`           | `DATA-NORMALIZATION.md`, `EAV-PATTERN.md`                              | Data modelling theory               |
| `security/`       | `JWT-RSA-JWKS.md`                                                      | Cryptography & auth standards       |
| `infrastructure/` | `PROCESS-LIFECYCLE.md` (§1-6)                                          | OS process management               |
| `observability/`  | Foundation + pillars docs                                              | Observability theory                |
| `integration/`    | `INTEGRATION-PATTERNS.md`                                              | Cross-module communication patterns |

### 10.2 Applied Documents (Project-Specific)

Applied documents describe **how this project implements** a pattern, or contain operational runbooks, troubleshooting guides, and project-specific configuration.

**Rules**:

1. **May reference project internals** — Controller names, env vars, Docker commands, module-specific details are expected.
2. **Should link to the reference doc** for the underlying theory (e.g., `ADMIN-BOOTSTRAP.md` links to NIST/OWASP standards inline).
3. **Runbook format preferred** — Use symptom → diagnosis → fix structure for operational docs.
4. **Keep project state in dedicated files** — Controller inventories go in `FEATURES.md` or `README.md`, not in reference docs.

**Current applied documents**:

| Folder            | Document                                          | Topic                                                  |
| ----------------- | ------------------------------------------------- | ------------------------------------------------------ |
| `architecture/`   | `ARCHITECTURE.md`                                 | Project system context, bounded contexts, domain flows |
| `security/`       | `SECRETS-MANAGEMENT.md`, `ADMIN-BOOTSTRAP.md`     | Project secret handling, bootstrap                     |
| `infrastructure/` | `TROUBLESHOOTING.md`, `PROCESS-LIFECYCLE.md` (§7) | Runbook, project shutdown hooks                        |
| `testing/`        | `TESTING-TASK-TEMPLATE.md`                        | Project test plan template                             |
| root `docs/`      | `FEATURES.md`, `ROADMAP.md`, `README.md`          | Project state & progress                               |

### 10.3 Hybrid Documents

Some documents are **primarily reference** with a project-specific appendix (e.g., `PROCESS-LIFECYCLE.md` §1-6 is pure academic, §7 is "How This API Handles Shutdown"). This is acceptable if:

1. The reference sections can stand alone without the appendix.
2. The project-specific section is clearly separated (e.g., its own `##` heading).
3. The reference sections do not contain project-specific details.

### 10.4 Creating New Documentation — Checklist

Before writing a new document:

1. **Decide the type** — Is this universal theory (reference) or project-specific (applied)?
2. **Choose the correct folder** — Place it in the category folder matching its domain (`security/`, `data/`, `infrastructure/`, etc.), not always `architecture/`.
3. **If reference**: Write it so it can be dropped into any codebase. No project names, no module lists, no env vars.
4. **If reference**: Include a `## References` section at the bottom with verifiable sources (books with ISBN, RFCs with URLs, official docs with links).
5. **If applied**: Link to the relevant reference doc for theory.
6. **Update `docs/README.md`** — Add the new document to the documentation index.

### 10.5 Applied Document Maintenance Rule

When a code change implements, removes, or significantly modifies a feature:

1. **`FEATURES.md`** — Update the feature description or add the new feature entry.
2. **`ROADMAP.md`** — Mark the relevant task as complete (`✅`).
3. **`ADMIN-BOOTSTRAP.md`** — Update if auth/bootstrap flow changes.
4. **`ARCHITECTURE.md`** — Update if bounded context relationships change.

This is a mandatory part of the Definition of Done (see `GOVERNANCE-AND-QUALITY-GATES.md` §1).

### 10.6 Context Acceleration Rule

The file `.agents/PROJECT-CONTEXT.md` is a compact project snapshot designed for fast agent onboarding. Update it when:

1. A new module is added or removed.
2. A new cross-context gateway is created.
3. A significant feature ships (new domain entity, new infrastructure component).
4. The tech stack changes (new dependency, version bump).

## 11. Entity and Relation Conventions

To resolve circular module dependencies and Temporal Dead Zone (TDZ) initialization crashes under fast compiler engines like SWC:

1. **Relation Wrapper**: Always wrap bidirectional entity relation fields in TypeORM's `Relation<T>` type.
2. **Circular Relations**: Any relationship where two entities point to each other (e.g., `OrderEntity` <-> `OrderItemEntity`) must use the `Relation<T>` wrapper on the property declarations.
3. **Usage Example**:

   ```typescript
   import { Entity, ManyToOne, JoinColumn, Relation } from 'typeorm';
   import { OrderEntity } from './order.schema';

   @Entity('order_items')
   export class OrderItemEntity {
     @ManyToOne(() => OrderEntity, (order) => order.items)
     @JoinColumn({ name: 'order_id' })
     order: Relation<OrderEntity>;
   }
   ```

## 12. Type-Safety and Code Quality Rules

To ensure maximum type safety and prevent runtime errors:

1. **Avoid `any`**: Never use `any` if typing is possible. If a type is unknown or cannot be determined, use `unknown` instead.
2. **Library Escape Hatches**: The only acceptable exception for using `any` is when a third-party library's types are dynamic, circular, or poorly defined (such as the dynamic JSON/Search modules of the Node-Redis client in `RedisService`), where strict typing would trigger cascade compiler errors across consumers.
3. **Explicit Callbacks**: Always add explicit parameter typings (such as `(err: Error)`) to event handlers and callbacks instead of letting them fall back to implicit `any`.

## 13. Optimistic Locking (Version) Convention

`version` is a persistence/concurrency concern, not a business concept — it must never appear on domain entities, domain interfaces, or domain props. The domain entity has zero knowledge of versioning.

### 13.1 The Pattern: Version Travels as an Explicit Value, Not Entity State

The repository port returns the version **alongside** the entity, not inside it:

```typescript
// core/domain/repositories/product-repository.ts (port)
interface ProductRepository {
  findByIdForUpdate(
    id: number,
  ): Promise<Result<{ entity: Product; expectedVersion: number }>>;
  save(entity: Product, expectedVersion: number): Promise<Result<void>>;
}
```

The use case threads `expectedVersion` through as a plain value:

```typescript
async execute(command: UpdateProductCommand) {
  const result = await this.repo.findByIdForUpdate(command.productId);
  if (result.isFailure) throw new NotFoundError();

  const { entity, expectedVersion } = result.value;
  entity.rename(command.newName); // pure domain method — no version involved

  await this.repo.save(entity, expectedVersion);
}
```

The infrastructure adapter is where version actually gets used:

```typescript
// secondary-adapters/repositories/postgres.product-repository.ts
async findByIdForUpdate(id: number) {
  const orm = await this.ormRepo.findOneBy({ id });
  if (!orm) return ErrorFactory.RepositoryError('Not found');
  return Result.success({ entity: ProductMapper.toDomain(orm), expectedVersion: orm.version });
}

async save(entity: Product, expectedVersion: number) {
  const orm = ProductMapper.toEntity(entity); // never maps version
  orm.version = expectedVersion; // set right before save, purely for TypeORM's check
  await this.ormRepo.save(orm); // WHERE version = expectedVersion, throws on mismatch
}
```

**Domain entity**: zero knowledge of `version`, ever.
**Mapper**: never maps it either direction.
**Repository adapter**: only place that touches it, only for the microsecond it hands it to TypeORM.

### 13.2 Same-Request vs. Cross-Request Flows

This distinction determines where `expectedVersion` comes from:

**Same-request flow** (server-side load → mutate → save in one method call):
`expectedVersion` comes from the `findByIdForUpdate` call a few lines up in the use case. Nothing special to design.

**Cross-request flow** (GET loads it, user edits for a while, PUT saves it later):
There is no in-memory value to carry across two separate HTTP requests. `expectedVersion` must be serialized to the client on load and sent back by the client on save:

```typescript
// GET /products/:id response DTO
{ id, name, price, version: 3 }

// PUT /products/:id request body
{ name: "New Name", expectedVersion: 3 }
```

The `UpdateProductCommand` carries `expectedVersion` as a plain field (it is a command/DTO concern — perfectly fine to live there), and it flows into `repo.save(entity, command.expectedVersion)`. Nothing about the domain model changes between the two scenarios; only where the number comes from changes.

### 13.3 Where Version Is Allowed

| Layer                             | Allowed? | Form                                                         |
| --------------------------------- | -------- | ------------------------------------------------------------ |
| ORM schema (`@VersionColumn()`)   | ✅ Yes   | `version: number` with TypeORM decorator                     |
| Repository port (domain layer)    | ✅ Yes   | As a separate parameter or return field alongside the entity |
| Use case / application layer      | ✅ Yes   | As a plain value threaded through, never on the entity       |
| Command / DTO (primary adapter)   | ✅ Yes   | `expectedVersion` field on update commands and response DTOs |
| Domain entity / interface / props | ❌ Never | Not a business concept                                       |
| Domain-to-ORM mapper              | ❌ Never | Mapper must not map version in either direction              |

### 13.4 Anti-Pattern: In-Memory Version Cache

Do not try to solve the cross-request case with an in-memory cache in the repository (e.g., a `Map<id, version>` keyed by entity ID, populated on load, read on save). If the repository is a singleton (NestJS default DI scope) and two different requests load the same entity concurrently, the second load overwrites the first's cached version — so a save that should be rejected as stale can silently succeed. The version must ride with the specific call it belongs to — either as a same-call in-memory value or as an explicit param threaded through the command — never as shared mutable state keyed only by ID.

## 15. Documentation Taxonomy & Naming Standards

Every documentation artifact in the repository MUST comply with the 6-layer taxonomy and naming conventions:

1. **Document Classification**: Every document MUST be classified as **Reference** (timeless theory), **Applied** (project design/runbook), or **Hybrid** in its frontmatter metadata header.
2. **Directory Placement**:
   - `docs/architecture/` — Core architecture principles, domain architecture (`domains/`), project patterns (`project-patterns/`), and ADRs (`adr/`).
   - `docs/database/` — Relational schema design (`DATABASE-DESIGN.md`), transaction policies (`TRANSACTIONS.md`), indexing strategies (`INDEXES.md`), and coding standards (`DATABASE-STANDARDS.md`).
   - `docs/decision-guides/` — Cross-cutting decision frameworks helping engineers choose between patterns (`WHEN-TO-*`).
   - `docs/data/` — Timeless computer science and software engineering theory (`concurrency/`, `consistency/`, `performance/`).
   - `docs/infrastructure/` — Deployment, CI/CD, process lifecycles, and operational runbooks.
3. **Filename Standards**:
   - Use uppercase kebab-case for technical reference documents (`DATABASE-DESIGN.md`, `ENGINEERING-PRINCIPLES.md`).
   - ADRs MUST use 4-digit zero-padded numbering: `ADR-XXXX-[short-title].md` (e.g. `ADR-0004-inventory-integrity-and-concurrency.md`).
   - Engineering decision guides MUST begin with `WHEN-TO-*` (e.g. `WHEN-TO-DENORMALIZE-DATA.md`).
   - Codebase implementation patterns MUST end with `-PATTERN.md` (e.g. `REPOSITORY-PATTERN.md`).
   - Every major directory MUST include a `README.md` defining _What belongs here_, _What doesn't belong here_, and _Recommended reading order_.
4. **Document Layout Structure**:
   - Applied documents MUST be structured as **Timeless Policy / Enduring Rationale** (top half) followed by **Current Implementation Appendix** (bottom half).

## 16. Canonical References

- [../../AGENT.md](../../AGENT.md)
- [../architecture/DDD-HEXAGONAL.md](../architecture/DDD-HEXAGONAL.md)
- [../integration/INTEGRATION-PATTERNS.md](../integration/INTEGRATION-PATTERNS.md)
- [GOVERNANCE-AND-QUALITY-GATES.md](GOVERNANCE-AND-QUALITY-GATES.md)
- [WORKFLOW-PLAYBOOK.md](WORKFLOW-PLAYBOOK.md)
