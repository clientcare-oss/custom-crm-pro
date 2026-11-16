/**
 * Waypoint Places — Family Relocation Intelligence Platform
 * Shared Domain Model, Preliminary Scoring Engine, Georgia Geographic Dataset,
 * and Cloudflare D1 / R2 Storage Suitability Evaluator.
 *
 * STRICT SCORING & CLAIM INTEGRITY GUARDRAILS:
 * 1. Public assets and snapshots in this module are 100% isolated from protected
 *    CRM client records, student IEP files, and Do Not Serve tables.
 * 2. Unverified communities default to "Pending Verified Data".
 * 3. Any demonstration numbers used to test the scoring engine are explicitly
 *    labeled as "Fictional Calibration Data" and never presented as established
 *    facts about school quality, specialized education programs, or safety.
 */

export type FamilyPriorityKey =
  | "academics"
  | "specializedPrograms"
  | "safetyWellBeing"
  | "familyLifestyle"
  | "affordability"
  | "commute";

export type PlacesCategoryTab =
  | "communities"
  | "schools"
  | "specialized_residential"
  | "housing"
  | "family_life";

export type MapLayerKey =
  | "school_districts"
  | "community_scores"
  | "school_locations"
  | "specialized_residential"
  | "therapy_providers"
  | "neighborhoods"
  | "parks_recreation";

export type DataVerificationStatus =
  | "awaiting_verified_dataset"
  | "fictional_calibration"
  | "verified_public_source";

export interface PillarMetrics {
  /** Overall Community Quality pillar (0-100 fictional calibration scale, or null if unseeded) */
  communityQuality: number | null;
  /** School Performance / Academics pillar (0-100 scale) */
  academics: number | null;
  /** Specialized Programs & IEP/504 Infrastructure pillar (0-100 scale) */
  specializedPrograms: number | null;
  /** Safety & Well-Being pillar (0-100 scale) */
  safetyWellBeing: number | null;
  /** Family Lifestyle & Community Amenities pillar (0-100 scale) */
  familyLifestyle: number | null;
  /** Housing & Cost-of-Living Affordability pillar (0-100 scale) */
  affordability: number | null;
  /** Regional Commute & Accessibility pillar (0-100 scale) */
  commute: number | null;
}

export type PlacesVerificationTier =
  | "Verified"
  | "Parent Reported"
  | "Unverified"
  | "Outdated"
  | "Unknown";

export interface PlaceSchoolRecord {
  id: string;
  name: string;
  districtId: string;
  countyFips: string;
  level: "Elementary" | "Middle" | "High" | "Specialized / Charter";
  coordinates: [number, number]; // [lng, lat]
  specializedProgramsNote: string;
  dataStatus: DataVerificationStatus;
  /** Phase 2 NCES CCD Identifiers & Attributes */
  ncesSchoolId?: string; // 12-digit NCESSCH (e.g., "130222003719")
  ncesLeaId?: string; // 7-digit NCES LEAID (e.g., "1302220")
  gradeSpan?: string; // e.g., "09-12", "PK-05"
  enrollment?: number | null;
  fteTeachers?: number | null;
  pupilTeacherRatio?: number | null;
  titleIStatus?: string;
  charterOrMagnet?: string;
  streetAddress?: string;
  city?: string;
  zip?: string;
  surveyPeriod?: string; // e.g. "NCES CCD 2024-2025"
  verificationTier?: PlacesVerificationTier;
  /** Exact NCES CCD SCHOOL_LEVEL ("Elementary" | "Middle" | "High" | "Other" | "Secondary" | "Prekindergarten") */
  schoolLevelRaw?: string;
  /** Exact NCES CCD SCHOOL_TYPE_TEXT ("Regular School" | "Special Education School" | "Alternative Education School") */
  schoolTypeText?: string;
}

export interface PlaceSchoolDistrictRecord {
  id: string;
  ncesId: string;
  name: string;
  countyFips: string;
  countyName: string;
  coordinates: [number, number]; // [lng, lat]
  approximateEnrollment: string;
  specializedSupportSummary: string;
  dataStatus: DataVerificationStatus;
  /** Phase 2 NCES CCD District Attributes */
  gradeSpan?: string; // e.g., "PK-12"
  totalSchoolsCount?: number | null;
  totalStudentsCount?: number | null;
  pupilTeacherRatio?: number | null;
  surveyPeriod?: string; // e.g. "NCES CCD 2022-2023"
  verificationTier?: PlacesVerificationTier;
}

export interface PlaceAmenityMarker {
  id: string;
  countyFips: string;
  category: "neighborhoods" | "parks_recreation" | "housing" | "family_life";
  name: string;
  subtitle: string;
  coordinates: [number, number]; // [lng, lat]
}

export interface PlaceAcsDemographicsSummary {
  surveyPeriod: string; // e.g. "2018-2022 ACS 5-Year"
  populationEstimate: number;
  populationMoe: number;
  medianHouseholdIncome: number;
  medianHouseholdIncomeMoe: number;
  medianHomeValue: number;
  medianHomeValueMoe: number;
  medianGrossRent: number;
  medianGrossRentMoe: number;
  meanCommuteMinutes: number;
  meanCommuteMinutesMoe: number;
  priceToIncomeRatio: number;
  rentToIncomePct: number;
  verificationTier: PlacesVerificationTier;
  sourceCitation: string;
  lastUpdated: string;
}

export interface PlaceEvidenceCompletenessSummary {
  verifiedSourcesCount: number;
  totalPlannedSources: number;
  ratioText: string; // e.g. "2/6 Verified Sources"
  completenessPct: number;
  connectedSourceNames: string[];
  pendingSourceNames: string[];
}

export interface PlaceCommunityRecord {
  id: string;
  fips: string; // 5-digit county FIPS (e.g. "13117" for Forsyth County, GA)
  name: string; // e.g. "Forsyth County, GA"
  shortName: string; // e.g. "Forsyth County"
  stateCode: string; // e.g. "GA" (supports all 50 US states)
  region: string; // e.g. "North Metro Atlanta"
  coordinates: [number, number]; // [lng, lat]
  zoomLevel: number;
  heroImageStyle: "tree_lined_avenue" | "historic_square" | "lakeside_park" | "piedmont_ridge";
  tagline: string;
  /**
   * Verified geographic facts & transparent data-status notes.
   * Never contains unverified claims about school quality, IEP programs, or crime.
   */
  keyInsights: string[];
  dataStatus: DataVerificationStatus;
  dataSourcesPending: string[];
  /**
   * Fictional calibration numbers used ONLY when the user explicitly toggles
   * "Fictional Calibration Demo" to test the priority weighting formula.
   */
  calibrationPillars: PillarMetrics;
  /**
   * Verified 0-100 normalized indicator scores computed strictly from imported
   * official datasets (US Census ACS + NCES CCD). Unimported pillars remain `null`
   * (never replaced with 0 or fictional numbers).
   */
  verifiedPillars?: PillarMetrics;
  /**
   * Real imported U.S. Census Bureau ACS 5-Year estimates and Margins of Error (MOE).
   */
  acsDemographics?: PlaceAcsDemographicsSummary | null;
  /**
   * Real-time evidence completeness tracking across the 6 relocation pillars.
   */
  evidenceCompleteness?: PlaceEvidenceCompletenessSummary;
  publishedToPublic: boolean;
  updatedAt: string;
}

/**
 * Three Map Display Modes for Waypoint Places:
 * 1. "waypoint_map": Custom dark navy (#000820) vector basemap (PMTiles + 50-state/county vector geometry).
 * 2. "satellite": Licensed aerial/satellite imagery.
 * 3. "hybrid": Licensed aerial/satellite imagery + road corridors, geographic boundaries, labels, schools & Waypoint overlays.
 */
export type PlacesMapDisplayMode = "waypoint_map" | "satellite" | "hybrid";

export type SatelliteImageryProviderId =
  | "unconfigured"
  | "usgs_naip_public_domain"
  | "maptiler_satellite"
  | "esri_world_imagery"
  | "mapbox_satellite";

export interface SatelliteImageryConfig {
  providerId: SatelliteImageryProviderId;
  configured: boolean;
  tileUrlTemplate: string | null;
  hybridTileUrlTemplate?: string | null;
  attributionText: string | null;
  /** Maximum interactive map zoom allowed in MapLibre / SVG projection (up to z20). */
  maxZoom: number;
  /** Highest native tile zoom level served by the imagery tile cache before over-zooming occurs. */
  maxNativeZoom: number;
}

export const USGS_NAIP_SATELLITE_CONFIG: SatelliteImageryConfig = {
  providerId: "usgs_naip_public_domain",
  configured: true,
  tileUrlTemplate:
    "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}",
  hybridTileUrlTemplate:
    "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}",
  attributionText:
    "Imagery: USDA, USGS The National Map: Orthoimagery (Public Domain) · Boundaries: U.S. Census TIGER/Line",
  maxZoom: 20,
  maxNativeZoom: 16,
};

export const UNCONFIGURED_SATELLITE_CONFIG: SatelliteImageryConfig = {
  providerId: "unconfigured",
  configured: false,
  tileUrlTemplate: null,
  hybridTileUrlTemplate: null,
  attributionText: null,
  maxZoom: 20,
  maxNativeZoom: 18,
};

export const DEFAULT_SATELLITE_IMAGERY_CONFIG: SatelliteImageryConfig =
  USGS_NAIP_SATELLITE_CONFIG;

export interface SatelliteProviderComparisonItem {
  id: Exclude<SatelliteImageryProviderId, "unconfigured">;
  name: string;
  badge: string;
  freeAllowance: string;
  paidPricing: string;
  coverage: string;
  maplibreCompatibility: string;
  licensingAndRedistributionRule: string;
  requiresApiKey: boolean;
  tileTemplatePreview: string;
  attribution: string;
}

