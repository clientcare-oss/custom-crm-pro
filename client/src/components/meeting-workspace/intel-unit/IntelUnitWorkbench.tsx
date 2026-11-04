import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Sparkles,
  Maximize2,
  Minimize2,
  ChevronDown,
  PanelRightClose,
  PanelRightOpen,
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  BookOpen,
  Eye,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { convertPdfToPageImages, type ImportedPdfPage } from "@/lib/pdfImporter";
import type { IepIntelFinding, MeetingTarget } from "../types";
import {
  INTEL_PRIMARY_CHAPTERS,
  INTEL_MORE_CHAPTERS,
  ALL_INTEL_CHAPTERS,
  type IntelChapterId,
  type GoalAuditWorkspaceItem,
  type AccommodationWorkspaceItem,
  type ChapterReviewState,
  type VaultDocumentOption,
  type IntelPersistedState,
  type IntelDocumentScopedWork,
  type IntelReadingPosition,
  type IntelBoundingBox,
  type PriorIepComparisonRecord,
} from "./intelUnitTypes";
import {
  IntelDocumentSurface,
  type FocusedSourcePassage,
} from "./IntelDocumentSurface";
import {
  IntelPriorIepDrawer,
  type PriorIepCheckContext,
} from "./IntelPriorIepDrawer";
import { IntelGoalsChapter } from "./IntelGoalsChapter";
import { IntelAccommodationsChapter } from "./IntelAccommodationsChapter";
import {
  IntelOverviewChapter,
  IntelStructuredChapter,
} from "./IntelChaptersContextualView";

interface IntelUnitWorkbenchProps {
  studentContactId: number;
  workspaceId?: number;
  studentName: string;
  findings: IepIntelFinding[];
  targets: MeetingTarget[];
  detectedOrder: string[];
  intelUnitState?: IntelPersistedState;
  onUpdateIntelUnitState?: (
    nextState: IntelPersistedState,
    isDebounced?: boolean
  ) => void;
  onUpdateFindings: (findings: IepIntelFinding[]) => void;
  onUpdateTargets: (targets: MeetingTarget[]) => void;
  onOpenImportModal: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  legacyToolsNode: React.ReactNode;
}

function createEmptyGoalSlot(
  index: number,
  seedFromTarget?: MeetingTarget
): GoalAuditWorkspaceItem {
  return {
    id: seedFromTarget ? `goal-slot-${seedFromTarget.id}` : `goal-slot-${index}`,
    domain: seedFromTarget?.targetName || `Annual Goal #${index}`,
    originalGoal: seedFromTarget?.supportingEvidence || "",
    sourcePage: seedFromTarget?.sources?.[0] || "",
    sourceQuote: seedFromTarget?.supportingEvidence || "",
    baselineCheck: "unchecked",
    measurementCheck: "unchecked",
    conditionCheck: "unchecked",
    alignmentCheck: "unchecked",
    findingSummary: seedFromTarget?.whyWeWantIt || "",
    reasoning: seedFromTarget?.quickAdvocateSayThis || "",
    selectedSuggestionKey: null,
    sentToBlueprint: Boolean(seedFromTarget),
    suggestions: [
      {
        key: "clarify_skill",
        number: 1,
        title: "Clarify the skill",
        promptHint:
          "Define the specific observable student behavior and instructional condition.",
        rationale:
          "Replaces broad or multi-part skill descriptions with a single, observable academic or functional skill under explicit instructional conditions.",
        proposedWording: seedFromTarget?.possibleIepWording || "",
      },
      {
        key: "strengthen_measurement",
        number: 2,
        title: "Strengthen measurement",
        promptHint:
          "Anchor to a numeric baseline, mastery criterion, and data collection schedule.",
        rationale:
          "Ensures objective progress monitoring by pairing a quantitative baseline with clear accuracy/trial thresholds and an evaluation schedule.",
        proposedWording: "",
      },
      {
        key: "improve_alignment",
        number: 3,
        title: "Improve alignment with documented need",
        promptHint:
          "Connect directly to documented Present Levels and evaluation findings.",
        rationale:
          "Aligns the annual goal with the specific functional or academic deficits documented in Present Levels and recent evaluations.",
        proposedWording: "",
      },
    ],
  };
}

function createEmptyAccommodationSlot(
  index: number,
  seedFromTarget?: MeetingTarget
): AccommodationWorkspaceItem {
  return {
    id: seedFromTarget ? `acc-slot-${seedFromTarget.id}` : `acc-slot-${index}`,
    category: seedFromTarget?.targetName || `Accommodation Review #${index}`,
    currentDocumentedSupport: seedFromTarget?.supportingEvidence || "",
    sourceReference: seedFromTarget?.sources?.[0] || "",
    suggestedAccommodation: seedFromTarget?.targetName || "",
    documentedNeed: seedFromTarget?.whyWeWantIt || "",
    relatedSupportStatus: "unverified",
    proposedWording: seedFromTarget?.possibleIepWording || "",
    advocateNote: seedFromTarget?.quickAdvocateSayThis || "",
    sentToBlueprint: Boolean(seedFromTarget),
  };
}

function createEmptyChapterState(): ChapterReviewState {
  return {
    documentedProvisions: "",
    identifiedNeedsOrBaselines: "",
    reviewQuestions: "",
    sourceReference: "",
    advocateNotes: "",
    proposedWording: "",
    explicitlyReviewed: false,
  };
}

function createDefaultChapterStates(): Record<IntelChapterId, ChapterReviewState> {
  return {
    overview: createEmptyChapterState(),
    present_levels: createEmptyChapterState(),
    goals: createEmptyChapterState(),
    accommodations: createEmptyChapterState(),
    services: createEmptyChapterState(),
    placement: createEmptyChapterState(),
    evaluations: createEmptyChapterState(),
    behavior_supports: createEmptyChapterState(),
    assistive_technology: createEmptyChapterState(),
    transition: createEmptyChapterState(),
  };
}

function buildDefaultDocWork(targets: MeetingTarget[]): IntelDocumentScopedWork {
  const goalTargets = targets.filter((t) =>
    (t.iepSection || "").toLowerCase().includes("goal")
  );
  const accTargets = targets.filter((t) =>
    (t.iepSection || "").toLowerCase().includes("accommodation")
  );
  return {
    pageNumber: 1,
    zoomPercent: 100,
    goalSlots:
      goalTargets.length > 0
        ? goalTargets.map((t, i) => createEmptyGoalSlot(i + 1, t))
        : [createEmptyGoalSlot(1)],
    accommodationSlots:
      accTargets.length > 0
        ? accTargets.map((t, i) => createEmptyAccommodationSlot(i + 1, t))
        : [createEmptyAccommodationSlot(1)],
    chapterStates: createDefaultChapterStates(),
    priorComparisons: {},
  };
}

