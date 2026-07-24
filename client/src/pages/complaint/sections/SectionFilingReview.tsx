import { trpc } from "@/lib/trpc";
import { useWorkspace } from "../workspaceContext";
import { GoldButton, SectionCard, StatusPill } from "@/components/complaint/atoms";
import type { RailSectionKey } from "@shared/complaintEngine";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

const CAT_KIND: Record<string, "ok" | "warning" | "error" | "info"> = {
  not_started: "error", needs_information: "warning", ready_for_review: "info", ready_to_file: "ok",
};
const CAT_LABEL: Record<string, string> = {
  not_started: "Not Started", needs_information: "Needs Information",
  ready_for_review: "Ready for Review", ready_to_file: "Ready to File",
};
const ITEM_KIND: Record<string, "ok" | "warning" | "error"> = { ok: "ok", warning: "warning", error: "error" };

export function SectionFilingReview() {
  const { caseDbId, goTo } = useWorkspace();
  const { data: readiness, isLoading } = trpc.complaintEngine.readiness.useQuery({ caseId: caseDbId });

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Filing Review</h2>
        <p className="mt-1 text-sm text-slate-400">Georgia-required field validation and the filing readiness checklist. Red items block export; yellow items are warnings you can override knowingly.</p>
      </div>

      {isLoading && <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#D9A441]" />}

      {readiness && (
        <>
          <SectionCard>
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0">
                <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#102A4A" strokeWidth="3.5" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#D9A441" strokeWidth="3.5"
                    strokeDasharray={`${readiness.percentComplete} ${100 - readiness.percentComplete}`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-[#E4B65B]">{readiness.percentComplete}%</span>
              </div>
              <div>
                <p className="font-medium text-slate-100">{readiness.blockers === 0 ? "No blocking issues — the packet can be exported." : `${readiness.blockers} blocking issue(s) to resolve before export.`}</p>
                <p className="mt-0.5 text-sm text-slate-400">{readiness.warnings} warning(s). Warnings do not block filing but are worth reviewing.</p>
              </div>
            </div>
          </SectionCard>

          {readiness.categories.map(cat => (
            <SectionCard key={cat.key} title={cat.label} actions={<StatusPill kind={CAT_KIND[cat.status]} label={CAT_LABEL[cat.status]} />}>
              <div className="space-y-1.5">
                {cat.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-md border border-[#22355499] bg-[#081A33] px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {item.status === "ok"
                        ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                        : <StatusPill kind={ITEM_KIND[item.status]} label={item.status === "error" ? "Required" : "Review"} />}
                      <div className="min-w-0">
                        <p className="truncate text-sm text-slate-200">{item.label}</p>
                        {item.status !== "ok" && <p className="truncate text-xs text-slate-400">{item.detail}</p>}
                      </div>
                    </div>
                    {item.status !== "ok" && (
                      <button onClick={() => goTo(item.sectionKey as RailSectionKey)} className="shrink-0 rounded-md border border-[#D9A441]/40 px-2.5 py-1 text-xs text-[#E4B65B] hover:bg-[#D9A441]/10">
                        Go Fix <ArrowRight className="ml-0.5 inline h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          ))}

          <div className="flex justify-end">
            <GoldButton onClick={() => goTo("export")}>Continue to Export <ArrowRight className="h-4 w-4" /></GoldButton>
          </div>
        </>
      )}
    </div>
  );
}