export const SATELLITE_PROVIDER_OPTIONS: SatelliteProviderComparisonItem[] = [
  {
    id: "usgs_naip_public_domain",
    name: "USGS The National Map + USDA NAIP Orthoimagery",
    badge: "Active Default · $0 Public Domain (Best-Effort No SLA)",
    freeAllowance:
      "100% Free (U.S. Federal Public Domain — 17 U.S.C. § 105, commercial & public use permitted, no API key)",
    paidPricing: "$0 / month (Government best-effort tile cache; no formal uptime SLA)",
    coverage:
      "CONUS & HI: 1m NAIP / 6in–1ft urban orthoimagery (z0–z16, 1:9,028 scale; z17+ returns 404). AK: 10m SPOT imagery (viewing only; z9–z11 gap on ImageryOnly bridged via z8/z12).",
    maplibreCompatibility:
      "Direct XYZ/ArcGIS raster tile source in MapLibre GL JS (separate from R2 PMTiles vector basemap)",
    licensingAndRedistributionRule:
      "Public domain under U.S. law (AK 10m SPOT is licensed for live viewing only, not bulk download). Credit 'U.S. Geological Survey, National Geospatial Program / USDA NAIP'. Avoid abusive scraping.",
    requiresApiKey: false,
    tileTemplatePreview:
      "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Imagery: USDA, USGS The National Map: Orthoimagery · Boundaries: U.S. Census TIGER/Line",
  },
  {
    id: "esri_world_imagery",
    name: "Esri ArcGIS Location Platform (World Imagery)",
    badge: "Best Commercial Upgrade · 2M Free Tiles/Mo",
    freeAllowance:
      "2,000,000 basemap tiles / month FREE (commercial production permitted with ArcGIS Location Platform token)",
    paidPricing:
      "$0.15 per 1,000 tile requests beyond 2M/month (or 1,000 free sessions then $4.00 / 1,000 sessions)",
    coverage:
      "All 50 U.S. States (CONUS, AK, HI) & Global sub-meter Maxar / aerial imagery down to z19–z20 (rooftop & school-campus detail)",
    maplibreCompatibility:
      "Standard XYZ raster tiles in MapLibre GL JS with ArcGIS Location Platform API key parameter",
    licensingAndRedistributionRule:
      "Permits commercial revenue-generating apps with an active ArcGIS Location Platform account + mandatory Esri/Maxar attribution. Bulk scraping into R2 prohibited.",
    requiresApiKey: true,
    tileTemplatePreview:
      "https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token={ARCGIS_API_KEY}",
    attribution:
      "Powered by Esri · Source: Esri, Maxar, Earthstar Geographics, USDA FSA, USGS · Boundaries: U.S. Census",
  },
  {
    id: "maptiler_satellite",
    name: "MapTiler Cloud Satellite (satellite-v2)",
    badge: "MapLibre-Native Commercial Option",
    freeAllowance:
      "100,000 API requests / 5,000 sessions per month (STRICTLY NON-COMMERCIAL / prototyping only)",
    paidPricing:
      "$30 / month Flex Plan required for commercial use (includes 500,000 API requests / 25,000 sessions)",
    coverage: "Global + High-Resolution 50-State U.S. Aerial Photography (z0–z20)",
    maplibreCompatibility:
      "Built specifically for MapLibre GL JS (`api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg`)",
    licensingAndRedistributionRule:
      "Free tier prohibits commercial use and requires MapTiler logo. Flex Plan ($30/mo) permits commercial production; prohibits re-hosting tiles from your own R2 bucket.",
    requiresApiKey: true,
    tileTemplatePreview:
      "https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key={MAPTILER_API_KEY}",
    attribution: "© MapTiler © OpenStreetMap contributors · Boundaries: U.S. Census TIGER/Line",
  },
  {
    id: "mapbox_satellite",
    name: "Mapbox Satellite Raster Tiles (mapbox.satellite)",
    badge: "High-Res Commercial Alternative",
    freeAllowance:
      "200,000 Raster Tile API requests / month (or 50,000 web map loads / month in Mapbox GL JS)",
    paidPricing:
      "~$0.25–$0.50 per 1,000 raster tile requests (or $5.00 per 1,000 map loads above 50k)",
    coverage: "Global + 50-State High-Resolution @2x Retina Aerial & Maxar Imagery (z0–z20)",
    maplibreCompatibility:
      "Works via direct Raster Tiles API URL in MapLibre GL JS (billed per tile request rather than map load)",
    licensingAndRedistributionRule:
      "Requires Mapbox access token + mandatory Mapbox/Maxar attribution; prohibits offline caching or R2 redistribution.",
    requiresApiKey: true,
    tileTemplatePreview:
      "https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg90?access_token={MAPBOX_ACCESS_TOKEN}",
    attribution: "© Mapbox © Maxar · Boundaries: U.S. Census TIGER/Line",
  },
];

export interface UsStateMetadata {
  fips2: string;
  code: string;
  name: string;
  center: [number, number];
}

export const US_50_STATES_DIRECTORY: Record<string, UsStateMetadata> = {
  "01": { fips2: "01", code: "AL", name: "Alabama", center: [-86.79, 32.81] },
  "02": { fips2: "02", code: "AK", name: "Alaska", center: [-152.4, 61.37] },
  "04": { fips2: "04", code: "AZ", name: "Arizona", center: [-111.43, 33.73] },
  "05": { fips2: "05", code: "AR", name: "Arkansas", center: [-92.37, 34.97] },
  "06": { fips2: "06", code: "CA", name: "California", center: [-119.68, 36.12] },
  "08": { fips2: "08", code: "CO", name: "Colorado", center: [-105.31, 39.06] },
  "09": { fips2: "09", code: "CT", name: "Connecticut", center: [-72.76, 41.6] },
  "10": { fips2: "10", code: "DE", name: "Delaware", center: [-75.51, 39.32] },
  "11": { fips2: "11", code: "DC", name: "District of Columbia", center: [-77.03, 38.9] },
  "12": { fips2: "12", code: "FL", name: "Florida", center: [-81.69, 27.77] },
  "13": { fips2: "13", code: "GA", name: "Georgia", center: [-83.32, 32.82] },
  "15": { fips2: "15", code: "HI", name: "Hawaii", center: [-157.5, 21.09] },
  "16": { fips2: "16", code: "ID", name: "Idaho", center: [-114.48, 44.24] },
  "17": { fips2: "17", code: "IL", name: "Illinois", center: [-88.99, 40.35] },
  "18": { fips2: "18", code: "IN", name: "Indiana", center: [-86.26, 39.85] },
  "19": { fips2: "19", code: "IA", name: "Iowa", center: [-93.21, 42.01] },
  "20": { fips2: "20", code: "KS", name: "Kansas", center: [-96.73, 38.53] },
  "21": { fips2: "21", code: "KY", name: "Kentucky", center: [-84.67, 37.67] },
  "22": { fips2: "22", code: "LA", name: "Louisiana", center: [-91.87, 31.17] },
  "23": { fips2: "23", code: "ME", name: "Maine", center: [-69.38, 44.69] },
  "24": { fips2: "24", code: "MD", name: "Maryland", center: [-76.8, 39.06] },
  "25": { fips2: "25", code: "MA", name: "Massachusetts", center: [-71.53, 42.23] },
  "26": { fips2: "26", code: "MI", name: "Michigan", center: [-84.54, 43.33] },
  "27": { fips2: "27", code: "MN", name: "Minnesota", center: [-93.9, 45.69] },
  "28": { fips2: "28", code: "MS", name: "Mississippi", center: [-89.68, 32.74] },
  "29": { fips2: "29", code: "MO", name: "Missouri", center: [-92.29, 38.46] },
  "30": { fips2: "30", code: "MT", name: "Montana", center: [-110.45, 46.92] },
  "31": { fips2: "31", code: "NE", name: "Nebraska", center: [-98.27, 41.13] },
  "32": { fips2: "32", code: "NV", name: "Nevada", center: [-117.06, 38.31] },
  "33": { fips2: "33", code: "NH", name: "New Hampshire", center: [-71.56, 43.45] },
  "34": { fips2: "34", code: "NJ", name: "New Jersey", center: [-74.52, 40.3] },
  "35": { fips2: "35", code: "NM", name: "New Mexico", center: [-106.25, 34.84] },
  "36": { fips2: "36", code: "NY", name: "New York", center: [-74.95, 42.17] },
  "37": { fips2: "37", code: "NC", name: "North Carolina", center: [-79.81, 35.63] },
  "38": { fips2: "38", code: "ND", name: "North Dakota", center: [-99.78, 47.53] },
  "39": { fips2: "39", code: "OH", name: "Ohio", center: [-82.76, 40.39] },
  "40": { fips2: "40", code: "OK", name: "Oklahoma", center: [-96.93, 35.57] },
  "41": { fips2: "41", code: "OR", name: "Oregon", center: [-122.07, 44.57] },
  "42": { fips2: "42", code: "PA", name: "Pennsylvania", center: [-77.21, 40.59] },
  "44": { fips2: "44", code: "RI", name: "Rhode Island", center: [-71.51, 41.68] },
  "45": { fips2: "45", code: "SC", name: "South Carolina", center: [-80.95, 33.86] },
  "46": { fips2: "46", code: "SD", name: "South Dakota", center: [-99.44, 44.3] },
  "47": { fips2: "47", code: "TN", name: "Tennessee", center: [-86.69, 35.75] },
  "48": { fips2: "48", code: "TX", name: "Texas", center: [-97.56, 31.05] },
  "49": { fips2: "49", code: "UT", name: "Utah", center: [-111.86, 40.15] },
  "50": { fips2: "50", code: "VT", name: "Vermont", center: [-72.71, 44.05] },
  "51": { fips2: "51", code: "VA", name: "Virginia", center: [-78.17, 37.77] },
  "53": { fips2: "53", code: "WA", name: "Washington", center: [-121.49, 47.4] },
  "54": { fips2: "54", code: "WV", name: "West Virginia", center: [-80.95, 38.49] },
  "55": { fips2: "55", code: "WI", name: "Wisconsin", center: [-89.62, 44.27] },
  "56": { fips2: "56", code: "WY", name: "Wyoming", center: [-107.3, 42.76] },
};

