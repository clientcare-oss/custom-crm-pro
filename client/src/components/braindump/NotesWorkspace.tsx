import React, { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { BrainItem, ViewMode, Status, Priority, DEFAULT_CATEGORIES } from "./types";
import NotesHeader from "./NotesHeader";
import NotesWallView from "./NotesWallView";
import NotesListView from "./NotesListView";
import NoteEditorDialog from "./NoteEditorDialog";
import TakeActionMenu from "./TakeActionMenu";
import BulkClassifyModal from "./BulkClassifyModal";
import { Lock, Building, FolderSync, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotesWorkspaceProps {
  scope?: "employee" | "company";
  targetEmployeeId?: string;
  targetEmployeeName?: string;
  isCeoOrAdmin?: boolean;
  companyName?: string;
}

export default function NotesWorkspace({
  scope = "employee",
  targetEmployeeId = "emp-byron-honea",
  targetEmployeeName = "Byron Honea",
  isCeoOrAdmin = true,
  companyName = "Waypoint Advocates",
}: NotesWorkspaceProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("wall");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [editNote, setEditNote] = useState<BrainItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [actionNote, setActionNote] = useState<BrainItem | null>(null);
  const [classifyModalOpen, setClassifyModalOpen] = useState(false);

  const utils = trpc.useUtils();

  // Load all notes from database
  const { data: allNotes = [], isLoading } = trpc.brainDump.list.useQuery(
    {
      scope: scope === "company" ? "company" : "employee",
      employeeId: scope === "employee" ? targetEmployeeId : undefined,
    },
    { refetchOnWindowFocus: false }
  );

  // Load summary counts
  const { data: summaryStats } = trpc.brainDump.summary.useQuery(
    {
      scope: scope === "company" ? "company" : "employee",
      employeeId: scope === "employee" ? targetEmployeeId : undefined,
    },
    { refetchOnWindowFocus: false }
  );

  // Load all unclassified notes for migration
  const { data: unclassifiedNotes = [] } = trpc.brainDump.list.useQuery(
    { scope: "unclassified" },
    { enabled: isCeoOrAdmin, refetchOnWindowFocus: false }
  );

  const { data: dbCategories = [] } = trpc.brainDump.categories.useQuery();
  const allCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...dbCategories]));

  // Create Note Mutation
  const createMutation = trpc.brainDump.create.useMutation({
    onSuccess: () => {
      utils.brainDump.list.invalidate();
      utils.brainDump.summary.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // Update Note Mutation
  const updateMutation = trpc.brainDump.update.useMutation({
    onSuccess: () => {
      utils.brainDump.list.invalidate();
      utils.brainDump.summary.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // Delete Note Mutation
  const deleteMutation = trpc.brainDump.delete.useMutation({
    onSuccess: () => {
      utils.brainDump.list.invalidate();
      utils.brainDump.summary.invalidate();
      toast.success("Note deleted.");
    },
    onError: (e) => toast.error(e.message),
  });

  // Bulk Classify Mutation
  const bulkClassifyMutation = trpc.brainDump.bulkClassify.useMutation({
    onSuccess: (data) => {
      toast.success(`Moved ${data.count} notes!`);
      utils.brainDump.list.invalidate();
      utils.brainDump.summary.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // Filtered Notes for Display
  const filteredNotes = useMemo(() => {
    let result = [...(allNotes as BrainItem[])];

    if (activeCategory !== "All") {
      result = result.filter((n) => n.category === activeCategory);
    }

    if (statusFilter !== "all") {
      result = result.filter((n) => n.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.body ?? "").toLowerCase().includes(q) ||
          (n.nextStep ?? "").toLowerCase().includes(q) ||
          (n.tags ?? []).some((t: string) => t.toLowerCase().includes(q))
      );
    }

    return result.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.id - a.id;
    });
  }, [allNotes, activeCategory, statusFilter, search]);

  // Derived Summary Counts
  const counts = useMemo(() => {
    const list = allNotes as BrainItem[];
    return {
      total: summaryStats?.total ?? list.length,
      pinned: summaryStats?.pinned ?? list.filter((n) => n.pinned).length,
      inProgress: summaryStats?.inProgress ?? list.filter((n) => n.status === "in_progress").length,
      done: summaryStats?.done ?? list.filter((n) => n.status === "done").length,
      notStarted: summaryStats?.notStarted ?? list.filter((n) => n.status === "not_started").length,
    };
  }, [allNotes, summaryStats]);

  // Quick Add handler (from Wall Quick Capture dock)
  const handleQuickAdd = async (title: string, category: string = "General") => {
    const res = await createMutation.mutateAsync({
      title,
      category,
      scope: scope === "company" ? "company" : "employee",
      employeeId: scope === "employee" ? targetEmployeeId : undefined,
      organizationId: scope === "company" ? "waypoint" : "default",
    });
    toast.success("Note captured! 💡");
    return res;
  };

  const handleOpenAddDialog = () => {
    const newDraft: BrainItem = {
      id: 0,
      title: "",
      body: "",
      category: activeCategory !== "All" ? activeCategory : "General",
      status: "not_started",
      priority: "medium",
      pinned: false,
      tags: [],
      scope: scope === "company" ? "company" : "employee",
      employeeId: scope === "employee" ? targetEmployeeId : undefined,
      organizationId: scope === "company" ? "waypoint" : "default",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setEditNote(newDraft);
    setEditOpen(true);
  };

  const handleSaveNote = async (data: Partial<BrainItem> & { id: number }) => {
    if (data.id === 0) {
      // New note creation
      await createMutation.mutateAsync({
        title: data.title || "Untitled Note",
        body: data.body || undefined,
        category: data.category || "General",
        status: data.status || "not_started",
        priority: data.priority || "medium",
        scope: (data.scope as any) || scope,
        employeeId: data.employeeId || (scope === "employee" ? targetEmployeeId : undefined),
        bringUpDate: data.bringUpDate || undefined,
        nextStep: data.nextStep || undefined,
        pinned: data.pinned ?? false,
        tags: data.tags || [],
      });
      toast.success("New note saved! 💡");
    } else {
      // Existing note update
      await updateMutation.mutateAsync(data as any);
      toast.success("Note updated. 💡");
    }
  };

  const handleTogglePin = (note: BrainItem) => {
    updateMutation.mutate({ id: note.id, pinned: !note.pinned });
  };

  const handleDuplicate = async (note: BrainItem) => {
    await createMutation.mutateAsync({
      title: `${note.title} (Copy)`,
      body: note.body || undefined,
      category: note.category,
      priority: note.priority,
      status: "not_started",
      scope: note.scope,
      employeeId: note.employeeId || undefined,
      organizationId: note.organizationId || "default",
      bringUpDate: note.bringUpDate || undefined,
      tags: note.tags,
    });
    toast.success("Note duplicated!");
  };

  const handleBulkMove = (ids: number[], targetScope: "employee" | "company") => {
    bulkClassifyMutation.mutate({
      ids,
      targetScope,
      employeeId: targetScope === "employee" ? targetEmployeeId : undefined,
      organizationId: targetScope === "company" ? "waypoint" : "default",
    });
  };

  const handleBulkStatusChange = (ids: number[], status: any) => {
    ids.forEach((id) => {
      updateMutation.mutate({ id, status });
    });
    toast.success(`Updated ${ids.length} notes!`);
  };

  // Header Title & Subtitle based on scope
  const isReviewingAnotherEmployee =
    scope === "employee" && targetEmployeeId !== "emp-byron-honea" && Boolean(targetEmployeeName);

  const headerTitle =
    scope === "company"
      ? `${companyName} · Company Notes`
      : isReviewingAnotherEmployee
      ? `${targetEmployeeName} · Employee Notes`
      : "My Notes";

  const headerSubtitle =
    scope === "company"
      ? "Ideas, plans, improvements & things to revisit for organizational leadership."
      : isReviewingAnotherEmployee
      ? `Viewing authorized private business workspace for ${targetEmployeeName}.`
      : "Capture it. Organize it. Turn it into action.";

  return (
    <div className="w-full flex flex-col gap-3.5 pb-12 select-text">
      {/* ── Employee Disclosure Banner (Tasteful, integrated) ──────────── */}
      {scope === "employee" && (
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#0f172a]/70 border border-blue-900/40 text-[11px] text-slate-400">
          <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            <strong className="text-slate-200">Your Employee Notes:</strong> This is your private business workspace. Other employees cannot view your notes. Company administrators can access this workspace when needed. Nothing here is added to a client record.
          </span>
        </div>
      )}

      {/* ── Unclassified Migration Alert Banner (When legacy notes need classification) ── */}
      {isCeoOrAdmin && (summaryStats?.unclassified ?? unclassifiedNotes.length) > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-600/10 to-transparent border border-amber-500/40 text-xs text-amber-200 shadow-md">
          <div className="flex items-center gap-2">
            <FolderSync className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span>
              <strong className="text-amber-300">
                {summaryStats?.unclassified ?? unclassifiedNotes.length} legacy BrainDump notes
              </strong>{" "}
              are unclassified. Review and categorize them into Byron's My Notes or {companyName} Company Notes.
            </span>
          </div>

          <Button
            size="sm"
            onClick={() => setClassifyModalOpen(true)}
            className="text-xs h-7 px-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold shrink-0 shadow-sm cursor-pointer"
          >
            Review & Classify All
          </Button>
        </div>
      )}

      {/* ── Approved Global Charcoal Header ──────────────────────────────── */}
      <NotesHeader
        title={headerTitle}
        subtitle={headerSubtitle}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        search={search}
        onSearchChange={setSearch}
        category={activeCategory}
        onCategoryChange={setActiveCategory}
        categories={allCategories}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        onAddClick={handleOpenAddDialog}
        isCompanyScope={scope === "company"}
      />

      {/* ── Main View: Wall View (Corkboard) or List View (Table) ────────── */}
      {viewMode === "wall" ? (
        <NotesWallView
          notes={filteredNotes}
          summaryCounts={counts}
          onNoteClick={(note) => {
            setEditNote(note);
            setEditOpen(true);
          }}
          onQuickAdd={handleQuickAdd}
          onTakeActionClick={(actionType) => {
            const firstNote = filteredNotes[0] || null;
            if (!firstNote) {
              toast.info("Please select or click a note to perform actions.");
              return;
            }
            setActionNote(firstNote);
          }}
          isQuickAdding={createMutation.isPending}
        />
      ) : (
        <NotesListView
          notes={filteredNotes}
          summaryCounts={counts}
          onEditClick={(note) => {
            setEditNote(note);
            setEditOpen(true);
          }}
          onTakeActionClick={(note) => setActionNote(note)}
          onTogglePin={handleTogglePin}
          onDuplicate={handleDuplicate}
          onDelete={(id) => deleteMutation.mutate({ id })}
          onBulkMove={handleBulkMove}
          onBulkStatusChange={handleBulkStatusChange}
          companyName={companyName}
        />
      )}

      {/* ── Note Editor Dialog ───────────────────────────────────────────── */}
      <NoteEditorDialog
        note={editNote}
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditNote(null);
        }}
        onSave={handleSaveNote}
        onDelete={(id) => deleteMutation.mutate({ id })}
        onTakeAction={(note) => setActionNote(note)}
        categories={allCategories}
        isCeoOrAdmin={isCeoOrAdmin}
        companyName={companyName}
      />

      {/* ── Take Action Dialogs ─────────────────────────────────────────── */}
      <TakeActionMenu
        selectedNote={actionNote}
        onActionComplete={() => setActionNote(null)}
        canAssign={isCeoOrAdmin}
      />

      {/* ── Bulk Migration Modal ────────────────────────────────────────── */}
      <BulkClassifyModal
        open={classifyModalOpen}
        onClose={() => setClassifyModalOpen(false)}
        unclassifiedNotes={unclassifiedNotes as BrainItem[]}
        companyName={companyName}
        onMigrationSuccess={() => setClassifyModalOpen(false)}
      />
    </div>
  );
}
