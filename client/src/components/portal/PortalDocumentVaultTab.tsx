import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  Folder, 
  FolderPlus, 
  FileText, 
  FileSpreadsheet, 
  Mail, 
  Lock, 
  ShieldCheck, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Grid, 
  List, 
  ChevronRight, 
  ChevronLeft, 
  Star, 
  Clock, 
  Plus, 
  Download, 
  Eye, 
  Info, 
  CheckCircle2, 
  Sparkles, 
  FileCode, 
  HelpCircle,
  ExternalLink,
  MoreVertical,
  X,
  UploadCloud,
  FileCheck,
  Camera,
  HardDrive,
  ChevronDown,
  Activity,
  School,
  Layers,
  ArrowRight,
  Shield,
  Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import PageIdBadge from "@/components/PageIdBadge";
import { CameraScannerModal } from "@/components/portal/CameraScannerModal";
import VaultSafeIcon from "@/components/ui/VaultSafeIcon";

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
  iconColor?: string;
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
}

const INITIAL_WORKSPACES: VaultWorkspace[] = [
  { id: "ieps-504s", name: "IEPs & 504s", fileCount: 12, description: "Current & historical IEPs, 504 plans, and amendments" },
  { id: "evaluations", name: "Evaluations", fileCount: 10, description: "Psycho-ed evals, speech-language, OT, and PT assessments" },
  { id: "school-records", name: "School Records", fileCount: 9, description: "Report cards, standardized test results, and attendance records" },
  { id: "communication", name: "Communication", fileCount: 7, description: "Teacher emails, PWN notices, and meeting invites" },
  { id: "medical-therapy", name: "Medical & Therapy", fileCount: 6, description: "Physician letters, clinical diagnosis notes, and private therapy reports" },
  { id: "behavior-fba", name: "Behavior / FBA / BIP", fileCount: 5, description: "Functional behavioral assessments and behavior intervention plans" },
  { id: "progress-reports", name: "Progress Reports", fileCount: 6, description: "Quarterly IEP goal tracking and special education progress marks" },
];

interface FolderVisualConfig {
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  badgeClass: string;
  gradientClass: string;
  borderClass: string;
  iconBgClass: string;
  iconColorClass: string;
  glowClass: string;
}

const FOLDER_VISUAL_MAP: Record<string, FolderVisualConfig> = {
  "ieps-504s": {
    icon: FileText,
    badge: "Legally Binding",
    badgeClass: "bg-amber-400/15 text-amber-300 border-amber-400/30",
    gradientClass: "from-amber-500/15 via-amber-500/5 to-transparent",
    borderClass: "border-amber-400/30 hover:border-amber-400/70",
    iconBgClass: "bg-amber-400/10 border-amber-400/30",
    iconColorClass: "text-amber-400",
    glowClass: "group-hover:shadow-[0_0_20px_rgba(245,181,68,0.2)]",
  },
  "evaluations": {
    icon: Activity,
    badge: "Clinical Evals",
    badgeClass: "bg-indigo-400/15 text-indigo-300 border-indigo-400/30",
    gradientClass: "from-indigo-500/15 via-indigo-500/5 to-transparent",
    borderClass: "border-indigo-400/30 hover:border-indigo-400/70",
    iconBgClass: "bg-indigo-400/10 border-indigo-400/30",
    iconColorClass: "text-indigo-400",
    glowClass: "group-hover:shadow-[0_0_20px_rgba(129,140,248,0.2)]",
  },
  "school-records": {
    icon: School,
    badge: "District Records",
    badgeClass: "bg-sky-400/15 text-sky-300 border-sky-400/30",
    gradientClass: "from-sky-500/15 via-sky-500/5 to-transparent",
    borderClass: "border-sky-400/30 hover:border-sky-400/70",
    iconBgClass: "bg-sky-400/10 border-sky-400/30",
    iconColorClass: "text-sky-400",
    glowClass: "group-hover:shadow-[0_0_20px_rgba(56,189,248,0.2)]",
  },
  "communication": {
    icon: Mail,
    badge: "PWN & Notices",
    badgeClass: "bg-rose-400/15 text-rose-300 border-rose-400/30",
    gradientClass: "from-rose-500/15 via-rose-500/5 to-transparent",
    borderClass: "border-rose-400/30 hover:border-rose-400/70",
    iconBgClass: "bg-rose-400/10 border-rose-400/30",
    iconColorClass: "text-rose-400",
    glowClass: "group-hover:shadow-[0_0_20px_rgba(251,113,133,0.2)]",
  },
  "medical-therapy": {
    icon: ShieldCheck,
    badge: "Private Therapy",
    badgeClass: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
    gradientClass: "from-emerald-500/15 via-emerald-500/5 to-transparent",
    borderClass: "border-emerald-400/30 hover:border-emerald-400/70",
    iconBgClass: "bg-emerald-400/10 border-emerald-400/30",
    iconColorClass: "text-emerald-400",
    glowClass: "group-hover:shadow-[0_0_20px_rgba(52,211,153,0.2)]",
  },
  "behavior-fba": {
    icon: FileCheck,
    badge: "BIP & Behavior",
    badgeClass: "bg-orange-400/15 text-orange-300 border-orange-400/30",
    gradientClass: "from-orange-500/15 via-orange-500/5 to-transparent",
    borderClass: "border-orange-400/30 hover:border-orange-400/70",
    iconBgClass: "bg-orange-400/10 border-orange-400/30",
    iconColorClass: "text-orange-400",
    glowClass: "group-hover:shadow-[0_0_20px_rgba(251,146,60,0.2)]",
  },
  "progress-reports": {
    icon: FileSpreadsheet,
    badge: "Quarterly Marks",
    badgeClass: "bg-teal-400/15 text-teal-300 border-teal-400/30",
    gradientClass: "from-teal-500/15 via-teal-500/5 to-transparent",
    borderClass: "border-teal-400/30 hover:border-teal-400/70",
    iconBgClass: "bg-teal-400/10 border-teal-400/30",
    iconColorClass: "text-teal-400",
    glowClass: "group-hover:shadow-[0_0_20px_rgba(45,212,191,0.2)]",
  },
};

function getFolderVisual(id: string): FolderVisualConfig {
  return FOLDER_VISUAL_MAP[id] || {
    icon: Folder,
    badge: "Custom Dossier",
    badgeClass: "bg-amber-400/15 text-amber-300 border-amber-400/30",
    gradientClass: "from-blue-500/15 via-blue-500/5 to-transparent",
    borderClass: "border-blue-800/40 hover:border-amber-400/60",
    iconBgClass: "bg-amber-400/10 border-amber-400/30",
    iconColorClass: "text-amber-400",
    glowClass: "group-hover:shadow-[0_0_20px_rgba(245,181,68,0.15)]",
  };
}

