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
    ornith: {
        id: 'ornith',
        name: 'Devil.co Ornith-1.0-9B AI OS',
        type: 'openai_compatible',
        baseUrl: 'http://127.0.0.1:4893/v1',
        apiKey: 'devil-co-founder',
        model: 'ornith-1.0-9b-custom',
        presetModels: ['ornith-1.0-9b-custom', 'ornith-1.0-9b']
    },
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
        baseUrl: 'http://127.0.0.1:1234/v1',
        apiKey: '',
        model: 'ornith-1.0-9b',
        presetModels: ['ornith-1.0-9b', 'local-model', 'qwen2.5-coder-7b-instruct', 'qwen2.5-vl-7b-instruct', 'llama-3.2-3b-instruct']
    },
    ollama: {
        id: 'ollama',
        name: 'Ollama',
        type: 'openai_compatible',
        baseUrl: 'http://127.0.0.1:11434/v1',
        apiKey: '',
        model: 'gpt-oss:20b',
        presetModels: ['gpt-oss:20b', 'qwen3.5:35b', 'llama3.2-vision', 'qwen2.5-coder:7b', 'llava:latest', 'llama3.2:latest']
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
            if (!val || typeof val !== 'object') continue;
            let normBaseUrl = val.baseUrl || '';
            if (normBaseUrl.includes('localhost:1234')) normBaseUrl = normBaseUrl.replace('localhost:1234', '127.0.0.1:1234');
            if (normBaseUrl.includes('localhost:11434')) normBaseUrl = normBaseUrl.replace('localhost:11434', '127.0.0.1:11434');
            if (merged[key]) {
                const defaultPresets = Array.isArray(DEFAULT_PROVIDERS[key]?.presetModels) ? DEFAULT_PROVIDERS[key].presetModels : [];
                const savedPresets = Array.isArray(val.presetModels) ? val.presetModels : [];
                const combinedPresets = Array.from(new Set([...savedPresets, ...defaultPresets]));
                merged[key] = {
                    ...merged[key],
                    ...val,
                    baseUrl: normBaseUrl || merged[key].baseUrl,
                    presetModels: combinedPresets
                };
            } else {
                merged[key] = {
                    id: key,
                    name: val.name || key,
                    type: val.type || 'openai_compatible',
                    baseUrl: normBaseUrl || 'http://127.0.0.1:11434/v1',
                    apiKey: val.apiKey || '',
                    model: val.model || 'default',
                    presetModels: Array.isArray(val.presetModels) ? val.presetModels : (val.model ? [val.model] : []),
                    ...val
                };
            }
        }
        if (merged.ollama && merged.ollama.model === 'llama3.2-vision') {
            merged.ollama.model = 'gpt-oss:20b';
        }
        return merged;
    } catch (e) {
        return { ...DEFAULT_PROVIDERS };
    }
}

/**
 * Fetch available/installed models from an endpoint (/v1/models or Ollama /api/tags)
 */
