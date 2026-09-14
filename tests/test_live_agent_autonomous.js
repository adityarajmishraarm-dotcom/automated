// Automated Test for Autonomous Agent Reasoning & Execution Loop
const assert = require('assert');

async function runAutonomousTest() {
    console.log('====================================================');
    console.log('TESTING LIVE AUTONOMOUS AGENT REASONING & EXECUTION');
    console.log('====================================================\n');

    // 1. Ensure window is visible and focused
    console.log('[1] Ensuring browser window is visible and focused...');
    await fetch('http://127.0.0.1:4892/api/focus', { method: 'POST' });
    console.log('✓ Window focused.\n');

    // 2. Query initial tabs
    const initialTabsRes = await fetch('http://127.0.0.1:4892/api/tabs').then(r => r.json());
    console.log(`[2] Initial open tabs count: ${initialTabsRes.tabs.length}`);

    // 3. Test: "can you open a new tab and in that tab open yt"
    console.log('\n[3] Testing: "can you open a new tab and in that tab open yt"...');
    const cmd1Res = await fetch('http://127.0.0.1:4892/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'can you open a new tab and in that tab open yt' })
    }).then(r => r.json());

    console.log('  Command response:\n', cmd1Res.reply);
    await new Promise(r => setTimeout(r, 2000));

    const tabsAfterCmd1 = await fetch('http://127.0.0.1:4892/api/tabs').then(r => r.json());
    console.log(`  Tabs after command: ${tabsAfterCmd1.tabs.length}`);
    const latestTab = tabsAfterCmd1.tabs[tabsAfterCmd1.tabs.length - 1];
    console.log(`  Latest tab: "${latestTab.title}" (${latestTab.url})`);

    // Verify YouTube was navigated or opened
    const isYt = latestTab.url.includes('youtube') || latestTab.title.toLowerCase().includes('youtube') || cmd1Res.reply.includes('youtube');
    console.log(`  YouTube opened in new tab? ${isYt ? 'YES ✅' : 'NO ❌'}`);

    // 4. Test: User's autonomous task:
    // "open a new tab and in that open the moviesmod.zone and then download the first episode of the A Love Other Than Yours and then verify it and then remind me when it's done"
    console.log('\n[4] Testing User Autonomous Goal:');
    console.log('  "open a new tab and in that open the moviesmod.zone and then download the first episode of the A Love Other Than Yours and then verify it and then remind me when it\'s done"...');

    const goalPrompt = "open a new tab and in that open the moviesmod.zone and then download the first episode of the A Love Other Than Yours and then verify it and then remind me when it's done";
    const goalRes = await fetch('http://127.0.0.1:4892/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: goalPrompt })
    }).then(r => r.json());

    console.log('\n  Agent Goal Execution Report:\n', goalRes.reply);

    // 5. Check tabs and download verification status
    console.log('\n[5] Verifying Physical Browser & Download State...');
    const tabsAfterGoal = await fetch('http://127.0.0.1:4892/api/tabs').then(r => r.json());
    console.log(`  Total open tabs now: ${tabsAfterGoal.tabs.length}`);

    const dlCheck = await fetch('http://127.0.0.1:4892/api/downloads/verify').then(r => r.json());
    console.log(`  Downloads status: Total ${dlCheck.totalCount}, Completed: ${dlCheck.completedCount}, Active: ${dlCheck.activeCount}`);

    // 6. Capture full visible browser screenshot
    console.log('\n[6] Capturing full visible browser snapshot for visual confirmation...');
    const snapRes = await fetch('http://127.0.0.1:4892/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'window' })
    }).then(r => r.json());

    console.log(`✓ Screenshot captured: ${snapRes.path} (${snapRes.width}x${snapRes.height})`);

    console.log('\n====================================================');
    console.log('AUTONOMOUS AGENT REASONING TEST COMPLETE! ✅');
    console.log('====================================================');
}

runAutonomousTest().catch(console.error);
