/**
 * Modern Browser Tab Management System - Application Orchestrator
 * Binds UI components, handles global hotkeys, context menus,
 * search palette modal, and hover cards.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const tabStrip = document.getElementById('tabStrip');
  const viewport = document.getElementById('browserViewport');
  const tabCounter = document.getElementById('tabCounter');
  const omniboxInput = document.getElementById('omniboxInput');
  const btnNewTab = document.getElementById('btnNewTab');
  const btnSearchTabs = document.getElementById('btnSearchTabs');
  const contextMenu = document.getElementById('contextMenu');
  const tabSearchModal = document.getElementById('tabSearchModal');
  const paletteInput = document.getElementById('paletteInput');
  const paletteResults = document.getElementById('paletteResults');
  const tabHoverCard = document.getElementById('tabHoverCard');

  // Initialize Tab Manager
  const tabManager = new TabManager({
    tabsContainer: tabStrip,
    viewportContainer: viewport,
    counterElement: tabCounter
  });

  let contextMenuTargetTabId = null;
  let hoverCardTimeout = null;

  /* ================= Synchronize Omnibox with Active Tab ================= */
  tabManager.on('tabActivated', (tab) => {
    if (tab && omniboxInput) {
      omniboxInput.value = tab.url;
      document.title = `${tab.title} - Antigravity Browser`;
    }
  });

  // Omnibox submit
  omniboxInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const activeTab = tabManager.getActiveTab();
      if (!activeTab) return;

      let val = omniboxInput.value.trim();
      if (!val.startsWith('http://') && !val.startsWith('https://')) {
        if (val.includes('.') && !val.includes(' ')) {
          val = 'https://' + val;
        } else {
          val = 'https://www.google.com/search?q=' + encodeURIComponent(val);
        }
      }

      activeTab.url = val;
      activeTab.title = val.replace(/^https?:\/\//, '').split('/')[0];
      
      const tabEl = document.getElementById(activeTab.id);
      if (tabEl) {
        tabEl.querySelector('.tab-title').textContent = activeTab.title;
      }
      
      const paneEl = document.getElementById(`pane_${activeTab.id}`);
      if (paneEl) {
        paneEl.innerHTML = `
          <div class="page-container">
            <div class="page-header">
              <h1>${activeTab.title}</h1>
              <p>Navigated to <strong style="color: var(--accent-primary);">${activeTab.url}</strong></p>
            </div>
            <div class="feature-card" style="margin-top: 20px;">
              <div class="card-icon">🌐</div>
              <h3>Web Navigation Simulation</h3>
              <p>Requested URL: <code>${activeTab.url}</code></p>
              <p style="margin-top: 8px; color: var(--text-secondary);">Tab is running in high performance sandbox with complete state preservation.</p>
            </div>
          </div>
        `;
      }
      omniboxInput.blur();
    }
  });

  /* ================= New Tab Button ================= */
  btnNewTab.addEventListener('click', () => {
    tabManager.createTab({
      title: 'New Tab',
      url: 'https://browser.internal/newtab',
      favicon: '✨'
    });
  });

  /* ================= Tab Search / Command Palette ================= */
  function openSearchPalette() {
    tabSearchModal.classList.add('open');
    paletteInput.value = '';
    renderPaletteResults('');
    setTimeout(() => paletteInput.focus(), 50);
  }

  function closeSearchPalette() {
    tabSearchModal.classList.remove('open');
  }

  btnSearchTabs.addEventListener('click', openSearchPalette);

  tabSearchModal.addEventListener('click', (e) => {
    if (e.target === tabSearchModal) {
      closeSearchPalette();
    }
  });

  paletteInput.addEventListener('input', (e) => {
    renderPaletteResults(e.target.value);
  });

  function renderPaletteResults(query) {
    const matchedTabs = tabManager.searchTabs(query);
    paletteResults.innerHTML = '';

    if (matchedTabs.length === 0) {
      paletteResults.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">
          No matching open tabs found.
        </div>
      `;
      return;
    }

    matchedTabs.forEach((tab, idx) => {
      const item = document.createElement('div');
      item.className = `palette-item ${idx === 0 ? 'selected' : ''}`;
      item.innerHTML = `
        <div class="palette-item-icon">${tab.favicon}</div>
        <div class="palette-item-info">
          <div class="palette-item-title">${tab.title}</div>
          <div class="palette-item-url">${tab.url}</div>
        </div>
        <div class="palette-item-meta">
          ${tab.isPinned ? '<span class="palette-tag">Pinned</span>' : ''}
          ${tab.isPlayingAudio ? '<span class="palette-tag">Audio</span>' : ''}
          ${tab.isSleeping ? '<span class="palette-tag">Sleeping</span>' : ''}
        </div>
      `;
      item.addEventListener('click', () => {
        tabManager.activateTab(tab.id);
        closeSearchPalette();
      });
      paletteResults.appendChild(item);
    });
  }

  paletteInput.addEventListener('keydown', (e) => {
    const items = Array.from(paletteResults.querySelectorAll('.palette-item'));
    if (items.length === 0) return;

    let selectedIdx = items.findIndex(el => el.classList.contains('selected'));

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[selectedIdx]?.classList.remove('selected');
      selectedIdx = (selectedIdx + 1) % items.length;
      items[selectedIdx].classList.add('selected');
      items[selectedIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[selectedIdx]?.classList.remove('selected');
      selectedIdx = (selectedIdx - 1 + items.length) % items.length;
      items[selectedIdx].classList.add('selected');
      items[selectedIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[selectedIdx]) {
        items[selectedIdx].click();
      }
    } else if (e.key === 'Escape') {
      closeSearchPalette();
    }
  });

  /* ================= Right-Click Custom Context Menu ================= */
  document.addEventListener('contextmenu', (e) => {
    const tabEl = e.target.closest('.tab');
    if (tabEl) {
      e.preventDefault();
      contextMenuTargetTabId = tabEl.id;

      // Position context menu
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      contextMenu.style.left = `${Math.min(mouseX, window.innerWidth - 240)}px`;
      contextMenu.style.top = `${Math.min(mouseY, window.innerHeight - 300)}px`;
      contextMenu.classList.add('open');

      // Update Pin/Unpin label
      const targetTab = tabManager.getTab(contextMenuTargetTabId);
      const pinAction = document.getElementById('ctxPinTab');
      if (pinAction && targetTab) {
        pinAction.querySelector('span').textContent = targetTab.isPinned ? 'Unpin Tab' : 'Pin Tab';
      }
      return;
    }

    // Right click on tab strip empty area
    if (e.target.closest('.tab-strip-container')) {
      e.preventDefault();
      contextMenuTargetTabId = null;
      contextMenu.style.left = `${e.clientX}px`;
      contextMenu.style.top = `${e.clientY}px`;
      contextMenu.classList.add('open');
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-context-menu')) {
      contextMenu.classList.remove('open');
    }
  });

  // Context Menu Item Actions
  document.getElementById('ctxNewTab').addEventListener('click', () => {
    tabManager.createTab();
    contextMenu.classList.remove('open');
  });

  document.getElementById('ctxDuplicateTab').addEventListener('click', () => {
    if (contextMenuTargetTabId) {
      tabManager.duplicateTab(contextMenuTargetTabId);
    }
    contextMenu.classList.remove('open');
  });

  document.getElementById('ctxPinTab').addEventListener('click', () => {
    if (contextMenuTargetTabId) {
      tabManager.pinTab(contextMenuTargetTabId);
    }
    contextMenu.classList.remove('open');
  });

  document.getElementById('ctxMuteTab').addEventListener('click', () => {
    if (contextMenuTargetTabId) {
      tabManager.toggleMute(contextMenuTargetTabId);
    }
    contextMenu.classList.remove('open');
  });

  document.getElementById('ctxSleepTab').addEventListener('click', () => {
    if (contextMenuTargetTabId) {
      tabManager.discardTab(contextMenuTargetTabId);
    }
    contextMenu.classList.remove('open');
  });

  document.getElementById('ctxAddToGroup').addEventListener('click', () => {
    if (contextMenuTargetTabId) {
      const groupName = prompt('Enter Tab Group Name:', 'Research') || 'Work';
      const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      tabManager.createGroup(groupName, randomColor, [contextMenuTargetTabId]);
    }
    contextMenu.classList.remove('open');
  });

  document.getElementById('ctxCloseTab').addEventListener('click', () => {
    if (contextMenuTargetTabId) {
      tabManager.closeTab(contextMenuTargetTabId);
    }
    contextMenu.classList.remove('open');
  });

  document.getElementById('ctxCloseOthers').addEventListener('click', () => {
    if (contextMenuTargetTabId) {
      tabManager.closeOtherTabs(contextMenuTargetTabId);
    }
    contextMenu.classList.remove('open');
  });

  document.getElementById('ctxCloseRight').addEventListener('click', () => {
    if (contextMenuTargetTabId) {
      tabManager.closeTabsToRight(contextMenuTargetTabId);
    }
    contextMenu.classList.remove('open');
  });

  document.getElementById('ctxReopenClosed').addEventListener('click', () => {
    tabManager.reopenLastClosedTab();
    contextMenu.classList.remove('open');
  });

  /* ================= Tab Hover Cards (Tooltips) ================= */
  tabManager.on('tabHoverStart', ({ tab, element, event }) => {
    clearTimeout(hoverCardTimeout);
    hoverCardTimeout = setTimeout(() => {
      const rect = element.getBoundingClientRect();
      tabHoverCard.querySelector('.hover-card-title').textContent = `${tab.favicon} ${tab.title}`;
      tabHoverCard.querySelector('.hover-card-url').textContent = tab.url;
      
      const statsEl = tabHoverCard.querySelector('.hover-card-stats');
      const statusText = tab.isSleeping ? '💤 Sleeping (Hibernated)' : '🟢 Active in Memory';
      const statusClass = tab.isSleeping ? 'status-badge-sleep' : 'status-badge-active';
      
      statsEl.innerHTML = `
        <span class="${statusClass}">${statusText}</span>
        <span>${tab.memoryUsage}</span>
      `;

      tabHoverCard.style.left = `${Math.max(10, Math.min(rect.left, window.innerWidth - 280))}px`;
      tabHoverCard.style.top = `${rect.bottom + 8}px`;
      tabHoverCard.classList.add('visible');
    }, 280);
  });

  tabManager.on('tabHoverEnd', () => {
    clearTimeout(hoverCardTimeout);
    tabHoverCard.classList.remove('visible');
  });

  /* ================= Global Keyboard Shortcuts ================= */
  document.addEventListener('keydown', (e) => {
    // Check if user is typing in an input field
    const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

    // Ctrl+T or Cmd+T: New Tab
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't' && !e.shiftKey) {
      e.preventDefault();
      tabManager.createTab();
      return;
    }

    // Ctrl+W: Close Tab
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
      e.preventDefault();
      if (tabManager.activeTabId) {
        tabManager.closeTab(tabManager.activeTabId);
      }
      return;
    }

    // Ctrl+Shift+T: Reopen Closed Tab
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 't') {
      e.preventDefault();
      tabManager.reopenLastClosedTab();
      return;
    }

    // Ctrl+K or Ctrl+Shift+A: Tab Search
    if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || 
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a')) {
      e.preventDefault();
      openSearchPalette();
      return;
    }

    // Ctrl+Tab / Ctrl+Shift+Tab: Switch Tab
    if (e.ctrlKey && e.key === 'Tab') {
      e.preventDefault();
      const count = tabManager.tabs.length;
      if (count <= 1) return;

      const currentIdx = tabManager.getTabIndex(tabManager.activeTabId);
      let nextIdx;
      if (e.shiftKey) {
        nextIdx = (currentIdx - 1 + count) % count;
      } else {
        nextIdx = (currentIdx + 1) % count;
      }
      tabManager.activateTab(tabManager.tabs[nextIdx].id);
      return;
    }

    // Ctrl+1 through Ctrl+9: Direct tab access
    if ((e.ctrlKey || e.metaKey) && !isInput && !e.shiftKey && e.key >= '1' && e.key <= '9') {
      e.preventDefault();
      const num = parseInt(e.key, 10);
      if (num === 9) {
        // Jump to last tab
        if (tabManager.tabs.length > 0) {
          tabManager.activateTab(tabManager.tabs[tabManager.tabs.length - 1].id);
        }
      } else {
        const targetTab = tabManager.tabs[num - 1];
        if (targetTab) {
          tabManager.activateTab(targetTab.id);
        }
      }
      return;
    }
  });

  /* ================= Initialize Default Browser State ================= */
  // 1. Pinned Email Tab
  tabManager.createTab({
    title: 'Workspace Mail',
    url: 'https://mail.google.com',
    favicon: '📫',
    isPinned: true
  }, false);

  // 2. Active Tab - Google Search Engine
  tabManager.createTab({
    title: 'Google Search',
    url: 'https://www.google.com',
    favicon: '🔍'
  }, true);

  // 3. Tab with live audio playing (YouTube Music)
  const mediaTab = tabManager.createTab({
    title: 'Lo-Fi Chill Beats 24/7 - YouTube',
    url: 'https://youtube.com/watch?v=chill',
    favicon: '🎵',
    isPlayingAudio: true
  }, false);

  // 4. Tab Groups Demo (Development Group)
  const devTab1 = tabManager.createTab({
    title: 'MDN Web Docs - Tab Management',
    url: 'https://developer.mozilla.org/tabs',
    favicon: '📖'
  }, false);

  const devTab2 = tabManager.createTab({
    title: 'GitHub - Antigravity Core',
    url: 'https://github.com/browser/antigravity',
    favicon: '🐙'
  }, false);

  tabManager.createGroup('Dev', '#10b981', [devTab1.id, devTab2.id]);

  // 5. Sleeping tab to showcase Memory Saver
  const sleepTab = tabManager.createTab({
    title: 'Wikipedia - Browser History',
    url: 'https://en.wikipedia.org/wiki/Web_browser',
    favicon: '📚',
    isSleeping: true
  }, false);

});
