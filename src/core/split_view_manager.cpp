#include "split_view_manager.h"
#include <algorithm>

namespace ai_browser {

SplitViewManager::SplitViewManager() = default;
SplitViewManager::~SplitViewManager() = default;

bool SplitViewManager::CreateSplitTile(TabId primary_tab, TabId secondary_tab, SplitOrientation orientation, double ratio) {
    if (primary_tab == 0 || secondary_tab == 0 || primary_tab == secondary_tab) {
        return false;
    }
    if (orientation == SplitOrientation::kNone) {
        return false;
    }

    std::lock_guard<std::mutex> lock(mutex_);

    // Remove any existing split ties for these tabs
    tab_to_split_.erase(primary_tab);
    tab_to_split_.erase(secondary_tab);

    SplitTile tile;
    tile.primary_tab_id = primary_tab;
    tile.secondary_tab_id = secondary_tab;
    tile.orientation = orientation;
    tile.split_ratio = std::max(0.2, std::min(0.8, ratio));

    tab_to_split_[primary_tab] = tile;
    tab_to_split_[secondary_tab] = tile;
    return true;
}

bool SplitViewManager::RemoveSplitTile(TabId tab_id) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = tab_to_split_.find(tab_id);
    if (it == tab_to_split_.end()) return false;

    TabId partner = (it->second.primary_tab_id == tab_id) ? it->second.secondary_tab_id : it->second.primary_tab_id;
    tab_to_split_.erase(tab_id);
    tab_to_split_.erase(partner);
    return true;
}

bool SplitViewManager::IsTabInSplit(TabId tab_id) const {
    std::lock_guard<std::mutex> lock(mutex_);
    return tab_to_split_.find(tab_id) != tab_to_split_.end();
}

TabId SplitViewManager::GetSplitPartner(TabId tab_id) const {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = tab_to_split_.find(tab_id);
    if (it == tab_to_split_.end()) return 0;
    return (it->second.primary_tab_id == tab_id) ? it->second.secondary_tab_id : it->second.primary_tab_id;
}

SplitTile SplitViewManager::GetSplitTileForTab(TabId tab_id) const {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = tab_to_split_.find(tab_id);
    if (it != tab_to_split_.end()) {
        return it->second;
    }
    return SplitTile();
}

bool SplitViewManager::SetSplitRatio(TabId tab_id, double ratio) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = tab_to_split_.find(tab_id);
    if (it == tab_to_split_.end()) return false;

    double clamped = std::max(0.2, std::min(0.8, ratio));
    it->second.split_ratio = clamped;

    TabId partner = (it->second.primary_tab_id == tab_id) ? it->second.secondary_tab_id : it->second.primary_tab_id;
    auto p_it = tab_to_split_.find(partner);
    if (p_it != tab_to_split_.end()) {
        p_it->second.split_ratio = clamped;
    }
    return true;
}

WindowId SplitViewManager::AllocateNewWindowId() {
    std::lock_guard<std::mutex> lock(mutex_);
    return next_window_id_++;
}

bool SplitViewManager::RegisterTabWindow(TabId tab_id, WindowId window_id) {
    std::lock_guard<std::mutex> lock(mutex_);
    tab_to_window_[tab_id] = window_id;
    return true;
}

WindowId SplitViewManager::GetTabWindow(TabId tab_id) const {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = tab_to_window_.find(tab_id);
    if (it != tab_to_window_.end()) {
        return it->second;
    }
    return 1; // Default to main window 1
}

std::vector<TabId> SplitViewManager::GetTabsInWindow(WindowId window_id) const {
    std::lock_guard<std::mutex> lock(mutex_);
    std::vector<TabId> result;
    for (const auto& kv : tab_to_window_) {
        if (kv.second == window_id) {
            result.push_back(kv.first);
        }
    }
    return result;
}

void SplitViewManager::UnregisterTabWindow(TabId tab_id) {
    std::lock_guard<std::mutex> lock(mutex_);
    tab_to_window_.erase(tab_id);
}

} // namespace ai_browser
