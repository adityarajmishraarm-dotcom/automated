const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 1. Verify index.html contains the wallpaper option in toolsDropdown
const indexHtml = fs.readFileSync(path.join(__dirname, '../desktop/index.html'), 'utf8');
assert(
    indexHtml.includes('<option value="wallpaper">🖼️ Wallpaper (Image / Video)</option>'),
    'toolsDropdown must include wallpaper option'
);
assert(
    indexHtml.includes('id="btnWallpaperUpload"'),
    'wallpaper upload button must exist'
);
assert(
    indexHtml.includes('id="wallpaperFileInput"'),
    'wallpaper file input must exist'
);
assert(
    indexHtml.includes('id="wallpaperPreviewVid"'),
    'wallpaper video preview element must exist'
);
assert(
    indexHtml.includes('id="btnToggleWallpaperAudio"'),
    'wallpaper audio mute/unmute control must exist'
);

// 2. Verify renderer.js logic
const rendererJs = fs.readFileSync(path.join(__dirname, '../desktop/renderer.js'), 'utf8');
assert(
    rendererJs.includes("case 'wallpaper':"),
    'toolsDropdown.onchange must handle case "wallpaper"'
);
assert(
    rendererJs.includes('function openWallpaperModal()'),
    'openWallpaperModal function must be declared'
);
assert(
    rendererJs.includes('function closeWallpaperModal()'),
    'closeWallpaperModal function must be declared'
);
assert(
    rendererJs.includes('function setWallpaperVisuals('),
    'setWallpaperVisuals function must be declared'
);
assert(
    rendererJs.includes('antigravity_custom_wallpaper'),
    'custom wallpaper must be persisted via localStorage'
);
assert(
    rendererJs.includes("wallpaperData.type === 'video'"),
    'renderer must handle video wallpaper type'
);
assert(
    rendererJs.includes("vid.autoplay = true"),
    'renderer must configure video autoplay'
);

// 3. Verify styles.css
const stylesCss = fs.readFileSync(path.join(__dirname, '../desktop/styles.css'), 'utf8');
assert(
    stylesCss.includes('.wallpaper-layer'),
    '.wallpaper-layer style must be defined'
);
assert(
    stylesCss.includes('.wallpaper-layer video'),
    '.wallpaper-layer video style must be defined'
);
assert(
    stylesCss.includes('body.has-wallpaper'),
    'body.has-wallpaper style must be defined'
);

console.log('✅ All wallpaper (Image & Video) feature self-checks passed successfully!');
