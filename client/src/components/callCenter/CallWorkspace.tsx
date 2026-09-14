import React, { useState } from "react";
import { useActiveCall } from "@/contexts/ActiveCallContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  PhoneCall,
  UserCheck,
  HelpCircle,
  BookOpen,
  ArrowDown,
  CheckCircle2,
  FileEdit,
  ChevronUp,
} from "lucide-react";
import { CallerIdentitySelector } from "./CallerIdentitySelector";
import { CallTypeSelector } from "./CallTypeSelector";
import { CallFlowPanel } from "./CallFlowPanel";
import { CallGuideDrawer } from "./CallGuideDrawer";
import { NewLeadFlow } from "./NewLeadFlow";
import { ExistingClientFlow } from "./ExistingClientFlow";
import { AdvocacyCaseFlow } from "./AdvocacyCaseFlow";
import { WrapUpCallSection } from "./WrapUpCallSection";
import { RequestCallbackModal } from "./RequestCallbackModal";

interface CallWorkspaceProps {
  onAddNewContactRequest?: () => void;
  onCallInQuo?: (phone: string, name?: string) => void;
  onCloseWorkspace?: () => void;
}

export const CallWorkspace: React.FC<CallWorkspaceProps> = ({
  onAddNewContactRequest,
  onCallInQuo,
  onCloseWorkspace,
}) => {
  const { call, setGeneralNotes, endCallSession } = useActiveCall();

  // Drawer / Modal states
  const [guideDrawerOpen, setGuideDrawerOpen] = useState(false);
  const [callbackModalOpen, setCallbackModalOpen] = useState(false);

  const scrollToWrapUp = () => {
    const el = document.getElementById("wrap-up-call-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("ring-2", "ring-amber-400", "transition-all", "duration-500");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-amber-400");
      }, 1500);
    }
  };

  const isLeadMode = call.callerCategory === "new_lead" || call.callType === "New Lead / Sales";
  const isExistingClient = call.callerCategory === "existing_client" || call.callType === "Current Client";
  const isAdvocacyCase = call.callType === "Advocacy / Case Question";

  return (
    <div id="call-workspace" className="space-y-6 scroll-mt-6">
      {/* Top Banner: Call Workspace Workflow Header */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-500/30 bg-gradient-to-r from-[#071933] via-[#0B254A] to-[#081C38] p-6 shadow-2xl">
        <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/40 text-xs px-3 py-1 font-bold">
                OPERATIONAL WORKSPACE
              </Badge>
              <span className="text-xs text-slate-400 font-mono">PG-018 · Dynamic Call Brain</span>
              {onCloseWorkspace && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onCloseWorkspace}
                  className="h-6 px-2 text-xs text-slate-400 hover:text-white hover:bg-white/10 rounded-lg ml-2"
                >
                  <ChevronUp className="h-3.5 w-3.5 mr-1" />
                  Hide Workspace
                </Button>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <PhoneCall className="h-7 w-7 text-amber-400" />
              <span>CALL WORKSPACE</span>
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Waypoint CRM is the workflow brain around the phone call. Identify the caller, select the reason, follow the guided SOP, and log follow-up actions effortlessly.
            </p>
          </div>

          {/* Workflow Breadcrumb Indicator: Who is this? → Why are they calling? → Show me what to do */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-[#040D1A]/90 p-3 rounded-xl border border-slate-800 text-xs shadow-inner">
            <div className="flex items-center gap-1.5">
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  call.callerCategory
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-400"
                    : "bg-amber-400/20 text-amber-300 border border-amber-400 animate-pulse"
                }`}
              >
                1
              </div>
              <span className={call.callerCategory ? "text-emerald-300 font-semibold" : "text-amber-200 font-medium"}>
                Who is this?
              </span>
            </div>

            <span className="text-slate-600 hidden sm:inline">→</span>

            <div className="flex items-center gap-1.5">
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  call.callType
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-400"
                    : call.callerCategory
                    ? "bg-amber-400/20 text-amber-300 border border-amber-400 animate-pulse"
                    : "bg-slate-800 text-slate-500 border border-slate-700"
                }`}
              >
                2
              </div>
              <span className={call.callType ? "text-emerald-300 font-semibold" : call.callerCategory ? "text-amber-200 font-medium" : "text-slate-500"}>
                Why calling?
              </span>
            </div>

            <span className="text-slate-600 hidden sm:inline">→</span>

            <div className="flex items-center gap-1.5">
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  call.callType
                    ? "bg-sky-500/20 text-sky-300 border border-sky-400"
                    : "bg-slate-800 text-slate-500 border border-slate-700"
                }`}
              >
                3
              </div>
              <span className={call.callType ? "text-sky-300 font-semibold" : "text-slate-500"}>
                Show what to do
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1 — IDENTIFY THE CALLER ("Who am I talking to?") */}
      <CallerIdentitySelector onAddNewContactRequest={onAddNewContactRequest} />

      {/* SECTION 2 — CALL TYPE ("What is this call about?") */}
      <CallTypeSelector />

      {/* CALL FLOW SYSTEM — Step-by-Step Interactive Checklist */}
      <CallFlowPanel
        onOpenGuide={() => setGuideDrawerOpen(true)}
        onScrollToWrapUp={scrollToWrapUp}
      />

      {/* SPECIALIZED WORKFLOW PANELS BASED ON CALL TYPE & CATEGORY */}
      {isLeadMode && (
        <div className="animate-in fade-in slide-in-from-top-3 duration-300">
          <NewLeadFlow />
        </div>
      )}

      {isExistingClient && (
        <div className="animate-in fade-in slide-in-from-top-3 duration-300">
          <ExistingClientFlow onRequestCallback={() => setCallbackModalOpen(true)} />
        </div>
      )}

      {isAdvocacyCase && (
        <div className="animate-in fade-in slide-in-from-top-3 duration-300">
          <AdvocacyCaseFlow onRequestCallback={() => setCallbackModalOpen(true)} />
        </div>
      )}

      {/* PERSISTENT GENERAL CALL NOTES SECTION */}
      <Card className="p-5 rounded-2xl border border-slate-800 bg-[#07162B] shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileEdit className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              General Call Notes
            </h3>
          </div>
          <span className="text-xs text-slate-500">Auto-saved to active session</span>
        </div>

        <textarea
          rows={3}
          value={call.generalNotes || ""}
          onChange={(e) => setGeneralNotes(e.target.value)}
          placeholder="Document general conversation notes, parent comments, or advocate recommendations here..."
          className="w-full text-xs rounded-xl bg-[#040D1A] border border-slate-800 p-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400/50 resize-y"
        />
      </Card>

      {/* UNIVERSAL WRAP UP CALL SECTION */}
      <WrapUpCallSection />

      {/* SIDE DRAWER: Call Guide / SOP Drawer */}
      <CallGuideDrawer
        open={guideDrawerOpen}
        onClose={() => setGuideDrawerOpen(false)}
      />

      {/* MODAL: Request Advocate Callback */}
      <RequestCallbackModal
        open={callbackModalOpen}
        onOpenChange={setCallbackModalOpen}
      />
    </div>
  );
};
