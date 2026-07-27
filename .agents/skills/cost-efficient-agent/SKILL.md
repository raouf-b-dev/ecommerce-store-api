---
name: cost-efficient-agent
description: Reduce AI agent token consumption and tool call overhead. Apply automatically on every session to enforce context discipline, search-before-read patterns, and task scoping.
---

# Purpose

Minimize token and tool call waste without sacrificing output quality. Enforce disciplined context loading, efficient file access patterns, and clear task boundaries to keep agent sessions focused and cost-effective.

# Rules — Always Active

These rules apply to **every agent session** in this repository, regardless of task type.

## 1. Search Before Read

Before opening any file, confirm it contains what you need:

- Use `grep` or `find` to locate the relevant file(s) first.
- Never read entire directories. Use glob patterns or search to narrow targets.
- When reading a file, request only the line range you need (use `StartLine`/`EndLine`).
- If a file was already read in this session, do not re-read it unless it has been modified since it was last read.

## 2. Context Acceleration — Load PROJECT-CONTEXT.md First

Load [`.agents/PROJECT-CONTEXT.md`](../../../.agents/PROJECT-CONTEXT.md) first (see AGENT.md §Context Acceleration).

Only load canonical references (`CONVENTIONS.md`, `DDD-HEXAGONAL.md`, etc.) when the task **directly requires generation or refactoring** that those docs govern.

## 3. Loop and Blocker Guardrail

If you have made 20+ consecutive tool calls without producing output or resolving the active task, stop and explain the blocker to the user. Do not loop.

## 4. Task Decomposition

When a user prompt contains **multiple independent requests**:

1. Identify and list each discrete task before starting work.
2. Execute them sequentially, completing one before starting the next.
3. Do not load context for Task B while executing Task A.
4. Summarize completed tasks with a brief checklist at the end.

## 5. Parallel Tool Calls

When multiple tool calls have **no dependencies between them**, execute them in a single parallel batch. Common opportunities:

- Reading 2+ independent files simultaneously.
- Running grep searches across different directories.
- Creating multiple independent files.

Never parallelize calls where one depends on the output of another.

## 6. Minimal Context Loading

- **Do not** read `CONVENTIONS.md`, `DDD-HEXAGONAL.md`, or `INTEGRATION-PATTERNS.md` for investigatory questions (e.g., "where is X?", "explain Y", "what does Z do?").
- **Do** read them for generation/refactor tasks that create or modify source code.
- **Prefer** production code as the primary source. Read test files only when needed to understand behavior, edge cases, or reproduce a bug.
- **Do not** read the full `ROADMAP.md` (800+ lines) unless the task specifically involves roadmap planning. Use grep to find the relevant phase.

## 7. Output Discipline

- Do not re-summarize artifacts you just created. Point the user to them.
- Do not repeat file contents you just read back to the user unless they asked.
- Keep responses concise. Use tables and lists over prose for structured information.
- When creating artifacts, prefer focused documents over comprehensive ones.

## 8. Forbidden Auto-Operations

See AGENT.md §3 for forbidden auto-operations requiring explicit user confirmation.

# Inputs

- Task description from the user.
- [`.agents/PROJECT-CONTEXT.md`](../../../.agents/PROJECT-CONTEXT.md) (always load first).

# Outputs

- Task completion with minimal token overhead.

# Failure and Escalation

- If you encounter a loop or exceed the tool call guardrail, pause and report what's blocking progress.
