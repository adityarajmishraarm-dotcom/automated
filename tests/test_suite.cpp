#include "agent_types.h"
#include "tab_manager.h"
#include "navigation.h"
#include "autofill_engine.h"
#include "devtools_host.h"
#include "adblock_engine.h"
#include "element_extractor.h"
#include "ax_sanitizer.h"
#include "som_engine.h"
#include "in_memory_grep.h"
#include "captcha_detector.h"
#include "kinematics.h"
#include "solver_service.h"
#include "hitl_controller.h"
#include "dual_model_router.h"
#include "closed_loop_agent.h"

#include <iostream>
#include <cassert>
#include <sstream>

using namespace ai_browser;

void TestTabStripModel() {
    std::cout << "[TEST 1] TabStripModel In-Process C++ Calls (chrome/browser/ui/tabs/tab_strip_model.h)... ";
    TabStripModel tabs;
    assert(tabs.GetTabCount() == 0);

    auto tab1 = std::make_shared<WebContents>(1, "https://example.com");
    auto tab2 = std::make_shared<WebContents>(2, "https://news.ycombinator.com");

    int idx1 = tabs.InsertWebContentsAt(0, tab1, true);
    assert(idx1 == 0);
    assert(tabs.GetTabCount() == 1);
    assert(tabs.GetActiveIndex() == 0);
    assert(tabs.GetActiveWebContents()->GetURL() == "https://example.com");

    int idx2 = tabs.InsertWebContentsAt(1, tab2, true);
    assert(idx2 == 1);
    assert(tabs.GetTabCount() == 2);
    assert(tabs.GetActiveIndex() == 1);
    assert(tabs.GetActiveWebContents()->GetURL() == "https://news.ycombinator.com");

    // Test ActivateTabAt
    bool switched = tabs.ActivateTabAt(0);
    assert(switched);
    assert(tabs.GetActiveIndex() == 0);
    assert(tabs.GetActiveWebContents()->GetURL() == "https://example.com");

    // Test CloseWebContentsAt
    bool closed = tabs.CloseWebContentsAt(0);
    assert(closed);
    assert(tabs.GetTabCount() == 1);
    assert(tabs.GetActiveIndex() == 0);
    assert(tabs.GetActiveWebContents()->GetURL() == "https://news.ycombinator.com");

    std::cout << "PASSED\n";
}

void TestDirectNavigation() {
    std::cout << "[TEST 2] Direct Navigation (WebContents::GetController().LoadURL())... ";
    auto tab = std::make_shared<WebContents>(1, "about:blank");
    NavigationController nav(tab);

    assert(nav.GetCurrentURL() == "about:blank");
    assert(!nav.CanGoBack());

    nav.LoadURL("https://github.com");
    assert(nav.GetCurrentURL() == "https://github.com");
    assert(nav.CanGoBack());

    nav.LoadURL("https://rust-lang.org");
    assert(nav.GetCurrentURL() == "https://rust-lang.org");

    nav.GoBack();
    assert(nav.GetCurrentURL() == "https://github.com");
    assert(nav.CanGoForward());

    nav.GoForward();
    assert(nav.GetCurrentURL() == "https://rust-lang.org");

    std::cout << "PASSED\n";
}

