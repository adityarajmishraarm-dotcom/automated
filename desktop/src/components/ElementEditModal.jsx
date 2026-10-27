import React, { useState, useEffect, useRef } from 'react';
import {
    getCustomElement,
    getPrebuiltTemplate,
    listRegisteredElements,
    compileElementCode,
    saveCustomElement,
    revertElement,
    exportComponentPackage,
    parseUploadedComponentPackage
} from '../services/elementCustomizerService.js';

export default function ElementEditModal({
    isOpen = true,
    elementId,
    onClose,
    onUpdated
}) {
    const [currentElementId, setCurrentElementId] = useState(elementId || 'element_ntp_search_bar');
    const [allElements, setAllElements] = useState([]);
    const [activeTab, setActiveTab] = useState('html'); // 'html' | 'css' | 'preview'
    const [htmlCode, setHtmlCode] = useState('');
    const [cssCode, setCssCode] = useState('');
    const [elementInfo, setElementInfo] = useState(null);
    const [isCustom, setIsCustom] = useState(false);
    const [compileStatus, setCompileStatus] = useState({ status: 'idle', message: 'Ready to compile' });
    const [toastMessage, setToastMessage] = useState('');
    const fileInputRef = useRef(null);

    // Sync current element when elementId prop changes
    useEffect(() => {
        if (elementId) {
            setCurrentElementId(elementId);
        }
    }, [elementId]);

    // Load available element list on mount
    useEffect(() => {
        try {
            setAllElements(listRegisteredElements());
        } catch (e) {}
    }, []);

    // Load element data whenever modal opens or currentElementId changes
    useEffect(() => {
        if (isOpen && currentElementId) {
            const data = getCustomElement(currentElementId);
            if (data) {
                setElementInfo(data);
                setHtmlCode(data.html || '');
                setCssCode(data.css || '');
                setIsCustom(Boolean(data.isCustom));
                setCompileStatus({ status: 'idle', message: data.isCustom ? 'Active user override loaded' : 'Factory prebuilt template loaded' });
            }
        }
    }, [isOpen, currentElementId]);

    // Handle ESC key to close modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 3000);
    };

    if (!isOpen || !currentElementId) return null;

    const handleCompileAndApply = () => {
        const compileRes = compileElementCode(currentElementId, htmlCode, cssCode);
        if (!compileRes.success) {
            setCompileStatus({ status: 'error', message: compileRes.error });
            return;
        }

        const saveRes = saveCustomElement(currentElementId, { html: htmlCode, css: cssCode });
        if (saveRes.success) {
            setIsCustom(true);
            setCompileStatus({ status: 'success', message: 'Element compiled and hot-swapped successfully!' });
            showToast('✅ Applied! Element hot-swapped.');
            if (onUpdated) onUpdated(currentElementId);
        } else {
            setCompileStatus({ status: 'error', message: saveRes.error });
        }
    };

    const handleRevertToDefault = () => {
        const prebuilt = getPrebuiltTemplate(currentElementId);
        if (!prebuilt) return;

        const revRes = revertElement(currentElementId);
        if (revRes.success) {
            setHtmlCode(prebuilt.html);
            setCssCode(prebuilt.css);
            setIsCustom(false);
            setCompileStatus({ status: 'success', message: 'Reverted to factory default prebuilt code.' });
            showToast('↺ Restored to factory default design!');
            if (onUpdated) onUpdated(currentElementId);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            const parsed = parseUploadedComponentPackage(content);
            if (parsed.success) {
                if (parsed.html) setHtmlCode(parsed.html);
                if (parsed.css) setCssCode(parsed.css);
                setCompileStatus({ status: 'idle', message: `Imported "${file.name}" cleanly. Ready to compile.` });
                showToast(`📁 Loaded "${file.name}"! Click Compile to apply.`);
            } else {
                setCompileStatus({ status: 'error', message: parsed.error });
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleExportPackage = () => {
        const pkg = exportComponentPackage(currentElementId);
        if (!pkg) return;

        try {
            const blob = new Blob([pkg], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${currentElementId}.component.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('💾 Exported component package to downloads!');
        } catch (e) {
            navigator.clipboard.writeText(pkg).then(() => {
                showToast('📋 Component code copied to clipboard!');
            });
        }
    };

    // Scoped live preview CSS
    const previewScopedCss = compileElementCode(currentElementId, htmlCode, cssCode).scopedCss || '';

    return (
        <div className="element-edit-modal-backdrop" onClick={onClose}>
            <div 
                className="element-edit-modal-container"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="element-edit-header">
                    <div className="element-title-cluster">
                        <span className="element-header-icon">🛠️</span>
                        <div>
                            <div className="element-main-title">
                                {elementInfo ? elementInfo.title : 'Element Code Studio'}
                            </div>
                            <div className="element-meta-id">
                                <select 
                                    className="element-switcher-select"
                                    value={currentElementId}
                                    onChange={(e) => setCurrentElementId(e.target.value)}
                                    title="Switch element to edit"
                                >
                                    {allElements.map(el => (
                                        <option key={el.id} value={el.id}>
                                            {el.id === 'element_ntp_clock' ? '⏱️ ///// time code (Clock & Greeting)' :
                                             el.id === 'element_ntp_search_bar' ? '🔍 ///// search code (Search Bar)' :
                                             el.id === 'element_speed_dial' ? '⚡ ///// shortcuts code (Speed Dial)' :
                                             el.id === 'element_tab_pill' ? '📑 ///// tab code (Tab Strip Pill)' :
                                             el.id === 'element_nav_buttons' ? '‹› ///// nav buttons code (Back/Forward/Reload)' :
                                             el.id === 'element_engine_toggle' ? '🦁 ///// engine toggle code (Engine Switcher)' :
                                             el.id === 'element_omnibox' ? '🔒 ///// omnibox code (URL Address Bar)' :
                                             el.id === 'element_go_btn' ? '🚀 ///// go button code (Go Button)' :
                                             el.id === 'element_toolbar_tools' ? '🎨 ///// toolbar tools code (Toolbar Tools)' :
                                             el.id === 'element_bookmark_pill' ? '🔖 ///// bookmark code (Bookmark Bar Pill)' :
                                             el.id === 'element_ai_prompt_bar' ? '✦ ///// ai prompt code (AI Prompt Bar)' :
                                             `${el.title} (${el.category})`}
                                        </option>
                                    ))}
                                </select>
                                &nbsp;•&nbsp;
                                <span className={`status-pill-badge ${isCustom ? 'custom-active' : 'prebuilt-default'}`}>
                                    {isCustom ? '★ User Override Active' : '🔒 Factory Default'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="header-actions">
                        <button 
                            className="btn-toolbar-tool"
                            title="Upload custom component file (.html, .component.html, .json)"
                            onClick={() => fileInputRef.current && fileInputRef.current.click()}
                        >
                            📁 Upload Code
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            style={{ display: 'none' }} 
                            accept=".html,.htm,.css,.json,.jsx"
                            onChange={handleFileUpload} 
                        />

                        <button 
                            className="btn-toolbar-tool"
                            title="Export this component package to file"
                            onClick={handleExportPackage}
                        >
                            💾 Export
                        </button>

                        <button className="btn-close-modal" onClick={onClose} title="Close Editor (ESC)">
                            ✕
                        </button>
                    </div>
                </div>

                {/* Sub-Header Navigation Tabs */}
                <div className="element-edit-tabs">
                    <button 
                        className={`edit-tab-btn ${activeTab === 'html' ? 'active' : ''}`}
                        onClick={() => setActiveTab('html')}
                    >
                        📄 HTML5 Markup
                    </button>
                    <button 
                        className={`edit-tab-btn ${activeTab === 'css' ? 'active' : ''}`}
                        onClick={() => setActiveTab('css')}
                    >
                        🎨 Scoped CSS
                    </button>
                    <button 
                        className={`edit-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('preview')}
                    >
                        👁️ Live Preview
                    </button>

                    {toastMessage && (
                        <div className="element-edit-toast">
                            {toastMessage}
                        </div>
                    )}
                </div>

                {/* The Big Box: Code Editor & Preview Canvas */}
                <div className="element-edit-body">
                    {activeTab === 'html' && (
                        <div className="code-editor-pane">
                            <div className="editor-banner-hint">
                                Isolated HTML5 template for this element. Supports standard semantic tags and <code>data-action="navigate|submit|back"</code>.
                            </div>
                            <textarea
                                className="big-box-textarea"
                                spellCheck="false"
                                value={htmlCode}
                                onChange={(e) => setHtmlCode(e.target.value)}
                                placeholder="Enter custom HTML5 markup here..."
                            />
                        </div>
                    )}

                    {activeTab === 'css' && (
                        <div className="code-editor-pane">
                            <div className="editor-banner-hint">
                                Scoped CSS rules automatically prefixed to <code>#custom-element-{currentElementId}</code> so styles never bleed into other components.
                            </div>
                            <textarea
                                className="big-box-textarea"
                                spellCheck="false"
                                value={cssCode}
                                onChange={(e) => setCssCode(e.target.value)}
                                placeholder="Enter custom CSS styles here..."
                            />
                        </div>
                    )}

                    {activeTab === 'preview' && (
                        <div className="preview-canvas-pane">
                            <style>{previewScopedCss}</style>
                            <div className="preview-label">Live Element Render Sandbox:</div>
                            <div 
                                id={`custom-element-${currentElementId}`} 
                                className="preview-sandbox-mount"
                                dangerouslySetInnerHTML={{ __html: htmlCode }}
                            />
                        </div>
                    )}
                </div>

                {/* Compiler Diagnostics Bar */}
                <div className={`compiler-status-bar status-${compileStatus.status}`}>
                    <span className="compiler-status-icon">
                        {compileStatus.status === 'success' ? '✅' : (compileStatus.status === 'error' ? '❌' : 'ℹ️')}
                    </span>
                    <span className="compiler-status-text">
                        {compileStatus.message}
                    </span>
                </div>

                {/* Action Footer */}
                <div className="element-edit-footer">
                    <button 
                        className="btn-danger-revert"
                        title="Discard customizations and restore original factory prebuilt code"
                        onClick={handleRevertToDefault}
                    >
                        ↺ Revert to Default
                    </button>

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                        <button className="btn-secondary-cancel" onClick={onClose}>
                            Cancel
                        </button>
                        <button 
                            className="btn-primary-compile"
                            onClick={handleCompileAndApply}
                        >
                            ⚡ Compile & Apply
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
