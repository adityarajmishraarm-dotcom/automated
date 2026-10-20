const { app, BrowserWindow, ipcMain, session, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

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

// Universal Instant Autoplay for YouTube, Streaming Sites & Audio Players
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

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
    '*://*/*gtag/js*',
    '*://*.hotstarads.com/*',
    '*://*.jioads.*/*',
    '*://ads.jio.com/*',
    '*://*.spotify.com/ad-logic/*',
    '*://*.spotify.com/commercial-break/*',
    '*://spclient.wg.spotify.com/ads/*'
];

// Precompile regexes once at startup to avoid per-request regex construction
const blockedRegexes = blockedPatterns.map(pattern => {
    return new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
});

let adblockStats = {
    blockedCount: 0
};

// Global A/B/C Test Harness Configuration & Request Logger
global.__testConfig = {
    networkBlocker: true,
    testMode: null
};
global.__networkLog = [];

const CHROME_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36';

// Persistent Storage Paths
const DOWNLOADS_FILE = path.join(app.getPath('userData'), 'downloads.json');
const HISTORY_FILE = path.join(app.getPath('userData'), 'history.json');

function loadPersistedDownloads() {
    try {
        if (fs.existsSync(DOWNLOADS_FILE)) {
            const data = fs.readFileSync(DOWNLOADS_FILE, 'utf8');
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) {
        console.error('[Downloads] Error loading persisted downloads:', e.message);
    }
    return [];
}

let saveDownloadsTimer = null;
function savePersistedDownloads() {
    if (saveDownloadsTimer) return;
    saveDownloadsTimer = setTimeout(() => {
        saveDownloadsTimer = null;
        try {
            const serializable = downloadsList.slice(0, 300).map(item => ({
                id: item.id,
                filename: item.filename,
                totalBytes: item.totalBytes,
                totalBytesFormatted: item.totalBytesFormatted,
                receivedBytes: item.receivedBytes,
                receivedBytesFormatted: item.receivedBytesFormatted,
                percent: item.percent,
                speed: item.speed,
                speedBps: item.speedBps,
                state: item.state,
                isPaused: item.isPaused,
                canResume: item.canResume,
                url: item.url,
                mimeType: item.mimeType,
                savePath: item.savePath,
                startTime: item.startTime,
                endTime: item.endTime
            }));
            fs.writeFileSync(DOWNLOADS_FILE, JSON.stringify(serializable, null, 2), 'utf8');
        } catch (e) {
            console.error('[Downloads] Error saving persisted downloads:', e.message);
        }
    }, 400);
}

function loadPersistedHistory() {
    try {
        if (fs.existsSync(HISTORY_FILE)) {
            const data = fs.readFileSync(HISTORY_FILE, 'utf8');
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) {
        console.error('[History] Error loading persisted history:', e.message);
    }
    return [];
}

function savePersistedHistory(historyList) {
    try {
        if (Array.isArray(historyList)) {
            fs.writeFileSync(HISTORY_FILE, JSON.stringify(historyList.slice(0, 500), null, 2), 'utf8');
            return true;
        }
    } catch (e) {
        console.error('[History] Error saving persisted history:', e.message);
    }
    return false;
}

// In-Process Download Manager Storage (persisted to disk)
const downloadsMap = new Map();
const downloadsList = loadPersistedDownloads();

function formatBytes(bytes, decimals = 2) {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function createWindow() {
    mainWindow = new BrowserWindow({
        center: true,
        width: 1360,
        height: 860,
        minWidth: 800,
        minHeight: 600,
        title: "Antigravity Browser - AI-Native React Desktop App",
        backgroundColor: "#070b14",
        frame: false, // Pure frameless window - eliminates Windows OS title bar and duplicate top padding
        autoHideMenuBar: true,
        show: true, // Mandatory visible full browser on every launch
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

    mainWindow.webContents.on('will-attach-webview', (event, webPreferences, params) => {
        webPreferences.contextIsolation = false;
        webPreferences.nodeIntegration = false;
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.maximize();
        mainWindow.focus();
        if (typeof mainWindow.moveTop === 'function') mainWindow.moveTop();
    });

    mainWindow.on('focus', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('window-focus-changed', true);
        }
    });

    mainWindow.on('blur', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('window-focus-changed', false);
        }
    });

    mainWindow.on('minimize', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('window-focus-changed', false);
        }
    });

    mainWindow.on('restore', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('window-focus-changed', true);
        }
    });

    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        // Suppress expected deprecation or minor warnings in console
        if (message.includes('Electron Security Warning')) return;
        console.log(`[Renderer Console] ${message}`);
    });

    let shieldsThrottleTimer = null;
    const broadcastShieldsThrottled = () => {
        if (shieldsThrottleTimer) return;
        shieldsThrottleTimer = setTimeout(() => {
            shieldsThrottleTimer = null;
            if (mainWindow && !mainWindow.isDestroyed()) {
                const stats = braveAdblock.getStats();
                mainWindow.webContents.send('adblock-count-updated', stats.totalBlocked || adblockStats.blockedCount);
                mainWindow.webContents.send('brave-shields-updated', stats);
            }
        }, 400);
    };

    function configureBrowserSession(targetSession, registerGuestPreload = false) {
        if (!targetSession) return;

        // Set genuine Chrome User Agent (Bypasses Google OAuth "This browser or app may not be secure" block)
        targetSession.setUserAgent(CHROME_USER_AGENT);

        // Configure guest preload script ONLY for guest webview partitions (never on the host React shell)
        if (registerGuestPreload) {
            const guestPreloadPath = path.join(__dirname, 'guest_preload.js');
            if (typeof targetSession.registerPreloadScript === 'function') {
                try {
                    targetSession.registerPreloadScript({ type: 'frame', filePath: guestPreloadPath });
                } catch (e) {
                    console.warn('[Session] Failed to register preload script:', e.message);
                }
            } else if (typeof targetSession.setPreloads === 'function') {
                try {
                    targetSession.setPreloads([guestPreloadPath]);
                } catch (e) {
                    console.warn('[Session] Failed to set session preloads:', e.message);
                }
            }
        }

        targetSession.setPermissionRequestHandler((webContents, permission, callback) => {
            if (permission === 'notifications') {
                return callback(false);
            }
            callback(true);
        });

        targetSession.setPermissionCheckHandler((webContents, permission) => {
            return true;
        });

        // Strip Electron signature and enforce standard Chrome client hints for Google accounts and secure services
        targetSession.webRequest.onBeforeSendHeaders((details, callback) => {
            const url = details.url.toLowerCase();
            // Fast-path media streams: direct wire throughput
            if (url.includes('googlevideo.com') || url.includes('videoplayback')) {
                return callback({ cancel: false });
            }
            const requestHeaders = Object.assign({}, details.requestHeaders);
            requestHeaders['User-Agent'] = CHROME_USER_AGENT;
            requestHeaders['sec-ch-ua'] = '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"';
            requestHeaders['sec-ch-ua-mobile'] = '?0';
            requestHeaders['sec-ch-ua-platform'] = '"Windows"';
            callback({ cancel: false, requestHeaders });
        });

        // Strip restrictive Content-Security-Policy headers so external typography stylesheets and clean playback run on every website
        targetSession.webRequest.onHeadersReceived({ urls: ['*://*/*'] }, (details, callback) => {
            const url = details.url.toLowerCase();
            // Fast-path media chunks: avoid header mutation on video streams
            if (url.includes('googlevideo.com') || url.includes('videoplayback') || url.includes('.mp4') || url.includes('.m3u8') || url.includes('.mpd')) {
                return callback({ cancel: false });
            }
            const responseHeaders = Object.assign({}, details.responseHeaders);
            for (const key of Object.keys(responseHeaders)) {
                const lowerKey = key.toLowerCase();
                if (lowerKey === 'content-security-policy' || lowerKey === 'content-security-policy-report-only' || lowerKey === 'x-content-security-policy') {
                    delete responseHeaders[key];
                }
            }
            callback({ cancel: false, responseHeaders });
        });

        // Universal Network Interception: Brave adblock-rust filter matches
        // 1s silent black mp4 (uBlock 'noopmp4') - served in place of YouTube ad media so the player
        // sees a successful, instantly-ending ad stream and falls through to content with zero stall.
        const YT_AD_NOOP_VIDEO = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAOIbW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAA+gAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAArN0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAA+gAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAIAAAACAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAPoAAAAAAABAAAAAAIrbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAyAAAAMgBVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAAB1m1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAZZzdGJsAAAAunN0c2QAAAAAAAAAAQAAAKphdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAIAAgBIAAAASAAAAAAAAAABFUxhdmM2Mi4yMy4xMDMgbGlieDI2NAAAAAAAAAAAAAAAGP//AAAAMGF2Y0MBQsAK/+EAGGdCwArZH4iIwEQAAAMABAAAAwDIPEiZIAEABWjLg8sgAAAAEHBhc3AAAAABAAAAAQAAABRidHJ0AAAAAAAAGtAAAAAAAAAAGHN0dHMAAAAAAAAAAQAAABkAAAIAAAAAFHN0c3MAAAAAAAAAAQAAAAEAAAAcc3RzYwAAAAAAAAABAAAAAQAAABkAAAABAAAAeHN0c3oAAAAAAAAAAAAAABkAAAKBAAAACQAAAAoAAAAJAAAACQAAAAkAAAAJAAAACQAAAAkAAAAJAAAACQAAAAkAAAAJAAAACQAAAAkAAAAJAAAACQAAAAkAAAAJAAAACQAAAAkAAAAJAAAACQAAAAkAAAAJAAAAFHN0Y28AAAAAAAAAAQAAA7gAAABhdWR0YQAAAFltZXRhAAAAAAAAACFoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAAACxpbHN0AAAAJKl0b28AAAAcZGF0YQAAAAEAAAAATGF2ZjYyLjguMTAyAAAACGZyZWUAAANibWRhdAAAAm8GBf//a9xF6b3m2Ui3lizYINkj7u94MjY0IC0gY29yZSAxNjUgcjMyMjMgMDQ4MGNiMCAtIEguMjY0L01QRUctNCBBVkMgY29kZWMgLSBDb3B5bGVmdCAyMDAzLTIwMjUgLSBodHRwOi8vd3d3LnZpZGVvbGFuLm9yZy94MjY0Lmh0bWwgLSBvcHRpb25zOiBjYWJhYz0wIHJlZj0zIGRlYmxvY2s9MTowOjAgYW5hbHlzZT0weDE6MHgxMTEgbWU9aGV4IHN1Ym1lPTcgcHN5PTEgcHN5X3JkPTEuMDA6MC4wMCBtaXhlZF9yZWY9MSBtZV9yYW5nZT0xNiBjaHJvbWFfbWU9MSB0cmVsbGlzPTEgOHg4ZGN0PTAgY3FtPTAgZGVhZHpvbmU9MjEsMTEgZmFzdF9wc2tpcD0xIGNocm9tYV9xcF9vZmZzZXQ9LTIgdGhyZWFkcz0xIGxvb2thaGVhZF90aHJlYWRzPTEgc2xpY2VkX3RocmVhZHM9MCBucj0wIGRlY2ltYXRlPTEgaW50ZXJsYWNlZD0wIGJsdXJheV9jb21wYXQ9MCBjb25zdHJhaW5lZF9pbnRyYT0wIGJmcmFtZXM9MCB3ZWlnaHRwPTAga2V5aW50PTMwIGtleWludF9taW49MyBzY2VuZWN1dD00MCBpbnRyYV9yZWZyZXNoPTAgcmNfbG9va2FoZWFkPTMwIHJjPWNyZiBtYnRyZWU9MSBjcmY9MjMuMCBxY29tcD0wLjYwIHFwbWluPTAgcXBtYXg9NjkgcXBzdGVwPTQgaXBfcmF0aW89MS40MCBhcT0xOjEuMDAAgAAAAApliIQM8mKAALC+AAAABUGaOBnqAAAABkGaVAZ6gAAAAAVBmmAz1AAAAAVBmoAz1AAAAAVBmqAz1AAAAAVBmsAz1AAAAAVBmuAz1AAAAAVBmwAz1AAAAAVBmyAz1AAAAAVBm0Az1AAAAAVBm2Az1AAAAAVBm4Az1AAAAAVBm6Az1AAAAAVBm8Az1AAAAAVBm+Az1AAAAAVBmgAz1AAAAAVBmiAz1AAAAAVBmkAz1AAAAAVBmmAz1AAAAAVBmoAz1AAAAAVBmqAz1AAAAAVBmsAv1AAAAAVBmuAv1AAAAAVBmwAr1A==';

        function respondToBlockedAd(url, details, callback) {
            const rType = details.resourceType;

            // 1. Image, beacon, and ping trackers: neutral 1x1 transparent GIF
            if (rType === 'image' || rType === 'ping') {
                return callback({ redirectURL: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' });
            }

            // 2. Ad scripts: neutral no-op JS
            if (rType === 'script') {
                return callback({ redirectURL: 'data:application/javascript;base64,Lyogbm9vcCAqLw==' });
            }

            // 3. Media ad chunks (video/audio ads): neutral 1s black silent mp4 to cleanly finish ad stream
            if (rType === 'media') {
                return callback({ redirectURL: YT_AD_NOOP_VIDEO });
            }

            // 4. XHR, fetch and other requests: clean 200 OK empty response so YouTube does not receive net::ERR_BLOCKED_BY_CLIENT
            if (rType === 'xhr' || rType === 'fetch' || rType === 'other') {
                return callback({ redirectURL: 'data:text/plain;base64,' });
            }

            // 5. All other ad/tracker network requests (fetch, frames, etc.): clean cancel
            return callback({ cancel: true });
        }

        targetSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
            const url = details.url;
            const lowerUrl = url.toLowerCase();

            // Record network requests around playback startup for A/B/C testing diagnostics
            if (global.__networkLog && global.__networkLog.length < 500) {
                global.__networkLog.push({
                    t: Date.now(),
                    url: url,
                    resourceType: details.resourceType || 'other',
                    method: details.method || 'GET'
                });
            }

            // Universal Network Blocker Kill-Switch for A/B/C testing
            if (global.__testConfig && global.__testConfig.networkBlocker === false) {
                return callback({ cancel: false });
            }
            if (braveAdblock.mode === 'off') {
                return callback({ cancel: false });
            }

            // Whitelist media streaming, video chunks, and player integrity endpoints unconditionally
            for (const exception of braveAdblock.exceptionRules) {
                if (lowerUrl.includes(exception)) {
                    return callback({ cancel: false });
                }
            }

            // 1. Primary: High-speed Brave adblock-rust engine inspection
            const decision = braveAdblock.shouldBlock(url, details.referrer, details.resourceType);
            if (decision.block) {
                adblockStats.blockedCount++;
                braveAdblock.recordBlocked(url, decision);
                broadcastShieldsThrottled();
                return respondToBlockedAd(url, details, callback);
            }

            // 2. Secondary fallback: Check against precompiled pattern rules
            const matchesPattern = blockedRegexes.some(regex => regex.test(url));

            if (matchesPattern) {
                adblockStats.blockedCount++;
                braveAdblock.recordBlocked(url, { block: true, rule: 'Pattern Filter Rule', category: 'ad' });
                broadcastShieldsThrottled();
                return respondToBlockedAd(url, details, callback);
            }

            return callback({ cancel: false });
        });

        // Native In-Process Download Manager (Tracks all webview and browser downloads & persists to disk)
        targetSession.on('will-download', (event, item, webContents) => {
            const id = 'dl-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
            const filename = item.getFilename();
            const totalBytes = item.getTotalBytes();
            const url = item.getURL();
            const mimeType = item.getMimeType();
            const startTime = Date.now();
            let lastBytes = 0;
            let lastTime = startTime;
            let speedBps = 0;

            const defaultDownloads = app.getPath('downloads');
            const defaultSavePath = path.join(defaultDownloads, filename);

            const isAutomated = process.env.AUTO_BENCHMARK === '1' || process.env.HEADLESS === '1' || global.__isAutomatedDownloadTest;
            if (isAutomated) {
                item.setSavePath(defaultSavePath);
            } else {
                item.setSaveDialogOptions({
                    defaultPath: defaultSavePath,
                    title: 'Save File to Downloads'
                });
            }

            const downloadRecord = {
                id,
                filename,
                totalBytes,
                totalBytesFormatted: formatBytes(totalBytes),
                receivedBytes: 0,
                receivedBytesFormatted: '0 B',
                percent: 0,
                speed: '0 KB/s',
                speedBps: 0,
                state: 'progressing',
                isPaused: false,
                canResume: item.canResume(),
                url,
                mimeType,
                savePath: defaultSavePath,
                startTime,
                endTime: null
            };

            downloadsMap.set(id, item);
            downloadsList.unshift(downloadRecord);
            savePersistedDownloads();

            console.log(`[Native Downloads] Download started: "${filename}" (${formatBytes(totalBytes)}) from ${url}`);

            const broadcast = (type, data) => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send(type, data);
                }
            };

            broadcast('download-started', downloadRecord);

            item.on('updated', (evt, state) => {
                const now = Date.now();
                const received = item.getReceivedBytes();
                const timeDiff = (now - lastTime) / 1000;
                if (timeDiff >= 0.5) {
                    speedBps = Math.round((received - lastBytes) / timeDiff);
                    lastBytes = received;
                    lastTime = now;
                }

                downloadRecord.savePath = item.getSavePath() || downloadRecord.savePath || defaultSavePath;
                downloadRecord.receivedBytes = received;
                downloadRecord.receivedBytesFormatted = formatBytes(received);
                downloadRecord.totalBytes = item.getTotalBytes() || totalBytes;
                downloadRecord.totalBytesFormatted = formatBytes(downloadRecord.totalBytes);
                downloadRecord.percent = downloadRecord.totalBytes > 0 ? Math.min(100, Math.round((received / downloadRecord.totalBytes) * 100)) : 0;
                downloadRecord.speedBps = speedBps;
                downloadRecord.speed = formatBytes(speedBps) + '/s';
                downloadRecord.state = state;
                downloadRecord.isPaused = item.isPaused();
                downloadRecord.canResume = item.canResume();

                savePersistedDownloads();
                broadcast('download-progress', downloadRecord);
            });

            item.once('done', (evt, state) => {
                downloadRecord.savePath = item.getSavePath() || downloadRecord.savePath || defaultSavePath;
                downloadRecord.state = state;
                downloadRecord.receivedBytes = item.getReceivedBytes();
                downloadRecord.receivedBytesFormatted = formatBytes(downloadRecord.receivedBytes);
                downloadRecord.percent = state === 'completed' ? 100 : downloadRecord.percent;
                downloadRecord.endTime = Date.now();
                downloadRecord.speed = '0 KB/s';
                downloadRecord.speedBps = 0;

                savePersistedDownloads();
                console.log(`[Native Downloads] Download ${state}: "${filename}" -> "${downloadRecord.savePath}" (${downloadRecord.receivedBytesFormatted})`);
                broadcast('download-completed', downloadRecord);
            });
        });

        // Auto-flush cookies to disk on change to guarantee session preservation
        if (targetSession.cookies && targetSession.cookies.on) {
            let cookieDebounce = null;
            targetSession.cookies.on('changed', () => {
                if (cookieDebounce) return;
                cookieDebounce = setTimeout(() => {
                    cookieDebounce = null;
                    targetSession.cookies.flushStore().catch(() => { });
                }, 1500);
            });
        }
    }

    // Configure both default session and persistent partition session
    configureBrowserSession(session.defaultSession, false);
    const persistSession = session.fromPartition('persist:antigravity');
    configureBrowserSession(persistSession, true);

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
        let lastInjectedUrl = '';
        const injectUniversalShields = (force = false) => {
            const url = contents.getURL() || '';
            if (!url || url === 'about:blank') return;
            if (!force && lastInjectedUrl === url) return;
            lastInjectedUrl = url;
            const cosmeticCss = braveAdblock.getCosmeticCSS(url);
            if (cosmeticCss) {
                contents.insertCSS(cosmeticCss, { cssOrigin: 'user' }).catch(() => { });
            }
            const scriptlet = braveAdblock.getUniversalScriptlet();
            contents.executeJavaScript(scriptlet).catch(() => { });
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

        contents.on('dom-ready', () => injectUniversalShields(true));
        contents.on('did-navigate', () => { lastInjectedUrl = ''; injectUniversalShields(false); });
        contents.on('did-navigate-in-page', () => { lastInjectedUrl = ''; injectUniversalShields(true); });
    }
});

