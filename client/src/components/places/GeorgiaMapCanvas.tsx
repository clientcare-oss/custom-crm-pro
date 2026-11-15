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
  type PlaceSchoolDistrictRecord,
  type PlaceSchoolRecord,
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
}

const LAYER_OPTIONS: Array<{ key: MapLayerKey; label: string; colorDot: string }> = [
  { key: "school_districts", label: "School Districts", colorDot: "#7BA3DC" },
  { key: "community_scores", label: "Community Hubs", colorDot: "#D4AF63" },
  { key: "school_locations", label: "School Locations", colorDot: "#7DD3FC" },
  {
    key: "specialized_residential",
    label: "Specialized & Residential",
    colorDot: "#F59E0B",
  },
  { key: "neighborhoods", label: "Neighborhoods", colorDot: "#C4B5FD" },
  { key: "parks_recreation", label: "Parks & Recreation", colorDot: "#6EE7B7" },
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
    useState<PlacesMapDisplayMode>("waypoint_map");
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
  const effectiveGranularity: "state" | "county" | "block_group" = useMemo(() => {
    if (granularityMode !== "auto") return granularityMode;
    if (camera.zoom < 5.0) return "state";
    if (camera.zoom >= 8.1) return "block_group";
    return "county";
  }, [granularityMode, camera.zoom]);

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
        const sourcePillars = showModelCalibration
          ? f.properties.pillars
          : f.properties.verifiedPillars;
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
            isSelected: f.properties.fips === selectedCommunity.fips,
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

  // Sub-County Census Block Group (12-digit GEOID) Polygons Clipped to Selected County Boundary
  const selectedCountyBlockGroups = useMemo(() => {
    if (!selectedFeature) return [];
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
        type: "Polygon";
        coordinates: number[][][];
      };
      centroid: [number, number];
      score: number | null;
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
        });
      }
    }
    return items;
  }, [
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
    const map = new Map(INITIAL_GEORGIA_SCHOOLS.map((s) => [s.id, s]));
    for (const s of schools) map.set(s.id, s);
    return Array.from(map.values());
  }, [schools]);

  const allAmenities = useMemo(() => {
    const map = new Map(INITIAL_GEORGIA_AMENITIES.map((a) => [a.id, a]));
    for (const a of amenities) map.set(a.id, a);
    return Array.from(map.values());
  }, [amenities]);

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
    <div
      ref={wrapperRef}
      className="relative flex-1 w-full h-full min-h-0 rounded-xl overflow-hidden border border-[#24355A] bg-[#000820] shadow-[0_14px_40px_rgba(0,0,0,0.9)] select-none"
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
      {/* Underlying MapLibre GL JS Canvas (handles PMTiles protocol, choropleth fill expressions, & separate licensed satellite raster tiles) */}
      <div
        ref={mapContainerRef}
        className={`absolute inset-0 z-0 w-full h-full pointer-events-none ${
          satelliteConfig.configured && isSatelliteOrHybrid
            ? "opacity-100"
            : "opacity-25"
        }`}
      />

      {/* Ambient Radial Illumination Backdrop (#000820 canonical dark navy + subtle blue/violet glow) */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            satelliteConfig.configured && isSatelliteOrHybrid
              ? "radial-gradient(ellipse at 50% 48%, rgba(5, 16, 40, 0.12) 0%, rgba(2, 8, 24, 0.32) 100%)"
              : "radial-gradient(ellipse at 50% 48%, rgba(30, 64, 138, 0.30) 0%, rgba(7, 20, 50, 0.88) 58%, #000820 100%)",
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
              // Taper county interior fill at neighborhood/campus zoom (z >= 13.5) so aerial buildings & playgrounds remain crisp
              const fillOpacity =
                baseFillOpacity <= 0
                  ? 0
                  : isSatelliteOrHybrid && camera.zoom >= 13.5
                    ? +(baseFillOpacity * (camera.zoom >= 15.0 ? 0.35 : 0.55)).toFixed(2)
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

        {/* 3. Census Block-Group (GEOID-12) Choropleth Layer (Progressive Loading at z >= 8.1 or Block Group Mode) */}
        {effectiveGranularity === "block_group" &&
          selectedFeature &&
          selectedCountyBlockGroups.length > 0 && (
            <g
              aria-label="Census Block Groups Choropleth"
              clipPath="url(#selectedCountyClipPath)"
            >
              {selectedCountyBlockGroups.map((bgFeat) => {
                const d = pathGenerator(bgFeat.geometry as any) || "";
                const bgScore: number | null = bgFeat.score ?? null;
                const bgFill = getChoroplethFillColor(
                  bgScore,
                  showModelCalibration
                );
                const isSelectedBg = selectedBlockGroupGeoid === bgFeat.geoid;

                return (
                  <path
                    key={bgFeat.geoid}
                    d={d}
                    data-geoid={bgFeat.geoid}
                    data-block-group-name={bgFeat.name}
                    data-score={bgScore !== null ? String(bgScore) : "no-data"}
                    data-has-score={String(bgScore !== null)}
                    fill={bgFill}
                    fillOpacity={
                      hybridShadingOpacity <= 0
                        ? 0
                        : mapDisplayMode === "waypoint_map"
                          ? camera.zoom >= 14.0
                            ? +(hybridShadingOpacity * 0.65).toFixed(2)
                            : hybridShadingOpacity
                          : bgScore !== null
                            ? camera.zoom >= 13.5
                              ? +(hybridShadingOpacity * (camera.zoom >= 15.0 ? 0.32 : 0.55)).toFixed(2)
                              : hybridShadingOpacity
                            : +(hybridShadingOpacity * 0.15).toFixed(2)
                    }
                    stroke={isSelectedBg ? "#F3D68B" : "#7BA3E0"}
                    strokeWidth={isSelectedBg ? 2.0 : 0.9}
                    strokeDasharray={isSelectedBg ? undefined : "2 1"}
                    className="cursor-pointer transition-colors duration-150"
                    onMouseEnter={() =>
                      setHoveredPolygon({
                        id: bgFeat.geoid,
                        name: `${bgFeat.name} (${bgFeat.geoid})`,
                        region: selectedCommunity.name,
                        score: bgScore,
                        granularityLabel: "Census Block Group",
                      })
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      if (dragRef.current.moved) return;
                      setSelectedBlockGroupGeoid(bgFeat.geoid);
                    }}
                  >
                    <title>
                      {`${bgFeat.name} · GEOID ${bgFeat.geoid} · ${
                        bgScore !== null
                          ? `${activeMeasureMeta.shortLabel}: ${bgScore}/100 (Fictional Demo)`
                          : "No Verified Data"
                      }`}
                    </title>
                  </path>
                );
              })}
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

        {/* 8. State Watermarks & Regional City Reference Labels (Waypoint Map & Hybrid modes) */}
        {showVectorBoundariesAndLabels && (
          <g className="pointer-events-none select-none">
            {effectiveGranularity !== "state" &&
              (() => {
                const gaCenter = projection([-83.35, 32.68]);
                if (!gaCenter) return null;
                return (
                  <text
                    x={gaCenter[0]}
                    y={gaCenter[1]}
                    textAnchor="middle"
                    fill="#E2E8F0"
                    opacity={0.38}
                    fontSize={18}
                    letterSpacing="0.32em"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    GEORGIA
                  </text>
                );
              })()}

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

        {/* 10. Interactive Layer Markers: School Locations (Optional secondary overlay) */}
        {activeLayers.school_locations &&
          allSchools.map((sch) => {
            const pt = projection(sch.coordinates);
            if (!pt) return null;
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
                <title>{`${sch.name} (${sch.level})`}</title>
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

      {/* Top-Left HUD Cluster: Contextual Slide-Out Triggers + Search Bar + Choropleth Controls */}
      <div className="absolute top-2.5 left-2.5 right-[150px] sm:right-auto z-20 flex flex-col gap-1.5 pointer-events-none">
        {/* Row 1: Find Your Fit Trigger + Search Input + Community Dossier Trigger */}
        <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
          {onToggleLeftDrawer && (
            <button
              type="button"
              data-testid="map-toggle-fit-drawer"
              onClick={onToggleLeftDrawer}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border shadow-[0_8px_24px_rgba(0,0,0,0.85)] backdrop-blur-md transition-all cursor-pointer ${
                leftDrawerOpen
                  ? "bg-[#122B5C] text-[#F3D68B] border-[#D4AF63]/80"
                  : "bg-[#040E26]/95 text-[#F4F6FB] border-[#304570] hover:border-[#D4AF63]/60"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-[#D4AF63]" />
              <span>Find Your Fit</span>
              <span className="px-1 py-0.2 rounded bg-[#0A1A3B] text-[9.5px] text-[#93C5FD]">
                {appliedPriorities.length}
              </span>
            </button>
          )}

          <div className="relative w-[195px] sm:w-[235px]">
            <div className="flex items-center bg-[#040E26]/95 border border-[#304570] focus-within:border-[#D4AF63] rounded-lg px-2.5 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.85)] backdrop-blur-md transition-colors">
              <Search className="h-3.5 w-3.5 text-[#94A3B8] shrink-0 mr-1.5" />
              <input
                type="text"
                data-testid="places-map-search-input"
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search 50 states, counties, schools..."
                className="w-full bg-transparent text-[11px] text-[#F4F6FB] placeholder:text-[#8496B0] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="text-[#8496B0] hover:text-[#F4F6FB] ml-1 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {searchFocused && searchMatches.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 rounded-lg bg-[#05112B]/98 border border-[#364E7A] shadow-2xl overflow-hidden divide-y divide-[#17284A] z-30">
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
                    className="w-full text-left px-3 py-2 hover:bg-[#0F234A] transition-colors flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="text-xs font-medium text-[#F4F6FB] truncate">
                      {item.label}
                    </span>
                    <span className="text-[11px] text-[#94A3B8] shrink-0">
                      {item.sublabel}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {onToggleRightDrawer && (
            <button
              type="button"
              data-testid="map-toggle-dossier-drawer"
              onClick={onToggleRightDrawer}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border shadow-[0_8px_24px_rgba(0,0,0,0.85)] backdrop-blur-md transition-all cursor-pointer ${
                rightDrawerOpen
                  ? "bg-[#122B5C] text-[#F3D68B] border-[#D4AF63]/80"
                  : "bg-[#040E26]/95 text-[#F4F6FB] border-[#304570] hover:border-[#D4AF63]/60"
              }`}
            >
              <Building2 className="h-3.5 w-3.5 text-[#D4AF63]" />
              <span className="max-w-[130px] truncate">{selectedCommunity.shortName}</span>
              <span className="text-[9.5px] text-[#94A3B8]">Dossier</span>
            </button>
          )}
        </div>

        {/* Row 2: Choropleth Shading Measure Switcher */}
        <div
          data-testid="choropleth-measure-switcher"
          className="pointer-events-auto inline-flex flex-wrap items-center gap-0.5 rounded-lg bg-[#040E26]/95 border border-[#2A3F6A] p-0.5 shadow-[0_8px_24px_rgba(0,0,0,0.85)] backdrop-blur-md w-fit"
        >
          <span className="px-1.5 text-[9.5px] uppercase tracking-wider text-[#94A3B8] font-semibold">
            Shade By:
          </span>
          {CHOROPLETH_MEASURES.map((m) => {
            const active = choroplethMeasure === m.key;
            return (
              <button
                key={m.key}
                type="button"
                data-testid={`choropleth-measure-${m.key}`}
                onClick={() => handleSelectMeasure(m.key)}
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? "bg-[#312E81]/95 text-[#F3D68B] border border-[#7C6EE6]/80 shadow-xs"
                    : "text-[#CBD5E1] hover:text-white hover:bg-[#0B1D40]"
                }`}
              >
                {m.shortLabel}
              </button>
            );
          })}
        </div>

        {/* Row 3: 3-Mode Map Style Switcher + Progressive Granularity Tier Selector */}
        <div className="flex flex-wrap items-center gap-1.5 pointer-events-none">
          <div
            data-testid="map-style-switcher"
            className="pointer-events-auto inline-flex items-center rounded-lg bg-[#040E26]/95 border border-[#2A3F6A] p-0.5 shadow-[0_8px_24px_rgba(0,0,0,0.85)] backdrop-blur-md"
          >
            {(
              [
                {
                  id: "waypoint_map",
                  label: "Waypoint Map",
                  icon: MapIcon,
                },
                {
                  id: "satellite",
                  label: "Satellite",
                  icon: Satellite,
                },
                {
                  id: "hybrid",
                  label: "Hybrid",
                  icon: Layers,
                },
              ] as const
            ).map((mode) => {
              const Icon = mode.icon;
              const active = mapDisplayMode === mode.id;
              const unavailableDot =
                (mode.id === "satellite" || mode.id === "hybrid") &&
                !satelliteConfig.configured;
              return (
                <button
                  key={mode.id}
                  type="button"
                  data-testid={`map-mode-${mode.id}`}
                  onClick={() => handleSelectMapMode(mode.id)}
                  className={`px-1.5 py-0.5 rounded-md text-[9.5px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
                    active
                      ? "bg-[#112A56] text-[#F3D68B] border border-[#D4AF63]/60 shadow-xs"
                      : "text-[#CBD5E1] hover:text-white hover:bg-[#0B1D40]"
                  }`}
                >
                  <Icon className="h-3 w-3 text-[#D4AF63]" />
                  <span>{mode.label}</span>
                  {unavailableDot && (
                    <span
                      title="Satellite imagery provider not configured yet"
                      className="h-1.5 w-1.5 rounded-full bg-amber-400/80"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Progressive Zoom / Granularity Tier Bar (State -> County -> Census Block Group) */}
          <div
            data-testid="choropleth-granularity-switcher"
            className="pointer-events-auto inline-flex items-center gap-0.5 rounded-lg bg-[#040E26]/95 border border-[#233559] p-0.5 text-[9.5px] shadow-md"
          >
            <span className="px-1 text-[#8496B0] font-semibold">Level:</span>
            {(
              [
                { id: "auto", label: `Auto (${effectiveGranularity.replace("_", " ")})` },
                { id: "state", label: "50 States" },
                { id: "county", label: "County" },
                { id: "block_group", label: "Block Group" },
              ] as const
            ).map((g) => {
              const isSelected = granularityMode === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  data-testid={`granularity-${g.id}`}
                  onClick={() => handleSelectGranularity(g.id)}
                  className={`px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? "bg-[#162F63] text-[#F3D68B] border border-[#D4AF63]/50"
                      : "text-[#94A3B8] hover:text-white"
                  }`}
                >
                  {g.label}
                </button>
              );
            })}
          </div>

          {/* Adjustable Choropleth Shading Opacity Control (Defaults: Waypoint Map 70%, Satellite 0%, Hybrid 30%) */}
          <div
            data-testid="hybrid-shading-opacity-control"
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-lg bg-[#040E26]/95 border border-[#2A3F6A] px-2 py-0.5 text-[9.5px] shadow-md backdrop-blur-md"
          >
            <span className="text-[#94A3B8] font-semibold whitespace-nowrap">
              Shade Opacity:
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={hybridShadingOpacityPct}
              data-testid="hybrid-shading-opacity-slider"
              onChange={(e) => setHybridShadingOpacityPct(Number(e.target.value))}
              className="w-16 h-1.5 accent-[#D4AF63] cursor-pointer"
              aria-label="Adjust geographic score shading opacity"
            />
            <span
              data-testid="hybrid-shading-opacity-value"
              className="text-[#F3D68B] font-bold w-8 text-right"
            >
              {hybridShadingOpacityPct}%
            </span>
          </div>

          {/* Live Zoom Level & Imagery Resolution Status Pill */}
          <div
            data-testid="map-zoom-level-indicator"
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-lg bg-[#040E26]/95 border border-[#2A3F6A] px-2 py-0.5 text-[9.5px] font-semibold text-[#F3D68B] shadow-md backdrop-blur-md"
          >
            <span>Zoom: z{camera.zoom.toFixed(1)} / z{maxInteractiveZoom}</span>
            {isSatelliteOrHybrid && satelliteConfig.configured && (
              <span className="text-[9px] text-[#93C5FD] border-l border-[#243B67] pl-1.5">
                {isOverZoomedBeyondNative
                  ? `Tile Cap: z${activeNativeTileZoom} (${Math.pow(2, camera.zoom - maxNativeTileZoom).toFixed(1)}×)`
                  : `Native Tile: z${activeNativeTileZoom} (~1m)`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Honest Unconfigured Satellite / Hybrid Notice (Never renders a fake satellite map) */}
      {isSatelliteUnavailable && (
        <div
          data-testid="satellite-unavailable-banner"
          className="absolute top-28 left-3 right-3 sm:right-auto sm:max-w-[310px] z-20 rounded-xl bg-[#040E26]/96 border border-[#D4AF63]/55 p-3 shadow-[0_12px_32px_rgba(0,0,0,0.9)] backdrop-blur-md space-y-2"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Satellite className="h-3.5 w-3.5 text-[#F3D68B] shrink-0" />
              <p className="text-xs font-semibold text-[#F3D68B]">
                {mapDisplayMode === "satellite"
                  ? "Satellite Imagery Unavailable"
                  : "Hybrid Satellite Layer Unavailable"}
              </p>
            </div>
            <span className="text-[9.5px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#10254A] border border-[#2D4A82] text-[#93C5FD]">
              Not Configured
            </span>
          </div>
          <p className="text-[11px] text-[#CBD5E1] leading-relaxed">
            {mapDisplayMode === "satellite"
              ? "Licensed aerial/satellite imagery is not configured yet. Waypoint never displays simulated satellite imagery. Polygon score shading and selection remain active."
              : "Licensed satellite imagery is not configured yet. Hybrid road corridors, 50-state/county boundaries, school locations, and choropleth score shading remain active."}
          </p>
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleSelectMapMode("waypoint_map")}
              className="text-[11px] text-[#94A3B8] hover:text-white underline cursor-pointer"
            >
              Return to Waypoint Map
            </button>
            {onOpenStudioProviders && (
              <button
                type="button"
                onClick={onOpenStudioProviders}
                className="px-2.5 py-1 rounded-md bg-[#102854] border border-[#D4AF63]/50 text-[11px] font-semibold text-[#F3D68B] hover:bg-[#17366E] flex items-center gap-1 cursor-pointer"
              >
                <Sliders className="h-3 w-3" />
                <span>Provider Options</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Compact & Collapsible Choropleth Map Legend (Bottom-Left) */}
      <div
        data-testid="choropleth-map-legend"
        data-collapsed={String(legendCollapsed)}
        className={`absolute bottom-2.5 left-2.5 z-20 pointer-events-auto rounded-xl bg-[#040E26]/95 border border-[#2A3F6A] shadow-[0_10px_28px_rgba(0,0,0,0.9)] backdrop-blur-md transition-all ${
          legendCollapsed ? "w-auto px-2.5 py-1.5" : "w-[214px] p-2 space-y-1.5"
        }`}
      >
        <button
          type="button"
          data-testid="toggle-map-legend-btn"
          onClick={() => setLegendCollapsed((v) => !v)}
          className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
          title={legendCollapsed ? "Expand score legend" : "Collapse score legend"}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#F3D68B] truncate">
              {activeMeasureMeta.label}
            </span>
            {/* Inline micro gradient swatches visible in both collapsed and expanded states */}
            <span className="inline-flex items-center gap-0.5 shrink-0">
              {CHOROPLETH_LEGEND_STOPS.slice(0, 5).map((stop) => (
                <span
                  key={stop.label}
                  className="h-2 w-2 rounded-xs border border-[#3B5586]/60"
                  style={{ backgroundColor: stop.color }}
                />
              ))}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="px-1 py-0.2 rounded bg-[#1E1B4B] border border-[#7C6EE6]/50 text-[8.5px] font-semibold text-[#C4B5FD]">
              {hybridShadingOpacityPct}%
            </span>
            {legendCollapsed ? (
              <ChevronUp className="h-3 w-3 text-[#94A3B8]" />
            ) : (
              <ChevronDown className="h-3 w-3 text-[#94A3B8]" />
            )}
          </div>
        </button>

        {!legendCollapsed && (
          <>
            <p className="text-[8.5px] text-[#94A3B8] border-b border-[#1A2D52] pb-1">
              {showModelCalibration
                ? `Calibration Demo · ${effectiveGranularity.replace("_", " ")} · 0–100`
                : selectedPolygonActiveScore !== null
                  ? `Verified Public Data (ACS/NCES) · 0–100`
                  : "Demo Scores Off · Unimported Pillars Null"}
            </p>

            {/* Discrete Blue/Violet Score Gradient Stops + No Verified Data Stop */}
            <div className="grid grid-cols-2 gap-x-1.5 gap-y-0.5">
              {CHOROPLETH_LEGEND_STOPS.map((stop) => (
                <div key={stop.label} className="flex items-center gap-1">
                  <span
                    className="h-2 w-2.5 rounded-xs border border-[#3B5586]/80 shrink-0"
                    style={{ backgroundColor: stop.color }}
                  />
                  <span className="text-[9px] font-semibold text-[#E2E8F0]">
                    {stop.rangeText}
                  </span>
                  <span className="text-[8.5px] text-[#94A3B8] truncate">
                    {stop.isNoData ? "No Verified Data" : stop.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Selected Gold Boundary Legend Note + Live Hover / Selected Area Score Readout */}
            <div className="pt-1 border-t border-[#1A2D52] flex items-center justify-between gap-1.5 text-[9.5px]">
              <div className="truncate">
                <span className="text-[#94A3B8] block text-[8.5px]">
                  {hoveredPolygon
                    ? hoveredPolygon.granularityLabel || "Inspecting Polygon"
                    : "Selected Area (Gold Border)"}
                </span>
                <span className="font-semibold text-[#F3D68B] truncate block">
                  {hoveredPolygon ? hoveredPolygon.name : selectedCommunity.name}
                </span>
              </div>
              <div className="shrink-0 text-right">
                {(() => {
                  const displayScore = hoveredPolygon
                    ? hoveredPolygon.score
                    : selectedPolygonActiveScore;
                  if (displayScore === null) {
                    return (
                      <span className="px-1.5 py-0.5 rounded bg-[#091530] border border-[#24375E] text-[8.5px] text-[#94A3B8]">
                        No Verified Data
                      </span>
                    );
                  }
                  return (
                    <span className="px-1.5 py-0.5 rounded bg-[#231F54] border border-[#7C6EE6]/70 text-[10px] font-bold text-[#F3D68B]">
                      {displayScore}/100
                    </span>
                  );
                })()}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Compact Expandable Bottom Location Bar (Replaces oversized bottom score panel) */}
      <div
        data-testid="expandable-score-breakdown"
        data-expanded={String(scoreBreakdownExpanded)}
        className="hidden md:flex flex-col items-center absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none max-w-[calc(100%-290px)]"
      >
        {/* Expanded 6-Pillar Breakdown & Calibration Popover (Opens upward on demand) */}
        {scoreBreakdownExpanded && (
          <div className="pointer-events-auto mb-1.5 w-[min(620px,calc(100vw-280px))] rounded-xl bg-[#030B1E]/96 border border-[#2A3F6A] px-3 py-2.5 space-y-2 shadow-[0_14px_36px_rgba(0,0,0,0.95)] backdrop-blur-md">
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-1.5">
              {(
                [
                  {
                    key: "communityQuality" as const,
                    label: "Community Quality",
                    value: showModelCalibration
                      ? selectedCommunity.calibrationPillars.communityQuality
                      : null,
                    icon: Building2,
                  },
                  {
                    key: "academics" as const,
                    label: "School Performance",
                    value: showModelCalibration
                      ? selectedCommunity.calibrationPillars.academics
                      : null,
                    icon: GraduationCap,
                  },
                  {
                    key: "safetyWellBeing" as const,
                    label: "Safety & Well-Being",
                    value: showModelCalibration
                      ? selectedCommunity.calibrationPillars.safetyWellBeing
                      : null,
                    icon: Shield,
                  },
                  {
                    key: "familyFit" as const,
                    label: "Family Fit",
                    value: showModelCalibration ? familyFitScore : null,
                    icon: Users,
                  },
                  {
                    key: "affordability" as const,
                    label: "Affordability",
                    value: showModelCalibration
                      ? selectedCommunity.calibrationPillars.affordability
                      : null,
                    icon: Home,
                  },
                  {
                    key: "commute" as const,
                    label: "Connectivity",
                    value: showModelCalibration
                      ? selectedCommunity.calibrationPillars.commute
                      : null,
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
                    data-testid={`bottom-pillar-${pillar.key}`}
                    onClick={() => handleSelectMeasure(pillar.key)}
                    className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                      isActiveMeasure
                        ? "bg-[#221F52] border-[#7C6EE6] text-[#F3D68B]"
                        : "bg-[#071430] border-[#1D2F52] hover:border-[#36538A] text-[#CBD5E1]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <Icon className="h-3.5 w-3.5 text-[#D4AF63]" />
                      <span className="text-xs font-bold text-[#F4F6FB]">
                        {pillar.value !== null ? `${pillar.value}` : "No Data"}
                      </span>
                    </div>
                    <p className="text-[9.5px] text-[#94A3B8] truncate mt-0.5">
                      {pillar.label}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#1D2F52] text-[10px] text-[#94A3B8]">
              <span>
                Click any pillar to shade the nationwide choropleth map.{" "}
                <span className="text-[#CBD5E1]">{pmtilesHeaderStatus}</span>
              </span>
              <div className="flex items-center gap-3">
                {onToggleModelCalibration && (
                  <label className="flex items-center gap-1.5 text-[#93C5FD] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showModelCalibration}
                      onChange={(e) => onToggleModelCalibration(e.target.checked)}
                      className="h-3 w-3 accent-[#D4AF63] cursor-pointer"
                    />
                    <span>Fictional Calibration Demo Scores</span>
                  </label>
                )}
                {onOpenScoreDetails && (
                  <button
                    type="button"
                    onClick={onOpenScoreDetails}
                    className="text-[#F3D68B] hover:underline font-semibold cursor-pointer"
                  >
                    Methodology & Evidence →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Single-Line Compact Location Pill Bar */}
        <div className="pointer-events-auto inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#040E26]/95 border border-[#2A3F6A] shadow-[0_10px_28px_rgba(0,0,0,0.92)] backdrop-blur-md whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#D4AF63] shrink-0" />
            <span
              className="text-[11.5px] font-bold text-[#F4F6FB] truncate max-w-[140px]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {selectedCommunity.name}
            </span>
          </div>

          {/* Distinct Metric 1: Community Quality */}
          <div
            data-testid="dock-community-quality"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#091736] border border-[#20345E] text-[10px]"
          >
            <span className="text-[#94A3B8]">Quality:</span>
            {showModelCalibration && communityQualityScore !== null ? (
              <span className="font-bold text-[#F3D68B]">
                {communityQualityScore}/100{" "}
                <span className="text-[8.5px] uppercase text-[#C4B5FD] font-normal">
                  Demo
                </span>
              </span>
            ) : (
              <span className="font-semibold text-[#94A3B8]">No Verified Data</span>
            )}
          </div>

          {/* Distinct Metric 2: Family Fit */}
          <div
            data-testid="dock-family-fit"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#091736] border border-[#20345E] text-[10px]"
          >
            <span className="text-[#94A3B8]">Fit:</span>
            {showModelCalibration && familyFitScore !== null ? (
              <span className="font-bold text-[#93C5FD]">
                {familyFitScore}/100{" "}
                <span className="text-[8.5px] uppercase text-[#C4B5FD] font-normal">
                  Demo
                </span>
              </span>
            ) : (
              <span className="font-semibold text-[#94A3B8]">No Verified Data</span>
            )}
          </div>

          {/* Distinct Metric 3: Evidence Completeness */}
          <div
            data-testid="dock-evidence-completeness"
            className="hidden xl:flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#121036] border border-[#4C3F91]/70 text-[9.5px] text-[#C4B5FD]"
            title="Demonstration calibration scores are never presented as verified findings"
          >
            <FlaskConical className="h-2.5 w-2.5 text-[#F3D68B] shrink-0" />
            <span>
              {selectedCommunity.evidenceCompleteness?.ratioText
                ? selectedCommunity.evidenceCompleteness.ratioText.replace(" Sources", "")
                : selectedCommunity.dataStatus === "verified_public_source"
                  ? "6/6 Verified"
                  : showModelCalibration
                    ? "0/6 Verified · Demo"
                    : "0/6 Verified"}
            </span>
          </div>

          <button
            type="button"
            data-testid="toggle-score-breakdown-btn"
            onClick={() => setScoreBreakdownExpanded((v) => !v)}
            className="px-2 py-0.5 rounded-full bg-[#10254D] hover:bg-[#173368] border border-[#345086] text-[10px] font-semibold text-[#F3D68B] flex items-center gap-1 cursor-pointer"
          >
            <span>{scoreBreakdownExpanded ? "Hide" : "Score Breakdown"}</span>
            {scoreBreakdownExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronUp className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>

      {/* Top-Right Collapsible Map Layers Card */}
      <div className="absolute top-2.5 right-2.5 z-20 w-[142px] rounded-xl bg-[#040E26]/95 border border-[#2A3F6A] shadow-[0_10px_28px_rgba(0,0,0,0.85)] backdrop-blur-md overflow-hidden">
        <button
          type="button"
          data-testid="map-layers-toggle-btn"
          onClick={() => setLayersExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-semibold text-[#F4F6FB] border-b border-[#1D2F52] cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-[#D4AF63]" />
            Map Layers
          </span>
          {layersExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-[#94A3B8]" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-[#94A3B8]" />
          )}
        </button>

        {layersExpanded && (
          <div className="p-2.5 space-y-1.5">
            {LAYER_OPTIONS.map((layer) => {
              const checked = activeLayers[layer.key];
              return (
                <label
                  key={layer.key}
                  className="flex items-center gap-2 text-xs text-[#CBD5E1] hover:text-white cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleLayer(layer.key)}
                    className="h-3.5 w-3.5 rounded border-[#475569] accent-[#D4AF63] cursor-pointer"
                  />
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: layer.colorDot }}
                  />
                  <span className="truncate">{layer.label}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Mandatory Imagery & Geographic Boundary Attribution Badge (All Modes) */}
      <div
        data-testid="satellite-attribution-badge"
        className="absolute top-12 right-2.5 z-20 px-2 py-1 rounded-md bg-[#040E26]/92 border border-[#D4AF63]/45 text-[9.5px] font-medium text-[#F3D68B] shadow-md backdrop-blur-md flex items-center gap-1.5"
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            satelliteConfig.configured && isSatelliteOrHybrid
              ? "bg-emerald-400"
              : "bg-[#93C5FD]"
          }`}
        />
        <span>
          {satelliteConfig.configured && isSatelliteOrHybrid
            ? satelliteConfig.attributionText ||
              "Imagery: USDA, USGS The National Map: Orthoimagery · Boundaries: U.S. Census TIGER/Line"
            : "Boundaries: U.S. Census Bureau TIGER/Line · School Districts: NCES EDGE"}
        </span>
      </div>

      {/* Live Zoom Level & Imagery Resolution Status Pill */}
      <div
        data-testid="map-zoom-level-indicator"
        className="absolute bottom-[164px] right-3 z-20 px-2 py-1 rounded-md bg-[#040E26]/95 border border-[#2A3F6A] text-[9.5px] font-semibold text-[#F3D68B] shadow-lg text-right"
      >
        <div>z{camera.zoom.toFixed(1)} / z{maxInteractiveZoom}</div>
        {isSatelliteOrHybrid && satelliteConfig.configured && (
          <div className="text-[8.5px] text-[#94A3B8]">
            {isOverZoomedBeyondNative
              ? `Tile z${activeNativeTileZoom} (Over-zoom)`
              : `Native Tile z${activeNativeTileZoom}`}
          </div>
        )}
      </div>

      {/* Honest USGS Native Resolution Ceiling Notice when Over-Zooming beyond z16 (z17–z20) */}
      {isOverZoomedBeyondNative && (
        <div
          data-testid="usgs-overzoom-notice"
          className="absolute top-[102px] left-2.5 z-20 max-w-[390px] rounded-lg bg-[#040E26]/96 border border-amber-400/75 px-3 py-2 text-[10px] text-[#F4F6FB] shadow-[0_8px_24px_rgba(0,0,0,0.92)] backdrop-blur-md space-y-0.5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-amber-300">
              USGS Native Tile Limit Reached (z{maxNativeTileZoom} · 1:9,028 Scale)
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-[9px] font-semibold text-amber-200">
              {Math.pow(2, camera.zoom - maxNativeTileZoom).toFixed(1)}× Digital Stretch
            </span>
          </div>
          <p className="text-[9.5px] text-[#CBD5E1] leading-snug">
            USGS National Map serves 1m NAIP tiles up to z16 (z17+ returns HTTP 404). Over-zooming at z{camera.zoom.toFixed(1)} stretches z16 tiles. Sub-meter building &amp; playground clarity at z17–z20 requires Esri World Imagery, MapTiler, or Mapbox.
          </p>
        </div>
      )}

      {/* Bottom-Right Zoom, 50-State Nationwide View & Georgia Recenter Controls */}
      <div className="absolute bottom-3 right-3 z-20 flex flex-col rounded-lg overflow-hidden border border-[#2A3F6A] bg-[#040E26]/95 shadow-xl divide-y divide-[#1D2F52]">
        <button
          type="button"
          data-testid="map-zoom-in-btn"
          onClick={handleZoomIn}
          title="Zoom in"
          className="p-2 text-[#F4F6FB] hover:bg-[#102548] transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          data-testid="map-zoom-out-btn"
          onClick={handleZoomOut}
          title="Zoom out"
          className="p-2 text-[#F4F6FB] hover:bg-[#102548] transition-colors cursor-pointer"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleNationwide50StatesView}
          title="View All 50 States"
          data-testid="zoom-50-states-btn"
          className="p-2 text-[#93C5FD] hover:bg-[#102548] transition-colors cursor-pointer"
        >
          <Globe className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          data-testid="map-reset-georgia-btn"
          onClick={handleResetView}
          title="Reset Georgia view"
          className="p-2 text-[#D4AF63] hover:bg-[#102548] transition-colors cursor-pointer"
        >
          <Navigation className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
