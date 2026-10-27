---
name: ralph-loop
description: "Autonomous iterative execution loop for Antigravity AI agents. Enforces fresh context per iteration, externalizes memory to disk (PRD.md, progress.txt, prompt.md), executes discrete tasks atomically, and manages model fallbacks."
metadata:
  version: "1.0.0"
  triggers:
    - ralph
    - ralph-loop
    - ralph.?loop
    - autonomous.?loop
    - run.?ralph
---

# Ralph Loop for Antigravity

Autonomous agent execution loop designed to overcome context window degradation ("context rot") and eliminate the need for constant human oversight by running continuous, atomic iterations with externalized file-based memory.

## Core Principles

1. **Fresh Context Per Iteration:** Never maintain long, meandering multi-hour chat conversations. Each loop iteration runs with clean context.
2. **Externalized Memory on Disk:**
   - `PRD.md`: Master requirements and backlog of discrete, checkable tasks.
   - `progress.txt`: Append-only persistent execution ledger (never rewrite or delete past history).
   - `prompt.md`: Standardized iteration prompt guiding agent actions.
3. **Atomic Task Execution:** Complete exactly ONE discrete task per iteration. Validate with tests/verifications, commit changes to Git, and append the record to `progress.txt`.
4. **Completion Marker:** When all tasks in `PRD.md` are marked complete, append the completion marker `COMPLETE_ALL_TASKS_FINISHED` to `progress.txt` to safely terminate the loop.

## Iteration Protocol

In every iteration:
```
1. READ `PRD.md` to identify the highest-priority unchecked task.
2. READ `progress.txt` to review recent decisions, commits, and current state.
3. EXECUTE the single task surgically. Do not touch unrelated code.
4. VERIFY the change using automated tests, build commands, or runtime assertions.
5. APPEND the result to `progress.txt` with timestamp, task name, and Git commit hash.
6. COMMIT changes to git with a clear, conventional commit message (`feat:`, `fix:`, `refactor:`).
7. CHECK if all PRD tasks are done. If yes, append `COMPLETE_ALL_TASKS_FINISHED` and exit.
```

## Model Fallback Chain

When hitting quota limits, rate limits, or transient API errors:
- **Primary:** Fast model (e.g., `Gemini 3 Flash` / `Gemini 3.8 Flash (High)`)
- **Fallback 1:** Reasoning model (e.g., `Claude Sonnet 4.6 (Thinking)` or `Claude Opus 4.6`)
- **Fallback 2:** High-capacity pro model (e.g., `Gemini 3.1 Pro (High)`)

## Architecture Tracking Files

| File | Purpose | Location |
|------|---------|----------|
| `PRD.md` | Task specifications and acceptance criteria | Workspace root |
| `progress.txt` | Append-only execution history and state ledger | Workspace root |
| `prompt.md` | Loop execution prompt template | Workspace root |
