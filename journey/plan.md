# Devil.co AI Browser Harness — Architecture Blueprint & Execution Plan

> **Author:** Antigravity AI OS (Devil.co)  
> **Target:** Anurag (Founder & CEO)  
> **Workspace:** `c:\Users\Anurag\Desktop\ai\automated browser`  
> **Focus:** AI Browser Engine, Tool Modernization, Sub-Agent System & Closed-Loop Verification  
> **Status:** Updated & Aligned with Founder Directives  

---

## 1. Executive Summary & Core Philosophy

An AI browser harness must **never** be a collection of brittle, site-specific hardcoded scripts (e.g., hardcoding YouTube players or specific checkout forms). A video play button, a form input, or an interactive element can exist on any platform, under any framework (React, Vue, Web Components, Shadow DOM, Canvas, HTML5 media).

Per founder directives:
1. **Deferred Model Backend:** We skip adding/integrating Ornith for now. All immediate focus is placed exclusively on the AI browser itself, fixing its existing tools, adding new universal tools, and perfecting the autonomous execution loop.
2. **Balanced, Non-Destructive Ad Handling:** We do **not** blindly or aggressively wipe/tamper with every site. Overly aggressive cosmetic or script blocking breaks modern websites (breaking video players, destroying checkout flows, and triggering anti-adblock walls). We rely on standard, non-intrusive Brave `adblock-rust` network filtering that allows pages to load cleanly without breaking site integrity, while keeping video playback smooth.
3. **The Single but Dynamic Feedback Loop:** Modern autonomous agents must not queue blind, unverified multi-action scripts. Every turn follows a strict **Observe ➔ Understand ➔ Plan ONE dynamic action ➔ Execute ➔ Verify** lifecycle with dynamic self-healing diagnosis.
4. **Sub-Agent Delegation System (Max 3 Concurrent):** The Main Agent can delegate focused tasks to specialized Sub-Agents (e.g., Tab Researcher, Form Filler, Media Controller). To prevent memory/RAM clutter, a hard limit of **maximum 3 sub-agents** is enforced, with unique ID tracking and structured result handover.
5. **Tri-Modal Perception Layer:** Explicitly combining **AXTree + Set-of-Marks (#N) + Placeholder Extraction** to perceive any web page accurately.
6. **Before-and-After DOM Snapshot Delta Engine:** Every physical action records a DOM snapshot before and after execution to compute physical state deltas and prevent zero-change infinite loops.

---

## 2. The Single but Dynamic Verification & Self-Healing Loop

The engine's heart is the **Single but Dynamic Verification Loop**. Rather than firing static batch commands, the harness reasons and acts dynamically on a per-step basis:

```
                  ┌────────────────────────────────────────┐
                  │                Observe                 │
                  │   • Accessibility Tree (AXTree)        │
                  │   • Set-of-Marks (#N) Visual Badges    │
                  │   • Placeholder & Input Extraction     │
                  │   • Pre-Action DOM Snapshot Recorded   │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │            Understand page             │
                  │  (Identify interactive elements, tags, │
                  │   active placeholders, media states)   │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │         Plan ONE Dynamic Action        │
                  │   (Single atomic tool dynamically      │
                  │    selected based on live page state)  │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │                Execute                 │
                  │   (Dispatch tool via Electron webview) │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │             Verify Result              │
                  │   • Post-Action DOM Snapshot Recorded  │
                  │   • Compute Physical Delta (URL, DOM,  │
                  │     Values, Focus, Node Count)         │
                  └───────────────────┬────────────────────┘
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            ▼                                                   ▼
     [ ✅ Success (Delta Verified) ]              [ ❌ Failure (Zero Delta / Error) ]
            │                                                   │
            ▼                                                   ▼
      Next Action / Delegate                             Diagnose Failure
                                                                │
                                                                ▼
                                                     Alternate Locator/Action
                                                     (Badge #N ➔ Text ➔ Selector)
                                                                │
                                                                ▼
                                                              Retry
                                                                │
                                                                ▼
                                                         Verify Again
```

### Self-Healing & Dynamic Failure Recovery Mechanics
When an action fails verification or produces zero physical delta (e.g., target element not found, click intercepted, or input value unchanged):
1. **Diagnose Failure:** Categorize why the delta was empty (e.g., element hidden behind modal overlay, DOM re-rendered after async fetch, stale node index, Shadow DOM boundary).
2. **Alternate Locator / Dynamic Action Selection:**
   * If CSS selector produced 0 delta ➔ Try Set-of-Marks badge (`#N`).
   * If Set-of-Marks badge failed ➔ Try visible accessible text match.
   * If click was intercepted by overlay/modal ➔ Dynamically dispatch `press_key('Escape')` or click the dismiss button.
   * If naive input did not update state ➔ Invoke prototype descriptor setter override.
3. **Retry with Micro-Timeout:** Re-execute the alternate action.
4. **Re-Verify:** Confirm physical DOM delta before deciding to advance or report back.

---

## 3. Sub-Agent Delegation Architecture (Max 3 Concurrent)

To execute complex, multi-step browser tasks without clogging the main context window or memory, the harness introduces a structured **Sub-Agent Delegation System**.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 MAIN AGENT (CONTROLLER)                                      │
│  • High-level Goal Decomposition                                                             │
│  • Sub-Agent Spawning, Lifecycle & Resource Management                                       │
│  • Result Consolidation & Telegram Communication                                             │
└──────────────────────────────┬───────────────────────────────┬───────────────────────────────┘
                               │                               │
                               ▼ (Delegate Task)               ▼ (Delegate Task)
               ┌──────────────────────────────┐ ┌──────────────────────────────┐
               │    SUB-AGENT 1 (Active)      │ │    SUB-AGENT 2 (Active)      │
               │ • ID: sub_nav_1082           │ │ • ID: sub_form_1083          │
               │ • Focus: Video / Media Search│ │ • Focus: Multi-Field Form    │
               │ • Tab: Tab #1                │ │ • Tab: Tab #2                │
               └──────────────┬───────────────┘ └──────────────┬───────────────┘
                              │                                │
                              ▼ (Handover Result)              ▼ (Handover Result)
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 CONSOLIDATED GOAL COMPLETION                                 │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Core Sub-Agent Directives & Safeguards:
1. **Hard Limit: Maximum 3 Sub-Agents:**
   * At any given moment, the Main Agent can have **at most 3 sub-agents** actively running.
   * This strictly prevents RAM exhaustion, GPU VRAM thrashing, and Electron webview render overhead.
   * If a 4th task is required, it must queue until an active sub-agent finishes and terminates.
2. **Mandatory Unique Sub-Agent Tracking:**
   * Every sub-agent is assigned an explicit tracking record:
     ```json
     {
       "subagent_id": "sub_worker_01_a8f2",
       "parent_task": "Fill registration on portal",
       "role": "form_filler",
       "tab_id": 2,
       "status": "running",
       "start_time": 1791398500,
       "actions_executed": 3,
       "memory_mb": 42
     }
     ```
3. **Strict Handover & Result Consolidation Protocol:**
   * Sub-agents do not post directly to external users or Telegram.
   * When a sub-agent finishes its delegated job, it returns a structured result payload to the Main Agent:
     ```json
     {
       "subagent_id": "sub_worker_01_a8f2",
       "status": "completed",
       "success": true,
       "summary": "Filled all 5 fields and verified registration submitted.",
       "artifacts": { "submitted_url": "...", "confirmation_text": "..." },
       "dom_delta": "Page navigated to /welcome"
     }
     ```
   * The Main Agent reviews the sub-agent's output, verifies the outcome against the global goal, terminates the sub-agent to free RAM, and proceeds with the next step.
4. **Main Agent Autonomous Decision Protocol (When to Delegate vs Direct Execution):**
   * **The Main Agent autonomously decides** whether an action should be executed directly or handed over to a dedicated sub-agent:
     * **Direct Execution:** For atomic or linear operations (single navigation, quick search, media toggle `press_key('Space')`, direct button click, or page scroll), the Main Agent executes the atomic tool directly without delegation overhead.
     * **Sub-Agent Delegation:** The Main Agent decides to call `delegate_subtask` when:
       1. **Multi-Field Form Filling:** A page requires entering data across multiple placeholders/inputs where focused local validation is needed.
       2. **Multi-Tab Exploration:** A task requires opening and inspecting a background or secondary tab while preserving the primary tab state.
       3. **Deep Sub-Goal Execution:** Complex sub-routines (e.g. verifying download progress, polling countdowns, or drilling into search result links) that would otherwise pollute the main conversation context.
   * **Resource Reclamation:** Once the sub-agent returns its result payload, the Main Agent evaluates the outcome, frees the sub-agent slot (enforcing the strict max-3 cap), and proceeds.

---

## 4. Tri-Modal Perception Layer

The browser's perception engine generates a compact, high-signal representation of the active page combining three modalities:

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                             TRI-MODAL PERCEPTION PIPELINE                                │
├──────────────────────────────┬───────────────────────────────┬───────────────────────────┤
│ 1. Accessibility Tree        │ 2. Set-of-Marks (#N)          │ 3. Placeholder Extraction │
│    (AXTree)                  │    Visual Overlay Badges      │    & Input Label Mapping  │
├──────────────────────────────┼───────────────────────────────┼───────────────────────────┤
│ • Semantic roles: button,    │ • Injects temporary numerical │ • Extracts input          │
│   link, combobox, textbox    │   badges (#1, #2, #3...)      │   placeholders, labels,   │
│ • Parent-child hierarchy     │ • Gives agent unambiguous     │   names, and aria-labels  │
│ • Strips decorative divs,    │   visual grounding targets    │ • Maps fields: "Email",   │
│   SVG bloat, inline styling  │ • Immune to obfuscated CSS    │   "First Name", "Search"  │
└──────────────────────────────┴───────────────────────────────┴───────────────────────────┘
```

---

## 5. Before-and-After DOM Snapshot Delta Engine

To eliminate blind action execution, the harness implements **Physical Delta Verification**:

```
[ Pre-Action Snapshot ] ──► [ Execute Atomic Action ] ──► [ Post-Action Snapshot ]
          │                                                        │
          └───────────────────────────┬────────────────────────────┘
                                      ▼
                        [ Compute Physical Delta ]
                        • URL Delta (Navigation occurred?)
                        • Active Element Delta (Focus moved?)
                        • Value Delta (Did input text register?)
                        • Node Count Delta (Did DOM tree update?)
```

* **Zero-Delta Detection:** If an action executes but produces **zero delta** (the page state, focus, value, and URL remained completely identical), the harness recognizes that the click missed or was swallowed by an unresponsive element.
* **Immediate Feedback:** Instead of repeating the exact same failed click 5 times, zero-delta immediately routes to **Failure Diagnosis** in the self-healing loop to pick an alternate locator.

---

## 6. Technical Root Cause Analysis: Existing Harness Bugs

### Bug A: The "Silent Break" on Model Latency or Network Drop
* **Location:** `desktop/src/ai_harness_engine.js` (lines 1454–1471)
* **What happens:**
  ```javascript
  const aiRes = await sendChatMessage({ ... });
  if (!aiRes || !aiRes.success || aiRes.aborted) {
      break; // Silently ends turn 1 with zero action!
  }
  ```
  Instead of logging actionable diagnostic telemetry or retrying with an updated context, the engine silently executed `break;` and returned an empty markdown stub.
* **Fix:** Replace the silent `break;` with a self-healing retry mechanism. If an action or model call drops, log detailed diagnostics and fall back cleanly without silent stalls.

### Bug B: Missing the `press_key` Universal Primitive
* **What happens:**
  The harness provided `click_element` and `type_text`, but completely lacked a dedicated `press_key` tool.
* **Impact:**
  Media players on any website (YouTube, Vimeo, Twitch, HTML5 `<video>`, Reddit, Twitter) natively toggle play/pause via `Space` or `k`. Form inputs across modern SPAs submit on `Enter`, dismiss modals on `Escape`, and cycle fields on `Tab`. Forcing the model to simulate play/pause via fragile UI click coordinates is brittle.
* **Fix:** Add a first-class `press_key(key, modifiers)` tool that dispatches native physical keyboard events to `document.activeElement` or the targeted player/container.

### Bug C: Naive Input Typing Failing on React/Vue SPAs
* **What happens:**
  `type_text` naively assigned `targetInput.value = text` and dispatched a generic `new Event('input')`. In React 16+ and Vue 3 controlled components, this does **not** update internal component state because the framework overrides standard property setters.
* **Fix:** Apply the OpenCode prototype descriptor setter override:
  ```javascript
  const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
  )?.set || Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
  )?.set;
  if (nativeSetter) {
      nativeSetter.call(targetInput, text);
  } else {
      targetInput.value = text;
  }
  targetInput.dispatchEvent(new Event('input', { bubbles: true }));
  targetInput.dispatchEvent(new Event('change', { bubbles: true }));
  ```

### Bug D: Over-Specialization (Hardcoded Selectors)
* **What happens:**
  Functions like `typeAndSubmitInSearchBar` hardcoded search-only selectors (`input[name="q"]`, `input[type="search"]`). If an agent wanted to type into a login field, a comment box, a checkout form, or a filter bar, it failed or targeted the wrong element.
* **Fix:** Support an explicit optional `target` parameter (`#field-id`, mark `#N`, placeholder, or aria-label), falling back to `document.activeElement` if already focused.

---

## 7. The Universal Browser Toolset (Atomic Primitives)

The AI agent will control the browser exclusively through **clean, site-agnostic atomic tools**:

| # | Tool Name | Parameters | Core Responsibility & Site-Agnostic Behavior |
| :-: | :--- | :--- | :--- |
| **1** | **`navigate`** | `url: string` | Navigates the active tab to any URL or executes a search engine query. |
| **2** | **`open_tab`** | `url?: string, title?: string` | Opens a new tab in the Electron tab strip. |
| **3** | **`close_tab`** | `index?: number, id?: string` | Closes active tab or tab by index/ID. |
| **4** | **`switch_tab`** | `index?: number, id?: string` | Switches active focus to target tab. |
| **5** | **`read_page`** | *(none)* | **Tri-Modal Perception:** Returns page title, URL, AXTree, interactive elements with Set-of-Marks `#N` tagging, and input placeholders. |
| **6** | **`grep_page`** | `query: string, selector?: string` | High-speed DOM search for specific text, placeholders, attributes, or keywords. |
| **7** | **`click_element`** | `target: string, index?: number` | Universal click targeting Set-of-Marks badge (`#N`), visible text, accessible name, or CSS selector across any element. |
| **8** | **`type_text`** | `text: string, target?: string, submit?: boolean, clear?: boolean` | Types text into any placeholder, input, textarea, or contenteditable using synthetic React/Vue property setters. Supports sequential multi-field forms. |
| **9** | **`press_key`** | `key: string, modifiers?: string[]` | Dispatches physical keyboard events (`Space`, `Enter`, `Tab`, `Escape`, `ArrowDown`, `k`). Toggles media playback, submits forms, closes popups. |
| **10** | **`scroll_page`** | `direction: string, amount?: number` | Proportional (0–100%) or pixel scroll (`up`, `down`, `top`, `bottom`). |
| **11** | **`hover_element`** | `target: string` | Triggers mouseover/hover state to reveal dropdowns, tooltips, or player control bars. |
| **12** | **`delegate_subtask`** | `subagent_id: string, role: string, goal: string, tab_id?: number` | Delegates subtask to a tracked sub-agent (Max 3 concurrent). |
| **13** | **`finish_task`** | `message: string, success: boolean` | Concludes the autonomous task and generates a structured summary for the user and Telegram. |

---

## 8. Non-Destructive Ad-Blocking Architecture

### Why We Do NOT Wipe Ads Aggressively Across Every Site
* Overly broad cosmetic stylesheet wiping (`display: none !important`) breaks essential UI layouts, navigation bars, paywalls, and video playback controls on many legitimate websites.
* Aggressive script-blocking breaks site authentication and anti-bot verification flows.

### Balanced Protection Strategy
1. **Network Layer (Brave `adblock-rust`):**
   * Uses standard compiled EasyList / Brave Shields rules to block third-party tracker domains and known ad-server networks at the socket level.
   * Leaves site-origin scripts and legitimate APIs completely intact.
2. **Video Ad Playback Handling:**
   * Gentle, non-destructive media handling: when a standard HTML5 `<video>` has an active ad state, adjust the playback position to resume main content cleanly without corrupting the media element or breaking audio synchronization.
3. **No Blanket DOM Destruction:**
   * Preserve page structure so the agent's perception engine (`read_page`, Set-of-Marks) perceives the page exactly as a human user does.

---

## 9. Phased Implementation Roadmap

```
Phase 1: Universal Tool Primitives Hardening
├── Add press_key tool ('Space', 'Enter', 'Tab', 'Escape', 'ArrowDown')
├── Upgrade type_text with OpenCode prototype descriptor setter override & placeholder resolution
├── Generalize click_element to support Set-of-Marks #N + text + selectors cleanly
├── Add hover_element for dropdowns and overlay control bars
└── Verification: Test each tool directly via Electron webview IPC

Phase 2: Single but Dynamic Feedback Loop & Delta Engine
├── Implement Pre-Action & Post-Action DOM Snapshot capture
├── Compute physical DOM delta (URL, activeElement, values, node count)
├── Add zero-delta detection to trigger automatic alternate locator retry
├── Restructure executeAutonomousAgentLoop in desktop/src/ai_harness_engine.js:
│   ├── Observe (AXTree + Set-of-Marks + Placeholders)
│   ├── Understand page state
│   ├── Plan ONE dynamic action per step
│   ├── Execute atomic primitive
│   ├── Verify physical delta
│   └── Self-healing failure recovery (Diagnose ➔ Alternate Locator ➔ Retry ➔ Verify)
├── Eliminate the silent break bug with explicit diagnostic logging
└── Verification: Re-bundle desktop with esbuild (desktop/dist/bundle.js)

Phase 3: Sub-Agent Delegation Manager (Max 3 Concurrent)
├── Implement SubAgentManager with unique ID tracking (subagent_id, status, memory)
├── Enforce hard cap of 3 concurrent sub-agents to preserve RAM
├── Implement sub-agent task handover & result consolidation protocol
└── Verification: Test sub-agent delegation and consolidation loop

Phase 4: Browser REST Control API Synchronization
├── Ensure port 4892 routes (/api/click, /api/type, /api/press_key, /api/scroll) 
│   map 1:1 to the new atomic primitives
├── Update Telegram Daemon (/status, /navigate, /play, natural language tasks)
└── Verification: Test REST endpoints via curl/urllib

Phase 5: End-to-End Verification Across Arbitrary Sites
├── Test A: General page navigation and Tri-Modal perception inspection
├── Test B: General media interaction (click player + press_key 'Space')
├── Test C: Multi-placeholder form filling (type_text across 5+ placeholders + press_key 'Enter')
├── Test D: Self-healing verification (simulate zero-delta click and verify recovery)
├── Test E: Sub-agent delegation test with 2 concurrent sub-agents
└── Test F: Telemetry confirmation to Telegram (@Red_Rose_A_bot)
```

---

## 10. Review & Alignment Gate

This updated plan strictly respects founder directives:
* **Ornith model backend integration is deferred** for current execution.
* **100% focus is on the browser engine, tool fixing, and new tools**.
* **Single but Dynamic Feedback Loop** (`Observe ➔ Understand ➔ Plan ONE dynamic action ➔ Execute ➔ Verify Delta ➔ Recover`) is established as the core execution paradigm.
* **Sub-Agent System with Max 3 Limit & Unique ID Tracking** guarantees scalable multitasking with zero RAM clutter.
* **Tri-Modal Perception (`AXTree + Set-of-Marks + Placeholders`) & Before/After DOM Snapshots** provide physical ground truth for all actions.
* **Non-destructive, balanced ad handling** preserves site stability across the web.
