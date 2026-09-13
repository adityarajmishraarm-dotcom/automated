'use client';

import React, { useState } from 'react';
import { 
  DndContext, 
  closestCenter, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragStartEvent, 
  DragEndEvent, 
  DragOverlay 
} from '@dnd-kit/core';
import { 
  SortableContext, 
  horizontalListSortingStrategy, 
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { WorkspaceTab } from '../../types/workspace';
import { ClientOnly } from '../common/ClientOnly';
import { Plus, X, Globe, CloudRain, Radio } from 'lucide-react';

interface TabItemProps {
  tab: WorkspaceTab;
  isActive: boolean;
  isDragging?: boolean;
  isOverlay?: boolean;
  onSelect?: () => void;
  onClose?: (e: React.MouseEvent) => void;
  canClose?: boolean;
}

// Visual Representation of a Tab (used both in strip and DragOverlay)
function TabVisual({ tab, isActive, isDragging, isOverlay, onSelect, onClose, canClose }: TabItemProps) {
  const isLaunchpad = tab.mode === 'launchpad';

  return (
    <div
      onClick={onSelect}
      className={`group relative flex items-center gap-2 h-9 px-3.5 rounded-t-xl text-xs font-medium select-none cursor-pointer transition-colors duration-150 ${
        isOverlay
          ? 'bg-slate-900 text-cyan-300 shadow-2xl ring-1 ring-cyan-500/40 z-50 scale-105'
          : isActive
          ? 'bg-slate-900 text-slate-100 shadow-sm'
          : 'bg-transparent text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
      } ${isDragging ? 'opacity-30' : 'opacity-100'}`}
      style={{
        minWidth: '140px',
        maxWidth: '220px',
      }}
    >
      {/* Tab Icon */}
      {isLaunchpad ? (
        <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      ) : (
        <CloudRain className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
      )}

      {/* Tab Title */}
      <span className="truncate flex-1 text-left">
        {tab.title || (isLaunchpad ? 'New Tab' : 'Weather Dashboard')}
      </span>

      {/* Close Button */}
      {canClose && !isOverlay && (
        <button
          type="button"
          onClick={onClose}
          className="opacity-0 group-hover:opacity-100 hover:bg-slate-800 p-0.5 rounded-md text-slate-400 hover:text-slate-200 transition-all shrink-0"
          title="Close tab"
          aria-label="Close tab"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* Active Tab Accent Line */}
      {isActive && !isOverlay && (
        <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-cyan-400 rounded-full" />
      )}
    </div>
  );
}

// Sortable Tab Wrapper with Chrome-style sliding displacement transitions
function SortableTabItem({ tab, isActive, onSelect, onClose, canClose }: TabItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: tab.id });

  const style: React.CSSProperties = {
    // Dynamic transform with smooth spring transition creates the Chrome-like sliding gap
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
    zIndex: isDragging ? 0 : isActive ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TabVisual
        tab={tab}
        isActive={isActive}
        isDragging={isDragging}
        onSelect={onSelect}
        onClose={onClose}
        canClose={canClose}
      />
    </div>
  );
}

export const TabBar: React.FC = () => {
  const { 
    tabs, 
    activeTabId, 
    switchTab, 
    closeTab, 
    spawnTab, 
    reorderTabs 
  } = useWorkspaceStore();

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Pointer sensor with 5px distance threshold so normal clicks don't trigger accidental dragging
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderTabs(String(active.id), String(over.id));
    }
    setActiveDragId(null);
  };

  const activeDragTab = tabs.find((t) => t.id === activeDragId);

  return (
    <ClientOnly
      fallback={
        <div className="w-full bg-slate-950 px-3 pt-2 h-10 flex items-center gap-2">
          <div className="h-7 w-32 bg-slate-900/60 rounded-t-xl animate-pulse" />
        </div>
      }
    >
      <div className="w-full bg-slate-950 px-3 pt-2 flex items-center gap-1 overflow-x-auto scrollbar-none border-b border-transparent">
        {/* Browser OS Brand Indicator */}
        <div className="flex items-center gap-1.5 px-2 mr-1 text-slate-400 select-none shrink-0">
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="text-[11px] font-mono tracking-wider font-semibold text-slate-300 hidden sm:inline">
            NOWCAST OS
          </span>
        </div>

        {/* Draggable Tab Strip with Chrome-Like Displacement */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tabs.map((t) => t.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex items-center gap-1">
              {tabs.map((tab) => (
                <SortableTabItem
                  key={tab.id}
                  tab={tab}
                  isActive={tab.id === activeTabId}
                  onSelect={() => switchTab(tab.id)}
                  onClose={(e) => {
                    e?.stopPropagation();
                    closeTab(tab.id);
                  }}
                  canClose={tabs.length > 1}
                />
              ))}
            </div>
          </SortableContext>

          {/* Smooth Drag Overlay: Floating Tab follows cursor while adjacent tabs slide */}
          <DragOverlay dropAnimation={{
            duration: 180,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}>
            {activeDragTab ? (
              <TabVisual
                tab={activeDragTab}
                isActive={activeDragTab.id === activeTabId}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Plus '+' Button to Spawn New Tabs */}
        <button
          type="button"
          onClick={() => spawnTab('launchpad')}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors ml-1 shrink-0"
          title="Open new tab"
          aria-label="Open new tab"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </ClientOnly>
  );
};
