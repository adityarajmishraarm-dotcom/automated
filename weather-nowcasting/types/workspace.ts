/**
 * SIH26077: Hyper-Local Weather Nowcasting Workspace (Mini-Browser OS)
 * Strict TypeScript Domain Interfaces & Types
 * 
 * Zero 'any' types. Fiercely minimalist and comprehensive.
 */

export type ThreatSeverity = 'NORMAL' | 'ADVISORY' | 'WATCH' | 'WARNING' | 'EMERGENCY';

export type IncidentCategory = 
  | 'WATERLOGGING' 
  | 'HAIL' 
  | 'FALLEN_TREE' 
  | 'FLASH_FLOOD' 
  | 'MUDSLIDE';

export type GeoCoordinate = [latitude: number, longitude: number];

export type TabMode = 'launchpad' | 'dashboard';

/**
 * Isolated Tab Model representing an in-app browser location workspace
 * Supports both Google-style minimalist launchpad and active nowcast dashboard
 */
export interface WorkspaceTab {
  id: string;
  title: string;
  mode: TabMode;
  locationName: string;
  pinCode?: string;
  coordinates: GeoCoordinate;
  zoomLevel: number;
  isBookmarked?: boolean;
  localMetrics: {
    currentPrecipMmHr: number;
    peakExpectedMmHr: number;
    groundSaturationPercent: number;
    capeIndexJkg: number;
  };
  createdAt: string;
  lastActiveAt: string;
}

/**
 * Bookmarked Favorite Locations (Pinned on Bookmarks Bar)
 */
export interface Bookmark {
  id: string;
  title: string;
  locationName: string;
  coordinates: GeoCoordinate;
  createdAt: string;
}

/**
 * Recent Search History Entry
 */
export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: string;
}

/**
 * Launchpad Quick Link Shortcut
 */
export interface LaunchpadShortcut {
  id: string;
  title: string;
  url: string;
  icon?: string;
}

/**
 * 5-minute granular rainfall projection across a 120-minute nowcasting horizon
 */
export interface RainfallDataPoint {
  minuteOffset: number; // 0, 5, 10, ... 120
  timestamp: string;
  rainfallIntensityMmHr: number; // Rain rate in mm/hour
  radarReflectivityDbz: number; // Doppler reflectivity in dBZ
  confidenceScore: number; // Predictive confidence (1.0 down to 0.65)
  accumulatedRainMm: number; // Cumulative precipitation
}

/**
 * Spatial Polygon bounding high-risk geographical sectors
 */
export interface ThreatPolygon {
  id: string;
  zoneName: string;
  neighborhood: string;
  severity: ThreatSeverity;
  coordinates: GeoCoordinate[]; // Boundary coordinates for Leaflet Polygon
  centroid: GeoCoordinate;
  estimatedAffectedPopulation: number;
  dominantHazard: string;
  peakRainfallExpectedMmHr: number;
  colorHex: string;
}

/**
 * Text-based crowdsourced ground truth field report
 */
export interface GroundReport {
  id: string;
  incidentType: IncidentCategory;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  coordinates: GeoCoordinate;
  locationName: string;
  timestamp: string;
  description: string;
  waterDepthCm?: number;
  reportedBy: string;
  upvotes: number;
}

/**
 * Minimalist AI Chat Message for Zen Copilot
 */
export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

/**
 * Unified Meteorological Telemetry & Nowcast Package
 */
export interface WeatherData {
  location: {
    stationId: string;
    city: string;
    state: string;
    subDistrict: string;
    lat: number;
    lng: number;
  };
  current: {
    recordedAt: string;
    temperatureCelsius: number;
    relativeHumidityPercent: number;
    windSpeedKmh: number;
    windDirectionDegrees: number;
    currentPrecipRateMmHr: number;
    barometricPressureHpa: number;
    capeIndexJkg: number;
  };
  nowcast120Min: RainfallDataPoint[];
  activeThreatZones: ThreatPolygon[];
}

export type UserReport = GroundReport;
export type IncidentType = IncidentCategory;

