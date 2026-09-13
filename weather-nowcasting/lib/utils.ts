import { ThreatSeverity } from '../types/weather';

export type ClassValue = 
  | string 
  | number 
  | boolean 
  | undefined 
  | null 
  | { [key: string]: boolean | undefined | null } 
  | ClassValue[];

/**
 * Lightweight, robust utility for conditionally merging class names
 */
export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  const parse = (item: ClassValue) => {
    if (!item) return;
    if (typeof item === 'string' || typeof item === 'number') {
      classes.push(String(item));
    } else if (Array.isArray(item)) {
      item.forEach(parse);
    } else if (typeof item === 'object') {
      for (const [key, condition] of Object.entries(item)) {
        if (condition) classes.push(key);
      }
    }
  };

  inputs.forEach(parse);
  return classes.join(' ');
}

export function getSeverityBadgeStyle(severity: ThreatSeverity): string {
  switch (severity) {
    case 'EMERGENCY':
      return 'bg-red-500/20 text-red-400 border-red-500/50 shadow-red-500/20';
    case 'WARNING':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-amber-500/20';
    case 'WATCH':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 shadow-yellow-500/20';
    case 'ADVISORY':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-blue-500/10';
    case 'NORMAL':
    default:
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  }
}

export function getRainCategory(mmHr: number): { label: string; color: string } {
  if (mmHr >= 80) return { label: 'Extreme Cloudburst', color: '#ef4444' };
  if (mmHr >= 50) return { label: 'Very Heavy Torrential', color: '#f97316' };
  if (mmHr >= 20) return { label: 'Heavy Downpour', color: '#eab308' };
  if (mmHr >= 7.5) return { label: 'Moderate Rain', color: '#3b82f6' };
  if (mmHr > 0.1) return { label: 'Light Showers', color: '#06b6d4' };
  return { label: 'Dry / Trace', color: '#10b981' };
}
