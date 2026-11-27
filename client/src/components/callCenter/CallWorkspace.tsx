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

  const isLeadMode =
    call.callerCategory === "new_lead" ||
    call.callerCategory === "lead" ||
    call.callType === "New Lead / Sales";
  const isExistingClient =
    (call.callerCategory === "existing_client" ||
      call.callerCategory === "client" ||
      call.callType === "Current Client") &&
    !isLeadMode;
  const isAdvocacyCase =
    call.callType === "Advocacy / Case Question" && !isLeadMode;

  return (
    <div id="call-workspace" className="space-y-6 scroll-mt-6 select-none">
      {/* Top Banner: Call Workspace Workflow Header */}
      <div className="adm-hero-card relative overflow-hidden rounded-[20px] p-6">
        <div aria-hidden="true" className="adm-rim-glint-top" />
        <div aria-hidden="true" className="adm-rim-glint-bottom" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge className="bg-[#061121] text-[#ECC97B] border border-[#8a7052]/65 text-xs px-3 py-1 font-bold">
                OPERATIONAL WORKSPACE
              </Badge>
              <PageIdBadge id="PG-018" />
              {onCloseWorkspace && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onCloseWorkspace}
                  className="adm-cal-pill h-7 px-2.5 text-xs text-[#D4DFEE] hover:text-[#FAF6EC] rounded-lg ml-2 cursor-pointer"
                >
                  <ChevronUp className="h-3.5 w-3.5 mr-1 text-[#ECC97B]" />
                  Hide Workspace
                </Button>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#FAF6EC] tracking-tight flex items-center gap-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
              <PhoneCall className="h-7 w-7 text-[#ECC97B]" />
              <span>CALL WORKSPACE</span>
            </h1>
            <p className="text-sm text-[#C6D4E6] mt-1 max-w-2xl leading-relaxed">
              Identify the caller, log communication, create a New Service Inquiry, or open an existing family’s record directly in the Lead Center.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 1 — IDENTIFY THE CALLER ("Who am I talking to?") */}
      <CallerIdentitySelector onAddNewContactRequest={onAddNewContactRequest} />

      {/* SPECIALIZED WORKFLOW PANELS BASED ON CALL TYPE & CATEGORY */}
      {isLeadMode && (
        <div className="animate-in fade-in slide-in-from-top-3 duration-300">
          <NewLeadFlow />
        </div>
      )}

      {/* SECTION 2 — CALL TYPE ("What is this call about?") */}
      <CallTypeSelector />

      {/* CALL FLOW SYSTEM — Step-by-Step Interactive Checklist */}
      <CallFlowPanel
        onOpenGuide={() => setGuideDrawerOpen(true)}
        onScrollToWrapUp={scrollToWrapUp}
      />

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
      <div className="adm-panel-card p-5 rounded-[20px] space-y-3 overflow-hidden">
        <div aria-hidden="true" className="adm-rim-glint-top" />
        <div aria-hidden="true" className="adm-rim-glint-bottom" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileEdit className="h-4 w-4 text-[#ECC97B]" />
            <h3 className="text-sm font-serif font-bold text-[#FAF6EC] tracking-tight">
              General Call Notes
            </h3>
          </div>
          <span className="text-xs text-[#9FB1C8]">Auto-saved to active session</span>
        </div>

        <textarea
          rows={3}
          value={call.generalNotes || ""}
          onChange={(e) => setGeneralNotes(e.target.value)}
          placeholder="Document general conversation notes, parent comments, or advocate recommendations here..."
          className="adm-input-field w-full text-xs rounded-xl p-3 placeholder:text-[#9FB1C8]/65 focus:outline-hidden resize-y"
        />
      </div>

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
