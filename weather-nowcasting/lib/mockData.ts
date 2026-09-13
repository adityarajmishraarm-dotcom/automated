import { 
  WorkspaceTab, 
  Bookmark, 
  SearchHistoryItem, 
  LaunchpadShortcut, 
  RainfallDataPoint, 
  ThreatPolygon, 
  GroundReport, 
  ChatMessage, 
  WeatherData 
} from '../types/workspace';

/**
 * Pre-seeded Workspace Tabs
 * Note: 'tab-0' is the Google-style minimalist launchpad search tab
 */
export const INITIAL_WORKSPACE_TABS: WorkspaceTab[] = [
  {
    id: 'tab-0',
    title: 'New Tab',
    mode: 'launchpad',
    locationName: '',
    coordinates: [19.0760, 72.8777],
    zoomLevel: 14,
    isBookmarked: false,
    localMetrics: {
      currentPrecipMmHr: 0,
      peakExpectedMmHr: 0,
      groundSaturationPercent: 0,
      capeIndexJkg: 0,
    },
    createdAt: '2026-09-13T06:00:00.000Z',
    lastActiveAt: '2026-09-13T07:00:00.000Z',
  },
  {
    id: 'tab-kurla-mithi',
    title: 'Kurla Basin',
    mode: 'dashboard',
    locationName: 'Kurla West, Mithi River Catchment, Mumbai',
    coordinates: [19.0688, 72.8797],
    zoomLevel: 14,
    isBookmarked: true,
    localMetrics: {
      currentPrecipMmHr: 48.2,
      peakExpectedMmHr: 88.4,
      groundSaturationPercent: 96.2,
      capeIndexJkg: 2840,
    },
    createdAt: '2026-09-13T06:00:00.000Z',
    lastActiveAt: '2026-09-13T06:45:00.000Z',
  },
  {
    id: 'tab-dadar-hindmata',
    title: 'Dadar Hindmata',
    mode: 'dashboard',
    locationName: 'Hindmata Cinema Lowbed, Dadar, Mumbai',
    coordinates: [19.0178, 72.8478],
    zoomLevel: 15,
    isBookmarked: true,
    localMetrics: {
      currentPrecipMmHr: 34.0,
      peakExpectedMmHr: 62.5,
      groundSaturationPercent: 89.4,
      capeIndexJkg: 2410,
    },
    createdAt: '2026-09-13T06:10:00.000Z',
    lastActiveAt: '2026-09-13T06:40:00.000Z',
  }
];

/**
 * Pre-seeded Bookmarks Bar Items
 */
export const INITIAL_BOOKMARKS: Bookmark[] = [
  {
    id: 'bm-1',
    title: 'Kurla Mithi Basin',
    locationName: 'Kurla West, Mithi River Catchment, Mumbai',
    coordinates: [19.0688, 72.8797],
    createdAt: '2026-09-13T06:00:00.000Z',
  },
  {
    id: 'bm-2',
    title: 'Dadar Hindmata',
    locationName: 'Hindmata Cinema Lowbed, Dadar, Mumbai',
    coordinates: [19.0178, 72.8478],
    createdAt: '2026-09-13T06:10:00.000Z',
  },
  {
    id: 'bm-3',
    title: 'Chembur Mahul Creek',
    locationName: 'Chembur Mahul Creek Basin, Mumbai',
    coordinates: [19.0622, 72.8984],
    createdAt: '2026-09-13T06:15:00.000Z',
  },
  {
    id: 'bm-4',
    title: 'Andheri Subway',
    locationName: 'Andheri Subway Western Corridor, Mumbai',
    coordinates: [19.1197, 72.8464],
    createdAt: '2026-09-13T06:20:00.000Z',
  }
];

/**
 * Pre-seeded Search History Items
 */
