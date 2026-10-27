import assert from 'assert';
import {
    executeNativeHardwareClick,
    executeNativeHardwareKey,
    executeNativeHardwareType,
    somMarkCoordinateCache,
    extractPageAXTree,
    renderSetOfMarksOverlay,
    executeWebviewClick,
    executeWebviewKeyPress
} from './src/ai_harness_engine.js';

async function runTests() {
    console.log('--- Starting Core Tools Modernization Test Suite ---');

    // 1. Test Mock Webview & sendInputEvent Dispatcher
    const recordedEvents = [];
    const mockWebview = {
        sendInputEvent(evt) {
            recordedEvents.push(evt);
        },
        executeJavaScript(code) {
            if (code.includes('maxNodes')) {
                return Promise.resolve([
                    'RootWebArea "Test Page"',
                    '  button "Download 1080p" (#1)',
                    '  searchbox "Search input" (#2)'
                ].join('\n'));
            }
            if (code.includes('const markId = ')) {
                return Promise.resolve({
                    x: 250,
                    y: 120,
                    tag: 'button',
                    txt: 'Download 1080p',
                    href: 'https://example.com/dl',
                    isInput: false
                });
            }
            if (code.includes('antigravity-som-container')) {
                return Promise.resolve([
                    {
                        mark: '#1',
                        id: 1,
                        text: 'Download 1080p',
                        tag: 'button',
                        href: 'https://example.com/dl',
                        rect: { top: 100, left: 200, width: 100, height: 40 },
                        center: { x: 250, y: 120 }
                    },
                    {
                        mark: '#2',
                        id: 2,
                        text: 'Search input',
                        tag: 'input',
                        href: '',
                        rect: { top: 20, left: 50, width: 300, height: 35 },
                        center: { x: 200, y: 37 }
                    }
                ]);
            }
            if (code.includes('RootWebArea')) {
                return Promise.resolve([
                    'RootWebArea "Test Page"',
                    '  button "Download 1080p" (#1)',
                    '  searchbox "Search input" (#2)'
                ].join('\n'));
            }
            return Promise.resolve({
                success: true,
                x: 150,
                y: 80,
                label: 'Search Button',
                tag: 'button',
                matchType: 'Test Match',
                markIndex: null,
                isInput: false
            });
        }
    };

    // --- TEST 1: executeNativeHardwareClick ---
    console.log('\n[Test 1] Testing executeNativeHardwareClick...');
    recordedEvents.length = 0;
    const clickRes = await executeNativeHardwareClick(mockWebview, 250.4, 120.6);
    assert.strictEqual(clickRes.success, true, 'Click should succeed');
    assert.strictEqual(clickRes.x, 250, 'X should be rounded to 250');
    assert.strictEqual(clickRes.y, 121, 'Y should be rounded to 121');
    assert.strictEqual(recordedEvents.length, 3, 'Should record mouseMove, mouseDown, mouseUp');
    assert.deepStrictEqual(recordedEvents[0], { type: 'mouseMove', x: 250, y: 121 });
    assert.deepStrictEqual(recordedEvents[1], { type: 'mouseDown', x: 250, y: 121, button: 'left', clickCount: 1 });
    assert.deepStrictEqual(recordedEvents[2], { type: 'mouseUp', x: 250, y: 121, button: 'left', clickCount: 1 });
    console.log('✓ executeNativeHardwareClick dispatches genuine mouseMove, mouseDown, mouseUp sequence.');

    // --- TEST 2: executeNativeHardwareKey ---
    console.log('\n[Test 2] Testing executeNativeHardwareKey...');
    recordedEvents.length = 0;
    const keyRes = await executeNativeHardwareKey(mockWebview, 'Enter');
    assert.strictEqual(keyRes.success, true);
    assert.strictEqual(recordedEvents.length, 3, 'Should record keyDown, char, keyUp');
    assert.deepStrictEqual(recordedEvents[0], { type: 'keyDown', keyCode: 'Enter', modifiers: [] });
    assert.deepStrictEqual(recordedEvents[1], { type: 'char', keyCode: 'Enter', modifiers: [] });
    assert.deepStrictEqual(recordedEvents[2], { type: 'keyUp', keyCode: 'Enter', modifiers: [] });
    console.log('✓ executeNativeHardwareKey dispatches genuine keyDown, char, keyUp sequence.');

    // --- TEST 3: executeNativeHardwareType ---
    console.log('\n[Test 3] Testing executeNativeHardwareType...');
    recordedEvents.length = 0;
    const typeRes = await executeNativeHardwareType(mockWebview, 'Hi');
    assert.strictEqual(typeRes.success, true);
    assert.strictEqual(typeRes.length, 2);
    assert.strictEqual(recordedEvents.length, 6, '2 chars * 3 events each = 6 events');
    console.log('✓ executeNativeHardwareType streams keystroke sequence cleanly.');

    // --- TEST 4: renderSetOfMarksOverlay & somMarkCoordinateCache ---
    console.log('\n[Test 4] Testing renderSetOfMarksOverlay and coordinate caching...');
    const marks = await renderSetOfMarksOverlay(mockWebview, 10);
    assert.strictEqual(marks.length, 2);
    assert.strictEqual(somMarkCoordinateCache.has(1), true, 'Cache should have mark 1');
    assert.strictEqual(somMarkCoordinateCache.has('#1'), true, 'Cache should have mark #1');
    const cached1 = somMarkCoordinateCache.get(1);
    assert.strictEqual(cached1.x, 250, 'Cached X must be 250');
    assert.strictEqual(cached1.y, 120, 'Cached Y must be 120');
    console.log('✓ renderSetOfMarksOverlay populated somMarkCoordinateCache with bounding-box center coordinates:', cached1);

    // --- TEST 5: executeWebviewClick using Set-of-Marks coordinate lookup ---
    console.log('\n[Test 5] Testing executeWebviewClick mark coordinate routing...');
    recordedEvents.length = 0;
    const somClickRes = await executeWebviewClick(mockWebview, '#1');
    assert.strictEqual(somClickRes.success, true);
    assert.strictEqual(recordedEvents.length, 3, 'Hardware click was dispatched');
    assert.strictEqual(recordedEvents[1].x, 250);
    assert.strictEqual(recordedEvents[1].y, 120);
    console.log('✓ executeWebviewClick("#1") resolved coordinates directly and triggered native hardware click.');

    // --- TEST 6: extractPageAXTree ---
    console.log('\n[Test 6] Testing extractPageAXTree perception...');
    const axTree = await extractPageAXTree(mockWebview);
    assert(axTree.includes('RootWebArea'), 'AXTree must have root WebArea');
    assert(axTree.includes('button "Download 1080p"'), 'AXTree must contain accessible button');
    assert(axTree.length < 1500, `AXTree size must be under 1.5KB (actual: ${axTree.length} bytes)`);
    console.log(`✓ extractPageAXTree extracted clean accessibility tree (${axTree.length} bytes, < 1.5KB):\n${axTree}`);

    console.log('\n======================================================');
    console.log('🎉 ALL CORE TOOLS TESTS PASSED WITH 100% SUCCESS!');
    console.log('======================================================');
}

runTests().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
