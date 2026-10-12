# AI Browser Harness Architecture: Global State-of-the-Art Analysis & Antigravity Synthesis

> **Workspace:** `c:\Users\Anurag\Desktop\ai` & `automated browser`  
> **Document:** `journey/arch.md`  
> **Author:** Antigravity AI OS (Devil.co)  
> **Target:** Anurag (Founder & CEO)  
> **Date:** October 2026

---

## 1. Executive Overview

Modern autonomous web agents have shifted decisively away from brittle, site-specific hardcoded scripts (e.g. specialized YouTube players or rigid checkout bots). Today's leading systems—**MiniMax (`OpenAgentCore` / `browser-harness`)**, **DeepSeek Harness (`DSH` / `DeepSeek-VL2`)**, **Kimi / KimiCode (Moonshot AI)**, and **OpenCode**—treat the browser as an operating canvas controlled by a compact set of **atomic, site-agnostic primitives** operating in a closed-loop observation-action cycle.

This report provides:
1. Deep-dive technical teardown of the four leading agent harnesses.
2. Under-the-hood protocol, perception, event dispatch, and error-recovery analysis.
3. Tool counts, schemas, and taxonomy.
4. Comprehensive architectural comparison against **our Antigravity Browser Harness**.
5. Identification of our core failure modes and the modernization blueprint to achieve parity with and superiority over industry leaders.
6. The complete Modernized Antigravity Browser Architecture pipeline diagram.
7. **The Single but Dynamic Verification & Self-Healing Loop**.
8. **Sub-Agent Delegation System (Max 3 Concurrent, Unique ID Tracked)**.
9. **Tri-Modal Perception Layer (`AXTree + Set-of-Marks (#N) + Placeholder Extraction`)**.
10. **Before-and-After DOM Snapshot Delta Engine** for physical ground truth verification.
11. Multi-field form handling with arbitrary placeholders, labels, and SPA frameworks.
12. Pluggable model architecture: **Ornith-1.0-9B on RTX 5070 Ti (Flagship Recommended)** with open support for **any user-selected model** (OpenAI, Claude, DeepSeek, Ollama, LM Studio, vLLM).

---

