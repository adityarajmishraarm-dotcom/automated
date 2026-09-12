const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4892;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types dictionary
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
};

// In-Memory TabStripModel state
let tabs = [
    {
        id: 1,
        title: "Hacker News Clone",
        url: "https://news.ycombinator.com",
        source_html: `<!DOCTYPE html>
<html>
<head>
    <title>Hacker News Clone</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 20px; background: #f6f6ef; color: #222; }
        header { background: #ff6600; padding: 6px 12px; display: flex; align-items: center; gap: 12px; font-size: 14px; font-weight: bold; border-radius: 4px; }
        header a { color: #222; text-decoration: none; }
        .story { padding: 12px 0; border-bottom: 1px solid #e0e0d8; }
        .story a { color: #000; text-decoration: none; font-weight: 500; font-size: 15px; }
        .story a:hover { text-decoration: underline; }
        .upvote { background: #ff6600; color: white; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer; font-size: 12px; margin-right: 6px; }
        .subtext { font-size: 11px; color: #828282; margin-top: 4px; margin-left: 28px; }
        .search-container { margin-top: 24px; padding: 16px; background: white; border-radius: 6px; border: 1px solid #ddd; }
        input[type="text"] { padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; width: 280px; }
        button.btn-search { padding: 8px 16px; background: #ff6600; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
        .turnstile-box { margin-top: 20px; padding: 12px; background: #fff8e1; border: 1px dashed #ffa000; border-radius: 6px; font-size: 13px; }
    </style>
</head>
<body>
    <header>
        <span style="border:1px solid white; padding: 0 4px; color:white; font-weight:900;">Y</span>
        <a href="/" id="hn-home" aria-label="Hacker News Home">Hacker News</a>
        <a href="/new" id="hn-new">new</a> |
        <a href="/past" id="hn-past">past</a> |
        <a href="/comments" id="hn-comments">comments</a> |
        <a href="/ask" id="hn-ask">ask</a> |
        <a href="/show" id="hn-show">show</a> |
        <a href="/jobs" id="hn-jobs">jobs</a> |
        <a href="/submit" id="hn-submit">submit</a>
    </header>
    <main>
        <div class="story" id="story-row-1">
            <button class="upvote" id="btn-upvote-1" aria-label="upvote story 1">▲</button>
            <a href="https://example.com/ai-native-browser" id="link-show-hn">Show HN: AI-Native Browser with In-Process Chromium Engine</a>
            <div class="subtext">184 points by antiautoma 3 hours ago | 64 comments</div>
        </div>
        <div class="story" id="story-row-2">
            <button class="upvote" id="btn-upvote-2" aria-label="upvote story 2">▲</button>
            <a href="https://example.com/adblock-rust" id="link-adblock">Why Brave's adblock-rust is the Gold Standard for Token Reduction</a>
            <div class="subtext">95 points by rustdev 5 hours ago | 31 comments</div>
        </div>
        <div class="story" id="story-row-3">
            <button class="upvote" id="btn-upvote-3" aria-label="upvote story 3">▲</button>
            <a href="https://example.com/devtools-agent" id="link-devtools">Skipping CDP WebSockets via content::DevToolsAgentHost</a>
            <div class="subtext">210 points by blink_hacker 7 hours ago | 112 comments</div>
        </div>
        <div class="search-container">
            <h3>Search Y Combinator Archives</h3>
            <form id="search-form" onsubmit="event.preventDefault(); alert('Searched!');">
                <input type="text" id="search-query" name="q" placeholder="Search stories, authors, URLs..." autocomplete="off" />
                <button type="submit" class="btn-search" id="btn-search-submit">Search</button>
            </form>
        </div>
        <div class="turnstile-box">
            <strong>🛡️ Bot Protection:</strong>
            <div class="cf-turnstile" data-sitekey="0x4AAAAAAAJ-CF_EXAMPLE_KEY" id="cf-turnstile-widget">
                [Cloudflare Turnstile Active Widget]
            </div>
        </div>
    </main>
</body>
</html>`
    },
    {
        id: 2,
        title: "Checkout Form Demo",
        url: "https://store.example.com/checkout",
        source_html: `<!DOCTYPE html>
<html>
<head>
    <title>Checkout Form Demo</title>
    <style>
        body { font-family: -apple-system, sans-serif; padding: 24px; background: #0f172a; color: #f8fafc; }
        .card { max-width: 500px; margin: 0 auto; background: #1e293b; padding: 24px; border-radius: 10px; border: 1px solid #334155; }
        h2 { margin-top: 0; color: #38bdf8; }
        .form-group { margin-bottom: 14px; }
        label { display: block; font-size: 13px; margin-bottom: 4px; color: #94a3b8; }
        input { width: 100%; box-sizing: border-box; padding: 10px 12px; background: #0f172a; border: 1px solid #475569; border-radius: 6px; color: white; font-size: 14px; }
        button { width: 100%; padding: 12px; background: #38bdf8; color: #0f172a; border: none; border-radius: 6px; font-weight: bold; font-size: 15px; cursor: pointer; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="card">
        <h2>⚡ Express Checkout (Autofill Test)</h2>
        <form id="payment-form">
            <div class="form-group">
                <label>Full Name</label>
                <input id="autofill-name" name="name" type="text" autocomplete="name" placeholder="John Doe" />
            </div>
            <div class="form-group">
                <label>Email Address</label>
                <input id="autofill-email" name="email" type="email" autocomplete="email" placeholder="john@example.com" />
            </div>
            <div class="form-group">
                <label>Street Address</label>
                <input id="autofill-address" name="address" type="text" autocomplete="address-line1" placeholder="742 Evergreen Terrace" />
            </div>
            <div class="form-group">
                <label>City</label>
                <input id="autofill-city" name="city" type="text" autocomplete="address-level2" placeholder="Springfield" />
            </div>
            <div class="form-group">
                <label>Credit Card Number</label>
                <input id="autofill-card" name="card" type="text" autocomplete="cc-number" placeholder="4111 2222 3333 4444" />
            </div>
            <button type="button" id="btn-pay" onclick="alert('Order Placed Successfully!')">Pay $49.00</button>
        </form>
    </div>
</body>
</html>`
    }
];

