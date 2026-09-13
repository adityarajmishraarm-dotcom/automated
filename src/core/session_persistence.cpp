#include "session_persistence.h"
#include <fstream>
#include <sstream>
#include <cstdio>
#include <chrono>
#include <algorithm>

#ifdef _WIN32
#include <direct.h>
#define MakeDir(d) _mkdir(d)
#else
#include <sys/stat.h>
#define MakeDir(d) mkdir(d, 0755)
#endif

namespace ai_browser {

namespace {

std::string EscapeJsonString(const std::string& str) {
    std::ostringstream ss;
    for (char c : str) {
        switch (c) {
            case '"': ss << "\\\""; break;
            case '\\': ss << "\\\\"; break;
            case '\b': ss << "\\b"; break;
            case '\f': ss << "\\f"; break;
            case '\n': ss << "\\n"; break;
            case '\r': ss << "\\r"; break;
            case '\t': ss << "\\t"; break;
            default:
                if (static_cast<unsigned char>(c) < 0x20) {
                    char buf[8];
                    std::snprintf(buf, sizeof(buf), "\\u%04x", c);
                    ss << buf;
                } else {
                    ss << c;
                }
        }
    }
    return ss.str();
}

std::string ExtractJsonValue(const std::string& json, const std::string& key) {
    std::string needle = "\"" + key + "\":";
    size_t pos = json.find(needle);
    if (pos == std::string::npos) return "";

    pos += needle.length();
    while (pos < json.length() && (json[pos] == ' ' || json[pos] == '\t' || json[pos] == '\r' || json[pos] == '\n')) {
        pos++;
    }
    if (pos >= json.length()) return "";

    if (json[pos] == '"') {
        pos++;
        size_t end = pos;
        while (end < json.length() && json[end] != '"') {
            if (json[end] == '\\' && end + 1 < json.length()) end++;
            end++;
        }
        return json.substr(pos, end - pos);
    } else {
        size_t end = pos;
        while (end < json.length() && json[end] != ',' && json[end] != '}' && json[end] != ']' && json[end] != '\n' && json[end] != '\r') {
            end++;
        }
        return json.substr(pos, end - pos);
    }
}

} // namespace

SessionPersistenceManager::SessionPersistenceManager(const std::string& storage_directory)
    : storage_dir_(storage_directory.empty() ? "." : storage_directory) {
    if (!storage_dir_.empty() && storage_dir_ != ".") {
        MakeDir(storage_dir_.c_str());
    }
    session_file_path_ = storage_dir_ + "/session.json";
    session_tmp_path_ = storage_dir_ + "/session.json.tmp";
    lock_file_path_ = storage_dir_ + "/.session.lock";
}

SessionPersistenceManager::~SessionPersistenceManager() = default;

bool SessionPersistenceManager::InitializeAndCheckCrash() {
    std::lock_guard<std::mutex> lock(mutex_);

    // Check if lock file exists
    std::ifstream check_lock(lock_file_path_.c_str());
    if (check_lock.good()) {
        check_lock.close();
        was_unclean_shutdown_ = true;
    } else {
        was_unclean_shutdown_ = false;
    }

    // Create / touch the lock file to denote active session
    std::ofstream lock_file(lock_file_path_.c_str(), std::ios::trunc);
    if (lock_file.is_open()) {
        auto now = std::chrono::system_clock::now().time_since_epoch();
        lock_file << std::chrono::duration_cast<std::chrono::milliseconds>(now).count() << "\n";
        lock_file.close();
    }

    return was_unclean_shutdown_;
}

void SessionPersistenceManager::MarkCleanShutdown() {
    std::lock_guard<std::mutex> lock(mutex_);
    std::remove(lock_file_path_.c_str());
    was_unclean_shutdown_ = false;
}

bool SessionPersistenceManager::SaveSessionAtomic(const SessionManifest& manifest) {
    std::lock_guard<std::mutex> lock(mutex_);
    std::string json_str = SerializeToJson(manifest);

    // 1. Write to temporary file
    {
        std::ofstream tmp_file(session_tmp_path_.c_str(), std::ios::trunc);
        if (!tmp_file.is_open()) {
            return false;
        }
        tmp_file << json_str;
        tmp_file.flush();
        if (!tmp_file.good()) {
            tmp_file.close();
            std::remove(session_tmp_path_.c_str());
            return false;
        }
        tmp_file.close();
    }

    // 2. Atomic replace / rename
    std::remove(session_file_path_.c_str());
    int result = std::rename(session_tmp_path_.c_str(), session_file_path_.c_str());
    return result == 0;
}

std::optional<SessionManifest> SessionPersistenceManager::LoadSession() {
    std::lock_guard<std::mutex> lock(mutex_);
    std::ifstream file(session_file_path_.c_str());
    if (!file.is_open()) {
        return std::nullopt;
    }

    std::stringstream buffer;
    buffer << file.rdbuf();
    file.close();

    return DeserializeFromJson(buffer.str());
}

bool SessionPersistenceManager::HasSavedSession() const {
    std::lock_guard<std::mutex> lock(mutex_);
    std::ifstream file(session_file_path_.c_str());
    return file.good();
}

void SessionPersistenceManager::ClearSavedSession() {
    std::lock_guard<std::mutex> lock(mutex_);
    std::remove(session_file_path_.c_str());
    std::remove(session_tmp_path_.c_str());
}

std::string SessionPersistenceManager::SerializeToJson(const SessionManifest& manifest) {
    std::ostringstream ss;
    ss << "{\n";
    ss << "  \"active_tab_id\": " << manifest.active_tab_id << ",\n";
    ss << "  \"active_workspace_id\": \"" << EscapeJsonString(manifest.active_workspace_id) << "\",\n";
    ss << "  \"saved_at_epoch_ms\": " << manifest.saved_at_epoch_ms << ",\n";

    // Tabs array
    ss << "  \"tabs\": [\n";
    for (size_t i = 0; i < manifest.tabs.size(); ++i) {
        const auto& t = manifest.tabs[i];
        ss << "    {\n";
        ss << "      \"id\": " << t.id << ",\n";
        ss << "      \"index\": " << t.index << ",\n";
        ss << "      \"url\": \"" << EscapeJsonString(t.url) << "\",\n";
        ss << "      \"title\": \"" << EscapeJsonString(t.title) << "\",\n";
        ss << "      \"favicon_url\": \"" << EscapeJsonString(t.favicon_url) << "\",\n";
        ss << "      \"is_pinned\": " << (t.is_pinned ? "true" : "false") << ",\n";
        ss << "      \"is_muted\": " << (t.is_muted ? "true" : "false") << ",\n";
        ss << "      \"group_id\": \"" << EscapeJsonString(t.group_id) << "\",\n";
        ss << "      \"workspace_id\": \"" << EscapeJsonString(t.workspace_id) << "\",\n";
        ss << "      \"history_index\": " << t.history_index << ",\n";
        ss << "      \"scroll_x\": " << t.scroll_x << ",\n";
        ss << "      \"scroll_y\": " << t.scroll_y << ",\n";
        ss << "      \"history\": [";
        for (size_t h = 0; h < t.history.size(); ++h) {
            ss << "\"" << EscapeJsonString(t.history[h]) << "\"" << (h + 1 < t.history.size() ? ", " : "");
        }
        ss << "]\n";
        ss << "    }" << (i + 1 < manifest.tabs.size() ? ",\n" : "\n");
    }
    ss << "  ],\n";

    // Groups array
    ss << "  \"groups\": [\n";
    for (size_t i = 0; i < manifest.groups.size(); ++i) {
        const auto& g = manifest.groups[i];
        ss << "    {\n";
        ss << "      \"id\": \"" << EscapeJsonString(g.id) << "\",\n";
        ss << "      \"title\": \"" << EscapeJsonString(g.title) << "\",\n";
        ss << "      \"color_hex\": \"" << EscapeJsonString(g.color_hex) << "\",\n";
        ss << "      \"is_collapsed\": " << (g.is_collapsed ? "true" : "false") << ",\n";
        ss << "      \"tab_ids\": [";
        for (size_t ti = 0; ti < g.tab_ids.size(); ++ti) {
            ss << g.tab_ids[ti] << (ti + 1 < g.tab_ids.size() ? ", " : "");
        }
        ss << "]\n";
        ss << "    }" << (i + 1 < manifest.groups.size() ? ",\n" : "\n");
    }
    ss << "  ],\n";

    // Workspaces array
    ss << "  \"workspaces\": [\n";
    for (size_t i = 0; i < manifest.workspaces.size(); ++i) {
        const auto& w = manifest.workspaces[i];
        ss << "    {\n";
        ss << "      \"id\": \"" << EscapeJsonString(w.id) << "\",\n";
        ss << "      \"name\": \"" << EscapeJsonString(w.name) << "\",\n";
        ss << "      \"icon\": \"" << EscapeJsonString(w.icon) << "\",\n";
        ss << "      \"tab_ids\": [";
        for (size_t ti = 0; ti < w.tab_ids.size(); ++ti) {
            ss << w.tab_ids[ti] << (ti + 1 < w.tab_ids.size() ? ", " : "");
        }
        ss << "]\n";
        ss << "    }" << (i + 1 < manifest.workspaces.size() ? ",\n" : "\n");
    }
    ss << "  ],\n";

    // Undo stack array
    ss << "  \"undo_stack\": [\n";
    for (size_t i = 0; i < manifest.undo_stack.size(); ++i) {
        const auto& u = manifest.undo_stack[i];
        ss << "    {\n";
        ss << "      \"original_tab_id\": " << u.original_tab_id << ",\n";
        ss << "      \"url\": \"" << EscapeJsonString(u.url) << "\",\n";
        ss << "      \"title\": \"" << EscapeJsonString(u.title) << "\",\n";
        ss << "      \"is_pinned\": " << (u.is_pinned ? "true" : "false") << ",\n";
        ss << "      \"group_id\": \"" << EscapeJsonString(u.group_id) << "\",\n";
        ss << "      \"workspace_id\": \"" << EscapeJsonString(u.workspace_id) << "\"\n";
        ss << "    }" << (i + 1 < manifest.undo_stack.size() ? ",\n" : "\n");
    }
    ss << "  ]\n";
    ss << "}\n";

    return ss.str();
}

std::optional<SessionManifest> SessionPersistenceManager::DeserializeFromJson(const std::string& json_str) {
    if (json_str.empty()) return std::nullopt;

    SessionManifest manifest;

    std::string act_tab_str = ExtractJsonValue(json_str, "active_tab_id");
    if (!act_tab_str.empty()) manifest.active_tab_id = std::stoul(act_tab_str);

    std::string act_ws = ExtractJsonValue(json_str, "active_workspace_id");
    if (!act_ws.empty()) manifest.active_workspace_id = act_ws;

    std::string saved_time_str = ExtractJsonValue(json_str, "saved_at_epoch_ms");
    if (!saved_time_str.empty()) manifest.saved_at_epoch_ms = std::stoll(saved_time_str);

    // Parse tabs blocks
    size_t tabs_pos = json_str.find("\"tabs\":");
    if (tabs_pos != std::string::npos) {
        size_t open_bracket = json_str.find('[', tabs_pos);
        size_t close_bracket = json_str.find(']', open_bracket);
        if (open_bracket != std::string::npos && close_bracket != std::string::npos) {
            size_t cur = open_bracket + 1;
            while (cur < close_bracket) {
                size_t obj_start = json_str.find('{', cur);
                if (obj_start == std::string::npos || obj_start >= close_bracket) break;
                size_t obj_end = json_str.find('}', obj_start);
                if (obj_end == std::string::npos) break;

                std::string obj_str = json_str.substr(obj_start, obj_end - obj_start + 1);
                SessionTabRecord tab;
                std::string tid_s = ExtractJsonValue(obj_str, "id");
                if (!tid_s.empty()) tab.id = std::stoul(tid_s);
                tab.url = ExtractJsonValue(obj_str, "url");
                tab.title = ExtractJsonValue(obj_str, "title");
                tab.favicon_url = ExtractJsonValue(obj_str, "favicon_url");
                tab.group_id = ExtractJsonValue(obj_str, "group_id");
                tab.workspace_id = ExtractJsonValue(obj_str, "workspace_id");
                std::string pin_s = ExtractJsonValue(obj_str, "is_pinned");
                tab.is_pinned = (pin_s == "true");
                std::string mute_s = ExtractJsonValue(obj_str, "is_muted");
                tab.is_muted = (mute_s == "true");

                manifest.tabs.push_back(tab);
                cur = obj_end + 1;
            }
        }
    }

    // Parse groups blocks
    size_t groups_pos = json_str.find("\"groups\":");
    if (groups_pos != std::string::npos) {
        size_t open_bracket = json_str.find('[', groups_pos);
        size_t close_bracket = json_str.find(']', open_bracket);
        if (open_bracket != std::string::npos && close_bracket != std::string::npos) {
            size_t cur = open_bracket + 1;
            while (cur < close_bracket) {
                size_t obj_start = json_str.find('{', cur);
                if (obj_start == std::string::npos || obj_start >= close_bracket) break;
                size_t obj_end = json_str.find('}', obj_start);
                if (obj_end == std::string::npos) break;

                std::string obj_str = json_str.substr(obj_start, obj_end - obj_start + 1);
                SessionGroupRecord grp;
                grp.id = ExtractJsonValue(obj_str, "id");
                grp.title = ExtractJsonValue(obj_str, "title");
                grp.color_hex = ExtractJsonValue(obj_str, "color_hex");
                grp.is_collapsed = (ExtractJsonValue(obj_str, "is_collapsed") == "true");
                manifest.groups.push_back(grp);
                cur = obj_end + 1;
            }
        }
    }

    return manifest;
}

} // namespace ai_browser