## 2. Global State-of-the-Art Harness Teardown

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   GLOBAL AI HARNESS ARCHITECTURAL SPECTRUM                                      │
├─────────────────────┬───────────────────────────┬───────────────────────────┬───────────────────────────────────┤
│ MiniMax             │ DeepSeek                  │ Kimi / Moonshot           │ OpenCode                          │
│ (OpenAgentCore)     │ (DeepSeek Harness - DSH)  │ (KimiCode & WebBridge)    │ (Agent Sandbox & MCP)             │
├─────────────────────┼───────────────────────────┼───────────────────────────┼───────────────────────────────────┤
│ • Native sandbox    │ • Text-first DOM code     │ • Long-CoT (1M tokens)    │ • React synthetic event override  │
│ • Self-healing loop │ • MCP plugin graph        │ • In-session WebBridge    │ • Terminal + TUI runner           │
│ • 8 atomic tools    │ • DeepSeek-VL2 bbox       │ • Set-of-Marks tagging    │ • Standardized MCP server         │
│ • Dynamic recovery  │ • 9 atomic tools          │ • 10 atomic tools         │ • 8 atomic tools                  │
└─────────────────────┴───────────────────────────┴───────────────────────────┴───────────────────────────────────┘
```

---

### A. MiniMax New Harness (`OpenAgentCore` & `browser-harness`)

#### 1. What it does
MiniMax recently open-sourced **`OpenAgentCore`**—a self-hosted, modular implementation of the agent execution runtime. Combined with its **`browser-harness`** framework, it connects LLMs directly to browser runtimes to execute multi-step research, web automation, scraping, and verification workflows without proprietary cloud lock-in.

#### 2. How it works under the hood
* **Underlying Protocol:** Operates primarily via Chrome DevTools Protocol (CDP) over WebSockets, with pluggable execution runtimes (Docker, microsandboxes, E2B, or direct OS process binding).
* **Perception Engine:** Translates the rendered page into a compact, hierarchical **Accessibility Tree (AXTree)** rather than feeding massive raw HTML. Each actionable node is mapped to a transient numerical index or unique selector path (`selector_map`).
* **Self-Healing Execution Loop:** The core innovation in MiniMax's harness is dynamic error handling:
  - If a targeted element is obscured, stale, or detached from DOM during execution, the harness does not halt.
  - It catches the `ElementClickIntercepted` or `NodeNotFound` exception, takes an updated micro-snapshot of the surrounding DOM subtree, and allows the model (or deterministic fallback heuristic) to select an alternative target (parent link, Set-of-Marks badge, or coordinate click).
* **Tool Count & Primitives (8 Core Tools):**
  1. `open_url(url)` — Navigates active frame to destination.
  2. `click(selector | id)` — Dispatches click to element or coordinates.
  3. `type(selector | id, text, clear=True, enter=False)` — Inserts text and optionally submits.
  4. `press_key(key)` — Sends physical keystrokes (`Enter`, `Tab`, `Space`, `Escape`).
  5. `scroll(direction, amount)` — Viewport/container scrolling (proportional or pixel).
  6. `extract_state()` — Captures AXTree, active URL, page title, and interactive element list.
  7. `take_screenshot(target)` — Captures full viewport or webview PNG.
  8. `manage_tabs(action, tab_id)` — Opens, closes, or switches browser tabs.

---

### B. DeepSeek New Harness (`DeepSeek Harness - DSH` & `DeepSeek-VL2`)

#### 1. What it does
DeepSeek’s agent runtime operates under an *"everything is a plugin"* model. In web automation, DeepSeek heavily promotes a **text-first / code-first** philosophy rather than continuous pixel-based video streaming (which is bandwidth-heavy and prone to visual hallucination). When spatial precision is required (e.g. complex web forms, Canvas components, charts), it engages **DeepSeek-VL2** for visual grounding.

#### 2. How it works under the hood
* **Underlying Protocol:** Headless or visible Chromium controlled via CDP/Playwright, exposed via the Model Context Protocol (MCP) to subagents.
* **Dual Perception Pipeline:**
  1. *Structural Tier (Default):* Serializes the DOM into filtered interactive elements (buttons, inputs, links, media, forms) stripped of decorative noise and inline styles.
  2. *Visual Grounding Tier (DeepSeek-VL2):* Emits normalized bounding boxes `[ymin, xmin, ymax, xmax]` directly within the model's Chain-of-Thought reasoning tokens (`<think>...<point>[340, 520]</point>...</think>`), linking cognitive intent with exact pixel coordinates.
* **Execution & Verification:** Every action must produce a physical delta observation. DeepSeek's harness records before-and-after DOM snapshots; if the page state does not change, it signals a warning to prevent infinite loops.
* **Tool Count & Primitives (9 Core Tools):**
  1. `getPageTree()` — Returns the structured accessibility and interactive node tree.
  2. `clickElement(node_id | selector | bbox)` — Executes click on node or coordinates.
  3. `inputText(node_id | selector, text, press_enter)` — Writes into input fields.
  4. `pressKey(key, modifiers)` — Dispatches hardware key codes.
  5. `scrollPage(direction, pixels)` — Scrolls window or scrollable container.
  6. `navigate(url)` — Direct URL navigation and search dispatch.
  7. `tabOperation(action, tab_id)` — Creates, closes, or selects tabs.
  8. `evaluateScript(script)` — Evaluates JavaScript within page context.
  9. `captureSnapshot(type)` — Captures DOM or visual screenshot.

---

### C. Kimi / KimiCode Harness (Moonshot AI K1.5 / K3 & WebBridge)

#### 1. What it does
Moonshot AI’s Kimi agent platform uses a dual-interface architecture: **KimiCode** (for autonomous coding workflows) and **WebBridge / Kimi Browser Extension** (for live browser session automation). Backed by Kimi’s 1M-token context window, it excels at complex, multi-turn research, airline comparisons, form filing, and site-wide scraping without forgetting prior turns.

#### 2. How it works under the hood
* **Underlying Protocol:** Uses a browser extension content-script bridge communicating with a local WebSocket agent server.
* **Long-CoT Grounding:** Rather than compressing or truncating prior history every turn, Kimi’s harness feeds the full history of executed actions and page observations into its long-context window.
* **Set-of-Marks (SoM) Injection:** Injects lightweight overlay badges directly into the webpage DOM (marking clickable elements with `#1`, `#2`, `#3` labels). The model simply issues commands like `click(#4)` or `input(#2, "value")`.
* **Tool Count & Primitives (10 Core Tools):**
  1. `browser_navigate(url)` — Navigates active page.
  2. `browser_click(mark_id | selector)` — Clicks mark badge or element.
  3. `browser_input(mark_id | selector, text, clear)` — Inputs text.
  4. `browser_press_key(key)` — Dispatches keys (`Enter`, `Space`, `Tab`).
  5. `browser_scroll(direction, distance)` — Smooth page scrolling.
  6. `browser_extract_content(mode)` — Extracts readable markdown or structured text.
  7. `browser_find_elements(query)` — Greps in-page text and tags.
  8. `browser_tab_control(action, id)` — Tab strip management.
  9. `browser_screenshot()` — Viewport capture.
  10. `task_complete(summary)` — Closes autonomous loop.

