import React, { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import {
  Users,
  ChevronDown,
  Loader2,
  Save,
  Download,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PageIdBadge from "@/components/PageIdBadge";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

import type {
  WorkspaceTab,
  MeetingWorkspaceStatus,
  PrepStep,
  IepIntelFinding,
  ParentIntelConcern,
  MeetingTarget,
  ParkingLotItem,
  AdditionalItem,
  CloseoutChecks,
} from "../components/meeting-workspace/types";
import { HeaderSection } from "../components/meeting-workspace/HeaderSection";
import { PrepPipeline } from "../components/meeting-workspace/prep/PrepPipeline";
import { Step1IepIntel } from "../components/meeting-workspace/prep/Step1IepIntel";
import { Step2ParentIntel } from "../components/meeting-workspace/prep/Step2ParentIntel";
import { Step3PcsEditor } from "../components/meeting-workspace/prep/Step3PcsEditor";
import { BlueprintView } from "../components/meeting-workspace/blueprint/BlueprintView";
import { MeetingModeView } from "../components/meeting-workspace/live/MeetingModeView";
import { ImportAdvocateReadyModal } from "../components/meeting-workspace/prep/ImportAdvocateReadyModal";
import { ParentConcernStatementWorkspace } from "../components/meeting-workspace/pcs/ParentConcernStatementWorkspace";
import type { PcsMetadata } from "../components/meeting-workspace/pcs/types";

export default function MeetingWorkspace() {
  const params = useParams<{ studentId?: string }>();
  const [, setLocation] = useLocation();

  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const rawStudentId = params.studentId || searchParams?.get("studentId");
  const parsedStudentId = rawStudentId ? parseInt(rawStudentId, 10) : null;

  // Contact / Student list
  const { data: contacts } = trpc.contacts.list.useQuery();

  // Active student selection
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(parsedStudentId);

  useEffect(() => {
    if (parsedStudentId) {
      setSelectedStudentId(parsedStudentId);
    } else if (contacts && contacts.length > 0 && !selectedStudentId) {
      const jeremiah = contacts.find(
        (c) =>
          c.firstName?.trim().toLowerCase() === "jeremiah" &&
          c.lastName?.trim().toLowerCase() === "mitchell"
      );
      setSelectedStudentId(jeremiah ? jeremiah.id : contacts[0].id);
    }
  }, [parsedStudentId, contacts, selectedStudentId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const search = new URLSearchParams(window.location.search);
      if (search.get("import") === "true" || search.get("import") === "open" || search.get("tab") === "import") {
        setIsImportModalOpen(true);
      }
    }
  }, []);

  const activeStudent = contacts?.find((c) => c.id === selectedStudentId) || null;
  const studentName = activeStudent
    ? `${activeStudent.firstName} ${activeStudent.lastName}`
    : "Student";
  const caseId = activeStudent?.caseId || (selectedStudentId === 120034 ? "WP-2026-0029" : null);

  // Workspace Data Query
  const {
    data: workspace,
    isLoading: workspaceLoading,
    refetch: refetchWorkspace,
  } = trpc.meetingWorkspace.getOrCreate.useQuery(
    { studentContactId: selectedStudentId || 0 },
    { enabled: !!selectedStudentId && selectedStudentId > 0 }
  );

  // Local State synchronized with Workspace
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("ASSEMBLY");
  const [prepStep, setPrepStep] = useState<PrepStep>("iep_intel");
  const [meetingStatus, setMeetingStatus] = useState<MeetingWorkspaceStatus>("PREPARING");
  const [meetingType] = useState<string>("Annual IEP Meeting");
  const [meetingDate] = useState<string>("October 21, 2026 · 10:00 AM");

  // Intel & Strategy data
  const [iepFindings, setIepFindings] = useState<IepIntelFinding[]>([]);
  const [detectedIepOrder, setDetectedIepOrder] = useState<string[]>([
    "Parent Concerns",
    "Present Levels / Academics",
    "Special Factors",
    "Annual Goals",
    "Accommodations / Supports",
    "Related Services / AAC",
    "Placement / LRE",
    "ESY & Transportation",
  ]);
  const [parentConcerns, setParentConcerns] = useState<ParentIntelConcern[]>([]);
  const [pcsText, setPcsText] = useState<string>("");
  const [pcsApproved, setPcsApproved] = useState<boolean>(false);
  const [targets, setTargets] = useState<MeetingTarget[]>([]);
  const [parkingLot, setParkingLot] = useState<ParkingLotItem[]>([]);
  const [additionalItems, setAdditionalItems] = useState<AdditionalItem[]>([]);
  const [closeoutChecks, setCloseoutChecks] = useState<CloseoutChecks>({
    allRequestsRaised: false,
    pwnIdentified: false,
    agreedLocationsClear: false,
    followUpAssigned: false,
    nextMeetingDiscussed: false,
  });

  // Manual import modal & status
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isManualImport, setIsManualImport] = useState(false);

  function safeParseJson<T>(val: any, fallback: T): T {
    if (!val) return fallback;
    if (typeof val === "object") return val as T;
    if (typeof val === "string") {
      try {
        return JSON.parse(val) as T;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }

  // Sync loaded DB data into local state
  useEffect(() => {
    if (workspace) {
      if (workspace.status) setMeetingStatus(workspace.status as MeetingWorkspaceStatus);
      if (workspace.detectedIepOrder) {
        const order = safeParseJson<string[]>(workspace.detectedIepOrder, []);
        if (order.length > 0) setDetectedIepOrder(order);
      }
      if (workspace.parentConcernStatement) setPcsText(workspace.parentConcernStatement);
      if (typeof workspace.pcsApproved === "boolean") setPcsApproved(workspace.pcsApproved);

      let loadedTargets: MeetingTarget[] = [];
      if (workspace.meetingTargets) {
        loadedTargets = safeParseJson<MeetingTarget[]>(workspace.meetingTargets, []);
        if (loadedTargets.length > 0) {
          setTargets(loadedTargets);
          try { if (selectedStudentId) localStorage.setItem(`mw_backup_${selectedStudentId}`, JSON.stringify(loadedTargets)); } catch {}
        } else if (selectedStudentId) {
          try {
            const cached = localStorage.getItem(`mw_backup_${selectedStudentId}`);
            if (cached) {
              const parsedCache = JSON.parse(cached);
              if (Array.isArray(parsedCache) && parsedCache.length > 0) {
                loadedTargets = parsedCache;
                setTargets(parsedCache);
                saveCurrentState({ meetingTargets: parsedCache });
              }
            }
          } catch {}
        }
        if (loadedTargets.some((t) => t.sources?.some((s) => s.toLowerCase().includes("import")))) setIsManualImport(true);
      }

      // Sync or auto-derive IEP Intel Findings
      const existingFindings = workspace.iepIntelFindings ? safeParseJson<IepIntelFinding[]>(workspace.iepIntelFindings, []) : [];
      if (existingFindings.length > 0) {
        setIepFindings(existingFindings);
      } else if (loadedTargets.length > 0) {
        const derivedFindings: IepIntelFinding[] = loadedTargets
          .filter((t) => t.iepSection !== "Parent Concerns")
          .map((t, idx) => ({
            id: `fnd-derived-${t.id || idx + 1}`,
            category: t.iepSection || "Accommodations / Supports",
            section: t.iepSection || "Accommodations / Supports",
            text: `${t.targetName}: ${t.whyWeWantIt || t.quickAdvocateSayThis || ""}`,
            quote: t.supportingEvidence || t.possibleIepWording || undefined,
            status: (t.iepSection === "Accommodations / Supports" || t.iepSection === "Special Education Services") ? "important" : "keep",
            isCustom: false,
          }));
        setIepFindings(derivedFindings);
      }

      // Sync or auto-derive Parent Intel Concerns
      const existingConcerns = workspace.parentIntelConcerns ? safeParseJson<ParentIntelConcern[]>(workspace.parentIntelConcerns, []) : [];
      if (existingConcerns.length > 0) {
        setParentConcerns(existingConcerns);
      } else if (loadedTargets.length > 0) {
        const derivedConcerns: ParentIntelConcern[] = loadedTargets
          .filter((t) => t.iepSection === "Parent Concerns" || t.parentWhatWeWant || t.parentWhyWeWantIt)
          .map((t, idx) => ({
            id: `pci-derived-${t.id || idx + 1}`,
            topic: t.targetName,
            concern: t.parentWhyWeWantIt || t.whyWeWantIt || t.parentWhatWeWant || t.quickAdvocateSayThis || "",
            source: t.sources?.[0] || "Advocate Ready Document",
            status: "keep",
            isCustom: false,
          }));
        setParentConcerns(derivedConcerns);
      }

      if (workspace.parkingLot) setParkingLot(safeParseJson<ParkingLotItem[]>(workspace.parkingLot, []));
      if (workspace.additionalItems) setAdditionalItems(safeParseJson<AdditionalItem[]>(workspace.additionalItems, []));
      if (workspace.closeoutChecks) {
        setCloseoutChecks(
          safeParseJson<any>(workspace.closeoutChecks, {
            allRequestsRaised: false, pwnIdentified: false, agreedLocationsClear: false, followUpAssigned: false, nextMeetingDiscussed: false,
          })
        );
      }
      if (workspace.status === "LIVE") {
        setActiveTab("MEETING_MODE");
      } else if (workspace.activeTab) {
        setActiveTab(workspace.activeTab as WorkspaceTab);
        if (workspace.prepStep) setPrepStep(workspace.prepStep as PrepStep);
      } else if (loadedTargets.length > 0) {
        setActiveTab("BLUEPRINT");
        setPrepStep("blueprint");
      }
    }
  }, [workspace]);

  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(new Date());

  // Mutations
  const saveMutation = trpc.meetingWorkspace.save.useMutation({
    onSuccess: () => setLastSavedAt(new Date()),
    onError: (err) => toast.error(`Error saving workspace: ${err.message}`),
  });

  const runIepIntelMutation = trpc.meetingWorkspace.runIepIntel.useMutation({
    onSuccess: (data) => {
      setIepFindings(data.findings as IepIntelFinding[]);
      if (data.detectedOrder?.length) setDetectedIepOrder(data.detectedOrder);
      toast.success("IEP Intel analysis complete");
      saveCurrentState({ iepIntelFindings: data.findings, detectedIepOrder: data.detectedOrder });
    },
    onError: (err) => toast.error(`IEP Intel error: ${err.message}`),
  });

  const runParentIntelMutation = trpc.meetingWorkspace.runParentIntel.useMutation({
    onSuccess: (data) => {
      setParentConcerns(data.concerns as ParentIntelConcern[]);
      toast.success("Parent Intel extracted from authorized case records");
      saveCurrentState({ parentIntelConcerns: data.concerns });
    },
    onError: (err) => toast.error(`Parent Intel error: ${err.message}`),
  });

  const generatePcsMutation = trpc.meetingWorkspace.generatePcsDraft.useMutation({
    onSuccess: (data) => {
      setPcsText(data.pcsDraft);
      toast.success("Parent Concern Statement draft generated");
      saveCurrentState({ parentConcernStatement: data.pcsDraft });
    },
    onError: (err) => toast.error(`PCS generation error: ${err.message}`),
  });

  const buildBlueprintMutation = trpc.meetingWorkspace.buildBlueprint.useMutation({
    onSuccess: (data) => {
      setTargets(data.targets as MeetingTarget[]);
      if (data.detectedOrder?.length) setDetectedIepOrder(data.detectedOrder);
      toast.success(`IEP Blueprint constructed with ${data.targets.length} meeting targets`);
      saveCurrentState({ meetingTargets: data.targets, detectedIepOrder: data.detectedOrder });
    },
    onError: (err) => toast.error(`Blueprint build error: ${err.message}`),
  });

  const completeMeetingMutation = trpc.meetingWorkspace.completeMeeting.useMutation({
    onSuccess: () => {
      setMeetingStatus("COMPLETED");
      toast.success("IEP Meeting completed and synchronized to case records");
      refetchWorkspace();
    },
    onError: (err) => toast.error(`Meeting complete error: ${err.message}`),
  });

  // Auto-save debouncing ref
  const saveTimeoutRef = useRef<any>(null);

  // Helper to persist current state
  const saveCurrentState = (partialUpdates?: any, isDebounced = false) => {
    const updatedTargets = partialUpdates?.meetingTargets ?? targets;
    const updatedOrder = partialUpdates?.detectedIepOrder ?? detectedIepOrder;
    const updatedParking = partialUpdates?.parkingLot ?? parkingLot;
    const updatedAdditional = partialUpdates?.additionalItems ?? additionalItems;
    const updatedChecks = partialUpdates?.closeoutChecks ?? closeoutChecks;

    // Instant local backup so data is never lost even if network drops
    if (selectedStudentId && updatedTargets) {
      try {
        localStorage.setItem(`mw_backup_${selectedStudentId}`, JSON.stringify(updatedTargets));
      } catch (e) {}
    }

    if (!workspace?.id) return;

    const serialize = (val: any) => {
      if (val === undefined || val === null) return undefined;
      return typeof val === "string" ? val : JSON.stringify(val);
    };

    const performSave = () => {
      saveMutation.mutate({
        id: workspace.id,
        status: partialUpdates?.status ?? meetingStatus,
        activeTab: partialUpdates?.activeTab ?? activeTab,
        prepStep: partialUpdates?.prepStep ?? prepStep,
        meetingTitle: meetingType,
        meetingDate: meetingDate,
        detectedIepOrder: serialize(updatedOrder),
        iepIntelFindings: serialize(partialUpdates?.iepIntelFindings ?? iepFindings),
        parentIntelConcerns: serialize(partialUpdates?.parentIntelConcerns ?? parentConcerns),
        parentConcernStatement: partialUpdates?.parentConcernStatement ?? pcsText,
        pcsApproved: partialUpdates?.pcsApproved ?? pcsApproved,
        meetingTargets: serialize(updatedTargets),
        parkingLot: serialize(updatedParking),
        additionalItems: serialize(updatedAdditional),
        closeoutChecks: serialize(updatedChecks),
      });
    };

    if (isDebounced) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        performSave();
      }, 400);
    } else {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      performSave();
    }
  };

  const handleSavePcsFromWorkspace = async (newText: string, updatedMetadata: PcsMetadata) => {
    setPcsText(newText);
    const updatedChecks = {
      ...closeoutChecks,
      pcsMetadata: updatedMetadata,
    };
    setCloseoutChecks(updatedChecks);
    saveCurrentState({
      parentConcernStatement: newText,
      closeoutChecks: updatedChecks,
    });
  };

  const handleBack = () => {
    if (selectedStudentId) {
      setLocation(`/students/${selectedStudentId}`);
    } else if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/students");
    }
  };

  const handleStudentSwitch = (studentId: number) => {
    setSelectedStudentId(studentId);
    setLocation(`/meeting-workspace/${studentId}`);
  };

  const handleImportTargets = (
    importedTargets: MeetingTarget[],
    mode: "append" | "replace",
    newOrder?: string[]
  ) => {
    let merged: MeetingTarget[];
    if (mode === "replace") {
      merged = importedTargets;
    } else {
      const existingIds = new Set(targets.map((t) => t.id));
      const filteredNew = importedTargets.map((t, idx) => ({
        ...t,
        id: existingIds.has(t.id) ? `imp-${Date.now()}-${idx + 1}` : t.id,
      }));
      merged = [...targets, ...filteredNew];
    }
    setTargets(merged);
    setIsManualImport(true);
    if (newOrder && newOrder.length > 0) {
      setDetectedIepOrder(newOrder);
    }
    saveCurrentState({
      meetingTargets: merged,
      detectedIepOrder: newOrder || detectedIepOrder,
      prepStep: "blueprint",
    });
    setPrepStep("blueprint");
    setActiveTab("BLUEPRINT");
    toast.success(`Added ${importedTargets.length} imported targets to Blueprint`);
  };

  // Pipeline step completions
  const hasIepIntel = iepFindings.some((f) => f.status === "keep" || f.status === "important");
  const hasParentIntel = parentConcerns.some((c) => c.status === "keep");
  const hasBlueprint = targets.length > 0;
  const isReady = hasBlueprint && meetingStatus === "READY";

  return (
    <ScopedErrorBoundary>
      <div className="min-h-screen bg-[#07162B] bg-[radial-gradient(ellipse_at_50%_0%,#102B4E_0%,#07162B_55%,#030D1A_100%)] text-[#FFF4D4] p-4 sm:p-6 lg:p-8 flex flex-col space-y-6">
        {/* Top Student Switcher Bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap pb-3 border-b border-[#3A2C18]/80">
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#05142B]/90 border border-[#3A2C18] text-xs font-semibold text-[#FFF4D4] hover:border-[#C5A059]/60 shadow-[0_4px_16px_rgba(0,0,0,0.6)] transition-all cursor-pointer">
                  <Users className="w-3.5 h-3.5 text-[#DFBE77]" />
                  <span>Student: <strong className="text-[#FFE394]">{studentName}</strong></span>
                  {caseId && (
                    <span className="px-2 py-0.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[11px] font-mono font-bold text-[#FFE394]">
                      Case #{caseId.replace(/^Case\s*#?/i, "")}
                    </span>
                  )}
                  <ChevronDown className="w-3 h-3 text-[#A69371]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] w-64 max-h-80 overflow-y-auto shadow-2xl">
                {contacts?.map((c) => {
                  const cCaseId = c.caseId || (c.id === 120034 ? "WP-2026-0029" : null);
                  return (
                    <DropdownMenuItem
                      key={c.id}
                      onClick={() => handleStudentSwitch(c.id)}
                      className="flex items-center justify-between gap-2 text-xs hover:bg-[#071E3D] hover:text-[#FFF4D4] cursor-pointer py-2 text-[#D8C7A5]"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-[#FFF4D4]">{c.firstName} {c.lastName}</span>
                        {cCaseId && (
                          <span className="text-[10.5px] font-mono text-[#FFE394]/90 font-medium">
                            Case #{cCaseId.replace(/^Case\s*#?/i, "")}
                          </span>
                        )}
                      </div>
                      {c.id === selectedStudentId && (
                        <Badge className="bg-[#C5A059]/20 text-[#FFE394] border-[#C5A059]/40 text-[10px] py-0 shrink-0">Active</Badge>
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {saveMutation.isPending && (
              <span className="text-[11px] text-[#A69371] flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin text-[#FFE394]" />
                Saving to D1...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
              className="text-xs h-8 border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] hover:border-[#C5A059]/60 gap-1.5 cursor-pointer shadow-sm font-semibold"
              title="Paste or drop an Advocate Ready document to import targets"
            >
              <Download className="w-3.5 h-3.5 text-[#DFBE77]" />
              <span>📥 Import Advocate Ready</span>
            </Button>
            <Button
              onClick={() => saveCurrentState()}
              variant="outline"
              size="sm"
              className="text-xs h-8 border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] hover:border-[#C5A059]/60 gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-[#DFBE77]" />
              Save Workspace
            </Button>
            <PageIdBadge id="PG-043" name="⚡ Meeting Workspace" />
          </div>
        </div>

        {/* Header Section (Title, Tabs, Status, Quick Live Launch, Live D1 Sync Pill) */}
        <HeaderSection
          studentName={studentName}
          caseId={caseId}
          meetingDate={meetingDate}
          meetingType={meetingType}
          status={meetingStatus}
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            saveCurrentState({ activeTab: tab }, true);
          }}
          onBack={handleBack}
          onStartLiveMeeting={() => {
            setMeetingStatus("LIVE");
            setActiveTab("MEETING_MODE");
            saveCurrentState({ status: "LIVE" });
            // Connect to Voyage Log background meeting recording infrastructure
            const globalRec = (window as any).voyageGlobalRecorder;
            if (globalRec) {
              if (selectedStudentId) globalRec.setSelectedContactId(selectedStudentId);
              globalRec.setTitle(`${studentName} — ${meetingType || "Annual IEP Meeting"} (${meetingDate})`);
            }
          }}
          isSaving={saveMutation.isPending}
          lastSavedAt={lastSavedAt}
          onSave={() => {
            saveCurrentState();
            toast.success("Workspace saved to Cloudflare D1 & local storage");
          }}
        />

        {/* Loading state */}
        {workspaceLoading && (
          <div className="flex flex-col items-center justify-center p-16 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#FFE394]" />
            <p className="text-xs text-[#C6B697]">Loading IEP meeting workspace...</p>
          </div>
        )}

        {/* Main Workspace Body */}
        {!workspaceLoading && (
          <div className="flex-1">
            {/* TAB: ASSEMBLY (Build the Case) */}
            {(activeTab === "ASSEMBLY" || activeTab === "PREP") && (
              <div className="space-y-6">
                {/* 5-Step Pipeline Indicator + Optional Manual Import */}
                <PrepPipeline
                  currentStep={prepStep}
                  onSelectStep={(step) => {
                    setPrepStep(step);
                    saveCurrentState({ prepStep: step }, true);
                  }}
                  hasIepIntel={hasIepIntel}
                  hasParentIntel={hasParentIntel}
                  pcsApproved={pcsApproved}
                  hasBlueprint={hasBlueprint}
                  isReady={isReady}
                  onOpenImportModal={() => setIsImportModalOpen(true)}
                  isManualImport={isManualImport}
                />

                {/* Step 1: IEP Intel */}
                {prepStep === "iep_intel" && (
                  <Step1IepIntel
                    studentContactId={selectedStudentId || 0}
                    studentName={studentName}
                    findings={iepFindings}
                    detectedOrder={detectedIepOrder}
                    onUpdateFindings={(newFindings) => {
                      setIepFindings(newFindings);
                      saveCurrentState({ iepIntelFindings: newFindings });
                    }}
                    onUpdateDetectedOrder={(newOrder) => {
                      setDetectedIepOrder(newOrder);
                      saveCurrentState({ detectedIepOrder: newOrder });
                    }}
                    onRunIepIntel={async () => {
                      await runIepIntelMutation.mutateAsync({ studentContactId: selectedStudentId || 0 });
                    }}
                    isLoading={runIepIntelMutation.isPending}
                    onNextStep={() => {
                      setPrepStep("parent_intel");
                    }}
                  />
                )}

                {/* Step 2: Parent Intel */}
                {prepStep === "parent_intel" && (
                  <Step2ParentIntel
                    studentContactId={selectedStudentId || 0}
                    studentName={studentName}
                    concerns={parentConcerns}
                    onUpdateConcerns={(newConcerns) => {
                      setParentConcerns(newConcerns);
                      saveCurrentState({ parentIntelConcerns: newConcerns });
                    }}
                    onRunParentIntel={async () => {
                      await runParentIntelMutation.mutateAsync({ studentContactId: selectedStudentId || 0 });
                    }}
                    isLoading={runParentIntelMutation.isPending}
                    onNextStep={() => {
                      setPrepStep("pcs");
                    }}
                    onPrevStep={() => {
                      setPrepStep("iep_intel");
                    }}
                  />
                )}

                {/* Step 3: Parent Concern Statement (PCS) */}
                {prepStep === "pcs" && (
                  <Step3PcsEditor
                    studentName={studentName}
                    pcsText={pcsText}
                    pcsApproved={pcsApproved}
                    hasBlueprintGenerated={hasBlueprint}
                    approvedConcerns={parentConcerns.filter((c) => c.status === "keep")}
                    onSavePcs={async (text, approved) => {
                      setPcsText(text);
                      setPcsApproved(approved);
                      saveCurrentState({ parentConcernStatement: text, pcsApproved: approved });
                    }}
                    onGenerateDraft={async () => {
                      await generatePcsMutation.mutateAsync({
                        studentContactId: selectedStudentId || 0,
                        approvedConcerns: parentConcerns.filter((c) => c.status === "keep"),
                      });
                    }}
                    isLoading={generatePcsMutation.isPending}
                    onNextStep={() => {
                      setPrepStep("blueprint");
                    }}
                    onPrevStep={() => {
                      setPrepStep("parent_intel");
                    }}
                  />
                )}

                {/* Step 4: IEP Blueprint within Assembly */}
                {prepStep === "blueprint" && (
                  <BlueprintView
                    studentName={studentName}
                    meetingType={meetingType}
                    meetingDate={meetingDate}
                    clientEmail={activeStudent?.email || undefined}
                    targets={targets}
                    detectedOrder={detectedIepOrder}
                    onUpdateTargets={(newTargets) => {
                      setTargets(newTargets);
                      saveCurrentState({ meetingTargets: newTargets });
                    }}
                    onUpdateDetectedOrder={(newOrder) => {
                      setDetectedIepOrder(newOrder);
                      saveCurrentState({ detectedIepOrder: newOrder });
                    }}
                    onBuildBlueprint={async () => {
                      await buildBlueprintMutation.mutateAsync({
                        studentContactId: selectedStudentId || 0,
                        approvedFindings: iepFindings.filter((f) => f.status === "keep" || f.status === "important"),
                        approvedConcerns: parentConcerns.filter((c) => c.status === "keep"),
                        pcsText: pcsText,
                        detectedOrder: detectedIepOrder,
                      });
                    }}
                    onPreviewMeetingMode={() => {
                      setActiveTab("MEETING_MODE");
                    }}
                    onMarkReady={() => {
                      setMeetingStatus("READY");
                      setPrepStep("ready");
                      saveCurrentState({ status: "READY" });
                      toast.success("Ready for Meeting! Meeting Mode prepared.");
                    }}
                    onOpenImportModal={() => setIsImportModalOpen(true)}
                    isLoading={buildBlueprintMutation.isPending}
                  />
                )}

                {/* Step 5: Ready for Meeting */}
                {prepStep === "ready" && (
                  <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-8 text-center max-w-2xl mx-auto space-y-6 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
                    <div className="w-14 h-14 rounded-2xl bg-[#020A17] border border-[#3A2C18] text-[#FFE394] flex items-center justify-center mx-auto shadow-inner">
                      <span className="text-2xl select-none">⚡</span>
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-serif font-black text-[#FFF4D4]">Meeting Preparation Complete</h3>
                      <p className="text-xs text-[#C6B697] mt-1.5 max-w-md mx-auto leading-relaxed">
                        All IEP intel, parent concerns, and meeting targets have been approved. You are ready to run the IEP meeting.
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-3">
                      <Button
                        onClick={() => {
                          setActiveTab("MEETING_MODE");
                        }}
                        variant="outline"
                        className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] hover:border-[#C5A059]/60 text-xs cursor-pointer"
                      >
                        Preview Meeting Mode
                      </Button>
                      <Button
                        onClick={() => {
                          setMeetingStatus("LIVE");
                          setActiveTab("MEETING_MODE");
                          saveCurrentState({ status: "LIVE" });
                        }}
                        className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs gap-2 cursor-pointer shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 hover:brightness-105"
                      >
                        ⚡ Launch Live Meeting Mode
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: BLUEPRINT (Discuss with parents and edit) */}
            {(activeTab === "BLUEPRINT" || activeTab === "PARENT_READY") && (
              <BlueprintView
                studentName={studentName}
                meetingType={meetingType}
                meetingDate={meetingDate}
                clientEmail={activeStudent?.email || undefined}
                targets={targets}
                detectedOrder={detectedIepOrder}
                onUpdateTargets={(newTargets) => {
                  setTargets(newTargets);
                  saveCurrentState({ meetingTargets: newTargets });
                }}
                onUpdateDetectedOrder={(newOrder) => {
                  setDetectedIepOrder(newOrder);
                  saveCurrentState({ detectedIepOrder: newOrder });
                }}
                onBuildBlueprint={async () => {
                  await buildBlueprintMutation.mutateAsync({
                    studentContactId: selectedStudentId || 0,
                    approvedFindings: iepFindings.filter((f) => f.status === "keep" || f.status === "important"),
                    approvedConcerns: parentConcerns.filter((c) => c.status === "keep"),
                    pcsText: pcsText,
                    detectedOrder: detectedIepOrder,
                  });
                }}
                onPreviewMeetingMode={() => {
                  setActiveTab("MEETING_MODE");
                }}
                onMarkReady={() => {
                  setMeetingStatus("READY");
                  saveCurrentState({ status: "READY" });
                  toast.success("Ready for Meeting! Meeting Mode prepared.");
                }}
                onOpenImportModal={() => setIsImportModalOpen(true)}
                isLoading={buildBlueprintMutation.isPending}
              />
            )}

            {/* TAB: MEETING MODE (Run the Meeting — Top Priority Destination) */}
            {(activeTab === "MEETING_MODE" || activeTab === "ADVOCATE_READY") && (
              <MeetingModeView
                studentContactId={selectedStudentId}
                studentName={studentName}
                caseId={caseId}
                meetingType={meetingType}
                meetingDate={meetingDate}
                targets={targets}
                detectedOrder={detectedIepOrder}
                parkingLot={parkingLot}
                additionalItems={additionalItems}
                closeoutChecks={closeoutChecks}
                onUpdateTargets={(newTargets) => {
                  setTargets(newTargets);
                  saveCurrentState({ meetingTargets: newTargets });
                }}
                onUpdateParkingLot={(newParkingLot) => {
                  setParkingLot(newParkingLot);
                  saveCurrentState({ parkingLot: newParkingLot });
                }}
                onUpdateAdditionalItems={(newAdditional) => {
                  setAdditionalItems(newAdditional);
                  saveCurrentState({ additionalItems: newAdditional });
                }}
                onUpdateCloseoutChecks={(newChecks) => {
                  setCloseoutChecks(newChecks);
                  saveCurrentState({ closeoutChecks: newChecks as any });
                }}
                onCompleteMeeting={async (summary) => {
                  if (workspace?.id) {
                    await completeMeetingMutation.mutateAsync({
                      id: workspace.id,
                      studentContactId: selectedStudentId || 0,
                      summary,
                    });
                  }
                }}
              />
            )}

            {/* ── MANDATORY BOTTOM BLOCK: PARENT CONCERN STATEMENT WORKSPACE (PG-043) ── */}
            <ParentConcernStatementWorkspace
              studentName={studentName}
              studentContactId={selectedStudentId}
              parentEmail={activeStudent?.email || undefined}
              pcsText={pcsText}
              parentConcerns={parentConcerns}
              iepFindings={iepFindings}
              rawPcsMetadata={(closeoutChecks as any)?.pcsMetadata}
              onSavePcs={handleSavePcsFromWorkspace}
            />
          </div>
        )}

        {/* Modal: Optional Manual Import for Testing */}
        <ImportAdvocateReadyModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          studentContactId={selectedStudentId || 0}
          studentName={studentName}
          currentDetectedOrder={detectedIepOrder}
          existingTargetsCount={targets.length}
          onImportTargets={handleImportTargets}
        />
      </div>
    </ScopedErrorBoundary>
  );
}
