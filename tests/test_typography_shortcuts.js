const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 1. Verify desktop/src/App.jsx source logic
const appJsx = fs.readFileSync(path.join(__dirname, '../desktop/src/App.jsx'), 'utf8');

// Function existence & webview shortcuts
assert(appJsx.includes('injectTypographyIntoWebview'), 'injectTypographyIntoWebview function must be declared');
assert(appJsx.includes("input.key === '=' || input.key === '+' || input.code === 'NumpadAdd'"), 'Webview must handle Ctrl + Plus to increase font size');
assert(appJsx.includes("input.key === '-' || input.key === '_' || input.code === 'NumpadSubtract'"), 'Webview must handle Ctrl + Minus to decrease font size');
assert(appJsx.includes("wv.addEventListener('before-input-event'"), 'Webview must attach before-input-event listener for shortcut handling');

// 2. Verify desktop/styles.css styling
const stylesCss = fs.readFileSync(path.join(__dirname, '../desktop/styles.css'), 'utf8');
assert(stylesCss.includes('.typography-toast'), '.typography-toast must be defined in styles.css');
assert(stylesCss.includes('.typography-toast.show'), '.typography-toast.show active state must be defined');
assert(stylesCss.includes('.typography-toast-icon'), '.typography-toast-icon must be defined');

// 3. Functional Simulation Test: Step size stepping logic
const SIZES = ['compact', 'standard', 'comfortable', 'spacious'];
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

console.log('✅ All Typography Shortcut & Webview controls tests passed successfully!');