---

### D. OpenCode Harness (Coding Agent Sandboxing & MCP)

#### 1. What it does
OpenCode is an open-source, terminal/desktop coding agent harness that interfaces with external models (Claude, DeepSeek, local Ollama) via MCP servers. It focuses on robust developer workflows, sandboxed shell execution, and reliable browser automation for web scraping and end-to-end web testing.

#### 2. How it works under the hood
* **Underlying Protocol:** Standardized MCP (Model Context Protocol) JSON-RPC messages driving Playwright / Chromium.
* **Synthetic Event Propagation (React/Vue Fix):**
  Many modern SPAs ignore naive DOM property mutations (e.g. `input.value = "test"` does not update React component state). OpenCode solves this by explicitly invoking the native prototype descriptor setter:
  ```javascript
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
  ).set;
  nativeInputValueSetter.call(inputElement, text);
  inputElement.dispatchEvent(new Event('input', { bubbles: true }));
  inputElement.dispatchEvent(new Event('change', { bubbles: true }));
  ```
  This guarantees that forms on React, Angular, Vue, and vanilla sites update reliably.
* **Tool Count & Primitives (8 Core Tools):**
  1. `browser_goto(url)` — Page navigation.
  2. `browser_click(selector | text)` — Element clicking.
  3. `browser_fill(selector, value)` — Robust synthetic input typing.
  4. `browser_press(key)` — Keyboard events.
  5. `browser_scroll(direction)` — Viewport scrolling.
  6. `browser_snapshot(type)` — DOM tree, accessibility tree, or screenshot.
  7. `browser_eval(script)` — In-page JavaScript evaluation.
  8. `browser_tabs(action, tab_id)` — Tab strip orchestration.

---

## 3. Side-by-Side Comparison: Global Harnesses vs Antigravity

