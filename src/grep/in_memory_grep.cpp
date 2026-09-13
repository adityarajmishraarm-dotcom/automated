#include "in_memory_grep.h"
#include <sstream>
#include <regex>
#include <algorithm>

namespace ai_browser {

InMemoryGrep::InMemoryGrep() = default;
InMemoryGrep::~InMemoryGrep() = default;

std::vector<std::string> InMemoryGrep::SplitLines(const std::string& text) const {
    std::vector<std::string> lines;
    std::stringstream ss(text);
    std::string line;
    while (std::getline(ss, line)) {
        // Strip trailing \r if present
        if (!line.empty() && line.back() == '\r') {
            line.pop_back();
        }
        lines.push_back(line);
    }
    return lines;
}

GrepResult InMemoryGrep::Search(const std::string& source_code,
                                const std::string& query,
                                size_t offset,
                                size_t limit,
                                bool is_regex) const {
    GrepResult result;
    result.query = query;
    result.current_offset = offset;

    if (query.empty() || source_code.empty()) {
        return result;
    }

    std::vector<std::string> lines = SplitLines(source_code);
    std::unique_ptr<std::regex> regex_matcher;
    if (is_regex) {
        try {
            regex_matcher = std::make_unique<std::regex>(query, std::regex_constants::icase);
        } catch (...) {
            return result; // Invalid regex
        }
    }

    // Pass 1: Identify all line matches
    std::vector<size_t> matched_line_indices;
    for (size_t i = 0; i < lines.size(); ++i) {
        bool is_match = false;
        if (is_regex && regex_matcher) {
            is_match = std::regex_search(lines[i], *regex_matcher);
        } else {
            // Case-insensitive substring match
            auto it = std::search(
                lines[i].begin(), lines[i].end(),
                query.begin(), query.end(),
                [](char ch1, char ch2) { return std::tolower(ch1) == std::tolower(ch2); }
            );
            is_match = (it != lines[i].end());
        }

        if (is_match) {
            matched_line_indices.push_back(i);
        }
    }

    result.total_matches = matched_line_indices.size();

    // Pass 2: Extract paginated slice (offset .. offset + limit)
    size_t start = std::min(offset, matched_line_indices.size());
    size_t end = std::min(start + limit, matched_line_indices.size());

    for (size_t m_idx = start; m_idx < end; ++m_idx) {
        size_t line_idx = matched_line_indices[m_idx];

        GrepMatch match;
        match.line_number = line_idx + 1; // 1-based line number
        match.matched_line = lines[line_idx];

        // Extract Top 10 lines
        size_t top_start = (line_idx >= 10) ? (line_idx - 10) : 0;
        for (size_t t = top_start; t < line_idx; ++t) {
            match.top_10_lines.push_back(lines[t]);
        }

        // Extract Bottom 10 lines
        size_t bottom_end = std::min(line_idx + 11, lines.size());
        for (size_t b = line_idx + 1; b < bottom_end; ++b) {
            match.bottom_10_lines.push_back(lines[b]);
        }

        result.matches.push_back(std::move(match));
    }

    result.returned_count = result.matches.size();
    result.has_more = (end < matched_line_indices.size());
    result.next_offset = result.has_more ? end : 0;

    return result;
}

std::optional<GrepMatch> InMemoryGrep::GetMatchByIndex(const std::string& source_code,
                                                      const std::string& query,
                                                      size_t target_match_index,
                                                      bool is_regex) const {
    if (target_match_index == 0) return std::nullopt;
    // 1-based index converted to 0-based offset
    GrepResult res = Search(source_code, query, target_match_index - 1, 1, is_regex);
    if (!res.matches.empty()) {
        return res.matches.front();
    }
    return std::nullopt;
}

std::string InMemoryGrep::FormatMarkdown(const GrepResult& result) const {
    std::ostringstream ss;
    ss << "### Grep Results for: '" << result.query << "'\n";
    ss << "Total Matches Found: " << result.total_matches
       << " | Showing: " << (result.current_offset + 1)
       << " to " << (result.current_offset + result.returned_count) << "\n";

    if (result.has_more) {
        ss << "> **Note:** More matches exist. Query next page using offset="
           << result.next_offset << " or get_grep_match(index).\n\n";
    } else {
        ss << "\n";
    }

    for (size_t i = 0; i < result.matches.size(); ++i) {
        const auto& m = result.matches[i];
        size_t match_num = result.current_offset + i + 1;
        ss << "#### Match #" << match_num << " [Line " << m.line_number << "]:\n```html\n";

        // Top 10 lines
        size_t top_line_start = (m.line_number > m.top_10_lines.size()) ? (m.line_number - m.top_10_lines.size()) : 1;
        for (size_t j = 0; j < m.top_10_lines.size(); ++j) {
            ss << (top_line_start + j) << ": " << m.top_10_lines[j] << "\n";
        }

        // Matched line
        ss << ">>> " << m.line_number << ": " << m.matched_line << "\n";

        // Bottom 10 lines
        for (size_t k = 0; k < m.bottom_10_lines.size(); ++k) {
            ss << (m.line_number + 1 + k) << ": " << m.bottom_10_lines[k] << "\n";
        }

        ss << "```\n\n";
    }

    return ss.str();
}

} // namespace ai_browser
