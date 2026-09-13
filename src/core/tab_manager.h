#pragma once

#include "optional_compat.h"
#include "tab_event_bus.h"
#include "undo_close_stack.h"
#include "tab_freeze_manager.h"
#include "tab_group_manager.h"
#include "session_persistence.h"
#include "tab_search_index.h"
#include "split_view_manager.h"
#include "tab_resource_tracker.h"

#include <string>
#include <vector>
#include <memory>
#include <functional>
#include <chrono>
#include "mutex_compat.h"

namespace ai_browser {

// Deep in-process representation of Chromium WebContents & RenderProcessHost
class WebContents {
public:
    explicit WebContents(uint32_t id, const std::string& initial_url = "about:blank");
    ~WebContents();

    // Prevent copy, allow move
    WebContents(const WebContents&) = delete;
    WebContents& operator=(const WebContents&) = delete;

    uint32_t GetId() const { return id_; }
    WindowId GetWindowId() const { return window_id_; }
    void SetWindowId(WindowId wid) { window_id_ = wid; }

    const std::string& GetURL() const { return current_url_; }
    void SetURL(const std::string& url);

    const std::string& GetTitle() const { return title_; }
    void SetTitle(const std::string& title) { title_ = title; }

    const std::string& GetFaviconURL() const { return favicon_url_; }
    void SetFaviconURL(const std::string& fav) { favicon_url_ = fav; }

    const std::string& GetSourceHTML() const { return source_html_; }
    void SetSourceHTML(const std::string& html) { source_html_ = html; }

    // Navigation History Buffer
    const std::vector<std::string>& GetNavigationHistory() const { return history_; }
    int GetHistoryIndex() const { return history_index_; }
    void SetNavigationHistory(const std::vector<std::string>& history, int index);
    void PushHistoryEntry(const std::string& url);

    // Scroll Depth
    double GetScrollX() const { return scroll_x_; }
    double GetScrollY() const { return scroll_y_; }
    void SetScrollPosition(double x, double y) { scroll_x_ = x; scroll_y_ = y; }

    // Pinned & Mute Status
    bool IsPinned() const { return is_pinned_; }
    void SetPinned(bool pinned) { is_pinned_ = pinned; }

    bool IsMuted() const { return is_muted_; }
    void SetMuted(bool muted) { is_muted_ = muted; }

    // Media & Hardware Status
    bool IsAudioPlaying() const { return is_audio_playing_; }
    void SetAudioPlaying(bool playing) { is_audio_playing_ = playing; }

    bool HasWebRTCConnection() const { return has_webrtc_; }
    void SetWebRTCConnection(bool active) { has_webrtc_ = active; }

    bool HasUnsavedFormData() const { return has_unsaved_form_; }
    void SetUnsavedFormData(bool dirty) { has_unsaved_form_ = dirty; }

    // Adaptive Freeze State
    FreezeTier GetFreezeTier() const { return freeze_tier_; }
    void SetFreezeTier(FreezeTier tier) { freeze_tier_ = tier; }

    std::chrono::steady_clock::time_point GetLastAccessedTime() const { return last_accessed_time_; }
    void TouchLastAccessedTime() { last_accessed_time_ = std::chrono::steady_clock::now(); }

    // Tab Group & Workspace
    const GroupId& GetGroupId() const { return group_id_; }
    void SetGroupId(const GroupId& gid) { group_id_ = gid; }

    const WorkspaceId& GetWorkspaceId() const { return workspace_id_; }
    void SetWorkspaceId(const WorkspaceId& wid) { workspace_id_ = wid; }

    // Explicit destructor routine: tears down render process, DOM contexts, and buffer memory
    void Destroy();
    bool IsDestroyed() const { return is_destroyed_; }

    // Snapshot creation for deep undo restoration
    TabStateSnapshot CreateSnapshot(int current_index) const;
    void RestoreFromSnapshot(const TabStateSnapshot& snapshot);

private:
    uint32_t id_;
    WindowId window_id_ = 1;
    std::string current_url_;
    std::string title_;
    std::string favicon_url_;
    std::string source_html_;

    std::vector<std::string> history_;
    int history_index_ = -1;

    double scroll_x_ = 0.0;
    double scroll_y_ = 0.0;

