import React, { useState } from "react";
import { Sparkles, FileText, Check, AlertCircle, Pencil, Trash2, Plus, ArrowRight, Loader2, Flag, FileCheck, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { IepIntelFinding, FindingStatus } from "../types";

interface Step1IepIntelProps {
  studentContactId: number;
  studentName: string;
  findings: IepIntelFinding[];
  detectedOrder: string[];
  onUpdateFindings: (findings: IepIntelFinding[]) => void;
  onUpdateDetectedOrder: (order: string[]) => void;
  onRunIepIntel: () => Promise<void>;
  isLoading: boolean;
  onNextStep: () => void;
}

export function Step1IepIntel({
  studentContactId,
  studentName,
  findings,
  detectedOrder,
  onUpdateFindings,
  onUpdateDetectedOrder,
  onRunIepIntel,
  isLoading,
  onNextStep,
}: Step1IepIntelProps) {
  const [editingFindingId, setEditingFindingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editQuote, setEditQuote] = useState("");
  const [editCategory, setEditCategory] = useState("Accommodations");

  // New Finding Dialog / Inline Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState("Accommodations");
  const [newSection, setNewSection] = useState("Accommodations / Supports");
  const [newText, setNewText] = useState("");
  const [newQuote, setNewQuote] = useState("");

  const handleStatusChange = (id: string, status: FindingStatus) => {
    onUpdateFindings(
      findings.map((f) => (f.id === id ? { ...f, status } : f))
    );
  };

  const handleStartEdit = (f: IepIntelFinding) => {
    setEditingFindingId(f.id);
    setEditText(f.text);
    setEditQuote(f.quote || "");
    setEditCategory(f.category);
  };

  const handleSaveEdit = (id: string) => {
    onUpdateFindings(
      findings.map((f) =>
        f.id === id
          ? {
              ...f,
              text: editText,
              quote: editQuote,
              category: editCategory,
            }
          : f
      )
    );
    setEditingFindingId(null);
  };

  const handleAddFinding = () => {
    if (!newText.trim()) return;
    const newFinding: IepIntelFinding = {
      id: `manual-${Date.now()}`,
      category: newCategory,
      section: newSection,
      text: newText.trim(),
      quote: newQuote.trim() || undefined,
      status: "keep",
      isCustom: true,
    };
    onUpdateFindings([...findings, newFinding]);
    setNewText("");
    setNewQuote("");
    setShowAddForm(false);
  };

  const activeFindings = findings.filter((f) => f.status !== "dismiss");
  const dismissedFindings = findings.filter((f) => f.status === "dismiss");

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0B3767] via-[#09254D] to-[#071C38] border border-[#144E8A] p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300">
              <Sparkles className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Step 1 — IEP Intel Unit
            </h2>
          </div>
          <p className="text-xs text-blue-200/70 max-w-2xl leading-relaxed">
            Analyze {studentName}'s current IEP to detect actual section structure, unearth service grid gaps, missing accommodations, baseline omissions, and potential advocacy targets.
          </p>
        </div>

        <Button
          onClick={onRunIepIntel}
          disabled={isLoading}
          className="inline-flex items-center gap-2 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg border border-blue-400/30 px-5 py-2.5 cursor-pointer shrink-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Scanning IEP Document...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-[#F5B544]" />
              Run IEP Intel Scan
            </>
          )}
        </Button>
      </div>

      {/* Detected IEP Document Structure */}
      {detectedOrder.length > 0 && (
        <div className="rounded-2xl bg-[#071A33] border border-[#0F3D70] p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#F5B544]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-200">
                Detected IEP Document Order ({detectedOrder.length} Sections)
              </h3>
            </div>
            <span className="text-[11px] text-blue-300/60">
              Preserving district-specific layout
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {detectedOrder.map((section, idx) => (
              <span
                key={section}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0C2D54] border border-[#1C5996]/60 text-[11.5px] font-medium text-blue-100"
              >
                <span className="text-blue-400/70 font-mono text-[10px]">{idx + 1}.</span>
                <span>{section}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Findings List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">
              IEP Intel Findings ({activeFindings.length} Active)
            </h3>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-xs border-[#144A7E] bg-[#092244] text-blue-200 hover:text-white cursor-pointer inline-flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5 text-[#F5B544]" />
            Add Finding
          </Button>
        </div>

        {/* Add Finding Inline Form */}
        {showAddForm && (
          <div className="rounded-xl border border-blue-500/40 bg-[#09244A] p-4 space-y-3 animate-in fade-in duration-150">
            <p className="text-xs font-bold text-white uppercase tracking-wider">
              Add Manual IEP Finding
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-blue-300 font-semibold mb-1 block">Category</label>
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g. Accommodations, Present Levels, AAC"
                  className="h-8 text-xs bg-[#061830] border-[#16487A] text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-blue-300 font-semibold mb-1 block">Section</label>
                <Input
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value)}
                  placeholder="e.g. Accommodations / Supports"
                  className="h-8 text-xs bg-[#061830] border-[#16487A] text-white"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-blue-300 font-semibold mb-1 block">Finding Description *</label>
              <Textarea
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Describe the omission, inconsistency, or needed change..."
                rows={2}
                className="text-xs bg-[#061830] border-[#16487A] text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-blue-300 font-semibold mb-1 block">Document Quote / Reference (Optional)</label>
              <Input
                value={newQuote}
                onChange={(e) => setNewQuote(e.target.value)}
                placeholder="e.g. Page 12: 'Accommodations during state testing only.'"
                className="h-8 text-xs bg-[#061830] border-[#16487A] text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)} className="text-xs text-blue-300">
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddFinding} className="text-xs bg-[#F5B544] hover:bg-amber-400 text-slate-950 font-bold">
                Save Finding
              </Button>
            </div>
          </div>
        )}

        {/* Findings List Rows */}
        {findings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#123E6E] bg-[#071A33]/50 py-12 px-4 text-center space-y-2">
            <FileText className="h-8 w-8 text-blue-400/40 mx-auto" />
            <p className="text-sm font-semibold text-white">No IEP Intel findings yet</p>
            <p className="text-xs text-blue-300/60 max-w-sm mx-auto">
              Click "Run IEP Intel Scan" above or add a manual finding to begin extracting intelligence from {studentName}'s IEP records.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {findings.map((finding) => {
              const isEditing = editingFindingId === finding.id;
              const isDismissed = finding.status === "dismiss";

              return (
                <div
                  key={finding.id}
                  className={cn(
                    "rounded-xl border p-4 transition-all",
                    isDismissed
                      ? "bg-[#061528]/50 border-[#0D2E54] opacity-50"
                      : finding.status === "important"
                      ? "bg-gradient-to-r from-[#0C2A52] to-[#0A2242] border-[#F5B544]/60 shadow-[0_2px_12px_rgba(245,181,68,0.12)]"
                      : "bg-[#081F3D] border-[#124274] hover:border-[#1E5A9A]"
                  )}
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="h-8 text-xs bg-[#061830] border-[#16487A] text-white"
                        />
                      </div>
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={2}
                        className="text-xs bg-[#061830] border-[#16487A] text-white"
                      />
                      <Input
                        value={editQuote}
                        onChange={(e) => setEditQuote(e.target.value)}
                        placeholder="Quote from IEP..."
                        className="h-8 text-xs bg-[#061830] border-[#16487A] text-white"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingFindingId(null)} className="text-xs text-blue-300">
                          Cancel
                        </Button>
                        <Button size="sm" onClick={() => handleSaveEdit(finding.id)} className="text-xs bg-[#F5B544] text-slate-950 font-bold">
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-[#0F3D70] border border-[#2066B2] text-blue-200 text-[10.5px] font-semibold">
                            {finding.category}
                          </Badge>
                          <span className="text-xs font-semibold text-blue-300/80">
                            {finding.section}
                          </span>
                          {finding.status === "important" && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#F5B544] bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/40">
                              <Flag className="h-3 w-3" /> Priority Target
                            </span>
                          )}
                          {finding.isCustom && (
                            <span className="text-[10.5px] text-blue-300/60 italic">
                              (Advocate Added)
                            </span>
                          )}
                        </div>

                        <p className={cn("text-xs sm:text-[13px] leading-relaxed", isDismissed ? "line-through text-slate-400" : "text-white")}>
                          {finding.text}
                        </p>

                        {finding.quote && (
                          <p className="text-[11.5px] font-mono text-blue-300/80 bg-[#051426]/70 px-2.5 py-1 rounded-lg border border-[#0D2F54] inline-block">
                            "{finding.quote}"
                          </p>
                        )}
                      </div>

                      {/* Controls: Keep | Important | Edit | Dismiss */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(finding.id, finding.status === "keep" ? "edit" : "keep")}
                          title="Keep this finding"
                          className={cn(
                            "p-1.5 rounded-lg text-xs transition-colors cursor-pointer",
                            finding.status === "keep"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
                              : "text-blue-300/60 hover:text-emerald-300 hover:bg-white/5"
                          )}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(finding.id, finding.status === "important" ? "keep" : "important")}
                          title="Flag as Important"
                          className={cn(
                            "p-1.5 rounded-lg text-xs transition-colors cursor-pointer",
                            finding.status === "important"
                              ? "bg-amber-500/20 text-[#F5B544] border border-amber-500/40 font-bold"
                              : "text-blue-300/60 hover:text-[#F5B544] hover:bg-white/5"
                          )}
                        >
                          <Flag className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartEdit(finding)}
                          title="Edit text"
                          className="p-1.5 rounded-lg text-xs text-blue-300/60 hover:text-white hover:bg-white/5 cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(finding.id, isDismissed ? "keep" : "dismiss")}
                          title={isDismissed ? "Restore" : "Dismiss"}
                          className="p-1.5 rounded-lg text-xs text-blue-300/60 hover:text-rose-400 hover:bg-white/5 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Next Step Action */}
      <div className="flex justify-end pt-2 border-t border-[#0F3C6D]">
        <Button
          onClick={onNextStep}
          className="inline-flex items-center gap-2 text-xs font-bold bg-[#0D4B84] hover:bg-[#145D9F] text-white border border-[#206BBC] px-5 py-2 cursor-pointer shadow-lg"
        >
          <span>Next: 2. Parent Intel</span>
          <ArrowRight className="h-3.5 w-3.5 text-[#F5B544]" />
        </Button>
      </div>
    </div>
  );
}
