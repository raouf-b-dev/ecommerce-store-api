# AGENTS Adapter Policy

This file is a cross-tool adapter. The canonical policy is [AGENT.md](AGENT.md).

## Priority

1. Human task instruction.
2. [AGENT.md](AGENT.md).
3. Canonical docs under [docs](docs).
4. Tool-specific adapters (`CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.cursor/rules/*`, `.windsurfrules`).

## Default Behavior

1. Load and follow repository architecture constraints from [docs/architecture/DDD-HEXAGONAL.md](docs/architecture/DDD-HEXAGONAL.md).
2. Load integration constraints from [docs/integration/INTEGRATION-PATTERNS.md](docs/integration/INTEGRATION-PATTERNS.md).
3. Enforce quality gates from [docs/ai/GOVERNANCE-AND-QUALITY-GATES.md](docs/ai/GOVERNANCE-AND-QUALITY-GATES.md).
4. Follow workflow states from [docs/ai/WORKFLOW-PLAYBOOK.md](docs/ai/WORKFLOW-PLAYBOOK.md).
5. Auto-discover and apply relevant skills from `.agents/skills/*/SKILL.md`.

## Skills Discovery Hint

When the task matches a skill description, load that skill automatically. Prefer skills over ad-hoc reasoning for repeated workflows.

Primary generation skill:

- `.agents/skills/module-conventions-generator/SKILL.md`
