'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { ClientOnly } from '../common/ClientOnly';
import { 
  Search, 
  Clock, 
  Star, 
  ArrowLeft, 
  ArrowRight, 
  RotateCw, 
  X, 
  Bot, 
  MapPin, 
  Trash2 
} from 'lucide-react';

export const Omnibox: React.FC = () => {
  const { 
    tabs, 
    activeTabId, 
    executeSearch, 
    history, 
    removeHistoryItem, 
    clearHistory, 
    toggleBookmark, 
    isChatOpen, 
    toggleChat 
  } = useWorkspaceStore();

  const [isFocused, setIsFocused] = useState(false);
  const [localInput, setLocalInput] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const isBookmarked = activeTab?.isBookmarked || false;
  const isDashboard = activeTab?.mode === 'dashboard';

  // Synchronize local input with active tab location
  useEffect(() => {
    if (activeTab) {
      setLocalInput(activeTab.mode === 'dashboard' ? activeTab.locationName : '');
    }
  }, [activeTabId, activeTab]);

  // Click-outside listener to close search history dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localInput.trim()) return;
    executeSearch(localInput.trim());
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const handleSelectHistory = (query: string) => {
    setLocalInput(query);
    executeSearch(query);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  return (
    <ClientOnly
      fallback={
        <div className="w-full bg-slate-900 px-4 py-2 flex items-center justify-center">
          <div className="h-8 w-full max-w-xl bg-slate-950 rounded-xl animate-pulse" />
        </div>
      }
    >
      <div 
        ref={containerRef}
        className="relative w-full bg-slate-900 px-4 py-2 flex items-center justify-between gap-3 select-none border-b border-slate-800/60"
      >
        {/* 1. Browser Navigation Buttons (Back, Forward, Refresh) */}
        <div className="flex items-center gap-1 text-slate-400">
          <button
            type="button"
            disabled
            className="p-1.5 rounded-lg opacity-40 cursor-not-allowed text-slate-500"
            title="Back"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled
            className="p-1.5 rounded-lg opacity-40 cursor-not-allowed text-slate-500"
            title="Forward"
            aria-label="Forward"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (activeTab?.locationName) executeSearch(activeTab.locationName);
            }}
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-slate-200 transition-colors"
            title="Refresh Telemetry"
            aria-label="Refresh Telemetry"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 2. Floating Centered Omnibox Input */}
        <div className="relative flex-1 max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="w-full relative flex items-center">
            <div className="absolute left-3 text-slate-500 pointer-events-none flex items-center">
              {isDashboard ? (
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <Search className="w-3.5 h-3.5 text-slate-400" />
              )}
            </div>

            <input
              ref={inputRef}
              type="text"
              value={localInput}
              onChange={(e) => setLocalInput(e.target.value)}
              onFocus={() => setIsFocused(true)}
              placeholder="Search location or coordinates (e.g. 19.0688, 72.8797 or Kurla West)..."
              className="w-full h-8 pl-8 pr-16 bg-slate-950/80 hover:bg-slate-950 text-slate-200 placeholder-slate-500 text-xs font-sans rounded-xl focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all border border-transparent focus:border-cyan-500/40"
            />

            {/* Action Buttons inside Omnibox */}
            <div className="absolute right-2 flex items-center gap-1">
              {localInput && (
                <button
                  type="button"
                  onClick={() => setLocalInput('')}
                  className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                  title="Clear input"
                  aria-label="Clear input"
                >
                  <X className="w-3 h-3" />
                </button>
              )}

              {/* Star Bookmark Button */}
              {activeTab && (
                <button
                  type="button"
                  onClick={() => toggleBookmark(activeTab.id)}
                  disabled={activeTab.mode === 'launchpad'}
                  className={`p-1 rounded-md transition-colors ${
                    activeTab.mode === 'launchpad'
                      ? 'opacity-30 cursor-not-allowed text-slate-600'
                      : isBookmarked
                      ? 'text-amber-400 hover:text-amber-300'
                      : 'text-slate-500 hover:text-amber-400'
                  }`}
                  title={isBookmarked ? 'Remove bookmark' : 'Bookmark this location'}
                  aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this location'}
                >
                  <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400' : ''}`} />
                </button>
              )}
            </div>
          </form>

          {/* 3. Search History Dropdown */}
          {isFocused && (
            <div className="absolute left-0 right-0 top-10 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in-50 duration-150 text-left">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 text-[11px] text-slate-400 font-medium">
                <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-wide text-slate-500 uppercase">
                  <Clock className="w-3 h-3" />
                  Recent Searches
                </span>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearHistory();
                    }}
                    className="text-[10px] text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                    <span>Clear History</span>
                  </button>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto py-1">
                {history.length === 0 ? (
                  <div className="px-3 py-4 text-center text-slate-500 text-xs font-sans">
                    No recent searches recorded
                  </div>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectHistory(item.query)}
                      className="group flex items-center justify-between px-3 py-2 hover:bg-slate-800/80 cursor-pointer transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2 text-slate-300 group-hover:text-cyan-300">
                        <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">{item.query}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-500">
                          {item.timestamp}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeHistoryItem(item.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200 transition-all"
                          title="Remove from history"
                          aria-label="Remove item"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 4. Zen Copilot Trigger */}
        <button
          type="button"
          onClick={toggleChat}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
            isChatOpen
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Toggle Zen AI Weather Copilot"
          aria-label="Toggle Zen AI Weather Copilot"
        >
          <Bot className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Zen Copilot</span>
        </button>
      </div>
    </ClientOnly>
  );
};
