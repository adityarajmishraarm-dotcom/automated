import React, { useState, useEffect } from 'react';

export const TYPOGRAPHY_FONT_SIZES = {
    'compact': { px: 14, name: 'Compact (14px)', lineHeight: 1.65 },
    'standard': { px: 16, name: 'Standard (16px)', lineHeight: 1.75 },
    'comfortable': { px: 18, name: 'Comfortable (18px)', lineHeight: 1.8 },
    'spacious': { px: 21, name: 'Spacious (21px)', lineHeight: 1.85 }
};

export const TYPOGRAPHY_FONT_STYLES = {
    'gt-super': {
        name: 'GT Super',
        fontFamily: "'GT Super', 'GT Super Display', 'Cheltenham', 'Georgia', serif",
        letterSpacing: '-0.015em',
        category: 'Editorial Serif',
        author: 'Noël Leu • Editorial & Headline Serif',
        badge: 'Ctrl+Alt+1'
    },
    'juana': {
        name: 'Juana',
        fontFamily: "'Juana', 'Bodoni Moda', 'Didot', 'Playfair Display', serif",
        letterSpacing: '0.005em',
        category: 'High-Contrast Luxury Serif',
        author: 'Latinotype • High-Contrast Luxury Serif',
        badge: 'Ctrl+Alt+2'
    },
    'playfair-display': {
        name: 'Playfair Display',
        fontFamily: "'Playfair Display', 'Georgia', serif",
        letterSpacing: '0.01em',
        category: 'Classical Editorial',
        author: 'Claus Sørensen • Classical Editorial',
        badge: 'Ctrl+Alt+3'
    },
    'ogg': {
        name: 'Ogg',
        fontFamily: "'Ogg', 'Cormorant Garamond', 'Baskerville', 'Georgia', serif",
        letterSpacing: '-0.01em',
        category: 'Calligraphic Serif',
        author: 'Sharp Type • Calligraphic Book Title Serif',
        badge: 'Ctrl+Alt+4'
    },
    'inter': {
        name: 'Inter',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        letterSpacing: '-0.011em',
        category: 'Clean Neo-Grotesque',
        author: 'Rasmus Andersson • Clean Neo-Grotesque',
        badge: 'Ctrl+Alt+5'
    },
    'poppins': {
        name: 'Poppins (Toppins)',
        fontFamily: "'Poppins', 'Toppins', sans-serif",
        letterSpacing: '-0.005em',
        category: 'Geometric Sans',
        author: 'Indian Type Foundry • Geometric Sans',
        badge: 'Ctrl+Alt+6'
    },
    'plus-jakarta-sans': {
        name: 'Plus Jakarta Sans',
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
        letterSpacing: '-0.02em',
        category: 'Modern Neo-Grotesque',
        author: 'Tokotype • Modern Clean Typography',
        badge: 'Ctrl+Alt+7'
    },
    'avenir': {
        name: 'Avenir',
        fontFamily: "'Avenir', 'Avenir Next', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        letterSpacing: '-0.01em',
        category: 'Humanist Geometric',
        author: 'Adrian Frutiger • Humanist Geometric',
        badge: 'Ctrl+Alt+8'
    }
};