// Loopback AI Automation REST Control Server (Strictly local port 4892 for AI agent interaction)
let aiControlServer = null;
const aiPendingRequests = new Map();
let aiRequestIdCounter = 0;

ipcMain.on('ai-control-response', (event, { id, result, error }) => {
    const handler = aiPendingRequests.get(id);
    if (handler) {
        aiPendingRequests.delete(id);
        if (error) {
            handler.reject(new Error(error));
        } else {
            handler.resolve(result);
        }
    }
});

function sendAiControlRequest(action, payload = {}, timeoutMs = 25000) {
    return new Promise((resolve, reject) => {
        if (!mainWindow || mainWindow.isDestroyed()) {
            return reject(new Error('Main browser window is not available'));
        }
        try {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        } catch (e) { }

        const id = ++aiRequestIdCounter;
        const timer = setTimeout(() => {
            if (aiPendingRequests.has(id)) {
                aiPendingRequests.delete(id);
                reject(new Error(`AI Control request '${action}' timed out after ${timeoutMs}ms`));
            }
        }, timeoutMs);

        aiPendingRequests.set(id, {
            resolve: (data) => { clearTimeout(timer); resolve(data); },
            reject: (err) => { clearTimeout(timer); reject(err); }
        });

        mainWindow.webContents.send('ai-control-request', { id, action, payload });
    });
}

