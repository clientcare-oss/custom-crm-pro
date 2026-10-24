import React, { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FamilyEnrollmentApprovalModal } from "@/components/enrollment/FamilyEnrollmentApprovalModal";

import {
  CalendarClock,
  Sparkles,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  DollarSign,
  FileText,
  User,
  ShieldCheck,
  PhoneCall,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DiscoveryCallItem {
  id: number;
  leadId: number;
  contactId: number | null;
  appointmentId: number | null;
  studentContactId: number | null;
  status: string | null;
  currentStepId: number | null;
  scheduledAt: string | Date | null;
  pricingNotes: string | null;
  callScriptNotes: string | null;
  theirStoryNotes: string | null;
  questionNotes: string | null;
  closingResponse: string | null;
  additionalNotes: string | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
  leadParentName: string | null;
  leadStudentName: string | null;
  leadStatus: string | null;
}

interface ContactDiscoveryTabProps {
  contactId: number;
  contactName: string;
  discoveryCalls: DiscoveryCallItem[];
  isLoading?: boolean;
}

export default function ContactDiscoveryTab({
  contactId,
  contactName,
  discoveryCalls,
  isLoading,
}: ContactDiscoveryTabProps) {
  const [, setLocation] = useLocation();
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-[#C6B697] space-y-2">
        <CalendarClock className="w-8 h-8 mx-auto animate-pulse text-[#C5A059]" />
        <p className="text-sm">Loading family discovery records...</p>
      </div>
    );
  }

  if (!discoveryCalls || discoveryCalls.length === 0) {
    return (
      <Card className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85)] p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-[#102B4E] border border-[#C5A059]/40 flex items-center justify-center mx-auto text-[#FFE394]">
          <CalendarClock className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-serif font-bold text-[#FFF4D4]">No Discovery Calls Recorded</h3>
          <p className="text-xs text-[#C6B697] max-w-md mx-auto">
            {contactName} has not completed an initial Discovery Call session yet. Once scheduled or logged via Lead Center or Call Center, discovery notes, pricing discussions, and session history will appear here.
          </p>
        </div>
        <div className="pt-2 flex justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/leads")}
            className="text-xs font-semibold border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] rounded-xl"
          >
            Go to Lead Center
          </Button>
          <Button
            size="sm"
            onClick={() => setLocation("/calendar")}
            className="text-xs font-bold rounded-xl bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-110"
          >
            <Calendar className="w-3.5 h-3.5 mr-1.5" /> Schedule Discovery Call
          </Button>
        </div>
      </Card>
    );
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "Completed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Discovery Completed
          </span>
        );
      case "In Progress":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-950/80 text-blue-300 border border-blue-500/40">
            <Clock className="w-3 h-3 text-blue-400" /> In Progress
          </span>
        );
      case "Lost":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-950/80 text-red-300 border border-red-500/40">
            <AlertCircle className="w-3 h-3 text-red-400" /> Closed / Archived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/40">
            <Clock className="w-3 h-3 text-amber-400" /> {status || "Preparing"}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Overview Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#05142B]/90 border border-[#3A2C18] shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
        <div>
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-[#C5A059]" />
            <h3 className="text-base font-serif font-bold text-[#FFF4D4]">Family Discovery Journey</h3>
          </div>
          <p className="text-xs text-[#C6B697] mt-0.5">
            Preserved discovery sessions, family intake assessments, and pricing discussions for this household.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-[#102B4E] border border-[#C5A059]/40 text-[#FFE394] font-semibold text-xs px-2.5 py-1">
            {discoveryCalls.length} {discoveryCalls.length === 1 ? "Session" : "Sessions"}
          </Badge>
          <Button
            size="sm"
            onClick={() => setIsApprovalModalOpen(true)}
            className="text-xs font-semibold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] rounded-xl gap-1.5 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Approve for Enrollment
          </Button>
          <Button
            size="sm"
            onClick={() => setLocation(`/leads`)}
            className="text-xs font-semibold border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] rounded-xl"
          >
            Lead Center
          </Button>
        </div>
      </div>

      {/* Discovery Call Cards */}
      <div className="space-y-3">
        {discoveryCalls.map((call) => {
          const dateStr = call.scheduledAt
            ? new Date(call.scheduledAt).toLocaleString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })
            : call.createdAt
            ? new Date(call.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "Date Not Recorded";

          return (
            <Card
              key={call.id}
              className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 shadow-[0_8px_24px_rgba(0,0,0,0.85)] overflow-hidden transition-all hover:border-[#C5A059]/60"
            >
              {/* Card Header */}
              <div className="p-4 sm:p-5 border-b border-[#3A2C18]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#07162B]/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-serif font-bold text-sm text-[#FFF4D4]">
                      Discovery Session #{call.id}
                    </span>
                    {getStatusBadge(call.status)}
                    {call.leadStudentName && (
                      <span className="text-xs text-[#FFE394] bg-[#020A17] border border-[#3A2C18] px-2 py-0.5 rounded-full flex items-center gap-1">
                        <User className="w-3 h-3 text-[#C5A059]" /> Student: {call.leadStudentName}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#C6B697] flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#C5A059]" /> {dateStr}
                    </span>
                    {call.appointmentId && (
                      <span className="text-emerald-400 font-medium">
                        • Linked Calendar Apt #{call.appointmentId}
                      </span>
                    )}
                    {call.leadStatus && (
                      <span>
                        • Lead Status: <strong className="text-[#FFE394]">{call.leadStatus}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Primary & Contextual Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation(`/leads/${call.leadId}/discovery`)}
                    className="rounded-xl border-[#C5A059]/60 bg-[#102B4E] text-[#FFE394] hover:bg-[#1a3d6d] hover:text-white text-xs font-semibold gap-1.5 shadow-md"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#C5A059]" /> Open Discovery Call Console
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    title="Enrollment approval will be unlocked in Phase 2"
                    className="rounded-xl border-[#3A2C18] bg-[#020A17]/80 text-[#C6B697] opacity-75 cursor-not-allowed text-xs font-semibold hidden md:inline-flex"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1 text-[#C5A059]" /> Approve for Enrollment (Phase 2)
                  </Button>
                </div>
              </div>

              {/* Card Body: Discussion Notes & Pricing */}
              <CardContent className="p-4 sm:p-5 space-y-3.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Family Story & Situation */}
                  <div className="p-3 rounded-xl bg-[#020A17]/80 border border-[#3A2C18]/60 space-y-1.5">
                    <span className="text-[11px] font-semibold text-[#FFE394] uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#C5A059]" /> Their Story & Situation
                    </span>
                    <p className="text-xs text-[#FFF4D4]/90 whitespace-pre-wrap leading-relaxed">
                      {call.theirStoryNotes || call.callScriptNotes || (
                        <span className="text-[#C6B697]/60 italic">No situation notes entered for this session.</span>
                      )}
                    </p>
                  </div>

                  {/* Pricing Discussions & Recommendations */}
                  <div className="p-3 rounded-xl bg-[#020A17]/80 border border-[#3A2C18]/60 space-y-1.5">
                    <span className="text-[11px] font-semibold text-[#FFE394] uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-[#C5A059]" /> Pricing & Service Discussions
                    </span>
                    <p className="text-xs text-[#FFF4D4]/90 whitespace-pre-wrap leading-relaxed">
                      {call.pricingNotes || (
                        <span className="text-[#C6B697]/60 italic">No custom pricing notes entered for this session.</span>
                      )}
                    </p>
                    {call.closingResponse && (
                      <div className="pt-2 mt-2 border-t border-[#3A2C18]/40 text-xs">
                        <span className="text-[#C6B697]">Parent Response: </span>
                        <strong className="text-[#FFE394]">{call.closingResponse}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional / Next Steps Notes */}
                {(call.additionalNotes || call.questionNotes) && (
                  <div className="p-3 rounded-xl bg-[#020A17]/60 border border-[#3A2C18]/40 space-y-1">
                    <span className="text-[11px] font-semibold text-[#C6B697] uppercase tracking-wider">
                      Assessment & Next Step Notes
                    </span>
                    <p className="text-xs text-[#FFF4D4]/80 whitespace-pre-wrap leading-relaxed">
                      {call.additionalNotes || call.questionNotes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Shared Family Enrollment Approval Modal */}
      <FamilyEnrollmentApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        parentContactId={contactId}
        familyName={contactName}
      />
    </div>
  );
}
