# Cursor and Windsurf Profile

This profile adapts `CAC v1` for IDE-agent workflows (Cursor, Windsurf).

## CAC Mapping

1. Scope: define task and repo boundaries.
2. Constraints: import non-negotiables from [AGENT.md](../../../AGENT.md).
3. Workflow: use [WORKFLOW-PLAYBOOK.md](../WORKFLOW-PLAYBOOK.md).
4. Quality Gates: enforce [GOVERNANCE-AND-QUALITY-GATES.md](../GOVERNANCE-AND-QUALITY-GATES.md).
5. Escalation: pause for high-risk ambiguity.

## Recommended Instruction Artifacts

- Cursor: `.cursor/rules/*` files for project policy and coding guardrails.
- Windsurf: project memory/rules files (tooling-specific naming may evolve by version).

## Best Practices

1. Keep IDE rule files modular (architecture, testing, security, workflow).
2. Prefer links to canonical docs for long policy sections.
3. Add explicit no-go rules for architecture violations.
4. Keep rule files version-aware and review them after IDE updates.

## Adapter Notes

- Use [AGENTS.md.template](../TEMPLATES/AGENTS.md.template) as canonical source text.
- Project rule files should be treated as adapters, not independent policy authorities.
