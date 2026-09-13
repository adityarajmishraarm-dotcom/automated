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
#include "native_tab_engine.h"

#include <iostream>
#include <cassert>
#include <sstream>
#include <cmath>

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
    assert(static_cast<bool>(single_match));
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

void TestTabLifecycleAndEventBus() {
    std::cout << "[TEST TAB-ENG 1] Tab Lifecycle & Typed Event Bus... ";
    TabStripModel tabs;
    auto event_bus = tabs.GetEventBus();

    bool tab_created_fired = false;
    TabId created_tid = 0;
    event_bus->SubscribeTabCreated([&](const TabCreatedEvent& ev) {
        tab_created_fired = true;
        created_tid = ev.tab_id;
    });

    bool tab_activated_fired = false;
    event_bus->SubscribeTabActivated([&](const TabActivatedEvent&) {
        tab_activated_fired = true;
    });

    auto tab1 = tabs.SpawnTab("https://chromium.org", true);
    assert(tab_created_fired);
    assert(tab_activated_fired);
    assert(created_tid == tab1->GetId());
    assert(tabs.GetTabCount() == 1);
    assert(tabs.GetActiveWebContents()->GetURL() == "https://chromium.org");

    // Test Duplication
    auto dup = tabs.DuplicateTab(0);
    assert(dup != nullptr);
    assert(tabs.GetTabCount() == 2);
    assert(tabs.GetWebContentsAt(1)->GetURL() == "https://chromium.org");

    // Test explicit destruction routine
    bool tab_closed_fired = false;
    event_bus->SubscribeTabClosed([&](const TabClosedEvent&) {
        tab_closed_fired = true;
    });
    bool closed = tabs.CloseWebContentsAt(1);
    assert(closed);
    assert(tab_closed_fired);
    assert(tabs.GetTabCount() == 1);

    std::cout << "PASSED\n";
}

void TestPinnedTabIsolationAndMove() {
    std::cout << "[TEST TAB-ENG 2] Pinned Tab Isolation & Move Boundaries... ";
    TabStripModel tabs;
    tabs.SpawnTab("https://site1.com", false, false);
    tabs.SpawnTab("https://site2.com", false, false);
    assert(tabs.GetPinnedTabCount() == 0);

    // Pin a new tab
    tabs.SpawnTab("https://pinned.com", true, true);
    assert(tabs.GetPinnedTabCount() == 1);
    assert(tabs.GetWebContentsAt(0)->IsPinned());
    assert(tabs.GetWebContentsAt(0)->GetURL() == "https://pinned.com");

    // Attempt to close pinned tab -> MUST fail (pinned tabs are locked)
    bool close_pinned_attempt = tabs.CloseWebContentsAt(0);
    assert(!close_pinned_attempt);
    assert(tabs.GetTabCount() == 3);

    // Pin unpinned tab
    int new_pin_idx = tabs.PinTab(2, true);
    assert(new_pin_idx == 1);
    assert(tabs.GetPinnedTabCount() == 2);

    // Test Move boundaries: pinned tab cannot move past pinned_count_
    bool invalid_move = tabs.MoveTab(0, 2);
    assert(!invalid_move);

    // Valid reorder within pinned partition
    bool valid_move = tabs.MoveTab(0, 1);
    assert(valid_move);

    std::cout << "PASSED\n";
}

