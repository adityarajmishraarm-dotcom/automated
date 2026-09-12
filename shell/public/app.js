// State management
let state = {
    tabs: [],
    activeTabId: 1,
    extractedElements: [],
    grepQuery: 'search-query',
    grepOffset: 0,
    grepLimit: 10,
    grepData: null,
    somEnabled: true,
    hitlActive: false
};

// DOM Elements
const tabList = document.getElementById('tabList');
const btnNewTab = document.getElementById('btnNewTab');
const omniboxInput = document.getElementById('omniboxInput');
const btnNavigate = document.getElementById('btnNavigate');
const btnBack = document.getElementById('btnBack');
const btnForward = document.getElementById('btnForward');
const btnReload = document.getElementById('btnReload');
const webViewport = document.getElementById('webViewport');
const somOverlayLayer = document.getElementById('somOverlayLayer');
const toggleSoM = document.getElementById('toggleSoM');
const axMarkdownDisplay = document.getElementById('axMarkdownDisplay');
const btnRefreshAx = document.getElementById('btnRefreshAx');
const btnAtomicCapture = document.getElementById('btnAtomicCapture');
const somBadgesSummary = document.getElementById('somBadgesSummary');
const grepQueryInput = document.getElementById('grepQueryInput');
const btnRunGrep = document.getElementById('btnRunGrep');
const grepPaginationBar = document.getElementById('grepPaginationBar');
const grepMatchStats = document.getElementById('grepMatchStats');
const btnGrepPrev = document.getElementById('btnGrepPrev');
const btnGrepNext = document.getElementById('btnGrepNext');
const grepResultsDisplay = document.getElementById('grepResultsDisplay');
const btnRunAutofill = document.getElementById('btnRunAutofill');
const autofillLog = document.getElementById('autofillLog');
const btnToggleHitl = document.getElementById('btnToggleHitl');
const hitlBanner = document.getElementById('hitlBanner');
const btnResumeAgent = document.getElementById('btnResumeAgent');
const badgeDetectedChallenge = document.getElementById('badgeDetectedChallenge');
const telemetryLog = document.getElementById('telemetryLog');
const btnClearLog = document.getElementById('btnClearLog');

// Initialize
async function init() {
    setupHudTabs();
    setupEventListeners();
    await fetchTabs();
}

// HUD Tab switching
function setupHudTabs() {
    const tabs = document.querySelectorAll('.hud-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const targetId = 'view' + tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1);
            document.querySelectorAll('.hud-view').forEach(v => v.classList.remove('active'));
            const targetView = document.getElementById(targetId);
            if (targetView) targetView.classList.add('active');
        });
    });
}

// Fetch tabs from in-process tab strip model
async function fetchTabs() {
    try {
        const res = await fetch('/api/tabs');
        const data = await res.json();
        state.tabs = data.tabs;
        state.activeTabId = data.activeTabId;
        renderTabs();
        loadActiveTab();
    } catch (e) {
        console.error('Failed to fetch tabs', e);
    }
}

// Render Tabs in TabStripModel bar
function renderTabs() {
    tabList.innerHTML = '';
    state.tabs.forEach(tab => {
        const el = document.createElement('div');
        el.className = `browser-tab ${tab.id === state.activeTabId ? 'active' : ''}`;
        el.innerHTML = `
            <span>📄</span>
            <span class="tab-title" title="${tab.url}">${tab.title}</span>
            <button class="tab-close-btn" title="Close Tab">×</button>
        `;

        el.querySelector('.tab-title').addEventListener('click', () => switchTab(tab.id));
        el.querySelector('span:first-child').addEventListener('click', () => switchTab(tab.id));
        el.querySelector('.tab-close-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            closeTab(tab.id);
        });

        tabList.appendChild(el);
    });
}

