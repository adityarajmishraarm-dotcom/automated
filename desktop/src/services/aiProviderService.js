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
        model: 'ornith-1.0-9b',
        presetModels: ['ornith-1.0-9b', 'local-model', 'qwen2.5-coder-7b-instruct', 'qwen2.5-vl-7b-instruct', 'llama-3.2-3b-instruct']
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
    const current = configs[activeId];
    if (current && (current.apiKey || current.id === 'lmstudio' || current.id === 'ollama')) {
        return current;
    }
    // If active has no API key, prefer locally running LM Studio:
    if (configs.lmstudio) {
        return configs.lmstudio;
    }
    return configs.openai || DEFAULT_PROVIDERS.openai;
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

// Native Browser Tool Definitions for OpenAI & Anthropic Function Calling
export const BROWSER_TOOLS = [
    {
        type: 'function',
        function: {
            name: 'open_tab',
            description: 'Open a new browser tab with an optional URL (leave blank or empty for a blank tab)',
            parameters: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'URL or search query to open in new tab (empty string for blank tab)' },
                    title: { type: 'string', description: 'Optional tab title' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'close_tab',
            description: 'Close a tab by index (1-based), ID, or close current active tab',
            parameters: {
                type: 'object',
                properties: {
                    index: { type: 'integer', description: 'Tab position index (1-based, 1=1st tab)' },
                    id: { type: 'string', description: 'Tab ID' },
                    all: { type: 'boolean', description: 'Whether to close all open tabs' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'switch_tab',
            description: 'Switch active tab by 1-based index (e.g. 1=tabone, 2=tabtwo) or tab ID',
            parameters: {
                type: 'object',
                properties: {
                    index: { type: 'integer', description: 'Target tab position index (1-based)' },
                    id: { type: 'string', description: 'Target tab ID' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'navigate',
            description: 'Navigate the active tab to a specific URL or perform a web search',
            parameters: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'Destination URL or search term' }
                },
                required: ['url']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'click_element',
            description: 'Click an element, link, button, search bar, or badge #N on active page',
            parameters: {
                type: 'object',
                properties: {
                    target: { type: 'string', description: 'Button text, link text, search bar, or Set-of-Marks badge (#1, #2)' }
                },
                required: ['target']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'type_text',
            description: 'Type text into search bar or input field and optionally submit',
            parameters: {
                type: 'object',
                properties: {
                    text: { type: 'string', description: 'Text to type' },
                    submit: { type: 'boolean', description: 'Whether to press Enter/submit (default true)' }
                },
                required: ['text']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'scroll_page',
            description: 'Scroll the active page up, down, top, or bottom',
            parameters: {
                type: 'object',
                properties: {
                    direction: { type: 'string', enum: ['down', 'up', 'top', 'bottom', 'left', 'right'], description: 'Scroll direction' },
                    amount: { type: 'integer', description: 'Percentage (e.g. 50) or pixel distance' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'download_item',
            description: 'Trigger or verify a download of a file or image from the page or URL',
            parameters: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'Direct URL to download' },
                    target: { type: 'string', description: 'Button/link text on page to click for download' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'read_page',
            description: 'Inspect active webpage: returns title, URL, detected search boxes, candidate links, countdown timers, and download triggers',
            parameters: {
                type: 'object',
                properties: {}
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'search_page',
            description: 'Type query into the page search input and submit the search',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Search term or movie title to search for' }
                },
                required: ['query']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'verify_download',
            description: 'Check status of active and completed downloads in the download manager and on disk',
            parameters: {
                type: 'object',
                properties: {}
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'remind_user',
            description: 'Trigger a high-priority audible chime, speech announcement, and persistent visual banner to remind/notify the user',
            parameters: {
                type: 'object',
                properties: {
                    message: { type: 'string', description: 'Reminder message to announce to the user' }
                },
                required: ['message']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'finish_task',
            description: 'Mark the multi-step browser task or goal as completed with a summary',
            parameters: {
                type: 'object',
                properties: {
                    message: { type: 'string', description: 'Completion summary message' },
                    success: { type: 'boolean', description: 'Whether the goal succeeded' }
                },
                required: ['message']
            }
        }
    }
];

export function generateToolSystemPrompt(tools = BROWSER_TOOLS) {
    const list = tools.map(t => {
        const fn = t.function;
        const props = Object.keys(fn.parameters?.properties || {}).join(', ');
        return `- ${fn.name}(${props}): ${fn.description}`;
    }).join('\n');

    return `\n\nBROWSER AUTOMATION TOOLS AVAILABLE:
You are the Autonomous Antigravity Browser Agent. You directly control this browser.
When the user gives you a task or goal, you must REASON about the goal, PLAN the necessary steps, and EXECUTE browser tools.

HOW TO EMIT TOOL CALLS:
Output your plan and next action in a structured markdown code block:
\`\`\`tool_call
{
  "plan": "Summary of overall plan to achieve the user's goal",
  "steps": [
    { "tool": "<tool_name>", "args": { ... } }
  ]
}
\`\`\`

Available Tools:
${list}

CRITICAL RULES:
1. When the user gives a multi-step task (e.g. "open a new tab and in that open moviesmod.zone and download episode 1 of ... and verify it and remind me"):
   - Reason on the goal.
   - Plan the steps.
   - Start by opening the tab or navigating to the target website: \`\`\`tool_call\n{\n  "plan": "Open a new tab, navigate to site, find episode, download, verify and remind",\n  "steps": [\n    { "tool": "open_tab", "args": { "url": "https://..." } }\n  ]\n}\n\`\`\`
2. Never just say "I did it" without emitting the tool call!
3. After taking an action, you will receive the updated page observation (URL, title, elements, search results, downloads). Use that observation to decide your next step.
4. When a download finishes, call verify_download to inspect it on disk, then call remind_user to alert the user with sound and speech.`;
}

/**
 * Multimodal Chat & Vision Completion
 * Supports both local file path reference and base64 image encoding,
 * as well as full tool calling for all 7 providers.
 */
export async function sendChatMessage({
    prompt,
    imagePath = null,
    imageBase64 = null,
    systemPrompt = null,
    history = [],
    tools = BROWSER_TOOLS
}) {
    const config = getActiveProviderConfig();
    const cleanBaseUrl = (config.baseUrl || '').replace(/\/+$/, '');

    // Format local file path explanation if provided
    let augmentedPrompt = prompt || '';
    if (imagePath) {
        augmentedPrompt += `\n\n[Local Screenshot File Path: "${imagePath}"]\nYou can inspect this snapshot to visually understand the active webview and browser UI state.`;
    }

    // Build unified system prompt with tool calling instructions
    const toolPromptSuffix = generateToolSystemPrompt(tools);
    const combinedSystemPrompt = (systemPrompt ? systemPrompt + toolPromptSuffix : toolPromptSuffix).trim();

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

            const anthropicTools = (tools || []).map(t => ({
                name: t.function.name,
                description: t.function.description,
                input_schema: t.function.parameters
            }));

            const payload = {
                model: config.model || 'claude-3-5-sonnet-20241022',
                max_tokens: 1500,
                messages: formattedMessages,
                system: combinedSystemPrompt
            };
            if (anthropicTools.length > 0) {
                payload.tools = anthropicTools;
            }

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

            const toolCalls = [];
            if (Array.isArray(data.content)) {
                for (const c of data.content) {
                    if (c.type === 'tool_use') {
                        toolCalls.push({
                            id: c.id,
                            name: c.name,
                            args: c.input || {}
                        });
                    }
                }
            }

            return {
                success: true,
                reply: textReply,
                toolCalls,
                provider: config.name,
                model: config.model
            };
        }

        // OpenAI Compatible / LM Studio / Ollama / OpenRouter / OpenCode / OpenCode Zen
        const headers = { 'Content-Type': 'application/json' };
        if (config.apiKey) {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
        }
        if (config.id === 'openrouter') {
            headers['HTTP-Referer'] = 'https://antigravity.browser';
            headers['X-Title'] = 'Antigravity Native Browser';
        }

        const messages = [];
        if (combinedSystemPrompt) {
            messages.push({ role: 'system', content: combinedSystemPrompt });
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

        const requestBody = {
            model: config.model || 'default',
            messages,
            max_tokens: 1500
        };

        // Pass native tools array if provider supports tools (e.g. OpenAI, OpenRouter)
        if (tools && tools.length > 0 && config.id !== 'lmstudio' && config.id !== 'ollama') {
            requestBody.tools = tools;
        }

        let res = await fetch(`${cleanBaseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        // If provider returned error due to tools parameter, retry without tools in payload (system prompt instructions remain)
        if (!res.ok && requestBody.tools) {
            delete requestBody.tools;
            res = await fetch(`${cleanBaseUrl}/chat/completions`, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody)
            });
        }

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || `HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        const choice = data.choices?.[0] || {};
        const reply = choice.message?.content || '';

        const toolCalls = [];
        if (Array.isArray(choice.message?.tool_calls)) {
            for (const tc of choice.message.tool_calls) {
                let args = {};
                try {
                    args = typeof tc.function?.arguments === 'string'
                        ? JSON.parse(tc.function.arguments)
                        : (tc.function?.arguments || {});
                } catch (e) {
                    args = { raw: tc.function?.arguments };
                }
                toolCalls.push({
                    id: tc.id,
                    name: tc.function?.name,
                    args
                });
            }
        }

        return {
            success: true,
            reply,
            reasoning: choice.message?.reasoning_content || '',
            toolCalls,
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

/**
 * Real-time Response & Thinking Streamer
 * Supports live token-by-token content streaming, live thinking/reasoning streaming (ChatGPT, Claude 3.7, Gemini),
 * tool calls accumulation, and AbortController signal cancellation.
 * Strict Ponytail: Native fetch + ReadableStream + TextDecoder (zero external dependencies).
 */
export async function streamChatMessage({
    prompt,
    imagePath = null,
    imageBase64 = null,
    systemPrompt = null,
    history = [],
    tools = BROWSER_TOOLS,
    onChunk = () => {},
    onReasoningChunk = () => {},
    signal = null
}) {
    const config = getActiveProviderConfig();
    const cleanBaseUrl = (config.baseUrl || '').replace(/\/+$/, '');

    let augmentedPrompt = prompt || '';
    if (imagePath) {
        augmentedPrompt += `\n\n[Local Screenshot File Path: "${imagePath}"]\nYou can inspect this snapshot to visually understand the active webview and browser UI state.`;
    }

    const toolPromptSuffix = generateToolSystemPrompt(tools);
    const combinedSystemPrompt = (systemPrompt ? systemPrompt + toolPromptSuffix : toolPromptSuffix).trim();

    try {
        // --- 1. Anthropic Streaming ---
        if (config.type === 'anthropic') {
            if (!config.apiKey) throw new Error('Anthropic API key is not configured.');

            const formattedMessages = history.map(m => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.text || m.content
            }));

            let userContent;
            if (imageBase64) {
                const cleanB64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
                userContent = [
                    {
                        type: 'image',
                        source: { type: 'base64', media_type: 'image/png', data: cleanB64 }
                    },
                    { type: 'text', text: augmentedPrompt }
                ];
            } else {
                userContent = augmentedPrompt;
            }
            formattedMessages.push({ role: 'user', content: userContent });

            const anthropicTools = (tools || []).map(t => ({
                name: t.function.name,
                description: t.function.description,
                input_schema: t.function.parameters
            }));

            const payload = {
                model: config.model || 'claude-3-5-sonnet-20241022',
                max_tokens: 2048,
                messages: formattedMessages,
                system: combinedSystemPrompt,
                stream: true
            };
            if (anthropicTools.length > 0) {
                payload.tools = anthropicTools;
            }

            const res = await fetch(`${cleanBaseUrl}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': config.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify(payload),
                signal
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error?.message || `Anthropic HTTP ${res.status}`);
            }

            let fullReply = '';
            let fullReasoning = '';
            const toolCallsAccumulator = {};
            let currentBlockIndex = null;

            const reader = res.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const rawLine of lines) {
                    const line = rawLine.trim();
                    if (!line || line.startsWith(':')) continue;
                    if (line.startsWith('data:')) {
                        const dataStr = line.slice(5).trim();
                        try {
                            const evt = JSON.parse(dataStr);
                            if (evt.type === 'content_block_start') {
                                currentBlockIndex = evt.index;
                                if (evt.content_block?.type === 'tool_use') {
                                    toolCallsAccumulator[currentBlockIndex] = {
                                        id: evt.content_block.id,
                                        name: evt.content_block.name,
                                        argsStr: ''
                                    };
                                }
                            } else if (evt.type === 'content_block_delta') {
                                const delta = evt.delta || {};
                                if (delta.type === 'text_delta' && delta.text) {
                                    fullReply += delta.text;
                                    if (onChunk) onChunk(delta.text);
                                } else if (delta.type === 'thinking_delta' && delta.thinking) {
                                    fullReasoning += delta.thinking;
                                    if (onReasoningChunk) onReasoningChunk(delta.thinking);
                                } else if (delta.type === 'input_json_delta' && delta.partial_json) {
                                    if (toolCallsAccumulator[evt.index]) {
                                        toolCallsAccumulator[evt.index].argsStr += delta.partial_json;
                                    }
                                }
                            }
                        } catch (e) {}
                    }
                }
            }

            const toolCalls = Object.values(toolCallsAccumulator).map(tc => {
                let args = {};
                try { args = JSON.parse(tc.argsStr); } catch (e) { args = { raw: tc.argsStr }; }
                return { id: tc.id, name: tc.name, args };
            });

            return {
                success: true,
                reply: fullReply,
                reasoning: fullReasoning,
                toolCalls,
                provider: config.name,
                model: config.model
            };
        }

        // --- 2. OpenAI-Compatible Streaming (LM Studio, Ollama, OpenRouter, OpenCode, OpenCode Zen, OpenAI) ---
        const headers = { 'Content-Type': 'application/json' };
        if (config.apiKey) {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
        }
        if (config.id === 'openrouter') {
            headers['HTTP-Referer'] = 'https://antigravity.browser';
            headers['X-Title'] = 'Antigravity Native Browser';
        }

        const messages = [];
        if (combinedSystemPrompt) {
            messages.push({ role: 'system', content: combinedSystemPrompt });
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

        const requestBody = {
            model: config.model || 'default',
            messages,
            max_tokens: 2048,
            stream: true
        };

        if (tools && tools.length > 0 && config.id !== 'lmstudio' && config.id !== 'ollama') {
            requestBody.tools = tools;
        }

        let res = await fetch(`${cleanBaseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
            signal
        });

        // Fallback without tools if tools payload rejected
        if (!res.ok && requestBody.tools) {
            delete requestBody.tools;
            res = await fetch(`${cleanBaseUrl}/chat/completions`, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody),
                signal
            });
        }

        // If streaming rejected (e.g. 400 Bad Request for stream param), fallback to non-streaming sendChatMessage
        if (!res.ok) {
            const nonStreamRes = await sendChatMessage({
                prompt,
                imagePath,
                imageBase64,
                systemPrompt,
                history,
                tools
            });
            if (nonStreamRes && nonStreamRes.success) {
                if (nonStreamRes.reasoning && onReasoningChunk) {
                    onReasoningChunk(nonStreamRes.reasoning);
                }
                if (nonStreamRes.reply && onChunk) {
                    onChunk(nonStreamRes.reply);
                }
            }
            return nonStreamRes;
        }

        let fullReply = '';
        let fullReasoning = '';
        const toolCallsAccumulator = {};

        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const rawLine of lines) {
                const line = rawLine.trim();
                if (!line || line.startsWith(':')) continue;
                if (line.startsWith('data:')) {
                    const dataStr = line.slice(5).trim();
                    if (dataStr === '[DONE]') continue;
                    try {
                        const chunk = JSON.parse(dataStr);
                        const choice = chunk.choices?.[0] || {};
                        const delta = choice.delta || {};

                        // 1. Live Thinking / Reasoning (DeepSeek-R1, Qwen reasoning, LM Studio, Ollama)
                        const thoughtPiece = delta.reasoning_content || delta.reasoning || '';
                        if (thoughtPiece) {
                            fullReasoning += thoughtPiece;
                            if (onReasoningChunk) onReasoningChunk(thoughtPiece);
                        }

                        // 2. Live Content Stream
                        const contentPiece = delta.content || '';
                        if (contentPiece) {
                            fullReply += contentPiece;
                            if (onChunk) onChunk(contentPiece);
                        }

                        // 3. Tool Calls Delta
                        if (Array.isArray(delta.tool_calls)) {
                            for (const tc of delta.tool_calls) {
                                const idx = tc.index ?? 0;
                                if (!toolCallsAccumulator[idx]) {
                                    toolCallsAccumulator[idx] = {
                                        id: tc.id || '',
                                        name: '',
                                        argsStr: ''
                                    };
                                }
                                if (tc.id) toolCallsAccumulator[idx].id = tc.id;
                                if (tc.function?.name) {
                                    if (!toolCallsAccumulator[idx].name) {
                                        toolCallsAccumulator[idx].name = tc.function.name;
                                    } else if (!toolCallsAccumulator[idx].name.includes(tc.function.name)) {
                                        toolCallsAccumulator[idx].name += tc.function.name;
                                    }
                                }
                                if (tc.function?.arguments) toolCallsAccumulator[idx].argsStr += tc.function.arguments;
                            }
                        }
                    } catch (e) {}
                }
            }
        }

        const toolCalls = Object.values(toolCallsAccumulator).map(tc => {
            let args = {};
            try { args = JSON.parse(tc.argsStr); } catch (e) { args = { raw: tc.argsStr }; }
            return { id: tc.id, name: tc.name, args };
        });

        return {
            success: true,
            reply: fullReply,
            reasoning: fullReasoning,
            toolCalls,
            provider: config.name,
            model: config.model
        };
    } catch (err) {
        if (err.name === 'AbortError' || signal?.aborted) {
            return {
                success: true,
                aborted: true,
                reply: '',
                reasoning: '',
                toolCalls: [],
                provider: config.name
            };
        }
        console.error('[AI Provider Stream Error]', err);
        return {
            success: false,
            error: err.message,
            provider: config.name
        };
    }
}

