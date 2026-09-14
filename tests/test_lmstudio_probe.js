// Probe LM Studio model response format and reasoning
async function probe() {
    try {
        const res = await fetch('http://127.0.0.1:1234/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'ornith-1.0-9b',
                messages: [
                    {
                        role: 'system',
                        content: `You are Antigravity Browser AI Copilot.
You have direct control over browser tools to navigate, search, download, and verify web pages.

To take actions, you MUST emit one or more tool calls formatted in a json code block:
\`\`\`tool_call
{
  "plan": "Summary of plan",
  "steps": [
    { "tool": "open_tab", "args": { "url": "https://www.youtube.com" } }
  ]
}
\`\`\`

Available Tools:
- open_tab: { "url": string } (opens a new tab and navigates if url is provided)
- navigate: { "url": string } (navigates active tab)
- click_element: { "target": string, "rank"?: number } (clicks link/button by text or description)
- type_text: { "selector"?: string, "text": string, "submit"?: boolean } (types in search bar or input)
- scroll_page: { "direction": "up"|"down", "amount": number } (scrolls page)
- download_item: { "url": string } (triggers native download)
- verify_state: { "type": "tab"|"download"|"url", "expected"?: string } (verifies action outcome)
- remind_user: { "message": string } (sends a high-priority notification reminder to user)

Decide what to do dynamically based on the user's intent. Never just talk about doing it—emit the tool calls.`
                    },
                    {
                        role: 'user',
                        content: 'open a new tab and in that open the moviesmod.zone and then download the first episode of the A Love Other Than Yours and then verify it and then remind me when it\'s done'
                    }
                ],
                temperature: 0.1
            })
        });
        const data = await res.json();
        console.log('ornith response message:');
        console.log(JSON.stringify(data.choices?.[0]?.message, null, 2));
    } catch (e) {
        console.error('Probe error:', e);
    }
}

probe();
