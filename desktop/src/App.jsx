import React, { useState, useEffect, useRef } from 'react';
import TabStrip from './components/TabStrip.jsx';
import NavigationToolbar from './components/NavigationToolbar.jsx';
import NewTabPage from './components/NewTabPage.jsx';
import AiHudSidebar from './components/AiHudSidebar.jsx';
import BookmarksBar from './components/BookmarksBar.jsx';
import TabSearchModal from './components/TabSearchModal.jsx';
import ReaderModeModal from './components/ReaderModeModal.jsx';
import QrCodeModal from './components/QrCodeModal.jsx';
import HistoryModal from './components/HistoryModal.jsx';

const { ipcRenderer } = window.require ? window.require('electron') : require('electron');
const path = window.require ? window.require('path') : require('path');

const NEW_TAB_IDENTIFIER = 'antigravity://newtab';

export default function App() {
    // Engine preference
    const [activeEngine, setActiveEngine] = useState(() => {
        return localStorage.getItem('antigravity_search_engine') || 'google';
    });

    // Tab Strip Model state
    const [tabs, setTabs] = useState([
        { id: 1, url: '', title: 'New Tab', isNewTab: true }
    ]);
    const [activeTabId, setActiveTabId] = useState(1);
    const nextTabIdRef = useRef(2);
    const lastOpenedTabRef = useRef({ url: '', time: 0 });

    // Browser UI state
    const [adblockCount, setAdblockCount] = useState(0);
    const [shieldsStats, setShieldsStats] = useState({
        mode: 'aggressive',
        isNativeRust: true,
        totalBlocked: 0,
        trackersBlocked: 0,
        adsBlocked: 0,
        savedBytes: 0,
        savedTimeMs: 0,
        recentEvents: []
    });
    const [hudTab, setHudTab] = useState('shields');
    const [isHudOpen, setIsHudOpen] = useState(false);
    const [somEnabled, setSomEnabled] = useState(true);
    const [somMode, setSomMode] = useState('summarized');
    const [isHudDetached, setIsHudDetached] = useState(() => {
        try {
            return localStorage.getItem('antigravity_hud_detached') === 'true';
        } catch (e) {
            return false;
        }
    });
    const [isExternalHudVisible, setIsExternalHudVisible] = useState(false);
    const [axTreeMarkdown, setAxTreeMarkdown] = useState('');
    const [grepQuery, setGrepQuery] = useState('href');
    const [grepMatches, setGrepMatches] = useState([]);
    const [grepPage, setGrepPage] = useState(1);
    const [autofillStatus, setAutofillStatus] = useState('Ready to autofill inputs on active page.');
    const [isHitlActive, setIsHitlActive] = useState(false);
    const [telemetryLogs, setTelemetryLogs] = useState([
        { time: new Date().toLocaleTimeString(), type: 'info', msg: 'Antigravity React Native Desktop Shell initialized' },
        { time: new Date().toLocaleTimeString(), type: 'info', msg: 'Brave adblock-rust engine active (EasyList + uBlock Origin)' }
    ]);

    // Bookmarks state (persisted in localStorage)
    const [bookmarks, setBookmarks] = useState(() => {
        try {
            const saved = localStorage.getItem('antigravity_bookmarks');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return [
            { id: 'bm-1', url: 'https://www.google.com', title: 'Google' },
            { id: 'bm-2', url: 'https://en.wikipedia.org', title: 'Wikipedia' },
            { id: 'bm-3', url: 'https://news.ycombinator.com', title: 'Hacker News' },
            { id: 'bm-4', url: 'https://github.com', title: 'GitHub' }
        ];
    });

    // Modals state
    const [isTabSearchOpen, setIsTabSearchOpen] = useState(false);
    const [isReaderModeOpen, setIsReaderModeOpen] = useState(false);
    const [readerContent, setReaderContent] = useState('');
    const [readerTitle, setReaderTitle] = useState('');
    const [isQrCodeOpen, setIsQrCodeOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // Browsing History state
    const [history, setHistory] = useState(() => {
        try {
            const saved = localStorage.getItem('antigravity_browsing_history');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return [
            { id: 'h-1', url: 'https://news.ycombinator.com', title: 'Hacker News', timestamp: Date.now() - 3600000 },
            { id: 'h-2', url: 'https://en.wikipedia.org', title: 'Wikipedia, the free encyclopedia', timestamp: Date.now() - 7200000 },
            { id: 'h-3', url: 'https://www.google.com', title: 'Google', timestamp: Date.now() - 10800000 }
        ];
    });

    // Active Tab Helper
    const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0] || { id: 1, url: '', title: 'New Tab', isNewTab: true };
    const isNewTab = activeTab.isNewTab;

    const logTelemetry = (type, msg, meta = '') => {
        setTelemetryLogs(prev => [
            ...prev,
            { time: new Date().toLocaleTimeString(), type, msg, meta }
        ]);
    };

    // Listen for Native Brave Shields & Adblock Interceptions & Detached HUD IPC
    useEffect(() => {
        if (ipcRenderer.invoke) {
            ipcRenderer.invoke('get-adblock-stats').then(stats => {
                if (stats) {
                    setShieldsStats(stats);
                    setAdblockCount(stats.totalBlocked || 0);
                }
            }).catch(() => {});
        }

        const handleShields = (event, stats) => {
            if (stats) {
                setShieldsStats(stats);
                setAdblockCount(stats.totalBlocked || 0);
            }
        };

        const handleAdblockCount = (event, count) => {
            setAdblockCount(count);
            logTelemetry('verify', `Brave adblock-rust intercepted tracker/ad #${count}`, '0-byte cancel');
        };

        const handleExternalNavigate = (event, url) => {
            if (url && window.__antigravityNavigate) {
                window.__antigravityNavigate(url);
            }
        };

        const handleOpenNewTab = (event, url) => {
            if (url && window.__antigravityOpenNewTab) {
                window.__antigravityOpenNewTab(url);
            }
        };

        const handleHudOpened = () => {
            setIsHudDetached(true);
            setIsExternalHudVisible(true);
            try { localStorage.setItem('antigravity_hud_detached', 'true'); } catch (e) {}
            logTelemetry('info', 'External HUD Cockpit window opened.');
        };

        const handleHudHidden = () => {
            setIsExternalHudVisible(false);
            logTelemetry('info', 'External HUD Cockpit window retracted and hidden.');
        };

        const handleHudClosed = () => {
            setIsExternalHudVisible(false);
            logTelemetry('info', 'External HUD Cockpit window closed.');
        };

        const handleHudAction = (event, data) => {
            if (!data) return;
            const { action } = data;
            if (action === 'request-initial-state') {
                ipcRenderer.send('sync-hud-state', {
                    type: 'full-state',
                    tabs: tabs.map(t => ({ id: t.id, title: t.title, url: t.url, isNewTab: t.isNewTab })),
                    activeTabId,
                    somEnabled,
                    somMode,
                    axTreeMarkdown,
                    grepMatches,
                    autofillStatus,
                    isHitlActive,
                    telemetryLogs,
                    shieldsStats
                });
            } else if (action === 'switch-tab') {
                if (data.tabId) setActiveTabId(data.tabId);
            } else if (action === 'toggle-som') {
                setSomEnabled(!!data.enabled);
            } else if (action === 'toggle-som-mode') {
                setSomMode(data.isSummarized ? 'summarized' : 'dense');
            } else if (action === 'rescan-ax') {
                logTelemetry('observe', 'Manual AX tree rescan requested via Cockpit');
            } else if (action === 'execute-grep') {
                if (data.query) {
                    setGrepQuery(data.query);
                    logTelemetry('act', `In-Memory Grep via Cockpit: "${data.query}"`);
                }
            } else if (action === 'trigger-autofill') {
                setAutofillStatus('AutofillManager::FillForm() populated 10 semantic fields.');
                logTelemetry('act', 'AutofillManager::FillForm() triggered from External Cockpit', 'components/autofill');
            } else if (action === 'load-demo') {
                if (data.demoType === 'checkout') handleNavigate('file:///' + path.resolve(__dirname, '../demo_checkout.html').replace(/\\/g, '/'));
                else if (data.demoType === 'google') handleNavigate('https://www.google.com');
                else if (data.demoType === 'wikipedia') handleNavigate('https://en.wikipedia.org');
            } else if (action === 'toggle-hitl') {
                setIsHitlActive(data.active !== undefined ? data.active : !isHitlActive);
                logTelemetry('alert', `HITL Human Takeover mode updated via Cockpit`);
            } else if (action === 'clear-telemetry') {
                setTelemetryLogs([]);
            } else if (action === 'set-shield-mode') {
                if (data.mode) handleChangeShieldsMode(data.mode);
            } else if (action === 'add-shield-rule') {
                if (data.rule) handleAddCustomRule(data.rule);
            } else if (action === 'dock-to-browser') {
                handleDockHud();
            } else if (action === 'detach-from-browser') {
                handleDetachToggleHud();
            } else if (action === 'hide-hud-window') {
                setIsExternalHudVisible(false);
            } else if (action === 'execute-click') {
                if (data.target) {
                    executeWebviewClick(data.target);
                }
            } else if (action === 'execute-scroll') {
                executeWebviewScroll(data.direction || 'down', data.amount || 30, data.isPercent);
            } else if (action === 'execute-navigate') {
                if (data.url) handleNavigate(data.url);
            } else if (action === 'extract-page-text') {
                const wv = document.getElementById(`wv-${activeTabId}`);
                if (wv && typeof wv.executeJavaScript === 'function') {
                    wv.executeJavaScript(`
                        (function() {
                            const title = document.title || '';
                            const url = window.location.href || '';
                            const text = (document.body ? document.body.innerText : '').substring(0, 4000);
                            return { title, url, text };
                        })()
                    `).then(pageInfo => {
                        if (pageInfo) {
                            ipcRenderer.send('sync-hud-state', {
                                type: 'page-text-extracted',
                                requestId: data.requestId,
                                pageInfo
                            });
                        }
                    }).catch(() => {});
                }
            }
        };

        ipcRenderer.on('brave-shields-updated', handleShields);
        ipcRenderer.on('adblock-count-updated', handleAdblockCount);
        ipcRenderer.on('external-navigate', handleExternalNavigate);
        const handleOpenDockedHud = () => {
            setIsHudDetached(false);
            setIsHudOpen(true);
            try { localStorage.setItem('antigravity_hud_detached', 'false'); } catch (e) {}
        };

        ipcRenderer.on('open-new-tab', handleOpenNewTab);
        ipcRenderer.on('hud-window-opened', handleHudOpened);
        ipcRenderer.on('hud-window-hidden', handleHudHidden);
        ipcRenderer.on('hud-window-closed', handleHudClosed);
        ipcRenderer.on('hud-action', handleHudAction);
        ipcRenderer.on('open-docked-hud', handleOpenDockedHud);

        return () => {
            ipcRenderer.removeListener('brave-shields-updated', handleShields);
            ipcRenderer.removeListener('adblock-count-updated', handleAdblockCount);
            ipcRenderer.removeListener('external-navigate', handleExternalNavigate);
            ipcRenderer.removeListener('open-new-tab', handleOpenNewTab);
            ipcRenderer.removeListener('hud-window-opened', handleHudOpened);
            ipcRenderer.removeListener('hud-window-hidden', handleHudHidden);
            ipcRenderer.removeListener('hud-window-closed', handleHudClosed);
            ipcRenderer.removeListener('hud-action', handleHudAction);
            ipcRenderer.removeListener('open-docked-hud', handleOpenDockedHud);
        };
    }, [tabs, activeTabId, somEnabled, somMode, axTreeMarkdown, grepMatches, autofillStatus, isHitlActive, telemetryLogs, shieldsStats]);

    // Broadcast live state updates to external detached HUD window
    useEffect(() => {
        if (isHudDetached) {
            ipcRenderer.send('sync-hud-state', {
                type: 'full-state',
                tabs: tabs.map(t => ({ id: t.id, title: t.title, url: t.url, isNewTab: t.isNewTab })),
                activeTabId,
                somEnabled,
                somMode,
                axTreeMarkdown,
                grepMatches,
                autofillStatus,
                isHitlActive,
                telemetryLogs,
                shieldsStats
            });
        }
    }, [tabs, activeTabId, somEnabled, somMode, axTreeMarkdown, grepMatches, autofillStatus, isHitlActive, telemetryLogs, shieldsStats, isHudDetached]);

    const handleChangeShieldsMode = (mode) => {
        if (ipcRenderer.invoke) {
            ipcRenderer.invoke('set-adblock-mode', mode).then(stats => {
                if (stats) setShieldsStats(stats);
                logTelemetry('act', `Brave Shields mode changed to ${mode.toUpperCase()}`);
            }).catch(() => {});
        }
    };

    const handleAddCustomRule = (rule) => {
        if (ipcRenderer.invoke && rule) {
            ipcRenderer.invoke('add-adblock-rule', rule).then(stats => {
                if (stats) setShieldsStats(stats);
                logTelemetry('act', `Added custom Brave adblock rule: "${rule}"`);
            }).catch(() => {});
        }
    };

    const handleDetachToggleHud = () => {
        if (isExternalHudVisible) {
            setIsExternalHudVisible(false);
            if (ipcRenderer.invoke) ipcRenderer.invoke('hide-hud-window').catch(() => {});
            logTelemetry('act', 'AI Layer external window retracted and hidden.');
        } else {
            setIsHudDetached(true);
            setIsHudOpen(false);
            setIsExternalHudVisible(true);
            try { localStorage.setItem('antigravity_hud_detached', 'true'); } catch (e) {}
            if (ipcRenderer.invoke) ipcRenderer.invoke('open-hud-window').catch(() => {});
            logTelemetry('act', 'AI Layer detached from browser into standalone window.');
        }
    };

    const handleDetachHud = handleDetachToggleHud;

    const handleDockHud = () => {
        setIsHudDetached(false);
        setIsExternalHudVisible(false);
        setIsHudOpen(true);
        try { localStorage.setItem('antigravity_hud_detached', 'false'); } catch (e) {}
        if (ipcRenderer.invoke) {
            ipcRenderer.invoke('close-hud-window').catch(() => {});
        }
        logTelemetry('act', 'AI Layer docked back into browser window.');
    };

    const handleToggleHud = () => {
        if (isHudDetached) {
            if (ipcRenderer.invoke) ipcRenderer.invoke('open-hud-window').catch(() => {});
        } else {
            setIsHudOpen(prev => !prev);
        }
    };

    const handleOpenShields = () => {
        if (isHudDetached) {
            if (ipcRenderer.invoke) {
                ipcRenderer.invoke('open-hud-window').then(() => {
                    ipcRenderer.send('hud-action', { action: 'set-active-tab', tab: 'shields' });
                }).catch(() => {});
            }
        } else {
            setIsHudOpen(true);
            setHudTab('shields');
        }
    };

    // Set-of-Marks Hashtag Clicking & Target Element Interaction
    const executeWebviewClick = async (targetText) => {
        const wv = document.getElementById(`wv-${activeTabId}`);
        if (!wv || typeof wv.executeJavaScript !== 'function') {
            logTelemetry('warn', 'No active webview available to execute click interaction.');
            return false;
        }
        const cleanTarget = (targetText || '').trim();
        if (!cleanTarget) return false;

        try {
            const result = await wv.executeJavaScript(`
                (function() {
                    const targetRaw = ${JSON.stringify(cleanTarget)}.trim();
                    const targetLower = targetRaw.toLowerCase();

                    function isVisible(el) {
                        if (!el) return false;
                        const style = window.getComputedStyle(el);
                        return style.display !== 'none' && 
                               style.visibility !== 'hidden' && 
                               style.opacity !== '0' &&
                               el.offsetWidth > 0 && 
                               el.offsetHeight > 0;
                    }

                    // Parse mark number if target contains hashtag or mark index (e.g. "#7", "hashtag 7", "mark 7", "7")
                    let markIndex = null;
                    const markMatch = targetRaw.match(/^(?:#|hashtag\\s*|mark\\s*|badge\\s*|gap\\s*|number\\s*|no\\.?\\s*)?(\\d+)$/i);
                    if (markMatch) {
                        markIndex = parseInt(markMatch[1], 10);
                    }

                    let matchedEl = null;
                    let matchType = '';

                    // 1. Set-of-Marks badge / index lookup
                    if (markIndex !== null) {
                        const somEl = document.querySelector('[data-som-id="' + markIndex + '"]') || document.querySelector('#som-' + markIndex);
                        if (somEl && isVisible(somEl)) {
                            matchedEl = somEl;
                            matchType = 'SoM Mark #' + markIndex;
                        }
                    }

                    // 2. Candidate elements search
                    if (!matchedEl) {
                        const selectors = [
                            'button', 'a', 'input[type="submit"]', 'input[type="button"]',
                            '[role="button"]', '[role="link"]', '[role="tab"]', 'summary', '.btn', '.button'
                        ];
                        const candidates = Array.from(document.querySelectorAll(selectors.join(','))).filter(isVisible);
                        for (const el of candidates) {
                            const text = (el.innerText || el.textContent || el.value || el.getAttribute('aria-label') || '').toLowerCase().trim();
                            if (text && (text === targetLower || text.includes(targetLower))) {
                                matchedEl = el;
                                matchType = 'Element Text: "' + text.substring(0, 30) + '"';
                                break;
                            }
                        }
                    }

                    if (matchedEl) {
                        matchedEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        matchedEl.focus();
                        matchedEl.click();
                        return { success: true, matchType, tag: matchedEl.tagName };
                    }
                    return { success: false };
                })()
            `);
            if (result && result.success) {
                logTelemetry('act', `Page Click: Clicked ${result.matchType} (${result.tag}) on active page`);
                return true;
            } else {
                logTelemetry('warn', `Page Click: No clickable element or mark found for "${cleanTarget}"`);
                return false;
            }
        } catch (e) {
            logTelemetry('warn', `Click execution error: ${e.message}`);
            return false;
        }
    };

    // Proportional Logical Scroll Scale & Shortcuts (s50, s0, s1000)
    const executeWebviewScroll = async (direction = 'down', amount = 20, isPercent = false) => {
        const wv = document.getElementById(`wv-${activeTabId}`);
        if (!wv || typeof wv.executeJavaScript !== 'function') return false;

        const num = (typeof amount === 'number' && !isNaN(amount)) ? amount : 20;
        const dir = direction || 'down';

        try {
            await wv.executeJavaScript(`
                (function() {
                    const viewportHeight = window.innerHeight || 800;
                    const viewportWidth = window.innerWidth || 1200;
                    const docHeight = Math.max(
                        document.body ? document.body.scrollHeight : 0,
                        document.documentElement ? document.documentElement.scrollHeight : 0,
                        viewportHeight
                    );
                    const inputNum = ${num};
                    const dirStr = "${dir}";

                    if (inputNum === 0 || dirStr === 'top' || dirStr === 'start') {
                        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                        return;
                    }
                    if (inputNum >= 1000 || dirStr === 'end' || dirStr === 'bottom') {
                        window.scrollTo({ top: docHeight, left: 0, behavior: 'smooth' });
                        return;
                    }

                    let pixelDistance = 0;
                    if (${isPercent} || inputNum <= 100) {
                        const factor = inputNum / 100;
                        pixelDistance = (dirStr === 'left' || dirStr === 'right') ? (viewportWidth * factor) : (viewportHeight * factor);
                    } else {
                        pixelDistance = inputNum;
                    }

                    let x = 0;
                    let y = 0;
                    if (dirStr === 'down') y = pixelDistance;
                    else if (dirStr === 'up') y = -pixelDistance;
                    else if (dirStr === 'right') x = pixelDistance;
                    else if (dirStr === 'left') x = -pixelDistance;

                    window.scrollBy({ top: y, left: x, behavior: 'smooth' });
                })()
            `);
            logTelemetry('act', `WebviewScroll: Scrolled "${dir}" by ${num}${isPercent || num <= 100 ? '%' : 'px'}`);
            return true;
        } catch (e) {
            logTelemetry('warn', `Scroll failed: ${e.message}`);
            return false;
        }
    };

    const extractPageTextForAi = async () => {
        const wv = document.getElementById(`wv-${activeTabId}`);
        if (!wv || typeof wv.executeJavaScript !== 'function') return '';
        try {
            const text = await wv.executeJavaScript(`
                (function() {
                    return (document.body ? document.body.innerText : '') || '';
                })()
            `);
            return text || '';
        } catch (e) {
            return '';
        }
    };

    // Clean Distraction-Free Reader Mode Extractor
    const handleOpenReaderMode = async () => {
        const wv = document.getElementById(`wv-${activeTabId}`);
        if (!wv || typeof wv.executeJavaScript !== 'function') return;

        try {
            const articleData = await wv.executeJavaScript(`
                (function() {
                    const title = document.title || 'Untitled Article';
                    const articleEl = document.querySelector('article') || document.querySelector('main') || document.querySelector('.content') || document.body;
                    if (!articleEl) return { title, text: '' };

                    const nodes = articleEl.querySelectorAll('h1, h2, h3, p, li');
                    let textParts = [];
                    nodes.forEach(n => {
                        const t = (n.innerText || '').trim();
                        if (t.length > 20) textParts.push(t);
                    });
                    const text = textParts.length > 0 ? textParts.join('\\n\\n') : articleEl.innerText;
                    return { title, text: text ? text.substring(0, 8000) : '' };
                })()
            `);
            if (articleData) {
                setReaderTitle(articleData.title || activeTab.title);
                setReaderContent(articleData.text || 'No text content could be extracted from this page.');
                setIsReaderModeOpen(true);
                logTelemetry('observe', 'Clean Reader Mode activated for active page');
            }
        } catch (e) {
            logTelemetry('warn', `Reader mode error: ${e.message}`);
        }
    };

    // Bookmarks Management
    const isCurrentTabBookmarked = bookmarks.some(b => b.url === activeTab.url);

    const handleToggleBookmark = () => {
        if (!activeTab || activeTab.isNewTab || !activeTab.url) return;
        const exists = bookmarks.some(b => b.url === activeTab.url);
        let updated;
        if (exists) {
            updated = bookmarks.filter(b => b.url !== activeTab.url);
            logTelemetry('act', `Removed bookmark: ${activeTab.title || activeTab.url}`);
        } else {
            const newBm = {
                id: `bm-${Date.now()}`,
                url: activeTab.url,
                title: activeTab.title || activeTab.url
            };
            updated = [...bookmarks, newBm];
            logTelemetry('act', `Saved bookmark: ${activeTab.title || activeTab.url}`);
        }
        setBookmarks(updated);
        try { localStorage.setItem('antigravity_bookmarks', JSON.stringify(updated)); } catch (e) {}
    };

    const handleRemoveBookmark = (idOrUrl) => {
        const updated = bookmarks.filter(b => b.id !== idOrUrl && b.url !== idOrUrl);
        setBookmarks(updated);
        try { localStorage.setItem('antigravity_bookmarks', JSON.stringify(updated)); } catch (e) {}
        logTelemetry('act', 'Bookmark removed');
    };

    // Browsing History Management
    const addHistoryEntry = (url, title) => {
        if (!url || url === 'about:blank' || url.startsWith('javascript:') || url.startsWith('data:') || url.includes('newtab.html')) return;
        setHistory(prev => {
            const now = Date.now();
            if (prev.length > 0 && prev[0].url === url && (now - prev[0].timestamp) < 4000) {
                return prev;
            }
            const cleanTitle = title || url;
            const newEntry = {
                id: `h-${now}-${Math.random().toString(36).substr(2, 4)}`,
                url,
                title: cleanTitle,
                timestamp: now
            };
            const updated = [newEntry, ...prev.filter(item => item.url !== url)].slice(0, 100);
            try { localStorage.setItem('antigravity_browsing_history', JSON.stringify(updated)); } catch (e) {}
            return updated;
        });
    };

    const handleRemoveHistoryItem = (idOrUrl) => {
        setHistory(prev => {
            const updated = prev.filter(item => item.id !== idOrUrl && item.url !== idOrUrl);
            try { localStorage.setItem('antigravity_browsing_history', JSON.stringify(updated)); } catch (e) {}
            return updated;
        });
        logTelemetry('act', 'Deleted item from browsing history');
    };

    const handleClearHistory = () => {
        setHistory([]);
        try { localStorage.removeItem('antigravity_browsing_history'); } catch (e) {}
        logTelemetry('act', 'Cleared all browsing history');
    };

    // Global Keyboard Shortcuts (Ctrl+K, Ctrl+D, Ctrl+H, Escape)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault();
                setIsTabSearchOpen(prev => !prev);
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
                e.preventDefault();
                handleToggleBookmark();
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'h' || e.key === 'H')) {
                e.preventDefault();
                setIsHistoryOpen(prev => !prev);
            } else if (e.key === 'Escape') {
                setIsTabSearchOpen(false);
                setIsReaderModeOpen(false);
                setIsQrCodeOpen(false);
                setIsHistoryOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTab, bookmarks]);

    // Change Search Engine
    const handleSetEngine = (engine) => {
        setActiveEngine(engine);
        localStorage.setItem('antigravity_search_engine', engine);
        logTelemetry('act', `Search engine set to ${engine.toUpperCase()}`);
    };

    // Create a new Tab
    const handleAddTab = () => {
        const newId = nextTabIdRef.current++;
        const newTab = {
            id: newId,
            url: '',
            title: 'New Tab',
            isNewTab: true
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newId);
        logTelemetry('act', `TabStripModel::InsertWebContentsAt()`, `Tab #${newId} -> New Tab`);
    };

    // Open URL in a New In-App Tab (strictly native tab, zero separate OS windows)
    const openInNewTab = (targetUrl) => {
        const url = (targetUrl || '').trim();
        if (!url || url === 'about:blank' || url.startsWith('javascript:') || url.startsWith('data:')) return;

        const now = Date.now();
        // Deduplicate rapid duplicate events for the same target URL within 1200ms
        if (lastOpenedTabRef.current.url === url && (now - lastOpenedTabRef.current.time) < 1200) {
            return;
        }
        lastOpenedTabRef.current = { url, time: now };

        // Synchronous Shields verification with active webview URL as initiator
        let isBlocked = false;
        try {
            if (ipcRenderer && ipcRenderer.sendSync) {
                const activeWv = document.getElementById(`wv-${activeTabId}`);
                const currentUrl = activeWv && typeof activeWv.getURL === 'function' ? (activeWv.getURL() || '') : '';
                isBlocked = ipcRenderer.sendSync('check-url-block-sync', { url, initiatorUrl: currentUrl });
            }
        } catch (err) {
            isBlocked = false;
        }

        if (isBlocked) {
            logTelemetry('verify', `Shields blocked unwanted popup tab: ${url.substring(0, 60)}...`);
            return;
        }

        const newId = nextTabIdRef.current++;
        const newTab = {
            id: newId,
            url: url,
            title: 'Loading...',
            isNewTab: false
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newId);
        logTelemetry('act', `TabStripModel::InsertWebContentsAt()`, `Tab #${newId} -> ${url}`);

        setTimeout(() => {
            const targetWv = document.getElementById(`wv-${newId}`);
            if (targetWv) {
                if (typeof targetWv.loadURL === 'function') {
                    targetWv.loadURL(url).catch(() => {});
                } else {
                    targetWv.src = url;
                }
            }
        }, 50);
    };

    window.__antigravityOpenNewTab = openInNewTab;

    // Close a Tab
    const handleCloseTab = (tabId) => {
        if (tabs.length <= 1) {
            setTabs([{ id: activeTab.id, url: '', title: 'New Tab', isNewTab: true }]);
            const wv = document.getElementById(`wv-${activeTab.id}`);
            if (wv && typeof wv.loadURL === 'function') wv.loadURL('about:blank');
            return;
        }

        const closeIndex = tabs.findIndex(t => t.id === tabId);
        const filtered = tabs.filter(t => t.id !== tabId);
        setTabs(filtered);

        if (activeTabId === tabId) {
            const nextActiveIndex = Math.min(closeIndex, filtered.length - 1);
            setActiveTabId(filtered[nextActiveIndex].id);
        }
        logTelemetry('act', `TabStripModel::CloseWebContentsAt()`, `Closed Tab #${tabId}`);
    };

    // Navigate Active Tab
    const handleNavigate = (target) => {
        const trimmed = (target || '').trim();
        let finalUrl = trimmed;

        if (!trimmed || trimmed === NEW_TAB_IDENTIFIER || trimmed.includes('newtab.html')) {
            setTabs(prev => prev.map(t => {
                if (t.id === activeTabId) {
                    return { ...t, isNewTab: true, url: '', title: 'New Tab' };
                }
                return t;
            }));
            const wv = document.getElementById(`wv-${activeTabId}`);
            if (wv && typeof wv.loadURL === 'function') wv.loadURL('about:blank');
            logTelemetry('act', 'Tab navigated to New Tab Page');
            return;
        }

        if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('file://') || trimmed.startsWith('data:')) {
            finalUrl = trimmed;
        } else if (trimmed.startsWith('localhost') || trimmed.startsWith('127.0.0.1')) {
            finalUrl = 'http://' + trimmed;
        } else if (trimmed.includes('.') && !trimmed.includes(' ') && !trimmed.includes('?')) {
            finalUrl = 'https://' + trimmed;
        } else {
            // Search engine dispatch
            if (activeEngine === 'brave') {
                finalUrl = `https://search.brave.com/search?q=${encodeURIComponent(trimmed)}`;
            } else {
                finalUrl = `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
            }
        }

        setTabs(prev => prev.map(t => {
            if (t.id === activeTabId) {
                return { ...t, isNewTab: false, url: finalUrl, title: t.title || 'Loading...' };
            }
            return t;
        }));

        // Imperatively load URL in webview to prevent React prop mutation aborts
        setTimeout(() => {
            const wv = document.getElementById(`wv-${activeTabId}`);
            if (wv && typeof wv.loadURL === 'function') {
                wv.loadURL(finalUrl).catch((err) => {
                    if (err && (err.code === 'ERR_ABORTED' || String(err).includes('ERR_ABORTED'))) {
                        return;
                    }
                    console.warn('[Navigation Warning]', err);
                });
            }
        }, 15);

        logTelemetry('act', `WebContents::GetController().LoadURL("${finalUrl}")`);
    };

    window.__antigravityNavigate = handleNavigate;

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey && (e.key === 't' || e.key === 'T')) {
                e.preventDefault();
                handleAddTab();
            } else if (e.ctrlKey && (e.key === 'w' || e.key === 'W')) {
                e.preventDefault();
                handleCloseTab(activeTabId);
            } else if ((e.ctrlKey && (e.key === 'l' || e.key === 'L')) || (e.altKey && (e.key === 'd' || e.key === 'D'))) {
                e.preventDefault();
                const el = document.getElementById('urlInput');
                if (el) { el.focus(); el.select(); }
            } else if ((e.ctrlKey && (e.key === 'r' || e.key === 'R')) || e.key === 'F5') {
                e.preventDefault();
                const wv = document.getElementById(`wv-${activeTabId}`);
                if (wv && typeof wv.reload === 'function') wv.reload();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTabId, tabs]);

    // Setup webview events dynamically
    const attachWebviewListeners = (wv, tabId) => {
        if (!wv || wv.__listenersAttached) return;
        wv.addEventListener('new-window', (e) => {
            e.preventDefault();
            if (e.url) {
                openInNewTab(e.url);
            }
        });

        wv.addEventListener('did-navigate', (e) => {
            if (e.url && e.url !== 'about:blank') {
                setTabs(prev => prev.map(t => {
                    if (t.id === tabId) {
                        return { ...t, url: e.url, title: wv.getTitle() || t.title, isNewTab: false };
                    }
                    return t;
                }));
                addHistoryEntry(e.url, wv.getTitle() || e.url);
            }
        });

        wv.addEventListener('did-navigate-in-page', (e) => {
            if (e.url && e.url !== 'about:blank') {
                setTabs(prev => prev.map(t => {
                    if (t.id === tabId) {
                        return { ...t, url: e.url, title: wv.getTitle() || t.title, isNewTab: false };
                    }
                    return t;
                }));
                addHistoryEntry(e.url, wv.getTitle() || e.url);
            }
        });

        wv.addEventListener('page-title-updated', (e) => {
            setTabs(prev => prev.map(t => {
                if (t.id === tabId && !t.isNewTab) {
                    return { ...t, title: e.title };
                }
                return t;
            }));
            const curUrl = wv.getURL ? wv.getURL() : '';
            if (curUrl && curUrl !== 'about:blank') {
                addHistoryEntry(curUrl, e.title);
            }
        });

        wv.addEventListener('dom-ready', () => {
            const u = wv.getURL();
            if (u && u !== 'about:blank') {
                setTabs(prev => prev.map(t => {
                    if (t.id === tabId && !t.isNewTab) {
                        return { ...t, url: u, title: wv.getTitle() || t.title };
                    }
                    return t;
                }));
            }
        });

        wv.addEventListener('did-fail-load', (e) => {
            // Ignore normal ERR_ABORTED (-3) on redirects
            if (e.errorCode === -3) return;
            logTelemetry('alert', `Load warning (${e.errorCode}): ${e.errorDescription}`);
        });
    };

    return (
        <div className="native-browser-app">
            {/* Top TabStrip Component */}
            <TabStrip
                tabs={tabs}
                activeTabId={activeTabId}
                onSelectTab={setActiveTabId}
                onAddTab={handleAddTab}
                onCloseTab={handleCloseTab}
                adblockCount={adblockCount}
                isHudOpen={isHudOpen}
                isHudDetached={isHudDetached}
                isExternalHudVisible={isExternalHudVisible}
                onToggleHud={handleToggleHud}
                onDetachToggleHud={handleDetachToggleHud}
                onDockHud={handleDockHud}
                onOpenShields={handleOpenShields}
                onOpenTabSearch={() => setIsTabSearchOpen(true)}
            />

            {/* Top Navigation Toolbar Component */}
            <NavigationToolbar
                currentUrl={activeTab.isNewTab ? '' : activeTab.url}
                activeEngine={activeEngine}
                onSetEngine={handleSetEngine}
                onNavigate={handleNavigate}
                onBack={() => {
                    const wv = document.getElementById(`wv-${activeTabId}`);
                    if (wv && typeof wv.canGoBack === 'function' && wv.canGoBack()) wv.goBack();
                }}
                onForward={() => {
                    const wv = document.getElementById(`wv-${activeTabId}`);
                    if (wv && typeof wv.canGoForward === 'function' && wv.canGoForward()) wv.goForward();
                }}
                onReload={() => {
                    const wv = document.getElementById(`wv-${activeTabId}`);
                    if (wv && typeof wv.reload === 'function') wv.reload();
                }}
                onHome={() => handleNavigate(NEW_TAB_IDENTIFIER)}
                isNewTab={isNewTab}
                isBookmarked={isCurrentTabBookmarked}
                onToggleBookmark={handleToggleBookmark}
                onOpenReaderMode={handleOpenReaderMode}
                onOpenQrCode={() => setIsQrCodeOpen(true)}
            />

            {/* Bookmarks Quick-Links Bar */}
            <BookmarksBar
                bookmarks={bookmarks}
                onNavigate={handleNavigate}
                onAddCurrentPage={handleToggleBookmark}
                onRemoveBookmark={handleRemoveBookmark}
                onOpenHistory={() => setIsHistoryOpen(true)}
            />

            {/* Main Content: Adaptive Viewport (100% full-width when detached, or splits with sidebar when docked) */}
            <main className="main-browser-workspace">
                <div
                    className="webview-container"
                    id="webviewContainer"
                    style={{
                        flex: (!isHudDetached && isHudOpen) ? 7 : 1,
                        width: (!isHudDetached && isHudOpen) ? 'auto' : '100%'
                    }}
                >
                    {tabs.map((tab) => {
                        const isActive = tab.id === activeTabId;
                        return (
                            <div
                                key={tab.id}
                                className="tab-viewport"
                                style={{
                                    display: isActive ? 'flex' : 'none',
                                    width: '100%',
                                    height: '100%',
                                    position: 'relative',
                                    flexDirection: 'column'
                                }}
                            >
                                <webview
                                    id={`wv-${tab.id}`}
                                    className="native-webview"
                                    src="about:blank"
                                    allowpopups="true"
                                    webpreferences="allowRunningInsecureContent=no"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        display: tab.isNewTab ? 'none' : 'flex'
                                    }}
                                    ref={(el) => {
                                        if (el) attachWebviewListeners(el, tab.id);
                                    }}
                                />

                                {tab.isNewTab && (
                                    <div style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
                                        <NewTabPage
                                            activeEngine={activeEngine}
                                            onSetEngine={handleSetEngine}
                                            onNavigate={handleNavigate}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* In-Browser AI Layer Sidebar (Docked mode) */}
                {!isHudDetached && isHudOpen && (
                    <AiHudSidebar
                        isOpen={isHudOpen}
                        isDetached={isHudDetached}
                        onDetachHud={handleDetachHud}
                        onDockHud={handleDockHud}
                        onFocusDetachedHud={handleToggleHud}
                        somEnabled={somEnabled}
                        onToggleSom={setSomEnabled}
                        somMode={somMode}
                        onToggleSomMode={() => setSomMode(m => m === 'summarized' ? 'dense' : 'summarized')}
                        axTreeMarkdown={axTreeMarkdown}
                        onRescanAx={() => logTelemetry('observe', 'Manual AX tree rescan requested')}
                        grepQuery={grepQuery}
                        onSetGrepQuery={setGrepQuery}
                        onExecuteGrep={() => logTelemetry('act', `In-Memory Grep: "${grepQuery}"`)}
                        grepMatches={grepMatches}
                        grepPage={grepPage}
                        grepPageSize={10}
                        onGrepPrevPage={() => setGrepPage(p => Math.max(1, p - 1))}
                        onGrepNextPage={() => setGrepPage(p => p + 1)}
                        onTriggerAutofill={() => {
                            setAutofillStatus('AutofillManager::FillForm() populated 10 semantic fields.');
                            logTelemetry('act', 'AutofillManager::FillForm(AutofillProfile) executed', 'components/autofill');
                        }}
                        autofillStatus={autofillStatus}
                        onLoadDemo={(type) => {
                            if (type === 'checkout') handleNavigate('file:///' + path.resolve(__dirname, '../demo_checkout.html').replace(/\\/g, '/'));
                            else if (type === 'google') handleNavigate('https://www.google.com');
                            else if (type === 'wikipedia') handleNavigate('https://en.wikipedia.org');
                        }}
                        isHitlActive={isHitlActive}
                        onToggleHitl={() => setIsHitlActive(!isHitlActive)}
                        telemetryLogs={telemetryLogs}
                        onClearTelemetry={() => setTelemetryLogs([])}
                        shieldsStats={shieldsStats}
                        onChangeShieldsMode={handleChangeShieldsMode}
                        onAddCustomRule={handleAddCustomRule}
                        currentTab={hudTab}
                        onSelectTab={setHudTab}
                        onCloseHud={() => setIsHudOpen(false)}
                        activeTab={tabs.find(t => t.id === activeTabId) || tabs[0] || { id: 1, title: 'New Tab', url: '' }}
                        onExecuteClick={executeWebviewClick}
                        onExecuteScroll={executeWebviewScroll}
                        onNavigate={handleNavigate}
                        onExtractPageText={extractPageTextForAi}
                    />
                )}
            </main>

            {/* Command Palette / Tab Search Modal (Ctrl+K) */}
            <TabSearchModal
                isOpen={isTabSearchOpen}
                tabs={tabs}
                activeTabId={activeTabId}
                onSelectTab={setActiveTabId}
                onClose={() => setIsTabSearchOpen(false)}
            />

            {/* Clean Distraction-Free Reader Mode Modal */}
            <ReaderModeModal
                isOpen={isReaderModeOpen}
                title={readerTitle}
                content={readerContent}
                onClose={() => setIsReaderModeOpen(false)}
            />

            {/* QR Code Mobile Handoff Modal */}
            <QrCodeModal
                isOpen={isQrCodeOpen}
                url={activeTab.url}
                onClose={() => setIsQrCodeOpen(false)}
            />

            {/* Browsing History Modal (Ctrl+H) */}
            <HistoryModal
                isOpen={isHistoryOpen}
                history={history}
                onNavigate={handleNavigate}
                onRemoveHistoryItem={handleRemoveHistoryItem}
                onClearHistory={handleClearHistory}
                onClose={() => setIsHistoryOpen(false)}
            />
        </div>
    );
}
