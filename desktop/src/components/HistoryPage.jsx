import React, { useState } from 'react';

export default function HistoryPage({
    history = [],
    onNavigate,
    onRemoveHistoryItem,
    onClearHistory
}) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredHistory = history.filter((item) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (item.title && item.title.toLowerCase().includes(q)) ||
               (item.url && item.url.toLowerCase().includes(q));
    });

    const formatTime = (ts) => {
        if (!ts) return '';
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDateHeading = (ts) => {
        if (!ts) return 'Earlier';
        const d = new Date(ts);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return 'Today';
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Group items by date heading
    const grouped = filteredHistory.reduce((acc, item) => {
        const heading = formatDateHeading(item.timestamp);
        if (!acc[heading]) acc[heading] = [];
        acc[heading].push(item);
        return acc;
    }, {});

    return (
        <div className="history-page-container">
            {/* Top Toolbar Header */}
            <header className="history-header">
                <div className="history-header-left">
                    <span className="history-logo-icon">🕒</span>
                    <div>
                        <h1 className="history-title">Browsing History</h1>
                        <p className="history-subtitle">
                            {filteredHistory.length} visited pages persisted locally
                        </p>
                    </div>
                </div>

                <div className="history-search-wrapper">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        className="history-search-input"
                        placeholder="Search browsing history..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button className="search-clear-btn" onClick={() => setSearchTerm('')}>✕</button>
                    )}
                </div>

                <div className="history-header-actions">
                    {history.length > 0 && (
                        <button
                            className="history-action-btn secondary"
                            title="Clear all browsing history permanently"
                            onClick={onClearHistory}
                        >
                            🗑️ Clear Browsing Data
                        </button>
                    )}
                </div>
            </header>

            {/* History Content Area */}
            <main className="history-content">
                {filteredHistory.length === 0 ? (
                    <div className="history-empty-state">
                        <div className="empty-icon-circle">🕒</div>
                        <h2>{searchTerm ? 'No history matches your search' : 'No browsing history yet'}</h2>
                        <p>{searchTerm ? 'Try searching for another keyword or URL.' : 'Pages you visit across all tabs will appear here and persist across restarts.'}</p>
                    </div>
                ) : (
                    <div className="history-grouped-list">
                        {Object.entries(grouped).map(([heading, items]) => (
                            <div key={heading} className="history-group">
                                <h3 className="history-group-heading">{heading}</h3>
                                <div className="history-group-items">
                                    {items.map((item) => (
                                        <div key={item.id || `${item.url}-${item.timestamp}`} className="history-item-row">
                                            <span className="history-item-time">{formatTime(item.timestamp)}</span>
                                            <span className="history-item-icon">
                                                {item.url && item.url.startsWith('https://') ? '🌐' : '📄'}
                                            </span>
                                            <div
                                                className="history-item-details"
                                                onClick={() => onNavigate && onNavigate(item.url)}
                                            >
                                                <span className="history-item-title" title={item.title || item.url}>
                                                    {item.title || item.url}
                                                </span>
                                                <span className="history-item-url" title={item.url}>
                                                    {item.url}
                                                </span>
                                            </div>
                                            <button
                                                className="history-item-remove-btn"
                                                title="Remove from history"
                                                onClick={() => onRemoveHistoryItem && onRemoveHistoryItem(item.id || item.url)}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
