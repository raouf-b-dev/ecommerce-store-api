# GitHub Copilot Repository Instructions

Canonical policy is [AGENT.md](../AGENT.md).

## Core Constraints

- Preserve DDD/Hexagonal boundaries.
- Use ACL gateways for cross-context data access.
- Keep controllers thin and use-case centered.
- Follow testing and verification obligations.

## Workflow

Follow: Intake -> Plan -> Execute -> Verify -> Handoff.

## Skills and Prompts

- Auto-discover project skills from `.github/skills/*/SKILL.md` and `.agents/skills/*/SKILL.md`.
- Treat [docs/ai/README.md](../docs/ai/README.md) as the canonical AI workflow index.
- Prioritize `.github/skills/module-conventions-generator/SKILL.md` for scaffolding tasks.

## Escalation

Stop and request clarification for high-risk ambiguity (security, data integrity, irreversible operations).