export const INITIAL_SEARCH_HISTORY: SearchHistoryItem[] = [
  { id: 'hist-1', query: 'Kurla West, Mithi River', timestamp: '10m ago' },
  { id: 'hist-2', query: 'Hindmata Cinema, Dadar', timestamp: '25m ago' },
  { id: 'hist-3', query: '19.0688, 72.8797', timestamp: '45m ago' },
  { id: 'hist-4', query: 'Andheri Subway Lowbed', timestamp: '1h ago' },
  { id: 'hist-5', query: 'Chembur Naka Basin', timestamp: '2h ago' },
];

/**
 * Pre-seeded Launchpad Quick Shortcuts
 */
export const INITIAL_SHORTCUTS: LaunchpadShortcut[] = [
  { id: 'sc-1', title: 'NDRF Portal', url: 'https://ndrf.gov.in', icon: 'Shield' },
  { id: 'sc-2', title: 'Live Doppler Radar', url: 'https://mausam.imd.gov.in', icon: 'Radio' },
  { id: 'sc-3', title: 'IMD Alert Bulletins', url: 'https://internal.imd.gov.in', icon: 'AlertTriangle' },
  { id: 'sc-4', title: 'MCGM Disaster Cell', url: 'https://dm.mcgm.gov.in', icon: 'Waves' },
  { id: 'sc-5', title: 'SAT24 Satellite IR', url: 'https://sat24.com', icon: 'Eye' },
];

/**
 * 120-Minute Granular Rainfall Nowcasting Curve (5-minute resolution)
 * Simulates a severe convective cell approaching and peaking at minute 40
 */
