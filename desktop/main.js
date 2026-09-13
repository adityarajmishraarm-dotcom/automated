const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');

// Enforce single instance lock to prevent cache contention
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
    process.exit(0);
} else {
    app.on('second-instance', (event, argv) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
            const targetUrl = argv.find(arg => typeof arg === 'string' && (arg.startsWith('http://') || arg.startsWith('https://')));
            if (targetUrl) {
                mainWindow.webContents.send('external-navigate', targetUrl);
            }
        }
    });
}

// Chromium performance & cache switches to prevent Windows file locking delays
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

// High-Fidelity GPU Acceleration & Smooth Image Rendering Switches
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('enable-accelerated-video-decode');
app.commandLine.appendSwitch('high-dpi-support', '1');
app.commandLine.appendSwitch('force-color-profile', 'srgb');
app.commandLine.appendSwitch('enable-smooth-scrolling');

// Filter benign redirect navigation cancellations
process.on('unhandledRejection', (reason) => {
    if (reason && (reason.code === 'ERR_ABORTED' || String(reason).includes('ERR_ABORTED'))) return;
    console.error('[Unhandled Rejection]', reason);
});

const braveAdblock = require('./adblock_engine');
const whisperEngine = require('./whisper_engine');

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
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workArea;

    let mainWidth = Math.floor(workArea.width * 0.64);
    let mainHeight = Math.floor(workArea.height * 0.96);
    let mainX = workArea.x + 10;
    let mainY = workArea.y + 10;

    mainWindow = new BrowserWindow({
        x: mainX,
        y: mainY,
        width: mainWidth,
        height: mainHeight,
        minWidth: 800,
        minHeight: 600,
        title: "Antigravity Browser - AI-Native React Desktop App",
        backgroundColor: "#070b14",
        frame: false, // Removes standard OS title bar window buttons (—, ☐, ✕)
        autoHideMenuBar: true,
        frame: false, // Pure Mac-style frameless desktop window (removes Windows OS top title bar & duplicate close buttons)
        show: false, // Prevents blank screen; revealed immediately on ready-to-show
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

    mainWindow.webContents.setWindowOpenHandler((details) => {
        if (details.url && details.url !== 'about:blank') {
            mainWindow.webContents.send('open-new-tab', details.url);
        }
        return { action: 'deny' };
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    });

    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        // Suppress expected deprecation or minor warnings in console
        if (message.includes('Electron Security Warning')) return;
        console.log(`[Renderer Console] ${message}`);
    });

    // Automatic permission suppression (blocks notification spam, allows local microphone)
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        if (permission === 'notifications' || permission === 'mediaKeySystem') {
            return callback(false);
        }
        if (permission === 'media') {
            return callback(true);
        }
        callback(true);
    });

    session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
        if (permission === 'media') {
            return true;
        }
        return true;
    });

    // In-Process Network Interception: Brave adblock-rust engine + fallback pattern filtering
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
        const url = details.url;

        // 1. Primary: High-speed Brave adblock-rust engine inspection
        const decision = braveAdblock.shouldBlock(url, details.referrer, details.resourceType);
        if (decision.block) {
            adblockStats.blockedCount++;
            braveAdblock.recordBlocked(url, decision);
            if (mainWindow && !mainWindow.isDestroyed()) {
                const stats = braveAdblock.getStats();
                mainWindow.webContents.send('adblock-count-updated', stats.totalBlocked || adblockStats.blockedCount);
                mainWindow.webContents.send('brave-shields-updated', stats);
            }
            return callback({ cancel: true });
        }

        // 2. Secondary fallback: Check against pattern rules
        const matchesPattern = blockedPatterns.some(pattern => {
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
            return regex.test(url);
        });

        if (matchesPattern) {
            adblockStats.blockedCount++;
            braveAdblock.recordBlocked(url, { block: true, rule: 'Pattern Filter Rule', category: 'ad' });
            if (mainWindow && !mainWindow.isDestroyed()) {
                const stats = braveAdblock.getStats();
                mainWindow.webContents.send('adblock-count-updated', stats.totalBlocked || adblockStats.blockedCount);
                mainWindow.webContents.send('brave-shields-updated', stats);
            }
            return callback({ cancel: true });
        }

        return callback({ cancel: false });
    });

    // Window ready logging, URL dispatch, and automated snapshot verification
    mainWindow.webContents.on('did-finish-load', () => {
        console.log('[Native Browser] Antigravity Browser Shell initialized.');
        const initialUrl = process.argv.find(arg => typeof arg === 'string' && (arg.startsWith('http://') || arg.startsWith('https://')));
        if (initialUrl) {
            setTimeout(() => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('external-navigate', initialUrl);
                }
            }, 800);
        }

        if (process.argv.includes('--open-detached-hud')) {
            setTimeout(() => {
                createHudWindow();
            }, 800);
        }

        if (process.argv.includes('--open-docked-hud')) {
            setTimeout(() => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('open-docked-hud');
                }
            }, 800);
        }

        const snapshotArg = process.argv.find(arg => typeof arg === 'string' && arg.startsWith('--snapshot='));
        if (snapshotArg) {
            const parts = snapshotArg.split('=')[1].split(',');
            const filename = parts[0] || 'verification_snapshot.png';
            const delay = parseInt(parts[1] || '6000', 10);
            setTimeout(async () => {
                const outDir = 'C:\\Users\\Anurag\\.gemini\\antigravity-ide\\brain\\951ad0b8-278a-4e94-943e-3d0c1d6b72d6';
                if (mainWindow && !mainWindow.isDestroyed()) {
                    try {
                        const img = await mainWindow.webContents.capturePage();
                        const fullPath = path.join(outDir, filename);
                        fs.writeFileSync(fullPath, img.toPNG());
                        console.log('[Native Browser] Main window snapshot saved:', fullPath);
                    } catch (e) {
                        console.error('[Native Browser] Main snapshot error:', e);
                    }
                }
                if (hudWindow && !hudWindow.isDestroyed()) {
                    try {
                        const hudImg = await hudWindow.webContents.capturePage();
                        const hudPath = path.join(outDir, 'detached_cockpit_verified.png');
                        fs.writeFileSync(hudPath, hudImg.toPNG());
                        console.log('[Native Browser] Detached HUD Cockpit snapshot saved:', hudPath);
                    } catch (e) {
                        console.error('[Native Browser] Cockpit snapshot error:', e);
                    }
                }
                if (process.argv.includes('--quit-after-snapshot')) {
                    console.log('[Native Browser] Cleanly quitting after snapshot verification.');
                    app.quit();
                }
            }, delay);
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Universal Brave Shields injection for all guest webviews across any website
app.on('web-contents-created', (event, contents) => {
    if (contents.getType() === 'webview') {
        const injectUniversalShields = () => {
            const url = contents.getURL() || '';
            const cosmeticCss = braveAdblock.getCosmeticCSS(url);
            if (cosmeticCss) {
                contents.insertCSS(cosmeticCss, { cssOrigin: 'user' }).catch(() => {});
            }
            const scriptlet = braveAdblock.getUniversalScriptlet();
            contents.executeJavaScript(scriptlet).catch(() => {});
        };

        // Engine-level Popup/Popunder Blocking & Native In-App Tab Routing
        contents.setWindowOpenHandler((details) => {
            const currentUrl = contents.getURL() || '';
            const decision = braveAdblock.shouldBlock(details.url, currentUrl, 'popup');
            if (decision.block || braveAdblock.isSuspiciousPopup(details.url, currentUrl)) {
                braveAdblock.recordBlocked(details.url, {
                    block: true,
                    rule: decision.rule || 'Popunder / Ad Window Block',
                    category: 'ad'
                });
                if (mainWindow && !mainWindow.isDestroyed()) {
                    const stats = braveAdblock.getStats();
                    mainWindow.webContents.send('adblock-count-updated', stats.totalBlocked);
                    mainWindow.webContents.send('brave-shields-updated', stats);
                }
                console.log('[Brave Shields] Blocked popup window/tab to:', details.url);
                return { action: 'deny' };
            }

            // Route legitimate target URLs into a new in-app tab (strictly no standalone OS window)
            if (mainWindow && !mainWindow.isDestroyed() && details.url && details.url !== 'about:blank') {
                console.log('[Native Browser] Routing legit link to in-app tab:', details.url);
                mainWindow.webContents.send('open-new-tab', details.url);
            }
            return { action: 'deny' };
        });

        // Cancel Shady Redirects and Malicious Programmatic Navigations
        contents.on('will-navigate', (event, navUrl) => {
            const currentUrl = contents.getURL() || '';
            const decision = braveAdblock.shouldBlock(navUrl, currentUrl, 'main_frame');
            if (decision.block || braveAdblock.isSuspiciousPopup(navUrl, currentUrl)) {
                event.preventDefault();
                braveAdblock.recordBlocked(navUrl, decision.block ? decision : { block: true, rule: 'Shady Redirect Block', category: 'ad' });
                if (mainWindow && !mainWindow.isDestroyed()) {
                    const stats = braveAdblock.getStats();
                    mainWindow.webContents.send('adblock-count-updated', stats.totalBlocked);
                    mainWindow.webContents.send('brave-shields-updated', stats);
                }
                console.log('[Brave Shields] Blocked shady redirect navigation to:', navUrl);
            }
        });

        contents.on('will-redirect', (event, navUrl) => {
            const currentUrl = contents.getURL() || '';
            const decision = braveAdblock.shouldBlock(navUrl, currentUrl, 'main_frame');
            if (decision.block || braveAdblock.isSuspiciousPopup(navUrl, currentUrl)) {
                event.preventDefault();
                braveAdblock.recordBlocked(navUrl, decision.block ? decision : { block: true, rule: 'Shady Server Redirect Block', category: 'ad' });
                if (mainWindow && !mainWindow.isDestroyed()) {
                    const stats = braveAdblock.getStats();
                    mainWindow.webContents.send('adblock-count-updated', stats.totalBlocked);
                    mainWindow.webContents.send('brave-shields-updated', stats);
                }
                console.log('[Brave Shields] Blocked shady server redirect to:', navUrl);
            }
        });

        contents.on('did-navigate', injectUniversalShields);
        contents.on('dom-ready', injectUniversalShields);
        contents.on('did-navigate-in-page', injectUniversalShields);
        contents.on('did-frame-finish-load', injectUniversalShields);
    }
});

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// IPC communication for Brave Shields & Adblock Engine
ipcMain.handle('get-adblock-stats', () => {
    return braveAdblock.getStats();
});

ipcMain.handle('set-adblock-mode', (event, mode) => {
    braveAdblock.setMode(mode);
    const stats = braveAdblock.getStats();
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('brave-shields-updated', stats);
    }
    return stats;
});

