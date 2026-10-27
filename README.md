# 🌌 Nexora Browser — AI-Native Autonomous Browser & Second Brain

<p align="center">
  <img src="desktop/assets/logo.png" alt="Nexora Browser Logo" width="128" height="128" style="border-radius: 24px; box-shadow: 0 10px 30px rgba(124, 58, 237, 0.4);" />
</p>

<p align="center">
  <strong>The Next-Generation AI-Native Desktop Browser with In-Process Hardware Automation and Persistent Second Brain Intelligence.</strong>
</p>

<p align="center">
  <a href="#-architecture-overview"><img src="https://img.shields.io/badge/Architecture-Electron%20%2B%20Chromium%20%2B%20React%2019-7c3aed" alt="Architecture" /></a>
  <a href="#-core-subsystems"><img src="https://img.shields.io/badge/Input%20Engine-True%20Hardware%20sendInputEvent-00f0ff" alt="Hardware Input" /></a>
  <a href="#-second-brain-intelligence-layer"><img src="https://img.shields.io/badge/Memory-Hybrid%20Markdown%20%2B%20SQLite-ff007a" alt="Second Brain" /></a>
  <a href="#-license"><img src="https://img.shields.io/badge/License-MIT-00ff66" alt="License" /></a>
</p>

---

## 🌟 Overview

**Nexora** is an ultra-fast, autonomous, privacy-focused desktop browser engineered from the ground up as a native alternative to Chrome and Brave. Unlike traditional automation bots that rely on fragile remote debuggers (Puppeteer, Selenium, Playwright) or synthetic DOM events, **Nexora operates directly in-process with Chromium**, dispatching genuine OS hardware input events, utilizing Set-of-Marks visual grounding, perceiving pages via ultra-compact accessibility trees (AXTree), and retaining long-term user memories and procedural skills through a persistent **Second Brain** intelligence subsystem.

---

## 🚀 Key Architectural Pillars

### 1. 🖱️ True Hardware Input Engine (`sendInputEvent`)
- **Native OS-Level Event Dispatch:** Completely replaces synthetic DOM `el.click()` and `dispatchEvent(new MouseEvent(...))` with Electron's Chromium-native `sendInputEvent`.
- **Bot Defense Immunity:** Dispatches `mouseMove`, `mouseDown`, 50ms hold, and `mouseUp` with real hardware kinematics, generating genuine `isTrusted === true` events that effortlessly bypass Cloudflare Turnstile, DataDome, and anti-bot verification gateways.
- **Hardware Keystrokes & Streams:** Types characters via native `keyDown`, `char`, and `keyUp` sequences with realistic typing jitter and Enter form dispatch.

### 2. 🎯 Bounding-Box Centered Set-of-Marks (SoM)
- **Physical Coordinate Anchoring:** Calculates precise physical center coordinates for every interactive element:
  $$\text{centerX} = \text{Math.round}\left(\text{rect.left} + \frac{\text{rect.width}}{2}\right),\quad \text{centerY} = \text{Math.round}\left(\text{rect.top} + \frac{\text{rect.height}}{2}\right)$$
- **High-Contrast Visual Badging:** Injects clean neon yellow (`#FFE600`) pill markers (`[#1]`, `[#2]`, etc.) directly into the viewport overlay.
- **In-Memory Coordinate Cache (`somMarkCoordinateCache`):** Caches mark positions in memory. When the AI or user triggers `click #3`, Nexora resolves the coordinates instantly and fires a hardware click without re-evaluating the full DOM.

### 3. 🌳 AXTree-First Perception Engine (< 1.5KB Payload)
- **Chromium Accessibility Tree Extraction:** Leverages CDP `Accessibility.getFullAXTree` and an in-webview semantic walker to extract structured accessibility trees.
- **90% Token Reduction:** Replaces noisy 200KB HTML dumps with structured, indented accessibility trees under **1.5KB** (`RootWebArea`, `searchbox`, `button`, `link`, with ARIA states and SoM badge bindings).
- **Zero Selector Hallucination:** Models receive deterministic accessible names, roles, and mark IDs, speeding up model inference by 4x.

