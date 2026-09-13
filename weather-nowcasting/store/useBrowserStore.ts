import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Tab {
  id: string;
  title: string;
  url: string;
  mode?: 'launchpad' | 'dashboard' | 'web';
  coordinates?: [number, number];
  icon?: string;
  isLoading?: boolean;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
}

export interface Shortcut {
  id: string;
  title: string;
  url: string;
  icon?: string;
}

export interface BrowserStoreState {
  // Tabs state
  tabs: Tab[];
  activeTabId: string;

  // Bookmarks state
  bookmarks: Bookmark[];

  // Shortcuts state
  shortcuts: Shortcut[];

  // Omnibox state
  omniboxValue: string;

  // Tab Actions
  setActiveTabId: (id: string) => void;
  addTab: (partialTab?: Partial<Tab>) => string;
  closeTab: (id: string) => void;
  setTabs: (tabs: Tab[]) => void;
  reorderTabs: (activeId: string, overId: string) => void;
  updateTabUrl: (id: string, url: string, title?: string) => void;

  // Omnibox Actions
  setOmniboxValue: (value: string) => void;
  navigateActiveTab: (url: string) => void;

  // Bookmark Actions
  addBookmark: (bookmark: { id?: string; url: string; title: string }) => void;
  removeBookmark: (idOrUrl: string) => void;
  toggleBookmark: (url?: string, title?: string) => void;
  isBookmarked: (url: string) => boolean;

  // Shortcut Actions
  addShortcut: (shortcut: { title: string; url: string; icon?: string }) => void;
  removeShortcut: (id: string) => void;
}

export const INITIAL_TABS: Tab[] = [
  {
    id: 'tab-0',
    title: 'Google',
    url: 'https://www.google.com',
    mode: 'web',
  },
  {
    id: 'tab-1',
    title: 'Mumbai Central Radar',
    url: 'nowcast://dashboard/mumbai-central',
    mode: 'dashboard',
    coordinates: [18.9696, 72.8193],
  },
  {
    id: 'tab-2',
    title: 'Colaba Observatory',
    url: 'nowcast://dashboard/colaba',
    mode: 'dashboard',
    coordinates: [18.9067, 72.8147],
  },
  {
    id: 'tab-3',
    title: 'Santacruz Doppler AWS',
    url: 'nowcast://dashboard/santacruz',
    mode: 'dashboard',
    coordinates: [19.0896, 72.8656],
  },
];

export const INITIAL_BOOKMARKS: Bookmark[] = [
  {
    id: 'bm-1',
    title: 'Mumbai HQ Radar',
    url: 'nowcast://dashboard/mumbai-central',
  },
  {
    id: 'bm-2',
    title: 'Colaba High-Risk AWS',
    url: 'nowcast://dashboard/colaba',
  },
  {
    id: 'bm-3',
    title: 'Santacruz Doppler',
    url: 'nowcast://dashboard/santacruz',
  },
  {
    id: 'bm-4',
    title: 'Thane Flood Sector',
    url: 'nowcast://dashboard/thane',
  },
];

export const INITIAL_SHORTCUTS: Shortcut[] = [
  { id: 'sc-1', title: 'IMD Mumbai', url: 'https://mausam.imd.gov.in', icon: 'Radio' },
  { id: 'sc-2', title: 'NDRF Portal', url: 'https://ndrf.gov.in', icon: 'Shield' },
  { id: 'sc-3', title: 'Flood Alert', url: 'https://floodcontrol.delhi.gov.in', icon: 'AlertTriangle' },
  { id: 'sc-4', title: 'Tide Data', url: 'https://incois.gov.in', icon: 'Waves' },
  { id: 'sc-5', title: 'Satellite', url: 'https://mosdac.gov.in', icon: 'Eye' },
];

type SetState = (
  partial:
    | BrowserStoreState
    | Partial<BrowserStoreState>
    | ((state: BrowserStoreState) => BrowserStoreState | Partial<BrowserStoreState>),
  replace?: boolean
) => void;

type GetState = () => BrowserStoreState;

