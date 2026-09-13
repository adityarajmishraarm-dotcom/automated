const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// Adblock filter list (EasyList & uBlock Origin rules)
const blockedPatterns = [
    '*://*.doubleclick.net/*',
    '*://*.google-analytics.com/*',
    '*://*.googlesyndication.com/*',
    '*://*.adnxs.com/*',
    '*://*.criteo.com/*',
    '*://*.scorecardresearch.com/*',
    '*://*.quantserve.com/*',
    '*://*.hotjar.com/*',
    '*://*.amazon-adsystem.com/*',
    '*://*/*ads.js*',
    '*://*/*analytics.js*',
    '*://*/*prebid.js*',
    '*://*/*gtag/js*'
];

let adblockStats = {
    blockedCount: 0
};

// High-Fidelity GPU Acceleration & Smooth Image Rendering Switches
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('enable-accelerated-video-decode');
app.commandLine.appendSwitch('high-dpi-support', '1');
app.commandLine.appendSwitch('force-color-profile', 'srgb');
app.commandLine.appendSwitch('enable-smooth-scrolling');

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1440,
        height: 920,
        minWidth: 1024,
        minHeight: 700,
        title: "BATTLENX Browser - AI-Native Chromium Core",
        backgroundColor: "#070b14",
        frame: false, // Removes standard OS title bar window buttons (—, ☐, ✕)
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true,
            webSecurity: false, // Allows real web navigation and inspection
            images: true,
            webgl: true,
            scrollBounce: true
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`[Renderer Console] ${message}`);
    });

    // In-Process Network Interception: Native adblock filter (Brave adblock-rust style)
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
        const url = details.url.toLowerCase();
        let shouldBlock = false;

        for (const pattern of blockedPatterns) {
            const cleanPattern = pattern.replace(/\*/g, '').replace(/:\/\//, '');
            if (url.includes(cleanPattern)) {
                shouldBlock = true;
                break;
            }
        }

        if (shouldBlock) {
            adblockStats.blockedCount++;
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('adblock-count-updated', adblockStats.blockedCount);
            }
            callback({ cancel: true });
        } else {
            callback({ cancel: false });
        }
    });

    // Automated scenario verification sequence (only runs if AUTO_BENCHMARK=1)
    if (process.env.AUTO_BENCHMARK === '1') {
        mainWindow.webContents.on('did-finish-load', () => {
            const outDir = process.env.SNAPSHOT_DIR || path.join(__dirname, 'snapshots');
            try {
                if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
            } catch (e) {}

            // Phase 1: Capture Tab 1 (Hacker News with SoM and AX tree)
            setTimeout(async () => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    try {
                        const image = await mainWindow.webContents.capturePage();
                        fs.writeFileSync(path.join(outDir, 'desktop_browser_rendered.png'), image.toPNG());
                        fs.writeFileSync(path.join(outDir, 'desktop_browser_tab1_hackernews.png'), image.toPNG());
                        console.log('[Native Browser] Tab 1 snapshot saved.');
                    } catch (e) {
                        console.error('[Native Browser] Snapshot 1 error:', e);
                    }
                }
            }, 5000);

            // Phase 2: Switch to Tab 2 (Checkout Demo) & trigger components/autofill
            setTimeout(async () => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    try {
                        await mainWindow.webContents.executeJavaScript(`
                            activateTab(2);
                            document.querySelector('[data-view="viewAutofill"]').click();
                            setTimeout(() => {
                                btnTriggerAutofill.click();
                            }, 1200);
                        `);
                        console.log('[Native Browser] Switched to Tab 2 and triggered components/autofill');
                    } catch (e) {
                        console.error('[Native Browser] Tab 2 switch error:', e);
                    }
                }
            }, 8000);

            // Phase 2 Snapshot: Capture Autofilled Checkout Form with grounded SoM badges
            setTimeout(async () => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    try {
                        const image = await mainWindow.webContents.capturePage();
                        fs.writeFileSync(path.join(outDir, 'desktop_browser_tab2_autofill.png'), image.toPNG());
                        console.log('[Native Browser] Tab 2 Autofill snapshot saved.');
                    } catch (e) {
                        console.error('[Native Browser] Snapshot 2 error:', e);
                    }
                }
            }, 11000);

            // Phase 3: Run In-Memory Grep with +-10 lines context on Tab 2 DOM
            setTimeout(async () => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    try {
                        await mainWindow.webContents.executeJavaScript(`
                            document.querySelector('[data-view="viewGrep"]').click();
                            txtGrepQuery.value = 'input';
                            btnExecuteGrep.click();
                        `);
                        console.log('[Native Browser] Triggered in-memory grep search');
                    } catch (e) {
                        console.error('[Native Browser] Grep test error:', e);
                    }
                }
            }, 13000);

            // Phase 3 Snapshot: Capture In-Memory Grep with +-10 lines context
            setTimeout(async () => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    try {
                        const image = await mainWindow.webContents.capturePage();
                        fs.writeFileSync(path.join(outDir, 'desktop_browser_tab2_grep.png'), image.toPNG());
                        console.log('[Native Browser] Grep output snapshot saved.');
                    } catch (e) {
                        console.error('[Native Browser] Snapshot 3 error:', e);
                    }
                }
            }, 16000);

            // Phase 4: Switch to Tab 3 (Wikipedia) with Live SoM and AX tree
            setTimeout(async () => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    try {
                        await mainWindow.webContents.executeJavaScript(`
                            activateTab(3);
                            document.querySelector('[data-view="viewAx"]').click();
                        `);
                        console.log('[Native Browser] Switched to Tab 3 (Wikipedia)');
                    } catch (e) {
                        console.error('[Native Browser] Tab 3 switch error:', e);
                    }
                }
            }, 18000);

            // Phase 4 Snapshot: Capture Wikipedia live rendering
            setTimeout(async () => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    try {
                        const image = await mainWindow.webContents.capturePage();
                        fs.writeFileSync(path.join(outDir, 'desktop_browser_tab3_wikipedia.png'), image.toPNG());
                        console.log('[Native Browser] Tab 3 Wikipedia snapshot saved.');
                    } catch (e) {
                        console.error('[Native Browser] Snapshot 4 error:', e);
                    }
                }
            }, 24000);

            // Phase 5: Launch External AI Copilot HUD Cockpit
            setTimeout(async () => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    try {
                        await mainWindow.webContents.executeJavaScript(`
                            if (btnToggleHud) btnToggleHud.click();
                        `);
                        console.log('[Native Browser] Launched External AI Copilot HUD Cockpit');
                    } catch (e) {
                        console.error('[Native Browser] External HUD launch error:', e);
                    }
                }
            }, 26000);

            // Phase 5 Snapshot: Switch back to Tab 1 (Hacker News) with 100% full screen width
            setTimeout(async () => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    try {
                        await mainWindow.webContents.executeJavaScript(`
                            activateTab(1);
                        `);
                        const image = await mainWindow.webContents.capturePage();
                        fs.writeFileSync(path.join(outDir, 'desktop_browser_tab1_hackernews.png'), image.toPNG());
                        fs.writeFileSync(path.join(outDir, 'desktop_browser_rendered.png'), image.toPNG());
                        console.log('[Native Browser] Tab 1 unsquished full-width snapshot saved.');
                    } catch (e) {
                        console.error('[Native Browser] Tab 1 snapshot error:', e);
                    }
                }
            }, 29000);

            // Phase 6: Capture External AI Copilot HUD Cockpit Window
            setTimeout(async () => {
                if (hudWindow && !hudWindow.isDestroyed()) {
                    try {
                        const image = await hudWindow.webContents.capturePage();
                        fs.writeFileSync(path.join(outDir, 'desktop_browser_hud_external.png'), image.toPNG());
                        console.log('[Native Browser] External HUD Cockpit window snapshot saved.');
                    } catch (e) {
                        console.error('[Native Browser] External HUD snapshot error:', e);
                    }
                }
                setTimeout(() => {
                    app.quit();
                }, 2000);
            }, 33000);
        });
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// IPC communication for in-process browser engine
ipcMain.handle('get-adblock-stats', () => {
    return adblockStats;
});

