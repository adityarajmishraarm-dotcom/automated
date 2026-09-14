const http = require('http');
const fs = require('fs');

const BASE_URL = 'http://127.0.0.1:4892';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function api(path, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const reqOpts = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        let bodyData = null;
        if (options.body) {
            bodyData = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
            reqOpts.headers['Content-Type'] = 'application/json';
            reqOpts.headers['Content-Length'] = Buffer.byteLength(bodyData);
        }

        const req = http.request(reqOpts, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data });
                }
            });
        });

        req.on('error', reject);
        if (bodyData) req.write(bodyData);
        req.end();
    });
}

async function runTests() {
    console.log('====================================================');
    console.log('VERIFYING AI LAYER ROUTES, TABS & VLM SCREENSHOTS');
    console.log('====================================================\n');

    // Wait for server to be responsive
    let ready = false;
    for (let i = 0; i < 15; i++) {
        try {
            const statusRes = await api('/api/status');
            if (statusRes.status === 200 && statusRes.data.status === 'ok') {
                console.log('✓ Browser server is ready on port 4892.');
                ready = true;
                break;
            }
        } catch (e) {}
        await sleep(1000);
    }

    if (!ready) {
        throw new Error('AI Control Server not reachable on 127.0.0.1:4892 after 15 seconds.');
    }

    // Step 1: Ensure Visible Full UI on Screen
    console.log('\n[1] Bringing browser window to foreground (Visible Full Browser UI rule)...');
    const focusRes = await api('/api/focus', { method: 'POST' });
    console.log('✓ /api/focus response:', focusRes.data);

    // Step 2: Test Tab Management Routes
    console.log('\n[2] Testing Tab Management Routes (/api/tabs, /api/tabs/new, /api/tabs/switch, /api/tabs/close)...');
    
    // Get initial tabs
    const initialTabs = await api('/api/tabs');
    console.log(`Initial tabs count: ${initialTabs.data.tabs.length}`);

    // Create new tab via /api/tabs/new
    console.log('Opening new tab via POST /api/tabs/new...');
    const newTabRes = await api('/api/tabs/new', {
        method: 'POST',
        body: { url: 'https://www.google.com' }
    });
    console.log('✓ New tab created:', newTabRes.data);
    await sleep(2500);

    const afterNewTabs = await api('/api/tabs');
    console.log(`Tabs count after new tab: ${afterNewTabs.data.tabs.length}`);
    if (afterNewTabs.data.tabs.length <= initialTabs.data.tabs.length) {
        throw new Error('New tab was not added to tab strip');
    }

    // Switch to tab 1 (tabone) via POST /api/tabs/switch
    console.log('Switching back to 1st tab via POST /api/tabs/switch (index: 1)...');
    const switchRes = await api('/api/tabs/switch', {
        method: 'POST',
        body: { index: 1 }
    });
    console.log('✓ Switch tab response:', switchRes.data);
    await sleep(1000);

    // Close 2nd tab (tabclose) via POST /api/tabs/close
    console.log('Closing 2nd tab via POST /api/tabs/close (index: 2)...');
    const closeRes = await api('/api/tabs/close', {
        method: 'POST',
        body: { index: 2 }
    });
    console.log('✓ Close tab response:', closeRes.data);
    await sleep(1000);

    const finalTabs = await api('/api/tabs');
    console.log(`Final tabs count after close: ${finalTabs.data.tabs.length}`);

    // Step 3: Test VLM Screenshot Capture via Disk File Path
    console.log('\n[3] Testing VLM Screenshot Subsystem via File Path (/api/screenshot)...');
    
    // A. Webview snapshot
    console.log('Capturing guest webview snapshot (target: "webview")...');
    const snapWebviewRes = await api('/api/screenshot', {
        method: 'POST',
        body: { target: 'webview', includeBase64: false }
    });
    console.log('✓ Webview snapshot response:', snapWebviewRes.data);

    if (!snapWebviewRes.data.success || !snapWebviewRes.data.path) {
        throw new Error('Webview screenshot failed or did not return a file path');
    }

    const webviewPath = snapWebviewRes.data.path;
    console.log(`Verifying file exists on disk at: "${webviewPath}"...`);
    if (!fs.existsSync(webviewPath)) {
        throw new Error(`Screenshot file not found on disk at: ${webviewPath}`);
    }
    const webviewStats = fs.statSync(webviewPath);
    console.log(`✓ File verified on disk! Size: ${webviewStats.size} bytes (${Math.round(webviewStats.size / 1024)} KB).`);

    // B. Window snapshot
    console.log('\nCapturing full browser window snapshot (target: "window")...');
    const snapWindowRes = await api('/api/screenshot', {
        method: 'POST',
        body: { target: 'window', includeBase64: false }
    });
    console.log('✓ Window snapshot response:', snapWindowRes.data);

    if (!snapWindowRes.data.success || !snapWindowRes.data.path) {
        throw new Error('Window screenshot failed or did not return a file path');
    }

    const windowPath = snapWindowRes.data.path;
    if (!fs.existsSync(windowPath)) {
        throw new Error(`Window screenshot file not found on disk at: ${windowPath}`);
    }
    const windowStats = fs.statSync(windowPath);
    console.log(`✓ File verified on disk! Size: ${windowStats.size} bytes (${Math.round(windowStats.size / 1024)} KB).`);

    // C. GET /api/screenshot
    console.log('\nTesting GET /api/screenshot...');
    const getSnapRes = await api('/api/screenshot');
    console.log('✓ GET /api/screenshot returned latest metadata:', getSnapRes.data.filename);

    console.log('\n====================================================');
    console.log('ALL AI ROUTES & VLM SCREENSHOT VERIFICATIONS PASSED!');
    console.log('====================================================\n');
}

runTests().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
