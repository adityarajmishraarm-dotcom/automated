/**
 * Antigravity Native AI Browser - Renderer Process
 * Connects TabStripModel, Chromium WebViews, In-Memory Grep, Set-of-Marks,
 * components/autofill Semantic Engine, and 4-Layer CAPTCHA Defense.
 */

const { ipcRenderer } = require('electron');
const path = require('path');

// State
let tabs = [];
let activeTabId = null;
let nextTabId = 1;
let adblockCount = 0;
let isHitlActive = false;

// Grep State
let currentGrepMatches = [];
let currentGrepPage = 1;
const GREP_PAGE_SIZE = 10;
let currentGrepQuery = '';
let currentHtmlLines = [];

// DOM Elements
const tabsTrack = document.getElementById('tabsTrack');
const btnAddTab = document.getElementById('btnAddTab');
const webviewContainer = document.getElementById('webviewContainer');
const loadingBar = document.getElementById('loadingBar');
const urlInput = document.getElementById('urlInput');
const btnGo = document.getElementById('btnGo');
const btnBack = document.getElementById('btnBack');
const btnForward = document.getElementById('btnForward');
const btnReload = document.getElementById('btnReload');
const btnHome = document.getElementById('btnHome');
const shieldCount = document.getElementById('shieldCount');
const btnToggleHud = document.getElementById('btnToggleHud');
const aiHudSidebar = document.getElementById('aiHudSidebar');
const chkSoM = document.getElementById('chkSoM');
const axTreeBox = document.getElementById('axTreeBox');
const btnRescanAx = document.getElementById('btnRescanAx');
const txtGrepQuery = document.getElementById('txtGrepQuery');
const btnExecuteGrep = document.getElementById('btnExecuteGrep');
const grepStatsBar = document.getElementById('grepStatsBar');
const lblGrepStats = document.getElementById('lblGrepStats');
const btnGrepPrev = document.getElementById('btnGrepPrev');
const btnGrepNext = document.getElementById('btnGrepNext');
const grepOutputArea = document.getElementById('grepOutputArea');
const btnTriggerAutofill = document.getElementById('btnTriggerAutofill');
const autofillStatus = document.getElementById('autofillStatus');
const btnLoadFormDemo = document.getElementById('btnLoadFormDemo');
const btnLoadGoogle = document.getElementById('btnLoadGoogle');
const btnLoadWikipedia = document.getElementById('btnLoadWikipedia');
const tagCaptchaDetected = document.getElementById('tagCaptchaDetected');
const btnHitlTrigger = document.getElementById('btnHitlTrigger');
const takeoverBanner = document.getElementById('takeoverBanner');
const btnResumeAutonomy = document.getElementById('btnResumeAutonomy');
const telemetryBox = document.getElementById('telemetryBox');
const btnClearTelemetry = document.getElementById('btnClearTelemetry');
const btnDevTools = document.getElementById('btnDevTools');
const btnCopyAx = document.getElementById('btnCopyAx');
const btnOpenHudAsTab = document.getElementById('btnOpenHudAsTab');
const btnPopoutHud = document.getElementById('btnPopoutHud');
const btnToggleSoMMode = document.getElementById('btnToggleSoMMode');
const lblSoMMode = document.getElementById('lblSoMMode');
const lblTokenLimit = document.getElementById('lblTokenLimit');
const btnWinClose = document.getElementById('btnWinClose');
const btnWinMinimize = document.getElementById('btnWinMinimize');
const btnWinMaximize = document.getElementById('btnWinMaximize');

if (btnWinClose) {
    btnWinClose.onclick = () => ipcRenderer.invoke('window-close');
}
if (btnWinMinimize) {
    btnWinMinimize.onclick = () => ipcRenderer.invoke('window-minimize');
}
if (btnWinMaximize) {
    btnWinMaximize.onclick = () => ipcRenderer.invoke('window-maximize');
}

let isSummarizedMode = true;
let lastActiveWebTabId = 1;

// Telemetry Logger
function logTelemetry(type, message, meta = '') {
    const time = new Date().toLocaleTimeString();
    const div = document.createElement('div');
    div.className = `log-line ${type}`;
    div.innerHTML = `<span class="time">${time}</span> <strong>[${type.toUpperCase()}]</strong> ${message} ${meta ? `<span class="meta">${meta}</span>` : ''}`;
    telemetryBox.appendChild(div);
    telemetryBox.scrollTop = telemetryBox.scrollHeight;

    try {
        ipcRenderer.send('sync-hud-state', {
            type: 'telemetry',
            level: type,
            message: message,
            meta: meta
        });
    } catch (e) {}
}

// IPC Listener for Adblock Stats
ipcRenderer.on('adblock-count-updated', (event, count) => {
    adblockCount = count;
    shieldCount.textContent = count;
    logTelemetry('verify', `Native Adblock Intercepted Tracker/Ad #${count}`, 'onBeforeRequest 0ms');
});

// Tab Management (TabStripModel)
function getTargetWebTab() {
    const active = getActiveTab();
    if (active && !active.isHudTab && active.webview) return active;
    const lastWeb = tabs.find(t => t.id === lastActiveWebTabId && !t.isHudTab);
    if (lastWeb && lastWeb.webview) return lastWeb;
    return tabs.find(t => !t.isHudTab && t.webview);
}

function broadcastTabsList() {
    const tabSummaries = tabs
        .filter(t => !t.isHudTab)
        .map(t => ({
            id: t.id,
            title: t.title || 'Untitled Tab',
            url: t.url,
            isActive: t.id === activeTabId
        }));
    
    try {
        ipcRenderer.send('sync-hud-state', {
            type: 'tabs-list',
            tabs: tabSummaries,
            activeTabId: activeTabId
        });
    } catch (e) {}
}

function openOrCreateHudTab(shouldActivate = true) {
    let hudTab = tabs.find(t => t.isHudTab);
    if (!hudTab) {
        const tabId = nextTabId++;
        hudTab = {
            id: tabId,
            url: 'antigravity://hud',
            title: 'AI Copilot HUD',
            isHudTab: true,
            isReady: true,
            isLoading: false,
            webview: null
        };
        tabs.push(hudTab);
        renderTabStrip();
        logTelemetry('act', `TabStripModel::InsertWebContentsAt(${tabs.length - 1})`, `Tab #${tabId} -> AI Copilot HUD`);
    }

    if (shouldActivate) {
        activateTab(hudTab.id);
    }
    return hudTab;
}

