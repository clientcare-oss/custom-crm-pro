import React from "react";
import { cn } from "@/lib/utils";

export interface BinderCoverDetails {
  subtitle?: string;
  summary?: string;
  evidentiaryPurpose?: string;
  supportingCounts?: string;
  statutoryBasis?: string;
  documentType?: string;
}

interface BinderCoverPageProps {
  pageId: string;
  title: string;
  category: string;
  sectionNumber: string;
  coverPageNumber: number;
  totalDocketPages: number;
  studentName: string;
  studentDob?: string;
  grade?: string;
  school?: string;
  district?: string;
  preparedBy?: string;
  submissionDate?: string;
  agencyName?: string;
  coverDetails?: BinderCoverDetails;
  paperTheme?: "parchment" | "white";
  className?: string;
  style?: React.CSSProperties;
  viewMode?: "fit-width" | "fit-page" | "actual";
  zoomLevel?: number;
  onUpdateSummary?: (text: string) => void;
}

export function BinderCoverPage({
  pageId,
  title,
  category,
  sectionNumber,
  coverPageNumber,
  totalDocketPages,
  studentName = "JORDAN SMITH",
  studentDob,
  grade,
  school = "Clarkdale Elementary School",
  district = "Cobb County School District",
  preparedBy,
  submissionDate,
  agencyName = "Georgia Department of Education",
  coverDetails,
  paperTheme = "parchment",
  className,
  style,
  viewMode = "fit-width",
  zoomLevel = 100,
  onUpdateSummary,
}: BinderCoverPageProps) {
  const isExhibit = category === "exhibit" || pageId.startsWith("exhibit");
  const isRestatement = pageId === "clarity_control" || category === "restatement";
  const isFacts = pageId === "chronological_summary" || category === "facts";
  const isIndex = pageId === "exhibit_index";

  const isWhitePaper = paperTheme === "white";

  const sheetStyle: React.CSSProperties = {
    width: viewMode === "actual" ? "816px" : "100%",
    maxWidth: "816px",
    minHeight: "1056px",
    aspectRatio: "8.5 / 11",
    backgroundColor: isWhitePaper ? "#FFFFFF" : "#FBF6EA",
    backgroundImage: isWhitePaper ? "none" : "url('/decor/fine-parchment.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    boxShadow: isWhitePaper 
      ? "0 14px 40px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08)" 
      : "0 16px 50px rgba(0,0,0,0.85), 0 2px 8px rgba(0,0,0,0.5)",
    border: isWhitePaper ? "1px solid #D1D5DB" : "1px solid rgba(197, 160, 89, 0.6)",
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
    ...style,
  };

  // Extract clean section or exhibit code (e.g. "EXHIBIT 05", "EXHIBIT A", "SECTION 02")
  const rawNum = sectionNumber.replace(/[^0-9]/g, "");
  const numPad = rawNum ? (rawNum.length === 1 ? `0${rawNum}` : rawNum) : (coverPageNumber < 10 ? `0${coverPageNumber}` : `${coverPageNumber}`);
  const exhibitOrSectionLabel = isExhibit
    ? `EXHIBIT ${numPad}`
    : `SECTION ${numPad}`;

  // Clean title for display
  let cleanTitle = title;
  if (isExhibit && title.includes("(") && title.includes(")")) {
    const inside = title.substring(title.indexOf("(") + 1, title.lastIndexOf(")")).trim();
    if (inside.toLowerCase().includes("iep")) {
      cleanTitle = "Operative Individualized Education Program (IEP)";
    } else if (inside.toLowerCase().includes("evaluation")) {
      cleanTitle = "Parent Request for Comprehensive Evaluation";
    } else if (inside.toLowerCase().includes("communication")) {
      cleanTitle = "Written Communications & Service Notice Records";
    } else {
      cleanTitle = inside;
    }
  }

  // Tailored, authoritative purpose text matching user's legal specification
  const purposeText = coverDetails?.evidentiaryPurpose || coverDetails?.summary || (() => {
    if (cleanTitle.toLowerCase().includes("evaluation") || cleanTitle.toLowerCase().includes("request")) {
      return "To document the parent's written request for a comprehensive evaluation and establish the date the District received notice of the request.";
    }
    if (cleanTitle.toLowerCase().includes("iep")) {
      return "To document the operative Individualized Education Program (IEP) in effect, establishing mandated specialized instruction hours, accommodations, and service delivery commitments.";
    }
    if (cleanTitle.toLowerCase().includes("communication") || cleanTitle.toLowerCase().includes("email")) {
      return "To document written communications and formal correspondence between parent, advocate, and District personnel establishing notice and timeline compliance.";
    }
    if (isRestatement) {
      return "To provide an itemized clarity control restatement of statutory violations pursuant to 34 C.F.R. § 300.153 and state administrative rules, establishing Counts I, II, and III with jurisdictional facts.";
    }
    if (isFacts) {
      return "To establish a chronological factual narrative of all relevant events, requests, and statutory milestones occurring within the applicable one-year statutory period.";
    }
    if (isIndex) {
      return "To provide a comprehensive master evidentiary schedule indexing all attached documentary records, operative service logs, and evaluation reports.";
    }
    if (isExhibit) {
      return "To document authenticated documentary evidence in support of Complainant's statement of statutory violations and factual allegations.";
    }
    return "To document official administrative filing records and factual allegations submitted on behalf of the student pursuant to IDEA dispute resolution procedures.";
  })();

  // Document Type / Sub-category in footer
  const documentType = coverDetails?.documentType || (() => {
    if (cleanTitle.toLowerCase().includes("evaluation") || cleanTitle.toLowerCase().includes("request")) {
      return "EMAIL CORRESPONDENCE";
    }
    if (cleanTitle.toLowerCase().includes("iep")) {
      return "OPERATIVE IEP RECORD";
    }
    if (cleanTitle.toLowerCase().includes("communication")) {
      return "WRITTEN CORRESPONDENCE";
    }
    if (isRestatement) return "STATUTORY RESTATEMENT";
    if (isFacts) return "FACTUAL CHRONOLOGY";
    if (isIndex) return "EVIDENTIARY INDEX";
    if (isExhibit) return "DOCUMENTARY EVIDENCE";
    return "FILING RECORD";
  })();

  // Formatted date (e.g., "MARCH 14, 2026")
  const formattedDate = submissionDate 
    ? submissionDate.toUpperCase()
    : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }).toUpperCase();

  return (
    <div
      style={sheetStyle}
      className={cn(
        "relative rounded-xs select-text flex flex-col justify-between transition-all shrink-0 my-2 binder-cover-page-sheet",
        "px-10 sm:px-14 md:px-16 pt-12 pb-10",
        className
      )}
    >
      {/* ── TOP TWO-COLUMN LEGAL HEADER CAPTION ──────────────────────── */}
      <div className="w-full shrink-0">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-center">
          
          {/* Left Column: Student / Complainant */}
          <div className="text-left font-serif leading-snug">
            <h3 className="font-bold text-sm sm:text-base text-[#1A120A] uppercase tracking-wide">
              {studentName ? studentName.replace(/^IN\s+RE:\s*/i, "").toUpperCase() : "JORDAN SMITH"}
            </h3>
            <p className="text-xs sm:text-[13px] text-[#1A120A] italic mt-0.5">
              Student with a Disability, Eligible under IDEA
            </p>
            <p className="text-xs sm:text-[13px] text-[#1A120A] mt-0.5">
              By and Through Parent / Authorized Advocate
            </p>
          </div>

          {/* Center Vertical Divider Line */}
          <div className="w-[1px] h-14 bg-[#1A120A]/70 self-stretch my-auto" />

          {/* Right Column: Local Educational Agency */}
          <div className="text-right font-serif leading-snug">
            <h3 className="font-bold text-sm sm:text-base text-[#1A120A] uppercase tracking-wide">
              {district ? district.toUpperCase() : "COBB COUNTY SCHOOL DISTRICT"}
            </h3>
            <p className="text-xs sm:text-[13px] text-[#1A120A] italic mt-0.5">
              Local Educational Agency (LEA)
            </p>
            <p className="text-xs sm:text-[13px] text-[#1A120A] mt-0.5">
              Assigned: {school || "Clarkdale Elementary School"}
            </p>
          </div>
        </div>

        {/* Clean Horizontal Divider Line */}
        <div className="w-full h-[1px] bg-[#1A120A] mt-6" />
      </div>

      {/* ── CENTER BLOCK: SECTION/EXHIBIT BADGE, TITLE & PURPOSE BOX ── */}
      <div className="my-auto py-6 sm:py-8 flex flex-col items-center text-center w-full max-w-[680px] mx-auto">
        
        {/* Section / Exhibit Label (e.g. EXHIBIT 05) */}
        <div className="font-serif uppercase font-bold text-sm sm:text-base tracking-[0.25em] text-[#9E7A38]">
          {exhibitOrSectionLabel}
        </div>

        {/* Small Accent Underline */}
        <div className="w-14 h-[1px] bg-[#9E7A38] my-2.5" />

        {/* Level / Subtitle */}
        <div className="font-serif uppercase text-[11px] sm:text-xs tracking-[0.22em] text-[#1A120A] font-semibold mb-6 sm:mb-8">
          STATE ADMINISTRATIVE COMPLAINT
        </div>

        {/* Main Title (Prominent, large, elegant serif) */}
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-[42px] font-bold text-[#1A120A] tracking-tight leading-[1.18] mb-8 sm:mb-10 max-w-[620px]">
          {cleanTitle}
        </h1>

        {/* Purpose Box (Clean rectangular bordered box, add nothing extra) */}
        <div className="w-full border border-[#1A120A] p-5 sm:p-6 text-left bg-transparent">
          <span className="font-serif uppercase font-bold text-[11px] sm:text-xs tracking-[0.25em] text-[#8C6D2B] block mb-2">
            PURPOSE
          </span>
          <p className="font-serif text-xs sm:text-[14px] leading-relaxed text-[#1A120A]">
            {purposeText}
          </p>
        </div>
      </div>

      {/* ── BOTTOM FOOTER ────────────────────────────────────────────── */}
      <div className="w-full shrink-0 pt-3 border-t border-[#8C7A60]/30 flex items-center justify-between text-[11px] font-serif text-[#6E5D43]">
        <span className="tracking-wide">{agencyName || "Georgia Department of Education"} IDEA Complaint</span>
        <span className="font-serif">Page {coverPageNumber} of {totalDocketPages}</span>
      </div>
    </div>
  );
}
