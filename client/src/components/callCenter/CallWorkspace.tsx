import React, { useState } from "react";
import { useActiveCall } from "@/contexts/ActiveCallContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PhoneCall,
  FileEdit,
  ChevronUp,
} from "lucide-react";
import PageIdBadge from "@/components/PageIdBadge";
import { CallerIdentitySelector } from "./CallerIdentitySelector";
import { CallTypeSelector } from "./CallTypeSelector";
import { CallFlowPanel } from "./CallFlowPanel";
import { CallGuideDrawer } from "./CallGuideDrawer";
import { NewLeadFlow } from "./NewLeadFlow";
import { ExistingClientFlow } from "./ExistingClientFlow";
import { AdvocacyCaseFlow } from "./AdvocacyCaseFlow";
import { WrapUpCallSection } from "./WrapUpCallSection";
import { RequestCallbackModal } from "./RequestCallbackModal";
import DiscoveryCall from "@/pages/DiscoveryCall";
import { toast } from "sonner";

interface CallWorkspaceProps {
  onAddNewContactRequest?: () => void;
  onCallInQuo?: (phone: string, name?: string) => void;
  onCloseWorkspace?: () => void;
}

export const CallWorkspace: React.FC<CallWorkspaceProps> = ({
  onAddNewContactRequest,
  onCloseWorkspace,
}) => {
  const { call, setGeneralNotes } = useActiveCall();

  // Drawer / Modal states
  const [guideDrawerOpen, setGuideDrawerOpen] = useState(false);
  const [callbackModalOpen, setCallbackModalOpen] = useState(false);

  const scrollToWrapUp = () => {
    const el = document.getElementById("wrap-up-call-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("ring-2", "ring-[#C5A059]", "transition-all", "duration-500");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-[#C5A059]");
      }, 1500);
    }
  };

  const isDiscoveryMode = call.callerCategory === "discovery_call" || call.callType === "Discovery Call";
  const isLeadMode = (call.callerCategory === "new_lead" || call.callerCategory === "lead" || call.callType === "New Lead / Sales") && !isDiscoveryMode;
  const isExistingClient = (call.callerCategory === "existing_client" || call.callerCategory === "client" || call.callType === "Current Client") && !isDiscoveryMode;
  const isAdvocacyCase = call.callType === "Advocacy / Case Question" && !isDiscoveryMode;

  return (
    <div id="call-workspace" className="space-y-6 scroll-mt-6 select-none">
      {/* Top Banner: Call Workspace Workflow Header */}
      <div className="relative overflow-hidden rounded-2xl border border-[#3A2C18] bg-[#05142B]/95 p-6 shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge className="bg-[#020A17] text-[#FFE394] border border-[#3A2C18] text-xs px-3 py-1 font-bold">
                OPERATIONAL WORKSPACE
              </Badge>
              <PageIdBadge id="PG-018" />
              {onCloseWorkspace && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onCloseWorkspace}
                  className="h-6 px-2 text-xs text-[#A69371] hover:text-[#FFF4D4] hover:bg-[#07162B] rounded-lg ml-2 cursor-pointer"
                >
                  <ChevronUp className="h-3.5 w-3.5 mr-1" />
                  Hide Workspace
                </Button>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#FFF4D4] tracking-tight flex items-center gap-3">
              <PhoneCall className="h-7 w-7 text-[#C5A059]" />
              <span>CALL WORKSPACE</span>
            </h1>
            <p className="text-sm text-[#C6B697] mt-1 max-w-2xl leading-relaxed">
              Waypoint CRM is the workflow brain around the phone call. Identify the caller, select the reason, follow the guided SOP, and log follow-up actions effortlessly.
            </p>
          </div>

          {/* Workflow Breadcrumb Indicator */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-[#020A17] p-3 rounded-xl border border-[#3A2C18] text-xs shadow-inner">
            <div className="flex items-center gap-1.5">
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  call.callerCategory
                    ? "bg-[#04241B] text-[#6EE7B7] border border-[#059669]"
                    : "bg-[#2D1B00] text-[#FDE047] border border-[#A35900] animate-pulse"
                }`}
              >
                1
              </div>
              <span className={call.callerCategory ? "text-[#6EE7B7] font-semibold" : "text-[#FFE394] font-medium"}>
                Who is this?
              </span>
            </div>

            <span className="text-[#3A2C18] hidden sm:inline">→</span>

            <div className="flex items-center gap-1.5">
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  call.callType
                    ? "bg-[#04241B] text-[#6EE7B7] border border-[#059669]"
                    : call.callerCategory
                    ? "bg-[#2D1B00] text-[#FDE047] border border-[#A35900] animate-pulse"
                    : "bg-[#000814] text-[#A69371] border border-[#3A2C18]"
                }`}
              >
                2
              </div>
              <span className={call.callType ? "text-[#6EE7B7] font-semibold" : call.callerCategory ? "text-[#FFE394] font-medium" : "text-[#A69371]"}>
                Why calling?
              </span>
            </div>

            <span className="text-[#3A2C18] hidden sm:inline">→</span>

            <div className="flex items-center gap-1.5">
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  call.callType
                    ? "bg-gradient-to-r from-[#DFBE77] to-[#C5A059] text-[#07162B]"
                    : "bg-[#000814] text-[#A69371] border border-[#3A2C18]"
                }`}
              >
                3
              </div>
              <span className={call.callType ? "text-[#FFE394] font-semibold" : "text-[#A69371]"}>
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
      {isDiscoveryMode && (
        <div className="animate-in fade-in slide-in-from-top-3 duration-300 space-y-4">
          {call.leadId ? (
            <div className="rounded-2xl border border-[#3A2C18] bg-[#05142B] p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-4 border-b border-[#3A2C18] pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#020A17] text-[#FFE394] border border-[#3A2C18] text-xs font-bold">
                    ACTIVE DISCOVERY CALL CANVAS
                  </Badge>
                  <span className="text-xs text-[#C6B697] font-mono">PG-018 ↔ PG-003-DC Embedded</span>
                </div>
                <div className="text-xs text-[#A69371]">
                  Real-time synchronization with Lead Center and student records.
                </div>
              </div>
              <DiscoveryCall
                leadId={call.leadId}
                embedded={true}
                onCallCompleted={() => {
                  toast.success("Discovery call completed and synced to lead record!");
                  scrollToWrapUp();
                }}
              />
            </div>
          ) : (
            <div className="p-8 rounded-2xl border border-[#3A2C18] bg-[#020A17] text-center space-y-3 shadow-xl">
              <div className="w-12 h-12 rounded-xl bg-[#000814] border border-[#3A2C18] flex items-center justify-center text-[#C5A059] mx-auto">
                <PhoneCall className="h-6 w-6" />
              </div>
              <h3 className="text-base font-serif font-bold text-[#FFF4D4]">Select a Lead to Activate Discovery Call</h3>
              <p className="text-xs text-[#C6B697] max-w-md mx-auto leading-relaxed">
                Choose the prospective parent or scheduled call in Section 1 above to load their student record, custom discovery questionnaire, and pricing workflows.
              </p>
            </div>
          )}
        </div>
      )}

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
      <Card className="p-5 rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileEdit className="h-4 w-4 text-[#C5A059]" />
            <h3 className="text-sm font-serif font-bold text-[#FFF4D4] tracking-tight">
              General Call Notes
            </h3>
          </div>
          <span className="text-xs text-[#A69371]">Auto-saved to active session</span>
        </div>

        <textarea
          rows={3}
          value={call.generalNotes || ""}
          onChange={(e) => setGeneralNotes(e.target.value)}
          placeholder="Document general conversation notes, parent comments, or advocate recommendations here..."
          className="w-full text-xs rounded-xl bg-[#020A17] border border-[#3A2C18] p-3 text-[#FFF4D4] placeholder:text-[#A69371] focus:outline-hidden focus:border-[#C5A059] resize-y"
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
