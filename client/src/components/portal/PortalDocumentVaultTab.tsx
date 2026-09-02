import React, { useState, useMemo } from "react";
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
  FileCheck
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
    toast.success(`Created workspace "${newWs.name}"!`);
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

  // Helper for rendering file icons
  const renderFileTypeIcon = (type: VaultDocument["fileType"]) => {
    switch (type) {
      case "pdf":
        return (
          <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
            <FileText className="w-4 h-4 text-red-400" />
          </div>
        );
      case "doc":
        return (
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
            <FileCode className="w-4 h-4 text-blue-400" />
          </div>
        );
      case "xlsx":
        return (
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          </div>
        );
      case "eml":
        return (
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
            <Mail className="w-4 h-4 text-sky-400" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Document Vault
            </h1>
            <div className="w-6 h-6 rounded-md bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)]">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <PageIdBadge id="PG-023-VAULT" name="Document Vault" />
          </div>
          <p className="text-sm text-white/70 mt-1">
            Your secure home for IEPs, evaluations, school records, and all Waypoint documents.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <Button
            variant="outline"
            onClick={() => setShowHowItWorks(true)}
            className="gap-2 text-xs font-semibold border-white/20 text-white hover:bg-white/10 h-9 px-3.5 rounded-xl"
          >
            <Info className="w-3.5 h-3.5 text-amber-400" />
            How It Works
          </Button>

          <Button
            onClick={() => setShowUploadModal(true)}
            className="gap-2 text-xs font-bold bg-amber-400 hover:bg-amber-500 text-[#161B22] shadow-md shadow-amber-400/20 h-9 px-4 rounded-xl transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            Upload File
          </Button>
        </div>
      </div>

      {/* ── STUDENT RECORD SUMMARY STRIP ────────────────────────────────── */}
      <div className="rounded-2xl border border-blue-900/40 bg-[#06172F]/90 backdrop-blur-md p-5 shadow-2xl">
        <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-3.5">
          Student Record Summary
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-blue-900/40">
          
          {/* Stat 1: Total Documents */}
          <div className="flex items-center gap-3.5 pt-2 sm:pt-0">
            <div className="w-11 h-11 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_12px_rgba(251,191,36,0.15)]">
              <Folder className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-xl md:text-2xl font-black text-white">64</div>
              <div className="text-[11px] text-white/60 font-medium">Total Documents</div>
            </div>
          </div>

          {/* Stat 2: Workspaces */}
          <div className="flex items-center gap-3.5 pt-2 sm:pt-0 sm:pl-4">
            <div className="w-11 h-11 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_12px_rgba(251,191,36,0.15)]">
              <FolderPlus className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-xl md:text-2xl font-black text-white">{workspaces.length}</div>
              <div className="text-[11px] text-white/60 font-medium">Workspaces</div>
            </div>
          </div>

          {/* Stat 3: Recent Uploads */}
          <div className="flex items-center gap-3.5 pt-2 sm:pt-0 sm:pl-4">
            <div className="w-11 h-11 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_12px_rgba(251,191,36,0.15)]">
              <UploadCloud className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-xl md:text-2xl font-black text-white">12</div>
              <div className="text-[11px] text-white/60 font-medium">Recent Uploads <span className="hidden xl:inline text-white/40">This Month</span></div>
            </div>
          </div>

          {/* Stat 4: Safe & Encrypted */}
          <div className="flex items-center gap-3.5 pt-2 sm:pt-0 sm:pl-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-xl md:text-2xl font-black text-white">100%</div>
              <div className="text-[11px] text-white/60 font-medium">Safe & Encrypted</div>
            </div>
          </div>

          {/* Stat 5: Last Activity */}
          <div className="flex items-center gap-3.5 pt-2 sm:pt-0 sm:pl-4">
            <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 shadow-[0_0_12px_rgba(14,165,233,0.15)]">
              <Clock className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="text-sm md:text-base font-black text-white">Updated Today</div>
              <div className="text-[11px] text-white/60 font-medium">Last Activity</div>
            </div>
          </div>

        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by name, type, or keyword..."
            className="pl-10 h-10 bg-[#030C22] border-blue-900/40 text-white placeholder:text-white/40 text-xs rounded-xl focus-visible:ring-amber-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdown */}
        <Select value={selectedWorkspaceFilter} onValueChange={setSelectedWorkspaceFilter}>
          <SelectTrigger className="w-full sm:w-[150px] h-10 bg-[#06172F] border-blue-900/40 text-white text-xs rounded-xl">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-amber-400" />
              <SelectValue placeholder="Filter" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-[#06172F] border-blue-900/40 text-white">
            <SelectItem value="all">All Workspaces</SelectItem>
            {workspaces.map((w) => (
              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort Dropdown */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger className="w-full sm:w-[140px] h-10 bg-[#06172F] border-blue-900/40 text-white text-xs rounded-xl">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-white/60" />
              <SelectValue placeholder="Sort" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-[#06172F] border-blue-900/40 text-white">
            <SelectItem value="newest">Sort: Newest</SelectItem>
            <SelectItem value="oldest">Sort: Oldest</SelectItem>
            <SelectItem value="name">Sort: Name (A-Z)</SelectItem>
          </SelectContent>
        </Select>

        {/* View Toggle */}
        <div className="flex items-center p-1 rounded-xl bg-[#030C22] border border-blue-900/40 self-end sm:self-auto shrink-0">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === "grid"
                ? "bg-amber-400 text-slate-950 shadow-sm font-bold"
                : "text-white/50 hover:text-white"
            }`}
            title="Grid View"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === "list"
                ? "bg-amber-400 text-slate-950 shadow-sm font-bold"
                : "text-white/50 hover:text-white"
            }`}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── MAIN TWO-COLUMN SECTION (WORKSPACES + RECENT DOCUMENTS) ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: WORKSPACES (8) */}
        <div className="lg:col-span-6 space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              Workspaces <span className="text-amber-400">({workspaces.length})</span>
            </h2>
            <button
              onClick={() => setSelectedWorkspaceFilter("all")}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
            >
              View All
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
            {workspaces.map((ws) => (
              <Card
                key={ws.id}
                onClick={() => setActiveWorkspaceModal(ws)}
                className="group relative p-4 rounded-2xl bg-[#06172F] hover:bg-[#0A2246] border-blue-900/40 hover:border-amber-400/60 transition-all duration-200 cursor-pointer flex flex-col items-center text-center justify-between min-h-[125px] shadow-xl hover:shadow-amber-400/10"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 group-hover:border-amber-400/60 flex items-center justify-center text-amber-400 mb-2 transition-all">
                  <Folder className="w-5 h-5 fill-amber-400/20 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors leading-tight line-clamp-2">
                    {ws.name}
                  </h3>
                  <p className="text-[11px] text-white/50 font-medium mt-1">
                    {ws.fileCount} files
                  </p>
                </div>
              </Card>
            ))}

            {/* + New Workspace Card */}
            <Card
              onClick={() => setShowNewWorkspaceModal(true)}
              className="group p-4 rounded-2xl bg-[#06172F]/50 hover:bg-[#0A2246]/80 border border-dashed border-blue-800/40 hover:border-amber-400/60 transition-all duration-200 cursor-pointer flex flex-col items-center text-center justify-center min-h-[125px]"
            >
              <div className="w-9 h-9 rounded-full bg-white/5 group-hover:bg-amber-400/20 border border-white/10 group-hover:border-amber-400/40 flex items-center justify-center text-white/60 group-hover:text-amber-300 mb-2 transition-all">
                <Plus className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-amber-400 group-hover:text-amber-300">
                New Workspace
              </p>
            </Card>
          </div>
        </div>

        {/* Right Column: RECENT DOCUMENTS */}
        <div className="lg:col-span-6 space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Recent Documents
            </h2>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedWorkspaceFilter("all");
              }}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
            >
              View All
            </button>
          </div>

          <div className="rounded-2xl border border-blue-900/40 bg-[#06172F]/90 backdrop-blur-md p-3.5 space-y-2 shadow-2xl">
            {filteredDocuments.slice(0, 5).map((doc) => (
              <div
                key={doc.id}
                onClick={() => setSelectedDocForPreview(doc)}
                className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-950/40 border border-transparent hover:border-blue-800/40 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  {renderFileTypeIcon(doc.fileType)}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                      {doc.title}
                    </p>
                    <p className="text-[11px] text-white/50 truncate">
                      {doc.workspaceName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-white/50 font-medium">
                    {doc.relativeDate}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePin(doc.id);
                    }}
                    className={`p-1 rounded-lg transition-colors ${
                      doc.isPinned
                        ? "text-amber-400 hover:text-amber-300"
                        : "text-white/20 hover:text-white/60"
                    }`}
                    title={doc.isPinned ? "Unpin document" : "Pin document"}
                  >
                    <Star className={`w-3.5 h-3.5 ${doc.isPinned ? "fill-amber-400" : ""}`} />
                  </button>
                </div>
              </div>
            ))}

            <div className="pt-2">
              <Button
                variant="outline"
                onClick={() => setSelectedWorkspaceFilter("all")}
                className="w-full h-9 rounded-xl border-white/15 bg-white/[0.02] hover:bg-white/[0.08] text-amber-400 text-xs font-bold gap-2 transition-all"
              >
                View All Documents
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

      </div>

      {/* ── PINNED DOCUMENTS CAROUSEL / GRID ───────────────────────────── */}
      <div className="rounded-2xl border border-blue-900/40 bg-[#06172F]/90 backdrop-blur-md p-5 space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Pinned Documents
              </h2>
            </div>
            <p className="text-xs text-white/60 mt-0.5">
              Keep important documents easy to find.
            </p>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              onClick={() => toast.info("Showing previous pinned items")}
              className="p-1.5 rounded-lg border border-blue-900/40 bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => toast.info("Showing next pinned items")}
              className="p-1.5 rounded-lg border border-blue-900/40 bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {pinnedDocuments.map((doc) => (
            <Card
              key={doc.id}
              onClick={() => setSelectedDocForPreview(doc)}
              className="group relative p-4 rounded-2xl bg-[#081B36] hover:bg-[#0C2A52] border-blue-900/40 hover:border-amber-400/60 transition-all cursor-pointer flex flex-col justify-between shadow-xl"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                {renderFileTypeIcon(doc.fileType)}
                <div className="w-5 h-5 rounded-full bg-amber-400/10 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.2)]">
                  <Star className="w-3 h-3 fill-amber-400" />
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2">
                  {doc.title.replace(/\.[^/.]+$/, "")}
                </h3>
                <p className="text-[11px] text-white/50 mt-1 truncate">
                  {doc.workspaceName}
                </p>
                <p className="text-[10px] text-white/40 mt-0.5 font-medium">
                  Updated {doc.updatedAt}
                </p>
              </div>
            </Card>
          ))}

          {/* + Pin Document Card */}
          <Card
            onClick={() => setShowPinModal(true)}
            className="group p-4 rounded-2xl bg-[#06172F]/50 hover:bg-[#0A2246]/80 border border-dashed border-blue-800/40 hover:border-amber-400/60 transition-all cursor-pointer flex flex-col items-center text-center justify-center min-h-[140px]"
          >
            <div className="w-9 h-9 rounded-full bg-white/5 group-hover:bg-amber-400/20 border border-white/10 group-hover:border-amber-400/40 flex items-center justify-center text-white/60 group-hover:text-amber-300 mb-2 transition-all">
              <Plus className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-amber-400 group-hover:text-amber-300">
              Pin Document
            </p>
          </Card>
        </div>
      </div>

      {/* ── SECURITY / FERPA BANNER ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-blue-900/40 bg-gradient-to-r from-[#06172F] to-[#0A2246] p-5 md:p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_20px_rgba(251,191,36,0.15)]">
            <Lock className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-bold text-white">
              Your child's information is always safe with us.
            </h3>
            <p className="text-xs text-white/70 mt-1 max-w-2xl leading-relaxed">
              All documents are encrypted at rest and in transit. We follow strict privacy standards aligned with FERPA to protect your child's educational records.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowSecurityModal(true)}
          className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors shrink-0 self-start md:self-auto"
        >
          Learn more about our privacy & security
          <ChevronRight className="w-4 h-4" />
        </button>
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
              <p className="text-xs font-bold text-amber-300">2. Collaborative Workspaces</p>
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

      {/* Modal 3: Create Workspace */}
      <Dialog open={showNewWorkspaceModal} onOpenChange={setShowNewWorkspaceModal}>
        <DialogContent className="max-w-md bg-[#06172F] border-blue-900/40 text-white rounded-2xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <FolderPlus className="w-5 h-5 text-amber-400" />
              Create New Workspace
            </DialogTitle>
            <DialogDescription className="text-xs text-white/70 mt-1">
              Add a custom category folder for {studentName}'s records.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div>
              <Label className="text-xs text-white/80 mb-1.5 block">Workspace Name</Label>
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
              Create Workspace
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
              <Label className="text-xs text-white/80 mb-1.5 block">Destination Workspace</Label>
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

      {/* Modal 6: Workspace Folder Viewer */}
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
                  No documents in this workspace yet.
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

    </div>
  );
}
