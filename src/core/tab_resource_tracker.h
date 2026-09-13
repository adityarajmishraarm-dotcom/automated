#pragma once

#include "tab_event_bus.h"
#include <cstdint>
#include <map>
#include "mutex_compat.h"
#include <memory>

namespace ai_browser {

struct TabResourceMetrics {
    TabId tab_id = 0;
    double cpu_percent = 0.0;
    uint64_t memory_bytes = 0;
    double memory_mb = 0.0;
    uint64_t network_rx_bytes_sec = 0;
    uint64_t network_tx_bytes_sec = 0;
    bool is_high_memory_usage = false;
};

struct TabMediaStatus {
    TabId tab_id = 0;
    AudioState audio_state = AudioState::kSilent;
    MediaCaptureState capture_state = MediaCaptureState::kNone;
};

// Tracks per-tab CPU/Memory/Network telemetry and coordinates Media/Audio state
class TabResourceTracker {
public:
    explicit TabResourceTracker(std::shared_ptr<TabEventBus> event_bus = nullptr);
    ~TabResourceTracker();

    // Resource Telemetry
    void UpdateMetrics(TabId tab_id, double cpu_percent, uint64_t memory_bytes, uint64_t rx_sec = 0, uint64_t tx_sec = 0);
    TabResourceMetrics GetMetrics(TabId tab_id) const;
    void RemoveMetrics(TabId tab_id);
    void SetHighMemoryThresholdMb(double threshold_mb);
    double GetHighMemoryThresholdMb() const { return high_memory_threshold_mb_; }

    // Media & Audio Controller
    void SetAudioPlaying(TabId tab_id, bool playing);
    void SetMuted(TabId tab_id, bool muted);
    bool ToggleMute(TabId tab_id);
    bool IsMuted(TabId tab_id) const;
    bool IsAudioPlaying(TabId tab_id) const;

    void SetMediaCapture(TabId tab_id, MediaCaptureState state);
    MediaCaptureState GetMediaCapture(TabId tab_id) const;

    TabMediaStatus GetMediaStatus(TabId tab_id) const;

private:
    std::shared_ptr<TabEventBus> event_bus_;
    mutable std::mutex mutex_;
    double high_memory_threshold_mb_ = 500.0; // 500 MB default threshold
    std::map<TabId, TabResourceMetrics> metrics_;
    std::map<TabId, TabMediaStatus> media_status_;
};

} // namespace ai_browser