export interface ScoringWeightsConfig {
  academics: number;
  specializedPrograms: number;
  safetyWellBeing: number;
  familyLifestyle: number;
  affordability: number;
  commute: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeightsConfig = {
  academics: 0.22,
  specializedPrograms: 0.22,
  safetyWellBeing: 0.18,
  familyLifestyle: 0.14,
  affordability: 0.14,
  commute: 0.10,
};

export const FAMILY_PRIORITY_LABELS: Array<{
  key: FamilyPriorityKey;
  label: string;
  pillarLabel: string;
  sourceDescription: string;
}> = [
  {
    key: "academics",
    label: "Academics",
    pillarLabel: "School Performance",
    sourceDescription: "Planned ingestion: Georgia GOSA CCRPI, graduation rates, and subject proficiency.",
  },
  {
    key: "specializedPrograms",
    label: "Specialized Programs",
    pillarLabel: "Specialized Programs",
    sourceDescription: "Planned ingestion: GaDOE Special Education APR indicators and LRE inclusion rates.",
  },
  {
    key: "safetyWellBeing",
    label: "Safety & Well-Being",
    pillarLabel: "Safety & Well-Being",
    sourceDescription: "Planned ingestion: GBI/FBI safety statistics and school climate surveys.",
  },
  {
    key: "familyLifestyle",
    label: "Family Lifestyle",
    pillarLabel: "Family Lifestyle",
    sourceDescription: "Planned ingestion: Municipal park acreage, greenways, and public library access.",
  },
  {
    key: "affordability",
    label: "Affordability",
    pillarLabel: "Affordability",
    sourceDescription: "Planned ingestion: US Census ACS median housing costs and property tax millage.",
  },
  {
    key: "commute",
    label: "Commute",
    pillarLabel: "Commute",
    sourceDescription: "Planned ingestion: ARC/GDOT travel time indices and regional corridor access.",
  },
];

/**
 * Computes the baseline Community Quality Score (0-100) from the 6 pillar inputs
 * and baseline weights. Returns null if pillar inputs are not present.
 */
export function computeCommunityQualityScore(
  pillars: PillarMetrics,
  weights: ScoringWeightsConfig = DEFAULT_SCORING_WEIGHTS
): number | null {
  const entries: Array<{ val: number | null; weight: number }> = [
    { val: pillars.academics, weight: weights.academics },
    { val: pillars.specializedPrograms, weight: weights.specializedPrograms },
    { val: pillars.safetyWellBeing, weight: weights.safetyWellBeing },
    { val: pillars.familyLifestyle, weight: weights.familyLifestyle },
    { val: pillars.affordability, weight: weights.affordability },
    { val: pillars.commute, weight: weights.commute },
  ];

  let weightedSum = 0;
  let totalWeight = 0;
  for (const item of entries) {
    if (typeof item.val === "number" && !Number.isNaN(item.val)) {
      weightedSum += item.val * item.weight;
      totalWeight += item.weight;
    }
  }

  if (totalWeight <= 0) return null;
  return Math.round(weightedSum / totalWeight);
}

/**
 * Computes the personalized Family Fit Score (0-100) by boosting the weights
 * of the priorities selected by the family in "Find Your Fit".
 */
export function computeFamilyFitScore(
  pillars: PillarMetrics,
  selectedPriorities: FamilyPriorityKey[],
  baseWeights: ScoringWeightsConfig = DEFAULT_SCORING_WEIGHTS
): number | null {
  const prioritySet = new Set(selectedPriorities);
  const boostMultiplier = prioritySet.size > 0 ? 2.4 : 1.0;

  const adjustedWeights: ScoringWeightsConfig = {
    academics: baseWeights.academics * (prioritySet.has("academics") ? boostMultiplier : 0.75),
    specializedPrograms:
      baseWeights.specializedPrograms *
      (prioritySet.has("specializedPrograms") ? boostMultiplier : 0.75),
    safetyWellBeing:
      baseWeights.safetyWellBeing * (prioritySet.has("safetyWellBeing") ? boostMultiplier : 0.75),
    familyLifestyle:
      baseWeights.familyLifestyle * (prioritySet.has("familyLifestyle") ? boostMultiplier : 0.75),
    affordability:
      baseWeights.affordability * (prioritySet.has("affordability") ? boostMultiplier : 0.75),
    commute: baseWeights.commute * (prioritySet.has("commute") ? boostMultiplier : 0.75),
  };

  return computeCommunityQualityScore(pillars, adjustedWeights);
}

export interface StorageSuitabilityEvaluation {
  datasetName: string;
  estimatedGeorgiaSize: string;
  estimatedNationwideSize: string;
  recommendedService: "Cloudflare R2 (PMTiles / GeoJSON)" | "Cloudflare D1 (Relational SQLite)";
  d1Suitability: "Suitable" | "Not Suitable (Exceeds Row/DB Quota)";
  r2Suitability: "Optimal ($0 Egress + HTTP Range)";
  rationale: string;
}

export const CLOUDFLARE_STORAGE_EVALUATION: StorageSuitabilityEvaluation[] = [
  {
    datasetName: "Base Vector Map Tiles (Roads, Water, Landuse, Labels)",
    estimatedGeorgiaSize: "~180 MB (.pmtiles)",
    estimatedNationwideSize: "~14 GB (US .pmtiles)",
    recommendedService: "Cloudflare R2 (PMTiles / GeoJSON)",
    d1Suitability: "Not Suitable (Exceeds Row/DB Quota)",
    r2Suitability: "Optimal ($0 Egress + HTTP Range)",
    rationale:
      "D1 has a 10 GB database limit. A single PMTiles archive in R2 served via HTTP 206 Range requests streams tiles directly to MapLibre with $0 egress cost.",
  },
  {
    datasetName: "County & School District Boundary Polygons",
    estimatedGeorgiaSize: "~4.5 MB (159 counties + ~180 districts)",
    estimatedNationwideSize: "~650 MB (3,143 counties + 13,000+ LEA polygons)",
    recommendedService: "Cloudflare R2 (PMTiles / GeoJSON)",
    d1Suitability: "Not Suitable (Exceeds Row/DB Quota)",
    r2Suitability: "Optimal ($0 Egress + HTTP Range)",
    rationale:
      "High-vertex MultiPolygon geometries belong in R2 PMTiles vector layers or static GeoJSON chunks rather than D1 SQL text columns.",
  },
  {
    datasetName: "Community Metadata, Pillar Inputs & Curation Status",
    estimatedGeorgiaSize: "~450 KB (159 counties + metro cities)",
    estimatedNationwideSize: "~28 MB (3,143 counties + top 10,000 cities)",
    recommendedService: "Cloudflare D1 (Relational SQLite)",
    d1Suitability: "Suitable",
    r2Suitability: "Optimal ($0 Egress + HTTP Range)",
    rationale:
      "Compact numeric pillar inputs, NCES IDs, and staff curation notes fit easily in D1 and export cleanly to a static R2 JSON snapshot for offline resilience.",
  },
  {
    datasetName: "Public School Directory & Program Attributes (NCES / GaDOE)",
    estimatedGeorgiaSize: "~3.2 MB (~2,300 Georgia public schools)",
    estimatedNationwideSize: "~140 MB (~100,000 US public schools)",
    recommendedService: "Cloudflare D1 (Relational SQLite)",
    d1Suitability: "Suitable",
    r2Suitability: "Optimal ($0 Egress + HTTP Range)",
    rationale:
      "Tabular school attributes fit within D1 (indexed by state/county FIPS), while map pin clustering layers are pre-baked into R2 GeoJSON/PMTiles per state.",
  },
];

/**
 * Initial Georgia Prototype Communities.
 * All communities default to `awaiting_verified_dataset` so unverified school,
 * specialized education, or safety claims are never presented as established facts.
 * `calibrationPillars` holds fictional calibration values used ONLY when the user
 * switches on "Fictional Calibration Demo" to test the scoring engine.
 */
export const INITIAL_GEORGIA_COMMUNITIES: PlaceCommunityRecord[] = [
  {
    id: "ga-forsyth",
    fips: "13117",
    name: "Forsyth County, GA",
    shortName: "Forsyth County",
    stateCode: "GA",
    region: "North Metro Atlanta",
    coordinates: [-84.125, 34.225],
    zoomLevel: 9.8,
    heroImageStyle: "tree_lined_avenue",
    tagline: "North Metro Atlanta county along GA-400 and Lake Lanier (County Seat: Cumming).",
    keyInsights: [
      "Geographic Boundary: FIPS 13117 · North Metro Atlanta corridor",
      "Public School District: Forsyth County Schools (NCES LEA 1302220)",
      "Academic & Specialized Program Ratings: Pending Verified GaDOE / GOSA Data",
      "Safety, Housing & Commute Metrics: Pending Verified ACS / GBI Data",
    ],
    dataStatus: "awaiting_verified_dataset",
    dataSourcesPending: ["GOSA CCRPI", "GaDOE Special Ed APR", "US Census ACS", "GBI Safety Index"],
    calibrationPillars: {
      communityQuality: 92,
      academics: 95,
      specializedPrograms: 91,
      safetyWellBeing: 93,
      familyLifestyle: 90,
      affordability: 88,
      commute: 91,
    },
    publishedToPublic: true,
    updatedAt: "2026-11-14T18:00:00.000Z",
  },
  {
    id: "ga-fulton",
    fips: "13121",
    name: "Fulton County, GA",
    shortName: "Fulton County",
    stateCode: "GA",
    region: "Metro Atlanta Core & North Fulton",
    coordinates: [-84.39, 33.84],
    zoomLevel: 9.3,
    heroImageStyle: "piedmont_ridge",
    tagline: "Includes Atlanta, Sandy Springs, Roswell, Johns Creek, Alpharetta, and South Fulton.",
    keyInsights: [
      "Geographic Boundary: FIPS 13121 · Central & North Metro Atlanta",
      "Public School Districts: Fulton County Schools & Atlanta Public Schools",
      "Academic & Specialized Program Ratings: Pending Verified GaDOE / GOSA Data",
      "Safety, Housing & Commute Metrics: Pending Verified ACS / GBI Data",
    ],
    dataStatus: "awaiting_verified_dataset",
    dataSourcesPending: ["GOSA CCRPI", "GaDOE Special Ed APR", "US Census ACS", "GBI Safety Index"],
    calibrationPillars: {
      communityQuality: 89,
      academics: 90,
      specializedPrograms: 93,
      safetyWellBeing: 85,
      familyLifestyle: 92,
      affordability: 80,
      commute: 89,
    },
    publishedToPublic: true,
    updatedAt: "2026-11-14T18:00:00.000Z",
  },
  {
    id: "ga-cobb",
    fips: "13067",
    name: "Cobb County, GA",
    shortName: "Cobb County",
    stateCode: "GA",
    region: "Northwest Metro Atlanta",
    coordinates: [-84.57, 33.94],
    zoomLevel: 9.6,
    heroImageStyle: "historic_square",
    tagline: "Northwest Metro county including Marietta, Smyrna, Kennesaw, and Acworth.",
    keyInsights: [
      "Geographic Boundary: FIPS 13067 · Northwest Metro Corridor (I-75 / I-285)",
      "Public School Districts: Cobb County School District & Marietta City Schools",
      "Academic & Specialized Program Ratings: Pending Verified GaDOE / GOSA Data",
      "Safety, Housing & Commute Metrics: Pending Verified ACS / GBI Data",
    ],
    dataStatus: "awaiting_verified_dataset",
    dataSourcesPending: ["GOSA CCRPI", "GaDOE Special Ed APR", "US Census ACS", "GBI Safety Index"],
    calibrationPillars: {
      communityQuality: 90,
      academics: 91,
      specializedPrograms: 89,
      safetyWellBeing: 89,
      familyLifestyle: 91,
      affordability: 86,
      commute: 88,
    },
    publishedToPublic: true,
    updatedAt: "2026-11-14T18:00:00.000Z",
  },
  {
    id: "ga-gwinnett",
    fips: "13135",
    name: "Gwinnett County, GA",
    shortName: "Gwinnett County",
    stateCode: "GA",
    region: "Northeast Metro Atlanta",
    coordinates: [-84.02, 33.96],
    zoomLevel: 9.5,
    heroImageStyle: "lakeside_park",
    tagline: "Northeast Metro county spanning Lawrenceville, Suwanee, Duluth, Peachtree Corners, and Buford.",
    keyInsights: [
      "Geographic Boundary: FIPS 13135 · I-85 & GA-316 Northeast Corridor",
      "Public School Districts: Gwinnett County Public Schools & Buford City Schools",
      "Academic & Specialized Program Ratings: Pending Verified GaDOE / GOSA Data",
      "Safety, Housing & Commute Metrics: Pending Verified ACS / GBI Data",
    ],
    dataStatus: "awaiting_verified_dataset",
    dataSourcesPending: ["GOSA CCRPI", "GaDOE Special Ed APR", "US Census ACS", "GBI Safety Index"],
    calibrationPillars: {
      communityQuality: 88,
      academics: 89,
      specializedPrograms: 90,
      safetyWellBeing: 87,
      familyLifestyle: 90,
      affordability: 87,
      commute: 84,
    },
    publishedToPublic: true,
    updatedAt: "2026-11-14T18:00:00.000Z",
  },
  {
    id: "ga-fayette",
    fips: "13113",
    name: "Fayette County, GA",
    shortName: "Fayette County",
    stateCode: "GA",
    region: "South Metro Atlanta",
    coordinates: [-84.49, 33.41],
    zoomLevel: 9.8,
    heroImageStyle: "tree_lined_avenue",
    tagline: "South Metro county encompassing Fayetteville, Peachtree City, and Tyrone.",
    keyInsights: [
      "Geographic Boundary: FIPS 13113 · South Metro Atlanta (GA-54 / GA-74)",
      "Public School District: Fayette County Public Schools (NCES LEA 1302130)",
      "Academic & Specialized Program Ratings: Pending Verified GaDOE / GOSA Data",
      "Safety, Housing & Commute Metrics: Pending Verified ACS / GBI Data",
    ],
    dataStatus: "awaiting_verified_dataset",
    dataSourcesPending: ["GOSA CCRPI", "GaDOE Special Ed APR", "US Census ACS", "GBI Safety Index"],
    calibrationPillars: {
      communityQuality: 91,
      academics: 93,
      specializedPrograms: 88,
      safetyWellBeing: 94,
      familyLifestyle: 91,
      affordability: 85,
      commute: 87,
    },
    publishedToPublic: true,
    updatedAt: "2026-11-14T18:00:00.000Z",
  },
  {
    id: "ga-oconee",
    fips: "13219",
    name: "Oconee County, GA",
    shortName: "Oconee County",
    stateCode: "GA",
    region: "Athens / Northeast Piedmont",
    coordinates: [-83.44, 33.83],
    zoomLevel: 9.8,
    heroImageStyle: "historic_square",
    tagline: "Northeast Piedmont county (Watkinsville) adjacent to Athens-Clarke County.",
    keyInsights: [
      "Geographic Boundary: FIPS 13219 · US-441 / GA-316 Piedmont Corridor",
      "Public School District: Oconee County Schools (NCES LEA 1303930)",
      "Academic & Specialized Program Ratings: Pending Verified GaDOE / GOSA Data",
      "Safety, Housing & Commute Metrics: Pending Verified ACS / GBI Data",
    ],
    dataStatus: "awaiting_verified_dataset",
    dataSourcesPending: ["GOSA CCRPI", "GaDOE Special Ed APR", "US Census ACS", "GBI Safety Index"],
    calibrationPillars: {
      communityQuality: 91,
      academics: 94,
      specializedPrograms: 89,
      safetyWellBeing: 94,
      familyLifestyle: 89,
      affordability: 86,
      commute: 85,
    },
    publishedToPublic: true,
    updatedAt: "2026-11-14T18:00:00.000Z",
  },
  {
    id: "ga-cherokee",
    fips: "13057",
    name: "Cherokee County, GA",
    shortName: "Cherokee County",
    stateCode: "GA",
    region: "North Metro / Foothills",
    coordinates: [-84.47, 34.24],
    zoomLevel: 9.6,
    heroImageStyle: "piedmont_ridge",
    tagline: "I-575 North Metro corridor including Woodstock, Canton, Holly Springs, and Ball Ground.",
    keyInsights: [
      "Geographic Boundary: FIPS 13057 · I-575 & Etowah River Corridor",
      "Public School District: Cherokee County School District (NCES LEA 1301110)",
      "Academic & Specialized Program Ratings: Pending Verified GaDOE / GOSA Data",
      "Safety, Housing & Commute Metrics: Pending Verified ACS / GBI Data",
    ],
    dataStatus: "awaiting_verified_dataset",
    dataSourcesPending: ["GOSA CCRPI", "GaDOE Special Ed APR", "US Census ACS", "GBI Safety Index"],
    calibrationPillars: {
      communityQuality: 88,
      academics: 89,
      specializedPrograms: 87,
      safetyWellBeing: 91,
      familyLifestyle: 89,
      affordability: 89,
      commute: 83,
    },
    publishedToPublic: true,
    updatedAt: "2026-11-14T18:00:00.000Z",
  },
  {
    id: "ga-dekalb",
    fips: "13089",
    name: "DeKalb & City of Decatur, GA",
    shortName: "DeKalb / Decatur",
    stateCode: "GA",
    region: "East Metro Atlanta",
    coordinates: [-84.23, 33.77],
    zoomLevel: 9.6,
    heroImageStyle: "historic_square",
    tagline: "East Metro county including Decatur, Dunwoody, Brookhaven, Chamblee, and Tucker.",
    keyInsights: [
      "Geographic Boundary: FIPS 13089 · East Metro Atlanta (I-20 / I-85 / I-285)",
      "Public School Districts: DeKalb County School District & City Schools of Decatur",
      "Academic & Specialized Program Ratings: Pending Verified GaDOE / GOSA Data",
      "Safety, Housing & Commute Metrics: Pending Verified ACS / GBI Data",
    ],
    dataStatus: "awaiting_verified_dataset",
    dataSourcesPending: ["GOSA CCRPI", "GaDOE Special Ed APR", "US Census ACS", "GBI Safety Index"],
    calibrationPillars: {
      communityQuality: 87,
      academics: 86,
      specializedPrograms: 94,
      safetyWellBeing: 83,
      familyLifestyle: 92,
      affordability: 82,
      commute: 90,
    },
    publishedToPublic: true,
    updatedAt: "2026-11-14T18:00:00.000Z",
  },
  {
    id: "ga-columbia",
    fips: "13073",
    name: "Columbia County, GA",
    shortName: "Columbia County",
    stateCode: "GA",
    region: "Greater Augusta / Central Savannah River",
    coordinates: [-82.26, 33.54],
    zoomLevel: 9.6,
    heroImageStyle: "lakeside_park",
    tagline: "Eastern Georgia county (Evans, Martinez, Grovetown, Harlem) along I-20.",
    keyInsights: [
      "Geographic Boundary: FIPS 13073 · Central Savannah River Area (I-20)",
      "Public School District: Columbia County School District (NCES LEA 1301380)",
      "Academic & Specialized Program Ratings: Pending Verified GaDOE / GOSA Data",
      "Safety, Housing & Commute Metrics: Pending Verified ACS / GBI Data",
    ],
    dataStatus: "awaiting_verified_dataset",
    dataSourcesPending: ["GOSA CCRPI", "GaDOE Special Ed APR", "US Census ACS", "GBI Safety Index"],
    calibrationPillars: {
      communityQuality: 87,
      academics: 88,
      specializedPrograms: 85,
      safetyWellBeing: 90,
      familyLifestyle: 86,
      affordability: 92,
      commute: 91,
    },
    publishedToPublic: true,
    updatedAt: "2026-11-14T18:00:00.000Z",
  },
  {
    id: "ga-chatham",
    fips: "13051",
    name: "Chatham County (Savannah), GA",
    shortName: "Chatham County",
    stateCode: "GA",
    region: "Coastal Georgia",
    coordinates: [-81.13, 32.02],
    zoomLevel: 9.5,
    heroImageStyle: "historic_square",
    tagline: "Coastal Georgia county encompassing Savannah, Pooler, Garden City, and Tybee Island.",
    keyInsights: [
      "Geographic Boundary: FIPS 13051 · Atlantic Coast & I-95 / I-16 Junction",
      "Public School District: Savannah-Chatham County Public School System",
      "Academic & Specialized Program Ratings: Pending Verified GaDOE / GOSA Data",
      "Safety, Housing & Commute Metrics: Pending Verified ACS / GBI Data",
    ],
    dataStatus: "awaiting_verified_dataset",
    dataSourcesPending: ["GOSA CCRPI", "GaDOE Special Ed APR", "US Census ACS", "GBI Safety Index"],
    calibrationPillars: {
      communityQuality: 85,
      academics: 83,
      specializedPrograms: 85,
      safetyWellBeing: 82,
      familyLifestyle: 91,
      affordability: 86,
      commute: 88,
    },
    publishedToPublic: true,
    updatedAt: "2026-11-14T18:00:00.000Z",
  },
];

export const INITIAL_GEORGIA_SCHOOL_DISTRICTS: PlaceSchoolDistrictRecord[] = [
  {
    id: "lea-1302220",
    ncesId: "1302220",
    name: "Forsyth County Schools",
    countyFips: "13117",
    countyName: "Forsyth County",
    coordinates: [-84.139, 34.207],
    approximateEnrollment: "NCES LEA 1302220",
    specializedSupportSummary: "District boundary mapped · Verified GaDOE Special Education APR indicators pending import.",
    dataStatus: "awaiting_verified_dataset",
  },
  {
    id: "lea-1302280",
    ncesId: "1302280",
    name: "Fulton County Schools",
    countyFips: "13121",
    countyName: "Fulton County",
    coordinates: [-84.365, 33.932],
    approximateEnrollment: "NCES LEA 1302280",
    specializedSupportSummary: "District boundary mapped · Verified GaDOE Special Education APR indicators pending import.",
    dataStatus: "awaiting_verified_dataset",
  },
  {
    id: "lea-1301290",
    ncesId: "1301290",
    name: "Cobb County School District",
    countyFips: "13067",
    countyName: "Cobb County",
    coordinates: [-84.552, 33.952],
    approximateEnrollment: "NCES LEA 1301290",
    specializedSupportSummary: "District boundary mapped · Verified GaDOE Special Education APR indicators pending import.",
    dataStatus: "awaiting_verified_dataset",
  },
  {
    id: "lea-1302550",
    ncesId: "1302550",
    name: "Gwinnett County Public Schools",
    countyFips: "13135",
    countyName: "Gwinnett County",
    coordinates: [-84.005, 33.956],
    approximateEnrollment: "NCES LEA 1302550",
    specializedSupportSummary: "District boundary mapped · Verified GaDOE Special Education APR indicators pending import.",
    dataStatus: "awaiting_verified_dataset",
  },
  {
    id: "lea-1302130",
    ncesId: "1302130",
    name: "Fayette County Public Schools",
    countyFips: "13113",
    countyName: "Fayette County",
    coordinates: [-84.455, 33.448],
    approximateEnrollment: "NCES LEA 1302130",
    specializedSupportSummary: "District boundary mapped · Verified GaDOE Special Education APR indicators pending import.",
    dataStatus: "awaiting_verified_dataset",
  },
  {
    id: "lea-1303930",
    ncesId: "1303930",
    name: "Oconee County Schools",
    countyFips: "13219",
    countyName: "Oconee County",
    coordinates: [-83.409, 33.863],
    approximateEnrollment: "NCES LEA 1303930",
    specializedSupportSummary: "District boundary mapped · Verified GaDOE Special Education APR indicators pending import.",
    dataStatus: "awaiting_verified_dataset",
  },
  {
    id: "lea-1301650",
    ncesId: "1301650",
    name: "City Schools of Decatur",
    countyFips: "13089",
    countyName: "DeKalb County",
    coordinates: [-84.296, 33.774],
    approximateEnrollment: "NCES LEA 1301650",
    specializedSupportSummary: "District boundary mapped · Verified GaDOE Special Education APR indicators pending import.",
    dataStatus: "awaiting_verified_dataset",
  },
];

export const INITIAL_GEORGIA_SCHOOLS: PlaceSchoolRecord[] = [
  {
    id: "sch-forsyth-lambert",
    name: "Lambert High School",
    districtId: "lea-1302220",
    countyFips: "13117",
    level: "High",
    coordinates: [-84.169, 34.106],
    specializedProgramsNote: "Campus location mapped · Program & GOSA metrics pending verified dataset import.",
    dataStatus: "awaiting_verified_dataset",
  },
  {
    id: "sch-forsyth-daves-creek",
    name: "Daves Creek Elementary",
    districtId: "lea-1302220",
    countyFips: "13117",
    level: "Elementary",
    coordinates: [-84.129, 34.163],
    specializedProgramsNote: "Campus location mapped · Program & GOSA metrics pending verified dataset import.",
    dataStatus: "awaiting_verified_dataset",
  },
  {
    id: "sch-fulton-northview",
    name: "Northview High School",
    districtId: "lea-1302280",
    countyFips: "13121",
    level: "High",
    coordinates: [-84.167, 34.041],
    specializedProgramsNote: "Campus location mapped · Program & GOSA metrics pending verified dataset import.",
    dataStatus: "awaiting_verified_dataset",
  },
  {
    id: "sch-cobb-walton",
    name: "Walton High School",
    districtId: "lea-1301290",
    countyFips: "13067",
    level: "High",
    coordinates: [-84.421, 33.981],
    specializedProgramsNote: "Campus location mapped · Program & GOSA metrics pending verified dataset import.",
    dataStatus: "awaiting_verified_dataset",
  },
  {
    id: "sch-gwinnett-gsmst",
    name: "Gwinnett School of Mathematics, Science, and Technology",
    districtId: "lea-1302550",
    countyFips: "13135",
    level: "Specialized / Charter",
    coordinates: [-84.072, 33.927],
    specializedProgramsNote: "Campus location mapped · Program & GOSA metrics pending verified dataset import.",
    dataStatus: "awaiting_verified_dataset",
  },
  {
    id: "sch-fayette-mcintosh",
    name: "McIntosh High School",
    districtId: "lea-1302130",
    countyFips: "13113",
    level: "High",
    coordinates: [-84.569, 33.405],
    specializedProgramsNote: "Campus location mapped · Program & GOSA metrics pending verified dataset import.",
    dataStatus: "awaiting_verified_dataset",
  },
  {
    id: "sch-oconee-high",
    name: "Oconee County High School",
    districtId: "lea-1303930",
    countyFips: "13219",
    level: "High",
    coordinates: [-83.438, 33.861],
    specializedProgramsNote: "Campus location mapped · Program & GOSA metrics pending verified dataset import.",
    dataStatus: "awaiting_verified_dataset",
  },
  {
    id: "sch-dekalb-decatur-high",
    name: "Decatur High School",
    districtId: "lea-1301650",
    countyFips: "13089",
    level: "High",
    coordinates: [-84.2942, 33.7725],
    specializedProgramsNote: "Campus location mapped (310 N McDonough St, Decatur GA) · Program & GOSA metrics pending verified dataset import.",
    dataStatus: "awaiting_verified_dataset",
  },
  {
    id: "sch-dekalb-winnona-park",
    name: "Winnona Park Elementary School",
    districtId: "lea-1301650",
    countyFips: "13089",
    level: "Elementary",
    coordinates: [-84.2895, 33.7662],
    specializedProgramsNote: "Neighborhood elementary campus & playground (510 Avery St, Decatur GA) · Program metrics pending verified dataset import.",
    dataStatus: "awaiting_verified_dataset",
  },
];

export const INITIAL_GEORGIA_AMENITIES: PlaceAmenityMarker[] = [
  {
    id: "am-forsyth-greenway",
    countyFips: "13117",
    category: "parks_recreation",
    name: "Big Creek Greenway & Fowler Park",
    subtitle: "Public greenway & county park location",
    coordinates: [-84.161, 34.154],
  },
  {
    id: "am-forsyth-cumming-city-center",
    countyFips: "13117",
    category: "neighborhoods",
    name: "Cumming & South Forsyth Corridor",
    subtitle: "Municipal center & residential corridor",
    coordinates: [-84.141, 34.208],
  },
  {
    id: "am-dekalb-oakhurst",
    countyFips: "13089",
    category: "neighborhoods",
    name: "Winnona Park & Oakhurst Residential Neighborhood",
    subtitle: "Tree-lined Decatur / DeKalb County residential streets & parks",
    coordinates: [-84.3038, 33.7642],
  },
  {
    id: "am-fulton-choa",
    countyFips: "13121",
    category: "family_life",
    name: "North Druid Hills / Pediatric Medical Corridor",
    subtitle: "Regional hospital & clinical corridor",
    coordinates: [-84.331, 33.831],
  },
  {
    id: "am-cobb-mountain",
    countyFips: "13067",
    category: "parks_recreation",
    name: "Kennesaw Mountain & Chattahoochee National Parklands",
    subtitle: "National park & trail corridor",
    coordinates: [-84.578, 33.976],
  },
  {
    id: "am-fayette-paths",
    countyFips: "13113",
    category: "neighborhoods",
    name: "Peachtree City Villages",
    subtitle: "Planned residential village center",
    coordinates: [-84.595, 33.396],
  },
];

// ============================================================================
// CHOROPLETH GEOGRAPHIC SCORE SHADING ARCHITECTURE (State / County / Block Group)
// ============================================================================

export type ChoroplethMeasureKey =
  | "communityQuality"
  | "familyFit"
  | "safetyWellBeing"
  | "affordability"
  | "academics"
  | "commute";

export type ChoroplethGranularityMode =
  | "auto"
  | "state"
  | "county"
  | "block_group";

export interface ChoroplethMeasureMeta {
  key: ChoroplethMeasureKey;
  label: string;
  shortLabel: string;
  description: string;
}

export const CHOROPLETH_MEASURES: ChoroplethMeasureMeta[] = [
  {
    key: "communityQuality",
    label: "Community Quality",
    shortLabel: "Quality",
    description: "Composite baseline across all 6 relocation pillars",
  },
  {
    key: "familyFit",
    label: "Family Fit",
    shortLabel: "Family Fit",
    description: "Personalized score weighted by selected Family Priorities",
  },
  {
    key: "academics",
    label: "Schools",
    shortLabel: "Schools",
    description: "Academic performance & specialized IEP program indicators",
  },
  {
    key: "safetyWellBeing",
    label: "Safety",
    shortLabel: "Safety",
    description: "Community safety, environmental health & pediatric access",
  },
  {
    key: "affordability",
    label: "Affordability",
    shortLabel: "Affordability",
    description: "Housing cost-to-income ratio & property tax balance",
  },
  {
    key: "commute",
    label: "Connectivity",
    shortLabel: "Connectivity",
    description: "Regional highway/transit access & therapy commute times",
  },
];

export interface ChoroplethLegendStop {
  label: string;
  rangeText: string;
  color: string;
  isNoData?: boolean;
}

/**
 * Canonical Waypoint Dark Navy (#000820) + Subtle Blue/Violet Score Gradient
 * with clear distinction between High Scores, Low Scores, and No Verified Data.
 */
export const CHOROPLETH_LEGEND_STOPS: ChoroplethLegendStop[] = [
  { label: "High Score", rangeText: "85–100", color: "#7C6EE6" },
  { label: "Above Avg", rangeText: "75–84", color: "#4A6CF7" },
  { label: "Moderate", rangeText: "65–74", color: "#274B8F" },
  { label: "Lower", rangeText: "50–64", color: "#152954" },
  { label: "Low Score", rangeText: "< 50", color: "#0C1836" },
  { label: "No Verified Data", rangeText: "Unscored", color: "#050D24", isNoData: true },
];

export function getChoroplethFillColor(
  score: number | null | undefined,
  canShowScores: boolean
): string {
  if (!canShowScores || score === null || score === undefined || Number.isNaN(score)) {
    return "#050D24"; // Distinct No Verified Data fill
  }
  if (score >= 85) return "#7C6EE6"; // Luminous violet-indigo (High)
  if (score >= 75) return "#4A6CF7"; // Rich royal blue-indigo (Above Avg)
  if (score >= 65) return "#274B8F"; // Mid sapphire blue (Moderate)
  if (score >= 50) return "#152954"; // Deep slate navy (Lower)
  return "#0C1836"; // Low score abyssal blue
}

/**
 * Demonstration Calibration Scores for ~42 Georgia Counties (plus unscored counties to
 * demonstrate "No Verified Data"). Notice how Affordability vs. Schools vs. Connectivity
 * exhibit distinct regional inversions across Metro Atlanta, North GA, Middle GA, and Coastal GA.
 */
export const DEMO_COUNTY_CALIBRATION_BY_FIPS: Record<string, PillarMetrics> = {
  // Core 10 curated Georgia counties
  "13117": { communityQuality: 92, academics: 95, specializedPrograms: 94, safetyWellBeing: 93, familyLifestyle: 90, affordability: 62, commute: 78 }, // Forsyth
  "13121": { communityQuality: 89, academics: 88, specializedPrograms: 92, safetyWellBeing: 74, familyLifestyle: 92, affordability: 54, commute: 94 }, // Fulton
  "13067": { communityQuality: 90, academics: 91, specializedPrograms: 89, safetyWellBeing: 86, familyLifestyle: 91, affordability: 68, commute: 90 }, // Cobb
  "13135": { communityQuality: 88, academics: 89, specializedPrograms: 90, safetyWellBeing: 83, familyLifestyle: 90, affordability: 74, commute: 86 }, // Gwinnett
  "13113": { communityQuality: 91, academics: 94, specializedPrograms: 90, safetyWellBeing: 94, familyLifestyle: 91, affordability: 66, commute: 79 }, // Fayette
  "13057": { communityQuality: 87, academics: 89, specializedPrograms: 87, safetyWellBeing: 91, familyLifestyle: 88, affordability: 72, commute: 76 }, // Cherokee
  "13089": { communityQuality: 84, academics: 79, specializedPrograms: 89, safetyWellBeing: 71, familyLifestyle: 89, affordability: 69, commute: 95 }, // DeKalb
  "13219": { communityQuality: 90, academics: 94, specializedPrograms: 88, safetyWellBeing: 93, familyLifestyle: 89, affordability: 64, commute: 74 }, // Oconee
  "13073": { communityQuality: 86, academics: 89, specializedPrograms: 85, safetyWellBeing: 89, familyLifestyle: 86, affordability: 88, commute: 82 }, // Columbia
  "13051": { communityQuality: 83, academics: 78, specializedPrograms: 82, safetyWellBeing: 76, familyLifestyle: 89, affordability: 77, commute: 85 }, // Chatham
  // Additional Georgia counties for rich statewide choropleth demonstration (leaving others as "No Verified Data")
  "13139": { communityQuality: 82, academics: 81, specializedPrograms: 80, safetyWellBeing: 84, familyLifestyle: 85, affordability: 79, commute: 77 }, // Hall
  "13151": { communityQuality: 78, academics: 76, specializedPrograms: 77, safetyWellBeing: 77, familyLifestyle: 80, affordability: 82, commute: 84 }, // Henry
  "13063": { communityQuality: 68, academics: 64, specializedPrograms: 70, safetyWellBeing: 62, familyLifestyle: 72, affordability: 89, commute: 92 }, // Clayton
  "13097": { communityQuality: 79, academics: 78, specializedPrograms: 77, safetyWellBeing: 80, familyLifestyle: 79, affordability: 83, commute: 84 }, // Douglas
  "13223": { communityQuality: 81, academics: 82, specializedPrograms: 79, safetyWellBeing: 86, familyLifestyle: 80, affordability: 84, commute: 73 }, // Paulding
  "13077": { communityQuality: 84, academics: 85, specializedPrograms: 82, safetyWellBeing: 87, familyLifestyle: 84, affordability: 78, commute: 80 }, // Coweta
  "13247": { communityQuality: 77, academics: 76, specializedPrograms: 76, safetyWellBeing: 78, familyLifestyle: 78, affordability: 81, commute: 83 }, // Rockdale
  "13217": { communityQuality: 74, academics: 72, specializedPrograms: 73, safetyWellBeing: 75, familyLifestyle: 74, affordability: 85, commute: 76 }, // Newton
  "13297": { communityQuality: 79, academics: 80, specializedPrograms: 77, safetyWellBeing: 83, familyLifestyle: 78, affordability: 80, commute: 72 }, // Walton
  "13013": { communityQuality: 78, academics: 77, specializedPrograms: 76, safetyWellBeing: 82, familyLifestyle: 77, affordability: 83, commute: 74 }, // Barrow
  "13157": { communityQuality: 83, academics: 86, specializedPrograms: 81, safetyWellBeing: 87, familyLifestyle: 81, affordability: 78, commute: 74 }, // Jackson
  "13059": { communityQuality: 81, academics: 77, specializedPrograms: 84, safetyWellBeing: 76, familyLifestyle: 88, affordability: 72, commute: 81 }, // Clarke (Athens)
  "13015": { communityQuality: 76, academics: 75, specializedPrograms: 74, safetyWellBeing: 80, familyLifestyle: 76, affordability: 84, commute: 78 }, // Bartow
  "13115": { communityQuality: 75, academics: 76, specializedPrograms: 74, safetyWellBeing: 77, familyLifestyle: 76, affordability: 88, commute: 72 }, // Floyd (Rome)
  "13313": { communityQuality: 73, academics: 72, specializedPrograms: 71, safetyWellBeing: 76, familyLifestyle: 73, affordability: 89, commute: 75 }, // Whitfield
  "13021": { communityQuality: 71, academics: 67, specializedPrograms: 74, safetyWellBeing: 65, familyLifestyle: 76, affordability: 91, commute: 83 }, // Bibb (Macon)
  "13153": { communityQuality: 82, academics: 84, specializedPrograms: 81, safetyWellBeing: 83, familyLifestyle: 81, affordability: 90, commute: 80 }, // Houston (Warner Robins)
  "13215": { communityQuality: 74, academics: 73, specializedPrograms: 75, safetyWellBeing: 70, familyLifestyle: 78, affordability: 89, commute: 79 }, // Muscogee (Columbus)
  "13245": { communityQuality: 72, academics: 68, specializedPrograms: 74, safetyWellBeing: 67, familyLifestyle: 77, affordability: 90, commute: 81 }, // Richmond (Augusta)
  "13185": { communityQuality: 76, academics: 77, specializedPrograms: 75, safetyWellBeing: 76, familyLifestyle: 77, affordability: 91, commute: 78 }, // Lowndes (Valdosta)
  "13095": { communityQuality: 64, academics: 61, specializedPrograms: 66, safetyWellBeing: 58, familyLifestyle: 68, affordability: 93, commute: 72 }, // Dougherty (Albany)
  "13127": { communityQuality: 80, academics: 79, specializedPrograms: 78, safetyWellBeing: 81, familyLifestyle: 84, affordability: 76, commute: 75 }, // Glynn (Brunswick)
  "13029": { communityQuality: 81, academics: 84, specializedPrograms: 79, safetyWellBeing: 85, familyLifestyle: 80, affordability: 83, commute: 77 }, // Bryan
  "13103": { communityQuality: 79, academics: 82, specializedPrograms: 77, safetyWellBeing: 84, familyLifestyle: 77, affordability: 86, commute: 73 }, // Effingham
  "13031": { communityQuality: 75, academics: 74, specializedPrograms: 73, safetyWellBeing: 76, familyLifestyle: 77, affordability: 88, commute: 74 }, // Bulloch (Statesboro)
  "13187": { communityQuality: 80, academics: 81, specializedPrograms: 78, safetyWellBeing: 88, familyLifestyle: 82, affordability: 75, commute: 66 }, // Lumpkin (Dahlonega)
  "13085": { communityQuality: 82, academics: 83, specializedPrograms: 79, safetyWellBeing: 90, familyLifestyle: 83, affordability: 73, commute: 68 }, // Dawson
  "13123": { communityQuality: 77, academics: 76, specializedPrograms: 74, safetyWellBeing: 87, familyLifestyle: 79, affordability: 78, commute: 62 }, // Gilmer
  "13137": { communityQuality: 78, academics: 79, specializedPrograms: 75, safetyWellBeing: 88, familyLifestyle: 78, affordability: 81, commute: 64 }, // Habersham
  "13285": { communityQuality: 72, academics: 71, specializedPrograms: 70, safetyWellBeing: 73, familyLifestyle: 73, affordability: 90, commute: 76 }, // Troup (LaGrange)
  "13277": { communityQuality: 71, academics: 70, specializedPrograms: 69, safetyWellBeing: 74, familyLifestyle: 72, affordability: 92, commute: 74 }, // Tift
  "13071": { communityQuality: 67, academics: 66, specializedPrograms: 65, safetyWellBeing: 70, familyLifestyle: 68, affordability: 94, commute: 65 }, // Colquitt
  "13179": { communityQuality: 70, academics: 69, specializedPrograms: 71, safetyWellBeing: 72, familyLifestyle: 71, affordability: 89, commute: 73 }, // Liberty
  "13045": { communityQuality: 76, academics: 77, specializedPrograms: 75, safetyWellBeing: 78, familyLifestyle: 76, affordability: 85, commute: 75 }, // Carroll
};

/**
 * Demonstration State-Level Calibration Scores (used when zoomed out to 50-state view or State granularity).
 * Unlisted states intentionally remain unscored ("No Verified Data") to demonstrate missing-data distinction.
 */
export const DEMO_STATE_CALIBRATION_BY_FIPS2: Record<string, PillarMetrics> = {
  "13": { communityQuality: 86, academics: 87, specializedPrograms: 88, safetyWellBeing: 84, familyLifestyle: 88, affordability: 82, commute: 83 }, // Georgia
  "12": { communityQuality: 83, academics: 82, specializedPrograms: 81, safetyWellBeing: 82, familyLifestyle: 89, affordability: 74, commute: 80 }, // Florida
  "37": { communityQuality: 85, academics: 86, specializedPrograms: 85, safetyWellBeing: 85, familyLifestyle: 86, affordability: 81, commute: 82 }, // North Carolina
  "45": { communityQuality: 80, academics: 78, specializedPrograms: 79, safetyWellBeing: 81, familyLifestyle: 83, affordability: 86, commute: 78 }, // South Carolina
  "47": { communityQuality: 82, academics: 80, specializedPrograms: 80, safetyWellBeing: 81, familyLifestyle: 85, affordability: 85, commute: 79 }, // Tennessee
  "01": { communityQuality: 76, academics: 74, specializedPrograms: 75, safetyWellBeing: 77, familyLifestyle: 78, affordability: 91, commute: 75 }, // Alabama
  "51": { communityQuality: 88, academics: 91, specializedPrograms: 89, safetyWellBeing: 88, familyLifestyle: 87, affordability: 71, commute: 84 }, // Virginia
  "48": { communityQuality: 84, academics: 83, specializedPrograms: 82, safetyWellBeing: 82, familyLifestyle: 86, affordability: 83, commute: 81 }, // Texas
  "06": { communityQuality: 81, academics: 84, specializedPrograms: 88, safetyWellBeing: 78, familyLifestyle: 89, affordability: 46, commute: 74 }, // California
  "25": { communityQuality: 91, academics: 95, specializedPrograms: 94, safetyWellBeing: 90, familyLifestyle: 89, affordability: 52, commute: 86 }, // Massachusetts
  "36": { communityQuality: 85, academics: 89, specializedPrograms: 91, safetyWellBeing: 83, familyLifestyle: 87, affordability: 55, commute: 89 }, // New York
  "08": { communityQuality: 87, academics: 88, specializedPrograms: 86, safetyWellBeing: 86, familyLifestyle: 91, affordability: 66, commute: 81 }, // Colorado
  "42": { communityQuality: 83, academics: 86, specializedPrograms: 85, safetyWellBeing: 83, familyLifestyle: 82, affordability: 79, commute: 82 }, // Pennsylvania
  "39": { communityQuality: 79, academics: 81, specializedPrograms: 80, safetyWellBeing: 80, familyLifestyle: 79, affordability: 88, commute: 79 }, // Ohio
  "17": { communityQuality: 81, academics: 84, specializedPrograms: 85, safetyWellBeing: 77, familyLifestyle: 83, affordability: 78, commute: 86 }, // Illinois
  "53": { communityQuality: 86, academics: 88, specializedPrograms: 87, safetyWellBeing: 85, familyLifestyle: 89, affordability: 63, commute: 80 }, // Washington
};

export function resolvePillarMeasureValue(
  pillars: PillarMetrics | null | undefined,
  measure: ChoroplethMeasureKey,
  selectedPriorities: FamilyPriorityKey[],
  weights: ScoringWeightsConfig = DEFAULT_SCORING_WEIGHTS
): number | null {
  if (!pillars) return null;
  if (measure === "familyFit") {
    return computeFamilyFitScore(pillars, selectedPriorities, weights);
  }
  if (measure === "communityQuality") {
    return (
      pillars.communityQuality ?? computeCommunityQualityScore(pillars, weights)
    );
  }
  const val = pillars[measure];
  return typeof val === "number" ? val : null;
}

// ============================================================================
// PHASE 2: NATIONWIDE DATA INTELLIGENCE FOUNDATION (MILESTONE A & B)
// ============================================================================

export type PlacesGeographicLevel =
  | "state"
  | "county"
  | "place"
  | "zcta"
  | "tract"
  | "block_group"
  | "school_district_lea"
  | "school_campus";

/**
 * Stable Canonical Geographic Identifiers across all 50 states.
 * Never use geographic names alone as primary identifiers.
 */
export interface PlacesGeographicIdentifiers {
  stateFips2: string; // 2-digit State FIPS (e.g. "13" for Georgia)
  countyFips5?: string; // 5-digit County FIPS (e.g. "13117" for Forsyth County)
  placeGeoid7?: string; // 7-digit Census Place GEOID (e.g. "1322052" for Decatur city)
  zcta5?: string; // 5-digit ZIP Code Tabulation Area (e.g. "30030")
  tractGeoid11?: string; // 11-digit Census Tract GEOID (e.g. "13089022500")
  blockGroupGeoid12?: string; // 12-digit Census Block Group GEOID (e.g. "130890225001")
  ncesLeaId7?: string; // 7-digit NCES Public School District LEAID (e.g. "1301650")
  ncesSchoolId12?: string; // 12-digit NCES School ID (NCESSCH, e.g. "130165000720")
}

/**
 * Explicit Non-Coterminous Boundary Relationship / Crosswalk Record.
 * ZIP codes (ZCTAs), school attendance zones/districts, municipal places,
 * counties, and census tracts frequently cross one another's boundaries.
 */
export interface GeographicBoundaryCrosswalkRecord {
  id: string;
  relationshipType:
    | "county_to_lea"
    | "zcta_to_county"
    | "place_to_county"
    | "tract_to_lea"
    | "zcta_to_lea";
  fromLevel: PlacesGeographicLevel;
  fromGeoid: string;
  fromName: string;
  toLevel: PlacesGeographicLevel;
  toGeoid: string;
  toName: string;
  stateFips2: string;
  overlapType: "coterminous" | "partial_split" | "multi_jurisdiction";
  allocationFactor: number; // 0.0 to 1.0 population/housing share
  boundaryNote: string;
  sourceCitation: string;
}

export type DataSourceConnectorId =
  | "us_census_acs5"
  | "nces_ccd_directory"
  | "census_tiger_boundaries"
  | "cms_nppes_npi_providers"
  | "fcc_broadband_map"
  | "fbi_cde_safety"
  | "fema_nri_hazard"
  | "epa_airnow_ej"
  | "ga_gosa_gadoe_accountability"
  | "waypoint_sped_research";

export type ConnectorOperationalStatus =
  | "connected_live"
  | "adapter_ready_pending_key"
  | "adapter_ready_scheduled_bulk"
  | "human_verified_research";

export interface DataSourceConnectorMetadata {
  id: DataSourceConnectorId;
  name: string;
  agency: string;
  status: ConnectorOperationalStatus;
  updateFrequency: "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Annual Release";
  scheduledCron: string;
  nextScheduledRefresh: string;
  lastSuccessfulRefresh: string | null;
  recordsImportedCount: number;
  geographicCoverage: string;
  supportedLevels: PlacesGeographicLevel[];
  requiresCredentials: boolean;
  credentialEnvVar: string | null;
  credentialConfigured: boolean;
  apiEndpointPreview: string;
  verificationTierDefault: PlacesVerificationTier;
  methodologyAndLimitationsNote: string;
}

export interface PlaceMeasurementRecord {
  id: string;
  geoid: string; // Canonical FIPS / GEOID / NCES ID
  geographicLevel: PlacesGeographicLevel;
  stateFips2: string;
  entityName: string;
  indicatorKey:
    | "acs_total_population"
    | "acs_median_household_income"
    | "acs_median_home_value"
    | "acs_median_gross_rent"
    | "acs_mean_commute_minutes"
    | "acs_price_to_income_ratio"
    | "acs_rent_to_income_pct"
    | "nces_district_enrollment"
    | "nces_pupil_teacher_ratio"
    | "nces_public_schools_count";
  indicatorLabel: string;
  pillarKey: FamilyPriorityKey | "demographics";
  rawEstimate: number | null;
  /** Preserves official U.S. Census ACS 90% Margin of Error (MOE); null if non-survey count */
  marginOfError: number | null;
  /** Relative MOE percentage: (|MOE| / |Estimate|) * 100 */
  moeRelativePercent: number | null;
  /** Flagged true when relative MOE exceeds 15% reliability threshold */
  highMoeWarning: boolean;
  unit: "USD" | "minutes" | "persons" | "ratio" | "percent" | "schools";
  surveyPeriod: string; // e.g., "2018-2022 ACS 5-Year" or "NCES CCD 2022-2023"
  normalizedScore0To100: number | null;
  normalizationFormulaId: string | null;
  sourceId: DataSourceConnectorId;
  citationText: string;
  verificationTier: PlacesVerificationTier;
  capturedAt: string;
  lastConfirmedAt: string;
}

/**
 * Mandatory Legal & Advocacy Non-Guarantee Disclaimer for Special Education Intelligence
 */
export const SPED_NON_GUARANTEE_DISCLAIMER =
  "Existence of a district or school program never guarantees IDEA eligibility, placement, staffing, or a particular service for any individual student. Individualized decisions are made by the student's IEP team under federal and state law.";

/**
 * Special Education Intelligence Record (Section 3 of Phase 2 Specification)
 * Strictly distinguishes: Verified, Parent Reported, Unverified, Outdated, Unknown.
 */
export interface SpecialEducationIntelligenceRecord {
  id: string;
  ncesLeaId7: string;
  ncesSchoolId12: string | null;
  countyFips5: string;
  stateCode: string;
  entityName: string;
  entityType: "school_district" | "school_campus";
  specializedProgramAvailability: string[];
  programLocationsAndServedGrades: string;
  accessibilityAndEnvironmentalFeatures: string[];
  relatedServicesAndSupportModels: string[];
  transportationInformation: string;
  publicAccountabilityFindings: {
    surveyPeriod: string;
    ideaPartBDetermination: string;
    stateComplaintFindingsSummary: string;
    correctiveActionStatus: "None Reported" | "In Progress" | "Completed" | "Unknown";
    sourceCitation: string;
  };
  parentReportedExperiencesSummary: string | null;
  verificationTier: PlacesVerificationTier;
  sourceVerificationNotes: string;
  lastConfirmedDate: string;
  nonGuaranteeDisclaimer: string;
}

export interface DataQualityWarningRecord {
  id: string;
  severity: "info" | "warning" | "error";
  sourceId: DataSourceConnectorId;
  geoid: string;
  entityName: string;
  category:
    | "high_margin_of_error"
    | "missing_indicator"
    | "boundary_non_coterminous"
    | "coarse_jurisdiction_limitation"
    | "outdated_source";
  message: string;
  detectedAt: string;
}

export interface DataImportRunRecord {
  id: string;
  sourceId: DataSourceConnectorId;
  sourceName: string;
  stateFips2: string;
  status: "succeeded" | "partial_warning" | "failed" | "failed_preserved_lkg";
  startedAt: string;
  completedAt: string;
  durationMs: number;
  recordsProcessed: number;
  recordsInsertedOrUpdated: number;
  duplicatesSkipped: number;
  validationErrorsCount: number;
  warningsCount: number;
  sourceChecksum: string;
  triggeredBy: string;
  usedLiveApiEndpoint: boolean;
  summaryText: string;
}

export interface DocumentedScoringFormulaSpec {
  formulaId: string;
  pillarKey: FamilyPriorityKey;
  title: string;
  sourceConnectors: DataSourceConnectorId[];
  equationText: string;
  missingDataRule: string;
  geographicAggregationRule: string;
}

export const DOCUMENTED_INDICATOR_FORMULAS: DocumentedScoringFormulaSpec[] = [
  {
    formulaId: "norm_affordability_acs5_v1",
    pillarKey: "affordability",
    title: "Housing & Cost-of-Living Affordability Index (0–100)",
    sourceConnectors: ["us_census_acs5"],
    equationText:
      "PIR = B25077_001E (Median Home Value) / B19013_001E (Median Household Income); RIR = (B25064_001E × 12) / B19013_001E. OwnerScore = clamp(0, 100, 100 - ((PIR - 2.2) / 5.3) × 60); RenterScore = clamp(0, 100, 100 - ((RIR - 0.18) / 0.24) × 60). Affordability = round(0.65 × OwnerScore + 0.35 × RenterScore).",
    missingDataRule:
      "If B19013_001E <= 0 or missing, Affordability remains strictly null (never 0 or fictional).",
    geographicAggregationRule:
      "Computed directly from official Census ACS 5-Year summary level estimates (040 State, 050 County, 140 Tract, 150 Block Group); never unweighted-averaged across unequal tracts.",
  },
  {
    formulaId: "norm_commute_acs5_v1",
    pillarKey: "commute",
    title: "Regional Commute & Therapy Corridor Connectivity Index (0–100)",
    sourceConnectors: ["us_census_acs5"],
    equationText:
      "MeanCommuteMin = S0801 / B08303 derived mean travel time to work (minutes). CommuteScore = round(clamp(35, 98, 100 - ((MeanCommuteMin - 16) / 24) × 52)).",
    missingDataRule:
      "If MeanCommuteMin is null or negative, Commute pillar remains null.",
    geographicAggregationRule:
      "Worker-weighted travel time aggregation across official Census geographic levels.",
  },
  {
    formulaId: "norm_family_lifestyle_acs_nces_v1",
    pillarKey: "familyLifestyle",
    title: "Community Stability & Public School Infrastructure Index (0–100)",
    sourceConnectors: ["us_census_acs5", "nces_ccd_directory"],
    equationText:
      "Combines NCES CCD Pupil-Teacher Ratio Score = clamp(45, 98, 100 - ((PTR - 12.0) / 10.0) × 45) (55% weight) and ACS Household Income/Community Stability Score (45% weight).",
    missingDataRule:
      "Requires both verified ACS county baseline and NCES CCD public school directory coverage; otherwise null.",
    geographicAggregationRule:
      "Enrollment-weighted across all public LEA districts serving the county (explicitly accounting for municipal independent districts such as City Schools of Decatur and Atlanta Public Schools).",
  },
  {
    formulaId: "norm_academics_state_adapter_v1",
    pillarKey: "academics",
    title: "Academic Accountability & Graduation Readiness Index (0–100)",
    sourceConnectors: ["ga_gosa_gadoe_accountability", "nces_ccd_directory"],
    equationText:
      "State-specific accountability adapter (Georgia GOSA CCRPI Content Mastery + Readiness + Graduation Rate). Remains null until verified state DOE dataset is imported.",
    missingDataRule:
      "Never fabricated from directory counts alone; strictly null ('Pending Verified Data') until state accountability feed is ingested.",
    geographicAggregationRule:
      "Student-enrollment weighted across schools/LEAs within the boundary.",
  },
  {
    formulaId: "norm_sped_intelligence_v1",
    pillarKey: "specializedPrograms",
    title: "Special Education & IEP Support Infrastructure Index (0–100)",
    sourceConnectors: ["waypoint_sped_research", "ga_gosa_gadoe_accountability"],
    equationText:
      "Evaluates IDEA Part B APR indicators (LRE inclusion rates, timely evaluation, dispute resolution) + human-verified specialized program breadth.",
    missingDataRule:
      "Strictly null unless backed by 'Verified' tier Special Education Intelligence + IDEA Part B APR records.",
    geographicAggregationRule:
      "LEA jurisdiction level (never interpolated across non-matching ZIP codes).",
  },
  {
    formulaId: "norm_safety_environment_v1",
    pillarKey: "safetyWellBeing",
    title: "Safety, Hazard Resilience & Environmental Health Index (0–100)",
    sourceConnectors: ["fbi_cde_safety", "fema_nri_hazard", "epa_airnow_ej"],
    equationText:
      "Composite of FEMA National Risk Index (NRI), EPA AirNow air quality, and jurisdiction-level FBI CDE crime rates.",
    missingDataRule:
      "Strictly null until verified safety/environment sources are connected. Coarse jurisdiction crime statistics are never assigned to individual neighborhoods without explicit limitation disclosure.",
    geographicAggregationRule:
      "Reporting agency jurisdiction for FBI CDE; Census tract for FEMA NRI.",
  },
];

/**
 * Pure, deterministic normalization helpers for Milestone B verified data.
 * Never returns 0 or synthetic numbers when inputs are null/invalid.
 */
export function computeNormalizedAffordabilityScore(params: {
  medianHouseholdIncome: number | null | undefined;
  medianHomeValue: number | null | undefined;
  medianGrossRent: number | null | undefined;
}): {
  score: number | null;
  priceToIncomeRatio: number | null;
  rentToIncomePct: number | null;
} {
  const income = params.medianHouseholdIncome;
  const homeVal = params.medianHomeValue;
  const rent = params.medianGrossRent;

  if (
    typeof income !== "number" ||
    income <= 0 ||
    typeof homeVal !== "number" ||
    homeVal <= 0
  ) {
    return { score: null, priceToIncomeRatio: null, rentToIncomePct: null };
  }

  const pir = Number((homeVal / income).toFixed(2));
  const ownerScore = Math.max(
    25,
    Math.min(98, 100 - ((pir - 2.2) / 5.3) * 60)
  );

  if (typeof rent === "number" && rent > 0) {
    const rir = (rent * 12) / income;
    const rentPct = Number((rir * 100).toFixed(1));
    const renterScore = Math.max(
      25,
      Math.min(98, 100 - ((rir - 0.18) / 0.24) * 60)
    );
    const combined = Math.round(ownerScore * 0.65 + renterScore * 0.35);
    return {
      score: Math.max(1, Math.min(100, combined)),
      priceToIncomeRatio: pir,
      rentToIncomePct: rentPct,
    };
  }

  return {
    score: Math.round(ownerScore),
    priceToIncomeRatio: pir,
    rentToIncomePct: null,
  };
}

export function computeNormalizedCommuteScore(
  meanCommuteMinutes: number | null | undefined
): number | null {
  if (
    typeof meanCommuteMinutes !== "number" ||
    !Number.isFinite(meanCommuteMinutes) ||
    meanCommuteMinutes <= 0
  ) {
    return null;
  }
  const raw = 100 - ((meanCommuteMinutes - 16) / 24) * 52;
  return Math.round(Math.max(35, Math.min(98, raw)));
}

export function computeNormalizedFamilyLifestyleScore(params: {
  medianHouseholdIncome: number | null | undefined;
  pupilTeacherRatio: number | null | undefined;
  publicSchoolsCount: number | null | undefined;
}): number | null {
  const { medianHouseholdIncome, pupilTeacherRatio, publicSchoolsCount } = params;
  if (
    typeof medianHouseholdIncome !== "number" ||
    medianHouseholdIncome <= 0 ||
    typeof pupilTeacherRatio !== "number" ||
    pupilTeacherRatio <= 0
  ) {
    return null;
  }

  // Pupil-teacher ratio component (12:1 -> 98, 15.5:1 -> 84, 19:1 -> 68)
  const ptrScore = Math.max(
    45,
    Math.min(98, 100 - ((pupilTeacherRatio - 12.0) / 10.0) * 45)
  );

  // Household resource stability & school network breadth component
  const incomeStability = Math.max(
    50,
    Math.min(96, 62 + ((medianHouseholdIncome - 45000) / 95000) * 32)
  );
  const schoolBonus =
    typeof publicSchoolsCount === "number" && publicSchoolsCount >= 20 ? 3 : 0;

  return Math.round(
    Math.max(40, Math.min(98, ptrScore * 0.55 + incomeStability * 0.45 + schoolBonus))
  );
}

export const CENSUS_TRACT_SPED_GUARDRAIL_DISCLAIMER =
  "Census Tracts and Block Groups measure household socioeconomic, housing, and commuting context (U.S. Census Bureau ACS 5-Year Estimates) and NEVER directly measure special education program quality or individualized IEP service availability.";

export interface PlaceSubCountyTractRecord {
  /** 11-digit Census Tract GEOID (e.g. "13067030104") */
  geoid11: string;
  /** Official Census Tract label (e.g. "Census Tract 301.04") */
  name: string;
  /** Parent 5-digit County FIPS (e.g. "13067") */
  countyFips5: string;
  countyName: string;
  stateCode: string;
  /** Real TIGER/Line / ACS Boundary Polygon or MultiPolygon in WGS84 (EPSG:4326) */
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: any;
  };
  centroid: [number, number];
  /** Real U.S. Census Bureau ACS 5-Year Estimates & 90% Margins of Error */
  populationEstimate: number;
  populationMoe: number;
  medianHouseholdIncome: number;
  medianHouseholdIncomeMoe: number;
  medianHomeValue: number;
  medianHomeValueMoe: number;
  medianGrossRent: number;
  medianGrossRentMoe: number;
  meanCommuteMinutes: number;
  meanCommuteMinutesMoe: number;
  priceToIncomeRatio: number | null;
  rentToIncomePct: number | null;
  highMoeWarning: boolean;
  /**
   * Verified Pillar Metrics at the Census Tract level.
   * STRICT GUARDRAIL: `academics`, `specializedPrograms`, and `safetyWellBeing` are ALWAYS `null`
   * at the Census Tract level because Census Tracts never measure special education quality or school performance.
   */
  verifiedPillars: PillarMetrics;
  surveyPeriod: string;
  sourceCitation: string;
  verificationTier: PlacesVerificationTier;
  dataKind: "confirmed_acs_estimate";
  spedGuardrailNotice: string;
  lastUpdated: string;
}

