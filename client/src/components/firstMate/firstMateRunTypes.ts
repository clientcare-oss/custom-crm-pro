import type { FirstMateSession } from "../../../../shared/firstMate";

export const SPEAKER_CONFIG: Record<
  string,
  { label: string; initial: string; bg: string; text: string; border: string }
> = {
  Parent: { label: "Parent", initial: "P", bg: "bg-rose-500/20", text: "text-rose-400", border: "border-rose-500/40" },
  School: { label: "School", initial: "S", bg: "bg-sky-500/20", text: "text-sky-400", border: "border-sky-500/40" },
  Advocate: { label: "Advocate (You)", initial: "A", bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/40" },
  Student: { label: "Student", initial: "ST", bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/40" },
  Teacher: { label: "Teacher", initial: "T", bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/40" },
  Administrator: { label: "Administrator", initial: "AD", bg: "bg-blue-600/20", text: "text-blue-300", border: "border-blue-500/40" },
  "Special Education Teacher": { label: "SpEd Teacher", initial: "SE", bg: "bg-indigo-500/20", text: "text-indigo-400", border: "border-indigo-500/40" },
  SLP: { label: "SLP (Speech)", initial: "SL", bg: "bg-teal-500/20", text: "text-teal-400", border: "border-teal-500/40" },
  OT: { label: "OT (Occupational)", initial: "OT", bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/40" },
  PT: { label: "PT (Physical)", initial: "PT", bg: "bg-lime-500/20", text: "text-lime-400", border: "border-lime-500/40" },
  BCBA: { label: "BCBA (Behavior)", initial: "BC", bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/40" },
  Other: { label: "Other", initial: "O", bg: "bg-slate-500/20", text: "text-slate-400", border: "border-slate-500/40" },
};

export const SUGGESTED_EVAL_TAGS = [
  "🎯 Accurate Legal Citation",
  "💡 Great PWN Prompt",
  "🛡️ Strong Child Find Rationale",
  "⏱️ Missed 60-Day Timeline",
  "⚠️ Phrasing Too Formal",
  "⚠️ Phrasing Too Soft",
  "🚫 Hallucination / Noise",
  "📝 Follow-Up Action Needed",
];

export interface RunHistoryTabProps {
  activeSession: FirstMateSession;
  onLoadSession: (session: any) => void;
  onSnapshotCurrent: () => Promise<void>;
}
