import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { 
  Folder, 
  FileText, 
  FileSpreadsheet, 
  Mail, 
  Lock, 
  ShieldCheck, 
  Search, 
  ChevronRight, 
  Clock, 
  Download, 
  Eye, 
  CheckCircle2, 
  Circle,
  Sparkles, 
  FileCode, 
  FileCheck,
  MoreVertical,
  UploadCloud, 
  RefreshCw,
  Camera,
  HardDrive,
  TrendingUp,
  ScrollText,
  ChevronDown,
  X,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import PageIdBadge from "@/components/PageIdBadge";
import { CameraScannerModal } from "@/components/portal/CameraScannerModal";
import { trpc } from "@/lib/trpc";
import { PreEnrollmentAcknowledgmentModal } from "@/components/portal/vault/PreEnrollmentAcknowledgmentModal";
import { StatusAwareUploadModal } from "@/components/portal/vault/StatusAwareUploadModal";
import { ViewAcknowledgmentModal } from "@/components/portal/vault/ViewAcknowledgmentModal";
import { AiDocumentAnalysisModal } from "@/components/portal/vault/AiDocumentAnalysisModal";

interface PortalDocumentVaultTabProps {
  effectiveStudent?: any;
  displayName?: string;
  onNavigateTab?: (tabId: string) => void;
  isLight?: boolean;
}

export interface VaultWorkspace {
  id: string;
  name: string;
  fileCount: number;
  description: string;
  iconSrc: string;
  accentBorder: string;
  accentGlow: string;
  accentText: string;
  extraInfo?: string;
}

export interface VaultDocument {
  id: string;
  title: string;
  workspaceId: string;
  workspaceName: string;
  fileType: "pdf" | "doc" | "eml" | "xlsx" | "audio";
  fileSize: string;
  updatedAt: string;
  relativeDate: string;
  isPinned?: boolean;
  uploadedBy: "Waypoint" | "Parent";
  summary?: string;
  uploadOrigin?: "Pre-Enrollment" | "Client" | "Advocate";
  isReviewed?: number;
  documentType?: string;
  documentDate?: string;
  fileUrl?: string;
}

const INITIAL_WORKSPACES: VaultWorkspace[] = [
  {
    id: "ieps-504s",
    name: "IEPs & 504s",
    fileCount: 12,
    description: "Current & historical IEPs, 504 plans, and amendments",
    iconSrc: "/assets/vault/folder_ieps_3d.png",
    accentBorder: "border-amber-400/50 hover:border-amber-300",
    accentGlow: "hover:shadow-[0_0_24px_rgba(245,181,68,0.35)]",
    accentText: "text-amber-400",
    extraInfo: "Current IEP updated\nSep 10, 2026"
  },
  {
    id: "evaluations",
    name: "Evaluations",
    fileCount: 10,
    description: "Psycho-ed evals, speech-language, OT, and PT assessments",
    iconSrc: "/assets/vault/folder_evals_3d.png",
    accentBorder: "border-sky-500/50 hover:border-sky-400",
    accentGlow: "hover:shadow-[0_0_24px_rgba(56,189,248,0.35)]",
    accentText: "text-sky-400"
  },
  {
    id: "school-records",
    name: "School Records",
    fileCount: 9,
    description: "Report cards, standardized test results, and attendance records",
    iconSrc: "/assets/vault/folder_school_3d.png",
    accentBorder: "border-teal-400/50 hover:border-teal-300",
    accentGlow: "hover:shadow-[0_0_24px_rgba(45,212,191,0.35)]",
    accentText: "text-teal-400"
  },
  {
    id: "communication",
    name: "Communication",
    fileCount: 7,
    description: "Teacher emails, PWN notices, and meeting invites",
    iconSrc: "/assets/vault/folder_comm_3d.png",
    accentBorder: "border-purple-400/50 hover:border-purple-300",
    accentGlow: "hover:shadow-[0_0_24px_rgba(192,132,252,0.35)]",
    accentText: "text-purple-400"
  },
  {
    id: "medical-therapy",
    name: "Medical & Therapy",
    fileCount: 6,
    description: "Physician letters, clinical diagnosis notes, and private therapy reports",
    iconSrc: "/assets/vault/folder_medical_3d.png",
    accentBorder: "border-rose-400/50 hover:border-rose-300",
    accentGlow: "hover:shadow-[0_0_24px_rgba(251,113,133,0.35)]",
    accentText: "text-rose-400"
  },
  {
    id: "behavior-fba",
    name: "Behavior / FBA / BIP",
    fileCount: 5,
    description: "Functional behavioral assessments and behavior intervention plans",
    iconSrc: "/assets/vault/folder_behavior_3d.png",
    accentBorder: "border-amber-500/50 hover:border-orange-400",
    accentGlow: "hover:shadow-[0_0_24px_rgba(251,146,60,0.35)]",
    accentText: "text-orange-400"
  },
  {
    id: "progress-reports",
    name: "Progress Reports",
    fileCount: 6,
    description: "Quarterly IEP goal tracking and special education progress marks",
    iconSrc: "/assets/vault/folder_progress_3d.png",
    accentBorder: "border-indigo-400/50 hover:border-indigo-300",
    accentGlow: "hover:shadow-[0_0_24px_rgba(129,140,248,0.35)]",
    accentText: "text-indigo-400"
  },
];

const INITIAL_DOCUMENTS: VaultDocument[] = [
  {
    id: "doc-1",
    title: "IEP Document",
    workspaceId: "ieps-504s",
    workspaceName: "IEPs & 504s",
    fileType: "pdf",
    fileSize: "4.1 MB",
    updatedAt: "Sep 10, 2026",
    relativeDate: "Sep 10, 2026",
    isPinned: true,
    uploadedBy: "Waypoint",
    documentType: "Current IEP",
    summary: "Current legally binding IEP with specialized reading accommodations and behavioral milestones."
  },
  {
    id: "doc-2",
    title: "Psychoeducational Evaluation",
    workspaceId: "evaluations",
    workspaceName: "Evaluations",
    fileType: "doc",
    fileSize: "2.8 MB",
    updatedAt: "Aug 22, 2026",
    relativeDate: "Aug 22, 2026",
    isPinned: true,
    uploadedBy: "Waypoint",
    summary: "Multi-disciplinary cognitive and academic achievement diagnostic report."
  },
  {
    id: "doc-3",
    title: "Progress Report",
    workspaceId: "progress-reports",
    workspaceName: "Progress Reports",
    fileType: "xlsx",
    fileSize: "1.1 MB",
    updatedAt: "Aug 15, 2026",
    relativeDate: "Aug 15, 2026",
    isPinned: false,
    uploadedBy: "Waypoint",
    summary: "Quarterly milestone tracking across math calculation and reading fluency benchmarks."
  },
  {
    id: "doc-4",
    title: "Behavior Plan (BIP)",
    workspaceId: "behavior-fba",
    workspaceName: "Behavior / FBA / BIP",
    fileType: "pdf",
    fileSize: "3.3 MB",
    updatedAt: "Aug 2, 2026",
    relativeDate: "Aug 2, 2026",
    isPinned: false,
    uploadedBy: "Waypoint",
    summary: "Targeted sensory-break protocols and positive reinforcement strategies."
  },
  {
    id: "doc-5",
    title: "Teacher Communication",
    workspaceId: "communication",
    workspaceName: "Communication",
    fileType: "eml",
    fileSize: "652 KB",
    updatedAt: "Jul 28, 2026",
    relativeDate: "Jul 28, 2026",
    isPinned: false,
    uploadedBy: "Parent",
    summary: "Discussion thread regarding weekly classroom accommodations and sensory check-ins."
  }
];

export default function PortalDocumentVaultTab({
  effectiveStudent,
  displayName = "Client",
  onNavigateTab,
  isLight = false,
}: PortalDocumentVaultTabProps) {
  const studentFullName = effectiveStudent 
    ? `${effectiveStudent.firstName || ""} ${effectiveStudent.lastName || ""}`.trim() 
    : "Liam Jenkins";
  const studentFirstName = effectiveStudent?.firstName || (studentFullName.split(" ")[0] || "Liam");
  const studentId = effectiveStudent?.id || 101;
  const storageKeyWorkspaces = `waypoint_vault_workspaces_${studentId}`;
  const storageKeyDocs = `waypoint_vault_documents_${studentId}`;

  // Workspaces state
  const [workspaces, setWorkspaces] = useState<VaultWorkspace[]>(() => {
    try {
      const saved = localStorage.getItem(storageKeyWorkspaces);
      return saved ? JSON.parse(saved) : INITIAL_WORKSPACES;
    } catch {
      return INITIAL_WORKSPACES;
    }
  });

  // Documents state
  const [documents, setDocuments] = useState<VaultDocument[]>(() => {
    try {
      const saved = localStorage.getItem(storageKeyDocs);
      return saved ? JSON.parse(saved) : INITIAL_DOCUMENTS;
    } catch {
      return INITIAL_DOCUMENTS;
    }
  });

  // Modals & Popovers
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<VaultDocument | null>(null);
  const [activeWorkspaceModal, setActiveWorkspaceModal] = useState<VaultWorkspace | null>(null);
  const [showAllFoldersModal, setShowAllFoldersModal] = useState(false);
  const [showAllDocsModal, setShowAllDocsModal] = useState(false);
  const [activeDropdownDocId, setActiveDropdownDocId] = useState<string | null>(null);
  const [isDragOverUpload, setIsDragOverUpload] = useState(false);

  // Status-Aware Document Vault Architecture
  const { data: vaultStatus, refetch: refetchVaultStatus } = trpc.clientFiles.getVaultStatus.useQuery(
    { studentId },
    { retry: false }
  );

  const { data: serverVaultFiles, refetch: refetchVaultFiles } = trpc.clientFiles.listVault.useQuery(
    { studentId },
    { retry: false }
  );

  const [showPreEnrollmentAckModal, setShowPreEnrollmentAckModal] = useState(false);
  const [showStatusAwareUploadModal, setShowStatusAwareUploadModal] = useState(false);
  const [showViewAckModal, setShowViewAckModal] = useState(false);
  const [analysisModalFileId, setAnalysisModalFileId] = useState<number | null>(null);
  const [analysisModalFileName, setAnalysisModalFileName] = useState<string>("");
  const [localAckAccepted, setLocalAckAccepted] = useState(false);
  const [showCameraScannerModal, setShowCameraScannerModal] = useState(false);

  const isRelationshipActive = vaultStatus?.isRelationshipActive ?? false;
  const isAckAccepted = isRelationshipActive || localAckAccepted || (vaultStatus?.preEnrollmentAcknowledgmentAccepted ?? false);

  const handleInitiateUpload = useCallback(() => {
    if (!isRelationshipActive && !isAckAccepted) {
      setShowPreEnrollmentAckModal(true);
    } else {
      setShowStatusAwareUploadModal(true);
    }
  }, [isRelationshipActive, isAckAccepted]);

  // Synchronize server-side uploaded files into local documents state
  useEffect(() => {
    if (serverVaultFiles && serverVaultFiles.length > 0) {
      setDocuments((prevDocs) => {
        const existingIds = new Set(prevDocs.map((d) => d.id));
        const newServerDocs: VaultDocument[] = serverVaultFiles
          .filter((sf) => !existingIds.has(String(sf.id)))
          .map((sf) => ({
            id: String(sf.id),
            title: sf.fileName,
            workspaceId: sf.category || "ieps-504s",
            workspaceName: sf.categoryName || "IEPs & 504s",
            fileType: sf.fileName.endsWith(".xlsx") || sf.fileName.endsWith(".csv") ? "xlsx" 
              : sf.fileName.endsWith(".docx") || sf.fileName.endsWith(".doc") ? "doc"
              : sf.fileName.endsWith(".eml") ? "eml"
              : "pdf",
            fileSize: sf.fileSize ? `${(sf.fileSize / 1024 / 1024).toFixed(1)} MB` : "1.8 MB",
            updatedAt: new Date(sf.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            relativeDate: "Recently",
            isPinned: false,
            uploadedBy: sf.uploadOrigin === "Advocate" ? "Waypoint" : "Parent",
            summary: sf.summary || "Permanent educational record safely archived in Document Vault.",
            uploadOrigin: sf.uploadOrigin as any,
            isReviewed: sf.isReviewed,
            documentType: sf.documentType,
            documentDate: sf.documentDate || undefined,
            fileUrl: sf.fileUrl,
          }));

        if (newServerDocs.length > 0) {
          return [...newServerDocs, ...prevDocs];
        }
        return prevDocs;
      });
    }
  }, [serverVaultFiles]);

  // Handle URL trigger from lead form: ?action=upload
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("action") === "upload") {
        if (!isRelationshipActive && !isAckAccepted) {
          setShowPreEnrollmentAckModal(true);
        } else {
          setShowStatusAwareUploadModal(true);
        }
      }
    }
  }, [isRelationshipActive, isAckAccepted]);

  // Synchronize external uploads (e.g. from ClientPortalHeader)
  useEffect(() => {
    const handleVaultUpdated = () => {
      try {
        const saved = localStorage.getItem(storageKeyDocs);
        if (saved) setDocuments(JSON.parse(saved));
        refetchVaultFiles();
        refetchVaultStatus();
      } catch (e) {
        console.error("Failed to sync vault:", e);
      }
    };
    const handleOpenUpload = () => {
      handleInitiateUpload();
    };

    window.addEventListener("waypoint:vault-updated", handleVaultUpdated);
    window.addEventListener("waypoint:open-upload-modal", handleOpenUpload);
    return () => {
      window.removeEventListener("waypoint:vault-updated", handleVaultUpdated);
      window.removeEventListener("waypoint:open-upload-modal", handleOpenUpload);
    };
  }, [storageKeyDocs, handleInitiateUpload, refetchVaultFiles, refetchVaultStatus]);

  // Close dropdown menu on outside click
  useEffect(() => {
    function handleClickOutside() {
      setActiveDropdownDocId(null);
    }
    if (activeDropdownDocId) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [activeDropdownDocId]);

  // Find the authoritative current IEP
  const currentIepDoc = useMemo(() => {
    return documents.find(
      (d) => d.documentType === "Current IEP" || (d.workspaceId === "ieps-504s" && !d.title.toLowerCase().includes("504"))
    ) || documents[0];
  }, [documents]);

  const currentIepDate = useMemo(() => {
    if (currentIepDoc?.documentDate) return currentIepDoc.documentDate;
    if (vaultStatus?.documentsSummary?.currentIepDate) return vaultStatus.documentsSummary.currentIepDate;
    return "September 10, 2026";
  }, [currentIepDoc, vaultStatus]);

  // File health checks
  const documentsSummary = useMemo(() => {
    return vaultStatus?.documentsSummary || {
      hasCurrentIep: documents.some((d) => (d.workspaceId === "ieps-504s" || d.documentType === "Current IEP") && !d.title.toLowerCase().includes("504")),
      currentIepDate: currentIepDate,
      hasCurrent504: documents.some((d) => d.title.toLowerCase().includes("504") || d.documentType === "504 Plan"),
      hasEvaluation: documents.some((d) => d.workspaceId === "evaluations" || d.documentType?.includes("Evaluation") || d.title.toLowerCase().includes("evaluation")),
      hasProgressReport: documents.some((d) => d.workspaceId === "progress-reports" || d.documentType?.includes("Progress") || d.title.toLowerCase().includes("progress")),
      hasPwn: documents.some((d) => d.workspaceId === "pwn" || d.documentType?.includes("PWN") || d.title.toLowerCase().includes("prior written") || d.title.toLowerCase().includes("pwn")),
    };
  }, [vaultStatus, documents, currentIepDate]);

  // Dynamic counts for folders
  const dynamicWorkspaces = useMemo(() => {
    return workspaces.map((ws) => {
      const count = documents.filter((d) => d.workspaceId === ws.id).length;
      return {
        ...ws,
        fileCount: count > 0 ? count : ws.fileCount,
      };
    });
  }, [workspaces, documents]);

  // Render Luxury File Badges
  const renderFileTypeBadge = (type: VaultDocument["fileType"]) => {
    switch (type) {
      case "pdf":
        return (
          <div className="w-8 h-8 rounded-lg bg-[#E02424] text-white flex flex-col items-center justify-center shrink-0 shadow-md">
            <span className="text-[9px] font-black uppercase tracking-wider leading-none">PDF</span>
          </div>
        );
      case "doc":
        return (
          <div className="w-8 h-8 rounded-lg bg-[#1A73E8] text-white flex flex-col items-center justify-center shrink-0 shadow-md">
            <FileCode className="w-4 h-4 text-white" />
          </div>
        );
      case "xlsx":
        return (
          <div className="w-8 h-8 rounded-lg bg-[#0F9D58] text-white flex flex-col items-center justify-center shrink-0 shadow-md">
            <FileSpreadsheet className="w-4 h-4 text-white" />
          </div>
        );
      case "eml":
        return (
          <div className="w-8 h-8 rounded-lg bg-[#8B5CF6] text-white flex flex-col items-center justify-center shrink-0 shadow-md">
            <Mail className="w-4 h-4 text-white" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-lg bg-[#E02424] text-white flex flex-col items-center justify-center shrink-0 shadow-md">
            <FileText className="w-4 h-4 text-white" />
          </div>
        );
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#000820] text-white font-sans selection:bg-amber-400 selection:text-slate-950 pb-16">
      
      {/* ── ZONE 1: CINEMATIC DOCUMENT VAULT HERO ───────────────────────── */}
      <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#020B1D] via-[#000820] to-[#000820] border-b border-blue-900/30">
        
        {/* Background Bank Vault Artwork */}
        <div className="absolute right-0 top-0 bottom-0 w-full md:w-[70%] lg:w-[62%] pointer-events-none select-none z-0">
          <img 
            src="/assets/vault/vault_door_hero.png" 
            alt="Bank Vault Door" 
            className="w-full h-full object-cover object-right"
            style={{
              maskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.5) 15%, black 40%, black 100%)",
              WebkitMaskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.5) 15%, black 40%, black 100%)"
            }}
          />
          {/* Subtle warm interior glow boost */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#000820] via-transparent to-transparent opacity-80" />
        </div>

        {/* Hero Content Area */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10 md:pt-10 md:pb-14">
          <div className="max-w-xl lg:max-w-2xl">
            
            {/* Gold Outlined Badge */}
            <div className="flex items-center gap-3 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest text-amber-300 border border-amber-400/50 bg-amber-400/10 shadow-[0_0_12px_rgba(245,181,68,0.2)]">
                <Lock className="w-3 h-3 text-amber-400" />
                DOCUMENT VAULT
              </span>
              <PageIdBadge id="PG-023-VAULT" name="Document Vault" />
            </div>

            {/* Student Name: Serif Display Typography */}
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-[54px] font-bold text-white tracking-tight leading-none mb-3.5 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
              {studentFullName}
            </h1>

            {/* Human Reassuring Copy */}
            <p className="text-slate-300 text-sm sm:text-base font-normal max-w-lg leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
              Your child’s important records, safely stored, organized, and always within reach.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Viewport */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 space-y-7 sm:space-y-9 relative z-20">
        
        {/* ── ZONE 2: ACTION STRIP DIRECTLY BELOW HERO (3 PANELS) ───────── */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-3.5 lg:gap-4 items-stretch">
          
          {/* Panel A: CURRENT IEP */}
          <div className="md:col-span-5 lg:col-span-5 rounded-2xl bg-gradient-to-br from-[#07162B] to-[#030E1F] border border-blue-900/60 p-4 sm:p-5 flex items-center justify-between gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            {/* Visual IEP Document Stack with Unchopped 3D Gold Folio */}
            <div className="relative shrink-0 flex items-center justify-center p-1">
              <div className="absolute inset-0 bg-radial from-amber-400/20 to-transparent blur-xl pointer-events-none opacity-40 group-hover:opacity-80 transition-opacity" />
              <img 
                src="/assets/vault/iep_booklet_3d.png?v=4" 
                alt="Current IEP / 504 Dossier" 
                className="w-28 sm:w-32 md:w-36 h-auto object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.8)] group-hover:scale-105 transition-transform duration-300 relative z-10"
              />
            </div>

            {/* Right Information */}
            <div className="flex-1 min-w-0 pr-1">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-400 block mb-0.5">
                CURRENT IEP
              </span>

              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/20 shrink-0" />
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-none">
                  On File
                </h3>
              </div>

              <p className="text-xs text-slate-300 font-medium mb-3">
                {currentIepDate}
              </p>

              <Button
                type="button"
                onClick={() => setSelectedDocForPreview(currentIepDoc)}
                className="h-8 px-4 text-xs font-semibold rounded-full bg-[#082046] hover:bg-[#0c2f66] text-sky-200 border border-sky-400/40 shadow-[0_0_12px_rgba(56,189,248,0.2)] gap-1.5 cursor-pointer transition-all hover:scale-[1.02]"
              >
                <span>View Current IEP</span>
                <ArrowRight className="w-3.5 h-3.5 text-sky-300" />
              </Button>
            </div>
          </div>

          {/* Panel B: NEED TO UPDATE? (Compact 3-Col Layout) */}
          <div 
            onClick={handleInitiateUpload}
            className="md:col-span-3 lg:col-span-3 rounded-2xl bg-gradient-to-br from-[#07162B] to-[#030E1F] border border-blue-900/60 hover:border-cyan-500/50 p-3 sm:p-3.5 lg:p-4 flex items-center gap-2.5 sm:gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)] cursor-pointer transition-all hover:scale-[1.01] group"
          >
            {/* Circular Blue Refresh Icon */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#0A2347] border border-cyan-400/40 text-cyan-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(56,189,248,0.25)] group-hover:scale-105 transition-transform">
              <RefreshCw className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-cyan-400 group-hover:rotate-45 transition-transform duration-300" />
            </div>

            {/* Compact IEP/504 Text */}
            <div className="min-w-0">
              <h4 className="text-xs sm:text-[13px] font-extrabold uppercase tracking-wide text-cyan-400 leading-tight mb-0.5">
                NEW IEP OR 504?
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-300 leading-snug">
                Upload new copies to keep {studentFirstName}’s file current.
              </p>
            </div>
          </div>

          {/* Panel C: UPLOAD DROPZONE (Expanded 4-Col Layout) */}
          <div 
            onClick={handleInitiateUpload}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOverUpload(true);
            }}
            onDragLeave={() => setIsDragOverUpload(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOverUpload(false);
              handleInitiateUpload();
            }}
            className={`md:col-span-4 lg:col-span-4 rounded-2xl bg-gradient-to-br from-[#07162B] to-[#030E1F] border p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-[0_8px_32px_rgba(0,0,0,0.5)] cursor-pointer group transition-all relative overflow-hidden ${
              isDragOverUpload 
                ? "border-amber-400 bg-amber-400/15 scale-[1.02] shadow-[0_0_30px_rgba(245,181,68,0.35)]" 
                : "border-blue-900/60 hover:border-amber-400/50 hover:shadow-[0_8px_32px_rgba(0,0,0,0.7),0_0_20px_rgba(245,181,68,0.15)]"
            }`}
          >
            {/* Ambient gold glow */}
            <div className="absolute inset-0 bg-radial from-amber-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            {/* 3D Upload Cloud Graphic */}
            <div className="relative w-16 h-14 sm:w-18 sm:h-16 flex items-center justify-center mb-2">
              <div className="absolute inset-0 bg-radial from-amber-400/20 to-transparent blur-lg opacity-40 group-hover:opacity-80 transition-opacity pointer-events-none" />
              <img 
                src="/assets/vault/upload_cloud_3d.png" 
                alt="Upload to Document Vault" 
                className="max-h-14 sm:max-h-16 w-auto object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.7)] group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300"
              />
            </div>

            {/* Full-width Pristine Gold Button (Read in full, no truncation) */}
            <Button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleInitiateUpload();
              }}
              className="w-full max-w-[240px] h-10 px-4 rounded-xl bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-bold text-xs sm:text-sm tracking-wide shadow-[0_4px_16px_rgba(0,0,0,0.6)] cursor-pointer transition-all border border-[#FFE394]/60 flex items-center justify-center gap-2 active:scale-[0.98] shrink-0"
            >
              <UploadCloud className="w-4 h-4 text-[#07162B] stroke-[2.5] shrink-0" />
              <span className="font-extrabold whitespace-nowrap">Upload Documents</span>
            </Button>

            {/* Subtext */}
            <p className="text-xs text-slate-300 font-medium mt-2 leading-snug">
              Drag & drop files or click to browse
            </p>
            <div className="flex items-center justify-center gap-1 mt-1.5 text-[9.5px] text-slate-400 font-mono">
              <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">PDF</span>
              <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">DOC</span>
              <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">JPG</span>
              <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">PNG</span>
            </div>
          </div>
        </section>

        {/* ── ZONE 3: DOCUMENT FOLDERS GALLERY ─────────────────────────── */}
        <section className="space-y-3.5">
          
          {/* Gallery Header */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <Folder className="w-5 h-5 text-amber-400 fill-amber-400" />
              <div>
                <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-white">
                  DOCUMENT FOLDERS
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  All of {studentFirstName}’s documents organized by category.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAllFoldersModal(true)}
              className="h-8 px-3.5 text-xs text-slate-300 hover:text-white border-blue-900/60 hover:bg-white/5 rounded-full cursor-pointer gap-1"
            >
              <span>View All Folders</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Button>
          </div>

          {/* Horizontal Folder Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3.5">
            {dynamicWorkspaces.map((folder) => {
              return (
                <div
                  key={folder.id}
                  onClick={() => setActiveWorkspaceModal(folder)}
                  className={`group relative rounded-2xl bg-gradient-to-b from-[#06152B] to-[#030D1B] border p-3.5 flex flex-col justify-between transition-all duration-300 cursor-pointer hover:-translate-y-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.06)] ${folder.accentBorder} ${folder.accentGlow}`}
                >
                  {/* Prominent 3D Folder Graphic with Ambient Themed Glow */}
                  <div className="relative w-full h-24 sm:h-28 flex items-center justify-center py-1">
                    <div className={`absolute inset-0 rounded-2xl bg-radial from-current to-transparent opacity-0 group-hover:opacity-25 blur-xl transition-opacity duration-300 pointer-events-none ${folder.accentText}`} />
                    <img 
                      src={folder.iconSrc} 
                      alt={folder.name} 
                      className="max-h-20 sm:max-h-24 w-auto object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.65)] group-hover:scale-110 group-hover:-translate-y-1.5 transition-all duration-300 ease-out"
                    />
                  </div>

                  {/* Card Details: Full Non-Truncated Typography & Admiralty Badges */}
                  <div className="mt-2 flex flex-col justify-between flex-1">
                    <div>
                      <h3 className="font-bold text-xs sm:text-[13px] text-white tracking-tight leading-snug group-hover:text-amber-200 transition-colors line-clamp-2 min-h-[2rem]">
                        {folder.name}
                      </h3>
                      
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
                        <span>{folder.fileCount} documents</span>
                      </p>
                    </div>

                    {/* Footer Row: Status Pill or Action Chevron */}
                    {folder.extraInfo ? (
                      <div className="mt-2 pt-2 border-t border-amber-400/20 flex items-center justify-between gap-1">
                        <span className="text-[10px] font-semibold text-amber-300 leading-tight">
                          Current IEP on file
                        </span>
                        <div className="w-5 h-5 rounded-full border border-amber-400/40 bg-amber-400/10 flex items-center justify-center text-amber-300 group-hover:bg-amber-400 group-hover:text-[#051329] group-hover:border-amber-300 transition-all shrink-0">
                          <ChevronRight className="w-3 h-3 stroke-[2.5]" />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-end">
                        <div className="w-5 h-5 rounded-full border border-white/20 bg-white/5 flex items-center justify-center text-white/60 group-hover:border-[#C5A059] group-hover:bg-[#C5A059] group-hover:text-[#051329] transition-all shrink-0">
                          <ChevronRight className="w-3 h-3 stroke-[2.5]" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── ZONE 4: RECENTLY ADDED + FILE HEALTH AREA ─────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* LEFT: RECENTLY ADDED (~58% width) */}
          <div className="lg:col-span-7 rounded-2xl bg-[#051329] border border-blue-900/60 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col justify-between">
            
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white">
                    RECENTLY ADDED
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAllDocsModal(true)}
                  className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>View All Documents</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Rows List */}
              <div className="divide-y divide-white/5">
                {documents.slice(0, 5).map((doc) => {
                  const isCurrent = doc.documentType === "Current IEP" || doc.id === currentIepDoc.id;
                  
                  return (
                    <div 
                      key={doc.id}
                      className="py-3 flex items-center justify-between gap-3 group hover:bg-white/[0.02] -mx-2 px-2 rounded-xl transition-colors"
                    >
                      {/* File Icon & Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        {renderFileTypeBadge(doc.fileType)}

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
                              {doc.title}
                            </span>
                            
                            {isCurrent && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#052E16] text-[#34D399] border border-emerald-500/40">
                                Current IEP
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {doc.updatedAt} • {doc.fileSize}
                          </p>
                        </div>
                      </div>

                      {/* Right Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          onClick={() => setSelectedDocForPreview(doc)}
                          className="h-7 px-3 text-xs font-semibold rounded-full bg-[#081F42] hover:bg-[#0c2f66] text-slate-200 border border-blue-700/50 cursor-pointer shadow-sm"
                        >
                          View
                        </Button>

                        {/* Overflow Actions */}
                        <div className="relative">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownDocId((prev) => prev === doc.id ? null : doc.id);
                            }}
                            className="h-7 w-7 p-0 rounded-full text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>

                          {activeDropdownDocId === doc.id && (
                            <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-blue-900/60 bg-[#07162B] shadow-2xl p-1.5 text-xs space-y-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownDocId(null);
                                  setSelectedDocForPreview(doc);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-2 text-slate-200"
                              >
                                <Eye className="w-3.5 h-3.5 text-sky-400" />
                                <span>Preview Document</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownDocId(null);
                                  toast.success(`Downloading ${doc.title}...`);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-2 text-slate-200"
                              >
                                <Download className="w-3.5 h-3.5 text-amber-400" />
                                <span>Download File</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownDocId(null);
                                  setAnalysisModalFileId(Number(doc.id.replace(/\D/g, "")) || 1);
                                  setAnalysisModalFileName(doc.title);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-2 text-slate-200"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                <span>AI Analysis</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: COMMON DOCUMENTS ON FILE & UPDATED (~42% width) */}
          <div className="lg:col-span-5 rounded-2xl bg-gradient-to-br from-[#06152B] via-[#041021] to-[#020A17] border border-[#1E3A5F] hover:border-[#C5A059]/40 p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.6)] relative overflow-hidden flex flex-col justify-between transition-all">
            
            {/* Abstract Luxury Midnight Navy & Gold Flowing Ambient Background */}
            <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden">
              <img 
                src="/assets/vault/vault_abstract_card_bg.jpg" 
                alt="" 
                className="w-full h-full object-cover opacity-40 mix-blend-screen"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#020A17] via-[#041021]/80 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#06152B]/90 via-[#06152B]/40 to-transparent" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-amber-400/10 via-transparent to-transparent blur-2xl" />
            </div>

            {/* Front Reassuring Information */}
            <div className="relative z-10">
              
              {/* Header Badge & Title */}
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider bg-amber-400/15 border border-amber-400/40 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.15)]">
                  <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                  Common Documents
                </span>
                <span className="text-[11px] font-mono text-slate-300">
                  {documents.length} Vault Records
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight leading-tight">
                Documents We Keep On File & Updated
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mt-1 mb-3.5 max-w-sm">
                Key records {studentFirstName}’s advocate team reviews and keeps updated to protect educational rights.
              </p>

              {/* Modern Record Status Cards: Unified Front Icon, Zero Overlap */}
              <div className="space-y-3 sm:space-y-3.5">
                
                {/* 1. Current IEP / 504 Plan (ALWAYS ON THE SAME LINE) */}
                <div 
                  onClick={handleInitiateUpload}
                  className="rounded-xl bg-[#020A17]/85 hover:bg-[#071933] border border-[#1E3A5F]/70 hover:border-[#C5A059]/60 p-3 sm:p-3.5 flex items-center gap-3.5 transition-all cursor-pointer group shadow-sm"
                >
                  {/* Front Status Indicator */}
                  <div className="shrink-0">
                    {(documentsSummary.hasCurrentIep || documentsSummary.hasCurrent504) ? (
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-[0_0_12px_rgba(52,211,153,0.25)] group-hover:scale-105 transition-transform">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 stroke-[2.4]" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400/80 flex items-center justify-center group-hover:border-amber-400/60 transition-colors">
                        <Circle className="w-4.5 h-4.5 text-amber-400/70 stroke-[2]" />
                      </div>
                    )}
                  </div>

                  {/* Clean Text Block with 100% Horizontal Clearance - No Truncate/Trailing Off */}
                  <div className="min-w-0 flex-1">
                    <span className="text-xs sm:text-[13px] font-bold text-white whitespace-nowrap block">
                      Current IEP / 504 Plan
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] leading-snug">
                      {(documentsSummary.hasCurrentIep || documentsSummary.hasCurrent504) ? (
                        <span className="font-semibold text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          <span>On file · Updated {currentIepDate}</span>
                        </span>
                      ) : (
                        <span className="font-medium text-amber-400/90 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                          <span>Needed · Annual IEP / 504 plan</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Trigger Arrow */}
                  <div className="shrink-0 text-slate-500 group-hover:text-amber-300 transition-colors pl-1">
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                {/* 2. Latest Evaluation Report */}
                <div 
                  onClick={handleInitiateUpload}
                  className="rounded-xl bg-[#020A17]/85 hover:bg-[#071933] border border-[#1E3A5F]/70 hover:border-[#C5A059]/60 p-3 sm:p-3.5 flex items-center gap-3.5 transition-all cursor-pointer group shadow-sm"
                >
                  {/* Front Status Indicator */}
                  <div className="shrink-0">
                    {documentsSummary.hasEvaluation ? (
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-[0_0_12px_rgba(52,211,153,0.25)] group-hover:scale-105 transition-transform">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 stroke-[2.4]" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-white/5 border border-slate-700/70 text-slate-500 flex items-center justify-center group-hover:border-slate-500 transition-colors">
                        <Circle className="w-4.5 h-4.5 text-slate-500 stroke-[2]" />
                      </div>
                    )}
                  </div>

                  {/* Clean Text Block with 100% Horizontal Clearance - No Truncate/Trailing Off */}
                  <div className="min-w-0 flex-1">
                    <span className="text-xs sm:text-[13px] font-bold text-white whitespace-nowrap block">
                      Latest Evaluation Report
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] leading-snug">
                      {documentsSummary.hasEvaluation ? (
                        <span className="font-semibold text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          <span>On file · Evaluation on record</span>
                        </span>
                      ) : (
                        <span className="font-medium text-slate-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                          <span>Recommended · Speech, Psych, or OT</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Trigger Arrow */}
                  <div className="shrink-0 text-slate-500 group-hover:text-amber-300 transition-colors pl-1">
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                {/* 3. Recent Progress Report */}
                <div 
                  onClick={handleInitiateUpload}
                  className="rounded-xl bg-[#020A17]/85 hover:bg-[#071933] border border-[#1E3A5F]/70 hover:border-[#C5A059]/60 p-3 sm:p-3.5 flex items-center gap-3.5 transition-all cursor-pointer group shadow-sm"
                >
                  {/* Front Status Indicator */}
                  <div className="shrink-0">
                    {documentsSummary.hasProgressReport ? (
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-[0_0_12px_rgba(52,211,153,0.25)] group-hover:scale-105 transition-transform">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 stroke-[2.4]" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-white/5 border border-slate-700/70 text-slate-500 flex items-center justify-center group-hover:border-slate-500 transition-colors">
                        <Circle className="w-4.5 h-4.5 text-slate-500 stroke-[2]" />
                      </div>
                    )}
                  </div>

                  {/* Clean Text Block with 100% Horizontal Clearance - No Truncate/Trailing Off */}
                  <div className="min-w-0 flex-1">
                    <span className="text-xs sm:text-[13px] font-bold text-white whitespace-nowrap block">
                      Recent Progress Report
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] leading-snug">
                      {documentsSummary.hasProgressReport ? (
                        <span className="font-semibold text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          <span>On file · Benchmark progress reports</span>
                        </span>
                      ) : (
                        <span className="font-medium text-slate-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                          <span>Recommended · Goal progress updates</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Trigger Arrow */}
                  <div className="shrink-0 text-slate-500 group-hover:text-amber-300 transition-colors pl-1">
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Outlined Gold CTA Button */}
            <div className="relative z-10 pt-4">
              <Button
                type="button"
                onClick={handleInitiateUpload}
                className="w-full h-10 rounded-xl bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-extrabold text-xs sm:text-[13px] shadow-[0_4px_16px_rgba(0,0,0,0.6)] border border-[#FFE394]/60 gap-2 cursor-pointer transition-all active:scale-[0.99]"
              >
                <UploadCloud className="w-4 h-4 text-[#07162B] stroke-[2.5]" />
                <span>Upload New Document</span>
              </Button>
              <p className="text-[11px] text-slate-400 text-center mt-1.5 font-medium">
                Keep {studentFirstName}’s records complete and advocate-ready.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* ── MODALS & FUNCTIONALITY ────────────────────────────────────────── */}

      {/* Modal 1: Document Preview */}
      <Dialog open={!!selectedDocForPreview} onOpenChange={(open) => !open && setSelectedDocForPreview(null)}>
        {selectedDocForPreview && (
          <DialogContent className="max-w-lg bg-[#07162B] border-blue-900/60 text-white rounded-2xl p-6 shadow-2xl">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/40 text-[10px]">
                  {selectedDocForPreview.workspaceName}
                </Badge>
                <span className="text-[10px] text-slate-400">{selectedDocForPreview.fileSize}</span>
              </div>
              <DialogTitle className="text-base md:text-lg font-bold text-white break-words">
                {selectedDocForPreview.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300 mt-1">
                Uploaded by {selectedDocForPreview.uploadedBy} • Last updated {selectedDocForPreview.updatedAt}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 my-3">
              <div className="p-4 rounded-xl bg-[#030E1F] border border-blue-900/40 text-xs text-slate-200 leading-relaxed">
                <p className="font-semibold text-amber-400 mb-1">Document Summary:</p>
                <p>{selectedDocForPreview.summary || "Permanent student educational document safely archived in encrypted vault."}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-[#030E1F] border border-blue-900/40">
                  <span className="text-slate-400 block text-[10px]">Encryption Status:</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> AES-256 Vault Stored
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#030E1F] border border-blue-900/40">
                  <span className="text-slate-400 block text-[10px]">Authoritative Status:</span>
                  <span className="font-bold text-white mt-0.5 block">
                    {selectedDocForPreview.documentType === "Current IEP" ? "★ Authoritative IEP" : "Verified Record"}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedDocForPreview(null);
                  setAnalysisModalFileId(Number(selectedDocForPreview.id.replace(/\D/g, "")) || 1);
                  setAnalysisModalFileName(selectedDocForPreview.title);
                }}
                className="border-purple-500/40 text-purple-300 hover:bg-purple-500/10 text-xs rounded-xl gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                AI Document Analysis
              </Button>

              <Button
                onClick={() => {
                  toast.success(`Downloading ${selectedDocForPreview.title}...`);
                  setSelectedDocForPreview(null);
                }}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Download Document
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Modal 2: Folder Contents Viewer */}
      <Dialog open={!!activeWorkspaceModal} onOpenChange={(open) => !open && setActiveWorkspaceModal(null)}>
        {activeWorkspaceModal && (
          <DialogContent className="max-w-2xl bg-[#07162B] border-blue-900/60 text-white rounded-2xl p-6 shadow-2xl">
            <DialogHeader>
              <div className="flex items-center gap-2.5">
                <img src={activeWorkspaceModal.iconSrc} alt="" className="w-10 h-10 object-contain drop-shadow-md" />
                <DialogTitle className="text-lg font-bold text-white">
                  {activeWorkspaceModal.name}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-300 mt-1">
                {activeWorkspaceModal.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 my-3 max-h-[350px] overflow-y-auto pr-1">
              {documents
                .filter((d) => d.workspaceId === activeWorkspaceModal.id)
                .map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setActiveWorkspaceModal(null);
                      setSelectedDocForPreview(doc);
                    }}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#030E1F] hover:bg-blue-900/30 border border-blue-900/40 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      {renderFileTypeBadge(doc.fileType)}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{doc.title}</p>
                        <p className="text-[10px] text-slate-400">{doc.fileSize} • Updated {doc.updatedAt}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-amber-400 text-xs hover:bg-amber-400/10">
                      View
                    </Button>
                  </div>
                ))}

              {documents.filter((d) => d.workspaceId === activeWorkspaceModal.id).length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No documents in this category yet.
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setActiveWorkspaceModal(null)}
                className="border-blue-900/60 text-slate-200 hover:bg-white/10 text-xs rounded-xl"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setActiveWorkspaceModal(null);
                  handleInitiateUpload();
                }}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl gap-1.5"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Upload to {activeWorkspaceModal.name}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Modal 3: View All Folders */}
      <Dialog open={showAllFoldersModal} onOpenChange={setShowAllFoldersModal}>
        <DialogContent className="max-w-2xl bg-[#07162B] border-blue-900/60 text-white rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Folder className="w-5 h-5 text-amber-400 fill-amber-400" />
              All Document Folders
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300 mt-1">
              Browse all 7 organized document categories for {studentFullName}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3 max-h-[400px] overflow-y-auto pr-1">
            {dynamicWorkspaces.map((ws) => (
              <div
                key={ws.id}
                onClick={() => {
                  setShowAllFoldersModal(false);
                  setActiveWorkspaceModal(ws);
                }}
                className="p-3.5 rounded-xl bg-[#030E1F] hover:bg-blue-950/40 border border-blue-900/50 flex items-center gap-3 cursor-pointer group transition-all"
              >
                <img src={ws.iconSrc} alt="" className="w-12 h-12 object-contain shrink-0 drop-shadow-md group-hover:scale-110 transition-transform" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                    {ws.name}
                  </p>
                  <p className="text-[11px] text-slate-400">{ws.fileCount} documents</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white" />
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAllFoldersModal(false)}
              className="border-blue-900/60 text-slate-200 hover:bg-white/10 text-xs rounded-xl"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 4: View All Documents */}
      <Dialog open={showAllDocsModal} onOpenChange={setShowAllDocsModal}>
        <DialogContent className="max-w-2xl bg-[#07162B] border-blue-900/60 text-white rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              All Documents ({documents.length})
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300 mt-1">
              Complete archive of records stored in {studentFirstName}’s Document Vault.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 my-3 max-h-[400px] overflow-y-auto pr-1 divide-y divide-white/5">
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => {
                  setShowAllDocsModal(false);
                  setSelectedDocForPreview(doc);
                }}
                className="pt-2.5 pb-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.03] px-2 rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {renderFileTypeBadge(doc.fileType)}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{doc.title}</p>
                    <p className="text-[10px] text-slate-400">{doc.workspaceName} • {doc.fileSize} • {doc.updatedAt}</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="text-xs text-sky-400 hover:bg-sky-400/10 h-7 px-2.5">
                  View
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAllDocsModal(false)}
              className="border-blue-900/60 text-slate-200 hover:bg-white/10 text-xs rounded-xl"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 5: Camera Scanner Modal */}
      <CameraScannerModal
        isOpen={showCameraScannerModal}
        onClose={() => setShowCameraScannerModal(false)}
        studentName={studentFullName}
        studentId={studentId}
      />

      {/* Modal 6: Pre-Enrollment Acknowledgment Modal */}
      <PreEnrollmentAcknowledgmentModal
        open={showPreEnrollmentAckModal}
        onOpenChange={setShowPreEnrollmentAckModal}
        studentName={studentFullName}
        studentId={studentId}
        onAcknowledged={() => {
          setLocalAckAccepted(true);
          refetchVaultStatus();
          setShowStatusAwareUploadModal(true);
        }}
      />

      {/* Modal 7: Status-Aware Upload Modal */}
      <StatusAwareUploadModal
        open={showStatusAwareUploadModal}
        onOpenChange={setShowStatusAwareUploadModal}
        studentId={studentId}
        studentName={studentFullName}
        isRelationshipActive={isRelationshipActive}
        hasCurrentPlan={isRelationshipActive}
        onViewAcknowledgment={() => setShowViewAckModal(true)}
        onUploadComplete={() => {
          refetchVaultFiles();
          refetchVaultStatus();
        }}
      />

      {/* Modal 8: View Pre-Enrollment Acknowledgment Modal */}
      <ViewAcknowledgmentModal
        open={showViewAckModal}
        onOpenChange={setShowViewAckModal}
        metadata={vaultStatus?.acknowledgmentMetadata}
      />

      {/* Modal 9: AI Document Intelligence Analysis Modal */}
      <AiDocumentAnalysisModal
        isOpen={!!analysisModalFileId}
        onClose={() => {
          setAnalysisModalFileId(null);
          setAnalysisModalFileName("");
        }}
        fileId={analysisModalFileId}
        fileName={analysisModalFileName}
      />

    </div>
  );
}
