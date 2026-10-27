---
phase: 1
plan: 1
wave: 1
gap_closure: false
---

# Plan 1.1: Agent Optimization Ecosystem Deployment

## Objective
Establish the autonomous agent execution loop (Ralph Loop), spec-driven context engineering layer (GSD), and input token pruning optimizer (Ponytale) for the Antigravity Browser workspace.

## Context
Load these files for context:
- `.gsd/SPEC.md`
- `.gsd/ARCHITECTURE.md`
- `.gsd/STATE.md`
- `package.json`

## Tasks

<task type="auto">
  <name>Install and configure Ralph Loop plugin & tracking files</name>
  <files>
    .agents/plugins/ralph-loop/plugin.json
    .agents/plugins/ralph-loop/skills/ralph-loop/SKILL.md
    .agents/skills/ralph-loop/SKILL.md
    PRD.md
    progress.txt
    prompt.md
  </files>
  <action>
    Create the Ralph Loop plugin bundle and establish disk-based memory files:
    1. Define plugin manifest and SKILL.md for Ralph Loop.
    2. Mirror skill into .agents/skills/ralph-loop/.
    3. Generate PRD.md with browser core requirements.
    4. Generate progress.txt with initial log entries and completion marker rules.
    5. Generate prompt.md iteration template.
    AVOID: Keeping state purely in agent chat memory.
    USE: Deterministic append-only file operations.
  </action>
  <verify>
    Test file presence and run agy plugin validate against ralph-loop directory.
  </verify>
  <done>
    Ralph Loop plugin validates with exit code 0 and all 3 tracking files exist.
  </done>
</task>

<task type="auto">
  <name>Integrate GSD context engineering layer and XML scaffolding</name>
  <files>
    .agents/plugins/gsd/plugin.json
    .agents/plugins/gsd/skills/gsd/SKILL.md
    .agents/skills/gsd/SKILL.md
    .gsd/SPEC.md
    .gsd/ARCHITECTURE.md
    .gsd/STATE.md
    .gsd/PLAN.md
  </files>
  <action>
    Implement GSD context scaffolding to enforce planning locks and subagent isolation:
    1. Define gsd plugin manifest and skill.
    2. Populate SPEC.md with finalized requirements.
    3. Document component layout in ARCHITECTURE.md.
    4. Maintain token budget and session status in STATE.md.
    5. Structure execution tasks using XML tags in PLAN.md.
  </action>
  <verify>
    Confirm XML tags well-formed and agy plugin validate passes.
  </verify>
  <done>
    GSD scaffolding files operational and validated.
  </done>
</task>

<task type="auto">
  <name>Configure Ponytale Context Optimizer for Browser Runs</name>
  <files>
    .agents/plugins/ponytale/plugin.json
    .agents/plugins/ponytale/skills/ponytale/SKILL.md
    .agents/skills/ponytale/SKILL.md
    .agents/plugins/ponytale/config/ponytale.config.json
  </files>
  <action>
    Set up the Ponytale context optimizer module:
    1. Create plugin manifest and SKILL.md.
    2. Establish workflow configuration (ponytale.config.json) setting token ceilings, DOM pruning rules, and grep windowing.
    3. Mirror skill into .agents/skills/ponytale/.
  </action>
  <verify>
    Run agy plugin validate on ponytale plugin and verify config structure.
  </verify>
  <done>
    Ponytale plugin validated and configured for browser run token reduction.
  </done>
</task>

## Success Criteria
- [x] All XML tasks structured with `<task type="auto">`, `<name>`, `<files>`, `<action>`, `<verify>`, and `<done>`.
- [x] Subagent token limits isolated through bounded context files.
- [x] Full validation pass across all ecosystem plugins.
