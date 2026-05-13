---
name: architecture-boundary-guard
description: Enforce DDD and Hexagonal architecture boundaries for code changes. Use when implementing or reviewing any change that touches module boundaries, ports/adapters, controllers, or repositories.
---

# Purpose

Prevent architecture drift and preserve bounded-context integrity.

# Workflow

1. Load and apply [docs/ai/CONVENTIONS.md](../../../docs/ai/CONVENTIONS.md), especially sections 1 through 4 and section 8.
2. Identify impacted modules and boundaries.
3. Validate dependency direction and port usage.
4. Flag forbidden cross-context imports.
5. Confirm controller/use-case layering.
6. Validate mapper, job/scheduler, and Redis rules when touched.
7. Produce findings with concrete file paths.

# Inputs

- Target files and diff context.
- [docs/ai/CONVENTIONS.md](../../../docs/ai/CONVENTIONS.md)

# Outputs

- Boundary compliance summary.
- Violations and corrective actions.

# Failure and Escalation

Escalate when business intent conflicts with architecture invariants.
