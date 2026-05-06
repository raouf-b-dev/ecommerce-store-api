# OpenAI Codex / GPT Profile

This profile adapts `CAC v1` for OpenAI-driven workflows.

## CAC Mapping

1. Scope: define repository boundaries and permitted operations.
2. Constraints: enforce architecture/security/testing constraints from [AGENT.md](../../../AGENT.md).
3. Workflow: follow [WORKFLOW-PLAYBOOK.md](../WORKFLOW-PLAYBOOK.md).
4. Quality Gates: follow [GOVERNANCE-AND-QUALITY-GATES.md](../GOVERNANCE-AND-QUALITY-GATES.md).
5. Escalation: stop on high-risk ambiguity.

## Recommended Instruction Artifacts

- `AGENT.md` at repository root as canonical policy.
- Optional scoped instruction files in subdirectories when modules need local rules.

## Best Practices

1. Keep agent policy concise and non-duplicative; link to canonical architecture docs.
2. Prefer deterministic tool calls and command evidence in handoff.
3. Separate planning from execution for high-risk tasks.
4. Use consistent risk classification and escalation paths.

## Adapter Notes

- Treat `AGENT.md` as the source of truth.
- Use templates in [TEMPLATES](../TEMPLATES) to project the same policy into other ecosystems.
