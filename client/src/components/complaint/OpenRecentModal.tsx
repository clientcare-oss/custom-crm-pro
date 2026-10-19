import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import {
  listRecentComplaintDrafts,
  deleteComplaintDraft,
  loadComplaintDraft,
  type RecentDraftItem,
  type StoredComplaintDraft,
} from "@/lib/complaintDraftStorage";
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
  const [drafts, setDrafts] = useState<RecentDraftItem[]>([]);
  const [search, setSearch] = useState("");

  const refreshList = () => {
    const list = listRecentComplaintDrafts();
    setDrafts(list);
  };

  useEffect(() => {
    if (open) {
      refreshList();
    }
  }, [open]);

  const handleOpenDraft = (item: RecentDraftItem) => {
    const fullDraft = loadComplaintDraft(item.id || item.studentId);
    if (!fullDraft) {
      toast.error("Could not load full draft from local storage.");
      return;
    }
    onSelectDraft(fullDraft);
    toast.success(`✓ Resumed draft: ${fullDraft.studentName || item.studentName}`);
    onOpenChange(false);
  };

  const handleDeleteDraft = (e: React.MouseEvent, item: RecentDraftItem) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to remove this saved draft for "${item.studentName}"?`)) {
      deleteComplaintDraft(item.id || item.studentId || "");
      refreshList();
      toast.info(`Deleted draft version`);
    }
  };

  // Strictly filter drafts to ONLY the student from which the modal was accessed
  const studentFilteredDrafts = drafts.filter((d) => {
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
    // If no student is active, show available drafts
    if (!currentStudentId && (!currentStudentName || currentStudentName.includes("Student on Record"))) {
      return true;
    }
    return false;
  });

  const displayDrafts = studentFilteredDrafts.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      d.studentName.toLowerCase().includes(q) ||
      d.title.toLowerCase().includes(q) ||
      d.stateCode.toLowerCase().includes(q) ||
      d.statementSnippet.toLowerCase().includes(q)
    );
  });

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
      <DialogContent className="max-w-2xl bg-[#030F20] text-slate-100 border-2 border-[#C5A059] shadow-[0_20px_60px_rgba(0,0,0,0.9)] p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#05142B] via-[#092244] to-[#05142B] p-5 border-b border-[#3A2C18] relative">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFE394] via-[#DFBE77] to-[#9E7D3B] text-[#05142B] flex items-center justify-center shadow-md border border-[#FFF4D4] shrink-0">
                <FolderOpen className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="font-serif text-lg sm:text-xl font-bold text-[#FFF4D4] truncate">
                  {displayName ? `Recent Drafts · ${displayName}` : "Recent State Complaint Drafts"}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#C6B697] mt-0.5 truncate">
                  {displayName
                    ? `Saved complaint filings and revisions exclusively for ${displayName}.`
                    : "Pick up right where you left off. All your working issues, facts, and state forms are saved."}
                </DialogDescription>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={() => {
                onSaveCurrentNow();
                refreshList();
              }}
              className="bg-[#0B254A] hover:bg-[#12386E] text-[#FFE394] hover:text-[#FFF4D4] border border-[#C5A059]/60 text-xs gap-1.5 h-8 px-3 rounded-md cursor-pointer shrink-0"
              title={`Save current draft version for ${displayName || "student"}`}
            >
              <Save className="w-3.5 h-3.5 text-[#DFBE77]" />
              <span>Save Version</span>
            </Button>
          </div>

          {/* Search bar */}
          <div className="relative mt-3.5">
            <Search className="w-4 h-4 text-[#A69371] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${displayName ? `${displayName}'s` : ""} draft history by keyword or issue...`}
              className="w-full bg-[#020A17] border border-[#3A2C18] focus:border-[#C5A059] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#FFF4D4] placeholder:text-[#6C5B3E] focus:outline-none"
            />
          </div>
        </div>

        {/* Drafts List Body (Exclusively for this student) */}
        <div className="p-4 sm:p-5 max-h-[380px] overflow-y-auto space-y-2.5 custom-scrollbar bg-[#020C1B]">
          {displayDrafts.length === 0 ? (
            <div className="text-center py-10 px-4 rounded-xl border border-dashed border-[#3A2C18] bg-[#031124]">
              <FileText className="w-10 h-10 text-[#6C5B3E] mx-auto mb-2" />
              <div className="text-sm font-serif font-bold text-[#D8C7A5]">
                {search
                  ? "No matching draft versions found"
                  : `No saved draft history for ${displayName || "this student"} yet`}
              </div>
              <p className="text-xs text-[#8C7D64] max-w-sm mx-auto mt-1 leading-relaxed">
                Your complaint text, facts, and state form entries auto-save continuously as you draft.
                Click <span className="text-[#FFE394] font-bold">"Save Version"</span> above to create an immediate restore checkpoint for {displayName || "this student"}.
              </p>
            </div>
          ) : (
            displayDrafts.map((item, idx) => {
              return (
                <div
                  key={item.id || idx}
                  onClick={() => handleOpenDraft(item)}
                  className="p-3.5 rounded-xl border transition-all cursor-pointer select-none flex items-start justify-between gap-3 group relative bg-[#041329] border-[#203653] hover:border-[#C5A059] hover:bg-[#071C3A]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-serif font-bold text-sm text-[#FFF4D4] group-hover:text-[#FFE394] transition-colors">
                        {item.title}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#DFBE77]/15 border border-[#DFBE77]/40 text-[#FFE394]">
                        {item.stateCode || "GA"} State Form
                      </span>
                    </div>

                    <div className="text-xs text-[#E5D7B7] font-medium flex items-center gap-1.5 mb-1 font-sans">
                      <User className="w-3 h-3 text-[#DFBE77]" />
                      <span>{item.studentName}</span>
                    </div>

                    {item.statementSnippet && (
                      <p className="text-[11px] text-[#A69371] line-clamp-2 leading-relaxed italic bg-[#020A17]/80 rounded p-1.5 border border-[#1A2E47]">
                        "{item.statementSnippet}..."
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[10px] text-[#7E6E50] mt-2 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#DFBE77]" />
                        <span>Saved {formatTimeAgo(item.updatedAt)}</span>
                      </span>
                      <span>•</span>
                      <span>{item.pageCount} Sections / Exhibits</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-center">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleOpenDraft(item)}
                      className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-8 px-3 gap-1 rounded-md shadow-sm hover:brightness-110 cursor-pointer"
                    >
                      <span>Resume</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </Button>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteDraft(e, item)}
                      className="p-1.5 rounded-md text-[#7E6E50] hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
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
                  `Start a clean blank complaint draft for ${displayName || "this student"}? Your existing saved versions will remain safe.`
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
