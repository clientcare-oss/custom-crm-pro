import React from "react";
import { Layers, CheckCircle2, Puzzle } from "lucide-react";
import type { CatalogServiceItem } from "./serviceTypes";

interface ServicesSummaryCardsProps {
  services: CatalogServiceItem[];
  activeFilter: "all" | "active" | "inactive" | "archived";
  onSelectFilter: (status: "all" | "active" | "inactive" | "archived") => void;
  addOnOnly: boolean;
  onToggleAddOn: () => void;
}

export const ServicesSummaryCards: React.FC<ServicesSummaryCardsProps> = ({
  services,
  activeFilter,
  onSelectFilter,
  addOnOnly,
  onToggleAddOn,
}) => {
  const totalCount = services.length;
  const activeCount = services.filter((s) => s.isActive && !s.isArchived).length;
  const addOnsCount = services.filter((s) => s.availableAsAddOn && !s.isArchived).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* 1. Total Services */}
      <button
        type="button"
        onClick={() => onSelectFilter("all")}
        className={`flex items-center gap-3 p-3 sm:p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
          activeFilter === "all" && !addOnOnly
            ? "bg-[#082552] border-sky-400/80 shadow-lg shadow-sky-950/50 ring-1 ring-sky-400/40"
            : "bg-[#001035] border-blue-900/60 hover:bg-[#001848] hover:border-sky-400/40 shadow-md"
        }`}
        aria-label="Filter by all services"
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#000821] border border-blue-500/30 text-sky-400 shrink-0">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-none">
            {totalCount}
          </div>
          <div className="text-xs font-medium text-blue-200/80 mt-0.5">Total Services</div>
        </div>
      </button>

      {/* 2. Active Services */}
      <button
        type="button"
        onClick={() => onSelectFilter("active")}
        className={`flex items-center gap-3 p-3 sm:p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
          activeFilter === "active" && !addOnOnly
            ? "bg-[#082552] border-emerald-400/80 shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-400/40"
            : "bg-[#001035] border-blue-900/60 hover:bg-[#001848] hover:border-emerald-500/40 shadow-md"
        }`}
        aria-label="Filter by active services"
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#000821] border border-emerald-500/30 text-emerald-400 shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-none">
            {activeCount}
          </div>
          <div className="text-xs font-medium text-blue-200/80 mt-0.5">Active</div>
        </div>
      </button>

      {/* 3. Available as Add-Ons */}
      <button
        type="button"
        onClick={onToggleAddOn}
        className={`flex items-center gap-3 p-3 sm:p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
          addOnOnly
            ? "bg-[#082552] border-purple-400/80 shadow-lg shadow-purple-950/50 ring-1 ring-purple-400/40"
            : "bg-[#001035] border-blue-900/60 hover:bg-[#001848] hover:border-purple-500/40 shadow-md"
        }`}
        aria-label="Toggle add-ons filter"
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#000821] border border-purple-500/30 text-purple-400 shrink-0">
          <Puzzle className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-none">
            {addOnsCount}
          </div>
          <div className="text-xs font-medium text-blue-200/80 mt-0.5">Available as Add-Ons</div>
        </div>
      </button>
    </div>
  );
};
