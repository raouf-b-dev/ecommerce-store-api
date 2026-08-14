---
name: module-conventions-generator
description: Generate or refactor modules, jobs, cache layers, gateways, mappers, and security policies to match ecommerce-store-api conventions. Use when creating new implementation artifacts so structure, naming, layering, access control, and testing stay consistent automatically.
---

# Purpose

Apply canonical repository conventions during code generation and refactoring with zero architectural or security drift.

# Workflow & Generation Standards

1. **Load Conventions**: Load and apply [docs/ai/CONVENTIONS.md](../../../docs/ai/CONVENTIONS.md), especially sections 1 through 8.
2. **Identify Artifact Type**:
   - Controller (Primary Adapter)
   - Use Case / Application Service
   - Domain Entity / Aggregate Root / Policy
   - Gateway / ACL Adapter (Secondary Adapter)
   - Job Handler / Cron Scheduler
   - Repository / Cache Adapter
   - Mapper (`CreateFromEntity<T>`, and `UpdateFromEntity` / `toUpdatePayload()` for OCC updates)
3. **IDOR & Security Authorization Standards**:
   - **Primary Adapters (Controllers)**: Annotate endpoints with `@RequirePermissions(...)` when fine-grained permissions are required. Inject execution context using `@CallerCtx() callerContext: UserCallerContext`.
   - **Use Cases**: Always receive `callerContext: CallerContext` in command/query DTOs or arguments for operations targeting owned resources.
   - **Access Control Policies**: Invoke `OwnedResourceAccessPolicy.canViewResource(...)` or `canMutateResource(...)` within use cases for single-entity access control, or `OwnedResourceAccessPolicy.resolveListScope(...)` for query scoping. Use `CartOwnershipValidator` for cart boundaries.
   - **System Callers**: Background jobs, internal event listeners, and ACL gateway adapters must pass `SYSTEM_CALLER_CONTEXT` to bypass user-level ownership checks.
4. **Layer Placement & Naming**:
   - Core Domain: `src/modules/<module>/core/domain/`
   - Application Layer: `src/modules/<module>/core/application/`
   - Primary Adapters: `src/modules/<module>/primary-adapters/` (controllers, guards, decorators)
   - Secondary Adapters: `src/modules/<module>/secondary-adapters/` (typeorm, redis, acl)
5. **Testing Conventions**:
   - Unit tests for use cases and controllers must utilize security test factories: `src/testing/helpers/auth-payload.factory.ts` (`createTestCallerContext`, `createTestJwtPayload`) or module command factories.
   - Verify both success paths and unauthorized/IDOR failure paths (e.g., attempting to view/modify another user's cart, order, or payment without appropriate permissions).
6. **Verification & Handoff**: Run tests and type checks (`npm run test`, `npm run typecheck`) and produce verification evidence.

# Inputs

- Requested feature/change context.
- [docs/ai/CONVENTIONS.md](../../../docs/ai/CONVENTIONS.md)
- [`.agents/PROJECT-CONTEXT.md`](../../../.agents/PROJECT-CONTEXT.md)
- [`AGENT.md`](../../../AGENT.md)

# Outputs

- Convention-compliant, IDOR-safe, fully tested implementation changes.
- Verification summary with unit test evidence and residual risk analysis.

# Failure and Escalation

Escalate if requested behavior conflicts with DDD boundaries, security policies, or required quality gates.
