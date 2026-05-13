# Canonical Agent Policy Template

Use this template for project-level canonical policy (`AGENT.md`).

## 1. Purpose

Define why this policy exists and which repository it governs.

## 2. Order of Authority

1. Human instructions for the active task.
2. `AGENT.md` (canonical repository policy).
3. Canonical architecture/security/testing docs.
4. Tool-specific adapter files (`CLAUDE.md`, `GEMINI.md`, Copilot instructions, IDE rules).

## 3. Non-Negotiables

- Architecture boundaries (DDD/Hexagonal).
- Security and secrets rules.
- Testing obligations.
- Code review and traceability obligations.

## 4. Execution Workflow

Adopt `EWC v1` task states:

1. Intake
2. Plan
3. Execute
4. Verify
5. Handoff

## 5. Quality Gates

List required checks before completion.

## 6. Escalation Policy

Define stop conditions and required human checkpoints.

## 7. Ecosystem Adapter Map

Point to tool-specific adapters and state that they cannot override canonical policy.
