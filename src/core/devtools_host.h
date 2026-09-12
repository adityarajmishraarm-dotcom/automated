#pragma once

#include "agent_types.h"
#include <string>
#include <vector>
#include <memory>
#include <functional>

namespace ai_browser {

// In-process representation of content::DevToolsAgentHost
// Calls protocol::DOM and protocol::Input C++ classes directly in-process without WebSockets or JSON overhead
class DevToolsHost {
public:
    DevToolsHost();
    ~DevToolsHost();

    // Direct in-process C++ method invocation matching protocol::Input::dispatchMouseEvent
    bool DispatchMouseEvent(const std::string& type, double x, double y, const std::string& button = "left", int click_count = 1);

    // Direct in-process C++ method invocation matching protocol::Input::dispatchKeyEvent
    bool DispatchKeyEvent(const std::string& type, const std::string& text, int key_code = 0);

    // Direct in-process C++ method invocation matching protocol::DOM::performSearch / getBoxModel
    std::optional<Rect> GetNodeBoxModel(int64_t backend_node_id);

    // Direct in-process script evaluation in isolated world (__ai_browser_agent__)
    std::string EvaluateScriptInIsolatedWorld(const std::string& script_source);

    // Stealth validation: confirm zero external ports opened and zero webdriver flags
    bool IsStealthActive() const { return stealth_active_; }
    void SetStealthActive(bool active) { stealth_active_ = active; }

    // Diagnostic event log for agent observation
    const std::vector<std::string>& GetExecutionTrace() const { return trace_log_; }
    void ClearTrace() { trace_log_.clear(); }

private:
    bool stealth_active_ = true;
    std::vector<std::string> trace_log_;
    std::map<int64_t, Rect> simulated_node_rects_;
};

} // namespace ai_browser
