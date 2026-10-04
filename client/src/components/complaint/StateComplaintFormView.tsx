import React, { useState, useEffect, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import {
  type OfficialComplaintFormState,
  SUPPORTED_STATE_FORMS,
} from "./stateFormsData";
import { cn } from "@/lib/utils";
import { type ImportedPdfPage } from "@/lib/pdfImporter";

interface StateComplaintFormViewProps {
  formState: OfficialComplaintFormState;
  onChange: (updater: (prev: OfficialComplaintFormState) => OfficialComplaintFormState) => void;
  onSelectState?: (stateCode: string) => void;
  readOnly?: boolean;
  viewMode?: "fit-width" | "fit-page" | "actual";
  zoomLevel?: number;
  renderedPages?: ImportedPdfPage[];
  isRendering?: boolean;
  totalPages?: number;
}

const GADOE_PDF_URL = "/forms/gadoe-formal-complaint-form.pdf";

export function StateComplaintFormView({
  formState,
  onChange,
  onSelectState,
  readOnly = false,
  viewMode = "fit-width",
  zoomLevel = 100,
  totalPages = 10,
}: StateComplaintFormViewProps) {
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string>(GADOE_PDF_URL);
  const [isGenerating, setIsGenerating] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Measure dynamic height for all 4 pages of the official US Letter PDF
  const [measuredHeight, setMeasuredHeight] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const estimatedWidth = Math.min(840, Math.max(500, window.innerWidth - 280));
      return Math.ceil(estimatedWidth * (792 / 612) * 4) + 60;
    }
    return 4200;
  });

  // Function to populate the authentic official Georgia GaDOE PDF with student & case data
  // Keeps all AcroForm form fields interactive so the PDF remains 100% editable directly in the browser
  const generateFilledPdf = async () => {
    try {
      setIsGenerating(true);
      const response = await fetch(GADOE_PDF_URL);
      if (!response.ok) {
        throw new Error(`Failed to load official state form (${response.status})`);
      }
      const existingPdfBytes = await response.arrayBuffer();

      // Load with pdf-lib and populate official AcroForm fields WITHOUT flattening
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();

      const setIfField = (name: string, value: string | undefined | null) => {
        if (!value) return;
        try {
          const field = form.getTextField(name);
          if (field) field.setText(String(value));
        } catch (e) {
          // ignore if field name mismatch
        }
      };

      // Page 1: Public Agency
      setIfField("Public agency filing complaint against", formState.publicAgency);

      // Page 1: Complainant
      setIfField("Name of Complainant", formState.complainantName);
      setIfField("Relationship to student", formState.complainantRelationship);
      setIfField("Complainant Address", formState.complainantAddress);
      setIfField("City", formState.complainantCity);
      setIfField("State", formState.complainantState || "GA");
      setIfField("Zip Code", formState.complainantZip);
      setIfField("Complainant Phone Numbers", formState.complainantPhone);
      setIfField("Complainant Email Address", formState.complainantEmail);

      // Page 1: Student
      setIfField("Name of Student", formState.studentName);
      setIfField("Date of Birth", formState.studentDob);
      setIfField("Student Address", formState.studentAddress);
      setIfField("City_2", formState.studentCity);
      setIfField("State_2", formState.studentState || "GA");
      setIfField("Zip Code_2", formState.studentZip);
      setIfField("GTID", formState.studentGtid);
      setIfField("Current School", formState.currentSchool);

      // Page 1: Parent
      setIfField("Parent if not the complainant", formState.parentName);
      setIfField("Parent Address", formState.parentAddress);
      setIfField("City_3", formState.parentCity);
      setIfField("State_3", formState.parentState || "GA");
      setIfField("Zip Code_3", formState.parentZip);
      setIfField("Parent Phone Numbers", formState.parentPhone);
      setIfField("Parent Email Address", formState.parentEmail);

      // Page 1: Problem / Allegation Statement
      setIfField(
        "Please provide a statement of the problem and the facts upon which the problem is based Include the date and time when the violation occurred or the duration of the violation and supporting documentation",
        formState.statementOfViolations || formState.factsRelatingToViolations
      );

      // Page 2: Proposed Resolution
      setIfField(
        "Please provide a proposed resolution of the problem to the extent known and available to the party at the time the complaint is filed",
        formState.proposedResolution
      );

      // Page 2: Mediation Willingness Radio
      try {
        const radio = form.getRadioGroup("Are you willing to participate in the mediation process to try to resolve your concerns");
        if (radio) {
          if (formState.mediationWillingness === "yes") {
            radio.select("YES");
          } else if (formState.mediationWillingness === "no") {
            radio.select("NO");
          } else if (formState.mediationWillingness === "na") {
            radio.select("Not Applicable");
          }
        }
      } catch (e) {}

      // Page 3: Service copy to LEA
      setIfField("On", formState.serviceDate);
      setIfField("name or title of recipient", formState.serviceRecipient);
      setIfField("via", formState.serviceMethod);

      // Save modified PDF bytes without flattening — keeps fields fully editable
      const pdfBytes = await pdfDoc.save();

      // Create new blob URL for the editable PDF
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const newUrl = URL.createObjectURL(blob);
      setPdfBlobUrl(newUrl);
    } catch (err: any) {
      console.error("Error populating official PDF:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Initial load auto-population with student data
  useEffect(() => {
    generateFilledPdf();
  }, [
    formState.studentName,
    formState.studentDob,
    formState.publicAgency,
    formState.currentSchool,
    formState.complainantName,
    formState.statementOfViolations,
    formState.proposedResolution,
  ]);

  // Dynamically calculate exact PDF height based on rendered container width
  // Eliminates dead grey space below the 4-page PDF form while preventing inner scrollbars
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const calculateExactHeight = () => {
      const width = el.clientWidth;
      if (width > 0) {
        // Standard US Letter aspect ratio = 792 / 612 (1.294117647)
        // 4 pages + PDF viewer page separators (~12px each) + boundary margins (~20px) = ~56px
        const pageHeight = width * (792 / 612);
        const exactHeight = Math.ceil(pageHeight * 4) + 60;
        setMeasuredHeight(exactHeight);
      }
    };

    calculateExactHeight();
    const ro = new ResizeObserver(calculateExactHeight);
    ro.observe(el);
    window.addEventListener("resize", calculateExactHeight);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", calculateExactHeight);
    };
  }, [viewMode]);

  const stateConfig = SUPPORTED_STATE_FORMS[formState.stateCode] || SUPPORTED_STATE_FORMS.GA;

  return (
    <div className="w-full flex flex-col items-center select-none pb-6">

      {/* ── Exact Official Fillable PDF Document Sheet ──────────────────────── */}
      {/* Dynamically sized so all 4 pages terminate cleanly with zero trailing void */}
      {/* AcroForm interactive fields remain directly editable right inside the PDF */}
      <div
        ref={containerRef}
        style={{
          width: viewMode === "actual" ? "816px" : "100%",
          maxWidth: "840px",
          height: viewMode === "fit-page" 
            ? "calc(100vh - 180px)" 
            : measuredHeight ? `${measuredHeight}px` : "4200px",
          transform: viewMode === "fit-page"
            ? "scale(0.85)"
            : zoomLevel !== 100
              ? `scale(${zoomLevel / 100})`
              : undefined,
          transformOrigin: "top center",
        }}
        className={cn(
          "relative rounded-xs select-text flex flex-col items-center transition-all bg-white text-[#1A120A] border border-[#C5A059]/60 shadow-[0_16px_50px_rgba(0,0,0,0.85),0_2px_8px_rgba(0,0,0,0.5)] my-2 shrink-0 overflow-hidden",
          viewMode === "fit-width" && "w-full max-w-[840px]",
          viewMode === "fit-page" && "w-[calc((100vh-175px)*(8.5/11))] max-w-full my-auto",
          viewMode === "actual" && "w-[816px] my-2"
        )}
      >
        {/* Printable Corner Margin Registration Tick Marks matching other pages */}
        <div className="absolute top-6 left-6 w-3 h-3 border-t border-l border-[#8C7A60]/40 pointer-events-none z-10" />
        <div className="absolute top-6 right-6 w-3 h-3 border-t border-r border-[#8C7A60]/40 pointer-events-none z-10" />
        <div className="absolute bottom-6 left-6 w-3 h-3 border-b border-l border-[#8C7A60]/40 pointer-events-none z-10" />
        <div className="absolute bottom-6 right-6 w-3 h-3 border-b border-r border-[#8C7A60]/40 pointer-events-none z-10" />

        {/* Live Fillable Official GaDOE Form Iframe with Interactive Form Fields */}
        <iframe
          ref={iframeRef}
          src={`${pdfBlobUrl}#toolbar=0&navpanes=0&view=FitH`}
          className="w-full h-full border-0 bg-white"
          title="Georgia Department of Education (GaDOE) Special Education Formal Complaint Form"
        />
      </div>

      {/* Bottom Docket Page Indicator */}
      <div className="w-full max-w-[840px] px-3 py-1.5 flex items-center justify-between text-[11px] font-serif text-[#C6B697] border-t border-[#3A2C18]/60 mt-1">
        <span className="tracking-wide">{stateConfig.agencyName} · Special Education Formal Complaint</span>
        <span className="font-mono text-[#FFE394] font-bold">Pages 1–4 of {totalPages}</span>
      </div>

    </div>
  );
}
