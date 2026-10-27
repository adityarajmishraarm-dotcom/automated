import React, { memo, useState } from 'react';
import CustomizableElementWrapper from './CustomizableElementWrapper.jsx';

const electron = typeof window !== 'undefined' && window.require
    ? window.require('electron')
    : (typeof require !== 'undefined' ? require('electron') : null);
const ipcRenderer = electron ? electron.ipcRenderer : null;

function TabStripComponent({
    tabs,
    activeTabId,
    onSelectTab,
    onAddTab,
    onCloseTab,
    adblockCount,
    isHudOpen,
    isHudDetached,
    isExternalHudVisible,
    onToggleHud,
    onDetachToggleHud,
    onDockHud,
    onOpenShields,
    onOpenTabSearch,
    isEditMode = false,
    onToggleEditMode,
    onOpenElementEditor,
    onReorderTabs
}) {
    const [draggedTabId, setDraggedTabId] = useState(null);
    const [dropTargetTabId, setDropTargetTabId] = useState(null);
    const getTabFavicon = (tab) => {
        if (tab.isDownloads || tab.url === 'antigravity://downloads') return '📥';
        if (tab.isNewTab || !tab.url || tab.url.includes('newtab.html') || tab.url === 'antigravity://newtab') {
            return null;
        }
        const u = tab.url.toLowerCase();
        if (u.includes('youtube.com') || u.includes('youtu.be')) return '▶️';
        if (u.includes('google.com')) return '🔍';
        if (u.includes('wikipedia.org')) return '📖';
        if (u.includes('github.com')) return '🐙';
        if (u.includes('news.ycombinator.com')) return '🧡';
        if (u.startsWith('https://') || u.startsWith('http://')) return '🌐';
        return null;
    };

    return (
        <header 
            className="tab-strip-bar"
            onDoubleClick={(e) => {
                if (e.target === e.currentTarget) {
                    if (ipcRenderer) ipcRenderer.send('window-maximize');
                }
            }}
        >
            {/* Authentic MacBook Traffic Light Window Controls */}
            <div className="mac-window-controls" title="Window Controls">
                <button
                    className="mac-btn mac-close"
                    title="Close Window"
                    aria-label="Close"
                    onClick={() => {
                        if (ipcRenderer) ipcRenderer.send('window-close');
                    }}
                />
                <button
                    className="mac-btn mac-minimize"
                    title="Minimize Window (Mini Window)"
                    aria-label="Minimize"
                    onClick={() => {
                        if (ipcRenderer) ipcRenderer.send('window-minimize');
                    }}
                />
                <button
                    className="mac-btn mac-maximize"
                    title="Maximize / Restore Window"
                    aria-label="Maximize"
                    onClick={() => {
                        if (ipcRenderer) ipcRenderer.send('window-maximize');
                    }}
                />
            </div>

            <div className="brand-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
                <img src="assets/logo.png" alt="Nexora" style={{ width: '20px', height: '20px', objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(0, 240, 255, 0.5))' }} />
                <span className="nexora-brand-title">Nexora</span>
            </div>

            {/* Clean, Consistent Native Tabs Track with Drag & Drop */}
            <div className="tabs-track" id="tabsTrack">
                {tabs.map((tab) => {
                    const isActive = tab.id === activeTabId;
                    const isDropTarget = dropTargetTabId === tab.id;
                    return (
                        <div
                            key={tab.id}
                            className={`native-tab-dnd-container ${isDropTarget ? 'tab-drop-indicator' : ''}`}
                            draggable={true}
                            onDragStart={(e) => {
                                e.dataTransfer.setData('application/x-antigravity-tab', tab.id);
                                e.dataTransfer.setData('text/plain', tab.url || '');
                                e.dataTransfer.effectAllowed = 'move';
                                setDraggedTabId(tab.id);
                            }}
                            onDragOver={(e) => {
                                e.preventDefault();
                                if (draggedTabId && draggedTabId !== tab.id) {
                                    setDropTargetTabId(tab.id);
                                }
                            }}
                            onDragLeave={() => {
                                if (dropTargetTabId === tab.id) setDropTargetTabId(null);
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                const sourceId = e.dataTransfer.getData('application/x-antigravity-tab') || draggedTabId;
                                if (sourceId && sourceId !== tab.id && onReorderTabs) {
                                    onReorderTabs(sourceId, tab.id);
                                }
                                setDraggedTabId(null);
                                setDropTargetTabId(null);
                            }}
                            onDragEnd={() => {
                                setDraggedTabId(null);
                                setDropTargetTabId(null);
                            }}
                        >
                            {/* ========================================================================= */}
                            {/* ///// tab code /////                                                      */}
                            {/* ========================================================================= */}
                            <CustomizableElementWrapper
                                elementId="element_tab_pill"
                                isEditMode={isEditMode && isActive}
                                onOpenElementEditor={onOpenElementEditor}
                                onAction={(action) => {
                                    if (action === 'close-tab') onCloseTab(tab.id);
                                    else onSelectTab(tab.id);
                                }}
                            >
                                <div
                                    className={`native-tab ${isActive ? 'active' : ''}`}
                                    title={tab.title ? `${tab.title}\n${tab.url}` : (tab.url || 'New Tab')}
                                    onClick={() => onSelectTab(tab.id)}
                                >
                                    {getTabFavicon(tab) ? (
                                        <span className="tab-favicon">
                                            {getTabFavicon(tab)}
                                        </span>
                                    ) : null}
                                    <span className="tab-label">
                                        {tab.title || 'New Tab'}
                                    </span>
                                    <button
                                        className="tab-close-btn"
                                        title="Close Tab (Ctrl+W)"
                                        aria-label="Close Tab"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onCloseTab(tab.id);
                                        }}
                                    >
                                        <svg width="7" height="7" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                            <line x1="1" y1="1" x2="9" y2="9" />
                                            <line x1="9" y1="1" x2="1" y2="9" />
                                        </svg>
                                    </button>
                                </div>
                            </CustomizableElementWrapper>
                        </div>
                    );
                })}
            </div>

            {/* macOS Action Buttons */}
            <button
                className="btn-mac-icon"
                id="btnAddTab"
                title="New Tab (Ctrl+T)"
                onClick={onAddTab}
            >
                +
            </button>

            <button
                className="btn-mac-icon"
                id="btnTabSearch"
                title="Search Open Tabs (Ctrl+K)"
                onClick={onOpenTabSearch}
            >
                🔍
            </button>

            {/* Unified Apple Intelligence & System Controls */}
            <div className="window-controls-placeholder">
                {/* Unified Edit Mode Switcher */}
                <button
                    className={`btn-toolbar-tool ${isEditMode ? 'active-edit-mode' : ''}`}
                    id="btnGlobalEditMode"
                    title={isEditMode ? "Exit Edit Mode (Lock Layout)" : "Enter Edit Mode (Click any highlighted section to edit its code, drag to reorder)"}
                    onClick={onToggleEditMode}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 12px',
                        borderRadius: '8px',
                        border: isEditMode ? '1px solid #00e5ff' : '1px solid rgba(255, 255, 255, 0.15)',
                        background: isEditMode ? 'linear-gradient(135deg, rgba(0, 229, 255, 0.28), rgba(2, 132, 199, 0.28))' : 'rgba(255, 255, 255, 0.06)',
                        color: isEditMode ? '#00e5ff' : '#cbd5e1',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: isEditMode ? '0 0 14px rgba(0, 229, 255, 0.45)' : 'none',
                        transition: 'all 0.18s ease'
                    }}
                >
                    <span>{isEditMode ? '🔒' : '🛠️'}</span>
                    <span>{isEditMode ? 'Edit Mode (ON)' : 'Edit Mode'}</span>
                </button>

                {/* Clean Shields Pill */}
                <div
                    className="mac-shield-pill"
                    id="shieldBadge"
                    title="Adblock & Privacy Shield (Click to view blocked trackers)"
                    onClick={onOpenShields}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)' }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#00dbe9' }}>shield</span>
                    <span id="shieldCount" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: '700', color: '#00f0ff' }}>{adblockCount || 68}</span>
                </div>

                {/* Profile Button */}
                <button
                    aria-label="Profile"
                    title="Nexora User Profile & Preferences"
                    type="button"
                    style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #00f0ff 0%, #2563eb 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#060810',
                        boxShadow: '0 0 10px rgba(0, 240, 255, 0.3)',
                        transition: 'all 0.15s ease'
                    }}
                    onClick={() => {
                        if (onToggleEditMode) onToggleEditMode();
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#060810' }}>person</span>
                </button>

                {/* Unified Apple Intelligence Capsule */}
                <div className="mac-ai-capsule">
                    {/* Primary AI Cockpit Trigger */}
                    <button
                        className={`mac-ai-btn ${isExternalHudVisible ? 'active-external' : ''} ${isHudOpen && !isHudDetached ? 'active-docked' : ''}`}
                        title={
                            isHudDetached
                                ? (isExternalHudVisible ? "Retract and hide external AI window" : "Open standalone AI Cockpit window")
                                : (isHudOpen ? "Close AI Layer sidebar" : "Open AI Layer sidebar")
                        }
                        onClick={isHudDetached ? onDetachToggleHud : onToggleHud}
                    >
                        <img src="assets/logo.png" alt="AI" style={{ width: '15px', height: '15px', objectFit: 'contain', marginRight: '4px' }} />
                        <span>
                            {isHudDetached
                                ? (isExternalHudVisible ? "AI Cockpit ⤡" : "AI Cockpit ↗")
                                : `AI Layer ${isHudOpen ? '▾' : '▸'}`}
                        </span>
                        {isExternalHudVisible && (
                            <span className="dot-live" style={{ width: 5, height: 5, marginLeft: 2 }} />
                        )}
                    </button>

                    {/* Integrated Dock / Detach Switcher */}
                    {isHudDetached ? (
                        <button
                            className="mac-ai-sub-btn"
                            title="Dock AI Layer back into the main browser window"
                            onClick={onDockHud}
                        >
                            📥 Dock
                        </button>
                    ) : (
                        <button
                            className="mac-ai-sub-btn"
                            title="Detach AI Layer into external standalone window"
                            onClick={onDetachToggleHud}
                        >
                            ↗ Pop out
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}

export default memo(TabStripComponent);
