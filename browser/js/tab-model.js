/**
 * Modern Browser Tab Management System - Data Models
 * Encapsulates Tab, TabGroup, and TabHistoryStack structures.
 */

class Tab {
  constructor({
    id = 'tab_' + Math.random().toString(36).substring(2, 9),
    title = 'New Tab',
    url = 'about:blank',
    favicon = '🌐',
    isPinned = false,
    isMuted = false,
    isPlayingAudio = false,
    isSleeping = false,
    groupId = null,
    customContent = null
  } = {}) {
    this.id = id;
    this.title = title;
    this.url = url;
    this.favicon = favicon;
    this.isPinned = isPinned;
    this.isMuted = isMuted;
    this.isPlayingAudio = isPlayingAudio;
    this.isSleeping = isSleeping;
    this.groupId = groupId;
    this.lastAccessed = Date.now();
    this.memoryUsage = Math.floor(Math.random() * 45 + 15) + ' MB';
    this.customContent = customContent;
  }

  touch() {
    this.lastAccessed = Date.now();
    if (this.isSleeping) {
      this.isSleeping = false;
    }
  }

  clone() {
    return new Tab({
      title: this.title,
      url: this.url,
      favicon: this.favicon,
      isPinned: false,
      groupId: this.groupId,
      customContent: this.customContent
    });
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      url: this.url,
      favicon: this.favicon,
      isPinned: this.isPinned,
      isMuted: this.isMuted,
      isPlayingAudio: this.isPlayingAudio,
      isSleeping: this.isSleeping,
      groupId: this.groupId,
      lastAccessed: this.lastAccessed,
      memoryUsage: this.memoryUsage
    };
  }
}

class TabGroup {
  constructor({
    id = 'grp_' + Math.random().toString(36).substring(2, 9),
    name = 'Work',
    color = '#6366f1',
    isCollapsed = false
  } = {}) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.isCollapsed = isCollapsed;
  }
}

class TabHistoryStack {
  constructor(maxSize = 25) {
    this.maxSize = maxSize;
    this.stack = [];
  }

  push(tabState, index) {
    this.stack.push({
      tab: tabState,
      index: index,
      closedAt: Date.now()
    });
    if (this.stack.length > this.maxSize) {
      this.stack.shift();
    }
  }

  pop() {
    return this.stack.pop();
  }

  isEmpty() {
    return this.stack.length === 0;
  }

  size() {
    return this.stack.length;
  }
}

// Export to global scope for client-side modular script usage
window.Tab = Tab;
window.TabGroup = TabGroup;
window.TabHistoryStack = TabHistoryStack;
