import React, { useState, useMemo, useEffect } from "react";
import {
  Mail,
  Copy,
  Check,
  ExternalLink,
  X,
  AlertTriangle,
  Sparkles,
  CheckSquare,
  Square,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { ComparisonItem, IepVersionOption } from "./types";

interface ParentSchoolCorrectionEmailModalProps {
  open: boolean;
  onClose: () => void;
  items: ComparisonItem[];
  oldVersion: IepVersionOption;
  newVersion: IepVersionOption;
  studentName?: string;
  studentGrade?: string;
  onToggleIncludeInEmail: (id: string) => void;
}

export function ParentSchoolCorrectionEmailModal({
  open,
  onClose,
  items,
  oldVersion,
  newVersion,
  studentName = "Michael Sheep",
  studentGrade = "8th Grade",
  onToggleIncludeInEmail,
}: ParentSchoolCorrectionEmailModalProps) {
  const [recipientEmail, setRecipientEmail] = useState(
    "casemanager@school-district.edu"
  );
  const [recipientName, setRecipientName] = useState(
    "IEP Case Manager & Special Education Team"
  );
  const [parentSignature, setParentSignature] = useState(
    `Parent of ${studentName}`
  );
  const [copied, setCopied] = useState(false);

  // Items currently selected for the email (starred/flagged or high_attention)
  const selectedFindings = useMemo(
    () => items.filter((i) => i.isStarred && i.status !== "unchanged"),
    [items]
  );

  const allChangeItems = useMemo(
    () => items.filter((i) => i.status !== "unchanged"),
    [items]
  );

  const generatedSubject = useMemo(() => {
    return `Requested Corrections to Proposed IEP (${newVersion.date}) — ${studentName} (${studentGrade})`;
  }, [newVersion.date, studentName, studentGrade]);

  const generatedBody = useMemo(() => {
    const firstName = studentName.split(" ")[0] || studentName;
    const count = selectedFindings.length;

    const intro = [
      `Dear ${recipientName},`,
      ``,
      `Thank you for sharing the proposed IEP draft dated ${newVersion.date} for ${studentName} (${studentGrade}). I have carefully reviewed the proposed draft side-by-side against ${firstName}'s previous IEP dated ${oldVersion.date}.`,
      ``,
      `Before I can provide informed parental consent to implement the new IEP, please correct or address the following ${count} ${count === 1 ? "issue" : "issues"} identified in the proposed draft:`,
    ].join("\n");

    const numberedIssues =
      selectedFindings.length === 0
        ? `\n[Select at least one finding on the left to include in this email.]\n`
        : selectedFindings
            .map((item, idx) => {
              const actionVerb =
                item.status === "removed"
                  ? `Please restore this service/support in the IEP (or provide formal Prior Written Notice under 34 C.F.R. § 300.503 citing the evaluation data used to justify its removal).`
                  : item.status === "modified"
                    ? `Please revise the proposed IEP to retain the baseline level of support or provide the specific assessment data supporting this change.`
                    : `Please clarify how this change will be implemented and monitored across all classroom settings.`;

              const customNoteLine = item.userNote
                ? `\n   • Parent Note: ${item.userNote}`
                : item.reviewNote
                  ? `\n   • Requested Clarification: ${item.reviewNote}`
                  : "";

              return [
                ``,
                `${idx + 1}. ${item.title.toUpperCase()} (${item.categoryLabel})`,
                `   • Previous IEP (${oldVersion.date} — ${item.previousLocation || "Baseline"}): "${item.previousValue || "Not previously listed"}"`,
                `   • Proposed IEP (${newVersion.date} — ${item.newLocation || "Draft"}): "${item.newValue || "Removed / omitted in proposed draft"}"`,
                `   • Issue Identified: ${item.shortSummary || item.explanation}`,
                `   • Question for the Team: ${item.suggestedQuestion}${customNoteLine}`,
                `   • Requested Correction: ${actionVerb}`,
              ].join("\n");
            })
            .join("\n");

    const closing = [
      ``,
      `Please confirm that this email will be attached to ${firstName}'s official educational record as parent input, and let me know when we can review the corrected IEP draft together. If the district is refusing any of the corrections requested above, please provide formal Prior Written Notice detailing the specific evaluation data and options considered.`,
      ``,
      `Thank you for your partnership in supporting ${firstName}.`,
      ``,
      `Sincerely,`,
      `${parentSignature}`,
    ].join("\n");

    return `${intro}\n${numberedIssues}\n${closing}`;
  }, [
    recipientName,
    newVersion.date,
    oldVersion.date,
    studentName,
    studentGrade,
    selectedFindings,
    parentSignature,
  ]);

  const [editableBody, setEditableBody] = useState(generatedBody);

  useEffect(() => {
    setEditableBody(generatedBody);
  }, [generatedBody]);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `Subject: ${generatedSubject}\n\n${editableBody}`
      );
      setCopied(true);
      toast.success("Parent correction email copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy automatically — please select and copy.");
    }
  };

  const handleOpenMailto = () => {
    const mailtoUrl = `mailto:${encodeURIComponent(
      recipientEmail
    )}?subject=${encodeURIComponent(
      generatedSubject
    )}&body=${encodeURIComponent(editableBody)}`;
    window.location.href = mailtoUrl;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-2xl bg-[#081124] border border-[#5B4827] shadow-[0_30px_90px_rgba(0,0,0,0.95)] flex flex-col text-left text-[#FBF6EC]">
        {/* Top Antique Brass Inlay Line */}
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-[#D2AE68] to-transparent" />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1E2B48] flex items-start justify-between gap-4 bg-[#0B162E]">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-b from-[#2A2216] to-[#141A2E] border border-[#C5A059]/70 text-[#FFE394] shrink-0 mt-0.5">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10.5px] uppercase tracking-[0.22em] text-[#FFE394] font-bold">
                  Parent-to-School Correction Notice
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/35">
                  Waypoint found {selectedFindings.length}{" "}
                  {selectedFindings.length === 1 ? "problem" : "problems"}
                </span>
              </div>
              <h3
                className="text-xl sm:text-2xl font-bold text-white mt-0.5"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Use this email template to notify your school of any issues
                found
              </h3>
              <p className="text-xs text-[#A8B2CA] mt-0.5">
                Written from the client/parent perspective requesting specific
                IEP corrections before signing consent.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#050A16] border border-[#24324F] text-[#9AA4BC] hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body: Left Findings Selector + Right Editable Parent Email */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#1E2B48]">
          {/* LEFT COLUMN: Check/Uncheck Which Findings Go Into the Email */}
          <div className="lg:col-span-4 p-5 space-y-4 bg-[#060C1A]">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#FFE394]">
                  Issues Included in Email ({selectedFindings.length} of{" "}
                  {allChangeItems.length})
                </h4>
                <p className="text-[11px] text-[#8E98B4] mt-0.5">
                  Click any finding below to add or remove it from your school
                  correction email.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {allChangeItems.map((item) => {
                const included = !!item.isStarred;
                const isHighAttention = item.severity === "high_attention";

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onToggleIncludeInEmail(item.id)}
                    className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                      included
                        ? "bg-[#152040] border-[#727CFF]/70 text-white shadow-sm"
                        : "bg-[#091224] border-[#1D2945] text-[#9AA6C4] hover:border-[#31436E] hover:text-white"
                    }`}
                  >
                    {included ? (
                      <CheckSquare className="h-4 w-4 text-[#FFE394] shrink-0 mt-0.5" />
                    ) : (
                      <Square className="h-4 w-4 text-[#5A6785] shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold truncate">
                          {item.title}
                        </span>
                        {isHighAttention && (
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                            Problem
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#A8B2CA] line-clamp-2 mt-1">
                        {item.shortSummary || item.explanation}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: Parent Perspective Email Editor */}
          <div className="lg:col-span-8 p-5 sm:p-6 space-y-4 flex flex-col justify-between bg-[#081124]">
            <div className="space-y-3">
              {/* Recipient & Signature Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10.5px] uppercase tracking-wider text-[#9AA6C4] font-semibold mb-1">
                    To (School / Case Manager Email)
                  </label>
                  <input
                    type="text"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-[#050A16] border border-[#243252] text-xs text-white focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] uppercase tracking-wider text-[#9AA6C4] font-semibold mb-1">
                    Parent Sign-Off Name
                  </label>
                  <input
                    type="text"
                    value={parentSignature}
                    onChange={(e) => setParentSignature(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-[#050A16] border border-[#243252] text-xs text-white focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
              </div>

              {/* Subject Line */}
              <div>
                <label className="block text-[10.5px] uppercase tracking-wider text-[#9AA6C4] font-semibold mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  readOnly
                  value={generatedSubject}
                  className="w-full h-9 px-3 rounded-lg bg-[#050A16] border border-[#243252] text-xs font-semibold text-[#FFE394]"
                />
              </div>

              {/* Editable Email Body */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10.5px] uppercase tracking-wider text-[#FFE394] font-semibold flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" />
                    <span>
                      Parent Email Body — Requesting IEP Corrections (Editable)
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditableBody(generatedBody)}
                    className="text-[11px] text-[#9AA6C4] hover:text-white underline cursor-pointer"
                  >
                    Reset to template
                  </button>
                </div>
                <textarea
                  rows={14}
                  value={editableBody}
                  onChange={(e) => setEditableBody(e.target.value)}
                  className="w-full p-4 rounded-xl bg-[#050A16] border border-[#263558] text-[13px] text-[#F1F4FC] font-sans leading-relaxed focus:outline-none focus:border-[#C5A059]"
                />
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="pt-3 border-t border-[#1E2B48] flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0B152B] hover:bg-[#132242] border border-[#28385C] text-xs text-[#DCE2F2] cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Letter</span>
              </button>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleOpenMailto}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1A2548] hover:bg-[#23315E] border border-[#5B68C8] text-xs font-semibold text-white cursor-pointer transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-[#B8C0FF]" />
                  <span>Open in Email App</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-b from-[#E5C887] via-[#C69F56] to-[#987230] text-[#0E1322] font-bold text-xs border border-[#FCE7B6]/75 shadow-[0_6px_18px_rgba(0,0,0,0.75)] hover:brightness-110 transition-all cursor-pointer"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copy Email to Send to School</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

