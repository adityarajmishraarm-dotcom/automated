/**
 * SIH26077: Hyper-Local Severe Weather Nowcasting and Rainfall Warning System
 * Strict TypeScript Domain Interfaces & Types
 */

export type ThreatSeverity = 'NORMAL' | 'ADVISORY' | 'WATCH' | 'WARNING' | 'EMERGENCY';

export type IncidentType = 
  | 'WATERLOGGING' 
  | 'HAIL' 
  | 'FALLEN_TREE' 
  | 'FLASH_FLOOD' 
  | 'MUDSLIDE';

export type ReportStatus = 'REPORTED' | 'DISPATCHED' | 'RESOLVED';

export type GeoCoordinate = [latitude: number, longitude: number];

/**
 * 5-minute granular rainfall projection across a 120-minute nowcasting horizon
 */
export interface RainfallDataPoint {
  minuteOffset: number; // 0, 5, 10, ... 120
  timestamp: string; // ISO 8601 string
  rainfallIntensityMmHr: number; // Rain rate in mm/hour (0 to 120+)
  radarReflectivityDbz: number; // Doppler Radar Reflectivity in dBZ (0 to 75)
  confidenceScore: number; // Predictive confidence decay: 1.0 (now) down to 0.65 (at +120m)
  accumulatedRainMm: number; // Total cumulative rainfall
  anomalyDetected: boolean; // True if sudden convective burst exceeds threshold
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
  validFrom: string;
  validUntil: string;
  dominantHazard: string;
  peakRainfallExpectedMmHr: number;
  evacuationRecommended: boolean;
  colorHex: string;
}

export type AlertZone = ThreatPolygon;

/**
 * Real-time Crowdsourced Community Field Report
 */
export interface UserReport {
  id: string;
  incidentType: IncidentType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  coordinates: GeoCoordinate;
  locationName: string;
  timestamp: string;
  description: string;
  waterDepthCm?: number;
  reportedBy: string;
  verifiedByAuthority: boolean;
  upvotes: number;
  status: ReportStatus;
  photoUrl?: string;
}

/**
 * High-Resolution Meteorological Surface Telemetry & Nowcast Package
 */
export interface WeatherData {
  location: {
    stationId: string;
    city: string;
    state: string;
    subDistrict: string;
    lat: number;
    lng: number;
    elevationMeters: number;
  };
  current: {
    recordedAt: string;
    temperatureCelsius: number;
    dewPointCelsius: number;
    relativeHumidityPercent: number;
    windSpeedKmh: number;
    windGustKmh: number;
    windDirectionDegrees: number;
    currentPrecipRateMmHr: number;
    cloudCoverPercent: number;
    barometricPressureHpa: number;
    capeIndexJkg: number; // Convective Available Potential Energy (>2500 indicates severe thunderstorm potential)
    airQualityIndex: number;
  };
  nowcast120Min: RainfallDataPoint[];
  activeThreatZones: ThreatPolygon[];
}

/**
 * Authority Emergency SMS Warning Dispatch Payload
 */
export interface SmsAlertPayload {
  zoneId: string;
  zoneName: string;
  severity: ThreatSeverity;
  headline: string;
  message: string;
  targetNeighborhood: string;
  targetRecipientCount: number;
  channels: ('SMS' | 'CELL_BROADCAST' | 'CAP_ALERT')[];
}

/**
 * Audit Log for SMS Dispatch Events
 */
export interface SmsDispatchRecord {
  dispatchId: string;
  timestamp: string;
  zoneName: string;
  severity: ThreatSeverity;
  headline: string;
  message: string;
  status: 'SUCCESS' | 'QUEUED' | 'FAILED';
  recipientsNotified: number;
  gatewayResponseTimeMs: number;
  operatorId: string;
}
