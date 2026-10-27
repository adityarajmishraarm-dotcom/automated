/**
 * Antigravity Browser — Universal Element Customizer Engine
 * 
 * Provides live in-browser component code inspection, custom HTML5/CSS compilation,
 * single-element hot-swapping, file upload parsing, and permanent factory revert safety.
 */

const STORAGE_PREFIX = 'antigravity_custom_element_';

// Permanent Factory Default Templates (Untouchable Baseline)
const DEFAULT_ELEMENT_TEMPLATES = {
    element_ntp_clock: {
        id: 'element_ntp_clock',
        title: 'New Tab Clock & Time',
        category: 'New Tab Page',
        description: 'Centered dynamic clock and personal greeting display on home page.',
        html: `<!-- ///// time code ///// -->
<div class="ntp-custom-clock-container">
  <div class="custom-clock-text" data-action="toggle-format">10:08 PM</div>
  <div class="custom-greeting-text">Welcome home! Where would you like to go today?</div>
</div>`,
        css: `/* ///// time code styles ///// */
.ntp-custom-clock-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 12px;
  user-select: none;
}
.custom-clock-text {
  font-size: 56px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -1.5px;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
  cursor: pointer;
  transition: transform 0.2s ease;
}
.custom-clock-text:hover {
  transform: scale(1.02);
}
.custom-greeting-text {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.75);
  font-weight: 400;
  margin-top: 8px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}`
    },

    element_ntp_search_bar: {
        id: 'element_ntp_search_bar',
        title: 'New Tab Search Bar',
        category: 'New Tab Page',
        description: 'Centered Google/Brave search input box on the home page.',
        html: `<!-- ///// search code ///// -->
<div class="ntp-custom-search-box">
  <div class="engine-pill" data-action="toggle-engine">
    <span class="engine-icon">🔍</span>
    <span class="engine-name">Google</span>
    <span class="engine-arrow">⇄</span>
  </div>
  <input 
    type="text" 
    class="search-input" 
    placeholder="Search Google or type a web address..." 
    data-action="navigate" 
    autofocus 
  />
  <button class="search-submit-btn" data-action="submit">Search</button>
</div>`,
        css: `/* ///// search code styles ///// */
.ntp-custom-search-box {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 680px;
  background: rgba(18, 24, 38, 0.75);
  border: 1.5px solid rgba(255, 255, 255, 0.12);
  border-radius: 28px;
  padding: 6px 14px;
  backdrop-filter: blur(20px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  gap: 10px;
}
.ntp-custom-search-box:focus-within {
  border-color: #00e5ff;
  box-shadow: 0 10px 35px rgba(0, 229, 255, 0.25);
}
.engine-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 229, 255, 0.12);
  border: 1px solid rgba(0, 229, 255, 0.3);
  border-radius: 16px;
  padding: 4px 10px;
  color: #00e5ff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #f8fafc;
  font-size: 14px;
  font-family: inherit;
}
.search-submit-btn {
  background: #00e5ff;
  color: #070b14;
  border: none;
  border-radius: 18px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s ease;
}
.search-submit-btn:hover {
  transform: scale(1.04);
}`
    },

    element_omnibox: {
        id: 'element_omnibox',
        title: 'Top Navigation Omnibox',
        category: 'Toolbar',
        description: 'Primary browser address bar and engine indicator pill.',
        html: `<!-- ///// omnibox code ///// -->
<div class="custom-omnibox-wrapper">
  <span class="omnibox-lock-icon" data-action="ssl-badge">🔒</span>
  <input 
    type="text" 
    class="omnibox-input-field" 
    placeholder="Search or enter web address" 
    data-action="navigate" 
    spellcheck="false" 
  />
  <span class="omnibox-engine-badge">Engine</span>
  <button class="omnibox-star-btn" data-action="toggle-bookmark" title="Bookmark this page">★</button>
</div>`,
        css: `/* ///// omnibox code styles ///// */
.custom-omnibox-wrapper {
  display: flex;
  align-items: center;
  background: rgba(11, 15, 25, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 4px 12px;
  gap: 8px;
  width: 100%;
}
.custom-omnibox-wrapper:focus-within {
  border-color: #00e5ff;
}
.omnibox-lock-icon {
  font-size: 13px;
  opacity: 0.7;
}
.omnibox-input-field {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #e2e8f0;
  font-size: 13px;
  font-family: inherit;
}
.omnibox-engine-badge {
  font-size: 10px;
  font-weight: 700;
  color: #00e5ff;
  background: rgba(0, 229, 255, 0.1);
  padding: 2px 6px;
  border-radius: 10px;
}
.omnibox-star-btn {
  background: transparent;
  border: none;
  color: #fbbf24;
  cursor: pointer;
  font-size: 14px;
}`
    },

    element_nav_buttons: {
        id: 'element_nav_buttons',
        title: 'Navigation Control Buttons',
        category: 'Toolbar',
        description: 'Back, Forward, Reload, and Home browser action triggers.',
        html: `<!-- ///// nav buttons code ///// -->
<div class="custom-nav-cluster">
  <button class="nav-btn" data-action="back" title="Go back (Alt+Left)">‹</button>
  <button class="nav-btn" data-action="forward" title="Go forward (Alt+Right)">›</button>
  <button class="nav-btn" data-action="reload" title="Reload page (Ctrl+R)">↻</button>
  <button class="nav-btn" data-action="home" title="Go to Home">🏠</button>
</div>`,
        css: `/* ///// nav buttons code styles ///// */
.custom-nav-cluster {
  display: flex;
  align-items: center;
  gap: 4px;
}
.nav-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: #f1f5f9;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.nav-btn:hover {
  background: rgba(0, 229, 255, 0.15);
  border-color: rgba(0, 229, 255, 0.4);
  color: #00e5ff;
}`
    },

    element_tab_pill: {
        id: 'element_tab_pill',
        title: 'Tab Strip Tab Pill',
        category: 'Tab Strip',
        description: 'Individual active or background tab chip in the top strip.',
        html: `<!-- ///// tab code ///// -->
<div class="custom-tab-chip">
  <span class="tab-chip-icon">🌐</span>
  <span class="tab-chip-title">Web Page Title</span>
  <button class="tab-chip-close" data-action="close-tab" title="Close Tab">×</button>
</div>`,
        css: `/* ///// tab code styles ///// */
.custom-tab-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}
.custom-tab-chip.active {
  background: rgba(0, 229, 255, 0.12);
  border-color: rgba(0, 229, 255, 0.35);
  color: #f8fafc;
}
.tab-chip-title {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tab-chip-close {
  background: transparent;
  border: none;
  color: inherit;
  font-size: 14px;
  cursor: pointer;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tab-chip-close:hover {
  background: rgba(239, 68, 68, 0.25);
  color: #ef4444;
}`
    },

    element_bookmark_pill: {
        id: 'element_bookmark_pill',
        title: 'Bookmarks Bar Bookmark Pill',
        category: 'Bookmarks',
        description: 'Draggable quick-link bookmark button in the bookmarks strip.',
        html: `<!-- ///// bookmark code ///// -->
<div class="custom-bookmark-capsule">
  <span class="bookmark-icon">🔖</span>
  <span class="bookmark-label">Bookmark Name</span>
</div>`,
        css: `/* ///// bookmark code styles ///// */
.custom-bookmark-capsule {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}
.custom-bookmark-capsule:hover {
  background: rgba(0, 229, 255, 0.12);
  border-color: rgba(0, 229, 255, 0.35);
  color: #00e5ff;
}`
    },

    element_ai_prompt_bar: {
        id: 'element_ai_prompt_bar',
        title: 'New Tab AI Prompt Bar',
        category: 'New Tab Page',
        description: 'Autonomous AI browser command input hero on the home page.',
        html: `<!-- ///// ai prompt code ///// -->
<div class="custom-ai-prompt-container">
  <span class="ai-sparkle">✦</span>
  <input 
    type="text" 
    class="ai-input" 
    placeholder="Ask Nexora Copilot or automate a task..." 
    data-action="ai-execute" 
  />
  <button class="ai-run-btn" data-action="submit">Ask AI</button>
</div>`,
        css: `/* ///// ai prompt code styles ///// */
.custom-ai-prompt-container {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 640px;
  background: linear-gradient(135deg, rgba(20, 15, 38, 0.8), rgba(11, 24, 45, 0.8));
  border: 1.5px solid rgba(168, 85, 247, 0.35);
  border-radius: 20px;
  padding: 8px 16px;
  backdrop-filter: blur(20px);
  gap: 10px;
  box-shadow: 0 8px 24px rgba(168, 85, 247, 0.15);
}
.custom-ai-prompt-container:focus-within {
  border-color: #00e5ff;
  box-shadow: 0 8px 30px rgba(0, 229, 255, 0.25);
}
.ai-sparkle {
  color: #a855f7;
  font-size: 16px;
}
.ai-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #f1f5f9;
  font-size: 14px;
}
.ai-run-btn {
  background: linear-gradient(135deg, #a855f7, #00e5ff);
  color: #070b14;
  font-weight: 700;
  font-size: 11px;
  border: none;
  border-radius: 12px;
  padding: 6px 12px;
  cursor: pointer;
}`
    },

    element_speed_dial: {
        id: 'element_speed_dial',
        title: 'New Tab Speed Dial Tile',
        category: 'New Tab Page',
        description: 'Quick-access website shortcut tile on the home screen.',
        html: `<!-- ///// shortcuts code ///// -->
<div class="custom-speed-dial-card">
  <div class="dial-icon-container">🌐</div>
  <div class="dial-title">Site Name</div>
</div>`,
        css: `/* ///// shortcuts code styles ///// */
.custom-speed-dial-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 90px;
  height: 90px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  gap: 6px;
}
.custom-speed-dial-card:hover {
  transform: translateY(-4px);
  background: rgba(0, 229, 255, 0.1);
  border-color: #00e5ff;
}
.dial-icon-container {
  font-size: 24px;
}
.dial-title {
  font-size: 11px;
  color: #cbd5e1;
  font-weight: 500;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}`
    },

    element_engine_toggle: {
        id: 'element_engine_toggle',
        title: 'Search Engine Switcher (Google / Brave)',
        category: 'Toolbar',
        description: 'Toggle button cluster to switch default search engine between Google and Brave.',
        html: `<!-- ///// engine toggle code ///// -->
<div class="custom-engine-toggle-group">
  <button class="custom-engine-pill active" data-action="set-google">🔍 Google</button>
  <button class="custom-engine-pill" data-action="set-brave">🦁 Brave</button>
</div>`,
        css: `/* ///// engine toggle code styles ///// */
.custom-engine-toggle-group {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 2px;
  gap: 2px;
}
.custom-engine-pill {
  background: transparent;
  border: none;
  border-radius: 14px;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.custom-engine-pill.active {
  background: rgba(0, 229, 255, 0.2);
  color: #00e5ff;
}
.custom-engine-pill:hover {
  color: #f1f5f9;
}`
    },

    element_go_btn: {
        id: 'element_go_btn',
        title: 'Toolbar Go Action Button',
        category: 'Toolbar',
        description: 'Navigate and execute URL bar query action trigger button.',
        html: `<!-- ///// go button code ///// -->
<button class="custom-go-btn" data-action="submit">Go ➔</button>`,
        css: `/* ///// go button code styles ///// */
.custom-go-btn {
  background: linear-gradient(135deg, #00e5ff, #0284c7);
  color: #040d1a;
  border: none;
  border-radius: 8px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.custom-go-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 12px rgba(0, 229, 255, 0.4);
}`
    },

    element_toolbar_tools: {
        id: 'element_toolbar_tools',
        title: 'Toolbar Tools & Actions Cluster',
        category: 'Toolbar',
        description: 'Action buttons for Wallpaper, Typography, Downloads, and History.',
        html: `<!-- ///// toolbar tools code ///// -->
<div class="custom-tools-cluster">
  <button class="custom-tool-btn" data-action="open-wallpaper" title="Wallpaper Studio">🎨 Wallpaper</button>
  <button class="custom-tool-btn" data-action="open-typography" title="Typography Studio">🔤 Typography</button>
  <button class="custom-tool-btn" data-action="open-downloads" title="Downloads">📥 Downloads</button>
  <button class="custom-tool-btn" data-action="open-history" title="History">🕒 History</button>
</div>`,
        css: `/* ///// toolbar tools code styles ///// */
.custom-tools-cluster {
  display: flex;
  align-items: center;
  gap: 4px;
}
.custom-tool-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: #cbd5e1;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.custom-tool-btn:hover {
  background: rgba(0, 229, 255, 0.15);
  border-color: rgba(0, 229, 255, 0.4);
  color: #00e5ff;
}`
    }
};

