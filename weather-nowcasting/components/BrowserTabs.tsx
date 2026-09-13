'use client';

import React from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { Plus, X, Globe, CloudRain } from 'lucide-react';
import { useBrowserStore, Tab } from '../store/useBrowserStore';

/**
 * Individual sortable tab using framer-motion Reorder.Item.
 * Reorder.Item handles the CSS transforms that make other tabs
 * slide horizontally out of the way during a drag — the Chrome effect.
 */
function ReorderTab({
  tab,
  isActive,
  onSelect,
  onClose,
  canClose,
}: {
  tab: Tab;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
  canClose: boolean;
}) {
  const dragControls = useDragControls();
  const isLaunchpad = tab.mode === 'launchpad' || tab.url.includes('launchpad');

  return (
    <Reorder.Item
      value={tab}
      id={tab.id}
      dragControls={dragControls}
      dragListener={true}
      whileDrag={{
        scale: 1.05,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        zIndex: 50,
      }}
      layout
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
      }}
      className={`group relative flex items-center gap-2 h-9 px-3.5 rounded-t-xl text-xs font-medium select-none cursor-grab active:cursor-grabbing transition-colors duration-150 ${
        isActive
          ? 'bg-slate-900 text-slate-100 shadow-sm border-t border-x border-slate-800/80'
          : 'bg-transparent text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
      }`}
      style={{ minWidth: 150, maxWidth: 220 }}
      onClick={onSelect}
    >
      {/* Tab Icon */}
      {isLaunchpad ? (
        <Globe className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-300 shrink-0" />
      ) : (
        <CloudRain className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
      )}

      {/* Tab Title */}
      <span className="truncate flex-1 text-left font-sans text-[12px] tracking-tight">
        {tab.title || (isLaunchpad ? 'New Tab' : 'Weather Dashboard')}
      </span>

      {/* Close Button — onPointerDown stops drag from starting on click */}
      {canClose && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 hover:bg-slate-800 p-0.5 rounded-md text-slate-400 hover:text-slate-200 transition-all shrink-0 ml-1"
          aria-label="Close tab"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* Active indicator accent line */}
      {isActive && (
        <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" />
      )}
    </Reorder.Item>
  );
}

/**
 * BrowserTabs: Fluid drag-and-drop tab bar using framer-motion Reorder API.
 *
 * Reorder.Group's onReorder fires with the already-reordered array when
 * a user drags a tab past another — framer-motion handles all the intermediate
 * CSS transform animations that make the non-dragged tabs slide out of the way.
 */
export function BrowserTabs() {
  const { tabs, activeTabId, setActiveTabId, addTab, closeTab, setTabs } =
    useBrowserStore();

  return (
    <div className="w-full bg-slate-950 px-3 pt-2 flex items-center gap-1 overflow-x-auto scrollbar-none border-b border-slate-900/40">
      {/* OS Indicator */}
      <div className="flex items-center gap-2 px-2 mr-1 text-slate-400 select-none shrink-0">
        <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
        <span className="text-[11px] font-mono tracking-wider font-bold text-slate-300 hidden sm:inline">
          NOWCAST OS
        </span>
      </div>

      {/* Reorder.Group: the key to fluid horizontal displacement */}
      <Reorder.Group
        axis="x"
        values={tabs}
        onReorder={setTabs}
        className="flex items-center gap-1"
        as="div"
      >
        {tabs.map((tab) => (
          <ReorderTab
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onSelect={() => setActiveTabId(tab.id)}
            onClose={() => closeTab(tab.id)}
            canClose={tabs.length > 1}
          />
        ))}
      </Reorder.Group>

      {/* Spawn new tab */}
      <button
        type="button"
        onClick={() =>
          addTab({ mode: 'web', title: 'Google', url: 'https://www.google.com' })
        }
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors ml-1 shrink-0"
        aria-label="Open new tab"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default BrowserTabs;
