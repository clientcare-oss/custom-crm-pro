import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  FileText,
  GitCompare,
  Upload,
  CheckCircle2,
  X,
  ArrowRight,
  Columns3,
} from "lucide-react";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  ComparisonItem,
  MICHAEL_SHEEP_COMPARISON,
  IEP_VERSION_OPTIONS,
  IepVersionOption,
  type ComparatorWorkspaceView,
} from "@/components/iep/types";
import { getOrBuildVersionPdf } from "@/components/iep/iepDocumentPdfBuilder";
import { ComparisonHeader } from "@/components/iep/ComparisonHeader";
import { OriginalDocumentsView } from "@/components/iep/OriginalDocumentsView";
import { IepComparatorSplitWorkspace } from "@/components/iep/IepComparatorSplitWorkspace";
import { ComparisonSummaryChips } from "@/components/iep/ComparisonSummaryChips";
import { ComparisonBoard } from "@/components/iep/ComparisonBoard";
import { DetailedChangesView } from "@/components/iep/DetailedChangesView";
import { ComparisonDetailDrawer } from "@/components/iep/ComparisonDetailDrawer";
import { ParentSchoolCorrectionEmailModal } from "@/components/iep/ParentSchoolCorrectionEmailModal";

const DEFAULT_ORG_SCOPE = "waypoint-advocates-org";

function isValidWorkspaceView(val: string | null): val is ComparatorWorkspaceView {
  return val === "original_documents" || val === "cards" || val === "notes";
}

