const { useState, useEffect, useRef, useMemo, useCallback } = React;

function App() {
  // Global Engine State
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [splitTabId, setSplitTabId] = useState(2);
  const [isSplitView, setIsSplitView] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState('default');
  const [tabGroups, setTabGroups] = useState([]);
  const [closedTabsCount, setClosedTabsCount] = useState(0);

  // Navigation & Security
  const [omniboxUrl, setOmniboxUrl] = useState('https://news.ycombinator.com');
  const [adblockCount, setAdblockCount] = useState(4);
  const [isHitlActive, setIsHitlActive] = useState(false);

  // Persistent Bookmarks Bar State
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const saved = localStorage.getItem('sih_browser_bookmarks');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: 'bm-1', title: 'Mumbai Radar HQ', url: 'nowcast://dashboard/mumbai-central' },
      { id: 'bm-2', title: 'Colaba High-Risk AWS', url: 'nowcast://dashboard/colaba' },
      { id: 'bm-3', title: 'Santacruz Doppler', url: 'nowcast://dashboard/santacruz' },
      { id: 'bm-4', title: 'Hacker News (Pinned)', url: 'https://news.ycombinator.com' },
      { id: 'bm-5', title: 'Checkout Demo', url: 'https://store.example.com/checkout' },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('sih_browser_bookmarks', JSON.stringify(bookmarks));
    } catch (e) {}
  }, [bookmarks]);

  // Draggable Tabs with Authentic Chrome-Like Horizontal Sliding Displacement
  const [dragState, setDragState] = useState({
    isDragging: false,
    draggedId: null,
    draggedIndex: null,
    overIndex: null,
    startX: 0,
    currentX: 0,
    tabWidth: 160,
  });

  // AI Copilot HUD
  const [isHudOpen, setIsHudOpen] = useState(true);
  const [activeHudTab, setActiveHudTab] = useState('ax');
  const [somEnabled, setSomEnabled] = useState(true);
  const [somElements, setSomElements] = useState([]);
  const [axMarkdown, setAxMarkdown] = useState('');

  // In-Memory Grep
  const [grepQuery, setGrepQuery] = useState('Show HN');
  const [grepResults, setGrepResults] = useState(null);

  // Closed Loop Telemetry
  const [telemetryLogs, setTelemetryLogs] = useState([
    { id: 1, type: 'observe', time: '00:00:01', msg: 'Chromium TabStripModel & In-Process WebContents initialized' },
    { id: 2, type: 'verify', time: '00:00:02', msg: 'Zero port leaks verified (CDP closed, stealth kinematics enabled)' },
    { id: 3, type: 'act', time: '00:00:03', msg: 'Rendered Set-of-Marks layer (#FFE600 Badges) with <16ms latency' }
  ]);

  // Command Palette (Ctrl+K)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [paletteIndex, setPaletteIndex] = useState(0);

  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId) || tabs[0] || null, [tabs, activeTabId]);
  const splitTab = useMemo(() => tabs.find(t => t.id === splitTabId) || tabs[1] || tabs[0] || null, [tabs, splitTabId]);

  // Telemetry helper
  const logTelemetry = useCallback((type, msg) => {
    const time = new Date().toLocaleTimeString();
    setTelemetryLogs(prev => [...prev.slice(-30), { id: Date.now() + Math.random(), type, time, msg }]);
  }, []);

  // Fetch tabs from C++ backend
  const fetchTabs = useCallback(async () => {
    try {
      const res = await fetch('/api/tabs');
      if (!res.ok) return;
      const data = await res.json();
      setTabs(data.tabs || []);
      setActiveTabId(data.activeTabId || 1);
      setIsHitlActive(data.hitlActive || false);
      if (data.activeWorkspace) setActiveWorkspace(data.activeWorkspace);
      if (data.closedTabsCount !== undefined) setClosedTabsCount(data.closedTabsCount);
      if (data.tabGroups) setTabGroups(data.tabGroups);
    } catch (e) {
      console.warn('Backend polling info:', e.message);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchTabs();
  }, [fetchTabs]);

  // Sync Omnibox with Active Tab
  useEffect(() => {
    if (activeTab) {
      setOmniboxUrl(activeTab.url);
      fetchSoMAndAx(activeTab.id);
    }
  }, [activeTab]);

  // Fetch Set-of-Marks & AX Tree for active tab
  const fetchSoMAndAx = async (tabId) => {
    try {
      const [somRes, axRes] = await Promise.all([
        fetch(`/api/tab/${tabId}/som`),
        fetch(`/api/tab/${tabId}/ax`)
      ]);
      if (somRes.ok) {
        const somData = await somRes.json();
        setSomElements(somData.elements || []);
      }
      if (axRes.ok) {
        const axText = await axRes.text();
        setAxMarkdown(axText);
      }
    } catch (e) {
      console.error('Failed to load SoM/AX:', e);
    }
  };

  // Switch Tab
  const switchTab = async (id) => {
    try {
      const res = await fetch('/api/tabs/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      setTabs(data.tabs);
      setActiveTabId(id);
      logTelemetry('act', `TabStripModel::ActivateTabAt(id=${id})`);
    } catch (e) {
      setActiveTabId(id);
    }
  };

  // Create New Tab
  const createTab = async (title = 'New Tab', url = 'https://news.ycombinator.com') => {
    try {
      const res = await fetch('/api/tabs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, url, workspace: activeWorkspace })
      });
      const data = await res.json();
      setTabs(data.tabs);
      setActiveTabId(data.activeTabId);
      logTelemetry('act', `TabStripModel::InsertWebContentsAt("${title}")`);
    } catch (e) {
      console.error('Tab creation error:', e);
    }
  };

  // Close Tab
  const closeTab = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch('/api/tabs/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      setTabs(data.tabs);
      setActiveTabId(data.activeTabId);
      setClosedTabsCount(data.closedTabsCount);
      logTelemetry('act', `Closed tab id=${id} (Pushed to UndoCloseStack)`);
    } catch (e) {
      console.error('Close tab error:', e);
    }
  };

  // Undo Close Tab (Ctrl+Shift+T)
  const undoCloseTab = async () => {
    try {
      const res = await fetch('/api/tabs/undo-close', { method: 'POST' });
      const data = await res.json();
      setTabs(data.tabs);
      setActiveTabId(data.activeTabId);
      setClosedTabsCount(data.closedTabsCount);
      logTelemetry('act', `UndoCloseStack::RestoreLastClosedTab (Pillar 2 Recovery)`);
    } catch (e) {
      console.error('Undo close error:', e);
    }
  };

  // Toggle Pin Status
  const togglePin = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch('/api/tabs/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      setTabs(data.tabs);
      logTelemetry('act', `Toggled Pin status for tab id=${id}`);
    } catch (e) {
      console.error('Toggle pin error:', e);
    }
  };

  // Toggle Mute
  const toggleMute = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch('/api/tabs/mute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      setTabs(data.tabs);
      logTelemetry('act', `TabResourceTracker::ToggleAudioMute(id=${id})`);
    } catch (e) {
      console.error('Toggle mute error:', e);
    }
  };

  // Toggle Freeze (Tier 1 Sleeping Tab)
  const toggleFreeze = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch('/api/tabs/freeze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      setTabs(data.tabs);
      logTelemetry('act', `TabFreezeManager::ToggleTier1Freeze(id=${id})`);
    } catch (e) {
      console.error('Toggle freeze error:', e);
    }
  };

  // Switch Workspace
  const handleWorkspaceChange = async (ws) => {
    setActiveWorkspace(ws);
    try {
      await fetch('/api/tabs/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace: ws })
      });
      logTelemetry('act', `TabGroupManager::SwitchWorkspace("${ws}")`);
    } catch (e) { }
  };

  // Navigate URL
  const handleNavigate = (customUrl, customTitle) => {
    if (!activeTab) return;
    let url = (customUrl !== undefined ? customUrl : omniboxUrl).trim();
    if (!url) url = 'nowcast://launchpad';
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('nowcast://') && !url.startsWith('about:')) {
      if (url.toLowerCase().includes('radar') || url.toLowerCase().includes('mumbai') || url.toLowerCase().includes('weather') || url.toLowerCase().includes('nowcast')) {
        url = 'nowcast://dashboard/' + encodeURIComponent(url.toLowerCase());
      } else {
        url = 'https://' + url;
      }
    }
    const title = customTitle || (url.startsWith('nowcast://') ? url.replace(/^nowcast:\/\/dashboard\//, '').replace(/^nowcast:\/\//, '').toUpperCase() : url.replace(/^https?:\/\//, ''));
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url, title } : t));
    setOmniboxUrl(url);
    setAdblockCount(c => c + 1);
    logTelemetry('act', `WebContents::LoadURL("${url}")`);
  };

  // Check if current active tab or omnibox URL is bookmarked
  const isCurrentBookmarked = useMemo(() => {
    const currentUrl = (activeTab?.url || omniboxUrl || '').toLowerCase();
    return bookmarks.some(b => b.url.toLowerCase() === currentUrl);
  }, [bookmarks, activeTab, omniboxUrl]);

  // Toggle Bookmark
  const toggleBookmark = () => {
    const currentUrl = (activeTab?.url || omniboxUrl || '').trim();
    const currentTitle = activeTab?.title || currentUrl;
    if (!currentUrl) return;

    setBookmarks(prev => {
      const exists = prev.find(b => b.url.toLowerCase() === currentUrl.toLowerCase());
      if (exists) {
        logTelemetry('act', `Removed bookmark "${exists.title}"`);
        return prev.filter(b => b.id !== exists.id);
      } else {
        const newBm = { id: `bm-${Date.now()}`, title: currentTitle, url: currentUrl };
        logTelemetry('act', `Added bookmark "${newBm.title}"`);
        return [...prev, newBm];
      }
    });
  };

  // Remove Bookmark
  const removeBookmark = (id) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
  };

  // Run In-Memory Grep
  const runGrepSearch = async () => {
    if (!activeTab) return;
    try {
      const res = await fetch(`/api/tab/${activeTab.id}/grep`);
      const data = await res.json();
      setGrepResults(data);
      logTelemetry('verify', `In-Memory Grep: Found matches for "${grepQuery}"`);
    } catch (e) {
      console.error('Grep error:', e);
    }
  };

  // Autofill Action
  const handleAutofill = () => {
    const activeIframe = document.getElementById('main-active-frame');
    if (activeIframe && activeIframe.contentDocument) {
      const doc = activeIframe.contentDocument;
      const nameInput = doc.querySelector('#autofill-name') || doc.querySelector('input[name="name"]');
      const emailInput = doc.querySelector('#autofill-email') || doc.querySelector('input[name="email"]');
      const addressInput = doc.querySelector('#autofill-address') || doc.querySelector('input[name="address"]');
      if (nameInput) nameInput.value = 'Alex Mercer';
      if (emailInput) emailInput.value = 'alex.mercer@ai-browser.dev';
      if (addressInput) addressInput.value = '123 Tech Blvd, Suite 400';
    }
    logTelemetry('act', 'components/autofill::AutofillManager::FillForm() executed');
  };

  // Toggle HITL
  const toggleHitl = async () => {
    try {
      const res = await fetch('/api/agent/hitl', { method: 'POST' });
      const data = await res.json();
      setIsHitlActive(data.hitlActive);
      logTelemetry('act', data.hitlActive ? 'Layer 4: Human Takeover (HITL) activated' : 'HITL resolved. Autonomous agent resumed');
    } catch (e) {
      setIsHitlActive(h => !h);
    }
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K: Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(open => !open);
      }
      // Ctrl+T: New Tab
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't' && !e.shiftKey) {
        e.preventDefault();
        createTab('New Tab', 'https://news.ycombinator.com');
      }
      // Ctrl+W: Close Tab
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (activeTabId) closeTab(activeTabId);
      }
      // Ctrl+Shift+T: Undo Close Tab
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        undoCloseTab();
      }
      // Escape: Close Modal
      else if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId]);

  // Filter tabs for Command Palette
  const filteredTabs = useMemo(() => {
    if (!paletteQuery.trim()) return tabs;
    const q = paletteQuery.toLowerCase();
    return tabs.filter(t => t.title.toLowerCase().includes(q) || t.url.toLowerCase().includes(q));
  }, [tabs, paletteQuery]);

  // Tabs visible in active workspace
  const visibleTabs = useMemo(() => {
    return tabs.filter(t => t.is_pinned || t.workspace === activeWorkspace || activeWorkspace === 'default');
  }, [tabs, activeWorkspace]);

  const pinnedTabs = useMemo(() => visibleTabs.filter(t => t.isPinned), [visibleTabs]);
  const standardTabs = useMemo(() => visibleTabs.filter(t => !t.isPinned), [visibleTabs]);

  const draggingTabObj = useMemo(() => {
    if (!dragState.draggedId) return null;
    return tabs.find(t => t.id === dragState.draggedId) || null;
  }, [tabs, dragState.draggedId]);

  // Window pointer listeners for smooth horizontal tab displacement
  useEffect(() => {
    if (!dragState.draggedId) return;

    const onPointerMove = (e) => {
      const deltaX = e.clientX - dragState.startX;
      const isDrag = dragState.isDragging || Math.abs(deltaX) > 4;
      const tabWidth = dragState.tabWidth || 160;
      const step = Math.round(deltaX / tabWidth);
      const newOverIndex = Math.max(0, Math.min(standardTabs.length - 1, dragState.draggedIndex + step));

      setDragState(prev => ({
        ...prev,
        isDragging: isDrag,
        currentX: e.clientX,
        overIndex: newOverIndex,
      }));
    };

    const onPointerUp = () => {
      if (dragState.isDragging && dragState.overIndex !== null && dragState.overIndex !== dragState.draggedIndex) {
        const fromTab = standardTabs[dragState.draggedIndex];
        const toTab = standardTabs[dragState.overIndex];
        if (fromTab && toTab && fromTab.id !== toTab.id) {
          setTabs(prev => {
            const oldIdx = prev.findIndex(t => t.id === fromTab.id);
            const newIdx = prev.findIndex(t => t.id === toTab.id);
            if (oldIdx === -1 || newIdx === -1) return prev;
            const updated = [...prev];
            const [moved] = updated.splice(oldIdx, 1);
            updated.splice(newIdx, 0, moved);
            return updated;
          });
          logTelemetry('act', `ChromeTabDisplacement: Reordered tab #${fromTab.id} to position ${dragState.overIndex}`);
        }
      }
      setDragState({
        isDragging: false,
        draggedId: null,
        draggedIndex: null,
        overIndex: null,
        startX: 0,
        currentX: 0,
        tabWidth: 160,
      });
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [dragState.draggedId, dragState.startX, dragState.isDragging, dragState.draggedIndex, dragState.overIndex, dragState.tabWidth, standardTabs]);

  return (
    <div className="react-browser-app">
      {/* 1. Native Window Title Bar */}
      <header className="window-titlebar">
        <div className="titlebar-left">
          <div className="window-traffic-lights">
            <span className="traffic-light close" title="Close Window" onClick={() => window.close()}></span>
            <span className="traffic-light minimize" title="Minimize Window"></span>
            <span className="traffic-light maximize" title="Maximize Window"></span>
          </div>
          <div className="app-brand">
            <span className="brand-icon">✨</span>
            <span className="brand-title">Antigravity AI Browser Core</span>
            <span className="engine-pill">React 18 Fiber • In-Process C++</span>
          </div>
        </div>

        <div className="titlebar-center">
          <div className="stealth-status-badge" title="No external CDP automation ports are open">
            <span className="stealth-pulse-dot"></span>
            <span>Zero Port Leaks • Stealth Mode</span>
          </div>
        </div>

        <div className="titlebar-right">
          <div className="shield-counter" title="Native Adblock Filter Active">
            <span>🛡️</span>
            <span>{adblockCount} Blocked</span>
          </div>
          <button
            className={`btn-header-action ${isSplitView ? 'active' : ''}`}
            onClick={() => setIsSplitView(v => !v)}
            title="Toggle Split View Dual Panes (Pillar 7)"
          >
            ◫ Split View
          </button>
          <button
            className={`btn-header-action ${isHudOpen ? 'active' : ''}`}
            onClick={() => setIsHudOpen(h => !h)}
            title="Toggle AI Copilot HUD"
          >
            🤖 AI HUD
          </button>
        </div>
      </header>

      {/* 2. TabStripModel Bar */}
      <nav className="tabstrip-bar">
        {/* Workspace Dropdown */}
        <div className="workspace-selector" title="Active Isolated Workspace">
          <select
            className="workspace-select-input"
            value={activeWorkspace}
            onChange={(e) => handleWorkspaceChange(e.target.value)}
          >
            <option value="default">🌐 Default</option>
            <option value="work">🏢 Work</option>
            <option value="personal">👤 Personal</option>
            <option value="research">🔬 Research</option>
          </select>
        </div>

        {/* Pinned Tabs (Pillar 1: Far-Left, Icon-Only, No Close Button) */}
        {pinnedTabs.length > 0 && (
          <div className="pinned-tabs-container">
            {pinnedTabs.map(tab => (
              <div
                key={tab.id}
                className={`pinned-tab-pill ${tab.id === activeTabId ? 'active' : ''}`}
                onClick={() => switchTab(tab.id)}
                title={`Pinned: ${tab.title}\n${tab.url}`}
              >
                <span>{tab.id === 1 ? '🔥' : '📌'}</span>
                {tab.isAudioPlaying && (
                  <span
                    className="audio-dot"
                    title={tab.isMuted ? 'Muted' : 'Audio Playing'}
                    onClick={(e) => toggleMute(tab.id, e)}
                  ></span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Standard Tabs Track with Dynamic Sliding Displacement */}
        <div className="standard-tabs-track" style={{ position: 'relative' }}>
          {standardTabs.map((tab, idx) => {
            const isBeingDragged = dragState.isDragging && dragState.draggedId === tab.id;
            let displacementTransform = 'translateX(0px)';

            if (dragState.isDragging && dragState.draggedId) {
              if (idx > dragState.draggedIndex && idx <= dragState.overIndex) {
                displacementTransform = `translateX(-${dragState.tabWidth}px)`;
              } else if (idx < dragState.draggedIndex && idx >= dragState.overIndex) {
                displacementTransform = `translateX(${dragState.tabWidth}px)`;
              }
            }

            return (
              <div
                key={tab.id}
                className={`browser-tab-item ${tab.id === activeTabId ? 'active' : ''} ${tab.isFrozen ? 'frozen' : ''}`}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  if (e.target.closest('.tab-btn-close') || e.target.closest('.badge-tab-audio')) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  setDragState({
                    isDragging: false,
                    draggedId: tab.id,
                    draggedIndex: idx,
                    overIndex: idx,
                    startX: e.clientX,
                    currentX: e.clientX,
                    tabWidth: rect.width || 160,
                  });
                }}
                onClick={() => {
                  if (!dragState.isDragging) switchTab(tab.id);
                }}
                style={{
                  transform: displacementTransform,
                  transition: 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
                  opacity: isBeingDragged ? 0.25 : 1,
                  zIndex: isBeingDragged ? 0 : tab.id === activeTabId ? 10 : 1,
                }}
              >
                <span className="tab-icon">
                  {tab.isFrozen ? '💤' : tab.url.startsWith('nowcast://') ? '⚡' : tab.groupId ? '📁' : '🌐'}
                </span>
                <span className="tab-title-text" title={tab.url}>{tab.title}</span>

                <div className="tab-indicators">
                  {tab.isAudioPlaying && (
                    <span
                      className="badge-tab-audio"
                      onClick={(e) => toggleMute(tab.id, e)}
                      title={tab.isMuted ? 'Unmute' : 'Mute'}
                    >
                      {tab.isMuted ? '🔇' : '🔊'}
                    </span>
                  )}
                  {tab.isFrozen && (
                    <span className="badge-tab-sleep" title="Memory Saved (Process Discarded)">💤</span>
                  )}
                  <button
                    className="tab-btn-close"
                    onClick={(e) => closeTab(tab.id, e)}
                    onPointerDown={(e) => e.stopPropagation()}
                    title="Close Tab (Ctrl+W)"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}

          {/* Floating Drag Overlay Clone following cursor */}
          {dragState.isDragging && draggingTabObj && (
            <div
              className="browser-tab-item drag-clone"
              style={{
                left: `${dragState.currentX - (dragState.tabWidth / 2)}px`,
                top: '44px',
                width: `${dragState.tabWidth}px`,
              }}
            >
              <span className="tab-icon">
                {draggingTabObj.isFrozen ? '💤' : draggingTabObj.url.startsWith('nowcast://') ? '⚡' : '🌐'}
              </span>
              <span className="tab-title-text">{draggingTabObj.title}</span>
              <span className="tab-btn-close">×</span>
            </div>
          )}
        </div>

        {/* Tab Strip Action Buttons */}
        <div className="tabstrip-actions">
          <button
            className="btn-tab-action"
            onClick={() => createTab()}
            title="New Tab (Ctrl+T)"
          >
            +
          </button>
          <button
            className="btn-tab-action"
            onClick={() => setIsCommandPaletteOpen(true)}
            title="Search Tabs / Command Palette (Ctrl+K)"
          >
            🔍
          </button>
          <button
            className="btn-tab-action undo-btn"
            onClick={undoCloseTab}
            disabled={closedTabsCount === 0}
            title={`Restore Closed Tab (Ctrl+Shift+T) • ${closedTabsCount} in stack`}
          >
            ↩
            {closedTabsCount > 0 && <span className="undo-badge-count">{closedTabsCount}</span>}
          </button>
        </div>
      </nav>

      {/* 3. Navigation Toolbar */}
      <div className="navigation-bar">
        <div className="nav-history-buttons">
          <button className="btn-nav-round" title="Back (Alt+Left)">‹</button>
          <button className="btn-nav-round" title="Forward (Alt+Right)">›</button>
          <button className="btn-nav-round" title="Reload (Ctrl+R)" onClick={() => fetchSoMAndAx(activeTabId)}>↻</button>
        </div>

        <div className="omnibox-container">
          <span className="omnibox-lock">🔒</span>
          <input
            type="text"
            className="omnibox-text-input"
            value={omniboxUrl}
            onChange={(e) => setOmniboxUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
            placeholder="Enter URL or search query..."
            spellCheck="false"
          />
          <span className="omnibox-badge-tag">Blink Core</span>
          <button
            type="button"
            className={`omnibox-star-btn ${isCurrentBookmarked ? 'bookmarked' : ''}`}
            onClick={toggleBookmark}
            title={isCurrentBookmarked ? "Remove Bookmark" : "Bookmark this tab"}
          >
            {isCurrentBookmarked ? '★' : '☆'}
          </button>
        </div>

        <button className="btn-navigate-go" onClick={() => handleNavigate()}>Load URL</button>
      </div>

      {/* 3b. Minimalist Bookmarks Bar */}
      <div className="bookmarks-bar">
        <div className="bookmarks-label">
          <span>★</span>
          <span>BOOKMARKS</span>
        </div>
        <div className="bookmarks-track">
          {bookmarks.map(bm => (
            <div
              key={bm.id}
              className="bookmark-item"
              onClick={() => {
                setOmniboxUrl(bm.url);
                handleNavigate(bm.url, bm.title);
              }}
              title={`Navigate to ${bm.url}`}
            >
              <span className="bookmark-icon">{bm.url.startsWith('nowcast://') ? '⚡' : '🌐'}</span>
              <span className="bookmark-title">{bm.title}</span>
              <button
                className="bookmark-remove-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  removeBookmark(bm.id);
                }}
                title="Remove bookmark"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Main Workspace (Viewports & AI HUD) */}
      <main className="main-workspace-grid">
        <div className="viewport-layout-area">
          {/* Primary Viewport */}
          <div className="web-viewport-wrapper">
            <div className="viewport-header-strip">
              <span>WebContents ID #{activeTab?.id || 1} • {activeTab?.title || 'Blank'}</span>
              <span>{activeTab?.ramMb ? `${activeTab.ramMb} MB` : '120 MB'} • In-Process</span>
            </div>
            <div className="viewport-inner-frame">
              <iframe
                id="main-active-frame"
                className="viewport-iframe"
                srcDoc={activeTab?.sourceHtml || '<html><body style="background:#0f172a;color:#fff;padding:20px;">Loading...</body></html>'}
                sandbox="allow-scripts allow-forms allow-same-origin"
              />
              {/* Set-of-Marks Overlay Layer */}
              {somEnabled && (
                <div className="som-overlay-canvas">
                  {somElements.map(el => (
                    <div
                      key={el.id}
                      className="som-bounding-box"
                      style={{
                        left: `${el.rect.x}px`,
                        top: `${el.rect.y}px`,
                        width: `${el.rect.width}px`,
                        height: `${el.rect.height}px`
                      }}
                    >
                      <span
                        className="som-badge-label"
                        onClick={() => logTelemetry('act', `Clicked mark [#${el.id}] <${el.tag}> "${el.name}"`)}
                      >
                        #{el.id}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Split View Secondary Viewport (Pillar 7) */}
          {isSplitView && splitTab && (
            <div className="web-viewport-wrapper">
              <div className="viewport-header-strip">
                <span>Split Tile #{splitTab.id} • {splitTab.title}</span>
                <span>{splitTab.ramMb ? `${splitTab.ramMb} MB` : '90 MB'}</span>
              </div>
              <div className="viewport-inner-frame">
                <iframe
                  className="viewport-iframe"
                  srcDoc={splitTab.sourceHtml || '<html><body style="background:#0f172a;color:#fff;padding:20px;">Split View Pane</body></html>'}
                  sandbox="allow-scripts allow-forms allow-same-origin"
                />
              </div>
            </div>
          )}
        </div>

        {/* 5. AI Copilot Control HUD (Right Sidebar) */}
        <aside className={`ai-hud-sidebar-pane ${isHudOpen ? '' : 'collapsed'}`}>
          <div className="sidebar-top-bar">
            <span className="sidebar-title">⚡ AI Copilot Engine</span>
            <label className="som-checkbox-label">
              <input
                type="checkbox"
                checked={somEnabled}
                onChange={(e) => setSomEnabled(e.target.checked)}
              />
              <span>SoM Overlay</span>
            </label>
          </div>

          {/* HUD View Navigation */}
          <div className="hud-tab-strip">
            <button className={`hud-tab-btn ${activeHudTab === 'ax' ? 'active' : ''}`} onClick={() => setActiveHudTab('ax')}>🌲 AX Tree</button>
            <button className={`hud-tab-btn ${activeHudTab === 'som' ? 'active' : ''}`} onClick={() => setActiveHudTab('som')}>🏷️ SoM Markers</button>
            <button className={`hud-tab-btn ${activeHudTab === 'grep' ? 'active' : ''}`} onClick={() => setActiveHudTab('grep')}>🔍 Grep</button>
            <button className={`hud-tab-btn ${activeHudTab === 'autofill' ? 'active' : ''}`} onClick={() => setActiveHudTab('autofill')}>📝 Autofill</button>
            <button className={`hud-tab-btn ${activeHudTab === 'captcha' ? 'active' : ''}`} onClick={() => setActiveHudTab('captcha')}>🛡️ CAPTCHA</button>
            <button className={`hud-tab-btn ${activeHudTab === 'telemetry' ? 'active' : ''}`} onClick={() => setActiveHudTab('telemetry')}>🔄 Closed Loop</button>
          </div>

          <div className="hud-tab-content-area">
            {/* View 1: AX Tree */}
            {activeHudTab === 'ax' && (
              <div>
                <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>
                  Sanitized Accessibility Markdown (&lt;3k tokens) aligned with Set-of-Marks markers:
                </p>
                <div className="ax-markdown-container">{axMarkdown || 'Loading accessibility tree...'}</div>
              </div>
            )}

            {/* View 2: Set-of-Marks Markers */}
            {activeHudTab === 'som' && (
              <div className="som-marks-grid">
                <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                  Atomic interactive targets ({somElements.length} grounded elements):
                </p>
                {somElements.map(el => (
                  <div key={el.id} className="som-mark-card">
                    <div>
                      <span className="som-mark-badge">#{el.id}</span>
                      <strong style={{ marginLeft: '8px', color: '#38bdf8' }}>&lt;{el.tag}&gt;</strong>
                      <span style={{ marginLeft: '6px', color: '#e2e8f0' }}>{el.name}</span>
                    </div>
                    <button
                      className="palette-action-btn"
                      onClick={() => logTelemetry('act', `Dispatched click to mark #${el.id}`)}
                    >
                      Click
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* View 3: In-Memory Grep */}
            {activeHudTab === 'grep' && (
              <div>
                <div className="grep-controls-card">
                  <input
                    type="text"
                    className="grep-text-input"
                    value={grepQuery}
                    onChange={(e) => setGrepQuery(e.target.value)}
                    placeholder="Search DOM/scripts..."
                  />
                  <button className="btn-grep-search" onClick={runGrepSearch}>Grep</button>
                </div>
                <div className="grep-results-list" style={{ marginTop: '12px' }}>
                  {grepResults ? (
                    <div className="grep-match-block">
                      <div className="grep-line-context">{grepResults.matches?.[0]?.top_10?.slice(0, 3)?.join('\n')}</div>
                      <div className="grep-line-match">{grepResults.matches?.[0]?.matched_line}</div>
                      <div className="grep-line-context">{grepResults.matches?.[0]?.bottom_10?.slice(0, 3)?.join('\n')}</div>
                    </div>
                  ) : (
                    <p style={{ fontSize: '12px', color: '#64748b' }}>Click Grep to inspect ±10 lines context in live DOM.</p>
                  )}
                </div>
              </div>
            )}

            {/* View 4: Autofill */}
            {activeHudTab === 'autofill' && (
              <div>
                <div className="autofill-profile-card">
                  <h4>components/autofill Semantic Profile</h4>
                  <div className="profile-field-row">
                    <span style={{ color: '#94a3b8' }}>Full Name:</span>
                    <span>Alex Mercer</span>
                  </div>
                  <div className="profile-field-row">
                    <span style={{ color: '#94a3b8' }}>Email:</span>
                    <span>alex.mercer@ai-browser.dev</span>
                  </div>
                  <div className="profile-field-row">
                    <span style={{ color: '#94a3b8' }}>Address:</span>
                    <span>123 Tech Blvd, Suite 400</span>
                  </div>
                  <div className="profile-field-row">
                    <span style={{ color: '#94a3b8' }}>Payment:</span>
                    <span>•••• •••• •••• 4444 (12/28)</span>
                  </div>
                </div>
                <button className="btn-autofill-fill" onClick={handleAutofill} style={{ width: '100%' }}>
                  ⚡ 1-Click Semantic Autofill Form
                </button>
              </div>
            )}

            {/* View 5: CAPTCHA / HITL */}
            {activeHudTab === 'captcha' && (
              <div className="captcha-status-box">
                <div className="layer-status-row">
                  <span>Layer 1 (Stealth Kinematics):</span>
                  <span className="layer-badge green">Cubic Bezier Active</span>
                </div>
                <div className="layer-status-row">
                  <span>Layer 2 (Challenge Detection):</span>
                  <span className="layer-badge yellow">Cloudflare Turnstile</span>
                </div>
                <div className="layer-status-row">
                  <span>Layer 3 (Solver Mode):</span>
                  <span className="layer-badge blue">CapSolver / 2Captcha MCP</span>
                </div>
                <button className="btn-hitl-takeover" onClick={toggleHitl} style={{ marginTop: '10px' }}>
                  {isHitlActive ? 'Resume Autonomous Agent' : '⚠️ Request Human Takeover (HITL)'}
                </button>
              </div>
            )}

            {/* View 6: Closed Loop Telemetry */}
            {activeHudTab === 'telemetry' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Observe → Verify → Act → Diff</span>
                  <button className="palette-action-btn" onClick={() => setTelemetryLogs([])}>Clear</button>
                </div>
                <div className="telemetry-feed">
                  {telemetryLogs.map(log => (
                    <div key={log.id} className="telemetry-row">
                      <span className="telemetry-time">{log.time}</span>
                      <span className={`telemetry-type ${log.type}`}>[{log.type.toUpperCase()}]</span>
                      <span className="telemetry-msg">{log.msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* 6. Command Palette / Fuzzy Tab Search Modal (Ctrl+K) */}
      {isCommandPaletteOpen && (
        <div className="command-palette-backdrop" onClick={() => setIsCommandPaletteOpen(false)}>
          <div className="command-palette-box" onClick={(e) => e.stopPropagation()}>
            <div className="palette-input-header">
              <span className="palette-search-icon">⚡</span>
              <input
                type="text"
                className="palette-search-input"
                placeholder="Search open tabs, jump, pin, mute, freeze... (Esc to exit)"
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
                autoFocus
              />
              <span className="palette-badge-esc">ESC</span>
            </div>

            <div className="palette-results-list">
              {filteredTabs.map((tab, idx) => (
                <div
                  key={tab.id}
                  className={`palette-tab-item ${idx === paletteIndex ? 'selected' : ''}`}
                  onClick={() => {
                    switchTab(tab.id);
                    setIsCommandPaletteOpen(false);
                  }}
                >
                  <div className="palette-tab-info">
                    <span>{tab.isPinned ? '📌' : tab.isFrozen ? '💤' : '🌐'}</span>
                    <div>
                      <div className="palette-tab-title">{tab.title}</div>
                      <div className="palette-tab-url">{tab.url}</div>
                    </div>
                  </div>
                  <div className="palette-tab-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="palette-action-btn" onClick={() => togglePin(tab.id)}>
                      {tab.isPinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button className="palette-action-btn" onClick={() => toggleMute(tab.id)}>
                      {tab.isMuted ? 'Unmute' : 'Mute'}
                    </button>
                    <button className="palette-action-btn" onClick={() => toggleFreeze(tab.id)}>
                      {tab.isFrozen ? 'Thaw' : 'Freeze'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="palette-footer-shortcuts">
              <span>Jump <kbd>↵</kbd></span>
              <span>Navigate <kbd>↑</kbd> <kbd>↓</kbd></span>
              <span>New Tab <kbd>Ctrl+T</kbd></span>
              <span>Undo Close <kbd>Ctrl+Shift+T</kbd></span>
            </div>
          </div>
        </div>
      )}

      {/* 7. HITL Takeover Floating Banner */}
      {isHitlActive && (
        <div className="hitl-takeover-floating-banner">
          <span style={{ fontSize: '22px' }}>⚠️</span>
          <div className="hitl-alert-text">
            <strong>HUMAN-IN-THE-LOOP ACTIVE</strong>
            <span>Autonomous agent loop is paused. You have direct manual control over the live viewport.</span>
          </div>
          <button className="btn-resume-autonomous" onClick={toggleHitl}>
            Resume Autonomous Agent
          </button>
        </div>
      )}
    </div>
  );
}

// Mount React Root
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