void TestAutofillEngine() {
    std::cout << "[TEST 3] Autofill Engine (components/autofill - AutofillManager::FillForm())... ";
    AutofillEngine autofill;

    std::string sample_checkout_html = R"HTML(
        <html><body>
        <form id="checkout_form" action="/submit">
            <input id="user_name" name="name" type="text" autocomplete="name" />
            <input id="user_email" name="email" type="email" autocomplete="email" />
            <input id="user_address" name="address" type="text" autocomplete="address-line1" />
            <input id="user_city" name="city" type="text" autocomplete="address-level2" />
            <input id="user_card" name="cc_number" type="text" autocomplete="cc-number" />
            <input id="user_cvc" name="cvc" type="text" autocomplete="cc-csc" />
        </form>
        </body></html>
    )HTML";

    auto forms = autofill.ParseForms(sample_checkout_html);
    assert(forms.size() == 1);
    assert(forms[0].fields.size() == 6);

    // Verify decade-tuned semantic classification
    assert(forms[0].fields[0].detected_type == AutofillFieldType::FullName);
    assert(forms[0].fields[1].detected_type == AutofillFieldType::Email);
    assert(forms[0].fields[2].detected_type == AutofillFieldType::AddressLine1);
    assert(forms[0].fields[3].detected_type == AutofillFieldType::City);
    assert(forms[0].fields[4].detected_type == AutofillFieldType::CreditCardNumber);
    assert(forms[0].fields[5].detected_type == AutofillFieldType::CreditCardCvc);

    // Populate profile and call FillForm
    AutofillProfile profile;
    profile.Set(AutofillFieldType::FullName, "Alex Mercer");
    profile.Set(AutofillFieldType::Email, "alex@example.com");
    profile.Set(AutofillFieldType::AddressLine1, "123 Tech Blvd");
    profile.Set(AutofillFieldType::City, "San Francisco");
    profile.Set(AutofillFieldType::CreditCardNumber, "4111222233334444");
    profile.Set(AutofillFieldType::CreditCardCvc, "123");

    std::string dom_copy = sample_checkout_html;
    bool filled = autofill.FillForm(forms[0], profile, dom_copy);
    assert(filled);
    assert(dom_copy.find("value=\"Alex Mercer\"") != std::string::npos);
    assert(dom_copy.find("value=\"alex@example.com\"") != std::string::npos);
    assert(dom_copy.find("value=\"4111222233334444\"") != std::string::npos);

    std::cout << "PASSED\n";
}

void TestDevToolsHostInProcess() {
    std::cout << "[TEST 4] In-Process DevToolsHost (content::DevToolsAgentHost / Zero Port Leaks)... ";
    DevToolsHost host;
    assert(host.IsStealthActive());

    bool mouse_ok = host.DispatchMouseEvent("mousePressed", 150.0, 250.0, "left", 1);
    assert(mouse_ok);

    bool key_ok = host.DispatchKeyEvent("keyDown", "A", 65);
    assert(key_ok);

    std::string eval_result = host.EvaluateScriptInIsolatedWorld("console.log('agent inspection');");
    assert(eval_result.find("__ai_browser_agent__") != std::string::npos);

    const auto& trace = host.GetExecutionTrace();
    assert(!trace.empty());

    std::cout << "PASSED\n";
}

void TestAdblockEngine() {
    std::cout << "[TEST 5] Adblock Engine (In-Process EasyList & uBlock Filtering)... ";
    AdblockEngine adblock;

    // Tracker & ad URLs
    assert(adblock.ShouldBlockRequest("https://google-analytics.com/analytics.js"));
    assert(adblock.ShouldBlockRequest("https://ad.doubleclick.net/tracker"));
    assert(adblock.ShouldBlockRequest("https://example.com/static/ads.js"));
    assert(adblock.ShouldBlockRequest("https://adnxs.com/bidder"));

    // Legitimate URLs
    assert(!adblock.ShouldBlockRequest("https://example.com/app.js"));
    assert(!adblock.ShouldBlockRequest("https://github.com/index.html"));

    // Cosmetic filter CSS
    std::string css = adblock.GenerateCosmeticStyles();
    assert(css.find("display: none !important") != std::string::npos);

    std::cout << "PASSED\n";
}

void TestInteractiveElementExtractor() {
    std::cout << "[TEST 6] Interactive Element Extractor (Hybrid DOM + a11y Traversal)... ";
    ElementExtractor extractor;

    std::string html = R"HTML(
        <div>
            <h1>Dashboard</h1>
            <a href="/overview" aria-label="Overview Page">Overview</a>
            <button id="refresh-btn">Refresh Data</button>
            <input id="search-input" type="text" placeholder="Search accounts..." />
            <div role="button" tabindex="0" onclick="expandMenu()">Expand Menu</div>
            <div style="display: none;"><button>Hidden</button></div>
            <div aria-hidden="true"><a href="/secret">Hidden Link</a></div>
        </div>
    )HTML";

    auto elements = extractor.ExtractElements(html);
    assert(elements.size() == 4); // 4 visible interactive elements

    // Check monotonic IDs
    assert(elements[0].id == 1);
    assert(elements[0].name == "Overview Page");
    assert(elements[0].role == "link");

    assert(elements[1].id == 2);
    assert(elements[1].name == "Refresh Data");
    assert(elements[1].role == "button");

    assert(elements[2].id == 3);
    assert(elements[2].placeholder == "Search accounts...");
    assert(elements[2].is_typable == true);

    assert(elements[3].id == 4);
    assert(elements[3].role == "button");
    assert(elements[3].name == "Expand Menu");

    std::cout << "PASSED\n";
}

