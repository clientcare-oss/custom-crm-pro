import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Scale,
  Sparkles,
  RefreshCw,
  Printer,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertTriangle,
  Clock,
  MessageSquare,
  HelpCircle,
  FolderOpen,
  Edit3,
  ExternalLink,
  ShieldAlert,
  Save,
  X,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LawyerPrepSnapshot } from "./types";
import { AttorneyPacketModal } from "./AttorneyPacketModal";
import { broadcastPageId } from "@/lib/pageIdRegistry";

interface LawyerPrepWorkspaceProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: number;
  contactName: string;
  school?: string | null;
  district?: string | null;
  currentPlan?: string | null;
  attorneyName?: string | null;
  attorneyFirm?: string | null;
  attorneyRepresents?: string | null;
}

export function LawyerPrepWorkspace({
  isOpen,
  onClose,
  contactId,
  contactName,
  school,
  district,
  currentPlan = "IEP",
  attorneyName,
  attorneyFirm,
  attorneyRepresents,
}: LawyerPrepWorkspaceProps) {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<number | null>(null);
  const [activeSnapshot, setActiveSnapshot] = useState<LawyerPrepSnapshot | null>(null);
  const [isPacketModalOpen, setIsPacketModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Advocate notes editing state
  const [advocateNotesText, setAdvocateNotesText] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Section collapse state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Query snapshots list
  const { data: snapshots, refetch: refetchSnapshots, isLoading: isLoadingSnapshots } = trpc.lawyerPrep.listSnapshots.useQuery(
    { studentContactId: contactId },
    { enabled: isOpen }
  );

  // Query specific snapshot
  const { data: snapshotData, isLoading: isLoadingSnapshot } = trpc.lawyerPrep.getSnapshot.useQuery(
    { prepId: selectedSnapshotId as number },
    { enabled: isOpen && selectedSnapshotId !== null }
  );

  // Generate mutation
  const generateMutation = trpc.lawyerPrep.generate.useMutation({
    onSuccess: (res) => {
      toast.success("AI Lawyer Prep generated successfully!");
      refetchSnapshots().then(() => {
        setSelectedSnapshotId(res.id);
      });
    },
    onError: (err) => {
      toast.error(`Generation failed: ${err.message}`);
    },
  });

  // Update snapshot mutation (for notes or missing info checklist)
  const updateSnapshotMutation = trpc.lawyerPrep.updateSnapshot.useMutation({
    onSuccess: () => {
      toast.success("Case notes updated");
      setIsSavingNotes(false);
    },
    onError: (err) => {
      toast.error(`Failed to update: ${err.message}`);
      setIsSavingNotes(false);
    },
  });

  // Broadcast PG-030-LP when modal opens
  useEffect(() => {
    if (isOpen) {
      broadcastPageId({
        id: "PG-030-LP",
        name: "AI Lawyer Prep Workspace",
        category: "Advocacy",
        description: "Case-level attorney preparation, evidence indexing, and legal compliance summary",
      });
    }
  }, [isOpen]);

  // Set initial selected snapshot
  useEffect(() => {
    if (snapshots && snapshots.length > 0 && selectedSnapshotId === null) {
      setSelectedSnapshotId(snapshots[0].id);
    }
  }, [snapshots, selectedSnapshotId]);

  // Sync active snapshot from query
  useEffect(() => {
    if (snapshotData && snapshotData.snapshot) {
      setActiveSnapshot(snapshotData.snapshot as LawyerPrepSnapshot);
      setAdvocateNotesText(snapshotData.snapshot.advocateNotes || "");
    }
  }, [snapshotData]);

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleUpdateChecklistStatus = (itemId: string, newStatus: any) => {
    if (!activeSnapshot || !selectedSnapshotId) return;
    const updatedMissing = activeSnapshot.missingInformation.map((item) =>
      item.id === itemId ? { ...item, checklistStatus: newStatus } : item
    );
    const updatedSnap: LawyerPrepSnapshot = {
      ...activeSnapshot,
      missingInformation: updatedMissing,
    };
    setActiveSnapshot(updatedSnap);

    updateSnapshotMutation.mutate({
      prepId: selectedSnapshotId,
      missingInfoChecklist: updatedMissing,
    });
  };

  const handleSaveAdvocateNotes = () => {
    if (!selectedSnapshotId || !activeSnapshot) return;
    setIsSavingNotes(true);
    updateSnapshotMutation.mutate({
      prepId: selectedSnapshotId,
      advocateNotes: advocateNotesText,
    });
  };

  const handleCopySummary = () => {
    if (!activeSnapshot) return;
    const summary = `
WAYPOINT ADVOCATES - AI LAWYER PREP
Student: ${activeSnapshot.caseSnapshot.studentName}
Plan: ${activeSnapshot.caseSnapshot.planStatus}
School/District: ${activeSnapshot.caseSnapshot.school} / ${activeSnapshot.caseSnapshot.district}
Attorney: ${attorneyName || "Legal Counsel"} (${attorneyRepresents || "Parent/Student"})

PRIMARY ISSUES:
${activeSnapshot.primaryIssues.map((issue) => `• [${issue.severity}] ${issue.title}: ${issue.summary}`).join("\n")}

POTENTIAL LEGAL / COMPLIANCE ISSUES:
${activeSnapshot.potentialLegalIssues.map((issue) => `• [${issue.legalLevel}] ${issue.issue} (${issue.relevantLegalArea})`).join("\n")}

RECORD CONFLICTS:
${activeSnapshot.recordConflicts.map((c) => `• ${c.conflictTitle}: ${c.description}`).join("\n")}

QUESTIONS FOR COUNSEL:
${activeSnapshot.questionsForAttorney.map((q) => `• ${q.question}`).join("\n")}
    `.trim();

    navigator.clipboard.writeText(summary);
    setIsCopied(true);
    toast.success("Lawyer Prep summary copied to clipboard");
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-6xl max-h-[94vh] bg-[#000820] border border-[#1A365D] rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-5 bg-gradient-to-r from-[#07162C] via-[#0A2244] to-[#07162C] border-b border-[#1A365D] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#0F294D] border border-[#F5B544]/50 flex items-center justify-center text-[#F5B544] shrink-0 shadow-md">
              <Scale className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold font-serif text-white tracking-tight flex items-center gap-2">
                  <span>Lawyer Prep Workspace</span>
                </h2>
                <Badge variant="outline" className="text-[10px] font-mono border-[#F5B544]/40 bg-[#F5B544]/10 text-[#F5B544]">
                  PG-030-LP
                </Badge>
                {attorneyName && (
                  <Badge variant="outline" className="text-[10px] border-rose-500/40 bg-rose-950/40 text-rose-300">
                    Atty: {attorneyName} ({attorneyRepresents || "Parent"})
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300 truncate">
                <span className="font-semibold text-white">{contactName}</span>
                <span>•</span>
                <span>{school || "School Not Set"} {district ? `(${district})` : ""}</span>
                <span>•</span>
                <span className="text-[#F5B544] font-medium">{currentPlan || "IEP"}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            {/* Version Snapshot Selector */}
            {snapshots && snapshots.length > 0 && (
              <div className="flex items-center gap-1.5 mr-1 text-xs">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedSnapshotId || ""}
                  onChange={(e) => setSelectedSnapshotId(Number(e.target.value))}
                  className="bg-[#091D3A] border border-[#1A365D] rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-[#F5B544]"
                >
                  {snapshots.map((snap) => (
                    <option key={snap.id} value={snap.id}>
                      v{snap.version} — {new Date(snap.generatedAt).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => generateMutation.mutate({ studentContactId: contactId })}
              disabled={generateMutation.isPending}
              className="h-8 text-xs font-semibold border-[#F5B544]/40 bg-[#0B254A] text-[#F5B544] hover:bg-[#F5B544]/15 hover:border-[#F5B544] cursor-pointer"
              title="Refresh and analyze real case records"
            >
              {generateMutation.isPending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Analyzing Records...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-[#F5B544]" />
                  {snapshots && snapshots.length > 0 ? "Refresh From Case" : "Generate Lawyer Prep"}
                </>
              )}
            </Button>

            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!activeSnapshot}
              onClick={handleCopySummary}
              className="h-8 text-xs font-semibold border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-700/60 cursor-pointer"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1 text-slate-300" />}
              {isCopied ? "Copied" : "Copy"}
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={!activeSnapshot}
              onClick={() => setIsPacketModalOpen(true)}
              className="h-8 text-xs font-bold bg-gradient-to-r from-[#F5B544] to-amber-500 text-slate-950 hover:from-amber-400 hover:to-amber-500 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 mr-1 text-slate-950" />
              Attorney Packet
            </Button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Loading or Empty State */}
          {isLoadingSnapshots || isLoadingSnapshot ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-[#F5B544] animate-spin" />
              <p className="text-sm text-slate-300 font-medium">Gathering and indexing student case records...</p>
            </div>
          ) : !activeSnapshot ? (
            <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#091D3A] border border-[#F5B544]/30 flex items-center justify-center text-[#F5B544]">
                <Scale className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">No Lawyer Prep Generated Yet</h3>
                <p className="text-xs text-slate-300">
                  Synthesize all IEP documents, meeting notes, PWN decisions, evaluations, and case timelines into a structured, attorney-ready legal briefing.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => generateMutation.mutate({ studentContactId: contactId })}
                disabled={generateMutation.isPending}
                className="bg-[#F5B544] hover:bg-amber-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate First Lawyer Prep Snapshot
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* SECTION 1: Case Snapshot */}
              <div className="bg-[#041026] border border-[#14325C] rounded-xl p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#14325C] pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                      1. Case Snapshot
                    </span>
                    <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-300 bg-emerald-950/30">
                      🟢 Live Verified
                    </Badge>
                  </div>
                  <button
                    onClick={() => toggleSection("snapshot")}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    {collapsedSections["snapshot"] ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>

                {!collapsedSections["snapshot"] && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Student</span>
                      <strong className="text-white text-sm">{activeSnapshot.caseSnapshot.studentName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Age / Grade</span>
                      <span className="text-slate-200">{activeSnapshot.caseSnapshot.age} • {activeSnapshot.caseSnapshot.grade}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">School & District</span>
                      <span className="text-slate-200">{activeSnapshot.caseSnapshot.school} ({activeSnapshot.caseSnapshot.district})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Eligibility / Diagnosis</span>
                      <span className="text-slate-200 font-medium text-amber-200/90">{activeSnapshot.caseSnapshot.eligibility}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Plan & Placement</span>
                      <span className="text-slate-200">{activeSnapshot.caseSnapshot.planStatus} • {activeSnapshot.caseSnapshot.currentPlacement}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Most Recent IEP</span>
                      <span className="text-slate-200">{activeSnapshot.caseSnapshot.dateOfRecentIep}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Next Known Meeting</span>
                      <span className="text-slate-200">{activeSnapshot.caseSnapshot.nextKnownMeeting}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Relevant Services</span>
                      <span className="text-slate-200 truncate block">
                        {activeSnapshot.caseSnapshot.relevantServices?.join(", ") || "None Documented"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: Primary Issues */}
              <div className="bg-[#041026] border border-[#14325C] rounded-xl p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#14325C] pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-rose-300 uppercase tracking-wider font-mono">
                      2. Primary Issues Requiring Resolution
                    </span>
                    <Badge variant="outline" className="text-[10px] border-rose-500/40 text-rose-300 bg-rose-950/30">
                      {activeSnapshot.primaryIssues?.length || 0} Flagged
                    </Badge>
                  </div>
                  <button onClick={() => toggleSection("issues")} className="text-slate-400 hover:text-white p-1">
                    {collapsedSections["issues"] ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>

                {!collapsedSections["issues"] && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {activeSnapshot.primaryIssues?.map((issue) => (
                      <div
                        key={issue.id}
                        className="bg-[#081830] border border-[#183B6B] rounded-lg p-3.5 space-y-2 relative"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-white">{issue.title}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                              issue.severity === "High"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            }`}
                          >
                            {issue.severity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{issue.summary}</p>
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800 text-slate-400">
                          <span>Status: <strong className="text-slate-200">{issue.status}</strong></span>
                          {issue.evidenceSources?.length > 0 && (
                            <span className="text-[10px] text-sky-400">
                              {issue.evidenceSources.length} source{issue.evidenceSources.length > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 3: Key Timeline */}
              <div className="bg-[#041026] border border-[#14325C] rounded-xl p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#14325C] pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                      3. Key Chronological Timeline
                    </span>
                    <span className="text-xs text-slate-400">Significant events & milestones only</span>
                  </div>
                  <button onClick={() => toggleSection("timeline")} className="text-slate-400 hover:text-white p-1">
                    {collapsedSections["timeline"] ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>

                {!collapsedSections["timeline"] && (
                  <div className="space-y-3 relative pl-4 border-l border-sky-900/60 ml-2">
                    {activeSnapshot.keyTimeline?.map((item) => (
                      <div key={item.id} className="relative group">
                        <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#F5B544] border-2 border-[#000820]" />
                        <div className="bg-[#081830] border border-[#183B6B] rounded-lg p-3 space-y-1 text-xs">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="font-mono font-bold text-[#F5B544]">{item.date}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                              item.status === "Resolved"
                                ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/30"
                                : "bg-rose-950/60 text-rose-300 border border-rose-500/30"
                            }`}>
                              {item.status}
                            </span>
                          </div>
                          <div className="font-bold text-white text-xs">{item.event}</div>
                          <p className="text-slate-300 text-xs">{item.whatHappened}</p>
                          <div className="text-[11px] text-sky-400 pt-1 font-mono">
                            Evidence: {item.evidence}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 4: Requests & Responses */}
              <div className="bg-[#041026] border border-[#14325C] rounded-xl p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#14325C] pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                      4. Parent Requests vs. School Responses
                    </span>
                  </div>
                  <button onClick={() => toggleSection("requests")} className="text-slate-400 hover:text-white p-1">
                    {collapsedSections["requests"] ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>

                {!collapsedSections["requests"] && (
                  <div className="space-y-3">
                    {activeSnapshot.requestsAndResponses?.map((req) => (
                      <div key={req.id} className="bg-[#081830] border border-[#183B6B] rounded-lg p-3.5 text-xs space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="font-bold text-amber-200">Request ({req.date}):</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            req.status === "Agreed"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : req.status === "Denied"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        <p className="text-white font-medium">{req.request}</p>
                        <div className="bg-[#040C1A] border border-[#102747] p-2.5 rounded text-xs space-y-1">
                          <span className="text-slate-400 font-bold block text-[10px] uppercase">School Response:</span>
                          <p className="text-slate-200">{req.schoolResponse}</p>
                        </div>
                        <div className="text-[10px] text-sky-400 font-mono">Evidence Ref: {req.evidence}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 5: Potential Legal / Compliance Issues */}
              <div className="bg-[#041026] border border-[#14325C] rounded-xl p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#14325C] pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-amber-300 uppercase tracking-wider font-mono">
                      5. Potential Issues for Attorney Review
                    </span>
                    <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-300 bg-amber-950/30">
                      Objective Compliance Observations
                    </Badge>
                  </div>
                  <button onClick={() => toggleSection("legal")} className="text-slate-400 hover:text-white p-1">
                    {collapsedSections["legal"] ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>

                {!collapsedSections["legal"] && (
                  <div className="space-y-3.5">
                    {activeSnapshot.potentialLegalIssues?.map((issue) => (
                      <div key={issue.id} className="bg-[#081830] border border-[#183B6B] rounded-lg p-4 text-xs space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-white text-sm">{issue.issue}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-950 border border-sky-600 text-sky-300">
                            {issue.legalLevel}
                          </span>
                        </div>
                        <div className="text-slate-300 leading-relaxed">
                          <strong className="text-slate-200">Why Flagged: </strong>
                          {issue.whyFlagged}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                          <div>
                            <span className="text-slate-400 font-bold block">Relevant IDEA / 504 Safeguard:</span>
                            <span className="text-amber-200">{issue.relevantLegalArea}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold block">Missing Corroboration:</span>
                            <span className="text-slate-300">{issue.missingEvidence}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 6: Record Conflicts */}
              <div className="bg-[#041026] border border-[#14325C] rounded-xl p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#14325C] pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-purple-300 uppercase tracking-wider font-mono">
                      6. Record Conflicts & Contradictions
                    </span>
                  </div>
                  <button onClick={() => toggleSection("conflicts")} className="text-slate-400 hover:text-white p-1">
                    {collapsedSections["conflicts"] ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>

                {!collapsedSections["conflicts"] && (
                  <div className="space-y-3">
                    {activeSnapshot.recordConflicts?.map((conflict) => (
                      <div key={conflict.id} className="bg-[#081830] border border-[#183B6B] rounded-lg p-3.5 text-xs space-y-2">
                        <span className="font-bold text-purple-200 text-xs">{conflict.conflictTitle}</span>
                        <p className="text-slate-300">{conflict.description}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#040C1A] border border-[#102747] p-2.5 rounded">
                          <div>
                            <span className="text-sky-300 font-bold block text-[10px] uppercase">{conflict.sourceA.title}:</span>
                            <p className="text-slate-300 text-[11px]">{conflict.sourceA.statement}</p>
                          </div>
                          <div>
                            <span className="text-amber-300 font-bold block text-[10px] uppercase">{conflict.sourceB.title}:</span>
                            <p className="text-slate-300 text-[11px]">{conflict.sourceB.statement}</p>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          <strong className="text-slate-300">Implication: </strong>
                          {conflict.implication}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 7: Missing Information Checklist */}
              <div className="bg-[#041026] border border-[#14325C] rounded-xl p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#14325C] pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-rose-300 uppercase tracking-wider font-mono">
                      7. Missing Information Checklist
                    </span>
                    <span className="text-xs text-slate-400">Interactive case readiness action items</span>
                  </div>
                  <button onClick={() => toggleSection("missing")} className="text-slate-400 hover:text-white p-1">
                    {collapsedSections["missing"] ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>

                {!collapsedSections["missing"] && (
                  <div className="space-y-2.5">
                    {activeSnapshot.missingInformation?.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#081830] border border-[#183B6B] rounded-lg p-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{item.item}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-600/40">
                              {item.importance}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{item.whyNeeded}</p>
                        </div>

                        {/* Interactive Status Selector */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <select
                            value={item.checklistStatus}
                            onChange={(e) => handleUpdateChecklistStatus(item.id, e.target.value)}
                            className="bg-[#040C1A] border border-[#183B6B] rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-[#F5B544] cursor-pointer"
                          >
                            <option value="Request from Parent">Request from Parent</option>
                            <option value="Request from School">Request from School</option>
                            <option value="Already Requested">Already Requested</option>
                            <option value="Received">Received</option>
                            <option value="Not Needed">Not Needed</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 8: Questions for Attorney */}
              <div className="bg-[#041026] border border-[#14325C] rounded-xl p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#14325C] pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-sky-300 uppercase tracking-wider font-mono">
                      8. Questions for Counsel
                    </span>
                  </div>
                  <button onClick={() => toggleSection("questions")} className="text-slate-400 hover:text-white p-1">
                    {collapsedSections["questions"] ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>

                {!collapsedSections["questions"] && (
                  <div className="space-y-2.5">
                    {activeSnapshot.questionsForAttorney?.map((q, idx) => (
                      <div key={q.id || idx} className="bg-[#081830] border border-[#183B6B] rounded-lg p-3 text-xs space-y-1">
                        <span className="font-bold text-white text-xs block">❓ {q.question}</span>
                        <p className="text-slate-300 text-[11px]">{q.context}</p>
                        {q.relevantDocs && (
                          <div className="text-[10px] text-sky-400 pt-0.5">Docs: {q.relevantDocs}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 9: Advocate Notes */}
              <div className="bg-[#041026] border border-[#14325C] rounded-xl p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#14325C] pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#F5B544] uppercase tracking-wider font-mono">
                      9. Waypoint Advocate Notes
                    </span>
                    <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-300 bg-amber-950/20">
                      Advocate Input • Distinct from Document Evidence
                    </Badge>
                  </div>
                  <button onClick={() => toggleSection("notes")} className="text-slate-400 hover:text-white p-1">
                    {collapsedSections["notes"] ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>

                {!collapsedSections["notes"] && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-300">
                      Add advocate observations, strategy notes, and verbal discussions. These notes will be included in the attorney packet with clear distinction from primary source documents.
                    </p>
                    <textarea
                      rows={4}
                      value={advocateNotesText}
                      onChange={(e) => setAdvocateNotesText(e.target.value)}
                      placeholder="Enter advocate observations, context on school demeanor, parent priorities, or meeting dynamics..."
                      className="w-full bg-[#081830] border border-[#183B6B] rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F5B544]"
                    />
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveAdvocateNotes}
                        disabled={isSavingNotes}
                        className="bg-[#F5B544] hover:bg-amber-400 text-slate-950 font-bold text-xs h-8 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5 mr-1" />
                        {isSavingNotes ? "Saving..." : "Save Advocate Notes"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 10: Sources & Confidence Index */}
              <div className="bg-[#041026] border border-[#14325C] rounded-xl p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#14325C] pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                      10. Source Transparency & Confidence Index
                    </span>
                  </div>
                  <button onClick={() => toggleSection("sources")} className="text-slate-400 hover:text-white p-1">
                    {collapsedSections["sources"] ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>

                {!collapsedSections["sources"] && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {activeSnapshot.sources?.map((src) => (
                      <div key={src.id} className="bg-[#081830] border border-[#183B6B] rounded-lg p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-white truncate">{src.label}</span>
                          <span className="text-[10px] shrink-0 font-medium">{src.confidenceLabel}</span>
                        </div>
                        <p className="text-slate-400 text-[11px] line-clamp-2">{src.excerpt}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 bg-[#07162C] border-t border-[#1A365D] shrink-0 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#F5B544]" />
            <span>Advocate-controlled legal briefing. Confidential student education records.</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
          >
            Close Workspace
          </Button>
        </div>
      </div>

      {/* Attorney Case Packet Export Modal */}
      {isPacketModalOpen && activeSnapshot && (
        <AttorneyPacketModal
          isOpen={isPacketModalOpen}
          onClose={() => setIsPacketModalOpen(false)}
          studentName={contactName}
          attorneyName={attorneyName}
          attorneyFirm={attorneyFirm}
          snapshot={activeSnapshot}
        />
      )}
    </div>
  );
}
