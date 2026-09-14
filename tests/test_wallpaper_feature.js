const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 1. Verify React Wallpaper Studio components
const appJsx = fs.readFileSync(path.join(__dirname, '../desktop/src/App.jsx'), 'utf8');
const wallpaperModal = fs.readFileSync(path.join(__dirname, '../desktop/src/components/WallpaperStudioModal.jsx'), 'utf8');
const navToolbar = fs.readFileSync(path.join(__dirname, '../desktop/src/components/NavigationToolbar.jsx'), 'utf8');

assert(
    appJsx.includes('WallpaperStudioModal'),
    'App.jsx must integrate WallpaperStudioModal'
);
assert(
    navToolbar.includes('🎨 Wallpaper') || navToolbar.includes('onOpenWallpaperStudio'),
    'NavigationToolbar must provide trigger for Wallpaper Studio'
);
assert(
    wallpaperModal.includes('handleFileUpload'),
    'wallpaper upload handler must exist in WallpaperStudioModal'
);
assert(
    wallpaperModal.includes("previewType === 'video'"),
    'wallpaper video preview element must exist'
);
assert(
    wallpaperModal.includes('autoPlay') && wallpaperModal.includes('muted'),
    'wallpaper video autoplay and mute attributes must exist'
);

// 2. Verify App.jsx persistence and state
assert(
    appJsx.includes('antigravity_wallpaper'),
    'custom wallpaper must be persisted via localStorage'
);
assert(
    appJsx.includes('wallpaperType'),
    'wallpaperType state must exist in App.jsx'
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
