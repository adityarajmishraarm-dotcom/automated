#pragma once

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

#include <memory>
#include <string>
#include <vector>

namespace ai_browser {

struct AgentStateSnapshot {
    std::string url;
    std::string title;
    size_t dom_hash = 0;
    size_t element_count = 0;
    std::string ax_markdown;
    std::vector<InteractiveElement> elements;
    CaptchaDetectionResult captcha_result;
};

// Closed-Loop Execution Orchestrator (Observe -> Verify -> Act -> Diff)
class ClosedLoopAgent {
public:
    ClosedLoopAgent();
    ~ClosedLoopAgent();

    // 1. Observe Cleaned Page State
    AgentStateSnapshot ObserveState();

    // 2. Verify Pre-Condition
    bool VerifyPrecondition(const AgentStateSnapshot& prev, const AgentStateSnapshot& current);

    // 3. Plan & Execute Action
    ExecutionResult ExecuteAction(const ActionCommand& command);

    // 4. State Diff Check
    bool DetectStateDiff(const AgentStateSnapshot& before, const AgentStateSnapshot& after);

    // Subsystem accessors
    TabStripModel& GetTabStripModel() { return *tab_strip_model_; }
    DevToolsHost& GetDevToolsHost() { return *devtools_host_; }
    AdblockEngine& GetAdblockEngine() { return *adblock_engine_; }
    AutofillEngine& GetAutofillEngine() { return *autofill_engine_; }
    InMemoryGrep& GetGrepEngine() { return *grep_engine_; }
    HITLController& GetHITLController() { return *hitl_controller_; }
    DualModelRouter& GetDualModelRouter() { return *dual_model_router_; }

    void SetSimulatedPage(const std::string& url, const std::string& title, const std::string& html);

private:
    std::unique_ptr<TabStripModel> tab_strip_model_;
    std::unique_ptr<DevToolsHost> devtools_host_;
    std::unique_ptr<AdblockEngine> adblock_engine_;
    std::unique_ptr<AutofillEngine> autofill_engine_;
    std::unique_ptr<ElementExtractor> element_extractor_;
    std::unique_ptr<AXSanitizer> ax_sanitizer_;
    std::unique_ptr<SoMEngine> som_engine_;
    std::unique_ptr<InMemoryGrep> grep_engine_;
    std::unique_ptr<CaptchaDetector> captcha_detector_;
    std::unique_ptr<HumanizedKinematics> kinematics_;
    std::unique_ptr<CaptchaSolverService> solver_service_;
    std::unique_ptr<HITLController> hitl_controller_;
    std::unique_ptr<DualModelRouter> dual_model_router_;

    std::shared_ptr<WebContents> active_web_contents_;
    std::unique_ptr<NavigationController> navigation_controller_;
};

} // namespace ai_browser
