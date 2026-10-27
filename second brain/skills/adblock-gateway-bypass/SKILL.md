---
name: adblock-gateway-bypass
description: Procedural navigation of file hosting ad-walls, countdown gateways, and anti-bot timers with automatic popup suppression
triggers:
  - gateway
  - countdown
  - adwall
  - download.?timer
  - popup
  - bypass
version: 1.0.0
---

# Adblock & Gateway Bypass — Procedural Automation

Designed to handle intermediary download gateways, countdown timers, and deceptive ad overlays without triggering automated bot locks.

## Core Procedural Principles

### 1. Ingest Page & Detect Active Countdown Element
Locate the timer element:
```javascript
const timerSelectors = [
  '#timer', '#countdown', '.countdown', '[data-timer]', '.timer-seconds', 'span#seconds'
];
```

### 2. Observe Timer Progression
- Do NOT click download triggers while `timer > 0`. Early clicks often trigger deceptive popunder ad scripts or captcha challenges.
- Wait until timer text or attribute reaches `0` or element visibility switches to `display: none`.

### 3. Immediate Popup / Popunder Suppression
- If a click action opens a secondary window or unexpected tab:
  ```javascript
  if (newTab && !newTab.url.includes(targetDomain)) {
    await newTab.close(); // Immediately close popup
  }
  ```

### 4. Locate Genuine Download Mark & Trigger Hardware Click
- Re-index Set-of-Marks on the target page after the timer has elapsed.
- Identify the genuine direct download button (inspecting `href` or CDP bounding box).
- Dispatch native CDP click directly on visual center coordinates.
- Verify download initiated by checking download progress in CDP session.
