---
name: quality-gates-check
description: Apply repository quality gates for AI-generated changes. Use when finalizing implementation, creating a handoff, or preparing a review.
---

# Purpose

Ensure code, security controls, and documentation satisfy repository quality gates and verification standards.

# Workflow

1. **Load Standards**: Load and apply [docs/ai/CONVENTIONS.md](../../../docs/ai/CONVENTIONS.md), section 9, and [docs/ai/GOVERNANCE-AND-QUALITY-GATES.md](../../../docs/ai/GOVERNANCE-AND-QUALITY-GATES.md).
2. **Risk Classification**:
   - Security/Authorization (IDOR, permissions, token handling): **High Risk** (requires full unit test coverage for authorization boundaries).
   - Domain Logic / State Machines / SAGA: **Medium Risk** (requires unit tests for state transitions and error/compensation paths).
   - Documentation / Formatting: **Low Risk** (requires link and index integrity check).
3. **Security Quality Gate**:
   - Verify that new or modified endpoints/use cases targeting owned resources contain test assertions for unauthorized/IDOR attempts (e.g., verifying `OwnedResourceAccessPolicy` or `CartOwnershipValidator` returns forbidden/failure when accessing another user's resource).
   - Confirm test suites utilize `src/testing/helpers/auth-payload.factory.ts` for clean test context setup.
4. **Automated Verification Execution**:
   - Run type checks (`npm run typecheck`).
   - Run compilation check (`npm run build`).
   - Run architecture checks (`npm run test:arch`).
   - Run relevant module unit tests (`npm run test`).
5. **Handoff Evidence**: Summarize verification outcomes, run results, and residual risks in EWC v1 handoff format.

# Inputs

- Task scope and changed files.
- [docs/ai/CONVENTIONS.md](../../../docs/ai/CONVENTIONS.md)
- [docs/ai/WORKFLOW-PLAYBOOK.md](../../../docs/ai/WORKFLOW-PLAYBOOK.md)
- [`.agents/PROJECT-CONTEXT.md`](../../../.agents/PROJECT-CONTEXT.md)

# Outputs

- Verification evidence block with test results.
- Security and risk review summary.

# Failure and Escalation

Escalate if required verification commands fail or high-risk authorization logic remains unverified.
