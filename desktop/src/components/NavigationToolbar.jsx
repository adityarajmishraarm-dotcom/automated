import React, { useRef, useEffect, useState } from 'react';
import CustomizableElementWrapper from './CustomizableElementWrapper.jsx';

export default function NavigationToolbar({
    currentUrl,
    activeEngine,
    onSetEngine,
    onNavigate,
    onBack,
    onForward,
    onReload,
    onHome,
    isNewTab,
    isBookmarked,
    onToggleBookmark,
    onOpenReaderMode,
    onOpenQrCode,
    onOpenWallpaperStudio,
    activeDownloadsCount = 0,
    onOpenDownloads,
    onOpenHistory,
    onOpenTypography,
    onOpenAiProviderModal,
    isEditMode = false,
    onOpenElementEditor,
    toolbarOrder = ['nav-controls', 'engine-toggle', 'omnibox', 'go-btn', 'tools-actions', 'status-pill'],
    onReorderToolbar
}) {
    const inputRef = useRef(null);
    const [draggedModuleId, setDraggedModuleId] = useState(null);
    const [dropTargetModuleId, setDropTargetModuleId] = useState(null);

    // Synchronize input value with active URL
    useEffect(() => {
        if (inputRef.current) {
            if (isNewTab || !currentUrl || currentUrl.includes('newtab.html')) {
                inputRef.current.value = '';
            } else {
                inputRef.current.value = currentUrl;
            }
        }
    }, [currentUrl, isNewTab]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            const val = inputRef.current ? inputRef.current.value : '';
            onNavigate(val);
        }
    };

    const handleFocus = () => {
        if (inputRef.current) {
            inputRef.current.select();
        }
    };

    const handleClick = () => {
        if (inputRef.current && document.activeElement === inputRef.current) {
            if (inputRef.current.selectionStart === inputRef.current.selectionEnd) {
                inputRef.current.select();
            }
        }
    };

    const handleGoClick = () => {
        const val = inputRef.current ? inputRef.current.value : '';
        onNavigate(val);
    };

    const getLockIcon = () => {
        if (isNewTab || !currentUrl || currentUrl.includes('newtab.html')) return '📄';
        if (currentUrl.startsWith('antigravity://') || currentUrl.startsWith('chrome://') || currentUrl.startsWith('brave://')) return '🛡️';
        if (currentUrl.startsWith('https://')) return '🔒';
        if (currentUrl.startsWith('http://')) return '🔓';
        return '📄';
    };

    const placeholderText = activeEngine === 'brave'
        ? 'Search Brave Private Search or type a URL...'
        : 'Search Google or type a URL...';

    // Toolbar modular section renderer map
    const renderModule = (moduleId) => {
        switch (moduleId) {
            case 'nav-controls':
                return (
                    /* ========================================================================= */
                    /* ///// nav buttons code /////                                              */
                    /* ========================================================================= */
                    <CustomizableElementWrapper
                        key="mod-nav-controls"
                        elementId="element_nav_buttons"
                        isEditMode={isEditMode}
                        onOpenElementEditor={onOpenElementEditor}
                        onAction={(action) => {
                            if (action === 'back') onBack();
                            else if (action === 'forward') onForward();
                            else if (action === 'reload') onReload();
                            else if (action === 'home') onHome();
                        }}
                    >
                        <div className="nav-controls">
                            <button className="btn-nav" id="btnBack" title="Back (Alt+Left)" onClick={onBack}>‹</button>
                            <button className="btn-nav" id="btnForward" title="Forward (Alt+Right)" onClick={onForward}>›</button>
                            <button className="btn-nav" id="btnReload" title="Reload (Ctrl+R)" onClick={onReload}>↻</button>
                            <button className="btn-nav" id="btnHome" title="Home (Alt+Home)" onClick={onHome}>🏠</button>
                        </div>
                    </CustomizableElementWrapper>
                );

            case 'engine-toggle':
                return (
                    /* ========================================================================= */
                    /* ///// engine toggle code /////                                            */
                    /* ========================================================================= */
                    <CustomizableElementWrapper
                        key="mod-engine-toggle"
                        elementId="element_engine_toggle"
                        isEditMode={isEditMode}
                        onOpenElementEditor={onOpenElementEditor}
                        onAction={(action) => {
                            if (action === 'set-google') onSetEngine('google');
                            else if (action === 'set-brave') onSetEngine('brave');
                        }}
                    >
                        <div className="engine-toggle-group" id="engineToggleGroup">
                            <button
                                className={`btn-engine-pill ${activeEngine === 'google' ? 'active' : ''}`}
                                id="btnTopGoogle"
                                title="Search with Google"
                                onClick={() => onSetEngine('google')}
                            >
                                🔍 Google
                            </button>
                            <button
                                className={`btn-engine-pill ${activeEngine === 'brave' ? 'active' : ''}`}
                                id="btnTopBrave"
                                title="Search with Brave"
                                onClick={() => onSetEngine('brave')}
                            >
                                🦁 Brave
                            </button>
                        </div>
                    </CustomizableElementWrapper>
                );

            case 'omnibox':
                return (
                    /* ========================================================================= */
                    /* ///// omnibox code /////                                                  */
                    /* ========================================================================= */
                    <CustomizableElementWrapper
                        key="mod-omnibox"
                        elementId="element_omnibox"
                        isEditMode={isEditMode}
                        onOpenElementEditor={onOpenElementEditor}
                        style={{ flex: 1, display: 'flex', minWidth: '220px' }}
                        onAction={(action, payload) => {
                            if (action === 'navigate' && payload?.val) onNavigate(payload.val);
                            else if (action === 'toggle-bookmark') onToggleBookmark();
                        }}
                    >
                        <div className="omnibox-box">
                            <span className="lock-icon" id="lockIcon">{getLockIcon()}</span>
                            <input
                                ref={inputRef}
                                type="text"
                                id="urlInput"
                                className="url-input"
                                placeholder={placeholderText}
                                spellCheck="false"
                                onKeyDown={handleKeyDown}
                                onFocus={handleFocus}
                                onClick={handleClick}
                            />
                            <span className="engine-tag" id="engineIndicatorTag">
                                {activeEngine === 'brave' ? 'Brave' : 'Google'}
                            </span>
                            <button
                                className={`btn-toolbar-tool ${isBookmarked ? 'active-starred' : ''}`}
                                style={{ border: 'none', background: 'transparent', fontSize: '14px', cursor: 'pointer', padding: '0 4px' }}
                                title={isBookmarked ? "Remove Bookmark (Ctrl+D)" : "Bookmark Page (Ctrl+D)"}
                                onClick={onToggleBookmark}
                            >
                                {isBookmarked ? '★' : '☆'}
                            </button>
                        </div>
                    </CustomizableElementWrapper>
                );

            case 'go-btn':
                return (
                    /* ========================================================================= */
                    /* ///// go button code /////                                                */
                    /* ========================================================================= */
                    <CustomizableElementWrapper
                        key="mod-go-btn"
                        elementId="element_go_btn"
                        isEditMode={isEditMode}
                        onOpenElementEditor={onOpenElementEditor}
                        onAction={(action) => {
                            if (action === 'submit') handleGoClick();
                        }}
                    >
                        <button className="btn-go" id="btnGo" onClick={handleGoClick}>
                            Go
                        </button>
                    </CustomizableElementWrapper>
                );

            case 'tools-actions':
                return (
                    /* ========================================================================= */
                    /* ///// toolbar tools code /////                                            */
                    /* ========================================================================= */
                    <CustomizableElementWrapper
                        key="mod-tools-actions"
                        elementId="element_toolbar_tools"
                        isEditMode={isEditMode}
                        onOpenElementEditor={onOpenElementEditor}
                        onAction={(action) => {
                            if (action === 'open-wallpaper') onOpenWallpaperStudio();
                            else if (action === 'open-typography') onOpenTypography();
                            else if (action === 'open-downloads') onOpenDownloads();
                            else if (action === 'open-history') onOpenHistory();
                            else if (action === 'open-ai-provider') onOpenAiProviderModal();
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {!isNewTab && (
                                <>
                                    <button
                                        className="btn-toolbar-tool"
                                        title="Clean Distraction-Free Reader Mode"
                                        onClick={onOpenReaderMode}
                                    >
                                        📖 Reader
                                    </button>
                                    <button
                                        className="btn-toolbar-tool"
                                        title="Scan QR Code to open on mobile"
                                        onClick={onOpenQrCode}
                                    >
                                        📱 QR
                                    </button>
                                </>
                            )}

                            <button
                                className="btn-toolbar-tool"
                                title="Custom Background Wallpaper Studio"
                                onClick={onOpenWallpaperStudio}
                            >
                                🎨 Wallpaper
                            </button>

                            <button
                                className="btn-toolbar-tool"
                                id="btnToolbarTypography"
                                title="Modern Typography & Font Canvas Studio (Ctrl+Alt+1..8)"
                                onClick={onOpenTypography}
                            >
                                🔤 Typography
                            </button>

                            <button
                                className="btn-toolbar-tool"
                                id="btnToolbarDownloads"
                                title="Open Downloads Manager (Ctrl+J)"
                                onClick={onOpenDownloads}
                                style={{ position: 'relative' }}
                            >
                                📥 Downloads
                                {activeDownloadsCount > 0 && (
                                    <span style={{
                                        position: 'absolute',
                                        top: -4,
                                        right: -4,
                                        background: '#00e5ff',
                                        color: '#070b14',
                                        borderRadius: '10px',
                                        fontSize: '10px',
                                        fontWeight: '800',
                                        padding: '1px 5px',
                                        lineHeight: '12px',
                                        boxShadow: '0 0 6px #00e5ff'
                                    }}>
                                        {activeDownloadsCount}
                                    </span>
                                )}
                            </button>

                            <button
                                className="btn-toolbar-tool"
                                id="btnToolbarHistory"
                                title="Open Browsing History (Ctrl+H)"
                                onClick={onOpenHistory}
                            >
                                🕒 History
                            </button>

                            <button
                                className="btn-toolbar-tool"
                                id="btnToolbarAiProviders"
                                title="AI Keys & Providers (OpenAI, LM Studio, Ollama, OpenRouter, OpenCode, Anthropic)"
                                onClick={onOpenAiProviderModal}
                                style={{ color: '#00e5ff', borderColor: 'rgba(0, 229, 255, 0.35)', background: 'rgba(0, 229, 255, 0.08)' }}
                            >
                                🔑 AI Keys
                            </button>
                        </div>
                    </CustomizableElementWrapper>
                );

            case 'status-pill':
                return (
                    <div key="mod-status-pill" className="status-pill">
                        <span className="dot-live"></span>
                        <span>In-Process C++</span>
                    </div>
                );

            default:
                return null;
        }
    };

    const activeOrder = Array.isArray(toolbarOrder) && toolbarOrder.length > 0
        ? toolbarOrder
        : ['nav-controls', 'engine-toggle', 'omnibox', 'go-btn', 'tools-actions', 'status-pill'];

    return (
        <nav className="navigation-toolbar">
            {activeOrder.map((modId) => {
                const isDragging = draggedModuleId === modId;
                const isDropTarget = dropTargetModuleId === modId;
                return (
                    <div
                        key={modId}
                        className={`modular-toolbar-unit ${isEditMode ? 'dnd-enabled' : ''} ${isDropTarget ? 'toolbar-drop-indicator' : ''}`}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            opacity: isDragging ? 0.4 : 1,
                            flex: modId === 'omnibox' ? 1 : 'none'
                        }}
                        draggable={isEditMode}
                        onDragStart={(e) => {
                            if (!isEditMode) return;
                            e.dataTransfer.setData('application/x-antigravity-toolbar', modId);
                            e.dataTransfer.effectAllowed = 'move';
                            setDraggedModuleId(modId);
                        }}
                        onDragOver={(e) => {
                            if (!isEditMode) return;
                            e.preventDefault();
                            if (draggedModuleId && draggedModuleId !== modId) {
                                setDropTargetModuleId(modId);
                            }
                        }}
                        onDragLeave={() => {
                            if (dropTargetModuleId === modId) setDropTargetModuleId(null);
                        }}
                        onDrop={(e) => {
                            if (!isEditMode) return;
                            e.preventDefault();
                            const sourceMod = e.dataTransfer.getData('application/x-antigravity-toolbar') || draggedModuleId;
                            if (sourceMod && sourceMod !== modId && onReorderToolbar) {
                                onReorderToolbar(sourceMod, modId);
                            }
                            setDraggedModuleId(null);
                            setDropTargetModuleId(null);
                        }}
                        onDragEnd={() => {
                            setDraggedModuleId(null);
                            setDropTargetModuleId(null);
                        }}
                    >
                        {isEditMode && (
                            <span 
                                className="toolbar-dnd-handle" 
                                title="Drag to reorder toolbar module"
                                style={{
                                    cursor: 'grab',
                                    color: '#00e5ff',
                                    marginRight: '2px',
                                    fontSize: '11px',
                                    userSelect: 'none',
                                    opacity: 0.8
                                }}
                            >
                                ⠿
                            </span>
                        )}
                        {renderModule(modId)}
                    </div>
                );
            })}
        </nav>
    );
}
