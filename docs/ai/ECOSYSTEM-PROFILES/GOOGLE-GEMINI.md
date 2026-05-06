# Google Gemini Profile

This profile adapts `CAC v1` for Gemini-focused agent workflows.

## CAC Mapping

1. Scope: define allowed repo operations and boundaries.
2. Constraints: enforce architecture and security links from [AGENT.md](../../../AGENT.md).
3. Workflow: use [WORKFLOW-PLAYBOOK.md](../WORKFLOW-PLAYBOOK.md) task states.
4. Quality Gates: enforce [GOVERNANCE-AND-QUALITY-GATES.md](../GOVERNANCE-AND-QUALITY-GATES.md).
5. Escalation: pause on high-risk unclear requirements.

## Recommended Instruction Artifacts

- `GEMINI.md` as Gemini-facing instruction adapter.
- Optional directory-level rule files if team process requires local specialization.

## Best Practices

1. Keep instruction files actionable and test-driven.
2. Preserve a single canonical policy source (`AGENT.md`) and adapter files for tool-specific phrasing.
3. Require command-backed verification before completion.
4. Explicitly define safe defaults when requirements are incomplete.

## Adapter Notes

Use [GEMINI.md.template](../TEMPLATES/GEMINI.md.template) for a portable baseline.
