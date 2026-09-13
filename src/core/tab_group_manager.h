#pragma once

#include "tab_event_bus.h"
#include <string>
#include <vector>
#include <map>
#include <memory>
#include "mutex_compat.h"

namespace ai_browser {

// Color-coded tab group
struct TabGroup {
    GroupId id;
    std::string title = "New Group";
    std::string color_hex = "#3B82F6"; // Default modern blue
    bool is_collapsed = false;
    std::vector<TabId> tab_ids;
};

// Isolated tab workspace
struct Workspace {
    WorkspaceId id = "default";
    std::string name = "Default";
    std::string icon = "globe";
    std::vector<TabId> tab_ids;
    std::vector<GroupId> group_ids;
    TabId active_tab_id = 0;
};

// Manages hierarchical Workspaces and Color-Coded Tab Groups
class TabGroupManager {
public:
    explicit TabGroupManager(std::shared_ptr<TabEventBus> event_bus = nullptr);
    ~TabGroupManager();

    // Workspaces
    bool CreateWorkspace(const WorkspaceId& id, const std::string& name, const std::string& icon = "folder");
    bool SwitchWorkspace(const WorkspaceId& id);
    const WorkspaceId& GetActiveWorkspaceId() const;
    std::vector<Workspace> GetAllWorkspaces() const;
    bool DeleteWorkspace(const WorkspaceId& id); // Default cannot be deleted

    void AssignTabToWorkspace(TabId tab_id, const WorkspaceId& workspace_id);
    void RemoveTabFromWorkspace(TabId tab_id);
    std::vector<TabId> GetTabsInWorkspace(const WorkspaceId& workspace_id) const;

    // Tab Groups
    GroupId CreateGroup(const std::string& title, const std::string& color_hex = "#3B82F6", const WorkspaceId& workspace_id = "");
    bool DeleteGroup(const GroupId& group_id);
    bool AddTabToGroup(const GroupId& group_id, TabId tab_id);
    bool RemoveTabFromGroup(TabId tab_id);
    bool SetGroupCollapsed(const GroupId& group_id, bool collapsed);
    bool ToggleGroupCollapsed(const GroupId& group_id);
    bool SetGroupColor(const GroupId& group_id, const std::string& color_hex);
    bool SetGroupTitle(const GroupId& group_id, const std::string& title);

    std::vector<TabGroup> GetGroupsInWorkspace(const WorkspaceId& workspace_id) const;
    std::vector<TabGroup> GetAllGroups() const;
    GroupId GetTabGroupId(TabId tab_id) const;
    bool IsTabInGroup(TabId tab_id) const;
    bool IsTabHiddenByCollapsedGroup(TabId tab_id) const;

private:
    std::shared_ptr<TabEventBus> event_bus_;
    mutable std::mutex mutex_;

    WorkspaceId active_workspace_id_ = "default";
    std::map<WorkspaceId, Workspace> workspaces_;
    std::map<GroupId, TabGroup> groups_;
    std::map<TabId, GroupId> tab_to_group_;
    std::map<TabId, WorkspaceId> tab_to_workspace_;
    uint32_t next_group_num_ = 1;
};

} // namespace ai_browser
