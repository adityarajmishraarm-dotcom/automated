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
    // 1. EasyList & EasyPrivacy Core Ad / Tracker Domains
    std::vector<std::string> default_domains = {
        // Google & DoubleClick Ad Ecosystem
        "doubleclick.net",
        "google-analytics.com",
        "googlesyndication.com",
        "googletagservices.com",
        "googletagmanager.com",
        "googleadservices.com",
        "pagead2.googlesyndication.com",
        "ade.googlesyndication.com",
        "googleads.g.doubleclick.net",
        "static.doubleclick.net",
        "adservice.google.com",

        // Major Ad Exchanges & SSPs
        "adnxs.com",
        "criteo.com",
        "adroll.com",
        "scorecardresearch.com",
        "quantserve.com",
        "amazon-adsystem.com",
        "outbrain.com",
        "taboola.com",
        "moatads.com",
        "rubiconproject.com",
        "pubmatic.com",
        "openx.net",
        "casalemedia.com",
        "bidswitch.net",
        "smartadserver.com",
        "yieldmo.com",
        "triplelift.com",
        "sonobi.com",
        "sharethrough.com",
        "infolinks.com",

        // Telemetry & Social Tracking Pixels
        "hotjar.com",
        "facebook.com/tr",
        "connect.facebook.net",
        "analytics.twitter.com",
        "static.ads-twitter.com",
        "ads-twitter.com",
        "bat.bing.com",
        "clarity.ms",
        "segment.io",
        "segment.com",
        "mixpanel.com",
        "amplitude.com",
        "newrelic.com",
        "nr-data.net",
        "mouseflow.com",
        "crazyegg.com",
        "fullstory.com",
        "inspectlet.com",
        "branch.io",
        "appsflyer.com",
        "adjust.com",

        // Video & Native Ad Delivery
        "imasdk.googleapis.com",
        "innovid.com",
        "spotxchange.com",
        "teads.tv",
        "springserve.com",
        "aniview.com",
        "connatix.com",

        // Popunder, Shady Redirect & Piracy Ad Networks
        "popads.net", "popcash.net", "propellerads.com", "propellerclick.com", "adcash.com",
        "exoclick.com", "juicyads.com", "trafficjunky.com", "hilltopads.net", "monetag.com",
        "clickadu.com", "adsterra.com", "richpush.co", "onclickmega.com", "onclickbright.com",
        "onclickperformance.com", "ad-maven.com", "evadav.com", "rollerads.com", "galaksion.com",
        "trafficstars.com", "zeropark.com", "yadro.ru", "deloton.com", "creative.mybestmv.life",
        "topcreativeformat.com", "highperformancecpmgate.com", "profitablegatecpm.com",
        "llvpn.com", "adsboosters.xyz", "recrampwiped.com", "alwingulla.com", "thubanoa.com",
        "whomeeno.com", "vemtoutcheeg.com", "oikwocla.com", "m2pub.com", "vdo.ai",
        "streamrail.com", "mgid.com", "revcontent.com", "adpushup.com", "ezoic.com", "adkeep.com",

        // Shady Betting / Gambling / Crypto Banners
        "stake.com", "stake.bet", "stake.games", "1xbet.com", "bet365.com", "parimatch.com",
        "mostbet.com", "melbet.com", "bc.game", "dafabet.com",

        // Push Notification Spammers & Telemetry
        "pushground.com", "truepush.com", "pushassist.com", "notix.co", "webpushr.com",
        "subscribers.com", "cloudflareinsights.com", "static.cloudflareinsights.com"
    };

    for (const auto& domain : default_domains) {
        blocked_domains_.insert(domain);
    }

    // 2. Pattern & URL Endpoint Rules (Generic + Media Platforms)
    blocked_patterns_.push_back("/ads.js");
    blocked_patterns_.push_back("/prebid.js");
    blocked_patterns_.push_back("/gtag/js");
    blocked_patterns_.push_back("/analytics.js");
    blocked_patterns_.push_back("&ad_type=");
    blocked_patterns_.push_back("/ad-server/");
    blocked_patterns_.push_back("banner-ad");
    blocked_patterns_.push_back("/pagead/");
    blocked_patterns_.push_back("/pixel.gif");
    blocked_patterns_.push_back("/telemetry");
    blocked_patterns_.push_back("/beacon");
    blocked_patterns_.push_back("doubleclick");
    blocked_patterns_.push_back("popunder");
    blocked_patterns_.push_back("pop-under");
    blocked_patterns_.push_back("onclick");
    blocked_patterns_.push_back("cpmgate");
    blocked_patterns_.push_back("zone_id=");
    blocked_patterns_.push_back("banner_id=");
    blocked_patterns_.push_back("direct-link");
    blocked_patterns_.push_back("monetag");
    blocked_patterns_.push_back("propeller");
    blocked_patterns_.push_back("exoclick");
    blocked_patterns_.push_back("adcash");
    blocked_patterns_.push_back("emqsd=");
    blocked_patterns_.push_back("recrampwiped");
    blocked_patterns_.push_back("adsboosters");
    blocked_patterns_.push_back("llvpn");
    blocked_patterns_.push_back("tag.min.js");
    blocked_patterns_.push_back("AdsCoreLoader");
    blocked_patterns_.push_back("dataset.zone");
    blocked_patterns_.push_back("cloudflareinsights.com");
    blocked_patterns_.push_back("beacon.min.js");
    blocked_patterns_.push_back("youtube.com/api/stats/ads");
    blocked_patterns_.push_back("youtube.com/pagead/");
    blocked_patterns_.push_back("youtube.com/ptracking");
    blocked_patterns_.push_back("youtube.com/get_midroll_info");
    blocked_patterns_.push_back("youtube.com/api/stats/playback?*adformat*");
    blocked_patterns_.push_back("youtube.com/api/stats/qoe?*adformat*");
    blocked_patterns_.push_back("youtube.com/api/stats/watchtime?*adformat*");
    blocked_patterns_.push_back("youtube.com/youtubei/v1/log_event");
    blocked_patterns_.push_back("youtube.com/youtubei/v1/att/");
    blocked_patterns_.push_back("ade.googlesyndication.com");
    blocked_patterns_.push_back("pagead2.googlesyndication.com");
    blocked_patterns_.push_back("googleads.g.doubleclick.net");
    blocked_patterns_.push_back("securepubads.g.doubleclick.net");
    blocked_patterns_.push_back("adservice.google.");
    blocked_patterns_.push_back("play.google.com/log");

    // 3. Universal Cosmetic Filter Selectors (Banners, Modals & Video Player Overlays)
    cosmetic_selectors_.push_back(".ad-container");
    cosmetic_selectors_.push_back(".ad-wrapper");
    cosmetic_selectors_.push_back(".ad-banner");
    cosmetic_selectors_.push_back(".advertisement");
    cosmetic_selectors_.push_back(".adsbygoogle");
    cosmetic_selectors_.push_back("[class*='sponsor-card']");
    cosmetic_selectors_.push_back("[id^='google_ads_']");
    cosmetic_selectors_.push_back("div[data-ad]");
    cosmetic_selectors_.push_back(".cookie-banner");
    cosmetic_selectors_.push_back("#cookie-notice");
    cosmetic_selectors_.push_back(".anti-adblock-modal");

    // Fake VPN, Protection & Scam Dialogs
    cosmetic_selectors_.push_back("[class*='vpn']");
    cosmetic_selectors_.push_back("[id*='vpn']");
    cosmetic_selectors_.push_back("[class*='protection']");
    cosmetic_selectors_.push_back("[id*='protection']");
    cosmetic_selectors_.push_back("[class*='fake-alert']");
    cosmetic_selectors_.push_back("[class*='warning-box']");
    cosmetic_selectors_.push_back("[class*='alert-card']");
    cosmetic_selectors_.push_back("[id^='AdsCoreLoader']");
    cosmetic_selectors_.push_back("div[id^='AdsCoreLoader']");

    // Floating, Sticky & Popunder Overlays
    cosmetic_selectors_.push_back("div[class*='floating-ad']");
    cosmetic_selectors_.push_back("div[class*='sticky-ad']");
    cosmetic_selectors_.push_back("div[class*='popunder']");
    cosmetic_selectors_.push_back("[id*='popunder']");
    cosmetic_selectors_.push_back("[class*='bottom-banner']");
    cosmetic_selectors_.push_back("[id*='bottom-banner']");
    cosmetic_selectors_.push_back("div[class*='bottom-fixed']");
    cosmetic_selectors_.push_back("div[class*='ad-fixed-bottom']");
    cosmetic_selectors_.push_back("div[class*='fixed-bottom']");

    // Gambling / Stake / Betting Banners
    cosmetic_selectors_.push_back("[class*='stake']");
    cosmetic_selectors_.push_back("[id*='stake']");
    cosmetic_selectors_.push_back("a[href*='stake.com']");
    cosmetic_selectors_.push_back("a[href*='1xbet']");
    cosmetic_selectors_.push_back("a[href*='bet365']");
    cosmetic_selectors_.push_back("a[href*='parimatch']");
    cosmetic_selectors_.push_back("div:has(> a[href*='stake'])");
    cosmetic_selectors_.push_back("div:has(> a[href*='bet'])");

    // Push Prompts & Floating Ads
    cosmetic_selectors_.push_back("[class*='push-prompt']");
    cosmetic_selectors_.push_back("[id*='push-prompt']");
    cosmetic_selectors_.push_back("[class*='toast-banner']");
    cosmetic_selectors_.push_back("div[id^='ad-']");
    cosmetic_selectors_.push_back("div[class^='ad-']");
    cosmetic_selectors_.push_back("div[class*='banner-container']");
    cosmetic_selectors_.push_back("div[id*='banner-container']");

    // Media & Video Ad Selectors (YouTube, Twitch, Streaming)
    cosmetic_selectors_.push_back(".ytp-ad-module");
    cosmetic_selectors_.push_back(".ytp-ad-player-overlay");
    cosmetic_selectors_.push_back(".ytp-ad-player-overlay-flyout-cta");
    cosmetic_selectors_.push_back(".ytp-ad-action-interstitial");
    cosmetic_selectors_.push_back(".ytp-ad-overlay-container");
    cosmetic_selectors_.push_back(".ytp-ad-message-container");
    cosmetic_selectors_.push_back(".ytp-ad-progress-list");
    cosmetic_selectors_.push_back(".ytp-ad-preview-container");
    cosmetic_selectors_.push_back(".ytp-ad-text");
    cosmetic_selectors_.push_back("ytd-ad-slot-renderer");
    cosmetic_selectors_.push_back("ytd-in-feed-ad-layout-renderer");
    cosmetic_selectors_.push_back("ytd-banner-promo-renderer");
    cosmetic_selectors_.push_back("ytd-statement-banner-renderer");
    cosmetic_selectors_.push_back("ytd-promoted-video-renderer");
    cosmetic_selectors_.push_back("ytd-promoted-sparkles-web-renderer");
    cosmetic_selectors_.push_back("ytd-player-legacy-desktop-watch-ads-renderer");
    cosmetic_selectors_.push_back("ytd-action-companion-ad-renderer");
    cosmetic_selectors_.push_back("ytd-display-ad-renderer");
    cosmetic_selectors_.push_back("#masthead-ad");
    cosmetic_selectors_.push_back("#player-ads");
    cosmetic_selectors_.push_back(".ytd-mealbar-promo-renderer");
    cosmetic_selectors_.push_back("ytd-rich-item-renderer:has(ytd-ad-slot-renderer)");
    cosmetic_selectors_.push_back("#panels:has(#offer-module)");
    cosmetic_selectors_.push_back("ytd-engagement-panel-section-list-renderer[target-id='engagement-panel-ads']");
}

