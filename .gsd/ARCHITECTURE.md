# ARCHITECTURE.md — Antigravity Browser Architecture Blueprint

> **Status:** Active Reference
> **Engine:** In-Process Chromium Native Shell + Electron Desktop UI

## System Topology

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ANTIGRAVITY AGENT HUB                           │
│      (Ralph Loop Autonomous Controller + GSD Context Scaffolding)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ IPC / In-Process Host
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     ELECTRON MAIN PROCESS (`desktop/main.js`)          │
│   • Frameless Window Host   • Tab Management   • Adblock Interceptor   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
         ┌──────────────────────────┴──────────────────────────┐
         ▼                                                     ▼
┌────────────────────────────────┐     ┌─────────────────────────────────┐
│     REACT HUD RENDERER         │     │     GUEST BROWSER WEBVIEW       │
│  (`desktop/src/index.jsx`)     │     │   (`desktop/guest_preload.js`)  │
│  • Omnibox & URL Controller    │     │   • In-Process DOM Traversal    │
│  • TabStripModel UI            │     │   • Set-of-Marks Overlay Engine │
│  • AI Copilot HUD Overlay      │     │   • In-Memory Grep Searcher     │
│  • Ponytale Context Cache      │     │   • AX Sanitizer (<3k tokens)   │
└────────────────────────────────┘     └─────────────────────────────────┘
```

## Core Modules & Data Flow

### 1. Electron Main Controller (`desktop/main.js`)
- **Role:** Handles application lifecycle, frameless window chrome, native menus, and network interception.
- **Adblock Integration:** Imports `desktop/adblock_engine.js` to inspect `onBeforeRequest` URLs against EasyList filter trees.

### 2. Browser Interface & HUD (`desktop/src/`)
- **`App.jsx`:** Root layout container handling tab state and active URL.
- **`TabStrip.jsx`:** Tab switching, creation, and tab lifecycle modeled on Chromium `TabStripModel`.
- **`NavigationToolbar.jsx`:** Omnibox input, back/forward/reload, and AI agent status trigger.
- **`BookmarksBar.jsx`:** Quick access bookmarks and local test fixtures.

### 3. Guest Preload & Page Interaction (`desktop/guest_preload.js`)
- **AX Tree Extraction:** Extracts interactive DOM elements into compacted Markdown.
- **Set-of-Marks (SoM):** Overlays visual numeric badges for multimodal VLM tasks.
- **In-Memory Grep Engine:** Implements $\pm 10$ line windowing for fast regex/literal scanning.
- **Cosmetic Ad Filtering:** Injects CSS stylesheets to collapse ad slots.

### 4. Context Engineering & Token Management (`.gsd/` & `.agents/plugins/ponytale/`)
- **Context Pruning:** Strips non-interactive DOM branches, SVG paths, scripts, and duplicate styles.
- **Isolated Subagent Windows:** XML `<task>` blocks isolate scope to keep subagent prompts under 70% threshold.

---

*Last updated: 2026-10-27*
