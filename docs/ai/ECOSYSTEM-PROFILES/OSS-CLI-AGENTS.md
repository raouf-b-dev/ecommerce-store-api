# OSS / CLI Agents Profile

This profile covers generic open-source and CLI-based coding agents.

## CAC Mapping

1. Scope: define repository scope and allowed actions.
2. Constraints: mirror [AGENT.md](../../../AGENT.md) non-negotiables.
3. Workflow: require [WORKFLOW-PLAYBOOK.md](../WORKFLOW-PLAYBOOK.md) state progression.
4. Quality Gates: enforce [GOVERNANCE-AND-QUALITY-GATES.md](../GOVERNANCE-AND-QUALITY-GATES.md).
5. Escalation: human checkpoint for high-risk uncertainty.

## Recommended Instruction Artifacts

- `AGENTS.md` (or tool-specific equivalent) at repository root.
- Optional local adapter files per tool runtime.

## Best Practices

1. Normalize all OSS agent prompts to CAC v1 fields.
2. Keep deterministic task briefs to reduce prompt drift.
3. Require verifiable command evidence and explicit assumptions.
4. Standardize handoff format for easier human review.

## Adapter Notes

Start from [AGENTS.md.template](../TEMPLATES/AGENTS.md.template) and adjust syntax only where tooling requires.