export default function TypographyStudioModal({
    isOpen,
    currentFontSize = 'standard',
    currentFontStyle = 'inter',
    onSelectFontSize,
    onSelectFontStyle,
    onApplyTypography,
    onClose
}) {
    const [selectedSize, setSelectedSize] = useState(currentFontSize);
    const [selectedStyle, setSelectedStyle] = useState(currentFontStyle);

    useEffect(() => {
        setSelectedSize(currentFontSize);
    }, [currentFontSize]);

    useEffect(() => {
        setSelectedStyle(currentFontStyle);
    }, [currentFontStyle]);

    if (!isOpen) return null;

    const styleObj = TYPOGRAPHY_FONT_STYLES[selectedStyle] || TYPOGRAPHY_FONT_STYLES['inter'];
    const sizeObj = TYPOGRAPHY_FONT_SIZES[selectedSize] || TYPOGRAPHY_FONT_SIZES['standard'];

    const handleApply = () => {
        if (onSelectFontSize) onSelectFontSize(selectedSize);
        if (onSelectFontStyle) onSelectFontStyle(selectedStyle);
        if (onApplyTypography) onApplyTypography(selectedSize, selectedStyle);
        onClose();
    };

    const handleReset = () => {
        setSelectedSize('standard');
        setSelectedStyle('inter');
        if (onSelectFontSize) onSelectFontSize('standard');
        if (onSelectFontStyle) onSelectFontStyle('inter');
        if (onApplyTypography) onApplyTypography('standard', 'inter');
    };

    return (
        <div className="modal-backdrop" id="typographyBackdrop" onClick={onClose} style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(3, 7, 18, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000
        }}>
            <div 
                className="typography-modal-container"
                id="typographyModal"
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#0b1120',
                    border: '1px solid rgba(0, 229, 255, 0.3)',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 229, 255, 0.15)',
                    borderRadius: '16px',
                    width: '680px',
                    maxWidth: '92vw',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    padding: '24px',
                    color: '#f8fafc',
                    fontFamily: "'Inter', sans-serif"
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px' }}>🔤</span>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
                                Modern Typography & Font Canvas Studio
                            </h2>
                            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, marginTop: '2px' }}>
                                Curated typography engine with live font canvas, scaling & instant website injection
                            </p>
                        </div>
                    </div>
                    <button
                        id="btnCloseTypographyModal"
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            fontSize: '18px',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '6px'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Section 1: 8 Curated Font Styles */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                        1. Select Curated Font Style (8 Styles):
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                        {Object.entries(TYPOGRAPHY_FONT_STYLES).map(([key, font]) => {
                            const isSelected = selectedStyle === key;
                            return (
                                <div
                                    key={key}
                                    id={`fontCard-${key}`}
                                    className={`font-style-card ${isSelected ? 'active' : ''}`}
                                    onClick={() => setSelectedStyle(key)}
                                    style={{
                                        background: isSelected ? 'rgba(0, 229, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                                        border: isSelected ? '1.5px solid #00e5ff' : '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '10px',
                                        padding: '12px 14px',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        boxShadow: isSelected ? '0 0 16px rgba(0, 229, 255, 0.2)' : 'none'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '16px', fontWeight: '700', fontFamily: font.fontFamily, color: isSelected ? '#00e5ff' : '#ffffff' }}>
                                            {font.name}
                                        </span>
                                        <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px', color: '#94a3b8', fontFamily: 'monospace' }}>
                                            {font.badge}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: font.fontFamily }}>
                                        {font.author}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Section 2: 4 Font Sizes */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            2. Select Font Size (Shortcuts: Ctrl + / - or Ctrl+Wheel):
                        </label>
                        <span id="typographySizeLabel" style={{ fontSize: '12px', color: '#00e5ff', fontFamily: 'monospace', fontWeight: '700' }}>
                            {sizeObj.name}
                        </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                        {Object.entries(TYPOGRAPHY_FONT_SIZES).map(([key, sz]) => {
                            const isSelected = selectedSize === key;
                            return (
                                <button
                                    key={key}
                                    id={`sizeBtn-${key}`}
                                    className={`font-size-btn ${isSelected ? 'active' : ''}`}
                                    onClick={() => setSelectedSize(key)}
                                    style={{
                                        background: isSelected ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                        border: isSelected ? '1.5px solid #00e5ff' : '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '8px',
                                        padding: '10px',
                                        color: isSelected ? '#00e5ff' : '#f8fafc',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '4px',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <span style={{ fontSize: `${sz.px}px`, fontWeight: '800' }}>Aa</span>
                                    <span style={{ fontSize: '11px', color: isSelected ? '#38bdf8' : '#94a3b8' }}>{sz.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Section 3: Live Rendering Canvas Preview */}
                <div style={{ marginBottom: '22px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                        Live Rendering Canvas Preview:
                    </label>
                    <div 
                        id="typographyPreviewCanvas"
                        className="typography-preview-canvas"
                        style={{
                            padding: '18px 22px',
                            borderRadius: '12px',
                            background: 'rgba(0, 0, 0, 0.45)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            maxHeight: '170px',
                            overflowY: 'auto',
                            fontFamily: styleObj.fontFamily,
                            fontSize: `${sizeObj.px}px`,
                            lineHeight: sizeObj.lineHeight,
                            letterSpacing: styleObj.letterSpacing,
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div id="previewHeadline" style={{ fontSize: `${Math.round(sizeObj.px * 1.35)}px`, fontWeight: '700', color: '#ffffff', marginBottom: '6px' }}>
                            The Evolution of Modern Web Typography
                        </div>
                        <div id="previewMeta" style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px' }}>
                            Published by Web Standards Review • 4 min read • Active Font: {styleObj.name}
                        </div>
                        <p id="previewParagraph" style={{ color: '#cbd5e1', margin: 0 }}>
                            Typography on the modern web balances aesthetic minimalism with effortless legibility. When line height and optical letter spacing harmonize, long-form reading feels natural rather than computerized.
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <button 
                        id="btnResetTypography"
                        onClick={handleReset}
                        style={{
                            padding: '9px 16px',
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            color: '#f87171',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        ↺ Reset Default
                    </button>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                            id="btnCloseTypographyBtn"
                            onClick={onClose}
                            style={{
                                padding: '9px 18px',
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                color: '#cbd5e1',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </button>
                        <button 
                            id="btnApplyTypography"
                            onClick={handleApply}
                            style={{
                                padding: '9px 20px',
                                background: 'linear-gradient(135deg, #00e5ff 0%, #0284c7 100%)',
                                border: 'none',
                                color: '#070b14',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                boxShadow: '0 0 16px rgba(0, 229, 255, 0.35)'
                            }}
                        >
                            ✅ Apply to Browser
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
