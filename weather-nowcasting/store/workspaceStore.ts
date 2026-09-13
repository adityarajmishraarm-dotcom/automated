import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect, useState } from 'react';
import { 
  WorkspaceTab, 
  Bookmark, 
  SearchHistoryItem, 
  LaunchpadShortcut, 
  WeatherData, 
  ThreatPolygon, 
  GroundReport, 
  ChatMessage, 
  GeoCoordinate,
  TabMode 
} from '../types/workspace';
import { 
  INITIAL_WORKSPACE_TABS, 
  INITIAL_BOOKMARKS, 
  INITIAL_SEARCH_HISTORY, 
  INITIAL_SHORTCUTS, 
  MOCK_WEATHER_DATA, 
  MOCK_GROUND_REPORTS, 
  MOCK_CHAT_MESSAGES 
} from '../lib/mockData';

export interface WorkspaceStoreState {
  // 1. Draggable Multi-Tab State
  tabs: WorkspaceTab[];
  activeTabId: string;
  spawnTab: (mode?: TabMode, locationName?: string, coords?: GeoCoordinate) => string;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  reorderTabs: (activeId: string, overId: string) => void;
  activateTabWithLocation: (tabId: string, locationQuery: string, coords?: GeoCoordinate) => void;
  updateTabCoords: (tabId: string, coords: GeoCoordinate, locationName: string) => void;

  // 2. Bookmarks Bar State
  bookmarks: Bookmark[];
  toggleBookmark: (tabId: string) => void;
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
  removeBookmark: (id: string) => void;

  // 3. Omnibox with Search History
  searchQuery: string;
  history: SearchHistoryItem[];
  setSearchQuery: (query: string) => void;
  executeSearch: (query: string) => void;
  removeHistoryItem: (id: string) => void;
  clearHistory: () => void;

  // 4. Launchpad Shortcuts Grid
  shortcuts: LaunchpadShortcut[];
  addShortcut: (shortcut: Omit<LaunchpadShortcut, 'id'>) => void;
  removeShortcut: (id: string) => void;

  // 5. Zen AI Chat Copilot State
  isChatOpen: boolean;
  isThinking: boolean;
  chatMessages: ChatMessage[];
  setChatOpen: (open: boolean) => void;
  toggleChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;

  // 6. Ground Truth & Telemetry State
  weatherData: WeatherData;
  selectedPolygon: ThreatPolygon | null;
  setSelectedPolygon: (polygon: ThreatPolygon | null) => void;
  groundReports: GroundReport[];
  addGroundReport: (report: Omit<GroundReport, 'id' | 'timestamp' | 'upvotes'>) => void;
  upvoteReport: (id: string) => void;

  // 7. Hydration Safety Flags
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
}

type SetState = (
  partial: WorkspaceStoreState | Partial<WorkspaceStoreState> | ((state: WorkspaceStoreState) => WorkspaceStoreState | Partial<WorkspaceStoreState>),
  replace?: boolean
) => void;

type GetState = () => WorkspaceStoreState;

