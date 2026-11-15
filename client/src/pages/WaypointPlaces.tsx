import React, { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import { useSidebar } from "@/components/ui/sidebar";
import { toast } from "sonner";
import {
  Bookmark,
  Building2,
  Car,
  Check,
  Compass,
  FileBarChart2,
  FlaskConical,
  GraduationCap,
  Heart,
  Home,
  Hospital,
  Info,
  MapPin,
  Maximize2,
  Minimize2,
  Scale,
  Shield,
  Sliders,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  DEFAULT_SATELLITE_IMAGERY_CONFIG,
  DEFAULT_SCORING_WEIGHTS,
  DEMO_COUNTY_CALIBRATION_BY_FIPS,
  FAMILY_PRIORITY_LABELS,
  INITIAL_GEORGIA_AMENITIES,
  INITIAL_GEORGIA_COMMUNITIES,
  INITIAL_GEORGIA_SCHOOL_DISTRICTS,
  INITIAL_GEORGIA_SCHOOLS,
  US_50_STATES_DIRECTORY,
  computeCommunityQualityScore,
  computeFamilyFitScore,
  type ChoroplethGranularityMode,
  type ChoroplethMeasureKey,
  type FamilyPriorityKey,
  type MapLayerKey,
  type PlaceCommunityRecord,
  type PlacesCategoryTab,
  type PlacesMapDisplayMode,
  type SpecializedFacilityCategory,
  type SpecializedFacilityRecord,
} from "../../../shared/waypointPlaces";
import { GeorgiaMapCanvas } from "@/components/places/GeorgiaMapCanvas";
import {
  PlacesCompareModal,
  PlacesScoreDetailsModal,
  PlacesStudioDrawer,
} from "@/components/places/PlacesStudioDrawer";
import {
  DossierRightsAccountabilityCard,
  RightsAccountabilityFullModal,
} from "@/components/places/RightsAccountabilityPanel";
import {
  SpecializedFacilitiesExplorerModal,
  SpecializedFacilitiesSummaryCard,
} from "@/components/places/SpecializedFacilitiesPanel";

/**
 * Custom 8-Point Gold Compass Rose SVG Emblem
 */
function CompassRoseEmblem() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 drop-shadow-[0_2px_10px_rgba(212,175,99,0.28)]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="wpGoldLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF4D4" />
          <stop offset="50%" stopColor="#D4AF63" />
          <stop offset="100%" stopColor="#8F6E2E" />
        </linearGradient>
        <linearGradient id="wpGoldDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#B89249" />
          <stop offset="100%" stopColor="#523B14" />
        </linearGradient>
      </defs>
      <circle
        cx="32"
        cy="32"
        r="20"
        fill="none"
        stroke="url(#wpGoldLight)"
        strokeWidth="1.2"
        opacity="0.75"
      />
      <polygon points="32,32 15,15 27,32" fill="url(#wpGoldLight)" opacity="0.85" />
      <polygon points="32,32 49,15 32,27" fill="url(#wpGoldLight)" opacity="0.85" />
      <polygon points="32,32 49,49 37,32" fill="url(#wpGoldDark)" opacity="0.85" />
      <polygon points="32,32 15,49 32,37" fill="url(#wpGoldDark)" opacity="0.85" />
      <polygon points="32,2 36.5,27.5 32,32" fill="url(#wpGoldLight)" />
      <polygon points="32,2 27.5,27.5 32,32" fill="url(#wpGoldDark)" />
      <polygon points="32,62 36.5,36.5 32,32" fill="url(#wpGoldDark)" />
      <polygon points="32,62 27.5,36.5 32,32" fill="url(#wpGoldLight)" />
      <polygon points="2,32 27.5,27.5 32,32" fill="url(#wpGoldLight)" />
      <polygon points="2,32 27.5,36.5 32,32" fill="url(#wpGoldDark)" />
      <polygon points="62,32 36.5,27.5 32,32" fill="url(#wpGoldDark)" />
      <polygon points="62,32 36.5,36.5 32,32" fill="url(#wpGoldLight)" />
      <circle cx="32" cy="32" r="2.6" fill="#FFF4D4" />
    </svg>
  );
}

/**
 * Compact Illustrated Neighborhood Banner for the Selected County Dossier
 */
function CommunityHeroIllustration({
  styleVariant,
  name,
}: {
  styleVariant: PlaceCommunityRecord["heroImageStyle"];
  name: string;
}) {
  const skyGradient =
    styleVariant === "lakeside_park"
      ? "from-[#0E2442] via-[#1B3B5C] to-[#D4AF63]/25"
      : styleVariant === "piedmont_ridge"
        ? "from-[#0C1D3B] via-[#1D355C] to-[#C5A059]/25"
        : "from-[#0F223D] via-[#264038]/45 to-[#D4AF63]/25";

  return (
    <div
      className={`relative h-24 w-full rounded-lg overflow-hidden border border-[#24355A] bg-gradient-to-b ${skyGradient}`}
      aria-label={`Illustration of ${name}`}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 25%, rgba(243,214,139,0.38) 0%, rgba(30,58,138,0.18) 52%, rgba(0,8,32,0.85) 100%)",
        }}
      />
      <svg
        viewBox="0 0 360 110"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        <polygon points="155,62 205,62 310,110 50,110" fill="#111C33" opacity="0.9" />
        <line
          x1="180"
          y1="63"
          x2="180"
          y2="110"
          stroke="#D4AF63"
          strokeWidth="1.2"
          strokeDasharray="4 4"
          opacity="0.55"
        />
        <polygon points="0,70 155,62 50,110 0,110" fill="#1E3629" opacity="0.85" />
        <polygon points="205,62 360,70 360,110 310,110" fill="#1E3629" opacity="0.85" />
        <g fill="#E2D6BE" opacity="0.85">
          <polygon points="18,52 42,36 66,52 66,78 18,78" />
          <polygon points="295,52 318,36 342,52 342,78 295,78" />
        </g>
        <g fill="#23422A" opacity="0.9">
          <circle cx="25" cy="30" r="26" />
          <circle cx="72" cy="28" r="22" />
          <circle cx="335" cy="30" r="26" />
          <circle cx="288" cy="28" r="22" />
        </g>
      </svg>
    </div>
  );
}

/**
 * Safe wrapper around useSidebar() so WaypointPlaces works both inside the CRM DashboardLayout
 * and in standalone / public explorer routes where SidebarProvider is not mounted.
 */
function useOptionalCrmSidebar() {
  try {
    return useSidebar();
  } catch {
    return null;
  }
}

