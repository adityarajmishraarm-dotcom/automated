const dns = require('dns');
try {
    dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

const path = require('path');
const { pipeline, env } = require('@huggingface/transformers');

// Configure local cache directory inside desktop app
const cacheDir = path.join(__dirname, 'models_cache');
env.cacheDir = cacheDir;
env.allowLocalModels = true;
env.allowRemoteModels = true;

const WHISPER_MODEL_ID = 'onnx-community/whisper-base';

let transcriberInstance = null;
let isInitializing = false;
let initPromise = null;

/**
 * Initialize or get cached Whisper pipeline (whisper-base with fp32 acoustic encoder)
 */
async function getWhisperPipeline() {
    if (transcriberInstance) return transcriberInstance;
    if (initPromise) return initPromise;

    isInitializing = true;
    initPromise = (async () => {
        try {
            console.log(`[Whisper Engine] Initializing local multilingual ASR pipeline (${WHISPER_MODEL_ID}, fp32 encoder)...`);
            const pipe = await pipeline('automatic-speech-recognition', WHISPER_MODEL_ID, {
                dtype: {
                    encoder_model: 'fp32',
                    decoder_model_merged: 'q4'
                },
                device: 'cpu'
            });
            transcriberInstance = pipe;
            console.log(`[Whisper Engine] Local Whisper pipeline (${WHISPER_MODEL_ID}) ready for English, Hindi, and Korean!`);
            return pipe;
        } catch (err) {
            console.warn(`[Whisper Engine] ${WHISPER_MODEL_ID} failed, falling back to whisper-tiny:`, err.message);
            try {
                const fallbackPipe = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny', {
                    dtype: 'fp32',
                    device: 'cpu'
                });
                transcriberInstance = fallbackPipe;
                return fallbackPipe;
            } catch (fallbackErr) {
                console.error('[Whisper Engine] Initialization failed:', fallbackErr);
                initPromise = null;
                throw fallbackErr;
            }
        } finally {
            isInitializing = false;
        }
    })();

    return initPromise;
}

/**
 * High-fidelity windowed-sinc resampler from arbitrary hardware sampleRate (e.g. 48000, 44100) to 16000 Hz.
 * Preserves high-frequency consonant plosives (/k/, /t/, /p/, /s/) without muffling formants.
 */
function resampleTo16kHz(samples, inputSampleRate = 16000) {
    const sr = Number(inputSampleRate) || 16000;
    if (sr === 16000 || samples.length === 0) {
        return samples;
    }

    const ratio = sr / 16000;
    const targetLength = Math.max(1, Math.round(samples.length / ratio));
    const output = new Float32Array(targetLength);

    // 6-tap Hann-windowed sinc interpolation
    const halfWin = 3;
    const cutoff = ratio > 1.0 ? (1.0 / ratio) : 1.0;

    for (let i = 0; i < targetLength; i++) {
        const srcPos = i * ratio;
        const centerIdx = Math.floor(srcPos);
        let sum = 0;
        let weightSum = 0;

        for (let k = -halfWin + 1; k <= halfWin; k++) {
            const sampleIdx = centerIdx + k;
            if (sampleIdx < 0 || sampleIdx >= samples.length) continue;

            const x = srcPos - sampleIdx;
            const sincX = x * cutoff;
            const sinc = Math.abs(sincX) < 1e-6 ? 1.0 : Math.sin(Math.PI * sincX) / (Math.PI * sincX);
            const win = 0.5 * (1 + Math.cos((Math.PI * x) / halfWin));
            const w = sinc * win;

            sum += samples[sampleIdx] * w;
            weightSum += w;
        }

        output[i] = weightSum !== 0 ? (sum / weightSum) : samples[Math.min(centerIdx, samples.length - 1)];
    }

    return output;
}

/**
 * Condition 16kHz mono PCM audio for Whisper without distorting voice formants:
 * 1. DC offset removal only (no phase-distorting IIR high-pass filter)
 * 2. Gentle leading/trailing dead-silence trimming with 400ms speech padding
 * 3. Smooth Peak Normalization (target 0.85, max 6x gain so room noise isn't amplified into phantom words)
 * 4. Minimum 1.2s duration padding for short voice commands
 */
