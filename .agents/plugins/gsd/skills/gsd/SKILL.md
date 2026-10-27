---
name: gsd
description: "Get Shit Done (GSD) context engineering layer for Antigravity. Enforces spec-driven planning locks, XML task scaffolding (<task type='auto'>), subagent token limit management, and persistent session memory."
metadata:
  version: "1.0.0"
  triggers:
    - gsd
    - get.?shit.?done
    - gsd.?plan
    - context.?engineering
    - spec.?driven
---

# Get Shit Done (GSD) for Antigravity

A context engineering and spec-driven development framework designed to eliminate **context rot**—the degradation in reasoning and accuracy that occurs when an AI agent's context window overflows.

## Core Rules

1. **🔒 Planning Lock:** No code may be written until `SPEC.md` is marked `FINALIZED`. Prevents building the wrong architecture.
2. **💾 State Persistence:** Update `STATE.md` after every discrete task and before ending turns.
3. **🧹 Context Hygiene & Token Budgeting:**
   - 0–50% token usage: Proceed normally.
   - 50–70% token usage: Compress context, summarize logs, use outlines.
   - 70%+ token usage: State dump to `STATE.md` and spawn a fresh isolated subagent.
4. **✅ Empirical Validation:** Proof required for every task via explicit commands (`npm test`, build checks, exit codes) — never accept "it should work".

## XML Workflow Scaffolding

GSD uses structured XML tags inside `PLAN.md` files to isolate instructions for subagents, preventing ambiguity:

```xml
<task type="auto">
  <name>Descriptive Task Name</name>
  <files>
    path/to/target1.js
    path/to/target2.jsx
  </files>
  <action>
    Specific step-by-step instructions.
    AVOID: Unnecessary dependencies or scope creep.
    USE: Established repository patterns and native APIs.
  </action>
  <verify>
    npm test / npm run build:react
  </verify>
  <done>
    Measurable acceptance criteria.
  </done>
</task>
```

## Scaffolding Files

- **`.gsd/SPEC.md`**: Foundational project specifications, requirements, non-goals, and constraints.
- **`.gsd/ARCHITECTURE.md`**: Structural blueprint, system components, and data flow.
- **`.gsd/STATE.md`**: Living project memory across sessions, current active decisions, blockers, and token health.
- **`.gsd/PLAN.md`**: Granular, atomic XML-tagged task execution plans.