export type TherapySpecialtyCategory =
  | "Speech-Language Pathology"
  | "Occupational Therapy"
  | "Psychology"
  | "Psychiatry"
  | "ABA / Behavior Analysis"
  | "Developmental Specialties"
  | "Physical Therapy"
  | "Multidisciplinary Pediatric Therapy";

export interface PlaceTherapyProviderRecord {
  id: string;
  /** 10-digit National Provider Identifier from CMS NPPES Registry */
  npi10: string;
  providerName: string;
  enumerationType: "NPI-1" | "NPI-2";
  specialtyCategory: TherapySpecialtyCategory;
  taxonomyCode: string;
  taxonomyDescription: string;
  streetAddress: string;
  city: string;
  stateCode: string;
  postalCode: string;
  countyFips5: string;
  countyName: string;
  phone: string | null;
  coordinates: [number, number];
  /** Explicitly distinguishes address-level coordinates from ZIP-centroid estimates */
  coordinatePrecision: "verified_address_location" | "zip_centroid_estimate";
  /**
   * Mandatory NPPES Provenance Guardrails (Requirement #5):
   * Keep pediatric services, autism specialization, insurance, and appointment availability
   * strictly "Unknown" unless explicitly supported by the official NPPES taxonomy/record.
   */
  pediatricServicesStatus?: "Unknown" | "Supported by Pediatric Taxonomy";
  autismSpecializationStatus?: "Unknown";
  insuranceAcceptedStatus?: "Unknown";
  appointmentAvailabilityStatus?: "Unknown";
  verificationTier: PlacesVerificationTier;
  sourceCitation: string;
  lastUpdated: string;
}

