'use client';

import React from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { GroundReport } from '../../types/workspace';
import { MapPin, ThumbsUp, Waves, Droplets, TreePine, AlertTriangle, CloudHail } from 'lucide-react';

const getCategoryIcon = (type: GroundReport['incidentType']) => {
  switch (type) {
    case 'WATERLOGGING':
      return <Droplets className="w-3.5 h-3.5 text-blue-400" />;
    case 'FLASH_FLOOD':
      return <Waves className="w-3.5 h-3.5 text-red-400" />;
    case 'FALLEN_TREE':
      return <TreePine className="w-3.5 h-3.5 text-emerald-400" />;
    case 'HAIL':
      return <CloudHail className="w-3.5 h-3.5 text-purple-400" />;
    case 'MUDSLIDE':
    default:
      return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
  }
};

export const MinimalIncidentFeed: React.FC = () => {
  const { groundReports, upvoteReport } = useWorkspaceStore();

  return (
    <div className="w-full h-full flex flex-col justify-between p-5 bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-sm text-left">
      {/* Header */}
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-cyan-400" />
          <h3 className="font-sans font-bold text-xs text-slate-200 uppercase tracking-wide">
            Crowdsourced Ground Truth Feed
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-500">
          {groundReports.length} Verified Field Reports
        </span>
      </div>

      {/* Report List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[360px]">
        {groundReports.map((report: GroundReport) => {
          const isCritical = report.severity === 'CRITICAL';
          const isHigh = report.severity === 'HIGH';

          return (
            <div
              key={report.id}
              className="p-3 rounded-xl bg-slate-950/60 hover:bg-slate-950/90 transition-colors flex items-start justify-between gap-3 text-xs"
            >
              <div className="flex items-start gap-2.5 flex-1">
                <div className="mt-0.5 p-1 rounded-lg bg-slate-900 shrink-0">
                  {getCategoryIcon(report.incidentType)}
                </div>

                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-200">
                      {report.locationName}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        isCritical
                          ? 'bg-red-500/20 text-red-400'
                          : isHigh
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {report.severity}
                    </span>
                    {report.waterDepthCm && (
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.2 rounded font-semibold">
                        {report.waterDepthCm} cm Depth
                      </span>
                    )}
                  </div>

                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    {report.description}
                  </p>

                  <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                    <span>{report.reportedBy}</span>
                    <span>•</span>
                    <span>{report.timestamp}</span>
                  </div>
                </div>
              </div>

              {/* Upvote Button */}
              <button
                type="button"
                onClick={() => upvoteReport(report.id)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 font-mono text-[10px] transition-colors shrink-0"
                title="Upvote ground report"
              >
                <ThumbsUp className="w-3 h-3" />
                <span>{report.upvotes}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
