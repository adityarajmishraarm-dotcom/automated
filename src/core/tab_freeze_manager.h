#pragma once

#include "tab_event_bus.h"
#include <chrono>
#include <memory>
#include <vector>
#include "mutex_compat.h"

namespace ai_browser {

class WebContents;

struct TabFreezeConfig {
    int dom_freeze_timeout_seconds = 300;     // 5 minutes
    int process_discard_timeout_seconds = 900; // 15 minutes
    bool enable_auto_freezing = true;
};

// Evaluates inactivity, enforces auto-exemptions, and executes multi-tier freezing
class TabFreezeManager {
public:
    explicit TabFreezeManager(std::shared_ptr<TabEventBus> event_bus, const TabFreezeConfig& config = TabFreezeConfig());
    ~TabFreezeManager();

    // Check if a tab can be frozen/discarded or if an auto-exemption applies
    bool IsExemptFromFreeze(const WebContents& contents) const;

    // Evaluate tabs and apply Tier 1 (DOM Freeze) or Tier 2 (Process Discard) transitions
    // Returns number of tabs whose freeze tier changed
    int EvaluateTabs(const std::vector<std::shared_ptr<WebContents>>& tabs, int active_index);

    // Force transitions
    bool FreezeTabDom(WebContents& contents);
    bool DiscardTabProcess(WebContents& contents);
    bool RehydrateTab(WebContents& contents);

    const TabFreezeConfig& GetConfig() const { return config_; }
    void UpdateConfig(const TabFreezeConfig& config);

private:
    std::shared_ptr<TabEventBus> event_bus_;
    TabFreezeConfig config_;
    mutable std::mutex mutex_;
};

} // namespace ai_browser
