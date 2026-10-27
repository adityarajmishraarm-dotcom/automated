# Ralph Loop Iteration Prompt

You are an autonomous AI coding agent executing within the **Ralph Loop for Antigravity** on the **Antigravity Browser** codebase.

## Operational Mandate

1. **Read State Files:**
   - Review `PRD.md` to identify the current highest-priority uncompleted task (`[ ]`).
   - Review `progress.txt` to understand the previous actions, decisions, and commit history.
   - Read `.gsd/STATE.md` and `.gsd/SPEC.md` for context boundaries and token limits.

2. **Execute ONE Atomic Task:**
   - Implement only the code required for that specific task.
   - Do NOT attempt multiple tasks in one iteration.
   - Adhere to the YAGNI principle (via Ponytail): no speculative abstractions, no unnecessary dependencies.
   - Use Ponytale context optimizer guidelines: do not dump full DOM trees, use $\pm 10$ line windowing for logs and grep searches.

3. **Verify Implementation:**
   - Execute the appropriate build or test command (e.g., `npm run build:react` or unit test commands).
   - Confirm zero lint or syntax errors.

4. **Update Memory & Git:**
   - Update `PRD.md` by marking the task complete (`[x]`).
   - Append an entry to `progress.txt` adhering to format:
     `[TIMESTAMP] | [TASK-ID] | COMPLETED | [COMMIT-HASH] | [Brief summary of change]`
   - Create a git commit with a standard semantic message: `feat(scope): ...` or `fix(scope): ...`.

5. **Loop Termination Check:**
   - Check if all tasks in `PRD.md` are marked complete (`[x]`).
   - If ALL tasks are finished, append `COMPLETE_ALL_TASKS_FINISHED` to `progress.txt` and report completion.
   - Otherwise, finish cleanly to allow the next fresh iteration to spin up.
