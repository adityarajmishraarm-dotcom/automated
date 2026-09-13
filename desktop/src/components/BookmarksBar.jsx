import React from 'react';

export default function BookmarksBar({
    bookmarks = [],
    onNavigate,
    onAddCurrentPage,
    onRemoveBookmark,
    onOpenHistory
}) {
    return (
        <div className="bookmarks-bar" id="bookmarksBar">
            <div
                className="bookmark-pill add-btn"
                title="Bookmark active tab (Ctrl+D)"
                onClick={onAddCurrentPage}
            >
                <span>➕</span>
                <span>Add Bookmark</span>
            </div>

            {bookmarks.map((bm) => (
                <div
                    key={bm.id || bm.url}
                    className="bookmark-pill"
                    title={`${bm.title} (${bm.url}) — Left-click to open, right-click to remove`}
                    onClick={() => onNavigate(bm.url)}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        if (onRemoveBookmark) onRemoveBookmark(bm.id || bm.url);
                    }}
                >
                    <span>🔖</span>
                    <span>{bm.title || bm.url}</span>
                </div>
            ))}

            <div
                className="bookmark-pill"
                title="View Browsing History (Ctrl+H)"
                style={{ marginLeft: 'auto', background: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.12)' }}
                onClick={onOpenHistory}
            >
                <span>🕒</span>
                <span>History</span>
            </div>
        </div>
    );
}
