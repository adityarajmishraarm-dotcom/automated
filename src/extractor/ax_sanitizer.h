#pragma once

#include "agent_types.h"
#include <string>
#include <vector>

namespace ai_browser {

// AX-Tree Sanitizer: formats interactive elements into compact, token-efficient Markdown (<3k tokens)
class AXSanitizer {
public:
    AXSanitizer();
    ~AXSanitizer();

    // Converts page metadata and extracted elements into clean Markdown
    std::string GenerateMarkdown(const std::string& page_title,
                                 const std::string& page_url,
                                 uint32_t active_tab_id,
                                 const std::vector<InteractiveElement>& elements) const;

    // Strips large binary payloads, svg markup, scripts, and styles from raw HTML
    std::string SanitizeRawHTML(const std::string& raw_html) const;
};

} // namespace ai_browser
