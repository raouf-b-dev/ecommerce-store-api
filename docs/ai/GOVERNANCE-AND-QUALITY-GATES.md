# Governance and Quality Gates

This document defines governance controls for AI-assisted development.

## 1. Definition of Done

A task is done only if all are true:

1. Requested behavior is implemented.
2. Architecture constraints are preserved.
3. Tests are added or updated to cover change risk.
4. Documentation is updated when contracts change.
5. Handoff evidence is complete.
6. Applied documentation is updated when features ship or change (`FEATURES.md`, `ROADMAP.md`).

## 2. Mandatory Quality Gates

### Gate A: Scope and Intent

- Task brief exists and is explicit.
- In-scope and out-of-scope items are listed.
- Applied docs impacted by the change are identified (`FEATURES.md`, `ROADMAP.md`, etc.).

### Gate B: Architecture and Security

- Change conforms to [DDD-HEXAGONAL.md](../architecture/DDD-HEXAGONAL.md).
- Integration style conforms to [INTEGRATION-PATTERNS.md](../integration/INTEGRATION-PATTERNS.md).
- Secrets and authentication paths conform to [SECRETS-MANAGEMENT.md](../security/SECRETS-MANAGEMENT.md) and [JWT-RSA-JWKS.md](../security/JWT-RSA-JWKS.md).

### Gate C: Verification

- `npm run typecheck` passes for code changes.
- Tests run at the right level (unit/integration/e2e as needed).
- `npm run test:arch` passes when module boundaries, ports, or adapters change.
- New failure modes are covered.
- Logs, metrics, or traces are considered when behavior changes.

### Gate D: Review Readiness

- PR summary explains what changed and why.
- Risks and rollback notes are present for medium/high-risk tasks.

## 3. Traceability Standard

Each non-trivial change should trace:

- `Requirement -> Implementation -> Tests -> Evidence`

Minimum evidence set:

1. Changed files summary.
2. Test command list.
3. Test outcomes (pass/fail and gaps).
4. Known residual risks.

## 4. Failure Handling

When an agent fails or cannot complete safely:

1. Stop mutation.
2. Record blocker with concrete context.
3. Propose next safe action.
4. Escalate for human decision if risk is medium/high.

## 5. Escalation Triggers

Escalate before completion if any apply:

- Ambiguous business rule with multiple plausible implementations.
- Security or data-integrity concern.
- Cross-context architectural ambiguity.
- Tooling limits that prevent reliable verification.

## 6. Concrete ADR Triggers & Lifecycle States

An Architecture Decision Record (ADR) MUST be written in `docs/architecture/adr/ADR-XXXX-[title].md` whenever a task involves:

1. **Transaction Isolation Changes**: Overriding transaction isolation levels (e.g. upgrading to `REPEATABLE READ`).
2. **Schema Normalization Decisions**: Adding or removing a denormalized field on a relational entity.
3. **Module Boundary Changes**: Creating a new bounded context or splitting an existing module.
4. **Integration Protocol Changes**: Introducing a new message broker, distributed lock manager, or event streaming infrastructure.
5. **Consistency Strategy Shift**: Switching between strong transactional consistency and eventual consistency.

### ADR Lifecycle States:

- **`Proposed`**: Written during design phase awaiting peer approval.
- **`Accepted`**: Approved and merged into main branch codebase.
- **`Deprecated`**: No longer recommended, superseded by a newer decision.
- **`Superseded`**: Obsoleted by a subsequent ADR (MUST link to new `ADR-XXXX`).

---

## 7. PR Design Review Checklist

Before marking a Pull Request ready for review, verify:

- [ ] **Aggregate Boundaries**: All mutated entities belong strictly to a single aggregate root.
- [ ] **Domain Purity**: Zero ORM or NestJS framework imports inside `core/domain/`.
- [ ] **Thin Controllers**: Controllers contain zero business logic and delegate execution directly to use cases.
- [ ] **Repository Contracts**: Repositories operate exclusively on pure domain entities.
- [ ] **Optimistic Locking**: Update queries specify atomic conditional SQL predicates checking `version = :expectedVersion`.
- [ ] **Verification**: `npm run typecheck` and relevant Jest test suites pass.
- [ ] **Documentation**: Updated `FEATURES.md`, `ROADMAP.md`, and relevant domain/applied docs.
- [ ] **ADR Checked**: Evaluated against ADR triggers and created `ADR-XXXX` if required.
