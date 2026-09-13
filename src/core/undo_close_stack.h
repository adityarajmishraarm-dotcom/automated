#pragma once

#include "optional_compat.h"
#include "tab_event_bus.h"
#include <string>
#include <vector>
#include <deque>
#include "mutex_compat.h"
#include <chrono>

namespace ai_browser {

// Deep state representation of a closed tab
struct TabStateSnapshot {
    TabId original_tab_id = 0;
    WindowId window_id = 1;
    int original_index = 0;
    std::string url = "about:blank";
    std::string title = "New Tab";
    std::string favicon_url;
    std::vector<std::string> navigation_history;
    int current_history_index = -1;
    double scroll_x = 0.0;
    double scroll_y = 0.0;
    bool is_pinned = false;
    bool is_muted = false;
    GroupId group_id;
    WorkspaceId workspace_id = "default";
    std::chrono::system_clock::time_point closed_at;
};

// Bounded LIFO Stack for closed tab state recovery
class UndoCloseStack {
public:
    explicit UndoCloseStack(size_t max_capacity = 50);
    ~UndoCloseStack();

    // Prevent copy, allow move
    UndoCloseStack(const UndoCloseStack&) = delete;
    UndoCloseStack& operator=(const UndoCloseStack&) = delete;
    UndoCloseStack(UndoCloseStack&&) = default;
    UndoCloseStack& operator=(UndoCloseStack&&) = default;

    // Push closed tab state to top of LIFO stack (evicts oldest if > max_capacity)
    void Push(const TabStateSnapshot& snapshot);

    // Pop the most recently closed tab for a specific window
    std::optional<TabStateSnapshot> Pop(WindowId window_id);

    // Pop the most recently closed tab globally across all windows
    std::optional<TabStateSnapshot> PopGlobal();

    // Peek the top element without removing
    std::optional<TabStateSnapshot> Peek(WindowId window_id) const;
    std::optional<TabStateSnapshot> PeekGlobal() const;

    size_t GetCount(WindowId window_id) const;
    size_t GetTotalCount() const;
    size_t GetCapacity() const { return max_capacity_; }
    void SetCapacity(size_t capacity);

    void Clear();
    void ClearForWindow(WindowId window_id);

    // Export snapshots for session serialization
    std::vector<TabStateSnapshot> GetAllSnapshots() const;
    void RestoreSnapshots(const std::vector<TabStateSnapshot>& snapshots);

private:
    size_t max_capacity_;
    mutable std::mutex mutex_;
    std::deque<TabStateSnapshot> stack_; // Front is newest, back is oldest
};

} // namespace ai_browser
