import { useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { WorkspaceContext } from "./workspaceContext";
import { GhostButton, GoldButton, PageIdBadge, StatusPill } from "@/components/complaint/atoms";
import { COMPLAINT_STATUS_LABELS, RAIL_SECTIONS, calcAge, type RailSectionKey } from "@shared/complaintEngine";
import {
  ArrowLeft, ArrowRight, BookOpenCheck, CalendarClock, ClipboardCheck, Compass,
  FileDown, FileText, FolderOpen, Gavel, HeartPulse, LayoutDashboard, ListChecks, Loader2, Scale,
} from "lucide-react";
import { startLogin } from "@/const";
import { SectionOverview } from "./sections/SectionOverview";
import { SectionCaseInfo } from "./sections/SectionCaseInfo";
import { SectionIssues } from "./sections/SectionIssues";
import { SectionTimeline } from "./sections/SectionTimeline";
import { SectionAllegations } from "./sections/SectionAllegations";
import { SectionEvidence } from "./sections/SectionEvidence";
import { SectionImpact } from "./sections/SectionImpact";
import { SectionRemedies } from "./sections/SectionRemedies";
import { SectionDraft } from "./sections/SectionDraft";
import { SectionFilingReview } from "./sections/SectionFilingReview";
import { SectionExport } from "./sections/SectionExport";
import { IntelligencePanel } from "./IntelligencePanel";

const RAIL_ICONS: Record<RailSectionKey, React.ComponentType<{ className?: string }>> = {
  overview: LayoutDashboard,
  "case-information": FileText,
  issues: ListChecks,
  timeline: CalendarClock,
  allegations: Gavel,
  evidence: FolderOpen,
  "student-impact": HeartPulse,
  "requested-remedies": Scale,
  "complaint-draft": BookOpenCheck,
  "filing-review": ClipboardCheck,
  export: FileDown,
};

const SECTION_COMPONENTS: Record<RailSectionKey, React.ComponentType> = {
  overview: SectionOverview,
  "case-information": SectionCaseInfo,
  issues: SectionIssues,
  timeline: SectionTimeline,
  allegations: SectionAllegations,
  evidence: SectionEvidence,
  "student-impact": SectionImpact,
  "requested-remedies": SectionRemedies,
  "complaint-draft": SectionDraft,
  "filing-review": SectionFilingReview,
  export: SectionExport,
};

const statusKind: Record<string, "ok" | "warning" | "error" | "info" | "gold"> = {
  draft: "warning", in_review: "info", ready_to_file: "gold", filed: "ok", investigation: "info", closed: "ok",
};

export default function ComplaintWorkspace() {
  const params = useParams<{ id: string; section?: string }>();
  const [, navigate] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const caseDbId = Number(params.id);
  const section: RailSectionKey = (RAIL_SECTIONS.find(s => s.key === params.section)?.key ?? "overview") as RailSectionKey;

  const { data: c, isLoading } = trpc.complaintEngine.getCase.useQuery({ id: caseDbId }, { enabled: isAuthenticated && !!caseDbId });

  const sectionIndex = RAIL_SECTIONS.findIndex(s => s.key === section);
  const goTo = (s: RailSectionKey) => navigate(`/tools/state-complaint-builder/${caseDbId}/${s}`);
  const ctx = useMemo(() => ({ caseDbId, section, goTo }), [caseDbId, section]);

  if (loading || isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#07162B]"><Loader2 className="h-6 w-6 animate-spin text-[#D9A441]" /></div>;
  }
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#07162B]">
        <Compass className="h-10 w-10 text-[#D9A441]" />
        <GoldButton className="mt-6" onClick={() => startLogin()}>Sign In</GoldButton>
      </div>
    );
  }
  if (!c) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#07162B] text-slate-300">
        Case not found.
        <GhostButton className="mt-4" onClick={() => navigate("/tools/state-complaint-builder")}>Back to Cases</GhostButton>
      </div>
    );
  }

  const age = calcAge(c.studentDob);
  const lookbackStart = new Date();
  lookbackStart.setFullYear(lookbackStart.getFullYear() - 1);
  const SectionComponent = SECTION_COMPONENTS[section];

  return (
    <WorkspaceContext.Provider value={ctx}>
      <div className="flex min-h-screen flex-col bg-[#07162B] text-slate-100">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-[#22355499] bg-[#07162B]/95 backdrop-blur">
          <div className="flex items-center gap-4 px-5 py-3">
            {/* ← Return to CRM */}
            <button
              onClick={() => navigate("/tools/state-complaint-builder")}
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-[#22355499] bg-[#0B1F3A] px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-[#D9A441]/60 hover:text-[#D9A441]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Return to CRM
            </button>
            {/* Page identity */}
            <div className="flex shrink-0 items-center gap-2">
              <Compass className="h-4 w-4 text-[#D9A441]" />
              <span className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-slate-300 md:block">State Complaint Builder</span>
              <span className="rounded border border-[#D9A441]/40 bg-[#D9A441]/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#D9A441]">PG-020</span>
            </div>
            <div className="min-w-0 flex-1 truncate border-l border-[#22355499] pl-4 text-sm text-slate-300">
              <span className="font-medium text-slate-100">{c.studentName || "Unnamed student"}</span>
              {age !== null && <span> · Age {age}</span>}
              <span className="text-slate-400"> · {c.caseId}</span>
              {c.studentDistrict && <span className="hidden text-slate-400 lg:inline"> · {c.studentDistrict}</span>}
              {c.studentSchool && <span className="hidden text-slate-400 xl:inline"> · {c.studentSchool}</span>}
            </div>
            <div className="flex items-center gap-2">
              {c.targetFilingDate && (
                <span className="hidden items-center gap-1 rounded border border-[#22355499] px-2 py-0.5 text-xs text-slate-300 md:flex">
                  <CalendarClock className="h-3 w-3 text-[#D9A441]" /> Deadline {new Date(c.targetFilingDate).toLocaleDateString()}
                </span>
              )}
              <span className="hidden rounded border border-[#22355499] px-2 py-0.5 text-xs text-slate-400 lg:block" title="Georgia can investigate violations that occurred within one year of receiving the complaint.">
                Lookback from {lookbackStart.toLocaleDateString()}
              </span>
              <StatusPill kind={statusKind[c.status] ?? "info"} label={COMPLAINT_STATUS_LABELS[c.status] ?? c.status} />
            </div>
          </div>
        </header>

        {/* Body: 3 columns */}
        <div className="flex flex-1">
          {/* Left rail */}
          <nav className="sticky top-[53px] hidden h-[calc(100vh-53px)] w-56 shrink-0 flex-col border-r border-[#22355499] bg-[#081A33] py-3 md:flex">
            {RAIL_SECTIONS.map((s) => {
              const Icon = RAIL_ICONS[s.key];
              const active = s.key === section;
              return (
                <button
                  key={s.key}
                  onClick={() => goTo(s.key)}
                  className={
                    "mx-2 mb-0.5 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors " +
                    (active ? "bg-[#D9A441]/15 text-[#E4B65B] font-medium" : "text-slate-300 hover:bg-[#102A4A] hover:text-slate-100")
                  }
                >
                  <Icon className="h-4 w-4" /> {s.label}
                </button>
              );
            })}
            <div className="mt-auto px-4 pt-3 text-[10px] leading-relaxed text-slate-500">
              Advocacy support tool — not legal advice. AI suggestions require your review and confirmation.
            </div>
          </nav>

          {/* Center workspace */}
          <main className="min-w-0 flex-1 px-6 py-6 pb-24">
            {/* Mobile section picker */}
            <div className="mb-4 md:hidden">
              <select className="w-full rounded-md border border-[#22355499] bg-[#0B1F3A] px-3 py-2 text-base" value={section} onChange={e => goTo(e.target.value as RailSectionKey)}>
                {RAIL_SECTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <SectionComponent />
          </main>

          {/* Right intelligence panel */}
          <IntelligencePanel />
        </div>

        {/* Sticky footer */}
        <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#22355499] bg-[#081A33]/95 backdrop-blur">
          <div className="flex items-center justify-between px-5 py-2.5">
            <GhostButton disabled={sectionIndex <= 0} onClick={() => goTo(RAIL_SECTIONS[sectionIndex - 1].key)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </GhostButton>
            <p className="hidden text-xs text-slate-500 sm:block">Changes save as you work — every field autosaves on blur.</p>
            {sectionIndex < RAIL_SECTIONS.length - 1 ? (
              <GoldButton onClick={() => goTo(RAIL_SECTIONS[sectionIndex + 1].key)}>
                Save &amp; Continue <ArrowRight className="h-4 w-4" />
              </GoldButton>
            ) : (
              <GoldButton onClick={() => goTo("filing-review")}>Review for Filing</GoldButton>
            )}
          </div>
        </footer>
        <PageIdBadge id="PG-020" />
      </div>
    </WorkspaceContext.Provider>
  );
}
