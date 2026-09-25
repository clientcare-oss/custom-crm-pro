import React, { useState } from "react";
import { X, Printer, CheckSquare, Square, Building2, MapPin, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FullPwnReview, DecodedConcernItem } from "./types";

interface PwnPrintModalProps {
  review: FullPwnReview;
  onClose: () => void;
}

export const PwnPrintModal: React.FC<PwnPrintModalProps> = ({ review, onClose }) => {
  const [includeDismissed, setIncludeDismissed] = useState(false);

  // Filter concerns based on advocate preference
  const visibleConcerns = review.concerns.filter((c) => {
    if (includeDismissed) return true;
    return c.advocateStatus !== "DISMISSED";
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      {/* Modal Dialog Card */}
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Toolbar (hidden in print) */}
        <div className="p-4 bg-slate-950 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="h-4 w-4 text-amber-400" />
            <span className="font-bold text-sm text-white">Printer Friendly Review</span>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeDismissed}
                onChange={(e) => setIncludeDismissed(e.target.checked)}
                className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-800"
              />
              <span>Include findings marked "Not a Concern"</span>
            </label>

            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-8 px-4"
            >
              <Printer className="h-3.5 w-3.5 mr-1" />
              Print / Save as PDF
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Printable Document Body - Warm parchment / high-contrast paper style */}
        <div className="p-8 sm:p-10 overflow-y-auto bg-[#FAFAF8] text-slate-900 print:p-0 print:bg-white print:text-black">
          {/* Print Letterhead Header */}
          <div className="border-b-2 border-slate-800 pb-4 mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-serif font-black tracking-tight text-slate-950">
                WAYPOINT ADVOCATES
              </h1>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mt-0.5">
                Prior Written Notice Analysis & Legal Documentation Review
              </p>
            </div>
            <div className="text-right text-xs text-slate-600 space-y-0.5 font-mono">
              <div>Review Date: <strong>{new Date(review.createdAt).toLocaleDateString()}</strong></div>
              <div>Advocate: <strong>{review.advocateName || "Byron Honea"}</strong></div>
              <div>Status: <strong>{review.status}</strong></div>
            </div>
          </div>

          {/* Student & Document Metadata Summary */}
          <div className="bg-slate-100 border border-slate-300 rounded-lg p-4 mb-6 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-slate-500 block uppercase text-[10px] font-bold">Student</span>
              <strong className="text-slate-900 text-sm">
                {review.student?.firstName || ""} {review.student?.lastName || "Waypoint Student"}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px] font-bold">School / District</span>
              <span className="text-slate-800">
                {review.student?.schoolName || "School"} • {review.student?.countyDistrict || "District"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px] font-bold">PWN Document</span>
              <span className="text-slate-800 truncate block">
                {review.pwnDocumentName || "Prior Written Notice"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase text-[10px] font-bold">Documentation Strength</span>
              <strong className="text-slate-950 font-bold">
                {review.documentationStrength}
              </strong>
            </div>
          </div>

          {/* 1. Synthesis Summary */}
          <div className="mb-6 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
              1. PWN Review Summary
            </h2>
            <p className="text-xs text-slate-800 leading-relaxed">
              {review.summary}
            </p>
          </div>

          {/* 2. Required Elements Matrix */}
          <div className="mb-6 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
              2. Federal Requirement Verification (34 C.F.R. §300.503)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {review.requirements.map((req) => (
                <div
                  key={req.requirementKey}
                  className="p-2 border border-slate-200 rounded flex items-center justify-between bg-white"
                >
                  <span className="text-slate-800">{req.requirementTitle}</span>
                  <span className="font-bold text-[11px]">
                    {req.status === "PRESENT" ? "🟢 Present" : req.status === "WEAK_UNCLEAR" ? "🟡 Weak" : "🔴 Not Located"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. District Decisions Identified */}
          <div className="mb-6 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
              3. District Decisions Identified ({review.decisions.length})
            </h2>
            <div className="space-y-3">
              {review.decisions.map((dec, idx) => (
                <div key={idx} className="p-3 border border-slate-300 rounded bg-white text-xs space-y-2">
                  <div className="flex items-center justify-between font-bold">
                    <span>
                      {idx + 1}. {dec.decisionTitle}
                    </span>
                    <span className="uppercase text-[11px] px-2 py-0.5 rounded bg-slate-100 border">
                      {dec.action}
                    </span>
                  </div>

                  <div className="text-slate-700 italic border-l-2 border-slate-400 pl-2">
                    "{dec.pwnLanguage}"
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>
                      <strong className="text-slate-900 block">Stated Reason:</strong>
                      <span className="text-slate-700">{dec.reason || "Not Located"}</span>
                    </div>
                    <div>
                      <strong className="text-slate-900 block">Evidence Relied Upon:</strong>
                      <span className="text-slate-700">{dec.evidenceIdentified || "Not Located"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Confirmed Concerns & Potential Problems */}
          <div className="mb-6 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
              4. Documented Concerns & Findings ({visibleConcerns.length})
            </h2>
            <div className="space-y-2.5">
              {visibleConcerns.map((concern, idx) => (
                <div key={idx} className="p-3 border border-slate-300 rounded bg-white text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-950 font-bold">
                      {idx + 1}. {concern.title}
                    </strong>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {concern.source}
                    </span>
                  </div>

                  <div className="text-slate-700">
                    <strong>Decision:</strong> {concern.relatedDecision}
                  </div>

                  {concern.relevantPwnLanguage && (
                    <div className="text-slate-600 italic border-l-2 border-slate-300 pl-2 text-[11px]">
                      "{concern.relevantPwnLanguage}"
                    </div>
                  )}

                  <div className="text-slate-800 text-[11px]">
                    <strong>Why Flagged:</strong> {concern.whyFlagged}
                  </div>

                  {concern.advocateCorrection && (
                    <div className="text-blue-900 text-[11px] bg-blue-50 p-1.5 rounded border border-blue-200">
                      <strong>Advocate Correction:</strong> {concern.advocateCorrection}
                    </div>
                  )}

                  {concern.advocateNote && (
                    <div className="text-slate-900 text-[11px] bg-slate-100 p-1.5 rounded border border-slate-300">
                      <strong>Advocate Note:</strong> {concern.advocateNote}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 5. General Advocate Notes if provided */}
          {review.advocateNotes && (
            <div className="mb-6 space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
                5. Advocate Strategy Notes
              </h2>
              <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed bg-white p-3 border border-slate-200 rounded">
                {review.advocateNotes}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="pt-6 border-t border-slate-300 text-[10px] text-slate-500 text-center space-y-0.5">
            <div>Confidential Client Advocacy Document — Waypoint Advocates</div>
            <div>Generated by Waypoint CRM Pro PWN Decoder (PG-010-PWN)</div>
          </div>
        </div>
      </div>
    </div>
  );
};
