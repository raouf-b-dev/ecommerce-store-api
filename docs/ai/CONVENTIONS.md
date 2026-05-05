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

## 10. Canonical References

- [../../AGENT.md](../../AGENT.md)
- [../architecture/DDD-HEXAGONAL.md](../architecture/DDD-HEXAGONAL.md)
- [../integration/INTEGRATION-PATTERNS.md](../integration/INTEGRATION-PATTERNS.md)
- [GOVERNANCE-AND-QUALITY-GATES.md](GOVERNANCE-AND-QUALITY-GATES.md)
- [WORKFLOW-PLAYBOOK.md](WORKFLOW-PLAYBOOK.md)
