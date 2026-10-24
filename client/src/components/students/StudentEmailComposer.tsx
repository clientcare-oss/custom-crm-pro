import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Send, X, Plus, Paperclip, Smile, Link2, Image, Calendar,
  DollarSign, FileSignature, ChevronDown, Wand2, Sparkles,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Code, Minus, Undo2, Check, FileText,
  UserCheck, Shield, Clock, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StudentEmailComposerProps {
  studentId: number;
  fullName: string;
  parentName?: string;
  parentEmail?: string;
  caseId?: string;
  defaultSubject?: string;
  defaultBody?: string;
  onClose: () => void;
  onSendSuccess: (sentData: { subject: string; content: string; recipients: string[] }) => void;
}

interface StandardTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
}

const ADVOCATE_STANDARD_TEMPLATES: StandardTemplate[] = [
  {
    id: "iep-availability",
    name: "1:1 Client & Advocate Strategy Session",
    category: "Scheduling",
    subject: "1:1 Client & Advocate Strategy Session Availability — {{student_first_name}}",
    body: `Hi {{parent_name}},

Thank you for reaching out regarding {{student_first_name}}'s case. I've opened several priority strategy slots on my calendar for us to review current IEP accommodations, draft our team meeting agenda, and ensure our advocacy position is fully prepared.

1:1 CLIENT AND ADVOCATE ONLY [NON IEP] [CLIENT TOOL] | 60 minutes
Time zone: EDT

Please select your preferred time slot using our secure calendar link, or let me know if none of these work for your schedule.

Warm regards,
Byron Honea
Lead Special Education Advocate · Waypoint Advocates`,
  },
  {
    id: "pwn-demand",
    name: "Prior Written Notice (PWN) Formal Demand",
    category: "Statutory & Legal",
    subject: "Formal Demand for Prior Written Notice (PWN) — {{student_first_name}}",
    body: `Dear School IEP Team & Special Education Administration,

Pursuant to 34 C.F.R. § 300.503 and Georgia Special Education Rules, we hereby request formal Prior Written Notice (PWN) regarding the district's recent decision concerning educational programming and accommodations for {{student_first_name}}.

Specifically, please document:
1. The exact action proposed or refused by the district;
2. An explanation of why the agency proposes or refuses to take the action;
3. A description of each evaluation procedure, assessment, record, or report used as a basis for the decision;
4. The other options considered and reasons why those options were rejected.

We look forward to receiving the formal PWN within statutory timelines.

Sincerely,
Byron Honea
Lead Special Education Advocate · Waypoint Advocates`,
  },
  {
    id: "ferpa-records",
    name: "FERPA Comprehensive Records Request",
    category: "Records & Due Process",
    subject: "FERPA & IDEA Request for Complete Cumulative & Psychological File — {{student_first_name}}",
    body: `To the Custodian of Student Records:

Under the Family Educational Rights and Privacy Act (FERPA, 34 C.F.R. § 99.10) and IDEA (34 C.F.R. § 300.613), {{parent_name}} and Waypoint Advocates hereby request an unredacted copy of {{student_first_name}}'s complete educational file.

This request includes:
- Cumulative academic files and progress monitoring logs
- All psychoeducational, OT, PT, speech/language, and sensory evaluations
- Section 504 and IEP documents (drafts, finals, and amendments)
- Discipline records, manifestation determinations, and attendance records
- Internal educator emails and correspondence concerning {{student_first_name}}

Please provide an electronic copy within statutory timelines.

Respectfully,
Waypoint Advocates`,
  },
  {
    id: "iee-request",
    name: "Independent Educational Evaluation (IEE) Request",
    category: "Evaluations",
    subject: "Request for Independent Educational Evaluation (IEE) at Public Expense — {{student_first_name}}",
    body: `Dear Director of Special Education,

Please be advised that the parent, {{parent_name}}, disagrees with the district's recent triennial/psychoeducational evaluation of {{student_first_name}}. 

Pursuant to 34 C.F.R. § 300.502, we hereby request an Independent Educational Evaluation (IEE) at public expense in all areas of suspected disability, including comprehensive neuropsychological and sensory processing assessments.

Please provide the district's IEE criteria and list of qualified examiners without unnecessary delay.

Sincerely,
Byron Honea
Lead Special Education Advocate · Waypoint Advocates`,
  },
  {
    id: "post-meeting-summary",
    name: "Post-Meeting Written Summary & Agreements",
    category: "Follow-Up",
    subject: "Post-IEP Conference Summary & Disputed Items Record — {{student_first_name}}",
    body: `Dear IEP Team and {{parent_name}},

This communication memorializes the consensus reached and items remaining in dispute during today's case conference for {{student_first_name}}.

Agreed Accommodations:
- Extended testing time (1.5x) in a quiet setting
- Sensory break accommodations as outlined in Section 4

Items Pending Written PWN / District Determination:
- Direct 1:1 paraprofessional support during unstructured transition blocks
- Clarification of assistive technology evaluation timeline

Please confirm receipt of this memorialization for the student's cumulative record.

Best regards,
Byron Honea
Lead Special Education Advocate · Waypoint Advocates`,
  },
];

