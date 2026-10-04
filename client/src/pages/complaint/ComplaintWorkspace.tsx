import React, { useState, useMemo, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import PageIdBadge from "@/components/PageIdBadge";
import { OrnateTabBracket } from "@/components/complaint/OrnateTabBracket";
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
  PanelRight,
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
  Quote,
  Cloud,
  Check,
  User,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { StateComplaintFormView } from "@/components/complaint/StateComplaintFormView";
import {
  SUPPORTED_STATE_FORMS,
  INITIAL_GADOE_FORM_STATE,
  detectStateCode,
  type OfficialComplaintFormState,
} from "@/components/complaint/stateFormsData";

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
  { 
    id: "cover", 
    number: "01", 
    title: "State Form", 
    category: "cover",
    content: "Official State Complaint Form — Georgia Department of Education Division for Special Education Services and Supports."
  },
  { 
    id: "clarity_control", 
    number: "02", 
    title: "Clarity Control Restatement", 
    category: "pleading", 
    content: `BEFORE THE GEORGIA DEPARTMENT OF EDUCATION
DIVISION FOR SPECIAL EDUCATION SERVICES AND SUPPORTS

IN RE: ALEXANDER, SHANDERIOUS JR.
STUDENT WITH A DISABILITY,
BY AND THROUGH PARENT / GUARDIAN,
    Complainant,

v.

COBB COUNTY SCHOOL DISTRICT,
    Local Educational Agency.
____________________________________________/

CLARITY CONTROL RESTATEMENT OF ISSUES & STATUTORY VIOLATIONS
UNDER 34 C.F.R. § 300.153 AND GA. COMP. R. & REGS. 160-4-7-.12

I. RESTATEMENT OF JURISDICTION & FILING TIMELINESS
Complainant files this Clarity Control Restatement on behalf of Alexander, Shanderious Jr., a 4th grade student eligible for special education and related services under the Individuals with Disabilities Education Act (IDEA), 20 U.S.C. § 1400 et seq.

This complaint is timely filed within the one-year statute of limitations provided by 34 C.F.R. § 300.153(c) and Ga. Comp. R. & Regs. 160-4-7-.12(2)(c). All violations alleged herein occurred within the preceding twelve-month period.

II. CLARITY CONTROL RESTATEMENT OF CAUSES OF ACTION

COUNT I: FAILURE TO IMPLEMENT OPERATIVE IEP SERVICES & DENIAL OF FAPE
(34 C.F.R. § 300.323(c)(2) · Ga. Comp. R. & Regs. 160-4-7-.06)
The District failed to implement Alexander's operative IEP as written by withholding mandated specialized reading instruction (240 minutes) and speech-language services, depriving the student of a Free Appropriate Public Education. (Supported by Exhibit A & Exhibit C).

COUNT II: FAILURE TO TIMELY RE-EVALUATE & AFFIRMATIVE CHILD FIND VIOLATION
(34 C.F.R. § 300.111, § 300.301 · Ga. Comp. R. & Regs. 160-4-7-.03)
The District ignored formal written parental requests for sensory and functional behavioral assessments, violating its affirmative statutory duty to evaluate in all suspected disability areas. (Supported by Exhibit B).

COUNT III: UNLAWFUL REFUSAL TO ISSUE TIMELY PRIOR WRITTEN NOTICE (PWN)
(34 C.F.R. § 300.503 · Ga. Comp. R. & Regs. 160-4-7-.14)
The District altered service delivery schedules and refused evaluation requests without providing written explanation or mandatory statutory justifications. (Supported by Exhibit C).

III. PROPOSED RESOLUTION & CORRECTIVE ACTIONS
1. Award 60 hours of 1-on-1 certified reading tutoring and 20 hours of speech therapy.
2. Fund an Independent Educational Evaluation (IEE) at public expense.
3. Order the IEP team to reconvene within 15 school days to integrate compensatory hours.
4. Mandate administrative training for school-based special education personnel.`
  },
  { 
    id: "chronological_summary", 
    number: "03", 
    title: "Chronological Summary", 
    category: "facts", 
    content: `CHRONOLOGICAL SUMMARY OF FACTS & TIMELINE

IN RE: ALEXANDER, SHANDERIOUS JR.
LOCAL EDUCATIONAL AGENCY: COBB COUNTY SCHOOL DISTRICT

A chronological summary of relevant events and factual milestones occurring within the one-year statutory filing period (October 2025 – October 2026):

1. AUGUST 28, 2025 — ANNUAL IEP CONVENED (EXHIBIT A)
The Cobb County School District IEP team convened to develop Alexander's operative 4th grade IEP. The IEP committed the District to 150 minutes weekly of specialized reading instruction in general education, 90 minutes weekly of pull-out reading intervention, and 60 minutes weekly of speech-language therapy.

2. OCTOBER 12, 2025 — FORMAL RE-EVALUATION REQUEST (EXHIBIT B)
Documented academic regression and sensory dysregulation prompted Parent to deliver a formal written request for comprehensive psychoeducational and sensory evaluations to the LEA Special Education Lead via timestamped email at 8:42 AM.

3. OCTOBER 26, 2025 — EXPIRATION OF STATUTORY TIMELINE WITHOUT CONSENT
The District failed to provide an evaluation consent form or Prior Written Notice explaining refusal within the mandatory statutory window, violating 34 C.F.R. § 300.300.

4. NOVEMBER 1, 2025 TO JANUARY 15, 2026 — SERVICE DELIVERY WITHHOLDING (EXHIBIT C)
District service logs demonstrate that Alexander missed 18 scheduled specialized reading intervention sessions (totaling 27 hours) without notice, make-up scheduling, or compensatory plan.

5. DECEMBER 12, 2025 — CASE MANAGER ADMISSION OF STAFF SHORTAGES
In written correspondence, the school case manager acknowledged staff shortages and confirmed that intervention minutes were not delivered as stipulated in Section 6 of the IEP.

6. MARCH 3, 2026 — FORMAL DISPUTE NOTICE
Parent notified district administration of ongoing service deprivation and requested immediate compensatory scheduling, which the District failed to provide.`
  },
  { 
    id: "exhibit_index", 
    number: "04", 
    title: "Exhibit Index", 
    category: "pleading", 
    content: `FORMAL STATE COMPLAINT — EXHIBIT INDEX & DOCUMENT SCHEDULE

BEFORE THE GEORGIA DEPARTMENT OF EDUCATION
DIVISION FOR SPECIAL EDUCATION SERVICES AND SUPPORTS

STUDENT: ALEXANDER, SHANDERIOUS JR.
AGENCY: COBB COUNTY SCHOOL DISTRICT

================================================================================
TABLE OF COMPLAINT FILING SECTIONS:
================================================================================
  1. STATE FORM: Official GaDOE Formal State Complaint Filing Document
  2. CLARITY CONTROL RESTATEMENT: Restatement of Issues, Allegations & Legal Authorities
  3. CHRONOLOGICAL SUMMARY: Statement of Facts, Chronological Timeline & Milestones
  4. EXHIBIT INDEX: Master Evidentiary Schedule (This Page)
  5. EXHIBIT A: Student's Operative IEP (Individualized Education Program)

================================================================================
MASTER INDEX OF DOCUMENTARY EXHIBITS ATTACHED:
================================================================================

EXHIBIT A: STUDENT'S OPERATIVE IEP
• Document: Operative Annual Individualized Education Program (IEP)
• Date: August 28, 2025 · Author: Cobb County School District IEP Team
• Relevant Pages: Pages 4–8 (Service Delivery Schedule & Accommodations)
• Evidentiary Purpose: Establishes binding baseline of 240 weekly reading minutes and 60 minutes speech therapy.
• Supports: Count I (Failure to Implement Operative IEP Services / Denial of FAPE).

EXHIBIT B: EVALUATIONS & PARENT WRITTEN REQUESTS
• Document: Psychoeducational Evaluation & Formal Parent Re-Evaluation Request Letter
• Date: October 12, 2025 (timestamped delivery 8:42 AM)
• Evidentiary Purpose: Verifies written notice of emerging sensory deficits and triggers 60-day statutory timeline.
• Supports: Count II (Failure to Timely Evaluate & Child Find Violation).

EXHIBIT C: DISTRICT CORRESPONDENCE, PWN & SERVICE LOGS
• Document: Special Education Service Delivery Logs & Email Correspondence
• Date: November 1, 2025 – January 15, 2026
• Evidentiary Purpose: Documentary proof of 18 missed sessions and written admission of staff shortages.
• Supports: Count I & Count III (Prior Written Notice Omission).

Exhibit files are attached behind this index in labeled alphabetical order.`
  },
  { 
    id: "exhibit_a", 
    number: "05", 
    title: "Exhibit A (Student's IEP)", 
    category: "exhibit", 
    exhibitTag: "Exhibit A", 
    content: `EXHIBIT A: OPERATIVE INDIVIDUALIZED EDUCATION PROGRAM (IEP)

DOCUMENT DETAILS:
• Student: Alexander, Shanderious Jr.
• Document Date: August 28, 2025
• Author: Cobb County School District IEP Team
• Relevant Pages: Pages 4-8 (Service Delivery Schedule & Accommodations)

SUMMARY OF EXHIBIT EVIDENCE:
This document establishes the binding commitment made by Cobb County School District to provide 150 minutes weekly of specialized reading instruction and 60 minutes weekly of speech therapy.

This exhibit substantiates the service standard against which the District's implementation failure is proven in the Chronological Summary and Clarity Control Restatement.`
  },
  { 
    id: "exhibit_b", 
    number: "06", 
    title: "Exhibit B (Evaluations)", 
    category: "exhibit", 
    exhibitTag: "Exhibit B", 
    content: `EXHIBIT B: PSYCHOEDUCATIONAL EVALUATION & PARENT REQUESTS

DOCUMENT DETAILS:
• Initial Evaluation Report: September 14, 2023
• Formal Parent Re-evaluation Request Letter: October 12, 2025
• Delivery Confirmation: Email timestamped 8:42 AM to Special Education Lead

SUMMARY OF EXHIBIT EVIDENCE:
Proves written notification to LEA of emerging sensory deficits and establishes the start of statutory timelines for evaluation consent.`
  },
  { 
    id: "exhibit_c", 
    number: "07", 
    title: "Exhibit C (Communications)", 
    category: "exhibit", 
    exhibitTag: "Exhibit C", 
    content: `EXHIBIT C: DISTRICT CORRESPONDENCE & SERVICE LOGS

DOCUMENT DETAILS:
• Service Delivery Log: November 2025 – January 2026
• Email Chain between Parent and Case Manager: November 18, 2025 – December 12, 2025

SUMMARY OF EXHIBIT EVIDENCE:
Documentary proof showing 18 missed sessions without compensatory make-up time and admission from case manager acknowledging staff shortages.`
  },
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
  state?: string;
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
        isLeft ? "left-0" : "right-0"
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
        "absolute -left-[12px] top-1/2 -translate-y-1/2 pointer-events-none z-30 flex items-center justify-center"
      )}
    >
      <OrnateTabBracket isActive={isActive} height={42} />
    </div>
  );
}

