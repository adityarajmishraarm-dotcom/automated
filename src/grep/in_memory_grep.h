#pragma once

#include "agent_types.h"
#include <string>
#include <vector>

namespace ai_browser {

// In-Memory Source Code Grep Engine
// Performs fast pattern/regex matching with ±10 context lines (top 10 & bottom 10)
// and full pagination support for 10+ results
class InMemoryGrep {
public:
    InMemoryGrep();
    ~InMemoryGrep();

    // Searches the document source lines with pagination
    GrepResult Search(const std::string& source_code,
                      const std::string& query,
                      size_t offset = 0,
                      size_t limit = 10,
                      bool is_regex = false) const;

    // Direct retrieval of a specific match by 1-based index (e.g. match #15)
    std::optional<GrepMatch> GetMatchByIndex(const std::string& source_code,
                                             const std::string& query,
                                             size_t target_match_index,
                                             bool is_regex = false) const;

    // Formats a GrepResult into a clean, context-safe Markdown string for the AI agent
    std::string FormatMarkdown(const GrepResult& result) const;

private:
    std::vector<std::string> SplitLines(const std::string& text) const;
};

} // namespace ai_browser