let activeTabId = 1;
let hitlActive = false;

// HTTP Server
const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
    let pathname = parsedUrl.pathname;

    // API Routes
    if (pathname === '/api/tabs') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ tabs, activeTabId }));
    }

    if (pathname === '/api/tab/switch' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const data = JSON.parse(body || '{}');
            activeTabId = data.id || activeTabId;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, activeTabId }));
        });
        return;
    }

    if (pathname === '/api/tab/new' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const data = JSON.parse(body || '{}');
            const newId = tabs.length ? Math.max(...tabs.map(t => t.id)) + 1 : 1;
            const newTab = {
                id: newId,
                title: data.title || "New Tab",
                url: data.url || "https://example.com",
                source_html: `<html><body style="font-family:sans-serif;padding:30px;background:#111;color:#eee;"><h2>New Tab ${newId}</h2><p>URL: ${data.url || 'https://example.com'}</p><button id="btn-test">Action Button</button></body></html>`
            };
            tabs.push(newTab);
            activeTabId = newId;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, tab: newTab }));
        });
        return;
    }

    if (pathname === '/api/tab/close' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const data = JSON.parse(body || '{}');
            tabs = tabs.filter(t => t.id !== data.id);
            if (activeTabId === data.id && tabs.length > 0) {
                activeTabId = tabs[0].id;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, tabs, activeTabId }));
        });
        return;
    }

    if (pathname === '/api/tab/navigate' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const data = JSON.parse(body || '{}');
            const tab = tabs.find(t => t.id === activeTabId);
            if (tab) {
                tab.url = data.url;
                tab.title = data.url.replace(/^https?:\/\//, '').split('/')[0];
                tab.source_html = `<html><body style="font-family:sans-serif;padding:30px;background:#0d1117;color:#c9d1d9;"><h2>Loaded: ${data.url}</h2><p>In-Process WebContents LoadURL completed successfully with 0ms socket latency.</p><button id="btn-sample-action">Sample Action Button</button><input id="sample-input" type="text" placeholder="Sample Input" /></body></html>`;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, tab }));
        });
        return;
    }

    if (pathname === '/api/grep' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const data = JSON.parse(body || '{}');
            const query = data.query || '';
            const offset = data.offset || 0;
            const limit = data.limit || 10;
            const tab = tabs.find(t => t.id === activeTabId);
            const html = tab ? tab.source_html : '';
            const lines = html.split('\n');

            const matchedIndices = [];
            lines.forEach((line, idx) => {
                if (line.toLowerCase().includes(query.toLowerCase())) {
                    matchedIndices.push(idx);
                }
            });

            const totalMatches = matchedIndices.length;
            const slice = matchedIndices.slice(offset, offset + limit);

            const matches = slice.map(lineIdx => {
                const topStart = Math.max(0, lineIdx - 10);
                const bottomEnd = Math.min(lines.length, lineIdx + 11);

                return {
                    lineNumber: lineIdx + 1,
                    matchedLine: lines[lineIdx],
                    topLines: lines.slice(topStart, lineIdx),
                    bottomLines: lines.slice(lineIdx + 1, bottomEnd)
                };
            });

            const hasMore = (offset + limit) < totalMatches;
            const nextOffset = hasMore ? offset + limit : 0;

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                query,
                totalMatches,
                currentOffset: offset,
                returnedCount: matches.length,
                hasMore,
                nextOffset,
                matches
            }));
        });
        return;
    }

    if (pathname === '/api/hitl/toggle' && req.method === 'POST') {
        hitlActive = !hitlActive;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ hitlActive, status: hitlActive ? "Human Input Required: Manual Verification" : "Autonomous Mode Resumed" }));
        return;
    }

    // Static files
    if (pathname === '/') pathname = '/index.html';
    const filePath = path.join(PUBLIC_DIR, pathname);
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'text/plain';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`[Native AI Browser Shell] Server running at http://localhost:${PORT}`);
});
