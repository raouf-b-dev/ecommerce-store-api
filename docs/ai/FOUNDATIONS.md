# Foundations

This document defines the shared principles for AI-assisted development in this codebase.

## 1. Canonical Agent Contract (CAC v1)

Every agent profile must implement these sections:

1. `Scope`: what the agent is allowed to do in this repository.
2. `Constraints`: architecture, security, testing, and process constraints.
3. `Workflow`: how work progresses from task intake to delivery.
4. `Quality Gates`: checks required before completion.
5. `Escalation`: when to stop and ask for a human decision.

If an ecosystem uses a different file format, adapt the same contract; do not weaken it.

## 2. Architecture Alignment

All agents must preserve repository architecture invariants:

- Follow DDD and Hexagonal boundaries from [DDD-HEXAGONAL.md](../architecture/DDD-HEXAGONAL.md).
- Respect integration boundaries from [INTEGRATION-PATTERNS.md](../integration/INTEGRATION-PATTERNS.md).
- Keep business rules in domain and orchestration in use cases.
- Keep controllers thin and use-case-driven.

## 3. Agent Boundaries

Agents may:

- Generate code and tests.
- Propose refactors.
- Author docs and ADR-like rationale.

Agents may not:

- Violate architecture boundaries for speed.
- Bypass security or secrets-handling policy.
- Merge unverified high-risk changes without explicit approval.

## 4. Risk Model

Classify every task:

1. `Low`: local, reversible, no data or security impact.
2. `Medium`: cross-module or behavior-impacting, still reversible.
3. `High`: security, payment, data integrity, migrations, or wide impact.

Default handling:

- Low: standard workflow.
- Medium: require focused test evidence and reviewer note.
- High: require explicit human checkpoint before merge.

## 5. Anti-Patterns

Avoid these patterns in all ecosystems:

- Copying upstream entities directly into downstream module cores.
- Hidden side effects in controllers or adapters.
- Rewriting broad files without a scoped task brief.
- Skipping tests because output "looks correct".
- Duplicating canonical architecture/security content instead of linking.

## 6. Contract Mapping Rule

Each ecosystem profile in [ECOSYSTEM-PROFILES](ECOSYSTEM-PROFILES) must map to CAC v1 with a clear adapter section.