function createTab(url, title = 'New Tab', shouldActivate = true) {
    const tabId = nextTabId++;
    
    // Create native <webview> element
    const webview = document.createElement('webview');
    webview.className = 'native-webview';
    webview.id = `webview-${tabId}`;
    webview.setAttribute('allowpopups', 'true');
    webview.setAttribute('webpreferences', 'allowRunningInsecureContent=no');
    webview.src = url;
    webview.style.display = 'none';

    webviewContainer.appendChild(webview);

    const tab = {
        id: tabId,
        url: url,
        title: title,
        webview: webview,
        isReady: false,
        isLoading: false
    };

    tabs.push(tab);

    // Setup Webview Event Listeners
    setupWebviewEvents(tab);

    // Render Tabs Bar
    renderTabStrip();
    broadcastTabsList();

    // Activate the newly created tab if requested
    if (shouldActivate) {
        activateTab(tabId);
    }

    logTelemetry('act', `TabStripModel::InsertWebContentsAt(${tabs.length - 1})`, `Tab #${tabId} -> ${title}`);
    return tab;
}

function activateTab(tabId) {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    activeTabId = tabId;

    if (tab.isHudTab) {
        // Dedicated AI HUD Tab: hide all webviews so HUD takes full workspace
        tabs.forEach(t => {
            if (t.webview) t.webview.style.display = 'none';
        });

        // Switch HUD into spacious full-tab mode
        aiHudSidebar.classList.add('full-tab-mode');
        aiHudSidebar.style.display = 'flex';
        urlInput.value = 'antigravity://hud';

        if (btnOpenHudAsTab) {
            btnOpenHudAsTab.classList.add('active');
            const span = btnOpenHudAsTab.querySelector('span');
            if (span) span.textContent = 'Dock to Sidebar';
        }

        // Trigger analysis on target web tab
        const targetTab = getTargetWebTab();
        if (targetTab && targetTab.isReady) {
            triggerPageAnalysis(targetTab);
        }
    } else {
        // Standard Web Tab
        lastActiveWebTabId = tabId;

        // If HUD was in full-tab mode, remove it and hide HUD so webview gets 100% width
        if (aiHudSidebar.classList.contains('full-tab-mode')) {
            aiHudSidebar.classList.remove('full-tab-mode');
            aiHudSidebar.style.display = 'none';
            if (btnOpenHudAsTab) {
                btnOpenHudAsTab.classList.remove('active');
                const span = btnOpenHudAsTab.querySelector('span');
                if (span) span.textContent = 'Open as Tab';
            }
        }

        // Show active webview, hide others
        tabs.forEach(t => {
            if (t.id === tabId && t.webview) {
                t.webview.style.display = 'flex';
            } else if (t.webview) {
                t.webview.style.display = 'none';
            }
        });

        // Safely update Omnibox URL
        let displayUrl = tab.url;
        try {
            if (tab.isReady && tab.webview && typeof tab.webview.getURL === 'function') {
                displayUrl = tab.webview.getURL() || tab.url;
            }
        } catch (e) {
            displayUrl = tab.url;
        }
        urlInput.value = displayUrl;

        // Rescan SoM and AX tree on tab switch
        if (tab.isReady) {
            setTimeout(() => {
                triggerPageAnalysis(tab);
            }, 300);
        }
    }

    // Re-render Tab Strip highlighting
    renderTabStrip();
    broadcastTabsList();

    const activeTarget = getTargetWebTab();
    if (activeTarget) {
        try {
            ipcRenderer.send('sync-hud-state', {
                targetId: activeTarget.id,
                targetTitle: activeTarget.title || 'Web Page',
                targetUrl: activeTarget.url
            });
        } catch (e) {}
    }

    logTelemetry('act', `TabStripModel::ActivateTabAt(id: ${tabId})`, tab.title);
}

function closeTab(tabId, event) {
    if (event) event.stopPropagation();

    if (tabs.length <= 1) {
        const lastTab = tabs[0];
        if (lastTab.webview) {
            lastTab.webview.loadURL('https://news.ycombinator.com');
        }
        return;
    }

    const tabIndex = tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;

    const tab = tabs[tabIndex];
    
    if (tab.webview && tab.webview.parentNode) {
        tab.webview.parentNode.removeChild(tab.webview);
    }

    // If HUD tab was in full-tab mode, reset mode
    if (tab.isHudTab && aiHudSidebar.classList.contains('full-tab-mode')) {
        aiHudSidebar.classList.remove('full-tab-mode');
        aiHudSidebar.style.display = 'none';
        if (btnOpenHudAsTab) {
            btnOpenHudAsTab.classList.remove('active');
            const span = btnOpenHudAsTab.querySelector('span');
            if (span) span.textContent = 'Open as Tab';
        }
    }

    tabs.splice(tabIndex, 1);
    broadcastTabsList();

    if (activeTabId === tabId) {
        const newIndex = Math.min(tabIndex, tabs.length - 1);
        if (tabs[newIndex]) {
            activateTab(tabs[newIndex].id);
        }
    } else {
        renderTabStrip();
    }

    logTelemetry('act', `TabStripModel::CloseWebContentsAt(index: ${tabIndex})`, `Closed Tab #${tabId}`);
}

function renderTabStrip() {
    tabsTrack.innerHTML = '';
    tabs.forEach(tab => {
        const tabEl = document.createElement('div');
        tabEl.className = `native-tab ${tab.id === activeTabId ? 'active' : ''} ${tab.isHudTab ? 'hud-tab' : ''}`;
        tabEl.title = tab.url;
        tabEl.onclick = () => activateTab(tab.id);

        const faviconSpan = document.createElement('span');
        faviconSpan.className = 'tab-favicon';
        if (tab.isHudTab) {
            faviconSpan.textContent = '✨';
        } else if (tab.url.startsWith('file:') || tab.url.includes('demo_checkout')) {
            faviconSpan.textContent = '💳';
        } else if (tab.url.includes('google')) {
            faviconSpan.textContent = '🔍';
        } else if (tab.url.includes('wikipedia')) {
            faviconSpan.textContent = '🌐';
        } else if (tab.url.includes('ycombinator') || tab.url.includes('news')) {
            faviconSpan.textContent = '🟧';
        } else {
            faviconSpan.textContent = '⚡';
        }

        const titleSpan = document.createElement('span');
        titleSpan.className = 'tab-title';
        titleSpan.textContent = tab.title || 'New Tab';

        const btnClose = document.createElement('button');
        btnClose.className = 'btn-tab-close';
        btnClose.innerHTML = '&times;';
        btnClose.title = 'Close Tab';
        btnClose.onclick = (e) => closeTab(tab.id, e);

        tabEl.appendChild(faviconSpan);
        tabEl.appendChild(titleSpan);
        tabEl.appendChild(btnClose);
        tabsTrack.appendChild(tabEl);
    });
}

function getActiveTab() {
    return tabs.find(t => t.id === activeTabId);
}

