











/**
 * Antigravity Browser - Tab Management Engine
 * TypeScript Interfaces & Core Data Architecture
 */

export type WorkspaceId = 'default' | 'work' | 'personal' | 'research';

export interface BrowserTab {
  id: string;
  workspaceId: WorkspaceId;
  title: string;
  url: string;
  favicon?: string;
  isActive: boolean;
  isPinned: boolean;
  isSuspended: boolean; // Memory-saving sleep state (Tier 1 DOM freeze / Tier 2 process discard)
  canGoBack: boolean;
  canGoForward: boolean;
  webContentId: number; // Links UI to iframe or native Blink process
  history: string[]; // Visited URLs buffer
  ramMb?: number;
  cpuPercent?: number;
  isAudioPlaying?: boolean;
  isMuted?: boolean;
}

export interface Workspace {
  id: WorkspaceId;
  name: string;
  icon: string;
  activeTabId: string | null;
}

export interface TabGroup {
  id: string;
  name: string;
  color: string;
  isCollapsed: boolean;
  tabIds: string[];
}

export interface TabContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  tabId: string | null;
}

export type TabAction =
  | { type: 'SPAWN_TAB'; payload?: { url?: string; title?: string; workspaceId?: WorkspaceId } }
  | { type: 'CLOSE_TAB'; payload: { id: string } }
  | { type: 'ACTIVATE_TAB'; payload: { id: string } }
  | { type: 'SWITCH_WORKSPACE'; payload: { workspaceId: WorkspaceId } }
  | { type: 'REORDER_TABS'; payload: { sourceId: string; targetId: string } }
  | { type: 'TOGGLE_PIN'; payload: { id: string } }
  | { type: 'TOGGLE_MUTE'; payload: { id: string } }
  | { type: 'TOGGLE_SUSPEND'; payload: { id: string } }
  | { type: 'DUPLICATE_TAB'; payload: { id: string } }
  | { type: 'CLOSE_OTHER_TABS'; payload: { id: string } }
  | { type: 'CLOSE_TABS_TO_RIGHT'; payload: { id: string } }
  | { type: 'NAVIGATE_TAB'; payload: { id: string; url: string } }
  | { type: 'RESTORE_CLOSED_TAB' };

export interface TabState {
  tabs: BrowserTab[];
  activeTabId: string;
  activeWorkspaceId: WorkspaceId;
  workspaces: Workspace[];
  tabGroups: TabGroup[];
  closedTabsStack: BrowserTab[];
}
