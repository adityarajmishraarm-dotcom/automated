#include "tab_manager.h"
#include <algorithm>
#include <iostream>

namespace ai_browser {

// -----------------------------------------------------------------------------
// WebContents Implementation
// -----------------------------------------------------------------------------

WebContents::WebContents(uint32_t id, const std::string& initial_url)
    : id_(id), current_url_(initial_url), title_("New Tab"), last_accessed_time_(std::chrono::steady_clock::now()) {
    history_.push_back(initial_url);
    history_index_ = 0;
}

WebContents::~WebContents() {
    Destroy();
}

void WebContents::SetURL(const std::string& url) {
    current_url_ = url;
    PushHistoryEntry(url);
    TouchLastAccessedTime();
}

void WebContents::PushHistoryEntry(const std::string& url) {
    if (history_index_ >= 0 && history_index_ < static_cast<int>(history_.size())) {
        // If navigating from middle of history, truncate forward entries
        history_.erase(history_.begin() + history_index_ + 1, history_.end());
    }
    history_.push_back(url);
    history_index_ = static_cast<int>(history_.size()) - 1;
    current_url_ = url;
}

void WebContents::SetNavigationHistory(const std::vector<std::string>& history, int index) {
    history_ = history;
    history_index_ = std::max(0, std::min(static_cast<int>(history_.size()) - 1, index));
    if (history_index_ >= 0 && history_index_ < static_cast<int>(history_.size())) {
        current_url_ = history_[history_index_];
    }
}

void WebContents::Destroy() {
    if (is_destroyed_) return;
    is_destroyed_ = true;

    // Explicitly release internal Chromium render buffers and DOM state
    source_html_.clear();
    source_html_.shrink_to_fit();
    history_.clear();
    history_.shrink_to_fit();
    current_url_ = "about:blank";
    title_.clear();
    favicon_url_.clear();
    freeze_tier_ = FreezeTier::kProcessDiscarded;
}

TabStateSnapshot WebContents::CreateSnapshot(int current_index) const {
    TabStateSnapshot snapshot;
    snapshot.original_tab_id = id_;
    snapshot.window_id = window_id_;
    snapshot.original_index = current_index;
    snapshot.url = current_url_;
    snapshot.title = title_;
    snapshot.favicon_url = favicon_url_;
    snapshot.navigation_history = history_;
    snapshot.current_history_index = history_index_;
    snapshot.scroll_x = scroll_x_;
    snapshot.scroll_y = scroll_y_;
    snapshot.is_pinned = is_pinned_;
    snapshot.is_muted = is_muted_;
    snapshot.group_id = group_id_;
    snapshot.workspace_id = workspace_id_;
    snapshot.closed_at = std::chrono::system_clock::now();
    return snapshot;
}

void WebContents::RestoreFromSnapshot(const TabStateSnapshot& snapshot) {
    current_url_ = snapshot.url;
    title_ = snapshot.title;
    favicon_url_ = snapshot.favicon_url;
    history_ = snapshot.navigation_history;
    history_index_ = snapshot.current_history_index;
    scroll_x_ = snapshot.scroll_x;
    scroll_y_ = snapshot.scroll_y;
    is_pinned_ = snapshot.is_pinned;
    is_muted_ = snapshot.is_muted;
    group_id_ = snapshot.group_id;
    workspace_id_ = snapshot.workspace_id;
    window_id_ = snapshot.window_id;
    is_destroyed_ = false;
    freeze_tier_ = FreezeTier::kActive;
    TouchLastAccessedTime();
}

// -----------------------------------------------------------------------------
// TabStripModel Implementation
// -----------------------------------------------------------------------------

TabStripModel::TabStripModel(WindowId window_id, const std::string& session_dir)
    : window_id_(window_id) {
    event_bus_ = std::make_shared<TabEventBus>();
    undo_stack_ = std::make_shared<UndoCloseStack>(50);
    freeze_manager_ = std::make_shared<TabFreezeManager>(event_bus_);
    group_manager_ = std::make_shared<TabGroupManager>(event_bus_);
    search_index_ = std::make_shared<TabSearchIndex>();
    split_view_manager_ = std::make_shared<SplitViewManager>();
    resource_tracker_ = std::make_shared<TabResourceTracker>(event_bus_);
    session_persistence_ = std::make_shared<SessionPersistenceManager>(session_dir);
}

TabStripModel::~TabStripModel() {
    // Explicit clean shutdown to prevent memory leaks
    for (auto& tab : tabs_) {
        if (tab) {
            tab->Destroy();
        }
    }
    tabs_.clear();
}

int TabStripModel::InsertWebContentsAt(int index, std::shared_ptr<WebContents> contents, bool make_active) {
    if (!contents) return -1;
    std::lock_guard<std::mutex> lock(mutex_);

    // Pinned partition enforcement
    if (contents->IsPinned()) {
        index = std::max(0, std::min(index, pinned_count_));
        pinned_count_++;
    } else {
        if (index < pinned_count_) {
            index = pinned_count_;
        }
        if (index > static_cast<int>(tabs_.size())) {
            index = static_cast<int>(tabs_.size());
        }
    }

    contents->SetWindowId(window_id_);
    tabs_.insert(tabs_.begin() + index, contents);

    // Register with sub-managers
    TabSearchRecord search_rec;
    search_rec.tab_id = contents->GetId();
    search_rec.window_id = window_id_;
    search_rec.title = contents->GetTitle();
    search_rec.url = contents->GetURL();
    search_rec.is_pinned = contents->IsPinned();
    search_rec.is_muted = contents->IsMuted();
    search_rec.workspace_id = contents->GetWorkspaceId();
    search_index_->IndexTab(search_rec);

    split_view_manager_->RegisterTabWindow(contents->GetId(), window_id_);
    group_manager_->AssignTabToWorkspace(contents->GetId(), contents->GetWorkspaceId());

    // Publish creation event
    TabCreatedEvent created_ev;
    created_ev.tab_id = contents->GetId();
    created_ev.window_id = window_id_;
    created_ev.index = index;
    created_ev.is_pinned = contents->IsPinned();
    created_ev.url = contents->GetURL();
    event_bus_->Publish(created_ev);

    // Handle active tab switching
    if (make_active || active_index_ == -1) {
        active_index_ = index;
        freeze_manager_->RehydrateTab(*contents);

        TabActivatedEvent act_ev;
        act_ev.tab_id = contents->GetId();
        act_ev.window_id = window_id_;
        act_ev.index = index;
        act_ev.url = contents->GetURL();
        event_bus_->Publish(act_ev);

        if (on_tab_activated_) {
            on_tab_activated_(active_index_, contents);
        }
    } else if (index <= active_index_) {
        active_index_++;
    }

    return index;
}

bool TabStripModel::CloseWebContentsAt(int index) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (index < 0 || index >= static_cast<int>(tabs_.size())) {
        return false;
    }

