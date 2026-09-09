import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileText, GitCompare, Info } from "lucide-react";
import {
  ComparisonItem,
  MICHAEL_SHEEP_COMPARISON,
  IEP_VERSION_OPTIONS,
  IepVersionOption,
} from "@/components/iep/types";
import { ComparisonHeader } from "@/components/iep/ComparisonHeader";
import { ComparisonSummaryChips } from "@/components/iep/ComparisonSummaryChips";
import { ComparisonBoard } from "@/components/iep/ComparisonBoard";
import { DetailedChangesView } from "@/components/iep/DetailedChangesView";
import { ComparisonDetailDrawer } from "@/components/iep/ComparisonDetailDrawer";

export default function IepComparator() {
  const [, setLocation] = useLocation();

  // Primary view selector: "board" (Comparison Board) is DEFAULT per specification
  const [currentView, setCurrentView] = useState<"board" | "detailed">("board");

  // Advocate mode state
  const [advocateMode, setAdvocateMode] = useState<boolean>(false);

  // Active filter chip state
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // Selected item for the deep inspection drawer
  const [selectedItem, setSelectedItem] = useState<ComparisonItem | null>(null);

  // Version options state
  const [newVersion, setNewVersion] = useState<IepVersionOption>(IEP_VERSION_OPTIONS[0]);
  const [oldVersion, setOldVersion] = useState<IepVersionOption>(IEP_VERSION_OPTIONS[1]);

  // Upload/Processing state (Starts preloaded for instant WOW factor)
  const [isUploaded, setIsUploaded] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [prevFileName, setPrevFileName] = useState<string | null>("Michael_IEP_March_2026.pdf");
  const [currFileName, setCurrFileName] = useState<string | null>("Michael_IEP_May_2026_Proposed.pdf");
  const [processingStep, setProcessingStep] = useState<string>("");

  // Comparison items list with local modifications (Notes, Stars, Reviewed)
  const [items, setItems] = useState<ComparisonItem[]>(MICHAEL_SHEEP_COMPARISON);

  // Filtered items based on top summary chip selection
  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return items;
    if (activeFilter === "high_attention") {
      return items.filter((i) => i.severity === "high_attention" && i.status !== "unchanged");
    }
    return items.filter((i) => i.status === activeFilter);
  }, [items, activeFilter]);

  // Drawer Next/Prev navigation
  const currentIndex = selectedItem
    ? filteredItems.findIndex((i) => i.id === selectedItem.id)
    : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < filteredItems.length - 1;

  const handleSelectPrev = () => {
    if (hasPrev) {
      setSelectedItem(filteredItems[currentIndex - 1]);
    }
  };

  const handleSelectNext = () => {
    if (hasNext) {
      setSelectedItem(filteredItems[currentIndex + 1]);
    }
  };

  // Interactive callbacks
  const handleToggleStar = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isStarred: !item.isStarred } : item
      )
    );
    if (selectedItem?.id === id) {
      setSelectedItem((curr) => (curr ? { ...curr, isStarred: !curr.isStarred } : null));
    }
    toast.success("Meeting Prep brief updated");
  };

  const handleToggleReviewed = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isReviewed: !item.isReviewed } : item
      )
    );
    if (selectedItem?.id === id) {
      setSelectedItem((curr) => (curr ? { ...curr, isReviewed: !curr.isReviewed } : null));
    }
  };

  const handleUpdateNote = (id: string, note: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, userNote: note } : item))
    );
    if (selectedItem?.id === id) {
      setSelectedItem((curr) => (curr ? { ...curr, userNote: note } : null));
    }
  };

  // Mock upload handlers
  const handleUpload = (prev: boolean, file: File) => {
    if (prev) {
      setPrevFileName(file.name);
    } else {
      setCurrFileName(file.name);
    }
  };

  const startAnalysis = () => {
    if (!prevFileName || !currFileName) {
      toast.error("Please upload both previous and new IEP files first.");
      return;
    }

    setIsProcessing(true);
    const stages = [
      "Reading Previous IEP...",
      "Reading New IEP...",
      "Identifying IEP Sections...",
      "Matching Annual Goals...",
      "Comparing Special Education Services...",
      "Comparing Accommodations & Classroom Aids...",
      "Reviewing LRE & Placement Levels...",
      "Running Plain Language Explanations Engine...",
      "Building Your Waypoint Comparison Board...",
    ];

    let currentStageIndex = 0;
    setProcessingStep(stages[0]);

    const interval = setInterval(() => {
      currentStageIndex++;
      if (currentStageIndex < stages.length) {
        setProcessingStep(stages[currentStageIndex]);
      } else {
        clearInterval(interval);
        setIsProcessing(false);
        setIsUploaded(true);
        setCurrentView("board");
        toast.success("IEP Comparison Prepared Successfully!");
      }
    }, 550);
  };

  const resetUploads = () => {
    setPrevFileName(null);
    setCurrFileName(null);
    setIsUploaded(false);
  };

  return (
    <div className="min-h-screen bg-background text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* ── HEADER / WORKSTATION BAR ── */}
        <ComparisonHeader
          currentView={currentView}
          onViewChange={setCurrentView}
          advocateMode={advocateMode}
          onAdvocateModeChange={setAdvocateMode}
          newVersion={newVersion}
          oldVersion={oldVersion}
          onSelectNewVersion={setNewVersion}
          onSelectOldVersion={setOldVersion}
          onResetUploads={resetUploads}
          onPrintBrief={() => window.print()}
          onBackToTools={() => setLocation("/tools")}
        />

        {/* ── UPLOAD & PROCESSING STAGE (IF RESET) ── */}
        {!isUploaded ? (
          <div className="max-w-3xl mx-auto space-y-8 py-10 text-left">
            {isProcessing ? (
              <div className="bg-[#07162B]/70 border border-white/10 rounded-2xl p-12 text-center space-y-6 shadow-2xl">
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin" />
                  <GitCompare className="h-6 w-6 text-indigo-400 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white font-serif">Analyzing IEP Documents</h3>
                  <p className="text-sm font-mono text-amber-400">{processingStep}</p>
                </div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Our normalization engine is matching present levels, calculating weekly service minute deltas, and mapping accommodations.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Previous IEP Dropzone */}
                  <div className="bg-[#07162B]/40 border border-dashed border-white/10 hover:border-indigo-500/40 rounded-2xl p-8 text-center relative transition-all min-h-[200px] flex flex-col justify-center items-center space-y-3">
                    <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Previous IEP Version</h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto truncate font-mono">
                        {prevFileName || "Drag & drop PDF / DOCX here"}
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => e.target.files?.[0] && handleUpload(true, e.target.files[0])}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>

                  {/* Proposed New IEP Dropzone */}
                  <div className="bg-[#07162B]/40 border border-dashed border-white/10 hover:border-emerald-500/40 rounded-2xl p-8 text-center relative transition-all min-h-[200px] flex flex-col justify-center items-center space-y-3">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">New / Proposed IEP</h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto truncate font-mono">
                        {currFileName || "Drag & drop PDF / DOCX here"}
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => e.target.files?.[0] && handleUpload(false, e.target.files[0])}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex justify-center pt-2">
                  <Button
                    onClick={startAnalysis}
                    className="bg-indigo-650 hover:bg-indigo-600 text-white font-bold px-8 py-3 rounded-xl shadow-lg flex items-center gap-2"
                  >
                    <GitCompare className="h-5 w-5" /> Start IEP Comparison
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── MAIN COMPARISON WORKSPACE ── */
          <div className="space-y-6 text-left">
            {/* Summary Chip Filter Bar */}
            <ComparisonSummaryChips
              items={items}
              activeFilter={activeFilter}
              onSelectFilter={setActiveFilter}
            />

            {/* VIEW 1: COMPARISON BOARD (DEFAULT) */}
            {currentView === "board" && (
              <ComparisonBoard
                items={filteredItems}
                selectedItem={selectedItem}
                onSelectItem={setSelectedItem}
                onToggleStar={handleToggleStar}
                onToggleReviewed={handleToggleReviewed}
                advocateMode={advocateMode}
                newIepDate={newVersion.date}
                oldIepDate={oldVersion.date}
              />
            )}

            {/* VIEW 2: DETAILED CHANGES (SECONDARY) */}
            {currentView === "detailed" && (
              <DetailedChangesView
                items={items}
                advocateMode={advocateMode}
                onToggleStar={handleToggleStar}
                onToggleReviewed={handleToggleReviewed}
                onUpdateNote={handleUpdateNote}
                onPrintBrief={() => window.print()}
              />
            )}
          </div>
        )}

        {/* ── DEEP INSPECTION DRAWER (CLICKABLE CARD MODAL) ── */}
        <ComparisonDetailDrawer
          item={selectedItem}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          advocateMode={advocateMode}
          onToggleStar={handleToggleStar}
          onToggleReviewed={handleToggleReviewed}
          onUpdateNote={handleUpdateNote}
          onSelectPrev={handleSelectPrev}
          onSelectNext={handleSelectNext}
          hasPrev={hasPrev}
          hasNext={hasNext}
        />
      </div>
    </div>
  );
}
