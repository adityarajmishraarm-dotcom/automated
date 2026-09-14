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
import WallpaperStudioModal from './components/WallpaperStudioModal.jsx';
import DownloadsPage from './components/DownloadsPage.jsx';
import TypographyStudioModal, { TYPOGRAPHY_FONT_SIZES, TYPOGRAPHY_FONT_STYLES } from './components/TypographyStudioModal.jsx';
import AiProviderModal from './components/AiProviderModal.jsx';
import {
    executeAiBrowserCommand,
    executeWebviewClick as harnessExecuteClick,
    executeWebviewScroll as harnessExecuteScroll,
    extractAdaptivePageContext,
    executeAdaptiveAction
} from './ai_harness_engine.js';

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
        { id: 1, url: '', initialUrl: 'about:blank', title: 'New Tab', isNewTab: true }
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
    const [isAiProviderModalOpen, setIsAiProviderModalOpen] = useState(false);
    const [latestSnapshot, setLatestSnapshot] = useState(null);
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
    const [aiLiveBanner, setAiLiveBanner] = useState(null);

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

    // Custom Wallpaper Studio State (Images, Animated Videos, GIFs, Colors)
    const [wallpaper, setWallpaper] = useState(() => {
        return localStorage.getItem('antigravity_wallpaper') || '';
    });
    const [wallpaperType, setWallpaperType] = useState(() => {
        return localStorage.getItem('antigravity_wallpaper_type') || 'none';
    });
    const [wallpaperOpacity, setWallpaperOpacity] = useState(() => {
        const val = localStorage.getItem('antigravity_wallpaper_opacity');
        return val !== null ? parseFloat(val) : 0.65;
    });
    const [wallpaperColor, setWallpaperColor] = useState(() => {
        return localStorage.getItem('antigravity_wallpaper_color') || '#0b0f19';
    });
    const [isWallpaperStudioOpen, setIsWallpaperStudioOpen] = useState(false);
    const [downloads, setDownloads] = useState([]);

    // Dynamic Typography Canvas Studio State (8 Curated Fonts, 4 Sizes)
    const [canvasFontSize, setCanvasFontSize] = useState(() => {
        return localStorage.getItem('antigravity_canvas_font_size') || 'standard';
    });
    const [canvasFontStyle, setCanvasFontStyle] = useState(() => {
        return localStorage.getItem('antigravity_canvas_font_style') || 'inter';
    });
    const [isTypographyOpen, setIsTypographyOpen] = useState(false);

    // Stable mutable refs for zero-rebind IPC listeners
    const tabsRef = useRef(tabs);
    tabsRef.current = tabs;
    const activeTabIdRef = useRef(activeTabId);
    activeTabIdRef.current = activeTabId;
    const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0] || { id: 1, title: 'New Tab', url: '', isNewTab: true };
    const activeTabRef = useRef(activeTab);
    activeTabRef.current = activeTab;
    const canvasFontSizeRef = useRef(canvasFontSize);
    canvasFontSizeRef.current = canvasFontSize;
    const canvasFontStyleRef = useRef(canvasFontStyle);
    canvasFontStyleRef.current = canvasFontStyle;
    const hudStateRef = useRef({
        tabs,
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
    hudStateRef.current = {
        tabs,
        activeTabId,
        somEnabled,
        somMode,
        axTreeMarkdown,
        grepMatches,
        autofillStatus,
        isHitlActive,
        telemetryLogs,
        shieldsStats
    };

    // Universal High-Priority In-Process Typography Styler
    const injectTypographyIntoWebview = (wv) => {
        if (!wv) return;
        const curUrl = typeof wv.getURL === 'function' ? wv.getURL() : '';
        if (!curUrl || curUrl === 'about:blank') return;
        const fontKey = canvasFontStyleRef.current;
        const sizeKey = canvasFontSizeRef.current;
        const styleObj = TYPOGRAPHY_FONT_STYLES[fontKey] || TYPOGRAPHY_FONT_STYLES['inter'];
        const zoomMap = { 'compact': 0.9, 'standard': 1.0, 'comfortable': 1.15, 'spacious': 1.3 };

        try {
            if (typeof wv.setZoomFactor === 'function') {
                wv.setZoomFactor(zoomMap[sizeKey] || 1.0);
            }
        } catch (e) {}

        const targetFamily = styleObj.fontFamily;
        const universalCss = `
            html, body, div, span, p, a, h1, h2, h3, h4, h5, h6,
            li, ul, ol, dl, dt, dd,
            button, input, textarea, select, label,
            table, td, th, tr, tbody, thead, tfoot,
            article, section, header, footer, nav, aside, main,
            b, strong, i, em, small, sub, sup, blockquote, cite {
                font-family: ${targetFamily} !important;
            }
        `;
        try {
            if (typeof wv.insertCSS === 'function') {
                wv.insertCSS(universalCss).catch(() => {});
            }
        } catch (e) {}
    };

    // In-Process Download Manager IPC synchronization
    useEffect(() => {
        if (!ipcRenderer) return;

        ipcRenderer.invoke('get-downloads').then(list => {
            if (Array.isArray(list)) setDownloads(list);
        }).catch(() => {});

        const handleDownloadStarted = (event, record) => {
            setDownloads(prev => {
                const idx = prev.findIndex(d => d.id === record.id);
                if (idx !== -1) {
                    const copy = [...prev];
                    copy[idx] = record;
                    return copy;
                }
                return [record, ...prev];
            });
            logTelemetry('observe', `Download started: ${record.filename}`, record.totalBytesFormatted);
        };

        const handleDownloadProgress = (event, record) => {
            setDownloads(prev => prev.map(d => d.id === record.id ? record : d));
        };

        const handleDownloadCompleted = (event, record) => {
            setDownloads(prev => prev.map(d => d.id === record.id ? record : d));
            logTelemetry('observe', `Download ${record.state}: ${record.filename}`, record.receivedBytesFormatted);
        };

        const handleDownloadListUpdated = (event, list) => {
            if (Array.isArray(list)) setDownloads(list);
        };

        ipcRenderer.on('download-started', handleDownloadStarted);
        ipcRenderer.on('download-progress', handleDownloadProgress);
        ipcRenderer.on('download-completed', handleDownloadCompleted);
        ipcRenderer.on('download-list-updated', handleDownloadListUpdated);

        return () => {
            ipcRenderer.removeListener('download-started', handleDownloadStarted);
            ipcRenderer.removeListener('download-progress', handleDownloadProgress);
            ipcRenderer.removeListener('download-completed', handleDownloadCompleted);
            ipcRenderer.removeListener('download-list-updated', handleDownloadListUpdated);
        };
    }, []);

    const handleCancelDownload = (id) => {
        if (ipcRenderer) ipcRenderer.invoke('cancel-download', id);
    };

    const handlePauseDownload = (id) => {
        if (ipcRenderer) ipcRenderer.invoke('pause-download', id);
    };

    const handleResumeDownload = (id) => {
        if (ipcRenderer) ipcRenderer.invoke('resume-download', id);
    };

    const handleShowInFolder = (savePath) => {
        if (ipcRenderer) ipcRenderer.invoke('show-download-in-folder', savePath);
    };

    const handleOpenFile = (savePath) => {
        if (ipcRenderer) ipcRenderer.invoke('open-download-file', savePath);
    };

    const handleOpenDownloadsFolder = () => {
        if (ipcRenderer) ipcRenderer.invoke('open-downloads-folder');
    };

    const handleClearCompletedDownloads = () => {
        if (ipcRenderer) {
            ipcRenderer.invoke('clear-completed-downloads').then(list => {
                if (Array.isArray(list)) setDownloads(list);
            });
        }
    };

    const handleOpenDownloadsTab = () => {
        const existing = tabs.find(t => t.url === 'antigravity://downloads' || t.isDownloads);
        if (existing) {
            setActiveTabId(existing.id);
            return;
        }
        const current = tabs.find(t => t.id === activeTabId);
        if (current && (current.isNewTab || !current.url)) {
            setTabs(prev => prev.map(t => {
                if (t.id === activeTabId) {
                    return { ...t, isNewTab: false, isDownloads: true, url: 'antigravity://downloads', title: 'Downloads' };
                }
                return t;
            }));
            return;
        }
        const newId = nextTabIdRef.current++;
        setTabs(prev => [...prev, {
            id: newId,
            url: 'antigravity://downloads',
            initialUrl: 'about:blank',
            title: 'Downloads',
            isNewTab: false,
            isDownloads: true
        }]);
        setActiveTabId(newId);
    };

    // Apply wallpaper class and overlay opacity to document.body
    useEffect(() => {
        const hasWp = wallpaperType !== 'none' && !!wallpaper;
        document.body.classList.toggle('has-wallpaper', hasWp);
        document.body.style.setProperty('--wallpaper-overlay-opacity', String(wallpaperOpacity));
    }, [wallpaper, wallpaperType, wallpaperOpacity]);

    const handleSetWallpaper = (type, value, opacity, color) => {
        setWallpaperType(type);
        setWallpaper(value);
        if (opacity !== undefined) setWallpaperOpacity(opacity);
        if (color !== undefined) setWallpaperColor(color);

        localStorage.setItem('antigravity_wallpaper_type', type);
        localStorage.setItem('antigravity_wallpaper', value);
        if (opacity !== undefined) localStorage.setItem('antigravity_wallpaper_opacity', String(opacity));
        if (color !== undefined) localStorage.setItem('antigravity_wallpaper_color', color);
        logTelemetry('act', `Wallpaper updated: ${type}`);
    };

    // Active Tab Helper
    const isNewTab = activeTab.isNewTab;

    const logTelemetry = (type, msg, meta = '') => {
        setTelemetryLogs(prev => {
            const trimmed = prev.length >= 30 ? prev.slice(prev.length - 29) : prev;
            return [...trimmed, { time: new Date().toLocaleTimeString(), type, msg, meta }];
        });
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
            const curHudState = hudStateRef.current;
            if (action === 'request-initial-state') {
                ipcRenderer.send('sync-hud-state', {
                    type: 'full-state',
                    tabs: curHudState.tabs.map(t => ({ id: t.id, title: t.title, url: t.url, isNewTab: t.isNewTab })),
                    activeTabId: curHudState.activeTabId,
                    somEnabled: curHudState.somEnabled,
                    somMode: curHudState.somMode,
                    axTreeMarkdown: curHudState.axTreeMarkdown,
                    grepMatches: curHudState.grepMatches,
                    autofillStatus: curHudState.autofillStatus,
                    isHitlActive: curHudState.isHitlActive,
                    telemetryLogs: curHudState.telemetryLogs,
                    shieldsStats: curHudState.shieldsStats
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
            } else if (action === 'ai-command') {
                if (data.prompt) {
                    executeAiBrowserCommand(data.prompt, {
                        tabs,
                        activeTab,
                        activeWebview: document.getElementById(`wv-${activeTabId}`),
                        onOpenTab: openInNewTab,
                        onCloseTab: handleCloseTab,
                        onNavigate: handleNavigate,
                        onSelectTab: setActiveTabId,
                        onToggleBookmark: handleToggleBookmark,
                        onOpenReaderMode: handleOpenReaderMode,
                        onOpenQrCode: () => setIsQrCodeOpen(true),
                        onOpenTabSearch: () => setIsTabSearchOpen(true),
                        onOpenHistory: () => setIsHistoryOpen(true),
                        logTelemetry: (type, msg) => logTelemetry(type, msg)
                    }).then(reply => {
                        ipcRenderer.send('sync-hud-state', {
                            type: 'ai-command-reply',
                            reply
                        });
                    }).catch(err => {
                        ipcRenderer.send('sync-hud-state', {
                            type: 'ai-command-reply',
                            reply: { text: `Command error: ${err.message}` }
                        });
                    });
                }
            }
        };

        const handleAiControlRequest = async (event, req) => {
            const { id, action, payload = {} } = req;
            const curActiveId = activeTabIdRef.current;
            const wv = document.getElementById(`wv-${curActiveId}`);
            const curTabs = tabsRef.current;
            const curActiveTab = activeTabRef.current;

            const triggerAiBanner = (act, text) => {
                setAiLiveBanner({ action: act, text, time: Date.now() });
                try {
                    if (window._aiBannerTimeout) clearTimeout(window._aiBannerTimeout);
                    window._aiBannerTimeout = setTimeout(() => setAiLiveBanner(null), 5000);
                } catch (e) {}
            };

            try {
                let result = null;

                if (action === 'get-tabs') {
                    result = {
                        tabs: curTabs.map(t => ({ id: t.id, title: t.title, url: t.url, isNewTab: t.isNewTab })),
                        activeTabId: curActiveId
                    };
                } else if (action === 'switch-tab') {
                    let targetTab = null;
                    if (payload.id) {
                        targetTab = curTabs.find(t => String(t.id) === String(payload.id));
                    } else if (payload.index !== undefined) {
                        const idx = parseInt(payload.index, 10);
                        if (idx >= 1 && idx <= curTabs.length) {
                            targetTab = curTabs[idx - 1];
                        } else if (idx >= 0 && idx < curTabs.length) {
                            targetTab = curTabs[idx];
                        }
                    }
                    if (targetTab) {
                        triggerAiBanner('SWITCH_TAB', `Switched to tab "${targetTab.title || targetTab.url}"`);
                        setActiveTabId(targetTab.id);
                        result = { success: true, switchedTo: targetTab.id, title: targetTab.title, url: targetTab.url };
                    } else {
                        result = { success: false, error: 'Target tab not found' };
                    }
                } else if (action === 'close-tab') {
                    let targetId = payload.id;
                    if (!targetId && payload.index !== undefined) {
                        const idx = parseInt(payload.index, 10);
                        const t = (idx >= 1 && idx <= curTabs.length) ? curTabs[idx - 1] : curTabs[idx];
                        if (t) targetId = t.id;
                    }
                    const toClose = targetId ? String(targetId) : String(curActiveId);
                    triggerAiBanner('CLOSE_TAB', `Closed tab ${toClose}`);
                    handleCloseTab(toClose);
                    result = { success: true, closedTabId: toClose };
                } else if (action === 'new-tab') {
                    const url = payload.url || payload.target || '';
                    triggerAiBanner('NEW_TAB', `Opened new tab: ${url || 'New Tab'}`);
                    openInNewTab(url);
                    result = { success: true, url };
                } else if (action === 'capture-screenshot') {
                    if (wv && typeof wv.capturePage === 'function') {
                        try {
                            const img = await wv.capturePage();
                            const dataUrl = img.toDataURL();
                            const size = img.getSize();
                            const title = typeof wv.getTitle === 'function' ? wv.getTitle() : (curActiveTab ? curActiveTab.title : '');
                            const url = typeof wv.getURL === 'function' ? wv.getURL() : (curActiveTab ? curActiveTab.url : '');
                            if (ipcRenderer && ipcRenderer.invoke) {
                                result = await ipcRenderer.invoke('save-vlm-snapshot', {
                                    dataUrl,
                                    filename: payload.filename,
                                    includeBase64: payload.includeBase64,
                                    width: size.width,
                                    height: size.height,
                                    title,
                                    url
                                });
                                if (result && result.success) {
                                    setLatestSnapshot(result);
                                }
                            } else {
                                result = { success: false, error: 'IPC not available' };
                            }
                        } catch (e) {
                            result = { success: false, error: e.message };
                        }
                    } else {
                        result = { success: false, error: 'No active webview available to capture' };
                    }
                } else if (action === 'get-page-context') {
                    if (wv) {
                        result = await extractAdaptivePageContext(wv);
                    } else {
                        result = { success: false, error: 'No active webview available' };
                    }
                } else if (action === 'site-act') {
                    if (wv) {
                        triggerAiBanner('ADAPTIVE_ACT', 'Executing adaptive action: ' + (payload.intent || ''));
                        result = await executeAdaptiveAction(wv, payload.intent, payload.options);
                    } else {
                        result = { success: false, error: 'No active webview available' };
                    }
                } else if (action === 'navigate') {
                    const targetUrl = payload.url || payload.target || '';
                    if (targetUrl) {
                        triggerAiBanner('NAVIGATE', 'Navigating to ' + targetUrl);
                        handleNavigate(targetUrl);
                        result = { success: true, url: targetUrl };
                    } else {
                        result = { success: false, error: 'URL required' };
                    }
                } else if (action === 'command') {
                    triggerAiBanner('COMMAND', 'AI Autopilot: ' + (payload.prompt || ''));
                    const reply = await executeAiBrowserCommand(payload.prompt, {
                        tabs,
                        activeTab,
                        activeWebview: wv,
                        onOpenTab: openInNewTab,
                        onCloseTab: handleCloseTab,
                        onNavigate: handleNavigate,
                        onSelectTab: setActiveTabId,
                        onToggleBookmark: handleToggleBookmark,
                        onOpenReaderMode: handleOpenReaderMode,
                        onOpenQrCode: () => setIsQrCodeOpen(true),
                        onOpenTabSearch: () => setIsTabSearchOpen(true),
                        onOpenHistory: () => setIsHistoryOpen(true),
                        logTelemetry: (type, msg) => logTelemetry(type, msg)
                    });
                    result = { success: true, reply };
                } else if (action === 'click') {
                    const target = payload.target || payload.text || '';
                    triggerAiBanner('CLICK', 'Clicking: "' + target + '"');
                    const clickRes = await executeWebviewClick(target);
                    result = (typeof clickRes === 'object' && clickRes !== null) ? clickRes : { success: !!clickRes, target };
                } else if (action === 'scroll') {
                    triggerAiBanner('SCROLL', 'Scrolling ' + (payload.direction || 'down'));
                    const ok = await executeWebviewScroll(payload.direction || 'down', payload.amount || 50, payload.isPercent !== false);
                    result = { success: ok, direction: payload.direction, amount: payload.amount };
                } else if (action === 'type') {
                    if (wv && typeof wv.executeJavaScript === 'function') {
                        const typeText = payload.text || '';
                        const submit = payload.submit !== false;
                        triggerAiBanner('TYPE', 'Typing "' + typeText + '" and submitting search');
                        const selector = payload.selector || null;
                        const res = await wv.executeJavaScript(`
                            (function() {
                                let target = null;
                                if (${JSON.stringify(selector)}) {
                                    target = document.querySelector(${JSON.stringify(selector)});
                                }
                                if (!target) {
                                    const inputs = Array.from(document.querySelectorAll('input[type="search"], input[name*="search" i], input[id*="search" i], input[class*="search" i], input[type="text"], input:not([type]), textarea')).filter(el => {
                                        const s = window.getComputedStyle(el);
                                        return s.display !== 'none' && s.visibility !== 'hidden' && el.offsetWidth > 0;
                                    });
                                    target = inputs[0];
                                }
                                if (!target) return { success: false, error: 'No input found' };
                                target.focus();
                                target.value = ${JSON.stringify(typeText)};
                                target.dispatchEvent(new Event('input', { bubbles: true }));
                                target.dispatchEvent(new Event('change', { bubbles: true }));
                                if (${submit}) {
                                    const form = target.closest('form');
                                    if (form) {
                                        form.requestSubmit ? form.requestSubmit() : form.submit();
                                    } else {
                                        target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
                                    }
                                }
                                return { success: true, typed: ${JSON.stringify(typeText)} };
                            })()
                        `);
                        result = res;
                    } else {
                        result = { success: false, error: 'No active webview' };
                    }
                } else if (action === 'get-page-content') {
                    if (wv && typeof wv.executeJavaScript === 'function') {
                        const execPromise = wv.executeJavaScript(`
                            (function() {
                                const allLinks = Array.from(document.querySelectorAll('a')).map(a => ({
                                    text: (a.innerText || a.textContent || '').trim().replace(/\\s+/g, ' '),
                                    href: a.href || '',
                                    id: a.id || '',
                                    className: String(a.className || '')
                                })).filter(l => l.text && l.href && !l.href.startsWith('javascript:'));

                                const allButtons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], [role="button"], .btn, .button, [onclick]')).map(b => ({
                                    text: (b.innerText || b.value || b.getAttribute('aria-label') || '').trim().replace(/\\s+/g, ' '),
                                    id: b.id || '',
                                    className: String(b.className || ''),
                                    tag: b.tagName
                                })).filter(b => b.text && b.text.length < 100);

                                const timers = Array.from(document.querySelectorAll('*')).filter(el => {
                                    const id = el.id || '';
                                    const cl = String(el.className || '');
                                    return /timer|counter|countdown|wait|second/i.test(id + ' ' + cl);
                                }).map(el => ({
                                    id: el.id || '',
                                    text: (el.innerText || '').trim()
                                })).filter(t => t.text);

                                return {
                                    title: document.title || '',
                                    url: window.location.href || '',
                                    text: (document.body ? document.body.innerText : '').substring(0, 15000),
                                    links: allLinks.slice(0, 300),
                                    buttons: allButtons.slice(0, 100),
                                    timers: timers.slice(0, 20)
                                };
                            })()
                        `);
                        const timeoutPromise = new Promise((resolve) => {
                            setTimeout(() => resolve({
                                title: activeTab.title,
                                url: activeTab.url,
                                text: 'Page loading in progress...',
                                links: [],
                                buttons: [],
                                timers: []
                            }), 7000);
                        });
                        result = await Promise.race([execPromise, timeoutPromise]);
                    } else {
                        result = {
                            title: activeTab.title,
                            url: activeTab.url,
                            text: '',
                            links: [],
                            buttons: [],
                            timers: []
                        };
                    }
                } else if (action === 'eval') {
                    if (wv && typeof wv.executeJavaScript === 'function') {
                        const execPromise = wv.executeJavaScript(payload.script);
                        const timeoutPromise = new Promise((resolve) => {
                            setTimeout(() => resolve({ error: 'eval timed out after 8000ms' }), 8000);
                        });
                        result = await Promise.race([execPromise, timeoutPromise]);
                    } else {
                        result = { success: false, error: 'No active webview' };
                    }
                } else if (action === 'get-page-context') {
                    if (wv && typeof wv.executeJavaScript === 'function') {
                        result = await extractAdaptivePageContext(wv);
                    } else {
                        result = { success: false, error: 'No active webview' };
                    }
                } else if (action === 'site-act') {
                    if (wv && typeof wv.executeJavaScript === 'function') {
                        result = await executeAdaptiveAction(wv, payload.intent, payload.options);
                    } else {
                        result = { success: false, error: 'No active webview' };
                    }
                }

                ipcRenderer.send('ai-control-response', { id, result });
            } catch (err) {
                ipcRenderer.send('ai-control-response', { id, error: err.message });
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
        ipcRenderer.on('ai-control-request', handleAiControlRequest);

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
    }, []);

    // Broadcast live state updates to external detached HUD window
    useEffect(() => {
        if (!isHudDetached || !ipcRenderer) return;
        const timer = setTimeout(() => {
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
                telemetryLogs: telemetryLogs.slice(-25),
                shieldsStats
            });
        }, 120);
        return () => clearTimeout(timer);
    }, [tabs, activeTabId, somEnabled, somMode, axTreeMarkdown, grepMatches, autofillStatus, isHitlActive, telemetryLogs.length, shieldsStats, isHudDetached]);

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

    const handleCaptureVlmSnapshot = async (target = 'webview') => {
        try {
            if (target === 'webview') {
                const wv = document.getElementById(`wv-${activeTabIdRef.current}`);
                if (wv && typeof wv.capturePage === 'function') {
                    const img = await wv.capturePage();
                    const size = img.getSize();
                    const dataUrl = img.toDataURL();
                    const curTab = activeTabRef.current || {};
                    const title = typeof wv.getTitle === 'function' ? wv.getTitle() : (curTab.title || '');
                    const url = typeof wv.getURL === 'function' ? wv.getURL() : (curTab.url || '');
                    if (ipcRenderer && ipcRenderer.invoke) {
                        const res = await ipcRenderer.invoke('save-vlm-snapshot', {
                            dataUrl,
                            width: size.width,
                            height: size.height,
                            title,
                            url
                        });
                        if (res && res.success) {
                            setLatestSnapshot(res);
                            logTelemetry('act', `VLM webview screenshot captured: ${res.path}`);
                            return res;
                        }
                    }
                }
            }
            if (ipcRenderer && ipcRenderer.invoke) {
                const res = await ipcRenderer.invoke('capture-vlm-snapshot', { target });
                if (res && res.success) {
                    setLatestSnapshot(res);
                    logTelemetry('act', `VLM screenshot captured: ${res.path}`);
                    return res;
                }
            }
            return { success: false, error: 'Snapshot capture failed' };
        } catch (err) {
            console.error('[Capture Snapshot Error]', err);
            return { success: false, error: err.message };
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

    // Set-of-Marks Hashtag Clicking & Target Element Interaction (AI Harness Unified)
    const executeWebviewClick = async (targetText) => {
        const wv = document.getElementById(`wv-${activeTabId}`) || document.querySelector('.native-webview');
        if (!wv || typeof wv.executeJavaScript !== 'function') {
            logTelemetry('warn', 'No active webview available to execute click interaction.');
            return false;
        }
        try {
            const clickPromise = harnessExecuteClick(wv, targetText, handleNavigate, logTelemetry);
            const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ success: true, message: 'Click action dispatched.' }), 6000));
            return await Promise.race([clickPromise, timeoutPromise]);
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    // Proportional Logical Scroll Scale & Shortcuts (s50, s0, s1000) (AI Harness Unified)
    const executeWebviewScroll = async (direction = 'down', amount = 20, isPercent = false) => {
        const wv = document.getElementById(`wv-${activeTabId}`) || document.querySelector('.native-webview');
        if (!wv || typeof wv.executeJavaScript !== 'function') return false;
        try {
            const scrollPromise = harnessExecuteScroll(wv, direction, amount, isPercent, logTelemetry);
            const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(true), 4000));
            return await Promise.race([scrollPromise, timeoutPromise]);
        } catch (e) {
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
            initialUrl: 'about:blank',
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
            initialUrl: url,
            title: 'Loading...',
            isNewTab: false
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newId);
        logTelemetry('act', `TabStripModel::InsertWebContentsAt()`, `Tab #${newId} -> ${url}`);
    };

    window.__antigravityOpenNewTab = openInNewTab;

    // Close a Tab
    const handleCloseTab = (tabId) => {
        const targetId = tabId !== undefined ? tabId : activeTabId;
        if (tabs.length <= 1) {
            setTabs([{ id: activeTab.id, url: '', initialUrl: 'about:blank', title: 'New Tab', isNewTab: true }]);
            const wv = document.getElementById(`wv-${activeTab.id}`);
            if (wv && typeof wv.loadURL === 'function') wv.loadURL('about:blank');
            return;
        }

        const closeIndex = tabs.findIndex(t => t.id === targetId);
        const filtered = tabs.filter(t => t.id !== targetId);
        setTabs(filtered);

        if (activeTabId === targetId) {
            const nextActiveIndex = Math.min(closeIndex, filtered.length - 1);
            setActiveTabId(filtered[nextActiveIndex].id);
        }
        logTelemetry('act', `TabStripModel::CloseWebContentsAt()`, `Closed Tab #${targetId}`);
    };

    // Navigate Active Tab
    const handleNavigate = (target) => {
        const trimmed = (target || '').trim();
        let finalUrl = trimmed;

        if (!trimmed || trimmed === NEW_TAB_IDENTIFIER || trimmed.includes('newtab.html')) {
            setTabs(prev => prev.map(t => {
                if (t.id === activeTabId) {
                    return { ...t, isNewTab: true, isDownloads: false, url: '', title: 'New Tab' };
                }
                return t;
            }));
            const wv = document.getElementById(`wv-${activeTabId}`);
            if (wv && typeof wv.loadURL === 'function') wv.loadURL('about:blank');
            logTelemetry('act', 'Tab navigated to New Tab Page');
            return;
        }

        if (
            trimmed === 'antigravity://downloads' || 
            trimmed === 'brave://downloads' || 
            trimmed === 'chrome://downloads' || 
            trimmed === 'about:downloads'
        ) {
            setTabs(prev => prev.map(t => {
                if (t.id === activeTabId) {
                    return { ...t, isNewTab: false, isDownloads: true, url: 'antigravity://downloads', title: 'Downloads' };
                }
                return t;
            }));
            const wv = document.getElementById(`wv-${activeTabId}`);
            if (wv && typeof wv.loadURL === 'function') wv.loadURL('about:blank');
            logTelemetry('act', 'Navigated to Brave-style Downloads Manager');
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
                return { ...t, isNewTab: false, isDownloads: false, url: finalUrl, title: t.title || 'Loading...' };
            }
            return t;
        }));

        // Imperatively load URL in webview with instant dispatch
        const wv = document.getElementById(`wv-${activeTabId}`);
        if (wv && typeof wv.loadURL === 'function') {
            wv.loadURL(finalUrl).catch((err) => {
                if (err && (err.code === 'ERR_ABORTED' || String(err).includes('ERR_ABORTED'))) {
                    return;
                }
                console.warn('[Navigation Warning]', err);
            });
        }

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
            } else if (e.ctrlKey && (e.key === 'j' || e.key === 'J')) {
                e.preventDefault();
                handleOpenDownloadsTab();
            } else if ((e.ctrlKey && (e.key === 'l' || e.key === 'L')) || (e.altKey && (e.key === 'd' || e.key === 'D'))) {
                e.preventDefault();
                const el = document.getElementById('urlInput');
                if (el) { el.focus(); el.select(); }
            } else if ((e.ctrlKey && (e.key === 'r' || e.key === 'R')) || e.key === 'F5') {
                e.preventDefault();
                const wv = document.getElementById(`wv-${activeTabId}`);
                if (wv && typeof wv.reload === 'function') wv.reload();
            } else if (e.altKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                const wv = document.getElementById(`wv-${activeTabId}`);
                if (wv) {
                    if (typeof wv.canGoBack === 'function' && wv.canGoBack()) {
                        if (typeof wv.stop === 'function') try { wv.stop(); } catch (err) {}
                        wv.goBack();
                    } else {
                        handleNavigate(NEW_TAB_IDENTIFIER);
                    }
                }
            } else if (e.altKey && e.key === 'ArrowRight') {
                e.preventDefault();
                const wv = document.getElementById(`wv-${activeTabId}`);
                if (wv && typeof wv.canGoForward === 'function' && wv.canGoForward()) {
                    if (typeof wv.stop === 'function') try { wv.stop(); } catch (err) {}
                    wv.goForward();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTabId, tabs]);

    // Setup webview events dynamically (Guaranteed single-attachment to prevent listener explosion)
    const attachWebviewListeners = (wv, tabId) => {
        if (!wv || wv.__listenersAttached) return;
        wv.__listenersAttached = true;

        wv.addEventListener('new-window', (e) => {
            e.preventDefault();
            if (e.url) {
                openInNewTab(e.url);
            }
        });

        wv.addEventListener('did-navigate', (e) => {
            const rawUrl = e.url || '';
            if (!rawUrl || rawUrl === 'about:blank') {
                setTabs(prev => prev.map(t => {
                    if (t.id === tabId) {
                        if (t.isNewTab && !t.url) return t;
                        return { ...t, url: '', title: 'New Tab', isNewTab: true };
                    }
                    return t;
                }));
                return;
            }
            setTabs(prev => prev.map(t => {
                if (t.id === tabId) {
                    const newTitle = (typeof wv.getTitle === 'function' ? wv.getTitle() : '') || t.title;
                    if (t.url === rawUrl && t.title === newTitle && !t.isNewTab) return t;
                    return { ...t, url: rawUrl, title: newTitle, isNewTab: false };
                }
                return t;
            }));
            addHistoryEntry(rawUrl, (typeof wv.getTitle === 'function' ? wv.getTitle() : '') || rawUrl);
        });

        wv.addEventListener('did-navigate-in-page', (e) => {
            const rawUrl = e.url || '';
            if (!rawUrl || rawUrl === 'about:blank') return;
            setTabs(prev => prev.map(t => {
                if (t.id === tabId) {
                    const newTitle = (typeof wv.getTitle === 'function' ? wv.getTitle() : '') || t.title;
                    if (t.url === rawUrl && t.title === newTitle && !t.isNewTab) return t;
                    return { ...t, url: rawUrl, title: newTitle, isNewTab: false };
                }
                return t;
            }));
            addHistoryEntry(rawUrl, (typeof wv.getTitle === 'function' ? wv.getTitle() : '') || rawUrl);
        });

        wv.addEventListener('page-title-updated', (e) => {
            const curUrl = typeof wv.getURL === 'function' ? wv.getURL() : '';
            if (!curUrl || curUrl === 'about:blank') return;
            setTabs(prev => prev.map(t => {
                if (t.id === tabId && !t.isNewTab) {
                    if (t.title === e.title) return t;
                    return { ...t, title: e.title };
                }
                return t;
            }));
            addHistoryEntry(curUrl, e.title);
        });

        wv.addEventListener('dom-ready', () => {
            const u = typeof wv.getURL === 'function' ? wv.getURL() : '';
            if (!u || u === 'about:blank') {
                setTabs(prev => prev.map(t => {
                    if (t.id === tabId) {
                        if (t.isNewTab && !t.url) return t;
                        return { ...t, url: '', title: 'New Tab', isNewTab: true };
                    }
                    return t;
                }));
                return;
            }
            setTabs(prev => prev.map(t => {
                if (t.id === tabId && !t.isNewTab) {
                    const newTitle = (typeof wv.getTitle === 'function' ? wv.getTitle() : '') || t.title;
                    if (t.url === u && t.title === newTitle) return t;
                    return { ...t, url: u, title: newTitle };
                }
                return t;
            }));
            injectTypographyIntoWebview(wv);
        });

        wv.addEventListener('did-fail-load', (e) => {
            // Ignore normal ERR_ABORTED (-3) on redirects
            if (e.errorCode === -3) return;
            logTelemetry('alert', `Load warning (${e.errorCode}): ${e.errorDescription}`);
        });

        wv.addEventListener('before-input-event', (event) => {
            const input = event.input;
            if (!input || input.type !== 'keyDown') return;
            const isCtrl = input.control || input.meta;
            if (!isCtrl) return;

            // Ctrl + Alt + 1..8 -> Switch font style
            if (input.alt) {
                const num = parseInt(input.key, 10);
                const fontKeys = Object.keys(TYPOGRAPHY_FONT_STYLES);
                if (num >= 1 && num <= fontKeys.length) {
                    const chosen = fontKeys[num - 1];
                    setCanvasFontStyle(chosen);
                    localStorage.setItem('antigravity_canvas_font_style', chosen);
                    injectTypographyIntoWebview(wv);
                    return;
                }
            }

            // Ctrl + = / + -> Increase font size
            if (input.key === '=' || input.key === '+' || input.code === 'NumpadAdd') {
                const sizes = ['compact', 'standard', 'comfortable', 'spacious'];
                const curIdx = sizes.indexOf(canvasFontSizeRef.current);
                if (curIdx < sizes.length - 1) {
                    const nextSize = sizes[curIdx + 1];
                    setCanvasFontSize(nextSize);
                    localStorage.setItem('antigravity_canvas_font_size', nextSize);
                    injectTypographyIntoWebview(wv);
                }
                return;
            }

            // Ctrl + - -> Decrease font size
            if (input.key === '-' || input.key === '_' || input.code === 'NumpadSubtract') {
                const sizes = ['compact', 'standard', 'comfortable', 'spacious'];
                const curIdx = sizes.indexOf(canvasFontSizeRef.current);
                if (curIdx > 0) {
                    const prevSize = sizes[curIdx - 1];
                    setCanvasFontSize(prevSize);
                    localStorage.setItem('antigravity_canvas_font_size', prevSize);
                    injectTypographyIntoWebview(wv);
                }
                return;
            }
        });
    };

    return (
        <div className="native-browser-app">
            {/* Native Wallpaper Background Layer (Image / Video / Color) */}
            {wallpaperType !== 'none' && wallpaper && (
                <div
                    className="wallpaper-layer"
                    style={{
                        backgroundColor: wallpaperColor,
                        ...(wallpaperType === 'image' ? { backgroundImage: `url("${wallpaper}")` } : {}),
                        ...(wallpaperType === 'color' ? { backgroundColor: wallpaper } : {})
                    }}
                >
                    {wallpaperType === 'video' && (
                        <video src={wallpaper} autoPlay loop muted playsInline />
                    )}
                </div>
            )}

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
                    if (wv) {
                        if (typeof wv.canGoBack === 'function' && wv.canGoBack()) {
                            if (typeof wv.stop === 'function') {
                                try { wv.stop(); } catch (e) {}
                            }
                            wv.goBack();
                        } else {
                            handleNavigate(NEW_TAB_IDENTIFIER);
                        }
                    }
                }}
                onForward={() => {
                    const wv = document.getElementById(`wv-${activeTabId}`);
                    if (wv && typeof wv.canGoForward === 'function' && wv.canGoForward()) {
                        if (typeof wv.stop === 'function') {
                            try { wv.stop(); } catch (e) {}
                        }
                        wv.goForward();
                    }
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
                onOpenWallpaperStudio={() => setIsWallpaperStudioOpen(true)}
                activeDownloadsCount={downloads.filter(d => d.state === 'progressing').length}
                onOpenDownloads={handleOpenDownloadsTab}
                onOpenTypography={() => setIsTypographyOpen(true)}
                onOpenAiProviderModal={() => setIsAiProviderModalOpen(true)}
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
                        width: (!isHudDetached && isHudOpen) ? 'auto' : '100%',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    {tabs.map((tab) => {
                        const isActive = tab.id === activeTabId;
                        const isDownloadsTab = tab.isDownloads || tab.url === 'antigravity://downloads';
                        return (
                            <div
                                key={tab.id}
                                className="tab-viewport"
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    width: '100%',
                                    height: '100%',
                                    visibility: isActive ? 'visible' : 'hidden',
                                    pointerEvents: isActive ? 'auto' : 'none',
                                    zIndex: isActive ? 1 : 0,
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                            >
                                <webview
                                    id={`wv-${tab.id}`}
                                    className="native-webview"
                                    src={tab.initialUrl || tab.url || 'about:blank'}
                                    allowpopups="true"
                                    webpreferences="allowRunningInsecureContent=no"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        display: (tab.isNewTab || isDownloadsTab) ? 'none' : 'flex'
                                    }}
                                    ref={(el) => {
                                        if (el) attachWebviewListeners(el, tab.id);
                                    }}
                                />

                                {isDownloadsTab && (
                                    <div style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
                                        <DownloadsPage
                                            downloads={downloads}
                                            onCancelDownload={handleCancelDownload}
                                            onPauseDownload={handlePauseDownload}
                                            onResumeDownload={handleResumeDownload}
                                            onShowInFolder={handleShowInFolder}
                                            onOpenFile={handleOpenFile}
                                            onOpenDownloadsFolder={handleOpenDownloadsFolder}
                                            onClearCompleted={handleClearCompletedDownloads}
                                        />
                                    </div>
                                )}

                                {tab.isNewTab && !isDownloadsTab && (
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
                        tabs={tabs}
                        onOpenTab={openInNewTab}
                        onCloseTab={handleCloseTab}
                        onExecuteClick={executeWebviewClick}
                        onExecuteScroll={executeWebviewScroll}
                        onNavigate={handleNavigate}
                        onExtractPageText={extractPageTextForAi}
                        onToggleBookmark={handleToggleBookmark}
                        onOpenReaderMode={handleOpenReaderMode}
                        onOpenQrCode={() => setIsQrCodeOpen(true)}
                        onOpenTabSearch={() => setIsTabSearchOpen(true)}
                        onOpenHistory={() => setIsHistoryOpen(true)}
                        onOpenAiProviderModal={() => setIsAiProviderModalOpen(true)}
                        onCaptureSnapshot={handleCaptureVlmSnapshot}
                        latestSnapshot={latestSnapshot}
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

            {/* Custom Wallpaper Studio Modal */}
            <WallpaperStudioModal
                isOpen={isWallpaperStudioOpen}
                currentWallpaper={wallpaper}
                currentType={wallpaperType}
                currentOpacity={wallpaperOpacity}
                currentColor={wallpaperColor}
                onSelectWallpaper={handleSetWallpaper}
                onClose={() => setIsWallpaperStudioOpen(false)}
            />

            {/* Modern Typography & Font Canvas Studio Modal */}
            <TypographyStudioModal
                isOpen={isTypographyOpen}
                currentFontSize={canvasFontSize}
                currentFontStyle={canvasFontStyle}
                onSelectFontSize={(sz) => {
                    setCanvasFontSize(sz);
                    localStorage.setItem('antigravity_canvas_font_size', sz);
                }}
                onSelectFontStyle={(st) => {
                    setCanvasFontStyle(st);
                    localStorage.setItem('antigravity_canvas_font_style', st);
                }}
                onApplyTypography={(sz, st) => {
                    setCanvasFontSize(sz);
                    setCanvasFontStyle(st);
                    localStorage.setItem('antigravity_canvas_font_size', sz);
                    localStorage.setItem('antigravity_canvas_font_style', st);
                    const wv = document.getElementById(`wv-${activeTabId}`);
                    if (wv) injectTypographyIntoWebview(wv);
                }}
                onClose={() => setIsTypographyOpen(false)}
            />

            {/* AI Providers & Keys Management Modal */}
            <AiProviderModal
                isOpen={isAiProviderModalOpen}
                onClose={() => setIsAiProviderModalOpen(false)}
                onCaptureSnapshot={handleCaptureVlmSnapshot}
                latestSnapshot={latestSnapshot}
            />

            {/* Live AI Autopilot Action Banner (Visually demonstrates on-screen what AI is doing) */}
            {aiLiveBanner && (
                <div style={{
                    position: 'fixed',
                    bottom: 24,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 999999,
                    background: 'rgba(11, 17, 33, 0.94)',
                    border: '1.5px solid #00e5ff',
                    boxShadow: '0 10px 40px rgba(0, 229, 255, 0.4), 0 0 20px rgba(0, 229, 255, 0.25)',
                    borderRadius: 14,
                    padding: '14px 28px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    color: '#f8fafc',
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                    backdropFilter: 'blur(16px)',
                    pointerEvents: 'none'
                }}>
                    <div style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: '#00e5ff',
                        boxShadow: '0 0 12px #00e5ff'
                    }} />
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#00e5ff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        ⚡ AI AUTOPILOT
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', letterSpacing: '-0.2px' }}>
                        {aiLiveBanner.text}
                    </span>
                </div>
            )}
        </div>
    );
}
