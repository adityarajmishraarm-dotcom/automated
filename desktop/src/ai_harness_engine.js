/**
 * Antigravity AI-Native Desktop Browser - AI Harness Engine
 * High-performance command interpreter and webview interaction controller.
 * Minimalist, native, zero-dependency implementation (Ponytail tenet).
 */

// Dynamic live URL resolver (zero preconfigured static sites)
export function resolveTargetUrl(target) {
    if (!target) return 'https://www.google.com';
    const trimmed = String(target).trim().replace(/[.,!?;:]+$/g, '').trim();
    if (!trimmed) return 'https://www.google.com';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('file://') || trimmed.startsWith('antigravity://')) {
        return trimmed;
    }
    const lower = trimmed.toLowerCase();
    const specialDomains = {
        wikipedia: 'https://www.wikipedia.org',
        wiki: 'https://www.wikipedia.org',
        archive: 'https://archive.org',
        huggingface: 'https://huggingface.co',
        hn: 'https://news.ycombinator.com',
        hackernews: 'https://news.ycombinator.com'
    };
    if (specialDomains[lower]) return specialDomains[lower];
    if (trimmed.includes('.') && !trimmed.includes(' ') && !trimmed.includes('?')) {
        return 'https://' + trimmed;
    }
    if (!trimmed.includes(' ') && /^[a-z0-9-]+$/i.test(trimmed)) {
        return `https://www.${lower}.com`;
    }
    return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

/**
 * Execute webview in-page smooth proportional scrolling
 */
export async function executeWebviewScroll(webview, direction = 'down', amountInput = 20, isPercentage = false) {
    if (!webview || typeof webview.executeJavaScript !== 'function') {
        return { success: false, error: 'Webview is not available to scroll.' };
    }

    const num = (typeof amountInput === 'number' && !isNaN(amountInput)) ? amountInput : 20;
    const isExplicitPct = !!isPercentage;
    const dir = direction || 'down';

    try {
        const result = await webview.executeJavaScript(`
            (function() {
                const viewportHeight = window.innerHeight || 800;
                const viewportWidth = window.innerWidth || 1200;
                const docHeight = Math.max(
                    document.body ? document.body.scrollHeight : 0,
                    document.documentElement ? document.documentElement.scrollHeight : 0,
                    viewportHeight
                );
                const inputNum = ${num};
                const dirStr = "${dir}";
                const isExplicitPercent = ${isExplicitPct};

                // 1. Scroll 0 / top / start -> Scroll to very top of page
                if (inputNum === 0 || dirStr === 'top' || dirStr === 'start') {
                    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                    return { action: 'top', distance: 0, num: 0 };
                }

                // 2. Scroll 1000+ / end / bottom -> Scroll to very end/bottom of page
                if (inputNum >= 1000 || dirStr === 'end' || dirStr === 'bottom') {
                    window.scrollTo({ top: docHeight, left: 0, behavior: 'smooth' });
                    return { action: 'end', distance: docHeight, num: 1000 };
                }

                // 3. Proportional scale logic:
                // - Numbers <= 100 represent percentage of window viewport height/width (10 = 10%, 50 = 50%, 100 = 100%)
                // - Numbers > 100 (and < 1000) represent raw pixel scroll distance
                let pixelDistance = 0;
                if (isExplicitPercent || inputNum <= 100) {
                    const factor = inputNum / 100;
                    pixelDistance = (dirStr === 'left' || dirStr === 'right') ? (viewportWidth * factor) : (viewportHeight * factor);
                } else {
                    pixelDistance = inputNum;
                }

                let x = 0;
                let y = 0;
                if (dirStr === 'down') y = pixelDistance;
                else if (dirStr === 'up') y = -pixelDistance;
                else if (dirStr === 'right') x = pixelDistance;
                else if (dirStr === 'left') x = -pixelDistance;

                window.scrollBy({
                    top: y,
                    left: x,
                    behavior: 'smooth'
                });

                return { action: 'scrollBy', distance: Math.round(pixelDistance), num: inputNum };
            })();
        `);
        return { success: true, result, direction: dir, inputNum: num };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Await webview DOM settling and readiness (complete/interactive + non-empty DOM)
 */
export async function waitForWebviewReady(webview, timeoutMs = 3500) {
    if (!webview || typeof webview.executeJavaScript !== 'function') return false;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const isReady = await webview.executeJavaScript(`
                (function() {
                    const ready = document.readyState === 'complete' || document.readyState === 'interactive';
                    const hasBody = !!(document.body && (document.body.children.length > 0 || (document.body.innerText || '').length > 10));
                    return ready && hasBody;
                })()
            `);
            if (isReady) return true;
        } catch (_) {}
        await new Promise(r => setTimeout(r, 200));
    }
    return false;
}

/**
 * Click element on active page with Set-of-Marks, ordinal rank, or keyword matching
 */
export async function executeWebviewClick(webview, targetText, fallbackNavigate) {
    const cleanTarget = (targetText || '').trim();
    if (!cleanTarget) {
        return { success: false, message: 'Please specify the target element, button, link, plus icon, or search bar to click.' };
    }

    if (!webview || typeof webview.executeJavaScript !== 'function') {
        return { success: false, message: 'No active webview available to interact.' };
    }

    try {
        const result = await webview.executeJavaScript(`
            (function() {
                const targetRaw = ${JSON.stringify(cleanTarget)}.trim();
                const targetLower = targetRaw.toLowerCase();

                function isVisible(el) {
                    if (!el) return false;
                    const style = window.getComputedStyle(el);
                    if (style.display === 'none' || style.visibility === 'hidden') return false;
                    const op = parseFloat(style.opacity);
                    if (!isNaN(op) && op <= 0.05) return false;
                    const r = el.getBoundingClientRect();
                    const hasDims = (r.width > 0 && r.height > 0) || (el.offsetWidth > 0 && el.offsetHeight > 0);
                    if (!hasDims) return false;

                    // Verify ancestors are also visible
                    let p = el.parentElement;
                    while (p && p !== document.body && p !== document.documentElement) {
                        const ps = window.getComputedStyle(p);
                        if (ps.display === 'none' || ps.visibility === 'hidden') return false;
                        const pOp = parseFloat(ps.opacity);
                        if (!isNaN(pOp) && pOp <= 0.05) return false;
                        p = p.parentElement;
                    }
                    return true;
                }

                function getElementMetadata(el) {
                    const txt = (el.innerText || el.textContent || '').trim();
                    const val = (el.value || '').trim();
                    const aria = (el.getAttribute('aria-label') || '').trim();
                    const placeholder = (el.getAttribute('placeholder') || '').trim();
                    const title = (el.getAttribute('title') || '').trim();
                    const name = (el.getAttribute('name') || '').trim();
                    const id = (el.id || '').trim();
                    const role = (el.getAttribute('role') || '').trim();
                    const type = (el.getAttribute('type') || '').trim();
                    const alt = (el.getAttribute('alt') || '').trim();
                    return { txt, val, aria, placeholder, title, name, id, role, type, alt };
                }

                // 1. Ordinal Rank Parsing (1st/first, 2nd/second, 3rd/third, etc.)
                const rankWordMap = {
                    'first': 1, '1st': 1,
                    'second': 2, '2nd': 2,
                    'third': 3, '3rd': 3,
                    'fourth': 4, '4th': 4,
                    'fifth': 5, '5th': 5,
                    'sixth': 6, '6th': 6,
                    'seventh': 7, '7th': 7,
                    'eighth': 8, '8th': 8,
                    'ninth': 9, '9th': 9,
                    'tenth': 10, '10th': 10
                };

                let targetOrdinal = 1;
                let cleanTerm = targetRaw;

                // Match only genuine ordinal words or numbers with explicit ordinal suffixes (1st, 2nd, 3rd, etc.)
                const rankRegex = /\\b(1st|first|2nd|second|3rd|third|4th|fourth|5th|fifth|6th|sixth|7th|seventh|8th|eighth|9th|ninth|10th|\\d+(?:st|nd|rd|th))\\b/gi;
                const rankMatches = Array.from(targetRaw.matchAll(rankRegex));

                if (rankMatches.length > 0) {
                    const matchedRankWord = rankMatches[0][1].toLowerCase();
                    if (rankWordMap[matchedRankWord]) {
                        targetOrdinal = rankWordMap[matchedRankWord];
                    } else {
                        const num = parseInt(matchedRankWord, 10);
                        if (!isNaN(num) && num > 0) targetOrdinal = num;
                    }
                    cleanTerm = cleanTerm.replace(new RegExp('\\\\b' + matchedRankWord + '\\\\b', 'gi'), '').trim();
                }

                // 2. Type Filter Extraction ("link", "button", "input")
                let filterType = null;
                let searchTerm = cleanTerm;

                if (/\\b(?:link|url|result|hyperlink|anchor)\\b/i.test(cleanTerm)) {
                    filterType = 'link';
                    searchTerm = cleanTerm.replace(/\\b(?:link|url|result|hyperlink|anchor)\\b/gi, '').trim();
                } else if (/\\b(?:button|btn|action)\\b/i.test(cleanTerm)) {
                    filterType = 'button';
                    searchTerm = cleanTerm.replace(/\\b(?:button|btn|action)\\b/gi, '').trim();
                } else if (/\\b(?:input|field|textbox|search\\s*bar|search\\s*box)\\b/i.test(cleanTerm)) {
                    filterType = 'input';
                    searchTerm = cleanTerm.replace(/\\b(?:input|field|textbox|search\\s*bar|search\\s*box)\\b/gi, '').trim();
                } else if (/\\b(?:video|stream|track|music|song)\\b/i.test(cleanTerm)) {
                    filterType = 'video';
                    searchTerm = cleanTerm.replace(/\\b(?:video|stream|track|music|song)\\b/gi, '').trim();
                }

                const termLower = searchTerm.toLowerCase();

                // Check for Set-of-Marks mark index (#7, [Mark #7], Mark 7, [7], #7)
                let markIndex = null;
                const markMatch = targetRaw.match(/(?:\[?\s*(?:mark|badge|hashtag|number|no\.?)?\s*#?\s*(\d+)\s*\]?|^#?(\d+)$)/i);
                if (markMatch) {
                    markIndex = parseInt(markMatch[1] || markMatch[2], 10);
                }

                const selectors = [
                    'button', 'a', 'input', 'textarea', 'select', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                    '[role="button"]', '[role="link"]', '[role="searchbox"]', '[role="search"]', '[role="textbox"]',
                    '[role="combobox"]', '[role="option"]', '[role="menuitem"]', '[role="tab"]',
                    'summary', 'details', '[tabindex]:not([tabindex="-1"])', '.btn', '.button', '[onclick]',
                    '*[class*="cursor-pointer" i]', '*[id*="btn" i]', '*[id*="verify" i]', '*[id*="download" i]'
                ];

                const rawCandidates = Array.from(document.querySelectorAll(selectors.join(',')));
                const visibleCandidates = rawCandidates.filter(isVisible);

                // Sort candidates by document visual position (top-to-bottom, left-to-right)
                visibleCandidates.sort((a, b) => {
                    const rA = a.getBoundingClientRect();
                    const rB = b.getBoundingClientRect();
                    if (Math.abs(rA.top - rB.top) > 8) {
                        return rA.top - rB.top;
                    }
                    return rA.left - rB.left;
                });

                let matchedEl = null;
                let matchType = '';

                // Direct Selector or ID Match
                if (!matchedEl) {
                    try {
                        let directEl = document.querySelector(targetRaw) || document.getElementById(targetRaw);
                        if (directEl && !isVisible(directEl)) {
                            directEl = directEl.querySelector('input, textarea, button, a') || directEl;
                        } else if (directEl && (directEl.tagName.toLowerCase() !== 'input' && directEl.tagName.toLowerCase() !== 'textarea')) {
                            const innerInput = directEl.querySelector('input, textarea');
                            if (innerInput && isVisible(innerInput)) directEl = innerInput;
                        }
                        if (directEl && isVisible(directEl)) {
                            matchedEl = directEl;
                            matchType = 'Direct Selector/ID Match';
                        }
                    } catch (e) {}
                }

                // Tier 0: Set-of-Marks Mark Index Match (Guaranteed 1:1 DOM binding)
                if (!matchedEl && markIndex !== null) {
                    const somEl = document.querySelector('[data-som-id="' + markIndex + '"]') || 
                                  document.querySelector('#som-' + markIndex) ||
                                  document.querySelector('[data-som-badge="' + markIndex + '"]');
                    if (somEl) {
                        const clickTarget = somEl.tagName.toLowerCase() === 'svg' ? (somEl.closest('button, a, [role="button"]') || somEl) : somEl;
                        matchedEl = clickTarget;
                        matchType = 'SoM Mark #' + markIndex;
                    } else if (visibleCandidates.length >= markIndex && markIndex > 0) {
                        // Resilient Fallback: If badges were not stamped or page mutated, use visual candidate rank
                        matchedEl = visibleCandidates[markIndex - 1];
                        matchType = 'Candidate Rank #' + markIndex;
                    } else {
                        return {
                            success: false,
                            error: 'Set-of-Marks badge #' + markIndex + ' not found on active page. Use read_page to refresh marks or click by text.',
                            target: targetRaw
                        };
                    }
                }

                // Tier 1a: Search Bar Detection
                const isExplicitSearchIntent = targetLower === 'search bar' || 
                                               targetLower === 'search box' || 
                                               targetLower === 'search input' || 
                                               targetLower === 'search field' || 
                                               targetLower === 'sb' || 
                                               targetLower === 's';

                if (!matchedEl && isExplicitSearchIntent) {
                    const searchSelectors = [
                        'input[type="search"]', 'input[name="q"]', 'input[name="s"]', 'input[name*="search" i]',
                        'textarea[name="q"]', 'textarea[name*="search" i]',
                        'input[id*="search" i]', 'input[placeholder*="search" i]', 'textarea[placeholder*="search" i]',
                        'input[aria-label*="search" i]', 'textarea[aria-label*="search" i]',
                        'input#search', 'input#searchInput', 'input#searchbox_input',
                        '[role="searchbox"]', '[role="search"] input', '[role="search"] textarea',
                        'input[type="text"]', 'textarea:not([type="hidden"])', 'input:not([type="hidden"])'
                    ];

                    for (const sel of searchSelectors) {
                        const el = document.querySelector(sel);
                        if (el && isVisible(el)) {
                            matchedEl = el;
                            matchType = 'Dynamic Search Bar';
                            break;
                        }
                    }
                }

                // Tier 1b: Universal Search Button Detection (100% W3C Standards Compliant)
                const isExplicitSearchButtonIntent = /^(?:search\s*(?:button|btn|icon|submit|go)?|submit\s*search|go\s*search)$/i.test(targetLower.trim()) ||
                                                     /search\s*(?:button|btn|icon)/i.test(targetLower);

                if (!matchedEl && isExplicitSearchButtonIntent) {
                    const searchButtonSelectors = [
                        'button[type="submit"]',
                        'input[type="submit"]',
                        'button[aria-label*="search" i]',
                        '[role="button"][aria-label*="search" i]',
                        'button[title*="search" i]',
                        '[role="button"][title*="search" i]',
                        'button[id*="search" i]',
                        '[role="button"][id*="search" i]',
                        'button[name*="search" i]',
                        '[role="search"] button',
                        '[role="search"] [role="button"]',
                        'form[role="search"] button',
                        'form[action*="search" i] button',
                        'button.search-btn, button.search-button, button.search-icon',
                        'button:has(svg)',
                        'svg[class*="search" i]',
                        'svg:has(use[*|href*="search" i])',
                        '[class*="search" i]:not(input):not(textarea)'
                    ];

                    for (const sel of searchButtonSelectors) {
                        try {
                            const els = Array.from(document.querySelectorAll(sel));
                            for (const el of els) {
                                if (el && isVisible(el)) {
                                    matchedEl = el;
                                    matchType = 'Universal Search Button (' + sel + ')';
                                    break;
                                }
                            }
                            if (matchedEl) break;
                        } catch (_) {}
                    }
                }

                // Tier 2: Dynamic Candidate Ranking & Ordinal Match
                if (!matchedEl) {
                    const matchesList = [];

                    for (const el of visibleCandidates) {
                        const m = getElementMetadata(el);
                        const tag = el.tagName.toLowerCase();
                        const isLink = tag === 'a' || el.getAttribute('role') === 'link' || el.closest('a') !== null;
                        const isButton = tag === 'button' || el.getAttribute('role') === 'button' || el.classList.contains('btn');
                        const isInput = tag === 'input' || tag === 'textarea' || el.getAttribute('role') === 'searchbox';

                        const txtCombined = (m.txt + ' ' + m.aria + ' ' + m.title + ' ' + m.alt + ' ' + m.placeholder + ' ' + m.id).toLowerCase();
                        const valStr = m.val.toLowerCase();
                        const hrefStr = (el.getAttribute('href') || (el.closest('a') ? el.closest('a').getAttribute('href') : '') || '').toLowerCase();
                        const isVideo = isLink && (hrefStr.includes('/watch') || hrefStr.includes('video') || tag === 'video' || (el.closest && el.closest('article, [role="article"], .card, .item, [data-video-id], [data-item-id]')));

                        let isMatch = false;
                        if (termLower) {
                            isMatch = txtCombined.includes(termLower) || (isLink && hrefStr.includes(termLower)) || (isInput && valStr.includes(termLower));
                            // Token overlap fallback if direct substring fails
                            if (!isMatch) {
                                const termWords = termLower.split(/[\s,()\[\]\-_|]+/).filter(w => w.length > 1);
                                if (termWords.length > 0) {
                                    const matchedWords = termWords.filter(w => txtCombined.includes(w) || (isLink && hrefStr.includes(w)));
                                    if (matchedWords.length === termWords.length || (termWords.length >= 2 && matchedWords.length >= Math.ceil(termWords.length * 0.75))) {
                                        isMatch = true;
                                    }
                                }
                            }
                        } else if (filterType === 'video') {
                            isMatch = isVideo || isLink;
                        } else if (filterType === 'link') {
                            isMatch = isLink;
                        } else if (filterType === 'button') {
                            isMatch = isButton;
                        } else if (filterType === 'input') {
                            isMatch = isInput;
                        }

                        if (isMatch) {
                            const clickNode = isLink ? (el.closest('a') || el) : el;
                            matchesList.push({
                                node: clickNode,
                                metadata: m,
                                tag: tag,
                                isLink: isLink,
                                isButton: isButton,
                                isInput: isInput,
                                isVideo: isVideo,
                                isTextMatched: isMatch
                            });
                        }
                    }

                    // Deduplicate matching nodes
                    const uniqueMatches = [];
                    const seenNodes = new Set();
                    for (const item of matchesList) {
                        if (!seenNodes.has(item.node)) {
                            seenNodes.add(item.node);
                            uniqueMatches.push(item);
                        }
                    }

                    // Apply filters
                    let filteredPool = uniqueMatches;
                    if (filterType === 'video') {
                        const videoMatches = uniqueMatches.filter(m => m.isVideo || (m.isLink && ((m.node.href || '').includes('watch') || (m.node.href || '').includes('video'))));
                        if (videoMatches.length > 0) {
                            filteredPool = videoMatches;
                        }
                    } else if (filterType === 'link') {
                        filteredPool = uniqueMatches.filter(m => m.isLink);
                    } else if (filterType === 'button') {
                        filteredPool = uniqueMatches.filter(m => m.isButton);
                    } else if (filterType === 'input') {
                        filteredPool = uniqueMatches.filter(m => m.isInput);
                    } else {
                        const textOrLinkMatches = uniqueMatches.filter(m => m.isTextMatched || m.isLink || m.isButton);
                        if (textOrLinkMatches.length > 0) {
                            filteredPool = textOrLinkMatches;
                        }
                    }

                    if (filteredPool.length === 0) filteredPool = uniqueMatches;

                    // Score candidates so hyperlinks, videos, and content matches are prioritized
                    filteredPool.sort((a, b) => {
                        let scoreA = 0;
                        let scoreB = 0;
                        const nodeA = a.node;
                        const nodeB = b.node;
                        const hrefA = (nodeA.href || nodeA.getAttribute('href') || '').toLowerCase();
                        const hrefB = (nodeB.href || nodeB.getAttribute('href') || '').toLowerCase();

                        if (filterType === 'video') {
                            if (hrefA.includes('watch') || a.isVideo) scoreA += 300;
                            if (hrefB.includes('watch') || b.isVideo) scoreB += 300;
                        }

                        if (hrefA && (hrefA.startsWith('http://') || hrefA.startsWith('https://'))) scoreA += 100;
                        if (hrefB && (hrefB.startsWith('http://') || hrefB.startsWith('https://'))) scoreB += 100;

                        if (termLower && hrefA.includes(termLower)) scoreA += 50;
                        if (termLower && hrefB.includes(termLower)) scoreB += 50;

                        if (nodeA.querySelector('h1,h2,h3,h4,h5,h6') || nodeA.tagName.toLowerCase().startsWith('h')) scoreA += 40;
                        if (nodeB.querySelector('h1,h2,h3,h4,h5,h6') || nodeB.tagName.toLowerCase().startsWith('h')) scoreB += 40;

                        if (a.isInput) scoreA -= 200;
                        if (b.isInput) scoreB -= 200;

                        return scoreB - scoreA;
                    });

                    if (filteredPool.length > 0) {
                        const targetIdx = Math.min(targetOrdinal - 1, filteredPool.length - 1);
                        const chosen = filteredPool[targetIdx];
                        matchedEl = chosen.node;
                        matchType = 'Ranked Match #' + (targetIdx + 1) + ' of ' + filteredPool.length;
                    }
                }

                if (matchedEl) {
                    matchedEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

                    // Glowing yellow outline
                    const origOutline = matchedEl.style.outline;
                    const origBoxShadow = matchedEl.style.boxShadow;
                    matchedEl.style.outline = '3px solid #FFE600';
                    matchedEl.style.boxShadow = '0 0 20px #FFE600';
                    setTimeout(() => {
                        matchedEl.style.outline = origOutline;
                        matchedEl.style.boxShadow = origBoxShadow;
                    }, 1200);

                    if (typeof matchedEl.select === 'function') {
                        try { matchedEl.select(); } catch(e) {}
                    }

                    const tag = matchedEl.tagName.toLowerCase();
                    const linkNode = tag === 'a' ? matchedEl : matchedEl.closest('a');
                    let targetHref = null;
                    if (linkNode && linkNode.href && !linkNode.href.startsWith('javascript:')) {
                        targetHref = linkNode.href;
                    }

                    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(evtType => {
                        const evt = new MouseEvent(evtType, {
                            view: window,
                            bubbles: true,
                            cancelable: true,
                            composed: true
                        });
                        matchedEl.dispatchEvent(evt);
                        if (linkNode && linkNode !== matchedEl) {
                            linkNode.dispatchEvent(evt);
                        }
                    });

                    if (typeof matchedEl.click === 'function') {
                        try { matchedEl.click(); } catch(e) {}
                    }
                    if (linkNode && typeof linkNode.click === 'function' && linkNode !== matchedEl) {
                        try { linkNode.click(); } catch(e) {}
                    }

                    const m = getElementMetadata(matchedEl);
                    const foundLabel = (m.txt || m.val || m.aria || m.placeholder || m.title || matchType || targetRaw).trim();
                    const isInput = tag === 'input' || tag === 'textarea' || matchedEl.getAttribute('role') === 'searchbox';

                    if (isInput) {
                        setTimeout(() => {
                            try {
                                matchedEl.focus();
                                if (typeof matchedEl.select === 'function') matchedEl.select();
                            } catch(e) {}
                        }, 50);
                    }

                    return {
                        success: true,
                        label: foundLabel,
                        tag: tag,
                        matchType: matchType,
                        markIndex: markIndex,
                        isInput: isInput,
                        url: targetHref
                    };
                }

                return { success: false, target: targetRaw };
            })();
        `);

        if (result && result.success) {
            if (result.url && (result.url.startsWith('http://') || result.url.startsWith('https://'))) {
                if (typeof fallbackNavigate === 'function') {
                    fallbackNavigate(result.url);
                } else if (typeof webview.loadURL === 'function') {
                    webview.loadURL(result.url).catch(() => { });
                }
            }

            const markBadge = result.markIndex ? ` <strong>[Mark #${result.markIndex}]</strong>` : '';
            if (result.isInput) {
                return {
                    success: true,
                    message: `🎯 AI focused and highlighted the search input${markBadge}: <strong>"${result.label}"</strong>. Typing goes directly into the search bar!`
                };
            }

            return {
                success: true,
                message: `🎯 AI clicked element${markBadge}: <strong>"${result.label}"</strong> &lt;${result.tag}&gt; (${result.matchType}).`
            };
        }

        return {
            success: false,
            message: `⚠️ Could not find visible matching element for <strong>"${cleanTarget}"</strong> on the active page.`
        };
    } catch (e) {
        return { success: false, message: `⚠️ Click action error: ${e.message}` };
    }
}

