const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 1. Verify index.html markup
const indexHtml = fs.readFileSync(path.join(__dirname, '../desktop/index.html'), 'utf8');
assert(
    indexHtml.includes('<option value="typography">🔤 Font & Typography Canvas</option>'),
    'toolsDropdown must include Font & Typography Canvas option'
);
assert(
    indexHtml.includes('id="typographyModal"'),
    'typographyModal container must exist'
);
assert(
    indexHtml.includes('id="readerFontStyleSelect"'),
    'readerFontStyleSelect must exist in Reader Mode'
);
assert(
    indexHtml.includes('id="readerFontSizeGroup"'),
    'readerFontSizeGroup must exist in Reader Mode'
);
assert(
    indexHtml.includes('Playfair+Display'),
    'Google Fonts link must include Playfair Display'
);
assert(
    indexHtml.includes('Poppins'),
    'Google Fonts link must include Poppins'
);

// 2. Verify styles.css
const stylesCss = fs.readFileSync(path.join(__dirname, '../desktop/styles.css'), 'utf8');
assert(
    stylesCss.includes('.font-size-pill'),
    '.font-size-pill style must be defined'
);
assert(
    stylesCss.includes('.font-style-card'),
    '.font-style-card style must be defined'
);
assert(
    stylesCss.includes('.reader-content-body'),
    '.reader-content-body style must be defined'
);
assert(
    stylesCss.includes("font-family: 'GT Super'"),
    'GT Super font-face must be declared in styles.css'
);
assert(
    stylesCss.includes("font-family: 'Juana'"),
    'Juana font-face must be declared in styles.css'
);

// 3. Verify renderer.js logic
const rendererJs = fs.readFileSync(path.join(__dirname, '../desktop/renderer.js'), 'utf8');
assert(
    rendererJs.includes("case 'typography':"),
    'toolsDropdown must handle case "typography"'
);
assert(
    rendererJs.includes('function applyCanvasTypography('),
    'applyCanvasTypography function must be declared'
);
assert(
    rendererJs.includes('function openTypographyModal()'),
    'openTypographyModal function must be declared'
);
assert(
    rendererJs.includes('function closeTypographyModal()'),
    'closeTypographyModal function must be declared'
);

// Verify 4 Font Sizes (retained untouched as requested)
assert(rendererJs.includes("'compact':"), 'Compact font size must exist');
assert(rendererJs.includes("'standard':"), 'Standard font size must exist');
assert(rendererJs.includes("'comfortable':"), 'Comfortable font size must exist');
assert(rendererJs.includes("'spacious':"), 'Spacious font size must exist');

// Verify 8 Requested Font Formats
assert(rendererJs.includes("'gt-super':"), 'GT Super font format must exist');
assert(rendererJs.includes("'juana':"), 'Juana font format must exist');
assert(rendererJs.includes("'playfair-display':"), 'Playfair Display font format must exist');
assert(rendererJs.includes("'ogg':"), 'Ogg font format must exist');
assert(rendererJs.includes("'inter':"), 'Inter font format must exist');
assert(rendererJs.includes("'poppins':"), 'Poppins (Toppins) font format must exist');
assert(rendererJs.includes("'plus-jakarta-sans':"), 'Plus Jakarta Sans font format must exist');
assert(rendererJs.includes("'avenir':"), 'Avenir font format must exist');

// Verify persistence
assert(
    rendererJs.includes('antigravity_canvas_font_size'),
    'font size must be persisted via localStorage'
);
assert(
    rendererJs.includes('antigravity_canvas_font_style'),
    'font style must be persisted via localStorage'
);

console.log('✅ All Typography & Font Canvas (8 Curated Fonts: GT Super, Juana, Playfair Display, Ogg, Inter, Poppins, Plus Jakarta Sans, Avenir) feature checks passed successfully!');
