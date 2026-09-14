const http = require('http');

const BASE_URL = 'http://127.0.0.1:4892';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function post(path, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = http.request({
            hostname: '127.0.0.1',
            port: 4892,
            path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        }, res => {
            let buf = '';
            res.on('data', c => buf += c);
            res.on('end', () => {
                try { resolve(JSON.parse(buf)); } catch (e) { resolve(buf); }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function get(path) {
    return new Promise((resolve, reject) => {
        http.get(`${BASE_URL}${path}`, res => {
            let buf = '';
            res.on('data', c => buf += c);
            res.on('end', () => {
                try { resolve(JSON.parse(buf)); } catch (e) { resolve(buf); }
            });
        }).on('error', reject);
    });
}

async function runTests() {
    console.log('====================================================');
    console.log('TESTING AI TOOL CALLING & STATE VERIFICATION LOOP');
    console.log('====================================================\n');

    // 1. Focus window (Rule 4)
    console.log('[1] Ensuring browser window is visible and focused...');
    await post('/api/focus', {});
    console.log('✓ Window brought to foreground.');

    // 2. Test conversational command: "can you open a new tab for me"
    console.log('\n[2] Testing conversational: "can you open a new tab for me"...');
    const tabsBefore = await get('/api/tabs');
    const countBefore = tabsBefore.tabs.length;
    console.log(`  Initial open tabs: ${countBefore}`);

    const cmdRes1 = await post('/api/command', { prompt: 'can you open a new tab for me' });
    console.log('  Command response:', cmdRes1.reply);

    if (!cmdRes1.reply.includes('Verified Action')) {
        throw new Error('Expected reply to contain [Verified Action]');
    }

    await sleep(600);
    const tabsAfter1 = await get('/api/tabs');
    console.log(`  Tabs after command: ${tabsAfter1.tabs.length}`);
    if (tabsAfter1.tabs.length !== countBefore + 1) {
        throw new Error(`Tab count should have increased from ${countBefore} to ${countBefore + 1}, got ${tabsAfter1.tabs.length}`);
    }
    console.log('✓ Tab physically created and verified!');

    // 3. Test opening a website in new tab
    console.log('\n[3] Testing: "open https://example.com"...');
    const cmdRes2 = await post('/api/command', { prompt: 'open https://example.com' });
    console.log('  Command response:', cmdRes2.reply);
    await sleep(800);
    const tabsAfter2 = await get('/api/tabs');
    console.log(`  Tabs count: ${tabsAfter2.tabs.length}`);
    if (tabsAfter2.tabs.length !== countBefore + 2) {
        throw new Error('Tab count did not increment for https://example.com');
    }
    console.log('✓ Website opened in new tab and verified!');

    // 4. Test conversational tab closing
    console.log('\n[4] Testing conversational: "please close this tab"...');
    const countBeforeClose = tabsAfter2.tabs.length;
    const cmdRes3 = await post('/api/command', { prompt: 'please close this tab' });
    console.log('  Command response:', cmdRes3.reply);
    await sleep(600);
    const tabsAfter3 = await get('/api/tabs');
    console.log(`  Tabs remaining: ${tabsAfter3.tabs.length}`);
    if (tabsAfter3.tabs.length !== countBeforeClose - 1) {
        throw new Error('Tab count did not decrement after close');
    }
    console.log('✓ Tab closed and verified!');

    // 5. Test download trigger and download verification
    console.log('\n[5] Testing Download Trigger & Verification Loop...');
    const dlTrigger = await post('/api/downloads/trigger', {
        url: 'https://raw.githubusercontent.com/electron/electron/main/default_app/icon.png'
    });
    console.log('  Download trigger response:', dlTrigger);

    await sleep(1500);
    const dlVerify = await get('/api/downloads/verify');
    console.log(`  Downloads verify: Total ${dlVerify.totalCount}, Completed ${dlVerify.completedCount}`);
    if (!dlVerify.hasCompletedDownloads && !dlVerify.hasActiveDownloads) {
        throw new Error('No download was verified in downloads manager');
    }
    console.log('  Last completed file:', dlVerify.completed[0]?.filename, '->', dlVerify.completed[0]?.savePath);

    // 6. Test AI command: "verify download"
    console.log('\n[6] Testing AI command: "verify download"...');
    const aiDlReply = await post('/api/command', { prompt: 'verify download' });
    console.log('  AI Reply:', aiDlReply.reply);
    if (!aiDlReply.reply.includes('Verified Action: Download verified on disk')) {
        throw new Error('AI did not report verified download');
    }
    console.log('✓ Download verification reported accurately by AI!');

    // 7. Capture visual VLM snapshot of full visible browser (Rule 4)
    console.log('\n[7] Capturing full visible browser snapshot for visual confirmation...');
    const snapRes = await post('/api/screenshot', { target: 'window' });
    console.log(`✓ Screenshot captured at: ${snapRes.path} (${snapRes.width}x${snapRes.height})`);

    console.log('\n====================================================');
    console.log('ALL TOOL CALLING & VERIFICATION TESTS PASSED 100%!');
    console.log('====================================================\n');
}

runTests().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