ipcMain.handle('add-adblock-rule', (event, rule) => {
    braveAdblock.addRule(rule);
    const stats = braveAdblock.getStats();
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('brave-shields-updated', stats);
    }
    return stats;
});

ipcMain.handle('check-url-block', (event, arg) => {
    const url = typeof arg === 'string' ? arg : (arg ? arg.url : '');
    const initiatorUrl = typeof arg === 'object' && arg ? arg.initiatorUrl : '';
    return {
        block: braveAdblock.isSuspiciousPopup(url, initiatorUrl),
        decision: braveAdblock.shouldBlock(url, initiatorUrl)
    };
});

ipcMain.on('check-url-block-sync', (event, arg) => {
    const url = typeof arg === 'string' ? arg : (arg ? arg.url : '');
    const initiatorUrl = typeof arg === 'object' && arg ? arg.initiatorUrl : '';
    const isBlock = braveAdblock.isSuspiciousPopup(url, initiatorUrl) || braveAdblock.shouldBlock(url, initiatorUrl).block;
    event.returnValue = isBlock;
});

ipcMain.handle('capture-page-snapshot', async (event, customName) => {
    if (!mainWindow || mainWindow.isDestroyed()) return false;
    try {
        const image = await mainWindow.webContents.capturePage();
        const outDir = process.env.SNAPSHOT_DIR || 'C:\\Users\\Anurag\\.gemini\\antigravity-ide\\brain\\951ad0b8-278a-4e94-943e-3d0c1d6b72d6';
        try { if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true }); } catch (e) {}
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

// Window management IPC handlers
ipcMain.on('window-minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});

ipcMain.handle('window-minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
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

ipcMain.on('window-close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
});

ipcMain.handle('window-close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
});

ipcMain.on('focus-browser-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
});

