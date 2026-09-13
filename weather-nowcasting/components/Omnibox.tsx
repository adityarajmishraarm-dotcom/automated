'use client';

import React from 'react';
import {
  Star,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Lock,
  ShieldCheck,
  Bookmark as BookmarkIcon,
  Globe,
  X,
} from 'lucide-react';
import { useBrowserStore } from '../store/useBrowserStore';

/**
 * Omnibox with inline Bookmark Star toggle.
 * Star is solid yellow when the current tab's URL is in bookmarks.
 */
export function Omnibox() {
  const {
    tabs,
    activeTabId,
    omniboxValue,
    setOmniboxValue,
    navigateActiveTab,
    toggleBookmark,
    isBookmarked,
  } = useBrowserStore();

  const currentTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const starred = currentTab ? isBookmarked(currentTab.url) : false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateActiveTab(omniboxValue);
  };

  return (
    <div className="w-full bg-slate-950 px-4 py-2 flex items-center gap-3 border-b border-slate-900/60">
      {/* Nav controls */}
      <div className="flex items-center gap-1 text-slate-400">
        <button
          type="button"
          className="p-1.5 rounded-md hover:bg-slate-900 hover:text-slate-200 transition-colors disabled:opacity-30"
          aria-label="Back"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          className="p-1.5 rounded-md hover:bg-slate-900 hover:text-slate-200 transition-colors disabled:opacity-30"
          aria-label="Forward"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => currentTab && navigateActiveTab(currentTab.url)}
          className="p-1.5 rounded-md hover:bg-slate-900 hover:text-slate-200 transition-colors"
          aria-label="Reload tab"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Omnibox Input */}
      <form onSubmit={handleSubmit} className="flex-1 max-w-3xl relative flex items-center mx-auto">
        <div className="absolute left-3 flex items-center gap-1.5 text-slate-500 pointer-events-none">
          <Lock className="w-3 h-3 text-emerald-400/80" />
        </div>

        <input
          type="text"
          value={omniboxValue}
          onChange={(e) => setOmniboxValue(e.target.value)}
          placeholder="Search location or type nowcast://..."
          className="w-full h-8.5 pl-8 pr-10 bg-slate-900/90 hover:bg-slate-900 text-slate-200 placeholder-slate-500 text-xs rounded-full border border-slate-800 focus:border-cyan-500/70 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 transition-all font-mono"
        />

        {/* Bookmark Star — filled yellow if bookmarked */}
        <button
          type="button"
          onClick={() => toggleBookmark()}
          className="absolute right-2.5 p-1 rounded-full text-slate-400 hover:text-amber-300 transition-transform active:scale-95"
          title={starred ? 'Remove from bookmarks' : 'Bookmark this location'}
          aria-label={starred ? 'Remove from bookmarks' : 'Bookmark this location'}
        >
          <Star
            className={`w-4 h-4 transition-all duration-200 ${
              starred
                ? 'fill-yellow-400 text-yellow-400 stroke-yellow-500 filter drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]'
                : 'fill-transparent text-slate-400 hover:text-yellow-400 stroke-current'
            }`}
          />
        </button>
      </form>

      {/* Status badge */}
      <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/40">
        <ShieldCheck className="w-3 h-3" />
        <span>ENCRYPTED VANE</span>
      </div>
    </div>
  );
}

/**
 * Horizontal bookmarks bar directly below the Omnibox.
 */
export function BookmarksBar() {
  const { bookmarks, activeTabId, updateTabUrl, removeBookmark } = useBrowserStore();

  if (!bookmarks || bookmarks.length === 0) {
    return (
      <div className="w-full bg-slate-950/80 px-4 py-1.5 border-b border-slate-900/60 flex items-center gap-2 text-[11px] text-slate-500">
        <BookmarkIcon className="w-3 h-3 text-slate-600" />
        <span>No bookmarks yet. Click the star in the Omnibox to save quick access links.</span>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-950 px-3 py-1.5 border-b border-slate-900/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
      <div className="flex items-center gap-1 text-[11px] text-slate-500 mr-2 shrink-0 select-none">
        <BookmarkIcon className="w-3 h-3 text-cyan-500/70" />
        <span className="font-semibold text-slate-400">BOOKMARKS</span>
      </div>

      <div className="flex items-center gap-1">
        {bookmarks.map((bm) => (
          <div
            key={bm.id}
            className="group relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-slate-300 hover:text-cyan-300 hover:bg-slate-900/90 border border-transparent hover:border-slate-800 transition-all cursor-pointer shrink-0"
            onClick={() => updateTabUrl(activeTabId, bm.url, bm.title)}
            title={`Navigate to ${bm.url}`}
          >
            <Globe className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            <span className="truncate max-w-[140px] font-medium text-[11.5px]">
              {bm.title}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeBookmark(bm.id);
              }}
              className="opacity-0 group-hover:opacity-100 hover:bg-slate-800 p-0.5 rounded text-slate-500 hover:text-rose-400 transition-all ml-0.5"
              aria-label="Remove bookmark"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Omnibox;
