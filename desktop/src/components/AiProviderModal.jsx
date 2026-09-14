import React, { useState, useEffect } from 'react';
import {
    getAiProvidersConfig,
    saveAiProvidersConfig,
    getActiveProviderId,
    setActiveProviderId,
    testConnection,
    DEFAULT_PROVIDERS
} from '../services/aiProviderService.js';

export default function AiProviderModal({
    isOpen,
    onClose,
    onCaptureSnapshot,
    latestSnapshot
}) {
    const [configs, setConfigs] = useState(() => getAiProvidersConfig());
    const [selectedProviderId, setSelectedProviderId] = useState(() => getActiveProviderId());
    const [activeProviderId, setActiveId] = useState(() => getActiveProviderId());
    const [showApiKey, setShowApiKey] = useState(false);
    const [testStatus, setTestStatus] = useState(null); // { loading, success, message, latencyMs }
    const [saveFeedback, setSaveFeedback] = useState(false);
    const [vlmSnapshotResult, setVlmSnapshotResult] = useState(latestSnapshot || null);
    const [isCapturingVlm, setIsCapturingVlm] = useState(false);
    const [snapshotTarget, setSnapshotTarget] = useState('webview'); // 'webview' | 'window'

    useEffect(() => {
        if (isOpen) {
            setConfigs(getAiProvidersConfig());
            const actId = getActiveProviderId();
            setActiveId(actId);
            setSelectedProviderId(actId);
            setTestStatus(null);
            setSaveFeedback(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (latestSnapshot) {
            setVlmSnapshotResult(latestSnapshot);
        }
    }, [latestSnapshot]);

    if (!isOpen) return null;

    const currentConfig = configs[selectedProviderId] || DEFAULT_PROVIDERS[selectedProviderId];

    const handleUpdateField = (field, value) => {
        setConfigs(prev => ({
            ...prev,
            [selectedProviderId]: {
                ...prev[selectedProviderId],
                [field]: value
            }
        }));
    };

    const handleResetDefaultUrl = () => {
        const def = DEFAULT_PROVIDERS[selectedProviderId];
        if (def) {
            handleUpdateField('baseUrl', def.baseUrl);
        }
    };

    const handleSelectPresetModel = (modelName) => {
        handleUpdateField('model', modelName);
    };

    const handleSetActive = () => {
        setActiveId(selectedProviderId);
        setActiveProviderId(selectedProviderId);
    };

    const handleRunTest = async () => {
        setTestStatus({ loading: true });
        const res = await testConnection(selectedProviderId, currentConfig);
        if (res.success) {
            setTestStatus({
                loading: false,
                success: true,
                latencyMs: res.latencyMs,
                message: `Connected successfully (${res.latencyMs}ms)`
            });
        } else {
            setTestStatus({
                loading: false,
                success: false,
                message: res.error || 'Connection failed'
            });
        }
    };

    const handleSaveAndApply = () => {
        saveAiProvidersConfig(configs);
        setActiveProviderId(activeProviderId);
        setSaveFeedback(true);
        setTimeout(() => {
            setSaveFeedback(false);
            onClose();
        }, 600);
    };

    const handleTriggerModalSnapshot = async () => {
        if (!onCaptureSnapshot) return;
        setIsCapturingVlm(true);
        try {
            const res = await onCaptureSnapshot(snapshotTarget);
            if (res && res.success) {
                setVlmSnapshotResult(res);
            }
        } catch (e) {
            console.error('[VLM Snapshot Test Error]', e);
        } finally {
            setIsCapturingVlm(false);
        }
    };

    const providerList = Object.values(configs);

    return (
        <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 100000 }}>
            <div
                className="modal-container"
                style={{
                    width: '840px',
                    maxWidth: '94vw',
                    height: '80vh',
                    maxHeight: '680px',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 0,
                    background: 'rgba(11, 17, 33, 0.96)',
                    backdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '16px',
                    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)',
                    color: '#e2e8f0',
                    overflow: 'hidden'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '16px 22px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'rgba(255, 255, 255, 0.02)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>⚡</span>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f8fafc' }}>
                                AI Provider & Key Management
                            </h3>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                Configure LLM & VLM endpoints for vision reasoning, natural language commands, and autonomous browsing
                            </span>
                        </div>
                    </div>
                    <button
                        className="modal-close-btn"
                        onClick={onClose}
                        title="Close"
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

                {/* Main Content: Sidebar + Detail Panel */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* Left Sidebar: Providers List */}
                    <div
                        style={{
                            width: '240px',
                            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                            background: 'rgba(7, 11, 20, 0.5)',
                            padding: '12px 8px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                        }}
                    >
                        <div style={{ padding: '4px 10px', fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            Supported Providers
                        </div>

                        {providerList.map((prov) => {
                            const isSelected = prov.id === selectedProviderId;
                            const isActive = prov.id === activeProviderId;
                            const hasKeyOrLocal = prov.apiKey || prov.id === 'lmstudio' || prov.id === 'ollama';

                            return (
                                <button
                                    key={prov.id}
                                    onClick={() => {
                                        setSelectedProviderId(prov.id);
                                        setTestStatus(null);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        border: isSelected ? '1px solid rgba(0, 229, 255, 0.35)' : '1px solid transparent',
                                        background: isSelected ? 'rgba(0, 229, 255, 0.12)' : 'transparent',
                                        color: isSelected ? '#f8fafc' : '#94a3b8',
                                        fontSize: '13px',
                                        fontWeight: isSelected ? 600 : 400,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: isActive ? '#00e5ff' : (hasKeyOrLocal ? '#10b981' : '#475569'),
                                            boxShadow: isActive ? '0 0 8px #00e5ff' : 'none'
                                        }} />
                                        <span>{prov.name}</span>
                                    </div>
                                    {isActive && (
                                        <span style={{
                                            fontSize: '9px',
                                            fontWeight: 700,
                                            background: '#00e5ff',
                                            color: '#070b14',
                                            padding: '1px 5px',
                                            borderRadius: '4px',
                                            textTransform: 'uppercase'
                                        }}>
                                            Active
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Right Detail Panel */}
                    <div
                        style={{
                            flex: 1,
                            padding: '20px 24px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '18px'
                        }}
                    >
                        {/* Provider Active Banner / Toggle */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 16px',
                                borderRadius: '10px',
                                background: currentConfig.id === activeProviderId ? 'rgba(0, 229, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                                border: currentConfig.id === activeProviderId ? '1px solid rgba(0, 229, 255, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)'
                            }}
                        >
                            <div>
                                <div style={{ fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>
                                    {currentConfig.name}
                                </div>
                                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                    {currentConfig.id === activeProviderId
                                        ? 'Currently designated as primary AI engine for browser commands and VLM queries.'
                                        : 'Click to make this the active provider for AI commands.'}
                                </div>
                            </div>
                            <button
                                onClick={handleSetActive}
                                disabled={currentConfig.id === activeProviderId}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: currentConfig.id === activeProviderId ? '#10b981' : 'rgba(0, 229, 255, 0.2)',
                                    color: currentConfig.id === activeProviderId ? '#ffffff' : '#00e5ff',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: currentConfig.id === activeProviderId ? 'default' : 'pointer'
                                }}
                            >
                                {currentConfig.id === activeProviderId ? '✓ Active Provider' : 'Set as Active'}
                            </button>
                        </div>

                        {/* Base URL Field */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>
                                    Base Endpoint URL
                                </label>
                                <button
                                    onClick={handleResetDefaultUrl}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#38bdf8',
                                        fontSize: '11px',
                                        cursor: 'pointer',
                                        padding: 0
                                    }}
                                >
                                    Reset to Default
                                </button>
                            </div>
                            <input
                                type="text"
                                value={currentConfig.baseUrl || ''}
                                onChange={(e) => handleUpdateField('baseUrl', e.target.value)}
                                placeholder="e.g. http://localhost:1234/v1 or https://api.openai.com/v1"
                                style={{
                                    width: '100%',
                                    padding: '9px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    background: 'rgba(15, 23, 42, 0.6)',
                                    color: '#f8fafc',
                                    fontSize: '13px',
                                    fontFamily: 'monospace',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        {/* API Key Field */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>
                                    API Key {currentConfig.id === 'lmstudio' || currentConfig.id === 'ollama' ? '(Optional for local)' : '(Required)'}
                                </label>
                                <button
                                    onClick={() => setShowApiKey(prev => !prev)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#94a3b8',
                                        fontSize: '11px',
                                        cursor: 'pointer',
                                        padding: 0
                                    }}
                                >
                                    {showApiKey ? 'Hide Key' : 'Show Key'}
                                </button>
                            </div>
                            <input
                                type={showApiKey ? 'text' : 'password'}
                                value={currentConfig.apiKey || ''}
                                onChange={(e) => handleUpdateField('apiKey', e.target.value)}
                                placeholder={currentConfig.id === 'anthropic' ? 'sk-ant-api03-...' : (currentConfig.id === 'openrouter' ? 'sk-or-v1-...' : 'sk-... or enter your key')}
                                style={{
                                    width: '100%',
                                    padding: '9px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    background: 'rgba(15, 23, 42, 0.6)',
                                    color: '#f8fafc',
                                    fontSize: '13px',
                                    fontFamily: 'monospace',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        {/* Model Name & Presets */}
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                                Model Name
                            </label>
                            <input
                                type="text"
                                value={currentConfig.model || ''}
                                onChange={(e) => handleUpdateField('model', e.target.value)}
                                placeholder="e.g. gpt-4o, claude-3-5-sonnet, llama3.2-vision"
                                style={{
                                    width: '100%',
                                    padding: '9px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    background: 'rgba(15, 23, 42, 0.6)',
                                    color: '#f8fafc',
                                    fontSize: '13px',
                                    boxSizing: 'border-box'
                                }}
                            />
                            {/* Model Quick Presets */}
                            {currentConfig.presetModels && currentConfig.presetModels.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                                    <span style={{ fontSize: '11px', color: '#64748b', alignSelf: 'center' }}>Presets:</span>
                                    {currentConfig.presetModels.map(m => (
                                        <button
                                            key={m}
                                            onClick={() => handleSelectPresetModel(m)}
                                            style={{
                                                padding: '3px 8px',
                                                borderRadius: '4px',
                                                border: currentConfig.model === m ? '1px solid #00e5ff' : '1px solid rgba(255, 255, 255, 0.08)',
                                                background: currentConfig.model === m ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                                color: currentConfig.model === m ? '#00e5ff' : '#94a3b8',
                                                fontSize: '11px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Connection Test Action */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                            <button
                                onClick={handleRunTest}
                                disabled={testStatus?.loading}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    color: '#f8fafc',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: testStatus?.loading ? 'wait' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                {testStatus?.loading ? '⏳ Pinging Endpoint...' : '⚡ Test Connection'}
                            </button>

                            {testStatus && !testStatus.loading && (
                                <span style={{
                                    fontSize: '12px',
                                    color: testStatus.success ? '#10b981' : '#ef4444',
                                    fontWeight: 500
                                }}>
                                    {testStatus.success ? '🟢' : '🔴'} {testStatus.message}
                                </span>
                            )}
                        </div>

                        {/* VLM Screenshot Tester Section */}
                        <div
                            style={{
                                marginTop: '10px',
                                padding: '14px 16px',
                                borderRadius: '10px',
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid rgba(255, 255, 255, 0.06)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                                        📸 VLM Visual Comprehension Tester
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                        Capture the live browser webview to disk and expose the absolute file path for Vision Models
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <select
                                        value={snapshotTarget}
                                        onChange={(e) => setSnapshotTarget(e.target.value)}
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                            background: '#070b14',
                                            color: '#f8fafc',
                                            fontSize: '11px'
                                        }}
                                    >
                                        <option value="webview">Guest Webview (Page)</option>
                                        <option value="window">Full Window (Chrome + Page)</option>
                                    </select>
                                    <button
                                        onClick={handleTriggerModalSnapshot}
                                        disabled={isCapturingVlm}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            background: '#00e5ff',
                                            color: '#070b14',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            cursor: isCapturingVlm ? 'wait' : 'pointer'
                                        }}
                                    >
                                        {isCapturingVlm ? 'Capturing...' : 'Capture Snapshot'}
                                    </button>
                                </div>
                            </div>

                            {vlmSnapshotResult && vlmSnapshotResult.path && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '8px 10px',
                                    borderRadius: '6px',
                                    background: 'rgba(0, 0, 0, 0.3)',
                                    border: '1px solid rgba(0, 229, 255, 0.2)'
                                }}>
                                    {vlmSnapshotResult.dataUrl && (
                                        <img
                                            src={vlmSnapshotResult.dataUrl}
                                            alt="Preview"
                                            style={{
                                                width: '64px',
                                                height: '40px',
                                                objectFit: 'cover',
                                                borderRadius: '4px',
                                                border: '1px solid rgba(255, 255, 255, 0.1)'
                                            }}
                                        />
                                    )}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 700 }}>
                                            ✓ Saved to disk ({vlmSnapshotResult.width}x{vlmSnapshotResult.height})
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '11px',
                                                fontFamily: 'monospace',
                                                color: '#e2e8f0',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}
                                            title={vlmSnapshotResult.path}
                                        >
                                            {vlmSnapshotResult.path}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (navigator.clipboard) {
                                                navigator.clipboard.writeText(vlmSnapshotResult.path);
                                            }
                                        }}
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            color: '#cbd5e1',
                                            fontSize: '10px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Copy Path
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div
                    style={{
                        padding: '14px 22px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'rgba(7, 11, 20, 0.7)'
                    }}
                >
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Active Provider: <strong style={{ color: '#00e5ff' }}>{configs[activeProviderId]?.name || 'OpenAI'}</strong> ({configs[activeProviderId]?.model || 'default'})
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                background: 'transparent',
                                color: '#94a3b8',
                                fontSize: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveAndApply}
                            style={{
                                padding: '8px 20px',
                                borderRadius: '6px',
                                border: 'none',
                                background: saveFeedback ? '#10b981' : '#00e5ff',
                                color: '#070b14',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            {saveFeedback ? '✓ Saved!' : 'Save & Apply'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