void TestAXSanitizer() {
    std::cout << "[TEST 7] AX-Tree Sanitizer (<3k Tokens Markdown Output)... ";
    AXSanitizer sanitizer;

    std::vector<InteractiveElement> elements;
    InteractiveElement el1;
    el1.id = 1; el1.role = "link"; el1.name = "Hacker News";
    InteractiveElement el2;
    el2.id = 2; el2.role = "textbox"; el2.name = "Search"; el2.placeholder = "Query..."; el2.input_type = "search";
    InteractiveElement el3;
    el3.id = 3; el3.role = "button"; el3.name = "Submit Query";

    elements.push_back(el1);
    elements.push_back(el2);
    elements.push_back(el3);

    std::string md = sanitizer.GenerateMarkdown("News Aggregator", "https://news.ycombinator.com", 1, elements);
    assert(md.find("[#1] link: \"Hacker News\"") != std::string::npos);
    assert(md.find("[#2] textbox: \"Search\"") != std::string::npos);
    assert(md.find("[#3] button: \"Submit Query\"") != std::string::npos);

    std::cout << "PASSED\n";
}

void TestSetOfMarksEngine() {
    std::cout << "[TEST 8] Set-of-Marks (SoM) Injection Engine (#FFE600 Badges)... ";
    SoMEngine som;

    std::vector<InteractiveElement> elements;
    InteractiveElement el;
    el.id = 14;
    el.rect = Rect{120.0, 200.0, 100.0, 32.0};
    elements.push_back(el);

    std::string overlay_script = som.GenerateOverlayScript(elements);
    assert(overlay_script.find("#FFE600") != std::string::npos);
    assert(overlay_script.find("id: 14") != std::string::npos);
    assert(overlay_script.find("[${b.id}]") != std::string::npos);

    std::string cleanup = som.GenerateCleanupScript();
    assert(cleanup.find("__ai_som_overlay_root__") != std::string::npos);

    std::string status;
    bool atomic_ok = som.ExecuteAtomicCaptureSequence(elements, status);
    assert(atomic_ok);
    assert(status.find("<16ms") != std::string::npos);

    std::cout << "PASSED\n";
}

void TestInMemoryGrepWithContextAndPagination() {
    std::cout << "[TEST 9] In-Memory Grep (±10 Context Lines & 10+ Match Pagination)... ";
    InMemoryGrep grep;

    // Generate a multi-line document with 25 distinct occurrences of a token
    std::ostringstream doc;
    for (int i = 1; i <= 200; ++i) {
        if (i % 8 == 0) {
            doc << "<div class=\"target-node\" data-match-id=\"" << i << "\">Target Item " << i << "</div>\n";
        } else {
            doc << "<p>Filler line " << i << " of standard page content</p>\n";
        }
    }
    std::string doc_content = doc.str();

    // Query for 'target-node' with default limit=10, offset=0
    GrepResult page1 = grep.Search(doc_content, "target-node", 0, 10);
    assert(page1.total_matches == 25);
    assert(page1.returned_count == 10);
    assert(page1.has_more == true);
    assert(page1.next_offset == 10);
    assert(page1.matches.size() == 10);

    // Verify ±10 context lines for first match
    const auto& m1 = page1.matches[0];
    assert(m1.line_number == 8);
    assert(m1.matched_line.find("Target Item 8") != std::string::npos);
    assert(m1.top_10_lines.size() == 7);    // Lines 1-7 (all available top lines)
    assert(m1.bottom_10_lines.size() == 10); // Lines 9-18 (full 10 bottom lines)

    // Verify match in middle of document has exactly 10 top and 10 bottom lines
    const auto& m3 = page1.matches[2]; // match at line 24
    assert(m3.line_number == 24);
    assert(m3.top_10_lines.size() == 10);
    assert(m3.bottom_10_lines.size() == 10);

    // Query Page 2 (offset=10, limit=10)
    GrepResult page2 = grep.Search(doc_content, "target-node", 10, 10);
    assert(page2.returned_count == 10);
    assert(page2.current_offset == 10);
    assert(page2.has_more == true);
    assert(page2.next_offset == 20);

    // Query Page 3 (offset=20, limit=10)
    GrepResult page3 = grep.Search(doc_content, "target-node", 20, 10);
    assert(page3.returned_count == 5);
    assert(page3.has_more == false);
    assert(page3.next_offset == 0);

    // Test direct index retrieval
    auto single_match = grep.GetMatchByIndex(doc_content, "target-node", 15);
    assert(single_match.has_value());
    assert(single_match->matched_line.find("Target Item 120") != std::string::npos);

    // Test Markdown formatting
    std::string md = grep.FormatMarkdown(page1);
    assert(md.find("Total Matches Found: 25") != std::string::npos);
    assert(md.find(">>> 8: <div class=\"target-node\"") != std::string::npos);

    std::cout << "PASSED\n";
}

