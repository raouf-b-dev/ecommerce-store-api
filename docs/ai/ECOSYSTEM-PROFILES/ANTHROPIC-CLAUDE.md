# Anthropic Claude Profile

This profile adapts `CAC v1` for Claude-based coding workflows.

## CAC Mapping

1. Scope: keep repository boundaries explicit in instruction file.
2. Constraints: import non-negotiables from [AGENT.md](../../../AGENT.md).
3. Workflow: enforce `Intake -> Plan -> Execute -> Verify -> Handoff` from [WORKFLOW-PLAYBOOK.md](../WORKFLOW-PLAYBOOK.md).
4. Quality Gates: use governance checklist from [GOVERNANCE-AND-QUALITY-GATES.md](../GOVERNANCE-AND-QUALITY-GATES.md).
5. Escalation: require stop-and-ask behavior for high-risk ambiguity.

## Recommended Instruction Artifacts

- `CLAUDE.md` as Claude-facing adapter policy.
- Mirror high-priority rules from `AGENT.md`; do not create competing policy.

## Best Practices

1. Keep `CLAUDE.md` narrow and policy-oriented.
2. Link to canonical architecture and security docs instead of embedding long copies.
3. Include explicit completion checklist and test evidence expectations.
4. Add a short "do not violate boundaries" section for DDD/Hex constraints.

## Adapter Notes

Use [CLAUDE.md.template](../TEMPLATES/CLAUDE.md.template) and fill in project-specific constraints.
