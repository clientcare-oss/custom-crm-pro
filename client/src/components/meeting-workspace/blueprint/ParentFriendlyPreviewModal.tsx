import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Printer, Mail, HeartHandshake, Target, Lightbulb, FileBarChart2, X, Check, Copy } from "lucide-react";
import type { MeetingTarget } from "../types";
import { openPrintDialog } from "../print/PrintableMeetingDocument";
import { toast } from "sonner";

interface ParentFriendlyPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  meetingType: string;
  meetingDate: string;
  targets: MeetingTarget[];
  clientEmail?: string;
}

export function ParentFriendlyPreviewModal({
  isOpen,
  onClose,
  studentName,
  meetingType,
  meetingDate,
  targets,
  clientEmail = "",
}: ParentFriendlyPreviewModalProps) {
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  const [emailTo, setEmailTo] = useState(clientEmail);
  const [emailSubject, setEmailSubject] = useState(`${studentName}'s Upcoming ${meetingType} — Meeting Blueprint & Strategy`);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handlePrint = () => {
    openPrintDialog("PARENT_BLUEPRINT", studentName, meetingType, meetingDate, targets);
  };

  const handleOpenEmailDialog = () => {
    setEmailTo(clientEmail || "");
    setShowEmailConfirm(true);
  };

  const handleSendEmail = async () => {
    if (!emailTo.trim()) {
      toast.error("Please enter a valid recipient email address.");
      return;
    }
    setIsSendingEmail(true);
    // Simulate deliberate email dispatch
    await new Promise((r) => setTimeout(r, 800));
    setIsSendingEmail(false);
    setShowEmailConfirm(false);
    toast.success(`Meeting Blueprint sent successfully to ${emailTo}`);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] bg-[#07172C] border border-[#144E8A] text-white p-0 overflow-hidden flex flex-col shadow-2xl">
          {/* Header */}
          <div className="p-5 border-b border-[#0E3E75] bg-gradient-to-r from-[#0B3767] via-[#0A254D] to-[#071C3C] flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-400">
                  <HeartHandshake className="h-4 w-4" />
                </span>
                <DialogTitle className="text-lg font-bold text-white tracking-wide">
                  Parent-Friendly Preview · Meeting Blueprint
                </DialogTitle>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-950/50 text-[10px] uppercase font-bold">
                  Client-Safe View
                </Badge>
              </div>
              <p className="text-xs text-blue-200/80">
                {studentName} · {meetingType} · {meetingDate} · {targets.length} Prepared Requests (Internal strategies, flags, and notes omitted)
              </p>
            </div>

            {/* Top Preview Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                onClick={handlePrint}
                className="h-8 text-xs font-bold bg-[#0D4B84] hover:bg-[#155C9E] text-white border border-[#206BBC] px-3 cursor-pointer shadow-md inline-flex items-center gap-1.5"
              >
                <Printer className="h-3.5 w-3.5 text-emerald-400" />
                <span>🖨️ Printer-Friendly Version</span>
              </Button>

              <Button
                type="button"
                onClick={handleOpenEmailDialog}
                className="h-8 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/40 px-3 cursor-pointer shadow-md inline-flex items-center gap-1.5"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>✉️ Email to Client</span>
              </Button>
            </div>
          </div>

          {/* Scrollable Parent Content */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-[#000820]">
            {/* Explanatory Banner */}
            <div className="p-4 rounded-xl bg-[#092244]/80 border border-[#144A7E] text-xs text-blue-200 leading-relaxed">
              <span className="font-bold text-white block mb-1">Parent & Family Roadmap</span>
              This preview reflects what the family sees: a clear, empowering breakdown of each request, the student need behind it, and supporting evidence in plain language. Internal advocate notes and dispute strategies are omitted.
            </div>

            {/* Target Items List */}
            <div className="space-y-4">
              {targets.map((target, idx) => {
                const whatWeWant = target.parentWhatWeWant || target.quickAdvocateSayThis || target.targetName;
                const whyWeWantIt = target.parentWhyWeWantIt || target.whyWeWantIt || "To support meaningful educational progress and access in the classroom.";
                const evidence = target.parentSupportingEvidence || target.supportingEvidence || "Observations, progress reports, and educational evaluations.";

                return (
                  <div
                    key={target.id}
                    className="bg-[#0B1E36] border border-[#103E70] rounded-xl p-5 shadow-lg space-y-3.5"
                  >
                    <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-[#0E3E75]">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h3 className="text-base font-bold text-white">{target.targetName}</h3>
                      </div>
                      <Badge variant="outline" className="border-[#144A7E] text-blue-300 bg-[#071C3C] text-[10.5px]">
                        {target.iepSection || "Accommodations"}
                      </Badge>
                    </div>

                    {/* 🎯 WHAT WE WANT */}
                    <div className="bg-[#092244] border border-emerald-500/30 rounded-lg p-3.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                        <Target className="w-3.5 h-3.5" />
                        <span>🎯 WHAT WE ARE REQUESTING</span>
                      </div>
                      <p className="text-xs font-semibold text-white leading-relaxed">
                        {whatWeWant}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* 💡 WHY WE WANT IT */}
                      <div className="bg-[#092244]/70 border border-[#103E70] rounded-lg p-3">
                        <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-[#F5B544] uppercase tracking-wider mb-1">
                          <Lightbulb className="w-3.5 h-3.5" />
                          <span>💡 WHY WE WANT IT</span>
                        </div>
                        <p className="text-xs text-blue-200 leading-relaxed">
                          {whyWeWantIt}
                        </p>
                      </div>

                      {/* 📊 WHAT SUPPORTS IT */}
                      <div className="bg-[#092244]/70 border border-[#103E70] rounded-lg p-3">
                        <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-blue-300 uppercase tracking-wider mb-1">
                          <FileBarChart2 className="w-3.5 h-3.5" />
                          <span>📊 WHAT SUPPORTS IT</span>
                        </div>
                        <p className="text-xs text-blue-200 leading-relaxed">
                          {evidence}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#0E3E75] bg-[#071C3C] flex items-center justify-between">
            <div className="text-xs text-blue-300/70">
              Parent-friendly output is optional and only shared upon intentional advocate action.
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs border-[#144A7E] bg-[#092244] text-white hover:bg-[#0E3E75] cursor-pointer"
            >
              Close Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email to Client Intentional Confirmation Modal */}
      <Dialog open={showEmailConfirm} onOpenChange={(open) => !open && setShowEmailConfirm(false)}>
        <DialogContent className="max-w-md bg-[#07172C] border border-[#144E8A] text-white p-5 shadow-2xl space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Mail className="h-4 w-4 text-emerald-400" />
              <span>Email Meeting Blueprint to Client</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <p className="text-blue-200/80">
              This action will send the clean, parent-friendly Meeting Blueprint directly to the family. Internal advocate strategy and notes will not be included.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-blue-300">Recipient Email Address:</label>
              <Input
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="parent@example.com"
                className="h-8 text-xs bg-[#030D1A] border-[#144E8A] text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-blue-300">Subject Line:</label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="h-8 text-xs bg-[#030D1A] border-[#144E8A] text-white"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-[#0E3E75]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowEmailConfirm(false)}
              className="text-xs border-[#144A7E] bg-[#092244] text-white cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSendEmail}
              disabled={isSendingEmail}
              className="text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white cursor-pointer inline-flex items-center gap-1.5"
            >
              <Mail className="h-3.5 w-3.5" />
              {isSendingEmail ? "Sending..." : "Send Email Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
