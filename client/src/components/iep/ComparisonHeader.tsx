import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Columns3,
  Layers,
  ChevronDown,
  RefreshCw,
  Printer,
  Sparkles,
  GitCompare,
  Check,
  Calendar,
  User,
} from "lucide-react";
import { IEP_VERSION_OPTIONS, IepVersionOption } from "./types";

interface ComparisonHeaderProps {
  currentView: "board" | "detailed";
  onViewChange: (view: "board" | "detailed") => void;
  advocateMode: boolean;
  onAdvocateModeChange: (enabled: boolean) => void;
  newVersion: IepVersionOption;
  oldVersion: IepVersionOption;
  onSelectNewVersion: (version: IepVersionOption) => void;
  onSelectOldVersion: (version: IepVersionOption) => void;
  onResetUploads: () => void;
  onPrintBrief: () => void;
  onBackToTools: () => void;
  studentName?: string;
  studentGrade?: string;
}

export function ComparisonHeader({
  currentView,
  onViewChange,
  advocateMode,
  onAdvocateModeChange,
  newVersion,
  oldVersion,
  onSelectNewVersion,
  onSelectOldVersion,
  onResetUploads,
  onPrintBrief,
  onBackToTools,
  studentName = "Michael Sheep",
  studentGrade = "8th Grade",
}: ComparisonHeaderProps) {
  return (
    <div className="space-y-4 text-left border-b border-white/10 pb-6">
      {/* ── TOP NAV BAR: BADGE, STUDENT INFO, ACTIONS ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Student & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToTools}
            className="p-2 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white transition-colors shrink-0"
            title="Back to Tools"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {/* Student Avatar Icon */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-amber-500/20 border border-white/10 flex items-center justify-center shrink-0">
            <span className="font-serif font-black text-amber-300 text-sm">
              {studentName
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20">
                PG-010-IEP · IEP Comparator
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Case Comparison Engine
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-serif font-black text-white flex items-center gap-2 mt-0.5">
              <span>{studentName}</span>
              <span className="text-slate-600 font-normal">·</span>
              <span className="text-sm md:text-base font-sans font-medium text-slate-300">
                {studentGrade}
              </span>
            </h1>
          </div>
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Advocate Mode Toggle */}
          <label className="relative inline-flex items-center cursor-pointer select-none bg-slate-950/80 px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20 transition-colors">
            <input
              type="checkbox"
              checked={advocateMode}
              onChange={(e) => onAdvocateModeChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-7 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[8px] after:left-[14px] after:bg-slate-400 peer-checked:after:bg-amber-400 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500/20 peer-checked:border peer-checked:border-amber-500/40" />
            <span className="text-xs text-slate-300 ml-2.5 font-mono font-bold uppercase tracking-wider">
              Advocate Mode
            </span>
          </label>

          {/* Change Files */}
          <Button
            variant="outline"
            size="sm"
            onClick={onResetUploads}
            className="border-white/10 text-slate-300 hover:bg-white/5 text-xs h-9"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-slate-400" /> Upload Different Files
          </Button>

          {/* Print Summary Handout */}
          <Button
            size="sm"
            onClick={onPrintBrief}
            className="bg-indigo-650 hover:bg-indigo-600 text-white text-xs h-9 px-4 font-bold shadow-md shadow-indigo-650/20"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" /> Print Summary Brief
          </Button>
        </div>
      </div>

      {/* ── WORKSTATION CONTROL STRIP: VIEW SELECTOR + VERSION DROPDOWNS ── */}
      <div className="bg-[#07162B]/70 border border-white/10 rounded-2xl p-2.5 md:p-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* View Selector (Comparison Board | Detailed Changes) */}
        <div className="inline-flex bg-slate-950/90 p-1 rounded-xl border border-white/10 shadow-inner">
          <button
            onClick={() => onViewChange("board")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
              currentView === "board"
                ? "bg-indigo-650 text-white shadow-md shadow-indigo-650/30 border border-indigo-400/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Columns3 className="h-3.5 w-3.5" />
            <span>Comparison Board</span>
            {currentView === "board" && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => onViewChange("detailed")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
              currentView === "detailed"
                ? "bg-indigo-650 text-white shadow-md shadow-indigo-650/30 border border-indigo-400/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Detailed Changes</span>
            {currentView === "detailed" && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* ── Version Selector Strip: NEW IEP ⇄ OLD IEP ── */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* NEW IEP Version Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 bg-slate-950/90 border border-indigo-500/30 hover:border-indigo-500/60 px-3 py-1.5 rounded-xl text-slate-200 cursor-pointer transition-colors group">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                  NEW IEP:
                </span>
                <span className="font-bold text-white group-hover:text-indigo-200">
                  {newVersion.label}
                </span>
                <Badge className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20 text-[9px] px-1.5 py-0 h-4">
                  {newVersion.badgeText}
                </Badge>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-300" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="bg-[#07162B] border border-white/10 text-slate-200 font-mono text-xs w-60 z-50"
            >
              <DropdownMenuLabel className="text-[10px] uppercase text-slate-400 font-sans tracking-wider">
                Select Proposed / New IEP Version
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              {IEP_VERSION_OPTIONS.map((v) => (
                <DropdownMenuItem
                  key={v.id}
                  onClick={() => onSelectNewVersion(v)}
                  className="flex items-center justify-between cursor-pointer hover:bg-white/5"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white">{v.label}</div>
                    <div className="text-[10px] text-slate-400">{v.badgeText}</div>
                  </div>
                  {newVersion.id === v.id && <Check className="h-3.5 w-3.5 text-indigo-400" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Interactive Swap / Bi-directional Icon */}
          <span className="text-slate-500 px-1 font-sans text-sm font-black">⇄</span>

          {/* OLD IEP Version Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 bg-slate-950/90 border border-amber-500/30 hover:border-amber-500/60 px-3 py-1.5 rounded-xl text-slate-200 cursor-pointer transition-colors group">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  OLD IEP:
                </span>
                <span className="font-bold text-white group-hover:text-amber-200">
                  {oldVersion.label}
                </span>
                <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/20 text-[9px] px-1.5 py-0 h-4">
                  {oldVersion.badgeText}
                </Badge>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-300" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-[#07162B] border border-white/10 text-slate-200 font-mono text-xs w-60 z-50"
            >
              <DropdownMenuLabel className="text-[10px] uppercase text-slate-400 font-sans tracking-wider">
                Select Historical / Baseline Version
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              {IEP_VERSION_OPTIONS.map((v) => (
                <DropdownMenuItem
                  key={v.id}
                  onClick={() => onSelectOldVersion(v)}
                  className="flex items-center justify-between cursor-pointer hover:bg-white/5"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white">{v.label}</div>
                    <div className="text-[10px] text-slate-400">{v.badgeText}</div>
                  </div>
                  {oldVersion.id === v.id && <Check className="h-3.5 w-3.5 text-amber-400" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
