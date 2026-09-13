import React from 'react';

export default function TabStrip({
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
    onOpenTabSearch
}) {
    const getTabFavicon = (tab) => {
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
        <header className="tab-strip-bar">
            {/* Authentic MacBook Traffic Light Window Controls */}
            <div className="mac-window-controls" title="Window Controls">
                <button
                    className="mac-btn mac-close"
                    title="Close Window"
                    aria-label="Close"
                    onClick={() => {
                        if (typeof window !== 'undefined' && window.require) {
                            try {
                                const { ipcRenderer } = window.require('electron');
                                ipcRenderer.send('window-close');
                            } catch (e) {}
                        }
                    }}
                />
                <button
                    className="mac-btn mac-minimize"
                    title="Minimize Window"
                    aria-label="Minimize"
                    onClick={() => {
                        if (typeof window !== 'undefined' && window.require) {
                            try {
                                const { ipcRenderer } = window.require('electron');
                                ipcRenderer.send('window-minimize');
                            } catch (e) {}
                        }
                    }}
                />
                <button
                    className="mac-btn mac-maximize"
                    title="Maximize / Restore Window"
                    aria-label="Maximize"
                    onClick={() => {
                        if (typeof window !== 'undefined' && window.require) {
                            try {
                                const { ipcRenderer } = window.require('electron');
                                ipcRenderer.send('window-maximize');
                            } catch (e) {}
                        }
                    }}
                />
            </div>

            <div className="brand-badge">
                <span className="brand-logo">✨</span>
                <span className="brand-title">Antigravity</span>
            </div>

            {/* Clean, Consistent Native Tabs Track */}
            <div className="tabs-track" id="tabsTrack">
                {tabs.map((tab) => {
                    const isActive = tab.id === activeTabId;
                    return (
                        <div
                            key={tab.id}
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
                {/* Clean Shields Pill */}
                <div
                    className="mac-shield-pill"
                    id="shieldBadge"
                    title="Brave adblock-rust Shield (Click to view blocked trackers)"
                    onClick={onOpenShields}
                >
                    <span>🛡️</span>
                    <span id="shieldCount">{adblockCount}</span>
                    <span style={{ fontSize: '10px', opacity: 0.7 }}>Blocked</span>
                </div>

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
                        <span className="mac-ai-icon">✦</span>
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
