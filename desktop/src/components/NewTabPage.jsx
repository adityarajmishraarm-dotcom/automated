import React, { useState, useEffect, useRef } from 'react';

const DEFAULT_LAYOUT = {
    cardScale: 1.0,
    gridCols: 4,
    clockSize: 56,
    searchWidth: 780,
    showClock: true,
    showGreeting: true,
    showBadge: true,
    showSearchBar: true,
    showShortcuts: true,
    showFeaturePills: true,
    timeFormat: '12h',
    customGreeting: '',
    sectionOrder: ['time', 'badge', 'search', 'shortcuts', 'features'],
    positions: {}
};

const DEFAULT_SHORTCUTS = [
    { id: 'sc-1', name: 'Google', desc: 'Search engine', icon: '🌐', color: '#4285f4', url: 'https://www.google.com' },
    { id: 'sc-2', name: 'YouTube', desc: 'Videos & Music', icon: '▶️', color: '#ef4444', url: 'https://www.youtube.com' },
    { id: 'sc-3', name: 'GitHub', desc: 'Code & Repos', icon: '🐙', color: '#f8fafc', url: 'https://github.com' },
    { id: 'sc-4', name: 'Wikipedia', desc: 'Encyclopedia', icon: '📖', color: '#38bdf8', url: 'https://en.wikipedia.org' },
    { id: 'sc-5', name: 'Hacker News', desc: 'Tech & Startups', icon: '🔶', color: '#ff6600', url: 'https://news.ycombinator.com' },
    { id: 'sc-6', name: 'Reddit', desc: 'Communities', icon: '💬', color: '#f97316', url: 'https://www.reddit.com' },
    { id: 'sc-7', name: 'ChatGPT', desc: 'AI Assistant', icon: '🤖', color: '#10b981', url: 'https://chatgpt.com' },
    { id: 'sc-8', name: 'AutoFill Demo', desc: 'Checkout Testbed', icon: '⚡', color: '#00e5ff', demo: 'checkout' }
];

