import React, { useState, useEffect, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import {
  type OfficialComplaintFormState,
  SUPPORTED_STATE_FORMS,
} from "./stateFormsData";
import { convertPdfToPageImages, type ImportedPdfPage } from "@/lib/pdfImporter";
import { cn } from "@/lib/utils";
import {
  FileText,
  Pencil,
  CheckCircle2,
  Building,
  User,
  Calendar,
  Phone,
  Mail,
  Scale,
  FileCheck,
  Eye,
  Info,
  Check,
} from "lucide-react";

interface StateComplaintFormViewProps {
  formState: OfficialComplaintFormState;
  onChange: (updater: (prev: OfficialComplaintFormState) => OfficialComplaintFormState) => void;
  onSelectState?: (stateCode: string) => void;
  readOnly?: boolean;
  viewMode?: "fit-width" | "fit-page" | "actual";
  zoomLevel?: number;
  renderedPages?: ImportedPdfPage[];
  isRendering?: boolean;
}

const GADOE_PDF_URL = "/forms/gadoe-formal-complaint-form.pdf";

export function StateComplaintFormView({
  formState,
  onChange,
  onSelectState,
  readOnly = false,
  viewMode = "fit-width",
  zoomLevel = 100,
  renderedPages: propRenderedPages,
  isRendering = false,
}: StateComplaintFormViewProps) {
  // Always default to "interactive" mode so spot 01 is immediately editable directly on the document sheets
  const [formMode, setFormMode] = useState<"interactive" | "facsimile">("interactive");
  const [internalPages, setInternalPages] = useState<ImportedPdfPage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Helper to update any field in formState
  const updateField = (field: keyof OfficialComplaintFormState, value: any) => {
    onChange((prev) => ({ ...prev, [field]: value }));
  };

  // Self-render fallback for facsimile mode if renderedPages not provided by parent
  useEffect(() => {
    if (formMode !== "facsimile") return;
    if (propRenderedPages && propRenderedPages.length > 0) return;

    let isCancelled = false;
    const generateFallback = async () => {
      try {
        setIsGenerating(true);
        const res = await fetch(GADOE_PDF_URL);
        if (!res.ok) return;
        const bytes = await res.arrayBuffer();
        const pdfDoc = await PDFDocument.load(bytes);
        const form = pdfDoc.getForm();

        const setIf = (name: string, val: string | undefined | null) => {
          if (!val) return;
          try {
            const f = form.getTextField(name);
            if (f) f.setText(String(val));
          } catch (e) {}
        };

        setIf("Public agency filing complaint against", formState.publicAgency);
        setIf("Name of Complainant", formState.complainantName);
        setIf("Relationship to student", formState.complainantRelationship);
        setIf("Complainant Address", formState.complainantAddress);
        setIf("City", formState.complainantCity);
        setIf("State", formState.complainantState || "GA");
        setIf("Zip Code", formState.complainantZip);
        setIf("Complainant Phone Numbers", formState.complainantPhone);
        setIf("Complainant Email Address", formState.complainantEmail);

        setIf("Name of Student", formState.studentName);
        setIf("Date of Birth", formState.studentDob);
        setIf("Student Address", formState.studentAddress);
        setIf("City_2", formState.studentCity);
        setIf("State_2", formState.studentState || "GA");
        setIf("Zip Code_2", formState.studentZip);
        setIf("GTID", formState.studentGtid);
        setIf("Current School", formState.currentSchool);

        setIf(
          "Please provide a statement of the problem and the facts upon which the problem is based Include the date and time when the violation occurred or the duration of the violation and supporting documentation",
          formState.statementOfViolations || formState.factsRelatingToViolations
        );
        setIf(
          "Please provide a proposed resolution of the problem to the extent known and available to the party at the time the complaint is filed",
          formState.proposedResolution
        );

        const saved = await pdfDoc.save();
        const imgs = await convertPdfToPageImages(saved.buffer as ArrayBuffer, 1.8);
        if (!isCancelled && imgs.length > 0) {
          setInternalPages(imgs);
        }
      } catch (err) {
        console.error("Error generating fallback pages in StateComplaintFormView:", err);
      } finally {
        if (!isCancelled) setIsGenerating(false);
      }
    };

    generateFallback();
    return () => {
      isCancelled = true;
    };
  }, [formMode, propRenderedPages, formState]);

  const activePages = (propRenderedPages && propRenderedPages.length > 0) ? propRenderedPages : internalPages;
  const stateConfig = SUPPORTED_STATE_FORMS[formState.stateCode] || SUPPORTED_STATE_FORMS.GA;

  // Shared sheet sizing style ensuring standard 8.5 x 11 Letter layout
  const sheetStyle: React.CSSProperties = {
    width: viewMode === "actual" ? "816px" : "100%",
    maxWidth: "816px",
    minHeight: "1056px",
    transform: viewMode === "fit-page" 
      ? "scale(0.78)" 
      : zoomLevel !== 100 
        ? `scale(${zoomLevel / 100})` 
        : undefined,
    transformOrigin: "top center",
    marginBottom: (viewMode !== "fit-page" && zoomLevel > 100) 
      ? `${(zoomLevel - 100) * 11}px` 
      : (viewMode === "fit-page")
        ? "-180px"
        : undefined,
  };

  // Shared sheet CSS class
  const sheetClass = cn(
    "relative rounded-xs select-text flex flex-col justify-between transition-all",
    "bg-white text-[#1A120A] border border-[#C5A059]/60 shadow-[0_16px_50px_rgba(0,0,0,0.85),0_2px_8px_rgba(0,0,0,0.5)]",
    "px-8 sm:px-12 md:px-14 pt-8 pb-8 my-3 shrink-0 overflow-hidden"
  );

  // Field input styling: clean, accessible, slightly tinted field style matching official fillable legal forms
  const fieldInputClass = cn(
    "w-full bg-[#EDF3FA]/75 hover:bg-[#E3EDF7] focus:bg-white text-[#1A120A] border border-[#9BB4CE] focus:border-[#C5A059] rounded-[3px] px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#C5A059] transition-all font-sans font-medium"
  );
  const fieldLabelClass = "text-[10px] font-sans font-bold uppercase tracking-wider text-[#4A5D73] block mb-0.5";

  return (
    <div className="w-full flex flex-col items-center select-none pb-6">
      
      {/* ── Mode Switcher & Status Bar: Always allows direct editing in spot 01 ── */}
      <div className="w-full max-w-[816px] mb-2 px-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#0A264D]/90 border border-[#DFBE77]/60 text-[#FFE394] shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>01 Spot: Live Form Editor Active</span>
          </span>
          <span className="text-[11px] text-[#A69371] hidden sm:inline">
            Click any field to edit directly on the official sheets
          </span>
        </div>

        <div className="flex items-center bg-[#05142B]/90 border border-[#3A2C18] rounded-md p-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => setFormMode("interactive")}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer",
              formMode === "interactive"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-xs"
                : "text-[#C6B697] hover:text-[#FFF4D4]"
            )}
            title="Edit official complaint fields directly on the sheets"
          >
            <Pencil className="w-3 h-3" />
            <span>Edit Form (Live)</span>
          </button>
          <button
            type="button"
            onClick={() => setFormMode("facsimile")}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer",
              formMode === "facsimile"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-xs"
                : "text-[#C6B697] hover:text-[#FFF4D4]"
            )}
            title="View compiled official PDF print facsimile"
          >
            <Eye className="w-3 h-3" />
            <span>PDF Facsimile</span>
          </button>
        </div>
      </div>

      {/* ── MODE 1: INTERACTIVE LIVE EDITABLE SHEETS (Default) ───────────── */}
      {/* 4 Standard 8.5 x 11 Letter Sheets stacked vertically. Zero iframes, zero nested scrollbars! */}
      {formMode === "interactive" ? (
        <div className="flex flex-col items-center gap-6 w-full">

          {/* ════════════ SHEET 1 OF 4: AGENCY, PARTIES & STUDENT ════════════ */}
          <div style={sheetStyle} className={sheetClass}>
            {/* Corner margin registration marks */}
            <div className="absolute top-6 left-6 w-3 h-3 border-t border-l border-[#8C7A60]/40 pointer-events-none z-10" />
            <div className="absolute top-6 right-6 w-3 h-3 border-t border-r border-[#8C7A60]/40 pointer-events-none z-10" />
            <div className="absolute bottom-6 left-6 w-3 h-3 border-b border-l border-[#8C7A60]/40 pointer-events-none z-10" />
            <div className="absolute bottom-6 right-6 w-3 h-3 border-b border-r border-[#8C7A60]/40 pointer-events-none z-10" />

            <div className="relative z-10 flex flex-col flex-1 select-text">
              {/* Official Header */}
              <div className="text-center pb-3 border-b-2 border-[#1A120A] mb-3">
                <div className="font-serif font-bold text-xs uppercase tracking-widest text-[#1A120A]">
                  {stateConfig.agencyName.toUpperCase()}
                </div>
                <div className="font-serif text-[11px] text-[#4A5D73] font-medium tracking-wide">
                  {stateConfig.agencyDivision}
                </div>
                <h2 className="font-serif text-lg sm:text-xl font-black uppercase text-[#1A120A] mt-1 tracking-tight">
                  {stateConfig.formTitle}
                </h2>
                <p className="text-[10px] font-sans text-[#6B7280] italic mt-0.5">
                  Use the Tab Key to move to each part of the form · Official State Filing Document
                </p>
              </div>

              {/* Box 1: Public Agency */}
              <div className="p-2.5 rounded-sm border border-[#C5A059]/70 bg-[#F9FBFC] mb-3">
                <label className={fieldLabelClass}>
                  Public Agency Filing Complaint Against (Local Educational Agency / School District)
                </label>
                <div className="relative flex items-center">
                  <Building className="w-3.5 h-3.5 text-[#C5A059] absolute left-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={formState.publicAgency || ""}
                    onChange={(e) => updateField("publicAgency", e.target.value)}
                    placeholder="e.g. Cobb County School District"
                    className={cn(fieldInputClass, "pl-8 text-xs font-semibold")}
                  />
                </div>
              </div>

              {/* Box 2: Complainant Information */}
              <div className="p-3 rounded-sm border border-[#D5DFE8] bg-white mb-3">
                <div className="flex items-center gap-1.5 pb-1.5 border-b border-[#E2E8F0] mb-2">
                  <User className="w-3.5 h-3.5 text-[#0A264D]" />
                  <span className="font-serif font-bold text-xs text-[#0A264D]">
                    Person Filing Complaint (Complainant)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className={fieldLabelClass}>Name of Complainant</label>
                    <input
                      type="text"
                      value={formState.complainantName || ""}
                      onChange={(e) => updateField("complainantName", e.target.value)}
                      placeholder="e.g. Byron Honea, Master IEP Coach®"
                      className={fieldInputClass}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass}>Relationship to Student</label>
                    <input
                      type="text"
                      value={formState.complainantRelationship || ""}
                      onChange={(e) => updateField("complainantRelationship", e.target.value)}
                      placeholder="e.g. Authorized Special Education Advocate"
                      className={fieldInputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={fieldLabelClass}>Complainant Street Address</label>
                    <input
                      type="text"
                      value={formState.complainantAddress || ""}
                      onChange={(e) => updateField("complainantAddress", e.target.value)}
                      placeholder="Street address or PO Box"
                      className={fieldInputClass}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 sm:col-span-2">
                    <div className="col-span-1">
                      <label className={fieldLabelClass}>City</label>
                      <input
                        type="text"
                        value={formState.complainantCity || ""}
                        onChange={(e) => updateField("complainantCity", e.target.value)}
                        placeholder="City"
                        className={fieldInputClass}
                      />
                    </div>
                    <div>
                      <label className={fieldLabelClass}>State</label>
                      <input
                        type="text"
                        value={formState.complainantState || "GA"}
                        onChange={(e) => updateField("complainantState", e.target.value)}
                        className={fieldInputClass}
                      />
                    </div>
                    <div>
                      <label className={fieldLabelClass}>Zip Code</label>
                      <input
                        type="text"
                        value={formState.complainantZip || ""}
                        onChange={(e) => updateField("complainantZip", e.target.value)}
                        placeholder="Zip"
                        className={fieldInputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={fieldLabelClass}>Phone Number</label>
                    <input
                      type="text"
                      value={formState.complainantPhone || ""}
                      onChange={(e) => updateField("complainantPhone", e.target.value)}
                      placeholder="e.g. (404) 919-8664"
                      className={fieldInputClass}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass}>Email Address</label>
                    <input
                      type="email"
                      value={formState.complainantEmail || ""}
                      onChange={(e) => updateField("complainantEmail", e.target.value)}
                      placeholder="e.g. advocate@waypointadvocates.com"
                      className={fieldInputClass}
                    />
                  </div>
                </div>
              </div>

              {/* Box 3: Student Information */}
              <div className="p-3 rounded-sm border border-[#D5DFE8] bg-white mb-3">
                <div className="flex items-center gap-1.5 pb-1.5 border-b border-[#E2E8F0] mb-2">
                  <User className="w-3.5 h-3.5 text-[#0A264D]" />
                  <span className="font-serif font-bold text-xs text-[#0A264D]">
                    Student Information
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className={fieldLabelClass}>Name of Student</label>
                    <input
                      type="text"
                      value={formState.studentName || ""}
                      onChange={(e) => updateField("studentName", e.target.value)}
                      placeholder="Student full legal name"
                      className={cn(fieldInputClass, "font-semibold")}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass}>Date of Birth</label>
                    <input
                      type="text"
                      value={formState.studentDob || ""}
                      onChange={(e) => updateField("studentDob", e.target.value)}
                      placeholder="MM/DD/YYYY"
                      className={fieldInputClass}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className={fieldLabelClass}>Student Address</label>
                    <input
                      type="text"
                      value={formState.studentAddress || ""}
                      onChange={(e) => updateField("studentAddress", e.target.value)}
                      placeholder="Residence street address"
                      className={fieldInputClass}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass}>City</label>
                    <input
                      type="text"
                      value={formState.studentCity || ""}
                      onChange={(e) => updateField("studentCity", e.target.value)}
                      className={fieldInputClass}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass}>State</label>
                    <input
                      type="text"
                      value={formState.studentState || "GA"}
                      onChange={(e) => updateField("studentState", e.target.value)}
                      className={fieldInputClass}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass}>Zip Code</label>
                    <input
                      type="text"
                      value={formState.studentZip || ""}
                      onChange={(e) => updateField("studentZip", e.target.value)}
                      className={fieldInputClass}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass}>Current School</label>
                    <input
                      type="text"
                      value={formState.currentSchool || ""}
                      onChange={(e) => updateField("currentSchool", e.target.value)}
                      placeholder="School name"
                      className={fieldInputClass}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass}>Grade Level</label>
                    <input
                      type="text"
                      value={formState.grade || ""}
                      onChange={(e) => updateField("grade", e.target.value)}
                      placeholder="e.g. 4th grade"
                      className={fieldInputClass}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass}>GTID / Student ID</label>
                    <input
                      type="text"
                      value={formState.studentGtid || ""}
                      onChange={(e) => updateField("studentGtid", e.target.value)}
                      placeholder="GTID number"
                      className={fieldInputClass}
                    />
                  </div>
                </div>
              </div>

              {/* Box 4: Parent (if not complainant) */}
              <div className="p-2.5 rounded-sm border border-[#D5DFE8] bg-[#FAFCFE]">
                <div className="flex items-center justify-between pb-1 mb-1">
                  <span className="font-serif font-bold text-[11px] text-[#4A5D73]">
                    Parent Information (if not the Complainant)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className={fieldLabelClass}>Parent Name</label>
                    <input
                      type="text"
                      value={formState.parentName || ""}
                      onChange={(e) => updateField("parentName", e.target.value)}
                      placeholder="Parent name"
                      className={fieldInputClass}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass}>Parent Phone</label>
                    <input
                      type="text"
                      value={formState.parentPhone || ""}
                      onChange={(e) => updateField("parentPhone", e.target.value)}
                      placeholder="Phone"
                      className={fieldInputClass}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass}>Parent Email</label>
                    <input
                      type="email"
                      value={formState.parentEmail || ""}
                      onChange={(e) => updateField("parentEmail", e.target.value)}
                      placeholder="Email"
                      className={fieldInputClass}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sheet Footer */}
            <div className="pt-3 border-t border-[#8C7A60]/30 flex items-center justify-between text-[11px] font-serif text-[#6E5D43] shrink-0 mt-3">
              <span className="tracking-wide">{stateConfig.agencyName} · Special Education Formal Complaint</span>
              <span className="font-mono">Page 1 of 4</span>
            </div>
          </div>


          {/* ════════════ SHEET 2 OF 4: ALLEGATIONS & VIOLATIONS ════════════ */}
          <div style={sheetStyle} className={sheetClass}>
            <div className="absolute top-6 left-6 w-3 h-3 border-t border-l border-[#8C7A60]/40 pointer-events-none z-10" />
            <div className="absolute top-6 right-6 w-3 h-3 border-t border-r border-[#8C7A60]/40 pointer-events-none z-10" />
            <div className="absolute bottom-6 left-6 w-3 h-3 border-b border-l border-[#8C7A60]/40 pointer-events-none z-10" />
            <div className="absolute bottom-6 right-6 w-3 h-3 border-b border-r border-[#8C7A60]/40 pointer-events-none z-10" />

            <div className="relative z-10 flex flex-col flex-1 select-text">
              <div className="flex items-center justify-between pb-2 border-b border-[#1A120A] mb-3">
                <span className="font-serif font-bold text-xs uppercase tracking-wider text-[#1A120A]">
                  Student: {formState.studentName || "Alexander, Shanderious Jr."}
                </span>
                <span className="font-mono text-xs text-[#6B7280]">
                  Official Complaint · Form 01
                </span>
              </div>

              {/* Section 5: Statement of Problem and Facts */}
              <div className="flex-1 flex flex-col">
                <div className="p-3 bg-[#F0F5FA]/50 border border-[#C5A059]/40 rounded-t-sm">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Scale className="w-4 h-4 text-[#C5A059]" />
                    <span className="font-serif font-bold text-xs text-[#0A264D]">
                      Statement of the Problem and Facts Supporting the Allegation
                    </span>
                  </div>
                  <p className="text-[11px] font-sans text-[#4A5D73] leading-relaxed">
                    Please provide a statement of the problem and the facts upon which the problem is based. Include the date and time when the violation occurred or the duration of the violation and supporting documentation:
                  </p>
                </div>

                <div className="flex-1 py-2 flex flex-col">
                  <textarea
                    value={formState.statementOfViolations || ""}
                    onChange={(e) => updateField("statementOfViolations", e.target.value)}
                    placeholder="Provide detailed statutory statement of violations, operative IEP dates, service withholding, and factual basis..."
                    rows={22}
                    className="w-full flex-1 min-h-[560px] bg-[#FAFDFE] text-[#1A120A] border border-[#A6BBD3] focus:border-[#C5A059] rounded-b-sm p-4 text-xs font-serif leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                  />
                </div>

                <div className="p-2 rounded bg-[#FFF9EB] border border-[#DFBE77]/60 text-[11px] text-[#6B5328] flex items-center gap-2 mt-2">
                  <Info className="w-4 h-4 text-[#C5A059] shrink-0" />
                  <span>
                    Note: Additional itemized legal counts and factual timelines may be expanded in Section 02 (Clarity Control Restatement) and Section 03 (Chronological Summary).
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#8C7A60]/30 flex items-center justify-between text-[11px] font-serif text-[#6E5D43] shrink-0 mt-3">
              <span className="tracking-wide">{stateConfig.agencyName} · Special Education Formal Complaint</span>
              <span className="font-mono">Page 2 of 4</span>
            </div>
          </div>


          {/* ════════════ SHEET 3 OF 4: PROPOSED RESOLUTION & MEDIATION ════════════ */}
          <div style={sheetStyle} className={sheetClass}>
            <div className="absolute top-6 left-6 w-3 h-3 border-t border-l border-[#8C7A60]/40 pointer-events-none z-10" />
            <div className="absolute top-6 right-6 w-3 h-3 border-t border-r border-[#8C7A60]/40 pointer-events-none z-10" />
            <div className="absolute bottom-6 left-6 w-3 h-3 border-b border-l border-[#8C7A60]/40 pointer-events-none z-10" />
            <div className="absolute bottom-6 right-6 w-3 h-3 border-b border-r border-[#8C7A60]/40 pointer-events-none z-10" />

            <div className="relative z-10 flex flex-col flex-1 select-text">
              <div className="flex items-center justify-between pb-2 border-b border-[#1A120A] mb-3">
                <span className="font-serif font-bold text-xs uppercase tracking-wider text-[#1A120A]">
                  Student: {formState.studentName || "Alexander, Shanderious Jr."}
                </span>
                <span className="font-mono text-xs text-[#6B7280]">
                  Official Complaint · Form 01
                </span>
              </div>

              {/* Proposed Resolution */}
              <div className="mb-4">
                <div className="p-3 bg-[#F0F5FA]/50 border border-[#C5A059]/40 rounded-t-sm">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-serif font-bold text-xs text-[#0A264D]">
                      Proposed Resolution of the Problem
                    </span>
                  </div>
                  <p className="text-[11px] font-sans text-[#4A5D73] leading-relaxed">
                    Please provide a proposed resolution of the problem to the extent known and available to the party at the time the complaint is filed:
                  </p>
                </div>
                <textarea
                  value={formState.proposedResolution || ""}
                  onChange={(e) => updateField("proposedResolution", e.target.value)}
                  placeholder="Specify remedies, compensatory education hours, IEE requests, training, or corrective actions sought..."
                  rows={10}
                  className="w-full min-h-[220px] bg-[#FAFDFE] text-[#1A120A] border border-[#A6BBD3] focus:border-[#C5A059] rounded-b-sm p-4 text-xs font-serif leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
                />
              </div>

              {/* Mediation Willingness */}
              <div className="p-3.5 rounded-sm border border-[#C5A059]/60 bg-[#FAFCFE] mb-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Scale className="w-4 h-4 text-[#0A264D]" />
                  <span className="font-serif font-bold text-xs text-[#0A264D]">
                    Mediation Process
                  </span>
                </div>
                <p className="text-[11px] font-sans text-[#4A5D73] leading-relaxed mb-3">
                  Are you willing to participate in the mediation process to try to resolve your concerns? (Participation in mediation is voluntary)
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: "yes", label: "YES — Willing to Mediate" },
                    { id: "no", label: "NO — Do not wish to Mediate" },
                    { id: "na", label: "Not Applicable" },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      onClick={() => updateField("mediationWillingness", opt.id)}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded border cursor-pointer transition-all text-xs font-medium select-none",
                        formState.mediationWillingness === opt.id
                          ? "bg-[#0A264D] text-[#FFF4D4] border-[#0A264D] shadow-xs"
                          : "bg-white hover:bg-slate-50 text-[#1A120A] border-[#D1D5DB]"
                      )}
                    >
                      <input
                        type="radio"
                        name="mediationWillingness"
                        checked={formState.mediationWillingness === opt.id}
                        onChange={() => updateField("mediationWillingness", opt.id)}
                        className="sr-only"
                      />
                      <div className={cn(
                        "w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0",
                        formState.mediationWillingness === opt.id
                          ? "border-[#DFBE77] bg-[#DFBE77]"
                          : "border-slate-400 bg-white"
                      )}>
                        {formState.mediationWillingness === opt.id && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#07162B]" />
                        )}
                      </div>
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>

                <p className="text-[10px] text-[#6B7280] italic mt-2.5">
                  Mediation is a confidential, voluntary process conducted by an impartial state mediator to help parents and districts resolve disputes amicably without administrative adjudication.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#8C7A60]/30 flex items-center justify-between text-[11px] font-serif text-[#6E5D43] shrink-0 mt-3">
              <span className="tracking-wide">{stateConfig.agencyName} · Special Education Formal Complaint</span>
              <span className="font-mono">Page 3 of 4</span>
            </div>
          </div>


          {/* ════════════ SHEET 4 OF 4: VERIFICATION OF SERVICE & SIGNATURE ════════════ */}
          <div style={sheetStyle} className={sheetClass}>
            <div className="absolute top-6 left-6 w-3 h-3 border-t border-l border-[#8C7A60]/40 pointer-events-none z-10" />
            <div className="absolute top-6 right-6 w-3 h-3 border-t border-r border-[#8C7A60]/40 pointer-events-none z-10" />
            <div className="absolute bottom-6 left-6 w-3 h-3 border-b border-l border-[#8C7A60]/40 pointer-events-none z-10" />
            <div className="absolute bottom-6 right-6 w-3 h-3 border-b border-r border-[#8C7A60]/40 pointer-events-none z-10" />

            <div className="relative z-10 flex flex-col flex-1 select-text">
              <div className="flex items-center justify-between pb-2 border-b border-[#1A120A] mb-3">
                <span className="font-serif font-bold text-xs uppercase tracking-wider text-[#1A120A]">
                  Verification & Submission Instructions
                </span>
                <span className="font-mono text-xs text-[#6B7280]">
                  Official Complaint · Form 01
                </span>
              </div>

              {/* Requirement to send copy to public agency */}
              <div className="p-3.5 rounded-sm border border-[#C5A059]/60 bg-[#FAFCFE] mb-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <FileCheck className="w-4 h-4 text-[#0A264D]" />
                  <span className="font-serif font-bold text-xs text-[#0A264D]">
                    Verification of Service to Local Educational Agency
                  </span>
                </div>
                <p className="text-[11px] font-sans text-[#4A5D73] leading-relaxed mb-3">
                  The party filing the complaint must forward a copy of the complaint to the public agency serving the child at the same time the complaint is filed with the Georgia Department of Education (34 C.F.R. § 300.153(b)).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white p-3 rounded border border-[#D5DFE8]">
                  <div>
                    <label className={fieldLabelClass}>Date Served to Agency</label>
                    <input
                      type="text"
                      value={formState.serviceDate || ""}
                      onChange={(e) => updateField("serviceDate", e.target.value)}
                      placeholder="MM/DD/YYYY"
                      className={fieldInputClass}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass}>Name or Title of Recipient</label>
                    <input
                      type="text"
                      value={formState.serviceRecipient || ""}
                      onChange={(e) => updateField("serviceRecipient", e.target.value)}
                      placeholder="e.g. Special Education Director"
                      className={fieldInputClass}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass}>Service Method</label>
                    <input
                      type="text"
                      value={formState.serviceMethod || ""}
                      onChange={(e) => updateField("serviceMethod", e.target.value)}
                      placeholder="e.g. Certified Mail / Electronic"
                      className={fieldInputClass}
                    />
                  </div>
                </div>
              </div>

              {/* Signature Line */}
              <div className="p-3.5 rounded-sm border border-[#D5DFE8] bg-white mb-4">
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-[#E2E8F0]">
                  <Pencil className="w-4 h-4 text-[#0A264D]" />
                  <span className="font-serif font-bold text-xs text-[#0A264D]">
                    Complainant Signature & Attestation
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className={fieldLabelClass}>Signature of Person Filing Complaint</label>
                    <input
                      type="text"
                      value={formState.signatureName || formState.complainantName || ""}
                      onChange={(e) => updateField("signatureName", e.target.value)}
                      placeholder="Full Name (Attestation Signature)"
                      className={cn(fieldInputClass, "font-serif italic font-bold text-sm text-[#0A264D]")}
                    />
                  </div>
                  <div>
                    <label className={fieldLabelClass}>Date of Signature</label>
                    <input
                      type="text"
                      value={formState.signatureDate || ""}
                      onChange={(e) => updateField("signatureDate", e.target.value)}
                      placeholder="MM/DD/YYYY"
                      className={fieldInputClass}
                    />
                  </div>
                </div>
              </div>

              {/* Filing Information */}
              <div className="p-3 rounded-sm border border-[#A6BBD3] bg-[#F0F5FA] text-xs space-y-1.5 font-sans">
                <span className="font-bold text-[#0A264D] block uppercase tracking-wider text-[11px]">
                  Submit Completed Formal Complaint Packet To:
                </span>
                <div className="text-[11px] text-[#2C3E50] leading-relaxed">
                  <strong>{stateConfig.agencyName}</strong><br />
                  {stateConfig.agencyDivision}<br />
                  {stateConfig.agencyAddress.join(", ")}<br />
                  Phone: {stateConfig.agencyPhone} · Email: <a href={`mailto:${stateConfig.agencyEmail}`} className="underline text-blue-800">{stateConfig.agencyEmail}</a> · Fax: {stateConfig.agencyFax || "770-344-4458"}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#8C7A60]/30 flex items-center justify-between text-[11px] font-serif text-[#6E5D43] shrink-0 mt-3">
              <span className="tracking-wide">{stateConfig.agencyName} · Special Education Formal Complaint</span>
              <span className="font-mono">Page 4 of 4</span>
            </div>
          </div>

        </div>
      ) : (
        /* ── MODE 2: PDF FACSIMILE PREVIEW ────────────────────────────────── */
        /* Pre-rendered high-res raster pages from pdf-lib. Clean vertical flow, zero iframes. */
        <div className="flex flex-col items-center gap-6 w-full">
          {activePages.map((page, idx) => (
            <div
              key={page.pageNumber || idx}
              style={sheetStyle}
              className={sheetClass}
            >
              <div className="absolute top-6 left-6 w-3 h-3 border-t border-l border-[#8C7A60]/40 pointer-events-none z-10" />
              <div className="absolute top-6 right-6 w-3 h-3 border-t border-r border-[#8C7A60]/40 pointer-events-none z-10" />
              <div className="absolute bottom-6 left-6 w-3 h-3 border-b border-l border-[#8C7A60]/40 pointer-events-none z-10" />
              <div className="absolute bottom-6 right-6 w-3 h-3 border-b border-r border-[#8C7A60]/40 pointer-events-none z-10" />

              <div className="absolute top-3 right-4 z-10 font-mono text-[10px] text-[#8C7A60] bg-[#FBF6EA]/95 px-2.5 py-0.5 rounded-full border border-[#BCA062]/60 shadow-xs pointer-events-none font-bold">
                Official PDF Facsimile · Page {page.pageNumber} of {activePages.length}
              </div>

              <img
                src={page.dataUrl}
                alt={`Official State Form Page ${page.pageNumber}`}
                className="w-full h-auto object-contain block select-none pointer-events-none"
              />
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

