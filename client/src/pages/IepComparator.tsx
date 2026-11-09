import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  FileText,
  GitCompare,
  Upload,
  CheckCircle2,
  X,
  ArrowRight,
} from "lucide-react";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import {
  ComparisonItem,
  MICHAEL_SHEEP_COMPARISON,
  IEP_VERSION_OPTIONS,
  IepVersionOption,
} from "@/components/iep/types";
import { ComparisonHeader } from "@/components/iep/ComparisonHeader";
import { IepComparatorSplitWorkspace } from "@/components/iep/IepComparatorSplitWorkspace";
import { ComparisonSummaryChips } from "@/components/iep/ComparisonSummaryChips";
import { ComparisonBoard } from "@/components/iep/ComparisonBoard";
import { ComparisonDetailDrawer } from "@/components/iep/ComparisonDetailDrawer";
import { ParentSchoolCorrectionEmailModal } from "@/components/iep/ParentSchoolCorrectionEmailModal";

export default function IepComparator() {
  const [, setLocation] = useLocation();

  // Main screen is "split" (matching the new design); "board" is the Connected Cards circuit view
  const [currentView, setCurrentView] = useState<"split" | "board">("split");

  // OLD file is ALWAYS on the left; NEW file is ALWAYS on the right
  const [oldVersion, setOldVersion] = useState<IepVersionOption>(
    IEP_VERSION_OPTIONS[1] // Mar 3, 2026 (Previous)
  );
  const [newVersion, setNewVersion] = useState<IepVersionOption>(
    IEP_VERSION_OPTIONS[0] // May 14, 2026 (Proposed)
  );

  // Comparison items list with local modifications (Notes, Flags, Reviewed)
  const [items, setItems] = useState<ComparisonItem[]>(
    MICHAEL_SHEEP_COMPARISON
  );
  const [selectedItemId, setSelectedItemId] = useState<string>(
    MICHAEL_SHEEP_COMPARISON[0].id
  );

  // Connected Cards Board filter & detail drawer state
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [drawerItem, setDrawerItem] = useState<ComparisonItem | null>(null);

  // Simple "Change files" modal state (Old File Always Left, New File Always Right)
  const [filePickerOpen, setFilePickerOpen] = useState<boolean>(false);
  const [schoolEmailModalOpen, setSchoolEmailModalOpen] =
    useState<boolean>(false);
  const [oldFileName, setOldFileName] = useState<string>(
    "Michael_IEP_Mar_3_2026.pdf"
  );
  const [newFileName, setNewFileName] = useState<string>(
    "Michael_IEP_May_14_2026_Proposed.pdf"
  );
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const selectedItem =
    items.find((i) => i.id === selectedItemId) || items[0];

  const flaggedProblemCount = useMemo(
    () => items.filter((i) => i.isStarred && i.status !== "unchanged").length,
    [items]
  );

  const filteredBoardItems = useMemo(() => {
    if (activeFilter === "all") return items;
    if (activeFilter === "high_attention") {
      return items.filter(
        (i) => i.severity === "high_attention" && i.status !== "unchanged"
      );
    }
    return items.filter((i) => i.status === activeFilter);
  }, [items, activeFilter]);

  const drawerIndex = drawerItem
    ? filteredBoardItems.findIndex((i) => i.id === drawerItem.id)
    : -1;
  const hasPrev = drawerIndex > 0;
  const hasNext =
    drawerIndex >= 0 && drawerIndex < filteredBoardItems.length - 1;

  const handleUploadOldFile = (file: File) => {
    setOldFileName(file.name);
    const cleaned = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
    setOldVersion({
      id: `old-${Date.now()}`,
      label: cleaned,
      date: cleaned.length > 22 ? cleaned.slice(0, 22) + "…" : cleaned,
      type: "active",
      badgeText: "Uploaded Previous IEP",
    });
    toast.success(`Old / Previous IEP loaded on Left: ${file.name}`);
  };

  const handleUploadNewFile = (file: File) => {
    setNewFileName(file.name);
    const cleaned = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
    setNewVersion({
      id: `new-${Date.now()}`,
      label: cleaned,
      date: cleaned.length > 22 ? cleaned.slice(0, 22) + "…" : cleaned,
      type: "proposed",
      badgeText: "Uploaded Proposed IEP",
    });
    toast.success(`New / Proposed IEP loaded on Right: ${file.name}`);
  };

  const handleToggleStar = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isStarred: !item.isStarred } : item
      )
    );
    if (drawerItem?.id === id) {
      setDrawerItem((curr) =>
        curr ? { ...curr, isStarred: !curr.isStarred } : null
      );
    }
    toast.success("Updated School Correction Email issues list");
  };

  const handleToggleReviewed = (id: string, advanceNext?: boolean) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, isReviewed: advanceNext ? true : !item.isReviewed }
          : item
      )
    );
    if (drawerItem?.id === id) {
      setDrawerItem((curr) =>
        curr ? { ...curr, isReviewed: !curr.isReviewed } : null
      );
    }
    if (advanceNext) {
      const changeItems = items.filter((i) => i.status !== "unchanged");
      const idx = changeItems.findIndex((i) => i.id === id);
      if (idx >= 0 && idx < changeItems.length - 1) {
        setSelectedItemId(changeItems[idx + 1].id);
      } else if (idx === changeItems.length - 1) {
        setSelectedItemId(changeItems[0].id);
        toast.success("All 7 changes reviewed!");
      }
    }
  };

  const handleUpdateNote = (id: string, note: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, userNote: note } : item))
    );
    if (drawerItem?.id === id) {
      setDrawerItem((curr) => (curr ? { ...curr, userNote: note } : null));
    }
  };

  const handleToggleLinkMinutes = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, linkedMinutes: !item.linkedMinutes }
          : item
      )
    );
    toast.success("Meeting agreement link updated");
  };

  const handleSendToBlueprint = (item: ComparisonItem) => {
    toast.success(`"${item.title}" sent to Meeting Blueprint`);
  };

  const handleRunComparison = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setFilePickerOpen(false);
      toast.success("Comparison updated: Old IEP (Left) vs. New IEP (Right)");
    }, 900);
  };

  return (
    <ScopedErrorBoundary>
      <div
        className="min-h-[calc(100vh-2rem)] w-full text-[#FBF6EC] px-4 sm:px-8 lg:px-10 py-6 md:py-8 select-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 10%, #111D3B 0%, #070E1F 55%, #040813 100%)",
        }}
      >
        <div className="max-w-[1360px] mx-auto space-y-5">
          {/* ── SIMPLE HEADER WITH OLD (LEFT) vs. NEW (RIGHT) BAR + SCHOOL EMAIL BANNER ── */}
          <ComparisonHeader
            currentView={currentView}
            onViewChange={setCurrentView}
            oldVersion={oldVersion}
            newVersion={newVersion}
            onSelectOldVersion={(v) => {
              setOldVersion(v);
              toast.info(`Left (Previous IEP) set to ${v.date}`);
            }}
            onSelectNewVersion={(v) => {
              setNewVersion(v);
              toast.info(`Right (Proposed IEP) set to ${v.date}`);
            }}
            onUploadOldFile={handleUploadOldFile}
            onUploadNewFile={handleUploadNewFile}
            onToggleFilePickerModal={() => setFilePickerOpen(true)}
            onOpenSchoolEmailModal={() => setSchoolEmailModalOpen(true)}
            flaggedProblemCount={flaggedProblemCount}
            onPrintBrief={() => window.print()}
            onBackToTools={() => setLocation("/tools")}
            studentName="Michael Sheep"
            studentGrade="8th Grade"
          />

          {/* ── VIEW 1 (DEFAULT MAIN SCREEN): FOCUSED SPLIT COMPARISON WORKSPACE ── */}
          {currentView === "split" && (
            <IepComparatorSplitWorkspace
              items={items}
              selectedItem={selectedItem}
              onSelectItem={(item) => setSelectedItemId(item.id)}
              oldVersion={oldVersion}
              newVersion={newVersion}
              onToggleStar={handleToggleStar}
              onToggleReviewed={handleToggleReviewed}
              onUpdateNote={handleUpdateNote}
              onToggleLinkMinutes={handleToggleLinkMinutes}
              onSendToBlueprint={handleSendToBlueprint}
              onOpenSchoolEmailModal={() => setSchoolEmailModalOpen(true)}
              onSwitchToBoardView={() => setCurrentView("board")}
            />
          )}

          {/* ── VIEW 2: CONNECTED CARDS CIRCUIT BOARD SCREEN ── */}
          {currentView === "board" && (
            <div className="space-y-6 text-left">
              <ComparisonSummaryChips
                items={items}
                activeFilter={activeFilter}
                onSelectFilter={setActiveFilter}
              />
              <ComparisonBoard
                items={filteredBoardItems}
                selectedItem={drawerItem}
                onSelectItem={setDrawerItem}
                onToggleStar={handleToggleStar}
                onToggleReviewed={(id) => handleToggleReviewed(id, false)}
                advocateMode={false}
                oldIepDate={oldVersion.date}
                newIepDate={newVersion.date}
                onBackToMainView={() => setCurrentView("split")}
              />
            </div>
          )}
        </div>

        {/* ── DEEP INSPECTION DRAWER FOR CONNECTED CARDS VIEW ── */}
        <ComparisonDetailDrawer
          item={drawerItem}
          isOpen={!!drawerItem}
          onClose={() => setDrawerItem(null)}
          advocateMode={false}
          onToggleStar={handleToggleStar}
          onToggleReviewed={(id) => handleToggleReviewed(id, false)}
          onUpdateNote={handleUpdateNote}
          onSelectPrev={() => {
            if (hasPrev) setDrawerItem(filteredBoardItems[drawerIndex - 1]);
          }}
          onSelectNext={() => {
            if (hasNext) setDrawerItem(filteredBoardItems[drawerIndex + 1]);
          }}
          hasPrev={hasPrev}
          hasNext={hasNext}
        />

        {/* ── PARENT-TO-SCHOOL IEP CORRECTION EMAIL MODAL ── */}
        <ParentSchoolCorrectionEmailModal
          open={schoolEmailModalOpen}
          onClose={() => setSchoolEmailModalOpen(false)}
          items={items}
          oldVersion={oldVersion}
          newVersion={newVersion}
          studentName="Michael Sheep"
          studentGrade="8th Grade"
          onToggleIncludeInEmail={handleToggleStar}
        />

        {/* ── SIMPLE "CHANGE FILES" MODAL: OLD FILE ALWAYS LEFT, NEW FILE ALWAYS RIGHT ── */}
        {filePickerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-2xl rounded-2xl bg-[#081124] border border-[#2B3B60] shadow-[0_25px_70px_rgba(0,0,0,0.95)] p-6 sm:p-7 space-y-6 text-left">
              <div className="flex items-start justify-between border-b border-[#1C2846] pb-4">
                <div>
                  <h3
                    className="text-2xl font-bold text-white"
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                    }}
                  >
                    Choose IEP Files to Compare
                  </h3>
                  <p className="text-xs text-[#9AA6C4] mt-1">
                    Old / Previous IEP is always on the{" "}
                    <strong className="text-white">left</strong>. New / Proposed
                    IEP is always on the{" "}
                    <strong className="text-[#B8C0FF]">right</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFilePickerOpen(false)}
                  className="p-1.5 rounded-lg bg-[#050A16] border border-[#24324F] text-[#9AA4BC] hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Two Side-by-Side Dropzones: OLD ON LEFT, NEW ON RIGHT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
                {/* LEFT: OLD / PREVIOUS FILE */}
                <div className="relative rounded-xl bg-[#0B152B] border-2 border-dashed border-[#344670] hover:border-[#FFE394] p-5 flex flex-col justify-between transition-all">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#182442] text-[#C8D2EC] border border-[#2F416D]">
                        1 · Left Side (Old File)
                      </span>
                      <FileText className="h-4 w-4 text-[#9AA6C4]" />
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Previous / Baseline IEP
                      </h4>
                      <p className="text-xs text-[#9AA6C4] mt-0.5">
                        Currently selected:{" "}
                        <span className="text-[#FFE394] font-medium">
                          {oldVersion.date}
                        </span>
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#060C1A] border border-[#1E2B4A] flex items-center gap-2 text-xs text-[#DCE2F2] truncate">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{oldFileName}</span>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[#192542] space-y-2">
                    <label className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#142242] hover:bg-[#1C2F5A] border border-[#344875] text-xs font-semibold text-white cursor-pointer transition-colors">
                      <Upload className="h-3.5 w-3.5 text-[#FFE394]" />
                      <span>Upload Old IEP (PDF/DOCX)</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadOldFile(f);
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* RIGHT: NEW / PROPOSED FILE */}
                <div className="relative rounded-xl bg-[#101638] border-2 border-dashed border-[#5E68D8] hover:border-[#9CA4FF] p-5 flex flex-col justify-between transition-all">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#252B63] text-[#D4D9FF] border border-[#6E78FF]/60">
                        2 · Right Side (New File)
                      </span>
                      <FileText className="h-4 w-4 text-[#B8C0FF]" />
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Proposed / New IEP
                      </h4>
                      <p className="text-xs text-[#B8C0FF] mt-0.5">
                        Currently selected:{" "}
                        <span className="text-white font-semibold">
                          {newVersion.date}
                        </span>
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#090E26] border border-[#353E7B] flex items-center gap-2 text-xs text-white truncate">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#939BFF] shrink-0" />
                      <span className="truncate">{newFileName}</span>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[#252E60] space-y-2">
                    <label className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#272D66] hover:bg-[#32397E] border border-[#727CFF]/70 text-xs font-semibold text-white cursor-pointer transition-colors">
                      <Upload className="h-3.5 w-3.5 text-[#C2C8FF]" />
                      <span>Upload New IEP (PDF/DOCX)</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadNewFile(f);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1C2846]">
                <button
                  type="button"
                  onClick={() => setFilePickerOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs text-[#9AA6C4] hover:text-white bg-[#050A16] border border-[#24324F] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRunComparison}
                  disabled={isAnalyzing}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-b from-[#E5C887] via-[#C69F56] to-[#987230] text-[#0E1322] font-bold text-xs border border-[#FCE7B6]/75 cursor-pointer"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  <GitCompare className="h-3.5 w-3.5" />
                  <span>
                    {isAnalyzing ? "Comparing Files..." : "Compare Old vs. New"}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ScopedErrorBoundary>
  );
}