export const useWorkspaceStore = create<WorkspaceStoreState>()(
  persist(
    (set: SetState, get: GetState): WorkspaceStoreState => ({
      // Draggable Multi-Tab Initial State ('tab-0' is the Google-style launchpad)
      tabs: INITIAL_WORKSPACE_TABS,
      activeTabId: INITIAL_WORKSPACE_TABS[0].id,

      // Bookmarks Initial State
      bookmarks: INITIAL_BOOKMARKS,

      // Omnibox & History Initial State
      searchQuery: '',
      history: INITIAL_SEARCH_HISTORY,

      // Launchpad Shortcuts Initial State
      shortcuts: INITIAL_SHORTCUTS,

      // Chat Initial State
      isChatOpen: false,
      isThinking: false,
      chatMessages: MOCK_CHAT_MESSAGES,

      // Telemetry & Ground Truth Initial State
      weatherData: MOCK_WEATHER_DATA,
      selectedPolygon: MOCK_WEATHER_DATA.activeThreatZones[0] || null,
      groundReports: MOCK_GROUND_REPORTS,

      // Hydration Flag
      hasHydrated: false,
      setHasHydrated: (hydrated: boolean) => set({ hasHydrated: hydrated }),

      // -----------------------------------------------------------------------
      // 1. DRAGGABLE TAB CONTROLLERS
      // -----------------------------------------------------------------------
      reorderTabs: (activeId: string, overId: string) => {
        if (activeId === overId) return;

        set((state: WorkspaceStoreState) => {
          const oldIndex = state.tabs.findIndex((t) => t.id === activeId);
          const newIndex = state.tabs.findIndex((t) => t.id === overId);

          if (oldIndex === -1 || newIndex === -1) return state;

          const updatedTabs = [...state.tabs];
          const [movedItem] = updatedTabs.splice(oldIndex, 1);
          updatedTabs.splice(newIndex, 0, movedItem);

          return { tabs: updatedTabs };
        });
      },

      spawnTab: (mode: TabMode = 'launchpad', locationName = '', coords?: GeoCoordinate) => {
        const id = `tab-${Date.now().toString().slice(-6)}`;
        const isLaunch = mode === 'launchpad';
        const coordinates: GeoCoordinate = coords || [
          19.0760 + (Math.random() * 0.06 - 0.03),
          72.8777 + (Math.random() * 0.06 - 0.03)
        ];

        const newTab: WorkspaceTab = {
          id,
          title: isLaunch ? 'New Tab' : (locationName.split(',')[0].slice(0, 20) || 'Custom Sector'),
          mode,
          locationName: isLaunch ? '' : locationName,
          coordinates,
          zoomLevel: 14,
          isBookmarked: false,
          localMetrics: {
            currentPrecipMmHr: isLaunch ? 0 : +(Math.random() * 40 + 15).toFixed(1),
            peakExpectedMmHr: isLaunch ? 0 : +(Math.random() * 35 + 45).toFixed(1),
            groundSaturationPercent: isLaunch ? 0 : +(Math.random() * 20 + 75).toFixed(1),
            capeIndexJkg: isLaunch ? 0 : Math.floor(Math.random() * 1200 + 1800),
          },
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
        };

        set((state: WorkspaceStoreState) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: id,
          searchQuery: isLaunch ? '' : locationName,
        }));

        return id;
      },

      activateTabWithLocation: (tabId: string, locationQuery: string, coords?: GeoCoordinate) => {
        const query = locationQuery.trim();
        if (!query) return;

        // Parse coordinates if input is a numeric pair
        let finalCoords: GeoCoordinate = coords || [19.0688, 72.8797];
        const coordMatch = query.match(/^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/);
        if (coordMatch) {
          finalCoords = [parseFloat(coordMatch[1]), parseFloat(coordMatch[3])];
        }

        const cleanTitle = query.split(',')[0].slice(0, 24);

        set((state: WorkspaceStoreState) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId
              ? {
                  ...tab,
                  mode: 'dashboard',
                  title: cleanTitle,
                  locationName: query,
                  coordinates: finalCoords,
                  localMetrics: {
                    currentPrecipMmHr: +(Math.random() * 35 + 20).toFixed(1),
                    peakExpectedMmHr: +(Math.random() * 40 + 50).toFixed(1),
                    groundSaturationPercent: +(Math.random() * 15 + 80).toFixed(1),
                    capeIndexJkg: Math.floor(Math.random() * 1000 + 2000),
                  },
                  lastActiveAt: new Date().toISOString(),
                }
              : tab
          ),
          searchQuery: query,
        }));
      },

      closeTab: (tabId: string) => {
        set((state: WorkspaceStoreState) => {
          if (state.tabs.length <= 1) return state;

          const nextTabs = state.tabs.filter((t) => t.id !== tabId);
          let nextActiveId = state.activeTabId;

          if (state.activeTabId === tabId) {
            const closedIdx = state.tabs.findIndex((t) => t.id === tabId);
            const fallbackIdx = Math.max(0, closedIdx - 1);
            nextActiveId = nextTabs[fallbackIdx].id;
          }

          const activeTabObj = nextTabs.find((t) => t.id === nextActiveId);

          return {
            tabs: nextTabs,
            activeTabId: nextActiveId,
            searchQuery: activeTabObj && activeTabObj.mode === 'dashboard' ? activeTabObj.locationName : '',
          };
        });
      },

      switchTab: (tabId: string) => {
        set((state: WorkspaceStoreState) => {
          const targetTab = state.tabs.find((t) => t.id === tabId);
          if (!targetTab) return state;

          return {
            activeTabId: tabId,
            searchQuery: targetTab.mode === 'dashboard' ? targetTab.locationName : '',
            tabs: state.tabs.map((t) =>
              t.id === tabId ? { ...t, lastActiveAt: new Date().toISOString() } : t
            ),
          };
        });
      },

      updateTabCoords: (tabId: string, coords: GeoCoordinate, locationName: string) => {
        set((state: WorkspaceStoreState) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId
              ? {
                  ...t,
                  coordinates: coords,
                  locationName,
                  title: locationName.split(',')[0].slice(0, 20),
                  mode: 'dashboard',
                }
              : t
          ),
          searchQuery: locationName,
        }));
      },

      // -----------------------------------------------------------------------
      // 2. BOOKMARKS CONTROLLERS
      // -----------------------------------------------------------------------
      toggleBookmark: (tabId: string) => {
        set((state: WorkspaceStoreState) => {
          const tab = state.tabs.find((t) => t.id === tabId);
          if (!tab || tab.mode === 'launchpad' || !tab.locationName) return state;

          const existingBm = state.bookmarks.find(
            (b) => b.locationName.toLowerCase() === tab.locationName.toLowerCase()
          );

          if (existingBm) {
            return {
              bookmarks: state.bookmarks.filter((b) => b.id !== existingBm.id),
              tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, isBookmarked: false } : t)),
            };
          } else {
            const newBm: Bookmark = {
              id: `bm-${Date.now().toString().slice(-6)}`,
              title: tab.title,
              locationName: tab.locationName,
              coordinates: tab.coordinates,
              createdAt: new Date().toISOString(),
            };
            return {
              bookmarks: [...state.bookmarks, newBm],
              tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, isBookmarked: true } : t)),
            };
          }
        });
      },

      addBookmark: (bmData: Omit<Bookmark, 'id' | 'createdAt'>) => {
        const newBm: Bookmark = {
          ...bmData,
          id: `bm-${Date.now().toString().slice(-6)}`,
          createdAt: new Date().toISOString(),
        };
        set((state: WorkspaceStoreState) => ({
          bookmarks: [...state.bookmarks, newBm],
        }));
      },

      removeBookmark: (id: string) => {
        set((state: WorkspaceStoreState) => ({
          bookmarks: state.bookmarks.filter((b) => b.id !== id),
        }));
      },

      // -----------------------------------------------------------------------
      // 3. OMNIBOX & SEARCH HISTORY CONTROLLERS
      // -----------------------------------------------------------------------
      setSearchQuery: (query: string) => set({ searchQuery: query }),

      executeSearch: (rawQuery: string) => {
        const query = rawQuery.trim();
        if (!query) return;

        const historyItem: SearchHistoryItem = {
          id: `hist-${Date.now().toString().slice(-6)}`,
          query,
          timestamp: 'Just now',
        };

        const filteredHistory = get().history.filter(
          (h) => h.query.toLowerCase() !== query.toLowerCase()
        );

        set({
          history: [historyItem, ...filteredHistory].slice(0, 15),
        });

        const activeTab = get().tabs.find((t) => t.id === get().activeTabId);
        if (activeTab) {
          get().activateTabWithLocation(activeTab.id, query);
        } else {
          const newId = get().spawnTab('dashboard', query);
          get().activateTabWithLocation(newId, query);
        }
      },

      removeHistoryItem: (id: string) => {
        set((state: WorkspaceStoreState) => ({
          history: state.history.filter((h) => h.id !== id),
        }));
      },

      clearHistory: () => set({ history: [] }),

      // -----------------------------------------------------------------------
      // 4. LAUNCHPAD SHORTCUTS CONTROLLERS
      // -----------------------------------------------------------------------
      addShortcut: (shortcutData: Omit<LaunchpadShortcut, 'id'>) => {
        const newShortcut: LaunchpadShortcut = {
          ...shortcutData,
          id: `sc-${Date.now().toString().slice(-6)}`,
        };
        set((state: WorkspaceStoreState) => ({
          shortcuts: [...state.shortcuts, newShortcut],
        }));
      },

      removeShortcut: (id: string) => {
        set((state: WorkspaceStoreState) => ({
          shortcuts: state.shortcuts.filter((s) => s.id !== id),
        }));
      },

      // -----------------------------------------------------------------------
      // 5. ZEN AI CHAT CONTROLLERS
      // -----------------------------------------------------------------------
      setChatOpen: (open: boolean) => set({ isChatOpen: open }),
      toggleChat: () => set((state: WorkspaceStoreState) => ({ isChatOpen: !state.isChatOpen })),
      clearChat: () => set({ chatMessages: [] }),

      sendMessage: async (content: string) => {
        const trimmed = content.trim();
        if (!trimmed) return;

        const userMsg: ChatMessage = {
          id: `msg-${Date.now()}-user`,
          sender: 'user',
          content: trimmed,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        set((state: WorkspaceStoreState) => ({
          chatMessages: [...state.chatMessages, userMsg],
          isThinking: true,
        }));

        await new Promise<void>((resolve) => setTimeout(resolve, 750));

        const activeTab = get().tabs.find((t) => t.id === get().activeTabId);
        const lower = trimmed.toLowerCase();
        let reply = '';

        if (lower.includes('rain') || lower.includes('intensity') || lower.includes('peak')) {
          reply = `Active rain rate for ${activeTab?.title || 'monitored sector'} is ${activeTab?.localMetrics.currentPrecipMmHr || 48.2} mm/hr. Projected convective peak reaches ${activeTab?.localMetrics.peakExpectedMmHr || 88.4} mm/hr at minute 40 before tapering.`;
        } else if (lower.includes('flood') || lower.includes('water') || lower.includes('risk')) {
          reply = `Critical saturation detected (${activeTab?.localMetrics.groundSaturationPercent || 96.2}%). Infiltration capacity is zero. Overbank inundation imminent in low-lying corridors. Rapid drainage clearance advised.`;
        } else if (lower.includes('cape') || lower.includes('instability') || lower.includes('storm')) {
          reply = `CAPE index stands at ${activeTab?.localMetrics.capeIndexJkg || 2840} J/kg, indicating strong convective instability and lightning potential. Radar reflectivity exceeds 58 dBZ in the storm core.`;
        } else if (lower.includes('report') || lower.includes('ground') || lower.includes('incident')) {
          const count = get().groundReports.length;
          const critical = get().groundReports.filter((r) => r.severity === 'CRITICAL').length;
          reply = `${count} field reports logged across the basin (${critical} critical). Highest water depth is 55 cm at LBS Marg Kurla.`;
        } else {
          reply = `Monitoring ${activeTab?.locationName || 'active basin'}. Precipitation rate is ${activeTab?.localMetrics.currentPrecipMmHr || 48.2} mm/hr, moving WSW at 38 km/h. Spatial threat polygons active.`;
        }

        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now()}-assistant`,
          sender: 'assistant',
          content: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        set((state: WorkspaceStoreState) => ({
          chatMessages: [...state.chatMessages, assistantMsg],
          isThinking: false,
        }));
      },

      // -----------------------------------------------------------------------
      // 6. GROUND TRUTH & THREAT POLYGON CONTROLLERS
      // -----------------------------------------------------------------------
      setSelectedPolygon: (polygon: ThreatPolygon | null) => set({ selectedPolygon: polygon }),

      addGroundReport: (reportData: Omit<GroundReport, 'id' | 'timestamp' | 'upvotes'>) => {
        const newReport: GroundReport = {
          ...reportData,
          id: `rep-${Date.now().toString().slice(-6)}`,
          timestamp: 'Just now',
          upvotes: 1,
        };

        set((state: WorkspaceStoreState) => ({
          groundReports: [newReport, ...state.groundReports],
        }));
      },

      upvoteReport: (id: string) => {
        set((state: WorkspaceStoreState) => ({
          groundReports: state.groundReports.map((r) =>
            r.id === id ? { ...r, upvotes: r.upvotes + 1 } : r
          ),
        }));
      },
    }),
    {
      name: 'sih26077-browser-workspace',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      })),
      partialize: (state: WorkspaceStoreState) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        bookmarks: state.bookmarks,
        history: state.history,
        shortcuts: state.shortcuts,
        chatMessages: state.chatMessages,
        groundReports: state.groundReports,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

/**
 * Hydration-Safe Hook Helper
 */
export const useHydratedWorkspaceStore = <T>(selector: (state: WorkspaceStoreState) => T): T | undefined => {
  const result = useWorkspaceStore(selector);
  const [hydratedData, setHydratedData] = useState<T>();

  useEffect(() => {
    setHydratedData(result);
  }, [result]);

  return hydratedData;
};

export { ClientOnly } from '../components/common/ClientOnly';
