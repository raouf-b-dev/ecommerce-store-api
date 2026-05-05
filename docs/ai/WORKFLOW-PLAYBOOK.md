# Workflow Playbook

This document defines `EWC v1` (Execution Workflow Contract v1) for consistent agent delivery.

## 1. Standard Task States

Every task progresses through:

1. `Intake`
2. `Plan`
3. `Execute`
4. `Verify`
5. `Handoff`

## 2. Required Evidence by State

### Intake

- Problem statement
- Scope boundaries
- Risk level (low/medium/high)

### Plan

- Approach summary
- Affected components
- Test strategy

### Execute

- Actual changes made
- Deviations from plan (if any)

### Verify

- Commands run
- Outcomes and gaps
- Risk re-evaluation

### Handoff

- What changed
- What remains
- Explicit assumptions

## 3. Decision Matrix

| Situation                                 | Action                          |
| ----------------------------------------- | ------------------------------- |
| Small local change with clear behavior    | Execute directly with tests     |
| Cross-module impact or uncertain behavior | Expand plan and add checkpoints |
| Security/data integrity impact            | Require escalation checkpoint   |
| Missing requirement detail with high risk | Stop and request clarification  |

## 4. Three Scenario Walkthroughs

### Scenario A: Feature Build

1. Intake: define feature boundaries and module ownership.
2. Plan: map use case, ports, and adapters.
3. Execute: implement domain-first, then adapters.
4. Verify: run unit + integration coverage for changed behavior.
5. Handoff: summarize behavior and residual risks.

### Scenario B: Bug Fix

1. Intake: capture failing behavior and reproduction.
2. Plan: isolate root cause and patch scope.
3. Execute: implement minimal fix.
4. Verify: regression test for bug path and nearby paths.
5. Handoff: include cause, fix rationale, and safeguards.

### Scenario C: Architecture Refactor

1. Intake: define invariant boundaries that cannot change.
2. Plan: identify seams and migration sequence.
3. Execute: refactor in safe slices.
4. Verify: run broader tests and spot-check flows.
5. Handoff: include compatibility and rollback notes.

## 5. Handoff Format

Use this format:

1. Summary of intent and result.
2. Files/components changed.
3. Tests and validation evidence.
4. Known gaps or follow-ups.
5. Assumptions and explicit risks.
