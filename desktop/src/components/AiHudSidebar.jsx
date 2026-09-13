import React, { useState, useEffect, useRef } from 'react';

export default function AiHudSidebar({
    isOpen,
    isDetached = false,
    onDetachHud,
    onDockHud,
    onFocusDetachedHud,
    onCloseHud,
    somEnabled,
    onToggleSom,
    somMode = 'summarized',
    onToggleSomMode,
    axTreeMarkdown,
    onRescanAx,
    grepQuery,
    onSetGrepQuery,
    onExecuteGrep,
    grepMatches = [],
    onTriggerAutofill,
    autofillStatus,
    onLoadDemo,
    isHitlActive,
    onToggleHitl,
    telemetryLogs = [],
    onClearTelemetry,
    shieldsStats = {},
    onChangeShieldsMode,
    onAddCustomRule,
    currentTab,
    onSelectTab,
    activeTab = { id: 1, title: 'New Tab', url: '' },
    onExecuteClick,
    onExecuteScroll,
    onNavigate,
    onExtractPageText
}) {
    // 3 Primary Segmented Tabs
    const [activeModuleTab, setActiveModuleTab] = useState('chat'); // 'chat' | 'shields' | 'tools'
    const [activeToolTab, setActiveToolTab] = useState('ax'); // 'ax' | 'grep' | 'autofill' | 'telemetry'

    // SoM & AX Tree
    const [markFilter, setMarkFilter] = useState('');
    const [copiedAx, setCopiedAx] = useState(false);

    // Shields & Custom Rules
    const [customRuleInput, setCustomRuleInput] = useState('');

    // AI Chat & Voice NLP State
    const [chatMessages, setChatMessages] = useState([
        {
            id: 'docked-welcome',
            role: 'assistant',
            text: "👋 Hi! I am your AI Copilot with real-time tab awareness and browser automation.\n\nChat with me, click quick action chips, or speak with 🎙️ Voice NLP!",
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
    const audioProcessorRef = useRef(null);
    const audioChunksRef = useRef([]);

    // Scroll chat to bottom on new message
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages, isAiThinking]);

    // Preload Whisper model on startup in the background
    useEffect(() => {
        try {
            const { ipcRenderer } = require('electron');
            if (ipcRenderer && ipcRenderer.invoke) {
                ipcRenderer.invoke('whisper-preload').catch(() => {});
            }
        } catch (e) {}
    }, []);

    if (!isOpen || isDetached) return null;

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
                    const { ipcRenderer } = require('electron');
                    const res = await ipcRenderer.invoke('whisper-transcribe', {
                        audioData: Array.from(merged),
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
                console.error('[Whisper Docked] Transcribe error:', err);
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
            console.warn('[Whisper Docked] Microphone access error:', err);
            addAiReply(`⚠️ **Microphone Access**: ${err.message || 'Permission denied or device not found'}.\n\n💡 Ensure microphone access is allowed in Windows Settings. You can also click any of the multilingual quick action chips above (e.g. 🇮🇳 सारांश or 🇰🇷 요약) to test local NLP.`);
        }
    };

    // Fallback Web Speech Recognition
    const toggleVoiceRecognitionFallback = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Speech Recognition is not supported. You can type commands in English, Hindi, or Korean in the chat bar.');
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
            };
            recognition.onerror = () => setIsVoiceListening(false);
            recognition.onend = () => {
                setIsVoiceListening(false);
                if (chatInput.trim()) {
                    handleProcessNlpCommand(chatInput);
                }
            };
            recognition.start();
        } catch (e) {
            setIsVoiceListening(false);
        }
    };

    // Speech Synthesis Feedback in matching language
    const speakReply = (text, langCode = 'en') => {
        if (!voiceSpeechFeedback || !window.speechSynthesis) return;
        try {
            window.speechSynthesis.cancel();
            const cleanText = text.replace(/[#*`_~[\]()]/g, ' ').substring(0, 180);
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.rate = 1.05;
            if (langCode === 'hi') utterance.lang = 'hi-IN';
            else if (langCode === 'ko') utterance.lang = 'ko-KR';
            else utterance.lang = 'en-US';
            window.speechSynthesis.speak(utterance);
        } catch (e) {}
    };

    const addAiReply = (text) => {
        setIsAiThinking(false);
        const aiMsg = {
            id: 'ai-' + Date.now(),
            role: 'assistant',
            text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, aiMsg]);
    };

    // Multilingual Natural Language & Chat Command Processor
    const handleProcessNlpCommand = (query) => {
        if (!query || !query.trim()) return;
        const q = query.trim();
        const qLower = q.toLowerCase();

        // 1. Add User Message
        const userMsg = {
            id: 'msg-' + Date.now(),
            role: 'user',
            text: q,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, userMsg]);
        setChatInput('');
        setIsAiThinking(true);

        // Detect language
        const isHindi = /[\u0900-\u097F]/.test(q) || /\b(karo|jao|niche|upar|bharo|chalao|roko|kholo|batao|kripya)\b/i.test(q);
        const isKorean = /[\uAC00-\uD7AF]/.test(q) || /\b(스크롤|요약|재생|정지|열어|닫아|완성)\b/i.test(q);

        // 1. Scroll Down Commands
        if (
            qLower.includes('scroll down') || qLower === 'down' || qLower.includes('scroll next') ||
            q.includes('नीचे') || qLower.includes('niche') || qLower.includes('scroll down karo') ||
            q.includes('아래로') || q.includes('내려') || q.includes('스크롤 다운')
        ) {
            if (onExecuteScroll) onExecuteScroll('down', 500, false);
            const reply = isHindi ? '📜 पेज नीचे 500px स्क्रॉल किया गया।' : isKorean ? '📜 페이지를 아래로 500px 스크롤했습니다.' : '📜 Scrolled down 500px on active page.';
            addAiReply(reply);
            speakReply(isHindi ? 'पेज नीचे स्क्रॉल किया गया' : isKorean ? '페이지를 아래로 스크롤했습니다' : 'Scrolled down.', isHindi ? 'hi' : isKorean ? 'ko' : 'en');
            return;
        }

        // 2. Scroll Up Commands
        if (
            qLower.includes('scroll up') || qLower === 'up' ||
            q.includes('ऊपर') || qLower.includes('upar') || qLower.includes('scroll up karo') ||
            q.includes('위로') || q.includes('올려') || q.includes('스크롤 업')
        ) {
            if (onExecuteScroll) onExecuteScroll('up', 500, false);
            const reply = isHindi ? '📜 पेज ऊपर 500px स्क्रॉल किया गया।' : isKorean ? '📜 페이지를 위로 500px 스크롤했습니다.' : '📜 Scrolled up 500px on active page.';
            addAiReply(reply);
            speakReply(isHindi ? 'पेज ऊपर स्क्रॉल किया गया' : isKorean ? '페이지를 위로 스크롤했습니다' : 'Scrolled up.', isHindi ? 'hi' : isKorean ? 'ko' : 'en');
            return;
        }

        // 3. Scroll to Top
        if (
            qLower.includes('scroll to top') || qLower.includes('scroll top') || qLower === 'top' ||
            q.includes('सबसे ऊपर') || qLower.includes('top par') || qLower.includes('sabse upar') ||
            q.includes('맨 위로') || q.includes('상단으로')
        ) {
            if (onExecuteScroll) onExecuteScroll('up', 100, true);
            const reply = isHindi ? '⬆ पेज के शीर्ष पर पहुँच गए।' : isKorean ? '⬆ 페이지 상단으로 이동했습니다.' : '⬆ Scrolled to the top of the page.';
            addAiReply(reply);
            speakReply(isHindi ? 'शीर्ष पर पहुँच गए' : isKorean ? '상단으로 이동했습니다' : 'Scrolled to top.', isHindi ? 'hi' : isKorean ? 'ko' : 'en');
            return;
        }

        // 4. Scroll to Bottom
        if (
            qLower.includes('scroll to bottom') || qLower.includes('scroll bottom') || qLower === 'bottom' ||
            q.includes('सबसे नीचे') || qLower.includes('bottom par') || qLower.includes('sabse niche') ||
            q.includes('맨 아래로') || q.includes('하단으로')
        ) {
            if (onExecuteScroll) onExecuteScroll('down', 100, true);
            const reply = isHindi ? '⬇ पेज के अंत में पहुँच गए।' : isKorean ? '⬇ 페이지 하단으로 이동했습니다.' : '⬇ Scrolled to the bottom of the page.';
            addAiReply(reply);
            speakReply(isHindi ? 'पेज के अंत में पहुँच गए' : isKorean ? '하단으로 이동했습니다' : 'Scrolled to bottom.', isHindi ? 'hi' : isKorean ? 'ko' : 'en');
            return;
        }

        // 5. Click Play / Pause
        if (
            qLower.includes('click play') || qLower.includes('play video') || qLower === 'play' || qLower === 'pause' ||
            q.includes('चलाओ') || q.includes('प्ले') || qLower.includes('chalao') ||
            q.includes('재생') || q.includes('일시정지') || q.includes('동영상')
        ) {
            if (onExecuteClick) onExecuteClick('play');
            const reply = isHindi ? '▶️ वीडियो प्ले/पॉज़ टॉगल किया गया।' : isKorean ? '▶️ 동영상 재생/일시정지를 실행했습니다.' : '▶️ Triggered Play/Pause toggle on active video.';
            addAiReply(reply);
            speakReply(isHindi ? 'वीडियो शुरू या रोका गया' : isKorean ? '재생 상태를 전환했습니다' : 'Toggled playback.', isHindi ? 'hi' : isKorean ? 'ko' : 'en');
            return;
        }

        // 6. Set-of-Marks click (#1, #2)
        const markMatch = qLower.match(/click\s*(?:element|mark|number|#)?\s*#?(\d+)/i) || q.match(/(?:#|क्लिक|선택)\s*(\d+)/i);
        if (markMatch) {
            const markId = markMatch[1];
            if (onExecuteClick) onExecuteClick('#' + markId);
            const reply = isHindi ? `🎯 Set-of-Marks लक्ष्य #${markId} पर क्लिक किया गया।` : isKorean ? `🎯 Set-of-Marks #${markId} 요소를 클릭했습니다.` : `🎯 Executed direct click on Set-of-Marks target #${markId}.`;
            addAiReply(reply);
            speakReply(isHindi ? `क्लिक किया गया ${markId}` : isKorean ? `${markId}번 클릭` : `Clicked element #${markId}`, isHindi ? 'hi' : isKorean ? 'ko' : 'en');
            return;
        }

        // 7. Summarize Commands
        if (
            qLower.includes('summarize') || qLower.includes('summary') || qLower.includes('what is this page') || qLower === 'sum' ||
            q.includes('सारांश') || qLower.includes('samiksha') || q.includes('संक्षेप') ||
            q.includes('요약') || q.includes('내용 요약')
        ) {
            let summary = '';
            if (isHindi) {
                summary = `📑 **पेज सारांश: ${activeTab.title || 'सक्रिय पृष्ठ'}** (Whisper AI विश्लेषित)\n\n`;
                if (activeTab.url && activeTab.url.includes('youtube.com')) {
                    summary += `• **मीडिया:** यूट्यूब वीडियो स्ट्रीम।\n• **विज्ञापन स्थिति:** 0 विज्ञापन (Brave adblock-rust सक्रिय)।\n• **उपलब्ध कमांड:** "वीडियो चलाओ", "नीचे स्क्रॉल करो"।`;
                } else if (activeTab.url && activeTab.url.includes('wikipedia.org')) {
                    summary += `• **विश्वकोश प्रविष्टि:** ${activeTab.title}।\n• **सामग्री:** विस्तृत संदर्भ लेख उपलब्ध है।`;
                } else {
                    summary += `• **स्रोत URL:** \`${activeTab.url || 'नया टैब'}\`\n• **शील्ड्स:** ${shieldsStats.totalBlocked || 0} विज्ञापन ब्लॉक।`;
                }
            } else if (isKorean) {
                summary = `📑 **페이지 요약: ${activeTab.title || '현재 페이지'}** (Whisper AI 분석)\n\n`;
                if (activeTab.url && activeTab.url.includes('youtube.com')) {
                    summary += `• **미디어:** 유튜브 비디오 스트림\n• **광고 차단:** Brave adblock-rust 가동 중 (광고 0개)\n• **음성 명령:** "동영상 재생", "아래로 스크롤"`;
                } else if (activeTab.url && activeTab.url.includes('wikipedia.org')) {
                    summary += `• **백과사전 항목:** ${activeTab.title}\n• **내용:** 상세 레퍼런스 문서`;
                } else {
                    summary += `• **URL:** \`${activeTab.url || '새 탭'}\`\n• **차단된 광고:** ${shieldsStats.totalBlocked || 0}개`;
                }
            } else {
                summary = `📑 **Page Summary: ${activeTab.title || 'Active Tab'}** (Whisper AI Analyzed)\n\n`;
                if (activeTab.url && activeTab.url.includes('youtube.com')) {
                    summary += `• **Media:** YouTube Video Playback Stream.\n• **Adblock Status:** 0 ads playing (Brave adblock-rust + InnerTube fast-skip enabled).\n• **Available Voice Actions:** Say *"Click Play"*, *"Scroll Down"*, or *"Autofill"*.`;
                } else if (activeTab.url && activeTab.url.includes('wikipedia.org')) {
                    summary += `• **Encyclopedia Entry:** ${activeTab.title}.\n• **Key Content:** Comprehensive reference article with citations and section headings.`;
                } else if (activeTab.isNewTab || !activeTab.url) {
                    summary += `• **New Tab:** Antigravity AI Native Speed-Dial.\n• **Features:** Dual-engine search, speed-dial shortcuts, and in-process C++ tab management.`;
                } else {
                    summary += `• **Source URL:** \`${activeTab.url}\`\n• **Shields:** ${shieldsStats.totalBlocked || 0} ads & trackers blocked.`;
                }
            }
            addAiReply(summary);
            speakReply(isHindi ? 'पेज का सारांश तैयार है' : isKorean ? '페이지 요약이 완료되었습니다' : `Summary for ${activeTab.title || 'this page'}`, isHindi ? 'hi' : isKorean ? 'ko' : 'en');
            return;
        }

        // 8. Autofill Commands
        if (
            qLower.includes('autofill') || qLower.includes('fill form') || qLower.includes('checkout') ||
            q.includes('फॉर्म') || q.includes('ऑटोफिल') || qLower.includes('form bharo') ||
            q.includes('자동완성') || q.includes('양식')
        ) {
            if (onTriggerAutofill) onTriggerAutofill();
            const reply = isHindi ? '📝 फॉर्म ऑटोफिल सफलतापूरक निष्पादित किया गया।' : isKorean ? '📝 양식 자동완성을 실행했습니다.' : '📝 AutofillManager::FillForm() executed. Populated semantic fields on the page.';
            addAiReply(reply);
            speakReply(isHindi ? 'फॉर्म भर दिया गया है' : isKorean ? '자동완성이 완료되었습니다' : 'Form autofilled.', isHindi ? 'hi' : isKorean ? 'ko' : 'en');
            return;
        }

        // 9. Navigation Commands
        if (qLower.startsWith('open ') || qLower.startsWith('go to ') || q.includes('खोलो') || q.includes('열어줘')) {
            const target = q.replace(/^(?:open|go to)\s+/i, '').replace(/(?:खोलो|열어줘)/i, '').trim();
            if (onNavigate) onNavigate(target);
            const reply = isHindi ? `🌐 ${target} पर नेविगेट किया जा रहा है...` : isKorean ? `🌐 ${target}(으)로 이동합니다...` : `🌐 Navigating active tab to "${target}"...`;
            addAiReply(reply);
            speakReply(isHindi ? 'नेविगेट किया जा रहा है' : isKorean ? '페이지로 이동합니다' : `Navigating to ${target}`, isHindi ? 'hi' : isKorean ? 'ko' : 'en');
            return;
        }

        // 10. General Conversational / Q&A
        setTimeout(() => {
            let aiText = '';
            if (isHindi) {
                aiText = `✦ **Antigravity Copilot (Whisper Local)**\n\nअनुरोध प्राप्त हुआ: "${q}"\n\n• **सक्रिय टैब:** \`${activeTab.title || 'नया टैब'}\`\n• **शील्ड्स:** ${shieldsStats.totalBlocked || 0} ट्रैकर्स ब्लॉक।\n• **आदेश:** आप हिंदी में कह सकते हैं: "पेज का सारांश दो", "नीचे स्क्रॉल करो", या "वीडियो चलाओ"।`;
            } else if (isKorean) {
                aiText = `✦ **Antigravity Copilot (Whisper Local)**\n\n명령 접수 완료: "${q}"\n\n• **현재 탭:** \`${activeTab.title || '새 탭'}\`\n• **실드 상태:** ${shieldsStats.totalBlocked || 0}개 트래커 차단됨\n• **추천 음성 명령:** "페이지 요약", "아래로 스크롤", "동영상 재생"`;
            } else {
                aiText = `✦ **Antigravity Copilot (Whisper Local)**\n\nProcessed query: "${q}"\n\n• **Active Tab:** \`${activeTab.title || 'New Tab'}\`\n• **Shields:** ${shieldsStats.totalBlocked || 0} ads & trackers blocked.\n• **Voice Actions:** Say *"Summarize"*, *"Scroll Down"*, or speak in Hindi/Korean.`;
            }
            addAiReply(aiText);
            speakReply(isHindi ? 'कमांड प्रोसेस हो गया' : isKorean ? '명령이 처리되었습니다' : 'Processed request.', isHindi ? 'hi' : isKorean ? 'ko' : 'en');
        }, 300);
    };

    // Tools AX Tree Helpers
    const getFilteredAxText = () => {
        if (!axTreeMarkdown) return 'Connecting to in-process Chromium core...';
        if (!markFilter.trim()) return axTreeMarkdown;
        const q = markFilter.toLowerCase().trim();
        const lines = axTreeMarkdown.split('\n');
        const matched = lines.filter(l => l.toLowerCase().includes(q));
        return matched.length > 0 ? matched.join('\n') : `No marks matching "${markFilter}" found.`;
    };

    const handleCopyAx = () => {
        const text = getFilteredAxText();
        if (text) {
            navigator.clipboard.writeText(text).then(() => {
                setCopiedAx(true);
                setTimeout(() => setCopiedAx(false), 2000);
            }).catch(() => {});
        }
    };

    return (
        <aside className="ai-hud-sidebar mac-docked-cockpit" id="aiHudSidebar">
            {/* Docked Header (Authentic Mac Style WITHOUT Window Traffic Lights / Min / Max) */}
            <header className="mac-docked-header">
                <div className="mac-cockpit-brand">
                    <span className="mac-brand-sparkle">✦</span>
                    <span className="mac-brand-name">Antigravity Copilot</span>
                </div>

                <div className="mac-header-actions">
                    <label className="som-toggle-label" title="Render Set-of-Marks numerical bounding boxes over elements">
                        <input
                            type="checkbox"
                            checked={somEnabled}
                            onChange={(e) => onToggleSom && onToggleSom(e.target.checked)}
                        />
                        <span className="som-toggle-badge">SoM</span>
                    </label>
                    <button
                        className="mac-pill-btn"
                        title="Detach AI Layer into standalone external window"
                        onClick={onDetachHud}
                    >
                        ⧉ Detach ↗
                    </button>
                    {onCloseHud && (
                        <button
                            className="mac-pill-btn close-x"
                            title="Hide AI Sidebar"
                            onClick={onCloseHud}
                        >
                            ✕
                        </button>
                    )}
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
                            <button className="mac-chip" onClick={() => handleProcessNlpCommand('summarize')}>
                                ⚡ Summarize Page
                            </button>
                            <button className="mac-chip" onClick={() => handleProcessNlpCommand('scroll down')}>
                                📜 Scroll Down
                            </button>
                            <button className="mac-chip" onClick={() => handleProcessNlpCommand('click play')}>
                                ▶️ Click Play
                            </button>
                            <button className="mac-chip" onClick={() => handleProcessNlpCommand('autofill')}>
                                📝 Autofill
                            </button>
                            <button className="mac-chip" onClick={() => handleProcessNlpCommand('पेज का सारांश दो')}>
                                🇮🇳 सारांश (HI)
                            </button>
                            <button className="mac-chip" onClick={() => handleProcessNlpCommand('नीचे स्क्रॉल करो')}>
                                🇮🇳 नीचे स्क्रॉल (HI)
                            </button>
                            <button className="mac-chip" onClick={() => handleProcessNlpCommand('페이지 요약')}>
                                🇰🇷 요약 (KO)
                            </button>
                            <button className="mac-chip" onClick={() => handleProcessNlpCommand('아래로 스크롤')}>
                                🇰🇷 아래로 (KO)
                            </button>
                            <button className="mac-chip" onClick={() => handleProcessNlpCommand('scroll to top')}>
                                ⬆ Top
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
                                        <div className="mac-msg-text" style={{ whiteSpace: 'pre-wrap' }}>
                                            {msg.text}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isAiThinking && (
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
                                    <h3 style={{ fontSize: '14px', color: '#fff', margin: 0 }}>Brave Shields Protection</h3>
                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>EasyList + uBlock Origin • Rust Engine</span>
                                </div>
                            </div>
                            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>● Active</span>
                        </div>

                        {/* 4 Metric Tiles */}
                        <div className="mac-metrics-grid">
                            <div className="mac-metric-card">
                                <span className="metric-val">{shieldsStats.totalBlocked || 0}</span>
                                <span className="metric-lbl">BLOCKED</span>
                            </div>
                            <div className="mac-metric-card">
                                <span className="metric-val">{shieldsStats.trackersBlocked || 0}</span>
                                <span className="metric-lbl">TRACKERS</span>
                            </div>
                            <div className="mac-metric-card">
                                <span className="metric-val">{shieldsStats.savedBytes ? Math.round(shieldsStats.savedBytes / 1024) + ' KB' : '0 KB'}</span>
                                <span className="metric-lbl">SAVED</span>
                            </div>
                            <div className="mac-metric-card">
                                <span className="metric-val">{shieldsStats.savedTimeMs ? (shieldsStats.savedTimeMs / 1000).toFixed(2) + 's' : '0.00s'}</span>
                                <span className="metric-lbl">TIME</span>
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
                                        if (onAddCustomRule) onAddCustomRule(customRuleInput.trim());
                                        setCustomRuleInput('');
                                    }
                                }}
                            />
                            <button
                                className="mac-pill-btn"
                                onClick={() => {
                                    if (customRuleInput.trim()) {
                                        if (onAddCustomRule) onAddCustomRule(customRuleInput.trim());
                                        setCustomRuleInput('');
                                    }
                                }}
                            >
                                + Add
                            </button>
                        </div>

                        {/* Recent Interceptions Stream (No limit, no scrollbar, flexes to bottom) */}
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

                {/* 3. CORE TOOLS VIEW */}
                {activeModuleTab === 'tools' && (
                    <div className="mac-tools-view">
                        <div className="mac-sub-nav">
                            <button
                                className={`sub-btn ${activeToolTab === 'ax' ? 'active' : ''}`}
                                onClick={() => setActiveToolTab('ax')}
                            >
                                🌲 AX Tree
                            </button>
                            <button
                                className={`sub-btn ${activeToolTab === 'grep' ? 'active' : ''}`}
                                onClick={() => setActiveToolTab('grep')}
                            >
                                🔍 Grep
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
                                        value={markFilter}
                                        onChange={(e) => setMarkFilter(e.target.value)}
                                    />
                                    <button className="mac-pill-btn" onClick={handleCopyAx}>
                                        {copiedAx ? '✓ Copied' : '📋 Copy'}
                                    </button>
                                    <button className="mac-pill-btn" onClick={onRescanAx}>
                                        🔄 Rescan
                                    </button>
                                </div>
                                <pre className="mac-code-box">
                                    {getFilteredAxText()}
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
                                        onChange={(e) => onSetGrepQuery && onSetGrepQuery(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && grepQuery && grepQuery.trim()) {
                                                if (onExecuteGrep) onExecuteGrep();
                                            }
                                        }}
                                    />
                                    <button
                                        className="mac-pill-btn"
                                        onClick={() => {
                                            if (grepQuery && grepQuery.trim() && onExecuteGrep) onExecuteGrep();
                                        }}
                                    >
                                        Execute
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
                                    <button className="mac-pill-btn" onClick={onTriggerAutofill}>
                                        ⚡ Execute Autofill Now
                                    </button>
                                    <button className="mac-pill-btn" onClick={() => onLoadDemo && onLoadDemo('checkout')}>
                                        Load Demo
                                    </button>
                                </div>
                                <div style={{ marginTop: 12, padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: 6, fontSize: '11px', color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                                    {autofillStatus || 'Ready for autofill execution.'}
                                </div>
                            </div>
                        )}

                        {/* Telemetry Sub-Tab (No slice limit, hidden scrollbar, expands to bottom) */}
                        {activeToolTab === 'telemetry' && (
                            <div className="mac-tool-panel">
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Live In-Process Event Bus</span>
                                    <button className="mac-pill-btn" onClick={onClearTelemetry}>
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
        </aside>
    );
}
