// Test Response Streaming & Thinking Streaming with Native Fetch & SSE Reader
import http from 'http';
import { streamChatMessage } from '../desktop/src/services/aiProviderService.js';

async function runStreamingVerification() {
    console.log('====================================================');
    console.log('TESTING RESPONSE STREAMING & THINKING STREAMING');
    console.log('====================================================\n');

    // 1. Spin up a lightweight local mock OpenAI-compatible SSE server
    const mockPort = 4998;
    const server = http.createServer((req, res) => {
        if (req.url === '/v1/chat/completions' && req.method === 'POST') {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });

            // Emit thinking deltas
            const thinkingChunks = ['I need to ', 'open moviesmod.zone ', 'and find the download link.'];
            // Emit content deltas
            const contentChunks = ['Navigating ', 'to moviesmod.zone ', 'now...'];

            let delay = 30;
            for (const t of thinkingChunks) {
                setTimeout(() => {
                    res.write(`data: ${JSON.stringify({
                        choices: [{ delta: { reasoning_content: t } }]
                    })}\n\n`);
                }, delay);
                delay += 30;
            }

            for (const c of contentChunks) {
                setTimeout(() => {
                    res.write(`data: ${JSON.stringify({
                        choices: [{ delta: { content: c } }]
                    })}\n\n`);
                }, delay);
                delay += 30;
            }

            // Emit tool call delta
            setTimeout(() => {
                res.write(`data: ${JSON.stringify({
                    choices: [{ delta: {
                        tool_calls: [{
                            index: 0,
                            id: 'call_mock_1',
                            type: 'function',
                            function: { name: 'navigate', arguments: '{"url":"https://moviesmod.zone"}' }
                        }]
                    } }]
                })}\n\n`);
            }, delay);
            delay += 30;

            // Emit DONE
            setTimeout(() => {
                res.write('data: [DONE]\n\n');
                res.end();
            }, delay);
            return;
        }
        res.writeHead(404);
        res.end();
    });

    await new Promise((resolve) => server.listen(mockPort, resolve));
    console.log(`[1] Started mock SSE stream server on port ${mockPort}`);

    // Temporarily mock localStorage for node environment if not present
    if (typeof global.localStorage === 'undefined') {
        global.localStorage = {
            getItem: (key) => {
                if (key === 'antigravity_active_ai_provider') return 'mock_test';
                if (key === 'antigravity_ai_providers_config') return JSON.stringify({
                    mock_test: {
                        id: 'mock_test',
                        name: 'Mock Test Provider',
                        type: 'openai_compatible',
                        baseUrl: `http://localhost:${mockPort}/v1`,
                        apiKey: 'test-key',
                        model: 'mock-model'
                    }
                });
                return null;
            },
            setItem: () => {}
        };
    }

    try {
        const receivedReasoningChunks = [];
        const receivedContentChunks = [];

        console.log('[2] Dispatching streamChatMessage with live callbacks...');
        const result = await streamChatMessage({
            prompt: 'Open moviesmod.zone and download episode 1',
            onChunk: (chunk) => {
                receivedContentChunks.push(chunk);
                process.stdout.write(`  [Content Token] "${chunk}"\n`);
            },
            onReasoningChunk: (thoughtChunk) => {
                receivedReasoningChunks.push(thoughtChunk);
                process.stdout.write(`  [Thought Token] "${thoughtChunk}"\n`);
            }
        });

        console.log('\n[3] Stream completed! Inspecting aggregated result:');
        console.log('  Success:', result.success);
        console.log('  Aggregated Reply:', JSON.stringify(result.reply));
        console.log('  Aggregated Reasoning:', JSON.stringify(result.reasoning));
        console.log('  Accumulated Tool Calls:', JSON.stringify(result.toolCalls, null, 2));

        if (!result.success) throw new Error('Stream returned success: false');
        if (receivedReasoningChunks.length === 0) throw new Error('No reasoning chunks received!');
        if (receivedContentChunks.length === 0) throw new Error('No content chunks received!');
        if (!result.toolCalls || result.toolCalls.length === 0) throw new Error('No tool calls parsed!');
        if (result.toolCalls[0].name !== 'navigate') throw new Error('Tool call name mismatch!');

        console.log('\n[4] Testing AbortController cancellation...');
        const abortCtrl = new AbortController();
        const abortPromise = streamChatMessage({
            prompt: 'Test abort',
            signal: abortCtrl.signal,
            onChunk: () => {}
        });
        abortCtrl.abort();
        const abortResult = await abortPromise;
        console.log('  ✓ Abort result handled gracefully:', abortResult);

        console.log('\n====================================================');
        console.log('ALL STREAMING & REASONING TESTS PASSED PERFECTLY!');
        console.log('====================================================');
    } finally {
        server.close();
    }
}

runStreamingVerification().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
