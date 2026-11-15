import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ExternalLink,
  Filter,
  Globe,
  Hospital,
  Info,
  Layers,
  MapPin,
  Phone,
  RefreshCw,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import {
  SPECIALIZED_FACILITY_CATEGORIES,
  getSpecializedCategoryMeta,
  type SpecializedFacilitiesSnapshot,
  type SpecializedFacilityCategory,
  type SpecializedFacilityRecord,
  type SpecializedPlacementPathway,
  type SpecializedSettingMode,
  type SpecializedSourceConnectorId,
} from "../../../../shared/waypointPlaces";

interface SpecializedFacilitiesSummaryCardProps {
  selectedCountyFips: string;
  selectedCountyName: string;
  selectedStateCode?: string;
  snapshot: SpecializedFacilitiesSnapshot | undefined;
  onOpenExplorerModal: (initialCategory?: SpecializedFacilityCategory | "all") => void;
  onSelectFacilityOnMap?: (facility: SpecializedFacilityRecord) => void;
  compact?: boolean;
}

export function SpecializedFacilitiesSummaryCard({
  selectedCountyFips,
  selectedCountyName,
  selectedStateCode = "GA",
  snapshot,
  onOpenExplorerModal,
  onSelectFacilityOnMap,
  compact = false,
}: SpecializedFacilitiesSummaryCardProps) {
  const stateCode = selectedStateCode || "GA";

  const { localFacilities, stateFacilities } = useMemo(() => {
    const all = snapshot?.facilities ?? [];
    const stateList = all.filter(
      (f) => f.physicalLocation.stateCode === stateCode
    );
    const localList = stateList.filter(
      (f) => f.physicalLocation.countyFips === selectedCountyFips
    );
    return {
      localFacilities: localList,
      stateFacilities: stateList,
    };
  }, [snapshot, selectedCountyFips, stateCode]);

  const displayList =
    localFacilities.length > 0 ? localFacilities : stateFacilities.slice(0, 6);

  return (
    <div
      data-testid="specialized-facilities-summary-card"
      className="rounded-xl bg-[#071531] border border-[#2D4A7C] p-3.5 space-y-3 shadow-[0_8px_24px_rgba(0,0,0,0.65)]"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Hospital className="h-4 w-4 text-[#F3D68B] shrink-0" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#F3D68B]">
              Specialized Programs &amp; Residential Settings
            </h4>
            <span className="px-1.5 py-0.5 rounded bg-[#102854] border border-[#3B5E9C] text-[9.5px] font-semibold text-[#93C5FD]">
              50 States · 10 Categories
            </span>
          </div>
          <p className="text-[11px] text-[#94A3B8]">
            {localFacilities.length > 0
              ? `${localFacilities.length} indexed in ${selectedCountyName} · ${stateFacilities.length} across ${stateCode}`
              : `${stateFacilities.length} regional programs indexed across ${stateCode} (${
                  snapshot?.totalFacilitiesCount ?? 64
                } nationwide)`}
          </p>
        </div>

        <button
          type="button"
          data-testid="open-specialized-explorer-btn"
          onClick={() => onOpenExplorerModal("all")}
          className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#040D21] text-[10.5px] font-bold hover:brightness-110 transition-all shrink-0 cursor-pointer shadow-sm"
        >
          Explore All ({snapshot?.totalFacilitiesCount ?? 64})
        </button>
      </div>

      {/* 10 Distinct Categories Micro-Grid (Never combined into one generic bucket) */}
      {!compact && (
        <div
          data-testid="specialized-10-categories-strip"
          className="grid grid-cols-2 gap-1.5 pt-0.5"
        >
          {SPECIALIZED_FACILITY_CATEGORIES.map((cat) => {
            const countInState = stateFacilities.filter(
              (f) => f.category === cat.id
            ).length;
            const totalCount = snapshot?.categoryCounts?.[cat.id] ?? countInState;
            return (
              <button
                key={cat.id}
                type="button"
                data-testid={`specialized-cat-pill-${cat.id}`}
                onClick={() => onOpenExplorerModal(cat.id)}
                className="flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg bg-[#040E24] border border-[#1E335C] hover:border-[#D4AF63]/60 text-left transition-all cursor-pointer"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: cat.badgeColorHex }}
                  />
                  <span className="text-[10px] font-medium text-[#E2E8F0] truncate">
                    {cat.shortLabel}
                  </span>
                </div>
                <span className="text-[9.5px] font-bold text-[#F3D68B] shrink-0">
                  {countInState > 0 ? `${countInState} ${stateCode}` : `${totalCount} US`}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Featured Local / State Programs List */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] text-[#94A3B8]">
          <span className="font-semibold uppercase tracking-wider">
            {localFacilities.length > 0
              ? `Programs in ${selectedCountyName}`
              : `Regional Continuum (${stateCode})`}
          </span>
          <span>Setting · Pathway</span>
        </div>

        <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-0.5">
          {displayList.map((fac) => {
            const catMeta = getSpecializedCategoryMeta(fac.category);
            return (
              <div
                key={fac.facilityId}
                data-testid={`specialized-summary-item-${fac.facilityId}`}
                className="p-2 rounded-lg bg-[#040D21] border border-[#1D325A] hover:border-[#3E609C] transition-colors space-y-1"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-[#F4F6FB] leading-snug">
                      {fac.officialName}
                    </p>
                    <p className="text-[10px] text-[#94A3B8] truncate">
                      {fac.physicalLocation.city}, {fac.physicalLocation.stateCode} ·{" "}
                      {fac.agesServed} · {fac.operatorType}
                    </p>
                  </div>
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 border"
                    style={{
                      backgroundColor: `${catMeta.badgeColorHex}18`,
                      borderColor: `${catMeta.badgeColorHex}66`,
                      color: catMeta.badgeColorHex,
                    }}
                  >
                    {catMeta.shortLabel}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="px-1.5 py-0.2 rounded bg-[#0C1E42] border border-[#254073] text-[9px] text-[#93C5FD]">
                      {fac.settingMode}
                    </span>
                    {fac.placementPathways.slice(0, 2).map((pw) => (
                      <span
                        key={pw}
                        className="px-1.5 py-0.2 rounded bg-[#111C38] text-[9px] text-[#CBD5E1]"
                      >
                        {pw === "IEP Team Placement / Publicly Funded"
                          ? "IEP / Public Placement"
                          : pw === "Private Parent Enrollment"
                            ? "Private Enrollment"
                            : pw === "Clinical / Medical Referral"
                              ? "Clinical / PRTF Referral"
                              : "State Agency Referral"}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {onSelectFacilityOnMap && (
                      <button
                        type="button"
                        data-testid={`fly-to-facility-${fac.facilityId}`}
                        onClick={() => onSelectFacilityOnMap(fac)}
                        className="text-[9.5px] font-semibold text-[#F3D68B] hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <MapPin className="h-2.5 w-2.5" />
                        <span>Map</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenExplorerModal(fac.category)}
                      className="text-[9.5px] font-semibold text-[#93C5FD] hover:underline cursor-pointer"
                    >
                      Details →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mandatory Placement, Licensing & LRE Neutrality Guardrail Banner */}
      <div
        data-testid="specialized-placement-disclaimer-banner"
        className="rounded-lg bg-[#0A1936] border border-[#D4AF63]/40 p-2.5 space-y-1"
      >
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#F3D68B]">
          <ShieldAlert className="h-3.5 w-3.5 text-[#D4AF63] shrink-0" />
          <span>Placement, Licensure &amp; LRE Neutrality Guardrail</span>
        </div>
        <p className="text-[9.5px] text-[#CBD5E1] leading-relaxed">
          A program&apos;s presence does <strong>not</strong> establish that a student
          qualifies for admission, that the setting is appropriate, or that a school
          district will fund placement. Never assume a facility&apos;s license authorizes
          every educational or clinical service listed. Restrictive settings are never
          treated as inherently better or worse based solely on category.
        </p>
      </div>
    </div>
  );
}

interface SpecializedFacilitiesExplorerModalProps {
  open: boolean;
  onClose: () => void;
  snapshot: SpecializedFacilitiesSnapshot | undefined;
  initialCategory?: SpecializedFacilityCategory | "all";
  initialStateCode?: string;
  selectedCountyFips?: string;
  selectedCountyName?: string;
  onSelectFacilityOnMap?: (facility: SpecializedFacilityRecord) => void;
  onTriggerConnectorRefresh?: (connectorId?: SpecializedSourceConnectorId) => void;
  isRefreshing?: boolean;
}

export function SpecializedFacilitiesExplorerModal({
  open,
  onClose,
  snapshot,
  initialCategory = "all",
  initialStateCode = "GA",
  selectedCountyFips,
  selectedCountyName,
  onSelectFacilityOnMap,
  onTriggerConnectorRefresh,
  isRefreshing = false,
}: SpecializedFacilitiesExplorerModalProps) {
  const [activeTab, setActiveTab] = useState<
    "directory" | "categories_guardrails" | "connectors"
  >("directory");
  const [selectedState, setSelectedState] = useState<string>(
    initialStateCode || "GA"
  );
  const [selectedCategory, setSelectedCategory] = useState<
    SpecializedFacilityCategory | "all"
  >(initialCategory);
  const [selectedSettingMode, setSelectedSettingMode] = useState<
    SpecializedSettingMode | "all"
  >("all");
  const [selectedPathway, setSelectedPathway] = useState<
    SpecializedPlacementPathway | "all"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  React.useEffect(() => {
    if (open && initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [open, initialCategory]);

  const availableStates = useMemo(() => {
    const facilities = snapshot?.facilities ?? [];
    const codes = Array.from(
      new Set(facilities.map((f) => f.physicalLocation.stateCode))
    ).sort();
    return codes;
  }, [snapshot]);

  const filteredFacilities = useMemo(() => {
    const all = snapshot?.facilities ?? [];
    return all.filter((f) => {
      if (
        selectedState !== "ALL" &&
        f.physicalLocation.stateCode !== selectedState
      ) {
        return false;
      }
      if (selectedCategory !== "all" && f.category !== selectedCategory) {
        return false;
      }
      if (
        selectedSettingMode !== "all" &&
        f.settingMode !== selectedSettingMode
      ) {
        return false;
      }
      if (
        selectedPathway !== "all" &&
        !f.placementPathways.includes(selectedPathway)
      ) {
        return false;
      }
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = f.officialName.toLowerCase().includes(q);
        const matchCity = f.physicalLocation.city.toLowerCase().includes(q);
        const matchCounty = f.physicalLocation.countyName
          .toLowerCase()
          .includes(q);
        const matchCat = f.categoryLabel.toLowerCase().includes(q);
        const matchPop = f.populationsServed.some((p) =>
          p.toLowerCase().includes(q)
        );
        if (!matchName && !matchCity && !matchCounty && !matchCat && !matchPop) {
          return false;
        }
      }
      return true;
    });
  }, [
    snapshot,
    selectedState,
    selectedCategory,
    selectedSettingMode,
    selectedPathway,
    searchQuery,
  ]);

  if (!open) return null;

  return (
    <div
      data-testid="specialized-facilities-explorer-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5"
    >
      <div className="relative w-full max-w-6xl max-h-[90vh] flex flex-col rounded-2xl bg-[#040E24] border border-[#345084] shadow-[0_24px_64px_rgba(0,0,0,0.95)] overflow-hidden text-[#F4F6FB]">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-[#071738] border-b border-[#233B69]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Hospital className="h-5 w-5 text-[#D4AF63]" />
              <h2
                className="text-base sm:text-lg font-bold text-[#F3D68B]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Specialized Education &amp; Residential Settings Continuum
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#102956] border border-[#D4AF63]/50 text-[10px] font-bold text-[#F3D68B]">
                {snapshot?.statesCoveredCount ?? 50} States Indexed ·{" "}
                {snapshot?.totalFacilitiesCount ?? 64} Programs
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-semibold text-emerald-300">
                0 Manual Tasks · 100% Automated Connectors
              </span>
            </div>
            <p className="text-xs text-[#94A3B8]">
              PRTFs, Therapeutic Residential, Private Autism/DD Schools, Specialized Day Schools, Georgia GNETS Centers &amp; Satellites, Approved Nonpublic SPED, State-Operated Schools, Behavioral Day/Crisis, and Licensed DD Group Homes.
            </p>
          </div>

          <button
            type="button"
            data-testid="close-specialized-explorer-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#0B1E44] border border-[#2B4678] text-[#CBD5E1] hover:text-white hover:border-[#D4AF63] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 bg-[#051129] border-b border-[#1D3158]">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="specialized-tab-directory"
              onClick={() => setActiveTab("directory")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "directory"
                  ? "bg-[#163268] text-[#F3D68B] border border-[#D4AF63]/60"
                  : "text-[#94A3B8] hover:text-white hover:bg-[#0B1E40]"
              }`}
            >
              Program &amp; Facility Directory ({filteredFacilities.length})
            </button>
            <button
              type="button"
              data-testid="specialized-tab-categories"
              onClick={() => setActiveTab("categories_guardrails")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "categories_guardrails"
                  ? "bg-[#163268] text-[#F3D68B] border border-[#D4AF63]/60"
                  : "text-[#94A3B8] hover:text-white hover:bg-[#0B1E40]"
              }`}
            >
              10 Distinct Categories &amp; Legal Guardrails
            </button>
            <button
              type="button"
              data-testid="specialized-tab-connectors"
              onClick={() => setActiveTab("connectors")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "connectors"
                  ? "bg-[#163268] text-[#F3D68B] border border-[#D4AF63]/60"
                  : "text-[#94A3B8] hover:text-white hover:bg-[#0B1E40]"
              }`}
            >
              Automated Source Connectors ({snapshot?.connectors.length ?? 7})
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#93C5FD]">
            <span>
              GA GNETS Indexed: <strong>{snapshot?.georgiaGnetsCount ?? 9}</strong>
            </span>
            <span>·</span>
            <span>
              Devereux GA:{" "}
              <strong className="text-emerald-300">
                {snapshot?.devereuxGeorgiaIncluded ? "Verified (PRTF + Ackerman)" : "Active"}
              </strong>
            </span>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          {/* Mandatory Top Disclaimer Strip */}
          <div className="rounded-xl bg-[#091838] border border-[#D4AF63]/50 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#F3D68B]">
                <Scale className="h-4 w-4 text-[#D4AF63] shrink-0" />
                <span>
                  Admission, Appropriateness, Public Funding &amp; Licensing Scope Guardrail
                </span>
              </div>
              <p className="text-[11px] text-[#CBD5E1] leading-relaxed">
                {snapshot?.guardrails.eligibilityAndFundingDisclaimer}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className="inline-block px-2 py-1 rounded bg-[#142952] border border-[#35558C] text-[10px] font-semibold text-[#93C5FD]">
                LRE Continuum Neutral
              </span>
            </div>
          </div>

          {activeTab === "directory" && (
            <>
              {/* Filter Bar */}
              <div className="rounded-xl bg-[#07142E] border border-[#1E335C] p-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  {/* Search Input */}
                  <div className="lg:col-span-2 flex items-center bg-[#040B1C] border border-[#284172] rounded-lg px-2.5 py-1.5">
                    <Search className="h-3.5 w-3.5 text-[#94A3B8] mr-2 shrink-0" />
                    <input
                      type="text"
                      data-testid="specialized-modal-search-input"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search GNETS, Devereux, Hillside, AASD, autism, dyslexia, city..."
                      className="w-full bg-transparent text-xs text-[#F4F6FB] placeholder:text-[#64748B] focus:outline-none"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="text-[#94A3B8] hover:text-white ml-1 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* State Selector */}
                  <div>
                    <select
                      data-testid="specialized-state-select"
                      value={selectedState}
                      onChange={(e) => setSelectedState(e.target.value)}
                      className="w-full rounded-lg bg-[#040B1C] border border-[#284172] px-2.5 py-1.5 text-xs text-[#F4F6FB] focus:outline-none focus:border-[#D4AF63]"
                    >
                      <option value="GA">Georgia (GA — Deep Continuum)</option>
                      <option value="ALL">All 50 States + DC Nationwide</option>
                      {availableStates
                        .filter((c) => c !== "GA")
                        .map((code) => (
                          <option key={code} value={code}>
                            State: {code}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Setting Mode Filter */}
                  <div>
                    <select
                      data-testid="specialized-setting-select"
                      value={selectedSettingMode}
                      onChange={(e) =>
                        setSelectedSettingMode(
                          e.target.value as SpecializedSettingMode | "all"
                        )
                      }
                      className="w-full rounded-lg bg-[#040B1C] border border-[#284172] px-2.5 py-1.5 text-xs text-[#F4F6FB] focus:outline-none focus:border-[#D4AF63]"
                    >
                      <option value="all">All Settings (Day &amp; Residential)</option>
                      <option value="Day">Day Program Only</option>
                      <option value="Residential">Residential Only</option>
                      <option value="Both (Day & Residential)">
                        Both (Day &amp; Residential)
                      </option>
                    </select>
                  </div>

                  {/* Placement Pathway Filter */}
                  <div>
                    <select
                      data-testid="specialized-pathway-select"
                      value={selectedPathway}
                      onChange={(e) =>
                        setSelectedPathway(
                          e.target.value as SpecializedPlacementPathway | "all"
                        )
                      }
                      className="w-full rounded-lg bg-[#040B1C] border border-[#284172] px-2.5 py-1.5 text-xs text-[#F4F6FB] focus:outline-none focus:border-[#D4AF63]"
                    >
                      <option value="all">All Placement Pathways</option>
                      <option value="IEP Team Placement / Publicly Funded">
                        IEP Team / Publicly Funded
                      </option>
                      <option value="Private Parent Enrollment">
                        Private Parent Enrollment
                      </option>
                      <option value="Clinical / Medical Referral">
                        Clinical / Medical Referral
                      </option>
                      <option value="State Agency / DJJ / DFCS / DBHDD Referral">
                        State Agency (DBHDD / DFCS / DJJ)
                      </option>
                    </select>
                  </div>
                </div>

                {/* 10 Category Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    data-testid="filter-cat-all"
                    onClick={() => setSelectedCategory("all")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                      selectedCategory === "all"
                        ? "bg-[#D4AF63] text-[#040D21] font-bold"
                        : "bg-[#0B1C3D] text-[#CBD5E1] border border-[#243C6A] hover:border-[#D4AF63]/60"
                    }`}
                  >
                    All 10 Categories ({snapshot?.totalFacilitiesCount ?? 64})
                  </button>
                  {SPECIALIZED_FACILITY_CATEGORIES.map((cat) => {
                    const active = selectedCategory === cat.id;
                    const count = snapshot?.categoryCounts?.[cat.id] ?? 0;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        data-testid={`filter-cat-${cat.id}`}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-2 py-1 rounded-md text-[10.5px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                          active
                            ? "bg-[#17336B] text-[#F3D68B] border-[#D4AF63]"
                            : "bg-[#081530] text-[#CBD5E1] border-[#1F355E] hover:border-[#3E629E]"
                        }`}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: cat.badgeColorHex }}
                        />
                        <span>{cat.shortLabel}</span>
                        <span className="text-[9.5px] text-[#94A3B8]">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Facility Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                {filteredFacilities.map((fac) => {
                  const catMeta = getSpecializedCategoryMeta(fac.category);
                  return (
                    <div
                      key={fac.facilityId}
                      data-testid={`facility-detail-card-${fac.facilityId}`}
                      className="rounded-xl bg-[#071530] border border-[#253F70] p-4 space-y-3 flex flex-col justify-between shadow-lg"
                    >
                      <div className="space-y-2.5">
                        {/* Top Badges & Title */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-bold border"
                                style={{
                                  backgroundColor: `${catMeta.badgeColorHex}1A`,
                                  borderColor: `${catMeta.badgeColorHex}66`,
                                  color: catMeta.badgeColorHex,
                                }}
                              >
                                #{catMeta.number} · {catMeta.shortLabel}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-[#0E244D] border border-[#2E4F8A] text-[10px] font-semibold text-[#93C5FD]">
                                {fac.settingMode}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-[#101F3E] border border-[#263B66] text-[10px] text-[#CBD5E1]">
                                {fac.operatorType}
                              </span>
                            </div>
                            <h3 className="text-sm font-bold text-[#F4F6FB] leading-snug">
                              {fac.officialName}
                            </h3>
                          </div>

                          {onSelectFacilityOnMap && (
                            <button
                              type="button"
                              data-testid={`modal-fly-to-${fac.facilityId}`}
                              onClick={() => {
                                onSelectFacilityOnMap(fac);
                                onClose();
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#122B5C] hover:bg-[#193B7A] border border-[#D4AF63]/60 text-[10.5px] font-semibold text-[#F3D68B] flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              <MapPin className="h-3 w-3" />
                              <span>View on Map</span>
                            </button>
                          )}
                        </div>

                        {/* Physical Location & Ages/Grades */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg bg-[#040C1E] border border-[#192D53] p-2.5 text-[11px]">
                          <div>
                            <span className="text-[9.5px] uppercase tracking-wider text-[#94A3B8] block">
                              Physical Location &amp; Geo-ID
                            </span>
                            <span className="font-medium text-[#E2E8F0]">
                              {fac.physicalLocation.streetAddress},{" "}
                              {fac.physicalLocation.city},{" "}
                              {fac.physicalLocation.stateCode}{" "}
                              {fac.physicalLocation.zip}
                            </span>
                            <span className="text-[10px] text-[#93C5FD] block">
                              {fac.physicalLocation.countyName}{" "}
                              {fac.physicalLocation.countyFips
                                ? `(FIPS ${fac.physicalLocation.countyFips})`
                                : ""}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9.5px] uppercase tracking-wider text-[#94A3B8] block">
                              Ages &amp; Grade Levels Served
                            </span>
                            <span className="font-semibold text-[#F3D68B] block">
                              {fac.agesServed}
                            </span>
                            <span className="text-[10px] text-[#CBD5E1] block">
                              Grades: {fac.gradeLevelsServed}
                            </span>
                          </div>
                        </div>

                        {/* Populations Served */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] block">
                            Disability &amp; Support Populations Identified by Source
                          </span>
                          <ul className="list-disc list-inside text-[11px] text-[#CBD5E1] space-y-0.5">
                            {fac.populationsServed.map((pop, i) => (
                              <li key={i}>{pop}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Educational & Clinical Services */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                          <div className="rounded-lg bg-[#051026] border border-[#1B3058] p-2.5 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#93C5FD] block">
                              Educational Services Offered
                            </span>
                            <ul className="list-disc list-inside text-[#CBD5E1] space-y-0.5 text-[10.5px]">
                              {fac.educationalServicesOffered.map((ed, i) => (
                                <li key={i}>{ed}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="rounded-lg bg-[#051026] border border-[#1B3058] p-2.5 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#F3D68B] block">
                              Clinical / Therapeutic Services
                            </span>
                            <ul className="list-disc list-inside text-[#CBD5E1] space-y-0.5 text-[10.5px]">
                              {fac.clinicalTherapeuticServicesOffered.map(
                                (cl, i) => (
                                  <li key={i}>{cl}</li>
                                )
                              )}
                            </ul>
                          </div>
                        </div>

                        {/* Licensing, Approval & Published Inspection Findings */}
                        <div className="rounded-lg bg-[#06122B] border border-[#223B6A] p-2.5 space-y-1.5 text-[10.5px]">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <span className="font-bold text-[#F3D68B]">
                              Licensing / Approval: {fac.licensingOrApprovalStatus}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-[#0E2248] text-[9.5px] text-[#93C5FD]">
                              ID: {fac.licenseNumberOrEntityCode}
                            </span>
                          </div>
                          <p className="text-[#CBD5E1]">
                            <strong>Published Inspection / Oversight Status:</strong>{" "}
                            {fac.publishedInspectionOrEnforcementFindings}
                          </p>
                          <p className="text-[9.5px] text-amber-200/90 italic">
                            {fac.licenseScopeNote}
                          </p>
                        </div>

                        {/* Admission / Referral Process & Placement Pathways */}
                        <div className="space-y-1.5 text-[10.5px]">
                          <p className="text-[#CBD5E1]">
                            <strong className="text-[#F4F6FB]">
                              Admission &amp; Referral Process:
                            </strong>{" "}
                            {fac.admissionOrReferralProcess}
                          </p>
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[9.5px] text-[#94A3B8] mr-1">
                              Placement Pathways:
                            </span>
                            {fac.placementPathways.map((pw) => (
                              <span
                                key={pw}
                                className="px-2 py-0.5 rounded-full bg-[#102652] border border-[#325494] text-[9.5px] font-semibold text-[#E2E8F0]"
                              >
                                {pw}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Footer: Contact & Official Source Provenance */}
                      <div className="pt-2.5 border-t border-[#1B315A] flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#94A3B8]">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="flex items-center gap-1 text-[#CBD5E1]">
                            <Phone className="h-3 w-3 text-[#D4AF63]" />
                            {fac.publicContact.phone}
                          </span>
                          <a
                            href={fac.publicContact.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#93C5FD] hover:underline flex items-center gap-1"
                          >
                            <span>Official Program / Directory Link</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                          {fac.inspectionReportUrl && (
                            <a
                              href={fac.inspectionReportUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#F3D68B] hover:underline flex items-center gap-1"
                            >
                              <span>Inspection / Oversight Portal</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-[#64748B]">
                            Source: {fac.officialSourceName} ({fac.reportingDate})
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {activeTab === "categories_guardrails" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SPECIALIZED_FACILITY_CATEGORIES.map((cat) => (
                  <div
                    key={cat.id}
                    className="rounded-xl bg-[#071530] border border-[#243E6E] p-3.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-bold border"
                        style={{
                          backgroundColor: `${cat.badgeColorHex}1A`,
                          borderColor: `${cat.badgeColorHex}66`,
                          color: cat.badgeColorHex,
                        }}
                      >
                        Category #{cat.number} · {cat.shortLabel}
                      </span>
                      <span className="text-xs font-bold text-[#F3D68B]">
                        {snapshot?.categoryCounts?.[cat.id] ?? 0} Indexed
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[#F4F6FB]">
                      {cat.label}
                    </h4>
                    <p className="text-xs text-[#CBD5E1] leading-relaxed">
                      {cat.description}
                    </p>
                    <div className="pt-1 flex items-center justify-between text-[10.5px] text-[#93C5FD]">
                      <span>Typical Setting: {cat.typicalSettingMode}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setActiveTab("directory");
                        }}
                        className="text-[#F3D68B] hover:underline font-semibold cursor-pointer"
                      >
                        Filter Directory →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "connectors" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#071633] border border-[#264378] p-3.5">
                <div>
                  <h3 className="text-sm font-bold text-[#F3D68B]">
                    7 Automated Specialized Education &amp; Residential Facility Connectors
                  </h3>
                  <p className="text-xs text-[#94A3B8]">
                    Zero manual data entry, zero manual document verification queues. Missing attributes in structured public feeds are automatically marked &quot;Unknown&quot; or &quot;Data unavailable&quot;.
                  </p>
                </div>
                {onTriggerConnectorRefresh && (
                  <button
                    type="button"
                    data-testid="refresh-all-specialized-connectors-btn"
                    disabled={isRefreshing}
                    onClick={() => onTriggerConnectorRefresh(undefined)}
                    className="px-3 py-1.5 rounded-lg bg-[#132E63] hover:bg-[#1B3F85] border border-[#D4AF63]/60 text-xs font-semibold text-[#F3D68B] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                    />
                    <span>Run Automated Sync &amp; Deduplication</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {(snapshot?.connectors ?? []).map((conn) => (
                  <div
                    key={conn.connectorId}
                    data-testid={`specialized-connector-row-${conn.connectorId}`}
                    className="rounded-xl bg-[#06132C] border border-[#213A67] p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-[#102652] text-[10px] font-bold text-[#F3D68B]">
                          Priority #{conn.priorityOrder}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-[#F4F6FB]">
                          {conn.name}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-[10px] font-semibold text-emerald-300">
                          {conn.refreshCadence.replace("_", " ")} · Healthy
                        </span>
                      </div>
                      <p className="text-[11px] text-[#93C5FD]">
                        {conn.agencyOrDataset} · Coverage: {conn.coverageScope}
                      </p>
                      <p className="text-[11px] text-[#CBD5E1]">{conn.notes}</p>
                    </div>

                    <div className="flex sm:flex-col items-end justify-between gap-1.5 shrink-0 text-right text-[11px]">
                      <div className="px-2.5 py-1 rounded-lg bg-[#040C1E] border border-[#1D335C]">
                        <span className="text-[#F3D68B] font-bold">
                          {conn.recordsIndexedCount}
                        </span>{" "}
                        <span className="text-[#94A3B8]">records</span> ·{" "}
                        <span className="text-emerald-300 font-semibold">
                          0 manual tasks
                        </span>
                      </div>
                      <a
                        href={conn.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10.5px] text-[#93C5FD] hover:underline flex items-center gap-1"
                      >
                        <span>Official Source Endpoint</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

