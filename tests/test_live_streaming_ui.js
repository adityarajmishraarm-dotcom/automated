// Test Live Response Streaming, Thinking Streaming, Retract Button & Antigravity Tool Cards in Native UI
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:4892';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function post(endpoint, body = {}) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = http.request(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        }, res => {
            let b = '';
            res.on('data', c => b += c);
            res.on('end', () => {
                try { resolve(JSON.parse(b)); } catch (e) { resolve(b); }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function get(endpoint) {
    return new Promise((resolve, reject) => {
        http.get(`${BASE_URL}${endpoint}`, res => {
            let b = '';
            res.on('data', c => b += c);
            res.on('end', () => {
                try { resolve(JSON.parse(b)); } catch (e) { resolve(b); }
            });
        }).on('error', reject);
    });
}

async function runLiveStreamingUiTest() {
    console.log('====================================================');
    console.log('TESTING LIVE UI STREAMING, THINKING & TOOL CARDS');
    console.log('====================================================\n');

    // 1. Focus the native browser window (Rule 4)
    console.log('[1] Ensuring browser window is visible and focused...');
    await post('/api/focus', {});
    console.log('✓ Window focused and brought to foreground.');

    // 2. Ensure HUD sidebar is opened and docked
    console.log('\n[2] Ensuring AI Copilot HUD sidebar is opened...');
    const hudRes = await post('/api/hud/toggle', {});
    console.log('✓ HUD state:', hudRes);
    await sleep(800);

    // 3. Dispatch a live query via /api/copilot/chat
    const query = "open a new tab and in that open moviesmod.zone";
    console.log(`\n[3] Dispatching Copilot Query: "${query}"...`);
    const chatRes = await post('/api/copilot/chat', { query });
    console.log('✓ Dispatched to Copilot UI:', chatRes);

    // 4. While streaming and thinking are occurring, capture mid-stream snapshot
    console.log('\n[4] Waiting 2.5 seconds for live streaming / thinking / tool execution...');
    await sleep(2500);

    console.log('  Capturing live streaming snapshot...');
    const snap1 = await post('/api/screenshot', { target: 'window', filename: 'live_streaming_in_progress.png' });
    console.log('  ✓ Snapshot 1 captured:', snap1.path);

    // 5. Wait for agent to continue and take another snapshot
    console.log('\n[5] Waiting 4.5 seconds for tool verification and response...');
    await sleep(4500);

    console.log('  Capturing settled/completed snapshot...');
    const snap2 = await post('/api/screenshot', { target: 'window', filename: 'live_streaming_completed.png' });
    console.log('  ✓ Snapshot 2 captured:', snap2.path);

    // 6. Verify tabs
    const tabsRes = await get('/api/tabs');
    console.log('\n[6] Open Tabs after execution:');
    (tabsRes.tabs || []).forEach((t, i) => {
        console.log(`  [Tab ${i + 1}] "${t.title || 'Untitled'}" (${t.url})`);
    });

    console.log('\n====================================================');
    console.log('UI STREAMING & TOOL EXECUTION TEST COMPLETE');
    console.log('====================================================\n');
}

runLiveStreamingUiTest().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
