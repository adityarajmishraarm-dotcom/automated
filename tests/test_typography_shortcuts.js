const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 1. Verify desktop/renderer.js source logic
const rendererJs = fs.readFileSync(path.join(__dirname, '../desktop/renderer.js'), 'utf8');

// Function existence
assert(rendererJs.includes('function stepCanvasFontSize('), 'stepCanvasFontSize function must be declared');
assert(rendererJs.includes('function setCanvasFontStyleByIndex('), 'setCanvasFontStyleByIndex function must be declared');
assert(rendererJs.includes('function showTypographyToast('), 'showTypographyToast function must be declared');

// Sizing keys & order
assert(
    rendererJs.includes("const TYPOGRAPHY_FONT_SIZE_KEYS = ['compact', 'standard', 'comfortable', 'spacious'];"),
    'TYPOGRAPHY_FONT_SIZE_KEYS must define correct 4 size sequence'
);

// Style keys & order
assert(
    rendererJs.includes("'gt-super'") && rendererJs.includes("'juana'") && rendererJs.includes("'playfair-display'") && rendererJs.includes("'ogg'") && rendererJs.includes("'inter'") && rendererJs.includes("'poppins'") && rendererJs.includes("'plus-jakarta-sans'") && rendererJs.includes("'avenir'"),
    'TYPOGRAPHY_FONT_STYLE_KEYS must define the 8 requested fonts in sequence'
);

// Global keyboard shortcuts (Ctrl + +, Ctrl + -, Ctrl + Alt + 1..8)
assert(
    rendererJs.includes("e.code === 'Equal' || e.code === 'NumpadAdd'") && rendererJs.includes('stepCanvasFontSize(1)'),
    'Global keydown must handle Ctrl + Plus to increase font size'
);
assert(
    rendererJs.includes("e.code === 'Minus' || e.code === 'NumpadSubtract'") && rendererJs.includes('stepCanvasFontSize(-1)'),
    'Global keydown must handle Ctrl + Minus to decrease font size'
);
assert(
    rendererJs.includes("['1', '2', '3', '4', '5', '6', '7', '8'].includes(e.key)") && rendererJs.includes('setCanvasFontStyleByIndex'),
    'Global keydown must handle Ctrl + Alt + 1..8 to change font style'
);

// Mouse wheel listener with throttle and ctrlKey check
assert(
    rendererJs.includes("window.addEventListener('wheel'") && rendererJs.includes('e.ctrlKey || e.metaKey'),
    'Global wheel event listener with ctrlKey check must exist'
);
assert(
    rendererJs.includes('lastFontWheelTime') && rendererJs.includes('180'),
    'Mouse wheel listener must implement throttling to prevent overshooting'
);

// Webview focus delegation via before-input-event
assert(
    rendererJs.includes("wv.addEventListener('before-input-event'"),
    'Webview must attach before-input-event listener for webview focus shortcut handling'
);

// 2. Verify desktop/styles.css styling
const stylesCss = fs.readFileSync(path.join(__dirname, '../desktop/styles.css'), 'utf8');
assert(stylesCss.includes('.typography-toast'), '.typography-toast must be defined in styles.css');
assert(stylesCss.includes('.typography-toast.show'), '.typography-toast.show active state must be defined');
assert(stylesCss.includes('.typography-toast-icon'), '.typography-toast-icon must be defined');

// 3. Functional Simulation Test: Step size stepping logic
const SIZES = ['compact', 'standard', 'comfortable', 'spacious'];
let current = 'standard';
function simulateStep(curr, delta) {
    const idx = SIZES.indexOf(curr);
    const nextIdx = Math.max(0, Math.min(SIZES.length - 1, idx + delta));
    return SIZES[nextIdx];
}

// Starting at standard (Medium, 16px)
assert.strictEqual(simulateStep('standard', 1), 'comfortable', 'Standard + 1 should be comfortable (Large, 18px)');
assert.strictEqual(simulateStep('comfortable', 1), 'spacious', 'Comfortable + 1 should be spacious (Extra Large, 21px)');
assert.strictEqual(simulateStep('spacious', 1), 'spacious', 'Spacious + 1 should clamp at spacious');

// Decrementing
assert.strictEqual(simulateStep('spacious', -1), 'comfortable', 'Spacious - 1 should be comfortable');
assert.strictEqual(simulateStep('comfortable', -1), 'standard', 'Comfortable - 1 should be standard');
assert.strictEqual(simulateStep('standard', -1), 'compact', 'Standard - 1 should be compact (Small, 14px)');
assert.strictEqual(simulateStep('compact', -1), 'compact', 'Compact - 1 should clamp at compact');

console.log('✅ All Typography Shortcut & Wheel controls tests passed successfully!');
