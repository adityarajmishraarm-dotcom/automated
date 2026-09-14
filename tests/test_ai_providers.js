const {
    DEFAULT_PROVIDERS,
    getAiProvidersConfig,
    testConnection
} = require('../desktop/src/services/aiProviderService.js');

async function testProviders() {
    console.log('====================================================');
    console.log('VERIFYING AI PROVIDER SERVICE & CONFIGURATION');
    console.log('====================================================\n');

    // 1. Verify 7 target providers exist
    const expectedProviders = [
        'openai',
        'lmstudio',
        'ollama',
        'openrouter',
        'opencode',
        'opencodezen',
        'anthropic'
    ];

    console.log('[1] Checking 7 required AI providers definitions...');
    for (const id of expectedProviders) {
        const prov = DEFAULT_PROVIDERS[id];
        if (!prov) throw new Error(`Missing expected provider: ${id}`);
        console.log(`  ✓ Provider [${id}]: "${prov.name}" (Type: ${prov.type}, BaseURL: ${prov.baseUrl}, Default Model: ${prov.model})`);
    }

    // 2. Verify Anthropic schema requires apiKey and formats correctly
    console.log('\n[2] Testing Anthropic safety checks (API Key required)...');
    const anthropicNoKey = await testConnection('anthropic', {
        type: 'anthropic',
        baseUrl: 'https://api.anthropic.com/v1',
        apiKey: ''
    });
    console.log('  ✓ Anthropic without key correctly rejected:', anthropicNoKey.error);
    if (anthropicNoKey.success) {
        throw new Error('Anthropic should require API key');
    }

    // 3. Verify Local LM Studio / Ollama connection test handling
    console.log('\n[3] Testing LM Studio local connection probe...');
    const lmStudioTest = await testConnection('lmstudio', {
        type: 'openai_compatible',
        baseUrl: 'http://127.0.0.1:1234/v1',
        model: 'local-model'
    });
    console.log('  ✓ LM Studio probe executed (Latency / Error handled gracefully):', lmStudioTest.error || 'Connected');

    console.log('\n[4] Testing Ollama local connection probe...');
    const ollamaTest = await testConnection('ollama', {
        type: 'openai_compatible',
        baseUrl: 'http://127.0.0.1:11434/v1',
        model: 'llama3.2-vision'
    });
    console.log('  ✓ Ollama probe executed (Latency / Error handled gracefully):', ollamaTest.error || 'Connected');

    console.log('\n====================================================');
    console.log('ALL AI PROVIDER TESTS PASSED SUCCESSFULLY!');
    console.log('====================================================\n');
}

testProviders().catch(err => {
    console.error('❌ AI Provider Test Failed:', err);
    process.exit(1);
});