ipcMain.handle('focus-browser-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
        return true;
    }
    return false;
});

// External Detached AI Copilot HUD Cockpit Window Management
let hudWindow = null;

function createHudWindow() {
    if (hudWindow && !hudWindow.isDestroyed()) {
        if (hudWindow.isMinimized()) hudWindow.restore();
        hudWindow.show();
        hudWindow.focus();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('hud-window-opened');
        }
        return true;
    }

    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workArea;

    let hudX, hudY, hudWidth, hudHeight;
    if (mainWindow && !mainWindow.isDestroyed()) {
        const bounds = mainWindow.getBounds();
        hudX = bounds.x + bounds.width + 10;
        hudY = bounds.y;
        hudWidth = Math.max(500, workArea.x + workArea.width - hudX - 10);
        hudHeight = bounds.height;

        if (hudWidth < 460) {
            hudWidth = Math.min(840, Math.floor(workArea.width * 0.44));
            hudX = Math.max(workArea.x + 10, workArea.x + workArea.width - hudWidth - 20);
            hudY = workArea.y + 30;
            hudHeight = Math.floor(workArea.height * 0.90);
        }
    } else {
        hudWidth = Math.min(840, Math.floor(workArea.width * 0.40));
        hudHeight = Math.floor(workArea.height * 0.94);
        hudX = workArea.x + workArea.width - hudWidth - 10;
        hudY = workArea.y + 10;
    }

    let windowOptions = {
        x: hudX,
        y: hudY,
        width: hudWidth,
        height: hudHeight,
        minWidth: 460,
        minHeight: 500,
        title: "Antigravity AI Copilot & Core Engine Cockpit (External HUD)",
        backgroundColor: "#060911",
        autoHideMenuBar: true,
        frame: false, // Pure Mac-style frameless HUD window (removes Windows OS top title bar & duplicate close buttons)
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
            images: true,
            webgl: true
        }
    };

    hudWindow = new BrowserWindow(windowOptions);

    hudWindow.loadFile(path.join(__dirname, 'index.html'), { query: { view: 'detached-hud' } });

    hudWindow.once('ready-to-show', () => {
        hudWindow.show();
        hudWindow.focus();
    });

    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('hud-window-opened');
    }

    hudWindow.on('hide', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('hud-window-hidden');
        }
    });

    hudWindow.on('show', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('hud-window-opened');
        }
    });

    hudWindow.on('closed', () => {
        hudWindow = null;
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('hud-window-closed');
            mainWindow.webContents.send('hud-window-hidden');
        }
    });

    return true;
}