    auto tab_to_close = tabs_[index];
    if (!tab_to_close) return false;

    // Pinned tabs are locked and protected from standard closure
    if (tab_to_close->IsPinned()) {
        return false;
    }

    // Capture deep state snapshot and push to Undo Stack
    TabStateSnapshot snapshot = tab_to_close->CreateSnapshot(index);
    undo_stack_->Push(snapshot);

    // Publish closed event
    TabClosedEvent closed_ev;
    closed_ev.tab_id = tab_to_close->GetId();
    closed_ev.window_id = window_id_;
    closed_ev.index = index;
    closed_ev.url = tab_to_close->GetURL();
    event_bus_->Publish(closed_ev);

    // Cleanup from subsystems
    search_index_->RemoveTab(tab_to_close->GetId());
    split_view_manager_->RemoveSplitTile(tab_to_close->GetId());
    split_view_manager_->UnregisterTabWindow(tab_to_close->GetId());
    resource_tracker_->RemoveMetrics(tab_to_close->GetId());
    group_manager_->RemoveTabFromGroup(tab_to_close->GetId());
    group_manager_->RemoveTabFromWorkspace(tab_to_close->GetId());

    // Explicit destructor routine to destroy render process contexts
    tab_to_close->Destroy();

    tabs_.erase(tabs_.begin() + index);

