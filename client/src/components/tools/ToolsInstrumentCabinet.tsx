import React, { useState, useMemo } from "react";
import { Search, X, ChevronLeft, ChevronRight, HelpCircle, MoreHorizontal } from "lucide-react";
import PageIdBadge from "@/components/PageIdBadge";
import {
  buildAllInstruments,
  type InstrumentDefinition,
} from "./toolsCatalogData";
import { RequestToolModal } from "./RequestToolModal";
import { Tool3DAppIcon } from "./ToolsAppIllustrations";

export type { InstrumentDefinition };

interface ToolsInstrumentCabinetProps {
  contactId?: number;
  setLocation: (path: string) => void;
  onOpenIepComparisonModal: () => void;
  onOpenRecorderModal: () => void;
}

export function ToolsInstrumentCabinet({
  contactId,
  setLocation,
  onOpenIepComparisonModal,
  onOpenRecorderModal,
}: ToolsInstrumentCabinetProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | "meeting" | "document" | "concern"
  >("all");
  const [showAllTools, setShowAllTools] = useState<boolean>(false);
  const [detailInstrumentId, setDetailInstrumentId] = useState<string | null>(
    null
  );
  const [previewTab, setPreviewTab] = useState<
    "Meeting" | "Notes" | "Next steps"
  >("Meeting");
  const [questionIndex, setQuestionIndex] = useState<number>(2);
  const [requestModalOpen, setRequestModalOpen] = useState<boolean>(false);

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

  const filteredInstruments = useMemo(() => {
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

  // Show the 6 core featured tools by default (matching the 3x2 reference layout),
  // or all tools when searching, filtering by category, or toggling "Show all tools".
  const displayedInstruments = useMemo(() => {
    if (searchQuery.trim() || categoryFilter !== "all" || showAllTools) {
      return filteredInstruments;
    }
    return filteredInstruments.slice(0, 6);
  }, [filteredInstruments, searchQuery, categoryFilter, showAllTools]);

  const detailInstrument = useMemo(() => {
    if (!detailInstrumentId) return null;
    return allInstruments.find((i) => i.id === detailInstrumentId) || null;
  }, [allInstruments, detailInstrumentId]);

  const questionsList = useMemo(() => {
    if (!detailInstrument) return [];
    if (
      detailInstrument.questionsCarousel &&
      detailInstrument.questionsCarousel.length > 0
    ) {
      return detailInstrument.questionsCarousel;
    }
    return [
      detailInstrument.placardQuote,
      "What evaluation data or baseline supports this team recommendation?",
      "How will progress toward this target be measured and reported?",
      "Can we document this agreement in the Prior Written Notice?",
    ];
  }, [detailInstrument]);

  const handleOpenDetails = (id: string) => {
    setDetailInstrumentId(id);
    setPreviewTab("Meeting");
    setQuestionIndex(id === "first-mate" ? 2 : 0);
  };

  return (
    <div
      className="relative min-h-[calc(100vh-2rem)] w-full text-white px-6 sm:px-10 lg:px-14 py-8 md:py-10 overflow-hidden select-none flex flex-col justify-between"
      style={{
        background:
          "radial-gradient(ellipse at 72% 18%, #152254 0%, #091230 42%, #05091B 78%, #030613 100%)",
      }}
    >
      {/* Subtle Cosmic Indigo Ambient Glows */}
      <div
        className="pointer-events-none absolute top-16 right-1/4 w-[480px] h-[360px] rounded-full opacity-35 blur-[95px]"
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,0.55) 0%, rgba(30,58,138,0) 70%)",
        }}
      />

      <div className="relative z-10 max-w-[1280px] w-full mx-auto">
        {/* ================================================================= */}
        {/* 1. TOP HEADER ROW                                                 */}
        {/* ================================================================= */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-[12px] sm:text-[13px] uppercase tracking-[0.28em] text-[#E2E8F0] font-medium">
                WAYPOINT ADVOCATES
              </span>
              <PageIdBadge id="PG-010" />
            </div>

            <h1
              className="text-4xl sm:text-[54px] font-normal text-white tracking-tight leading-[1.06] mt-2.5"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Your tools
            </h1>
            <p className="text-[17px] sm:text-[19.5px] text-[#B8C4D9] mt-2 font-normal">
              Support for every school conversation.
            </p>
          </div>

          {/* Search Input Pill */}
          <div className="w-full md:w-[330px] pb-1">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools"
                aria-label="Search tools"
                className="w-full h-11 pl-11 pr-9 rounded-full bg-[#0B132B]/90 border border-[#2B3B60] text-[14.5px] text-white placeholder:text-[#94A3B8] focus:outline-none focus:border-[#93A3F8] shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white cursor-pointer"
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. CATEGORY FILTER TABS                                           */}
        {/* ================================================================= */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-6 border-b border-[#192648] pb-4 mt-7">
          {(
            [
              { id: "all", label: "All apps" },
              { id: "meeting", label: "Meetings" },
              { id: "document", label: "Understand your IEP" },
              { id: "concern", label: "Write & prepare" },
            ] as const
          ).map((tab) => {
            const isActive = categoryFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-5 py-1.5 rounded-full text-[14.5px] transition-all cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-b from-[#AEB8FF] to-[#8E9BEF] text-[#070D20] font-semibold shadow-[0_4px_16px_rgba(142,155,239,0.35)]"
                    : "text-[#CBD5E1] hover:text-white font-normal"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ================================================================= */}
        {/* 3. SECTION HEADING: "Made for your next step"                     */}
        {/* ================================================================= */}
        <div className="mt-7 mb-3">
          <h2 className="text-[24px] sm:text-[28px] font-bold text-white tracking-tight leading-snug">
            Made for your next step
          </h2>
          <p className="text-[15.5px] sm:text-[17px] text-[#A3B1C6] mt-0.5">
            Practical support, whenever you need it.
          </p>
        </div>

        {/* ================================================================= */}
        {/* 4. TWO-COLUMN APP STORE GRID (3 ROWS × 2 COLUMNS)                 */}
        {/* ================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12">
          {displayedInstruments.map((inst) => (
            <div
              key={inst.id}
              onClick={() => inst.onOpen()}
              className="group flex items-center justify-between gap-4 py-5 border-b border-[#182546] hover:bg-white/[0.015] rounded-lg px-1 transition-colors cursor-pointer"
            >
              {/* Left: 3D App Icon + Title + Description + Included */}
              <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                <Tool3DAppIcon id={inst.id} size="lg" />
                <div className="min-w-0">
                  <h3 className="text-[20px] sm:text-[22px] font-bold text-white leading-snug tracking-tight">
                    {inst.drawerTitle}
                  </h3>
                  <p className="text-[14.5px] sm:text-[15.5px] text-[#CBD5E1] mt-1 leading-snug line-clamp-2">
                    {inst.drawerSubtitle}
                  </p>
                  <span className="block text-[13px] text-[#94A3B8] mt-2">
                    Included
                  </span>
                </div>
              </div>

              {/* Right: Stacked Launch (Gold Pill) + Details (Dark Pill with Gold Text) */}
              <div className="flex flex-col items-center gap-2.5 shrink-0 pl-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    inst.onOpen();
                  }}
                  className="w-[104px] py-1.5 rounded-full bg-gradient-to-b from-[#EAD096] via-[#D5B068] to-[#B78E43] text-[#081021] font-bold text-[14px] text-center shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Launch
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDetails(inst.id);
                  }}
                  className="w-[104px] py-1.5 rounded-full bg-gradient-to-b from-[#131E3A] to-[#0B1328] border border-[#2B3B60] hover:border-[#DFBE77]/70 text-[#E5C687] hover:text-[#FFE394] font-medium text-[14px] text-center shadow-[0_3px_10px_rgba(0,0,0,0.45)] transition-all cursor-pointer"
                >
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ================================================================= */}
        {/* 5. BOTTOM FOOTER TAGLINE + MORE TOOLS TOGGLE                      */}
        {/* ================================================================= */}
        <div className="mt-5 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[14.5px] text-[#94A3B8]">
          <p className="italic text-[#A3B1C6]">
            Your tools. Your records. Ready for the next school conversation.
          </p>

          <div className="flex items-center gap-5 text-xs">
            {categoryFilter === "all" && !searchQuery.trim() && (
              <button
                type="button"
                onClick={() => setShowAllTools((prev) => !prev)}
                className="text-[#E5C687] hover:text-[#FFE394] font-medium transition-colors cursor-pointer"
              >
                {showAllTools
                  ? "Show featured 6 tools"
                  : `All ${allInstruments.length} tools (Waypoint Places, Recorder & more) ›`}
              </button>
            )}
            <button
              type="button"
              onClick={() => setRequestModalOpen(true)}
              className="text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
            >
              Request a tool ›
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* TOOL DETAILS & INTERACTIVE PREVIEW MODAL (Opens on "Details")     */}
      {/* ================================================================= */}
      {detailInstrument && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setDetailInstrumentId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[540px] rounded-[22px] bg-[#0A1328] border border-[#243660] p-6 sm:p-7 shadow-[0_28px_80px_rgba(0,0,0,0.92)] text-white"
          >
            <button
              type="button"
              onClick={() => setDetailInstrumentId(null)}
              aria-label="Close details"
              className="absolute top-5 right-5 text-[#94A3B8] hover:text-white p-1.5 rounded-lg cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="flex items-start gap-4 pr-8">
              <Tool3DAppIcon id={detailInstrument.id} size="md" />
              <div>
                <h2
                  className="text-3xl font-normal text-white leading-none"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {detailInstrument.stageTitle}
                </h2>
                <p className="text-[15px] text-[#CBD5E1] mt-2">
                  {detailInstrument.inspectorSubtitle ||
                    detailInstrument.stageSubtitle}
                </p>
                <span className="inline-block mt-2.5 px-3 py-1 rounded-md bg-[#162344] border border-[#2A3F6E] text-[12px] text-[#93C5FD] font-medium">
                  Included with Tools Access
                </span>
              </div>
            </div>

            {/* Interactive Preview Window */}
            <div className="mt-5 rounded-2xl bg-[#070E20] border border-[#6C5CE7]/65 shadow-[0_0_32px_rgba(124,92,252,0.2)] overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-[#192544] bg-[#0B1329] flex items-center justify-between gap-2">
                <span
                  className="text-[13.5px] text-white font-medium truncate"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {detailInstrument.stageTitle}
                </span>
                <div className="flex items-center gap-1 text-[11.5px]">
                  {(["Meeting", "Notes", "Next steps"] as const).map(
                    (subTab) => (
                      <button
                        key={subTab}
                        type="button"
                        onClick={() => setPreviewTab(subTab)}
                        className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                          previewTab === subTab
                            ? "bg-[#1D2B50] text-white font-medium"
                            : "text-[#94A3B8] hover:text-white"
                        }`}
                      >
                        {subTab}
                      </button>
                    )
                  )}
                </div>
                <MoreHorizontal className="h-4 w-4 text-[#94A3B8]" />
              </div>

              <div className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-stretch">
                <div className="sm:col-span-5 space-y-2 text-[11.5px]">
                  <h4 className="text-[12px] font-medium text-[#CBD5E1]">
                    {detailInstrument.previewCardTitle}
                  </h4>
                  {detailInstrument.previewLines.map((row, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <span className="font-semibold text-white block">
                        {row.speaker}
                      </span>
                      <p className="text-[#CBD5E1]">{row.text}</p>
                    </div>
                  ))}
                </div>

                <div className="sm:col-span-7 flex flex-col justify-between">
                  <div
                    className="rounded-xl p-4 border border-[#8B78FF]/60 min-h-[135px] flex flex-col justify-between"
                    style={{
                      background:
                        "radial-gradient(ellipse at 80% 20%, rgba(167,139,250,0.42) 0%, rgba(91,63,217,0.38) 48%, rgba(30,27,75,0.92) 100%)",
                    }}
                  >
                    <div className="flex items-center gap-1.5 text-[11.5px] text-[#E2E8F0]">
                      <HelpCircle className="h-3.5 w-3.5 text-[#C4B5FD]" />
                      <span>{detailInstrument.placardHeader}</span>
                    </div>
                    <p
                      className="text-[19px] text-white font-normal leading-snug my-auto pt-2"
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                      }}
                    >
                      {questionsList[questionIndex % questionsList.length]}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-4 pt-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        setQuestionIndex(
                          (prev) =>
                            (prev - 1 + questionsList.length) %
                            questionsList.length
                        )
                      }
                      className="w-6 h-6 rounded-full border border-[#293B66] flex items-center justify-center text-[#94A3B8] hover:text-white cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-[11px] text-[#94A3B8]">
                      {(questionIndex % questionsList.length) + 1} of{" "}
                      {questionsList.length} questions
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setQuestionIndex(
                          (prev) => (prev + 1) % questionsList.length
                        )
                      }
                      className="w-6 h-6 rounded-full border border-[#293B66] flex items-center justify-center text-[#94A3B8] hover:text-white cursor-pointer"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom CTAs */}
            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  const target = detailInstrument;
                  setDetailInstrumentId(null);
                  target.onOpen();
                }}
                className="w-full py-3 rounded-full bg-gradient-to-r from-[#DFBE77] via-[#D4AE65] to-[#B78D40] text-[#081021] font-bold text-[15px] shadow-lg hover:brightness-105 cursor-pointer"
              >
                {detailInstrument.ctaLabel.startsWith("Launch")
                  ? detailInstrument.ctaLabel
                  : `Launch ${detailInstrument.stageTitle}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request a Tool Modal */}
      <RequestToolModal
        open={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
      />
    </div>
  );
}