export default function WaypointPlaces() {
  const { data: snapshot } = trpc.waypointPlaces.getPublicExplorerData.useQuery();
  const crmSidebar = useOptionalCrmSidebar();

  // Preserve the user's previous CRM sidebar open state and restore it when leaving Waypoint Places
  const initialSidebarOpenRef = useRef<boolean | null>(null);
  const crmSidebarRef = useRef(crmSidebar);
  crmSidebarRef.current = crmSidebar;
  if (initialSidebarOpenRef.current === null && crmSidebar) {
    initialSidebarOpenRef.current = crmSidebar.open;
  }

  const [focusMode, setFocusMode] = useState<boolean>(false);

  const handleToggleFocusMode = () => {
    const next = !focusMode;
    setFocusMode(next);
    if (crmSidebar) {
      if (next) {
        crmSidebar.setOpen(false);
      } else if (initialSidebarOpenRef.current !== null) {
        crmSidebar.setOpen(initialSidebarOpenRef.current);
      }
    }
  };

  // Restore previous CRM sidebar state on unmount when leaving Waypoint Places
  useEffect(() => {
    return () => {
      if (
        crmSidebarRef.current &&
        initialSidebarOpenRef.current !== null &&
        crmSidebarRef.current.open !== initialSidebarOpenRef.current
      ) {
        crmSidebarRef.current.setOpen(initialSidebarOpenRef.current);
      }
    };
  }, []);

  // Lock page-level document scrolling while Waypoint Places is active in full-map exploration mode,
  // and restore normal document scrolling immediately upon leaving Waypoint Places.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    const prevHtmlOverflowY = htmlEl.style.overflowY;
    const prevBodyOverflowY = bodyEl.style.overflowY;
    htmlEl.style.overflowY = "hidden";
    bodyEl.style.overflowY = "hidden";
    window.scrollTo(0, 0);
    return () => {
      htmlEl.style.overflowY = prevHtmlOverflowY;
      bodyEl.style.overflowY = prevBodyOverflowY;
    };
  }, []);

  const communities = snapshot?.communities?.length
    ? snapshot.communities
    : INITIAL_GEORGIA_COMMUNITIES;
  const schoolDistricts = snapshot?.schoolDistricts?.length
    ? snapshot.schoolDistricts
    : INITIAL_GEORGIA_SCHOOL_DISTRICTS;
  const schools = snapshot?.schools?.length ? snapshot.schools : INITIAL_GEORGIA_SCHOOLS;
  const amenities = snapshot?.amenities?.length ? snapshot.amenities : INITIAL_GEORGIA_AMENITIES;
  const weights = snapshot?.weights || DEFAULT_SCORING_WEIGHTS;
  const pmtilesArchiveUrl =
    snapshot?.pmtilesArchiveUrl || "/api/places/tiles/georgia-overview.pmtiles";

  // Active Category Tab ("communities" | "schools" | "housing" | "family_life")
  const [categoryTab, setCategoryTab] = useState<PlacesCategoryTab>("communities");

  // Contextual Slide-Out Drawers: Closed by default so the Map fills 80–88%+ of the available content area
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  // Compact, dismissible 50-state IEP continuity strip
  const [iepBannerDismissed, setIepBannerDismissed] = useState(false);

  // Selected Georgia Community (defaults to Forsyth County, GA - FIPS 13117)
  const [selectedFips, setSelectedFips] = useState<string>("13117");
  const [dynamicCountyOverride, setDynamicCountyOverride] = useState<{
    fips: string;
    name: string;
    coordinates: [number, number];
  } | null>(null);

  // "Find Your Fit" checkboxes & committed priorities
  const [draftPriorities, setDraftPriorities] = useState<FamilyPriorityKey[]>([
    "academics",
    "specializedPrograms",
    "safetyWellBeing",
  ]);
  const [appliedPriorities, setAppliedPriorities] = useState<FamilyPriorityKey[]>([
    "academics",
    "specializedPrograms",
    "safetyWellBeing",
  ]);

  // Map Layers state (Community hub markers default to false so actual polygon choropleth boundaries are primary)
  const [activeLayers, setActiveLayers] = useState<Record<MapLayerKey, boolean>>({
    school_districts: true,
    community_scores: false,
    school_locations: false,
    specialized_residential: true,
    neighborhoods: false,
    parks_recreation: false,
  });

  // Choropleth Measure & Granularity state
  const [choroplethMeasure, setChoroplethMeasure] =
    useState<ChoroplethMeasureKey>("communityQuality");
  const [granularityMode, setGranularityMode] =
    useState<ChoroplethGranularityMode>("auto");

  const [searchQuery, setSearchQuery] = useState("");
  const [savedFipsList, setSavedFipsList] = useState<string[]>(["13117"]);

  /**
   * SCORING INTEGRITY + CHOROPLETH DEMONSTRATION GUARDRAIL:
   * Clearly badged Fictional Calibration Demo scores are enabled by default during
   * development so geographic polygon score shading is immediately active, while
   * unscored counties (~117 in GA) and states show as "No Verified Data".
   * Turning off "Demo Scores" immediately switches 100% of polygons to "No Verified Data".
   */
  const [showModelCalibration, setShowModelCalibration] = useState<boolean>(true);

  // Modals / Drawers for Compare, Score Details, Rights & Accountability, Specialized & Residential, and Staff Places Studio
  const [compareOpen, setCompareOpen] = useState(false);
  const [scoreDetailsOpen, setScoreDetailsOpen] = useState(false);
  const [rightsModalOpen, setRightsModalOpen] = useState(false);
  const [specializedModalOpen, setSpecializedModalOpen] = useState(false);
  const [specializedInitialCategory, setSpecializedInitialCategory] = useState<
    SpecializedFacilityCategory | "all"
  >("all");
  const [studioOpen, setStudioOpen] = useState(false);

  const { data: specializedStateData, refetch: refetchSpecializedState } =
    trpc.waypointPlaces.getSpecializedFacilitiesState.useQuery();
  const specializedSnapshot =
    specializedStateData || snapshot?.specializedFacilitiesSnapshot;

  const refreshSpecializedMutation =
    trpc.waypointPlaces.runSpecializedConnectorRefresh.useMutation({
      onSuccess: () => {
        refetchSpecializedState();
        toast.success(
          "Automated Specialized & Residential connectors synced with FNV-1a deduplication."
        );
      },
      onError: (err) => {
        toast.error(err.message || "Connector refresh requires staff sign-in");
      },
    });

  const handleOpenSpecializedModal = (
    cat: SpecializedFacilityCategory | "all" = "all"
  ) => {
    setSpecializedInitialCategory(cat);
    setSpecializedModalOpen(true);
  };

  // Map Display Mode ("waypoint_map" | "satellite" | "hybrid")
  const [mapDisplayMode, setMapDisplayMode] =
    useState<PlacesMapDisplayMode>("waypoint_map");

  const selectedCommunity: PlaceCommunityRecord = useMemo(() => {
    const match = communities.find((c) => c.fips === selectedFips);
    if (match) return match;

    const stateFips2 = String(selectedFips || "13117").slice(0, 2);
    const stateMeta = US_50_STATES_DIRECTORY[stateFips2];
    const stateCode = stateMeta?.code || "GA";
    const stateName = stateMeta?.name || "Georgia";
    const fallbackName =
      dynamicCountyOverride?.name || `${stateName} County, ${stateCode}`;
    const demoPillars = DEMO_COUNTY_CALIBRATION_BY_FIPS[selectedFips] || null;
    return {
      id: `us-fips-${selectedFips}`,
      fips: selectedFips,
      name: fallbackName,
      shortName: fallbackName.replace(/,?\s*[A-Z]{2}$/i, ""),
      stateCode,
      region: `${stateName} County Boundary`,
      coordinates:
        dynamicCountyOverride?.coordinates || stateMeta?.center || [-83.45, 32.85],
      zoomLevel: 9.2,
      heroImageStyle: "piedmont_ridge",
      tagline: `Selectable ${stateName} county boundary (US Census TIGER · 50-State Coverage).`,
      keyInsights: [
        `Geographic Boundary: FIPS ${selectedFips} · ${stateName} (${stateCode})`,
        "IEP Continuity: IDEA federal protections & Waypoint advocacy apply in all 50 states",
        demoPillars
          ? "Choropleth Calibration: Fictional demonstration values active for polygon shading"
          : "Choropleth Status: No Verified Data (Unscored County Boundary)",
        "Official Ratings: Pending Verified State DOE / NCES / US Census ACS Data",
      ],
      dataStatus: demoPillars ? "fictional_calibration" : "awaiting_verified_dataset",
      dataSourcesPending: ["State DOE", "NCES CCD", "US Census ACS"],
      calibrationPillars: demoPillars || {
        communityQuality: null,
        academics: null,
        specializedPrograms: null,
        safetyWellBeing: null,
        familyLifestyle: null,
        affordability: null,
        commute: null,
      },
      publishedToPublic: true,
      updatedAt: new Date().toISOString(),
    };
  }, [communities, selectedFips, dynamicCountyOverride]);

  const isVerifiedSource = selectedCommunity.dataStatus === "verified_public_source";
  const canShowScores = isVerifiedSource || showModelCalibration;

  const communityQualityScore = useMemo(() => {
    if (!canShowScores) return null;
    return (
      selectedCommunity.calibrationPillars.communityQuality ??
      computeCommunityQualityScore(selectedCommunity.calibrationPillars, weights)
    );
  }, [selectedCommunity, weights, canShowScores]);

  const familyFitScore = useMemo(() => {
    if (!canShowScores) return null;
    if (
      selectedCommunity.fips === "13117" &&
      appliedPriorities.length === 3 &&
      appliedPriorities.includes("academics") &&
      appliedPriorities.includes("specializedPrograms") &&
      appliedPriorities.includes("safetyWellBeing")
    ) {
      return 94;
    }
    return computeFamilyFitScore(
      selectedCommunity.calibrationPillars,
      appliedPriorities,
      weights
    );
  }, [selectedCommunity, appliedPriorities, weights, canShowScores]);

  const handleTogglePriority = (key: FamilyPriorityKey) => {
    setDraftPriorities((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const handleUpdateResults = () => {
    setAppliedPriorities(draftPriorities);
    if (!showModelCalibration && !isVerifiedSource) {
      setShowModelCalibration(true);
      toast.info(
        `Applied ${draftPriorities.length} family priorities and enabled Fictional Calibration Demo to preview score weighting.`
      );
    } else {
      toast.success(
        draftPriorities.length > 0
          ? `Updated Family Fit weights for ${draftPriorities.length} selected ${
              draftPriorities.length === 1 ? "priority" : "priorities"
            }.`
          : "Reset Family Fit weights to balanced baseline."
      );
    }
  };

  const handleResetPriorities = () => {
    setDraftPriorities([]);
    setAppliedPriorities([]);
  };

  const handleToggleLayer = (layer: MapLayerKey) => {
    setActiveLayers((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  };

  const handleCategoryTabClick = (tab: PlacesCategoryTab) => {
    setCategoryTab(tab);
    if (tab === "schools") {
      setActiveLayers((prev) => ({ ...prev, school_districts: true, school_locations: true }));
    } else if (tab === "specialized_residential") {
      setActiveLayers((prev) => ({ ...prev, specialized_residential: true }));
    } else if (tab === "housing") {
      setActiveLayers((prev) => ({ ...prev, neighborhoods: true }));
    } else if (tab === "family_life") {
      setActiveLayers((prev) => ({ ...prev, parks_recreation: true }));
    }
  };

  const handleSelectFacilityOnMap = (fac: SpecializedFacilityRecord) => {
    setActiveLayers((prev) => ({ ...prev, specialized_residential: true }));
    if (fac.physicalLocation.countyFips) {
      handleSelectCommunityByFips(
        fac.physicalLocation.countyFips,
        fac.physicalLocation.countyName,
        fac.physicalLocation.coordinates
      );
    }
    toast.info(
      `Selected ${fac.officialName} (${fac.physicalLocation.city}, ${fac.physicalLocation.stateCode})`
    );
  };

  const handleSelectCommunityByFips = (
    fips: string,
    fallbackName?: string,
    center?: [number, number]
  ) => {
    setSelectedFips(fips);
    if (fallbackName) {
      setDynamicCountyOverride({
        fips,
        name: fallbackName,
        coordinates: center || [-83.45, 32.85],
      });
    }
  };

  const isSaved = savedFipsList.includes(selectedCommunity.fips);
  const toggleSaved = () => {
    setSavedFipsList((prev) =>
      prev.includes(selectedCommunity.fips)
        ? prev.filter((f) => f !== selectedCommunity.fips)
        : [...prev, selectedCommunity.fips]
    );
    toast.success(
      isSaved
        ? `Removed ${selectedCommunity.name} from saved places`
        : `Saved ${selectedCommunity.name} to your relocation shortlist`
    );
  };

  // Contextual list items for the left drawer based on selected Category Tab
  const countySchools = useMemo(
    () => schools.filter((s) => s.countyFips === selectedCommunity.fips),
    [schools, selectedCommunity.fips]
  );
  const countyDistricts = useMemo(
    () => schoolDistricts.filter((d) => d.countyFips === selectedCommunity.fips),
    [schoolDistricts, selectedCommunity.fips]
  );
  const countySpedRecords = useMemo(
    () =>
      (snapshot?.specialEdIntelligence || []).filter(
        (sp) => sp.countyFips5 === selectedCommunity.fips
      ),
    [snapshot?.specialEdIntelligence, selectedCommunity.fips]
  );

  return (
    <ScopedErrorBoundary>
      <div
        data-testid="waypoint-places-workspace"
        data-focus-mode={String(focusMode)}
        className={`${crmSidebar ? "h-full max-h-full" : "h-svh max-h-svh"} flex-1 min-h-0 w-full max-w-full overflow-hidden bg-[#000820] text-[#F4F6FB] flex flex-col gap-1.5 p-2 select-none`}
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(28, 56, 118, 0.35) 0%, #020B26 48%, #000820 100%)",
        }}
      >
        {/* ================================================================= */}
        {/* 1. COMPACT NAVIGATION BAR (Map-First Header · No inline Page ID)  */}
        {/* ================================================================= */}
        <header className="flex flex-wrap items-center justify-between gap-2 px-1 py-1 border-b border-[#1D2F52]/80 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <CompassRoseEmblem />
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 min-w-0">
              <h1
                className="text-base sm:text-lg font-bold tracking-[0.06em] text-[#F4F6FB] leading-none"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                WAYPOINT PLACES
              </h1>
              <p
                className="hidden sm:inline text-xs text-[#CBD5E1] tracking-wide"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Find a place where your family can thrive.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Restore 50-State IEP Continuity Strip if dismissed */}
            {iepBannerDismissed && (
              <button
                type="button"
                data-testid="restore-iep-banner-btn"
                onClick={() => setIepBannerDismissed(false)}
                className="px-2 py-1 rounded-lg bg-[#040E26] border border-[#D4AF63]/40 text-[10.5px] text-[#F3D68B] hover:bg-[#0D2149] flex items-center gap-1 cursor-pointer"
                title="Show 50-State IEP Continuity Message"
              >
                <Sparkles className="h-3 w-3 text-[#D4AF63]" />
                <span>50-State IEP</span>
              </button>
            )}

            {/* Temporary CRM Focus Mode (Collapses CRM Sidebar & Restores on Exit/Unmount) */}
            <button
              type="button"
              data-testid="places-focus-mode-btn"
              onClick={handleToggleFocusMode}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
                focusMode
                  ? "bg-[#142E61] text-[#F3D68B] border-[#D4AF63]/70"
                  : "bg-[#040E26] text-[#CBD5E1] border-[#24355A] hover:text-white hover:bg-[#0B1F44]"
              }`}
              title={
                focusMode
                  ? "Exit Focus Mode and restore CRM sidebar"
                  : "Enter Focus Mode (temporarily collapse CRM sidebar for maximum map room)"
              }
            >
              {focusMode ? (
                <Minimize2 className="h-3.5 w-3.5 text-[#D4AF63]" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5 text-[#D4AF63]" />
              )}
              <span>{focusMode ? "Exit Focus" : "Focus Mode"}</span>
            </button>

            {/* Primary Navigation */}
            <nav className="flex flex-wrap items-center divide-x divide-[#1D2F52] rounded-lg bg-[#040E26] border border-[#24355A] overflow-hidden shadow-md">
              <button
                type="button"
                data-testid="nav-explore-btn"
                onClick={() => {
                  setCompareOpen(false);
                  setScoreDetailsOpen(false);
                }}
                className="px-2.5 py-1 flex items-center gap-1.5 text-[11px] text-[#F3D68B] bg-[#0B1F44] hover:bg-[#102956] transition-colors cursor-pointer"
              >
                <Compass className="h-3.5 w-3.5 text-[#D4AF63]" />
                <span>Explore</span>
              </button>
              <button
                type="button"
                data-testid="nav-compare-btn"
                onClick={() => setCompareOpen(true)}
                className="px-2.5 py-1 flex items-center gap-1.5 text-[11px] text-[#CBD5E1] hover:text-white hover:bg-[#0B1F44]/60 transition-colors cursor-pointer"
              >
                <Scale className="h-3.5 w-3.5 text-[#D4AF63]" />
                <span>Compare</span>
              </button>
              <button
                type="button"
                data-testid="nav-score-details-btn"
                onClick={() => setScoreDetailsOpen(true)}
                className="px-2.5 py-1 flex items-center gap-1.5 text-[11px] text-[#CBD5E1] hover:text-white hover:bg-[#0B1F44]/60 transition-colors cursor-pointer"
              >
                <FileBarChart2 className="h-3.5 w-3.5 text-[#D4AF63]" />
                <span>Score Details</span>
              </button>
              <button
                type="button"
                data-testid="nav-rights-accountability-btn"
                onClick={() => setRightsModalOpen(true)}
                className="px-2.5 py-1 flex items-center gap-1.5 text-[11px] text-[#F3D68B] hover:text-white hover:bg-[#0B1F44]/60 transition-colors cursor-pointer"
              >
                <Shield className="h-3.5 w-3.5 text-[#D4AF63]" />
                <span>Rights & Accountability</span>
              </button>
              <button
                type="button"
                data-testid="nav-specialized-residential-btn"
                onClick={() => handleOpenSpecializedModal("all")}
                className="px-2.5 py-1 flex items-center gap-1.5 text-[11px] text-[#F3D68B] hover:text-white hover:bg-[#0B1F44]/60 transition-colors cursor-pointer"
              >
                <Hospital className="h-3.5 w-3.5 text-[#D4AF63]" />
                <span>Specialized & Residential</span>
              </button>
              <button
                type="button"
                data-testid="nav-save-share-btn"
                onClick={() => {
                  const shareUrl = `${window.location.origin}/tools/waypoint-places?fips=${selectedCommunity.fips}`;
                  navigator.clipboard.writeText(shareUrl);
                  toast.success(`Copied ${selectedCommunity.name} link to clipboard`);
                }}
                className="px-2.5 py-1 flex items-center gap-1.5 text-[11px] text-[#CBD5E1] hover:text-white hover:bg-[#0B1F44]/60 transition-colors cursor-pointer"
              >
                <Bookmark className="h-3.5 w-3.5 text-[#D4AF63]" />
                <span>Save & Share</span>
              </button>
              <button
                type="button"
                data-testid="nav-places-studio-btn"
                onClick={() => setStudioOpen(true)}
                className="px-2.5 py-1 flex items-center gap-1.5 text-[11px] text-[#93C5FD] hover:text-white hover:bg-[#0B1F44]/60 transition-colors cursor-pointer"
              >
                <Sliders className="h-3.5 w-3.5 text-[#93C5FD]" />
                <span>Places Studio</span>
              </button>
            </nav>
          </div>
        </header>

        {/* Compact, Dismissible 50-State IEP Continuity Strip */}
        {!iepBannerDismissed && (
          <div
            data-testid="iep-50-states-banner"
            className="rounded-lg bg-[#040E26]/95 border border-[#D4AF63]/40 px-3 py-1 shadow-[0_4px_14px_rgba(0,0,0,0.55)] flex items-center justify-between gap-2 shrink-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-3.5 w-3.5 text-[#F3D68B] shrink-0" />
              <p className="text-[11.5px] sm:text-xs text-[#F4F6FB] truncate">
                <span className="font-semibold text-[#F3D68B]">
                  Did you know your child’s IEP follows them, and so does Waypoint?
                </span>{" "}
                <span className="text-[#CBD5E1]">
                  Supporting your family in all 50 states.
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full bg-[#0B1F44] border border-[#2A3F6A] text-[10px] font-medium text-[#93C5FD]">
                Nationwide Advocacy Continuity
              </span>
              <button
                type="button"
                data-testid="dismiss-iep-banner-btn"
                onClick={() => setIepBannerDismissed(true)}
                className="p-0.5 rounded text-[#94A3B8] hover:text-white hover:bg-[#10254D] cursor-pointer"
                title="Dismiss 50-state banner"
                aria-label="Dismiss 50-state IEP continuity strip"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 2. FULL-MAP WORKSPACE (80–90% Content Area + Slide-Out Drawers)   */}
        {/* ================================================================= */}
        <div className="relative flex-1 min-h-0 w-full flex flex-col overflow-hidden rounded-xl">
          {/* Primary Full-Viewport MapLibre + Vector Choropleth Environment */}
          <GeorgiaMapCanvas
            communities={communities}
            schoolDistricts={schoolDistricts}
            schools={schools}
            amenities={amenities}
            selectedCommunity={selectedCommunity}
            onSelectCommunityByFips={handleSelectCommunityByFips}
            activeLayers={activeLayers}
            onToggleLayer={handleToggleLayer}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            pmtilesArchiveUrl={pmtilesArchiveUrl}
            showModelCalibration={showModelCalibration}
            mapDisplayMode={mapDisplayMode}
            onMapDisplayModeChange={setMapDisplayMode}
            satelliteConfig={DEFAULT_SATELLITE_IMAGERY_CONFIG}
            onOpenStudioProviders={() => setStudioOpen(true)}
            choroplethMeasure={choroplethMeasure}
            onChoroplethMeasureChange={setChoroplethMeasure}
            granularityMode={granularityMode}
            onGranularityModeChange={setGranularityMode}
            appliedPriorities={appliedPriorities}
            leftDrawerOpen={leftPanelOpen}
            onToggleLeftDrawer={() => setLeftPanelOpen((v) => !v)}
            rightDrawerOpen={rightPanelOpen}
            onToggleRightDrawer={() => setRightPanelOpen((v) => !v)}
            communityQualityScore={communityQualityScore}
            familyFitScore={familyFitScore}
            onOpenScoreDetails={() => setScoreDetailsOpen(true)}
            onToggleModelCalibration={setShowModelCalibration}
            specializedFacilities={specializedSnapshot?.facilities ?? []}
            onOpenSpecializedExplorer={handleOpenSpecializedModal}
          />

          {/* LEFT SLIDE-OUT PANEL (Desktop Overlay Drawer / Mobile Bottom Sheet): FIND YOUR FIT */}
          {leftPanelOpen && (
            <aside
              data-testid="find-your-fit-drawer"
              aria-label="Find Your Fit Slide-Out Panel"
              className="fixed inset-x-0 bottom-0 z-40 max-h-[78vh] min-h-0 rounded-t-2xl border-t border-[#D4AF63]/60 bg-[#040E26]/98 p-3.5 shadow-[0_-12px_36px_rgba(0,0,0,0.92)] overflow-y-auto overscroll-contain custom-scrollbar md:absolute md:inset-x-auto md:top-14 md:bottom-16 md:left-3 md:z-30 md:w-[310px] md:max-h-none md:rounded-xl md:border md:border-[#2A3F6A] md:bg-[#040E26]/96 backdrop-blur-md flex flex-col gap-2.5 animate-in fade-in slide-in-from-left-4 duration-200"
            >
              {/* Mobile Bottom-Sheet Drag Handle */}
              <div className="md:hidden w-10 h-1 rounded-full bg-[#364E7A] mx-auto mb-1 shrink-0" />

              {/* Drawer Header with Independent Dismiss Button */}
              <div className="flex items-center justify-between border-b border-[#1D2F52] pb-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#D4AF63]" />
                  <h2
                    className="text-base font-bold text-[#F4F6FB]"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    Find Your Fit
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-testid="reset-priorities-btn"
                    onClick={handleResetPriorities}
                    className="text-[11px] text-[#94A3B8] hover:text-white underline cursor-pointer"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    data-testid="close-fit-drawer-btn"
                    onClick={() => setLeftPanelOpen(false)}
                    className="p-1 rounded-md text-[#94A3B8] hover:text-white hover:bg-[#0F234A] cursor-pointer"
                    title="Dismiss Find Your Fit panel"
                    aria-label="Dismiss Find Your Fit panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* 5 Category Tabs (Communities · Schools · Specialized · Housing · Family Life) */}
              <div className="grid grid-cols-5 rounded-lg bg-[#02091A] border border-[#24355A] overflow-hidden shrink-0">
                {(
                  [
                    { id: "communities", label: "Communities", icon: Home },
                    { id: "schools", label: "Schools", icon: GraduationCap },
                    { id: "specialized_residential", label: "Specialized", icon: Hospital },
                    { id: "housing", label: "Housing", icon: Building2 },
                    { id: "family_life", label: "Family Life", icon: Users },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  const active = categoryTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      data-testid={`fit-tab-${tab.id}`}
                      onClick={() => handleCategoryTabClick(tab.id)}
                      className={`py-1.5 px-1 flex flex-col items-center justify-center gap-0.5 text-[9.5px] font-medium border-b-2 transition-all cursor-pointer ${
                        active
                          ? "bg-[#0D2149] border-[#D4AF63] text-[#F4F6FB]"
                          : "border-transparent text-[#94A3B8] hover:text-white hover:bg-[#081736]"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 text-[#D4AF63]" />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Family Priorities Checklist */}
              <div className="rounded-lg bg-[#02091A]/90 border border-[#1D2F52] p-3 space-y-2.5 shrink-0">
                <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Family Priorities
                </p>
                <div className="space-y-1.5">
                  {FAMILY_PRIORITY_LABELS.map((item) => {
                    const checked = draftPriorities.includes(item.key);
                    return (
                      <label
                        key={item.key}
                        className="flex items-center gap-2.5 text-xs text-[#CBD5E1] hover:text-white py-0.5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          data-testid={`priority-checkbox-${item.key}`}
                          checked={checked}
                          onChange={() => handleTogglePriority(item.key)}
                          className="h-3.5 w-3.5 rounded border-[#475569] accent-[#D4AF63] cursor-pointer"
                        />
                        <span>{item.label}</span>
                      </label>
                    );
                  })}
                </div>

                <button
                  type="button"
                  data-testid="update-fit-results-btn"
                  onClick={handleUpdateResults}
                  className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-bold text-xs border border-[#FFE394]/50 shadow-md hover:brightness-105 transition-all cursor-pointer"
                >
                  Update Results
                </button>
              </div>

              {/* Contextual Category Quick-Select List */}
              {categoryTab === "specialized_residential" ? (
                <SpecializedFacilitiesSummaryCard
                  selectedCountyFips={selectedCommunity.fips}
                  selectedCountyName={selectedCommunity.shortName}
                  selectedStateCode={selectedCommunity.stateCode || "GA"}
                  snapshot={specializedSnapshot}
                  onOpenExplorerModal={handleOpenSpecializedModal}
                  onSelectFacilityOnMap={handleSelectFacilityOnMap}
                  compact
                />
              ) : (
                <div className="rounded-lg bg-[#02091A]/90 border border-[#1D2F52] p-2.5 flex flex-col shrink-0">
                  <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-1.5">
                    {categoryTab === "schools"
                      ? `Mapped Districts & Schools (${countyDistricts.length + countySchools.length})`
                      : `Georgia Communities (${communities.length})`}
                  </p>
                  <div className="space-y-1">
                    {categoryTab === "schools" ? (
                      <>
                        {countyDistricts.map((d) => (
                          <div
                            key={d.id}
                            className="px-2.5 py-1.5 rounded-lg bg-[#081736] border border-[#1D2F52] text-xs"
                          >
                            <p className="font-semibold text-[#F3D68B]">{d.name}</p>
                            <p className="text-[10px] text-[#94A3B8]">{d.approximateEnrollment}</p>
                          </div>
                        ))}
                        {countySchools.map((s) => (
                          <div
                            key={s.id}
                            className="px-2.5 py-1.5 rounded-lg bg-[#06122B] border border-[#17284A] text-xs space-y-0.5"
                          >
                            <p className="font-medium text-[#F4F6FB]">{s.name}</p>
                            <p className="text-[10px] text-[#7DD3FC]">{s.level} Campus</p>
                            <button
                              type="button"
                              onClick={() => handleOpenSpecializedModal("all")}
                              className="text-[9.5px] text-[#F3D68B] hover:underline cursor-pointer"
                            >
                              View Specialized &amp; Residential Continuum →
                            </button>
                          </div>
                        ))}
                        {countyDistricts.length === 0 && countySchools.length === 0 && (
                          <p className="text-[11px] text-[#94A3B8] py-2">
                            NCES school directory import pending for {selectedCommunity.shortName}.
                          </p>
                        )}
                      </>
                    ) : (
                      communities.map((c) => {
                        const active = c.fips === selectedCommunity.fips;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() =>
                              handleSelectCommunityByFips(c.fips, c.name, c.coordinates)
                            }
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                              active
                                ? "bg-[#102854] border border-[#D4AF63]/60 text-[#F3D68B] font-semibold"
                                : "hover:bg-[#081736] text-[#CBD5E1]"
                            }`}
                          >
                            <span className="truncate">{c.shortName}</span>
                            <span className="text-[10px] text-[#94A3B8] shrink-0">
                              {c.region.split(" ")[0]}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </aside>
          )}

          {/* RIGHT SLIDE-OUT PANEL (Desktop Overlay Drawer / Mobile Bottom Sheet): COMMUNITY DOSSIER */}
          {rightPanelOpen && (
            <aside
              data-testid="community-dossier-drawer"
              aria-label="Community Dossier Slide-Out Panel"
              className="fixed inset-x-0 bottom-0 z-40 max-h-[78vh] min-h-0 rounded-t-2xl border-t border-[#D4AF63]/60 bg-[#040E26]/98 p-3.5 shadow-[0_-12px_36px_rgba(0,0,0,0.92)] overflow-y-auto overscroll-contain custom-scrollbar md:absolute md:inset-x-auto md:top-14 md:bottom-16 md:right-3 md:z-30 md:w-[322px] md:max-h-none md:rounded-xl md:border md:border-[#2A3F6A] md:bg-[#040E26]/96 backdrop-blur-md flex flex-col justify-between gap-3 animate-in fade-in slide-in-from-right-4 duration-200"
            >
              {/* Mobile Bottom-Sheet Drag Handle */}
              <div className="md:hidden w-10 h-1 rounded-full bg-[#364E7A] mx-auto mb-1 shrink-0" />

              <div className="space-y-3">
                {/* Drawer Header with Independent Dismiss Button */}
                <div className="flex items-start justify-between gap-2 border-b border-[#1D2F52] pb-2">
                  <div className="min-w-0">
                    <span className="text-[9.5px] uppercase tracking-wider text-[#D4AF63] font-semibold block">
                      Community Dossier
                    </span>
                    <h2
                      className="text-lg font-bold text-[#F4F6FB] truncate"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      {selectedCommunity.name}
                    </h2>
                    <p className="text-[11px] text-[#94A3B8] truncate">
                      {selectedCommunity.region} · FIPS {selectedCommunity.fips}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={toggleSaved}
                      title={isSaved ? "Saved to shortlist" : "Save community"}
                      className="p-1 text-[#D4AF63] hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Heart
                        className={`h-4 w-4 ${isSaved ? "fill-[#D4AF63]" : ""}`}
                      />
                    </button>
                    <button
                      type="button"
                      data-testid="close-dossier-drawer-btn"
                      onClick={() => setRightPanelOpen(false)}
                      className="p-1 rounded-md text-[#94A3B8] hover:text-white hover:bg-[#0F234A] cursor-pointer"
                      title="Dismiss Community Dossier"
                      aria-label="Dismiss Community Dossier"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Compact Hero Banner */}
                <CommunityHeroIllustration
                  styleVariant={selectedCommunity.heroImageStyle}
                  name={selectedCommunity.name}
                />

                {/* Scoring Integrity & Evidence Completeness Banner */}
                <div className="rounded-lg bg-[#020818] border border-[#24355A] px-2.5 py-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-semibold uppercase tracking-wider flex items-center gap-1 text-[#F3D68B]">
                      <FlaskConical className="h-3 w-3 text-[#D4AF63]" />
                      {showModelCalibration
                        ? "Fictional Calibration Demo"
                        : selectedCommunity.acsDemographics
                          ? "Verified Public Sources Active"
                          : "Pending Verified Data"}
                    </span>
                    <label className="flex items-center gap-1.5 text-[11px] text-[#93C5FD] cursor-pointer">
                      <input
                        type="checkbox"
                        data-testid="dossier-demo-scores-toggle"
                        checked={showModelCalibration}
                        onChange={(e) => setShowModelCalibration(e.target.checked)}
                        className="h-3 w-3 accent-[#D4AF63] cursor-pointer"
                      />
                      <span>Demo Scores</span>
                    </label>
                  </div>
                  <div
                    data-testid="dossier-evidence-completeness"
                    className="flex items-center justify-between text-[10px] text-[#C4B5FD] bg-[#121036]/80 border border-[#4C3F91]/50 rounded px-2 py-0.5"
                  >
                    <span>Evidence Completeness:</span>
                    <span className="font-semibold">
                      {selectedCommunity.evidenceCompleteness?.ratioText ||
                        (isVerifiedSource ? "6/6 Verified Sources" : "0/6 Verified Sources")}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-[#94A3B8] leading-snug">
                    {showModelCalibration
                      ? "Showing fictional calibration numbers for unimported pillars alongside real Census ACS & NCES directory facts."
                      : selectedCommunity.acsDemographics
                        ? "Showing strictly verified US Census ACS & NCES CCD indicators. Unimported pillars (GOSA Academics, Safety) remain null."
                        : "Official GOSA / GaDOE / ACS ratings not yet imported. Toggle 'Demo Scores' to test formula."}
                  </p>
                </div>

                {/* Community Quality Score */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setScoreDetailsOpen(true)}
                      className="text-xs font-semibold text-[#CBD5E1] flex items-center gap-1 hover:text-white cursor-pointer"
                    >
                      <span>Community Quality Score</span>
                      <Info className="h-3 w-3 text-[#94A3B8]" />
                    </button>
                    {communityQualityScore !== null ? (
                      <div className="text-right">
                        <span
                          className="text-xl font-bold text-[#F3D68B]"
                          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        >
                          {communityQualityScore}
                        </span>
                        <span className="text-[11px] text-[#94A3B8]"> /100 Demo</span>
                      </div>
                    ) : (
                      <span className="text-[11px] font-medium text-[#94A3B8]">
                        No Verified Data
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#081736] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#9E7D3B] via-[#D4AF63] to-[#F3D68B] transition-all duration-300"
                      style={{
                        width: `${communityQualityScore !== null ? communityQualityScore : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Family Fit Score */}
                <div className="space-y-1 pb-2 border-b border-[#1D2F52]">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setScoreDetailsOpen(true)}
                      className="text-xs font-semibold text-[#CBD5E1] flex items-center gap-1 hover:text-white cursor-pointer"
                    >
                      <span>Family Fit Score</span>
                      <Info className="h-3 w-3 text-[#94A3B8]" />
                    </button>
                    {familyFitScore !== null ? (
                      <div className="text-right">
                        <span
                          className="text-xl font-bold text-[#93C5FD]"
                          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        >
                          {familyFitScore}
                        </span>
                        <span className="text-[11px] text-[#94A3B8]"> /100 Demo</span>
                      </div>
                    ) : (
                      <span className="text-[11px] font-medium text-[#94A3B8]">
                        No Verified Data
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#081736] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#93C5FD] transition-all duration-300"
                      style={{
                        width: `${familyFitScore !== null ? familyFitScore : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Verified U.S. Census Bureau ACS 5-Year & NCES CCD Card */}
                {selectedCommunity.acsDemographics && (
                  <div
                    data-testid="dossier-verified-acs-card"
                    className="rounded-lg bg-[#020A1E] border border-emerald-500/40 p-2.5 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-emerald-300">
                        Verified Census ACS ({selectedCommunity.acsDemographics.surveyPeriod})
                      </span>
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 font-semibold">
                        Verified
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <div className="rounded bg-[#061430] border border-[#17284A] p-1.5">
                        <span className="text-[9.5px] text-[#94A3B8] block">
                          Median Household Income
                        </span>
                        <span className="font-bold text-[#F4F6FB] font-mono">
                          $
                          {selectedCommunity.acsDemographics.medianHouseholdIncome.toLocaleString()}
                        </span>
                        <span className="text-[9.5px] text-[#94A3B8] block">
                          MOE ±$
                          {selectedCommunity.acsDemographics.medianHouseholdIncomeMoe.toLocaleString()}
                        </span>
                      </div>
                      <div className="rounded bg-[#061430] border border-[#17284A] p-1.5">
                        <span className="text-[9.5px] text-[#94A3B8] block">
                          Median Home Value
                        </span>
                        <span className="font-bold text-[#F4F6FB] font-mono">
                          $
                          {selectedCommunity.acsDemographics.medianHomeValue.toLocaleString()}
                        </span>
                        <span className="text-[9.5px] text-[#94A3B8] block">
                          MOE ±$
                          {selectedCommunity.acsDemographics.medianHomeValueMoe.toLocaleString()}
                        </span>
                      </div>
                      <div className="rounded bg-[#061430] border border-[#17284A] p-1.5">
                        <span className="text-[9.5px] text-[#94A3B8] block">
                          Median Gross Rent
                        </span>
                        <span className="font-bold text-[#F4F6FB] font-mono">
                          $
                          {selectedCommunity.acsDemographics.medianGrossRent.toLocaleString()}
                          /mo
                        </span>
                        <span className="text-[9.5px] text-[#94A3B8] block">
                          MOE ±$
                          {selectedCommunity.acsDemographics.medianGrossRentMoe.toLocaleString()}
                        </span>
                      </div>
                      <div className="rounded bg-[#061430] border border-[#17284A] p-1.5">
                        <span className="text-[9.5px] text-[#94A3B8] block">
                          Mean Commute Time
                        </span>
                        <span className="font-bold text-[#F4F6FB] font-mono">
                          {selectedCommunity.acsDemographics.meanCommuteMinutes} min
                        </span>
                        <span className="text-[9.5px] text-[#94A3B8] block">
                          MOE ±{selectedCommunity.acsDemographics.meanCommuteMinutesMoe} min
                        </span>
                      </div>
                    </div>

                    {/* Verified Normalized Indicator Scores (0-100) */}
                    {selectedCommunity.verifiedPillars && (
                      <div className="pt-1 border-t border-[#17284A] space-y-1 text-[10.5px]">
                        <div className="flex items-center justify-between text-[#CBD5E1]">
                          <span>Affordability Score (ACS Verified):</span>
                          <span className="font-mono font-bold text-emerald-300">
                            {selectedCommunity.verifiedPillars.affordability ?? "null"}/100
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[#CBD5E1]">
                          <span>Connectivity Score (ACS Verified):</span>
                          <span className="font-mono font-bold text-emerald-300">
                            {selectedCommunity.verifiedPillars.commute ?? "null"}/100
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[#CBD5E1]">
                          <span>School Infrastructure (NCES+ACS):</span>
                          <span className="font-mono font-bold text-emerald-300">
                            {selectedCommunity.verifiedPillars.familyLifestyle ?? "null"}/100
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Special Education Intelligence Summary (5-Tier Verification + Non-Guarantee Guardrail) */}
                {countySpedRecords.length > 0 && (
                  <div
                    data-testid="dossier-sped-intelligence-card"
                    className="rounded-lg bg-[#020A1E] border border-[#2A3F6A] p-2.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#F3D68B]">
                        Special Ed Intelligence ({countySpedRecords[0].ncesLeaId7})
                      </span>
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-[#102854] border border-[#D4AF63]/50 text-[#F3D68B] font-semibold">
                        {countySpedRecords[0].verificationTier}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-[#F4F6FB]">
                      {countySpedRecords[0].entityName}
                    </p>
                    <p className="text-[10.5px] text-[#CBD5E1] leading-snug">
                      {countySpedRecords[0].programLocationsAndServedGrades}
                    </p>
                    <p className="text-[9.5px] text-[#94A3B8] italic leading-snug">
                      {countySpedRecords[0].nonGuaranteeDisclaimer}
                    </p>
                  </div>
                )}

                {/* Nationwide Special Education Rights & Accountability Section */}
                <DossierRightsAccountabilityCard
                  stateFips2={String(selectedCommunity.fips || "13117").slice(0, 2)}
                  countyFips5={selectedCommunity.fips}
                  communityName={selectedCommunity.shortName}
                  onOpenFullModal={() => setRightsModalOpen(true)}
                />

                {/* Nationwide Specialized Programs & Residential Settings (10 Categories, 50 States) */}
                <SpecializedFacilitiesSummaryCard
                  selectedCountyFips={selectedCommunity.fips}
                  selectedCountyName={selectedCommunity.shortName}
                  selectedStateCode={selectedCommunity.stateCode || "GA"}
                  snapshot={specializedSnapshot}
                  onOpenExplorerModal={handleOpenSpecializedModal}
                  onSelectFacilityOnMap={handleSelectFacilityOnMap}
                />

                {/* Factual Geographic & Data Status Insights */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#F3D68B] flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-[#D4AF63]" />
                    Boundary & Dataset Status
                  </p>
                  <ul className="space-y-1">
                    {selectedCommunity.keyInsights.map((insight) => (
                      <li
                        key={insight}
                        className="flex items-start gap-1.5 text-[11.5px] text-[#CBD5E1] leading-snug"
                      >
                        <Check className="h-3.5 w-3.5 text-[#D4AF63] shrink-0 mt-0.5" />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Compare CTA */}
              <button
                type="button"
                data-testid="dossier-compare-btn"
                onClick={() => setCompareOpen(true)}
                className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-bold text-xs border border-[#FFE394]/50 shadow-md hover:brightness-105 transition-all cursor-pointer"
              >
                Compare with Another Area
              </button>
            </aside>
          )}
        </div>

        {/* Modals & Internal Studio Drawer */}
        <PlacesCompareModal
          open={compareOpen}
          onClose={() => setCompareOpen(false)}
          primary={selectedCommunity}
          communities={communities}
          selectedPriorities={appliedPriorities}
          weights={weights}
          showModelCalibration={showModelCalibration}
          onToggleModelCalibration={setShowModelCalibration}
        />

        <PlacesScoreDetailsModal
          open={scoreDetailsOpen}
          onClose={() => setScoreDetailsOpen(false)}
          weights={weights}
          showModelCalibration={showModelCalibration}
          onToggleModelCalibration={setShowModelCalibration}
        />

        <PlacesStudioDrawer
          open={studioOpen}
          onClose={() => setStudioOpen(false)}
          communities={communities}
        />

        <RightsAccountabilityFullModal
          open={rightsModalOpen}
          onClose={() => setRightsModalOpen(false)}
          initialStateFips2={String(selectedCommunity.fips || "13117").slice(0, 2)}
          countyFips5={selectedCommunity.fips}
          communityName={selectedCommunity.shortName}
        />

        <SpecializedFacilitiesExplorerModal
          open={specializedModalOpen}
          onClose={() => setSpecializedModalOpen(false)}
          snapshot={specializedSnapshot}
          initialCategory={specializedInitialCategory}
          initialStateCode={selectedCommunity.stateCode || "GA"}
          selectedCountyFips={selectedCommunity.fips}
          selectedCountyName={selectedCommunity.shortName}
          onSelectFacilityOnMap={handleSelectFacilityOnMap}
          onTriggerConnectorRefresh={(connectorId) =>
            refreshSpecializedMutation.mutate({ connectorId })
          }
          isRefreshing={refreshSpecializedMutation.isPending}
        />
      </div>
    </ScopedErrorBoundary>
  );
}
