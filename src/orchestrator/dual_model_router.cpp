#include "dual_model_router.h"
#include <algorithm>

namespace ai_browser {

DualModelRouter::DualModelRouter() = default;
DualModelRouter::~DualModelRouter() = default;

RoutingDecision DualModelRouter::Route(const std::vector<InteractiveElement>& elements,
                                      const std::string& current_html,
                                      const std::string& intent_description,
                                      const CaptchaDetectionResult& captcha_result) const {
    RoutingDecision decision;

    // 1. CAPTCHA tile challenge requiring visual inspection
    if (captcha_result.detected && !captcha_result.is_behavioral_invisible) {
        decision.target = ModelTarget::VisualVLM;
        decision.requires_som_overlay = true;
        decision.reason = "Visual challenge detected (" + captcha_result.type_name + "): routing to VLM with SoM markers";
        decision.confidence = 0.98;
        return decision;
    }

    // 2. Canvas / WebGL / Interactive Maps / Complex Graphics
    if (current_html.find("<canvas") != std::string::npos ||
        current_html.find("mapboxgl") != std::string::npos ||
        current_html.find("leaflet-container") != std::string::npos) {
        decision.target = ModelTarget::VisualVLM;
        decision.requires_som_overlay = true;
        decision.reason = "Canvas/Map element present outside accessibility tree: routing to VLM";
        decision.confidence = 0.95;
        return decision;
    }

    // 3. Ambiguity Check: Multiple identical unlabeled icon buttons
    int unlabeled_buttons = 0;
    for (const auto& el : elements) {
        if (el.role == "button" && (el.name.empty() || el.name == "button")) {
            unlabeled_buttons++;
        }
    }
    if (unlabeled_buttons > 2) {
        decision.target = ModelTarget::VisualVLM;
        decision.requires_som_overlay = true;
        decision.reason = "Multiple ambiguous/unlabeled icon buttons detected: routing to VLM for visual grounding";
        decision.confidence = 0.90;
        return decision;
    }

    // 4. Final Transactional / Checkout Verification Check
    std::string lower_intent = intent_description;
    std::transform(lower_intent.begin(), lower_intent.end(), lower_intent.begin(), [](unsigned char c) {
        return static_cast<char>(std::tolower(c));
    });

    if (lower_intent.find("confirm order") != std::string::npos ||
        lower_intent.find("verify receipt") != std::string::npos ||
        lower_intent.find("final payment") != std::string::npos) {
        decision.target = ModelTarget::VisualVLM;
        decision.requires_som_overlay = true;
        decision.reason = "High-stakes transactional verification: routing to VLM";
        decision.confidence = 0.99;
        return decision;
    }

    // 5. Default Fast Path: Text LLM (<500ms)
    decision.target = ModelTarget::FastTextLLM;
    decision.requires_som_overlay = false;
    decision.reason = "Unambiguous AX tree elements available: fast Text LLM planner path (<500ms)";
    decision.confidence = 0.99;
    return decision;
}

} // namespace ai_browser