ipcMain.handle('capture-page-snapshot', async (event, customName) => {
    if (!mainWindow || mainWindow.isDestroyed()) return false;
    try {
        const image = await mainWindow.webContents.capturePage();
        const outDir = process.env.SNAPSHOT_DIR || path.join(__dirname, 'snapshots');
        try {
            if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        } catch (e) {}
        const filename = customName || 'desktop_browser_rendered.png';
        const fullPath = path.join(outDir, filename);
        fs.writeFileSync(fullPath, image.toPNG());
        console.log('[Native Browser] Manual snapshot saved:', fullPath);
        return fullPath;
    } catch (e) {
        console.error('[Native Browser] Manual snapshot error:', e);
        return false;
    }
});

// External AI HUD Window Management
let hudWindow = null;

ipcMain.handle('open-hud-window', (event) => {
    if (hudWindow && !hudWindow.isDestroyed()) {
        hudWindow.show();
        hudWindow.focus();
        return true;
    }

    hudWindow = new BrowserWindow({
        width: 840,
        height: 940,
        minWidth: 540,
        minHeight: 600,
        title: "BATTLENX AI Copilot & Core Engine HUD (External Cockpit)",
        backgroundColor: "#070b14",
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
        }
    });

    hudWindow.loadFile(path.join(__dirname, 'hud.html'));

    hudWindow.on('closed', () => {
        hudWindow = null;
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('hud-window-closed');
        }
    });

    return true;
});

ipcMain.handle('close-hud-window', () => {
    if (hudWindow && !hudWindow.isDestroyed()) {
        hudWindow.close();
        hudWindow = null;
    }
    return true;
});

ipcMain.handle('focus-browser-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
        return true;
    }
    return false;
});

// Relay actions from external HUD window to main browser window
ipcMain.on('hud-action', (event, data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('hud-action', data);
    }
});

// Relay live state updates from main browser window to external HUD window
ipcMain.on('sync-hud-state', (event, data) => {
    if (hudWindow && !hudWindow.isDestroyed()) {
        hudWindow.webContents.send('update-hud-state', data);
    }
});

// Frameless Window Control IPC Handlers
ipcMain.handle('window-minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.minimize();
    }
});

ipcMain.handle('window-maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

ipcMain.handle('window-close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
    }
});


