---
name: quality-gates-check
description: Apply repository quality gates for AI-generated changes. Use when finalizing implementation, creating a handoff, or preparing a review.
---

# Purpose

Ensure code and docs changes satisfy verification and review standards.

# Workflow

1. Load and apply [docs/ai/CONVENTIONS.md](../../../docs/ai/CONVENTIONS.md), section 9.
2. Load governance gates from [docs/ai/GOVERNANCE-AND-QUALITY-GATES.md](../../../docs/ai/GOVERNANCE-AND-QUALITY-GATES.md).
3. Classify risk and map required checks.
4. Run verification commands and collect outcomes.
5. Summarize residual risks and assumptions in EWC v1 handoff format.

# Inputs

- Task scope and changed files.
- [docs/ai/CONVENTIONS.md](../../../docs/ai/CONVENTIONS.md)
- [docs/ai/WORKFLOW-PLAYBOOK.md](../../../docs/ai/WORKFLOW-PLAYBOOK.md)

# Outputs

- Verification evidence block.
- Reviewer-focused risk summary.

# Failure and Escalation

Escalate if required verification cannot run or high-risk behavior remains unverified.
