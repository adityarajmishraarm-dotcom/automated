#define _WIN32_WINNT 0x0600
#include <winsock2.h>
#include <windows.h>
#include <ws2tcpip.h>

#include <iostream>
#include <string>
#include <sstream>
#include <vector>
#include <fstream>
#include <algorithm>

namespace {

const int PORT = 4892;

struct TabData {
    int id;
    std::string title;
    std::string url;
    std::string source_html;
    bool is_pinned = false;
    bool is_muted = false;
    bool is_audio_playing = false;
    bool is_frozen = false;
    std::string workspace = "default";
    std::string group_id = "";
    std::string group_name = "";
    std::string group_color = "";
    double ram_mb = 142.5;
    double cpu_percent = 0.8;
};

std::vector<TabData> tabs;
std::vector<TabData> closed_stack;
int activeTabId = 1;
bool hitlActive = false;
std::string activeWorkspace = "default";
int nextTabId = 5;

std::string GetMimeType(const std::string& path) {
    if (path.find(".html") != std::string::npos) return "text/html; charset=utf-8";
    if (path.find(".css") != std::string::npos) return "text/css; charset=utf-8";
    if (path.find(".js") != std::string::npos) return "application/javascript; charset=utf-8";
    if (path.find(".jsx") != std::string::npos) return "text/javascript; charset=utf-8";
    if (path.find(".json") != std::string::npos) return "application/json; charset=utf-8";
    if (path.find(".svg") != std::string::npos) return "image/svg+xml";
    if (path.find(".png") != std::string::npos) return "image/png";
    if (path.find(".ico") != std::string::npos) return "image/x-icon";
    if (path.find(".woff2") != std::string::npos) return "font/woff2";
    return "text/plain; charset=utf-8";
}

std::string ReadFileContent(const std::string& filepath) {
    std::ifstream f(filepath.c_str(), std::ios::binary);
    if (!f.is_open()) return "";
    std::stringstream buf;
    buf << f.rdbuf();
    return buf.str();
}

std::string EscapeJsonString(const std::string& input) {
    std::ostringstream ss;
    for (char c : input) {
        if (c == '"') ss << "\\\"";
        else if (c == '\\') ss << "\\\\";
        else if (c == '\b') ss << "\\b";
        else if (c == '\f') ss << "\\f";
        else if (c == '\n') ss << "\\n";
        else if (c == '\r') ss << "\\r";
        else if (c == '\t') ss << "\\t";
        else if (static_cast<unsigned char>(c) < 32) {
            // control char
        } else {
            ss << c;
        }
    }
    return ss.str();
}

void InitTabs() {
    tabs.clear();
    closed_stack.clear();

    // Tab 1: Pinned Hacker News
    TabData t1;
    t1.id = 1;
    t1.title = "Hacker News";
    t1.url = "https://news.ycombinator.com";
    t1.is_pinned = true;
    t1.is_muted = false;
    t1.is_audio_playing = true;
    t1.is_frozen = false;
    t1.workspace = "default";
    t1.ram_mb = 88.4;
    t1.cpu_percent = 1.2;
    t1.source_html = R"HTML(<!DOCTYPE html>
<html>
<head>
    <title>Hacker News</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 24px; background: #0f172a; color: #f1f5f9; }
        header { background: #ff6600; padding: 12px 18px; display: flex; align-items: center; gap: 14px; font-size: 15px; font-weight: 700; border-radius: 8px; color: white; box-shadow: 0 4px 12px rgba(255, 102, 0, 0.25); }
        header a { color: white; text-decoration: none; }
        .badge-logo { background: white; color: #ff6600; padding: 1px 7px; border-radius: 4px; font-weight: 900; }
        .story-list { margin-top: 18px; display: flex; flex-direction: column; gap: 14px; }
        .story { padding: 14px 18px; background: #1e293b; border-radius: 8px; border: 1px solid #334155; transition: border-color 0.2s; }
        .story:hover { border-color: #ff6600; }
        .story a { color: #38bdf8; text-decoration: none; font-weight: 600; font-size: 16px; }
        .upvote { background: #ff6600; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 13px; margin-right: 8px; font-weight: bold; }
        .subtext { font-size: 12px; color: #94a3b8; margin-top: 6px; margin-left: 36px; }
        .search-container { margin-top: 24px; padding: 18px; background: #1e293b; border-radius: 8px; border: 1px solid #334155; }
        input[type="text"] { padding: 10px 14px; background: #0f172a; border: 1px solid #475569; border-radius: 6px; width: 300px; color: white; font-size: 14px; }
        button.btn-search { padding: 10px 20px; background: #ff6600; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 700; margin-left: 8px; font-size: 14px; }
        .turnstile-box { margin-top: 20px; padding: 14px; background: rgba(16, 185, 129, 0.1); border: 1px dashed #10b981; border-radius: 8px; font-size: 13px; color: #34d399; }
    </style>
</head>
<body>
    <header>
        <span class="badge-logo">Y</span>
        <a href="/" id="hn-home">Hacker News</a>
        <a href="/new" id="hn-new">new</a> |
        <a href="/comments" id="hn-comments">comments</a> |
        <a href="/ask" id="hn-ask">ask</a>
    </header>
    <main>
        <div class="story-list">
            <div class="story">
                <button class="upvote" id="btn-upvote-1">▲</button>
                <a href="https://news.ycombinator.com/item?id=41001" id="link-show-hn">Show HN: Antigravity AI-Native Chromium Browser Tab Engine (Option C)</a>
                <div class="subtext">489 points by devilaiger 3 hours ago | 114 comments</div>
            </div>
            <div class="story">
                <button class="upvote" id="btn-upvote-2">▲</button>
                <a href="https://news.ycombinator.com/item?id=41002" id="link-vlm">In-Process VLM Grounding via Set-of-Marks (#FFE600 Badges)</a>
                <div class="subtext">274 points by vision_research 5 hours ago | 68 comments</div>
            </div>
        </div>
        <div class="search-container">
            <h3 style="margin-top:0; color:#38bdf8;">Search Y Combinator Archives</h3>
            <form id="search-form" onsubmit="event.preventDefault(); alert('Search executed in-process!');">
                <input type="text" id="search-query" name="q" placeholder="Search stories, authors, comments..." />
                <button type="submit" class="btn-search" id="btn-search-submit">Search</button>
            </form>
        </div>
        <div class="turnstile-box">
            <strong>🛡️ Bot Protection & Stealth:</strong>
            <div class="cf-turnstile" id="cf-turnstile-widget">
                Cloudflare Turnstile Verified (Stealth Mode • Zero Port Leaks)
            </div>
        </div>
    </main>
</body>
</html>)HTML";

    // Tab 2: GitHub Repository (Work Workspace, DevOps group)
    TabData t2;
    t2.id = 2;
    t2.title = "GitHub - antigravity/tab-engine";
    t2.url = "https://github.com/antigravity/tab-management-engine";
    t2.is_pinned = false;
    t2.is_muted = false;
    t2.is_audio_playing = false;
    t2.is_frozen = false;
    t2.workspace = "work";
    t2.group_id = "grp-dev";
    t2.group_name = "DevOps";
    t2.group_color = "#10B981";
    t2.ram_mb = 164.2;
    t2.cpu_percent = 0.4;
    t2.source_html = R"HTML(<!DOCTYPE html>
<html>
<head>
    <title>GitHub - antigravity/tab-management-engine</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 24px; background: #0d1117; color: #c9d1d9; }
        .repo-header { border-bottom: 1px solid #30363d; padding-bottom: 16px; margin-bottom: 20px; }
        .repo-title { font-size: 20px; color: #58a6ff; font-weight: 600; }
        .badges { display: flex; gap: 8px; margin-top: 10px; }
        .badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; background: #21262d; border: 1px solid #30363d; }
        .badge-green { color: #3fb950; border-color: rgba(63, 185, 80, 0.4); }
        .badge-purple { color: #bc8cff; border-color: rgba(188, 140, 255, 0.4); }
        .code-box { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 18px; font-family: 'JetBrains Mono', Consolas, monospace; font-size: 13px; line-height: 1.6; }
        .btn-action { padding: 8px 14px; background: #238636; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; }
    </style>
</head>
<body>
    <div class="repo-header">
        <div class="repo-title">📦 antigravity / tab-management-engine</div>
        <div class="badges">
            <span class="badge badge-green">CI: 22/22 Tests Passing</span>
            <span class="badge badge-purple">C++11 / Chromium TabStripModel</span>
            <span class="badge">React 18 Architecture</span>
        </div>
    </div>
    <div class="code-box">
        <p style="color:#7ee787;">// 8 Architectural Pillars Active:</p>
        <div>1. TabStripModel & Typed Thread-Safe EventBus (10 Event Types)</div>
        <div>2. Bounded LIFO UndoCloseStack (Ctrl+Shift+T Recovery)</div>
        <div>3. TabFreezeManager (Tier 1 DOM Freeze, Tier 2 Process Discard)</div>
        <div>4. TabGroupManager (Workspaces & Collapsible Color Groups)</div>
        <div>5. SessionPersistenceManager (.session.lock Crash Recovery)</div>
        <div>6. TabSearchIndex (In-Memory Fuzzy Filter & Command Palette)</div>
        <div>7. SplitViewManager (Side-by-Side Dual Pane Detachment)</div>
        <div>8. TabResourceTracker (Audio State Machine & RAM Budgets)</div>
    </div>
</body>
</html>)HTML";

    // Tab 3: Checkout Form Demo (Personal Workspace)
    TabData t3;
    t3.id = 3;
    t3.title = "Checkout Form Demo";
    t3.url = "https://store.example.com/checkout";
    t3.is_pinned = false;
    t3.is_muted = false;
    t3.is_audio_playing = false;
    t3.is_frozen = false;
    t3.workspace = "personal";
    t3.ram_mb = 76.8;
    t3.cpu_percent = 0.1;
    t3.source_html = R"HTML(<!DOCTYPE html>
<html>
<head>
    <title>Checkout Form Demo</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; background: #0f172a; color: #f8fafc; }
        .card { max-width: 520px; margin: 0 auto; background: #1e293b; padding: 24px; border-radius: 12px; border: 1px solid #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        h2 { margin-top: 0; color: #38bdf8; font-size: 20px; }
        .form-group { margin-bottom: 16px; }
        label { display: block; font-size: 13px; margin-bottom: 6px; color: #94a3b8; font-weight: 500; }
        input { width: 100%; box-sizing: border-box; padding: 10px 14px; background: #0f172a; border: 1px solid #475569; border-radius: 6px; color: white; font-size: 14px; outline: none; transition: border-color 0.2s; }
        input:focus { border-color: #38bdf8; }
        button { width: 100%; padding: 12px; background: #06b6d4; color: #0f172a; border: none; border-radius: 6px; font-weight: 700; font-size: 15px; cursor: pointer; margin-top: 12px; transition: opacity 0.2s; }
        button:hover { opacity: 0.9; }
    </style>
</head>
<body>
    <div class="card">
        <h2>⚡ Express Checkout (components/autofill Demo)</h2>
        <form id="payment-form">
            <div class="form-group">
                <label>Full Name</label>
                <input id="autofill-name" name="name" type="text" autocomplete="name" placeholder="John Doe" value="Alex Mercer" />
            </div>
            <div class="form-group">
                <label>Email Address</label>
                <input id="autofill-email" name="email" type="email" autocomplete="email" placeholder="john@example.com" value="alex.mercer@ai-browser.dev" />
            </div>
            <div class="form-group">
                <label>Street Address</label>
                <input id="autofill-address" name="address" type="text" autocomplete="address-line1" placeholder="123 Tech Blvd" value="123 Tech Blvd, Suite 400" />
            </div>
            <button type="button" id="btn-pay" onclick="alert('Order Placed via In-Process Autofill!')">Complete Purchase • $49.00</button>
        </form>
    </div>
</body>
</html>)HTML";

    // Tab 4: arXiv Paper (Research Workspace, Research group)
    TabData t4;
    t4.id = 4;
    t4.title = "arXiv:2409.12345 - VLM Grounding";
    t4.url = "https://arxiv.org/abs/2409.12345";
    t4.is_pinned = false;
    t4.is_muted = false;
    t4.is_audio_playing = false;
    t4.is_frozen = true; // Tier 1 Sleeping tab
    t4.workspace = "research";
    t4.group_id = "grp-docs";
    t4.group_name = "Research";
    t4.group_color = "#8B5CF6";
    t4.ram_mb = 12.0; // Minimal footprint due to freeze
    t4.cpu_percent = 0.0;
    t4.source_html = R"HTML(<!DOCTYPE html>
<html>
<head>
    <title>arXiv:2409.12345 - In-Process Set-of-Marks Grounding</title>
    <style>
        body { font-family: 'Times New Roman', serif; padding: 30px; background: #ffffff; color: #111111; line-height: 1.6; }
        h1 { font-size: 22px; font-weight: bold; text-align: center; margin-bottom: 4px; }
        .authors { text-align: center; font-style: italic; margin-bottom: 20px; color: #444; }
        .abstract-box { max-width: 650px; margin: 0 auto; background: #f8f9fa; padding: 18px; border-left: 4px solid #8b5cf6; }
        .abstract-title { font-weight: bold; font-family: sans-serif; font-size: 14px; margin-bottom: 6px; }
        .btn-download { display: inline-block; padding: 8px 16px; background: #b31b1b; color: white; text-decoration: none; border-radius: 4px; font-family: sans-serif; font-weight: bold; margin-top: 14px; }
    </style>
</head>
<body>
    <h1>In-Process Visual Grounding for Autonomous Web Agents via Set-of-Marks</h1>
    <div class="authors">A. Mishra, DeepMind Autonomous Systems Lab</div>
    <div class="abstract-box">
        <div class="abstract-title">ABSTRACT</div>
        <p>
            Autonomous browser automation agents traditionally struggle with high latency and token cost when relying on full DOM HTML serialization.
            We present an in-process Chromium engine architecture combining accessibility tree sanitization with zero-copy Set-of-Marks overlays.
            Sub-16ms atomic bounding box extraction enables 1-to-1 VLM spatial grounding with 99.4% interactive element reachability.
        </p>
        <a href="#" class="btn-download" id="btn-download-pdf">Download PDF (arXiv:2409.12345)</a>
    </div>
</body>
</html>)HTML";

    tabs.push_back(t1);
    tabs.push_back(t2);
    tabs.push_back(t3);
    tabs.push_back(t4);
}

std::string BuildFullJsonResponse() {
    std::ostringstream ss;
    ss << "{\"tabs\":[";
    for (size_t i = 0; i < tabs.size(); ++i) {
        ss << "{\"id\":" << tabs[i].id
           << ",\"title\":\"" << EscapeJsonString(tabs[i].title) << "\""
           << ",\"url\":\"" << EscapeJsonString(tabs[i].url) << "\""
           << ",\"isPinned\":" << (tabs[i].is_pinned ? "true" : "false")
           << ",\"isMuted\":" << (tabs[i].is_muted ? "true" : "false")
           << ",\"isAudioPlaying\":" << (tabs[i].is_audio_playing ? "true" : "false")
           << ",\"isFrozen\":" << (tabs[i].is_frozen ? "true" : "false")
           << ",\"workspace\":\"" << EscapeJsonString(tabs[i].workspace) << "\""
           << ",\"groupId\":\"" << EscapeJsonString(tabs[i].group_id) << "\""
           << ",\"groupName\":\"" << EscapeJsonString(tabs[i].group_name) << "\""
           << ",\"groupColor\":\"" << EscapeJsonString(tabs[i].group_color) << "\""
           << ",\"ramMb\":" << tabs[i].ram_mb
           << ",\"cpuPercent\":" << tabs[i].cpu_percent
           << ",\"sourceHtml\":\"" << EscapeJsonString(tabs[i].source_html) << "\"}";
        if (i + 1 < tabs.size()) ss << ",";
    }
    ss << "],\"activeTabId\":" << activeTabId
       << ",\"hitlActive\":" << (hitlActive ? "true" : "false")
       << ",\"activeWorkspace\":\"" << EscapeJsonString(activeWorkspace) << "\""
       << ",\"closedTabsCount\":" << closed_stack.size()
       << ",\"tabGroups\":["
       << "{\"id\":\"grp-dev\",\"name\":\"DevOps\",\"color\":\"#10B981\",\"isCollapsed\":false},"
       << "{\"id\":\"grp-docs\",\"name\":\"Research\",\"color\":\"#8B5CF6\",\"isCollapsed\":false}"
       << "]}";
    return ss.str();
}

void SendHttpResponse(SOCKET client, int status_code, const std::string& content_type, const std::string& body) {
    std::ostringstream ss;
    ss << "HTTP/1.1 " << status_code << " OK\r\n";
    ss << "Content-Type: " << content_type << "\r\n";
    ss << "Content-Length: " << body.length() << "\r\n";
    ss << "Access-Control-Allow-Origin: *\r\n";
    ss << "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n";
    ss << "Access-Control-Allow-Headers: Content-Type\r\n";
    ss << "Connection: close\r\n\r\n";

    std::string headers = ss.str();
    send(client, headers.c_str(), static_cast<int>(headers.length()), 0);

    const char* ptr = body.c_str();
    int remaining = static_cast<int>(body.length());
    while (remaining > 0) {
        int chunk_size = (remaining > 65536) ? 65536 : remaining;
        int sent = send(client, ptr, chunk_size, 0);
        if (sent <= 0) break;
        ptr += sent;
        remaining -= sent;
    }
}

int ExtractIntParam(const std::string& body, const std::string& key) {
    size_t pos = body.find("\"" + key + "\":");
    if (pos == std::string::npos) return -1;
    pos += key.length() + 3;
    while (pos < body.length() && (body[pos] == ' ' || body[pos] == '\t')) pos++;
    return std::atoi(body.substr(pos).c_str());
}

std::string ExtractStringParam(const std::string& body, const std::string& key) {
    size_t pos = body.find("\"" + key + "\":\"");
    if (pos == std::string::npos) return "";
    pos += key.length() + 4;
    size_t end = body.find("\"", pos);
    if (end == std::string::npos) return "";
    return body.substr(pos, end - pos);
}

} // namespace

int main() {
    WSADATA wsa;
    if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) {
        std::cerr << "Failed to initialize Winsock" << std::endl;
        return 1;
    }

    InitTabs();

    SOCKET server = socket(AF_INET, SOCK_STREAM, 0);
    if (server == INVALID_SOCKET) {
        std::cerr << "Socket creation failed" << std::endl;
        WSACleanup();
        return 1;
    }

    int opt = 1;
    setsockopt(server, SOL_SOCKET, SO_REUSEADDR, (const char*)&opt, sizeof(opt));

    sockaddr_in server_addr;
    server_addr.sin_family = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;
    server_addr.sin_port = htons(PORT);

    if (bind(server, (sockaddr*)&server_addr, sizeof(server_addr)) == SOCKET_ERROR) {
        std::cerr << "Bind failed on port " << PORT << std::endl;
        closesocket(server);
        WSACleanup();
        return 1;
    }

    if (listen(server, 16) == SOCKET_ERROR) {
        std::cerr << "Listen failed" << std::endl;
        closesocket(server);
        WSACleanup();
        return 1;
    }

    std::cout << "========================================================\n";
    std::cout << "  ANTIGRAVITY BROWSER: REACT APP BACKEND HTTP SERVER     \n";
    std::cout << "========================================================\n";
    std::cout << "Listening at: http://localhost:" << PORT << "\n";
    std::cout << "Serving React application from shell/public/\n";
    std::cout << "Ready for React native client connection...\n\n";

    while (true) {
        SOCKET client = accept(server, NULL, NULL);
        if (client == INVALID_SOCKET) continue;

        char buffer[16384];
        int bytes = recv(client, buffer, sizeof(buffer) - 1, 0);
        if (bytes <= 0) {
            closesocket(client);
            continue;
        }
        buffer[bytes] = '\0';
        std::string req(buffer);

        std::istringstream req_stream(req);
        std::string method, path;
        req_stream >> method >> path;

        if (method == "OPTIONS") {
            SendHttpResponse(client, 204, "text/plain", "");
            closesocket(client);
            continue;
        }

        // Parse body if POST
        std::string req_body = "";
        size_t body_pos = req.find("\r\n\r\n");
        if (body_pos != std::string::npos) {
            req_body = req.substr(body_pos + 4);
        }

        // =====================================================================
        // REST API ENDPOINTS FOR REACT APPLICATION
        // =====================================================================
        if (path == "/api/tabs" && method == "GET") {
            SendHttpResponse(client, 200, "application/json", BuildFullJsonResponse());
        } 
        else if ((path == "/api/tabs/activate" || path == "/api/tab/switch") && method == "POST") {
            int tid = ExtractIntParam(req_body, "id");
            if (tid > 0) {
                for (auto& t : tabs) {
                    if (t.id == tid) {
                        activeTabId = tid;
                        if (t.is_frozen) {
                            t.is_frozen = false; // Rehydrate on activation
                            t.ram_mb = 120.0;
                        }
                        break;
                    }
                }
            }
            SendHttpResponse(client, 200, "application/json", BuildFullJsonResponse());
        }
        else if ((path == "/api/tabs/create" || path == "/api/tab/new") && method == "POST") {
            std::string title = ExtractStringParam(req_body, "title");
            std::string url = ExtractStringParam(req_body, "url");
            std::string ws = ExtractStringParam(req_body, "workspace");
            if (title.empty()) title = "New Tab";
            if (url.empty()) url = "https://example.com";
            if (ws.empty()) ws = activeWorkspace;

            TabData nt;
            nt.id = nextTabId++;
            nt.title = title;
            nt.url = url;
            nt.workspace = ws;
            nt.ram_mb = 95.0;
            nt.cpu_percent = 0.5;
            nt.source_html = "<!DOCTYPE html><html><head><title>" + title + "</title><style>body{font-family:sans-serif;padding:30px;background:#0f172a;color:#fff;}</style></head><body><h2>" + title + "</h2><p>Loaded: " + url + "</p></body></html>";
            
            tabs.push_back(nt);
            activeTabId = nt.id;
            SendHttpResponse(client, 200, "application/json", BuildFullJsonResponse());
        }
        else if ((path == "/api/tabs/close" || path == "/api/tab/close") && method == "POST") {
            int tid = ExtractIntParam(req_body, "id");
            if (tid > 0 && tabs.size() > 1) {
                for (auto it = tabs.begin(); it != tabs.end(); ++it) {
                    if (it->id == tid) {
                        closed_stack.push_back(*it); // LIFO snapshot
                        tabs.erase(it);
                        break;
                    }
                }
                bool activeFound = false;
                for (const auto& t : tabs) {
                    if (t.id == activeTabId) { activeFound = true; break; }
                }
                if (!activeFound && !tabs.empty()) {
                    activeTabId = tabs.back().id;
                }
            }
            SendHttpResponse(client, 200, "application/json", BuildFullJsonResponse());
        }
        else if (path == "/api/tabs/undo-close" && method == "POST") {
            if (!closed_stack.empty()) {
                TabData restored = closed_stack.back();
                closed_stack.pop_back();
                tabs.push_back(restored);
                activeTabId = restored.id;
            }
            SendHttpResponse(client, 200, "application/json", BuildFullJsonResponse());
        }
        else if (path == "/api/tabs/pin" && method == "POST") {
            int tid = ExtractIntParam(req_body, "id");
            for (auto& t : tabs) {
                if (t.id == tid) {
                    t.is_pinned = !t.is_pinned;
                    break;
                }
            }
            // Sort pinned tabs to the front (Pillar 1: Pinned tab isolation)
            std::stable_sort(tabs.begin(), tabs.end(), [](const TabData& a, const TabData& b) {
                return a.is_pinned && !b.is_pinned;
            });
            SendHttpResponse(client, 200, "application/json", BuildFullJsonResponse());
        }
        else if (path == "/api/tabs/mute" && method == "POST") {
            int tid = ExtractIntParam(req_body, "id");
            for (auto& t : tabs) {
                if (t.id == tid) {
                    t.is_muted = !t.is_muted;
                    break;
                }
            }
            SendHttpResponse(client, 200, "application/json", BuildFullJsonResponse());
        }
        else if (path == "/api/tabs/freeze" && method == "POST") {
            int tid = ExtractIntParam(req_body, "id");
            for (auto& t : tabs) {
                if (t.id == tid) {
                    t.is_frozen = !t.is_frozen;
                    if (t.is_frozen) {
                        t.ram_mb = 14.5; // Discarded memory reduction
                        t.cpu_percent = 0.0;
                    } else {
                        t.ram_mb = 115.0; // Rehydrated
                        t.cpu_percent = 0.6;
                    }
                    break;
                }
            }
            SendHttpResponse(client, 200, "application/json", BuildFullJsonResponse());
        }
        else if (path == "/api/tabs/workspace" && method == "POST") {
            std::string ws = ExtractStringParam(req_body, "workspace");
            if (!ws.empty()) {
                activeWorkspace = ws;
            }
            SendHttpResponse(client, 200, "application/json", BuildFullJsonResponse());
        }
        else if (path == "/api/agent/hitl" && method == "POST") {
            hitlActive = !hitlActive;
            SendHttpResponse(client, 200, "application/json", BuildFullJsonResponse());
        }
        else if (path.find("/api/tab/") == 0 && path.find("/content") != std::string::npos) {
            int tid = 1;
            if (path.length() > 9) {
                tid = std::atoi(path.substr(9).c_str());
            }
            std::string content = tabs[0].source_html;
            for (const auto& t : tabs) {
                if (t.id == tid) {
                    content = t.source_html;
                    break;
                }
            }
            SendHttpResponse(client, 200, "text/html; charset=utf-8", content);
        }
        else if (path.find("/api/tab/") == 0 && path.find("/som") != std::string::npos) {
            std::string som_json = R"JSON({"elements":[
                {"id":1,"tag":"A","role":"link","name":"Hacker News","rect":{"x":30,"y":20,"width":90,"height":20},"center":{"x":75,"y":30}},
                {"id":2,"tag":"A","role":"link","name":"new","rect":{"x":130,"y":20,"width":30,"height":20},"center":{"x":145,"y":30}},
                {"id":3,"tag":"BUTTON","role":"button","name":"upvote story 1","rect":{"x":20,"y":60,"width":20,"height":20},"center":{"x":30,"y":70}},
                {"id":4,"tag":"A","role":"link","name":"Show HN: AI-Native Browser with In-Process Chromium Engine","rect":{"x":50,"y":60,"width":400,"height":20},"center":{"x":250,"y":70}},
                {"id":5,"tag":"INPUT","role":"textbox","name":"Search stories, authors...","rect":{"x":20,"y":130,"width":280,"height":36},"center":{"x":160,"y":148}},
                {"id":6,"tag":"BUTTON","role":"button","name":"Search","rect":{"x":310,"y":130,"width":80,"height":36},"center":{"x":350,"y":148}}
            ]})JSON";
            SendHttpResponse(client, 200, "application/json", som_json);
        }
        else if (path.find("/api/tab/") == 0 && path.find("/grep") != std::string::npos) {
            std::string grep_json = R"JSON({"query":"search-query","total_matches":1,"matches":[{"line_number":18,"matched_line":"<input id=\"search-query\" name=\"q\" type=\"text\" placeholder=\"Search stories, comments...\" />","top_10":["<main>","<div class=\"story-item\" id=\"story-1\">","<button class=\"upvote\">▲</button>","<a href=\"#\">Show HN: AI-Native Browser</a>","</div>","<form id=\"search-box\">"],"bottom_10":["<button id=\"search-submit\" type=\"submit\">Search</button>","</form>","</main>","<footer>","<div class=\"cf-turnstile\"></div>","</footer>"]}]})JSON";
            SendHttpResponse(client, 200, "application/json", grep_json);
        }
        else if (path.find("/api/tab/") == 0 && path.find("/ax") != std::string::npos) {
            std::string ax_md = "## Grounded Interactive Marks\n[#1] <A> \"Hacker News\"\n[#2] <A> \"new\"\n[#3] <BUTTON> \"upvote story 1\"\n[#4] <A> \"Show HN: AI-Native Browser\"\n[#5] <INPUT> \"Search stories, authors...\"\n[#6] <BUTTON> \"Search\"";
            SendHttpResponse(client, 200, "text/plain; charset=utf-8", ax_md);
        }
        else {
            // Static file serving from shell/public
            std::string file_to_serve = "shell/public";
            if (path == "/" || path.empty()) {
                file_to_serve += "/index.html";
            } else {
                file_to_serve += path;
            }

            std::string content = ReadFileContent(file_to_serve);
            if (!content.empty()) {
                SendHttpResponse(client, 200, GetMimeType(file_to_serve), content);
            } else {
                SendHttpResponse(client, 404, "text/plain", "404 Not Found");
            }
        }

        closesocket(client);
    }

    closesocket(server);
    WSACleanup();
    return 0;
}
