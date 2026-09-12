#pragma once

#include "agent_types.h"
#include <string>
#include <vector>

namespace ai_browser {

enum class ModelTarget {
    FastTextLLM,
    VisualVLM
};

struct RoutingDecision {
    ModelTarget target = ModelTarget::FastTextLLM;
    std::string reason;
    bool requires_som_overlay = false;
    double confidence = 1.0;
};

// Dual-Model Routing Strategy (Fast LLM <500ms vs VLM Inspector)
class DualModelRouter {
public:
    DualModelRouter();
    ~DualModelRouter();

    // Evaluates page state, extracted elements, and task intent to route to LLM or VLM
    RoutingDecision Route(const std::vector<InteractiveElement>& elements,
                          const std::string& current_html,
                          const std::string& intent_description,
                          const CaptchaDetectionResult& captcha_result) const;
};

} // namespace ai_browser