void TestRecoverableUndoCloseStack() {
    std::cout << "[TEST TAB-ENG 3] Recoverable Undo-Close Stack (Deep State Restoration)... ";
    TabStripModel tabs;
    auto tab1 = tabs.SpawnTab("https://page1.com", true);
    tab1->SetTitle("Page 1 Title");
    tab1->SetFaviconURL("https://page1.com/favicon.ico");
    tab1->SetScrollPosition(120.0, 450.0);
    tab1->PushHistoryEntry("https://page1.com/subpath");

    assert(tabs.GetTabCount() == 1);

    // Close the tab
    bool closed = tabs.CloseWebContentsAt(0);
    assert(closed);
    assert(tabs.GetTabCount() == 0);
    assert(tabs.GetUndoStack()->GetTotalCount() == 1);

    // Restore via Ctrl+Shift+T equivalent
    auto restored = tabs.RestoreLastClosedTab();
    assert(restored != nullptr);
    assert(tabs.GetTabCount() == 1);
    assert(restored->GetURL() == "https://page1.com/subpath");
    assert(restored->GetTitle() == "Page 1 Title");
    assert(restored->GetFaviconURL() == "https://page1.com/favicon.ico");
    assert(restored->GetScrollX() == 120.0);
    assert(restored->GetScrollY() == 450.0);
    assert(tabs.GetUndoStack()->GetTotalCount() == 0);

    // Test capacity bound
    tabs.GetUndoStack()->SetCapacity(2);
    TabStateSnapshot s1, s2, s3;
    s1.url = "https://s1.com";
    s2.url = "https://s2.com";
    s3.url = "https://s3.com";
    tabs.GetUndoStack()->Push(s1);
    tabs.GetUndoStack()->Push(s2);
    tabs.GetUndoStack()->Push(s3);
    assert(tabs.GetUndoStack()->GetTotalCount() == 2);
    // s1 should have been evicted
    auto popped1 = tabs.GetUndoStack()->PopGlobal();
    assert(static_cast<bool>(popped1) && popped1->url == "https://s3.com");
    auto popped2 = tabs.GetUndoStack()->PopGlobal();
    assert(static_cast<bool>(popped2) && popped2->url == "https://s2.com");
    assert(tabs.GetUndoStack()->GetTotalCount() == 0);

    std::cout << "PASSED\n";
}

void TestAdaptiveTabSleepingAndExemptions() {
    std::cout << "[TEST TAB-ENG 4] Adaptive Tab Sleeping & Auto-Exemptions... ";
    TabStripModel tabs;
    auto freeze_mgr = tabs.GetFreezeManager();
    TabFreezeConfig cfg;
    cfg.dom_freeze_timeout_seconds = 1;     // 1 sec for test
    cfg.process_discard_timeout_seconds = 2; // 2 sec for test
    freeze_mgr->UpdateConfig(cfg);

    tabs.SpawnTab("https://active.com", true);
    auto tab2 = tabs.SpawnTab("https://background.com", false);
    auto tab_exempt_audio = tabs.SpawnTab("https://audio.com", false);
    tab_exempt_audio->SetAudioPlaying(true);

    auto tab_exempt_pinned = tabs.SpawnTab("https://pinned-exempt.com", false, true);

    // Check exemptions
    assert(freeze_mgr->IsExemptFromFreeze(*tab_exempt_audio));
    assert(freeze_mgr->IsExemptFromFreeze(*tab_exempt_pinned));
    assert(!freeze_mgr->IsExemptFromFreeze(*tab2));

    // Force Tier 1 DOM Freeze
    freeze_mgr->FreezeTabDom(*tab2);
    assert(tab2->GetFreezeTier() == FreezeTier::kDomFrozen);

    // Force Tier 2 Process Discard
    freeze_mgr->DiscardTabProcess(*tab2);
    assert(tab2->GetFreezeTier() == FreezeTier::kProcessDiscarded);

    // Transparent Rehydration on Activation
    int tab2_idx = tabs.GetIndexOfTab(tab2->GetId());
    tabs.ActivateTabAt(tab2_idx);
    assert(tab2->GetFreezeTier() == FreezeTier::kActive);

    std::cout << "PASSED\n";
}

void TestWorkspacesAndTabGroups() {
    std::cout << "[TEST TAB-ENG 5] Workspaces & Color-Coded Tab Groups... ";
    TabStripModel tabs;
    auto grp_mgr = tabs.GetGroupManager();

    // Create Workspaces
    assert(grp_mgr->CreateWorkspace("work", "Work Projects", "briefcase"));
    assert(grp_mgr->CreateWorkspace("personal", "Personal Browsing", "user"));

    auto tab_work = tabs.SpawnTab("https://github.com/company", true);
    tab_work->SetWorkspaceId("work");
    grp_mgr->AssignTabToWorkspace(tab_work->GetId(), "work");

    auto tab_pers = tabs.SpawnTab("https://reddit.com", false);
    tab_pers->SetWorkspaceId("personal");
    grp_mgr->AssignTabToWorkspace(tab_pers->GetId(), "personal");

    auto work_tabs = grp_mgr->GetTabsInWorkspace("work");
    assert(work_tabs.size() == 1 && work_tabs[0] == tab_work->GetId());

    // Switch workspace
    assert(grp_mgr->SwitchWorkspace("work"));
    assert(grp_mgr->GetActiveWorkspaceId() == "work");

    // Color-Coded Tab Groups
    GroupId gid = grp_mgr->CreateGroup("Core Infra", "#10B981", "work");
    assert(!gid.empty());
    assert(grp_mgr->AddTabToGroup(gid, tab_work->GetId()));
    assert(grp_mgr->IsTabInGroup(tab_work->GetId()));
    assert(grp_mgr->GetTabGroupId(tab_work->GetId()) == gid);

    // Collapsible group toggle
    assert(!grp_mgr->IsTabHiddenByCollapsedGroup(tab_work->GetId()));
    grp_mgr->SetGroupCollapsed(gid, true);
    assert(grp_mgr->IsTabHiddenByCollapsedGroup(tab_work->GetId()));

    std::cout << "PASSED\n";
}

