import React from "react";
import { cn } from "@/lib/utils";
import { Scale, ShieldCheck, FileText, CheckCircle2, Bookmark, Calendar, User, Building } from "lucide-react";

export interface BinderCoverDetails {
  subtitle?: string;
  summary?: string;
  evidentiaryPurpose?: string;
  supportingCounts?: string;
  statutoryBasis?: string;
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
  studentName,
  studentDob,
  grade,
  school,
  district,
  preparedBy,
  submissionDate,
  agencyName = "Georgia Department of Education",
  coverDetails,
  viewMode = "fit-width",
  zoomLevel = 100,
  onUpdateSummary,
}: BinderCoverPageProps) {
  const isExhibit = category === "exhibit" || pageId.startsWith("exhibit");
  const isRestatement = pageId === "clarity_control" || category === "restatement";
  const isFacts = pageId === "chronological_summary" || category === "facts";
  const isIndex = pageId === "exhibit_index";

  const sheetStyle: React.CSSProperties = {
    width: viewMode === "actual" ? "816px" : "100%",
    maxWidth: "816px",
    minHeight: "1056px",
    aspectRatio: "8.5 / 11",
    backgroundImage: "url('/decor/fine-parchment.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
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

  const defaultSubtitle = coverDetails?.subtitle || (
    isRestatement ? "Clarity Control Restatement of Issues & Statutory Violations" :
    isFacts ? "Chronological Statement of Factual Events & Statutory Milestones" :
    isIndex ? "Master Evidentiary Schedule & Documentary Index" :
    isExhibit ? "Documentary Evidence In Support of Formal State Complaint" :
    "Special Education Formal Complaint Filing Section"
  );

  const defaultSummary = coverDetails?.summary || (
    isRestatement ? "Itemized restatement of statutory violations pursuant to 34 C.F.R. § 300.153 and Ga. Comp. R. & Regs. 160-4-7-.12, establishing Count I (Failure to Implement Operative IEP Services / Denial of FAPE), Count II (Failure to Timely Evaluate & Child Find Violation), and Count III (Prior Written Notice Omission)." :
    isFacts ? "Factual chronology of events occurring within the one-year statutory period (August 2025 – August 2026), including operative IEP adoption, parent evaluation request timestamps, 18 documented missed specialized reading sessions, and district admissions." :
    isIndex ? "Comprehensive evidentiary schedule indexing attached documentary records, operative IEP service sheets, psychoeducational evaluation requests, and service logs in support of Complainant's allegations." :
    isExhibit ? "Official documentary evidence attached in support of Complainant's statement of allegations, substantiating implementation withholding and procedural timeline failures." :
    "Formal advocacy filing section prepared on behalf of student pursuant to IDEA dispute resolution procedures."
  );

  return (
    <div
      style={sheetStyle}
      className={cn(
        "relative rounded-xs select-text flex flex-col justify-between transition-all",
        "bg-[#FBF6EA] text-[#1A120A] border border-[#C5A059]/60 shadow-[0_16px_50px_rgba(0,0,0,0.85),0_2px_8px_rgba(0,0,0,0.5)]",
        "px-8 sm:px-12 md:px-14 pt-8 pb-8 my-2 shrink-0"
      )}
    >
      {/* Printable Corner Margin Registration Tick Marks */}
      <div className="absolute top-6 left-6 w-3.5 h-3.5 border-t border-l border-[#8C7A60]/50 pointer-events-none z-10" />
      <div className="absolute top-6 right-6 w-3.5 h-3.5 border-t border-r border-[#8C7A60]/50 pointer-events-none z-10" />
      <div className="absolute bottom-6 left-6 w-3.5 h-3.5 border-b border-l border-[#8C7A60]/50 pointer-events-none z-10" />
      <div className="absolute bottom-6 right-6 w-3.5 h-3.5 border-b border-r border-[#8C7A60]/50 pointer-events-none z-10" />

      {/* Outer Ornate Double Border Framing */}
      <div className="absolute inset-4 sm:inset-6 border border-[#BCA16B]/40 pointer-events-none z-0" />

      <div className="relative z-10 flex flex-col h-full justify-between flex-1">
        
        {/* Top Header: Agency & Docket Notice */}
        <div className="text-center pb-3 border-b border-[#8C7A60]/40">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Scale className="w-4 h-4 text-[#8C6D2B]" />
            <span className="font-serif uppercase tracking-widest text-[11px] font-bold text-[#1A1005]">
              {agencyName.toUpperCase()}
            </span>
          </div>
          <p className="text-[10px] font-mono tracking-wider uppercase text-[#6E5D43]">
            Division for Special Education Services and Supports · IDEA State Complaint
          </p>
          <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#EFE8D6] border border-[#BCA16B]/60 text-[9.5px] font-mono font-bold text-[#5A4528]">
            <Bookmark className="w-3 h-3 text-[#8C6D2B]" />
            <span>OFFICIAL FILING BINDER COVER SHEET · {sectionNumber}</span>
          </div>
        </div>

        {/* Case Caption Box */}
        <div className="my-3 p-3.5 rounded border border-[#8C7A60]/40 bg-[#FAF5E8]/90 text-xs font-serif shadow-xs">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center text-[11px] leading-relaxed">
            <div className="space-y-0.5">
              <p className="font-bold text-[#0B1E38] uppercase">
                IN RE: {studentName}
              </p>
              <p className="text-[10px] text-[#5A4528] italic">
                Student with a Disability, Eligible under IDEA
              </p>
              <p className="text-[10px] text-[#5A4528]">
                By and Through Parent / Authorized Advocate,
              </p>
              <p className="font-bold text-[10px] text-[#1A1005] tracking-wide">
                Complainant,
              </p>
            </div>
            
            <div className="px-3 text-center text-[#8C7A60] font-mono font-bold text-sm">
              ) <br />
              ) <br />
              ) <br />
              v. <br />
              ) <br />
              ) <br />
              )
            </div>

            <div className="space-y-0.5 text-right">
              <p className="font-bold text-[#0B1E38] uppercase">
                {district || "Local School District"}
              </p>
              <p className="text-[10px] text-[#5A4528] italic">
                Local Educational Agency (LEA)
              </p>
              <p className="text-[10px] text-[#5A4528]">
                Assigned: {school || "School"}
              </p>
              <p className="font-bold text-[10px] text-[#1A1005] tracking-wide">
                Respondent Agency.
              </p>
            </div>
          </div>
        </div>

        {/* Centerpiece: Section / Exhibit Title Plate */}
        <div className="my-auto py-4 text-center">
          <div className="max-w-[620px] mx-auto p-6 rounded-sm border-2 border-[#8C6D2B] bg-[#FFFBF0] shadow-[0_4px_16px_rgba(140,109,43,0.18)] relative">
            
            {/* Top Badge Plate */}
            <div className="inline-block px-4 py-1 rounded bg-[#0A264D] text-[#FFF4D4] border border-[#DFBE77]/60 font-mono text-xs font-black tracking-widest uppercase shadow-xs mb-3">
              {sectionNumber}
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-black text-[#1A1005] tracking-tight uppercase leading-tight mb-2">
              {title}
            </h1>

            <div className="w-24 h-0.5 bg-[#8C6D2B]/60 mx-auto my-2.5" />

            <p className="font-serif text-xs sm:text-[13px] text-[#5A4528] italic font-medium leading-relaxed max-w-[500px] mx-auto">
              {defaultSubtitle}
            </p>
          </div>
        </div>

        {/* Evidentiary Summary & Filing Metadata Box */}
        <div className="my-3 p-4 rounded border border-[#8C7A60]/40 bg-[#FAF5E8]/90 text-xs font-serif space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#8C7A60]/30">
            <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-[#5A4528] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#3E9B34]" />
              <span>Section Scope & Evidentiary Purpose</span>
            </span>
            <span className="text-[10.5px] font-mono text-[#8C7A60]">
              Docket Cover Page
            </span>
          </div>

          <p className="text-[11.5px] leading-relaxed text-[#2A1D0E] text-justify">
            {defaultSummary}
          </p>

          <div className="pt-2 border-t border-[#8C7A60]/30 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10.5px] font-sans text-[#4A3820]">
            <div>
              <span className="font-bold text-[#1A1005] block">STUDENT:</span>
              <span className="truncate block">{studentName}</span>
            </div>
            <div>
              <span className="font-bold text-[#1A1005] block">DISTRICT:</span>
              <span className="truncate block">{district || "LEA"}</span>
            </div>
            <div>
              <span className="font-bold text-[#1A1005] block">ADVOCATE:</span>
              <span className="truncate block">{preparedBy || "Waypoint Advocates"}</span>
            </div>
            <div>
              <span className="font-bold text-[#1A1005] block">DATE:</span>
              <span className="truncate block">{submissionDate || "Active Docket"}</span>
            </div>
          </div>
        </div>

        {/* Official Certification Stamp / Disclaimer */}
        <div className="pt-2 text-center text-[9.5px] font-serif text-[#6E5D43] italic flex items-center justify-center gap-2">
          <span>Official Advocacy Filing Record</span>
          <span>·</span>
          <span>Certified Complete by Complainant</span>
          <span>·</span>
          <span>34 C.F.R. § 300.153</span>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#8C7A60]/30 flex items-center justify-between text-[11px] font-serif text-[#6E5D43] shrink-0 mt-2">
          <span className="tracking-wide">{agencyName} IDEA State Complaint</span>
          <span className="font-mono font-bold text-[#1A1005]">Page {coverPageNumber} of {totalDocketPages}</span>
        </div>

      </div>
    </div>
  );
}
