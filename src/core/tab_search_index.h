#pragma once

#include "tab_event_bus.h"
#include <string>
#include <vector>
#include <map>
#include "mutex_compat.h"
#include <algorithm>

namespace ai_browser {

enum class MatchField {
    kTitle,
    kUrl,
    kSnippet
};

struct TabSearchRecord {
    TabId tab_id = 0;
    WindowId window_id = 1;
    std::string title;
    std::string url;
    std::string text_snippet;
    bool is_pinned = false;
    bool is_muted = false;
    WorkspaceId workspace_id = "default";
};

struct TabSearchResult {
    TabId tab_id = 0;
    WindowId window_id = 1;
    std::string title;
    std::string url;
    double score = 0.0;
    MatchField matched_field = MatchField::kTitle;
};

// Global in-memory search indexer with fast fuzzy string matching
class TabSearchIndex {
public:
    TabSearchIndex();
    ~TabSearchIndex();

    // Index mutations
    void IndexTab(const TabSearchRecord& record);
    void UpdateTitle(TabId tab_id, const std::string& title);
    void UpdateURL(TabId tab_id, const std::string& url);
    void UpdateSnippet(TabId tab_id, const std::string& snippet);
    void RemoveTab(TabId tab_id);
    void Clear();

    // Fuzzy Search: returns matches ranked by descending score
    std::vector<TabSearchResult> Search(const std::string& query, size_t max_results = 10, const WorkspaceId& workspace_filter = "") const;

    // Fuzzy scoring algorithm (subsequence matching with word-boundary and prefix weighting)
    static double ComputeFuzzyScore(const std::string& pattern, const std::string& text);

    size_t GetIndexedCount() const;

private:
    mutable std::mutex mutex_;
    std::map<TabId, TabSearchRecord> records_;
};

} // namespace ai_browser
