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
3. Scheduler files: `bullmq.[module]-scheduler.ts`.

### Structure

1. Job handlers extend `BaseJobHandler<TData, TResult>`.
2. Cron triggers live in scheduler implementations, not processors.
3. Use `JobConfigService` for retry/options.

### New Scheduled Job Checklist

1. Add name to `src/infrastructure/jobs/job-names.ts`.
2. Add retry policy to `src/infrastructure/jobs/job-retry-policies.ts`.
3. Add/extend scheduler port in `core/application/ports`.
4. Add scheduler adapter in `secondary-adapters/schedulers`.
5. Add handler in `primary-adapters/jobs`.
6. Update processor routing.
7. Register providers.

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
2. Run verification commands for changed behavior.
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

## 11. Canonical References

- [../../AGENT.md](../../AGENT.md)
- [../architecture/DDD-HEXAGONAL.md](../architecture/DDD-HEXAGONAL.md)
- [../integration/INTEGRATION-PATTERNS.md](../integration/INTEGRATION-PATTERNS.md)
- [GOVERNANCE-AND-QUALITY-GATES.md](GOVERNANCE-AND-QUALITY-GATES.md)
- [WORKFLOW-PLAYBOOK.md](WORKFLOW-PLAYBOOK.md)
