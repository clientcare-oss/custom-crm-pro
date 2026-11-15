import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FileText,
  Gavel,
  RefreshCw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import {
  US_50_STATES_DIRECTORY,
  type RightsAccountabilityExplicitStatus,
  type RightsSourceConnectorId,
} from "../../../../shared/waypointPlaces";

export function getRightsStatusBadgeClasses(
  status: RightsAccountabilityExplicitStatus
): string {
  switch (status) {
    case "Available":
    case "Published records found":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";
    case "Local availability varies":
      return "bg-sky-500/15 text-sky-300 border-sky-500/40";
    case "No published records found in indexed sources":
      return "bg-amber-500/15 text-amber-200 border-amber-500/40";
    case "Not offered statewide":
      return "bg-purple-500/15 text-purple-300 border-purple-500/40";
    case "Source outdated":
      return "bg-orange-500/15 text-orange-300 border-orange-500/40";
    case "Data unavailable":
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/40";
  }
}

export function RightsExplicitStatusBadge({
  status,
  testId,
}: {
  status: RightsAccountabilityExplicitStatus;
  testId?: string;
}) {
  return (
    <span
      data-testid={testId}
      className={`inline-flex items-center px-2 py-0.5 rounded text-[9.5px] font-semibold border ${getRightsStatusBadgeClasses(
        status
      )}`}
    >
      {status}
    </span>
  );
}

/**
 * Compact Rights & Accountability Card embedded inside the Community Dossier Drawer
 */
