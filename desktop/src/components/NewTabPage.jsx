import React, { useState, useEffect } from 'react';

export default function NewTabPage({
    activeEngine,
    onSetEngine,
    onNavigate
}) {
    const [timeStr, setTimeStr] = useState('');
    const [greeting, setGreeting] = useState('Good day');
    const [query, setQuery] = useState('');

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            let hours = now.getHours();
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            setTimeStr(`${hours}:${minutes} ${ampm}`);

            const curHour = now.getHours();
            if (curHour < 12) setGreeting('Good morning');
            else if (curHour < 17) setGreeting('Good afternoon');
            else setGreeting('Good evening');
        };

        updateTime();
        const timer = setInterval(updateTime, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleSearchSubmit = (e) => {
        if (e) e.preventDefault();
        const text = query.trim();
        if (!text) return;

        let targetUrl = text;
        if (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('file://')) {
            targetUrl = text;
        } else if (text.includes('.') && !text.includes(' ') && !text.includes('?')) {
            targetUrl = 'https://' + text;
        } else {
            if (activeEngine === 'brave') {
                targetUrl = 'https://search.brave.com/search?q=' + encodeURIComponent(text);
            } else {
                targetUrl = 'https://www.google.com/search?q=' + encodeURIComponent(text);
            }
        }
        onNavigate(targetUrl);
    };

    const shortcuts = [
        { name: 'Google', desc: 'Search engine', icon: '🌐', color: '#4285f4', url: 'https://www.google.com' },
        { name: 'YouTube', desc: 'Videos & Music', icon: '▶️', color: '#ef4444', url: 'https://www.youtube.com' },
        { name: 'GitHub', desc: 'Code & Repos', icon: '🐙', color: '#f8fafc', url: 'https://github.com' },
        { name: 'Wikipedia', desc: 'Encyclopedia', icon: '📖', color: '#38bdf8', url: 'https://en.wikipedia.org' },
        { name: 'Hacker News', desc: 'Tech & Startups', icon: '🔶', color: '#ff6600', url: 'https://news.ycombinator.com' },
        { name: 'Reddit', desc: 'Communities', icon: '💬', color: '#f97316', url: 'https://www.reddit.com' },
        { name: 'ChatGPT', desc: 'AI Assistant', icon: '🤖', color: '#10b981', url: 'https://chatgpt.com' },
        { name: 'Autofill Demo', desc: 'Checkout Testbed', icon: '⚡', color: '#00e5ff', demo: 'checkout' },
    ];

    const placeholder = activeEngine === 'brave'
        ? 'Search Brave Private Search or type a web address...'
        : 'Search Google or type a web address...';

    return (
        <div className="ntp-wrapper">
            <div className="ntp-container">
                {/* Time & Greeting */}
                <div className="time-box">
                    <div className="clock-display" id="clockDisplay">{timeStr || '12:00 PM'}</div>
                    <div className="greeting-display" id="greetingDisplay">
                        {greeting}! Where would you like to go today?
                    </div>
                </div>

                {/* Brand Badge */}
                <div className="brand-badge">
                    <span>ANTIGRAVITY NATIVE BROWSER</span>
                </div>

                {/* Search Engine Choice */}
                <div className="engine-selector">
                    <button
                        className={`engine-btn ${activeEngine === 'google' ? 'active google' : ''}`}
                        id="btnEngineGoogle"
                        onClick={() => onSetEngine('google')}
                    >
                        <span>🔍</span> Google Search
                    </button>
                    <button
                        className={`engine-btn ${activeEngine === 'brave' ? 'active brave' : ''}`}
                        id="btnEngineBrave"
                        onClick={() => onSetEngine('brave')}
                    >
                        <span>🦁</span> Brave Search
                    </button>
                </div>

                {/* Search Form */}
                <form className="search-wrapper" onSubmit={handleSearchSubmit}>
                    <span className="search-icon-left" id="searchIconDisplay">
                        {activeEngine === 'brave' ? '🦁' : '🔍'}
                    </span>
                    <input
                        type="text"
                        id="ntpSearchInput"
                        className="search-box"
                        placeholder={placeholder}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoComplete="off"
                        spellCheck="false"
                        autoFocus
                    />
                    <button type="submit" className="btn-submit-search" id="btnSubmitSearch">
                        Search
                    </button>
                </form>

                {/* Speed Dial Shortcuts */}
                <div className="shortcuts-grid">
                    {shortcuts.map((sc, i) => (
                        <div
                            key={i}
                            className="shortcut-card"
                            onClick={() => {
                                if (sc.url) onNavigate(sc.url);
                                else if (sc.demo === 'checkout') onNavigate('demo_checkout.html');
                            }}
                        >
                            <div className="shortcut-icon" style={{ color: sc.color }}>
                                {sc.icon}
                            </div>
                            <span className="shortcut-title">{sc.name}</span>
                            <span className="shortcut-desc">{sc.desc}</span>
                        </div>
                    ))}
                </div>

                {/* Privacy & Engine Indicators */}
                <div className="feature-pills">
                    <span className="pill active">🛡️ Native Adblock Active</span>
                    <span className="pill active">⚡ In-Process Chromium</span>
                    <span className="pill active">🔒 Zero CDP Port Leaks</span>
                    <span className="pill active">🤖 React Native Desktop App</span>
                </div>
            </div>
        </div>
    );
}