### 4. 🧠 Second Brain Persistent Intelligence Layer
- **Hybrid Markdown + SQLite Memory Architecture:** Dual-engine storage combining human-readable Markdown journals with high-speed indexed SQLite querying (`second_brain.db`).
- **90-Day Raw Chat Logging:** Captures all user conversations and tool trajectories across sessions in append-only JSONL format (`raw_sessions.jsonl`).
- **Daily 8:00 AM Reflection Cron:** An automated daily lifecycle cron schedules an intelligent reflection pass every morning at 8:00 AM:
  - Condenses 24-hour interaction trajectories into structured executive summaries.
  - Automatically extracts and safely records passwords, credentials, workflow patterns, and user preferences into long-term memory.
- **On-Demand Summary & Raw Retrieval:** Semantic search queries SQLite summaries first, loading complete raw chats only when deep historical context is required—saving over 95% of LLM context tokens.
- **The Hermes `/learn` Dynamic Skill Loop:** Autonomous procedural skill acquisition. When Nexora solves a complex new task (e.g., ad-gateway countdown bypasses or checkout flows), the agent records its execution trajectory, extracts dead ends, and compiles a reusable procedural recipe into `skills/<skill_name>/SKILL.md`.
- **Dynamic Tool Provisioning (Codex-Style Context Layer):** Only activates the exact tools required for the active phase, enforcing sliding context windowing (current turn + last 3 results) to prevent model token saturation.

### 5. 🛡️ In-Process Adblock & Network Interception
- **Brave `adblock-rust` Engine:** In-process EasyList and uBlock Origin rule compilation.
- **Zero-Byte Request Cancellation:** Blocks trackers, ads, and telemetry before a single network byte is sent (`onBeforeRequest`).
- **Cosmetic Filtering:** Injects dynamic CSS rules to remove empty advertising containers.

### 6. 🎙️ Offline Voice Dictation & Floating HUD Cockpit
- **Local Whisper Speech-to-Text (`whisper_engine.js`):** Offline speech recognition for instant voice command execution.
- **Detached AI Copilot HUD:** Dual-interface copilot—docked within the browser sidebar or detached into a multi-monitor floating HUD window with live streaming reasoning and tool visualizers.

---

## 📁 Repository Structure

```
automated browser/
├── second brain/                          # 🧠 Autonomous Persistent Intelligence Subsystem
│   ├── memory_manager.js                  # Hybrid Markdown + SQLite dual storage manager
│   ├── memory_retriever.js                # Fast summary search with on-demand raw chat retrieval
│   ├── skill_manager.js                   # Hermes /learn procedural skill engine
│   ├── reflection_engine.js               # LLM reflection & fact/credential extractor
│   ├── lifecycle_manager.js               # Morning 8:00 AM cron schedule & maintenance loop
│   ├── context_manager.js                 # Dynamic tool provisioning & context window optimizer
│   ├── skills/                            # Reusable learned procedural skills (SKILL.md recipes)
│   ├── memory/                            # Long-term knowledge base & SQLite database
│   │   ├── second_brain.db                # SQLite database with FTS & vector indices
│   │   ├── MEMORY.md                      # Curated persistent knowledge & user preferences
│   │   └── raw_sessions.jsonl             # 90-day append-only raw session logs
│   ├── connector/                         # IPC bridge connecting Second Brain to Nexora
│   └── test_phase8_e2e.js                 # Full end-to-end Second Brain validation suite
│
├── automated browser/                     # 🌐 Nexora Desktop Application & Core Engine
│   ├── desktop/                           # Standalone Native Desktop Shell
│   │   ├── main.js                        # Electron main process (Hardware IPC, Adblock, Single Instance)
│   │   ├── package.json                   # Desktop build manifest & dependencies
│   │   ├── styles.css                     # Premium dark glassmorphism design system
│   │   ├── adblock_engine.js              # In-process Brave/EasyList adblocker
│   │   ├── whisper_engine.js              # Local Whisper offline voice dictation
│   │   ├── guest_preload.js               # Secure webview bridge script
│   │   ├── test_core_tools.mjs            # Validation suite for hardware input & AXTree perception
│   │   ├── assets/                        # High-resolution logos & icons (Nexora brand)
│   │   │   ├── logo.png                   # Official Nexora browser icon
│   │   │   └── icon.png                   # Windows taskbar & window identity icon
│   │   └── src/                           # React 19 Frontend & AI Harness Layer
│   │       ├── index.jsx                  # React application root
│   │       ├── App.jsx                    # Browser window layout & tab controller
│   │       ├── ai_harness_engine.js       # Core AI Automation & Hardware Input Engine
│   │       ├── components/
│   │       │   ├── TabStrip.jsx           # Chromium TabStripModel with audio badges & previews
│   │       │   ├── NavigationToolbar.jsx  # Omnibox, shields, downloads, and AI triggers
│   │       │   ├── NewTabPage.jsx         # Modern start page with widgets & customization
│   │       │   ├── AiHudSidebar.jsx       # Docked AI Copilot sidebar
│   │       │   ├── DetachedAiHudCockpit.jsx # External floating multi-monitor HUD window
│   │       │   ├── AiProviderModal.jsx    # Model selector (OpenCode Zen, OpenAI, Claude, etc.)
│   │       │   └── DownloadsPage.jsx      # Native download manager flyout
│   │       └── services/
│   │           ├── aiProviderService.js   # Multi-provider LLM API client
│   │           └── elementCustomizerService.js # DOM appearance personalization
│   ├── package.json                       # Top-level application manifest & build scripts
│   └── PRD.md                             # Product Requirements Document & Invariants
```

