#include "tab_event_bus.h"

namespace ai_browser {

TabEventBus::TabEventBus() = default;
TabEventBus::~TabEventBus() = default;

SubscriptionId TabEventBus::SubscribeTabCreated(std::function<void(const TabCreatedEvent&)> callback) {
    std::lock_guard<std::mutex> lock(mutex_);
    SubscriptionId id = next_sub_id_++;
    created_subs_[id] = std::move(callback);
    return id;
}

SubscriptionId TabEventBus::SubscribeTabClosed(std::function<void(const TabClosedEvent&)> callback) {
    std::lock_guard<std::mutex> lock(mutex_);
    SubscriptionId id = next_sub_id_++;
    closed_subs_[id] = std::move(callback);
    return id;
}

SubscriptionId TabEventBus::SubscribeTabActivated(std::function<void(const TabActivatedEvent&)> callback) {
    std::lock_guard<std::mutex> lock(mutex_);
    SubscriptionId id = next_sub_id_++;
    activated_subs_[id] = std::move(callback);
    return id;
}

SubscriptionId TabEventBus::SubscribeTabFaviconUpdated(std::function<void(const TabFaviconUpdatedEvent&)> callback) {
    std::lock_guard<std::mutex> lock(mutex_);
    SubscriptionId id = next_sub_id_++;
    favicon_subs_[id] = std::move(callback);
    return id;
}

SubscriptionId TabEventBus::SubscribeTabLoadingStateChanged(std::function<void(const TabLoadingStateChangedEvent&)> callback) {
    std::lock_guard<std::mutex> lock(mutex_);
    SubscriptionId id = next_sub_id_++;
    loading_subs_[id] = std::move(callback);
    return id;
}

SubscriptionId TabEventBus::SubscribeTabPinnedChanged(std::function<void(const TabPinnedChangedEvent&)> callback) {
    std::lock_guard<std::mutex> lock(mutex_);
    SubscriptionId id = next_sub_id_++;
    pinned_subs_[id] = std::move(callback);
    return id;
}

SubscriptionId TabEventBus::SubscribeTabMutedChanged(std::function<void(const TabMutedChangedEvent&)> callback) {
    std::lock_guard<std::mutex> lock(mutex_);
    SubscriptionId id = next_sub_id_++;
    muted_subs_[id] = std::move(callback);
    return id;
}

SubscriptionId TabEventBus::SubscribeTabFrozenChanged(std::function<void(const TabFrozenChangedEvent&)> callback) {
    std::lock_guard<std::mutex> lock(mutex_);
    SubscriptionId id = next_sub_id_++;
    frozen_subs_[id] = std::move(callback);
    return id;
}

SubscriptionId TabEventBus::SubscribeTabGroupChanged(std::function<void(const TabGroupChangedEvent&)> callback) {
    std::lock_guard<std::mutex> lock(mutex_);
    SubscriptionId id = next_sub_id_++;
    group_subs_[id] = std::move(callback);
    return id;
}

SubscriptionId TabEventBus::SubscribeWorkspaceChanged(std::function<void(const WorkspaceChangedEvent&)> callback) {
    std::lock_guard<std::mutex> lock(mutex_);
    SubscriptionId id = next_sub_id_++;
    workspace_subs_[id] = std::move(callback);
    return id;
}

void TabEventBus::Unsubscribe(SubscriptionId sub_id) {
    std::lock_guard<std::mutex> lock(mutex_);
    created_subs_.erase(sub_id);
    closed_subs_.erase(sub_id);
    activated_subs_.erase(sub_id);
    favicon_subs_.erase(sub_id);
    loading_subs_.erase(sub_id);
    pinned_subs_.erase(sub_id);
    muted_subs_.erase(sub_id);
    frozen_subs_.erase(sub_id);
    group_subs_.erase(sub_id);
    workspace_subs_.erase(sub_id);
}

void TabEventBus::Publish(const TabCreatedEvent& event) {
    std::vector<std::function<void(const TabCreatedEvent&)>> callbacks;
    {
        std::lock_guard<std::mutex> lock(mutex_);
        for (const auto& kv : created_subs_) {
            callbacks.push_back(kv.second);
        }
    }
    for (const auto& cb : callbacks) {
        if (cb) cb(event);
    }
}

void TabEventBus::Publish(const TabClosedEvent& event) {
    std::vector<std::function<void(const TabClosedEvent&)>> callbacks;
    {
        std::lock_guard<std::mutex> lock(mutex_);
        for (const auto& kv : closed_subs_) {
            callbacks.push_back(kv.second);
        }
    }
    for (const auto& cb : callbacks) {
        if (cb) cb(event);
    }
}

void TabEventBus::Publish(const TabActivatedEvent& event) {
    std::vector<std::function<void(const TabActivatedEvent&)>> callbacks;
    {
        std::lock_guard<std::mutex> lock(mutex_);
        for (const auto& kv : activated_subs_) {
            callbacks.push_back(kv.second);
        }
    }
    for (const auto& cb : callbacks) {
        if (cb) cb(event);
    }
}

void TabEventBus::Publish(const TabFaviconUpdatedEvent& event) {
    std::vector<std::function<void(const TabFaviconUpdatedEvent&)>> callbacks;
    {
        std::lock_guard<std::mutex> lock(mutex_);
        for (const auto& kv : favicon_subs_) {
            callbacks.push_back(kv.second);
        }
    }
    for (const auto& cb : callbacks) {
        if (cb) cb(event);
    }
}

void TabEventBus::Publish(const TabLoadingStateChangedEvent& event) {
    std::vector<std::function<void(const TabLoadingStateChangedEvent&)>> callbacks;
    {
        std::lock_guard<std::mutex> lock(mutex_);
        for (const auto& kv : loading_subs_) {
            callbacks.push_back(kv.second);
        }
    }
    for (const auto& cb : callbacks) {
        if (cb) cb(event);
    }
}

void TabEventBus::Publish(const TabPinnedChangedEvent& event) {
    std::vector<std::function<void(const TabPinnedChangedEvent&)>> callbacks;
    {
        std::lock_guard<std::mutex> lock(mutex_);
        for (const auto& kv : pinned_subs_) {
            callbacks.push_back(kv.second);
        }
    }
    for (const auto& cb : callbacks) {
        if (cb) cb(event);
    }
}

void TabEventBus::Publish(const TabMutedChangedEvent& event) {
    std::vector<std::function<void(const TabMutedChangedEvent&)>> callbacks;
    {
        std::lock_guard<std::mutex> lock(mutex_);
        for (const auto& kv : muted_subs_) {
            callbacks.push_back(kv.second);
        }
    }
    for (const auto& cb : callbacks) {
        if (cb) cb(event);
    }
}

void TabEventBus::Publish(const TabFrozenChangedEvent& event) {
    std::vector<std::function<void(const TabFrozenChangedEvent&)>> callbacks;
    {
        std::lock_guard<std::mutex> lock(mutex_);
        for (const auto& kv : frozen_subs_) {
            callbacks.push_back(kv.second);
        }
    }
    for (const auto& cb : callbacks) {
        if (cb) cb(event);
    }
}

void TabEventBus::Publish(const TabGroupChangedEvent& event) {
    std::vector<std::function<void(const TabGroupChangedEvent&)>> callbacks;
    {
        std::lock_guard<std::mutex> lock(mutex_);
        for (const auto& kv : group_subs_) {
            callbacks.push_back(kv.second);
        }
    }
    for (const auto& cb : callbacks) {
        if (cb) cb(event);
    }
}

void TabEventBus::Publish(const WorkspaceChangedEvent& event) {
    std::vector<std::function<void(const WorkspaceChangedEvent&)>> callbacks;
    {
        std::lock_guard<std::mutex> lock(mutex_);
        for (const auto& kv : workspace_subs_) {
            callbacks.push_back(kv.second);
        }
    }
    for (const auto& cb : callbacks) {
        if (cb) cb(event);
    }
}

void TabEventBus::ClearAllSubscribers() {
    std::lock_guard<std::mutex> lock(mutex_);
    created_subs_.clear();
    closed_subs_.clear();
    activated_subs_.clear();
    favicon_subs_.clear();
    loading_subs_.clear();
    pinned_subs_.clear();
    muted_subs_.clear();
    frozen_subs_.clear();
    group_subs_.clear();
    workspace_subs_.clear();
}

} // namespace ai_browser
