import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { BrainItem, getCategoryStyle, PRIORITY_CONFIG } from "./types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Filter,
  User,
  Building,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderSync,
} from "lucide-react";

interface BulkClassifyModalProps {
  open: boolean;
  onClose: () => void;
  unclassifiedNotes: BrainItem[];
  companyName?: string;
  onMigrationSuccess: () => void;
}

export default function BulkClassifyModal({
  open,
  onClose,
  unclassifiedNotes,
  companyName = "Waypoint Advocates",
  onMigrationSuccess,
}: BulkClassifyModalProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const utils = trpc.useUtils();

  const bulkMutation = trpc.brainDump.bulkClassify.useMutation({
    onSuccess: (data, vars) => {
      const destination = vars.targetScope === "employee" ? "👤 Byron's My Notes" : `🏢 ${companyName} Company Notes`;
      toast.success(`Successfully classified ${data.count} notes into ${destination}! 📁`);
      setSelectedIds([]);
      utils.brainDump.list.invalidate();
      utils.brainDump.summary.invalidate();
      onMigrationSuccess();
    },
    onError: (e) => toast.error(`Migration error: ${e.message}`),
  });

  const categories = useMemo(() => {
    return Array.from(new Set(unclassifiedNotes.map((n) => n.category)));
  }, [unclassifiedNotes]);

  const filteredNotes = useMemo(() => {
    return unclassifiedNotes.filter((n) => {
      const matchCat = selectedCategory === "All" || n.category === selectedCategory;
      const matchSearch =
        !search.trim() ||
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        (n.body ?? "").toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [unclassifiedNotes, selectedCategory, search]);

  const allFilteredSelected =
    filteredNotes.length > 0 && filteredNotes.every((n) => selectedIds.includes(n.id));

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredSet = new Set(filteredNotes.map((n) => n.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      const combined = new Set([...selectedIds, ...filteredNotes.map((n) => n.id)]);
      setSelectedIds(Array.from(combined));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleBulkMove = (targetScope: "employee" | "company") => {
    if (selectedIds.length === 0) {
      toast.error("Please select at least one note to classify.");
      return;
    }
    bulkMutation.mutate({
      ids: selectedIds,
      targetScope,
      employeeId: targetScope === "employee" ? "emp-byron-honea" : undefined,
      organizationId: targetScope === "company" ? "waypoint" : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-[#0b1322] border-blue-900/60 text-slate-100 p-0 overflow-hidden shadow-2xl">
        {/* Top Header */}
        <DialogHeader className="p-5 pb-3 border-b border-blue-900/40 bg-[#0f172a]/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <FolderSync className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  Existing Notes Review & Classification
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono font-bold">
                    {unclassifiedNotes.length} Pending
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">
                  Classify existing BrainDump records between Byron's personal workday notes and {companyName} organizational business ideas.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Filter & Action Toolbar */}
        <div className="p-4 border-b border-blue-900/30 bg-[#0c1424] flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Filter by keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs h-8 bg-slate-900/90 border-slate-700/80 text-white placeholder:text-slate-500 rounded-lg"
              />
            </div>

            {/* Category Select */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs h-8 px-2.5 rounded-lg bg-slate-900/90 border border-slate-700/80 text-slate-200 outline-none cursor-pointer"
            >
              <option value="All">All Categories ({unclassifiedNotes.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Bulk Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              disabled={selectedIds.length === 0 || bulkMutation.isPending}
              onClick={() => handleBulkMove("employee")}
              className="text-xs h-8 bg-sky-600 hover:bg-sky-500 text-white font-bold gap-1.5 shadow-sm cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              Move ({selectedIds.length}) → 👤 My Notes
            </Button>
            <Button
              size="sm"
              disabled={selectedIds.length === 0 || bulkMutation.isPending}
              onClick={() => handleBulkMove("company")}
              className="text-xs h-8 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold gap-1.5 shadow-sm cursor-pointer"
            >
              <Building className="w-3.5 h-3.5" />
              Move ({selectedIds.length}) → 🏢 Company Notes
            </Button>
          </div>
        </div>

        {/* Notes Table / List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[50vh]">
          {/* Select all header */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/70 border border-slate-800 text-xs text-slate-300">
            <label className="flex items-center gap-2 cursor-pointer font-semibold">
              <Checkbox
                checked={allFilteredSelected}
                onCheckedChange={toggleSelectAllFiltered}
                className="border-slate-600"
              />
              Select All Filtered ({filteredNotes.length} notes)
            </label>
            <span className="text-[11px] text-slate-400 font-mono">
              {selectedIds.length} of {unclassifiedNotes.length} selected
            </span>
          </div>

          {filteredNotes.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No matching unclassified notes found.
            </div>
          ) : (
            filteredNotes.map((note) => {
              const isSelected = selectedIds.includes(note.id);
              const catStyle = getCategoryStyle(note.category);
              return (
                <div
                  key={note.id}
                  onClick={() => toggleSelectOne(note.id)}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                    isSelected
                      ? "bg-blue-950/40 border-amber-400/60 shadow-sm"
                      : "bg-[#0f172a]/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelectOne(note.id)}
                    className="mt-0.5 border-slate-600"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white leading-snug">
                        {note.title}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                      >
                        {note.category}
                      </span>
                      {note.status === "done" && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                          Done
                        </span>
                      )}
                    </div>
                    {note.body && (
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {note.body}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-blue-900/30 bg-[#0f172a]/80 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Zero data loss. Unclassified records remain safe until categorized.</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs text-slate-300 hover:text-white"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
