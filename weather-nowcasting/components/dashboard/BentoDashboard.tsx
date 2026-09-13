'use client';

import React from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { ThreatMapBentoTile } from './ThreatMapBentoTile';
import { MinimalNowcastChart } from './MinimalNowcastChart';
import { MinimalIncidentFeed } from './MinimalIncidentFeed';
import { 
  MapPin, 
  Activity, 
  Droplets, 
  Flame, 
  Compass, 
  ShieldAlert 
} from 'lucide-react';

export const BentoDashboard: React.FC = () => {
  const { tabs, activeTabId, weatherData } = useWorkspaceStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);

  if (!activeTab) return null;

  return (
    <div className="w-full flex-1 p-4 sm:p-6 flex flex-col gap-5 overflow-y-auto max-h-[calc(100vh-84px)] animate-in fade-in duration-200">
      {/* 1. Header Telemetry Strip (Spacious & Borderless) */}
      <div className="w-full flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-900/60">
        <div className="text-left">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <h2 className="text-lg font-bold text-slate-100 tracking-tight">
              {activeTab.locationName || activeTab.title}
            </h2>
          </div>
          <p className="text-xs font-mono text-slate-500 mt-0.5">
            {activeTab.coordinates[0].toFixed(4)}°N, {activeTab.coordinates[1].toFixed(4)}°E • Station ID: {weatherData.location.stationId}
          </p>
        </div>

        {/* Real-Time Meteorological Telemetry KPI Pills */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 text-slate-300 flex items-center gap-2">
            <Droplets className="w-3.5 h-3.5 text-cyan-400" />
            <span>Rain Rate: <strong className="text-white">{activeTab.localMetrics.currentPrecipMmHr} mm/h</strong></span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 text-slate-300 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>Saturation: <strong className="text-white">{activeTab.localMetrics.groundSaturationPercent}%</strong></span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 text-slate-300 flex items-center gap-2">
            <Flame className="w-3.5 h-3.5 text-red-400" />
            <span>CAPE: <strong className="text-white">{activeTab.localMetrics.capeIndexJkg} J/kg</strong></span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 font-semibold border border-red-500/20 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
            <span>ALERT ACTIVE</span>
          </div>
        </div>
      </div>

      {/* 2. Spacious Borderless Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
        {/* Left Column: Leaflet Map with Threat Polygons (7 Cols) */}
        <div className="lg:col-span-7 h-[460px] lg:h-[500px]">
          <ThreatMapBentoTile />
        </div>

        {/* Right Column: 120-Minute Recharts Curve with Zero Grid Lines (5 Cols) */}
        <div className="lg:col-span-5 h-[460px] lg:h-[500px]">
          <MinimalNowcastChart />
        </div>

        {/* Bottom Full-Width Column: Minimalist Ground Truth Incident Feed (12 Cols) */}
        <div className="lg:col-span-12 min-h-[300px]">
          <MinimalIncidentFeed />
        </div>
      </div>
    </div>
  );
};
