import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CalendarAppointment } from "./TodaysAppointmentsTable";
import { formatDualTimes } from "@shared/timezones";
import { User, AlertTriangle, CheckCircle2, ShieldAlert, ArrowRightLeft, Clock, Calendar } from "lucide-react";

interface ReassignAppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: CalendarAppointment | null;
  onSuccess?: () => void;
  isAdmin?: boolean;
}

export default function ReassignAppointmentModal({
  open,
  onOpenChange,
  appointment,
  onSuccess,
  isAdmin = true,
}: ReassignAppointmentModalProps) {
  const [selectedAdvocate, setSelectedAdvocate] = useState<string>("");
  const [reason, setReason] = useState<string>("Advocate unavailable");
  const [overrideWarningAccepted, setOverrideWarningAccepted] = useState(false);

  // Reset state whenever appointment changes
  useEffect(() => {
    setSelectedAdvocate("");
    setReason("Advocate unavailable");
    setOverrideWarningAccepted(false);
  }, [appointment?.id, open]);

  // Query staff availability check for the appointment's time window
  const startTime = appointment ? new Date(appointment.startTime) : new Date();
  const endTime = appointment ? new Date(appointment.endTime) : new Date();

  const availabilityQuery = trpc.appointments.checkAvailability.useQuery(
    {
      startTime,
      endTime,
      excludeAppointmentId: appointment?.id,
    },
    {
      enabled: open && !!appointment,
      refetchOnWindowFocus: false,
    }
  );

  const utils = trpc.useUtils();
  const reassignMutation = trpc.appointments.reassign.useMutation({
    onSuccess: (data) => {
      toast.success(`Appointment successfully reassigned to ${selectedAdvocate}`, {
        description: data.timelineRecorded
          ? "Logged to Case Activity Timeline with permanent audit trail."
          : "Updated appointment advocate.",
      });
      utils.appointments.list.invalidate();
      utils.appointments.getStaffRoster.invalidate();
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(`Reassignment failed: ${err.message}`);
    },
  });

  if (!appointment) return null;

  const currentAdvocate = appointment.assignedAdvocateName || "Byron Honea";
  const dual = formatDualTimes(
    appointment.startTime,
    appointment.endTime,
    appointment.clientTimeZone,
    appointment.originalTimeZone || "America/New_York"
  );

  const advocates = availabilityQuery.data?.advocates || [];
  const selectedCheck = advocates.find((a) => a.name === selectedAdvocate);
  const hasConflict = selectedCheck ? !selectedCheck.isAvailable : false;

  const handleConfirmReassign = () => {
    if (!selectedAdvocate) {
      toast.error("Please select a replacement advocate.");
      return;
    }

    if (hasConflict && !overrideWarningAccepted) {
      toast.error("Please acknowledge the conflict override warning before proceeding.");
      return;
    }

    reassignMutation.mutate({
      appointmentId: appointment.id,
      newAdvocateName: selectedAdvocate,
      reason: reason.trim() || "Advocate unavailable",
      adminOverride: hasConflict && overrideWarningAccepted,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[#000d2b] border border-blue-900/80 text-white shadow-2xl p-6">
        <DialogHeader className="pb-3 border-b border-blue-900/50">
          <div className="flex items-center gap-2 text-amber-400">
            <ArrowRightLeft className="w-5 h-5 text-amber-400" />
            <DialogTitle className="text-lg font-bold text-white tracking-tight">
              Reassign Appointment
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-300">
            Select a replacement advocate. Human confirmation is required before any schedule update.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Meeting Summary Box */}
          <div className="rounded-lg bg-[#000820] border border-blue-900/60 p-3 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white text-sm">{appointment.title}</span>
              <Badge
                variant="outline"
                className={
                  appointment.status === "Needs Coverage"
                    ? "bg-rose-950/80 text-rose-300 border-rose-600 font-bold"
                    : "bg-blue-950/60 text-cyan-300 border-blue-700/60"
                }
              >
                {appointment.status}
              </Badge>
            </div>
            <div className="text-slate-300">
              Student: <span className="font-semibold text-white">{appointment.studentName || appointment.parentName || "Unassigned"}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>
                {new Date(appointment.startTime).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span>·</span>
              <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-emerald-400 font-bold">
                {dual.waypointTime.timeRange} ET
              </span>
              {dual.clientTime.isDifferent && (
                <span className="text-rose-400">
                  ({dual.clientTime.timeRange} {dual.clientTime.tzAbbr})
                </span>
              )}
            </div>
          </div>

          {/* Current Advocate */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
            <span className="text-slate-400">Current Assigned Advocate:</span>
            <div className="flex items-center gap-1.5 font-bold text-white">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentAdvocate}</span>
            </div>
          </div>

          {/* Available Advocates Roster with Availability Checks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-blue-200 uppercase tracking-wider">
                Select Replacement Advocate
              </label>
              {availabilityQuery.isLoading ? (
                <span className="text-[11px] text-slate-400 animate-pulse">Checking availability...</span>
              ) : (
                <span className="text-[11px] text-cyan-400 font-mono">
                  Available Advocates: {availabilityQuery.data?.availableCount ?? 0}
                </span>
              )}
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {advocates.map((adv) => {
                const isSelected = selectedAdvocate === adv.name;
                const isCurrent = adv.name === currentAdvocate;

                // Status indicator symbol & color
                let statusBadge = (
                  <span className="text-emerald-400 flex items-center gap-1 text-[11px] font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> Available
                  </span>
                );
                if (adv.status === "Limited") {
                  statusBadge = (
                    <span className="text-amber-400 flex items-center gap-1 text-[11px] font-semibold">
                      <span className="w-2 h-2 rounded-full bg-amber-400" /> Limited
                    </span>
                  );
                } else if (adv.status === "Out Today") {
                  statusBadge = (
                    <span className="text-rose-400 flex items-center gap-1 text-[11px] font-semibold">
                      <span className="w-2 h-2 rounded-full bg-rose-400" /> Out Today
                    </span>
                  );
                } else if (adv.status === "PTO") {
                  statusBadge = (
                    <span className="text-rose-400 flex items-center gap-1 text-[11px] font-semibold">
                      🏖️ PTO
                    </span>
                  );
                }

                return (
                  <div
                    key={adv.staffId}
                    onClick={() => {
                      setSelectedAdvocate(adv.name);
                      setOverrideWarningAccepted(false);
                    }}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-cyan-500/15 border-cyan-400 shadow-md shadow-cyan-500/10"
                        : "bg-[#000820]/90 border-blue-900/50 hover:border-blue-700/80 hover:bg-blue-950/40"
                    } ${isCurrent ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? "border-cyan-400 bg-cyan-400 text-slate-950"
                              : "border-slate-600 bg-slate-900"
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                        </div>
                        <div>
                          <div className="font-semibold text-white text-xs flex items-center gap-1.5">
                            {adv.name}
                            {isCurrent && (
                              <span className="text-[10px] text-slate-400 font-normal">(Current)</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">{adv.role}</div>
                        </div>
                      </div>

                      <div className="text-right">{statusBadge}</div>
                    </div>

                    {/* Conflict Warnings */}
                    {adv.conflicts.length > 0 && (
                      <div className="mt-2 pt-1.5 border-t border-blue-950 text-[10px] text-rose-300 space-y-0.5">
                        {adv.conflicts.map((c, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                            <span>{c}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Admin Override Warning (if selecting an advocate with conflicts) */}
          {hasConflict && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-600 text-rose-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-300">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                Schedule Conflict Detected
              </div>
              <p className="text-[11px] text-rose-200/90 leading-relaxed">
                {selectedAdvocate} has detected schedule conflicts (such as overlapping appointments, blocked hours, or out of office status). As an authorized administrator, you may override this conflict.
              </p>
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={overrideWarningAccepted}
                  onChange={(e) => setOverrideWarningAccepted(e.target.checked)}
                  className="rounded border-rose-500 bg-rose-950 text-rose-500 focus:ring-rose-400"
                />
                <span className="text-white">I confirm Admin Override for this schedule conflict</span>
              </label>
            </div>
          )}

          {/* Reason for Reassignment */}
          <div>
            <label className="text-xs font-semibold text-blue-200 uppercase tracking-wider block mb-1">
              Reason for Reassignment
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Advocate unavailable, schedule conflict, case coverage"
              className="w-full text-xs px-3 py-2 rounded-lg bg-[#000820] border border-blue-900/80 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Recorded into Activity Timeline: originally assigned, reassigned to, reason, changed by, and timestamp.
            </p>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-blue-900/50 flex items-center justify-between sm:justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={reassignMutation.isPending}
            className="text-slate-400 hover:text-white text-xs"
          >
            Cancel
          </Button>

          <Button
            onClick={handleConfirmReassign}
            disabled={!selectedAdvocate || reassignMutation.isPending || (hasConflict && !overrideWarningAccepted)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 shadow-lg shadow-amber-500/20"
          >
            {reassignMutation.isPending ? "Confirming..." : "Confirm Reassignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
