import React, { useState, useEffect, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import {
  type OfficialComplaintFormState,
  SUPPORTED_STATE_FORMS,
} from "./stateFormsData";
import { convertPdfToPageImages, type ImportedPdfPage } from "@/lib/pdfImporter";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

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
  const [internalPages, setInternalPages] = useState<ImportedPdfPage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Self-render fallback if renderedPages not provided by parent
  useEffect(() => {
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
  }, [
    propRenderedPages,
    formState.studentName,
    formState.studentDob,
    formState.publicAgency,
    formState.complainantName,
    formState.statementOfViolations,
    formState.proposedResolution,
  ]);

  const activePages = (propRenderedPages && propRenderedPages.length > 0) ? propRenderedPages : internalPages;
  const isLoading = (isRendering || isGenerating) && activePages.length === 0;

  return (
    <div className="w-full flex flex-col items-center select-none pb-6">
      {isLoading ? (
        /* Loading skeleton sheet */
        <div
          style={{
            width: viewMode === "actual" ? "816px" : "100%",
            maxWidth: "816px",
            minHeight: "1056px",
            aspectRatio: "8.5 / 11",
          }}
          className="relative rounded-xs flex flex-col items-center justify-center bg-[#FBF6EA] border border-[#C5A059]/60 shadow-[0_16px_50px_rgba(0,0,0,0.85),0_2px_8px_rgba(0,0,0,0.5)] my-2"
        >
          <div className="p-4 rounded-full bg-[#05142B]/10 border border-[#C5A059]/30 mb-3">
            <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
          </div>
          <span className="font-serif text-[#1A120A] font-bold text-base">
            Loading Official State Complaint Form...
          </span>
          <span className="text-[#8C7A60] text-xs font-mono mt-1">
            Rendering 4 official pages for {SUPPORTED_STATE_FORMS[formState.stateCode]?.name || "Georgia"}
          </span>
        </div>
      ) : activePages.length > 0 ? (
        /* ── All 4 Pages Stacked Vertically — Zero Iframes, Zero Inner Scrollbars ── */
        /* The single blue canvas scrollbar on the right is the ONLY scrollbar used to scroll all pages */
        <div className="flex flex-col items-center gap-6 w-full">
          {activePages.map((page, idx) => (
            <div
              key={page.pageNumber || idx}
              style={{
                width: viewMode === "actual" ? "816px" : "100%",
                maxWidth: "816px",
                minHeight: "1056px",
                aspectRatio: "8.5 / 11",
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
              }}
              className={cn(
                "relative rounded-xs select-text flex flex-col items-center transition-all bg-white text-[#1A120A] border border-[#C5A059]/60 shadow-[0_16px_50px_rgba(0,0,0,0.85),0_2px_8px_rgba(0,0,0,0.5)] my-2 shrink-0 overflow-hidden",
                viewMode === "fit-width" && "w-full max-w-[840px]",
                viewMode === "fit-page" && "w-[calc((100vh-175px)*(8.5/11))] max-w-full my-auto",
                viewMode === "actual" && "w-[816px] my-2"
              )}
            >
              {/* Printable Corner Margin Registration Tick Marks */}
              <div className="absolute top-6 left-6 w-3 h-3 border-t border-l border-[#8C7A60]/40 pointer-events-none z-10" />
              <div className="absolute top-6 right-6 w-3 h-3 border-t border-r border-[#8C7A60]/40 pointer-events-none z-10" />
              <div className="absolute bottom-6 left-6 w-3 h-3 border-b border-l border-[#8C7A60]/40 pointer-events-none z-10" />
              <div className="absolute bottom-6 right-6 w-3 h-3 border-b border-r border-[#8C7A60]/40 pointer-events-none z-10" />

              {/* Top floating pill page number badge */}
              <div className="absolute top-3 right-4 z-10 font-mono text-[10px] text-[#8C7A60] bg-[#FBF6EA]/95 px-2.5 py-0.5 rounded-full border border-[#BCA062]/60 shadow-xs pointer-events-none font-bold">
                Official State Form · Page {page.pageNumber} of {activePages.length}
              </div>

              <img
                src={page.dataUrl}
                alt={`Official State Form Page ${page.pageNumber}`}
                className="w-full h-auto object-contain block select-none pointer-events-none"
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
