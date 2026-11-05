import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  FolderOpen,
  BookOpen,
  GitCompare,
  ClipboardCheck,
  Bookmark,
  Eye,
  Compass,
  Wrench,
  ChevronDown,
  Maximize2,
  Minimize2,
  Upload,
  History,
  Users,
  RotateCcw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { convertPdfToPageImages, type ImportedPdfPage } from "@/lib/pdfImporter";
import type {
  IepIntelFinding,
  MeetingTarget,
  MeetingWorkspaceStatus,
} from "../types";
import {
  ALL_INTEL_CHAPTERS,
  INTEL_PRIMARY_CHAPTERS,
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
  type RecordsReviewViewMode,
  type RecordReviewGroup,
  type FindingPriority,
  type SavedMeetingQuestionItem,
  type AiReviewProcessingStage,
  type AiReviewRunSnapshot,
  type AiReviewRecordSummaryItem,
  resolveClientRecordGroup,
  formatShortFileName,
} from "./intelUnitTypes";
import {
  IntelDocumentSurface,
  type FocusedSourcePassage,
} from "./IntelDocumentSurface";
import {
  IntelPriorIepDrawer,
  type PriorIepCheckContext,
} from "./IntelPriorIepDrawer";
import { RecordsReviewDrawer } from "./RecordsReviewDrawer";
import { RecordsCompareView } from "./RecordsCompareView";
import { RecordsPrepareView } from "./RecordsPrepareView";
import { FirstMateReviewDrawer } from "./FirstMateReviewDrawer";
import { GuidedIepReviewPanel } from "./GuidedIepReviewPanel";
import {
  AiReviewLaunchBar,
  type AiReviewErrorInfo,
} from "./AiReviewLaunchBar";
import {
  buildGuidedReviewSequence,
  findBoundingBoxesOnIndexedPage,
} from "./guidedReviewHelpers";
import {
  resolveConnectedTargetForFinding,
  upsertConnectedTargetFromFinding,
  syncFindingUpdateToTargets,
  reconcileSourceMaterialChanges,
} from "./connectedFindingWorkflow";
import { DeleteFindingConfirmModal } from "./DeleteFindingConfirmModal";

