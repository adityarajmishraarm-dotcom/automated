import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import DetachedAiHudCockpit from './components/DetachedAiHudCockpit.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    const params = new URLSearchParams(window.location.search);
    const isDetached = params.get('view') === 'detached-hud' || window.location.hash === '#detached-hud';

    if (isDetached) {
        root.render(
            <ErrorBoundary title="Nexora Detached AI Cockpit Error">
                <DetachedAiHudCockpit />
            </ErrorBoundary>
        );
        console.log('[Nexora] React Detached AI Cockpit mounted successfully.');
    } else {
        root.render(
            <ErrorBoundary title="Nexora Browser Core UI">
                <App />
            </ErrorBoundary>
        );
        console.log('[Nexora] React Desktop App mounted successfully.');
    }
} else {
    console.error('[Nexora] Root element not found.');
}
