#include "hitl_controller.h"

namespace ai_browser {

HITLController::HITLController() = default;
HITLController::~HITLController() = default;

void HITLController::RequestTakeover(const std::string& reason) {
    current_state_ = AgentState::AwaitingHumanTakeover;
    status_message_ = "Human Input Required: " + reason;
    if (on_state_change_) {
        on_state_change_(current_state_, status_message_);
    }
}

void HITLController::CompleteTakeover() {
    current_state_ = AgentState::Resumed;
    status_message_ = "Human interaction complete. Resuming autonomous agent loop.";
    if (on_state_change_) {
        on_state_change_(current_state_, status_message_);
    }
}

bool HITLController::CheckResolution(bool dom_changed, bool url_changed) {
    if (current_state_ == AgentState::AwaitingHumanTakeover) {
        if (dom_changed || url_changed) {
            CompleteTakeover();
            return true;
        }
    }
    return false;
}

} // namespace ai_browser
