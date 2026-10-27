import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    getAiProvidersConfig,
    saveAiProvidersConfig,
    getActiveProviderId,
    setActiveProviderId,
    testConnection,
    fetchAvailableModels,
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

    // Model Setup & Add Model State
    const [newModelInput, setNewModelInput] = useState('');
    const [detectedModels, setDetectedModels] = useState([]);
    const [isScanningModels, setIsScanningModels] = useState(false);
    const [showAddProviderForm, setShowAddProviderForm] = useState(false);
    const [customProviderDraft, setCustomProviderDraft] = useState({
        name: '',
        model: '',
        baseUrl: 'http://localhost:11434/v1',
        apiKey: '',
        type: 'openai_compatible'
    });

    useEffect(() => {
        if (isOpen) {
            const loaded = getAiProvidersConfig();
            setConfigs(loaded);
            const actId = getActiveProviderId();
            const validId = loaded[actId] ? actId : (loaded.ollama ? 'ollama' : Object.keys(loaded)[0]);
            setActiveId(validId);
            setSelectedProviderId(validId);
            setTestStatus(null);
            setSaveFeedback(false);
            setShowAddProviderForm(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (latestSnapshot) {
            setVlmSnapshotResult(latestSnapshot);
        }
    }, [latestSnapshot]);

    const currentConfig = configs[selectedProviderId]
        || DEFAULT_PROVIDERS[selectedProviderId]
        || Object.values(configs)[0]
        || DEFAULT_PROVIDERS.ollama;

    // Auto-scan installed models when opening or switching to local/OpenAI-compatible providers
    useEffect(() => {
        if (!isOpen || !currentConfig) return;
        let cancelled = false;
        setDetectedModels([]);
        if (currentConfig.type !== 'anthropic' && currentConfig.baseUrl) {
            setIsScanningModels(true);
            fetchAvailableModels(currentConfig).then(res => {
                if (!cancelled) {
                    setIsScanningModels(false);
                    if (res.success && res.models.length > 0) {
                        setDetectedModels(res.models);
                    }
                }
            }).catch(() => {
                if (!cancelled) setIsScanningModels(false);
            });
        }
        return () => { cancelled = true; };
    }, [isOpen, selectedProviderId, currentConfig?.baseUrl]);

    // Auto-heal OpenCode Zen URL if stale
    useEffect(() => {
        if (currentConfig?.id === 'opencodezen' && currentConfig.baseUrl && (currentConfig.baseUrl.includes('opencodezen.com') || currentConfig.baseUrl.includes('api.opencodezen'))) {
            handleUpdateField('baseUrl', 'https://opencode.ai/zen/v1');
        }
    }, [currentConfig?.id, currentConfig?.baseUrl]);

    if (!isOpen) return null;

    const handleUpdateField = (field, value) => {
        const targetId = currentConfig.id;
        setConfigs(prev => {
            const next = {
                ...prev,
                [targetId]: {
                    ...(prev[targetId] || currentConfig),
                    [field]: value
                }
            };
            saveAiProvidersConfig(next);
            return next;
        });
    };

    const handleResetDefaultUrl = () => {
        const def = DEFAULT_PROVIDERS[currentConfig.id];
        if (def) {
            handleUpdateField('baseUrl', def.baseUrl);
        }
    };

    const handleSelectPresetModel = (modelName) => {
        if (!modelName) return;
        const targetId = currentConfig.id;
        const existingPresets = Array.isArray(currentConfig.presetModels) ? currentConfig.presetModels : [];
        const updatedPresets = Array.from(new Set([modelName, ...existingPresets]));
        setConfigs(prev => {
            const next = {
                ...prev,
                [targetId]: {
                    ...(prev[targetId] || currentConfig),
                    model: modelName,
                    presetModels: updatedPresets
                }
            };
            saveAiProvidersConfig(next);
            return next;
        });
        window.dispatchEvent(new CustomEvent('antigravity-active-provider-changed', {
            detail: { providerId: targetId, config: { ...currentConfig, model: modelName, presetModels: updatedPresets } }
        }));
    };

    const handleAddModel = () => {
        const trimmed = (newModelInput || '').trim();
        if (!trimmed) return;
        const targetId = currentConfig.id;
        const existingPresets = Array.isArray(currentConfig.presetModels) ? currentConfig.presetModels : [];
        const updatedPresets = Array.from(new Set([trimmed, ...existingPresets]));
        setConfigs(prev => {
            const next = {
                ...prev,
                [targetId]: {
                    ...(prev[targetId] || currentConfig),
                    model: trimmed,
                    presetModels: updatedPresets
                }
            };
            saveAiProvidersConfig(next);
            return next;
        });
        setNewModelInput('');
    };

    const handleRemoveModel = (modelToRemove, e) => {
        if (e) e.stopPropagation();
        const targetId = currentConfig.id;
        const existingPresets = Array.isArray(currentConfig.presetModels) ? currentConfig.presetModels : [];
        const updatedPresets = existingPresets.filter(m => m !== modelToRemove);
        const nextModel = currentConfig.model === modelToRemove
            ? (updatedPresets[0] || '')
            : currentConfig.model;
        setConfigs(prev => {
            const next = {
                ...prev,
                [targetId]: {
                    ...(prev[targetId] || currentConfig),
                    model: nextModel,
                    presetModels: updatedPresets
                }
            };
            saveAiProvidersConfig(next);
            return next;
        });
    };

    const handleScanModels = async (overrideConfig = null) => {
        const configToScan = overrideConfig || currentConfig;
        setIsScanningModels(true);
        const res = await fetchAvailableModels(configToScan);
        setIsScanningModels(false);
        if (res.success && res.models.length > 0) {
            setDetectedModels(res.models);
            const targetId = configToScan.id;
            const existingPresets = Array.isArray(configToScan.presetModels) ? configToScan.presetModels : [];
            const mergedModels = Array.from(new Set([...existingPresets, ...res.models.slice(0, 15)]));
            const nextActiveModel = configToScan.model && res.models.includes(configToScan.model)
                ? configToScan.model
                : (res.models[0] || '');
            setConfigs(prev => {
                const next = {
                    ...prev,
                    [targetId]: {
                        ...(prev[targetId] || configToScan),
                        model: nextActiveModel,
                        presetModels: mergedModels
                    }
                };
                saveAiProvidersConfig(next);
                return next;
            });
            setTestStatus({
                loading: false,
                success: true,
                message: `Loaded ${res.models.length} model(s) from endpoint. Select your model below!`
            });
        } else {
            setTestStatus({
                loading: false,
                success: false,
                message: res.error || 'No models detected at this endpoint. Please check URL and API Key.'
            });
        }
    };

    const handleCreateCustomProvider = () => {
        const name = (customProviderDraft.name || '').trim() || `Custom Model (${customProviderDraft.model || 'Local'})`;
        const model = (customProviderDraft.model || '').trim() || 'gpt-oss:20b';
        const baseUrl = (customProviderDraft.baseUrl || '').trim() || 'http://localhost:11434/v1';
        const id = 'custom_' + Date.now();
        const newEntry = {
            id,
            name,
            type: customProviderDraft.type || 'openai_compatible',
            baseUrl,
            apiKey: (customProviderDraft.apiKey || '').trim(),
            model,
            presetModels: [model],
            isCustom: true
        };
        const nextConfigs = { ...configs, [id]: newEntry };
        setConfigs(nextConfigs);
        saveAiProvidersConfig(nextConfigs);
        setSelectedProviderId(id);
        setActiveId(id);
        setActiveProviderId(id);
        setShowAddProviderForm(false);
        setCustomProviderDraft({
            name: '',
            model: '',
            baseUrl: 'http://localhost:11434/v1',
            apiKey: '',
            type: 'openai_compatible'
        });
    };

    const handleDeleteCustomProvider = (idToDelete, e) => {
        if (e) e.stopPropagation();
        const nextConfigs = { ...configs };
        delete nextConfigs[idToDelete];
        setConfigs(nextConfigs);
        saveAiProvidersConfig(nextConfigs);
        const fallbackId = nextConfigs.ollama ? 'ollama' : Object.keys(nextConfigs)[0];
        if (selectedProviderId === idToDelete) setSelectedProviderId(fallbackId);
        if (activeProviderId === idToDelete) {
            setActiveId(fallbackId);
            setActiveProviderId(fallbackId);
        }
    };

    const handleSetActive = () => {
        setActiveId(currentConfig.id);
        setActiveProviderId(currentConfig.id);
        saveAiProvidersConfig(configs);
    };

    const handleRunTest = async () => {
        setTestStatus({ loading: true });
        const res = await testConnection(currentConfig.id, currentConfig);
        if (res.success) {
            if (Array.isArray(res.models) && res.models.length > 0) {
                setDetectedModels(res.models);
            }
            setTestStatus({
                loading: false,
                success: true,
                latencyMs: res.latencyMs,
                message: `Connected successfully (${res.latencyMs}ms)${res.models?.length ? ` · ${res.models.length} models ready` : ''}`
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
        const finalActiveId = activeProviderId || selectedProviderId || 'lmstudio';
        setActiveProviderId(finalActiveId);
        window.dispatchEvent(new CustomEvent('antigravity-active-provider-changed', {
            detail: { providerId: finalActiveId, config: configs[finalActiveId] || currentConfig }
        }));
        setSaveFeedback(true);
        setTimeout(() => {
            setSaveFeedback(false);
            onClose();
        }, 500);
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
    const allModelsForCurrent = Array.from(new Set([
        ...(currentConfig.model ? [currentConfig.model] : []),
        ...(Array.isArray(currentConfig.presetModels) ? currentConfig.presetModels : []),
        ...((detectedModels || []).slice(0, 10))
    ]));

    const modalNode = (
        <div
            className="ai-model-setup-popup"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(3, 7, 18, 0.82)',
                backdropFilter: 'blur(12px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2147483647
            }}
            onClick={onClose}
        >
            <div
                className="modal-container"
                style={{
                    width: '880px',
                    maxWidth: '95vw',
                    height: '84vh',
                    maxHeight: '720px',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 0,
                    background: 'rgba(11, 17, 33, 0.98)',
                    backdropFilter: 'blur(24px)',
                    border: '1.5px solid rgba(0, 229, 255, 0.3)',
                    borderRadius: '16px',
                    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 229, 255, 0.15)',
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
                        <img src="assets/logo.png" alt="Nexora" style={{ width: '22px', height: '22px', objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(0, 240, 255, 0.5))' }} />
                        <div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                                AI Model Setup & Provider Keys
                            </h3>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                Add models, scan local Ollama / LM Studio models, and configure API endpoints
                            </span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                            type="button"
                            onClick={() => setShowAddProviderForm(prev => !prev)}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: '1px solid rgba(0, 229, 255, 0.4)',
                                background: showAddProviderForm ? '#00e5ff' : 'rgba(0, 229, 255, 0.12)',
                                color: showAddProviderForm ? '#070b14' : '#00e5ff',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            {showAddProviderForm ? '✕ Close Add Setup' : '+ Add New Model Setup'}
                        </button>
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
                </div>

                {/* Main Content: Sidebar + Detail Panel */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* Left Sidebar: Providers List */}
                    <div
                        style={{
                            width: '250px',
                            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                            background: 'rgba(7, 11, 20, 0.6)',
                            padding: '12px 10px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px'
                        }}
                    >
                        <div style={{ padding: '4px 8px', fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            AI Model Providers
                        </div>

                        {providerList.map((prov) => {
                            const isSelected = prov.id === currentConfig.id && !showAddProviderForm;
                            const isActive = prov.id === activeProviderId;
                            const hasKeyOrLocal = prov.apiKey || prov.id === 'lmstudio' || prov.id === 'ollama' || prov.id === 'ornith' || prov.isCustom;

                            return (
                                <button
                                    key={prov.id}
                                    onClick={() => {
                                        setShowAddProviderForm(false);
                                        setSelectedProviderId(prov.id);
                                        setActiveId(prov.id);
                                        setActiveProviderId(prov.id);
                                        saveAiProvidersConfig(configs);
                                        window.dispatchEvent(new CustomEvent('antigravity-active-provider-changed', {
                                            detail: { providerId: prov.id, config: configs[prov.id] || prov }
                                        }));
                                        setTestStatus(null);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        border: isSelected ? '1px solid rgba(0, 229, 255, 0.45)' : '1px solid transparent',
                                        background: isSelected ? 'rgba(0, 229, 255, 0.14)' : 'transparent',
                                        color: isSelected ? '#f8fafc' : '#94a3b8',
                                        fontSize: '12.5px',
                                        fontWeight: isSelected ? 600 : 400,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                        <span style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            flexShrink: 0,
                                            background: isActive ? '#00e5ff' : (hasKeyOrLocal ? '#10b981' : '#475569'),
                                            boxShadow: isActive ? '0 0 8px #00e5ff' : 'none'
                                        }} />
                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            <div>{prov.name}</div>
                                            <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
                                                {prov.model || 'default'}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
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
                                        {prov.isCustom && (
                                            <span
                                                onClick={(e) => handleDeleteCustomProvider(prov.id, e)}
                                                title="Remove custom model setup"
                                                style={{
                                                    fontSize: '12px',
                                                    color: '#f87171',
                                                    padding: '0 4px',
                                                    borderRadius: '4px'
                                                }}
                                            >
                                                ×
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}

                        <button
                            type="button"
                            onClick={() => setShowAddProviderForm(true)}
                            style={{
                                marginTop: '8px',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: '1px dashed rgba(0, 229, 255, 0.4)',
                                background: showAddProviderForm ? 'rgba(0, 229, 255, 0.15)' : 'rgba(0, 229, 255, 0.05)',
                                color: '#00e5ff',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}
                        >
                            <span>＋</span>
                            <span>Add Model / Custom Setup</span>
                        </button>
                    </div>

                    {/* Right Detail Panel */}
                    <div
                        style={{
                            flex: 1,
                            padding: '20px 24px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px'
                        }}
                    >
                        {showAddProviderForm ? (
                            <div
                                style={{
                                    padding: '18px 20px',
                                    borderRadius: '12px',
                                    background: 'rgba(0, 229, 255, 0.06)',
                                    border: '1px solid rgba(0, 229, 255, 0.3)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '14px'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#00e5ff' }}>
                                            ＋ Add New AI Model Setup
                                        </div>
                                        <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                                            Register any local or cloud model endpoint (Ollama, LM Studio, vLLM, OpenRouter, OpenAI)
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '5px' }}>
                                        Setup / Provider Display Name
                                    </label>
                                    <input
                                        type="text"
                                        value={customProviderDraft.name}
                                        onChange={(e) => setCustomProviderDraft(p => ({ ...p, name: e.target.value }))}
                                        placeholder="e.g. Ollama GPT-OSS 20B, Local Qwen 3.5, Custom vLLM"
                                        style={{
                                            width: '100%',
                                            padding: '9px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(255, 255, 255, 0.15)',
                                            background: 'rgba(15, 23, 42, 0.8)',
                                            color: '#f8fafc',
                                            fontSize: '13px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '5px' }}>
                                        Model ID / Name
                                    </label>
                                    <input
                                        type="text"
                                        value={customProviderDraft.model}
                                        onChange={(e) => setCustomProviderDraft(p => ({ ...p, model: e.target.value }))}
                                        placeholder="e.g. gpt-oss:20b, qwen3.5:35b, ornith-1.0-9b, gpt-4o"
                                        style={{
                                            width: '100%',
                                            padding: '9px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(255, 255, 255, 0.15)',
                                            background: 'rgba(15, 23, 42, 0.8)',
                                            color: '#f8fafc',
                                            fontSize: '13px',
                                            fontFamily: 'monospace',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '5px' }}>
                                        Base Endpoint URL
                                    </label>
                                    <input
                                        type="text"
                                        value={customProviderDraft.baseUrl}
                                        onChange={(e) => setCustomProviderDraft(p => ({ ...p, baseUrl: e.target.value }))}
                                        placeholder="http://localhost:11434/v1"
                                        style={{
                                            width: '100%',
                                            padding: '9px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(255, 255, 255, 0.15)',
                                            background: 'rgba(15, 23, 42, 0.8)',
                                            color: '#f8fafc',
                                            fontSize: '13px',
                                            fontFamily: 'monospace',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '5px' }}>
                                        API Key (Optional for Local Models)
                                    </label>
                                    <input
                                        type="password"
                                        value={customProviderDraft.apiKey}
                                        onChange={(e) => setCustomProviderDraft(p => ({ ...p, apiKey: e.target.value }))}
                                        placeholder="sk-... (leave blank for local Ollama / LM Studio)"
                                        style={{
                                            width: '100%',
                                            padding: '9px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(255, 255, 255, 0.15)',
                                            background: 'rgba(15, 23, 42, 0.8)',
                                            color: '#f8fafc',
                                            fontSize: '13px',
                                            fontFamily: 'monospace',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddProviderForm(false)}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(255, 255, 255, 0.15)',
                                            background: 'transparent',
                                            color: '#94a3b8',
                                            fontSize: '12px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCreateCustomProvider}
                                        style={{
                                            padding: '8px 20px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: '#00e5ff',
                                            color: '#070b14',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✓ Add & Activate Model Setup
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
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
                                            {currentConfig.name} <span style={{ fontSize: '12px', color: '#00e5ff', fontFamily: 'monospace' }}>({currentConfig.model})</span>
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

                                {/* Model Setup & + Add Model Box */}
                                <div
                                    style={{
                                        padding: '14px 16px',
                                        borderRadius: '10px',
                                        background: 'rgba(15, 23, 42, 0.55)',
                                        border: '1px solid rgba(0, 229, 255, 0.2)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                                                🧠 Model Setup & Selection
                                            </label>
                                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                Select an active model below or scan available models from this endpoint
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleScanModels()}
                                            disabled={isScanningModels}
                                            style={{
                                                padding: '6px 14px',
                                                borderRadius: '6px',
                                                border: '1px solid #00e5ff',
                                                background: isScanningModels ? 'rgba(0, 229, 255, 0.05)' : 'rgba(0, 229, 255, 0.15)',
                                                color: '#00e5ff',
                                                fontSize: '11.5px',
                                                fontWeight: 700,
                                                cursor: isScanningModels ? 'wait' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                boxShadow: '0 0 10px rgba(0, 229, 255, 0.2)'
                                            }}
                                        >
                                            {isScanningModels ? '⏳ Scanning Models...' : '🔄 Scan Installed Models'}
                                        </button>
                                    </div>

                                    {/* Live Detected Models Dropdown Selector */}
                                    {detectedModels.length > 0 && (
                                        <div
                                            style={{
                                                padding: '10px 14px',
                                                borderRadius: '8px',
                                                background: 'rgba(0, 229, 255, 0.08)',
                                                border: '1px solid rgba(0, 229, 255, 0.3)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '6px'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#00e5ff' }}>
                                                    📋 Scanned Models ({detectedModels.length} models ready to select)
                                                </span>
                                                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                                                    ● Verified live from endpoint
                                                </span>
                                            </div>
                                            <select
                                                value={detectedModels.includes(currentConfig.model) ? currentConfig.model : ''}
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        handleSelectPresetModel(e.target.value);
                                                    }
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '9px 12px',
                                                    borderRadius: '6px',
                                                    border: '1px solid rgba(0, 229, 255, 0.5)',
                                                    background: '#070b14',
                                                    color: '#00e5ff',
                                                    fontSize: '13px',
                                                    fontFamily: 'monospace',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    outline: 'none'
                                                }}
                                            >
                                                <option value="">-- Click here to select a scanned model ({detectedModels.length} available) --</option>
                                                {detectedModels.map(m => (
                                                    <option key={m} value={m}>
                                                        {m}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Current Active Model Input + Add New Model Input */}
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="text"
                                            value={currentConfig.model || ''}
                                            onChange={(e) => handleUpdateField('model', e.target.value)}
                                            placeholder="Active model (e.g. gpt-oss:20b, qwen3.5:35b)"
                                            style={{
                                                flex: 1,
                                                padding: '9px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(0, 229, 255, 0.35)',
                                                background: 'rgba(7, 11, 20, 0.8)',
                                                color: '#00e5ff',
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                fontFamily: 'monospace',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                        <input
                                            type="text"
                                            value={newModelInput}
                                            onChange={(e) => setNewModelInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddModel();
                                                }
                                            }}
                                            placeholder="Type new model name to add..."
                                            style={{
                                                flex: 1,
                                                padding: '9px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255, 255, 255, 0.14)',
                                                background: 'rgba(15, 23, 42, 0.8)',
                                                color: '#f8fafc',
                                                fontSize: '12.5px',
                                                fontFamily: 'monospace',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddModel}
                                            style={{
                                                padding: '9px 14px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                background: '#00e5ff',
                                                color: '#070b14',
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            + Add Model
                                        </button>
                                    </div>

                                    {/* Saved & Detected Models Grid */}
                                    {allModelsForCurrent.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                            {allModelsForCurrent.map(m => {
                                                const isCurrentModel = currentConfig.model === m;
                                                const isDetectedLive = detectedModels.includes(m);
                                                return (
                                                    <div
                                                        key={m}
                                                        onClick={() => handleSelectPresetModel(m)}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            padding: '4px 10px',
                                                            borderRadius: '6px',
                                                            border: isCurrentModel ? '1px solid #00e5ff' : '1px solid rgba(255, 255, 255, 0.1)',
                                                            background: isCurrentModel ? 'rgba(0, 229, 255, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                                                            color: isCurrentModel ? '#00e5ff' : '#cbd5e1',
                                                            fontSize: '11.5px',
                                                            fontFamily: 'monospace',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {isDetectedLive && (
                                                            <span
                                                                title="Installed & detected on endpoint"
                                                                style={{
                                                                    width: '6px',
                                                                    height: '6px',
                                                                    borderRadius: '50%',
                                                                    background: '#10b981'
                                                                }}
                                                            />
                                                        )}
                                                        <span>{m}</span>
                                                        {isCurrentModel && <span style={{ fontSize: '10px', fontWeight: 700 }}>✓</span>}
                                                        {allModelsForCurrent.length > 1 && (
                                                            <span
                                                                onClick={(e) => handleRemoveModel(m, e)}
                                                                title="Remove model from list"
                                                                style={{
                                                                    marginLeft: '2px',
                                                                    color: '#64748b',
                                                                    fontSize: '12px',
                                                                    lineHeight: 1
                                                                }}
                                                            >
                                                                ×
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
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
                                        placeholder="e.g. http://localhost:11434/v1 or http://localhost:1234/v1"
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
                                            API Key {currentConfig.id === 'lmstudio' || currentConfig.id === 'ollama' || currentConfig.id === 'ornith' ? '(Optional for local)' : '(Required)'}
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
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type={showApiKey ? 'text' : 'password'}
                                            value={currentConfig.apiKey || ''}
                                            onChange={(e) => handleUpdateField('apiKey', e.target.value)}
                                            placeholder={currentConfig.id === 'anthropic' ? 'sk-ant-api03-...' : (currentConfig.id === 'openrouter' ? 'sk-or-v1-...' : (currentConfig.id === 'opencodezen' ? 'sk-... Paste OpenCode Zen API key' : 'sk-... or enter your key'))}
                                            style={{
                                                flex: 1,
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
                                        <button
                                            type="button"
                                            onClick={() => handleScanModels(currentConfig)}
                                            disabled={isScanningModels}
                                            title="Scan models immediately using this endpoint and pasted API key"
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '8px',
                                                border: '1px solid #00e5ff',
                                                background: isScanningModels ? 'rgba(0, 229, 255, 0.1)' : 'rgba(0, 229, 255, 0.2)',
                                                color: '#00e5ff',
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                cursor: isScanningModels ? 'wait' : 'pointer',
                                                whiteSpace: 'nowrap',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            {isScanningModels ? '⏳ Scanning...' : '🔄 Scan Models with Key'}
                                        </button>
                                    </div>
                                </div>

                                {/* Connection Test Action */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '2px' }}>
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
                            </>
                        )}


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

    return typeof document !== 'undefined' && document.body
        ? createPortal(modalNode, document.body)
        : modalNode;
}