    // Adjust active index
    if (tabs_.empty()) {
        active_index_ = -1;
    } else if (active_index_ >= static_cast<int>(tabs_.size())) {
        active_index_ = static_cast<int>(tabs_.size()) - 1;
        freeze_manager_->RehydrateTab(*tabs_[active_index_]);
        if (on_tab_activated_) {
            on_tab_activated_(active_index_, tabs_[active_index_]);
        }
    } else if (index < active_index_) {
        active_index_--;
    } else if (index == active_index_) {
        active_index_ = std::min(index, static_cast<int>(tabs_.size()) - 1);
        freeze_manager_->RehydrateTab(*tabs_[active_index_]);
        if (on_tab_activated_) {
            on_tab_activated_(active_index_, tabs_[active_index_]);
        }
    }

    return true;
}

bool TabStripModel::ActivateTabAt(int index) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (index < 0 || index >= static_cast<int>(tabs_.size())) {
        return false;
    }

    active_index_ = index;
    auto tab = tabs_[active_index_];
    if (tab) {
        freeze_manager_->RehydrateTab(*tab);

        TabActivatedEvent act_ev;
        act_ev.tab_id = tab->GetId();
        act_ev.window_id = window_id_;
        act_ev.index = active_index_;
        act_ev.url = tab->GetURL();
        event_bus_->Publish(act_ev);

        if (on_tab_activated_) {
            on_tab_activated_(active_index_, tab);
        }
    }
    return true;
}

std::shared_ptr<WebContents> TabStripModel::SpawnTab(const std::string& url, bool make_active, bool is_pinned) {
    uint32_t tid = next_tab_id_++;
    auto tab = std::make_shared<WebContents>(tid, url);
    tab->SetPinned(is_pinned);

    int insert_idx = is_pinned ? pinned_count_ : static_cast<int>(tabs_.size());
    InsertWebContentsAt(insert_idx, tab, make_active);
    return tab;
}

std::shared_ptr<WebContents> TabStripModel::DuplicateTab(int index) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (index < 0 || index >= static_cast<int>(tabs_.size())) {
        return nullptr;
    }

    auto src_tab = tabs_[index];
    uint32_t tid = next_tab_id_++;
    auto dup = std::make_shared<WebContents>(tid, src_tab->GetURL());
    dup->SetTitle(src_tab->GetTitle());
    dup->SetFaviconURL(src_tab->GetFaviconURL());
    dup->SetNavigationHistory(src_tab->GetNavigationHistory(), src_tab->GetHistoryIndex());
    dup->SetScrollPosition(src_tab->GetScrollX(), src_tab->GetScrollY());
    dup->SetMuted(src_tab->IsMuted());
    dup->SetGroupId(src_tab->GetGroupId());
    dup->SetWorkspaceId(src_tab->GetWorkspaceId());

    int target_idx = index + 1;
    // Call unlocked insert helper logic
    if (target_idx > static_cast<int>(tabs_.size())) target_idx = static_cast<int>(tabs_.size());
    tabs_.insert(tabs_.begin() + target_idx, dup);

    if (src_tab->IsPinned()) {
        dup->SetPinned(true);
        pinned_count_++;
    }

    TabCreatedEvent created_ev;
    created_ev.tab_id = dup->GetId();
    created_ev.window_id = window_id_;
    created_ev.index = target_idx;
    created_ev.is_pinned = dup->IsPinned();
    created_ev.url = dup->GetURL();
    event_bus_->Publish(created_ev);

    return dup;
}

bool TabStripModel::CloseTab(TabId tab_id) {
    int idx = GetIndexOfTab(tab_id);
    if (idx < 0) return false;
    return CloseWebContentsAt(idx);
}