void AdblockEngine::AddRule(const std::string& rule_pattern) {
    if (rule_pattern.empty()) return;

    if (rule_pattern.rfind("@@", 0) == 0) {
        exception_rules_.push_back(rule_pattern.substr(2));
    } else if (rule_pattern.rfind("##", 0) == 0) {
        cosmetic_selectors_.push_back(rule_pattern.substr(2));
    } else if (rule_pattern.rfind("||", 0) == 0) {
        std::string domain = rule_pattern.substr(2);
        size_t caret = domain.find('^');
        if (caret != std::string::npos) domain = domain.substr(0, caret);
        blocked_domains_.insert(domain);
    } else if (rule_pattern.find('/') == std::string::npos && rule_pattern.find('.') != std::string::npos) {
        blocked_domains_.insert(rule_pattern);
    } else {
        blocked_patterns_.push_back(rule_pattern);
    }
}

bool AdblockEngine::ShouldBlockRequest(const std::string& url, const std::string& resource_type) const {
    if (url.empty()) return false;

    // Check exceptions
    for (const auto& exception : exception_rules_) {
        if (url.find(exception) != std::string::npos) return false;
    }

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

std::string AdblockEngine::GenerateCosmeticStyles(const std::string& url) const {
    std::ostringstream ss;
    for (size_t i = 0; i < cosmetic_selectors_.size(); ++i) {
        ss << cosmetic_selectors_[i];
        if (i + 1 < cosmetic_selectors_.size()) ss << ", ";
    }
    ss << " { display: none !important; opacity: 0 !important; pointer-events: none !important; height: 0 !important; width: 0 !important; }\n";
    return ss.str();
}

std::string AdblockEngine::GenerateInPageScriptlet() const {
    return R"(
(function() {
    if (window.__brave_universal_adblock_active) return;
    window.__brave_universal_adblock_active = true;

    // 1. Defuse Unsolicited Popups & Popunder window.open Spawning
    try {
        const _origWindowOpen = window.open;
        window.open = function(url, target, features) {
            if (!url || typeof url !== 'string' || url === 'about:blank' || url.startsWith('javascript:')) {
                return null;
            }
            const lower = url.toLowerCase();
            const adPatterns = [
                'popads', 'popcash', 'propeller', 'adcash', 'exoclick', 'monetag',
                'clickadu', 'adsterra', 'hilltopads', 'rollerads', 'evadav', 'galaksion',
                'notix', 'mybestmv', 'recrampwiped', 'adsboosters', 'llvpn', 'emqsd=',
                'cpmgate', 'topcreativeformat', 'profitablegate', 'onclickmega',
                'stake.com', 'stake.bet', '1xbet', 'bet365', 'parimatch', 'popunder', 'pop-under'
            ];
            for (const t of adPatterns) {
                if (lower.includes(t)) {
                    return null;
                }
            }
            return _origWindowOpen.call(this, url, target, features);
        };
    } catch(e) {}

    // 2. Intercept synthetic anchor click calls triggered by popunder scripts
    try {
        const _origAnchorClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function() {
            const href = (this.href || '').toLowerCase();
            const adPatterns = [
                'popads', 'popcash', 'propeller', 'adcash', 'exoclick', 'monetag',
                'clickadu', 'adsterra', 'hilltopads', 'rollerads', 'evadav', 'galaksion',
                'notix', 'mybestmv', 'recrampwiped', 'adsboosters', 'llvpn', 'emqsd=',
                'cpmgate', 'topcreativeformat', 'profitablegate', 'onclickmega',
                'stake.com', 'stake.bet', '1xbet', 'bet365', 'parimatch', 'popunder', 'pop-under'
            ];
            if (adPatterns.some(t => href.includes(t))) {
                return;
            }
            return _origAnchorClick.apply(this, arguments);
        };
    } catch(e) {}

    // 3. Capturing-phase link click sanitizer (neutralizes gambling/scam link traps)
    document.addEventListener('click', function(e) {
        const a = e.target.closest('a');
        if (a && a.href) {
            const href = a.href.toLowerCase();
            const badTerms = [
                'stake.com', 'stake.bet', '1xbet', 'bet365', 'parimatch', 'recrampwiped',
                'adsboosters', 'llvpn', 'cpmgate', 'monetag', 'adsterra', 'propeller',
                'onclickmega', 'topcreativeformat', 'mybestmv'
            ];
            if (badTerms.some(t => href.includes(t))) {
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        }
    }, true);

    // 4. Defuse Transparent Click-Hijacking Overlays
    function defuseClickHijackers() {
        const candidates = document.querySelectorAll('div, a, span, section');
        candidates.forEach(el => {
            try {
                const style = window.getComputedStyle(el);
                if (
                    (style.position === 'fixed' || style.position === 'absolute') &&
                    parseInt(style.zIndex, 10) >= 500 &&
                    (parseFloat(style.opacity) <= 0.05 || style.backgroundColor === 'transparent' || style.visibility === 'hidden') &&
                    el.offsetWidth >= window.innerWidth * 0.5 &&
                    el.offsetHeight >= window.innerHeight * 0.5
                ) {
                    el.remove();
                }
            } catch(e) {}
        });
    }

    // 5. Purge Fake VPN, Online Protection & Antivirus Scam Cards
    function purgeFakeSystemAlerts() {
        const cards = document.querySelectorAll('div, section, aside, [class*="alert"], [class*="box"]');
        cards.forEach(el => {
            try {
                const txt = (el.innerText || '').toUpperCase();
                if (
                    (txt.includes('CONNECT TO VPN') || txt.includes('ONLINE PROTECTION DISABLED') ||
                     txt.includes('PROTECT YOUR PC') || txt.includes('VPN SOFTWARE') ||
                     txt.includes('VIRUS DETECTED') || txt.includes('ENABLE PROTECTION NOW') ||
                     txt.includes('ROBOT VERIFICATION')) &&
                    (el.querySelector('button') || el.querySelector('a') || el.querySelector('svg')) &&
                    el.querySelectorAll('*').length < 45
                ) {
                    el.remove();
                }
            } catch(e) {}
        });
    }

    // 6. Purge Bottom Sticky Gambling / Stake / Ad Banners
    function purgeStickyBottomAds() {
        const fixedElements = document.querySelectorAll('div, aside, footer, section');
        fixedElements.forEach(el => {
            try {
                const style = window.getComputedStyle(el);
                if (style.position === 'fixed' && (parseInt(style.bottom, 10) <= 20 || style.bottom === '0px')) {
                    const html = (el.innerHTML || '').toLowerCase();
                    if (
                        html.includes('stake') || html.includes('register') || html.includes('daily races') ||
                        html.includes('100,000') || html.includes('bet365') || html.includes('1xbet') || html.includes('casino') ||
                        el.querySelector('a[href*="stake"], a[href*="bet"], a[href*="aff"], img[src*="stake"]')
                    ) {
                        el.remove();
                    }
                }
            } catch(e) {}
        });
    }

    // Instant DOM Mutation Observer
    try {
        const observer = new MutationObserver(() => {
            defuseClickHijackers();
            purgeFakeSystemAlerts();
            purgeStickyBottomAds();
        });
        const target = document.documentElement || document.body;
        if (target) {
            observer.observe(target, { childList: true, subtree: true });
        }
    } catch(e) {}

    // 7. Universal InnerTube / Fetch API Ad Metadata Sanitizer
    try {
        const _origFetch = window.fetch;
        if (_origFetch) {
            window.fetch = async function(...args) {
                const targetUrl = args[0] ? (typeof args[0] === 'string' ? args[0] : (args[0].url || '')) : '';
                const resp = await _origFetch.apply(this, args);
                if (typeof targetUrl === 'string' && (targetUrl.includes('/youtubei/v1/player') || targetUrl.includes('/youtubei/v1/next'))) {
                    try {
                        const clone = resp.clone();
                        const json = await clone.json();
                        if (json && typeof json === 'object') {
                            let changed = false;
                            ['adPlacements', 'playerAds', 'adSlots', 'adBreakHeartbeatParams'].forEach(k => {
                                if (json[k]) { delete json[k]; changed = true; }
                            });
                            if (json.playerConfig && json.playerConfig.adPlacementConfig) {
                                delete json.playerConfig.adPlacementConfig;
                                changed = true;
                            }
                            if (changed) {
                                return new Response(JSON.stringify(json), {
                                    status: resp.status,
                                    statusText: resp.statusText,
                                    headers: resp.headers
                                });
                            }
                        }
                    } catch(e) {}
                }
                return resp;
            };
        }
    } catch(e) {}

    // 8. Universal HTML5 Video Ad Fast-Forward & Skip Engine
    function checkAndSkipAds() {
        const activePlayer = document.querySelector(
            '.html5-video-player.ad-showing, #movie_player.ad-showing, .ad-interrupting, .html5-video-player:has(.ytp-ad-player-overlay), .html5-video-player:has(.ytp-ad-text)'
        );
        
        if (activePlayer) {
            if (typeof activePlayer.skipAd === 'function') {
                try { activePlayer.skipAd(); } catch(e) {}
            }

            const skipButtons = document.querySelectorAll(
                '.ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button-slot button, .ytp-ad-skip-button-container button, button.ytp-ad-skip-button-modern, [id^="skip-button:"] button, .videoAdUiSkipButton, .ytp-ad-overlay-close-button, button[class*="ad-skip"]'
            );
            skipButtons.forEach(btn => {
                try { btn.click(); } catch(e) {}
            });

            const video = activePlayer.querySelector('video') || document.querySelector('video');
            if (video) {
                video.muted = true;
                video.playbackRate = 16.0;
                if (video.paused) {
                    video.play().catch(() => {});
                }
            }
        } else {
            const video = document.querySelector('video');
            if (video && video.playbackRate > 2.0) {
                video.playbackRate = 1.0;
                video.muted = false;
            }
        }

        const antiAdModals = document.querySelectorAll(
            'ytd-enforcement-message-view-model, tp-yt-paper-dialog:has(#feedback), .anti-adblock-modal, [class*="adblock-overlay"]'
        );
        antiAdModals.forEach(modal => {
            try {
                modal.remove();
                const backdrop = document.querySelector('tp-yt-iron-overlay-backdrop, .modal-backdrop');
                if (backdrop) backdrop.remove();
                const videos = document.querySelectorAll('video');
                videos.forEach(v => { if (v && v.paused) v.play().catch(() => {}); });
            } catch(e) {}
        });

        defuseClickHijackers();
        purgeFakeSystemAlerts();
        purgeStickyBottomAds();
    }

    setInterval(checkAndSkipAds, 100);

    function stripAdObjects(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        try {
            delete obj.adPlacements;
            delete obj.playerAds;
            delete obj.adSlots;
            delete obj.ads;
            delete obj.adBreakHeartbeatParams;
            if (obj.playerConfig && obj.playerConfig.adPlacementConfig) {
                delete obj.playerConfig.adPlacementConfig;
            }
        } catch(e) {}
        return obj;
    }

    if (window.ytInitialPlayerResponse) {
        stripAdObjects(window.ytInitialPlayerResponse);
    }
    let _ytResp = window.ytInitialPlayerResponse;
    try {
        Object.defineProperty(window, 'ytInitialPlayerResponse', {
            get: () => _ytResp,
            set: (val) => { _ytResp = stripAdObjects(val); },
            configurable: true
        });
    } catch(e) {}

    if (window.ytplayer && window.ytplayer.config && window.ytplayer.config.args) {
        try {
            delete window.ytplayer.config.args.raw_player_response;
            delete window.ytplayer.config.args.ad_device;
            delete window.ytplayer.config.args.ad_flags;
            delete window.ytplayer.config.args.ad_logging_flag;
            delete window.ytplayer.config.args.ad_preroll;
            delete window.ytplayer.config.args.ad_tag;
        } catch(e) {}
    }

    window.google_ad_client = undefined;
    window.canRunAds = true;
    window.isAdBlockActive = false;
})();
)";
}

} // namespace ai_browser
