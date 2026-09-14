/**
 * Antigravity AI-Native Desktop Browser - AI Harness Engine
 * High-performance command interpreter and webview interaction controller.
 * Minimalist, native, zero-dependency implementation (Ponytail tenet).
 */

// Dynamic live URL resolver (zero preconfigured static sites)
export function resolveTargetUrl(target) {
    if (!target) return 'https://www.google.com';
    const trimmed = target.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('file://')) {
        return trimmed;
    }
    if (trimmed.includes('.') && !trimmed.includes(' ') && !trimmed.includes('?')) {
        return 'https://' + trimmed;
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
                    return style.display !== 'none' && 
                           style.visibility !== 'hidden' && 
                           style.opacity !== '0' &&
                           el.offsetWidth > 0 && 
                           el.offsetHeight > 0;
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

                const rankRegex = /\\b(1st|first|2nd|second|3rd|third|4th|fourth|5th|fifth|6th|sixth|7th|seventh|8th|eighth|9th|ninth|10th|\\d+(?:st|nd|rd|th)?)\\b/gi;
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
                }

                if (!searchTerm) searchTerm = cleanTerm || targetRaw;
                const termLower = searchTerm.toLowerCase();

                // Check for Set-of-Marks mark index (#7, hashtag 7, mark 7)
                let markIndex = null;
                const markMatch = targetRaw.match(/^(?:#|hashtag\\s*|mark\\s*|badge\\s*|number\\s*|no\\.?\\s*)?(\\d+)$/i);
                if (markMatch) {
                    markIndex = parseInt(markMatch[1], 10);
                }

                const selectors = [
                    'button', 'a', 'input', 'textarea', 'select', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                    '[role="button"]', '[role="link"]', '[role="searchbox"]', '[role="search"]', '[role="textbox"]',
                    '[role="combobox"]', '[role="option"]', '[role="menuitem"]', '[role="tab"]',
                    'summary', '[tabindex]:not([tabindex="-1"])', '.btn', '.button', '[onclick]',
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
                        const directEl = document.querySelector(targetRaw) || document.getElementById(targetRaw);
                        if (directEl && isVisible(directEl)) {
                            matchedEl = directEl;
                            matchType = 'Direct Selector/ID Match';
                        }
                    } catch (e) {}
                }

                // Tier 0: Set-of-Marks Mark Index Match
                if (!matchedEl && markIndex !== null) {
                    const somEl = document.querySelector('[data-som-id="' + markIndex + '"]') || document.querySelector('#som-' + markIndex);
                    if (somEl && isVisible(somEl)) {
                        matchedEl = somEl;
                        matchType = 'SoM Mark #' + markIndex;
                    } else if (markIndex >= 1 && markIndex <= visibleCandidates.length) {
                        matchedEl = visibleCandidates[markIndex - 1];
                        matchType = 'Mark #' + markIndex;
                    }
                }

                // Tier 1: Search Bar Detection
                const isExplicitSearchIntent = targetLower === 'search bar' || 
                                               targetLower === 'search box' || 
                                               targetLower === 'search input' || 
                                               targetLower === 'search field' || 
                                               targetLower === 'sb' || 
                                               targetLower === 's';

                if (!matchedEl && isExplicitSearchIntent) {
                    const searchSelectors = [
                        'textarea[name="q"]', 'input[name="q"]', 'textarea.gLFyf', 'input.gLFyf',
                        'textarea[title*="Search" i]', 'input[title*="Search" i]',
                        'textarea[aria-label*="Search" i]', 'input[aria-label*="Search" i]',
                        'input#search', 'input#searchInput', 'input#searchbox_input', 'input[type="search"]',
                        'textarea[name*="search" i]', 'input[name*="search" i]', 'input[id*="search" i]',
                        'input[placeholder*="search" i]', 'textarea[placeholder*="search" i]',
                        '[role="searchbox"]', '[role="search"] textarea', '[role="search"] input',
                        'textarea:not([type="hidden"])', 'input[type="text"]', 'input:not([type="hidden"])'
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

                        const isTextMatched = txtCombined.includes(termLower) || (isLink && hrefStr.includes(termLower));
                        const isValueMatched = isInput && valStr.includes(termLower);

                        if (isTextMatched || isValueMatched) {
                            const clickNode = isLink ? (el.closest('a') || el) : el;
                            matchesList.push({
                                node: clickNode,
                                metadata: m,
                                tag: tag,
                                isLink: isLink,
                                isButton: isButton,
                                isInput: isInput,
                                isTextMatched: isTextMatched
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
                    if (filterType === 'link') {
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

                    // Score candidates so hyperlinks are prioritized
                    filteredPool.sort((a, b) => {
                        let scoreA = 0;
                        let scoreB = 0;
                        const nodeA = a.node;
                        const nodeB = b.node;
                        const hrefA = (nodeA.href || nodeA.getAttribute('href') || '').toLowerCase();
                        const hrefB = (nodeB.href || nodeB.getAttribute('href') || '').toLowerCase();

                        if (hrefA && (hrefA.startsWith('http://') || hrefA.startsWith('https://'))) scoreA += 100;
                        if (hrefB && (hrefB.startsWith('http://') || hrefB.startsWith('https://'))) scoreB += 100;

                        if (hrefA.includes(termLower)) scoreA += 50;
                        if (hrefB.includes(termLower)) scoreB += 50;

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
                    webview.loadURL(result.url).catch(() => {});
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
 * Type text directly into active page's search bar and submit
 */
export async function typeAndSubmitInSearchBar(webview, textToType) {
    if (!webview || typeof webview.executeJavaScript !== 'function') {
        return { success: false, message: 'No active webview available for search typing.' };
    }

    try {
        const result = await webview.executeJavaScript(`
            (function() {
                const text = ${JSON.stringify(textToType)};
                const searchSelectors = [
                    'textarea[name="q"]', 'input[name="q"]', 'textarea.gLFyf', 'input.gLFyf',
                    'input#search', 'input#searchInput', 'input#searchbox_input', 'input[type="search"]',
                    'textarea[name*="search" i]', 'input[name*="search" i]', 'input[id*="search" i]',
                    'input[placeholder*="search" i]', 'textarea[placeholder*="search" i]',
                    '[role="searchbox"]', '[role="search"] textarea', '[role="search"] input',
                    'textarea:not([type="hidden"])', 'input[type="text"]', 'input:not([type="hidden"])'
                ];

                let targetInput = null;
                for (const sel of searchSelectors) {
                    const el = document.querySelector(sel);
                    if (el && el.offsetWidth > 0 && el.offsetHeight > 0) {
                        targetInput = el;
                        break;
                    }
                }

                if (!targetInput) {
                    return { success: false, error: 'Could not find an active search input on current page.' };
                }

                targetInput.focus();
                targetInput.value = text;
                targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                targetInput.dispatchEvent(new Event('change', { bubbles: true }));

                // Highlight yellow
                const origOutline = targetInput.style.outline;
                targetInput.style.outline = '3px solid #FFE600';
                targetInput.style.boxShadow = '0 0 16px #FFE600';
                setTimeout(() => {
                    targetInput.style.outline = origOutline;
                    targetInput.style.boxShadow = '';
                }, 1000);

                // Try form submit or Enter keypress
                let formSubmitted = false;
                const form = targetInput.closest('form');
                if (form) {
                    try {
                        const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
                        if (submitBtn) {
                            submitBtn.click();
                            formSubmitted = true;
                        } else {
                            form.requestSubmit ? form.requestSubmit() : form.submit();
                            formSubmitted = true;
                        }
                    } catch (e) {}
                }

                if (!formSubmitted) {
                    const enterEvt = new KeyboardEvent('keydown', {
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13,
                        bubbles: true,
                        cancelable: true
                    });
                    targetInput.dispatchEvent(enterEvt);
                }

                return { success: true, text: text, inputTag: targetInput.tagName.toLowerCase() };
            })();
        `);

        if (result && result.success) {
            return `⌨️ Typed <strong>"${textToType}"</strong> into search bar and submitted search.`;
        } else {
            return `⚠️ Could not find search bar on current page: ${result ? result.error : 'Unknown error'}`;
        }
    } catch (e) {
        return `⚠️ Search typing error: ${e.message}`;
    }
}

/**
 * Number matching words on screen with yellow badges (#1, #2, #3)
 */
export async function highlightAndNumberOccurrences(webview, keyword) {
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
        logTelemetry = () => {}
    } = context;

    // 0. Shortcut Normalization (CLK SB, CLK S, clk sb, clk s, CLK search bar)
    if (/^\s*(?:clk|click)\s+(?:sb|s|search\s*bar|searchbox)\s*$/i.test(raw)) {
        raw = 'click search bar';
    } else if (/^clk\b/i.test(raw)) {
        raw = raw.replace(/^clk\b/i, 'click');
        raw = raw.replace(/\b(click|clk)\s+sb\b/gi, 'click search bar');
        raw = raw.replace(/\b(click|clk)\s+s\b/gi, 'click search bar');
    }

    // 0b. Direct Tab Shortcuts ("tab 1", "tabone", "tab1", "tab 2", "tabtwo", "tabclose", "closetab")
    if (/^\s*(?:tab\s*close|tabclose|closetab|close\s*tab)\s*$/i.test(raw)) {
        if (onCloseTab) {
            onCloseTab(activeTabId);
            return '❌ Closed active tab.';
        }
    }
    const directTabMatch = raw.match(/^\s*(?:tab|switch\s*to\s*tab|goto\s*tab|go\s*to\s*tab)\s*(\d+|one|two|three|four|five)\s*$/i) ||
                           raw.match(/^\s*tab(one|two|three|four|five|\d+)\s*$/i);
    if (directTabMatch) {
        const wordMap = { one: 1, two: 2, three: 3, four: 4, five: 5 };
        const val = directTabMatch[1].toLowerCase();
        const tabIdx = wordMap[val] || parseInt(val, 10);
        if (tabIdx >= 1 && tabIdx <= tabs.length) {
            const targetTab = tabs[tabIdx - 1];
            if (onSelectTab && targetTab) {
                onSelectTab(targetTab.id);
                return `👉 Switched to tab #${tabIdx} (<strong>${targetTab.title || 'Untitled'}</strong>).`;
            }
        } else {
            return `⚠️ Tab #${tabIdx} does not exist. You currently have ${tabs.length} open tab(s).`;
        }
    }

    // Direct search bar typing: "enter; <text>", "enter: <text>", "enter <text>", "type <text>"
    const enterCmdMatch = raw.match(/^(?:enter|type|write|input)\s*(?:[;:|]\s*|\s+)(.+)/i);
    if (enterCmdMatch) {
        const textToType = enterCmdMatch[1].trim();
        if (textToType) {
            const wv = getActiveWebview ? getActiveWebview() : null;
            return await typeAndSubmitInSearchBar(wv, textToType);
        }
    }

    const lower = raw.toLowerCase();
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
    if (lower.startsWith('navigate to ') || (lower.startsWith('go to ') && !lower.includes('tab'))) {
        const dest = raw.replace(/^(navigate to|go to)\s+/i, '').trim();
        if (dest && onNavigate) {
            const finalUrl = resolveTargetUrl(dest);
            onNavigate(finalUrl);
            return `🚀 Navigating active tab to <strong>${finalUrl}</strong>.`;
        }
    }

    // 6. OPEN WEBSITE / NEW TAB
    if (lower.startsWith('open ') && !matches('history', 'split', 'sidebar', 'reading', 'reader', 'qr', 'palette')) {
        const target = raw.substring(5).trim();

        if (matches('new tab', 'a new tab', 'blank tab', 'tab')) {
            if (onOpenTab) onOpenTab('', 'New Tab');
            return '✨ Opened a new blank tab.';
        }

        const targetUrl = resolveTargetUrl(target);
        const title = target;

        if (onOpenTab) {
            onOpenTab(targetUrl, title);
            return `🌐 Opened <strong>${title}</strong> in a new tab (<span style="color: var(--accent-cyan);">${targetUrl}</span>).`;
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

    // Fallback: General AI Navigation or Search
    if (matches('navigate to', 'go to') && raw.length > 6) {
        const navTarget = raw.replace(/^.*?\b(?:navigate to|go to)\s+/i, '').trim();
        if (navTarget) {
            if (KNOWN_SITES[navTarget.toLowerCase()]) {
                if (onNavigate) onNavigate(KNOWN_SITES[navTarget.toLowerCase()]);
                return `🌐 Navigated active tab to <strong>${navTarget}</strong>.`;
            } else if (onNavigate) {
                onNavigate(navTarget);
                return `🌐 Navigated active tab to <strong>${navTarget}</strong>.`;
            }
        }
    }

    // Fallback: If configured with an active AI Provider, dispatch prompt to LLM / VLM
    try {
        const { getActiveProviderConfig, sendChatMessage } = await import('./services/aiProviderService.js');
        const activeConfig = getActiveProviderConfig();
        const hasKeyOrLocal = activeConfig && (activeConfig.apiKey || activeConfig.id === 'lmstudio' || activeConfig.id === 'ollama');

        if (hasKeyOrLocal) {
            const activeUrl = activeTab?.url || '';
            const activeTitle = activeTab?.title || '';
            const systemPrompt = `You are Antigravity Browser AI Copilot. You assist the user with web browsing and understanding.\nActive Tab: "${activeTitle}" (${activeUrl})\nTotal Open Tabs: ${tabs.length}. Keep answers concise and helpful.`;
            const aiRes = await sendChatMessage({
                prompt: raw,
                systemPrompt
            });
            if (aiRes && aiRes.success && aiRes.reply) {
                return `🤖 <strong>[${aiRes.provider}: ${aiRes.model}]</strong><br>${aiRes.reply.replace(/\n/g, '<br>')}`;
            }
        }
    } catch (e) {
        console.warn('[AI Harness fallback error]', e.message);
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
                    const s = window.getComputedStyle(el);
                    return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' && (el.offsetWidth > 0 || el.offsetHeight > 0);
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

                // 5. Gather top Set-of-Marks actionable elements (max 20)
                const actionableElements = [];
                let markId = 1;
                for (const el of allLinks.slice(0, 50)) {
                    const text = (el.innerText || el.value || el.title || '').trim();
                    if (!text || text.length > 80) continue;
                    const r = el.getBoundingClientRect();
                    actionableElements.push({
                        mark: '#' + markId++,
                        text: text.substring(0, 60),
                        tag: el.tagName.toLowerCase(),
                        id: el.id || '',
                        href: el.href || '',
                        rect: { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) }
                    });
                    if (actionableElements.length >= 20) break;
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

