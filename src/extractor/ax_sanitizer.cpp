#include "ax_sanitizer.h"
#include <sstream>
#include <regex>

namespace ai_browser {

AXSanitizer::AXSanitizer() = default;
AXSanitizer::~AXSanitizer() = default;

std::string AXSanitizer::GenerateMarkdown(const std::string& page_title,
                                         const std::string& page_url,
                                         uint32_t active_tab_id,
                                         const std::vector<InteractiveElement>& elements) const {
    std::ostringstream ss;
    ss << "## Current Page: " << (page_title.empty() ? "Untitled" : page_title)
       << " (" << (page_url.empty() ? "about:blank" : page_url) << ")\n";
    ss << "Active Tab ID: " << active_tab_id << " | Viewport: 1280x800\n\n";
    ss << "### Interactive Elements (" << elements.size() << " actionable items):\n";

    if (elements.empty()) {
        ss << "(No interactive elements detected)\n";
        return ss.str();
    }

    for (const auto& el : elements) {
        ss << "[#" << el.id << "] " << el.role << ": \"" << el.name << "\"";
        if (!el.placeholder.empty()) {
            ss << " (placeholder: \"" << el.placeholder << "\")";
        }
        if (!el.input_type.empty() && el.input_type != "text") {
            ss << " [type=" << el.input_type << "]";
        }
        if (el.is_scrollable) {
            ss << " [scrollable]";
        }
        ss << "\n";
    }

    return ss.str();
}

std::string AXSanitizer::SanitizeRawHTML(const std::string& raw_html) const {
    std::string s = raw_html;
    // Strip <script>...</script>
    s = std::regex_replace(s, std::regex(R"(<script\b[^>]*>[\s\S]*?<\/script>)", std::regex::icase), "");
    // Strip <style>...</style>
    s = std::regex_replace(s, std::regex(R"(<style\b[^>]*>[\s\S]*?<\/style>)", std::regex::icase), "");
    // Strip <svg>...</svg>
    s = std::regex_replace(s, std::regex(R"(<svg\b[^>]*>[\s\S]*?<\/svg>)", std::regex::icase), "<svg-stripped/>");
    // Strip <noscript>...</noscript>
    s = std::regex_replace(s, std::regex(R"(<noscript\b[^>]*>[\s\S]*?<\/noscript>)", std::regex::icase), "");
    // Strip HTML comments
    s = std::regex_replace(s, std::regex(R"(<!--[\s\S]*?-->)"), "");

    return s;
}

} // namespace ai_browser