const snapshotsDir = path.join(__dirname, '..', 'snapshots');
try { if (!fs.existsSync(snapshotsDir)) fs.mkdirSync(snapshotsDir, { recursive: true }); } catch (e) { }
let latestSnapshotMeta = null;

async function captureVlmSnapshot({ target = 'webview', customName, includeBase64 = false } = {}) {
    try {
        if (!mainWindow || mainWindow.isDestroyed()) {
            return { success: false, error: 'Main window not available' };
        }
        if (!fs.existsSync(snapshotsDir)) {
            fs.mkdirSync(snapshotsDir, { recursive: true });
        }

        const timestamp = Date.now();
        const filename = customName || `vlm_snapshot_${timestamp}.png`;
        const fullPath = path.join(snapshotsDir, filename);

        if (target === 'window') {
            const image = await mainWindow.webContents.capturePage();
            const size = image.getSize();
            const buffer = image.toPNG();
            fs.writeFileSync(fullPath, buffer);
            latestSnapshotMeta = {
                success: true,
                path: fullPath,
                filename,
                width: size.width,
                height: size.height,
                target: 'window',
                timestamp,
                url: mainWindow.webContents.getURL(),
                title: mainWindow.webContents.getTitle()
            };
            if (includeBase64) {
                latestSnapshotMeta.base64 = buffer.toString('base64');
                latestSnapshotMeta.dataUrl = image.toDataURL();
            }
            return latestSnapshotMeta;
        }

        // Guest webview capture via renderer
        try {
            const renderRes = await sendAiControlRequest('capture-screenshot', { filename, includeBase64 });
            if (renderRes && renderRes.success) {
                latestSnapshotMeta = renderRes;
                return renderRes;
            }
        } catch (renderErr) {
            console.warn('[VLM Snapshot] Webview capture via renderer failed, falling back to window capture:', renderErr.message);
        }

        // Fallback to window capture
        const image = await mainWindow.webContents.capturePage();
        const size = image.getSize();
        const buffer = image.toPNG();
        fs.writeFileSync(fullPath, buffer);
        latestSnapshotMeta = {
            success: true,
            path: fullPath,
            filename,
            width: size.width,
            height: size.height,
            target: 'window_fallback',
            timestamp,
            url: mainWindow.webContents.getURL(),
            title: mainWindow.webContents.getTitle()
        };
        if (includeBase64) {
            latestSnapshotMeta.base64 = buffer.toString('base64');
            latestSnapshotMeta.dataUrl = image.toDataURL();
        }
        return latestSnapshotMeta;
    } catch (err) {
        console.error('[VLM Snapshot Error]', err);
        return { success: false, error: err.message };
    }
}