// ── Miniature Page Facsimile Preview (Actual Micro Document Replica) ────────
function MiniaturePagePreview({
  page,
  caseDetails,
  isActive,
}: {
  page: DocumentPage;
  caseDetails: ComplaintCaseDetails;
  isActive?: boolean;
}) {
  const isCover = page.category === "cover" || page.id === "cover";

  return (
    <div
      className={cn(
        "w-[42px] h-[56px] rounded-[2px] p-[1px] shadow-[0_1.5px_4px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.9)] border shrink-0 relative overflow-hidden transition-all duration-200 select-none",
        isActive
          ? "bg-[#FFFDF8] border-[#8C6D2B] ring-1 ring-[#FFE394]/70 shadow-[0_2px_8px_rgba(255,215,100,0.45),0_1.5px_4px_rgba(0,0,0,0.5)] scale-[1.03]"
          : "bg-[#FAF5E8] border-[#A88A4C]/80 group-hover:border-[#8C6D2B] group-hover:shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
      )}
      style={{
        backgroundImage: "url('/decor/fine-parchment.jpg')",
        backgroundSize: "cover",
      }}
    >
      {/* Scaled-down real document facsimile content */}
      {isCover ? (
        <div className="w-[190px] h-[250px] p-2 flex flex-col justify-between text-[#1A1A1A] font-sans select-none pointer-events-none origin-top-left scale-[0.22] bg-white">
          {/* Micro GaDOE Form Header */}
          <div className="border-b border-slate-700 pb-1 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#3E9B34] font-sans tracking-tight">
                Ga<span className="text-[#D62B28]">DOE</span>
              </span>
              <span className="text-[7px] text-slate-600 font-bold uppercase">
                {caseDetails.state || "GA"} Form
              </span>
            </div>
            <div className="text-[7.5px] font-bold text-slate-900 leading-tight mt-0.5">
              Special Education Formal Complaint Form
            </div>
            <div className="text-[6.5px] text-[#D62B28] font-semibold">
              Georgia Dept. of Education
            </div>
          </div>

          {/* Form fields micro preview */}
          <div className="space-y-1 my-auto py-1 text-left">
            <div className="text-[7px] text-slate-700 truncate">
              <span className="font-bold">Agency:</span> {caseDetails.district || "School District"}
            </div>
            <div className="text-[7.5px] text-slate-900 font-bold truncate">
              {caseDetails.studentName || "Student Record"}
            </div>
            <div className="text-[6.5px] text-slate-600 truncate">
              School: {caseDetails.school || "Assigned School"}
            </div>
            <div className="border border-slate-300 p-1 bg-slate-50 rounded-xs text-[5.5px] text-slate-600 line-clamp-2">
              *Statement of Alleged Violations (34 C.F.R. § 300.153)
            </div>
          </div>

          {/* Footer */}
          <div className="text-[6.5px] flex justify-between items-center text-slate-500 border-t border-slate-300 pt-0.5">
            <span>Georgia State Form</span>
            <span className="font-mono font-bold">p.01</span>
          </div>
        </div>
      ) : (
        <div className="w-[190px] h-[250px] p-2 flex flex-col justify-between text-[#1A120A] font-serif select-none pointer-events-none origin-top-left scale-[0.22]">
          {/* Real Section Title */}
          <div className="border-b border-[#3A2810]/40 pb-0.5">
            <div className="flex justify-between items-center text-[7.5px] text-[#5A4528]">
              <span className="font-bold uppercase tracking-wider text-[#0B1E38] truncate max-w-[130px]">
                {page.title}
              </span>
              <span className="font-mono font-bold text-[8.5px] text-[#6A5230]">
                p.{page.number}
              </span>
            </div>
          </div>

          {/* Real Body Paragraph Text */}
          <div className="flex-1 overflow-hidden my-1">
            <p className="text-[7px] text-[#2A1D0E] leading-[9.5px] line-clamp-[18] whitespace-pre-line font-serif text-justify">
              {(page.content || "").trim() || "No text entered for this section..."}
            </p>
          </div>

          {/* Real Page Number Footer */}
          <div className="flex justify-between items-center border-t border-[#3A2810]/30 pt-0.5 text-[6.5px] text-[#6A5230] font-sans">
            <span className="truncate max-w-[120px]">Waypoint Advocates</span>
            <span className="font-mono font-bold">p.{page.number}</span>
          </div>
        </div>
      )}

      {/* Subtle corner dog-ear highlight */}
      <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-gradient-to-bl from-amber-200/60 to-transparent pointer-events-none" />
    </div>
  );
}

