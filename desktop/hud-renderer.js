/**
 * Antigravity AI Copilot & Core Engine Cockpit - Window Renderer
 * Relays actions to the main browser process and renders live synchronized AX Tree,
 * Set-of-Marks grounding, Grep, Autofill, Anti-Bot Defense, and Live Telemetry.
 */

const { ipcRenderer } = require('electron');

// DOM Elements
const targetTabTitle = document.getElementById('targetTabTitle');
const selTargetTab = document.getElementById('selTargetTab');
const btnFocusBrowser = document.getElementById('btnFocusBrowser');
const chkSoMExternal = document.getElementById('chkSoMExternal');
const btnDockBack = document.getElementById('btnDockBack');
const btnCopyAxExternal = document.getElementById('btnCopyAxExternal');
const btnRescanAxExternal = document.getElementById('btnRescanAxExternal');
const axTreeBoxExternal = document.getElementById('axTreeBoxExternal');
const txtFilterMarksExternal = document.getElementById('txtFilterMarksExternal');
const lblFilteredCount = document.getElementById('lblFilteredCount');

const txtGrepQueryExternal = document.getElementById('txtGrepQueryExternal');
const btnExecuteGrepExternal = document.getElementById('btnExecuteGrepExternal');
const grepStatsBarExternal = document.getElementById('grepStatsBarExternal');
const lblGrepStatsExternal = document.getElementById('lblGrepStatsExternal');
const grepOutputAreaExternal = document.getElementById('grepOutputAreaExternal');

const btnTriggerAutofillExternal = document.getElementById('btnTriggerAutofillExternal');
const autofillStatusExternal = document.getElementById('autofillStatusExternal');

const tagCaptchaExternal = document.getElementById('tagCaptchaExternal');
const btnHitlTriggerExternal = document.getElementById('btnHitlTriggerExternal');

const telemetryBoxExternal = document.getElementById('telemetryBoxExternal');
const btnClearTelemetryExternal = document.getElementById('btnClearTelemetryExternal');

const btnToggleSoMModeExternal = document.getElementById('btnToggleSoMModeExternal');
const lblSoMModeExternal = document.getElementById('lblSoMModeExternal');
const lblTokenLimitExternal = document.getElementById('lblTokenLimitExternal');

let latestMarkdown = '';

// Tab Switching inside External HUD Cockpit
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.sidebar-view').forEach(v => v.classList.remove('active'));

        btn.classList.add('active');
        const viewId = btn.getAttribute('data-view');
        const targetView = document.getElementById(viewId);
        if (targetView) targetView.classList.add('active');
    });
});

// Target Tab Dropdown Switcher
if (selTargetTab) {
    selTargetTab.addEventListener('change', () => {
        const tabId = parseInt(selTargetTab.value, 10);
        if (tabId) {
            ipcRenderer.send('hud-action', { action: 'switch-tab', tabId: tabId });
        }
    });
}

// Bring Main Browser Window to Front
if (btnFocusBrowser) {
    btnFocusBrowser.addEventListener('click', async () => {
        try {
            await ipcRenderer.invoke('focus-browser-window');
        } catch (e) {
            console.warn('Failed to focus browser window:', e);
        }
    });
}

// Dock back to main window (secondary fallback)
if (btnDockBack) {
    btnDockBack.onclick = () => {
        ipcRenderer.send('hud-action', { action: 'dock-back' });
        window.close();
    };
}

// Rescan DOM
if (btnRescanAxExternal) {
    btnRescanAxExternal.onclick = () => {
        axTreeBoxExternal.innerHTML = '<div class="loading-spinner">Requesting live DOM scan from Chromium core...</div>';
        ipcRenderer.send('hud-action', { action: 'rescan' });
    };
}

// Copy AX Tree Markdown
if (btnCopyAxExternal) {
    btnCopyAxExternal.onclick = async () => {
        if (!latestMarkdown) return;
        try {
            await navigator.clipboard.writeText(latestMarkdown);
            btnCopyAxExternal.innerHTML = '<span>✓ Copied!</span>';
            setTimeout(() => {
                btnCopyAxExternal.innerHTML = `
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>Copy AX</span>
                `;
            }, 1600);
        } catch (e) {
            console.warn('Clipboard copy error:', e);
        }
    };
}

// SoM Toggle
if (chkSoMExternal) {
    chkSoMExternal.onchange = () => {
        ipcRenderer.send('hud-action', { action: 'toggle-som', enabled: chkSoMExternal.checked });
    };
}

// Mode Toggle Handler (Summarized vs Dense)
if (btnToggleSoMModeExternal) {
    btnToggleSoMModeExternal.onclick = () => {
        ipcRenderer.send('hud-action', { action: 'toggle-summarize' });
    };
}

