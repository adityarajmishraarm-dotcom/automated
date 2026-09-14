const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 1. Verify index.html markup
const indexHtml = fs.readFileSync(path.join(__dirname, '../desktop/index.html'), 'utf8');
assert(
    indexHtml.includes('Playfair+Display'),
    'Google Fonts link must include Playfair Display'
);
assert(
    indexHtml.includes('Poppins'),
    'Google Fonts link must include Poppins'
);
assert(
    indexHtml.includes('Bodoni+Moda'),
    'Google Fonts link must include Bodoni Moda'
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
assert(
    stylesCss.includes("font-family: 'Ogg'"),
    'Ogg font-face must be declared in styles.css'
);
assert(
    stylesCss.includes("font-family: 'Avenir'"),
    'Avenir font-face must be declared in styles.css'
);

// 3. Verify TypographyStudioModal.jsx and App.jsx logic
const appJsx = fs.readFileSync(path.join(__dirname, '../desktop/src/App.jsx'), 'utf8');
const typographyModal = fs.readFileSync(path.join(__dirname, '../desktop/src/components/TypographyStudioModal.jsx'), 'utf8');
const navToolbar = fs.readFileSync(path.join(__dirname, '../desktop/src/components/NavigationToolbar.jsx'), 'utf8');

assert(
    navToolbar.includes('🔤 Typography') || navToolbar.includes('onOpenTypography'),
    'Navigation toolbar must provide trigger for Typography Studio'
);
assert(
    appJsx.includes('TypographyStudioModal'),
    'App.jsx must integrate TypographyStudioModal'
);
assert(
    appJsx.includes('injectTypographyIntoWebview'),
    'injectTypographyIntoWebview function must be declared in App.jsx'
);

// Verify 4 Font Sizes
assert(typographyModal.includes("'compact':"), 'Compact font size must exist');
assert(typographyModal.includes("'standard':"), 'Standard font size must exist');
assert(typographyModal.includes("'comfortable':"), 'Comfortable font size must exist');
assert(typographyModal.includes("'spacious':"), 'Spacious font size must exist');

// Verify 8 Curated Fonts
assert(typographyModal.includes("'gt-super':"), 'GT Super font format must exist');
assert(typographyModal.includes("'juana':"), 'Juana font format must exist');
assert(typographyModal.includes("'playfair-display':"), 'Playfair Display font format must exist');
assert(typographyModal.includes("'ogg':"), 'Ogg font format must exist');
assert(typographyModal.includes("'inter':"), 'Inter font format must exist');
assert(typographyModal.includes("'poppins':"), 'Poppins (Toppins) font format must exist');
assert(typographyModal.includes("'plus-jakarta-sans':"), 'Plus Jakarta Sans font format must exist');
assert(typographyModal.includes("'avenir':"), 'Avenir font format must exist');

// Verify persistence in App.jsx
assert(
    appJsx.includes('antigravity_canvas_font_size'),
    'font size must be persisted via localStorage'
);
assert(
    appJsx.includes('antigravity_canvas_font_style'),
    'font style must be persisted via localStorage'
);

console.log('✅ All Typography & Font Canvas (8 Curated Fonts: GT Super, Juana, Playfair Display, Ogg, Inter, Poppins, Plus Jakarta Sans, Avenir) feature checks passed successfully!');
