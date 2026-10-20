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

        // Origins known to inject affiliate click-ads (CPS widgets / click walls)
        this.adInjectingHostsRe = /(?:4khdhub|greenmotors|hubcloud|hianime|aniwave|fmovies|123movies|movie4k|soap2day|mlwbd|khatrimaza|vegamovies|moviesda|tamilyogi|allmovieshub|zoechip|dopebox|f2movies|hdfriday|dvdplay|watchseries)(?:\.[a-z]+)+/i;
        // Affiliate tracking tokens appended to CPS/affiliate redirect destinations
        this.adLinkSignaturesRe = /(?:aff_fcid=|tt=CPS_NORMAL|ali\.pub|aff_fsk=|aff_platform=portals-tool|aff_trace_key=|aff_click_id=|a_aid=)/i;
        // CPS marketplaces that ad widgets funnel clicks into (blocked only when origin is ad-injecting)
        this.cpsMarketplaceRe = /(?:^|\.)aliexpress\.(?:com|us|ru|co\.uk|de|fr|it|es|in|jp)|ali\.pub/i;
        // ShadyLink-style ad-wall URL structure (random DGA domains, distinctive path/params)
        this.adWallPathsRe = /(?:\/sklnk\/|\/sklink\/|\bsklnk\.|\bsklink\.|bavar=0&puid=|rnum=\d+&puid=|\/l\.php\?i=)/i;
        // Trusted popup destinations allowed from ad-injecting origins. Piracy/streaming sites
        // legitimately window.open() download gateways (greenmotors), file hubs (mega/mediafire)
        // and share links, alongside their rotating ad-wall DGA rotators (random domains that
        // change every few hours and CANNOT be statically listed). Only destinations matching
        // this list are trusted as popups from those origins; everything else is an untrusted
        // third-party ad -> denied. Guess-followers keep working; static lists stop needing updates.
        this.popupDestAllowlistRe = /(?:greenmotors\.|hubcloud\.|mega\.(?:nz|co\.nz)|mediafire\.|1fichier\.|uptobox\.|katfile\.|userscloud\.|zippyshare\.|pixeldrain\.|archive\.org|dropbox\.|drive\.google\.com|fshare\.vn|fileditch\.|racaty\.|mixdrop\.|dood\.(?:to|la|re|sh)|streamtape\.|vidoza\.|userload\.co|gotaku1\.com|telegram\.org|\.t\.me|wa\.me|youtube\.com|youtu\.be|facebook\.com|instagram\.com|twitter\.com|x\.com|t\.co|reddit\.com|wikipedia\.org|imdb\.com|tmdb\.org|twitch\.tv|spotify\.com|soundcloud\.com|vk\.com|tiktok\.com|gmail\.com|google\.com|github\.com)/i;

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
                        // Google ad networks (do not block core YouTube attestation or log_event to avoid 5s penalty)
                        rulesList.push('||googleads.g.doubleclick.net^');
                        rulesList.push('||securepubads.g.doubleclick.net^');
                        rulesList.push('||pubads.g.doubleclick.net^');
                        rulesList.push('||ad.doubleclick.net^');
                        rulesList.push('||static.doubleclick.net^');
                        rulesList.push('||ade.googlesyndication.com^');
                        rulesList.push('||pagead2.googlesyndication.com^');
                        rulesList.push('||adservice.google.com^');

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
            'wasgiwiththinfeet.org', 'acscdn.com', 'greenanalytics.autos', 'certaker.com',
            'enaightdecipie.com', 'unlockr.net', 'cpmgate.com', 'cpmrate.com',
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
            'springserve.com', 'aniview.com', 'connatix.com',
            // JioHotstar / JioCinema / Hotstar Ad Infrastructure
            'hotstarads.com', 'ads.hotstar.com', 'ad.hotstar.com', 'jioads.akamaized.net',
            'jioads.com', 'ads.jio.com', 'adtech.advertising.com', 'adtech.de',
            // Spotify Audio & Video Ad Delivery Networks
            'spclient.wg.spotify.com'
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
            { pattern: 'ade.googlesyndication.com', type: 'all', category: 'ad' },
            { pattern: 'pagead2.googlesyndication.com', type: 'all', category: 'ad' },
            { pattern: 'googleads.g.doubleclick.net', type: 'all', category: 'ad' },
            { pattern: 'securepubads.g.doubleclick.net', type: 'all', category: 'ad' },
            // Hotstar & JioCinema VAST/VMAP & ad servers
            { pattern: 'hotstarads.com', type: 'all', category: 'ad' },
            { pattern: 'jioads.', type: 'all', category: 'ad' },
            { pattern: 'ads.jio.com', type: 'all', category: 'ad' },
            { pattern: '/v2/ads', type: 'all', category: 'ad' },
            { pattern: '/v1/ads', type: 'all', category: 'ad' },
            { pattern: '/vast/', type: 'all', category: 'ad' },
            { pattern: '/vmap/', type: 'all', category: 'ad' },
            // Spotify commercial break & ad tracking
            { pattern: '/ad-logic/', type: 'all', category: 'ad' },
            { pattern: '/commercial-break', type: 'all', category: 'ad' },
            { pattern: 'spotify.com/ads/', type: 'all', category: 'ad' },
            { pattern: 'spotify.com/ad-logic/', type: 'all', category: 'ad' },
            { pattern: '/mp3-ad/', type: 'all', category: 'ad' },
            { pattern: 'video-ak.pscdn.co/ad', type: 'all', category: 'ad' },
            { pattern: 'displayendpointstarring.', type: 'all', category: 'ad' },
            { pattern: 'sklnk.', type: 'all', category: 'ad' },
            { pattern: 'sklink.', type: 'all', category: 'ad' },
            { pattern: 'allslink.', type: 'all', category: 'ad' },
            // Third-party click-ad / ad-injector / redirector networks (network-level, like Brave)
            { pattern: 'adsboosters.', type: 'all', category: 'ad' },
            { pattern: 'onclickmega.', type: 'all', category: 'ad' },
            { pattern: 'topcreativeformat.', type: 'all', category: 'ad' },
            { pattern: 'mybestmv.', type: 'all', category: 'ad' },
            { pattern: 'llvpn.', type: 'all', category: 'ad' },
            { pattern: 'cpmgate.', type: 'all', category: 'ad' },
            { pattern: 'propush.', type: 'all', category: 'ad' },
            { pattern: 'monetag.', type: 'all', category: 'ad' },
            { pattern: 'adsterra.', type: 'all', category: 'ad' },
            { pattern: 'propellerads.', type: 'all', category: 'ad' },
            { pattern: 'propellerclick.', type: 'all', category: 'ad' },
            { pattern: 'recrampwiped.', type: 'all', category: 'ad' },
            { pattern: 'hitoptimizer.', type: 'all', category: 'ad' },
            { pattern: 'promopull.', type: 'all', category: 'ad' },
            { pattern: 'adpushuppromo.', type: 'all', category: 'ad' },
            { pattern: 'alwingulla.', type: 'all', category: 'ad' },
            { pattern: 'vemtoutcheeg.', type: 'all', category: 'ad' },
            { pattern: 'oikwocla.', type: 'all', category: 'ad' },
            { pattern: 'thubanoa.', type: 'all', category: 'ad' },
            { pattern: 'whomeeno.', type: 'all', category: 'ad' },
            // Popunder / click-trap script hosts (Adcash aclib.js, AdsBoosters, greenanalytics pusher)
            { pattern: 'acscdn.', type: 'all', category: 'ad' },
            { pattern: 'greenanalytics.autos', type: 'all', category: 'ad' },
            // CDN-abusing popunder rotators carry a distinctive param (acscdn/aclib juggle free CDN hosts)
            { pattern: 'aydfd=', type: 'all', category: 'ad' }
        ];

        // Whitelist media streaming and player integrity endpoints to guarantee zero lag and zero throttling
        this.exceptionRules = [
            'googlevideo.com',
            'videoplayback',
            '/videoplayback',
            'ytimg.com',
            'youtu.be',
            '/s/player/',
            '/youtubei/v1/player',
            '/youtubei/v1/browse',
            '/youtubei/v1/next',
            '/youtubei/v1/search',
            '/youtubei/v1/guide',
            '/api/stats/',
            '/ptracking',
            '/youtubei/v1/att/',
            '/get_midroll_info',
            '/api/stats/atr',
            '/api/stats/qoe',
            '/api/stats/playback',
            '/api/stats/watchtime',
            'play.google.com/log',
            'play.google.com',
            '.mp4',
            '.m3u8',
            '.mpd',
            '.ts',
            '.m4s',
            '.webm',
            '.aac',
            '.m4a',
            'spotifycdn.com',
            'audio-ak-spotify-com',
            'hotstar-akamai',
            'ad_status.js'
        ];

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
            // Anti-adblock warning overlays
            'ytd-enforcement-message-view-model',
            'tp-yt-paper-dialog:has(#feedback)',
            // Universal Streaming Site Ad Overlays (hudcloud, JWPlayer, Video.js, etc.)
            '.jw-ad-container',
            '.jw-flag-ads',
            '.vjs-ad-playing',
            '.vjs-ad-overlay',
            '.vjs-ad-control-bar',
            '.video-ad-overlay',
            '[class*="ad-overlay"]',
            '[class*="ad-banner"]',
            '[class*="ad_banner"]',
            '[id*="ad_banner"]',
            '[class*="sponsored-post"]',
            '[class*="sponsor-card"]',
            '[id*="google_ads"]',
            'iframe[src*="doubleclick"]',
            'iframe[src*="adservice"]',
            'iframe[src*="adserver"]',
            // Popunder, Shady Overlay & Ad Banners
            '.ad-container',
            '.ad-wrapper',
            '.ad-banner',
            '.advertisement',
            '.adsbygoogle',
            '[id^="google_ads_"]',
            'div[data-ad-slot]',
            '.cookie-banner',
            '#cookie-notice',
            // Affiliate click-ad links (CPS widgets): affiliate tokens never appear on legit links
            'a[href*="aff_fcid"]',
            'a[href*="tt=CPS_NORMAL"]',
            'a[href*="ali.pub"]',
            'a[href*="a_aid="]',
            'a[href*="/sklnk/"]'
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

        // 3.5 Affiliate/click-ad protection, scoped to ad-injecting origins.
        // Piracy/streaming sites inject CPS widgets + click handlers that window.open()
        // AFFILIATE-tagged URLs on legit marketplaces (aliexpress.com etc.). The destination
        // hostname is legit (not blockable globally), so we block by URL signature + origin.
        if (initiatorUrl && this.adInjectingHostsRe.test(initiatorUrl.toLowerCase())) {
            if (this.adLinkSignaturesRe.test(lowerUrl) || (domain && this.cpsMarketplaceRe.test(domain))) {
                return {
                    block: true,
                    rule: 'Affiliate click-ad (origin-scoped)',
                    category: 'ad'
                };
            }
        }

        // 3.6 ShadyLink ad-wall path signature (global). Piracy click-walls window.open()
        // random DGA domains (e.g. renamereptiliantrance.com) with an /sklnk/<id> path and
        // puid=/bavar=/rv=1 params. The domain changes every load (can't be domain-listed),
        // but the path+param structure is unique to these ad walls and never legit.
        if (this.adWallPathsRe.test(lowerUrl)) {
            return {
                block: true,
                rule: 'sklnk ad-wall (path signature)',
                category: 'ad'
            };
        }

        // 3.7 Origin-scoped popup policy. Ad-injecting origins window.open() random DGA
        // ad rotators (domain changes every load, impossible to list statically) AND legit
        // download gateways in the same gesture. Distinguish them by destination: popups
        // from these origins are ONLY trusted when the destination is allowlisted below.
        if (resourceType === 'popup' && initiatorUrl && this.adInjectingHostsRe.test(initiatorUrl.toLowerCase())) {
            const destHost = domain || lowerUrl;
            if (!this.popupDestAllowlistRe.test(destHost)) {
                return {
                    block: true,
                    rule: 'Untrusted popup from ad-injecting origin (origin-scoped)',
                    category: 'ad'
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
            } catch (e) { }
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
    const _agHost = (window.location && window.location.hostname || '').toLowerCase();
    const _isYtHost = _agHost === 'www.youtube.com' || _agHost === 'm.youtube.com' || _agHost.endsWith('.youtube.com');
    if (_isYtHost && window.__brave_universal_preload_active && !window.__ag_alloff) {
        window.__ag_engine_scriptlet_skipped_for_preload_count = (window.__ag_engine_scriptlet_skipped_for_preload_count || 0) + 1;
        return;
    }
    if (window.__brave_universal_adblock_active) return;
    window.__brave_universal_adblock_active = true;

    // 1. Defuse YouTube Anti-Adblock Experiment Flags (uBlock Origin Standard)
    try {
        function defuseAbFlags(flags) {
            if (!flags || typeof flags !== 'object') return;
            try {
                flags.web_enable_ab_rsp_cl = false;
                flags.ab_pl_man = false;
                flags.all_web_network_machine_raw_request = false;
                flags.web_streaming_watch = false;
            } catch(e) {}
        }
        if (window.ytcfg && window.ytcfg.data_ && window.ytcfg.data_.EXPERIMENT_FLAGS) {
            defuseAbFlags(window.ytcfg.data_.EXPERIMENT_FLAGS);
        }
    } catch(e) {}

    // 2. Capturing-phase link click sanitizer (neutralizes gambling/scam link traps without prototype tampering)
    document.addEventListener('click', function(e) {
        const a = e.target.closest('a');
        if (a && a.href) {
            const href = a.href.toLowerCase();
            const badTerms = [
                'stake.com', 'stake.bet', '1xbet', 'bet365', 'parimatch', 'recrampwiped',
                'adsboosters', 'llvpn', 'cpmgate', 'monetag', 'adsterra', 'propeller',
                'onclickmega', 'topcreativeformat', 'mybestmv',
                'aff_fcid=', 'tt=CPS_NORMAL', 'ali.pub', 'a_aid=', 'sklnk', 'bavar=0&puid='
            ];
            if (badTerms.some(t => href.includes(t))) {
                e.preventDefault();
                e.stopImmediatePropagation();
                console.log('[Brave Shields] Neutralized click on ad/gambling link:', a.href);
            }
        }
    }, true);

    // 2.5 Affiliate CPS widget link remover (origin-scoped).
    // Pirates' JS injects aliexpress/ali.pub offer banners and Download button ads.
    // Hides them as they appear (network-layer block is the backstop).
    try {
        const AG_AD_HOST_RE = /(?:4khdhub|greenmotors|hubcloud|hianime|aniwave|fmovies|123movies|movie4k|soap2day|mlwbd|khatrimaza|vegamovies|moviesda|tamilyogi|allmovieshub|zoechip|dopebox|f2movies|hdfriday|dvdplay|watchseries)(?:\.[a-z]+)+/i;
        if (AG_AD_HOST_RE.test(location.hostname)) {
            const hideAdLinks = function() {
                const ads = document.querySelectorAll('a[href*="aliexpress.com"], a[href*="ali.pub"], a[href*="aff_fcid"], a[href*="tt=CPS_NORMAL"], a[href*="a_aid="]');
                for (let i = 0; i < ads.length; i++) {
                    const a = ads[i];
                    a.removeAttribute('href');
                    a.removeAttribute('onclick');
                    try { a.style.display = 'none'; } catch(e) {}
                    const w = a.parentElement;
                    if (w && w.style && w.className && typeof w.className === 'string' && w.className.match(/ad|sponsor|affiliate|offer/i)) {
                        try { w.style.display = 'none'; } catch(e) {}
                    }
                }
            };
            hideAdLinks();
            setInterval(hideAdLinks, 1500);

            // Invisible full-page clickjack overlays. Ad-injecting sites drop transparent
            // position:fixed divs (z-index 999999+, opacity 0) that swallow the first click
            // and fire their ad script before a download link can be reached. Remove any
            // near-fullscreen element that is effectively invisible and click-capturing.
            const killInvisibleOverlay = function() {
                const vw = window.innerWidth, vh = window.innerHeight;
                const els = document.querySelectorAll('div, iframe, section, main');
                const n = Math.min(els.length, 3000);
                for (let i = 0; i < n; i++) {
                    const el = els[i];
                    const st = getComputedStyle(el);
                    if (st.position !== 'fixed' && st.position !== 'absolute') continue;
                    if (!(parseInt(st.zIndex, 10) >= 9000)) continue;
                    if (st.pointerEvents === 'none') continue;
                    const r = el.getBoundingClientRect();
                    if (r.width < vw * 0.7 || r.height < vh * 0.7) continue;
                    const transparent = parseFloat(st.opacity) <= 0.05 ||
                        st.backgroundColor === 'transparent' ||
                        /rgba\([^)]*,0\)/.test(st.backgroundColor);
                    if (transparent) { el.remove(); }
                }
            };
            killInvisibleOverlay();
            setInterval(killInvisibleOverlay, 2000);
        }
    } catch(e) {}

    // 3. Universal Ad Payload Neutralizer (uBlock Origin / Brave standard JSON pruning)
    try {
        function cleanAdPayload(data) {
            if (!data || typeof data !== 'object') return data;
            try {
                delete data.adPlacements;
                delete data.playerAds;
                delete data.adSlots;
                delete data.adSlot;
                delete data.ads;
                delete data.adBreaks;
                delete data.adBreakHeartbeatParams;
                delete data.adBreakHeartbeatRenderer;
                delete data.adLayoutLoggingData;
                delete data.adPlacementConfig;
                if (data.playerConfig && typeof data.playerConfig === 'object') {
                    delete data.playerConfig.adPlacementConfig;
                    delete data.playerConfig.daiConfig;
                }
                if (data.playerResponse && typeof data.playerResponse === 'object') {
                    cleanAdPayload(data.playerResponse);
                }
                if (data.videoDetails && typeof data.videoDetails === 'object') {
                    delete data.videoDetails.adPlacements;
                    delete data.videoDetails.ad;
                }
            } catch(e) {}
            return data;
        }

        // Neutralize YouTube internal 'ad' module registration & 'ad-created' state
        class DummyAdModule {
            constructor(player) {
                this.player = player;
                this.created = false;
            }
            create() { this.created = false; }
            load() {}
            unload() {}
            destroy() { this.created = false; }
            X() {}
            ZI() { return false; }
            getAdState() { return -1; }
            getOptions() { return []; }
            wK() { return null; }
        }

        let _yt_player = window._yt_player;
        function hookPlayerModuleRegistry(ytPlayerObj) {
            if (!ytPlayerObj || typeof ytPlayerObj !== 'object') return ytPlayerObj;
            if (ytPlayerObj.__jg_ad_intercepted) return ytPlayerObj;
            ytPlayerObj.__jg_ad_intercepted = true;
            let _jG = ytPlayerObj.jG;
            Object.defineProperty(ytPlayerObj, 'jG', {
                get() { return _jG; },
                set(fn) {
                    _jG = function(name, factory) {
                        if (name === 'ad') {
                            return fn.call(this, name, DummyAdModule);
                        }
                        return fn.call(this, name, factory);
                    };
                },
                configurable: true,
                enumerable: true
            });
            if (typeof _jG === 'function') {
                const orig = _jG;
                _jG = function(name, factory) {
                    if (name === 'ad') {
                        return orig.call(this, name, DummyAdModule);
                    }
                    return orig.call(this, name, factory);
                };
                try { orig('ad', DummyAdModule); } catch(e) {}
            }
            return ytPlayerObj;
        }
        try {
            Object.defineProperty(window, '_yt_player', {
                get() { return _yt_player; },
                set(val) {
                    _yt_player = hookPlayerModuleRegistry(val);
                },
                configurable: true,
                enumerable: true
            });
            if (_yt_player) _yt_player = hookPlayerModuleRegistry(_yt_player);
        } catch(e) {}

        // Prevent YouTube player from ever entering 'ad-created' class state
        try {
            const nativeDomTokenAdd = DOMTokenList.prototype.add;
            DOMTokenList.prototype.add = function(...tokens) {
                const filtered = tokens.filter(t => t !== 'ad-created');
                if (filtered.length > 0) return nativeDomTokenAdd.apply(this, filtered);
            };
        } catch(e) {}

        // Sanitize window.ytInitialPlayerResponse
        let _ytInitialPlayerResponse;
        if (!window.__yt_ad_sanitizer_installed) {
            window.__yt_ad_sanitizer_installed = true;
            try {
                Object.defineProperty(window, 'ytInitialPlayerResponse', {
                    get() { return _ytInitialPlayerResponse; },
                    set(val) { _ytInitialPlayerResponse = cleanAdPayload(val); },
                    configurable: true,
                    enumerable: true
                });
            } catch(e) {}
        }
        if (window.ytInitialPlayerResponse) {
            cleanAdPayload(window.ytInitialPlayerResponse);
        }

        // Sanitize ytplayer config
        if (window.ytplayer && window.ytplayer.config && window.ytplayer.config.args) {
            try {
                if (window.ytplayer.config.args.raw_player_response) {
                    try {
                        const parsed = typeof window.ytplayer.config.args.raw_player_response === 'string'
                            ? JSON.parse(window.ytplayer.config.args.raw_player_response)
                            : window.ytplayer.config.args.raw_player_response;
                        cleanAdPayload(parsed);
                        window.ytplayer.config.args.raw_player_response = typeof window.ytplayer.config.args.raw_player_response === 'string'
                            ? JSON.stringify(parsed)
                            : parsed;
                    } catch(e) {}
                }
                delete window.ytplayer.config.args.ad_device;
                delete window.ytplayer.config.args.ad_flags;
                delete window.ytplayer.config.args.ad_logging_flag;
                delete window.ytplayer.config.args.ad_preroll;
                delete window.ytplayer.config.args.ad_tag;
            } catch(e) {}
        }
    } catch(e) {}

    // 4. Universal Video Ad & Google IMA Surrogate Shim (Brave-Grade Zero Lag Ad Elimination)
    try {
        window.google = window.google || {};
        if (!window.google.ima) {
            window.google.ima = {
                AdDisplayContainer: function() { this.initialize = function() {}; this.destroy = function() {}; },
                AdsLoader: function() {
                    this.getSettings = function() { return {}; };
                    this.requestAds = function() {
                        setTimeout(() => {
                            if (this.handler) this.handler({ getAdsManager: () => new window.google.ima.AdsManager() });
                        }, 0);
                    };
                    this.contentComplete = function() {};
                    this.addEventListener = function(evt, fn) { if (evt === 'adsManagerLoaded') this.handler = fn; };
                },
                AdsManager: function() {
                    this.init = function() {};
                    this.start = function() {};
                    this.stop = function() {};
                    this.destroy = function() {};
                    this.resize = function() {};
                    this.addEventListener = function(evt, fn) {
                        if (evt === 'allAdsCompleted' || evt === 'contentResumeRequested') {
                            setTimeout(fn, 0);
                        }
                    };
                },
                AdsRequest: function() {},
                AdsRenderingSettings: function() {},
                ViewMode: { NORMAL: 'normal', FULLSCREEN: 'fullscreen' },
                AdErrorEvent: { Type: { AD_ERROR: 'adError' } },
                AdsManagerLoadedEvent: { Type: { ADS_MANAGER_LOADED: 'adsManagerLoaded' } },
                AdEvent: {
                    Type: {
                        ALL_ADS_COMPLETED: 'allAdsCompleted',
                        CONTENT_RESUME_REQUESTED: 'contentResumeRequested',
                        CONTENT_PAUSE_REQUESTED: 'contentPauseRequested',
                        LOADED: 'loaded',
                        STARTED: 'started',
                        COMPLETE: 'complete'
                    }
                }
            };
        }
    } catch(e) {}

    // Hook PlayerVars Methods on any player (Prevents playlist and autoplay ad injection)
    function hookPlayerObject(player) {
        if (!player || player.__brave_hooks_installed) return;
        player.__brave_hooks_installed = true;

        const methodsToHook = [
            'loadVideoByPlayerVars',
            'cueVideoByPlayerVars',
            'preloadVideoByPlayerVars',
            'enqueueVideoByPlayerVars'
        ];

        methodsToHook.forEach(methodName => {
            if (typeof player[methodName] === 'function') {
                const origMethod = player[methodName];
                player[methodName] = function(vars, ...rest) {
                    if (vars && typeof vars === 'object') {
                        if (vars.player_response) {
                            try {
                                const parsed = typeof vars.player_response === 'string' ? JSON.parse(vars.player_response) : vars.player_response;
                                cleanAdPayload(parsed);
                                vars.player_response = typeof vars.player_response === 'string' ? JSON.stringify(parsed) : parsed;
                            } catch(e) {}
                        }
                        if (vars.raw_player_response) {
                            try {
                                const parsed = typeof vars.raw_player_response === 'string' ? JSON.parse(vars.raw_player_response) : vars.raw_player_response;
                                cleanAdPayload(parsed);
                                vars.raw_player_response = typeof vars.raw_player_response === 'string' ? JSON.stringify(parsed) : parsed;
                            } catch(e) {}
                        }
                        cleanAdPayload(vars);
                    }
                    const ret = origMethod.call(this, vars, ...rest);
                        setTimeout(() => {
                            try {
                                if (typeof player.getPlayerState === 'function') {
                                    const s = player.getPlayerState();
                                    if (s === -1 || s === 5) {
                                        player.playVideo?.();
                                    }
                                }
                            } catch(e) {}
                        }, 50);
                        return ret;
                    };
                }
            });

        if (typeof player.getVideoData === 'function') {
            const origGetVideoData = player.getVideoData;
            player.getVideoData = function(...args) {
                const vd = origGetVideoData.apply(this, args);
                if (vd && typeof vd === 'object') {
                    vd.JC = false;
                    vd.r6 = false;
                    vd.dt = false;
                    vd.TK = false;
                    vd.enableServerStitchedDai = false;
                    if (typeof vd.getPlayerResponse === 'function' && !vd.__brave_gpr_hooked) {
                        vd.__brave_gpr_hooked = true;
                        const origVdGpr = vd.getPlayerResponse;
                        vd.getPlayerResponse = function(...gprArgs) {
                            const pr = origVdGpr.apply(this, gprArgs);
                            if (pr && typeof pr === 'object') cleanAdPayload(pr);
                            return pr;
                        };
                    }
                    if (vd.playerResponse && typeof vd.playerResponse === 'object') {
                        cleanAdPayload(vd.playerResponse);
                    }
                }
                return vd;
            };
        }

        if (typeof player.getPlayerResponse === 'function') {
            const origGetPlayerResponse = player.getPlayerResponse;
            player.getPlayerResponse = function(...args) {
                const resp = origGetPlayerResponse.apply(this, args);
                if (resp && typeof resp === 'object') {
                    cleanAdPayload(resp);
                }
                return resp;
            };
        }
    }

    // Universal Media Player Ad Neutralizer (YouTube, YT Music, hudcloud, JWPlayer, Video.js, Spotify, Blogs)
    function handleVideoAds() {
        try {
            const video = document.querySelector('video');
            const ytPlayer = document.querySelector('#movie_player, .html5-video-player');

            if (ytPlayer) {
                hookPlayerObject(ytPlayer);
                if (ytPlayer.classList.contains('ad-created')) {
                    ytPlayer.classList.remove('ad-created');
                    try { ytPlayer.cancelPlayback?.(); } catch(e) {}
                    try { ytPlayer.skipAd?.(); } catch(e) {}
                }
            }

            // 1. YouTube & YT Music ad detection
            const isYtAd = ytPlayer ? (
                ytPlayer.classList.contains('ad-showing') ||
                ytPlayer.classList.contains('ad-interrupting') ||
                (typeof ytPlayer.getAdState === 'function' && ytPlayer.getAdState() > 0)
            ) : false;

            // 2. Universal streaming player ad detection (hudcloud, JWPlayer, Video.js, etc.)
            const isUniversalAd = !!(
                document.querySelector(
                    '.ad-interrupting, .vjs-ad-playing, .jw-flag-ads, .jw-ad-container, ' +
                    '[class*="ad-showing"], [class*="ad-playing"], [class*="ad-break"], [data-ad-playing="true"], ' +
                    '.video-ad-overlay, .ytp-ad-player-overlay'
                )
            );

            // 3. Skip Button Detection across all platforms
            const skipBtn = document.querySelector(
                '.ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-skip-button-modern, ' +
                '.ytp-ad-skip-button-slot button, .ytp-ad-skip-button-container button, ' +
                'button.ytp-ad-skip-button-modern, [id^="skip-button:"] button, ' +
                '.videoAdUiSkipButton, .ytp-ad-overlay-close-button, button[aria-label="Skip ad"], ' +
                '.jw-skip, .vjs-skip-ad'
            );

            // Click available skip buttons immediately
            if (skipBtn) {
                try { skipBtn.click(); } catch(e) {}
            }

            const isAdActive = isYtAd || isUniversalAd;

            // SSAI skip: radio/autoplay prism uses in-band server-side ads inside the blob/MSE
            // stream (no network URL to block, no skip button). If the player is in an active ad
            // state, jump across the ad boundary via the PLAYER API first (clean state
            // transition, no raw-buffer clobber); fall back to the media element only when the
            // API path is unavailable. Content-adjacent state is never touched.
            if (isYtAd && ytPlayer && video) {
                if (typeof ytPlayer.skipAd === 'function') {
                    try { ytPlayer.skipAd(); } catch(e) {}
                }
                if (skipBtn) {
                    try { skipBtn.click(); } catch(e) {}
                }
                // Fallback for UNSKIPPABLE in-band ads where the player clamps seeking
                // (radio/autoplay "guaranteed" ads): fast-forward + mute the ad segment so it
                // cannot hold the user for 20-30s. Never seeks the content buffer, so it can't
                // desync. A tight 100ms watcher restores normal play the instant the ad clears.
                if (!window.__ag_ad_accel) {
                    window.__ag_ad_accel = true;
                    try { video.muted = true; } catch(e) {}
                    try { video.playbackRate = 8; } catch(e) {}
                    const accel = setInterval(function() {
                        try {
                            const mp2 = document.querySelector('#movie_player, .html5-video-player');
                            const stillAd = !!(mp2 && (mp2.classList.contains('ad-showing') ||
                                (typeof mp2.getAdState === 'function' && mp2.getAdState() > 0)));
                            if (!stillAd) {
                                clearInterval(accel);
                                window.__ag_ad_accel = false;
                                const v2 = document.querySelector('video');
                                if (v2) { try { v2.playbackRate = 1; } catch(e) {} try { v2.muted = false; } catch(e) {} }
                            }
                        } catch(e) {
                            clearInterval(accel);
                            window.__ag_ad_accel = false;
                        }
                    }, 100);
                    setTimeout(function() { try { clearInterval(accel); } catch(e) {} window.__ag_ad_accel = false; }, 60000);
                }
            }

            // Never touch the CONTENT stream state of a healthy player (mute/seek during
            // playback desyncs Chromium's media pipeline). SSAI auto-skip above is the only
            // intentional seek, and is scoped strictly to the active ad state.
            if (video && !window.__ag_ad_accel) {
                if (video.__was_ad_muted) {
                    video.muted = false;
                    video.__was_ad_muted = false;
                }
                if (video.playbackRate > 2.0) {
                    video.playbackRate = 1.0;
                }
            }

            // YT Music track forward if ad track is queued
            const ytMusicBar = document.querySelector('ytmusic-player-bar');
            if (ytMusicBar && ytMusicBar.hasAttribute('ad-interrupting')) {
                const nextBtn = document.querySelector('.ytmusic-player-bar [aria-label="Next song"], button.next-button');
                if (nextBtn) { try { nextBtn.click(); } catch(e) {} }
            }

            // Spotify skip forward button on audio ad
            const spotifyAdWidget = document.querySelector('[data-testid="now-playing-widget"]');
            const spotifySkipBtn = document.querySelector('[data-testid="control-button-skip-forward"]');
            if (spotifyAdWidget && spotifySkipBtn) {
                const text = (spotifyAdWidget.innerText || '').toLowerCase();
                const hasAdLink = spotifyAdWidget.querySelector('a[href*="/ad"], a[href*="spotify:ad"]');
                if (hasAdLink || text.includes('advertisement') || text.includes('spotify free')) {
                    const audio = document.querySelector('audio');
                    if (audio) audio.muted = true;
                    try { spotifySkipBtn.click(); } catch(e) {}
                }
            }

            // Dismiss anti-adblock modals & "Experiencing interruptions?" popups
            const antiAdElements = document.querySelectorAll(
                'ytd-enforcement-message-view-model, tp-yt-paper-dialog:has(#feedback), ' +
                '[data-testid="upsell-modal"], .anti-adblock-modal, [class*="adblock-overlay"], ' +
                '#adblock-modal, div[id*="adblock"], yt-notification-action-renderer, tp-yt-paper-toast'
            );
            antiAdElements.forEach(el => {
                const txt = (el.innerText || '').toLowerCase();
                if (txt.includes('interruption') || txt.includes('ad block') || txt.includes('adblock') || el.matches('ytd-enforcement-message-view-model')) {
                    el.remove();
                }
            });
            const backdrop = document.querySelector('tp-yt-iron-overlay-backdrop, .modal-backdrop');
            if (backdrop) backdrop.remove();

            // Kickstart video if stuck at 0:00 (due to anti-adblock stall or unstarted state)
            if (!isAdActive && video && ytPlayer) {
                const state = typeof ytPlayer.getPlayerState === 'function' ? ytPlayer.getPlayerState() : null;
                if (state === -1 || state === 5 || (state === 3 && video.currentTime === 0 && video.readyState >= 2)) {
                    if (typeof ytPlayer.playVideo === 'function') {
                        try { ytPlayer.playVideo(); } catch(e) {}
                    }
                }
                if (video.paused && video.currentTime === 0 && !document.hidden && video.readyState >= 2) {
                    video.play().catch(() => {});
                }
            }
        } catch(e) {}
    }

    // Event hooks: fire instantly on playback changes and SPA navigation
    document.addEventListener('play', handleVideoAds, true);
    document.addEventListener('playing', handleVideoAds, true);
    document.addEventListener('timeupdate', handleVideoAds, true);
    window.addEventListener('yt-navigate-finish', () => {
        const ytPlayer = document.querySelector('#movie_player, .html5-video-player');
        if (ytPlayer) ytPlayer.__auto_started = false;
        handleVideoAds();
    });
    window.addEventListener('yt-page-data-updated', handleVideoAds);
    window.addEventListener('load', handleVideoAds);

    // Watchdog check every 300ms for dynamic midroll ad insertions
    setInterval(handleVideoAds, 300);

    // 6. First-ad forensic watchdog (YouTube only). Populates window.__ag_yt_log /
    // window.__ag_yt_first_ad so an occasional 2-ad/30s sighting can be captured and
    // root-caused instead of debated. Both are read over the control API.
    try {
        const HN = location.hostname;
        if (HN === 'www.youtube.com' || HN === 'm.youtube.com' || HN.endsWith('.youtube.com')) {
            if (!window.__ag_yt_watchdog_installed) {
                window.__ag_yt_watchdog_installed = true;
                const T0 = performance.now();
                const WL = (window.__ag_yt_log = []);
                const snap = function() {
                    const mp = document.querySelector('#movie_player') || {};
                    const v = document.querySelector('video');
                    let src = '';
                    if (v && v.currentSrc) { try { src = v.currentSrc.indexOf('blob:') === 0 ? 'BLOB/MSE' : v.currentSrc.slice(0, 44); } catch(e) {} }
                    let st = null; try { st = mp.getPlayerState ? mp.getPlayerState() : null; } catch(e) {}
                    let vis = 0;
                    const aa = document.querySelectorAll('[class*="ytp-ad-"], .ad-showing, .ytp-ad-overlay-container');
                    for (let z = 0; z < aa.length && z < 30; z++) {
                        try {
                            const r = aa[z].getBoundingClientRect();
                            const cs = getComputedStyle(aa[z]);
                            if (r.width > 40 && r.height > 20 && cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.1) vis++;
                        } catch(e) {}
                    }
                    return {
                        at: Math.round(performance.now() - T0),
                        t: v ? +v.currentTime.toFixed(2) : 0,
                        dur: v ? +v.duration.toFixed(1) : 0,
                        src: src,
                        state: st,
                        adShowing: !!document.querySelector('.ad-showing'),
                        visAdEls: vis
                    };
                };
                const poll = function() {
                    try {
                        const s = snap();
                        WL.push(s);
                        if (WL.length > 800) WL.splice(0, WL.length - 800);
                        if ((s.adShowing || s.visAdEls > 0) && !window.__ag_yt_first_ad) window.__ag_yt_first_ad = s;
                    } catch(e) {}
                };
                poll();
                const iv = setInterval(poll, 500);
                setTimeout(function() { try { clearInterval(iv); } catch(e) {} }, 150000);
            }
        }
    } catch(e) {}

    // 5. Neutralize global ad scripts and satisfy adblock probes on window
    window.google_ad_client = undefined;
    window.google_ad_status = 1;
    window.canRunAds = true;
    window.isAdBlockActive = false;
    window.ga = window.ga || function() {};
    window.gtag = window.gtag || function() {};
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.loaded = true;
    window.adsbygoogle.push = function() { return 0; };
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