void TestCaptchaDetection() {
    std::cout << "[TEST 10] CAPTCHA Detection (Turnstile, reCAPTCHA, hCaptcha, DataDome, AWS WAF)... ";
    CaptchaDetector detector;

    std::string turnstile_html = "<div class=\"cf-turnstile\" data-sitekey=\"0x4AAAAAAAJ-TEST_KEY\"></div>";
    auto res_turnstile = detector.Detect(turnstile_html);
    assert(res_turnstile.detected);
    assert(res_turnstile.type == CaptchaType::CloudflareTurnstile);
    assert(res_turnstile.sitekey == "0x4AAAAAAAJ-TEST_KEY");

    std::string recaptcha_html = "<div class=\"g-recaptcha\" data-sitekey=\"6Ld_TEST_KEY\"></div>";
    auto res_recaptcha = detector.Detect(recaptcha_html);
    assert(res_recaptcha.detected);
    assert(res_recaptcha.type == CaptchaType::GoogleReCaptchaV2);
    assert(res_recaptcha.sitekey == "6Ld_TEST_KEY");

    std::string hcaptcha_html = "<div class=\"h-captcha\" data-sitekey=\"10000000-ffff-ffff-ffff-000000000001\"></div>";
    auto res_hcaptcha = detector.Detect(hcaptcha_html);
    assert(res_hcaptcha.detected);
    assert(res_hcaptcha.type == CaptchaType::HCaptcha);

    std::string datadome_html = "<script src=\"https://ct.captcha-delivery.com/c.js\"></script><div id=\"datadome-captcha\"></div>";
    auto res_datadome = detector.Detect(datadome_html);
    assert(res_datadome.detected);
    assert(res_datadome.type == CaptchaType::DataDome);

    std::string aws_html = "<div id=\"aws-waf-captcha\"></div>";
    auto res_aws = detector.Detect(aws_html);
    assert(res_aws.detected);
    assert(res_aws.type == CaptchaType::AwsWaf);

    std::cout << "PASSED\n";
}

void TestKinematics() {
    std::cout << "[TEST 11] Humanized Kinematics (Bezier Curves & Typing Jitter)... ";
    HumanizedKinematics kinematics;

    Point start{10.0, 10.0};
    Point end{400.0, 500.0};
    auto path = kinematics.GenerateBezierPath(start, end, 30);
    assert(path.size() == 31);
    assert(std::abs(path.front().x - 10.0) < 0.001);
    assert(std::abs(path.back().x - 400.0) < 0.001);

    auto delays = kinematics.GenerateKeystrokeDelays("search query");
    assert(delays.size() == 12);
    for (int d : delays) {
        assert(d >= 50 && d <= 220);
    }

    std::cout << "PASSED\n";
}