interface IntelUnitWorkbenchProps {
  studentContactId: number;
  workspaceId?: number;
  studentName: string;
  findings: IepIntelFinding[];
  targets: MeetingTarget[];
  workspaceStatus?: MeetingWorkspaceStatus;
  detectedOrder: string[];
  intelUnitState?: IntelPersistedState;
  onUpdateIntelUnitState?: (
    nextState: IntelPersistedState,
    isDebounced?: boolean
  ) => void;
  onUpdateFindings: (findings: IepIntelFinding[]) => void;
  onUpdateTargets: (targets: MeetingTarget[]) => void;
  onNavigateToStage?: (
    stage: "blueprint" | "meeting_space",
    targetId?: string
  ) => void;
  externalOpenCitationRequest?: {
    target: MeetingTarget;
    seq: number;
  } | null;
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
    suggestions: [],
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
  workspaceStatus,
  intelUnitState,
  onUpdateIntelUnitState,
  onUpdateFindings,
  onUpdateTargets,
  onNavigateToStage,
  externalOpenCitationRequest,
  onOpenImportModal,
  isExpanded,
  onToggleExpand,
  legacyToolsNode,
}: IntelUnitWorkbenchProps) {
  const workbenchRef = useRef<HTMLDivElement | null>(null);
  const localFileInputRef = useRef<HTMLInputElement | null>(null);
  const renderSeqRef = useRef<number>(0);
  const hasSeededEvalSelectionRef = useRef<number | null>(null);
  const lastHandledExternalCitationSeqRef = useRef<number>(0);
  const [findingPendingDelete, setFindingPendingDelete] =
    useState<IepIntelFinding | null>(null);
  const trpcUtils = trpc.useUtils();

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

  // Review Desk View State (Read / Compare / Prepare)
  const [reviewView, setReviewView] = useState<RecordsReviewViewMode>(
    intelUnitState?.reviewViewMode || "read"
  );
  const [recordsDrawerOpen, setRecordsDrawerOpen] = useState<boolean>(false);
  const [firstMateOpen, setFirstMateOpen] = useState<boolean>(
    intelUnitState?.firstMateOpen ?? false
  );
  const [isFocusReading, setIsFocusReading] = useState<boolean>(false);
  const [focusReturnContext, setFocusReturnContext] = useState<{
    view: RecordsReviewViewMode;
    firstMateOpen: boolean;
    pageNumber: number;
    zoomPercent: number;
  } | null>(null);
  const [returnToCompareBanner, setReturnToCompareBanner] =
    useState<boolean>(false);

  // Selected document & per-document work map
  const [selectedDocId, setSelectedDocId] = useState<number | null>(
    intelUnitState?.selectedDocId ?? null
  );
  const [activeChapter, setActiveChapter] = useState<IntelChapterId>(
    intelUnitState?.activeChapter || "overview"
  );
  const [byDocumentMap, setByDocumentMap] = useState<
    Record<string, IntelDocumentScopedWork>
  >(() => intelUnitState?.byDocument || {});
  const [savedQuestions, setSavedQuestions] = useState<
    SavedMeetingQuestionItem[]
  >(() => intelUnitState?.savedMeetingQuestions || []);
  const [comparedEvaluationIds, setComparedEvaluationIds] = useState<number[]>(
    () => intelUnitState?.selectedEvalIdsForCompare || []
  );
  const [findingQuestionsMap, setFindingQuestionsMap] = useState<
    Record<string, string>
  >(() => intelUnitState?.findingQuestionsMap || {});
  const [findingPrioritiesMap, setFindingPrioritiesMap] = useState<
    Record<string, FindingPriority>
  >(() => intelUnitState?.findingPrioritiesMap || {});
  const [aiDraftFindingIds, setAiDraftFindingIds] = useState<string[]>(
    () => intelUnitState?.aiDraftFindingIds || []
  );
  const [recordGroupOverrides, setRecordGroupOverrides] = useState<
    Record<number, RecordReviewGroup>
  >(() => intelUnitState?.recordGroupOverrides || {});
  const [activeGuidedFindingId, setActiveGuidedFindingId] = useState<
    string | null
  >(() => intelUnitState?.activeGuidedFindingId ?? null);
  const [guidedDecisionsMap, setGuidedDecisionsMap] = useState<
    Record<string, "pending" | "saved" | "reviewed" | "dismissed">
  >({});
  const [scrollTriggerSeq, setScrollTriggerSeq] = useState<number>(0);
  const [iepReturnState, setIepReturnState] = useState<{
    docId: number | null;
    pageNumber: number;
    zoomPercent: number;
    focusedPassage: FocusedSourcePassage | null;
  } | null>(null);

  // AI Review Launch / Execution State
  const [lastAiReviewSnapshot, setLastAiReviewSnapshot] =
    useState<AiReviewRunSnapshot | null>(
      () => intelUnitState?.lastAiReviewSnapshot ?? null
    );
  const [isRunningAiReview, setIsRunningAiReview] = useState<boolean>(false);
  const [activeAiReviewStage, setActiveAiReviewStage] =
    useState<AiReviewProcessingStage | null>(null);
  const [aiReviewError, setAiReviewError] =
    useState<AiReviewErrorInfo | null>(null);

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
      if (intelUnitState.reviewViewMode) {
        setReviewView(intelUnitState.reviewViewMode);
      }
      if (intelUnitState.savedMeetingQuestions) {
        setSavedQuestions(intelUnitState.savedMeetingQuestions);
      }
      if (intelUnitState.selectedEvalIdsForCompare) {
        setComparedEvaluationIds(intelUnitState.selectedEvalIdsForCompare);
      }
      if (intelUnitState.findingQuestionsMap) {
        setFindingQuestionsMap(intelUnitState.findingQuestionsMap);
      }
      if (intelUnitState.findingPrioritiesMap) {
        setFindingPrioritiesMap(intelUnitState.findingPrioritiesMap);
      }
      if (intelUnitState.aiDraftFindingIds) {
        setAiDraftFindingIds(intelUnitState.aiDraftFindingIds);
      }
      if (intelUnitState.recordGroupOverrides) {
        setRecordGroupOverrides(intelUnitState.recordGroupOverrides);
      }
      if (intelUnitState.activeGuidedFindingId !== undefined) {
        setActiveGuidedFindingId(intelUnitState.activeGuidedFindingId);
      }
      if (intelUnitState.lastAiReviewSnapshot !== undefined) {
        setLastAiReviewSnapshot(intelUnitState.lastAiReviewSnapshot ?? null);
      }
    } else {
      setByDocumentMap({});
      setSelectedDocId(null);
      setActiveChapter("overview");
      setReviewView("read");
      setSavedQuestions([]);
      setComparedEvaluationIds([]);
      setFindingQuestionsMap({});
      setFindingPrioritiesMap({});
      setAiDraftFindingIds([]);
      setRecordGroupOverrides({});
      setActiveGuidedFindingId(null);
      setLastAiReviewSnapshot(null);
    }
    setGuidedDecisionsMap({});
    setIepReturnState(null);
    setAiReviewError(null);
    setIsRunningAiReview(false);
    setActiveAiReviewStage(null);
  }, [studentContactId, workspaceId, Boolean(intelUnitState)]);

  // Auto-select the student's current IEP PDF when vault documents arrive
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
          resolveClientRecordGroup(d, recordGroupOverrides) === "current_iep" &&
          d.fileName.toLowerCase().endsWith(".pdf")
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

  const designatedCurrentIep = useMemo(
    () =>
      vaultDocuments.find(
        (d) =>
          resolveClientRecordGroup(d, recordGroupOverrides) === "current_iep"
      ) ||
      selectedDocument ||
      null,
    [vaultDocuments, selectedDocument, recordGroupOverrides]
  );

  const schoolEvalDocs = useMemo(
    () =>
      vaultDocuments.filter(
        (d) =>
          d.id !== designatedCurrentIep?.id &&
          resolveClientRecordGroup(d, recordGroupOverrides) ===
            "school_evaluation"
      ),
    [vaultDocuments, designatedCurrentIep?.id, recordGroupOverrides]
  );

  const outsideEvalDocs = useMemo(
    () =>
      vaultDocuments.filter(
        (d) =>
          d.id !== designatedCurrentIep?.id &&
          resolveClientRecordGroup(d, recordGroupOverrides) ===
            "outside_evaluation"
      ),
    [vaultDocuments, designatedCurrentIep?.id, recordGroupOverrides]
  );

  // Seed default selected evaluations once per student if not explicitly persisted
  useEffect(() => {
    if (vaultDocuments.length === 0) return;
    if (hasSeededEvalSelectionRef.current === studentContactId) return;
    hasSeededEvalSelectionRef.current = studentContactId;
    if (intelUnitState?.selectedEvalIdsForCompare !== undefined) return;
    const defaultEvalIds = [
      ...schoolEvalDocs.map((d) => d.id),
      ...outsideEvalDocs.map((d) => d.id),
    ];
    if (defaultEvalIds.length > 0) {
      setComparedEvaluationIds(defaultEvalIds);
    }
  }, [
    studentContactId,
    vaultDocuments.length,
    schoolEvalDocs,
    outsideEvalDocs,
    intelUnitState?.selectedEvalIdsForCompare,
  ]);

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
      enabled: Boolean(
        studentContactId > 0 && selectedDocId && selectedDocId > 0
      ),
      retry: false,
      staleTime: 60_000,
    }
  );

  const [vaultRenderedPages, setVaultRenderedPages] = useState<
    ImportedPdfPage[]
  >([]);
  const [isRenderingVaultPdf, setIsRenderingVaultPdf] =
    useState<boolean>(false);

  // Render Vault PDF pages at sharp 2.4x scale with stale request guard
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
        const pages = await convertPdfToPageImages(bytes.buffer, 2.4);
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

  const persistWorkspaceState = (
    overrides: Partial<IntelPersistedState>,
    isDebounced = true
  ) => {
    if (!onUpdateIntelUnitState) return;
    onUpdateIntelUnitState(
      {
        selectedDocId,
        activeChapter,
        reviewViewMode: reviewView,
        firstMateOpen,
        activeGuidedFindingId,
        selectedEvalIdsForCompare: comparedEvaluationIds,
        savedMeetingQuestions: savedQuestions,
        findingQuestionsMap,
        findingPrioritiesMap,
        aiDraftFindingIds,
        recordGroupOverrides,
        lastAiReviewSnapshot,
        byDocument: byDocumentMap,
        ...overrides,
      },
      isDebounced
    );
  };

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
      persistWorkspaceState(
        {
          selectedDocId: nextSelectedDocId,
          activeChapter: nextActiveChapter,
          byDocument: nextMap,
        },
        isDebounced
      );
      return nextMap;
    });
  };

  // Temporary local PDF state
  const [localPdfPages, setLocalPdfPages] = useState<ImportedPdfPage[]>([]);
  const [localPdfName, setLocalPdfName] = useState<string | null>(null);
  const [localPdfBase64, setLocalPdfBase64] = useState<string | null>(null);
  const [focusedPassage, setFocusedPassage] =
    useState<FocusedSourcePassage | null>(null);
  const [previousReadingPosition, setPreviousReadingPosition] =
    useState<IntelReadingPosition | null>(null);
  const [priorCheckOpen, setPriorCheckOpen] = useState<boolean>(false);
  const [priorCheckContext] = useState<PriorIepCheckContext>({
    chapterId: "overview",
    chapterLabel: "Overview",
    scopeLabel: "Prior IEP Comparison",
  });
  const [showLegacyPrepTools, setShowLegacyPrepTools] =
    useState<boolean>(false);

  const pendingCitationJumpRef = useRef<{
    docId: number;
    passage: FocusedSourcePassage;
  } | null>(null);

  // Reset temporary local state when switching students
  useEffect(() => {
    renderSeqRef.current++;
    setLocalPdfPages([]);
    setLocalPdfName(null);
    setLocalPdfBase64(null);
    setVaultRenderedPages([]);
    setFocusedPassage(null);
    setPreviousReadingPosition(null);
    setPriorCheckOpen(false);
    setRecordsDrawerOpen(false);
    setReturnToCompareBanner(false);
  }, [studentContactId]);

  const activeChapterMeta =
    ALL_INTEL_CHAPTERS.find((c) => c.id === activeChapter) ||
    INTEL_PRIMARY_CHAPTERS[0];
  const documentIndex = vaultDocPayload?.index || null;

  // Apply pending citation jump once target document index loads
  useEffect(() => {
    const pending = pendingCitationJumpRef.current;
    if (!pending || pending.docId !== selectedDocId) return;
    if (vaultDocLoading) return;
    pendingCitationJumpRef.current = null;
    handleFocusPassage(pending.passage, false);
    setScrollTriggerSeq((prev) => prev + 1);
  }, [selectedDocId, vaultDocLoading, documentIndex?.fileId]);

  const updateRecordMetadataMutation =
    trpc.meetingWorkspace.updateRecordMetadata.useMutation({
      onSuccess: async () => {
        await trpcUtils.clientFiles.listVault.invalidate();
        toast.success("Updated record category in Student Vault");
      },
      onError: (err) => {
        toast.error(err.message || "Could not update record category.");
      },
    });

  const handleAssignRecordGroup = (
    docId: number,
    targetGroup: RecordReviewGroup
  ) => {
    const nextOverrides = { ...recordGroupOverrides, [docId]: targetGroup };
    setRecordGroupOverrides(nextOverrides);
    persistWorkspaceState({ recordGroupOverrides: nextOverrides }, true);
    updateRecordMetadataMutation.mutate({
      studentContactId,
      fileId: docId,
      recordGroup: targetGroup,
    });
  };

  // Upload mutation for saving temporary local PDF or Vault upload
  const uploadToVaultMutation = trpc.clientFiles.upload.useMutation({
    onSuccess: async (res) => {
      toast.success("Saved PDF to Student Vault");
      await trpcUtils.clientFiles.listVault.invalidate();
      if (res?.id) {
        setSelectedDocId(Number(res.id));
        setLocalPdfName(null);
        setLocalPdfPages([]);
        setLocalPdfBase64(null);
      }
    },
    onError: (err) => {
      toast.error(err.message || "Could not save PDF to Student Vault.");
    },
  });

  const mapGroupToVaultUploadMeta = (targetGroup: RecordReviewGroup) => {
    if (targetGroup === "current_iep") {
      return {
        category: "ieps-504s",
        documentType: "Current IEP",
        isCurrentPlan: 1,
      };
    }
    if (targetGroup === "outside_evaluation") {
      return {
        category: "outside-evaluations",
        documentType: "Outside Evaluation (IEE)",
        isCurrentPlan: 0,
      };
    }
    if (targetGroup === "historical_iep") {
      return {
        category: "ieps-504s",
        documentType: "Previous IEP",
        isCurrentPlan: 0,
      };
    }
    return {
      category: "school-evaluations",
      documentType: "School Evaluation",
      isCurrentPlan: 0,
    };
  };

  const handleSaveTempPdfToVault = async (
    targetGroup: RecordReviewGroup = "current_iep"
  ) => {
    if (!localPdfName || !localPdfBase64 || studentContactId <= 0) {
      toast.error("No temporary local PDF data available to save.");
      return;
    }
    const meta = mapGroupToVaultUploadMeta(targetGroup);
    const res = await uploadToVaultMutation.mutateAsync({
      studentId: studentContactId,
      fileName: localPdfName,
      fileData: localPdfBase64,
      fileSize: Math.max(1024, Math.round(localPdfBase64.length * 0.75)),
      category: meta.category,
      documentType: meta.documentType,
    });
    if (res?.id && targetGroup === "current_iep") {
      handleAssignRecordGroup(Number(res.id), "current_iep");
    }
  };

  const handleUploadVaultFile = async (params: {
    file: File;
    targetGroup: RecordReviewGroup;
    documentDate?: string;
  }) => {
    const { file, targetGroup, documentDate } = params;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please select a PDF document (.pdf).");
      return;
    }
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const dataUrl = `data:application/pdf;base64,${window.btoa(binary)}`;
    const meta = mapGroupToVaultUploadMeta(targetGroup);
    const res = await uploadToVaultMutation.mutateAsync({
      studentId: studentContactId,
      fileName: file.name,
      fileData: dataUrl,
      fileSize: file.size || Math.max(1024, bytes.byteLength),
      documentDate,
      category: meta.category,
      documentType: meta.documentType,
    });
    if (res?.id && targetGroup === "current_iep") {
      handleAssignRecordGroup(Number(res.id), "current_iep");
    }
  };

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
          if (resolvedBoxes.length === 0) {
            resolvedBoxes = findBoundingBoxesOnIndexedPage(
              matchedPage.textItems,
              cleanQuote
            );
          }
          resolvedStatus = resolvedBoxes.length > 0 ? "verified" : "page_only";
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
    } else if (
      documentIndex &&
      resolvedStatus === "verified" &&
      resolvedBoxes.length === 0 &&
      resolvedPage
    ) {
      const cleanQuote = (passage.quote || "").trim();
      const pageObj = documentIndex.pages.find(
        (p) => p.pdfPageNumber === resolvedPage
      );
      if (pageObj && cleanQuote) {
        resolvedBoxes = findBoundingBoxesOnIndexedPage(
          pageObj.textItems,
          cleanQuote
        );
      }
      if (resolvedBoxes.length === 0) {
        resolvedStatus = "page_only";
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
  };

  // Open citation from Compare, Prepare, or First Mate
  const handleOpenCitationInReader = (
    params: {
      fileId: number | null;
      fileName: string;
      pageNumber: number | null;
      printedPageLabel?: string | null;
      excerpt: string | null;
      sectionLabel: string;
      boundingBoxes?: IntelBoundingBox[];
      verificationStatus?: "verified" | "page_only" | "unverified";
    },
    fromCompare = false
  ) => {
    if (fromCompare) {
      setReturnToCompareBanner(true);
    }
    const targetPage = params.pageNumber || 1;
    const passage: FocusedSourcePassage = {
      chapterLabel: params.sectionLabel || "Cited Source Passage",
      pageLabel: `PDF p. ${targetPage}${
        params.printedPageLabel ? ` (${params.printedPageLabel})` : ""
      }`,
      pageNumber: targetPage,
      printedPageLabel: params.printedPageLabel,
      quote: params.excerpt || undefined,
      sectionRef: `${formatShortFileName(params.fileName, 28)} · p. ${targetPage}`,
      documentId: params.fileId,
      verificationStatus: params.verificationStatus || "verified",
      boundingBoxes: params.boundingBoxes,
    };

    setReviewView("read");
    setLocalPdfName(null);
    setLocalPdfPages([]);

    if (params.fileId && params.fileId !== selectedDocId) {
      pendingCitationJumpRef.current = {
        docId: params.fileId,
        passage,
      };
      setSelectedDocId(params.fileId);
      updateScopedDocWork(
        (prev) => ({ ...prev, pageNumber: targetPage }),
        params.fileId,
        activeChapter,
        false
      );
    } else {
      handleFocusPassage(passage, true);
      setScrollTriggerSeq((prev) => prev + 1);
    }
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

  const handleToggleFocusReading = () => {
    if (!isFocusReading) {
      setFocusReturnContext({
        view: reviewView,
        firstMateOpen,
        pageNumber: activeDocWork.pageNumber,
        zoomPercent: activeDocWork.zoomPercent,
      });
      setReviewView("read");
      setFirstMateOpen(false);
      setRecordsDrawerOpen(false);
      setIsFocusReading(true);
    } else {
      setIsFocusReading(false);
      if (focusReturnContext) {
        setReviewView(focusReturnContext.view);
        setFirstMateOpen(focusReturnContext.firstMateOpen);
        updateScopedDocWork(
          (prev) => ({
            ...prev,
            pageNumber: focusReturnContext.pageNumber,
            zoomPercent: focusReturnContext.zoomPercent,
          }),
          selectedDocId,
          activeChapter,
          true
        );
        setFocusReturnContext(null);
      }
    }
  };

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
      category:
        params.category || activeChapterMeta.shortLabel || "Present Levels",
      section:
        params.section ||
        activeChapterMeta.iepSectionName ||
        "Present Levels / Academics",
      text: params.text,
      quote: `PDF p. ${params.pdfPageNumber}: "${params.excerpt}"`,
      status: "keep",
      isCustom: true,
      advocateConfirmed: true,
      aiGeneratedDraft: false,
      reviewDecision: "saved",
      priority: "medium",
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
      `Saved verified finding from PDF page ${params.pdfPageNumber}`
    );
  };

  const handleSaveConfirmedFinding = (finding: IepIntelFinding) => {
    const exists = findings.some((f) => f.id === finding.id);
    const updated = exists
      ? findings.map((f) => (f.id === finding.id ? finding : f))
      : [finding, ...findings];
    onUpdateFindings(updated);
    if (finding.proposedQuestion) {
      const nextQMap = {
        ...findingQuestionsMap,
        [finding.id]: finding.proposedQuestion,
      };
      setFindingQuestionsMap(nextQMap);
      persistWorkspaceState({ findingQuestionsMap: nextQMap }, true);
    }
    // Keep any already-connected target synchronized
    const syncedTargets = syncFindingUpdateToTargets(
      finding,
      targets,
      finding.proposedQuestion
    );
    if (syncedTargets !== targets) {
      onUpdateTargets(syncedTargets);
    }
    toast.success("Saved finding for later");
  };

  const handleSaveMeetingQuestion = (question: SavedMeetingQuestionItem) => {
    setSavedQuestions((prev) => {
      const exists = prev.some((q) => q.id === question.id);
      const next = exists
        ? prev.map((q) => (q.id === question.id ? question : q))
        : [question, ...prev];
      persistWorkspaceState({ savedMeetingQuestions: next }, true);
      return next;
    });
  };

  const handleSendFindingToBlueprint = (
    finding: IepIntelFinding,
    meetingQuestion?: string
  ) => {
    const resolvedQ =
      meetingQuestion ||
      findingQuestionsMap[finding.id] ||
      finding.proposedQuestion ||
      finding.text;

    const confirmedFinding: IepIntelFinding = {
      ...finding,
      status: finding.status === "important" ? "important" : "keep",
      advocateConfirmed: true,
      aiGeneratedDraft: false,
      reviewDecision: "saved",
      proposedQuestion: resolvedQ,
      linkedTargetId: `target-from-${finding.id}`,
    };

    const { updatedTargets, target, wasExisting } =
      upsertConnectedTargetFromFinding({
        finding: confirmedFinding,
        targets,
        meetingQuestion: resolvedQ,
      });

    // Ensure the finding itself is persisted in findings so Records Review and Blueprint share one connected record
    const existsInFindings = findings.some((f) => f.id === confirmedFinding.id);
    const nextFindings = existsInFindings
      ? findings.map((f) =>
          f.id === confirmedFinding.id ? confirmedFinding : f
        )
      : [confirmedFinding, ...findings];
    onUpdateFindings(nextFindings);
    onUpdateTargets(updatedTargets);

    setGuidedDecisionsMap((prev) => ({
      ...prev,
      [confirmedFinding.id]: "saved",
    }));
    setAiDraftFindingIds((prev) =>
      prev.filter((id) => id !== confirmedFinding.id)
    );
    if (resolvedQ) {
      const nextQMap = {
        ...findingQuestionsMap,
        [confirmedFinding.id]: resolvedQ,
      };
      setFindingQuestionsMap(nextQMap);
      persistWorkspaceState({ findingQuestionsMap: nextQMap }, true);
    }

    toast.success(
      wasExisting
        ? `Updated connected target "${target.targetName}" in 2. Blueprint`
        : `Sent "${target.targetName}" to 2. Blueprint`
    );
  };

  const handleOpenFindingInStage = (
    finding: IepIntelFinding,
    stage: "blueprint" | "meeting_space"
  ) => {
    const connected = resolveConnectedTargetForFinding(finding, targets);
    onNavigateToStage?.(stage, connected?.id);
  };

  const handleRemoveFindingFromBlueprintOnly = (finding: IepIntelFinding) => {
    const connected = resolveConnectedTargetForFinding(finding, targets);
    if (!connected) return;
    const prevTargets = [...targets];
    const nextTargets = targets.filter((t) => t.id !== connected.id);
    onUpdateTargets(nextTargets);
    toast.success(
      "Removed from Blueprint · Saved finding retained in Records Review",
      {
        action: {
          label: "Undo",
          onClick: () => {
            onUpdateTargets(prevTargets);
            toast.success("Restored connected item to Blueprint");
          },
        },
      }
    );
  };

  const handleArchiveWithdrawnFindingPreserveHistory = (
    finding: IepIntelFinding
  ) => {
    const connected = resolveConnectedTargetForFinding(finding, targets);
    const archivedAt = new Date().toISOString();
    if (connected) {
      const updatedTargets = targets.map((t) =>
        t.id === connected.id
          ? {
              ...t,
              archivedOrWithdrawn: true,
              archivedAt,
              archivedReason: "Withdrawn while preserving meeting outcome history",
            }
          : t
      );
      onUpdateTargets(updatedTargets);
    }
    const nextFindings = findings.map((f) =>
      f.id === finding.id
        ? {
            ...f,
            archivedMeetingOutcome: {
              targetId: connected?.id || `target-from-${finding.id}`,
              meetingStatus: connected?.meetingStatus || "DISCUSSED",
              notes: connected?.notes,
              archivedAt,
            },
          }
        : f
    );
    onUpdateFindings(nextFindings);
    toast.success("Item withdrawn · Recorded meeting history preserved");
  };

  const handleConfirmPermanentDeleteFinding = (finding: IepIntelFinding) => {
    const prevFindings = [...findings];
    const prevTargets = [...targets];
    const connected = resolveConnectedTargetForFinding(finding, targets);
    const nextFindings = findings.filter((f) => f.id !== finding.id);
    const nextTargets = connected
      ? targets.filter((t) => t.id !== connected.id)
      : targets;
    onUpdateFindings(nextFindings);
    if (connected) {
      onUpdateTargets(nextTargets);
    }
    setGuidedDecisionsMap((prev) => ({ ...prev, [finding.id]: "dismissed" }));
    toast.success(
      connected
        ? "Deleted finding and removed connected Blueprint item"
        : "Deleted finding",
      {
        action: {
          label: "Undo",
          onClick: () => {
            onUpdateFindings(prevFindings);
            if (connected) onUpdateTargets(prevTargets);
            setGuidedDecisionsMap((prev) => ({
              ...prev,
              [finding.id]: "saved",
            }));
          },
        },
      }
    );
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

  const activeFindingsCount = useMemo(
    () => findings.filter((f) => f.status !== "dismiss").length,
    [findings]
  );

  const activeDocShortLabel = localPdfName
    ? `${formatShortFileName(localPdfName, 26)} (Temp)`
    : selectedDocument
    ? formatShortFileName(selectedDocument.fileName, 28)
    : "Select Record";

  const activeDocGroupBadge = useMemo(() => {
    if (localPdfName) return "Temp PDF";
    if (!selectedDocument) return null;
    const grp = resolveClientRecordGroup(selectedDocument, recordGroupOverrides);
    if (grp === "current_iep") return "Current IEP";
    if (grp === "school_evaluation") return "School Eval";
    if (grp === "outside_evaluation") return "Outside Eval";
    return "Historical IEP";
  }, [localPdfName, selectedDocument, recordGroupOverrides]);

  const confirmedFindingIdsSet = useMemo(
    () => new Set(findings.map((f) => f.id)),
    [findings]
  );
  const blueprintTargetIdsSet = useMemo(
    () => new Set(targets.map((t) => t.id)),
    [targets]
  );

  // Keep the Current IEP document index accessible even while temporarily viewing an evaluation citation
  const { data: currentIepPayload } =
    trpc.meetingWorkspace.getVaultDocument.useQuery(
      {
        studentContactId,
        workspaceId,
        fileId: designatedCurrentIep?.id || 0,
      },
      {
        enabled: Boolean(
          studentContactId > 0 &&
            designatedCurrentIep?.id &&
            designatedCurrentIep.id > 0 &&
            designatedCurrentIep.id !== selectedDocId
        ),
        retry: false,
        staleTime: 60_000,
      }
    );

  const currentIepDocumentIndex =
    selectedDocId === designatedCurrentIep?.id
      ? documentIndex
      : currentIepPayload?.index || documentIndex;

  const availableEvaluationIds = useMemo(
    () => [
      ...schoolEvalDocs.map((d) => d.id),
      ...outsideEvalDocs.map((d) => d.id),
    ],
    [schoolEvalDocs, outsideEvalDocs]
  );

  const effectiveSelectedEvalIds = useMemo(
    () =>
      comparedEvaluationIds.filter((id) => availableEvaluationIds.includes(id)),
    [comparedEvaluationIds, availableEvaluationIds]
  );

  const { data: guidedComparisonPayload } =
    trpc.meetingWorkspace.compareEvaluationsWithIep.useQuery(
      {
        studentContactId,
        workspaceId,
        currentIepFileId: designatedCurrentIep?.id || 0,
        evaluationFileIds: effectiveSelectedEvalIds,
      },
      {
        enabled: Boolean(
          studentContactId > 0 &&
            designatedCurrentIep?.id &&
            designatedCurrentIep.id > 0 &&
            effectiveSelectedEvalIds.length > 0
        ),
        staleTime: 60_000,
        retry: false,
      }
    );

  const guidedFindings = useMemo(
    () =>
      buildGuidedReviewSequence({
        savedFindings: findings,
        documentIndex: currentIepDocumentIndex,
        comparisonConnections: guidedComparisonPayload?.connections || [],
        decisionsMap: guidedDecisionsMap,
      }),
    [
      findings,
      currentIepDocumentIndex,
      guidedComparisonPayload?.connections,
      guidedDecisionsMap,
    ]
  );

  const visibleGuidedFindings = useMemo(
    () =>
      guidedFindings.filter(
        (f) => f.status !== "dismiss" && f.reviewDecision !== "dismissed"
      ),
    [guidedFindings]
  );

  // Initialize activeGuidedFindingId to the first active finding in document order without yanking scroll
  useEffect(() => {
    if (guidedFindings.length === 0) return;
    if (
      activeGuidedFindingId &&
      guidedFindings.some((f) => f.id === activeGuidedFindingId)
    ) {
      return;
    }
    const firstActive = visibleGuidedFindings[0] || guidedFindings[0];
    if (firstActive) {
      setActiveGuidedFindingId(firstActive.id);
    }
  }, [guidedFindings, visibleGuidedFindings, activeGuidedFindingId]);

  const activeFindingPositionLabel = useMemo(() => {
    if (visibleGuidedFindings.length === 0) return null;
    const idx = visibleGuidedFindings.findIndex(
      (f) => f.id === activeGuidedFindingId
    );
    const pos = idx >= 0 ? idx + 1 : 1;
    return `Finding ${pos} of ${visibleGuidedFindings.length}`;
  }, [visibleGuidedFindings, activeGuidedFindingId]);

  const isViewingEvaluationInReader = Boolean(
    iepReturnState ||
      (selectedDocument &&
        designatedCurrentIep &&
        selectedDocument.id !== designatedCurrentIep.id &&
        resolveClientRecordGroup(selectedDocument, recordGroupOverrides) !==
          "current_iep")
  );

  // Synchronize reader to the selected or stepped finding (navigation only — never alters review decisions)
  const handleSelectGuidedFindingAndSyncReader = (finding: IepIntelFinding) => {
    setActiveGuidedFindingId(finding.id);
    if (lastAiReviewSnapshot && lastAiReviewSnapshot.status === "ready") {
      const updatedSnap: AiReviewRunSnapshot = {
        ...lastAiReviewSnapshot,
        status: "in_progress",
      };
      setLastAiReviewSnapshot(updatedSnap);
      persistWorkspaceState(
        {
          activeGuidedFindingId: finding.id,
          lastAiReviewSnapshot: updatedSnap,
        },
        true
      );
    } else {
      persistWorkspaceState({ activeGuidedFindingId: finding.id }, true);
    }
    setIepReturnState(null);

    const targetIepId =
      finding.sourceRef?.documentId ||
      designatedCurrentIep?.id ||
      selectedDocId;

    // Missing evaluation recommendation ("Not located" in IEP): navigate to relevant IEP section page with zero fabricated highlight
    if (
      finding.iepLocateStatus === "Not located" &&
      !finding.sourceRef?.pdfPageNumber
    ) {
      const sectionPage = finding.relevantIepSectionPage || 1;
      const missingPassage: FocusedSourcePassage = {
        chapterLabel: `${finding.section || "IEP Section"} (No Matching Passage Located)`,
        pageLabel: `PDF p. ${sectionPage} (Section Page Only)`,
        pageNumber: sectionPage,
        sectionRef: `${formatShortFileName(
          designatedCurrentIep?.fileName || "Current IEP.pdf",
          28
        )} · p. ${sectionPage}`,
        documentId: targetIepId,
        verificationStatus: "page_only",
        verificationReason:
          "No matching IEP passage was located for this evaluation recommendation — showing the relevant IEP section page for review.",
        boundingBoxes: [],
      };
      if (targetIepId && targetIepId !== selectedDocId) {
        pendingCitationJumpRef.current = {
          docId: targetIepId,
          passage: missingPassage,
        };
        setSelectedDocId(targetIepId);
        updateScopedDocWork(
          (prev) => ({ ...prev, pageNumber: sectionPage }),
          targetIepId,
          activeChapter,
          false
        );
      } else {
        handleFocusPassage(missingPassage, false);
        setScrollTriggerSeq((prev) => prev + 1);
      }
      return;
    }

    // Located IEP finding: resolve exact page and coordinates
    let targetPage = finding.sourceRef?.pdfPageNumber || null;
    if (!targetPage && finding.quote) {
      const m = finding.quote.match(/\b(?:page|p\.?)\s*(\d+)\b/i);
      if (m) targetPage = parseInt(m[1], 10);
    }
    const resolvedPage = targetPage || 1;
    const rawExcerpt =
      finding.sourceRef?.excerpt ||
      (finding.quote
        ? finding.quote.replace(/^.*?:\s*"?|"?$/g, "").trim()
        : "");

    let boxes = finding.sourceRef?.boundingBoxes || [];
    if (boxes.length === 0 && rawExcerpt && currentIepDocumentIndex?.pages) {
      const pageObj = currentIepDocumentIndex.pages.find(
        (p) => p.pdfPageNumber === resolvedPage
      );
      if (pageObj) {
        boxes = findBoundingBoxesOnIndexedPage(pageObj.textItems, rawExcerpt);
      }
    }

    const passage: FocusedSourcePassage = {
      chapterLabel: `${finding.category || finding.section || "IEP Finding"}`,
      pageLabel: `PDF p. ${resolvedPage}${
        finding.sourceRef?.printedPageLabel
          ? ` (${finding.sourceRef.printedPageLabel})`
          : ""
      }`,
      pageNumber: resolvedPage,
      printedPageLabel: finding.sourceRef?.printedPageLabel ?? null,
      quote: rawExcerpt || undefined,
      sectionRef: `${formatShortFileName(
        finding.sourceRef?.fileName ||
          designatedCurrentIep?.fileName ||
          "Current IEP.pdf",
        28
      )} · p. ${resolvedPage}`,
      documentId: targetIepId,
      verificationStatus: boxes.length > 0 ? "verified" : "page_only",
      boundingBoxes: boxes,
    };

    if (targetIepId && targetIepId !== selectedDocId) {
      pendingCitationJumpRef.current = {
        docId: targetIepId,
        passage,
      };
      setSelectedDocId(targetIepId);
      updateScopedDocWork(
        (prev) => ({ ...prev, pageNumber: resolvedPage }),
        targetIepId,
        activeChapter,
        false
      );
    } else {
      handleFocusPassage(passage, false);
      setScrollTriggerSeq((prev) => prev + 1);
    }
  };

  const askFirstMateMutation =
    trpc.meetingWorkspace.askFirstMateRecordsReview.useMutation();

  // Connected multi-stage AI Review execution (Preparing -> Reading IEP -> Comparing Evals -> Organizing Findings)
  const handleRunFullAiReview = async () => {
    if (isRunningAiReview) return;
    if (
      !designatedCurrentIep ||
      !designatedCurrentIep.fileName.toLowerCase().endsWith(".pdf")
    ) {
      setRecordsDrawerOpen(true);
      return;
    }

    const currentIepId = designatedCurrentIep.id;
    const currentIepFileName = designatedCurrentIep.fileName;
    const selectedSchoolIds = schoolEvalDocs
      .filter((d) => effectiveSelectedEvalIds.includes(d.id))
      .map((d) => d.id);
    const selectedOutsideIds = outsideEvalDocs
      .filter((d) => effectiveSelectedEvalIds.includes(d.id))
      .map((d) => d.id);
    const allSelectedEvalIds = [...selectedSchoolIds, ...selectedOutsideIds];

    setIsRunningAiReview(true);
    setAiReviewError(null);
    setActiveAiReviewStage("preparing_documents");

    let currentStageKey: AiReviewProcessingStage = "preparing_documents";
    let currentStageLabel = "Preparing documents";
    let currentAffectedDoc: string | null = currentIepFileName;

    try {
      // Stage 1 -> Stage 2: Reading the IEP
      currentStageKey = "reading_iep";
      currentStageLabel = "Reading the IEP";
      setActiveAiReviewStage("reading_iep");

      const iepDocRes =
        await trpcUtils.meetingWorkspace.getVaultDocument.fetch({
          studentContactId,
          workspaceId,
          fileId: currentIepId,
        });

      if (
        !iepDocRes ||
        iepDocRes.status !== "ready" ||
        !iepDocRes.index ||
        iepDocRes.index.overallStatus === "failed"
      ) {
        throw new Error(
          iepDocRes?.message ||
            `Could not extract readable text from "${currentIepFileName}". Verify the file is a valid PDF in the Student Vault.`
        );
      }

      // Stage 3: Comparing selected evaluations (when included)
      let cmpRes: Awaited<
        ReturnType<
          typeof trpcUtils.meetingWorkspace.compareEvaluationsWithIep.fetch
        >
      > | null = null;

      if (allSelectedEvalIds.length > 0) {
        currentStageKey = "comparing_evaluations";
        currentStageLabel = "Comparing selected evaluations";
        const firstEvalDoc = vaultDocuments.find(
          (d) => d.id === allSelectedEvalIds[0]
        );
        currentAffectedDoc = firstEvalDoc?.fileName || "Selected Evaluation";
        setActiveAiReviewStage("comparing_evaluations");

        cmpRes =
          await trpcUtils.meetingWorkspace.compareEvaluationsWithIep.fetch({
            studentContactId,
            workspaceId,
            currentIepFileId: currentIepId,
            evaluationFileIds: allSelectedEvalIds,
          });
      }

      // Stage 4: Organizing findings in IEP order
      currentStageKey = "organizing_findings";
      currentStageLabel = "Organizing findings in IEP order";
      currentAffectedDoc = currentIepFileName;
      setActiveAiReviewStage("organizing_findings");

      const fmRes = await askFirstMateMutation.mutateAsync({
        studentContactId,
        action: "find_recommendations",
        selectedFileIds: [currentIepId, ...allSelectedEvalIds],
        activeFileId: currentIepId,
      });

      // Preserve confirmed/saved findings, decisions, and any findings already advanced to Blueprint/Meeting Space when rerunning
      const preservedFindings = findings.filter(
        (f) =>
          f.advocateConfirmed ||
          f.isCustom ||
          f.reviewDecision === "saved" ||
          f.reviewDecision === "reviewed" ||
          guidedDecisionsMap[f.id] === "saved" ||
          guidedDecisionsMap[f.id] === "reviewed" ||
          Boolean(resolveConnectedTargetForFinding(f, targets))
      );

      const newSequence = buildGuidedReviewSequence({
        savedFindings: preservedFindings,
        documentIndex: iepDocRes.index,
        comparisonConnections: cmpRes?.connections || [],
        decisionsMap: guidedDecisionsMap,
      });

      // Also include any non-duplicate First Mate draft findings anchored to the IEP or evaluations
      const seenIds = new Set(newSequence.map((f) => f.id));
      const seenExcerpts = new Set(
        newSequence
          .map((f) =>
            f.sourceRef?.excerpt
              ? `${f.sourceRef.pdfPageNumber || 0}:${normalizeConservative(
                  f.sourceRef.excerpt
                ).slice(0, 60)}`
              : ""
          )
          .filter(Boolean)
      );

      const extraFmDrafts: IepIntelFinding[] = [];
      for (const df of fmRes.draftFindings || []) {
        if (seenIds.has(df.id)) continue;
        const excerptKey = df.citation?.excerpt
          ? `${df.citation.pdfPageNumber || 0}:${normalizeConservative(
              df.citation.excerpt
            ).slice(0, 60)}`
          : "";
        if (excerptKey && seenExcerpts.has(excerptKey)) continue;
        if (excerptKey) seenExcerpts.add(excerptKey);
        seenIds.add(df.id);

        extraFmDrafts.push({
          id: df.id,
          category: df.category,
          section: df.section,
          text: df.text,
          quote: df.quote,
          status: "keep",
          aiGeneratedDraft: true,
          advocateConfirmed: false,
          reviewDecision: "pending",
          priority: df.priority === "high" ? "high" : "medium",
          proposedQuestion: df.proposedMeetingQuestion,
          sourceRef:
            df.citation && df.citation.fileId === currentIepId
              ? {
                  documentId: df.citation.fileId,
                  fileName: df.citation.fileName,
                  pdfPageNumber: df.citation.pdfPageNumber,
                  printedPageLabel: df.citation.printedPageLabel,
                  excerpt: df.citation.excerpt,
                  boundingBoxes: df.citation.boundingBoxes,
                  verificationStatus: df.citation.verificationStatus,
                }
              : undefined,
          evalSourceRef:
            df.citation &&
            df.citation.fileId !== currentIepId &&
            (df.citation.recordGroup === "school_evaluation" ||
              df.citation.recordGroup === "outside_evaluation")
              ? {
                  documentId: df.citation.fileId,
                  fileName: df.citation.fileName,
                  recordGroup: df.citation.recordGroup,
                  documentDate: df.citation.documentDate,
                  pdfPageNumber: df.citation.pdfPageNumber,
                  printedPageLabel: df.citation.printedPageLabel,
                  excerpt: df.citation.excerpt,
                  boundingBoxes: df.citation.boundingBoxes,
                  verificationStatus: df.citation.verificationStatus,
                }
              : undefined,
        });
      }

      const combinedOrderedRaw = buildGuidedReviewSequence({
        savedFindings: [...preservedFindings, ...extraFmDrafts],
        documentIndex: iepDocRes.index,
        comparisonConnections: cmpRes?.connections || [],
        decisionsMap: guidedDecisionsMap,
      });

      const combinedOrdered = reconcileSourceMaterialChanges({
        findings: combinedOrderedRaw,
        vaultDocuments,
        designatedCurrentIepId: currentIepId,
      });

      onUpdateFindings(combinedOrdered);
      const nextDraftIds = combinedOrdered
        .filter((f) => f.aiGeneratedDraft && !f.advocateConfirmed)
        .map((f) => f.id);
      setAiDraftFindingIds(nextDraftIds);

      const reviewedRecordsSummary: AiReviewRecordSummaryItem[] = (
        cmpRes?.reviewedDocuments ||
        fmRes?.sourceRecordsUsed || [
          {
            fileId: iepDocRes.index.fileId,
            fileName: iepDocRes.index.fileName,
            recordGroup: "current_iep" as RecordReviewGroup,
            documentDate: iepDocRes.index.iepDocumentDate,
            pageCount: iepDocRes.index.pageCount,
            readablePageCount: iepDocRes.index.readablePageCount,
            unreadablePageCount: iepDocRes.index.unreadablePageCount,
            overallStatus: iepDocRes.index.overallStatus,
            limitationNote:
              iepDocRes.index.unreadablePageCount > 0
                ? `${iepDocRes.index.unreadablePageCount} page(s) could not be read automatically.`
                : null,
          },
        ]
      ).map((r) => ({
        fileId: r.fileId,
        fileName: r.fileName,
        recordGroup: r.recordGroup,
        documentDate: r.documentDate,
        pageCount: r.pageCount,
        readablePageCount: r.readablePageCount,
        unreadablePageCount: r.unreadablePageCount,
        overallStatus: r.overallStatus,
        limitationNote: r.limitationNote,
      }));

      const nonDismissedCount = combinedOrdered.filter(
        (f) => f.status !== "dismiss" && f.reviewDecision !== "dismissed"
      ).length;

      const snapshot: AiReviewRunSnapshot = {
        status: "ready",
        completedAt: new Date().toISOString(),
        currentIepId,
        currentIepFileName,
        schoolEvalIds: selectedSchoolIds,
        outsideEvalIds: selectedOutsideIds,
        reviewedRecordsSummary,
        findingsCount: nonDismissedCount,
      };

      setLastAiReviewSnapshot(snapshot);
      persistWorkspaceState(
        {
          aiDraftFindingIds: nextDraftIds,
          lastAiReviewSnapshot: snapshot,
        },
        false
      );
      toast.success(
        `Review ready · ${nonDismissedCount} ${
          nonDismissedCount === 1 ? "finding" : "findings"
        } organized in IEP order`
      );
    } catch (err: any) {
      const msg =
        err?.message ||
        "An unexpected error occurred while processing the selected records.";
      const isNetworkOrBackend =
        /fetch|network|trpc|unavailable|not connected/i.test(msg);
      setAiReviewError({
        stage: currentStageKey,
        stageLabel: currentStageLabel,
        affectedDocumentName: currentAffectedDoc,
        message: msg,
        isBackendUnavailable: isNetworkOrBackend,
        backendDependency: isNetworkOrBackend
          ? "trpc.meetingWorkspace.getVaultDocument / compareEvaluationsWithIep / askFirstMateRecordsReview"
          : null,
      });
      toast.error(`AI Review stopped during "${currentStageLabel}"`);
    } finally {
      setIsRunningAiReview(false);
      setActiveAiReviewStage(null);
    }
  };

  const handleBeginGuidedReview = () => {
    setIsFocusReading(false);
    setReviewView("read");
    if (lastAiReviewSnapshot) {
      const updatedSnap: AiReviewRunSnapshot = {
        ...lastAiReviewSnapshot,
        status: "in_progress",
      };
      setLastAiReviewSnapshot(updatedSnap);
      persistWorkspaceState(
        { reviewViewMode: "read", lastAiReviewSnapshot: updatedSnap },
        false
      );
    }
    const firstFinding = visibleGuidedFindings[0] || guidedFindings[0];
    if (firstFinding) {
      handleSelectGuidedFindingAndSyncReader(firstFinding);
    }
  };

  const handleContinueGuidedReview = () => {
    setIsFocusReading(false);
    setReviewView("read");
    const targetFinding =
      visibleGuidedFindings.find((f) => f.id === activeGuidedFindingId) ||
      visibleGuidedFindings[0] ||
      guidedFindings[0];
    if (targetFinding) {
      handleSelectGuidedFindingAndSyncReader(targetFinding);
    }
  };

  const handleOpenEvaluationCitationFromGuided = (params: {
    fileId: number;
    fileName: string;
    pageNumber: number | null;
    printedPageLabel?: string | null;
    excerpt: string | null;
    sectionLabel: string;
    boundingBoxes?: IntelBoundingBox[];
    verificationStatus?: "verified" | "page_only" | "unverified";
  }) => {
    if (!iepReturnState) {
      setIepReturnState({
        docId: designatedCurrentIep?.id || selectedDocId,
        pageNumber: activeDocWork.pageNumber,
        zoomPercent: activeDocWork.zoomPercent,
        focusedPassage,
      });
    }
    handleOpenCitationInReader(params, false);
  };

  const handleReturnToIepFromEvaluation = () => {
    const restoreDocId =
      iepReturnState?.docId || designatedCurrentIep?.id || selectedDocId;
    const restorePage = iepReturnState?.pageNumber || 1;
    const restoreZoom = iepReturnState?.zoomPercent || 100;
    const restorePassage = iepReturnState?.focusedPassage || null;
    setIepReturnState(null);

    if (restoreDocId && restoreDocId !== selectedDocId) {
      setSelectedDocId(restoreDocId);
      updateScopedDocWork(
        (prev) => ({
          ...prev,
          pageNumber: restorePage,
          zoomPercent: restoreZoom,
        }),
        restoreDocId,
        activeChapter,
        false
      );
      if (restorePassage) {
        pendingCitationJumpRef.current = {
          docId: restoreDocId,
          passage: restorePassage,
        };
      }
    } else {
      updateScopedDocWork(
        (prev) => ({
          ...prev,
          pageNumber: restorePage,
          zoomPercent: restoreZoom,
        }),
        selectedDocId,
        activeChapter,
        true
      );
      if (restorePassage) {
        setFocusedPassage(restorePassage);
        setScrollTriggerSeq((prev) => prev + 1);
      }
    }
  };

  const handleSaveGuidedFindingDecision = (
    finding: IepIntelFinding,
    editedQuestion?: string
  ) => {
    setGuidedDecisionsMap((prev) => ({ ...prev, [finding.id]: "saved" }));
    const savedItem: IepIntelFinding = {
      ...finding,
      status: "keep",
      advocateConfirmed: true,
      aiGeneratedDraft: false,
      reviewDecision: "saved",
      proposedQuestion:
        editedQuestion !== undefined
          ? editedQuestion
          : finding.proposedQuestion,
    };
    handleSaveConfirmedFinding(savedItem);
  };

  const handleAddGuidedMeetingQuestionDecision = (
    finding: IepIntelFinding,
    questionText: string
  ) => {
    const cleanQ = questionText.trim();
    if (!cleanQ) {
      toast.error("Please enter a meeting question first.");
      return;
    }
    const citationLabel = finding.sourceRef?.pdfPageNumber
      ? `${finding.sourceRef.fileName} · PDF p. ${finding.sourceRef.pdfPageNumber}`
      : finding.evalSourceRef?.pdfPageNumber
      ? `${finding.evalSourceRef.fileName} · PDF p. ${finding.evalSourceRef.pdfPageNumber}`
      : finding.quote || "Guided IEP Review";

    const nextQMap = { ...findingQuestionsMap, [finding.id]: cleanQ };
    setFindingQuestionsMap(nextQMap);
    persistWorkspaceState({ findingQuestionsMap: nextQMap }, true);

    handleSaveMeetingQuestion({
      id: `mq-${finding.id}`,
      section: finding.section || finding.category || "Present Levels",
      question: cleanQ,
      sourceCitation: citationLabel,
      priority: finding.priority || "medium",
      confirmed: true,
      addedToBlueprint: false,
    });
    toast.success("Added meeting question to Prepare view");
  };

  const handleMarkGuidedReviewedDecision = (finding: IepIntelFinding) => {
    setGuidedDecisionsMap((prev) => ({ ...prev, [finding.id]: "reviewed" }));
    if (findings.some((f) => f.id === finding.id)) {
      onUpdateFindings(
        findings.map((f) =>
          f.id === finding.id
            ? { ...f, reviewDecision: "reviewed", status: "keep" }
            : f
        )
      );
    }
    toast.success("Marked finding as reviewed");
  };

  const handleDismissGuidedSuggestionDecision = (finding: IepIntelFinding) => {
    setGuidedDecisionsMap((prev) => ({ ...prev, [finding.id]: "dismissed" }));
    if (findings.some((f) => f.id === finding.id)) {
      onUpdateFindings(
        findings.map((f) =>
          f.id === finding.id
            ? { ...f, status: "dismiss", reviewDecision: "dismissed" }
            : f
        )
      );
    }
    toast.info("Dismissed suggestion · You can restore it from All Findings", {
      action: {
        label: "Restore",
        onClick: () => handleRestoreDismissedFinding(finding),
      },
    });
  };

  const handleRestoreDismissedFinding = (finding: IepIntelFinding) => {
    setGuidedDecisionsMap((prev) => ({
      ...prev,
      [finding.id]: finding.advocateConfirmed ? "saved" : "pending",
    }));
    const restored: IepIntelFinding = {
      ...finding,
      status: finding.priority === "high" ? "important" : "keep",
      reviewDecision: finding.advocateConfirmed ? "saved" : "pending",
    };
    const exists = findings.some((f) => f.id === finding.id);
    if (exists) {
      onUpdateFindings(
        findings.map((f) => (f.id === finding.id ? restored : f))
      );
    } else {
      onUpdateFindings([restored, ...findings]);
    }
    setActiveGuidedFindingId(finding.id);
    toast.success("Restored finding to active review");
  };

  // Reconcile source material flags when documents or Current IEP designation change (never erases findings or targets)
  useEffect(() => {
    if (vaultDocuments.length === 0 || findings.length === 0) return;
    const reconciled = reconcileSourceMaterialChanges({
      findings,
      vaultDocuments,
      designatedCurrentIepId: designatedCurrentIep?.id ?? null,
    });
    const hasDiff = reconciled.some(
      (rf, idx) =>
        rf.sourceMaterialFlaggedForReview !==
          findings[idx]?.sourceMaterialFlaggedForReview ||
        rf.sourceMaterialFlagReason !== findings[idx]?.sourceMaterialFlagReason
    );
    if (hasDiff) {
      onUpdateFindings(reconciled);
    }
  }, [vaultDocuments.length, designatedCurrentIep?.id]);

  // Handle "Open Original Evidence" request coming from Blueprint or Meeting Space
  useEffect(() => {
    if (
      !externalOpenCitationRequest ||
      externalOpenCitationRequest.seq <= lastHandledExternalCitationSeqRef.current
    ) {
      return;
    }
    lastHandledExternalCitationSeqRef.current =
      externalOpenCitationRequest.seq;
    const { target } = externalOpenCitationRequest;
    setIsFocusReading(false);
    setReviewView("read");

    const linkedFinding = findings.find(
      (f) =>
        f.id === target.sourceFindingId ||
        `target-from-${f.id}` === target.id ||
        f.linkedTargetId === target.id
    );

    if (linkedFinding) {
      handleSelectGuidedFindingAndSyncReader(linkedFinding);
      return;
    }

    const src = target.sourceRef || target.evalSourceRef;
    if (src) {
      handleOpenCitationInReader(
        {
          fileId: src.documentId || designatedCurrentIep?.id || selectedDocId,
          fileName:
            src.fileName ||
            designatedCurrentIep?.fileName ||
            "Selected Record.pdf",
          pageNumber: src.pdfPageNumber || 1,
          printedPageLabel: src.printedPageLabel ?? null,
          excerpt: src.excerpt || target.supportingEvidence || null,
          sectionLabel: target.targetName || target.iepSection || "Evidence",
          boundingBoxes: src.boundingBoxes,
          verificationStatus: src.verificationStatus,
        },
        false
      );
      return;
    }

    // Fallback: parse page number from target.sources[0] or supportingEvidence
    const sourceText = `${target.sources?.[0] || ""} ${
      target.supportingEvidence || ""
    }`;
    const pageMatch = sourceText.match(/\b(?:page|p\.?)\s*(\d+)\b/i);
    const parsedPage = pageMatch ? parseInt(pageMatch[1], 10) : 1;
    handleOpenCitationInReader(
      {
        fileId: designatedCurrentIep?.id || selectedDocId,
        fileName: designatedCurrentIep?.fileName || "Current IEP.pdf",
        pageNumber: parsedPage,
        printedPageLabel: null,
        excerpt: target.supportingEvidence || null,
        sectionLabel: target.targetName || "Target Evidence",
        verificationStatus: "page_only",
      },
      false
    );
  }, [externalOpenCitationRequest?.seq]);

  return (
    <div ref={workbenchRef} className="space-y-4">
      <input
        ref={localFileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            const arrayBuffer = await file.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = "";
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const base64Data = `data:application/pdf;base64,${window.btoa(
              binary
            )}`;
            const pages = await convertPdfToPageImages(arrayBuffer, 2.4);
            setLocalPdfName(file.name);
            setLocalPdfPages(pages);
            setLocalPdfBase64(base64Data);
            setReviewView("read");
          } catch {
            toast.error("Could not render local PDF file.");
          } finally {
            if (localFileInputRef.current) localFileInputRef.current.value = "";
          }
        }}
        className="hidden"
        aria-label="Open temporary local PDF"
      />

      <div
        className={cn(
          "rounded-2xl bg-[#0B2244] border border-[#C5A059]/45 shadow-[0_20px_50px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.12)] overflow-hidden transition-all relative",
          isExpanded && "ring-2 ring-[#DFBE77]/70"
        )}
      >
        {/* ── CLEAR 3-STEP GUIDED WORKFLOW BAR ── */}
        <div className="relative z-20 px-4 py-3.5 bg-gradient-to-r from-[#0E2A54] via-[#14376B] to-[#0E2A54] border-b border-[#C5A059]/40 flex flex-wrap items-center justify-between gap-3">
          {/* Left-to-Center: Clear 1 -> 2 -> 3 Step Flow */}
          <nav
            aria-label="Records Review Steps"
            className="flex items-center gap-2 flex-wrap min-w-0"
          >
            {/* STEP 1: Select Records */}
            <button
              type="button"
              data-testid="records-drawer-trigger-btn"
              onClick={() => setRecordsDrawerOpen((prev) => !prev)}
              className={cn(
                "h-9 px-3.5 text-xs font-semibold rounded-xl border cursor-pointer inline-flex items-center gap-2 transition-all shadow-sm",
                recordsDrawerOpen || !designatedCurrentIep
                  ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#A68440] text-[#07162B] border-[#FFE394] font-bold"
                  : "bg-[#0A1F3F] border-[#3B5E94] text-[#FFF7E0] hover:bg-[#123160] hover:border-[#DFBE77]"
              )}
            >
              <span
                className={cn(
                  "h-5 w-5 rounded-full text-[10.5px] font-mono font-bold inline-flex items-center justify-center shrink-0",
                  recordsDrawerOpen || !designatedCurrentIep
                    ? "bg-[#07162B] text-[#FFE394]"
                    : "bg-[#173A6E] text-[#FFE394] border border-[#C5A059]/50"
                )}
              >
                1
              </span>
              <FolderOpen className="h-3.5 w-3.5 shrink-0" />
              <span>Select Records:</span>
              <span
                className={cn(
                  "truncate max-w-[150px] sm:max-w-[200px] font-bold",
                  recordsDrawerOpen || !designatedCurrentIep
                    ? "text-[#07162B]"
                    : "text-[#FFE394]"
                )}
              >
                {activeDocShortLabel}
              </span>
              {activeDocGroupBadge && (
                <Badge className="bg-[#081D40]/90 text-[#FFE394] border border-[#C5A059]/40 text-[9.5px] px-1.5 py-0 hidden sm:inline-flex">
                  {activeDocGroupBadge}
                </Badge>
              )}
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-80" />
            </button>

            <span className="text-[#C5A059]/70 font-bold hidden sm:inline">→</span>

            {/* STEP 2: Review IEP & Findings */}
            <button
              type="button"
              data-testid="review-view-tab-read"
              onClick={() => {
                setReviewView("read");
                persistWorkspaceState({ reviewViewMode: "read" }, true);
              }}
              className={cn(
                "h-9 px-3.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer inline-flex items-center gap-2 shadow-sm",
                reviewView === "read"
                  ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#A68440] text-[#07162B] border-[#FFE394] font-bold"
                  : "bg-[#0A1F3F] border-[#3B5E94] text-[#E4EFFC] hover:text-[#FFF7E0] hover:bg-[#123160] hover:border-[#DFBE77]/70"
              )}
            >
              <span
                className={cn(
                  "h-5 w-5 rounded-full text-[10.5px] font-mono font-bold inline-flex items-center justify-center shrink-0",
                  reviewView === "read"
                    ? "bg-[#07162B] text-[#FFE394]"
                    : "bg-[#173A6E] text-[#FFE394] border border-[#C5A059]/50"
                )}
              >
                2
              </span>
              <BookOpen className="h-3.5 w-3.5 shrink-0" />
              <span>Review IEP &amp; Findings</span>
            </button>

            <span className="text-[#C5A059]/70 font-bold hidden sm:inline">→</span>

            {/* STEP 3: Finalize & Send to Blueprint */}
            <button
              type="button"
              data-testid="review-view-tab-prepare"
              onClick={() => {
                setIsFocusReading(false);
                setReviewView("prepare");
                setReturnToCompareBanner(false);
                persistWorkspaceState({ reviewViewMode: "prepare" }, true);
              }}
              className={cn(
                "h-9 px-3.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer inline-flex items-center gap-2 shadow-sm",
                reviewView === "prepare"
                  ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#A68440] text-[#07162B] border-[#FFE394] font-bold"
                  : "bg-[#0A1F3F] border-[#3B5E94] text-[#E4EFFC] hover:text-[#FFF7E0] hover:bg-[#123160] hover:border-[#DFBE77]/70"
              )}
            >
              <span
                className={cn(
                  "h-5 w-5 rounded-full text-[10.5px] font-mono font-bold inline-flex items-center justify-center shrink-0",
                  reviewView === "prepare"
                    ? "bg-[#07162B] text-[#FFE394]"
                    : "bg-[#173A6E] text-[#FFE394] border border-[#C5A059]/50"
                )}
              >
                3
              </span>
              <ClipboardCheck className="h-3.5 w-3.5 shrink-0" />
              <span>Send to Blueprint</span>
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-md text-[10.5px] font-mono font-bold",
                  reviewView === "prepare"
                    ? "bg-[#07162B] text-[#FFE394]"
                    : "bg-[#173A6E] text-[#FFE394]"
                )}
              >
                {activeFindingsCount}
              </span>
            </button>

            {/* Hidden accessible select preserved for existing automated selector hooks */}
            <select
              id="intel-current-iep-selector"
              data-testid="intel-current-iep-selector"
              aria-label="Current IEP record selector"
              value={selectedDocId ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                const nextId = val ? Number(val) : null;
                setSelectedDocId(nextId);
                setLocalPdfPages([]);
                setLocalPdfName(null);
                setFocusedPassage(null);
                setPreviousReadingPosition(null);
                persistWorkspaceState({ selectedDocId: nextId }, false);
              }}
              className="sr-only"
            >
              <option value="">Select Record</option>
              {vaultDocuments.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.fileName}
                </option>
              ))}
            </select>
          </nav>

          {/* Right: Evaluation Comparison View + Saved Findings Pill + Tools Menu */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              data-testid="review-view-tab-compare"
              onClick={() => {
                setIsFocusReading(false);
                setReviewView("compare");
                setReturnToCompareBanner(false);
                persistWorkspaceState({ reviewViewMode: "compare" }, true);
              }}
              className={cn(
                "h-8 px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-all",
                reviewView === "compare"
                  ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#A68440] text-[#07162B] border-[#FFE394] font-bold"
                  : "bg-[#0A1F3F] border-[#3B5E94] text-[#E4EFFC] hover:border-[#DFBE77]/70 hover:text-[#FFF7E0]"
              )}
              title="Compare school and outside evaluations side-by-side with the IEP"
            >
              <GitCompare className="h-3.5 w-3.5 text-[#DFBE77]" />
              <span>Eval Compare</span>
            </button>

            <button
              type="button"
              data-testid="quiet-findings-count-btn"
              onClick={() => {
                setIsFocusReading(false);
                setReviewView("prepare");
                persistWorkspaceState({ reviewViewMode: "prepare" }, true);
              }}
              className={cn(
                "h-8 px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors",
                reviewView === "prepare"
                  ? "bg-[#173A6E] border-[#DFBE77] text-[#FFE394]"
                  : "bg-[#0A1F3F] border-[#3B5E94] text-[#FFF7E0] hover:border-[#DFBE77]/70"
              )}
              title="Review saved findings and meeting questions"
            >
              <Bookmark className="h-3.5 w-3.5 text-[#DFBE77]" />
              <span>Findings</span>
              <span className="text-[#9BB2D6]">·</span>
              <strong className="font-mono text-[#FFE394]">
                {activeFindingsCount}
              </strong>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="records-review-tools-menu-btn"
                  className="h-8 px-2.5 text-xs border-[#3B5E94] bg-[#0A1F3F] text-[#E4EFFC] hover:text-[#FFF7E0] hover:bg-[#14376B] cursor-pointer gap-1.5"
                >
                  <Wrench className="h-3.5 w-3.5 text-[#DFBE77]" />
                  <span>Tools</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 bg-[#01091E] border border-[#284372] text-[#FFF4D4] shadow-2xl p-1.5 z-50"
              >
                <DropdownMenuItem
                  data-testid="tools-menu-run-new-review"
                  onClick={handleRunFullAiReview}
                  disabled={isRunningAiReview}
                  className="cursor-pointer rounded-md px-3 py-2 text-xs flex items-center gap-2 focus:bg-[#092046] focus:text-[#FFE394]"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-[#DFBE77]" />
                  <span>
                    {lastAiReviewSnapshot ? "Run new review" : "Start AI Review"}
                  </span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-[#1A2D50] my-1" />

                <DropdownMenuItem
                  data-testid="tools-menu-focus-reading"
                  onClick={handleToggleFocusReading}
                  className="cursor-pointer rounded-md px-3 py-2 text-xs flex items-center gap-2 focus:bg-[#092046] focus:text-[#FFE394]"
                >
                  <Eye className="h-3.5 w-3.5 text-[#DFBE77]" />
                  <span>
                    {isFocusReading
                      ? "Exit Focus Reading"
                      : "Focus Reading Mode"}
                  </span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  data-testid="tools-menu-parent-prep"
                  onClick={() => setShowLegacyPrepTools((prev) => !prev)}
                  className="cursor-pointer rounded-md px-3 py-2 text-xs flex items-center gap-2 focus:bg-[#092046] focus:text-[#FFE394]"
                >
                  <Users className="h-3.5 w-3.5 text-[#DFBE77]" />
                  <span>
                    {showLegacyPrepTools
                      ? "Hide Parent Preparation & PCS Tools"
                      : "Parent Preparation & PCS Tools"}
                  </span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  data-testid="tools-menu-import-advocate-ready"
                  onClick={onOpenImportModal}
                  className="cursor-pointer rounded-md px-3 py-2 text-xs flex items-center gap-2 focus:bg-[#092046] focus:text-[#FFE394]"
                >
                  <Upload className="h-3.5 w-3.5 text-[#DFBE77]" />
                  <span>Import Advocate Ready Document</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  data-testid="tools-menu-prior-iep-check"
                  onClick={() => setPriorCheckOpen(true)}
                  className="cursor-pointer rounded-md px-3 py-2 text-xs flex items-center gap-2 focus:bg-[#092046] focus:text-[#FFE394]"
                >
                  <History className="h-3.5 w-3.5 text-[#DFBE77]" />
                  <span>Compare Prior / Historical IEP</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-[#1A2D50] my-1" />

                <DropdownMenuItem
                  data-testid="tools-menu-expand-workspace"
                  onClick={onToggleExpand}
                  className="cursor-pointer rounded-md px-3 py-2 text-xs flex items-center gap-2 focus:bg-[#092046] focus:text-[#FFE394]"
                >
                  {isExpanded ? (
                    <>
                      <Minimize2 className="h-3.5 w-3.5 text-[#DFBE77]" />
                      <span>Restore Standard Width</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-3.5 w-3.5 text-[#DFBE77]" />
                      <span>Expand Review Desk</span>
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ── OBVIOUS START AI REVIEW / CONTINUE REVIEW LAUNCH BAR ── */}
        {!isFocusReading && (
          <AiReviewLaunchBar
            currentIepDoc={designatedCurrentIep}
            schoolEvalDocs={schoolEvalDocs}
            outsideEvalDocs={outsideEvalDocs}
            selectedEvalIds={effectiveSelectedEvalIds}
            onToggleEvalId={(docId) => {
              const next = effectiveSelectedEvalIds.includes(docId)
                ? effectiveSelectedEvalIds.filter((id) => id !== docId)
                : [...effectiveSelectedEvalIds, docId];
              setComparedEvaluationIds(next);
              persistWorkspaceState({ selectedEvalIdsForCompare: next }, true);
            }}
            onSelectAllEvalsInGroup={(groupIds, select) => {
              const nextSet = new Set(effectiveSelectedEvalIds);
              for (const id of groupIds) {
                if (select) nextSet.add(id);
                else nextSet.delete(id);
              }
              const next = Array.from(nextSet);
              setComparedEvaluationIds(next);
              persistWorkspaceState({ selectedEvalIdsForCompare: next }, true);
            }}
            onOpenRecordsDrawer={() => setRecordsDrawerOpen(true)}
            hasUnsavedTempPdf={Boolean(localPdfName && localPdfBase64)}
            tempPdfName={localPdfName}
            onSaveTempPdfAsCurrentIep={
              localPdfBase64
                ? () => handleSaveTempPdfToVault("current_iep")
                : undefined
            }
            isSavingTempPdf={uploadToVaultMutation.isPending}
            isRunningReview={isRunningAiReview}
            activeStage={activeAiReviewStage}
            reviewError={aiReviewError}
            lastReviewSnapshot={lastAiReviewSnapshot}
            currentFindingsCount={visibleGuidedFindings.length}
            activeFindingPositionLabel={activeFindingPositionLabel}
            onStartAiReview={handleRunFullAiReview}
            onBeginGuidedReview={handleBeginGuidedReview}
            onContinueGuidedReview={handleContinueGuidedReview}
            onRunNewReview={handleRunFullAiReview}
          />
        )}

        {/* ── COMPACT RECORDS DRAWER ── */}
        <RecordsReviewDrawer
          isOpen={recordsDrawerOpen}
          onClose={() => setRecordsDrawerOpen(false)}
          studentName={studentName}
          vaultDocuments={vaultDocuments}
          vaultLoading={vaultLoading}
          selectedDocId={selectedDocId}
          designatedCurrentIepId={designatedCurrentIep?.id ?? null}
          recordGroupOverrides={recordGroupOverrides}
          onSelectDocument={(docId) => {
            setSelectedDocId(docId);
            setLocalPdfName(null);
            setLocalPdfPages([]);
            setFocusedPassage(null);
            setPreviousReadingPosition(null);
            setReviewView("read");
            persistWorkspaceState(
              { selectedDocId: docId, reviewViewMode: "read" },
              false
            );
          }}
          onAssignRecordGroup={handleAssignRecordGroup}
          onUploadVaultFile={handleUploadVaultFile}
          isUploadingVault={uploadToVaultMutation.isPending}
          localPdfName={localPdfName}
          localPdfPageCount={localPdfPages.length}
          hasLocalPdfBuffer={Boolean(localPdfBase64)}
          onOpenLocalPdfPicker={() => localFileInputRef.current?.click()}
          onSaveLocalPdfToVault={handleSaveTempPdfToVault}
          onClearLocalPdf={() => {
            setLocalPdfName(null);
            setLocalPdfPages([]);
            setLocalPdfBase64(null);
          }}
        />

        {priorCheckOpen && (
          <div className="p-4 bg-[#01091E] border-b border-[#1E3256]">
            <IntelPriorIepDrawer
              isOpen={priorCheckOpen}
              onClose={() => setPriorCheckOpen(false)}
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
              onFocusPassage={(p) => {
                setReviewView("read");
                handleFocusPassage(p, true);
              }}
            />
          </div>
        )}

        {/* ── MAIN REVIEW DESK WORKSPACE AREA ── */}
        <div className="relative flex flex-col xl:flex-row min-h-[640px] bg-[#0B2244]">
          <div className="flex-1 min-w-0 flex flex-col">
            {reviewView === "read" && (
              <div className="flex flex-col lg:flex-row flex-1 min-w-0">
                <div className="flex-1 min-w-0 flex flex-col">
                  <IntelDocumentSurface
                    studentName={studentName}
                    selectedDocument={selectedDocument}
                    vaultDocStatus={vaultDocStatus}
                    vaultDocMessage={
                      vaultDocQueryError?.message ||
                      vaultDocPayload?.message ||
                      null
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
                      updateScopedDocWork((prev) => ({
                        ...prev,
                        pageNumber: page,
                      }))
                    }
                    onZoomChange={(zoom) =>
                      updateScopedDocWork((prev) => ({
                        ...prev,
                        zoomPercent: zoom,
                      }))
                    }
                    focusedPassage={focusedPassage}
                    onFocusPassage={handleFocusPassage}
                    onClearFocusedPassage={() => setFocusedPassage(null)}
                    previousReadingPosition={previousReadingPosition}
                    onReturnToReadingPosition={handleReturnToReadingPosition}
                    localPdfPages={localPdfPages}
                    localPdfName={localPdfName}
                    onLoadLocalPdf={(name, pages, rawBase64) => {
                      setLocalPdfName(name);
                      setLocalPdfPages(pages);
                      setLocalPdfBase64(rawBase64 || null);
                    }}
                    onClearLocalPdf={() => {
                      setLocalPdfName(null);
                      setLocalPdfPages([]);
                      setLocalPdfBase64(null);
                    }}
                    onSaveLocalPdfToVault={
                      localPdfBase64
                        ? () => handleSaveTempPdfToVault("current_iep")
                        : undefined
                    }
                    isSavingLocalPdfToVault={uploadToVaultMutation.isPending}
                    onOpenRecordsDrawer={() => setRecordsDrawerOpen(true)}
                    onUploadPdfToVault={(file) =>
                      handleUploadVaultFile({
                        file,
                        targetGroup:
                          vaultDocuments.length === 0
                            ? "current_iep"
                            : "school_evaluation",
                      })
                    }
                    onCaptureFindingFromSource={handleCaptureFindingFromSource}
                    activeChapterCategory={activeChapterMeta.shortLabel}
                    activeChapterSection={activeChapterMeta.iepSectionName}
                    isReviewCollapsed={isFocusReading}
                    onToggleReviewCollapse={handleToggleFocusReading}
                    returnToCompareBanner={returnToCompareBanner}
                    onReturnToCompare={() => {
                      setReturnToCompareBanner(false);
                      setReviewView("compare");
                    }}
                    returnToIepBanner={isViewingEvaluationInReader}
                    onReturnToIep={handleReturnToIepFromEvaluation}
                    scrollTriggerSeq={scrollTriggerSeq}
                  />
                </div>

                {!isFocusReading && (
                  <GuidedIepReviewPanel
                    studentName={studentName}
                    currentIepDoc={designatedCurrentIep}
                    activeOpenDoc={selectedDocument}
                    isViewingEvaluationInReader={isViewingEvaluationInReader}
                    onReturnToIepFromEvaluation={handleReturnToIepFromEvaluation}
                    findings={guidedFindings}
                    targets={targets}
                    workspaceStatus={workspaceStatus}
                    activeFindingId={activeGuidedFindingId}
                    findingQuestionsMap={findingQuestionsMap}
                    aiDraftFindingIds={aiDraftFindingIds}
                    onSelectFindingAndSyncReader={
                      handleSelectGuidedFindingAndSyncReader
                    }
                    onReturnToActiveFindingPassage={
                      handleSelectGuidedFindingAndSyncReader
                    }
                    onOpenEvaluationCitation={
                      handleOpenEvaluationCitationFromGuided
                    }
                    onOpenIepSectionPageOnly={(params) => {
                      setIepReturnState(null);
                      handleOpenCitationInReader(
                        {
                          fileId: params.fileId,
                          fileName: params.fileName,
                          pageNumber: params.pageNumber,
                          printedPageLabel: null,
                          excerpt: null,
                          sectionLabel: `${params.sectionLabel} (Section Page Only)`,
                          boundingBoxes: [],
                          verificationStatus: "page_only",
                        },
                        false
                      );
                    }}
                    onSaveFindingDecision={handleSaveGuidedFindingDecision}
                    onAddMeetingQuestionDecision={
                      handleAddGuidedMeetingQuestionDecision
                    }
                    onMarkReviewedDecision={handleMarkGuidedReviewedDecision}
                    onDismissSuggestionDecision={
                      handleDismissGuidedSuggestionDecision
                    }
                    onRestoreDismissedFinding={handleRestoreDismissedFinding}
                    onSendFindingToBlueprint={handleSendFindingToBlueprint}
                    onOpenFindingInStage={handleOpenFindingInStage}
                    onRemoveFindingFromBlueprint={
                      handleRemoveFindingFromBlueprintOnly
                    }
                    onRequestDeleteFinding={(finding) =>
                      setFindingPendingDelete(finding)
                    }
                    onStartAiReview={handleRunFullAiReview}
                    onChooseIep={() => setRecordsDrawerOpen(true)}
                    isRunningReview={isRunningAiReview}
                  />
                )}
              </div>
            )}

            {reviewView === "compare" && (
              <RecordsCompareView
                studentContactId={studentContactId}
                workspaceId={workspaceId}
                studentName={studentName}
                vaultDocuments={vaultDocuments}
                designatedCurrentIepId={designatedCurrentIep?.id ?? null}
                recordGroupOverrides={recordGroupOverrides}
                selectedEvalIds={effectiveSelectedEvalIds}
                onToggleEvalId={(docId) => {
                  const next = effectiveSelectedEvalIds.includes(docId)
                    ? effectiveSelectedEvalIds.filter((id) => id !== docId)
                    : [...effectiveSelectedEvalIds, docId];
                  setComparedEvaluationIds(next);
                  persistWorkspaceState(
                    { selectedEvalIdsForCompare: next },
                    true
                  );
                }}
                onOpenRecordsDrawer={() => setRecordsDrawerOpen(true)}
                onOpenUploadPicker={() => setRecordsDrawerOpen(true)}
                onOpenCitationInReader={(citation) =>
                  handleOpenCitationInReader(citation, true)
                }
                confirmedFindingIds={confirmedFindingIdsSet}
                blueprintTargetSourceIds={blueprintTargetIdsSet}
                onConfirmConnectionAsFinding={(params) => {
                  const findingId = `fnd-${params.connectionId}`;
                  const created: IepIntelFinding = {
                    id: findingId,
                    category: params.section,
                    section: params.section,
                    text: params.findingText,
                    quote: `${params.evalCitationLabel}: "${params.evalExcerpt}"`,
                    status: "keep",
                    isCustom: true,
                    advocateConfirmed: true,
                    reviewDecision: "saved",
                    proposedQuestion: params.meetingQuestion,
                    sourceRef: {
                      documentId: params.evalFileId,
                      fileName: params.evalFileName,
                      pdfPageNumber: params.evalPageNumber,
                      excerpt: params.evalExcerpt,
                      boundingBoxes: params.evalBoundingBoxes,
                      verificationStatus: params.verificationStatus,
                    },
                  };
                  handleSaveConfirmedFinding(created);
                }}
                onAddConnectionToBlueprint={(params) => {
                  const findingId = `fnd-${params.connectionId}`;
                  const matchedConn = guidedComparisonPayload?.connections?.find(
                    (c: any) => c.id === params.connectionId
                  );
                  const fnd: IepIntelFinding = {
                    id: findingId,
                    category: params.section,
                    section: params.section,
                    text: params.findingText,
                    quote: params.evalCitationLabel,
                    status: "keep",
                    isCustom: true,
                    proposedQuestion: params.meetingQuestion,
                    sourceRef: matchedConn?.iepPassage
                      ? {
                          documentId: matchedConn.iepPassage.fileId,
                          fileName: matchedConn.iepPassage.fileName,
                          pdfPageNumber: matchedConn.iepPassage.pdfPageNumber,
                          printedPageLabel: matchedConn.iepPassage.printedPageLabel,
                          excerpt: matchedConn.iepPassage.excerpt,
                          boundingBoxes: matchedConn.iepPassage.boundingBoxes,
                          verificationStatus: matchedConn.iepPassage.verificationStatus,
                        }
                      : undefined,
                    evalSourceRef: matchedConn?.evalSource
                      ? {
                          documentId: matchedConn.evalSource.fileId,
                          fileName: matchedConn.evalSource.fileName,
                          recordGroup: matchedConn.evalSource.recordGroup,
                          documentDate: matchedConn.evalSource.documentDate,
                          pdfPageNumber: matchedConn.evalSource.pdfPageNumber,
                          printedPageLabel: matchedConn.evalSource.printedPageLabel,
                          excerpt: matchedConn.evalSource.excerpt,
                          boundingBoxes: matchedConn.evalSource.boundingBoxes,
                          verificationStatus: matchedConn.evalSource.verificationStatus,
                        }
                      : undefined,
                  };
                  handleSendFindingToBlueprint(fnd, params.meetingQuestion);
                }}
              />
            )}

            {reviewView === "prepare" && (
              <RecordsPrepareView
                findings={findings}
                targets={targets}
                workspaceStatus={workspaceStatus}
                activeChapter={activeChapter}
                onSelectChapter={(ch) => {
                  setActiveChapter(ch);
                  persistWorkspaceState({ activeChapter: ch }, true);
                }}
                findingQuestionsMap={findingQuestionsMap}
                findingPrioritiesMap={findingPrioritiesMap}
                aiDraftFindingIds={aiDraftFindingIds}
                savedMeetingQuestions={savedQuestions}
                onUpdateFinding={(
                  findingId,
                  updates,
                  meetingQuestion,
                  priority,
                  confirmAiDraft
                ) => {
                  let updatedItem: IepIntelFinding | null = null;
                  const nextFindings = findings.map((f) => {
                    if (f.id === findingId) {
                      updatedItem = {
                        ...f,
                        ...updates,
                        ...(priority ? { priority } : {}),
                        ...(meetingQuestion !== undefined
                          ? { proposedQuestion: meetingQuestion }
                          : {}),
                      };
                      return updatedItem;
                    }
                    return f;
                  });
                  onUpdateFindings(nextFindings);

                  if (updatedItem) {
                    const syncedTargets = syncFindingUpdateToTargets(
                      updatedItem,
                      targets,
                      meetingQuestion ?? findingQuestionsMap[findingId]
                    );
                    if (syncedTargets !== targets) {
                      onUpdateTargets(syncedTargets);
                    }
                  }

                  if (meetingQuestion !== undefined) {
                    const nextQ = {
                      ...findingQuestionsMap,
                      [findingId]: meetingQuestion,
                    };
                    setFindingQuestionsMap(nextQ);
                  }
                  if (priority) {
                    const nextP = {
                      ...findingPrioritiesMap,
                      [findingId]: priority,
                    };
                    setFindingPrioritiesMap(nextP);
                  }
                  if (confirmAiDraft) {
                    setAiDraftFindingIds((prev) =>
                      prev.filter((id) => id !== findingId)
                    );
                  }
                }}
                onAddManualFinding={(params) => {
                  const id = `fnd-manual-${Date.now()}`;
                  const created: IepIntelFinding = {
                    id,
                    category: params.category,
                    section: params.section,
                    text: params.text,
                    quote: params.quote,
                    status: params.priority === "high" ? "important" : "keep",
                    priority: params.priority,
                    proposedQuestion: params.meetingQuestion,
                    isCustom: true,
                    advocateConfirmed: true,
                    reviewDecision: "saved",
                  };
                  onUpdateFindings([created, ...findings]);
                  if (params.meetingQuestion) {
                    setFindingQuestionsMap((prev) => ({
                      ...prev,
                      [id]: params.meetingQuestion!,
                    }));
                  }
                  setFindingPrioritiesMap((prev) => ({
                    ...prev,
                    [id]: params.priority,
                  }));
                  toast.success("Saved confirmed finding");
                }}
                onDeleteFinding={(findingId) => {
                  const targetFinding = findings.find(
                    (f) => f.id === findingId
                  );
                  if (targetFinding) {
                    setFindingPendingDelete(targetFinding);
                  } else {
                    onUpdateFindings(
                      findings.filter((f) => f.id !== findingId)
                    );
                  }
                }}
                onRequestDeleteFinding={(finding) =>
                  setFindingPendingDelete(finding)
                }
                onRemoveFindingFromBlueprint={
                  handleRemoveFindingFromBlueprintOnly
                }
                onDismissFinding={handleDismissGuidedSuggestionDecision}
                onRestoreDismissedFinding={handleRestoreDismissedFinding}
                onOpenFindingInStage={handleOpenFindingInStage}
                onSendFindingToBlueprint={handleSendFindingToBlueprint}
                onSendMultipleFindingsToBlueprint={(findingIds) => {
                  const selectedItems = findings.filter((f) =>
                    findingIds.includes(f.id)
                  );
                  let workingTargets = [...targets];
                  let addedCount = 0;
                  for (const finding of selectedItems) {
                    const q =
                      findingQuestionsMap[finding.id] ||
                      finding.proposedQuestion ||
                      finding.text;
                    const res = upsertConnectedTargetFromFinding({
                      finding: {
                        ...finding,
                        advocateConfirmed: true,
                        aiGeneratedDraft: false,
                        reviewDecision: "saved",
                        proposedQuestion: q,
                      },
                      targets: workingTargets,
                      meetingQuestion: q,
                    });
                    workingTargets = res.updatedTargets;
                    if (!res.wasExisting) addedCount++;
                  }
                  onUpdateTargets(workingTargets);
                  toast.success(
                    addedCount > 0
                      ? `Sent ${addedCount} connected finding(s) to 2. Blueprint`
                      : "Updated connected items in 2. Blueprint"
                  );
                }}
                onAddMeetingQuestion={(params) => {
                  handleSaveMeetingQuestion({
                    id: `mq-${Date.now()}`,
                    section: params.section,
                    question: params.question,
                    sourceCitation: params.sourceCitation,
                    priority: params.priority,
                    confirmed: true,
                    addedToBlueprint: false,
                  });
                  toast.success("Saved meeting question");
                }}
                onUpdateMeetingQuestion={(id, updates) => {
                  const next = savedQuestions.map((q) =>
                    q.id === id ? { ...q, ...updates } : q
                  );
                  setSavedQuestions(next);
                  persistWorkspaceState(
                    { savedMeetingQuestions: next },
                    true
                  );
                }}
                onDeleteMeetingQuestion={(id) => {
                  const next = savedQuestions.filter((q) => q.id !== id);
                  setSavedQuestions(next);
                  persistWorkspaceState(
                    { savedMeetingQuestions: next },
                    true
                  );
                }}
                onAddQuestionToBlueprint={(q) => {
                  const targetId = `target-from-q-${q.id}`;
                  if (targets.some((t) => t.id === targetId)) {
                    toast.info("Question is already in 2. Blueprint.");
                    return;
                  }
                  const newTarget: MeetingTarget = {
                    id: targetId,
                    targetName: `${q.section} Question`,
                    iepSection: q.section,
                    sectionOrder: 4,
                    targetOrder: targets.length + 1,
                    quickAdvocateSayThis: q.question,
                    fullAdvocateScript: q.question,
                    putItHereLocation: q.section,
                    possibleIepWording: q.question,
                    whyWeWantIt: q.question,
                    supportingEvidence:
                      q.sourceCitation || "Prepared Meeting Question",
                    sources: [q.sourceCitation || "Records Review"],
                    ifTeamDisagrees: "Request Prior Written Notice (PWN).",
                    parentWhatWeWant: q.question,
                    parentWhyWeWantIt: q.question,
                    parentSupportingEvidence: q.sourceCitation || "",
                    requestRaised: false,
                    meetingStatus: "NOT_DISCUSSED",
                    pwnNeeded: false,
                    addedToIep: false,
                    followUpNeeded: false,
                    isCustom: true,
                  };
                  onUpdateTargets([...targets, newTarget]);
                  const next = savedQuestions.map((item) =>
                    item.id === q.id
                      ? { ...item, addedToBlueprint: true }
                      : item
                  );
                  setSavedQuestions(next);
                  persistWorkspaceState(
                    { savedMeetingQuestions: next },
                    true
                  );
                  toast.success("Added question to 2. Blueprint");
                }}
                onOpenCitationInReader={(citation) =>
                  handleOpenCitationInReader(citation, false)
                }
              />
            )}
          </div>
        </div>
      </div>

      {/* ── SECONDARY TOOLS DRAWER (Opened discreetly from Tools Menu) ── */}
      {showLegacyPrepTools && (
        <div
          data-testid="secondary-parent-prep-tools-panel"
          className="rounded-2xl bg-[#01091E] border border-[#1E3256] overflow-hidden shadow-xl"
        >
          <div className="px-4 py-3 bg-[#020C28] border-b border-[#1E3256] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-[#071836] border border-[#284372] flex items-center justify-center">
                <Wrench className="h-3.5 w-3.5 text-[#DFBE77]" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-serif font-bold text-[#FFF4D4]">
                  Parent Preparation &amp; Import Tools
                </span>
                <p className="text-[11px] text-[#8EA6C9]">
                  Parent Intel, Parent Concern Statement (PCS) editor, and
                  existing preparation tools.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowLegacyPrepTools(false)}
              className="text-[#8EA6C9] hover:text-[#FFF4D4] p-1 rounded-md hover:bg-[#081A38] cursor-pointer"
              aria-label="Close Parent Preparation Tools"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4 sm:p-5 space-y-6">{legacyToolsNode}</div>
        </div>
      )}

      {/* ── CONNECTED FINDING DELETE / WITHDRAW CONFIRMATION MODAL ── */}
      <DeleteFindingConfirmModal
        isOpen={Boolean(findingPendingDelete)}
        onClose={() => setFindingPendingDelete(null)}
        finding={findingPendingDelete}
        targets={targets}
        onRemoveFromBlueprintOnly={handleRemoveFindingFromBlueprintOnly}
        onArchiveWithdrawnPreserveHistory={
          handleArchiveWithdrawnFindingPreserveHistory
        }
        onConfirmPermanentDelete={handleConfirmPermanentDeleteFinding}
      />
    </div>
  );
}