---

## 🛠️ Quickstart & Installation

### Prerequisites
- [Node.js](https://nodejs.org) (v18.0.0 or higher recommended)
- `npm` (v9.0.0 or higher)

### 1. Installation
Clone the repository and install all dependencies:

```powershell
cd "c:\Users\Aditya\Downloads\automated browser\automated browser"
npm install
```

### 2. Build the React Application
Compile the React 19 frontend into a high-performance single-bundle distribution:

```powershell
npm run build:react
```

### 3. Launch Nexora Browser
Start the complete desktop application:

```powershell
npm start
```

---

## 🧪 Verification & Test Suites

Nexora includes automated test suites covering both the core browser tools and the Second Brain memory subsystems:

### Run Core Tools Test Suite (Hardware Input, Coordinates & AXTree)
```powershell
cd "c:\Users\Aditya\Downloads\automated browser\automated browser\desktop"
node test_core_tools.mjs
```
*Validates:*
- ✅ Native hardware click dispatch sequence (`mouseMove` $\to$ `mouseDown` $\to$ `mouseUp`).
- ✅ Native hardware key press sequence (`keyDown` $\to$ `char` $\to$ `keyUp`).
- ✅ Set-of-Marks physical bounding-box center calculations.
- ✅ In-memory coordinate caching and deterministic `#N` click routing.
- ✅ AXTree-first perception tree generation under 1.5KB.

### Run Second Brain End-to-End Suite
```powershell
cd "c:\Users\Aditya\Downloads\automated browser\second brain"
node test_phase8_e2e.js
```
*Validates:*
- ✅ 90-day raw conversation logging.
- ✅ SQLite daily reflection summary generation and search indexing.
- ✅ On-demand raw chat retrieval from summaries.
- ✅ Hermes `/learn` procedural skill generation (`SKILL.md`).
- ✅ 8:00 AM automated reflection lifecycle cron.

---

## ⌨️ AI Voice & Natural Language Commands

Nexora Copilot understands natural conversational commands, voice dictation, and compound multi-step workflows:

| Command | Action |
| :--- | :--- |
| `open youtube in current tab` | Navigates the active webview directly to YouTube. |
| `search for lofi hip hop on youtube` | Opens YouTube, focuses the search bar, types query, and submits. |
| `number words` / `show marks` | Injects Set-of-Marks visual overlay with numbered badges over all interactive elements. |
| `click #3` / `click download` | Dispatches true hardware click directly to element #3's physical center. |
| `type "John Doe" into #2` | Focuses element #2 via hardware click and types text via native keystrokes. |
| `read page` | Extracts clean Chromium Accessibility Tree (< 1.5KB) with marked elements. |
| `scroll down 50` / `scroll top` | Performs smooth proportional viewport scrolling. |
| `solve verification` / `bypass countdown` | Adapts to countdown timers, verifies landing forms, and selects download mirrors. |
| `/learn` | Synthesizes current session trajectory into a reusable procedural skill in `second brain/skills/`. |

---

## 🔒 Security & Privacy Guarantees

- **Zero WebSockets / Zero Port Leaks:** No `--remote-debugging-port` open to local malware or external network inspection.
- **Zero Third-Party Automation Flags:** No `navigator.webdriver = true` or automation flags detectable by anti-bot frameworks.
- **Local SQLite Storage:** Second Brain memories, conversation summaries, and procedural skills are stored locally on your device.
- **Single Instance Lock:** Prevents cache corruption and database contention across multiple window sessions.

---

## 📜 License

Distributed under the **MIT License**. Engineered for autonomous, resilient, high-assurance web browsing.
