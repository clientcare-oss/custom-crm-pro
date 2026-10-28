/**
 * Knowledge Base — PG-016
 * Authoritative Legal Compendium & Advocate Reference Library
 * Revamped in Waypoint Admiralty Theme ("Navy & Brass") reflecting the depth and colors of Crew Quarters (PG-038).
 */

import { useState, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import VoiceInput from "@/components/VoiceInput";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  BookOpen,
  Upload,
  Search,
  FileText,
  Trash2,
  ExternalLink,
  FolderOpen,
  Plus,
  Tag,
  X,
  ListChecks,
  Sparkles,
  Shield,
  Layers,
  HardDrive,
  FileCheck,
  Library,
  Calendar,
  Filter,
} from "lucide-react";
import PageIdBadge from "@/components/PageIdBadge";
import Walkthroughs from "./Walkthroughs";
import { WaypointWaveIcon } from "@/components/portal/WaypointWavyBackdrop";
import { cn } from "@/lib/utils";

function formatBytes(bytes?: number | null) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function KnowledgeBase() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    category: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  // Fetch dynamic categories
  const { data: categories = [] } = trpc.knowledgeBase.categories.useQuery();

  // Filtered documents
  const { data: docs = [], refetch, isLoading } = trpc.knowledgeBase.list.useQuery({
    category: selectedCategory === "All" ? undefined : selectedCategory,
    search: search || undefined,
  });

  // All docs for counts & global metrics
  const { data: allDocs = [] } = trpc.knowledgeBase.list.useQuery({});

  // Walkthroughs count for operational metric card
  const { data: walkthroughs = [] } = trpc.walkthroughs.list.useQuery({});

  const deleteMutation = trpc.knowledgeBase.delete.useMutation({
    onSuccess: () => {
      toast.success("Document removed from library");
      refetch();
    },
    onError: (e) => toast.error(e.message || "Delete failed"),
  });

  const uploadMutation = trpc.knowledgeBase.upload.useMutation({
    onSuccess: () => {
      toast.success("Document successfully cataloged");
      refetch();
      setUploadOpen(false);
      setUploadForm({ title: "", description: "", category: "" });
      setSelectedFile(null);
      setUploading(false);
    },
    onError: (e) => {
      toast.error(e.message || "Upload failed");
      setUploading(false);
    },
  });

  const createCategoryMutation = trpc.knowledgeBase.createCategory.useMutation({
    onSuccess: () => {
      toast.success("Library compartment created");
      utils.knowledgeBase.categories.invalidate();
      setNewCategoryName("");
      setAddCatOpen(false);
    },
    onError: (e) => toast.error(e.message || "Failed to create category"),
  });

  const deleteCategoryMutation = trpc.knowledgeBase.deleteCategory.useMutation({
    onSuccess: () => {
      toast.success("Category deleted");
      utils.knowledgeBase.categories.invalidate();
      if (selectedCategory !== "All") setSelectedCategory("All");
    },
    onError: (e) => toast.error(e.message || "Failed to delete category"),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Only PDF documents are accepted into the library");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Document exceeds maximum size of 50 MB");
      return;
    }
    setSelectedFile(file);
    if (!uploadForm.title) {
      setUploadForm((f) => ({ ...f, title: file.name.replace(/\.pdf$/i, "") }));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please choose a PDF file to catalog");
      return;
    }
    if (!uploadForm.title.trim()) {
      toast.error("Document title is required");
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMutation.mutate({
        title: uploadForm.title.trim(),
        description: uploadForm.description.trim() || undefined,
        category: uploadForm.category || "Other",
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileData: base64,
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDelete = (id: number, title: string) => {
    if (confirm(`Remove "${title}" from the knowledge base? This action cannot be undone.`)) {
      deleteMutation.mutate({ id });
    }
  };

  const handleDeleteCategory = (id: number, name: string) => {
    if (
      confirm(
        `Delete library compartment "${name}"? Documents will retain their category tag but the compartment filter will be removed.`
      )
    ) {
      deleteCategoryMutation.mutate({ id });
    }
  };

  // Count docs per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: allDocs.length };
    for (const cat of categories) {
      counts[cat.name] = allDocs.filter((d) => d.category === cat.name).length;
    }
    return counts;
  }, [allDocs, categories]);

  // Total library storage footprint
  const totalStorageBytes = useMemo(() => {
    return allDocs.reduce((acc, d) => acc + (d.fileSize || 0), 0);
  }, [allDocs]);

  // Support ?tab=walkthroughs query param
  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const [activeTab, setActiveTab] = useState<"docs" | "walkthroughs">(
    searchParams.get("tab") === "walkthroughs" || searchParams.get("tab") === "sop"
      ? "walkthroughs"
      : "docs"
  );

  const handleTabChange = (tab: "docs" | "walkthroughs") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (tab === "walkthroughs") {
        url.searchParams.set("tab", "walkthroughs");
      } else {
        url.searchParams.delete("tab");
      }
      window.history.replaceState(null, "", url.toString());
    }
  };

  return (
    <div
      className="min-h-full bg-[#07162B] text-[#FFF4D4] p-4 sm:p-6 lg:p-8 space-y-6 relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, #102B4E 0%, #07162B 55%, #030D1A 100%)",
      }}
    >
      {/* ── Top Hero Banner (Matching PG-038 Crew Quarters Depth) ── */}
      <div className="relative rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 p-5 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] overflow-hidden">
        {/* Ambient Maritime Radial Glow */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#C5A059]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-[#102B4E]/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Branded Title Compartment */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="p-3 sm:p-3.5 rounded-2xl bg-[#020A17] text-[#C5A059] border border-[#3A2C18] shadow-[0_4px_16px_rgba(0,0,0,0.8)] shrink-0">
              <Library className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-[0_0_8px_rgba(197,160,89,0.5)]" />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif text-[#FFF4D4] font-normal tracking-wide">
                  Knowledge Base <span className="font-serif italic font-bold text-[#FFE394]">& Compendium</span>
                </h1>
                <PageIdBadge
                  id={activeTab === "walkthroughs" ? "PG-017" : "PG-016"}
                  name={activeTab === "walkthroughs" ? "System Walkthroughs (SOP)" : "Knowledge Base"}
                />
              </div>

              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <WaypointWaveIcon className="w-9 h-2.5 text-[#C5A059] shrink-0" />
                <p className="text-xs sm:text-sm text-[#C6B697] font-medium leading-relaxed">
                  Authoritative Special Education legal compendium, procedural guidelines, OSEP guidance, state regulations, and practice SOPs.
                </p>
              </div>
            </div>
          </div>

          {/* Right Action Trigger: Upload Document Button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setUploadOpen(true)}
              className="h-10 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-[0_3px_12px_rgba(197,160,89,0.35)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-4 h-4 text-[#07162B]" />
              <span>Catalog New Document</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Operational Metric Blocks (5 Deep Admiralty Cards) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Card 1: Total Documents */}
        <div className="group relative overflow-hidden rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 hover:border-[#C5A059]/80 px-3 py-3.5 sm:py-4 transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:shadow-[0_10px_35px_rgba(197,160,89,0.25)] flex flex-col justify-between min-h-[125px]">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#C5A059]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[#C5A059]/20 transition-all duration-300" />
          <div className="relative z-10 flex items-center justify-between w-full">
            <div className="p-1.5 rounded-lg bg-[#020A17] text-[#C5A059] border border-[#3A2C18] shrink-0 group-hover:scale-105 transition-transform">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-mono text-[#C5A059] uppercase tracking-wider font-semibold">
              Compendium
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center my-1 relative z-10">
            <div className="text-3xl sm:text-4xl font-serif font-black text-[#FFF4D4] leading-none tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
              {allDocs.length}
            </div>
          </div>
          <div className="relative z-10 text-center text-xs font-semibold text-[#C6B697] group-hover:text-[#FFF4D4] transition-colors tracking-tight whitespace-nowrap">
            Documents Cataloged
          </div>
        </div>

        {/* Card 2: Active Compartments */}
        <div className="group relative overflow-hidden rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 hover:border-[#C5A059]/80 px-3 py-3.5 sm:py-4 transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:shadow-[0_10px_35px_rgba(197,160,89,0.25)] flex flex-col justify-between min-h-[125px]">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#C5A059]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[#C5A059]/20 transition-all duration-300" />
          <div className="relative z-10 flex items-center justify-between w-full">
            <div className="p-1.5 rounded-lg bg-[#020A17] text-[#C5A059] border border-[#3A2C18] shrink-0 group-hover:scale-105 transition-transform">
              <FolderOpen className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-mono text-[#C5A059] uppercase tracking-wider font-semibold">
              Taxonomy
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center my-1 relative z-10">
            <div className="text-3xl sm:text-4xl font-serif font-black text-[#FFF4D4] leading-none tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
              {categories.length}
            </div>
          </div>
          <div className="relative z-10 text-center text-xs font-semibold text-[#C6B697] group-hover:text-[#FFF4D4] transition-colors tracking-tight whitespace-nowrap">
            Library Categories
          </div>
        </div>

        {/* Card 3: Storage Footprint */}
        <div className="group relative overflow-hidden rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 hover:border-[#C5A059]/80 px-3 py-3.5 sm:py-4 transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:shadow-[0_10px_35px_rgba(197,160,89,0.25)] flex flex-col justify-between min-h-[125px]">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#C5A059]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[#C5A059]/20 transition-all duration-300" />
          <div className="relative z-10 flex items-center justify-between w-full">
            <div className="p-1.5 rounded-lg bg-[#020A17] text-[#C5A059] border border-[#3A2C18] shrink-0 group-hover:scale-105 transition-transform">
              <HardDrive className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-mono text-[#C5A059] uppercase tracking-wider font-semibold">
              R2 Storage
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center my-1 relative z-10">
            <div className="text-2xl sm:text-3xl font-serif font-black text-[#FFF4D4] leading-none tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
              {formatBytes(totalStorageBytes)}
            </div>
          </div>
          <div className="relative z-10 text-center text-xs font-semibold text-[#C6B697] group-hover:text-[#FFF4D4] transition-colors tracking-tight whitespace-nowrap">
            Library Footprint
          </div>
        </div>

        {/* Card 4: Standard Operating Procedures */}
        <div
          onClick={() => handleTabChange("walkthroughs")}
          className="group cursor-pointer relative overflow-hidden rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 hover:border-[#C5A059]/80 px-3 py-3.5 sm:py-4 transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:shadow-[0_10px_35px_rgba(197,160,89,0.25)] flex flex-col justify-between min-h-[125px]"
        >
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#C5A059]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[#C5A059]/20 transition-all duration-300" />
          <div className="relative z-10 flex items-center justify-between w-full">
            <div className="p-1.5 rounded-lg bg-[#020A17] text-[#C5A059] border border-[#3A2C18] shrink-0 group-hover:scale-105 transition-transform">
              <ListChecks className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-mono text-[#C5A059] uppercase tracking-wider font-semibold">
              Procedures
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center my-1 relative z-10">
            <div className="text-3xl sm:text-4xl font-serif font-black text-[#FFF4D4] leading-none tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
              {walkthroughs.length}
            </div>
          </div>
          <div className="relative z-10 text-center text-xs font-semibold text-[#C6B697] group-hover:text-[#FFF4D4] transition-colors tracking-tight whitespace-nowrap">
            Live SOP Walkthroughs
          </div>
        </div>

        {/* Card 5: Admiralty Bathymetric Motto Tile */}
        <div className="col-span-2 sm:col-span-1 relative rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 p-4 flex items-center justify-between overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] group hover:border-[#C5A059]/80 transition-all duration-300 min-h-[125px]">
          {/* Bathymetric Contours in Aged Brass */}
          <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden opacity-30">
            <svg viewBox="0 0 300 120" fill="none" className="absolute inset-0 w-full h-full object-cover" preserveAspectRatio="none">
              <path d="M-10 125 C 20 120, 35 105, 55 98 C 80 90, 105 106, 140 100 C 180 94, 220 106, 310 98" stroke="#C5A059" strokeWidth="0.75" />
              <path d="M-10 110 C 24 104, 42 90, 65 83 C 92 75, 120 92, 158 85 C 200 78, 240 93, 310 84" stroke="#DFBE77" strokeWidth="0.85" />
              <path d="M-10 94 C 28 86, 50 74, 76 66 C 106 58, 136 76, 178 69 C 220 62, 260 79, 310 70" stroke="#FFE394" strokeWidth="0.95" />
              <path d="M-10 77 C 32 68, 58 56, 88 48 C 121 40, 154 60, 198 53 C 240 46, 280 65, 310 56" stroke="#C5A059" strokeWidth="0.85" />
            </svg>
          </div>

          <div className="relative z-10 ml-auto flex flex-col items-end text-right select-none pl-2">
            <div className="text-[12px] sm:text-[13px] font-serif font-black tracking-[0.2em] text-[#FFF4D4] leading-[1.3] drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
              <div>EVIDENCE</div>
              <div>PREVAILS</div>
              <div>ALWAYS</div>
            </div>
            <div className="w-8 h-[2px] bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] rounded-full mt-1.5 shadow-[0_0_8px_rgba(197,160,89,0.8)]" />
          </div>
        </div>
      </div>

      {/* ── Internal Tab Navigation Bar (Double Tone with Gold Shimmer) ── */}
      <div className="w-full flex items-center justify-between p-1.5 sm:p-2 bg-[#05142B]/95 border border-[#3A2C18] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C5A059]/60 to-transparent pointer-events-none" />

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => handleTabChange("docs")}
            className={cn(
              "flex-1 sm:flex-none h-9 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer whitespace-nowrap",
              activeTab === "docs"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 font-bold"
                : "text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#07162B] border border-transparent"
            )}
          >
            <BookOpen className="w-4 h-4" />
            <span>Documents & Statutory Library</span>
            <span className={cn(
              "text-[11px] font-mono px-1.5 py-0.2 rounded-full",
              activeTab === "docs" ? "bg-[#07162B]/20 text-[#07162B] font-bold" : "bg-[#020A17] text-[#C5A059] border border-[#3A2C18]"
            )}>
              {allDocs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("walkthroughs")}
            className={cn(
              "flex-1 sm:flex-none h-9 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer whitespace-nowrap",
              activeTab === "walkthroughs"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 font-bold"
                : "text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#07162B] border border-transparent"
            )}
          >
            <ListChecks className="w-4 h-4" />
            <span>Standard Operating Procedures (SOPs)</span>
            <span className={cn(
              "text-[11px] font-mono px-1.5 py-0.2 rounded-full",
              activeTab === "walkthroughs" ? "bg-[#07162B]/20 text-[#07162B] font-bold" : "bg-[#020A17] text-[#C5A059] border border-[#3A2C18]"
            )}>
              {walkthroughs.length}
            </span>
          </button>
        </div>

        {/* Live Filter / Active Category Indicator */}
        <div className="hidden lg:flex items-center gap-2 pr-2 text-xs text-[#C6B697]">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#C5A059]">Active Filter:</span>
          <span className="px-2 py-0.5 rounded-md bg-[#020A17] border border-[#3A2C18] text-[#FFF4D4] font-medium">
            {selectedCategory === "All" ? "All Compendium Records" : selectedCategory}
          </span>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      {activeTab === "walkthroughs" ? (
        <div className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 p-4 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
          <Walkthroughs />
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* ── Left Category Rail / Compartments Browser ── */}
          <aside className="w-full lg:w-72 shrink-0 rounded-2xl border border-[#3A2C18] bg-[#05142B]/95 p-4 sm:p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] flex flex-col gap-3">
            <div className="flex items-center justify-between pb-3 border-b border-[#3A2C18]/80">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-[#C5A059]" />
                <span className="text-xs font-bold uppercase tracking-widest text-[#FFF4D4] font-serif">
                  Compartments
                </span>
              </div>
              <button
                onClick={() => setAddCatOpen(true)}
                className="h-7 px-2 rounded-lg text-xs font-medium flex items-center gap-1 bg-[#020A17] text-[#C5A059] border border-[#3A2C18] hover:border-[#C5A059] hover:text-[#FFF4D4] transition-all cursor-pointer shadow-sm"
                title="Add new category compartment"
              >
                <Plus className="w-3 h-3" />
                <span>New</span>
              </button>
            </div>

            {/* Category Compartment Buttons */}
            <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[480px] pr-1">
              {/* All Documents */}
              <button
                onClick={() => setSelectedCategory("All")}
                className={cn(
                  "flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer text-left border",
                  selectedCategory === "All"
                    ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border-[#FFE394]/50 shadow-[0_2px_8px_rgba(197,160,89,0.3)] font-bold"
                    : "bg-[#020A17]/60 text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#07162B] border-[#3A2C18]/60"
                )}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Library className="w-4 h-4 shrink-0" />
                  <span className="truncate">All Documents</span>
                </div>
                <span
                  className={cn(
                    "text-[11px] font-mono px-2 py-0.5 rounded-md shrink-0",
                    selectedCategory === "All"
                      ? "bg-[#07162B]/20 text-[#07162B] font-bold"
                      : "bg-[#020A17] text-[#C5A059] border border-[#3A2C18]"
                  )}
                >
                  {categoryCounts["All"] ?? 0}
                </span>
              </button>

              {/* Dynamic Categories */}
              {categories.map((cat) => {
                const isCatActive = selectedCategory === cat.name;
                return (
                  <div key={cat.id} className="group relative flex items-center">
                    <button
                      onClick={() => setSelectedCategory(cat.name)}
                      className={cn(
                        "flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer text-left border pr-8",
                        isCatActive
                          ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border-[#FFE394]/50 shadow-[0_2px_8px_rgba(197,160,89,0.3)] font-bold"
                          : "bg-[#020A17]/60 text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#07162B] border-[#3A2C18]/60"
                      )}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <FolderOpen className="w-4 h-4 shrink-0" />
                        <span className="truncate">{cat.name}</span>
                      </div>
                      <span
                        className={cn(
                          "text-[11px] font-mono px-2 py-0.5 rounded-md shrink-0 ml-1.5",
                          isCatActive
                            ? "bg-[#07162B]/20 text-[#07162B] font-bold"
                            : "bg-[#020A17] text-[#C5A059] border border-[#3A2C18]"
                        )}
                      >
                        {categoryCounts[cat.name] ?? 0}
                      </span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategory(cat.id, cat.name);
                      }}
                      className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md text-red-400 hover:text-red-200 hover:bg-red-500/20"
                      title={`Delete compartment "${cat.name}"`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              {categories.length === 0 && (
                <div className="py-6 px-3 text-center text-xs text-[#C6B697]/70 italic border border-dashed border-[#3A2C18] rounded-xl">
                  No custom compartments yet. Click "+ New" to organize records.
                </div>
              )}
            </div>

            {/* Quick Upload Action Box at Bottom of Rail */}
            <div className="mt-2 pt-3 border-t border-[#3A2C18]/80 flex flex-col gap-2">
              <div className="p-3 rounded-xl bg-[#020A17]/80 border border-[#3A2C18]/80 text-center">
                <p className="text-[11px] text-[#C6B697] leading-relaxed">
                  Need to catalog state hearing decisions or testing manuals?
                </p>
                <button
                  onClick={() => setUploadOpen(true)}
                  className="w-full mt-2 py-1.5 rounded-lg text-xs font-semibold bg-[#07162B] hover:bg-[#0C1F3D] text-[#FFE394] border border-[#3A2C18] hover:border-[#C5A059] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Upload Document</span>
                </button>
              </div>
            </div>
          </aside>

          {/* ── Main Library Content / Grid ── */}
          <div className="flex-1 w-full space-y-4">
            {/* Search & Filter Header Strip */}
            <div className="rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search input with VoiceInput */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#C5A059]" />
                <VoiceInput
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search legal citations, OSEP letters, laws, or titles…"
                  className="pl-10 pr-10 bg-[#020A17]/85 border-[#3A2C18] text-[#FFF4D4] placeholder:text-[#C6B697]/50 focus:border-[#C5A059] rounded-xl h-10 text-xs sm:text-sm shadow-inner"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C6B697] hover:text-[#FFF4D4] p-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Status counter indicator */}
              <div className="flex items-center gap-2 justify-between sm:justify-end shrink-0">
                <span className="text-xs text-[#C6B697] font-medium">
                  Showing <strong className="text-[#FFF4D4]">{docs.length}</strong> {docs.length === 1 ? "document" : "documents"}
                </span>
                {selectedCategory !== "All" && (
                  <button
                    onClick={() => setSelectedCategory("All")}
                    className="text-[11px] text-[#C5A059] hover:text-[#FFE394] underline cursor-pointer"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            </div>

            {/* Documents Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-44 rounded-2xl bg-[#05142B]/80 border border-[#3A2C18] animate-pulse p-4 space-y-3"
                  >
                    <div className="h-5 w-24 bg-[#020A17] rounded-md" />
                    <div className="h-6 w-3/4 bg-[#020A17] rounded-md" />
                    <div className="h-10 w-full bg-[#020A17] rounded-md" />
                  </div>
                ))}
              </div>
            ) : docs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#3A2C18] bg-[#05142B]/60 p-12 text-center flex flex-col items-center justify-center">
                <div className="p-4 rounded-2xl bg-[#020A17] border border-[#3A2C18] text-[#C5A059] mb-3">
                  <BookOpen className="w-8 h-8 opacity-60" />
                </div>
                <h3 className="text-lg font-serif font-bold text-[#FFF4D4]">
                  {search ? "No matching records found" : "Library compartment is empty"}
                </h3>
                <p className="text-xs sm:text-sm text-[#C6B697] max-w-md mt-1 mb-5">
                  {search
                    ? `No legal texts or documents match "${search}". Try searching by statute number (e.g. 300.503), keyword, or title.`
                    : `Upload your first special education reference document${
                        selectedCategory !== "All" ? ` into "${selectedCategory}"` : ""
                      }.`}
                </p>
                <button
                  onClick={() => setUploadOpen(true)}
                  className="h-9 px-4 rounded-xl text-xs font-bold flex items-center gap-2 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-md cursor-pointer hover:brightness-110"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Document</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="group relative flex flex-col justify-between rounded-2xl border border-[#3A2C18] bg-[#05142B]/90 hover:border-[#C5A059]/80 p-4 sm:p-5 transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:shadow-[0_10px_35px_rgba(197,160,89,0.25)] min-h-[220px]"
                  >
                    {/* Top Right Subtle Ambient Glow */}
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#C5A059]/10 rounded-full blur-2xl pointer-events-none group-hover:bg-[#C5A059]/20 transition-all duration-300" />

                    <div>
                      {/* Category Chip & Delete Action */}
                      <div className="relative z-10 flex items-center justify-between gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-[#3A2C18] bg-[#020A17] text-[#FFE394] shadow-sm">
                          <FolderOpen className="w-3 h-3 text-[#C5A059]" />
                          <span className="truncate max-w-[140px]">{doc.category}</span>
                        </span>

                        <button
                          onClick={() => handleDelete(doc.id, doc.title)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-red-400 hover:text-red-200 hover:bg-red-500/20"
                          title="Remove document from library"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Icon + Title */}
                      <div className="relative z-10 flex items-start gap-3">
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center text-[#DFBE77] group-hover:scale-105 group-hover:border-[#C5A059]/60 transition-all shadow-md">
                          <FileText className="w-5 h-5 text-[#C5A059]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-serif font-bold text-sm sm:text-base leading-snug text-[#FFF4D4] group-hover:text-[#FFE394] transition-colors line-clamp-2">
                            {doc.title}
                          </h4>
                          {doc.description && (
                            <p className="text-xs text-[#C6B697] mt-1.5 leading-relaxed line-clamp-2">
                              {doc.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Recessed Footer Bar */}
                    <div className="relative z-10 mt-4 pt-3 border-t border-[#3A2C18]/60 flex items-center justify-between">
                      <div className="text-[11px] font-mono text-[#C6B697] flex items-center gap-1.5">
                        <span>{formatBytes(doc.fileSize)}</span>
                        <span>•</span>
                        <span>{new Date(doc.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>

                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C5A059] hover:text-[#FFF4D4] hover:underline transition-colors"
                      >
                        <span>Open Document</span>
                        <ExternalLink className="w-3 h-3 text-[#C5A059]" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Admiralty Upload Document Dialog ── */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.95)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif font-bold text-[#FFF4D4] flex items-center gap-2">
              <Library className="w-5 h-5 text-[#C5A059]" />
              <span>Catalog Legal Reference Document</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#C6B697]">
              Ingest authoritative special ed statutory laws, OSEP guidance, or manuals into Cloudflare R2 storage.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpload} className="space-y-4 pt-2">
            {/* File Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200",
                selectedFile
                  ? "border-[#C5A059] bg-[#020A17]/80"
                  : "border-[#3A2C18] hover:border-[#C5A059] bg-[#020A17]/40 hover:bg-[#020A17]/80"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              {selectedFile ? (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="p-2 rounded-xl bg-[#07162B] text-[#FFE394] border border-[#3A2C18]">
                    <FileCheck className="h-6 w-6 text-[#C5A059]" />
                  </div>
                  <p className="text-sm font-serif font-bold text-[#FFE394]">{selectedFile.name}</p>
                  <p className="text-xs font-mono text-[#C6B697]">{formatBytes(selectedFile.size)}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 rounded-2xl bg-[#07162B] text-[#C5A059] border border-[#3A2C18]">
                    <Upload className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-[#FFF4D4]">Click or drop PDF here to catalog</p>
                  <p className="text-xs text-[#C6B697]">Authentic PDF documents only · Maximum 50 MB</p>
                </div>
              )}
            </div>

            {/* Title with VoiceInput */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#C6B697]">
                Document Title *
              </label>
              <VoiceInput
                value={uploadForm.title}
                onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. 34 CFR § 300.503 Prior Written Notice Guidance"
                className="bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] placeholder:text-[#C6B697]/50 focus:border-[#C5A059] rounded-xl text-xs sm:text-sm"
                required
              />
            </div>

            {/* Category selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#C6B697]">
                Library Compartment
              </label>
              <Select
                value={uploadForm.category}
                onValueChange={(v) => setUploadForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger className="bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] rounded-xl text-xs sm:text-sm">
                  <SelectValue placeholder="Select a compartment…" />
                </SelectTrigger>
                <SelectContent className="bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4]">
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name} className="focus:bg-[#07162B] focus:text-[#FFE394]">
                      {c.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="Other" className="focus:bg-[#07162B] focus:text-[#FFE394]">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description with VoiceInput */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#C6B697]">
                Notes / Compendium Context <span className="normal-case opacity-60">(optional)</span>
              </label>
              <VoiceInput
                value={uploadForm.description}
                onChange={(e) => setUploadForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Key statutory citations, relevance to eligibility, or practice guidance…"
                className="bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] placeholder:text-[#C6B697]/50 focus:border-[#C5A059] rounded-xl text-xs sm:text-sm"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setUploadOpen(false)}
                className="flex-1 h-10 rounded-xl text-xs font-semibold bg-[#020A17] text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#07162B] border border-[#3A2C18] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="flex-1 h-10 rounded-xl text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-md hover:brightness-110 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-[#07162B] border-t-transparent rounded-full" />
                    <span>Cataloging…</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Ingest Document</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Admiralty Add Category Compartment Dialog ── */}
      <Dialog open={addCatOpen} onOpenChange={setAddCatOpen}>
        <DialogContent className="max-w-sm bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.95)]">
          <DialogHeader>
            <DialogTitle className="text-lg font-serif font-bold text-[#FFF4D4] flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-[#C5A059]" />
              <span>New Library Compartment</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#C6B697]">
              Create a distinct category compartment to organize documents.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. State Administrative Regulations"
              className="bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] placeholder:text-[#C6B697]/50 focus:border-[#C5A059] rounded-xl text-xs sm:text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newCategoryName.trim()) {
                  createCategoryMutation.mutate({ name: newCategoryName.trim() });
                }
              }}
              autoFocus
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setAddCatOpen(false);
                  setNewCategoryName("");
                }}
                className="flex-1 h-9 rounded-xl text-xs font-semibold bg-[#020A17] text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#07162B] border border-[#3A2C18] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                onClick={() => createCategoryMutation.mutate({ name: newCategoryName.trim() })}
                className="flex-1 h-9 rounded-xl text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-md hover:brightness-110 disabled:opacity-50 cursor-pointer"
              >
                {createCategoryMutation.isPending ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