export const useBrowserStore = create<BrowserStoreState>()(
  persist(
    (set: SetState, get: GetState): BrowserStoreState => ({
      tabs: INITIAL_TABS,
      activeTabId: INITIAL_TABS[0].id,
      bookmarks: INITIAL_BOOKMARKS,
      shortcuts: INITIAL_SHORTCUTS,
      omniboxValue: INITIAL_TABS[0].url,

      setActiveTabId: (id: string) => {
        const targetTab = get().tabs.find((t: Tab) => t.id === id);
        if (targetTab) {
          set({
            activeTabId: id,
            omniboxValue: targetTab.url,
          });
        }
      },

      addTab: (partialTab?: Partial<Tab>) => {
        const newId = `tab-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
        const newTab: Tab = {
          id: newId,
          title: partialTab?.title || 'Google',
          url: partialTab?.url || 'https://www.google.com',
          mode: partialTab?.mode || 'web',
          coordinates: partialTab?.coordinates,
          ...partialTab,
        };

        set((state: BrowserStoreState) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: newId,
          omniboxValue: newTab.url,
        }));

        return newId;
      },

      closeTab: (id: string) => {
        set((state: BrowserStoreState) => {
          if (state.tabs.length <= 1) {
            // Keep at least one tab open; reset to a fresh Launchpad tab
            const freshTab: Tab = {
              id: `tab-${Date.now().toString(36)}`,
              title: 'Google',
              url: 'https://www.google.com',
              mode: 'web',
            };
            return {
              tabs: [freshTab],
              activeTabId: freshTab.id,
              omniboxValue: freshTab.url,
            };
          }

          const targetIndex = state.tabs.findIndex((t: Tab) => t.id === id);
          const newTabs = state.tabs.filter((t: Tab) => t.id !== id);

          let newActiveId = state.activeTabId;
          if (state.activeTabId === id) {
            const nextIndex = Math.min(targetIndex, newTabs.length - 1);
            newActiveId = newTabs[nextIndex].id;
          }

          const nextActiveTab = newTabs.find((t: Tab) => t.id === newActiveId);

          return {
            tabs: newTabs,
            activeTabId: newActiveId,
            omniboxValue: nextActiveTab ? nextActiveTab.url : 'nowcast://launchpad',
          };
        });
      },

      // ponytail: setTabs is the direct setter for framer-motion Reorder.Group's onReorder callback
      setTabs: (tabs: Tab[]) => set({ tabs }),

      reorderTabs: (activeId: string, overId: string) => {
        set((state: BrowserStoreState) => {
          const oldIndex = state.tabs.findIndex((t: Tab) => t.id === activeId);
          const newIndex = state.tabs.findIndex((t: Tab) => t.id === overId);

          if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
            return state;
          }

          const newTabs = [...state.tabs];
          const [moved] = newTabs.splice(oldIndex, 1);
          newTabs.splice(newIndex, 0, moved);
          return { tabs: newTabs };
        });
      },

      updateTabUrl: (id: string, url: string, title?: string) => {
        set((state: BrowserStoreState) => {
          const isLaunchpad = url.includes('launchpad') || url === 'about:blank';
          const isWeb = url.startsWith('http://') || url.startsWith('https://');
          const newTabs = state.tabs.map((tab: Tab) => {
            if (tab.id !== id) return tab;
            return {
              ...tab,
              url,
              title:
                title ||
                (isLaunchpad
                  ? 'Google'
                  : url
                    .replace(/^nowcast:\/\/dashboard\//, '')
                    .replace(/^https?:\/\//, '') || tab.title),
              mode: isLaunchpad ? ('launchpad' as const) : isWeb ? ('web' as const) : ('dashboard' as const),
            };
          });

          return {
            tabs: newTabs,
            omniboxValue: state.activeTabId === id ? url : state.omniboxValue,
          };
        });
      },

      setOmniboxValue: (value: string) => {
        set({ omniboxValue: value });
      },

      navigateActiveTab: (rawUrl: string) => {
        const state = get();
        const activeId = state.activeTabId;
        if (!activeId) return;

        let normalizedUrl = rawUrl.trim();
        if (!normalizedUrl) {
          normalizedUrl = 'https://www.google.com';
        } else if (
          !normalizedUrl.startsWith('nowcast://') &&
          !normalizedUrl.startsWith('http://') &&
          !normalizedUrl.startsWith('https://') &&
          !normalizedUrl.startsWith('about:')
        ) {
          // Google as default search engine
          normalizedUrl = `https://www.google.com/search?q=${encodeURIComponent(normalizedUrl)}`;
        }

        const isLaunchpad = normalizedUrl.includes('launchpad') || normalizedUrl === 'about:blank';
        const displayTitle = isLaunchpad
          ? 'New Tab'
          : decodeURIComponent(
            normalizedUrl
              .replace(/^nowcast:\/\/dashboard\//, '')
              .replace(/^https?:\/\//, '')
          )
            .split(/[-_ ]/)
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ') || 'Weather Dashboard';

        state.updateTabUrl(activeId, normalizedUrl, displayTitle);
      },

      addBookmark: (bookmark: { id?: string; url: string; title: string }) => {
        set((state: BrowserStoreState) => {
          const cleanUrl = bookmark.url.trim();
          if (!cleanUrl) return state;

          const alreadyExists = state.bookmarks.some(
            (b: Bookmark) => b.url.toLowerCase() === cleanUrl.toLowerCase()
          );

          if (alreadyExists) return state;

          const newBookmark: Bookmark = {
            id:
              bookmark.id ||
              `bm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            url: cleanUrl,
            title: bookmark.title?.trim() || cleanUrl,
          };

          return { bookmarks: [...state.bookmarks, newBookmark] };
        });
      },

      removeBookmark: (idOrUrl: string) => {
        set((state: BrowserStoreState) => ({
          bookmarks: state.bookmarks.filter(
            (b: Bookmark) =>
              b.id !== idOrUrl &&
              b.url.toLowerCase() !== idOrUrl.toLowerCase()
          ),
        }));
      },

      toggleBookmark: (urlParam?: string, titleParam?: string) => {
        const state = get();
        const currentTab = state.tabs.find((t: Tab) => t.id === state.activeTabId);
        const targetUrl = (urlParam || currentTab?.url || 'nowcast://launchpad').trim();
        const targetTitle = (titleParam || currentTab?.title || 'Saved Location').trim();

        const existing = state.bookmarks.find(
          (b: Bookmark) => b.url.toLowerCase() === targetUrl.toLowerCase()
        );

        if (existing) {
          state.removeBookmark(existing.id);
        } else {
          state.addBookmark({ url: targetUrl, title: targetTitle });
        }
      },

      isBookmarked: (url: string) => {
        if (!url) return false;
        const cleanUrl = url.trim().toLowerCase();
        return get().bookmarks.some((b: Bookmark) => b.url.toLowerCase() === cleanUrl);
      },

      addShortcut: (shortcut: { title: string; url: string; icon?: string }) => {
        set((state: BrowserStoreState) => {
          let cleanUrl = shortcut.url.trim();
          if (!cleanUrl) return state;
          if (!/^https?:\/\//i.test(cleanUrl) && !cleanUrl.startsWith('nowcast://')) {
            cleanUrl = `https://${cleanUrl}`;
          }

          const newShortcut: Shortcut = {
            id: `sc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title: shortcut.title.trim() || cleanUrl,
            url: cleanUrl,
            icon: shortcut.icon || 'Globe',
          };

          return { shortcuts: [...(state.shortcuts || []), newShortcut] };
        });
      },

      removeShortcut: (id: string) => {
        set((state: BrowserStoreState) => ({
          shortcuts: (state.shortcuts || []).filter((sc: Shortcut) => sc.id !== id),
        }));
      },
    }),
    {
      name: 'browser-tabs-store-v2',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? localStorage
          : {
            getItem: () => null,
            setItem: () => { },
            removeItem: () => { },
          }
      ),
    }
  )
);
