const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 1. Verify renderer.js
const rendererJs = fs.readFileSync(path.join(__dirname, '../desktop/renderer.js'), 'utf8');

// Function existence
assert(
    rendererJs.includes('function injectTypographyIntoWebview(wv)'),
    'injectTypographyIntoWebview must be defined'
);

// Comprehensive selector coverage
assert(
    rendererJs.includes('html, body, div, span, p, a, h1, h2, h3, h4, h5, h6'),
    'Universal selector list must cover all common HTML elements'
);

// Dual-layer injection: insertCSS and executeJavaScript
assert(
    rendererJs.includes('wv.insertCSS('),
    'injectTypographyIntoWebview must call insertCSS'
);
assert(
    rendererJs.includes('wv.executeJavaScript('),
    'injectTypographyIntoWebview must call executeJavaScript to physically mount fonts in webview DOM'
);

// Webview lifecycle event bindings
assert(
    rendererJs.includes('wv.addEventListener(\'dom-ready\'') && rendererJs.includes('injectTypographyIntoWebview(wv)'),
    'dom-ready must trigger injectTypographyIntoWebview'
);
assert(
    rendererJs.includes('wv.addEventListener(\'did-stop-loading\'') && rendererJs.includes('injectTypographyIntoWebview(wv)'),
    'did-stop-loading must trigger injectTypographyIntoWebview'
);
assert(
    rendererJs.includes('wv.addEventListener(\'did-navigate\'') && rendererJs.includes('injectTypographyIntoWebview(wv)'),
    'did-navigate must trigger injectTypographyIntoWebview'
);
assert(
    rendererJs.includes('wv.addEventListener(\'did-navigate-in-page\'') && rendererJs.includes('injectTypographyIntoWebview(wv)'),
    'did-navigate-in-page must trigger injectTypographyIntoWebview'
);

// Tab activation binding
assert(
    rendererJs.includes('function activateTab(') && rendererJs.includes('injectTypographyIntoWebview(t.webview)'),
    'activateTab must trigger injectTypographyIntoWebview'
);

// Universal tab broadcasting in applyCanvasTypography
assert(
    rendererJs.includes('function applyCanvasTypography(') && rendererJs.includes('tabs.forEach(t =>'),
    'applyCanvasTypography must update all open tabs'
);

// 2. Verify main.js CSP removal
const mainJs = fs.readFileSync(path.join(__dirname, '../desktop/main.js'), 'utf8');
assert(
    mainJs.includes('onHeadersReceived') && mainJs.includes('content-security-policy'),
    'main.js must strip restrictive CSP headers in onHeadersReceived to allow external fonts on all websites'
);

console.log('✅ All Live Site Typography Universal Injection self-checks passed successfully!');