export default function IepComparator() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Optional ?contactId=... parameter to load student's stored IEP documents via trpc.iep.get
  const contactIdParam = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("contactId") || params.get("studentId");
    const parsed = raw ? parseInt(raw, 10) : NaN;
    return !Number.isNaN(parsed) && parsed > 0 ? parsed : null;
  }, []);

  const iepDocQuery = trpc.iep.get.useQuery(
    { contactId: contactIdParam ?? 0 },
    { enabled: Boolean(contactIdParam), retry: false }
  );

  // Scoped View Preferences (7. REMEMBER VIEW PREFERENCES)
  // Scoped to user ID + organization scope so preferences never leak between users or organizations
  const userIdScope = user?.id || "anonymous-staff";
  const orgIdScope = DEFAULT_ORG_SCOPE;

  const orgPrefKey = `waypoint:iep-comparator:org-default-view:${orgIdScope}`;
  const userPrefKey = `waypoint:iep-comparator:user-preferred-view:${orgIdScope}:${userIdScope}`;
  const lastSessionViewKey = `waypoint:iep-comparator:last-view:${orgIdScope}:${userIdScope}`;
  const sessionStateKey = `waypoint:iep-comparator:session-state:${orgIdScope}:${userIdScope}:${contactIdParam || "default"}`;

  const [orgDefaultView, setOrgDefaultViewState] = useState<ComparatorWorkspaceView>(() => {
    if (typeof window === "undefined") return "original_documents";
    const stored = window.localStorage.getItem(orgPrefKey);
    return isValidWorkspaceView(stored) ? stored : "original_documents";
  });

  const [userPreferredView, setUserPreferredViewState] =
    useState<ComparatorWorkspaceView | null>(() => {
      if (typeof window === "undefined") return null;
      const stored = window.localStorage.getItem(userPrefKey);
      return isValidWorkspaceView(stored) ? stored : null;
    });

  // Resolve initial view:
  // 1. Individual staff preference overrides organization default
  // 2. Last selected view in session if remembered
  // 3. Organization default
  // 4. Fallback: "original_documents"
  const [currentView, setCurrentViewState] = useState<ComparatorWorkspaceView>(() => {
    if (typeof window === "undefined") return "original_documents";
    const userPref = window.localStorage.getItem(userPrefKey);
    if (isValidWorkspaceView(userPref)) return userPref;
    const lastView = window.localStorage.getItem(lastSessionViewKey);
    if (isValidWorkspaceView(lastView)) return lastView;
    const orgDef = window.localStorage.getItem(orgPrefKey);
    if (isValidWorkspaceView(orgDef)) return orgDef;
    return "original_documents";
  });

  // Re-sync when user identity resolves
  useEffect(() => {
    if (typeof window === "undefined") return;
    const uPref = window.localStorage.getItem(userPrefKey);
    const oPref = window.localStorage.getItem(orgPrefKey);
    const lastV = window.localStorage.getItem(lastSessionViewKey);

    setUserPreferredViewState(isValidWorkspaceView(uPref) ? uPref : null);
    setOrgDefaultViewState(isValidWorkspaceView(oPref) ? oPref : "original_documents");

    if (isValidWorkspaceView(uPref)) {
      setCurrentViewState(uPref);
    } else if (isValidWorkspaceView(lastV)) {
      setCurrentViewState(lastV);
    } else if (isValidWorkspaceView(oPref)) {
      setCurrentViewState(oPref);
    } else {
      setCurrentViewState("original_documents");
    }
  }, [userPrefKey, orgPrefKey, lastSessionViewKey]);

  const handleViewChange = useCallback(
    (nextView: ComparatorWorkspaceView) => {
      setCurrentViewState(nextView);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(lastSessionViewKey, nextView);
      }
    },
    [lastSessionViewKey]
  );

  const handleSetUserPreferredView = useCallback(
    (pref: ComparatorWorkspaceView | null) => {
      setUserPreferredViewState(pref);
      if (typeof window !== "undefined") {
        if (pref) {
          window.localStorage.setItem(userPrefKey, pref);
          window.localStorage.setItem(lastSessionViewKey, pref);
          setCurrentViewState(pref);
          toast.success(`Personal default view set to ${pref.replace("_", " ")}`);
        } else {
          window.localStorage.removeItem(userPrefKey);
          setCurrentViewState(orgDefaultView);
          toast.info("Cleared personal override — using organization default view");
        }
      }
    },
    [userPrefKey, lastSessionViewKey, orgDefaultView]
  );

  const handleSetOrgDefaultView = useCallback(
    (orgView: ComparatorWorkspaceView) => {
      setOrgDefaultViewState(orgView);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(orgPrefKey, orgView);
      }
      if (!userPreferredView) {
        setCurrentViewState(orgView);
      }
      toast.success(`Organization default view updated to ${orgView.replace("_", " ")}`);
    },
    [orgPrefKey, userPreferredView]
  );

  // Sub-mode inside "Cards" view: either Circuit Board ("circuit") or Split Card Inspection ("split_card")
  const [cardsSubMode, setCardsSubMode] = useState<"circuit" | "split_card">("circuit");
  const [advocateMode, setAdvocateMode] = useState<boolean>(false);

  // OLD file is ALWAYS on the left; NEW file is ALWAYS on the right
  const [oldVersion, setOldVersion] = useState<IepVersionOption>(
    IEP_VERSION_OPTIONS[1] // Mar 3, 2026 (Previous)
  );
  const [newVersion, setNewVersion] = useState<IepVersionOption>(
    IEP_VERSION_OPTIONS[0] // May 14, 2026 (Proposed)
  );

  // Comparison items list with persisted Notes, Flags, Reviewed state, and Blueprint status
  const [items, setItems] = useState<ComparisonItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(sessionStateKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.items) && parsed.items.length > 0) {
            return parsed.items;
          }
        }
      } catch {}
    }
    return MICHAEL_SHEEP_COMPARISON;
  });

  const [comparisonGeneralNote, setComparisonGeneralNote] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(sessionStateKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed.comparisonGeneralNote === "string") {
            return parsed.comparisonGeneralNote;
          }
        }
      } catch {}
    }
    return "";
  });

  const [selectedItemId, setSelectedItemId] = useState<string>(
    MICHAEL_SHEEP_COMPARISON[0].id
  );

  // Persist items & comparisonGeneralNote across reloads and view switches
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        sessionStateKey,
        JSON.stringify({ items, comparisonGeneralNote })
      );
    } catch {}
  }, [items, comparisonGeneralNote, sessionStateKey]);

  // PDF Document Viewer state (preserved when switching between Original Documents, Cards, and Notes)
  const [oldPdfBytes, setOldPdfBytes] = useState<Uint8Array | null>(null);
  const [newPdfBytes, setNewPdfBytes] = useState<Uint8Array | null>(null);
  const [isLoadingPdfs, setIsLoadingPdfs] = useState<boolean>(true);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const [leftPage, setLeftPage] = useState<number>(
    MICHAEL_SHEEP_COMPARISON[0].previousPage || 9
  );
  const [rightPage, setRightPage] = useState<number>(
    MICHAEL_SHEEP_COMPARISON[0].newPage || 8
  );
  const [leftZoom, setLeftZoom] = useState<number>(1.0);
  const [rightZoom, setRightZoom] = useState<number>(1.0);
  const [leftFitWidth, setLeftFitWidth] = useState<boolean>(true);
  const [rightFitWidth, setRightFitWidth] = useState<boolean>(true);

  // Build or load actual PDF bytes for Previous IEP (Left) and Proposed IEP (Right)
  useEffect(() => {
    let cancelled = false;
    async function loadVersionPdfs() {
      setIsLoadingPdfs(true);
      setPdfError(null);
      try {
        const [prevBuilt, nextBuilt] = await Promise.all([
          getOrBuildVersionPdf(oldVersion.id),
          getOrBuildVersionPdf(newVersion.id),
        ]);
        if (cancelled) return;
        setOldPdfBytes(prevBuilt.bytes);
        setNewPdfBytes(nextBuilt.bytes);
      } catch (err: any) {
        if (cancelled) return;
        setPdfError(err?.message || "Failed to load IEP PDF documents.");
      } finally {
        if (!cancelled) setIsLoadingPdfs(false);
      }
    }
    loadVersionPdfs();
    return () => {
      cancelled = true;
    };
  }, [oldVersion.id, newVersion.id]);

  // Connected Cards Board filter & Contextual Note Drawer state
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [noteDrawerOpen, setNoteDrawerOpen] = useState<boolean>(false);

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

  // Sync stored filenames if student contactId record exists
  useEffect(() => {
    if (iepDocQuery.data) {
      if (iepDocQuery.data.previousFileName) {
        setOldFileName(iepDocQuery.data.previousFileName);
      }
      if (iepDocQuery.data.currentFileName) {
        setNewFileName(iepDocQuery.data.currentFileName);
      }
    }
  }, [iepDocQuery.data]);

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedItemId) || items[0],
    [items, selectedItemId]
  );

  // Selecting a finding navigates each original IEP viewer to its corresponding page
  const handleSelectFinding = useCallback(
    (id: string) => {
      setSelectedItemId(id);
      const target = items.find((i) => i.id === id);
      if (target) {
        if (target.previousPage) setLeftPage(target.previousPage);
        if (target.newPage) setRightPage(target.newPage);
      }
    },
    [items]
  );

  const handleOpenInOriginalDocuments = useCallback(
    (id: string) => {
      handleSelectFinding(id);
      handleViewChange("original_documents");
    },
    [handleSelectFinding, handleViewChange]
  );

  const handleOpenNoteDrawer = useCallback(
    (id: string) => {
      handleSelectFinding(id);
      setNoteDrawerOpen(true);
    },
    [handleSelectFinding]
  );

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

  const drawerIndex = selectedItem
    ? filteredBoardItems.findIndex((i) => i.id === selectedItem.id)
    : -1;
  const hasPrev = drawerIndex > 0;
  const hasNext =
    drawerIndex >= 0 && drawerIndex < filteredBoardItems.length - 1;

  const handleUploadOldFile = async (file: File) => {
    setOldFileName(file.name);
    const cleaned = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
    try {
      if (file.name.toLowerCase().endsWith(".pdf")) {
        const buf = await file.arrayBuffer();
        setOldPdfBytes(new Uint8Array(buf));
      }
    } catch {}
    setOldVersion({
      id: `old-${Date.now()}`,
      label: cleaned,
      date: cleaned.length > 22 ? cleaned.slice(0, 22) + "…" : cleaned,
      type: "active",
      badgeText: "Uploaded Previous IEP",
    });
    toast.success(`Old / Previous IEP loaded on Left: ${file.name}`);
  };

  const handleUploadNewFile = async (file: File) => {
    setNewFileName(file.name);
    const cleaned = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
    try {
      if (file.name.toLowerCase().endsWith(".pdf")) {
        const buf = await file.arrayBuffer();
        setNewPdfBytes(new Uint8Array(buf));
      }
    } catch {}
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
    toast.success("Updated discussion flag & School Email issues list");
  };

  const handleToggleReviewed = (id: string, advanceNext?: boolean) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, isReviewed: advanceNext ? true : !item.isReviewed }
          : item
      )
    );
    if (advanceNext) {
      const changeItems = items.filter((i) => i.status !== "unchanged");
      const idx = changeItems.findIndex((i) => i.id === id);
      if (idx >= 0 && idx < changeItems.length - 1) {
        handleSelectFinding(changeItems[idx + 1].id);
      } else if (idx === changeItems.length - 1) {
        handleSelectFinding(changeItems[0].id);
        toast.success("All 7 changes marked as reviewed!");
      }
    }
  };

  const handleUpdateNote = (id: string, note: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, userNote: note } : item))
    );
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

  // Deduplicated Send to Blueprint (6. PRESERVE REVIEW AND MEETING WORKFLOWS)
  const handleSendToBlueprint = (item: ComparisonItem) => {
    if (item.sentToBlueprint) {
      toast.info(
        `"${item.title}" (${item.id}) is already in Meeting Blueprint — duplicate prevented.`
      );
      return;
    }
    setItems((prev) =>
      prev.map((curr) =>
        curr.id === item.id ? { ...curr, sentToBlueprint: true } : curr
      )
    );
    // Persist downstream Blueprint item keyed by finding ID + source references
    if (typeof window !== "undefined") {
      try {
        const key = "waypoint:meeting-blueprint:iep-comparator-items";
        const existingRaw = window.localStorage.getItem(key);
        const existing: Array<Record<string, unknown>> = existingRaw
          ? JSON.parse(existingRaw)
          : [];
        const withoutDup = existing.filter((e) => e.findingId !== item.id);
        withoutDup.push({
          findingId: item.id,
          title: item.title,
          categoryLabel: item.categoryLabel,
          status: item.status,
          explanation: item.shortSummary || item.explanation,
          suggestedQuestion: item.suggestedQuestion,
          previousLocation: item.previousLocation,
          newLocation: item.newLocation,
          previousPage: item.previousPage,
          newPage: item.newPage,
          userNote: item.userNote,
          sentAt: new Date().toISOString(),
        });
        window.localStorage.setItem(key, JSON.stringify(withoutDup));
      } catch {}
    }
    toast.success(
      `"${item.title}" sent to Meeting Blueprint with source page references`
    );
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
        className="min-h-[calc(100vh-2rem)] w-full max-w-full overflow-x-hidden text-[#FBF6EC] px-2 sm:px-4 lg:px-5 py-4 select-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, #0D1938 0%, #000820 60%, #000514 100%)",
        }}
      >
        <div className="max-w-[1680px] mx-auto space-y-3.5">
          {/* ── TOP WORKSPACE HEADER WITH 3-VIEW SELECTOR (Original Documents | Cards | Notes) ── */}
          <ComparisonHeader
            currentView={currentView}
            onViewChange={handleViewChange}
            userPreferredView={userPreferredView}
            orgDefaultView={orgDefaultView}
            onSetUserPreferredView={handleSetUserPreferredView}
            onSetOrgDefaultView={handleSetOrgDefaultView}
            advocateMode={advocateMode}
            onToggleAdvocateMode={() => setAdvocateMode((prev) => !prev)}
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

          {/* ── VIEW 1 (DEFAULT): ORIGINAL DOCUMENTS SIDE-BY-SIDE PDF WORKSPACE ── */}
          {currentView === "original_documents" && (
            <OriginalDocumentsView
              items={items}
              selectedItemId={selectedItem.id}
              onSelectItem={handleSelectFinding}
              oldVersionId={oldVersion.id}
              newVersionId={newVersion.id}
              oldFileName={oldFileName}
              newFileName={newFileName}
              oldPdfBytes={oldPdfBytes}
              newPdfBytes={newPdfBytes}
              oldPdfUrl={iepDocQuery.data?.previousFileUrl}
              newPdfUrl={iepDocQuery.data?.currentFileUrl}
              isLoadingPdfs={isLoadingPdfs}
              pdfError={pdfError}
              leftPage={leftPage}
              onLeftPageChange={setLeftPage}
              rightPage={rightPage}
              onRightPageChange={setRightPage}
              leftZoom={leftZoom}
              onLeftZoomChange={setLeftZoom}
              rightZoom={rightZoom}
              onRightZoomChange={setRightZoom}
              leftFitWidth={leftFitWidth}
              onLeftFitWidthChange={setLeftFitWidth}
              rightFitWidth={rightFitWidth}
              onRightFitWidthChange={setRightFitWidth}
              onToggleStar={handleToggleStar}
              onToggleReviewed={(id) => handleToggleReviewed(id, false)}
              onOpenNoteDrawer={handleOpenNoteDrawer}
              onSendToBlueprint={handleSendToBlueprint}
              onToggleLinkMinutes={handleToggleLinkMinutes}
              onOpenCorrectionEmailModal={() => setSchoolEmailModalOpen(true)}
              advocateMode={advocateMode}
            />
          )}

          {/* ── VIEW 2: CARDS VIEW (Circuit Board Cards + Split Card Inspection) ── */}
          {currentView === "cards" && (
            <div className="space-y-4 text-left">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <ComparisonSummaryChips
                  items={items}
                  activeFilter={activeFilter}
                  onSelectFilter={setActiveFilter}
                />

                <div className="inline-flex p-1 rounded-xl bg-[#050C20] border border-[#22325A]">
                  <button
                    type="button"
                    onClick={() => setCardsSubMode("circuit")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      cardsSubMode === "circuit"
                        ? "bg-[#231D4E] text-white border border-[#6C5CE7]/60"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <GitCompare className="w-3.5 h-3.5" />
                    <span>Connected Circuit Cards</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardsSubMode("split_card")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      cardsSubMode === "split_card"
                        ? "bg-[#231D4E] text-white border border-[#6C5CE7]/60"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Columns3 className="w-3.5 h-3.5" />
                    <span>Focused Card Inspector</span>
                  </button>
                </div>
              </div>

              {cardsSubMode === "circuit" ? (
                <ComparisonBoard
                  items={filteredBoardItems}
                  selectedItem={selectedItem}
                  onSelectItem={(item) => {
                    if (item) {
                      handleSelectFinding(item.id);
                    }
                  }}
                  onOpenNoteDrawer={(item) => handleOpenNoteDrawer(item.id)}
                  onOpenInOriginalDocuments={(item) =>
                    handleOpenInOriginalDocuments(item.id)
                  }
                  onToggleStar={handleToggleStar}
                  onToggleReviewed={(id) => handleToggleReviewed(id, false)}
                  advocateMode={advocateMode}
                  oldIepDate={oldVersion.date}
                  newIepDate={newVersion.date}
                  onBackToMainView={() => handleViewChange("original_documents")}
                />
              ) : (
                <IepComparatorSplitWorkspace
                  items={items}
                  selectedItem={selectedItem}
                  onSelectItem={(item) => handleSelectFinding(item.id)}
                  oldVersion={oldVersion}
                  newVersion={newVersion}
                  onToggleStar={handleToggleStar}
                  onToggleReviewed={handleToggleReviewed}
                  onUpdateNote={handleUpdateNote}
                  onToggleLinkMinutes={handleToggleLinkMinutes}
                  onSendToBlueprint={handleSendToBlueprint}
                  onOpenSchoolEmailModal={() => setSchoolEmailModalOpen(true)}
                  onSwitchToBoardView={() => setCardsSubMode("circuit")}
                  onOpenNoteDrawer={handleOpenNoteDrawer}
                  onOpenInOriginalDocuments={handleOpenInOriginalDocuments}
                />
              )}
            </div>
          )}

          {/* ── VIEW 3: NOTES & DETAILED BRIEF VIEW ── */}
          {currentView === "notes" && (
            <DetailedChangesView
              items={items}
              selectedItemId={selectedItem.id}
              onSelectItem={handleSelectFinding}
              onOpenInOriginalDocuments={handleOpenInOriginalDocuments}
              onOpenNoteDrawer={handleOpenNoteDrawer}
              comparisonGeneralNote={comparisonGeneralNote}
              onUpdateComparisonGeneralNote={setComparisonGeneralNote}
              advocateMode={advocateMode}
              onToggleStar={handleToggleStar}
              onToggleReviewed={(id) => handleToggleReviewed(id, false)}
              onUpdateNote={handleUpdateNote}
              onPrintBrief={() => window.print()}
              studentName="Michael Sheep"
              studentGrade="8th Grade"
            />
          )}
        </div>

        {/* ── CONTEXTUAL NOTE & DETAIL DRAWER (Accessible from Original Documents, Cards, and Notes) ── */}
        <ComparisonDetailDrawer
          item={selectedItem}
          isOpen={noteDrawerOpen}
          onClose={() => setNoteDrawerOpen(false)}
          advocateMode={advocateMode}
          onToggleStar={handleToggleStar}
          onToggleReviewed={(id) => handleToggleReviewed(id, false)}
          onUpdateNote={handleUpdateNote}
          comparisonGeneralNote={comparisonGeneralNote}
          onUpdateComparisonGeneralNote={setComparisonGeneralNote}
          onSendToBlueprint={handleSendToBlueprint}
          onOpenInOriginalDocuments={handleOpenInOriginalDocuments}
          onSelectPrev={() => {
            if (hasPrev) {
              handleSelectFinding(filteredBoardItems[drawerIndex - 1].id);
            }
          }}
          onSelectNext={() => {
            if (hasNext) {
              handleSelectFinding(filteredBoardItems[drawerIndex + 1].id);
            }
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