// Tab actions
async function switchTab(id) {
    const res = await fetch('/api/tab/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
    const data = await res.json();
    state.activeTabId = data.activeTabId;
    renderTabs();
    loadActiveTab();
    logTelemetry('action', `TabStripModel::ActivateTabAt id=${id}`);
}

async function closeTab(id) {
    const res = await fetch('/api/tab/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
    const data = await res.json();
    state.tabs = data.tabs;
    state.activeTabId = data.activeTabId;
    renderTabs();
    loadActiveTab();
    logTelemetry('info', `TabStripModel::CloseWebContentsAt id=${id}`);
}

async function createNewTab() {
    const res = await fetch('/api/tab/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: "New Tab", url: "https://example.com" })
    });
    const data = await res.json();
    await fetchTabs();
    logTelemetry('action', `TabStripModel::InsertWebContentsAt new tab created`);
}

// Load active tab into iframe
function loadActiveTab() {
    const tab = state.tabs.find(t => t.id === state.activeTabId);
    if (!tab) return;

    omniboxInput.value = tab.url;

    // Write source HTML directly to viewport iframe
    webViewport.srcdoc = tab.source_html;

    webViewport.onload = () => {
        extractInteractiveElements();
        checkCaptchaSignatures(tab.source_html);
        runGrepSearch(state.grepQuery, 0);
        logTelemetry('info', `WebContents LoadURL committed: ${tab.url}`);
    };
}

// Extract interactive elements and render Set-of-Marks overlay
function extractInteractiveElements() {
    const doc = webViewport.contentDocument || webViewport.contentWindow.document;
    if (!doc) return;

    const interactiveSelectors = [
        'a[href]', 'button', 'input:not([type="hidden"])', 'textarea', 'select',
        '[role="button"]', '[role="link"]', '[role="textbox"]', '[role="checkbox"]',
        '[onclick]', '[tabindex]:not([tabindex="-1"])'
    ];

    const nodes = Array.from(doc.querySelectorAll(interactiveSelectors.join(',')));
    state.extractedElements = [];
    let idCounter = 1;

    nodes.forEach(node => {
        const rect = node.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const style = doc.defaultView.getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;

        const role = node.getAttribute('role') || node.tagName.toLowerCase();
        const name = node.getAttribute('aria-label') || node.getAttribute('title') || node.getAttribute('placeholder') || node.innerText || node.getAttribute('name') || role;

        state.extractedElements.push({
            id: idCounter++,
            node: node,
            tag: node.tagName,
            role: role,
            name: name.trim().replace(/\s+/g, ' ').slice(0, 80),
            placeholder: node.getAttribute('placeholder') || '',
            type: node.getAttribute('type') || '',
            rect: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            }
        });
    });

    renderSoMOverlay();
    renderAxMarkdown();
}

// Render Set-of-Marks (SoM) #FFE600 bounding boxes and badges
function renderSoMOverlay() {
    somOverlayLayer.innerHTML = '';
    somBadgesSummary.innerHTML = '';

    if (!state.somEnabled) return;

    state.extractedElements.forEach(el => {
        // Overlay Box
        const box = document.createElement('div');
        box.className = 'som-box';
        box.style.left = `${el.rect.x}px`;
        box.style.top = `${el.rect.y}px`;
        box.style.width = `${el.rect.width}px`;
        box.style.height = `${el.rect.height}px`;

        const pill = document.createElement('span');
        pill.className = 'som-badge';
        pill.innerText = `[#${el.id}]`;

        box.appendChild(pill);
        somOverlayLayer.appendChild(box);

        // Sidebar Summary item
        const summaryItem = document.createElement('div');
        summaryItem.className = 'som-item';
        summaryItem.innerHTML = `
            <span class="som-badge-tag">[#${el.id}]</span>
            <span><strong>${el.role}:</strong> "${el.name}"</span>
        `;
        somBadgesSummary.appendChild(summaryItem);
    });
}

// Render token-efficient AX Markdown (<3k tokens)
function renderAxMarkdown() {
    const tab = state.tabs.find(t => t.id === state.activeTabId);
    let md = `## Current Page: ${tab ? tab.title : 'Untitled'} (${tab ? tab.url : ''})\n`;
    md += `Active Tab ID: ${state.activeTabId} | Viewport: 1280x800\n\n`;
    md += `### Interactive Elements (${state.extractedElements.length} actionable items):\n`;

    state.extractedElements.forEach(el => {
        md += `[#${el.id}] ${el.role}: "${el.name}"`;
        if (el.placeholder) md += ` (placeholder: "${el.placeholder}")`;
        if (el.type && el.type !== 'text') md += ` [type=${el.type}]`;
        md += `\n`;
    });

    axMarkdownDisplay.innerText = md;
}

// In-Memory Grep Engine with ±10 Context Lines & Pagination
async function runGrepSearch(query, offset = 0) {
    if (!query) return;
    state.grepQuery = query;
    state.grepOffset = offset;

    try {
        const res = await fetch('/api/grep', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, offset, limit: state.grepLimit })
        });
        const data = await res.json();
        state.grepData = data;
        renderGrepResults();
    } catch (e) {
        console.error('Grep failed', e);
    }
}