bool TabStripModel::MoveTab(int from_index, int to_index) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (from_index < 0 || from_index >= static_cast<int>(tabs_.size())) return false;
    if (to_index < 0 || to_index >= static_cast<int>(tabs_.size())) return false;
    if (from_index == to_index) return true;

    auto tab = tabs_[from_index];

    // Enforce pinned partition boundaries
    if (tab->IsPinned()) {
        if (to_index >= pinned_count_) {
            // Cannot drag a pinned tab into non-pinned territory without unpinning
            return false;
        }
    } else {
        if (to_index < pinned_count_) {
            // Cannot drag a non-pinned tab into pinned territory without pinning
            return false;
        }
    }

    tabs_.erase(tabs_.begin() + from_index);
    tabs_.insert(tabs_.begin() + to_index, tab);

    // Update active index
    if (active_index_ == from_index) {
        active_index_ = to_index;
    } else if (from_index < active_index_ && to_index >= active_index_) {
        active_index_--;
    } else if (from_index > active_index_ && to_index <= active_index_) {
        active_index_++;
    }

    return true;
}

int TabStripModel::PinTab(int index, bool pinned) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (index < 0 || index >= static_cast<int>(tabs_.size())) return -1;

    auto tab = tabs_[index];
    if (tab->IsPinned() == pinned) return index;

    tab->SetPinned(pinned);

    tabs_.erase(tabs_.begin() + index);
    int new_index = 0;

    if (pinned) {
        // Move to end of pinned partition
        new_index = pinned_count_;
        tabs_.insert(tabs_.begin() + new_index, tab);
        pinned_count_++;
    } else {
        // Move to start of non-pinned partition
        pinned_count_--;
        new_index = pinned_count_;
        tabs_.insert(tabs_.begin() + new_index, tab);
    }

    if (active_index_ == index) {
        active_index_ = new_index;
    }

    TabPinnedChangedEvent ev;
    ev.tab_id = tab->GetId();
    ev.is_pinned = pinned;
    ev.new_index = new_index;
    event_bus_->Publish(ev);

    return new_index;
}

bool TabStripModel::IsTabPinned(int index) const {
    std::lock_guard<std::mutex> lock(mutex_);
    if (index >= 0 && index < static_cast<int>(tabs_.size())) {
        return tabs_[index]->IsPinned();
    }
    return false;
}

std::shared_ptr<WebContents> TabStripModel::RestoreLastClosedTab() {
    auto snapshot_opt = undo_stack_->Pop(window_id_);
    if (!snapshot_opt) {
        snapshot_opt = undo_stack_->PopGlobal();
    }
    if (!snapshot_opt) {
        return nullptr;
    }

    const auto& snapshot = *snapshot_opt;
    uint32_t tid = next_tab_id_++;
    auto restored_tab = std::make_shared<WebContents>(tid, snapshot.url);
    restored_tab->RestoreFromSnapshot(snapshot);

    int target_idx = std::min(snapshot.original_index, static_cast<int>(tabs_.size()));
    InsertWebContentsAt(target_idx, restored_tab, true);
    return restored_tab;
}

int TabStripModel::GetTabCount() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return static_cast<int>(tabs_.size());
}

int TabStripModel::GetActiveIndex() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return active_index_;
}

std::shared_ptr<WebContents> TabStripModel::GetActiveWebContents() const {
    std::lock_guard<std::mutex> lock(mutex_);
    if (active_index_ >= 0 && active_index_ < static_cast<int>(tabs_.size())) {
        return tabs_[active_index_];
    }
    return nullptr;
}

std::shared_ptr<WebContents> TabStripModel::GetWebContentsAt(int index) const {
    std::lock_guard<std::mutex> lock(mutex_);
    if (index >= 0 && index < static_cast<int>(tabs_.size())) {
        return tabs_[index];
    }
    return nullptr;
}

std::shared_ptr<WebContents> TabStripModel::GetWebContentsById(TabId tab_id) const {
    std::lock_guard<std::mutex> lock(mutex_);
    for (const auto& tab : tabs_) {
        if (tab && tab->GetId() == tab_id) {
            return tab;
        }
    }
    return nullptr;
}

int TabStripModel::GetIndexOfTab(TabId tab_id) const {
    std::lock_guard<std::mutex> lock(mutex_);
    for (size_t i = 0; i < tabs_.size(); ++i) {
        if (tabs_[i] && tabs_[i]->GetId() == tab_id) {
            return static_cast<int>(i);
        }
    }
    return -1;
}

