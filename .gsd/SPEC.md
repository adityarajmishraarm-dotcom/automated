# SPEC.md — Antigravity Browser Project Specification

> **Status:** `FINALIZED`
>
> 🔒 **Planning Lock:** Planning phase complete and finalized. Spec-driven development is active.

## Vision
The **Antigravity Browser** is an AI-Native, high-performance Chromium desktop browser (Chrome & Brave alternative) built with an in-process Chromium engine and an Electron + React HUD. It provides direct, zero-leak browser automation without third-party wrappers, featuring native ad-blocking, element accessibility tree sanitization, Set-of-Marks visual grounding, and in-memory grep search.

## Goals
1. **Autonomous Direct Automation:** Interact directly with in-process DevTools and native accessibility trees without WebSocket port exposure.
2. **Context-Optimized Execution:** Cap accessibility tree serialized markdown under 3,000 tokens to protect subagent token limits.
3. **High-Performance In-Memory Grep:** Provide $\pm 10$ line windowing and pagination for DOM and script search.
4. **Visual Grounding:** Render high-contrast Set-of-Marks (SoM) bounding badges (`#FFE600`) synchronized with element IDs in under 16ms.
5. **Zero Ad & Tracker Overhead:** Cancel ad/telemetry requests at 0 bytes using Brave `adblock-rust` rule matching.

## Non-Goals (Out of Scope)
- No remote debugging port (`--remote-debugging-port`) exposure.
- No Puppeteer, Playwright, or Selenium webdriver wrappers.
- No bulky monolithic DOM dumps into agent context windows.

## Constraints
- **Subagent Token Limit:** Isolated subagent runs must not exceed 70% of available context window.
- **Platform:** Windows, macOS, and Linux compatibility via Electron 44 + Node.js.
- **Language / Tech:** Electron, React 19, esbuild, Chromium native APIs.

## Success Criteria
- [x] Frameless glassmorphic browser window operational with Omnibox & Tab Strip.
- [x] In-process adblock engine intercepts network requests and injects cosmetic CSS.
- [ ] DOM accessibility sanitization verified under 3,000 tokens ceiling.
- [ ] In-memory grep engine verified with $\pm 10$ context line windowing.
- [ ] Clean build and test execution via `npm run build:react`.