// Mark Real-Time Filter Function
function applyMarkFilter() {
    if (!txtFilterMarksExternal || !axTreeBoxExternal) return;
    const filter = txtFilterMarksExternal.value.trim().toLowerCase();
    const rows = axTreeBoxExternal.querySelectorAll('.ax-mark-row');
    let visibleCount = 0;

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (!filter || text.includes(filter)) {
            row.style.display = 'flex';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    if (lblFilteredCount) {
        lblFilteredCount.textContent = filter ? `${visibleCount} of ${rows.length} matched` : 'Showing All';
    }
}

if (txtFilterMarksExternal) {
    txtFilterMarksExternal.addEventListener('input', applyMarkFilter);
}

// Grep Search
if (btnExecuteGrepExternal) {
    btnExecuteGrepExternal.onclick = () => {
        const q = txtGrepQueryExternal.value.trim();
        if (!q) return;
        grepOutputAreaExternal.innerHTML = '<div class="loading-spinner">Grep searching target web tab...</div>';
        ipcRenderer.send('hud-action', { action: 'grep', query: q });
    };
}

if (txtGrepQueryExternal) {
    txtGrepQueryExternal.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            btnExecuteGrepExternal.click();
        }
    });
}

// Autofill Trigger
if (btnTriggerAutofillExternal) {
    btnTriggerAutofillExternal.onclick = () => {
        ipcRenderer.send('hud-action', { action: 'autofill' });
    };
}

// HITL Trigger
if (btnHitlTriggerExternal) {
    btnHitlTriggerExternal.onclick = () => {
        ipcRenderer.send('hud-action', { action: 'hitl' });
    };
}

// Clear Telemetry
if (btnClearTelemetryExternal) {
    btnClearTelemetryExternal.onclick = () => {
        telemetryBoxExternal.innerHTML = '<div class="log-line info">Telemetry cleared.</div>';
    };
}

// Log Telemetry line
function logExternalTelemetry(type, msg, meta = '') {
    const time = new Date().toLocaleTimeString();
    const div = document.createElement('div');
    div.className = `log-line ${type}`;
    div.innerHTML = `<span class="time">${time}</span> <strong>[${type.toUpperCase()}]</strong> ${msg} ${meta ? `<span class="meta">${meta}</span>` : ''}`;
    telemetryBoxExternal.appendChild(div);
    telemetryBoxExternal.scrollTop = telemetryBoxExternal.scrollHeight;
}

// Receive state updates from main process / main window
ipcRenderer.on('update-hud-state', (event, data) => {
    if (!data) return;

    // Tabs List Update (Populates Target Tab Dropdown)
    if (data.type === 'tabs-list' && Array.isArray(data.tabs) && selTargetTab) {
        selTargetTab.innerHTML = '';
        data.tabs.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = `Tab ${t.id}: ${t.title || 'Untitled'} (${t.url})`;
            if (t.isActive || t.id === data.activeTabId) {
                opt.selected = true;
            }
            selTargetTab.appendChild(opt);
        });
    }

    if (data.targetId && selTargetTab) {
        selTargetTab.value = data.targetId;
    }

    if (data.targetTitle && targetTabTitle) {
        targetTabTitle.textContent = `Target: ${data.targetTitle}`;
    }

    // Accessibility Tree & Set-of-Marks Update
    if (data.type === 'ax-tree') {
        latestMarkdown = data.markdown || '';
        if (lblSoMModeExternal) {
            lblSoMModeExternal.textContent = data.isSummarized ? 'Summarized' : 'Dense';
        }
        if (btnToggleSoMModeExternal) {
            if (data.isSummarized) {
                btnToggleSoMModeExternal.classList.remove('dense');
                btnToggleSoMModeExternal.classList.add('active');
            } else {
                btnToggleSoMModeExternal.classList.remove('active');
                btnToggleSoMModeExternal.classList.add('dense');
            }
        }
        if (lblTokenLimitExternal) {
            lblTokenLimitExternal.textContent = data.isSummarized ? '<800 tokens' : '<3k tokens';
        }

        if (data.html) {
            axTreeBoxExternal.innerHTML = data.html;

            // Wire click handlers for grounding mark rows in external window
            const rows = axTreeBoxExternal.querySelectorAll('.ax-mark-row');
            rows.forEach(row => {
                row.onclick = () => {
                    const badge = row.querySelector('.ax-badge-pill');
                    if (badge) {
                        const markId = badge.textContent.replace('#', '').trim();
                        ipcRenderer.send('hud-action', { action: 'scroll-to-mark', markId: markId });
                    }
                };
            });

            // Re-apply filter if text is present
            applyMarkFilter();
        }
    }

    // Grep Results Update
    if (data.type === 'grep-results') {
        if (data.statsHtml) {
            grepStatsBarExternal.style.display = 'flex';
            lblGrepStatsExternal.innerHTML = data.statsHtml;
        }
        if (data.outputHtml) {
            grepOutputAreaExternal.innerHTML = data.outputHtml;
        }
    }

    // Autofill Update
    if (data.type === 'autofill-status') {
        autofillStatusExternal.innerHTML = data.html;
    }

    // Anti-Bot / CAPTCHA Update
    if (data.type === 'captcha-status') {
        tagCaptchaExternal.textContent = data.detected ? `DETECTED: ${data.captchaType}` : 'Clean / No Challenge';
        tagCaptchaExternal.className = data.detected ? 'tag tag-red' : 'tag tag-green';
    }

    // Telemetry Update
    if (data.type === 'telemetry') {
        logExternalTelemetry(data.level, data.message, data.meta);
    }
});

// Notify main window that external HUD is ready
window.addEventListener('DOMContentLoaded', () => {
    ipcRenderer.send('hud-action', { action: 'hud-ready' });
});
