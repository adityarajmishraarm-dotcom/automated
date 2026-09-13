'use client';

import React, { useState } from 'react';
import { useBrowserStore } from '../store/useBrowserStore';
import { 
  Search, 
  Plus, 
  X, 
  Radio, 
  Shield, 
  AlertTriangle, 
  Waves, 
  Eye, 
  Globe, 
  Link as LinkIcon 
} from 'lucide-react';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Shield,
  Radio,
  AlertTriangle,
  Waves,
  Eye,
  Globe,
};

export const Launchpad: React.FC = () => {
  const { shortcuts, addShortcut, removeShortcut, navigateActiveTab } = useBrowserStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigateActiveTab(searchQuery.trim());
  };

  const handleAddShortcutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;

    addShortcut({ title: newTitle.trim(), url: newUrl.trim() });

    setNewTitle('');
    setNewUrl('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="w-full h-full flex-1 flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-2xl flex flex-col items-center -mt-16">
        {/* 1. Minimalist Google-Style Hero Brand Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3">
            <Radio className="w-8 h-8 text-cyan-400 animate-pulse" />
            <h1 className="text-4xl font-extrabold tracking-tight font-sans text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-slate-200 to-cyan-400">
              NOWCAST
            </h1>
          </div>
          <p className="text-xs font-mono text-slate-500 tracking-widest uppercase mt-2">
            Hyper-Local Severe Weather Workspace
          </p>
        </div>

        {/* 2. Vertically & Horizontally Centered Google-Style Omnibox */}
        <form onSubmit={handleSearchSubmit} className="w-full relative mb-10 group">
          <div className="relative flex items-center">
            <div className="absolute left-4 text-slate-500 group-hover:text-slate-400 transition-colors pointer-events-none">
              <Search className="w-4 h-4" />
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Mumbai sector, pin code, or coordinates (e.g. 19.0688, 72.8797)..."
              className="w-full h-12 pl-12 pr-12 bg-slate-900/90 hover:bg-slate-900 text-slate-100 placeholder-slate-500 text-sm font-sans rounded-full shadow-lg hover:shadow-cyan-500/5 focus:shadow-cyan-500/10 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 border border-slate-800 transition-all"
              autoFocus
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-4 text-slate-500 hover:text-slate-300 transition-colors"
                title="Clear"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 mt-3 text-[11px] text-slate-500 font-sans">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400">Enter</kbd> to launch live radar dashboard</span>
          </div>
        </form>

        {/* 3. Quick Shortcuts Grid (Chrome/Brave Style) */}
        <div className="w-full max-w-xl">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 text-center mb-4">
            Pinned Radar Portals & Emergency Shortcuts
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 justify-items-center">
            {(shortcuts || []).map((sc) => {
              const IconComponent = (sc.icon && ICON_MAP[sc.icon]) || Globe;

              return (
                <div key={sc.id} className="group relative flex flex-col items-center">
                  <a
                    href={sc.url}
                    onClick={(e) => {
                      e.preventDefault();
                      navigateActiveTab(sc.url);
                    }}
                    className="w-12 h-12 rounded-2xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 flex items-center justify-center text-slate-300 hover:text-cyan-400 transition-all shadow-md group-hover:scale-105"
                    title={sc.url}
                  >
                    <IconComponent className="w-5 h-5" />
                  </a>

                  <span className="text-[11px] text-slate-400 group-hover:text-slate-200 mt-2 truncate max-w-[84px] text-center">
                    {sc.title}
                  </span>

                  {/* Remove Shortcut Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeShortcut(sc.id);
                    }}
                    className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 p-0.5 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 rounded-full transition-all"
                    title="Remove shortcut"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              );
            })}

            {/* "+ Add Shortcut" Button */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="w-12 h-12 rounded-2xl bg-slate-900/50 hover:bg-slate-900 border border-dashed border-slate-800 hover:border-slate-700 flex items-center justify-center text-slate-500 hover:text-cyan-400 transition-all shadow-sm hover:scale-105"
                title="Add shortcut"
              >
                <Plus className="w-5 h-5" />
              </button>
              <span className="text-[11px] text-slate-500 mt-2 truncate max-w-[84px] text-center">
                Add Shortcut
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Add Shortcut Modal Dialog */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-left"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm text-slate-100">Add Shortcut</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddShortcutSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. IMD Mumbai Doppler"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">URL</label>
                <input
                  type="text"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-md"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Launchpad;
