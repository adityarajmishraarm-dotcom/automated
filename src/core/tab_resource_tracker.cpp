#include "tab_resource_tracker.h"

namespace ai_browser {

TabResourceTracker::TabResourceTracker(std::shared_ptr<TabEventBus> event_bus)
    : event_bus_(std::move(event_bus)) {}

TabResourceTracker::~TabResourceTracker() = default;

void TabResourceTracker::UpdateMetrics(TabId tab_id, double cpu_percent, uint64_t memory_bytes, uint64_t rx_sec, uint64_t tx_sec) {
    std::lock_guard<std::mutex> lock(mutex_);
    TabResourceMetrics m;
    m.tab_id = tab_id;
    m.cpu_percent = cpu_percent;
    m.memory_bytes = memory_bytes;
    m.memory_mb = static_cast<double>(memory_bytes) / (1024.0 * 1024.0);
    m.network_rx_bytes_sec = rx_sec;
    m.network_tx_bytes_sec = tx_sec;
    m.is_high_memory_usage = (m.memory_mb >= high_memory_threshold_mb_);
    metrics_[tab_id] = m;
}

TabResourceMetrics TabResourceTracker::GetMetrics(TabId tab_id) const {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = metrics_.find(tab_id);
    if (it != metrics_.end()) {
        return it->second;
    }
    TabResourceMetrics empty_m;
    empty_m.tab_id = tab_id;
    return empty_m;
}

void TabResourceTracker::RemoveMetrics(TabId tab_id) {
    std::lock_guard<std::mutex> lock(mutex_);
    metrics_.erase(tab_id);
    media_status_.erase(tab_id);
}

void TabResourceTracker::SetHighMemoryThresholdMb(double threshold_mb) {
    std::lock_guard<std::mutex> lock(mutex_);
    high_memory_threshold_mb_ = threshold_mb > 0 ? threshold_mb : 500.0;
}

void TabResourceTracker::SetAudioPlaying(TabId tab_id, bool playing) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto& status = media_status_[tab_id];
    status.tab_id = tab_id;
    if (status.audio_state != AudioState::kMuted) {
        status.audio_state = playing ? AudioState::kPlaying : AudioState::kSilent;
    }
}

void TabResourceTracker::SetMuted(TabId tab_id, bool muted) {
    {
        std::lock_guard<std::mutex> lock(mutex_);
        auto& status = media_status_[tab_id];
        status.tab_id = tab_id;
        status.audio_state = muted ? AudioState::kMuted : AudioState::kSilent;
    }
    if (event_bus_) {
        TabMutedChangedEvent ev;
        ev.tab_id = tab_id;
        ev.is_muted = muted;
        event_bus_->Publish(ev);
    }
}

bool TabResourceTracker::ToggleMute(TabId tab_id) {
    bool new_muted = false;
    {
        std::lock_guard<std::mutex> lock(mutex_);
        auto& status = media_status_[tab_id];
        status.tab_id = tab_id;
        new_muted = (status.audio_state != AudioState::kMuted);
        status.audio_state = new_muted ? AudioState::kMuted : AudioState::kSilent;
    }
    if (event_bus_) {
        TabMutedChangedEvent ev;
        ev.tab_id = tab_id;
        ev.is_muted = new_muted;
        event_bus_->Publish(ev);
    }
    return new_muted;
}

bool TabResourceTracker::IsMuted(TabId tab_id) const {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = media_status_.find(tab_id);
    if (it != media_status_.end()) {
        return it->second.audio_state == AudioState::kMuted;
    }
    return false;
}

bool TabResourceTracker::IsAudioPlaying(TabId tab_id) const {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = media_status_.find(tab_id);
    if (it != media_status_.end()) {
        return it->second.audio_state == AudioState::kPlaying;
    }
    return false;
}

void TabResourceTracker::SetMediaCapture(TabId tab_id, MediaCaptureState state) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto& status = media_status_[tab_id];
    status.tab_id = tab_id;
    status.capture_state = state;
}

MediaCaptureState TabResourceTracker::GetMediaCapture(TabId tab_id) const {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = media_status_.find(tab_id);
    if (it != media_status_.end()) {
        return it->second.capture_state;
    }
    return MediaCaptureState::kNone;
}

TabMediaStatus TabResourceTracker::GetMediaStatus(TabId tab_id) const {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = media_status_.find(tab_id);
    if (it != media_status_.end()) {
        return it->second;
    }
    TabMediaStatus default_status;
    default_status.tab_id = tab_id;
    return default_status;
}

} // namespace ai_browser
