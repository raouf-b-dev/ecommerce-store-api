# Skill Pack Template (`SPS v1`)

## Folder Layout

```text
<skill-name>/
  SKILL.md
  scripts/        # optional
  references/     # optional
  assets/         # optional
```

## `SKILL.md` Template

```markdown
---
name: <skill-name>
description: <what it does + when to use it>
---

# Purpose

State expected outcomes.

# Workflow

1. Step 1
2. Step 2
3. Step 3

# Inputs

List required context from user/repo.

# Outputs

Define expected artifacts and quality criteria.

# Failure and Escalation

State when to stop and ask for guidance.
```

## Validation Checklist

1. Name is lowercase-hyphen format.
2. Description includes trigger conditions.
3. Workflow is executable and deterministic.
4. Optional resources are justified and maintained.
5. Skill links to canonical docs rather than duplicating long policy.
