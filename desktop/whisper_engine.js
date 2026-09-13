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

let transcriberInstance = null;
let isInitializing = false;
let initPromise = null;

/**
 * Initialize or get cached Whisper pipeline
 */
async function getWhisperPipeline() {
    if (transcriberInstance) return transcriberInstance;
    if (initPromise) return initPromise;

    isInitializing = true;
    initPromise = (async () => {
        try {
            console.log('[Whisper Engine] Initializing local multilingual ASR pipeline (onnx-community/whisper-tiny)...');
            const pipe = await pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny', {
                dtype: 'q8',
                device: 'cpu'
            });
            transcriberInstance = pipe;
            console.log('[Whisper Engine] Local Whisper pipeline ready for English, Hindi, and Korean!');
            return pipe;
        } catch (err) {
            console.error('[Whisper Engine] Initialization failed:', err);
            throw err;
        } finally {
            isInitializing = false;
        }
    })();

    return initPromise;
}

/**
 * Transcribe raw audio samples (Float32Array 16kHz mono)
 * @param {Float32Array|Array|number[]} audioData - 16kHz mono PCM Float32 audio samples
 * @param {Object} options - { language: 'english'|'hindi'|'korean'|null, task: 'transcribe' }
 */
async function transcribeAudio(audioData, options = {}) {
    const startTime = Date.now();
    const pipe = await getWhisperPipeline();

    // Convert input to Float32Array if passed as Array or Object from IPC
    let float32Samples;
    if (audioData instanceof Float32Array) {
        float32Samples = audioData;
    } else if (Array.isArray(audioData)) {
        float32Samples = new Float32Array(audioData);
    } else if (audioData && typeof audioData === 'object' && audioData.length !== undefined) {
        float32Samples = new Float32Array(Object.values(audioData));
    } else {
        throw new Error('Invalid audio data format: Expected 16kHz Float32Array or number array');
    }

    // Determine target language code
    let lang = options.language || null;
    if (lang === 'auto' || lang === 'all') lang = null;
    if (lang === 'hi' || lang === 'hin') lang = 'hindi';
    if (lang === 'en') lang = 'english';
    if (lang === 'ko' || lang === 'kor') lang = 'korean';

    const pipelineOptions = {
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5
    };
    if (lang) {
        pipelineOptions.language = lang;
    }

    console.log(`[Whisper Engine] Transcribing ${float32Samples.length} samples (${(float32Samples.length / 16000).toFixed(1)}s) with language: ${lang || 'auto-detect'}...`);
    const result = await pipe(float32Samples, pipelineOptions);
    const latencyMs = Date.now() - startTime;

    const rawText = (result && result.text ? result.text : '').trim();
    console.log(`[Whisper Engine] Transcribed in ${latencyMs}ms: "${rawText}"`);

    return {
        success: true,
        text: rawText,
        language: lang || 'auto',
        sampleCount: float32Samples.length,
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
    disposeWhisper,
    isReady: () => !!transcriberInstance,
    isInitializing: () => isInitializing
};
