---
name: ponytale
description: "Ponytale context optimizer module. Reduces agent input token consumption during long browser runs by caching static session states, pruning redundant DOM trees and verbose traces, and enforcing +/-10 line windowing without accuracy loss."
metadata:
  version: "1.0.0"
  triggers:
    - ponytale
    - ponytale.?optimize
    - context.?optimizer
    - prune.?dom
    - token.?pruning
---

# Ponytale Context Optimizer

High-efficiency context optimizer module engineered specifically for browser automation workflows. Cuts token consumption by 70–85% on continuous browser runs while preserving 100% functional accuracy.

## Core Optimization Pillars

### 1. DOM Tree Pruning & Sanitization
- **Strip Non-Interactive Bloat:** Strip `<script>`, `<style>`, `<svg>`, comments, and hidden nodes (`display: none`, `visibility: hidden`, `aria-hidden="true"`).
- **Interactive Focus:** Serialize only clickable, typable, and scrollable elements (`<a>`, `<button>`, `<input>`, `[role="button"]`, etc.) with assigned numeric IDs.
- **Strict Token Ceiling:** Enforce a hard ceiling of 3,000 tokens on serialized accessibility trees.

### 2. Session & Layout Caching
- **Static Cache:** Cache persistent layout frames (navigation bars, static headers/footers) across sequential browser actions.
- **Differential Updates:** Emit DOM diffs instead of re-dumping the entire page tree when only specific elements mutate.

### 3. $\pm 10$ Line Grep Windowing
- Never dump raw HTML source files or complete terminal logs into context.
- When searching logs, DOM nodes, or scripts, return only:
  - Top 10 context lines
  - The matched line (`>>> MATCH <<<`)
  - Bottom 10 context lines
- Paginate results when query hits exceed 10 instances.

### 4. Network Trace De-Duplication
- Filter polling requests, telemetry pings, and static asset fetches (fonts, images, chunks).
- Collapse repetitive network logs into single summary entries: `[Blocked 42 analytics pings]`.

### 5. Zero Accuracy Loss Guardrails
- **Always Preserve:**
  - Active page URL and HTTP status code.
  - Active focused element and form input states.
  - Test assertion outputs and error stack traces.
  - Unique element selectors needed for robotic clicks/keystrokes.

## Workflow Configuration

The optimizer reads configuration from `.agents/plugins/ponytale/config/ponytale.config.json` (or `ponytale.config.json` at workspace root).
