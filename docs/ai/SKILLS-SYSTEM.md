# Skills System

This document defines `SPS v1` (Skill Pack Spec v1) for reusable AI skills.

## 1. Skill Taxonomy

Classify each skill before writing it:

1. `Execution Skill`: deterministic procedures (build, test, migrate, release tasks).
2. `Domain Skill`: repository-specific domain knowledge.
3. `Integration Skill`: external systems and toolchains.
4. `Quality Skill`: review, testing, observability, and hardening workflows.

## 2. SPS v1: Required Layout

Minimum skill folder layout:

```text
<skill-name>/
  SKILL.md
```

Recommended expanded layout:

```text
<skill-name>/
  SKILL.md
  scripts/
  references/
  assets/
```

## 3. SPS v1: Required `SKILL.md` Frontmatter

`SKILL.md` must include only:

```yaml
---
name: <skill-name>
description: <trigger + use-case description>
---
```

Rules:

- `name`: lowercase, digits, hyphen only.
- `description`: include clear trigger conditions and job-to-be-done.

## 4. SPS v1: Required Body Sections

Each `SKILL.md` should include:

1. Purpose and expected outcomes.
2. Workflow steps in imperative form.
3. Inputs required from user/context.
4. Outputs and quality checks.
5. Failure and escalation behavior.

## 5. Optional Resource Rules

- `scripts/`: deterministic and frequently reused logic.
- `references/`: longer docs loaded only when needed.
- `assets/`: templates/static resources used in outputs.

Do not add extra process docs inside a skill pack (`README.md`, changelog, etc.) unless explicitly required.

## 6. Trigger Design Best Practices

- Use precise trigger language in frontmatter descriptions.
- Keep scope narrow enough to avoid accidental activation.
- Prefer one strong skill over many overlapping weak skills.

## 7. Skill Lifecycle

1. Discover need from repeated workflow.
2. Define scope and success criteria.
3. Implement minimal skill.
4. Validate on realistic tasks.
5. Refine after observed failures.

## 8. Validation Checklist

Before adopting a skill:

1. Frontmatter valid and concise.
2. Workflow deterministic for fragile steps.
3. No policy conflicts with [AGENT.md](../../AGENT.md).
4. References link to canonical docs when applicable.
5. Example task can be completed end-to-end.

## 9. Single Source and Mirrors

Use one writable source for skills:

- `.agents/skills/*`

Treat these as mirrors (do not edit manually):

- `.claude/skills/*`
- `.github/skills/*`

Sync mirrors after any skill update:

```bash
npm run skills:sync
```

Check drift locally or in CI:

```bash
npm run skills:check
```

## 10. Convention Referencing Pattern

To avoid duplicated rule text across skills:

1. Keep detailed generation rules in [CONVENTIONS.md](CONVENTIONS.md).
2. Keep each `SKILL.md` focused on task-specific workflow.
3. In each skill, reference the exact conventions sections it depends on.