export const MOCK_RAINFALL_CURVE_120MIN: RainfallDataPoint[] = [
  { minuteOffset: 0,   timestamp: '12:00', rainfallIntensityMmHr: 18.5, radarReflectivityDbz: 36.2, confidenceScore: 1.00, accumulatedRainMm: 0.0 },
  { minuteOffset: 5,   timestamp: '12:05', rainfallIntensityMmHr: 22.0, radarReflectivityDbz: 38.4, confidenceScore: 0.98, accumulatedRainMm: 1.7 },
  { minuteOffset: 10,  timestamp: '12:10', rainfallIntensityMmHr: 27.5, radarReflectivityDbz: 41.0, confidenceScore: 0.97, accumulatedRainMm: 3.8 },
  { minuteOffset: 15,  timestamp: '12:15', rainfallIntensityMmHr: 35.8, radarReflectivityDbz: 44.5, confidenceScore: 0.95, accumulatedRainMm: 6.5 },
  { minuteOffset: 20,  timestamp: '12:20', rainfallIntensityMmHr: 48.2, radarReflectivityDbz: 48.0, confidenceScore: 0.94, accumulatedRainMm: 10.1 },
  { minuteOffset: 25,  timestamp: '12:25', rainfallIntensityMmHr: 61.4, radarReflectivityDbz: 51.8, confidenceScore: 0.92, accumulatedRainMm: 14.7 },
  { minuteOffset: 30,  timestamp: '12:30', rainfallIntensityMmHr: 74.0, radarReflectivityDbz: 54.2, confidenceScore: 0.90, accumulatedRainMm: 20.3 },
  { minuteOffset: 35,  timestamp: '12:35', rainfallIntensityMmHr: 83.6, radarReflectivityDbz: 57.0, confidenceScore: 0.88, accumulatedRainMm: 26.9 },
  { minuteOffset: 40,  timestamp: '12:40', rainfallIntensityMmHr: 88.4, radarReflectivityDbz: 59.5, confidenceScore: 0.86, accumulatedRainMm: 34.0 }, // Peak Burst
  { minuteOffset: 45,  timestamp: '12:45', rainfallIntensityMmHr: 82.1, radarReflectivityDbz: 56.8, confidenceScore: 0.84, accumulatedRainMm: 40.7 },
  { minuteOffset: 50,  timestamp: '12:50', rainfallIntensityMmHr: 69.5, radarReflectivityDbz: 53.4, confidenceScore: 0.82, accumulatedRainMm: 46.2 },
  { minuteOffset: 55,  timestamp: '12:55', rainfallIntensityMmHr: 54.0, radarReflectivityDbz: 49.6, confidenceScore: 0.80, accumulatedRainMm: 50.5 },
  { minuteOffset: 60,  timestamp: '13:00', rainfallIntensityMmHr: 42.8, radarReflectivityDbz: 46.2, confidenceScore: 0.78, accumulatedRainMm: 53.9 },
  { minuteOffset: 65,  timestamp: '13:05', rainfallIntensityMmHr: 33.2, radarReflectivityDbz: 43.0, confidenceScore: 0.77, accumulatedRainMm: 56.5 },
  { minuteOffset: 70,  timestamp: '13:10', rainfallIntensityMmHr: 26.4, radarReflectivityDbz: 40.5, confidenceScore: 0.75, accumulatedRainMm: 58.6 },
  { minuteOffset: 75,  timestamp: '13:15', rainfallIntensityMmHr: 21.0, radarReflectivityDbz: 38.0, confidenceScore: 0.74, accumulatedRainMm: 60.3 },
  { minuteOffset: 80,  timestamp: '13:20', rainfallIntensityMmHr: 16.5, radarReflectivityDbz: 35.8, confidenceScore: 0.72, accumulatedRainMm: 61.6 },
  { minuteOffset: 85,  timestamp: '13:25', rainfallIntensityMmHr: 13.2, radarReflectivityDbz: 33.5, confidenceScore: 0.71, accumulatedRainMm: 62.6 },
  { minuteOffset: 90,  timestamp: '13:30', rainfallIntensityMmHr: 10.8, radarReflectivityDbz: 31.2, confidenceScore: 0.70, accumulatedRainMm: 63.5 },
  { minuteOffset: 95,  timestamp: '13:35', rainfallIntensityMmHr: 8.5,  radarReflectivityDbz: 29.0, confidenceScore: 0.68, accumulatedRainMm: 64.1 },
  { minuteOffset: 100, timestamp: '13:40', rainfallIntensityMmHr: 6.8,  radarReflectivityDbz: 27.4, confidenceScore: 0.67, accumulatedRainMm: 64.6 },
  { minuteOffset: 105, timestamp: '13:45', rainfallIntensityMmHr: 5.2,  radarReflectivityDbz: 25.1, confidenceScore: 0.66, accumulatedRainMm: 65.0 },
  { minuteOffset: 110, timestamp: '13:50', rainfallIntensityMmHr: 4.0,  radarReflectivityDbz: 23.5, confidenceScore: 0.65, accumulatedRainMm: 65.3 },
  { minuteOffset: 115, timestamp: '13:55', rainfallIntensityMmHr: 3.2,  radarReflectivityDbz: 22.0, confidenceScore: 0.64, accumulatedRainMm: 65.5 },
  { minuteOffset: 120, timestamp: '14:00', rainfallIntensityMmHr: 2.5,  radarReflectivityDbz: 20.5, confidenceScore: 0.63, accumulatedRainMm: 65.7 },
];

/**
 * Dynamic Threat Polygons for Mumbai High-Risk Urban Catchments
 */
export const MOCK_THREAT_POLYGONS: ThreatPolygon[] = [
  {
    id: 'poly-kurla-mithi',
    zoneName: 'Sector 4: Mithi River Catchment',
    neighborhood: 'Kurla West & Kranti Nagar',
    severity: 'EMERGENCY',
    centroid: [19.0688, 72.8797],
    coordinates: [
      [19.0780, 72.8710],
      [19.0825, 72.8845],
      [19.0712, 72.8930],
      [19.0595, 72.8860],
      [19.0630, 72.8730]
    ],
    estimatedAffectedPopulation: 142000,
    dominantHazard: 'Flash Flood Overbank Inundation',
    peakRainfallExpectedMmHr: 88.4,
    colorHex: '#ef4444' // Red
  },
  {
    id: 'poly-dadar-hindmata',
    zoneName: 'Sector 2: Hindmata Low-Bed Basin',
    neighborhood: 'Dadar East, Parel & TT Circle',
    severity: 'WARNING',
    centroid: [19.0178, 72.8478],
    coordinates: [
      [19.0235, 72.8410],
      [19.0260, 72.8525],
      [19.0145, 72.8560],
      [19.0090, 72.8450],
      [19.0160, 72.8395]
    ],
    estimatedAffectedPopulation: 86500,
    dominantHazard: 'Storm Drain Backflow & Waterlogging',
    peakRainfallExpectedMmHr: 62.5,
    colorHex: '#f59e0b' // Amber
  }
];

