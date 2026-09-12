#pragma once

#include "agent_types.h"
#include <string>
#include <functional>

namespace ai_browser {

enum class AgentState {
    AutonomousRunning,
    AwaitingHumanTakeover,
    Resumed
};

// Layer 4 Fallback: Human-in-the-Loop (HITL) Controller
class HITLController {
public:
    HITLController();
    ~HITLController();

    // Initiates human takeover request (pauses agent loop and alerts UI)
    void RequestTakeover(const std::string& reason);

    // Human signals completion or state diff detects challenge solved
    void CompleteTakeover();

    // Verifies if challenge was solved by inspecting state change
    bool CheckResolution(bool dom_changed, bool url_changed);

    AgentState GetState() const { return current_state_; }
    const std::string& GetStatusMessage() const { return status_message_; }

    void SetStateChangeCallback(std::function<void(AgentState, const std::string&)> callback) {
        on_state_change_ = std::move(callback);
    }

private:
    AgentState current_state_ = AgentState::AutonomousRunning;
    std::string status_message_ = "Running autonomously";
    std::function<void(AgentState, const std::string&)> on_state_change_;
};

} // namespace ai_browser
