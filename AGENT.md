# Agent Governance and Development Policy

This is the canonical repository policy for AI-assisted development in `ecommerce-store-api`.

## 1. Order of Authority

When instructions conflict, resolve in this order:

1. Direct human task instruction for the active work.
2. This `AGENT.md` policy.
3. Canonical docs in `docs/`.
4. Tool-specific adapters (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.cursor/rules/*`, `.windsurfrules`).

## 2. Canonical References

- Generation conventions (single source): [docs/ai/CONVENTIONS.md](docs/ai/CONVENTIONS.md)
- Architecture rules: [docs/architecture/DDD-HEXAGONAL.md](docs/architecture/DDD-HEXAGONAL.md)
- Integration patterns: [docs/integration/INTEGRATION-PATTERNS.md](docs/integration/INTEGRATION-PATTERNS.md)
- Security: [docs/security/SECRETS-MANAGEMENT.md](docs/security/SECRETS-MANAGEMENT.md), [docs/security/JWT-RSA-JWKS.md](docs/security/JWT-RSA-JWKS.md)
- Quality gates: `[docs/ai/GOVERNANCE-AND-QUALITY-GATES.md](docs/ai/GOVERNANCE-AND-QUALITY-GATES.md)`
- Workflow: `[docs/ai/WORKFLOW-PLAYBOOK.md](docs/ai/WORKFLOW-PLAYBOOK.md)`
- Skills system: `[docs/ai/SKILLS-SYSTEM.md](docs/ai/SKILLS-SYSTEM.md)`

## Context Acceleration

Before starting any task, read `.agents/PROJECT-CONTEXT.md` for a compact project snapshot. This saves significant context-gathering time.

## 3. Non-Negotiables

1. Respect DDD + Hexagonal boundaries and inward dependencies.
2. Keep domain pure and framework-free.
3. Use ACL gateways for cross-context operations.
4. Keep controllers thin and use-case-driven.
5. Do not bypass ports with direct cross-context repository/entity imports.
6. Treat security-sensitive changes as high-risk by default.
7. Require verification evidence for behavior changes.

## 4. Conventions Application Rule

All generation/refactor work must apply [docs/ai/CONVENTIONS.md](docs/ai/CONVENTIONS.md).

This includes, at minimum:

- Layer placement rules
- Mapper standard
- Jobs/scheduler naming and workflow
- Notifications/socket usage boundaries
- Testing and Redis conventions

## 5. Skills and Mirrors

Writable skill source:

- `.agents/skills/*`

Mirrors (synced, do not edit manually):

- `.claude/skills/*`
- `.github/skills/*`

Sync command:

```bash
npm run skills:sync
```

Drift check:

```bash
npm run skills:check
```

## 6. Execution Lifecycle

Use `EWC v1` task states:

1. Intake
2. Plan
3. Execute
4. Verify
5. Handoff

Escalate when requirements are high-risk and ambiguous, or when architecture/security/data integrity is at risk.