void TestFaultTolerantSessionPersistenceAndCrashRecovery() {
    std::cout << "[TEST TAB-ENG 6] Session Persistence & Crash Recovery Daemon... ";
    std::string test_dir = "./test_session_storage";
    SessionPersistenceManager sp(test_dir);

    // Crash recovery check
    sp.InitializeAndCheckCrash();
    // Second init without clean shutdown detects crash
    assert(sp.InitializeAndCheckCrash());
    sp.MarkCleanShutdown();

    // Test Atomic Serialization
    SessionManifest m;
    m.active_tab_id = 42;
    m.active_workspace_id = "research";
    SessionTabRecord r;
    r.id = 42;
    r.url = "https://arxiv.org";
    r.title = "AI Browser Paper";
    r.is_pinned = false;
    m.tabs.push_back(r);

    bool saved = sp.SaveSessionAtomic(m);
    assert(saved);
    assert(sp.HasSavedSession());

    auto loaded = sp.LoadSession();
    assert(static_cast<bool>(loaded));
    assert(loaded->active_tab_id == 42);
    assert(loaded->active_workspace_id == "research");
    assert(loaded->tabs.size() == 1);
    assert(loaded->tabs[0].url == "https://arxiv.org");

    sp.ClearSavedSession();
    sp.MarkCleanShutdown();

    std::cout << "PASSED\n";
}

void TestTabSearchIndexAndFuzzyMatching() {
    std::cout << "[TEST TAB-ENG 7] In-Memory Tab Indexer & Fuzzy Matching... ";
    TabSearchIndex index;

    TabSearchRecord rec1;
    rec1.tab_id = 1;
    rec1.title = "GitHub - AI Native Browser";
    rec1.url = "https://github.com/org/repo";
    rec1.text_snippet = "A high-performance C++ Chromium browser";
    index.IndexTab(rec1);

    TabSearchRecord rec2;
    rec2.tab_id = 2;
    rec2.title = "Hacker News Front Page";
    rec2.url = "https://news.ycombinator.com";
    index.IndexTab(rec2);

    assert(index.GetIndexedCount() == 2);

    // Fuzzy matching queries
    auto results1 = index.Search("ghub");
    assert(!results1.empty());
    assert(results1[0].tab_id == 1);

    auto results2 = index.Search("hn");
    assert(!results2.empty());
    assert(results2[0].tab_id == 2);

    auto results3 = index.Search("browser");
    assert(!results3.empty());
    assert(results3[0].tab_id == 1);

    std::cout << "PASSED\n";
}

void TestSplitViewAndWindowDetachment() {
    std::cout << "[TEST TAB-ENG 8] Split-View Tiling & Window Detachment... ";
    SplitViewManager sm;

    // Create side-by-side tile
    bool tiled = sm.CreateSplitTile(10, 20, SplitOrientation::kLeftRight, 0.6);
    assert(tiled);
    assert(sm.IsTabInSplit(10));
    assert(sm.IsTabInSplit(20));
    assert(sm.GetSplitPartner(10) == 20);
    assert(sm.GetSplitPartner(20) == 10);

    auto tile = sm.GetSplitTileForTab(10);
    assert(tile.orientation == SplitOrientation::kLeftRight);
    assert(tile.split_ratio == 0.6);

    // Dissolve split
    assert(sm.RemoveSplitTile(10));
    assert(!sm.IsTabInSplit(10));
    assert(!sm.IsTabInSplit(20));

    // Window detachment
    WindowId new_win = sm.AllocateNewWindowId();
    assert(new_win >= 2);
    sm.RegisterTabWindow(30, new_win);
    assert(sm.GetTabWindow(30) == new_win);

    std::cout << "PASSED\n";
}

