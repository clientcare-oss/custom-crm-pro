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
import { AdvocateReadyView } from "../components/meeting-workspace/views/AdvocateReadyView";
import { ParentReadyView } from "../components/meeting-workspace/views/ParentReadyView";
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
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("PREP");
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
      if (workspace.iepIntelFindings) setIepFindings(safeParseJson<IepIntelFinding[]>(workspace.iepIntelFindings, []));
      if (workspace.parentIntelConcerns) setParentConcerns(safeParseJson<ParentIntelConcern[]>(workspace.parentIntelConcerns, []));
      if (workspace.parentConcernStatement) setPcsText(workspace.parentConcernStatement);
      if (typeof workspace.pcsApproved === "boolean") setPcsApproved(workspace.pcsApproved);
      if (workspace.meetingTargets) {
        const loadedTargets = safeParseJson<MeetingTarget[]>(workspace.meetingTargets, []);
        if (loadedTargets.length > 0) {
          setTargets(loadedTargets);
          try { if (selectedStudentId) localStorage.setItem(`mw_backup_${selectedStudentId}`, JSON.stringify(loadedTargets)); } catch {}
        } else if (selectedStudentId) {
          try {
            const cached = localStorage.getItem(`mw_backup_${selectedStudentId}`);
            if (cached) {
              const parsedCache = JSON.parse(cached);
              if (Array.isArray(parsedCache) && parsedCache.length > 0) {
                setTargets(parsedCache);
                saveCurrentState({ meetingTargets: parsedCache });
              }
            }
          } catch {}
        }
        if (loadedTargets.some((t) => t.sources?.some((s) => s.toLowerCase().includes("import")))) setIsManualImport(true);
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
      if (workspace.status === "LIVE") setActiveTab("MEETING_MODE");
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
      <div className="min-h-screen bg-[#07162B] text-slate-100 p-4 sm:p-6 lg:p-8 flex flex-col space-y-6">
        {/* Top Student Switcher Bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-semibold text-slate-200 hover:border-[#F5B544]/60 transition-all cursor-pointer">
                  <Users className="w-3.5 h-3.5 text-[#F5B544]" />
                  <span>Student: <strong className="text-amber-200">{studentName}</strong></span>
                  {caseId && (
                    <span className="px-2 py-0.5 rounded-full bg-[#0E3560] border border-[#1D5B9B] text-[11px] font-mono font-bold text-amber-300">
                      Case #{caseId.replace(/^Case\s*#?/i, "")}
                    </span>
                  )}
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-slate-900 border-slate-700 text-slate-200 w-64 max-h-80 overflow-y-auto">
                {contacts?.map((c) => {
                  const cCaseId = c.caseId || (c.id === 120034 ? "WP-2026-0029" : null);
                  return (
                    <DropdownMenuItem
                      key={c.id}
                      onClick={() => handleStudentSwitch(c.id)}
                      className="flex items-center justify-between gap-2 text-xs hover:bg-slate-800 cursor-pointer py-2"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-slate-200">{c.firstName} {c.lastName}</span>
                        {cCaseId && (
                          <span className="text-[10.5px] font-mono text-amber-400/90 font-medium">
                            Case #{cCaseId.replace(/^Case\s*#?/i, "")}
                          </span>
                        )}
                      </div>
                      {c.id === selectedStudentId && (
                        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] py-0 shrink-0">Active</Badge>
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {saveMutation.isPending && (
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                Saving...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
              className="text-xs h-8 border-[#144A7E] bg-[#071C3C] text-blue-200 hover:text-[#F5B544] hover:border-[#F5B544]/60 gap-1.5 cursor-pointer shadow-sm font-semibold"
              title="Paste or drop an Advocate Ready document to import targets"
            >
              <Download className="w-3.5 h-3.5 text-[#F5B544]" />
              <span>📥 Import Advocate Ready</span>
            </Button>
            <Button
              onClick={() => saveCurrentState()}
              variant="outline"
              size="sm"
              className="text-xs h-8 border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-[#F5B544]" />
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
          }}
          onBack={handleBack}
          onStartLiveMeeting={() => {
            setMeetingStatus("LIVE");
            setActiveTab("MEETING_MODE");
            saveCurrentState({ status: "LIVE" });
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
            <Loader2 className="w-8 h-8 animate-spin text-[#F5B544]" />
            <p className="text-xs text-slate-400">Loading IEP meeting workspace...</p>
          </div>
        )}

        {/* Main Workspace Body */}
        {!workspaceLoading && (
          <div className="flex-1">
            {/* TAB: PREP */}
            {activeTab === "PREP" && (
              <div className="space-y-6">
                {/* 5-Step Pipeline Indicator + Optional Manual Import */}
                <PrepPipeline
                  currentStep={prepStep}
                  onSelectStep={(step) => {
                    setPrepStep(step);
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

                {/* Step 4: IEP Blueprint within Prep */}
                {prepStep === "blueprint" && (
                  <BlueprintView
                    studentName={studentName}
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
                  <div className="bg-[#0b1e36] border border-slate-700/60 rounded-xl p-8 text-center max-w-2xl mx-auto space-y-6 shadow-xl">
                    <div className="w-14 h-14 rounded-2xl bg-amber-950/50 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
                      <Badge className="text-xl p-2 bg-transparent text-[#F5B544]">⚡</Badge>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-100">Meeting Preparation Complete</h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                        All IEP intel, parent concerns, and meeting targets have been approved. You are ready to run the IEP meeting.
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-3">
                      <Button
                        onClick={() => {
                          setActiveTab("MEETING_MODE");
                        }}
                        variant="outline"
                        className="border-slate-700 bg-slate-900 text-slate-200 text-xs cursor-pointer"
                      >
                        Preview Meeting Mode
                      </Button>
                      <Button
                        onClick={() => {
                          setMeetingStatus("LIVE");
                          setActiveTab("MEETING_MODE");
                          saveCurrentState({ status: "LIVE" });
                        }}
                        className="bg-[#F5B544] hover:bg-[#F5B544]/90 text-slate-950 font-bold text-xs gap-2 cursor-pointer shadow-lg"
                      >
                        ⚡ Launch Live Meeting Mode
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: BLUEPRINT */}
            {activeTab === "BLUEPRINT" && (
              <BlueprintView
                studentName={studentName}
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

            {/* TAB: MEETING MODE */}
            {activeTab === "MEETING_MODE" && (
              <MeetingModeView
                studentName={studentName}
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

            {/* TAB: ADVOCATE READY */}
            {activeTab === "ADVOCATE_READY" && (
              <AdvocateReadyView
                targets={targets}
                onUpdateTarget={(targetId, updates) => {
                  const next = targets.map((t) => (t.id === targetId ? { ...t, ...updates } : t));
                  setTargets(next);
                  saveCurrentState({ meetingTargets: next });
                }}
                studentName={studentName}
                meetingTitle={meetingType}
                meetingDate={meetingDate}
              />
            )}

            {/* TAB: PARENT READY */}
            {activeTab === "PARENT_READY" && (
              <ParentReadyView
                targets={targets}
                studentName={studentName}
                meetingTitle={meetingType}
                meetingDate={meetingDate}
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