export async function fetchAvailableModels(config) {
    if (!config || !config.baseUrl) return { success: false, models: [], error: 'Missing Base URL' };
    let cleanBaseUrl = (config.baseUrl || '').replace(/\/+$/, '');
    if (cleanBaseUrl.includes('localhost:1234')) cleanBaseUrl = cleanBaseUrl.replace('localhost:1234', '127.0.0.1:1234');
    if (cleanBaseUrl.includes('localhost:11434')) cleanBaseUrl = cleanBaseUrl.replace('localhost:11434', '127.0.0.1:11434');
    const headers = { 'Content-Type': 'application/json' };
    if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
    }
    try {
        const res = await fetch(`${cleanBaseUrl}/models`, { method: 'GET', headers });
        if (res.ok) {
            const data = await res.json().catch(() => ({}));
            const list = Array.isArray(data.data)
                ? data.data.map(m => m.id || m.name).filter(Boolean)
                : (Array.isArray(data.models) ? data.models.map(m => m.name || m.id || m).filter(Boolean) : []);
            if (list.length > 0) {
                return { success: true, models: Array.from(new Set(list)) };
            }
        }
    } catch (e) {}

    // Fallback for Ollama root /api/tags
    try {
        const rootUrl = cleanBaseUrl.replace(/\/v1$/i, '');
        const tagsRes = await fetch(`${rootUrl}/api/tags`, { method: 'GET' });
        if (tagsRes.ok) {
            const tagsData = await tagsRes.json().catch(() => ({}));
            const list = Array.isArray(tagsData.models)
                ? tagsData.models.map(m => m.name || m.model).filter(Boolean)
                : [];
            if (list.length > 0) {
                return { success: true, models: Array.from(new Set(list)) };
            }
        }
    } catch (e) {}

    return { success: false, models: [], error: 'Could not list models from endpoint' };
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
 * Get the active provider ID (strictly user's selection, fallback to lmstudio)
 */
export function getActiveProviderId() {
    try {
        return localStorage.getItem(ACTIVE_PROVIDER_KEY) || 'lmstudio';
    } catch (e) {
        return 'lmstudio';
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
 * Get active provider full configuration (User selection is given absolute priority)
 */
export function getActiveProviderConfig() {
    const configs = getAiProvidersConfig();
    const activeId = getActiveProviderId();
    if (activeId && configs[activeId]) {
        return configs[activeId];
    }
    if (configs.lmstudio) {
        return configs.lmstudio;
    }
    if (configs.ornith) {
        return configs.ornith;
    }
    if (configs.ollama) {
        return configs.ollama;
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
            description: 'Type text into any input field, textarea, placeholder, or badge #N. Supports multi-field form filling without premature submissions.',
            parameters: {
                type: 'object',
                properties: {
                    text: { type: 'string', description: 'Text to type into the field' },
                    target: { type: 'string', description: 'Target element: Set-of-Marks badge (#1, #2), input placeholder, field label text, name, ID, or CSS selector. If omitted, uses active focused field or primary search input.' },
                    submit: { type: 'boolean', description: 'Whether to press Enter/submit after typing (default false; set true for search queries)' },
                    clear: { type: 'boolean', description: 'Whether to clear existing text before typing (default true)' }
                },
                required: ['text']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'press_key',
            description: 'Dispatch physical keyboard events (e.g. "Space" to play/pause video, "Enter" to submit, "Tab" to advance input, "Escape" to dismiss modals, "ArrowDown", "ArrowUp", "k")',
            parameters: {
                type: 'object',
                properties: {
                    key: { type: 'string', description: 'Key identifier to press, e.g. "Space", "Enter", "Tab", "Escape", "ArrowDown", "ArrowUp", "k"' },
                    modifiers: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Optional modifiers, e.g. ["Control"], ["Shift"], ["Alt"]'
                    }
                },
                required: ['key']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'hover_element',
            description: 'Hover mouse over an element or badge #N to reveal dropdown menus, tooltips, or player controls',
            parameters: {
                type: 'object',
                properties: {
                    target: { type: 'string', description: 'Button text, mark badge #N, or selector to hover over' }
                },
                required: ['target']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'delegate_subtask',
            description: 'Delegate a focused task to a tracked sub-agent (Max 3 concurrent). The sub-agent executes independently and returns structured results back to the main agent.',
            parameters: {
                type: 'object',
                properties: {
                    subagent_id: { type: 'string', description: 'Unique tracking ID for the sub-agent, e.g. "sub_form_1", "sub_video_2"' },
                    role: { type: 'string', description: 'Role or specialization, e.g. "form_filler", "media_player", "tab_searcher"' },
                    goal: { type: 'string', description: 'Specific goal/task for the sub-agent to accomplish' },
                    tab_id: { type: 'integer', description: 'Optional tab ID to bind the sub-agent to' }
                },
                required: ['subagent_id', 'role', 'goal']
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
            name: 'grep_page',
            description: 'Search the active webpage DOM text, headings, links, and buttons for specific keywords or phrases (e.g. "Big Mouth", "1080p", "Episode 1", "Music")',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Keyword, title, or phrase to search for on the active page' },
                    selector: { type: 'string', description: 'Optional CSS selector to constrain search' }
                },
                required: ['query']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'verify_media_playback',
            description: 'Inspect HTML5 media elements (<video>, <audio>) on the active page to verify if media, music, or video is actively playing, paused, or buffering',
            parameters: {
                type: 'object',
                properties: {}
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
    },
    {
        type: 'function',
        function: {
            name: 'get_tools_on_demand',
            description: 'Page specialized browser or memory tools into context on demand (Codex tool dispatcher). Keeps the model context lean.',
            parameters: {
                type: 'object',
                properties: {
                    category: {
                        type: 'string',
                        enum: ['all', 'second_brain', 'media', 'download', 'inspection', 'skills'],
                        description: 'Tool category to retrieve'
                    },
                    query: {
                        type: 'string',
                        description: 'Specific tool name or operation to find'
                    }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'search_memory',
            description: 'Search long-term memory: searches fast SQLite session summaries across 90 days and curated user preferences/facts in MEMORY.md.',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Search query keyword, topic, or date' },
                    limit: { type: 'integer', description: 'Max summaries to return (default 5)' }
                },
                required: ['query']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'read_raw_session',
            description: 'Fetch the complete, uncompressed raw chat transcript for a session from the 90-day archive on demand. Guarantees no detail is lost.',
            parameters: {
                type: 'object',
                properties: {
                    session_id: { type: 'string', description: 'Session ID to retrieve' }
                },
                required: ['session_id']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'list_skills',
            description: 'List all available procedural Antigravity skills (DOM navigator, credential autofill, gateway bypass, ponytale, etc.) with zero token bloat.',
            parameters: {
                type: 'object',
                properties: {}
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'read_skill',
            description: 'Load full procedural instructions for a skill on demand into working context.',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Name of the skill to load (e.g. "adblock-gateway-bypass", "credential-autofill", "ponytale")' }
                },
                required: ['name']
            }
        }
    }
];

export function generateToolSystemPrompt(tools = BROWSER_TOOLS) {
    if (!Array.isArray(tools) || tools.length === 0) {
        return '';
    }
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

async function fetchOpenAICompatibleWithFailover(config, requestBody, headers, signal = null) {
    const isReasoningModel = /gpt-oss|qwen3|deepseek-r1|qwq/i.test(config.model || '');
    if (isReasoningModel && !requestBody.reasoning_effort) {
        requestBody.reasoning_effort = 'low';
    }

    // Normalize localhost to 127.0.0.1 to avoid Windows IPv6 ::1 connection drops
    let cleanBaseUrl = (config.baseUrl || '').replace(/\/+$/, '');
    if (cleanBaseUrl.includes('localhost:')) {
        cleanBaseUrl = cleanBaseUrl.replace('localhost:', '127.0.0.1:');
    }

    // Ensure requestBody uses the exact user-selected model
    if (!requestBody.model || requestBody.model === 'default') {
        requestBody.model = config.model;
    }

    try {
        const res = await fetch(`${cleanBaseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
            ...(signal ? { signal } : {})
        });

        if (res.ok) {
            return { res, activeConfig: config };
        }

        // If the configured model was not found (404/400) on this specific endpoint,
        // query /models on THIS SAME user-selected endpoint to find the matching model ID
        if (res.status === 404 || res.status === 400) {
            const avail = await fetchAvailableModels({ ...config, baseUrl: cleanBaseUrl });
            if (avail.success && avail.models.length > 0 && !avail.models.includes(requestBody.model)) {
                const match = avail.models.find(m =>
                    m.toLowerCase().includes((config.model || '').toLowerCase()) ||
                    (config.model || '').toLowerCase().includes(m.toLowerCase())
                ) || avail.models[0];

                const retryBody = { ...requestBody, model: match };
                if (/gpt-oss|qwen3|deepseek-r1|qwq/i.test(match)) {
                    retryBody.reasoning_effort = 'low';
                }
                const retryRes = await fetch(`${cleanBaseUrl}/chat/completions`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(retryBody),
                    ...(signal ? { signal } : {})
                });
                if (retryRes.ok) {
                    const updatedAll = getAiProvidersConfig();
                    if (updatedAll[config.id]) {
                        updatedAll[config.id].model = match;
                        saveAiProvidersConfig(updatedAll);
                    }
                    return { res: retryRes, activeConfig: { ...config, model: match } };
                }
            }
        }

        return { res, activeConfig: config };
    } catch (err) {
        if (err.name === 'AbortError' || signal?.aborted) throw err;
        throw new Error(`Failed to connect to ${config.name} at ${cleanBaseUrl}: ${err.message}. Please verify the local server is running with model "${config.model}".`);
    }
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
    tools = BROWSER_TOOLS,
    config: customConfig = null
}) {
    const config = customConfig || getActiveProviderConfig();
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

        let { res, activeConfig } = await fetchOpenAICompatibleWithFailover(config, requestBody, headers);

        // If provider returned error due to tools parameter, retry without tools in payload (system prompt instructions remain)
        if (!res.ok && requestBody.tools) {
            delete requestBody.tools;
            const retryOut = await fetchOpenAICompatibleWithFailover(activeConfig, requestBody, headers);
            res = retryOut.res;
            activeConfig = retryOut.activeConfig;
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
            reasoning: choice.message?.reasoning_content || choice.message?.reasoning || '',
            toolCalls,
            provider: activeConfig.name,
            model: activeConfig.model
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
    signal = null,
    config: customConfig = null
}) {
    const config = customConfig || getActiveProviderConfig();
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

        let { res, activeConfig } = await fetchOpenAICompatibleWithFailover(config, requestBody, headers, signal);

        // Fallback without tools if tools payload rejected
        if (!res.ok && requestBody.tools) {
            delete requestBody.tools;
            const retryOut = await fetchOpenAICompatibleWithFailover(activeConfig, requestBody, headers, signal);
            res = retryOut.res;
            activeConfig = retryOut.activeConfig;
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
            provider: activeConfig.name,
            model: activeConfig.model
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

