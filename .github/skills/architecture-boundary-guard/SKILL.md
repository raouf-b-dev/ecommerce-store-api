---
name: architecture-boundary-guard
description: Enforce DDD, Hexagonal architecture, and security/IDOR boundaries for code changes. Use when implementing or reviewing any change touching module boundaries, ports/adapters, controllers, or resource authorization policies.
---

# Purpose

Prevent architecture drift, preserve bounded-context integrity, and ensure IDOR protection invariants remain intact.

# Workflow & Checklist

1. **Load Rules**: Load and apply [docs/ai/CONVENTIONS.md](../../../docs/ai/CONVENTIONS.md), especially sections 1 through 4, section 8, and security policies.
2. **Boundary Checks**:
   - Validate dependency direction (adapters depend on ports, domain has zero infrastructure imports).
   - Flag forbidden direct cross-context repository/entity imports (must use ACL gateways).
   - Confirm controller/use-case separation (thin controllers, zero business logic or inline authorization checks in controllers).
3. **IDOR & Security Context Guard**:
   - Verify that use cases operating on owned resources explicitly take `CallerContext` and delegate authorization decisions to `OwnedResourceAccessPolicy` or `CartOwnershipValidator`.
   - Ensure primary HTTP controllers extract caller context via `@CallerCtx()` rather than manually parsing HTTP headers or tokens.
   - Confirm that background jobs, schedulers, and ACL gateways explicitly pass `SYSTEM_CALLER_CONTEXT`.
   - Flag any forged `CallerContext` instances or hardcoded `userId` overrides in production code.
4. **Adapter & Mapper Compliance**: Validate mapper (`CreateFromEntity<T>`), job handler (`BaseJobHandler`), and Redis usage when touched.
5. **Boundary Verification**: Run `npm run typecheck`, then `npm run test:arch` when boundaries change, to verify hexagonal and cross-module boundary compliance.
6. **Findings Summary**: Produce structured findings with exact file paths and line numbers.

# Inputs

- Target files and diff context.
- [docs/ai/CONVENTIONS.md](../../../docs/ai/CONVENTIONS.md)
- [`.agents/PROJECT-CONTEXT.md`](../../../.agents/PROJECT-CONTEXT.md)

# Outputs

- Boundary & Security compliance report.
- List of architectural or authorization violations with corrective guidance.

# Failure and Escalation

Escalate when business intent conflicts with architecture invariants or IDOR protection rules.
