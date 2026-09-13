#pragma once

#include "tab_event_bus.h"
#include <map>
#include "mutex_compat.h"
#include <vector>

namespace ai_browser {

enum class SplitOrientation {
    kNone,
    kLeftRight,
    kTopBottom
};

struct SplitTile {
    TabId primary_tab_id = 0;
    TabId secondary_tab_id = 0;
    SplitOrientation orientation = SplitOrientation::kLeftRight;
    double split_ratio = 0.5; // [0.2, 0.8]
};

// Manages Split-Screen side-by-side tiling and Window Detachment
class SplitViewManager {
public:
    SplitViewManager();
    ~SplitViewManager();

    // Split-Screen Tiling
    bool CreateSplitTile(TabId primary_tab, TabId secondary_tab, SplitOrientation orientation = SplitOrientation::kLeftRight, double ratio = 0.5);
    bool RemoveSplitTile(TabId tab_id); // Dissolves the split, restores single-view
    bool IsTabInSplit(TabId tab_id) const;
    TabId GetSplitPartner(TabId tab_id) const;
    SplitTile GetSplitTileForTab(TabId tab_id) const;
    bool SetSplitRatio(TabId tab_id, double ratio);

    // Window Detachment & Multi-Window Management
    WindowId AllocateNewWindowId();
    bool RegisterTabWindow(TabId tab_id, WindowId window_id);
    WindowId GetTabWindow(TabId tab_id) const;
    std::vector<TabId> GetTabsInWindow(WindowId window_id) const;
    void UnregisterTabWindow(TabId tab_id);

private:
    mutable std::mutex mutex_;
    std::map<TabId, SplitTile> tab_to_split_; // Both primary and secondary map to their tile
    std::map<TabId, WindowId> tab_to_window_;
    WindowId next_window_id_ = 2; // Window 1 is main
};

} // namespace ai_browser