/**
 * Returns the permanently preserved prebuilt factory template for an element
 */
function getPrebuiltTemplate(elementId) {
    return DEFAULT_ELEMENT_TEMPLATES[elementId] || null;
}

/**
 * Lists all registered customizable elements
 */
function listRegisteredElements() {
    return Object.values(DEFAULT_ELEMENT_TEMPLATES).map(item => ({
        id: item.id,
        title: item.title,
        category: item.category,
        description: item.description
    }));
}

/**
 * Scopes CSS rules to target exclusively `#custom-element-${elementId}`
 */
function scopeCssRules(elementId, rawCss) {
    if (!rawCss || typeof rawCss !== 'string') return '';
    const scopeId = `#custom-element-${elementId}`;
    
    // Clean and split CSS rules by closing brace
    return rawCss
        .split('}')
        .map(block => {
            const trimmed = block.trim();
            if (!trimmed) return '';
            const parts = trimmed.split('{');
            if (parts.length !== 2) return trimmed + '}';
            
            const selectors = parts[0]
                .split(',')
                .map(sel => {
                    const s = sel.trim();
                    if (!s) return '';
                    if (s.startsWith('@')) return s; // Leave at-rules (e.g., @keyframes) intact
                    return `${scopeId} ${s}, ${scopeId}${s}`;
                })
                .filter(Boolean)
                .join(', ');
                
            return `${selectors} { ${parts[1]} }`;
        })
        .filter(Boolean)
        .join('\n');
}

