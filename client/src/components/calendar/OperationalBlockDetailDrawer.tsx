import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calendar,
  Clock,
  User,
  Building2,
  AlertTriangle,
  Trash2,
  Edit2,
  CheckCircle2,
  Info,
  ShieldAlert,
  Repeat,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  CALENDAR_PATTERNS,
  detectItemPatternKey,
  PatternPreviewBlock,
} from "./CalendarPatternStyles";
import type { OperationalBlock } from "../../../../drizzle/schema";

interface OperationalBlockDetailDrawerProps {
  block: OperationalBlock | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  staffList?: { id: string; name: string; status: string }[];
}

export default function OperationalBlockDetailDrawer({
  block,
  isOpen,
  onClose,
  onSuccess,
  staffList = [],
}: OperationalBlockDetailDrawerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editSchedulingEffect, setEditSchedulingEffect] = useState<"HARD_BLOCK" | "SOFT_BLOCK" | "INFORMATIONAL">("HARD_BLOCK");
  const [editScope, setEditScope] = useState<"ENTIRE_COMPANY" | "TEAM" | "SELECTED_EMPLOYEES" | "ONE_EMPLOYEE">("ONE_EMPLOYEE");
  const [editTargetStaff, setEditTargetStaff] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const utils = trpc.useUtils();

  const updateMutation = trpc.operationalBlocks.update.useMutation({
    onSuccess: () => {
      toast.success("Operational block updated successfully");
      setIsEditing(false);
      utils.operationalBlocks.list.invalidate();
      onSuccess();
    },
    onError: (err) => {
      toast.error("Failed to update: " + err.message);
    },
  });

  const deleteMutation = trpc.operationalBlocks.delete.useMutation({
    onSuccess: () => {
      toast.success("Operational block removed from calendar");
      onClose();
      utils.operationalBlocks.list.invalidate();
      onSuccess();
    },
    onError: (err) => {
      toast.error("Failed to delete: " + err.message);
    },
  });

  // Query conflicts for this block
  const conflictsQuery = trpc.operationalBlocks.checkConflicts.useQuery(
    {
      startTime: block ? new Date(block.startTime) : new Date(),
      endTime: block ? new Date(block.endTime) : new Date(),
      scope: block?.scope,
      targetStaffNames: block?.targetStaffNames || undefined,
    },
    {
      enabled: isOpen && !!block,
      refetchOnWindowFocus: false,
    }
  );

  if (!block) return null;

  const patternKey = detectItemPatternKey({
    blockType: block.blockType,
    meetingType: block.blockType,
    title: block.title,
    isClosure: block.scope === "ENTIRE_COMPANY" || block.blockType.toLowerCase().includes("closed"),
  });
  const patternDef = CALENDAR_PATTERNS[patternKey];

  const handleStartEdit = () => {
    setEditTitle(block.title);
    setEditSchedulingEffect(block.schedulingEffect as any);
    setEditScope(block.scope as any);
    setEditTargetStaff(block.targetStaffNames || "");
    setEditReason(block.reason || "");
    setEditNotes(block.notes || "");
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!editTitle.trim()) {
      toast.error("Title cannot be empty");
      return;
    }
    updateMutation.mutate({
      id: block.id,
      title: editTitle,
      schedulingEffect: editSchedulingEffect,
      scope: editScope,
      targetStaffNames: editScope === "ENTIRE_COMPANY" ? "All Advocates & Staff" : editTargetStaff,
      reason: editReason,
      notes: editNotes,
    });
  };

  const handleChangeEffect = (newEffect: "HARD_BLOCK" | "SOFT_BLOCK" | "INFORMATIONAL") => {
    updateMutation.mutate({
      id: block.id,
      schedulingEffect: newEffect,
    });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to remove this availability block? Time will become schedulable again.")) {
      deleteMutation.mutate({ id: block.id });
    }
  };

  const startDate = new Date(block.startTime);
  const endDate = new Date(block.endTime);
  const isMultiDay = startDate.toDateString() !== endDate.toDateString();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg bg-[#05142B] border-l border-[#3A2C18] text-[#FFF4D4] p-0 flex flex-col shadow-[0_16px_50px_rgba(0,0,0,0.95)] overflow-hidden"
      >
        {/* Top Header Card */}
        <div
          style={{ background: patternDef.inlineBackground }}
          className="p-6 border-b border-[#3A2C18] relative overflow-hidden"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#020A17]/80 text-[#FFE394] border border-[#3A2C18]">
                  {patternDef.label}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-[#C6B697]">
                  {block.categoryFamily === "INFORMATIONAL_EVENT" ? "INFORMATIONAL EVENT" : "OPERATIONAL BLOCK"}
                </span>
              </div>
              <SheetTitle className="text-xl font-serif font-bold text-[#FFF4D4] leading-tight pt-1">
                {block.title}
              </SheetTitle>
              <SheetDescription className="text-xs text-[#C6B697]">
                {block.blockType.toUpperCase()} · Applied to {block.scope === "ENTIRE_COMPANY" ? "Entire Company" : block.targetStaffNames || "Assigned Staff"}
              </SheetDescription>
            </div>

            <div className="shrink-0 w-28 text-right">
              <PatternPreviewBlock patternKey={patternKey} size="sm" />
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Scheduling Effect Badge / Banner */}
          <div className="rounded-xl border border-[#3A2C18] bg-[#020A17]/80 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-[#A69371] uppercase tracking-wider">
                Current Scheduling Effect
              </span>
              <Badge
                variant="outline"
                className={`font-mono text-[11px] font-bold uppercase px-2.5 py-0.5 ${
                  block.schedulingEffect === "HARD_BLOCK"
                    ? "bg-rose-950/80 text-rose-300 border-rose-600/70"
                    : block.schedulingEffect === "SOFT_BLOCK"
                    ? "bg-amber-950/80 text-amber-300 border-amber-600/70"
                    : "bg-blue-950/80 text-blue-300 border-blue-600/70"
                }`}
              >
                {block.schedulingEffect === "HARD_BLOCK"
                  ? "🛡️ Hard Block"
                  : block.schedulingEffect === "SOFT_BLOCK"
                  ? "⚠️ Soft Block"
                  : "ℹ️ Informational"}
              </Badge>
            </div>
            <p className="text-xs text-[#C6B697]">
              {block.schedulingEffect === "HARD_BLOCK"
                ? "No client appointments may normally be scheduled. Strict calendar blockage enforced across PG-007 and client booking."
                : block.schedulingEffect === "SOFT_BLOCK"
                ? "Warns scheduler before booking. Authorized staff may override with an audit log reason."
                : "Visible on staff calendar for awareness, but does NOT prevent client appointments from being booked."}
            </p>

            {/* Quick Toggle Effect Buttons */}
            <div className="pt-2 flex items-center gap-2">
              <span className="text-[11px] text-[#A69371]">Change effect:</span>
              <button
                type="button"
                onClick={() => handleChangeEffect("HARD_BLOCK")}
                className={`text-[10px] font-mono px-2 py-1 rounded border transition-colors cursor-pointer ${
                  block.schedulingEffect === "HARD_BLOCK"
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold"
                    : "bg-[#07162B] text-[#C6B697] border-[#3A2C18] hover:text-[#FFF4D4]"
                }`}
              >
                Hard
              </button>
              <button
                type="button"
                onClick={() => handleChangeEffect("SOFT_BLOCK")}
                className={`text-[10px] font-mono px-2 py-1 rounded border transition-colors cursor-pointer ${
                  block.schedulingEffect === "SOFT_BLOCK"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold"
                    : "bg-[#07162B] text-[#C6B697] border-[#3A2C18] hover:text-[#FFF4D4]"
                }`}
              >
                Soft
              </button>
              <button
                type="button"
                onClick={() => handleChangeEffect("INFORMATIONAL")}
                className={`text-[10px] font-mono px-2 py-1 rounded border transition-colors cursor-pointer ${
                  block.schedulingEffect === "INFORMATIONAL"
                    ? "bg-blue-500/20 text-blue-300 border-blue-500/50 font-bold"
                    : "bg-[#07162B] text-[#C6B697] border-[#3A2C18] hover:text-[#FFF4D4]"
                }`}
              >
                Info Only
              </button>
            </div>
          </div>

          {/* Conflict Warnings (if existing appointments or candidate holds overlap) */}
          {conflictsQuery.data && (
            (conflictsQuery.data.overlappingAppointments.length > 0 ||
              conflictsQuery.data.overlappingCandidateHolds.length > 0) && (
              <div className="rounded-xl border border-amber-600/70 bg-amber-950/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Existing Calendar Conflict Detected</span>
                </div>

                {/* Overlapping Confirmed Appointments */}
                {conflictsQuery.data.overlappingAppointments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-amber-200">
                      This operational block overlaps <strong>{conflictsQuery.data.overlappingAppointments.length} confirmed client appointment(s)</strong>:
                    </p>
                    <div className="space-y-1.5">
                      {conflictsQuery.data.overlappingAppointments.map((apt) => (
                        <div
                          key={apt.id}
                          className="p-2 rounded bg-black/40 border border-amber-600/40 text-xs text-[#FFF4D4] flex items-center justify-between"
                        >
                          <div>
                            <span className="font-semibold">{apt.title}</span>
                            <span className="text-[#A69371] ml-1.5">({apt.studentName || apt.parentName || "Client"})</span>
                          </div>
                          <span className="font-mono text-[11px] text-[#FFE394]">
                            {new Date(apt.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} –{" "}
                            {new Date(apt.endTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-amber-400 italic">
                      Note: Client appointments are never silently cancelled or deleted.
                    </p>
                  </div>
                )}

                {/* Overlapping Candidate Holds */}
                {conflictsQuery.data.overlappingCandidateHolds.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-amber-600/30">
                    <p className="text-xs text-purple-200">
                      Also overlaps <strong>{conflictsQuery.data.overlappingCandidateHolds.length} candidate meeting hold(s)</strong>:
                    </p>
                    <div className="space-y-1.5">
                      {conflictsQuery.data.overlappingCandidateHolds.map((h) => (
                        <div
                          key={h.id}
                          className="p-2 rounded bg-black/40 border border-purple-500/40 text-xs text-purple-200 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-semibold">{h.studentName}</span>
                            <span className="text-[#A69371] ml-1.5">· Tentative ({h.slotOrder} of {h.siblingCount} slots)</span>
                          </div>
                          <span className="font-mono text-[11px] text-purple-300">
                            {new Date(h.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {/* Date & Time Information */}
          <div className="rounded-xl border border-[#3A2C18] bg-[#020A17]/60 p-4 space-y-3">
            <span className="text-xs font-mono font-semibold text-[#A69371] uppercase tracking-wider block">
              Time & Duration
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                <div>
                  <div className="text-[#A69371]">Dates:</div>
                  <div className="font-medium text-[#FFF4D4] mt-0.5">
                    {startDate.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {isMultiDay && (
                      <>
                        {" "}
                        →{" "}
                        {endDate.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </>
                    )}
                  </div>
                  {block.isAllDay && (
                    <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-[#102B4E] text-[#FFE394] border border-[#3A2C18]">
                      ALL-DAY CLOSURE
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-[#C5A059] shrink-0 mt-0.5" />
                <div>
                  <div className="text-[#A69371]">Daily Window:</div>
                  <div className="font-medium font-mono text-[#FFE394] mt-0.5">
                    {block.isAllDay
                      ? "Full Day (All Hours)"
                      : `${startDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} – ${endDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}
                  </div>
                </div>
              </div>
            </div>

            {/* Recurrence rule */}
            {block.recurrenceRule && block.recurrenceRule !== "NONE" && (
              <div className="pt-2 border-t border-[#3A2C18]/60 flex items-center gap-2 text-xs text-[#FFE394]">
                <Repeat className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Repeats: <strong>{block.recurrenceRule}</strong></span>
                {block.recurrenceDays && <span>({block.recurrenceDays})</span>}
                {block.recurrenceEndType === "NO_END_DATE" && <span className="text-[#A69371]">(No end date)</span>}
              </div>
            )}
          </div>

          {/* Scope and Target Staff */}
          <div className="rounded-xl border border-[#3A2C18] bg-[#020A17]/60 p-4 space-y-2">
            <span className="text-xs font-mono font-semibold text-[#A69371] uppercase tracking-wider block">
              Applied Scope
            </span>
            <div className="flex items-center gap-3 text-xs">
              {block.scope === "ENTIRE_COMPANY" ? (
                <>
                  <Building2 className="w-4 h-4 text-[#C5A059]" />
                  <span className="font-semibold text-[#FFE394]">Entire Waypoint Organization</span>
                  <span className="text-[#A69371]">(All staff & advocates unavailable)</span>
                </>
              ) : (
                <>
                  <User className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold text-[#FFF4D4]">
                    {block.targetStaffNames || "Individual Staff Member"}
                  </span>
                  <span className="text-[#A69371]">(Other advocates remain available)</span>
                </>
              )}
            </div>
          </div>

          {/* Reason / Notes */}
          {(block.reason || block.notes) && (
            <div className="rounded-xl border border-[#3A2C18] bg-[#020A17]/60 p-4 space-y-2">
              <span className="text-xs font-mono font-semibold text-[#A69371] uppercase tracking-wider block">
                Details & Notes
              </span>
              {block.reason && <p className="text-xs text-[#FFF4D4]">{block.reason}</p>}
              {block.notes && <p className="text-xs text-[#C6B697] italic">{block.notes}</p>}
            </div>
          )}

          {/* Meta & Audit */}
          <div className="text-[11px] text-[#A69371] space-y-1 pt-2">
            <div>Created by: <strong className="text-[#FFE394]">{block.createdByName || "Admin"}</strong></div>
            <div>Created on: {new Date(block.createdAt).toLocaleDateString()} at {new Date(block.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
          </div>

          {/* Inline Edit Form when active */}
          {isEditing && (
            <div className="rounded-xl border border-[#C5A059]/70 bg-[#07162B] p-4 space-y-4">
              <div className="text-xs font-mono font-bold text-[#FFE394] uppercase flex items-center gap-1.5">
                <Edit2 className="w-3.5 h-3.5" /> Edit Operational Block
              </div>

              <div>
                <Label className="text-xs text-[#C6B697]">Block Title</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mt-1 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-[#C6B697]">Scheduling Effect</Label>
                  <Select
                    value={editSchedulingEffect}
                    onValueChange={(v: any) => setEditSchedulingEffect(v)}
                  >
                    <SelectTrigger className="mt-1 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                      <SelectItem value="HARD_BLOCK">Hard Block</SelectItem>
                      <SelectItem value="SOFT_BLOCK">Soft Block</SelectItem>
                      <SelectItem value="INFORMATIONAL">Informational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-[#C6B697]">Scope</Label>
                  <Select
                    value={editScope}
                    onValueChange={(v: any) => setEditScope(v)}
                  >
                    <SelectTrigger className="mt-1 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                      <SelectItem value="ONE_EMPLOYEE">One Employee</SelectItem>
                      <SelectItem value="ENTIRE_COMPANY">Entire Company</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {editScope !== "ENTIRE_COMPANY" && (
                <div>
                  <Label className="text-xs text-[#C6B697]">Assigned Staff</Label>
                  <Select
                    value={editTargetStaff}
                    onValueChange={setEditTargetStaff}
                  >
                    <SelectTrigger className="mt-1 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                      {staffList.map((s) => (
                        <SelectItem key={s.id} value={s.name}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="text-xs text-[#C6B697]">Reason / Notes</Label>
                <Input
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="mt-1 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-9"
                  placeholder="Optional details..."
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={handleSaveEdit}
                  disabled={updateMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <SheetFooter className="p-4 border-t border-[#3A2C18] bg-[#020A17] flex sm:flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="border border-rose-600/60 bg-rose-950/60 hover:bg-rose-900 text-rose-200 text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove Block</span>
          </Button>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleStartEdit}
                className="border-[#3A2C18] bg-[#05142B] text-[#FFE394] hover:bg-[#07162B] text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-[#3A2C18] bg-[#05142B] text-[#C6B697] hover:bg-[#07162B] text-xs cursor-pointer"
            >
              Close
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
