import React, { useState, useEffect } from "react";
import {
  type OfficialComplaintFormState,
  SUPPORTED_STATE_FORMS,
} from "./stateFormsData";
import { cn } from "@/lib/utils";
import { convertPdfToPageImages, type ImportedPdfPage } from "@/lib/pdfImporter";
import { Check, PenTool, Copy } from "lucide-react";
import { AdoptAndSignModal, type AdoptedSignatureData } from "./AdoptAndSignModal";

export interface StateComplaintFormPageProps {
  page: ImportedPdfPage;
  pageIdx: number;
  formState: OfficialComplaintFormState;
  onChange?: (updater: (prev: OfficialComplaintFormState) => OfficialComplaintFormState) => void;
  onOpenAdoptSign?: () => void;
  readOnly?: boolean;
  isPrint?: boolean;
  viewMode?: "fit-width" | "fit-page" | "actual";
  zoomLevel?: number;
  className?: string;
  style?: React.CSSProperties;
}

const GADOE_PDF_URL = "/forms/gadoe-formal-complaint-form.pdf";

// Clear, transparent styles for print preview and physical print output
const READONLY_INPUT_CLASS =
  "bg-transparent border-0 border-b-0 rounded-none px-1.5 pt-0.5 pb-[2px] text-xs sm:text-[13px] font-sans text-black no-underline leading-none flex items-end overflow-hidden z-20 select-text";

const READONLY_TEXTAREA_CLASS =
  "bg-transparent border-0 border-b-0 rounded-none p-2.5 text-xs sm:text-[13px] font-sans text-black no-underline leading-relaxed overflow-hidden whitespace-pre-wrap select-text z-20";

const READONLY_CHECK_CLASS =
  "flex items-center justify-center bg-transparent border-0 z-20";

// Interactive input fields with prominent, locked-in fillable blue styling that stays visibly blue across all states
const INTERACTIVE_INPUT_CLASS =
  "bg-[#CCE5FF] hover:bg-[#B8DCFF] focus:bg-[#B8DCFF] text-[#072448] font-semibold border border-[#6BA3E8] focus:border-[#1E60BF] rounded-[2px] px-1.5 pt-0.5 pb-[2px] text-xs sm:text-[13px] font-sans leading-none focus:outline-none focus:ring-2 focus:ring-[#1E60BF]/50 z-20 transition-all placeholder:text-blue-900/60 placeholder:italic shadow-[inset_0_1px_2px_rgba(0,50,150,0.06)]";


/**
 * Single Letter Sheet (Pages 1-4) of the Official State Complaint Form
 * Supports both interactive editing (light blue boxes + Adopt & Sign) and high-fidelity print/preview (clear/transparent boxes)
 */
