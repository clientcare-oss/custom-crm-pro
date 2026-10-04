import React, { useState, useEffect, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import {
  type OfficialComplaintFormState,
  SUPPORTED_STATE_FORMS,
} from "./stateFormsData";
import { cn } from "@/lib/utils";

interface StateComplaintFormViewProps {
  formState: OfficialComplaintFormState;
  onChange: (updater: (prev: OfficialComplaintFormState) => OfficialComplaintFormState) => void;
  onSelectState?: (stateCode: string) => void;
  readOnly?: boolean;
  viewMode?: "fit-width" | "fit-page" | "actual";
  zoomLevel?: number;
}

const GADOE_PDF_URL = "/forms/gadoe-formal-complaint-form.pdf";

export function StateComplaintFormView({
  formState,
  onChange,
  onSelectState,
  readOnly = false,
  viewMode = "fit-width",
  zoomLevel = 100,
}: StateComplaintFormViewProps) {
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string>(GADOE_PDF_URL);
  const [hasAutoFilled, setHasAutoFilled] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Function to fill the exact official Georgia GaDOE PDF with student & case data
  const generateFilledPdf = async () => {
    try {
      const response = await fetch(GADOE_PDF_URL);
      if (!response.ok) {
        throw new Error(`Failed to load official state form (${response.status})`);
      }
      const existingPdfBytes = await response.arrayBuffer();

      // Load with pdf-lib to populate official AcroForm fields
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();

      const setIfField = (name: string, value: string | undefined | null) => {
        if (!value) return;
        try {
          const field = form.getTextField(name);
          if (field) field.setText(String(value));
        } catch (e) {
          // ignore if field not present
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

      // Save modified PDF bytes
      const pdfBytes = await pdfDoc.save();

      // Create new blob URL for the fillable PDF
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const newUrl = URL.createObjectURL(blob);
      setPdfBlobUrl(newUrl);
      setHasAutoFilled(true);
    } catch (err: any) {
      console.error("Error populating official PDF:", err);
    }
  };

  // Initial load auto-population with student data
  useEffect(() => {
    if (formState.studentName && !hasAutoFilled) {
      generateFilledPdf();
    }
  }, [formState.studentName]);

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* ── Exact Official Fillable PDF Document Sheet ──────────────────────── */}
      {/* Formatted to the exact 8.5 x 11 Letter layout of the other document pages */}
      {/* Sized so all 4 pages fit vertically, completely eliminating any inner scrollbar! */}
      {/* The single blue canvas scrollbar on screen is the ONLY scrollbar used to progress. */}
      <div
        style={{
          transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
          transformOrigin: "top center",
        }}
        className={cn(
          "relative rounded-xs select-text flex flex-col items-center transition-all bg-white text-[#1A120A] border border-[#C5A059]/60 shadow-[0_16px_50px_rgba(0,0,0,0.85),0_2px_8px_rgba(0,0,0,0.5)] my-2 shrink-0 overflow-hidden",
          viewMode === "fit-width" && "w-full max-w-[840px] h-[4400px]",
          viewMode === "fit-page" && "h-[calc(100vh-175px)] w-[calc((100vh-175px)*(8.5/11))] max-w-full my-auto",
          viewMode === "actual" && "w-[816px] h-[4260px] my-2"
        )}
      >
        {/* Printable Corner Margin Registration Tick Marks matching other pages */}
        <div className="absolute top-6 left-6 w-3 h-3 border-t border-l border-[#8C7A60]/40 pointer-events-none z-10" />
        <div className="absolute top-6 right-6 w-3 h-3 border-t border-r border-[#8C7A60]/40 pointer-events-none z-10" />
        <div className="absolute bottom-6 left-6 w-3 h-3 border-b border-l border-[#8C7A60]/40 pointer-events-none z-10" />
        <div className="absolute bottom-6 right-6 w-3 h-3 border-b border-r border-[#8C7A60]/40 pointer-events-none z-10" />

        <iframe
          ref={iframeRef}
          src={`${pdfBlobUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
          className="w-full h-full border-0 bg-white"
          title="Georgia Department of Education (GaDOE) Special Education Formal Complaint Form"
        />
      </div>
    </div>
  );
}
