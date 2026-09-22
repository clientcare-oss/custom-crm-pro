import React, { useState } from "react";
import { User, Sparkles, Plus, Check, Pencil, Trash2, ArrowRight, Loader2, Link2, MessageSquare, PhoneCall, Compass, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ParentIntelConcern } from "../types";

interface Step2ParentIntelProps {
  studentContactId: number;
  studentName: string;
  concerns: ParentIntelConcern[];
  onUpdateConcerns: (concerns: ParentIntelConcern[]) => void;
  onRunParentIntel: () => Promise<void>;
  isLoading: boolean;
  onNextStep: () => void;
  onPrevStep: () => void;
}

export function Step2ParentIntel({
  studentContactId,
  studentName,
  concerns,
  onUpdateConcerns,
  onRunParentIntel,
  isLoading,
  onNextStep,
  onPrevStep,
}: Step2ParentIntelProps) {
  const [editingConcernId, setEditingConcernId] = useState<string | null>(null);
  const [editTopic, setEditTopic] = useState("");
  const [editConcern, setEditConcern] = useState("");
  const [editSource, setEditSource] = useState("");

  // Add Concern Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [newConcern, setNewConcern] = useState("");
  const [newSource, setNewSource] = useState("Parent Consultation");

  const handleStatusChange = (id: string, status: "keep" | "edit" | "dismiss") => {
    onUpdateConcerns(
      concerns.map((c) => (c.id === id ? { ...c, status } : c))
    );
  };

  const handleStartEdit = (c: ParentIntelConcern) => {
    setEditingConcernId(c.id);
    setEditTopic(c.topic);
    setEditConcern(c.concern);
    setEditSource(c.source || "");
  };

  const handleSaveEdit = (id: string) => {
    onUpdateConcerns(
      concerns.map((c) =>
        c.id === id
          ? {
              ...c,
              topic: editTopic,
              concern: editConcern,
              source: editSource,
            }
          : c
      )
    );
    setEditingConcernId(null);
  };

  const handleAddConcern = () => {
    if (!newConcern.trim()) return;
    const newItem: ParentIntelConcern = {
      id: `manual-pc-${Date.now()}`,
      topic: newTopic.trim() || "Family Concern",
      concern: newConcern.trim(),
      source: newSource.trim() || "Advocate Intake",
      status: "keep",
      isCustom: true,
    };
    onUpdateConcerns([...concerns, newItem]);
    setNewTopic("");
    setNewConcern("");
    setShowAddForm(false);
  };

  const activeConcerns = concerns.filter((c) => c.status !== "dismiss");

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0B3767] via-[#09254D] to-[#071C38] border border-[#144E8A] p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300">
              <User className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Step 2 — Parent Intel Gatherer
            </h2>
          </div>
          <p className="text-xs text-blue-200/70 max-w-2xl leading-relaxed">
            Extract authentic, family-communicated concerns across authorized case touchpoints (Discovery call, intake forms, call recordings, messages, and Case Compass).
          </p>
        </div>

        <Button
          onClick={onRunParentIntel}
          disabled={isLoading}
          className="inline-flex items-center gap-2 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg border border-emerald-400/30 px-5 py-2.5 cursor-pointer shrink-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Scanning Case History...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-[#F5B544]" />
              Run Parent Intel Scan
            </>
          )}
        </Button>
      </div>

      {/* Authorized Source Channels */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-xl bg-[#071B36] border border-[#0E3B6E] p-3 flex items-center gap-2.5">
          <MessageSquare className="h-4 w-4 text-blue-400 shrink-0" />
          <div className="text-[11.5px] leading-tight">
            <p className="font-bold text-white">Intake Forms</p>
            <p className="text-blue-300/60 text-[10px]">Client reported goals</p>
          </div>
        </div>

        <div className="rounded-xl bg-[#071B36] border border-[#0E3B6E] p-3 flex items-center gap-2.5">
          <PhoneCall className="h-4 w-4 text-emerald-400 shrink-0" />
          <div className="text-[11.5px] leading-tight">
            <p className="font-bold text-white">Discovery Call</p>
            <p className="text-blue-300/60 text-[10px]">Call transcripts & logs</p>
          </div>
        </div>

        <div className="rounded-xl bg-[#071B36] border border-[#0E3B6E] p-3 flex items-center gap-2.5">
          <Compass className="h-4 w-4 text-[#F5B544] shrink-0" />
          <div className="text-[11.5px] leading-tight">
            <p className="font-bold text-white">Case Compass</p>
            <p className="text-blue-300/60 text-[10px]">Status & ball tracking</p>
          </div>
        </div>

        <div className="rounded-xl bg-[#071B36] border border-[#0E3B6E] p-3 flex items-center gap-2.5">
          <FileCheck className="h-4 w-4 text-indigo-400 shrink-0" />
          <div className="text-[11.5px] leading-tight">
            <p className="font-bold text-white">Direct Notes</p>
            <p className="text-blue-300/60 text-[10px]">Advocate case records</p>
          </div>
        </div>
      </div>

      {/* Concerns List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Grounded Parent Concerns ({activeConcerns.length} Active)
            </h3>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-xs border-[#144A7E] bg-[#092244] text-blue-200 hover:text-white cursor-pointer inline-flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5 text-[#F5B544]" />
            Add Concern
          </Button>
        </div>

        {/* Add Concern Inline Form */}
        {showAddForm && (
          <div className="rounded-xl border border-emerald-500/40 bg-[#092C46] p-4 space-y-3 animate-in fade-in duration-150">
            <p className="text-xs font-bold text-white uppercase tracking-wider">
              Add Manual Parent Concern
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-emerald-300 font-semibold mb-1 block">Topic / Focus *</label>
                <Input
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="e.g. Math Anxiety, Sensory Meltdowns"
                  className="h-8 text-xs bg-[#061B2E] border-[#155250] text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-emerald-300 font-semibold mb-1 block">Source Attribution</label>
                <Input
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  placeholder="e.g. Parent Phone Call on May 12"
                  className="h-8 text-xs bg-[#061B2E] border-[#155250] text-white"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-emerald-300 font-semibold mb-1 block">Concern Description *</label>
              <Textarea
                value={newConcern}
                onChange={(e) => setNewConcern(e.target.value)}
                placeholder="What did the parent state as their primary worry or request?"
                rows={2}
                className="text-xs bg-[#061B2E] border-[#155250] text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)} className="text-xs text-blue-300">
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddConcern} className="text-xs bg-[#F5B544] hover:bg-amber-400 text-slate-950 font-bold">
                Save Concern
              </Button>
            </div>
          </div>
        )}

        {/* Concerns List */}
        {concerns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#123E6E] bg-[#071A33]/50 py-12 px-4 text-center space-y-2">
            <User className="h-8 w-8 text-emerald-400/40 mx-auto" />
            <p className="text-sm font-semibold text-white">No Parent Intel gathered yet</p>
            <p className="text-xs text-blue-300/60 max-w-sm mx-auto">
              Click "Run Parent Intel Scan" above to extract family-communicated concerns from the case record.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {concerns.map((item) => {
              const isEditing = editingConcernId === item.id;
              const isDismissed = item.status === "dismiss";

              return (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-xl border p-4 transition-all",
                    isDismissed
                      ? "bg-[#061528]/50 border-[#0D2E54] opacity-50"
                      : "bg-[#081F3D] border-[#124274] hover:border-emerald-500/40"
                  )}
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={editTopic}
                          onChange={(e) => setEditTopic(e.target.value)}
                          className="h-8 text-xs bg-[#061830] border-[#16487A] text-white"
                        />
                        <Input
                          value={editSource}
                          onChange={(e) => setEditSource(e.target.value)}
                          className="h-8 text-xs bg-[#061830] border-[#16487A] text-white"
                        />
                      </div>
                      <Textarea
                        value={editConcern}
                        onChange={(e) => setEditConcern(e.target.value)}
                        rows={2}
                        className="text-xs bg-[#061830] border-[#16487A] text-white"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingConcernId(null)} className="text-xs text-blue-300">
                          Cancel
                        </Button>
                        <Button size="sm" onClick={() => handleSaveEdit(item.id)} className="text-xs bg-[#F5B544] text-slate-950 font-bold">
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[10.5px] font-semibold">
                            {item.topic}
                          </Badge>
                          {item.source && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-300/80 bg-[#051426] px-2 py-0.5 rounded-md border border-[#0F355E]">
                              <Link2 className="h-3 w-3 text-blue-400" />
                              Source: {item.source}
                            </span>
                          )}
                          {item.isCustom && (
                            <span className="text-[10.5px] text-blue-300/60 italic">
                              (Advocate Added)
                            </span>
                          )}
                        </div>

                        <p className={cn("text-xs sm:text-[13px] leading-relaxed", isDismissed ? "line-through text-slate-400" : "text-white")}>
                          {item.concern}
                        </p>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.id, "keep")}
                          title="Approve concern"
                          className={cn(
                            "p-1.5 rounded-lg text-xs transition-colors cursor-pointer",
                            item.status === "keep"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
                              : "text-blue-300/60 hover:text-emerald-300 hover:bg-white/5"
                          )}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          title="Edit text"
                          className="p-1.5 rounded-lg text-xs text-blue-300/60 hover:text-white hover:bg-white/5 cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.id, isDismissed ? "keep" : "dismiss")}
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

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 border-t border-[#0F3C6D]">
        <Button
          variant="ghost"
          onClick={onPrevStep}
          className="text-xs text-blue-300 hover:text-white"
        >
          ← Back to 1. IEP Intel
        </Button>

        <Button
          onClick={onNextStep}
          className="inline-flex items-center gap-2 text-xs font-bold bg-[#0D4B84] hover:bg-[#145D9F] text-white border border-[#206BBC] px-5 py-2 cursor-pointer shadow-lg"
        >
          <span>Next: 3. Parent Concern Statement</span>
          <ArrowRight className="h-3.5 w-3.5 text-[#F5B544]" />
        </Button>
      </div>
    </div>
  );
}
