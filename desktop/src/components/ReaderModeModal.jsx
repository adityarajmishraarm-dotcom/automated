import React, { useState } from 'react';

export default function ReaderModeModal({
    isOpen,
    title,
    content,
    onClose
}) {
    const [fontSize, setFontSize] = useState(16);

    if (!isOpen) return null;

    const handleFontSizeToggle = () => {
        setFontSize((prev) => (prev >= 22 ? 14 : prev + 2));
    };

    return (
        <div className="command-palette-modal" onClick={onClose}>
            <div className="command-palette-backdrop" />
            <div
                className="command-palette-container"
                style={{ width: '740px', maxHeight: '85vh' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="command-palette-header">
                    <span className="palette-icon">📖</span>
                    <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--accent-cyan)' }}>
                        Clean Reader Mode: {title || 'Web Article'}
                    </span>
                    <button
                        className="btn-toolbar-tool"
                        style={{ marginLeft: 'auto', marginRight: '10px' }}
                        onClick={handleFontSizeToggle}
                        title="Toggle font size"
                    >
                        A+ Font ({fontSize}px)
                    </button>
                    <span className="palette-badge" onClick={onClose}>ESC</span>
                </div>

                <div
                    style={{
                        padding: '24px',
                        overflowY: 'auto',
                        maxHeight: 'calc(85vh - 60px)',
                        fontSize: `${fontSize}px`,
                        lineHeight: 1.8,
                        color: '#cbd5e1',
                        fontFamily: "'Plus Jakarta Sans', sans-serif"
                    }}
                >
                    <h1 style={{ fontSize: `${fontSize + 8}px`, marginBottom: '16px', color: '#f8fafc', fontWeight: 800 }}>
                        {title || 'Article Content'}
                    </h1>
                    {content ? (
                        <div style={{ whiteSpace: 'pre-line' }}>{content}</div>
                    ) : (
                        <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                            Loading distraction-free article text from active page...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