function startAiControlServer(port = 4892) {
    if (aiControlServer) return;

    aiControlServer = http.createServer(async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            return res.end();
        }

        const parsedUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1:4892'}`);
        const pathname = parsedUrl.pathname;

        const sendJson = (statusCode, data) => {
            res.writeHead(statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
        };

        const readBody = () => new Promise((resolve) => {
            let data = '';
            req.on('data', chunk => { data += chunk; });
            req.on('end', () => {
                if (!data.trim()) return resolve({});
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve({ raw: data });
                }
            });
            req.on('error', () => resolve({}));
        });

        try {
            if (pathname === '/api/status' && req.method === 'GET') {
                return sendJson(200, {
                    status: 'ok',
                    app: 'Antigravity Native Browser',
                    port,
                    pid: process.pid,
                    platform: process.platform,
                    adblockStats: braveAdblock.getStats()
                });
            }

            if (pathname === '/api/shield-mode' && req.method === 'POST') {
                const body = await readBody();
                const mode = (body && (body.mode || body.value)) || 'aggressive';
                braveAdblock.setMode(mode);
                const stats = braveAdblock.getStats();
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('brave-shields-updated', stats);
                }
                return sendJson(200, { success: true, mode, stats });
            }

            if (pathname === '/api/test/config' && req.method === 'POST') {
                const body = await readBody();
                if (body && body.networkBlocker !== undefined) {
                    global.__testConfig.networkBlocker = !!body.networkBlocker;
                    braveAdblock.setMode(body.networkBlocker ? 'aggressive' : 'off');
                }
                if (body && body.testMode) {
                    global.__testConfig.testMode = body.testMode;
                }
                global.__networkLog = [];
                return sendJson(200, { success: true, config: global.__testConfig });
            }

            if (pathname === '/api/test/config' && req.method === 'GET') {
                return sendJson(200, { success: true, config: global.__testConfig });
            }

            if (pathname === '/api/test/network-log' && req.method === 'GET') {
                return sendJson(200, { success: true, count: global.__networkLog.length, log: global.__networkLog });
            }

            if (pathname === '/api/test/network-log/clear' && req.method === 'POST') {
                global.__networkLog = [];
                return sendJson(200, { success: true });
            }

            if (pathname === '/api/restart' && req.method === 'POST') {
                sendJson(200, { success: true, message: 'Relaunching Electron' });
                setTimeout(() => {
                    app.relaunch();
                    app.exit(0);
                }, 200);
                return;
            }

            if (pathname === '/api/focus' && req.method === 'POST') {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    if (mainWindow.isMinimized()) mainWindow.restore();
                    mainWindow.show();
                    mainWindow.maximize();
                    mainWindow.setAlwaysOnTop(true);
                    mainWindow.focus();
                    mainWindow.moveTop();
                    setTimeout(() => {
                        try { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setAlwaysOnTop(false); } catch (e) { }
                    }, 2000);
                }
                return sendJson(200, { success: true });
            }

            if (pathname === '/api/window/state' && req.method === 'GET') {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    return sendJson(200, {
                        success: true,
                        isMaximized: mainWindow.isMaximized(),
                        isMinimized: mainWindow.isMinimized(),
                        isFullScreen: mainWindow.isFullScreen(),
                        bounds: mainWindow.getBounds()
                    });
                }
                return sendJson(500, { error: 'Window not available' });
            }

            if (pathname === '/api/window/maximize' && req.method === 'POST') {
                toggleMainWindowMaximize();
                if (mainWindow && !mainWindow.isDestroyed()) {
                    return sendJson(200, {
                        success: true,
                        isMaximized: mainWindow.isMaximized(),
                        bounds: mainWindow.getBounds()
                    });
                }
                return sendJson(200, { success: true });
            }

            if (pathname === '/api/window/minimize' && req.method === 'POST') {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.minimize();
                }
                return sendJson(200, { success: true });
            }

            if (pathname === '/api/tabs' && req.method === 'GET') {
                const result = await sendAiControlRequest('get-tabs');
                return sendJson(200, { success: true, ...result });
            }

            // Tab Management: Switch Tab (supports /api/tabs/switch, /api/tab/switch, /api/tab/1, /api/tab/2)
            if ((pathname === '/api/tabs/switch' || pathname === '/api/tab/switch' || (pathname.startsWith('/api/tab/') && pathname !== '/api/tab/new' && pathname !== '/api/tab/close')) && req.method === 'POST') {
                const body = await readBody();
                let targetId = body.id || body.tabId;
                let targetIndex = body.index !== undefined ? body.index : body.tabIndex;
                if (pathname.startsWith('/api/tab/') && pathname !== '/api/tab/switch') {
                    const sub = pathname.replace('/api/tab/', '').trim();
                    if (/^\d+$/.test(sub)) {
                        targetIndex = parseInt(sub, 10);
                    } else if (sub) {
                        targetId = sub;
                    }
                }
                const result = await sendAiControlRequest('switch-tab', { id: targetId, index: targetIndex });
                return sendJson(200, result || { success: true });
            }

            // Tab Management: Close Tab (/api/tabs/close, /api/tab/close)
            if ((pathname === '/api/tabs/close' || pathname === '/api/tab/close') && req.method === 'POST') {
                const body = await readBody();
                const result = await sendAiControlRequest('close-tab', { id: body.id || body.tabId, index: body.index });
                return sendJson(200, result || { success: true });
            }

            // Tab Management: New Tab (/api/tabs/new, /api/tab/new)
            if ((pathname === '/api/tabs/new' || pathname === '/api/tab/new') && req.method === 'POST') {
                const body = await readBody();
                const result = await sendAiControlRequest('new-tab', { url: body.url || body.target || '' });
                return sendJson(200, result || { success: true });
            }

            // VLM Visual Snapshot Endpoints
            if ((pathname === '/api/screenshot' || pathname === '/api/snapshot') && req.method === 'POST') {
                const body = await readBody();
                const target = body.target || 'webview';
                const customName = body.filename || body.customName;
                const includeBase64 = !!body.includeBase64;
                const result = await captureVlmSnapshot({ target, customName, includeBase64 });
                return sendJson(result.success ? 200 : 500, result);
            }

            if ((pathname === '/api/screenshot' || pathname === '/api/snapshot') && req.method === 'GET') {
                if (latestSnapshotMeta && latestSnapshotMeta.path && fs.existsSync(latestSnapshotMeta.path)) {
                    return sendJson(200, latestSnapshotMeta);
                }
                const result = await captureVlmSnapshot({ target: 'webview' });
                return sendJson(result.success ? 200 : 500, result);
            }

            if (pathname === '/api/screenshot/raw' && req.method === 'GET') {
                if (latestSnapshotMeta && latestSnapshotMeta.path && fs.existsSync(latestSnapshotMeta.path)) {
                    res.writeHead(200, { 'Content-Type': 'image/png' });
                    fs.createReadStream(latestSnapshotMeta.path).pipe(res);
                    return;
                }
                return sendJson(404, { success: false, error: 'No snapshot available on disk' });
            }

            if (pathname === '/api/navigate' && req.method === 'POST') {
                const body = await readBody();
                const targetUrl = body.url || body.target || '';
                const result = await sendAiControlRequest('navigate', { url: targetUrl });
                return sendJson(200, result);
            }

            if (pathname === '/api/command' && req.method === 'POST') {
                const body = await readBody();
                const prompt = body.prompt || body.command || '';
                const result = await sendAiControlRequest('command', { prompt }, 90000);
                return sendJson(200, result);
            }

            if (pathname === '/api/click' && req.method === 'POST') {
                const body = await readBody();
                const target = body.target || body.text || '';
                const result = await sendAiControlRequest('click', { target });
                return sendJson(200, result);
            }

            if ((pathname === '/api/press_key' || pathname === '/api/key') && req.method === 'POST') {
                const body = await readBody();
                const key = body.key || body.target || 'Space';
                const result = await sendAiControlRequest('press-key', { key, modifiers: body.modifiers || [] });
                return sendJson(200, result);
            }

            if (pathname === '/api/hover' && req.method === 'POST') {
                const body = await readBody();
                const target = body.target || body.text || '';
                const result = await sendAiControlRequest('hover', { target });
                return sendJson(200, result);
            }

            if (pathname === '/api/type' && req.method === 'POST') {
                const body = await readBody();
                const result = await sendAiControlRequest('type', {
                    text: body.text || '',
                    target: body.target || body.selector,
                    submit: body.submit === true,
                    clear: body.clear !== false
                });
                return sendJson(200, result);
            }

            if (pathname === '/api/scroll' && req.method === 'POST') {
                const body = await readBody();
                const result = await sendAiControlRequest('scroll', {
                    direction: body.direction || 'down',
                    amount: body.amount !== undefined ? body.amount : 50,
                    isPercent: body.isPercent !== false
                });
                return sendJson(200, result);
            }

            if (pathname === '/api/page/content' && req.method === 'GET') {
                const result = await sendAiControlRequest('get-page-content');
                return sendJson(200, { success: true, page: result });
            }

            if (pathname === '/api/eval' && req.method === 'POST') {
                const body = await readBody();
                const result = await sendAiControlRequest('eval', { script: body.script });
                return sendJson(200, { success: true, result });
            }

            if (pathname === '/api/page/context' && req.method === 'GET') {
                const result = await sendAiControlRequest('get-page-context');
                return sendJson(200, { success: true, context: result });
            }

            if (pathname === '/api/site/act' && req.method === 'POST') {
                const body = await readBody();
                const result = await sendAiControlRequest('site-act', body);
                return sendJson(200, { success: true, result });
            }

            if (pathname === '/api/hud/toggle' && req.method === 'POST') {
                const result = await sendAiControlRequest('toggle-hud');
                return sendJson(200, { success: true, result });
            }

            if (pathname === '/api/copilot/chat' && req.method === 'POST') {
                const body = await readBody();
                const result = await sendAiControlRequest('copilot-chat', body);
                return sendJson(200, { success: true, result });
            }

            if (pathname === '/api/whisper/status' && req.method === 'GET') {
                return sendJson(200, {
                    success: true,
                    ready: whisperEngine.isReady(),
                    initializing: whisperEngine.isInitializing(),
                    model: 'onnx-community/whisper-base',
                    languages: ['auto', 'en', 'hi', 'ko']
                });
            }

            if (pathname === '/api/whisper/transcribe' && req.method === 'POST') {
                const body = await readBody();
                const { audioData, audio, language, sampleRate, executeCommand } = body || {};
                const result = await whisperEngine.transcribeAudio(audioData || audio, { language, sampleRate });
                if (result && result.success && result.text && executeCommand) {
                    const cmdResult = await sendAiControlRequest('command', { prompt: result.text }, 90000);
                    await sendAiControlRequest('copilot-chat', { query: result.text }).catch(() => { });
                    return sendJson(200, { ...result, commandExecuted: true, commandResult: cmdResult });
                }
                return sendJson(result && result.success ? 200 : 400, result);
            }

            // --- Download Manager Endpoints ---
            if (pathname === '/api/downloads' && req.method === 'GET') {
                return sendJson(200, {
                    success: true,
                    count: downloadsList.length,
                    activeCount: downloadsList.filter(d => d.state === 'progressing').length,
                    downloads: downloadsList
                });
            }

            if (pathname === '/api/downloads/active' && req.method === 'GET') {
                const active = downloadsList.filter(d => d.state === 'progressing');
                return sendJson(200, { success: true, count: active.length, downloads: active });
            }

            if (pathname === '/api/downloads/clear' && req.method === 'POST') {
                const toRemove = downloadsList.filter(d => d.state === 'completed' || d.state === 'cancelled' || d.state === 'interrupted');
                for (const item of toRemove) {
                    const idx = downloadsList.indexOf(item);
                    if (idx !== -1) downloadsList.splice(idx, 1);
                    downloadsMap.delete(item.id);
                }
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('download-list-updated', downloadsList);
                }
                return sendJson(200, { success: true, remaining: downloadsList.length });
            }

            if (pathname === '/api/downloads/cancel' && req.method === 'POST') {
                const body = await readBody();
                const dl = downloadsMap.get(body.id);
                if (dl && dl.cancel) {
                    dl.cancel();
                    return sendJson(200, { success: true, id: body.id });
                }
                return sendJson(404, { success: false, error: 'Active download not found with given id' });
            }

            if (pathname === '/api/downloads/open' && req.method === 'POST') {
                const body = await readBody();
                const item = downloadsList.find(d => d.id === body.id) || downloadsList[0];
                if (item && item.savePath && fs.existsSync(item.savePath)) {
                    if (body.action === 'show' || body.action === 'folder') {
                        shell.showItemInFolder(item.savePath);
                    } else {
                        shell.openPath(item.savePath);
                    }
                    return sendJson(200, { success: true, item });
                }
                return sendJson(404, { success: false, error: 'File or download record not found' });
            }

            if (pathname === '/api/downloads/view' && req.method === 'POST') {
                const result = await sendAiControlRequest('navigate', { url: 'antigravity://downloads' });
                return sendJson(200, { success: true, result });
            }

            if (pathname === '/api/downloads/trigger' && req.method === 'POST') {
                const body = await readBody();
                const targetUrl = body.url || body.target;
                if (!targetUrl) return sendJson(400, { success: false, error: 'url is required' });
                try {
                    global.__isAutomatedDownloadTest = true;
                    session.defaultSession.downloadURL(targetUrl);
                    return sendJson(200, { success: true, message: `Download initiated for ${targetUrl}` });
                } catch (dlErr) {
                    return sendJson(500, { success: false, error: dlErr.message });
                }
            }

            if (pathname === '/api/downloads/verify' && req.method === 'GET') {
                const active = downloadsList.filter(d => d.state === 'progressing');
                const completed = downloadsList.filter(d => d.state === 'completed');
                return sendJson(200, {
                    success: true,
                    hasActiveDownloads: active.length > 0,
                    hasCompletedDownloads: completed.length > 0,
                    totalCount: downloadsList.length,
                    activeCount: active.length,
                    completedCount: completed.length,
                    active,
                    completed
                });
            }

            if (pathname === '/api/restart' && req.method === 'POST') {
                sendJson(200, { success: true, message: 'Restarting Antigravity Browser...' });
                setTimeout(() => {
                    app.relaunch();
                    app.exit(0);
                }, 200);
                return;
            }

            return sendJson(404, { error: 'Not Found', pathname });
        } catch (err) {
            console.error('[AI Control Server Error]', err);
            return sendJson(500, { success: false, error: err.message });
        }
    });

    aiControlServer.on('error', (err) => {
        console.error('[AI Control Server Listen Error]', err.message);
    });

    aiControlServer.listen(port, '127.0.0.1', () => {
        console.log(`[AI Control Server] Loopback automation active on http://127.0.0.1:${port}`);
    });
}

