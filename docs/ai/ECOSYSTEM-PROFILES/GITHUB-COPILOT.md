# GitHub Copilot Profile

This profile adapts `CAC v1` for GitHub Copilot and GitHub-native workflows.

## CAC Mapping

1. Scope: define repository standards and task boundaries.
2. Constraints: mirror architecture/security/testing non-negotiables from [AGENT.md](../../../AGENT.md).
3. Workflow: align generation and review with [WORKFLOW-PLAYBOOK.md](../WORKFLOW-PLAYBOOK.md).
4. Quality Gates: apply [GOVERNANCE-AND-QUALITY-GATES.md](../GOVERNANCE-AND-QUALITY-GATES.md).
5. Escalation: require explicit checkpoints for high-risk edits.

## Recommended Instruction Artifacts

- `.github/copilot-instructions.md` as primary Copilot instruction file.
- Optional companion templates in PR descriptions for review rigor.

## Best Practices

1. Keep Copilot instructions short, strict, and link-heavy.
2. Emphasize architecture invariants and test obligations.
3. Require PR-level evidence for generated changes.
4. Include explicit anti-pattern list to reduce drift.

## Adapter Notes

Use [COPILOT-INSTRUCTIONS.md.template](../TEMPLATES/COPILOT-INSTRUCTIONS.md.template) and keep it synchronized with `AGENT.md`.
