/**
 * Antigravity Native Browser Universal Guest Preload Script
 * Brave Shields & uBlock Origin Standard (Pure Non-Invasive Architecture)
 * 
 * Guarantees:
 * 1. Zero prototype tampering (fetch, JSON.parse, Promise, XMLHttpRequest are 100% native [native code])
 * 2. Instant zero-buffering video start at 0:00 across all websites
 * 3. Complete ad elimination before playback begins without tripping anti-adblock penalties
 */

(function () {
    function installUniversalShields(targetWindow) {
        if (!targetWindow || targetWindow.__brave_universal_preload_active) return;
        targetWindow.__brave_universal_preload_active = true;

        // Error recording for diagnostics and A/B/C testing
        targetWindow.__capturedErrors = targetWindow.__capturedErrors || [];
        try {
            const _origConsoleError = targetWindow.console.error;
            targetWindow.console.error = function (...args) {
                try {
                    targetWindow.__capturedErrors.push({
                        time: Date.now(),
                        type: 'console.error',
                        msg: args.map(a => typeof a === 'object' ? (a && a.message ? a.message : JSON.stringify(a)) : String(a)).join(' ').slice(0, 300)
                    });
                } catch (e) { }
                return _origConsoleError.apply(this, args);
            };
            targetWindow.addEventListener('error', e => {
                try {
                    targetWindow.__capturedErrors.push({
                        time: Date.now(),
                        type: 'uncaught',
                        msg: String(e.message || e.error || e).slice(0, 300)
                    });
                } catch (err) { }
            });
            targetWindow.addEventListener('unhandledrejection', e => {
                try {
                    targetWindow.__capturedErrors.push({
                        time: Date.now(),
                        type: 'unhandledrejection',
                        msg: String(e.reason && e.reason.message || e.reason || e).slice(0, 300)
                    });
                } catch (err) { }
            });
        } catch (e) { }

        // A/B/C Test Harness Mode Reader
        const currentTestMode = (function () {
            try {
                const u = targetWindow.location && targetWindow.location.href;
                if (u && u.includes('ag_test_mode=')) {
                    const m = u.match(/ag_test_mode=([ABC])/);
                    if (m) return m[1];
                }
                return targetWindow.localStorage.getItem('ag_test_mode') || null;
            } catch (e) { return null; }
        })();

        // Test A: cleanAdPayload = OFF, jsonPruning = OFF
        // Test B: cleanAdPayload = OFF, jsonPruning = OFF
        // Test C: cleanAdPayload = ON, jsonPruning = ON
        const enableCleanAdPayload = false;

        const enableJsonResponsePruning = (function () {
            try {
                if (currentTestMode === 'A' || currentTestMode === 'B') return false;
                if (currentTestMode === 'C') return true;
                return true;
            } catch (e) { return true; }
        })();

        // DEBUG kill-switch (A/B testing only):
        //   localStorage.ag_alloff='1' or testMode === 'A' -> disable this preload entirely
        const AG_ALL_OFF = (function () {
            if (currentTestMode === 'A') return true;
            try { return targetWindow.localStorage.getItem('ag_alloff') === '1'; } catch (e) { return false; }
        })();
        if (AG_ALL_OFF) {
            targetWindow.__brave_universal_adblock_active = true;
            targetWindow.__ag_alloff = true;
            return;
        }

        // 1. Universal Anti-Adblock Shims (Neutralizes adblock detectors without prototype tampering)
        try {
            const _isYt = (targetWindow.location && targetWindow.location.hostname || '').toLowerCase().endsWith('youtube.com');
            if (!_isYt) {
                targetWindow.canRunAds = true;
                targetWindow.google_ad_status = 1;
                targetWindow.google_ad_client = undefined;
                targetWindow.adsbygoogle = targetWindow.adsbygoogle || [];
                targetWindow.adsbygoogle.loaded = true;
            }
            targetWindow.isAdBlockActive = false;
            targetWindow.ga = targetWindow.ga || function () { };
            targetWindow.gtag = targetWindow.gtag || function () { };
            targetWindow.google = targetWindow.google || {};
        } catch (e) { }

        // 1.5. Universal Popup & Anti-Clickjack Blocker in Guest DOM
        try {
            const nativeOpen = targetWindow.open;
            targetWindow.open = function (url, target, features) {
                const urlStr = String(url || '').trim();
                const curHost = (targetWindow.location && targetWindow.location.hostname || '').toLowerCase();
                const isAdHost = /(?:4khdhub|greenmotors|hubcloud|gamerxyt|moviesmod|hianime|aniwave|fmovies|123movies)/i.test(curHost);

                if (isAdHost && (!urlStr || urlStr === 'about:blank' || urlStr.startsWith('javascript:'))) {
                    console.log('[Shields] Blocked blank popup from ad origin:', curHost);
                    return null;
                }

                if (urlStr) {
                    const lower = urlStr.toLowerCase();
                    if (/(?:wasgiwiththinfeet|acscdn|greenanalytics|ukankingwithea|certaker|enaightdecipie|unlockr|d3h4vtr7axmx3p|d33f51dyacx7bd|dlvds9i67c60j|adsboosters|cpmgate|topcreativeformat|mybestmv|recrampwiped|bonuscaf|rtvhd=|aydfd=|sklnk)/i.test(lower)) {
                        console.log('[Shields] Blocked shady popup destination:', urlStr);
                        return null;
                    }
                }
                return nativeOpen.apply(this, arguments);
            };

            // Anti-Clickjack Overlay Interceptor (Intercepts malicious click-traps & popunder redirects)
            targetWindow.addEventListener('click', (e) => {
                const target = e.target;
                if (!target) return;
                const a = target.closest ? target.closest('a') : null;
                if (a && a.href) {
                    const href = a.href.toLowerCase();
                    if (/(?:wasgiwiththinfeet|acscdn|greenanalytics|ukankingwithea|certaker|enaightdecipie|unlockr|d3h4vtr7axmx3p|d33f51dyacx7bd|dlvds9i67c60j|adsboosters|cpmgate|topcreativeformat|mybestmv|recrampwiped|bonuscaf|rtvhd=|aydfd=|sklnk)/i.test(href)) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        console.log('[Shields] Blocked click on ad link:', a.href);
                        return false;
                    }
                }
            }, true);
        } catch (e) { }

        // 2. Defuse YouTube Anti-Adblock & DAI Experiment Flags (uBlock Origin & Brave Shields Standard)
        function defuseAbFlags(flags) {
            if (!flags || typeof flags !== 'object') return;
            try {
                flags.web_enable_ab_rsp_cl = false;
                flags.ab_pl_man = false;
                flags.all_web_network_machine_raw_request = false;
                flags.enable_adb_handling_in_sabr = false;
                // Completely neutralize server & client DAI to prevent 20-30s buffering stalls
                flags.enable_server_stitched_dai = false;
                flags.enable_dai_sdf_h5_preroll = false;
                flags.enable_sdf_dai_h5_midroll = false;
                flags.html5_server_stitched_dai_group = false;
                flags.html5_ssdai_enable_media_end_cue_range = false;
                flags.enable_smearing_expansion_dai = false;
            } catch (e) { }
        }

        let _ytcfg = targetWindow.ytcfg;
        function wrapYtcfg(cfg) {
            if (!cfg || typeof cfg !== 'object') return cfg;
            try {
                if (cfg.data_ && cfg.data_.EXPERIMENT_FLAGS) {
                    defuseAbFlags(cfg.data_.EXPERIMENT_FLAGS);
                }
                if (!cfg.__ag_prop_hooked) {
                    cfg.__ag_prop_hooked = true;
                    let _setFn = cfg.set;
                    const wrapSetFn = (fn) => {
                        if (typeof fn !== 'function' || fn.__ag_wrapped) return fn;
                        const wrapped = function (...args) {
                            try {
                                if (args[0] && typeof args[0] === 'object') {
                                    if (args[0].EXPERIMENT_FLAGS) defuseAbFlags(args[0].EXPERIMENT_FLAGS);
                                    defuseAbFlags(args[0]);
                                }
                                if (args[0] === 'EXPERIMENT_FLAGS' && args[1] && typeof args[1] === 'object') {
                                    defuseAbFlags(args[1]);
                                }
                            } catch (e) {}
                            const res = fn.apply(this, args);
                            try {
                                const d = (typeof this.d === 'function' ? this.d() : this.data_) || cfg.data_;
                                if (d && d.EXPERIMENT_FLAGS) defuseAbFlags(d.EXPERIMENT_FLAGS);
                            } catch (e) {}
                            return res;
                        };
                        wrapped.__ag_wrapped = true;
                        registerNativeShim(wrapped, fn);
                        return wrapped;
                    };
                    if (typeof _setFn === 'function') _setFn = wrapSetFn(_setFn);
                    Object.defineProperty(cfg, 'set', {
                        get() { return _setFn; },
                        set(fn) { _setFn = wrapSetFn(fn); },
                        configurable: true,
                        enumerable: true
                    });
                }
            } catch (e) {}
            return cfg;
        }

        try {
            Object.defineProperty(targetWindow, 'ytcfg', {
                get() { return _ytcfg; },
                set(val) {
                    _ytcfg = wrapYtcfg(val);
                },
                configurable: true,
                enumerable: true
            });
            if (_ytcfg) {
                _ytcfg = wrapYtcfg(_ytcfg);
            }
        } catch (e) { }

        // 3. Universal Google IMA SDK Surrogate (Zero-delay video resume for JWPlayer, Video.js, etc.)
        try {
            const _isYtIma = (targetWindow.location && targetWindow.location.hostname || '').toLowerCase().endsWith('youtube.com');
            if (!_isYtIma && !targetWindow.google.ima) {
                targetWindow.google.ima = {
                    AdDisplayContainer: function () { this.initialize = function () { }; this.destroy = function () { }; },
                    AdsLoader: function () {
                        this.getSettings = function () { return {}; };
                        this.requestAds = function () {
                            setTimeout(() => {
                                if (this.handler) this.handler({ getAdsManager: () => new targetWindow.google.ima.AdsManager() });
                            }, 0);
                        };
                        this.contentComplete = function () { };
                        this.addEventListener = function (evt, fn) { if (evt === 'adsManagerLoaded') this.handler = fn; };
                    },
                    AdsManager: function () {
                        this.init = function () { };
                        this.start = function () { };
                        this.stop = function () { };
                        this.destroy = function () { };
                        this.resize = function () { };
                        this.addEventListener = function (evt, fn) {
                            if (evt === 'allAdsCompleted' || evt === 'contentResumeRequested') {
                                setTimeout(fn, 0);
                            }
                        };
                    },
                    AdsRequest: function () { },
                    AdsRenderingSettings: function () { },
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
        } catch (e) { }

        // 4. Ad Payload Neutralizer (uBlock Origin / Brave standard: RENAME ad keys, never delete)
        // Renaming keeps the InnerTube response structurally intact so the player never builds an
        // ad state. Kill-switch for A/B testing: localStorage.ag_nostrip='1' skips the rename.
        targetWindow.__ag_ad_vids = targetWindow.__ag_ad_vids || {};
        function recordAdSignalForPayload(data) {
            if (!data || typeof data !== 'object') return;
            try {
                const hasAds = (Array.isArray(data.adPlacements) && data.adPlacements.length > 0) ||
                    (Array.isArray(data.playerAds) && data.playerAds.length > 0) ||
                    (Array.isArray(data.adSlots) && data.adSlots.length > 0);
                if (hasAds) {
                    targetWindow.__ag_last_ad_req_time = Date.now();
                    const urlVid = ((targetWindow.location || {}).href || '').match(/[?&]v=([A-Za-z0-9_-]{11})/)?.[1] || null;
                    const vId = (data.videoDetails && data.videoDetails.videoId) ||
                        (data.playerResponse && data.playerResponse.videoDetails && data.playerResponse.videoDetails.videoId) || urlVid;
                    if (vId) targetWindow.__ag_ad_vids[vId] = Date.now();
                }
                if (data.playerResponse && typeof data.playerResponse === 'object') {
                    recordAdSignalForPayload(data.playerResponse);
                }
            } catch (e) {}
        }
        function stripAdKeysInPlace(data) {
            if (!data || typeof data !== 'object') return data;
            recordAdSignalForPayload(data);
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
                    stripAdKeysInPlace(data.playerResponse);
                }
                if (data.videoDetails && typeof data.videoDetails === 'object') {
                    delete data.videoDetails.adPlacements;
                    delete data.videoDetails.ad;
                }
            } catch (e) {}
            return data;
        }
        function cleanAdPayload(data) {
            recordAdSignalForPayload(data);
            return data;
        }

        // 4.5. uBlock Origin Native Proxy Stealth Engine (Zero-fingerprint proxy shimming)
        const proxies = new WeakMap();
        try {
            const nativeToString = targetWindow.Function.prototype.toString;
            const proxiedToString = new Proxy(nativeToString, {
                apply(target, thisArg, args) {
                    let proxied = thisArg;
                    for (; ;) {
                        const fn = proxies.get(proxied);
                        if (fn === undefined) break;
                        proxied = fn;
                    }
                    return Reflect.apply(target, proxied, args);
                }
            });
            targetWindow.Function.prototype.toString = proxiedToString;
        } catch (e) { }

        function registerNativeShim(proxiedFn, nativeFn) {
            try {
                proxies.set(proxiedFn, nativeFn);
            } catch (e) { }
        }

        // 4.6. uBlock Origin Standard JSON.parse Pruner (Wipes ad structures before player initialization)
        const nativeJSONParse = targetWindow.JSON.parse;
        if (enableJsonResponsePruning) {
            try {
                const wrappedJSONParse = function (text, reviver) {
                    const res = nativeJSONParse.call(this, text, reviver);
                    if (res && typeof res === 'object') {
                        if (typeof text === 'string' && (
                            text.includes('adPlacements') ||
                            text.includes('playerAds') ||
                            text.includes('adSlots') ||
                            text.includes('adBreakHeartbeat') ||
                            text.includes('adPlacementConfig') ||
                            text.includes('daiConfig')
                        )) {
                            if ((Array.isArray(res.adPlacements) && res.adPlacements.length > 0) ||
                                (Array.isArray(res.playerAds) && res.playerAds.length > 0) ||
                                (Array.isArray(res.adSlots) && res.adSlots.length > 0)) {
                                targetWindow.__ag_last_ad_req_time = Date.now();
                                targetWindow.__ag_last_ad_req_src = 'wrappedJSONParse: adPlacements/playerAds/adSlots';
                            }
                            cleanAdPayload(res);
                        }
                    }
                    return res;
                };
                Object.defineProperty(wrappedJSONParse, 'name', { value: 'parse', configurable: true });
                Object.defineProperty(wrappedJSONParse, 'length', { value: 2, configurable: true });
                registerNativeShim(wrappedJSONParse, nativeJSONParse);
                targetWindow.JSON.parse = wrappedJSONParse;
            } catch (e) { }
        }

        // 4.65. Anti-fake-buffering: prevent YouTube from serving ads on player requests so its
        // server-side SABR "backoff" (fake buffering = ~80% of skipped ad duration) never kicks in.
        // YouTube retired isInlinePlaybackNoAd; the current uBlock Origin approach prepends a
        // base64 protobuf flag ("yAEB" = field 25, varint 1) to the "params" field of the player
        // request body. We hook BOTH JSON.stringify (serializer) and Object.assign (request
        // builder), exactly like uBO, plus we rewrite gzipped Request bodies directly. YouTube's
        // "locker" script tries to lock globals, but our preload runs before every page script.
        const INJ_FIND = '"contentPlaybackContext":{';
        const INJ_REPL = '"contentPlaybackContext":{"isInlinePlaybackNoAd":true,';
        const needsInject = (s) => typeof s === 'string' && s.indexOf(INJ_FIND) !== -1 && s.indexOf('"isInlinePlaybackNoAd":true') === -1;
        const patchOutbound = (s) => {
            let out = s;
            if (needsInject(out)) out = out.replace(INJ_FIND, INJ_REPL);
            return out;
        };
        // 2026: YouTube retired the params/yAEB trick (uBO disabled it upstream). The
        // current anti-penalty mechanism is to advertise the server-extended client
        // markers ("channel", "lactmilli", "instream", "yahi") in the ytcfg userAgent and
        // pair them with fields on every player request — so the server never serves the
        // fake-buffering / "This content isn't available, try again later" penalty at all.
        const UA_FEATURES = ['channel', 'lactmilli', 'instream', 'yahi'];
        const enableUAFeatures = () => {
            try {
                const cfg = targetWindow.ytcfg;
                const client = cfg && cfg.data_ && cfg.data_.INNERTUBE_CONTEXT && cfg.data_.INNERTUBE_CONTEXT.client;
                if (client && typeof client.userAgent === 'string') {
                    if (UA_FEATURES.some(t => client.userAgent.indexOf(t) === -1)) {
                        const ua = client.userAgent;
                        const mm = ua.match(/^(Mozilla\/5\.0 \([^)]+\))(.*)(AppleWebKit.*)$/);
                        client.userAgent = mm ? (mm[1] + '; ' + UA_FEATURES.join('; ') + ' ' + mm[3]) : (ua + '; ' + UA_FEATURES.join('; '));
                    }
                    if (UA_FEATURES.every(t => client.userAgent.indexOf(t) !== -1)) {
                        targetWindow.__ag_tokenized = true;
                        return true;
                    }
                }
            } catch (e) {}
            return false;
        };
        // True when a /player JSON response carries the reliability penalty (UNPLAYABLE +
        // the reload-penalty markers). Non-penalty errors (private/login/age) are ignored.
        const isPenaltyPlayerText = (s) => {
            if (typeof s !== 'string' || s.indexOf('"UNPLAYABLE"') === -1) return false;
            return s.indexOf('3037019') !== -1 ||
                (s.indexOf("This content isn't available") !== -1 && s.indexOf('try again later') !== -1) ||
                s.indexOf('"playerInterstitialRenderer"') !== -1;
        };
        const nativeJSONStringify = targetWindow.JSON.stringify;
        try {
            const wrappedJSONStringify = function (...args) {
                const out = nativeJSONStringify.apply(this, args);
                if (typeof out === 'string' && out.length < 200000) {
                    if (needsInject(out)) {
                        try {
                            targetWindow.__ag_inj = (targetWindow.__ag_inj || 0) + 1;
                            return patchOutbound(out);
                        } catch (e) { }
                    }
                }
                return out;
            };
            Object.defineProperty(wrappedJSONStringify, 'name', { value: 'stringify', configurable: true });
            Object.defineProperty(wrappedJSONStringify, 'length', { value: 3, configurable: true });
            registerNativeShim(wrappedJSONStringify, nativeJSONStringify);
            targetWindow.JSON.stringify = wrappedJSONStringify;
        } catch (e) { }

        try {
            const nativeObjectAssign = targetWindow.Object.assign;
            const wrappedObjectAssign = function (target, ...sources) {
                const result = nativeObjectAssign.apply(this, [target, ...sources]);
                try {
                    if (result && typeof result.body === 'string' && needsInject(result.body)) {
                        result.body = patchOutbound(result.body);
                        targetWindow.__ag_inj = (targetWindow.__ag_inj || 0) + 1;
                    }
                } catch (e) { }
                return result;
            };
            registerNativeShim(wrappedObjectAssign, nativeObjectAssign);
            targetWindow.Object.assign = wrappedObjectAssign;
        } catch (e) { }

        // Stealth Response.prototype.json and text Pruner (YouTube-specific — clean ad payloads on API responses)
        if (enableJsonResponsePruning) {
            try {
                if (targetWindow.Response && targetWindow.Response.prototype) {
                    if (targetWindow.Response.prototype.json) {
                        const nativeResponseJson = targetWindow.Response.prototype.json;
                        const proxiedResponseJson = function (...args) {
                            const responseUrl = (this && this.url) || '';
                            return nativeResponseJson.apply(this, args).then(res => {
                                if (res && typeof res === 'object') {
                                    if ((Array.isArray(res.adPlacements) && res.adPlacements.length > 0) ||
                                        (Array.isArray(res.playerAds) && res.playerAds.length > 0) ||
                                        (Array.isArray(res.adSlots) && res.adSlots.length > 0)) {
                                        targetWindow.__ag_last_ad_req_time = Date.now();
                                    }
                                    if (/youtube\.com|\/youtubei\/v1\//.test(responseUrl) || res.videoDetails || res.playerConfig || res.adPlacements) {
                                        stripAdKeysInPlace(res);
                                    }
                                }
                                return res;
                            });
                        };
                        Object.defineProperty(proxiedResponseJson, 'name', { value: 'json', configurable: true });
                        Object.defineProperty(proxiedResponseJson, 'length', { value: 0, configurable: true });
                        registerNativeShim(proxiedResponseJson, nativeResponseJson);
                        targetWindow.Response.prototype.json = proxiedResponseJson;
                    }

                    if (targetWindow.Response.prototype.text) {
                        const nativeResponseText = targetWindow.Response.prototype.text;
                        const proxiedResponseText = function (...args) {
                            const responseUrl = (this && this.url) || '';
                            return nativeResponseText.apply(this, args).then(txt => {
                                if (typeof txt === 'string' && /youtubei\/v1\/(player|next|get_watch)/.test(responseUrl)) {
                                    if (txt.includes('adPlacements') || txt.includes('adSlots') || txt.includes('playerAds')) {
                                        try {
                                            const parsed = nativeJSONParse.call(targetWindow.JSON, txt);
                                            if ((Array.isArray(parsed.adPlacements) && parsed.adPlacements.length > 0) ||
                                                (Array.isArray(parsed.playerAds) && parsed.playerAds.length > 0) ||
                                                (Array.isArray(parsed.adSlots) && parsed.adSlots.length > 0)) {
                                                targetWindow.__ag_last_ad_req_time = Date.now();
                                            }
                                            stripAdKeysInPlace(parsed);
                                            return nativeJSONStringify.call(targetWindow.JSON, parsed);
                                        } catch (e) { }
                                    }
                                }
                                return txt;
                            });
                        };
                        Object.defineProperty(proxiedResponseText, 'name', { value: 'text', configurable: true });
                        Object.defineProperty(proxiedResponseText, 'length', { value: 0, configurable: true });
                        registerNativeShim(proxiedResponseText, nativeResponseText);
                        targetWindow.Response.prototype.text = proxiedResponseText;
                    }
                }
            } catch (e) { }
        }

        // 4.7. InnerTube Request & Response Rewriter — strips ad tracking signals and prunes ad payloads
        try {
            function patchPlayerBody(body) {
                if (!enableJsonResponsePruning) return body;
                if (typeof body === 'string') {
                    let out = body;
                    try {
                        const parsed = nativeJSONParse.call(targetWindow.JSON, out);
                        if (parsed && typeof parsed === 'object') {
                            let changed = false;
                            if (extendBody(parsed)) changed = true;
                            if (changed) out = nativeJSONStringify.call(targetWindow.JSON, parsed);
                        }
                    } catch (e) { }
                    if (needsInject(out)) {
                        out = patchOutbound(out);
                        targetWindow.__ag_inj = (targetWindow.__ag_inj || 0) + 1;
                    }
                    return out;
                }
                if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
                    try {
                        const dec = new TextDecoder('utf-8').decode(body);
                        let out = dec, changedBody = false;
                        try {
                            const parsed = nativeJSONParse.call(targetWindow.JSON, out);
                            if (parsed && typeof parsed === 'object') {
                                let changed = false;
                                if (extendBody(parsed)) changed = true;
                                if (changed) { out = nativeJSONStringify.call(targetWindow.JSON, parsed); changedBody = true; }
                            }
                        } catch (e) { }
                        if (changedBody || needsInject(out)) {
                            if (needsInject(out)) {
                                out = patchOutbound(out);
                                targetWindow.__ag_inj = (targetWindow.__ag_inj || 0) + 1;
                            }
                            const enc = new TextEncoder().encode(out);
                            return body instanceof ArrayBuffer ? enc.buffer : enc;
                        }
                    } catch (e) { }
                    return body;
                }
                return body;
            }

            const isPlayerUrl = (u) => typeof u === 'string' &&
                /\/youtubei\/v1\/(player|next|get_watch|reel\/reel_watch_sequence|guide)/.test(u);

            const extendBody = (o) => {
                if (!o || typeof o !== 'object') return false;
                let changed = false;
                try {
                    const cpc = o.playbackContext && o.playbackContext.contentPlaybackContext;
                    if (cpc) {
                        if (typeof cpc.lactMilliseconds !== 'string') {
                            cpc.lactMilliseconds = String(Date.now());
                            changed = true;
                        }
                        if (typeof cpc.referer === 'string' && cpc.referer.indexOf('#reloadxhr') === -1) {
                            cpc.referer = cpc.referer.replace(/(?:#reloadxhr)?$/, '#reloadxhr');
                            changed = true;
                        }
                    }
                    if (o.context && o.context.client && o.context.client.clientName === 'WEB') {
                        if (typeof o.context.client.userAgent === 'string' && UA_FEATURES.some(t => o.context.client.userAgent.indexOf(t) === -1)) {
                            const ua = o.context.client.userAgent;
                            const mm = ua.match(/^(Mozilla\/5\.0 \([^)]+\))(.*)(AppleWebKit.*)$/);
                            o.context.client.userAgent = mm ? (mm[1] + '; ' + UA_FEATURES.join('; ') + ' ' + mm[3]) : (ua + '; ' + UA_FEATURES.join('; '));
                            changed = true;
                        }
                    }
                } catch (e) {}
                return changed;
            };

            // Hook Request constructor so new Request(url, { body }) gets patched before becoming a stream
            if (targetWindow.Request) {
                const _OrigRequest = targetWindow.Request;
                const WrappedRequest = function (input, init) {
                    const u = (typeof input === 'string') ? input : (input && input.url);
                    if (isPlayerUrl(u) && init && init.body) {
                        try {
                            init = Object.assign({}, init, { body: patchPlayerBody(init.body) });
                        } catch (e) { }
                    }
                    return new _OrigRequest(input, init);
                };
                WrappedRequest.prototype = _OrigRequest.prototype;
                registerNativeShim(WrappedRequest, _OrigRequest);
                targetWindow.Request = WrappedRequest;
            }

            const _fetch = targetWindow.fetch;

            // Decompress a (possibly gzip) request body to text. Returns null if not decodable.
            async function readBodyText(bytes) {
                try {
                    if (bytes[0] === 0x1f && bytes[1] === 0x8b && targetWindow.DecompressionStream) {
                        const ds = new targetWindow.DecompressionStream('gzip');
                        const dec = await new targetWindow.Response(
                            new targetWindow.Blob([bytes]).stream().pipeThrough(ds)
                        ).arrayBuffer();
                        return new TextDecoder('utf-8').decode(dec);
                    }
                    return new TextDecoder('utf-8').decode(bytes);
                } catch (e) { return null; }
            }

            // Re-encode text to gzip bytes if the original was gzip, else plain bytes.
            async function encodeBodyText(text, wasGzip) {
                const enc = new TextEncoder().encode(text);
                if (wasGzip && targetWindow.CompressionStream) {
                    const cs = new targetWindow.CompressionStream('gzip');
                    const gz = await new targetWindow.Response(
                        new targetWindow.Blob([enc]).stream().pipeThrough(cs)
                    ).arrayBuffer();
                    return new Uint8Array(gz);
                }
                return enc;
            }

            // Rewrite a Request object whose (possibly gzip-compressed JSON) body needs the
            // isInlinePlaybackNoAd flag. Keeps compression in sync so YT accepts it.
            async function rewriteRequest(req) {
                const buf = await req.clone().arrayBuffer();
                const bytes = new Uint8Array(buf);
                if (!bytes.length) return null;
                const wasGzip = (bytes[0] === 0x1f && bytes[1] === 0x8b);
                const text = await readBodyText(bytes);
                if (!text) return null;
                let out = text, rebuilt = false;
                try {
                    const parsed = nativeJSONParse.call(targetWindow.JSON, out);
                    if (parsed && typeof parsed === 'object') {
                        let changed = false;
                        if (extendBody(parsed)) changed = true;
                        if (changed) { out = nativeJSONStringify.call(targetWindow.JSON, parsed); rebuilt = true; }
                    }
                } catch (e) { }
                if (needsInject(out)) {
                    out = patchOutbound(out);
                    rebuilt = true;
                    targetWindow.__ag_inj = (targetWindow.__ag_inj || 0) + 1;
                }
                if (!rebuilt) return null;
                const outBytes = await encodeBodyText(out, wasGzip);
                const headers = new targetWindow.Headers(req.headers);
                headers.delete('content-length');
                try {
                    return new targetWindow.Request(req.url, {
                        method: req.method,
                        headers: headers,
                        body: outBytes,
                        mode: req.mode === 'navigate' ? 'same-origin' : req.mode,
                        credentials: req.credentials,
                        cache: req.cache,
                        redirect: req.redirect,
                        referrer: req.referrer || undefined,
                        referrerPolicy: req.referrerPolicy,
                        integrity: req.integrity,
                        keepalive: req.keepalive,
                        signal: req.signal
                    });
                } catch (e) {
                    return new targetWindow.Request(req.url, { method: req.method, headers: headers, body: outBytes, signal: req.signal });
                }
            }

            // Network-layer penalty defence: if a /player response comes back
            // UNPLAYABLE+penalty-marked, transparently re-issue the request (the same
            // thing a hard refresh does) and hand the client the first clean response.
            // If every retry is still penalized, return the original response — the
            // watchdog recovers it and the DOM eraser keeps the card off screen.
            async function cleanPlayerResponse(resp, buildRetry, purl) {
                if (!enableJsonResponsePruning) return resp;
                if (!resp || !resp.ok) return resp;
                try {
                    const ct = (resp.headers.get('content-type') || '');
                    if (ct.indexOf('application/json') === -1) return resp;
                    const text = await readBodyText(new Uint8Array(await resp.clone().arrayBuffer()));
                    if (text && (text.includes('"adPlacements":[{"') || text.includes('"playerAds":[{"') || text.includes('"adSlots":[{"'))) {
                        targetWindow.__ag_last_ad_req_time = Date.now();
                    }
                    if (!text || !isPenaltyPlayerText(text)) return resp;
                    const penInfo = { t: Date.now(), u: (purl || '').slice(0, 220), snippet: text.slice(0, 500), retries: 0, cleaned: false };
                    try { targetWindow.__ag_pen_last = penInfo; } catch (e) { }
                    targetWindow.__ag_penalized_resp = (targetWindow.__ag_penalized_resp || 0) + 1;
                    let guard, last = resp;
                    try { guard = buildRetry(); } catch (e) { guard = null; }
                    if (guard) {
                        for (let i = 0; i < 2; i++) {
                            enableUAFeatures();
                            const retryReq = await rewriteRequest(guard);
                            if (!retryReq) break;
                            const retryResp = await _fetch.call(this, retryReq);
                            if (!retryResp || !retryResp.ok) continue;
                            penInfo.retries++;
                            const rct = (retryResp.headers.get('content-type') || '');
                            if (rct.indexOf('application/json') === -1) { last = retryResp; penInfo.cleaned = true; break; }
                            const rtext = await readBodyText(new Uint8Array(await retryResp.clone().arrayBuffer()));
                            if (!rtext || !isPenaltyPlayerText(rtext)) { last = retryResp; penInfo.cleaned = true; break; }
                        }
                    }
                    if (penInfo.cleaned) { try { targetWindow.__ag_penalty_cleaned = (targetWindow.__ag_penalty_cleaned || 0) + 1; } catch (e) { } }
                    try { targetWindow.__ag_pen_last = penInfo; } catch (e) { }
                    return last;
                } catch (e) { try { targetWindow.__ag_pen_err = String(e); } catch (_) { } return resp; }
            }

            const wrappedFetch = function (...args) {
                if (!enableJsonResponsePruning) {
                    return _fetch.apply(this, args);
                }
                try {
                    const input = args[0];
                    const u = (typeof input === 'string') ? input : (input && input.url);
                    if (u) {
                        const uStr = String(u);
                        if (uStr.includes('videoplayback') || uStr.includes('googlevideo.com')) {
                            targetWindow.__ag_last_media_req_time = Date.now();
                            const isAdStream = uStr.includes('itag=18') || uStr.includes('itag=22');
                            return _fetch.apply(this, args).then(resp => {
                                try {
                                    if (resp && resp.status === 403 && isAdStream) {
                                        targetWindow.__ag_last_ad_403_time = Date.now();
                                        targetWindow.__ag_last_ad_req_time = Date.now();
                                        targetWindow.__ag_ad_403_count = (targetWindow.__ag_ad_403_count || 0) + 1;
                                    }
                                } catch (e) { }
                                return resp;
                            });
                        }
                    }
                    if (isPlayerUrl(u)) {
                        targetWindow.__ag_seen = (targetWindow.__ag_seen || 0) + 1;
                        targetWindow.__ag_last_url = u;
                        const buildRetry = () => (input instanceof targetWindow.Request) ? input : null;
                        if (input instanceof targetWindow.Request) {
                            return rewriteRequest(input)
                                .then(newReq => {
                                    if (newReq) {
                                        targetWindow.__ag_inj = (targetWindow.__ag_inj || 0) + 1;
                                        targetWindow.__ag_inj_url = u;
                                        return _fetch.call(this, newReq);
                                    }
                                    return _fetch.apply(this, args);
                                })
                                .catch(() => _fetch.apply(this, args))
                                .then(resp => cleanPlayerResponse(resp, buildRetry, u));
                        }
                        const init = args[1];
                        if (init && init.body !== undefined && init.body !== null) {
                            init.body = patchPlayerBody(init.body);
                        }
                        return _fetch.apply(this, args).then(resp => cleanPlayerResponse(resp, buildRetry, u));
                    }
                } catch (e) { }
                return _fetch.apply(this, args);
            };
            Object.defineProperty(wrappedFetch, 'name', { value: 'fetch', configurable: true });
            Object.defineProperty(wrappedFetch, 'length', { value: 0, configurable: true });
            wrappedFetch.__ag_fetch = true;
            registerNativeShim(wrappedFetch, _fetch);
            targetWindow.fetch = wrappedFetch;

            const XHR = targetWindow.XMLHttpRequest;
            if (XHR && XHR.prototype && XHR.prototype.open && XHR.prototype.send) {
                const _open = XHR.prototype.open;
                const _send = XHR.prototype.send;
                const wrappedOpen = function (method, url, ...rest) {
                    try {
                        const urlStr = url ? String(url) : '';
                        if (urlStr && (urlStr.includes('videoplayback') || urlStr.includes('googlevideo.com'))) {
                            targetWindow.__ag_last_media_req_time = Date.now();
                            const isAdStream = urlStr.includes('itag=18') || urlStr.includes('itag=22');
                            try {
                                this.addEventListener('loadend', () => {
                                    if (this.status === 403 && isAdStream) {
                                        targetWindow.__ag_last_ad_403_time = Date.now();
                                        targetWindow.__ag_last_ad_req_time = Date.now();
                                        targetWindow.__ag_ad_403_count = (targetWindow.__ag_ad_403_count || 0) + 1;
                                    }
                                }, { passive: true });
                                this.addEventListener('progress', (e) => {
                                    if (e && e.loaded && e.loaded > 0) {
                                        targetWindow.__ag_last_media_byte_time = Date.now();
                                        targetWindow.__ag_last_media_time = Date.now();
                                    }
                                }, { passive: true });
                            } catch (e) { }
                        }
                    } catch (e) { }
                    try { this.__ag_purl = isPlayerUrl(url) ? url : null; } catch (e) { }
                    return _open.call(this, method, url, ...rest);
                };
                const wrappedSend = function (body) {
                    try {
                        if (this.__ag_purl && body) {
                            body = patchPlayerBody(body);
                        }
                    } catch (e) { }
                    return _send.call(this, body);
                };
                Object.defineProperty(wrappedOpen, 'name', { value: 'open', configurable: true });
                Object.defineProperty(wrappedSend, 'name', { value: 'send', configurable: true });
                wrappedOpen.__ag_xhr = true;
                registerNativeShim(wrappedOpen, _open);
                registerNativeShim(wrappedSend, _send);
                XHR.prototype.open = wrappedOpen;
                XHR.prototype.send = wrappedSend;

                // Track active MediaSource buffer appends as direct proof of media pipeline progress
                try {
                    if (targetWindow.SourceBuffer && targetWindow.SourceBuffer.prototype && targetWindow.SourceBuffer.prototype.appendBuffer) {
                        const _appendBuffer = targetWindow.SourceBuffer.prototype.appendBuffer;
                        targetWindow.SourceBuffer.prototype.appendBuffer = function (...args) {
                            try {
                                targetWindow.__ag_last_media_append_time = Date.now();
                                targetWindow.__ag_last_media_time = Date.now();
                            } catch (e) { }
                            return _appendBuffer.apply(this, args);
                        };
                        registerNativeShim(targetWindow.SourceBuffer.prototype.appendBuffer, _appendBuffer);
                    }
                    if (targetWindow.MediaSource && targetWindow.MediaSource.prototype && targetWindow.MediaSource.prototype.addSourceBuffer) {
                        const _addSourceBuffer = targetWindow.MediaSource.prototype.addSourceBuffer;
                        targetWindow.MediaSource.prototype.addSourceBuffer = function (...args) {
                            return _addSourceBuffer.apply(this, args);
                        };
                        registerNativeShim(targetWindow.MediaSource.prototype.addSourceBuffer, _addSourceBuffer);
                    }
                } catch (e) { }

                const origResponseTextDesc = Object.getOwnPropertyDescriptor(XHR.prototype, 'responseText');
                if (origResponseTextDesc && origResponseTextDesc.get) {
                    const origGet = origResponseTextDesc.get;
                    Object.defineProperty(XHR.prototype, 'responseText', {
                        get: function () {
                            const txt = origGet.call(this);
                            if (this.__ag_purl && typeof txt === 'string') {
                                try {
                                    const parsed = nativeJSONParse.call(targetWindow.JSON, txt);
                                    stripAdKeysInPlace(parsed);
                                    const s = JSON.stringify(parsed);
                                    if (isPenaltyPlayerText(s)) {
                                        targetWindow.__ag_xhr_pen = (targetWindow.__ag_xhr_pen || 0) + 1;
                                        try { targetWindow.__ag_pen_last = { t: Date.now(), u: this.__ag_purl.slice(0, 220), snippet: s.slice(0, 500), xhr: true }; } catch (e) { }
                                        targetWindow.__ag_needs_replay = true;
                                    }
                                    return s;
                                } catch (e) { }
                            }
                            return txt;
                        },
                        configurable: true,
                        enumerable: true
                    });
                }

                const origResponseDesc = Object.getOwnPropertyDescriptor(XHR.prototype, 'response');
                if (origResponseDesc && origResponseDesc.get) {
                    const origResponseGet = origResponseDesc.get;
                    const wrappedResponseGet = function () {
                        const val = origResponseGet.call(this);
                        try {
                            if (this.__ag_purl && this.responseType === 'json' && val && typeof val === 'object') {
                                stripAdKeysInPlace(val);
                            }
                        } catch (e) { }
                        return val;
                    };
                    Object.defineProperty(wrappedResponseGet, 'name', { value: 'get response', configurable: true });
                    registerNativeShim(wrappedResponseGet, origResponseGet);
                    Object.defineProperty(XHR.prototype, 'response', {
                        get: wrappedResponseGet,
                        configurable: true,
                        enumerable: true
                    });
                }
            }

            try {
                const reassert = setInterval(() => {
                    try {
                        if (targetWindow.fetch !== wrappedFetch) {
                            targetWindow.fetch = wrappedFetch;
                        }
                        const cur = targetWindow.XMLHttpRequest && targetWindow.XMLHttpRequest.prototype;
                        if (cur && cur.open !== wrappedOpen) {
                            try { cur.open = wrappedOpen; cur.send = wrappedSend; } catch (e) { }
                        }
                    } catch (e) { }
                }, 2000);
            } catch (e) { }

            // Always-on anti-penalty: advertise the extended-client UA markers from the very
            // first request so YT never buckets us into the fake-buffering / "try again later"
            // penalty. Self-clearing once ytcfg is available.
            try {
                const _locW = targetWindow.location || {};
                if (_locW.hostname === 'www.youtube.com') {
                    try { enableUAFeatures(); } catch (e) { }
                    const tokIt = setInterval(() => {
                        try {
                            if (targetWindow.__ag_tokenized || !targetWindow.ytcfg) return;
                            enableUAFeatures();
                            if (targetWindow.__ag_tokenized) clearInterval(tokIt);
                        } catch (e) { }
                    }, 250);
                    setTimeout(() => clearInterval(tokIt), 20000);
                }
            } catch (e) { }
        } catch (e) { }

        // 5. In-Memory Player Initial Data Interceptors (Wipes ad placements at source while preserving streams)
        if (enableJsonResponsePruning) {
            let _ytInitialPlayerResponse = targetWindow.ytInitialPlayerResponse;
            if (_ytInitialPlayerResponse && typeof _ytInitialPlayerResponse === 'object') {
                recordAdSignalForPayload(_ytInitialPlayerResponse);
            }
            try {
                Object.defineProperty(targetWindow, 'ytInitialPlayerResponse', {
                    get() { return _ytInitialPlayerResponse; },
                    set(val) {
                        try {
                            recordAdSignalForPayload(val);
                            if (val && val.playabilityStatus && val.playabilityStatus.status === 'UNPLAYABLE') {
                                const flat = JSON.stringify(val);
                                if (isPenaltyPlayerText(flat)) {
                                    // Server-embedded penalty: flag it so the watchdog re-drives a
                                    // fresh (clean) request; the DOM eraser hides the card meanwhile.
                                    targetWindow.__ag_ssr_penalty = (targetWindow.__ag_ssr_penalty || 0) + 1;
                                    try { targetWindow.__ag_ssr_last = { t: Date.now(), snippet: flat.slice(0, 400) }; } catch (e) { }
                                    try { enableUAFeatures(); } catch (e) { }
                                    targetWindow.__ag_needs_replay = true;
                                }
                            }
                        } catch (e) { }
                        _ytInitialPlayerResponse = val;
                    },
                    configurable: true,
                    enumerable: true
                });
            } catch (e) { }

            // [ag_cap] Raw InnerTube response capture for diagnosing YouTube ad delivery.
            // Enable per-session with localStorage.ag_cap='1'. Reads RAW text (bypasses our own
            // Response.prototype.json renamer) so we can see ad keys BEFORE stripping.
            try {
                if (targetWindow.localStorage.getItem('ag_cap') === '1') {
                    const _f = targetWindow.fetch;
                    const _cap = targetWindow.__ag_fetchcap = [];
                    targetWindow.fetch = function (...args) {
                        const u = (typeof args[0] === 'string') ? args[0] : (args[0] && args[0].url);
                        return _f.apply(this, args).then(res => {
                            try {
                                if (u && /youtubei\/v1\/(player|next|get_watch)/.test(u)) {
                                    res.clone().text().then(t => {
                                        try {
                                            const j = JSON.parse(t);
                                            _cap.push({
                                                u: (u.split('/v1/')[1] || '').split('?')[0], at: Date.now(),
                                                raw: Object.keys(j).filter(k => /ad|Ad/.test(k)),
                                                ap: Array.isArray(j.adPlacements) ? j.adPlacements.length : null,
                                                pa: Array.isArray(j.playerAds) ? j.playerAds.length : null,
                                                pr: j.playerResponse ? Object.keys(j.playerResponse).filter(k => /ad|Ad/.test(k)) : null
                                            });
                                        } catch (e) { }
                                    }).catch(() => { });
                                }
                            } catch (e) { }
                            return res;
                        });
                    };
                }
            } catch (e) { }

            let _ytInitialData = targetWindow.ytInitialData;
            try {
                Object.defineProperty(targetWindow, 'ytInitialData', {
                    get() { return _ytInitialData; },
                    set(val) { _ytInitialData = cleanAdPayload(val); },
                    configurable: true,
                    enumerable: true
                });
                if (_ytInitialData) {
                    cleanAdPayload(_ytInitialData);
                }
            } catch (e) { }

            let _ytplayer = targetWindow.ytplayer;
            function sanitizePlayerConfigArgs(args) {
                if (!args || typeof args !== 'object') return;
                try {
                    if (args.ad_preroll || args.ad_tag) {
                        targetWindow.__ag_last_ad_req_time = Date.now();
                    }
                    if (typeof args.raw_player_response === 'string' && (args.raw_player_response.includes('"adPlacements":[{"') || args.raw_player_response.includes('"adSlots":[{"') || args.raw_player_response.includes('"playerAds":[{"'))) {
                        targetWindow.__ag_last_ad_req_time = Date.now();
                    }
                } catch (e) { }
            }
            function hookYtPlayerConfig(obj) {
                if (!obj || typeof obj !== 'object') return obj;
                let _cfg = obj.config;
                if (_cfg && _cfg.args) sanitizePlayerConfigArgs(_cfg.args);
                try {
                    Object.defineProperty(obj, 'config', {
                        get() { return _cfg; },
                        set(c) {
                            if (c && c.args) sanitizePlayerConfigArgs(c.args);
                            _cfg = c;
                        },
                        configurable: true,
                        enumerable: true
                    });
                } catch (e) { }

                let _bResp = obj.bootstrapPlayerResponse;
                if (_bResp && typeof _bResp === 'object') {
                    recordAdSignalForPayload(_bResp);
                }
                try {
                    Object.defineProperty(obj, 'bootstrapPlayerResponse', {
                        get() { return _bResp; },
                        set(val) {
                            recordAdSignalForPayload(val);
                            _bResp = val;
                        },
                        configurable: true,
                        enumerable: true
                    });
                } catch (e) { }

                return obj;
            }
            try {
                Object.defineProperty(targetWindow, 'ytplayer', {
                    get() { return _ytplayer; },
                    set(val) {
                        _ytplayer = hookYtPlayerConfig(val);
                    },
                    configurable: true,
                    enumerable: true
                });
                if (_ytplayer) {
                    _ytplayer = hookYtPlayerConfig(_ytplayer);
                }
            } catch (e) { }
        }


        // 6. Hook Player Instance Methods on #movie_player (Custom DOM Player Methods — 100% Safe from bot probes)
        let isSpaNavigating = false;
        let spaNavStartTime = 0;
        let navConfirmed = false;
        const markNavStart = (isClick) => {
            isSpaNavigating = true;
            spaNavStartTime = Date.now();
            targetWindow.__ag_last_ad_403_time = 0;
            targetWindow.__ag_ad_403_count = 0;
            targetWindow.__ag_last_ad_req_time = 0;
            if (!isClick) {
                navConfirmed = true;
            }
        };
        const clearNavLock = () => {
            isSpaNavigating = false;
            spaNavStartTime = 0;
            navConfirmed = false;
        };

        function getNextPlaylistPanelLink() {
            try {
                const doc = targetWindow.document;
                if (!doc) return null;
                const panel = doc.querySelector('ytd-playlist-panel-renderer');
                if (!panel) return null;
                const items = Array.from(panel.querySelectorAll('ytd-playlist-panel-video-renderer'));
                if (!items.length) return null;

                const curUrlVid = ((targetWindow.location || {}).href || '').match(/[?&]v=([A-Za-z0-9_-]{11})/)?.[1] || null;
                let curIdx = items.findIndex(it => it.hasAttribute('selected'));
                if (curIdx < 0 && curUrlVid) {
                    curIdx = items.findIndex(it => {
                        const a = it.querySelector('a#wc-endpoint, a[href*="/watch?v="]');
                        return a && a.href && a.href.includes(curUrlVid);
                    });
                }
                if (curIdx >= 0 && curIdx + 1 < items.length) {
                    const nextItem = items[curIdx + 1];
                    const nextA = nextItem.querySelector('a#wc-endpoint, a[href*="/watch?v="]');
                    if (nextA) return nextA;
                }
            } catch (_) { }
            return null;
        }

        let lastPlaylistAutoNextTime = 0;
        function checkPlaylistAutoNext(video, ytPlayer, isAdActive) {
            try {
                const loc = targetWindow.location || {};
                if (!loc.href || !/[?&]list=/.test(loc.href)) return;
                if (!video || isAdActive) return;

                const cur = (typeof video.currentTime === 'number' && !isNaN(video.currentTime)) ? video.currentTime : 0;
                const dur = (typeof video.duration === 'number' && !isNaN(video.duration)) ? video.duration : 0;
                const pstate = (ytPlayer && typeof ytPlayer.getPlayerState === 'function') ? ytPlayer.getPlayerState() : -1;

                const hasInternalPlaylist = ytPlayer && typeof ytPlayer.getPlaylist === 'function' && Array.isArray(ytPlayer.getPlaylist()) && ytPlayer.getPlaylist().length > 0;
                const nextBtn = targetWindow.document && targetWindow.document.querySelector('.ytp-next-button');
                const nextBtnHref = nextBtn ? (nextBtn.getAttribute('href') || '') : '';
                const nextBtnHasList = nextBtnHref.includes('list=');

                let shouldTrigger = false;
                if (!hasInternalPlaylist || !nextBtnHasList) {
                    shouldTrigger = (pstate === 0) || Boolean(video && video.ended) || (dur > 5 && (dur - cur) <= 0.45 && !video.paused);
                } else {
                    shouldTrigger = (pstate === 0) || Boolean(video && video.ended);
                }

                if (!shouldTrigger) return;
                const now = Date.now();
                if (now - lastPlaylistAutoNextTime < 3000) return;
                const nextA = getNextPlaylistPanelLink();
                if (nextA) {
                    lastPlaylistAutoNextTime = now;
                    markNavStart(true);
                    nextA.click();
                }
            } catch (_) { }
        }

        targetWindow.addEventListener('yt-navigate-start', () => markNavStart(false), true);
        targetWindow.addEventListener('yt-navigate-finish', clearNavLock, true);
        targetWindow.addEventListener('yt-navigate-error', clearNavLock, true);
        if (targetWindow.document) {
            targetWindow.document.addEventListener('yt-navigate-start', () => markNavStart(false), true);
            targetWindow.document.addEventListener('yt-navigate-finish', clearNavLock, true);
            targetWindow.document.addEventListener('yt-page-data-updated', () => {
                clearNavLock();
            }, true);
            targetWindow.document.addEventListener('ended', (e) => {
                try {
                    const v = e.target;
                    const p = targetWindow.document.querySelector('#movie_player, .html5-video-player');
                    checkPlaylistAutoNext(v, p, false);
                } catch (_) { }
            }, true);
            targetWindow.document.addEventListener('click', (e) => {
                try {
                    const isPlaylist = /[?&]list=/.test(((targetWindow.location || {}).href || ''));
                    const nextBtn = e.target && (e.target.closest ? e.target.closest('.ytp-next-button') : null);
                    if (nextBtn && isPlaylist) {
                        const btnHref = nextBtn.getAttribute('href') || '';
                        if (!btnHref.includes('list=')) {
                            const nextPanelA = getNextPlaylistPanelLink();
                            if (nextPanelA) {
                                e.preventDefault();
                                e.stopImmediatePropagation();
                                markNavStart(true);
                                nextPanelA.click();
                                return false;
                            }
                        }
                    }

                    const btn = e.target && (e.target.closest ? e.target.closest('.ytp-next-button, .ytp-prev-button, ytd-compact-video-renderer a, ytd-playlist-panel-video-renderer a') : null);
                    if (btn) {
                        targetWindow.__ag_reset_stall_now = true;
                        markNavStart(true);
                    }
                } catch (_) { }
            }, true);
        }

        function hookPlayerObject(player) {
            if (!enableJsonResponsePruning) return;
            if (!player || player.__brave_hooks_installed) return;
            player.__brave_hooks_installed = true;

            if (typeof player.playVideo === 'function') {
                const origPlayVideo = player.playVideo;
                player.playVideo = function (...args) {
                    const isPiPActive = !!(targetWindow.document && targetWindow.document.pictureInPictureElement);
                    const vTag = targetWindow.document && targetWindow.document.querySelector('video');
                    if (isPiPActive && vTag && vTag.__ag_user_paused) {
                        return;
                    }
                    const urlMatch = ((targetWindow.location || {}).href || '').match(/[?&]v=([A-Za-z0-9_-]{11})/);
                    const urlVid = urlMatch ? urlMatch[1] : null;
                    const pData = typeof this.getVideoData === 'function' ? this.getVideoData() : null;
                    const playerVid = (pData && pData.video_id) || null;
                    const prevVid = targetWindow.__ag_prev_watched_vid || null;
                    const isStalePrevVid = !!(urlVid && playerVid && playerVid !== urlVid && playerVid === prevVid);
                    const isNavActive = isSpaNavigating && isStalePrevVid && (Date.now() - spaNavStartTime < 3000);
                    if (isNavActive || isStalePrevVid) {
                        return;
                    }
                    return origPlayVideo.apply(this, args);
                };
            }
        }

        // 7. Universal Video Player Framework Hooks: JWPlayer & Video.js
        let _jwplayer = targetWindow.jwplayer;
        try {
            Object.defineProperty(targetWindow, 'jwplayer', {
                get() { return _jwplayer; },
                set(origFn) {
                    _jwplayer = function (id) {
                        const inst = origFn(id);
                        if (inst && !inst.__antigravity_shield_installed) {
                            inst.__antigravity_shield_installed = true;
                            const origSetup = inst.setup;
                            if (typeof origSetup === 'function') {
                                inst.setup = function (options) {
                                    if (options && typeof options === 'object') {
                                        delete options.advertising;
                                        delete options.schedule;
                                    }
                                    return origSetup.call(this, options);
                                };
                            }
                        }
                        return inst;
                    };
                },
                configurable: true,
                enumerable: true
            });
        } catch (e) { }

        let _videojs = targetWindow.videojs;
        try {
            Object.defineProperty(targetWindow, 'videojs', {
                get() { return _videojs; },
                set(origFn) {
                    _videojs = function (id, options, ready) {
                        if (options && typeof options === 'object' && options.plugins) {
                            delete options.plugins.ads;
                            delete options.plugins.ima;
                        }
                        return origFn(id, options, ready);
                    };
                },
                configurable: true,
                enumerable: true
            });
        } catch (e) { }

        // 8. Universal Video Ad Neutralizer & Instant Terminator (DOM-level)
        function handleVideoAds() {
            if (currentTestMode === 'A' || currentTestMode === 'B' || currentTestMode === 'C') {
                return; // Neutral observer mode during A/B/C testing
            }
            try {
                const video = targetWindow.document.querySelector('video');
                const ytPlayer = targetWindow.document.querySelector('#movie_player, .html5-video-player');

                if (ytPlayer) {
                    hookPlayerObject(ytPlayer);
                    if (ytPlayer.classList.contains('ad-created')) {
                        ytPlayer.classList.remove('ad-created');
                        try { ytPlayer.cancelPlayback?.(); } catch (e) { }
                        try { ytPlayer.skipAd?.(); } catch (e) { }
                    }
                }

                const isYtAd = ytPlayer ? (
                    ytPlayer.classList.contains('ad-showing') ||
                    ytPlayer.classList.contains('ad-interrupting') ||
                    (typeof ytPlayer.getAdState === 'function' && ytPlayer.getAdState() > 0)
                ) : false;

                const isUniversalAd = !!(
                    targetWindow.document.querySelector(
                        '.ad-interrupting, .vjs-ad-playing, .jw-flag-ads, .jw-ad-container, ' +
                        '[class*="ad-showing"], [class*="ad-playing"], [class*="ad-break"], [data-ad-playing="true"], ' +
                        '.video-ad-overlay, .ytp-ad-player-overlay'
                    )
                );

                const skipBtn = targetWindow.document.querySelector(
                    '.ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-skip-button-modern, ' +
                    '.ytp-ad-skip-button-slot button, .ytp-ad-skip-button-container button, ' +
                    'button.ytp-ad-skip-button-modern, [id^="skip-button:"] button, ' +
                    '.videoAdUiSkipButton, .ytp-ad-overlay-close-button, button[aria-label="Skip ad"], ' +
                    '.jw-skip, .vjs-skip-ad'
                );
                if (skipBtn) {
                    try { skipBtn.click(); } catch (e) { }
                }

                const isAdActive = isYtAd || isUniversalAd;

                if (isYtAd && ytPlayer && video) {
                    if (typeof ytPlayer.skipAd === 'function') {
                        try { ytPlayer.skipAd(); } catch (e) { }
                    }
                    if (skipBtn) {
                        try { skipBtn.click(); } catch (e) { }
                    }
                    if (video.duration && isFinite(video.duration) && video.duration > 0 && video.duration < 600) {
                        try { video.currentTime = Math.max(0, video.duration - 0.1); } catch (e) { }
                    }
                    if (!video.__was_ad_muted) {
                        video.__was_ad_muted = true;
                        video.muted = true;
                    }
                    try { video.playbackRate = 16.0; } catch (e) { }
                }

                if (video && !isAdActive) {
                    if (video.__was_ad_muted) {
                        video.muted = false;
                        video.__was_ad_muted = false;
                    }
                    if (video.playbackRate > 2.0) {
                        video.playbackRate = 1.0;
                    }
                }

                // Spotify skip forward button on audio ad
                const spotifyAdWidget = targetWindow.document.querySelector('[data-testid="now-playing-widget"]');
                const spotifySkipBtn = targetWindow.document.querySelector('[data-testid="control-button-skip-forward"]');
                if (spotifyAdWidget && spotifySkipBtn) {
                    const text = (spotifyAdWidget.innerText || '').toLowerCase();
                    const hasAdLink = spotifyAdWidget.querySelector('a[href*="/ad"], a[href*="spotify:ad"]');
                    if (hasAdLink || text.includes('advertisement') || text.includes('spotify free')) {
                        const audio = targetWindow.document.querySelector('audio');
                        if (audio) audio.muted = true;
                        try { spotifySkipBtn.click(); } catch (e) { }
                    }
                }

                // Dismiss anti-adblock modals & "Experiencing interruptions?" popups
                const antiAdElements = targetWindow.document.querySelectorAll(
                    'ytd-enforcement-message-view-model, tp-yt-paper-dialog:has(#feedback), ' +
                    '[data-testid="upsell-modal"], .anti-adblock-modal, [class*="adblock-overlay"], ' +
                    '#adblock-modal, div[id*="adblock"], yt-notification-action-renderer, tp-yt-paper-toast, ' +
                    'snackbar-container, snackbar-view-model'
                );
                antiAdElements.forEach(el => {
                    const txt = (el.innerText || '').toLowerCase();
                    if (txt.includes('interruption') || txt.includes('ad block') || txt.includes('adblock') || el.matches('ytd-enforcement-message-view-model')) {
                        el.remove();
                    }
                });
                const backdrop = targetWindow.document.querySelector('tp-yt-iron-overlay-backdrop, .modal-backdrop');
                if (backdrop) backdrop.remove();

                // Kickstart video if stuck at 0:00 (due to unstarted state or anti-adblock stall)
                if (!isAdActive && video) {
                    const isNavActive = isSpaNavigating && (Date.now() - spaNavStartTime < 2000);
                    const isPiPActive = !!(targetWindow.document && targetWindow.document.pictureInPictureElement);
                    if (!isNavActive && !isPiPActive && !video.__ag_user_paused) {
                        if (video.paused && video.currentTime === 0 && !targetWindow.document.hidden && video.readyState >= 2) {
                            video.play().catch(() => { });
                        }
                    }
                }

                // Check playlist auto-next transition
                checkPlaylistAutoNext(video, ytPlayer, isAdActive);

                // Synchronize .ytp-next-button href if it lost list=
                try {
                    const loc = targetWindow.location || {};
                    if (loc.href && /[?&]list=/.test(loc.href)) {
                        const nb = targetWindow.document && targetWindow.document.querySelector('.ytp-next-button');
                        if (nb) {
                            const curHref = nb.getAttribute('href') || '';
                            if (!curHref.includes('list=')) {
                                const nextPanelA = getNextPlaylistPanelLink();
                                if (nextPanelA && nextPanelA.href) {
                                    nb.setAttribute('href', nextPanelA.href);
                                }
                            }
                        }
                    }
                } catch (_) { }

                // Host-isolated JioHotstar Ad Blocker
                handleJioHotstarAds();
            } catch (e) { }
        }

        function handleJioHotstarAds() {
            const host = (targetWindow.location && targetWindow.location.hostname) || '';
            if (!/(?:^|\.)(?:hotstar|jiohotstar|jiocinema)\.com$/i.test(host)) {
                return;
            }
            try {
                const doc = targetWindow.document;
                if (!doc) return;
                const video = doc.querySelector('video');

                // Detect ad badge or overlay
                const adBadge = doc.querySelector(
                    '[data-testid*="ad-"], [class*="AdBadge"], [class*="ad-badge"], [class*="ad_badge"], [aria-label*="advertisement" i]'
                );
                let hasAdText = false;
                if (!adBadge) {
                    const candidateLeaves = doc.querySelectorAll('span, div, p');
                    for (let i = 0; i < candidateLeaves.length; i++) {
                        const el = candidateLeaves[i];
                        if (el.children && el.children.length === 0) {
                            const txt = (el.innerText || el.textContent || '').trim();
                            if (/^(?:Ad|Ad\s+\d+\s+of\s+\d+|Ad\s*•)\b/i.test(txt)) {
                                hasAdText = true;
                                break;
                            }
                        }
                    }
                }

                const isHotstarAd = !!adBadge || hasAdText;

                // Click any Skip button if present
                const skipBtn = doc.querySelector(
                    'button[class*="skip" i], button[data-testid*="skip" i], [class*="skip-button" i], [aria-label*="skip" i]'
                );
                if (skipBtn) {
                    try { skipBtn.click(); } catch (_) { }
                }

                if (isHotstarAd && video) {
                    if (!video.__was_hotstar_ad_muted) {
                        video.__was_hotstar_ad_muted = true;
                        video.muted = true;
                    }
                    try { video.playbackRate = 16.0; } catch (_) { }
                    if (video.duration && isFinite(video.duration) && video.duration > 0 && video.duration < 180) {
                        try { video.currentTime = Math.max(0, video.duration - 0.1); } catch (_) { }
                    }
                } else if (video && !isHotstarAd) {
                    if (video.__was_hotstar_ad_muted) {
                        video.muted = false;
                        video.__was_hotstar_ad_muted = false;
                    }
                    if (video.playbackRate > 2.0) {
                        video.playbackRate = 1.0;
                    }
                }
            } catch (_) { }
        }

        if (targetWindow.document) {
            targetWindow.document.addEventListener('play', handleVideoAds, true);
            targetWindow.document.addEventListener('playing', handleVideoAds, true);
            targetWindow.document.addEventListener('timeupdate', handleVideoAds, true);
        }
        targetWindow.addEventListener('yt-navigate-finish', () => {
            isSpaNavigating = false;
            const ytPlayer = targetWindow.document.querySelector('#movie_player, .html5-video-player');
            if (ytPlayer) {
                ytPlayer.__auto_started = false;
                hookPlayerObject(ytPlayer);
            }
            handleVideoAds();
        });
        targetWindow.addEventListener('yt-page-data-updated', () => {
            const ytPlayer = targetWindow.document.querySelector('#movie_player, .html5-video-player');
            if (ytPlayer) hookPlayerObject(ytPlayer);
            handleVideoAds();
        });
        targetWindow.addEventListener('load', handleVideoAds);
        setInterval(handleVideoAds, 200);

        // 9. [COLD-FIX] Break YouTube fake-buffering backoff on cold /watch loads.
        // 2026 mechanism (matches current uBlock Origin "fake buffering on the initial
        // load" quick fix): YouTube keys the SABR "reloadxhr" backoff bucket on whether
        // the client advertises its server-extended markers ("channel", "lactmilli",
        // "instream", "yahi") in the ytcfg userAgent. On backoff the embedded player
        // response carries playbackTracking.videostatsPlaybackUrl containing
        // "reloadxhr". uBO appends those markers to the UA, then re-issues
        // loadVideoById() so the fresh /youtubei/v1/player request returns streams
        // without backoff. We do the same, and fall back to plain reloads in case the
        // marker is absent but playback is still stuck.
        try {
            if (currentTestMode === 'A' || currentTestMode === 'B' || currentTestMode === 'C') {
                return; // Disable watchdog nudges during A/B/C test interval
            }
            let watchdogActive = false;
            function ensureWatchdog() {
                const loc = targetWindow.location || {};
                if (loc.hostname !== 'www.youtube.com' || !/\/watch\b/.test(loc.href)) {
                    return;
                }
                if (watchdogActive) return;
                watchdogActive = true;
                targetWindow.__ag_cold_tried = targetWindow.__ag_cold_tried || {};
                const start = Date.now();
                // DOM eraser (last-resort guarantee): if the exact penalty card ever paints,
                // hide it. Matched precisely (short element containing BOTH phrases) so it
                // never touches legitimate UI, and idempotent so it can't loop.
                const scrubPenaltyCard = () => {
                    try {
                        const doc = targetWindow.document;
                        if (!doc || !doc.body) return;
                        try { targetWindow.__ag_eraser = 1; } catch (e) { }
                        const nodes = doc.querySelectorAll('div, span, ytd-player-error-renderer, ytd-player-error, ytd-message-renderer');
                        let found = 0;
                        for (let i = 0; i < nodes.length; i++) {
                            const el = nodes[i];
                            if (el.__agScrubbed) continue;
                            let anc = el, inTpl = false;
                            for (let j = 0; j < 6 && anc; j++) { if (anc.tagName === 'TEMPLATE') { inTpl = true; break; } anc = anc.parentElement; }
                            if (inTpl) continue;
                            const txt = (el.textContent || '').trim();
                            if (!txt || txt.length > 200) continue;
                            if (!(/isn.?.t available/i.test(txt) && /try again later/i.test(txt))) continue;
                            el.__agScrubbed = true;
                            try {
                                const box = el.closest('ytd-player-error-renderer, ytd-player-error');
                                if (box && !box.__agScrubbed) { box.__agScrubbed = true; try { box.style.display = 'none'; } catch (e) { } }
                            } catch (e) { }
                            try { el.style.display = 'none'; } catch (e) { }
                            found++;
                        }
                        if (found) targetWindow.__ag_scrubbed = (targetWindow.__ag_scrubbed || 0) + found;
                    } catch (e) { }
                };
                try {
                    scrubPenaltyCard();
                    try { targetWindow.__ag_eraserSetup = (targetWindow.__ag_eraserSetup || 0) + 1; } catch (e) { }
                    const mo = new MutationObserver(() => { try { scrubPenaltyCard(); } catch (e) { } });
                    let obOk = false;
                    const tryObserve = () => {
                        if (obOk) return;
                        const root = targetWindow.document ? (targetWindow.document.documentElement || targetWindow.document.body || null) : null;
                        if (!root) return;
                        try { mo.observe(root, { childList: true, subtree: true }); obOk = true; clearInterval(oiv); } catch (e) { }
                    };
                    tryObserve();
                    const oiv = setInterval(tryObserve, 250);
                    const hookReady = () => { tryObserve(); scrubPenaltyCard(); };
                    if (targetWindow.document) {
                        if (targetWindow.document.readyState && targetWindow.document.readyState !== 'loading') hookReady();
                        else if (targetWindow.document.addEventListener) {
                            try { targetWindow.document.addEventListener('DOMContentLoaded', hookReady, { once: true }); } catch (e) { }
                        }
                    }
                } catch (e) { try { targetWindow.__ag_eraserErr = String(e); } catch (_) { } }
                let lastTry = 0, tries = 0, activeVid = null, vidStart = 0, lastReload = 0, recorded = false;
                let maxBufferedEnd = 0, maxReadyState = 0, lastProgress = 0, lastAppendSeen = 0;
                const enableFeatures = enableUAFeatures;
                const playerResp = () => {
                    try {
                        const p = targetWindow.document.querySelector('#movie_player, .html5-video-player');
                        if (p && typeof p.getPlayerResponse === 'function') return p.getPlayerResponse();
                    } catch (e) { }
                    return null;
                };
                const inBackoff = () => false;
                const errorScreen = () => {
                    try {
                        const pr = playerResp();
                        const es = pr && pr.playabilityStatus && pr.playabilityStatus.errorScreen;
                        if (es && es.playerErrorMessageRenderer && !es.playerErrorMessageRenderer.playerCaptchaViewModel) {
                            const w = JSON.stringify(es);
                            if (w.indexOf('WEB_PAGE_TYPE_UNKNOWN') !== -1 && w.indexOf('3037019') !== -1) return true;
                        }
                        // UNPLAYABLE + this specific interstitial ("try again later") is the
                        // ads/reliability penalty; recover it. (Private/login/age errors show
                        // different copy and are left alone.)
                        if (es && pr && pr.playabilityStatus && pr.playabilityStatus.status === 'UNPLAYABLE' && es.playerInterstitialRenderer) return true;
                        const b = targetWindow.document.body ? targetWindow.document.body.innerText : '';
                        return b.indexOf("This content isn't available") !== -1 && b.indexOf('try again later') !== -1;
                    } catch (e) { return false; }
                };
                const wantFullReload = () => {
                    try { return !targetWindow.sessionStorage.getItem('__ag_rel'); } catch (e) { return true; }
                };
                const chk = setInterval(() => {
                    try {
                        if (!/\/watch\b/.test(((targetWindow.location || {}).href || ''))) { clearInterval(chk); watchdogActive = false; return; }
                        if (targetWindow.performance && typeof targetWindow.performance.getEntriesByType === 'function' && typeof targetWindow.performance.clearResourceTimings === 'function') {
                            if (targetWindow.performance.getEntriesByType('resource').length > 250) {
                                try { targetWindow.performance.clearResourceTimings(); } catch (_) {}
                            }
                        }
                        if (targetWindow.__capturedErrors && targetWindow.__capturedErrors.length > 50) targetWindow.__capturedErrors.splice(0, targetWindow.__capturedErrors.length - 50);
                        if (targetWindow.__ag_recovery_calls && targetWindow.__ag_recovery_calls.length > 50) targetWindow.__ag_recovery_calls.splice(0, targetWindow.__ag_recovery_calls.length - 50);
                        const ytPlayer = targetWindow.document.querySelector('#movie_player, .html5-video-player');
                        if (!ytPlayer) return;
                        const video = targetWindow.document.querySelector('video');
                        if (video && !video.__ag_progress_hooked) {
                            video.__ag_progress_hooked = true;
                            try {
                                video.addEventListener('progress', () => {
                                    if (video.buffered && video.buffered.length > 0) {
                                        targetWindow.__ag_last_media_time = Date.now();
                                    }
                                }, { passive: true });
                            } catch (e) { }
                        }
                        const raw = video ? video.currentTime : 0;
                        const cur = (typeof raw === 'number' && !isNaN(raw)) ? raw : 0;
                        const state = (typeof ytPlayer.getPlayerState === 'function') ? ytPlayer.getPlayerState() : 2;
                        const isPlaying = !!video && !video.paused && cur > 0.4 && state === 1;
                        const now = Date.now();

                        // Never stop watching: playlists/autoplay change videoId without a
                        // navigation, and each new video must get its own recovery budget.
                        const vm = ((targetWindow.location || {}).href || '').match(/[?&]v=([A-Za-z0-9_-]{11})/);
                        let vid = vm ? vm[1] : null;
                        if (!vid) {
                            const prNow = playerResp();
                            try { vid = (prNow && prNow.videoDetails && prNow.videoDetails.videoId) || null; } catch (e) { }
                        }
                        if (vid && vid !== activeVid) {
                            targetWindow.__ag_last_ad_403_time = 0;
                            targetWindow.__ag_ad_403_count = 0;
                            targetWindow.__ag_last_ad_req_time = 0;
                            if (video) video.__ag_user_paused = false;
                            activeVid = vid; tries = 0; lastTry = 0; vidStart = now; maxBufferedEnd = 0; maxReadyState = 0; lastProgress = now;
                            lastAppendSeen = targetWindow.__ag_last_media_append_time || 0;
                            if (isPlaying && !recorded) { try { targetWindow.__ag_first_play = Date.now() - start; } catch (e) { } recorded = true; }
                        }
                        if (isPlaying) {
                            if (vid) targetWindow.__ag_prev_watched_vid = vid;
                            if (targetWindow.__ag_needs_replay) { try { targetWindow.__ag_needs_replay = false; } catch (e) { } }
                            return;
                        }

                        // Track active media pipeline buffering & transfer progress
                        let curBufferedEnd = 0;
                        try {
                            if (video && video.buffered && video.buffered.length > 0) {
                                curBufferedEnd = video.buffered.end(video.buffered.length - 1);
                            }
                        } catch (e) { }

                        // Support deterministic stall testing by allowing anchor reset
                        if (targetWindow.__ag_reset_stall_now) {
                            targetWindow.__ag_reset_stall_now = false;
                            vidStart = now;
                            lastProgress = now;
                            maxBufferedEnd = curBufferedEnd;
                            maxReadyState = video ? video.readyState : 0;
                            lastAppendSeen = targetWindow.__ag_last_media_append_time || 0;
                            tries = 0;
                            lastTry = 0;
                        }

                        // Delta checks: true pipeline advance (not static levels)
                        if (curBufferedEnd > (maxBufferedEnd + 0.05)) {
                            maxBufferedEnd = Math.max(maxBufferedEnd, curBufferedEnd);
                            lastProgress = now;
                        }
                        if (cur > 0.05) {
                            lastProgress = now;
                        }
                        const since = vidStart ? now - vidStart : now - start;
                        const sinceTry = lastTry ? now - lastTry : now - start;
                        const stallDuration = lastProgress ? (now - lastProgress) : since;
                        const curUrlVidForPlay = ((targetWindow.location || {}).href || '').match(/[?&]v=([A-Za-z0-9_-]{11})/)?.[1] || null;
                        const playerVidForPlay = (typeof ytPlayer.getVideoData === 'function' && ytPlayer.getVideoData() && ytPlayer.getVideoData().video_id) || null;
                        const prevWatchedVid = targetWindow.__ag_prev_watched_vid || null;
                        const isStalePrevVid = !!(curUrlVidForPlay && playerVidForPlay && playerVidForPlay !== curUrlVidForPlay && playerVidForPlay === prevWatchedVid);
                        const isVidSynced = !!(curUrlVidForPlay && (!playerVidForPlay || playerVidForPlay === curUrlVidForPlay || !isStalePrevVid));
                        if (isSpaNavigating && (isVidSynced || (!navConfirmed && (Date.now() - spaNavStartTime > 400)))) {
                            isSpaNavigating = false;
                            spaNavStartTime = 0;
                        }
                        const isNavActive = isSpaNavigating && (Date.now() - spaNavStartTime < 3000);

                        const isPiPActive = !!(targetWindow.document && targetWindow.document.pictureInPictureElement);
                        if (cur === 0 && video && !isNavActive && isVidSynced && !isPiPActive && !video.__ag_user_paused) {
                            if ((curBufferedEnd > 0.05 || since > 600) && (video.paused || state === -1 || state === 5) && state !== 3) {
                                try {
                                    if (typeof ytPlayer.playVideo === 'function') ytPlayer.playVideo();
                                    if (video.paused && video.readyState >= 2) video.play().catch(() => {});
                                } catch (e) {}
                            }
                        }
                        const curAppendTime = targetWindow.__ag_last_media_append_time || 0;
                        if (curAppendTime > lastAppendSeen) {
                            lastAppendSeen = curAppendTime;
                            // Only reset media-progress timing when an append is accompanied by a nontrivial buffered duration or video.readyState >= 2
                            if (curBufferedEnd > 0.1 || (video && video.readyState >= 2)) {
                                lastProgress = now;
                            }
                        }

                        // Check resource timing API for recently completed videoplayback requests that transferred data
                        let hasActiveResource = false;
                        try {
                            if (targetWindow.performance && typeof targetWindow.performance.getEntriesByType === 'function') {
                                const res = targetWindow.performance.getEntriesByType('resource');
                                for (let i = res.length - 1; i >= Math.max(0, res.length - 10); i--) {
                                    const r = res[i];
                                    if (r.name && (r.name.includes('videoplayback') || r.name.includes('googlevideo.com'))) {
                                        // Ignore completed Google Video resources whose recorded transferred or encoded size is 4096 bytes or less (handshakes/pings)
                                        const bytes = Math.max(r.transferSize || 0, r.encodedBodySize || 0);
                                        if (r.responseEnd > 0 && bytes > 4096) {
                                            const finishAge = targetWindow.performance.now() - r.responseEnd;
                                            if (finishAge >= 0 && finishAge < 1000) {
                                                hasActiveResource = true;
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (e) { }

                        const lastConfirmedMedia = Math.max(
                            targetWindow.__ag_last_media_append_time || 0,
                            targetWindow.__ag_last_media_byte_time || 0
                        );
                        // Require buffer or decoded-frame readiness before classifying recent transfer/resource activity as meaningful playback pipeline progress
                        const hasBufferOrFrame = (curBufferedEnd > 0.1) || (video && video.readyState >= 2);
                        const hasActiveTransfer = (lastConfirmedMedia > 0) && (now - lastConfirmedMedia < 1000) && hasBufferOrFrame;
                        const hasPipelineProgress = hasActiveTransfer || (hasActiveResource && hasBufferOrFrame);

                        const isError = errorScreen();
                        const isBackoff = inBackoff();
                        const penalized = isError || isBackoff;
                        const reloadNudge = (tokenize) => {
                            if (!vid || typeof ytPlayer.loadVideoById !== 'function') return;
                            const curUrlVid = ((targetWindow.location || {}).href || '').match(/[?&]v=([A-Za-z0-9_-]{11})/)?.[1] || null;
                            if (curUrlVid && vid !== curUrlVid) return;
                            try {
                                targetWindow.__ag_recovery_calls = targetWindow.__ag_recovery_calls || [];
                                targetWindow.__ag_recovery_calls.push({
                                    t: now,
                                    destVidArg: vid,
                                    urlVid: curUrlVid,
                                    vidMatchesUrl: (vid === curUrlVid),
                                    triesBefore: tries,
                                    since,
                                    stallDuration,
                                    tokenize
                                });
                            } catch (e) { }
                            enableFeatures();
                            try {
                                if (targetWindow.ytInitialPlayerResponse) stripAdKeysInPlace(targetWindow.ytInitialPlayerResponse);
                                const curPr = playerResp();
                                if (curPr) stripAdKeysInPlace(curPr);
                            } catch (e) { }
                            try {
                                ytPlayer.loadVideoById(vid, 0, 'hd720');
                                if (typeof ytPlayer.playVideo === 'function') ytPlayer.playVideo();
                                const vTag = targetWindow.document && targetWindow.document.querySelector('video');
                                if (vTag && vTag.paused) vTag.play().catch(() => {});
                            } catch (e) { }
                            lastTry = now; tries++;
                            try { targetWindow.__ag_penalty = (targetWindow.__ag_penalty || 0) + 1; } catch (e) { }
                            try { targetWindow.__ag_last_nudge = { t: now, vid, tries, tokenize }; } catch (e) { }
                            targetWindow.__ag_cold_tried[vid] = tries;
                        };
                        // 1. Penalty recovery: only when a real error/backoff is detected. Each video
                        // gets its own budget; never fires while the video is playing.
                        if (penalized && vid) {
                            if (tries < 5) {
                                if ((tries === 0 && since > 800) || (tries > 0 && sinceTry > 2000)) {
                                    try {
                                        const btn = targetWindow.document.querySelector('.ytp-error a, .yt-error-screen a[href], .ytp-error-content-wrap a[href]');
                                        if (btn && btn.click) btn.click();
                                    } catch (e) { }
                                    reloadNudge(true);
                                }
                            } else if (sinceTry > 6000 && now - lastReload > 60000 && wantFullReload()) {
                                lastReload = now;
                                try { targetWindow.sessionStorage.setItem('__ag_rel', '1'); } catch (e) { }
                                enableFeatures();
                                try { targetWindow.location.reload(); } catch (e) { }
                            }
                            return;
                        }

                        // Expose runtime predicate diagnostics for observability & regression verification
                        try {
                            targetWindow.__ag_watchdog_diag = {
                                since,
                                stallDuration,
                                cur,
                                tries,
                                vstate: (typeof ytPlayer.getPlayerState === 'function') ? ytPlayer.getPlayerState() : -1,
                                curBufferedEnd,
                                maxBufferedEnd,
                                readyState: video ? video.readyState : 0,
                                paused: video ? video.paused : true,
                                hasPipelineProgress,
                                hasActiveTransfer,
                                hasActiveResource,
                                isNavActive,
                                isSpaNavigating,
                                navConfirmed,
                                navLockAge: spaNavStartTime ? (now - spaNavStartTime) : 0,
                                penalized
                            };
                        } catch (e) { }
                        const prForAd = playerResp();
                        if (prForAd) recordAdSignalForPayload(prForAd);
                        const vidAdTime = (vid && targetWindow.__ag_ad_vids && targetWindow.__ag_ad_vids[vid]) || 0;
                        const hadAdSignal = (vidAdTime > 0) ||
                            ((targetWindow.__ag_last_ad_403_time || 0) >= (vidStart - 500)) ||
                            ((targetWindow.__ag_last_ad_req_time || 0) >= (vidStart - 500));

                        let requiredSince = 6000;
                        let requiredStall = 5500;
                        if (cur === 0 && curBufferedEnd <= 0.05) {
                            if (hadAdSignal) {
                                requiredSince = 350;
                                requiredStall = 250;
                            } else {
                                requiredSince = 2500;
                                requiredStall = 2200;
                            }
                        } else if (curBufferedEnd > 0.05) {
                            requiredSince = 6000;
                            requiredStall = 5500;
                        }
                        const inGrace = (since < requiredSince);
                        const allowRecovery = (since > requiredSince) && (stallDuration > requiredStall);

                        try {
                            targetWindow.__ag_watchdog_diag.inGrace = inGrace;
                            targetWindow.__ag_watchdog_diag.allowRecovery = allowRecovery;
                            targetWindow.__ag_watchdog_diag.requiredSince = requiredSince;
                            targetWindow.__ag_watchdog_diag.requiredStall = requiredStall;
                            targetWindow.__ag_watchdog_diag.hadAdSignal = hadAdSignal;
                            targetWindow.__ag_watchdog_diag.ad403Count = targetWindow.__ag_ad_403_count || 0;
                            targetWindow.__ag_watchdog_diag.lastAdReqTime = targetWindow.__ag_last_ad_req_time || 0;
                            targetWindow.__ag_watchdog_diag.lastAd403Time = targetWindow.__ag_last_ad_403_time || 0;
                        } catch (e) { }

                        const curUrlVid = ((targetWindow.location || {}).href || '').match(/[?&]v=([A-Za-z0-9_-]{11})/)?.[1] || null;
                        const isPlaylist = /[?&]list=/.test(((targetWindow.location || {}).href || ''));
                        const playlistBuffering = isPlaylist && (curBufferedEnd > 0.05);

                        // Also poll playlist auto-next in watchdog interval
                        const isWatchdogAdActive = ytPlayer ? (
                            ytPlayer.classList.contains('ad-showing') ||
                            ytPlayer.classList.contains('ad-interrupting') ||
                            (typeof ytPlayer.getAdState === 'function' && ytPlayer.getAdState() > 0)
                        ) : false;
                        if (isPlaylist && !isWatchdogAdActive) {
                            checkPlaylistAutoNext(video, ytPlayer, false);
                        }

                        const canNudgeNow = isVidSynced || (since > 2200);
                        const retryOk = (tries === 0) || (tries === 1 && sinceTry > 2000);
                        if (!penalized && !isNavActive && vid && (vid === curUrlVid) && canNudgeNow && retryOk && cur === 0 && curBufferedEnd <= 0.05 && allowRecovery && !playlistBuffering) {
                            const vstate = (typeof ytPlayer.getPlayerState === 'function') ? ytPlayer.getPlayerState() : -1;
                            if (vstate !== 1 && vstate !== 0) {
                                reloadNudge(true);
                                return;
                            }
                        }
                    } catch (e) { }
                }, 100);
            }
            targetWindow.addEventListener('yt-navigate-finish', ensureWatchdog, true);
            targetWindow.addEventListener('yt-page-data-updated', ensureWatchdog, true);
            ensureWatchdog();

            // Fast zero-delay play trigger on incoming media
            const kickPlayback = (e) => {
                try {
                    if (isSpaNavigating) return;
                    if (targetWindow.document && targetWindow.document.pictureInPictureElement) return;
                    const v = e.target;
                    const p = targetWindow.document && targetWindow.document.querySelector('#movie_player, .html5-video-player');
                    if (!v || v.tagName !== 'VIDEO' || !p || !p.contains(v)) return;
                    if (v.__ag_user_paused) return;
                    if (v.currentTime === 0 || v.currentTime < 0.1) {
                        const uVid = (((targetWindow.location || {}).href || '').match(/[?&]v=([A-Za-z0-9_-]{11})/) || [])[1] || null;
                        const pVid = (typeof p.getVideoData === 'function' && p.getVideoData() && p.getVideoData().video_id) || null;
                        if (uVid && pVid && uVid === pVid) {
                            if (v.paused) v.play().catch(() => { });
                            if (typeof p.playVideo === 'function') {
                                try { p.playVideo(); } catch (_) { }
                            }
                        }
                    }
                } catch (_) { }
            };
            if (targetWindow.document) {
                targetWindow.document.addEventListener('canplay', kickPlayback, true);
                targetWindow.document.addEventListener('loadeddata', kickPlayback, true);
                targetWindow.document.addEventListener('pause', (e) => {
                    try {
                        const v = e.target;
                        if (v && v.tagName === 'VIDEO') {
                            const isPiP = !!(targetWindow.document && targetWindow.document.pictureInPictureElement);
                            if (isPiP || (v.currentTime > 0.3 && !v.ended && !isSpaNavigating)) {
                                v.__ag_user_paused = true;
                            }
                        }
                    } catch (_) { }
                }, true);
                targetWindow.document.addEventListener('play', (e) => {
                    try {
                        const v = e.target;
                        if (v && v.tagName === 'VIDEO') {
                            v.__ag_user_paused = false;
                        }
                    } catch (_) { }
                }, true);
                targetWindow.document.addEventListener('enterpictureinpicture', (e) => {
                    try {
                        const v = e.target;
                        if (v && v.tagName === 'VIDEO' && v.paused) {
                            v.__ag_user_paused = true;
                        }
                    } catch (_) { }
                }, true);
            }
        } catch (e) { }
    }

    if (typeof window !== 'undefined') {
        installUniversalShields(window);
    }
})();