export function StudentEmailComposer({
  studentId,
  fullName,
  parentName = "Sample Parent",
  parentEmail = "parent@clientcare.com",
  caseId,
  defaultSubject,
  defaultBody,
  onClose,
  onSendSuccess,
}: StudentEmailComposerProps) {
  const studentFirstName = fullName.split(" ")[0] || fullName;
  
  // Recipient list
  const [recipients, setRecipients] = useState<string[]>([parentName || "Sample Parent"]);
  const [newRecipientInput, setNewRecipientInput] = useState("");
  const [isAddingRecipient, setIsAddingRecipient] = useState(false);

  // Email Fields
  const [subject, setSubject] = useState(defaultSubject || "Re: ");
  const [body, setBody] = useState(defaultBody || "");
  const [attachments, setAttachments] = useState<string[]>([]);

  // UI Menus & Toggles
  const [showTemplatesMenu, setShowTemplatesMenu] = useState(false);
  const [showFormattingBar, setShowFormattingBar] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMergeTagsMenu, setShowMergeTagsMenu] = useState(false);
  const [showToneMenu, setShowToneMenu] = useState(false);
  const [showAskInput, setShowAskInput] = useState(false);
  const [askPrompt, setAskPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [selectedFont, setSelectedFont] = useState("Default");
  const [selectedSize, setSelectedSize] = useState("16");
  const [sendTypeDropdown, setSendTypeDropdown] = useState(false);

  // Server templates query
  const { data: dbTemplates = [] } = trpc.emailTemplates.list.useQuery(undefined, {
    retry: false,
  });

  const aiAssistMutation = trpc.emailTemplates.aiAssist.useMutation({
    onSuccess: (data) => {
      if (data?.revisedContent) {
        setBody(data.revisedContent);
        toast.success("AI draft updated!");
      }
      setIsAiLoading(false);
      setShowAskInput(false);
      setShowToneMenu(false);
    },
    onError: (err) => {
      toast.error("AI Assist notice: " + err.message);
      setIsAiLoading(false);
    },
  });

  const removeRecipient = (name: string) => {
    if (recipients.length <= 1) {
      toast.error("Must have at least one recipient");
      return;
    }
    setRecipients(recipients.filter((r) => r !== name));
  };

  const addRecipient = () => {
    if (newRecipientInput.trim()) {
      setRecipients([...recipients, newRecipientInput.trim()]);
      setNewRecipientInput("");
      setIsAddingRecipient(false);
    }
  };

  const applyTemplate = (template: { subject: string; body: string }) => {
    // Resolve merge tags
    const resolveTags = (text: string) =>
      text
        .replace(/\{\{student_first_name\}\}/g, studentFirstName)
        .replace(/\{\{student_name\}\}/g, fullName)
        .replace(/\{\{parent_name\}\}/g, parentName)
        .replace(/\{\{case_id\}\}/g, String(caseId || studentId));

    setSubject(resolveTags(template.subject));
    setBody(resolveTags(template.body));
    setShowTemplatesMenu(false);
    toast.success("Applied template: " + template.subject.slice(0, 30) + "…");
  };

  const insertVariable = (tag: string) => {
    setBody((prev) => prev + " " + tag + " ");
    setShowMergeTagsMenu(false);
  };

  const insertEmoji = (emoji: string) => {
    setBody((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const insertAvailabilityBlock = () => {
    const schedulingSnippet = `\n\n1:1 CLIENT AND ADVOCATE ONLY [NON IEP] [CLIENT TOOL] | 60 minutes\nTime zone: EDT\n\nUpcoming Slots:\n• Mon, Aug 31 | 09:00 am   10:00 am   11:00 am\n• Tue, Sep 01 | 01:30 pm   03:00 pm\n\n[Click here to view all availability and book a slot]\n`;
    setBody((prev) => prev + schedulingSnippet);
    toast.success("Inserted calendar availability block");
  };

  const insertSmartFileLink = () => {
    const linkSnippet = `\n\n[Waypoint Smart File: Educational Rights Agreement & Retainer Scope]\nhttps://custom-crm-pro.clientcare-fa6.workers.dev/smart-files/client-view/${studentId}\n`;
    setBody((prev) => prev + linkSnippet);
    toast.success("Inserted Smart File link");
  };

  const insertInvoiceLink = () => {
    const invoiceSnippet = `\n\n[Waypoint Advocacy Retainer Invoice #INV-${caseId || studentId}]\nAmount Due: $750.00 · Secure Online Payment: https://custom-crm-pro.clientcare-fa6.workers.dev/receipt/${studentId}\n`;
    setBody((prev) => prev + invoiceSnippet);
    toast.success("Inserted invoice link");
  };

  const handleAiAction = (action: "ask" | "shorten" | "improveClarity", prompt?: string) => {
    if (!body.trim() && action !== "ask") {
      toast.error("Please type some message text first");
      return;
    }
    setIsAiLoading(true);
    aiAssistMutation.mutate({
      action,
      content: body,
      prompt: prompt || askPrompt,
      studentName: fullName,
    });
  };

  const handleToneChange = (tone: "firm_advocate" | "friendly_reassuring" | "assertive_procedural" | "concise") => {
    if (!body.trim()) {
      toast.error("Please type some message text first");
      return;
    }
    setIsAiLoading(true);
    aiAssistMutation.mutate({
      action: "changeTone",
      content: body,
      tone,
      studentName: fullName,
    });
  };

  const handleSend = () => {
    if (!body.trim()) {
      toast.error("Message body cannot be empty");
      return;
    }
    onSendSuccess({
      subject,
      content: body,
      recipients,
    });
    toast.success("Email dispatched to " + recipients.join(", "));
    onClose();
  };

  const simulateAttachment = () => {
    const filename = prompt("Enter simulated document or attachment name:", "Prior_Written_Notice_Extract.pdf");
    if (filename && filename.trim()) {
      setAttachments([...attachments, filename.trim()]);
      toast.success("Attached " + filename.trim());
    }
  };

  return (
    <div className="w-full bg-[#05142B] border border-[#3A2C18] rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.06)] overflow-hidden transition-all duration-200">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[#3A2C18]/80 bg-[#07162B]">
        {/* Recipient Chips & Label */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Logo seal */}
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#9E7D3B] to-[#FFE394] p-0.5 shadow-sm shrink-0">
            <div className="w-full h-full rounded-full bg-[#07162B] flex items-center justify-center text-[#FFE394] font-bold text-[10px]">
              W
            </div>
          </div>

          <span className="font-semibold text-[#C6B697] ml-1">Reply to:</span>

          {/* Recipient Pills */}
          {recipients.map((recip) => (
            <span
              key={recip}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0E274A] border border-[#C5A059]/40 text-[#FFF4D4] font-medium text-xs shadow-xs"
            >
              <span>{recip}</span>
              <button
                type="button"
                onClick={() => removeRecipient(recip)}
                className="hover:text-red-400 transition-colors cursor-pointer text-white/50"
                title="Remove recipient"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {/* Add recipient (+) */}
          {isAddingRecipient ? (
            <div className="inline-flex items-center gap-1">
              <input
                type="text"
                value={newRecipientInput}
                onChange={(e) => setNewRecipientInput(e.target.value)}
                placeholder="Name or email…"
                className="bg-[#020A17] border border-[#C5A059]/60 text-[#FFF4D4] text-xs px-2 py-0.5 rounded-md focus:outline-none w-36"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && addRecipient()}
              />
              <button
                type="button"
                onClick={addRecipient}
                className="text-emerald-400 hover:text-emerald-300 p-0.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsAddingRecipient(false)}
                className="text-white/40 hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingRecipient(true)}
              className="w-5 h-5 rounded-full bg-[#0E274A] hover:bg-[#163866] border border-[#C5A059]/40 flex items-center justify-center text-[#FFE394] transition-colors cursor-pointer"
              title="Add recipient"
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Right close and title */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-[#C6B697] hidden sm:inline-block">
            Send new email
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
            title="Close composer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subject Line */}
      <div className="px-4 sm:px-6 py-2.5 border-b border-[#3A2C18]/60 bg-[#040E1E] flex items-center gap-2">
        <label className="text-xs font-semibold text-[#A69371] shrink-0">Subject:</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject title…"
          className="w-full bg-transparent border-none text-[#FFF4D4] font-medium text-xs sm:text-sm focus:outline-none placeholder:text-white/30"
        />
      </div>

      {/* Main Message Text Body */}
      <div className="p-4 sm:p-6 bg-[#020A17]/80 relative">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type your message…"
          rows={7}
          className="w-full bg-transparent border-none text-[#FFF4D4] placeholder:text-white/30 text-xs sm:text-sm leading-relaxed focus:outline-none resize-y min-h-[140px] font-sans"
        />

        {/* Attachment chips if any */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-3 border-t border-[#3A2C18]/40">
            {attachments.map((file, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0E274A] border border-[#C5A059]/40 text-[#FFE394] text-xs"
              >
                <Paperclip className="w-3 h-3 text-[#C5A059]" />
                <span className="truncate max-w-[180px]">{file}</span>
                <button
                  type="button"
                  onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                  className="hover:text-red-400 cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* AI Quick Actions Bar */}
      <div className="px-4 sm:px-6 py-2 border-t border-[#3A2C18]/60 bg-[#040E1E] flex items-center flex-wrap gap-2">
        {/* Ask Me To */}
        <div className="relative">
          <button
            type="button"
            disabled={isAiLoading}
            onClick={() => setShowAskInput(!showAskInput)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#0E274A]/80 hover:bg-[#13325c] border border-[#C5A059]/50 text-[#FFE394] text-xs font-medium transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FFE394]" />
            <span>Ask me to…</span>
          </button>

          {showAskInput && (
            <div className="absolute bottom-8 left-0 z-30 w-72 p-3 bg-[#07162B] border border-[#C5A059]/60 rounded-xl shadow-2xl space-y-2">
              <span className="text-[11px] font-bold text-[#FFE394] block">
                Prompt Advocate AI Assistant
              </span>
              <input
                type="text"
                value={askPrompt}
                onChange={(e) => setAskPrompt(e.target.value)}
                placeholder="e.g. Draft an assertive PWN refusal response…"
                className="w-full bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-[#C5A059]"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleAiAction("ask")}
              />
              <div className="flex justify-end gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAskInput(false)}
                  className="h-6 text-[10px] px-2 text-white/70"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAiAction("ask")}
                  disabled={!askPrompt.trim() || isAiLoading}
                  className="h-6 text-[10px] px-3 bg-gradient-to-r from-[#DFBE77] to-[#C5A059] text-slate-950 font-bold"
                >
                  Generate
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Change Tone */}
        <div className="relative">
          <button
            type="button"
            disabled={isAiLoading}
            onClick={() => setShowToneMenu(!showToneMenu)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#0E274A]/60 hover:bg-[#13325c] border border-[#3A2C18] hover:border-[#C5A059]/40 text-[#C6B697] hover:text-[#FFE394] text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Change tone</span>
          </button>

          {showToneMenu && (
            <div className="absolute bottom-8 left-0 z-30 w-56 p-2 bg-[#07162B] border border-[#C5A059]/60 rounded-xl shadow-2xl space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A69371] px-2 py-1 block">
                Select Advocacy Tone
              </span>
              <button
                onClick={() => handleToneChange("firm_advocate")}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-[#FFF4D4] hover:bg-[#0E274A] hover:text-[#FFE394] transition-colors cursor-pointer"
              >
                🛡️ Firm Advocate (IDEA Compliance)
              </button>
              <button
                onClick={() => handleToneChange("friendly_reassuring")}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-[#FFF4D4] hover:bg-[#0E274A] hover:text-[#FFE394] transition-colors cursor-pointer"
              >
                🤝 Warm & Reassuring to Family
              </button>
              <button
                onClick={() => handleToneChange("assertive_procedural")}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-[#FFF4D4] hover:bg-[#0E274A] hover:text-[#FFE394] transition-colors cursor-pointer"
              >
                ⚖️ Assertive Procedural & PWN
              </button>
              <button
                onClick={() => handleToneChange("concise")}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-[#FFF4D4] hover:bg-[#0E274A] hover:text-[#FFE394] transition-colors cursor-pointer"
              >
                ⚡ Ultra-Concise Bullet Points
              </button>
            </div>
          )}
        </div>

        {/* Shorten */}
        <button
          type="button"
          disabled={isAiLoading}
          onClick={() => handleAiAction("shorten")}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#0E274A]/60 hover:bg-[#13325c] border border-[#3A2C18] hover:border-[#C5A059]/40 text-[#C6B697] hover:text-[#FFE394] text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
        >
          <Minus className="w-3.5 h-3.5" />
          <span>Shorten</span>
        </button>

        {/* Improve Clarity */}
        <button
          type="button"
          disabled={isAiLoading}
          onClick={() => handleAiAction("improveClarity")}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#0E274A]/60 hover:bg-[#13325c] border border-[#3A2C18] hover:border-[#C5A059]/40 text-[#C6B697] hover:text-[#FFE394] text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Improve clarity</span>
        </button>

        {isAiLoading && (
          <span className="text-[11px] text-[#FFE394] animate-pulse flex items-center gap-1 ml-auto">
            <Clock className="w-3 h-3" /> Refining draft with Advocate AI…
          </span>
        )}
      </div>

      {/* Rich Formatting Bar */}
      {showFormattingBar && (
        <div className="px-4 sm:px-6 py-1.5 border-t border-[#3A2C18]/40 bg-[#030D1A] flex items-center flex-wrap gap-1.5 text-white/70 text-xs">
          {/* Font dropdown */}
          <div className="flex items-center gap-1 px-2 py-0.5 bg-[#020A17] border border-[#3A2C18] rounded text-[#C6B697] text-[11px]">
            <span>{selectedFont}</span>
            <ChevronDown className="w-2.5 h-2.5 opacity-60" />
          </div>

          {/* Size dropdown */}
          <div className="flex items-center gap-1 px-2 py-0.5 bg-[#020A17] border border-[#3A2C18] rounded text-[#C6B697] text-[11px]">
            <span>{selectedSize}</span>
            <ChevronDown className="w-2.5 h-2.5 opacity-60" />
          </div>

          <div className="h-3.5 w-px bg-[#3A2C18] mx-1" />

          {/* Bold, Italic, Underline */}
          <button
            type="button"
            onClick={() => setBody((prev) => prev + " **bold** ")}
            className="p-1 hover:bg-[#0E274A] hover:text-[#FFE394] rounded cursor-pointer transition-colors"
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setBody((prev) => prev + " *italic* ")}
            className="p-1 hover:bg-[#0E274A] hover:text-[#FFE394] rounded cursor-pointer transition-colors"
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setBody((prev) => prev + " _underlined_ ")}
            className="p-1 hover:bg-[#0E274A] hover:text-[#FFE394] rounded cursor-pointer transition-colors"
            title="Underline"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>

          <div className="h-3.5 w-px bg-[#3A2C18] mx-1" />

          {/* Alignment */}
          <button
            type="button"
            className="p-1 hover:bg-[#0E274A] hover:text-[#FFE394] rounded cursor-pointer transition-colors"
            title="Align Left"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className="p-1 hover:bg-[#0E274A] hover:text-[#FFE394] rounded cursor-pointer transition-colors"
            title="Align Center"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className="p-1 hover:bg-[#0E274A] hover:text-[#FFE394] rounded cursor-pointer transition-colors"
            title="Align Right"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>

          <div className="h-3.5 w-px bg-[#3A2C18] mx-1" />

          {/* Lists */}
          <button
            type="button"
            onClick={() => setBody((prev) => prev + "\n• ")}
            className="p-1 hover:bg-[#0E274A] hover:text-[#FFE394] rounded cursor-pointer transition-colors"
            title="Bullet List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setBody((prev) => prev + "\n1. ")}
            className="p-1 hover:bg-[#0E274A] hover:text-[#FFE394] rounded cursor-pointer transition-colors"
            title="Numbered List"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setBody((prev) => prev + "\n> Quote / IEP Citation: ")}
            className="p-1 hover:bg-[#0E274A] hover:text-[#FFE394] rounded cursor-pointer transition-colors"
            title="Blockquote / Citation"
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          <div className="h-3.5 w-px bg-[#3A2C18] mx-1" />

          {/* Divider & Undo */}
          <button
            type="button"
            onClick={() => setBody((prev) => prev + "\n\n---\n\n")}
            className="p-1 hover:bg-[#0E274A] hover:text-[#FFE394] rounded cursor-pointer transition-colors"
            title="Horizontal Rule"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setBody(defaultBody || "")}
            className="p-1 hover:bg-[#0E274A] hover:text-[#FFE394] rounded cursor-pointer transition-colors"
            title="Reset / Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="px-4 sm:px-6 py-3 border-t border-[#3A2C18] bg-[#07162B] flex items-center justify-between flex-wrap gap-3">
        {/* Left Side: Templates Dropdown & Action Icons */}
        <div className="flex items-center flex-wrap gap-1.5 relative">
          {/* THE HIGHLIGHTED USER FEATURE: Templates Dropdown in Lower Left */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTemplatesMenu(!showTemplatesMenu)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E274A] hover:bg-[#163866] border border-[#C5A059]/60 text-[#FFE394] font-semibold text-xs shadow-md transition-colors cursor-pointer"
            >
              <span>Templates</span>
              <ChevronDown className="w-3 h-3 text-[#FFE394]" />
            </button>

            {/* Templates Dropdown Menu */}
            {showTemplatesMenu && (
              <div className="absolute bottom-10 left-0 z-40 w-80 max-h-96 overflow-y-auto p-2 bg-[#07162B] border border-[#C5A059]/70 rounded-xl shadow-[0_12px_36px_rgba(0,0,0,0.95)] divide-y divide-[#3A2C18]/60">
                <div className="px-2.5 py-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#A69371]">
                  <span>Advocate Email Templates</span>
                  <span className="text-[10px] text-[#C5A059]">{ADVOCATE_STANDARD_TEMPLATES.length} standard</span>
                </div>

                <div className="py-1 space-y-1">
                  {ADVOCATE_STANDARD_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => applyTemplate(tmpl)}
                      className="w-full text-left p-2 rounded-lg hover:bg-[#0E274A] transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#FFF4D4] group-hover:text-[#FFE394]">
                          {tmpl.name}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/40 text-[#C6B697] border border-[#3A2C18]">
                          {tmpl.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/50 line-clamp-1 mt-0.5">
                        {tmpl.subject}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Custom DB Templates if available */}
                {dbTemplates.length > 0 && (
                  <div className="pt-1.5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#A69371] px-2.5 py-1 block">
                      Saved CRM Templates
                    </span>
                    {dbTemplates.map((dbT: any) => (
                      <button
                        key={dbT.id}
                        type="button"
                        onClick={() => applyTemplate({ subject: dbT.subject, body: dbT.body })}
                        className="w-full text-left p-2 rounded-lg hover:bg-[#0E274A] transition-colors cursor-pointer group"
                      >
                        <span className="text-xs font-semibold text-[#FFF4D4] group-hover:text-[#FFE394] block">
                          {dbT.name}
                        </span>
                        <span className="text-[10px] text-white/50 truncate block">
                          {dbT.subject}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Toggle formatting toolbar */}
          <button
            type="button"
            onClick={() => setShowFormattingBar(!showFormattingBar)}
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs transition-colors cursor-pointer",
              showFormattingBar
                ? "bg-[#0E274A] text-[#FFE394] border border-[#C5A059]/40"
                : "text-white/60 hover:bg-white/10 hover:text-white"
            )}
            title="Toggle Formatting Toolbar"
          >
            A
          </button>

          {/* Emoji Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-[#FFE394] transition-colors cursor-pointer"
              title="Insert Emoji"
            >
              <Smile className="w-4 h-4" />
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-10 left-0 z-30 p-2 bg-[#07162B] border border-[#3A2C18] rounded-xl shadow-xl flex items-center gap-1.5">
                {["👍", "📋", "🗓️", "✍️", "⚖️", "📎", "🤝", "⭐", "💼", "❓"].map((em) => (
                  <button
                    key={em}
                    onClick={() => insertEmoji(em)}
                    className="p-1 hover:bg-[#0E274A] rounded text-base cursor-pointer"
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Link */}
          <button
            type="button"
            onClick={() => {
              const url = prompt("Enter hyperlink URL:", "https://");
              if (url) setBody((prev) => prev + ` [Link](${url}) `);
            }}
            className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-[#FFE394] transition-colors cursor-pointer"
            title="Insert Link"
          >
            <Link2 className="w-4 h-4" />
          </button>

          {/* Image */}
          <button
            type="button"
            onClick={() => {
              const img = prompt("Enter image URL or description:", "https://");
              if (img) setBody((prev) => prev + ` ![Image](${img}) `);
            }}
            className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-[#FFE394] transition-colors cursor-pointer"
            title="Insert Image"
          >
            <Image className="w-4 h-4" />
          </button>

          {/* {x} Dynamic Merge Variables */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMergeTagsMenu(!showMergeTagsMenu)}
              className="px-1.5 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-[#FFE394] text-xs font-mono font-bold transition-colors cursor-pointer"
              title="Insert Merge Variable"
            >
              {"{x}"}
            </button>
            {showMergeTagsMenu && (
              <div className="absolute bottom-10 left-0 z-30 w-52 p-2 bg-[#07162B] border border-[#C5A059]/60 rounded-xl shadow-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A69371] px-2 py-0.5 block">
                  Dynamic Merge Variables
                </span>
                <button
                  onClick={() => insertVariable("{{student_first_name}}")}
                  className="w-full text-left px-2 py-1 rounded text-xs text-[#FFF4D4] hover:bg-[#0E274A] cursor-pointer"
                >
                  Student First Name ({studentFirstName})
                </button>
                <button
                  onClick={() => insertVariable("{{student_name}}")}
                  className="w-full text-left px-2 py-1 rounded text-xs text-[#FFF4D4] hover:bg-[#0E274A] cursor-pointer"
                >
                  Student Full Name ({fullName})
                </button>
                <button
                  onClick={() => insertVariable("{{parent_name}}")}
                  className="w-full text-left px-2 py-1 rounded text-xs text-[#FFF4D4] hover:bg-[#0E274A] cursor-pointer"
                >
                  Parent Name ({parentName})
                </button>
                <button
                  onClick={() => insertVariable("{{case_id}}")}
                  className="w-full text-left px-2 py-1 rounded text-xs text-[#FFF4D4] hover:bg-[#0E274A] cursor-pointer"
                >
                  Case # ({caseId || studentId})
                </button>
              </div>
            )}
          </div>

          {/* Calendar Availability Slots */}
          <button
            type="button"
            onClick={insertAvailabilityBlock}
            className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-[#FFE394] transition-colors cursor-pointer"
            title="Insert Meeting Availability Slots"
          >
            <Calendar className="w-4 h-4" />
          </button>

          {/* Smart File / Agreement */}
          <button
            type="button"
            onClick={insertSmartFileLink}
            className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-[#FFE394] transition-colors cursor-pointer"
            title="Insert Smart File Agreement Link"
          >
            <FileSignature className="w-4 h-4" />
          </button>

          {/* Invoice / Payment link */}
          <button
            type="button"
            onClick={insertInvoiceLink}
            className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-[#FFE394] transition-colors cursor-pointer"
            title="Insert Retainer Invoice / Payment Link"
          >
            <DollarSign className="w-4 h-4" />
          </button>
        </div>

        {/* Right Side: Paperclip Attachment & Send Button */}
        <div className="flex items-center gap-2">
          {/* Paperclip */}
          <button
            type="button"
            onClick={simulateAttachment}
            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer relative"
            title="Add File Attachment"
          >
            <Paperclip className="w-4 h-4" />
            {attachments.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#C5A059] text-slate-950 font-bold text-[9px] flex items-center justify-center">
                {attachments.length}
              </span>
            )}
          </button>

          {/* Split Send Button */}
          <div className="relative inline-flex items-center rounded-lg shadow-lg">
            <Button
              type="button"
              onClick={handleSend}
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-bold text-xs sm:text-sm h-8.5 px-4 rounded-l-lg rounded-r-none border-y border-l border-[#FFE394]/60 cursor-pointer shadow-md"
            >
              <span>Send</span>
            </Button>
            <button
              type="button"
              onClick={() => setSendTypeDropdown(!sendTypeDropdown)}
              className="bg-[#C5A059] hover:bg-[#9E7D3B] text-[#07162B] font-bold h-8.5 px-2 rounded-r-lg border-y border-r border-l border-[#FFE394]/60 border-l-[#07162B]/20 flex items-center justify-center cursor-pointer transition-colors"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {sendTypeDropdown && (
              <div className="absolute bottom-10 right-0 z-30 w-48 p-1.5 bg-[#07162B] border border-[#C5A059]/60 rounded-xl shadow-2xl space-y-1">
                <button
                  onClick={() => {
                    setSendTypeDropdown(false);
                    handleSend();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-[#FFF4D4] hover:bg-[#0E274A] cursor-pointer"
                >
                  ⚡ Send immediately
                </button>
                <button
                  onClick={() => {
                    setSendTypeDropdown(false);
                    toast.success("Scheduled send saved for tomorrow 8:00 AM EDT");
                    handleSend();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-[#FFF4D4] hover:bg-[#0E274A] cursor-pointer"
                >
                  ⏰ Schedule for 8:00 AM
                </button>
                <button
                  onClick={() => {
                    setSendTypeDropdown(false);
                    toast.success("Draft saved to case files");
                    onClose();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-white/70 hover:bg-[#0E274A] cursor-pointer"
                >
                  💾 Save as case draft
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
