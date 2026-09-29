import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { UserCheck, ShieldAlert, AlertCircle, Clock, Calendar, CheckCircle2 } from "lucide-react";

interface StaffStatusManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdated?: () => void;
}

export default function StaffStatusManagerModal({
  open,
  onOpenChange,
  onStatusUpdated,
}: StaffStatusManagerModalProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [note, setNote] = useState<string>("");

  const staffRosterQuery = trpc.appointments.getStaffRoster.useQuery(undefined, {
    enabled: open,
  });

  const utils = trpc.useUtils();
  const updateStatusMutation = trpc.appointments.updateStaffStatus.useMutation({
    onSuccess: (data) => {
      if (data.affectedAppointmentsCount > 0) {
        toast.warning(
          `Staff status updated. ${data.affectedAppointmentsCount} scheduled appointment(s) flagged for 🚨 Needs Coverage.`,
          {
            description: "Appointments are NOT auto-reassigned. Authorized staff can reassign with human confirmation.",
          }
        );
      } else {
        toast.success(`Staff status updated successfully.`);
      }
      utils.appointments.getStaffRoster.invalidate();
      utils.appointments.list.invalidate();
      onStatusUpdated?.();
    },
    onError: (err) => {
      toast.error(`Failed to update status: ${err.message}`);
    },
  });

  const staffList = staffRosterQuery.data || [];

  const handleSetStatus = (staffId: string, status: "Available" | "Limited" | "Out Today" | "PTO") => {
    updateStatusMutation.mutate({
      staffId,
      status,
      statusNote: note.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#000d2b] border border-blue-900/80 text-white shadow-2xl p-6 max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-blue-900/50">
          <div className="flex items-center gap-2 text-cyan-400">
            <UserCheck className="w-5 h-5 text-cyan-400" />
            <DialogTitle className="text-lg font-bold text-white tracking-tight">
              Staff Availability &amp; Coverage Console
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-300">
            Manage advocate daily status and weekly working availability. Marking staff Out Today or PTO triggers 🚨 Needs Coverage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Coverage Protection Rule Callout */}
          <div className="p-3 rounded-lg bg-[#000820] border border-blue-900/60 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-300">Coverage Safeguard: </span>
              <span className="text-slate-300">
                When an advocate is marked <strong>Out Today</strong> or <strong>PTO</strong>, their scheduled appointments are flagged with <strong className="text-rose-400">🚨 Needs Coverage</strong>. Appointments are never auto-reassigned without explicit human confirmation.
              </span>
            </div>
          </div>

          {/* Advocates Roster */}
          <div className="space-y-3">
            {staffList.map((staff) => {
              const daysSummary = ["Mon", "Tue", "Wed", "Thu", "Fri"]
                .map((day, idx) => {
                  const daySlots = staff.weeklyHours[idx + 1] || [];
                  return daySlots.length > 0 ? `${day}: ${daySlots[0].start}–${daySlots[0].end}` : null;
                })
                .filter(Boolean)
                .join(" · ");

              return (
                <div
                  key={staff.id}
                  className="rounded-xl border border-blue-900/50 bg-[#000820]/90 p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{staff.name}</span>
                        <Badge
                          variant="outline"
                          className={
                            staff.status === "Available"
                              ? "bg-emerald-950/60 text-emerald-300 border-emerald-700/60"
                              : staff.status === "Limited"
                              ? "bg-amber-950/60 text-amber-300 border-amber-700/60"
                              : "bg-rose-950/60 text-rose-300 border-rose-700/60 font-bold"
                          }
                        >
                          {staff.status === "Available" && "🟢 Available"}
                          {staff.status === "Limited" && "🟡 Limited"}
                          {staff.status === "Out Today" && "🔴 Out Today"}
                          {staff.status === "PTO" && "🏖️ PTO"}
                        </Badge>
                      </div>
                      <div className="text-xs text-cyan-300/80">{staff.role}</div>
                      {staff.statusNote && (
                        <div className="text-[11px] text-slate-400 italic mt-0.5">
                          "{staff.statusNote}"
                        </div>
                      )}
                    </div>

                    {/* Quick Status Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Button
                        size="sm"
                        variant={staff.status === "Available" ? "default" : "outline"}
                        disabled={updateStatusMutation.isPending}
                        onClick={() => handleSetStatus(staff.id, "Available")}
                        className={
                          staff.status === "Available"
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-7 px-2.5"
                            : "border-emerald-800/60 text-emerald-400 hover:bg-emerald-950/40 text-xs h-7 px-2.5"
                        }
                      >
                        🟢 Available
                      </Button>

                      <Button
                        size="sm"
                        variant={staff.status === "Limited" ? "default" : "outline"}
                        disabled={updateStatusMutation.isPending}
                        onClick={() => handleSetStatus(staff.id, "Limited")}
                        className={
                          staff.status === "Limited"
                            ? "bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs h-7 px-2.5"
                            : "border-amber-800/60 text-amber-400 hover:bg-amber-950/40 text-xs h-7 px-2.5"
                        }
                      >
                        🟡 Limited
                      </Button>

                      <Button
                        size="sm"
                        variant={staff.status === "Out Today" ? "default" : "outline"}
                        disabled={updateStatusMutation.isPending}
                        onClick={() => handleSetStatus(staff.id, "Out Today")}
                        className={
                          staff.status === "Out Today"
                            ? "bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs h-7 px-2.5"
                            : "border-rose-800/60 text-rose-400 hover:bg-rose-950/40 text-xs h-7 px-2.5"
                        }
                      >
                        🔴 Out Today
                      </Button>

                      <Button
                        size="sm"
                        variant={staff.status === "PTO" ? "default" : "outline"}
                        disabled={updateStatusMutation.isPending}
                        onClick={() => handleSetStatus(staff.id, "PTO")}
                        className={
                          staff.status === "PTO"
                            ? "bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs h-7 px-2.5"
                            : "border-purple-800/60 text-purple-400 hover:bg-purple-950/40 text-xs h-7 px-2.5"
                        }
                      >
                        🏖️ PTO
                      </Button>
                    </div>
                  </div>

                  {/* Normal Weekly Working Hours */}
                  <div className="pt-2 border-t border-blue-950 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>Regular Hours: {daysSummary || "Mon–Thu: 9 AM–4 PM"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-blue-900/50">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-slate-400 hover:text-white text-xs"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
