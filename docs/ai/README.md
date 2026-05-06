# AI / Agentic Engineering

This folder is the canonical reference for building a multi-agent engineering workflow in this repository.

It complements [AGENT.md](../../AGENT.md) and the architecture docs in [docs/architecture](../architecture).

## Reading Order

1. [FOUNDATIONS.md](FOUNDATIONS.md)
2. [GOVERNANCE-AND-QUALITY-GATES.md](GOVERNANCE-AND-QUALITY-GATES.md)
3. [CONVENTIONS.md](CONVENTIONS.md)
4. [WORKFLOW-PLAYBOOK.md](WORKFLOW-PLAYBOOK.md)
5. [SKILLS-SYSTEM.md](SKILLS-SYSTEM.md)
6. [ECOSYSTEM-PROFILES/README.md](ECOSYSTEM-PROFILES/README.md)
7. [TEMPLATES/README.md](TEMPLATES/README.md)

## Core Specifications

1. `CAC v1` (Canonical Agent Contract): shared policy contract that every ecosystem profile must map to.
2. `SPS v1` (Skill Pack Spec): standard for writing reusable skills and skill resources.
3. `EWC v1` (Execution Workflow Contract): standard task lifecycle, required evidence, and handoff format.

## Scope

This documentation targets major globally used ecosystems:

- OpenAI Codex/GPT
- Anthropic Claude
- Google Gemini
- GitHub Copilot
- Cursor and Windsurf
- Generic OSS/CLI agents

The goal is broad interoperability and consistent engineering quality, not exhaustive support for every niche tool.

## Source of Truth Policy

- Project architecture rules remain canonical in [DDD-HEXAGONAL.md](../architecture/DDD-HEXAGONAL.md) and [INTEGRATION-PATTERNS.md](../integration/INTEGRATION-PATTERNS.md).
- Security controls remain canonical in [SECRETS-MANAGEMENT.md](../security/SECRETS-MANAGEMENT.md) and [JWT-RSA-JWKS.md](../security/JWT-RSA-JWKS.md).
- Agent docs must link to canonical docs instead of duplicating them.