export interface AutomatedRefreshJobRecord {
  jobId: string;
  sourceId: DataSourceConnectorId;
  sourceName: string;
  cronExpression: string;
  intervalMs: number;
  enabled: boolean;
  lastExecutionAt: string | null;
  lastExecutionStatus: "succeeded" | "partial_warning" | "failed_preserved_lkg" | "never_run";
  nextExecutionAt: string;
  consecutiveFailures: number;
  preservedLastKnownGoodCount: number;
  lastDuplicatesSkippedCount: number;
  lastRecordsUpsertedCount: number;
  lastError: string | null;
}

export interface PlaceSchoolDistrictBoundaryRecord {
  ncesLeaId7: string;
  name: string;
  countyFips5: string;
  stateFips2: string;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: any;
  };
  sourceCitation: string;
  lastUpdated: string;
}

export const WAYPOINT_PLACES_BUILD_ID = "WP-2026.11.15-REV6";

export interface PlacesBuildAndRuntimeInfo {
  buildId: string;
  serverStartedAt: string;
  processPid: number;
  sqliteDbPath: string;
  verifiedPillarsCount: number;
  totalPillarsCount: number;
  verifiedPillarsList: string[];
  tileProviderSummary: string;
  nppesCoverageSummary: string;
  localAutoRefreshStatus: string;
  cloudflareCronRefreshStatus: string;
}

