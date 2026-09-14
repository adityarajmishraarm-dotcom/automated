import React, { useState } from 'react';

const PRESET_WALLPAPERS = [
    {
        id: 'cosmic',
        name: 'Cosmic Nebula',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=2070&auto=format&fit=crop'
    },
    {
        id: 'cyberpunk',
        name: 'Cyberpunk Neon',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop'
    },
    {
        id: 'ocean',
        name: 'Deep Oceanic',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=2070&auto=format&fit=crop'
    },
    {
        id: 'obsidian',
        name: 'Obsidian Flow',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2064&auto=format&fit=crop'
    },
    {
        id: 'gradient',
        name: 'Aurora Gradient',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop'
    }
];

export default function WallpaperStudioModal({
    isOpen,
    currentWallpaper,
    currentWallpaperType,
    currentOpacity = 40,
    currentColor = '#070b14',
    onApplyWallpaper,
    onRemoveWallpaper,
    onClose
}) {
    const [previewUrl, setPreviewUrl] = useState(currentWallpaper || '');
    const [previewType, setPreviewType] = useState(currentWallpaperType || 'image');
    const [opacity, setOpacity] = useState(currentOpacity);
    const [color, setColor] = useState(currentColor);
    const [customUrlInput, setCustomUrlInput] = useState('');

    if (!isOpen) return null;

    const handleFileUpload = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const isVideo = file.type.startsWith('video/');
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setPreviewType(isVideo ? 'video' : 'image');
    };

    const handleSelectPreset = (preset) => {
        setPreviewUrl(preset.url);
        setPreviewType(preset.type);
    };

    const handleApply = () => {
        onApplyWallpaper({
            url: previewUrl,
            type: previewType,
            opacity: opacity,
            color: color
        });
        onClose();
    };

    const handleRemove = () => {
        setPreviewUrl('');
        onRemoveWallpaper();
        onClose();
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div
                className="modal-container wallpaper-modal"
                style={{ width: '560px', maxHeight: '88vh', overflowY: 'auto' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>🎨</span>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            Custom Wallpaper Studio
                        </h3>
                    </div>
                    <button className="modal-close-btn" onClick={onClose} title="Close">
                        ✕
                    </button>
                </div>

                <div className="wallpaper-modal-body">
                    {/* Live Preview Box */}
                    <div className="wallpaper-preview-box">
                        {previewUrl ? (
                            previewType === 'video' ? (
                                <video
                                    src={previewUrl}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    autoPlay
                                    muted
                                    loop
                                />
                            ) : (
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            )
                        ) : (
                            <span className="wallpaper-preview-placeholder">
                                No wallpaper selected (Default browser dark theme)
                            </span>
                        )}

                        {previewUrl && (
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: `rgba(0,0,0,${opacity / 100})`,
                                    pointerEvents: 'none'
                                }}
                            />
                        )}
                    </div>

                    {/* Presets Grid */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                            Studio Presets
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                            {PRESET_WALLPAPERS.map((preset) => (
                                <div
                                    key={preset.id}
                                    onClick={() => handleSelectPreset(preset)}
                                    title={preset.name}
                                    style={{
                                        height: '56px',
                                        borderRadius: '8px',
                                        backgroundImage: `url(${preset.url})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        cursor: 'pointer',
                                        border: previewUrl === preset.url ? '2px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                                        boxShadow: previewUrl === preset.url ? '0 0 10px rgba(0,240,255,0.4)' : 'none',
                                        transition: 'all 0.15s ease'
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Actions & Custom Inputs */}
                    <div className="wallpaper-actions">
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                className="search-query-input"
                                placeholder="Paste image, GIF, or video URL..."
                                value={customUrlInput}
                                onChange={(e) => setCustomUrlInput(e.target.value)}
                                style={{ flex: 1 }}
                            />
                            <button
                                className="btn-wallpaper-action btn-blue"
                                onClick={() => {
                                    if (customUrlInput.trim()) {
                                        const isVid = customUrlInput.endsWith('.mp4') || customUrlInput.endsWith('.webm');
                                        setPreviewUrl(customUrlInput.trim());
                                        setPreviewType(isVid ? 'video' : 'image');
                                    }
                                }}
                            >
                                Set URL
                            </button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label className="btn-wallpaper-action btn-blue" style={{ cursor: 'pointer', margin: 0 }}>
                                📁 Upload Local Image / Video / GIF
                                <input
                                    type="file"
                                    accept="image/*,video/mp4,video/webm"
                                    style={{ display: 'none' }}
                                    onChange={handleFileUpload}
                                />
                            </label>
                        </div>

                        {/* Controls: Opacity & Color */}
                        <div className="wallpaper-opacity-row">
                            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                Dark Scrim Opacity:
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="80"
                                value={opacity}
                                onChange={(e) => setOpacity(parseInt(e.target.value, 10))}
                                className="wallpaper-range"
                            />
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                {opacity}%
                            </span>
                        </div>

                        <div className="wallpaper-color-row">
                            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                Base Underlay Color:
                            </label>
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="wallpaper-color-input"
                            />
                        </div>

                        {/* Apply & Remove */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                            <button
                                className="btn-wallpaper-action btn-green"
                                style={{ flex: 1 }}
                                onClick={handleApply}
                            >
                                ✅ Apply Wallpaper
                            </button>
                            {currentWallpaper && (
                                <button
                                    className="btn-wallpaper-action btn-red"
                                    onClick={handleRemove}
                                >
                                    🗑️ Remove
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
