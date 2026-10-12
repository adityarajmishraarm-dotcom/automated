import React, { useState, useEffect, useRef } from 'react';

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
        id: 'matrix-video',
        name: 'Cyber Matrix (Video)',
        type: 'video',
        url: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-with-code-31914-large.mp4'
    }
];

export default function WallpaperStudioModal({
    isOpen,
    currentWallpaper = '',
    currentType,
    currentWallpaperType,
    currentOpacity = 0.4,
    currentColor = '#070b14',
    currentMuted = true,
    onSelectWallpaper,
    onApplyWallpaper,
    onRemoveWallpaper,
    onClose
}) {
    const activeType = currentType || currentWallpaperType || 'image';
    const normalizedOpacity = currentOpacity <= 1 ? Math.round(currentOpacity * 100) : currentOpacity;

    const [previewUrl, setPreviewUrl] = useState(currentWallpaper || '');
    const [previewType, setPreviewType] = useState(activeType);
    const [opacity, setOpacity] = useState(normalizedOpacity);
    const [color, setColor] = useState(currentColor);
    const [isMuted, setIsMuted] = useState(currentMuted !== undefined ? currentMuted : true);
    const [customUrlInput, setCustomUrlInput] = useState('');
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setPreviewUrl(currentWallpaper || '');
            setPreviewType(currentType || currentWallpaperType || 'image');
            setOpacity(currentOpacity <= 1 ? Math.round(currentOpacity * 100) : currentOpacity);
            setColor(currentColor || '#070b14');
            setIsMuted(currentMuted !== undefined ? currentMuted : true);
        }
    }, [isOpen, currentWallpaper, currentType, currentWallpaperType, currentOpacity, currentColor, currentMuted]);

    if (!isOpen) return null;

    const handleFileUpload = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
        // If file.path is available (Electron with nodeIntegration), use standard file URL
        const filePath = file.path ? 'file:///' + file.path.replace(/\\/g, '/') : URL.createObjectURL(file);
        setPreviewUrl(filePath);
        setPreviewType(isVideo ? 'video' : 'image');
    };

    const handlePickNativeFile = async () => {
        try {
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                const res = await ipcRenderer.invoke('wallpaper:pick-local-file');
                if (res && res.success && res.url) {
                    setPreviewUrl(res.url);
                    setPreviewType(res.type);
                    return;
                } else if (res && res.canceled) {
                    return;
                }
            }
        } catch (err) {
            console.warn('[Native wallpaper picker error]', err);
        }

        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleSelectPreset = (preset) => {
        setPreviewUrl(preset.url);
        setPreviewType(preset.type);
    };

    const handleSetCustomUrl = () => {
        const text = customUrlInput.trim();
        if (!text) return;
        const isVid = /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(text);
        setPreviewUrl(text);
        setPreviewType(isVid ? 'video' : 'image');
    };

    const handleApply = () => {
        const finalOpacity = opacity / 100;
        if (onSelectWallpaper) {
            onSelectWallpaper(previewType, previewUrl, finalOpacity, color, isMuted);
        }
        if (onApplyWallpaper) {
            onApplyWallpaper({
                url: previewUrl,
                type: previewType,
                opacity: finalOpacity,
                color: color,
                isMuted: isMuted
            });
        }
        onClose();
    };

    const handleRemove = () => {
        setPreviewUrl('');
        if (onRemoveWallpaper) {
            onRemoveWallpaper();
        } else if (onSelectWallpaper) {
            onSelectWallpaper('none', '', 0.4, '#070b14', true);
        }
        onClose();
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div
                className="modal-container wallpaper-modal"
                style={{
                    width: '600px',
                    maxWidth: '92vw',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    padding: 0
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>🎨</span>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>
                            Custom Wallpaper Studio
                        </h3>
                    </div>
                    <button className="modal-close-btn" onClick={onClose} title="Close">
                        ✕
                    </button>
                </div>

                <div className="wallpaper-modal-body">
                    {/* Live Preview Box */}
                    <div
                        className="wallpaper-preview-box"
                        style={{ backgroundColor: color }}
                    >
                        {previewUrl ? (
                            previewType === 'video' ? (
                                <video
                                    src={previewUrl}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    autoPlay
                                    muted={isMuted}
                                    loop
                                    playsInline
                                />
                            ) : (
                                <img
                                    src={previewUrl}
                                    alt="Wallpaper Preview"
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
                                    background: `rgba(0, 0, 0, ${opacity / 100})`,
                                    pointerEvents: 'none'
                                }}
                            />
                        )}
                    </div>

                    {/* Presets Grid */}
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
                            Studio Presets (Images & Loop Videos)
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                            {PRESET_WALLPAPERS.map((preset) => (
                                <div
                                    key={preset.id}
                                    onClick={() => handleSelectPreset(preset)}
                                    title={`${preset.name} (${preset.type})`}
                                    style={{
                                        height: '56px',
                                        borderRadius: '8px',
                                        backgroundImage: preset.type === 'image' ? `url(${preset.url})` : 'none',
                                        backgroundColor: preset.type === 'video' ? '#0f172a' : 'transparent',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        cursor: 'pointer',
                                        border: previewUrl === preset.url ? '2px solid var(--accent-cyan)' : '1px solid rgba(255, 255, 255, 0.1)',
                                        boxShadow: previewUrl === preset.url ? '0 0 10px rgba(0, 240, 255, 0.4)' : 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                        position: 'relative',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    {preset.type === 'video' && (
                                        <div style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 600, textAlign: 'center', padding: '2px' }}>
                                            🎬 Video
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Custom Input & Local File Picker */}
                    <div className="wallpaper-actions">
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                className="search-query-input"
                                placeholder="Paste image, GIF, or video URL..."
                                value={customUrlInput}
                                onChange={(e) => setCustomUrlInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSetCustomUrl(); }}
                                style={{ flex: 1 }}
                            />
                            <button
                                className="btn-wallpaper-action btn-blue"
                                onClick={handleSetCustomUrl}
                            >
                                Set URL
                            </button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                                type="button"
                                className="btn-wallpaper-action btn-blue"
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                onClick={handlePickNativeFile}
                            >
                                📁 Choose Local Image / Video / GIF (Native Dialog)
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,video/mp4,video/webm,video/quicktime"
                                style={{ display: 'none' }}
                                onChange={handleFileUpload}
                            />
                        </div>

                        {/* Video Audio Preference (User can toggle sound on/off) */}
                        {previewType === 'video' && (
                            <div className="wallpaper-audio-row">
                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                    Video Sound Playback:
                                </span>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                        type="button"
                                        className={`wallpaper-toggle-btn ${isMuted ? 'active' : ''}`}
                                        onClick={() => setIsMuted(true)}
                                    >
                                        🔇 Muted (Quiet)
                                    </button>
                                    <button
                                        type="button"
                                        className={`wallpaper-toggle-btn ${!isMuted ? 'active' : ''}`}
                                        onClick={() => setIsMuted(false)}
                                    >
                                        🔊 Play Audio
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Controls: Opacity & Color */}
                        <div className="wallpaper-opacity-row">
                            <label style={{ fontSize: '12px', color: '#94a3b8' }}>
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
                            <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                                {opacity}%
                            </span>
                        </div>

                        <div className="wallpaper-color-row">
                            <label style={{ fontSize: '12px', color: '#94a3b8' }}>
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
