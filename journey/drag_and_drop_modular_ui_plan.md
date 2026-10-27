# Drag & Drop Modular Browser UI & Live Element Code Customizer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform every major aspect of the Antigravity Browser UI (Tabs, Toolbar buttons, Omnibox, AI HUD Sidebar, Bookmarks, Split-View Viewports, and New Tab widgets) into modular drag-and-drop components, and empower users with an in-browser "UI Edit Mode" and live code editor ("The Big Box") to inspect, edit, compile, hot-swap, upload custom HTML5/CSS code, and revert any specific element with zero bloat and complete failure recovery.

**Architecture:** A unified drag-and-drop event engine (`dndLayoutService.js`) handles spatial rearrangement, split-view docking, and layout persistence. Layered atop this is an isolated Component Customizer Engine (`elementCustomizerService.js` & `CustomizableElementWrapper.jsx`) that wraps every modular UI element. When "Edit Mode" is engaged, each element displays an `[✏️ Edit Code]` trigger that opens a live code studio modal (`ElementEditModal.jsx`). The editor provides live HTML5 markup and scoped CSS editing, file uploads, in-browser compilation/validation, instant single-element DOM hot-swapping, and atomic factory-revert guarantees.

**Tech Stack:** React 19, Native HTML5 Drag and Drop API (`dataTransfer`), Scoped Dynamic HTML5/CSS Compiler & Sanitizer, Vanilla CSS Glassmorphism, Electron IPC, esbuild.

---

## 🏗️ System Architecture & Workflow