    bool is_pinned_ = false;
    bool is_muted_ = false;
    bool is_audio_playing_ = false;
    bool has_webrtc_ = false;
    bool has_unsaved_form_ = false;

    FreezeTier freeze_tier_ = FreezeTier::kActive;
    std::chrono::steady_clock::time_point last_accessed_time_;

    GroupId group_id_;
    WorkspaceId workspace_id_ = "default";
    bool is_destroyed_ = false;
};

// Complete In-Process Chromium TabStripModel (chrome/browser/ui/tabs/tab_strip_model.h)
class TabStripModel {
public:
    explicit TabStripModel(WindowId window_id = 1, const std::string& session_dir = ".");
    ~TabStripModel();

    // Prevent copy and move
    TabStripModel(const TabStripModel&) = delete;
    TabStripModel& operator=(const TabStripModel&) = delete;

    // Direct C++ in-process calls matching Chromium TabStripModel API
    int InsertWebContentsAt(int index, std::shared_ptr<WebContents> contents, bool make_active = true);
    bool CloseWebContentsAt(int index);
    bool ActivateTabAt(int index);

    // Extended High-Level Lifecycle APIs
    std::shared_ptr<WebContents> SpawnTab(const std::string& url = "about:blank", bool make_active = true, bool is_pinned = false);
    std::shared_ptr<WebContents> DuplicateTab(int index);
    bool CloseTab(TabId tab_id);
    bool MoveTab(int from_index, int to_index);

    // Pinned Tab Isolation (pinned tabs partition: [0, pinned_count_))
    int PinTab(int index, bool pinned);
    bool IsTabPinned(int index) const;
    int GetPinnedTabCount() const { return pinned_count_; }

    // Deep Undo Recovery (`Ctrl+Shift+T`)
    std::shared_ptr<WebContents> RestoreLastClosedTab();

    // State Inspection
    int GetTabCount() const;
    int GetActiveIndex() const;
    std::shared_ptr<WebContents> GetActiveWebContents() const;
    std::shared_ptr<WebContents> GetWebContentsAt(int index) const;
    std::shared_ptr<WebContents> GetWebContentsById(TabId tab_id) const;
    int GetIndexOfTab(TabId tab_id) const;

    // Subsystem Accessors
    std::shared_ptr<TabEventBus> GetEventBus() const { return event_bus_; }
    std::shared_ptr<UndoCloseStack> GetUndoStack() const { return undo_stack_; }
    std::shared_ptr<TabFreezeManager> GetFreezeManager() const { return freeze_manager_; }
    std::shared_ptr<TabGroupManager> GetGroupManager() const { return group_manager_; }
    std::shared_ptr<TabSearchIndex> GetSearchIndex() const { return search_index_; }
    std::shared_ptr<SplitViewManager> GetSplitViewManager() const { return split_view_manager_; }
    std::shared_ptr<TabResourceTracker> GetResourceTracker() const { return resource_tracker_; }
    std::shared_ptr<SessionPersistenceManager> GetSessionPersistence() const { return session_persistence_; }

    // Session Persistence & Crash Recovery
    bool SaveSession();
    bool RestoreSession();

    // Legacy callback compatibility for observing tab activations
    void SetTabActivatedCallback(std::function<void(int index, std::shared_ptr<WebContents>)> callback);

    WindowId GetWindowId() const { return window_id_; }

private:
    WindowId window_id_ = 1;
    mutable std::mutex mutex_;

    std::vector<std::shared_ptr<WebContents>> tabs_;
    int active_index_ = -1;
    int pinned_count_ = 0;
    uint32_t next_tab_id_ = 1;

    std::shared_ptr<TabEventBus> event_bus_;
    std::shared_ptr<UndoCloseStack> undo_stack_;
    std::shared_ptr<TabFreezeManager> freeze_manager_;
    std::shared_ptr<TabGroupManager> group_manager_;
    std::shared_ptr<TabSearchIndex> search_index_;
    std::shared_ptr<SplitViewManager> split_view_manager_;
    std::shared_ptr<TabResourceTracker> resource_tracker_;
    std::shared_ptr<SessionPersistenceManager> session_persistence_;

    std::function<void(int, std::shared_ptr<WebContents>)> on_tab_activated_;
};

} // namespace ai_browser
