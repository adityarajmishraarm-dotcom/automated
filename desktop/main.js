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

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1440,
        height: 920,
        minWidth: 1024,
        minHeight: 700,
        title: "Antigravity Browser - AI-Native Chromium Core",
        backgroundColor: "#070b14",
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true,
            webSecurity: false // Allows real web navigation and inspection
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

    // Automated scenario verification and snapshot capture sequence
    mainWindow.webContents.on('did-finish-load', () => {
        const outDir = 'C:\\Users\\Anurag\\.gemini\\antigravity-ide\\brain\\951ad0b8-278a-4e94-943e-3d0c1d6b72d6';

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
    });

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
        const outDir = 'C:\\Users\\Anurag\\.gemini\\antigravity-ide\\brain\\951ad0b8-278a-4e94-943e-3d0c1d6b72d6';
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
