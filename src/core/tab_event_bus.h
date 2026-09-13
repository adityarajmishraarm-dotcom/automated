#pragma once

#include <string>
#include <vector>
#include <memory>
#include <functional>
#include "mutex_compat.h"
#include <cstdint>
#include <map>

namespace ai_browser {

using TabId = uint32_t;
using WindowId = uint32_t;
using GroupId = std::string;
using WorkspaceId = std::string;
using SubscriptionId = uint64_t;

enum class LoadingState {
    kUnloaded,
    kLoading,
    kLoaded,
    kFailed
};

enum class FreezeTier {
    kActive = 0,         // Normal running state
    kDomFrozen = 1,       // Tier 1: JS execution / timers paused
    kProcessDiscarded = 2 // Tier 2: Render process unloaded, metadata preserved
};

enum class AudioState {
    kSilent,
    kPlaying,
    kMuted
};

enum class MediaCaptureState {
    kNone,
    kMicrophone,
    kCamera,
    kScreen,
    kMicAndCam
};

struct TabCreatedEvent {
    TabId tab_id = 0;
    WindowId window_id = 1;
    int index = 0;
    bool is_pinned = false;
    std::string url;
};

struct TabClosedEvent {
    TabId tab_id = 0;
    WindowId window_id = 1;
    int index = 0;
    std::string url;
};

struct TabActivatedEvent {
    TabId tab_id = 0;
    WindowId window_id = 1;
    int index = 0;
    std::string url;
};

struct TabFaviconUpdatedEvent {
    TabId tab_id = 0;
    std::string favicon_url;
};

struct TabLoadingStateChangedEvent {
    TabId tab_id = 0;
    LoadingState state = LoadingState::kUnloaded;
    double progress = 0.0;
};

struct TabPinnedChangedEvent {
    TabId tab_id = 0;
    bool is_pinned = false;
    int new_index = 0;
};

struct TabMutedChangedEvent {
    TabId tab_id = 0;
    bool is_muted = false;
};

struct TabFrozenChangedEvent {
    TabId tab_id = 0;
    FreezeTier tier = FreezeTier::kActive;
};

struct TabGroupChangedEvent {
    TabId tab_id = 0;
    GroupId group_id;
};

struct WorkspaceChangedEvent {
    WorkspaceId workspace_id;
};

// Thread-Safe Decoupled Tab Event Bus
class TabEventBus {
public:
    TabEventBus();
    ~TabEventBus();

    // Prevent copy and move
    TabEventBus(const TabEventBus&) = delete;
    TabEventBus& operator=(const TabEventBus&) = delete;

    // Subscription registrations
    SubscriptionId SubscribeTabCreated(std::function<void(const TabCreatedEvent&)> callback);
    SubscriptionId SubscribeTabClosed(std::function<void(const TabClosedEvent&)> callback);
    SubscriptionId SubscribeTabActivated(std::function<void(const TabActivatedEvent&)> callback);
    SubscriptionId SubscribeTabFaviconUpdated(std::function<void(const TabFaviconUpdatedEvent&)> callback);
    SubscriptionId SubscribeTabLoadingStateChanged(std::function<void(const TabLoadingStateChangedEvent&)> callback);
    SubscriptionId SubscribeTabPinnedChanged(std::function<void(const TabPinnedChangedEvent&)> callback);
    SubscriptionId SubscribeTabMutedChanged(std::function<void(const TabMutedChangedEvent&)> callback);
    SubscriptionId SubscribeTabFrozenChanged(std::function<void(const TabFrozenChangedEvent&)> callback);
    SubscriptionId SubscribeTabGroupChanged(std::function<void(const TabGroupChangedEvent&)> callback);
    SubscriptionId SubscribeWorkspaceChanged(std::function<void(const WorkspaceChangedEvent&)> callback);

    // Unsubscribe by token
    void Unsubscribe(SubscriptionId sub_id);

    // Event dispatches (thread-safe, invokes copies outside lock)
    void Publish(const TabCreatedEvent& event);
    void Publish(const TabClosedEvent& event);
    void Publish(const TabActivatedEvent& event);
    void Publish(const TabFaviconUpdatedEvent& event);
    void Publish(const TabLoadingStateChangedEvent& event);
    void Publish(const TabPinnedChangedEvent& event);
    void Publish(const TabMutedChangedEvent& event);
    void Publish(const TabFrozenChangedEvent& event);
    void Publish(const TabGroupChangedEvent& event);
    void Publish(const WorkspaceChangedEvent& event);

    // Reset all subscriptions (useful for unit testing)
    void ClearAllSubscribers();

private:
    std::mutex mutex_;
    SubscriptionId next_sub_id_ = 1;

    std::map<SubscriptionId, std::function<void(const TabCreatedEvent&)>> created_subs_;
    std::map<SubscriptionId, std::function<void(const TabClosedEvent&)>> closed_subs_;
    std::map<SubscriptionId, std::function<void(const TabActivatedEvent&)>> activated_subs_;
    std::map<SubscriptionId, std::function<void(const TabFaviconUpdatedEvent&)>> favicon_subs_;
    std::map<SubscriptionId, std::function<void(const TabLoadingStateChangedEvent&)>> loading_subs_;
    std::map<SubscriptionId, std::function<void(const TabPinnedChangedEvent&)>> pinned_subs_;
    std::map<SubscriptionId, std::function<void(const TabMutedChangedEvent&)>> muted_subs_;
    std::map<SubscriptionId, std::function<void(const TabFrozenChangedEvent&)>> frozen_subs_;
    std::map<SubscriptionId, std::function<void(const TabGroupChangedEvent&)>> group_subs_;
    std::map<SubscriptionId, std::function<void(const WorkspaceChangedEvent&)>> workspace_subs_;
};

} // namespace ai_browser
