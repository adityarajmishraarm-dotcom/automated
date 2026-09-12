/**
 * Modern Browser Tab Management System - Core Engine
 * Manages full lifecycle, drag-and-drop, tab grouping, audio indicators,
 * memory saver hibernation, context actions, and event routing.
 */

class TabManager {
  constructor(options = {}) {
    this.tabsContainer = options.tabsContainer;
    this.viewportContainer = options.viewportContainer;
    this.counterElement = options.counterElement;

    this.tabs = [];
    this.groups = new Map(); // groupId -> TabGroup
    this.activeTabId = null;
    this.historyStack = new TabHistoryStack(30);
    this.listeners = new Map();

    this.draggedTabId = null;

    this.initDragAndDropContainer();
  }

  /* ================= Event Dispatcher ================= */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => cb(data));
    }
  }

  /* ================= Querying Tabs ================= */
  getTab(tabId) {
    return this.tabs.find(t => t.id === tabId);
  }

  getTabIndex(tabId) {
    return this.tabs.findIndex(t => t.id === tabId);
  }

  getActiveTab() {
    return this.getTab(this.activeTabId);
  }

  getTabsCount() {
    return this.tabs.length;
  }

  updateCounter() {
    if (this.counterElement) {
      this.counterElement.textContent = `${this.tabs.length} tabs`;
    }
  }

  /* ================= Tab Lifecycle ================= */
  createTab(options = {}, makeActive = true, insertIndex = -1) {
    const tab = new Tab(options);

    // If pinned, insert after existing pinned tabs
    if (tab.isPinned) {
      const lastPinnedIdx = this.tabs.reduce((acc, t, idx) => t.isPinned ? idx : acc, -1);
      this.tabs.splice(lastPinnedIdx + 1, 0, tab);
    } else if (insertIndex >= 0 && insertIndex <= this.tabs.length) {
      this.tabs.splice(insertIndex, 0, tab);
    } else {
      this.tabs.push(tab);
    }

    // Render Tab UI and Content Pane
    this.renderTabElement(tab);
    this.createViewportPane(tab);

    if (makeActive || this.tabs.length === 1) {
      this.activateTab(tab.id);
    }

    this.updateCounter();
    this.emit('tabCreated', tab);
    return tab;
  }

  activateTab(tabId) {
    const targetTab = this.getTab(tabId);
    if (!targetTab) return;

    if (this.activeTabId === tabId && !targetTab.isSleeping) {
      return;
    }

    // Wake tab if sleeping
    if (targetTab.isSleeping) {
      targetTab.touch();
      const tabEl = document.getElementById(targetTab.id);
      if (tabEl) tabEl.classList.remove('sleeping');
      this.emit('tabWoken', targetTab);
    } else {
      targetTab.touch();
    }

    // Update DOM Tab Elements
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    const targetEl = document.getElementById(targetTab.id);
    if (targetEl) {
      targetEl.classList.add('active');
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }

    // Update Viewport Pane
    document.querySelectorAll('.tab-webview-pane').forEach(el => el.classList.remove('active'));
    const targetPane = document.getElementById(`pane_${targetTab.id}`);
    if (targetPane) {
      targetPane.classList.add('active');
    }

    this.activeTabId = tabId;
    this.emit('tabActivated', targetTab);
  }

  closeTab(tabId, pushHistory = true) {
    const tabIndex = this.getTabIndex(tabId);
    if (tabIndex === -1) return;

    const tab = this.tabs[tabIndex];

    // Push to undo history stack
    if (pushHistory) {
      this.historyStack.push(tab.toJSON(), tabIndex);
    }

    // If closing active tab, decide next tab to activate
    if (this.activeTabId === tabId) {
      let nextTabId = null;
      if (this.tabs.length > 1) {
        if (tabIndex < this.tabs.length - 1) {
          nextTabId = this.tabs[tabIndex + 1].id;
        } else {
          nextTabId = this.tabs[tabIndex - 1].id;
        }
      }
      if (nextTabId) {
        this.activateTab(nextTabId);
      } else {
        this.activeTabId = null;
      }
    }

    // Remove from array
    this.tabs.splice(tabIndex, 0); // No-op, just reference
    this.tabs = this.tabs.filter(t => t.id !== tabId);

    // Remove group association if any
    if (tab.groupId && this.groups.has(tab.groupId)) {
      const group = this.groups.get(tab.groupId);
      // Remove group element if empty
      const remainingInGroup = this.tabs.filter(t => t.groupId === group.id);
      if (remainingInGroup.length === 0) {
        this.removeGroup(group.id);
      }
    }

    // Animate and remove DOM elements
    const tabEl = document.getElementById(tabId);
    if (tabEl) {
      tabEl.style.transition = 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)';
      tabEl.style.transform = 'scale(0.85)';
      tabEl.style.opacity = '0';
      tabEl.style.width = '0px';
      tabEl.style.minWidth = '0px';
      tabEl.style.padding = '0';
      tabEl.style.margin = '0';
      setTimeout(() => {
        if (tabEl.parentNode) tabEl.parentNode.removeChild(tabEl);
      }, 180);
    }

    const paneEl = document.getElementById(`pane_${tabId}`);
    if (paneEl && paneEl.parentNode) {
      paneEl.parentNode.removeChild(paneEl);
    }

    // If all tabs closed, create a default blank tab
    if (this.tabs.length === 0) {
      setTimeout(() => {
        this.createTab({ title: 'New Tab', url: 'https://browser.internal/home', favicon: '⚡' });
      }, 200);
    }

    this.updateCounter();
    this.emit('tabClosed', { tab, tabIndex });
  }

  duplicateTab(tabId) {
    const tab = this.getTab(tabId);
    if (!tab) return;

    const currentIdx = this.getTabIndex(tabId);
    const duplicated = tab.clone();
    return this.createTab(duplicated, true, currentIdx + 1);
  }

  reopenLastClosedTab() {
    if (this.historyStack.isEmpty()) {
      return null;
    }

    const record = this.historyStack.pop();
    const restoredTab = this.createTab(record.tab, true, record.index);
    this.emit('tabRestored', restoredTab);
    return restoredTab;
  }

  pinTab(tabId) {
    const tab = this.getTab(tabId);
    if (!tab) return;

    tab.isPinned = !tab.isPinned;
    const tabEl = document.getElementById(tabId);
    if (!tabEl) return;

    if (tab.isPinned) {
      tabEl.classList.add('pinned');
      // Move to after the last pinned tab
      const lastPinnedIdx = this.tabs.filter(t => t.isPinned && t.id !== tabId).length;
      this.tabsContainer.insertBefore(tabEl, this.tabsContainer.children[lastPinnedIdx] || null);
      
      // Update tabs array
      this.tabs = this.tabs.filter(t => t.id !== tabId);
      this.tabs.splice(lastPinnedIdx, 0, tab);
    } else {
      tabEl.classList.remove('pinned');
    }

    this.emit('tabPinToggled', tab);
  }

  toggleMute(tabId) {
    const tab = this.getTab(tabId);
    if (!tab) return;

    tab.isMuted = !tab.isMuted;
    const tabEl = document.getElementById(tabId);
    if (tabEl) {
      if (tab.isMuted) {
        tabEl.classList.add('muted');
      } else {
        tabEl.classList.remove('muted');
      }
      const icon = tabEl.querySelector('.tab-audio-btn span');
      if (icon) icon.textContent = tab.isMuted ? '🔇' : '🔊';
    }

    this.emit('tabMuteToggled', tab);
  }

  setAudioPlaying(tabId, isPlaying) {
    const tab = this.getTab(tabId);
    if (!tab) return;

    tab.isPlayingAudio = isPlaying;
    const tabEl = document.getElementById(tabId);
    if (tabEl) {
      if (isPlaying) {
        tabEl.classList.add('playing-audio');
      } else {
        tabEl.classList.remove('playing-audio');
      }
    }
    this.emit('tabAudioChanged', tab);
  }

  discardTab(tabId) {
    const tab = this.getTab(tabId);
    if (!tab || tab.id === this.activeTabId) return;

    tab.isSleeping = true;
    const tabEl = document.getElementById(tabId);
    if (tabEl) {
      tabEl.classList.add('sleeping');
    }
    this.emit('tabDiscarded', tab);
  }

  closeOtherTabs(tabId) {
    const tabsToClose = this.tabs.filter(t => t.id !== tabId && !t.isPinned);
    tabsToClose.forEach(t => this.closeTab(t.id, true));
  }

  closeTabsToRight(tabId) {
    const currentIdx = this.getTabIndex(tabId);
    if (currentIdx === -1) return;

    const tabsToClose = this.tabs.filter((t, idx) => idx > currentIdx && !t.isPinned);
    tabsToClose.forEach(t => this.closeTab(t.id, true));
  }

  /* ================= Tab Groups ================= */
  createGroup(name, color = '#6366f1', tabIds = []) {
    const group = new TabGroup({ name, color });
    this.groups.set(group.id, group);

    // Render group container if not exists
    let groupContainer = document.getElementById(`group_container_${group.id}`);
    if (!groupContainer) {
      groupContainer = document.createElement('div');
      groupContainer.id = `group_container_${group.id}`;
      groupContainer.className = 'tab-group-container';

      const header = document.createElement('div');
      header.className = 'tab-group-header';
      header.style.color = group.color;
      header.innerHTML = `
        <span class="group-color-dot" style="background-color: ${group.color};"></span>
        <span class="group-title">${group.name}</span>
      `;
      header.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleGroupCollapse(group.id);
      });

      const tabsList = document.createElement('div');
      tabsList.className = 'group-tabs-list';
      tabsList.id = `group_tabs_${group.id}`;

      groupContainer.appendChild(header);
      groupContainer.appendChild(tabsList);

      this.tabsContainer.appendChild(groupContainer);
    }

    // Attach specified tabs
    tabIds.forEach(id => {
      this.addTabToGroup(id, group.id);
    });

    this.emit('groupCreated', group);
    return group;
  }

  addTabToGroup(tabId, groupId) {
    const tab = this.getTab(tabId);
    const group = this.groups.get(groupId);
    if (!tab || !group) return;

    tab.groupId = groupId;
    const tabEl = document.getElementById(tabId);
    const groupTabsList = document.getElementById(`group_tabs_${groupId}`);

    if (tabEl && groupTabsList) {
      tabEl.style.borderColor = `${group.color}66`;
      groupTabsList.appendChild(tabEl);
    }
  }

  toggleGroupCollapse(groupId) {
    const group = this.groups.get(groupId);
    const groupEl = document.getElementById(`group_container_${groupId}`);
    if (!group || !groupEl) return;

    group.isCollapsed = !group.isCollapsed;
    if (group.isCollapsed) {
      groupEl.classList.add('collapsed');
      // If active tab was inside this collapsed group, activate the first tab outside or leave it
    } else {
      groupEl.classList.remove('collapsed');
    }
    this.emit('groupToggled', group);
  }

  removeGroup(groupId) {
    const groupEl = document.getElementById(`group_container_${groupId}`);
    if (groupEl) {
      // Move any tabs inside back to main container
      const groupTabsList = document.getElementById(`group_tabs_${groupId}`);
      if (groupTabsList) {
        while (groupTabsList.firstChild) {
          this.tabsContainer.appendChild(groupTabsList.firstChild);
        }
      }
      groupEl.remove();
    }
    this.groups.delete(groupId);
  }

  /* ================= DOM Element Rendering ================= */
  renderTabElement(tab) {
    const tabEl = document.createElement('div');
    tabEl.id = tab.id;
    tabEl.className = `tab ${tab.isPinned ? 'pinned' : ''} ${tab.isSleeping ? 'sleeping' : ''} ${tab.isPlayingAudio ? 'playing-audio' : ''} ${tab.isMuted ? 'muted' : ''}`;
    tabEl.setAttribute('draggable', 'true');

    tabEl.innerHTML = `
      <span class="tab-favicon">${tab.favicon}</span>
      <span class="tab-title" title="${tab.title}">${tab.title}</span>
      <span class="sleep-indicator" title="Tab sleeping to save memory">💤</span>
      <button class="tab-audio-btn" title="Toggle Tab Mute">
        <span>${tab.isMuted ? '🔇' : '🔊'}</span>
      </button>
      <button class="tab-close-btn" title="Close Tab (Ctrl+W)">✕</button>
    `;

    // Click to activate
    tabEl.addEventListener('click', (e) => {
      // Ignore if clicking buttons
      if (e.target.closest('.tab-close-btn') || e.target.closest('.tab-audio-btn')) {
        return;
      }
      this.activateTab(tab.id);
    });

    // Middle click to close tab
    tabEl.addEventListener('auxclick', (e) => {
      if (e.button === 1) { // Middle click
        e.preventDefault();
        this.closeTab(tab.id);
      }
    });

    // Audio Mute Button
    const audioBtn = tabEl.querySelector('.tab-audio-btn');
    if (audioBtn) {
      audioBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMute(tab.id);
      });
    }

    // Close Button
    const closeBtn = tabEl.querySelector('.tab-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeTab(tab.id);
      });
    }

    // Setup Drag-and-Drop
    this.setupTabDragAndDrop(tabEl, tab);

    // Setup Hover Card Trigger
    tabEl.addEventListener('mouseenter', (e) => {
      this.emit('tabHoverStart', { tab, element: tabEl, event: e });
    });
    tabEl.addEventListener('mouseleave', () => {
      this.emit('tabHoverEnd', { tab, element: tabEl });
    });

    // Add to container
    if (tab.groupId && this.groups.has(tab.groupId)) {
      const groupTabsList = document.getElementById(`group_tabs_${tab.groupId}`);
      if (groupTabsList) {
        groupTabsList.appendChild(tabEl);
        return;
      }
    }

    this.tabsContainer.appendChild(tabEl);
  }

  createViewportPane(tab) {
    if (!this.viewportContainer) return;

    const pane = document.createElement('div');
    pane.id = `pane_${tab.id}`;
    pane.className = 'tab-webview-pane';

    if (tab.customContent) {
      pane.innerHTML = tab.customContent;
    } else {
      pane.innerHTML = `
        <div class="page-container">
          <div class="page-header">
            <h1>${tab.title}</h1>
            <p>Navigated to <strong style="color: var(--accent-primary);">${tab.url}</strong></p>
          </div>
          <div class="feature-cards-grid">
            <div class="feature-card">
              <div class="card-icon">⚡</div>
              <h3>Ultra-Fast Browsing</h3>
              <p>Tab is rendered with high-performance isolated sandbox and instant memory caching.</p>
            </div>
            <div class="feature-card">
              <div class="card-icon">🛡️</div>
              <h3>Security & Isolation</h3>
              <p>Enhanced protection with cross-origin isolation and tracking prevention.</p>
            </div>
            <div class="feature-card">
              <div class="card-icon">🧠</div>
              <h3>Smart Memory Saver</h3>
              <p>Tab memory usage is currently <strong>${tab.memoryUsage}</strong>. Auto-hibernates after inactivity.</p>
            </div>
          </div>
        </div>
      `;
    }

    this.viewportContainer.appendChild(pane);
  }

  /* ================= Drag and Drop Reordering ================= */
  setupTabDragAndDrop(tabEl, tab) {
    tabEl.addEventListener('dragstart', (e) => {
      this.draggedTabId = tab.id;
      tabEl.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', tab.id);
    });

    tabEl.addEventListener('dragend', () => {
      tabEl.classList.remove('dragging');
      this.draggedTabId = null;
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('drag-over'));
    });

    tabEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    tabEl.addEventListener('drop', (e) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('text/plain') || this.draggedTabId;
      if (!draggedId || draggedId === tab.id) return;

      this.reorderTabs(draggedId, tab.id);
    });
  }

  initDragAndDropContainer() {
    if (!this.tabsContainer) return;

    this.tabsContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
  }

  reorderTabs(sourceTabId, targetTabId) {
    const srcIndex = this.getTabIndex(sourceTabId);
    const destIndex = this.getTabIndex(targetTabId);
    if (srcIndex === -1 || destIndex === -1) return;

    const [movedTab] = this.tabs.splice(srcIndex, 1);
    this.tabs.splice(destIndex, 0, movedTab);

    // Reorder in DOM
    const srcEl = document.getElementById(sourceTabId);
    const destEl = document.getElementById(targetTabId);
    if (srcEl && destEl) {
      if (srcIndex < destIndex) {
        destEl.parentNode.insertBefore(srcEl, destEl.nextSibling);
      } else {
        destEl.parentNode.insertBefore(srcEl, destEl);
      }
    }

    this.emit('tabsReordered', { sourceTabId, targetTabId, srcIndex, destIndex });
  }

  /* ================= Search / Filter ================= */
  searchTabs(query) {
    const q = query.trim().toLowerCase();
    if (!q) return this.tabs;

    return this.tabs.filter(t => 
      t.title.toLowerCase().includes(q) || 
      t.url.toLowerCase().includes(q)
    );
  }
}

// Export to window
window.TabManager = TabManager;