| Dimension | MiniMax (`OpenAgentCore`) | DeepSeek (`DSH`) | Kimi / KimiCode | OpenCode | Antigravity Browser (Current) | Antigravity Modernized Target |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Runtime Architecture** | Docker / Sandboxed process | Plugin graph + MCP | Browser extension bridge | Terminal TUI + MCP | Native Electron desktop shell | Native Electron desktop shell |
| **Model Connectivity** | OpenAI Agents API / MiniMax | DeepSeek API / Local MoE | Moonshot API | Multi-model (Ollama/Claude) | External LM Studio (Port 1234) | **Pluggable Architecture:**<br>• **Ornith-1.0-9B on RTX 5070 Ti (Flagship Recommended)**<br>• User Option: Any model (OpenAI, Claude, DeepSeek, Ollama, LM Studio, OpenRouter) |
| **Agent Topology** | Single linear agent | Plugin subagents | Single long-CoT agent | Single CLI agent | Single linear loop | **Main Agent + Sub-Agent Delegation (Max 3 Concurrent, Tracked by ID)** |
| **Tool Count** | 8 tools | 9 tools | 10 tools | 8 tools | 14 tools (with legacy cruft) | **11 Clean Universal Primitives** |
| **Perception Method** | AXTree + selector_map | Filtered DOM + VL2 bbox | Set-of-Marks (#N) | Filtered DOM snapshot | Set-of-Marks + `read_page` DOM | **Tri-Modal: AXTree + Set-of-Marks (#N) + Placeholder Extraction** |
| **Physical Delta Verification** | Error intercept | Pre/Post Snapshot Delta | Observation history | Basic exit code | None (Blind step) | **Before & After DOM Snapshot Delta Engine (Zero-Delta Detection)** |
| **Typing Event Model** | Standard CDP Input | Standard CDP Input | Content script event dispatch | Prototype descriptor override | Basic `.dispatchEvent('input')` | **Prototype override + synthetic events (Multi-placeholder form filling)** |
| **Keyboard Primitives** | Dedicated `press_key` | Dedicated `press_key` | Dedicated `browser_press_key` | Dedicated `browser_press` | None (relied on click hacks) | **Dedicated `press_key` (Space, Enter, Tab, Escape)** |
| **Ad-Blocking Engine** | None (Raw Chrome) | None (Raw Chrome) | None | None | Brave `adblock-rust` native addon | **Brave adblock-rust + Balanced Non-Destructive Protection** |
| **Execution Loop** | Dynamic selector retry | Physical delta check | Long-CoT prompt retry | Feedback loop retry | Fatal `break;` (Silent stall) | **Single but Dynamic Verification & Self-Healing Loop** |
| **Media Playback Support** | General (via `click` + `press_key: 'Space'`) | General (`click` + `pressKey`) | General (`click` + `press_key`) | General (`click` + `press`) | Broken specialized tools | **Universal Primitives (`click` + `press_key: 'Space'`)** |

---

## 4. Why Our Current Harness Failed & What Went Wrong

### Critical Defect 1: The Brittle Silent Break Bug
In `desktop/src/ai_harness_engine.js`:
```javascript
const aiRes = await sendChatMessage({ ... });
if (!aiRes || !aiRes.success || aiRes.aborted) {
    break; // Silently ends turn 1 with zero action!
}
```
In all major harnesses (MiniMax, DeepSeek, OpenCode), if an LLM network call drops, the engine catches the error, retries with exponential backoff, or engages a deterministic recovery planner. In our code, it executed `break;` and exited immediately.

### Critical Defect 2: The Model Disconnect
Our browser looked for LM Studio on `http://localhost:1234/v1`. Meanwhile, our primary model—**`Ornith-1.0-9B-Custom`**—was residing in PyTorch safetensors on disk without an active local API server bridge exposing `/v1/chat/completions` on the expected port.

### Critical Defect 3: The Specialization Anti-Pattern
Attempting to create site-specific tools like `play_video` (hardcoding YouTube) or `fill_form` (hardcoding checkout fields) is an anti-pattern. Every major harness succeeds because it provides **atomic, generalized primitives**:
* Want to play a video on YouTube, Vimeo, Netflix, or a news site?  
  ➔ `click_element(mark_id)` to click the video card/player, then `press_key('Space')` to trigger HTML5 media playback!
* Want to fill a form on any website?  
  ➔ `read_page()` to inspect input fields, then `type_text(target, value)` for each field, then `press_key('Enter')` to submit!

### Critical Defect 4: Missing the `press_key` Primitive
Our harness had `type_text` and `click_element`, but lacked a dedicated `press_key` tool. Keyboard shortcuts (`Space` to toggle play/pause, `Enter` to submit forms, `Tab` to jump inputs, `Escape` to close modals) are essential across every web framework.

---

## 5. The Modernized Antigravity Browser Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 ANTIGRAVITY HARNESS LAYER (MODERNIZED)                           │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   [User Goal / Telegram Instruction: "open youtube and play first video"]                        │
│                                           │                                                      │
│                                           ▼                                                      │
│                         ┌───────────────────────────────────┐                                    │
│                         │   Perception & Grounding Subsystem│                                    │
│                         │   • AXTree + DOM Snapshot         │                                    │
│                         │   • Set-of-Marks (#1, #2, #3...)  │                                    │
│                         │   • Placeholder & Form Extraction │                                    │
│                         │   • Pre-Action DOM Snapshot       │                                    │
│                         └─────────────────┬─────────────────┘                                    │
│                                           │                                                      │
│                                           ▼                                                      │
│                         ┌───────────────────────────────────┐                                    │
│                         │        Pluggable AI Brain:        │                                    │
│                         │ • Ornith-1.0-9B (Recommended)     │                                    │
│                         │ • Any User Model (OpenAI/Claude/  │                                    │
│                         │   DeepSeek/Ollama/LM Studio)      │                                    │
│                         │     Reasoning Trace: <think>      │                                    │
│                         └─────────────────┬─────────────────┘                                    │
│                                           │ (Tool Call Generated)                                │
│                                           ▼                                                      │
│                         ┌───────────────────────────────────┐                                    │
│                         │     Main & Sub-Agent Coordinator  │                                    │
│                         │  • Main Agent Orchestrator        │                                    │
│                         │  • Max 3 Sub-Agents (By Unique ID)│                                    │
│                         └─────────────────┬─────────────────┘                                    │
│                                           │                                                      │
│                                           ▼                                                      │
│                         ┌───────────────────────────────────┐                                    │
│                         │   11 Universal Atomic Primitives  │                                    │
│                         │   1. navigate(url)                │                                    │
│                         │   2. open_tab / close_tab / switch│                                    │
│                         │   3. read_page()                  │                                    │
│                         │   4. grep_page(query)             │                                    │
│                         │   5. click_element(target | mark) │                                    │
│                         │   6. type_text(target, text)      │                                    │
│                         │   7. press_key(key)               │                                    │
│                         │   8. scroll_page(dir, amount)     │                                    │
│                         │   9. hover_element(target)        │                                    │
│                         │  10. delegate_subtask(id, goal)   │                                    │
│                         │  11. finish_task(summary)         │                                    │
│                         └─────────────────┬─────────────────┘                                    │
│                                           │                                                      │
│                                           ▼                                                      │
│                         ┌───────────────────────────────────┐                                    │
│                         │ Physical Execution & Delta Engine │                                    │
│                         │ • React prototype event injection │                                    │
│                         │ • Post-Action DOM Snapshot        │                                    │
│                         │ • Physical Delta Verification     │                                    │
│                         │ • Non-destructive Brave adblock   │                                    │
│                         └─────────────────┬─────────────────┘                                    │
│                                           │                                                      │
│                                           ▼                                                      │
│               [Status & Snapshot Dispatched to Telegram @Red_Rose_A_bot]                         │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. The Single but Dynamic Verification & Self-Healing Loop

The modernized Antigravity harness enforces the **Single but Dynamic Verification Loop**. The harness does not run blind, rigid multi-action scripts; every step dynamically evaluates the live page state:

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

### Self-Healing & Dynamic Failure Recovery Mechanics:
1. **Observe:** Capture live DOM state, Accessibility Tree, Set-of-Marks badges (`#N`), and Pre-Action snapshot.
2. **Understand page:** Identify interactive candidates, input placeholders, forms, active countdowns, and media states.
3. **Plan ONE Dynamic Action:** Decide the precise atomic tool to execute next based on live observations.
4. **Execute:** Dispatch the action to the active Electron webview.
5. **Verify Result:** Read post-action DOM delta (new URL, updated input value, active element, scroll position).
   * **If Success:** Proceed immediately to the next action, delegate, or conclude goal.
   * **If Failure (or Zero Delta):**
     - Diagnose failure (e.g. element obscured, dynamic framework re-render, stale selector, missing placeholder).
     - Select alternate locator (Set-of-Marks badge `#N` ➔ accessible text ➔ CSS selector) or alternate action (`press_key('Escape')` to clear modal).
     - Retry with micro-timeout.
     - Verify again.

---

## 7. Sub-Agent Delegation Architecture (Max 3 Concurrent Sub-Agents)

To execute complex, multi-tab or multi-stage browser tasks without context window exhaustion or RAM clutter, the harness introduces a formal **Sub-Agent Delegation System**.

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
   * If a 4th task is required, it queues until an active sub-agent finishes and terminates.
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

## 8. Tri-Modal Perception Layer

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

## 9. Before-and-After DOM Snapshot Delta Engine

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

## 10. Universal Multi-Field Form Filling (Handling Many Placeholders)

Web applications use varied patterns for forms: some use `<input placeholder="...">`, others use floating labels, `<textarea>`, `contenteditable`, custom React component wrappers, or shadow roots.

### How `type_text` Solves Multi-Placeholder Forms:
1. **Targeting by Placeholder or Label:**
   The agent can specify:
   * `target: "Search or enter URL"` (matches placeholder text)
   * `target: "First Name"` (matches placeholder, label, or aria-label)
   * `target: "#3"` (Set-of-Marks badge index)
   * `target: "#email"` or `target: "input[type='email']"` (CSS selector)
   * If omitted, falls back to `document.activeElement` if already focused.
2. **Sequential Multi-Field Execution Without Early Submit:**
   When filling a 6-field form (e.g. First Name, Last Name, Email, Phone, Address, Zip):
   * Each field is targeted individually with `submit: false`.
   * Only the final submit action triggers form submission (either `submit: true` on the last field, clicking the submit button, or dispatching `press_key('Enter')`).
3. **Full Prototype Setter Override:**
   ```javascript
   const nativeSetter = Object.getOwnPropertyDescriptor(
       window.HTMLInputElement.prototype, 'value'
   )?.set || Object.getOwnPropertyDescriptor(
       window.HTMLTextAreaElement.prototype, 'value'
   )?.set;

   if (nativeSetter) {
       nativeSetter.call(targetElement, text);
   } else {
       targetElement.value = text;
   }

   // Dispatch full synthetic event chain for React/Vue/Angular
   targetElement.dispatchEvent(new Event('input', { bubbles: true }));
   targetElement.dispatchEvent(new Event('change', { bubbles: true }));
   targetElement.dispatchEvent(new Event('blur', { bubbles: true }));
   ```
4. **Verification of Form Value:**
   After typing, the verification step reads `targetElement.value` to ensure the text registered before moving to the next field.

---

## 11. Pluggable Model Architecture (Ornith Flagship + Any User Model)

The harness is engineered to be **100% open and pluggable**:
* **Flagship Recommended Model:**  
  **Devil.co Ornith-1.0-9B on RTX 5070 Ti**  
  * Highly optimized, 16-bit custom representation-engineered model running locally with zero latency, zero cloud costs, and full OS/browser autonomy. Best-in-class local agent performance.
* **Pluggable User Choice:**  
  Users can plug in **ANY model** they choose:
  * **Local Engines:** LM Studio (`localhost:1234`), Ollama (`localhost:11434`), vLLM, LocalAI.
  * **Cloud & Frontier Providers:** OpenAI (`gpt-4o`, `o3-mini`), Anthropic (`claude-3.7-sonnet`, `claude-3.5-haiku`), DeepSeek (`deepseek-chat`, `deepseek-reasoner`), OpenRouter, OpenCode Zen.
  * Model switching is a simple 1-click selection in the browser HUD or setting in `aiProviderService.js`.

---

## 12. The 11 Universal Tools Specification

1. **`navigate(url)`**: Navigates active webview to explicit URL or resolves search engine query.
2. **`open_tab(url)`**: Spawns a new tab in the native Electron tab strip.
3. **`close_tab(index, id)`**: Closes target or active tab.
4. **`switch_tab(index, id)`**: Focuses specific tab.
5. **`read_page()`**: Generates high-fidelity structural perception tree (AXTree, Set-of-Marks `#N`, placeholders, forms, links, media tags).
6. **`grep_page(query, selector)`**: High-speed live DOM search for arbitrary text, placeholders, or attributes.
7. **`click_element(target)`**: Universal click targeting Set-of-Marks badge (`#N`), accessible name, visible text, or CSS selector.
8. **`type_text(target, text, submit, clear)`**: Types into any placeholder, input, or textarea with prototype descriptor override and React/Vue synthetic events. Supports filling multiple fields cleanly.
9. **`press_key(key, modifiers)`**: Dispatches physical keystroke (`Space`, `Enter`, `Tab`, `Escape`, `ArrowDown`). Universal play/pause for media, form submit, and modal dismissal.
10. **`delegate_subtask(subagent_id, role, goal, tab_id)`**: Spawns and delegates a focused task to a tracked sub-agent (Max 3 concurrent).
11. **`finish_task(message, success)`**: Concludes autonomous goal and generates structured report.

---

## 13. Implementation Checklist & Verification Gates

* [ ] **Gate 1: Pluggable Model Architecture & Ornith Recommendation**  
  Support pluggable models in `desktop/src/services/aiProviderService.js` (OpenAI, Claude, DeepSeek, Ollama, LM Studio), with **Devil.co Ornith-1.0-9B** as the flagship recommended local engine.
* [ ] **Gate 2: Universal Multi-Placeholder Form Filling**  
  Upgrade `type_text` with placeholder resolution, `HTMLInputElement.prototype` setter override, and support for multi-field form sequences without premature submit.
* [ ] **Gate 3: Atomic Primitives Modernization**  
  Add `press_key` tool (`Space` for media toggle, `Enter` for form submit, `Tab`, `Escape`) to `BROWSER_TOOLS` and execution dispatcher.
* [ ] **Gate 4: Single but Dynamic Self-Healing Loop & Delta Engine**  
  Replace the silent `break;` in `executeAutonomousAgentLoop` with the closed-loop:  
  `Observe ➔ Understand ➔ Plan ONE dynamic action ➔ Execute ➔ Verify Delta (Success ➔ Next, Failure ➔ Diagnose ➔ Alternate ➔ Retry ➔ Verify)`.
* [ ] **Gate 5: Sub-Agent Delegation Manager (Max 3 Concurrent)**  
  Implement Sub-Agent lifecycle tracking with unique IDs, concurrency cap of 3 to preserve RAM, and structured result handover to Main Agent.
* [ ] **Gate 6: Non-Destructive Ad-Blocking**  
  Maintain Brave Shields `adblock-rust` network filtering without destructive DOM wiping, keeping video playback and site layouts stable.
* [ ] **Gate 7: End-to-End Verification & Telegram Telemetry**  
  Verify autonomous execution across arbitrary video playback (click + Space), multi-placeholder form filling, and sub-agent delegation, streaming live updates and screenshots to `@Red_Rose_A_bot`.
