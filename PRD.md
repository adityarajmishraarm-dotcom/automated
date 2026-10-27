# Product Requirements Document (PRD) — Antigravity Browser Core

> **Status:** Active Execution
> **Orchestrator:** Ralph Loop for Antigravity
> **Tracking Ledger:** `progress.txt`
> **Iteration Prompt:** `prompt.md`

---

## 1. Executive Summary

The **Antigravity Browser** is a high-performance, autonomous, AI-native desktop browser (Chrome & Brave alternative) built with an in-process Chromium engine and an Electron + React desktop HUD. It operates without fragile external automation wrappers (no remote CDP port leaks, zero `navigator.webdriver` flags) and integrates direct accessibility tree sanitization, in-memory grep scanning, and Set-of-Marks (SoM) visual grounding.

---

## 2. Core Pillars & Architecture

1. **In-Process Chromium Subsystems:** Direct native tab management (`InsertWebContentsAt`, `ActivateTabAt`, `CloseWebContentsAt`), autofill heuristics, and direct DevTools host integration.
2. **Adblock Engine & Network Interception:** `adblock-rust` rule matching against EasyList/uBlock filters, canceling telemetry/ads at 0 bytes, and cosmetic CSS hiding.
3. **Interactive AX Sanitization:** Compressing DOM/accessibility trees into clean Markdown under 3,000 tokens for fast text LLM evaluation.
4. **Set-of-Marks (SoM) Grounding:** Dynamic high-contrast visual badges (`[#1]`, `[#2]`) over interactive elements synchronized with AX IDs.
5. **In-Memory Grep Engine:** Fast $\pm 10$ context line scanning on active DOM and script resources with pagination.
6. **4-Layer Anti-Bot Defense:** Bézier mouse kinematics, signature detection, automated solver bridges, and HITL takeover alerts.
7. **Dual-Model Closed-Loop Orchestration:** Fast text LLM for primary execution with VLM fallback for complex visual canvas layouts.

---

## 3. Atomic Task Backlog

- [x] **TASK-001: Core Desktop Shell & Frameless Window Architecture**
  - Verify Electron main process initializes frameless browser window with glassmorphism HUD.
  - Acceptance Criteria: `npm run build:react` bundles successfully and loads UI layout.

- [x] **TASK-002: In-Process Adblock Engine Interception**
  - Implement request filter checking and cosmetic CSS injection in guest preload.
  - Acceptance Criteria: Tracker requests blocked in `desktop/adblock_engine.js`.

- [ ] **TASK-003: DOM Accessibility Tree Token Compression**
  - Enhance element extractor to filter invisible nodes and cap serialized token output under 3,000 tokens.
  - Acceptance Criteria: DOM compression produces clean markdown consumable by subagents without token overflow.

- [ ] **TASK-004: In-Memory Grep Engine Context Windowing**
  - Enforce strict $\pm 10$ line windowing and pagination for DOM grep queries with 10+ results.
  - Acceptance Criteria: Grep search returns top 10 lines + match + bottom 10 lines with line numbers.

- [ ] **TASK-005: Set-of-Marks (SoM) High-Contrast Badge Sync**
  - Render neon yellow (`#FFE600`) markers with numeric IDs over all interactive nodes.
  - Acceptance Criteria: Marks render within 16ms and cleanly detach post-capture.

- [ ] **TASK-006: Ponytale Context Optimizer Runtime Integration**
  - Integrate DOM pruning and state caching into the browser runner workflow to minimize agent input tokens.
  - Acceptance Criteria: Input tokens reduced during continuous multi-step browser tasks.

- [ ] **TASK-007: Comprehensive End-to-End Verification Gate**
  - Run build, headless verification tests, and confirm zero console/runtime regressions.
  - Acceptance Criteria: All test suites pass and build bundle is verified.

---

## 4. Completion Signal

When all backlog tasks are complete and verified:
Append `COMPLETE_ALL_TASKS_FINISHED` to `progress.txt` to terminate the autonomous loop.
