/**
 * Antigravity Browser - Modular Drag-and-Drop Layout Service
 * Manages spatial reordering of tabs, toolbar modules, docking positions, and layout persistence.
 * Minimalist native implementation with zero third-party dependencies.
 */

const STORAGE_KEY = 'antigravity_ui_layout_v1';

export const DEFAULT_UI_LAYOUT = {
    toolbarOrder: [
        'nav-controls',
        'engine-toggle',
        'omnibox',
        'go-btn',
        'tools-actions',
        'status-pill'
    ],
    sidebarDock: 'right', // 'right' | 'left' | 'bottom' | 'float'
    sidebarWidth: 380,
    sidebarHeight: 280,
    splitView: {
        active: false,
        leftTabId: null,
        rightTabId: null,
        ratio: 0.5
    },
    newTabWidgets: ['time-greeting', 'search-hero', 'speed-dials', 'ai-bar'],
    editMode: false
};

const VALID_DOCK_POSITIONS = new Set(['right', 'left', 'bottom', 'float']);

/**
 * Validates if a dock position string is supported
 */
export function isValidDockPosition(pos) {
    return VALID_DOCK_POSITIONS.has(pos);
}

/**
 * Pure, immutable array element reordering utility
 */
export function arrayMove(array, fromIndex, toIndex) {
    if (!Array.isArray(array)) return [];
    if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= array.length) {
        return [...array];
    }
    const targetIdx = Math.max(0, Math.min(toIndex, array.length - 1));
    const result = [...array];
    const [movedItem] = result.splice(fromIndex, 1);
    result.splice(targetIdx, 0, movedItem);
    return result;
}

/**
 * Loads persisted layout configuration with safe fallback
 */
export function loadLayoutConfig() {
    try {
        if (typeof localStorage === 'undefined') return { ...DEFAULT_UI_LAYOUT };
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                ...DEFAULT_UI_LAYOUT,
                ...parsed,
                toolbarOrder: Array.isArray(parsed.toolbarOrder) && parsed.toolbarOrder.length > 0 
                    ? parsed.toolbarOrder 
                    : DEFAULT_UI_LAYOUT.toolbarOrder,
                sidebarDock: isValidDockPosition(parsed.sidebarDock) 
                    ? parsed.sidebarDock 
                    : DEFAULT_UI_LAYOUT.sidebarDock
            };
        }
    } catch (e) {
        console.warn('[dndLayoutService] Failed reading layout, using defaults:', e);
    }
    return { ...DEFAULT_UI_LAYOUT };
}

/**
 * Persists layout configuration to localStorage
 */
export function saveLayoutConfig(config) {
    try {
        if (typeof localStorage === 'undefined') return false;
        const current = loadLayoutConfig();
        const merged = { ...current, ...config };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('antigravity-layout-changed', { detail: merged }));
        }
        return true;
    } catch (e) {
        console.error('[dndLayoutService] Failed saving layout config:', e);
        return false;
    }
}

/**
 * Resets layout to factory defaults
 */
export function resetLayoutConfig() {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(STORAGE_KEY);
        }
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('antigravity-layout-changed', { detail: DEFAULT_UI_LAYOUT }));
        }
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Reorders tabs array by drag source and drop target IDs
 */
export function reorderTabs(tabsList, sourceTabId, targetTabId) {
    if (!Array.isArray(tabsList)) return [];
    const fromIndex = tabsList.findIndex(t => t && t.id === sourceTabId);
    const toIndex = tabsList.findIndex(t => t && t.id === targetTabId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return [...tabsList];
    return arrayMove(tabsList, fromIndex, toIndex);
}

/**
 * Reorders toolbar modules array by module IDs
 */
export function reorderToolbar(currentOrder, sourceModuleId, targetModuleId) {
    const list = Array.isArray(currentOrder) ? currentOrder : DEFAULT_UI_LAYOUT.toolbarOrder;
    const fromIndex = list.indexOf(sourceModuleId);
    const toIndex = list.indexOf(targetModuleId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return [...list];
    return arrayMove(list, fromIndex, toIndex);
}

/**
 * HTML5 Drag & Drop Payload Helpers
 */
export const DND_TYPES = {
    TAB: 'application/x-antigravity-tab',
    TOOLBAR_ITEM: 'application/x-antigravity-toolbar',
    BOOKMARK: 'application/x-antigravity-bookmark'
};

export function setDragPayload(dataTransfer, type, payload) {
    if (!dataTransfer || !type) return;
    try {
        dataTransfer.setData(type, JSON.stringify(payload));
        dataTransfer.effectAllowed = 'move';
    } catch (e) {
        // Fallback for basic dataTransfer
        dataTransfer.setData('text/plain', String(payload?.id || payload));
    }
}

export function getDragPayload(dataTransfer, type) {
    if (!dataTransfer || !type) return null;
    try {
        const raw = dataTransfer.getData(type);
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
}