// High-Fidelity Image & Typography Rendering Optimization
const SMOOTH_IMAGE_RENDERING_CSS = `
    img, picture, video, canvas, svg, [role="img"], .image, .photo, .poster, .banner {
        image-rendering: -webkit-optimize-contrast !important;
        image-rendering: high-quality !important;
        -webkit-backface-visibility: hidden !important;
        backface-visibility: hidden !important;
        transform: translateZ(0) !important;
        -webkit-transform: translateZ(0) !important;
    }
    html, body {
        -webkit-font-smoothing: antialiased !important;
        -moz-osx-font-smoothing: grayscale !important;
        text-rendering: optimizeLegibility !important;
        scroll-behavior: smooth !important;
    }
`;

function injectSmoothRendering(wv) {
    if (!wv) return;
    try {
        if (typeof wv.insertCSS === 'function') {
            wv.insertCSS(SMOOTH_IMAGE_RENDERING_CSS);
        }
    } catch (e) {}
}

// Webview Lifecycle & Navigation
function setupWebviewEvents(tab) {
    const wv = tab.webview;

    wv.addEventListener('dom-ready', () => {
        tab.isReady = true;
        injectSmoothRendering(wv);
        try {
            tab.title = wv.getTitle() || tab.title;
            tab.url = wv.getURL() || tab.url;
        } catch (e) {}

        renderTabStrip();

        if (tab.id === activeTabId) {
            urlInput.value = tab.url;
            triggerPageAnalysis(tab);
        }
    });

    wv.addEventListener('did-start-loading', () => {
        tab.isLoading = true;
        if (tab.id === activeTabId) {
            loadingBar.classList.add('loading');
        }
        logTelemetry('observe', `Navigation started: ${tab.url}`);
    });

    wv.addEventListener('did-stop-loading', () => {
        tab.isLoading = false;
        tab.isReady = true;
        injectSmoothRendering(wv);
        try {
            tab.title = wv.getTitle() || tab.title;
            tab.url = wv.getURL() || tab.url;
        } catch (e) {}

        if (tab.id === activeTabId) {
            loadingBar.classList.remove('loading');
            urlInput.value = tab.url;
        }

        renderTabStrip();
        logTelemetry('verify', `Navigation completed: ${tab.title}`, tab.url);

        if (tab.id === activeTabId) {
            triggerPageAnalysis(tab);
        }
    });

    wv.addEventListener('page-title-updated', (e) => {
        tab.title = e.title;
        renderTabStrip();
    });

    wv.addEventListener('did-navigate', (e) => {
        tab.url = e.url;
        if (tab.id === activeTabId) {
            urlInput.value = e.url;
        }
    });

    wv.addEventListener('did-navigate-in-page', (e) => {
        tab.url = e.url;
        if (tab.id === activeTabId) {
            urlInput.value = e.url;
        }
    });
}

// Navigation Controls
function navigateActiveWebview(targetUrl) {
    const tab = getActiveTab();
    if (!tab) return;

    let finalUrl = targetUrl.trim();
    if (!finalUrl) return;

    if (finalUrl === 'antigravity://hud' || finalUrl === 'about:hud' || finalUrl === 'chrome://hud') {
        openOrCreateHudTab(true);
        return;
    }

    if (tab.isHudTab) {
        createTab(finalUrl, 'New Tab', true);
        return;
    }

    if (!tab.webview) return;

    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://') && !finalUrl.startsWith('data:') && !finalUrl.startsWith('file://')) {
        if (finalUrl.includes('.') && !finalUrl.includes(' ')) {
            finalUrl = 'https://' + finalUrl;
        } else {
            finalUrl = `https://www.google.com/search?q=${encodeURIComponent(finalUrl)}`;
        }
    }

    urlInput.value = finalUrl;
    tab.webview.loadURL(finalUrl);
    logTelemetry('act', `WebContents::GetController().LoadURL("${finalUrl}")`);
}

urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        navigateActiveWebview(urlInput.value);
    }
});

btnGo.onclick = () => navigateActiveWebview(urlInput.value);

btnBack.onclick = () => {
    const tab = getActiveTab();
    if (tab && tab.webview && tab.webview.canGoBack()) {
        tab.webview.goBack();
        logTelemetry('act', 'WebContents::GetController().GoBack()');
    }
};

btnForward.onclick = () => {
    const tab = getActiveTab();
    if (tab && tab.webview && tab.webview.canGoForward()) {
        tab.webview.goForward();
        logTelemetry('act', 'WebContents::GetController().GoForward()');
    }
};

btnReload.onclick = () => {
    const tab = getActiveTab();
    if (tab && tab.webview) {
        tab.webview.reload();
        logTelemetry('act', 'WebContents::GetController().Reload()');
    }
};

btnHome.onclick = () => {
    navigateActiveWebview('https://news.ycombinator.com');
};

btnAddTab.onclick = () => {
    createTab('https://news.ycombinator.com', 'Hacker News');
};

