// Test multi-turn autonomous agent loop with LM Studio ornith-1.0-9b
async function testAgentLoop() {
    const goal = "open a new tab and in that open the moviesmod.zone and then download the first episode of the A Love Other Than Yours and then verify it and then remind me when it's done";

    console.log('Testing Autonomous Agent Loop with Goal:\n"', goal, '"\n');

    const systemPrompt = `You are the Autonomous Antigravity Browser Agent. You directly control this browser.
You receive a goal and current browser observations.
You must REASON on the goal, formulate your plan, and decide the next browser tool to execute.

Available Tools:
- open_tab: { "url": string } (opens a new tab and navigates)
- navigate: { "url": string } (navigates active tab)
- read_page: {} (inspects active webpage title, URL, search boxes, and download links)
- search_page: { "query": string } (types into the page search input and submits)
- click_element: { "target": string } (clicks link, button, or episode by text)
- download_item: { "url"?: string, "target"?: string } (triggers download)
- verify_download: {} (checks download manager and disk status)
- remind_user: { "message": string } (triggers audio chime and speech reminder to user)
- finish_task: { "message": string, "success": boolean } (marks goal completed)

Output format:
\`\`\`tool_call
{
  "plan": "Summary of plan",
  "steps": [
    { "tool": "<tool_name>", "args": { ... } }
  ]
}
\`\`\``;

    const messages = [
        { role: 'system', content: systemPrompt },
        {
            role: 'user',
            content: `User Goal: "${goal}"\nCurrent State: 1 tab open (Google). No active downloads. What is your plan and first action?`
        }
    ];

    console.log('[Turn 1] Querying LM Studio...');
    let res = await fetch('http://127.0.0.1:1234/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'ornith-1.0-9b',
            messages,
            temperature: 0.1
        })
    }).then(r => r.json());

    let turn1Content = res.choices?.[0]?.message?.content;
    let turn1Reasoning = res.choices?.[0]?.message?.reasoning_content;
    console.log('[Turn 1 Reasoning]:', turn1Reasoning?.trim());
    console.log('[Turn 1 Output]:\n', turn1Content);

    // Add Turn 1 to conversation
    messages.push({ role: 'assistant', content: turn1Content });

    // Turn 2: Simulate page observation after opening moviesmod.zone
    messages.push({
        role: 'user',
        content: `[Observation after executing open_tab]
- Opened New Tab #2: "MoviesMod - Download 480p, 720p, 1080p Movies & Web Series" (https://moviesmod.zone/)
- Page Phase: SEARCH_AVAILABLE
- Available Search Input: <input name="s" placeholder="Search...">
- Featured Posts:
  1. "Download A Love Other Than Yours Season 1 (2025) Hindi Complete"
  2. "Download Edge of Tomorrow (2014) Dual Audio"

What is your next action?`
    });

    console.log('\n[Turn 2] Querying LM Studio with Observation...');
    res = await fetch('http://127.0.0.1:1234/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'ornith-1.0-9b',
            messages,
            temperature: 0.1
        })
    }).then(r => r.json());

    let turn2Content = res.choices?.[0]?.message?.content;
    let turn2Reasoning = res.choices?.[0]?.message?.reasoning_content;
    console.log('[Turn 2 Reasoning]:', turn2Reasoning?.trim());
    console.log('[Turn 2 Output]:\n', turn2Content);

    // Add Turn 2 to conversation
    messages.push({ role: 'assistant', content: turn2Content });

    // Turn 3: Simulate post page with Episode 1 download links
    messages.push({
        role: 'user',
        content: `[Observation after clicking "Download A Love Other Than Yours Season 1"]
- Active Tab URL: https://moviesmod.zone/download-a-love-other-than-yours-season-1/
- Page Title: "A Love Other Than Yours [Season 1] Episodes 1-10 Download"
- Download Triggers Detected:
  1. "Episode 1 (720p 250MB) - Fast Cloud Server" (href: https://fastserver.xyz/dl/alove-ep1)
  2. "Episode 1 (480p 120MB) - Direct G-Drive"
  3. "Episode 2 (720p 250MB) - Fast Cloud Server"

What is your next action?`
    });

    console.log('\n[Turn 3] Querying LM Studio for Download Trigger...');
    res = await fetch('http://127.0.0.1:1234/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'ornith-1.0-9b',
            messages,
            temperature: 0.1
        })
    }).then(r => r.json());

    let turn3Content = res.choices?.[0]?.message?.content;
    let turn3Reasoning = res.choices?.[0]?.message?.reasoning_content;
    console.log('[Turn 3 Reasoning]:', turn3Reasoning?.trim());
    console.log('[Turn 3 Output]:\n', turn3Content);

    // Add Turn 3 to conversation
    messages.push({ role: 'assistant', content: turn3Content });

    // Turn 4: Simulate download verified
    messages.push({
        role: 'user',
        content: `[Observation after download_item]
- Download Manager State: 1 Completed Download
- File: "A_Love_Other_Than_Yours_S01E01_720p.mkv" (256.4 MB)
- Status: Completed (Verified on disk at C:\\Users\\Anurag\\Downloads\\A_Love_Other_Than_Yours_S01E01_720p.mkv)

What is your next action?`
    });

    console.log('\n[Turn 4] Querying LM Studio for Verification & Reminder...');
    res = await fetch('http://127.0.0.1:1234/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'ornith-1.0-9b',
            messages,
            temperature: 0.1
        })
    }).then(r => r.json());

    let turn4Content = res.choices?.[0]?.message?.content;
    let turn4Reasoning = res.choices?.[0]?.message?.reasoning_content;
    console.log('[Turn 4 Reasoning]:', turn4Reasoning?.trim());
    console.log('[Turn 4 Output]:\n', turn4Content);
}

testAgentLoop();