/**
 * Compiles and validates custom HTML and CSS for a specific element
 */
function compileElementCode(elementId, htmlString, cssString) {
    try {
        if (typeof htmlString !== 'string') {
            return { success: false, error: 'HTML markup must be a valid string.' };
        }
        
        // Basic markup structural check
        const hasUnbalancedTags = (htmlString.match(/<[a-z0-9-]+/gi) || []).length !== 
                                  (htmlString.match(/<\/[a-z0-9-]+>/gi) || []).length +
                                  (htmlString.match(/<(img|input|br|hr|meta|link)[^>]*>/gi) || []).length;
        
        // Scope CSS
        const scopedCss = scopeCssRules(elementId, cssString || '');

        return {
            success: true,
            elementId,
            html: htmlString.trim(),
            css: cssString || '',
            scopedCss,
            hasUnbalancedTags
        };
    } catch (err) {
        return {
            success: false,
            error: err.message || 'Compilation failed due to unknown syntax error.'
        };
    }
}

/**
 * Retrieves the active element representation (custom override if saved, else factory default)
 */
function getCustomElement(elementId) {
    const factory = getPrebuiltTemplate(elementId);
    if (!factory) return null;

    try {
        const stored = localStorage.getItem(`${STORAGE_PREFIX}${elementId}`);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed.html === 'string') {
                return {
                    id: elementId,
                    title: factory.title,
                    category: factory.category,
                    isCustom: true,
                    html: parsed.html,
                    css: parsed.css || '',
                    scopedCss: scopeCssRules(elementId, parsed.css || '')
                };
            }
        }
    } catch (e) {
        console.warn(`[ElementCustomizer] Failed reading stored element ${elementId}:`, e);
    }

    return {
        id: elementId,
        title: factory.title,
        category: factory.category,
        isCustom: false,
        html: factory.html,
        css: factory.css,
        scopedCss: scopeCssRules(elementId, factory.css)
    };
}

