'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { 
  Plus, 
  Minus, 
  Radio, 
  Wind, 
  CloudRain, 
  Eye, 
  Compass, 
  Info 
} from 'lucide-react';
import { ThreatPolygon } from '../../types/workspace';

// Dynamic SSR-safe import of Leaflet Map Component (resolves 'window is not defined')
const ThreatMapInternal = dynamic(() => import('./ThreatMapInternal'), {
  ssr: false,
  loading: () => <MapLoadingSkeleton />
});

function MapLoadingSkeleton() {
  return (
    <div className="w-full h-full min-h-[380px] bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute w-72 h-72 rounded-full border border-cyan-500/20 animate-ping opacity-30"></div>
      <div className="absolute w-48 h-48 rounded-full border border-cyan-500/30"></div>
      <div className="absolute w-24 h-24 rounded-full border border-cyan-500/40"></div>
      <div className="relative z-10 flex flex-col items-center gap-3">
        <Radio className="w-7 h-7 text-cyan-400 animate-pulse" />
        <span className="text-xs font-mono font-medium text-cyan-300 tracking-wider">
          INITIALIZING RADAR SURFACE TILES & GEOPOLYGONS...
        </span>
        <span className="text-[10px] text-slate-500 font-mono">
          EPSG:4326 | High-Resolution Doppler Mesh
        </span>
      </div>
    </div>
  );
}

export const ThreatMapBentoTile: React.FC = () => {
  const { 
    tabs, 
    activeTabId, 
    updateTabCoords,
    weatherData, 
    selectedPolygon, 
    setSelectedPolygon 
  } = useWorkspaceStore();

  const [activeLayer, setActiveLayer] = useState<'PRECIPITATION' | 'REFLECTIVITY' | 'WIND_VECTORS' | 'CLOUD_COVER'>('PRECIPITATION');
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const handleZoomIn = () => {
    if (activeTab) {
      updateTabCoords(activeTab.id, activeTab.coordinates, activeTab.locationName);
    }
  };

  const handleZoomOut = () => {
    if (activeTab) {
      updateTabCoords(activeTab.id, activeTab.coordinates, activeTab.locationName);
    }
  };

  const radarLayers: Array<{ id: typeof activeLayer; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'PRECIPITATION', label: 'Rain (mm/h)', icon: CloudRain },
    { id: 'REFLECTIVITY', label: 'Doppler (dBZ)', icon: Radio },
    { id: 'WIND_VECTORS', label: 'Wind Vector', icon: Wind },
    { id: 'CLOUD_COVER', label: 'Satellite IR', icon: Eye }
  ];

  return (
    <div className="w-full h-full flex flex-col bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden relative text-left">
      {/* Tile Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-950/70 border-b border-slate-900/60 z-10">
        {/* Title & Coordinates */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-sans font-bold text-xs text-slate-100 uppercase tracking-wide">
                Live Doppler Radar & Threat Polygons
              </h3>
            </div>
            <p className="text-[10px] font-mono text-slate-500">
              {activeTab?.coordinates[0].toFixed(4)}°N, {activeTab?.coordinates[1].toFixed(4)}°E • Station IMD-{weatherData.location.stationId}
            </p>
          </div>
        </div>

        {/* Radar Layer Selector Tabs */}
        <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-slate-900">
          {radarLayers.map((layer) => {
            const Icon = layer.icon;
            const isSelected = activeLayer === layer.id;
            return (
              <button
                key={layer.id}
                type="button"
                onClick={() => setActiveLayer(layer.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span className="hidden sm:inline">{layer.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Body Canvas */}
      <div className="flex-1 w-full h-full relative min-h-[360px]">
        <ThreatMapInternal />

        {/* Floating Threat Zone Switcher Chips (Top-Left of Map) */}
        <div className="absolute top-3 left-3 z-[400] flex flex-col gap-1.5 max-w-[280px]">
          <div className="text-[10px] font-mono font-semibold text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded backdrop-blur w-fit">
            ACTIVE THREAT POLYGONS
          </div>
          <div className="flex flex-wrap gap-1.5">
            {weatherData.activeThreatZones.map((zone: ThreatPolygon) => {
              const isSelected = selectedPolygon?.id === zone.id;
              return (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => setSelectedPolygon(zone)}
                  className={`text-[10px] font-medium px-2 py-1 rounded-lg border backdrop-blur-md transition-all flex items-center gap-1.5 text-left ${
                    isSelected
                      ? 'bg-red-500/30 text-red-200 border-red-500 shadow-lg ring-1 ring-red-400'
                      : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:bg-slate-900'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${zone.severity === 'EMERGENCY' ? 'bg-red-500 animate-ping' : 'bg-amber-500'}`} />
                  <span className="truncate max-w-[130px]">{zone.neighborhood}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Floating Zoom Controls (Top-Right of Map) */}
        <div className="absolute top-3 right-3 z-[400] flex flex-col gap-1 bg-slate-950/85 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-xl">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg text-slate-300 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="w-full h-px bg-slate-800" />
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg text-slate-300 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {/* Floating Legend Indicator (Bottom-Left of Map) */}
        <div className="absolute bottom-3 left-3 z-[400] bg-slate-950/90 backdrop-blur-md border border-slate-800/90 p-2.5 rounded-xl shadow-xl font-mono text-[10px] space-y-1.5">
          <div className="text-slate-400 font-bold flex items-center gap-1 font-sans">
            <Info className="w-3 h-3 text-cyan-400" />
            <span>Precipitation Thresholds</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-2 rounded bg-red-600"></span>
            <span className="text-red-400">&gt; 80 mm/h (Cloudburst)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-2 rounded bg-amber-500"></span>
            <span className="text-amber-400">50 - 80 mm/h (Torrential)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-2 rounded bg-yellow-400"></span>
            <span className="text-yellow-300">20 - 50 mm/h (Heavy)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-2 rounded bg-blue-500"></span>
            <span className="text-blue-300">&lt; 20 mm/h (Moderate)</span>
          </div>
        </div>

        {/* Active Zone Detail Capsule (Bottom-Right of Map) */}
        {selectedPolygon && (
          <div className="absolute bottom-3 right-3 z-[400] max-w-[260px] bg-slate-950/90 backdrop-blur-md border border-red-500/40 p-2.5 rounded-xl shadow-xl text-[11px] font-sans">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-bold text-red-400 truncate">
                {selectedPolygon.zoneName}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 font-mono text-[9px] font-bold">
                {selectedPolygon.severity}
              </span>
            </div>
            <div className="text-slate-300 text-[10px] mb-1 leading-snug">
              {selectedPolygon.dominantHazard}
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800">
              <span>At Risk Pop:</span>
              <span className="text-white font-bold">
                {selectedPolygon.estimatedAffectedPopulation.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
