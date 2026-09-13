'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { ThreatPolygon, UserReport } from '../../types/workspace';

// Helper controller to dynamically pan/zoom map when active tab or selected zone changes
function MapViewSync({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 0.8 });
  }, [center, zoom, map]);

  return null;
}

// Custom SVG DivIcon generator for Crowdsourced Ground Reports
function createIncidentMarkerIcon(report: UserReport): L.DivIcon {
  const isCritical = report.severity === 'CRITICAL';
  const isHigh = report.severity === 'HIGH';
  const color = isCritical ? '#ef4444' : isHigh ? '#f59e0b' : '#3b82f6';
  const pulseClass = isCritical ? 'animate-ping' : '';

  const html = `
    <div class="relative flex items-center justify-center cursor-pointer group" style="width: 32px; height: 32px;">
      ${isCritical ? `<span class="absolute w-7 h-7 rounded-full bg-red-500/40 ${pulseClass}"></span>` : ''}
      <div class="relative w-7 h-7 rounded-full flex items-center justify-center border-2 shadow-lg" style="background-color: #0f172a; border-color: ${color}; box-shadow: 0 0 10px ${color}80;">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          ${
            report.incidentType === 'WATERLOGGING' || report.incidentType === 'FLASH_FLOOD'
              ? '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>'
              : report.incidentType === 'FALLEN_TREE'
              ? '<path d="M12 2l-6 9h4v4H6l-4 7h20l-4-7h-4v-4h4z"/>'
              : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
          }
        </svg>
      </div>
      ${
        report.waterDepthCm
          ? `<span class="absolute -bottom-2 px-1 rounded text-[9px] font-bold font-mono text-white bg-slate-900 border border-slate-700 shadow">${report.waterDepthCm}cm</span>`
          : ''
      }
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-incident-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
}

// Custom Marker for Threat Polygon Centroid
function createCentroidIcon(severity: string, label: string): L.DivIcon {
  const color = severity === 'EMERGENCY' ? '#ef4444' : '#f59e0b';
  const html = `
    <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-full border shadow-md font-sans text-[10px] font-bold text-white whitespace-nowrap" style="background: rgba(15, 23, 42, 0.85); border-color: ${color};">
      <span class="w-2 h-2 rounded-full animate-pulse" style="background-color: ${color};"></span>
      <span>${label}</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-centroid-marker',
    iconSize: [120, 24],
    iconAnchor: [60, 12]
  });
}

export default function ThreatMapInternal() {
  const { 
    tabs, 
    activeTabId, 
    weatherData, 
    selectedPolygon, 
    setSelectedPolygon, 
    groundReports, 
    upvoteReport 
  } = useWorkspaceStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const centerCoord: [number, number] = activeTab?.coordinates || [19.0688, 72.8797];
  const zoom = activeTab?.zoomLevel || 14;

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={centerCoord}
        zoom={zoom}
        zoomControl={false}
        attributionControl={false}
        className="w-full h-full min-h-[380px] bg-slate-950"
      >
        <MapViewSync center={centerCoord} zoom={zoom} />

        {/* CartoDB Dark Matter Basemap Tiles (High-contrast, sleek 2026 aesthetics) */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        {/* Dynamic Threat Polygons */}
        {weatherData.activeThreatZones.map((zone: ThreatPolygon) => {
          const isSelected = selectedPolygon?.id === zone.id;
          const isEmergency = zone.severity === 'EMERGENCY';
          const strokeColor = isEmergency ? '#ef4444' : '#f59e0b';
          const fillColor = isEmergency ? '#dc2626' : '#d97706';

          return (
            <React.Fragment key={zone.id}>
              <Polygon
                positions={zone.coordinates}
                pathOptions={{
                  color: isSelected ? '#00f0ff' : strokeColor,
                  weight: isSelected ? 3 : 2,
                  fillColor: fillColor,
                  fillOpacity: isSelected ? 0.35 : 0.22,
                  dashArray: isEmergency ? undefined : '5, 5'
                }}
                eventHandlers={{
                  click: () => {
                    setSelectedPolygon(zone);
                  }
                }}
              >
                <Tooltip sticky direction="top" className="custom-leaflet-tooltip">
                  <div className="bg-slate-900/95 text-slate-100 p-2 rounded-lg border border-slate-700 shadow-xl font-sans text-xs">
                    <div className="font-bold text-red-400">{zone.zoneName}</div>
                    <div className="text-slate-300 text-[11px]">{zone.dominantHazard}</div>
                    <div className="text-cyan-400 font-mono text-[10px] mt-1">
                      Peak Expected: {zone.peakRainfallExpectedMmHr} mm/hr
                    </div>
                  </div>
                </Tooltip>
              </Polygon>

              {/* Centroid Label Marker */}
              <Marker
                position={zone.centroid}
                icon={createCentroidIcon(zone.severity, zone.neighborhood)}
                eventHandlers={{
                  click: () => setSelectedPolygon(zone)
                }}
              />
            </React.Fragment>
          );
        })}

        {/* Crowdsourced Ground Truth Incident Markers */}
        {groundReports.map((report) => (
          <Marker
            key={report.id}
            position={report.coordinates}
            icon={createIncidentMarkerIcon(report)}
          >
            <Popup className="custom-leaflet-popup">
              <div className="bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-700 shadow-2xl font-sans text-xs min-w-[210px]">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                  <span className="font-bold text-cyan-400 uppercase text-[10px] tracking-wider">
                    {report.incidentType.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {report.timestamp}
                  </span>
                </div>
                <div className="font-semibold text-slate-200 mb-1">
                  {report.locationName}
                </div>
                <p className="text-slate-300 text-[11px] mb-2 leading-relaxed">
                  {report.description}
                </p>
                {report.waterDepthCm && (
                  <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/30 px-2 py-1 rounded text-blue-300 font-mono text-[10px] mb-2">
                    <span>Water Depth:</span>
                    <span className="font-bold text-cyan-300">{report.waterDepthCm} cm</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-400">
                    By {report.reportedBy}
                  </span>
                  <button
                    onClick={() => upvoteReport(report.id)}
                    className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 transition-colors"
                  >
                    <span>▲ Upvote</span>
                    <span className="font-mono font-bold">({report.upvotes})</span>
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