function conditionAudioForWhisper(samples16k) {
    const len = samples16k.length;
    if (len === 0) return { samples: samples16k, isSilent: true, peak: 0, rms: 0 };

    // 1. Remove DC offset while preserving full natural frequency spectrum
    let mean = 0;
    for (let i = 0; i < len; i++) {
        const v = samples16k[i];
        if (Number.isFinite(v)) mean += v;
    }
    mean /= len;

    const centered = new Float32Array(len);
    let maxPeak = 0;
    let sumSq = 0;

    for (let i = 0; i < len; i++) {
        const val = Number.isFinite(samples16k[i]) ? (samples16k[i] - mean) : 0;
        centered[i] = val;
        const abs = Math.abs(val);
        if (abs > maxPeak) maxPeak = abs;
        sumSq += val * val;
    }

    const globalRms = Math.sqrt(sumSq / len);

    // Check if audio is completely silent
    if (maxPeak < 0.0015 || globalRms < 0.0003) {
        return { samples: centered, isSilent: true, peak: maxPeak, rms: globalRms };
    }

    // 2. Frame-based Silence Trimming (20ms frames = 320 samples at 16kHz)
    const frameSize = 320;
    const numFrames = Math.floor(len / frameSize);
    const frameRms = new Float32Array(numFrames);
    let minFrameRms = Infinity;
    let maxFrameRms = 0;

    for (let f = 0; f < numFrames; f++) {
        let fSum = 0;
        const offset = f * frameSize;
        for (let j = 0; j < frameSize; j++) {
            const s = centered[offset + j];
            fSum += s * s;
        }
        const r = Math.sqrt(fSum / frameSize);
        frameRms[f] = r;
        if (r < minFrameRms) minFrameRms = r;
        if (r > maxFrameRms) maxFrameRms = r;
    }

    // Conservative speech onset threshold so soft initial consonants (/k/, /s/, /h/, /f/) are never clipped
    const vadThreshold = Math.max(minFrameRms * 1.8, maxFrameRms * 0.04, 0.0015);
    let firstSpeechFrame = 0;
    let lastSpeechFrame = numFrames - 1;

    for (let f = 0; f < numFrames; f++) {
        if (frameRms[f] >= vadThreshold) {
            firstSpeechFrame = f;
            break;
        }
    }
    for (let f = numFrames - 1; f >= 0; f--) {
        if (frameRms[f] >= vadThreshold) {
            lastSpeechFrame = f;
            break;
        }
    }

    // Keep 400ms (20 frames = 6400 samples) of padding before & after speech
    const padFrames = 20;
    const startSample = Math.max(0, (firstSpeechFrame - padFrames) * frameSize);
    const endSample = Math.min(len, (lastSpeechFrame + padFrames + 1) * frameSize);
    const trimmed = centered.subarray(startSample, Math.max(startSample + 1600, endSample));

    // 3. Gentle Peak Normalization (target peak = 0.85, max boost = 6.0x so background noise is not over-amplified)
    let trimmedPeak = 0;
    for (let i = 0; i < trimmed.length; i++) {
        const a = Math.abs(trimmed[i]);
        if (a > trimmedPeak) trimmedPeak = a;
    }

    const gain = trimmedPeak > 0.002 ? Math.min(6.0, 0.85 / trimmedPeak) : 1.0;

    // 4. Ensure minimum 1.2s (19200 samples) buffer for short commands
    const minSamples = 19200;
    const finalLength = Math.max(trimmed.length, minSamples);
    const normalized = new Float32Array(finalLength);

    for (let i = 0; i < trimmed.length; i++) {
        let val = trimmed[i] * gain;
        if (val > 0.98) val = 0.98;
        else if (val < -0.98) val = -0.98;
        normalized[i] = val;
    }

    return {
        samples: normalized,
        isSilent: false,
        peak: trimmedPeak,
        rms: globalRms,
        gainApplied: Number(gain.toFixed(2))
    };
}

