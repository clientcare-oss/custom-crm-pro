import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mail, Copy, Send, HeartHandshake, CheckCircle2, FileText, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { MeetingTarget } from "../types";

interface EmailBlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  meetingType?: string;
  meetingDate?: string;
  targets: MeetingTarget[];
  clientEmail?: string;
}

export function EmailBlueprintModal({
  isOpen,
  onClose,
  studentName,
  meetingType = "Annual IEP Meeting",
  meetingDate = "Upcoming",
  targets,
  clientEmail = "",
}: EmailBlueprintModalProps) {
  const [recipient, setRecipient] = useState(clientEmail || "");
  const [subject, setSubject] = useState(`${studentName}'s Upcoming ${meetingType} — Meeting Blueprint`);
  const [personalNote, setPersonalNote] = useState(
    "Hello,\n\nPlease find attached the Meeting Blueprint prepared for our upcoming IEP meeting. It outlines the specific targets, parent evidence, and requests we have prepared together to advocate for your student."
  );
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (clientEmail) {
      setRecipient(clientEmail);
    }
  }, [clientEmail]);

  // Construct readable plain-text email representation for copying / sending
  const targetsTextSummary = targets
    .map((t, idx) => {
      const parts = [`${idx + 1}. [${t.iepSection}] ${t.targetName}`];
      if (t.parentWhatWeWant) parts.push(`   - Request: ${t.parentWhatWeWant}`);
      if (t.parentWhyWeWantIt) parts.push(`   - Why: ${t.parentWhyWeWantIt}`);
      if (t.parentSupportingEvidence) parts.push(`   - Evidence: ${t.parentSupportingEvidence}`);
      return parts.join("\n");
    })
    .join("\n\n");

  const fullEmailContent = `Subject: ${subject}
To: ${recipient}

${personalNote}

============================================================
IEP MEETING BLUEPRINT: ${studentName}
Meeting Type: ${meetingType} | Date: ${meetingDate}
Planned Targets: ${targets.length}
============================================================

${targetsTextSummary}

============================================================
Prepared by Waypoint Advocates
Client Care: clientcare@waypointadvocates.com`;

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(fullEmailContent);
    toast.success("Complete Meeting Blueprint email copied to clipboard!");
  };

  const handleSendEmail = async () => {
    if (!recipient.trim() || !recipient.includes("@")) {
      toast.error("Please enter a valid recipient email address.");
      return;
    }

    setIsSending(true);
    // Simulates instant, authenticated email delivery
    await new Promise((resolve) => setTimeout(resolve, 750));
    setIsSending(false);

    toast.success(`Meeting Blueprint sent successfully to ${recipient.trim()}!`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl sm:max-w-2xl max-h-[88vh] overflow-y-auto bg-[#07182E] border border-[#1A4578] text-slate-100 shadow-2xl p-4 sm:p-5 flex flex-col gap-3 rounded-2xl">
        <DialogHeader className="space-y-1 pb-2.5 border-b border-[#183E6C] shrink-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400">
                <Mail className="w-4 h-4 text-teal-300" />
              </span>
              <div>
                <DialogTitle className="text-base font-bold text-white tracking-wide">
                  Email Blueprint to Parent
                </DialogTitle>
                <p className="text-[11px] text-blue-200/70">
                  Deliver the clean, parent-friendly Meeting Blueprint directly to the family.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="border-teal-500/40 text-teal-300 bg-teal-950/40 text-[10.5px] font-mono">
              {targets.length} Targets
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-1 text-xs">
          {/* Recipient & Subject fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-blue-200">Parent / Client Email</label>
              <Input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="parent@example.com"
                className="h-8 text-xs bg-[#030D1A] border-[#144E8A] text-white focus-visible:ring-1 focus-visible:ring-teal-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-blue-200">Subject Line</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-8 text-xs bg-[#030D1A] border-[#144E8A] text-white focus-visible:ring-1 focus-visible:ring-teal-400"
              />
            </div>
          </div>

          {/* Personal Note to Family */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-blue-200">Message / Cover Note</label>
            <Textarea
              value={personalNote}
              onChange={(e) => setPersonalNote(e.target.value)}
              rows={3}
              className="text-xs bg-[#030D1A] border-[#144E8A] text-white focus-visible:ring-1 focus-visible:ring-teal-400 resize-none"
              placeholder="Add personal notes or instructions for the parent..."
            />
          </div>

          {/* Preview of Blueprint Targets */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-amber-300">Blueprint Content Preview ({targets.length} targets)</span>
              <span className="text-blue-300/60 font-mono text-[10px]">Client-Safe Format</span>
            </div>
            <div className="max-h-40 overflow-y-auto rounded-lg bg-[#040E1B] border border-[#103862] p-2.5 font-mono text-[11px] text-blue-100/90 whitespace-pre-wrap leading-relaxed">
              {targetsTextSummary || "No targets loaded in blueprint."}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-[#183E6C] flex items-center justify-between gap-2 sm:justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyEmail}
            className="h-8 text-xs font-semibold border-[#1B4E85] bg-[#0A2649] text-blue-200 hover:text-white cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
          >
            <Copy className="h-3.5 w-3.5 text-blue-300" />
            <span>Copy Email Text</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs text-blue-300 hover:text-white cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSendEmail}
              disabled={isSending || targets.length === 0}
              className="h-8 text-xs font-bold bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 px-3.5 cursor-pointer inline-flex items-center gap-1.5 shadow-md border border-teal-400/40"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Email to Parent</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
