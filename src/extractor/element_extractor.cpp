#include "element_extractor.h"
#include <regex>
#include <algorithm>
#include <sstream>

namespace ai_browser {

namespace {

std::string ToLower(const std::string& str) {
    std::string lower = str;
    std::transform(lower.begin(), lower.end(), lower.begin(), [](unsigned char c) {
        return static_cast<char>(std::tolower(c));
    });
    return lower;
}

std::string ExtractAttr(const std::string& attrs, const std::string& key) {
    std::regex r(key + R"(=["']([^"']*)["'])", std::regex::icase);
    std::smatch m;
    if (std::regex_search(attrs, m, r)) {
        return m[1].str();
    }
    return "";
}

std::string CleanText(const std::string& raw) {
    std::string s = raw;
    s = std::regex_replace(s, std::regex(R"(\s+)"), " ");
    size_t first = s.find_first_not_of(" \t\n\r");
    if (first == std::string::npos) return "";
    size_t last = s.find_last_not_of(" \t\n\r");
    return s.substr(first, (last - first + 1));
}

} // namespace

ElementExtractor::ElementExtractor() = default;
ElementExtractor::~ElementExtractor() = default;

bool ElementExtractor::IsClickable(const std::string& tag, const std::string& role, const std::string& attrs) const {
    std::string t = ToLower(tag);
    std::string r = ToLower(role);
    std::string a = ToLower(attrs);

    if (t == "a" || t == "button") return true;
    if (r == "button" || r == "link" || r == "menuitem" || r == "checkbox" || r == "radio" || r == "tab") return true;
    if (a.find("onclick") != std::string::npos || a.find("cursor: pointer") != std::string::npos || a.find("cursor:pointer") != std::string::npos) return true;
    if (a.find("tabindex") != std::string::npos && a.find("tabindex=\"-1\"") == std::string::npos) return true;

    return false;
}

bool ElementExtractor::IsTypable(const std::string& tag, const std::string& role, const std::string& type_attr) const {
    std::string t = ToLower(tag);
    std::string r = ToLower(role);
    std::string typ = ToLower(type_attr);

    if (t == "textarea") return true;
    if (r == "textbox" || r == "searchbox") return true;
    if (t == "input") {
        if (typ != "button" && typ != "submit" && typ != "reset" && typ != "checkbox" && typ != "radio" && typ != "hidden") {
            return true;
        }
    }
    return false;
}

bool ElementExtractor::IsScrollable(const std::string& attrs) const {
    std::string a = ToLower(attrs);
    return a.find("overflow: auto") != std::string::npos ||
           a.find("overflow-y: auto") != std::string::npos ||
           a.find("overflow-y: scroll") != std::string::npos;
}

