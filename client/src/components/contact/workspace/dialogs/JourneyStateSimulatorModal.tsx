import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Wrench,
  Compass,
  CheckSquare,
  Sparkles,
  Pause,
  AlertTriangle,
  Calendar,
  Lock,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { getQuickApplyPayload } from "@/lib/journeyStateHelpers";

interface JourneyStateSimulatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: number;
  contact: any;
  onSuccess?: () => void;
}

export function JourneyStateSimulatorModal({
  open,
  onOpenChange,
  contactId,
  contact,
  onSuccess,
}: JourneyStateSimulatorModalProps) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const updateJourney = trpc.contacts.updateJourneyState.useMutation();

  const handleApplyState = async (stateKey: string) => {
    setSelectedKey(stateKey);
    setIsSimulating(true);
    try {
      const payload = getQuickApplyPayload(stateKey, contact);
      const friendlyName =
        payload.operationalState && payload.operationalState !== "Normal"
          ? payload.operationalState
          : payload.lifecycleStage;

      await updateJourney.mutateAsync({
        id: contactId,
        ...payload,
        reason: `Simulator switch to ${friendlyName}`,
      });

      toast.success(`Switched case to ${friendlyName}`);
      await utils.contacts.detail.invalidate({ id: contactId });
      await utils.contacts.list.invalidate();
      await utils.contacts.detail.refetch({ id: contactId });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error("State switch failed: " + (err.message || err));
    } finally {
      setIsSimulating(false);
      setSelectedKey(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-3xl bg-[#07162B] border border-[#0E356A] text-slate-100 shadow-2xl p-0 overflow-hidden">
        {/* Header with Nautical Gradient */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#071A38] via-[#092248] to-[#071A38] border-b border-[#0E356A]">
          <DialogHeader className="space-y-1.5 text-left">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <DialogTitle className="text-lg sm:text-xl font-bold font-serif text-white flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#F5B544]/15 border border-[#F5B544]/30 flex items-center justify-center shrink-0">
                  <Wrench className="h-4 w-4 text-[#F5B544]" />
                </div>
                <span>Manager Journey State Simulator</span>
              </DialogTitle>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-500/15 text-[#38BDF8] border border-sky-500/30">
                LIFECYCLE QA
              </span>
            </div>
            <DialogDescription className="text-xs text-slate-300 leading-relaxed">
              Instantly test and preview any stage of the client journey with corresponding roadmap cards, primary actions, and billing states.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* 7 Interactive Stage Cards */}
        <div className="p-5 sm:p-6 max-h-[70vh] overflow-y-auto space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 1. DISCOVERY */}
            <button
              type="button"
              onClick={() => handleApplyState("discovery")}
              disabled={isSimulating}
              className="w-full text-left p-4 rounded-xl border border-sky-500/30 bg-[#081B38]/80 hover:bg-[#0A244E] hover:border-sky-400/60 transition-all duration-200 cursor-pointer group flex flex-col justify-between focus:outline-hidden"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 font-bold text-sky-300 text-xs sm:text-sm">
                    <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center shrink-0">
                      <Compass className="h-4 w-4 text-[#38BDF8]" />
                    </div>
                    <span>1. Discovery Stage</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                    STAGE 1
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-normal break-words">
                  Initial clarity call roadmap with 3 steps. Plan not selected yet.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#0E356A]/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Primary Action:</span>
                <span className="font-semibold text-white group-hover:text-sky-300 flex items-center gap-1 transition-colors">
                  Start Discovery Call <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </button>

            {/* 2. ONBOARDING */}
            <button
              type="button"
              onClick={() => handleApplyState("onboarding")}
              disabled={isSimulating}
              className="w-full text-left p-4 rounded-xl border border-emerald-500/30 bg-[#081B38]/80 hover:bg-[#0A244E] hover:border-emerald-400/60 transition-all duration-200 cursor-pointer group flex flex-col justify-between focus:outline-hidden"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-300 text-xs sm:text-sm">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                      <CheckSquare className="h-4 w-4 text-emerald-400" />
                    </div>
                    <span>2. Onboarding Stage</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    3 OF 6
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-normal break-words">
                  Agreement confirmed, payment authorized. Collecting educational records & parent tasks.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#0E356A]/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Primary Action:</span>
                <span className="font-semibold text-white group-hover:text-emerald-300 flex items-center gap-1 transition-colors">
                  Continue Onboarding <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </button>

            {/* 3. ACTIVE */}
            <button
              type="button"
              onClick={() => handleApplyState("active")}
              disabled={isSimulating}
              className="w-full text-left p-4 rounded-xl border border-[#F5B544]/30 bg-[#081B38]/80 hover:bg-[#0A244E] hover:border-[#F5B544]/60 transition-all duration-200 cursor-pointer group flex flex-col justify-between focus:outline-hidden"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 font-bold text-white text-xs sm:text-sm">
                    <div className="w-7 h-7 rounded-lg bg-[#F5B544]/20 border border-[#F5B544]/40 flex items-center justify-center shrink-0">
                      <Sparkles className="h-4 w-4 text-[#F5B544]" />
                    </div>
                    <span>3. Normal Active</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-[#F5B544] border border-amber-500/20">
                    ACTIVE
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-normal break-words">
                  Services active, regular priority tasks, Case Compass and active roadmap.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#0E356A]/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Primary Action:</span>
                <span className="font-semibold text-white group-hover:text-[#F5B544] flex items-center gap-1 transition-colors">
                  Review New IEP Draft <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </button>

            {/* 4. PAYMENT ATTENTION */}
            <button
              type="button"
              onClick={() => handleApplyState("payment")}
              disabled={isSimulating}
              className="w-full text-left p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 hover:bg-rose-950/40 hover:border-rose-400/60 transition-all duration-200 cursor-pointer group flex flex-col justify-between focus:outline-hidden"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 font-bold text-rose-300 text-xs sm:text-sm">
                    <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-4 w-4 text-rose-400" />
                    </div>
                    <span>4. Payment Attention</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                    $55 DUE
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-normal break-words">
                  1 failed attempt. Retry scheduled for Sep 22. Portal access & grace period open.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-rose-500/20 flex items-center justify-between text-[11px]">
                <span className="text-rose-200/60">Primary Action:</span>
                <span className="font-semibold text-rose-300 group-hover:text-white flex items-center gap-1 transition-colors">
                  Resolve Payment Issue <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </button>

            {/* 5. SERVICES PAUSED */}
            <button
              type="button"
              onClick={() => handleApplyState("paused")}
              disabled={isSimulating}
              className="w-full text-left p-4 rounded-xl border border-purple-500/30 bg-purple-950/20 hover:bg-purple-950/40 hover:border-purple-400/60 transition-all duration-200 cursor-pointer group flex flex-col justify-between focus:outline-hidden"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 font-bold text-purple-300 text-xs sm:text-sm">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
                      <Pause className="h-4 w-4 text-purple-300" />
                    </div>
                    <span>5. Services Paused</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    PRESERVED
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-normal break-words">
                  Residential placement pause. Paid-in-full time preserved until Jan 15 review date.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-purple-500/20 flex items-center justify-between text-[11px]">
                <span className="text-purple-200/60">Primary Action:</span>
                <span className="font-semibold text-purple-300 group-hover:text-white flex items-center gap-1 transition-colors">
                  Review Pause <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </button>

            {/* 6. RENEWAL */}
            <button
              type="button"
              onClick={() => handleApplyState("renewal")}
              disabled={isSimulating}
              className="w-full text-left p-4 rounded-xl border border-indigo-500/30 bg-[#081B38]/80 hover:bg-[#0A244E] hover:border-indigo-400/60 transition-all duration-200 cursor-pointer group flex flex-col justify-between focus:outline-hidden"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 font-bold text-indigo-300 text-xs sm:text-sm">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shrink-0">
                      <Calendar className="h-4 w-4 text-indigo-400" />
                    </div>
                    <span>6. Renewal Due (14d)</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    EXPIRING
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-normal break-words">
                  Current term ends March 15. 4-step Renewal Roadmap active for contract extension.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#0E356A]/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Primary Action:</span>
                <span className="font-semibold text-white group-hover:text-indigo-300 flex items-center gap-1 transition-colors">
                  Start Renewal <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </button>

            {/* 7. OFFBOARDING (Full Width on Desktop) */}
            <button
              type="button"
              onClick={() => handleApplyState("offboarding")}
              disabled={isSimulating}
              className="md:col-span-2 w-full text-left p-4 rounded-xl border border-amber-500/30 bg-[#081B38]/80 hover:bg-[#0A244E] hover:border-amber-400/60 transition-all duration-200 cursor-pointer group flex flex-col justify-between focus:outline-hidden"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 font-bold text-amber-200 text-xs sm:text-sm">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                      <Lock className="h-4 w-4 text-[#F5B544]" />
                    </div>
                    <span>7. Offboarding Requested</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-[#F5B544] border border-amber-500/30">
                    PENDING CLOSEOUT
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-normal break-words">
                  Closeout initiated. Services and portal remain active until manager confirms final closure.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-[#0E356A]/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Primary Action:</span>
                <span className="font-semibold text-white group-hover:text-amber-300 flex items-center gap-1 transition-colors">
                  Start Offboarding <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 bg-[#0A1D38]/80 border-t border-[#0E356A] flex items-center justify-between sm:justify-between">
          <span className="text-[11px] text-slate-400">
            {isSimulating ? (
              <span className="flex items-center gap-1.5 text-sky-300">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Simulating state switch...
              </span>
            ) : (
              "Clicking any stage instantly updates the workspace and live database."
            )}
          </span>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSimulating}
            className="border-[#0E356A] text-slate-300 hover:text-white bg-[#07162B] hover:bg-[#0A2248] text-xs h-8 px-4 cursor-pointer"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
