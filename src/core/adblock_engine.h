#pragma once

#include <string>
#include <vector>
#include <unordered_set>

namespace ai_browser {

// In-process adblock engine emulating Brave's adblock-rust filter matching
class AdblockEngine {
public:
    AdblockEngine();
    ~AdblockEngine();

    // Loads standard EasyList, EasyPrivacy, and uBlock Origin rule sets
    void LoadDefaultRuleSets();

    // Adds a custom rule (domain rule, path rule, or regex pattern)
    void AddRule(const std::string& rule_pattern);

    // Checks if a network request should be blocked before hitting the wire (0-byte cancel)
    bool ShouldBlockRequest(const std::string& url, const std::string& resource_type = "script") const;

    // Generates cosmetic CSS injection string (display: none !important) for anti-adblock banners and cookie popups
    std::string GenerateCosmeticStyles(const std::string& url = "") const;

    // Generates universal in-page scriptlet for HTML5 video ad skipping and player response sanitization
    std::string GenerateInPageScriptlet() const;

    size_t GetRuleCount() const { return blocked_domains_.size() + blocked_patterns_.size(); }

private:
    std::unordered_set<std::string> blocked_domains_;
    std::vector<std::string> blocked_patterns_;
    std::vector<std::string> cosmetic_selectors_;
    std::vector<std::string> exception_rules_;
};

} // namespace ai_browser
