import React, { useState } from 'react';

export default function QrCodeModal({
    isOpen,
    url,
    onClose
}) {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const cleanUrl = url && (url.startsWith('http://') || url.startsWith('https://'))
        ? url
        : 'https://www.google.com';

    // Standard high-reliability public QR generator API
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(cleanUrl)}`;

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(cleanUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => {});
    };

    return (
        <div className="command-palette-modal" onClick={onClose}>
            <div className="command-palette-backdrop" />
            <div
                className="command-palette-container"
                style={{ width: '420px' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="command-palette-header">
                    <span className="palette-icon">📱</span>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--accent-cyan)' }}>
                        Scan QR Code on Phone
                    </span>
                    <span className="palette-badge" style={{ marginLeft: 'auto' }} onClick={onClose}>ESC</span>
                </div>

                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItem: 'center', alignItems: 'center', gap: '14px', textAlign: 'center' }}>
                    <div style={{ padding: '10px', background: '#fff', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
                        <img
                            src={qrImageUrl}
                            alt="QR Code"
                            style={{ width: '180px', height: '180px', display: 'block' }}
                        />
                    </div>

                    <div style={{ fontSize: '11px', color: '#94a3b8', wordBreak: 'break-all', maxWidth: '340px', fontFamily: 'var(--font-mono)' }}>
                        {cleanUrl}
                    </div>

                    <div style={{ fontSize: '12px', color: '#f8fafc', fontWeight: 500 }}>
                        Point your smartphone camera to open page instantly on mobile.
                    </div>

                    <button
                        className="btn-toolbar-tool"
                        style={{ marginTop: '4px' }}
                        onClick={handleCopyUrl}
                    >
                        {copied ? '✅ Copied URL!' : '📋 Copy Link'}
                    </button>
                </div>
            </div>
        </div>
    );
}