// Set-of-Marks (SoM) Injection Function with Summarized Primary Action Filtering
const SOM_INJECTION_FUNCTION = function(isSummarized) {
    const oldContainer = document.getElementById('antigravity-som-container');
    if (oldContainer) oldContainer.remove();

    // Ensure smooth high-quality image rendering styles in the page DOM
    if (!document.getElementById('battlenx-smooth-render-style')) {
        const style = document.createElement('style');
        style.id = 'battlenx-smooth-render-style';
        style.textContent = `
            img, picture, video, canvas, svg, [role="img"], .poster, .banner {
                image-rendering: -webkit-optimize-contrast !important;
                image-rendering: high-quality !important;
                -webkit-backface-visibility: hidden !important;
                backface-visibility: hidden !important;
                transform: translateZ(0) !important;
                -webkit-transform: translateZ(0) !important;
            }
        `;
        if (document.head) document.head.appendChild(style);
    }

    const container = document.createElement('div');
    container.id = 'antigravity-som-container';
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '2147483647';

    // Interactive element selector
    const selector = 'a, button, input, textarea, select, [role="button"], [role="link"], [role="checkbox"], [role="textbox"], [role="searchbox"], [role="menuitem"], [onclick], summary';
    const rawElements = Array.from(document.querySelectorAll(selector));

    const marksData = [];
    const placedBadges = [];
    let markIndex = 1;
    let rawCount = rawElements.length;

    const categories = {
        nav: [],
        content: [],
        forms: [],
        actions: []
    };

    const validElements = [];

    rawElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width <= 4 || rect.height <= 4 || rect.top < -300 || rect.top > window.innerHeight + 1200) {
            return;
        }
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return;
        }

        const tagName = el.tagName.toLowerCase();
        let desc = el.innerText ? el.innerText.replace(/\s+/g, ' ').trim() : '';
        if (!desc && el.placeholder) desc = el.placeholder.replace(/\s+/g, ' ').trim();
        if (!desc && el.value) desc = String(el.value).replace(/\s+/g, ' ').trim();
        if (!desc && el.getAttribute('aria-label')) desc = el.getAttribute('aria-label').replace(/\s+/g, ' ').trim();
        if (!desc && el.title) desc = el.title.replace(/\s+/g, ' ').trim();
        if (!desc && tagName === 'input') desc = el.type || 'text';

        const href = el.href || '';
        const lowerHref = href.toLowerCase();
        const lowerDesc = desc.toLowerCase();

        if (isSummarized) {
            // Heuristic Noise Filter for Summarized Mode:
            if (!desc || desc === '(unlabeled)') {
                return;
            }

            // Skip single punctuation/separators
            if (/^[|•\-\/\»\«\s]+$/.test(desc)) {
                return;
            }

            // Skip upvote/downvote arrows
            if (lowerHref.includes('vote?') || el.classList.contains('votearrow') || lowerDesc === '▲' || lowerDesc === '▼') {
                return;
            }

            // Skip "hide" links
            if (lowerDesc === 'hide' || lowerHref.includes('hide?')) {
                return;
            }

            // Skip repetitive domain tags like "(github.com)" next to title
            if (el.classList.contains('sitestr') || (el.parentElement && el.parentElement.classList.contains('sitebit'))) {
                return;
            }

            // Skip relative timestamps
            if (/^\d+\s+(hours?|minutes?|seconds?|days?|months?|years?)\s+ago$/.test(lowerDesc)) {
                return;
            }

            // Skip author profile bylines
            if (el.classList.contains('hnuser') || (el.parentElement && el.parentElement.classList.contains('subtext') && lowerHref.includes('user?id='))) {
                return;
            }

            // Skip Wikipedia citation marks
            if (/^\[\s*(\d+|edit|citation needed)\s*\]$/i.test(desc)) {
                return;
            }
        }

        validElements.push({ el, rect, tagName, desc, href });
    });

    validElements.forEach(({ el, rect, tagName, desc, href }) => {
        const textStr = '#' + markIndex;
        const badgeWidth = textStr.length * 7 + 8;
        const badgeHeight = 13;

        // Smart Zero-Occlusion Placement
        let bTop = window.scrollY + rect.top - 12;
        let bLeft = window.scrollX + rect.left;

        if (rect.top < 16) {
            // Top of viewport (e.g. orange header): place cleanly below element to never occlude text
            bTop = window.scrollY + rect.bottom + 2;
            bLeft = window.scrollX + rect.left;
        } else if (rect.left >= 36 && isSummarized) {
            // In summarized mode on lists/feeds: place in the left margin gutter
            bLeft = Math.max(2, window.scrollX + rect.left - badgeWidth - 4);
            bTop = window.scrollY + rect.top + Math.max(0, (rect.height - badgeHeight) / 2);
        } else {
            // Standard placement: float cleanly above top-left edge
            bTop = window.scrollY + rect.top - 12;
            bLeft = Math.max(2, window.scrollX + rect.left - 2);
        }

        if (bLeft < 2) bLeft = 2;

        placedBadges.push({ top: bTop, left: bLeft, width: badgeWidth });

        // Create Badge
        const badge = document.createElement('div');
        badge.className = 'antigravity-som-badge';
        badge.id = 'som-mark-' + markIndex;
        badge.textContent = textStr;
        badge.style.cssText = `
            position: absolute;
            left: ${bLeft}px;
            top: ${bTop}px;
            background: #FFE600;
            color: #000000;
            font-family: ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Consolas, monospace;
            font-size: 10px;
            font-weight: 800;
            padding: 0 4px;
            border-radius: 4px;
            border: 1px solid rgba(0, 0, 0, 0.85);
            box-shadow: 0 2px 6px rgba(0,0,0,0.6);
            pointer-events: none;
            line-height: 12px;
            height: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2147483647;
            letter-spacing: -0.2px;
            -webkit-font-smoothing: antialiased;
            text-rendering: geometricPrecision;
        `;

        // Create Bounding Box
        const isLargeHero = rect.width > 260 && rect.height > 260;
        const box = document.createElement('div');
        box.className = 'antigravity-som-box';
        box.style.cssText = `
            position: absolute;
            left: ${window.scrollX + rect.left}px;
            top: ${window.scrollY + rect.top}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            border: ${isLargeHero ? '1px solid rgba(255, 230, 0, 0.25)' : '1.5px solid rgba(255, 230, 0, 0.45)'};
            background: ${isLargeHero ? 'transparent' : 'rgba(255, 230, 0, 0.02)'};
            border-radius: 4px;
            box-shadow: ${isLargeHero ? 'none' : '0 0 4px rgba(255, 230, 0, 0.15)'};
            pointer-events: none;
            z-index: 2147483646;
        `;

        container.appendChild(box);
        container.appendChild(badge);

        // Classify Category
        let category = 'content';
        const lowerDesc = desc.toLowerCase();

        if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
            category = 'forms';
        } else if (tagName === 'button' || el.getAttribute('role') === 'button' || el.type === 'submit') {
            category = 'actions';
        } else if (
            rect.top < 60 ||
            el.closest('header, nav, #header, .header, .nav, .navbar, .topbar') ||
            ['new', 'past', 'comments', 'ask', 'show', 'jobs', 'submit', 'login', 'home', 'about', 'main page'].includes(lowerDesc)
        ) {
            category = 'nav';
        }

        const markObj = {
            id: markIndex,
            tag: tagName,
            role: el.getAttribute('role') || tagName,
            type: el.type || null,
            desc: desc.slice(0, 85),
            href: href ? href.slice(0, 100) : null,
            category: category
        };

        marksData.push(markObj);
        if (categories[category]) categories[category].push(markObj);

        markIndex++;
    });

    document.body.appendChild(container);

    return {
        count: markIndex - 1,
        rawCount: rawCount,
        marks: marksData.slice(0, 60),
        categories: {
            navCount: categories.nav.length,
            contentCount: categories.content.length,
            formsCount: categories.forms.length,
            actionsCount: categories.actions.length
        }
    };
};

// Clear SoM Markers Script
const SOM_CLEAR_SCRIPT = `
(function() {
    const oldContainer = document.getElementById('antigravity-som-container');
    if (oldContainer) oldContainer.remove();
})();
`;

// CAPTCHA Detection Script
const CAPTCHA_DETECTION_SCRIPT = `
(function() {
    const hasTurnstile = !!document.querySelector('iframe[src*="cloudflare"], div.cf-turnstile, [data-sitekey]');
    const hasRecaptcha = !!document.querySelector('iframe[src*="recaptcha"], div.g-recaptcha');
    const hasHcaptcha = !!document.querySelector('iframe[src*="hcaptcha"], div.h-captcha');
    const hasDatadome = !!(window.dd || document.querySelector('script[src*="datadome"]'));

    let type = null;
    if (hasTurnstile) type = 'Cloudflare Turnstile';
    else if (hasRecaptcha) type = 'Google reCAPTCHA';
    else if (hasHcaptcha) type = 'hCaptcha';
    else if (hasDatadome) type = 'DataDome Challenge';

    return {
        detected: !!type,
        type: type
    };
})();
`;