export interface PublicSubPageSectionToggles {
  showBannerHeader: boolean;
  showCategoryButtons: boolean;
  showQuickStatsCard: boolean;
  showFamilyPriorities: boolean;
  showCountyDemographics: boolean;
  showAreaScoresCard: boolean;
  showPublicSchoolsList: boolean;
  showCompareButton: boolean;
  showNeighborhoodTracts: boolean;
  showIepRightsCard: boolean;
  showSpecializedFacilities: boolean;
  showTherapyProvidersList: boolean;
  showCrimeAndApiGuide: boolean;
}

export const DEFAULT_PUBLIC_SUBPAGE_TOGGLES: PublicSubPageSectionToggles = {
  showBannerHeader: true,
  showCategoryButtons: true,
  showQuickStatsCard: true,
  showFamilyPriorities: true,
  showCountyDemographics: true,
  showAreaScoresCard: true,
  showPublicSchoolsList: true,
  showCompareButton: true,
  showNeighborhoodTracts: false,
  showIepRightsCard: false,
  showSpecializedFacilities: false,
  showTherapyProvidersList: false,
  showCrimeAndApiGuide: false,
};

export const PUBLIC_SUBPAGE_TOGGLE_METADATA: Array<{
  key: keyof PublicSubPageSectionToggles;
  label: string;
  description: string;
  recommendedForPublic: boolean;
}> = [
  {
    key: "showBannerHeader",
    label: "Top Flagship Banner & Moving Truck",
    description: "Waypoint Places header, moving truck graphic, and 50-state IEP continuity card.",
    recommendedForPublic: true,
  },
  {
    key: "showCategoryButtons",
    label: "Map Category & Layer Square Buttons",
    description: "Square buttons below the map (Overall Score, Public Schools, Housing, Commute, etc.).",
    recommendedForPublic: true,
  },
  {
    key: "showQuickStatsCard",
    label: "Right-Side County Quick Stats Card",
    description: "Side panel beside the map with clicked county population, home price, rent, and school count.",
    recommendedForPublic: true,
  },
  {
    key: "showFamilyPriorities",
    label: "My Family Priorities Checklist",
    description: "Interactive checklist where families pick what matters most to calculate their Family Fit.",
    recommendedForPublic: true,
  },
  {
    key: "showCountyDemographics",
    label: "County Housing, Income & Commute Card",
    description: "Plain-English county median household income, home value, rent, and commute summary.",
    recommendedForPublic: true,
  },
  {
    key: "showAreaScoresCard",
    label: "Overall Score & Family Fit Score Card",
    description: "County score summary card inside the Selected Area Guide.",
    recommendedForPublic: true,
  },
  {
    key: "showPublicSchoolsList",
    label: "Local Public Schools List",
    description: "List of public schools in the selected county with grade span and student-teacher ratio.",
    recommendedForPublic: true,
  },
  {
    key: "showCompareButton",
    label: "Compare Counties Button",
    description: "Allows website visitors to compare the selected county side-by-side with another county.",
    recommendedForPublic: true,
  },
  {
    key: "showNeighborhoodTracts",
    label: "Sub-County Neighborhood Census Tracts",
    description: "Detailed Census Tract GEOID breakdown and tract-level ACS table.",
    recommendedForPublic: false,
  },
  {
    key: "showIepRightsCard",
    label: "State IEP Rights & Legal Accountability Card",
    description: "State dispute timelines, OCR enforcement, and IDEA Part B monitoring console.",
    recommendedForPublic: false,
  },
  {
    key: "showSpecializedFacilities",
    label: "Specialized & Residential Schools Directory",
    description: "10-category private autism/DD day schools, PRTF, and residential facilities explorer.",
    recommendedForPublic: false,
  },
  {
    key: "showTherapyProvidersList",
    label: "Local Therapy & Medical Providers (NPI)",
    description: "Speech, OT, PT, ABA, and developmental provider directory cards.",
    recommendedForPublic: false,
  },
  {
    key: "showCrimeAndApiGuide",
    label: "Internal Crime, Internet & API Keys Guide",
    description: "Internal staff technical note about FBI CDE, FCC Broadband, and map tile keys.",
    recommendedForPublic: false,
  },
];

export * from "./waypointPlacesRights";
export * from "./waypointPlacesSpecialized";