export function StateComplaintFormPage({
  page,
  pageIdx,
  formState,
  onChange,
  onOpenAdoptSign,
  readOnly = false,
  isPrint = false,
  viewMode = "fit-width",
  zoomLevel = 100,
  className,
  style,
}: StateComplaintFormPageProps) {
  const isInteractive = !readOnly && !!onChange;

  // Standard delivery method fallback
  const resolvedServiceMethod =
    !formState.serviceMethod || formState.serviceMethod.includes("Certified Mail")
      ? "Electronic Delivery"
      : formState.serviceMethod;

  // Resolved signature font family and letter spacing
  const resolvedSignatureFont =
    formState.signatureStyle === "great-vibes"
      ? "'Great Vibes', cursive"
      : formState.signatureStyle === "caveat"
      ? "'Caveat', cursive"
      : formState.signatureStyle === "alex-brush"
      ? "'Alex Brush', cursive"
      : "'Dancing Script', cursive";

  const resolvedSignatureLetterSpacing =
    formState.signatureStyle === "alex-brush"
      ? "0.05em"
      : formState.signatureStyle === "great-vibes"
      ? "0.04em"
      : formState.signatureStyle === "caveat"
      ? "0.01em"
      : "0.02em";

  return (
    <div
      style={{
        width: isPrint ? "8.5in" : viewMode === "actual" ? "816px" : "100%",
        maxWidth: isPrint ? "8.5in" : "840px",
        height: isPrint ? "11in" : undefined,
        aspectRatio: isPrint ? "8.5 / 11" : "612 / 792",
        transform:
          !isPrint && viewMode === "fit-page"
            ? "scale(0.85)"
            : !isPrint && zoomLevel !== 100
            ? `scale(${zoomLevel / 100})`
            : undefined,
        transformOrigin: "top center",
        ...style,
      }}
      className={cn(
        "state-form-sheet-root relative select-text bg-white text-black shrink-0 overflow-hidden",
        isPrint
          ? "border-0 shadow-none m-0 p-0"
          : "rounded-xs border border-[#C5A059]/60 shadow-[0_16px_50px_rgba(0,0,0,0.85),0_2px_8px_rgba(0,0,0,0.5)]",
        viewMode === "fit-width" && !isPrint && "w-full max-w-[840px]",
        viewMode === "fit-page" && !isPrint && "w-[calc((100vh-175px)*(8.5/11))] max-w-full my-auto",
        viewMode === "actual" && !isPrint && "w-[816px]",
        className
      )}
    >
      {/* Corner Registration Tick Marks (Hidden during print) */}
      {!isPrint && (
        <>
          <div className="absolute top-6 left-6 w-3 h-3 border-t border-l border-[#8C7A60]/40 pointer-events-none z-10" />
          <div className="absolute top-6 right-6 w-3 h-3 border-t border-r border-[#8C7A60]/40 pointer-events-none z-10" />
          <div className="absolute bottom-6 left-6 w-3 h-3 border-b border-l border-[#8C7A60]/40 pointer-events-none z-10" />
          <div className="absolute bottom-6 right-6 w-3 h-3 border-b border-r border-[#8C7A60]/40 pointer-events-none z-10" />
        </>
      )}

      {/* Base High-Resolution Official GaDOE Form Sheet Image */}
      <img
        src={page.dataUrl}
        alt={`Official State Form Page ${pageIdx + 1}`}
        className="w-full h-full object-fill pointer-events-none select-none block"
      />

      {/* ── PAGE 1: PUBLIC AGENCY, COMPLAINANT, STUDENT & PARENT FIELDS ── */}
      {pageIdx === 0 && (
        <>
          {/* Public agency */}
          {isInteractive ? (
            <input
              type="text"
              value={formState.publicAgency || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, publicAgency: e.target.value }))}
              placeholder="Local School District / Public Agency"
              style={{ position: "absolute", top: "21.35%", left: "44.73%", width: "45.78%", height: "2.30%" }}
              className={INTERACTIVE_INPUT_CLASS}
              title="Public agency filing complaint against"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "21.35%", left: "44.73%", width: "45.78%", height: "2.30%" }}
              className={READONLY_INPUT_CLASS}
              title="Public agency filing complaint against"
            >
              <span className="truncate font-medium">{formState.publicAgency || ""}</span>
            </div>
          )}

          {/* Name of Complainant */}
          {isInteractive ? (
            <input
              type="text"
              value={formState.complainantName || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, complainantName: e.target.value }))}
              placeholder="Name of Complainant"
              style={{ position: "absolute", top: "28.30%", left: "30.82%", width: "61.08%", height: "2.30%" }}
              className={INTERACTIVE_INPUT_CLASS}
              title="Name of Complainant"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "28.30%", left: "30.82%", width: "61.08%", height: "2.30%" }}
              className={READONLY_INPUT_CLASS}
              title="Name of Complainant"
            >
              <span className="truncate font-medium">{formState.complainantName || ""}</span>
            </div>
          )}

          {/* Relationship to student */}
          {isInteractive ? (
            <input
              type="text"
              value={formState.complainantRelationship || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, complainantRelationship: e.target.value }))}
              placeholder="Relationship to student"
              style={{ position: "absolute", top: "30.95%", left: "29.31%", width: "63.25%", height: "2.30%" }}
              className={INTERACTIVE_INPUT_CLASS}
              title="Relationship to student"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "30.95%", left: "29.31%", width: "63.25%", height: "2.30%" }}
              className={READONLY_INPUT_CLASS}
              title="Relationship to student"
            >
              <span className="truncate">{formState.complainantRelationship || ""}</span>
            </div>
          )}

          {/* Complainant Address */}
          {isInteractive ? (
            <input
              type="text"
              value={formState.complainantAddress || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, complainantAddress: e.target.value }))}
              placeholder="Complainant Street Address"
              style={{ position: "absolute", top: "33.65%", left: "30.41%", width: "61.06%", height: "2.30%" }}
              className={INTERACTIVE_INPUT_CLASS}
              title="Complainant Address"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "33.65%", left: "30.41%", width: "61.06%", height: "2.30%" }}
              className={READONLY_INPUT_CLASS}
              title="Complainant Address"
            >
              <span className="truncate">{formState.complainantAddress || ""}</span>
            </div>
          )}

          {/* Complainant City */}
          {isInteractive ? (
            <input
              type="text"
              value={formState.complainantCity || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, complainantCity: e.target.value }))}
              placeholder="City"
              style={{ position: "absolute", top: "36.35%", left: "14.39%", width: "31.63%", height: "2.30%" }}
              className={INTERACTIVE_INPUT_CLASS}
              title="Complainant City"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "36.35%", left: "14.39%", width: "31.63%", height: "2.30%" }}
              className={READONLY_INPUT_CLASS}
            >
              <span className="truncate">{formState.complainantCity || ""}</span>
            </div>
          )}

          {/* Complainant State */}
          {isInteractive ? (
            <input
              type="text"
              value={formState.complainantState || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, complainantState: e.target.value }))}
              placeholder="State"
              style={{ position: "absolute", top: "36.35%", left: "52.65%", width: "13.10%", height: "2.30%" }}
              className={INTERACTIVE_INPUT_CLASS}
              title="Complainant State"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "36.35%", left: "52.65%", width: "13.10%", height: "2.30%" }}
              className={READONLY_INPUT_CLASS}
            >
              <span className="truncate">{formState.complainantState || ""}</span>
            </div>
          )}

          {/* Complainant Zip */}
          {isInteractive ? (
            <input
              type="text"
              value={formState.complainantZip || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, complainantZip: e.target.value }))}
              placeholder="Zip Code"
              style={{ position: "absolute", top: "36.35%", left: "75.98%", width: "16.35%", height: "2.30%" }}
              className={INTERACTIVE_INPUT_CLASS}
              title="Complainant Zip Code"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "36.35%", left: "75.98%", width: "16.35%", height: "2.30%" }}
              className={READONLY_INPUT_CLASS}
            >
              <span className="truncate">{formState.complainantZip || ""}</span>
            </div>
          )}

          {/* Complainant Phone */}
          {isInteractive ? (
            <input
              type="text"
              value={formState.complainantPhone || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, complainantPhone: e.target.value }))}
              placeholder="Phone Numbers"
              style={{ position: "absolute", top: "39.05%", left: "39.45%", width: "52.33%", height: "2.30%" }}
              className={INTERACTIVE_INPUT_CLASS}
              title="Complainant Phone Numbers"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "39.05%", left: "39.45%", width: "52.33%", height: "2.30%" }}
              className={READONLY_INPUT_CLASS}
            >
              <span className="truncate">{formState.complainantPhone || ""}</span>
            </div>
          )}

          {/* Complainant Email */}
          {isInteractive ? (
            <input
              type="text"
              value={formState.complainantEmail || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, complainantEmail: e.target.value }))}
              placeholder="Email Address"
              style={{ position: "absolute", top: "41.70%", left: "33.57%", width: "57.78%", height: "2.30%" }}
              className={INTERACTIVE_INPUT_CLASS}
              title="Complainant Email Address"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "41.70%", left: "33.57%", width: "57.78%", height: "2.30%" }}
              className={READONLY_INPUT_CLASS}
            >
              <span className="truncate">{formState.complainantEmail || ""}</span>
            </div>
          )}

          {/* Name of Student */}
          {isInteractive ? (
            <input
              type="text"
              value={formState.studentName || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, studentName: e.target.value }))}
              placeholder="Student Name"
              style={{ position: "absolute", top: "48.65%", left: "25.71%", width: "35.98%", height: "2.30%" }}
              className={cn(INTERACTIVE_INPUT_CLASS, "font-semibold")}
              title="Name of Student"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "48.65%", left: "25.71%", width: "35.98%", height: "2.30%" }}
              className={cn(READONLY_INPUT_CLASS, "font-bold")}
            >
              <span className="truncate">{formState.studentName || ""}</span>
            </div>
          )}

          {/* Student Date of Birth */}
          {isInteractive ? (
            <input
              type="text"
              value={formState.studentDob || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, studentDob: e.target.value }))}
              placeholder="MM/DD/YYYY"
              style={{ position: "absolute", top: "48.65%", left: "73.69%", width: "18.53%", height: "2.30%" }}
              className={INTERACTIVE_INPUT_CLASS}
              title="Date of Birth"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "48.65%", left: "73.69%", width: "18.53%", height: "2.30%" }}
              className={READONLY_INPUT_CLASS}
            >
              <span className="truncate">{formState.studentDob || ""}</span>
            </div>
          )}

          {/* Student Address */}
          {isInteractive ? (
            <input
              type="text"
              value={formState.studentAddress || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, studentAddress: e.target.value }))}
              placeholder="Student Street Address"
              style={{ position: "absolute", top: "51.35%", left: "25.82%", width: "66.51%", height: "2.30%" }}
              className={INTERACTIVE_INPUT_CLASS}
              title="Student Address"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "51.35%", left: "25.82%", width: "66.51%", height: "2.30%" }}
              className={READONLY_INPUT_CLASS}
            >
              <span className="truncate">{formState.studentAddress || ""}</span>
            </div>
          )}

          {/* Student City */}
          {isInteractive ? (
            <input
              type="text"
              value={formState.studentCity || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, studentCity: e.target.value }))}
              placeholder="City"
              style={{ position: "absolute", top: "54.05%", left: "14.37%", width: "31.63%", height: "2.30%" }}
              className={INTERACTIVE_INPUT_CLASS}
              title="Student City"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "54.05%", left: "14.37%", width: "31.63%", height: "2.30%" }}
              className={READONLY_INPUT_CLASS}
            >
              <span className="truncate">{formState.studentCity || ""}</span>
            </div>
          )}

          {/* Student State */}
          {isInteractive ? (
            <input
              type="text"
              value={formState.studentState || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, studentState: e.target.value }))}
              placeholder="State"
              style={{ position: "absolute", top: "54.05%", left: "52.63%", width: "13.10%", height: "2.30%" }}
              className={INTERACTIVE_INPUT_CLASS}
              title="Student State"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "54.05%", left: "52.63%", width: "13.10%", height: "2.30%" }}
              className={READONLY_INPUT_CLASS}
            >
              <span className="truncate">{formState.studentState || ""}</span>
            </div>
          )}

          {/* Student Zip */}
          {isInteractive ? (
            <input
              type="text"
              value={formState.studentZip || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, studentZip: e.target.value }))}
              placeholder="Zip Code"
              style={{ position: "absolute", top: "54.05%", left: "75.96%", width: "16.35%", height: "2.30%" }}
              className={INTERACTIVE_INPUT_CLASS}
              title="Student Zip Code"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "54.05%", left: "75.96%", width: "16.35%", height: "2.30%" }}
              className={READONLY_INPUT_CLASS}
            >
              <span className="truncate">{formState.studentZip || ""}</span>
            </div>
          )}

          {/* Student GTID */}
          {isInteractive ? (
            <input
              type="text"
              value={formState.studentGtid || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, studentGtid: e.target.value }))}
              placeholder="GTID #"
              style={{ position: "absolute", top: "56.70%", left: "15.69%", width: "29.43%", height: "2.30%" }}
              className={INTERACTIVE_INPUT_CLASS}
              title="GTID #"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "56.70%", left: "15.69%", width: "29.43%", height: "2.30%" }}
              className={READONLY_INPUT_CLASS}
            >
              <span className="truncate">{formState.studentGtid || ""}</span>
            </div>
          )}

          {/* Current School */}
          {isInteractive ? (
            <input
              type="text"
              value={formState.currentSchool || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, currentSchool: e.target.value }))}
              placeholder="Current School"
              style={{ position: "absolute", top: "59.35%", left: "24.82%", width: "66.51%", height: "2.30%" }}
              className={INTERACTIVE_INPUT_CLASS}
              title="Current School"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "59.35%", left: "24.82%", width: "66.51%", height: "2.30%" }}
              className={READONLY_INPUT_CLASS}
            >
              <span className="truncate">{formState.currentSchool || ""}</span>
            </div>
          )}

          {/* Quick "Same as Student" button on Parent section header */}
          {isInteractive && (
            <button
              type="button"
              onClick={() => {
                onChange?.((prev) => ({
                  ...prev,
                  parentAddress: prev.studentAddress || "",
                  parentCity: prev.studentCity || "",
                  parentState: prev.studentState || "GA",
                  parentZip: prev.studentZip || "",
                }));
              }}
              style={{ position: "absolute", top: "68.20%", right: "6.8%", height: "2.40%" }}
              className="cursor-pointer z-30 px-2.5 py-0.5 rounded-[3px] bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-[10px] sm:text-[11px] shadow-[0_2px_5px_rgba(0,0,0,0.35)] border border-[#FFE394]/70 hover:brightness-110 flex items-center gap-1.5 transition-all select-none"
              title="Copy student residential address, city, state, and zip code to parent"
            >
              <Copy className="w-3 h-3" />
              <span>Same as Student</span>
            </button>
          )}

          {/* Parent Name */}
          {isInteractive ? (
            <input
              type="text"
              value={formState.parentName || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, parentName: e.target.value }))}
              placeholder="Parent Name (if not complainant)"
              style={{ position: "absolute", top: "71.15%", left: "36.25%", width: "55.61%", height: "2.30%" }}
              className={INTERACTIVE_INPUT_CLASS}
              title="Parent if not the complainant"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "71.15%", left: "36.25%", width: "55.61%", height: "2.30%" }}
              className={cn(READONLY_INPUT_CLASS, "font-medium")}
            >
              <span className="truncate">{formState.parentName || ""}</span>
            </div>
          )}

          {/* Parent Address */}
          {isInteractive ? (
            <input
              type="text"
              value={formState.parentAddress || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, parentAddress: e.target.value }))}
              placeholder="Parent Street Address"
              style={{ position: "absolute", top: "73.80%", left: "22.96%", width: "69.78%", height: "2.30%" }}
              className={INTERACTIVE_INPUT_CLASS}
              title="Parent Address"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "73.80%", left: "22.96%", width: "69.78%", height: "2.30%" }}
              className={READONLY_INPUT_CLASS}
            >
              <span className="truncate">{formState.parentAddress || ""}</span>
            </div>
          )}

          {/* Parent City */}
          {isInteractive ? (
            <input
              type="text"
              value={formState.parentCity || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, parentCity: e.target.value }))}
              placeholder="City"
              style={{ position: "absolute", top: "76.45%", left: "13.35%", width: "31.63%", height: "2.30%" }}
              className={INTERACTIVE_INPUT_CLASS}
              title="Parent City"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "76.45%", left: "13.35%", width: "31.63%", height: "2.30%" }}
              className={READONLY_INPUT_CLASS}
            >
              <span className="truncate">{formState.parentCity || ""}</span>
            </div>
          )}

          {/* Parent State */}
          {isInteractive ? (
            <input
              type="text"
              value={formState.parentState || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, parentState: e.target.value }))}
              placeholder="State"
              style={{ position: "absolute", top: "76.45%", left: "50.65%", width: "13.08%", height: "2.30%" }}
              className={INTERACTIVE_INPUT_CLASS}
              title="Parent State"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "76.45%", left: "50.65%", width: "13.08%", height: "2.30%" }}
              className={READONLY_INPUT_CLASS}
            >
              <span className="truncate">{formState.parentState || ""}</span>
            </div>
          )}

          {/* Parent Zip */}
          {isInteractive ? (
            <input
              type="text"
              value={formState.parentZip || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, parentZip: e.target.value }))}
              placeholder="Zip Code"
              style={{ position: "absolute", top: "76.45%", left: "72.78%", width: "20.73%", height: "2.30%" }}
              className={INTERACTIVE_INPUT_CLASS}
              title="Parent Zip Code"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "76.45%", left: "72.78%", width: "20.73%", height: "2.30%" }}
              className={READONLY_INPUT_CLASS}
            >
              <span className="truncate">{formState.parentZip || ""}</span>
            </div>
          )}

          {/* Parent Phone */}
          {isInteractive ? (
            <input
              type="text"
              value={formState.parentPhone || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, parentPhone: e.target.value }))}
              placeholder="Parent Phone Number(s)"
              style={{ position: "absolute", top: "79.10%", left: "31.76%", width: "61.08%", height: "2.30%" }}
              className={INTERACTIVE_INPUT_CLASS}
              title="Parent Phone Numbers"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "79.10%", left: "31.76%", width: "61.08%", height: "2.30%" }}
              className={READONLY_INPUT_CLASS}
            >
              <span className="truncate">{formState.parentPhone || ""}</span>
            </div>
          )}

          {/* Parent Email */}
          {isInteractive ? (
            <input
              type="text"
              value={formState.parentEmail || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, parentEmail: e.target.value }))}
              placeholder="Parent Email Address"
              style={{ position: "absolute", top: "81.70%", left: "28.41%", width: "64.33%", height: "2.30%" }}
              className={INTERACTIVE_INPUT_CLASS}
              title="Parent Email Address"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "81.70%", left: "28.41%", width: "64.33%", height: "2.30%" }}
              className={READONLY_INPUT_CLASS}
            >
              <span className="truncate">{formState.parentEmail || ""}</span>
            </div>
          )}
        </>
      )}

      {/* ── PAGE 2: PARAGRAPH BOXES ── */}
      {pageIdx === 1 && (
        <>
          {/* Top Paragraph Box: Statement of Problem & Alleged Violations (Box 1) */}
          {isInteractive ? (
            <textarea
              value={formState.statementOfViolations || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, statementOfViolations: e.target.value }))}
              placeholder="Type or paste statement of the problem and the facts upon which the problem is based..."
              style={{ position: "absolute", top: "21.14%", left: "6.10%", width: "87.96%", height: "20.18%" }}
              className="bg-[#CCE5FF] hover:bg-[#B8DCFF] focus:bg-[#B8DCFF] text-[#072448] font-medium border-2 border-[#5594E6] focus:border-[#1E60BF] focus:ring-2 focus:ring-[#1E60BF]/50 rounded-[3px] p-2.5 text-xs sm:text-[13px] font-sans resize-none leading-relaxed focus:outline-none shadow-[inset_0_1px_3px_rgba(0,50,150,0.08)] z-20 transition-all placeholder:text-blue-900/60 placeholder:italic"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "21.14%", left: "6.10%", width: "87.96%", height: "20.18%" }}
              className={READONLY_TEXTAREA_CLASS}
            >
              {formState.statementOfViolations || ""}
            </div>
          )}

          {/* Bottom Paragraph Box: Continued Facts & Factual Chronology (Box 2) */}
          {isInteractive ? (
            <textarea
              value={formState.factsRelatingToViolations || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, factsRelatingToViolations: e.target.value }))}
              placeholder="Continue stating the facts relevant to the alleged violations that help explain or clarify how the LEA failed to follow rules..."
              style={{ position: "absolute", top: "50.06%", left: "6.55%", width: "87.76%", height: "43.76%" }}
              className="bg-[#CCE5FF] hover:bg-[#B8DCFF] focus:bg-[#B8DCFF] text-[#072448] font-medium border-2 border-[#5594E6] focus:border-[#1E60BF] focus:ring-2 focus:ring-[#1E60BF]/50 rounded-[3px] p-2.5 text-xs sm:text-[13px] font-sans resize-none leading-relaxed focus:outline-none shadow-[inset_0_1px_3px_rgba(0,50,150,0.08)] z-20 transition-all placeholder:text-blue-900/60 placeholder:italic"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "50.06%", left: "6.55%", width: "87.76%", height: "43.76%" }}
              className={READONLY_TEXTAREA_CLASS}
            >
              {formState.factsRelatingToViolations || ""}
            </div>
          )}
        </>
      )}

      {/* ── PAGE 3: PROPOSED RESOLUTION, MEDIATION & SERVICE VERIFICATION ── */}
      {pageIdx === 2 && (
        <>
          {/* Top Paragraph Box: Proposed Resolution of Problem (Box 3) */}
          {isInteractive ? (
            <textarea
              value={formState.proposedResolution || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, proposedResolution: e.target.value }))}
              placeholder="Type or paste proposed resolution of the problem..."
              style={{ position: "absolute", top: "16.85%", left: "5.14%", width: "88.18%", height: "21.00%" }}
              className="bg-[#CCE5FF] hover:bg-[#B8DCFF] focus:bg-[#B8DCFF] text-[#072448] font-medium border-2 border-[#5594E6] focus:border-[#1E60BF] focus:ring-2 focus:ring-[#1E60BF]/50 rounded-[3px] p-2.5 text-xs sm:text-[13px] font-sans resize-none leading-relaxed focus:outline-none shadow-[inset_0_1px_3px_rgba(0,50,150,0.08)] z-20 transition-all placeholder:text-blue-900/60 placeholder:italic"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "16.85%", left: "5.14%", width: "88.18%", height: "21.00%" }}
              className={READONLY_TEXTAREA_CLASS}
            >
              {formState.proposedResolution || ""}
            </div>
          )}

          {/* Mediation Check Box 1: YES */}
          {isInteractive ? (
            <button
              type="button"
              onClick={() => onChange((prev) => ({ ...prev, mediationWillingness: "yes" }))}
              style={{ position: "absolute", top: "42.29%", left: "6.04%", width: "2.94%", height: "2.27%" }}
              className="cursor-pointer flex items-center justify-center bg-[#CCE5FF] hover:bg-[#B8DCFF] border-2 border-[#3A82E4] rounded-[2px] shadow-[0_1px_2px_rgba(0,50,150,0.12)] z-20 transition-all hover:scale-110"
              title="Check YES for Mediation Willingness"
            >
              {formState.mediationWillingness === "yes" && (
                <Check className="w-3.5 h-3.5 text-slate-900 stroke-[3]" />
              )}
            </button>
          ) : (
            <div
              style={{ position: "absolute", top: "42.29%", left: "6.04%", width: "2.94%", height: "2.27%" }}
              className={READONLY_CHECK_CLASS}
            >
              {formState.mediationWillingness === "yes" && (
                <Check className="w-3.5 h-3.5 text-slate-900 stroke-[3]" />
              )}
            </div>
          )}

          {/* Mediation Check Box 2: NO */}
          {isInteractive ? (
            <button
              type="button"
              onClick={() => onChange((prev) => ({ ...prev, mediationWillingness: "no" }))}
              style={{ position: "absolute", top: "42.29%", left: "17.85%", width: "2.94%", height: "2.27%" }}
              className="cursor-pointer flex items-center justify-center bg-[#CCE5FF] hover:bg-[#B8DCFF] border-2 border-[#3A82E4] rounded-[2px] shadow-[0_1px_2px_rgba(0,50,150,0.12)] z-20 transition-all hover:scale-110"
              title="Check NO for Mediation Willingness"
            >
              {formState.mediationWillingness === "no" && (
                <Check className="w-3.5 h-3.5 text-slate-900 stroke-[3]" />
              )}
            </button>
          ) : (
            <div
              style={{ position: "absolute", top: "42.29%", left: "17.85%", width: "2.94%", height: "2.27%" }}
              className={READONLY_CHECK_CLASS}
            >
              {formState.mediationWillingness === "no" && (
                <Check className="w-3.5 h-3.5 text-slate-900 stroke-[3]" />
              )}
            </div>
          )}

          {/* Mediation Check Box 3: Not Applicable */}
          {isInteractive ? (
            <button
              type="button"
              onClick={() => onChange((prev) => ({ ...prev, mediationWillingness: "na" }))}
              style={{ position: "absolute", top: "42.29%", left: "29.27%", width: "2.94%", height: "2.27%" }}
              className="cursor-pointer flex items-center justify-center bg-[#CCE5FF] hover:bg-[#B8DCFF] border-2 border-[#3A82E4] rounded-[2px] shadow-[0_1px_2px_rgba(0,50,150,0.12)] z-20 transition-all hover:scale-110"
              title="Check Not Applicable for Mediation Willingness"
            >
              {formState.mediationWillingness === "na" && (
                <Check className="w-3.5 h-3.5 text-slate-900 stroke-[3]" />
              )}
            </button>
          ) : (
            <div
              style={{ position: "absolute", top: "42.29%", left: "29.27%", width: "2.94%", height: "2.27%" }}
              className={READONLY_CHECK_CLASS}
            >
              {formState.mediationWillingness === "na" && (
                <Check className="w-3.5 h-3.5 text-slate-900 stroke-[3]" />
              )}
            </div>
          )}

          {/* Verification of Service: Date ("On [date]") */}
          {isInteractive ? (
            <input
              type="text"
              value={formState.serviceDate || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, serviceDate: e.target.value }))}
              placeholder="Date provided"
              style={{ position: "absolute", top: "62.15%", left: "10.04%", width: "23.98%", height: "2.30%" }}
              className={INTERACTIVE_INPUT_CLASS}
              title="Date formal complaint was provided"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "62.15%", left: "10.04%", width: "23.98%", height: "2.30%" }}
              className={READONLY_INPUT_CLASS}
            >
              <span className="truncate">{formState.serviceDate || ""}</span>
            </div>
          )}

          {/* Verification of Service: Recipient */}
          {isInteractive ? (
            <input
              type="text"
              value={formState.serviceRecipient || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, serviceRecipient: e.target.value }))}
              placeholder="Name or title of recipient"
              style={{ position: "absolute", top: "67.45%", left: "6.86%", width: "40.35%", height: "2.30%" }}
              className={cn(INTERACTIVE_INPUT_CLASS, "font-medium")}
              title="Name or title of recipient"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "67.45%", left: "6.86%", width: "40.35%", height: "2.30%" }}
              className={cn(READONLY_INPUT_CLASS, "font-medium")}
            >
              <span className="truncate">{formState.serviceRecipient || ""}</span>
            </div>
          )}

          {/* Verification of Service: Delivery Method ("via [method]") */}
          {isInteractive ? (
            <input
              type="text"
              value={resolvedServiceMethod}
              onChange={(e) => onChange((prev) => ({ ...prev, serviceMethod: e.target.value }))}
              placeholder="Electronic Delivery"
              style={{ position: "absolute", top: "67.45%", left: "50.82%", width: "37.06%", height: "2.30%" }}
              className={INTERACTIVE_INPUT_CLASS}
              title="Method of delivery"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "67.45%", left: "50.82%", width: "37.06%", height: "2.30%" }}
              className={READONLY_INPUT_CLASS}
            >
              <span className="truncate">{resolvedServiceMethod}</span>
            </div>
          )}

          {/* ── SIGNATURE OF COMPLAINANT (WITH ADOPT & SIGN INTEGRATION, SIZE ADJUSTMENT & MOVABLE NUDGING) ── */}
          {(() => {
            const sigScale = formState.signatureScale || 1.35;
            const sigOffsetY = formState.signatureOffsetY || 0;
            const sigOffsetX = formState.signatureOffsetX || 0;

            const handleSignatureMouseDown = (e: React.MouseEvent) => {
              e.stopPropagation();
              e.preventDefault();
              const startX = e.clientX;
              const startY = e.clientY;
              const initOffsetX = formState.signatureOffsetX || 0;
              const initOffsetY = formState.signatureOffsetY || 0;

              const onMouseMove = (moveEvent: MouseEvent) => {
                const dx = moveEvent.clientX - startX;
                const dy = moveEvent.clientY - startY;
                onChange?.((prev) => ({
                  ...prev,
                  signatureOffsetX: Math.round(initOffsetX + dx),
                  signatureOffsetY: Math.round(initOffsetY + dy),
                }));
              };

              const onMouseUp = () => {
                window.removeEventListener("mousemove", onMouseMove);
                window.removeEventListener("mouseup", onMouseUp);
              };

              window.addEventListener("mousemove", onMouseMove);
              window.addEventListener("mouseup", onMouseUp);
            };

            const isHandDrawn = formState.signatureType === "draw" && Boolean(formState.signatureDataUrl);
            const hasSignature = Boolean(isHandDrawn || formState.signatureName);

            return isInteractive ? (
              <div
                style={{ position: "absolute", top: "74.20%", left: "28.50%", width: "50.50%", height: "7.80%" }}
                className="z-20 flex items-center"
              >
                {hasSignature ? (
                  <div
                    className="w-full h-full bg-transparent border-0 rounded-none px-2.5 flex items-center justify-between group overflow-visible relative"
                    title="Drag signature to move on line, or click Change"
                  >
                    {/* Draggable Movable Signature Element */}
                    <div
                      onMouseDown={handleSignatureMouseDown}
                      className="flex items-center overflow-visible flex-1 h-full py-0.5 cursor-grab active:cursor-grabbing select-none"
                      title="Click and drag signature to align with printed line"
                    >
                      <div
                        style={{
                          transform: `translate(${sigOffsetX}px, ${sigOffsetY}px) scale(${sigScale})`,
                          transformOrigin: "left center",
                        }}
                        className="h-full flex items-center transition-transform duration-75 origin-left"
                      >
                        {isHandDrawn ? (
                          <img
                            src={formState.signatureDataUrl}
                            alt="Signature of Complainant"
                            className="h-full max-h-[85px] w-auto object-contain object-left pointer-events-none select-none"
                          />
                        ) : (
                          <span
                            style={{
                              fontFamily: resolvedSignatureFont,
                              letterSpacing: resolvedSignatureLetterSpacing,
                            }}
                            className="text-4xl sm:text-5xl md:text-[54px] text-blue-950 font-bold tracking-wide whitespace-nowrap overflow-visible leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)] pointer-events-none select-none"
                          >
                            {formState.signatureName || "Byron Honea"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Controls Stacked: Steppers Placed ABOVE Change Button */}
                    <div
                      className="flex flex-col items-end gap-1 shrink-0 ml-2 z-30"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* TOP ROW: Line Nudge (▲ ▼) and Size Stepper (– +) ABOVE Change */}
                      <div className="flex items-center gap-1">
                        {/* Position Nudge: Up / Down onto Line */}
                        <div
                          className="flex items-center bg-white/95 border border-slate-300 rounded px-1 py-0.5 shadow-xs gap-0.5"
                          title="Move signature up or down onto the line"
                        >
                          <span className="text-[9px] font-mono text-slate-500 uppercase font-bold mr-0.5">Line</span>
                          <button
                            type="button"
                            onClick={() => onChange?.((prev) => ({ ...prev, signatureOffsetY: (prev.signatureOffsetY || 0) - 2 }))}
                            title="Move UP onto line (–2px)"
                            className="w-4 h-4 rounded hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center cursor-pointer transition-colors"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => onChange?.((prev) => ({ ...prev, signatureOffsetY: (prev.signatureOffsetY || 0) + 2 }))}
                            title="Move DOWN onto line (+2px)"
                            className="w-4 h-4 rounded hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center cursor-pointer transition-colors"
                          >
                            ▼
                          </button>
                        </div>

                        {/* Size Stepper: – and + */}
                        <div
                          className="flex items-center bg-white/95 border border-blue-200 rounded px-1 py-0.5 shadow-xs gap-0.5"
                          title="Signature scale size"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              const next = Math.max(0.25, Math.round((sigScale - 0.10) * 100) / 100);
                              onChange?.((prev) => ({ ...prev, signatureScale: next }));
                            }}
                            title="Make signature smaller"
                            className="w-4 h-4 rounded hover:bg-blue-100 text-blue-950 font-bold text-xs flex items-center justify-center cursor-pointer transition-colors"
                          >
                            –
                          </button>
                          <span className="text-[10px] font-mono font-bold text-blue-900 min-w-[30px] text-center select-none">
                            {Math.round(sigScale * 100)}%
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const next = Math.min(2.5, Math.round((sigScale + 0.10) * 100) / 100);
                              onChange?.((prev) => ({ ...prev, signatureScale: next }));
                            }}
                            title="Make signature larger"
                            className="w-4 h-4 rounded hover:bg-blue-100 text-blue-950 font-bold text-xs flex items-center justify-center cursor-pointer transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* BOTTOM ROW: Change Button (Under Size Stepper) */}
                      <button
                        type="button"
                        onClick={() => onOpenAdoptSign?.()}
                        className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-[9px] uppercase font-mono font-bold tracking-wider shadow-xs transition-colors cursor-pointer"
                        title="Change signature style or re-adopt"
                      >
                        <span>Change</span>
                        <PenTool className="w-2.5 h-2.5 text-white" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenAdoptSign?.()}
                    className="w-full h-full flex items-center justify-between px-3.5 bg-transparent hover:bg-[#EBF4FE]/30 border border-[#96C2F7]/70 hover:border-[#2563EB] border-dashed rounded-xs text-xs text-blue-900 font-medium cursor-pointer transition-all group"
                    title="Click to Adopt and Sign formal complaint"
                  >
                    <span className="flex items-center gap-2 font-sans">
                      <PenTool className="w-4 h-4 text-blue-700 group-hover:scale-110 transition-transform" />
                      <span className="font-semibold text-blue-950 text-sm sm:text-base">Click to Adopt & Sign</span>
                    </span>
                    <span className="text-[11px] uppercase font-mono px-2.5 py-1 rounded bg-blue-600 text-white font-bold tracking-wider shadow-xs group-hover:bg-blue-700 transition-colors">
                      Adopt & Sign
                    </span>
                  </button>
                )}
              </div>
            ) : (
              <div
                style={{ position: "absolute", top: "74.20%", left: "28.50%", width: "50.50%", height: "7.80%" }}
                className="z-20 flex items-center bg-transparent border-0"
              >
                <div className="w-full h-full bg-transparent border-0 rounded-none px-2.5 flex items-center overflow-visible relative">
                  <div className="flex items-center overflow-visible flex-1 h-full py-0.5 select-none">
                    <div
                      style={{
                        transform: `translate(${sigOffsetX}px, ${sigOffsetY}px) scale(${sigScale})`,
                        transformOrigin: "left center",
                      }}
                      className="h-full flex items-center origin-left"
                    >
                      {isHandDrawn ? (
                        <img
                          src={formState.signatureDataUrl}
                          alt="Signature of Complainant"
                          className="h-full max-h-[85px] w-auto object-contain object-left pointer-events-none select-none"
                        />
                      ) : (
                        <span
                          style={{
                            fontFamily: resolvedSignatureFont,
                            letterSpacing: resolvedSignatureLetterSpacing,
                          }}
                          className="text-4xl sm:text-5xl md:text-[54px] text-blue-950 font-bold tracking-wide whitespace-nowrap overflow-visible leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)] pointer-events-none select-none"
                        >
                          {formState.signatureName || "Byron Honea"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Signature Date */}
          {isInteractive ? (
            <input
              type="text"
              value={formState.signatureDate || ""}
              onChange={(e) => onChange((prev) => ({ ...prev, signatureDate: e.target.value }))}
              placeholder="Date"
              style={{ position: "absolute", top: "79.20%", left: "80.50%", width: "15.00%", height: "2.30%" }}
              className={cn(INTERACTIVE_INPUT_CLASS, "font-medium")}
              title="Signature Date"
            />
          ) : (
            <div
              style={{ position: "absolute", top: "79.20%", left: "80.50%", width: "15.00%", height: "2.30%" }}
              className={cn(READONLY_INPUT_CLASS, "font-medium")}
            >
              <span className="truncate">{formState.signatureDate || ""}</span>
            </div>
          )}
        </>
      )}

      {/* Sheet Page Tag at Bottom Right */}
      <div className="absolute bottom-2 right-4 text-[9px] font-mono font-bold text-slate-400 pointer-events-none select-none">
        Page {pageIdx + 1} of 4 · Official GaDOE Form
      </div>
    </div>
  );
}

