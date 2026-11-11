import React from "react";
import { useActiveCall } from "@/contexts/ActiveCallContext";
import { trpc } from "@/lib/trpc";
import { NewServiceInquiryForm } from "@/components/leads/NewServiceInquiryModal";
import { UserPlus } from "lucide-react";

export function NewLeadFlow() {
  const { call, updateCall } = useActiveCall();
  const utils = trpc.useUtils();

  return (
    <div
      className="p-5 rounded-2xl bg-[#05102B] border border-[#1E335C] space-y-4 animate-in fade-in shadow-xl"
      data-testid="call-center-new-service-inquiry"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-[#16284C]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#0C204B] border border-[#243B67] flex items-center justify-center text-[#D8B979]">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h4
              className="text-base font-serif font-bold text-white tracking-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              New Service Inquiry
            </h4>
            <p className="text-xs text-[#93A8C8]">
              Check for matching family records, capture inquiry details (supporting multiple students), and open directly in the Lead Center.
            </p>
          </div>
        </div>
      </div>

      <NewServiceInquiryForm
        initialPhone={call.callerInfo?.phone || ""}
        initialName={call.callerInfo?.name || ""}
        initialCallNotes={call.generalNotes || ""}
        onSuccess={(res) => {
          updateCall({
            leadId: res.leadId,
            contactId: res.parentContactId,
            wrapUp: {
              ...call.wrapUp,
              outcome: "Inquiry saved · Ready for discovery",
              finalNotes: call.wrapUp?.finalNotes || call.generalNotes || "Inquiry saved in Lead Center",
              followUpNeeded: call.wrapUp?.followUpNeeded ?? true,
              attachToType: "lead",
              attachToId: res.leadId,
            },
          });
          utils.leads.list.invalidate();
          utils.leads.listHydrated.invalidate();
        }}
      />
    </div>
  );
}