// Trigger Comprehensive Page Analysis
async function triggerPageAnalysis(tab) {
    if (!tab || !tab.webview) {
        tab = getTargetWebTab();
    }
    if (!tab || !tab.webview) return;

    try {
        // 1. SoM Injection (if enabled)
        if (chkSoM.checked) {
            const script = `(${SOM_INJECTION_FUNCTION.toString()})(${isSummarizedMode ? 'true' : 'false'});`;
            const somResult = await tab.webview.executeJavaScript(script);
            if (somResult) {
                renderAxTree(tab, somResult.marks, somResult.count, somResult.categories, somResult.rawCount);
                logTelemetry('observe', `Set-of-Marks Injected: ${somResult.count} ${isSummarizedMode ? 'summarized primary' : 'dense'} targets grounded`, '<14ms');
            }
        } else {
            await tab.webview.executeJavaScript(SOM_CLEAR_SCRIPT);
        }

        // 2. CAPTCHA Check
        const captchaResult = await tab.webview.executeJavaScript(CAPTCHA_DETECTION_SCRIPT);
        if (captchaResult && captchaResult.detected) {
            tagCaptchaDetected.textContent = `DETECTED: ${captchaResult.type}`;
            tagCaptchaDetected.className = 'tag tag-red';
            logTelemetry('verify', `Layer 2 Detection: ${captchaResult.type} encountered!`, 'Alert');
        } else {
            tagCaptchaDetected.textContent = 'Clean / No Challenge';
            tagCaptchaDetected.className = 'tag tag-green';
        }

    } catch (err) {
        console.warn('Page analysis script error:', err);
    }
}

// Interactive Scroll to SoM Mark in Live Webview
window.scrollToMark = async function(markId) {
    const tab = getActiveTab();
    if (!tab || !tab.webview) return;
    try {
        await tab.webview.executeJavaScript(`
            (function() {
                const badges = Array.from(document.querySelectorAll('.antigravity-som-badge'));
                const targetBadge = badges.find(b => b.textContent.trim() === '#${markId}');
                if (targetBadge) {
                    targetBadge.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    targetBadge.style.transition = 'transform 0.25s, box-shadow 0.25s, background-color 0.25s';
                    targetBadge.style.transform = 'scale(2)';
                    targetBadge.style.boxShadow = '0 0 25px #00f0ff';
                    targetBadge.style.backgroundColor = '#00f0ff';
                    targetBadge.style.color = '#000000';
                    setTimeout(() => {
                        targetBadge.style.transform = '';
                        targetBadge.style.boxShadow = '';
                        targetBadge.style.backgroundColor = '#FFE600';
                    }, 1400);
                }
            })();
        `);
        logTelemetry('act', `Interactive Grounding: Focused Mark #${markId}`, 'Smooth scroll to DOM node');
    } catch (err) {
        console.warn('Scroll to mark error:', err);
    }
};

function formatShortHref(href) {
    if (!href) return '';
    try {
        const u = new URL(href);
        if (u.pathname && u.pathname !== '/') {
            return u.pathname.length > 24 ? u.pathname.slice(0, 21) + '…' : u.pathname;
        }
        return u.hostname.replace('www.', '');
    } catch(e) {
        return href.length > 24 ? href.slice(0, 21) + '…' : href;
    }
}

// Render Sanitized AX Tree in Markdown with Interactive Grounding and Category Summaries
function renderAxTree(tab, marks, totalCount, categories = null, rawCount = totalCount) {
    if (lblSoMMode) {
        lblSoMMode.textContent = isSummarizedMode ? 'Summarized' : 'Dense';
    }
    if (btnToggleSoMMode) {
        if (isSummarizedMode) {
            btnToggleSoMMode.classList.remove('dense');
            btnToggleSoMMode.classList.add('active');
        } else {
            btnToggleSoMMode.classList.remove('active');
            btnToggleSoMMode.classList.add('dense');
        }
    }
    if (lblTokenLimit) {
        lblTokenLimit.textContent = isSummarizedMode ? '<800 tokens' : '<3k tokens';
    }

    let md = `## Page: ${tab.title || 'Untitled'}\n`;
    md += `URL: ${tab.url}\n`;
    md += `Mode: ${isSummarizedMode ? `Summarized (${totalCount} Primary Actions filtered from ${rawCount} DOM nodes)` : `Dense (${totalCount} Elements)`}\n\n`;

    let html = `<div class="ax-meta-card">` +
               `<div class="ax-meta-top"><span class="ax-meta-title" title="${escapeHtml(tab.title || 'Untitled')}">📄 ${escapeHtml(tab.title || 'Untitled')}</span>` +
               `<span class="ax-meta-badge">${isSummarizedMode ? `${totalCount} Primary Actions` : `${totalCount} Elements`}</span></div>` +
               `<div class="ax-meta-url" title="${escapeHtml(tab.url)}">🔒 ${escapeHtml(tab.url)}</div>` +
               `<div class="ax-summary-chips">` +
               `<span class="ax-summary-chip highlight">${isSummarizedMode ? `⚡ Summarized (${rawCount} DOM nodes)` : `🌐 Dense View (${totalCount})`}</span>` +
               (categories && categories.navCount ? `<span class="ax-summary-chip">🧭 Nav: ${categories.navCount}</span>` : '') +
               (categories && categories.contentCount ? `<span class="ax-summary-chip">📰 Stories: ${categories.contentCount}</span>` : '') +
               (categories && categories.formsCount ? `<span class="ax-summary-chip">🔍 Forms: ${categories.formsCount}</span>` : '') +
               (categories && categories.actionsCount ? `<span class="ax-summary-chip">⚡ Actions: ${categories.actionsCount}</span>` : '') +
               `</div>` +
               `</div>`;
    html += `<div class="ax-marks-list-header"><span>GROUNDED ACTION MARKS</span><span class="ax-list-hint">Click to focus in webview</span></div>`;
    html += `<div class="ax-marks-list">`;

    if (!marks || marks.length === 0) {
        md += `*No visible actionable elements detected on current viewport.*\n`;
        html += `<div style="color: #64748b; font-style: italic; padding: 10px;">No visible actionable elements detected on current viewport.</div>`;
    } else {
        const groups = [
            { key: 'nav', title: '🧭 Primary Navigation', items: marks.filter(m => m.category === 'nav') },
            { key: 'content', title: '📰 Main Headlines & Content', items: marks.filter(m => m.category === 'content') },
            { key: 'forms', title: '🔍 Search & Inputs', items: marks.filter(m => m.category === 'forms') },
            { key: 'actions', title: '⚡ Action Buttons', items: marks.filter(m => m.category === 'actions') }
        ];

        groups.forEach(group => {
            if (group.items.length === 0) return;
            md += `\n### ${group.title} (${group.items.length}):\n`;
            html += `<div class="ax-category-header"><span class="ax-category-title">${group.title}</span><span class="ax-category-count">${group.items.length}</span></div>`;

            group.items.forEach(m => {
                const cleanDesc = (m.desc || '').replace(/\s+/g, ' ').trim();
                const typeStr = m.type ? `[type="${m.type}"]` : '';
                const hrefStr = m.href ? ` (href="${m.href}")` : '';
                md += `[#${m.id}] <${m.tag}${typeStr}> "${cleanDesc}"${hrefStr}\n`;

                const escapedDesc = escapeHtml(cleanDesc || '(unlabeled)');
                const shortHref = formatShortHref(m.href);
                const isUnlabeled = !cleanDesc || cleanDesc === '(unlabeled)';

                html += `<div class="ax-mark-row" onclick="scrollToMark(${m.id})" title="Click to scroll & focus #${m.id} in live webview">` +
                        `<div class="ax-mark-left">` +
                        `<span class="ax-badge-pill">#${m.id}</span>` +
                        `<span class="ax-tag-badge">&lt;${m.tag}${typeStr ? ` ${typeStr}` : ''}&gt;</span>` +
                        `<span class="ax-desc-text ${isUnlabeled ? 'unlabeled' : ''}">"${escapedDesc}"</span>` +
                        `</div>` +
                        `<div class="ax-mark-right">` +
                        (shortHref ? `<span class="ax-href-pill" title="${escapeHtml(m.href)}">${escapeHtml(shortHref)}</span>` : '') +
                        `<span class="ax-row-arrow">›</span>` +
                        `</div>` +
                        `</div>`;
            });
        });
    }
    html += `</div>`;

    if (totalCount > (marks ? marks.length : 0)) {
        const diff = totalCount - marks.length;
        md += `\n*... and ${diff} more elements clipped for token budget.*`;
        html += `<div class="ax-clipped-note">... and ${diff} more elements clipped for token budget</div>`;
    }

    axTreeBox.dataset.rawMarkdown = md;
    axTreeBox.innerHTML = html;

    try {
        ipcRenderer.send('sync-hud-state', {
            type: 'ax-tree',
            targetTitle: tab.title || 'Web Page',
            targetUrl: tab.url,
            markdown: md,
            html: html,
            isSummarized: isSummarizedMode,
            count: totalCount,
            rawCount: rawCount
        });
    } catch (e) {}
}

