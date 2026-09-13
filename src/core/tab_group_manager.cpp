#include "tab_group_manager.h"
#include <algorithm>

namespace ai_browser {

TabGroupManager::TabGroupManager(std::shared_ptr<TabEventBus> event_bus)
    : event_bus_(std::move(event_bus)) {
    // Initialize default workspace
    Workspace default_ws;
    default_ws.id = "default";
    default_ws.name = "Default";
    default_ws.icon = "globe";
    workspaces_[default_ws.id] = default_ws;
}

TabGroupManager::~TabGroupManager() = default;

bool TabGroupManager::CreateWorkspace(const WorkspaceId& id, const std::string& name, const std::string& icon) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (id.empty() || workspaces_.find(id) != workspaces_.end()) {
        return false;
    }
    Workspace ws;
    ws.id = id;
    ws.name = name;
    ws.icon = icon;
    workspaces_[id] = ws;
    return true;
}

bool TabGroupManager::SwitchWorkspace(const WorkspaceId& id) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (workspaces_.find(id) == workspaces_.end()) {
        return false;
    }
    active_workspace_id_ = id;
    if (event_bus_) {
        WorkspaceChangedEvent ev;
        ev.workspace_id = id;
        event_bus_->Publish(ev);
    }
    return true;
}

const WorkspaceId& TabGroupManager::GetActiveWorkspaceId() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return active_workspace_id_;
}

std::vector<Workspace> TabGroupManager::GetAllWorkspaces() const {
    std::lock_guard<std::mutex> lock(mutex_);
    std::vector<Workspace> result;
    for (const auto& kv : workspaces_) {
        result.push_back(kv.second);
    }
    return result;
}

bool TabGroupManager::DeleteWorkspace(const WorkspaceId& id) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (id == "default" || workspaces_.find(id) == workspaces_.end()) {
        return false;
    }
    // Reassign all tabs in deleted workspace to default
    auto& ws = workspaces_[id];
    for (TabId tid : ws.tab_ids) {
        tab_to_workspace_[tid] = "default";
        workspaces_["default"].tab_ids.push_back(tid);
    }
    workspaces_.erase(id);
    if (active_workspace_id_ == id) {
        active_workspace_id_ = "default";
        if (event_bus_) {
            WorkspaceChangedEvent ev;
            ev.workspace_id = "default";
            event_bus_->Publish(ev);
        }
    }
    return true;
}

void TabGroupManager::AssignTabToWorkspace(TabId tab_id, const WorkspaceId& workspace_id) {
    std::lock_guard<std::mutex> lock(mutex_);
    WorkspaceId target_ws = workspace_id.empty() ? active_workspace_id_ : workspace_id;
    if (workspaces_.find(target_ws) == workspaces_.end()) {
        target_ws = "default";
    }

    // Remove from previous workspace if present
    auto prev_it = tab_to_workspace_.find(tab_id);
    if (prev_it != tab_to_workspace_.end()) {
        auto& old_list = workspaces_[prev_it->second].tab_ids;
        old_list.erase(std::remove(old_list.begin(), old_list.end(), tab_id), old_list.end());
    }

    tab_to_workspace_[tab_id] = target_ws;
    workspaces_[target_ws].tab_ids.push_back(tab_id);
}

void TabGroupManager::RemoveTabFromWorkspace(TabId tab_id) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = tab_to_workspace_.find(tab_id);
    if (it != tab_to_workspace_.end()) {
        auto& list = workspaces_[it->second].tab_ids;
        list.erase(std::remove(list.begin(), list.end(), tab_id), list.end());
        tab_to_workspace_.erase(it);
    }
}

std::vector<TabId> TabGroupManager::GetTabsInWorkspace(const WorkspaceId& workspace_id) const {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = workspaces_.find(workspace_id);
    if (it != workspaces_.end()) {
        return it->second.tab_ids;
    }
    return {};
}

GroupId TabGroupManager::CreateGroup(const std::string& title, const std::string& color_hex, const WorkspaceId& workspace_id) {
    std::lock_guard<std::mutex> lock(mutex_);
    GroupId gid = "group_" + std::to_string(next_group_num_++);
    TabGroup grp;
    grp.id = gid;
    grp.title = title;
    grp.color_hex = color_hex.empty() ? "#3B82F6" : color_hex;
    grp.is_collapsed = false;

    groups_[gid] = grp;

    WorkspaceId ws = workspace_id.empty() ? active_workspace_id_ : workspace_id;
    if (workspaces_.find(ws) != workspaces_.end()) {
        workspaces_[ws].group_ids.push_back(gid);
    }
    return gid;
}

