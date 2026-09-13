import React, { useState, useEffect, useRef } from 'react';

export default function TabSearchModal({
    isOpen,
    tabs = [],
    activeTabId,
    onSelectTab,
    onClose
}) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => {
                if (inputRef.current) inputRef.current.focus();
            }, 50);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const filteredTabs = tabs.filter((t) => {
        const q = query.toLowerCase().trim();
        if (!q) return true;
        const title = (t.title || '').toLowerCase();
        const url = (t.url || '').toLowerCase();
        return title.includes(q) || url.includes(q);
    });

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % (filteredTabs.length || 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + filteredTabs.length) % (filteredTabs.length || 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const target = filteredTabs[selectedIndex];
            if (target) {
                onSelectTab(target.id);
                onClose();
            }
        }
    };

    return (
        <div className="command-palette-modal" onClick={onClose}>
            <div className="command-palette-backdrop" />
            <div
                className="command-palette-container"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="command-palette-header">
                    <span className="palette-icon">🔍</span>
                    <input
                        ref={inputRef}
                        type="text"
                        className="palette-input"
                        placeholder="Search open tabs by title or URL... (Press Enter to jump)"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                        onKeyDown={handleKeyDown}
                    />
                    <span className="palette-badge" onClick={onClose}>ESC</span>
                </div>

                <div className="command-palette-results">
                    {filteredTabs.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                            No open tabs matching "{query}"
                        </div>
                    ) : (
                        filteredTabs.map((tab, idx) => {
                            const isSelected = idx === selectedIndex;
                            const isCurrentActive = tab.id === activeTabId;
                            return (
                                <div
                                    key={tab.id}
                                    className={`palette-result-item ${isSelected ? 'selected' : ''}`}
                                    onClick={() => {
                                        onSelectTab(tab.id);
                                        onClose();
                                    }}
                                >
                                    <span style={{ fontSize: '16px' }}>
                                        {tab.url && tab.url.startsWith('https://') ? '🌐' : '✨'}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="palette-result-title">
                                            {tab.title || 'New Tab'}
                                            {isCurrentActive && (
                                                <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent-cyan)', background: 'rgba(0,229,255,0.15)', padding: '1px 5px', borderRadius: 4 }}>
                                                    Current
                                                </span>
                                            )}
                                        </div>
                                        <div className="palette-result-url">
                                            {tab.url || 'about:blank'}
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                                        Tab #{tab.id}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
