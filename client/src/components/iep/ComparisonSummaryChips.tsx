import React from "react";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, Trash2, Edit3, Type, Check, ShieldAlert } from "lucide-react";
import { ComparisonItem, ItemStatus } from "./types";

interface ComparisonSummaryChipsProps {
  items: ComparisonItem[];
  activeFilter: string;
  onSelectFilter: (filter: string) => void;
}

export function ComparisonSummaryChips({
  items,
  activeFilter,
  onSelectFilter,
}: ComparisonSummaryChipsProps) {
  // Counts
  const totalChanges = items.filter((i) => i.status !== "unchanged").length;
  const additions = items.filter((i) => i.status === "added").length;
  const removals = items.filter((i) => i.status === "removed").length;
  const modified = items.filter((i) => i.status === "modified").length;
  const reworded = items.filter((i) => i.status === "reworded").length;
  const unchanged = items.filter((i) => i.status === "unchanged").length;
  const highAttention = items.filter(
    (i) => i.severity === "high_attention" && i.status !== "unchanged"
  ).length;

  const chips = [
    {
      id: "all",
      label: `${totalChanges} Total Changes`,
      icon: Sparkles,
      color: "text-indigo-400",
      activeBg: "bg-indigo-500/20 text-indigo-200 border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.25)]",
      defaultBg: "bg-slate-900/90 text-slate-300 border-white/10 hover:border-indigo-500/30 hover:text-white",
    },
    {
      id: "added",
      label: `${additions} ${additions === 1 ? "Addition" : "Additions"}`,
      icon: Plus,
      color: "text-emerald-400",
      activeBg: "bg-emerald-500/20 text-emerald-200 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.25)]",
      defaultBg: "bg-slate-900/90 text-slate-300 border-white/10 hover:border-emerald-500/30 hover:text-white",
    },
    {
      id: "removed",
      label: `${removals} ${removals === 1 ? "Removal" : "Removals"}`,
      icon: Trash2,
      color: "text-rose-400",
      activeBg: "bg-rose-500/20 text-rose-200 border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.25)]",
      defaultBg: "bg-slate-900/90 text-slate-300 border-white/10 hover:border-rose-500/30 hover:text-white",
    },
    {
      id: "modified",
      label: `${modified} Modified`,
      icon: Edit3,
      color: "text-amber-400",
      activeBg: "bg-amber-500/20 text-amber-200 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.25)]",
      defaultBg: "bg-slate-900/90 text-slate-300 border-white/10 hover:border-amber-500/30 hover:text-white",
    },
    {
      id: "reworded",
      label: `${reworded} Reworded`,
      icon: Type,
      color: "text-blue-400",
      activeBg: "bg-blue-500/20 text-blue-200 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.25)]",
      defaultBg: "bg-slate-900/90 text-slate-300 border-white/10 hover:border-blue-500/30 hover:text-white",
    },
    {
      id: "unchanged",
      label: `${unchanged} Unchanged`,
      icon: Check,
      color: "text-slate-400",
      activeBg: "bg-slate-800 text-slate-100 border-slate-500 shadow-sm",
      defaultBg: "bg-slate-900/90 text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-200",
    },
    {
      id: "high_attention",
      label: `${highAttention} High Attention`,
      icon: ShieldAlert,
      color: "text-rose-400",
      activeBg: "bg-rose-500/25 text-rose-100 border-rose-500/70 shadow-[0_0_12px_rgba(244,63,94,0.35)]",
      defaultBg: "bg-rose-950/20 text-rose-300 border-rose-500/20 hover:border-rose-500/40 hover:text-rose-100",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 py-1 select-none">
      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
        Filter Deltas:
      </span>

      {chips.map((chip) => {
        const Icon = chip.icon;
        const isActive = activeFilter === chip.id;

        return (
          <button
            key={chip.id}
            onClick={() => onSelectFilter(isActive && chip.id !== "all" ? "all" : chip.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150 cursor-pointer ${
              isActive ? chip.activeBg : chip.defaultBg
            }`}
          >
            <Icon className={`h-3 w-3 ${chip.color}`} />
            <span>{chip.label}</span>
          </button>
        );
      })}

      {activeFilter !== "all" && (
        <button
          onClick={() => onSelectFilter("all")}
          className="text-[11px] text-slate-400 hover:text-white underline ml-1 cursor-pointer transition-colors"
        >
          Reset Filter
        </button>
      )}
    </div>
  );
}
