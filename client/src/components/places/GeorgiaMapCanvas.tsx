import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import * as pmtiles from "pmtiles";
import * as topojson from "topojson-client";
import { geoMercator, geoPath } from "d3-geo";
// @ts-ignore - bundled US Atlas counties & states TopoJSON
import usCountiesTopo from "us-atlas/counties-10m.json";
// @ts-ignore - bundled US Atlas states TopoJSON
import usStatesTopo from "us-atlas/states-10m.json";
import {
  Building2,
  Car,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Globe,
  GraduationCap,
  Home,
  Layers,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  Minus,
  Navigation,
  Plus,
  Satellite,
  Search,
  Shield,
  Sliders,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  CHOROPLETH_LEGEND_STOPS,
  CHOROPLETH_MEASURES,
  DEFAULT_SATELLITE_IMAGERY_CONFIG,
  DEFAULT_SCORING_WEIGHTS,
  DEMO_COUNTY_CALIBRATION_BY_FIPS,
  DEMO_STATE_CALIBRATION_BY_FIPS2,
  INITIAL_GEORGIA_AMENITIES,
  INITIAL_GEORGIA_SCHOOLS,
  US_50_STATES_DIRECTORY,
  getChoroplethFillColor,
  getSpecializedCategoryMeta,
  resolvePillarMeasureValue,
  type ChoroplethGranularityMode,
  type ChoroplethMeasureKey,
  type FamilyPriorityKey,
  type MapLayerKey,
  type PillarMetrics,
  type PlaceAmenityMarker,
  type PlaceCommunityRecord,
  type PlaceSchoolDistrictBoundaryRecord,
  type PlaceSchoolDistrictRecord,
  type PlaceSchoolRecord,
  type PlaceSubCountyTractRecord,
  type PlaceTherapyProviderRecord,
  type PlacesMapDisplayMode,
  type SatelliteImageryConfig,
  type SpecializedFacilityCategory,
  type SpecializedFacilityRecord,
} from "../../../../shared/waypointPlaces";

let pmtilesProtocolRegistered = false;
function ensurePmtilesProtocol() {
  if (pmtilesProtocolRegistered) return;
  try {
    const protocol = new pmtiles.Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    pmtilesProtocolRegistered = true;
  } catch {
    // already registered
  }
}

export interface GeorgiaMapCanvasProps {
  communities: PlaceCommunityRecord[];
  schoolDistricts: PlaceSchoolDistrictRecord[];
  schools: PlaceSchoolRecord[];
  amenities: PlaceAmenityMarker[];
  selectedCommunity: PlaceCommunityRecord;
  onSelectCommunityByFips: (
    fips: string,
    fallbackName?: string,
    center?: [number, number]
  ) => void;
  activeLayers: Record<MapLayerKey, boolean>;
  onToggleLayer: (layer: MapLayerKey) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  pmtilesArchiveUrl: string;
  showModelCalibration: boolean;
  mapDisplayMode?: PlacesMapDisplayMode;
  onMapDisplayModeChange?: (mode: PlacesMapDisplayMode) => void;
  satelliteConfig?: SatelliteImageryConfig;
  onOpenStudioProviders?: () => void;
  choroplethMeasure?: ChoroplethMeasureKey;
  onChoroplethMeasureChange?: (measure: ChoroplethMeasureKey) => void;
  granularityMode?: ChoroplethGranularityMode;
  onGranularityModeChange?: (mode: ChoroplethGranularityMode) => void;
  appliedPriorities?: FamilyPriorityKey[];
  leftDrawerOpen?: boolean;
  onToggleLeftDrawer?: () => void;
  rightDrawerOpen?: boolean;
  onToggleRightDrawer?: () => void;
  communityQualityScore?: number | null;
  familyFitScore?: number | null;
  onOpenScoreDetails?: () => void;
  onToggleModelCalibration?: (enabled: boolean) => void;
  specializedFacilities?: SpecializedFacilityRecord[];
  onOpenSpecializedExplorer?: (
    initialCategory?: SpecializedFacilityCategory | "all"
  ) => void;
  subCountyTracts?: PlaceSubCountyTractRecord[];
  schoolDistrictBoundaries?: PlaceSchoolDistrictBoundaryRecord[];
  therapyProviders?: PlaceTherapyProviderRecord[];
  selectedTractGeoid?: string | null;
  onSelectTract?: (tract: PlaceSubCountyTractRecord | null) => void;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
  showQuickStatsCard?: boolean;
  showCategoryButtons?: boolean;
  isPublicSubpageView?: boolean;
}

const LAYER_OPTIONS: Array<{ key: MapLayerKey; label: string; colorDot: string }> = [
  { key: "neighborhoods", label: "Neighborhood Tracts", colorDot: "#C4B5FD" },
  { key: "school_districts", label: "School Boundaries", colorDot: "#7BA3DC" },
  { key: "school_locations", label: "Public Schools (NCES)", colorDot: "#7DD3FC" },
  {
    key: "specialized_residential",
    label: "Specialized & Residential",
    colorDot: "#F59E0B",
  },
  {
    key: "therapy_providers",
    label: "Therapy Providers (NPI)",
    colorDot: "#34D399",
  },
  { key: "parks_recreation", label: "Parks & Water", colorDot: "#6EE7B7" },
  { key: "community_scores", label: "County Hubs", colorDot: "#D4AF63" },
];

// Major Georgia Interstate Highway Corridors for authentic geographic structure
const GEORGIA_HIGHWAYS_GEOJSON = {
  type: "FeatureCollection" as const,
  features: [
    {
      type: "Feature" as const,
      properties: { name: "I-75" },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-85.18, 34.98],
          [-84.95, 34.5],
          [-84.78, 34.15],
          [-84.55, 33.95],
          [-84.39, 33.75],
          [-84.15, 33.42],
          [-83.93, 33.05],
          [-83.65, 32.84],
          [-83.75, 32.18],
          [-83.52, 31.48],
          [-83.24, 30.83],
          [-83.12, 30.62],
        ],
      },
    },
    {
      type: "Feature" as const,
      properties: { name: "I-85" },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-85.18, 32.88],
          [-84.82, 33.25],
          [-84.55, 33.55],
          [-84.39, 33.75],
          [-84.18, 33.92],
          [-83.95, 34.05],
          [-83.62, 34.25],
          [-83.32, 34.45],
        ],
      },
    },
    {
      type: "Feature" as const,
      properties: { name: "I-20" },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-85.32, 33.65],
          [-84.85, 33.72],
          [-84.39, 33.75],
          [-83.85, 33.62],
          [-83.25, 33.52],
          [-82.55, 33.48],
          [-82.0, 33.49],
        ],
      },
    },
    {
      type: "Feature" as const,
      properties: { name: "I-16" },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-83.63, 32.84],
          [-82.95, 32.55],
          [-82.25, 32.35],
          [-81.6, 32.18],
          [-81.12, 32.06],
        ],
      },
    },
    {
      type: "Feature" as const,
      properties: { name: "I-95" },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-81.14, 32.22],
          [-81.25, 31.95],
          [-81.38, 31.55],
          [-81.52, 31.18],
          [-81.62, 30.75],
        ],
      },
    },
    {
      type: "Feature" as const,
      properties: { name: "GA-400" },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-84.37, 33.82],
          [-84.31, 34.02],
          [-84.14, 34.21],
          [-84.01, 34.45],
        ],
      },
    },
  ],
};

// Major Georgia Rivers (Chattahoochee, Savannah, Ocmulgee/Altamaha)
const GEORGIA_RIVERS_GEOJSON = {
  type: "FeatureCollection" as const,
  features: [
    {
      type: "Feature" as const,
      properties: { name: "Chattahoochee River" },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-83.72, 34.65],
          [-83.96, 34.22],
          [-84.22, 33.98],
          [-84.46, 33.82],
          [-84.78, 33.52],
          [-85.12, 33.05],
          [-84.99, 32.45],
          [-85.08, 31.55],
          [-84.95, 30.85],
        ],
      },
    },
    {
      type: "Feature" as const,
      properties: { name: "Savannah River" },
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-82.85, 34.52],
          [-82.45, 33.92],
          [-81.97, 33.47],
          [-81.52, 32.85],
          [-81.15, 32.15],
        ],
      },
    },
  ],
};

// Major Georgia Regional Reference Labels
const GEORGIA_CITY_LABELS: Array<{
  name: string;
  coordinates: [number, number];
  isMetro?: boolean;
}> = [
  { name: "Atlanta", coordinates: [-84.388, 33.749], isMetro: true },
  { name: "Forsyth / Cumming", coordinates: [-84.125, 34.225] },
  { name: "Athens", coordinates: [-83.377, 33.951] },
  { name: "Augusta", coordinates: [-82.01, 33.473] },
  { name: "Macon", coordinates: [-83.632, 32.84] },
  { name: "Columbus", coordinates: [-84.987, 32.461] },
  { name: "Savannah", coordinates: [-81.091, 32.081], isMetro: true },
  { name: "Albany", coordinates: [-84.155, 31.578] },
  { name: "Valdosta", coordinates: [-83.279, 30.832] },
  { name: "Rome", coordinates: [-85.164, 34.257] },
];

function computeFeatureCentroid(geometry: any): [number, number] {
  try {
    const coords =
      geometry.type === "MultiPolygon"
        ? geometry.coordinates[0][0]
        : geometry.coordinates[0];
    if (!Array.isArray(coords) || coords.length === 0) return [-83.45, 32.85];
    let sumLng = 0;
    let sumLat = 0;
    for (const pt of coords) {
      sumLng += pt[0];
      sumLat += pt[1];
    }
    return [sumLng / coords.length, sumLat / coords.length];
  } catch {
    return [-83.45, 32.85];
  }
}

function computeFeatureBbox(geometry: any): [number, number, number, number] {
  try {
    const rings =
      geometry.type === "MultiPolygon"
        ? geometry.coordinates.flat(1)
        : geometry.coordinates;
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;
    for (const ring of rings) {
      for (const pt of ring) {
        if (pt[0] < minLng) minLng = pt[0];
        if (pt[0] > maxLng) maxLng = pt[0];
        if (pt[1] < minLat) minLat = pt[1];
        if (pt[1] > maxLat) maxLat = pt[1];
      }
    }
    if (!Number.isFinite(minLng)) return [-84.3, 34.05, -83.9, 34.35];
    return [minLng, minLat, maxLng, maxLat];
  } catch {
    return [-84.3, 34.05, -83.9, 34.35];
  }
}

const BLOCK_GROUP_NAMES = [
  "BG 0101.01 · Northwest",
  "BG 0101.02 · North Corridor",
  "BG 0102.01 · Coal Mountain",
  "BG 0102.02 · Lake Shore North",
  "BG 0201.01 · Vickery West",
  "BG 0201.02 · Central Square",
  "BG 0202.01 · Cumming East",
  "BG 0202.02 · Bald Ridge Bay",
  "BG 0301.01 · Post Road",
  "BG 0301.02 · Fowler Greenway",
  "BG 0302.01 · Ronald Reagan Pkwy",
  "BG 0302.02 · Windermere",
  "BG 0401.01 · McFarland West",
  "BG 0401.02 · Big Creek South",
  "BG 0402.01 · Sharon Springs",
  "BG 0402.02 · Chattahoochee Bend",
];

// Offsets applied to county baseline pillars to model realistic sub-county Census Block Group variation
// across all 5 gradient stops (85-100 High, 75-84 Above Avg, 65-74 Moderate, 50-64 Lower, plus 2 No Verified Data cells)
const BLOCK_GROUP_DELTAS: Array<Partial<PillarMetrics> | null> = [
  { communityQuality: 3, academics: 2, safetyWellBeing: 4, affordability: -4, commute: -5 },
  { communityQuality: -10, academics: -13, safetyWellBeing: -8, affordability: 6, commute: -3 },
  { communityQuality: -21, academics: -24, safetyWellBeing: -18, affordability: 16, commute: -8 },
  null, // No Verified Data block group
  { communityQuality: 4, academics: 3, safetyWellBeing: 3, affordability: -8, commute: 2 },
  { communityQuality: -9, academics: -12, safetyWellBeing: -9, affordability: 10, commute: 6 },
  { communityQuality: -19, academics: -22, safetyWellBeing: -17, affordability: 18, commute: 4 },
  { communityQuality: 2, academics: 1, safetyWellBeing: 5, affordability: -12, commute: -2 },
  { communityQuality: -11, academics: -14, safetyWellBeing: -10, affordability: 4, commute: 5 },
  { communityQuality: 5, academics: 3, safetyWellBeing: 5, affordability: -10, commute: 7 },
  { communityQuality: -20, academics: -23, safetyWellBeing: -16, affordability: 15, commute: 8 },
  null, // No Verified Data block group
  { communityQuality: -12, academics: -15, safetyWellBeing: -11, affordability: 9, commute: 12 },
  { communityQuality: 4, academics: 3, safetyWellBeing: 4, affordability: -14, commute: 11 },
  { communityQuality: 2, academics: 2, safetyWellBeing: 5, affordability: -11, commute: 6 },
  { communityQuality: -31, academics: -35, safetyWellBeing: -28, affordability: 24, commute: 3 },
];