export interface StateComplaintFormViewProps {
  formState: OfficialComplaintFormState;
  onChange: (updater: (prev: OfficialComplaintFormState) => OfficialComplaintFormState) => void;
  onSelectState?: (stateCode: string) => void;
  onPagesLoaded?: (pages: ImportedPdfPage[]) => void;
  readOnly?: boolean;
  viewMode?: "fit-width" | "fit-page" | "actual";
  zoomLevel?: number;
  renderedPages?: ImportedPdfPage[];
  isRendering?: boolean;
  totalPages?: number;
}

export function StateComplaintFormView({
  formState,
  onChange,
  onPagesLoaded,
  readOnly = false,
  viewMode = "fit-width",
  zoomLevel = 100,
  renderedPages,
  totalPages = 10,
}: StateComplaintFormViewProps) {
  // Local fallback pages if renderedPages is not yet loaded from parent
  const [localPages, setLocalPages] = useState<ImportedPdfPage[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [isAdoptSignOpen, setIsAdoptSignOpen] = useState(false);

  useEffect(() => {
    if (renderedPages && renderedPages.length >= 4) {
      setLocalPages(renderedPages);
      return;
    }

    let isMounted = true;
    setIsLoadingPages(true);

    fetch(GADOE_PDF_URL)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load PDF");
        return res.arrayBuffer();
      })
      .then((buffer) => convertPdfToPageImages(buffer, 1.8))
      .then((pages) => {
        if (isMounted && pages.length >= 4) {
          setLocalPages(pages);
          onPagesLoaded?.(pages);
        }
      })
      .catch((err) => {
        console.error("Error loading state form template:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingPages(false);
      });

    return () => {
      isMounted = false;
    };
  }, [renderedPages, onPagesLoaded]);

  const activePages = renderedPages && renderedPages.length >= 4 ? renderedPages : localPages;
  const stateConfig = SUPPORTED_STATE_FORMS[formState.stateCode] || SUPPORTED_STATE_FORMS.GA;

  const handleAdoptSignature = (data: AdoptedSignatureData) => {
    onChange((prev) => ({
      ...prev,
      signatureName: data.signatureName,
      signatureDate: data.signatureDate,
      signatureDataUrl: data.signatureDataUrl,
      signatureStyle: data.signatureStyle,
      signatureScale: data.signatureScale,
      signatureType: data.signatureType,
    }));
  };

  return (
    <div className="w-full flex flex-col items-center select-none pb-12">
      {/* ── 4 Authentic Official State Complaint Form Letter Sheets ─────────────── */}
      {/* Zero iframes! Paragraph boxes are directly interactive textareas overlaid
          at exact PDF coordinates so whatever is typed stays permanently in React state & auto-saves */}
      {activePages.length > 0 ? (
        <div className="w-full max-w-[840px] flex flex-col items-center gap-6">
          {activePages.slice(0, 4).map((page, pageIdx) => (
            <StateComplaintFormPage
              key={page.pageNumber || pageIdx}
              page={page}
              pageIdx={pageIdx}
              formState={formState}
              onChange={onChange}
              onOpenAdoptSign={() => setIsAdoptSignOpen(true)}
              readOnly={readOnly}
              isPrint={false}
              viewMode={viewMode}
              zoomLevel={zoomLevel}
            />
          ))}
        </div>
      ) : (
        <div className="w-full max-w-[840px] aspect-[612/792] bg-white rounded-xs border border-[#C5A059]/60 shadow-xl flex flex-col items-center justify-center text-slate-500 font-serif my-4">
          <div className="animate-spin w-8 h-8 border-2 border-[#C5A059] border-t-transparent rounded-full mb-3" />
          <span className="text-sm">Loading Official State Complaint Form Sheets...</span>
        </div>
      )}

      {/* Bottom Docket Page Indicator */}
      <div className="w-full max-w-[840px] px-3 py-2 flex items-center justify-between text-[11px] font-serif text-[#C6B697] border-t border-[#3A2C18]/60 mt-4">
        <span className="tracking-wide">{stateConfig.agencyName} · Special Education Formal Complaint</span>
        <span className="font-mono text-[#FFE394] font-bold">Pages 1–4 of {totalPages}</span>
      </div>

      {/* ── ADOPT AND SIGN MODAL DIALOG ────────────────────────────────────── */}
      <AdoptAndSignModal
        isOpen={isAdoptSignOpen}
        onClose={() => setIsAdoptSignOpen(false)}
        onAdopt={handleAdoptSignature}
        initialName={formState.signatureName || formState.complainantName || "Byron Honea"}
        initialDate={formState.signatureDate}
        initialScale={formState.signatureScale || 1.35}
        initialStyle={formState.signatureStyle}
        initialType={formState.signatureType}
      />
    </div>
  );
}
