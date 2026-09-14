# AGENTS.md - Antigravity Workspace Rules & Directives

## 1. Strictly Native Desktop App Only (No Web Site / No Web Server)
- **Prohibition:** Under NO circumstances should this application ever be hosted, served, or launched as a website, HTTP web service, or browser iframe mockup.
- **Enforcement:**
  - Never introduce HTTP server scripts (like `server.js`, express, http servers) to run the browser.
  - Delete and block any code that attempts to launch or expose the browser as an HTTP website.
  - Always and only launch the browser as a standalone native desktop application (`npm start` or `npx -y electron desktop`).
  - The native app utilizes Chromium native `webview` / `WebContentsView` with in-process C++ bindings, `TabStripModel`, and `components/autofill`.

## 2. Mandatory Ponytail Skill Enforcement
- At every prompt and execution turn, the **Ponytail** skill must be automatically installed, active, and applied.
- The agent must always print the confirmation statement:
  `[PONYTAIL APPLIED] Enforcing minimalist senior developer philosophy (YAGNI, zero bloat, native code only).`
- Adhere strictly to the 5 core Ponytail tenets:
  1. **YAGNI (You Ain't Gonna Need It):** Minimal code necessary. Zero speculative abstractions or bloat.
  2. **Reuse Existing Code:** Leverage existing modules and established patterns.
  3. **No Unnecessary Dependencies:** Prefer native platform APIs over third-party libraries.
  4. **Clean & Concise Edits:** Surgical, targeted edits in place.
  5. **Direct & Efficient:** Fix root causes cleanly with zero fluff.

## 3. Strict Prohibition of Version Control Commands
- Until the user explicitly asks for it, **NEVER** run, use, or mention git commands or version control actions.
- Focus entirely on building, verifying, and launching the application natively to achieve the user's primary goal.

## 4. Mandatory Visible Full Browser UI on Every Launch
- **Requirement:** Every launch of the browser by AI must be immediately and prominently visible to the user on their screen.
- **Enforcement:**
  - The browser window must never launch hidden, minimized, off-screen, or restricted to a background frame.
  - Sizing must be the full browser (full work area / maximized display) so the user clearly sees how it operates and interacts in real time.
  - On launch, the window must be explicitly brought to the foreground, focused, and shown (`mainWindow.show()`, `mainWindow.focus()`, `mainWindow.moveTop()`).
  - Automated tests and AI harness actions must visually demonstrate navigation, searching, and interactions directly on screen in the active browser window.

