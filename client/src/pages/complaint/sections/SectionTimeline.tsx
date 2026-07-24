import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "../workspaceContext";
import { Field, GhostButton, GoldButton, SectionCard, StatusPill, inputCls, selectCls } from "@/components/complaint/atoms";
import { VoiceTextarea } from "@/components/complaint/VoiceTextarea";
import { isWithinLookback } from "@shared/complaintEngine";
import { CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type EventForm = {
  id?: number;
  title: string;
  dateCertainty: "exact" | "approximate" | "month_year" | "before" | "after" | "unknown";
  eventDate: string;
  details: string;
  peopleInvolved: string;
  schoolResponse: string;
  parentResponse: string;
};

const emptyForm: EventForm = { title: "", dateCertainty: "exact", eventDate: "", details: "", peopleInvolved: "", schoolResponse: "", parentResponse: "" };

export function SectionTimeline() {
  const { caseDbId } = useWorkspace();
  const utils = trpc.useUtils();
  const { data: events } = trpc.complaintEngine.listTimeline.useQuery({ caseId: caseDbId });
  const [form, setForm] = useState<EventForm | null>(null);

  const saveMut = trpc.complaintEngine.saveTimelineEvent.useMutation({
    onSuccess: () => { utils.complaintEngine.listTimeline.invalidate({ caseId: caseDbId }); utils.complaintEngine.readiness.invalidate({ caseId: caseDbId }); setForm(null); },
    onError: (e) => toast.error(e.message),
  });
  const delMut = trpc.complaintEngine.deleteTimelineEvent.useMutation({
    onSuccess: () => utils.complaintEngine.listTimeline.invalidate({ caseId: caseDbId }),
  });

  const set = (k: keyof EventForm) => (v: string) => setForm(f => (f ? { ...f, [k]: v } : f));

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Timeline</h2>
          <p className="mt-1 text-sm text-slate-400">The chronology of what happened. Events older than one year are flagged for the Georgia lookback rule.</p>
        </div>
        <GoldButton onClick={() => setForm(emptyForm)}><Plus className="h-4 w-4" /> Add Event</GoldButton>
      </div>

      {form && (
        <SectionCard title={form.id ? "Edit Event" : "New Event"}>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <Field label="What happened" required><input className={inputCls} value={form.title} onChange={e => set("title")(e.target.value)} placeholder="e.g., IEP meeting held without the parent" /></Field>
            </div>
            <Field label="Date certainty">
              <select className={selectCls} value={form.dateCertainty} onChange={e => set("dateCertainty")(e.target.value)}>
                <option value="exact">Exact date</option><option value="approximate">Approximate</option>
                <option value="month_year">Month/year only</option><option value="before">Before this date</option>
                <option value="after">After this date</option><option value="unknown">Unknown</option>
              </select>
            </Field>
            <Field label="Date"><input type="date" className={inputCls} value={form.eventDate} onChange={e => set("eventDate")(e.target.value)} /></Field>
            <div className="md:col-span-2">
              <Field label="People involved"><input className={inputCls} value={form.peopleInvolved} onChange={e => set("peopleInvolved")(e.target.value)} /></Field>
            </div>
            <div className="md:col-span-3">
              <Field label="Details"><VoiceTextarea rows={3} value={form.details} onChange={set("details")} /></Field>
            </div>
            <div className="md:col-span-3 grid gap-4 md:grid-cols-2">
              <Field label="How the school responded"><VoiceTextarea rows={2} value={form.schoolResponse} onChange={set("schoolResponse")} /></Field>
              <Field label="How the parent responded"><VoiceTextarea rows={2} value={form.parentResponse} onChange={set("parentResponse")} /></Field>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <GhostButton onClick={() => setForm(null)}>Cancel</GhostButton>
            <GoldButton
              disabled={!form.title.trim() || saveMut.isPending}
              onClick={() => saveMut.mutate({
                id: form.id, caseId: caseDbId, title: form.title, dateCertainty: form.dateCertainty,
                eventDate: form.eventDate || null, details: form.details || null,
                peopleInvolved: form.peopleInvolved || null, schoolResponse: form.schoolResponse || null,
                parentResponse: form.parentResponse || null,
              })}
            >Save Event</GoldButton>
          </div>
        </SectionCard>
      )}

      <div className="space-y-3">
        {events?.length === 0 && !form && (
          <SectionCard><p className="py-6 text-center text-sm text-slate-500">No events yet. Add the key dates: meetings, requests, refusals, missed services.</p></SectionCard>
        )}
        {events?.map(ev => {
          const inWindow = ev.eventDate ? isWithinLookback(ev.eventDate) : null;
          return (
            <div key={ev.id} className="flex gap-4 rounded-lg border border-[#22355499] bg-[#0B1F3A] p-4">
              <div className="w-28 shrink-0 text-sm text-slate-400">
                <CalendarClock className="mb-1 h-4 w-4 text-[#D9A441]" />
                {ev.eventDate ? new Date(ev.eventDate).toLocaleDateString() : "Date unknown"}
                {ev.dateCertainty !== "exact" && <p className="text-[10px] uppercase tracking-wide text-slate-500">{ev.dateCertainty.replace("_", "/")}</p>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-100">{ev.title}</p>
                  {inWindow === false && <StatusPill kind="error" label="Outside 1-year window" />}
                </div>
                {ev.details && <p className="mt-1 text-sm text-slate-400">{ev.details}</p>}
                {ev.schoolResponse && <p className="mt-1 text-xs text-slate-500">School response: {ev.schoolResponse}</p>}
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  className="rounded p-1.5 text-slate-400 hover:text-[#D9A441]"
                  onClick={() => setForm({
                    id: ev.id, title: ev.title, dateCertainty: ev.dateCertainty,
                    eventDate: ev.eventDate ? new Date(ev.eventDate).toISOString().slice(0, 10) : "",
                    details: ev.details ?? "", peopleInvolved: ev.peopleInvolved ?? "",
                    schoolResponse: ev.schoolResponse ?? "", parentResponse: ev.parentResponse ?? "",
                  })}
                ><Pencil className="h-4 w-4" /></button>
                <button className="rounded p-1.5 text-slate-400 hover:text-red-400" onClick={() => { if (confirm("Delete this event?")) delMut.mutate({ id: ev.id }); }}><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

