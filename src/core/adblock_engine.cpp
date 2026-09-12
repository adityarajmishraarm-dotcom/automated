#include "adblock_engine.h"
#include <algorithm>
#include <sstream>

namespace ai_browser {

namespace {

std::string ExtractDomain(const std::string& url) {
    size_t start = url.find("://");
    if (start == std::string::npos) start = 0;
    else start += 3;

    size_t end = url.find('/', start);
    if (end == std::string::npos) end = url.find('?', start);
    if (end == std::string::npos) end = url.length();

    return url.substr(start, end - start);
}

} // namespace

AdblockEngine::AdblockEngine() {
    LoadDefaultRuleSets();
}

AdblockEngine::~AdblockEngine() = default;

void AdblockEngine::LoadDefaultRuleSets() {
    // EasyList & EasyPrivacy representative ad/tracker domains
    std::vector<std::string> default_domains = {
        "doubleclick.net",
        "google-analytics.com",
        "googlesyndication.com",
        "adnxs.com",
        "criteo.com",
        "adroll.com",
        "scorecardresearch.com",
        "quantserve.com",
        "hotjar.com",
        "facebook.com/tr",
        "amazon-adsystem.com",
        "outbrain.com",
        "taboola.com"
    };

    for (const auto& domain : default_domains) {
        blocked_domains_.insert(domain);
    }

    // Pattern & path rules
    blocked_patterns_.push_back("/ads.js");
    blocked_patterns_.push_back("/prebid.js");
    blocked_patterns_.push_back("/gtag/js");
    blocked_patterns_.push_back("/analytics.js");
    blocked_patterns_.push_back("&ad_type=");
    blocked_patterns_.push_back("/ad-server/");
    blocked_patterns_.push_back("banner-ad");

    // Cosmetic filter selectors for anti-adblock banners and cookie overlays
    cosmetic_selectors_.push_back(".ad-container");
    cosmetic_selectors_.push_back(".ad-banner");
    cosmetic_selectors_.push_back(".cookie-banner");
    cosmetic_selectors_.push_back("#cookie-notice");
    cosmetic_selectors_.push_back(".anti-adblock-modal");
    cosmetic_selectors_.push_back("[class*='sponsor-card']");
}

void AdblockEngine::AddRule(const std::string& rule_pattern) {
    if (rule_pattern.find('/') == std::string::npos && rule_pattern.find('.') != std::string::npos) {
        blocked_domains_.insert(rule_pattern);
    } else {
        blocked_patterns_.push_back(rule_pattern);
    }
}

bool AdblockEngine::ShouldBlockRequest(const std::string& url, const std::string& resource_type) const {
    std::string domain = ExtractDomain(url);

    // Check exact or subdomain match
    for (const auto& blocked_domain : blocked_domains_) {
        if (domain == blocked_domain ||
            (domain.length() > blocked_domain.length() &&
             domain.compare(domain.length() - blocked_domain.length() - 1, blocked_domain.length() + 1, "." + blocked_domain) == 0)) {
            return true;
        }
    }

    // Check pattern rules
    for (const auto& pattern : blocked_patterns_) {
        if (url.find(pattern) != std::string::npos) {
            return true;
        }
    }

    return false;
}

std::string AdblockEngine::GenerateCosmeticStyles() const {
    std::ostringstream ss;
    for (size_t i = 0; i < cosmetic_selectors_.size(); ++i) {
        ss << cosmetic_selectors_[i];
        if (i + 1 < cosmetic_selectors_.size()) ss << ", ";
    }
    ss << " { display: none !important; opacity: 0 !important; pointer-events: none !important; }\n";
    return ss.str();
}

} // namespace ai_browser