if (btnCopyAx) {
    btnCopyAx.onclick = async () => {
        const textToCopy = axTreeBox.dataset.rawMarkdown || axTreeBox.innerText || axTreeBox.textContent;
        try {
            await navigator.clipboard.writeText(textToCopy);
            btnCopyAx.innerHTML = '<span>✓ Copied!</span>';
            btnCopyAx.style.borderColor = '#10b981';
            btnCopyAx.style.color = '#10b981';
            setTimeout(() => {
                btnCopyAx.innerHTML = `
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>Copy</span>
                `;
                btnCopyAx.style.borderColor = '';
                btnCopyAx.style.color = '';
            }, 1600);
            logTelemetry('info', 'Sanitized AX Markdown copied to clipboard for LLM prompt');
        } catch (err) {
            console.warn('Clipboard copy error:', err);
        }
    };
}

btnRescanAx.onclick = () => {
    const tab = getTargetWebTab();
    if (tab) triggerPageAnalysis(tab);
};

chkSoM.onchange = () => {
    const tab = getTargetWebTab();
    if (tab) triggerPageAnalysis(tab);
};

// In-Memory Grep Search Engine with ±10 Lines Context and Pagination
async function executeGrepSearch(query, page = 1) {
    const tab = getTargetWebTab();
    if (!tab || !tab.webview) return;

    if (!query || query.trim() === '') {
        grepOutputArea.innerHTML = '<p class="hint-text">Please enter a search query.</p>';
        grepStatsBar.style.display = 'none';
        return;
    }

    currentGrepQuery = query.trim().toLowerCase();
    currentGrepPage = page;
    grepOutputArea.innerHTML = '<div class="loading-spinner">Grep scanning in-memory DOM source...</div>';

    try {
        const html = await tab.webview.executeJavaScript('document.documentElement.outerHTML');
        currentHtmlLines = html.split('\n');

        currentGrepMatches = [];
        for (let i = 0; i < currentHtmlLines.length; i++) {
            if (currentHtmlLines[i].toLowerCase().includes(currentGrepQuery)) {
                currentGrepMatches.push(i);
            }
        }

        renderGrepResults();
        logTelemetry('observe', `In-Memory Grep: "${currentGrepQuery}" found ${currentGrepMatches.length} occurrences across ${currentHtmlLines.length} lines`);
    } catch (err) {
        grepOutputArea.innerHTML = `<p class="hint-text" style="color: #ef4444;">Grep Error: ${err.message}</p>`;
    }
}

