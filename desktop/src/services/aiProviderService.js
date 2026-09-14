/**
 * Antigravity Native Browser - Unified AI Provider Service
 * Supports 7 AI & VLM Providers:
 * 1. OpenAI Compatible
 * 2. LM Studio (localhost:1234)
 * 3. Ollama (localhost:11434)
 * 4. OpenRouter (openrouter.ai)
 * 5. OpenCode
 * 6. OpenCode Zen
 * 7. Anthropic (api.anthropic.com)
 *
 * Strict Ponytail Philosophy: Zero external npm dependencies, native fetch only.
 */

const STORAGE_KEY = 'antigravity_ai_providers_config';
const ACTIVE_PROVIDER_KEY = 'antigravity_active_ai_provider';

export const DEFAULT_PROVIDERS = {
    openai: {
        id: 'openai',
        name: 'OpenAI Compatible',
        type: 'openai_compatible',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4o',
        presetModels: ['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'chatgpt-4o-latest']
    },
    lmstudio: {
        id: 'lmstudio',
        name: 'LM Studio',
        type: 'openai_compatible',
        baseUrl: 'http://localhost:1234/v1',
        apiKey: '',
        model: 'local-model',
        presetModels: ['local-model', 'qwen2.5-coder-7b-instruct', 'qwen2.5-vl-7b-instruct', 'llama-3.2-3b-instruct']
    },
    ollama: {
        id: 'ollama',
        name: 'Ollama',
        type: 'openai_compatible',
        baseUrl: 'http://localhost:11434/v1',
        apiKey: '',
        model: 'llama3.2-vision',
        presetModels: ['llama3.2-vision', 'qwen2.5-coder:7b', 'llava:latest', 'llama3.2:latest']
    },
    openrouter: {
        id: 'openrouter',
        name: 'OpenRouter',
        type: 'openai_compatible',
        baseUrl: 'https://openrouter.ai/api/v1',
        apiKey: '',
        model: 'anthropic/claude-3.5-sonnet',
        presetModels: [
            'anthropic/claude-3.5-sonnet',
            'openai/gpt-4o',
            'google/gemini-2.0-flash-001',
            'meta-llama/llama-3.2-11b-vision-instruct',
            'deepseek/deepseek-chat'
        ]
    },
    opencode: {
        id: 'opencode',
        name: 'OpenCode',
        type: 'openai_compatible',
        baseUrl: 'https://api.opencode.ai/v1',
        apiKey: '',
        model: 'opencode-default',
        presetModels: ['opencode-default', 'opencode-coder-v1', 'opencode-vision-v1']
    },
    opencodezen: {
        id: 'opencodezen',
        name: 'OpenCode Zen',
        type: 'openai_compatible',
        baseUrl: 'https://api.opencodezen.com/v1',
        apiKey: '',
        model: 'opencode-zen-v1',
        presetModels: ['opencode-zen-v1', 'opencode-zen-fast', 'opencode-zen-vision']
    },
    anthropic: {
        id: 'anthropic',
        name: 'Anthropic',
        type: 'anthropic',
        baseUrl: 'https://api.anthropic.com/v1',
        apiKey: '',
        model: 'claude-3-5-sonnet-20241022',
        presetModels: ['claude-3-7-sonnet-latest', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022']
    }
};

/**
 * Load saved provider configs merged with default definitions
 */
export function getAiProvidersConfig() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...DEFAULT_PROVIDERS };
        const parsed = JSON.parse(raw);
        const merged = { ...DEFAULT_PROVIDERS };
        for (const [key, val] of Object.entries(parsed)) {
            if (merged[key]) {
                merged[key] = { ...merged[key], ...val };
            } else {
                merged[key] = val;
            }
        }
        return merged;
    } catch (e) {
        return { ...DEFAULT_PROVIDERS };
    }
}

/**
 * Save provider configs to localStorage
 */
export function saveAiProvidersConfig(config) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        return true;
    } catch (e) {
        console.error('[AI Provider Service] Failed to save config:', e);
        return false;
    }
}

/**
 * Get the active provider ID (defaults to 'openai')
 */
export function getActiveProviderId() {
    try {
        return localStorage.getItem(ACTIVE_PROVIDER_KEY) || 'openai';
    } catch (e) {
        return 'openai';
    }
}

/**
 * Set the active provider ID
 */