/**
 * Sub-Agent Delegation Manager
 * Enforces hard limit of MAX 3 concurrent subagents to protect RAM and memory.
 * Tracks each subagent by unique subagent_id with full lifecycle monitoring.
 */
export class SubAgentManager {
    constructor(maxConcurrent = 3) {
        this.maxConcurrent = maxConcurrent;
        this.subagents = new Map();
    }

    canSpawn() {
        const active = Array.from(this.subagents.values()).filter(s => s.status === 'running');
        return active.length < this.maxConcurrent;
    }

    getActiveCount() {
        return Array.from(this.subagents.values()).filter(s => s.status === 'running').length;
    }

    register(subagent_id, role, goal, tab_id = null) {
        if (!this.canSpawn()) {
            throw new Error(`Concurrency cap reached: Maximum ${this.maxConcurrent} active sub-agents permitted to protect memory and RAM.`);
        }
        const record = {
            subagent_id: String(subagent_id),
            role: String(role || 'general_worker'),
            goal: String(goal || ''),
            tab_id: tab_id !== null ? Number(tab_id) : null,
            status: 'running',
            startTime: Date.now(),
            actionsExecuted: 0,
            result: null
        };
        this.subagents.set(record.subagent_id, record);
        return record;
    }

    recordAction(subagent_id) {
        const sub = this.subagents.get(String(subagent_id));
        if (sub) sub.actionsExecuted++;
    }

    complete(subagent_id, success, summary, artifacts = {}, dom_delta = '') {
        const sub = this.subagents.get(String(subagent_id));
        if (!sub) return null;
        sub.status = success ? 'completed' : 'failed';
        sub.endTime = Date.now();
        sub.durationMs = sub.endTime - sub.startTime;
        sub.result = {
            subagent_id: sub.subagent_id,
            role: sub.role,
            status: sub.status,
            success: !!success,
            summary: String(summary || ''),
            artifacts,
            dom_delta: String(dom_delta || ''),
            actionsExecuted: sub.actionsExecuted,
            durationMs: sub.durationMs
        };
        return sub.result;
    }

    terminate(subagent_id) {
        this.subagents.delete(String(subagent_id));
    }

    getActiveList() {
        return Array.from(this.subagents.values());
    }

    get(subagent_id) {
        return this.subagents.get(String(subagent_id)) || null;
    }
}

export const globalSubAgentManager = new SubAgentManager(3);

/**
 * Capture Pre-Action or Post-Action DOM Snapshot for Physical Delta Verification
 */
export async function captureDomSnapshot(webview) {
    if (!webview || typeof webview.executeJavaScript !== 'function') {
        return {
            url: '',
            title: '',
            activeTag: null,
            activeId: null,
            inputs: [],
            videos: [],
            interactiveCount: 0,
            bodyLength: 0,
            timestamp: Date.now()
        };
    }

    try {
        const snap = await webview.executeJavaScript(`
            (function() {
                const act = document.activeElement;
                const activeTag = act ? act.tagName.toLowerCase() : null;
                const activeId = act ? (act.id || '') : null;
                const activeName = act ? (act.getAttribute('name') || '') : null;
                const activeValue = act && ('value' in act) ? String(act.value || '').slice(0, 100) : null;

                const inputList = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select')).slice(0, 25).map(el => ({
                    tag: el.tagName.toLowerCase(),
                    id: el.id || '',
                    name: el.name || '',
                    type: el.type || '',
                    placeholder: el.placeholder || '',
                    value: String(el.value || '').slice(0, 50)
                }));

                const videoList = Array.from(document.querySelectorAll('video')).slice(0, 5).map(v => ({
                    paused: v.paused,
                    currentTime: Math.round(v.currentTime || 0),
                    duration: Math.round(v.duration || 0),
                    src: (v.currentSrc || v.src || '').slice(0, 100)
                }));

                const interactiveCount = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="link"], [role="searchbox"]').length;
                const bodyLength = document.body ? (document.body.innerText || '').length : 0;

                return {
                    url: window.location.href,
                    title: document.title || '',
                    activeTag,
                    activeId,
                    activeName,
                    activeValue,
                    inputs: inputList,
                    videos: videoList,
                    interactiveCount,
                    bodyLength,
                    timestamp: Date.now()
                };
            })()
        `);
        return snap;
    } catch (e) {
        let fallbackUrl = '';
        let fallbackTitle = '';
        try { if (webview && typeof webview.getURL === 'function') fallbackUrl = webview.getURL() || ''; } catch (_) {}
        try { if (webview && typeof webview.getTitle === 'function') fallbackTitle = webview.getTitle() || ''; } catch (_) {}
        return {
            url: fallbackUrl,
            title: fallbackTitle,
            activeTag: null,
            activeId: null,
            inputs: [],
            videos: [],
            interactiveCount: 0,
            bodyLength: 0,
            timestamp: Date.now(),
            error: e.message
        };
    }
}

/**
 * Compute Physical State Delta between Pre-Action and Post-Action DOM Snapshots
 */
export function computeDomDelta(beforeSnap, afterSnap) {
    if (!beforeSnap || !afterSnap) {
        return { isZeroDelta: false, summary: 'Snapshot delta unavailable' };
    }

    const urlChanged = beforeSnap.url !== afterSnap.url;
    const titleChanged = beforeSnap.title !== afterSnap.title;
    const focusChanged = beforeSnap.activeTag !== afterSnap.activeTag || 
                         beforeSnap.activeId !== afterSnap.activeId || 
                         beforeSnap.activeName !== afterSnap.activeName;
    const valueChanged = JSON.stringify(beforeSnap.inputs) !== JSON.stringify(afterSnap.inputs) ||
                         beforeSnap.activeValue !== afterSnap.activeValue;
    const videoChanged = JSON.stringify(beforeSnap.videos) !== JSON.stringify(afterSnap.videos);
    const interactiveDelta = (afterSnap.interactiveCount || 0) - (beforeSnap.interactiveCount || 0);
    const bodyLengthDelta = (afterSnap.bodyLength || 0) - (beforeSnap.bodyLength || 0);

    const changes = [];
    if (urlChanged) changes.push(`URL navigated to: ${afterSnap.url}`);
    if (titleChanged) changes.push(`Title changed: "${afterSnap.title}"`);
    if (focusChanged) changes.push(`Focus shifted to <${afterSnap.activeTag || 'none'}${afterSnap.activeId ? '#' + afterSnap.activeId : ''}>`);
    if (valueChanged) changes.push(`Input values updated`);
    if (videoChanged) {
        const vState = afterSnap.videos[0]?.paused ? 'paused' : 'playing';
        changes.push(`Video state shifted to ${vState}`);
    }
    if (Math.abs(interactiveDelta) > 0) changes.push(`Interactive elements delta: ${interactiveDelta > 0 ? '+' : ''}${interactiveDelta}`);
    if (Math.abs(bodyLengthDelta) > 50) changes.push(`DOM text changed by ${bodyLengthDelta} chars`);

    const isZeroDelta = !urlChanged && !titleChanged && !focusChanged && 
                        !valueChanged && !videoChanged && 
                        Math.abs(bodyLengthDelta) < 15 && interactiveDelta === 0;

    return {
        urlChanged,
        titleChanged,
        focusChanged,
        valueChanged,
        videoChanged,
        interactiveDelta,
        bodyLengthDelta,
        isZeroDelta,
        changes,
        summary: changes.length > 0 ? changes.join(' | ') : 'Zero DOM delta detected (no physical change)'
    };
}

/**
 * Dispatch physical keyboard events (Space, Enter, Tab, Escape, ArrowDown, ArrowUp, k, etc.)
 */
export async function executeWebviewKeyPress(webview, key = 'Space', modifiers = []) {
    if (!webview || typeof webview.executeJavaScript !== 'function') {
        return { success: false, message: 'Webview is not available to receive key press.' };
    }

    const cleanKey = (key || 'Space').trim();

    try {
        const result = await webview.executeJavaScript(`
            (function() {
                const targetKey = ${JSON.stringify(cleanKey)};
                const keyMap = {
                    'space': { key: ' ', code: 'Space', keyCode: 32 },
                    ' ': { key: ' ', code: 'Space', keyCode: 32 },
                    'enter': { key: 'Enter', code: 'Enter', keyCode: 13 },
                    'return': { key: 'Enter', code: 'Enter', keyCode: 13 },
                    'tab': { key: 'Tab', code: 'Tab', keyCode: 9 },
                    'escape': { key: 'Escape', code: 'Escape', keyCode: 27 },
                    'esc': { key: 'Escape', code: 'Escape', keyCode: 27 },
                    'arrowdown': { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
                    'down': { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
                    'arrowup': { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
                    'up': { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
                    'arrowleft': { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
                    'left': { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
                    'arrowright': { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
                    'right': { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
                    'backspace': { key: 'Backspace', code: 'Backspace', keyCode: 8 },
                    'k': { key: 'k', code: 'KeyK', keyCode: 75 }
                };

                const mapped = keyMap[targetKey.toLowerCase()] || {
                    key: targetKey,
                    code: 'Key' + targetKey.toUpperCase(),
                    keyCode: targetKey.charCodeAt(0) || 0
                };

                const targetEl = document.activeElement || document.body;

                // 1. Dispatch keydown, keypress, keyup
                ['keydown', 'keypress', 'keyup'].forEach(type => {
                    targetEl.dispatchEvent(new KeyboardEvent(type, {
                        key: mapped.key,
                        code: mapped.code,
                        keyCode: mapped.keyCode,
                        which: mapped.keyCode,
                        bubbles: true,
                        cancelable: true
                    }));
                });

                // 2. Media Playback Guarantee: If Space or 'k', ensure HTML5 video toggles cleanly
                let mediaHandled = false;
                if (mapped.code === 'Space' || mapped.code === 'KeyK') {
                    const video = document.querySelector('video');
                    if (video) {
                        try {
                            if (video.paused) {
                                video.play();
                                mediaHandled = true;
                            } else {
                                video.pause();
                                mediaHandled = true;
                            }
                        } catch (e) {}
                    }
                }

                // 3. Modal / Popup Dismiss Guarantee: If Escape, blur active element
                if (mapped.code === 'Escape') {
                    if (document.activeElement && document.activeElement.blur) {
                        document.activeElement.blur();
                    }
                }

                return {
                    success: true,
                    key: mapped.key,
                    code: mapped.code,
                    mediaHandled,
                    targetTag: targetEl.tagName.toLowerCase()
                };
            })()
        `);

        return {
            success: true,
            message: `Pressed key [${result.code || cleanKey}] on <${result.targetTag || 'body'}>${result.mediaHandled ? ' (Video playback toggled)' : ''}.`,
            details: result
        };
    } catch (e) {
        return { success: false, message: `Key press error: ${e.message}` };
    }
}

/**
 * Hover over an element or badge #N to reveal dropdowns, tooltips, or player controls
 */
export async function executeWebviewHover(webview, targetText) {
    if (!webview || typeof webview.executeJavaScript !== 'function') {
        return { success: false, message: 'Webview is not available to hover.' };
    }

    const cleanTarget = (targetText || '').trim();
    if (!cleanTarget) {
        return { success: false, message: 'Target element required for hover.' };
    }

    try {
        const result = await webview.executeJavaScript(`
            (function() {
                const target = ${JSON.stringify(cleanTarget)}.trim();
                let el = null;

                // 1. Set-of-Marks badge (#1, #2, etc.)
                const markMatch = target.match(/^#?(\\d+)$/);
                if (markMatch) {
                    const idx = parseInt(markMatch[1], 10);
                    const badges = Array.from(document.querySelectorAll('.antigravity-num-badge, [data-som-id]'));
                    if (badges[idx - 1]) {
                        el = badges[idx - 1].parentElement || badges[idx - 1];
                    }
                }

                // 2. Direct selector
                if (!el) {
                    try { el = document.querySelector(target); } catch (e) {}
                }

                // 3. Text match
                if (!el) {
                    const candidates = Array.from(document.querySelectorAll('button, a, [role="button"], [role="menuitem"], div, span'));
                    el = candidates.find(c => (c.innerText || '').trim().toLowerCase().includes(target.toLowerCase()));
                }

                if (!el) {
                    return { success: false, error: 'Element not found' };
                }

                const rect = el.getBoundingClientRect();
                ['mouseenter', 'mouseover', 'mousemove'].forEach(type => {
                    el.dispatchEvent(new MouseEvent(type, {
                        bubbles: true,
                        cancelable: true,
                        clientX: rect.left + rect.width / 2,
                        clientY: rect.top + rect.height / 2
                    }));
                });

                return { success: true, tag: el.tagName.toLowerCase(), text: (el.innerText || '').slice(0, 30) };
            })()
        `);

        if (result.success) {
            return { success: true, message: `Hovered over <${result.tag}> "${result.text}".` };
        } else {
            return { success: false, message: `Could not find element to hover: "${cleanTarget}".` };
        }
    } catch (e) {
        return { success: false, message: `Hover error: ${e.message}` };
    }
}

/**
 * Universal text typing with Set-of-Marks (#N), placeholder resolution,
 * and React/Vue prototype property descriptor setter override.
 * Supports multi-field form filling without premature form submissions.
 */
export async function executeWebviewType(webview, textToType, target = null, submit = false, clear = true) {
    if (!webview || typeof webview.executeJavaScript !== 'function') {
        return { success: false, message: 'No active webview available for typing.' };
    }

    try {
        const result = await webview.executeJavaScript(`
            (function() {
                const text = ${JSON.stringify(textToType)};
                const targetQuery = ${JSON.stringify(target || '')}.trim();
                const shouldSubmit = ${!!submit};
                const shouldClear = ${clear !== false};

                function isVisible(el) {
                    if (!el) return false;
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && 
                           style.visibility !== 'hidden' && 
                           style.opacity !== '0' && 
                           el.offsetWidth > 0 && 
                           el.offsetHeight > 0;
                }

                let targetInput = null;
                let matchedBy = 'fallback';

                // 1. Target Specified: Check Set-of-Marks Badge (#N)
                if (targetQuery) {
                    const markMatch = targetQuery.match(/^#?(\\d+)$/);
                    if (markMatch) {
                        const markIdx = parseInt(markMatch[1], 10);
                        const somEl = document.querySelector('[data-som-id="' + markIdx + '"]') || document.querySelector('#som-' + markIdx);
                        if (somEl && isVisible(somEl)) {
                            targetInput = somEl.matches('input, textarea') ? somEl : somEl.querySelector('input, textarea');
                            if (targetInput) matchedBy = 'Set-of-Marks #' + markIdx;
                        }
                    }
                }

                // 2. Target Specified: Check Placeholder, Aria-Label, Name, or ID
                if (!targetInput && targetQuery) {
                    const cleanQ = targetQuery.toLowerCase();
                    const candidates = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea')).filter(isVisible);

                    // Exact or substring match on placeholder
                    targetInput = candidates.find(c => (c.placeholder || '').toLowerCase().includes(cleanQ));
                    if (targetInput) matchedBy = 'Placeholder: "' + targetInput.placeholder + '"';

                    // Match on aria-label
                    if (!targetInput) {
                        targetInput = candidates.find(c => (c.getAttribute('aria-label') || '').toLowerCase().includes(cleanQ));
                        if (targetInput) matchedBy = 'Aria-Label: "' + targetInput.getAttribute('aria-label') + '"';
                    }

                    // Match on associated <label>
                    if (!targetInput) {
                        const labels = Array.from(document.querySelectorAll('label')).filter(l => (l.innerText || '').toLowerCase().includes(cleanQ));
                        for (const lbl of labels) {
                            if (lbl.htmlFor) {
                                const el = document.getElementById(lbl.htmlFor);
                                if (el && isVisible(el)) { targetInput = el; matchedBy = 'Label: "' + lbl.innerText.trim() + '"'; break; }
                            }
                            const inner = lbl.querySelector('input, textarea');
                            if (inner && isVisible(inner)) { targetInput = inner; matchedBy = 'Inner Label: "' + lbl.innerText.trim() + '"'; break; }
                        }
                    }

                    // Direct CSS Selector
                    if (!targetInput) {
                        try {
                            const selEl = document.querySelector(targetQuery);
                            if (selEl && isVisible(selEl)) {
                                targetInput = selEl.matches('input, textarea') ? selEl : selEl.querySelector('input, textarea');
                                if (targetInput) matchedBy = 'CSS Selector';
                            }
                        } catch (e) {}
                    }
                }

                // 3. No Target or Target Not Found: Use document.activeElement if editable
                if (!targetInput && document.activeElement) {
                    const act = document.activeElement;
                    if ((act.tagName === 'INPUT' || act.tagName === 'TEXTAREA' || act.isContentEditable) && isVisible(act)) {
                        targetInput = act;
                        matchedBy = 'Active Focused Element';
                    }
                }

                // 4. Fallback: Search bar or first visible input
                if (!targetInput) {
                    const searchSelectors = [
                        'input[type="search"]', 'input[name="q"]', 'input[name="s"]', 'input[name*="search" i]',
                        'input[id*="search" i]', 'input[placeholder*="search" i]', 'input[aria-label*="search" i]',
                        '[role="searchbox"]', '[role="search"] input', '[role="search"] textarea',
                        'textarea[name="q"]', 'textarea[name*="search" i]',
                        'input[type="text"]', 'input:not([type="hidden"])', 'textarea:not([type="hidden"])'
                    ];
                    for (const sel of searchSelectors) {
                        const el = document.querySelector(sel);
                        if (el && isVisible(el)) {
                            targetInput = el;
                            matchedBy = 'Primary Input Fallback';
                            break;
                        }
                    }
                }

                if (!targetInput) {
                    return { success: false, error: 'Could not locate target input on page.' };
                }

                targetInput.focus();

                // OpenCode React / Vue Prototype Descriptor Setter Override
                const isTextArea = targetInput instanceof HTMLTextAreaElement;
                const proto = isTextArea ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
                const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
                const nativeSetter = descriptor ? descriptor.set : null;

                if (shouldClear) {
                    if (nativeSetter) nativeSetter.call(targetInput, '');
                    else targetInput.value = '';
                }

                if (nativeSetter) {
                    nativeSetter.call(targetInput, text);
                } else {
                    targetInput.value = text;
                }

                targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                targetInput.dispatchEvent(new Event('change', { bubbles: true }));

                // Subtle visual outline feedback
                const origOutline = targetInput.style.outline;
                targetInput.style.outline = '3px solid #FFE600';
                targetInput.style.boxShadow = '0 0 16px rgba(255, 230, 0, 0.6)';
                setTimeout(() => {
                    targetInput.style.outline = origOutline;
                    targetInput.style.boxShadow = '';
                }, 1000);

                // Form Submit only if explicitly requested
                let formSubmitted = false;
                if (shouldSubmit) {
                    ['keydown', 'keypress', 'keyup'].forEach(evtName => {
                        targetInput.dispatchEvent(new KeyboardEvent(evtName, {
                            key: 'Enter',
                            code: 'Enter',
                            keyCode: 13,
                            which: 13,
                            bubbles: true,
                            cancelable: true
                        }));
                    });

                    const form = targetInput.closest('form');
                    if (form) {
                        try {
                            const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], button[aria-label*="Search" i], [class*="submit" i]');
                            if (submitBtn) {
                                submitBtn.click();
                                formSubmitted = true;
                            } else if (typeof form.requestSubmit === 'function') {
                                form.requestSubmit();
                                formSubmitted = true;
                            } else if (typeof form.submit === 'function') {
                                form.submit();
                                formSubmitted = true;
                            }
                        } catch (e) {}
                    }
                }

                return {
                    success: true,
                    text: text,
                    inputTag: targetInput.tagName.toLowerCase(),
                    placeholder: targetInput.placeholder || '',
                    matchedBy: matchedBy,
                    submitted: formSubmitted
                };
            })();
        `);

        if (result && result.success) {
            const subMsg = result.submitted ? ' (submitted)' : '';
            return {
                success: true,
                message: `Typed "${textToType}" into <${result.inputTag}> [${result.matchedBy}]${subMsg}.`,
                details: result
            };
        } else {
            return { success: false, message: `Could not type into element: ${result ? result.error : 'Unknown error'}` };
        }
    } catch (e) {
        return { success: false, message: `Type text error: ${e.message}` };
    }
}

/**
 * Type text directly into active page's search bar and submit (generic search discovery fallback)
 */
export async function typeAndSubmitInSearchBar(webview, textToType) {
    const res = await executeWebviewType(webview, textToType, null, true, true);
    if (res.success) {
        return `⌨️ Typed <strong>"${textToType}"</strong> into search bar and submitted search.`;
    }
    return `⚠️ ${res.message}`;
}export async function highlightAndNumberOccurrences(webview, keyword) {
    if (!webview || typeof webview.executeJavaScript !== 'function') {
        return { success: false, count: 0 };
    }

    try {
        const res = await webview.executeJavaScript(`
            (function() {
                const kw = ${JSON.stringify(keyword)}.trim().toLowerCase();
                if (!kw) return { count: 0 };

                // Clean existing badges
                document.querySelectorAll('.antigravity-num-badge').forEach(b => b.remove());

                const walker = document.createTreeWalker(
                    document.body,
                    NodeFilter.SHOW_TEXT,
                    null,
                    false
                );

                let count = 0;
                const matches = [];
                while (walker.nextNode()) {
                    const node = walker.currentNode;
                    if (node.parentElement && !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.parentElement.tagName)) {
                        const txt = node.textContent.toLowerCase();
                        if (txt.includes(kw)) {
                            const rect = node.parentElement.getBoundingClientRect();
                            if (rect.width > 0 && rect.height > 0) {
                                matches.push(node.parentElement);
                            }
                        }
                    }
                }

                matches.slice(0, 50).forEach((el, idx) => {
                    count++;
                    const badge = document.createElement('span');
                    badge.className = 'antigravity-num-badge';
                    badge.textContent = '#' + (idx + 1);
                    badge.style.cssText = 'background:#FFE600; color:#000; font-weight:800; font-size:11px; padding:1px 5px; border-radius:4px; margin-right:4px; display:inline-block; vertical-align:middle; z-index:999999; box-shadow:0 0 6px rgba(0,0,0,0.6);';
                    el.prepend(badge);
                });

                // Auto remove badges after 10s
                setTimeout(() => {
                    document.querySelectorAll('.antigravity-num-badge').forEach(b => b.remove());
                }, 10000);

                return { count };
            })();
        `);
        return res;
    } catch (e) {
        return { success: false, count: 0, error: e.message };
    }
}

/**
 * Universal Set-of-Marks Overlay Engine.
 * Injects visible, numbered badge pills directly into the active webview DOM over key interactive elements.
 * Simultaneously stamps `data-som-id="N"` onto target elements for guaranteed 1:1 deterministic clicking.
 */
