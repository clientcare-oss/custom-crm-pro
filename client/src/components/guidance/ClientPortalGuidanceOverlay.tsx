import React, { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Compass,
  Radio,
  X,
  Lock,
  MousePointer,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ClientPortalGuidanceOverlayProps {
  studentContactId: number;
  parentContactId?: number;
  currentSection?: string;
  currentPath?: string;
}

export function ClientPortalGuidanceOverlay({
  studentContactId,
  parentContactId,
  currentSection = "Overview",
  currentPath = "/portal",
}: ClientPortalGuidanceOverlayProps) {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [incomingRequest, setIncomingRequest] = useState<{
    sessionId: string;
    employeeName: string;
  } | null>(null);

  // Pointer state from staff
  const [pointerCoord, setPointerCoord] = useState<{ x: number; y: number } | null>(null);
  const [showPointerLabel, setShowPointerLabel] = useState(false);
  const labelTimerRef = useRef<NodeJS.Timeout | null>(null);

  // tRPC endpoints
  const pendingQuery = trpc.guidance.clientGetPending.useQuery(
    { studentContactId },
    {
      enabled: Boolean(studentContactId) && !activeSessionId,
      refetchInterval: 3000,
    }
  );

  const respondMutation = trpc.guidance.clientRespond.useMutation({
    onSuccess: (res, vars) => {
      if (vars.allow) {
        setActiveSessionId(vars.sessionId);
        setIncomingRequest(null);
        toast.success("Waypoint Guidance is now active.");
      } else {
        setIncomingRequest(null);
      }
    },
  });

  const heartbeatMutation = trpc.guidance.clientHeartbeat.useMutation({
    onSuccess: (data) => {
      if (data.active) {
        if (data.pointerX !== null && data.pointerX !== undefined && data.pointerY !== null && data.pointerY !== undefined) {
          const newX = Number(data.pointerX);
          const newY = Number(data.pointerY);
          setPointerCoord({ x: newX, y: newY });
          setShowPointerLabel(true);

          if (labelTimerRef.current) clearTimeout(labelTimerRef.current);
          labelTimerRef.current = setTimeout(() => {
            setShowPointerLabel(false);
          }, 3000);
        } else {
          setPointerCoord(null);
        }
      } else if (data.shouldEnd) {
        setActiveSessionId(null);
        setPointerCoord(null);
        toast.info("Waypoint guidance session has ended.");
      }
    },
  });

  const endSessionMutation = trpc.guidance.endSession.useMutation({
    onSuccess: () => {
      setActiveSessionId(null);
      setPointerCoord(null);
      toast.info("Guidance session ended.");
    },
  });

  // Watch for incoming pending request
  useEffect(() => {
    if (pendingQuery.data?.hasRequest && pendingQuery.data.sessionId) {
      setIncomingRequest({
        sessionId: pendingQuery.data.sessionId,
        employeeName: pendingQuery.data.employeeName || "Waypoint Staff",
      });
    } else if (!pendingQuery.data?.hasRequest) {
      setIncomingRequest(null);
    }
  }, [pendingQuery.data]);

  // Check if current DOM or route has payment areas active
  const detectPaymentArea = () => {
    if (typeof document === "undefined") return false;
    if (currentPath.includes("payment") || currentPath.includes("billing") || currentPath.includes("membership")) {
      return true;
    }
    const hasPaymentElement = document.querySelector(
      '[data-payment-area="true"], [data-stripe="true"], .stripe-element, #card-element'
    );
    return Boolean(hasPaymentElement);
  };

  // Periodic heartbeat & navigation sync
  useEffect(() => {
    if (!studentContactId) return;

    const interval = setInterval(() => {
      const isPayment = detectPaymentArea();
      heartbeatMutation.mutate({
        studentContactId,
        parentContactId,
        currentPath,
        currentSection,
        isPaymentArea: isPayment,
        sessionId: activeSessionId || undefined,
      });
    }, activeSessionId ? 1000 : 8000);

    return () => clearInterval(interval);
  }, [studentContactId, parentContactId, currentPath, currentSection, activeSessionId]);

  // Handle client responding to request
  const handleAllow = () => {
    if (!incomingRequest) return;
    respondMutation.mutate({
      sessionId: incomingRequest.sessionId,
      allow: true,
    });
  };

  const handleNotNow = () => {
    if (!incomingRequest) return;
    respondMutation.mutate({
      sessionId: incomingRequest.sessionId,
      allow: false,
    });
  };

  const handleEndGuidance = () => {
    if (!activeSessionId) return;
    endSessionMutation.mutate({
      sessionId: activeSessionId,
      reason: "client_ended",
    });
  };

  return (
    <>
      {/* 1. Client Approval Dialog (Section 3 in spec) */}
      <Dialog open={Boolean(incomingRequest)} onOpenChange={(open) => { if (!open) handleNotNow(); }}>
        <DialogContent className="max-w-md bg-[#07162B] border border-blue-800/80 text-white shadow-2xl p-6 rounded-2xl">
          <DialogHeader className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Compass className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-serif font-bold text-white tracking-tight">
              Waypoint would like to guide you through your portal.
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300 leading-relaxed">
              Waypoint will be able to see this portal page and point to items. Waypoint cannot click, type, control your screen, or view your payment information.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-xl bg-blue-950/50 border border-blue-900/60 text-xs text-slate-300 space-y-1.5 mt-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-[11px]">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>You remain in complete control at all times</span>
            </div>
            <p className="text-[11px] text-slate-400 pl-6 leading-relaxed">
              You can end this guidance session at any time with the End Guidance button.
            </p>
          </div>

          <DialogFooter className="border-t border-blue-900/40 pt-4 gap-2.5 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleNotNow}
              className="border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 text-xs h-10 px-4"
            >
              Not Now
            </Button>
            <Button
              type="button"
              onClick={handleAllow}
              disabled={respondMutation.isPending}
              className="bg-[#F5B544] hover:bg-[#E5A534] text-[#07162B] font-bold text-xs h-10 px-5 shadow-lg cursor-pointer"
            >
              Allow Guidance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Persistent Visible Guidance Notice in Client Portal (Section 9 in spec) */}
      {activeSessionId && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 bg-[#07162B]/95 backdrop-blur-md border border-emerald-500/50 rounded-2xl shadow-2xl p-3 sm:p-4 flex items-center gap-3.5 text-white animate-in slide-in-from-bottom-4 duration-300 max-w-sm">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>

          <div className="space-y-0.5 min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <p className="text-xs font-bold text-white tracking-wide">
                Waypoint Guidance Active
              </p>
            </div>
            <p className="text-[10.5px] text-slate-400 leading-tight truncate">
              Staff can see this page & point to items
            </p>
          </div>

          <Button
            size="sm"
            variant="destructive"
            onClick={handleEndGuidance}
            className="h-8 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md cursor-pointer shrink-0 ml-auto"
          >
            End Guidance
          </Button>
        </div>
      )}

      {/* 3. Client-facing Pointer (Section 7 in spec) */}
      {activeSessionId && pointerCoord && (
        <div
          className="fixed pointer-events-none z-50 transition-all duration-75 ease-out"
          style={{
            left: `${pointerCoord.x}vw`,
            top: `${pointerCoord.y}vh`,
            transform: "translate(-50%, -50%)",
          }}
        >
          {/* Pulsing Target Radar */}
          <div className="relative flex items-center justify-center">
            <div className="absolute w-12 h-12 rounded-full bg-[#F5B544]/20 animate-ping" />
            <div className="w-6 h-6 rounded-full border-2 border-[#F5B544] bg-[#07162B]/80 shadow-[0_0_16px_rgba(245,181,68,0.8)] flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#F5B544]" />
            </div>

            {/* Label: "Waypoint is pointing here" (Fades after 3s, identical for all staff, no staff names/IDs) */}
            <div
              className={cn(
                "absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-full bg-[#07162B]/95 border border-[#F5B544]/60 text-[#F5B544] text-[11px] font-bold shadow-xl tracking-wide transition-opacity duration-500",
                showPointerLabel ? "opacity-100" : "opacity-0"
              )}
            >
              Waypoint is pointing here
            </div>
          </div>
        </div>
      )}
    </>
  );
}