export function setActiveProviderId(id) {
    try {
        localStorage.setItem(ACTIVE_PROVIDER_KEY, id);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Get active provider full configuration
 */
export function getActiveProviderConfig() {
    const configs = getAiProvidersConfig();
    const activeId = getActiveProviderId();
    return configs[activeId] || configs.openai || DEFAULT_PROVIDERS.openai;
}

/**
 * Test connection to a specific provider
 */
export async function testConnection(providerId, customConfig = null) {
    const config = customConfig || (getAiProvidersConfig()[providerId] || DEFAULT_PROVIDERS[providerId]);
    if (!config) return { success: false, error: 'Unknown provider' };

    const cleanBaseUrl = (config.baseUrl || '').replace(/\/+$/, '');
    const startTime = performance.now();

    try {
        if (config.type === 'anthropic') {
            if (!config.apiKey) {
                return { success: false, error: 'Anthropic requires an API Key (sk-ant-...)' };
            }
            const res = await fetch(`${cleanBaseUrl}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': config.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: config.model || 'claude-3-5-haiku-20241022',
                    max_tokens: 5,
                    messages: [{ role: 'user', content: 'Ping' }]
                })
            });

            const latencyMs = Math.round(performance.now() - startTime);
            if (res.ok) {
                return { success: true, latencyMs, provider: config.name };
            }
            const errData = await res.json().catch(() => ({}));
            return {
                success: false,
                latencyMs,
                error: errData.error?.message || `HTTP ${res.status}: ${res.statusText}`
            };
        }

        // OpenAI Compatible / LM Studio / Ollama / OpenRouter / OpenCode
        const headers = { 'Content-Type': 'application/json' };
        if (config.apiKey) {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
        }
        if (providerId === 'openrouter') {
            headers['HTTP-Referer'] = 'https://antigravity.browser';
            headers['X-Title'] = 'Antigravity Native Browser';
        }

        // First attempt lightweight /models endpoint
        try {
            const modelsRes = await fetch(`${cleanBaseUrl}/models`, {
                method: 'GET',
                headers
            });
            if (modelsRes.ok) {
                const data = await modelsRes.json().catch(() => ({}));
                const latencyMs = Math.round(performance.now() - startTime);
                const models = Array.isArray(data.data) ? data.data.map(m => m.id) : [];
                return { success: true, latencyMs, models, provider: config.name };
            }
        } catch (mErr) {
            // Fallback to chat completions if /models blocked
        }

        // Fallback test via chat completions
        const chatRes = await fetch(`${cleanBaseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: config.model || 'default',
                messages: [{ role: 'user', content: 'ping' }],
                max_tokens: 5
            })
        });

        const latencyMs = Math.round(performance.now() - startTime);
        if (chatRes.ok) {
            return { success: true, latencyMs, provider: config.name };
        }

        const errData = await chatRes.json().catch(() => ({}));
        return {
            success: false,
            latencyMs,
            error: errData.error?.message || `HTTP ${chatRes.status}: ${chatRes.statusText}`
        };
    } catch (networkErr) {
        const latencyMs = Math.round(performance.now() - startTime);
        return {
            success: false,
            latencyMs,
            error: `Connection failed: ${networkErr.message}. Ensure endpoint is running and accessible.`
        };
    }
}

/**
 * Multimodal Chat & Vision Completion
 * Supports both local file path reference and base64 image encoding.
 */
export async function sendChatMessage({
    prompt,
    imagePath = null,
    imageBase64 = null,
    systemPrompt = null,
    history = []
}) {
    const config = getActiveProviderConfig();
    const cleanBaseUrl = (config.baseUrl || '').replace(/\/+$/, '');

    // Format local file path explanation if provided
    let augmentedPrompt = prompt || '';
    if (imagePath) {
        augmentedPrompt += `\n\n[Local Screenshot File Path: "${imagePath}"]\nYou can inspect this snapshot to visually understand the active webview and browser UI state.`;
    }

    try {
        if (config.type === 'anthropic') {
            if (!config.apiKey) throw new Error('Anthropic API key is not configured.');

            const formattedMessages = history.map(m => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.text || m.content
            }));

            // User message content
            let userContent;
            if (imageBase64) {
                const cleanB64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
                userContent = [
                    {
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: 'image/png',
                            data: cleanB64
                        }
                    },
                    {
                        type: 'text',
                        text: augmentedPrompt
                    }
                ];
            } else {
                userContent = augmentedPrompt;
            }

            formattedMessages.push({ role: 'user', content: userContent });

            const payload = {
                model: config.model || 'claude-3-5-sonnet-20241022',
                max_tokens: 1500,
                messages: formattedMessages
            };
            if (systemPrompt) payload.system = systemPrompt;

            const res = await fetch(`${cleanBaseUrl}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': config.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error?.message || `Anthropic HTTP ${res.status}`);
            }

            const data = await res.json();
            const textReply = Array.isArray(data.content)
                ? data.content.filter(c => c.type === 'text').map(c => c.text).join('\n')
                : '';
            return {
                success: true,
                reply: textReply,
                provider: config.name,
                model: config.model
            };
        }

        // OpenAI Compatible / LM Studio / Ollama / OpenRouter / OpenCode
        const headers = { 'Content-Type': 'application/json' };
        if (config.apiKey) {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
        }
        if (config.id === 'openrouter') {
            headers['HTTP-Referer'] = 'https://antigravity.browser';
            headers['X-Title'] = 'Antigravity Native Browser';
        }

        const messages = [];
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }
        for (const h of history) {
            messages.push({
                role: h.role === 'assistant' ? 'assistant' : 'user',
                content: h.text || h.content
            });
        }

        if (imageBase64) {
            const dataUrl = imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`;
            messages.push({
                role: 'user',
                content: [
                    { type: 'text', text: augmentedPrompt },
                    { type: 'image_url', image_url: { url: dataUrl } }
                ]
            });
        } else {
            messages.push({ role: 'user', content: augmentedPrompt });
        }

        const res = await fetch(`${cleanBaseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: config.model || 'default',
                messages,
                max_tokens: 1500
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || `HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content || '';
        return {
            success: true,
            reply,
            provider: config.name,
            model: config.model
        };
    } catch (err) {
        console.error('[AI Provider Chat Error]', err);
        return {
            success: false,
            error: err.message,
            provider: config.name
        };
    }
}
