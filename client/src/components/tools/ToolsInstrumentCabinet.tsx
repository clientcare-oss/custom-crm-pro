import React, { useState, useMemo } from "react";
import {
  Search,
  ArrowRight,
  CheckCircle2,
  MoreHorizontal,
  User,
  ChevronDown,
  Mic,
  X,
  Play,
  GitCompare,
  Plus,
  Wrench,
} from "lucide-react";
import PageIdBadge from "@/components/PageIdBadge";
import {
  buildAllInstruments,
  type InstrumentDefinition,
} from "./toolsCatalogData";
import { RequestToolModal } from "./RequestToolModal";
import { VintageSpeakerGrilleBay } from "./VintageSpeakerGrilleBay";

export type { InstrumentDefinition };

interface ToolsInstrumentCabinetProps {
  contactId?: number;
  setLocation: (path: string) => void;
  onOpenIepComparisonModal: () => void;
  onOpenRecorderModal: () => void;
}

/**
 * 3D Cast-Brass Drawer Pull Handle rendered at the bottom center of each drawer
 */
function BrassDrawerPull({ active }: { active: boolean }) {
  return (
    <div className="relative flex items-center justify-center mt-2.5 select-none pointer-events-none">
      {/* Cast shadow underneath handle */}
      <div className="absolute -bottom-1.5 w-16 h-2.5 rounded-full bg-black/80 blur-[3px]" />
      {/* Outer brass mounting plate */}
      <div
        className={`relative w-[68px] h-[16px] rounded-[4px] flex items-center justify-between px-1.5 transition-all ${
          active
            ? "bg-gradient-to-b from-[#FCE6A6] via-[#C99E4A] to-[#6E4F19] border border-[#FFF3C8]/80 shadow-[0_4px_10px_rgba(0,0,0,0.85),0_0_12px_rgba(235,193,107,0.35)]"
            : "bg-gradient-to-b from-[#D5B472] via-[#9E7836] to-[#523A12] border border-[#E6C98A]/50 shadow-[0_4px_8px_rgba(0,0,0,0.85)]"
        }`}
      >
        {/* Left brass post */}
        <div className="w-1.5 h-2.5 rounded-[1px] bg-gradient-to-b from-[#FFF0BE] to-[#6B4C1B] shadow-sm" />
        {/* Recessed dark cavity under the bail bar */}
        <div className="flex-1 mx-0.5 h-[8px] rounded-[2px] bg-[#0B0F1A]/90 shadow-[inset_0_2px_4px_rgba(0,0,0,0.95)] flex items-center justify-center">
          {/* Horizontal specular highlight bar */}
          <div className="w-full h-[3px] rounded-full bg-gradient-to-r from-[#8F6B29] via-[#F9E29F] to-[#8F6B29]" />
        </div>
        {/* Right brass post */}
        <div className="w-1.5 h-2.5 rounded-[1px] bg-gradient-to-b from-[#FFF0BE] to-[#6B4C1B] shadow-sm" />
      </div>
    </div>
  );
}

