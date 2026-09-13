import React, { useRef, useEffect } from 'react';

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
    onOpenQrCode
}) {
    const inputRef = useRef(null);

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
        if (isNewTab || !currentUrl || currentUrl.includes('newtab.html')) return '✨';
        if (currentUrl.startsWith('https://')) return '🔒';
        if (currentUrl.startsWith('http://')) return '🔓';
        return '📄';
    };

    const placeholderText = activeEngine === 'brave'
        ? 'Search Brave Private Search or type a URL...'
        : 'Search Google or type a URL...';

    return (
        <nav className="navigation-toolbar">
            <div className="nav-controls">
                <button className="btn-nav" id="btnBack" title="Back (Alt+Left)" onClick={onBack}>‹</button>
                <button className="btn-nav" id="btnForward" title="Forward (Alt+Right)" onClick={onForward}>›</button>
                <button className="btn-nav" id="btnReload" title="Reload (Ctrl+R)" onClick={onReload}>↻</button>
                <button className="btn-nav" id="btnHome" title="Home (Alt+Home)" onClick={onHome}>🏠</button>
            </div>

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

            <button className="btn-go" id="btnGo" onClick={handleGoClick}>Go</button>

            {!isNewTab && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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
                </div>
            )}

            <div className="status-pill">
                <span className="dot-live"></span>
                <span>In-Process C++</span>
            </div>
        </nav>
    );
}