bool TabStripModel::SaveSession() {
    SessionManifest manifest;
    {
        std::lock_guard<std::mutex> lock(mutex_);
        if (active_index_ >= 0 && active_index_ < static_cast<int>(tabs_.size())) {
            manifest.active_tab_id = tabs_[active_index_]->GetId();
        }
        manifest.active_workspace_id = group_manager_->GetActiveWorkspaceId();

        for (size_t i = 0; i < tabs_.size(); ++i) {
            const auto& tab = tabs_[i];
            SessionTabRecord rec;
            rec.id = tab->GetId();
            rec.index = static_cast<int>(i);
            rec.url = tab->GetURL();
            rec.title = tab->GetTitle();
            rec.favicon_url = tab->GetFaviconURL();
            rec.is_pinned = tab->IsPinned();
            rec.is_muted = tab->IsMuted();
            rec.group_id = tab->GetGroupId();
            rec.workspace_id = tab->GetWorkspaceId();
            rec.history = tab->GetNavigationHistory();
            rec.history_index = tab->GetHistoryIndex();
            rec.scroll_x = tab->GetScrollX();
            rec.scroll_y = tab->GetScrollY();
            manifest.tabs.push_back(rec);
        }
    }

    // Groups & Workspaces
    auto groups = group_manager_->GetAllGroups();
    for (const auto& g : groups) {
        SessionGroupRecord gr;
        gr.id = g.id;
        gr.title = g.title;
        gr.color_hex = g.color_hex;
        gr.is_collapsed = g.is_collapsed;
        gr.tab_ids = g.tab_ids;
        manifest.groups.push_back(gr);
    }

    auto workspaces = group_manager_->GetAllWorkspaces();
    for (const auto& w : workspaces) {
        SessionWorkspaceRecord wr;
        wr.id = w.id;
        wr.name = w.name;
        wr.icon = w.icon;
        wr.tab_ids = w.tab_ids;
        manifest.workspaces.push_back(wr);
    }

    manifest.undo_stack = undo_stack_->GetAllSnapshots();
    manifest.saved_at_epoch_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();

    return session_persistence_->SaveSessionAtomic(manifest);
}

bool TabStripModel::RestoreSession() {
    auto manifest_opt = session_persistence_->LoadSession();
    if (!manifest_opt) return false;

    const auto& manifest = *manifest_opt;

    // Restore Workspaces and Groups first
    for (const auto& w : manifest.workspaces) {
        group_manager_->CreateWorkspace(w.id, w.name, w.icon);
    }
    for (const auto& g : manifest.groups) {
        GroupId gid = group_manager_->CreateGroup(g.title, g.color_hex);
        group_manager_->SetGroupCollapsed(gid, g.is_collapsed);
    }

    // Restore Tabs
    for (const auto& t : manifest.tabs) {
        uint32_t tid = next_tab_id_++;
        auto tab = std::make_shared<WebContents>(tid, t.url);
        tab->SetTitle(t.title);
        tab->SetFaviconURL(t.favicon_url);
        tab->SetPinned(t.is_pinned);
        tab->SetMuted(t.is_muted);
        tab->SetGroupId(t.group_id);
        tab->SetWorkspaceId(t.workspace_id);
        tab->SetNavigationHistory(t.history, t.history_index);
        tab->SetScrollPosition(t.scroll_x, t.scroll_y);

        bool make_active = (t.id == manifest.active_tab_id);
        InsertWebContentsAt(t.index, tab, make_active);

        if (!t.group_id.empty()) {
            group_manager_->AddTabToGroup(t.group_id, tid);
        }
    }

    undo_stack_->RestoreSnapshots(manifest.undo_stack);
    if (!manifest.active_workspace_id.empty()) {
        group_manager_->SwitchWorkspace(manifest.active_workspace_id);
    }

    return true;
}

void TabStripModel::SetTabActivatedCallback(std::function<void(int, std::shared_ptr<WebContents>)> callback) {
    on_tab_activated_ = std::move(callback);
}

} // namespace ai_browser
