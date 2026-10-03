import React from "react";
import { Zap } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeadCard } from "./LeadCard";
import type { LeadStatus } from "./types";

interface LeadPipelineColumnProps {
  status: LeadStatus;
  leads: any[];
  onEdit: (lead: any) => void;
  onBeginCall: (leadId: number) => void;
  onViewContact: (contactId: number) => void;
}

export function LeadPipelineColumn({
  status,
  leads,
  onEdit,
  onBeginCall,
  onViewContact,
}: LeadPipelineColumnProps) {
  return (
    <div className="w-[285px] shrink-0 flex flex-col rounded-2xl bg-[#05142B]/90 border border-[#3A2C18] shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] p-3.5 space-y-3">
      {/* Column Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 pb-1 border-b border-[#3A2C18]/60">
          <h3 className="font-serif font-bold text-[#FFF4D4] text-sm truncate" title={status}>
            {status}
          </h3>
          <span className="rounded-full bg-[#020A17] px-2 py-0.5 text-xs font-bold text-[#FFE394] shrink-0 border border-[#3A2C18] shadow-xs">
            {leads.length}
          </span>
        </div>

        {/* Email Template trigger for follow-up stages */}
        {status.includes("Follow-up") && (
          <div className="flex items-center gap-1.5 text-xs">
            <Zap className="size-3 text-[#C5A059] shrink-0" />
            <Select>
              <SelectTrigger className="h-7 text-xs bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] w-full min-w-0 rounded-lg focus:border-[#C5A059]">
                <SelectValue placeholder="Select email template" />
              </SelectTrigger>
              <SelectContent className="bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs">
                <SelectItem value="template1">Template 1 - Initial Check-in</SelectItem>
                <SelectItem value="template2">Template 2 - Resource Follow-up</SelectItem>
                <SelectItem value="template3">Template 3 - Consultation Invite</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Cards List */}
      <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-320px)] pr-0.5 no-scrollbar">
        {leads.length > 0 ? (
          leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              status={status}
              onEdit={onEdit}
              onBeginCall={onBeginCall}
              onViewContact={onViewContact}
            />
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-[#3A2C18] bg-[#020A17]/40 p-4 text-center">
            <p className="text-xs text-[#A69371]">
              No leads in this stage
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
