#include "closed_loop_agent.h"
#include <functional>

namespace ai_browser {

ClosedLoopAgent::ClosedLoopAgent() {
    tab_strip_model_ = std::make_unique<TabStripModel>();
    devtools_host_ = std::make_unique<DevToolsHost>();
    adblock_engine_ = std::make_unique<AdblockEngine>();
    autofill_engine_ = std::make_unique<AutofillEngine>();
    element_extractor_ = std::make_unique<ElementExtractor>();
    ax_sanitizer_ = std::make_unique<AXSanitizer>();
    som_engine_ = std::make_unique<SoMEngine>();
    grep_engine_ = std::make_unique<InMemoryGrep>();
    captcha_detector_ = std::make_unique<CaptchaDetector>();
    kinematics_ = std::make_unique<HumanizedKinematics>();
    solver_service_ = std::make_unique<CaptchaSolverService>();
    hitl_controller_ = std::make_unique<HITLController>();
    dual_model_router_ = std::make_unique<DualModelRouter>();

    // Initialize with primary tab
    active_web_contents_ = std::make_shared<WebContents>(1, "about:blank");
    tab_strip_model_->InsertWebContentsAt(0, active_web_contents_, true);
    navigation_controller_ = std::make_unique<NavigationController>(active_web_contents_);
}

ClosedLoopAgent::~ClosedLoopAgent() = default;

void ClosedLoopAgent::SetSimulatedPage(const std::string& url, const std::string& title, const std::string& html) {
    if (active_web_contents_) {
        active_web_contents_->SetURL(url);
        active_web_contents_->SetTitle(title);
        active_web_contents_->SetSourceHTML(html);
    }
}

AgentStateSnapshot ClosedLoopAgent::ObserveState() {
    AgentStateSnapshot snap;
    if (!active_web_contents_) return snap;

    snap.url = active_web_contents_->GetURL();
    snap.title = active_web_contents_->GetTitle();
    const std::string& html = active_web_contents_->GetSourceHTML();

    // In-memory simple hash of DOM string
    snap.dom_hash = std::hash<std::string>{}(html);

    // Hybrid DOM & a11y extraction
    snap.elements = element_extractor_->ExtractElements(html);
    snap.element_count = snap.elements.size();

    // Generate compact Markdown representation (<3k tokens)
    snap.ax_markdown = ax_sanitizer_->GenerateMarkdown(
        snap.title, snap.url, active_web_contents_->GetId(), snap.elements
    );

    // Layer 2 CAPTCHA Detection scan
    snap.captcha_result = captcha_detector_->Detect(html, snap.url);

    return snap;
}

bool ClosedLoopAgent::VerifyPrecondition(const AgentStateSnapshot& prev, const AgentStateSnapshot& current) {
    // If the state was expected to mutate after a click/submit, verify it changed
    return (prev.dom_hash != current.dom_hash || prev.url != current.url);
}

ExecutionResult ClosedLoopAgent::ExecuteAction(const ActionCommand& command) {
    ExecutionResult res;
    if (!active_web_contents_) {
        res.message = "No active tab available";
        return res;
    }

    switch (command.type) {
        case ActionType::Click: {
            // Locate element by monotonic ID
            const auto& html = active_web_contents_->GetSourceHTML();
            auto elements = element_extractor_->ExtractElements(html);
            Point target_point{100.0, 100.0};
            for (const auto& el : elements) {
                if (el.id == command.target_id) {
                    target_point = el.center;
                    break;
                }
            }

            // Layer 1 Kinematics: Generate Bezier trajectory and dispatch in-process
            Point start_point{50.0, 50.0};
            auto path = kinematics_->GenerateBezierPath(start_point, target_point);
            for (const auto& pt : path) {
                devtools_host_->DispatchMouseEvent("mouseMoved", pt.x, pt.y);
            }
            devtools_host_->DispatchMouseEvent("mousePressed", target_point.x, target_point.y, "left", 1);
            devtools_host_->DispatchMouseEvent("mouseReleased", target_point.x, target_point.y, "left", 1);

            res.success = true;
            res.message = "Dispatched in-process Bezier click to element [#" + std::to_string(command.target_id) + "]";
            break;
        }

        case ActionType::Type: {
            // Layer 1 Kinematics: typing jitter
            auto delays = kinematics_->GenerateKeystrokeDelays(command.text_payload);
            for (char c : command.text_payload) {
                std::string s(1, c);
                devtools_host_->DispatchKeyEvent("keyDown", s);
                devtools_host_->DispatchKeyEvent("keyUp", s);
            }

            res.success = true;
            res.message = "Dispatched in-process keystrokes to element [#" + std::to_string(command.target_id) +
                          "] (" + std::to_string(command.text_payload.length()) + " chars)";
            break;
        }

        case ActionType::Autofill: {
            // Call components/autofill in-process
            std::string html = active_web_contents_->GetSourceHTML();
            auto forms = autofill_engine_->ParseForms(html);
            if (!forms.empty()) {
                autofill_engine_->FillForm(forms[0], command.autofill_profile, html);
                active_web_contents_->SetSourceHTML(html);
                res.success = true;
                res.message = "AutofillManager::FillForm() executed on form '" + forms[0].form_id + "'";
            } else {
                res.message = "No matching form structure found for Autofill";
            }
            break;
        }

        case ActionType::Navigate: {
            // Direct WebContents::GetController().LoadURL() in-process
            bool blocked = adblock_engine_->ShouldBlockRequest(command.navigate_url);
            if (blocked) {
                res.message = "Blocked navigation by adblock engine: " + command.navigate_url;
            } else {
                navigation_controller_->LoadURL(command.navigate_url);
                res.success = true;
                res.new_url = command.navigate_url;
                res.url_changed = true;
                res.message = "Direct in-process LoadURL: " + command.navigate_url;
            }
            break;
        }

        case ActionType::NewTab: {
            // TabStripModel::InsertWebContentsAt()
            auto new_tab = std::make_shared<WebContents>(tab_strip_model_->GetTabCount() + 1, command.navigate_url);
            int idx = tab_strip_model_->InsertWebContentsAt(tab_strip_model_->GetTabCount(), new_tab, true);
            active_web_contents_ = new_tab;
            navigation_controller_ = std::make_unique<NavigationController>(new_tab);
            res.success = true;
            res.message = "TabStripModel::InsertWebContentsAt index=" + std::to_string(idx);
            break;
        }

        case ActionType::CloseTab: {
            int cur_idx = tab_strip_model_->GetActiveIndex();
            tab_strip_model_->CloseWebContentsAt(cur_idx);
            active_web_contents_ = tab_strip_model_->GetActiveWebContents();
            if (active_web_contents_) {
                navigation_controller_ = std::make_unique<NavigationController>(active_web_contents_);
            }
            res.success = true;
            res.message = "TabStripModel::CloseWebContentsAt index=" + std::to_string(cur_idx);
            break;
        }

        case ActionType::SwitchTab: {
            int target_idx = static_cast<int>(command.target_id);
            tab_strip_model_->ActivateTabAt(target_idx);
            active_web_contents_ = tab_strip_model_->GetActiveWebContents();
            if (active_web_contents_) {
                navigation_controller_ = std::make_unique<NavigationController>(active_web_contents_);
            }
            res.success = true;
            res.message = "TabStripModel::ActivateTabAt index=" + std::to_string(target_idx);
            break;
        }

        case ActionType::GrepSource: {
            const auto& html = active_web_contents_->GetSourceHTML();
            auto grep_res = grep_engine_->Search(html, command.grep_query, command.grep_offset, command.grep_limit);
            res.success = true;
            res.message = grep_engine_->FormatMarkdown(grep_res);
            break;
        }

        case ActionType::SolveCaptcha: {
            const auto& html = active_web_contents_->GetSourceHTML();
            auto detection = captcha_detector_->Detect(html, active_web_contents_->GetURL());
            std::string token, status;
            bool solved = solver_service_->SolveViaService(detection, token, status);
            res.success = solved;
            res.message = status;
            break;
        }

        case ActionType::HumanTakeover: {
            hitl_controller_->RequestTakeover("Agent escalated to human operator");
            res.success = true;
            res.message = "HITL Takeover initiated. Awaiting human input.";
            break;
        }

        default:
            res.message = "Unknown action type";
            break;
    }

    return res;
}

bool ClosedLoopAgent::DetectStateDiff(const AgentStateSnapshot& before, const AgentStateSnapshot& after) {
    return (before.dom_hash != after.dom_hash || before.url != after.url);
}

} // namespace ai_browser
