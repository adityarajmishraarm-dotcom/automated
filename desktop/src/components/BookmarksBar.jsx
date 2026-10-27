import React from 'react';
import CustomizableElementWrapper from './CustomizableElementWrapper.jsx';

export default function BookmarksBar({
    bookmarks = [],
    onNavigate,
    onAddCurrentPage,
    onRemoveBookmark,
    onOpenHistory,
    isEditMode = false,
    onOpenElementEditor
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

            {/* ========================================================================= */}
            {/* ///// bookmark code /////                                                 */}
            {/* ========================================================================= */}
            <CustomizableElementWrapper
                elementId="element_bookmark_pill"
                isEditMode={isEditMode}
                onOpenElementEditor={onOpenElementEditor}
                onAction={(action, payload) => {
                    if (action === 'navigate' && payload?.val) onNavigate(payload.val);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {bookmarks.map((bm) => (
                        <div
                            key={bm.id || bm.url}
                            className="bookmark-pill"
                            draggable={true}
                            onDragStart={(e) => {
                                e.dataTransfer.effectAllowed = 'copyMove';
                                e.dataTransfer.setData('application/json', JSON.stringify(bm));
                                e.dataTransfer.setData('text/plain', bm.url);
                                e.dataTransfer.setData('text/uri-list', bm.url);
                            }}
                            title={`${bm.title} (${bm.url}) — Left-click to open, right-click to remove, drag onto home page`}
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
                </div>
            </CustomizableElementWrapper>

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
