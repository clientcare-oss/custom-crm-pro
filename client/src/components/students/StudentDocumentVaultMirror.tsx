import React, { useState, useMemo, useCallback } from "react";
import { 
  Folder, FileText, Lock, ShieldCheck, Search, ChevronRight, Clock, 
  Download, Eye, CheckCircle2, Sparkles, UploadCloud, RefreshCw, 
  HardDrive, X, ArrowRight, ExternalLink, GitCompare, FileSearch,
  Filter, Check, AlertCircle, Landmark
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import PageIdBadge from "@/components/PageIdBadge";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { StatusAwareUploadModal } from "@/components/portal/vault/StatusAwareUploadModal";
import { AiDocumentAnalysisModal } from "@/components/portal/vault/AiDocumentAnalysisModal";

interface StudentDocumentVaultMirrorProps {
  student: any;
  studentId: number;
  fullName: string;
  onReturnToOverview?: () => void;
}

interface ConsolidatedDoc {
  id: string | number;
  fileName: string;
  fileUrl?: string;
  fileType: "pdf" | "doc" | "eml" | "xlsx" | "other";
  fileSize: string;
  rawSize?: number;
  category: string;
  categoryName: string;
  documentType: string;
  documentDate?: string;
  uploadedAt: string;
  uploadedBy: "Advocate" | "Parent" | "Waypoint" | "Pre-Enrollment";
  summary?: string;
  isReviewed?: number;
  isCurrentIep?: boolean;
}

const VAULT_CATEGORIES = [
  { id: "all", name: "All Records", iconSrc: "/assets/vault/folder_all_3d.png", accent: "border-amber-400/50" },
  { id: "ieps-504s", name: "IEPs & 504s", iconSrc: "/assets/vault/folder_ieps_3d.png", accent: "border-amber-400/50" },
  { id: "legal-complaints", name: "State Complaints", iconSrc: "/assets/vault/folder_comm_3d.png", accent: "border-amber-400/50" },
  { id: "evaluations", name: "Evaluations", iconSrc: "/assets/vault/folder_evals_3d.png", accent: "border-sky-500/50" },
  { id: "school-records", name: "School Records", iconSrc: "/assets/vault/folder_school_3d.png", accent: "border-teal-400/50" },
  { id: "communication", name: "PWN & Comm", iconSrc: "/assets/vault/folder_comm_3d.png", accent: "border-purple-400/50" },
  { id: "medical-therapy", name: "Medical", iconSrc: "/assets/vault/folder_medical_3d.png", accent: "border-rose-400/50" },
  { id: "behavior-fba", name: "Behavior / BIP", iconSrc: "/assets/vault/folder_behavior_3d.png", accent: "border-orange-500/50" },
  { id: "progress-reports", name: "Progress", iconSrc: "/assets/vault/folder_progress_3d.png", accent: "border-indigo-400/50" },
];

export function StudentDocumentVaultMirror({
  student,
  studentId,
  fullName,
  onReturnToOverview,
}: StudentDocumentVaultMirrorProps) {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Active filter state
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [analysisFileId, setAnalysisFileId] = useState<number | null>(null);
  const [analysisFileName, setAnalysisFileName] = useState<string>("");
  const [previewDoc, setPreviewDoc] = useState<ConsolidatedDoc | null>(null);

  // ── Queries connected directly to student storage ──────────────────────────
  const { data: iepDoc, isLoading: iepLoading, refetch: refetchIep } = trpc.iep.get.useQuery(
    { contactId: studentId },
    { enabled: !!studentId }
  );

  const { data: draftHistory = [], refetch: refetchDrafts } = trpc.iep.listDraftHistory.useQuery(
    { contactId: studentId },
    { enabled: !!studentId }
  );

  const { data: vaultFiles = [], refetch: refetchVault } = trpc.clientFiles.listForAdmin.useQuery(
    { clientId: studentId },
    { enabled: !!studentId }
  );

  const { data: vaultStatus, refetch: refetchStatus } = trpc.clientFiles.getVaultStatus.useQuery(
    { studentId },
    { enabled: !!studentId }
  );

  const { data: complaintDrafts = [], refetch: refetchComplaints } = trpc.stateComplaint.listDrafts.useQuery(
    { studentId },
    { enabled: !!studentId }
  );

  const handleRefetchAll = useCallback(() => {
    refetchIep();
    refetchDrafts();
    refetchVault();
    refetchStatus();
    refetchComplaints();
    utils.contacts.detail.invalidate({ id: studentId });
  }, [refetchIep, refetchDrafts, refetchVault, refetchStatus, refetchComplaints, utils, studentId]);

  // ── Consolidate All Documents ───────────────────────────────────────────────
  const consolidatedDocs = useMemo<ConsolidatedDoc[]>(() => {
    const list: ConsolidatedDoc[] = [];
    const seenUrls = new Set<string>();

    // 1. Authoritative Current IEP
    if (iepDoc?.currentFileUrl) {
      seenUrls.add(iepDoc.currentFileUrl);
      list.push({
        id: `iep-current-${iepDoc.id}`,
        fileName: iepDoc.currentFileName || "Authoritative Current IEP.pdf",
        fileUrl: iepDoc.currentFileUrl,
        fileType: "pdf",
        fileSize: "Official Record",
        category: "ieps-504s",
        categoryName: "IEPs & 504s",
        documentType: "Current IEP",
        documentDate: iepDoc.currentUploadedAt 
          ? new Date(iepDoc.currentUploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : undefined,
        uploadedAt: iepDoc.currentUploadedAt 
          ? new Date(iepDoc.currentUploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "Active",
        uploadedBy: "Waypoint",
        summary: "Current legally binding IEP active in case file.",
        isReviewed: 1,
        isCurrentIep: true,
      });
    }

    // 2. Draft Revisions History
    if (draftHistory.length > 0) {
      draftHistory.forEach((d) => {
        if (d.fileUrl && !seenUrls.has(d.fileUrl)) {
          seenUrls.add(d.fileUrl);
          list.push({
            id: `draft-${d.id}`,
            fileName: d.fileName || `IEP Draft (${new Date(d.uploadedAt).toLocaleDateString()})`,
            fileUrl: d.fileUrl,
            fileType: "pdf",
            fileSize: "Draft Revision",
            category: "ieps-504s",
            categoryName: "IEPs & 504s",
            documentType: "Draft IEP",
            uploadedAt: new Date(d.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            uploadedBy: "Advocate",
            summary: d.notes || "Draft revision stored during case negotiations.",
            isReviewed: 1,
          });
        }
      });
    }

    // 3. Vault Files from Cloudflare R2 / clientFiles table
    if (vaultFiles.length > 0) {
      vaultFiles.forEach((f) => {
        if (f.fileUrl && !seenUrls.has(f.fileUrl)) {
          seenUrls.add(f.fileUrl);
          const lowerName = (f.fileName || "").toLowerCase();
          const fileType: ConsolidatedDoc["fileType"] = 
            lowerName.endsWith(".xlsx") || lowerName.endsWith(".csv") ? "xlsx"
            : lowerName.endsWith(".doc") || lowerName.endsWith(".docx") ? "doc"
            : lowerName.endsWith(".eml") ? "eml"
            : "pdf";

          const category = f.category || (
            lowerName.includes("eval") || lowerName.includes("psych") ? "evaluations"
            : lowerName.includes("pwn") || lowerName.includes("notice") || lowerName.includes("email") ? "communication"
            : lowerName.includes("report") || lowerName.includes("grade") ? "school-records"
            : lowerName.includes("medical") || lowerName.includes("therap") ? "medical-therapy"
            : lowerName.includes("bip") || lowerName.includes("fba") || lowerName.includes("behavior") ? "behavior-fba"
            : lowerName.includes("progress") ? "progress-reports"
            : "ieps-504s"
          );

          list.push({
            id: f.id,
            fileName: f.fileName,
            fileUrl: f.fileUrl,
            fileType,
            fileSize: f.fileSize ? `${(f.fileSize / 1024 / 1024).toFixed(1)} MB` : "1.8 MB",
            rawSize: f.fileSize || 0,
            category,
            categoryName: VAULT_CATEGORIES.find(c => c.id === category)?.name || "Records",
            documentType: f.documentType || f.category || "Uploaded Record",
            documentDate: f.documentDate,
            uploadedAt: f.uploadedAt 
              ? new Date(f.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "Recently",
            uploadedBy: (f.uploadOrigin as any) || "Parent",
            summary: f.summary || "Student record archived in Document Vault storage.",
            isReviewed: f.isReviewed,
          });
        }
      });
    }

    // 4. Formal State Complaints & Legal Filings (PG-020 Integration)
    if (complaintDrafts && Array.isArray(complaintDrafts)) {
      complaintDrafts.forEach((c: any) => {
        let pCount = 14;
        let snippetText = "Assembled 14-page formal Georgia State Complaint filing docket with official GaDOE form, factual narrative, and evidentiary exhibits.";
        if (c.draftJson) {
          try {
            const parsed = JSON.parse(c.draftJson);
            const binderCount = Array.isArray(parsed.pages) ? parsed.pages.length : 1;
            pCount = (parsed.pageCount && parsed.pageCount >= 10) ? parsed.pageCount : (4 + Math.max(1, binderCount - 1) * 2);
            if (parsed.caseDetails?.district) {
              snippetText = `${parsed.caseDetails.district} · Formal ${pCount}-Page State Complaint filing on record.`;
            }
          } catch {}
        }
        list.push({
          id: `complaint-${c.id}`,
          fileName: c.title || `State Complaint – ${fullName} (${pCount} Pages).pdf`,
          fileUrl: `/state-complaint-builder?studentId=${studentId}`,
          fileType: "pdf",
          fileSize: `${pCount} Pgs Docket`,
          category: "legal-complaints",
          categoryName: "State Complaints",
          documentType: `State Complaint (${pCount} Pgs)`,
          documentDate: c.startedAt ? new Date(c.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : undefined,
          uploadedAt: c.updatedAt ? new Date(c.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Active",
          uploadedBy: "Advocate",
          summary: snippetText,
          isReviewed: 1,
        });
      });
    }

    return list;
  }, [iepDoc, draftHistory, vaultFiles, complaintDrafts, fullName, studentId]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: consolidatedDocs.length };
    consolidatedDocs.forEach((doc) => {
      counts[doc.category] = (counts[doc.category] || 0) + 1;
    });
    return counts;
  }, [consolidatedDocs]);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    let docs = consolidatedDocs;
    if (selectedFolder !== "all") {
      docs = docs.filter((d) => d.category === selectedFolder);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      docs = docs.filter((d) => 
        d.fileName.toLowerCase().includes(q) || 
        d.documentType.toLowerCase().includes(q) ||
        (d.summary && d.summary.toLowerCase().includes(q))
      );
    }
    return docs;
  }, [consolidatedDocs, selectedFolder, searchQuery]);

  // Authoritative IEP info
  const currentIepExists = Boolean(iepDoc?.currentFileUrl);
  const currentIepDate = iepDoc?.currentUploadedAt
    ? new Date(iepDoc.currentUploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Active on File";

  return (
    <div className="w-full space-y-6 text-white">
      {/* ─── Vault Top Banner / Mirror Header ───────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-r from-[#07162B] via-[#0A2244] to-[#05142B] border border-[#3A2C18] p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 opacity-15 pointer-events-none bg-[radial-gradient(ellipse_at_right,_var(--tw-gradient-stops))] from-amber-400 via-sky-600 to-transparent" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#030D1A] border border-[#C5A059]/40 flex items-center justify-center text-amber-300 shadow-[0_0_15px_rgba(197,160,89,0.25)] shrink-0">
              <Lock className="w-6 h-6 text-[#FFE394]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#FFE394] bg-amber-400/10 border border-[#C5A059]/40 px-2.5 py-0.5 rounded-full">
                  STUDENT DOCUMENT VAULT
                </span>
                <PageIdBadge id="PG-023-VAULT" name="Document Vault" inline />
                <Badge className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono flex items-center gap-1.5 px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  R2 Storage Connected
                </Badge>
              </div>
              <h2 
                className="text-xl sm:text-2xl font-bold text-[#FFF4D4] tracking-wide mt-1"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {fullName}’s Case Records & Storage Space
              </h2>
              <p className="text-xs text-[#C6B697] mt-0.5">
                Full advocate mirror of PG-023-VAULT. FERPA-encrypted cloud storage for official IEPs, evaluations, and school notices.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start lg:self-center shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefetchAll}
              className="h-9 px-3 text-xs bg-[#020A17] hover:bg-[#07162B] border-[#3A2C18] text-[#D8C7A5] hover:text-[#FFF4D4] rounded-xl cursor-pointer gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Sync Storage</span>
            </Button>
            <Button
              type="button"
              onClick={() => setUploadModalOpen(true)}
              className="h-9 px-4 text-xs font-bold rounded-xl bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:scale-[1.02] cursor-pointer transition-all gap-1.5"
            >
              <UploadCloud className="w-4 h-4 stroke-[2.5]" />
              <span>Upload to Vault</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Hero Highlight: Active State Complaint Filing on Record ──────── */}
      {complaintDrafts && complaintDrafts.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-[#0d2242] via-[#091a33] to-[#040f21] border-2 border-[#D4AF37]/80 p-4 sm:p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85)] flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#020A17] border border-[#FFE394]/50 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(212,175,55,0.3)]">
              <Landmark className="w-6 h-6 text-[#FFE394]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FFE394]">
                  SAVED STATE COMPLAINT FILING ON RECORD
                </span>
                <Badge className="bg-[#DFBE77]/20 border border-[#DFBE77]/60 text-[#FFE394] text-[10px] font-mono px-2 py-0.5 font-bold">
                  14 Pages Docket
                </Badge>
                <Badge className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[10px] font-mono px-2 py-0.5">
                  Paulding County School District
                </Badge>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-0.5" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                State Complaint Filing — {fullName}
              </h3>
              <p className="text-xs text-[#C6B697] mt-0.5">
                Complete 14-page docket: 4-Page Official GaDOE Form + Clarity Control + Chronological Facts + Master Exhibit Index + Exhibits A & C.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => {
              sessionStorage.setItem("lastStudentProfileUrl", `/students/${studentId}`);
              sessionStorage.setItem("lastStudentProfileId", String(studentId));
              sessionStorage.setItem("lastStudentProfileName", fullName);
              setLocation(`/state-complaint-builder?studentId=${studentId}`);
            }}
            className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-extrabold text-xs sm:text-sm h-10 px-5 rounded-xl shadow-lg border border-[#FFE394]/70 gap-2 shrink-0 cursor-pointer"
          >
            <span>Open 14-Page Filing Docket</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </Button>
        </div>
      )}

      {/* ─── Zone 2: Action Strip Mirror (3 Distinct Panels) ───────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 sm:gap-4">
        {/* Panel A: Current Authoritative IEP */}
        <div className="md:col-span-5 rounded-2xl bg-[#05142B]/90 border border-[#3A2C18] p-4 sm:p-5 flex items-center justify-between gap-4 shadow-[0_8px_24px_rgba(0,0,0,0.85)] relative overflow-hidden group">
          <div className="relative shrink-0 flex items-center justify-center p-1">
            <div className="absolute inset-0 bg-radial from-amber-400/20 to-transparent blur-xl pointer-events-none opacity-40 group-hover:opacity-80 transition-opacity" />
            <img 
              src="/assets/vault/iep_booklet_3d.png?v=4" 
              alt="Current IEP / 504 Dossier" 
              className="w-24 sm:w-28 md:w-32 h-auto object-contain drop-shadow-[0_6px_20px_rgba(0,0,0,0.8)] group-hover:scale-105 transition-transform relative z-10"
            />
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FFE394] block mb-0.5">
              CURRENT AUTHORITATIVE IEP
            </span>
            <div className="flex items-center gap-2 mb-1">
              {currentIepExists ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <h3 className="text-xl sm:text-2xl font-extrabold text-[#FFF4D4] tracking-tight">On File</h3>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <h3 className="text-xl sm:text-2xl font-extrabold text-amber-300 tracking-tight">Pending</h3>
                </>
              )}
            </div>
            <p className="text-xs text-[#C6B697] font-medium mb-3 truncate">
              {currentIepExists ? currentIepDate : "Upload first IEP plan"}
            </p>
            {currentIepExists ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const currentDoc = consolidatedDocs.find(d => d.isCurrentIep);
                  if (currentDoc) setPreviewDoc(currentDoc);
                }}
                className="h-7 px-3 text-[11px] font-bold rounded-lg bg-[#082046] hover:bg-[#0c2f66] text-sky-200 border border-sky-400/40 shadow-sm gap-1.5 cursor-pointer"
              >
                <span>View Current IEP</span>
                <ArrowRight className="w-3 h-3 text-sky-300" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => setUploadModalOpen(true)}
                className="h-7 px-3 text-[11px] font-bold rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 cursor-pointer"
              >
                <span>Upload Current IEP</span>
              </Button>
            )}
          </div>
        </div>

        {/* Panel B: Connected Student Storage Space (Compact 3-Col Layout) */}
        <div className="md:col-span-3 rounded-2xl bg-[#05142B]/90 border border-[#3A2C18] p-3 sm:p-3.5 lg:p-4 flex items-center gap-2.5 sm:gap-3 shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#020A17] border border-cyan-400/40 text-cyan-300 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(56,189,248,0.2)]">
            <HardDrive className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-cyan-300" />
          </div>
          <div className="min-w-0">
            <h4 className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-cyan-300 mb-0.5">
              CLOUD STORAGE
            </h4>
            <div className="text-xs sm:text-sm font-bold text-[#FFF4D4]">
              {consolidatedDocs.length} Total Records
            </div>
            <p className="text-[10px] sm:text-[11px] text-[#C6B697] leading-snug mt-0.5">
              Case #{student?.caseId || studentId}
            </p>
          </div>
        </div>

        {/* Panel C: Rapid Upload Dropzone (Expanded 4-Col Layout) */}
        <div 
          onClick={() => setUploadModalOpen(true)}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            setUploadModalOpen(true);
          }}
          className={`md:col-span-4 rounded-2xl bg-[#05142B]/90 border p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-[0_8px_24px_rgba(0,0,0,0.85)] cursor-pointer group transition-all relative overflow-hidden ${
            isDragOver ? "border-amber-400 bg-amber-400/15 scale-[1.02] shadow-[0_0_30px_rgba(245,181,68,0.35)]" : "border-[#3A2C18] hover:border-amber-400/50"
          }`}
        >
          {/* Ambient gold glow */}
          <div className="absolute inset-0 bg-radial from-amber-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

          {/* 3D Upload Cloud Graphic */}
          <div className="relative w-14 h-12 flex items-center justify-center mb-2">
            <div className="absolute inset-0 bg-radial from-amber-400/20 to-transparent blur-lg opacity-40 group-hover:opacity-80 transition-opacity pointer-events-none" />
            <img 
              src="/assets/vault/upload_cloud_3d.png" 
              alt="Upload File" 
              className="max-h-12 w-auto object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)] group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300"
            />
          </div>

          <Button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setUploadModalOpen(true);
            }}
            className="w-full max-w-[240px] h-9.5 px-4 rounded-xl bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-bold text-xs sm:text-[13px] shadow-md border border-[#FFE394]/50 cursor-pointer gap-2 shrink-0"
          >
            <UploadCloud className="w-4 h-4 stroke-[2.5]" />
            <span className="font-extrabold whitespace-nowrap">Upload Records</span>
          </Button>
          <p className="text-[11px] text-[#C6B697] font-medium mt-2 leading-snug">
            Drag & drop files to ingest
          </p>
          <div className="flex items-center justify-center gap-1 mt-1 text-[9px] text-slate-400 font-mono">
            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">PDF</span>
            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">DOC</span>
            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">XLSX</span>
          </div>
        </div>
      </div>

      {/* ─── Zone 3: Document Folders Gallery (Mirror of 7 Vault Categories) ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-amber-400 fill-amber-400" />
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#FFF4D4]">
              DOCUMENT FOLDERS GALLERY
            </h3>
          </div>
          {selectedFolder !== "all" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFolder("all")}
              className="text-xs text-amber-300 hover:text-amber-200 h-7 px-2 cursor-pointer"
            >
              Clear Folder Filter (Showing All)
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {VAULT_CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.id] || 0;
            const isSelected = selectedFolder === cat.id;

            return (
              <div
                key={cat.id}
                onClick={() => setSelectedFolder(cat.id)}
                className={`group relative rounded-xl bg-[#05142B] border p-2.5 flex flex-col justify-between transition-all duration-200 cursor-pointer hover:-translate-y-1 ${
                  isSelected 
                    ? "border-[#FFE394] shadow-[0_0_20px_rgba(245,181,68,0.35)] bg-gradient-to-b from-[#0A2246] to-[#05142B]" 
                    : "border-[#3A2C18] hover:border-[#C5A059]/70 hover:shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
                }`}
              >
                <div className="w-full h-16 flex items-center justify-center py-1 relative">
                  <div className="absolute inset-0 bg-radial from-amber-400/20 to-transparent opacity-0 group-hover:opacity-40 blur-lg transition-opacity pointer-events-none" />
                  <img 
                    src={cat.iconSrc} 
                    alt={cat.name} 
                    className="max-h-14 w-auto object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.7)] group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-200"
                  />
                </div>
                <div className="mt-1 text-center flex-1 flex flex-col justify-between">
                  <div className={`font-bold text-[11px] leading-tight line-clamp-2 min-h-[1.75rem] flex items-center justify-center ${isSelected ? "text-[#FFE394]" : "text-white group-hover:text-amber-200 transition-colors"}`}>
                    {cat.name}
                  </div>
                  <div className="text-[10px] text-[#C6B697] mt-1 font-medium">
                    {count} {count === 1 ? "file" : "files"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Zone 4: Vault Records Table & Search ────────────────────────────── */}
      <div className="rounded-2xl bg-[#05142B]/90 border border-[#3A2C18] p-4 sm:p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
        {/* Table Search & Filter Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#3A2C18]/60 mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#FFF4D4]">
              VAULT RECORDS ({filteredDocs.length})
            </h4>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Search documents by name, type, date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-[#020A17] border-[#3A2C18] text-white placeholder:text-white/40 rounded-lg focus-visible:ring-amber-400/40"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Documents Rows */}
        {filteredDocs.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
              <Folder className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">No documents found in this folder</p>
              <p className="text-xs text-[#C6B697] mt-0.5 max-w-xs">
                {searchQuery ? "Try refining your search terms." : "Upload the first document to populate this folder."}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => setUploadModalOpen(true)}
              className="bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 text-xs rounded-lg cursor-pointer"
            >
              Upload Document
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-[#3A2C18]/40">
            {filteredDocs.map((doc) => {
              const isPdf = doc.fileType === "pdf";
              const isDoc = doc.fileType === "doc";
              const isXlsx = doc.fileType === "xlsx";
              const isEml = doc.fileType === "eml";

              return (
                <div 
                  key={String(doc.id)}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-[#071C38]/40 -mx-2 px-2.5 rounded-xl transition-colors"
                >
                  {/* Left: Icon & Title */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                      isPdf ? "bg-rose-500/15 border border-rose-500/40 text-rose-300"
                      : isDoc ? "bg-sky-500/15 border border-sky-500/40 text-sky-300"
                      : isXlsx ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-300"
                      : isEml ? "bg-purple-500/15 border border-purple-500/40 text-purple-300"
                      : "bg-amber-500/15 border border-amber-500/40 text-amber-300"
                    }`}>
                      {doc.fileType.toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-white group-hover:text-[#FFE394] transition-colors truncate">
                          {doc.fileName}
                        </span>
                        {doc.isCurrentIep && (
                          <Badge className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[9px] px-1.5 py-0 font-bold">
                            CURRENT IEP
                          </Badge>
                        )}
                        <Badge className="bg-[#020A17] text-[#C6B697] border border-[#3A2C18] text-[9px] px-1.5 py-0">
                          {doc.categoryName}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-[#C6B697] truncate mt-0.5">
                        {doc.summary || "Stored record in vault"}
                      </p>
                    </div>
                  </div>

                  {/* Right: Meta & Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <div className="text-right text-[11px] text-[#C6B697] mr-1 hidden sm:block">
                      <div>{doc.uploadedAt}</div>
                      <div className="text-[10px] text-white/40">{doc.fileSize}</div>
                    </div>

                    {String(doc.id).startsWith("complaint-") ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          sessionStorage.setItem("lastStudentProfileUrl", `/students/${studentId}`);
                          sessionStorage.setItem("lastStudentProfileId", String(studentId));
                          sessionStorage.setItem("lastStudentProfileName", fullName);
                          setLocation(`/state-complaint-builder?studentId=${studentId}`);
                        }}
                        className="h-7.5 px-3 text-[11px] font-bold rounded-lg bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-sm hover:brightness-110 gap-1.5 cursor-pointer"
                      >
                        <span>Open 14-Page Filing</span>
                        <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      </Button>
                    ) : (
                      <>
                        {/* Preview Button */}
                        {doc.fileUrl && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setPreviewDoc(doc)}
                            className="h-7 w-7 p-0 text-white/70 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
                            title="Preview Document"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        {/* AI Analysis Button */}
                        {typeof doc.id === "number" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setAnalysisFileId(Number(doc.id));
                              setAnalysisFileName(doc.fileName);
                            }}
                            className="h-7 w-7 p-0 text-amber-400/80 hover:text-amber-300 hover:bg-amber-400/10 rounded-lg cursor-pointer"
                            title="AI Analysis"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        {/* Download Button */}
                        {doc.fileUrl && (
                          <a
                            href={doc.fileUrl}
                            download={doc.fileName}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-7 w-7 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            title="Download Document"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Footer Action Bar: Advocacy Tools Integration ──────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
        <div 
          onClick={() => setLocation(`/tools/iep-comparator`)}
          className="p-3.5 rounded-xl bg-[#020A17]/80 hover:bg-[#071C38] border border-[#3A2C18] hover:border-[#C5A059]/60 cursor-pointer transition-all flex items-center justify-between shadow-md group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <GitCompare className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#FFE394] transition-colors">
                IEP Draft Comparator
              </h5>
              <p className="text-[11px] text-[#C6B697]">
                Compare previous vs. current IEP drafts from storage
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-[#FFE394] group-hover:translate-x-0.5 transition-all" />
        </div>

        <div 
          onClick={() => setLocation(`/tools/pwn-decoder`)}
          className="p-3.5 rounded-xl bg-[#020A17]/80 hover:bg-[#071C38] border border-[#3A2C18] hover:border-[#C5A059]/60 cursor-pointer transition-all flex items-center justify-between shadow-md group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <FileSearch className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#FFE394] transition-colors">
                PWN Decoder (Prior Written Notice)
              </h5>
              <p className="text-[11px] text-[#C6B697]">
                Analyze district notices stored in communication folder
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-[#FFE394] group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      {/* ─── Return to Overview Link ────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 border-t border-[#3A2C18]/60 text-xs text-[#C6B697]">
        <span>Waypoint Advocates · Case #{student?.caseId || studentId}</span>
        {onReturnToOverview && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReturnToOverview}
            className="bg-transparent hover:bg-white/5 border-[#3A2C18] text-white text-xs h-8 px-3 rounded-lg cursor-pointer"
          >
            Return to Overview Desk
          </Button>
        )}
      </div>

      {/* ─── Modals ─────────────────────────────────────────────────────────── */}
      {/* 1. Upload Modal */}
      <StatusAwareUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        studentId={studentId}
        studentName={fullName}
        isRelationshipActive={true}
        hasCurrentPlan={currentIepExists}
        currentPlanLabel={currentIepDate}
        onUploadComplete={() => {
          handleRefetchAll();
          toast.success("Document saved to Student Document Vault!");
        }}
      />

      {/* 2. AI Document Analysis Modal */}
      <AiDocumentAnalysisModal
        isOpen={Boolean(analysisFileId)}
        onClose={() => setAnalysisFileId(null)}
        fileId={analysisFileId}
        fileName={analysisFileName}
      />

      {/* 3. Document Preview Modal */}
      <Dialog open={Boolean(previewDoc)} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] bg-[#05142B] border border-[#3A2C18] text-white p-5 rounded-2xl shadow-2xl flex flex-col">
          <DialogHeader className="pb-3 border-b border-[#3A2C18]">
            <DialogTitle className="text-base font-bold text-[#FFF4D4] flex items-center justify-between">
              <span className="truncate pr-4">{previewDoc?.fileName}</span>
              <Badge className="bg-[#020A17] text-[#FFE394] border border-[#3A2C18] text-xs">
                {previewDoc?.categoryName}
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#C6B697]">
              Uploaded {previewDoc?.uploadedAt} · Size: {previewDoc?.fileSize}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-[480px] bg-[#020A17] rounded-xl border border-[#3A2C18]/60 overflow-hidden relative my-3">
            {previewDoc?.fileUrl ? (
              <iframe
                src={previewDoc.fileUrl}
                title={previewDoc.fileName}
                className="w-full h-full min-h-[480px] border-0"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#C6B697]">
                No preview available.
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t border-[#3A2C18]">
            <span className="text-xs text-[#C6B697]">
              Stored in Cloudflare R2
            </span>
            <div className="flex items-center gap-2">
              {previewDoc?.fileUrl && (
                <a
                  href={previewDoc.fileUrl}
                  download={previewDoc.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 px-3 text-xs rounded-lg bg-[#082046] hover:bg-[#0c2f66] text-sky-200 border border-sky-400/40 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewDoc(null)}
                className="border-[#3A2C18] text-white bg-white/5 h-8 px-3 text-xs"
              >
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
