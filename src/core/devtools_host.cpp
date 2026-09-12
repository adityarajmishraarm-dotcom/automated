#include "devtools_host.h"
#include <sstream>
#include <iostream>

namespace ai_browser {

DevToolsHost::DevToolsHost() {
    trace_log_.push_back("DevToolsHost initialized in-process (content::DevToolsAgentHost)");
}

DevToolsHost::~DevToolsHost() = default;

bool DevToolsHost::DispatchMouseEvent(const std::string& type, double x, double y, const std::string& button, int click_count) {
    std::ostringstream ss;
    ss << "InProcess protocol::Input::dispatchMouseEvent type=" << type
       << " x=" << x << " y=" << y << " button=" << button << " clickCount=" << click_count;
    trace_log_.push_back(ss.str());
    return true;
}

bool DevToolsHost::DispatchKeyEvent(const std::string& type, const std::string& text, int key_code) {
    std::ostringstream ss;
    ss << "InProcess protocol::Input::dispatchKeyEvent type=" << type
       << " text='" << text << "' keyCode=" << key_code;
    trace_log_.push_back(ss.str());
    return true;
}

std::optional<Rect> DevToolsHost::GetNodeBoxModel(int64_t backend_node_id) {
    auto it = simulated_node_rects_.find(backend_node_id);
    if (it != simulated_node_rects_.end()) {
        return it->second;
    }
    // Default fallback rect
    return Rect{100.0, 100.0, 150.0, 36.0};
}

std::string DevToolsHost::EvaluateScriptInIsolatedWorld(const std::string& script_source) {
    trace_log_.push_back("InProcess isolated_world(__ai_browser_agent__) script evaluated (" +
                        std::to_string(script_source.length()) + " bytes)");
    return "{\"status\": \"ok\", \"isolated_world\": \"__ai_browser_agent__\"}";
}

} // namespace ai_browser