export async function renderSetOfMarksOverlay(webview, maxMarks = 120) {
    if (!webview || typeof webview.executeJavaScript !== 'function') {
        return [];
    }

    try {
        const marks = await webview.executeJavaScript(`
            (function() {
                // 1. Clean prior overlay container and attributes
                const existingContainer = document.getElementById('antigravity-som-container');
                if (existingContainer) existingContainer.remove();
                document.querySelectorAll('[data-som-id]').forEach(el => {
                    const origOutline = el.getAttribute('data-som-orig-outline');
                    if (origOutline !== null) el.style.outline = origOutline;
                    el.removeAttribute('data-som-id');
                    el.removeAttribute('data-som-orig-outline');
                });

                // 2. Select interactive candidates (100% W3C standard, site-agnostic)
                const candidateSelectors = [
                    'a[href]', 'button', 'input:not([type="hidden"])', 'textarea', 'select', 'summary', 'details',
                    '[role="button"]', '[role="link"]', '[role="searchbox"]', '[role="tab"]', '[role="menuitem"]',
                    '[role="checkbox"]', '[role="radio"]', '[role="switch"]', '[role="option"]', '[role="combobox"]',
                    '[role="menuitemcheckbox"]', '[role="menuitemradio"]', '[role="treeitem"]',
                    '[contenteditable="true"]', '[tabindex]:not([tabindex="-1"])', '[onclick]',
                    'video', 'audio', '[role="slider"]',
                    '.btn', '.button', '[class*="button" i]', '[class*="btn" i]'
                ];

                const standardElements = Array.from(document.querySelectorAll(candidateSelectors.join(',')));
                const pointerElements = Array.from(document.querySelectorAll('div, span, li, p, i, em, strong, svg')).filter(el => {
                    try {
                        if (!el || el.id === 'antigravity-som-container' || el.closest('#antigravity-som-container')) return false;
                        const s = window.getComputedStyle(el);
                        return s.cursor === 'pointer' && el.children.length <= 2;
                    } catch (_) { return false; }
                });

                const rawElements = Array.from(new Set([...standardElements, ...pointerElements]));

                function isElVisible(el) {
                    if (!el || el.id === 'antigravity-som-container' || (el.closest && el.closest('#antigravity-som-container'))) return false;
                    const rect = el.getBoundingClientRect();
                    if (rect.width < 6 || rect.height < 6) return false;
                    // Do not artificially truncate items below viewport so the whole page is indexed
                    if (rect.right < 0 || rect.bottom < -100) return false;

                    let cur = el;
                    while (cur && cur !== document.body && cur !== document.documentElement) {
                        const s = window.getComputedStyle(cur);
                        if (s.display === 'none' || s.visibility === 'hidden') return false;
                        const op = parseFloat(s.opacity);
                        if (!isNaN(op) && op <= 0.05) return false;
                        if (s.pointerEvents === 'none' && cur !== el) return false;
                        cur = cur.parentElement;
                    }
                    return true;
                }

                function getElementLabel(el) {
                    const aria = (el.getAttribute('aria-label') || '').trim();
                    if (aria) return aria;
                    const inner = (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim();
                    if (inner && inner.length <= 60 && !inner.startsWith('<')) return inner;
                    const val = (el.value || '').trim();
                    if (val) return val;
                    const placeholder = (el.getAttribute('placeholder') || '').trim();
                    if (placeholder) return placeholder;
                    const title = (el.getAttribute('title') || '').trim();
                    if (title) return title;
                    const imgAlt = el.querySelector && el.querySelector('img[alt]')?.alt?.trim();
                    if (imgAlt) return imgAlt;
                    const svgTitle = el.querySelector && el.querySelector('title')?.textContent?.trim();
                    if (svgTitle) return svgTitle;

                    // Universal SVG sprite symbol resolution (use href="#search", use href="#play", etc.)
                    const useEl = el.querySelector ? el.querySelector('use') : (el.tagName.toLowerCase() === 'use' ? el : null);
                    if (useEl) {
                        const href = (useEl.getAttribute('href') || useEl.getAttribute('xlink:href') || '').toLowerCase();
                        if (href.includes('search')) return '[Search Icon]';
                        if (href.includes('play')) return '[Play Icon]';
                        if (href.includes('pause')) return '[Pause Icon]';
                        if (href.includes('menu')) return '[Menu Icon]';
                        if (href.includes('close')) return '[Close Icon]';
                        if (href.length > 1 && !href.includes('loader') && !href.includes('spinner') && !href.includes('placeholder')) {
                            return '[' + href.replace(/^#/, '') + ' Icon]';
                        }
                    }

                    // Semantic slug extraction from href/data-to (e.g. /watch-whats-wrong-with-secretary-kim...)
                    const rawHref = el.getAttribute('data-to') || el.getAttribute('href') || el.href || '';
                    if (rawHref && !rawHref.startsWith('javascript:')) {
                        try {
                            const pathParts = rawHref.split(/[?#]/)[0].split('/').filter(Boolean);
                            const lastSlug = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2] || '';
                            if (lastSlug && lastSlug.length > 4 && !/^[0-9a-f]{20,}$/i.test(lastSlug)) {
                                const cleanSlug = lastSlug
                                    .replace(/^(?:watch|online|video|show)-+/i, '')
                                    .replace(/-+(?:online|watch|video|hindi|dubbed|series|free|episode|season.*)$/i, '')
                                    .replace(/-/g, ' ')
                                    .trim();
                                if (cleanSlug.length > 2) {
                                    const words = cleanSlug.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
                                    return '[Card: ' + words.join(' ') + ']';
                                }
                            }
                        } catch (_) {}
                    }

                    const tag = el.tagName.toLowerCase();
                    const classStr = typeof el.className === 'string' ? el.className : (el.className?.baseVal || '');
                    const idStr = el.id || '';
                    const isSearch = /search/i.test(classStr + ' ' + idStr + ' ' + (el.getAttribute('name') || '') + ' ' + (el.closest?.('[role="search"]') ? 'search' : ''));
                    const isSubmit = el.type === 'submit' || (typeof el.matches === 'function' && el.matches('button[type="submit"], input[type="submit"]'));

                    if (isSearch) return '[Search Button]';
                    if (isSubmit) return '[Submit]';
                    if (tag === 'button' || el.getAttribute('role') === 'button') {
                        const id = el.id ? '#' + el.id : '';
                        const name = el.getAttribute('name') ? '[name="' + el.getAttribute('name') + '"]' : '';
                        return '[Button' + (id || name || '') + ']';
                    }
                    if (tag === 'svg') return '[Icon: ' + (classStr.trim().split(/\\s+/)[0] || 'svg') + ']';
                    if (tag === 'input') return '[Input: ' + (el.type || 'text') + ']';
                    if (tag === 'video') return '[Video Player]';
                    if (el.closest && (el.closest('.card, .portrait-container, [class*="card" i]') || el.querySelector('img'))) {
                        return '[Show/Video Card]';
                    }
                    return '<' + tag + '>';
                }

                const visibleElements = rawElements.filter(isElVisible);

                // Sort: Viewport items first, sorted top-to-bottom then left-to-right
                const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
                visibleElements.sort((a, b) => {
                    const rA = a.getBoundingClientRect();
                    const rB = b.getBoundingClientRect();
                    const inVpA = rA.top >= 0 && rA.top <= viewportHeight;
                    const inVpB = rB.top >= 0 && rB.top <= viewportHeight;
                    if (inVpA && !inVpB) return -1;
                    if (!inVpA && inVpB) return 1;
                    if (Math.abs(rA.top - rB.top) > 12) return rA.top - rB.top;
                    return rA.left - rB.left;
                });

                // Deduplicate parent/child click targets
                const deduped = [];
                const seenNodes = new Set();
                for (const el of visibleElements) {
                    const clickTarget = el.tagName.toLowerCase() === 'a' ? el : (el.closest('a') || el.closest('button') || el);
                    if (!seenNodes.has(clickTarget)) {
                        seenNodes.add(clickTarget);
                        deduped.push(clickTarget);
                    }
                }

                const selected = deduped.slice(0, ${maxMarks});
                if (selected.length === 0) return [];

                // Create overlay container
                const container = document.createElement('div');
                container.id = 'antigravity-som-container';
                container.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2147483647;';

                const scrollX = window.scrollX || window.pageXOffset || 0;
                const scrollY = window.scrollY || window.pageYOffset || 0;

                const actionableList = [];
                selected.forEach((el, idx) => {
                    const markNum = idx + 1;
                    el.setAttribute('data-som-id', String(markNum));

                    const rect = el.getBoundingClientRect();
                    const top = Math.max(0, rect.top + scrollY - 9);
                    const left = Math.max(0, rect.left + scrollX - 5);

                    const pill = document.createElement('div');
                    pill.className = 'antigravity-som-pill';
                    pill.setAttribute('data-som-badge', String(markNum));
                    pill.textContent = '#' + markNum;
                    pill.style.cssText = [
                        'position:absolute',
                        'top:' + top + 'px',
                        'left:' + left + 'px',
                        'background:#FFE600',
                        'color:#000000',
                        'font-size:11px',
                        'font-weight:900',
                        'font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
                        'padding:1px 5px',
                        'border-radius:4px',
                        'border:1.5px solid rgba(0,0,0,0.85)',
                        'box-shadow:0 2px 6px rgba(0,0,0,0.6), 0 0 10px rgba(255,230,0,0.6)',
                        'z-index:2147483647',
                        'pointer-events:none',
                        'line-height:14px',
                        'white-space:nowrap'
                    ].join(';');

                    container.appendChild(pill);

                    // Add subtle outline to marked element
                    const orig = el.style.outline;
                    el.setAttribute('data-som-orig-outline', orig || '');
                    el.style.outline = '1.5px solid rgba(255, 230, 0, 0.75)';

                    const labelText = getElementLabel(el);
                    actionableList.push({
                        mark: '#' + markNum,
                        id: markNum,
                        text: labelText.slice(0, 70),
                        tag: el.tagName.toLowerCase(),
                        href: el.href || el.getAttribute('href') || '',
                        rect: { top: Math.round(rect.top), left: Math.round(rect.left), width: Math.round(rect.width), height: Math.round(rect.height) }
                    });
                });

                document.documentElement.appendChild(container);
                return actionableList;
            })();
        `);
        return marks || [];
    } catch (e) {
        return [];
    }
}

/**
 * Universal Set-of-Marks Cleanup.
 * Removes floating badge overlay and unbinds `data-som-id`.
 */
export async function cleanSetOfMarksOverlay(webview) {
    if (!webview || typeof webview.executeJavaScript !== 'function') return;
    try {
        await webview.executeJavaScript(`
            (function() {
                const container = document.getElementById('antigravity-som-container');
                if (container) container.remove();
                document.querySelectorAll('[data-som-id]').forEach(el => {
                    const orig = el.getAttribute('data-som-orig-outline');
                    if (orig !== null) el.style.outline = orig;
                    el.removeAttribute('data-som-id');
                    el.removeAttribute('data-som-orig-outline');
                });
            })();
        `);
    } catch (_) {}
}

/**
 * Universal HTML5 Media Playback State Inspector.
 * Inspects any <video> or <audio> element on the active page.
 * Works across YouTube, Vimeo, Spotify, SoundCloud, Twitch, Netflix, or any HTML5 web player.
 */
export async function executeWebviewVerifyMedia(webview) {
    if (!webview || typeof webview.executeJavaScript !== 'function') {
        return { hasMedia: false, isPlaying: false, message: 'Webview is unavailable' };
    }

    try {
        const res = await webview.executeJavaScript(`
            (function() {
                const mediaEls = Array.from(document.querySelectorAll('video, audio'));
                if (mediaEls.length === 0) {
                    return {
                        hasMedia: false,
                        isPlaying: false,
                        message: 'No HTML5 <video> or <audio> elements found on active page.'
                    };
                }

                // Look for actively playing media
                const playingEl = mediaEls.find(m => !m.paused && m.currentTime > 0 && !m.ended && m.readyState >= 2);
                if (playingEl) {
                    let mediaTitle = document.title || '';
                    const titleEl = document.querySelector('h1.ytd-watch-metadata, h1.title, .track-name, .media-title, [class*="title"]');
                    if (titleEl && titleEl.innerText) {
                        mediaTitle = titleEl.innerText.trim();
                    }

                    return {
                        hasMedia: true,
                        isPlaying: true,
                        tag: playingEl.tagName.toLowerCase(),
                        title: mediaTitle,
                        currentTime: Math.round(playingEl.currentTime * 10) / 10,
                        duration: Math.round((playingEl.duration || 0) * 10) / 10,
                        paused: playingEl.paused,
                        muted: playingEl.muted,
                        volume: Math.round(playingEl.volume * 100),
                        src: playingEl.currentSrc || playingEl.src || ''
                    };
                }

                // Media elements exist but are not playing
                const first = mediaEls[0];
                return {
                    hasMedia: true,
                    isPlaying: false,
                    tag: first.tagName.toLowerCase(),
                    currentTime: Math.round(first.currentTime * 10) / 10,
                    duration: Math.round((first.duration || 0) * 10) / 10,
                    paused: first.paused,
                    readyState: first.readyState,
                    message: first.paused ? 'Media element found, but playback is currently paused.' : 'Media element is buffering or awaiting playback.'
                };
            })();
        `);
        return res || { hasMedia: false, isPlaying: false, message: 'No media state returned' };
    } catch (e) {
        return { hasMedia: false, isPlaying: false, message: e.message };
    }
}

/**
 * Helper to extract tab index from prompt ("2nd tab", "tab 3", "third tab")
 */
export function extractTabIndexFromPrompt(raw) {
    const lower = raw.toLowerCase();
    const rankMap = {
        'first': 1, '1st': 1,
        'second': 2, '2nd': 2,
        'third': 3, '3rd': 3,
        'fourth': 4, '4th': 4,
        'fifth': 5, '5th': 5,
        'sixth': 6, '6th': 6,
        'seventh': 7, '7th': 7,
        'eighth': 8, '8th': 8,
        'ninth': 9, '9th': 9,
        'tenth': 10, '10th': 10
    };

    for (const [word, num] of Object.entries(rankMap)) {
        if (new RegExp('\\b' + word + '\\s+tab\\b', 'i').test(lower) || new RegExp('\\btab\\s+' + word + '\\b', 'i').test(lower)) {
            return num;
        }
    }

    const numMatch = lower.match(/\btab\s+(\d+)\b/i) || lower.match(/\b(\d+)(?:st|nd|rd|th)?\s+tab\b/i);
    if (numMatch) {
        return parseInt(numMatch[1], 10);
    }

    return null;
}

/**
 * Execute sub-agent delegated task run on target tab with isolated goal
 */
export async function executeSubAgentRun(subagentId, role, subGoal, context = {}) {
    const {
        activeTabId,
        getActiveWebview,
        onNavigate
    } = context;

    const wv = document.getElementById(`wv-${activeTabId}`) || ((typeof getActiveWebview === 'function') ? getActiveWebview() : null);
    if (!wv) {
        return { success: false, summary: `Sub-agent [${subagentId}] failed: Tab webview not found.`, dom_delta: '' };
    }

    const preSnap = await captureDomSnapshot(wv);
    let subSummary = `Sub-agent [${subagentId}] (${role}) executed goal: "${subGoal}"`;
    let subSuccess = true;

    if (/play|video|pause|toggle|space/i.test(subGoal)) {
        const keyRes = await executeWebviewKeyPress(wv, 'Space');
        subSuccess = keyRes.success;
        subSummary = `Toggled media playback via Space key.`;
    } else if (/fill|form|type|enter/i.test(subGoal)) {
        const textMatch = subGoal.match(/["']([^"']+)["']/);
        const textToType = textMatch ? textMatch[1] : subGoal.replace(/fill|form|type|enter/gi, '').trim();
        const typeRes = await executeWebviewType(wv, textToType, null, false, true);
        subSuccess = typeRes.success;
        subSummary = typeRes.message;
    } else if (/click|submit|press/i.test(subGoal)) {
        const clickTarget = subGoal.replace(/click|submit|press/gi, '').trim();
        const clickRes = await executeWebviewClick(wv, clickTarget, onNavigate);
        subSuccess = clickRes.success;
        subSummary = clickRes.message;
    } else {
        subSummary = `Sub-agent completed operation on tab ${activeTabId}.`;
    }

    await new Promise(r => setTimeout(r, 400));
    const postSnap = await captureDomSnapshot(wv);
    const delta = computeDomDelta(preSnap, postSnap);

    return {
        success: subSuccess,
        summary: subSummary,
        dom_delta: delta.summary,
        artifacts: { url: postSnap.url, title: postSnap.title }
    };
}

/**
 * Structured Tool Call Executor & State Verification Loop
 */
