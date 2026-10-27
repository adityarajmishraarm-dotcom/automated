import React, { useState, useEffect, useRef } from 'react';
import { getCustomElement } from '../services/elementCustomizerService.js';
import ErrorBoundary from './ErrorBoundary.jsx';

export default function CustomizableElementWrapper({
    elementId,
    isEditMode = false,
    onOpenElementEditor,
    onAction,
    children,
    className = '',
    style = {}
}) {
    const [customData, setCustomData] = useState(() => getCustomElement(elementId));
    const containerRef = useRef(null);

    // Listen for real-time compilation or revert events
    useEffect(() => {
        const handleUpdate = (e) => {
            if (!e.detail || e.detail.elementId === elementId) {
                setCustomData(getCustomElement(elementId));
            }
        };

        const handleReset = () => {
            setCustomData(getCustomElement(elementId));
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('antigravity-element-updated', handleUpdate);
            window.addEventListener('antigravity-all-elements-reset', handleReset);
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('antigravity-element-updated', handleUpdate);
                window.removeEventListener('antigravity-all-elements-reset', handleReset);
            }
        };
    }, [elementId]);

    const isCustomActive = Boolean(customData && customData.isCustom);

    // Scoped CSS management in document.head (keeps React DOM tree 100% clean & prevents removeChild crash)
    useEffect(() => {
        if (typeof document === 'undefined') return;

        const headStyleId = `antigravity-scoped-css-${elementId}`;
        let tag = document.getElementById(headStyleId);

        if (isCustomActive && customData && customData.scopedCss) {
            if (!tag) {
                tag = document.createElement('style');
                tag.id = headStyleId;
                document.head.appendChild(tag);
            }
            tag.textContent = customData.scopedCss;
        } else {
            if (tag && tag.parentNode) {
                tag.parentNode.removeChild(tag);
            }
        }

        return () => {
            const cleanupTag = document.getElementById(headStyleId);
            if (cleanupTag && cleanupTag.parentNode) {
                cleanupTag.parentNode.removeChild(cleanupTag);
            }
        };
    }, [elementId, isCustomActive, customData?.scopedCss]);

    // Handle delegated interactions from custom HTML markup
    useEffect(() => {
        if (!customData || !customData.isCustom || !containerRef.current) return;

        const container = containerRef.current;

        const handleClick = (e) => {
            const actionEl = e.target.closest('[data-action]');
            if (actionEl && onAction) {
                const action = actionEl.getAttribute('data-action');
                const input = container.querySelector('input');
                const val = input ? input.value : '';
                onAction(action, { val, event: e });
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                const input = e.target.closest('input');
                if (input && onAction) {
                    onAction('navigate', { val: input.value, event: e });
                }
            }
        };

        container.addEventListener('click', handleClick);
        container.addEventListener('keydown', handleKeyDown);

        return () => {
            container.removeEventListener('click', handleClick);
            container.removeEventListener('keydown', handleKeyDown);
        };
    }, [customData, onAction]);

    return (
        <ErrorBoundary fallback={children}>
            <div
                id={`custom-element-${elementId}`}
                ref={containerRef}
                className={`customizable-element-wrapper wrapper-${elementId} ${isEditMode ? 'edit-mode-active' : ''} ${className}`}
                style={style}
                title={isEditMode ? `Click to edit ${customData?.title || elementId} code in Code Studio` : undefined}
                onClick={(e) => {
                    if (isEditMode && onOpenElementEditor) {
                        e.stopPropagation();
                        e.preventDefault();
                        onOpenElementEditor(elementId);
                    }
                }}
                onDoubleClick={(e) => {
                    if (isEditMode && onOpenElementEditor) {
                        e.stopPropagation();
                        e.preventDefault();
                        onOpenElementEditor(elementId);
                    }
                }}
            >

                {/* Render Custom HTML or Fallback React Children with distinct keys to guarantee zero VDOM collision */}
                {isCustomActive ? (
                    <div 
                        key={`custom-mount-${elementId}`}
                        className="custom-rendered-element"
                        dangerouslySetInnerHTML={{ __html: customData?.html || '' }}
                    />
                ) : (
                    <div key={`native-mount-${elementId}`} className="native-rendered-content" style={{ width: '100%' }}>
                        {children}
                    </div>
                )}
            </div>
        </ErrorBoundary>
    );
}
