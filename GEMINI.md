# Gemini Adapter Policy

Canonical source of truth: [AGENT.md](AGENT.md).

## Default Instructions

1. Preserve architecture boundaries from [docs/architecture/DDD-HEXAGONAL.md](docs/architecture/DDD-HEXAGONAL.md).
2. Preserve integration boundaries from [docs/integration/INTEGRATION-PATTERNS.md](docs/integration/INTEGRATION-PATTERNS.md).
3. Follow quality gates from [docs/ai/GOVERNANCE-AND-QUALITY-GATES.md](docs/ai/GOVERNANCE-AND-QUALITY-GATES.md).
4. Follow workflow from [docs/ai/WORKFLOW-PLAYBOOK.md](docs/ai/WORKFLOW-PLAYBOOK.md).
5. Auto-load relevant skills from `.agents/skills/*/SKILL.md` when task intent matches.

## Escalation

Pause and request clarification for high-risk ambiguity (security, data integrity, cross-context behavior changes).

Primary generation skill:

- `.agents/skills/module-conventions-generator/SKILL.md`