export function DossierRightsAccountabilityCard({
  stateFips2,
  countyFips5,
  communityName,
  onOpenFullModal,
}: {
  stateFips2: string;
  countyFips5: string;
  communityName: string;
  onOpenFullModal: () => void;
}) {
  const { data: bundle, isLoading } = trpc.waypointPlaces.getRightsForLocation.useQuery({
    stateFips2: stateFips2.slice(0, 2) || "13",
    countyFips5,
  });

  if (isLoading || !bundle) {
    return (
      <div className="rounded-lg bg-[#020A1E] border border-[#2A3F6A] p-2.5 text-[11px] text-[#94A3B8]">
        Loading Special Education Rights & Accountability intelligence...
      </div>
    );
  }

  const {
    stateProfile,
    districtPublishedDecisions,
    stateLevelUnattributedDecisions,
    monitoringAndOcrRecords,
    accountabilityMetrics,
    sectionStatuses,
  } = bundle;

  const primaryAcc = accountabilityMetrics[0] || null;
  const primaryMon = monitoringAndOcrRecords[0] || null;

  return (
    <div
      data-testid="dossier-rights-accountability-section"
      className="rounded-lg bg-[#020A1E] border border-[#D4AF63]/45 p-2.5 space-y-2"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-1.5 border-b border-[#17284A] pb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <Scale className="h-3.5 w-3.5 text-[#D4AF63] shrink-0" />
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#F3D68B] truncate">
            Rights & Accountability ({stateProfile.stateCode})
          </span>
        </div>
        <RightsExplicitStatusBadge
          status={sectionStatuses.monitoringAndOcrStatus}
          testId="dossier-rights-primary-status"
        />
      </div>

      {/* 1 & 4. Facilitated IEP & Mediation Availability */}
      <div className="rounded bg-[#061430] border border-[#17284A] p-2 space-y-1 text-[10.5px]">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[#CBD5E1] font-semibold">1. State-Facilitated IEP:</span>
          <RightsExplicitStatusBadge
            status={sectionStatuses.facilitatedIepStatus}
            testId="dossier-fiep-status-badge"
          />
        </div>
        <p className="text-[10px] text-[#94A3B8] leading-snug">
          Requires mutual parent + LEA agreement ·{" "}
          <a
            href={stateProfile.facilitatedIep.officialUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[#93C5FD] hover:underline inline-flex items-center gap-0.5"
          >
            Official SEA Procedure <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </p>
        <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-[#122244]">
          <span className="text-[#CBD5E1] font-semibold">4. IDEA Mediation ($0 Cost):</span>
          <RightsExplicitStatusBadge status={sectionStatuses.mediationStatus} />
        </div>
      </div>

      {/* 2 & 3. State Complaints & Due Process Hearings */}
      <div className="rounded bg-[#061430] border border-[#17284A] p-2 space-y-1 text-[10.5px]">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[#CBD5E1] font-semibold">
            2–3. Published Dispute Decisions:
          </span>
          <RightsExplicitStatusBadge
            status={sectionStatuses.dueProcessHearingsStatus}
            testId="dossier-decisions-status-badge"
          />
        </div>
        <p className="text-[10px] text-[#CBD5E1] leading-snug">
          <strong>District-Attributed ({communityName}):</strong>{" "}
          {districtPublishedDecisions.length} published in indexed docket ·{" "}
          <strong>State-Level Redacted ({stateProfile.stateCode}):</strong>{" "}
          {stateLevelUnattributedDecisions.length} digest records
        </p>
        <p className="text-[9.5px] text-amber-200/90 leading-snug">
          Tribunal: {stateProfile.dueProcessProcedure.hearingTribunalAgency} ·{" "}
          {districtPublishedDecisions.length === 0
            ? "No published district decisions in indexed docket never implies zero filings."
            : "Allegations & substantiated findings separated in full docket."}
        </p>
      </div>

      {/* 5, 6 & 7. IDEA Part B Monitoring, OCR & SWD Accountability */}
      {primaryMon || primaryAcc ? (
        <div className="rounded bg-[#061430] border border-[#17284A] p-2 space-y-1 text-[10.5px]">
          {primaryMon && (
            <div className="space-y-0.5">
              <span className="text-[9.5px] uppercase tracking-wider text-[#93C5FD] font-semibold block">
                5–6. Monitoring & OCR ({primaryMon.districtName})
              </span>
              <p className="text-[#F4F6FB] font-semibold">
                {primaryMon.determinationOrEnforcementStatus}
              </p>
              <p className="text-[9.5px] text-[#94A3B8]">
                Corrective Action: {primaryMon.correctiveActionStatus} ·{" "}
                {monitoringAndOcrRecords.length} official record(s)
              </p>
            </div>
          )}
          {primaryAcc && (
            <div className="grid grid-cols-2 gap-1 pt-1 border-t border-[#122244] text-[10px]">
              <div>
                <span className="text-[#94A3B8] block">SWD 4-Yr Grad:</span>
                <span className="font-mono font-bold text-emerald-300">
                  {primaryAcc.swdGraduationRate4YrPct ?? "N/A"}%
                </span>
              </div>
              <div>
                <span className="text-[#94A3B8] block">LRE ≥80% GenEd:</span>
                <span className="font-mono font-bold text-[#93C5FD]">
                  {primaryAcc.lre80PlusGeneralEdPct ?? "N/A"}%
                </span>
              </div>
              <div>
                <span className="text-[#94A3B8] block">Restraint / Seclusion:</span>
                <span className="font-mono font-bold text-[#F3D68B]">
                  {primaryAcc.restraintIncidentsCount ?? "N/A"} /{" "}
                  {primaryAcc.seclusionIncidentsCount ?? 0}
                </span>
              </div>
              <div>
                <span className="text-[#94A3B8] block">60-Day Eval Timely:</span>
                <span className="font-mono font-bold text-emerald-300">
                  {primaryAcc.timelyInitialEvaluationsPct ?? "N/A"}%
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded bg-[#061430] border border-[#17284A] p-2 text-[10px] text-[#94A3B8] flex items-center justify-between">
          <span>5–7. District APR & Accountability:</span>
          <RightsExplicitStatusBadge status="Data unavailable" />
        </div>
      )}

      {/* 8. PTI, P&A & Procedural Safeguards Quick Links */}
      <div className="rounded bg-[#061430] border border-[#17284A] p-2 space-y-1 text-[10px]">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[#F3D68B]">
            8. Official Parent Rights & Advocacy
          </span>
          <RightsExplicitStatusBadge status={sectionStatuses.parentResourcesStatus} />
        </div>
        <div className="flex flex-wrap gap-x-2.5 gap-y-1 pt-0.5">
          <a
            href={stateProfile.parentResourcesAndSafeguards.ptiOfficialUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[#93C5FD] hover:underline inline-flex items-center gap-0.5"
          >
            {stateProfile.parentResourcesAndSafeguards.ptiCenterName}{" "}
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
          <a
            href={stateProfile.parentResourcesAndSafeguards.protectionAndAdvocacyUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[#93C5FD] hover:underline inline-flex items-center gap-0.5"
          >
            {stateProfile.parentResourcesAndSafeguards.protectionAndAdvocacyAgencyName}{" "}
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
          <a
            href={stateProfile.parentResourcesAndSafeguards.proceduralSafeguardsNoticeUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[#F3D68B] hover:underline inline-flex items-center gap-0.5"
          >
            Procedural Safeguards <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      </div>

      {/* Non-Score & Non-Inference Guardrail Notice */}
      <p className="text-[9.5px] text-[#94A3B8] italic leading-snug">
        Published complaints and hearings are never treated as a school quality score.
      </p>

      {/* CTA to Open Full 8-Category Modal */}
      <button
        type="button"
        data-testid="open-rights-modal-btn"
        onClick={onOpenFullModal}
        className="w-full py-1.5 px-2.5 rounded-lg bg-[#102854] hover:bg-[#16356D] border border-[#D4AF63]/60 text-[#F3D68B] font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
      >
        <Gavel className="h-3.5 w-3.5 text-[#D4AF63]" />
        <span>Inspect Full Rights, Decisions & 50-State Dossier</span>
      </button>
    </div>
  );
}

/**
 * Full 8-Category Special Education Rights & Accountability Explorer Modal
 */
export function RightsAccountabilityFullModal({
  open,
  onClose,
  initialStateFips2,
  countyFips5,
  communityName,
}: {
  open: boolean;
  onClose: () => void;
  initialStateFips2: string;
  countyFips5: string;
  communityName: string;
}) {
  const [selectedStateFips2, setSelectedStateFips2] = useState<string>(
    initialStateFips2.slice(0, 2) || "13"
  );
  const [activeTab, setActiveTab] = useState<
    "procedures" | "decisions" | "monitoring_ocr" | "accountability"
  >("procedures");

  const effectiveCountyFips =
    selectedStateFips2 === initialStateFips2.slice(0, 2) ? countyFips5 : null;

  const { data: bundle } = trpc.waypointPlaces.getRightsForLocation.useQuery(
    {
      stateFips2: selectedStateFips2,
      countyFips5: effectiveCountyFips,
    },
    { enabled: open }
  );

  if (!open || !bundle) return null;

  const {
    stateProfile,
    districtPublishedDecisions,
    stateLevelUnattributedDecisions,
    monitoringAndOcrRecords,
    accountabilityMetrics,
    sectionStatuses,
    guardrails,
  } = bundle;

  return (
    <div
      data-testid="rights-accountability-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs"
    >
      <div className="w-full max-w-4xl max-h-[92vh] min-h-0 rounded-2xl bg-[#040D24] border border-[#2A3F6A] shadow-2xl text-[#F4F6FB] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1D2F52] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] uppercase tracking-widest text-[#D4AF63] font-semibold">
                50-State Special Education Rights & Accountability Intelligence
              </span>
              <RightsExplicitStatusBadge status={stateProfile.facilitatedIep.status} />
            </div>
            <h2
              className="text-lg sm:text-xl font-bold text-[#F4F6FB] mt-0.5"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {effectiveCountyFips
                ? `${communityName} · ${stateProfile.stateName} (${stateProfile.stateCode})`
                : `${stateProfile.stateName} (${stateProfile.stateCode}) Statewide Rights Profile`}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* 50-State Selector */}
            <label className="text-[11px] text-[#94A3B8] flex items-center gap-1.5">
              <span>Inspect State:</span>
              <select
                data-testid="rights-modal-state-selector"
                value={selectedStateFips2}
                onChange={(e) => setSelectedStateFips2(e.target.value)}
                className="rounded-lg bg-[#081736] border border-[#2A3F6A] px-2.5 py-1 text-xs font-semibold text-[#F3D68B]"
              >
                {Object.values(US_50_STATES_DIRECTORY)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((st) => (
                    <option key={st.fips2} value={st.fips2}>
                      {st.name} ({st.code})
                    </option>
                  ))}
              </select>
            </label>

            <button
              type="button"
              data-testid="close-rights-modal-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg border border-[#24355A] text-[#94A3B8] hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mandatory Guardrails Banner */}
        <div className="px-5 py-2.5 bg-[#071536] border-b border-[#1D2F52] grid grid-cols-1 md:grid-cols-3 gap-2 text-[10.5px] text-[#CBD5E1] shrink-0">
          <div className="flex items-start gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-[#D4AF63] shrink-0 mt-0.5" />
            <span>{guardrails.nonScoreGuardrail}</span>
          </div>
          <div className="flex items-start gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-300 shrink-0 mt-0.5" />
            <span>{guardrails.noPublishedRecordsGuardrail}</span>
          </div>
          <div className="flex items-start gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300 shrink-0 mt-0.5" />
            <span>{guardrails.pdfAndPiiGuardrail}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-2.5 border-b border-[#1D2F52] flex flex-wrap gap-4 shrink-0">
          <button
            type="button"
            data-testid="rights-tab-procedures"
            onClick={() => setActiveTab("procedures")}
            className={`pb-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "procedures"
                ? "border-[#D4AF63] text-[#F3D68B]"
                : "border-transparent text-[#94A3B8] hover:text-white"
            }`}
          >
            1–4 & 8. State Procedures, FIEP, Mediation & PTI/P&A
          </button>
          <button
            type="button"
            data-testid="rights-tab-decisions"
            onClick={() => setActiveTab("decisions")}
            className={`pb-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "decisions"
                ? "border-[#D4AF63] text-[#F3D68B]"
                : "border-transparent text-[#94A3B8] hover:text-white"
            }`}
          >
            2–3. Published Decisions Docket (
            {districtPublishedDecisions.length + stateLevelUnattributedDecisions.length})
          </button>
          <button
            type="button"
            data-testid="rights-tab-monitoring"
            onClick={() => setActiveTab("monitoring_ocr")}
            className={`pb-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "monitoring_ocr"
                ? "border-[#D4AF63] text-[#F3D68B]"
                : "border-transparent text-[#94A3B8] hover:text-white"
            }`}
          >
            5–6. State Monitoring & Federal OCR ({monitoringAndOcrRecords.length})
          </button>
          <button
            type="button"
            data-testid="rights-tab-accountability"
            onClick={() => setActiveTab("accountability")}
            className={`pb-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "accountability"
                ? "border-[#D4AF63] text-[#F3D68B]"
                : "border-transparent text-[#94A3B8] hover:text-white"
            }`}
          >
            7. SWD Grad, Discipline, Restraint & Staffing ({accountabilityMetrics.length})
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar p-5 space-y-4">
          {activeTab === "procedures" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* 1. State-Facilitated IEP Meetings */}
              <div className="rounded-xl bg-[#020818] border border-[#24355A] p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-[#F3D68B] text-sm">
                    1. State-Facilitated IEP Meeting Availability
                  </h3>
                  <RightsExplicitStatusBadge status={stateProfile.facilitatedIep.status} />
                </div>
                <p className="text-[#CBD5E1] leading-relaxed">
                  <strong>Eligibility & Scope:</strong>{" "}
                  {stateProfile.facilitatedIep.eligibilitySummary}
                </p>
                <p className="text-[#CBD5E1] leading-relaxed">
                  <strong>Agreement Requirement:</strong>{" "}
                  {stateProfile.facilitatedIep.agreementRequirements}
                </p>
                <p className="text-[#CBD5E1] leading-relaxed">
                  <strong>Request Procedure:</strong>{" "}
                  {stateProfile.facilitatedIep.requestProcedure}
                </p>
                <p className="text-[#94A3B8]">
                  <strong>Agency Contact:</strong>{" "}
                  {stateProfile.facilitatedIep.agencyContact}
                </p>
                <a
                  href={stateProfile.facilitatedIep.officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[#93C5FD] hover:underline font-semibold"
                >
                  Official Facilitated IEP Link <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* 2. State Special Education Complaint Procedures */}
              <div className="rounded-xl bg-[#020818] border border-[#24355A] p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-[#F3D68B] text-sm">
                    2. State Special Education Complaint Procedures
                  </h3>
                  <RightsExplicitStatusBadge
                    status={stateProfile.stateComplaintProcedure.status}
                  />
                </div>
                <p className="text-[#CBD5E1] leading-relaxed">
                  <strong>Filing Lookback Window:</strong>{" "}
                  {stateProfile.stateComplaintProcedure.filingWindowTimeline}
                </p>
                <p className="text-[#CBD5E1] leading-relaxed">
                  <strong>60-Day Investigation Timeline:</strong>{" "}
                  {stateProfile.stateComplaintProcedure.investigationDecisionTimeline}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[#94A3B8]">Published Decisions Index:</span>
                  <RightsExplicitStatusBadge
                    status={
                      stateProfile.stateComplaintProcedure.publishedDecisionsStatus
                    }
                  />
                </div>
                <div className="flex flex-wrap gap-3 pt-1">
                  <a
                    href={stateProfile.stateComplaintProcedure.filingPortalOrFormUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#93C5FD] hover:underline font-semibold"
                  >
                    Official Complaint Filing Procedure <ExternalLink className="h-3 w-3" />
                  </a>
                  {stateProfile.stateComplaintProcedure.publishedDecisionsIndexUrl && (
                    <a
                      href={stateProfile.stateComplaintProcedure.publishedDecisionsIndexUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[#F3D68B] hover:underline font-semibold"
                    >
                      Published Complaint Index <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* 3. Due Process Hearing Procedures */}
              <div className="rounded-xl bg-[#020818] border border-[#24355A] p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-[#F3D68B] text-sm">
                    3. Due Process Hearing Procedures & Appeals
                  </h3>
                  <RightsExplicitStatusBadge
                    status={stateProfile.dueProcessProcedure.status}
                  />
                </div>
                <p className="text-[#CBD5E1]">
                  <strong>Hearing Tribunal:</strong>{" "}
                  {stateProfile.dueProcessProcedure.hearingTribunalAgency} (
                  {stateProfile.dueProcessProcedure.tierSystem})
                </p>
                <p className="text-[#CBD5E1] leading-relaxed">
                  <strong>Statute of Limitations:</strong>{" "}
                  {stateProfile.dueProcessProcedure.statuteOfLimitationsTimeline}
                </p>
                <p className="text-[#CBD5E1] leading-relaxed">
                  <strong>Resolution & Decision Timelines:</strong>{" "}
                  {stateProfile.dueProcessProcedure.resolutionPeriodTimeline}{" "}
                  {stateProfile.dueProcessProcedure.hearingDecisionTimeline}
                </p>
                <p className="text-[#CBD5E1] leading-relaxed">
                  <strong>Available Appeals:</strong>{" "}
                  {stateProfile.dueProcessProcedure.availableAppeals}
                </p>
                <a
                  href={stateProfile.dueProcessProcedure.filingAndProceduresUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[#93C5FD] hover:underline font-semibold"
                >
                  Official Due Process Docket & Filing <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* 4 & 8. Mediation + PTI, P&A & Procedural Safeguards */}
              <div className="rounded-xl bg-[#020818] border border-[#24355A] p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-[#F3D68B] text-sm">
                    4 & 8. Mediation, PTI, P&A & Procedural Safeguards
                  </h3>
                  <RightsExplicitStatusBadge
                    status={stateProfile.mediationAndAlternativeResolution.status}
                  />
                </div>
                <p className="text-[#CBD5E1] leading-relaxed">
                  <strong>IDEA Mediation:</strong>{" "}
                  {stateProfile.mediationAndAlternativeResolution.mediationSummary} (Cost:{" "}
                  {stateProfile.mediationAndAlternativeResolution.costToFamily})
                </p>
                <div className="rounded-lg bg-[#06122B] border border-[#17284A] p-2.5 space-y-1.5">
                  <p className="font-semibold text-[#93C5FD]">
                    8. State Parent Training (PTI) & Protection/Advocacy (P&A)
                  </p>
                  <p className="text-[#CBD5E1]">
                    <strong>PTI Center:</strong>{" "}
                    <a
                      href={stateProfile.parentResourcesAndSafeguards.ptiOfficialUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#F3D68B] hover:underline"
                    >
                      {stateProfile.parentResourcesAndSafeguards.ptiCenterName}
                    </a>{" "}
                    ({stateProfile.parentResourcesAndSafeguards.ptiPhoneOrContact})
                  </p>
                  <p className="text-[#CBD5E1]">
                    <strong>Protection & Advocacy (P&A):</strong>{" "}
                    <a
                      href={
                        stateProfile.parentResourcesAndSafeguards.protectionAndAdvocacyUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#F3D68B] hover:underline"
                    >
                      {
                        stateProfile.parentResourcesAndSafeguards
                          .protectionAndAdvocacyAgencyName
                      }
                    </a>
                  </p>
                  <p className="text-[#CBD5E1]">
                    <strong>Procedural Safeguards:</strong>{" "}
                    <a
                      href={
                        stateProfile.parentResourcesAndSafeguards
                          .proceduralSafeguardsNoticeUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#93C5FD] hover:underline inline-flex items-center gap-1"
                    >
                      Official State Notice of Procedural Safeguards{" "}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "decisions" && (
            <div className="space-y-4 text-xs">
              {/* District-Attributed Decisions */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-[#F3D68B]">
                    District-Attributed Published Decisions (
                    {districtPublishedDecisions.length})
                  </h3>
                  <RightsExplicitStatusBadge
                    status={sectionStatuses.dueProcessHearingsStatus}
                  />
                </div>

                {districtPublishedDecisions.length === 0 ? (
                  <div className="rounded-xl bg-[#020818] border border-amber-500/40 p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-amber-200">
                        No Published District-Attributed Decisions in Indexed Sources
                      </span>
                      <RightsExplicitStatusBadge status="No published records found in indexed sources" />
                    </div>
                    <p className="text-[#CBD5E1] leading-relaxed">
                      {guardrails.noPublishedRecordsGuardrail}
                    </p>
                  </div>
                ) : (
                  districtPublishedDecisions.map((dec) => (
                    <div
                      key={dec.id}
                      data-testid={`decision-card-${dec.id}`}
                      className="rounded-xl bg-[#020818] border border-[#24355A] p-4 space-y-2"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <span className="font-mono font-bold text-[#F3D68B] text-xs">
                            {dec.caseOrDecisionId}
                          </span>
                          <span className="ml-2 text-[#CBD5E1] font-semibold">
                            · {dec.districtName || "Statewide Docket"} (NCES LEA{" "}
                            {dec.ncesLeaId7 || "State-Level"})
                          </span>
                          <p className="text-[11px] text-[#94A3B8]">
                            Source: {dec.sourceAgency} · Scope: {dec.geographicSupportScope}
                          </p>
                        </div>
                        <span className="px-2.5 py-0.5 rounded bg-[#102854] border border-[#D4AF63]/50 text-[#F3D68B] font-semibold text-[11px]">
                          {dec.decisionOutcome}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] bg-[#06122B] rounded-lg p-2.5 border border-[#17284A]">
                        <span>
                          <strong className="text-[#94A3B8]">Filing Date:</strong>{" "}
                          {dec.filingDate || "Not stated in docket"}
                        </span>
                        <span>
                          <strong className="text-[#94A3B8]">Decision Date:</strong>{" "}
                          {dec.decisionDate}
                        </span>
                        <span>
                          <strong className="text-[#94A3B8]">Publication Date:</strong>{" "}
                          {dec.publicationDate || dec.decisionDate}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-lg bg-[#06122B] border border-[#17284A] p-2.5 space-y-1">
                          <p className="font-semibold text-amber-300 text-[11px]">
                            Allegations Raised
                          </p>
                          <ul className="list-disc list-inside text-[#CBD5E1] space-y-1 text-[11px]">
                            {dec.allegations.map((a, i) => (
                              <li key={i}>{a}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-lg bg-[#06122B] border border-[#17284A] p-2.5 space-y-1">
                          <p className="font-semibold text-emerald-300 text-[11px]">
                            Substantiated Findings
                          </p>
                          {dec.publishMode === "official_link_only" ? (
                            <p className="text-[11px] text-amber-200">
                              Automated PDF summary withheld (unvalidated scan). Inspect
                              official agency decision link below.
                            </p>
                          ) : (
                            <ul className="list-disc list-inside text-[#CBD5E1] space-y-1 text-[11px]">
                              {dec.substantiatedFindings.map((f, i) => (
                                <li key={i}>{f}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                      {dec.correctiveActionRequired && (
                        <p className="text-[11px] text-[#93C5FD]">
                          <strong>Corrective Action / Remedy Ordered:</strong>{" "}
                          {dec.correctiveActionRequired}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#17284A] text-[10.5px] text-[#94A3B8]">
                        <span>Appeals: {dec.availableAppealsNote}</span>
                        <a
                          href={dec.originalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#93C5FD] hover:underline inline-flex items-center gap-1 font-semibold"
                        >
                          Official Source Docket <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* State-Level Unattributed Decisions (Where SEA redacts LEA name or PDF is linked only) */}
              <div className="space-y-2.5 pt-2 border-t border-[#1D2F52]">
                <h3 className="text-sm font-bold text-[#93C5FD]">
                  State-Level Decisions Without District Attribution (
                  {stateLevelUnattributedDecisions.length})
                </h3>
                <p className="text-[11px] text-[#94A3B8]">
                  Guardrail Enforced: When a state agency publishes complaint digests with the
                  school district redacted—or when a scanned PDF order has not passed automated
                  structural & FERPA redaction verification—Waypoint Places keeps the record at
                  the State level (`state_only`) and links directly to the official source.
                </p>
                {stateLevelUnattributedDecisions.map((dec) => (
                  <div
                    key={dec.id}
                    className="rounded-xl bg-[#020818] border border-[#1D2F52] p-3.5 space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono font-semibold text-[#F4F6FB]">
                        {dec.caseOrDecisionId} · {dec.sourceAgency}
                      </span>
                      <span className="text-[10.5px] px-2 py-0.5 rounded bg-[#081736] border border-[#2A3F6A] text-[#93C5FD]">
                        {dec.publishMode === "official_link_only"
                          ? "Official Link Only (PDF Safeguard Enforced)"
                          : "State-Only Redacted Digest"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#CBD5E1]">
                      Filing: {dec.filingDate || "N/A"} · Decision: {dec.decisionDate} ·
                      Outcome: <strong>{dec.decisionOutcome}</strong>
                    </p>
                    <p className="text-[10.5px] text-[#94A3B8]">
                      {dec.sourceCoverageAndCompleteness}
                    </p>
                    <a
                      href={dec.originalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[#93C5FD] hover:underline text-[11px]"
                    >
                      Inspect Official Source Decision <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "monitoring_ocr" && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#F3D68B]">
                  5–6. State IDEA Part B Monitoring, Corrective Actions & Federal OCR Records
                </h3>
                <RightsExplicitStatusBadge
                  status={sectionStatuses.monitoringAndOcrStatus}
                />
              </div>
              {monitoringAndOcrRecords.length === 0 ? (
                <div className="rounded-xl bg-[#020818] border border-[#24355A] p-4 text-[#94A3B8]">
                  No district-specific monitoring or OCR records indexed for this selection yet.
                </div>
              ) : (
                monitoringAndOcrRecords.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl bg-[#020818] border border-[#24355A] p-4 space-y-2"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-[#F4F6FB] text-sm">
                          {m.districtName} (NCES LEA {m.ncesLeaId7})
                        </span>
                        <p className="text-[11px] text-[#94A3B8]">
                          {m.sourceAgency} · Report ID: {m.caseOrReportId} ·{" "}
                          {m.reportingPeriod}
                        </p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-semibold text-[11px]">
                        {m.determinationOrEnforcementStatus}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#CBD5E1]">
                      <strong>Reviewed Indicators / Scope:</strong>{" "}
                      {m.allegationsOrReviewedIndicators.join("; ")}
                    </p>
                    <p className="text-[11px] text-[#CBD5E1]">
                      <strong>Findings:</strong>{" "}
                      {m.substantiatedComplianceFindings.join(" ")}
                    </p>
                    {m.correctiveActionPlanSummary && (
                      <p className="text-[11px] text-amber-200">
                        <strong>Corrective Action Plan ({m.correctiveActionStatus}):</strong>{" "}
                        {m.correctiveActionPlanSummary}
                      </p>
                    )}
                    <a
                      href={m.originalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[#93C5FD] hover:underline text-[11px]"
                    >
                      Official Monitoring / OCR Source <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "accountability" && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#F3D68B]">
                  7. District & School SWD Accountability, Discipline, Restraint/Seclusion & Staffing
                </h3>
                <RightsExplicitStatusBadge
                  status={sectionStatuses.accountabilityMetricsStatus}
                />
              </div>
              {accountabilityMetrics.length === 0 ? (
                <div className="rounded-xl bg-[#020818] border border-[#24355A] p-4 text-[#94A3B8]">
                  District-level SWD accountability metrics are currently marked{" "}
                  <strong>Data unavailable</strong> for this selection.
                </div>
              ) : (
                accountabilityMetrics.map((acc) => (
                  <div
                    key={acc.id}
                    className="rounded-xl bg-[#020818] border border-[#24355A] p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-[#F4F6FB] text-sm">
                          {acc.districtName} (NCES LEA {acc.ncesLeaId7})
                        </span>
                        <p className="text-[11px] text-[#94A3B8]">
                          {acc.reportingPeriod} · {acc.sourceAgency}
                        </p>
                      </div>
                      <RightsExplicitStatusBadge status={acc.explicitStatus} />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                      <div className="rounded-lg bg-[#06122B] border border-[#17284A] p-2.5">
                        <span className="text-[#94A3B8] block">
                          SWD 4-Year Graduation (Ind. 1)
                        </span>
                        <span className="text-base font-bold font-mono text-emerald-300">
                          {acc.swdGraduationRate4YrPct ?? "N/A"}%
                        </span>
                        <span className="text-[10px] text-[#94A3B8] block">
                          State Target: {acc.stateTargetGraduationRatePct ?? "N/A"}%
                        </span>
                      </div>
                      <div className="rounded-lg bg-[#06122B] border border-[#17284A] p-2.5">
                        <span className="text-[#94A3B8] block">
                          SWD Reading / Math (Ind. 3B)
                        </span>
                        <span className="text-base font-bold font-mono text-[#F3D68B]">
                          {acc.swdReadingProficiencyPct ?? "N/A"}% /{" "}
                          {acc.swdMathProficiencyPct ?? "N/A"}%
                        </span>
                        <span className="text-[10px] text-[#94A3B8] block">
                          State Assessment Proficiency
                        </span>
                      </div>
                      <div className="rounded-lg bg-[#06122B] border border-[#17284A] p-2.5">
                        <span className="text-[#94A3B8] block">
                          LRE ≥80% GenEd (Ind. 5A)
                        </span>
                        <span className="text-base font-bold font-mono text-[#93C5FD]">
                          {acc.lre80PlusGeneralEdPct ?? "N/A"}%
                        </span>
                        <span className="text-[10px] text-[#94A3B8] block">
                          Separate Setting: {acc.lreSeparateSchoolOrResidentialPct ?? "N/A"}%
                        </span>
                      </div>
                      <div className="rounded-lg bg-[#06122B] border border-[#17284A] p-2.5">
                        <span className="text-[#94A3B8] block">
                          SPED Certified Staffing
                        </span>
                        <span className="text-base font-bold font-mono text-[#F4F6FB]">
                          {acc.spedCertifiedTeachersFte ?? "N/A"} FTE
                        </span>
                        <span className="text-[10px] text-[#94A3B8] block">
                          SWD Ratio: {acc.swdToSpedTeacherRatio ?? "N/A"}:1
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] bg-[#06122B] rounded-lg p-2.5 border border-[#17284A]">
                      <div>
                        <p className="font-semibold text-[#F3D68B]">
                          Disability-Related Discipline (IDEA Indicator 4A/4B)
                        </p>
                        <p className="text-[#CBD5E1]">
                          OSS &gt;10 Days Rate:{" "}
                          <strong>{acc.swdOutOfSchoolSuspensionGt10DaysPct ?? "N/A"}%</strong> ·{" "}
                          {acc.significantDiscrepancyDisciplineFlag}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-[#93C5FD]">
                          Restraint & Seclusion (CRDC / State Rule)
                        </p>
                        <p className="text-[#CBD5E1]">
                          Physical Restraint Incidents:{" "}
                          <strong>{acc.restraintIncidentsCount ?? "N/A"}</strong> · Seclusion:{" "}
                          <strong>{acc.seclusionIncidentsCount ?? 0}</strong>
                        </p>
                        <p className="text-[10px] text-[#94A3B8]">
                          {acc.seclusionStatePolicyNote}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Staff Console Tab for `PlacesStudioDrawer`:
 * Displays the 50-State Rights & Accountability Source Inventory & Automated Connector Registry
 */
export function StudioRightsInventoryPanel() {
  const utils = trpc.useUtils();
  const { data: rightsOps, refetch } =
    trpc.waypointPlaces.getRightsConsoleState.useQuery();

  const refreshConnectorMutation =
    trpc.waypointPlaces.runRightsConnectorRefresh.useMutation({
      onSuccess: (res) => {
        toast.success(res.summaryText);
        refetch();
        utils.waypointPlaces.getRightsForLocation.invalidate();
      },
      onError: (err) => toast.error(err.message),
    });

  if (!rightsOps) {
    return (
      <div className="p-4 text-xs text-[#94A3B8]">
        Loading 50-State Rights & Accountability Connector Registry...
      </div>
    );
  }

  return (
    <div data-testid="studio-rights-inventory-panel" className="space-y-5 text-xs">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="rounded-xl bg-[#020818] border border-[#24355A] p-3">
          <span className="text-[10px] uppercase tracking-wider text-[#94A3B8] block">
            States & DC Indexed
          </span>
          <span
            data-testid="rights-states-count"
            className="text-lg font-bold text-[#F3D68B] font-mono"
          >
            {rightsOps.totals.statesCoveredCount}
          </span>
          <span className="text-[10px] text-emerald-300 block">50 States + DC</span>
        </div>
        <div className="rounded-xl bg-[#020818] border border-[#24355A] p-3">
          <span className="text-[10px] uppercase tracking-wider text-[#94A3B8] block">
            Active Connectors
          </span>
          <span className="text-lg font-bold text-[#93C5FD] font-mono">
            {rightsOps.totals.connectorsCount}
          </span>
          <span className="text-[10px] text-[#94A3B8] block">Zero Manual Entry</span>
        </div>
        <div className="rounded-xl bg-[#020818] border border-[#24355A] p-3">
          <span className="text-[10px] uppercase tracking-wider text-[#94A3B8] block">
            Published Decisions
          </span>
          <span
            data-testid="rights-decisions-count"
            className="text-lg font-bold text-[#F3D68B] font-mono"
          >
            {rightsOps.totals.publishedDecisionsCount}
          </span>
          <span className="text-[10px] text-[#94A3B8] block">OSAH / GaDOE / BSEA</span>
        </div>
        <div className="rounded-xl bg-[#020818] border border-[#24355A] p-3">
          <span className="text-[10px] uppercase tracking-wider text-[#94A3B8] block">
            APR & OCR Records
          </span>
          <span className="text-lg font-bold text-emerald-300 font-mono">
            {rightsOps.totals.monitoringAndOcrCount}
          </span>
          <span className="text-[10px] text-[#94A3B8] block">LEA Explicit</span>
        </div>
        <div className="rounded-xl bg-[#020818] border border-[#24355A] p-3">
          <span className="text-[10px] uppercase tracking-wider text-[#94A3B8] block">
            SWD Accountability
          </span>
          <span className="text-lg font-bold text-purple-300 font-mono">
            {rightsOps.totals.accountabilityProfilesCount}
          </span>
          <span className="text-[10px] text-[#94A3B8] block">Grad / Restraint / FTE</span>
        </div>
      </div>

      {/* Automated Connector Registry */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#F3D68B]">
          Automated Rights & Accountability Source Connector Registry
        </h4>
        {rightsOps.connectorRegistry.map((conn) => (
          <div
            key={conn.connectorId}
            data-testid={`rights-connector-${conn.connectorId}`}
            className="rounded-xl bg-[#020818] border border-[#24355A] p-3.5 space-y-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-bold text-[#F4F6FB]">{conn.name}</span>
                <span className="text-[10.5px] text-[#94A3B8] ml-2">
                  ({conn.stateScope})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <RightsExplicitStatusBadge status={conn.explicitStatus} />
                <button
                  type="button"
                  data-testid={`refresh-rights-${conn.connectorId}`}
                  disabled={refreshConnectorMutation.isPending}
                  onClick={() =>
                    refreshConnectorMutation.mutate({
                      connectorId: conn.connectorId as RightsSourceConnectorId,
                    })
                  }
                  className="px-2.5 py-1 rounded bg-[#102854] hover:bg-[#16356D] border border-[#D4AF63]/50 text-[#F3D68B] text-[10.5px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Sync ({conn.recordsImportedCount})</span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-[#CBD5E1]">
              {conn.sourceCoverageAndCompleteness}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-[#94A3B8]">
              <span>
                Schedule: {conn.refreshFrequencyLabel} · PDF Policy:{" "}
                <strong className="text-[#93C5FD]">{conn.pdfExtractionPolicy}</strong>
              </span>
              <span>Checksum: {conn.lastKnownGoodChecksum}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