std::vector<InteractiveElement> ElementExtractor::ExtractElements(const std::string& html) {
    std::vector<InteractiveElement> elements;
    ElementId current_id = 1;

    // Pattern matching either opening/self-closing tags or closing tags:
    // 1. Closing tag: </tag>
    // 2. Opening tag: <tag attrs>(text_after)?
    std::regex token_regex(R"(<\s*(\/)?\s*([a-zA-Z0-9]+)\b([^>]*)>(?:([^<]*))?)", std::regex::icase);

    auto begin = std::sregex_iterator(html.begin(), html.end(), token_regex);
    auto end = std::sregex_iterator();

    int hidden_depth = 0;
    std::vector<bool> tag_was_hidden;
    double simulated_y = 50.0;

    for (auto it = begin; it != end; ++it) {
        std::smatch m = *it;
        bool is_closing = m[1].matched && m[1].str() == "/";
        std::string tag = ToLower(m[2].str());
        std::string attrs = m[3].str();
        std::string text_after = m[4].matched ? m[4].str() : "";

        // Void elements that never have closing tags
        bool is_void = (tag == "input" || tag == "img" || tag == "br" || tag == "hr" || tag == "meta");
        if (!attrs.empty() && attrs.back() == '/') {
            is_void = true;
        }

        if (is_closing) {
            if (!tag_was_hidden.empty()) {
                if (tag_was_hidden.back()) {
                    hidden_depth = std::max(0, hidden_depth - 1);
                }
                tag_was_hidden.pop_back();
            }
            continue;
        }

        // Opening tag: check if it hides its children
        std::string aria_hidden = ExtractAttr(attrs, "aria-hidden");
        std::string style = ToLower(ExtractAttr(attrs, "style"));
        bool this_tag_hides = (aria_hidden == "true" ||
                               style.find("display: none") != std::string::npos ||
                               style.find("display:none") != std::string::npos ||
                               style.find("visibility: hidden") != std::string::npos ||
                               style.find("visibility:hidden") != std::string::npos);

        if (!is_void) {
            tag_was_hidden.push_back(this_tag_hides);
            if (this_tag_hides) {
                hidden_depth++;
            }
        }

        // Skip if inside a hidden container or this tag itself is hidden
        if (hidden_depth > 0 || this_tag_hides) {
            continue;
        }

        std::string role = ExtractAttr(attrs, "role");
        std::string type_attr = ExtractAttr(attrs, "type");
        std::string aria_label = ExtractAttr(attrs, "aria-label");
        std::string title = ExtractAttr(attrs, "title");
        std::string placeholder = ExtractAttr(attrs, "placeholder");
        std::string id_attr = ExtractAttr(attrs, "id");

        bool clickable = IsClickable(tag, role, attrs);
        bool typable = IsTypable(tag, role, type_attr);
        bool scrollable = IsScrollable(attrs);

        if (!clickable && !typable && !scrollable) {
            continue;
        }

        InteractiveElement el;
        el.id = current_id++;
        el.backend_node_id = 1000 + el.id;
        el.tag = tag;
        el.role = !role.empty() ? role : (typable ? "textbox" : (clickable ? (tag == "a" ? "link" : "button") : "container"));
        el.placeholder = placeholder;
        el.input_type = type_attr;
        el.is_clickable = clickable;
        el.is_typable = typable;
        el.is_scrollable = scrollable;

        if (!aria_label.empty()) {
            el.name = aria_label;
        } else if (!title.empty()) {
            el.name = title;
        } else if (!placeholder.empty()) {
            el.name = placeholder;
        } else if (!text_after.empty()) {
            el.name = CleanText(text_after);
        } else if (!id_attr.empty()) {
            el.name = id_attr;
        } else {
            el.name = el.role;
        }

        el.rect.x = 80.0;
        el.rect.y = simulated_y;
        el.rect.width = typable ? 220.0 : 140.0;
        el.rect.height = 36.0;
        el.center.x = el.rect.x + el.rect.width / 2.0;
        el.center.y = el.rect.y + el.rect.height / 2.0;

        simulated_y += 48.0;
        elements.push_back(el);
    }

    return elements;
}

std::string ElementExtractor::GetClientInjectionScript() {
    return R"JS((function() {
    if (window.__ai_element_extractor_installed) return;
    window.__ai_element_extractor_installed = true;

    window.__extractInteractiveElements = function() {
        const interactiveSelectors = [
            'a[href]', 'button', 'input:not([type="hidden"])', 'textarea', 'select',
            '[role="button"]', '[role="link"]', '[role="textbox"]', '[role="checkbox"]',
            '[tabindex]:not([tabindex="-1"])', '[onclick]'
        ];
        const nodes = Array.from(document.querySelectorAll(interactiveSelectors.join(',')));
        let idCounter = 1;
        const results = [];

        for (const node of nodes) {
            const rect = node.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) continue;
            const style = window.getComputedStyle(node);
            if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') continue;

            const name = node.getAttribute('aria-label') || node.getAttribute('title') || node.getAttribute('placeholder') || node.innerText || '';
            const role = node.getAttribute('role') || node.tagName.toLowerCase();

            results.push({
                id: idCounter++,
                tag: node.tagName,
                role: role,
                name: name.trim().slice(0, 100),
                rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                center: { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
            });
        }
        return results;
    };
})();)JS";
}

} // namespace ai_browser