bool TabGroupManager::DeleteGroup(const GroupId& group_id) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = groups_.find(group_id);
    if (it == groups_.end()) return false;

    for (TabId tid : it->second.tab_ids) {
        tab_to_group_.erase(tid);
        if (event_bus_) {
            TabGroupChangedEvent ev;
            ev.tab_id = tid;
            ev.group_id = "";
            event_bus_->Publish(ev);
        }
    }

    // Remove from workspaces
    for (auto& kv : workspaces_) {
        auto& g_list = kv.second.group_ids;
        g_list.erase(std::remove(g_list.begin(), g_list.end(), group_id), g_list.end());
    }

    groups_.erase(it);
    return true;
}

bool TabGroupManager::AddTabToGroup(const GroupId& group_id, TabId tab_id) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = groups_.find(group_id);
    if (it == groups_.end()) return false;

    // If tab was in another group, remove it
    auto old_git = tab_to_group_.find(tab_id);
    if (old_git != tab_to_group_.end()) {
        auto& old_tabs = groups_[old_git->second].tab_ids;
        old_tabs.erase(std::remove(old_tabs.begin(), old_tabs.end(), tab_id), old_tabs.end());
    }

    it->second.tab_ids.push_back(tab_id);
    tab_to_group_[tab_id] = group_id;

    if (event_bus_) {
        TabGroupChangedEvent ev;
        ev.tab_id = tab_id;
        ev.group_id = group_id;
        event_bus_->Publish(ev);
    }
    return true;
}

bool TabGroupManager::RemoveTabFromGroup(TabId tab_id) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = tab_to_group_.find(tab_id);
    if (it == tab_to_group_.end()) return false;

    auto git = groups_.find(it->second);
    if (git != groups_.end()) {
        auto& t_list = git->second.tab_ids;
        t_list.erase(std::remove(t_list.begin(), t_list.end(), tab_id), t_list.end());
    }

    tab_to_group_.erase(it);

    if (event_bus_) {
        TabGroupChangedEvent ev;
        ev.tab_id = tab_id;
        ev.group_id = "";
        event_bus_->Publish(ev);
    }
    return true;
}

bool TabGroupManager::SetGroupCollapsed(const GroupId& group_id, bool collapsed) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = groups_.find(group_id);
    if (it == groups_.end()) return false;
    it->second.is_collapsed = collapsed;
    return true;
}

bool TabGroupManager::ToggleGroupCollapsed(const GroupId& group_id) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = groups_.find(group_id);
    if (it == groups_.end()) return false;
    it->second.is_collapsed = !it->second.is_collapsed;
    return true;
}

bool TabGroupManager::SetGroupColor(const GroupId& group_id, const std::string& color_hex) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = groups_.find(group_id);
    if (it == groups_.end()) return false;
    it->second.color_hex = color_hex;
    return true;
}

bool TabGroupManager::SetGroupTitle(const GroupId& group_id, const std::string& title) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = groups_.find(group_id);
    if (it == groups_.end()) return false;
    it->second.title = title;
    return true;
}

std::vector<TabGroup> TabGroupManager::GetGroupsInWorkspace(const WorkspaceId& workspace_id) const {
    std::lock_guard<std::mutex> lock(mutex_);
    std::vector<TabGroup> result;
    auto it = workspaces_.find(workspace_id);
    if (it != workspaces_.end()) {
        for (const auto& gid : it->second.group_ids) {
            auto git = groups_.find(gid);
            if (git != groups_.end()) {
                result.push_back(git->second);
            }
        }
    }
    return result;
}

std::vector<TabGroup> TabGroupManager::GetAllGroups() const {
    std::lock_guard<std::mutex> lock(mutex_);
    std::vector<TabGroup> result;
    for (const auto& kv : groups_) {
        result.push_back(kv.second);
    }
    return result;
}

GroupId TabGroupManager::GetTabGroupId(TabId tab_id) const {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = tab_to_group_.find(tab_id);
    if (it != tab_to_group_.end()) {
        return it->second;
    }
    return "";
}

bool TabGroupManager::IsTabInGroup(TabId tab_id) const {
    std::lock_guard<std::mutex> lock(mutex_);
    return tab_to_group_.find(tab_id) != tab_to_group_.end();
}

bool TabGroupManager::IsTabHiddenByCollapsedGroup(TabId tab_id) const {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = tab_to_group_.find(tab_id);
    if (it == tab_to_group_.end()) return false;
    auto git = groups_.find(it->second);
    if (git != groups_.end()) {
        return git->second.is_collapsed;
    }
    return false;
}

} // namespace ai_browser