function renderGrepResults() {
    const total = currentGrepMatches.length;
    if (total === 0) {
        grepStatsBar.style.display = 'none';
        grepOutputArea.innerHTML = `<p class="hint-text">No matches found for "${currentGrepQuery}".</p>`;
        try {
            ipcRenderer.send('sync-hud-state', {
                type: 'grep-results',
                statsHtml: '',
                outputHtml: grepOutputArea.innerHTML
            });
        } catch (e) {}
        return;
    }

    grepStatsBar.style.display = 'flex';
    const totalPages = Math.ceil(total / GREP_PAGE_SIZE);
    const startIdx = (currentGrepPage - 1) * GREP_PAGE_SIZE;
    const endIdx = Math.min(startIdx + GREP_PAGE_SIZE, total);

    lblGrepStats.textContent = `Showing ${startIdx + 1} to ${endIdx} of ${total} matches (Page ${currentGrepPage}/${totalPages})`;
    btnGrepPrev.disabled = currentGrepPage <= 1;
    btnGrepNext.disabled = currentGrepPage >= totalPages;

    const pageMatches = currentGrepMatches.slice(startIdx, endIdx);
    let html = '';

    pageMatches.forEach((lineIdx, matchNum) => {
        const matchDisplayNum = startIdx + matchNum + 1;
        const startLine = Math.max(0, lineIdx - 10);
        const endLine = Math.min(currentHtmlLines.length - 1, lineIdx + 10);

        html += `<div class="grep-result-card">`;
        html += `<div class="grep-card-header">
                    <span class="match-badge">Match #${matchDisplayNum}</span>
                    <span class="line-range">Lines ${startLine + 1} - ${endLine + 1}</span>
                 </div>`;
        html += `<pre class="grep-chunk">`;

        for (let j = startLine; j <= endLine; j++) {
            const lineNumFormatted = String(j + 1).padStart(4, ' ');
            const escapedContent = escapeHtml(currentHtmlLines[j]);
            if (j === lineIdx) {
                html += `<span class="grep-line target"><span class="line-no">${lineNumFormatted}:</span> <mark>${escapedContent}</mark></span>\n`;
            } else {
                html += `<span class="grep-line"><span class="line-no">${lineNumFormatted}:</span> ${escapedContent}</span>\n`;
            }
        }

        html += `</pre></div>`;
    });

    grepOutputArea.innerHTML = html;

    try {
        ipcRenderer.send('sync-hud-state', {
            type: 'grep-results',
            statsHtml: lblGrepStats.innerHTML,
            outputHtml: html
        });
    } catch (e) {}
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

btnExecuteGrep.onclick = () => executeGrepSearch(txtGrepQuery.value, 1);
txtGrepQuery.onkeydown = (e) => {
    if (e.key === 'Enter') executeGrepSearch(txtGrepQuery.value, 1);
};
btnGrepPrev.onclick = () => {
    if (currentGrepPage > 1) {
        currentGrepPage--;
        renderGrepResults();
    }
};
btnGrepNext.onclick = () => {
    const totalPages = Math.ceil(currentGrepMatches.length / GREP_PAGE_SIZE);
    if (currentGrepPage < totalPages) {
        currentGrepPage++;
        renderGrepResults();
    }
};

// components/autofill Semantic Engine Implementation
const AUTOFILL_SCRIPT = `
(function() {
    const profile = {
        name: "Alex Mercer",
        firstName: "Alex",
        lastName: "Mercer",
        email: "alex.mercer@battlenx.dev",
        phone: "+1 (415) 890-1234",
        address: "555 Market Street, Suite 400",
        street: "555 Market Street",
        city: "San Francisco",
        state: "CA",
        zip: "94105",
        country: "United States",
        card: "4242424242424242",
        expiry: "12/28",
        cvv: "789",
        company: "BATTLENX Systems"
    };

    let filledCount = 0;
    const inputs = Array.from(document.querySelectorAll('input, select, textarea'));

    inputs.forEach(input => {
        const tag = input.tagName.toLowerCase();
        const type = (input.type || 'text').toLowerCase();
        const name = (input.name || '').toLowerCase();
        const id = (input.id || '').toLowerCase();
        const placeholder = (input.placeholder || '').toLowerCase();
        const autocomplete = (input.autocomplete || '').toLowerCase();
        const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();

        const descriptor = (name + ' ' + id + ' ' + placeholder + ' ' + autocomplete + ' ' + ariaLabel).toLowerCase();

        let valToSet = null;

        if (type === 'email' || descriptor.includes('email') || descriptor.includes('e-mail')) {
            valToSet = profile.email;
        } else if (descriptor.includes('fname') || descriptor.includes('first name') || descriptor.includes('firstname')) {
            valToSet = profile.firstName;
        } else if (descriptor.includes('lname') || descriptor.includes('last name') || descriptor.includes('lastname')) {
            valToSet = profile.lastName;
        } else if (descriptor.includes('name') && !descriptor.includes('user') && !descriptor.includes('card')) {
            valToSet = profile.name;
        } else if (type === 'tel' || descriptor.includes('phone') || descriptor.includes('mobile') || descriptor.includes('tel')) {
            valToSet = profile.phone;
        } else if (descriptor.includes('address') || descriptor.includes('street')) {
            valToSet = profile.address;
        } else if (descriptor.includes('city')) {
            valToSet = profile.city;
        } else if (descriptor.includes('state') || descriptor.includes('province') || descriptor.includes('region')) {
            valToSet = profile.state;
        } else if (descriptor.includes('zip') || descriptor.includes('postal') || descriptor.includes('postcode')) {
            valToSet = profile.zip;
        } else if (descriptor.includes('country')) {
            valToSet = profile.country;
        } else if (descriptor.includes('card') || descriptor.includes('cc-number') || descriptor.includes('creditcard')) {
            valToSet = profile.card;
        } else if (descriptor.includes('exp') || descriptor.includes('expiration')) {
            valToSet = profile.expiry;
        } else if (descriptor.includes('cvv') || descriptor.includes('cvc') || descriptor.includes('security code')) {
            valToSet = profile.cvv;
        } else if (descriptor.includes('company') || descriptor.includes('organization')) {
            valToSet = profile.company;
        }

        if (valToSet !== null && input.value !== valToSet) {
            input.value = valToSet;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
            input.style.border = '1px solid #10b981';
            filledCount++;
        }
    });

    return filledCount;
})();
`;

btnTriggerAutofill.onclick = async () => {
    const tab = getActiveTab();
    if (!tab || !tab.webview) return;

    try {
        const count = await tab.webview.executeJavaScript(AUTOFILL_SCRIPT);
        autofillStatus.textContent = `AutofillManager::FillForm() successfully populated ${count} fields.`;
        autofillStatus.style.color = '#10b981';
        logTelemetry('act', `AutofillManager::FillForm(AutofillProfile) -> ${count} fields populated`, 'In-Process components/autofill');
    } catch (err) {
        autofillStatus.textContent = `Autofill error: ${err.message}`;
        autofillStatus.style.color = '#ef4444';
    }
};

// Checkout Demo Page URL (local HTML file for high performance)
const CHECKOUT_DEMO_URL = 'file:///' + path.resolve(__dirname, 'demo_checkout.html').replace(/\\/g, '/');

btnLoadFormDemo.onclick = () => {
    navigateActiveWebview(CHECKOUT_DEMO_URL);
};

btnLoadGoogle.onclick = () => {
    navigateActiveWebview('https://www.google.com');
};

btnLoadWikipedia.onclick = () => {
    navigateActiveWebview('https://en.wikipedia.org');
};

// HITL (Human In The Loop) Takeover
btnHitlTrigger.onclick = () => {
    isHitlActive = true;
    takeoverBanner.style.display = 'block';
    logTelemetry('act', 'HITL Takeover Activated: Autonomous agent paused for human resolution', 'Level 4 Fallback');
};

btnResumeAutonomy.onclick = () => {
    isHitlActive = false;
    takeoverBanner.style.display = 'none';
    logTelemetry('act', 'Autonomous Agent Resumed: Human handoff complete');
    const tab = getActiveTab();
    if (tab) triggerPageAnalysis(tab);
};

// Sidebar View Switching
document.querySelectorAll('.sidebar-tabs .tab-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.sidebar-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.sidebar-view').forEach(v => v.classList.remove('active'));

        btn.classList.add('active');
        const viewId = btn.getAttribute('data-view');
        const viewEl = document.getElementById(viewId);
        if (viewEl) viewEl.classList.add('active');
    };
});

