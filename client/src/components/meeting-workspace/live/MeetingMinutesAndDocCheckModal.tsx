import React, { useState } from "react";
import {
  FileCheck2,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Printer,
  X,
  History,
  ShieldCheck,
  Calendar,
  User,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  MeetingMinutesEntry,
  DocumentCheckItem,
  MeetingTimelineEvent,
  CloseoutChecks,
} from "../types";
import { formatMeetingTime } from "./approvalEngine";
import { toast } from "sonner";

interface MeetingMinutesAndDocCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  meetingType: string;
  meetingDate: string;
  checks: CloseoutChecks;
  onUpdateChecks: (updated: CloseoutChecks) => void;
}

export function MeetingMinutesAndDocCheckModal({
  isOpen,
  onClose,
  studentName,
  meetingType,
  meetingDate,
  checks,
  onUpdateChecks,
}: MeetingMinutesAndDocCheckModalProps) {
  const [activeTab, setActiveTab] = useState<"MINUTES" | "DOC_CHECK" | "TIMELINE">("MINUTES");

  const minutesEntries = checks.minutesEntries || [];
  const documentCheckItems = checks.documentCheckItems || [];
  const timelineEvents = checks.timelineEvents || [];

  // Document verification toggle
  const handleToggleVerify = (item: DocumentCheckItem) => {
    const updated = documentCheckItems.map((d) => {
      if (d.id === item.id) {
        const nextVerified = !d.verified;
        return {
          ...d,
          verified: nextVerified,
          verifiedAt: nextVerified ? formatMeetingTime() : undefined,
          verifiedBy: nextVerified ? "Advocate Lead" : undefined,
        };
      }
      return d;
    });

    onUpdateChecks({
      ...checks,
      documentCheckItems: updated,
    });

    toast.success(
      item.verified ? "Marked as pending verification" : "Verified in revised document!"
    );
  };

  const handleUpdateVerificationNotes = (id: string, notes: string) => {
    const updated = documentCheckItems.map((d) =>
      d.id === id ? { ...d, verificationNotes: notes } : d
    );
    onUpdateChecks({
      ...checks,
      documentCheckItems: updated,
    });
  };

  // Copy full minutes to clipboard
  const handleCopyMinutes = () => {
    const activeAgreements = minutesEntries.filter((m) => m.status === "APPROVED");
    const withdrawnAgreements = minutesEntries.filter((m) => m.status === "WITHDRAWN");

    let text = `WAYPOINT ADVOCATES — IEP MEETING MINUTES & AGREEMENT LOG\n`;
    text += `Student: ${studentName}\nMeeting: ${meetingType} (${meetingDate})\n`;
    text += `Exported: ${new Date().toLocaleDateString()} ${formatMeetingTime()}\n\n`;

    text += `═══ APPROVED TEAM AGREEMENTS (${activeAgreements.length}) ═══\n`;
    activeAgreements.forEach((m, idx) => {
      text += `${idx + 1}. [${m.approvedAt}] ${m.title}\n`;
      if (m.details) text += `   Details: ${m.details}\n`;
      if (m.responsiblePerson) text += `   Responsible: ${m.responsiblePerson}\n`;
      if (m.deadlineDate) text += `   Deadline: ${m.deadlineDate}\n`;
      if (m.notes) text += `   Conditions: ${m.notes}\n`;
      text += `\n`;
    });

    if (withdrawnAgreements.length > 0) {
      text += `═══ WITHDRAWN / MODIFIED ITEMS (${withdrawnAgreements.length}) ═══\n`;
      withdrawnAgreements.forEach((m, idx) => {
        text += `${idx + 1}. [Withdrawn] ${m.title}\n`;
      });
      text += `\n`;
    }

    navigator.clipboard.writeText(text);
    toast.success("Meeting Minutes copied to clipboard!");
  };

  const activeMinutes = minutesEntries.filter((m) => m.status === "APPROVED");
  const verifiedCount = documentCheckItems.filter(
    (d) => d.status === "ACTIVE_AGREEMENT" && d.verified
  ).length;
  const pendingCount = documentCheckItems.filter(
    (d) => d.status === "ACTIVE_AGREEMENT" && !d.verified
  ).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-[#000820] border-[#3A2C18] text-white p-0 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-[#3A2C18] bg-[#05142B]/90 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-serif font-black text-[#FFF4D4] tracking-wide">
                📋 Live Meeting Follow-Through Console
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#020A17] border border-[#3A2C18] text-[#DFBE77]">
                PG-043-FT
              </span>
            </div>
            <p className="text-xs text-[#C6B697] mt-0.5">
              {studentName} · {meetingType} ({meetingDate})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyMinutes}
              className="text-xs border-[#3A2C18] bg-[#020A17] text-[#DFBE77] hover:bg-[#07162B] cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 mr-1" />
              Copy Minutes
            </Button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-[#3A2C18] bg-[#020A17]/80">
          <button
            type="button"
            onClick={() => setActiveTab("MINUTES")}
            className={cn(
              "px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "MINUTES"
                ? "border-[#DFBE77] text-[#FFE394]"
                : "border-transparent text-[#A69371] hover:text-[#FFF4D4]"
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Meeting Minutes ({activeMinutes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("DOC_CHECK")}
            className={cn(
              "px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "DOC_CHECK"
                ? "border-[#DFBE77] text-[#FFE394]"
                : "border-transparent text-[#A69371] hover:text-[#FFF4D4]"
            )}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Document Check</span>
            {pendingCount > 0 && (
              <Badge className="text-[9.5px] px-1.5 py-0 bg-amber-500/20 text-amber-200 border border-amber-500/40">
                {pendingCount} Pending
              </Badge>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("TIMELINE")}
            className={cn(
              "px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "TIMELINE"
                ? "border-[#DFBE77] text-[#FFE394]"
                : "border-transparent text-[#A69371] hover:text-[#FFF4D4]"
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Meeting Timeline ({timelineEvents.length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 max-h-[65vh] overflow-y-auto space-y-4">
          {/* TAB 1: MEETING MINUTES */}
          {activeTab === "MINUTES" && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[#020A17] border border-[#3A2C18] text-xs text-[#C6B697] flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#FFE394]">Automatic Agreement Logging:</span>{" "}
                  Items marked "Approved" in the meeting target list or "Before We End" are recorded here instantly with timestamps.
                </div>
                <Badge className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono text-[10px]">
                  {activeMinutes.length} Active Agreements
                </Badge>
              </div>

              {minutesEntries.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-[#3A2C18]/60 text-center space-y-1 text-slate-400 text-xs">
                  <p className="font-bold text-[#FFF4D4]">No Approved Items Yet</p>
                  <p>Click "Approved" on any meeting target or Before We End item to automatically log agreements here.</p>
                </div>
              ) : (
                minutesEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "p-3.5 rounded-xl border space-y-2 transition-all text-xs",
                      entry.status === "APPROVED"
                        ? "bg-[#05142B]/90 border-emerald-500/40 shadow-sm"
                        : "bg-[#18080C]/40 border-rose-500/30 opacity-70"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "font-bold text-[13px]",
                              entry.status === "APPROVED" ? "text-[#FFF4D4]" : "line-through text-slate-400"
                            )}
                          >
                            {entry.title}
                          </span>
                          <Badge
                            className={cn(
                              "text-[9.5px] px-1.5 py-0 font-mono",
                              entry.status === "APPROVED"
                                ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                                : "bg-rose-950 text-rose-300 border-rose-500/40"
                            )}
                          >
                            {entry.status}
                          </Badge>
                        </div>
                        {entry.details && (
                          <p className="text-[#C6B697] text-[11.5px] leading-relaxed">
                            {entry.details}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-[#DFBE77] shrink-0">
                        <Clock className="w-3 h-3" />
                        <span>{entry.approvedAt}</span>
                      </div>
                    </div>

                    {/* Metadata tags */}
                    {(entry.responsiblePerson || entry.deadlineDate || entry.notes) && (
                      <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-[#3A2C18]/60 text-[11px] text-[#FFE394]">
                        {entry.deadlineDate && (
                          <span className="inline-flex items-center gap-1 bg-[#020A17] border border-[#3A2C18] px-2 py-0.5 rounded text-[#DFBE77]">
                            <Calendar className="w-3 h-3" />
                            <span>Deadline: {entry.deadlineDate}</span>
                          </span>
                        )}
                        {entry.responsiblePerson && (
                          <span className="inline-flex items-center gap-1 bg-[#020A17] border border-[#3A2C18] px-2 py-0.5 rounded text-blue-200">
                            <User className="w-3 h-3" />
                            <span>Lead: {entry.responsiblePerson}</span>
                          </span>
                        )}
                        {entry.notes && (
                          <span className="inline-flex items-center gap-1 bg-[#020A17] border border-[#3A2C18] px-2 py-0.5 rounded text-slate-300 italic">
                            <span>Note: "{entry.notes}"</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* History trail */}
                    {entry.history && entry.history.length > 1 && (
                      <div className="pt-1 border-t border-[#3A2C18]/40 space-y-0.5 text-[10px] text-slate-400">
                        {entry.history.map((h, i) => (
                          <div key={i} className="flex items-center gap-2 font-mono">
                            <span>• {h.timestamp}: {h.action}</span>
                            {h.note && <span className="italic">({h.note})</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: DOCUMENT CHECK (IEP REVISION AUDIT) */}
          {activeTab === "DOC_CHECK" && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[#020A17] border border-[#3A2C18] text-xs text-[#C6B697] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#FFE394]">
                    Post-Meeting Document Check
                  </span>
                  <div className="flex items-center gap-2 font-mono text-[10.5px]">
                    <span className="text-emerald-400">{verifiedCount} Verified</span>
                    <span>·</span>
                    <span className="text-amber-400">{pendingCount} Pending</span>
                  </div>
                </div>
                <p className="text-[11px] text-[#A69371]">
                  Team approval signifies agreement in the room. Use this checklist to audit the revised draft IEP when received from the district to ensure verbatim language and services are accurately represented.
                </p>
              </div>

              {documentCheckItems.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-[#3A2C18]/60 text-center text-slate-400 text-xs">
                  <p className="font-bold text-[#FFF4D4]">No Items In Document Check</p>
                  <p className="mt-1">Items approved during the meeting automatically populate here.</p>
                </div>
              ) : (
                documentCheckItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "p-3.5 rounded-xl border space-y-2 text-xs transition-all",
                      item.status === "WITHDRAWN"
                        ? "bg-[#18080C]/40 border-rose-500/20 opacity-60"
                        : item.verified
                        ? "bg-[#021815]/90 border-emerald-500/60 shadow-sm"
                        : "bg-[#05142B]/90 border-[#3A2C18]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 flex-1">
                        <button
                          type="button"
                          disabled={item.status === "WITHDRAWN"}
                          onClick={() => handleToggleVerify(item)}
                          className={cn(
                            "mt-0.5 w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors shrink-0",
                            item.verified
                              ? "bg-emerald-600 border-emerald-400 text-white"
                              : "bg-[#020A17] border-[#3A2C18] text-transparent hover:border-[#DFBE77]"
                          )}
                          title="Check when verified in revised IEP document"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>

                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "font-bold text-[13px]",
                                item.verified
                                  ? "text-emerald-200"
                                  : item.status === "WITHDRAWN"
                                  ? "line-through text-slate-400"
                                  : "text-[#FFF4D4]"
                              )}
                            >
                              {item.title}
                            </span>
                            {item.status === "WITHDRAWN" && (
                              <Badge className="text-[9.5px] bg-rose-950 text-rose-300 border-rose-500/40">
                                WITHDRAWN
                              </Badge>
                            )}
                          </div>
                          {item.expectedWordingOrDetails && (
                            <p className="text-[#C6B697] text-[11px] leading-relaxed">
                              <span className="text-[#FFE394] font-semibold">Expected wording/terms: </span>
                              {item.expectedWordingOrDetails}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right text-[10.5px] font-mono text-[#A69371] shrink-0">
                        {item.verified ? (
                          <span className="text-emerald-400 font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified ({item.verifiedAt})
                          </span>
                        ) : (
                          <span className="text-amber-400">Pending IEP Revision</span>
                        )}
                      </div>
                    </div>

                    {/* Verification notes input */}
                    {item.status !== "WITHDRAWN" && (
                      <div className="pt-1.5 border-t border-[#3A2C18]/40">
                        <Input
                          value={item.verificationNotes || ""}
                          onChange={(e) => handleUpdateVerificationNotes(item.id, e.target.value)}
                          placeholder="Verification notes (e.g. 'Found on Page 14 under Accommodations', 'Check exact minutes')..."
                          className="h-7 text-xs bg-[#000820] border-[#3A2C18] text-white"
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: TIMELINE */}
          {activeTab === "TIMELINE" && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[#020A17] border border-[#3A2C18] text-xs text-[#C6B697]">
                <span className="font-bold text-[#FFE394]">Meeting Chronology:</span> Important
                milestones, target approvals, and notes converted during this IEP session.
              </div>

              {timelineEvents.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-[#3A2C18]/60 text-center text-slate-400 text-xs">
                  <p className="font-bold text-[#FFF4D4]">No Events Recorded Yet</p>
                  <p className="mt-1">Events are logged automatically as targets are approved and notes are converted.</p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-3 border-l-2 border-[#3A2C18] ml-3">
                  {timelineEvents.map((evt) => (
                    <div key={evt.id} className="relative group">
                      <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-[#DFBE77] border-2 border-[#000820]" />
                      <div className="p-2.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-xs space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[#FFF4D4]">{evt.title}</span>
                          <span className="font-mono text-[10px] text-[#DFBE77]">{evt.timestamp}</span>
                        </div>
                        {evt.description && (
                          <p className="text-[11px] text-[#A69371]">{evt.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
