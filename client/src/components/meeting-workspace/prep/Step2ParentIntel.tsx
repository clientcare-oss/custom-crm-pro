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
      <div className="rounded-xl bg-[#05142B]/90 border border-[#3A2C18] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[#DFBE77]">
              <User className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-serif font-black text-[#FFF4D4] tracking-wide">
              Step 2 — Parent Intel Gatherer
            </h2>
          </div>
          <p className="text-xs text-[#C6B697] max-w-2xl leading-relaxed">
            Extract authentic, family-communicated concerns across authorized case touchpoints (Discovery call, intake forms, call recordings, messages, and Case Compass).
          </p>
        </div>

        <Button
          onClick={onRunParentIntel}
          disabled={isLoading}
          className="inline-flex items-center gap-2 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 hover:brightness-105 px-5 py-2.5 cursor-pointer shrink-0 transition-all"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-[#07162B]" />
              Scanning Case History...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-[#07162B]" />
              Run Parent Intel Scan
            </>
          )}
        </Button>
      </div>

      {/* Authorized Source Channels */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-xl bg-[#020A17]/90 border border-[#3A2C18] p-3 flex items-center gap-2.5 shadow-md">
          <MessageSquare className="h-4 w-4 text-[#DFBE77] shrink-0" />
          <div className="text-[11.5px] leading-tight">
            <p className="font-bold text-[#FFF4D4]">Intake Forms</p>
            <p className="text-[#A69371] text-[10px]">Client reported goals</p>
          </div>
        </div>

        <div className="rounded-xl bg-[#020A17]/90 border border-[#3A2C18] p-3 flex items-center gap-2.5 shadow-md">
          <PhoneCall className="h-4 w-4 text-emerald-400 shrink-0" />
          <div className="text-[11.5px] leading-tight">
            <p className="font-bold text-[#FFF4D4]">Discovery Call</p>
            <p className="text-[#A69371] text-[10px]">Call transcripts & logs</p>
          </div>
        </div>

        <div className="rounded-xl bg-[#020A17]/90 border border-[#3A2C18] p-3 flex items-center gap-2.5 shadow-md">
          <Compass className="h-4 w-4 text-[#DFBE77] shrink-0" />
          <div className="text-[11.5px] leading-tight">
            <p className="font-bold text-[#FFF4D4]">Case Compass</p>
            <p className="text-[#A69371] text-[10px]">Status & ball tracking</p>
          </div>
        </div>

        <div className="rounded-xl bg-[#020A17]/90 border border-[#3A2C18] p-3 flex items-center gap-2.5 shadow-md">
          <FileCheck className="h-4 w-4 text-amber-300 shrink-0" />
          <div className="text-[11.5px] leading-tight">
            <p className="font-bold text-[#FFF4D4]">Direct Notes</p>
            <p className="text-[#A69371] text-[10px]">Advocate case records</p>
          </div>
        </div>
      </div>

      {/* Concerns List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-[#DFBE77]" />
            <h3 className="text-sm font-serif font-bold text-[#FFF4D4]">
              Grounded Parent Concerns ({activeConcerns.length} Active)
            </h3>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-xs border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] hover:border-[#C5A059]/60 cursor-pointer inline-flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5 text-[#DFBE77]" />
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
                  className="h-8 text-xs bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] placeholder:text-[#A69371]/60"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-[#C6B697] font-semibold mb-1 block">Concern Description *</label>
              <Textarea
                value={newConcern}
                onChange={(e) => setNewConcern(e.target.value)}
                placeholder="What did the parent state as their primary worry or request?"
                rows={2}
                className="text-xs bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] placeholder:text-[#A69371]/60"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)} className="text-xs text-[#A69371] hover:text-[#FFF4D4]">
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddConcern} className="text-xs bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394]/50 shadow-sm cursor-pointer hover:brightness-105">
                Save Concern
              </Button>
            </div>
          </div>
        )}

        {/* Concerns List */}
        {concerns.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#3A2C18] bg-[#020A17]/60 py-12 px-4 text-center space-y-2">
            <User className="h-8 w-8 text-[#A69371]/40 mx-auto" />
            <p className="text-sm font-serif font-bold text-[#FFF4D4]">No Parent Intel gathered yet</p>
            <p className="text-xs text-[#A69371] max-w-sm mx-auto">
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
                    "rounded-xl border p-4 transition-all shadow-[0_4px_16px_rgba(0,0,0,0.6)]",
                    isDismissed
                      ? "bg-[#010812]/50 border-[#3A2C18]/40 opacity-50"
                      : "bg-[#020A17]/90 border-[#3A2C18] hover:border-[#C5A059]/60"
                  )}
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={editTopic}
                          onChange={(e) => setEditTopic(e.target.value)}
                          className="h-8 text-xs bg-[#010812] border-[#3A2C18] text-[#FFF4D4]"
                        />
                        <Input
                          value={editSource}
                          onChange={(e) => setEditSource(e.target.value)}
                          className="h-8 text-xs bg-[#010812] border-[#3A2C18] text-[#FFF4D4]"
                        />
                      </div>
                      <Textarea
                        value={editConcern}
                        onChange={(e) => setEditConcern(e.target.value)}
                        rows={2}
                        className="text-xs bg-[#010812] border-[#3A2C18] text-[#FFF4D4]"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingConcernId(null)} className="text-xs text-[#A69371] hover:text-[#FFF4D4]">
                          Cancel
                        </Button>
                        <Button size="sm" onClick={() => handleSaveEdit(item.id)} className="text-xs bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394]/50 shadow-sm">
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-[#05142B] border border-[#3A2C18] text-[#FFE394] text-[10.5px] font-semibold">
                            {item.topic}
                          </Badge>
                          {item.source && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#A69371] bg-[#010812] px-2 py-0.5 rounded-md border border-[#3A2C18]/60">
                              <Link2 className="h-3 w-3 text-[#DFBE77]" />
                              Source: {item.source}
                            </span>
                          )}
                          {item.isCustom && (
                            <span className="text-[10.5px] text-[#A69371] italic">
                              (Advocate Added)
                            </span>
                          )}
                        </div>

                        <p className={cn("text-xs sm:text-[13px] leading-relaxed", isDismissed ? "line-through text-slate-500" : "text-[#FFF4D4]")}>
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
                              : "text-[#A69371] hover:text-emerald-300 hover:bg-white/5"
                          )}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          title="Edit text"
                          className="p-1.5 rounded-lg text-xs text-[#A69371] hover:text-[#FFF4D4] hover:bg-white/5 cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.id, isDismissed ? "keep" : "dismiss")}
                          title={isDismissed ? "Restore" : "Dismiss"}
                          className="p-1.5 rounded-lg text-xs text-[#A69371] hover:text-rose-400 hover:bg-white/5 cursor-pointer"
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
      <div className="flex items-center justify-between pt-3 border-t border-[#3A2C18]/80">
        <Button
          variant="ghost"
          onClick={onPrevStep}
          className="text-xs text-[#A69371] hover:text-[#FFF4D4] hover:bg-[#071E3D] cursor-pointer"
        >
          ← Back to 1. IEP Intel
        </Button>

        <Button
          onClick={onNextStep}
          className="inline-flex items-center gap-2 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-105 px-5 py-2 cursor-pointer transition-all"
        >
          <span>Next: 3. Parent Concern Statement</span>
          <ArrowRight className="h-3.5 w-3.5 text-[#07162B]" />
        </Button>
      </div>
    </div>
  );
}