function normalizeConservative(input: string): string {
  return input
    .replace(/[\u2018\u2019\u201A\u201B`']/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F"]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s*\|\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function IntelUnitWorkbench({
  studentContactId,
  workspaceId,
  studentName,
  findings,
  targets,
  intelUnitState,
  onUpdateIntelUnitState,
  onUpdateFindings,
  onUpdateTargets,
  onOpenImportModal,
  isExpanded,
  onToggleExpand,
  legacyToolsNode,
}: IntelUnitWorkbenchProps) {
  const workbenchRef = useRef<HTMLDivElement | null>(null);
  const renderSeqRef = useRef<number>(0);
  const drawerReturnPosRef = useRef<IntelReadingPosition | null>(null);

  // Authorized student vault files query
  const { data: vaultFilesRaw, isLoading: vaultLoading } =
    trpc.clientFiles.listVault.useQuery(
      { studentId: studentContactId > 0 ? studentContactId : undefined },
      { enabled: studentContactId > 0, retry: false }
    );

  const vaultDocuments = useMemo<VaultDocumentOption[]>(() => {
    if (!vaultFilesRaw || !Array.isArray(vaultFilesRaw)) return [];
    return vaultFilesRaw.map((f: any) => ({
      id: Number(f.id),
      fileName: String(f.fileName || "Untitled Document.pdf"),
      documentType: String(f.documentType || "IEP / Case Record"),
      documentDate: f.documentDate ? String(f.documentDate) : null,
      uploadedAt: f.uploadedAt ? String(f.uploadedAt) : null,
      mimeType: f.mimeType ? String(f.mimeType) : "application/pdf",
      category: f.category,
      isCurrentPlan: f.isCurrentPlan,
      uploadOrigin: f.uploadOrigin,
      fileUrl: f.fileUrl,
    }));
  }, [vaultFilesRaw]);

  // Selected Current IEP state & per-document work map
  const [selectedDocId, setSelectedDocId] = useState<number | null>(
    intelUnitState?.selectedDocId ?? null
  );
  const [activeChapter, setActiveChapter] = useState<IntelChapterId>(
    intelUnitState?.activeChapter || "overview"
  );
  const [byDocumentMap, setByDocumentMap] = useState<
    Record<string, IntelDocumentScopedWork>
  >(() => intelUnitState?.byDocument || {});

  // Sync persisted intelUnitState when student or workspace record loads
  useEffect(() => {
    if (intelUnitState) {
      setByDocumentMap(intelUnitState.byDocument || {});
      if (intelUnitState.activeChapter) {
        setActiveChapter(intelUnitState.activeChapter);
      }
      if (intelUnitState.selectedDocId !== undefined) {
        setSelectedDocId(intelUnitState.selectedDocId);
      }
    } else {
      setByDocumentMap({});
      setSelectedDocId(null);
      setActiveChapter("overview");
    }
  }, [studentContactId, workspaceId, Boolean(intelUnitState)]);

  // Auto-select the student's current IEP PDF when vault documents arrive and no selection is active
  useEffect(() => {
    if (vaultDocuments.length === 0) return;
    if (
      selectedDocId !== null &&
      vaultDocuments.some((d) => d.id === selectedDocId)
    ) {
      return;
    }
    const persistedId = intelUnitState?.selectedDocId;
    if (persistedId && vaultDocuments.some((d) => d.id === persistedId)) {
      setSelectedDocId(persistedId);
      return;
    }
    const currentPdf =
      vaultDocuments.find(
        (d) =>
          d.isCurrentPlan === 1 &&
          d.fileName.toLowerCase().endsWith(".pdf") &&
          /current/i.test(d.fileName)
      ) ||
      vaultDocuments.find(
        (d) => d.isCurrentPlan === 1 && d.fileName.toLowerCase().endsWith(".pdf")
      ) ||
      vaultDocuments.find((d) => d.fileName.toLowerCase().endsWith(".pdf")) ||
      null;

    if (currentPdf) {
      setSelectedDocId(currentPdf.id);
    }
  }, [vaultDocuments, studentContactId]);

  const selectedDocument = useMemo(
    () => vaultDocuments.find((d) => d.id === selectedDocId) || null,
    [vaultDocuments, selectedDocId]
  );

  // Connected Vault PDF & Page-Level Index Query
  const {
    data: vaultDocPayload,
    isLoading: vaultDocLoading,
    error: vaultDocQueryError,
  } = trpc.meetingWorkspace.getVaultDocument.useQuery(
    {
      studentContactId,
      workspaceId,
      fileId: selectedDocId || 0,
    },
    {
      enabled: Boolean(studentContactId > 0 && selectedDocId && selectedDocId > 0),
      retry: false,
      staleTime: 60_000,
    }
  );

  const [vaultRenderedPages, setVaultRenderedPages] = useState<ImportedPdfPage[]>(
    []
  );
  const [isRenderingVaultPdf, setIsRenderingVaultPdf] = useState<boolean>(false);

  // Render Vault PDF pages with stale request cancellation guard
  useEffect(() => {
    const seq = ++renderSeqRef.current;
    if (
      !selectedDocId ||
      !vaultDocPayload ||
      vaultDocPayload.status !== "ready" ||
      !vaultDocPayload.pdfBase64
    ) {
      setVaultRenderedPages([]);
      setIsRenderingVaultPdf(false);
      return;
    }

    setIsRenderingVaultPdf(true);
    (async () => {
      try {
        const binaryString = window.atob(vaultDocPayload.pdfBase64!);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const pages = await convertPdfToPageImages(bytes.buffer);
        // Ignore stale completion if user switched student or document mid-render
        if (renderSeqRef.current !== seq) return;
        setVaultRenderedPages(pages);
      } catch {
        if (renderSeqRef.current !== seq) return;
        setVaultRenderedPages([]);
      } finally {
        if (renderSeqRef.current === seq) {
          setIsRenderingVaultPdf(false);
        }
      }
    })();
  }, [
    studentContactId,
    selectedDocId,
    vaultDocPayload?.fileId,
    vaultDocPayload?.status,
    vaultDocPayload?.pdfBase64,
  ]);

  // Document key for scoping drafts/reading position per document
  const activeDocKey = selectedDocId ? `doc:${selectedDocId}` : "default";

  const activeDocWork = useMemo<IntelDocumentScopedWork>(() => {
    const existing = byDocumentMap[activeDocKey];
    if (existing) {
      return {
        pageNumber: existing.pageNumber || 1,
        zoomPercent: existing.zoomPercent || 100,
        goalSlots:
          existing.goalSlots?.length > 0
            ? existing.goalSlots
            : [createEmptyGoalSlot(1)],
        accommodationSlots:
          existing.accommodationSlots?.length > 0
            ? existing.accommodationSlots
            : [createEmptyAccommodationSlot(1)],
        chapterStates: {
          ...createDefaultChapterStates(),
          ...(existing.chapterStates || {}),
        },
        priorComparisons: existing.priorComparisons || {},
      };
    }
    return buildDefaultDocWork(targets);
  }, [byDocumentMap, activeDocKey, targets]);

  const updateScopedDocWork = (
    updater: (prev: IntelDocumentScopedWork) => IntelDocumentScopedWork,
    nextSelectedDocId: number | null = selectedDocId,
    nextActiveChapter: IntelChapterId = activeChapter,
    isDebounced = true
  ) => {
    const key = nextSelectedDocId ? `doc:${nextSelectedDocId}` : "default";
    setByDocumentMap((prevMap) => {
      const currentEntry = prevMap[key] || buildDefaultDocWork(targets);
      const updatedEntry = updater(currentEntry);
      const nextMap = { ...prevMap, [key]: updatedEntry };
      if (onUpdateIntelUnitState) {
        onUpdateIntelUnitState(
          {
            selectedDocId: nextSelectedDocId,
            activeChapter: nextActiveChapter,
            byDocument: nextMap,
          },
          isDebounced
        );
      }
      return nextMap;
    });
  };

  // Temporary local PDF state (when user explicitly loads an un-saved local file)
  const [localPdfPages, setLocalPdfPages] = useState<ImportedPdfPage[]>([]);
  const [localPdfName, setLocalPdfName] = useState<string | null>(null);
  const [focusedPassage, setFocusedPassage] =
    useState<FocusedSourcePassage | null>(null);
  const [previousReadingPosition, setPreviousReadingPosition] =
    useState<IntelReadingPosition | null>(null);

  // Reset temporary local state when switching students
  useEffect(() => {
    renderSeqRef.current++;
    setLocalPdfPages([]);
    setLocalPdfName(null);
    setVaultRenderedPages([]);
    setFocusedPassage(null);
    setPreviousReadingPosition(null);
    setReviewActionNotice(null);
    setPriorCheckOpen(false);
  }, [studentContactId]);

  const [selectedGoalId, setSelectedGoalId] = useState<string>("goal-slot-1");
  const [selectedAccommodationId, setSelectedAccommodationId] =
    useState<string>("acc-slot-1");

  useEffect(() => {
    if (
      activeDocWork.goalSlots.length > 0 &&
      !activeDocWork.goalSlots.some((g) => g.id === selectedGoalId)
    ) {
      setSelectedGoalId(activeDocWork.goalSlots[0].id);
    }
    if (
      activeDocWork.accommodationSlots.length > 0 &&
      !activeDocWork.accommodationSlots.some(
        (a) => a.id === selectedAccommodationId
      )
    ) {
      setSelectedAccommodationId(activeDocWork.accommodationSlots[0].id);
    }
  }, [activeDocKey, activeDocWork.goalSlots, activeDocWork.accommodationSlots]);

  const [isReviewCollapsed, setIsReviewCollapsed] = useState<boolean>(false);
  const [mobilePane, setMobilePane] = useState<"document" | "review">("review");
  const [reviewActionNotice, setReviewActionNotice] = useState<string | null>(
    null
  );
  const [priorCheckOpen, setPriorCheckOpen] = useState<boolean>(false);
  const [priorCheckContext, setPriorCheckContext] =
    useState<PriorIepCheckContext>({
      chapterId: "overview",
      chapterLabel: "Overview",
      scopeLabel: "Selected Item / Passage Only",
    });
  const [showLegacyPrepTools, setShowLegacyPrepTools] = useState<boolean>(false);

  const activeChapterMeta =
    ALL_INTEL_CHAPTERS.find((c) => c.id === activeChapter) ||
    INTEL_PRIMARY_CHAPTERS[0];
  const activeMoreChapter = INTEL_MORE_CHAPTERS.find(
    (c) => c.id === activeChapter
  );

  const documentIndex = vaultDocPayload?.index || null;

  // Conservative source reference resolution & passage focusing
  const handleFocusPassage = (
    passage: FocusedSourcePassage,
    recordReturnPos = true
  ) => {
    if (recordReturnPos) {
      setPreviousReadingPosition({
        docId: selectedDocId,
        pageNumber: activeDocWork.pageNumber,
        zoomPercent: activeDocWork.zoomPercent,
      });
    }

    let resolvedPage = passage.pageNumber;
    let resolvedStatus = passage.verificationStatus;
    let resolvedReason = passage.verificationReason;
    let resolvedBoxes = passage.boundingBoxes || [];
    let resolvedPrintedLabel = passage.printedPageLabel ?? null;

    if (!resolvedPage && passage.pageLabel) {
      const m = passage.pageLabel.match(/\b(?:page|p\.?)\s*(\d+)\b/i);
      if (m) resolvedPage = parseInt(m[1], 10);
    }

    // Verify conservatively against the indexed document when available
    if (documentIndex && !resolvedStatus) {
      const cleanQuote = (passage.quote || "").trim();
      if (cleanQuote.length > 0) {
        const normQuote = normalizeConservative(cleanQuote);
        const candidates = resolvedPage
          ? documentIndex.pages.filter((p) => p.pdfPageNumber === resolvedPage)
          : documentIndex.pages;
        let matchedPage: (typeof documentIndex.pages)[number] | null = null;
        for (const p of candidates) {
          if (normalizeConservative(p.extractedText).includes(normQuote)) {
            matchedPage = p;
            break;
          }
        }
        if (matchedPage) {
          resolvedPage = matchedPage.pdfPageNumber;
          resolvedPrintedLabel = matchedPage.printedPageLabel;
          resolvedStatus = "verified";
        } else {
          resolvedStatus = "unverified";
          resolvedBoxes = [];
          resolvedReason = resolvedPage
            ? `Excerpt not found verbatim on PDF page ${resolvedPage}`
            : "Excerpt not found verbatim in selected document";
        }
      } else if (
        resolvedPage &&
        resolvedPage >= 1 &&
        resolvedPage <= documentIndex.pageCount
      ) {
        resolvedStatus = "page_only";
        resolvedBoxes = [];
      } else {
        resolvedStatus = "unverified";
        resolvedBoxes = [];
      }
    }

    if (resolvedPage && resolvedPage > 0) {
      updateScopedDocWork(
        (prev) => ({ ...prev, pageNumber: resolvedPage! }),
        selectedDocId,
        activeChapter,
        true
      );
    }

    setFocusedPassage({
      ...passage,
      pageNumber: resolvedPage,
      printedPageLabel: resolvedPrintedLabel,
      verificationStatus: resolvedStatus || "unverified",
      verificationReason: resolvedReason,
      boundingBoxes: resolvedBoxes,
    });
    setMobilePane("document");
  };

  const handleReturnToReadingPosition = () => {
    if (!previousReadingPosition) return;
    updateScopedDocWork(
      (prev) => ({
        ...prev,
        pageNumber: previousReadingPosition.pageNumber,
        zoomPercent: previousReadingPosition.zoomPercent,
      }),
      selectedDocId,
      activeChapter,
      true
    );
    setFocusedPassage(null);
    setPreviousReadingPosition(null);
  };

  const handleOpenPriorCheck = (
    scopeLabel: string,
    currentWording: string,
    sourceRef: string
  ) => {
    drawerReturnPosRef.current = {
      docId: selectedDocId,
      pageNumber: activeDocWork.pageNumber,
      zoomPercent: activeDocWork.zoomPercent,
    };
    setPriorCheckContext({
      chapterId: activeChapter,
      chapterLabel: activeChapterMeta.label,
      scopeLabel,
      currentWording,
      currentSourceRef: sourceRef,
    });
    setPriorCheckOpen(true);
  };

  const handleClosePriorCheck = () => {
    setPriorCheckOpen(false);
    const savedPos = drawerReturnPosRef.current;
    if (savedPos) {
      updateScopedDocWork(
        (prev) => ({
          ...prev,
          pageNumber: savedPos.pageNumber,
          zoomPercent: savedPos.zoomPercent,
        }),
        selectedDocId,
        activeChapter,
        true
      );
    }
  };

  const handleReviewIepClick = () => {
    if (!selectedDocument && !localPdfName) {
      setReviewActionNotice(
        "Select an IEP document from the toolbar first. No simulated or mock review is run when no document is connected."
      );
      return;
    }
    setReviewActionNotice(
      "Source pages and citation coordinates are now indexed for this IEP (Phase 2A). Automated AI chapter auditing, 3-path goal suggestions, and accommodation synthesis connect in Phase 2B. Use the Search & Capture bar in the document viewer to record verified source findings now."
    );
  };

  // Capture a verified passage directly from the Document Surface into saved workspace findings
  const handleCaptureFindingFromSource = (params: {
    category: string;
    section: string;
    text: string;
    excerpt: string;
    pdfPageNumber: number;
    printedPageLabel?: string | null;
    boundingBoxes: IntelBoundingBox[];
  }) => {
    const created: IepIntelFinding = {
      id: `intel-src-${Date.now()}`,
      category: params.category || activeChapterMeta.shortLabel || "Present Levels",
      section: params.section || activeChapterMeta.iepSectionName || "Present Levels / Academics",
      text: params.text,
      quote: `PDF p. ${params.pdfPageNumber}: "${params.excerpt}"`,
      status: "keep",
      isCustom: true,
      sourceRef: {
        documentId: selectedDocId || 0,
        fileName:
          localPdfName || selectedDocument?.fileName || "Selected IEP.pdf",
        contentFingerprint: documentIndex?.contentFingerprint,
        pdfPageNumber: params.pdfPageNumber,
        printedPageLabel: params.printedPageLabel ?? null,
        excerpt: params.excerpt,
        boundingBoxes: params.boundingBoxes,
        verificationStatus: "verified",
      },
    };
    onUpdateFindings([created, ...findings]);
    toast.success(
      `Captured verified finding from PDF page ${params.pdfPageNumber}`
    );
  };

  const handleSendFindingToBlueprint = (finding: IepIntelFinding) => {
    const targetId = `target-from-${finding.id}`;
    const citationLabel = finding.sourceRef?.pdfPageNumber
      ? `${finding.sourceRef.fileName} · PDF p. ${finding.sourceRef.pdfPageNumber}`
      : finding.quote || "Intel Unit Review";

    const newTarget: MeetingTarget = {
      id: targetId,
      targetName: finding.category || "IEP Discussion Item",
      iepSection: finding.section || "Accommodations / Supports",
      sectionOrder: 4,
      targetOrder: targets.length + 1,
      quickAdvocateSayThis: finding.text,
      fullAdvocateScript: finding.text,
      putItHereLocation: finding.section || "IEP Document",
      possibleIepWording: finding.text,
      whyWeWantIt: finding.text,
      supportingEvidence:
        finding.sourceRef?.excerpt ||
        finding.quote ||
        "Recorded in Intel Unit review",
      sources: [citationLabel],
      ifTeamDisagrees:
        "Request Prior Written Notice (PWN) documenting the data relied upon.",
      parentWhatWeWant: finding.text,
      parentWhyWeWantIt: finding.text,
      parentSupportingEvidence:
        finding.sourceRef?.excerpt || finding.quote || "",
      requestRaised: false,
      meetingStatus: "NOT_DISCUSSED",
      pwnNeeded: false,
      addedToIep: false,
      followUpNeeded: false,
      isCustom: true,
    };

    const exists = targets.some((t) => t.id === targetId);
    const updatedTargets = exists
      ? targets.map((t) => (t.id === targetId ? newTarget : t))
      : [...targets, newTarget];

    onUpdateTargets(updatedTargets);
    toast.success(`Sent "${newTarget.targetName}" to 2. Blueprint`);
  };

  const handleSaveGoalForDiscussion = (goal: GoalAuditWorkspaceItem) => {
    const selectedSuggestion = goal.suggestions.find(
      (s) => s.key === goal.selectedSuggestionKey
    );
    const summaryText =
      goal.findingSummary.trim() ||
      selectedSuggestion?.proposedWording.trim() ||
      goal.originalGoal.trim() ||
      `${goal.domain || "Annual Goal"} audit note`;

    const parsedPage = parseInt(goal.sourcePage.replace(/[^0-9]/g, ""), 10);
    const findingId = `fnd-${goal.id}`;
    const newFinding: IepIntelFinding = {
      id: findingId,
      category: goal.domain || "Annual Goals",
      section: "Annual Goals",
      text: summaryText,
      quote: goal.originalGoal
        ? `${goal.sourcePage ? `${goal.sourcePage}: ` : ""}${goal.originalGoal}`
        : goal.sourcePage || undefined,
      status: "keep",
      isCustom: true,
      sourceRef: selectedDocId
        ? {
            documentId: selectedDocId,
            fileName: selectedDocument?.fileName || "Current IEP.pdf",
            contentFingerprint: documentIndex?.contentFingerprint,
            pdfPageNumber: !Number.isNaN(parsedPage) ? parsedPage : null,
            excerpt: goal.originalGoal.trim() || null,
            verificationStatus: goal.originalGoal.trim()
              ? "verified"
              : !Number.isNaN(parsedPage)
              ? "page_only"
              : "unverified",
          }
        : undefined,
    };

    const exists = findings.some((f) => f.id === findingId);
    const updatedFindings = exists
      ? findings.map((f) => (f.id === findingId ? newFinding : f))
      : [newFinding, ...findings];

    onUpdateFindings(updatedFindings);
    updateScopedDocWork((prev) => ({
      ...prev,
      goalSlots: prev.goalSlots.map((g) =>
        g.id === goal.id ? { ...g, savedToDiscussion: true } : g
      ),
    }));
    toast.success("Goal audit saved for discussion");
  };

  const handleSendGoalToBlueprint = (goal: GoalAuditWorkspaceItem) => {
    const selectedSuggestion =
      goal.suggestions.find((s) => s.key === goal.selectedSuggestionKey) ||
      goal.suggestions.find((s) => s.proposedWording.trim()) ||
      goal.suggestions[0];

    const targetId = `bp-${goal.id}`;
    const newTarget: MeetingTarget = {
      id: targetId,
      targetName: goal.domain.trim() || "Annual Goal Revision",
      iepSection: "Annual Goals",
      sectionOrder: 4,
      targetOrder: targets.length + 1,
      quickAdvocateSayThis:
        goal.findingSummary.trim() ||
        goal.reasoning.trim() ||
        `We propose revising the ${goal.domain || "annual"} goal to clarify the skill and strengthen measurement.`,
      fullAdvocateScript:
        goal.reasoning.trim() ||
        goal.findingSummary.trim() ||
        "Proposed goal revision from Intel Unit Goal Auditor.",
      putItHereLocation: goal.sourcePage.trim() || "IEP Section: Annual Goals",
      possibleIepWording:
        selectedSuggestion?.proposedWording.trim() || goal.originalGoal.trim(),
      whyWeWantIt:
        goal.findingSummary.trim() ||
        selectedSuggestion?.rationale ||
        "Strengthen goal measurability and alignment with documented student needs.",
      supportingEvidence: goal.originalGoal.trim() || "Goal Auditor review",
      sources: goal.sourcePage.trim()
        ? [goal.sourcePage.trim()]
        : ["Intel Unit Goal Auditor"],
      ifTeamDisagrees:
        "Request specific baseline assessment data and document team refusal in Prior Written Notice (PWN).",
      parentWhatWeWant:
        selectedSuggestion?.proposedWording.trim() ||
        goal.findingSummary.trim() ||
        goal.domain,
      parentWhyWeWantIt:
        goal.reasoning.trim() ||
        goal.findingSummary.trim() ||
        "Clear, measurable annual goal aligned with documented needs.",
      parentSupportingEvidence: goal.originalGoal.trim(),
      requestRaised: false,
      meetingStatus: "NOT_DISCUSSED",
      pwnNeeded: false,
      addedToIep: false,
      followUpNeeded: false,
      isCustom: true,
    };

    const exists = targets.some((t) => t.id === targetId);
    const updatedTargets = exists
      ? targets.map((t) => (t.id === targetId ? newTarget : t))
      : [...targets, newTarget];

    onUpdateTargets(updatedTargets);
    updateScopedDocWork((prev) => ({
      ...prev,
      goalSlots: prev.goalSlots.map((g) =>
        g.id === goal.id ? { ...g, sentToBlueprint: true } : g
      ),
    }));
    toast.success(`Sent "${newTarget.targetName}" to 2. Blueprint`);
  };

  const handleSaveAccommodationForDiscussion = (
    item: AccommodationWorkspaceItem
  ) => {
    const summaryText =
      item.suggestedAccommodation.trim() ||
      item.proposedWording.trim() ||
      item.documentedNeed.trim() ||
      `${item.category || "Accommodation"} review note`;

    const findingId = `fnd-${item.id}`;
    const newFinding: IepIntelFinding = {
      id: findingId,
      category: item.category || "Accommodations",
      section: "Accommodations / Supports",
      text: summaryText,
      quote: item.currentDocumentedSupport
        ? `${item.sourceReference ? `${item.sourceReference}: ` : ""}${item.currentDocumentedSupport}`
        : item.sourceReference || undefined,
      status: "keep",
      isCustom: true,
    };

    const exists = findings.some((f) => f.id === findingId);
    const updatedFindings = exists
      ? findings.map((f) => (f.id === findingId ? newFinding : f))
      : [newFinding, ...findings];

    onUpdateFindings(updatedFindings);
    updateScopedDocWork((prev) => ({
      ...prev,
      accommodationSlots: prev.accommodationSlots.map((a) =>
        a.id === item.id ? { ...a, savedToDiscussion: true } : a
      ),
    }));
    toast.success("Accommodation saved for discussion");
  };

  const handleSendAccommodationToBlueprint = (
    item: AccommodationWorkspaceItem
  ) => {
    const targetId = `bp-${item.id}`;
    const newTarget: MeetingTarget = {
      id: targetId,
      targetName:
        item.suggestedAccommodation.trim() ||
        item.category.trim() ||
        "Classroom Accommodation",
      iepSection: "Accommodations / Supports",
      sectionOrder: 5,
      targetOrder: targets.length + 1,
      quickAdvocateSayThis:
        item.documentedNeed.trim() ||
        `We request adding "${item.suggestedAccommodation || item.category}" across instructional and testing settings.`,
      fullAdvocateScript:
        item.documentedNeed.trim() ||
        item.proposedWording.trim() ||
        "Proposed accommodation from Intel Unit review.",
      putItHereLocation:
        item.sourceReference.trim() || "IEP Section: Accommodations / Supports",
      possibleIepWording:
        item.proposedWording.trim() || item.suggestedAccommodation.trim(),
      whyWeWantIt:
        item.documentedNeed.trim() ||
        "Addresses documented student need in Present Levels.",
      supportingEvidence:
        item.currentDocumentedSupport.trim() ||
        `Related support status: ${item.relatedSupportStatus}`,
      sources: item.sourceReference.trim()
        ? [item.sourceReference.trim()]
        : ["Intel Unit Accommodations Review"],
      ifTeamDisagrees:
        "Ask how the documented need will be accommodated across classroom settings and request PWN if declined.",
      parentWhatWeWant:
        item.proposedWording.trim() ||
        item.suggestedAccommodation.trim() ||
        item.category,
      parentWhyWeWantIt: item.documentedNeed.trim(),
      parentSupportingEvidence: item.currentDocumentedSupport.trim(),
      requestRaised: false,
      meetingStatus: "NOT_DISCUSSED",
      pwnNeeded: false,
      addedToIep: false,
      followUpNeeded: false,
      isCustom: true,
    };

    const exists = targets.some((t) => t.id === targetId);
    const updatedTargets = exists
      ? targets.map((t) => (t.id === targetId ? newTarget : t))
      : [...targets, newTarget];

    onUpdateTargets(updatedTargets);
    updateScopedDocWork((prev) => ({
      ...prev,
      accommodationSlots: prev.accommodationSlots.map((a) =>
        a.id === item.id ? { ...a, sentToBlueprint: true } : a
      ),
    }));
    toast.success(`Sent "${newTarget.targetName}" to 2. Blueprint`);
  };

  const handleSaveStructuredChapter = (chapterId: IntelChapterId) => {
    const meta =
      ALL_INTEL_CHAPTERS.find((c) => c.id === chapterId) ||
      INTEL_PRIMARY_CHAPTERS[1];
    const st =
      activeDocWork.chapterStates[chapterId] || createEmptyChapterState();
    const summaryText =
      st.identifiedNeedsOrBaselines.trim() ||
      st.proposedWording.trim() ||
      st.reviewQuestions.trim() ||
      st.documentedProvisions.trim() ||
      `${meta.label} review note`;

    const findingId = `fnd-chap-${chapterId}-${Date.now()}`;
    const newFinding: IepIntelFinding = {
      id: findingId,
      category: meta.shortLabel,
      section: meta.iepSectionName,
      text: summaryText,
      quote: st.documentedProvisions
        ? `${st.sourceReference ? `${st.sourceReference}: ` : ""}${st.documentedProvisions}`
        : st.sourceReference || undefined,
      status: "keep",
      isCustom: true,
    };

    onUpdateFindings([newFinding, ...findings]);
    toast.success(`Saved ${meta.shortLabel} finding for discussion`);
  };

  const handleSendStructuredChapterToBlueprint = (chapterId: IntelChapterId) => {
    const meta =
      ALL_INTEL_CHAPTERS.find((c) => c.id === chapterId) ||
      INTEL_PRIMARY_CHAPTERS[1];
    const st =
      activeDocWork.chapterStates[chapterId] || createEmptyChapterState();
    const targetId = `bp-chap-${chapterId}`;

    const newTarget: MeetingTarget = {
      id: targetId,
      targetName: `${meta.shortLabel} Provision`,
      iepSection: meta.iepSectionName,
      sectionOrder: 6,
      targetOrder: targets.length + 1,
      quickAdvocateSayThis:
        st.reviewQuestions.trim() ||
        st.identifiedNeedsOrBaselines.trim() ||
        `We want to review and update ${meta.label} based on documented student needs.`,
      fullAdvocateScript:
        st.identifiedNeedsOrBaselines.trim() ||
        st.proposedWording.trim() ||
        `${meta.label} discussion item.`,
      putItHereLocation: st.sourceReference.trim() || meta.iepSectionName,
      possibleIepWording:
        st.proposedWording.trim() || st.identifiedNeedsOrBaselines.trim(),
      whyWeWantIt:
        st.identifiedNeedsOrBaselines.trim() ||
        `Ensure ${meta.label} reflects current student data.`,
      supportingEvidence: st.documentedProvisions.trim(),
      sources: st.sourceReference.trim()
        ? [st.sourceReference.trim()]
        : [`Intel Unit · ${meta.shortLabel}`],
      ifTeamDisagrees:
        "Document team rationale and request Prior Written Notice (PWN).",
      parentWhatWeWant:
        st.proposedWording.trim() || st.identifiedNeedsOrBaselines.trim(),
      parentWhyWeWantIt: st.identifiedNeedsOrBaselines.trim(),
      parentSupportingEvidence: st.documentedProvisions.trim(),
      requestRaised: false,
      meetingStatus: "NOT_DISCUSSED",
      pwnNeeded: false,
      addedToIep: false,
      followUpNeeded: false,
      isCustom: true,
    };

    const exists = targets.some((t) => t.id === targetId);
    const updatedTargets = exists
      ? targets.map((t) => (t.id === targetId ? newTarget : t))
      : [...targets, newTarget];

    onUpdateTargets(updatedTargets);
    toast.success(`Sent ${meta.shortLabel} item to 2. Blueprint`);
  };

  const vaultDocStatus:
    | "idle"
    | "loading"
    | "ready"
    | "unavailable"
    | "unsupported"
    | "error" = !selectedDocId
    ? "idle"
    : vaultDocLoading
    ? "loading"
    : vaultDocQueryError
    ? "error"
    : vaultDocPayload?.status || "idle";

  return (
    <div ref={workbenchRef} className="space-y-4">
      <div
        className={cn(
          "rounded-2xl bg-[#000820] border-2 border-[#3A2C18] shadow-[0_20px_60px_rgba(0,0,0,0.92),0_0_40px_rgba(36,78,160,0.12),inset_0_1px_1px_rgba(255,255,255,0.08)] overflow-hidden transition-all relative",
          isExpanded && "ring-2 ring-[#C5A059]/60"
        )}
      >
        <div className="pointer-events-none absolute inset-[5px] rounded-[13px] border border-dashed border-[#C5A059]/15 z-20" />

        {/* ── 1. WORKBENCH COMPACT TOOLBAR ── */}
        <div className="relative z-10 px-4 py-3 bg-gradient-to-r from-[#020A22] via-[#061538] to-[#020A22] border-b border-[#3A2C18] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <div className="flex items-center gap-2">
              <label
                htmlFor="intel-current-iep-selector"
                className="text-[11px] font-serif font-bold uppercase tracking-wider text-[#FFE394] shrink-0"
              >
                Current IEP:
              </label>
              <select
                id="intel-current-iep-selector"
                data-testid="intel-current-iep-selector"
                value={selectedDocId ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  const nextId = val ? Number(val) : null;
                  setSelectedDocId(nextId);
                  setLocalPdfPages([]);
                  setLocalPdfName(null);
                  setFocusedPassage(null);
                  setPreviousReadingPosition(null);
                  setReviewActionNotice(null);
                  if (onUpdateIntelUnitState) {
                    onUpdateIntelUnitState(
                      {
                        selectedDocId: nextId,
                        activeChapter,
                        byDocument: byDocumentMap,
                      },
                      false
                    );
                  }
                }}
                className="h-8 rounded-lg bg-[#000820] border border-[#3A2C18] hover:border-[#C5A059]/70 px-3 text-xs text-[#FFF4D4] font-medium focus:outline-none focus:border-[#FFE394] max-w-[260px] sm:max-w-[350px] truncate cursor-pointer"
              >
                <option value="">
                  {vaultLoading
                    ? "Checking Student Vault..."
                    : vaultDocuments.length > 0
                    ? `Select an IEP (${vaultDocuments.length} in Vault)...`
                    : "Select an IEP (No documents in Student Vault)"}
                </option>
                {vaultDocuments.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.fileName} — {doc.documentType}
                    {doc.documentDate ? ` · IEP Date: ${doc.documentDate}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Honest Document Reading & Extraction Status Pill */}
            <div
              data-testid="intel-toolbar-status-pill"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#01071A] border border-[#293F66] text-[11px]"
              aria-live="polite"
            >
              {localPdfName ? (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="text-amber-200 font-medium">
                    Temp Local PDF ({localPdfPages.length} pages · Not in Vault)
                  </span>
                </>
              ) : vaultDocStatus === "loading" || isRenderingVaultPdf ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#DFBE77] shrink-0" />
                  <span className="text-[#FFE394] font-medium">
                    Loading & Indexing Vault IEP...
                  </span>
                </>
              ) : vaultDocStatus === "ready" && documentIndex ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span className="text-emerald-200 font-medium">
                    {documentIndex.overallStatus === "complete"
                      ? `Vault PDF Indexed (${documentIndex.readablePageCount}/${documentIndex.pageCount} pages)`
                      : `Partial Index (${documentIndex.readablePageCount}/${documentIndex.pageCount} readable)`}
                    {documentIndex.iepDocumentDate
                      ? ` · IEP Date: ${documentIndex.iepDocumentDate}`
                      : ""}
                  </span>
                </>
              ) : vaultDocStatus === "unsupported" ? (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="text-amber-200 font-medium">
                    Unsupported Format (PDF Required)
                  </span>
                </>
              ) : vaultDocStatus === "unavailable" || vaultDocStatus === "error" ? (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                  <span className="text-rose-200 font-medium">
                    Vault File Binary Unavailable
                  </span>
                </>
              ) : (
                <>
                  <Clock className="h-3.5 w-3.5 text-[#8EA6C9] shrink-0" />
                  <span className="text-[#B0C7E8]">
                    Select a Student IEP from Vault
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right: Review IEP Action + Legacy Tools Trigger + Expand / Restore Action */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              size="sm"
              onClick={handleReviewIepClick}
              className="h-8 px-3.5 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-105 cursor-pointer gap-1.5"
              title="Check AI IEP review readiness"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#07162B]" />
              <span>Review IEP</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowLegacyPrepTools((prev) => !prev)}
              className={cn(
                "h-8 px-3 text-xs border cursor-pointer gap-1.5 transition-colors",
                showLegacyPrepTools
                  ? "bg-[#0B2147] border-[#C5A059] text-[#FFE394]"
                  : "bg-[#000820] border-[#3A2C18] text-[#D8C7A5] hover:bg-[#061531] hover:text-[#FFF4D4] hover:border-[#C5A059]/60"
              )}
            >
              <Wrench className="h-3.5 w-3.5 text-[#DFBE77]" />
              <span>Parent Prep &amp; Existing Tools</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onToggleExpand();
                if (!isExpanded && workbenchRef.current) {
                  setTimeout(() => {
                    workbenchRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }, 60);
                }
              }}
              className="h-8 px-3 text-xs border-[#3A2C18] bg-[#000820] text-[#D8C7A5] hover:bg-[#061531] hover:text-[#FFF4D4] hover:border-[#C5A059]/60 cursor-pointer gap-1.5"
            >
              {isExpanded ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5 text-[#DFBE77]" />
                  <span>Restore</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5 text-[#DFBE77]" />
                  <span>Expand Workspace</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {reviewActionNotice && (
          <div className="relative z-10 px-4 py-2.5 bg-[#071838] border-b border-[#C5A059]/50 flex items-center justify-between gap-3 text-xs text-[#FFF4D4]">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-[#DFBE77] shrink-0" />
              <span>{reviewActionNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setReviewActionNotice(null)}
              className="text-[#C6B697] hover:text-white p-1 cursor-pointer shrink-0"
              aria-label="Close notice"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ── 2. INTERNAL CHAPTER NAVIGATION BAR ── */}
        <div className="relative z-10 px-4 py-2 bg-[#01071A] border-b border-[#3A2C18]/90 flex flex-wrap items-center justify-between gap-2">
          <nav
            aria-label="Intel Unit chapters"
            className="flex flex-wrap items-center gap-1.5"
          >
            {INTEL_PRIMARY_CHAPTERS.map((chap) => {
              const isActive = activeChapter === chap.id;
              return (
                <button
                  key={chap.id}
                  type="button"
                  onClick={() => {
                    setActiveChapter(chap.id);
                    setMobilePane("review");
                    if (onUpdateIntelUnitState) {
                      onUpdateIntelUnitState(
                        {
                          selectedDocId,
                          activeChapter: chap.id,
                          byDocument: byDocumentMap,
                        },
                        true
                      );
                    }
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-serif font-bold tracking-wide transition-all cursor-pointer border",
                    isActive
                      ? "bg-gradient-to-b from-[#F2D794] via-[#D8AD56] to-[#AD7E28] text-[#1A1202] border-[#FFE8A3] shadow-[0_2px_10px_rgba(0,0,0,0.65)]"
                      : "bg-[#000820] text-[#D8C7A5] border-[#223556] hover:bg-[#071838] hover:text-[#FFF4D4] hover:border-[#3E629C]"
                  )}
                >
                  {chap.label}
                </button>
              );
            })}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-serif font-bold tracking-wide transition-all cursor-pointer border inline-flex items-center gap-1.5",
                    activeMoreChapter
                      ? "bg-gradient-to-b from-[#F2D794] via-[#D8AD56] to-[#AD7E28] text-[#1A1202] border-[#FFE8A3] shadow-[0_2px_10px_rgba(0,0,0,0.65)]"
                      : "bg-[#000820] text-[#D8C7A5] border-[#223556] hover:bg-[#071838] hover:text-[#FFF4D4] hover:border-[#3E629C]"
                  )}
                >
                  <span>
                    {activeMoreChapter
                      ? `More: ${activeMoreChapter.shortLabel}`
                      : "More"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-64 bg-[#020A1E] border border-[#C5A059]/60 text-[#FFF4D4] shadow-2xl p-1"
              >
                {INTEL_MORE_CHAPTERS.map((moreChap) => {
                  const isSelected = activeChapter === moreChap.id;
                  return (
                    <DropdownMenuItem
                      key={moreChap.id}
                      onClick={() => {
                        setActiveChapter(moreChap.id);
                        setMobilePane("review");
                      }}
                      className={cn(
                        "cursor-pointer rounded-md px-3 py-2 text-xs flex flex-col items-start gap-0.5 focus:bg-[#0A1E42] focus:text-[#FFE394]",
                        isSelected && "bg-[#0A1E42] text-[#FFE394] font-bold"
                      )}
                    >
                      <span className="font-serif font-bold">
                        {moreChap.label}
                      </span>
                      <span className="text-[10.5px] text-[#8EA6C9] line-clamp-1">
                        {moreChap.description}
                      </span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          <div className="flex items-center gap-2">
            <div className="flex lg:hidden items-center rounded-lg bg-[#000820] border border-[#3A2C18] p-0.5">
              <button
                type="button"
                onClick={() => setMobilePane("document")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer flex items-center gap-1",
                  mobilePane === "document"
                    ? "bg-[#102752] text-[#FFE394]"
                    : "text-[#A69371]"
                )}
              >
                <Eye className="h-3 w-3" />
                <span>Document</span>
              </button>
              <button
                type="button"
                onClick={() => setMobilePane("review")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer flex items-center gap-1",
                  mobilePane === "review"
                    ? "bg-[#102752] text-[#FFE394]"
                    : "text-[#A69371]"
                )}
              >
                <BookOpen className="h-3 w-3" />
                <span>Review ({activeChapterMeta.shortLabel})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsReviewCollapsed((prev) => !prev)}
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#000820] border border-[#2A3F66] hover:border-[#C5A059]/70 text-[11px] text-[#D8C7A5] hover:text-[#FFF4D4] cursor-pointer transition-colors"
            >
              {isReviewCollapsed ? (
                <>
                  <PanelRightOpen className="h-3.5 w-3.5 text-[#DFBE77]" />
                  <span>Open Review Panel</span>
                </>
              ) : (
                <>
                  <PanelRightClose className="h-3.5 w-3.5 text-[#DFBE77]" />
                  <span>Collapse Review</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── 3. COHESIVE OPEN-FOLIO EXAMINATION SURFACE ── */}
        <div
          className={cn(
            "relative z-10 grid grid-cols-1 transition-all",
            isReviewCollapsed ? "lg:grid-cols-1" : "lg:grid-cols-12",
            isExpanded ? "min-h-[760px]" : "min-h-[600px]"
          )}
        >
          {/* LEFT LEAF: SOURCE-DOCUMENT SURFACE */}
          <div
            className={cn(
              "flex flex-col",
              isReviewCollapsed ? "lg:col-span-1" : "lg:col-span-6 xl:col-span-6",
              mobilePane === "review" ? "hidden lg:flex" : "flex"
            )}
          >
            <IntelDocumentSurface
              studentName={studentName}
              selectedDocument={selectedDocument}
              vaultDocStatus={vaultDocStatus}
              vaultDocMessage={
                vaultDocQueryError?.message || vaultDocPayload?.message || null
              }
              documentIndex={documentIndex}
              vaultRenderedPages={vaultRenderedPages}
              isRenderingVaultPdf={isRenderingVaultPdf}
              currentPage={activeDocWork.pageNumber}
              totalPages={
                documentIndex?.pageCount ||
                vaultRenderedPages.length ||
                localPdfPages.length
              }
              zoomPercent={activeDocWork.zoomPercent}
              onPageChange={(page) =>
                updateScopedDocWork((prev) => ({ ...prev, pageNumber: page }))
              }
              onZoomChange={(zoom) =>
                updateScopedDocWork((prev) => ({ ...prev, zoomPercent: zoom }))
              }
              focusedPassage={focusedPassage}
              onFocusPassage={handleFocusPassage}
              onClearFocusedPassage={() => setFocusedPassage(null)}
              previousReadingPosition={previousReadingPosition}
              onReturnToReadingPosition={handleReturnToReadingPosition}
              localPdfPages={localPdfPages}
              localPdfName={localPdfName}
              onLoadLocalPdf={(name, pages) => {
                setLocalPdfName(name);
                setLocalPdfPages(pages);
              }}
              onClearLocalPdf={() => {
                setLocalPdfName(null);
                setLocalPdfPages([]);
              }}
              onCaptureFindingFromSource={handleCaptureFindingFromSource}
              activeChapterCategory={activeChapterMeta.shortLabel}
              activeChapterSection={activeChapterMeta.iepSectionName}
              isReviewCollapsed={isReviewCollapsed}
              onToggleReviewCollapse={() =>
                setIsReviewCollapsed((prev) => !prev)
              }
            />
          </div>

          {/* RIGHT LEAF: CONTEXTUAL REVIEW AREA */}
          {!isReviewCollapsed && (
            <div
              className={cn(
                "lg:col-span-6 xl:col-span-6 flex flex-col bg-gradient-to-b from-[#020B20] via-[#01081A] to-[#000614] relative",
                mobilePane === "document" ? "hidden lg:flex" : "flex"
              )}
            >
              <div className="hidden lg:block pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/65 to-transparent" />

              <div className="p-4 sm:p-5 space-y-4 flex-1">
                <IntelPriorIepDrawer
                  isOpen={priorCheckOpen}
                  onClose={handleClosePriorCheck}
                  studentContactId={studentContactId}
                  workspaceId={workspaceId}
                  context={priorCheckContext}
                  vaultDocuments={vaultDocuments}
                  selectedCurrentDoc={selectedDocument}
                  currentDocIepDate={documentIndex?.iepDocumentDate}
                  savedComparison={
                    activeDocWork.priorComparisons?.[
                      priorCheckContext.scopeLabel || priorCheckContext.chapterId
                    ]
                  }
                  onSaveComparison={(scopeKey, record: PriorIepComparisonRecord) =>
                    updateScopedDocWork((prev) => ({
                      ...prev,
                      priorComparisons: {
                        ...(prev.priorComparisons || {}),
                        [scopeKey]: record,
                      },
                    }))
                  }
                  onFocusPassage={handleFocusPassage}
                />

                {activeChapter === "overview" && (
                  <IntelOverviewChapter
                    studentName={studentName}
                    selectedDocument={selectedDocument}
                    localPdfName={localPdfName}
                    findings={findings}
                    targets={targets}
                    chapterStates={activeDocWork.chapterStates}
                    onSelectChapter={(chap) => setActiveChapter(chap)}
                    onUpdateFindings={onUpdateFindings}
                    onSendFindingToBlueprint={handleSendFindingToBlueprint}
                    onFocusPassage={handleFocusPassage}
                    onOpenImportModal={onOpenImportModal}
                    onOpenLegacyTools={() => setShowLegacyPrepTools(true)}
                  />
                )}

                {activeChapter === "goals" && (
                  <IntelGoalsChapter
                    studentName={studentName}
                    goals={activeDocWork.goalSlots}
                    selectedGoalId={selectedGoalId}
                    onSelectGoal={setSelectedGoalId}
                    onUpdateGoal={(updated) =>
                      updateScopedDocWork((prev) => ({
                        ...prev,
                        goalSlots: prev.goalSlots.map((g) =>
                          g.id === updated.id ? updated : g
                        ),
                      }))
                    }
                    onAddGoalSlot={() => {
                      const nextIndex = activeDocWork.goalSlots.length + 1;
                      const created = {
                        ...createEmptyGoalSlot(nextIndex),
                        id: `goal-slot-${Date.now()}`,
                      };
                      updateScopedDocWork((prev) => ({
                        ...prev,
                        goalSlots: [...prev.goalSlots, created],
                      }));
                      setSelectedGoalId(created.id);
                    }}
                    onSaveGoalForDiscussion={handleSaveGoalForDiscussion}
                    onSendGoalToBlueprint={handleSendGoalToBlueprint}
                    onOpenPriorCheck={handleOpenPriorCheck}
                    onFocusPassage={handleFocusPassage}
                  />
                )}

                {activeChapter === "accommodations" && (
                  <IntelAccommodationsChapter
                    studentName={studentName}
                    items={activeDocWork.accommodationSlots}
                    selectedItemId={selectedAccommodationId}
                    onSelectItem={setSelectedAccommodationId}
                    onUpdateItem={(updated) =>
                      updateScopedDocWork((prev) => ({
                        ...prev,
                        accommodationSlots: prev.accommodationSlots.map((a) =>
                          a.id === updated.id ? updated : a
                        ),
                      }))
                    }
                    onAddAccommodationSlot={() => {
                      const nextIndex =
                        activeDocWork.accommodationSlots.length + 1;
                      const created = {
                        ...createEmptyAccommodationSlot(nextIndex),
                        id: `acc-slot-${Date.now()}`,
                      };
                      updateScopedDocWork((prev) => ({
                        ...prev,
                        accommodationSlots: [
                          ...prev.accommodationSlots,
                          created,
                        ],
                      }));
                      setSelectedAccommodationId(created.id);
                    }}
                    onSaveForDiscussion={handleSaveAccommodationForDiscussion}
                    onSendToBlueprint={handleSendAccommodationToBlueprint}
                    onOpenPriorCheck={handleOpenPriorCheck}
                    onFocusPassage={handleFocusPassage}
                  />
                )}

                {activeChapter !== "overview" &&
                  activeChapter !== "goals" &&
                  activeChapter !== "accommodations" && (
                    <IntelStructuredChapter
                      chapterId={activeChapter}
                      studentName={studentName}
                      state={
                        activeDocWork.chapterStates[activeChapter] ||
                        createEmptyChapterState()
                      }
                      onChangeState={(updated) =>
                        updateScopedDocWork((prev) => ({
                          ...prev,
                          chapterStates: {
                            ...prev.chapterStates,
                            [activeChapter]: updated,
                          },
                        }))
                      }
                      chapterFindings={findings.filter(
                        (f) =>
                          f.status !== "dismiss" &&
                          (f.category
                            .toLowerCase()
                            .includes(
                              activeChapterMeta.shortLabel.toLowerCase()
                            ) ||
                            f.section
                              .toLowerCase()
                              .includes(
                                activeChapterMeta.shortLabel.toLowerCase()
                              ))
                      )}
                      onSaveChapterFinding={() =>
                        handleSaveStructuredChapter(activeChapter)
                      }
                      onSendChapterToBlueprint={() =>
                        handleSendStructuredChapterToBlueprint(activeChapter)
                      }
                      onOpenPriorCheck={handleOpenPriorCheck}
                      onFocusPassage={handleFocusPassage}
                    />
                  )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── SECONDARY ENTRY: PARENT PREPARATION & EXISTING TOOLS ── */}
      <div className="rounded-xl bg-[#020A1E]/90 border border-[#3A2C18] overflow-hidden shadow-lg">
        <button
          type="button"
          onClick={() => setShowLegacyPrepTools((prev) => !prev)}
          aria-expanded={showLegacyPrepTools}
          className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[#061531]/60 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-[#071836] border border-[#3A2C18] flex items-center justify-center">
              <Wrench className="h-3.5 w-3.5 text-[#DFBE77]" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-serif font-bold text-[#FFF4D4]">
                Parent Preparation &amp; Existing Tools
              </span>
              <p className="text-[11px] text-[#A69371]">
                Access Parent Intel, Parent Concern Statement (PCS) editor, Advocate Ready import, and existing preparation pipeline steps.
              </p>
            </div>
          </div>

          <Badge className="bg-[#091D3E] text-[#FFE394] border border-[#3A2C18] text-[10.5px] shrink-0">
            {showLegacyPrepTools ? "Hide Tools ▲" : "Open Tools ▼"}
          </Badge>
        </button>

        {showLegacyPrepTools && (
          <div className="p-4 sm:p-5 border-t border-[#3A2C18]/80 bg-[#010716]/90 space-y-6">
            {legacyToolsNode}
          </div>
        )}
      </div>
    </div>
  );
}
