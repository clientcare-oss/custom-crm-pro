import { useState, useEffect } from "react";
import {
  Scale,
  BookOpen,
  FileText,
  Search,
  Compass,
  Layers,
  Sparkles,
} from "lucide-react";
import StateLawLibrary from "./StateLawLibrary";
import FederalLawLibrary from "./FederalLawLibrary";
import FederalGuidanceArchive from "./FederalGuidanceArchive";
import UnifiedLegalSearch from "./UnifiedLegalSearch";
import PageIdBadge from "@/components/PageIdBadge";

export type EducationLawView = "state-atlas" | "federal-law" | "guidance-archive" | "unified-search";

export default function EducationLawHub() {
  const [activeView, setActiveView] = useState<EducationLawView>(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const v = url.searchParams.get("view");
      if (v === "federal-law" || v === "guidance-archive" || v === "unified-search" || v === "state-atlas") {
        return v;
      }
    }
    return "state-atlas";
  });

  const handleSelectView = (view: EducationLawView) => {
    setActiveView(view);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("view", view);
      window.history.replaceState(null, "", url.toString());
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* ── Education Law Unified Sub-Navigator Ribbon ── */}
      <div className="w-full p-2 bg-[#05142B]/95 border border-[#3A2C18] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C5A059]/60 to-transparent pointer-events-none" />

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* View 1: State Education Law Atlas */}
          <button
            type="button"
            onClick={() => handleSelectView("state-atlas")}
            className={`flex-1 min-w-[200px] h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeView === "state-atlas"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50"
                : "text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#07162B] border border-transparent"
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>🏛️ State Education Law Atlas</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                activeView === "state-atlas"
                  ? "bg-[#07162B]/20 text-[#07162B] font-bold"
                  : "bg-[#020A17] text-[#C5A059] border border-[#3A2C18]"
              }`}
            >
              50 States + DC
            </span>
          </button>

          {/* View 2: Federal Education Law Library */}
          <button
            type="button"
            onClick={() => handleSelectView("federal-law")}
            className={`flex-1 min-w-[200px] h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeView === "federal-law"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50"
                : "text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#07162B] border border-transparent"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>📜 Federal Law Library</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                activeView === "federal-law"
                  ? "bg-[#07162B]/20 text-[#07162B] font-bold"
                  : "bg-[#020A17] text-[#C5A059] border border-[#3A2C18]"
              }`}
            >
              IDEA, 504, ADA
            </span>
          </button>

          {/* View 3: Federal Guidance Archive */}
          <button
            type="button"
            onClick={() => handleSelectView("guidance-archive")}
            className={`flex-1 min-w-[200px] h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeView === "guidance-archive"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50"
                : "text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#07162B] border border-transparent"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>📑 Federal Guidance Archive</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                activeView === "guidance-archive"
                  ? "bg-[#07162B]/20 text-[#07162B] font-bold"
                  : "bg-[#020A17] text-[#C5A059] border border-[#3A2C18]"
              }`}
            >
              DCL & OSEP
            </span>
          </button>

          {/* View 4: Unified Legal Search */}
          <button
            type="button"
            onClick={() => handleSelectView("unified-search")}
            className={`flex-1 min-w-[180px] h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeView === "unified-search"
                ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50"
                : "text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#07162B] border border-transparent"
            }`}
          >
            <Search className="w-4 h-4" />
            <span>🔍 Unified Legal Search</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                activeView === "unified-search"
                  ? "bg-[#07162B]/20 text-[#07162B] font-bold"
                  : "bg-[#020A17] text-[#C5A059] border border-[#3A2C18]"
              }`}
            >
              State + Fed
            </span>
          </button>
        </div>
      </div>

      {/* ── Active Collection Rendering ── */}
      {activeView === "state-atlas" && <StateLawLibrary />}
      {activeView === "federal-law" && <FederalLawLibrary />}
      {activeView === "guidance-archive" && <FederalGuidanceArchive />}
      {activeView === "unified-search" && <UnifiedLegalSearch />}
    </div>
  );
}
