import React, { useState, useEffect, useRef } from 'react';

export default function HistoryModal({
    isOpen,
    history = [],
    onNavigate,
    onRemoveHistoryItem,
    onClearHistory,
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

    const filteredHistory = history.filter((item) => {
        const q = query.toLowerCase().trim();
        if (!q) return true;
        const title = (item.title || '').toLowerCase();
        const url = (item.url || '').toLowerCase();
        return title.includes(q) || url.includes(q);
    });

    const formatTime = (ts) => {
        if (!ts) return '';
        const d = new Date(ts);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (isToday) return timeStr;
        return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${timeStr}`;
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % (filteredHistory.length || 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + filteredHistory.length) % (filteredHistory.length || 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const target = filteredHistory[selectedIndex];
            if (target) {
                onNavigate(target.url);
                onClose();
            }
        }
    };

    return (
        <div className="command-palette-modal" onClick={onClose}>
            <div className="command-palette-backdrop" />
            <div
                className="command-palette-container"
                style={{ width: '650px', maxHeight: '520px' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="command-palette-header">
                    <span className="palette-icon">🕒</span>
                    <input
                        ref={inputRef}
                        type="text"
                        className="palette-input"
                        placeholder="Search browsing history... (Press Enter to visit, Ctrl+H to toggle)"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                        onKeyDown={handleKeyDown}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {history.length > 0 && (
                            <button
                                style={{
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#f87171',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    padding: '3px 8px',
                                    cursor: 'pointer'
                                }}
                                title="Clear all browsing history"
                                onClick={onClearHistory}
                            >
                                Clear All
                            </button>
                        )}
                        <span className="palette-badge" onClick={onClose}>ESC</span>
                    </div>
                </div>

                <div className="command-palette-results" style={{ maxHeight: '420px' }}>
                    {filteredHistory.length === 0 ? (
                        <div style={{ padding: '28px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                            {query ? `No history entries matching "${query}"` : 'Browsing history is empty'}
                        </div>
                    ) : (
                        filteredHistory.map((item, idx) => {
                            const isSelected = idx === selectedIndex;
                            return (
                                <div
                                    key={item.id || `${item.url}-${item.timestamp}`}
                                    className={`palette-result-item ${isSelected ? 'selected' : ''}`}
                                    onClick={() => {
                                        onNavigate(item.url);
                                        onClose();
                                    }}
                                >
                                    <span style={{ fontSize: '15px' }}>
                                        {item.url && item.url.startsWith('https://') ? '🌐' : '📄'}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="palette-result-title">
                                            {item.title || item.url}
                                        </div>
                                        <div className="palette-result-url">
                                            {item.url}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                                            {formatTime(item.timestamp)}
                                        </span>
                                        <button
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#64748b',
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                                padding: '2px 6px',
                                                borderRadius: '4px'
                                            }}
                                            title="Delete from history"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onRemoveHistoryItem) onRemoveHistoryItem(item.id || item.url);
                                            }}
                                            onMouseEnter={(e) => e.target.style.color = '#ef4444'}
                                            onMouseLeave={(e) => e.target.style.color = '#64748b'}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