function hideHudWindow() {
    if (hudWindow && !hudWindow.isDestroyed()) {
        hudWindow.hide();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('hud-window-hidden');
        }
        return true;
    }
    return false;
}

ipcMain.handle('open-hud-window', () => createHudWindow());

ipcMain.handle('hide-hud-window', () => hideHudWindow());

ipcMain.handle('toggle-hud-window', () => {
    if (hudWindow && !hudWindow.isDestroyed() && hudWindow.isVisible()) {
        hideHudWindow();
        return false;
    } else {
        createHudWindow();
        return true;
    }
});

ipcMain.handle('close-hud-window', () => {
    if (hudWindow && !hudWindow.isDestroyed()) {
        hudWindow.close();
        hudWindow = null;
    }
    return true;
});

// Relay actions from external HUD window to main browser window
ipcMain.on('hud-action', (event, data) => {
    if (data && data.action === 'hide-hud-window') {
        hideHudWindow();
    }
    if (data && data.action === 'set-active-tab' && hudWindow && !hudWindow.isDestroyed()) {
        hudWindow.webContents.send('update-hud-state', { type: 'set-active-tab', tab: data.tab });
    }
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

// Native Window Controls for Mac-Style Traffic Lights
ipcMain.on('window-close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
    }
});

ipcMain.on('window-minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.minimize();
    }
});

ipcMain.on('window-maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

// External HUD Window Controls for Mac-Style Traffic Lights
ipcMain.on('hud-window-close', () => {
    hideHudWindow();
});

ipcMain.on('hud-window-minimize', () => {
    if (hudWindow && !hudWindow.isDestroyed()) {
        hudWindow.minimize();
    }
});

ipcMain.on('hud-window-maximize', () => {
    if (hudWindow && !hudWindow.isDestroyed()) {
        if (hudWindow.isMaximized()) {
            hudWindow.unmaximize();
        } else {
            hudWindow.maximize();
        }
    }
});

// Local In-Process Multilingual Whisper Speech-To-Text IPC Handlers
ipcMain.handle('whisper-get-status', () => {
    return {
        ready: whisperEngine.isReady(),
        initializing: whisperEngine.isInitializing(),
        model: 'onnx-community/whisper-tiny',
        languages: ['auto', 'en', 'hi', 'ko']
    };
});

ipcMain.handle('whisper-preload', async () => {
    try {
        await whisperEngine.getWhisperPipeline();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('whisper-transcribe', async (event, payload) => {
    try {
        const { audioData, language } = payload || {};
        const result = await whisperEngine.transcribeAudio(audioData, { language });
        return result;
    } catch (err) {
        console.error('[Main] Whisper transcription failed:', err);
        return { success: false, error: err.message };
    }
});


