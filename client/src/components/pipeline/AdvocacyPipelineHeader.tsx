import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Settings2,
  Plus,
  Workflow,
  Search,
  LayoutGrid,
  List,
  X,
} from "lucide-react";
import PageIdBadge from "@/components/PageIdBadge";
import { ADVOCATE_ROSTER } from "./pipelineDefaults";

interface AdvocacyPipelineHeaderProps {
  onCustomizePipeline: () => void;
  onAddStage: () => void;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedAdvocate?: string;
  onSelectAdvocate: (advocate?: string) => void;
  viewMode: "board" | "list";
  onViewModeChange: (mode: "board" | "list") => void;
}

export function AdvocacyPipelineHeader({
  onCustomizePipeline,
  onAddStage,
  searchQuery,
  onSearchChange,
  selectedAdvocate,
  onSelectAdvocate,
  viewMode,
  onViewModeChange,
}: AdvocacyPipelineHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#3A2C18]">
      {/* Left: Title + Page ID Badge */}
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center text-[#FFE394] shadow-md shadow-black/40 shrink-0">
          <Workflow className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#FFF4D4] tracking-wide">
              Advocacy Pipeline
            </h1>
            <PageIdBadge id="PG-039" />
          </div>
          <p className="text-xs sm:text-sm text-[#C6B697] mt-0.5">
            Unified family & student workflow from Discovery Call through Active Advocacy, Monitoring, and Renewal.
          </p>
        </div>
      </div>

      {/* Right: Search + Quick Advocate Avatars + View Mode Toggle + Customize/Add Stage */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Live Search Input */}
        <div className="relative w-full sm:w-56">
          <Search className="h-3.5 w-3.5 text-[#A69371] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search student, family, school..."
            className="w-full h-9 pl-8 pr-7 rounded-xl bg-[#020A17] border border-[#3A2C18] focus:border-[#C5A059] text-xs text-[#FFF4D4] placeholder:text-[#A69371] focus:outline-hidden transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A69371] hover:text-[#FFF4D4] cursor-pointer"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* HoneyBook-Style Quick Advocate Avatar Filter */}
        <div className="flex items-center -space-x-1 bg-[#020A17] border border-[#3A2C18] rounded-xl p-1">
          <button
            type="button"
            onClick={() => onSelectAdvocate(undefined)}
            className={cn(
              "h-7 px-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer",
              !selectedAdvocate
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] shadow-xs"
                : "text-[#C6B697] hover:text-[#FFF4D4]"
            )}
            title="Show All Advocates"
          >
            All
          </button>
          {ADVOCATE_ROSTER.slice(0, 5).map((adv) => {
            const isSelected =
              selectedAdvocate?.toLowerCase() === adv.name.toLowerCase();
            return (
              <button
                key={adv.name}
                type="button"
                onClick={() =>
                  onSelectAdvocate(isSelected ? undefined : adv.name)
                }
                title={`Filter by ${adv.name}`}
                className={cn(
                  "w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center border transition-all cursor-pointer",
                  isSelected
                    ? "bg-gradient-to-br from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border-[#FFE394] ring-2 ring-[#C5A059]/60 z-10 scale-105"
                    : "bg-[#05142B] text-[#C6B697] border-[#3A2C18] hover:border-[#C5A059] hover:text-[#FFF4D4]"
                )}
              >
                {adv.initials}
              </button>
            );
          })}
        </div>

        {/* Board vs. List View Switcher */}
        <div className="flex items-center bg-[#020A17] border border-[#3A2C18] rounded-xl p-0.5">
          <button
            type="button"
            onClick={() => onViewModeChange("board")}
            className={cn(
              "h-8 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer",
              viewMode === "board"
                ? "bg-[#05142B] text-[#FFE394] border border-[#C5A059]/60 shadow-xs"
                : "text-[#A69371] hover:text-[#FFF4D4]"
            )}
            title="Responsive Board View"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Board</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("list")}
            className={cn(
              "h-8 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer",
              viewMode === "list"
                ? "bg-[#05142B] text-[#FFE394] border border-[#C5A059]/60 shadow-xs"
                : "text-[#A69371] hover:text-[#FFF4D4]"
            )}
            title="Compact List View"
          >
            <List className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onCustomizePipeline}
          className="h-9 px-3.5 text-xs font-semibold border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] cursor-pointer rounded-xl inline-flex items-center gap-1.5 shadow-sm transition-all"
        >
          <Settings2 className="h-3.5 w-3.5 text-[#FFE394]" />
          <span>Customize</span>
        </Button>

        <Button
          size="sm"
          onClick={onAddStage}
          className="h-9 px-3.5 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-105 cursor-pointer rounded-xl inline-flex items-center gap-1.5 transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Stage</span>
        </Button>
      </div>
    </div>
  );
}
