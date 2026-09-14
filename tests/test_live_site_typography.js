const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 1. Verify desktop/src/App.jsx
const appJsx = fs.readFileSync(path.join(__dirname, '../desktop/src/App.jsx'), 'utf8');

// Function existence
assert(
    appJsx.includes('injectTypographyIntoWebview'),
    'injectTypographyIntoWebview must be defined'
);

// Comprehensive selector coverage
assert(
    appJsx.includes('html, body, div, span, p, a, h1, h2, h3, h4, h5, h6'),
    'Universal selector list must cover all common HTML elements'
);

// High-priority CSS injection
assert(
    appJsx.includes('wv.insertCSS('),
    'injectTypographyIntoWebview must call insertCSS'
);

// Webview lifecycle event bindings
assert(
    appJsx.includes("wv.addEventListener('dom-ready'") && appJsx.includes('injectTypographyIntoWebview(wv)'),
    'dom-ready must trigger injectTypographyIntoWebview'
);

// 2. Verify main.js CSP removal
const mainJs = fs.readFileSync(path.join(__dirname, '../desktop/main.js'), 'utf8');
assert(
    mainJs.includes('onHeadersReceived') && mainJs.includes('content-security-policy'),
    'main.js must strip restrictive CSP headers in onHeadersReceived to allow external fonts on all websites'
);

console.log('✅ All Live Site Typography Universal Injection self-checks passed successfully!');
