#include "agent_types.h"
#include "closed_loop_agent.h"
#include <iostream>

using namespace ai_browser;

int main(int argc, char* argv[]) {
    std::cout << "========================================================\n";
    std::cout << "   NATIVE AI BROWSER: AGENT CONTROL HARNESS (OPTION C)  \n";
    std::cout << "========================================================\n";
    std::cout << "Engine: In-Process Chromium C++ Bindings (Zero WebSockets)\n";
    std::cout << "Tab Strip: TabStripModel (chrome/browser/ui/tabs/tab_strip_model.h)\n";
    std::cout << "Navigation: WebContents::GetController().LoadURL()\n";
    std::cout << "Form Filling: components/autofill (AutofillManager::FillForm)\n";
    std::cout << "Input/DOM: content::DevToolsAgentHost (Zero Port Leaks)\n";
    std::cout << "Adblock: Native in-process filter (EasyList / uBlock Origin)\n";
    std::cout << "Grep Engine: ±10 Lines Context (Top/Bottom 10) + Pagination\n";
    std::cout << "CAPTCHA: 4-Layer Autonomous Bot-Defense (Stealth, Detection, Solver, HITL)\n";
    std::cout << "========================================================\n\n";

    ClosedLoopAgent agent;

    std::string sample_web_page = R"HTML(
<!DOCTYPE html>
<html>
<head>
    <title>Hacker News Clone</title>
</head>
<body>
    <header>
        <a href="/" aria-label="Hacker News Home">Hacker News</a>
        <a href="/new">new</a> | <a href="/comments">comments</a> | <a href="/ask">ask</a>
    </header>
    <main>
        <div class="story-item" id="story-1">
            <button class="upvote" aria-label="upvote story 1">▲</button>
            <a href="https://example.com/ai-native-browser" id="story-link-1">Show HN: Native AI Browser with In-Process Chromium Engine</a>
        </div>
        <form id="search-box" action="/search">
            <input id="search-query" name="q" type="text" placeholder="Search stories, comments..." />
            <button id="search-submit" type="submit">Search</button>
        </form>
    </main>
    <footer>
        <div class="cf-turnstile" data-sitekey="0x4AAAAAAAJ-CF_EXAMPLE_KEY"></div>
    </footer>
</body>
</html>
)HTML";

    agent.SetSimulatedPage("https://news.ycombinator.com", "Hacker News Clone", sample_web_page);

    std::cout << ">>> Step 1: Observing Page State (Sanitized AX Tree & Bot Detection)...\n";
    auto snapshot = agent.ObserveState();
    std::cout << snapshot.ax_markdown << "\n";

    if (snapshot.captcha_result.detected) {
        std::cout << ">>> [ALERT] " << snapshot.captcha_result.type_name
                  << " Challenge Detected! Sitekey: " << snapshot.captcha_result.sitekey << "\n";
    }

    std::cout << "\n>>> Step 2: In-Memory Source Grep Search for 'search-query' (±10 Context Lines)...\n";
    ActionCommand grep_cmd;
    grep_cmd.type = ActionType::GrepSource;
    grep_cmd.grep_query = "search-query";
    grep_cmd.grep_limit = 5;
    auto grep_res = agent.ExecuteAction(grep_cmd);
    std::cout << grep_res.message << "\n";

    std::cout << ">>> Step 3: Executing In-Process Bezier Click to Element [#1] (Home Link)...\n";
    ActionCommand click_cmd;
    click_cmd.type = ActionType::Click;
    click_cmd.target_id = 1;
    auto click_res = agent.ExecuteAction(click_cmd);
    std::cout << "Result: " << click_res.message << "\n\n";

    std::cout << ">>> Step 4: Demonstrating Direct Navigation to 'https://news.ycombinator.com/item?id=1'...\n";
    ActionCommand nav_cmd;
    nav_cmd.type = ActionType::Navigate;
    nav_cmd.navigate_url = "https://news.ycombinator.com/item?id=1";
    auto nav_res = agent.ExecuteAction(nav_cmd);
    std::cout << "Result: " << nav_res.message << "\n";

    std::cout << "\n========================================================\n";
    std::cout << "  AGENT HARNESS EXECUTION COMPLETED SUCCESSFULLY!       \n";
    std::cout << "========================================================\n";
    return 0;
}
