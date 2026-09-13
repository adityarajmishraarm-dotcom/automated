'use client';

import React from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { Bookmark } from '../../types/workspace';
import { ClientOnly } from '../common/ClientOnly';
import { MapPin, X, Folder } from 'lucide-react';

export const BookmarksBar: React.FC = () => {
  const { 
    bookmarks, 
    removeBookmark, 
    executeSearch 
  } = useWorkspaceStore();

  if (bookmarks.length === 0) {
    return null;
  }

  return (
    <ClientOnly fallback={null}>
      <nav 
        aria-label="Bookmarks bar" 
        className="w-full bg-slate-950/90 px-4 py-1 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px] text-slate-400 select-none border-t border-slate-900/40"
      >
        <div className="flex items-center gap-1 text-slate-500 mr-1 shrink-0">
          <Folder className="w-3 h-3" />
          <span className="text-[10px] uppercase font-mono tracking-wider">Pinned:</span>
        </div>

        <div className="flex items-center gap-1.5 flex-1 overflow-x-auto scrollbar-none">
          {bookmarks.map((bm: Bookmark) => (
            <div
              key={bm.id}
              onClick={() => executeSearch(bm.locationName)}
              className="group flex items-center gap-1.5 px-2.5 py-0.5 rounded-md hover:bg-slate-900 hover:text-slate-200 cursor-pointer transition-colors shrink-0"
              title={`${bm.title} (${bm.locationName})`}
            >
              <MapPin className="w-3 h-3 text-cyan-400/80 group-hover:text-cyan-400 shrink-0" />
              <span className="truncate max-w-[140px] font-medium">{bm.title}</span>
              
              {/* Delete Bookmark on Hover */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeBookmark(bm.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-300 transition-opacity ml-0.5"
                title="Remove bookmark"
                aria-label={`Remove ${bm.title}`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      </nav>
    </ClientOnly>
  );
};