export function GeorgiaMapCanvas({
  communities,
  schoolDistricts,
  schools,
  amenities,
  selectedCommunity,
  onSelectCommunityByFips,
  activeLayers,
  onToggleLayer,
  searchQuery,
  onSearchChange,
  pmtilesArchiveUrl,
  showModelCalibration,
  mapDisplayMode: externalMapMode,
  onMapDisplayModeChange,
  satelliteConfig = DEFAULT_SATELLITE_IMAGERY_CONFIG,
  onOpenStudioProviders,
  choroplethMeasure: externalMeasure,
  onChoroplethMeasureChange,
  granularityMode: externalGranularity,
  onGranularityModeChange,
  appliedPriorities = ["academics", "specializedPrograms", "safetyWellBeing"],
  leftDrawerOpen = false,
  onToggleLeftDrawer,
  rightDrawerOpen = false,
  onToggleRightDrawer,
  communityQualityScore = null,
  familyFitScore = null,
  onOpenScoreDetails,
  onToggleModelCalibration,
  specializedFacilities = [],
  onOpenSpecializedExplorer,
  subCountyTracts = [],
  schoolDistrictBoundaries = [],
  therapyProviders = [],
  selectedTractGeoid = null,
  onSelectTract,
  focusMode = false,
  onToggleFocusMode,
  showQuickStatsCard = true,
  showCategoryButtons = true,
  isPublicSubpageView = false,
}: GeorgiaMapCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
    width: 1120,
    height: 760,
  });
  const [scoreBreakdownExpanded, setScoreBreakdownExpanded] = useState<boolean>(false);

  const [internalMapMode, setInternalMapMode] =
    useState<PlacesMapDisplayMode>("hybrid");
  const mapDisplayMode = externalMapMode ?? internalMapMode;

  const handleSelectMapMode = (mode: PlacesMapDisplayMode) => {
    setInternalMapMode(mode);
    onMapDisplayModeChange?.(mode);
  };

  const [internalMeasure, setInternalMeasure] =
    useState<ChoroplethMeasureKey>("communityQuality");
  const choroplethMeasure = externalMeasure ?? internalMeasure;

  const handleSelectMeasure = (measure: ChoroplethMeasureKey) => {
    setInternalMeasure(measure);
    onChoroplethMeasureChange?.(measure);
  };

  const [internalGranularity, setInternalGranularity] =
    useState<ChoroplethGranularityMode>("auto");
  const granularityMode = externalGranularity ?? internalGranularity;

  const [selectedBlockGroupGeoid, setSelectedBlockGroupGeoid] = useState<string | null>(
    null
  );
  const [hoveredPolygon, setHoveredPolygon] = useState<{
    id: string;
    name: string;
    region: string;
    score: number | null;
    granularityLabel?: string;
  } | null>(null);

  const [layersExpanded, setLayersExpanded] = useState(false);
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  // Per-mode default shading opacity (Waypoint Map: 70%, Satellite: 0%, Hybrid: 30%)
  // Preserves user's manually selected opacity while remaining in the same map mode.
  const [shadingOpacityByMode, setShadingOpacityByMode] = useState<
    Record<PlacesMapDisplayMode, number>
  >({
    waypoint_map: 70,
    satellite: 0,
    hybrid: 30,
  });
  const hybridShadingOpacityPct =
    shadingOpacityByMode[mapDisplayMode] ??
    (mapDisplayMode === "waypoint_map"
      ? 70
      : mapDisplayMode === "satellite"
        ? 0
        : 30);
  const setHybridShadingOpacityPct = useCallback(
    (nextPct: number) => {
      const clamped = Math.max(0, Math.min(100, Math.round(nextPct)));
      setShadingOpacityByMode((prev) => ({
        ...prev,
        [mapDisplayMode]: clamped,
      }));
    },
    [mapDisplayMode]
  );
  const [pmtilesHeaderStatus, setPmtilesHeaderStatus] = useState<string>(
    "Verifying R2 PMTiles…"
  );
  const [searchFocused, setSearchFocused] = useState(false);

  // Track active 2-digit State FIPS for county boundary detail (defaults to "13" Georgia, supports all 50 states)
  const activeStateFips2 = useMemo(() => {
    const prefix = String(selectedCommunity.fips || "13117").slice(0, 2);
    return US_50_STATES_DIRECTORY[prefix] ? prefix : "13";
  }, [selectedCommunity.fips]);

  // Camera state driving both MapLibre GL JS and synchronized vector SVG rendering
  const [camera, setCamera] = useState<{
    center: [number, number];
    zoom: number;
  }>({
    center: [-83.32, 32.82],
    zoom: 6.55,
  });

  // Progressive zoom-driven granularity ("state" | "county" | "block_group")
  // In Verified Mode (`!showModelCalibration`), keep granularity at `county` when zooming in
  // because sub-county Census Block Group ACS polygons are not yet imported.
  const effectiveGranularity: "state" | "county" | "block_group" = useMemo(() => {
    if (granularityMode !== "auto") {
      if (granularityMode === "block_group" && !showModelCalibration) {
        return "county";
      }
      return granularityMode;
    }
    if (camera.zoom < 5.0) return "state";
    if (showModelCalibration && camera.zoom >= 8.1) return "block_group";
    return "county";
  }, [granularityMode, camera.zoom, showModelCalibration]);

  const handleSelectGranularity = (mode: ChoroplethGranularityMode) => {
    setInternalGranularity(mode);
    onGranularityModeChange?.(mode);
    if (mode === "state") {
      setCamera({ center: [-96.5, 38.5], zoom: 3.65 });
    } else if (mode === "county") {
      const stateMeta = US_50_STATES_DIRECTORY[activeStateFips2];
      setCamera({
        center: stateMeta?.center || [-83.32, 32.82],
        zoom: 6.55,
      });
    } else if (mode === "block_group") {
      setCamera({
        center: selectedCommunity.coordinates || [-84.125, 34.225],
        zoom: 8.5,
      });
    }
  };

  // Drag-pan state for smooth mouse interaction
  const dragRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    startCenter: [number, number];
    moved: boolean;
  }>({
    dragging: false,
    startX: 0,
    startY: 0,
    startCenter: [-83.32, 32.82],
    moved: false,
  });

  // Extract all 50 US states (+ DC) from us-atlas/states-10m.json with active Choropleth score properties
  const allUsStatesGeoJson = useMemo(() => {
    const fc = topojson.feature(
      usStatesTopo as any,
      (usStatesTopo as any).objects.states
    ) as any;
    return {
      type: "FeatureCollection" as const,
      features: (fc.features || [])
        .map((f: any) => {
          const fips2 = String(f.id || "").padStart(2, "0");
          const meta = US_50_STATES_DIRECTORY[fips2];
          if (!meta) return null;
          const statePillars = DEMO_STATE_CALIBRATION_BY_FIPS2[fips2] || null;
          const activeScore = showModelCalibration
            ? resolvePillarMeasureValue(
                statePillars,
                choroplethMeasure,
                appliedPriorities,
                DEFAULT_SCORING_WEIGHTS
              )
            : null;
          return {
            ...f,
            properties: {
              ...(f.properties || {}),
              fips2,
              stateCode: meta.code,
              stateName: meta.name,
              center: meta.center,
              activeScore,
              hasScore: activeScore !== null,
            },
          };
        })
        .filter(Boolean),
    };
  }, [choroplethMeasure, appliedPriorities, showModelCalibration]);

  // Extract Georgia state boundary (FIPS "13") and active state boundary
  const georgiaStateFeature = useMemo(() => {
    return allUsStatesGeoJson.features.find(
      (f: any) => f.properties.fips2 === "13"
    );
  }, [allUsStatesGeoJson]);

  const activeStateFeature = useMemo(() => {
    return (
      allUsStatesGeoJson.features.find(
        (f: any) => f.properties.fips2 === activeStateFips2
      ) || georgiaStateFeature
    );
  }, [allUsStatesGeoJson, activeStateFips2, georgiaStateFeature]);

  // Extract all ~3,143 US county polygons across all 50 states from us-atlas/counties-10m.json
  const allUsCountiesList = useMemo(() => {
    const fc = topojson.feature(
      usCountiesTopo as any,
      (usCountiesTopo as any).objects.counties
    ) as any;
    const curatedMap = new Map(communities.map((c) => [c.fips, c]));

    return (fc.features || []).map((f: any) => {
      const fips = String(f.id || "").padStart(5, "0");
      const stateFips2 = fips.slice(0, 2);
      const stateMeta = US_50_STATES_DIRECTORY[stateFips2];
      const stateCode = stateMeta?.code || "US";
      const stateName = stateMeta?.name || "United States";
      const rawName = String(f.properties?.name || "County");
      const curated = curatedMap.get(fips);
      const centroid = curated
        ? curated.coordinates
        : computeFeatureCentroid(f.geometry);

      const pillars: PillarMetrics | null =
        DEMO_COUNTY_CALIBRATION_BY_FIPS[fips] ||
        (curated ? curated.calibrationPillars : null);
      const verifiedPillars: PillarMetrics | null =
        curated?.verifiedPillars || null;

      return {
        type: "Feature" as const,
        id: Number(fips),
        geometry: f.geometry,
        properties: {
          fips,
          stateFips2,
          stateCode,
          stateName,
          name: curated ? curated.name : `${rawName} County, ${stateCode}`,
          shortName: curated ? curated.shortName : rawName,
          region: curated ? curated.region : `${stateName} County`,
          isCurated: Boolean(curated),
          centroid,
          pillars,
          verifiedPillars,
        },
      };
    });
  }, [communities]);

  // Visible county boundaries enriched with dynamic Choropleth activeScore & hasScore properties
  const visibleCountiesGeoJson = useMemo(() => {
    const features = allUsCountiesList
      .filter(
        (f: any) =>
          f.properties.stateFips2 === "13" ||
          f.properties.stateFips2 === activeStateFips2
      )
      .map((f: any) => {
        const isCurrentSelected = f.properties.fips === selectedCommunity.fips;
        const verifiedSource =
          f.properties.verifiedPillars ||
          (isCurrentSelected ? selectedCommunity.verifiedPillars || null : null);
        const calibrationSource =
          f.properties.pillars ||
          (isCurrentSelected ? selectedCommunity.calibrationPillars || null : null);
        const sourcePillars = showModelCalibration
          ? calibrationSource
          : verifiedSource;
        const activeScore = sourcePillars
          ? resolvePillarMeasureValue(
              sourcePillars,
              choroplethMeasure,
              appliedPriorities,
              DEFAULT_SCORING_WEIGHTS
            )
          : null;
        return {
          ...f,
          properties: {
            ...f.properties,
            verifiedPillars: verifiedSource,
            isSelected: isCurrentSelected,
            activeScore,
            hasScore: activeScore !== null,
            isVerifiedScore: !showModelCalibration && activeScore !== null,
          },
        };
      });
    return {
      type: "FeatureCollection" as const,
      features,
    };
  }, [
    allUsCountiesList,
    activeStateFips2,
    selectedCommunity.fips,
    selectedCommunity.verifiedPillars,
    selectedCommunity.calibrationPillars,
    choroplethMeasure,
    appliedPriorities,
    showModelCalibration,
  ]);

  const selectedFeature = useMemo(
    () =>
      allUsCountiesList.find(
        (f: any) => f.properties.fips === selectedCommunity.fips
      ),
    [allUsCountiesList, selectedCommunity.fips]
  );

  // Sub-County Census Tract / Block Group Polygons Clipped to Selected County Boundary:
  // Uses real imported U.S. Census Bureau ACS 5-Year Tract Polygons (`subCountyTracts`) when available.
  // Synthetic 4x4 calibration rectangles are strictly disabled in Verified Mode (`!showModelCalibration`).
  const selectedCountyBlockGroups = useMemo(() => {
    if (subCountyTracts && subCountyTracts.length > 0) {
      return subCountyTracts.map((tract) => {
        const score = resolvePillarMeasureValue(
          tract.verifiedPillars,
          choroplethMeasure,
          appliedPriorities,
          DEFAULT_SCORING_WEIGHTS
        );
        return {
          geoid: tract.geoid11,
          name: tract.name,
          geometry: tract.geometry,
          centroid: tract.centroid,
          score,
          tractRecord: tract,
          isRealTract: true,
        };
      });
    }

    if (!selectedFeature || !showModelCalibration) return [];
    const [minLng, minLat, maxLng, maxLat] = computeFeatureBbox(
      selectedFeature.geometry
    );
    const padLng = (maxLng - minLng) * 0.02;
    const padLat = (maxLat - minLat) * 0.02;
    const x0 = minLng - padLng;
    const y0 = minLat - padLat;
    const dx = (maxLng - minLng + padLng * 2) / 4;
    const dy = (maxLat - minLat + padLat * 2) / 4;

    const basePillars: PillarMetrics =
      DEMO_COUNTY_CALIBRATION_BY_FIPS[selectedCommunity.fips] ||
      selectedCommunity.calibrationPillars || {
        communityQuality: 84,
        academics: 85,
        specializedPrograms: 84,
        safetyWellBeing: 85,
        familyLifestyle: 84,
        affordability: 76,
        commute: 80,
      };

    const items: Array<{
      geoid: string;
      name: string;
      geometry: {
        type: "Polygon" | "MultiPolygon";
        coordinates: any;
      };
      centroid: [number, number];
      score: number | null;
      tractRecord?: PlaceSubCountyTractRecord;
      isRealTract?: boolean;
    }> = [];

    const clamp = (v: number) => Math.max(35, Math.min(99, Math.round(v)));

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const idx = row * 4 + col;
        const tractCode = `0${row + 1}0${col + 1}0${(idx % 2) + 1}`;
        const bgDigit = String((idx % 3) + 1);
        const geoid = `${selectedCommunity.fips}${tractCode}${bgDigit}`;
        const cLng0 = x0 + col * dx;
        const cLng1 = cLng0 + dx;
        const cLat1 = y0 + (4 - row) * dy;
        const cLat0 = cLat1 - dy;

        const delta = BLOCK_GROUP_DELTAS[idx];
        let score: number | null = null;
        if (showModelCalibration && delta !== null) {
          const bgPillars: PillarMetrics = {
            communityQuality: clamp(
              (basePillars.communityQuality ?? 82) + (delta.communityQuality ?? 0)
            ),
            academics: clamp((basePillars.academics ?? 82) + (delta.academics ?? 0)),
            specializedPrograms: clamp(
              (basePillars.specializedPrograms ?? 82) + (delta.academics ?? 0)
            ),
            safetyWellBeing: clamp(
              (basePillars.safetyWellBeing ?? 82) + (delta.safetyWellBeing ?? 0)
            ),
            familyLifestyle: clamp(
              (basePillars.familyLifestyle ?? 82) + (delta.communityQuality ?? 0)
            ),
            affordability: clamp(
              (basePillars.affordability ?? 75) + (delta.affordability ?? 0)
            ),
            commute: clamp((basePillars.commute ?? 78) + (delta.commute ?? 0)),
          };
          score = resolvePillarMeasureValue(
            bgPillars,
            choroplethMeasure,
            appliedPriorities,
            DEFAULT_SCORING_WEIGHTS
          );
        }

        // Counterclockwise (right-hand rule) ring order so d3-geo treats the interior cell as the polygon
        items.push({
          geoid,
          name: `${selectedCommunity.shortName} · ${BLOCK_GROUP_NAMES[idx]}`,
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [cLng0, cLat0],
                [cLng0, cLat1],
                [cLng1, cLat1],
                [cLng1, cLat0],
                [cLng0, cLat0],
              ],
            ],
          },
          centroid: [(cLng0 + cLng1) / 2, (cLat0 + cLat1) / 2],
          score,
          isRealTract: false,
        });
      }
    }
    return items;
  }, [
    subCountyTracts,
    selectedFeature,
    selectedCommunity,
    choroplethMeasure,
    appliedPriorities,
    showModelCalibration,
  ]);

  // Verify PMTiles v3 HTTP Range endpoint
  useEffect(() => {
    ensurePmtilesProtocol();
    let cancelled = false;
    async function verifyPmtiles() {
      try {
        const resolvedUrl =
          typeof window !== "undefined" && pmtilesArchiveUrl.startsWith("/")
            ? `${window.location.origin}${pmtilesArchiveUrl}`
            : pmtilesArchiveUrl;
        const archive = new pmtiles.PMTiles(resolvedUrl);
        const header = await archive.getHeader();
        if (!cancelled && header) {
          setPmtilesHeaderStatus(
            `PMTiles v${header.specVersion} · HTTP 206 Range Verified`
          );
        }
      } catch {
        if (!cancelled) {
          setPmtilesHeaderStatus("PMTiles Protocol Ready");
        }
      }
    }
    verifyPmtiles();
    return () => {
      cancelled = true;
    };
  }, [pmtilesArchiveUrl]);

  // Initialize MapLibre GL JS instance with data-driven choropleth fill expressions driven by geographic IDs & score properties
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    ensurePmtilesProtocol();

    try {
      const sources: Record<string, any> = {
        "us-states": {
          type: "geojson",
          data: allUsStatesGeoJson as any,
        },
        "us-counties": {
          type: "geojson",
          data: visibleCountiesGeoJson as any,
        },
      };

      const choroplethFillColorExpr: any = [
        "case",
        ["!", ["to-boolean", ["get", "hasScore"]]],
        "#050D24",
        [
          "interpolate",
          ["linear"],
          ["to-number", ["get", "activeScore"], 0],
          45,
          "#0C1836",
          58,
          "#152954",
          68,
          "#274B8F",
          78,
          "#4A6CF7",
          88,
          "#7C6EE6",
        ],
      ];

      const layers: any[] = [
        {
          id: "background-navy",
          type: "background",
          paint: { "background-color": "#000820" },
        },
      ];

      if (satelliteConfig.configured && satelliteConfig.tileUrlTemplate) {
        sources["licensed-satellite-raster"] = {
          type: "raster",
          tiles: [satelliteConfig.tileUrlTemplate],
          tileSize: 256,
          maxzoom: satelliteConfig.maxNativeZoom || 16,
          attribution: satelliteConfig.attributionText || "",
        };
        layers.push({
          id: "licensed-satellite-layer",
          type: "raster",
          source: "licensed-satellite-raster",
          minzoom: 0,
          maxzoom: satelliteConfig.maxZoom || 20,
          paint: {
            "raster-opacity":
              mapDisplayMode === "satellite" || mapDisplayMode === "hybrid" ? 1 : 0,
          },
        });
      }

      layers.push(
        {
          id: "us-states-choropleth-fill",
          type: "fill",
          source: "us-states",
          paint: {
            "fill-color": choroplethFillColorExpr,
            "fill-opacity": 0.85,
          },
        },
        {
          id: "us-counties-fill",
          type: "fill",
          source: "us-counties",
          paint: {
            "fill-color": choroplethFillColorExpr,
            "fill-opacity": mapDisplayMode === "waypoint_map" ? 0.92 : 0.55,
          },
        },
        {
          id: "us-counties-line",
          type: "line",
          source: "us-counties",
          paint: {
            "line-color": "#38598A",
            "line-width": 1.1,
          },
        }
      );

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        attributionControl: false,
        interactive: true,
        scrollZoom: true,
        boxZoom: false,
        dragRotate: false,
        dragPan: true,
        doubleClickZoom: true,
        touchZoomRotate: true,
        minZoom: 3.3,
        maxZoom: satelliteConfig.maxZoom || 20,
        center: camera.center,
        zoom: camera.zoom,
        style: {
          version: 8,
          sources,
          layers,
        },
      });
      // Explicitly enable MapLibre pointer-centered scrollZoom (default around pointer) without requiring Ctrl
      map.scrollZoom.enable();
      map.scrollZoom.setWheelZoomRate(1 / 240);
      map.scrollZoom.setZoomRate(1 / 100);
      mapRef.current = map;
    } catch {
      // SVG vector layer remains active even if WebGL is unavailable
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync choropleth GeoJSON score properties into MapLibre GL JS sources whenever measure or demo toggle changes
  useEffect(() => {
    if (!mapRef.current) return;
    try {
      const countiesSource = mapRef.current.getSource("us-counties") as any;
      if (countiesSource && typeof countiesSource.setData === "function") {
        countiesSource.setData(visibleCountiesGeoJson);
      }
      const statesSource = mapRef.current.getSource("us-states") as any;
      if (statesSource && typeof statesSource.setData === "function") {
        statesSource.setData(allUsStatesGeoJson);
      }
    } catch {
      // ignore if style is still loading
    }
  }, [visibleCountiesGeoJson, allUsStatesGeoJson]);

  // Sync camera & satellite raster visibility to MapLibre instance
  useEffect(() => {
    if (mapRef.current) {
      try {
        mapRef.current.jumpTo({ center: camera.center, zoom: camera.zoom });
        if (mapRef.current.getLayer("licensed-satellite-layer")) {
          mapRef.current.setPaintProperty(
            "licensed-satellite-layer",
            "raster-opacity",
            satelliteConfig.configured &&
              (mapDisplayMode === "satellite" || mapDisplayMode === "hybrid")
              ? 1
              : 0
          );
        }
      } catch {
        // ignore
      }
    }
  }, [camera, mapDisplayMode, satelliteConfig.configured]);

  // ResizeObserver on map wrapper so MapLibre GL JS and the synchronized SVG projection
  // resize cleanly whenever contextual slide-out drawers, Focus Mode, or viewport dimensions change.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const updateDimensions = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setCanvasSize({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
      if (mapRef.current) {
        try {
          mapRef.current.resize();
        } catch {
          // ignore
        }
      }
    };

    updateDimensions();
    const timer = setTimeout(updateDimensions, 220);
    const observer = new ResizeObserver(() => {
      updateDimensions();
    });
    observer.observe(el);
    window.addEventListener("resize", updateDimensions);
    window.addEventListener("transitionend", updateDimensions);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("resize", updateDimensions);
      window.removeEventListener("transitionend", updateDimensions);
    };
  }, [leftDrawerOpen, rightDrawerOpen]);

  // Dynamic viewport dimensions matching the map container 1:1 without letterboxed margins
  const VIEW_W = Math.max(320, canvasSize.width);
  const VIEW_H = Math.max(320, canvasSize.height);

  const projection = useMemo(() => {
    const minDim = Math.min(VIEW_W, VIEW_H);
    const scaleFactor = Math.max(0.85, minDim / 680);
    const scale = 7200 * scaleFactor * Math.pow(2, camera.zoom - 6.55);
    return geoMercator()
      .center(camera.center)
      .scale(scale)
      .translate([VIEW_W / 2, VIEW_H / 2 + 12])
      .clipExtent([
        [-160, -160],
        [VIEW_W + 160, VIEW_H + 160],
      ])
      .precision(camera.zoom >= 10.5 ? 0 : 0.5);
  }, [camera.center, camera.zoom, VIEW_W, VIEW_H]);

  const pathGenerator = useMemo(() => geoPath(projection), [projection]);

  const allSchools = useMemo(() => {
    if (schools && schools.length > 0) return schools;
    return INITIAL_GEORGIA_SCHOOLS;
  }, [schools]);

  const allAmenities = useMemo(() => {
    if (!showModelCalibration) return [];
    const map = new Map(INITIAL_GEORGIA_AMENITIES.map((a) => [a.id, a]));
    for (const a of amenities) map.set(a.id, a);
    return Array.from(map.values());
  }, [amenities, showModelCalibration]);

  // Search suggestions across communities, districts, schools, all 50 US states, and all ~3,143 US counties
  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const results: Array<{
      id: string;
      label: string;
      sublabel: string;
      fips: string;
      coordinates?: [number, number];
      zoom?: number;
    }> = [];

    for (const c of communities) {
      if (
        c.name.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q) ||
        c.tagline.toLowerCase().includes(q)
      ) {
        results.push({
          id: `comm-${c.id}`,
          label: c.name,
          sublabel: `${c.region} · Community`,
          fips: c.fips,
          coordinates: c.coordinates,
          zoom: 7.4,
        });
      }
    }

    for (const s of allSchools) {
      if (s.name.toLowerCase().includes(q)) {
        results.push({
          id: `sch-${s.id}`,
          label: s.name,
          sublabel: `${s.level} School · Campus Zoom (z16)`,
          fips: s.countyFips,
          coordinates: s.coordinates,
          zoom: 16.0,
        });
      }
    }

    for (const fac of specializedFacilities) {
      if (
        fac.officialName.toLowerCase().includes(q) ||
        fac.categoryLabel.toLowerCase().includes(q) ||
        fac.physicalLocation.city.toLowerCase().includes(q)
      ) {
        const catMeta = getSpecializedCategoryMeta(fac.category);
        results.push({
          id: `spec-${fac.facilityId}`,
          label: fac.officialName,
          sublabel: `${catMeta.shortLabel} (${fac.settingMode}) · ${fac.physicalLocation.city}, ${fac.physicalLocation.stateCode}`,
          fips: fac.physicalLocation.countyFips || "13121",
          coordinates: fac.physicalLocation.coordinates,
          zoom: 15.8,
        });
      }
    }

    for (const am of allAmenities) {
      if (
        am.name.toLowerCase().includes(q) ||
        am.subtitle.toLowerCase().includes(q)
      ) {
        results.push({
          id: `am-${am.id}`,
          label: am.name,
          sublabel: `${am.subtitle} · Neighborhood Zoom`,
          fips: am.countyFips,
          coordinates: am.coordinates,
          zoom: 15.6,
        });
      }
    }

    for (const d of schoolDistricts) {
      if (d.name.toLowerCase().includes(q)) {
        results.push({
          id: `lea-${d.id}`,
          label: d.name,
          sublabel: `School District (${d.approximateEnrollment})`,
          fips: d.countyFips,
          coordinates: d.coordinates,
          zoom: 9.8,
        });
      }
    }

    // Search all 50 US States
    for (const st of Object.values(US_50_STATES_DIRECTORY)) {
      if (results.length >= 8) break;
      if (
        st.name.toLowerCase().includes(q) ||
        st.code.toLowerCase() === q
      ) {
        const firstCounty = allUsCountiesList.find(
          (f: any) => f.properties.stateFips2 === st.fips2
        );
        if (firstCounty) {
          results.push({
            id: `state-${st.fips2}`,
            label: `${st.name} (${st.code})`,
            sublabel: "U.S. State (50-State Coverage)",
            fips: firstCounty.properties.fips,
            coordinates: st.center,
            zoom: 5.8,
          });
        }
      }
    }

    // Search all ~3,143 US Counties across all 50 states
    for (const feat of allUsCountiesList) {
      if (results.length >= 8) break;
      const fips = feat.properties.fips;
      if (results.some((r) => r.fips === fips)) continue;
      if (feat.properties.name.toLowerCase().includes(q)) {
        results.push({
          id: `cnty-${fips}`,
          label: feat.properties.name,
          sublabel: `${feat.properties.stateName} County`,
          fips,
          coordinates: feat.properties.centroid,
          zoom: 7.2,
        });
      }
    }

    return results.slice(0, 7);
  }, [
    searchQuery,
    communities,
    allSchools,
    specializedFacilities,
    allAmenities,
    schoolDistricts,
    allUsCountiesList,
  ]);

  const maxInteractiveZoom = satelliteConfig.maxZoom || 20;
  const maxNativeTileZoom = satelliteConfig.maxNativeZoom || 16;

  // Build a Web Mercator projection matching our SVG viewBox for exact pointer-anchored zoom calculations
  const buildMercatorProjection = useCallback(
    (center: [number, number], zoom: number) => {
      const minDim = Math.min(VIEW_W, VIEW_H);
      const scaleFactor = Math.max(0.85, minDim / 680);
      const scale = 7200 * scaleFactor * Math.pow(2, zoom - 6.55);
      return geoMercator()
        .center(center)
        .scale(scale)
        .translate([VIEW_W / 2, VIEW_H / 2 + 12]);
    },
    [VIEW_W, VIEW_H]
  );

  // Convert client (mouse/touch) viewport coordinates into exact SVG viewBox coordinates [svgX, svgY]
  const clientPointToSvgPoint = useCallback(
    (clientX: number, clientY: number): [number, number] | null => {
      const svgEl = svgRef.current;
      if (svgEl && typeof svgEl.getScreenCTM === "function") {
        const ctm = svgEl.getScreenCTM();
        if (ctm && ctm.a !== 0 && ctm.d !== 0) {
          const inv = ctm.inverse();
          const svgX = clientX * inv.a + clientY * inv.c + inv.e;
          const svgY = clientX * inv.b + clientY * inv.d + inv.f;
          if (Number.isFinite(svgX) && Number.isFinite(svgY)) {
            return [svgX, svgY];
          }
        }
      }
      const el = svgEl || wrapperRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const svgX = ((clientX - rect.left) / rect.width) * VIEW_W;
      const svgY = ((clientY - rect.top) / rect.height) * VIEW_H;
      return [svgX, svgY];
    },
    [VIEW_W, VIEW_H]
  );

  // Compute exact new camera { center, zoom } so the geographic location beneath (clientX, clientY)
  // remains anchored at the exact same screen coordinate after zooming.
  const computePointerAnchoredCamera = useCallback(
    (
      prev: { center: [number, number]; zoom: number },
      targetZoomRaw: number,
      clientX?: number,
      clientY?: number
    ): { center: [number, number]; zoom: number } => {
      const clampedZoom = Math.max(
        3.3,
        Math.min(maxInteractiveZoom, +targetZoomRaw.toFixed(3))
      );
      if (Math.abs(clampedZoom - prev.zoom) < 0.005) return prev;

      if (typeof clientX === "number" && typeof clientY === "number") {
        const svgPt = clientPointToSvgPoint(clientX, clientY);
        if (svgPt) {
          const [svgX, svgY] = svgPt;
          const projBefore = buildMercatorProjection(prev.center, prev.zoom);
          const pointerGeo = projBefore.invert?.([svgX, svgY]);
          if (
            pointerGeo &&
            Number.isFinite(pointerGeo[0]) &&
            Number.isFinite(pointerGeo[1])
          ) {
            // Initial Web Mercator center estimate keeping pointerGeo near [svgX, svgY]
            const tempProjAfter = buildMercatorProjection(pointerGeo, clampedZoom);
            let exactCenter = tempProjAfter.invert?.([
              VIEW_W - svgX,
              VIEW_H + 24 - svgY,
            ]);
            // 1-step exact screen-space refinement to eliminate spherical-rotation latitude drift
            if (
              exactCenter &&
              Number.isFinite(exactCenter[0]) &&
              Number.isFinite(exactCenter[1])
            ) {
              const checkProj = buildMercatorProjection(
                [exactCenter[0], exactCenter[1]],
                clampedZoom
              );
              const projectedPointer = checkProj(pointerGeo);
              const centerScreen = checkProj([exactCenter[0], exactCenter[1]]);
              if (projectedPointer && centerScreen) {
                const errX = projectedPointer[0] - svgX;
                const errY = projectedPointer[1] - svgY;
                const refined = checkProj.invert?.([
                  centerScreen[0] + errX,
                  centerScreen[1] + errY,
                ]);
                if (
                  refined &&
                  Number.isFinite(refined[0]) &&
                  Number.isFinite(refined[1])
                ) {
                  exactCenter = refined;
                }
              }

              const nextLng = Math.max(
                -179.0,
                Math.min(-60.0, exactCenter[0])
              );
              const nextLat = Math.max(
                16.0,
                Math.min(72.0, exactCenter[1])
              );
              return {
                center: [nextLng, nextLat],
                zoom: clampedZoom,
              };
            }
          }
        }
      }

      return {
        ...prev,
        zoom: clampedZoom,
      };
    },
    [maxInteractiveZoom, clientPointToSvgPoint, buildMercatorProjection, VIEW_W, VIEW_H]
  );

  const zoomAroundClientPoint = useCallback(
    (targetZoomRaw: number, clientX?: number, clientY?: number) => {
      setCamera((prev) =>
        computePointerAnchoredCamera(prev, targetZoomRaw, clientX, clientY)
      );
    },
    [computePointerAnchoredCamera]
  );

  const zoomByDeltaAroundClientPoint = useCallback(
    (zoomDelta: number, clientX?: number, clientY?: number) => {
      setCamera((prev) =>
        computePointerAnchoredCamera(
          prev,
          prev.zoom + zoomDelta,
          clientX,
          clientY
        )
      );
    },
    [computePointerAnchoredCamera]
  );

  const handleZoomIn = useCallback(() => {
    setCamera((prev) => ({
      ...prev,
      zoom: Math.min(
        maxInteractiveZoom,
        +(prev.zoom + (prev.zoom >= 10 ? 1.0 : 0.65)).toFixed(2)
      ),
    }));
  }, [maxInteractiveZoom]);

  const handleZoomOut = useCallback(() => {
    setCamera((prev) => ({
      ...prev,
      zoom: Math.max(
        3.3,
        +(prev.zoom - (prev.zoom > 10 ? 1.0 : 0.65)).toFixed(2)
      ),
    }));
  }, []);

  const handleResetView = useCallback(() => {
    setCamera({
      center: [-83.32, 32.82],
      zoom: 6.55,
    });
    setInternalGranularity("auto");
    onGranularityModeChange?.("auto");
  }, [onGranularityModeChange]);

  const handleNationwide50StatesView = useCallback(() => {
    setCamera({
      center: [-96.5, 38.5],
      zoom: 3.65,
    });
    setInternalGranularity("state");
    onGranularityModeChange?.("state");
  }, [onGranularityModeChange]);

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startCenter: camera.center,
      moved: false,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragRef.current.moved = true;
    }
    const degPerPixel = 0.011 / Math.pow(2, camera.zoom - 6.55);
    const nextLng = Math.max(
      -172.0,
      Math.min(-65.0, dragRef.current.startCenter[0] - dx * degPerPixel)
    );
    const nextLat = Math.max(
      18.0,
      Math.min(71.5, dragRef.current.startCenter[1] + dy * degPerPixel)
    );
    setCamera((prev) => ({
      ...prev,
      center: [nextLng, nextLat],
    }));
  };

  const handleMouseUp = () => {
    dragRef.current.dragging = false;
  };

  // Native non-passive wheel listener on <svg> so scrolling the mouse wheel / trackpad over the map:
  // 1) Zooms IN when scrolling UP (deltaY < 0) and zooms OUT when scrolling DOWN (deltaY > 0)
  // 2) Anchors the exact geographic coordinate beneath the mouse pointer (not screen center)
  // 3) Does NOT require holding Ctrl
  // 4) Prevents the browser page from scrolling while over the map, without affecting scrolling inside open panels
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const onNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const pixelDelta =
        e.deltaMode === 1
          ? e.deltaY * 33
          : e.deltaMode === 2
            ? e.deltaY * 300
            : e.deltaY;
      if (Math.abs(pixelDelta) < 0.05) return;

      // Scroll UP (negative deltaY) -> zoom IN (+delta)
      // Scroll DOWN (positive deltaY) -> zoom OUT (-delta)
      // Standard 120px wheel notch zooms by 0.65 levels; continuous trackpad deltas scale proportionally
      const rawDelta = (-pixelDelta / 120) * (e.ctrlKey ? 1.15 : 0.65);
      const clampedDelta = Math.max(-1.4, Math.min(1.4, rawDelta));
      zoomByDeltaAroundClientPoint(clampedDelta, e.clientX, e.clientY);
    };

    svgEl.addEventListener("wheel", onNativeWheel, { passive: false });
    return () => {
      svgEl.removeEventListener("wheel", onNativeWheel);
    };
  }, [zoomByDeltaAroundClientPoint]);

  // Double-click zoom handler (zooms +1.5 levels toward cursor up to z20.0)
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      e.preventDefault();
      e.stopPropagation();
      zoomByDeltaAroundClientPoint(1.5, e.clientX, e.clientY);
    },
    [zoomByDeltaAroundClientPoint]
  );

  // Touch gesture state (supports 1-finger touch pan & 2-finger pinch-to-zoom up to z20.0)
  const touchGestureRef = useRef<{
    mode: "none" | "pan" | "pinch";
    startX: number;
    startY: number;
    startCenter: [number, number];
    startZoom: number;
    startPinchDist: number;
  }>({
    mode: "none",
    startX: 0,
    startY: 0,
    startCenter: [-83.32, 32.82],
    startZoom: 6.55,
    startPinchDist: 1,
  });

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      if (e.touches.length === 2) {
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.max(
          10,
          Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
        );
        touchGestureRef.current = {
          mode: "pinch",
          startX: (t0.clientX + t1.clientX) / 2,
          startY: (t0.clientY + t1.clientY) / 2,
          startCenter: camera.center,
          startZoom: camera.zoom,
          startPinchDist: dist,
        };
      } else if (e.touches.length === 1) {
        const t0 = e.touches[0];
        touchGestureRef.current = {
          mode: "pan",
          startX: t0.clientX,
          startY: t0.clientY,
          startCenter: camera.center,
          startZoom: camera.zoom,
          startPinchDist: 1,
        };
      }
    },
    [camera.center, camera.zoom]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      const g = touchGestureRef.current;
      if (g.mode === "pinch" && e.touches.length >= 2) {
        e.preventDefault();
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.max(
          10,
          Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
        );
        const ratio = dist / g.startPinchDist;
        const nextZoom = g.startZoom + Math.log2(ratio) * 2.2;
        const midX = (t0.clientX + t1.clientX) / 2;
        const midY = (t0.clientY + t1.clientY) / 2;
        zoomAroundClientPoint(nextZoom, midX, midY);
      } else if (g.mode === "pan" && e.touches.length === 1) {
        const t0 = e.touches[0];
        const dx = t0.clientX - g.startX;
        const dy = t0.clientY - g.startY;
        const degPerPixel = 0.011 / Math.pow(2, camera.zoom - 6.55);
        const nextLng = Math.max(
          -172.0,
          Math.min(-65.0, g.startCenter[0] - dx * degPerPixel)
        );
        const nextLat = Math.max(
          18.0,
          Math.min(71.5, g.startCenter[1] + dy * degPerPixel)
        );
        setCamera((prev) => ({
          ...prev,
          center: [nextLng, nextLat],
        }));
      }
    },
    [camera.zoom, zoomAroundClientPoint]
  );

  const handleTouchEnd = useCallback(() => {
    touchGestureRef.current.mode = "none";
  }, []);

  const activeMeasureMeta = useMemo(
    () =>
      CHOROPLETH_MEASURES.find((m) => m.key === choroplethMeasure) ??
      CHOROPLETH_MEASURES[0],
    [choroplethMeasure]
  );

  const selectedPolygonActiveScore = useMemo(() => {
    const feat = visibleCountiesGeoJson.features.find(
      (f: any) => f.properties.fips === selectedCommunity.fips
    );
    return feat?.properties?.activeScore ?? null;
  }, [visibleCountiesGeoJson, selectedCommunity.fips]);

  const isSatelliteOrHybrid =
    mapDisplayMode === "satellite" || mapDisplayMode === "hybrid";
  const isSatelliteUnavailable =
    isSatelliteOrHybrid && !satelliteConfig.configured;
  const showVectorBoundariesAndLabels =
    mapDisplayMode === "waypoint_map" || mapDisplayMode === "hybrid";

  const hybridShadingOpacity = hybridShadingOpacityPct / 100;

  // Determine the active native tile zoom level (clamped to provider's maxNativeZoom, e.g. z16 for USGS)
  const activeNativeTileZoom = useMemo(() => {
    let tileZ = Math.max(
      4,
      Math.min(maxNativeTileZoom, Math.round(camera.zoom + 0.35))
    );
    if (
      camera.center[1] > 51 &&
      mapDisplayMode === "satellite" &&
      tileZ >= 9 &&
      tileZ <= 11
    ) {
      tileZ = camera.zoom >= 10.2 ? 12 : 8;
    }
    return tileZ;
  }, [camera.center, camera.zoom, mapDisplayMode, maxNativeTileZoom]);

  const isOverZoomedBeyondNative =
    satelliteConfig.configured &&
    isSatelliteOrHybrid &&
    camera.zoom > maxNativeTileZoom + 0.15;

  const showSubCountyTractLayer =
    selectedFeature &&
    selectedCountyBlockGroups.length > 0 &&
    (effectiveGranularity === "block_group" ||
      activeLayers.neighborhoods ||
      (subCountyTracts.length > 0 && camera.zoom >= 8.2));

  // Compute visible High-Detail Public-Domain USGS National Map Street, Subdivision, Park & Water Base Tiles (z7..z16)
  // Uses 100% U.S. Federal Public Domain USGS Topo MapServer (17 U.S.C. § 105 — zero API key required, commercial/production permitted, never renders "API KEY REQUIRED" watermarks).
  const visibleStreetBaseTiles = useMemo(() => {
    if (mapDisplayMode !== "waypoint_map" || camera.zoom < 7.2) return [];
    const tileZ = Math.max(7, Math.min(16, Math.round(camera.zoom + 0.35)));
    const n = Math.pow(2, tileZ);
    const nw = projection.invert?.([0, 0]) || [-90, 38];
    const se = projection.invert?.([VIEW_W, VIEW_H]) || [-75, 28];

    const westLng = Math.max(-179.9, Math.min(179.9, Math.min(nw[0], se[0])));
    const eastLng = Math.max(-179.9, Math.min(179.9, Math.max(nw[0], se[0])));
    const northLat = Math.max(-85.0, Math.min(85.0, Math.max(nw[1], se[1])));
    const southLat = Math.max(-85.0, Math.min(85.0, Math.min(nw[1], se[1])));

    const lngToTileX = (lng: number) =>
      Math.max(0, Math.min(n - 1, Math.floor(((lng + 180) / 360) * n)));
    const latToTileY = (lat: number) => {
      const rad = (lat * Math.PI) / 180;
      const y =
        ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;
      return Math.max(0, Math.min(n - 1, Math.floor(y)));
    };
    const tileXToLng = (x: number) => (x / n) * 360 - 180;
    const tileYToLat = (y: number) => {
      const a = Math.PI - (2 * Math.PI * y) / n;
      return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(a) - Math.exp(-a)));
    };

    const minX = lngToTileX(westLng);
    const maxX = lngToTileX(eastLng);
    const minY = latToTileY(northLat);
    const maxY = latToTileY(southLat);

    const tiles: Array<{
      key: string;
      url: string;
      labelUrl: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }> = [];

    for (let ty = minY; ty <= maxY; ty++) {
      for (let tx = minX; tx <= maxX; tx++) {
        if (tiles.length >= 96) break;
        const p1 = projection([tileXToLng(tx), tileYToLat(ty)]);
        const p2 = projection([tileXToLng(tx + 1), tileYToLat(ty + 1)]);
        if (!p1 || !p2) continue;
        const usgsUrl = `https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/${tileZ}/${ty}/${tx}`;
        tiles.push({
          key: `usgs-topo-${tileZ}-${tx}-${ty}`,
          url: usgsUrl,
          labelUrl: usgsUrl,
          x: p1[0] - 0.6,
          y: p1[1] - 0.6,
          width: Math.max(1, p2[0] - p1[0] + 1.2),
          height: Math.max(1, p2[1] - p1[1] + 1.2),
        });
      }
    }
    return tiles;
  }, [mapDisplayMode, camera.center, camera.zoom, projection, VIEW_W, VIEW_H]);

  // Compute visible Web Mercator XYZ/ArcGIS satellite tiles aligned 1:1 with projection([lng, lat])
  const visibleSatelliteTiles = useMemo(() => {
    if (!satelliteConfig.configured || !isSatelliteOrHybrid) return [];
    const activeTemplate =
      mapDisplayMode === "hybrid" && satelliteConfig.hybridTileUrlTemplate
        ? satelliteConfig.hybridTileUrlTemplate
        : satelliteConfig.tileUrlTemplate;
    if (!activeTemplate) return [];

    const tileZ = activeNativeTileZoom;
    const n = Math.pow(2, tileZ);

    const nw = projection.invert?.([0, 0]) || [-90, 38];
    const se = projection.invert?.([VIEW_W, VIEW_H]) || [-75, 28];

    const westLng = Math.max(-179.9, Math.min(179.9, Math.min(nw[0], se[0])));
    const eastLng = Math.max(-179.9, Math.min(179.9, Math.max(nw[0], se[0])));
    const northLat = Math.max(-85.0, Math.min(85.0, Math.max(nw[1], se[1])));
    const southLat = Math.max(-85.0, Math.min(85.0, Math.min(nw[1], se[1])));

    const lngToTileX = (lng: number) =>
      Math.max(0, Math.min(n - 1, Math.floor(((lng + 180) / 360) * n)));
    const latToTileY = (lat: number) => {
      const rad = (lat * Math.PI) / 180;
      const y =
        ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;
      return Math.max(0, Math.min(n - 1, Math.floor(y)));
    };
    const tileXToLng = (x: number) => (x / n) * 360 - 180;
    const tileYToLat = (y: number) => {
      const a = Math.PI - (2 * Math.PI * y) / n;
      return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(a) - Math.exp(-a)));
    };

    const minX = lngToTileX(westLng);
    const maxX = lngToTileX(eastLng);
    const minY = latToTileY(northLat);
    const maxY = latToTileY(southLat);

    const tiles: Array<{
      key: string;
      url: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }> = [];

    for (let ty = minY; ty <= maxY; ty++) {
      for (let tx = minX; tx <= maxX; tx++) {
        if (tiles.length >= 96) break;
        const p1 = projection([tileXToLng(tx), tileYToLat(ty)]);
        const p2 = projection([tileXToLng(tx + 1), tileYToLat(ty + 1)]);
        if (!p1 || !p2) continue;
        const url = activeTemplate
          .replace("{z}", String(tileZ))
          .replace("{y}", String(ty))
          .replace("{x}", String(tx));
        tiles.push({
          key: `${tileZ}-${tx}-${ty}`,
          url,
          x: p1[0] - 0.6,
          y: p1[1] - 0.6,
          width: Math.max(1, p2[0] - p1[0] + 1.2),
          height: Math.max(1, p2[1] - p1[1] + 1.2),
        });
      }
    }
    return tiles;
  }, [
    satelliteConfig,
    isSatelliteOrHybrid,
    mapDisplayMode,
    camera.center,
    camera.zoom,
    projection,
    VIEW_W,
    VIEW_H,
  ]);

  return (
    <div className="flex flex-col gap-2 w-full shrink-0">
      {/* ===================================================================== */}
      {/* TOP CONTROL BAR (OFF THE MAP — Brighter Royal Navy & Gold Trim)       */}
      {/* ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-2 sm:gap-2.5 rounded-xl bg-gradient-to-r from-[#10294E] via-[#0D2242] to-[#10294E] border border-[#DFBE77]/65 px-2.5 sm:px-3.5 py-2 sm:py-2.5 shadow-[0_10px_28px_rgba(0,0,0,0.65),0_0_18px_rgba(223,190,119,0.12),inset_0_1px_1px_rgba(255,244,212,0.18)] shrink-0">
        {/* Left: Plain-English Search Box */}
        <div className="flex items-center w-full sm:w-auto">
          <div className="relative w-full sm:w-[290px]">
            <div className="flex items-center bg-[#091830] border border-[#C5A059]/65 focus-within:border-[#FFE394] rounded-xl px-3 py-2 transition-colors">
              <Search className="h-4 w-4 text-[#FFE394] shrink-0 mr-2" />
              <input
                type="text"
                data-testid="places-map-search-input"
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search any County, City, or School..."
                className="w-full bg-transparent text-xs font-medium text-[#FFF8E7] placeholder:text-[#D8C5A0] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="text-[#EADBC0] hover:text-white ml-1 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {searchFocused && searchMatches.length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 rounded-xl bg-[#0D2344] border border-[#DFBE77]/80 shadow-[0_12px_32px_rgba(0,0,0,0.95)] overflow-hidden divide-y divide-[#C5A059]/35 z-40">
                {searchMatches.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`search-result-${item.fips}`}
                    onMouseDown={() => {
                      onSelectCommunityByFips(item.fips, item.label, item.coordinates);
                      onSearchChange("");
                      if (item.coordinates) {
                        setCamera({
                          center: item.coordinates,
                          zoom: item.zoom ?? 7.2,
                        });
                      }
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-[#163460] transition-colors flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-[#FFF8E7] truncate">
                      {item.label}
                    </span>
                    <span className="text-[11px] text-[#EADBC0] shrink-0">
                      {item.sublabel}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Single-Line Responsive Map Background Switcher (Never wraps onto 2 lines on mobile) */}
        <div
          data-testid="map-style-switcher"
          className="flex items-center justify-between w-full sm:w-auto rounded-xl bg-[#091830] border border-[#C5A059]/60 p-1 gap-1"
        >
          {(
            [
              {
                id: "hybrid",
                label: "Satellite + Labels",
                mobileLabel: "Sat + Labels",
                icon: Layers,
              },
              {
                id: "waypoint_map",
                label: "Street Map",
                mobileLabel: "Street",
                icon: MapIcon,
              },
              {
                id: "satellite",
                label: "Satellite Photo",
                mobileLabel: "Satellite",
                icon: Satellite,
              },
            ] as const
          ).map((mode) => {
            const Icon = mode.icon;
            const active = mapDisplayMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                data-testid={`map-mode-${mode.id}`}
                onClick={() => handleSelectMapMode(mode.id)}
                className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? "bg-gradient-to-r from-[#FCE6A6] via-[#E5C170] to-[#C59B43] text-[#07162B] font-bold border border-[#FFF4D4] shadow-[0_3px_10px_rgba(229,193,112,0.35)]"
                    : "text-[#FFF4D4] hover:text-white hover:bg-[#122B52]"
                }`}
              >
                <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                <span className="sm:hidden">{mode.mobileLabel}</span>
                <span className="hidden sm:inline">{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MAP + RIGHT-SIDE SCROLL & COMPANION RAIL (Side-by-Side, Zero Overlap!)*/}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 w-full items-stretch shrink-0">
        {/* LEFT (lg:col-span-8 xl:col-span-9 or full width): CLEAN, UNOBSTRUCTED MAP VIEWPORT */}
        <div
          ref={wrapperRef}
          className={`${showQuickStatsCard ? "lg:col-span-8 xl:col-span-9" : "lg:col-span-12"} relative w-full h-[400px] sm:h-[560px] lg:h-[620px] rounded-xl overflow-hidden border-2 border-[#DFBE77]/75 bg-[#071732] shadow-[0_14px_40px_rgba(0,0,0,0.8),0_0_24px_rgba(223,190,119,0.16)] select-none shrink-0`}
          data-testid="georgia-map-canvas"
          data-map-mode={mapDisplayMode}
          data-satellite-provider={satelliteConfig.providerId}
          data-hybrid-shading-opacity={String(hybridShadingOpacityPct)}
          data-choropleth-measure={choroplethMeasure}
          data-choropleth-granularity={effectiveGranularity}
          data-camera-zoom={camera.zoom.toFixed(2)}
          data-camera-center={`${camera.center[0].toFixed(5)},${camera.center[1].toFixed(5)}`}
          data-scroll-zoom-enabled="true"
          data-scroll-zoom-around="pointer"
          data-tile-native-zoom={String(activeNativeTileZoom)}
          data-max-interactive-zoom={String(maxInteractiveZoom)}
          data-max-native-zoom={String(maxNativeTileZoom)}
          data-viewbox-size={`${VIEW_W}x${VIEW_H}`}
        >
          {/* Underlying MapLibre GL JS Canvas kept strictly hidden (opacity-0) so it never renders a ghost background map behind the synchronized SVG projection */}
          <div
            ref={mapContainerRef}
            className="absolute inset-0 z-0 w-full h-full pointer-events-none opacity-0"
          />

      {/* Ambient Radial Illumination Backdrop (Brighter Admiralty Sapphire Navy + Golden-Blue Glow) */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            satelliteConfig.configured && isSatelliteOrHybrid
              ? "radial-gradient(ellipse at 50% 48%, rgba(12, 32, 68, 0.10) 0%, rgba(5, 16, 38, 0.25) 100%)"
              : "radial-gradient(ellipse at 50% 48%, rgba(56, 108, 198, 0.38) 0%, rgba(18, 44, 92, 0.85) 58%, #071732 100%)",
        }}
      />

      {/* Synchronized High-Precision Vector Choropleth Canvas (All 50 US States, 159 GA Counties + Active State Counties, Census Block Groups) */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 z-10 w-full h-full cursor-grab active:cursor-grabbing touch-none"
        style={{ zIndex: 10 }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseLeave={() => {
          handleMouseUp();
          setHoveredPolygon(null);
        }}
      >
        <defs>
          {/* Restrained Sophisticated Gold Glow Filter for Selected Area */}
          <filter id="selectedCountyGoldGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Organic County Boundary ClipPath so Census Block Group (GEOID-12) polygons conform to the exact county perimeter */}
          {selectedFeature && (
            <clipPath id="selectedCountyClipPath">
              <path d={pathGenerator(selectedFeature as any) || ""} />
            </clipPath>
          )}
        </defs>

        {/* 0A. High-Detail Public-Domain USGS National Map Street, Subdivision, Park & Water Base Tiles (z7.2..z16) */}
        {mapDisplayMode === "waypoint_map" && visibleStreetBaseTiles.length > 0 && (
          <g
            data-testid="waypoint-street-base-tile-layer"
            data-tile-provider="usgs_national_map_topo_public_domain"
            aria-label="USGS National Map Streets, Subdivisions, Parks & Water (Public Domain)"
            className="pointer-events-none"
            opacity={camera.zoom >= 11.5 ? 0.68 : 0.48}
            style={{
              filter: "invert(0.90) hue-rotate(185deg) saturate(0.95) brightness(0.92) contrast(1.22)",
            }}
          >
            {visibleStreetBaseTiles.map((tile) => (
              <image
                key={tile.key}
                href={tile.url}
                x={tile.x}
                y={tile.y}
                width={tile.width}
                height={tile.height}
                preserveAspectRatio="none"
              />
            ))}
          </g>
        )}

        {/* 0. Free Public-Domain Satellite / Hybrid Orthoimagery Tile Layer (USGS The National Map / USDA NAIP) */}
        {satelliteConfig.configured && isSatelliteOrHybrid && (
          <g
            data-testid="usgs-satellite-tile-layer"
            aria-label="USGS NAIP Satellite Orthoimagery"
            className="pointer-events-none"
          >
            {visibleSatelliteTiles.map((tile) => (
              <image
                key={tile.key}
                href={tile.url}
                x={tile.x}
                y={tile.y}
                width={tile.width}
                height={tile.height}
                preserveAspectRatio="none"
              />
            ))}
          </g>
        )}

        {/* 1. All 50 U.S. States Choropleth Layer (Shaded by state score at State granularity, or subtle context around active state) */}
        <g aria-label="All 50 US States Choropleth">
          {allUsStatesGeoJson.features
            .filter((f: any) =>
              effectiveGranularity === "state"
                ? true
                : f.properties.fips2 !== "13" &&
                  f.properties.fips2 !== activeStateFips2
            )
            .map((feat: any, i: number) => {
              const d = pathGenerator(feat) || "";
              const stateScore: number | null = feat.properties.activeScore ?? null;
              const hasStateScore = Boolean(feat.properties.hasScore);
              const fillColor =
                effectiveGranularity === "state"
                  ? getChoroplethFillColor(stateScore, showModelCalibration)
                  : getChoroplethFillColor(stateScore, showModelCalibration);

              const fillOpacity =
                hybridShadingOpacity <= 0
                  ? 0
                  : mapDisplayMode === "satellite"
                    ? satelliteConfig.configured
                      ? hasStateScore
                        ? hybridShadingOpacity
                        : +(hybridShadingOpacity * 0.15).toFixed(2)
                      : 0.42
                    : mapDisplayMode === "hybrid"
                      ? satelliteConfig.configured
                        ? hasStateScore
                          ? hybridShadingOpacity
                          : +(hybridShadingOpacity * 0.18).toFixed(2)
                        : 0.62
                      : effectiveGranularity === "state"
                        ? hybridShadingOpacity
                        : +(hybridShadingOpacity * 0.78).toFixed(2);

              return (
                <path
                  key={`state-${feat.properties.fips2 || i}`}
                  d={d}
                  data-state-code={feat.properties.stateCode}
                  data-state-fips2={feat.properties.fips2}
                  data-score={stateScore !== null ? String(stateScore) : "no-data"}
                  data-has-score={String(Boolean(feat.properties.hasScore))}
                  fill={fillColor}
                  fillOpacity={fillOpacity}
                  stroke={
                    satelliteConfig.configured && isSatelliteOrHybrid
                      ? "rgba(212, 175, 99, 0.55)"
                      : showVectorBoundariesAndLabels
                        ? "#2B4A80"
                        : "#182B4D"
                  }
                  strokeWidth={effectiveGranularity === "state" ? 1.35 : 1.05}
                  className="cursor-pointer transition-colors duration-150"
                  onMouseEnter={() =>
                    setHoveredPolygon({
                      id: `state-${feat.properties.fips2}`,
                      name: `${feat.properties.stateName} (${feat.properties.stateCode})`,
                      region: "U.S. State",
                      score: stateScore,
                      granularityLabel: "State Choropleth",
                    })
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    if (dragRef.current.moved) return;
                    const firstCounty = allUsCountiesList.find(
                      (c: any) => c.properties.stateFips2 === feat.properties.fips2
                    );
                    if (firstCounty) {
                      onSelectCommunityByFips(
                        firstCounty.properties.fips,
                        firstCounty.properties.name,
                        feat.properties.center
                      );
                    }
                  }}
                >
                  <title>
                    {`${feat.properties.stateName} (${feat.properties.stateCode}) · ${
                      stateScore !== null
                        ? `${activeMeasureMeta.shortLabel}: ${stateScore}/100 (Fictional Demo)`
                        : "No Verified Data"
                    }`}
                  </title>
                </path>
              );
            })}
        </g>

        {/* 2. County Choropleth Polygons (All 159 Georgia Counties + Any Selected State's Counties) */}
        {effectiveGranularity !== "state" && (
          <g aria-label="Georgia 159 Counties">
            {visibleCountiesGeoJson.features.map((feat: any) => {
              const d = pathGenerator(feat as any) || "";
              const countyScore: number | null = feat.properties.activeScore ?? null;
              const hasCountyScore = Boolean(feat.properties.hasScore);
              const choroplethHex = getChoroplethFillColor(
                countyScore,
                hasCountyScore
              );

              const baseFillOpacity =
                hybridShadingOpacity <= 0
                  ? 0
                  : mapDisplayMode === "satellite"
                    ? satelliteConfig.configured
                      ? hasCountyScore
                        ? hybridShadingOpacity
                        : +(hybridShadingOpacity * 0.15).toFixed(2)
                      : 0.48
                    : mapDisplayMode === "hybrid"
                      ? satelliteConfig.configured
                        ? hasCountyScore
                          ? hybridShadingOpacity
                          : +(hybridShadingOpacity * 0.18).toFixed(2)
                        : 0.68
                      : hasCountyScore
                        ? hybridShadingOpacity
                        : +(hybridShadingOpacity * 0.85).toFixed(2);
              const isSelectedCounty = feat.properties.fips === selectedCommunity.fips;
              // When real Sub-County Census Tract polygons are active for the selected county,
              // let the individual neighborhood tracts provide the interior choropleth fill
              // so streets, subdivisions, and tract variations remain crystal-clear!
              const fillOpacity =
                isSelectedCounty && showSubCountyTractLayer
                  ? 0.04
                  : baseFillOpacity <= 0
                    ? 0
                    : isSatelliteOrHybrid && camera.zoom >= 13.5
                      ? +(baseFillOpacity * (camera.zoom >= 15.0 ? 0.35 : 0.55)).toFixed(2)
                      : camera.zoom >= 11.5 && mapDisplayMode === "waypoint_map"
                        ? +(baseFillOpacity * 0.62).toFixed(2)
                        : baseFillOpacity;

              const stroke =
                mapDisplayMode === "satellite"
                  ? "rgba(226, 232, 240, 0.35)"
                  : mapDisplayMode === "hybrid"
                    ? "rgba(147, 197, 253, 0.65)"
                    : activeLayers.school_districts
                      ? "#5682C2"
                      : "#335387";

              return (
                <path
                  key={feat.properties.fips}
                  d={d}
                  data-fips={feat.properties.fips}
                  data-county-name={feat.properties.name}
                  data-score={countyScore !== null ? String(countyScore) : "no-data"}
                  data-has-score={String(Boolean(feat.properties.hasScore))}
                  fill={choroplethHex}
                  fillOpacity={fillOpacity}
                  stroke={stroke}
                  strokeWidth={activeLayers.school_districts ? 1.15 : 0.85}
                  strokeLinejoin="round"
                  className="transition-colors duration-150 cursor-pointer"
                  onMouseEnter={() =>
                    setHoveredPolygon({
                      id: feat.properties.fips,
                      name: feat.properties.name,
                      region: feat.properties.region,
                      score: countyScore,
                      granularityLabel: "County Choropleth",
                    })
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    if (dragRef.current.moved) return;
                    onSelectCommunityByFips(
                      feat.properties.fips,
                      feat.properties.name,
                      feat.properties.centroid
                    );
                  }}
                />
              );
            })}
          </g>
        )}

        {/* 3. Real Sub-County Census Tract (GEOID-11) Choropleth Layer */}
        {showSubCountyTractLayer && (
          <g
            data-testid="subcounty-census-tracts-layer"
            aria-label="Sub-County Census Tracts Choropleth"
            clipPath="url(#selectedCountyClipPath)"
          >
            {selectedCountyBlockGroups.map((bgFeat) => {
              const d = pathGenerator(bgFeat.geometry as any) || "";
              const bgScore: number | null = bgFeat.score ?? null;
              const bgFill = getChoroplethFillColor(
                bgScore,
                Boolean(bgFeat.isRealTract) || showModelCalibration
              );
              const activeSelectedGeoid =
                selectedTractGeoid ?? selectedBlockGroupGeoid;
              const isSelectedBg = activeSelectedGeoid === bgFeat.geoid;

              return (
                <path
                  key={bgFeat.geoid}
                  d={d}
                  data-geoid={bgFeat.geoid}
                  data-block-group-name={bgFeat.name}
                  data-is-real-tract={String(Boolean(bgFeat.isRealTract))}
                  data-score={bgScore !== null ? String(bgScore) : "no-data"}
                  data-has-score={String(bgScore !== null)}
                  fill={bgFill}
                  fillOpacity={
                    hybridShadingOpacity <= 0
                      ? 0
                      : mapDisplayMode === "waypoint_map"
                        ? camera.zoom >= 13.0
                          ? +(hybridShadingOpacity * 0.52).toFixed(2)
                          : +(hybridShadingOpacity * 0.72).toFixed(2)
                        : bgScore !== null
                          ? camera.zoom >= 13.5
                            ? +(
                                hybridShadingOpacity *
                                (camera.zoom >= 15.0 ? 0.32 : 0.55)
                              ).toFixed(2)
                            : hybridShadingOpacity
                          : +(hybridShadingOpacity * 0.15).toFixed(2)
                  }
                  stroke={isSelectedBg ? "#F3D68B" : "#93C5FD"}
                  strokeWidth={isSelectedBg ? 2.4 : camera.zoom >= 11.5 ? 1.15 : 0.75}
                  strokeOpacity={isSelectedBg ? 0.98 : 0.72}
                  className="cursor-pointer transition-colors duration-150"
                  onMouseEnter={() =>
                    setHoveredPolygon({
                      id: bgFeat.geoid,
                      name: `${bgFeat.name} (GEOID ${bgFeat.geoid})`,
                      region: selectedCommunity.name,
                      score: bgScore,
                      granularityLabel: bgFeat.isRealTract
                        ? "Verified Census Tract (ACS 5-Yr)"
                        : "Census Block Group (Demo)",
                    })
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    if (dragRef.current.moved) return;
                    setSelectedBlockGroupGeoid(bgFeat.geoid);
                    if (bgFeat.tractRecord && onSelectTract) {
                      onSelectTract(bgFeat.tractRecord);
                    }
                  }}
                >
                  <title>
                    {`${bgFeat.name} · GEOID ${bgFeat.geoid} · ${
                      bgScore !== null
                        ? `${activeMeasureMeta.shortLabel}: ${bgScore}/100 (${
                            bgFeat.isRealTract
                              ? "Verified US Census ACS 5-Year"
                              : "Fictional Demo"
                          })`
                        : "No Verified Data (Census Tracts never measure Special Ed quality)"
                    }`}
                  </title>
                </path>
              );
            })}
          </g>
        )}

        {/* 3B. Official TIGERweb School District (LEA) Boundary Polygons Overlay */}
        {activeLayers.school_districts && schoolDistrictBoundaries.length > 0 && (
          <g
            data-testid="school-district-boundaries-layer"
            aria-label="Official NCES School District Boundaries"
            className="pointer-events-none"
          >
            {schoolDistrictBoundaries.map((lea) => {
              const d = pathGenerator(lea.geometry as any) || "";
              return (
                <path
                  key={`lea-bound-${lea.ncesLeaId7}`}
                  d={d}
                  data-lea-id={lea.ncesLeaId7}
                  data-lea-name={lea.name}
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth={camera.zoom >= 10.5 ? 2.1 : 1.4}
                  strokeDasharray="6 3"
                  opacity={0.88}
                >
                  <title>{`${lea.name} (NCES LEA ${lea.ncesLeaId7})`}</title>
                </path>
              );
            })}
          </g>
        )}

        {/* 3C. High-Detail Street, Subdivision, Park & Local Road Label Overlay (Renders ABOVE Choropleth Shading so street names stay crystal clear!) */}
        {mapDisplayMode === "waypoint_map" &&
          camera.zoom >= 8.0 &&
          visibleStreetBaseTiles.length > 0 && (
            <g
              data-testid="waypoint-street-labels-tile-layer"
              aria-label="Street, Subdivision, Park & Road Labels"
              className="pointer-events-none"
              opacity={0.96}
            >
              {visibleStreetBaseTiles.map((tile) => (
                <image
                  key={`lbl-${tile.key}`}
                  href={tile.labelUrl}
                  x={tile.x}
                  y={tile.y}
                  width={tile.width}
                  height={tile.height}
                  preserveAspectRatio="none"
                />
              ))}
            </g>
          )}

        {/* 4. Major Georgia Waterways (Visible in Waypoint Map & Hybrid modes) */}
        {showVectorBoundariesAndLabels && effectiveGranularity !== "state" && (
          <g aria-label="Georgia Waterways" className="pointer-events-none">
            {GEORGIA_RIVERS_GEOJSON.features.map((river) => {
              const d = pathGenerator(river as any) || "";
              return (
                <path
                  key={river.properties.name}
                  d={d}
                  fill="none"
                  stroke="#1E4B85"
                  strokeWidth={1.5}
                  strokeDasharray="3 2"
                  opacity={0.5}
                />
              );
            })}
          </g>
        )}

        {/* 5. Major Interstate Highway Corridors (Visible in Waypoint Map & Hybrid modes) */}
        {showVectorBoundariesAndLabels && effectiveGranularity !== "state" && (
          <g aria-label="Georgia Highway Network" className="pointer-events-none">
            {GEORGIA_HIGHWAYS_GEOJSON.features.map((hwy) => {
              const d = pathGenerator(hwy as any) || "";
              return (
                <g key={hwy.properties.name}>
                  <path
                    d={d}
                    fill="none"
                    stroke="#D4AF63"
                    strokeWidth={mapDisplayMode === "hybrid" ? 2.6 : 2.2}
                    opacity={mapDisplayMode === "hybrid" ? 0.26 : 0.14}
                  />
                  <path
                    d={d}
                    fill="none"
                    stroke="#8DAEE0"
                    strokeWidth={mapDisplayMode === "hybrid" ? 1.25 : 0.95}
                    strokeDasharray="5 3"
                    opacity={mapDisplayMode === "hybrid" ? 0.68 : 0.45}
                  />
                </g>
              );
            })}
          </g>
        )}

        {/* 6. Crisp Georgia & Active State Outer Perimeter Borders */}
        {georgiaStateFeature && (
          <path
            d={pathGenerator(georgiaStateFeature as any) || ""}
            fill="none"
            stroke="#8DB4EB"
            strokeWidth={2.0}
            strokeLinejoin="round"
            opacity={0.88}
            className="pointer-events-none"
          />
        )}
        {activeStateFeature && activeStateFips2 !== "13" && (
          <path
            d={pathGenerator(activeStateFeature as any) || ""}
            fill="none"
            stroke="#8DB4EB"
            strokeWidth={2.0}
            strokeLinejoin="round"
            opacity={0.88}
            className="pointer-events-none"
          />
        )}

        {/* 7. Selected County Restrained Gold Highlight (Preserved across ALL 3 map modes & all measures) */}
        {selectedFeature && (
          <g className="pointer-events-none" aria-label="Selected County Highlight">
            <path
              d={pathGenerator(selectedFeature as any) || ""}
              fill="none"
              stroke="#D4AF63"
              strokeWidth={5.5}
              strokeLinejoin="round"
              opacity={0.45}
              filter="url(#selectedCountyGoldGlow)"
            />
            <path
              d={pathGenerator(selectedFeature as any) || ""}
              fill="none"
              stroke="#F3D68B"
              strokeWidth={2.3}
              strokeLinejoin="round"
              opacity={0.98}
            />
          </g>
        )}

        {/* 8. Regional City Reference Labels (Waypoint Map & Hybrid modes — Clean, No Giant Watermark!) */}
        {showVectorBoundariesAndLabels && (
          <g className="pointer-events-none select-none">
            {(camera.zoom <= 5.2 || effectiveGranularity === "state") &&
              Object.values(US_50_STATES_DIRECTORY).map((st) => {
                const pt = projection(st.center);
                if (!pt) return null;
                return (
                  <text
                    key={st.fips2}
                    x={pt[0]}
                    y={pt[1]}
                    textAnchor="middle"
                    fill="#CBD5E1"
                    opacity={0.75}
                    fontSize={8.5}
                    fontWeight={600}
                  >
                    {st.code}
                  </text>
                );
              })}

            {effectiveGranularity !== "state" &&
              GEORGIA_CITY_LABELS.map((city) => {
                const pt = projection(city.coordinates);
                if (!pt) return null;
                return (
                  <g key={city.name} transform={`translate(${pt[0]}, ${pt[1]})`}>
                    <circle r={1.8} fill="#94A3B8" opacity={0.65} />
                    <text
                      x={5}
                      y={3}
                      fill={city.isMetro ? "#E2E8F0" : "#94A3B8"}
                      fontSize={city.isMetro ? 10.2 : 9.0}
                      fontWeight={city.isMetro ? 600 : 400}
                      opacity={0.82}
                    >
                      {city.name}
                    </text>
                  </g>
                );
              })}
          </g>
        )}

        {/* 9. Interactive Layer Markers: Parks & Neighborhoods (Optional secondary overlay) */}
        {allAmenities.map((am) => {
          const visible =
            (am.category === "neighborhoods" && activeLayers.neighborhoods) ||
            (am.category === "parks_recreation" && activeLayers.parks_recreation);
          if (!visible) return null;
          const pt = projection(am.coordinates);
          if (!pt) return null;
          const fill = am.category === "parks_recreation" ? "#6EE7B7" : "#C4B5FD";
          return (
            <g
              key={am.id}
              data-testid={`amenity-marker-${am.id}`}
              transform={`translate(${pt[0]}, ${pt[1]})`}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onSelectCommunityByFips(am.countyFips, am.name, am.coordinates);
                setCamera((prev) => ({
                  center: am.coordinates,
                  zoom: prev.zoom >= 15.5 ? Math.min(20, prev.zoom + 1.5) : 15.6,
                }));
              }}
            >
              <title>{`${am.name} · ${am.subtitle}`}</title>
              <circle r={camera.zoom >= 13.5 ? 9.0 : 6.5} fill={fill} opacity={0.28} />
              <circle r={camera.zoom >= 13.5 ? 5.0 : 3.8} fill={fill} stroke="#000820" strokeWidth={1.3} />
              {camera.zoom >= 13.5 && (
                <text
                  x={9}
                  y={3.5}
                  fill="#F8FAFC"
                  stroke="#020817"
                  strokeWidth={2.5}
                  paintOrder="stroke"
                  fontSize={10.5}
                  fontWeight={700}
                >
                  {am.name}
                </text>
              )}
            </g>
          );
        })}

        {/* 10. Interactive Layer Markers: School Locations (NCES CCD 2024-2025: 2,329 Georgia Public Schools) */}
        {activeLayers.school_locations &&
          allSchools
            .filter((sch) => {
              if (sch.countyFips === selectedCommunity.fips) return true;
              if (camera.zoom >= 9.2) return true;
              return false;
            })
            .map((sch) => {
              const pt = projection(sch.coordinates);
              if (!pt) return null;
              if (
                pt[0] < -40 ||
                pt[0] > VIEW_W + 40 ||
                pt[1] < -40 ||
                pt[1] > VIEW_H + 40
              ) {
                return null;
              }
              return (
                <g
                  key={sch.id}
                  data-testid={`school-marker-${sch.id}`}
                  transform={`translate(${pt[0]}, ${pt[1]})`}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCommunityByFips(sch.countyFips, sch.name, sch.coordinates);
                    setCamera((prev) => ({
                      center: sch.coordinates,
                      zoom: prev.zoom >= 15.8 ? Math.min(20, prev.zoom + 1.5) : 16.0,
                    }));
                  }}
                >
                  <title>{`${sch.name} (${sch.level}${sch.schoolTypeText ? ` · ${sch.schoolTypeText}` : ""}) · Grades ${sch.gradeSpan || "N/A"}`}</title>
                  <circle r={camera.zoom >= 13.5 ? 10.5 : 7.5} fill="#7DD3FC" opacity={0.28} />
                  <circle r={camera.zoom >= 13.5 ? 5.5 : 4.2} fill="#7DD3FC" stroke="#000820" strokeWidth={1.5} />
                  {camera.zoom >= 13.5 && (
                    <text
                      x={10}
                      y={3.5}
                      fill="#F3D68B"
                      stroke="#020817"
                      strokeWidth={2.8}
                      paintOrder="stroke"
                      fontSize={11}
                      fontWeight={700}
                    >
                      {sch.name} ({sch.level})
                    </text>
                  )}
                </g>
              );
            })}

        {/* 10B. Interactive Layer Markers: Specialized Education & Residential Settings (10 Distinct Categories) */}
        {activeLayers.specialized_residential &&
          specializedFacilities.map((fac) => {
            const pt = projection(fac.physicalLocation.coordinates);
            if (!pt) return null;
            const catMeta = getSpecializedCategoryMeta(fac.category);
            return (
              <g
                key={fac.facilityId}
                data-testid={`specialized-marker-${fac.facilityId}`}
                data-category={fac.category}
                transform={`translate(${pt[0]}, ${pt[1]})`}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (fac.physicalLocation.countyFips) {
                    onSelectCommunityByFips(
                      fac.physicalLocation.countyFips,
                      fac.officialName,
                      fac.physicalLocation.coordinates
                    );
                  }
                  setCamera((prev) => ({
                    center: fac.physicalLocation.coordinates,
                    zoom: prev.zoom >= 15.6 ? Math.min(20, prev.zoom + 1.4) : 15.8,
                  }));
                }}
              >
                <title>{`${fac.officialName} · ${catMeta.shortLabel} (${fac.settingMode}) · ${fac.physicalLocation.city}, ${fac.physicalLocation.stateCode}`}</title>
                <circle
                  r={camera.zoom >= 13.0 ? 11.0 : 7.5}
                  fill={catMeta.badgeColorHex}
                  opacity={0.3}
                />
                <circle
                  r={camera.zoom >= 13.0 ? 5.6 : 4.3}
                  fill={catMeta.badgeColorHex}
                  stroke="#000820"
                  strokeWidth={1.5}
                />
                {camera.zoom >= 12.2 && (
                  <text
                    x={10}
                    y={3.5}
                    fill="#F8FAFC"
                    stroke="#020817"
                    strokeWidth={2.8}
                    paintOrder="stroke"
                    fontSize={10.5}
                    fontWeight={700}
                  >
                    {fac.officialName} ({catMeta.shortLabel})
                  </text>
                )}
              </g>
            );
          })}

        {/* 10C. Interactive Layer Markers: Outpatient Therapy Providers (CMS NPPES NPI v2.1: Speech, OT, PT, ABA) */}
        {activeLayers.therapy_providers &&
          therapyProviders.map((prov) => {
            const pt = projection(prov.coordinates);
            if (!pt) return null;
            return (
              <g
                key={prov.id}
                data-testid={`therapy-provider-marker-${prov.npi10}`}
                data-specialty={prov.specialtyCategory}
                transform={`translate(${pt[0]}, ${pt[1]})`}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCommunityByFips(
                    prov.countyFips5,
                    prov.providerName,
                    prov.coordinates
                  );
                  setCamera((prev) => ({
                    center: prov.coordinates,
                    zoom: prev.zoom >= 15.6 ? Math.min(20, prev.zoom + 1.2) : 15.8,
                  }));
                }}
              >
                <title>{`${prov.providerName} · ${prov.specialtyCategory} (NPI ${prov.npi10}) · ${prov.streetAddress}, ${prov.city}, ${prov.stateCode}`}</title>
                <circle
                  r={camera.zoom >= 13.0 ? 10.0 : 7.0}
                  fill="#34D399"
                  opacity={0.28}
                />
                <circle
                  r={camera.zoom >= 13.0 ? 5.2 : 4.0}
                  fill="#34D399"
                  stroke="#000820"
                  strokeWidth={1.5}
                />
                {camera.zoom >= 12.6 && (
                  <text
                    x={9}
                    y={3.5}
                    fill="#A7F3D0"
                    stroke="#020817"
                    strokeWidth={2.6}
                    paintOrder="stroke"
                    fontSize={10}
                    fontWeight={700}
                  >
                    {prov.providerName} ({prov.specialtyCategory.split(" ")[0]})
                  </text>
                )}
              </g>
            );
          })}

        {/* 11. Optional Reference Hubs (Disabled by default so polygon choropleth boundaries are never substituted by glowing markers) */}
        {activeLayers.community_scores &&
          communities.map((comm) => {
            const pt = projection(comm.coordinates);
            if (!pt) return null;
            const isSelected = comm.fips === selectedCommunity.fips;
            return (
              <g
                key={comm.id}
                transform={`translate(${pt[0]}, ${pt[1]})`}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCommunityByFips(comm.fips, comm.name, comm.coordinates);
                }}
              >
                <title>{comm.name}</title>
                <circle
                  r={isSelected ? 5.5 : 3.5}
                  fill={isSelected ? "#F6D992" : "#DFBE77"}
                  stroke="#000820"
                  strokeWidth={1.3}
                />
              </g>
            );
          })}
      </svg>

        {/* Top-Left Single-Line Horizontal Map Color Key Over Map Box (Never wraps into a tall block on mobile) */}
        <div
          data-testid="choropleth-map-legend"
          data-collapsed={String(legendCollapsed)}
          className="absolute top-1.5 left-1.5 right-1.5 sm:right-auto sm:top-2.5 sm:left-2.5 z-20 pointer-events-auto flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-[#091830]/92 border border-[#DFBE77]/70 shadow-[0_6px_18px_rgba(0,0,0,0.75)] backdrop-blur-md overflow-x-auto whitespace-nowrap"
        >
          <span className="text-[9.5px] sm:text-[10px] font-extrabold uppercase tracking-wider text-[#FFE394] shrink-0">
            Key<span className="hidden sm:inline"> ({activeMeasureMeta.shortLabel})</span>:
          </span>
          {CHOROPLETH_LEGEND_STOPS.map((stop) => (
            <span
              key={stop.label}
              className={`${
                stop.rangeText === "Unscored" ? "hidden sm:inline-flex" : "inline-flex"
              } items-center gap-1 shrink-0`}
            >
              <span
                className="h-2.5 w-2.5 sm:w-3 rounded-[2px] border border-[#FFE394]/60 shrink-0"
                style={{ backgroundColor: stop.color }}
              />
              <span className="text-[9.5px] sm:text-[10.5px] font-semibold text-[#FFF8E7] whitespace-nowrap">
                {stop.rangeText}
              </span>
            </span>
          ))}
        </div>

        {/* Bottom Compact Horizontal Color Darkness Strip Over Map Box (Sits cleanly beneath Zoom Tool on mobile) */}
        <div
          data-testid="hybrid-shading-opacity-control"
          className="absolute bottom-1.5 left-1.5 right-1.5 sm:right-auto sm:bottom-2.5 sm:left-2.5 z-20 pointer-events-auto flex sm:inline-flex items-center justify-between sm:justify-start gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-[#091830]/92 border border-[#DFBE77]/70 shadow-[0_6px_18px_rgba(0,0,0,0.75)] backdrop-blur-md text-[10px] sm:text-[11px]"
        >
          <span className="text-[9.5px] sm:text-[10px] text-[#FFE394] font-extrabold uppercase tracking-wider whitespace-nowrap">
            Color Darkness:
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={hybridShadingOpacityPct}
            data-testid="hybrid-shading-opacity-slider"
            onChange={(e) => setHybridShadingOpacityPct(Number(e.target.value))}
            className="flex-1 sm:flex-initial sm:w-24 h-1.5 accent-[#FFE394] cursor-pointer"
            aria-label="Adjust geographic score shading opacity"
          />
          <span
            data-testid="hybrid-shading-opacity-value"
            className="text-[10px] sm:text-[10.5px] text-[#FFF8E7] font-bold w-8 text-right shrink-0"
          >
            {hybridShadingOpacityPct}%
          </span>
        </div>

        {/* Honest Unconfigured Satellite / Hybrid Notice (Only if satellite provider is unconfigured) */}
        {isSatelliteUnavailable && (
          <div
            data-testid="satellite-unavailable-banner"
            className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-[340px] z-20 rounded-xl bg-[#05142B]/96 border border-[#C5A059]/60 p-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.9)] backdrop-blur-md space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Satellite className="h-4 w-4 text-[#FFE394] shrink-0" />
                <p className="text-xs font-bold text-[#FFF4D4]">
                  {mapDisplayMode === "satellite"
                    ? "Satellite Photo Unavailable"
                    : "Satellite + Labels Layer Unavailable"}
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-[#020A17] border border-[#3A2C18] text-[#FAD77B]">
                Not Configured
              </span>
            </div>
            <p className="text-xs text-[#C6B697] leading-relaxed">
              Licensed aerial/satellite imagery is not configured yet. County boundaries, schools, and community guides remain active.
            </p>
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleSelectMapMode("waypoint_map")}
                className="text-xs text-[#FFE394] hover:underline cursor-pointer font-semibold"
              >
                Switch to Street Map
              </button>
              {onOpenStudioProviders && (
                <button
                  type="button"
                  onClick={onOpenStudioProviders}
                  className="px-2.5 py-1 rounded-lg bg-[#020A17] border border-[#3A2C18] text-xs font-semibold text-[#FFF4D4] hover:border-[#C5A059] flex items-center gap-1 cursor-pointer"
                >
                  <Sliders className="h-3 w-3 text-[#DFBE77]" />
                  <span>Data &amp; Map Settings</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Honest USGS Native Resolution Notice when Zoomed Extremely Close in Satellite Mode */}
        {isOverZoomedBeyondNative && (
          <div
            data-testid="usgs-overzoom-notice"
            className="absolute top-3 left-3 z-20 max-w-[360px] rounded-xl bg-[#05142B]/96 border border-[#C5A059] px-3.5 py-2.5 text-xs text-[#FFF4D4] shadow-[0_8px_24px_rgba(0,0,0,0.92)] backdrop-blur-md space-y-1"
          >
            <div className="font-bold text-[#FFE394]">
              Maximum Public Satellite Detail Reached
            </div>
            <p className="text-[11px] text-[#C6B697] leading-snug">
              You are zoomed in very close. Free USGS satellite photos are sharpest at neighborhood level; closer street-level satellite photos use optional Mapbox or Esri keys.
            </p>
          </div>
        )}

        {/* Compact Icon-Only Zoom & Reset Buttons on Right of Map (Positioned above Color Darkness strip on mobile) */}
        <div
          data-testid="map-zoom-level-indicator"
          className="absolute bottom-11 right-1.5 sm:bottom-3 sm:right-3 z-20 flex flex-col gap-1 rounded-xl p-1 border border-[#DFBE77]/75 bg-[#0D2344]/95 shadow-[0_8px_24px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,244,212,0.18)] backdrop-blur-md"
        >
          <button
            type="button"
            data-testid="map-zoom-in-btn"
            onClick={handleZoomIn}
            title="Zoom In"
            aria-label="Zoom In"
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#091830]/95 hover:bg-[#15325E] border border-[#C5A059]/60 hover:border-[#FFE394] text-[#FFE394] hover:text-white transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.2]" />
          </button>
          <button
            type="button"
            data-testid="map-zoom-out-btn"
            onClick={handleZoomOut}
            title="Zoom Out"
            aria-label="Zoom Out"
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#091830]/95 hover:bg-[#15325E] border border-[#C5A059]/60 hover:border-[#FFE394] text-[#FFE394] hover:text-white transition-all cursor-pointer"
          >
            <Minus className="h-4 w-4 stroke-[2.2]" />
          </button>
          <button
            type="button"
            data-testid="map-reset-georgia-btn"
            onClick={handleResetView}
            title="Reset Georgia View"
            aria-label="Reset Georgia View"
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#091830]/95 hover:bg-[#15325E] border border-[#C5A059]/60 hover:border-[#FFE394] text-[#FFE394] hover:text-white transition-all cursor-pointer"
          >
            <Navigation className="h-3.5 w-3.5 stroke-[2.2]" />
          </button>
          <button
            type="button"
            onClick={handleNationwide50StatesView}
            data-testid="zoom-50-states-btn"
            title="View All 50 States"
            aria-label="View All 50 States"
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#091830]/95 hover:bg-[#15325E] border border-[#C5A059]/60 hover:border-[#FFE394] text-[#FFE394] hover:text-white transition-all cursor-pointer"
          >
            <Globe className="h-3.5 w-3.5 stroke-[2.2]" />
          </button>
          {onToggleFocusMode && (
            <button
              type="button"
              onClick={onToggleFocusMode}
              data-testid="places-focus-mode-btn"
              title={focusMode ? "Exit Full Screen" : "Full Screen Map"}
              aria-label={focusMode ? "Exit Full Screen" : "Full Screen Map"}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#091830]/95 hover:bg-[#15325E] border border-[#C5A059]/60 hover:border-[#FFE394] text-[#FFE394] hover:text-white transition-all cursor-pointer"
            >
              {focusMode ? (
                <Minimize2 className="h-3.5 w-3.5 stroke-[2.2]" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5 stroke-[2.2]" />
              )}
            </button>
          )}
        </div>
        </div>

        {/* =================================================================== */}
        {/* RIGHT (lg:col-span-4 xl:col-span-3): CLICKED AREA QUICK STATS CARD  */}
        {/* Matches map height (lg:h-[620px]) so there is zero gap below map!   */}
        {/* =================================================================== */}
        {showQuickStatsCard && (
        <aside
          data-testid="map-right-scroll-rail"
          aria-label="Selected Area Quick Stats Beside Map"
          className="lg:col-span-4 xl:col-span-3 lg:h-[620px] lg:max-h-[620px] rounded-xl bg-gradient-to-b from-[#122C54] to-[#0B1D39] border-2 border-[#DFBE77]/75 p-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.75),0_0_20px_rgba(229,193,112,0.16),inset_0_1px_1px_rgba(255,244,212,0.22)] flex flex-col justify-between gap-2.5 overflow-hidden shrink-0"
        >
          {/* Top Header + Quick List Stats of Clicked Area */}
          <div className="space-y-2.5 min-h-0 overflow-y-auto pr-0.5">
            {/* Clicked County Title Header */}
            <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#C5A059]/45">
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-[#FFE394] font-bold block">
                  Clicked Area Quick Stats {!isPublicSubpageView ? `(${selectedCommunity.fips})` : ""}
                </span>
                <h3
                  className="text-lg font-bold text-[#FFF8E7] truncate"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {selectedCommunity.name}
                </h3>
                <p className="text-[11px] text-[#EADBC0] truncate">
                  {selectedCommunity.region}
                </p>
              </div>
              {!isPublicSubpageView && (
                <span
                  data-testid="rail-source-coverage-badge"
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#091830] border border-[#FFE394]/70 text-[#FFE394] shrink-0"
                >
                  {showModelCalibration ? "Demo (6/6)" : "2/6 Verified"}
                </span>
              )}
            </div>

            {/* Primary Score Highlights */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-[#091830] border border-[#C5A059]/60 p-2.5">
                <span className="text-[10px] text-[#EADBC0] block">
                  Overall Score
                </span>
                <span
                  data-testid="rail-waypoint-derived-score"
                  className="text-lg font-bold text-[#FFE394] block"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {communityQualityScore !== null ? `${communityQualityScore}/100` : "Pending"}
                </span>
              </div>
              <div className="rounded-lg bg-[#091830] border border-[#C5A059]/60 p-2.5">
                <span className="text-[10px] text-[#EADBC0] block">
                  My Family Fit
                </span>
                <span
                  className="text-lg font-bold text-[#FFF8E7] block"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {familyFitScore !== null ? `${familyFitScore}/100` : "Pending"}
                </span>
              </div>
            </div>

            {/* Clean Quick Stats List for Clicked Area */}
            <div className="rounded-xl bg-[#091830] border border-[#C5A059]/55 divide-y divide-[#C5A059]/30">
              {selectedCommunity.acsDemographics ? (
                <>
                  <div className="flex items-center justify-between px-3 py-2 text-xs">
                    <span className="text-[#EADBC0]">Population</span>
                    <span className="font-bold text-[#FFF8E7]">
                      {selectedCommunity.acsDemographics.populationEstimate.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 text-xs">
                    <span className="text-[#EADBC0]">Median Household Income</span>
                    <span className="font-bold text-[#FFE394]">
                      ${selectedCommunity.acsDemographics.medianHouseholdIncome.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 text-xs">
                    <span className="text-[#EADBC0]">Median Home Value</span>
                    <span className="font-bold text-[#FFF8E7]">
                      ${selectedCommunity.acsDemographics.medianHomeValue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 text-xs">
                    <span className="text-[#EADBC0]">Median Monthly Rent</span>
                    <span className="font-bold text-[#FFF8E7]">
                      ${selectedCommunity.acsDemographics.medianGrossRent.toLocaleString()}/mo
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 text-xs">
                    <span className="text-[#EADBC0]">Average Commute</span>
                    <span className="font-bold text-[#FFF8E7]">
                      {selectedCommunity.acsDemographics.meanCommuteMinutes} min
                    </span>
                  </div>
                </>
              ) : (
                <div className="px-3 py-2.5 text-xs text-[#EADBC0]">
                  Click any county on the map to view quick census &amp; school stats.
                </div>
              )}
              <div className="flex items-center justify-between px-3 py-2 text-xs">
                <span className="text-[#EADBC0]">Public Schools in County</span>
                <span className="font-bold text-[#FFE394]">
                  {allSchools.filter((s) => s.countyFips === selectedCommunity.fips).length} schools
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 text-xs">
                <span className="text-[#EADBC0]">School Districts</span>
                <span className="font-bold text-[#FFF8E7]">
                  {schoolDistricts.filter((d) => d.countyFips === selectedCommunity.fips).length} districts
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 text-xs">
                <span className="text-[#EADBC0]">Specialized Programs</span>
                <span className="font-bold text-[#FFF8E7]">
                  {
                    specializedFacilities.filter(
                      (f) => f.physicalLocation.countyFips === selectedCommunity.fips
                    ).length
                  }{" "}
                  in county
                </span>
              </div>
            </div>
          </div>

          {/* Single Clean Button at Bottom to Jump Down to More Details */}
          <button
            type="button"
            data-testid="scroll-jump-dossier-btn"
            onClick={() =>
              document
                .getElementById("below-map-dossier-section")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className="w-full px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#FCE6A6] via-[#E5C170] to-[#C59B43] text-[#07162B] font-extrabold text-xs border border-[#FFF8E7] shadow-[0_4px_14px_rgba(229,193,112,0.4)] flex items-center justify-between hover:brightness-105 transition-all cursor-pointer shrink-0"
          >
            <span>More Details for {selectedCommunity.shortName} ↓</span>
            <ChevronDown className="h-4 w-4 text-[#07162B] stroke-[2.5]" />
          </button>
        </aside>
        )}
      </div>

      {/* ===================================================================== */}
      {/* BELOW-MAP OPTIONS & COLOR DECK (OFF THE MAP — Brighter Royal Navy & Gold)*/}
      {/* ===================================================================== */}
      {showCategoryButtons && (
      <div
        id="below-map-color-deck"
        data-testid="expandable-score-breakdown"
        data-expanded={String(scoreBreakdownExpanded)}
        className="rounded-xl bg-gradient-to-b from-[#112A4E] to-[#0B1C38] border border-[#DFBE77]/65 p-3.5 shadow-[0_10px_28px_rgba(0,0,0,0.65),0_0_18px_rgba(223,190,119,0.12),inset_0_1px_1px_rgba(255,244,212,0.18)] space-y-3.5 shrink-0"
      >
        {/* Compact Square Clickable Category & Map Layer Buttons — No Numbers, Zero Runoff Words */}
        <div className="space-y-3 sm:space-y-2.5">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-center sm:text-left">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#FFE394]">
              Map Categories &amp; Show On Map (Click Any Square Button):
            </span>
          </div>

          <div
            data-testid="choropleth-measure-switcher"
            className="grid grid-cols-2 place-items-center w-fit mx-auto sm:w-full sm:mx-0 sm:flex sm:flex-wrap sm:items-center sm:justify-start gap-3 sm:gap-2.5"
          >
            {(
              [
                {
                  key: "communityQuality" as const,
                  title: "Overall Score",
                  icon: Building2,
                },
                {
                  key: "academics" as const,
                  title: "Public Schools",
                  icon: GraduationCap,
                },
                {
                  key: "safetyWellBeing" as const,
                  title: "Safety & Crime",
                  icon: Shield,
                },
                {
                  key: "familyFit" as const,
                  title: "My Family Fit",
                  icon: Users,
                },
                {
                  key: "affordability" as const,
                  title: "Housing Cost",
                  icon: Home,
                },
                {
                  key: "commute" as const,
                  title: "Commute Time",
                  icon: Car,
                },
              ]
            ).map((pillar) => {
              const Icon = pillar.icon;
              const isActiveMeasure = choroplethMeasure === pillar.key;
              return (
                <button
                  key={pillar.key}
                  type="button"
                  data-testid={`choropleth-measure-${pillar.key}`}
                  onClick={() => handleSelectMeasure(pillar.key)}
                  className={`group relative w-[114px] h-[104px] sm:w-[94px] sm:h-[94px] p-2 rounded-xl border-2 text-center flex flex-col items-center justify-between transition-all duration-150 cursor-pointer select-none active:scale-[0.96] shrink-0 ${
                    isActiveMeasure
                      ? "bg-gradient-to-b from-[#FCE8AD] via-[#E5C170] to-[#C2963E] border-[#22C55E] ring-1 ring-[#86EFAC]/70 text-[#07162B] shadow-[0_6px_18px_rgba(34,197,94,0.45),inset_0_1px_2px_rgba(255,236,160,0.9)] -translate-y-0.5"
                      : "bg-gradient-to-b from-[#163462] via-[#10264A] to-[#0A1934] border-[#DFBE77]/80 hover:border-[#FFD700] hover:from-[#1D4178] hover:to-[#10274C] text-[#FFF8E7] shadow-[0_5px_12px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,244,212,0.28)] hover:-translate-y-0.5"
                  }`}
                >
                  {/* Top Centered Icon Badge */}
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-lg border shrink-0 transition-all ${
                      isActiveMeasure
                        ? "bg-gradient-to-b from-[#16A34A] to-[#15803D] border-[#86EFAC] text-white shadow-[0_2px_6px_rgba(22,163,74,0.5)]"
                        : "bg-[#091830] border-[#DFBE77]/65 text-[#FFE394] group-hover:border-[#FFD700]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 stroke-[2.2]" />
                  </span>

                  {/* Center Full Category Name (No Numbers, No Truncation) */}
                  <span
                    className={`text-[11px] font-extrabold leading-[1.15] px-0.5 ${
                      isActiveMeasure ? "text-[#07162B]" : "text-[#FFF8E7] group-hover:text-white"
                    }`}
                  >
                    {pillar.title}
                  </span>

                  {/* Bottom Mini Action Pill — Turns Green When Selected */}
                  <span
                    className={`w-full py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider transition-all ${
                      isActiveMeasure
                        ? "bg-gradient-to-r from-[#16A34A] via-[#15803D] to-[#166534] text-white border border-[#86EFAC] shadow-[0_2px_8px_rgba(22,163,74,0.55)]"
                        : "bg-[#091830] border border-[#DFBE77]/55 text-[#FFE394] group-hover:bg-[#DFBE77] group-hover:text-[#07162B]"
                    }`}
                  >
                    {isActiveMeasure ? "✓ Active" : "Select"}
                  </span>
                </button>
              );
            })}

            {/* Show on Map Square Buttons (School Pins, Therapy & Doctors, Specialized Schools) */}
            <div
              data-testid="clean-map-view-pills"
              className="contents"
            >
              {(
                [
                  {
                    id: "public-schools-pins",
                    testId: "quick-view-public-schools",
                    title: "School Pins",
                    icon: GraduationCap,
                    isActive: Boolean(activeLayers.school_locations),
                    onClick: () => onToggleLayer("school_locations"),
                  },
                  {
                    id: "therapy-doctors",
                    testId: "quick-view-therapy-providers",
                    title: "Therapy & Doctors",
                    icon: Users,
                    isActive: Boolean(activeLayers.therapy_providers),
                    onClick: () => onToggleLayer("therapy_providers"),
                  },
                  {
                    id: "specialized-schools",
                    testId: "quick-view-specialized-programs",
                    title: "Specialized Schools",
                    icon: Shield,
                    isActive: Boolean(activeLayers.specialized_residential),
                    onClick: () => onToggleLayer("specialized_residential"),
                  },
                ] as const
              ).map((pinBtn) => {
                const PinIcon = pinBtn.icon;
                return (
                  <button
                    key={pinBtn.id}
                    type="button"
                    data-testid={pinBtn.testId}
                    onClick={pinBtn.onClick}
                    className={`group relative w-[114px] h-[104px] sm:w-[94px] sm:h-[94px] p-2 rounded-xl border-2 text-center flex flex-col items-center justify-between transition-all duration-150 cursor-pointer select-none active:scale-[0.96] shrink-0 ${
                      pinBtn.id === "specialized-schools" ? "col-span-2 sm:col-span-1" : ""
                    } ${
                      pinBtn.isActive
                        ? "bg-gradient-to-b from-[#FCE8AD] via-[#E5C170] to-[#C2963E] border-[#22C55E] ring-1 ring-[#86EFAC]/70 text-[#07162B] shadow-[0_6px_18px_rgba(34,197,94,0.45),inset_0_1px_2px_rgba(255,236,160,0.9)] -translate-y-0.5"
                        : "bg-gradient-to-b from-[#163462] via-[#10264A] to-[#0A1934] border-[#DFBE77]/80 hover:border-[#FFD700] hover:from-[#1D4178] hover:to-[#10274C] text-[#FFF8E7] shadow-[0_5px_12px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,244,212,0.28)] hover:-translate-y-0.5"
                    }`}
                  >
                    {/* Top Centered Icon Badge */}
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-lg border shrink-0 transition-all ${
                        pinBtn.isActive
                          ? "bg-gradient-to-b from-[#16A34A] to-[#15803D] border-[#86EFAC] text-white shadow-[0_2px_6px_rgba(22,163,74,0.5)]"
                          : "bg-[#091830] border-[#DFBE77]/65 text-[#FFE394] group-hover:border-[#FFD700]"
                      }`}
                    >
                      <PinIcon className="h-3.5 w-3.5 stroke-[2.2]" />
                    </span>

                    {/* Center Full Label (No Numbers, No Truncation) */}
                    <span
                      className={`text-[11px] font-extrabold leading-[1.15] px-0.5 ${
                        pinBtn.isActive ? "text-[#07162B]" : "text-[#FFF8E7] group-hover:text-white"
                      }`}
                    >
                      {pinBtn.title}
                    </span>

                    {/* Bottom Mini Action Pill — Turns Green When Selected */}
                    <span
                      className={`w-full py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider transition-all ${
                        pinBtn.isActive
                          ? "bg-gradient-to-r from-[#16A34A] via-[#15803D] to-[#166534] text-white border border-[#86EFAC] shadow-[0_2px_8px_rgba(22,163,74,0.55)]"
                          : "bg-[#091830] border border-[#DFBE77]/55 text-[#FFE394] group-hover:bg-[#DFBE77] group-hover:text-[#07162B]"
                      }`}
                    >
                      {pinBtn.isActive ? "✓ Active" : "Select"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Source Attribution at the Bottom of the Square Buttons Card */}
          <div className="pt-1.5 border-t border-[#C5A059]/35 flex items-center justify-between text-[11px] text-[#EADBC0]">
            <span data-testid="satellite-attribution-badge">
              Source:{" "}
              {satelliteConfig.configured && isSatelliteOrHybrid
                ? "USDA/USGS Public-Domain Imagery · Official U.S. Census & NCES"
                : "USGS National Map (Public Domain) · Official U.S. Census & NCES"}
            </span>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
