import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  CalendarClock,
  UserCheck,
  Building,
  User,
  ExternalLink,
  Edit2,
  XCircle,
  HelpCircle,
  ShieldCheck,
  History,
} from "lucide-react";

interface ProposedMeetingDetailModalProps {
  proposedMeetingId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ProposedMeetingDetailModal({
  proposedMeetingId,
  isOpen,
  onClose,
  onSuccess,
}: ProposedMeetingDetailModalProps) {
  const utils = trpc.useUtils();

  // Load meeting details
  const { data: meeting, isLoading, refetch } = trpc.proposedMeetings.get.useQuery(
    { id: proposedMeetingId! },
    { enabled: Boolean(proposedMeetingId) && isOpen }
  );

  // Modals / sub-actions state
  const [confirmingSlot, setConfirmingSlot] = useState<any | null>(null);
  const [showAddDateModal, setShowAddDateModal] = useState<boolean>(false);
  const [showReleaseAllModal, setShowReleaseAllModal] = useState<boolean>(false);
  const [editingSlot, setEditingSlot] = useState<any | null>(null);

  // New slot form state
  const [newSlotDate, setNewSlotDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [newSlotTime, setNewSlotTime] = useState<string>("10:00");
  const [newSlotDuration, setNewSlotDuration] = useState<number>(60);
  const [newSlotNotes, setNewSlotNotes] = useState<string>("");

  // Edit slot form state
  const [editSlotDate, setEditSlotDate] = useState<string>("");
  const [editSlotTime, setEditSlotTime] = useState<string>("");
  const [editSlotDuration, setEditSlotDuration] = useState<number>(60);

  // Release all form state
  const [releaseAllReason, setReleaseAllReason] = useState<string>("None of the proposed dates work");
  const [releaseAllStatus, setReleaseAllStatus] = useState<"AWAITING_NEW_DATES" | "POSTPONED" | "CANCELED" | "CLOSED">("AWAITING_NEW_DATES");

  // Mutations
  const confirmMutation = trpc.proposedMeetings.confirm.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Meeting Confirmed! ${data.releasedCount} other proposed hold(s) released automatically.`
      );
      utils.proposedMeetings.invalidate();
      utils.appointments.invalidate();
      setConfirmingSlot(null);
      refetch();
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(`Confirmation failed: ${err.message}`);
    },
  });

  const releaseSingleMutation = trpc.proposedMeetings.releaseCandidateSlot.useMutation({
    onSuccess: () => {
      toast.success("Proposed date released. Other candidate slots remain held.");
      utils.proposedMeetings.invalidate();
      utils.appointments.invalidate();
      refetch();
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(`Failed to release date: ${err.message}`);
    },
  });

  const releaseAllMutation = trpc.proposedMeetings.releaseAllHolds.useMutation({
    onSuccess: () => {
      toast.success("All candidate holds released. Calendar availability restored.");
      utils.proposedMeetings.invalidate();
      utils.appointments.invalidate();
      setShowReleaseAllModal(false);
      refetch();
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(`Failed to release holds: ${err.message}`);
    },
  });

  const addSlotMutation = trpc.proposedMeetings.addCandidateSlot.useMutation({
    onSuccess: () => {
      toast.success("New candidate date added and held on the calendar.");
      utils.proposedMeetings.invalidate();
      utils.appointments.invalidate();
      setShowAddDateModal(false);
      refetch();
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(`Failed to add candidate date: ${err.message}`);
    },
  });

  const updateSlotMutation = trpc.proposedMeetings.updateCandidateSlot.useMutation({
    onSuccess: () => {
      toast.success("Candidate slot time updated.");
      utils.proposedMeetings.invalidate();
      utils.appointments.invalidate();
      setEditingSlot(null);
      refetch();
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(`Failed to update candidate slot: ${err.message}`);
    },
  });

  const setPreferenceMutation = trpc.proposedMeetings.setPreference.useMutation({
    onSuccess: () => {
      toast.success("Parent preference recorded.");
      utils.proposedMeetings.invalidate();
      refetch();
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(`Failed to record preference: ${err.message}`);
    },
  });

  // Handle Confirm Execution
  const handleExecuteConfirmation = () => {
    if (!confirmingSlot || !meeting) return;
    confirmMutation.mutate({
      proposedMeetingId: meeting.id,
      candidateSlotId: confirmingSlot.id,
    });
  };

  // Open Edit Slot
  const handleOpenEditSlot = (slot: any) => {
    setEditingSlot(slot);
    const d = new Date(slot.startTime);
    setEditSlotDate(d.toISOString().slice(0, 10));
    setEditSlotTime(d.toTimeString().slice(0, 5));
    setEditSlotDuration(slot.durationMinutes || 60);
  };

  // Save Edit Slot
  const handleSaveEditSlot = () => {
    if (!editingSlot) return;
    const start = new Date(`${editSlotDate}T${editSlotTime}:00`);
    const end = new Date(start.getTime() + editSlotDuration * 60000);
    updateSlotMutation.mutate({
      slotId: editingSlot.id,
      startTime: start,
      endTime: end,
      durationMinutes: editSlotDuration,
    });
  };

  // Save Add Slot
  const handleSaveAddSlot = () => {
    if (!meeting) return;
    const start = new Date(`${newSlotDate}T${newSlotTime}:00`);
    const end = new Date(start.getTime() + newSlotDuration * 60000);
    addSlotMutation.mutate({
      proposedMeetingId: meeting.id,
      slot: {
        startTime: start,
        endTime: end,
        durationMinutes: newSlotDuration,
        notes: newSlotNotes || undefined,
      },
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] shadow-[0_16px_40px_rgba(0,0,0,0.95)] p-0 rounded-2xl">
          {isLoading || !meeting ? (
            <div className="p-8 text-center space-y-3">
              <div className="h-8 w-48 bg-[#102B4E]/60 rounded mx-auto animate-pulse" />
              <div className="h-4 w-72 bg-[#102B4E]/40 rounded mx-auto animate-pulse" />
            </div>
          ) : (
            <div>
              {/* Header */}
              <div className="p-6 border-b border-[#3A2C18]/80 bg-gradient-to-r from-[#07162B] via-[#091E38] to-[#07162B] rounded-t-2xl">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono font-bold tracking-widest text-[#C5A059] uppercase">
                    PROPOSED MEETING #{meeting.id} · PG-007
                  </span>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`font-mono text-xs font-bold px-2.5 py-0.5 uppercase ${
                        meeting.status === "CONFIRMED"
                          ? "bg-emerald-950/80 text-emerald-300 border-emerald-600"
                          : meeting.status === "PARENT_SELECTED"
                          ? "bg-purple-950/80 text-purple-300 border-purple-600"
                          : meeting.status === "AWAITING_NEW_DATES"
                          ? "bg-amber-950/80 text-amber-300 border-amber-600"
                          : "bg-blue-950/80 text-[#FFE394] border-[#C5A059]/60"
                      }`}
                    >
                      {meeting.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>

                <DialogTitle className="text-2xl font-serif font-bold text-[#FFF4D4] tracking-tight">
                  {meeting.studentName}
                </DialogTitle>
                <div className="text-sm font-medium text-[#FFE394] mt-0.5">
                  {meeting.meetingType}
                </div>

                {/* Meta details strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-[#3A2C18]/60 text-xs">
                  <div>
                    <span className="text-[10px] text-[#A69371] uppercase font-mono block">WAITING ON</span>
                    <span className="font-semibold text-[#FFF4D4]">{meeting.waitingOn}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#A69371] uppercase font-mono block">ADVOCATE</span>
                    <span className="font-semibold text-[#FFF4D4]">{meeting.assignedAdvocateName?.split(" ")[0] || "Byron"}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#A69371] uppercase font-mono block">FOLLOW UP BY</span>
                    <span className="font-semibold text-[#FFF4D4]">{meeting.followUpBy || "Not set"}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#A69371] uppercase font-mono block">OPTIONS</span>
                    <span className="font-semibold text-[#FFE394]">
                      {meeting.candidateSlots.filter((s: any) => s.status !== "RELEASED").length} active / {meeting.candidateSlots.length} total
                    </span>
                  </div>
                </div>
              </div>

              {/* Parent Selected Banner if applicable */}
              {(meeting.status === "PARENT_SELECTED" || meeting.parentPreferredSlotId) && (
                <div className="mx-6 mt-4 p-3.5 rounded-xl bg-purple-950/40 border border-purple-700/60 flex items-start gap-3">
                  <div className="h-7 w-7 rounded-lg bg-purple-900 border border-purple-500/50 flex items-center justify-center text-purple-300 shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-xs text-purple-200">
                      PARENT HAS SELECTED A PREFERRED DATE
                    </div>
                    <p className="text-[11px] text-purple-300/80 mt-0.5">
                      Waiting on school to confirm parent's preference. Sibling holds remain protected until officially confirmed.
                    </p>
                  </div>
                </div>
              )}

              {/* Candidate Slots Section */}
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-base text-[#FFF4D4]">
                      CANDIDATE DATES & CALENDAR HOLDS
                    </span>
                    <Badge variant="outline" className="border-[#3A2C18] bg-[#020A17] text-[#DFBE77] text-[10px] font-mono">
                      {meeting.candidateSlots.length} {meeting.candidateSlots.length === 1 ? "SLOT" : "SLOTS"}
                    </Badge>
                  </div>

                  {meeting.status !== "CONFIRMED" && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setShowAddDateModal(true)}
                      className="h-8 px-3 rounded-lg bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs hover:brightness-110 cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>ADD PROPOSED DATE</span>
                    </Button>
                  )}
                </div>

                {/* Candidate Slots List */}
                <div className="space-y-3">
                  {meeting.candidateSlots.map((slot: any, idx: number) => {
                    const start = new Date(slot.startTime);
                    const isConfirmed = slot.status === "CONFIRMED";
                    const isReleased = slot.status === "RELEASED";
                    const isParentSelected = slot.status === "PARENT_SELECTED" || meeting.parentPreferredSlotId === slot.id;
                    const isHeld = slot.status === "HELD";

                    const dateStr = start.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                    const timeStr = start.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={slot.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isConfirmed
                            ? "bg-emerald-950/40 border-emerald-600/80 shadow-[0_4px_16px_rgba(16,185,129,0.15)]"
                            : isReleased
                            ? "bg-[#020A17]/40 border-[#3A2C18]/40 opacity-60"
                            : isParentSelected
                            ? "bg-purple-950/30 border-purple-600/70"
                            : "bg-[#020A17]/90 border-[#3A2C18] hover:border-[#C5A059]/60"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Left: Slot Order, Date, Time */}
                          <div className="flex items-start gap-3">
                            <div
                              className={`h-9 w-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 border ${
                                isConfirmed
                                  ? "bg-emerald-900 border-emerald-500 text-emerald-200"
                                  : isReleased
                                  ? "bg-stone-900 border-stone-800 text-stone-500"
                                  : isParentSelected
                                  ? "bg-purple-900 border-purple-500 text-purple-200"
                                  : "bg-[#102B4E] border-[#3A2C18] text-[#FFE394]"
                              }`}
                            >
                              {String(idx + 1).padStart(2, "0")}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-serif font-bold text-sm text-[#FFF4D4]">
                                  {dateStr}
                                </span>
                                <span className="text-xs text-[#FFE394] font-mono font-bold">
                                  {timeStr}
                                </span>
                                <span className="text-xs text-[#A69371]">
                                  ({slot.durationMinutes || 60}m)
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                {/* Sibling label */}
                                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#05142B] border border-[#3A2C18] text-[#C6B697]">
                                  {slot.slotOrder || idx + 1} OF {meeting.candidateSlots.length} POSSIBLE DATES
                                </span>

                                {/* Status badge */}
                                <span
                                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                                    isConfirmed
                                      ? "bg-emerald-900/60 text-emerald-300 border border-emerald-700"
                                      : isReleased
                                      ? "bg-stone-900 text-stone-400 border border-stone-800"
                                      : isParentSelected
                                      ? "bg-purple-900/60 text-purple-300 border border-purple-700"
                                      : "bg-amber-950/60 text-amber-300 border border-amber-800"
                                  }`}
                                >
                                  {slot.status}
                                </span>

                                {isReleased && slot.releasedReason && (
                                  <span className="text-[11px] text-stone-400 italic">
                                    — {slot.releasedReason}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex flex-wrap items-center gap-2">
                            {/* CONFIRM THIS DATE */}
                            {!isConfirmed && !isReleased && meeting.status !== "CONFIRMED" && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => setConfirmingSlot(slot)}
                                className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>CONFIRM THIS DATE</span>
                              </Button>
                            )}

                            {/* Set parent preference if in that process */}
                            {!isConfirmed && !isReleased && meeting.finalDateProcess === "PARENT_PREFERENCE_THEN_WAYPOINT" && !isParentSelected && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setPreferenceMutation.mutate({
                                    proposedMeetingId: meeting.id,
                                    candidateSlotId: slot.id,
                                  })
                                }
                                className="h-8 px-2.5 rounded-lg border-purple-800/80 bg-purple-950/40 text-purple-300 hover:bg-purple-900 text-xs cursor-pointer"
                              >
                                Parent Prefers
                              </Button>
                            )}

                            {/* Edit Time */}
                            {!isConfirmed && !isReleased && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditSlot(slot)}
                                className="h-8 w-8 rounded-lg border border-[#3A2C18] bg-[#05142B] hover:bg-[#102B4E] text-[#C6B697] hover:text-[#FFF4D4] flex items-center justify-center transition-colors cursor-pointer"
                                title="Edit slot time"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* RELEASE THIS DATE */}
                            {!isConfirmed && !isReleased && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const reason = prompt("Reason for releasing this candidate date (optional):");
                                  releaseSingleMutation.mutate({
                                    slotId: slot.id,
                                    reason: reason || undefined,
                                  });
                                }}
                                className="h-8 px-2.5 rounded-lg border-[#3A2C18] bg-[#020A17] text-[#A69371] hover:text-rose-400 hover:border-rose-900 text-xs cursor-pointer"
                              >
                                Release Date
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Additional Meeting Info */}
                {(meeting.schoolDistrict || meeting.virtualMeetingLink || meeting.location || meeting.notes || meeting.internalNotes) && (
                  <div className="p-4 rounded-xl border border-[#3A2C18] bg-[#020A17]/60 space-y-2 text-xs">
                    <span className="font-mono text-[10px] text-[#A69371] uppercase tracking-wider block">
                      ADDITIONAL DETAILS & LOGISTICS
                    </span>
                    {meeting.schoolDistrict && (
                      <div className="flex items-center gap-2 text-[#D8C7A5]">
                        <Building className="w-3.5 h-3.5 text-[#C5A059]" />
                        <span>District: <strong className="text-[#FFF4D4]">{meeting.schoolDistrict}</strong></span>
                      </div>
                    )}
                    {meeting.virtualMeetingLink && (
                      <div className="flex items-center gap-2 text-[#D8C7A5]">
                        <ExternalLink className="w-3.5 h-3.5 text-[#C5A059]" />
                        <span>Meeting Link: <a href={meeting.virtualMeetingLink} target="_blank" rel="noreferrer" className="text-[#FFE394] underline">{meeting.virtualMeetingLink}</a></span>
                      </div>
                    )}
                    {meeting.notes && (
                      <div className="text-[#C6B697] pt-1">
                        <strong className="text-[#FFF4D4]">Client Notes:</strong> {meeting.notes}
                      </div>
                    )}
                    {meeting.internalNotes && (
                      <div className="text-[#C6B697]">
                        <strong className="text-[#FFE394]">Internal Staff Notes:</strong> {meeting.internalNotes}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <DialogFooter className="p-6 border-t border-[#3A2C18]/80 bg-[#020A17]/90 rounded-b-2xl flex items-center justify-between sm:justify-between gap-3">
                <div>
                  {meeting.status !== "CONFIRMED" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowReleaseAllModal(true)}
                      className="border-rose-900/60 bg-rose-950/20 text-rose-300 hover:bg-rose-950/60 hover:border-rose-600 text-xs h-9 cursor-pointer"
                    >
                      Release All Holds
                    </Button>
                  )}
                </div>

                <Button
                  type="button"
                  onClick={onClose}
                  className="border border-[#3A2C18] bg-[#05142B] text-[#D8C7A5] hover:bg-[#102B4E] hover:text-[#FFF4D4] text-xs h-9 px-4 cursor-pointer"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION PROMPT MODAL (Non-negotiable Atomic Workflow) */}
      {confirmingSlot && (
        <Dialog open={Boolean(confirmingSlot)} onOpenChange={() => setConfirmingSlot(null)}>
          <DialogContent className="max-w-md bg-[#05142B] border border-[#C5A059] text-[#FFF4D4] p-6 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.95)]">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-950 border border-emerald-500/80 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <DialogTitle className="text-base font-serif font-bold text-[#FFF4D4]">
                    Confirm Meeting Date?
                  </DialogTitle>
                  <p className="text-xs text-[#A69371]">
                    Atomic confirmation & automatic sibling hold release
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#020A17] border border-[#3A2C18] space-y-1.5">
                <div className="text-xs text-[#C6B697]">
                  Selected Winning Date:
                </div>
                <div className="font-serif font-bold text-[#FFE394] text-base">
                  {new Date(confirmingSlot.startTime).toLocaleString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
                <div className="text-xs text-[#C6B697]">
                  Duration: {confirmingSlot.durationMinutes || 60} minutes
                </div>
              </div>

              {/* System cleanup notice */}
              <div className="p-3 rounded-lg bg-[#081B33] border border-[#102B4E] text-xs text-[#D8C7A5] space-y-1">
                <span className="font-semibold text-[#FFF4D4]">The system will automatically:</span>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-[#C6B697]">
                  <li>Create the official confirmed appointment.</li>
                  <li>Release all other candidate holds for this meeting.</li>
                  <li>Restore those released times to scheduling availability.</li>
                  <li>Log confirmation to student's activity timeline.</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmingSlot(null)}
                  className="border-[#3A2C18] bg-[#020A17] text-[#C6B697] hover:text-[#FFF4D4] text-xs h-9 cursor-pointer"
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  disabled={confirmMutation.isPending}
                  onClick={handleExecuteConfirmation}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-4 shadow-lg cursor-pointer"
                >
                  {confirmMutation.isPending ? "Confirming..." : "Confirm Meeting"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ADD PROPOSED DATE MODAL */}
      {showAddDateModal && (
        <Dialog open={showAddDateModal} onOpenChange={() => setShowAddDateModal(false)}>
          <DialogContent className="max-w-md bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-serif font-bold text-[#FFF4D4]">
                Add Proposed Date
              </DialogTitle>
              <p className="text-xs text-[#C6B697]">
                Add an additional candidate date offered by the school or parent to this Proposed Meeting.
              </p>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <div>
                <Label className="text-xs text-[#C6B697]">Date</Label>
                <Input
                  type="date"
                  value={newSlotDate}
                  onChange={(e) => setNewSlotDate(e.target.value)}
                  className="mt-1 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-[#C6B697]">Start Time</Label>
                  <Input
                    type="time"
                    value={newSlotTime}
                    onChange={(e) => setNewSlotTime(e.target.value)}
                    className="mt-1 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-9"
                  />
                </div>

                <div>
                  <Label className="text-xs text-[#C6B697]">Duration</Label>
                  <Select
                    value={String(newSlotDuration)}
                    onValueChange={(v) => setNewSlotDuration(Number(v))}
                  >
                    <SelectTrigger className="mt-1 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                      <SelectItem value="30">30 mins</SelectItem>
                      <SelectItem value="45">45 mins</SelectItem>
                      <SelectItem value="60">60 mins (1 hr)</SelectItem>
                      <SelectItem value="90">90 mins (1.5 hrs)</SelectItem>
                      <SelectItem value="120">120 mins (2 hrs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs text-[#C6B697]">Notes (Optional)</Label>
                <Input
                  type="text"
                  placeholder="e.g. Sent via email by school psychologist"
                  value={newSlotNotes}
                  onChange={(e) => setNewSlotNotes(e.target.value)}
                  className="mt-1 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-8"
                />
              </div>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDateModal(false)}
                className="border-[#3A2C18] bg-[#020A17] text-[#C6B697] text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={addSlotMutation.isPending}
                onClick={handleSaveAddSlot}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-9 px-4"
              >
                {addSlotMutation.isPending ? "Adding..." : "Add & Hold Date"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* EDIT CANDIDATE SLOT TIME MODAL */}
      {editingSlot && (
        <Dialog open={Boolean(editingSlot)} onOpenChange={() => setEditingSlot(null)}>
          <DialogContent className="max-w-md bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-serif font-bold text-[#FFF4D4]">
                Edit Proposed Time
              </DialogTitle>
              <p className="text-xs text-[#C6B697]">
                Update this candidate slot time while maintaining all sibling hold connections.
              </p>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <div>
                <Label className="text-xs text-[#C6B697]">Date</Label>
                <Input
                  type="date"
                  value={editSlotDate}
                  onChange={(e) => setEditSlotDate(e.target.value)}
                  className="mt-1 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-[#C6B697]">Start Time</Label>
                  <Input
                    type="time"
                    value={editSlotTime}
                    onChange={(e) => setEditSlotTime(e.target.value)}
                    className="mt-1 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-9"
                  />
                </div>

                <div>
                  <Label className="text-xs text-[#C6B697]">Duration</Label>
                  <Select
                    value={String(editSlotDuration)}
                    onValueChange={(v) => setEditSlotDuration(Number(v))}
                  >
                    <SelectTrigger className="mt-1 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                      <SelectItem value="30">30 mins</SelectItem>
                      <SelectItem value="45">45 mins</SelectItem>
                      <SelectItem value="60">60 mins (1 hr)</SelectItem>
                      <SelectItem value="90">90 mins (1.5 hrs)</SelectItem>
                      <SelectItem value="120">120 mins (2 hrs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingSlot(null)}
                className="border-[#3A2C18] bg-[#020A17] text-[#C6B697] text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={updateSlotMutation.isPending}
                onClick={handleSaveEditSlot}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-9 px-4"
              >
                {updateSlotMutation.isPending ? "Saving..." : "Save Time"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* RELEASE ALL HOLDS MODAL */}
      {showReleaseAllModal && (
        <Dialog open={showReleaseAllModal} onOpenChange={() => setShowReleaseAllModal(false)}>
          <DialogContent className="max-w-md bg-[#05142B] border border-rose-900 text-[#FFF4D4] p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-serif font-bold text-[#FFF4D4]">
                Release All Holds
              </DialogTitle>
              <p className="text-xs text-[#C6B697]">
                Restore all candidate slots back to calendar availability. Sibling history will be preserved.
              </p>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <div>
                <Label className="text-xs text-[#C6B697]">Reason for Releasing Holds</Label>
                <Select value={releaseAllReason} onValueChange={setReleaseAllReason}>
                  <SelectTrigger className="mt-1 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                    <SelectItem value="None of the proposed dates work">None of the proposed dates work</SelectItem>
                    <SelectItem value="School withdrew the proposed dates">School withdrew the proposed dates</SelectItem>
                    <SelectItem value="Meeting postponed by district">Meeting postponed by district</SelectItem>
                    <SelectItem value="Meeting canceled by family">Meeting canceled by family</SelectItem>
                    <SelectItem value="Awaiting fresh date offerings from school">Awaiting fresh date offerings</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-[#C6B697]">Updated Proposed Meeting Status</Label>
                <Select value={releaseAllStatus} onValueChange={(v: any) => setReleaseAllStatus(v)}>
                  <SelectTrigger className="mt-1 bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4]">
                    <SelectItem value="AWAITING_NEW_DATES">AWAITING NEW DATES</SelectItem>
                    <SelectItem value="POSTPONED">POSTPONED</SelectItem>
                    <SelectItem value="CANCELED">CANCELED</SelectItem>
                    <SelectItem value="CLOSED">CLOSED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowReleaseAllModal(false)}
                className="border-[#3A2C18] bg-[#020A17] text-[#C6B697] text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={releaseAllMutation.isPending}
                onClick={() =>
                  releaseAllMutation.mutate({
                    proposedMeetingId: meeting!.id,
                    reason: releaseAllReason,
                    newStatus: releaseAllStatus,
                  })
                }
                className="bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs h-9 px-4"
              >
                {releaseAllMutation.isPending ? "Releasing..." : "Release All Holds"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