export function ToolsInstrumentCabinet({
  contactId,
  setLocation,
  onOpenIepComparisonModal,
  onOpenRecorderModal,
}: ToolsInstrumentCabinetProps) {
  const [selectedId, setSelectedId] = useState<string>("first-mate");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [accessMenuOpen, setAccessMenuOpen] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | "meeting" | "document" | "concern"
  >("all");
  const [howItWorksOpen, setHowItWorksOpen] = useState<boolean>(false);
  const [requestModalOpen, setRequestModalOpen] = useState<boolean>(false);
  const drawerRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  const allInstruments = useMemo(
    () =>
      buildAllInstruments({
        contactId,
        setLocation,
        onOpenIepComparisonModal,
        onOpenRecorderModal,
      }),
    [contactId, setLocation, onOpenIepComparisonModal, onOpenRecorderModal]
  );

  const visibleInstruments = useMemo(() => {
    let list = allInstruments;
    if (categoryFilter !== "all") {
      list = list.filter((i) => i.taskCategory === categoryFilter);
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    const matched = list.filter(
      (item) =>
        item.drawerTitle.toLowerCase().includes(q) ||
        item.drawerSubtitle.toLowerCase().includes(q) ||
        item.categoryOverline.toLowerCase().includes(q) ||
        item.stageSubtitle.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.capabilities.some((c) => c.toLowerCase().includes(q))
    );
    return matched.length > 0 ? matched : list;
  }, [allInstruments, categoryFilter, searchQuery]);

  const activeInstrument = useMemo(() => {
    return (
      visibleInstruments.find((i) => i.id === selectedId) ||
      visibleInstruments[0] ||
      allInstruments[0]
    );
  }, [visibleInstruments, selectedId, allInstruments]);

  const handleTaskShortcut = (category: "meeting" | "document" | "concern") => {
    setCategoryFilter((prev) => (prev === category ? "all" : category));
    const firstInCategory = allInstruments.find(
      (i) => i.taskCategory === category
    );
    if (firstInCategory) {
      setSelectedId(firstInCategory.id);
      const el = drawerRefs.current[firstInCategory.id];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  };

  return (
    <div
      className="min-h-[calc(100vh-2rem)] w-full text-[#FBF6EC] px-4 sm:px-8 lg:px-10 py-6 md:py-8 select-none"
      style={{
        background:
          "radial-gradient(ellipse at 55% 18%, #131F3E 0%, #091122 55%, #050914 100%)",
      }}
    >
      <div className="max-w-[1360px] mx-auto space-y-6">
        {/* ================================================================= */}
        {/* TOP HEADER ROW                                                    */}
        {/* ================================================================= */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-1">
          <div>
            <div className="flex items-center gap-3">
              <h1
                className="text-4xl md:text-[46px] font-bold text-[#FBF6EC] tracking-tight leading-none"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Tools
              </h1>
              <PageIdBadge id="PG-010" />
            </div>
            <p
              className="text-[15.5px] md:text-[17px] text-[#C8C2B4] mt-2 tracking-wide"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Choose the right instrument for your next step.
            </p>
          </div>

          {/* Search, Request Tool & My Access Controls */}
          <div className="flex flex-wrap items-center gap-3 md:gap-4 self-start md:self-center">
            <div className="relative w-56 sm:w-68">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8E98B0]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools..."
                className="w-full h-10 pl-10 pr-8 rounded-lg bg-[#091224]/90 border border-[#283552] text-[14px] text-[#EAE4D7] placeholder:text-[#848FA8] focus:outline-none focus:border-[#7B86FF] shadow-[inset_0_2px_6px_rgba(0,0,0,0.75)] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#848FA8] hover:text-white cursor-pointer"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Request a Tool Button */}
            <button
              type="button"
              onClick={() => setRequestModalOpen(true)}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-gradient-to-b from-[#E5C887] via-[#C69F56] to-[#987230] text-[#0E1322] font-bold text-[13.5px] border border-[#FCE7B6]/75 shadow-[0_4px_14px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.6)] hover:brightness-110 transition-all cursor-pointer"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              <Plus className="h-4 w-4 stroke-[2.25]" />
              <span>Request a tool</span>
            </button>

            <div className="h-6 w-px bg-[#283552] hidden sm:block" />

            {/* My Access Dropdown */}
            <div className="relative">
              <button
                onClick={() => setAccessMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-[14px] text-[#E6E1D6] hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <User className="h-4 w-4 text-[#C5A059]" />
                <span>My access</span>
                <ChevronDown className="h-3.5 w-3.5 text-[#9AA4BC]" />
              </button>

              {accessMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0B1528] border border-[#3A2C18] shadow-[0_18px_45px_rgba(0,0,0,0.95)] p-1.5 z-40 text-left">
                  <div className="px-3 py-2 border-b border-[#1E2B45]">
                    <p className="text-[11px] uppercase tracking-wider text-[#A69371] font-semibold">
                      Plan Entitlements
                    </p>
                    <p className="text-xs text-[#FFF4D4] mt-0.5 font-medium">
                      All {allInstruments.length} Waypoint Instruments Active
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setCategoryFilter("all");
                      setAccessMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs mt-1 cursor-pointer transition-colors ${
                      categoryFilter === "all"
                        ? "bg-[#162442] text-[#FFE394] font-semibold"
                        : "text-[#D0D7E8] hover:bg-white/[0.05]"
                    }`}
                  >
                    <span>All Instruments ({allInstruments.length})</span>
                    {categoryFilter === "all" && (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setAccessMenuOpen(false);
                      onOpenIepComparisonModal();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs mt-0.5 text-[#D0D7E8] hover:bg-white/[0.05] cursor-pointer transition-colors"
                  >
                    <span>Quick IEP PDF Compare Modal</span>
                    <GitCompare className="h-3.5 w-3.5 text-[#C5A059]" />
                  </button>
                  <button
                    onClick={() => {
                      setAccessMenuOpen(false);
                      onOpenRecorderModal();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs mt-0.5 text-[#D0D7E8] hover:bg-white/[0.05] cursor-pointer transition-colors"
                  >
                    <span>Quick Screen/Audio Capture</span>
                    <Mic className="h-3.5 w-3.5 text-rose-400" />
                  </button>
                  <button
                    onClick={() => {
                      setAccessMenuOpen(false);
                      setRequestModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs mt-1 border-t border-[#1E2B45] pt-2 text-[#FFE394] hover:bg-white/[0.05] cursor-pointer transition-colors"
                  >
                    <span>Request a New Tool...</span>
                    <Wrench className="h-3.5 w-3.5 text-[#C5A059]" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* MAIN BRASS & NAVY INSTRUMENT CREDENZA / CABINET CONSOLE           */}
        {/* ================================================================= */}
        <div className="relative rounded-[14px] bg-gradient-to-b from-[#202B42] via-[#10182B] to-[#0A101E] p-[10px] sm:p-[14px] border border-[#5B4827]/85 shadow-[0_32px_80px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.18)]">
          {/* Top Antique Brass Inlay Trim Bar */}
          <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-[#D2AE68] to-transparent opacity-85" />
          {/* Bottom Antique Brass Inlay Trim Bar */}
          <div className="absolute bottom-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-[#C59E54] to-transparent opacity-80" />

          {/* Inner Recessed Cabinet Housing */}
          <div className="grid grid-cols-1 lg:grid-cols-12 rounded-[10px] border-2 border-[#060A13] bg-[#080D1A] overflow-hidden shadow-[inset_0_6px_28px_rgba(0,0,0,0.95)]">
            {/* ------------------------------------------------------------- */}
            {/* LEFT COLUMN: SCROLLABLE STACK OF 15 DRAWERS + VINTAGE SPEAKER */}
            {/* ------------------------------------------------------------- */}
            <div className="lg:col-span-5 flex flex-col justify-between bg-[#090F1E] border-b-[6px] lg:border-b-0 lg:border-r-[8px] border-[#151E32] shadow-[4px_0_18px_rgba(0,0,0,0.85)]">
              <div
                className="flex flex-col p-2 sm:p-2.5 pb-1.5 gap-2 max-h-[395px] overflow-y-auto overscroll-contain pr-1.5 border-b-2 border-[#151E32]"
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: "#C5A059 #090F1E",
                }}
              >
                {visibleInstruments.map((inst) => {
                  const Icon = inst.icon;
                  const isActive = inst.id === activeInstrument.id;

                  return (
                    <button
                      key={inst.id}
                      ref={(el) => {
                        drawerRefs.current[inst.id] = el;
                      }}
                      type="button"
                      onClick={() => setSelectedId(inst.id)}
                      className={`group relative w-full shrink-0 text-left rounded-[7px] px-5 pt-4 pb-3.5 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between min-h-[122px] ${
                        isActive
                          ? "border border-[#7E89FF]/60 shadow-[0_10px_28px_rgba(0,0,0,0.9),inset_0_1px_18px_rgba(130,140,255,0.28)]"
                          : "bg-gradient-to-b from-[#151F35] via-[#0F1729] to-[#0B1120] border border-white/[0.07] hover:from-[#1B2742] hover:to-[#10192E] shadow-[0_6px_16px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.06)]"
                      }`}
                      style={
                        isActive
                          ? {
                              background:
                                "radial-gradient(ellipse at 58% 0%, rgba(132, 139, 255, 0.48) 0%, rgba(62, 72, 166, 0.34) 45%, rgba(18, 27, 52, 0.96) 100%)",
                            }
                          : undefined
                      }
                    >
                      {/* Active Left Vertical Gold Light Bar */}
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-gradient-to-b from-[#FFF6D6] via-[#E8BE69] to-[#AA7C2C] shadow-[0_0_16px_3px_rgba(255,224,140,0.85)]" />
                      )}

                      {/* Active Top Overhead Slot Glow Line */}
                      {isActive && (
                        <div className="absolute top-0 left-2 right-2 h-[2px] bg-gradient-to-r from-[#FFE394] via-[#B8C0FF] to-transparent opacity-95" />
                      )}

                      {/* Drawer Icon + Title + Subtitle */}
                      <div className="flex items-start gap-4 pl-1.5">
                        <div
                          className={`mt-1 shrink-0 transition-colors ${
                            isActive
                              ? "text-[#F8F6F0] drop-shadow-[0_0_10px_rgba(190,198,255,0.65)]"
                              : "text-[#C5CEE2] group-hover:text-white"
                          }`}
                        >
                          <Icon className="h-6 w-6 stroke-[1.75]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3
                            className={`text-[20px] sm:text-[22px] font-bold tracking-tight leading-snug transition-colors ${
                              isActive
                                ? "text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]"
                                : "text-[#F4EFE4] group-hover:text-white"
                            }`}
                            style={{
                              fontFamily: "'Playfair Display', Georgia, serif",
                            }}
                          >
                            {inst.drawerTitle}
                          </h3>
                          <p
                            className={`text-[13.5px] mt-0.5 truncate ${
                              isActive
                                ? "text-[#E1E6FA]"
                                : "text-[#AAB4CA] group-hover:text-[#C8D0E4]"
                            }`}
                          >
                            {inst.drawerSubtitle}
                          </p>
                        </div>
                      </div>

                      {/* Centered 3D Brass Drawer Pull Handle */}
                      <BrassDrawerPull active={isActive} />
                    </button>
                  );
                })}
              </div>

              {/* Lower Cabinet Bay: Vintage Admiralty Stereo Speaker Grille */}
              <VintageSpeakerGrilleBay />
            </div>

            {/* ------------------------------------------------------------- */}
            {/* RIGHT COLUMN: RECESSED ILLUMINATED INSTRUMENT DISPLAY STAGE   */}
            {/* ------------------------------------------------------------- */}
            <div
              className="lg:col-span-7 relative flex flex-col justify-between p-6 sm:p-9 lg:p-10 min-h-[540px] overflow-hidden"
              style={{
                background:
                  "radial-gradient(ellipse at 52% 0%, rgba(114, 120, 248, 0.30) 0%, rgba(46, 54, 122, 0.18) 44%, rgba(10, 15, 30, 0.98) 88%)",
                boxShadow:
                  "inset 0 18px 45px rgba(0,0,0,0.92), inset 14px 0 28px rgba(0,0,0,0.75), inset -10px 0 24px rgba(0,0,0,0.75)",
              }}
            >
              {/* Top Overhead Fluorescent / Neon Violet-Blue Light Tube */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[76%] flex flex-col items-center pointer-events-none">
                <div className="w-full h-[4px] rounded-full bg-gradient-to-r from-transparent via-[#DCE2FF] to-transparent shadow-[0_0_25px_5px_rgba(142,150,255,0.9),0_8px_45px_14px_rgba(99,102,241,0.5)]" />
              </div>

              {/* TOP SECTION: Category Overline + Stage Title + Plan Badge */}
              <div className="relative z-10 space-y-4 pt-1">
                {/* Category Overline with Horizontal Rule */}
                <div className="flex items-center gap-4">
                  <span className="text-[11.5px] uppercase tracking-[0.24em] text-[#C2C9E2] font-medium shrink-0">
                    {activeInstrument.categoryOverline}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-[#4E5982]/80 via-[#384164]/50 to-transparent" />
                </div>

                {/* Stage Title + Subtitle & Included Badge */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <h2
                      className="text-3xl sm:text-[42px] font-bold text-[#FBF8F1] tracking-tight leading-none"
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                      }}
                    >
                      {activeInstrument.stageTitle}
                    </h2>
                    <p
                      className="text-[16px] sm:text-[17.5px] text-[#DCE1F4] mt-2.5"
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                      }}
                    >
                      {activeInstrument.stageSubtitle}
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 text-[13.5px] text-[#D2D8EC] shrink-0 pt-1">
                    <CheckCircle2 className="h-4 w-4 text-[#C6B697]" />
                    <span>{activeInstrument.includedLabel}</span>
                  </div>
                </div>
              </div>

              {/* MIDDLE SECTION: Two-Column Live Preview + Chamfered Question Placard */}
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-5 my-6 items-stretch">
                {/* Left Card: Live Meeting / Document Preview Box */}
                <div className="md:col-span-7 rounded-xl bg-[#10172F]/90 border border-[#424C7A]/75 shadow-[0_16px_36px_rgba(0,0,0,0.75),inset_0_1px_1px_rgba(255,255,255,0.1)] flex flex-col overflow-hidden">
                  {/* Card Header */}
                  <div className="px-4 py-3 border-b border-[#2B345B] flex items-center justify-between bg-[#141D3B]/60">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#939BFF] shadow-[0_0_10px_#939BFF]" />
                      <span className="text-[14px] font-medium text-[#F1F4FF]">
                        {activeInstrument.previewCardTitle}
                      </span>
                    </div>
                    <MoreHorizontal className="h-4 w-4 text-[#8D97B8]" />
                  </div>

                  {/* Card Dialogue / Preview Rows */}
                  <div className="p-4 sm:p-5 space-y-3.5 flex-1 flex flex-col justify-center">
                    {activeInstrument.previewLines.map((row, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-[68px_1fr] gap-2 text-[13.5px] leading-relaxed"
                      >
                        <span className="text-[#AEB7DA] font-medium">
                          {row.speaker}
                        </span>
                        <span className="text-[#EEF1FC]">{row.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Card: Chamfered Lavender/Periwinkle Question Placard */}
                <div className="md:col-span-5 flex">
                  <div
                    className="relative w-full rounded-[10px] p-5 sm:p-6 flex flex-col justify-between shadow-[0_16px_36px_rgba(0,0,0,0.75),inset_0_1px_2px_rgba(255,255,255,0.45)] border border-[#B9C0FF]/60"
                    style={{
                      background:
                        "linear-gradient(145deg, #A3AAF2 0%, #868EE0 52%, #6E76CA 100%)",
                      clipPath:
                        "polygon(10px 0%, calc(100% - 10px) 0%, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0% calc(100% - 10px), 0% 10px)",
                    }}
                  >
                    {/* Inner inset hairline border */}
                    <div className="pointer-events-none absolute inset-[6px] border border-[#232854]/25 rounded-[6px]" />

                    <div className="relative z-10">
                      <span className="block text-[11px] uppercase tracking-[0.2em] text-[#1A1F42]/85 font-semibold">
                        {activeInstrument.placardHeader}
                      </span>
                      <div className="h-px w-full bg-[#1E244D]/25 mt-3 mb-4" />
                    </div>

                    <div className="relative z-10 my-auto py-1">
                      <p
                        className="text-[22px] sm:text-[25px] italic leading-[1.28] text-[#121633] font-medium"
                        style={{
                          fontFamily: "'Playfair Display', Georgia, serif",
                        }}
                      >
                        {activeInstrument.placardQuote}
                      </p>
                    </div>

                    <div className="relative z-10 h-2" />
                  </div>
                </div>
              </div>

              {/* BOTTOM SECTION: Primary Cast-Brass CTA + "See how it works" + Capabilities Footer */}
              <div className="relative z-10 space-y-5 pt-1">
                <div className="flex flex-wrap items-center justify-center gap-6">
                  {/* Brushed Brass Primary Action Button */}
                  <button
                    type="button"
                    onClick={activeInstrument.onOpen}
                    className="group relative inline-flex items-center justify-center gap-3.5 px-8 py-3.5 rounded-[9px] bg-gradient-to-b from-[#E5C887] via-[#C69F56] to-[#987230] text-[#0E1322] font-bold text-[17px] border border-[#FCE7B6]/75 shadow-[0_10px_26px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.7)] hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer"
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                    }}
                  >
                    <span>{activeInstrument.ctaLabel}</span>
                    <ArrowRight className="h-4 w-4 text-[#0E1322] transition-transform group-hover:translate-x-1" />
                  </button>

                  {activeInstrument.secondaryActionLabel &&
                    activeInstrument.onSecondaryAction && (
                      <>
                        <div className="h-7 w-px bg-[#384168]" />
                        <button
                          type="button"
                          onClick={activeInstrument.onSecondaryAction}
                          className="text-[14.5px] text-[#FFE394] hover:text-white underline underline-offset-[5px] decoration-[#C5A059]/70 hover:decoration-white transition-colors cursor-pointer"
                        >
                          {activeInstrument.secondaryActionLabel}
                        </button>
                      </>
                    )}

                  <div className="h-7 w-px bg-[#384168]" />

                  <button
                    type="button"
                    onClick={() => setHowItWorksOpen(true)}
                    className="text-[15px] text-[#DCE1F4] hover:text-white underline underline-offset-[5px] decoration-[#6D77A3] hover:decoration-white transition-colors cursor-pointer"
                  >
                    See how it works
                  </button>
                </div>

                {/* Bottom Capability Footer Line */}
                <div className="pt-1">
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-[#3D4670] to-transparent mb-3.5" />
                  <div
                    className="flex flex-wrap items-center justify-center gap-3 text-[13.5px] sm:text-[14.5px] text-[#CFD5EA] tracking-wide"
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                    }}
                  >
                    <span>{activeInstrument.capabilities[0]}</span>
                    <span className="text-[#7882AF]">·</span>
                    <span>{activeInstrument.capabilities[1]}</span>
                    <span className="text-[#7882AF]">·</span>
                    <span>{activeInstrument.capabilities[2]}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* BOTTOM TASK-ROUTING BAR                                           */}
        {/* ================================================================= */}
        <div className="pt-2 pb-4 px-2 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-t border-[#1B253E]">
          <div className="flex items-center gap-3">
            <h3
              className="text-xl sm:text-[23px] text-[#F5EFE2] tracking-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Need a tool for a specific task?
            </h3>
            {categoryFilter !== "all" && (
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                className="text-xs px-2.5 py-1 rounded-full bg-[#162442] border border-[#C5A059]/50 text-[#FFE394] hover:bg-[#1E3158] cursor-pointer"
              >
                Showing {categoryFilter} tools · Reset ({allInstruments.length})
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-[15px] text-[#DCE1F0]">
            <button
              type="button"
              onClick={() => handleTaskShortcut("meeting")}
              className={`group inline-flex items-center gap-2 transition-colors cursor-pointer ${
                categoryFilter === "meeting"
                  ? "text-[#FFE394] font-semibold"
                  : "hover:text-white"
              }`}
            >
              <span>Prepare for a meeting</span>
              <ArrowRight className="h-4 w-4 text-[#9AA4C4] group-hover:text-[#FFE394] group-hover:translate-x-0.5 transition-all" />
            </button>

            <div className="h-5 w-px bg-[#283552] hidden sm:block" />

            <button
              type="button"
              onClick={() => handleTaskShortcut("document")}
              className={`group inline-flex items-center gap-2 transition-colors cursor-pointer ${
                categoryFilter === "document"
                  ? "text-[#FFE394] font-semibold"
                  : "hover:text-white"
              }`}
            >
              <span>Review a document</span>
              <ArrowRight className="h-4 w-4 text-[#9AA4C4] group-hover:text-[#FFE394] group-hover:translate-x-0.5 transition-all" />
            </button>

            <div className="h-5 w-px bg-[#283552] hidden sm:block" />

            <button
              type="button"
              onClick={() => handleTaskShortcut("concern")}
              className={`group inline-flex items-center gap-2 transition-colors cursor-pointer ${
                categoryFilter === "concern"
                  ? "text-[#FFE394] font-semibold"
                  : "hover:text-white"
              }`}
            >
              <span>Organize a concern</span>
              <ArrowRight className="h-4 w-4 text-[#9AA4C4] group-hover:text-[#FFE394] group-hover:translate-x-0.5 transition-all" />
            </button>

            <div className="h-5 w-px bg-[#283552] hidden sm:block" />

            <button
              type="button"
              onClick={() => setRequestModalOpen(true)}
              className="group inline-flex items-center gap-1.5 text-[#FFE394] hover:text-white font-medium transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Request a tool</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* "SEE HOW IT WORKS" WALKTHROUGH MODAL                              */}
      {/* ================================================================= */}
      {howItWorksOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0B1428] border border-[#4E3D20] rounded-2xl w-full max-w-lg p-6 sm:p-7 space-y-6 shadow-[0_25px_70px_rgba(0,0,0,0.95)] text-[#FBF6EC]">
            <div className="flex items-start justify-between border-b border-[#22304D] pb-4">
              <div>
                <span className="text-[10.5px] uppercase tracking-[0.22em] text-[#C5A059] font-semibold">
                  {activeInstrument.sku} · {activeInstrument.categoryOverline}
                </span>
                <h3
                  className="text-2xl font-bold text-white mt-1"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  How {activeInstrument.stageTitle} Works
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setHowItWorksOpen(false)}
                className="text-[#9AA4BC] hover:text-white p-1.5 rounded-lg bg-[#070D1B] border border-[#24324F] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {activeInstrument.howItWorksSteps.map((step, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-[#070E1D] border border-[#1F2C48] space-y-1"
                >
                  <h4 className="text-sm font-bold text-[#FFE394]">
                    {step.title}
                  </h4>
                  <p className="text-xs text-[#C8D0E4] leading-relaxed">
                    {step.detail}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#22304D]">
              <button
                type="button"
                onClick={() => setHowItWorksOpen(false)}
                className="px-4 py-2 rounded-lg text-xs text-[#C8D0E4] hover:text-white border border-[#283655] bg-[#070D1B] cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setHowItWorksOpen(false);
                  activeInstrument.onOpen();
                }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold bg-gradient-to-b from-[#E5C887] via-[#C69F56] to-[#987230] text-[#0E1322] border border-[#FCE7B6]/70 cursor-pointer"
              >
                <Play className="h-3 w-3 fill-current" />
                <span>{activeInstrument.ctaLabel}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* REQUEST A NEW TOOL FORM MODAL                                     */}
      {/* ================================================================= */}
      <RequestToolModal
        open={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
      />
    </div>
  );
}