### 1. Unified Modular Drag-and-Drop + Live Element Customizer Canvas

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP DOCK ZONE: Draggable Tab Strip (Reorder tabs, drag out to split/window, drag link to open tab)      │
│ [ ● ● ● ] [ Tab 1 ⠿ ✏️ ] [ Tab 2 ⠿ ✏️ ] [ + ] [ 🔍 ]         [ 🛠️ Edit Mode ] [ 🛡️ 14 ] [ ✦ AI Layer ]│
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ REORDERABLE TOOLBAR (Drag buttons to rearrange order, click ✏️ in Edit Mode to customize element code) │
│ [ ‹ › ↻ 🏠 ✏️ ]  [ 🔍 Google | 🦁 Brave ✏️ ]  [ 🔒 https://... ★ ✏️ ] [ Go ✏️ ] [ 📖 📱 🎨 🔤 📥 🕒 🔑 ✏️ ]│
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ BOOKMARKS BAR (Drag to reorder bookmarks, drag URL to save, ✏️ to customize bookmark pill appearance)   │
│ [ ➕ Add ] [ 🔖 Google ✏️ ] [ 🔖 Wikipedia ✏️ ] [ 🔖 Hacker News ✏️ ]                      [ 🕒 History ]│
├──────────────────────────────────────┬──────────────────────────────────┬──────────────────────────────┤
│ LEFT DOCK ZONE (Arc style)           │ MAIN VIEWPORT / SPLIT TILES      │ RIGHT DOCK ZONE (Default)    │
│ [ Dock sidebar here via Drag ]       │ ┌──────────────┬───────────────┐ │ AI HUD Sidebar (Docked) ✏️   │
│                                      │ │ Tab 1 (50%)  │ Tab 2 (50%)   │ │ • Shield telemetry           │
│                                      │ │ Webview L    │ Webview R     │ │ • AX Tree / SoM Controls     │
│                                      │ │              │               │ │ • Streaming Chat / Reasoning │
│                                      │ └──────────────┴───────────────┘ │ • Tool execution cards       │
│                                      │ [ Drag divider to resize ratio ] │ [ ⠿ Drag Header to move dock]│
├──────────────────────────────────────┴──────────────────────────────────┴──────────────────────────────┤
│ NEW TAB PAGE (NTP) MODULAR WIDGET CANVAS:                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │  [ ⠿ Search Bar Hero Widget ✏️ ] -> Click ✏️ opens "The Big Box" Code Editor Modal              │  │
│  │  [ ⠿ AI Prompt Bar Widget ✏️ ]                                                                  │  │
│  │  [ ⠿ Speed Dials Grid ✏️ ]                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2. Live Element Code Inspection, Hot-Compilation & Revert Lifecycle

```
[ User enables "🛠️ Edit Mode" in Toolbar ]
                  │
                  ▼
[ Every modular element displays neon dashed outline + "✏️ Edit Code" pill ]
                  │
                  ▼ (User clicks "✏️ Edit Code" on Search Bar)
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                            "THE BIG BOX" ELEMENT CODE STUDIO                                 │
│  Target: element_ntp_search_bar | Status: Factory Prebuilt (or Custom Active)                │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│  [ 📄 HTML5 Template ] [ 🎨 Scoped CSS ] [ 📁 Upload Component File ] [ 💾 Export Component ]│
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│  1  <div class="custom-search-container">                                                    │
│  2    <input type="text" class="custom-search-input" placeholder="Search the cosmos..." />   │
│  3    <button class="custom-search-btn" onclick="submitSearch()">🚀 Search</button>          │
│  4  </div>                                                                                   │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│  [ CSS Tab ]:                                                                                │
│  1  .custom-search-container { display: flex; gap: 8px; border: 2px solid #00e5ff; }        │
│  2  .custom-search-input { background: rgba(0,0,0,0.6); color: #fff; border-radius: 8px; } │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│  Compilation Status: [ ✅ Syntax Clean - Zero Errors ]                                        │
│  [ ⚡ Compile & Apply ]       [ ↺ Revert to Default ]       [ ✕ Close ]                       │
└──────────────────────────────┬──────────────────────────────┬────────────────────────────────┘
                               │                              │
         (Click "⚡ Compile & Apply")                 (Click "↺ Revert to Default")
                               │                              │
                               ▼                              ▼
                 [ Compile, Validate & Inject ]     [ Wipe Custom Override from localStorage ]
                 [ Live Hot-Swap That Element ]     [ Restore Prebuilt Factory Component ]
                 [ Persist to localStorage ]        [ Zero Browser Reload Required ]
```

---

## 📋 Comprehensive Task Breakdown

### Task 1: Component Registry, Compilation Engine & Storage Service
**Files:**
- Create: `desktop/src/services/elementCustomizerService.js`
- Test: `tests/test_element_customizer.js`

**Step 1: Write test for component registry, compilation, and revert safety**
- Test registering default prebuilt templates for:
  - `element_ntp_search_bar` (New Tab search box)
  - `element_omnibox` (Top URL bar and engine tag)
  - `element_nav_buttons` (Back/Forward/Reload/Home cluster)
  - `element_tab_pill` (Individual tab styling)
  - `element_bookmark_pill` (Bookmark item)
  - `element_ai_prompt_bar` (New Tab AI prompt input)
- Test compiling valid HTML/CSS strings into clean DOM render nodes.
- Test rejecting malformed syntax with explicit error diagnostics without crashing.
- Test `saveCustomElement(id, { html, css })` and verifying `localStorage` persistence.
- Test `revertElement(id)` to restore the untouched factory prebuilt template.
- Test `resetAllCustomElements()` for complete factory restore.

**Step 2: Run test to verify failure**
Run: `node tests/test_element_customizer.js`
Expected: FAIL (module not found).

**Step 3: Implement `elementCustomizerService.js`**
- Define `DEFAULT_ELEMENT_TEMPLATES` for all modular UI elements with clean semantic HTML and scoped CSS.
- Implement `compileElementCode(elementId, htmlString, cssString)`:
  - Validates HTML tree structure via DOMParser.
  - Generates scoped CSS targeting `#custom-element-<id>`.
  - Binds synthetic action hooks (e.g., `data-action="navigate"`, `data-action="submit"`, `data-action="back"`).
- Implement `getCustomElement(id)`, `saveCustomElement(id, data)`, `revertElement(id)`, `resetAllElements()`.
- Implement `exportComponentPackage(id)` (downloads `.component.html` with embedded `<template>` and `<style>`).
- Implement `parseUploadedComponentPackage(rawContent)` (extracts HTML and CSS blocks safely).

**Step 4: Run test to verify it passes**
Run: `node tests/test_element_customizer.js`
Expected: PASS.

---

### Task 2: "The Big Box" Element Code Studio Modal (`ElementEditModal.jsx`)
**Files:**
- Create: `desktop/src/components/ElementEditModal.jsx`
- Modify: `desktop/styles.css`
- Test: `tests/test_element_edit_modal.js`

**Step 1: Write test verifying modal state, syntax verification, and upload parsing**
Test loading an element's active code into the editor, handling tab switches between HTML and CSS, triggering the compile callback, and parsing an uploaded HTML5 code package.

**Step 2: Run test to verify failure**
Run: `node tests/test_element_edit_modal.js`
Expected: FAIL.

**Step 3: Implement `ElementEditModal.jsx`**
- Floating/centered glassmorphic modal with:
  - **Header:** Element Name, Component ID badge, "Factory Default" vs "Custom Active" indicator, ESC to close.
  - **Toolbar:** `[📄 HTML5 Markup]` tab, `[🎨 Scoped CSS]` tab, `[📁 Upload Code]` button, `[💾 Export Package]` button.
  - **Code Editor ("The Big Box"):** Monospace textarea with line numbers, syntax highlighting accents, auto-indentation, and live error display bar.
  - **Live Preview Box:** Renders real-time compiled snapshot of the edited element side-by-side.
  - **Action Footer:**
    - `[⚡ Compile & Apply]` (compiles code, verifies syntax, and hot-updates that element).
    - `[↺ Revert to Default]` (wipes user override, restores prebuilt factory code, confirms with toast).
    - `[✕ Close]` button.
- **Upload Feature:** Native hidden `<input type="file" accept=".html,.jsx,.css,.json">` that reads uploaded files via `FileReader`, parses the specific element codes, populates the editor, and validates.

**Step 4: Build and verify**
Run: `npm run build:react && node tests/test_element_edit_modal.js`
Expected: PASS.

---

### Task 3: Universal Customizable Element Wrapper (`CustomizableElementWrapper.jsx`)
**Files:**
- Create: `desktop/src/components/CustomizableElementWrapper.jsx`
- Modify: `desktop/styles.css`
- Test: `tests/test_customizable_wrapper.js`

**Step 1: Write test for wrapper rendering mode**
Test rendering default React children when no override exists vs rendering custom compiled HTML/CSS when override is active; test displaying the `[✏️ Edit Code]` trigger button when `isEditMode` is enabled.

**Step 2: Run test to verify failure**
Run: `node tests/test_customizable_wrapper.js`
Expected: FAIL.

**Step 3: Implement `CustomizableElementWrapper.jsx`**
- Wraps any UI component with:
  - Attribute `id={`custom-element-${elementId}`}`.
  - In normal mode: if custom compiled code exists in `localStorage`, renders the custom DOM with scoped styles; otherwise renders standard React children.
  - In Edit Mode (`isEditMode === true`): adds a glowing cyan dashed border, a hovering `[✏️ Edit Code]` pill, and an indicator badge showing whether it is "Default" or "Custom".
  - Clicking `[✏️ Edit Code]` fires `onOpenElementEditor(elementId)`.
  - Error boundary: if custom user code throws an error, gracefully catches it, falls back to the default prebuilt component, and flags the editor with the error.

**Step 4: Build and verify**
Run: `npm run build:react && node tests/test_customizable_wrapper.js`
Expected: PASS.

---

### Task 4: Modular Drag-and-Drop Layout Service (`dndLayoutService.js`)
**Files:**
- Create: `desktop/src/services/dndLayoutService.js`
- Test: `tests/test_dnd_layout.js`

**Step 1: Write test for layout persistence and reordering algorithms**
Verify array reordering logic (`arrayMove(items, fromIndex, toIndex)`), docking position validators (`left`, `right`, `bottom`, `float`), toolbar item registries, and atomic schema migrations.

**Step 2: Run test to verify failure**
Run: `node tests/test_dnd_layout.js`
Expected: FAIL.

**Step 3: Implement `dndLayoutService.js`**
- Implement `arrayMove(array, fromIndex, toIndex)` immutable helper.
- Implement `DEFAULT_UI_LAYOUT`:
  ```javascript
  {
    toolbarOrder: ['nav-controls', 'engine-toggle', 'omnibox', 'go-btn', 'page-actions', 'studios', 'management', 'status-pill'],
    sidebarDock: 'right', // 'right' | 'left' | 'bottom' | 'float'
    sidebarWidth: 380,
    sidebarHeight: 280,
    splitView: { active: false, leftTabId: null, rightTabId: null, ratio: 0.5 },
    newTabWidgets: ['search-hero', 'ai-bar', 'speed-dials', 'quick-notes'],
    editMode: false
  }
  ```
- Implement `loadLayoutConfig()` and `saveLayoutConfig(config)` with `localStorage` validation.
- Implement HTML5 payload encoders/decoders (`setDragData(e, type, payload)`, `getDragData(e, type)`).

**Step 4: Run test to verify it passes**
Run: `node tests/test_dnd_layout.js`
Expected: PASS.

---

### Task 5: Draggable & Customizable TabStrip (`TabStrip.jsx`)
**Files:**
- Modify: `desktop/src/components/TabStrip.jsx`
- Modify: `desktop/styles.css`
- Test: `tests/test_tab_drag.js`

**Step 1: Write test for tab drag-and-drop reordering & element edit mode**
Test tab reordering via drag events and tab customization trigger.

**Step 2: Run test to verify baseline**
Run: `node tests/test_tab_drag.js`
Expected: Confirms current baseline.

**Step 3: Implement Drag-and-Drop & Customization in `TabStrip.jsx`**
- Add `draggable={true}` to each `.native-tab` with visual insertion indicator lines.
- Wrap the tab element in `CustomizableElementWrapper` (`element_tab_pill`).
- Drag-out detection: dragging tab into viewport triggers split-view drop zone; dragging outside window boundary triggers detachment.
- Add `[🛠️ Edit Mode]` toggle button in the window controls area so the user can easily activate/deactivate customization mode with 1 click.

**Step 4: Build and verify**
Run: `npm run build:react`
Expected: Clean esbuild bundling.

---

### Task 6: Modular Reorderable & Customizable Navigation Toolbar (`NavigationToolbar.jsx`)
**Files:**
- Modify: `desktop/src/components/NavigationToolbar.jsx`
- Modify: `desktop/styles.css`
- Test: `tests/test_toolbar_dnd.js`

**Step 1: Write test for toolbar item reordering & code customization**
Test rearranging toolbar modules (`omnibox` moving before `engine-toggle`, action tools custom sorting) and opening element editor for the Omnibox.

**Step 2: Run test to verify failure**
Run: `node tests/test_toolbar_dnd.js`
Expected: FAIL.

**Step 3: Implement modular toolbar layout and wrapper in `NavigationToolbar.jsx`**
- Break toolbar items into discrete draggable units (`item_nav_controls`, `item_engine_toggle`, `item_omnibox`, `item_go_btn`, `item_page_actions`, `item_studios`, `item_management`, `item_status`).
- Wrap `item_omnibox` in `CustomizableElementWrapper` (`element_omnibox`).
- Wrap `item_nav_controls` in `CustomizableElementWrapper` (`element_nav_buttons`).
- Provide horizontal drag handles (`⠿`) on each module when customizing.
- Allow users to freely reorder items and click `[✏️ Edit Code]` to customize HTML/CSS of the Omnibox and Navigation buttons.

**Step 4: Build and verify**
Run: `npm run build:react && node tests/test_toolbar_dnd.js`
Expected: PASS.

---

### Task 7: Drag-and-Drop & Customizable New Tab Page Widgets (`NewTabPage.jsx`)
**Files:**
- Modify: `desktop/src/components/NewTabPage.jsx`
- Modify: `desktop/styles.css`
- Test: `tests/test_ntp_widgets_dnd.js`

**Step 1: Write test for NTP search bar customization & widget reordering**
Test editing the New Tab Page search bar code, compiling custom HTML/CSS, verifying that ONLY the search bar updates, and testing the revert button.

**Step 2: Run test to verify failure**
Run: `node tests/test_ntp_widgets_dnd.js`
Expected: FAIL.

**Step 3: Implement Search Bar Customization & Widget DnD in `NewTabPage.jsx`**
- Wrap `SearchHero` in `CustomizableElementWrapper` (`element_ntp_search_bar`).
- Wrap `AiPromptBar` in `CustomizableElementWrapper` (`element_ai_prompt_bar`).
- Wrap `SpeedDialsGrid` in `CustomizableElementWrapper` (`element_speed_dial`).
- When in Edit Mode, clicking `[✏️ Edit Code]` on the search bar opens "The Big Box" showing its isolated HTML5 and CSS.
- Users can change the placeholder, add buttons, alter styling, or upload custom search bar code, click `[⚡ Compile & Apply]`, and watch only that search bar hot-update immediately!
- Clicking `[↺ Revert to Default]` instantly restores the clean factory search bar.
- Add drag handles to reorder widgets vertically or on a grid.

**Step 4: Build and verify**
Run: `npm run build:react && node tests/test_ntp_widgets_dnd.js`
Expected: PASS.

---

### Task 8: Multi-Dock Zone AI HUD Sidebar & Drag-to-Split Viewports (`App.jsx`)
**Files:**
- Modify: `desktop/src/App.jsx`
- Modify: `desktop/src/components/AiHudSidebar.jsx`
- Modify: `desktop/styles.css`
- Test: `tests/test_panel_docking_and_split.js`

**Step 1: Write test for panel docking and split-view drag**
Test docking sidebar to Left, Right, Bottom, or Float, and dropping a tab to activate split-screen.

**Step 2: Run test to verify failure**
Run: `node tests/test_panel_docking_and_split.js`
Expected: FAIL.

**Step 3: Implement Docking Zones and Split Tiling in `App.jsx`**
- Connect `isEditMode` state and `ElementEditModal` into `App.jsx`.
- Implement drag-and-drop docking for AI HUD:
  - Header drag handle snaps to Left, Right, Bottom, or Floating Cockpit.
  - Resizable split divider with mouse drag ratio control.
- Implement viewport drop targets:
  - Dragging a tab from top strip into the viewport splits the screen (Left/Right dual webview).
- Add global "Reset All Custom Elements & Layout" in settings to revert everything cleanly.

**Step 4: Build and verify**
Run: `npm run build:react && node tests/test_panel_docking_and_split.js`
Expected: PASS.

---

### Task 9: Complete System Integration, Verification & Synchronization
**Files:**
- Test: `tests/test_dnd_full_suite.js`
- Build: `npm run build:react`
- Verification: Live demonstration with active app.

**Step 1: Execute complete automated test suite**
Run all unit and integration tests across tasks 1 through 8.

**Step 2: Build production React bundle**
Run: `npm run build:react`
Ensure `desktop/dist/bundle.js` compiles with zero warnings or errors.

**Step 3: Synchronize with `c:\Users\Anurag\Desktop\ai\automated browser`**
Mirror all code changes, plans, and test scripts directly to `c:\Users\Anurag\Desktop\ai\automated browser` to keep both directories in 100% lockstep.

**Step 4: Live visual verification**
Launch native desktop app (`npm start`), engage Edit Mode, click `[✏️ Edit Code]` on the search bar, edit and compile, test uploading a custom snippet, verify revert to default, and verify drag-and-drop across tabs and toolbar.

---

## 🚀 Execution Handoff

Plan complete and saved to `docs/plans/2026-10-24-drag-and-drop-modular-ui.md` and `journey/drag_and_drop_modular_ui_plan.md`.

Two execution options:
1. **Subagent-Driven (this session)** - I dispatch fresh subagents per task, review between tasks, fast iteration.
2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints.

Which approach would you like to take?
