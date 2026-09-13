'use client';

import React, { useState, useEffect } from 'react';
import { Compass } from 'lucide-react';
import { useBrowserStore, Tab } from '../store/useBrowserStore';
import { BrowserTabs } from './BrowserTabs';
import { Omnibox, BookmarksBar } from './Omnibox';

interface BrowserShellProps {
  children?: React.ReactNode;
}

/**
 * Master Browser Shell — composes BrowserTabs (framer-motion),
 * Omnibox (with star bookmark), BookmarksBar, and content viewport.
 */
export function BrowserShell({ children }: BrowserShellProps) {
  const { tabs, activeTabId, navigateActiveTab } = useBrowserStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const currentTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
        <header className="w-full bg-slate-950 border-b border-slate-900/80 px-4 py-3">
          <div className="h-6 w-48 bg-slate-900 rounded animate-pulse mb-2" />
          <div className="h-8 w-full max-w-xl bg-slate-900/60 rounded-xl animate-pulse mx-auto" />
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      <header className="w-full shrink-0 z-30 bg-slate-950 select-none shadow-md border-b border-slate-900/80">
        {/* 1. Fluid framer-motion Tab Bar */}
        <BrowserTabs />

        {/* 2. Omnibox with Star Bookmark Toggle */}
        <Omnibox />

        {/* 3. Bookmarks Bar */}
        <BookmarksBar />
      </header>

      {/* 4. Viewport */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-slate-950">
        {children ? (
          children
        ) : (
          <DefaultTabViewport tab={currentTab} />
        )}
      </main>
    </div>
  );
}

function DefaultTabViewport({ tab }: { tab?: Tab }) {
  const isLaunchpad = !tab || tab.mode === 'launchpad' || tab.url.includes('launchpad');
  const { navigateActiveTab } = useBrowserStore();

  if (isLaunchpad) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 flex items-center justify-center mb-6 shadow-2xl shadow-cyan-500/10">
          <Compass className="w-8 h-8 text-cyan-400 animate-pulse" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight mb-2">
          Nowcast Radar Launchpad
        </h1>
        <p className="text-sm text-slate-400 max-w-md mb-8">
          Type any Indian meteorological station, district or coordinates in the Omnibox above to launch instant hyper-local nowcasting.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl w-full">
          {[
            { name: 'Mumbai Central', code: 'HQ Radar 120min', url: 'nowcast://dashboard/mumbai-central' },
            { name: 'Colaba AWS', code: 'Coastal Flooding Risk', url: 'nowcast://dashboard/colaba' },
            { name: 'Santacruz Doppler', code: 'High-Elevation AWS', url: 'nowcast://dashboard/santacruz' },
          ].map((item) => (
            <button
              key={item.url}
              onClick={() => navigateActiveTab(item.url)}
              className="p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-cyan-500/50 text-left transition-all group cursor-pointer"
            >
              <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 mb-1">
                {item.name}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {item.code}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6">
      <div className="flex items-center justify-between border-b border-slate-900 pb-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">{tab!.title}</h2>
          <p className="text-xs text-cyan-400 font-mono">{tab!.url}</p>
        </div>
        <span className="px-2.5 py-1 text-xs rounded-full bg-cyan-950/60 text-cyan-400 border border-cyan-800/50 font-mono">
          LIVE RADAR ACTIVE
        </span>
      </div>
      <div className="flex-1 rounded-xl bg-slate-900/40 border border-slate-800/60 p-6 flex items-center justify-center text-slate-400 text-sm">
        Telemetry stream active for {tab!.title}. Drag tabs to test fluid sliding displacement.
      </div>
    </div>
  );
}

export default BrowserShell;