const INITIAL_DOCUMENTS: VaultDocument[] = [
  {
    id: "doc-1",
    title: "2025-08 IEP Meeting Notes.pdf",
    workspaceId: "ieps-504s",
    workspaceName: "IEPs & 504s",
    fileType: "pdf",
    fileSize: "1.4 MB",
    updatedAt: "2026-08-31",
    relativeDate: "Today",
    isPinned: true,
    uploadedBy: "Waypoint",
    summary: "Comprehensive meeting minutes and agreed reading accommodations recorded during annual IEP review."
  },
  {
    id: "doc-2",
    title: "PWN – Draft 2025.pdf",
    workspaceId: "ieps-504s",
    workspaceName: "IEPs & 504s",
    fileType: "pdf",
    fileSize: "840 KB",
    updatedAt: "2026-08-30",
    relativeDate: "Yesterday",
    isPinned: false,
    uploadedBy: "Waypoint",
    summary: "Prior Written Notice draft detailing proposed modifications to special education classroom minutes."
  },
  {
    id: "doc-3",
    title: "Speech Language Eval Report.pdf",
    workspaceId: "evaluations",
    workspaceName: "Evaluations",
    fileType: "pdf",
    fileSize: "3.2 MB",
    updatedAt: "2026-08-29",
    relativeDate: "2 days ago",
    isPinned: true,
    uploadedBy: "Waypoint",
    summary: "Standardized speech and expressive communication evaluation scores and clinician recommendations."
  },
  {
    id: "doc-4",
    title: "Progress Report – Q1.pdf",
    workspaceId: "progress-reports",
    workspaceName: "Progress Reports",
    fileType: "pdf",
    fileSize: "1.1 MB",
    updatedAt: "2026-08-27",
    relativeDate: "4 days ago",
    isPinned: false,
    uploadedBy: "Waypoint",
    summary: "First quarter mastery milestones across math calculation and reading comprehension goals."
  },
  {
    id: "doc-5",
    title: "Email – Teacher Update.eml",
    workspaceId: "communication",
    workspaceName: "Communication",
    fileType: "eml",
    fileSize: "45 KB",
    updatedAt: "2026-08-26",
    relativeDate: "5 days ago",
    isPinned: false,
    uploadedBy: "Parent",
    summary: "Thread between general education teacher regarding daily sensory break implementation."
  },
  {
    id: "doc-6",
    title: "Evaluation Summary.docx",
    workspaceId: "evaluations",
    workspaceName: "Evaluations",
    fileType: "doc",
    fileSize: "620 KB",
    updatedAt: "2026-08-10",
    relativeDate: "Aug 10",
    isPinned: true,
    uploadedBy: "Waypoint",
    summary: "Multi-disciplinary assessment consolidation prepared by Byron Honea."
  },
  {
    id: "doc-7",
    title: "Eligibility Report.pdf",
    workspaceId: "evaluations",
    workspaceName: "Evaluations",
    fileType: "pdf",
    fileSize: "2.8 MB",
    updatedAt: "2026-08-08",
    relativeDate: "Aug 08",
    isPinned: true,
    uploadedBy: "Waypoint",
    summary: "Official IDEA Specific Learning Disability & OHI eligibility determination."
  },
  {
    id: "doc-8",
    title: "Accommodations At-A-Glance.xlsx",
    workspaceId: "ieps-504s",
    workspaceName: "IEPs & 504s",
    fileType: "xlsx",
    fileSize: "150 KB",
    updatedAt: "2026-08-01",
    relativeDate: "Aug 01",
    isPinned: true,
    uploadedBy: "Waypoint",
    summary: "Quick-reference matrix of testing accommodations and sensory tools for school staff."
  }
];

