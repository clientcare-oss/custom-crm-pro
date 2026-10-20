import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  FolderOpen,
  Clock,
  Trash2,
  ArrowRight,
  FileText,
  Plus,
  Save,
  ShieldCheck,
  Check,
  Search,
  User,
  X,
  Calendar,
  Cloud,
  Layers,
} from "lucide-react";
import {
  listRecentComplaintDrafts,
  deleteComplaintDraft,
  loadComplaintDraft,
  saveComplaintDraft,
  deduplicateDraftItems,
  type RecentDraftItem,
  type StoredComplaintDraft,
} from "@/lib/complaintDraftStorage";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OpenRecentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectDraft: (draft: StoredComplaintDraft) => void;
  onStartNewDraft: () => void;
  onSaveCurrentNow: () => void;
  currentStudentId?: number | string | null;
  currentStudentName?: string;
}

export function OpenRecentModal({
  open,
  onOpenChange,
  onSelectDraft,
  onStartNewDraft,
  onSaveCurrentNow,
  currentStudentId,
  currentStudentName,
}: OpenRecentModalProps) {
  const [localDrafts, setLocalDrafts] = useState<RecentDraftItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"student" | "all">("student");

  // Query Cloud D1 database for complaints (syncs localhost and live site)
  const cloudDraftsQuery = trpc.stateComplaint.listDrafts.useQuery(undefined, {
    enabled: open,
    refetchOnWindowFocus: true,
  });

  const refreshLocalList = () => {
    const list = listRecentComplaintDrafts();
    setLocalDrafts(list);
  };

  useEffect(() => {
    if (open) {
      refreshLocalList();
      cloudDraftsQuery.refetch();
    }
  }, [open]);

  // Combine and deduplicate local storage drafts and cloud D1 drafts
  const allDrafts = useMemo(() => {
    const combined: RecentDraftItem[] = [...localDrafts];

    if (cloudDraftsQuery.data && Array.isArray(cloudDraftsQuery.data)) {
      for (const cloudItem of cloudDraftsQuery.data) {
        let snippet = "";
        let sName = "Student on Record";
        let stateCode = "GA";
        let pageCount = 4;
        let parsedDraftObj: any = null;

        if (cloudItem.draftJson) {
          try {
            parsedDraftObj = JSON.parse(cloudItem.draftJson);
            sName = parsedDraftObj.studentName || parsedDraftObj.caseDetails?.studentName || sName;
            stateCode = parsedDraftObj.stateCode || parsedDraftObj.formState?.stateCode || stateCode;
            pageCount = Array.isArray(parsedDraftObj.pages) ? parsedDraftObj.pages.length : pageCount;
            snippet = (
              parsedDraftObj.formState?.statementOfViolations ||
              parsedDraftObj.formState?.factsRelatingToViolations ||
              parsedDraftObj.pages?.[1]?.content ||
              ""
            ).slice(0, 140);
          } catch {}
        }

        combined.push({
          id: `cloud_${cloudItem.id}`,
          studentId: cloudItem.studentId,
          studentName: sName,
          title: cloudItem.title,
          startedAt: cloudItem.startedAt,
          updatedAt: cloudItem.updatedAt,
          stateCode,
          pageCount,
          statementSnippet: snippet,
          source: "cloud",
          draftJson: cloudItem.draftJson,
        });
      }
    }

    return deduplicateDraftItems(combined);
  }, [localDrafts, cloudDraftsQuery.data]);

  // Filter drafts for current active student
  const studentFilteredDrafts = useMemo(() => {
    return allDrafts.filter((d) => {
      if (currentStudentId) {
        if (d.studentId && String(d.studentId) === String(currentStudentId)) {
          return true;
        }
      }
      if (
        currentStudentName &&
        currentStudentName.trim() !== "" &&
        !currentStudentName.includes("Student on Record")
      ) {
        if (
          d.studentName &&
          d.studentName.toLowerCase().trim() === currentStudentName.toLowerCase().trim()
        ) {
          return true;
        }
      }
      return false;
    });
  }, [allDrafts, currentStudentId, currentStudentName]);

  // Auto-switch to "all" tab if current student has 0 drafts but practice has drafts
  useEffect(() => {
    if (studentFilteredDrafts.length === 0 && allDrafts.length > 0) {
      setActiveTab("all");
    } else if (studentFilteredDrafts.length > 0 && (!currentStudentName || !currentStudentName.includes("Student on Record"))) {
      setActiveTab("student");
    }
  }, [studentFilteredDrafts.length, allDrafts.length]);

  const activeDraftsList = activeTab === "student" && studentFilteredDrafts.length > 0
    ? studentFilteredDrafts
    : allDrafts;

  const displayDrafts = activeDraftsList.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const startedStr = d.startedAt ? new Date(d.startedAt).toLocaleDateString().toLowerCase() : "";
    const updatedStr = d.updatedAt ? new Date(d.updatedAt).toLocaleDateString().toLowerCase() : "";
    return (
      d.studentName.toLowerCase().includes(q) ||
      d.title.toLowerCase().includes(q) ||
      d.stateCode.toLowerCase().includes(q) ||
      d.statementSnippet.toLowerCase().includes(q) ||
      startedStr.includes(q) ||
      updatedStr.includes(q)
    );
  });

  const handleOpenDraft = (item: RecentDraftItem) => {
    // 1. If cloud draft JSON is available, restore and cache locally
    if (item.draftJson) {
      try {
        const parsed = JSON.parse(item.draftJson);
        if (parsed && typeof parsed === "object") {
          saveComplaintDraft(parsed, false);
          onSelectDraft(parsed);
          toast.success(`✓ Resumed draft: ${parsed.studentName || item.studentName}`);
          onOpenChange(false);
          return;
        }
      } catch (err) {
        console.warn("[handleOpenDraft] Failed to parse cloud draft JSON:", err);
      }
    }

    // 2. Multi-key local resolution cascade
    let fullDraft = loadComplaintDraft(item.id);
    if (!fullDraft && item.studentId) {
      fullDraft = loadComplaintDraft(item.studentId);
    }
    if (!fullDraft && item.id) {
      fullDraft = loadComplaintDraft(item.id.replace(/^draft_/, "").replace(/^cloud_/, ""));
    }
    if (!fullDraft && currentStudentId) {
      fullDraft = loadComplaintDraft(currentStudentId);
    }
    if (!fullDraft) {
      fullDraft = loadComplaintDraft("active");
    }

    if (!fullDraft) {
      toast.error("Could not load draft data. Please try another revision.");
      return;
    }
    onSelectDraft(fullDraft);
    toast.success(`✓ Resumed draft: ${fullDraft.studentName || item.studentName}`);
    onOpenChange(false);
  };

  const handleDeleteDraft = (e: React.MouseEvent, item: RecentDraftItem) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to remove this saved complaint draft for "${item.studentName}"?`)) {
      deleteComplaintDraft(item.id || item.studentId || "");
      refreshLocalList();
      toast.info(`Deleted draft entry`);
    }
  };

  const formatStartedDate = (isoDate?: string) => {
    if (!isoDate) return "Unknown";
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Unknown";
    }
  };

  const formatDateTime = (isoDate?: string) => {
    if (!isoDate) return "Recently";
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "Recently";
    }
  };

  const formatTimeAgo = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.round(diffMs / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.round(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.round(diffHours / 24);
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return "Recently";
    }
  };

  const displayName = currentStudentName && !currentStudentName.includes("Student on Record")
    ? currentStudentName
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[96vw] max-w-3xl sm:max-w-3xl md:max-w-3xl bg-[#030F20] text-slate-100 border-2 border-[#C5A059] shadow-[0_20px_60px_rgba(0,0,0,0.9)] p-0 overflow-hidden rounded-xl"
      >
        {/* Header with clean non-overlapping action controls */}
        <div className="bg-gradient-to-r from-[#05142B] via-[#092244] to-[#05142B] p-4 sm:p-5 border-b border-[#3A2C18]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFE394] via-[#DFBE77] to-[#9E7D3B] text-[#05142B] flex items-center justify-center shadow-md border border-[#FFF4D4] shrink-0">
                <FolderOpen className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="font-serif text-lg sm:text-xl font-bold text-[#FFF4D4] truncate">
                  State Complaint Drafts & Filings
                </DialogTitle>
                <DialogDescription className="text-xs text-[#C6B697] mt-0.5 truncate">
                  Pick up right where you left off. Review exact start dates, latest revisions, and cloud-synced filings.
                </DialogDescription>
              </div>
            </div>

            {/* Action buttons on right: Save Version + Dedicated Close Button */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onSaveCurrentNow();
                  refreshLocalList();
                }}
                className="bg-[#0B254A] hover:bg-[#12386E] text-[#FFE394] hover:text-[#FFF4D4] border border-[#C5A059]/60 text-xs gap-1.5 h-8 px-3 rounded-md cursor-pointer shrink-0 shadow-sm"
                title={`Save current draft version for ${displayName || "student"}`}
              >
                <Save className="w-3.5 h-3.5 text-[#DFBE77]" />
                <span className="hidden xs:inline">Save Version</span>
                <span className="xs:hidden">Save</span>
              </Button>

              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="w-8 h-8 rounded-md border border-[#3A2C18] bg-[#020A17] text-[#A69371] hover:text-[#FFF4D4] hover:bg-[#092244] hover:border-[#DFBE77] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Segmented Filter Controls: Active Student vs All Practice Filings */}
          <div className="flex items-center justify-between gap-2 mt-3.5 flex-wrap">
            <div className="flex items-center bg-[#020A17] p-1 rounded-lg border border-[#3A2C18] gap-1">
              {displayName && (
                <button
                  type="button"
                  onClick={() => setActiveTab("student")}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                    activeTab === "student"
                      ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-sm font-bold"
                      : "text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B]"
                  )}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{displayName}</span>
                  <span className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                    activeTab === "student" ? "bg-[#07162B] text-[#FFE394]" : "bg-[#102B4E] text-[#D8C7A5]"
                  )}>
                    {studentFilteredDrafts.length}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                  activeTab === "all" || !displayName
                    ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-sm font-bold"
                    : "text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#07162B]"
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>All Practice Filings</span>
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                  activeTab === "all" || !displayName ? "bg-[#07162B] text-[#FFE394]" : "bg-[#102B4E] text-[#D8C7A5]"
                )}>
                  {allDrafts.length}
                </span>
              </button>
            </div>

            {/* Cloud sync indicator */}
            <div className="flex items-center gap-1.5 text-[11px] text-[#A69371] font-mono">
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cloud & Local Sync Active</span>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mt-2.5">
            <Search className="w-4 h-4 text-[#A69371] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student, start date (e.g. Oct 19), violation keyword..."
              className="w-full bg-[#020A17] border border-[#3A2C18] focus:border-[#C5A059] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#FFF4D4] placeholder:text-[#6C5B3E] focus:outline-none"
            />
          </div>
        </div>

        {/* Drafts List Body (Consolidated & Deduplicated) */}
        <div className="p-4 sm:p-5 max-h-[420px] overflow-y-auto space-y-3 custom-scrollbar bg-[#020C1B]">
          {displayDrafts.length === 0 ? (
            <div className="text-center py-10 px-4 rounded-xl border border-dashed border-[#3A2C18] bg-[#031124]">
              <FileText className="w-10 h-10 text-[#6C5B3E] mx-auto mb-2" />
              <div className="text-sm font-serif font-bold text-[#D8C7A5]">
                {search
                  ? "No matching complaint filings found"
                  : activeTab === "student" && displayName
                  ? `No previous draft on record for ${displayName}`
                  : "No complaint filings on record yet"}
              </div>
              <p className="text-xs text-[#8C7D64] max-w-sm mx-auto mt-1 leading-relaxed">
                {activeTab === "student" && allDrafts.length > 0
                  ? `You have ${allDrafts.length} other complaint filing(s) on record. Click "All Practice Filings" above to view them.`
                  : "Click 'New Blank Complaint' below to start drafting. All text, facts, and state forms auto-save continuously."}
              </p>
            </div>
          ) : (
            displayDrafts.map((item, idx) => {
              return (
                <div
                  key={item.id || idx}
                  className="p-4 rounded-xl border transition-all select-none bg-[#041329] border-[#203653] hover:border-[#C5A059] hover:bg-[#071C3A] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 group shadow-sm"
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-serif font-bold text-sm sm:text-base text-[#FFF4D4] group-hover:text-[#FFE394] transition-colors">
                        {item.title}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#DFBE77]/15 border border-[#DFBE77]/40 text-[#FFE394]">
                        {item.stateCode || "GA"} State Form
                      </span>
                      {item.source === "cloud" && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-950/60 border border-emerald-600/50 text-emerald-300 flex items-center gap-1">
                          <Cloud className="w-3 h-3" />
                          <span>Cloud Synced</span>
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-[#E5D7B7] font-medium flex items-center gap-1.5 font-sans">
                      <User className="w-3.5 h-3.5 text-[#DFBE77]" />
                      <span>{item.studentName}</span>
                    </div>

                    {item.statementSnippet && (
                      <p className="text-[11px] text-[#A69371] line-clamp-2 leading-relaxed italic bg-[#020A17]/85 rounded-md p-2 border border-[#1A2E47] max-w-full break-words">
                        "{item.statementSnippet}..."
                      </p>
                    )}

                    {/* Prominent Date Started & Last Modified Metrics */}
                    <div className="flex items-center gap-2.5 text-[10px] font-mono pt-1 flex-wrap">
                      {/* Date Started (Guaranteed visible) */}
                      <span className="flex items-center gap-1 text-[#FFE394] font-semibold bg-[#102B4E]/80 px-2 py-0.5 rounded border border-[#DFBE77]/40">
                        <Calendar className="w-3 h-3 text-[#DFBE77]" />
                        <span>Started: {formatStartedDate(item.startedAt)}</span>
                      </span>

                      {/* Last Modified */}
                      <span className="flex items-center gap-1 text-[#C6B697] bg-[#020A17] px-2 py-0.5 rounded border border-[#3A2C18]">
                        <Clock className="w-3 h-3 text-[#A69371]" />
                        <span>Modified: {formatDateTime(item.updatedAt)} ({formatTimeAgo(item.updatedAt)})</span>
                      </span>

                      {/* Exhibit / Section Count */}
                      <span className="text-[#8C7D64]">
                        {item.pageCount} Sections / Exhibits
                      </span>
                    </div>
                  </div>

                  {/* Clean Dedicated Action Column */}
                  <div className="flex items-center gap-2 shrink-0 sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-[#1A2E47]">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleOpenDraft(item)}
                      className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-8.5 px-3.5 gap-1.5 rounded-md shadow-md hover:brightness-110 cursor-pointer"
                    >
                      <span>Resume</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </Button>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteDraft(e, item)}
                      className="p-2 rounded-md text-[#7E6E50] hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/40 transition-colors cursor-pointer"
                      title="Delete this saved draft version"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer actions */}
        <div className="bg-[#030F20] px-5 py-3 border-t border-[#3A2C18] flex items-center justify-between gap-3 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (
                confirm(
                  `Start a clean blank complaint draft for ${displayName || "this student"}? Your existing saved complaint filings will remain safe.`
                )
              ) {
                onStartNewDraft();
                onOpenChange(false);
              }
            }}
            className="border-[#3A2C18] bg-[#020A17] text-[#C6B697] hover:text-[#FFF4D4] hover:border-[#DFBE77] text-xs h-8 gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#DFBE77]" />
            <span>New Blank Complaint</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="border-[#3A2C18] text-[#A69371] hover:text-white text-xs h-8 cursor-pointer"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
