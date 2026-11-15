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
  Code2,
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
  CENSUS_TRACT_SPED_GUARDRAIL_DISCLAIMER,
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
  type PillarMetrics,
  type PlaceCommunityRecord,
  type PlacesCategoryTab,
  type PlacesMapDisplayMode,
  type PlaceSubCountyTractRecord,
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
import { WixEmbedModal } from "@/components/places/WixEmbedModal";

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

  // Ensure page-level document scrolling is unlocked so users can smoothly scroll down
  // beside the map or below the map without cards overlapping.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    htmlEl.style.overflowY = "";
    bodyEl.style.overflowY = "";
    window.scrollTo(0, 0);
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

  // Below-Map Sections: Open by default BELOW the map so the map stays 100% unobstructed and users can scroll down!
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // Compact, dismissible 50-state IEP continuity strip
  const [iepBannerDismissed, setIepBannerDismissed] = useState(false);

  // Selected Georgia Community (respects ?fips= query param or defaults to Cobb County, GA - FIPS 13067)
  const [selectedFips, setSelectedFips] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const fipsParam = new URLSearchParams(window.location.search).get("fips");
      if (fipsParam && /^\d{5}$/.test(fipsParam)) return fipsParam;
    }
    return "13067";
  });
  const [dynamicCountyOverride, setDynamicCountyOverride] = useState<{
    fips: string;
    name: string;
    coordinates: [number, number];
  } | null>(null);

  // "Find Your Fit" checkboxes & committed priorities (defaults to verified ACS/NCES pillars)
  const [draftPriorities, setDraftPriorities] = useState<FamilyPriorityKey[]>([
    "affordability",
    "familyLifestyle",
    "commute",
  ]);
  const [appliedPriorities, setAppliedPriorities] = useState<FamilyPriorityKey[]>([
    "affordability",
    "familyLifestyle",
    "commute",
  ]);

  // Map Layers state: Default to clean county boundaries (zero pin clutter on initial load).
  // Parents & elders can turn on Schools, Therapy & Doctors, or Specialized Programs with 1 click.
  const [activeLayers, setActiveLayers] = useState<Record<MapLayerKey, boolean>>({
    school_districts: true,
    community_scores: false,
    school_locations: false,
    specialized_residential: false,
    therapy_providers: false,
    neighborhoods: false,
    parks_recreation: false,
  });

  // Selected sub-county Census Tract (11-digit GEOID) for neighborhood-level inspection
  const [selectedTract, setSelectedTract] = useState<PlaceSubCountyTractRecord | null>(null);

  // Choropleth Measure & Granularity state (defaults to verified Affordability indicator)
  const [choroplethMeasure, setChoroplethMeasure] =
    useState<ChoroplethMeasureKey>("affordability");
  const [granularityMode, setGranularityMode] =
    useState<ChoroplethGranularityMode>("auto");

  const [searchQuery, setSearchQuery] = useState("");
  const [savedFipsList, setSavedFipsList] = useState<string[]>(["13067", "13117"]);

  /**
   * SCORING INTEGRITY GUARDRAIL:
   * Real Verified Data Mode (`showModelCalibration = false`) is the default experience.
   * Only verified public sources (U.S. Census Bureau ACS 5-Year + NCES CCD) drive map shading
   * and scores by default, while unimported pillars (GOSA CCRPI Academics, FBI Safety) remain
   * strictly `null` ("Unavailable / Source Pending"). Staff or users may explicitly opt into
   * `Demo Scores` (`showModelCalibration = true`) to preview synthetic 6-pillar calibration.
   */
  const [showModelCalibration, setShowModelCalibration] = useState<boolean>(false);

  // Modals / Drawers for Compare, Score Details, Rights & Accountability, Specialized & Residential, and Staff Places Studio
  const [compareOpen, setCompareOpen] = useState(false);
  const [scoreDetailsOpen, setScoreDetailsOpen] = useState(false);
  const [rightsModalOpen, setRightsModalOpen] = useState(false);
  const [specializedModalOpen, setSpecializedModalOpen] = useState(false);
  const [specializedInitialCategory, setSpecializedInitialCategory] = useState<
    SpecializedFacilityCategory | "all"
  >("all");
  const [studioOpen, setStudioOpen] = useState(false);
  const [wixEmbedOpen, setWixEmbedOpen] = useState(false);
  const isEmbedMode =
    typeof window !== "undefined" &&
    (window.location.pathname === "/waypoint-places/embed" ||
      new URLSearchParams(window.location.search).get("embed") === "1");

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

  // Map Display Mode ("waypoint_map" | "satellite" | "hybrid") — defaults to "hybrid" (Satellite + Labels)
  const [mapDisplayMode, setMapDisplayMode] =
    useState<PlacesMapDisplayMode>("hybrid");

  // Sub-county Census Tracts, TIGERweb LEA Boundaries, and CMS NPPES NPI Therapy Providers for active county (All 50 States)
  const { data: neighborhoodTractsData } =
    trpc.waypointPlaces.getCountyNeighborhoodTracts.useQuery(
      { countyFips5: selectedFips },
      { enabled: Boolean(selectedFips) }
    );

  const subCountyTracts = useMemo(
    () => neighborhoodTractsData?.tracts ?? [],
    [neighborhoodTractsData?.tracts]
  );

  // Roll up live U.S. Census ACS 5-Year housing, income, commute, and pillar scores for ANY U.S. county from its Census Tracts
  const countyCensusRollup = useMemo(() => {
    const matchingTracts = subCountyTracts.filter((t) => t.countyFips5 === selectedFips);
    if (matchingTracts.length === 0) return null;

    let totalPop = 0;
    let weightedIncome = 0;
    let incPop = 0;
    let weightedHome = 0;
    let homePop = 0;
    let weightedRent = 0;
    let rentPop = 0;
    let weightedCommute = 0;
    let commutePop = 0;
    let weightedAffordability = 0;
    let affPop = 0;
    let weightedCommuteScore = 0;
    let comScorePop = 0;

    for (const t of matchingTracts) {
      const pop = Math.max(1, t.populationEstimate || 1);
      totalPop += t.populationEstimate || 0;
      if (t.medianHouseholdIncome && t.medianHouseholdIncome > 0) {
        weightedIncome += t.medianHouseholdIncome * pop;
        incPop += pop;
      }
      if (t.medianHomeValue && t.medianHomeValue > 0) {
        weightedHome += t.medianHomeValue * pop;
        homePop += pop;
      }
      if (t.medianGrossRent && t.medianGrossRent > 0) {
        weightedRent += t.medianGrossRent * pop;
        rentPop += pop;
      }
      if (t.meanCommuteMinutes && t.meanCommuteMinutes > 0) {
        weightedCommute += t.meanCommuteMinutes * pop;
        commutePop += pop;
      }
      if (t.verifiedPillars.affordability !== null) {
        weightedAffordability += t.verifiedPillars.affordability * pop;
        affPop += pop;
      }
      if (t.verifiedPillars.commute !== null) {
        weightedCommuteScore += t.verifiedPillars.commute * pop;
        comScorePop += pop;
      }
    }

    const medianHouseholdIncome = incPop > 0 ? Math.round(weightedIncome / incPop) : null;
    const medianHomeValue = homePop > 0 ? Math.round(weightedHome / homePop) : null;
    const medianGrossRent = rentPop > 0 ? Math.round(weightedRent / rentPop) : null;
    const meanCommuteMinutes =
      commutePop > 0 ? Number((weightedCommute / commutePop).toFixed(1)) : null;
    const affordabilityScore =
      affPop > 0 ? Math.round(weightedAffordability / affPop) : null;
    const commuteScore =
      comScorePop > 0 ? Math.round(weightedCommuteScore / comScorePop) : null;

    const rawPillars: PillarMetrics = {
      communityQuality: null,
      academics: null,
      specializedPrograms: null,
      safetyWellBeing: null,
      familyLifestyle: null,
      affordability: affordabilityScore,
      commute: commuteScore,
    };
    const communityQuality = computeCommunityQualityScore(rawPillars, weights);

    return {
      tractCount: matchingTracts.length,
      countyName: matchingTracts[0].countyName,
      stateCode: matchingTracts[0].stateCode,
      totalPopulation: totalPop,
      medianHouseholdIncome,
      medianHomeValue,
      medianGrossRent,
      meanCommuteMinutes,
      verifiedPillars: {
        ...rawPillars,
        communityQuality,
      },
    };
  }, [subCountyTracts, selectedFips, weights]);

  const selectedCommunity: PlaceCommunityRecord = useMemo(() => {
    const match = communities.find((c) => c.fips === selectedFips);
    if (match) return match;

    const stateFips2 = String(selectedFips || "13117").slice(0, 2);
    const stateMeta = US_50_STATES_DIRECTORY[stateFips2];
    const stateCode = countyCensusRollup?.stateCode || stateMeta?.code || "GA";
    const stateName = stateMeta?.name || "Georgia";
    const rawCountyTitle =
      dynamicCountyOverride?.name ||
      (countyCensusRollup?.countyName
        ? `${countyCensusRollup.countyName}, ${stateCode}`
        : `${stateName} County, ${stateCode}`);
    const demoPillars = DEMO_COUNTY_CALIBRATION_BY_FIPS[selectedFips] || null;
    const hasLiveRollup = Boolean(countyCensusRollup);

    return {
      id: `us-fips-${selectedFips}`,
      fips: selectedFips,
      name: rawCountyTitle,
      shortName: rawCountyTitle.replace(/,?\s*[A-Z]{2}$/i, ""),
      stateCode,
      region: `${stateName} · ${hasLiveRollup ? `${countyCensusRollup!.tractCount} Census Tracts` : "County Boundary"}`,
      coordinates:
        dynamicCountyOverride?.coordinates || stateMeta?.center || [-83.45, 32.85],
      zoomLevel: 9.2,
      heroImageStyle: "piedmont_ridge",
      tagline: hasLiveRollup
        ? `Live U.S. Census ACS 5-Year housing, income & commute rollup across ${countyCensusRollup!.tractCount} neighborhood tracts in ${rawCountyTitle}.`
        : `Selectable ${stateName} county boundary (US Census TIGER · 50-State Coverage).`,
      keyInsights: hasLiveRollup
        ? [
            `Housing Costs (U.S. Census ACS): Median Home ${
              countyCensusRollup!.medianHomeValue
                ? `$${countyCensusRollup!.medianHomeValue.toLocaleString()}`
                : "N/A"
            } · Median Rent ${
              countyCensusRollup!.medianGrossRent
                ? `$${countyCensusRollup!.medianGrossRent.toLocaleString()}/mo`
                : "N/A"
            }`,
            `Household Income & Commute: Median Income ${
              countyCensusRollup!.medianHouseholdIncome
                ? `$${countyCensusRollup!.medianHouseholdIncome.toLocaleString()}`
                : "N/A"
            } · Mean Commute ${
              countyCensusRollup!.meanCommuteMinutes
                ? `${countyCensusRollup!.meanCommuteMinutes} min`
                : "N/A"
            }`,
            `County Coverage: Pop. ${countyCensusRollup!.totalPopulation.toLocaleString()} across ${countyCensusRollup!.tractCount} verified Census Tracts (FIPS ${selectedFips})`,
            `IEP Continuity: IDEA federal protections & Waypoint advocacy apply in ${stateName} (${stateCode})`,
          ]
        : [
            `Geographic Boundary: FIPS ${selectedFips} · ${stateName} (${stateCode})`,
            "IEP Continuity: IDEA federal protections & Waypoint advocacy apply in all 50 states",
            demoPillars
              ? "Choropleth Calibration: Fictional demonstration values active for polygon shading"
              : "Loading live U.S. Census ACS 5-Year housing, income & commute tracts...",
            "Official Ratings: U.S. Census ACS 5-Year & TIGERweb Active",
          ],
      dataStatus: hasLiveRollup
        ? "verified_public_source"
        : demoPillars
          ? "fictional_calibration"
          : "awaiting_verified_dataset",
      dataSourcesPending: hasLiveRollup ? ["State DOE", "FBI CDE"] : ["State DOE", "NCES CCD", "US Census ACS"],
      verifiedPillars: countyCensusRollup?.verifiedPillars,
      calibrationPillars: demoPillars ||
        countyCensusRollup?.verifiedPillars || {
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
  }, [communities, selectedFips, dynamicCountyOverride, countyCensusRollup]);

  const isVerifiedSource =
    selectedCommunity.dataStatus === "verified_public_source" ||
    Boolean(selectedCommunity.verifiedPillars);
  const canShowScores = isVerifiedSource || showModelCalibration;

  const activeScoringPillars: PillarMetrics = useMemo(() => {
    if (showModelCalibration) {
      return selectedCommunity.calibrationPillars;
    }
    return (
      selectedCommunity.verifiedPillars || {
        communityQuality: null,
        academics: null,
        specializedPrograms: null,
        safetyWellBeing: null,
        familyLifestyle: null,
        affordability: null,
        commute: null,
      }
    );
  }, [showModelCalibration, selectedCommunity]);

  const communityQualityScore = useMemo(() => {
    if (!canShowScores) return null;
    return (
      activeScoringPillars.communityQuality ??
      computeCommunityQualityScore(activeScoringPillars, weights)
    );
  }, [activeScoringPillars, weights, canShowScores]);

  const familyFitScore = useMemo(() => {
    if (!canShowScores) return null;
    const directFit = computeFamilyFitScore(
      activeScoringPillars,
      appliedPriorities,
      weights
    );
    if (directFit !== null) return directFit;
    // If the user selected only unimported pillars in Verified Mode, return null ("No Verified Data for Selected Pillars")
    return null;
  }, [activeScoringPillars, appliedPriorities, weights, canShowScores]);

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
    setSelectedTract(null);
    if (fallbackName) {
      setDynamicCountyOverride({
        fips,
        name: fallbackName,
        coordinates: center || [-83.45, 32.85],
      });
    }
  };

  // Post selected county events to parent Wix Velo window when embedded on external websites
  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;
    try {
      window.parent.postMessage(
        {
          type: "WAYPOINT_PLACES_COUNTY_SELECTED",
          fips: selectedCommunity.fips,
          name: selectedCommunity.name,
          stateCode: selectedCommunity.stateCode || "GA",
        },
        "*"
      );
    } catch {
      // ignore cross-origin frame restrictions
    }
  }, [selectedCommunity.fips, selectedCommunity.name, selectedCommunity.stateCode]);

  const schoolDistrictBoundaries = useMemo(
    () =>
      neighborhoodTractsData?.schoolDistrictBoundaries ??
      snapshot?.schoolDistrictBoundaries ??
      [],
    [neighborhoodTractsData?.schoolDistrictBoundaries, snapshot?.schoolDistrictBoundaries]
  );
  const allTherapyProviders = useMemo(
    () =>
      snapshot?.therapyProviders ??
      neighborhoodTractsData?.therapyProviders ??
      [],
    [snapshot?.therapyProviders, neighborhoodTractsData?.therapyProviders]
  );
  const countyTherapyProviders = useMemo(
    () =>
      allTherapyProviders.filter((p) => p.countyFips5 === selectedCommunity.fips),
    [allTherapyProviders, selectedCommunity.fips]
  );

  // Haversine distance helper in miles from the active neighborhood tract (or county centroid)
  const activeReferenceCoords: [number, number] = useMemo(
    () => selectedTract?.centroid ?? selectedCommunity.coordinates,
    [selectedTract, selectedCommunity.coordinates]
  );

  const computeDistanceMiles = (targetCoords: [number, number]): number => {
    const [lon1, lat1] = activeReferenceCoords;
    const [lon2, lat2] = targetCoords;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 3958.8; // Earth radius in miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
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
        className={`${crmSidebar ? "h-full max-h-full" : "h-svh max-h-svh"} flex-1 min-h-0 w-full max-w-full overflow-y-auto bg-[#0C213E] text-[#FFF8E7] flex flex-col gap-3.5 p-3.5 select-none custom-scrollbar`}
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, #1E4478 0%, #10294C 48%, #091830 100%)",
        }}
      >
        {/* ================================================================= */}
        {/* 1. FLAGSHIP CENTERPIECE MASTHEAD (Larger Title + Moving Truck)    */}
        {/* ================================================================= */}
        <header className="relative overflow-hidden rounded-2xl bg-[#000F26] border-2 border-[#DFBE77]/80 px-5 py-2.5 shadow-[0_14px_34px_rgba(0,0,0,0.78),0_0_26px_rgba(223,190,119,0.2),inset_0_1px_1px_rgba(255,244,212,0.32)] shrink-0">
          {/* Subtle Top Gold Filigree Shimmer Line */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[2px] z-20"
            style={{
              background:
                "linear-gradient(90deg, transparent 5%, #FFE394 35%, #FFF8E7 50%, #FFE394 65%, transparent 95%)",
            }}
          />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-center gap-4">
            {/* Left (lg:col-span-4): High-Impact Flagship Title */}
            <div className="lg:col-span-4 flex items-center gap-4 min-w-0">
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-b from-[#173A70] to-[#081730] border-2 border-[#FFE394]/85 shadow-[0_6px_18px_rgba(0,0,0,0.75),0_0_18px_rgba(255,227,148,0.3),inset_0_1px_1px_rgba(255,255,255,0.28)] flex items-center justify-center shrink-0">
                <CompassRoseEmblem />
              </div>

              <div className="min-w-0">
                <h1
                  className="text-3xl sm:text-4xl xl:text-[42px] font-bold tracking-[0.02em] bg-gradient-to-b from-[#FFFFFF] via-[#FFF4D4] to-[#E5C170] bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(255,227,148,0.32)] leading-[1.05]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Waypoint Places
                </h1>
                <p className="text-xs sm:text-sm text-[#EADBC0] font-medium mt-1 leading-snug">
                  Find a community where your child’s education and your family can thrive.
                </p>
                {!isEmbedMode && (
                  <button
                    type="button"
                    data-testid="open-wix-embed-modal-btn"
                    onClick={() => setWixEmbedOpen(true)}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-[#FCE6A6] via-[#E5C170] to-[#C59B43] text-[#07162B] font-bold text-[11px] border border-[#FFF4D4] shadow-[0_3px_10px_rgba(229,193,112,0.35)] hover:brightness-105 transition-all cursor-pointer"
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    <span>Embed on My Site (Wix / Velo Copy)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Center (lg:col-span-4): Transparent Waypoint Moving Truck & 50-State Route Object */}
            <div className="lg:col-span-4 relative h-[155px] sm:h-[176px] w-full flex items-center justify-center">
              <img
                src="/assets/waypoint-moving-truck-hero.png?v=3"
                alt="Waypoint Moving Truck traveling across the 50 states between family homes"
                className="max-h-full max-w-full h-full w-auto object-contain select-none pointer-events-none"
              />
            </div>

            {/* Right (lg:col-span-4): Integrated Beveled 50-State IEP Continuity Card */}
            {!iepBannerDismissed && (
              <div
                data-testid="iep-50-states-banner"
                className="lg:col-span-4 relative rounded-2xl bg-gradient-to-b from-[#081A38] via-[#05122A] to-[#030B1D] border-2 border-[#18335E] px-5 py-3.5 shadow-[0_12px_28px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(147,197,253,0.2)]"
              >
                <div className="w-11 h-[3px] rounded-full bg-[#DFB468] mb-2" />
                <p className="text-base sm:text-lg font-medium text-[#F8FAFC] leading-snug tracking-[-0.01em]">
                  Did you know your child’s IEP follows them{" "}
                  <span className="text-[#DFB468] font-semibold">to any state</span>, and so does{" "}
                  <span className="text-[#DFB468] font-semibold">Waypoint</span>?
                </p>
                <p className="text-xs sm:text-sm text-[#8CAAD0] font-normal mt-1">
                  Supporting your family in all 50 states.
                </p>
              </div>
            )}
          </div>
        </header>

        {/* ================================================================= */}
        {/* 2. CLEAN MAP WORKSPACE + BELOW-MAP SCROLLABLE ADMIRALTY GUIDE     */}
        {/* ================================================================= */}
        <div className="w-full flex flex-col gap-4 pb-12 shrink-0">
          {/* Primary MapLibre + Vector Choropleth Environment + Right Scroll Rail + Below-Map Shading Deck */}
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
            subCountyTracts={subCountyTracts}
            schoolDistrictBoundaries={schoolDistrictBoundaries}
            therapyProviders={allTherapyProviders}
            selectedTractGeoid={selectedTract?.geoid11 ?? null}
            onSelectTract={(tract) => {
              setSelectedTract(tract);
              if (tract) {
                setRightPanelOpen(true);
              }
            }}
            focusMode={focusMode}
            onToggleFocusMode={handleToggleFocusMode}
          />

          {/* BELOW-MAP 2-COLUMN DASHBOARD (Scroll Down — Brighter Royal Navy & Gold Cards) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start shrink-0">
            {/* LEFT COLUMN (xl:col-span-4): MY FAMILY PRIORITIES & COUNTY BROWSER */}
            {leftPanelOpen && (
              <aside
                id="below-map-priorities-section"
                data-testid="find-your-fit-drawer"
                aria-label="Find Your Fit Slide-Out Panel"
                className="xl:col-span-4 rounded-xl border border-[#DFBE77]/65 bg-gradient-to-b from-[#112A4E] to-[#0B1C38] p-4 shadow-[0_10px_28px_rgba(0,0,0,0.65),0_0_18px_rgba(223,190,119,0.12),inset_0_1px_1px_rgba(255,244,212,0.18)] flex flex-col gap-3 shrink-0"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#C5A059]/45 pb-2.5 shrink-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#FFE394]" />
                    <h2
                      className="text-base font-bold text-[#FFF8E7]"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      My Family Priorities
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="reset-priorities-btn"
                      onClick={handleResetPriorities}
                      className="text-xs text-[#FFE394] hover:text-white underline cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>

              {/* 5 Category Tabs (Communities · Schools · Specialized · Housing · Family Life) */}
              <div className="grid grid-cols-5 rounded-xl bg-[#091830] border border-[#C5A059]/55 overflow-hidden shrink-0">
                {(
                  [
                    { id: "communities", label: "Counties", icon: Home },
                    { id: "schools", label: "Schools", icon: GraduationCap },
                    { id: "specialized_residential", label: "Special Ed", icon: Hospital },
                    { id: "housing", label: "Housing", icon: Building2 },
                    { id: "family_life", label: "Therapy", icon: Users },
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
                      className={`py-2 px-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold border-b-2 transition-all cursor-pointer ${
                        active
                          ? "bg-[#183866] border-[#FFE394] text-[#FFF8E7]"
                          : "border-transparent text-[#EADBC0] hover:text-white hover:bg-[#102648]"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 text-[#FFE394]" />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Family Priorities Checklist */}
              <div className="rounded-xl bg-[#091830]/95 border border-[#C5A059]/55 p-3 space-y-2.5 shrink-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#FFE394]">
                  What Matters Most to Your Family?
                </p>
                <div className="space-y-1.5">
                  {FAMILY_PRIORITY_LABELS.map((item) => {
                    const checked = draftPriorities.includes(item.key);
                    return (
                      <label
                        key={item.key}
                        className="flex items-center gap-2.5 text-xs text-[#FFF8E7] hover:text-[#FFE394] py-0.5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          data-testid={`priority-checkbox-${item.key}`}
                          checked={checked}
                          onChange={() => handleTogglePriority(item.key)}
                          className="h-4 w-4 rounded border-[#DFBE77] accent-[#DFBE77] cursor-pointer"
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
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#FCE6A6] via-[#E5C170] to-[#C59B43] text-[#07162B] font-bold text-xs border border-[#FFF4D4] shadow-[0_4px_14px_rgba(229,193,112,0.35)] hover:brightness-105 transition-all cursor-pointer"
                >
                  Apply My Priorities
                </button>
              </div>
            </aside>
          )}

            {/* RIGHT COLUMN (xl:col-span-8): SELECTED AREA FULL GUIDE & DOSSIER */}
            {rightPanelOpen && (
              <aside
                id="below-map-dossier-section"
                data-testid="community-dossier-drawer"
                aria-label="Community Dossier Slide-Out Panel"
                className={`${
                  leftPanelOpen ? "xl:col-span-8" : "xl:col-span-12"
                } rounded-xl border border-[#DFBE77]/65 bg-gradient-to-b from-[#112A4E] to-[#0B1C38] p-4 shadow-[0_10px_28px_rgba(0,0,0,0.65),0_0_18px_rgba(223,190,119,0.12),inset_0_1px_1px_rgba(255,244,212,0.18)] flex flex-col justify-between gap-4 shrink-0`}
              >
                <div className="space-y-3">
                {/* Drawer Header with Independent Dismiss Button */}
                <div className="flex items-start justify-between gap-2 border-b border-[#C5A059]/45 pb-2.5">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase tracking-wider text-[#FFE394] font-bold block">
                      Selected Area Guide
                    </span>
                    <h2
                      className="text-xl font-bold text-[#FFF8E7] truncate"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      {selectedCommunity.name}
                    </h2>
                    <p className="text-xs text-[#EADBC0] truncate">
                      {selectedCommunity.region}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={toggleSaved}
                      title={isSaved ? "Saved to favorites" : "Save this area"}
                      className="p-1.5 rounded-lg border border-[#C5A059]/60 bg-[#091830] text-[#FFE394] hover:border-[#FFE394] transition-all cursor-pointer"
                    >
                      <Heart
                        className={`h-4 w-4 ${isSaved ? "fill-[#FFE394]" : ""}`}
                      />
                    </button>
                    <button
                      type="button"
                      data-testid="nav-save-share-btn"
                      onClick={() => {
                        const shareUrl = `${window.location.origin}/tools/waypoint-places?fips=${selectedCommunity.fips}`;
                        navigator.clipboard.writeText(shareUrl);
                        toast.success(`Copied ${selectedCommunity.name} link to clipboard`);
                      }}
                      title="Copy a direct link to this community"
                      className="p-1.5 rounded-lg border border-[#C5A059]/60 bg-[#091830] text-[#FFE394] hover:border-[#FFE394] transition-all cursor-pointer"
                    >
                      <Bookmark className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Compact Hero Banner */}
                <CommunityHeroIllustration
                  styleVariant={selectedCommunity.heroImageStyle}
                  name={selectedCommunity.name}
                />

                {/* Plain-English Community Snapshot (Income, Home Price, Rent, Commute) */}
                {selectedCommunity.acsDemographics && (
                  <div
                    data-testid="dossier-verified-acs-card"
                    className="rounded-xl bg-[#091830]/95 border border-[#C5A059]/55 p-3 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className="text-xs font-bold text-[#FFF8E7]"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                      >
                        Housing, Income &amp; Commute
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#122C54] text-[#FFE394] border border-[#DFBE77]/60 font-semibold">
                        Official U.S. Census
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-[#102648]/90 border border-[#C5A059]/45 p-2">
                        <span className="text-[10px] text-[#EADBC0] block">
                          Typical Household Income
                        </span>
                        <span
                          className="text-sm font-bold text-[#FFF8E7] block mt-0.5"
                          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        >
                          $
                          {selectedCommunity.acsDemographics.medianHouseholdIncome.toLocaleString()}
                          /yr
                        </span>
                        <span className="text-[9.5px] text-[#D8C5A0] block">
                          ±$
                          {selectedCommunity.acsDemographics.medianHouseholdIncomeMoe.toLocaleString()}{" "}
                          (B19049_001E)
                        </span>
                      </div>
                      <div className="rounded-lg bg-[#102648]/90 border border-[#C5A059]/45 p-2">
                        <span className="text-[10px] text-[#EADBC0] block">
                          Typical Home Price
                        </span>
                        <span
                          className="text-sm font-bold text-[#FFF8E7] block mt-0.5"
                          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        >
                          $
                          {selectedCommunity.acsDemographics.medianHomeValue.toLocaleString()}
                        </span>
                        <span className="text-[9.5px] text-[#D8C5A0] block">
                          ±$
                          {selectedCommunity.acsDemographics.medianHomeValueMoe.toLocaleString()}{" "}
                          (B25077_001E)
                        </span>
                      </div>
                      <div className="rounded-lg bg-[#102648]/90 border border-[#C5A059]/45 p-2">
                        <span className="text-[10px] text-[#EADBC0] block">
                          Typical Monthly Rent
                        </span>
                        <span
                          className="text-sm font-bold text-[#FFF8E7] block mt-0.5"
                          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        >
                          $
                          {selectedCommunity.acsDemographics.medianGrossRent.toLocaleString()}
                          /mo
                        </span>
                        <span className="text-[9.5px] text-[#D8C5A0] block">
                          ±$
                          {selectedCommunity.acsDemographics.medianGrossRentMoe.toLocaleString()}{" "}
                          (B25058_001E)
                        </span>
                      </div>
                      <div className="rounded-lg bg-[#102648]/90 border border-[#C5A059]/45 p-2">
                        <span className="text-[10px] text-[#EADBC0] block">
                          Average Drive to Work
                        </span>
                        <span
                          className="text-sm font-bold text-[#FFF8E7] block mt-0.5"
                          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        >
                          {selectedCommunity.acsDemographics.meanCommuteMinutes} min
                        </span>
                        <span className="text-[9.5px] text-[#D8C5A0] block">
                          ±{selectedCommunity.acsDemographics.meanCommuteMinutesMoe} min (B08303)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Community Quality & Family Fit Summary Card */}
                <div className="rounded-xl bg-[#091830] border border-[#C5A059]/55 p-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-xs font-bold text-[#FFF8E7]"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      Waypoint-Derived Area Scores &amp; Source Coverage
                    </span>
                    <label className="flex items-center gap-1.5 text-[11px] text-[#EADBC0] cursor-pointer">
                      <input
                        type="checkbox"
                        data-testid="dossier-demo-scores-toggle"
                        checked={showModelCalibration}
                        onChange={(e) => setShowModelCalibration(e.target.checked)}
                        className="h-3.5 w-3.5 accent-[#DFBE77] cursor-pointer"
                      />
                      <span>Preview All 6 Scores (Demo)</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-[#102648] border border-[#C5A059]/50 p-2">
                      <span className="text-[10px] text-[#EADBC0] block">
                        Waypoint-Derived Overall Score
                      </span>
                      <span
                        className="text-lg font-bold text-[#FFE394]"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                      >
                        {communityQualityScore !== null ? `${communityQualityScore}/100` : "Pending"}
                      </span>
                    </div>
                    <div className="rounded-lg bg-[#102648] border border-[#C5A059]/50 p-2">
                      <span className="text-[10px] text-[#EADBC0] block">
                        Waypoint-Derived Family Fit
                      </span>
                      <span
                        className="text-lg font-bold text-[#FFF8E7]"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                      >
                        {familyFitScore !== null ? `${familyFitScore}/100` : "Pending"}
                      </span>
                    </div>
                  </div>

                  <div
                    data-testid="dossier-evidence-completeness"
                    className="flex items-center justify-between text-[11px] text-[#EADBC0] pt-1 border-t border-[#C5A059]/40"
                  >
                    <span>Verified Pillar Coverage:</span>
                    <span className="font-bold text-[#FFE394]">
                      {showModelCalibration
                        ? "Demo Calibration (6/6 Synthetic Pillars)"
                        : selectedCommunity.evidenceCompleteness?.ratioText ||
                          (isVerifiedSource
                            ? "2/6 Verified Pillars (ACS Affordability & Commute)"
                            : "0/6 Verified Pillars")}
                    </span>
                  </div>
                </div>

                {/* NEW: Crime, Internet Availability & Map API Keys Guide (Answers User Question Directly in UI) */}
                <div
                  data-testid="dossier-crime-internet-api-card"
                  className="rounded-xl bg-[#020A17]/90 border border-[#C5A059]/45 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-xs font-bold text-[#FFE394]"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      Crime, Internet &amp; Map Data Guide
                    </span>
                    <button
                      type="button"
                      onClick={() => setStudioOpen(true)}
                      className="text-[10.5px] font-semibold text-[#DFBE77] hover:underline cursor-pointer"
                    >
                      Manage Keys →
                    </button>
                  </div>
                  <div className="space-y-1.5 text-[11px] text-[#C6B697]">
                    <div className="rounded-lg bg-[#05142B]/90 border border-[#3A2C18] p-2">
                      <p className="font-semibold text-[#FFF4D4]">
                        1. Maps, Schools &amp; Therapy Doctors (Live Now · 0 Keys)
                      </p>
                      <p className="text-[10.5px] text-[#C6B697] mt-0.5">
                        USGS National Map street &amp; satellite tiles, U.S. Census housing/income, 2,329 Georgia public schools, and a limited sample of 237 NPI therapy providers work automatically with no API key (do not use the 237 sample count to compare care access between communities).
                      </p>
                    </div>
                    <div className="rounded-lg bg-[#05142B]/90 border border-[#3A2C18] p-2">
                      <p className="font-semibold text-[#FFF4D4]">
                        2. Crime &amp; Public Safety (Included · Free API Key)
                      </p>
                      <p className="text-[10.5px] text-[#C6B697] mt-0.5">
                        Local violent &amp; property crime rates connect via the{" "}
                        <strong className="text-[#FFE394]">FBI Crime Data Explorer</strong>. Add a free{" "}
                        <code className="text-[#FAD77B]">FBI_CDE_API_KEY</code> from{" "}
                        <span className="underline">api.data.gov</span> to unlock live crime scores.
                      </p>
                    </div>
                    <div className="rounded-lg bg-[#05142B]/90 border border-[#3A2C18] p-2">
                      <p className="font-semibold text-[#FFF4D4]">
                        3. High-Speed Internet &amp; Fiber (Included)
                      </p>
                      <p className="text-[10.5px] text-[#C6B697] mt-0.5">
                        Household internet coverage uses{" "}
                        <strong className="text-[#FFE394]">U.S. Census Table B28002</strong> (no key needed) plus optional{" "}
                        <code className="text-[#FAD77B]">FCC_BROADBAND_API_KEY</code> for fiber speed maps.
                      </p>
                    </div>
                  </div>
                </div>

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

                {/* Neighborhood Census Tract Explorer & Selected Tract Card (TIGER/ACS 5-Year) */}
                {subCountyTracts.length > 0 && (
                  <div
                    data-testid="dossier-neighborhood-tracts-card"
                    className="rounded-lg bg-[#020A1E] border border-[#D4AF63]/50 p-2.5 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#F3D68B]">
                        County Census Rollup &amp; Tracts ({subCountyTracts.length} Tracts)
                      </span>
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-[#0D2149] border border-[#D4AF63]/40 text-[#F3D68B] font-semibold">
                        TIGER + ACS 5-Yr
                      </span>
                    </div>

                    {/* County-Wide Rolled-Up U.S. Census Housing, Income & Commute Summary */}
                    {countyCensusRollup && (
                      <div
                        data-testid="county-census-rollup-summary"
                        className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 rounded bg-[#05142C] border border-[#D4AF63]/35 p-2 text-[10px]"
                      >
                        <div>
                          <span className="text-[9px] text-[#94A3B8] block">
                            County Median Income
                          </span>
                          <span className="font-bold text-[#FFF4D4] font-mono">
                            {countyCensusRollup.medianHouseholdIncome
                              ? `$${countyCensusRollup.medianHouseholdIncome.toLocaleString()}`
                              : "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-[#94A3B8] block">
                            County Median Home
                          </span>
                          <span className="font-bold text-[#FFF4D4] font-mono">
                            {countyCensusRollup.medianHomeValue
                              ? `$${countyCensusRollup.medianHomeValue.toLocaleString()}`
                              : "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-[#94A3B8] block">
                            County Median Rent
                          </span>
                          <span className="font-bold text-[#FFF4D4] font-mono">
                            {countyCensusRollup.medianGrossRent
                              ? `$${countyCensusRollup.medianGrossRent.toLocaleString()}/mo`
                              : "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-[#94A3B8] block">
                            County Mean Commute
                          </span>
                          <span className="font-bold text-[#FFF4D4] font-mono">
                            {countyCensusRollup.meanCommuteMinutes
                              ? `${countyCensusRollup.meanCommuteMinutes} min`
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                    )}

                    {selectedTract ? (
                      <div
                        data-testid="dossier-selected-tract-detail"
                        className="rounded bg-[#061430] border border-[#D4AF63]/50 p-2 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div>
                            <p className="text-[11.5px] font-bold text-[#F3D68B]">
                              {selectedTract.name}
                            </p>
                            <p className="text-[9.5px] font-mono text-[#94A3B8]">
                              GEOID {selectedTract.geoid11} · Pop.{" "}
                              {selectedTract.populationEstimate.toLocaleString()} (±
                              {selectedTract.populationMoe.toLocaleString()})
                            </p>
                          </div>
                          <button
                            type="button"
                            data-testid="clear-selected-tract-btn"
                            onClick={() => setSelectedTract(null)}
                            className="text-[9.5px] px-1.5 py-0.5 rounded bg-[#0A1938] border border-[#24355A] text-[#CBD5E1] hover:text-white cursor-pointer"
                          >
                            All Tracts
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-1 text-[10px]">
                          <div className="rounded bg-[#030B1E] border border-[#17284A] p-1">
                            <span className="text-[9px] text-[#94A3B8] block">
                              Median Income
                            </span>
                            <span className="font-bold text-[#F4F6FB] font-mono">
                              {selectedTract.medianHouseholdIncome !== null
                                ? `$${selectedTract.medianHouseholdIncome.toLocaleString()}`
                                : "Unavailable"}
                            </span>
                            {selectedTract.medianHouseholdIncomeMoe !== null && (
                              <span className="text-[8.5px] text-[#94A3B8] block">
                                ±${selectedTract.medianHouseholdIncomeMoe.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <div className="rounded bg-[#030B1E] border border-[#17284A] p-1">
                            <span className="text-[9px] text-[#94A3B8] block">
                              Median Home Value
                            </span>
                            <span className="font-bold text-[#F4F6FB] font-mono">
                              {selectedTract.medianHomeValue !== null
                                ? `$${selectedTract.medianHomeValue.toLocaleString()}`
                                : "Unavailable"}
                            </span>
                            {selectedTract.medianHomeValueMoe !== null && (
                              <span className="text-[8.5px] text-[#94A3B8] block">
                                ±${selectedTract.medianHomeValueMoe.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <div className="rounded bg-[#030B1E] border border-[#17284A] p-1">
                            <span className="text-[9px] text-[#94A3B8] block">
                              Median Contract Rent (B25058_001E)
                            </span>
                            <span className="font-bold text-[#F4F6FB] font-mono">
                              {selectedTract.medianGrossRent !== null
                                ? `$${selectedTract.medianGrossRent.toLocaleString()}/mo`
                                : "Unavailable"}
                            </span>
                            {selectedTract.medianGrossRentMoe !== null && (
                              <span className="text-[8.5px] text-[#94A3B8] block">
                                ±${selectedTract.medianGrossRentMoe.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <div className="rounded bg-[#030B1E] border border-[#17284A] p-1">
                            <span className="text-[9px] text-[#94A3B8] block">
                              Est. Mean Commute (B08303)
                            </span>
                            <span className="font-bold text-[#F4F6FB] font-mono">
                              {selectedTract.meanCommuteMinutes !== null
                                ? `${selectedTract.meanCommuteMinutes} min`
                                : "Unavailable"}
                            </span>
                            {selectedTract.meanCommuteMinutesMoe !== null && (
                              <span className="text-[8.5px] text-[#94A3B8] block">
                                ±{selectedTract.meanCommuteMinutesMoe} min
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="pt-1 border-t border-[#17284A] flex flex-wrap items-center justify-between gap-1 text-[9.5px] text-[#CBD5E1]">
                          <span>
                            Affordability Calc:{" "}
                            <strong className="text-emerald-300 font-mono">
                              {selectedTract.verifiedPillars.affordability ?? "N/A"}/100
                            </strong>
                          </span>
                          <span>
                            Commute Calc:{" "}
                            <strong className="text-emerald-300 font-mono">
                              {selectedTract.verifiedPillars.commute ?? "N/A"}/100
                            </strong>
                          </span>
                          <span>
                            Unimported Pillars:{" "}
                            <strong className="text-[#94A3B8] font-mono">
                              null (2/6 Covered)
                            </strong>
                          </span>
                        </div>

                        <p
                          data-testid="tract-sped-guardrail-disclaimer"
                          className="text-[9px] text-[#F3D68B]/90 bg-[#0A1938] border border-[#D4AF63]/35 rounded p-1.5 leading-snug"
                        >
                          {CENSUS_TRACT_SPED_GUARDRAIL_DISCLAIMER}
                        </p>
                        <p className="text-[8.5px] text-[#94A3B8]">
                          Source: {selectedTract.sourceCitation} · Updated{" "}
                          {new Date(selectedTract.lastUpdated).toLocaleDateString()}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-[#CBD5E1] leading-snug">
                          Zoom to <span className="text-[#F3D68B] font-semibold">z9.5+</span> or
                          select a neighborhood Census Tract below to inspect sub-county ACS
                          housing, income, commute, and nearby schools/providers:
                        </p>
                        <div className="max-h-28 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                          {subCountyTracts.slice(0, 12).map((tract) => (
                            <button
                              key={tract.geoid11}
                              type="button"
                              data-testid={`select-tract-btn-${tract.geoid11}`}
                              onClick={() => {
                                setSelectedTract(tract);
                                setGranularityMode("block_group");
                              }}
                              className="w-full text-left px-2 py-1 rounded bg-[#061430] hover:bg-[#0D2149] border border-[#17284A] hover:border-[#D4AF63]/50 flex items-center justify-between gap-2 text-[10px] transition-colors cursor-pointer"
                            >
                              <span className="font-medium text-[#F4F6FB] truncate">
                                {tract.name} ({tract.geoid11})
                              </span>
                              <span className="font-mono text-emerald-300 shrink-0">
                                {tract.medianHouseholdIncome
                                  ? `$${Math.round(tract.medianHouseholdIncome / 1000)}k`
                                  : "ACS"}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Nearby Public Schools (NCES CCD · Sorted by Distance from Selected Area) */}
                {countySchools.length > 0 && (
                  <div
                    data-testid="dossier-nearby-schools-card"
                    className="rounded-lg bg-[#020A1E] border border-[#24355A] p-2.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#F3D68B]">
                        Nearby Public Schools (NCES CCD)
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 font-semibold">
                        {countySchools.length} Campuses
                      </span>
                    </div>
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                      {[...countySchools]
                        .map((sch) => ({
                          ...sch,
                          distanceMiles: computeDistanceMiles(sch.coordinates),
                        }))
                        .sort((a, b) => a.distanceMiles - b.distanceMiles)
                        .slice(0, 6)
                        .map((sch) => (
                          <div
                            key={sch.id}
                            className="rounded bg-[#061430] border border-[#17284A] p-1.5 flex items-start justify-between gap-2 text-[10px]"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-[#F4F6FB] truncate">
                                {sch.name}
                              </p>
                              <p className="text-[9px] text-[#94A3B8] truncate">
                                {sch.level} ({sch.gradeSpan}) · NCES {sch.ncesSchoolId || sch.id}
                                {sch.enrollment ? ` · ${sch.enrollment} students` : ""}
                              </p>
                            </div>
                            <span className="font-mono text-[9.5px] text-[#F3D68B] shrink-0">
                              {sch.distanceMiles} mi
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Outpatient Therapy Providers (CMS NPPES NPI Registry v2.1 — Limited 10-City / 6-Specialty Sample) */}
                <div
                  data-testid="dossier-therapy-providers-status"
                  className="rounded-lg bg-[#020A1E] border border-teal-500/40 p-2.5 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10.5px] font-semibold uppercase tracking-wider text-teal-300">
                      Therapy Providers (CMS NPPES NPI · Limited Sample)
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-500/15 border border-teal-500/35 text-teal-300 font-semibold">
                      {countyTherapyProviders.length > 0
                        ? `${countyTherapyProviders.length} in County (${allTherapyProviders.length} Limited Sample)`
                        : `0 in County (${allTherapyProviders.length} Limited Sample)`}
                    </span>
                  </div>
                  <p className="text-[9.5px] text-amber-200/90 bg-[#061430] border border-amber-500/30 rounded p-1.5 leading-snug">
                    <strong>Limited Sample Notice:</strong> These {allTherapyProviders.length} records represent a limited 10-city × 6-specialty CMS NPPES NPI v2.1 sample (limit=5 per query, deduplicated by NPI-10). <strong>Do not use these counts to compare access to care between communities.</strong>
                  </p>
                  {countyTherapyProviders.length > 0 ? (
                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                      {[...countyTherapyProviders]
                        .map((prov) => ({
                          ...prov,
                          distanceMiles: computeDistanceMiles(prov.coordinates),
                        }))
                        .sort((a, b) => a.distanceMiles - b.distanceMiles)
                        .slice(0, 8)
                        .map((prov) => (
                          <div
                            key={prov.npi10}
                            data-testid={`dossier-therapy-provider-${prov.npi10}`}
                            className="rounded bg-[#061430] border border-[#17284A] p-1.5 space-y-0.5 text-[10px]"
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <span className="font-semibold text-[#F4F6FB] truncate">
                                {prov.providerName}
                              </span>
                              <span className="font-mono text-[9.5px] text-teal-300 shrink-0">
                                {prov.distanceMiles} mi
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-1 text-[9px] text-[#94A3B8]">
                              <span className="truncate">
                                {prov.taxonomyDescription} · NPI {prov.npi10}
                              </span>
                              <span className="text-[8.5px] px-1 py-0.2 rounded bg-[#0A1938] border border-[#24355A] text-[#CBD5E1] shrink-0">
                                {prov.coordinatePrecision === "verified_address_location"
                                  ? "Street Geocoded"
                                  : "ZIP Centroid Est."}
                              </span>
                            </div>
                            <p className="text-[9px] text-[#CBD5E1] truncate">
                              {prov.streetAddress}, {prov.city}, {prov.stateCode} {prov.postalCode}
                              {prov.phone ? ` · ${prov.phone}` : ""}
                            </p>
                            <div className="flex flex-wrap gap-1 pt-0.5 text-[8px] text-[#94A3B8]">
                              <span className="px-1 py-0.2 rounded bg-[#030B1E] border border-[#17284A]">
                                Pediatric: {prov.pediatricServicesStatus || "Unknown"}
                              </span>
                              <span className="px-1 py-0.2 rounded bg-[#030B1E] border border-[#17284A]">
                                Autism: {prov.autismSpecializationStatus || "Unknown"}
                              </span>
                              <span className="px-1 py-0.2 rounded bg-[#030B1E] border border-[#17284A]">
                                Insurance: {prov.insuranceAcceptedStatus || "Unknown"}
                              </span>
                              <span className="px-1 py-0.2 rounded bg-[#030B1E] border border-[#17284A]">
                                Availability: {prov.appointmentAvailabilityStatus || "Unknown"}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-[10.5px] text-[#94A3B8] leading-snug">
                      No outpatient speech/OT/PT/ABA NPI provider records are in the limited 10-city sample for{" "}
                      <span className="text-[#CBD5E1] font-medium">
                        {selectedCommunity.shortName}
                      </span>{" "}
                      ({allTherapyProviders.length} in limited statewide sample via CMS NPPES NPI
                      Registry v2.1; do not use sample counts to compare access to care between communities). Sample/fictional records are never substituted.
                    </p>
                  )}
                </div>

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
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs border border-[#FFE394]/60 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-105 transition-all cursor-pointer"
                >
                  Compare {selectedCommunity.shortName} with Another County
                </button>
              </aside>
            )}
          </div>

          {/* Subtle Bottom Reference & Staff Tools Footer */}
          <footer className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#C5A059]/30 text-[11px] text-[#EADBC0]">
            <span>Waypoint Places · 50-State Special Education &amp; Relocation Intelligence</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="nav-score-details-btn"
                onClick={() => setScoreDetailsOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-[#091830] border border-[#C5A059]/45 text-[#EADBC0] hover:text-white hover:border-[#FFE394] flex items-center gap-1 cursor-pointer"
                title="How community scores and data sources work"
              >
                <Info className="h-3 w-3 text-[#FFE394]" />
                <span>How Scores Work</span>
              </button>
              {!isEmbedMode && (
                <>
                  <button
                    type="button"
                    data-testid="footer-wix-embed-btn"
                    onClick={() => setWixEmbedOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-[#091830] border border-[#DFBE77]/65 text-[#FFE394] hover:text-white hover:border-[#FFE394] flex items-center gap-1 cursor-pointer font-semibold"
                    title="Copy Wix / Wix Velo Embed Code"
                  >
                    <Code2 className="h-3 w-3 text-[#FFE394]" />
                    <span>Embed on My Site</span>
                  </button>
                  <button
                    type="button"
                    data-testid="nav-places-studio-btn"
                    onClick={() => setStudioOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-[#091830] border border-[#C5A059]/45 text-[#EADBC0] hover:text-white hover:border-[#FFE394] flex items-center gap-1 cursor-pointer"
                    title="Staff Data & API Connections"
                  >
                    <Sliders className="h-3 w-3 text-[#FFE394]" />
                    <span>Data &amp; APIs</span>
                  </button>
                </>
              )}
            </div>
          </footer>
        </div>

        {/* Wix / Website 1-Click Copy Embed Modal */}
        <WixEmbedModal
          open={wixEmbedOpen}
          onClose={() => setWixEmbedOpen(false)}
          selectedFips={selectedCommunity.fips}
          selectedCountyName={selectedCommunity.name}
        />

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