app.whenReady().then(() => {
    createWindow();
    startAiControlServer(4892);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('before-quit', async () => {
    try {
        await session.defaultSession.cookies.flushStore();
        const pSess = session.fromPartition('persist:antigravity');
        if (pSess) await pSess.cookies.flushStore();
    } catch (e) { }
});

app.on('will-quit', () => {
    if (aiControlServer) {
        try { aiControlServer.close(); } catch (e) { }
    }
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

// Native Wallpaper File Picker & Persistent Storage IPC
ipcMain.handle('wallpaper:pick-local-file', async () => {
    try {
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            title: 'Select Wallpaper (Image or Video)',
            properties: ['openFile'],
            filters: [
                { name: 'Media Files', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'mov', 'm4v'] },
                { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] },
                { name: 'Videos', extensions: ['mp4', 'webm', 'mov', 'm4v'] }
            ]
        });

        if (canceled || !filePaths || filePaths.length === 0) {
            return { canceled: true };
        }

        const sourcePath = filePaths[0];
        const ext = path.extname(sourcePath).toLowerCase();
        const isVideo = ['.mp4', '.webm', '.mov', '.m4v'].includes(ext);

        const wallpaperDir = path.join(app.getPath('userData'), 'wallpapers');
        if (!fs.existsSync(wallpaperDir)) {
            fs.mkdirSync(wallpaperDir, { recursive: true });
        }

        const safeBaseName = `${Date.now()}_${path.basename(sourcePath).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const destPath = path.join(wallpaperDir, safeBaseName);
        fs.copyFileSync(sourcePath, destPath);

        const fileUrl = 'file:///' + destPath.replace(/\\/g, '/');

        return {
            success: true,
            canceled: false,
            url: fileUrl,
            type: isVideo ? 'video' : 'image',
            fileName: path.basename(sourcePath)
        };
    } catch (err) {
        console.error('[Wallpaper Pick Error]', err);
        return { success: false, error: err.message };
    }
});

ipcMain.on('check-url-block-sync', (event, arg) => {
    const url = typeof arg === 'string' ? arg : (arg ? arg.url : '');
    const initiatorUrl = typeof arg === 'object' && arg ? arg.initiatorUrl : '';
    const isBlock = braveAdblock.isSuspiciousPopup(url, initiatorUrl) || braveAdblock.shouldBlock(url, initiatorUrl).block;
    event.returnValue = isBlock;
});

ipcMain.handle('capture-vlm-snapshot', async (event, options = {}) => {
    return await captureVlmSnapshot(options);
});

ipcMain.handle('save-vlm-snapshot', async (event, data = {}) => {
    try {
        if (!fs.existsSync(snapshotsDir)) fs.mkdirSync(snapshotsDir, { recursive: true });
        const timestamp = Date.now();
        const filename = data.filename || `vlm_snapshot_${timestamp}.png`;
        const fullPath = path.join(snapshotsDir, filename);

        let buffer;
        if (data.dataUrl && data.dataUrl.startsWith('data:image/')) {
            const base64Data = data.dataUrl.replace(/^data:image\/\w+;base64,/, '');
            buffer = Buffer.from(base64Data, 'base64');
        } else if (data.base64) {
            buffer = Buffer.from(data.base64, 'base64');
        } else if (data.buffer) {
            buffer = Buffer.from(data.buffer);
        }

        if (!buffer || buffer.length === 0) {
            if (mainWindow && !mainWindow.isDestroyed()) {
                const winImg = await mainWindow.webContents.capturePage();
                buffer = winImg.toPNG();
                data.width = winImg.getSize().width;
                data.height = winImg.getSize().height;
            } else {
                throw new Error('No image buffer or base64 provided to save');
            }
        }

        fs.writeFileSync(fullPath, buffer);
        const meta = {
            success: true,
            path: fullPath,
            filename,
            width: data.width || 0,
            height: data.height || 0,
            url: data.url || '',
            title: data.title || '',
            timestamp,
            target: 'webview'
        };
        if (data.includeBase64) {
            meta.base64 = buffer.toString('base64');
            meta.dataUrl = data.dataUrl || `data:image/png;base64,${meta.base64}`;
        }
        latestSnapshotMeta = meta;
        console.log('[Native Browser] Saved VLM snapshot to:', fullPath);
        return meta;
    } catch (e) {
        console.error('[Native Browser] Error saving VLM snapshot:', e);
        return { success: false, error: e.message };
    }
});

ipcMain.handle('capture-page-snapshot', async (event, customName) => {
    if (!mainWindow || mainWindow.isDestroyed()) return false;
    try {
        const image = await mainWindow.webContents.capturePage();
        const outDir = process.env.SNAPSHOT_DIR || snapshotsDir;
        try { if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true }); } catch (e) { }
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
function toggleMainWindowMaximize() {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isFullScreen()) {
        mainWindow.setFullScreen(false);
    } else if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
        // Ensure the restored window is a clean floating mini-window (not full screen)
        const bounds = mainWindow.getBounds();
        const { screen } = require('electron');
        const display = screen.getDisplayMatching(bounds);
        const workArea = display.workArea;
        if (bounds.width >= workArea.width - 20) {
            const targetW = Math.min(1200, Math.floor(workArea.width * 0.82));
            const targetH = Math.min(750, Math.floor(workArea.height * 0.82));
            mainWindow.setBounds({
                width: targetW,
                height: targetH,
                x: Math.round(workArea.x + (workArea.width - targetW) / 2),
                y: Math.round(workArea.y + (workArea.height - targetH) / 2)
            });
        }
    } else {
        mainWindow.maximize();
    }
}

ipcMain.on('window-minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});
ipcMain.handle('window-minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});

ipcMain.on('window-maximize', toggleMainWindowMaximize);
ipcMain.handle('window-maximize', toggleMainWindowMaximize);

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
        const { audioData, language, sampleRate } = payload || {};
        const result = await whisperEngine.transcribeAudio(audioData, { language, sampleRate });
        return result;
    } catch (err) {
        console.error('[Main] Whisper transcription failed:', err);
        return { success: false, error: err.message };
    }
});

// Download Manager IPC Handlers
ipcMain.handle('get-downloads', () => downloadsList);

ipcMain.handle('cancel-download', (event, id) => {
    const item = downloadsMap.get(id);
    if (item && item.cancel) {
        item.cancel();
        return true;
    }
    return false;
});

ipcMain.handle('pause-download', (event, id) => {
    const item = downloadsMap.get(id);
    if (item && item.pause) {
        item.pause();
        return true;
    }
    return false;
});

ipcMain.handle('resume-download', (event, id) => {
    const item = downloadsMap.get(id);
    if (item && item.resume) {
        item.resume();
        return true;
    }
    return false;
});

ipcMain.handle('show-download-in-folder', (event, savePath) => {
    if (savePath && fs.existsSync(savePath)) {
        shell.showItemInFolder(savePath);
        return true;
    }
    return false;
});

ipcMain.handle('open-download-file', (event, savePath) => {
    if (savePath && fs.existsSync(savePath)) {
        shell.openPath(savePath);
        return true;
    }
    return false;
});

ipcMain.handle('open-downloads-folder', () => {
    const dlFolder = app.getPath('downloads');
    shell.openPath(dlFolder);
    return true;
});

ipcMain.handle('clear-completed-downloads', () => {
    const toRemove = downloadsList.filter(d => d.state === 'completed' || d.state === 'cancelled' || d.state === 'interrupted');
    for (const item of toRemove) {
        const idx = downloadsList.indexOf(item);
        if (idx !== -1) downloadsList.splice(idx, 1);
        downloadsMap.delete(item.id);
    }
    savePersistedDownloads();
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download-list-updated', downloadsList);
    }
    return downloadsList;
});

// Browsing History IPC Handlers (Persisted to disk)
ipcMain.handle('get-history', () => {
    return loadPersistedHistory();
});

ipcMain.handle('save-history', (event, historyList) => {
    return savePersistedHistory(historyList);
});

ipcMain.handle('clear-history', () => {
    return savePersistedHistory([]);
});



