import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  Mail,
  Users,
  History,
  X,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

interface LeadContextDrawersProps {
  workspace: any;
  openDrawer: "contacts" | "history" | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function LeadContextDrawers({
  workspace,
  openDrawer,
  onClose,
  onUpdated,
}: LeadContextDrawersProps) {
  const [quickNote, setQuickNote] = useState("");

  const logNoteMutation = trpc.leads.logCallToLead.useMutation({
    onSuccess: () => {
      setQuickNote("");
      toast.success("Note added to shared family history");
      onUpdated();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!openDrawer || !workspace) return null;

  const { lead, parentContact, students = [], journey, callLogs = [] } = workspace;

  return (
    <div
      data-testid={`lead-context-drawer-${openDrawer}`}
      className="rounded-xl border border-[#1E3358] bg-[#040D26] p-5 text-slate-100 shadow-[0_14px_36px_rgba(0,0,0,0.75)] space-y-4 animate-in fade-in duration-150"
    >
      <div className="flex items-center justify-between border-b border-[#162952] pb-3">
        <div className="flex items-center gap-2">
          {openDrawer === "contacts" ? (
            <>
              <Users className="w-4 h-4 text-[#FFE394]" />
              <h3 className="text-sm font-semibold text-white">
                Family & Student Contact Details
              </h3>
            </>
          ) : (
            <>
              <History className="w-4 h-4 text-[#FFE394]" />
              <h3 className="text-sm font-semibold text-white">
                Shared Communication & Attempt History
              </h3>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {openDrawer === "contacts" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Parent Contact Card */}
          <div className="rounded-lg border border-[#162952] bg-[#02091A] p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Parent / Guardian
              </span>
              <Badge className="bg-[#0D1E47] text-slate-200 border-[#1E3358] text-[10px]">
                {journey.preferredContactMethod || "Phone"} Preferred
              </Badge>
            </div>
            <p className="text-sm font-semibold text-white">
              {lead.parentName || "Unknown Parent"}
            </p>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>{lead.parentPhone || "No phone on file"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>{lead.parentEmail || parentContact?.email || "No email on file"}</span>
              </div>
              {journey.availability && (
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Availability: {journey.availability}</span>
                </div>
              )}
            </div>
          </div>

          {/* Students List */}
          <div className="rounded-lg border border-[#162952] bg-[#02091A] p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Students ({students.length})
              </span>
            </div>
            <div className="space-y-2">
              {students.map((stu: any, idx: number) => (
                <div
                  key={stu.id || idx}
                  className="flex items-center justify-between rounded-lg border border-[#162952]/80 bg-[#040D26] px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#FFE394]" />
                    <div>
                      <p className="text-xs font-semibold text-white">
                        {stu.firstName} {stu.lastName}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {[stu.gradeLevel, stu.schoolName, stu.iepOr504]
                          .filter(Boolean)
                          .join(" · ") || "Student Record"}
                      </p>
                    </div>
                  </div>
                  {stu.caseId && (
                    <span className="text-[10px] font-mono text-slate-400">
                      {stu.caseId}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Quick Note Input */}
          <div className="flex items-center gap-2">
            <Input
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              placeholder="Log a communication note or call update to shared family history..."
              className="h-9 bg-[#02091A] border-[#162952] text-white text-xs"
            />
            <Button
              type="button"
              size="sm"
              disabled={!quickNote.trim() || logNoteMutation.isPending}
              onClick={() =>
                logNoteMutation.mutate({
                  leadId: lead.id,
                  callNotes: quickNote.trim(),
                })
              }
              className="h-9 bg-[#102347] border border-[#D4AF37]/50 text-[#FFE394] hover:bg-[#162F5E] text-xs shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Log Note
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-72 overflow-y-auto pr-1">
            {/* Left: Journey & Call Attempts Timeline */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Journey & Call Attempts ({(journey.sharedHistory?.length || 0) + (journey.callAttempts?.length || 0)})
              </h4>

              {journey.callAttempts?.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {journey.callAttempts.map((att: any) => (
                    <div
                      key={att.id}
                      className="rounded-lg border border-[#162952] bg-[#02091A] p-2.5 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#FFE394]">
                          Call Attempt · {att.outcomeLabel}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(att.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {att.note && <p className="text-slate-300">{att.note}</p>}
                      {att.nextAction && (
                        <p className="text-[11px] text-slate-400">
                          Next: {att.nextAction}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {(journey.sharedHistory || []).map((item: any) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-[#162952] bg-[#02091A] p-2.5 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{item.title}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {item.summary && (
                    <p className="text-slate-300 text-[11px]">{item.summary}</p>
                  )}
                </div>
              ))}

              {(!journey.sharedHistory || journey.sharedHistory.length === 0) &&
                (!journey.callAttempts || journey.callAttempts.length === 0) && (
                  <p className="text-xs text-slate-400 italic">
                    No activity recorded yet.
                  </p>
                )}
            </div>

            {/* Right: Originating Call Center Logs & Automation Reconciliations */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Connected Call Logs & Automation Reconciliation
              </h4>

              {callLogs.map((cl: any) => (
                <div
                  key={cl.id}
                  className="rounded-lg border border-[#162952] bg-[#02091A] p-2.5 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">
                      {cl.direction === "outbound" ? "Outbound Call" : "Inbound Call"} ·{" "}
                      {cl.fromNumber || cl.callerPhone || ""}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {cl.createdAt ? new Date(cl.createdAt).toLocaleString() : ""}
                    </span>
                  </div>
                  {cl.callSummary && (
                    <p className="text-slate-300 text-[11px]">{cl.callSummary}</p>
                  )}
                  {cl.smsBody && (
                    <p className="text-slate-300 text-[11px]">{cl.smsBody}</p>
                  )}
                </div>
              ))}

              {(journey.reconciledEvents || []).map((rec: any, idx: number) => (
                <div
                  key={idx}
                  className="rounded-lg border border-[#1E3358] bg-[#06122E] p-2.5 text-xs space-y-1"
                >
                  <div className="flex items-center gap-1.5 text-emerald-300 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{rec.reason}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Reconciled at {new Date(rec.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}

              {callLogs.length === 0 &&
                (!journey.reconciledEvents || journey.reconciledEvents.length === 0) && (
                  <p className="text-xs text-slate-400 italic">
                    No call logs or automation reconciliations yet.
                  </p>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

