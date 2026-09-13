'use client';

import React from 'react';
import { BrowserShell } from '../../components/BrowserShell';
import { Launchpad } from '../../components/launchpad/Launchpad';
import { BentoDashboard } from '../../components/dashboard/BentoDashboard';
import { useBrowserStore } from '../../store/useBrowserStore';

export default function WorkspacePage() {
  const { tabs, activeTabId } = useBrowserStore();
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const mode = activeTab?.mode || 'web';
  const isLaunchpad = mode === 'launchpad' || activeTab?.url?.includes('launchpad');
  const isWeb = mode === 'web' || activeTab?.url?.startsWith('http');

  return (
    <BrowserShell>
      <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-950">
        {isLaunchpad ? (
          <Launchpad />
        ) : isWeb ? (
          <iframe
            key={activeTab?.url}
            src={activeTab?.url}
            className="w-full h-full border-0 flex-1 bg-white"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            allow="geolocation"
            title={activeTab?.title || 'Web Page'}
          />
        ) : (
          <BentoDashboard />
        )}
      </div>
    </BrowserShell>
  );
}