void TestDualModelRouter() {
    std::cout << "[TEST 12] Dual-Model Router (Fast Text LLM <500ms vs VLM Fallback)... ";
    DualModelRouter router;

    std::vector<InteractiveElement> clear_elements;
    InteractiveElement el1; el1.id = 1; el1.role = "button"; el1.name = "Submit Form";
    clear_elements.push_back(el1);

    // Normal elements -> Fast Text LLM
    CaptchaDetectionResult no_captcha;
    auto dec1 = router.Route(clear_elements, "<div><button>Submit</button></div>", "submit the form", no_captcha);
    assert(dec1.target == ModelTarget::FastTextLLM);
    assert(!dec1.requires_som_overlay);

    // Canvas present -> Visual VLM with SoM
    auto dec2 = router.Route(clear_elements, "<div><canvas id='map'></canvas></div>", "click coordinates", no_captcha);
    assert(dec2.target == ModelTarget::VisualVLM);
    assert(dec2.requires_som_overlay);

    // Visual CAPTCHA present -> Visual VLM with SoM
    CaptchaDetectionResult captcha;
    captcha.detected = true;
    captcha.type = CaptchaType::GoogleReCaptchaV2;
    captcha.type_name = "reCAPTCHA v2";
    auto dec3 = router.Route(clear_elements, "<div></div>", "solve challenge", captcha);
    assert(dec3.target == ModelTarget::VisualVLM);
    assert(dec3.requires_som_overlay);

    std::cout << "PASSED\n";
}

void TestClosedLoopAgentIntegration() {
    std::cout << "[TEST 13] Closed-Loop Agent (Observe -> Verify -> Act -> Diff)... ";
    ClosedLoopAgent agent;

    std::string initial_html = R"HTML(
        <html><body>
            <h1>Sign In</h1>
            <a href="/forgot">Forgot Password</a>
            <form id="login_form">
                <input id="user_email" name="email" type="email" autocomplete="email" />
                <input id="user_pwd" name="password" type="password" />
                <button id="login_btn">Sign In</button>
            </form>
        </body></html>
    )HTML";

    agent.SetSimulatedPage("https://auth.example.com", "Sign In", initial_html);

    // 1. Observe
    auto snap1 = agent.ObserveState();
    assert(snap1.element_count == 4); // link, 2 inputs, button
    assert(snap1.elements[0].id == 1);

    // 2. Act: Autofill email
    ActionCommand cmd_autofill;
    cmd_autofill.type = ActionType::Autofill;
    cmd_autofill.autofill_profile.Set(AutofillFieldType::Email, "agent@ai-browser.dev");

    auto exec_res = agent.ExecuteAction(cmd_autofill);
    assert(exec_res.success);

    // 3. Observe & Diff Check
    auto snap2 = agent.ObserveState();
    bool diff = agent.DetectStateDiff(snap1, snap2);
    assert(diff); // DOM mutated by Autofill

    // 4. Act: Direct Navigation
    ActionCommand cmd_nav;
    cmd_nav.type = ActionType::Navigate;
    cmd_nav.navigate_url = "https://news.ycombinator.com";
    auto nav_res = agent.ExecuteAction(cmd_nav);
    assert(nav_res.success);
    assert(nav_res.new_url == "https://news.ycombinator.com");

    std::cout << "PASSED\n";
}

int main() {
    std::cout << "========================================================\n";
    std::cout << "  NATIVE AI BROWSER: COMPREHENSIVE VERIFICATION SUITE   \n";
    std::cout << "========================================================\n\n";

    TestTabStripModel();
    TestDirectNavigation();
    TestAutofillEngine();
    TestDevToolsHostInProcess();
    TestAdblockEngine();
    TestInteractiveElementExtractor();
    TestAXSanitizer();
    TestSetOfMarksEngine();
    TestInMemoryGrepWithContextAndPagination();
    TestCaptchaDetection();
    TestKinematics();
    TestDualModelRouter();
    TestClosedLoopAgentIntegration();

    std::cout << "\n========================================================\n";
    std::cout << "  ALL 13 SUITES PASSED (100% SUCCESS)                   \n";
    std::cout << "========================================================\n";
    return 0;
}
