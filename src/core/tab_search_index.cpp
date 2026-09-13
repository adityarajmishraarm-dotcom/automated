#include "tab_search_index.h"
#include <cctype>
#include <cmath>

namespace ai_browser {

namespace {

std::string ToLower(const std::string& s) {
    std::string result = s;
    std::transform(result.begin(), result.end(), result.begin(),
                   [](unsigned char c) { return std::tolower(c); });
    return result;
}

} // namespace

TabSearchIndex::TabSearchIndex() = default;
TabSearchIndex::~TabSearchIndex() = default;

void TabSearchIndex::IndexTab(const TabSearchRecord& record) {
    std::lock_guard<std::mutex> lock(mutex_);
    records_[record.tab_id] = record;
}

void TabSearchIndex::UpdateTitle(TabId tab_id, const std::string& title) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = records_.find(tab_id);
    if (it != records_.end()) {
        it->second.title = title;
    }
}

void TabSearchIndex::UpdateURL(TabId tab_id, const std::string& url) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = records_.find(tab_id);
    if (it != records_.end()) {
        it->second.url = url;
    }
}

void TabSearchIndex::UpdateSnippet(TabId tab_id, const std::string& snippet) {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = records_.find(tab_id);
    if (it != records_.end()) {
        it->second.text_snippet = snippet;
    }
}

void TabSearchIndex::RemoveTab(TabId tab_id) {
    std::lock_guard<std::mutex> lock(mutex_);
    records_.erase(tab_id);
}

void TabSearchIndex::Clear() {
    std::lock_guard<std::mutex> lock(mutex_);
    records_.clear();
}

size_t TabSearchIndex::GetIndexedCount() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return records_.size();
}

double TabSearchIndex::ComputeFuzzyScore(const std::string& pattern, const std::string& text) {
    if (pattern.empty() || text.empty()) return 0.0;

    std::string pat_lower = ToLower(pattern);
    std::string txt_lower = ToLower(text);

    // Exact match bonus
    if (txt_lower == pat_lower) return 100.0;

    // Substring match bonus
    size_t sub_pos = txt_lower.find(pat_lower);
    if (sub_pos != std::string::npos) {
        double score = 50.0 + (50.0 / (1.0 + static_cast<double>(sub_pos)));
        return score;
    }

    // Subsequence fuzzy match
    size_t pat_idx = 0;
    double score = 0.0;
    int consecutive_matches = 0;
    size_t first_match_idx = 0;

    for (size_t i = 0; i < txt_lower.length() && pat_idx < pat_lower.length(); ++i) {
        if (txt_lower[i] == pat_lower[pat_idx]) {
            if (pat_idx == 0) first_match_idx = i;
            pat_idx++;
            consecutive_matches++;

            // Base match score
            score += 5.0;

            // Consecutive match bonus
            score += consecutive_matches * 3.0;

            // Word boundary bonus (following space, slash, dot, dash, underscore)
            if (i == 0 || txt_lower[i - 1] == ' ' || txt_lower[i - 1] == '/' ||
                txt_lower[i - 1] == '.' || txt_lower[i - 1] == '-' || txt_lower[i - 1] == '_') {
                score += 10.0;
            }
        } else {
            consecutive_matches = 0;
        }
    }

    // Did not match all pattern characters
    if (pat_idx < pat_lower.length()) {
        return 0.0;
    }

    // Penalty for distance of first match from beginning
    score -= first_match_idx * 0.5;

    // Length ratio normalizer
    double length_ratio = static_cast<double>(pat_lower.length()) / static_cast<double>(txt_lower.length());
    score *= (0.5 + 0.5 * length_ratio);

    return std::max(1.0, score);
}

std::vector<TabSearchResult> TabSearchIndex::Search(const std::string& query, size_t max_results, const WorkspaceId& workspace_filter) const {
    std::lock_guard<std::mutex> lock(mutex_);
    std::vector<TabSearchResult> results;
    if (query.empty() || records_.empty()) return results;

    for (const auto& kv : records_) {
        const auto& rec = kv.second;
        if (!workspace_filter.empty() && rec.workspace_id != workspace_filter) {
            continue;
        }

        double title_score = ComputeFuzzyScore(query, rec.title);
        double url_score = ComputeFuzzyScore(query, rec.url) * 0.8; // slight penalty for url
        double snippet_score = ComputeFuzzyScore(query, rec.text_snippet) * 0.5;

        double best_score = title_score;
        MatchField best_field = MatchField::kTitle;

        if (url_score > best_score) {
            best_score = url_score;
            best_field = MatchField::kUrl;
        }
        if (snippet_score > best_score) {
            best_score = snippet_score;
            best_field = MatchField::kSnippet;
        }

        if (best_score > 0.0) {
            TabSearchResult item;
            item.tab_id = rec.tab_id;
            item.window_id = rec.window_id;
            item.title = rec.title;
            item.url = rec.url;
            item.score = best_score;
            item.matched_field = best_field;
            results.push_back(item);
        }
    }

    std::sort(results.begin(), results.end(), [](const TabSearchResult& a, const TabSearchResult& b) {
        return a.score > b.score;
    });

    if (results.size() > max_results) {
        results.resize(max_results);
    }

    return results;
}

} // namespace ai_browser
