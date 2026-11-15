import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  CloudUpload,
  Database,
  ExternalLink,
  HardDrive,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  CLOUDFLARE_STORAGE_EVALUATION,
  DOCUMENTED_INDICATOR_FORMULAS,
  FAMILY_PRIORITY_LABELS,
  SATELLITE_PROVIDER_OPTIONS,
  SPED_NON_GUARANTEE_DISCLAIMER,
  computeCommunityQualityScore,
  computeFamilyFitScore,
  type FamilyPriorityKey,
  type PlaceCommunityRecord,
  type PlacesVerificationTier,
  type ScoringWeightsConfig,
} from "../../../../shared/waypointPlaces";
import { StudioRightsInventoryPanel } from "@/components/places/RightsAccountabilityPanel";

export function PlacesCompareModal({
  open,
  onClose,
  primary,
  communities,
  selectedPriorities,
  weights,
  showModelCalibration,
  onToggleModelCalibration,
}: {
  open: boolean;
  onClose: () => void;
  primary: PlaceCommunityRecord;
  communities: PlaceCommunityRecord[];
  selectedPriorities: FamilyPriorityKey[];
  weights: ScoringWeightsConfig;
  showModelCalibration: boolean;
  onToggleModelCalibration: (v: boolean) => void;
}) {
  const candidates = communities.filter((c) => c.id !== primary.id);
  const [secondaryId, setSecondaryId] = useState<string>(
    candidates[0]?.id || primary.id
  );
  const secondary =
    communities.find((c) => c.id === secondaryId) || candidates[0] || primary;

  if (!open) return null;

  const pPillars = showModelCalibration
    ? primary.calibrationPillars
    : primary.verifiedPillars || null;
  const sPillars = showModelCalibration
    ? secondary.calibrationPillars
    : secondary.verifiedPillars || null;

  const pQuality = pPillars ? computeCommunityQualityScore(pPillars, weights) : null;
  const sQuality = sPillars ? computeCommunityQualityScore(sPillars, weights) : null;

  const pFit = pPillars
    ? computeFamilyFitScore(pPillars, selectedPriorities, weights)
    : null;
  const sFit = sPillars
    ? computeFamilyFitScore(sPillars, selectedPriorities, weights)
    : null;

  const rows: Array<{
    label: string;
    pVal: number | null;
    sVal: number | null;
    isVerifiedSource?: boolean;
  }> = [
    {
      label: "Community Quality Score",
      pVal: pQuality,
      sVal: sQuality,
      isVerifiedSource: !showModelCalibration && pQuality !== null,
    },
    {
      label: "Personalized Family Fit Score",
      pVal: pFit,
      sVal: sFit,
      isVerifiedSource: !showModelCalibration && pFit !== null,
    },
    {
      label: "School Performance (Academics)",
      pVal: pPillars?.academics ?? null,
      sVal: sPillars?.academics ?? null,
      isVerifiedSource: false,
    },
    {
      label: "Specialized Programs & IEP Supports",
      pVal: pPillars?.specializedPrograms ?? null,
      sVal: sPillars?.specializedPrograms ?? null,
      isVerifiedSource: false,
    },
    {
      label: "Safety & Well-Being",
      pVal: pPillars?.safetyWellBeing ?? null,
      sVal: sPillars?.safetyWellBeing ?? null,
      isVerifiedSource: false,
    },
    {
      label: "Family Lifestyle & School Infrastructure",
      pVal: pPillars?.familyLifestyle ?? null,
      sVal: sPillars?.familyLifestyle ?? null,
      isVerifiedSource:
        !showModelCalibration && typeof primary.verifiedPillars?.familyLifestyle === "number",
    },
    {
      label: "Affordability (US Census ACS 5-Year)",
      pVal: pPillars?.affordability ?? null,
      sVal: sPillars?.affordability ?? null,
      isVerifiedSource:
        !showModelCalibration && typeof primary.verifiedPillars?.affordability === "number",
    },
    {
      label: "Commute Connectivity (US Census ACS)",
      pVal: pPillars?.commute ?? null,
      sVal: sPillars?.commute ?? null,
      isVerifiedSource:
        !showModelCalibration && typeof primary.verifiedPillars?.commute === "number",
    },
  ];

  return (
    <div
      data-testid="places-compare-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
    >
      <div
        data-testid="places-compare-scroll-body"
        className="w-full max-w-3xl rounded-2xl bg-[#040D24] border border-[#24355A] shadow-2xl p-6 text-[#F4F6FB] space-y-4 max-h-[90vh] min-h-0 overflow-y-auto overscroll-contain custom-scrollbar"
      >
        <div className="flex items-start justify-between border-b border-[#1D2F52] pb-3.5">
          <div>
            <h3
              className="text-xl font-bold text-[#F4F6FB]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Side-by-Side Community Comparison
            </h3>
            <p className="text-xs text-[#94A3B8] mt-1">
              {showModelCalibration
                ? "Displaying Fictional Calibration Data for formula testing — not real school or safety ratings."
                : "Displaying strict unverified state (Pending Verified Data). Toggle Fictional Calibration below to preview weighting mechanics."}
            </p>
          </div>
          <button
            type="button"
            data-testid="close-compare-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-[#24355A] text-[#94A3B8] hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-[#071432] border border-[#24355A] text-xs">
          <span className="text-[#CBD5E1]">
            Data Mode:{" "}
            <strong className="text-[#F3D68B]">
              {showModelCalibration ? "Fictional Calibration Demo" : "Pending Verified Data"}
            </strong>
          </span>
          <label className="flex items-center gap-2 text-xs text-[#CBD5E1] cursor-pointer">
            <input
              type="checkbox"
              checked={showModelCalibration}
              onChange={(e) => onToggleModelCalibration(e.target.checked)}
              className="accent-[#D4AF63]"
            />
            Preview Fictional Calibration Numbers
          </label>
        </div>

        <div className="grid grid-cols-3 gap-4 items-center bg-[#020818] border border-[#24355A] rounded-xl p-3.5">
          <div className="text-xs uppercase tracking-wider text-[#94A3B8] font-semibold">
            Relocation Pillar
          </div>
          <div>
            <p className="text-sm font-bold text-[#F3D68B]">{primary.name}</p>
            <p className="text-[11px] text-[#94A3B8]">{primary.region}</p>
          </div>
          <div>
            <select
              value={secondary.id}
              onChange={(e) => setSecondaryId(e.target.value)}
              className="w-full rounded-lg bg-[#071432] border border-[#2A3F6A] px-2.5 py-1.5 text-xs font-semibold text-[#F3D68B]"
            >
              {communities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[#94A3B8] mt-1">{secondary.region}</p>
          </div>
        </div>

        <div className="divide-y divide-[#17284A] border border-[#24355A] rounded-xl overflow-hidden">
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-3 gap-4 px-4 py-2.5 bg-[#040D24] items-center text-xs"
            >
              <span className="text-[#CBD5E1] font-medium">{row.label}</span>
              <span className="font-semibold text-[#F3D68B]">
                {row.pVal !== null ? (
                  <>
                    {row.pVal}/100{" "}
                    <span
                      className={`text-[10px] font-normal ${
                        row.isVerifiedSource ? "text-emerald-300" : "text-[#94A3B8]"
                      }`}
                    >
                      {row.isVerifiedSource
                        ? "(Verified ACS/NCES)"
                        : "(Fictional Calibration)"}
                    </span>
                  </>
                ) : (
                  <span className="text-[#94A3B8]">Pending Verified Data</span>
                )}
              </span>
              <span className="font-semibold text-[#93C5FD]">
                {row.sVal !== null ? (
                  <>
                    {row.sVal}/100{" "}
                    <span
                      className={`text-[10px] font-normal ${
                        row.isVerifiedSource ? "text-emerald-300" : "text-[#94A3B8]"
                      }`}
                    >
                      {row.isVerifiedSource
                        ? "(Verified ACS/NCES)"
                        : "(Fictional Calibration)"}
                    </span>
                  </>
                ) : (
                  <span className="text-[#94A3B8]">Pending Verified Data</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PlacesScoreDetailsModal({
  open,
  onClose,
  weights,
  showModelCalibration,
  onToggleModelCalibration,
}: {
  open: boolean;
  onClose: () => void;
  weights: ScoringWeightsConfig;
  showModelCalibration: boolean;
  onToggleModelCalibration: (v: boolean) => void;
}) {
  if (!open) return null;

  return (
    <div
      data-testid="places-score-details-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
    >
      <div
        data-testid="places-score-details-scroll-body"
        className="w-full max-w-2xl rounded-2xl bg-[#040D24] border border-[#24355A] shadow-2xl p-6 text-[#F4F6FB] space-y-5 max-h-[90vh] min-h-0 overflow-y-auto overscroll-contain custom-scrollbar"
      >
        <div className="flex items-start justify-between border-b border-[#1D2F52] pb-4">
          <div>
            <h3
              className="text-xl font-bold text-[#F4F6FB]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Community Quality & Family Fit Scoring Architecture
            </h3>
            <p className="text-xs text-[#94A3B8] mt-1">
              Transparent methodology, documented normalization formulas & non-fabricated data guardrails.
            </p>
          </div>
          <button
            type="button"
            data-testid="close-compare-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-[#24355A] text-[#94A3B8] hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-xl bg-[#020818] border border-[#2A3F6A] p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#F3D68B] flex items-center gap-1.5">
              <Info className="h-4 w-4" /> Scoring Integrity & Missing-Data Guardrail
            </span>
            <label className="flex items-center gap-2 text-xs text-[#CBD5E1] cursor-pointer">
              <input
                type="checkbox"
                checked={showModelCalibration}
                onChange={(e) => onToggleModelCalibration(e.target.checked)}
                className="accent-[#D4AF63]"
              />
              Preview Fictional Calibration Data
            </label>
          </div>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            When <strong className="text-[#F3D68B]">Preview Fictional Calibration Data</strong> is
            OFF, Waypoint Places displays{" "}
            <strong className="text-emerald-300">Verified Public Scores</strong> strictly for
            indicators backed by imported official datasets (U.S. Census Bureau ACS 5-Year{" "}
            <strong>Affordability</strong> & <strong>Commute</strong>, plus NCES CCD{" "}
            <strong>Family Lifestyle / School Infrastructure</strong>), while keeping unimported
            pillars (<strong className="text-[#F4F6FB]">Pending Verified Data / null</strong>)
            never replaced with 0 or fictional values.
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
            Documented 0–100 Normalization Formulas & Missing-Data Rules
          </h4>
          {DOCUMENTED_INDICATOR_FORMULAS.map((f) => {
            const w = Math.round((weights[f.pillarKey] || 0) * 100);
            return (
              <div
                key={f.formulaId}
                className="rounded-lg bg-[#020818] border border-[#1D2F52] p-3 space-y-1.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold text-[#F4F6FB]">{f.title}</p>
                  <span className="text-xs font-mono font-bold text-[#F3D68B] shrink-0">
                    {w}% weight
                  </span>
                </div>
                <p className="text-[11px] font-mono text-[#93C5FD] bg-[#06122B] rounded px-2 py-1 border border-[#17284A]">
                  {f.equationText}
                </p>
                <p className="text-[11px] text-[#94A3B8]">
                  <strong className="text-[#CBD5E1]">Missing-Data Rule:</strong>{" "}
                  {f.missingDataRule}
                </p>
                <p className="text-[10.5px] text-[#8496B0]">
                  <strong className="text-[#94A3B8]">Geographic Aggregation:</strong>{" "}
                  {f.geographicAggregationRule}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getVerificationBadgeStyle(tier: PlacesVerificationTier): string {
  switch (tier) {
    case "Verified":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";
    case "Parent Reported":
      return "bg-sky-500/15 text-sky-300 border-sky-500/40";
    case "Outdated":
      return "bg-amber-500/15 text-amber-300 border-amber-500/40";
    case "Unverified":
      return "bg-purple-500/15 text-purple-300 border-purple-500/40";
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/40";
  }
}

export function PlacesStudioDrawer({
  open,
  onClose,
  communities,
}: {
  open: boolean;
  onClose: () => void;
  communities: PlaceCommunityRecord[];
}) {
  const utils = trpc.useUtils();
  const { data: studioData } = trpc.waypointPlaces.getStudioState.useQuery(undefined, {
    enabled: open,
  });
  const { data: dataOpsState, refetch: refetchDataOps } =
    trpc.waypointPlaces.getDataOperationsState.useQuery(undefined, {
      enabled: open,
    });

  const [activeTab, setActiveTab] = useState<
    "data_ops" | "rights_inventory" | "sped_intel" | "architecture" | "curation"
  >("data_ops");
  const [newName, setNewName] = useState("");
  const [newFips, setNewFips] = useState("");
  const [newRegion, setNewRegion] = useState("Metro Atlanta");
  const [newTagline, setNewTagline] = useState("");

  const runImportMutation = trpc.waypointPlaces.runDataSourceImport.useMutation({
    onSuccess: (run) => {
      toast.success(run.summaryText);
      refetchDataOps();
      utils.waypointPlaces.getStudioState.invalidate();
      utils.waypointPlaces.getPublicExplorerData.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const publishMutation = trpc.waypointPlaces.publishPublicSnapshot.useMutation({
    onSuccess: (snap) => {
      toast.success(
        `Published isolated public snapshot (${snap.communities.length} Georgia communities) to ${snap.r2ObjectKey}`
      );
      utils.waypointPlaces.getStudioState.invalidate();
      utils.waypointPlaces.getPublicExplorerData.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const upsertMutation = trpc.waypointPlaces.upsertCommunity.useMutation({
    onSuccess: (comm) => {
      toast.success(`Saved ${comm.name} in Places Studio`);
      setNewName("");
      setNewFips("");
      setNewTagline("");
      utils.waypointPlaces.getStudioState.invalidate();
      utils.waypointPlaces.getPublicExplorerData.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!open) return null;

  const ops = dataOpsState || studioData?.dataOperations;

  return (
    <div
      data-testid="places-studio-drawer"
      className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-xs"
    >
      <div className="w-full max-w-3xl h-full bg-[#040D24] border-l border-[#24355A] text-[#F4F6FB] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1D2F52] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-widest text-[#D4AF63] font-semibold">
                Nationwide Data Intelligence & Authoring Console
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Isolated from CRM PII
              </span>
            </div>
            <h2
              className="text-xl font-bold text-[#F4F6FB] mt-0.5"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Waypoint Places Studio · Phase 2 Data Operations
            </h2>
          </div>
          <button
            type="button"
            data-testid="close-compare-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-[#24355A] text-[#94A3B8] hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Studio Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-[#1D2F52] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              data-testid="studio-tab-data-ops"
              onClick={() => setActiveTab("data_ops")}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === "data_ops"
                  ? "border-[#D4AF63] text-[#F3D68B]"
                  : "border-transparent text-[#94A3B8] hover:text-white"
              }`}
            >
              Data Operations ({ops?.connectors?.length || 9} Sources)
            </button>
            <button
              type="button"
              data-testid="studio-tab-rights-inventory"
              onClick={() => setActiveTab("rights_inventory")}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === "rights_inventory"
                  ? "border-[#D4AF63] text-[#F3D68B]"
                  : "border-transparent text-[#94A3B8] hover:text-white"
              }`}
            >
              50-State Rights & Connectors (51)
            </button>
            <button
              type="button"
              data-testid="studio-tab-sped-intel"
              onClick={() => setActiveTab("sped_intel")}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === "sped_intel"
                  ? "border-[#D4AF63] text-[#F3D68B]"
                  : "border-transparent text-[#94A3B8] hover:text-white"
              }`}
            >
              Special Ed Intelligence & Crosswalks ({ops?.totals.spedRecordsCount || 5})
            </button>
            <button
              type="button"
              data-testid="studio-tab-architecture"
              onClick={() => setActiveTab("architecture")}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === "architecture"
                  ? "border-[#D4AF63] text-[#F3D68B]"
                  : "border-transparent text-[#94A3B8] hover:text-white"
              }`}
            >
              Cloudflare Capacity & Imagery
            </button>
            <button
              type="button"
              data-testid="studio-tab-curation"
              onClick={() => setActiveTab("curation")}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === "curation"
                  ? "border-[#D4AF63] text-[#F3D68B]"
                  : "border-transparent text-[#94A3B8] hover:text-white"
              }`}
            >
              Communities Register ({communities.length})
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          data-testid="places-studio-scroll-body"
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar p-6 space-y-5"
        >
          {activeTab === "data_ops" ? (
            <div data-testid="studio-data-ops-panel" className="space-y-5">
              {/* Top Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="rounded-xl bg-[#020818] border border-[#24355A] p-3">
                  <span className="text-[10px] uppercase tracking-wider text-[#94A3B8] block">
                    ACS Measurements
                  </span>
                  <span
                    data-testid="ops-meas-count"
                    className="text-lg font-bold text-[#F3D68B] font-mono"
                  >
                    {ops?.totals.measurementsCount ?? 0}
                  </span>
                  <span className="text-[10px] text-emerald-300 block">
                    With 90% MOE
                  </span>
                </div>
                <div className="rounded-xl bg-[#020818] border border-[#24355A] p-3">
                  <span className="text-[10px] uppercase tracking-wider text-[#94A3B8] block">
                    NCES Districts
                  </span>
                  <span
                    data-testid="ops-districts-count"
                    className="text-lg font-bold text-[#93C5FD] font-mono"
                  >
                    {ops?.totals.ncesDistrictsCount ?? 0}
                  </span>
                  <span className="text-[10px] text-[#94A3B8] block">
                    7-Digit LEAID
                  </span>
                </div>
                <div className="rounded-xl bg-[#020818] border border-[#24355A] p-3">
                  <span className="text-[10px] uppercase tracking-wider text-[#94A3B8] block">
                    NCES Schools
                  </span>
                  <span
                    data-testid="ops-schools-count"
                    className="text-lg font-bold text-[#93C5FD] font-mono"
                  >
                    {ops?.totals.ncesSchoolsCount ?? 0}
                  </span>
                  <span className="text-[10px] text-[#94A3B8] block">
                    12-Digit NCESSCH
                  </span>
                </div>
                <div className="rounded-xl bg-[#020818] border border-[#24355A] p-3">
                  <span className="text-[10px] uppercase tracking-wider text-[#94A3B8] block">
                    SPED Dossiers
                  </span>
                  <span className="text-lg font-bold text-purple-300 font-mono">
                    {ops?.totals.spedRecordsCount ?? 0}
                  </span>
                  <span className="text-[10px] text-[#94A3B8] block">
                    5 Verification Tiers
                  </span>
                </div>
                <div className="rounded-xl bg-[#020818] border border-[#24355A] p-3">
                  <span className="text-[10px] uppercase tracking-wider text-[#94A3B8] block">
                    Quality Warnings
                  </span>
                  <span className="text-lg font-bold text-amber-300 font-mono">
                    {ops?.totals.warningsCount ?? 0}
                  </span>
                  <span className="text-[10px] text-amber-300/90 block">
                    MOE & Crosswalks
                  </span>
                </div>
              </div>

              {/* 5-Tier Verification Status Breakdown */}
              <div className="rounded-xl bg-[#020818] border border-[#24355A] p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#F3D68B] flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-[#D4AF63]" />
                    Source Verification Status Breakdown (Public Facts vs. Human-Verified SPED Research)
                  </h4>
                  <span className="text-[10.5px] text-[#94A3B8]">
                    Strict 5-Tier Separation Active
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(
                    [
                      "Verified",
                      "Parent Reported",
                      "Unverified",
                      "Outdated",
                      "Unknown",
                    ] as PlacesVerificationTier[]
                  ).map((tier) => (
                    <div
                      key={tier}
                      className={`rounded-lg border px-3 py-2 flex items-center justify-between ${getVerificationBadgeStyle(
                        tier
                      )}`}
                    >
                      <span className="text-[11px] font-semibold">{tier}</span>
                      <span className="text-sm font-mono font-bold">
                        {ops?.verificationBreakdown?.[tier] ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connected & Pending Official Data Sources */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-[#D4AF63]" />
                    Official Data Source Connectors & Manual Refresh Controls
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="run-acs-import-btn"
                      disabled={runImportMutation.isPending}
                      onClick={() =>
                        runImportMutation.mutate({
                          sourceId: "us_census_acs5",
                          stateFips2: "13",
                        })
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-[#102854] border border-[#D4AF63]/60 text-[#F3D68B] hover:bg-[#16356D] text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`h-3 w-3 ${
                          runImportMutation.isPending ? "animate-spin" : ""
                        }`}
                      />
                      Refresh Census ACS (GA)
                    </button>
                    <button
                      type="button"
                      data-testid="run-nces-import-btn"
                      disabled={runImportMutation.isPending}
                      onClick={() =>
                        runImportMutation.mutate({
                          sourceId: "nces_ccd_directory",
                          stateFips2: "13",
                        })
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-[#102854] border border-[#93C5FD]/50 text-[#93C5FD] hover:bg-[#16356D] text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`h-3 w-3 ${
                          runImportMutation.isPending ? "animate-spin" : ""
                        }`}
                      />
                      Refresh NCES CCD (GA)
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {ops?.connectors.map((conn) => {
                    const isLive =
                      conn.status === "connected_live" ||
                      conn.status === "human_verified_research";
                    return (
                      <div
                        key={conn.id}
                        data-testid={`connector-card-${conn.id}`}
                        className={`rounded-xl bg-[#020818] border p-3.5 space-y-1.5 ${
                          isLive ? "border-emerald-500/45" : "border-[#1D2F52]"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="text-xs font-semibold text-[#F4F6FB]">
                              {conn.name}
                            </span>
                            <span className="text-[10.5px] text-[#94A3B8] ml-2">
                              ({conn.agency})
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${
                                conn.status === "connected_live"
                                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                                  : conn.status === "human_verified_research"
                                    ? "bg-purple-500/15 text-purple-300 border-purple-500/40"
                                    : "bg-amber-500/15 text-amber-300 border-amber-500/40"
                              }`}
                            >
                              {conn.status === "connected_live"
                                ? "CONNECTED & IMPORTED"
                                : conn.status === "human_verified_research"
                                  ? "HUMAN-VERIFIED RESEARCH"
                                  : conn.status === "adapter_ready_pending_key"
                                    ? "ADAPTER READY · PENDING API KEY"
                                    : "ADAPTER READY · SCHEDULED BULK"}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-[#081736] border border-[#24355A] text-[#93C5FD] font-mono">
                              {conn.recordsImportedCount.toLocaleString()} records
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px] text-[#CBD5E1]">
                          <span>
                            <strong className="text-[#94A3B8]">Last Refresh:</strong>{" "}
                            {conn.lastSuccessfulRefresh
                              ? conn.lastSuccessfulRefresh.slice(0, 19).replace("T", " ")
                              : "Pending Initial Run"}
                          </span>
                          <span>
                            <strong className="text-[#94A3B8]">Schedule:</strong>{" "}
                            {conn.updateFrequency}
                          </span>
                          <span>
                            <strong className="text-[#94A3B8]">Next Refresh:</strong>{" "}
                            {conn.nextScheduledRefresh.slice(0, 10)}
                          </span>
                        </div>

                        <p className="text-[11px] text-[#93C5FD]">
                          <strong className="text-[#94A3B8]">Coverage:</strong>{" "}
                          {conn.geographicCoverage}
                        </p>
                        <p className="text-[11px] text-[#8496B0] leading-relaxed">
                          {conn.methodologyAndLimitationsNote}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Data Quality Warnings & Margin-of-Error Alerts */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  Automated Data Quality Warnings & Margin-of-Error Alerts (
                  {ops?.qualityWarnings.length ?? 0})
                </h4>
                <div className="space-y-2">
                  {ops?.qualityWarnings.map((w) => (
                    <div
                      key={w.id}
                      className="rounded-lg bg-[#020818] border border-amber-500/35 p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-amber-300">
                          {w.entityName} ·{" "}
                          <span className="font-mono text-[11px]">{w.geoid}</span>
                        </span>
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-200 border border-amber-500/30">
                          {w.category.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#CBD5E1] leading-relaxed">
                        {w.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Import Run History */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Import Execution History & Checksum Log ({ops?.importRuns.length ?? 0})
                </h4>
                <div className="space-y-2">
                  {ops?.importRuns.map((run) => (
                    <div
                      key={run.id}
                      className="rounded-lg bg-[#020818] border border-[#1D2F52] p-3 text-xs space-y-1"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-[#F3D68B]">
                          {run.sourceName} (State FIPS {run.stateFips2})
                        </span>
                        <span className="text-[10.5px] font-mono text-emerald-300">
                          {run.status.toUpperCase()} · {run.durationMs}ms ·{" "}
                          {run.sourceChecksum}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#CBD5E1]">{run.summaryText}</p>
                      <p className="text-[10px] text-[#94A3B8]">
                        Triggered by: {run.triggeredBy} · Completed:{" "}
                        {run.completedAt.slice(0, 19).replace("T", " ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTab === "sped_intel" ? (
            <div data-testid="studio-sped-intel-panel" className="space-y-5">
              {/* Mandatory Legal & Advocacy Non-Guarantee Banner */}
              <div className="rounded-xl bg-[#0A1838] border border-[#D4AF63]/50 p-3.5 text-xs space-y-1">
                <p className="font-semibold text-[#F3D68B]">
                  Special Education Intelligence & IDEA Part B Non-Guarantee Guardrail
                </p>
                <p className="text-[11px] text-[#CBD5E1] leading-relaxed">
                  {SPED_NON_GUARANTEE_DISCLAIMER}
                </p>
              </div>

              {/* Special Education Intelligence Dossiers */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Structured Special Education Intelligence Records (
                  {ops?.specialEdIntelligence.length ?? 0})
                </h4>
                {ops?.specialEdIntelligence.map((sp) => (
                  <div
                    key={sp.id}
                    className="rounded-xl bg-[#020818] border border-[#24355A] p-4 space-y-2.5 text-xs"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-[#F4F6FB] text-sm">
                          {sp.entityName}
                        </span>
                        <p className="text-[11px] text-[#94A3B8] font-mono mt-0.5">
                          NCES LEAID: {sp.ncesLeaId7}
                          {sp.ncesSchoolId12 ? ` · NCESSCH: ${sp.ncesSchoolId12}` : ""} ·
                          County FIPS: {sp.countyFips5}
                        </p>
                      </div>
                      <span
                        className={`text-[10.5px] px-2.5 py-0.5 rounded border font-semibold ${getVerificationBadgeStyle(
                          sp.verificationTier
                        )}`}
                      >
                        {sp.verificationTier} (Confirmed {sp.lastConfirmedDate})
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                      <div className="rounded-lg bg-[#06122B] border border-[#17284A] p-2.5">
                        <p className="font-semibold text-[#F3D68B] mb-1">
                          Program Continuum & Served Grades
                        </p>
                        <p className="text-[#CBD5E1] mb-1">
                          {sp.programLocationsAndServedGrades}
                        </p>
                        <ul className="list-disc list-inside text-[#94A3B8] space-y-0.5">
                          {sp.specializedProgramAvailability.map((p) => (
                            <li key={p}>{p}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-lg bg-[#06122B] border border-[#17284A] p-2.5 space-y-1">
                        <p className="font-semibold text-[#93C5FD]">
                          Related Services & Public Accountability
                        </p>
                        <p className="text-[#CBD5E1]">
                          <strong>Related Services:</strong>{" "}
                          {sp.relatedServicesAndSupportModels.join(", ")}
                        </p>
                        <p className="text-[#CBD5E1]">
                          <strong>IDEA Part B APR:</strong>{" "}
                          {sp.publicAccountabilityFindings.ideaPartBDetermination}
                        </p>
                        <p className="text-[#94A3B8]">
                          <strong>Corrective Action:</strong>{" "}
                          {sp.publicAccountabilityFindings.correctiveActionStatus}
                        </p>
                      </div>
                    </div>

                    {sp.parentReportedExperiencesSummary && (
                      <p className="text-[11px] text-sky-200/90 bg-sky-950/30 border border-sky-500/30 rounded-lg px-3 py-1.5">
                        <strong>Parent-Reported Experience Summary:</strong>{" "}
                        {sp.parentReportedExperiencesSummary}
                      </p>
                    )}

                    <p className="text-[10.5px] text-[#8496B0]">
                      <strong>Verification Audit Note:</strong>{" "}
                      {sp.sourceVerificationNotes}
                    </p>
                  </div>
                ))}
              </div>

              {/* Explicit Non-Coterminous Boundary Crosswalk Registry */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#F3D68B]">
                  Non-Coterminous Geographic Boundary Crosswalks (ZCTA / LEA / County)
                </h4>
                {ops?.boundaryCrosswalks.map((xw) => (
                  <div
                    key={xw.id}
                    className="rounded-xl bg-[#020818] border border-[#1D2F52] p-3.5 text-xs space-y-1"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-[#F4F6FB]">
                        {xw.fromName} ({xw.fromGeoid}) ↔ {xw.toName} ({xw.toGeoid})
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#102854] border border-[#D4AF63]/40 text-[#F3D68B] font-mono">
                        {xw.overlapType} · {Math.round(xw.allocationFactor * 100)}% share
                      </span>
                    </div>
                    <p className="text-[11px] text-[#CBD5E1]">{xw.boundaryNote}</p>
                    <p className="text-[10px] text-[#94A3B8]">
                      Source: {xw.sourceCitation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === "rights_inventory" ? (
            <StudioRightsInventoryPanel />
          ) : activeTab === "architecture" ? (
            <>
              <div className="rounded-xl bg-[#020818] border border-[#24355A] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-[#F3D68B] flex items-center gap-2">
                      <CloudUpload className="h-4 w-4" />
                      Independent Public Explorer Snapshot
                    </h4>
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      Publishes a self-contained JSON/GeoJSON snapshot so the public Waypoint Places
                      Explorer runs 24/7 even when the CRM and your computer are offline.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={publishMutation.isPending}
                    onClick={() => publishMutation.mutate()}
                    className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#000820] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {publishMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Publish Public Snapshot
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1D2F52] text-[11px] text-[#94A3B8]">
                  <span>
                    Target R2 Key:{" "}
                    <code className="text-[#F3D68B]">
                      {studioData?.config.r2PublicPrefix || "waypoint-places-public"}
                      /georgia-places-snapshot.json
                    </code>
                  </span>
                  <a
                    href="/api/places/public-snapshot.json"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#93C5FD] hover:underline"
                  >
                    Inspect Live Public JSON <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
                  <HardDrive className="h-3.5 w-3.5 text-[#D4AF63]" />
                  Cloudflare D1 vs. R2 Nationwide Capacity Evaluation
                </h4>
                <div className="space-y-2.5">
                  {CLOUDFLARE_STORAGE_EVALUATION.map((item) => (
                    <div
                      key={item.datasetName}
                      className="rounded-xl bg-[#020818] border border-[#1D2F52] p-3.5 space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#F4F6FB]">
                          {item.datasetName}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-[#0E224A] border border-[#2D4A82] text-[#93C5FD] font-medium">
                          {item.recommendedService}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-[#94A3B8]">
                        <span>Georgia Size: {item.estimatedGeorgiaSize}</span>
                        <span>Nationwide Size: {item.estimatedNationwideSize}</span>
                      </div>
                      <p className="text-[11px] text-[#8496B0] leading-relaxed">{item.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-[#D4AF63]" />
                  Satellite & Hybrid Imagery Providers (USGS / USDA NAIP Free Public Domain Active)
                </h4>
                <div className="space-y-2.5">
                  {SATELLITE_PROVIDER_OPTIONS.map((prov) => {
                    const isActive = prov.id === "usgs_naip_public_domain";
                    return (
                      <div
                        key={prov.id}
                        className={`rounded-xl bg-[#020818] border p-3.5 space-y-1.5 ${
                          isActive ? "border-emerald-500/60" : "border-[#1D2F52]"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#F4F6FB]">
                            {prov.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {isActive && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold">
                                ACTIVE ($0 / Public Domain)
                              </span>
                            )}
                            <span className="text-[10.5px] px-2 py-0.5 rounded bg-[#102854] border border-[#D4AF63]/40 text-[#F3D68B] font-medium">
                              {prov.badge}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-[#CBD5E1]">
                          <span>
                            <strong className="text-[#94A3B8]">Free Tier:</strong> {prov.freeAllowance}
                          </span>
                          <span>
                            <strong className="text-[#94A3B8]">Paid Pricing:</strong> {prov.paidPricing}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8496B0] leading-relaxed">
                          {prov.licensingAndRedistributionRule}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl bg-[#020818] border border-[#24355A] p-4 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#F3D68B] flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add or Update Georgia Community
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Name (e.g. Hall County, GA)"
                    className="rounded-lg bg-[#071432] border border-[#24355A] px-3 py-1.5 text-xs text-[#F4F6FB]"
                  />
                  <input
                    value={newFips}
                    onChange={(e) => setNewFips(e.target.value)}
                    placeholder="5-Digit FIPS (e.g. 13139)"
                    maxLength={5}
                    className="rounded-lg bg-[#071432] border border-[#24355A] px-3 py-1.5 text-xs font-mono text-[#F4F6FB]"
                  />
                  <input
                    value={newRegion}
                    onChange={(e) => setNewRegion(e.target.value)}
                    placeholder="Region (e.g. Northeast GA)"
                    className="rounded-lg bg-[#071432] border border-[#24355A] px-3 py-1.5 text-xs text-[#F4F6FB]"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    value={newTagline}
                    onChange={(e) => setNewTagline(e.target.value)}
                    placeholder="Geographic summary..."
                    className="flex-1 rounded-lg bg-[#071432] border border-[#24355A] px-3 py-1.5 text-xs text-[#F4F6FB]"
                  />
                  <button
                    type="button"
                    disabled={
                      upsertMutation.isPending ||
                      newFips.trim().length !== 5 ||
                      !newName.trim()
                    }
                    onClick={() =>
                      upsertMutation.mutate({
                        fips: newFips.trim(),
                        name: newName.trim(),
                        shortName: newName.replace(/,?\s*GA$/i, "").trim(),
                        region: newRegion.trim() || "Georgia",
                        coordinates: [-83.82, 34.3],
                        tagline:
                          newTagline.trim() ||
                          "Curated Georgia community awaiting verified dataset import.",
                        keyInsights: [
                          `Geographic Boundary: FIPS ${newFips.trim()}`,
                          "Academic & Safety Metrics: Pending Verified Dataset Import",
                        ],
                        dataStatus: "awaiting_verified_dataset",
                        calibrationPillars: {
                          communityQuality: null,
                          academics: null,
                          specializedPrograms: null,
                          safetyWellBeing: null,
                          familyLifestyle: null,
                          affordability: null,
                          commute: null,
                        },
                        publishedToPublic: true,
                      })
                    }
                    className="px-3.5 py-1.5 rounded-lg bg-[#D4AF63] text-[#000820] font-bold text-xs cursor-pointer disabled:opacity-50"
                  >
                    Save Community
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {communities.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg bg-[#020818] border border-[#1D2F52] px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-[#F4F6FB]">{c.name}</span>
                      <span className="text-[#94A3B8] ml-2 font-mono">FIPS {c.fips}</span>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5">{c.tagline}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shrink-0">
                      {c.evidenceCompleteness?.ratioText || "2/6 Verified Sources"}
                    </span>
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