/**
 * Crowdsourced Ground Reports
 */
export const MOCK_GROUND_REPORTS: GroundReport[] = [
  {
    id: 'rep-001',
    incidentType: 'FLASH_FLOOD',
    severity: 'CRITICAL',
    coordinates: [19.0682, 72.8804],
    locationName: 'LBS Marg, Kurla West',
    timestamp: '3m ago',
    description: 'Mithi river channel cresting retaining wall. Road impassable for light vehicles.',
    waterDepthCm: 55,
    reportedBy: 'K. Sharma',
    upvotes: 28,
  },
  {
    id: 'rep-002',
    incidentType: 'WATERLOGGING',
    severity: 'HIGH',
    coordinates: [19.0185, 72.8482],
    locationName: 'Hindmata Cinema Junction',
    timestamp: '11m ago',
    description: 'Underpass flooded to curb level. BMC submersible pumps running at full throttle.',
    waterDepthCm: 40,
    reportedBy: 'A. Merchant',
    upvotes: 19,
  },
  {
    id: 'rep-003',
    incidentType: 'FALLEN_TREE',
    severity: 'MEDIUM',
    coordinates: [19.1197, 72.8464],
    locationName: 'Andheri Subway Western Entry',
    timestamp: '24m ago',
    description: 'Gulmohar tree collapsed on northbound carriageway, blocking 2 lanes.',
    reportedBy: 'V. Rao',
    upvotes: 14,
  },
  {
    id: 'rep-004',
    incidentType: 'WATERLOGGING',
    severity: 'MEDIUM',
    coordinates: [19.0390, 72.8619],
    locationName: 'Sion Circle Flyover Slipway',
    timestamp: '38m ago',
    description: 'Water pooling across left lane. Traffic slowing to 10 km/h.',
    waterDepthCm: 22,
    reportedBy: 'R. Kadam',
    upvotes: 9,
  }
];

/**
 * Minimalist Zen Copilot Chat History
 */
export const MOCK_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-sys-init',
    sender: 'system',
    content: 'Nowcast Sentinel initialized. Monitoring active Doppler radar feed and hydrological models.',
    timestamp: '12:00',
  },
  {
    id: 'msg-user-1',
    sender: 'user',
    content: 'What is the immediate flash flood risk for Kurla over the next 45 minutes?',
    timestamp: '12:01',
  },
  {
    id: 'msg-assistant-1',
    sender: 'assistant',
    content: 'Severe convective burst approaching Kurla Basin. Rain rate will accelerate from 18.5 mm/hr to 88.4 mm/hr within 40 minutes. Ground saturation is at 96.2%, eliminating infiltration capacity. Overbank inundation expected at LBS Marg.',
    timestamp: '12:01',
  }
];

/**
 * Complete Meteorological Weather Telemetry
 */
export const MOCK_WEATHER_DATA: WeatherData = {
  location: {
    stationId: 'VABB-MUM-RADAR-01',
    city: 'Mumbai',
    state: 'Maharashtra',
    subDistrict: 'Kurla Catchment Zone',
    lat: 19.0688,
    lng: 72.8797,
  },
  current: {
    recordedAt: '2026-09-13T06:45:00.000Z',
    temperatureCelsius: 27.8,
    relativeHumidityPercent: 94,
    windSpeedKmh: 38,
    windDirectionDegrees: 245,
    currentPrecipRateMmHr: 48.2,
    barometricPressureHpa: 998.4,
    capeIndexJkg: 2840,
  },
  nowcast120Min: MOCK_RAINFALL_CURVE_120MIN,
  activeThreatZones: MOCK_THREAT_POLYGONS,
};