export default function NewTabPage({
    activeEngine,
    onSetEngine,
    onNavigate,
    bookmarks = []
}) {
    const [timeStr, setTimeStr] = useState('');
    const [defaultGreeting, setDefaultGreeting] = useState('Good day');
    const [query, setQuery] = useState('');

    const wrapperRef = useRef(null);

    // Persistent Layout State
    const [layout, setLayout] = useState(() => {
        try {
            const saved = localStorage.getItem('antigravity_ntp_layout');
            if (saved) {
                const parsed = JSON.parse(saved);
                const rawOrder = Array.isArray(parsed.sectionOrder) && parsed.sectionOrder.length > 0
                    ? parsed.sectionOrder
                    : DEFAULT_LAYOUT.sectionOrder;
                // Exclude obsolete separate 'engines' section - engine switcher is now integrated directly in the single search bar
                const filteredOrder = rawOrder.filter(s => s !== 'engines');
                return {
                    ...DEFAULT_LAYOUT,
                    ...parsed,
                    sectionOrder: filteredOrder.length > 0 ? filteredOrder : DEFAULT_LAYOUT.sectionOrder,
                    positions: parsed.positions || {}
                };
            }
        } catch (e) {}
        return DEFAULT_LAYOUT;
    });
    const layoutRef = useRef(layout);
    layoutRef.current = layout;

    // Persistent Shortcuts State
    const [shortcuts, setShortcuts] = useState(() => {
        try {
            const saved = localStorage.getItem('antigravity_home_shortcuts');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {}
        return DEFAULT_SHORTCUTS;
    });

    // Shortcuts Drag and Drop state
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);

    // Section Drag and Drop state (reorder Time, Search, Shortcuts, etc.)
    const [draggedSection, setDraggedSection] = useState(null);
    const [dragOverSection, setDragOverSection] = useState(null);

    // Canva-Style Selected Element ID for Resize and Bounding Box
    const [selectedId, setSelectedId] = useState(null);

    // Edit Mode Toggle state (strictly persisted to localStorage)
    const [isEditMode, setIsEditMode] = useState(() => {
        try {
            return localStorage.getItem('antigravity_ntp_edit_mode') === 'true';
        } catch (e) {
            return false;
        }
    });

    const toggleEditMode = () => {
        setIsEditMode(prev => {
            const next = !prev;
            try { localStorage.setItem('antigravity_ntp_edit_mode', String(next)); } catch (e) {}
            if (next) {
                showToast('✏️ Edit Mode ON: Drag to rearrange, click any item to resize with Canva handles');
            } else {
                showToast('🔒 Edit Mode OFF: Home Page locked');
                setIsCustomizeOpen(false);
                setIsEditingGreetingInline(false);
                setSelectedId(null);
            }
            return next;
        });
    };

    // Modal & Customizer UI state
    const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
    const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
    const [editingSite, setEditingSite] = useState(null);
    const [siteForm, setSiteForm] = useState({ name: '', url: '', desc: '', icon: '🌐', color: '#00e5ff' });
    const [isEditingGreetingInline, setIsEditingGreetingInline] = useState(false);
    const [inlineGreetingText, setInlineGreetingText] = useState('');
    const [toastMessage, setToastMessage] = useState('');

    const toastTimeoutRef = useRef(null);
    const showToast = (msg) => {
        setToastMessage(msg);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => setToastMessage(''), 3500);
    };

    // Save helper routines
    const saveLayout = (updated) => {
        setLayout(updated);
        try { localStorage.setItem('antigravity_ntp_layout', JSON.stringify(updated)); } catch (e) {}
    };

    const saveShortcuts = (updated) => {
        setShortcuts(updated);
        try { localStorage.setItem('antigravity_home_shortcuts', JSON.stringify(updated)); } catch (e) {}
    };

    // Time update loop
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            let hours = now.getHours();
            const minutes = String(now.getMinutes()).padStart(2, '0');

            if (layout.timeFormat === '24h') {
                setTimeStr(`${String(hours).padStart(2, '0')}:${minutes}`);
            } else {
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12 || 12;
                setTimeStr(`${hours}:${minutes} ${ampm}`);
            }

            const curHour = now.getHours();
            if (curHour < 12) setDefaultGreeting('Good morning');
            else if (curHour < 17) setDefaultGreeting('Good afternoon');
            else setDefaultGreeting('Good evening');
        };

        updateTime();
        const timer = setInterval(updateTime, 1000);
        return () => clearInterval(timer);
    }, [layout.timeFormat]);

    // Search submit handler
    const handleSearchSubmit = (e) => {
        if (e) e.preventDefault();
        const text = query.trim();
        if (!text) return;

        let targetUrl = text;
        if (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('file://')) {
            targetUrl = text;
        } else if (text.includes('.') && !text.includes(' ') && !text.includes('?')) {
            targetUrl = 'https://' + text;
        } else {
            if (activeEngine === 'brave') {
                targetUrl = 'https://search.brave.com/search?q=' + encodeURIComponent(text);
            } else {
                targetUrl = 'https://www.google.com/search?q=' + encodeURIComponent(text);
            }
        }
        onNavigate(targetUrl);
    };

    // Shortcut Modal (Add / Edit)
    const handleOpenAddSite = () => {
        setEditingSite(null);
        setSiteForm({ name: '', url: '', desc: '', icon: '🌐', color: '#00e5ff' });
        setIsSiteModalOpen(true);
    };

    const handleOpenEditSite = (e, site) => {
        e.stopPropagation();
        setEditingSite(site);
        setSiteForm({
            name: site.name || '',
            url: site.url || '',
            desc: site.desc || '',
            icon: site.icon || '🌐',
            color: site.color || '#00e5ff'
        });
        setIsSiteModalOpen(true);
    };

    const handleSaveSiteModal = (e) => {
        e.preventDefault();
        const cleanName = (siteForm.name || '').trim();
        let cleanUrl = (siteForm.url || '').trim();
        if (!cleanName) return;

        if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('file://')) {
            cleanUrl = 'https://' + cleanUrl;
        }

        if (editingSite) {
            const updated = shortcuts.map(s => s.id === editingSite.id ? {
                ...s,
                name: cleanName,
                url: cleanUrl,
                desc: siteForm.desc.trim() || 'Custom site',
                icon: siteForm.icon.trim() || '🌐',
                color: siteForm.color || '#00e5ff'
            } : s);
            saveShortcuts(updated);
            showToast(`Updated "${cleanName}"`);
        } else {
            const newSite = {
                id: `sc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                name: cleanName,
                url: cleanUrl,
                desc: siteForm.desc.trim() || 'Custom site',
                icon: siteForm.icon.trim() || '🌐',
                color: siteForm.color || '#00e5ff'
            };
            const updated = [...shortcuts, newSite];
            saveShortcuts(updated);
            showToast(`Added "${cleanName}" to Home`);
        }
        setIsSiteModalOpen(false);
    };

    const handleDeleteSite = (e, siteId) => {
        e.stopPropagation();
        const updated = shortcuts.filter(s => s.id !== siteId);
        saveShortcuts(updated);
        showToast('Site removed from Home');
        if (editingSite && editingSite.id === siteId) {
            setIsSiteModalOpen(false);
        }
    };

    // Load Bookmarks directly into Home Page Shortcuts
    const handleLoadAllBookmarks = () => {
        if (!bookmarks || bookmarks.length === 0) {
            showToast('No bookmarks available to load');
            return;
        }

        const existingUrls = new Set(shortcuts.map(s => (s.url || '').toLowerCase()));
        const toAdd = [];
        const EMOJI_LIST = ['🔖', '⭐', '🌐', '📌', '🚀', '⚡', '💡', '💎', '🎯'];

        bookmarks.forEach((bm, idx) => {
            if (bm.url && !existingUrls.has(bm.url.toLowerCase())) {
                toAdd.push({
                    id: `sc-bm-${Date.now()}-${idx}`,
                    name: bm.title || bm.url,
                    desc: 'From Bookmarks',
                    icon: EMOJI_LIST[idx % EMOJI_LIST.length],
                    color: '#38bdf8',
                    url: bm.url
                });
                existingUrls.add(bm.url.toLowerCase());
            }
        });

        if (toAdd.length === 0) {
            showToast('All your bookmarks are already on the Home Page');
            return;
        }

        const updated = [...shortcuts, ...toAdd];
        saveShortcuts(updated);
        showToast(`Loaded ${toAdd.length} bookmark${toAdd.length > 1 ? 's' : ''} to Home Page`);
    };

    const addShortcutFromBookmark = (bm) => {
        if (!bm || !bm.url) return;
        const exists = shortcuts.some(s => s.url === bm.url);
        if (exists) {
            showToast(`"${bm.title || bm.url}" is already on Home`);
            return;
        }
        const newSite = {
            id: `sc-drop-${Date.now()}`,
            name: bm.title || bm.url,
            desc: 'From Bookmarks',
            icon: '🔖',
            color: '#38bdf8',
            url: bm.url
        };
        const updated = [...shortcuts, newSite];
        saveShortcuts(updated);
        showToast(`Added "${bm.title || bm.url}" to Home`);
    };

    // Move single shortcut card left/right with instant 1-click controls
    const moveShortcut = (e, index, offset) => {
        if (e) e.stopPropagation();
        const targetIndex = index + offset;
        if (targetIndex < 0 || targetIndex >= shortcuts.length) return;
        const copy = [...shortcuts];
        const [item] = copy.splice(index, 1);
        copy.splice(targetIndex, 0, item);
        saveShortcuts(copy);
        showToast(`Moved "${item.name}"`);
    };

    // Drag and drop handlers for reordering shortcuts (gated strictly by isEditMode)
    const handleDragStart = (e, index) => {
        if (!isEditMode) return;
        e.stopPropagation();
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/antigravity-shortcut', String(index));
        e.dataTransfer.setData('text/plain', String(index));
    };

    const handleDragOver = (e, index) => {
        if (!isEditMode) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDragLeave = (e) => {
        if (e) e.stopPropagation();
        setDragOverIndex(null);
    };

    const handleDrop = (e, targetIndex) => {
        if (!isEditMode) return;
        e.preventDefault();
        e.stopPropagation();
        setDragOverIndex(null);

        // Check if dropped item was a bookmark dragged from bookmarks bar
        const bookmarkData = e.dataTransfer.getData('application/json');
        if (bookmarkData) {
            try {
                const bm = JSON.parse(bookmarkData);
                if (bm && (bm.url || bm.title)) {
                    addShortcutFromBookmark(bm);
                    setDraggedIndex(null);
                    return;
                }
            } catch (err) {}
        }

        const textData = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list');
        if (textData && (textData.startsWith('http://') || textData.startsWith('https://'))) {
            addShortcutFromBookmark({ title: textData, url: textData });
            setDraggedIndex(null);
            return;
        }

        let fromIndex = draggedIndex;
        if (fromIndex === null || fromIndex === undefined) {
            const parsed = parseInt(e.dataTransfer.getData('application/antigravity-shortcut') || e.dataTransfer.getData('text/plain'), 10);
            if (!isNaN(parsed)) fromIndex = parsed;
        }

        if (fromIndex === null || fromIndex === undefined || isNaN(fromIndex) || fromIndex === targetIndex) {
            setDraggedIndex(null);
            return;
        }

        const copy = [...shortcuts];
        if (fromIndex >= 0 && fromIndex < copy.length) {
            const [draggedItem] = copy.splice(fromIndex, 1);
            copy.splice(targetIndex, 0, draggedItem);
            saveShortcuts(copy);
            showToast(`Moved "${draggedItem.name}"`);
        }
        setDraggedIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
        setDraggedSection(null);
        setDragOverSection(null);
    };

    // Save position for a specific item (section or shortcut)
    const saveItemPosition = (id, x, y, width, height) => {
        const prevItem = (layout.positions && layout.positions[id]) || {};
        const next = {
            ...(layout.positions || {}),
            [id]: {
                ...prevItem,
                x,
                y,
                ...(width !== undefined ? { width } : {}),
                ...(height !== undefined ? { height } : {})
            }
        };
        saveLayout({ ...layout, positions: next });
    };

    // Reset single item position back to grid / default stack
    const handleResetSinglePosition = (id) => {
        const next = { ...(layout.positions || {}) };
        delete next[id];
        saveLayout({ ...layout, positions: next });
        showToast('⊞ Snapped back into alignment');
    };

    // Reset all positions to center grid
    const handleResetPositions = () => {
        saveLayout({ ...layout, positions: {} });
        showToast('⊞ All elements aligned back to centered grid');
    };

    // Interactive pointer drag to place any speed dial or section anywhere without repelling
    const startPointerDrag = (e, itemId, type) => {
        if (!isEditMode) return;
        if (e.button !== 0) return; // Left mouse button only
        e.preventDefault();
        e.stopPropagation();

        setSelectedId(itemId);

        const wrapper = wrapperRef.current;
        const wrapperRect = wrapper ? wrapper.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

        const targetElem = e.currentTarget.closest('.ntp-draggable-section, .shortcut-card') || e.currentTarget;
        const targetRect = targetElem.getBoundingClientRect();

        // Lock exact rendered dimensions so elements NEVER shrink or alter center during drag
        const elemWidth = targetRect.width || 200;
        const elemHeight = targetRect.height || 110;

        const offsetX = e.clientX - targetRect.left;
        const offsetY = e.clientY - targetRect.top;

        let hasMoved = false;

        const onMouseMove = (moveEvt) => {
            hasMoved = true;
            const scrollLeft = wrapper ? wrapper.scrollLeft : 0;
            const scrollTop = wrapper ? wrapper.scrollTop : 0;

            const rawX = moveEvt.clientX - wrapperRect.left + scrollLeft - offsetX;
            const rawY = moveEvt.clientY - wrapperRect.top + scrollTop - offsetY;

            // Strict viewport clamping: ensures items (especially clock) NEVER slip under top bar or off-screen
            const minX = 16;
            const minY = 60; // 60px guarantees clear visibility below browser top navigation
            const maxX = Math.max(minX, (wrapper ? wrapper.clientWidth : wrapperRect.width) - elemWidth - 16);
            const maxY = Math.max(minY, (wrapper ? wrapper.clientHeight : wrapperRect.height) - elemHeight - 20);

            const clampedX = Math.max(minX, Math.min(maxX, rawX));
            const clampedY = Math.max(minY, Math.min(maxY, rawY));

            setLayout(prev => ({
                ...prev,
                positions: {
                    ...(prev.positions || {}),
                    [itemId]: {
                        ...(prev.positions?.[itemId] || {}),
                        x: Math.round(clampedX),
                        y: Math.round(clampedY),
                        width: prev.positions?.[itemId]?.width || Math.round(elemWidth),
                        height: prev.positions?.[itemId]?.height || Math.round(elemHeight)
                    }
                }
            }));
        };

        const onMouseUp = (upEvt) => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);

            if (hasMoved) {
                const scrollLeft = wrapper ? wrapper.scrollLeft : 0;
                const scrollTop = wrapper ? wrapper.scrollTop : 0;

                const rawX = upEvt.clientX - wrapperRect.left + scrollLeft - offsetX;
                const rawY = upEvt.clientY - wrapperRect.top + scrollTop - offsetY;

                const minX = 16;
                const minY = 60;
                const maxX = Math.max(minX, (wrapper ? wrapper.clientWidth : wrapperRect.width) - elemWidth - 16);
                const maxY = Math.max(minY, (wrapper ? wrapper.clientHeight : wrapperRect.height) - elemHeight - 20);

                const clampedX = Math.max(minX, Math.min(maxX, rawX));
                const clampedY = Math.max(minY, Math.min(maxY, rawY));

                const currentPos = (layout.positions && layout.positions[itemId]) || {};
                const next = {
                    ...(layout.positions || {}),
                    [itemId]: {
                        ...currentPos,
                        x: Math.round(clampedX),
                        y: Math.round(clampedY),
                        width: currentPos.width || Math.round(elemWidth),
                        height: currentPos.height || Math.round(elemHeight)
                    }
                };
                saveLayout({ ...layoutRef.current, positions: next });
                showToast(`Placed at (${Math.round(clampedX)}, ${Math.round(clampedY)})`);
            }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    // Canva-Style Smooth Mouse Resize Drag handler with 8-handle anchor math
    const startResizeDrag = (e, id, handle, type) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;

        const initClockSize = layoutRef.current.clockSize || 56;
        const initSearchWidth = layoutRef.current.searchWidth || 780;
        const currentPos = (layoutRef.current.positions && layoutRef.current.positions[id]) || {};
        const isFree = currentPos.x !== undefined;

        const renderedElem = document.getElementById(`item-${id}`);
        const renderedRect = renderedElem ? renderedElem.getBoundingClientRect() : null;
        const wrapper = wrapperRef.current;
        const wrapperRect = wrapper ? wrapper.getBoundingClientRect() : { left: 0, top: 0 };
        const scrollLeft = wrapper ? wrapper.scrollLeft : 0;
        const scrollTop = wrapper ? wrapper.scrollTop : 0;

        const initX = isFree ? currentPos.x : (renderedRect ? Math.round(renderedRect.left - wrapperRect.left + scrollLeft) : 100);
        const initY = isFree ? currentPos.y : (renderedRect ? Math.round(renderedRect.top - wrapperRect.top + scrollTop) : 100);
        const initWidth = currentPos.width || (renderedRect ? Math.round(renderedRect.width) : (type === 'shortcut' ? 200 : (type === 'search' ? initSearchWidth : 400)));
        const initHeight = currentPos.height || (renderedRect ? Math.round(renderedRect.height) : (type === 'shortcut' ? 110 : 80));

        const onMouseMove = (moveEvt) => {
            const deltaX = moveEvt.clientX - startX;
            const deltaY = moveEvt.clientY - startY;

            if (id === 'time') {
                let factor = 0;
                if (handle === 'se' || handle === 'e' || handle === 's') factor = (deltaX + deltaY) / 4;
                else if (handle === 'nw' || handle === 'w' || handle === 'n') factor = -(deltaX + deltaY) / 4;
                else if (handle === 'ne') factor = (deltaX - deltaY) / 4;
                else if (handle === 'sw') factor = (-deltaX + deltaY) / 4;

                const newSize = Math.max(28, Math.min(130, Math.round(initClockSize + factor)));
                setLayout(prev => ({ ...prev, clockSize: newSize }));
            } else if (id === 'search') {
                let newWidth = initSearchWidth;
                let newX = initX;

                if (handle.includes('e')) {
                    newWidth = isFree
                        ? Math.max(380, Math.min(1200, Math.round(initSearchWidth + deltaX)))
                        : Math.max(380, Math.min(1200, Math.round(initSearchWidth + deltaX * 2)));
                } else if (handle.includes('w')) {
                    newWidth = isFree
                        ? Math.max(380, Math.min(1200, Math.round(initSearchWidth - deltaX)))
                        : Math.max(380, Math.min(1200, Math.round(initSearchWidth - deltaX * 2)));
                    if (isFree) {
                        newX = Math.round(initX + (initSearchWidth - newWidth));
                    }
                }

                setLayout(prev => ({
                    ...prev,
                    searchWidth: newWidth,
                    positions: isFree ? {
                        ...(prev.positions || {}),
                        [id]: {
                            ...(prev.positions?.[id] || {}),
                            x: newX
                        }
                    } : prev.positions
                }));
            } else if (type === 'shortcut') {
                let newW = initWidth;
                let newH = initHeight;
                let newX = initX;
                let newY = initY;

                // Horizontal resizing with anchor
                if (handle.includes('e')) {
                    newW = Math.max(120, Math.min(450, Math.round(initWidth + deltaX)));
                } else if (handle.includes('w')) {
                    newW = Math.max(120, Math.min(450, Math.round(initWidth - deltaX)));
                    newX = Math.round(initX + (initWidth - newW));
                }

                // Vertical resizing with anchor
                if (handle.includes('s')) {
                    newH = Math.max(70, Math.min(320, Math.round(initHeight + deltaY)));
                } else if (handle.includes('n')) {
                    newH = Math.max(70, Math.min(320, Math.round(initHeight - deltaY)));
                    newY = Math.round(initY + (initHeight - newH));
                }

                setLayout(prev => ({
                    ...prev,
                    positions: {
                        ...(prev.positions || {}),
                        [id]: {
                            ...(prev.positions?.[id] || {}),
                            x: newX,
                            y: newY,
                            width: newW,
                            height: newH
                        }
                    }
                }));
            }
        };

        const onMouseUp = (upEvt) => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);

            const deltaX = upEvt.clientX - startX;
            const deltaY = upEvt.clientY - startY;

            if (id === 'time') {
                let factor = 0;
                if (handle === 'se' || handle === 'e' || handle === 's') factor = (deltaX + deltaY) / 4;
                else if (handle === 'nw' || handle === 'w' || handle === 'n') factor = -(deltaX + deltaY) / 4;
                else if (handle === 'ne') factor = (deltaX - deltaY) / 4;
                else if (handle === 'sw') factor = (-deltaX + deltaY) / 4;

                const newSize = Math.max(28, Math.min(130, Math.round(initClockSize + factor)));
                saveLayout({ ...layoutRef.current, clockSize: newSize });
                showToast(`Clock size set to ${newSize}px`);
            } else if (id === 'search') {
                let newWidth = initSearchWidth;
                let newX = initX;

                if (handle.includes('e')) {
                    newWidth = isFree
                        ? Math.max(380, Math.min(1200, Math.round(initSearchWidth + deltaX)))
                        : Math.max(380, Math.min(1200, Math.round(initSearchWidth + deltaX * 2)));
                } else if (handle.includes('w')) {
                    newWidth = isFree
                        ? Math.max(380, Math.min(1200, Math.round(initSearchWidth - deltaX)))
                        : Math.max(380, Math.min(1200, Math.round(initSearchWidth - deltaX * 2)));
                    if (isFree) {
                        newX = Math.round(initX + (initSearchWidth - newWidth));
                    }
                }

                const nextPositions = isFree ? {
                    ...(layoutRef.current.positions || {}),
                    [id]: { ...(layoutRef.current.positions?.[id] || {}), x: newX }
                } : (layoutRef.current.positions || {});

                saveLayout({ ...layoutRef.current, searchWidth: newWidth, positions: nextPositions });
                showToast(`Search bar width set to ${newWidth}px`);
            } else if (type === 'shortcut') {
                let newW = initWidth;
                let newH = initHeight;
                let newX = initX;
                let newY = initY;

                if (handle.includes('e')) {
                    newW = Math.max(120, Math.min(450, Math.round(initWidth + deltaX)));
                } else if (handle.includes('w')) {
                    newW = Math.max(120, Math.min(450, Math.round(initWidth - deltaX)));
                    newX = Math.round(initX + (initWidth - newW));
                }

                if (handle.includes('s')) {
                    newH = Math.max(70, Math.min(320, Math.round(initHeight + deltaY)));
                } else if (handle.includes('n')) {
                    newH = Math.max(70, Math.min(320, Math.round(initHeight - deltaY)));
                    newY = Math.round(initY + (initHeight - newH));
                }

                const nextPositions = {
                    ...(layoutRef.current.positions || {}),
                    [id]: {
                        ...(layoutRef.current.positions?.[id] || {}),
                        x: newX,
                        y: newY,
                        width: newW,
                        height: newH
                    }
                };
                saveLayout({ ...layoutRef.current, positions: nextPositions });
                showToast(`Shortcut resized (${newW}px × ${newH}px)`);
            }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    // Render Canva-Style Bounding Box with 8 resize handles and action capsule
    const renderCanvaBoundingBox = (targetId, type, itemProps = {}) => {
        if (!isEditMode || selectedId !== targetId) return null;

        return (
            <div
                className="canva-bounding-box"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Floating Action Bar */}
                <div
                    className="canva-floating-bar"
                    onMouseDown={(e) => startPointerDrag(e, targetId, type)}
                >
                    <span className="canva-bar-pill drag-handle" title="Drag to move">⋮⋮ Move</span>
                    {type === 'shortcut' && itemProps.shortcut && (
                        <>
                            <button
                                type="button"
                                className="canva-bar-btn"
                                title="Edit site details"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditSite(e, itemProps.shortcut);
                                }}
                            >
                                ✏️ Edit
                            </button>
                            <button
                                type="button"
                                className="canva-bar-btn delete"
                                title="Remove shortcut"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSite(e, targetId);
                                }}
                            >
                                ✕
                            </button>
                        </>
                    )}
                    {type === 'time' && (
                        <button
                            type="button"
                            className="canva-bar-btn"
                            title="Toggle 12h / 24h format"
                            onClick={(e) => {
                                e.stopPropagation();
                                saveLayout({ ...layout, timeFormat: layout.timeFormat === '12h' ? '24h' : '12h' });
                            }}
                        >
                            🕐 {layout.timeFormat === '12h' ? '24h' : '12h'}
                        </button>
                    )}
                    {layout.positions && layout.positions[targetId] && (
                        <button
                            type="button"
                            className="canva-bar-btn snap"
                            title="Snap back into alignment"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleResetSinglePosition(targetId);
                            }}
                        >
                            ⊞ Center
                        </button>
                    )}
                </div>

                {/* 4 Corner Handles */}
                <div
                    className="canva-handle corner nw"
                    onMouseDown={(e) => startResizeDrag(e, targetId, 'nw', type)}
                    title="Resize"
                />
                <div
                    className="canva-handle corner ne"
                    onMouseDown={(e) => startResizeDrag(e, targetId, 'ne', type)}
                    title="Resize"
                />
                <div
                    className="canva-handle corner se"
                    onMouseDown={(e) => startResizeDrag(e, targetId, 'se', type)}
                    title="Resize"
                />
                <div
                    className="canva-handle corner sw"
                    onMouseDown={(e) => startResizeDrag(e, targetId, 'sw', type)}
                    title="Resize"
                />

                {/* 4 Edge Handles */}
                <div
                    className="canva-handle edge n"
                    onMouseDown={(e) => startResizeDrag(e, targetId, 'n', type)}
                    title="Resize height"
                />
                <div
                    className="canva-handle edge s"
                    onMouseDown={(e) => startResizeDrag(e, targetId, 's', type)}
                    title="Resize height"
                />
                <div
                    className="canva-handle edge e"
                    onMouseDown={(e) => startResizeDrag(e, targetId, 'e', type)}
                    title="Resize width"
                />
                <div
                    className="canva-handle edge w"
                    onMouseDown={(e) => startResizeDrag(e, targetId, 'w', type)}
                    title="Resize width"
                />
            </div>
        );
    };

    // Canvas Drop Handler: Allows dropping bookmarks or dragging shortcuts/sections anywhere on the home page
    const handleCanvasDrop = (e) => {
        if (!isEditMode) return;
        e.preventDefault();

        // 1. Check if dropped item was a bookmark
        const bookmarkData = e.dataTransfer.getData('application/json');
        if (bookmarkData) {
            try {
                const bm = JSON.parse(bookmarkData);
                if (bm && (bm.url || bm.title)) {
                    addShortcutFromBookmark(bm);
                    handleDragEnd();
                    return;
                }
            } catch (err) {}
        }
        const textData = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list');
        if (textData && (textData.startsWith('http://') || textData.startsWith('https://'))) {
            addShortcutFromBookmark({ title: textData, url: textData });
            handleDragEnd();
            return;
        }

        const wrapper = wrapperRef.current;
        const wrapperRect = wrapper ? wrapper.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
        const dropX = Math.max(16, Math.min(wrapperRect.width - 150, Math.round(e.clientX - wrapperRect.left - 60)));
        const dropY = Math.max(40, Math.min(wrapperRect.height - 100, Math.round(e.clientY - wrapperRect.top - 40)));

        // 2. Check if dropping a shortcut card
        let scIdx = draggedIndex;
        if (scIdx === null || scIdx === undefined) {
            const parsed = parseInt(e.dataTransfer.getData('application/antigravity-shortcut') || e.dataTransfer.getData('text/plain'), 10);
            if (!isNaN(parsed)) scIdx = parsed;
        }
        if (scIdx !== null && scIdx !== undefined && !isNaN(scIdx) && shortcuts[scIdx]) {
            const sc = shortcuts[scIdx];
            saveItemPosition(sc.id, dropX, dropY);
            showToast(`Placed "${sc.name}" at (${dropX}, ${dropY})`);
            handleDragEnd();
            return;
        }

        // 3. Check if dropping a section (e.g. search bar or time)
        const secId = draggedSection || e.dataTransfer.getData('application/antigravity-section');
        if (secId) {
            saveItemPosition(secId, dropX, dropY);
            showToast(`Placed ${secId} section at (${dropX}, ${dropY})`);
            handleDragEnd();
            return;
        }

        handleDragEnd();
    };

    const handleCanvasDragOver = (e) => {
        if (!isEditMode) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleGridDrop = (e) => {
        handleCanvasDrop(e);
    };

    // Section Drag and Drop handlers (reordering Time, Search, Shortcuts, etc.)
    const handleSectionDragStart = (e, sectionId) => {
        if (!isEditMode) return;
        e.stopPropagation();
        setDraggedSection(sectionId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/antigravity-section', sectionId);
        e.dataTransfer.setData('text/plain', `section:${sectionId}`);
    };

    const handleSectionDragOver = (e, sectionId) => {
        if (!isEditMode) return;
        if (draggedSection || e.dataTransfer.types.includes('application/antigravity-section')) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            if (dragOverSection !== sectionId) {
                setDragOverSection(sectionId);
            }
        }
    };

    const handleSectionDragLeave = (e) => {
        if (e) e.stopPropagation();
        setDragOverSection(null);
    };

    const handleSectionDrop = (e, targetSectionId) => {
        if (!isEditMode) return;
        e.preventDefault();
        e.stopPropagation();
        setDragOverSection(null);

        const sourceSectionId = draggedSection || e.dataTransfer.getData('application/antigravity-section');
        if (!sourceSectionId || sourceSectionId === targetSectionId) {
            setDraggedSection(null);
            return;
        }

        const currentOrder = layout.sectionOrder && layout.sectionOrder.length > 0
            ? [...layout.sectionOrder]
            : ['time', 'badge', 'search', 'shortcuts', 'features'];

        const fromIdx = currentOrder.indexOf(sourceSectionId);
        const toIdx = currentOrder.indexOf(targetSectionId);

        if (fromIdx !== -1 && toIdx !== -1) {
            const [moved] = currentOrder.splice(fromIdx, 1);
            currentOrder.splice(toIdx, 0, moved);
            saveLayout({ ...layout, sectionOrder: currentOrder });
            showToast(`Moved ${sourceSectionId} section`);
        }
        setDraggedSection(null);
    };

    const moveSectionUp = (e, id) => {
        if (e) e.stopPropagation();
        const current = [...(layout.sectionOrder || ['time', 'badge', 'search', 'shortcuts', 'features'])];
        const idx = current.indexOf(id);
        if (idx > 0) {
            const temp = current[idx];
            current[idx] = current[idx - 1];
            current[idx - 1] = temp;
            saveLayout({ ...layout, sectionOrder: current });
            showToast(`Moved section up`);
        }
    };

    const moveSectionDown = (e, id) => {
        if (e) e.stopPropagation();
        const current = [...(layout.sectionOrder || ['time', 'badge', 'search', 'shortcuts', 'features'])];
        const idx = current.indexOf(id);
        if (idx >= 0 && idx < current.length - 1) {
            const temp = current[idx];
            current[idx] = current[idx + 1];
            current[idx + 1] = temp;
            saveLayout({ ...layout, sectionOrder: current });
            showToast(`Moved section down`);
        }
    };

    const handleResetDefaults = () => {
        saveLayout(DEFAULT_LAYOUT);
        saveShortcuts(DEFAULT_SHORTCUTS);
        showToast('Home page reset to default layout');
    };

    const placeholder = activeEngine === 'brave'
        ? 'Search Brave Private Search or type a web address...'
        : 'Search Google or type a web address...';

    const currentGreeting = layout.customGreeting || defaultGreeting;

    const renderSection = (sectionId) => {
        if (sectionId === 'time' && layout.showClock) {
            const timePos = layout.positions && layout.positions['time'];
            const timeStyle = timePos
                ? {
                    position: 'absolute',
                    left: `${timePos.x}px`,
                    top: `${timePos.y}px`,
                    zIndex: selectedId === 'time' ? 120 : 95,
                    width: 'max-content',
                    maxWidth: '90vw'
                }
                : { width: 'fit-content', margin: '0 auto' };

            return (
                <div
                    key="time"
                    id="item-time"
                    className={`ntp-draggable-section section-time ${draggedSection === 'time' ? 'dragging-section' : ''} ${dragOverSection === 'time' ? 'drag-over-section' : ''} ${timePos ? 'ntp-canvas-free-item' : ''} ${selectedId === 'time' ? 'canva-selected' : ''}`}
                    style={timeStyle}
                    draggable={isEditMode}
                    onDragStart={(e) => handleSectionDragStart(e, 'time')}
                    onDragOver={(e) => handleSectionDragOver(e, 'time')}
                    onDragLeave={handleSectionDragLeave}
                    onDrop={(e) => handleSectionDrop(e, 'time')}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => {
                        if (isEditMode) {
                            e.stopPropagation();
                            setSelectedId('time');
                        }
                    }}
                >
                    {renderCanvaBoundingBox('time', 'time')}
                    <div
                        className="time-box"
                        onMouseDown={(e) => {
                            if (isEditMode && !isEditingGreetingInline) {
                                startPointerDrag(e, 'time', 'section');
                            }
                        }}
                    >
                        <div
                            className={`clock-display ${isEditMode ? 'editable' : 'locked'}`}
                            id="clockDisplay"
                            style={{ fontSize: `${layout.clockSize}px`, cursor: isEditMode ? 'pointer' : 'default' }}
                            title={isEditMode ? "Click to toggle 12h / 24h format" : undefined}
                            onClick={isEditMode ? () => saveLayout({ ...layout, timeFormat: layout.timeFormat === '12h' ? '24h' : '12h' }) : undefined}
                        >
                            {timeStr || '12:00 PM'}
                        </div>
                        
                        {layout.showGreeting && (
                            <div className="greeting-wrapper">
                                {isEditMode && isEditingGreetingInline ? (
                                    <div className="inline-greeting-editor">
                                        <input
                                            type="text"
                                            className="inline-greeting-input"
                                            value={inlineGreetingText}
                                            autoFocus
                                            placeholder="Enter greeting..."
                                            onChange={(e) => setInlineGreetingText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    saveLayout({ ...layout, customGreeting: inlineGreetingText.trim() });
                                                    setIsEditingGreetingInline(false);
                                                } else if (e.key === 'Escape') {
                                                    setIsEditingGreetingInline(false);
                                                }
                                            }}
                                            onBlur={() => {
                                                saveLayout({ ...layout, customGreeting: inlineGreetingText.trim() });
                                                setIsEditingGreetingInline(false);
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div
                                        className={`greeting-display ${isEditMode ? 'clickable' : 'locked'}`}
                                        id="greetingDisplay"
                                        title={isEditMode ? "Click to edit greeting text" : undefined}
                                        onClick={isEditMode ? () => {
                                            setInlineGreetingText(layout.customGreeting || defaultGreeting);
                                            setIsEditingGreetingInline(true);
                                        } : undefined}
                                    >
                                        <span>{currentGreeting}! Where would you like to go today?</span>
                                        {isEditMode && <span className="greeting-edit-icon">✏️</span>}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        if (sectionId === 'badge' && layout.showBadge) {
            const badgePos = layout.positions && layout.positions['badge'];
            const badgeStyle = badgePos
                ? { position: 'absolute', left: `${badgePos.x}px`, top: `${badgePos.y}px`, zIndex: selectedId === 'badge' ? 120 : 90, width: 'max-content' }
                : {};

            return (
                <div
                    key="badge"
                    id="item-badge"
                    className={`ntp-draggable-section section-badge ${draggedSection === 'badge' ? 'dragging-section' : ''} ${dragOverSection === 'badge' ? 'drag-over-section' : ''} ${badgePos ? 'ntp-canvas-free-item' : ''} ${selectedId === 'badge' ? 'canva-selected' : ''}`}
                    style={badgeStyle}
                    draggable={isEditMode}
                    onDragStart={(e) => handleSectionDragStart(e, 'badge')}
                    onDragOver={(e) => handleSectionDragOver(e, 'badge')}
                    onDragLeave={handleSectionDragLeave}
                    onDrop={(e) => handleSectionDrop(e, 'badge')}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => {
                        if (isEditMode) {
                            e.stopPropagation();
                            setSelectedId('badge');
                        }
                    }}
                >
                    {renderCanvaBoundingBox('badge', 'badge')}
                    <div
                        className="brand-badge"
                        onMouseDown={(e) => {
                            if (isEditMode) startPointerDrag(e, 'badge', 'section');
                        }}
                    >
                        <span>ANTIGRAVITY NATIVE BROWSER</span>
                    </div>
                </div>
            );
        }

        // Single Unified Search Bar (Search Engine toggle is built directly inside it)
        if (sectionId === 'search' && layout.showSearchBar) {
            const searchPos = layout.positions && layout.positions['search'];
            const searchStyle = searchPos
                ? { position: 'absolute', left: `${searchPos.x}px`, top: `${searchPos.y}px`, zIndex: selectedId === 'search' ? 120 : 92, width: `${layout.searchWidth}px`, maxWidth: '95vw' }
                : { width: '100%', maxWidth: `${layout.searchWidth}px`, margin: '0 auto' };

            return (
                <div
                    key="search"
                    id="item-search"
                    className={`ntp-draggable-section section-search ${draggedSection === 'search' ? 'dragging-section' : ''} ${dragOverSection === 'search' ? 'drag-over-section' : ''} ${searchPos ? 'ntp-canvas-free-item' : ''} ${selectedId === 'search' ? 'canva-selected' : ''}`}
                    style={searchStyle}
                    draggable={isEditMode}
                    onDragStart={(e) => handleSectionDragStart(e, 'search')}
                    onDragOver={(e) => handleSectionDragOver(e, 'search')}
                    onDragLeave={handleSectionDragLeave}
                    onDrop={(e) => handleSectionDrop(e, 'search')}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => {
                        if (isEditMode) {
                            e.stopPropagation();
                            setSelectedId('search');
                        }
                    }}
                >
                    {renderCanvaBoundingBox('search', 'search')}
                    <form
                        className="search-wrapper"
                        onSubmit={handleSearchSubmit}
                        onMouseDown={(e) => {
                            if (isEditMode && e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
                                startPointerDrag(e, 'search', 'section');
                            }
                        }}
                    >
                        {/* Unified Search Engine Switcher directly inside the single search bar */}
                        <button
                            type="button"
                            className="engine-toggle-pill"
                            id="btnToggleEngine"
                            onClick={() => onSetEngine(activeEngine === 'google' ? 'brave' : 'google')}
                            title={`Searching with ${activeEngine === 'brave' ? 'Brave' : 'Google'}. Click to switch engine.`}
                        >
                            <span className="engine-toggle-icon">{activeEngine === 'brave' ? '🦁' : '🔍'}</span>
                            <span className="engine-toggle-name">{activeEngine === 'brave' ? 'Brave' : 'Google'}</span>
                            <span className="engine-toggle-arrow">⇄</span>
                        </button>
                        <input
                            type="text"
                            id="ntpSearchInput"
                            className="search-box with-engine-pill"
                            placeholder={placeholder}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoComplete="off"
                            spellCheck="false"
                            autoFocus
                        />
                        <button type="submit" className="btn-submit-search" id="btnSubmitSearch">
                            Search
                        </button>
                    </form>
                </div>
            );
        }

        if (sectionId === 'shortcuts' && layout.showShortcuts) {
            const secPos = layout.positions && layout.positions['shortcuts'];
            const shortcutsStyle = secPos
                ? { position: 'absolute', left: `${secPos.x}px`, top: `${secPos.y}px`, zIndex: 85 }
                : {};

            // Filter out shortcuts that are placed with custom positions from the grid
            const gridShortcuts = shortcuts.filter(sc => !(layout.positions && layout.positions[sc.id]));

            return (
                <div
                    key="shortcuts"
                    id="item-shortcuts"
                    className={`ntp-draggable-section section-shortcuts ${draggedSection === 'shortcuts' ? 'dragging-section' : ''} ${dragOverSection === 'shortcuts' ? 'drag-over-section' : ''} ${secPos ? 'ntp-canvas-free-item' : ''}`}
                    style={shortcutsStyle}
                    draggable={isEditMode}
                    onDragStart={(e) => handleSectionDragStart(e, 'shortcuts')}
                    onDragOver={(e) => handleSectionDragOver(e, 'shortcuts')}
                    onDragLeave={handleSectionDragLeave}
                    onDrop={(e) => handleSectionDrop(e, 'shortcuts')}
                    onDragEnd={handleDragEnd}
                >
                    <div
                        className="shortcuts-grid-wrapper"
                        onDragOver={(e) => {
                            if (isEditMode) {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'copy';
                            }
                        }}
                        onDrop={handleGridDrop}
                    >
                        <div
                            className="shortcuts-grid"
                            style={{
                                gridTemplateColumns: `repeat(${layout.gridCols}, 1fr)`,
                                transform: `scale(${layout.cardScale})`,
                                transformOrigin: 'top center'
                            }}
                        >
                            {gridShortcuts.map((sc) => {
                                const originalIndex = shortcuts.indexOf(sc);
                                const isBeingDragged = isEditMode && draggedIndex === originalIndex;
                                const isOver = isEditMode && dragOverIndex === originalIndex;
                                return (
                                    <div
                                        key={sc.id || `sc-${originalIndex}`}
                                        id={`item-${sc.id}`}
                                        className={`shortcut-card ${isBeingDragged ? 'dragging' : ''} ${isOver ? 'drag-over' : ''} ${isEditMode ? 'editable' : 'locked'} ${selectedId === sc.id ? 'canva-selected' : ''}`}
                                        draggable={isEditMode}
                                        onDragStart={(e) => handleDragStart(e, originalIndex)}
                                        onDragOver={(e) => handleDragOver(e, originalIndex)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, originalIndex)}
                                        onDragEnd={handleDragEnd}
                                        onMouseDown={(e) => {
                                            if (isEditMode) {
                                                startPointerDrag(e, sc.id, 'shortcut');
                                            }
                                        }}
                                        onClick={(e) => {
                                            if (isEditMode) {
                                                e.stopPropagation();
                                                setSelectedId(sc.id);
                                            } else {
                                                if (sc.url) onNavigate(sc.url);
                                                else if (sc.demo === 'checkout') onNavigate('demo_checkout.html');
                                            }
                                        }}
                                        title={isEditMode ? `${sc.name} (${sc.url || 'Demo'})\nDrag anywhere freely to place, click to resize with Canva handles` : `${sc.name} (${sc.url || 'Demo'})\nClick to open`}
                                    >
                                        {renderCanvaBoundingBox(sc.id, 'shortcut', { shortcut: sc })}
                                        {/* Card Hover Action Buttons (strictly in Edit Mode) */}
                                        {isEditMode && (
                                            <div className="shortcut-card-actions">
                                                <span
                                                    className="shortcut-card-btn drag-btn"
                                                    title="Click and drag to place anywhere on the home page"
                                                    onMouseDown={(e) => startPointerDrag(e, sc.id, 'shortcut')}
                                                >
                                                    ⋮⋮
                                                </span>
                                                <button
                                                    type="button"
                                                    className="shortcut-card-btn move-btn"
                                                    title="Move left"
                                                    disabled={originalIndex === 0}
                                                    onClick={(e) => moveShortcut(e, originalIndex, -1)}
                                                >
                                                    ◀
                                                </button>
                                                <button
                                                    type="button"
                                                    className="shortcut-card-btn move-btn"
                                                    title="Move right"
                                                    disabled={originalIndex === shortcuts.length - 1}
                                                    onClick={(e) => moveShortcut(e, originalIndex, 1)}
                                                >
                                                    ▶
                                                </button>
                                                <button
                                                    type="button"
                                                    className="shortcut-card-btn edit"
                                                    title="Edit site details"
                                                    onClick={(e) => handleOpenEditSite(e, sc)}
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    type="button"
                                                    className="shortcut-card-btn delete"
                                                    title="Remove shortcut"
                                                    onClick={(e) => handleDeleteSite(e, sc.id)}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}

                                        <div className="shortcut-icon" style={{ color: sc.color }}>
                                            {sc.icon}
                                        </div>
                                        <span className="shortcut-title">{sc.name}</span>
                                        <span className="shortcut-desc">{sc.desc}</span>
                                    </div>
                                );
                            })}

                            {/* Add Site New Tile (strictly in Edit Mode) */}
                            {isEditMode && (
                                <div
                                    className="shortcut-card shortcut-add-card"
                                    title="Add a new custom site or link"
                                    onClick={handleOpenAddSite}
                                >
                                    <div className="shortcut-icon add-icon">➕</div>
                                    <span className="shortcut-title">Add Site</span>
                                    <span className="shortcut-desc">Custom Shortcut</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        if (sectionId === 'features' && layout.showFeaturePills) {
            const featPos = layout.positions && layout.positions['features'];
            const featStyle = featPos
                ? { position: 'absolute', left: `${featPos.x}px`, top: `${featPos.y}px`, zIndex: selectedId === 'features' ? 120 : 80, width: 'max-content' }
                : {};

            return (
                <div
                    key="features"
                    id="item-features"
                    className={`ntp-draggable-section section-features ${draggedSection === 'features' ? 'dragging-section' : ''} ${dragOverSection === 'features' ? 'drag-over-section' : ''} ${featPos ? 'ntp-canvas-free-item' : ''} ${selectedId === 'features' ? 'canva-selected' : ''}`}
                    style={featStyle}
                    draggable={isEditMode}
                    onDragStart={(e) => handleSectionDragStart(e, 'features')}
                    onDragOver={(e) => handleSectionDragOver(e, 'features')}
                    onDragLeave={handleSectionDragLeave}
                    onDrop={(e) => handleSectionDrop(e, 'features')}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => {
                        if (isEditMode) {
                            e.stopPropagation();
                            setSelectedId('features');
                        }
                    }}
                >
                    {renderCanvaBoundingBox('features', 'features')}
                    <div
                        className="feature-pills"
                        onMouseDown={(e) => {
                            if (isEditMode) startPointerDrag(e, 'features', 'section');
                        }}
                    >
                        <span className="pill active">🛡️ Native Adblock Active</span>
                        <span className="pill active">⚡ In-Process Chromium</span>
                        <span className="pill active">🔒 Zero CDP Port Leaks</span>
                        <span className="pill active">🤖 React Native Desktop App</span>
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <div
            ref={wrapperRef}
            className={`ntp-wrapper ${isEditMode ? 'is-edit-mode' : ''}`}
            onDragOver={handleCanvasDragOver}
            onDrop={handleCanvasDrop}
            onClick={(e) => {
                if (isEditMode && e.target === wrapperRef.current) setSelectedId(null);
            }}
        >
            {/* Top Right Floating Customize & Bookmarks Action Bar */}
            <div className="ntp-floating-top-bar">
                {/* Master Edit Mode Toggle Button */}
                <button
                    id="btnToggleEditMode"
                    className={`ntp-tool-pill-btn ntp-edit-toggle-btn ${isEditMode ? 'active on' : 'off'}`}
                    title={isEditMode ? "Exit Edit Mode (Lock Home Page layout)" : "Enter Edit Mode (Unlock editing, rearranging & resizing)"}
                    onClick={toggleEditMode}
                >
                    <span className="edit-toggle-icon">{isEditMode ? '✏️' : '🔒'}</span>
                    <span className="edit-toggle-label">Edit Mode:</span>
                    <span className={`edit-toggle-badge ${isEditMode ? 'badge-on' : 'badge-off'}`}>
                        {isEditMode ? 'ON' : 'OFF'}
                    </span>
                    <span className={`edit-toggle-switch ${isEditMode ? 'sw-on' : 'sw-off'}`}>
                        <span className="edit-toggle-knob" />
                    </span>
                </button>

                {isEditMode && (
                    <>
                        <button
                            type="button"
                            className="ntp-tool-pill-btn btn-reset-positions"
                            title="Reset custom positions and align all elements to centered grid"
                            onClick={handleResetPositions}
                        >
                            ⊞ Snap to Center
                        </button>
                        <button
                            type="button"
                            className="ntp-tool-pill-btn"
                            title="Load user bookmarks directly as Home page shortcuts"
                            onClick={handleLoadAllBookmarks}
                        >
                            ⭐ Load Bookmarks
                        </button>
                        <button
                            type="button"
                            className={`ntp-tool-pill-btn ${isCustomizeOpen ? 'active' : ''}`}
                            title="Customize & Resize Home Page Elements"
                            onClick={() => setIsCustomizeOpen(prev => !prev)}
                        >
                            ⚙️ Customize Home
                        </button>
                    </>
                )}
            </div>

            {/* Slide-out / Floating Customizer & Sizing Control Panel */}
            {isCustomizeOpen && (
                <div className="ntp-customize-drawer">
                    <div className="ntp-customize-drawer-header">
                        <h3>🎨 Home Page Customizer</h3>
                        <button className="ntp-drawer-close-btn" onClick={() => setIsCustomizeOpen(false)}>✕</button>
                    </div>

                    <div className="ntp-customize-drawer-content">
                        {/* Element Sizing Section */}
                        <div className="ntp-custom-section">
                            <h4>📏 Element Sizing & Resizing</h4>
                            
                            <div className="ntp-control-row">
                                <label>Shortcuts Card Scale: <b>{Math.round(layout.cardScale * 100)}%</b></label>
                                <input
                                    type="range"
                                    min="0.75"
                                    max="1.35"
                                    step="0.05"
                                    value={layout.cardScale}
                                    onChange={(e) => saveLayout({ ...layout, cardScale: parseFloat(e.target.value) })}
                                />
                            </div>

                            <div className="ntp-control-row">
                                <label>Grid Columns: <b>{layout.gridCols} Cols</b></label>
                                <div className="ntp-button-group">
                                    {[2, 3, 4, 5, 6].map(cols => (
                                        <button
                                            key={cols}
                                            className={`ntp-seg-btn ${layout.gridCols === cols ? 'active' : ''}`}
                                            onClick={() => saveLayout({ ...layout, gridCols: cols })}
                                        >
                                            {cols}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="ntp-control-row">
                                <label>Clock Display Size: <b>{layout.clockSize}px</b></label>
                                <input
                                    type="range"
                                    min="36"
                                    max="84"
                                    step="4"
                                    value={layout.clockSize}
                                    onChange={(e) => saveLayout({ ...layout, clockSize: parseInt(e.target.value, 10) })}
                                />
                            </div>

                            <div className="ntp-control-row">
                                <label>Search Bar Width: <b>{layout.searchWidth}px</b></label>
                                <input
                                    type="range"
                                    min="520"
                                    max="960"
                                    step="20"
                                    value={layout.searchWidth}
                                    onChange={(e) => saveLayout({ ...layout, searchWidth: parseInt(e.target.value, 10) })}
                                />
                            </div>

                            <div className="ntp-control-row">
                                <label>Clock Time Format:</label>
                                <div className="ntp-button-group">
                                    <button
                                        className={`ntp-seg-btn ${layout.timeFormat === '12h' ? 'active' : ''}`}
                                        onClick={() => saveLayout({ ...layout, timeFormat: '12h' })}
                                    >
                                        12-Hour (AM/PM)
                                    </button>
                                    <button
                                        className={`ntp-seg-btn ${layout.timeFormat === '24h' ? 'active' : ''}`}
                                        onClick={() => saveLayout({ ...layout, timeFormat: '24h' })}
                                    >
                                        24-Hour
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Editable Elements Visibility Toggles */}
                        <div className="ntp-custom-section">
                            <h4>👁️ Show / Hide Elements</h4>
                            <div className="ntp-toggles-grid">
                                <label className="ntp-toggle-label">
                                    <input
                                        type="checkbox"
                                        checked={layout.showClock}
                                        onChange={(e) => saveLayout({ ...layout, showClock: e.target.checked })}
                                    />
                                    <span>Clock & Greeting</span>
                                </label>
                                <label className="ntp-toggle-label">
                                    <input
                                        type="checkbox"
                                        checked={layout.showBadge}
                                        onChange={(e) => saveLayout({ ...layout, showBadge: e.target.checked })}
                                    />
                                    <span>Brand Badge</span>
                                </label>
                                <label className="ntp-toggle-label">
                                    <input
                                        type="checkbox"
                                        checked={layout.showEngineSelector}
                                        onChange={(e) => saveLayout({ ...layout, showEngineSelector: e.target.checked })}
                                    />
                                    <span>Search Engine Switcher</span>
                                </label>
                                <label className="ntp-toggle-label">
                                    <input
                                        type="checkbox"
                                        checked={layout.showSearchBar}
                                        onChange={(e) => saveLayout({ ...layout, showSearchBar: e.target.checked })}
                                    />
                                    <span>Main Search Bar</span>
                                </label>
                                <label className="ntp-toggle-label">
                                    <input
                                        type="checkbox"
                                        checked={layout.showShortcuts}
                                        onChange={(e) => saveLayout({ ...layout, showShortcuts: e.target.checked })}
                                    />
                                    <span>Speed Dial Shortcuts</span>
                                </label>
                                <label className="ntp-toggle-label">
                                    <input
                                        type="checkbox"
                                        checked={layout.showFeaturePills}
                                        onChange={(e) => saveLayout({ ...layout, showFeaturePills: e.target.checked })}
                                    />
                                    <span>Bottom Feature Badges</span>
                                </label>
                            </div>
                        </div>

                        {/* Custom Greeting text */}
                        <div className="ntp-custom-section">
                            <h4>✏️ Custom Greeting Message</h4>
                            <input
                                type="text"
                                className="ntp-custom-input"
                                placeholder="e.g. Welcome back, Anurag! (leave blank for automatic)"
                                value={layout.customGreeting}
                                onChange={(e) => saveLayout({ ...layout, customGreeting: e.target.value })}
                            />
                        </div>

                        {/* Reset and Quick Actions */}
                        <div className="ntp-custom-actions">
                            <button className="ntp-action-btn secondary" onClick={handleResetDefaults}>
                                ↺ Reset to Default
                            </button>
                            <button className="ntp-action-btn primary" onClick={() => setIsCustomizeOpen(false)}>
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Freely Placed Shortcut Cards across the Home Page Canvas */}
            {shortcuts.filter(sc => layout.positions && layout.positions[sc.id]).map((sc) => {
                const pos = layout.positions[sc.id];
                return (
                    <div
                        key={`free-${sc.id}`}
                        id={`item-${sc.id}`}
                        className={`shortcut-card ntp-canvas-free-card ${isEditMode ? 'editable' : 'locked'} ${selectedId === sc.id ? 'canva-selected' : ''}`}
                        style={{
                            position: 'absolute',
                            left: `${pos.x}px`,
                            top: `${pos.y}px`,
                            width: `${pos.width || 200}px`,
                            height: `${pos.height || 110}px`,
                            zIndex: selectedId === sc.id ? 120 : 100
                        }}
                        draggable={isEditMode}
                        onDragStart={(e) => handleDragStart(e, shortcuts.indexOf(sc))}
                        onDragEnd={handleDragEnd}
                        onMouseDown={(e) => {
                            if (isEditMode) {
                                startPointerDrag(e, sc.id, 'shortcut');
                            }
                        }}
                        onClick={(e) => {
                            if (isEditMode) {
                                e.stopPropagation();
                                setSelectedId(sc.id);
                            } else {
                                if (sc.url) onNavigate(sc.url);
                                else if (sc.demo === 'checkout') onNavigate('demo_checkout.html');
                            }
                        }}
                        title={isEditMode ? `${sc.name}\nDrag anywhere freely, click to resize with Canva handles, or click ⊞ to return to grid` : `${sc.name}\nClick to open`}
                    >
                        {renderCanvaBoundingBox(sc.id, 'shortcut', { shortcut: sc })}
                        {isEditMode && (
                            <div className="shortcut-card-actions">
                                <span
                                    className="shortcut-card-btn drag-btn"
                                    title="Click and drag to place anywhere on the home page"
                                    onMouseDown={(e) => startPointerDrag(e, sc.id, 'shortcut')}
                                >
                                    ⋮⋮
                                </span>
                                <button
                                    type="button"
                                    className="shortcut-card-btn snap-btn"
                                    title="Snap back into grid"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleResetSinglePosition(sc.id);
                                    }}
                                >
                                    ⊞
                                </button>
                                <button
                                    type="button"
                                    className="shortcut-card-btn edit"
                                    title="Edit site details"
                                    onClick={(e) => handleOpenEditSite(e, sc)}
                                >
                                    ✏️
                                </button>
                                <button
                                    type="button"
                                    className="shortcut-card-btn delete"
                                    title="Remove shortcut"
                                    onClick={(e) => handleDeleteSite(e, sc.id)}
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                        <div className="shortcut-icon" style={{ color: sc.color }}>
                            {sc.icon}
                        </div>
                        <span className="shortcut-title">{sc.name}</span>
                        <span className="shortcut-desc">{sc.desc}</span>
                    </div>
                );
            })}

            {/* Main NTP Container with dynamic CSS scale variables */}
            <div
                className="ntp-container"
                style={{
                    '--card-scale': layout.cardScale,
                    '--grid-cols': layout.gridCols,
                    '--clock-size': `${layout.clockSize}px`,
                    '--search-width': `${layout.searchWidth}px`,
                    maxWidth: '1200px',
                    width: '100%'
                }}
            >
                {/* Dynamically Reorderable Sections based on layout.sectionOrder */}
                {(layout.sectionOrder || ['time', 'badge', 'search', 'shortcuts', 'features']).map(renderSection)}

            </div>

            {/* Add / Edit Site Modal Popup */}
            {isSiteModalOpen && (
                <div className="ui-modal-backdrop" onClick={() => setIsSiteModalOpen(false)}>
                    <div className="modal-container site-edit-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingSite ? '✏️ Edit Site Shortcut' : '➕ Add Site to Home'}</h2>
                            <button className="modal-close-btn" onClick={() => setIsSiteModalOpen(false)}>✕</button>
                        </div>

                        <form className="site-form" onSubmit={handleSaveSiteModal}>
                            <div className="form-group">
                                <label>Site Name *</label>
                                <input
                                    type="text"
                                    className="site-input"
                                    placeholder="e.g. Netflix, Twitter, Slack"
                                    value={siteForm.name}
                                    required
                                    autoFocus
                                    onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Web Address (URL) *</label>
                                <input
                                    type="text"
                                    className="site-input"
                                    placeholder="e.g. https://netflix.com or netflix.com"
                                    value={siteForm.url}
                                    required
                                    onChange={(e) => setSiteForm({ ...siteForm, url: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Description (Subtitle)</label>
                                <input
                                    type="text"
                                    className="site-input"
                                    placeholder="e.g. Movies & TV Shows"
                                    value={siteForm.desc}
                                    onChange={(e) => setSiteForm({ ...siteForm, desc: e.target.value })}
                                />
                            </div>

                            <div className="form-row-two">
                                <div className="form-group">
                                    <label>Icon / Emoji</label>
                                    <input
                                        type="text"
                                        className="site-input icon-input"
                                        value={siteForm.icon}
                                        maxLength={4}
                                        placeholder="🌐"
                                        onChange={(e) => setSiteForm({ ...siteForm, icon: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Accent Color</label>
                                    <input
                                        type="color"
                                        className="site-color-picker"
                                        value={siteForm.color}
                                        onChange={(e) => setSiteForm({ ...siteForm, color: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="site-form-actions">
                                {editingSite && (
                                    <button
                                        type="button"
                                        className="btn-site-delete"
                                        onClick={(e) => handleDeleteSite(e, editingSite.id)}
                                    >
                                        🗑️ Delete
                                    </button>
                                )}
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                                    <button
                                        type="button"
                                        className="btn-site-cancel"
                                        onClick={() => setIsSiteModalOpen(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-site-save">
                                        {editingSite ? 'Save Changes' : 'Add Shortcut'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            {toastMessage && (
                <div className="ntp-toast">
                    <span>✨ {toastMessage}</span>
                </div>
            )}
        </div>
    );
}