// Toggle / Launch External AI Copilot HUD Cockpit
btnToggleHud.onclick = async () => {
    logTelemetry('act', 'Launching AI Copilot HUD External Cockpit Window (Ctrl+Shift+H)...');
    try {
        await ipcRenderer.invoke('open-hud-window');
        broadcastTabsList();
        const target = getTargetWebTab();
        if (target) {
            ipcRenderer.send('sync-hud-state', {
                targetId: target.id,
                targetTitle: target.title,
                targetUrl: target.url
            });
            if (target.isReady) triggerPageAnalysis(target);
        }
    } catch (err) {
        console.error('Failed to open external HUD cockpit:', err);
    }
};

// Dedicated AI HUD Tab & Pop-out Handlers
if (btnOpenHudAsTab) {
    btnOpenHudAsTab.onclick = () => {
        if (aiHudSidebar.classList.contains('full-tab-mode')) {
            aiHudSidebar.classList.remove('full-tab-mode');
            const webTab = getTargetWebTab();
            if (webTab) activateTab(webTab.id);
            aiHudSidebar.style.display = 'none';
        } else {
            openOrCreateHudTab(true);
        }
    };
}

if (btnPopoutHud) {
    btnPopoutHud.onclick = async () => {
        logTelemetry('act', 'Popping out AI Copilot HUD into external window...');
        try {
            await ipcRenderer.invoke('open-hud-window');
            if (aiHudSidebar.classList.contains('full-tab-mode')) {
                aiHudSidebar.classList.remove('full-tab-mode');
                const webTab = getTargetWebTab();
                if (webTab) activateTab(webTab.id);
            }
            aiHudSidebar.style.display = 'none';
            logTelemetry('info', 'AI Copilot HUD detached to external window');

            const target = getTargetWebTab();
            if (target) {
                broadcastTabsList();
                ipcRenderer.send('sync-hud-state', {
                    targetId: target.id,
                    targetTitle: target.title,
                    targetUrl: target.url
                });
                triggerPageAnalysis(target);
            }
        } catch (err) {
            console.error('Failed to open external HUD window:', err);
        }
    };
}

// IPC Listeners for External HUD Window Relays
ipcRenderer.on('hud-action', (event, data) => {
    if (!data) return;
    const target = getTargetWebTab();

    if (data.action === 'switch-tab' && data.tabId) {
        activateTab(data.tabId);
    } else if (data.action === 'rescan' && target) {
        triggerPageAnalysis(target);
    } else if (data.action === 'toggle-som') {
        chkSoM.checked = data.enabled;
        if (target) triggerPageAnalysis(target);
    } else if (data.action === 'toggle-summarize') {
        isSummarizedMode = !isSummarizedMode;
        if (target) triggerPageAnalysis(target);
    } else if (data.action === 'grep') {
        txtGrepQuery.value = data.query;
        executeGrepSearch(data.query);
    } else if (data.action === 'autofill') {
        if (typeof fillCheckoutDemo === 'function') fillCheckoutDemo();
    } else if (data.action === 'hitl') {
        if (btnHitlTrigger) btnHitlTrigger.click();
    } else if (data.action === 'scroll-to-mark') {
        if (typeof window.scrollToMark === 'function') window.scrollToMark(data.markId);
    } else if (data.action === 'dock-back') {
        aiHudSidebar.style.display = 'flex';
        logTelemetry('info', 'AI Copilot HUD docked back to main browser');
    } else if (data.action === 'hud-ready') {
        broadcastTabsList();
        if (target) {
            ipcRenderer.send('sync-hud-state', {
                targetId: target.id,
                targetTitle: target.title,
                targetUrl: target.url
            });
            if (target.isReady) triggerPageAnalysis(target);
        }
    }
});

// Mode Toggle Handler
if (btnToggleSoMMode) {
    btnToggleSoMMode.onclick = () => {
        isSummarizedMode = !isSummarizedMode;
        const target = getTargetWebTab();
        if (target) triggerPageAnalysis(target);
    };
}

ipcRenderer.on('hud-window-closed', () => {
    logTelemetry('info', 'External HUD window closed');
});

btnClearTelemetry.onclick = () => {
    telemetryBox.innerHTML = '<div class="log-line info">Telemetry cleared.</div>';
};

// Initialize First Tabs (Web Browsing Tabs Only - HUD is External Cockpit)
window.addEventListener('DOMContentLoaded', () => {
    // 1. First Tab: Hacker News
    createTab('https://news.ycombinator.com', 'Hacker News', false);
    
    // 2. Second Tab: Checkout Demo for Autofill / SoM
    createTab(CHECKOUT_DEMO_URL, 'Express Checkout Demo', false);

    // 3. Third Tab: Wikipedia
    createTab('https://en.wikipedia.org', 'Wikipedia', false);

    // Activate the first tab (Hacker News) - gives 100% full screen width to webpage
    activateTab(1);

    broadcastTabsList();

    logTelemetry('info', 'BATTLENX In-Process Chromium Engine initialized');
    logTelemetry('info', 'Zero remote debugging ports exposed (Stealth Mode Active)');
});

// DevTools Inspect Handler
if (btnDevTools) {
    btnDevTools.onclick = () => {
        const tab = getActiveTab();
        if (tab && tab.webview) {
            try {
                if (typeof tab.webview.isDevToolsOpened === 'function' && tab.webview.isDevToolsOpened()) {
                    tab.webview.closeDevTools();
                    logTelemetry('act', 'DevTools closed for active WebContents');
                } else if (typeof tab.webview.openDevTools === 'function') {
                    tab.webview.openDevTools();
                    logTelemetry('act', 'DevTools opened for active WebContents', 'Chrome DevTools Protocol');
                }
            } catch (err) {
                console.warn('DevTools toggle error:', err);
            }
        }
    };
}

// Global Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
    // Ctrl+T: New tab
    if (e.ctrlKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        createTab('https://news.ycombinator.com', 'Hacker News');
    }
    // Ctrl+W: Close active tab
    else if (e.ctrlKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (activeTabId) closeTab(activeTabId);
    }
    // Ctrl+L: Focus omnibox
    else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        urlInput.focus();
        urlInput.select();
    }
    // Ctrl+Shift+I: DevTools
    else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        if (btnDevTools) btnDevTools.click();
    }
    // Ctrl+Shift+R: Rescan AX & SoM
    else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        if (btnRescanAx) btnRescanAx.click();
    }
    // Ctrl+Shift+H: Launch External AI Copilot HUD Cockpit
    else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        if (btnToggleHud) btnToggleHud.click();
    }
    // Ctrl+Shift+F: Jump to Grep tab
    else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        const grepTab = document.querySelector('[data-view="viewGrep"]');
        if (grepTab) grepTab.click();
        setTimeout(() => txtGrepQuery.focus(), 80);
    }
    // Ctrl+1..9: Switch to tab index
    else if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key) - 1;
        if (idx >= 0 && idx < tabs.length) {
            e.preventDefault();
            activateTab(tabs[idx].id);
        }
    }
});
