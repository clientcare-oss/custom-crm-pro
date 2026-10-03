import React, { useState, useMemo, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import PageIdBadge from "@/components/PageIdBadge";
import { toast } from "sonner";
import {
  Eye,
  Save,
  Download,
  FileText,
  FileSignature,
  Plus,
  Settings,
  Pencil,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  GripVertical,
  LayoutGrid,
  Image as ImageIcon,
  Calendar,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowRight,
  X,
  Scale,
  Gavel,
  Shield,
  HelpCircle,
  Clock,
  BookOpen,
  FolderOpen,
  AlignLeft,
  AlignCenter,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  Type,
  Quote
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// ── Types & Constants ────────────────────────────────────────────────────────
interface DocumentPage {
  id: string;
  number: string;
  title: string;
  category: "cover" | "pleading" | "facts" | "violations" | "remedies" | "exhibit";
  content?: string;
  exhibitTag?: string;
}

const DEFAULT_PAGES: DocumentPage[] = [
  { id: "cover", number: "01", title: "Cover Page", category: "cover" },
  { id: "complaint", number: "02", title: "State Complaint", category: "pleading", content: `BEFORE THE GEORGIA DEPARTMENT OF EDUCATION
DIVISION FOR SPECIAL EDUCATION SERVICES AND SUPPORTS

IN RE: ALEXANDER, SHANDERIOUS JR.
STUDENT WITH A DISABILITY,
BY AND THROUGH PARENT / GUARDIAN,
    Complainant,

v.

COBB COUNTY SCHOOL DISTRICT,
    Local Educational Agency.
____________________________________________/

FORMAL STATE COMPLAINT UNDER 34 C.F.R. § 300.153
AND GA. COMP. R. & REGS. 160-4-7-.12

I. INTRODUCTION & JURISDICTION
Complainant files this Formal State Complaint on behalf of Alexander, Shanderious Jr., a 4th grade student eligible for special education and related services under the Individuals with Disabilities Education Act (IDEA), 20 U.S.C. § 1400 et seq.

This complaint is timely filed within the one-year statute of limitations provided by 34 C.F.R. § 300.153(c) and Ga. Comp. R. & Regs. 160-4-7-.12(2)(c). All violations alleged herein occurred within the preceding twelve-month period.` },
  { id: "facts", number: "03", title: "Facts and Background", category: "facts", content: `II. STATEMENT OF FACTS

1. Alexander is a 9-year-old student currently enrolled in 4th grade within the Cobb County School District.

2. Alexander is eligible for special education services under the primary eligibility category of Other Health Impairment (OHI) and secondary Speech-Language Impairment.

3. On October 12, 2025, the Parent requested comprehensive re-evaluations in writing due to documented academic regression and escalating behavioral disruptions resulting from unaddressed sensory processing deficits.

4. The District failed to provide Prior Written Notice (PWN) or an evaluation consent form within the mandated timeline, in violation of 34 C.F.R. § 300.300 and Ga. Comp. R. & Regs. 160-4-7-.04.

5. Furthermore, between November 1, 2025 and January 15, 2026, the District systematically failed to provide 240 minutes of specialized reading instruction stipulated in Section 6 of Alexander's operative IEP.` },
  { id: "violations", number: "04", title: "Violations of Law", category: "violations", content: `III. ALLEGED VIOLATIONS OF LAW

COUNT I: FAILURE TO DELIVER MANDATED SPECIAL EDUCATION SERVICES
(34 C.F.R. § 300.323(c)(2) · Ga. Comp. R. & Regs. 160-4-7-.06)
The District failed to implement the IEP as written by withholding mandated specialized reading instruction and speech-language therapy, resulting in a denial of a Free Appropriate Public Education (FAPE).

COUNT II: FAILURE TO TIMELY EVALUATE & CHILD FIND VIOLATION
(34 C.F.R. § 300.111, § 300.301 · Ga. Comp. R. & Regs. 160-4-7-.03)
The District ignored formal written parental requests for sensory and functional behavioral assessments, violating its affirmative duty to evaluate in all areas of suspected disability.

COUNT III: REFUSAL TO ISSUE TIMELY PRIOR WRITTEN NOTICE
(34 C.F.R. § 300.503 · Ga. Comp. R. & Regs. 160-4-7-.14)
The District altered service delivery schedules and refused evaluation requests without providing written explanations containing the mandatory statutory justifications.` },
  { id: "remedies", number: "05", title: "Requested Remedies", category: "remedies", content: `IV. PROPOSED RESOLUTION & REQUESTED REMEDIES

To remedy the systemic deprivations of educational benefit suffered by Alexander, Complainant respectfully requests that the Georgia Department of Education order the following corrective actions:

1. COMPENSATORY EDUCATION:
Award 60 hours of 1-on-1 certified Orton-Gillingham reading tutoring and 20 hours of licensed Speech-Language Pathology services to be provided by an independent provider of Parent's choice at the District's expense.

2. INDEPENDENT EDUCATIONAL EVALUATION (IEE):
Fund independent comprehensive neuropsychological and sensory processing evaluations at public expense.

3. IEP TEAM MEETING:
Order the Cobb County School District to reconvene the IEP team within 15 school days of investigative findings to incorporate compensatory hours, revise annual goals, and integrate mandatory accommodation safeguards.

4. STAFF TRAINING:
Require mandatory administrative training for school-based special education personnel on Prior Written Notice compliance and service log verification.` },
  { id: "exhibit_a", number: "06", title: "Exhibit A (IEP)", category: "exhibit", exhibitTag: "Exhibit A", content: `EXHIBIT A: OPERATIVE INDIVIDUALIZED EDUCATION PROGRAM (IEP)

DOCUMENT DETAILS:
• Student: Alexander, Shanderious Jr.
• Document Date: August 28, 2025
• Author: Cobb County School District IEP Team
• Relevant Pages: Pages 4-8 (Service Delivery Schedule & Accommodations)

SUMMARY OF EXHIBIT EVIDENCE:
This document establishes the binding commitment made by Cobb County School District to provide 150 minutes weekly of specialized reading instruction and 60 minutes weekly of speech therapy.` },
  { id: "exhibit_b", number: "07", title: "Exhibit B (Evaluations)", category: "exhibit", exhibitTag: "Exhibit B", content: `EXHIBIT B: PSYCHOEDUCATIONAL EVALUATION & PARENT REQUESTS

DOCUMENT DETAILS:
• Initial Evaluation Report: September 14, 2023
• Formal Parent Re-evaluation Request Letter: October 12, 2025
• Delivery Confirmation: Email timestamped 8:42 AM to Special Education Lead

SUMMARY OF EXHIBIT EVIDENCE:
Proves written notification to LEA of emerging sensory deficits and establishes the start of statutory timelines for evaluation consent.` },
  { id: "exhibit_c", number: "08", title: "Exhibit C (Communications)", category: "exhibit", exhibitTag: "Exhibit C", content: `EXHIBIT C: DISTRICT CORRESPONDENCE & SERVICE LOGS

DOCUMENT DETAILS:
• Service Delivery Log: November 2025 – January 2026
• Email Chain between Parent and Case Manager: November 18, 2025 – December 12, 2025

SUMMARY OF EXHIBIT EVIDENCE:
Documentary proof showing 18 missed sessions without compensatory make-up time and admission from case manager acknowledging staff shortages.` },
];

interface ComplaintCaseDetails {
  studentName: string;
  studentDob: string;
  grade: string;
  school: string;
  district: string;
  parentName: string;
  preparedBy: string;
  submissionDate: string;
  showLogo?: boolean;
}

// ── Authentic Transparent Photographic Brass Corner Bracket Asset ───────────
function BrassCorner({ position, size = 32 }: { position: "tl" | "tr" | "bl" | "br"; size?: number }) {
  const isTop = position === "tl" || position === "tr";
  const isLeft = position === "tl" || position === "bl";
  const src = `/decor/folio-corner-${position}.png`;

  return (
    <img
      src={src}
      alt=""
      style={{ width: `${size}px`, height: `${size}px` }}
      className={cn(
        "absolute pointer-events-none z-40 select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]",
        isTop ? "-top-[1px]" : "-bottom-[1px]",
        isLeft ? "-left-[1px]" : "-right-[1px]"
      )}
    />
  );
}

function FolioBoxCornerBrackets({ size = 34 }: { size?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none select-none z-40">
      <BrassCorner position="tl" size={size} />
      <BrassCorner position="tr" size={size} />
      <BrassCorner position="bl" size={size} />
      <BrassCorner position="br" size={size} />
    </div>
  );
}

// ── Authentic Embossed Brass Slip Handle / Tab Bracket ─────────────────────
function BrassSlipHandle({ isActive }: { isActive?: boolean }) {
  return (
    <div 
      className={cn(
        "absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-7 pointer-events-none z-30 flex items-center justify-center",
        "drop-shadow-[1px_2px_3px_rgba(0,0,0,0.7)]"
      )}
    >
      {/* Outer Brass Backplate */}
      <div 
        className={cn(
          "w-3.5 h-6 rounded-[3px] border transition-all relative flex flex-col items-center justify-between py-[2px]",
          isActive
            ? "border-[#FFF0C4] bg-gradient-to-b from-[#FFF2CB] via-[#DDA843] to-[#805517] shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_1px_2px_rgba(0,0,0,0.6)]"
            : "border-[#DFBC72] bg-gradient-to-b from-[#F5DCA0] via-[#B88E3E] to-[#5C3B0E] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_1px_2px_rgba(0,0,0,0.5)]"
        )}
      >
        {/* Top Brass Rivet */}
        <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-[#FFF8DF] via-[#C99E3D] to-[#5A380A] shadow-[0_0.5px_1px_rgba(0,0,0,0.8),inset_0_0.5px_0.5px_rgba(255,255,255,0.8)]" />

        {/* Center Arched Pull Loop / Handle Bar */}
        <div 
          className={cn(
            "w-2 h-2.5 rounded-[1.5px] border-[1px] transition-all relative shadow-sm",
            isActive
              ? "border-[#FFF5D4] bg-gradient-to-r from-[#8A5B18] via-[#FEE8A2] to-[#8A5B18]"
              : "border-[#E8C882] bg-gradient-to-r from-[#6B440E] via-[#D8AD52] to-[#6B440E]"
          )}
        >
          {/* Loop Inner Shadow Depth */}
          <div className="absolute inset-0 bg-black/15 rounded-[0.5px]" />
        </div>

        {/* Bottom Brass Rivet */}
        <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-[#FFF8DF] via-[#C99E3D] to-[#5A380A] shadow-[0_0.5px_1px_rgba(0,0,0,0.8),inset_0_0.5px_0.5px_rgba(255,255,255,0.8)]" />
      </div>
    </div>
  );
}

// ── Miniature Page Facsimile Preview (Actual Micro Document Replica) ────────
function MiniaturePagePreview({ category, isActive }: { category: DocumentPage["category"]; isActive?: boolean }) {
  if (category === "cover") {
    return (
      <div
        className={cn(
          "w-[24px] h-[32px] rounded-[1.5px] p-[2px] flex flex-col justify-between shadow-[0_1px_2.5px_rgba(0,0,0,0.45)] border shrink-0 relative overflow-hidden",
          isActive ? "bg-[#FFFDF7] border-[#8C6D2B]" : "bg-[#FAF5E8] border-[#A88A4C]/80"
        )}
      >
        {/* Tiny top header representation */}
        <div className="w-full flex flex-col items-center gap-[1px] pt-[0.5px]">
          <div className="w-2 h-[1px] bg-[#6C5320] rounded-[0.5px]" />
          <div className="w-3.5 h-[0.5px] bg-[#9E7D3B]" />
        </div>
        {/* Tiny centered title block */}
        <div className="w-full flex flex-col items-center gap-[0.5px] my-auto">
          <div className="w-3.5 h-[1.5px] bg-[#1A120A] rounded-[0.5px]" />
          <div className="w-2.5 h-[0.5px] bg-[#6C5320]" />
          {/* Micro lines */}
          <div className="w-full flex flex-col gap-[1px] px-[1px] mt-0.5">
            <div className="w-full h-[0.5px] bg-[#8C6D2B]/60" />
            <div className="w-3/4 h-[0.5px] bg-[#8C6D2B]/60" />
            <div className="w-4/5 h-[0.5px] bg-[#8C6D2B]/60" />
          </div>
        </div>
        {/* Tiny footer */}
        <div className="w-2.5 h-[0.5px] bg-[#A88A4C] mx-auto mb-[0.5px]" />
      </div>
    );
  }

  // Legal Pleading / Exhibits
  return (
    <div
      className={cn(
        "w-[24px] h-[32px] rounded-[1.5px] p-[2px] flex flex-col justify-between shadow-[0_1px_2.5px_rgba(0,0,0,0.45)] border shrink-0 relative overflow-hidden",
        isActive ? "bg-[#FFFDF7] border-[#8C6D2B]" : "bg-[#FAF5E8] border-[#A88A4C]/80"
      )}
    >
      {/* Tiny caption header */}
      <div className="w-full flex flex-col gap-[0.5px] pt-[0.5px] border-b border-[#A88A4C]/40 pb-[1px]">
        <div className="w-full h-[0.5px] bg-[#3A2810]" />
        <div className="w-2/3 h-[0.5px] bg-[#6C5320]" />
      </div>
      {/* Micro ruled paragraph lines */}
      <div className="w-full flex flex-col gap-[1px] px-[0.5px] my-auto">
        <div className="w-full h-[0.5px] bg-[#1A120A]/70" />
        <div className="w-full h-[0.5px] bg-[#1A120A]/70" />
        <div className="w-4/5 h-[0.5px] bg-[#1A120A]/70" />
        <div className="w-full h-[0.5px] bg-[#1A120A]/70" />
        <div className="w-3/5 h-[0.5px] bg-[#1A120A]/70" />
      </div>
      {/* Tiny page number */}
      <div className="w-full flex justify-between items-center px-[0.5px] border-t border-[#A88A4C]/30 pt-[0.5px]">
        <div className="w-1.5 h-[0.5px] bg-[#8C6D2B]" />
        <div className="w-1 h-[0.5px] bg-[#6C5320]" />
      </div>
    </div>
  );
}

// ── Main Component: PG-020 State Complaint Builder ───────────────────────────
export default function ComplaintWorkspace() {
  const params = useParams<{ id?: string; section?: string }>();
  const [location, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  // State: Case Data
  const [caseDetails, setCaseDetails] = useState<ComplaintCaseDetails>({
    studentName: "Alexander, Shanderious Jr.",
    studentDob: "",
    grade: "4th grade",
    school: "",
    district: "Cobb County School District",
    parentName: "",
    preparedBy: "Waypoint Advocates",
    submissionDate: "",
    showLogo: true,
  });

  // State: Pages and Active Navigation
  const [pages, setPages] = useState<DocumentPage[]>(DEFAULT_PAGES);
  const [activePageId, setActivePageId] = useState<string>("cover");
  const [activeToolbarTab, setActiveToolbarTab] = useState<"edit" | "arrange" | "cover" | "insert" | "compile">("cover");

  // State: Viewport, Proportional View Mode, Zoom, and Collapsible Panels
  const [viewMode, setViewMode] = useState<"fit-width" | "fit-page" | "actual">("fit-width");
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [isIndexCollapsed, setIsIndexCollapsed] = useState<boolean>(false);
  const [isToolsCollapsed, setIsToolsCollapsed] = useState<boolean>(false);
  const [lastSavedText, setLastSavedText] = useState<string>("Draft saved 2 minutes ago");

  // State: Google Docs Typography & Writing Settings
  const [fontFamily, setFontFamily] = useState<"serif" | "times" | "garamond" | "sans">("serif");
  const [fontSize, setFontSize] = useState<number>(12); // pt
  const [lineSpacing, setLineSpacing] = useState<"1.15" | "1.5" | "2.0">("1.5");
  const [textAlign, setTextAlign] = useState<"left" | "justify" | "center">("justify");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  // State: Modals
  const [isEditCoverModalOpen, setIsEditCoverModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isCompilerModalOpen, setIsCompilerModalOpen] = useState(false);
  const [isAddPageModalOpen, setIsAddPageModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPageCategory, setNewPageCategory] = useState<DocumentPage["category"]>("exhibit");

  // Editable Content in State
  const activePage = pages.find((p) => p.id === activePageId) || pages[0];
  const activePageIndex = pages.findIndex((p) => p.id === activePageId);

  // Content edits handler
  const handleUpdatePageContent = (text: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === activePageId ? { ...p, content: text } : p))
    );
    setLastSavedText("Draft saved just now");
  };

  // Live text metrics (Word & character count like Google Docs Tools > Word Count)
  const textStats = useMemo(() => {
    const content = activePage.content || "";
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const chars = content.length;
    return { words, chars };
  }, [activePage.content]);

  // Insert legal citation helper
  const handleInsertLegalSnippet = (snippet: string) => {
    const current = activePage.content || "";
    const updated = current ? `${current}\n\n${snippet}` : snippet;
    handleUpdatePageContent(updated);
    toast.success("Inserted citation into document");
  };

  // Quick field updates on Cover
  const handleQuickFieldUpdate = (field: keyof ComplaintCaseDetails, value: string) => {
    setCaseDetails((prev) => ({ ...prev, [field]: value }));
    setLastSavedText("Draft saved just now");
  };

  // Add Page handler
  const handleAddPage = () => {
    if (!newPageTitle.trim()) return;
    const nextNum = (pages.length + 1).toString().padStart(2, "0");
    const newPage: DocumentPage = {
      id: `custom_${Date.now()}`,
      number: nextNum,
      title: newPageTitle.trim(),
      category: newPageCategory,
      content: `DOCUMENT SECTION: ${newPageTitle.toUpperCase()}\n\nEnter statement of legal argument, factual evidence, or supporting documentation here...`,
    };
    setPages((prev) => [...prev, newPage]);
    setActivePageId(newPage.id);
    setIsAddPageModalOpen(false);
    setNewPageTitle("");
    toast.success(`Page "${newPageTitle}" added to state complaint packet`);
  };

  // PDF Export
  const handleExportPdf = () => {
    toast.success("Compiling official Georgia State Complaint PDF with exhibits...");
    setTimeout(() => {
      window.print();
    }, 400);
  };

  // Save Draft
  const handleSaveDraft = () => {
    setLastSavedText("Draft saved just now");
    toast.success("State Complaint draft saved to secure advocacy docket");
  };

  return (
    <ScopedErrorBoundary moduleName="State Complaint Builder">
      <div 
        className="relative flex flex-col h-[calc(100vh-0px)] w-full overflow-hidden bg-[#000820] text-slate-100 select-none"
        style={{
          backgroundImage: "url('/decor/folio-leather-texture.png')",
          backgroundRepeat: "repeat",
          backgroundSize: "240px",
        }}
      >
        {/* Background Vignette */}
        <div 
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background: "radial-gradient(ellipse at 50% 15%, rgba(13,38,72,0.5) 0%, rgba(2,10,23,0.85) 60%, rgba(0,8,32,0.96) 100%)",
          }}
        />

        {/* ── TOP HEADER BAR ──────────────────────────────────────────────── */}
        <header 
          className="relative z-30 flex items-center justify-between px-5 py-2.5 mx-3 mt-3 rounded-[16px] border border-[#3A2C18] bg-[#020B1A]/95 shadow-md before:absolute before:inset-[3px] before:border before:border-dashed before:border-[#2C4166]/40 before:rounded-[12px] before:pointer-events-none"
          style={{
            backgroundImage: "url('/decor/folio-leather-texture.png')",
            backgroundRepeat: "repeat",
            backgroundSize: "240px",
          }}
        >
          <div className="flex items-center gap-4">
            <h1 className="font-serif text-lg font-bold tracking-wide text-[#FFF4D4] flex items-center gap-2">
              <span>State Complaint — Alexander</span>
              <PageIdBadge id="PG-020" />
            </h1>
            <span className="flex items-center gap-2 text-xs text-[#C6B697] font-medium border-l border-[#3A2C18] pl-4">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span>{lastSavedText}</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewModalOpen(true)}
              className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] gap-1.5 text-xs h-8 cursor-pointer rounded-md shadow-xs"
            >
              <Eye className="w-3.5 h-3.5 text-[#FFE394]" />
              Preview
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] gap-1.5 text-xs h-8 cursor-pointer rounded-md shadow-xs"
            >
              <Save className="w-3.5 h-3.5 text-[#FFE394]" />
              Save Draft
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleExportPdf}
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-8 px-4 gap-1.5 rounded-md border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-105 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export PDF
            </Button>
          </div>
        </header>

        {/* ── 3-COLUMN STUDIO WORKSPACE ───────────────────────────────────── */}
        <div className="relative z-10 flex flex-1 overflow-hidden p-2.5 sm:p-3 pt-2 gap-2.5 lg:gap-3">
          
          {/* ── LEFT COLUMN: Document Binder / Outline Rail ─────────────── */}
          {!isFocusMode && !isIndexCollapsed && (
            <aside 
              className="w-44 lg:w-48 xl:w-52 shrink-0 flex flex-col justify-between rounded-[18px] border border-[#3A2C18] bg-[#03152E]/95 shadow-2xl relative p-2.5 before:absolute before:inset-[4px] before:border before:border-dashed before:border-[#263E63]/50 before:rounded-[14px] before:pointer-events-none before:z-10"
              style={{
                backgroundImage: "url('/decor/folio-leather-texture.png')",
                backgroundRepeat: "repeat",
                backgroundSize: "200px",
              }}
            >
              <div className="flex items-center justify-between px-2 pt-6 pb-2 border-b border-[#3A2C18]/60 relative z-20">
                <span className="text-[11px] font-serif font-bold text-[#C6B697] tracking-wider uppercase">Packet Index</span>
                <button
                  type="button"
                  onClick={() => setIsIndexCollapsed(true)}
                  className="text-[#C6B697] hover:text-[#FFF4D4] p-1 rounded hover:bg-white/[0.05] transition-colors cursor-pointer"
                  title="Collapse index"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pt-2 pb-3 pl-3 pr-1.5 custom-scrollbar [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[#000820] [&::-webkit-scrollbar-thumb]:bg-[#4A3718] [&::-webkit-scrollbar-thumb]:rounded-sm">
                {pages.map((p) => {
                  const isActive = p.id === activePageId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setActivePageId(p.id);
                        if (p.id === "cover") {
                          setActiveToolbarTab("cover");
                        } else {
                          setActiveToolbarTab("edit");
                        }
                      }}
                      style={
                        isActive
                          ? { background: "linear-gradient(135deg, #FFF1CD 0%, #F5D382 45%, #E6B54E 100%)" }
                          : {
                              backgroundImage: "url('/decor/fine-parchment.jpg')",
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                      }
                      className={cn(
                        "w-full flex items-center justify-between p-2 pl-3.5 rounded-[6px] transition-all text-left group cursor-pointer relative border select-none",
                        isActive
                          ? "border-[#FDE08E] shadow-[0_3px_10px_rgba(0,0,0,0.6),0_1px_2px_rgba(0,0,0,0.4)]"
                          : "border-[#C2AA74]/80 shadow-[0_2px_5px_rgba(0,0,0,0.5),0_1px_1px_rgba(0,0,0,0.3)] hover:brightness-105"
                      )}
                    >
                      {/* Authentic Embossed Brass Slip Handle */}
                      <BrassSlipHandle isActive={isActive} />

                      <div className="flex items-center gap-2 min-w-0 flex-1 pl-1">
                        <span className={cn(
                          "font-mono text-xs shrink-0 font-bold px-1.5 border-r",
                          isActive ? "text-[#3D2C10] border-[#8C6D2B]/50" : "text-[#5C421B] border-[#B39358]/40"
                        )}>
                          {p.number}
                        </span>
                        <span className={cn(
                          "text-xs truncate tracking-tight font-serif font-bold",
                          isActive ? "text-[#1C1003]" : "text-[#1A1005]"
                        )}>
                          {p.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 pl-1">
                        <MiniaturePagePreview category={p.category} isActive={isActive} />
                        <GripVertical className={cn(
                          "w-3 h-3 shrink-0 opacity-50 group-hover:opacity-90 transition-opacity",
                          isActive ? "text-[#3D2C10]" : "text-[#7A6136]"
                        )} />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-[#3A2C18]/80 mt-2 relative z-20">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddPageModalOpen(true)}
                  className="w-full border-[#3A2C18] bg-[#05142B] text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#081F3E] text-xs h-9 font-medium gap-2 cursor-pointer shadow-sm rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5 text-[#DFBE77]" />
                  Add Page
                </Button>
              </div>

              {/* Brass Corner Brackets in front */}
              <FolioBoxCornerBrackets size={32} />
            </aside>
          )}

          {/* ── CENTER COLUMN: Parchment Writing Stage ──────────────────── */}
          <main 
            className="flex-1 flex flex-col rounded-[18px] border border-[#3A2C18] bg-[#03152E]/95 shadow-2xl relative min-w-0 before:absolute before:inset-[4px] before:border before:border-dashed before:border-[#263E63]/50 before:rounded-[14px] before:pointer-events-none before:z-10"
            style={{
              backgroundImage: "url('/decor/folio-leather-texture.png')",
              backgroundRepeat: "repeat",
              backgroundSize: "240px",
            }}
          >
            {/* Top Folio Tabs Bar (Executive Navy & Brass Tabs matching Student Workspace) */}
            <div 
              style={{
                backgroundImage: "url('/decor/folio-leather-texture.png')",
                backgroundRepeat: "repeat",
                backgroundSize: "220px",
              }}
              className="pl-8 sm:pl-9 pr-8 sm:pr-9 pt-2.5 pb-0 bg-gradient-to-b from-[#041633] via-[#021026] to-[#010a1a] flex items-end justify-center sm:justify-start relative z-20 rounded-t-[18px] shadow-[0_4px_12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(147,197,253,0.15)]"
            >
              {/* Authentic Debossed Leather Impression Seam (replacing the gold line) */}
              <div 
                className="absolute bottom-0 left-0 right-0 h-[3px] pointer-events-none z-10"
                style={{
                  background: "linear-gradient(180deg, #00040a 0%, #020b18 45%, #112036 100%)",
                  boxShadow: "0 1px 0 rgba(255,255,255,0.08), inset 0 1px 2px rgba(0,0,0,0.95)",
                }}
              />

              <div className="flex items-end gap-1 sm:gap-1.5 md:gap-2 mb-0 min-w-0 flex-1 justify-center sm:justify-start relative z-20">
                {[
                  { id: "edit", label: "Edit", icon: Pencil },
                  { id: "arrange", label: "Arrange", icon: Layers },
                  { id: "cover", label: "Cover", icon: FileText },
                  { id: "insert", label: "Insert", icon: Plus },
                  { id: "compile", label: "Compile", icon: Settings },
                ].map((tab) => {
                  const isActive = activeToolbarTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        if (tab.id === "insert") {
                          setIsAddPageModalOpen(true);
                        } else if (tab.id === "compile") {
                          setIsCompilerModalOpen(true);
                        } else {
                          setActiveToolbarTab(tab.id as any);
                          if (tab.id === "cover") {
                            setActivePageId("cover");
                          } else if (activePageId === "cover") {
                            setActivePageId("complaint");
                          }
                        }
                      }}
                      className={cn(
                        "relative flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2 px-2.5 sm:px-3 md:px-3.5 lg:px-4 py-2 sm:py-2.5 rounded-t-[4px] text-xs sm:text-[13px] transition-all cursor-pointer select-none shrink-0",
                        "border border-b-0",
                        isActive
                          ? "bg-gradient-to-b from-[#032556] via-[#021d45] to-[#011432] text-white border-[#2b64a8]/80 z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(147,197,253,0.5)]"
                          : "bg-gradient-to-b from-[#021a3b] via-[#021532] to-[#010e24] text-[#e2e8f0]/85 hover:text-white hover:from-[#03224c] hover:to-[#01132e] border-[#1a4478]/70 z-20 shadow-[0_-2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(96,165,250,0.3)]"
                      )}
                      style={{
                        fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
                      }}
                    >
                      <Icon 
                        className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white/95 shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" 
                        strokeWidth={1.75} 
                      />
                      <span className="font-normal tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* If NOT on cover page, show compact single-line formatting toolbar */}
            {activePage.id !== "cover" && (
              <div 
                style={{
                  backgroundImage: "url('/decor/folio-leather-texture.png')",
                  backgroundRepeat: "repeat",
                  backgroundSize: "200px",
                }}
                className="px-8 py-1.5 border-b border-[#3A2C18] bg-gradient-to-r from-[#0A2244]/95 via-[#061833]/95 to-[#0A2244]/95 flex flex-wrap items-center justify-between gap-2 text-xs relative z-20 shadow-xs"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value as any)}
                    className="bg-[#05142B] border border-[#3A2C18] text-[#E8DCC2] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#C5A059] cursor-pointer"
                  >
                    <option value="serif">Georgia (Admiralty Serif)</option>
                    <option value="times">Times New Roman (Legal)</option>
                    <option value="garamond">EB Garamond (Judicial)</option>
                    <option value="sans">Inter (Modern Sans)</option>
                  </select>

                  <div className="flex items-center bg-[#05142B] border border-[#3A2C18] rounded px-1 py-0.5">
                    <button
                      type="button"
                      onClick={() => setFontSize((s) => Math.max(9, s - 1))}
                      className="px-1 text-[#C6B697] hover:text-[#FFF4D4] font-bold"
                    >
                      -
                    </button>
                    <span className="font-mono text-[11px] text-[#FFF4D4] px-1.5 min-w-[28px] text-center font-semibold">
                      {fontSize}pt
                    </span>
                    <button
                      type="button"
                      onClick={() => setFontSize((s) => Math.min(24, s + 1))}
                      className="px-1 text-[#C6B697] hover:text-[#FFF4D4] font-bold"
                    >
                      +
                    </button>
                  </div>

                  <div className="w-[1px] h-4 bg-[#3A2C18] mx-0.5" />

                  <div className="flex items-center bg-[#05142B] border border-[#3A2C18] rounded p-0.5">
                    <button
                      type="button"
                      onClick={() => setIsBold(!isBold)}
                      className={cn("p-1 rounded transition-colors", isBold ? "bg-[#C5A059] text-[#07162B]" : "text-[#C6B697] hover:text-[#FFF4D4]")}
                    >
                      <Bold className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsItalic(!isItalic)}
                      className={cn("p-1 rounded transition-colors", isItalic ? "bg-[#C5A059] text-[#07162B]" : "text-[#C6B697] hover:text-[#FFF4D4]")}
                    >
                      <Italic className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsUnderline(!isUnderline)}
                      className={cn("p-1 rounded transition-colors", isUnderline ? "bg-[#C5A059] text-[#07162B]" : "text-[#C6B697] hover:text-[#FFF4D4]")}
                    >
                      <Underline className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="w-[1px] h-4 bg-[#3A2C18] mx-0.5" />

                  <div className="flex items-center bg-[#05142B] border border-[#3A2C18] rounded p-0.5">
                    <button
                      type="button"
                      onClick={() => setTextAlign("left")}
                      className={cn("p-1 rounded transition-colors", textAlign === "left" ? "bg-[#C5A059] text-[#07162B]" : "text-[#C6B697] hover:text-[#FFF4D4]")}
                    >
                      <AlignLeft className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextAlign("center")}
                      className={cn("p-1 rounded transition-colors", textAlign === "center" ? "bg-[#C5A059] text-[#07162B]" : "text-[#C6B697] hover:text-[#FFF4D4]")}
                    >
                      <AlignCenter className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextAlign("justify")}
                      className={cn("p-1 rounded transition-colors", textAlign === "justify" ? "bg-[#C5A059] text-[#07162B]" : "text-[#C6B697] hover:text-[#FFF4D4]")}
                    >
                      <AlignJustify className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-[11px] text-[#A69371] bg-[#05142B] px-2 py-0.5 rounded border border-[#3A2C18]">
                    {textStats.words} words · {textStats.chars.toLocaleString()} chars
                  </span>
                </div>
              </div>
            )}

            {/* ── Scrollable Document Canvas Viewport ───────────────────── */}
            {/* Tightened space above paper, quiet navy scrollbar with muted brass thumb */}
            <div 
              className="flex-1 relative overflow-y-auto overflow-x-hidden pt-2.5 pb-6 px-4 sm:px-6 flex flex-col items-center bg-[#041633] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-[#031024] [&::-webkit-scrollbar-thumb]:bg-[#4A3718] [&::-webkit-scrollbar-thumb]:rounded-sm hover:[&::-webkit-scrollbar-thumb]:bg-[#7A5A28]"
              style={{
                backgroundImage: "radial-gradient(ellipse at 50% 35%, rgba(18, 52, 96, 0.72) 0%, rgba(7, 25, 54, 0.88) 60%, rgba(3, 14, 32, 0.98) 100%), url('/decor/folio-leather-texture.png')",
                backgroundRepeat: "no-repeat, repeat",
                backgroundSize: "100% 100%, 240px",
              }}
            >
              
              {/* Floating Parchment Capsule Pill (tightened distance to document) */}
              <div 
                style={{
                  backgroundImage: "url('/decor/fine-parchment.jpg')",
                  backgroundSize: "cover",
                }}
                className="flex items-center border border-[#B39358] rounded-md shadow-[0_3px_10px_rgba(0,0,0,0.65)] p-0.5 mb-2 z-20 shrink-0"
              >
                <button
                  type="button"
                  onClick={() => {
                    const next = activePageId === "cover" ? "complaint" : "cover";
                    setActivePageId(next);
                    if (next === "cover") setActiveToolbarTab("cover");
                    else setActiveToolbarTab("edit");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-serif font-bold text-[#1A120A] hover:bg-black/[0.05] rounded transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#6E4F18]" />
                  <span>{activePage.title}</span>
                  <ChevronDown className="w-3 h-3 text-[#6E4F18]" />
                </button>

                <div className="w-[1px] h-4 bg-[#B39358]/60 mx-1" />

                <button
                  type="button"
                  onClick={() => setIsEditCoverModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-serif font-bold text-[#1A120A] hover:bg-black/[0.05] rounded transition-colors cursor-pointer"
                >
                  <Pencil className="w-3 h-3 text-[#6E4F18]" />
                  <span>Edit details</span>
                </button>
              </div>

              {/* ── PARCHMENT LETTER DOCUMENT SHEET ─────────────────────── */}
              {/* Uses pristine fine parchment texture with zero dark brown bands and calm lighter center for reading */}
              <div
                style={{
                  aspectRatio: "8.5 / 11",
                  backgroundImage: "url('/decor/fine-parchment.jpg')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
                  transformOrigin: "top center",
                }}
                className={cn(
                  "relative rounded-xs select-text flex flex-col justify-between transition-all",
                  "bg-[#FBF6EA] text-[#1A120A] border border-[#C5A059]/60",
                  "shadow-[0_16px_50px_rgba(0,0,0,0.85),0_2px_8px_rgba(0,0,0,0.5)]",
                  viewMode === "fit-width" && "w-full max-w-[840px] aspect-[8.5/11] min-h-[1080px] p-10 sm:p-14 lg:p-16 my-1 shrink-0",
                  viewMode === "fit-page" && "h-[calc(100vh-175px)] aspect-[8.5/11] w-auto max-w-full p-8 lg:p-10 my-auto shrink-0",
                  viewMode === "actual" && "w-[816px] min-h-[1056px] p-12 sm:p-16 my-2 shrink-0"
                )}
              >
                {/* Printable Margin Guidelines (1-inch printable margins) */}
                <div className="absolute top-6 left-6 w-3 h-3 border-t border-l border-[#8C7A60]/40 pointer-events-none z-10" />
                <div className="absolute top-6 right-6 w-3 h-3 border-t border-r border-[#8C7A60]/40 pointer-events-none z-10" />
                <div className="absolute bottom-6 left-6 w-3 h-3 border-b border-l border-[#8C7A60]/40 pointer-events-none z-10" />
                <div className="absolute bottom-6 right-6 w-3 h-3 border-b border-r border-[#8C7A60]/40 pointer-events-none z-10" />

                {/* ── VIEW 1: COVER PAGE (1-to-1 match with Reference Screenshot) ── */}
                {activePage.id === "cover" ? (
                  <div className="relative z-10 flex flex-col justify-between h-full min-h-0 text-center select-text">
                    
                    {/* Top Header */}
                    <div className="pt-2 shrink-0">
                      {caseDetails.showLogo && (
                        <div className="flex justify-center mb-2">
                          <img 
                            src="/waypoint-logo.png" 
                            alt="Waypoint Advocates" 
                            className="h-10 w-10 sm:h-12 sm:w-12 object-contain filter drop-shadow-xs" 
                          />
                        </div>
                      )}
                      
                      <h2 className="font-serif tracking-[0.25em] text-[#2C2013] text-xs sm:text-sm font-bold uppercase">
                        WAYPOINT ADVOCATES
                      </h2>

                      {/* Diamond Filigree Flourish */}
                      <div className="w-32 h-[1px] bg-[#8C7A60]/60 mx-auto my-3 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rotate-45 bg-[#8C7A60]" />
                      </div>

                      {/* Main Title */}
                      <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-black tracking-wide text-[#150E06] uppercase mt-2">
                        STATE COMPLAINT
                      </h1>

                      <p className="font-serif italic text-sm sm:text-base text-[#4A3C28] mt-2">
                        Submitted to the Georgia Department of Education
                      </p>
                    </div>

                    {/* Metadata Table Form Grid (2 Columns) */}
                    <div className="max-w-md sm:max-w-lg mx-auto w-full my-auto py-6 sm:py-8 shrink-0">
                      <div className="grid grid-cols-[150px_1fr] sm:grid-cols-[180px_1fr] gap-y-3 sm:gap-y-3.5 text-left text-xs sm:text-sm font-serif">
                        
                        {/* Student */}
                        <div className="font-bold text-[#1A120A]">Student:</div>
                        <div className="text-[#2B1F11] font-medium flex items-center justify-between group">
                          <span>{caseDetails.studentName}</span>
                          <button
                            type="button"
                            onClick={() => setIsEditCoverModalOpen(true)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[#8C7A60] hover:text-[#1A120A] p-0.5 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Date of Birth */}
                        <div className="font-bold text-[#1A120A]">Date of birth:</div>
                        <div className="text-[#2B1F11] font-medium flex items-center justify-between group">
                          <span className={caseDetails.studentDob ? "text-[#2B1F11]" : "text-[#8C7A60] italic"}>
                            {caseDetails.studentDob || "[Add date of birth]"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsEditCoverModalOpen(true)}
                            className="opacity-70 group-hover:opacity-100 transition-opacity text-[#8C7A60] hover:text-[#1A120A] p-0.5 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Grade */}
                        <div className="font-bold text-[#1A120A]">Grade:</div>
                        <div className="text-[#2B1F11] font-medium flex items-center justify-between group">
                          <span>{caseDetails.grade}</span>
                          <button
                            type="button"
                            onClick={() => setIsEditCoverModalOpen(true)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[#8C7A60] hover:text-[#1A120A] p-0.5 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>

                        {/* School */}
                        <div className="font-bold text-[#1A120A]">School:</div>
                        <div className="text-[#2B1F11] font-medium flex items-center justify-between group">
                          <span className={caseDetails.school ? "text-[#2B1F11]" : "text-[#8C7A60] italic"}>
                            {caseDetails.school || "[Add school]"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsEditCoverModalOpen(true)}
                            className="opacity-70 group-hover:opacity-100 transition-opacity text-[#8C7A60] hover:text-[#1A120A] p-0.5 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>

                        {/* District */}
                        <div className="font-bold text-[#1A120A]">District:</div>
                        <div className="text-[#2B1F11] font-medium flex items-center justify-between group">
                          <span>{caseDetails.district}</span>
                          <button
                            type="button"
                            onClick={() => setIsEditCoverModalOpen(true)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[#8C7A60] hover:text-[#1A120A] p-0.5 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Parent / Guardian */}
                        <div className="font-bold text-[#1A120A]">Parent / Guardian:</div>
                        <div className="text-[#2B1F11] font-medium flex items-center justify-between group">
                          <span className={caseDetails.parentName ? "text-[#2B1F11]" : "text-[#8C7A60] italic"}>
                            {caseDetails.parentName || "[Add parent name]"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsEditCoverModalOpen(true)}
                            className="opacity-70 group-hover:opacity-100 transition-opacity text-[#8C7A60] hover:text-[#1A120A] p-0.5 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Prepared by */}
                        <div className="font-bold text-[#1A120A]">Prepared by:</div>
                        <div className="text-[#2B1F11] font-medium flex items-center justify-between group">
                          <span>{caseDetails.preparedBy}</span>
                          <button
                            type="button"
                            onClick={() => setIsEditCoverModalOpen(true)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[#8C7A60] hover:text-[#1A120A] p-0.5 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Submission date */}
                        <div className="font-bold text-[#1A120A]">Submission date:</div>
                        <div className="text-[#2B1F11] font-medium flex items-center justify-between group">
                          <span className={caseDetails.submissionDate ? "text-[#2B1F11]" : "text-[#8C7A60] italic"}>
                            {caseDetails.submissionDate || "[Add date]"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsEditCoverModalOpen(true)}
                            className="opacity-70 group-hover:opacity-100 transition-opacity text-[#8C7A60] hover:text-[#1A120A] p-0.5 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>

                      </div>
                    </div>

                    {/* Bottom Confidentiality Footer */}
                    <div className="pb-3 shrink-0">
                      <div className="w-40 h-[1px] bg-[#8C7A60]/50 mx-auto my-3 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rotate-45 bg-[#8C7A60]" />
                      </div>
                      <p className="font-serif italic text-xs text-[#8C7A60]">
                        Confidential student information
                      </p>
                    </div>

                  </div>
                ) : (
                  /* ── VIEW 2: EDITABLE DOCUMENT PAGES (Proportional Google Docs Writing Area) ── */
                  <div className="relative z-10 flex flex-col h-full min-h-0 select-text">
                    <div className="flex items-center justify-between pb-3 border-b border-[#8C7A60]/40 shrink-0">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[#8C7A60] font-bold">
                          Section {activePage.number} · {activePage.category.toUpperCase()}
                        </span>
                        <h2 className="font-serif text-lg sm:text-xl font-bold text-[#1A120A] mt-0.5">
                          {activePage.title}
                        </h2>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-serif text-[#6E5D43] italic block">
                          GA DOE SPECIAL EDUCATION
                        </span>
                        <span className="text-[10px] font-mono text-[#8C7A60]">
                          34 C.F.R. § 300.153
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 py-4 overflow-y-auto custom-scrollbar min-h-0 flex flex-col">
                      <textarea
                        value={activePage.content || ""}
                        onChange={(e) => handleUpdatePageContent(e.target.value)}
                        placeholder="Draft legal statement, factual narrative, or statutory citations here..."
                        style={{
                          lineHeight: lineSpacing === "2.0" ? "2" : lineSpacing === "1.5" ? "1.6" : "1.25",
                          fontSize: `${fontSize}pt`,
                          textAlign: textAlign,
                          fontWeight: isBold ? "bold" : "normal",
                          fontStyle: isItalic ? "italic" : "normal",
                          textDecoration: isUnderline ? "underline" : "none",
                          fontFamily: fontFamily === "serif" ? "'Playfair Display', Georgia, serif" :
                                      fontFamily === "times" ? "'Times New Roman', Times, serif" :
                                      fontFamily === "garamond" ? "'EB Garamond', Garamond, serif" :
                                      "Inter, system-ui, sans-serif"
                        }}
                        className="w-full flex-1 min-h-[350px] bg-transparent text-[#1A120A] resize-none focus:outline-none placeholder:text-[#8C7A60]/50"
                      />
                    </div>

                    <div className="pt-3 border-t border-[#8C7A60]/30 flex items-center justify-between text-[11px] font-serif text-[#6E5D43] shrink-0">
                      <span className="tracking-wide">Georgia Department of Education IDEA Complaint</span>
                      <span className="font-mono">Page {activePage.number} of {pages.length}</span>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Bottom Floating Control Bar (Admiralty Navy leather, aligned, zero overlap, rounded bottom) */}
            <div 
              className="px-6 sm:px-8 py-2 border-t border-[#1C3E6B]/80 bg-gradient-to-r from-[#031D42] via-[#062452] to-[#031D42] flex items-center justify-between gap-2.5 relative z-20 rounded-b-[18px] shadow-[inset_0_1px_0_rgba(147,197,253,0.18),0_-4px_14px_rgba(0,0,0,0.5)] overflow-x-auto [&::-webkit-scrollbar]:hidden"
              style={{
                backgroundImage: "url('/decor/folio-leather-texture.png')",
                backgroundRepeat: "repeat",
                backgroundSize: "220px",
              }}
            >
              {/* Top seam debossed groove */}
              <div 
                className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none"
                style={{
                  background: "linear-gradient(180deg, rgba(0,4,10,0.85) 0%, rgba(17,32,54,0.3) 100%)",
                  boxShadow: "0 1px 0 rgba(147,197,253,0.12)",
                }}
              />
              
              {/* Left: Pagination Controls: < 1 / 18 > */}
              <div className="flex items-center gap-1 bg-[#020F24]/90 border border-[#1E3B66]/80 rounded-md px-2 py-1 shadow-sm shrink-0">
                <button
                  type="button"
                  disabled={activePageIndex <= 0}
                  onClick={() => setActivePageId(pages[activePageIndex - 1].id)}
                  className="p-1 rounded hover:bg-white/[0.08] text-[#DFBE77] hover:text-[#FFF4D4] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-xs text-[#FFF4D4] px-2 font-medium">
                  {activePageIndex + 1} / {pages.length}
                </span>
                <button
                  type="button"
                  disabled={activePageIndex >= pages.length - 1}
                  onClick={() => setActivePageId(pages[activePageIndex + 1].id)}
                  className="p-1 rounded hover:bg-white/[0.08] text-[#DFBE77] hover:text-[#FFF4D4] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Next page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Center: View Mode Presets */}
              <div className="hidden md:flex items-center bg-[#020F24]/90 border border-[#1E3B66]/80 rounded-md p-0.5 shadow-sm text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("fit-width")}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer",
                    viewMode === "fit-width"
                      ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-xs"
                      : "text-[#C6B697] hover:text-[#FFF4D4]"
                  )}
                  title="Fit sheet to container width"
                >
                  Fit Width
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("fit-page")}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer",
                    viewMode === "fit-page"
                      ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-xs"
                      : "text-[#C6B697] hover:text-[#FFF4D4]"
                  )}
                  title="Show whole page inside viewport"
                >
                  Whole Page
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("actual")}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer",
                    viewMode === "actual"
                      ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-xs"
                      : "text-[#C6B697] hover:text-[#FFF4D4]"
                  )}
                  title="100% standard Letter paper size (8.5 x 11 in)"
                >
                  100% Letter
                </button>
              </div>

              {/* Right: Zoom & Focus & Panel Controls */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Index Toggle Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsIndexCollapsed(!isIndexCollapsed)}
                  className={cn(
                    "border-[#1E3B66]/80 text-xs h-7 px-2 sm:px-2.5 gap-1.5 cursor-pointer shadow-sm rounded-md transition-colors",
                    isIndexCollapsed 
                      ? "bg-[#020F24]/90 text-[#D8C7A5] hover:text-[#FFF4D4]" 
                      : "bg-[#082347] text-[#FFF4D4] border-[#386299]"
                  )}
                  title={isIndexCollapsed ? "Show Index" : "Hide Index"}
                >
                  <BookOpen className="w-3 h-3 text-[#DFBE77]" />
                  <span className="hidden sm:inline">{isIndexCollapsed ? "Index" : "Hide Index"}</span>
                </Button>

                {/* Tools Toggle Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsToolsCollapsed(!isToolsCollapsed)}
                  className={cn(
                    "border-[#1E3B66]/80 text-xs h-7 px-2 sm:px-2.5 gap-1.5 cursor-pointer shadow-sm rounded-md transition-colors",
                    isToolsCollapsed 
                      ? "bg-[#020F24]/90 text-[#D8C7A5] hover:text-[#FFF4D4]" 
                      : "bg-[#082347] text-[#FFF4D4] border-[#386299]"
                  )}
                  title={isToolsCollapsed ? "Show Tools" : "Hide Tools"}
                >
                  <LayoutGrid className="w-3 h-3 text-[#DFBE77]" />
                  <span className="hidden sm:inline">{isToolsCollapsed ? "Tools" : "Hide Tools"}</span>
                </Button>

                <div className="flex items-center bg-[#020F24]/90 border border-[#1E3B66]/80 rounded-md px-1.5 py-0.5 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
                    className="p-1 rounded hover:bg-white/[0.08] text-[#C6B697] hover:text-[#FFF4D4] cursor-pointer"
                    title="Zoom out"
                  >
                    <ZoomOut className="w-3 h-3" />
                  </button>
                  <span className="font-mono text-xs text-[#FFF4D4] px-1.5 sm:px-2 font-medium">
                    {zoomLevel}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
                    className="p-1 rounded hover:bg-white/[0.08] text-[#C6B697] hover:text-[#FFF4D4] cursor-pointer"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFocusMode(!isFocusMode)}
                  className="border-[#1E3B66]/80 bg-[#020F24]/90 text-[#D8C7A5] hover:text-[#FFF4D4] text-xs h-7 px-2 sm:px-2.5 gap-1.5 cursor-pointer shadow-sm rounded-md"
                >
                  {isFocusMode ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                  <span className="hidden sm:inline">Focus mode</span>
                </Button>
              </div>

            </div>

            {/* Brass Corner Brackets in front covering editorial box corners */}
            <FolioBoxCornerBrackets size={36} />
          </main>

          {/* ── RIGHT COLUMN: Cover tools Panel (matching reference mockup) ── */}
          {!isFocusMode && !isToolsCollapsed && (
            <aside 
              className="w-44 lg:w-48 xl:w-52 shrink-0 flex flex-col justify-between rounded-[18px] border border-[#3A2C18] bg-[#03152E]/95 shadow-2xl relative p-2.5 before:absolute before:inset-[4px] before:border before:border-dashed before:border-[#263E63]/50 before:rounded-[14px] before:pointer-events-none before:z-10"
              style={{
                backgroundImage: "url('/decor/folio-leather-texture.png')",
                backgroundRepeat: "repeat",
                backgroundSize: "200px",
              }}
            >
              <div className="space-y-3 relative z-20 pt-6 px-1">
                {/* Header: Cover tools with collapse chevron */}
                <div className="flex items-center justify-between pb-2 border-b border-[#3A2C18]">
                  <h3 className="font-serif text-sm font-bold text-[#FFF4D4]">
                    Cover tools
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsToolsCollapsed(true)}
                    className="text-[#C6B697] hover:text-[#FFF4D4] p-1 rounded hover:bg-white/[0.05] transition-colors cursor-pointer"
                    title="Collapse cover tools"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* 4 Shallow Rectangular Parchment Plates */}
                <div className="space-y-2.5">
                  {/* Plate 1: Edit cover details */}
                  <button
                    type="button"
                    onClick={() => setIsEditCoverModalOpen(true)}
                    style={{
                      backgroundImage: "url('/decor/fine-parchment.jpg')",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                    className="h-11 px-3.5 w-full flex items-center justify-between rounded-md border border-[#BCA062]/80 text-[#1A1005] shadow-[0_2px_5px_rgba(0,0,0,0.45),0_1px_1px_rgba(0,0,0,0.25)] transition-all cursor-pointer group hover:brightness-105"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-[#4A3515] group-hover:scale-105 transition-transform" />
                      <span className="text-xs font-serif font-bold tracking-tight">Edit cover details</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#7A5C28] group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Plate 2: Choose template */}
                  <button
                    type="button"
                    onClick={() => setIsTemplateModalOpen(true)}
                    style={{
                      backgroundImage: "url('/decor/fine-parchment.jpg')",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                    className="h-11 px-3.5 w-full flex items-center justify-between rounded-md border border-[#BCA062]/80 text-[#1A1005] shadow-[0_2px_5px_rgba(0,0,0,0.45),0_1px_1px_rgba(0,0,0,0.25)] transition-all cursor-pointer group hover:brightness-105"
                  >
                    <div className="flex items-center gap-2.5">
                      <LayoutGrid className="w-4 h-4 text-[#4A3515] group-hover:scale-105 transition-transform" />
                      <span className="text-xs font-serif font-bold tracking-tight">Choose template</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#7A5C28] group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Plate 3: Add logo / Remove logo */}
                  <button
                    type="button"
                    onClick={() => {
                      setCaseDetails((prev) => ({ ...prev, showLogo: !prev.showLogo }));
                      toast.success(caseDetails.showLogo ? "Logo removed from cover" : "Logo added to cover");
                    }}
                    style={{
                      backgroundImage: "url('/decor/fine-parchment.jpg')",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                    className="h-11 px-3.5 w-full flex items-center justify-between rounded-md border border-[#BCA062]/80 text-[#1A1005] shadow-[0_2px_5px_rgba(0,0,0,0.45),0_1px_1px_rgba(0,0,0,0.25)] transition-all cursor-pointer group hover:brightness-105"
                  >
                    <div className="flex items-center gap-2.5">
                      <ImageIcon className="w-4 h-4 text-[#4A3515] group-hover:scale-105 transition-transform" />
                      <span className="text-xs font-serif font-bold tracking-tight">
                        {caseDetails.showLogo ? "Remove logo" : "Add logo"}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#7A5C28] group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Plate 4: Submission details */}
                  <button
                    type="button"
                    onClick={() => setIsEditCoverModalOpen(true)}
                    style={{
                      backgroundImage: "url('/decor/fine-parchment.jpg')",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                    className="h-11 px-3.5 w-full flex items-center justify-between rounded-md border border-[#BCA062]/80 text-[#1A1005] shadow-[0_2px_5px_rgba(0,0,0,0.45),0_1px_1px_rgba(0,0,0,0.25)] transition-all cursor-pointer group hover:brightness-105"
                  >
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-[#4A3515] group-hover:scale-105 transition-transform" />
                      <span className="text-xs font-serif font-bold tracking-tight">Submission details</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#7A5C28] group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Bottom Gold Plaque: Open Complaint Compiler */}
              <div className="pt-3 border-t border-[#3A2C18]/80 mt-auto relative z-20">
                <button
                  type="button"
                  onClick={() => setIsCompilerModalOpen(true)}
                  style={{
                    background: "linear-gradient(180deg, #FDF0C8 0%, #E6C577 26%, #C79E48 70%, #9E7428 100%)",
                  }}
                  className="h-11 px-3.5 w-full flex items-center justify-between rounded-md text-[#1A1005] font-serif font-bold border-[1.5px] border-[#FFE59E] shadow-[0_3px_10px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.75)] hover:brightness-105 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <FileSignature className="w-4 h-4 text-[#1A1005]" />
                    <span className="text-xs">Open Complaint Compiler</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#1A1005] group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* Brass Corner Brackets in front */}
              <FolioBoxCornerBrackets size={32} />
            </aside>
          )}
        </div>

        {/* ── MODALS ──────────────────────────────────────────────────────── */}
        
        {/* 1. Edit Cover Details Modal */}
        <Dialog open={isEditCoverModalOpen} onOpenChange={setIsEditCoverModalOpen}>
          <DialogContent className="max-w-md bg-[#05142B] border border-[#3A2C18] text-white shadow-2xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-lg text-[#FFF4D4]">
                Edit Cover Sheet Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3.5 py-2 text-xs">
              <div>
                <Label className="text-[#C6B697]">Student Full Legal Name</Label>
                <Input
                  value={caseDetails.studentName}
                  onChange={(e) => handleQuickFieldUpdate("studentName", e.target.value)}
                  className="bg-[#020A17] border-[#3A2C18] text-white mt-1 h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[#C6B697]">Date of Birth</Label>
                  <Input
                    placeholder="YYYY-MM-DD"
                    value={caseDetails.studentDob}
                    onChange={(e) => handleQuickFieldUpdate("studentDob", e.target.value)}
                    className="bg-[#020A17] border-[#3A2C18] text-white mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[#C6B697]">Current Grade</Label>
                  <Input
                    value={caseDetails.grade}
                    onChange={(e) => handleQuickFieldUpdate("grade", e.target.value)}
                    className="bg-[#020A17] border-[#3A2C18] text-white mt-1 h-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-[#C6B697]">Assigned School</Label>
                <Input
                  placeholder="e.g. Wheeler High School"
                  value={caseDetails.school}
                  onChange={(e) => handleQuickFieldUpdate("school", e.target.value)}
                  className="bg-[#020A17] border-[#3A2C18] text-white mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-[#C6B697]">School District (LEA)</Label>
                <Input
                  value={caseDetails.district}
                  onChange={(e) => handleQuickFieldUpdate("district", e.target.value)}
                  className="bg-[#020A17] border-[#3A2C18] text-white mt-1 h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-[#C6B697]">Parent / Complainant Name</Label>
                <Input
                  placeholder="e.g. Sarah Jenkins"
                  value={caseDetails.parentName}
                  onChange={(e) => handleQuickFieldUpdate("parentName", e.target.value)}
                  className="bg-[#020A17] border-[#3A2C18] text-white mt-1 h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[#C6B697]">Prepared By</Label>
                  <Input
                    value={caseDetails.preparedBy}
                    onChange={(e) => handleQuickFieldUpdate("preparedBy", e.target.value)}
                    className="bg-[#020A17] border-[#3A2C18] text-white mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[#C6B697]">Submission Date</Label>
                  <Input
                    placeholder="e.g. October 15, 2026"
                    value={caseDetails.submissionDate}
                    onChange={(e) => handleQuickFieldUpdate("submissionDate", e.target.value)}
                    className="bg-[#020A17] border-[#3A2C18] text-white mt-1 h-8 text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#3A2C18] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-[#C6B697] cursor-pointer" htmlFor="cover-logo-toggle">
                    Display Waypoint Logo on Cover
                  </Label>
                </div>
                <button
                  type="button"
                  id="cover-logo-toggle"
                  onClick={() => setCaseDetails((prev) => ({ ...prev, showLogo: !prev.showLogo }))}
                  className={cn(
                    "px-2.5 py-1 rounded text-[11px] font-semibold transition-all border cursor-pointer",
                    caseDetails.showLogo
                      ? "bg-[#C5A059] text-[#07162B] border-[#FFE394]"
                      : "bg-[#020A17] text-[#8C7A60] border-[#3A2C18]"
                  )}
                >
                  {caseDetails.showLogo ? "Logo Visible" : "Logo Hidden"}
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditCoverModalOpen(false);
                    setIsTemplateModalOpen(true);
                  }}
                  className="flex-1 border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#07162B] text-xs h-7 gap-1.5 cursor-pointer"
                >
                  <LayoutGrid className="w-3 h-3 text-[#DFBE77]" />
                  <span>Choose Template</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditCoverModalOpen(false);
                    setIsCompilerModalOpen(true);
                  }}
                  className="flex-1 border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#07162B] text-xs h-7 gap-1.5 cursor-pointer"
                >
                  <FileSignature className="w-3 h-3 text-[#DFBE77]" />
                  <span>Compiler Tool</span>
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  setIsEditCoverModalOpen(false);
                  toast.success("Cover sheet details saved");
                }}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-8"
              >
                Apply Details
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 2. Choose Template Modal */}
        <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
          <DialogContent className="max-w-lg bg-[#05142B] border border-[#3A2C18] text-white shadow-2xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-lg text-[#FFF4D4]">
                Select State Complaint Template
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2.5 py-2">
              <div 
                onClick={() => {
                  setIsTemplateModalOpen(false);
                  toast.success("Georgia DOE Standard IDEA template loaded");
                }}
                className="p-3.5 rounded-lg border border-[#C5A059]/60 bg-[#020A17] hover:bg-[#07162B] cursor-pointer transition-all flex items-start gap-3"
              >
                <FileSignature className="w-5 h-5 text-[#DFBE77] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-serif font-bold text-[#FFF4D4]">Georgia DOE Standard IDEA Complaint</h4>
                  <p className="text-[11px] text-[#C6B697] mt-0.5">Complies with Ga. Comp. R. & Regs. 160-4-7-.12 with one-year statutory lookback.</p>
                </div>
              </div>

              <div 
                onClick={() => {
                  setIsTemplateModalOpen(false);
                  toast.success("Service implementation failure template loaded");
                }}
                className="p-3.5 rounded-lg border border-[#3A2C18] bg-[#020A17] hover:bg-[#07162B] cursor-pointer transition-all flex items-start gap-3"
              >
                <Clock className="w-5 h-5 text-[#DFBE77] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-serif font-bold text-[#FFF4D4]">Service Deprivation & Compensatory Education</h4>
                  <p className="text-[11px] text-[#C6B697] mt-0.5">Specialized schedule tracking missed therapy hours, staff shortages, and 1:1 tutoring recovery.</p>
                </div>
              </div>

              <div 
                onClick={() => {
                  setIsTemplateModalOpen(false);
                  toast.success("Child Find & Evaluation delay template loaded");
                }}
                className="p-3.5 rounded-lg border border-[#3A2C18] bg-[#020A17] hover:bg-[#07162B] cursor-pointer transition-all flex items-start gap-3"
              >
                <Scale className="w-5 h-5 text-[#DFBE77] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-serif font-bold text-[#FFF4D4]">Child Find & Evaluation Timeline Denial</h4>
                  <p className="text-[11px] text-[#C6B697] mt-0.5">60-day statutory timeline breach with independent evaluation request.</p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 3. Add Custom Page / Exhibit Modal */}
        <Dialog open={isAddPageModalOpen} onOpenChange={setIsAddPageModalOpen}>
          <DialogContent className="max-w-md bg-[#05142B] border border-[#3A2C18] text-white shadow-2xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-lg text-[#FFF4D4]">
                Add Document Page or Exhibit
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div>
                <Label className="text-[#C6B697]">Page Title</Label>
                <Input
                  placeholder="e.g. Exhibit D (Medical Evaluation)"
                  value={newPageTitle}
                  onChange={(e) => setNewPageTitle(e.target.value)}
                  className="bg-[#020A17] border-[#3A2C18] text-white mt-1 h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[#C6B697]">Page Type</Label>
                <select
                  value={newPageCategory}
                  onChange={(e) => setNewPageCategory(e.target.value as any)}
                  className="w-full bg-[#020A17] border border-[#3A2C18] text-white rounded-md mt-1 h-8 px-2 text-xs"
                >
                  <option value="exhibit">Exhibit Document</option>
                  <option value="facts">Statement of Facts</option>
                  <option value="violations">Legal Violations</option>
                  <option value="remedies">Remedies & Compensatory Calculation</option>
                  <option value="pleading">Formal Pleading Section</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={handleAddPage}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-8"
              >
                Insert Page
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 4. Complaint Compiler Modal */}
        <Dialog open={isCompilerModalOpen} onOpenChange={setIsCompilerModalOpen}>
          <DialogContent className="max-w-lg bg-[#05142B] border border-[#3A2C18] text-white shadow-2xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-lg text-[#FFF4D4] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#DFBE77]" />
                Complaint Compiler & Readiness Audit
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-lg bg-[#020A17] border border-emerald-500/30 flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Statutory 1-year filing window verified for Georgia DOE.</span>
              </div>
              <div className="p-3 rounded-lg bg-[#020A17] border border-[#3A2C18] space-y-1.5 text-[#C6B697]">
                <div className="flex justify-between text-white font-medium">
                  <span>Packet Assembly Status:</span>
                  <span className="text-[#DFBE77]">{pages.length} Pages Assembled</span>
                </div>
                <div>• Cover sheet formatted with LEA identifiers</div>
                <div>• 3 legal causes of action citing 34 C.F.R. and Georgia Rules</div>
                <div>• 3 attached documentary exhibits with evidentiary links</div>
                <div>• Compensatory education schedule quantified</div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  setIsCompilerModalOpen(false);
                  handleExportPdf();
                }}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-8 w-full"
              >
                Export Complete Filing Packet (PDF)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 5. Full Document Preview Modal */}
        <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-[#05142B] border border-[#3A2C18] text-white shadow-2xl custom-scrollbar p-6">
            <DialogHeader>
              <DialogTitle className="font-serif text-lg text-[#FFF4D4] flex items-center justify-between">
                <span>Georgia IDEA State Complaint Preview</span>
                <span className="text-xs text-[#C6B697] font-mono font-normal">{pages.length} Pages</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {pages.map((p) => (
                <div key={p.id} className="p-8 rounded-sm bg-[#F5EEDC] text-[#1A120A] font-serif shadow-md border border-[#D4C3A3]">
                  <div className="flex justify-between items-center pb-2 border-b border-[#8C7A60]/40 text-xs text-[#8C7A60] mb-4">
                    <span>{p.title}</span>
                    <span>Page {p.number}</span>
                  </div>
                  {p.id === "cover" ? (
                    <div className="text-center py-6">
                      <h3 className="font-serif font-bold tracking-widest uppercase text-xs">WAYPOINT ADVOCATES</h3>
                      <h2 className="font-serif font-black text-2xl uppercase mt-2">STATE COMPLAINT</h2>
                      <p className="text-xs italic mt-1">Submitted to the Georgia Department of Education</p>
                      <div className="my-6 text-left max-w-sm mx-auto text-xs space-y-1.5 font-medium">
                        <p><strong>Student:</strong> {caseDetails.studentName}</p>
                        <p><strong>Grade:</strong> {caseDetails.grade}</p>
                        <p><strong>District:</strong> {caseDetails.district}</p>
                        <p><strong>Prepared by:</strong> {caseDetails.preparedBy}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs leading-relaxed whitespace-pre-wrap">
                      {p.content}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={handleExportPdf}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-8"
              >
                Download & Print
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </ScopedErrorBoundary>
  );
}
