---
name: architecture-boundary-guard
description: Review a diff or plan for layer, ACL, and authorization drift. Use when reviewing a PR, or after a change that touches ports, adapters, controllers, gateways, caller context, or resource access policies, before reporting it done.
---

# Architecture and authorization review

Rules: [ARCHITECTURE-INVARIANTS.md](../../../docs/ai/ARCHITECTURE-INVARIANTS.md), [ANTI-PATTERNS.md](../../../docs/ai/ANTI-PATTERNS.md), [CONVENTIONS.md](../../../docs/ai/CONVENTIONS.md) sections 1 to 4 and 8.

## Check

1. **Direction**: `core/domain` imports no NestJS, TypeORM, or infrastructure. `core/application` imports no adapter. Adapters depend on ports.
2. **Cross-context**: no other module's repository or entity imported. Gateways pass `SYSTEM_CALLER_CONTEXT` for internal calls. Analytics reads through SQL projections only.
3. **Primary adapters**: no business logic, no inline authorization, no `DomainEventPublisher`. Caller identity comes from `@CallerCtx()`, never from hand-parsed headers or tokens.
4. **Authorization**: use cases on owned resources take `CallerContext` and call `OwnedResourceAccessPolicy` (or `CartOwnershipValidator`). Flag forged `CallerContext` values and hardcoded user ids in production code.
5. **Persistence**: repositories return domain entities; mapper, OCC, and Redis rules from the conventions hold; `version` is absent from the domain.
6. **Types and tests**: AGENTS.md rule 1 holds; tests include the authorization denial.

## Run

`npm run test:arch`, then `npm run verify`.

## Report

Findings as `path:line - problem - fix`, ordered by severity. Escalate when business intent conflicts with an invariant or when an authorization path is unverified.