/**
 * Saves a compiled user customization for a specific element into localStorage
 */
function saveCustomElement(elementId, { html, css }) {
    const compiled = compileElementCode(elementId, html, css);
    if (!compiled.success) {
        return { success: false, error: compiled.error };
    }

    try {
        localStorage.setItem(`${STORAGE_PREFIX}${elementId}`, JSON.stringify({
            html: compiled.html,
            css: compiled.css,
            updatedAt: Date.now()
        }));

        // Dispatch window event so reactive components update immediately
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('antigravity-element-updated', {
                detail: { elementId, isCustom: true }
            }));
        }

        return { success: true, compiled };
    } catch (e) {
        return { success: false, error: e.message || 'Failed to save to localStorage' };
    }
}

/**
 * Reverts a single element back to its factory prebuilt design
 */
function revertElement(elementId) {
    try {
        localStorage.removeItem(`${STORAGE_PREFIX}${elementId}`);

        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('antigravity-element-updated', {
                detail: { elementId, isCustom: false }
            }));
        }

        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Resets all browser UI elements back to factory defaults
 */
function resetAllElements() {
    try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(STORAGE_PREFIX)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));

        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('antigravity-all-elements-reset'));
        }

        return { success: true, count: keysToRemove.length };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Exports a component package as a standalone HTML5 template package
 */
