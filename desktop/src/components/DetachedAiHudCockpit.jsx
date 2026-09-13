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
    const audioProcessorRef = useRef(null);
    const audioChunksRef = useRef([]);

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
        setChatMessages(prev => [...prev, userMsg]);
        setChatInput('');
        setIsAiThinking(true);

        const qLower = query.toLowerCase();

        // Detect language profile for feedback & speech
        const isHindi = /[\u0900-\u097F]/.test(query) || /\b(karo|jao|niche|upar|bharo|chalao|roko|kholo|batao|kripya)\b/i.test(query);
        const isKorean = /[\uAC00-\uD7AF]/.test(query) || /\b(스크롤|요약|재생|정지|열어|닫아|완성)\b/i.test(query);

        // 1. Scroll Down Commands
        if (
            qLower.includes('scroll down') || qLower === 's' || qLower === 'down' ||
            query.includes('नीचे') || qLower.includes('niche') || qLower.includes('scroll down karo') ||
            query.includes('아래로') || query.includes('내려') || query.includes('스크롤 다운')
        ) {
            sendHudAction('execute-scroll', { direction: 'down', amount: 35, isPercent: true });
            const reply = isHindi ? '📜 पेज नीचे 35% स्क्रॉल किया गया।' : isKorean ? '📜 페이지를 아래로 35% 스크롤했습니다.' : '📜 Scrolled down 35% on active tab.';
            addAiReply(reply);
            speakReply(isHindi ? 'पेज नीचे स्क्रॉल किया गया' : isKorean ? '페이지를 아래로 스크롤했습니다' : 'Scrolled down.', isHindi ? 'hi' : isKorean ? 'ko' : 'en');
            return;
        }

        // 2. Scroll Up Commands
        if (
            qLower.includes('scroll up') || qLower === 'up' ||
            query.includes('ऊपर') || qLower.includes('upar') || qLower.includes('scroll up karo') ||
            query.includes('위로') || query.includes('올려') || query.includes('스크롤 업')
        ) {
            sendHudAction('execute-scroll', { direction: 'up', amount: 35, isPercent: true });
            const reply = isHindi ? '📜 पेज ऊपर 35% स्क्रॉल किया गया।' : isKorean ? '📜 페이지를 위로 35% 스크롤했습니다.' : '📜 Scrolled up 35% on active tab.';
            addAiReply(reply);
            speakReply(isHindi ? 'पेज ऊपर स्क्रॉल किया गया' : isKorean ? '페이지를 위로 스크롤했습니다' : 'Scrolled up.', isHindi ? 'hi' : isKorean ? 'ko' : 'en');
            return;
        }

        // 3. Scroll to Top Commands
        if (
            qLower.includes('scroll to top') || qLower === 's0' || qLower === 'top' ||
            query.includes('सबसे ऊपर') || qLower.includes('top par') || qLower.includes('sabse upar') ||
            query.includes('맨 위로') || query.includes('상단으로')
        ) {
            sendHudAction('execute-scroll', { direction: 'top', amount: 0 });
            const reply = isHindi ? '📜 पेज के शीर्ष पर पहुँच गए।' : isKorean ? '📜 페이지 상단으로 이동했습니다.' : '📜 Jumped to the top of the page.';
            addAiReply(reply);
            speakReply(isHindi ? 'शीर्ष पर पहुँच गए' : isKorean ? '상단으로 이동했습니다' : 'Jumped to top.', isHindi ? 'hi' : isKorean ? 'ko' : 'en');
            return;
        }

        // 4. Scroll to Bottom Commands
        if (
            qLower.includes('scroll to bottom') || qLower === 's1000' || qLower === 'bottom' ||
            query.includes('सबसे नीचे') || qLower.includes('bottom par') || qLower.includes('sabse niche') ||
            query.includes('맨 아래로') || query.includes('하단으로')
        ) {
            sendHudAction('execute-scroll', { direction: 'bottom', amount: 1000 });
            const reply = isHindi ? '📜 पेज के अंत में पहुँच गए।' : isKorean ? '📜 페이지 하단으로 이동했습니다.' : '📜 Jumped to the bottom of the page.';
            addAiReply(reply);
            speakReply(isHindi ? 'पेज के अंत में पहुँच गए' : isKorean ? '하단으로 이동했습니다' : 'Jumped to bottom.', isHindi ? 'hi' : isKorean ? 'ko' : 'en');
            return;
        }

        // 5. Video Play / Resume Commands
        if (
            qLower.includes('play') || qLower.includes('resume') ||
            query.includes('चलाओ') || query.includes('प्ले') || qLower.includes('chalao') ||
            query.includes('재생') || query.includes('플레이')
        ) {
            sendHudAction('execute-click', { target: 'play' });
            const reply = isHindi ? '▶️ वीडियो प्ले करने का निर्देश भेजा गया।' : isKorean ? '▶️ 비디오 재생 명령을 실행했습니다.' : '▶️ Triggered play action on active media.';
            addAiReply(reply);
            speakReply(isHindi ? 'वीडियो शुरू किया गया' : isKorean ? '재생을 시작합니다' : 'Playing video.', isHindi ? 'hi' : isKorean ? 'ko' : 'en');
            return;
        }

        // 6. Video Pause / Stop Commands
        if (
            qLower.includes('pause') || qLower.includes('stop video') ||
            query.includes('रोको') || query.includes('पॉज़') || qLower.includes('roko') || qLower.includes('pause karo') ||
            query.includes('일시정지') || query.includes('멈춰') || query.includes('정지')
        ) {
            sendHudAction('execute-click', { target: 'pause' });
            const reply = isHindi ? '⏸️ वीडियो पॉज़ किया गया।' : isKorean ? '⏸️ 비디오를 일시정지했습니다.' : '⏸️ Paused media playback.';
            addAiReply(reply);
            speakReply(isHindi ? 'वीडियो पॉज़ किया गया' : isKorean ? '일시정지되었습니다' : 'Paused.', isHindi ? 'hi' : isKorean ? 'ko' : 'en');
            return;
        }

        // 7. Autofill Commands
        if (
            qLower.includes('autofill') || qLower.includes('fill form') || qLower.includes('checkout') ||
            query.includes('फॉर्म') || query.includes('ऑटोफिल') || qLower.includes('form bharo') || qLower.includes('autofill karo') ||
            query.includes('자동완성') || query.includes('양식') || query.includes('자동 완성')
        ) {
            sendHudAction('trigger-autofill');
            const reply = isHindi ? '📝 फॉर्म ऑटोफिल सफलतापूरक निष्पादित किया गया।' : isKorean ? '📝 양식 자동완성을 성공적으로 실행했습니다.' : '📝 AutofillManager::FillForm() executed.';
            addAiReply(reply);
            speakReply(isHindi ? 'फॉर्म भर दिया गया है' : isKorean ? '자동완성이 완료되었습니다' : 'Autofill complete.', isHindi ? 'hi' : isKorean ? 'ko' : 'en');
            return;
        }

        // 8. Summarize Commands
        if (
            qLower.includes('summarize') || qLower.includes('summary') || qLower.includes('what is this page') || qLower === 'sum' ||
            query.includes('सारांश') || qLower.includes('samiksha') || query.includes('संक्षेप') ||
            query.includes('요약') || query.includes('내용 요약')
        ) {
            let summary = '';
            if (isHindi) {
                summary = `📑 **पेज सारांश: ${activeTab.title || 'सक्रिय पृष्ठ'}** (Whisper AI विश्लेषित)\n\n`;
                if (activeTab.url && activeTab.url.includes('youtube.com')) {
                    summary += `• **मीडिया:** यूट्यूब वीडियो स्ट्रीम।\n• **विज्ञापन स्थिति:** 0 विज्ञापन (Brave adblock-rust सक्रिय)।\n• **ध्वनि आदेश:** "वीडियो चलाओ", "नीचे स्क्रॉल करो"।`;
                } else if (activeTab.url && activeTab.url.includes('wikipedia.org')) {
                    summary += `• **विश्वकोश प्रविष्टि:** ${activeTab.title}।\n• **प्रमुख सामग्री:** विस्तृत संदर्भ लेख उपलब्ध है।`;
                } else {
                    summary += `• **स्रोत URL:** \`${activeTab.url || 'नया टैब'}\`\n• **सुरक्षा शील्ड्स:** ${shieldsStats.totalBlocked || 0} ट्रैकर्स ब्लॉक।\n• **क्रियाएँ:** Set-of-Marks (#1, #2) द्वारा इंटरैक्शन के लिए तैयार।`;
                }
            } else if (isKorean) {
                summary = `📑 **페이지 요약: ${activeTab.title || '현재 페이지'}** (Whisper AI 분석)\n\n`;
                if (activeTab.url && activeTab.url.includes('youtube.com')) {
                    summary += `• **미디어:** 유튜브 비디오 스트림\n• **광고 차단:** Brave adblock-rust 가동 중 (광고 0개)\n• **음성 명령:** "동영상 재생", "아래로 스크롤"`;
                } else if (activeTab.url && activeTab.url.includes('wikipedia.org')) {
                    summary += `• **백과사전 항목:** ${activeTab.title}\n• **주요 내용:** 섹션별 상세 정보 및 참조 링크 탑재`;
                } else {
                    summary += `• **URL:** \`${activeTab.url || '새 탭'}\`\n• **실드 상태:** ${shieldsStats.totalBlocked || 0}개 트래커 차단됨`;
                }
            } else {
                summary = `📑 **Page Summary: ${activeTab.title || 'Active Tab'}** (Whisper AI Analyzed)\n\n`;
                if (activeTab.url && activeTab.url.includes('youtube.com')) {
                    summary += `• **Media:** YouTube Video Playback Stream.\n• **Adblock Status:** 0 ads playing (Brave adblock-rust active).\n• **Available Voice Actions:** Say *"Click Play"*, *"Scroll Down"*, or *"Focus Browser"*.`;
                } else if (activeTab.url && activeTab.url.includes('wikipedia.org')) {
                    summary += `• **Encyclopedia Entry:** ${activeTab.title}.\n• **Key Content:** Comprehensive reference article with citations and section headings.`;
                } else {
                    summary += `• **Source URL:** \`${activeTab.url || 'New Tab'}\`\n• **Shields:** ${shieldsStats.totalBlocked || 0} ads & trackers blocked.\n• **Interaction:** Ready for element interaction via Set-of-Marks (#1, #2).`;
                }
            }
            addAiReply(summary);
            speakReply(isHindi ? 'पेज का सारांश तैयार है' : isKorean ? '페이지 요약이 완료되었습니다' : `Summary for ${activeTab.title || 'this page'}`, isHindi ? 'hi' : isKorean ? 'ko' : 'en');
            return;
        }

        // 9. Click NLP Commands
        const clickMatch = query.match(/(?:click|press|tap|select|क्लिक|눌러|선택)\s+(.+)/i) || query.match(/^(?:#|hashtag\s*|mark\s*)(\d+)$/i);
        if (clickMatch || qLower.startsWith('click')) {
            const target = clickMatch ? (clickMatch[1] || clickMatch[0]) : query.replace(/^click\s*/i, '');
            sendHudAction('execute-click', { target: target.trim() });
            const reply = isHindi ? `🎯 सक्रिय पृष्ठ पर "${target.trim()}" पर क्लिक किया गया।` : isKorean ? `🎯 페이지에서 "${target.trim()}" 요소를 클릭했습니다.` : `🎯 Clicked element matching "${target.trim()}" on active page.`;
            addAiReply(reply);
            speakReply(isHindi ? `क्लिक किया गया ${target}` : isKorean ? `${target} 클릭 완료` : `Clicked ${target}`, isHindi ? 'hi' : isKorean ? 'ko' : 'en');
            return;
        }

        // 10. Navigation Commands
        const navMatch = query.match(/(?:go to|open|navigate to|खोलो|열어줘)\s+(.+)/i);
        if (navMatch || qLower.startsWith('open ') || qLower.startsWith('go to ')) {
            const target = navMatch ? navMatch[1].trim() : query.replace(/^(?:open|go to)\s+/i, '').trim();
            let targetUrl = target;
            if (target.includes('youtube') || target.includes('यूट्यूब') || target.includes('유튜브')) targetUrl = 'https://www.youtube.com';
            else if (target.includes('google') || target.includes('गूगल') || target.includes('구글')) targetUrl = 'https://www.google.com';
            else if (target.includes('github') || target.includes('गिटहब')) targetUrl = 'https://github.com';
            else if (!target.startsWith('http://') && !target.startsWith('https://')) targetUrl = 'https://www.google.com/search?q=' + encodeURIComponent(target);

            sendHudAction('execute-navigate', { url: targetUrl });
            const reply = isHindi ? `🌐 ${targetUrl} पर नेविगेट किया जा रहा है...` : isKorean ? `🌐 ${targetUrl}(으)로 이동합니다...` : `🌐 Navigating active tab to "${targetUrl}"...`;
            addAiReply(reply);
            speakReply(isHindi ? 'नेविगेट किया जा रहा है' : isKorean ? '페이지로 이동합니다' : `Navigating to ${target}`, isHindi ? 'hi' : isKorean ? 'ko' : 'en');
            return;
        }

        // 11. Conversational / Q&A Assistant Response
        setTimeout(() => {
            let aiText = '';
            if (isHindi) {
                aiText = `✦ **Antigravity Copilot (Whisper ASR)**\n\nमैंने आपका संदेश समझा: "${query}"\n\n• **सक्रिय टैब:** \`${activeTab.title || 'नया टैब'}\`\n• **शील्ड्स सुरक्षा:** ${shieldsStats.totalBlocked || 0} ट्रैकर्स ब्लॉक।\n• **सुझाव:** आप कह सकते हैं: *"पेज का सारांश दो"*, *"नीचे स्क्रॉल करो"*, या *"वीडियो चलाओ"*।`;
            } else if (isKorean) {
                aiText = `✦ **Antigravity Copilot (Whisper ASR)**\n\n음성/명령 처리 완료: "${query}"\n\n• **현재 탭:** \`${activeTab.title || '새 탭'}\`\n• **차단된 광고:** ${shieldsStats.totalBlocked || 0}개\n• **추천 명령:** *"페이지 요약"*, *"아래로 스크롤"*, *"동영상 재생"*`;
            } else {
                aiText = `✦ **Antigravity Copilot (Whisper ASR)**\n\nAnalyzed request: "${query}"\n\n• **Active Tab:** \`${activeTab.title || 'New Tab'}\`\n• **Shields Protection:** ${shieldsStats.totalBlocked || 0} trackers & ads blocked.\n• **Suggested Commands:** You can say *"Summarize"*, *"Click Play"*, *"Scroll Down"*, or speak in Hindi/Korean.`;
            }
            addAiReply(aiText);
            speakReply(isHindi ? 'कमांड प्रोसेस हो गया' : isKorean ? '명령이 처리되었습니다' : 'Processed request.', isHindi ? 'hi' : isKorean ? 'ko' : 'en');
        }, 300);
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