/**
 * Filter Whisper silence hallucinations & normalize phonetic voice commands
 */
function normalizeVoiceTranscript(rawText) {
    if (!rawText || typeof rawText !== 'string') return '';

    let text = rawText
        .replace(/\[BLANK_AUDIO\]/gi, '')
        .replace(/\(blank audio\)/gi, '')
        .replace(/\[(?:silence|music|applause|laughter|noise|inaudible)\]/gi, '')
        .replace(/\((?:silence|music|upbeat music|applause|laughter|noise|inaudible)\)/gi, '')
        .replace(/^(?:thank you for watching|thanks for watching|subtitles by .*|translated by .*)$/gi, '')
        .trim();

    if (!text) return '';

    // Strip wrapping quotes if Whisper added them
    text = text.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim();

    // Common phonetic ASR corrections for spoken prompts and browser commands
    const phoneticFixes = [
        [/\bgive\s+me\s+a\s+say\s+on\b/gi, 'give me an essay on'],
        [/\bwrite\s+a\s+say\s+on\b/gi, 'write an essay on'],
        [/\ba\s+say\s+on\s+cow\b/gi, 'an essay on cow'],
        [/\byou\s+tube\b/gi, 'youtube'],
        [/\bu\s+tube\b/gi, 'youtube'],
        [/\bgit\s+hub\b/gi, 'github'],
        [/\bget\s+hub\b/gi, 'github'],
        [/\bhacker\s+news\b/gi, 'hacker news'],
        [/\bwiki\s+pedia\b/gi, 'wikipedia'],
        [/\bchat\s+g\s*p\s*t\b/gi, 'chatgpt'],
        [/\bc\s*l\s*k\s+s\s*b\b/gi, 'click search bar'],
        [/\b(?:click|clk)\s+s\s*b\b/gi, 'click search bar'],
        [/\b(?:click|focus|select)\s+(?:the\s+)?(?:such|search)\s+(?:bar|box|by|part|butt)\b/gi, 'click search bar'],
        [/\b(?:close|closed|clothes)\s+(?:this\s+|the\s+|current\s+|active\s+)?(?:tap|top|step|cab|cap)\b/gi, 'close tab'],
        [/\b(?:open|create|add)\s+(?:a\s+)?(?:new\s+)?(?:tap|top|cab|cap)\b/gi, 'open new tab'],
        [/\bnew\s+(?:tap|top|cab)\b/gi, 'new tab'],
        [/\b(?:switch|go)\s+to\s+(?:the\s+)?(\w+)\s+(?:tap|top|cab)\b/gi, 'switch to $1 tab'],
        [/\b(?:switch|go)\s+to\s+(?:tap|top|tab)\s+(?:to|too|two)\b/gi, 'switch to tab 2'],
        [/\b(?:switch|go)\s+to\s+(?:tap|top|tab)\s+(?:for|four)\b/gi, 'switch to tab 4'],
        [/\b(?:switch|go)\s+to\s+(?:tap|top|tab)\s+(?:won|one)\b/gi, 'switch to tab 1'],
        [/\b(?:scroll|scrolled|scrolling)\s+(?:dome|don't|dawn|town|down)\b/gi, 'scroll down'],
        [/\b(?:scroll|scrolled|scrolling)\s+(?:up|app|ap)\b/gi, 'scroll up'],
        [/\b(?:scroll|scrolled)\s+to\s+(?:the\s+)?(?:top|tap|start)\b/gi, 'scroll to top'],
        [/\b(?:scroll|scrolled)\s+to\s+(?:the\s+)?(?:bottom|end)\b/gi, 'scroll to bottom'],
        [/\b(?:auto\s*fill|ought\s+to\s+fill|otto\s+fill)\b/gi, 'autofill'],
        [/\b(?:reader|read\s+her|reed\s+er)\s+(?:mode|mood)\b/gi, 'reader mode'],
        [/\b(?:summarise|summarize|summary\s+of|some\s+arise)\s+(?:this\s+|the\s+)?(?:page|site|article)?\b/gi, 'summarize page']
    ];

    for (const [pattern, replacement] of phoneticFixes) {
        text = text.replace(pattern, replacement);
    }

    // Strip trailing sentence punctuation on short 1-6 word browser commands so URL & command parsers match cleanly
    if (text.split(/\s+/).length <= 6) {
        text = text.replace(/[.,!?;:]+$/, '').trim();
    }

    return text;
}

/**
 * Transcribe raw audio samples (Float32Array mono, any sampleRate -> auto-resampled to 16kHz)
 * @param {Float32Array|Array|number[]} audioData - Mono PCM Float32 audio samples
 * @param {Object} options - { language: 'english'|'hindi'|'korean'|null, sampleRate: number }
 */
async function transcribeAudio(audioData, options = {}) {
    const startTime = Date.now();
    const pipe = await getWhisperPipeline();

    // Convert input to Float32Array if passed as Array or Object from IPC
    let float32Samples;
    if (audioData instanceof Float32Array) {
        float32Samples = audioData;
    } else if (ArrayBuffer.isView(audioData) && audioData.buffer) {
        float32Samples = new Float32Array(audioData.buffer, audioData.byteOffset, audioData.byteLength / 4);
    } else if (Array.isArray(audioData)) {
        float32Samples = new Float32Array(audioData);
    } else if (audioData && typeof audioData === 'object') {
        const vals = Array.isArray(audioData.data) ? audioData.data : Object.values(audioData);
        float32Samples = new Float32Array(vals);
    } else {
        throw new Error('Invalid audio data format: Expected Float32Array or number array');
    }

    // 1. Resample to 16,000 Hz if not already 16,000 Hz
    const inputSampleRate = Number(options.sampleRate) || 16000;
    const samples16k = resampleTo16kHz(float32Samples, inputSampleRate);

    // 2. Condition audio (DC removal, gentle silence trim, smooth peak normalization)
    const conditioned = conditionAudioForWhisper(samples16k);
    if (conditioned.isSilent) {
        return {
            success: false,
            isSilent: true,
            text: '',
            error: 'No clear voice signal detected. Please speak closer to the microphone.',
            sampleCount: samples16k.length,
            latencyMs: Date.now() - startTime
        };
    }

    // 3. Determine target language code
    let lang = options.language || 'english';
    if (lang === 'auto' || lang === 'all' || lang === 'en' || lang === 'eng') lang = 'english';
    else if (lang === 'hi' || lang === 'hin') lang = 'hindi';
    else if (lang === 'ko' || lang === 'kor') lang = 'korean';

    const pipelineOptions = {
        task: 'transcribe',
        language: lang,
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: false,
        temperature: 0
    };

    console.log(`[Whisper Engine] Transcribing ${conditioned.samples.length} samples (${(conditioned.samples.length / 16000).toFixed(1)}s @ 16kHz, src=${inputSampleRate}Hz, gain=${conditioned.gainApplied}x) with ${WHISPER_MODEL_ID} (${lang})...`);
    const result = await pipe(conditioned.samples, pipelineOptions);
    const latencyMs = Date.now() - startTime;

    const rawText = (result && result.text ? result.text : '').trim();
    const cleanedText = normalizeVoiceTranscript(rawText);
    console.log(`[Whisper Engine] Transcribed in ${latencyMs}ms: raw="${rawText}" -> normalized="${cleanedText}"`);

    return {
        success: true,
        text: cleanedText,
        rawText,
        language: lang,
        model: WHISPER_MODEL_ID,
        sampleCount: conditioned.samples.length,
        latencyMs
    };
}

/**
 * Cleanup / dispose pipeline to free RAM
 */
async function disposeWhisper() {
    if (transcriberInstance) {
        try {
            await transcriberInstance.dispose();
        } catch (e) {}
        transcriberInstance = null;
        initPromise = null;
    }
}

module.exports = {
    getWhisperPipeline,
    transcribeAudio,
    resampleTo16kHz,
    conditionAudioForWhisper,
    normalizeVoiceTranscript,
    disposeWhisper,
    isReady: () => !!transcriberInstance,
    isInitializing: () => isInitializing
};