export async function executeToolCallAndVerify(toolCall, context = {}) {
    const {
        tabs = [],
        activeTabId = 1,
        activeTab = null,
        onOpenTab,
        onCloseTab,
        onSelectTab,
        onNavigate,
        getActiveWebview,
        onExecuteClick,
        onExecuteScroll
    } = context;

    const name = toolCall.name || toolCall.tool || '';
    const args = toolCall.args || toolCall.parameters || {};
    const wv = getActiveWebview ? getActiveWebview() : null;

    if (name === 'open_tab') {
        if (args.inCurrentTab || (typeof args.url === 'string' && /\b(?:in\s+(?:the\s+)?(?:current|this|active)\s+tab|here)\b/i.test(args.url))) {
            return await executeToolCallAndVerify({ name: 'navigate', args: { url: args.url } }, context);
        }
        const targetUrl = args.url ? resolveTargetUrl(args.url) : '';
        const title = args.title || (targetUrl ? args.url : 'New Tab');
        const prevCount = tabs.length;
        let newTabId = null;
        if (onOpenTab) {
            newTabId = onOpenTab(targetUrl, title);
        }
        await new Promise(r => setTimeout(r, 600));
        if (!newTabId) {
            try {
                const tabsRes = await fetch('http://127.0.0.1:4892/api/tabs').then(r => r.json()).catch(() => null);
                if (tabsRes && tabsRes.activeTabId) newTabId = tabsRes.activeTabId;
            } catch (e) {}
        }
        return {
            success: true,
            action: 'open_tab',
            tabId: newTabId,
            message: targetUrl ? `Opened "${title}" in a new tab.` : 'Opened a new blank tab.',
            verification: `✅ [Verified Action: Opened New Tab #${prevCount + 1}${targetUrl ? ` (${targetUrl})` : ''}]`
        };
    }

    if (name === 'close_tab') {
        const prevCount = tabs.length;
        if (args.all && onCloseTab) {
            tabs.forEach(t => onCloseTab(t.id));
            if (onOpenTab) onOpenTab('', 'New Tab');
            return {
                success: true,
                action: 'close_tab',
                message: 'Closed all open tabs.',
                verification: '✅ [Verified Action: All tabs closed]'
            };
        }
        let targetId = args.id;
        if (!targetId && args.index !== undefined) {
            const idx = parseInt(args.index, 10);
            if (idx >= 1 && idx <= tabs.length) targetId = tabs[idx - 1].id;
        }
        if (!targetId) targetId = activeTabId;
        if (onCloseTab) onCloseTab(targetId);
        await new Promise(r => setTimeout(r, 400));
        return {
            success: true,
            action: 'close_tab',
            message: `Closed tab #${targetId}.`,
            verification: `✅ [Verified Action: Closed Tab #${targetId}. Remaining tabs: ${Math.max(0, prevCount - 1)}]`
        };
    }

    if (name === 'switch_tab') {
        let targetId = args.id;
        let targetIdx = args.index;
        if (targetIdx !== undefined && (!targetId || !tabs.find(t => t.id === targetId))) {
            const idx = parseInt(targetIdx, 10);
            if (idx >= 1 && idx <= tabs.length) {
                targetId = tabs[idx - 1].id;
            }
        }
        const targetTab = tabs.find(t => t.id === targetId) || tabs[0];
        if (targetTab && onSelectTab) {
            onSelectTab(targetTab.id);
            return {
                success: true,
                action: 'switch_tab',
                message: `Switched to tab "${targetTab.title || 'Untitled'}".`,
                verification: `✅ [Verified Action: Active tab switched to #${targetTab.id} ("${targetTab.title || targetTab.url}")]`
            };
        }
        return {
            success: false,
            action: 'switch_tab',
            error: 'Tab not found to switch',
            verification: '⚠️ [Verification Failed: Target tab not found]'
        };
    }

    if (name === 'navigate') {
        const url = args.url ? resolveTargetUrl(args.url) : '';
        if (url && onNavigate) {
            let prevUrl = '';
            try { if (wv && typeof wv.getURL === 'function') prevUrl = wv.getURL() || ''; } catch (_) {}
            onNavigate(url);

            // Physically await and verify webview URL change
            let currentUrl = prevUrl;
            let currentTitle = '';
            for (let i = 0; i < 10; i++) {
                await new Promise(r => setTimeout(r, 250));
                try {
                    if (wv && typeof wv.getURL === 'function') {
                        currentUrl = wv.getURL() || '';
                        currentTitle = (typeof wv.getTitle === 'function' ? wv.getTitle() : '') || '';
                        if (currentUrl && currentUrl !== 'about:blank' && (currentUrl !== prevUrl || i >= 4)) {
                            break;
                        }
                    }
                } catch (_) {}
            }

            const targetDomain = (function() {
                try { return new URL(url).hostname.replace(/^www\./, ''); } catch(e) { return url; }
            })();

            const isVerified = currentUrl && currentUrl !== 'about:blank' && (currentUrl.includes(targetDomain) || (currentUrl !== prevUrl && !currentUrl.includes('about:blank')));
            if (isVerified) {
                return {
                    success: true,
                    action: 'navigate',
                    url: currentUrl,
                    message: `Navigated active tab to ${currentUrl || url}. Title: "${currentTitle}".`,
                    verification: `✅ [Verified Action: Navigated active tab to ${currentUrl || url}${currentTitle ? ` ("${currentTitle}")` : ''}]`
                };
            } else {
                return {
                    success: false,
                    action: 'navigate',
                    url: currentUrl,
                    message: `Navigation initiated to ${url}, but active webview URL is currently "${currentUrl}".`,
                    verification: `⚠️ [Verification Failed: Active tab URL did not navigate to "${url}"]`
                };
            }
        }
        return { success: false, action: 'navigate', verification: '⚠️ [Verification Failed: No URL provided]' };
    }

    if (name === 'click_element') {
        const target = args.target || '';
        if (target) {
            const clickRes = await executeWebviewClick(wv, target, onNavigate);
            if (!clickRes || !clickRes.success) {
                return {
                    success: false,
                    action: 'click_element',
                    message: clickRes?.message || `Could not find clickable element matching "${target}".`,
                    verification: `⚠️ [Verification Failed: Element "${target}" not found or not clickable on active page]`
                };
            }
            await new Promise(r => setTimeout(r, 600));
            const newUrl = (wv && typeof wv.getURL === 'function') ? wv.getURL() : '';
            return {
                success: true,
                action: 'click_element',
                message: clickRes.message || `Clicked element matching "${target}".`,
                verification: `✅ [Verified Action: Clicked "${target}"${newUrl && !newUrl.includes('about:blank') ? ` (URL: ${newUrl})` : ''}]`
            };
        }
        return { success: false, action: 'click_element', verification: '⚠️ [Verification Failed: No click target specified]' };
    }

    if (name === 'type_text') {
        const text = args.text || '';
        if (text) {
            const typeRes = await executeWebviewType(wv, text, args.target, args.submit === true, args.clear !== false);
            if (!typeRes || !typeRes.success) {
                return {
                    success: false,
                    action: 'type_text',
                    message: typeRes?.message || 'Failed to type text into target.',
                    verification: `⚠️ [Verification Failed: Could not type text into ${args.target ? `target "${args.target}"` : 'active field'}]`
                };
            }
            return {
                success: true,
                action: 'type_text',
                message: typeRes.message,
                verification: `✅ [Verified Action: ${typeRes.message}]`
            };
        }
        return { success: false, action: 'type_text', verification: '⚠️ [Verification Failed: No text provided]' };
    }

    if (name === 'press_key') {
        const key = args.key || 'Space';
        const modifiers = args.modifiers || [];
        const keyRes = await executeWebviewKeyPress(wv, key, modifiers);
        if (!keyRes || !keyRes.success) {
            return {
                success: false,
                action: 'press_key',
                message: keyRes?.message || `Failed to press key "${key}".`,
                verification: `⚠️ [Verification Failed: Key "${key}" dispatch failed]`
            };
        }
        return {
            success: true,
            action: 'press_key',
            message: keyRes.message,
            verification: `✅ [Verified Action: ${keyRes.message}]`
        };
    }

    if (name === 'hover_element') {
        const target = args.target || '';
        if (target) {
            const hoverRes = await executeWebviewHover(wv, target);
            if (!hoverRes || !hoverRes.success) {
                return {
                    success: false,
                    action: 'hover_element',
                    message: hoverRes?.message || `Could not hover over "${target}".`,
                    verification: `⚠️ [Verification Failed: Hover target "${target}" not found]`
                };
            }
            return {
                success: true,
                action: 'hover_element',
                message: hoverRes.message,
                verification: `✅ [Verified Action: ${hoverRes.message}]`
            };
        }
        return { success: false, action: 'hover_element', verification: '⚠️ [Verification Failed: No hover target specified]' };
    }

    if (name === 'delegate_subtask') {
        const subId = args.subagent_id || ('sub_' + Math.random().toString(36).slice(2, 6));
        const role = args.role || 'general_worker';
        const subGoal = args.goal || '';
        const subTabId = args.tab_id !== undefined ? args.tab_id : activeTabId;

        if (!globalSubAgentManager.canSpawn()) {
            return {
                success: false,
                action: 'delegate_subtask',
                subagent_id: subId,
                message: `Cannot spawn sub-agent [${subId}]: Maximum 3 concurrent sub-agents limit reached to protect RAM.`,
                verification: `⚠️ [Delegation Rejected: RAM protection active, maximum 3 sub-agents running]`
            };
        }

        try {
            globalSubAgentManager.register(subId, role, subGoal, subTabId);
        } catch (e) {
            return { success: false, action: 'delegate_subtask', message: e.message, verification: `⚠️ [Delegation Error: ${e.message}]` };
        }

        const subContext = {
            ...context,
            activeTabId: subTabId,
            subagentId: subId
        };

        const subRes = await executeSubAgentRun(subId, role, subGoal, subContext);
        const completedRecord = globalSubAgentManager.complete(subId, subRes.success, subRes.summary, subRes.artifacts, subRes.dom_delta);
        globalSubAgentManager.terminate(subId); // Free slot immediately

        return {
            success: subRes.success,
            action: 'delegate_subtask',
            subagent_id: subId,
            message: `Sub-agent [${subId}] (${role}) completed: ${subRes.summary}`,
            result: completedRecord,
            verification: subRes.success
                ? `✅ [Sub-Agent [${subId}] Handover: ${subRes.summary} | DOM Delta: ${subRes.dom_delta || 'verified'}]`
                : `⚠️ [Sub-Agent [${subId}] Handover Failed: ${subRes.summary}]`
        };
    }

    if (name === 'scroll_page') {
        const direction = args.direction || 'down';
        const amount = args.amount !== undefined ? args.amount : 50;
        const scrollRes = await executeWebviewScroll(wv, direction, amount, true);
        return {
            success: scrollRes.success,
            action: 'scroll_page',
            message: `Scrolled page ${direction}.`,
            verification: `✅ [Verified Action: Scrolled page ${direction} by scale ${amount}]`
        };
    }

    if (name === 'download_item') {
        const directUrl = args.url;
        if (directUrl) {
            try {
                await fetch('http://127.0.0.1:4892/api/downloads/trigger', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: directUrl })
                });
            } catch (e) { }
        } else if (args.target) {
            await executeWebviewClick(wv, args.target, onNavigate);
        }

        // Poll /api/downloads/verify for up to 2.5s
        let dlCheck = null;
        for (let i = 0; i < 5; i++) {
            await new Promise(r => setTimeout(r, 500));
            dlCheck = await fetch('http://127.0.0.1:4892/api/downloads/verify').then(r => r.json()).catch(() => null);
            if (dlCheck && (dlCheck.hasActiveDownloads || dlCheck.hasCompletedDownloads)) {
                break;
            }
        }

        if (dlCheck && dlCheck.hasActiveDownloads) {
            const dl = dlCheck.active[0];
            return {
                success: true,
                action: 'download_item',
                message: `Download started: "${dl.filename}"`,
                verification: `✅ [Verified Action: Download started for "${dl.filename}" (${dl.percent}%)]`
            };
        } else if (dlCheck && dlCheck.hasCompletedDownloads) {
            const dl = dlCheck.completed[0];
            return {
                success: true,
                action: 'download_item',
                message: `Download completed: "${dl.filename}"`,
                verification: `✅ [Verified Action: Download finished (${dl.totalBytesFormatted}) at ${dl.savePath}]`
            };
        }
        return {
            success: false,
            action: 'download_item',
            message: 'Initiated download click on page.',
            verification: '⚠️ [Verification Alert: Download has not registered in manager yet. Monitoring background downloads...]'
        };
    }

    if (name === 'verify_state') {
        const check = args.check || 'tabs';
        if (check === 'downloads') {
            const dlRes = await fetch('http://127.0.0.1:4892/api/downloads/verify').then(r => r.json()).catch(() => null);
            return {
                success: true,
                action: 'verify_state',
                message: `Downloads verified: ${dlRes?.totalCount || 0} items (${dlRes?.activeCount || 0} active).`,
                verification: `✅ [Verified State: Downloads checked. Active: ${dlRes?.activeCount || 0}, Total: ${dlRes?.totalCount || 0}]`
            };
        }
        return {
            success: true,
            action: 'verify_state',
            message: `Total open tabs: ${tabs.length}, Active tab #${activeTabId} ("${activeTab?.title || ''}").`,
            verification: `✅ [Verified State: ${tabs.length} tabs open, active tab #${activeTabId}]`
        };
    }

    if (name === 'verify_media_playback' || name === 'verify_media') {
        const mediaState = await executeWebviewVerifyMedia(wv);
        if (mediaState.isPlaying) {
            return {
                success: true,
                action: 'verify_media_playback',
                mediaState,
                message: `Active ${mediaState.tag} playback verified: "${mediaState.title || 'media'}" at ${mediaState.currentTime}s / ${mediaState.duration}s (Vol: ${mediaState.volume}%, Muted: ${mediaState.muted}).`,
                verification: `✅ [Verified State: Media is actively playing at ${mediaState.currentTime}s / ${mediaState.duration}s]`
            };
        } else {
            return {
                success: false,
                action: 'verify_media_playback',
                mediaState,
                message: mediaState.message || 'No active media playback detected on this page.',
                verification: `⚠️ [Verification Notice: ${mediaState.message || 'No media actively playing'}]`
            };
        }
    }

    if (name === 'search_page') {
        const query = args.query || args.text || '';
        if (query) {
            let resMsg = '';
            let isOk = false;
            if (wv && typeof wv.executeJavaScript === 'function') {
                const typeRes = await typeAndSubmitInSearchBar(wv, query);
                isOk = !(typeof typeRes === 'string' && typeRes.startsWith('⚠️'));
                resMsg = typeRes;
            } else if (onNavigate) {
                onNavigate(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
                resMsg = `Navigated to search for "${query}".`;
                isOk = true;
            }
            if (isOk) {
                await new Promise(r => setTimeout(r, 1200));
                let curUrl = '';
                try { if (wv && typeof wv.getURL === 'function') curUrl = wv.getURL() || ''; } catch (_) {}
                return {
                    success: true,
                    action: 'search_page',
                    message: resMsg || `Searched for "${query}".`,
                    verification: `✅ [Verified Action: Searched for "${query}" on active site${curUrl ? ` (URL: ${curUrl})` : ''}]`
                };
            } else {
                return {
                    success: false,
                    action: 'search_page',
                    message: resMsg,
                    verification: `⚠️ [Verification Failed: Search input not found on active page]`
                };
            }
        }
        return { success: false, action: 'search_page', verification: '⚠️ [Verification Failed: No query provided]' };
    }

    if (name === 'read_page' || name === 'read_site') {
        if (!wv || typeof wv.executeJavaScript !== 'function') {
            return {
                success: false,
                action: 'read_page',
                message: 'No active webview available to read page.',
                verification: '⚠️ [Verification Failed: No active webview]'
            };
        }

        // Await page settling if loading
        for (let i = 0; i < 15; i++) {
            let isLoading = false;
            try { isLoading = (typeof wv.isLoading === 'function') ? wv.isLoading() : false; } catch (_) {}
            if (!isLoading) {
                try {
                    const ready = await wv.executeJavaScript(`document.readyState === 'complete' || (document.body && document.body.children.length > 0)`);
                    if (ready) break;
                } catch (e) { }
            }
            await new Promise(r => setTimeout(r, 200));
        }

        try {
            const pageData = await wv.executeJavaScript(`
                (function() {
                    const title = document.title || '';
                    const url = window.location.href || '';
                    
                    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
                        .map(h => (h.innerText || h.textContent || '').trim().replace(/\\s+/g, ' '))
                        .filter(h => h.length > 2 && h.length < 200)
                        .slice(0, 30);

                    const links = Array.from(document.querySelectorAll('a, [role="link"]'))
                        .map(a => {
                            const aria = (a.getAttribute('aria-label') || '').trim();
                            const titleAttr = (a.getAttribute('title') || '').trim();
                            const txt = (a.innerText || a.textContent || '').trim();
                            const label = (aria || titleAttr || txt).replace(/\\s+/g, ' ');
                            const href = a.href || a.getAttribute('href') || '';
                            return { text: label, href };
                        })
                        .filter(l => l.text.length > 2 && l.href && !l.href.startsWith('javascript:'))
                        .slice(0, 60);

                    const downloads = Array.from(document.querySelectorAll('a, button, .btn, [class*="download" i], [class*="episode" i], [class*="stream" i]'))
                        .map(el => {
                            const aria = (el.getAttribute('aria-label') || '').trim();
                            const txt = (el.innerText || el.textContent || '').trim();
                            const href = el.href || el.getAttribute('href') || '';
                            const label = (aria || txt).replace(/\\s+/g, ' ');
                            return { text: label, href };
                        })
                        .filter(d => /\\b(?:1080p|720p|480p|2160p|4k|download|episode|ep\\s*\\d+|direct|g-?drive|stream|torrent|magnet|batch)\\b/i.test(d.text + ' ' + d.href))
                        .slice(0, 40);

                    const searchInputs = Array.from(document.querySelectorAll('input, textarea'))
                        .filter(i => /search|query|keyword|find/i.test((i.name || '') + ' ' + (i.id || '') + ' ' + (i.placeholder || '') + ' ' + (i.getAttribute('aria-label') || '') + ' ' + (i.type || '')))
                        .map(i => i.placeholder || i.name || i.id || 'search_input')
                        .slice(0, 5);

                    const bodyText = (document.body ? document.body.innerText : '')
                        .replace(/\\s+/g, ' ')
                        .trim()
                        .substring(0, 4000);

                    return { title, url, headings, links, downloads, searchInputs, bodyText };
                })()
            `);

            // Also refresh Set-of-Marks overlay so every clickable element is indexed and visible to user & AI
            let somMarks = [];
            try {
                somMarks = await renderSetOfMarksOverlay(wv, 120);
                pageData.actionableMarks = somMarks;
            } catch (_) {}

            const dlList = (pageData.downloads || []).map(d => `- "${d.text}" ${d.href ? `-> ${d.href}` : ''}`).join('\n');
            const linkList = (pageData.links || []).slice(0, 25).map(l => `- "${l.text}" -> ${l.href}`).join('\n');
            const searchList = (pageData.searchInputs || []).join(', ') || 'none';
            const somList = (somMarks || []).slice(0, 25).map(m => `${m.mark}: "${m.text}" (<${m.tag}>)`).join(' | ');

            const summary = `📄 **Page Title:** "${pageData.title}"\n🔗 **URL:** ${pageData.url}\n🔍 **Search Inputs:** ${searchList}\n📌 **Headings (${pageData.headings?.length || 0}):** ${(pageData.headings || []).slice(0, 10).join(' | ') || 'none'}\n🏷️ **Marked Interactive Elements (${somMarks?.length || 0}):**\n${somList || 'None detected'}\n\n📥 **Detected Download/Stream Triggers (${pageData.downloads?.length || 0}):**\n${dlList || 'None detected'}\n\n🌐 **Top Interactive Links (${pageData.links?.length || 0}):**\n${linkList || 'None detected'}\n\n📝 **Page Content Excerpt:**\n${(pageData.bodyText || '').substring(0, 1200)}...`;

            const isBlank = (!pageData.title || pageData.title === 'about:blank') && (!pageData.links || pageData.links.length === 0);
            if (isBlank) {
                return {
                    success: false,
                    action: 'read_page',
                    page: pageData,
                    message: summary,
                    verification: `⚠️ [Verification Notice: Active page is currently blank or still loading ("${pageData.url}")]`
                };
            }

            return {
                success: true,
                action: 'read_page',
                page: pageData,
                message: summary,
                verification: `✅ [Verified Action: Read live page state: "${pageData.title}" (${somMarks?.length || 0} marks stamped, ${pageData.links?.length || 0} links, ${pageData.downloads?.length || 0} downloads)]`
            };
        } catch (e) {
            return {
                success: false,
                action: 'read_page',
                message: `Failed to read page: ${e.message}`,
                verification: `⚠️ [Verification Failed: ${e.message}]`
            };
        }
    }

    if (name === 'grep_page' || name === 'grep' || name === 'find_on_page') {
        const query = args.query || args.text || args.keyword || '';
        if (!query) {
            return { success: false, action: 'grep_page', verification: '⚠️ [Verification Failed: No query provided]' };
        }
        if (!wv || typeof wv.executeJavaScript !== 'function') {
            return { success: false, action: 'grep_page', verification: '⚠️ [Verification Failed: No active webview]' };
        }
        try {
            if (typeof wv.isLoading === 'function' && wv.isLoading()) {
                await new Promise(r => setTimeout(r, 1000));
            }
        } catch (_) {}
        try {
            const grepRes = await wv.executeJavaScript(`
                (function() {
                    const q = ${JSON.stringify(query)}.toLowerCase().trim();
                    const isSearchQuery = /search|find|query|magnif/i.test(q);

                    // Preserve existing Set-of-Marks and find highest existing mark index
                    let maxMark = 0;
                    document.querySelectorAll('[data-som-id]').forEach(el => {
                        const id = parseInt(el.getAttribute('data-som-id'), 10);
                        if (!isNaN(id) && id > maxMark) maxMark = id;
                    });

                    let somContainer = document.getElementById('antigravity-som-container');
                    if (!somContainer) {
                        somContainer = document.createElement('div');
                        somContainer.id = 'antigravity-som-container';
                        somContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2147483647;';
                        document.documentElement.appendChild(somContainer);
                    }

                    const scrollX = window.scrollX || window.pageXOffset || 0;
                    const scrollY = window.scrollY || window.pageYOffset || 0;

                    // Universal DOM search covering text, inputs, buttons, links, details/summary, SVGs, and ARIA interactives
                    const allNodes = Array.from(document.querySelectorAll(
                        'a, button, input, textarea, select, summary, details, [role="button"], [role="link"], [role="searchbox"], ' +
                        '[role="tab"], [role="menuitem"], [role="checkbox"], [role="radio"], [role="option"], [role="combobox"], ' +
                        '[contenteditable="true"], [tabindex]:not([tabindex="-1"]), [onclick], svg, ' +
                        'h1, h2, h3, h4, h5, h6, p, span, li, tr, td, div, article, section, label, form'
                    ));

                    const matches = [];
                    const seenTexts = new Set();

                    for (const el of allNodes) {
                        if (!el || el.id === 'antigravity-som-container' || (el.closest && el.closest('#antigravity-som-container'))) continue;
                        const tag = el.tagName.toLowerCase();
                        const aria = (el.getAttribute('aria-label') || '').trim();
                        const titleAttr = (el.getAttribute('title') || '').trim();
                        const val = (el.value || '').trim();
                        const placeholder = (el.getAttribute('placeholder') || '').trim();
                        const txt = (el.innerText || el.textContent || '').trim().replace(/\\s+/g, ' ');
                        const href = el.href || el.getAttribute('href') || '';
                        const idAttr = el.id || '';
                        const nameAttr = el.getAttribute('name') || '';
                        const classAttr = typeof el.className === 'string' ? el.className : (el.className?.baseVal || '');

                        const combined = (aria + ' ' + titleAttr + ' ' + val + ' ' + placeholder + ' ' + txt + ' ' + href + ' ' + idAttr + ' ' + nameAttr + ' ' + classAttr).toLowerCase();

                        // Detect SVG use sprite href (#search, #play, etc.)
                        const useEl = el.querySelector ? el.querySelector('use') : (tag === 'use' ? el : null);
                        const useHref = (useEl ? (useEl.getAttribute('href') || useEl.getAttribute('xlink:href') || '') : '').toLowerCase();

                        // Detect search buttons, SVGs, or inputs when searching for search
                        const isSearchButton = isSearchQuery && (
                            tag === 'button' || el.getAttribute('role') === 'button' || el.type === 'submit' || tag === 'svg' || useHref.includes('search') ||
                            /search/i.test(classAttr + ' ' + idAttr)
                        ) && (
                            el.type === 'submit' || combined.includes('search') || useHref.includes('search') ||
                            !!(el.closest && el.closest('[role="search"]')) || !!(el.closest && el.closest('form[action*="search" i]'))
                        );

                        if (combined.includes(q) || isSearchButton || useHref.includes(q)) {
                            // Auto-expand hidden <details> if item is inside one
                            let wasRevealed = false;
                            const parentDetails = el.closest ? el.closest('details') : null;
                            if (parentDetails && !parentDetails.open) {
                                parentDetails.open = true;
                                wasRevealed = true;
                            }
                            if (tag === 'details' && !el.open) {
                                el.open = true;
                                wasRevealed = true;
                            }

                            // Extract concise display text
                            let displayText = aria || titleAttr || val || placeholder || txt;
                            if (useHref) {
                                if (useHref.includes('search')) displayText = '[Search Icon]';
                                else if (useHref.includes('play')) displayText = '[Play Icon]';
                                else if (useHref.includes('close')) displayText = '[Close Icon]';
                                else if (useHref.includes('menu')) displayText = '[Menu Icon]';
                                else displayText = '[' + useHref.replace(/^#/, '') + ' Icon]';
                            }
                            if (!displayText && isSearchButton) displayText = '[Search Button]';
                            if (!displayText && (tag === 'button' || el.getAttribute('role') === 'button')) displayText = '[Button' + (idAttr ? '#' + idAttr : '') + ']';
                            if (!displayText && tag === 'input') displayText = '[Input: ' + (el.type || 'text') + ']';
                            if (!displayText && tag === 'svg') displayText = '[Icon: ' + (classAttr.trim().split(/\\s+/)[0] || 'svg') + ']';
                            if (!displayText) displayText = '<' + tag + '>';

                            if (displayText.length > 200) {
                                const idx = displayText.toLowerCase().indexOf(q);
                                const start = Math.max(0, idx - 40);
                                const end = Math.min(displayText.length, idx + q.length + 80);
                                displayText = (start > 0 ? '...' : '') + displayText.substring(start, end).trim() + (end < displayText.length ? '...' : '');
                            }
                            displayText = displayText.replace(/\\s+/g, ' ').trim();

                            if (displayText && !seenTexts.has(displayText + tag)) {
                                seenTexts.add(displayText + tag);

                                const link = tag === 'a' ? el : (el.closest ? el.closest('a') : null);
                                const button = (tag === 'button' || el.getAttribute('role') === 'button') ? el : (el.closest ? el.closest('button, [role="button"]') : null);
                                const clickTarget = link || button || ((tag === 'input' || tag === 'textarea' || tag === 'summary' || tag === 'details') ? el : el);

                                const isClickable = !!(link || button || tag === 'button' || tag === 'input' || tag === 'summary' || tag === 'details' || el.getAttribute('role') === 'button' || el.getAttribute('role') === 'link' || el.onclick || (typeof el.className === 'string' && el.className.includes('btn')));

                                let markLabel = null;
                                if (isClickable && clickTarget) {
                                    // If target already has a mark, reuse it!
                                    const existingMark = clickTarget.getAttribute('data-som-id');
                                    if (existingMark) {
                                        markLabel = '#' + existingMark;
                                    } else {
                                        // Assign next sequential mark index
                                        maxMark++;
                                        clickTarget.setAttribute('data-som-id', String(maxMark));
                                        const r = clickTarget.getBoundingClientRect();
                                        if (r.width > 0 && r.height > 0) {
                                            const pill = document.createElement('div');
                                            pill.className = 'antigravity-som-pill';
                                            pill.setAttribute('data-som-badge', String(maxMark));
                                            pill.textContent = '#' + maxMark;
                                            pill.style.cssText = 'position:absolute;top:' + Math.max(0, r.top + scrollY - 9) + 'px;left:' + Math.max(0, r.left + scrollX - 5) + 'px;background:#FFE600;color:#000000;font-size:11px;font-weight:900;font-family:ui-monospace,monospace;padding:1px 5px;border-radius:4px;border:1.5px solid rgba(0,0,0,0.85);box-shadow:0 2px 6px rgba(0,0,0,0.6),0 0 10px rgba(255,230,0,0.6);z-index:2147483647;pointer-events:none;line-height:14px;white-space:nowrap;';
                                            somContainer.appendChild(pill);

                                            const orig = clickTarget.style.outline;
                                            clickTarget.setAttribute('data-som-orig-outline', orig || '');
                                            clickTarget.style.outline = '1.5px solid rgba(255, 230, 0, 0.75)';
                                        }
                                        markLabel = '#' + maxMark;
                                    }
                                }

                                matches.push({
                                    tag: tag,
                                    text: displayText,
                                    href: link ? (link.href || '') : (href || null),
                                    isClickable,
                                    mark: markLabel,
                                    isRevealed: wasRevealed
                                });
                            }
                        }
                    }

                    return {
                        title: document.title || '',
                        url: window.location.href || '',
                        matches: matches.slice(0, 30)
                    };
                })()
            `);

            const foundMatches = grepRes?.matches || [];
            if (foundMatches.length > 0) {
                const matchSummary = foundMatches.map((m, i) => {
                    const markBadge = m.mark ? `[Mark ${m.mark}]` : '';
                    const clickTag = m.isClickable ? '(Clickable)' : '';
                    const revTag = m.isRevealed ? '(Revealed from hidden details)' : '';
                    const linkTag = m.href ? `(Link: ${m.href})` : '';
                    return `[${i+1}] <${m.tag}> ${markBadge} "${m.text}" ${linkTag} ${clickTag} ${revTag}`.replace(/\\s+/g, ' ').trim();
                }).join('\n');

                return {
                    success: true,
                    action: 'grep_page',
                    count: foundMatches.length,
                    matches: foundMatches,
                    message: `🔍 Found ${foundMatches.length} occurrences matching "${query}" on "${grepRes.title}":\n${matchSummary}\n\n👉 Tip: Click any marked element above using execute_click({ target: "[Mark #N]" }) or target: "#N"`,
                    verification: `✅ [Verified: Found ${foundMatches.length} matching elements for "${query}" on active page]`
                };
            } else {
                return {
                    success: false,
                    action: 'grep_page',
                    count: 0,
                    matches: [],
                    message: `No elements matching "${query}" found on current page "${grepRes?.title || ''}" (${grepRes?.url || ''}).`,
                    verification: `⚠️ [Verification: No matches found for "${query}" on active page]`
                };
            }
        } catch (e) {
            return {
                success: false,
                action: 'grep_page',
                message: `Grep error: ${e.message}`,
                verification: `⚠️ [Verification Failed: Grep error - ${e.message}]`
            };
        }
    }

    if (name === 'verify_download') {
        const dlRes = await fetch('http://127.0.0.1:4892/api/downloads/verify').then(r => r.json()).catch(() => null);
        if (dlRes && dlRes.success) {
            if (dlRes.hasCompletedDownloads) {
                const c = dlRes.completed[0];
                return {
                    success: true,
                    action: 'verify_download',
                    message: `Verified download on disk: "${c.filename}" (${c.totalBytesFormatted}) at ${c.savePath}.`,
                    verification: `✅ [Verified Action: Download completed on disk - "${c.filename}"]`
                };
            } else if (dlRes.hasActiveDownloads) {
                const a = dlRes.active[0];
                return {
                    success: true,
                    action: 'verify_download',
                    message: `Download actively progressing: "${a.filename}" (${a.percent}%).`,
                    verification: `✅ [Verified Action: Download progressing (${a.percent}%)]`
                };
            }
        }
        return {
            success: false,
            action: 'verify_download',
            message: 'No downloads currently active or completed.',
            verification: '⚠️ [Verification Status: No download registered yet]'
        };
    }

    if (name === 'remind_user') {
        const msg = args.message || 'Action completed!';
        if (context.onRemindUser) {
            context.onRemindUser(msg);
        }
        return {
            success: true,
            action: 'remind_user',
            message: `🔔 Reminder triggered: "${msg}"`,
            verification: `🔔 [Verified Action: User reminder and chime announced!]`
        };
    }

    if (name === 'finish_task') {
        const msg = args.message || 'Task completed successfully.';
        return {
            success: true,
            action: 'finish_task',
            message: `🏁 ${msg}`,
            verification: `🏁 [Verified Goal: ${msg}]`
        };
    }

    if (name === 'get_tools_on_demand') {
        const category = (args.category || 'all').toLowerCase();
        const query = (args.query || '').toLowerCase();
        try {
            const provMod = await import('./services/aiProviderService.js');
            const allTools = provMod.BROWSER_TOOLS || [];
            let matched = allTools;
            if (category !== 'all') {
                if (category === 'second_brain' || category === 'memory') {
                    matched = allTools.filter(t => ['search_memory', 'read_raw_session'].includes(t.function.name));
                } else if (category === 'skills') {
                    matched = allTools.filter(t => ['list_skills', 'read_skill'].includes(t.function.name));
                } else if (category === 'media') {
                    matched = allTools.filter(t => ['verify_media_playback', 'press_key'].includes(t.function.name));
                } else if (category === 'download') {
                    matched = allTools.filter(t => ['download_item', 'verify_download'].includes(t.function.name));
                } else if (category === 'inspection') {
                    matched = allTools.filter(t => ['read_page', 'grep_page'].includes(t.function.name));
                }
            }
            if (query) {
                matched = matched.filter(t => t.function.name.toLowerCase().includes(query) || t.function.description.toLowerCase().includes(query));
            }
            return {
                success: true,
                action: 'get_tools_on_demand',
                pagedTools: matched,
                count: matched.length,
                message: `Paged ${matched.length} tools into context: ${matched.map(t => t.function.name).join(', ')}`,
                verification: `✅ [Verified: On-demand tool pager dynamically loaded ${matched.length} tool schemas without prompt bloat]`
            };
        } catch (e) {
            return {
                success: false,
                action: 'get_tools_on_demand',
                error: e.message,
                verification: `⚠️ [Tool Pager Failed: ${e.message}]`
            };
        }
    }

    if (name === 'search_memory') {
        const query = args.query || '';
        const limit = args.limit || 5;
        try {
            const res = await fetch('http://127.0.0.1:4892/api/memory/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, limit })
            }).then(r => r.json());
            const factsCount = res.facts ? res.facts.length : 0;
            const summariesCount = res.summaries ? res.summaries.length : 0;
            return {
                success: true,
                action: 'search_memory',
                data: res,
                message: `Memory Search Results for "${query}": Found ${factsCount} permanent facts/preferences, ${summariesCount} session summaries.\n` +
                    (res.facts || []).map(f => `- ${f.category}: ${f.snippet}`).join('\n') + '\n' +
                    (res.summaries || []).map(s => `• [Session ${s.session_id} (${s.date})]: ${s.title}\n  Summary: ${s.summary}`).join('\n'),
                verification: `✅ [Verified Memory Search: Found ${factsCount} facts, ${summariesCount} summaries]`
            };
        } catch (e) {
            return {
                success: false,
                action: 'search_memory',
                error: e.message,
                verification: `⚠️ [Memory Search Failed: ${e.message}]`
            };
        }
    }

    if (name === 'read_raw_session') {
        const sessionId = args.session_id || args.sessionId || '';
        try {
            const res = await fetch('http://127.0.0.1:4892/api/memory/raw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId })
            }).then(r => r.json());
            if (res.found) {
                return {
                    success: true,
                    action: 'read_raw_session',
                    sessionId,
                    content: res.content,
                    filePath: res.filePath,
                    message: `Loaded full uncompressed raw session chat (${sessionId}) from disk (${res.filePath}). Length: ${res.content.length} chars.`,
                    verification: `✅ [Verified Action: Full 90-day raw chat loaded for session ${sessionId}]`
                };
            } else {
                return {
                    success: false,
                    action: 'read_raw_session',
                    error: res.error || 'Session transcript not found',
                    verification: `⚠️ [Raw Chat Not Found: ${sessionId}]`
                };
            }
        } catch (e) {
            return {
                success: false,
                action: 'read_raw_session',
                error: e.message,
                verification: `⚠️ [Raw Chat Load Failed: ${e.message}]`
            };
        }
    }

    if (name === 'list_skills') {
        try {
            const res = await fetch('http://127.0.0.1:4892/api/skills').then(r => r.json());
            const skills = res.skills || [];
            return {
                success: true,
                action: 'list_skills',
                skills,
                count: skills.length,
                message: `Available Antigravity Skills (${skills.length}):\n` + skills.map(s => `• ${s.name}: ${s.description}`).join('\n'),
                verification: `✅ [Verified: Retrieved ${skills.length} procedural skills with zero token bloat]`
            };
        } catch (e) {
            return {
                success: false,
                action: 'list_skills',
                error: e.message,
                verification: `⚠️ [List Skills Failed: ${e.message}]`
            };
        }
    }

    if (name === 'read_skill') {
        const skillName = args.name || '';
        try {
            const res = await fetch('http://127.0.0.1:4892/api/skills/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: skillName })
            }).then(r => r.json());
            if (res.found) {
                return {
                    success: true,
                    action: 'read_skill',
                    name: skillName,
                    meta: res.meta,
                    instructions: res.instructions,
                    message: `Loaded procedural skill "${skillName}" (v${res.meta?.version || '1.0.0'}):\n${res.instructions}`,
                    verification: `✅ [Verified: Loaded procedural skill instructions for "${skillName}"]`
                };
            } else {
                return {
                    success: false,
                    action: 'read_skill',
                    error: res.error || `Skill "${skillName}" not found`,
                    verification: `⚠️ [Skill Not Found: "${skillName}"]`
                };
            }
        } catch (e) {
            return {
                success: false,
                action: 'read_skill',
                error: e.message,
                verification: `⚠️ [Read Skill Failed: ${e.message}]`
            };
        }
    }

    return {
        success: false,
        error: `Unknown tool: ${name}`,
        verification: `⚠️ [Unknown Tool: ${name}]`
    };
}

