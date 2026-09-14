import React, { useState, useEffect, useRef } from 'react';
const { ipcRenderer } = require('electron');

export default function DetachedAiHudCockpit() {
    const [tabs, setTabs] = useState([
        { id: 1, title: 'Tab 1: Hacker News', url: 'https://news.ycombinator.com' },
        { id: 2, title: 'Tab 2: Checkout Demo', url: 'file:///demo_checkout.html' },
        { id: 3, title: 'Tab 3: Wikipedia', url: 'https://en.wikipedia.org' }
    ]);
    const [activeTabId, setActiveTabId] = useState(1);
    const [activeModuleTab, setActiveModuleTab] = useState('chat'); // 'chat' | 'shields' | 'tools'
    const [activeToolTab, setActiveToolTab] = useState('ax'); // 'ax' | 'grep' | 'autofill' | 'telemetry'

    // SoM & AX Tree
    const [somEnabled, setSomEnabled] = useState(true);
    const [axTreeMarkdown, setAxTreeMarkdown] = useState('');
    const [markFilterQuery, setMarkFilterQuery] = useState('');
    const [copiedAx, setCopiedAx] = useState(false);

    // Grep & Autofill
    const [grepQuery, setGrepQuery] = useState('href');
    const [grepMatches, setGrepMatches] = useState([]);
    const [grepPage, setGrepPage] = useState(1);
    const [autofillStatus, setAutofillStatus] = useState('Ready for autofill execution.');
    const [isHitlActive, setIsHitlActive] = useState(false);

    // Telemetry & Shields
    const [telemetryLogs, setTelemetryLogs] = useState([]);
    const [shieldsStats, setShieldsStats] = useState({
        mode: 'aggressive',
        isNativeRust: true,
        totalBlocked: 0,
        trackersBlocked: 0,
        adsBlocked: 0,
        savedBytes: 0,
        savedTimeMs: 0,
        recentEvents: []
    });
    const [customRuleInput, setCustomRuleInput] = useState('');

    // AI Chat & Voice NLP State
    const [chatMessages, setChatMessages] = useState([
        {
            id: 'msg-welcome',
            role: 'assistant',
            text: "👋 Hi! I am your AI Copilot with real-time awareness and direct control of your browser tabs.\n\nYou can chat with me, click quick action chips, or speak with 🎙️ Voice NLP!",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [isVoiceListening, setIsVoiceListening] = useState(false);
    const [voiceSpeechFeedback, setVoiceSpeechFeedback] = useState(false);
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [whisperLang, setWhisperLang] = useState('auto'); // 'auto', 'en', 'hi', 'ko'
    const [isWhisperRecording, setIsWhisperRecording] = useState(false);
    const [isWhisperTranscribing, setIsWhisperTranscribing] = useState(false);
    const [recordingTimer, setRecordingTimer] = useState(0);

    const recognitionRef = useRef(null);
    const messagesEndRef = useRef(null);
    const timerIntervalRef = useRef(null);
    const audioCtxRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const audioChunksRef = useRef([]);
    const activeAssistantIdRef = useRef(null);

    const toggleThoughtCollapse = (msgId) => {
        setChatMessages(prev => prev.map(m =>
            m.id === msgId ? { ...m, thoughtCollapsed: !m.thoughtCollapsed } : m
        ));
    };

    const toggleToolCollapse = (msgId, toolId) => {
        setChatMessages(prev => prev.map(m => {
            if (m.id !== msgId) return m;
            const updated = (m.toolEvents || []).map(t =>
                t.id === toolId ? { ...t, collapsed: !t.collapsed } : t
            );
            return { ...m, toolEvents: updated };
        }));
    };

    // Preload Whisper model on startup in the background
    useEffect(() => {
        try {
            if (ipcRenderer.invoke) {
                ipcRenderer.invoke('whisper-preload').catch(() => {});
            }
        } catch (e) {}
    }, []);

    // Scroll chat to bottom on new message
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages, isAiThinking]);

    // Setup live IPC synchronization with main browser window
    useEffect(() => {
        try {
            ipcRenderer.send('hud-action', { action: 'request-initial-state' });
        } catch (e) {}

        const handleUpdateHudState = (event, data) => {
            if (!data) return;
            if (data.type === 'full-state') {
                if (data.tabs) setTabs(data.tabs);
                if (data.activeTabId) setActiveTabId(data.activeTabId);
                if (data.somEnabled !== undefined) setSomEnabled(data.somEnabled);
                if (data.axTreeMarkdown !== undefined) setAxTreeMarkdown(data.axTreeMarkdown);
                if (data.grepMatches !== undefined) setGrepMatches(data.grepMatches);
                if (data.autofillStatus !== undefined) setAutofillStatus(data.autofillStatus);
                if (data.isHitlActive !== undefined) setIsHitlActive(data.isHitlActive);
                if (data.telemetryLogs) setTelemetryLogs(data.telemetryLogs);
                if (data.shieldsStats) setShieldsStats(data.shieldsStats);
            } else if (data.type === 'tabs-list') {
                if (data.tabs) setTabs(data.tabs);
                if (data.activeTabId) setActiveTabId(data.activeTabId);
            } else if (data.type === 'ax-tree') {
                setAxTreeMarkdown(data.markdown || '');
            } else if (data.type === 'grep-results') {
                setGrepMatches(data.matches || []);
                setGrepPage(1);
            } else if (data.type === 'autofill-status') {
                setAutofillStatus(data.status || '');
            } else if (data.type === 'ai-command-stream-reasoning') {
                setIsAiThinking(false);
                const curId = activeAssistantIdRef.current;
                setChatMessages(prev => prev.map(m => {
                    if (m.id !== curId) return m;
                    return {
                        ...m,
                        reasoning: (m.reasoning || '') + (data.chunk || ''),
                        isThinking: true
                    };
                }));
            } else if (data.type === 'ai-command-stream-chunk') {
                setIsAiThinking(false);
                const curId = activeAssistantIdRef.current;
                setChatMessages(prev => prev.map(m => {
                    if (m.id !== curId) return m;
                    const shouldCollapse = (m.reasoning && m.isThinking) ? true : m.thoughtCollapsed;
                    return {
                        ...m,
                        text: (m.text || '') + (data.chunk || ''),
                        isThinking: false,
                        thoughtCollapsed: shouldCollapse
                    };
                }));
            } else if (data.type === 'ai-command-tool-event') {
                setIsAiThinking(false);
                const curId = activeAssistantIdRef.current;
                const evt = data.toolEvent;
                if (!evt) return;
                setChatMessages(prev => prev.map(m => {
                    if (m.id !== curId) return m;
                    const currentTools = [...(m.toolEvents || [])];
                    const existingIdx = currentTools.findIndex(t => t.id === evt.id);
                    if (existingIdx >= 0) {
                        currentTools[existingIdx] = { ...currentTools[existingIdx], ...evt };
                    } else {
                        currentTools.push({ ...evt, collapsed: false });
                    }
                    return {
                        ...m,
                        toolEvents: currentTools
                    };
                }));
            } else if (data.type === 'ai-command-reply') {
                const curId = activeAssistantIdRef.current;
                setChatMessages(prev => prev.map(m => {
                    if (m.id !== curId) return m;
                    const finalText = (m.text && m.text.trim()) ? m.text : (data.reply || '');
                    return {
                        ...m,
                        text: finalText,
                        isStreaming: false,
                        isThinking: false,
                        thoughtCollapsed: m.reasoning ? true : m.thoughtCollapsed
                    };
                }));
                setIsAiThinking(false);
                if (data.reply) {
                    const spokenText = String(data.reply).replace(/<[^>]*>/g, '').substring(0, 120);
                    speakReply(spokenText, 'en');
                }
            } else if (data.type === 'telemetry') {
                setTelemetryLogs(prev => [
                    ...prev,
                    { time: new Date().toLocaleTimeString(), type: data.level || 'info', msg: data.message, meta: data.meta }
                ]);
            } else if (data.type === 'shields') {
                setShieldsStats(data.stats || {});
            } else if (data.type === 'set-active-tab' || data.type === 'set-module-tab') {
                if (data.tab) setActiveModuleTab(data.tab);
            }
        };

        ipcRenderer.on('update-hud-state', handleUpdateHudState);
        return () => {
            ipcRenderer.removeListener('update-hud-state', handleUpdateHudState);
        };
    }, []);

    const sendHudAction = (action, payload = {}) => {
        try {
            ipcRenderer.send('hud-action', { action, ...payload });
        } catch (e) {
            console.error('Failed to dispatch HUD action:', e);
        }
    };

    const handleFocusBrowser = () => {
        if (ipcRenderer.invoke) {
            ipcRenderer.invoke('focus-browser-window').catch(() => {});
        } else {
            ipcRenderer.send('focus-browser-window');
        }
    };

    const handleDockBack = () => {
        sendHudAction('dock-to-browser');
        if (ipcRenderer.invoke) {
            ipcRenderer.invoke('close-hud-window').catch(() => {});
        }
    };

    const handleHideWindow = () => {
        sendHudAction('hide-hud-window');
        if (ipcRenderer.invoke) {
            ipcRenderer.invoke('hide-hud-window').catch(() => {});
        }
    };

    const handleTabChange = (newId) => {
        const id = Number(newId);
        setActiveTabId(id);
        sendHudAction('switch-tab', { tabId: id });
    };

    const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0] || { id: 1, title: 'New Tab', url: '' };

    // Whisper 16kHz Audio Recording & Transcription
    const toggleWhisperRecording = async () => {
        if (isWhisperRecording) {
            setIsWhisperRecording(false);
            setIsWhisperTranscribing(true);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

            try {
                if (mediaStreamRef.current) {
                    mediaStreamRef.current.getTracks().forEach(t => t.stop());
                }
                if (audioProcessorRef.current) {
                    try { audioProcessorRef.current.disconnect(); } catch (e) {}
                }
                if (audioCtxRef.current) {
                    try { audioCtxRef.current.close(); } catch (e) {}
                }

                const chunks = audioChunksRef.current;
                let totalLen = 0;
                for (const ch of chunks) totalLen += ch.length;

                if (totalLen > 1600) { // at least 0.1s of audio
                    const merged = new Float32Array(totalLen);
                    let offset = 0;
                    for (const ch of chunks) {
                        merged.set(ch, offset);
                        offset += ch.length;
                    }
                    const floatArray = Array.from(merged);
                    const res = await ipcRenderer.invoke('whisper-transcribe', {
                        audioData: floatArray,
                        language: whisperLang === 'auto' ? null : whisperLang
                    });
                    if (res && res.success && res.text) {
                        const transcribedText = res.text.trim();
                        setChatInput(transcribedText);
                        handleProcessNlpCommand(transcribedText);
                    } else if (res && res.error) {
                        addAiReply(`⚠️ Whisper Notice: ${res.error}`);
                    }
                } else {
                    addAiReply(`🎙️ Whisper heard too little audio. Hold the mic button or speak clearly into the microphone.`);
                }
            } catch (err) {
                console.error('[Whisper] Transcribe error:', err);
                addAiReply(`⚠️ Whisper transcription error: ${err.message || err}`);
            } finally {
                setIsWhisperTranscribing(false);
                setRecordingTimer(0);
            }
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioCtx({ sampleRate: 16000 });
            audioCtxRef.current = ctx;

            const source = ctx.createMediaStreamSource(stream);
            const processor = ctx.createScriptProcessor(4096, 1, 1);
            audioProcessorRef.current = processor;
            audioChunksRef.current = [];

            processor.onaudioprocess = (e) => {
                const data = e.inputBuffer.getChannelData(0);
                audioChunksRef.current.push(new Float32Array(data));
            };

            source.connect(processor);
            processor.connect(ctx.destination);

            setIsWhisperRecording(true);
            setRecordingTimer(0);
            timerIntervalRef.current = setInterval(() => {
                setRecordingTimer(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.warn('[Whisper] Microphone access error:', err);
            addAiReply(`⚠️ **Microphone Access**: ${err.message || 'Permission denied or device not found'}.\n\n💡 Ensure microphone access is allowed in Windows Settings. You can also click any of the multilingual quick action chips above (e.g. 🇮🇳 सारांश or 🇰🇷 요약) to test local NLP.`);
        }
    };

    // Fallback Web Speech Recognition
    const toggleVoiceRecognitionFallback = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Speech Recognition is unavailable. You can type commands in English, Hindi, or Korean in the chat bar.');
            return;
        }

        if (isVoiceListening) {
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (e) {}
            }
            setIsVoiceListening(false);
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            recognitionRef.current = recognition;
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = whisperLang === 'hi' ? 'hi-IN' : whisperLang === 'ko' ? 'ko-KR' : 'en-US';

            recognition.onstart = () => setIsVoiceListening(true);
            recognition.onresult = (event) => {
                let transcript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    transcript += event.results[i][0].transcript;
                }
                setChatInput(transcript);
                if (event.results[0] && event.results[0].isFinal) {
                    setIsVoiceListening(false);
                    handleProcessNlpCommand(transcript);
                }
            };
            recognition.onerror = () => setIsVoiceListening(false);
            recognition.onend = () => setIsVoiceListening(false);
            recognition.start();
        } catch (err) {
            setIsVoiceListening(false);
        }
    };

    const addAiReply = (text) => {
        setIsAiThinking(false);
        setChatMessages(prev => [
            ...prev,
            {
                id: 'ai-' + Date.now(),
                role: 'assistant',
                text,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
        ]);
    };

    const speakReply = (speechText, langCode = 'en') => {
        if (voiceSpeechFeedback && window.speechSynthesis) {
            try {
                window.speechSynthesis.cancel();
                const utter = new SpeechSynthesisUtterance(speechText);
                utter.rate = 1.05;
                if (langCode === 'hi') utter.lang = 'hi-IN';
                else if (langCode === 'ko') utter.lang = 'ko-KR';
                else utter.lang = 'en-US';
                window.speechSynthesis.speak(utter);
            } catch (e) {}
        }
    };

    // Multilingual NLP Processor & Command Router (English, Hindi, Korean)
    const handleProcessNlpCommand = async (rawText) => {
        const query = (rawText || chatInput || '').trim();
        if (!query) return;

        const userMsg = {
            id: 'user-' + Date.now(),
            role: 'user',
            text: query,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        const assistantMsgId = 'ai-' + Date.now();
        activeAssistantIdRef.current = assistantMsgId;
        const placeholderMsg = {
            id: assistantMsgId,
            role: 'assistant',
            text: '',
            reasoning: '',
            isStreaming: true,
            isThinking: false,
            thoughtDuration: 0,
            thoughtCollapsed: false,
            toolEvents: [],
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, userMsg, placeholderMsg]);
        setChatInput('');
        setIsAiThinking(true);

        // Forward to Main Browser Window AI Harness Engine
        sendHudAction('ai-command', { prompt: query });
    };

    // Tools helpers
    const getFilteredAxContent = () => {
        if (!axTreeMarkdown) return 'Connecting to in-process Chromium core...';
        if (!markFilterQuery.trim()) return axTreeMarkdown;
        const q = markFilterQuery.toLowerCase().trim();
        const lines = axTreeMarkdown.split('\n');
        const filtered = lines.filter(line => line.toLowerCase().includes(q));
        if (filtered.length === 0) return `No marks matching "${markFilterQuery}" found.`;
        return filtered.join('\n');
    };

    const handleCopyAx = () => {
        const textToCopy = getFilteredAxContent();
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                setCopiedAx(true);
                setTimeout(() => setCopiedAx(false), 2000);
            }).catch(() => {});
        }
    };

    return (
        <div className="mac-cockpit-window">
            {/* Minimalist Frameless Mac Window Header */}
            <header className="mac-cockpit-header">
                <div className="mac-window-controls">
                    <button
                        className="mac-btn mac-close"
                        title="Retract & Hide AI Window"
                        onClick={handleHideWindow}
                    />
                    <button
                        className="mac-btn mac-minimize"
                        title="Minimize Window"
                        onClick={() => ipcRenderer.send('hud-window-minimize')}
                    />
                    <button
                        className="mac-btn mac-maximize"
                        title="Maximize / Restore"
                        onClick={() => ipcRenderer.send('hud-window-maximize')}
                    />
                </div>

                <div className="mac-cockpit-brand">
                    <span className="mac-brand-sparkle">✦</span>
                    <span className="mac-brand-name">Antigravity Copilot</span>
                </div>

                {/* Compact Target Tab Switcher */}
                <div className="mac-target-pill" title="Current active tab in main browser">
                    <span style={{ fontSize: '11px', opacity: 0.65 }}>Target:</span>
                    <select
                        className="mac-target-select"
                        value={activeTabId}
                        onChange={(e) => handleTabChange(e.target.value)}
                    >
                        {tabs.map(tab => (
                            <option key={tab.id} value={tab.id}>
                                Tab {tab.id}: {tab.title ? (tab.title.length > 22 ? tab.title.substring(0, 22) + '...' : tab.title) : 'New Tab'}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Minimalist Window Actions */}
                <div className="mac-header-actions">
                    <button
                        className="mac-pill-btn"
                        title="Dock AI back into browser window"
                        onClick={handleDockBack}
                    >
                        📥 Dock
                    </button>
                    <button
                        className="mac-pill-btn"
                        title="Bring browser window to front"
                        onClick={handleFocusBrowser}
                    >
                        ↗ Focus
                    </button>
                    <button
                        className="mac-pill-btn close-x"
                        title="Retract and hide window"
                        onClick={handleHideWindow}
                    >
                        ✕
                    </button>
                </div>
            </header>

            {/* Minimal Segmented View Switcher */}
            <nav className="mac-cockpit-nav">
                <button
                    className={`mac-nav-tab ${activeModuleTab === 'chat' ? 'active' : ''}`}
                    onClick={() => setActiveModuleTab('chat')}
                >
                    💬 AI Chat & Voice
                </button>
                <button
                    className={`mac-nav-tab ${activeModuleTab === 'shields' ? 'active' : ''}`}
                    onClick={() => setActiveModuleTab('shields')}
                >
                    🦁 Shields ({shieldsStats.totalBlocked || 0})
                </button>
                <button
                    className={`mac-nav-tab ${activeModuleTab === 'tools' ? 'active' : ''}`}
                    onClick={() => setActiveModuleTab('tools')}
                >
                    🛠️ Core Tools
                </button>
            </nav>

            {/* MAIN CONTENT AREA */}
            <main className="mac-cockpit-body">
                {/* 1. AI CHAT & VOICE NLP VIEW */}
                {activeModuleTab === 'chat' && (
                    <div className="mac-chat-view">
                        {/* Target Context Banner */}
                        <div className="mac-context-bar">
                            <span style={{ fontSize: '13px' }}>🌐</span>
                            <span className="mac-context-title">
                                {activeTab.title || 'New Tab'}
                            </span>
                            <span className="mac-context-badge">
                                🛡️ {shieldsStats.totalBlocked || 0} Blocked
                            </span>
                            <button
                                className={`mac-speech-toggle ${voiceSpeechFeedback ? 'active' : ''}`}
                                title={voiceSpeechFeedback ? "Voice speech feedback ON (Click to mute)" : "Voice speech feedback OFF (Click to speak responses)"}
                                onClick={() => setVoiceSpeechFeedback(!voiceSpeechFeedback)}
                            >
                                {voiceSpeechFeedback ? '🔊 Speaking' : '🔇 Muted'}
                            </button>
                        </div>

                        {/* Quick Interactive Multilingual NLP Action Chips */}
                        <div className="mac-quick-chips">
                            <button className="mac-chip" onClick={() => handleProcessNlpCommand('CLK SB')} title="Click Search Bar on web page">
                                🔍 CLK SB
                            </button>
                            <button className="mac-chip" onClick={() => handleProcessNlpCommand('s50')} title="Scroll down by 50%">
                                📜 S50
                            </button>
                            <button className="mac-chip" onClick={() => handleProcessNlpCommand('open youtube')} title="Open YouTube tab">
                                📺 YouTube
                            </button>
                            <button className="mac-chip" onClick={() => handleProcessNlpCommand('show numbers')} title="Highlight & number keywords on page">
                                🔢 Numbers
                            </button>
                            <button className="mac-chip" onClick={() => handleProcessNlpCommand('help shortcuts')} title="Show all NLP commands">
                                💡 Shortcuts
                            </button>
                            <button className="mac-chip" onClick={() => handleProcessNlpCommand('close tab')} title="Close active tab">
                                ❌ Close
                            </button>
                            <button className="mac-chip" onClick={() => handleProcessNlpCommand('summarize')}>
                                ⚡ Summarize
                            </button>
                            <button className="mac-chip" onClick={() => handleProcessNlpCommand('scroll down')}>
                                ⬇ Scroll
                            </button>
                            <button className="mac-chip" onClick={() => handleProcessNlpCommand('click play')}>
                                ▶️ Play
                            </button>
                            <button className="mac-chip" onClick={() => handleProcessNlpCommand('autofill')}>
                                📝 Autofill
                            </button>
                            <button className="mac-chip" onClick={() => handleProcessNlpCommand('पेज का सारांश दो')}>
                                🇮🇳 सारांश (HI)
                            </button>
                            <button className="mac-chip" onClick={() => handleProcessNlpCommand('페이지 요약')}>
                                🇰🇷 요약 (KO)
                            </button>
                        </div>

                        {/* Chat Messages Stream */}
                        <div className="mac-messages-stream">
                            {chatMessages.map(msg => (
                                <div key={msg.id} className={`mac-msg-row ${msg.role}`}>
                                    <div className="mac-msg-bubble">
                                        <div className="mac-msg-header">
                                            <span className="mac-msg-author">
                                                {msg.role === 'user' ? 'You' : '✦ Copilot'}
                                            </span>
                                            <span className="mac-msg-time">{msg.time}</span>
                                        </div>

                                        {/* ChatGPT / Claude / Gemini Style Thought Box with Retract Button */}
                                        {msg.role === 'assistant' && msg.reasoning && (
                                            <div className={`chatgpt-thought-container ${msg.isThinking ? 'active-thinking' : ''}`}>
                                                <div className="thought-header" onClick={() => toggleThoughtCollapse(msg.id)}>
                                                    <div className="thought-title-group">
                                                        {msg.isThinking ? (
                                                            <>
                                                                <span className="thought-shimmer-pulse" />
                                                                <span>Thinking...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span>💭</span>
                                                                <span>Thought for {msg.thoughtDuration || '2.4'}s</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="thought-retract-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleThoughtCollapse(msg.id);
                                                        }}
                                                        title={msg.thoughtCollapsed ? "Expand reasoning process" : "Collapse / Retract reasoning process"}
                                                    >
                                                        {msg.thoughtCollapsed ? '▶ Expand Thought' : '▼ Collapse Thought'}
                                                    </button>
                                                </div>
                                                {!msg.thoughtCollapsed && (
                                                    <div className="thought-stream-body">
                                                        {msg.reasoning}
                                                        {msg.isThinking && <span className="streaming-caret" />}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Antigravity Interactive Live Tool Usage Cards */}
                                        {msg.role === 'assistant' && msg.toolEvents && msg.toolEvents.length > 0 && (
                                            <div className="antigravity-tools-group">
                                                {msg.toolEvents.map(tool => (
                                                    <div key={tool.id} className={`antigravity-tool-card ${tool.status}`}>
                                                        <div className="tool-card-header" onClick={() => toggleToolCollapse(msg.id, tool.id)}>
                                                            <div className="tool-card-title">
                                                                <span>
                                                                    {tool.tool.includes('download') ? '📥' :
                                                                     tool.tool.includes('tab') ? '🗂️' :
                                                                     tool.tool.includes('search') ? '🔍' :
                                                                     tool.tool.includes('remind') ? '🔔' :
                                                                     tool.tool.includes('click') ? '🖱️' : '⚡'}
                                                                </span>
                                                                <span>Tool:</span>
                                                                <code className="tool-name-code">{tool.tool}</code>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                {tool.status === 'running' && (
                                                                    <span className="tool-status-badge running">
                                                                        <span className="tool-card-spinner" /> Running...
                                                                    </span>
                                                                )}
                                                                {tool.status === 'completed' && (
                                                                    <span className="tool-status-badge completed">
                                                                        ✓ Verified {tool.durationMs ? `(${tool.durationMs}ms)` : ''}
                                                                    </span>
                                                                )}
                                                                {tool.status === 'failed' && (
                                                                    <span className="tool-status-badge failed">
                                                                        ✗ Failed
                                                                    </span>
                                                                )}
                                                                <span style={{ fontSize: 10, color: '#94a3b8' }}>
                                                                    {tool.collapsed ? '▶' : '▼'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {!tool.collapsed && (
                                                            <div className="tool-card-body">
                                                                {tool.args && Object.keys(tool.args).length > 0 && (
                                                                    <div>
                                                                        <div className="tool-params-label">Parameters</div>
                                                                        <pre className="tool-params-pre">{JSON.stringify(tool.args, null, 2)}</pre>
                                                                    </div>
                                                                )}
                                                                {(tool.observation || tool.result) && (
                                                                    <div className="tool-obs-box">
                                                                        <strong>Live Observation:</strong> {tool.observation || tool.result}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Response Message Text with Streaming Caret */}
                                        {msg.text ? (
                                            <div
                                                className="mac-msg-text"
                                                style={{ whiteSpace: 'pre-wrap' }}
                                                dangerouslySetInnerHTML={{ __html: msg.text }}
                                            />
                                        ) : (
                                            msg.isStreaming && !msg.isThinking && !msg.reasoning && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', color: '#94a3b8' }}>
                                                    <span className="dot-live" style={{ width: 6, height: 6, display: 'inline-block' }} />
                                                    <span style={{ fontSize: '12px' }}>Connecting to AI model...</span>
                                                </div>
                                            )
                                        )}
                                        {msg.isStreaming && !msg.isThinking && msg.text && (
                                            <span className="streaming-caret" />
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isAiThinking && !chatMessages.some(m => m.isStreaming) && (
                                <div className="mac-msg-row assistant">
                                    <div className="mac-msg-bubble thinking">
                                        <span className="dot-live" style={{ width: 6, height: 6, display: 'inline-block' }} />
                                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Copilot is thinking...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Whisper Multilingual Language Bar & Recording State */}
                        <div className="mac-whisper-bar">
                            <div className="mac-lang-chips">
                                <span className="mac-whisper-badge">🧠 Whisper Local ASR</span>
                                <button
                                    className={`mac-lang-chip ${whisperLang === 'auto' ? 'active' : ''}`}
                                    title="Auto-detect English, Hindi, or Korean speech"
                                    onClick={() => setWhisperLang('auto')}
                                >
                                    🌐 Auto
                                </button>
                                <button
                                    className={`mac-lang-chip ${whisperLang === 'en' ? 'active' : ''}`}
                                    title="Transcribe English speech"
                                    onClick={() => setWhisperLang('en')}
                                >
                                    🇺🇸 English
                                </button>
                                <button
                                    className={`mac-lang-chip ${whisperLang === 'hi' ? 'active' : ''}`}
                                    title="Transcribe Hindi speech (हिन्दी)"
                                    onClick={() => setWhisperLang('hi')}
                                >
                                    🇮🇳 हिन्दी
                                </button>
                                <button
                                    className={`mac-lang-chip ${whisperLang === 'ko' ? 'active' : ''}`}
                                    title="Transcribe Korean speech (한국어)"
                                    onClick={() => setWhisperLang('ko')}
                                >
                                    🇰🇷 한국어
                                </button>
                            </div>
                            {isWhisperRecording && (
                                <div className="mac-recording-indicator">
                                    <span className="pulse-red-dot" />
                                    <span>Recording 16kHz PCM ({recordingTimer}s)...</span>
                                </div>
                            )}
                            {isWhisperTranscribing && (
                                <div className="mac-transcribing-indicator">
                                    <span className="pulse-cyan-dot" />
                                    <span>Whisper transcribing speech...</span>
                                </div>
                            )}
                        </div>

                        {/* Voice & NLP Input Bar */}
                        <div className="mac-chat-input-bar">
                            <div className="mac-mic-group">
                                <button
                                    className={`mac-mic-btn ${isWhisperRecording || isVoiceListening ? 'listening' : ''}`}
                                    title={isWhisperRecording ? "Recording 16kHz PCM... (Click to stop and transcribe via Whisper)" : `Record voice with local Whisper (${whisperLang.toUpperCase()})`}
                                    onClick={toggleWhisperRecording}
                                >
                                    {isWhisperRecording ? '🔴' : isWhisperTranscribing ? '⏳' : '🎙️'}
                                </button>
                                <button
                                    className="mac-mic-lang-badge"
                                    title="Click to cycle Whisper language: Auto ➔ English ➔ Hindi ➔ Korean"
                                    onClick={() => {
                                        const langs = ['auto', 'en', 'hi', 'ko'];
                                        const next = langs[(langs.indexOf(whisperLang) + 1) % langs.length];
                                        setWhisperLang(next);
                                    }}
                                >
                                    {whisperLang === 'auto' ? '🌐 Auto' : whisperLang === 'en' ? '🇺🇸 EN' : whisperLang === 'hi' ? '🇮🇳 HI' : '🇰🇷 KO'}
                                </button>
                            </div>
                            <input
                                type="text"
                                className="mac-input-field"
                                placeholder={isWhisperRecording ? `🔴 Recording voice (${recordingTimer}s)... Click mic to transcribe` : isWhisperTranscribing ? "🧠 Whisper local transcription in progress..." : `Ask AI or speak in ${whisperLang === 'hi' ? 'Hindi' : whisperLang === 'ko' ? 'Korean' : 'English'}...`}
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleProcessNlpCommand(chatInput);
                                }}
                            />
                            <button
                                className="mac-send-btn"
                                title="Send command (Enter)"
                                onClick={() => handleProcessNlpCommand(chatInput)}
                            >
                                ➤
                            </button>
                        </div>
                    </div>
                )}

                {/* 2. SHIELDS VIEW */}
                {activeModuleTab === 'shields' && (
                    <div className="mac-shields-view">
                        <div className="mac-shields-hero">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: '24px' }}>🦁</span>
                                <div>
                                    <h3 style={{ fontSize: '15px', color: '#fff', margin: 0 }}>Brave Shields Protection</h3>
                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>EasyList + uBlock Origin • Sub-Microsecond Rust Engine</span>
                                </div>
                            </div>
                            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>● Native Active</span>
                        </div>

                        {/* 4 Metric Tiles */}
                        <div className="mac-metrics-grid">
                            <div className="mac-metric-card">
                                <span className="metric-val">{shieldsStats.totalBlocked || 0}</span>
                                <span className="metric-lbl">TOTAL BLOCKED</span>
                            </div>
                            <div className="mac-metric-card">
                                <span className="metric-val">{shieldsStats.trackersBlocked || 0}</span>
                                <span className="metric-lbl">TRACKERS</span>
                            </div>
                            <div className="mac-metric-card">
                                <span className="metric-val">{shieldsStats.savedBytes ? Math.round(shieldsStats.savedBytes / 1024) + ' KB' : '0 KB'}</span>
                                <span className="metric-lbl">DATA SAVED</span>
                            </div>
                            <div className="mac-metric-card">
                                <span className="metric-val">{shieldsStats.savedTimeMs ? (shieldsStats.savedTimeMs / 1000).toFixed(2) + 's' : '0.00s'}</span>
                                <span className="metric-lbl">TIME SAVED</span>
                            </div>
                        </div>

                        {/* Custom Rule Input */}
                        <div className="mac-rule-bar">
                            <input
                                type="text"
                                className="mac-rule-input"
                                placeholder="Add ABP rule (e.g. ||ads.example.com^)..."
                                value={customRuleInput}
                                onChange={(e) => setCustomRuleInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && customRuleInput.trim()) {
                                        sendHudAction('add-shield-rule', { rule: customRuleInput.trim() });
                                        setCustomRuleInput('');
                                    }
                                }}
                            />
                            <button
                                className="mac-pill-btn"
                                onClick={() => {
                                    if (customRuleInput.trim()) {
                                        sendHudAction('add-shield-rule', { rule: customRuleInput.trim() });
                                        setCustomRuleInput('');
                                    }
                                }}
                            >
                                + Add Rule
                            </button>
                        </div>

                        {/* Recent Interceptions Stream */}
                        <div className="mac-events-container">
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                                Recent Zero-Byte Interceptions
                            </span>
                            <div className="mac-events-list">
                                {(!shieldsStats.recentEvents || shieldsStats.recentEvents.length === 0) ? (
                                    <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                                        No tracking requests detected yet.
                                    </div>
                                ) : (
                                    shieldsStats.recentEvents.map((ev, i) => (
                                        <div key={i} className="mac-event-item">
                                            <span className="event-tag">BLOCKED</span>
                                            <span className="event-url" title={ev.url}>{ev.url}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. TOOLS VIEW */}
                {activeModuleTab === 'tools' && (
                    <div className="mac-tools-view">
                        <div className="mac-sub-nav">
                            <button
                                className={`sub-btn ${activeToolTab === 'ax' ? 'active' : ''}`}
                                onClick={() => setActiveToolTab('ax')}
                            >
                                🌲 AX Tree & Grounding
                            </button>
                            <button
                                className={`sub-btn ${activeToolTab === 'grep' ? 'active' : ''}`}
                                onClick={() => setActiveToolTab('grep')}
                            >
                                🔍 In-Memory Grep
                            </button>
                            <button
                                className={`sub-btn ${activeToolTab === 'autofill' ? 'active' : ''}`}
                                onClick={() => setActiveToolTab('autofill')}
                            >
                                📝 Autofill
                            </button>
                            <button
                                className={`sub-btn ${activeToolTab === 'telemetry' ? 'active' : ''}`}
                                onClick={() => setActiveToolTab('telemetry')}
                            >
                                🔄 Telemetry
                            </button>
                        </div>

                        {/* AX Tree Sub-Tab */}
                        {activeToolTab === 'ax' && (
                            <div className="mac-tool-panel">
                                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                    <input
                                        type="text"
                                        className="mac-rule-input"
                                        placeholder="Filter marks (#1, button, submit)..."
                                        value={markFilterQuery}
                                        onChange={(e) => setMarkFilterQuery(e.target.value)}
                                    />
                                    <button className="mac-pill-btn" onClick={handleCopyAx}>
                                        {copiedAx ? '✓ Copied' : '📋 Copy'}
                                    </button>
                                    <button className="mac-pill-btn" onClick={() => sendHudAction('rescan-ax', { tabId: activeTabId })}>
                                        🔄 Rescan
                                    </button>
                                </div>
                                <pre className="mac-code-box">
                                    {getFilteredAxContent()}
                                </pre>
                            </div>
                        )}

                        {/* Grep Sub-Tab */}
                        {activeToolTab === 'grep' && (
                            <div className="mac-tool-panel">
                                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                    <input
                                        type="text"
                                        className="mac-rule-input"
                                        placeholder="Search elements by regex or text..."
                                        value={grepQuery}
                                        onChange={(e) => setGrepQuery(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && grepQuery.trim()) {
                                                sendHudAction('execute-grep', { query: grepQuery.trim(), tabId: activeTabId });
                                            }
                                        }}
                                    />
                                    <button
                                        className="mac-pill-btn"
                                        onClick={() => {
                                            if (grepQuery.trim()) sendHudAction('execute-grep', { query: grepQuery.trim(), tabId: activeTabId });
                                        }}
                                    >
                                        Execute Grep
                                    </button>
                                </div>
                                <div className="mac-code-box">
                                    {grepMatches.length === 0 ? (
                                        <div style={{ color: '#64748b', textAlign: 'center', padding: '16px' }}>
                                            No grep matches found. Type a query above.
                                        </div>
                                    ) : (
                                        grepMatches.map((m, i) => (
                                            <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: 'var(--font-mono)' }}>
                                                {typeof m === 'object' ? JSON.stringify(m) : String(m)}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Autofill Sub-Tab */}
                        {activeToolTab === 'autofill' && (
                            <div className="mac-tool-panel">
                                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: 12 }}>
                                    <h4 style={{ color: '#fff', fontSize: '13px', marginBottom: 4 }}>Autofill Engine (`components/autofill`)</h4>
                                    <p style={{ color: '#94a3b8', fontSize: '11px', margin: 0 }}>
                                        Populate checkout and login fields using in-process C++ AutofillProfile heuristics.
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="mac-pill-btn" onClick={() => sendHudAction('trigger-autofill', { tabId: activeTabId })}>
                                        ⚡ Execute Autofill Now
                                    </button>
                                    <button className="mac-pill-btn" onClick={() => sendHudAction('load-demo', { demoType: 'checkout' })}>
                                        Load Checkout Demo
                                    </button>
                                </div>
                                <div style={{ marginTop: 12, padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: 6, fontSize: '11px', color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                                    {autofillStatus}
                                </div>
                            </div>
                        )}

                        {/* Telemetry Sub-Tab */}
                        {activeToolTab === 'telemetry' && (
                            <div className="mac-tool-panel">
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Live In-Process Event Bus</span>
                                    <button className="mac-pill-btn" onClick={() => setTelemetryLogs([])}>
                                        Clear Logs
                                    </button>
                                </div>
                                <div className="mac-code-box">
                                    {telemetryLogs.length === 0 ? (
                                        <div style={{ color: '#64748b', textAlign: 'center', padding: '16px' }}>
                                            No events logged yet.
                                        </div>
                                    ) : (
                                        [...telemetryLogs].reverse().map((log, i) => (
                                            <div key={i} style={{ padding: '3px 0', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                                                <span style={{ color: '#64748b' }}>[{log.time}] </span>
                                                <span style={{ color: log.type === 'act' ? '#00e5ff' : log.type === 'verify' ? '#10b981' : '#e2e8f0' }}>
                                                    {log.msg}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
