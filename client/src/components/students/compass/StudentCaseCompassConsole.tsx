import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Compass,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  History,
  FileText,
  Clock,
  User,
  Target,
  MapPin,
  Scale,
  RefreshCw,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Calendar,
  Layers,
  Settings,
  Radio,
  PhoneCall,
} from "lucide-react";
import PageIdBadge from "@/components/PageIdBadge";
import CompassSettingsModal from "./CompassSettingsModal";
import type { AvailableCompassTranscript } from "../../../../../server/db/compass";

interface StudentCaseCompassConsoleProps {
  studentId: number;
  studentName: string;
  caseId?: string;
  onBackToMore?: () => void;
}

const RISK_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  Low: {
    label: "Low Risk",
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  Moderate: {
    label: "Moderate Risk",
    bg: "bg-blue-500/15",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  Elevated: {
    label: "Elevated Risk",
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  Urgent: {
    label: "Urgent Risk",
    bg: "bg-rose-500/15",
    text: "text-rose-400",
    border: "border-rose-500/30",
  },
};

export default function StudentCaseCompassConsole({
  studentId,
  studentName,
  caseId: initialCaseId,
  onBackToMore,
}: StudentCaseCompassConsoleProps) {
  const caseId = initialCaseId || `CASE-${studentId}`;

  // Queries
  const compassQuery = trpc.caseCompass.getByStudent.useQuery(
    { studentId },
    { refetchOnWindowFocus: false }
  );
  const historyQuery = trpc.caseCompass.history.useQuery(
    { caseId, studentId },
    { refetchOnWindowFocus: false }
  );
  const draftsQuery = trpc.caseCompass.drafts.useQuery(
    { caseId, studentId },
    { refetchOnWindowFocus: false }
  );
  const transcriptsQuery = trpc.caseCompass.getAvailableTranscripts.useQuery(
    { studentId },
    { refetchOnWindowFocus: false }
  );

  const availableSessions = transcriptsQuery.data?.sessions || [];
  const latestSession = transcriptsQuery.data?.latestSession || null;

  // Mutations
  const generateAiMutation = trpc.caseCompass.generateAiDraft.useMutation({
    onSuccess: (data) => {
      toast.success("AI draft generated successfully. Ready for advocate review.");
      draftsQuery.refetch();
      setSelectedDraftId(data.draft.id);
      setActiveTab("drafts");
    },
    onError: (err) => {
      toast.error(`Failed to generate AI draft: ${err.message}`);
    },
  });

  const approvePublishMutation = trpc.caseCompass.approveAndPublish.useMutation({
    onSuccess: () => {
      toast.success("Case Compass update published successfully! Client portal updated.");
      compassQuery.refetch();
      historyQuery.refetch();
      draftsQuery.refetch();
      setIsEditingCurrent(false);
      setActiveTab("overview");
    },
    onError: (err) => {
      toast.error(`Failed to publish Case Compass: ${err.message}`);
    },
  });

  const saveDraftMutation = trpc.caseCompass.saveDraft.useMutation({
    onSuccess: () => {
      toast.success("Draft saved successfully.");
      draftsQuery.refetch();
    },
    onError: (err) => {
      toast.error(`Failed to save draft: ${err.message}`);
    },
  });

  const rejectDraftMutation = trpc.caseCompass.rejectDraft.useMutation({
    onSuccess: () => {
      toast.success("Draft rejected.");
      draftsQuery.refetch();
      setSelectedDraftId(null);
    },
    onError: (err) => {
      toast.error(`Failed to reject draft: ${err.message}`);
    },
  });

  // Local State
  const [activeTab, setActiveTab] = useState<"overview" | "drafts" | "history">("overview");
  const [selectedDraftId, setSelectedDraftId] = useState<number | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<number | null>(null);
  const [aiInstructions, setAiInstructions] = useState("");
  const [showAiModal, setShowAiModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Transcript Connection & Selection State for AI Synthesis
  const [sourceMode, setSourceMode] = useState<"latest" | "session_picker" | "manual" | "case_file">("latest");
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>("");
  const [manualTranscriptText, setManualTranscriptText] = useState("");
  const [showSnippetPreview, setShowSnippetPreview] = useState(false);

  // Auto-select latest session when query loads
  React.useEffect(() => {
    if (latestSession && !selectedMeetingId) {
      setSelectedMeetingId(latestSession.id);
    }
  }, [latestSession, selectedMeetingId]);

  // Edit State for Current Compass
  const [isEditingCurrent, setIsEditingCurrent] = useState(false);
  const [editCurrentStatus, setEditCurrentStatus] = useState("");
  const [editNextStep, setEditNextStep] = useState("");
  const [editWhoHasBall, setEditWhoHasBall] = useState("");
  const [editIdeaRiskLevel, setEditIdeaRiskLevel] = useState<"Low" | "Moderate" | "Elevated" | "Urgent">("Moderate");

  // Sync edit state when compass loads
  const currentCompass = compassQuery.data;
  React.useEffect(() => {
    if (currentCompass) {
      setEditCurrentStatus(currentCompass.currentStatus || "");
      setEditNextStep(currentCompass.nextStep || "");
      setEditWhoHasBall(currentCompass.whoHasBall || "");
      setEditIdeaRiskLevel((currentCompass.ideaRiskLevel as any) || "Moderate");
    }
  }, [currentCompass]);

  // Drafts Selection & Editing State
  const pendingDrafts = draftsQuery.data?.filter((d) => d.status === "pending") || [];
  const activeDraft = draftsQuery.data?.find((d) => d.id === selectedDraftId) || pendingDrafts[0] || null;

  const [draftEditStatus, setDraftEditStatus] = useState("");
  const [draftEditNextStep, setDraftEditNextStep] = useState("");
  const [draftEditWhoHasBall, setDraftEditWhoHasBall] = useState("");
  const [draftEditRiskLevel, setDraftEditRiskLevel] = useState<"Low" | "Moderate" | "Elevated" | "Urgent">("Moderate");

  React.useEffect(() => {
    if (activeDraft) {
      setDraftEditStatus(activeDraft.currentStatus || "");
      setDraftEditNextStep(activeDraft.nextStep || "");
      setDraftEditWhoHasBall(activeDraft.whoHasBall || "");
      setDraftEditRiskLevel((activeDraft.ideaRiskLevel as any) || "Moderate");
    }
  }, [activeDraft]);

  const handleGenerateAi = (instructions?: string) => {
    let meetingIdToSend: string | undefined = undefined;
    let transcriptToSend: string | undefined = undefined;

    if (sourceMode === "latest" && latestSession) {
      meetingIdToSend = latestSession.id;
      transcriptToSend = latestSession.fullTranscriptText;
    } else if (sourceMode === "session_picker" && selectedMeetingId) {
      meetingIdToSend = selectedMeetingId;
      const chosen = availableSessions.find((s) => s.id === selectedMeetingId);
      if (chosen) transcriptToSend = chosen.fullTranscriptText;
    } else if (sourceMode === "manual") {
      transcriptToSend = manualTranscriptText;
    }

    generateAiMutation.mutate({
      studentId,
      caseId,
      meetingId: meetingIdToSend,
      transcriptText: transcriptToSend,
      extraInstructions: instructions || aiInstructions || undefined,
    });
    setShowAiModal(false);
  };

  const handlePublishCurrentEdits = () => {
    if (!editCurrentStatus.trim() || !editNextStep.trim() || !editWhoHasBall.trim()) {
      toast.error("All 5 fields must be completed before publishing.");
      return;
    }
    approvePublishMutation.mutate({
      caseId,
      studentId,
      currentStatus: editCurrentStatus,
      nextStep: editNextStep,
      whoHasBall: editWhoHasBall,
      ideaRiskLevel: editIdeaRiskLevel,
      sourceType: "manual",
      sourceDocument: "Advocate Manual Edit",
    });
  };

  const handlePublishDraft = () => {
    if (!activeDraft) return;
    let unresolvedArray: string[] = [];
    try {
      if (activeDraft.unresolvedIssues) {
        unresolvedArray = JSON.parse(activeDraft.unresolvedIssues);
      }
    } catch {
      unresolvedArray = [];
    }

    approvePublishMutation.mutate({
      caseId,
      studentId,
      currentStatus: draftEditStatus,
      nextStep: draftEditNextStep,
      whoHasBall: draftEditWhoHasBall,
      ideaRiskLevel: draftEditRiskLevel,
      draftId: activeDraft.id,
      sourceType: activeDraft.sourceType || "ai",
      sourceDocument: activeDraft.meetingId ? `Meeting: ${activeDraft.meetingId}` : "AI Synthesis",
      unresolvedIssues: unresolvedArray,
    });
  };

  const handleSaveDraftChanges = () => {
    if (!activeDraft) return;
    saveDraftMutation.mutate({
      id: activeDraft.id,
      caseId,
      studentId,
      currentStatus: draftEditStatus,
      nextStep: draftEditNextStep,
      whoHasBall: draftEditWhoHasBall,
      ideaRiskLevel: draftEditRiskLevel,
    });
  };

  const handleRejectDraft = () => {
    if (!activeDraft) return;
    rejectDraftMutation.mutate({ id: activeDraft.id });
  };

  // Helper to parse citations
  const parsedCitations = React.useMemo(() => {
    if (!activeDraft?.sourceReferences) return [];
    try {
      return JSON.parse(activeDraft.sourceReferences);
    } catch {
      return [];
    }
  }, [activeDraft]);

  // Helper to parse unresolved issues
  const parsedUnresolved = React.useMemo(() => {
    if (!activeDraft?.unresolvedIssues) return [];
    try {
      return JSON.parse(activeDraft.unresolvedIssues);
    } catch {
      return [];
    }
  }, [activeDraft]);

  const currentRiskBadge = RISK_BADGES[currentCompass?.ideaRiskLevel || "Moderate"] || RISK_BADGES.Moderate;

  return (
    <div className="w-full min-h-[600px] p-4 sm:p-6 md:p-8 select-none text-[#F7F2E8]">
      <PageIdBadge id="PG-025" name="Case Compass Internal Management" />

      {/* ─── Top Header & Controls ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 mb-6 border-b border-[#3A2C18]/80">
        <div className="flex items-start sm:items-center gap-3.5">
          {onBackToMore && (
            <button
              onClick={onBackToMore}
              className="p-2 rounded-lg bg-[#030e20] border border-[#2b5894]/60 text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#0c2449] transition-all cursor-pointer shadow-sm"
              title="Return to More Hub"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0c2449] to-[#030e20] border border-[#C5A059]/50 flex items-center justify-center text-[#F1CB6C] shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
            <Compass className="w-6 h-6 animate-[spin_24s_linear_infinite]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2
                className="text-xl sm:text-2xl font-bold text-[#F7F2E8] tracking-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Case Compass Management
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#C5A059]/15 text-[#FFE394] border border-[#C5A059]/40">
                {studentName}
              </span>
              {currentCompass?.version && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#1d3f6d]/60 text-[#93AECD] border border-[#2b5894]/60">
                  Version {currentCompass.version}
                </span>
              )}
            </div>
            <p className="text-xs text-[#93AECD] mt-1">
              Internal advocate console for student case compass updates, AI draft synthesis, and permanent history.
            </p>
          </div>
        </div>

        {/* Global Action Triggers */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={() => setShowAiModal(true)}
            disabled={generateAiMutation.isPending}
            className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-110 active:scale-95 transition-all text-xs sm:text-sm px-4 py-2"
          >
            {generateAiMutation.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin text-[#07162B]" />
                Analyzing Case...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2 text-[#07162B]" />
                Generate with AI
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowSettingsModal(true)}
            className="border-[#3A2C18] bg-[#020A17] text-[#FFE394] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs sm:text-sm px-3.5 py-2 flex items-center gap-1.5"
            title="Inspect transcript connections, intake handoff, and meeting sources"
          >
            <Settings className="w-4 h-4 text-[#C5A059]" />
            <span>Settings & Sources</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setIsEditingCurrent(!isEditingCurrent);
              setActiveTab("overview");
            }}
            className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs sm:text-sm"
          >
            {isEditingCurrent ? "Cancel Edit" : "Manual Edit"}
          </Button>
        </div>
      </div>

      {/* ─── Navigation Tabs ─── */}
      <div className="flex items-center gap-2 mb-6 border-b border-[#3A2C18]/60 pb-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            activeTab === "overview"
              ? "bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/50 shadow-sm"
              : "text-[#93AECD] hover:text-[#F7F2E8] hover:bg-[#0c2449]/40"
          }`}
        >
          <Compass className="w-4 h-4 text-[#F1CB6C]" />
          Published Compass
        </button>

        <button
          onClick={() => setActiveTab("drafts")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all relative ${
            activeTab === "drafts"
              ? "bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/50 shadow-sm"
              : "text-[#93AECD] hover:text-[#F7F2E8] hover:bg-[#0c2449]/40"
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#DFBE77]" />
          AI & Pending Drafts
          {pendingDrafts.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-black">
              {pendingDrafts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            activeTab === "history"
              ? "bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/50 shadow-sm"
              : "text-[#93AECD] hover:text-[#F7F2E8] hover:bg-[#0c2449]/40"
          }`}
        >
          <History className="w-4 h-4 text-[#93AECD]" />
          Update History
          {historyQuery.data && historyQuery.data.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#1d3f6d] text-[#D8C7A5]">
              {historyQuery.data.length}
            </span>
          )}
        </button>
      </div>

      {/* ─── TAB 1: Published Overview (The 5 Fields) ─── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Published Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-[#0c2449]/60 via-[#071933]/70 to-[#030e20]/80 border border-[#2b5894]/70 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#F7F2E8]">
                    Currently Live on Waypoint Client Portal
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${currentRiskBadge.bg} ${currentRiskBadge.text} ${currentRiskBadge.border}`}>
                    {currentRiskBadge.label}
                  </span>
                </div>
                <p className="text-xs text-[#93AECD] mt-0.5">
                  Published:{" "}
                  {currentCompass?.updatedAt
                    ? new Date(currentCompass.updatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "No record yet"}
                  {currentCompass?.approvedBy && ` • Approved by ${currentCompass.approvedBy}`}
                </p>
              </div>
            </div>

            {isEditingCurrent && (
              <Button
                onClick={handlePublishCurrentEdits}
                disabled={approvePublishMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 border border-emerald-400/40 shadow-md"
              >
                {approvePublishMutation.isPending ? "Publishing..." : "Approve & Publish Changes"}
              </Button>
            )}
          </div>

          {/* The 5 Fields Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Current Status */}
            <Card className="p-5 bg-[#05142B]/90 border border-[#3A2C18] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.85)] text-white">
              <div className="flex items-center justify-between mb-3 border-b border-[#3A2C18]/60 pb-2">
                <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
                  <MapPin className="w-4 h-4" />
                  <span>1. 📍 Current Status</span>
                </div>
                <span className="text-[10px] text-[#93AECD] uppercase tracking-wider font-mono">Compass North</span>
              </div>
              {isEditingCurrent ? (
                <Textarea
                  value={editCurrentStatus}
                  onChange={(e) => setEditCurrentStatus(e.target.value)}
                  placeholder="Explain where the student's case stands..."
                  rows={4}
                  className="bg-[#020A17] border-[#3A2C18] text-[#F7F2E8] text-sm focus:border-[#C5A059]"
                />
              ) : (
                <p className="text-sm text-[#D8C7A5] leading-relaxed whitespace-pre-line">
                  {currentCompass?.currentStatus || "No current status recorded yet."}
                </p>
              )}
            </Card>

            {/* 2. Next Step */}
            <Card className="p-5 bg-[#05142B]/90 border border-[#3A2C18] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.85)] text-white">
              <div className="flex items-center justify-between mb-3 border-b border-[#3A2C18]/60 pb-2">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <Target className="w-4 h-4" />
                  <span>2. 🎯 Next Step</span>
                </div>
                <span className="text-[10px] text-[#93AECD] uppercase tracking-wider font-mono">Compass East</span>
              </div>
              {isEditingCurrent ? (
                <Textarea
                  value={editNextStep}
                  onChange={(e) => setEditNextStep(e.target.value)}
                  placeholder="Identify immediate next action..."
                  rows={4}
                  className="bg-[#020A17] border-[#3A2C18] text-[#F7F2E8] text-sm focus:border-[#C5A059]"
                />
              ) : (
                <p className="text-sm text-[#D8C7A5] leading-relaxed whitespace-pre-line">
                  {currentCompass?.nextStep || "No next step defined."}
                </p>
              )}
            </Card>

            {/* 3. Who Has the Ball */}
            <Card className="p-5 bg-[#05142B]/90 border border-[#3A2C18] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.85)] text-white">
              <div className="flex items-center justify-between mb-3 border-b border-[#3A2C18]/60 pb-2">
                <div className="flex items-center gap-2 text-violet-400 font-semibold text-sm">
                  <User className="w-4 h-4" />
                  <span>3. 👤 Who Has the Ball</span>
                </div>
                <span className="text-[10px] text-[#93AECD] uppercase tracking-wider font-mono">Responsible Party</span>
              </div>
              {isEditingCurrent ? (
                <Input
                  value={editWhoHasBall}
                  onChange={(e) => setEditWhoHasBall(e.target.value)}
                  placeholder="e.g. District / School Team / Waypoint Advocate"
                  className="bg-[#020A17] border-[#3A2C18] text-[#F7F2E8] text-sm focus:border-[#C5A059]"
                />
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-sm font-medium text-[#F7F2E8]">
                  <span className="w-2 h-2 rounded-full bg-violet-400" />
                  {currentCompass?.whoHasBall || "Unassigned"}
                </div>
              )}
            </Card>

            {/* 4. IDEA Risk Level */}
            <Card className="p-5 bg-[#05142B]/90 border border-[#3A2C18] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.85)] text-white">
              <div className="flex items-center justify-between mb-3 border-b border-[#3A2C18]/60 pb-2">
                <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                  <Scale className="w-4 h-4" />
                  <span>5. ⚖ IDEA Risk Level</span>
                </div>
                <span className="text-[10px] text-[#93AECD] uppercase tracking-wider font-mono">Procedural / FAPE</span>
              </div>
              {isEditingCurrent ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["Low", "Moderate", "Elevated", "Urgent"] as const).map((lvl) => {
                    const b = RISK_BADGES[lvl];
                    const isSelected = editIdeaRiskLevel === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setEditIdeaRiskLevel(lvl)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? `${b.bg} ${b.text} ${b.border} ring-2 ring-[#C5A059]`
                            : "bg-[#020A17] text-[#93AECD] border-[#3A2C18] hover:text-[#FFF4D4]"
                        }`}
                      >
                        {lvl}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${currentRiskBadge.bg} ${currentRiskBadge.text} ${currentRiskBadge.border}`}>
                    {currentRiskBadge.label}
                  </span>
                  <span className="text-xs text-[#93AECD]">
                    {currentCompass?.ideaRiskLevel === "Urgent" && "Immediate dispute / state filing threshold."}
                    {currentCompass?.ideaRiskLevel === "Elevated" && "Substantive evaluation or service denial active."}
                    {currentCompass?.ideaRiskLevel === "Moderate" && "Active advocacy and IEP revisions underway."}
                    {currentCompass?.ideaRiskLevel === "Low" && "Compliant progress and routine monitoring."}
                  </span>
                </div>
              )}
            </Card>
          </div>

          {/* 5. Last Updated Pill */}
          <div className="p-3.5 rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/70 flex items-center justify-between text-xs text-[#93AECD]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>4. 📅 Last Updated:</span>
              <span className="text-[#FFE394] font-medium">
                {currentCompass?.updatedAt
                  ? new Date(currentCompass.updatedAt).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Never"}
              </span>
            </div>
            <span className="font-mono text-[11px] text-[#A69371]">
              Target Dial Coordinate: 216°
            </span>
          </div>
        </div>
      )}

      {/* ─── TAB 2: AI & Pending Drafts (Advocate Review Workflow) ─── */}
      {activeTab === "drafts" && (
        <div className="space-y-6">
          {pendingDrafts.length === 0 ? (
            <Card className="p-8 text-center bg-[#05142B]/90 border border-[#3A2C18] rounded-xl text-white">
              <Sparkles className="w-10 h-10 text-[#C5A059] mx-auto mb-3" />
              <h3 className="text-lg font-bold text-[#F7F2E8]">No Pending Drafts Awaiting Review</h3>
              <p className="text-xs text-[#93AECD] max-w-md mx-auto mt-1 mb-5">
                When a meeting transcription finishes or when you click "Generate with AI", proposed updates will appear here for review and side-by-side verification before publishing.
              </p>
              <Button
                onClick={() => handleGenerateAi()}
                disabled={generateAiMutation.isPending}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate New Draft from Case History
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Draft Selector if multiple */}
              {pendingDrafts.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  <span className="text-xs text-[#93AECD] shrink-0">Select Draft:</span>
                  {pendingDrafts.map((d, idx) => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDraftId(d.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        activeDraft?.id === d.id
                          ? "bg-[#C5A059]/20 text-[#FFE394] border-[#C5A059]"
                          : "bg-[#020A17] text-[#93AECD] border-[#3A2C18] hover:text-[#FFF4D4]"
                      }`}
                    >
                      Draft #{idx + 1} ({d.sourceType?.toUpperCase()})
                    </button>
                  ))}
                </div>
              )}

              {/* Review Alert Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-[#0c2449]/70 to-[#030e20]/80 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#FFE394]">
                      Pending Draft Ready for Advocate Verification
                    </h4>
                    <p className="text-xs text-[#93AECD] mt-0.5">
                      Source: {activeDraft?.createdBy || "AI Generator"} • Created{" "}
                      {activeDraft?.createdAt ? new Date(activeDraft.createdAt).toLocaleDateString() : ""}
                      {activeDraft?.aiModel && ` • Model: ${activeDraft.aiModel}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleRejectDraft}
                    disabled={rejectDraftMutation.isPending}
                    variant="outline"
                    className="border-rose-900/60 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 hover:text-white text-xs px-3"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Reject Draft
                  </Button>
                  <Button
                    onClick={handleSaveDraftChanges}
                    disabled={saveDraftMutation.isPending}
                    variant="outline"
                    className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] text-xs px-3"
                  >
                    Save Edits
                  </Button>
                  <Button
                    onClick={handlePublishDraft}
                    disabled={approvePublishMutation.isPending}
                    className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs px-4 border border-emerald-400/40 shadow-lg"
                  >
                    <Check className="w-4 h-4 mr-1.5" />
                    Approve & Publish to Portal
                  </Button>
                </div>
              </div>

              {/* Side-by-Side Comparison: Current Published vs Proposed Draft */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left Column: Current Published */}
                <Card className="p-5 bg-[#030e20]/80 border border-[#3A2C18]/70 rounded-xl text-white space-y-4">
                  <div className="flex items-center justify-between border-b border-[#3A2C18]/60 pb-2">
                    <span className="text-xs font-bold text-[#93AECD] uppercase tracking-wider">
                      Current Published Live
                    </span>
                    <span className="text-[10px] font-mono text-[#A69371]">
                      v{currentCompass?.version || 1}
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-blue-400 flex items-center gap-1.5 mb-1">
                      <MapPin className="w-3.5 h-3.5" /> Current Status
                    </label>
                    <p className="text-xs text-[#C6B697] bg-[#020A17] p-2.5 rounded-lg border border-[#3A2C18]/50 min-h-[60px]">
                      {currentCompass?.currentStatus || "No previous status recorded."}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-1">
                      <Target className="w-3.5 h-3.5" /> Next Step
                    </label>
                    <p className="text-xs text-[#C6B697] bg-[#020A17] p-2.5 rounded-lg border border-[#3A2C18]/50 min-h-[60px]">
                      {currentCompass?.nextStep || "No previous next step."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-violet-400 flex items-center gap-1.5 mb-1">
                        <User className="w-3.5 h-3.5" /> Who Has the Ball
                      </label>
                      <p className="text-xs text-[#C6B697] bg-[#020A17] p-2 rounded-lg border border-[#3A2C18]/50">
                        {currentCompass?.whoHasBall || "None"}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-rose-400 flex items-center gap-1.5 mb-1">
                        <Scale className="w-3.5 h-3.5" /> IDEA Risk Level
                      </label>
                      <p className="text-xs text-[#C6B697] bg-[#020A17] p-2 rounded-lg border border-[#3A2C18]/50 font-bold">
                        {currentCompass?.ideaRiskLevel || "Moderate"}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Right Column: Proposed Draft (Editable by Advocate) */}
                <Card className="p-5 bg-[#05142B] border border-[#C5A059]/60 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.85)] text-white space-y-4">
                  <div className="flex items-center justify-between border-b border-[#3A2C18]/60 pb-2">
                    <span className="text-xs font-bold text-[#FFE394] uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#F1CB6C]" />
                      Proposed Update (Editable)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      Pending Approval
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#FFE394] flex items-center gap-1.5 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-400" /> Proposed Status
                    </label>
                    <Textarea
                      value={draftEditStatus}
                      onChange={(e) => setDraftEditStatus(e.target.value)}
                      rows={3}
                      className="bg-[#020A17] border-[#3A2C18] text-[#F7F2E8] text-xs focus:border-[#C5A059]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#FFE394] flex items-center gap-1.5 mb-1">
                      <Target className="w-3.5 h-3.5 text-emerald-400" /> Proposed Next Step
                    </label>
                    <Textarea
                      value={draftEditNextStep}
                      onChange={(e) => setDraftEditNextStep(e.target.value)}
                      rows={3}
                      className="bg-[#020A17] border-[#3A2C18] text-[#F7F2E8] text-xs focus:border-[#C5A059]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-[#FFE394] flex items-center gap-1.5 mb-1">
                        <User className="w-3.5 h-3.5 text-violet-400" /> Who Has the Ball
                      </label>
                      <Input
                        value={draftEditWhoHasBall}
                        onChange={(e) => setDraftEditWhoHasBall(e.target.value)}
                        className="bg-[#020A17] border-[#3A2C18] text-[#F7F2E8] text-xs focus:border-[#C5A059]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#FFE394] flex items-center gap-1.5 mb-1">
                        <Scale className="w-3.5 h-3.5 text-rose-400" /> Proposed Risk Level
                      </label>
                      <select
                        value={draftEditRiskLevel}
                        onChange={(e) => setDraftEditRiskLevel(e.target.value as any)}
                        className="w-full bg-[#020A17] border border-[#3A2C18] rounded-md px-2.5 py-1.5 text-xs text-[#F7F2E8] focus:border-[#C5A059]"
                      >
                        <option value="Low">Low Risk</option>
                        <option value="Moderate">Moderate Risk</option>
                        <option value="Elevated">Elevated Risk</option>
                        <option value="Urgent">Urgent Risk</option>
                      </select>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Citations & Unresolved Issues Memory Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Transcript Citations & Timestamps */}
                <Card className="p-4 bg-[#030e20]/80 border border-[#3A2C18]/70 rounded-xl text-white">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#3A2C18]/60">
                    <FileText className="w-4 h-4 text-[#F1CB6C]" />
                    <h5 className="text-xs font-bold text-[#F7F2E8]">
                      Transcript Citations & Source Evidence
                    </h5>
                  </div>
                  {parsedCitations.length === 0 ? (
                    <p className="text-xs text-[#93AECD]">No specific transcript citations attached to this draft.</p>
                  ) : (
                    <div className="space-y-2">
                      {parsedCitations.map((cite: any, i: number) => (
                        <div key={i} className="p-2.5 rounded-lg bg-[#020A17] border border-[#3A2C18]/50 text-xs">
                          <div className="flex items-center justify-between font-semibold text-[#FFE394] mb-1">
                            <span>{cite.label || cite.source}</span>
                            {cite.timestamp && (
                              <span className="font-mono text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                {cite.timestamp}
                              </span>
                            )}
                          </div>
                          {cite.quote && (
                            <p className="italic text-[#C6B697] text-[11px]">"{cite.quote}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Preserved Unresolved Issue Memory */}
                <Card className="p-4 bg-[#030e20]/80 border border-[#3A2C18]/70 rounded-xl text-white">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#3A2C18]/60">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <h5 className="text-xs font-bold text-[#F7F2E8]">
                      Unresolved Issue Memory (Carried Forward)
                    </h5>
                  </div>
                  {parsedUnresolved.length === 0 ? (
                    <p className="text-xs text-[#93AECD]">No outstanding unresolved concerns flagged for this case.</p>
                  ) : (
                    <div className="space-y-2">
                      {parsedUnresolved.map((issue: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-[#020A17] border border-[#3A2C18]/50 text-xs text-[#D8C7A5]">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                          <span>{issue}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: Permanent Update History (Requirement 3) ─── */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#3A2C18]/60">
            <div>
              <h3 className="text-sm font-bold text-[#F7F2E8]">
                Permanent Version History
              </h3>
              <p className="text-xs text-[#93AECD]">
                Immutable historical snapshots recorded every time an advocate publishes a Case Compass update.
              </p>
            </div>
            <span className="text-xs font-mono text-[#FFE394]">
              {historyQuery.data?.length || 0} Total Snapshots
            </span>
          </div>

          {!historyQuery.data || historyQuery.data.length === 0 ? (
            <div className="p-8 text-center bg-[#05142B]/60 border border-[#3A2C18] rounded-xl text-xs text-[#93AECD]">
              No historical updates recorded yet. Every publication will automatically preserve an immutable snapshot here.
            </div>
          ) : (
            <div className="space-y-3">
              {historyQuery.data.map((record) => {
                const isExpanded = expandedHistoryId === record.id;
                const riskBadge = RISK_BADGES[record.ideaRiskLevel || "Moderate"] || RISK_BADGES.Moderate;

                return (
                  <Card
                    key={record.id}
                    className="p-4 bg-[#05142B]/90 border border-[#3A2C18] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.6)] text-white transition-all hover:border-[#C5A059]/40"
                  >
                    <div
                      onClick={() => setExpandedHistoryId(isExpanded ? null : record.id)}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#0c2449] border border-[#2b5894]/70 flex items-center justify-center font-mono text-xs font-bold text-[#FFE394]">
                          v{record.version || 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-[#F7F2E8]">
                              {(record as any).savedAt || (record as any).createdAt
                                ? new Date((record as any).savedAt || (record as any).createdAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })
                                : "Unknown Date"}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${riskBadge.bg} ${riskBadge.text} ${riskBadge.border}`}>
                              {riskBadge.label}
                            </span>
                            {record.sourceType && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-[#020A17] text-[#93AECD] border border-[#3A2C18]">
                                {record.sourceType}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#93AECD] mt-0.5">
                            Approved by: {record.approvedBy || "Lead Special Education Advocate"}
                            {record.sourceDocument && ` • Source: ${record.sourceDocument}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[#FFE394]">
                        <span>{isExpanded ? "Hide Details" : "View Snapshot"}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>

                    {/* Expanded Snapshot Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-[#3A2C18]/60 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="p-3 rounded-lg bg-[#020A17] border border-[#3A2C18]/50">
                            <span className="font-semibold text-blue-400 block mb-1">1. 📍 Current Status</span>
                            <p className="text-[#D8C7A5]">{record.currentStatus || "None"}</p>
                          </div>

                          <div className="p-3 rounded-lg bg-[#020A17] border border-[#3A2C18]/50">
                            <span className="font-semibold text-emerald-400 block mb-1">2. 🎯 Next Step</span>
                            <p className="text-[#D8C7A5]">{record.nextStep || "None"}</p>
                          </div>

                          <div className="p-3 rounded-lg bg-[#020A17] border border-[#3A2C18]/50">
                            <span className="font-semibold text-violet-400 block mb-1">3. 👤 Who Has the Ball</span>
                            <p className="text-[#D8C7A5]">{record.whoHasBall || "None"}</p>
                          </div>

                          <div className="p-3 rounded-lg bg-[#020A17] border border-[#3A2C18]/50">
                            <span className="font-semibold text-rose-400 block mb-1">5. ⚖ IDEA Risk Level</span>
                            <p className="text-[#D8C7A5] font-bold">{record.ideaRiskLevel || "Moderate"}</p>
                          </div>
                        </div>

                        {record.unresolvedIssues && (
                          <div className="p-3 rounded-lg bg-[#020A17] border border-[#3A2C18]/50 text-xs">
                            <span className="font-semibold text-amber-400 block mb-1">
                              Preserved Unresolved Concerns at Snapshot Time:
                            </span>
                            <p className="text-[#93AECD] font-mono text-[11px] whitespace-pre-wrap">
                              {record.unresolvedIssues}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── AI Transcript & Intake Connection Modal (PG-025-AI) ─── */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 bg-[#07162B] border border-[#C5A059] rounded-2xl shadow-2xl text-white space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#3A2C18] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0c2449] to-[#020A17] border border-[#C5A059]/60 flex items-center justify-center text-[#F1CB6C]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#F7F2E8] text-base">Generate Case Compass with AI</h3>
                  <p className="text-[11px] text-[#93AECD]">
                    Synthesize 5-field trajectory from meeting transcripts, discovery calls, or case records
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#020A17] text-[#C5A059] border border-[#3A2C18]">
                  PG-025-AI
                </span>
                <button
                  onClick={() => setShowAiModal(false)}
                  className="text-[#93AECD] hover:text-white p-1 rounded-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Source Mode Switcher Tabs */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#FFE394] block">
                Transcript & Intake Connection Source:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl bg-[#020A17] border border-[#3A2C18]">
                <button
                  type="button"
                  onClick={() => setSourceMode("latest")}
                  className={`px-2.5 py-2 rounded-lg text-xs font-semibold transition-all flex flex-col items-center justify-center text-center gap-0.5 ${
                    sourceMode === "latest"
                      ? "bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/60 shadow-sm"
                      : "text-[#93AECD] hover:text-[#F7F2E8] hover:bg-[#07162B]"
                  }`}
                >
                  <span>⚡ Latest Session</span>
                  <span className="text-[10px] opacity-75 font-normal">
                    {latestSession ? (latestSession.source === "discovery_call" ? "Discovery" : "IEP / 504") : "Auto"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSourceMode("session_picker")}
                  className={`px-2.5 py-2 rounded-lg text-xs font-semibold transition-all flex flex-col items-center justify-center text-center gap-0.5 ${
                    sourceMode === "session_picker"
                      ? "bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/60 shadow-sm"
                      : "text-[#93AECD] hover:text-[#F7F2E8] hover:bg-[#07162B]"
                  }`}
                >
                  <span>📜 Choose Session</span>
                  <span className="text-[10px] opacity-75 font-normal">
                    {availableSessions.length} Available
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSourceMode("manual")}
                  className={`px-2.5 py-2 rounded-lg text-xs font-semibold transition-all flex flex-col items-center justify-center text-center gap-0.5 ${
                    sourceMode === "manual"
                      ? "bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/60 shadow-sm"
                      : "text-[#93AECD] hover:text-[#F7F2E8] hover:bg-[#07162B]"
                  }`}
                >
                  <span>✍️ Custom Notes</span>
                  <span className="text-[10px] opacity-75 font-normal">Paste Transcript</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSourceMode("case_file")}
                  className={`px-2.5 py-2 rounded-lg text-xs font-semibold transition-all flex flex-col items-center justify-center text-center gap-0.5 ${
                    sourceMode === "case_file"
                      ? "bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/60 shadow-sm"
                      : "text-[#93AECD] hover:text-[#F7F2E8] hover:bg-[#07162B]"
                  }`}
                >
                  <span>📁 Case Records</span>
                  <span className="text-[10px] opacity-75 font-normal">Tasks & History</span>
                </button>
              </div>
            </div>

            {/* ─── Mode 1: Latest Session Preview ─── */}
            {sourceMode === "latest" && (
              <div className="p-3.5 rounded-xl bg-[#020A17] border border-[#3A2C18] space-y-2.5">
                {latestSession ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-bold text-[#F7F2E8]">
                          Connected to Latest {latestSession.source === "discovery_call" ? "Discovery Call" : "Meeting Transcript"}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        latestSession.source === "discovery_call"
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      }`}>
                        {latestSession.sourceLabel}
                      </span>
                    </div>

                    <div className="text-xs text-[#FFE394] font-semibold">
                      {latestSession.title}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-[#93AECD]">
                      <span>Date: {new Date(latestSession.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      {latestSession.turnCount !== undefined && latestSession.turnCount > 0 && (
                        <span>• {latestSession.turnCount} speaker turns</span>
                      )}
                      <span>• {latestSession.wordCount.toLocaleString()} words</span>
                    </div>

                    {latestSession.snippet && (
                      <div className="pt-1 border-t border-[#3A2C18]/60">
                        <button
                          type="button"
                          onClick={() => setShowSnippetPreview(!showSnippetPreview)}
                          className="text-[11px] text-[#C5A059] hover:underline flex items-center gap-1"
                        >
                          {showSnippetPreview ? "Hide Transcript Snippet" : "Inspect Transcript Snippet"}
                          <ChevronDown className={`w-3 h-3 transition-transform ${showSnippetPreview ? "rotate-180" : ""}`} />
                        </button>
                        {showSnippetPreview && (
                          <p className="mt-1.5 p-2 rounded bg-[#07162B] border border-[#3A2C18] text-[11px] text-[#93AECD] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                            {latestSession.fullTranscriptText || latestSession.snippet}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-3 space-y-1.5">
                    <p className="text-xs text-[#FFE394]">No recorded meeting transcripts or Discovery calls found yet.</p>
                    <p className="text-[11px] text-[#93AECD]">
                      You can select "Custom Notes" to paste a transcript, or click "Settings & Sources" to inspect connected tools.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ─── Mode 2: Session Picker ─── */}
            {sourceMode === "session_picker" && (
              <div className="p-3.5 rounded-xl bg-[#020A17] border border-[#3A2C18] space-y-2.5">
                <label className="text-xs font-semibold text-[#FFE394] block">
                  Select Meeting or Intake Session:
                </label>
                {availableSessions.length === 0 ? (
                  <p className="text-xs text-[#93AECD]">No past sessions available for this student.</p>
                ) : (
                  <>
                    <select
                      value={selectedMeetingId}
                      onChange={(e) => setSelectedMeetingId(e.target.value)}
                      className="w-full bg-[#07162B] border border-[#3A2C18] rounded-lg px-3 py-2 text-xs text-[#F7F2E8] focus:border-[#C5A059] focus:outline-none"
                    >
                      {availableSessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          [{s.sourceLabel}] {s.title} — {new Date(s.date).toLocaleDateString()} ({s.wordCount} words)
                        </option>
                      ))}
                    </select>

                    {(() => {
                      const chosen = availableSessions.find((s) => s.id === selectedMeetingId) || availableSessions[0];
                      if (!chosen) return null;
                      return (
                        <div className="p-2.5 rounded-lg bg-[#07162B] border border-[#3A2C18] text-xs space-y-1 mt-2">
                          <div className="flex items-center justify-between text-[11px] text-[#93AECD]">
                            <span className="font-semibold text-[#FFE394]">{chosen.title}</span>
                            <span>{new Date(chosen.date).toLocaleDateString()}</span>
                          </div>
                          {chosen.snippet && (
                            <p className="text-[11px] text-[#93AECD] font-mono italic line-clamp-2">
                              "{chosen.snippet}"
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}

            {/* ─── Mode 3: Manual Paste ─── */}
            {sourceMode === "manual" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#FFE394]">
                    Paste Meeting Transcript or Discovery Notes:
                  </label>
                  <span className="text-[11px] text-[#93AECD] font-mono">
                    {manualTranscriptText.trim() ? `${manualTranscriptText.trim().split(/\s+/).length} words` : "0 words"}
                  </span>
                </div>
                <Textarea
                  value={manualTranscriptText}
                  onChange={(e) => setManualTranscriptText(e.target.value)}
                  placeholder="Paste Zoom transcript, audio transcription, parent intake notes, or school meeting notes here..."
                  rows={5}
                  className="bg-[#020A17] border-[#3A2C18] text-[#F7F2E8] text-xs focus:border-[#C5A059] font-mono"
                />
              </div>
            )}

            {/* ─── Mode 4: Case File Only ─── */}
            {sourceMode === "case_file" && (
              <div className="p-3.5 rounded-xl bg-[#020A17] border border-[#3A2C18] text-xs text-[#93AECD] space-y-1">
                <span className="font-semibold text-[#FFE394] block">Case File Synthesis Mode</span>
                <p className="text-[11px]">
                  Waypoint AI will synthesize updates exclusively using open project tasks, timeline events, and historical compass snapshots without referencing a new meeting transcript.
                </p>
              </div>
            )}

            {/* Optional Instructions */}
            <div>
              <label className="text-xs font-semibold text-[#FFE394] block mb-1.5">
                Optional Advocate Focus or Guidance:
              </label>
              <Textarea
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
                placeholder="e.g., Emphasize the OT evaluation delay, note that the district agreed to Speech therapy 2x weekly, or establish firm foundation kickoff..."
                rows={2}
                className="bg-[#020A17] border-[#3A2C18] text-[#F7F2E8] text-xs focus:border-[#C5A059]"
              />
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#3A2C18]">
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="text-xs text-[#C5A059] hover:text-[#FFE394] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Transcript & Source Settings</span>
              </button>

              <div className="flex items-center gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowAiModal(false)}
                  className="border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleGenerateAi(aiInstructions)}
                  disabled={generateAiMutation.isPending}
                  className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs"
                >
                  {generateAiMutation.isPending ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin text-[#07162B]" />
                      Synthesizing 5 Fields...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 mr-1.5 text-[#07162B]" />
                      Run AI Synthesis
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ─── Settings & Sources Shortcut Modal ─── */}
      <CompassSettingsModal
        open={showSettingsModal}
        onOpenChange={setShowSettingsModal}
        studentId={studentId}
        studentName={studentName}
        transcripts={availableSessions}
        onSelectTranscriptForAi={(t) => {
          setSourceMode("session_picker");
          setSelectedMeetingId(t.id);
          setShowAiModal(true);
        }}
      />
    </div>
  );
}
