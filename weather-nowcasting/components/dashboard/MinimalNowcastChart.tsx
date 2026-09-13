'use client';

import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ReferenceLine, 
  TooltipProps 
} from 'recharts';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { RainfallDataPoint } from '../../types/workspace';
import { CloudRain, AlertTriangle } from 'lucide-react';

interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean;
  payload?: Array<{
    payload: RainfallDataPoint;
  }>;
}

const MinimalTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs font-sans text-left">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1 mb-1.5 font-mono text-[11px]">
        <span className="text-cyan-400 font-bold">+{d.minuteOffset} min</span>
        <span className="text-slate-400">{d.timestamp}</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400 text-[11px]">Rainfall Rate:</span>
          <span className="font-bold text-slate-100 font-mono">
            {d.rainfallIntensityMmHr.toFixed(1)} mm/hr
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400 text-[11px]">Doppler dBZ:</span>
          <span className="text-amber-400 font-mono">
            {d.radarReflectivityDbz.toFixed(1)} dBZ
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400 text-[11px]">Confidence:</span>
          <span className="text-cyan-300 font-mono">
            {(d.confidenceScore * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export const MinimalNowcastChart: React.FC = () => {
  const { weatherData, tabs, activeTabId } = useWorkspaceStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);

  const data = weatherData.nowcast120Min;
  const peakPoint = data.reduce((prev, curr) => 
    curr.rainfallIntensityMmHr > prev.rainfallIntensityMmHr ? curr : prev, data[0]
  );

  return (
    <div className="w-full h-full flex flex-col justify-between p-5 bg-slate-900/50 backdrop-blur-md rounded-2xl shadow-sm text-left">
      {/* Chart Header */}
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <CloudRain className="w-4 h-4 text-cyan-400" />
          <h3 className="font-sans font-bold text-xs text-slate-200 uppercase tracking-wide">
            120-Minute Predictive Rainfall Curve
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-mono text-[10px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
            <span>PEAK: {peakPoint.rainfallIntensityMmHr.toFixed(1)} mm/hr (+{peakPoint.minuteOffset}m)</span>
          </div>
        </div>
      </div>

      {/* Zero-Grid-Lines Recharts Line / Area Chart */}
      <div className="w-full flex-1 min-h-[190px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="minimalRainfallGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                <stop offset="65%" stopColor="#22d3ee" stopOpacity={0.08} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Zero Grid Lines per specifications */}

            <XAxis
              dataKey="minuteOffset"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
              tickFormatter={(m) => `+${m}m`}
              interval={4}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
              domain={[0, 'dataMax + 15']}
            />
            <Tooltip content={<MinimalTooltip />} />

            {/* Cloudburst Threshold Line (>80 mm/hr) */}
            <ReferenceLine
              y={80}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              label={{
                value: 'Cloudburst (80 mm/h)',
                fill: '#ef4444',
                fontSize: 9,
                position: 'insideTopRight',
              }}
            />

            {/* Heavy Rain Threshold Line (>20 mm/hr) */}
            <ReferenceLine
              y={20}
              stroke="#eab308"
              strokeDasharray="4 4"
              strokeOpacity={0.4}
              label={{
                value: 'Heavy Rain (20 mm/h)',
                fill: '#eab308',
                fontSize: 9,
                position: 'insideTopRight',
              }}
            />

            <Area
              type="monotone"
              dataKey="rainfallIntensityMmHr"
              stroke="#22d3ee"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#minimalRainfallGradient)"
              activeDot={{ r: 4, fill: '#22d3ee', stroke: '#0f172a', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Subtle Legend / Telemetry Subtext */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/40 text-[10px] text-slate-500 font-mono">
        <span>Nowcasting Model: IMD WRF-Doppler Ensemble</span>
        <span>Confidence Decay: 100% → 63% at t+120m</span>
      </div>
    </div>
  );
};
