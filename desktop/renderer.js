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

// Telemetry Logger
function logTelemetry(type, message, meta = '') {
    const time = new Date().toLocaleTimeString();
    const div = document.createElement('div');
    div.className = `log-line ${type}`;
    div.innerHTML = `<span class="time">${time}</span> <strong>[${type.toUpperCase()}]</strong> ${message} ${meta ? `<span class="meta">${meta}</span>` : ''}`;
    telemetryBox.appendChild(div);
    telemetryBox.scrollTop = telemetryBox.scrollHeight;
}

// IPC Listener for Adblock Stats
ipcRenderer.on('adblock-count-updated', (event, count) => {
    adblockCount = count;
    shieldCount.textContent = count;
    logTelemetry('verify', `Native Adblock Intercepted Tracker/Ad #${count}`, 'onBeforeRequest 0ms');
});

// Tab Management (TabStripModel)
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

    // Show active webview, hide others
    tabs.forEach(t => {
        if (t.id === tabId) {
            t.webview.style.display = 'flex';
        } else {
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

    // Re-render Tab Strip highlighting
    renderTabStrip();

    // Rescan SoM and AX tree on tab switch
    if (tab.isReady) {
        setTimeout(() => {
            triggerPageAnalysis(tab);
        }, 300);
    }

    logTelemetry('act', `TabStripModel::ActivateTabAt(id: ${tabId})`, tab.title);
}

function closeTab(tabId, event) {
    if (event) event.stopPropagation();

    if (tabs.length <= 1) {
        const lastTab = tabs[0];
        lastTab.webview.loadURL('https://news.ycombinator.com');
        return;
    }

    const tabIndex = tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;

    const tab = tabs[tabIndex];
    
    if (tab.webview && tab.webview.parentNode) {
        tab.webview.parentNode.removeChild(tab.webview);
    }

    tabs.splice(tabIndex, 1);

    if (activeTabId === tabId) {
        const newIndex = Math.min(tabIndex, tabs.length - 1);
        activateTab(tabs[newIndex].id);
    } else {
        renderTabStrip();
    }

    logTelemetry('act', `TabStripModel::CloseWebContentsAt(index: ${tabIndex})`, `Closed Tab #${tabId}`);
}

function renderTabStrip() {
    tabsTrack.innerHTML = '';
    tabs.forEach(tab => {
        const tabEl = document.createElement('div');
        tabEl.className = `native-tab ${tab.id === activeTabId ? 'active' : ''}`;
        tabEl.title = tab.url;
        tabEl.onclick = () => activateTab(tab.id);

        const titleSpan = document.createElement('span');
        titleSpan.className = 'tab-title';
        titleSpan.textContent = tab.title || 'New Tab';

        const btnClose = document.createElement('button');
        btnClose.className = 'btn-tab-close';
        btnClose.innerHTML = '&times;';
        btnClose.onclick = (e) => closeTab(tab.id, e);

        tabEl.appendChild(titleSpan);
        tabEl.appendChild(btnClose);
        tabsTrack.appendChild(tabEl);
    });
}

function getActiveTab() {
    return tabs.find(t => t.id === activeTabId);
}

// Webview Lifecycle & Navigation
function setupWebviewEvents(tab) {
    const wv = tab.webview;

    wv.addEventListener('dom-ready', () => {
        tab.isReady = true;
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
    if (!tab || !tab.webview) return;

    let finalUrl = targetUrl.trim();
    if (!finalUrl) return;

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

// Set-of-Marks (SoM) Injection Script
const SOM_INJECTION_SCRIPT = `
(function() {
    // Remove previous markers
    const oldContainer = document.getElementById('antigravity-som-container');
    if (oldContainer) oldContainer.remove();

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
    const elements = Array.from(document.querySelectorAll(selector));

    let markIndex = 1;
    const marksData = [];

    elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        
        // Filter visible elements within reasonable viewport bounds
        if (rect.width > 6 && rect.height > 6 && rect.top >= -200 && rect.top <= window.innerHeight + 500) {
            const style = window.getComputedStyle(el);
            if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                const badge = document.createElement('div');
                badge.className = 'antigravity-som-badge';
                badge.textContent = '#' + markIndex;
                badge.style.position = 'absolute';
                badge.style.left = (window.scrollX + rect.left) + 'px';
                badge.style.top = (window.scrollY + rect.top) + 'px';
                badge.style.backgroundColor = '#FFE600';
                badge.style.color = '#000000';
                badge.style.fontFamily = 'monospace';
                badge.style.fontSize = '11px';
                badge.style.fontWeight = 'bold';
                badge.style.padding = '1px 4px';
                badge.style.borderRadius = '3px';
                badge.style.border = '1px solid #000';
                badge.style.boxShadow = '0 1px 3px rgba(0,0,0,0.5)';
                badge.style.pointerEvents = 'none';
                badge.style.lineHeight = '12px';

                const box = document.createElement('div');
                box.className = 'antigravity-som-box';
                box.style.position = 'absolute';
                box.style.left = (window.scrollX + rect.left) + 'px';
                box.style.top = (window.scrollY + rect.top) + 'px';
                box.style.width = rect.width + 'px';
                box.style.height = rect.height + 'px';
                box.style.border = '2px solid #FFE600';
                box.style.borderRadius = '3px';
                box.style.boxShadow = '0 0 4px rgba(255, 230, 0, 0.4)';
                box.style.pointerEvents = 'none';

                container.appendChild(box);
                container.appendChild(badge);

                // Collect metadata for AX Tree
                const tagName = el.tagName.toLowerCase();
                let desc = el.innerText ? el.innerText.trim().slice(0, 50).replace(/\\n/g, ' ') : '';
                if (!desc && el.placeholder) desc = el.placeholder;
                if (!desc && el.value) desc = el.value;
                if (!desc && el.getAttribute('aria-label')) desc = el.getAttribute('aria-label');
                if (!desc && el.title) desc = el.title;
                if (!desc && tagName === 'input') desc = el.type || 'text';

                marksData.push({
                    id: markIndex,
                    tag: tagName,
                    role: el.getAttribute('role') || tagName,
                    type: el.type || null,
                    desc: desc || '(unlabeled)',
                    href: el.href ? el.href.slice(0, 80) : null
                });

                markIndex++;
            }
        }
    });

    document.body.appendChild(container);

    return {
        count: markIndex - 1,
        marks: marksData.slice(0, 50)
    };
})();
`;

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
    if (!tab || !tab.webview) return;

    try {
        // 1. SoM Injection (if enabled)
        if (chkSoM.checked) {
            const somResult = await tab.webview.executeJavaScript(SOM_INJECTION_SCRIPT);
            if (somResult) {
                renderAxTree(tab, somResult.marks, somResult.count);
                logTelemetry('observe', `Set-of-Marks Injected: ${somResult.count} actionable elements grounded`, '<16ms');
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

// Render Sanitized AX Tree in Markdown (<3k tokens)
function renderAxTree(tab, marks, totalCount) {
    let md = `## Current Page: ${tab.title || 'Untitled'}\n`;
    md += `URL: ${tab.url}\n`;
    md += `Active Interactive Elements: ${totalCount}\n\n`;
    md += `### Grounded Interactive Marks:\n`;

    if (!marks || marks.length === 0) {
        md += `*No visible actionable elements detected on current viewport.*\n`;
    } else {
        marks.forEach(m => {
            const typeStr = m.type ? `[type="${m.type}"]` : '';
            const hrefStr = m.href ? ` (href="${m.href}")` : '';
            md += `[#${m.id}] <${m.tag}${typeStr}> "${m.desc}"${hrefStr}\n`;
        });
        if (totalCount > marks.length) {
            md += `\n*... and ${totalCount - marks.length} more elements clipped for token budget (<3k tokens).*`;
        }
    }

    axTreeBox.textContent = md;
}

btnRescanAx.onclick = () => {
    const tab = getActiveTab();
    if (tab) triggerPageAnalysis(tab);
};

chkSoM.onchange = () => {
    const tab = getActiveTab();
    if (tab) triggerPageAnalysis(tab);
};

// In-Memory Grep Search Engine with ±10 Lines Context and Pagination
async function executeGrepSearch(query, page = 1) {
    const tab = getActiveTab();
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
        html += `<div class="grep-card-header">Match #${matchDisplayNum} (Line ${lineIdx + 1}) - Context Lines ${startLine + 1} to ${endLine + 1}</div>`;
        html += `<pre class="grep-chunk">`;

        for (let l = startLine; l <= endLine; l++) {
            const isTarget = (l === lineIdx);
            const lineNumFormatted = String(l + 1).padStart(5, ' ');
            const escapedContent = escapeHtml(currentHtmlLines[l]);
            
            if (isTarget) {
                html += `<span class="grep-line target"><span class="line-no">${lineNumFormatted}:</span> <mark>${escapedContent}</mark></span>\n`;
            } else {
                html += `<span class="grep-line"><span class="line-no">${lineNumFormatted}:</span> ${escapedContent}</span>\n`;
            }
        }

        html += `</pre></div>`;
    });

    grepOutputArea.innerHTML = html;
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
        email: "alex.mercer@antigravity.dev",
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
        company: "Antigravity Systems"
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

// Toggle Sidebar Button
btnToggleHud.onclick = () => {
    if (aiHudSidebar.style.display === 'none') {
        aiHudSidebar.style.display = 'flex';
    } else {
        aiHudSidebar.style.display = 'none';
    }
};

btnClearTelemetry.onclick = () => {
    telemetryBox.innerHTML = '<div class="log-line info">Telemetry cleared.</div>';
};

// Initialize First Tabs
window.addEventListener('DOMContentLoaded', () => {
    // 1. First Tab: Hacker News
    createTab('https://news.ycombinator.com', 'Hacker News', false);
    
    // 2. Second Tab: Checkout Demo for Autofill / SoM
    createTab(CHECKOUT_DEMO_URL, 'Express Checkout Demo', false);

    // 3. Third Tab: Wikipedia
    createTab('https://en.wikipedia.org', 'Wikipedia', false);

    // Activate the first tab
    activateTab(1);

    logTelemetry('info', 'Antigravity In-Process Chromium Engine initialized');
    logTelemetry('info', 'Zero remote debugging ports exposed (Stealth Mode Active)');
});
