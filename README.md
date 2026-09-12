# Antigravity Web Browser - Tab Management System

A high-performance, modern web browser tab management architecture featuring an interactive **Web UI Suite** (HTML5/CSS3/JavaScript) and a **Native C Engine** (C11/MinGW).

---

## Features

- **Full Tab Lifecycle**: Open, close, duplicate, and activate tabs with smooth transitions.
- **Undo-Closed Tabs (`Ctrl+Shift+T`)**: History stack to restore recently closed tabs.
- **Pinned Tabs**: Compact icon-only tabs anchored to the left and protected from bulk closure.
- **Drag-and-Drop Reordering**: Rearrange tabs live in the tab strip.
- **Tab Groups**: Chrome/Arc-style color-coded, collapsible tab groups.
- **Media & Audio Badges**: Live audio playing indicator with click-to-mute toggle.
- **Memory Saver (Tab Sleeping)**: Hibernates inactive tabs to free RAM.
- **Tab Search / Command Palette (`Ctrl+K`)**: Fast fuzzy search across open tabs with keyboard navigation.
- **Custom Context Menu**: Right-click menu for tab actions (Close Others, Close to Right, Duplicate, Pin).
- **Keyboard Shortcuts**: Standard browser hotkeys (`Ctrl+T`, `Ctrl+W`, `Ctrl+Shift+T`, `Ctrl+Tab`, `Ctrl+1..9`, `Ctrl+K`).

---

## Project Structure

```
├── browser/
│   ├── index.html          # Browser UI (Tab strip, Omnibox, Viewport)
│   ├── css/
│   │   └── tab-system.css  # Dark glassmorphic design & animations
│   └── js/
│       ├── tab-model.js    # Tab, TabGroup, TabHistoryStack models
│       ├── tab-manager.js  # Core tab management engine
│       └── app.js          # App orchestrator & hotkey bindings
├── native_c/
│   ├── tab_manager.h       # C header with tab doubly-linked list & structs
│   ├── tab_manager.c       # C implementation of tab lifecycle
│   └── main_tabs.c         # C test suite & demo
└── .gitignore
```

---

## Quick Start

### 1. Web Browser UI
Open `browser/index.html` in any web browser:
```powershell
start browser/index.html
```

### 2. Native C Tab Engine
Compile and run the C demo with GCC:
```powershell
gcc -Wall -Wextra native_c/tab_manager.c native_c/main_tabs.c -o native_c/tabs_demo.exe
.\native_c\tabs_demo.exe
```