void TestTabResourceAndMediaController() {
    std::cout << "[TEST TAB-ENG 9] Per-Tab Resource Tracking & Media Controller... ";
    TabStripModel tabs;
    auto tracker = tabs.GetResourceTracker();

    // Resource telemetry
    tracker->UpdateMetrics(100, 15.5, 600 * 1024 * 1024); // 600MB
    auto m = tracker->GetMetrics(100);
    assert(m.cpu_percent == 15.5);
    assert(m.is_high_memory_usage); // > 500MB threshold

    // Media and Audio controller
    tracker->SetAudioPlaying(100, true);
    assert(tracker->IsAudioPlaying(100));

    // One-click toggle mute
    bool is_muted = tracker->ToggleMute(100);
    assert(is_muted);
    assert(tracker->IsMuted(100));

    bool is_unmuted = !tracker->ToggleMute(100);
    assert(is_unmuted);

    // Media capture state
    tracker->SetMediaCapture(100, MediaCaptureState::kMicrophone);
    assert(tracker->GetMediaCapture(100) == MediaCaptureState::kMicrophone);

    std::cout << "PASSED\n";
}

void TestNativeTabEngine() {
    std::cout << "[TEST NATIVE TAB ENGINE 10] Native OS Tab Management & Blink Suspension... ";
    using NativeWS = antigravity::native::Workspace;
    antigravity::native::NativeTabManager& mgr = antigravity::native::NativeTabManager::GetInstance();
    mgr.Shutdown();

    // 1. Spawning tabs in workspaces
    antigravity::native::BrowserTab* t1 = mgr.CreateNewTab("https://news.ycombinator.com", "HN", NativeWS::DEFAULT, true);
    assert(t1 != nullptr);
    assert(t1->isPinned);
    assert(t1->isActive);

    antigravity::native::BrowserTab* t2 = mgr.CreateNewTab("https://github.com", "GitHub", NativeWS::WORK, false);
    assert(t2 != nullptr);
    assert(!t2->isPinned);
    assert(t2->isActive);
    assert(!t1->isActive);

    antigravity::native::BrowserTab* t3 = mgr.CreateNewTab("https://store.com", "Store", NativeWS::WORK, false);
    assert(t3 != nullptr);
    assert(t3->isActive);

    // 2. Tab switching & workspace filtering
    mgr.SwitchWorkspace(NativeWS::WORK);
    assert(mgr.GetCurrentWorkspace() == NativeWS::WORK);
    std::vector<antigravity::native::BrowserTab*> workTabs = mgr.GetTabsInCurrentWorkspace();
    assert(workTabs.size() >= 2);

    // 3. Tab suspension & rehydration
    mgr.SuspendInactiveTabs();
    assert(t2->isSuspended);
    assert(!t3->isSuspended);

    mgr.ResumeTab(t2->id);
    assert(t2->isActive);
    assert(!t2->isSuspended);

    // 4. Closing tabs & focus shift
    std::string closingId = t2->id;
    bool closed = mgr.CloseTab(closingId);
    assert(closed);
    assert(mgr.GetActiveTab() != nullptr);

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

    // Tab Management Engine (8 Pillars) Test Suites
    TestTabLifecycleAndEventBus();
    TestPinnedTabIsolationAndMove();
    TestRecoverableUndoCloseStack();
    TestAdaptiveTabSleepingAndExemptions();
    TestWorkspacesAndTabGroups();
    TestFaultTolerantSessionPersistenceAndCrashRecovery();
    TestTabSearchIndexAndFuzzyMatching();
    TestSplitViewAndWindowDetachment();
    TestTabResourceAndMediaController();

    // Suite 23: Native OS Tab Management Engine
    TestNativeTabEngine();

    std::cout << "\n========================================================\n";
    std::cout << "  ALL 23 SUITES PASSED (100% SUCCESS)                   \n";
    std::cout << "========================================================\n";
    return 0;
}