// ── Main Component: PG-020 State Complaint Builder ───────────────────────────
export default function ComplaintWorkspace() {
  const params = useParams<{ id?: string; section?: string }>();
  const [location, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  // CRM Contacts for Student Selection & Auto-fill
  const contactsQuery = trpc.contacts.list.useQuery();

  // State: Case Data
  const [caseDetails, setCaseDetails] = useState<ComplaintCaseDetails>({
    studentName: "Alexander, Shanderious Jr.",
    studentDob: "04/12/2015",
    grade: "4th grade",
    school: "Clarkdale Elementary School",
    district: "Cobb County School District",
    parentName: "Parent / Guardian",
    preparedBy: "Waypoint Advocates",
    submissionDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    showLogo: true,
    state: "GA",
  });

  // State: Official State Complaint Form State (defaults to Georgia GaDOE)
  const [officialFormState, setOfficialFormState] = useState<OfficialComplaintFormState>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`complaint_form_state_${params?.id || "active"}`);
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return INITIAL_GADOE_FORM_STATE;
  });

  // Apply a CRM student record to the complaint workspace and official form
  const applyStudentToComplaint = (student: any) => {
    const sName = `${student.firstName || ""} ${student.lastName || ""}`.trim();
    const stateCode = detectStateCode(student.state);
    const districtName =
      student.countyDistrict ||
      (student.company?.includes("District") ? student.company : "") ||
      "Cobb County School District";

    setComplaintTitle(`State Complaint – ${student.lastName || sName || "Student"}`);

    setCaseDetails((prev) => ({
      ...prev,
      studentName: sName || prev.studentName,
      studentDob: student.dateOfBirth || prev.studentDob,
      grade: student.gradeLevel || prev.grade,
      school: student.schoolName || prev.school,
      district: districtName,
      state: stateCode,
    }));

    setOfficialFormState((prev) => ({
      ...prev,
      stateCode: stateCode,
      publicAgency: districtName,
      studentName: sName || prev.studentName,
      studentDob: student.dateOfBirth || prev.studentDob,
      studentAddress: student.address || prev.studentAddress,
      studentCity: student.city || prev.studentCity,
      studentState: student.state ? (student.state.length === 2 ? student.state.toUpperCase() : "GA") : "GA",
      studentZip: student.zipCode || prev.studentZip,
      currentSchool: student.schoolName || prev.currentSchool,
      grade: student.gradeLevel || prev.grade,
      studentGtid: student.caseId || prev.studentGtid,
    }));

    if (student.parentContactId && contactsQuery.data) {
      const parent = contactsQuery.data.find((c) => c.id === student.parentContactId);
      if (parent) {
        const pName = `${parent.firstName || ""} ${parent.lastName || ""}`.trim();
        setOfficialFormState((prev) => ({
          ...prev,
          parentName: pName || prev.parentName,
          parentAddress: parent.address || prev.parentAddress,
          parentCity: parent.city || prev.parentCity,
          parentState: parent.state || "GA",
          parentZip: parent.zipCode || prev.parentZip,
          parentPhone: parent.phone || prev.parentPhone,
          parentEmail: parent.email || prev.parentEmail,
        }));
      }
    }

    toast.success(`Loaded ${sName}'s record into ${SUPPORTED_STATE_FORMS[stateCode]?.name || "Georgia"} State Complaint Form`);
  };

  // Auto-detect student from URL query (?studentId=... or ?contactId=... or params.id)
  const isAutoLoaded = useRef(false);
  useEffect(() => {
    if (isAutoLoaded.current || !contactsQuery.data?.length) return;
    const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const qId = searchParams?.get("studentId") || searchParams?.get("contactId") || params?.id;
    if (qId) {
      const matched = contactsQuery.data.find(
        (c) => String(c.id) === String(qId) || c.caseId === qId
      );
      if (matched) {
        isAutoLoaded.current = true;
        applyStudentToComplaint(matched);
      }
    }
  }, [contactsQuery.data, params?.id]);

  // State: Pages and Active Navigation
  const [pages, setPages] = useState<DocumentPage[]>(DEFAULT_PAGES);
  const [activePageId, setActivePageId] = useState<string>("cover");
  const [activeToolbarTab, setActiveToolbarTab] = useState<"edit" | "arrange" | "cover" | "insert" | "compile">("cover");

  // State: Viewport, Proportional View Mode, Zoom, and Collapsible Panels
  const [viewMode, setViewMode] = useState<"fit-width" | "fit-page" | "actual">("fit-width");
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [isIndexCollapsed, setIsIndexCollapsed] = useState<boolean>(false);
  const [isToolsCollapsed, setIsToolsCollapsed] = useState<boolean>(true);
  const [lastSavedText, setLastSavedText] = useState<string>("Auto-saved just now");
  const [complaintTitle, setComplaintTitle] = useState<string>("State Complaint – Alexander");
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);

  // State: Resizable Packet Index Width with Draggable Right Edge
  const [indexWidth, setIndexWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("complaint_index_width");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 160 && parsed <= 420) return parsed;
      }
    }
    return 208; // compact, elegant default width
  });
  const [isResizingIndex, setIsResizingIndex] = useState(false);
  const indexAsideRef = useRef<HTMLElement>(null);

  // Mouse drag event listeners for resizing Packet Index
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingIndex) return;
      const asideLeft = indexAsideRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = Math.round(e.clientX - asideLeft);
      if (newWidth >= 160 && newWidth <= 440) {
        setIndexWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      if (isResizingIndex) {
        setIsResizingIndex(false);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("complaint_index_width", indexWidth.toString());
          } catch (e) {}
        }
      }
    };
    if (isResizingIndex) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizingIndex, indexWidth]);

  // State: Google Docs Typography & Writing Settings
  const [fontFamily, setFontFamily] = useState<"serif" | "times" | "garamond" | "sans">("serif");
  const [fontSize, setFontSize] = useState<number>(12); // pt
  const [lineSpacing, setLineSpacing] = useState<"1.15" | "1.5" | "2.0">("1.5");
  const [textAlign, setTextAlign] = useState<"left" | "justify" | "center">("justify");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  // Auto-save effect: automatically persists complaint draft on any change
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setLastSavedText("Saving changes...");
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          `complaint_draft_${params?.id || "active"}`,
          JSON.stringify({
            complaintTitle,
            caseDetails,
            pages,
            savedAt: new Date().toISOString(),
          })
        );
        localStorage.setItem(
          `complaint_form_state_${params?.id || "active"}`,
          JSON.stringify(officialFormState)
        );
      } catch (e) {
        // storage quota fallback
      }
      setLastSavedText("Auto-saved just now");
    }, 1000);
    return () => clearTimeout(timer);
  }, [pages, caseDetails, officialFormState, complaintTitle, params?.id]);

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

  // Safe back navigation to student profile
  const handleSafeBackToProfile = () => {
    setLastSavedText("Draft saved just now");
    toast.success("State Complaint draft safely saved. Returning to student profile...");

    const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const queryStudentId = searchParams?.get("studentId") || searchParams?.get("contactId");
    const sessionUrl = typeof window !== "undefined" ? sessionStorage.getItem("lastStudentProfileUrl") : null;
    const sessionId = typeof window !== "undefined" ? sessionStorage.getItem("lastStudentProfileId") : null;

    let dest = "/students";
    if (sessionUrl) {
      dest = sessionUrl;
    } else if (params.id) {
      dest = `/students/${params.id}`;
    } else if (queryStudentId) {
      dest = `/students/${queryStudentId}`;
    } else if (sessionId) {
      dest = `/students/${sessionId}`;
    }

    navigate(dest);
  };

  return (
    <ScopedErrorBoundary moduleName="State Complaint Builder">
      <div 
        className="relative flex flex-col h-[calc(100vh-0px)] w-full overflow-hidden bg-[#020B1A] text-slate-100 select-none"
        style={{
          backgroundColor: "#020B1A",
          backgroundImage: "radial-gradient(ellipse at 50% 0%, #0A2244 0%, #041224 60%, #020814 100%)",
        }}
      >

        {/* ── TOP HEADER BAR (Executive Maritime Hardwood Rail) ─────────────── */}
        <header 
          className="relative z-30 flex items-center justify-between px-4 sm:px-6 h-[58px] min-h-[58px] w-full border-b border-[#05142B] shadow-[0_6px_20px_rgba(0,0,0,0.65)] overflow-hidden select-none"
          style={{
            backgroundImage: "linear-gradient(180deg, rgba(14, 48, 96, 0.45) 0%, rgba(10, 36, 74, 0.5) 100%), url('/decor/rail-wood-grain.png')",
            backgroundRepeat: "no-repeat, repeat-x",
            backgroundSize: "100% 100%, auto 58px",
            backgroundColor: "#0C2E5C",
            boxShadow: "0 6px 20px rgba(0,0,0,0.6)",
          }}
        >
          {/* Bottom carved wood bevel and brass seam */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none"
            style={{
              background: "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(197,160,89,0.55) 100%)",
              boxShadow: "0 1px 0 rgba(0,0,0,0.5)",
            }}
          />

          {/* Left: Safe Back to Profile + Divider + Page ID badge */}
          <div className="flex items-center gap-3 min-w-0 sm:min-w-[180px] md:min-w-[240px]">
            <button
              type="button"
              onClick={handleSafeBackToProfile}
              className="group flex flex-col items-center justify-center text-left py-0.5 px-1 hover:opacity-95 transition-all cursor-pointer select-none"
              title="Safely save draft and return to student case profile"
            >
              <span className="font-serif text-[15px] sm:text-[16px] text-[#FFF4D4] font-normal tracking-wide group-hover:text-[#FFE394] transition-colors leading-tight">
                Back to Profile
              </span>
              {/* Curved gold return arrow matching user reference */}
              <svg
                viewBox="0 0 20 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-2.5 text-[#DFBE77] mt-0.5 group-hover:text-[#FFE394] group-hover:-translate-x-0.5 transition-all"
              >
                <path d="M 5 2 L 1 6 L 5 10" />
                <path d="M 1 6 H 13 C 16 6 18.5 8 18.5 11" />
              </svg>
            </button>

            {/* Thin vertical divider line matching reference screenshot */}
            <div className="h-7 w-[1px] bg-[#3A2C18] border-r border-[#6B5328]/50 self-center" />

            <PageIdBadge id="PG-020" />
          </div>

          {/* Center: Centered Title + Pencil Quick-Edit + Cloud Save Status */}
          <div className="flex flex-col items-center justify-center text-center flex-1 px-2">
            {isEditingTitle ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={complaintTitle}
                  onChange={(e) => setComplaintTitle(e.target.value)}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setIsEditingTitle(false);
                  }}
                  autoFocus
                  className="bg-[#092244] border border-[#C5A059] text-[#FFF4D4] font-serif text-base sm:text-[17px] px-2.5 py-0.5 rounded focus:outline-none shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(false)}
                  className="p-1 rounded bg-[#C5A059] text-[#07162B] hover:bg-[#FFE394] transition-colors cursor-pointer"
                  title="Save title"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group/title">
                <h1 
                  className="font-serif text-base sm:text-[17px] font-bold tracking-wide text-[#FFF0C2] drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] cursor-pointer"
                  onClick={() => setIsEditingTitle(true)}
                  title="Click to rename"
                >
                  {complaintTitle}
                </h1>
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(true)}
                  className="p-1 rounded-[4px] bg-[#0A264D]/90 hover:bg-[#113A6E] border border-[#DFBE77]/60 text-[#FFE7A0] hover:text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_2px_rgba(0,0,0,0.6)] transition-colors cursor-pointer"
                  title="Rename document"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            
            {/* Sub-line: Centered Cloud Sync Status */}
            <div className="flex items-center gap-1.5 text-[11px] font-sans text-[#E2D4BD] font-medium mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              <span>{lastSavedText}</span>
              <Cloud className="w-3.5 h-3.5 text-emerald-300 fill-emerald-300/30 drop-shadow-[0_0_4px_rgba(110,231,183,0.7)]" />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center justify-end gap-2 sm:gap-2.5 min-w-0 sm:min-w-[140px] md:min-w-[190px]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewModalOpen(true)}
              className="border-[#DFBE77]/60 bg-[#092244]/90 text-[#FFF4D4] hover:text-white hover:border-[#FFE394] hover:bg-[#113A6E] gap-1.5 text-xs h-8 cursor-pointer rounded-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_1px_3px_rgba(0,0,0,0.5)] hidden sm:flex"
            >
              <Eye className="w-3.5 h-3.5 text-[#FFE394]" />
              <span>Preview</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCompilerModalOpen(true)}
              className="border-[#DFBE77]/60 bg-[#092244]/90 text-[#FFF4D4] hover:text-white hover:border-[#FFE394] hover:bg-[#113A6E] gap-1.5 text-xs h-8 cursor-pointer rounded-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_1px_3px_rgba(0,0,0,0.5)]"
              title="Launch State Complaint Compiler"
            >
              <Settings className="w-3.5 h-3.5 text-[#FFE394]" />
              <span>Compile</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleExportPdf}
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-8 px-3 sm:px-4 gap-1.5 rounded-md border border-[#FFE394]/70 shadow-[0_3px_12px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.7)] hover:brightness-105 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </Button>
          </div>
        </header>

        {/* ── 3-COLUMN STUDIO WORKSPACE ───────────────────────────────────── */}
        <div className="relative z-10 flex flex-1 overflow-hidden px-0 pt-2 pb-2 gap-1.5">
          
          {/* ── LEFT COLUMN: Document Binder / Outline Rail (Resizable via Draggable Edge) ─────────────── */}
          {!isFocusMode && !isIndexCollapsed && (
            <aside 
              ref={indexAsideRef}
              style={{
                width: `${indexWidth}px`,
                backgroundColor: "#03152E",
                background: "#03152E",
                boxShadow: "inset 0 1px 1px rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.85)",
              }}
              className="shrink-0 flex flex-col justify-between rounded-r-[14px] rounded-l-none border border-[#3A2C18] bg-[#03152E] shadow-2xl relative pt-2 pb-2 pr-1.5 pl-1 z-20 select-none group/index-aside"
            >
              {/* Draggable resize edge handle on the right border */}
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsResizingIndex(true);
                }}
                className={cn(
                  "absolute -right-[6px] top-0 bottom-0 w-[12px] cursor-col-resize z-50 flex items-center justify-center transition-colors group/resizer",
                  isResizingIndex ? "bg-[#DFBE77]/25" : "hover:bg-[#DFBE77]/15"
                )}
                title="Drag left or right to resize Packet Index"
              >
                {/* Thin tactile brass indicator bar */}
                <div 
                  className={cn(
                    "w-[2px] rounded-full transition-all duration-150",
                    isResizingIndex
                      ? "bg-[#FFE394] shadow-[0_0_8px_rgba(255,227,148,0.9)] h-16"
                      : "bg-[#8C6D2B]/50 group-hover/resizer:bg-[#DFBE77] h-10 group-hover/resizer:h-14"
                  )} 
                />
              </div>

              <div className="flex items-center justify-between pl-2 pr-2 pt-6 pb-2 border-b border-[#3A2C18]/60 relative z-20 bg-transparent">
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

              {/* Tightly stacked index cards with realistic shingled depth pulled snug against the scrollbar */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pt-1.5 pb-3 pl-3 pr-0.5 custom-scrollbar bg-transparent [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#4A3718] [&::-webkit-scrollbar-thumb]:rounded-sm">
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
                          ? { background: "linear-gradient(135deg, #FFF4D2 0%, #F5D588 45%, #E2AE48 100%)" }
                          : {
                              backgroundImage: "url('/decor/fine-parchment.jpg')",
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                      }
                      className={cn(
                        "w-full flex items-center justify-between py-2 px-2 pl-3 rounded-[3px] transition-all text-left group cursor-pointer relative border select-none min-h-[46px]",
                        isActive
                          ? "z-10 border-[#FFE599] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_1.5px_rgba(140,80,10,0.3)] translate-x-0.5"
                          : "z-0 border-[#BCA16B]/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-1px_1px_rgba(0,0,0,0.15)] hover:brightness-105 hover:translate-x-0.5"
                      )}
                    >
                      {/* Authentic Ornate Brass & Navy Slip Bracket */}
                      <BrassSlipHandle isActive={isActive} />

                      {/* Number + vertical line divider + full wrapped title (no dots/truncate) */}
                      <div className="flex items-center min-w-0 flex-1 pl-1 pr-2 gap-2">
                        <span className={cn(
                          "font-mono text-[11px] shrink-0 font-bold leading-none self-center",
                          isActive ? "text-[#3D2C10]" : "text-[#5C421B]"
                        )}>
                          {p.number}
                        </span>

                        {/* Thin vertical line divider after the number */}
                        <div className={cn(
                          "h-5 w-[1px] shrink-0 self-center",
                          isActive ? "bg-[#8C6D2B]/75" : "bg-[#B39358]/55"
                        )} />

                        <span 
                          className={cn(
                            "text-[12px] font-serif font-bold leading-[1.25] flex-1 min-w-0 break-words whitespace-normal",
                            isActive ? "text-[#1C1003]" : "text-[#1A1005]"
                          )}
                        >
                          {p.title}
                        </span>
                      </div>

                      {/* Right: Miniature document facsimile */}
                      <div className="flex items-center shrink-0">
                        <MiniaturePagePreview page={p} caseDetails={caseDetails} isActive={isActive} />
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
            className={cn(
              "flex-1 flex flex-col border border-[#3A2C18] bg-[#03152E] shadow-2xl relative min-w-0 z-10",
              isToolsCollapsed 
                ? "rounded-l-[14px] rounded-r-none" 
                : "rounded-[14px]"
            )}
            style={{
              backgroundColor: "#03152E",
              background: "linear-gradient(180deg, #051A38 0%, #03152E 35%, #020E22 100%)",
              boxShadow: "inset 0 1px 1px rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.85)",
            }}
          >
            {/* Top Folio Tabs Bar (Executive Navy & Brass Tabs matching Student Workspace) */}
            <div 
              className={cn(
                "pl-8 sm:pl-9 pr-8 sm:pr-9 pt-2.5 pb-0 bg-gradient-to-b from-[#041633] via-[#021026] to-[#010a1a] flex items-end justify-center sm:justify-start relative z-20 shadow-[0_4px_12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(147,197,253,0.15)]",
                isToolsCollapsed ? "rounded-tl-[14px] rounded-tr-none" : "rounded-t-[14px]"
              )}
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
                {/* Index icon tab when collapsed (always accessible) */}
                {isIndexCollapsed && (
                  <button
                    type="button"
                    onClick={() => setIsIndexCollapsed(false)}
                    className="relative flex items-center justify-center gap-1 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-t-[4px] text-xs sm:text-[13px] border border-b-0 border-[#DFBE77]/60 bg-gradient-to-b from-[#06244F] to-[#021430] text-[#DFBE77] hover:text-[#FFE394] hover:brightness-110 transition-all cursor-pointer select-none shrink-0 font-serif font-bold shadow-sm mr-1"
                    title="Expand Packet Index"
                  >
                    <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#DFBE77] shrink-0" />
                    <span>Index</span>
                    <ChevronRight className="w-3 h-3 text-[#C6B697]" />
                  </button>
                )}

                {[
                  { id: "cover", label: "State Form", icon: FileText },
                  { id: "edit", label: "Edit", icon: Pencil },
                  { id: "arrange", label: "Exhibit Index", icon: Layers },
                  { id: "insert", label: "Insert", icon: Plus },
                  { id: "tools", label: "Tools", icon: PanelRight },
                ]
                  .filter((tab) => !(tab.id === "tools" && !isToolsCollapsed))
                  .map((tab) => {
                  const isActive = tab.id === "tools" ? !isToolsCollapsed : activeToolbarTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        if (tab.id === "insert") {
                          setIsAddPageModalOpen(true);
                        } else if (tab.id === "tools") {
                          setIsToolsCollapsed((prev) => !prev);
                        } else if (tab.id === "arrange") {
                          setActiveToolbarTab("arrange");
                          setActivePageId("exhibit_index");
                        } else {
                          setActiveToolbarTab(tab.id as any);
                          if (tab.id === "cover") {
                            setActivePageId("cover");
                          } else if (activePageId === "cover") {
                            setActivePageId("clarity_control");
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

            {/* If on cover page, show Official State Complaint Form status banner */}
            {activePage.id === "cover" && (
              <div 
                style={{
                  backgroundColor: "#061833",
                  background: "linear-gradient(90deg, #0A2244 0%, #061833 50%, #0A2244 100%)",
                }}
                className="px-4 sm:px-6 py-1.5 border-b border-[#3A2C18] flex flex-wrap items-center justify-between gap-2 text-xs relative z-20 shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#FFE394] font-serif">
                    Official State Filing Form:
                  </span>
                  <span className="text-[#C6B697] text-[11px]">
                    {SUPPORTED_STATE_FORMS[officialFormState.stateCode]?.name || "Georgia"} ({SUPPORTED_STATE_FORMS[officialFormState.stateCode]?.shortAgency || "GaDOE"}) · Special Education Formal Complaint Form
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#A69371]">
                    Student: <strong className="text-white">{officialFormState.studentName || caseDetails.studentName}</strong>
                  </span>
                  <div className="w-[1px] h-3.5 bg-[#3A2C18]" />
                  <span className="text-[11px] text-[#A69371]">
                    Agency: <strong className="text-white">{officialFormState.publicAgency || caseDetails.district}</strong>
                  </span>
                </div>
              </div>
            )}

            {/* If NOT on cover page, show compact single-line formatting toolbar */}
            {activePage.id !== "cover" && (
              <div 
                style={{
                  backgroundColor: "#061833",
                  background: "linear-gradient(90deg, #0A2244 0%, #061833 50%, #0A2244 100%)",
                }}
                className="px-4 sm:px-6 py-1.5 border-b border-[#3A2C18] flex flex-wrap items-center justify-between gap-2 text-xs relative z-20 shadow-xs"
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
            {/* Consistent rich Admiralty Blue leather from top to bottom (no dark fade) */}
            <div 
              className="flex-1 relative overflow-y-auto overflow-x-hidden pt-2.5 pb-6 px-4 sm:px-6 flex flex-col items-center bg-[#0C2A52] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-[#081F3D] [&::-webkit-scrollbar-thumb]:bg-[#4A3718] [&::-webkit-scrollbar-thumb]:rounded-sm hover:[&::-webkit-scrollbar-thumb]:bg-[#7A5A28]"
              style={{
                backgroundImage: "linear-gradient(180deg, rgba(18, 54, 104, 0.90) 0%, rgba(14, 46, 90, 0.88) 50%, rgba(18, 54, 104, 0.90) 100%), url('/decor/folio-leather-texture.png')",
                backgroundRepeat: "repeat",
                backgroundSize: "auto, 240px",
                backgroundAttachment: "local",
              }}
            >
              {/* ── DOCUMENT SHEET DISPLAY ───────────────────────────────── */}
              {activePage.id === "cover" ? (
                /* ── VIEW 1: AUTHENTIC OFFICIAL STATE COMPLAINT FORM (4 Standard 8.5x11 Sheets) ── */
                <StateComplaintFormView
                  formState={officialFormState}
                  onChange={setOfficialFormState}
                  onSelectState={(code) => {
                    setOfficialFormState((prev) => ({ ...prev, stateCode: code }));
                    setCaseDetails((prev) => ({ ...prev, state: code }));
                  }}
                  viewMode={viewMode}
                  zoomLevel={zoomLevel}
                />
              ) : (
                /* ── VIEW 2: EDITABLE DOCUMENT PAGES (Proportional Google Docs Writing Area) ── */
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
                    "bg-[#FBF6EA] text-[#1A120A] border border-[#C5A059]/60 shadow-[0_16px_50px_rgba(0,0,0,0.85),0_2px_8px_rgba(0,0,0,0.5)]",
                    viewMode === "fit-width" && "w-full max-w-[840px] aspect-[8.5/11] min-h-[1080px] p-10 sm:p-14 lg:p-16 my-1 shrink-0",
                    viewMode === "fit-page" && "h-[calc(100vh-175px)] aspect-[8.5/11] w-auto max-w-full p-8 lg:p-10 my-auto shrink-0",
                    viewMode === "actual" && "w-[816px] min-h-[1056px] p-12 sm:p-16 my-2 shrink-0"
                  )}
                >
                  {/* Printable Margin Guidelines (only on draft pages) */}
                  <div className="absolute top-6 left-6 w-3 h-3 border-t border-l border-[#8C7A60]/40 pointer-events-none z-10" />
                  <div className="absolute top-6 right-6 w-3 h-3 border-t border-r border-[#8C7A60]/40 pointer-events-none z-10" />
                  <div className="absolute bottom-6 left-6 w-3 h-3 border-b border-l border-[#8C7A60]/40 pointer-events-none z-10" />
                  <div className="absolute bottom-6 right-6 w-3 h-3 border-b border-r border-[#8C7A60]/40 pointer-events-none z-10" />

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
                </div>
              )}
            </div>

            {/* Bottom Floating Control Bar (Admiralty Navy leather, aligned, zero overlap, rounded bottom) */}
            <div 
              className="px-6 sm:px-8 py-2 border-t border-[#23508C]/80 bg-gradient-to-r from-[#082855] via-[#0E3A75] to-[#082855] flex items-center justify-between gap-2.5 relative z-20 rounded-b-[18px] shadow-[inset_0_1px_0_rgba(147,197,253,0.22),0_-4px_14px_rgba(0,0,0,0.45)] overflow-x-auto [&::-webkit-scrollbar]:hidden"
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
              className="w-44 lg:w-48 xl:w-52 shrink-0 flex flex-col justify-between rounded-l-[14px] rounded-r-none border border-[#3A2C18] bg-[#03152E] shadow-2xl relative p-2.5 z-20"
              style={{
                backgroundColor: "#03152E",
                background: "linear-gradient(180deg, #051A38 0%, #03152E 35%, #020E22 100%)",
                boxShadow: "inset 0 1px 1px rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.85)",
              }}
            >
              <div className="space-y-3 relative z-20 pt-6 px-1">
                {/* Header: State complaint tools with collapse chevron */}
                <div className="flex items-center justify-between pb-2 border-b border-[#3A2C18]">
                  <h3 className="font-serif text-sm font-bold text-[#FFF4D4]">
                    State complaint tools
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsToolsCollapsed(true)}
                    className="text-[#C6B697] hover:text-[#FFF4D4] p-1 rounded hover:bg-white/[0.05] transition-colors cursor-pointer"
                    title="Collapse state complaint tools"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Gold Plaque: Settings (moved up, kept gold) */}
                <button
                  type="button"
                  onClick={() => setIsCompilerModalOpen(true)}
                  style={{
                    background: "linear-gradient(180deg, #FDF0C8 0%, #E6C577 26%, #C79E48 70%, #9E7428 100%)",
                  }}
                  className="h-11 px-3.5 w-full flex items-center justify-between rounded-md text-[#1A1005] font-serif font-bold border-[1.5px] border-[#FFE59E] shadow-[0_3px_10px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.75)] hover:brightness-105 transition-all cursor-pointer group"
                  title="Settings"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-[#1A1005]" />
                    <span className="text-xs">Settings</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#1A1005] group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* 4 Shallow Rectangular Parchment Plates */}
                <div className="space-y-2.5">
                  {/* Plate 1: Edit official state form details */}
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
                      <span className="text-xs font-serif font-bold tracking-tight">Edit State Form Details</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#7A5C28] group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Plate 2: State Jurisdiction */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = officialFormState.stateCode === "GA" ? "FL" : "GA";
                      setOfficialFormState((prev) => ({ ...prev, stateCode: next }));
                      setCaseDetails((prev) => ({ ...prev, state: next }));
                      toast.success(`Switched state form to ${SUPPORTED_STATE_FORMS[next]?.name || next}`);
                    }}
                    style={{
                      backgroundImage: "url('/decor/fine-parchment.jpg')",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                    className="h-11 px-3.5 w-full flex items-center justify-between rounded-md border border-[#BCA062]/80 text-[#1A1005] shadow-[0_2px_5px_rgba(0,0,0,0.45),0_1px_1px_rgba(0,0,0,0.25)] transition-all cursor-pointer group hover:brightness-105"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-[#3E9B34] group-hover:scale-105 transition-transform" />
                      <span className="text-xs font-serif font-bold tracking-tight">
                        State: {SUPPORTED_STATE_FORMS[officialFormState.stateCode]?.name || "Georgia"} ({officialFormState.stateCode || "GA"})
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#7A5C28] group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Plate 3: Switch/Select Student */}
                  <button
                    type="button"
                    onClick={() => {
                      if (contactsQuery.data && contactsQuery.data.length > 0) {
                        const currentIdx = contactsQuery.data.findIndex((c) => 
                          (c.lastName ? `${c.lastName}, ${c.firstName}` : c.firstName) === (officialFormState.studentName || caseDetails.studentName)
                        );
                        const nextStudent = contactsQuery.data[(currentIdx + 1) % contactsQuery.data.length];
                        if (nextStudent) applyStudentToComplaint(nextStudent);
                      } else {
                        setIsEditCoverModalOpen(true);
                      }
                    }}
                    style={{
                      backgroundImage: "url('/decor/fine-parchment.jpg')",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                    className="h-11 px-3.5 w-full flex items-center justify-between rounded-md border border-[#BCA062]/80 text-[#1A1005] shadow-[0_2px_5px_rgba(0,0,0,0.45),0_1px_1px_rgba(0,0,0,0.25)] transition-all cursor-pointer group hover:brightness-105"
                    title="Click to cycle CRM student, or edit details in State Form details"
                  >
                    <div className="flex items-center gap-2.5">
                      <User className="w-4 h-4 text-[#4A3515] group-hover:scale-105 transition-transform" />
                      <span className="text-xs font-serif font-bold tracking-tight truncate max-w-[170px]">
                        Student: {officialFormState.studentName || caseDetails.studentName}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#7A5C28] group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Plate 4: Submission details & eFax Info */}
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText("spedhelpdesk@doe.k12.ga.us");
                      toast.success("Copied GaDOE SpEd Helpdesk email: spedhelpdesk@doe.k12.ga.us");
                    }}
                    style={{
                      backgroundImage: "url('/decor/fine-parchment.jpg')",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                    className="h-11 px-3.5 w-full flex items-center justify-between rounded-md border border-[#BCA062]/80 text-[#1A1005] shadow-[0_2px_5px_rgba(0,0,0,0.45),0_1px_1px_rgba(0,0,0,0.25)] transition-all cursor-pointer group hover:brightness-105"
                  >
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-[#4A3515] group-hover:scale-105 transition-transform" />
                      <span className="text-xs font-serif font-bold tracking-tight">Copy GaDOE Filing Info</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#7A5C28] group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Brass Corner Brackets in front */}
              <FolioBoxCornerBrackets size={32} />
            </aside>
          )}
        </div>

        {/* ── MODALS ──────────────────────────────────────────────────────── */}
        
        {/* 1. Edit Cover Details Modal */}
        <Dialog open={isEditCoverModalOpen} onOpenChange={setIsEditCoverModalOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] flex flex-col bg-[#05142B] border border-[#3A2C18] text-white shadow-2xl p-5">
            <DialogHeader className="pb-1 border-b border-[#3A2C18]/60">
              <DialogTitle className="font-serif text-base text-[#FFF4D4]">
                Edit State Form Details
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2.5 py-2 text-xs overflow-y-auto pr-1.5 custom-scrollbar flex-1 max-h-[60vh]">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-[#C6B697] text-[11px]">Student Full Legal Name</Label>
                  <Input
                    value={caseDetails.studentName}
                    onChange={(e) => handleQuickFieldUpdate("studentName", e.target.value)}
                    className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[#C6B697] text-[11px]">Date of Birth</Label>
                  <Input
                    placeholder="YYYY-MM-DD"
                    value={caseDetails.studentDob}
                    onChange={(e) => handleQuickFieldUpdate("studentDob", e.target.value)}
                    className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-[#C6B697] text-[11px]">Current Grade</Label>
                  <Input
                    value={caseDetails.grade}
                    onChange={(e) => handleQuickFieldUpdate("grade", e.target.value)}
                    className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[#C6B697] text-[11px]">Assigned School</Label>
                  <Input
                    placeholder="e.g. Wheeler High School"
                    value={caseDetails.school}
                    onChange={(e) => handleQuickFieldUpdate("school", e.target.value)}
                    className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-[#C6B697] text-[11px]">School District (LEA)</Label>
                  <Input
                    value={caseDetails.district}
                    onChange={(e) => handleQuickFieldUpdate("district", e.target.value)}
                    className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[#C6B697] text-[11px]">Parent / Complainant</Label>
                  <Input
                    placeholder="e.g. Sarah Jenkins"
                    value={caseDetails.parentName}
                    onChange={(e) => handleQuickFieldUpdate("parentName", e.target.value)}
                    className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-[#C6B697] text-[11px]">Prepared By</Label>
                  <Input
                    value={caseDetails.preparedBy}
                    onChange={(e) => handleQuickFieldUpdate("preparedBy", e.target.value)}
                    className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[#C6B697] text-[11px]">Submission Date</Label>
                  <Input
                    placeholder="e.g. October 15, 2026"
                    value={caseDetails.submissionDate}
                    onChange={(e) => handleQuickFieldUpdate("submissionDate", e.target.value)}
                    className="bg-[#020A17] border-[#3A2C18] text-white mt-0.5 h-7 text-xs"
                  />
                </div>
              </div>

              {/* Cover Options & Fast Tools */}
              <div className="pt-2 border-t border-[#3A2C18]/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-[#C6B697] text-xs cursor-pointer" htmlFor="cover-logo-toggle">
                    Display Waypoint Logo on Cover
                  </Label>
                </div>
                <button
                  type="button"
                  id="cover-logo-toggle"
                  onClick={() => setCaseDetails((prev) => ({ ...prev, showLogo: !prev.showLogo }))}
                  className={cn(
                    "px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all border cursor-pointer",
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
            <DialogFooter className="pt-2 border-t border-[#3A2C18]/60 flex items-center justify-between sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditCoverModalOpen(false)}
                className="text-[#C6B697] hover:text-white hover:bg-white/[0.05] text-xs h-7 px-3"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setIsEditCoverModalOpen(false);
                  toast.success("Cover sheet details saved");
                }}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-7 px-4 shadow-md hover:brightness-105"
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
                <div>• 1. State Form formatted with LEA identifiers</div>
                <div>• 2. Clarity Control Restatement with statutory claims</div>
                <div>• 3. Chronological Summary with 1-year timeline milestones</div>
                <div>• 4. Master Exhibit Index with evidentiary schedule</div>
                <div>• 5. Exhibit A: Student's IEP attached as primary baseline</div>
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
                      <h2 className="font-serif font-black text-2xl uppercase mt-2">STATE FORM</h2>
                      <p className="text-xs italic mt-1">Official State Complaint Form · Submitted to the Georgia Department of Education</p>
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
