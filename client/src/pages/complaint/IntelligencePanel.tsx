import { trpc } from "@/lib/trpc";
import { useWorkspace } from "./workspaceContext";
import { StatusPill } from "@/components/complaint/atoms";
import { Lightbulb, Loader2 } from "lucide-react";

const CAT_STATUS_LABEL: Record<string, string> = {
  not_started: "Not Started",
  needs_information: "Needs Information",
  ready_for_review: "Ready for Review",
  ready_to_file: "Ready to File",
};
const CAT_STATUS_KIND: Record<string, "ok" | "warning" | "error" | "info" | "gold"> = {
  not_started: "error", needs_information: "warning", ready_for_review: "info", ready_to_file: "ok",
};

const SECTION_TIPS: Record<string, string> = {
  overview: "This dashboard shows how filing-ready the complaint is. Every warning has a direct action — nothing is a dead end.",
  "case-information": "Georgia's complaint form requires complainant contact details, student information, and the public agency. Age is calculated automatically from the date of birth.",
  issues: "AI can suggest issue categories from the story, but an issue is only part of the complaint after you confirm it.",
  timeline: "Georgia can generally investigate violations within one year of receiving the complaint. Events older than that appear flagged.",
  allegations: "Each suggested allegation shows why it was suggested and which facts it was built from. Accept, edit, merge, or reject — nothing enters the complaint without you.",
  evidence: "Evidence IDs are permanent once assigned, so exhibit references stay stable. Link each exhibit to the allegations it supports.",
  "student-impact": "Impact statements are strongest when tied to specific changes — grades, behavior, attendance — and honest about the basis of support.",
  "requested-remedies": "Ask for what would actually fix the problem: compensatory services, evaluations, meetings, training. Quantify where possible.",
  "complaint-draft": "The draft assembles from your accepted allegations and confirmed facts. Every AI-drafted passage shows its Built From sources.",
  "filing-review": "The readiness checklist mirrors what GaDOE looks for. Clear the red items before exporting the filing package.",
  export: "Export produces the complaint packet: cover page, complaint, exhibit index, and exhibits — plus the district service copy certification.",
};

export function IntelligencePanel() {
  const { caseDbId, section, goTo } = useWorkspace();
  const { data: readiness, isLoading } = trpc.complaintEngine.readiness.useQuery({ caseId: caseDbId });

  return (
    <aside className="sticky top-[53px] hidden h-[calc(100vh-53px)] w-72 shrink-0 overflow-y-auto border-l border-[#22355499] bg-[#081A33] p-4 xl:block">
      <div className="rounded-lg border border-[#D9A441]/25 bg-[#D9A441]/5 p-3">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#E4B65B]">
          <Lightbulb className="h-3.5 w-3.5" /> Guidance
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{SECTION_TIPS[section]}</p>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Filing Readiness</p>
        {isLoading && <Loader2 className="mt-3 h-4 w-4 animate-spin text-[#D9A441]" />}
        {readiness && (
          <>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#102A4A]">
              <div className="h-full rounded-full bg-[#D9A441] transition-all" style={{ width: `${readiness.percentComplete}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-400">{readiness.percentComplete}% of checklist items complete</p>
            <div className="mt-3 space-y-2">
              {readiness.categories.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => goTo("filing-review")}
                  className="flex w-full items-center justify-between gap-2 rounded-md border border-[#22355499] bg-[#0B1F3A] px-3 py-2 text-left hover:border-[#D9A441]/40"
                >
                  <span className="text-xs text-slate-300">{cat.label}</span>
                  <StatusPill kind={CAT_STATUS_KIND[cat.status]} label={CAT_STATUS_LABEL[cat.status]} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <p className="mt-6 text-[10px] leading-relaxed text-slate-500">
        This panel never predicts case outcomes. It tracks completeness and Georgia filing requirements only.
      </p>
    </aside>
  );
}
