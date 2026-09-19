import React, { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Radio,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Maximize2,
  Minimize2,
  RefreshCw,
  PhoneCall,
  Lock,
  Compass,
  Copy,
  Check,
  Shield,
  Loader2,
  MousePointer,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface GuideClientLiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: any;
  parentContact?: any;
}

type ModalStage =
  | "checking_presence"
  | "client_offline"
  | "ready_to_connect"
  | "waiting_approval"
  | "client_declined"
  | "active_session"
  | "session_ended";

export function GuideClientLiveModal({
  open,
  onOpenChange,
  contact,
  parentContact,
}: GuideClientLiveModalProps) {
  const [stage, setStage] = useState<ModalStage>("checking_presence");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeSessionSummary, setActiveSessionSummary] = useState<{
    durationMinutes: number;
    durationSeconds: number;
    section: string;
  } | null>(null);

  const studentContactId = contact?.id;
  const parentContactId = parentContact?.id || contact?.parentContactId;
  const clientName = parentContact
    ? `${parentContact.firstName || ""} ${parentContact.lastName || ""}`.trim()
    : `${contact?.parentName || contact?.firstName || "Client"}`;

  const pointerContainerRef = useRef<HTMLDivElement>(null);
  const lastPointerSent = useRef<number>(0);

  // tRPC utils for cache invalidation
  const utils = trpc.useUtils();

  // 1. Presence Query
  const presenceQuery = trpc.guidance.checkPresence.useQuery(
    { studentContactId: studentContactId || 0 },
    {
      enabled: open && Boolean(studentContactId) && (stage === "checking_presence" || stage === "client_offline"),
      refetchInterval: stage === "client_offline" ? 5000 : false,
    }
  );

  // 2. Initiate Session Mutation
  const initiateMutation = trpc.guidance.initiate.useMutation({
    onSuccess: (data) => {
      if (data.success && data.sessionId) {
        setSessionId(data.sessionId);
        setStage("waiting_approval");
      } else if (data.error === "CLIENT_OFFLINE") {
        setStage("client_offline");
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to initiate guidance session");
      setStage("client_offline");
    },
  });

  // 3. Poll Session Mutation/Query
  const sessionPoll = trpc.guidance.pollStaffSession.useQuery(
    { sessionId: sessionId || "" },
    {
      enabled: open && Boolean(sessionId) && (stage === "waiting_approval" || stage === "active_session"),
      refetchInterval: 1200,
    }
  );

  // 4. Staff Sync Pointer Mutation
  const syncPointerMutation = trpc.guidance.staffSyncPointer.useMutation();

  // 5. End Session Mutation
  const endSessionMutation = trpc.guidance.endSession.useMutation({
    onSuccess: (res) => {
      utils.caseActivity.list.invalidate();
      setActiveSessionSummary({
        durationMinutes: res.durationMinutes || 1,
        durationSeconds: res.durationSeconds || 1,
        section: sessionPoll.data?.currentSection || "Overview",
      });
      setStage("session_ended");
    },
  });

  // Initialize or reset when dialog opens
  useEffect(() => {
    if (open) {
      setStage("checking_presence");
      setSessionId(null);
      setIsFullScreen(false);
      setActiveSessionSummary(null);
      presenceQuery.refetch();
    }
  }, [open]);

  // React to presence query changes
  useEffect(() => {
    if (stage === "checking_presence" && !presenceQuery.isLoading) {
      if (presenceQuery.data?.isOnline) {
        setStage("ready_to_connect");
      } else {
        setStage("client_offline");
      }
    }
  }, [presenceQuery.isLoading, presenceQuery.data, stage]);

  // React to session polling updates
  useEffect(() => {
    if (sessionPoll.data) {
      const status = sessionPoll.data.status;
      if (stage === "waiting_approval") {
        if (status === "active" || status === "approved") {
          setStage("active_session");
          toast.success("Client approved guidance. Live co-browsing active!");
        } else if (status === "declined") {
          setStage("client_declined");
        }
      } else if (stage === "active_session") {
        if (status === "completed" || status === "disconnected") {
          setActiveSessionSummary({
            durationMinutes: Math.max(1, Math.round((sessionPoll.data.durationSeconds || 60) / 60)),
            durationSeconds: sessionPoll.data.durationSeconds || 60,
            section: sessionPoll.data.currentSection || "Overview",
          });
          setStage("session_ended");
        }
      }
    }
  }, [sessionPoll.data, stage]);

  // Handle staff moving mouse over the preview area (Point-Only)
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!sessionId || stage !== "active_session" || sessionPoll.data?.isPaymentArea) return;

      const now = Date.now();
      // Throttle pointer sync to 60ms for smooth client rendering without network choke
      if (now - lastPointerSent.current < 60) return;
      lastPointerSent.current = now;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

      syncPointerMutation.mutate({
        sessionId,
        pointerX: Number(x.toFixed(2)),
        pointerY: Number(y.toFixed(2)),
      });
    },
    [sessionId, stage, sessionPoll.data?.isPaymentArea]
  );

  const handleEndGuidance = () => {
    if (!sessionId) {
      onOpenChange(false);
      return;
    }
    endSessionMutation.mutate({
      sessionId,
      reason: "staff_ended",
    });
  };

  const handleCopyPortalLink = () => {
    const portalUrl = `${window.location.origin}/portal?contactId=${studentContactId}`;
    navigator.clipboard.writeText(portalUrl);
    setCopiedLink(true);
    toast.success("Client portal link copied to clipboard");
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleStartRequest = () => {
    initiateMutation.mutate({
      studentContactId,
      parentContactId,
    });
  };

  const handleCheckAgain = () => {
    setStage("checking_presence");
    presenceQuery.refetch();
  };

  // Portal view URL in preview/staff mode (no payment inputs exposed)
  const portalViewUrl = `/portal?preview=true&contactId=${studentContactId}&guidanceSession=${sessionId || ""}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "bg-[#040E1E] border border-blue-900/60 text-white transition-all duration-300 shadow-2xl p-0 overflow-hidden",
          isFullScreen
            ? "fixed inset-0 w-screen h-screen max-w-none rounded-none z-50 m-0"
            : "max-w-5xl w-[95vw] h-[88vh] rounded-2xl"
        )}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-blue-900/40 bg-[#071731] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Compass className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Guide Client Live
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60 font-semibold">
                  PG-030-GCL
                </span>
                {stage === "active_session" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Connected (Live)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Staff co-browsing & Point Only guidance for {clientName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {stage === "active_session" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sessionPoll.refetch()}
                  className="h-8 text-xs border-blue-800/60 bg-blue-950/40 text-blue-200 hover:bg-blue-900/40"
                  title="Refresh live connection state"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Refresh Connection
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="h-8 text-xs border-blue-800/60 bg-blue-950/40 text-blue-200 hover:bg-blue-900/40"
                  title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                >
                  {isFullScreen ? (
                    <>
                      <Minimize2 className="h-3.5 w-3.5 mr-1" />
                      Exit Full Screen
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-3.5 w-3.5 mr-1" />
                      Full Screen
                    </>
                  )}
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleEndGuidance}
                  disabled={endSessionMutation.isPending}
                  className="h-8 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer"
                >
                  End Guidance
                </Button>
              </>
            )}

            {stage !== "active_session" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 text-xs text-slate-400 hover:text-white"
              >
                Close
              </Button>
            )}
          </div>
        </div>

        {/* Modal Body Based on Stage */}
        <div className="flex-1 flex flex-col h-[calc(100%-60px)] overflow-hidden">
          {/* STAGE 1: Checking presence */}
          {stage === "checking_presence" && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-950/60 border border-blue-800/60 flex items-center justify-center text-sky-400">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Checking Client Portal Presence...</h4>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Verifying whether {clientName} is currently signed into their portal.
                </p>
              </div>
            </div>
          )}

          {/* STAGE 2: Client Offline (Item 4 in spec) */}
          {stage === "client_offline" && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertCircle className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-bold text-white">
                  Client is not currently signed into the portal.
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Ask the client to sign in, then check again.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full">
                <Button
                  onClick={handleCheckAgain}
                  className="flex-1 bg-[#F5B544] hover:bg-[#E5A534] text-[#07162B] font-bold text-xs h-10 shadow-md cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Check Again
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCopyPortalLink}
                  className="flex-1 border-blue-800/60 bg-blue-950/40 text-blue-200 hover:bg-blue-900/40 text-xs h-10 cursor-pointer"
                >
                  {copiedLink ? <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                  {copiedLink ? "Link Copied!" : "Copy Portal Link"}
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
            </div>
          )}

          {/* STAGE 3: Ready to Connect (Item 2 in spec) */}
          {stage === "ready_to_connect" && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Radio className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <h4 className="text-xl font-serif font-bold text-white">
                  Ready to connect
                </h4>
                <p className="text-sm text-slate-300">
                  Send a guidance request to this client’s portal?
                </p>
                <div className="mt-4 p-3 rounded-xl bg-blue-950/40 border border-blue-800/40 text-left text-xs space-y-1.5 text-slate-300">
                  <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Client is currently active in the portal</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed pl-6">
                    Current Section: <strong className="text-white">{presenceQuery.data?.currentSection || "Overview"}</strong>
                  </p>
                  <p className="text-slate-400 text-[11px] leading-relaxed pl-6">
                    When you send the request, an unobtrusive prompt will appear in {clientName}’s portal asking them to allow guidance.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full">
                <Button
                  onClick={handleStartRequest}
                  disabled={initiateMutation.isPending}
                  className="flex-1 bg-[#F5B544] hover:bg-[#E5A534] text-[#07162B] font-bold text-sm h-11 shadow-lg cursor-pointer"
                >
                  {initiateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Compass className="h-4 w-4 mr-2" />
                  )}
                  Send Guidance Request
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 h-11 text-xs px-5"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* STAGE 4: Waiting for client approval (Item 3 in spec) */}
          {stage === "waiting_approval" && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-sky-500/15 border border-sky-500/40 flex items-center justify-center text-sky-400">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-bold text-white">
                  Waiting for client approval...
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  A guidance invitation has appeared on {clientName}’s screen. The session will begin as soon as they select <strong>Allow Guidance</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#081B38] border border-blue-900/60 text-xs text-slate-400 text-left space-y-1 w-full">
                <p className="text-[11px] font-semibold text-slate-300">Speaking with the client?</p>
                <p className="text-[11px] leading-relaxed">
                  “I just sent a guidance invitation to your portal screen. Please tap <strong>Allow Guidance</strong> so I can follow along and point things out with you.”
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStage("ready_to_connect");
                  setSessionId(null);
                }}
                className="border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 text-xs"
              >
                Cancel Request
              </Button>
            </div>
          )}

          {/* STAGE 5: Client Declined (Item 3 in spec) */}
          {stage === "client_declined" && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <XCircle className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-bold text-white">
                  The client did not approve the guidance session.
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {clientName} selected "Not Now" or dismissed the request. You can send another request when they are ready.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full">
                <Button
                  onClick={handleStartRequest}
                  className="flex-1 bg-[#F5B544] hover:bg-[#E5A534] text-[#07162B] font-bold text-xs h-10 shadow-md cursor-pointer"
                >
                  Send Request Again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 text-xs h-10 cursor-pointer"
                >
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* STAGE 6: Live Co-Browsing Window (Items 5, 6, 7, 8 in spec) */}
          {stage === "active_session" && (
            <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#030A17]">
              {/* Secondary Status Strip */}
              <div className="px-4 py-2 bg-[#06142A] border-b border-blue-900/40 flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <span className="text-slate-500 uppercase text-[10px] font-bold">Portal Section:</span>
                    <strong className="text-sky-300 font-medium">
                      {sessionPoll.data?.currentSection || "Overview"}
                    </strong>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 text-slate-400 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Point Only active — moving your mouse guides the client</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                  <span>Duration: <strong className="text-white font-mono">{Math.floor((sessionPoll.data?.durationSeconds || 0) / 60)}m {((sessionPoll.data?.durationSeconds || 0) % 60).toString().padStart(2, "0")}s</strong></span>
                </div>
              </div>

              {/* Live Preview Container with Point-Only Overlay */}
              <div
                ref={pointerContainerRef}
                onMouseMove={handleMouseMove}
                className="flex-1 relative w-full h-full bg-slate-950 overflow-hidden cursor-crosshair select-none"
              >
                {/* 🔒 Protected Payment Area Replacement (Item 8 in spec) */}
                {sessionPoll.data?.isPaymentArea ? (
                  <div className="absolute inset-0 z-40 bg-[#061325]/98 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-4">
                    <div className="w-20 h-20 rounded-full bg-blue-950/80 border-2 border-sky-400/40 flex items-center justify-center text-sky-300 shadow-[0_0_30px_rgba(56,189,248,0.2)]">
                      <Lock className="h-10 w-10 text-[#38BDF8]" />
                    </div>
                    <div className="space-y-2 max-w-md">
                      <h3 className="text-xl font-serif font-bold text-white flex items-center justify-center gap-2">
                        <span>🔒 Protected Payment Area</span>
                      </h3>
                      <p className="text-sm text-slate-300 leading-relaxed font-medium">
                        The client is completing payment information privately.
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Per Waypoint PCI & FERPA privacy standards, raw cardholder details, billing information, and payment tokens are completely shielded from staff view.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-900/50 text-[11px] text-slate-400 max-w-sm">
                      Guidance pointer is disabled inside this protected area. When the client navigates away from payment, the live portal view will immediately restore.
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Live Portal View Frame */}
                    <iframe
                      src={portalViewUrl}
                      title="Client Portal Live Session"
                      className="w-full h-full border-0 pointer-events-none select-none bg-background"
                    />

                    {/* Point Only Transparent Guidance Overlay */}
                    <div
                      className="absolute inset-0 z-20 pointer-events-auto bg-transparent"
                      title="Move your mouse to point. Click to pulse a highlight on the client's screen."
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                        const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
                        if (sessionId) {
                          syncPointerMutation.mutate({
                            sessionId,
                            pointerX: Number(x.toFixed(2)),
                            pointerY: Number(y.toFixed(2)),
                          });
                        }
                      }}
                    />

                    {/* Subtle staff hint pill */}
                    <div className="absolute bottom-4 left-4 z-30 pointer-events-none bg-[#07162E]/90 border border-sky-500/30 px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 text-xs text-sky-200">
                      <MousePointer className="h-3.5 w-3.5 text-[#F5B544]" />
                      <span>Move cursor anywhere to guide client</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* STAGE 7: Session Ended Summary (Item 11 in spec) */}
          {stage === "session_ended" && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-serif font-bold text-white">
                  Live Client Guidance completed
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Guided <strong>{clientName}</strong> through the <strong>{activeSessionSummary?.section || "Overview"}</strong> section for <strong>{activeSessionSummary?.durationMinutes || 1} minute{(activeSessionSummary?.durationMinutes || 1) > 1 ? "s" : ""}</strong>.
                </p>
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs text-left mt-2">
                  <p className="font-semibold text-emerald-200">Activity Timeline Updated</p>
                  <p className="text-[11px] text-emerald-300/80 mt-0.5">
                    An authentic entry has been logged to the Student Activity Timeline for your case records.
                  </p>
                </div>
              </div>

              <Button
                onClick={() => onOpenChange(false)}
                className="w-full bg-[#F5B544] hover:bg-[#E5A534] text-[#07162B] font-bold text-xs h-10 shadow-md cursor-pointer"
              >
                Return to Student Workspace
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
