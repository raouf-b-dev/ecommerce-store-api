---
name: cost-efficient-agent
description: Reduce AI agent token consumption and tool call overhead. Apply automatically on every session to enforce context discipline, search-before-read patterns, and task scoping.
---

# Purpose

Minimize token burning and tool call waste while maintaining high architectural and code quality. Enforce disciplined context loading, efficient file access patterns, and clear task boundaries.

# Rules: Always Active

These rules apply to **every agent session** in this repository, regardless of task type.

## 1. Search Before Read

Before opening any file, confirm it contains the exact symbols or logic you need:

- Use `grep_search` to locate relevant files and line numbers first.
- Never list entire directories unnecessarily. Use specific paths or glob patterns.
- When calling `view_file`, request only the relevant line range using `StartLine`/`EndLine`.
- **Single-Pass Reading**: Do not re-read a file in the same session unless it has been modified since it was last read.

## 2. Context Acceleration: Load PROJECT-CONTEXT.md First

Always read [`.agents/PROJECT-CONTEXT.md`](../../../.agents/PROJECT-CONTEXT.md) first (see `AGENT.md` §Context Acceleration). It provides a compact overview of the architecture, security policy, modules, key patterns, and feature status.

- For **investigatory or quick questions**, answer directly using `PROJECT-CONTEXT.md` and targeted code snippets.
- Only load heavy canonical documentation (`CONVENTIONS.md`, `DDD-HEXAGONAL.md`, `INTEGRATION-PATTERNS.md`) when the task **requires code generation or structural refactoring**.
- **Do not** read the full `ROADMAP.md` (800+ lines) unless the task specifically involves roadmap planning. Use grep to find the relevant phase.

## 3. Loop and Blocker Guardrail

If you reach 15–20 consecutive tool calls without producing output or resolving the task:

- Stop immediately.
- Explain the blocker clearly to the user instead of looping.

## 4. Task Decomposition & Scope Control

When a prompt contains multiple requests:

1. Break down and execute tasks sequentially.
2. Do not gather context for downstream tasks while working on the current task.
3. Summarize completed work concisely with a final checklist.

## 5. Parallel Tool Call Execution

When tool calls have **no mutual dependencies**, batch them in a single tool call array:

- Reading 2+ independent files at once.
- Running parallel grep searches across separate subdirectories.
- Creating/updating distinct files simultaneously.

Never batch calls where one step's input depends on another step's output.

## 6. Minimal Context Loading & Code Source Preference

- Prefer production code as the primary source. Read test files only when needed to understand behavior, edge cases, or reproduce a bug.

## 7. Output Discipline & Response Brevity

- **No Code Back-Echoing**: Do not repeat file contents back to the user unless explicitly requested.
- **No Artifact Re-Summarization**: After creating or modifying an artifact, point the user to the file link and highlight only open questions or decisions.
- **Concise Formatting**: Use markdown tables and lists instead of long prose.
- **Clickable Links**: Always link to relevant files using `file:///` markdown syntax.

## 8. Forbidden Auto-Operations

Refer to `AGENT.md` §3 for high-risk operations requiring explicit user confirmation before execution.

# Inputs

- User prompt / task description.
- [`.agents/PROJECT-CONTEXT.md`](../../../.agents/PROJECT-CONTEXT.md).

# Outputs

- Task resolution achieved with minimal token overhead and maximal speed.

# Failure and Escalation

- Pause and report blockers if context is ambiguous or tool call guardrails are reached.
