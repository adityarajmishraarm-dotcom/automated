---
name: browser-dom-navigator
description: Production-grade browser accessibility tree (AXTree) perception, Set-of-Marks (SoM) targeting, and post-action DOM delta verification
triggers:
  - navigate
  - click
  - scroll
  - axtree
  - set-of-marks
  - som
  - dom.?delta
version: 1.0.0
---

# Browser DOM Navigator — High-Reliability Perception & Action

Engineered for autonomous interaction with dynamic Chromium web pages, Single Page Applications (SPAs), and shadow DOM elements without brittle XPath selectors.

## Core Procedural Principles

### 1. Perception via Accessibility Tree (AXTree) & Set-of-Marks (SoM)
- **Do not parse raw HTML source.** Parse the semantic AXTree serialized by the CDP session.
- Identify interactive elements (`button`, `link`, `textbox`, `checkbox`, `menuitem`, `tab`).
- Assign unambiguous numeric marks `[#1]`, `[#2]`, `[#3]` at the visual center coordinates of each element.

### 2. Physical Action Execution
- **Navigation**:
  ```javascript
  // Always await network idle and DOM hydration
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  ```
- **Targeted Click**:
  - Resolve bounding box for mark `[#id]`.
  - Check element visibility (`offsetParent !== null` and element not obscured by modal overlays).
  - Dispatch physical CDP input event (`Input.dispatchMouseEvent` with `type: mousePressed` and `mouseReleased`).

### 3. Scroll & Viewport Handling
- When target mark is outside the visible viewport:
  - Scroll smoothly using `window.scrollBy({ top: deltaY, behavior: 'smooth' })`.
  - Re-sample AXTree and re-index Set-of-Marks on the new viewport.

### 4. Post-Action Delta Verification (Invariant)
- **Never claim success without physical delta proof:**
  - Verify URL mutation if action was expected to route.
  - Verify DOM mutation (e.g., modal appearance, text change, class toggle).
  - If no delta occurs within 1,500ms, mark action as failed and diagnose:
    - *Is there an invisible backdrop overlay?*
    - *Is there an anti-bot countdown timer active?*
    - *Does the element require a hover state first?*
