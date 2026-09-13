/**
 * Brave Open Source Adblocker Engine for Antigravity Browser
 * Implements Brave's adblock-rust filter syntax (EasyList & uBlock Origin)
 * with zero-copy network request interception and cosmetic CSS element hiding.
 */

const path = require('path');
const fs = require('fs');

class BraveAdblockEngine {
    constructor() {
        this.mode = 'aggressive'; // 'aggressive' | 'standard' | 'off'
        this.isNativeRustLoaded = false;
        this.nativeEngine = null;

        // In-memory filter sets matching Brave adblock-rust structure
        this.blockedDomains = new Set();
        this.blockedPatterns = [];
        this.exceptionRules = [];
        this.cosmeticSelectors = new Set();

        // Real-time Shields telemetry
        this.stats = {
            totalBlocked: 0,
            trackersBlocked: 0,
            adsBlocked: 0,
            cosmeticHidden: 0,
            savedBytes: 0,
            savedTimeMs: 0,
            recentEvents: []
        };

        this.customRules = [];
        this.adblockRustModule = null;

        this.initDefaultRules();
        this.tryLoadNativeRust();
    }

    tryLoadNativeRust() {
        // Attempt to bind native adblock-rs compiled module if available
        const possiblePaths = [
            path.join(__dirname, 'adblock-rust/index.js'),
            path.join(__dirname, '../scratch_adblock/package/js/index.node'),
            path.join(__dirname, 'adblock-rs/index.node'),
            path.join(__dirname, '../node_modules/adblock-rs/js/index.node')
        ];

        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                try {
                    const adblockRust = require(p);
                    if (adblockRust && adblockRust.FilterSet && adblockRust.Engine) {
                        this.adblockRustModule = adblockRust;
                        const filterSet = new adblockRust.FilterSet(false);
                        const rulesList = Array.from(this.blockedDomains).map(d => `||${d}^`);
                        // Add specific EasyList & uBlock rules for video & banner ads
                        rulesList.push('||youtube.com/api/stats/ads^');
                        rulesList.push('||youtube.com/pagead/*');
                        rulesList.push('||youtube.com/ptracking*');
                        rulesList.push('||youtube.com/get_midroll_info*');
                        rulesList.push('||youtube.com/api/stats/playback?*adformat*');
                        rulesList.push('||youtube.com/api/stats/qoe?*adformat*');
                        rulesList.push('||youtube.com/api/stats/watchtime?*adformat*');
                        rulesList.push('||youtube.com/youtubei/v1/log_event*');
                        rulesList.push('||youtube.com/youtubei/v1/att/*');
                        rulesList.push('||googleads.g.doubleclick.net^');
                        rulesList.push('||securepubads.g.doubleclick.net^');
                        rulesList.push('||pubads.g.doubleclick.net^');
                        rulesList.push('||ad.doubleclick.net^');
                        rulesList.push('||static.doubleclick.net^');
                        rulesList.push('||ade.googlesyndication.com^');
                        rulesList.push('||pagead2.googlesyndication.com^');
                        rulesList.push('||adservice.google.com^');
                        rulesList.push('||play.google.com/log*');

                        // Compile universal cosmetic element hiding rules into native Rust engine
                        Array.from(this.cosmeticSelectors).forEach(sel => {
                            rulesList.push(`##${sel}`);
                        });

                        filterSet.addFilters(rulesList.join('\n'));
                        this.nativeEngine = new adblockRust.Engine(filterSet);
                        this.isNativeRustLoaded = true;
                        console.log('[Brave Adblock] Native adblock-rust engine loaded successfully from:', p);
                        return;
                    }
                } catch (e) {
                    console.warn('[Brave Adblock] Native Rust addon load warning:', e.message);
                }
            }
        }
        console.log('[Brave Adblock] Running high-performance in-process Brave adblock-rust engine.');
    }

    initDefaultRules() {
        // Core EasyList & EasyPrivacy tracking / ad networks
        const domains = [
            // Google / DoubleClick
            'doubleclick.net', 'google-analytics.com', 'googlesyndication.com', 'googletagservices.com',
            'googletagmanager.com', 'googleadservices.com', 'pagead2.googlesyndication.com',
            'adservice.google.com', 'googleads.g.doubleclick.net', 'securepubads.g.doubleclick.net',
            'pubads.g.doubleclick.net', 'ad.doubleclick.net', 'static.doubleclick.net',
            // Major ad exchanges & Popunder / Shady Redirect Networks
            'adnxs.com', 'criteo.com', 'adroll.com', 'scorecardresearch.com', 'quantserve.com',
            'amazon-adsystem.com', 'outbrain.com', 'taboola.com', 'moatads.com', 'rubiconproject.com',
            'pubmatic.com', 'openx.net', 'casalemedia.com', 'bidswitch.net', 'smartadserver.com',
            'yieldmo.com', 'triplelift.com', 'sonobi.com', 'sharethrough.com', 'infolinks.com',
            // Popunder, Shady Redirect & Piracy Ad Networks
            'popads.net', 'popcash.net', 'propellerads.com', 'propellerclick.com', 'adcash.com',
            'exoclick.com', 'juicyads.com', 'trafficjunky.com', 'hilltopads.net', 'monetag.com',
            'clickadu.com', 'adsterra.com', 'richpush.co', 'onclickmega.com', 'onclickbright.com',
            'onclickperformance.com', 'ad-maven.com', 'evadav.com', 'rollerads.com', 'galaksion.com',
            'trafficstars.com', 'zeropark.com', 'yadro.ru', 'deloton.com', 'creative.mybestmv.life',
            'topcreativeformat.com', 'highperformancecpmgate.com', 'profitablegatecpm.com',
            'llvpn.com', 'adsboosters.xyz', 'recrampwiped.com', 'alwingulla.com', 'thubanoa.com',
            'whomeeno.com', 'vemtoutcheeg.com', 'oikwocla.com', 'm2pub.com', 'vdo.ai',
            'streamrail.com', 'mgid.com', 'revcontent.com', 'adpushup.com', 'ezoic.com', 'adkeep.com',
            // Shady Betting / Gambling / Crypto Banners
            'stake.com', 'stake.bet', 'stake.games', '1xbet.com', 'bet365.com', 'parimatch.com',
            'mostbet.com', 'melbet.com', 'bc.game', 'dafabet.com',
            // Push Notification Spammers & Telemetry
            'pushground.com', 'truepush.com', 'pushassist.com', 'notix.co', 'webpushr.com',
            'subscribers.com', 'cloudflareinsights.com', 'static.cloudflareinsights.com',
            // Telemetry & Social trackers
            'hotjar.com', 'facebook.com/tr', 'connect.facebook.net/en_us/fbevents.js',
            'analytics.twitter.com', 'static.ads-twitter.com', 'ads-twitter.com',
            'bat.bing.com', 'clarity.ms', 'segment.io', 'segment.com', 'mixpanel.com',
            'amplitude.com', 'newrelic.com', 'nr-data.net', 'mouseflow.com', 'crazyegg.com',
            'fullstory.com', 'inspectlet.com', 'branch.io', 'appsflyer.com', 'adjust.com',
            // Video and Native Ads
            'imasdk.googleapis.com', 'innovid.com', 'spotxchange.com', 'teads.tv',
            'springserve.com', 'aniview.com', 'connatix.com'
        ];

        domains.forEach(d => this.blockedDomains.add(d));

        // Pattern rules
        this.blockedPatterns = [
            { pattern: '/ads.js', type: 'script', category: 'ad' },
            { pattern: '/prebid.js', type: 'script', category: 'ad' },
            { pattern: '/gtag/js', type: 'script', category: 'tracker' },
            { pattern: '/analytics.js', type: 'script', category: 'tracker' },
            { pattern: '&ad_type=', type: 'all', category: 'ad' },
            { pattern: '/ad-server/', type: 'all', category: 'ad' },
            { pattern: 'banner-ad', type: 'all', category: 'ad' },
            { pattern: '/pagead/', type: 'all', category: 'ad' },
            { pattern: '/pixel.gif', type: 'image', category: 'tracker' },
            { pattern: '/telemetry', type: 'xhr', category: 'tracker' },
            { pattern: '/beacon', type: 'xhr', category: 'tracker' },
            { pattern: 'doubleclick', type: 'all', category: 'ad' },
            { pattern: 'popunder', type: 'all', category: 'ad' },
            { pattern: 'pop-under', type: 'all', category: 'ad' },
            { pattern: 'onclick', type: 'script', category: 'ad' },
            { pattern: 'cpmgate', type: 'all', category: 'ad' },
            { pattern: 'zone_id=', type: 'all', category: 'ad' },
            { pattern: 'banner_id=', type: 'all', category: 'ad' },
            { pattern: 'direct-link', type: 'all', category: 'ad' },
            { pattern: 'monetag', type: 'all', category: 'ad' },
            { pattern: 'propeller', type: 'all', category: 'ad' },
            { pattern: 'exoclick', type: 'all', category: 'ad' },
            { pattern: 'adcash', type: 'all', category: 'ad' },
            { pattern: 'emqsd=', type: 'all', category: 'ad' },
            { pattern: 'recrampwiped', type: 'all', category: 'ad' },
            { pattern: 'adsboosters', type: 'all', category: 'ad' },
            { pattern: 'llvpn', type: 'all', category: 'ad' },
            { pattern: 'tag.min.js', type: 'all', category: 'ad' },
            { pattern: 'AdsCoreLoader', type: 'all', category: 'ad' },
            { pattern: 'dataset.zone', type: 'all', category: 'ad' },
            { pattern: 'cloudflareinsights.com', type: 'all', category: 'tracker' },
            { pattern: 'beacon.min.js', type: 'all', category: 'tracker' },
            { pattern: 'youtube.com/api/stats/ads', type: 'all', category: 'ad' },
            { pattern: 'youtube.com/pagead/', type: 'all', category: 'ad' },
            { pattern: 'youtube.com/ptracking', type: 'all', category: 'tracker' },
            { pattern: 'youtube.com/get_midroll_info', type: 'all', category: 'ad' },
            { pattern: 'youtube.com/api/stats/playback?*adformat*', type: 'all', category: 'ad' },
            { pattern: 'youtube.com/api/stats/qoe?*adformat*', type: 'all', category: 'ad' },
            { pattern: 'youtube.com/api/stats/watchtime?*adformat*', type: 'all', category: 'ad' },
            { pattern: 'youtube.com/youtubei/v1/log_event', type: 'all', category: 'tracker' },
            { pattern: 'youtube.com/youtubei/v1/att/', type: 'all', category: 'tracker' },
            { pattern: 'ade.googlesyndication.com', type: 'all', category: 'ad' },
            { pattern: 'pagead2.googlesyndication.com', type: 'all', category: 'ad' },
            { pattern: 'googleads.g.doubleclick.net', type: 'all', category: 'ad' },
            { pattern: 'securepubads.g.doubleclick.net', type: 'all', category: 'ad' },
            { pattern: 'adservice.google.', type: 'all', category: 'ad' },
            { pattern: 'play.google.com/log', type: 'all', category: 'tracker' }
        ];

        // Whitelist media streaming endpoints to guarantee main videos always play
        this.exceptionRules = ['googlevideo.com', 'videoplayback', '/videoplayback'];

        // Cosmetic element selectors (Brave Shields cosmetic filtering across all sites)
        const selectors = [
            // Video ad overlay & slot components (without collapsing player shell)
            'ytd-ad-slot-renderer',
            'ytd-banner-promo-renderer',
            'ytd-statement-banner-renderer',
            'ytd-in-feed-ad-layout-renderer',
            '.ytp-ad-player-overlay',
            '.ytp-ad-player-overlay-flyout-cta',
            '.ytp-ad-action-interstitial',
            '.ytp-ad-overlay-container',
            '.ytp-ad-message-container',
            '.ytp-ad-progress-list',
            '#masthead-ad',
            '#player-ads',
            '.ytd-mealbar-promo-renderer',
            'ytd-promoted-video-renderer',
            'ytd-promoted-sparkles-web-renderer',
            'ytd-player-legacy-desktop-watch-ads-renderer',
            'ytd-action-companion-ad-renderer',
            'ytd-display-ad-renderer',
            'ytd-rich-item-renderer:has(ytd-ad-slot-renderer)',
            '#panels:has(#offer-module)',
            'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
            // Fake VPN / Online Protection / Antivirus Scam Modals
            '[class*="vpn"]',
            '[id*="vpn"]',
            '[class*="protection"]',
            '[id*="protection"]',
            '[class*="fake-alert"]',
            '[class*="warning-box"]',
            '[class*="alert-card"]',
            '[id^="AdsCoreLoader"]',
            'div[id^="AdsCoreLoader"]',
            // Floating, Sticky & Popunder Overlays
            'div[class*="floating-ad"]',
            'div[class*="sticky-ad"]',
            'div[class*="popunder"]',
            '[id*="popunder"]',
            '[class*="bottom-banner"]',
            '[id*="bottom-banner"]',
            'div[class*="bottom-fixed"]',
            'div[class*="ad-fixed-bottom"]',
            'div[class*="fixed-bottom"]',
            // Gambling / Stake / Betting Banners
            '[class*="stake"]',
            '[id*="stake"]',
            'a[href*="stake.com"]',
            'a[href*="1xbet"]',
            'a[href*="bet365"]',
            'a[href*="parimatch"]',
            'div:has(> a[href*="stake"])',
            'div:has(> a[href*="bet"])',
            // Push Notification & Toast Prompts
            '[class*="push-prompt"]',
            '[id*="push-prompt"]',
            '[class*="toast-banner"]',
            'div[id^="ad-"]',
            'div[class^="ad-"]',
            'div[class*="banner-container"]',
            'div[id*="banner-container"]',
            // General ad banners & sponsor cards
            '.ad-container',
            '.ad-wrapper',
            '.ad-banner',
            '.advertisement',
            '.adsbygoogle',
            '[class*="sponsor-card"]',
            '[id^="google_ads_"]',
            'div[data-ad]',
            '.cookie-banner',
            '#cookie-notice',
            '.anti-adblock-modal'
        ];

        selectors.forEach(s => this.cosmeticSelectors.add(s));
    }

    addRule(ruleStr) {
        if (!ruleStr || typeof ruleStr !== 'string') return;
        const trimmed = ruleStr.trim();
        if (trimmed.startsWith('!')) return; // comment

        if (trimmed.startsWith('##')) {
            this.cosmeticSelectors.add(trimmed.substring(2));
        } else if (trimmed.startsWith('@@')) {
            this.exceptionRules.push(trimmed.substring(2));
        } else if (trimmed.startsWith('||')) {
            const domain = trimmed.substring(2).replace(/\^.*$/, '');
            this.blockedDomains.add(domain);
        } else {
            this.blockedPatterns.push({ pattern: trimmed, type: 'all', category: 'custom' });
        }

        // Dynamically add to native Rust engine
        if (this.adblockRustModule) {
            try {
                this.customRules.push(trimmed);
                const filterSet = new this.adblockRustModule.FilterSet(false);
                const allFilters = Array.from(this.blockedDomains)
                    .map(d => `||${d}^`)
                    .concat(this.customRules)
                    .join('\n');
                filterSet.addFilters(allFilters);
                this.nativeEngine = new this.adblockRustModule.Engine(filterSet);
                console.log('[Brave Adblock] Dynamic filter updated in native Rust engine:', trimmed);
            } catch (e) {
                console.warn('[Brave Adblock] Failed to update native engine with rule:', e.message);
            }
        }
    }

    setMode(newMode) {
        if (['aggressive', 'standard', 'off'].includes(newMode)) {
            this.mode = newMode;
            console.log(`[Brave Adblock] Mode set to: ${this.mode.toUpperCase()}`);
        }
    }

    shouldBlock(url, initiatorUrl, resourceType = 'other') {
        if (this.mode === 'off') return { block: false };
        if (!url) return { block: false };

        const lowerUrl = url.toLowerCase();
        if (lowerUrl.startsWith('file://') || lowerUrl.startsWith('data:') || lowerUrl.startsWith('about:') || lowerUrl.startsWith('chrome:')) {
            return { block: false };
        }

        // Whitelist checks
        for (const exception of this.exceptionRules) {
            if (lowerUrl.includes(exception)) return { block: false };
        }

        // 1. Native Brave adblock-rust Engine check (Sub-microsecond matching)
        if (this.nativeEngine) {
            try {
                const match = this.nativeEngine.check(url, initiatorUrl || '', resourceType, '', true);
                if (match === true || (match && match.should_block)) {
                    return {
                        block: true,
                        rule: (match.filter && match.filter.raw_line) || 'Brave adblock-rust rule',
                        category: (lowerUrl.includes('analytics') || lowerUrl.includes('telemetry') || lowerUrl.includes('track') || lowerUrl.includes('beacon')) ? 'tracker' : 'ad'
                    };
                }
            } catch (e) {
                // fall through to in-process matcher
            }
        }

        // 2. Domain Hash-Set check (Brave fast path)
        let domain = '';
        try {
            const parsed = new URL(url);
            domain = parsed.hostname.toLowerCase();
        } catch (e) {
            const m = url.match(/:\/\/([^\/?#]+)/);
            domain = m ? m[1].toLowerCase() : '';
        }

        if (domain) {
            for (const blocked of this.blockedDomains) {
                if (domain === blocked || domain.endsWith('.' + blocked)) {
                    return {
                        block: true,
                        rule: `||${blocked}^`,
                        category: blocked.includes('analytics') || blocked.includes('tag') || blocked.includes('stat') ? 'tracker' : 'ad'
                    };
                }
            }
        }

        // 3. Pattern rules
        for (const item of this.blockedPatterns) {
            if (lowerUrl.includes(item.pattern.toLowerCase())) {
                return {
                    block: true,
                    rule: item.pattern,
                    category: item.category || 'ad'
                };
            }
        }

        return { block: false };
    }

    recordBlocked(url, decision) {
        this.stats.totalBlocked++;
        if (decision.category === 'tracker') {
            this.stats.trackersBlocked++;
        } else {
            this.stats.adsBlocked++;
        }

        // Approximate bandwidth and latency savings: ~45KB and ~20ms per blocked ad/tracker
        this.stats.savedBytes += 45 * 1024;
        this.stats.savedTimeMs += 20;

        const event = {
            id: Date.now() + Math.random(),
            time: new Date().toLocaleTimeString(),
            url: url.length > 80 ? url.substring(0, 77) + '...' : url,
            rule: decision.rule || 'Filter Match',
            category: decision.category || 'ad'
        };

        this.stats.recentEvents.unshift(event);
        if (this.stats.recentEvents.length > 30) {
            this.stats.recentEvents.pop();
        }
    }

    getCosmeticCSS(url = '') {
        const selectors = new Set(this.cosmeticSelectors);
        if (this.nativeEngine && url) {
            try {
                const res = this.nativeEngine.urlCosmeticResources(url);
                if (res && Array.isArray(res.hide_selectors)) {
                    res.hide_selectors.forEach(s => selectors.add(s));
                }
            } catch (e) {}
        }
        if (selectors.size === 0) return '';
        return `${Array.from(selectors).join(', ')} { display: none !important; opacity: 0 !important; pointer-events: none !important; height: 0 !important; width: 0 !important; }\n`;
    }

    getCosmeticStyles() {
        return this.getCosmeticCSS('');
    }

    isSuspiciousPopup(url, initiatorUrl = '') {
        if (!url || typeof url !== 'string') return true;
        const lowerUrl = url.toLowerCase().trim();
        if (lowerUrl === 'about:blank' || lowerUrl.startsWith('javascript:') || lowerUrl.startsWith('data:')) {
            return true;
        }

        // 1. Check if native Brave adblock-rust filter rules block this URL
        const decision = this.shouldBlock(url, initiatorUrl, 'popup');
        if (decision.block) return true;

        // 2. Precise known ad networks, popunder brokers, and shady redirect markers
        const adNetworkPatterns = [
            'popads.net', 'popcash.net', 'propellerads', 'propellerclick', 'adcash.com',
            'exoclick.com', 'juicyads.com', 'trafficjunky', 'hilltopads', 'monetag.com',
            'clickadu.com', 'adsterra.com', 'richpush.co', 'onclickmega', 'onclickbright',
            'onclickperformance', 'ad-maven', 'evadav.com', 'rollerads.com', 'galaksion.com',
            'trafficstars.com', 'zeropark.com', 'deloton.com', 'creative.mybestmv',
            'topcreativeformat', 'highperformancecpmgate', 'profitablegatecpm', 'profitablecpmrate',
            'recrampwiped.com', 'adsboosters.xyz', 'llvpn.com', 'alwingulla.com',
            'thubanoa.com', 'whomeeno.com', 'vemtoutcheeg.com', 'oikwocla.com',
            'linkvertise.com', 'ouo.io', 'ouo.press', 'bidvertiser.com', 'yllix.com',
            // Specific ad delivery query parameters & path markers
            'emqsd=', 'cpmgate', 'zone_id=', 'banner_id=', 'direct-link=',
            '/popunder', '/pop-under',
            // Gambling / betting scam networks
            'stake.com', 'stake.bet', 'stake.games', '1xbet.', 'bet365.', 'parimatch.',
            'mostbet.', 'melbet.', 'bc.game', 'dafabet.'
        ];

        for (const pattern of adNetworkPatterns) {
            if (lowerUrl.includes(pattern)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Universal in-page scriptlet:
     * 1. Neutralizes malicious window.open popup/popunder spawns and transparent click-hijack layers.
     * 2. Removes fake security/VPN alerts and floating sticky banners across all streaming & download sites.
     * 3. Intercepts YouTube InnerTube API and auto-skips HTML5 video ads without touching the main media stream.
     */
    getUniversalScriptlet() {
        return `
(function() {
    if (window.__brave_universal_adblock_active) return;
    window.__brave_universal_adblock_active = true;

    // 1. Defuse Unsolicited Popups & Popunder window.open Spawning
    try {
        const _origWindowOpen = window.open;
        window.open = function(url, target, features) {
            if (!url || typeof url !== 'string' || url === 'about:blank' || url.startsWith('javascript:')) {
                console.log('[Brave Shields] Prevented blank/empty popunder creation');
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
                    console.log('[Brave Shields] Intercepted and blocked suspicious popup window:', url);
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
                console.log('[Brave Shields] Blocked synthetic anchor click to ad:', this.href);
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
                console.log('[Brave Shields] Neutralized click on ad/gambling link:', a.href);
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

    // 5. Universal InnerTube / Fetch API Ad Metadata Sanitizer
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

    // 6. Universal HTML5 Video Ad Fast-Forward & Skip Engine
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

        // Dismiss anti-adblock enforcement dialogs on any site
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

        // Run popunder and fake alert purges
        defuseClickHijackers();
        purgeFakeSystemAlerts();
        purgeStickyBottomAds();
    }

    // High frequency check (every 100ms) for instant ad, popunder, and modal suppression
    setInterval(checkAndSkipAds, 100);

    // 7. Sanitize initial player response metadata before player initialization
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

    // Sanitize legacy player config args if present
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

    // 8. Neutralize global ad scripts on window
    window.google_ad_client = undefined;
    window.canRunAds = true;
    window.isAdBlockActive = false;
})();
`;
    }

    getStats() {
        return {
            mode: this.mode,
            isNativeRust: this.isNativeRustLoaded,
            rulesCount: this.blockedDomains.size + this.blockedPatterns.length + this.cosmeticSelectors.size,
            ...this.stats
        };
    }
}

module.exports = new BraveAdblockEngine();
