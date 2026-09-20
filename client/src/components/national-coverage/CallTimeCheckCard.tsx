import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Phone,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export interface CallTimeCheckData {
  clientId: number;
  clientName: string;
  city: string;
  state: string;
  localTime: string;
  timeZoneName: string;
  diffHours: number;
  diffText: string;
  status: "green" | "yellow" | "red";
  statusLabel?: string;
  guidanceText: string;
  preferredHoursText?: string | null;
  canCallAnyway: boolean;
}

interface CallTimeCheckCardProps {
  checkData: CallTimeCheckData | null;
  onScheduleCall?: (clientId: number) => void;
  onCallConfirmed?: (clientId: number) => void;
}

export function CallTimeCheckCard({
  checkData,
  onScheduleCall,
  onCallConfirmed,
}: CallTimeCheckCardProps) {
  const [showCallAnywayModal, setShowCallAnywayModal] = useState(false);
  const logCallAnywayMutation = trpc.nationalCoverage.logCallAnyway.useMutation();

  if (!checkData) {
    return (
      <div className="rounded-2xl bg-[#07162B]/85 border border-slate-800/80 p-5 backdrop-blur-md flex flex-col items-center justify-center text-center min-h-[170px]">
        <Clock className="w-8 h-8 text-slate-600 mb-2" />
        <span className="text-xs text-slate-400">Select any client to verify calling time</span>
      </div>
    );
  }

  const isGreen = checkData.status === "green";
  const isYellow = checkData.status === "yellow";
  const isRed = checkData.status === "red";

  const statusIndicatorColor = isGreen
    ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/15"
    : isYellow
    ? "text-amber-400 border-amber-500/40 bg-amber-500/15"
    : "text-rose-400 border-rose-500/40 bg-rose-500/15";

  const clockRingColor = isGreen
    ? "border-emerald-500/40 text-emerald-400 shadow-emerald-500/10"
    : isYellow
    ? "border-amber-500/40 text-amber-400 shadow-amber-500/10"
    : "border-rose-500/40 text-rose-400 shadow-rose-500/10";

  const handleCallAnywayConfirmed = async () => {
    try {
      await logCallAnywayMutation.mutateAsync({
        clientId: checkData.clientId,
        clientName: checkData.clientName,
        clientLocalTime: checkData.localTime,
        reason: "Advocate acknowledged off-hours warning",
      });
      setShowCallAnywayModal(false);
      toast.success(`Off-hours call logged for ${checkData.clientName}`);
      onCallConfirmed?.(checkData.clientId);
    } catch {
      setShowCallAnywayModal(false);
      onCallConfirmed?.(checkData.clientId);
    }
  };

  return (
    <>
      <div className="rounded-2xl bg-gradient-to-br from-[#07162B] to-[#0a1e38] border border-slate-800/90 p-5 shadow-xl backdrop-blur-md flex flex-col justify-between">
        <div>
          {/* Header Row with Phone icon and Illuminated Clock */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center">
                <Phone className="w-4 h-4 text-sky-400" />
              </div>
              <span className="text-sm font-bold tracking-tight text-white">
                Call-Time Check
              </span>
            </div>

            {/* Glowing Clock Ring */}
            <div
              className={cn(
                "w-9 h-9 rounded-full border flex items-center justify-center shadow-lg transition-all",
                clockRingColor
              )}
            >
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Client Local Time & Status */}
          <div className="space-y-1 mb-3">
            <div className="text-sm sm:text-base font-bold text-white">
              Client local time: <strong className="font-mono text-sky-300">{checkData.localTime}</strong> ({checkData.timeZoneName})
            </div>
            <div className="text-xs text-slate-400">
              {checkData.diffText}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                  statusIndicatorColor
                )}
              >
                <span className="w-2 h-2 rounded-full bg-current" />
                {checkData.guidanceText}
              </span>
            </div>
          </div>

          {/* Preferred contact hours if present */}
          {checkData.preferredHoursText && (
            <div className="text-[11px] text-slate-400 italic mb-3 flex items-center gap-1">
              <Info className="w-3 h-3 text-sky-400 flex-shrink-0" />
              {checkData.preferredHoursText}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5 pt-2 border-t border-slate-800/60">
          <Button
            type="button"
            variant="outline"
            onClick={() => onScheduleCall?.(checkData.clientId)}
            className="flex-1 h-9 text-xs font-semibold border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            Schedule Call
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (isRed || isYellow) {
                setShowCallAnywayModal(true);
              } else {
                onCallConfirmed?.(checkData.clientId);
              }
            }}
            className={cn(
              "flex-1 h-9 text-xs font-semibold gap-1.5",
              isGreen
                ? "bg-emerald-600 hover:bg-emerald-500 text-white border-transparent shadow-md shadow-emerald-600/30"
                : "border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200"
            )}
          >
            <Phone className="w-3.5 h-3.5 text-emerald-400" />
            {isGreen ? "Place Call" : "Call Anyway"}
          </Button>
        </div>
      </div>

      {/* "Call Anyway" Acknowledgment Dialog */}
      <Dialog open={showCallAnywayModal} onOpenChange={setShowCallAnywayModal}>
        <DialogContent className="sm:max-w-md bg-[#07162B] border border-slate-800 text-slate-100 shadow-2xl">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <DialogTitle className="text-lg font-bold text-white">
              Confirm Outside Calling Hours
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-sm mt-1.5 leading-relaxed">
              It is currently <strong className="text-white font-mono">{checkData.localTime}</strong> for{" "}
              <strong className="text-white">{checkData.clientName}</strong> ({checkData.timeZoneName}).
              {checkData.diffText && ` (${checkData.diffText})`}.
              <br /><br />
              Are you sure you want to place this call outside recommended hours?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCallAnywayModal(false)}
              className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300"
            >
              Go Back
            </Button>
            <Button
              type="button"
              onClick={handleCallAnywayConfirmed}
              disabled={logCallAnywayMutation.isPending}
              className="bg-rose-600 hover:bg-rose-500 text-white font-semibold"
            >
              Call Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