function renderGrepResults() {
    const data = state.grepData;
    if (!data || data.totalMatches === 0) {
        grepResultsDisplay.innerHTML = `<p class="empty-hint">No occurrences of '${state.grepQuery}' found.</p>`;
        grepPaginationBar.style.display = 'none';
        return;
    }

    grepPaginationBar.style.display = 'flex';
    const startNum = data.currentOffset + 1;
    const endNum = data.currentOffset + data.returnedCount;
    grepMatchStats.innerText = `Showing ${startNum} to ${endNum} of ${data.totalMatches} matches`;

    btnGrepPrev.disabled = (data.currentOffset === 0);
    btnGrepNext.disabled = !data.hasMore;

    grepResultsDisplay.innerHTML = '';

    data.matches.forEach((m, idx) => {
        const card = document.createElement('div');
        card.className = 'grep-match-card';

        let content = `<div class="match-header">Match #${data.currentOffset + idx + 1} [Line ${m.lineNumber}]</div>`;

        // Top 10 lines
        const topStartLine = m.lineNumber - m.topLines.length;
        m.topLines.forEach((tl, i) => {
            content += `<div class="grep-line">${topStartLine + i}: ${escapeHtml(tl)}</div>`;
        });

        // Matched line
        content += `<div class="grep-line matched">>>> ${m.lineNumber}: ${escapeHtml(m.matchedLine)}</div>`;

        // Bottom 10 lines
        m.bottomLines.forEach((bl, i) => {
            content += `<div class="grep-line">${m.lineNumber + 1 + i}: ${escapeHtml(bl)}</div>`;
        });

        card.innerHTML = content;
        grepResultsDisplay.appendChild(card);
    });
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Autofill execution using components/autofill semantics
function runAutofill() {
    const doc = webViewport.contentDocument || webViewport.contentWindow.document;
    if (!doc) return;

    const profile = {
        'name': 'Alex Mercer',
        'email': 'alex.mercer@ai-browser.dev',
        'address-line1': '123 Tech Blvd, Suite 400',
        'address-level2': 'San Francisco',
        'cc-number': '4111 2222 3333 4444'
    };

    let filledCount = 0;
    Object.keys(profile).forEach(acAttr => {
        const input = doc.querySelector(`[autocomplete="${acAttr}"]`) || doc.querySelector(`[name*="${acAttr.split('-')[0]}"]`);
        if (input) {
            input.value = profile[acAttr];
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            filledCount++;
        }
    });

    autofillLog.innerText = `AutofillManager::FillForm() successfully populated ${filledCount} semantic form fields.`;
    logTelemetry('success', `AutofillManager::FillForm() populated ${filledCount} fields`);
    extractInteractiveElements();
}

// CAPTCHA Detection
function checkCaptchaSignatures(html) {
    if (html.includes('cf-turnstile') || html.includes('challenges.cloudflare.com')) {
        badgeDetectedChallenge.innerText = 'Cloudflare Turnstile Active';
        badgeDetectedChallenge.className = 'badge badge-yellow';
    } else if (html.includes('g-recaptcha')) {
        badgeDetectedChallenge.innerText = 'Google reCAPTCHA Active';
        badgeDetectedChallenge.className = 'badge badge-blue';
    } else {
        badgeDetectedChallenge.innerText = 'None Detected';
        badgeDetectedChallenge.className = 'badge badge-green';
    }
}

// Telemetry Logger
function logTelemetry(type, message) {
    const time = new Date().toTimeString().split(' ')[0];
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `<span class="time">${time}</span> ${escapeHtml(message)}`;
    telemetryLog.appendChild(entry);
    telemetryLog.scrollTop = telemetryLog.scrollHeight;
}

// Event Listeners setup
function setupEventListeners() {
    btnNewTab.addEventListener('click', createNewTab);

    btnNavigate.addEventListener('click', () => {
        const url = omniboxInput.value.trim();
        if (url) {
            fetch('/api/tab/navigate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            }).then(() => fetchTabs());
        }
    });

    omniboxInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btnNavigate.click();
    });

    toggleSoM.addEventListener('change', (e) => {
        state.somEnabled = e.target.checked;
        somOverlayLayer.style.display = state.somEnabled ? 'block' : 'none';
        logTelemetry('info', `Set-of-Marks overlay toggled: ${state.somEnabled ? 'ON' : 'OFF'}`);
    });

    btnAtomicCapture.addEventListener('click', () => {
        // Simulate atomic inject -> capture -> remove in <16ms
        somOverlayLayer.style.display = 'block';
        setTimeout(() => {
            somOverlayLayer.style.display = state.somEnabled ? 'block' : 'none';
            logTelemetry('action', `Atomic SoM Frame Captured & Purged in 14.2ms`);
            alert('Atomic Capture Sequence Completed: Frame buffered for VLM in 14.2ms');
        }, 16);
    });

    btnRefreshAx.addEventListener('click', () => {
        extractInteractiveElements();
        logTelemetry('info', `DOM re-scanned: ${state.extractedElements.length} elements`);
    });

    btnRunGrep.addEventListener('click', () => {
        const query = grepQueryInput.value.trim();
        runGrepSearch(query, 0);
    });

    grepQueryInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btnRunGrep.click();
    });

    btnGrepPrev.addEventListener('click', () => {
        const newOffset = Math.max(0, state.grepOffset - state.grepLimit);
        runGrepSearch(state.grepQuery, newOffset);
    });

    btnGrepNext.addEventListener('click', () => {
        if (state.grepData && state.grepData.hasMore) {
            runGrepSearch(state.grepQuery, state.grepData.nextOffset);
        }
    });

    btnRunAutofill.addEventListener('click', runAutofill);

    btnToggleHitl.addEventListener('click', () => {
        state.hitlActive = true;
        hitlBanner.style.display = 'block';
        logTelemetry('action', `[HITL] Human Takeover initiated. Autonomous loop paused.`);
    });

    btnResumeAgent.addEventListener('click', () => {
        state.hitlActive = false;
        hitlBanner.style.display = 'none';
        logTelemetry('success', `[HITL] Verification resolved by human. Autonomous loop resumed.`);
    });

    btnClearLog.addEventListener('click', () => {
        telemetryLog.innerHTML = '';
    });
}

// Start application
window.addEventListener('DOMContentLoaded', init);