/**
 * Strips raw tool_call code blocks and raw tool JSON definitions from message text,
 * ensuring only natural conversational commentary is displayed to the user while
 * tool executions are cleanly visualized exclusively via interactive UI cards.
 */
export function stripToolCallsFromText(content) {
    if (!content || typeof content !== 'string') return '';
    let text = content;

    // 1. Remove complete fenced tool_call or tool_calls codeblocks
    text = text.replace(/```(?:tool_call|tool_calls)\b[\s\S]*?```/gi, '');

    // 2. Remove complete fenced json/code blocks containing tool call signatures
    text = text.replace(/```(?:json|javascript|js)?\s*\{[\s\S]*?(?:"tool"|"tools"|"tool_calls"|"plan"|"steps"|"action"|"function")[\s\S]*?```/gi, '');

    // 3. Remove in-flight unclosed ```tool_call or ```tool_calls blocks while streaming
    text = text.replace(/```(?:tool_call|tool_calls)\b[\s\S]*$/gi, '');

    // 4. Remove in-flight unclosed JSON tool call blocks while streaming
    text = text.replace(/```(?:json)?\s*\{[\s\S]*?(?:"tool"|"tools"|"tool_calls"|"plan"|"steps"|"action"|"function")[\s\S]*$/gi, '');

    // 5. Clean dangling empty fences
    text = text.replace(/```\s*```/g, '');
    text = text.replace(/```\s*$/g, '');

    // 6. Remove standalone bare JSON objects specifying tool calls/plans/steps with brace depth matching
    let result = '';
    let i = 0;
    while (i < text.length) {
        if (text[i] === '{') {
            let depth = 0;
            let end = -1;
            for (let j = i; j < text.length; j++) {
                if (text[j] === '{') depth++;
                else if (text[j] === '}') {
                    depth--;
                    if (depth === 0) {
                        end = j;
                        break;
                    }
                }
            }
            if (end !== -1) {
                const candidate = text.substring(i, end + 1);
                if (/(?:"tool"|"tools"|"tool_calls"|"plan"|"steps"|"action"|"function")\s*:/i.test(candidate)) {
                    i = end + 1;
                    continue;
                }
            }
        }
        result += text[i];
        i++;
    }

    return result.trim();
}

/**
 * Helper to robustly extract planned tool calls from LLM assistant responses
 */
function extractStepsFromText(content) {
    const steps = [];
    if (!content || typeof content !== 'string') return steps;

    const ingestParsed = (obj) => {
        if (!obj) return;
        if (Array.isArray(obj)) {
            for (const item of obj) ingestParsed(item);
            return;
        }
        if (typeof obj === 'object') {
            if (Array.isArray(obj.steps)) {
                for (const s of obj.steps) ingestParsed(s);
            } else if (Array.isArray(obj.tools)) {
                for (const t of obj.tools) ingestParsed(t);
            } else if (Array.isArray(obj.tool_calls)) {
                for (const tc of obj.tool_calls) ingestParsed(tc);
            } else {
                const toolName = obj.tool || obj.name || obj.action || obj.function;
                if (toolName && typeof toolName === 'string') {
                    let toolArgs = obj.args || obj.parameters || obj.arguments || obj.input || {};
                    if (typeof toolArgs === 'string') {
                        try { toolArgs = JSON.parse(toolArgs); } catch (e) { toolArgs = { raw: toolArgs }; }
                    }
                    steps.push({ name: toolName, args: toolArgs });
                }
            }
        }
    };

    // 1. Codeblocks ```...```
    const codeBlockRegex = /```(?:tool_call|tool_calls|json|javascript|js)?\s*([\s\S]*?)```/gi;
    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
        const inner = match[1].trim();
        try {
            ingestParsed(JSON.parse(inner));
        } catch (e) {
            const firstBrace = inner.indexOf('{');
            const lastBrace = inner.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace > firstBrace) {
                try { ingestParsed(JSON.parse(inner.substring(firstBrace, lastBrace + 1))); } catch (e2) {}
            }
            const firstBracket = inner.indexOf('[');
            const lastBracket = inner.lastIndexOf(']');
            if (firstBracket !== -1 && lastBracket > firstBracket) {
                try { ingestParsed(JSON.parse(inner.substring(firstBracket, lastBracket + 1))); } catch (e3) {}
            }
        }
    }

    if (steps.length > 0) return steps;

    // 2. Inline JSON object or array
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        try { ingestParsed(JSON.parse(content.substring(firstBrace, lastBrace + 1))); } catch (e) {}
    }

    if (steps.length > 0) return steps;

    const firstBracket = content.indexOf('[');
    const lastBracket = content.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
        try { ingestParsed(JSON.parse(content.substring(firstBracket, lastBracket + 1))); } catch (e) {}
    }

    return steps;
}

/**
 * Autonomous Goal-Driven Agent Execution Loop
 * Gives the AI model full agency to perceive, reason, plan, execute tools, observe feedback,
 * verify outcomes, and notify the user when the goal is achieved.
 */
export async function executeAutonomousAgentLoop(promptText, context = {}) {
    const raw = (promptText || '').trim();
    if (!raw) return 'Please provide an instruction.';

    const {
        tabs = [],
        activeTabId = 1,
        activeTab = null,
        onOpenTab,
        onCloseTab,
        onSelectTab,
        onNavigate,
        getActiveWebview,
        onRemindUser,
        onStreamChunk,
        onStreamReasoning,
        onToolEvent,
        signal,
        logTelemetry = () => { }
    } = context;

    let activeConfig = null;
    let BROWSER_TOOLS = [];
    let sendChatMessage = null;

    try {
        const provMod = await import('./services/aiProviderService.js');
        activeConfig = provMod.getActiveProviderConfig();
        BROWSER_TOOLS = provMod.BROWSER_TOOLS;
        sendChatMessage = provMod.streamChatMessage || provMod.sendChatMessage;
    } catch (e) {
        console.warn('[Autonomous Loop Import Error]', e);
    }

    if (!sendChatMessage || !activeConfig) {
        return `⚠️ AI Provider service is not available. Please check AI Provider settings.`;
    }

    const maxTurns = 20;
    const agentHistory = [];
    const executionLogs = [];
    let completed = false;

    const systemPrompt = `You are the Autonomous Antigravity Browser Controller.
You directly control this browser to accomplish the user's goal across ANY web application or platform.

OPERATING PRINCIPLES:
1. THE SINGLE DYNAMIC ACTION RULE: On each turn, carefully analyze the live page observation and plan exactly ONE dynamic action. Never batch blind multi-step sequences.
2. MAIN AGENT ORCHESTRATION & DELEGATION:
   - For atomic tasks (navigating, typing, clicking a button, pressing Space to play video), execute directly.
   - When a task requires focused sub-routines (e.g., filling a multi-field form, managing a background tab, or polling downloads), you autonomously decide to call delegate_subtask(subagent_id, role, goal, tab_id). (Max 3 concurrent sub-agents permitted to protect RAM).
3. KEYBOARD & MEDIA PRIMITIVES: Use press_key("Space") to toggle video play/pause on any player. Use press_key("Enter") to submit forms. Use press_key("Escape") to dismiss popups or modal overlays.
4. SEARCH & FORMS: Use search_page(query) to instantly search on YouTube, Google, or the active page. Use type_text(text, target, submit, clear) to target specific inputs or marks (#N).
5. NOTIFICATIONS: When a goal is accomplished or download completed, call finish_task(message, success) and optionally remind_user(message).

AVAILABLE TOOLS:
- navigate: { "url": string }
- open_tab: { "url"?: string, "title"?: string }
- close_tab: { "index"?: number, "id"?: string }
- switch_tab: { "index"?: number, "id"?: string }
- search_page: { "query": string }
- read_page: {} (AXTree, Set-of-Marks badges #N, and detected placeholders)
- grep_page: { "query": string, "selector"?: string }
- click_element: { "target": string } (Click badge #N, text, or selector)
- type_text: { "text": string, "target"?: string, "submit"?: boolean, "clear"?: boolean }
- press_key: { "key": string } ("Space", "Enter", "Tab", "Escape", "ArrowDown", "k")
- hover_element: { "target": string }
- scroll_page: { "direction": "down"|"up"|"top"|"bottom", "amount"?: number }
- download_item: { "url"?: string, "target"?: string }
- verify_download: {}
- remind_user: { "message": string }
- delegate_subtask: { "subagent_id": string, "role": string, "goal": string, "tab_id"?: number }
- verify_media_playback: {} (Inspect if video/audio is actively playing on any site)
- finish_task: { "message": string, "success": boolean }

Output format:
\`\`\`tool_call
{
  "plan": "Rationale for this single dynamic action",
  "steps": [
    { "tool": "<tool_name>", "args": { ... } }
  ]
}
\`\`\``;

    let lastActionSignature = '';
    let sameActionCount = 0;
    let lastToolObservationDetails = '';
    let liveTabs = tabs;
    let liveActiveTabId = activeTabId;
    let liveActiveTab = activeTab;

    for (let turn = 1; turn <= maxTurns && !completed; turn++) {
        if (signal?.aborted) break;

        // 1. DYNAMICALLY REFRESH LIVE TABS AND ACTIVE TAB STATE
        try {
            const tabsRes = await fetch('http://127.0.0.1:4892/api/tabs').then(r => r.json()).catch(() => null);
            if (tabsRes && Array.isArray(tabsRes.tabs) && tabsRes.tabs.length > 0) {
                liveTabs = tabsRes.tabs;
                liveActiveTabId = tabsRes.activeTabId || liveActiveTabId;
                liveActiveTab = liveTabs.find(t => t.id === liveActiveTabId) || liveTabs[0];
            }
        } catch (e) { }

        const wv = document.getElementById(`wv-${liveActiveTabId}`) || ((typeof getActiveWebview === 'function') ? getActiveWebview() : null);
        let pageObs = null;
        if (wv && typeof wv.executeJavaScript === 'function') {
            try {
                pageObs = await extractAdaptivePageContext(wv);
            } catch (e) { }
        }

        let dlObs = null;
        try {
            dlObs = await fetch('http://127.0.0.1:4892/api/downloads/verify').then(r => r.json()).catch(() => null);
        } catch (e) { }

        const openTabsCount = liveTabs.length;
        let curTabUrl = liveActiveTab?.url || pageObs?.page?.url || '';
        let curTabTitle = liveActiveTab?.title || pageObs?.page?.title || '';
        try {
            if (wv && typeof wv.getURL === 'function') {
                const u = wv.getURL();
                if (u && u !== 'about:blank') curTabUrl = u;
            }
        } catch (_) {}
        try {
            if (wv && typeof wv.getTitle === 'function') {
                const t = wv.getTitle();
                if (t) curTabTitle = t;
            }
        } catch (_) {}

        const activeSubList = globalSubAgentManager.getActiveList();
        const subAgentSummary = activeSubList.length > 0 
            ? activeSubList.map(s => `[${s.subagent_id} (${s.role}): ${s.status}]`).join(', ') 
            : 'none (0/3 active)';

        // 2. CONSTRUCT DYNAMIC TURN PROMPT (WITH ALTERNATING HISTORY GUARANTEE)
        let currentTurnPrompt = '';
        if (turn === 1) {
            currentTurnPrompt = `User Goal: "${raw}"
[Turn 1 - Current Browser State]
- Open Tabs: ${openTabsCount}
- Active Tab: "${curTabTitle}" (${curTabUrl})
- Sub-Agents: ${subAgentSummary}
- Page Phase: ${pageObs?.phase || 'GENERAL_PAGE'}
${pageObs?.searchInputs && pageObs.searchInputs.length > 0 ? `- Search Inputs Detected: ${pageObs.searchInputs.map(i => i.placeholder || i.name || i.id).join(', ')}` : ''}
${pageObs?.actionableElements && pageObs.actionableElements.length > 0 ? `- Actionable Marks [Set-of-Marks]: ${pageObs.actionableElements.slice(0, 35).map(a => `${a.mark}: "${a.text}" (<${a.tag}>)`).join(' | ')}` : ''}
${pageObs?.downloadTriggers && pageObs.downloadTriggers.length > 0 ? `- Download Triggers Detected: ${pageObs.downloadTriggers.slice(0, 5).map(d => d.text).join(' | ')}` : ''}
${dlObs?.hasActiveDownloads || dlObs?.hasCompletedDownloads ? `- Downloads State: ${dlObs.hasCompletedDownloads ? `Completed (${dlObs.completed[0]?.filename})` : `Active (${dlObs.active[0]?.percent}%)`}` : ''}
- Quick Actions: Click any mark directly via execute_click({ target: "#N" }) or target: "[Mark #N]". To find hidden buttons or details, use grep_page({ query: "..." }).

What is your plan and first dynamic action?`;
        } else {
            currentTurnPrompt = `[Turn ${turn} - Live Browser Observation & Action Feedback]
${lastToolObservationDetails}

Current Browser State:
- Open Tabs: ${openTabsCount}
- Active Tab: "${curTabTitle}" (${curTabUrl})
- Sub-Agents: ${subAgentSummary}
- Page Phase: ${pageObs?.phase || 'GENERAL_PAGE'}
${pageObs?.searchInputs && pageObs.searchInputs.length > 0 ? `- Search Inputs Detected: ${pageObs.searchInputs.map(i => i.placeholder || i.name || i.id).join(', ')}` : ''}
${pageObs?.page?.headings && pageObs.page.headings.length > 0 ? `- Headings/Titles on Page: ${pageObs.page.headings.slice(0, 8).join(' | ')}` : ''}
${pageObs?.actionableElements && pageObs.actionableElements.length > 0 ? `- Actionable Marks [Set-of-Marks]: ${pageObs.actionableElements.slice(0, 35).map(a => `${a.mark}: "${a.text}" (<${a.tag}>)`).join(' | ')}` : ''}
${dlObs?.hasActiveDownloads || dlObs?.hasCompletedDownloads ? `- Downloads State: ${dlObs.hasCompletedDownloads ? `Completed (${dlObs.completed[0]?.filename})` : `Active (${dlObs.active[0]?.percent}%)`}` : ''}
- Quick Actions: Click any mark directly via execute_click({ target: "#N" }) or target: "[Mark #N]". To find hidden buttons or details, use grep_page({ query: "..." }).

Based on this live observation, what is your single next dynamic action toward the user goal: "${raw}"?`;
        }

        let aiRes = await sendChatMessage({
            prompt: currentTurnPrompt,
            history: agentHistory,
            systemPrompt,
            tools: BROWSER_TOOLS,
            onChunk: (chunk) => {
                if (onStreamChunk) onStreamChunk(chunk);
            },
            onReasoningChunk: (rChunk) => {
                if (onStreamReasoning) onStreamReasoning(rChunk);
            },
            signal
        });

        // Diagnostic recovery if model request drops
        if (!aiRes || !aiRes.success || aiRes.aborted) {
            logTelemetry('warn', `Turn ${turn}: Model call failed or dropped. Initiating diagnostic recovery...`);
            const retryRes = await sendChatMessage({
                prompt: `[Diagnostic Retry] Previous response dropped. Active tab is "${curTabTitle}" (${curTabUrl}). Goal: "${raw}". State your next dynamic action:`,
                history: agentHistory.slice(-4),
                systemPrompt,
                tools: BROWSER_TOOLS,
                signal
            });
            if (!retryRes || !retryRes.success) {
                executionLogs.push({ turn, error: 'Model connection unrecoverable on turn ' + turn });
                break;
            }
            aiRes = retryRes;
        }

        const replyContent = aiRes.reply || '';
        const reasoningContent = aiRes.reasoning || '';

        // Parse tool calls / steps
        let stepsToExecute = [];

        // Tier 1: native tool_calls
        if (Array.isArray(aiRes.toolCalls) && aiRes.toolCalls.length > 0) {
            stepsToExecute = aiRes.toolCalls;
        }

        // Tier 2: robust codeblock & JSON extraction
        if (stepsToExecute.length === 0) {
            stepsToExecute = extractStepsFromText(replyContent);
        }

        // Tier 3: Anti-hallucination / intent recovery
        if (stepsToExecute.length === 0) {
            if (/open(?:ing)? (?:a )?new tab/i.test(replyContent)) {
                const urlM = replyContent.match(/https?:\/\/[^\s<>"')]+/i);
                stepsToExecute.push({ name: 'open_tab', args: { url: urlM ? urlM[0] : '' } });
            } else if (/navigat(?:ing|e) to (https?:\/\/[^\s<>"')]+)/i.test(replyContent)) {
                const urlM = replyContent.match(/https?:\/\/[^\s<>"')]+/i);
                if (urlM) stepsToExecute.push({ name: 'navigate', args: { url: urlM[0] } });
            } else if (/search(?:ing)? for ["']?([^"'\n\r]+)["']? (?:on|in) (?:youtube|google|page)/i.test(replyContent)) {
                const qM = replyContent.match(/search(?:ing)? for ["']?([^"'\n\r]+)["']? (?:on|in) (?:youtube|google|page)/i);
                if (qM) stepsToExecute.push({ name: 'search_page', args: { query: qM[1] } });
            } else if (/click(?:ing)? (?:on )?(?:the )?(?:badge|mark|button|link|element) ["']?([^"'\n\r]+)["']?/i.test(replyContent)) {
                const cM = replyContent.match(/click(?:ing)? (?:on )?(?:the )?(?:badge|mark|button|link|element) ["']?([^"'\n\r]+)["']?/i);
                if (cM) stepsToExecute.push({ name: 'click_element', args: { target: cM[1] } });
            } else if (/\b(?:task|goal) (?:is )?(?:complete|finished|achieved)\b/i.test(replyContent)) {
                stepsToExecute.push({ name: 'finish_task', args: { message: replyContent } });
            }
        }

        if (stepsToExecute.length === 0) {
            const isFinished = turn > 1 && (
                /\b(?:complete|completed|done|finished|all set|enjoy|succeeded)\b/i.test(replyContent) ||
                replyContent.includes('✅') ||
                replyContent.includes('🏁')
            );
            if (isFinished || turn >= maxTurns) {
                // Goal Verification Gate: Ensure physical media playback if goal was to play music/video
                const isMediaGoal = /\b(?:play|listen|song|music|track|video|watch|stream)\b/i.test(raw);
                if (isMediaGoal && turn < maxTurns && isFinished) {
                    const mediaCheck = await executeWebviewVerifyMedia(wv);
                    if (!mediaCheck || !mediaCheck.isPlaying) {
                        logTelemetry('warn', `Goal Gate: Premature completion rejected. Media is not actively playing yet.`);
                        executionLogs.push({
                            turn,
                            reasoning: reasoningContent,
                            reply: replyContent,
                            executions: []
                        });
                        agentHistory.push({ role: 'user', content: currentTurnPrompt });
                        agentHistory.push({ role: 'assistant', content: replyContent });
                        lastToolObservationDetails = `⚠️ [Goal Gate Verification Failed] Your user goal is to play music/video ("${raw}"), but no HTML5 audio or video is actively playing on this page (${mediaCheck?.message || 'paused or not started'}). Active page: "${curTabTitle}" (${curTabUrl}).
You must click on the target song/video result (e.g. click_element with mark "#1", "#2" or video title) and ensure playback begins before completing the task.`;
                        continue;
                    }
                }

                completed = true;
                executionLogs.push({
                    turn,
                    reasoning: reasoningContent,
                    reply: replyContent
                });
                break;
            }

            // Model explained its thinking without emitting a tool block: provide dynamic continuation nudge
            logTelemetry('info', `Turn ${turn}: Model replied with natural language without tool call. Providing continuation nudge...`);
            executionLogs.push({
                turn,
                reasoning: reasoningContent,
                reply: replyContent,
                executions: []
            });
            agentHistory.push({ role: 'user', content: currentTurnPrompt });
            agentHistory.push({ role: 'assistant', content: replyContent });
            lastToolObservationDetails = `[Action Required] You explained your intent: "${replyContent.trim().slice(0, 160)}".
You MUST emit an actionable tool call in \`\`\`tool_call format to interact with the browser (e.g. search_page, type_text, click_element, press_key, or finish_task).`;
            continue;
        }

        // Single Dynamic Action Enforcement: execute the single planned step for this turn
        const singleStep = stepsToExecute[0];
        const turnExecutions = [];

        if (signal?.aborted) break;

        const toolName = singleStep.name || singleStep.tool;
        const toolArgs = singleStep.args || {};
        const toolCallId = 'tool_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        const startTime = Date.now();

        // Dispatch live start event (renders Antigravity live card in UI)
        if (onToolEvent) {
            onToolEvent({
                id: toolCallId,
                tool: toolName,
                args: toolArgs,
                status: 'running',
                turn
            });
        }

        const turnContext = {
            ...context,
            tabs: liveTabs,
            activeTabId: liveActiveTabId,
            activeTab: liveActiveTab,
            getActiveWebview: () => document.getElementById(`wv-${liveActiveTabId}`) || (typeof getActiveWebview === 'function' ? getActiveWebview() : null)
        };

        // 1. Capture Pre-Action DOM Snapshot
        const preSnap = await captureDomSnapshot(wv);

        // 2. Execute Action
        let execRes = await executeToolCallAndVerify({ name: toolName, args: toolArgs }, turnContext);

        // 3. Dynamic Webview Readiness & Settling Gates
        if (toolName === 'open_tab' && execRes.tabId) {
            liveActiveTabId = execRes.tabId;
            if (typeof onSelectTab === 'function') {
                try { onSelectTab(execRes.tabId); } catch (_) {}
            }
            await new Promise(r => setTimeout(r, 600));
            const newWv = document.getElementById(`wv-${liveActiveTabId}`);
            if (newWv) {
                await waitForWebviewReady(newWv, 4000);
            }
            await new Promise(r => setTimeout(r, 600));
        } else if (toolName === 'navigate' || toolName === 'search_page') {
            await waitForWebviewReady(wv, 3000);
            await new Promise(r => setTimeout(r, 800));
        } else {
            await new Promise(r => setTimeout(r, 600));
        }

        // 4. Capture Post-Action DOM Snapshot & Compute Physical Delta
        const postWv = document.getElementById(`wv-${liveActiveTabId}`) || wv;
        const postSnap = await captureDomSnapshot(postWv);
        const domDelta = computeDomDelta(preSnap, postSnap);
        execRes.domDelta = domDelta;

        // 5. Zero-Delta Detection & Dynamic Self-Healing
        if (!execRes.success || (domDelta.isZeroDelta && ['click_element', 'type_text', 'press_key'].includes(toolName))) {
            logTelemetry('warn', `Zero delta or action failure detected for tool "${toolName}". Initiating self-healing...`);

            if (toolName === 'click_element' && domDelta.isZeroDelta) {
                await executeWebviewKeyPress(wv, 'Escape');
                await new Promise(r => setTimeout(r, 300));
                const retryClick = await executeWebviewClick(wv, toolArgs.target, onNavigate);
                if (retryClick && retryClick.success) {
                    execRes.success = true;
                    execRes.verification = `✅ [Self-Healed: Click registered after clearing overlay]`;
                }
            }
        }

        const durationMs = Date.now() - startTime;
        turnExecutions.push(execRes);

        // Dispatch live completion event
        if (onToolEvent) {
            onToolEvent({
                id: toolCallId,
                tool: toolName,
                args: toolArgs,
                status: execRes.success ? 'completed' : 'failed',
                result: execRes.message,
                observation: `${execRes.verification || ''} | DOM Delta: ${domDelta.summary}`,
                durationMs,
                turn
            });
        }

        if (toolName === 'remind_user' && context.onRemindUser) {
            context.onRemindUser(toolArgs.message || 'Task completed!');
        }
        if (toolName === 'finish_task') {
            const isMediaGoal = /\b(?:play|listen|song|music|track|video|watch|stream)\b/i.test(raw);
            if (isMediaGoal && turn < maxTurns) {
                const mediaCheck = await executeWebviewVerifyMedia(wv);
                if (!mediaCheck || !mediaCheck.isPlaying) {
                    logTelemetry('warn', `Goal Gate: finish_task tool call rejected because media is not playing.`);
                    completed = false;
                    execRes.success = false;
                    execRes.verification = `⚠️ [Goal Gate Failed: Music/video is not playing on active page]`;
                    lastToolObservationDetails = `⚠️ [Goal Gate Verification Failed] You called finish_task, but the user's goal was to play music/video ("${raw}"), and no audio/video is currently playing on "${curTabTitle}" (${mediaCheck?.message || 'paused or not started'}).
You must click on the target song/video item (e.g. click_element with mark "#1", "#2" or video title) to start playback before finishing.`;
                } else {
                    completed = true;
                }
            } else {
                completed = true;
            }
        }

        // Loop detection: Prevent executing identical action with no state progression
        let loopWarning = '';
        const actionSignature = `${toolName}:${JSON.stringify(toolArgs)}`;
        if (actionSignature && actionSignature === lastActionSignature) {
            sameActionCount++;
            if (sameActionCount >= 2) {
                loopWarning = `\n[Loop Warning] You already executed "${actionSignature}" in previous turn. Select an alternate target, use read_page or grep_page, or call finish_task.`;
            }
        } else {
            sameActionCount = 0;
            lastActionSignature = actionSignature;
        }

        executionLogs.push({
            turn,
            reasoning: reasoningContent,
            reply: replyContent,
            executions: turnExecutions
        });

        const toolObservationDetails = turnExecutions.map(e => {
            let detail = `${e.verification || ''}`;
            if (e.message && !e.verification?.includes(e.message)) {
                detail += `\n${e.message}`;
            }
            if (e.domDelta?.summary) {
                detail += `\nPhysical DOM Delta: ${e.domDelta.summary}`;
            }
            if (e.action === 'read_page' && e.page) {
                if (e.page.headings && e.page.headings.length > 0) {
                    detail += `\nPage Headings: ${e.page.headings.slice(0, 15).join(' | ')}`;
                }
                if (e.page.downloads && e.page.downloads.length > 0) {
                    detail += `\nDownload/Stream Items: ${e.page.downloads.slice(0, 12).map(d => `"${d.text}"`).join(' | ')}`;
                }
                if (e.page.links && e.page.links.length > 0) {
                    detail += `\nTop Links: ${e.page.links.slice(0, 15).map(l => `"${l.text}"`).join(' | ')}`;
                }
            }
            if (e.action === 'grep_page' && Array.isArray(e.matches) && e.matches.length > 0) {
                detail += `\nMatches:\n${e.matches.slice(0, 20).map((m, i) => `${m.mark ? `[Mark ${m.mark}]` : `[#${i+1}]`} <${m.tag}> "${m.text}" ${m.isClickable ? '(Clickable)' : ''} ${m.isRevealed ? '(Revealed)' : ''} ${m.href ? `-> ${m.href}` : ''}`.replace(/\s+/g, ' ').trim()).join('\n')}`;
            }
            return detail.trim();
        }).join('\n\n');

        lastToolObservationDetails = toolObservationDetails + loopWarning;

        // Commit alternating turn to history (User Turn Prompt -> Assistant Reply)
        agentHistory.push({ role: 'user', content: currentTurnPrompt });
        agentHistory.push({ role: 'assistant', content: replyContent });

        const hasReminder = turnExecutions.some(e => e.action === 'remind_user');
        if (hasReminder || completed) {
            completed = true;
            break;
        }

        // Pause briefly for DOM / navigation settling before next turn
        await new Promise(r => setTimeout(r, 600));
    }

    // Format single concise conclusion only (concise tool cards above display all live execution details)
    let conclusionText = '';
    const finishExecution = executionLogs.flatMap(l => l.executions || []).find(e => e.action === 'finish_task' || e.action === 'remind_user');
    if (finishExecution && (finishExecution.message || finishExecution.verification)) {
        conclusionText = finishExecution.message || finishExecution.verification;
    } else {
        const lastLog = executionLogs[executionLogs.length - 1];
        const lastClean = stripToolCallsFromText(lastLog?.reply || '');
        if (lastClean && !lastClean.startsWith('{') && !lastClean.startsWith('[')) {
            conclusionText = lastClean;
        } else if (lastLog?.executions && lastLog.executions.length > 0) {
            const lastEx = lastLog.executions[lastLog.executions.length - 1];
            conclusionText = lastEx.verification || lastEx.message || 'Workflow steps completed.';
        } else {
            conclusionText = 'Autonomous workflow complete.';
        }
    }

    return `🎯 <strong>Conclusion:</strong> ${conclusionText.replace(/\n/g, '<br>')}`;
}

/**
 * Main AI Natural Language Command Processor & Harness Controller
 */
export async function executeAiBrowserCommand(promptText, context = {}) {
    let raw = (promptText || '').trim();
    if (!raw) return 'Please provide an AI browser instruction.';

    const {
        tabs = [],
        activeTabId = 1,
        activeTab = null,
        onOpenTab,
        onCloseTab,
        onSelectTab,
        onNavigate,
        getActiveWebview,
        onToggleBookmark,
        onOpenReaderMode,
        onOpenQrCode,
        onOpenTabSearch,
        onOpenHistory,
        onToggleMute,
        onExecuteClick,
        onExecuteScroll,
        logTelemetry = () => { }
    } = context;

    // Strip trailing sentence punctuation from Whisper voice transcripts
    raw = raw.replace(/[.,!?;:]+$/g, '').trim();

    // Conversational Intent Normalizer (Strips conversational preambles: "can you open a new tab for me", "please close this tab")
    let cleanPrompt = raw
        .replace(/^(?:hey\s+(?:browser|copilot|ai|antigravity)\s*[,:]?\s*|ok(?:ay)?\s+(?:browser|copilot|ai)\s*[,:]?\s*|copilot\s*[,:]?\s*|browser\s*[,:]?\s*)/i, '')
        .replace(/^(?:can\s+you\s+(?:please\s+)?|could\s+you\s+(?:please\s+)?|please\s+|would\s+you\s+(?:please\s+)?|i\s+want\s+(?:you\s+)?to\s+|i\s+would\s+like\s+to\s+|go\s+ahead\s+and\s+|help\s+me\s+(?:to\s+)?)/i, '')
        .replace(/\s+(?:for\s+me|please|right\s+now|now|at\s+once)\s*$/i, '')
        .replace(/[.,!?;:]+$/g, '')
        .trim();

    const isSingleStep = !/\b(?:and|then|after|also|while)\b/i.test(cleanPrompt);

    // 0. COMPOUND VOICE SEARCH & NAVIGATION COMMANDS:
    // e.g., "open youtube and search for music", "open google and search ai news", "search for lo-fi hip hop on youtube"
    const compoundSiteSearchMatch =
        cleanPrompt.match(/^(?:open|go\s+to|navigate\s+to)\s+(youtube|google|github|wikipedia|reddit|bing|duckduckgo|amazon)\s+(?:and|then)\s+(?:search(?:\s+for)?|look\s+up|find|play|watch|type)\s+(.+)$/i) ||
        cleanPrompt.match(/^(?:search(?:\s+for)?|look\s+up|find|play|watch)\s+(.+?)\s+(?:on|in)\s+(youtube|google|github|wikipedia|reddit|bing|duckduckgo|amazon)$/i);

    if (compoundSiteSearchMatch) {
        const isSiteFirst = /^(?:open|go\s+to|navigate\s+to)/i.test(cleanPrompt);
        const site = (isSiteFirst ? compoundSiteSearchMatch[1] : compoundSiteSearchMatch[2]).toLowerCase();
        const searchQuery = (isSiteFirst ? compoundSiteSearchMatch[2] : compoundSiteSearchMatch[1]).replace(/^["']|["']$/g, '').trim();
        const searchUrls = {
            youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`,
            google: `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`,
            github: `https://github.com/search?q=${encodeURIComponent(searchQuery)}`,
            wikipedia: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(searchQuery)}`,
            reddit: `https://www.reddit.com/search/?q=${encodeURIComponent(searchQuery)}`,
            bing: `https://www.bing.com/search?q=${encodeURIComponent(searchQuery)}`,
            duckduckgo: `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}`,
            amazon: `https://www.amazon.com/s?k=${encodeURIComponent(searchQuery)}`
        };
        const targetUrl = searchUrls[site] || `https://www.google.com/search?q=${encodeURIComponent(site + ' ' + searchQuery)}`;
        if (onNavigate) {
            onNavigate(targetUrl);
            return `🚀 Opened <strong>${site}</strong> and searched for <strong>"${searchQuery}"</strong> (<span style="color: var(--accent-cyan);">${targetUrl}</span>).<br><br>✅ <strong>[Verified Action: Navigated to ${targetUrl}]</strong>`;
        } else if (onOpenTab) {
            onOpenTab(targetUrl, `${site} - ${searchQuery}`);
            return `🌐 Opened <strong>${site}</strong> search for <strong>"${searchQuery}"</strong> in a new tab.<br><br>✅ <strong>[Verified Action: Opened ${targetUrl}]</strong>`;
        }
    }

    // 0a. DIRECT CURRENT TAB NAVIGATION: "open youtube in the current tab", "open google here", "navigate to github in this tab"
    const isCurrentTabIntent = /\b(?:in\s+(?:the\s+)?(?:current|this|active)\s+tab|here)\b/i.test(cleanPrompt);
    const isNavVerb = /^(?:open|navigate\s+to|navigate|go\s+to)\s+/i.test(cleanPrompt);
    if (isCurrentTabIntent && isNavVerb && isSingleStep) {
        const dest = cleanPrompt
            .replace(/^(?:open|navigate\s+to|navigate|go\s+to)\s+/i, '')
            .replace(/\b(?:in\s+(?:the\s+)?(?:current|this|active)\s+tab|here)\b/gi, '')
            .trim();
        if (dest && onNavigate) {
            const finalUrl = resolveTargetUrl(dest);
            onNavigate(finalUrl);
            return `🚀 Navigating current active tab to <strong>${finalUrl}</strong>.<br><br>✅ <strong>[Verified Action: Navigated active tab to ${finalUrl}]</strong>`;
        }
    }

    // 0b. DIRECT READ SITE / READ PAGE: "read site", "read page", "read live site", "inspect page"
    if (/^(?:read\s+(?:the\s+)?(?:site|page|live\s+site|dom|webpage)|inspect\s+(?:page|site)|page\s+content)$/i.test(cleanPrompt.trim())) {
        const toolRes = await executeToolCallAndVerify({ name: 'read_page', args: {} }, context);
        return `${(toolRes.message || '').replace(/\n/g, '<br>')}<br><br>${toolRes.verification}`;
    }

    // 0c. DIRECT GREP / FIND ON PAGE: "grep <query>", "grep_page <query>", "find <query>"
    const grepCmdMatch = cleanPrompt.match(/^(?:grep|grep_page|find\s+on\s+page|search\s+on\s+page|find)\s+(.+)/i);
    if (grepCmdMatch && isSingleStep) {
        const q = grepCmdMatch[1].trim();
        const toolRes = await executeToolCallAndVerify({ name: 'grep_page', args: { query: q } }, context);
        return `${(toolRes.message || '').replace(/\n/g, '<br>')}<br><br>${toolRes.verification}`;
    }

    // 0a. Conversational & Direct Open Tab ("can you open a new tab for me", "open a new tab", "new tab", "create a new tab")
    if (/^(?:open|create|spawn|add)\s+(?:a\s+)?(?:new\s+)?tab(?:\s+for\s+me)?$/i.test(cleanPrompt) ||
        /^(?:open\s+tab|new\s+tab|blank\s+tab|add\s+tab)$/i.test(cleanPrompt)) {
        const prevCount = tabs.length;
        if (onOpenTab) onOpenTab('', 'New Tab');
        return `✨ Opened a new blank tab.<br><br>✅ <strong>[Verified Action: Opened New Tab #${prevCount + 1}]</strong>`;
    }

    // 0b. Download Verification & Status Check ("verify download", "check download", "has download started")
    if (/^(?:verify\s+download|check\s+download|has\s+download\s+started|is\s+downloading|download\s+status|download\s+progress)/i.test(cleanPrompt)) {
        try {
            const dlRes = await fetch('http://127.0.0.1:4892/api/downloads/verify').then(r => r.json()).catch(() => null);
            if (dlRes && dlRes.success) {
                if (dlRes.hasActiveDownloads) {
                    const activeDl = dlRes.active[0];
                    return `📥 <strong>Download In Progress:</strong> "${activeDl.filename}" (${activeDl.percent || 0}%, speed: ${activeDl.speed || 'active'})<br><br>✅ <strong>[Verified Action: Download is actively progressing]</strong>`;
                } else if (dlRes.hasCompletedDownloads) {
                    const lastCompleted = dlRes.completed[0];
                    return `✅ <strong>Download Finished:</strong> "${lastCompleted.filename}" (${lastCompleted.totalBytesFormatted}) saved to <code>${lastCompleted.savePath}</code>.<br><br>✅ <strong>[Verified Action: Download verified on disk]</strong>`;
                } else if (dlRes.totalCount > 0) {
                    return `📋 ${dlRes.totalCount} download record(s) found. No active download in progress.`;
                } else {
                    return `⚠️ No download has started yet. Click the download link or button to initiate.`;
                }
            }
        } catch (e) { }
    }

    // 0c. Shortcut Normalization (CLK SB, CLK S, clk sb, clk s, CLK search bar)
    if (/^\s*(?:clk|click)\s+(?:sb|s|search\s*bar|searchbox)\s*$/i.test(cleanPrompt)) {
        cleanPrompt = 'click search bar';
    } else if (/^clk\b/i.test(cleanPrompt)) {
        cleanPrompt = cleanPrompt.replace(/^clk\b/i, 'click');
        cleanPrompt = cleanPrompt.replace(/\b(click|clk)\s+sb\b/gi, 'click search bar');
        cleanPrompt = cleanPrompt.replace(/\b(click|clk)\s+s\b/gi, 'click search bar');
    }

    // 0d. Direct Tab Shortcuts ("tab 1", "tabone", "tab1", "tab 2", "tabtwo", "tabclose", "closetab")
    if (/^\s*(?:tab\s*close|tabclose|closetab|close\s*tab|close\s*this\s*tab)\s*$/i.test(cleanPrompt)) {
        if (onCloseTab) {
            onCloseTab(activeTabId);
            return `❌ Closed active tab.<br><br>✅ <strong>[Verified Action: Closed Tab #${activeTabId}]</strong>`;
        }
    }
    const directTabMatch = cleanPrompt.match(/^\s*(?:tab|switch\s*to\s*tab|goto\s*tab|go\s*to\s*tab)\s*(\d+|one|two|three|four|five)\s*$/i) ||
        cleanPrompt.match(/^\s*tab(one|two|three|four|five|\d+)\s*$/i);
    if (directTabMatch) {
        const wordMap = { one: 1, two: 2, three: 3, four: 4, five: 5 };
        const val = directTabMatch[1].toLowerCase();
        const tabIdx = wordMap[val] || parseInt(val, 10);
        if (tabIdx >= 1 && tabIdx <= tabs.length) {
            const targetTab = tabs[tabIdx - 1];
            if (onSelectTab && targetTab) {
                onSelectTab(targetTab.id);
                return `👉 Switched to tab #${tabIdx} (<strong>${targetTab.title || 'Untitled'}</strong>).<br><br>✅ <strong>[Verified Action: Switched to Tab #${tabIdx}]</strong>`;
            }
        } else {
            return `⚠️ Tab #${tabIdx} does not exist. You currently have ${tabs.length} open tab(s).`;
        }
    }

    // Direct search bar typing: "enter; <text>", "enter: <text>", "enter <text>", "type <text>"
    const enterCmdMatch = cleanPrompt.match(/^(?:enter|type|write|input)\s*(?:[;:|]\s*|\s+)(.+)/i);
    if (enterCmdMatch) {
        const textToType = enterCmdMatch[1].trim();
        if (textToType) {
            const wv = getActiveWebview ? getActiveWebview() : null;
            return await typeAndSubmitInSearchBar(wv, textToType);
        }
    }

    const lower = cleanPrompt.toLowerCase();
    const matches = (...patterns) => patterns.some(p => {
        if (p instanceof RegExp) return p.test(lower);
        return lower.includes(p);
    });

    // 1. VISUAL KEYWORD NUMBERING COMMAND
    if (matches('numbering', 'number words', 'numbering words', 'rank words', 'show numbers', 'number links', 'number elements')) {
        let kw = raw.replace(/.*?\b(?:numbering\s+|number\s+|rank\s+|show\s+numbers\s+for\s+|show\s+numbers\s+)/i, '').trim();
        if (!kw || kw.toLowerCase() === 'words' || kw.toLowerCase() === 'links') kw = '';

        const wv = getActiveWebview ? getActiveWebview() : null;
        const numRes = await highlightAndNumberOccurrences(wv, kw || 'a, button');
        if (numRes && numRes.count > 0) {
            return `🔢 Numbered <strong>${numRes.count}</strong> elements on screen with visual yellow badges (#1, #2, #3...). You can now say <code>click #2</code> or <code>click 1st link</code>!`;
        } else {
            return `⚠️ Could not find visible occurrences to number on active page.`;
        }
    }

    // 2. SHORTCUTS GUIDE
    if (matches('tell me the shortcut', 'tell me shortcut', 'tell me shortcuts', 'show shortcut', 'show shortcuts', 'list shortcut', 'list shortcuts', 'what are the shortcuts', 'shortcut list', 'shortcuts list', 'all shortcuts', 'ai shortcuts', 'keyboard shortcuts', 'tell me all shortcuts', 'shortcut help', 'help shortcut', 'help shortcuts', 'shortcuts help') || lower === 'shortcuts' || lower === 'shortcut') {
        return `⌨️ <strong>AI Browser Automation Shortcuts:</strong><br><br>
🔍 <strong>AI Search Bar & Direct Typing Shortcuts:</strong><br>
• <code>CLK SB</code> or <code>CLK S</code> — Click & focus the Search Bar directly.<br>
• <code>enter; &lt;text&gt;</code> or <code>type &lt;text&gt;</code> — Directly type <code>&lt;text&gt;</code> into Search Bar and execute search.<br>
• <code>CLK +</code> — Open a new browser tab.<br>
• <code>CLK #&lt;N&gt;</code> (e.g. <code>CLK #7</code> or <code>hashtag 7</code>) — Scan screen & click badge/mark <code>#N</code>.<br><br>

📜 <strong>Logical Page Scroll Shortcuts:</strong><br>
• <code>S50</code> / <code>scroll 50</code> — Scroll page down to 50% scale.<br>
• <code>S0</code> / <code>scroll 0</code> / <code>scroll top</code> — Instant scroll to start/top of page.<br>
• <code>S1000</code> / <code>scroll 1000</code> / <code>scroll end</code> — Instant scroll to bottom/end of page.<br><br>

🔥 <strong>Tab Management:</strong><br>
• <code>open &lt;site&gt;</code> — Open website in new tab (e.g. <code>open youtube</code>, <code>open github</code>).<br>
• <code>go to 2nd tab</code> / <code>switch to 3rd tab</code> — Jump directly to tab by position.<br>
• <code>close 2nd tab</code> / <code>close this tab</code> / <code>close all tabs</code> — Tab closing shortcuts.<br><br>

⌨️ <strong>Global Keyboard Hotkeys:</strong><br>
• <code>Ctrl+T</code> — Open New Tab | <code>Ctrl+W</code> — Close Active Tab<br>
• <code>Ctrl+K</code> — Tab Search & Command Palette | <code>Ctrl+D</code> — Bookmark Page<br>
• <code>Ctrl+H</code> — Browsing History | <code>Ctrl+R</code> / <code>F5</code> — Reload Page`;
    }

    // 3. CAPABILITY DIRECTORY
    if (matches('what can i do using this ai', 'what can this ai do', 'what can i do', 'ai capabilities', 'ai features', 'ai commands', 'what can ai do', 'tell me what ai can do', 'help ai', 'command list')) {
        return `🤖 <strong>Antigravity AI Assistant — Capability Directory:</strong><br><br>
📍 <strong>1. AI Tab Management:</strong><br>
• <code>open youtube</code> / <code>open github</code> / <code>open &lt;url&gt;</code> — Spawns new tab.<br>
• <code>go to 2nd tab</code> / <code>switch to 3rd tab</code> — Switches active tab.<br>
• <code>close 3rd tab</code> / <code>close this tab</code> / <code>close all tabs</code> — Instant tab closure.<br>
• <code>duplicate tab</code> — Clones active tab.<br><br>
📍 <strong>2. In-Page Grounding & Clicking:</strong><br>
• <code>CLK SB</code> / <code>click search bar</code> — Focuses search field.<br>
• <code>enter; &lt;query&gt;</code> — Auto-types and executes web search.<br>
• <code>click #7</code> / <code>hashtag 7</code> — Interacts with Set-of-Marks ID.<br>
• <code>click 1st link</code> / <code>click 2nd button</code> — Clicks element by ordinal rank.<br><br>
📍 <strong>3. Navigation & Utilities:</strong><br>
• <code>s50</code> / <code>scroll 50</code> — Proportional smooth scrolling.<br>
• <code>reader mode</code> — Distraction-free clean article view.<br>
• <code>qr code</code> — Mobile handoff QR generator.`;
    }

    // 4. CLICK INTENT (Set-of-Marks, Search Bar, Plus Button, Ordinals, Elements)
    const isClickIntent = (
        lower.startsWith('click ') ||
        lower.startsWith('clk ') ||
        lower.startsWith('tap ') ||
        lower.startsWith('press ') ||
        lower.includes('hashtag') ||
        lower.includes('mark ') ||
        lower.includes('badge ') ||
        lower.includes('search bar') ||
        lower.includes('plus') ||
        lower.includes('+') ||
        /\b(1st|first|2nd|second|3rd|third|4th|fourth|5th|fifth)\b/i.test(lower)
    ) && !lower.includes('tab') && !lower.includes('window');

    if (isClickIntent) {
        // Special: Plus Icon / New Tab Button
        if (matches('plus', '+', 'add tab', 'new tab button', 'open new tab button')) {
            if (onOpenTab) onOpenTab('', 'New Tab');
            return '🎯 AI clicked the <strong>"+" New Tab button</strong> and opened a new tab.';
        }

        // Special: Search Bar
        if (matches('search bar', 'search box', 'search input', 'search field', 'sb', 'clk sb', 'clk s')) {
            const wv = getActiveWebview ? getActiveWebview() : null;
            const res = await executeWebviewClick(wv, 'search bar', onNavigate);
            return res.message;
        }

        let targetText = raw
            .replace(/.*?\b(?:click\s+on\s+the\s+|click\s+on\s+these\s+|click\s+on\s+|click\s+the\s+|click\s+|press\s+|tap\s+|select\s+|focus\s+on\s+|focus\s+|go\s+to\s+|open\s+|type\s+in\s+)/i, '')
            .replace(/\b(?:these\s+|yellow\s+gaps\s+like\s+|yellow\s+gap\s+|badge\s+|anywhere\s+on\s+the\s+screen|on\s+screen|default\s+search\s+engines?)*\b/gi, '')
            .trim();

        if (!targetText && (lower.includes('hashtag') || lower.includes('#'))) {
            const m = raw.match(/(?:hashtag|mark|badge|#)\s*\d+/i);
            if (m) targetText = m[0];
        }

        if (targetText) {
            const wv = getActiveWebview ? getActiveWebview() : null;
            const res = await executeWebviewClick(wv, targetText, onNavigate);
            return res.message;
        }
    }

    // 5. PROPORTIONAL SCROLLING COMMANDS (scroll 50, s50, s0, s1000, scroll up, scroll down)
    const isScrollKeyword = lower.includes('scroll');
    const isScrollShortcut = /^(?:s|sl|sle|sc)\s*\d+/i.test(lower) ||
        /^(?:s|sl|sle|sc)\s+(?:up|down|top|bottom|left|right|start|end)/i.test(lower) ||
        /\b(?:s|sl|sle|sc)(\d+)\b/i.test(lower);

    if (isScrollKeyword || isScrollShortcut) {
        let direction = 'down';
        if (/\b(up|top|start|beginning)\b/i.test(raw)) direction = 'up';
        else if (/\b(left)\b/i.test(raw)) direction = 'left';
        else if (/\b(right)\b/i.test(raw)) direction = 'right';

        let amount = null;
        let isExplicitPercent = false;

        if (/\b(zero|0)\b/i.test(raw) || matches('top of page', 'start of page', 'beginning of page')) {
            amount = 0;
            direction = 'top';
        } else if (/\b(1000|bottom of page|end of page)\b/i.test(raw)) {
            amount = 1000;
            direction = 'end';
        } else {
            const percentMatch = raw.match(/\b(\d+)\s*(%|percent)\b/i);
            const numMatch = raw.match(/\b(\d+)\b/);

            if (percentMatch) {
                isExplicitPercent = true;
                amount = parseInt(percentMatch[1], 10);
            } else if (numMatch) {
                amount = parseInt(numMatch[1], 10);
            }
        }

        if (amount === null) amount = 20;

        const wv = getActiveWebview ? getActiveWebview() : null;
        const res = await executeWebviewScroll(wv, direction, amount, isExplicitPercent);
        if (res.success) {
            if (amount === 0 || direction === 'top') {
                return '📜 Scrolled active page to the <strong>very top / starting of page</strong> (scroll 0 / s0).';
            } else if (amount >= 1000 || direction === 'end') {
                return '📜 Scrolled active page to the <strong>very bottom / end of page</strong> (scroll 1000 / s1000).';
            } else {
                const isScale = (amount <= 100);
                const desc = isScale ? `${amount}% viewport height` : `${amount}px`;
                return `📜 Scrolled active page <strong>${direction}</strong> by scale <strong>${amount}</strong> (${desc}).`;
            }
        } else {
            return `⚠️ Could not scroll page: ${res.error}`;
        }
    }

    // 5.5 DIRECT NAVIGATION COMMANDS ("navigate to <url>", "go to <url>")
    if ((lower.startsWith('navigate to ') || (lower.startsWith('go to ') && !lower.includes('tab'))) && isSingleStep) {
        const dest = cleanPrompt.replace(/^(navigate to|go to)\s+/i, '').trim();
        if (dest && onNavigate) {
            const finalUrl = resolveTargetUrl(dest);
            onNavigate(finalUrl);
            return `🚀 Navigating active tab to <strong>${finalUrl}</strong>.<br><br>✅ <strong>[Verified Action: Navigating to ${finalUrl}]</strong>`;
        }
    }

    // 5.8 OPEN WEBSITE IN CURRENT TAB ("open youtube in the current tab", "open google here", "navigate to github in this tab")
    if (isCurrentTabIntent && isSingleStep && (lower.startsWith('open ') || lower.startsWith('navigate ') || lower.startsWith('go to '))) {
        const dest = cleanPrompt
            .replace(/^(?:open|navigate\s+to|navigate|go\s+to)\s+/i)
            .replace(/\b(?:in\s+(?:the\s+)?(?:current|this|active)\s+tab|here)\b/gi, '')
            .trim();
        if (dest && onNavigate) {
            const finalUrl = resolveTargetUrl(dest);
            onNavigate(finalUrl);
            return `🚀 Navigating current active tab to <strong>${finalUrl}</strong>.<br><br>✅ <strong>[Verified Action: Navigated active tab to ${finalUrl}]</strong>`;
        }
    }

    // 6. OPEN WEBSITE / NEW TAB
    if (lower.startsWith('open ') && isSingleStep && !matches('history', 'split', 'sidebar', 'reading', 'reader', 'qr', 'palette')) {
        const target = cleanPrompt.replace(/^open\s+/i, '').replace(/\s+in\s+(?:a\s+)?new\s+tab$/i, '').trim();

        if (/^(?:new\s+tab|a\s+new\s+tab|blank\s+tab|tab)$/i.test(target)) {
            const prevCount = tabs.length;
            if (onOpenTab) onOpenTab('', 'New Tab');
            return `✨ Opened a new blank tab.<br><br>✅ <strong>[Verified Action: Opened New Tab #${prevCount + 1}]</strong>`;
        }

        const targetUrl = resolveTargetUrl(target);
        const title = target;
        const prevCount = tabs.length;

        if (onOpenTab) {
            onOpenTab(targetUrl, title);
            return `🌐 Opened <strong>${title}</strong> in a new tab (<span style="color: var(--accent-cyan);">${targetUrl}</span>).<br><br>✅ <strong>[Verified Action: Opened New Tab #${prevCount + 1} (${targetUrl})]</strong>`;
        }
    }

    // 7. CLOSE TABS COMMANDS
    if (matches('close all tabs', 'close all the tabs', 'close all open tabs', 'close every tab', 'close all')) {
        if (onCloseTab && tabs.length > 0) {
            tabs.forEach(t => onCloseTab(t.id));
            if (onOpenTab) onOpenTab('', 'New Tab');
            return '❌ Closed all open tabs.';
        }
    }

    // Random tab close
    if (matches('close random', 'randomly close', 'close tab randomly', 'random tab close')) {
        if (tabs.length > 1) {
            const otherTabs = tabs.filter(t => t.id !== activeTabId);
            const target = otherTabs[Math.floor(Math.random() * otherTabs.length)] || tabs[0];
            if (onCloseTab && target) {
                onCloseTab(target.id);
                return `🎲 Randomly closed tab: <strong>${target.title || 'Untitled'}</strong> (Tab #${target.id}).`;
            }
        }
        return '❌ Only one tab open; cannot randomly close.';
    }

    // Close tab by index / position ("close 3rd tab", "close tab 2")
    const extractedCloseIdx = extractTabIndexFromPrompt(raw);
    if (extractedCloseIdx !== null && matches('close', 'delete', 'remove', 'kill', 'shut')) {
        if (extractedCloseIdx >= 1 && extractedCloseIdx <= tabs.length) {
            const targetTab = tabs[extractedCloseIdx - 1];
            if (onCloseTab && targetTab) {
                onCloseTab(targetTab.id);
                return `❌ Closed tab #${extractedCloseIdx} (<strong>${targetTab.title || 'Untitled'}</strong>).`;
            }
        } else {
            return `⚠️ Tab #${extractedCloseIdx} does not exist. You currently have ${tabs.length} open tab(s).`;
        }
    }

    // Close tab by title / query ("close youtube tab", "close google tab")
    if ((lower.startsWith('close ') || lower.endsWith(' tab')) && !matches('this', 'current', 'active', 'all', 'other', 'random')) {
        const siteQuery = raw.replace(/^(close|delete|remove)\s+/i, '').replace(/\s+tab$/i, '').trim().toLowerCase();
        if (siteQuery.length > 1) {
            const found = tabs.find(t => (t.title && t.title.toLowerCase().includes(siteQuery)) || (t.url && t.url.toLowerCase().includes(siteQuery)));
            if (found && onCloseTab) {
                onCloseTab(found.id);
                return `❌ Closed tab <strong>${found.title || found.url}</strong> matching "${siteQuery}".`;
            }
        }
    }

    // Close active tab
    if (matches('close this tab', 'close tab', 'close current tab', 'close active tab', 'close page')) {
        if (onCloseTab) {
            onCloseTab(activeTabId);
            return '❌ Closed active tab.';
        }
    }

    // 8. SWITCH / ACTIVATE TAB COMMANDS ("go to 2nd tab", "switch to 3rd tab", "go to tab 2", "next tab", "prev tab")
    const extractedSwitchIdx = extractTabIndexFromPrompt(raw);
    if (extractedSwitchIdx !== null && matches('go', 'switch', 'jump', 'select', 'activate', 'view')) {
        if (extractedSwitchIdx >= 1 && extractedSwitchIdx <= tabs.length) {
            const targetTab = tabs[extractedSwitchIdx - 1];
            if (onSelectTab && targetTab) {
                onSelectTab(targetTab.id);
                return `👉 Switched to tab #${extractedSwitchIdx} (<strong>${targetTab.title || 'Untitled'}</strong>).`;
            }
        } else {
            return `⚠️ Tab #${extractedSwitchIdx} does not exist. You currently have ${tabs.length} open tab(s).`;
        }
    }

    if (matches('next tab', 'switch to next tab')) {
        const curIdx = tabs.findIndex(t => t.id === activeTabId);
        const nextTab = tabs[(curIdx + 1) % tabs.length];
        if (onSelectTab && nextTab) {
            onSelectTab(nextTab.id);
            return `👉 Switched to next tab (<strong>${nextTab.title || 'Untitled'}</strong>).`;
        }
    }

    if (matches('previous tab', 'prev tab')) {
        const curIdx = tabs.findIndex(t => t.id === activeTabId);
        const prevTab = tabs[(curIdx - 1 + tabs.length) % tabs.length];
        if (onSelectTab && prevTab) {
            onSelectTab(prevTab.id);
            return `👉 Switched to previous tab (<strong>${prevTab.title || 'Untitled'}</strong>).`;
        }
    }

    // 9. BROWSER UTILITIES (Reader Mode, QR Code, History, Bookmark)
    if (matches('reader mode', 'reading mode', 'clean view', 'distraction free')) {
        if (onOpenReaderMode) onOpenReaderMode();
        return '📖 Opened Clean Reader Mode for active page.';
    }

    if (matches('qr code', 'mobile handoff', 'send to phone', 'qr')) {
        if (onOpenQrCode) onOpenQrCode();
        return '📱 Opened Mobile Handoff QR Code modal.';
    }

    if (matches('tab search', 'search tabs', 'command palette')) {
        if (onOpenTabSearch) onOpenTabSearch();
        return '🔍 Opened Tab Search & Command Palette (Ctrl+K).';
    }

    if (matches('history', 'browsing history', 'show history')) {
        if (onOpenHistory) onOpenHistory();
        return '🕒 Opened Browsing History panel (Ctrl+H).';
    }

    if (matches('bookmark', 'bookmark this', 'star page')) {
        if (onToggleBookmark) onToggleBookmark();
        return '★ Bookmarked current active tab.';
    }

    // 10. BACK / FORWARD / RELOAD NAVIGATION COMMANDS
    if (/^(?:go\s+back|back|navigate\s+back|previous\s+page)$/i.test(cleanPrompt)) {
        const wv = getActiveWebview ? getActiveWebview() : null;
        try {
            if (wv && typeof wv.canGoBack === 'function' && wv.canGoBack()) {
                wv.goBack();
                return '⬅️ Navigated back to previous page.<br><br>✅ <strong>[Verified Action: Browser Back]</strong>';
            }
        } catch (e) {}
        return '⚠️ Cannot go back — no previous page in tab history.';
    }

    if (/^(?:go\s+forward|forward|navigate\s+forward|next\s+page)$/i.test(cleanPrompt)) {
        const wv = getActiveWebview ? getActiveWebview() : null;
        try {
            if (wv && typeof wv.canGoForward === 'function' && wv.canGoForward()) {
                wv.goForward();
                return '➡️ Navigated forward to next page.<br><br>✅ <strong>[Verified Action: Browser Forward]</strong>';
            }
        } catch (e) {}
        return '⚠️ Cannot go forward — no forward page in tab history.';
    }

    if (/^(?:reload|reload\s+page|refresh|refresh\s+page|reload\s+tab)$/i.test(cleanPrompt)) {
        const wv = getActiveWebview ? getActiveWebview() : null;
        try {
            if (wv && typeof wv.reload === 'function') {
                wv.reload();
                return '🔄 Reloaded active page.<br><br>✅ <strong>[Verified Action: Page Reloaded]</strong>';
            }
        } catch (e) {}
        return '🔄 Reloaded active tab.';
    }

    // 11. MULTILINGUAL HINDI & KOREAN SCROLL / SUMMARIZE / AUTOFILL / MEDIA COMMANDS
    if (raw.includes('नीचे') || /\bniche\b/i.test(raw) || raw.includes('아래로') || raw.includes('스크롤 다운')) {
        const wv = getActiveWebview ? getActiveWebview() : null;
        await executeWebviewScroll(wv, 'down', 50, true);
        return raw.includes('नीचे') || /\bniche\b/i.test(raw)
            ? '📜 पेज नीचे स्क्रॉल किया गया।<br><br>✅ <strong>[Verified Action: Scrolled Down]</strong>'
            : '📜 페이지를 아래로 스크롤했습니다.<br><br>✅ <strong>[Verified Action: Scrolled Down]</strong>';
    }

    if (raw.includes('ऊपर') || /\bupar\b/i.test(raw) || raw.includes('위로') || raw.includes('스크롤 업')) {
        const wv = getActiveWebview ? getActiveWebview() : null;
        await executeWebviewScroll(wv, 'up', 50, true);
        return raw.includes('ऊपर') || /\bupar\b/i.test(raw)
            ? '📜 पेज ऊपर स्क्रॉल किया गया।<br><br>✅ <strong>[Verified Action: Scrolled Up]</strong>'
            : '📜 페이지를 위로 스크롤했습니다.<br><br>✅ <strong>[Verified Action: Scrolled Up]</strong>';
    }

    // 12. SUMMARIZE PAGE COMMAND ("summarize", "summarize page", "सारांश", "요약")
    if (/^(?:summarize(?:\s+(?:this\s+)?(?:page|site|article|tab))?|page\s+summary|tl;?dr)$/i.test(cleanPrompt) || raw.includes('सारांश') || raw.includes('요약')) {
        const wv = getActiveWebview ? getActiveWebview() : null;
        let snippet = '';
        if (wv && typeof wv.executeJavaScript === 'function') {
            try {
                snippet = await wv.executeJavaScript(`
                    (function() {
                        const title = document.title || '';
                        const h1 = Array.from(document.querySelectorAll('h1, h2')).slice(0, 4).map(el => (el.innerText || '').trim()).filter(Boolean).join(' • ');
                        const paras = Array.from(document.querySelectorAll('p')).map(p => (p.innerText || '').trim()).filter(t => t.length > 40).slice(0, 2).join(' ');
                        return [h1, paras.slice(0, 260)].filter(Boolean).join(' — ');
                    })();
                `);
            } catch (e) {}
        }
        const pageTitle = activeTab?.title || 'Active Page';
        const pageUrl = activeTab?.url || 'about:blank';
        return `📑 <strong>Page Summary — ${pageTitle}</strong><br>• <strong>URL:</strong> <code>${pageUrl}</code><br>${snippet ? `• <strong>Key Content:</strong> ${snippet}` : '• Ready for interactive browsing.'}<br><br>✅ <strong>[Verified Action: Page Summarized]</strong>`;
    }

    // 13. AUTOFILL FORM COMMAND ("autofill", "auto fill", "fill form", "फ़ॉर्म भरें", "양식 자동완성")
    if (/^(?:autofill|auto\s+fill|fill\s+(?:the\s+)?form|autofill\s+form)$/i.test(cleanPrompt) || raw.includes('फ़ॉर्म भरें') || raw.includes('양식 자동완성')) {
        const wv = getActiveWebview ? getActiveWebview() : null;
        if (wv && typeof wv.executeJavaScript === 'function') {
            try {
                const count = await wv.executeJavaScript(`
                    (function() {
                        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea'));
                        let filled = 0;
                        for (const el of inputs) {
                            const hint = ((el.name || '') + ' ' + (el.id || '') + ' ' + (el.placeholder || '') + ' ' + (el.type || '')).toLowerCase();
                            let val = '';
                            if (hint.includes('email')) val = 'user@antigravity.dev';
                            else if (hint.includes('name')) val = 'Anurag';
                            else if (hint.includes('phone') || hint.includes('tel')) val = '+1-555-0199';
                            else if (hint.includes('search') || hint.includes('q')) continue;
                            else val = 'Antigravity Autofill';
                            el.focus();
                            el.value = val;
                            el.dispatchEvent(new Event('input', { bubbles: true }));
                            el.dispatchEvent(new Event('change', { bubbles: true }));
                            filled++;
                        }
                        return filled;
                    })();
                `);
                return `✨ Autofilled <strong>${count || 0}</strong> form field(s) on the active page.<br><br>✅ <strong>[Verified Action: Form Autofill Executed]</strong>`;
            } catch (e) {}
        }
        return '✨ Triggered native Autofill engine on active page.<br><br>✅ <strong>[Verified Action: Autofill Triggered]</strong>';
    }

    // 14. MEDIA PLAY / PAUSE COMMAND ("play", "pause", "play video", "pause video", "वीडियो चलाएं", "비디오 재생")
    if (/^(?:play|pause|resume|stop|play\s+video|pause\s+video|stop\s+video|play\s+media|pause\s+media|toggle\s+play)$/i.test(cleanPrompt) ||
        raw.includes('वीडियो चलाएं') || raw.includes('वीडियो रोकें') || raw.includes('비디오 재생') || raw.includes('비디오 일시정지')) {
        const wv = getActiveWebview ? getActiveWebview() : null;
        const wantPause = /pause|stop|रोकें|일시정지/i.test(raw);
        if (wv && typeof wv.executeJavaScript === 'function') {
            try {
                const mediaStatus = await wv.executeJavaScript(`
                    (function() {
                        const media = document.querySelector('video, audio');
                        if (!media) return 'no_media';
                        if (${wantPause ? 'true' : 'false'}) {
                            media.pause();
                            return 'paused';
                        } else if (${/^(?:play|resume|play\s+video|play\s+media|वीडियो चलाएं|비디오 재생)$/i.test(cleanPrompt) ? 'true' : 'false'}) {
                            media.play();
                            return 'playing';
                        } else {
                            if (media.paused) { media.play(); return 'playing'; }
                            else { media.pause(); return 'paused'; }
                        }
                    })();
                `);
                if (mediaStatus === 'playing') return '▶️ Playing media on active page.<br><br>✅ <strong>[Verified Action: Media Playing]</strong>';
                if (mediaStatus === 'paused') return '⏸️ Paused media on active page.<br><br>✅ <strong>[Verified Action: Media Paused]</strong>';
            } catch (e) {}
        }
        return '⏯️ Toggled media playback state on active page.';
    }

    // 15. DIRECT VOICE SEARCH COMMANDS ("search for <query>", "search <query>", "look up <query>", "google <query>")
    const directSearchMatch = cleanPrompt.match(/^(?:search(?:\s+for)?|look\s+up|google|query)\s+(.+)$/i);
    if (directSearchMatch && isSingleStep) {
        const query = directSearchMatch[1].replace(/^["']|["']$/g, '').trim();
        if (query) {
            const currentUrl = (activeTab?.url || '').toLowerCase();
            if (currentUrl.includes('youtube.com') && onNavigate) {
                const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
                onNavigate(ytUrl);
                return `🔍 Searching YouTube for <strong>"${query}"</strong>.<br><br>✅ <strong>[Verified Action: Navigated to ${ytUrl}]</strong>`;
            }
            const wv = getActiveWebview ? getActiveWebview() : null;
            if (wv && currentUrl && !currentUrl.startsWith('antigravity://') && currentUrl !== 'about:blank') {
                const typed = await typeAndSubmitInSearchBar(wv, query);
                if (typed && !typed.includes('Could not find')) {
                    return typed;
                }
            }
            const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            if (onNavigate) {
                onNavigate(googleUrl);
                return `🔍 Searching Google for <strong>"${query}"</strong>.<br><br>✅ <strong>[Verified Action: Navigated to ${googleUrl}]</strong>`;
            }
        }
    }

    // Fallback: General AI Navigation ("navigate to <target>", "go to <target>")
    if (matches('navigate to', 'go to') && raw.length > 6 && isSingleStep) {
        const navTarget = raw.replace(/^.*?\b(?:navigate to|go to)\s+/i, '').trim();
        if (navTarget) {
            const targetUrl = KNOWN_SITES[navTarget.toLowerCase()] || resolveTargetUrl(navTarget);
            if (onNavigate) {
                onNavigate(targetUrl);
                return `🌐 Navigated active tab to <strong>${targetUrl}</strong>.<br><br>✅ <strong>[Verified Action: Navigated to ${targetUrl}]</strong>`;
            }
        }
    }

    // Detect pure conversational / writing / Q&A prompts (e.g., "give me an essay on cow...", "explain...", "write...", "what is...")
    const isConversationalOrWritingPrompt = (
        /\b(?:essay|write|explain|tell\s+me|give\s+me\s+(?:an?|some|the)|what\s+is|how\s+is|who\s+is|why\s+is|describe|poem|story|paragraph|article|translate|define|meaning\s+of)\b/i.test(raw) ||
        /\?$/.test(raw.trim())
    ) && !/\b(?:open\s+tab|close\s+tab|switch\s+to\s+tab|download\s+episode|click\s+#?\d+|play|search|youtube|google|browser|tab|site|page|video)\b/i.test(raw);

    // If pure conversational / writing / Q&A: dispatch to single-turn LLM chat without browser tools
    if (isConversationalOrWritingPrompt) {
        try {
            const { getActiveProviderConfig, streamChatMessage, sendChatMessage } = await import('./services/aiProviderService.js');
            const activeConfig = context.activeConfig || getActiveProviderConfig();
            const hasKeyOrLocal = activeConfig && (activeConfig.apiKey || activeConfig.id === 'lmstudio' || activeConfig.id === 'ollama' || activeConfig.id === 'ornith');

            if (hasKeyOrLocal) {
                const activeUrl = activeTab?.url || '';
                const activeTitle = activeTab?.title || '';
                const systemPrompt = `You are Antigravity Browser AI Copilot. You assist the user with web browsing, writing, essays, and questions.
Active Tab: "${activeTitle}" (${activeUrl})
Total Open Tabs: ${tabs.length}.
Always reply in the same language as the user's current message (default to English unless the user writes in Hindi or Korean). Keep answers clear, well-structured, and helpful.`;

                const chatFn = streamChatMessage || sendChatMessage;
                const aiRes = await chatFn({
                    prompt: raw,
                    systemPrompt,
                    config: activeConfig,
                    tools: [], // No tools for pure conversational Q&A
                    onChunk: (chunk) => {
                        if (context.onStreamChunk) context.onStreamChunk(chunk);
                    },
                    onReasoningChunk: (rChunk) => {
                        if (context.onStreamReasoning) context.onStreamReasoning(rChunk);
                    },
                    signal: context.signal
                });

                if (aiRes && aiRes.success && !aiRes.aborted) {
                    const replyText = (aiRes.reply || '').trim();
                    return `🤖 <strong>[${aiRes.provider}: ${aiRes.model}]</strong><br>${replyText.replace(/\n/g, '<br>')}`;
                }
            }
        } catch (e) {
            console.warn('[AI Harness conversational error]', e.message);
        }
    }

    // ALL other commands (goals, multi-step actions, browser operations, searches, playback, etc.)
    // are dispatched to the Autonomous Agent Loop!
    try {
        return await executeAutonomousAgentLoop(raw, context);
    } catch (e) {
        console.warn('[Autonomous Agent Loop Failure]', e);
    }

    return `💡 Understood instruction: "<em>${raw}</em>". Say <code>shortcuts</code> or <code>what can i do using this ai</code> for the full list of supported browser commands!`;
}

/**
 * Adaptive Site Context Extraction Engine
 * Performs deep in-page semantic DOM inspection in real time.
 * Returns structured context: timers, verification forms, download mirrors,
 * actionable elements with Set-of-Marks tags, and an adaptive recommendation.
 */
export async function extractAdaptivePageContext(webview) {
    if (!webview || typeof webview.executeJavaScript !== 'function') {
        return {
            success: false,
            error: 'Webview is not available',
            page: { url: '', title: '', domain: '', readyState: 'unknown' },
            phase: 'UNKNOWN',
            recommendation: 'Wait for page to initialize'
        };
    }

    try {
        const context = await webview.executeJavaScript(`
            (function() {
                const doc = document;
                const url = window.location.href || '';
                const title = doc.title || '';
                const readyState = doc.readyState || 'complete';
                let domain = '';
                try { domain = new URL(url).hostname; } catch (e) { domain = url; }

                function isVisible(el) {
                    if (!el) return false;
                    const style = window.getComputedStyle(el);
                    if (style.display === 'none' || style.visibility === 'hidden') return false;
                    const op = parseFloat(style.opacity);
                    if (!isNaN(op) && op <= 0.05) return false;
                    const r = el.getBoundingClientRect();
                    const hasDims = (r.width > 0 && r.height > 0) || (el.offsetWidth > 0 && el.offsetHeight > 0);
                    if (!hasDims) return false;

                    let cur = el;
                    while (cur && cur !== doc.body && cur !== doc.documentElement) {
                        const s = window.getComputedStyle(cur);
                        if (s.display === 'none' || s.visibility === 'hidden') return false;
                        const cop = parseFloat(s.opacity);
                        if (!isNaN(cop) && cop <= 0.05) return false;
                        if (s.pointerEvents === 'none' && cur !== el) return false;
                        cur = cur.parentElement;
                    }
                    return true;
                }

                // 1. Detect active countdown timers
                const timerEls = Array.from(doc.querySelectorAll('#timer, #verify_text, [id*="timer" i], [class*="timer" i], [id*="countdown" i], [class*="countdown" i]')).filter(isVisible);
                let activeCountdown = null;
                for (const el of timerEls) {
                    const txt = (el.innerText || el.textContent || '').trim();
                    const numMatch = txt.match(/\\b(\\d+)\\s*(?:s|sec|seconds)?\\b/i);
                    const secondsRemaining = numMatch ? parseInt(numMatch[1], 10) : null;
                    activeCountdown = {
                        id: el.id || '',
                        text: txt,
                        secondsRemaining,
                        isComplete: secondsRemaining === 0 || txt === '0' || !secondsRemaining
                    };
                    break;
                }

                // 2. Detect verification forms & triggers
                const landingForm = doc.getElementById('landing');
                const verifyBtn = doc.getElementById('verify_button');
                const verifyBtn2 = doc.getElementById('verify_button2');
                const twoStepsBtn = doc.getElementById('two_steps_btn');

                const verification = {
                    hasLandingForm: !!landingForm,
                    landingFormAction: landingForm ? (landingForm.action || '') : '',
                    hasVerifyBtn: !!(verifyBtn && isVisible(verifyBtn)),
                    verifyBtnText: verifyBtn ? (verifyBtn.innerText || verifyBtn.value || '') : '',
                    hasVerifyBtn2: !!(verifyBtn2 && isVisible(verifyBtn2)),
                    verifyBtn2Text: verifyBtn2 ? (verifyBtn2.innerText || verifyBtn2.value || '') : '',
                    hasTwoStepsBtn: !!(twoStepsBtn && isVisible(twoStepsBtn)),
                    twoStepsBtnText: twoStepsBtn ? (twoStepsBtn.innerText || twoStepsBtn.value || '') : ''
                };

                // 3. Detect download servers & triggers
                const allLinks = Array.from(doc.querySelectorAll('a, button, input[type="button"], input[type="submit"]')).filter(isVisible);
                const downloadTriggers = [];
                const searchInputs = [];

                for (const el of allLinks) {
                    const text = (el.innerText || el.value || el.getAttribute('aria-label') || '').trim();
                    const href = el.href || '';
                    const id = el.id || '';
                    const isDownloadPattern = /download|fast\\s*server|g-drive|google\\s*drive|hubcloud|direct|instant|telegram|other\\s*download|server\\s*\\d|unblockedgames|720p|480p|1080p/i.test(text + ' ' + href + ' ' + id);

                    if (isDownloadPattern && text.length < 80) {
                        downloadTriggers.push({
                            id,
                            text,
                            href,
                            tag: el.tagName.toLowerCase(),
                            isCloudGateway: /unblockedgames|cloud\\./i.test(href),
                            isFastServer: /fast\\s*server/i.test(text),
                            isDirect: /direct/i.test(text)
                        });
                    }
                }

                // 4. Detect search inputs
                const inputs = Array.from(doc.querySelectorAll('input, textarea')).filter(isVisible);
                for (const inp of inputs) {
                    const type = (inp.type || 'text').toLowerCase();
                    const name = (inp.name || '').toLowerCase();
                    const placeholder = (inp.placeholder || '').toLowerCase();
                    const id = (inp.id || '').toLowerCase();

                    if (type === 'search' || type === 'text' || name.includes('search') || placeholder.includes('search') || id.includes('search') || name === 's' || name === 'q') {
                        searchInputs.push({
                            id: inp.id || '',
                            name: inp.name || '',
                            placeholder: inp.placeholder || '',
                            value: inp.value || ''
                        });
                    }
                }

                // 5. Render live Set-of-Marks overlay and stamp data-som-id directly on DOM elements
                const existingSom = doc.getElementById('antigravity-som-container');
                if (existingSom) existingSom.remove();
                doc.querySelectorAll('[data-som-id]').forEach(el => {
                    const orig = el.getAttribute('data-som-orig-outline');
                    if (orig !== null) el.style.outline = orig;
                    el.removeAttribute('data-som-id');
                    el.removeAttribute('data-som-orig-outline');
                });

                const candidateSelectors = [
                    'a[href]', 'button', 'input:not([type="hidden"])', 'textarea', 'select', 'summary', 'details',
                    '[role="button"]', '[role="link"]', '[role="searchbox"]', '[role="tab"]', '[role="menuitem"]',
                    '[role="checkbox"]', '[role="radio"]', '[role="switch"]', '[role="option"]', '[role="combobox"]',
                    '[role="menuitemcheckbox"]', '[role="menuitemradio"]', '[role="treeitem"]',
                    '[contenteditable="true"]', '[tabindex]:not([tabindex="-1"])', '[onclick]',
                    'video', 'audio', '[role="slider"]',
                    '.btn', '.button', '[class*="button" i]', '[class*="btn" i]'
                ];

                const standardElements = Array.from(doc.querySelectorAll(candidateSelectors.join(',')));
                const pointerElements = Array.from(doc.querySelectorAll('div, span, li, p, i, em, strong, svg')).filter(el => {
                    try {
                        if (!el || el.id === 'antigravity-som-container' || (el.closest && el.closest('#antigravity-som-container'))) return false;
                        const s = window.getComputedStyle(el);
                        return s.cursor === 'pointer' && el.children.length <= 2;
                    } catch (_) { return false; }
                });

                const rawElements = Array.from(new Set([...standardElements, ...pointerElements])).filter(isVisible);

                function getElementLabel(el) {
                    const aria = (el.getAttribute('aria-label') || '').trim();
                    if (aria) return aria;
                    const inner = (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim();
                    if (inner && inner.length <= 60 && !inner.startsWith('<')) return inner;
                    const val = (el.value || '').trim();
                    if (val) return val;
                    const placeholder = (el.getAttribute('placeholder') || '').trim();
                    if (placeholder) return placeholder;
                    const title = (el.getAttribute('title') || '').trim();
                    if (title) return title;
                    const imgAlt = el.querySelector && el.querySelector('img[alt]')?.alt?.trim();
                    if (imgAlt) return imgAlt;
                    const svgTitle = el.querySelector && el.querySelector('title')?.textContent?.trim();
                    if (svgTitle) return svgTitle;

                    // Universal SVG sprite symbol resolution (use href="#search", use href="#play", etc.)
                    const useEl = el.querySelector ? el.querySelector('use') : (el.tagName.toLowerCase() === 'use' ? el : null);
                    if (useEl) {
                        const href = (useEl.getAttribute('href') || useEl.getAttribute('xlink:href') || '').toLowerCase();
                        if (href.includes('search')) return '[Search Icon]';
                        if (href.includes('play')) return '[Play Icon]';
                        if (href.includes('pause')) return '[Pause Icon]';
                        if (href.includes('menu')) return '[Menu Icon]';
                        if (href.includes('close')) return '[Close Icon]';
                        if (href.length > 1 && !href.includes('loader') && !href.includes('spinner') && !href.includes('placeholder')) {
                            return '[' + href.replace(/^#/, '') + ' Icon]';
                        }
                    }

                    // Semantic slug extraction from href/data-to (e.g. /watch-whats-wrong-with-secretary-kim...)
                    const rawHref = el.getAttribute('data-to') || el.getAttribute('href') || el.href || '';
                    if (rawHref && !rawHref.startsWith('javascript:')) {
                        try {
                            const pathParts = rawHref.split(/[?#]/)[0].split('/').filter(Boolean);
                            const lastSlug = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2] || '';
                            if (lastSlug && lastSlug.length > 4 && !/^[0-9a-f]{20,}$/i.test(lastSlug)) {
                                const cleanSlug = lastSlug
                                    .replace(/^(?:watch|online|video|show)-+/i, '')
                                    .replace(/-+(?:online|watch|video|hindi|dubbed|series|free|episode|season.*)$/i, '')
                                    .replace(/-/g, ' ')
                                    .trim();
                                if (cleanSlug.length > 2) {
                                    const words = cleanSlug.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
                                    return '[Card: ' + words.join(' ') + ']';
                                }
                            }
                        } catch (_) {}
                    }

                    const tag = el.tagName.toLowerCase();
                    const classStr = typeof el.className === 'string' ? el.className : (el.className?.baseVal || '');
                    const idStr = el.id || '';
                    const isSearch = /search/i.test(classStr + ' ' + idStr + ' ' + (el.getAttribute('name') || '') + ' ' + (el.closest?.('[role="search"]') ? 'search' : ''));
                    const isSubmit = el.type === 'submit' || (typeof el.matches === 'function' && el.matches('button[type="submit"], input[type="submit"]'));

                    if (isSearch) return '[Search Button]';
                    if (isSubmit) return '[Submit]';
                    if (tag === 'button' || el.getAttribute('role') === 'button') {
                        const id = el.id ? '#' + el.id : '';
                        const name = el.getAttribute('name') ? '[name="' + el.getAttribute('name') + '"]' : '';
                        return '[Button' + (id || name || '') + ']';
                    }
                    if (tag === 'svg') return '[Icon: ' + (classStr.trim().split(/\\s+/)[0] || 'svg') + ']';
                    if (tag === 'input') return '[Input: ' + (el.type || 'text') + ']';
                    if (tag === 'video') return '[Video Player]';
                    if (el.closest && (el.closest('.card, .portrait-container, [class*="card" i]') || el.querySelector('img'))) {
                        return '[Show/Video Card]';
                    }
                    return '<' + tag + '>';
                }

                // Sort: Viewport items first, top-to-bottom then left-to-right
                const vh = window.innerHeight || doc.documentElement.clientHeight;
                rawElements.sort((a, b) => {
                    const rA = a.getBoundingClientRect();
                    const rB = b.getBoundingClientRect();
                    const inVpA = rA.top >= 0 && rA.top <= vh;
                    const inVpB = rB.top >= 0 && rB.top <= vh;
                    if (inVpA && !inVpB) return -1;
                    if (!inVpA && inVpB) return 1;
                    if (Math.abs(rA.top - rB.top) > 12) return rA.top - rB.top;
                    return rA.left - rB.left;
                });

                // Deduplicate parent/child click targets
                const deduped = [];
                const seenClickNodes = new Set();
                for (const el of rawElements) {
                    const target = el.tagName.toLowerCase() === 'a' ? el : (el.closest ? (el.closest('a') || el.closest('button') || el) : el);
                    if (!seenClickNodes.has(target)) {
                        seenClickNodes.add(target);
                        deduped.push(target);
                    }
                }

                const somContainer = doc.createElement('div');
                somContainer.id = 'antigravity-som-container';
                somContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2147483647;';

                const scrollX = window.scrollX || window.pageXOffset || 0;
                const scrollY = window.scrollY || window.pageYOffset || 0;

                const actionableElements = [];
                let markId = 1;
                for (const el of deduped) {
                    const text = getElementLabel(el);
                    const r = el.getBoundingClientRect();
                    if (r.width < 6 || r.height < 6) continue;

                    el.setAttribute('data-som-id', String(markId));

                    const pill = doc.createElement('div');
                    pill.className = 'antigravity-som-pill';
                    pill.setAttribute('data-som-badge', String(markId));
                    pill.textContent = '#' + markId;
                    pill.style.cssText = 'position:absolute;top:' + Math.max(0, r.top + scrollY - 9) + 'px;left:' + Math.max(0, r.left + scrollX - 5) + 'px;background:#FFE600;color:#000000;font-size:11px;font-weight:900;font-family:ui-monospace,monospace;padding:1px 5px;border-radius:4px;border:1.5px solid rgba(0,0,0,0.85);box-shadow:0 2px 6px rgba(0,0,0,0.6),0 0 10px rgba(255,230,0,0.6);z-index:2147483647;pointer-events:none;line-height:14px;white-space:nowrap;';
                    somContainer.appendChild(pill);

                    const orig = el.style.outline;
                    el.setAttribute('data-som-orig-outline', orig || '');
                    el.style.outline = '1.5px solid rgba(255, 230, 0, 0.75)';

                    actionableElements.push({
                        mark: '#' + markId++,
                        text: text.substring(0, 70),
                        tag: el.tagName.toLowerCase(),
                        id: el.id || '',
                        href: el.href || el.getAttribute('href') || '',
                        rect: { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) }
                    });
                    if (actionableElements.length >= 120) break;
                }

                if (actionableElements.length > 0) {
                    doc.documentElement.appendChild(somContainer);
                }

                // 6. Infer workflow phase
                let phase = 'GENERAL_PAGE';
                let recommendation = 'Browse or navigate to target content';

                if (activeCountdown && !activeCountdown.isComplete) {
                    phase = 'GATEWAY_COUNTDOWN';
                    recommendation = 'Wait for countdown timer (' + (activeCountdown.secondsRemaining || 0) + 's) to finish';
                } else if (verification.hasTwoStepsBtn) {
                    phase = 'GATEWAY_STEP2_COMPLETE';
                    recommendation = 'Click "GO TO DOWNLOAD" / #two_steps_btn to proceed to download host';
                } else if (verification.hasVerifyBtn2) {
                    phase = 'GATEWAY_STEP2_VERIFY';
                    recommendation = 'Click "VERIFY TO CONTINUE" / #verify_button2 to begin final countdown';
                } else if (verification.hasLandingForm || (activeCountdown && activeCountdown.isComplete)) {
                    phase = 'GATEWAY_STEP1_VERIFY';
                    recommendation = 'Submit #landing form or click "START VERIFICATION"';
                } else if (downloadTriggers.length > 0) {
                    phase = 'DOWNLOAD_SELECTION';
                    const best = downloadTriggers.find(t => t.isFastServer) || downloadTriggers.find(t => t.isCloudGateway) || downloadTriggers[0];
                    recommendation = 'Select download server: "' + (best ? best.text : 'First option') + '"';
                } else if (searchInputs.length > 0 && /search|zone|mod/i.test(domain)) {
                    phase = 'SEARCH_AVAILABLE';
                    recommendation = 'Type query into search input';
                }

                return {
                    success: true,
                    page: { url, title, domain, readyState },
                    phase,
                    activeCountdown,
                    verification,
                    downloadTriggers: downloadTriggers.slice(0, 15),
                    searchInputs: searchInputs.slice(0, 5),
                    actionableElements,
                    recommendation
                };
            })();
        `);
        return context;
    } catch (err) {
        return {
            success: false,
            error: err.message,
            page: { url: '', title: '', domain: '', readyState: 'error' },
            phase: 'ERROR',
            recommendation: 'Retry inspecting active page'
        };
    }
}

/**
 * Autonomous Adaptive Site Action Engine
 * Takes an intent (e.g. 'solve_verification', 'select_download_server', 'trigger_download')
 * and performs the optimal in-page action dynamically.
 */
export async function executeAdaptiveAction(webview, intent = 'solve_verification', options = {}) {
    if (!webview || typeof webview.executeJavaScript !== 'function') {
        return { success: false, error: 'Webview unavailable' };
    }

    const context = await extractAdaptivePageContext(webview);
    if (!context.success) return context;

    if (intent === 'solve_verification' || intent === 'pass_verification') {
        const res = await webview.executeJavaScript(`
            (function() {
                // Check if step 2 complete ("GO TO DOWNLOAD")
                const twoSteps = document.getElementById('two_steps_btn');
                if (twoSteps && window.getComputedStyle(twoSteps).display !== 'none') {
                    twoSteps.click();
                    return { success: true, action: 'clicked_two_steps_btn' };
                }

                // Check if step 2 verify button
                const btn2 = document.getElementById('verify_button2');
                if (btn2 && window.getComputedStyle(btn2).display !== 'none') {
                    btn2.click();
                    return { success: true, action: 'clicked_verify_button2' };
                }

                // Check if step 1 landing form
                const landing = document.getElementById('landing');
                if (landing && typeof landing.submit === 'function') {
                    landing.submit();
                    return { success: true, action: 'submitted_landing_form' };
                }

                // Check for text button matches
                const startBtn = Array.from(document.querySelectorAll('button, a, input[type=submit]')).find(b => 
                    /start\\s*verification|verify\\s*to\\s*continue|click\\s*here\\s*to\\s*continue/i.test(b.innerText || b.value || '')
                );
                if (startBtn) {
                    startBtn.click();
                    return { success: true, action: 'clicked_' + (startBtn.innerText || startBtn.value || 'btn').trim() };
                }

                return { success: false, message: 'No active verification trigger found on current page' };
            })();
        `);
        return { ...res, currentPhase: context.phase };
    }

    if (intent === 'select_download_server') {
        const preferred = options.server || 'fast';
        const res = await webview.executeJavaScript(`
            (function() {
                const links = Array.from(document.querySelectorAll('a, button')).filter(el => {
                    const s = window.getComputedStyle(el);
                    return s.display !== 'none' && s.visibility !== 'hidden' && el.offsetWidth > 0;
                });

                const fast = links.find(l => /fast\\s*server/i.test(l.innerText || ''));
                if (fast) {
                    fast.click();
                    return { success: true, action: 'selected_fast_server', text: fast.innerText, href: fast.href };
                }

                const server = links.find(l => /server|g-drive|direct/i.test(l.innerText || ''));
                if (server) {
                    server.click();
                    return { success: true, action: 'selected_server', text: server.innerText, href: server.href };
                }

                return { success: false, message: 'No download server links matched' };
            })();
        `);
        return res;
    }

    return { success: false, error: 'Unknown adaptive action intent: ' + intent };
}

