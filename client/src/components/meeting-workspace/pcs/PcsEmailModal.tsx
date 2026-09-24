import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Copy, Send, Edit3, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface PcsEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  parentEmail?: string;
  statementContent: string;
  onRecordEmailSent: (details: { recipientEmail: string; subject: string }) => void;
}

export function PcsEmailModal({
  isOpen,
  onClose,
  studentName,
  parentEmail = "",
  statementContent,
  onRecordEmailSent,
}: PcsEmailModalProps) {
  const [recipient, setRecipient] = useState(parentEmail || "parent@example.com");
  const [subject, setSubject] = useState(`Draft Parent Concern Statement — ${studentName}`);
  const [introText, setIntroText] = useState(
    "Please review and revise the following draft of your Parent Concern Statement to ensure it accurately reflects your perspective before sending it to your child’s case manager."
  );
  const [isEditingBody, setIsEditingBody] = useState(false);
  const [customBody, setCustomBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Sync recipient when parentEmail changes
  React.useEffect(() => {
    if (parentEmail) {
      setRecipient(parentEmail);
    }
  }, [parentEmail]);

  const activeStatementText = customBody || statementContent;

  const fullEmailContent = `Subject: ${subject}
To: ${recipient}

Hello,

${introText}

------------------------------------------------------------
PARENT CONCERN STATEMENT
------------------------------------------------------------
${activeStatementText}

------------------------------------------------------------
Warmly,
Waypoint Advocates Team`;

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(fullEmailContent);
    toast.success("Complete email copied to clipboard!");
  };

  const handleSendToParent = async () => {
    if (!recipient.trim() || !recipient.includes("@")) {
      toast.error("Please enter a valid recipient parent email address.");
      return;
    }

    setIsSending(true);
    // Simulate sending email to parent
    await new Promise((resolve) => setTimeout(resolve, 600));
    setIsSending(false);

    onRecordEmailSent({
      recipientEmail: recipient.trim(),
      subject: subject.trim(),
    });

    toast.success(`Draft emailed to parent (${recipient.trim()})! History updated.`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-[#07182E] border border-[#1A4578] text-slate-100 shadow-2xl p-4 sm:p-5 flex flex-col gap-3">
        <DialogHeader className="space-y-1 pb-2.5 border-b border-[#183E6C] shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <Mail className="w-4 h-4 text-blue-300" />
            </span>
            <DialogTitle className="text-base font-bold text-white tracking-wide">
              Draft Parent Concern Statement
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-400 leading-normal">
            Please review and revise the following draft of your Parent Concern Statement to ensure it accurately reflects your perspective before sending it to your child’s case manager.
          </DialogDescription>
        </DialogHeader>

        {/* Form Fields */}
        <div className="space-y-2.5 pt-1">
          {/* Recipient & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Parent / Client Email</label>
              <Input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="parent@example.com"
                className="h-7 text-xs bg-[#051324] border-[#183D68] text-slate-100 focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Email Subject</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email Subject"
                className="h-7 text-xs bg-[#051324] border-[#183D68] text-slate-100 focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Intro Text */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Introductory Instruction</label>
            <Textarea
              value={introText}
              onChange={(e) => setIntroText(e.target.value)}
              rows={2}
              className="text-xs bg-[#051324] border-[#183D68] text-slate-200 focus:ring-1 focus:ring-blue-400 leading-relaxed min-h-[50px] max-h-[80px]"
            />
          </div>

          {/* Statement Preview / Edit */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-300">
                Advocate-Facing Parent Concern Statement Draft
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (!isEditingBody && !customBody) {
                    setCustomBody(statementContent);
                  }
                  setIsEditingBody(!isEditingBody);
                }}
                className="h-6 text-[10px] text-blue-300 hover:text-white p-1 gap-1 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
                <span>{isEditingBody ? "Finish Editing" : "Edit Email"}</span>
              </Button>
            </div>

            {isEditingBody ? (
              <Textarea
                value={activeStatementText}
                onChange={(e) => setCustomBody(e.target.value)}
                className="min-h-[110px] max-h-[160px] text-xs font-sans bg-[#040E1B] border-[#1A4578] text-slate-100 p-2.5 rounded-lg leading-relaxed focus:ring-1 focus:ring-blue-400 resize-y"
              />
            ) : (
              <div className="max-h-[120px] overflow-y-auto p-2.5 rounded-lg bg-[#040E1B] border border-[#163860] text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
                {activeStatementText || "No statement text available."}
              </div>
            )}
          </div>

          {/* Safe Guardrail Notice */}
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10.5px] text-amber-300 flex items-start gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#F5B544] flex-shrink-0 mt-0.5" />
            <span>
              <strong>Advocate Note:</strong> This sends the working draft to the parent for their personal review. It is
              NOT sent to the school district, and will NOT be automatically marked as Final or Approved.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-[#183E6C] mt-1 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyEmail}
            className="text-xs border-slate-700 bg-slate-900/60 text-slate-300 hover:text-white gap-1.5 cursor-pointer h-8"
          >
            <Copy className="w-3.5 h-3.5 text-[#F5B544]" />
            <span>Copy</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 cursor-pointer h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSendToParent}
              disabled={isSending}
              className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold gap-1.5 shadow-md cursor-pointer disabled:opacity-50 h-8"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? "Sending..." : "Send to Parent"}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
