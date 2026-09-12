#pragma once

#include "agent_types.h"
#include <string>
#include <vector>

namespace ai_browser {

// Hybrid DOM & Accessibility Tree Extractor
// Traverses markup, filters down to actionable nodes, prunes hidden/empty rects, and assigns monotonic IDs
class ElementExtractor {
public:
    ElementExtractor();
    ~ElementExtractor();

    // Extracts interactive elements from serialized HTML and layout hints
    std::vector<InteractiveElement> ExtractElements(const std::string& html);

    // Filter helpers
    bool IsClickable(const std::string& tag, const std::string& role, const std::string& attrs) const;
    bool IsTypable(const std::string& tag, const std::string& role, const std::string& type_attr) const;
    bool IsScrollable(const std::string& attrs) const;

    // Generates the isolated-world JS injection script used for live in-page DOM traversal
    static std::string GetClientInjectionScript();
};

} // namespace ai_browser
