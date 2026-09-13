#pragma once

#include "optional_compat.h"
#include "tab_event_bus.h"
#include "undo_close_stack.h"
#include <string>
#include <vector>
#include <memory>
#include "mutex_compat.h"

namespace ai_browser {

struct SessionTabRecord {
    TabId id = 0;
    int index = 0;
    std::string url;
    std::string title;
    std::string favicon_url;
    bool is_pinned = false;
    bool is_muted = false;
    GroupId group_id;
    WorkspaceId workspace_id = "default";
    std::vector<std::string> history;
    int history_index = -1;
    double scroll_x = 0.0;
    double scroll_y = 0.0;
};

struct SessionGroupRecord {
    GroupId id;
    std::string title;
    std::string color_hex;
    bool is_collapsed = false;
    std::vector<TabId> tab_ids;
};

struct SessionWorkspaceRecord {
    WorkspaceId id;
    std::string name;
    std::string icon;
    std::vector<TabId> tab_ids;
};

struct SessionManifest {
    TabId active_tab_id = 0;
    WorkspaceId active_workspace_id = "default";
    std::vector<SessionTabRecord> tabs;
    std::vector<SessionGroupRecord> groups;
    std::vector<SessionWorkspaceRecord> workspaces;
    std::vector<TabStateSnapshot> undo_stack;
    int64_t saved_at_epoch_ms = 0;
};

// Fault-Tolerant Session Persistence and Crash Recovery
class SessionPersistenceManager {
public:
    explicit SessionPersistenceManager(const std::string& storage_directory = ".");
    ~SessionPersistenceManager();

    // Crash recovery marker lifecycle
    bool InitializeAndCheckCrash();
    void MarkCleanShutdown();

    // Atomic Save and Load
    bool SaveSessionAtomic(const SessionManifest& manifest);
    std::optional<SessionManifest> LoadSession();

    bool HasSavedSession() const;
    void ClearSavedSession();

    const std::string& GetSessionFilePath() const { return session_file_path_; }
    const std::string& GetLockFilePath() const { return lock_file_path_; }

    // JSON serialization utilities (pure STL, zero external dependencies)
    static std::string SerializeToJson(const SessionManifest& manifest);
    static std::optional<SessionManifest> DeserializeFromJson(const std::string& json_str);

private:
    std::string storage_dir_;
    std::string session_file_path_;
    std::string session_tmp_path_;
    std::string lock_file_path_;
    mutable std::mutex mutex_;
    bool was_unclean_shutdown_ = false;
};

} // namespace ai_browser
