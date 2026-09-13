#include "tab_freeze_manager.h"
#include "tab_manager.h"
#include <chrono>

namespace ai_browser {

TabFreezeManager::TabFreezeManager(std::shared_ptr<TabEventBus> event_bus, const TabFreezeConfig& config)
    : event_bus_(std::move(event_bus)), config_(config) {}

TabFreezeManager::~TabFreezeManager() = default;

bool TabFreezeManager::IsExemptFromFreeze(const WebContents& contents) const {
    // Exemption 1: Pinned tabs are persistent and immune
    if (contents.IsPinned()) return true;

    // Exemption 2: Active audio or video playback
    if (contents.IsAudioPlaying()) return true;

    // Exemption 3: Active WebRTC / Media stream connection
    if (contents.HasWebRTCConnection()) return true;

    // Exemption 4: Unsaved form data or active beforeunload handler
    if (contents.HasUnsavedFormData()) return true;

    return false;
}

int TabFreezeManager::EvaluateTabs(const std::vector<std::shared_ptr<WebContents>>& tabs, int active_index) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (!config_.enable_auto_freezing) return 0;

    int changed_count = 0;
    auto now = std::chrono::steady_clock::now();

    for (int i = 0; i < static_cast<int>(tabs.size()); ++i) {
        // Active foreground tab is always Tier 0 (kActive) and exempt
        if (i == active_index) continue;

        auto& contents = *tabs[i];
        if (IsExemptFromFreeze(contents)) continue;

        auto idle_duration = std::chrono::duration_cast<std::chrono::seconds>(now - contents.GetLastAccessedTime()).count();

        // Tier 2: Process Discard check
        if (idle_duration >= config_.process_discard_timeout_seconds) {
            if (contents.GetFreezeTier() != FreezeTier::kProcessDiscarded) {
                if (DiscardTabProcess(contents)) {
                    changed_count++;
                }
            }
        }
        // Tier 1: DOM Freeze check
        else if (idle_duration >= config_.dom_freeze_timeout_seconds) {
            if (contents.GetFreezeTier() == FreezeTier::kActive) {
                if (FreezeTabDom(contents)) {
                    changed_count++;
                }
            }
        }
    }

    return changed_count;
}

bool TabFreezeManager::FreezeTabDom(WebContents& contents) {
    if (contents.GetFreezeTier() == FreezeTier::kDomFrozen) return true;
    contents.SetFreezeTier(FreezeTier::kDomFrozen);

    if (event_bus_) {
        TabFrozenChangedEvent ev;
        ev.tab_id = contents.GetId();
        ev.tier = FreezeTier::kDomFrozen;
        event_bus_->Publish(ev);
    }
    return true;
}

bool TabFreezeManager::DiscardTabProcess(WebContents& contents) {
    if (contents.GetFreezeTier() == FreezeTier::kProcessDiscarded) return true;

    // Simulate Chromium render process discard:
    // Retain title, URL, favicon, scroll depth in host WebContents object,
    // and unload in-process DOM context / page source to "about:blank".
    contents.SetFreezeTier(FreezeTier::kProcessDiscarded);

    if (event_bus_) {
        TabFrozenChangedEvent ev;
        ev.tab_id = contents.GetId();
        ev.tier = FreezeTier::kProcessDiscarded;
        event_bus_->Publish(ev);
    }
    return true;
}

bool TabFreezeManager::RehydrateTab(WebContents& contents) {
    if (contents.GetFreezeTier() == FreezeTier::kActive) return true;

    contents.SetFreezeTier(FreezeTier::kActive);
    contents.TouchLastAccessedTime();

    if (event_bus_) {
        TabFrozenChangedEvent ev;
        ev.tab_id = contents.GetId();
        ev.tier = FreezeTier::kActive;
        event_bus_->Publish(ev);
    }
    return true;
}

void TabFreezeManager::UpdateConfig(const TabFreezeConfig& config) {
    std::lock_guard<std::mutex> lock(mutex_);
    config_ = config;
}

} // namespace ai_browser