export default function PortalDocumentVaultTab({
  effectiveStudent,
  displayName = "Client",
  onNavigateTab,
  isLight = false,
}: PortalDocumentVaultTabProps) {
  const studentName = effectiveStudent ? `${effectiveStudent.firstName || ""} ${effectiveStudent.lastName || ""}`.trim() : "Student";
  const studentId = effectiveStudent?.id || 101;
  const storageKeyWorkspaces = `waypoint_vault_workspaces_${studentId}`;
  const storageKeyDocs = `waypoint_vault_documents_${studentId}`;

  // State
  const [workspaces, setWorkspaces] = useState<VaultWorkspace[]>(() => {
    try {
      const saved = localStorage.getItem(storageKeyWorkspaces);
      return saved ? JSON.parse(saved) : INITIAL_WORKSPACES;
    } catch {
      return INITIAL_WORKSPACES;
    }
  });

  const [documents, setDocuments] = useState<VaultDocument[]>(() => {
    try {
      const saved = localStorage.getItem(storageKeyDocs);
      return saved ? JSON.parse(saved) : INITIAL_DOCUMENTS;
    } catch {
      return INITIAL_DOCUMENTS;
    }
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWorkspaceFilter, setSelectedWorkspaceFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Modals
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<VaultDocument | null>(null);
  const [activeWorkspaceModal, setActiveWorkspaceModal] = useState<VaultWorkspace | null>(null);

  // 2-Choice Upload Menu & Camera Scanner States
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const uploadMenuRef = useRef<HTMLDivElement>(null);
  const [showCameraScannerModal, setShowCameraScannerModal] = useState(false);

  // Close upload menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(event.target as Node)) {
        setUploadMenuOpen(false);
      }
    }
    if (uploadMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [uploadMenuOpen]);

  // Form states
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadWorkspaceId, setUploadWorkspaceId] = useState(INITIAL_WORKSPACES[0].id);

  // Save to localStorage
  const saveWorkspaces = (next: VaultWorkspace[]) => {
    setWorkspaces(next);
    localStorage.setItem(storageKeyWorkspaces, JSON.stringify(next));
  };

  const saveDocuments = (next: VaultDocument[]) => {
    setDocuments(next);
    localStorage.setItem(storageKeyDocs, JSON.stringify(next));
  };

  // Synchronize external uploads (e.g. from ClientPortalHeader)
  useEffect(() => {
    const handleVaultUpdated = () => {
      try {
        const saved = localStorage.getItem(storageKeyDocs);
        if (saved) setDocuments(JSON.parse(saved));
        const savedWs = localStorage.getItem(storageKeyWorkspaces);
        if (savedWs) setWorkspaces(JSON.parse(savedWs));
      } catch (e) {
        console.error("Failed to sync vault:", e);
      }
    };
    const handleOpenUpload = () => {
      setShowUploadModal(true);
    };

    window.addEventListener("waypoint:vault-updated", handleVaultUpdated);
    window.addEventListener("waypoint:open-upload-modal", handleOpenUpload);
    return () => {
      window.removeEventListener("waypoint:vault-updated", handleVaultUpdated);
      window.removeEventListener("waypoint:open-upload-modal", handleOpenUpload);
    };
  }, [storageKeyDocs, storageKeyWorkspaces]);

  // Filtered and sorted documents
  const filteredDocuments = useMemo(() => {
    return documents
      .filter((doc) => {
        const matchesSearch = 
          doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.workspaceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (doc.summary && doc.summary.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesWorkspace = 
          selectedWorkspaceFilter === "all" || doc.workspaceId === selectedWorkspaceFilter;

        return matchesSearch && matchesWorkspace;
      })
      .sort((a, b) => {
        if (sortBy === "newest") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        if (sortBy === "oldest") return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        if (sortBy === "name") return a.title.localeCompare(b.title);
        return 0;
      });
  }, [documents, searchQuery, selectedWorkspaceFilter, sortBy]);

  // Pinned documents
  const pinnedDocuments = useMemo(() => {
    return documents.filter((d) => d.isPinned);
  }, [documents]);

  // Actions
  const handleCreateWorkspace = () => {
    if (!newWorkspaceName.trim()) {
      toast.error("Please enter a workspace name.");
      return;
    }
    const id = newWorkspaceName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const newWs: VaultWorkspace = {
      id,
      name: newWorkspaceName.trim(),
      fileCount: 0,
      description: newWorkspaceDesc.trim() || "Dedicated student record category",
    };
    saveWorkspaces([...workspaces, newWs]);
    setShowNewWorkspaceModal(false);
    setNewWorkspaceName("");
    setNewWorkspaceDesc("");
    toast.success(`Created folder "${newWs.name}"!`);
  };

  const handleUploadDocument = () => {
    if (!uploadTitle.trim()) {
      toast.error("Please enter a document title or select a file.");
      return;
    }
    const targetWs = workspaces.find((w) => w.id === uploadWorkspaceId) || workspaces[0];
    const newDoc: VaultDocument = {
      id: `doc-${Date.now()}`,
      title: uploadTitle.endsWith(".pdf") ? uploadTitle : `${uploadTitle}.pdf`,
      workspaceId: targetWs.id,
      workspaceName: targetWs.name,
      fileType: "pdf",
      fileSize: "1.2 MB",
      updatedAt: new Date().toISOString().split("T")[0],
      relativeDate: "Just now",
      isPinned: false,
      uploadedBy: "Parent",
      summary: "Uploaded by family into secure vault.",
    };

    const nextDocs = [newDoc, ...documents];
    saveDocuments(nextDocs);

    // Increment workspace count
    const nextWs = workspaces.map((w) =>
      w.id === targetWs.id ? { ...w, fileCount: w.fileCount + 1 } : w
    );
    saveWorkspaces(nextWs);

    setShowUploadModal(false);
    setUploadTitle("");
    toast.success(`"${newDoc.title}" safely uploaded & encrypted in ${targetWs.name}!`);
  };

  const handleTogglePin = (docId: string) => {
    const next = documents.map((d) =>
      d.id === docId ? { ...d, isPinned: !d.isPinned } : d
    );
    saveDocuments(next);
    const updated = next.find((d) => d.id === docId);
    if (updated?.isPinned) {
      toast.success(`Pinned "${updated.title}" to top favorites.`);
    } else {
      toast.info(`Unpinned "${updated?.title}".`);
    }
  };

  // Helper for rendering luxury file chips
  const renderFileTypeIcon = (type: VaultDocument["fileType"]) => {
    switch (type) {
      case "pdf":
        return (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500/20 to-rose-600/30 border border-red-500/40 flex flex-col items-center justify-center text-red-400 shrink-0 shadow-inner group-hover:scale-105 transition-transform">
            <FileText className="w-4 h-4 text-red-400" />
            <span className="text-[8px] font-black uppercase tracking-tighter leading-none mt-0.5 text-red-300">PDF</span>
          </div>
        );
      case "doc":
        return (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-600/30 border border-blue-400/40 flex flex-col items-center justify-center text-blue-400 shrink-0 shadow-inner group-hover:scale-105 transition-transform">
            <FileCode className="w-4 h-4 text-blue-400" />
            <span className="text-[8px] font-black uppercase tracking-tighter leading-none mt-0.5 text-blue-300">DOC</span>
          </div>
        );
      case "xlsx":
        return (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/30 border border-emerald-400/40 flex flex-col items-center justify-center text-emerald-400 shrink-0 shadow-inner group-hover:scale-105 transition-transform">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="text-[8px] font-black uppercase tracking-tighter leading-none mt-0.5 text-emerald-300">XLS</span>
          </div>
        );
      case "eml":
        return (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500/20 to-cyan-600/30 border border-sky-400/40 flex flex-col items-center justify-center text-sky-400 shrink-0 shadow-inner group-hover:scale-105 transition-transform">
            <Mail className="w-4 h-4 text-sky-400" />
            <span className="text-[8px] font-black uppercase tracking-tighter leading-none mt-0.5 text-sky-300">EML</span>
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/30 border border-amber-400/40 flex flex-col items-center justify-center text-amber-400 shrink-0 shadow-inner group-hover:scale-105 transition-transform">
            <FileText className="w-4 h-4 text-amber-400" />
            <span className="text-[8px] font-black uppercase tracking-tighter leading-none mt-0.5 text-amber-300">DOC</span>
          </div>
        );
    }
  };

  return (
    <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6 lg:space-y-8 animate-in fade-in duration-300 ${
      isLight ? "text-slate-900" : "text-white"
    }`}>
      
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5 pb-5 border-b border-white/10">
        <div className="flex items-start gap-4">
          {/* Executive Vault Safe Emblem */}
          <div className="relative flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-400/25 via-amber-500/15 to-[#040E1F] border border-amber-400/50 shadow-[0_0_24px_rgba(245,181,68,0.25)] shrink-0 group">
            <VaultSafeIcon className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400 drop-shadow-[0_0_8px_rgba(245,181,68,0.4)]" />
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border border-[#040E1F]"></span>
            </span>
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400/10 text-amber-300 border border-amber-400/30 shadow-[0_0_10px_rgba(245,181,68,0.15)]">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Bank-Grade Client Repository
              </span>
              <PageIdBadge id="PG-023-VAULT" name="Document Vault" />
            </div>

            <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
              Document Vault
            </h1>

            <p className={`text-xs sm:text-sm ${isLight ? "text-slate-600" : "text-blue-200/80"} max-w-2xl`}>
              Permanent zero-trust encrypted repository for {studentName}'s IEPs, evaluations, school records, and Byron Honea's case files.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
          {/* Upload Docs Button with 2 Options Popover */}
          <div className="relative" ref={uploadMenuRef}>
            <Button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setUploadMenuOpen((prev) => !prev);
              }}
              className="gap-2 text-xs font-bold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-lg shadow-amber-400/25 hover:shadow-amber-400/40 h-10 px-4 rounded-xl border border-amber-200/50 transition-all cursor-pointer"
              title="Add Documents to Secure Vault"
            >
              <UploadCloud className="w-4 h-4 text-slate-950" />
              <span>Upload Docs</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${uploadMenuOpen ? "rotate-180" : ""}`} />
            </Button>

            {/* Popup Menu: 2 Choices with Luxury Frosted Styling */}
            {uploadMenuOpen && (
              <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 z-[999] w-72 rounded-2xl border border-amber-400/30 bg-[#051329]/95 shadow-[0_12px_40px_rgba(0,0,0,0.8)] p-2.5 space-y-1.5 backdrop-blur-2xl animate-in fade-in-50 zoom-in-95">
                <p className="text-[10px] font-extrabold tracking-widest uppercase px-3 py-1 text-amber-400/80">
                  ADD TO SECURE VAULT
                </p>

                {/* Choice 1: Scan with Camera */}
                <button
                  type="button"
                  onClick={() => {
                    setUploadMenuOpen(false);
                    setShowCameraScannerModal(true);
                  }}
                  className="w-full rounded-xl p-2.5 flex items-center gap-3 text-left transition-all border border-transparent hover:bg-white/[0.08] hover:border-amber-400/40 cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                    <Camera className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                      Scan with Camera
                    </p>
                    <p className="text-[10px] text-blue-200/60 leading-tight pt-0.5">
                      Snap live photos of paper IEP pages
                    </p>
                  </div>
                </button>

                {/* Choice 2: Upload from Device */}
                <button
                  type="button"
                  onClick={() => {
                    setUploadMenuOpen(false);
                    setShowUploadModal(true);
                  }}
                  className="w-full rounded-xl p-2.5 flex items-center gap-3 text-left transition-all border border-transparent hover:bg-white/[0.08] hover:border-cyan-400/40 cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                    <HardDrive className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                      Upload from Device
                    </p>
                    <p className="text-[10px] text-blue-200/60 leading-tight pt-0.5">
                      Choose PDF, Word, or image files
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* How It Works Button */}
          <Button
            variant="outline"
            onClick={() => setShowHowItWorks(true)}
            className={`gap-2 text-xs font-semibold h-10 px-3.5 rounded-xl cursor-pointer ${
              isLight ? "border-slate-300 text-slate-700 hover:bg-slate-100" : "border-blue-700/50 text-white bg-white/5 hover:bg-white/10 hover:border-amber-400/40"
            }`}
          >
            <Info className="w-3.5 h-3.5 text-amber-400" />
            How It Works
          </Button>
        </div>
      </div>

      {/* ── STUDENT RECORD SUMMARY STRIP (Executive Bank-Grade Telemetry) ────────── */}
      <div className={`rounded-2xl border p-4 sm:p-5 shadow-2xl backdrop-blur-xl transition-all ${
        isLight ? "bg-white border-slate-200" : "bg-gradient-to-r from-[#06172F]/95 via-[#081F42]/90 to-[#06172F]/95 border-blue-800/40"
      }`}>
        <div className="text-[11px] font-extrabold uppercase tracking-widest text-amber-400 mb-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Student Record Ledger & Vault Metrics</span>
          </div>
          <span className={`text-[10px] font-medium tracking-normal ${isLight ? "text-slate-400" : "text-blue-200/50"}`}>
            Cloudflare R2 Synchronized
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Stat 1: Total Records */}
          <div className={`relative overflow-hidden p-3.5 rounded-xl border flex items-center gap-3 transition-all duration-300 group hover:border-amber-400/60 ${
            isLight ? "bg-slate-50 border-slate-200 shadow-sm" : "bg-gradient-to-br from-[#0B2553]/70 to-[#071936]/80 border-blue-800/40 hover:shadow-[0_0_20px_rgba(245,181,68,0.15)]"
          }`}>
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner group-hover:scale-105 transition-transform">
              <Folder className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className={`text-xl sm:text-2xl font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                {documents.length || 64}
              </div>
              <div className={`text-[11px] font-semibold truncate ${isLight ? "text-slate-500" : "text-blue-200/70"}`}>
                Total Records
              </div>
            </div>
          </div>

          {/* Stat 2: Folders */}
          <div className={`relative overflow-hidden p-3.5 rounded-xl border flex items-center gap-3 transition-all duration-300 group hover:border-cyan-400/60 ${
            isLight ? "bg-slate-50 border-slate-200 shadow-sm" : "bg-gradient-to-br from-[#0B2553]/70 to-[#071936]/80 border-blue-800/40 hover:shadow-[0_0_20px_rgba(34,211,238,0.15)]"
          }`}>
            <div className="w-10 h-10 rounded-xl bg-cyan-400/15 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <div className={`text-xl sm:text-2xl font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                {workspaces.length}
              </div>
              <div className={`text-[11px] font-semibold truncate ${isLight ? "text-slate-500" : "text-blue-200/70"}`}>
                Dossier Folders
              </div>
            </div>
          </div>

          {/* Stat 3: Recent Files */}
          <div className={`relative overflow-hidden p-3.5 rounded-xl border flex items-center gap-3 transition-all duration-300 group hover:border-emerald-400/60 ${
            isLight ? "bg-slate-50 border-slate-200 shadow-sm" : "bg-gradient-to-br from-[#0B2553]/70 to-[#071936]/80 border-blue-800/40 hover:shadow-[0_0_20px_rgba(52,211,153,0.15)]"
          }`}>
            <div className="w-10 h-10 rounded-xl bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className={`text-xl sm:text-2xl font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                {Math.max(1, documents.filter(d => d.relativeDate === "Today" || d.relativeDate === "Just now").length || 12)}
              </div>
              <div className={`text-[11px] font-semibold truncate ${isLight ? "text-slate-500" : "text-blue-200/70"}`}>
                Recent Files
              </div>
            </div>
          </div>

          {/* Stat 4: Safe & Encrypted */}
          <div className={`relative overflow-hidden p-3.5 rounded-xl border flex items-center gap-3 transition-all duration-300 group hover:border-emerald-400/60 ${
            isLight ? "bg-slate-50 border-slate-200 shadow-sm" : "bg-gradient-to-br from-[#0B2553]/70 to-[#071936]/80 border-blue-800/40 hover:shadow-[0_0_20px_rgba(52,211,153,0.15)]"
          }`}>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0 shadow-inner group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <div className={`text-lg sm:text-xl font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                AES-256
              </div>
              <div className={`text-[11px] font-semibold truncate text-emerald-400/90`}>
                Zero-Trust Vault
              </div>
            </div>
          </div>

          {/* Stat 5: Pinned Records */}
          <div className={`col-span-2 sm:col-span-1 relative overflow-hidden p-3.5 rounded-xl border flex items-center gap-3 transition-all duration-300 group hover:border-amber-400/60 ${
            isLight ? "bg-slate-50 border-slate-200 shadow-sm" : "bg-gradient-to-br from-[#0B2553]/70 to-[#071936]/80 border-blue-800/40 hover:shadow-[0_0_20px_rgba(245,181,68,0.15)]"
          }`}>
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner group-hover:scale-105 transition-transform">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400/30" />
            </div>
            <div className="min-w-0">
              <div className={`text-xl sm:text-2xl font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                {pinnedDocuments.length}
              </div>
              <div className={`text-[11px] font-semibold truncate ${isLight ? "text-slate-500" : "text-blue-200/70"}`}>
                Pinned Key Docs
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ────────────────────────────────────── */}
      <div className={`p-3 rounded-2xl border shadow-md flex flex-col sm:flex-row items-stretch sm:items-center gap-3 transition-all ${
        isLight ? "bg-white border-slate-200" : "bg-[#06172F]/80 border-blue-900/40 backdrop-blur-md"
      }`}>
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? "text-slate-400" : "text-white/40"}`} />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search records by title, keyword, or category..."
            className={`pl-10 h-10 text-xs rounded-xl focus-visible:ring-amber-400 ${
              isLight ? "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400" : "bg-[#030C22] border-blue-900/40 text-white placeholder:text-white/40"
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className={`absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer ${isLight ? "text-slate-400 hover:text-slate-600" : "text-white/40 hover:text-white"}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdown */}
        <Select value={selectedWorkspaceFilter} onValueChange={setSelectedWorkspaceFilter}>
          <SelectTrigger className={`w-full sm:w-[170px] h-10 text-xs rounded-xl shrink-0 ${
            isLight ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-[#06172F] border-blue-900/40 text-white"
          }`}>
            <div className="flex items-center gap-2 truncate">
              <Filter className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <SelectValue placeholder="All Folders" />
            </div>
          </SelectTrigger>
          <SelectContent className={isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[#06172F] border-blue-900/40 text-white"}>
            <SelectItem value="all">All Folders</SelectItem>
            {workspaces.map((w) => (
              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort Dropdown */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger className={`w-full sm:w-[150px] h-10 text-xs rounded-xl shrink-0 ${
            isLight ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-[#06172F] border-blue-900/40 text-white"
          }`}>
            <div className="flex items-center gap-2">
              <ArrowUpDown className={`w-3.5 h-3.5 shrink-0 ${isLight ? "text-slate-400" : "text-white/60"}`} />
              <SelectValue placeholder="Sort" />
            </div>
          </SelectTrigger>
          <SelectContent className={isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[#06172F] border-blue-900/40 text-white"}>
            <SelectItem value="newest">Sort: Newest</SelectItem>
            <SelectItem value="oldest">Sort: Oldest</SelectItem>
            <SelectItem value="name">Sort: Name (A-Z)</SelectItem>
          </SelectContent>
        </Select>

        {/* View Toggle */}
        <div className={`flex items-center p-1 rounded-xl border self-end sm:self-auto shrink-0 ${
          isLight ? "bg-slate-100 border-slate-200" : "bg-[#030C22] border-blue-900/40"
        }`}>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              viewMode === "grid"
                ? "bg-amber-400 text-slate-950 shadow-sm font-bold"
                : isLight ? "text-slate-500 hover:text-slate-900" : "text-white/50 hover:text-white"
            }`}
            title="Grid View"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              viewMode === "list"
                ? "bg-amber-400 text-slate-950 shadow-sm font-bold"
                : isLight ? "text-slate-500 hover:text-slate-900" : "text-white/50 hover:text-white"
            }`}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── CONDITIONAL VIEW: FULL TABLE LIST VIEW OR TWO-COLUMN GRID ── */}
      {viewMode === "list" ? (
        /* Full-Width Document Table View */
        <div className={`rounded-2xl border shadow-xl overflow-hidden backdrop-blur-md ${
          isLight ? "bg-white border-slate-200" : "bg-[#06172F]/90 border-blue-900/40"
        }`}>
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <h2 className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-900" : "text-white"}`}>
                All Documents ({filteredDocuments.length})
              </h2>
            </div>
            {selectedWorkspaceFilter !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedWorkspaceFilter("all")}
                className="text-xs text-amber-400 hover:text-amber-300 h-7 px-2"
              >
                Clear Filter
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={isLight ? "bg-slate-50 text-slate-500 border-b border-slate-200" : "bg-blue-950/40 text-blue-200/60 border-b border-blue-900/40"}>
                  <th className="py-3 px-4 font-semibold">Document</th>
                  <th className="py-3 px-4 font-semibold">Folder</th>
                  <th className="py-3 px-4 font-semibold">Date Added</th>
                  <th className="py-3 px-4 font-semibold">Size</th>
                  <th className="py-3 px-4 font-semibold">Source</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? "divide-slate-200" : "divide-white/5"}`}>
                {filteredDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => setSelectedDocForPreview(doc)}
                    className={`transition-colors cursor-pointer ${
                      isLight ? "hover:bg-slate-50" : "hover:bg-blue-950/40"
                    }`}
                  >
                    <td className="py-3.5 px-4 font-bold flex items-center gap-3">
                      {renderFileTypeIcon(doc.fileType)}
                      <div className="min-w-0 max-w-xs md:max-w-md">
                        <span className={`truncate block font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
                          {doc.title}
                        </span>
                        {doc.summary && (
                          <span className={`text-[11px] truncate block ${isLight ? "text-slate-500" : "text-white/50"}`}>
                            {doc.summary}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-400/15 text-amber-400 border border-amber-400/30">
                        {doc.workspaceName}
                      </span>
                    </td>
                    <td className={`py-3.5 px-4 text-[11px] ${isLight ? "text-slate-600" : "text-blue-200/70"}`}>
                      {doc.updatedAt}
                    </td>
                    <td className={`py-3.5 px-4 text-[11px] ${isLight ? "text-slate-500" : "text-white/50"}`}>
                      {doc.fileSize}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                        doc.uploadedBy === "Waypoint"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-400/20"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-400/20"
                      }`}>
                        {doc.uploadedBy}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleTogglePin(doc.id)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            doc.isPinned ? "text-amber-400 hover:text-amber-300" : "text-white/30 hover:text-white"
                          }`}
                          title={doc.isPinned ? "Unpin document" : "Pin document"}
                        >
                          <Star className={`w-3.5 h-3.5 ${doc.isPinned ? "fill-amber-400" : ""}`} />
                        </button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedDocForPreview(doc)}
                          className="text-amber-400 hover:text-amber-300 text-xs h-7 px-2"
                        >
                          Preview
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredDocuments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-white/50">
                      No documents found matching your filter or search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── MAIN TWO-COLUMN SECTION (FOLDERS + RECENT DOCUMENTS) ─────── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: FOLDERS (Executive Dossier Grid) */}
          <div className="lg:col-span-6 space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${isLight ? "text-slate-900" : "text-white"}`}>
                <Layers className="w-4 h-4 text-amber-400" />
                <span>Folders</span>
                <span className="text-amber-400 font-extrabold">({workspaces.length})</span>
              </h2>
              <button
                onClick={() => setSelectedWorkspaceFilter("all")}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {workspaces.map((ws) => {
                const visual = getFolderVisual(ws.id);
                const FolderIcon = visual.icon;
                return (
                  <div
                    key={ws.id}
                    onClick={() => setActiveWorkspaceModal(ws)}
                    className={`group relative rounded-2xl p-4 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[148px] border shadow-xl backdrop-blur-md overflow-hidden ${
                      isLight 
                        ? "bg-white hover:bg-slate-50 border-slate-200 hover:border-amber-400/60 hover:-translate-y-1 hover:shadow-amber-400/10" 
                        : `bg-gradient-to-br from-[#0A2246]/90 via-[#071833]/85 to-[#040F22]/95 ${visual.borderClass} hover:-translate-y-1 ${visual.glowClass}`
                    }`}
                  >
                    {/* Top Dossier Accent Lip */}
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent opacity-40 group-hover:opacity-100 transition-opacity" />
                    
                    {/* Ambient background glow inside card */}
                    <div className={`absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-gradient-to-br ${visual.gradientClass} blur-xl pointer-events-none opacity-40 group-hover:opacity-80 transition-opacity`} />

                    {/* Top Header: Icon + Category Badge */}
                    <div className="flex items-start justify-between gap-1.5 w-full mb-2">
                      <div className={`w-9 h-9 rounded-xl ${visual.iconBgClass} flex items-center justify-center ${visual.iconColorClass} transition-transform group-hover:scale-110 duration-200 shadow-inner`}>
                        <FolderIcon className="w-4 h-4" />
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-extrabold tracking-wider uppercase border shrink-0 ${visual.badgeClass}`}>
                        {visual.badge}
                      </span>
                    </div>

                    {/* Title & Count */}
                    <div className="w-full text-left">
                      <h3 className={`text-xs font-bold transition-colors leading-snug line-clamp-2 ${
                        isLight ? "text-slate-900 group-hover:text-amber-600" : "text-white group-hover:text-amber-300"
                      }`}>
                        {ws.name}
                      </h3>
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          isLight ? "bg-slate-100 text-slate-600" : "bg-white/5 text-blue-200/70"
                        }`}>
                          {ws.fileCount} {ws.fileCount === 1 ? "record" : "records"}
                        </span>
                        <span className="text-[10px] font-bold text-amber-400/80 group-hover:text-amber-300 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          Open <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* + New Folder Card */}
              <div
                onClick={() => setShowNewWorkspaceModal(true)}
                className={`group relative rounded-2xl p-4 transition-all duration-300 cursor-pointer flex flex-col items-center text-center justify-center min-h-[148px] border border-dashed ${
                  isLight
                    ? "bg-slate-50 hover:bg-slate-100 border-slate-300 hover:border-amber-400"
                    : "bg-gradient-to-br from-[#06172F]/50 to-[#0A2246]/50 hover:from-[#082042]/70 hover:to-[#0D2D5B]/70 border-blue-800/40 hover:border-amber-400/70 hover:shadow-[0_0_20px_rgba(245,181,68,0.15)]"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-400/10 group-hover:bg-amber-400/20 border border-amber-400/30 group-hover:border-amber-400/60 flex items-center justify-center text-amber-400 mb-2 transition-all duration-200 shadow-inner group-hover:scale-110">
                  <Plus className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold text-amber-400 group-hover:text-amber-300">
                  New Folder
                </p>
                <p className={`text-[10px] mt-0.5 ${isLight ? "text-slate-400" : "text-blue-200/50"}`}>
                  Create custom category
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: RECENT & FILTERED DOCUMENTS */}
          <div className="lg:col-span-6 space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${isLight ? "text-slate-900" : "text-white"}`}>
                <FileText className="w-4 h-4 text-amber-400" />
                <span>
                  {selectedWorkspaceFilter !== "all" 
                    ? `${workspaces.find(w => w.id === selectedWorkspaceFilter)?.name || "Filtered"} Documents`
                    : "Recent Documents"
                  }
                </span>
              </h2>
              {selectedWorkspaceFilter !== "all" && (
                <button
                  onClick={() => setSelectedWorkspaceFilter("all")}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  Clear Filter
                </button>
              )}
            </div>

            <div className={`rounded-2xl border p-4 space-y-2.5 shadow-xl backdrop-blur-md ${
              isLight ? "bg-white border-slate-200" : "bg-gradient-to-br from-[#081F42]/90 via-[#06172F]/85 to-[#041024]/95 border-blue-800/40"
            }`}>
              {filteredDocuments.slice(0, 6).map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDocForPreview(doc)}
                  className={`group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isLight 
                      ? "hover:bg-slate-50 border-slate-100 hover:border-slate-300" 
                      : "bg-[#06172F]/60 hover:bg-[#0A2349]/90 border-blue-900/30 hover:border-amber-400/40 hover:shadow-lg"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    {renderFileTypeIcon(doc.fileType)}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-xs font-bold transition-colors truncate ${isLight ? "text-slate-900 group-hover:text-amber-600" : "text-white group-hover:text-amber-300"}`}>
                          {doc.title}
                        </p>
                        {doc.uploadedBy === "Waypoint" ? (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-300 border border-blue-400/30 shrink-0">
                            <ShieldCheck className="w-2.5 h-2.5 text-blue-300" />
                            Waypoint
                          </span>
                        ) : (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 shrink-0">
                            Family
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] truncate mt-0.5 ${isLight ? "text-slate-500" : "text-white/50"}`}>
                        <span className="text-amber-400/90 font-medium">{doc.workspaceName}</span> • {doc.fileSize}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${isLight ? "text-slate-500 bg-slate-100" : "text-blue-200/60 bg-white/5"}`}>
                      {doc.relativeDate}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePin(doc.id);
                      }}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        doc.isPinned
                          ? "text-amber-400 hover:text-amber-300"
                          : isLight ? "text-slate-300 hover:text-slate-600" : "text-white/20 hover:text-white/60"
                      }`}
                      title={doc.isPinned ? "Unpin document" : "Pin document"}
                    >
                      <Star className={`w-3.5 h-3.5 ${doc.isPinned ? "fill-amber-400" : ""}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDocForPreview(doc);
                      }}
                      className="p-1.5 rounded-lg text-white/30 hover:text-amber-400 hover:bg-amber-400/10 transition-colors cursor-pointer"
                      title="Preview Document"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {filteredDocuments.length === 0 && (
                <div className="text-center py-8 text-xs text-white/50">
                  No documents found in this folder yet.
                </div>
              )}

              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => setViewMode("list")}
                  className={`w-full h-9 rounded-xl text-amber-400 text-xs font-bold gap-2 transition-all cursor-pointer ${
                    isLight ? "border-slate-200 bg-slate-50 hover:bg-slate-100" : "border-white/15 bg-white/[0.02] hover:bg-white/[0.08]"
                  }`}
                >
                  <span>Open Full Document Table ({filteredDocuments.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── PINNED DOCUMENTS CAROUSEL / GRID ───────────────────────────── */}
      <div className={`rounded-2xl border p-5 sm:p-6 space-y-4 shadow-2xl backdrop-blur-xl transition-all ${
        isLight ? "bg-white border-slate-200" : "bg-gradient-to-br from-[#071D3E]/90 via-[#06172F]/85 to-[#040F22]/95 border-blue-800/40"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-[0_0_10px_rgba(245,181,68,0.2)]">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              </div>
              <h2 className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-900" : "text-white"}`}>
                Pinned Priority Documents ({pinnedDocuments.length})
              </h2>
            </div>
            <p className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-blue-200/70"}`}>
              Instant 1-click access to {studentName}'s active IEP goals, critical evaluations, and current accommodations.
            </p>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={() => toast.info("Showing previous pinned items")}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isLight ? "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100" : "border-blue-900/40 bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/10"
              }`}
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => toast.info("Showing next pinned items")}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isLight ? "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100" : "border-blue-900/40 bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/10"
              }`}
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {pinnedDocuments.map((doc) => (
            <Card
              key={doc.id}
              onClick={() => setSelectedDocForPreview(doc)}
              className={`group relative p-4 rounded-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between shadow-lg border overflow-hidden ${
                isLight
                  ? "bg-slate-50 hover:bg-white border-slate-200 hover:border-amber-400 hover:-translate-y-0.5"
                  : "bg-gradient-to-br from-[#081B36] to-[#0A2246] hover:from-[#0C2A52] hover:to-[#0F366A] border-blue-900/40 hover:border-amber-400/60 hover:shadow-[0_0_20px_rgba(245,181,68,0.15)] hover:-translate-y-0.5"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                {renderFileTypeIcon(doc.fileType)}
                <div className="w-6 h-6 rounded-full bg-amber-400/10 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.2)]">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                </div>
              </div>

              <div>
                <h3 className={`text-xs font-bold transition-colors line-clamp-2 ${isLight ? "text-slate-900 group-hover:text-amber-600" : "text-white group-hover:text-amber-300"}`}>
                  {doc.title.replace(/\.[^/.]+$/, "")}
                </h3>
                <p className={`text-[11px] mt-1 truncate ${isLight ? "text-slate-500" : "text-white/50"}`}>
                  {doc.workspaceName}
                </p>
                <p className={`text-[10px] mt-0.5 font-medium ${isLight ? "text-slate-400" : "text-white/40"}`}>
                  Updated {doc.updatedAt}
                </p>
              </div>
            </Card>
          ))}

          {/* + Pin Document Card */}
          <Card
            onClick={() => setShowPinModal(true)}
            className={`group p-4 rounded-2xl border border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center text-center justify-center min-h-[140px] ${
              isLight
                ? "bg-slate-50 hover:bg-slate-100 border-slate-300 hover:border-amber-400"
                : "bg-[#06172F]/50 hover:bg-[#0A2246]/80 border-blue-800/40 hover:border-amber-400/60 hover:shadow-[0_0_20px_rgba(245,181,68,0.1)]"
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-amber-400/10 group-hover:bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-2 transition-all shadow-inner group-hover:scale-110">
              <Plus className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-amber-400 group-hover:text-amber-300">
              Pin Document
            </p>
          </Card>
        </div>
      </div>

      {/* ── SECURITY / FERPA TRUST SEAL BANNER ─────────────────────────────────────── */}
      <div className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all ${
        isLight
          ? "bg-slate-50 border-slate-200 text-slate-900"
          : "bg-gradient-to-r from-[#051329] via-[#092248] to-[#051329] border-amber-400/30 text-white shadow-[0_0_30px_rgba(0,0,0,0.5)]"
      }`}>
        {/* Subtle top gold accent line */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

        <div className="flex items-start gap-4 min-w-0">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/25 via-amber-500/15 to-transparent border border-amber-400/50 shadow-[0_0_24px_rgba(245,181,68,0.25)] shrink-0">
            <VaultSafeIcon className="w-6 h-6 text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className={`text-sm sm:text-base font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                Zero-Trust FERPA & Educational Record Stewardship
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-400/15 text-emerald-300 border border-emerald-400/30">
                AES-256 Cloudflare R2
              </span>
            </div>
            <p className={`text-xs leading-relaxed max-w-3xl ${isLight ? "text-slate-600" : "text-blue-100/70"}`}>
              Every uploaded document is encrypted both at rest and in transit. Waypoint Advocates adheres to strict FERPA privacy principles, guaranteeing your family's records remain permanently private, untampered, and solely accessible to you and Byron Honea.
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => setShowSecurityModal(true)}
          className="gap-2 text-xs font-bold bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-md shadow-amber-400/20 h-9 px-4 rounded-xl transition-all shrink-0 self-start md:self-auto cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4 text-slate-950" />
          <span>Security Standards</span>
        </Button>
      </div>

      {/* ── MODALS ─────────────────────────────────────────────────────── */}

      {/* Modal 1: How It Works */}
      <Dialog open={showHowItWorks} onOpenChange={setShowHowItWorks}>
        <DialogContent className="max-w-md bg-[#06172F] border-blue-900/40 text-white rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <Folder className="w-5 h-5 text-amber-400" />
              How the Document Vault Works
            </DialogTitle>
            <DialogDescription className="text-xs text-white/70 mt-1 leading-relaxed">
              Your student's permanent educational repository, synchronized in real time with Waypoint Advocates.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 my-2">
            <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-900/40 space-y-1">
              <p className="text-xs font-bold text-amber-300">1. Permanent Preservation</p>
              <p className="text-[11px] text-white/70 leading-relaxed">
                All uploaded IEPs, neuropsych evaluations, and school correspondence are stored in zero-trust encrypted Cloudflare R2 cloud storage.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-900/40 space-y-1">
              <p className="text-xs font-bold text-amber-300">2. Collaborative Folders</p>
              <p className="text-[11px] text-white/70 leading-relaxed">
                Organized by educational category so you and your advocate can locate historical records in seconds during IEP meetings.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-900/40 space-y-1">
              <p className="text-xs font-bold text-amber-300">3. Action Center Integration</p>
              <p className="text-[11px] text-white/70 leading-relaxed">
                When you sign or complete requests inside the Action Center, finalized copies are automatically filed and indexed here.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowHowItWorks(false)}
              className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl"
            >
              Got It
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Privacy & Security */}
      <Dialog open={showSecurityModal} onOpenChange={setShowSecurityModal}>
        <DialogContent className="max-w-lg bg-[#06172F] border-blue-900/40 text-white rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              FERPA & Encryption Standards
            </DialogTitle>
            <DialogDescription className="text-xs text-white/70 mt-1 leading-relaxed">
              How Byron Honea and Waypoint Advocates safeguard your family's sensitive student records.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2 text-xs text-white/80 leading-relaxed">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-950/30 border border-blue-900/40">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">AES-256 Cloud Encryption:</strong> Every PDF, audio recording, and evaluation is encrypted both at rest and in transit via TLS 1.3.
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-950/30 border border-blue-900/40">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">FERPA-Adjacent Safeguards:</strong> Access is strictly limited to authorized parents/guardians and Byron Honea (Master IEP Coach®).
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-950/30 border border-blue-900/40">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Complete Data Portability:</strong> You can download individual records or complete multi-year archive bundles anytime.
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowSecurityModal(false)}
              className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl"
            >
              Close Privacy Overview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Create Folder */}
      <Dialog open={showNewWorkspaceModal} onOpenChange={setShowNewWorkspaceModal}>
        <DialogContent className="max-w-md bg-[#06172F] border-blue-900/40 text-white rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <FolderPlus className="w-5 h-5 text-amber-400" />
              Create New Folder
            </DialogTitle>
            <DialogDescription className="text-xs text-white/70 mt-1">
              Add a custom category folder for {studentName}'s records.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div>
              <Label className="text-xs text-white/80 mb-1.5 block">Folder Name</Label>
              <Input
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="e.g., Independent OT Evaluations"
                className="bg-[#030C22] border-blue-900/40 text-white text-xs rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs text-white/80 mb-1.5 block">Description (Optional)</Label>
              <Input
                value={newWorkspaceDesc}
                onChange={(e) => setNewWorkspaceDesc(e.target.value)}
                placeholder="Brief description of what goes here..."
                className="bg-[#030C22] border-blue-900/40 text-white text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowNewWorkspaceModal(false)}
              className="border-blue-900/40 text-white hover:bg-white/10 text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateWorkspace}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl"
            >
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 4: Upload File */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-md bg-[#06172F] border-blue-900/40 text-white rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <UploadCloud className="w-5 h-5 text-amber-400" />
              Upload Document to Vault
            </DialogTitle>
            <DialogDescription className="text-xs text-white/70 mt-1">
              Add a document to {studentName}'s secure records archive.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div>
              <Label className="text-xs text-white/80 mb-1.5 block">Document Title</Label>
              <Input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="e.g., 2026 Psycho-Ed Evaluation.pdf"
                className="bg-[#030C22] border-blue-900/40 text-white text-xs rounded-xl"
              />
            </div>

            <div>
              <Label className="text-xs text-white/80 mb-1.5 block">Destination Folder</Label>
              <Select value={uploadWorkspaceId} onValueChange={setUploadWorkspaceId}>
                <SelectTrigger className="bg-[#030C22] border-blue-900/40 text-white text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#06172F] border-blue-900/40 text-white">
                  {workspaces.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 rounded-xl border border-dashed border-blue-800/40 bg-blue-950/20 text-center space-y-1.5">
              <UploadCloud className="w-6 h-6 text-amber-400 mx-auto opacity-80" />
              <p className="text-xs font-semibold text-white">Drag & drop your file here</p>
              <p className="text-[10px] text-white/40">Supports PDF, DOCX, XLSX, EML, PNG up to 50MB</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowUploadModal(false)}
              className="border-blue-900/40 text-white hover:bg-white/10 text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadDocument}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl"
            >
              Upload & Encrypt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 5: Document Preview */}
      <Dialog open={!!selectedDocForPreview} onOpenChange={(open) => !open && setSelectedDocForPreview(null)}>
        {selectedDocForPreview && (
          <DialogContent className="max-w-lg bg-[#06172F] border-blue-900/40 text-white rounded-2xl p-6 shadow-2xl">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/40 text-[10px]">
                  {selectedDocForPreview.workspaceName}
                </Badge>
                <span className="text-[10px] text-white/50">{selectedDocForPreview.fileSize}</span>
              </div>
              <DialogTitle className="text-base md:text-lg font-bold text-white break-words">
                {selectedDocForPreview.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-white/70 mt-1">
                Uploaded by {selectedDocForPreview.uploadedBy} • Last updated {selectedDocForPreview.updatedAt}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 my-2">
              <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-900/40 text-xs text-white/80 leading-relaxed">
                <p className="font-semibold text-amber-400 mb-1">Document Summary:</p>
                <p>{selectedDocForPreview.summary || "Permanent student educational document archived in encrypted storage."}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-900/40">
                  <span className="text-white/50 block text-[10px]">Encryption Status:</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> AES-256 Vault Stored
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-900/40">
                  <span className="text-white/50 block text-[10px]">Quick Access:</span>
                  <span className="font-bold text-white mt-0.5 block">
                    {selectedDocForPreview.isPinned ? "★ Pinned to Top" : "Standard File"}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  handleTogglePin(selectedDocForPreview.id);
                  setSelectedDocForPreview(null);
                }}
                className="border-blue-900/40 text-white hover:bg-white/10 text-xs rounded-xl"
              >
                <Star className={`w-3.5 h-3.5 mr-1.5 ${selectedDocForPreview.isPinned ? "fill-amber-400 text-amber-400" : ""}`} />
                {selectedDocForPreview.isPinned ? "Unpin Document" : "Pin to Favorites"}
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

      {/* Modal 6: Folder Viewer */}
      <Dialog open={!!activeWorkspaceModal} onOpenChange={(open) => !open && setActiveWorkspaceModal(null)}>
        {activeWorkspaceModal && (
          <DialogContent className="max-w-2xl bg-[#06172F] border-blue-900/40 text-white rounded-2xl p-6 shadow-2xl">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-amber-400 fill-amber-400/20" />
                <DialogTitle className="text-lg font-bold text-white">
                  {activeWorkspaceModal.name}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-white/70 mt-1">
                {activeWorkspaceModal.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 my-2 max-h-[350px] overflow-y-auto pr-1">
              {documents
                .filter((d) => d.workspaceId === activeWorkspaceModal.id)
                .map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setActiveWorkspaceModal(null);
                      setSelectedDocForPreview(doc);
                    }}
                    className="flex items-center justify-between p-3 rounded-xl bg-blue-950/30 hover:bg-blue-900/40 border border-blue-900/40 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      {renderFileTypeIcon(doc.fileType)}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{doc.title}</p>
                        <p className="text-[10px] text-white/50">{doc.fileSize} • Updated {doc.updatedAt}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-amber-400 text-xs hover:bg-amber-400/10">
                      View
                    </Button>
                  </div>
                ))}

              {documents.filter((d) => d.workspaceId === activeWorkspaceModal.id).length === 0 && (
                <div className="text-center py-8 text-white/50 text-xs">
                  No documents in this folder yet.
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setActiveWorkspaceModal(null)}
                className="border-blue-900/40 text-white hover:bg-white/10 text-xs rounded-xl"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setUploadWorkspaceId(activeWorkspaceModal.id);
                  setActiveWorkspaceModal(null);
                  setShowUploadModal(true);
                }}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Upload to {activeWorkspaceModal.name}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Modal 7: Pin Document Selector */}
      <Dialog open={showPinModal} onOpenChange={setShowPinModal}>
        <DialogContent className="max-w-md bg-[#06172F] border-blue-900/40 text-white rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              Pin a Document to Favorites
            </DialogTitle>
            <DialogDescription className="text-xs text-white/70 mt-1">
              Select any document to appear in your pinned quick-access row.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 my-2 max-h-[300px] overflow-y-auto pr-1">
            {documents
              .filter((d) => !d.isPinned)
              .map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => {
                    handleTogglePin(doc.id);
                    setShowPinModal(false);
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-blue-950/30 hover:bg-blue-900/40 border border-blue-900/40 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    {renderFileTypeIcon(doc.fileType)}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{doc.title}</p>
                      <p className="text-[10px] text-white/50">{doc.workspaceName}</p>
                    </div>
                  </div>
                  <Button size="sm" className="bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold h-7 px-2.5 rounded-lg">
                    Pin
                  </Button>
                </div>
              ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPinModal(false)}
              className="w-full border-blue-900/40 text-white hover:bg-white/10 text-xs rounded-xl"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 7: Camera Scanner Modal */}
      <CameraScannerModal
        isOpen={showCameraScannerModal}
        onClose={() => setShowCameraScannerModal(false)}
        studentName={effectiveStudent ? `${effectiveStudent.firstName} ${effectiveStudent.lastName}`.trim() : displayName}
        studentId={effectiveStudent?.id || 101}
      />

    </div>
  );
}