function exportComponentPackage(elementId) {
    const el = getCustomElement(elementId);
    if (!el) return '';

    return `<!DOCTYPE html>
<!-- Antigravity Browser Component Package -->
<!-- Element ID: ${el.id} -->
<!-- Title: ${el.title} -->
<component id="${el.id}">
  <style>
${el.css}
  </style>
  <template>
${el.html}
  </template>
</component>`;
}

/**
 * Parses an uploaded component file (.html / .component.html / .json)
 */
function parseUploadedComponentPackage(rawContent) {
    if (!rawContent || typeof rawContent !== 'string') {
        return { success: false, error: 'Empty or invalid file content' };
    }

    try {
        // 1. Try JSON package
        if (rawContent.trim().startsWith('{')) {
            const json = JSON.parse(rawContent);
            if (json.html) {
                return {
                    success: true,
                    elementId: json.elementId || null,
                    html: json.html,
                    css: json.css || ''
                };
            }
        }

        // 2. Try HTML template/style extraction
        const styleMatch = rawContent.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        const templateMatch = rawContent.match(/<template[^>]*>([\s\S]*?)<\/template>/i);
        const idMatch = rawContent.match(/id=["'](element_[a-z0-9_]+)["']/i);

        const css = styleMatch ? styleMatch[1].trim() : '';
        let html = templateMatch ? templateMatch[1].trim() : '';

        // If no template tag, strip out the style tag and use remaining markup as HTML
        if (!html) {
            html = rawContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').trim();
        }

        return {
            success: true,
            elementId: idMatch ? idMatch[1] : null,
            html,
            css
        };
    } catch (e) {
        return { success: false, error: 'Could not parse uploaded package: ' + e.message };
    }
}

module.exports = {
    DEFAULT_ELEMENT_TEMPLATES,
    getPrebuiltTemplate,
    listRegisteredElements,
    compileElementCode,
    getCustomElement,
    saveCustomElement,
    revertElement,
    resetAllElements,
    exportComponentPackage,
    parseUploadedComponentPackage,
    scopeCssRules
};
