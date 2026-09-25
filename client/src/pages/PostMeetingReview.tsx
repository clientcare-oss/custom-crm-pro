import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import PageIdBadge from "@/components/PageIdBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Anchor,
  Calendar,
  ExternalLink,
  Upload,
  CheckCircle2,
  Clock,
  Sparkles,
  Save,
} from "lucide-react";
import { toast } from "sonner";

import type {
  PortmasterFinding,
  FindingDecision,
  FollowUpActionType,
  PortmasterSessionState,
} from "@/components/post-meeting-review/types";
import {
  INITIAL_PORTMASTER_FINDINGS,
  createDefaultPortmasterSession,
} from "@/components/post-meeting-review/mockData";
import { GuidedHorizonsProcessStrip } from "@/components/post-meeting-review/GuidedHorizonsProcessStrip";
import { PortmasterReviewSummary } from "@/components/post-meeting-review/PortmasterReviewSummary";
import { ReviewQueueList } from "@/components/post-meeting-review/ReviewQueueList";
import { StandardPortmasterFindingCard } from "@/components/post-meeting-review/StandardPortmasterFindingCard";
import { ComparatorFindingCard } from "@/components/post-meeting-review/ComparatorFindingCard";
import { AdvocateDecisionControls } from "@/components/post-meeting-review/AdvocateDecisionControls";
import { EvidenceDetailsArea } from "@/components/post-meeting-review/EvidenceDetailsArea";
import { ReviewCompletionSummary } from "@/components/post-meeting-review/ReviewCompletionSummary";
import { UniversalIepIntakeModal } from "@/components/post-meeting-review/UniversalIepIntakeModal";

export default function PostMeetingReview() {
  const params = useParams<{ studentId?: string }>();
  const [, setLocation] = useLocation();

  const searchParams =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const rawStudentId = params.studentId || searchParams?.get("studentId");
  const studentId = rawStudentId ? parseInt(rawStudentId, 10) : 120034;

  // Contact list query
  const { data: contacts } = trpc.contacts.list.useQuery();
  const activeStudent = contacts?.find((c) => c.id === studentId) || null;

  const studentName = activeStudent
    ? `${activeStudent.firstName} ${activeStudent.lastName}`
    : "Mikey Peroni";
  const grade = activeStudent?.grade || "Grade 5";
  const schoolDistrict = activeStudent?.school || "Cobb County Schools";
  const meetingType = "Annual IEP";
  const meetingDate = "September 18, 2026";

  // Session state with local storage persistence
  const storageKey = `portmaster_session_${studentId}`;

  const [session, setSession] = useState<PortmasterSessionState>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // fallback
        }
      }
    }
    return createDefaultPortmasterSession(studentId, studentName);
  });

  // Keep studentName updated
  useEffect(() => {
    if (activeStudent && session.studentName !== studentName) {
      setSession((prev) => ({ ...prev, studentName }));
    }
  }, [activeStudent, studentName]);

  // Persist session changes continuously
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify(session));
    }
  }, [session, storageKey]);

  // UI States
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedFindingId, setSelectedFindingId] = useState<string>(
    session.findings[0]?.id || ""
  );
  const [lastDecisionHistory, setLastDecisionHistory] = useState<{
    id: string;
    prevDecision: FindingDecision;
  } | null>(null);
  const [showCompletionView, setShowCompletionView] = useState<boolean>(
    session.status === "completed"
  );
  const [isUniversalIntakeOpen, setIsUniversalIntakeOpen] = useState<boolean>(false);

  // Filtered queue items
  const filteredFindings = session.findings.filter((f) => {
    if (selectedCategory === "all") return true;
    return f.category === selectedCategory;
  });

  const selectedFinding =
    session.findings.find((f) => f.id === selectedFindingId) ||
    filteredFindings[0] ||
    session.findings[0];

  // Calculated progress
  const reviewedCount = session.findings.filter(
    (f) => f.decision === "confirmed" || f.decision === "not_a_concern"
  ).length;
  const progressPercent = Math.round((reviewedCount / session.findings.length) * 100);

  // Handlers: Decision & Auto-advance
  const handleDecide = (decision: FindingDecision) => {
    if (!selectedFinding) return;

    // Track for undo
    setLastDecisionHistory({
      id: selectedFinding.id,
      prevDecision: selectedFinding.decision,
    });

    const updated = session.findings.map((f) =>
      f.id === selectedFinding.id
        ? {
            ...f,
            decision,
            decisionTimestamp: new Date().toISOString(),
          }
        : f
    );

    setSession((prev) => ({
      ...prev,
      findings: updated,
    }));

    if (decision === "confirmed") {
      toast.success(`Confirmed concern: ${selectedFinding.title}`);
    } else if (decision === "not_a_concern") {
      toast.info(`Dismissed non-issue: ${selectedFinding.title}`);
    } else {
      toast.warning(`Held in queue: ${selectedFinding.title}`);
    }

    // Auto-advance to next unreviewed finding
    const currentIndex = filteredFindings.findIndex((f) => f.id === selectedFinding.id);
    const remainingUnreviewed = filteredFindings.filter(
      (f, idx) => idx > currentIndex && f.decision === "unreviewed"
    );

    if (remainingUnreviewed.length > 0) {
      setSelectedFindingId(remainingUnreviewed[0].id);
    } else {
      // Look for any unreviewed from start
      const anyUnreviewed = session.findings.find(
        (f) => f.id !== selectedFinding.id && f.decision === "unreviewed"
      );
      if (anyUnreviewed) {
        setSelectedFindingId(anyUnreviewed.id);
      } else {
        // All done! Prompt completion
        toast.success("All findings in queue have been reviewed!");
      }
    }
  };

  const handleUndo = () => {
    if (!lastDecisionHistory) return;
    const { id, prevDecision } = lastDecisionHistory;
    setSession((prev) => ({
      ...prev,
      findings: prev.findings.map((f) =>
        f.id === id ? { ...f, decision: prevDecision } : f
      ),
    }));
    setSelectedFindingId(id);
    setLastDecisionHistory(null);
    toast.info("Decision reverted.");
  };

  const handleUpdateNotes = (notes: string) => {
    if (!selectedFinding) return;
    setSession((prev) => ({
      ...prev,
      findings: prev.findings.map((f) =>
        f.id === selectedFinding.id ? { ...f, decisionNotes: notes } : f
      ),
    }));
  };

  const handleUpdateFindingAction = (findingId: string, action: FollowUpActionType) => {
    setSession((prev) => ({
      ...prev,
      findings: prev.findings.map((f) =>
        f.id === findingId ? { ...f, selectedAction: action } : f
      ),
    }));
    toast.success("Follow-up action updated.");
  };

  const handleFinalComplete = () => {
    setSession((prev) => ({
      ...prev,
      status: "completed",
      completedAt: new Date().toISOString(),
    }));
    toast.success("Portmaster Review marked complete! Case Compass synchronized.");
    // Optionally return to student
    setTimeout(() => {
      setLocation(`/contacts/${studentId}`);
    }, 1200);
  };

  const handleBack = () => {
    if (studentId) {
      setLocation(`/contacts/${studentId}`);
    } else {
      setLocation("/contacts");
    }
  };

  return (
    <ScopedErrorBoundary moduleName="PostMeetingReview (PG-044)">
      <div className="min-h-screen bg-[#000820] text-slate-100 flex flex-col font-sans selection:bg-teal-500/30 selection:text-white">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-[#000820]/95 backdrop-blur-md border-b border-[#0F355E] px-4 sm:px-6 py-2.5 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
            {/* Left: Back button & Title hierarchy */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="h-8 px-2.5 text-xs text-blue-200 hover:text-white hover:bg-white/10 cursor-pointer inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-blue-400" />
                <span className="hidden sm:inline">Back to Student</span>
              </Button>

              <div className="h-4 w-[1px] bg-blue-500/30" />

              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-bold text-white tracking-wide">
                    Post-Meeting Review
                  </h1>
                  <PageIdBadge id="PG-044" name="Post-Meeting Review" />
                </div>
                <div className="flex items-center gap-2 text-[11px] text-blue-200/80 flex-wrap">
                  <span className="font-bold text-[#F5B544]">{studentName}</span>
                  <span>·</span>
                  <span>{grade}</span>
                  <span>·</span>
                  <span>{schoolDistrict}</span>
                  <span className="text-blue-400/50 hidden md:inline">·</span>
                  <span className="text-teal-300 font-mono hidden md:inline">
                    {meetingType} · {meetingDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: View Meeting & Intake Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLocation(`/meeting-workspace/${studentId}`)}
                className="h-8 text-xs font-semibold bg-[#061E38] border-[#103D6D] text-blue-200 hover:text-white hover:border-[#F5B544]/60 cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                title="Open ⚡ Meeting Workspace to inspect live meeting notes and audio"
              >
                <ExternalLink className="h-3.5 w-3.5 text-[#F5B544]" />
                <span>View Meeting</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsUniversalIntakeOpen(true)}
                className="h-8 text-xs font-semibold bg-[#07241A] border-emerald-500/40 text-emerald-300 hover:text-white hover:bg-emerald-900/60 cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                title="Universal IEP Intake Gate"
              >
                <Upload className="h-3.5 w-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Upload Updated IEP</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Workspace Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 space-y-4">
          {/* SECTION 2: Guided Horizons Portmaster Process Strip */}
          <GuidedHorizonsProcessStrip
            currentStage={session.status === "completed" ? "complete" : "advocate_review"}
            previousIepDate="Aug 14, 2026"
            meetingDate="Sept 18, 2026"
            updatedIepDate="Sept 25, 2026"
          />

          {/* SECTION 3: Small Portmaster Summary */}
          <PortmasterReviewSummary
            totalAnalyzed={session.totalAnalyzedCount}
            clearedAutomatically={session.clearedAutomaticallyCount}
            findings={session.findings}
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => setSelectedCategory(cat)}
          />

          {/* If completion view is open, render Completion Summary */}
          {showCompletionView ? (
            <ReviewCompletionSummary
              studentName={studentName}
              totalAnalyzed={session.totalAnalyzedCount}
              findings={session.findings}
              onUpdateFindingAction={handleUpdateFindingAction}
              onFinalComplete={handleFinalComplete}
              onReturnToQueue={() => setShowCompletionView(false)}
            />
          ) : (
            /* SECTIONS 4, 5, 6: 2-Column Responsive Workspace */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* LEFT COLUMN: Unified Review Queue (4 cols on lg) */}
              <div className="lg:col-span-4 w-full">
                <ReviewQueueList
                  findings={filteredFindings}
                  selectedFindingId={selectedFinding?.id || null}
                  onSelectFinding={(id) => setSelectedFindingId(id)}
                />
              </div>

              {/* RIGHT COLUMN: Selected Finding Workspace & Decision Controls (8 cols on lg) */}
              <div className="lg:col-span-8 w-full space-y-3.5">
                {selectedFinding ? (
                  <>
                    {/* Header for Selected Finding */}
                    <div className="rounded-xl bg-[#05172C] border border-[#0F355E] p-3 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-base">
                          {selectedFinding.severity === "review_first" ? "🚨" : "⚠️"}
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-white font-mono">
                            {selectedFinding.title}
                          </h3>
                          <span className="text-[10.5px] text-blue-200/70 font-mono">
                            Category: {selectedFinding.category} · Ref: {selectedFinding.id}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-[#092244] border border-[#144A7E] text-[#F5B544] font-semibold">
                          {selectedFinding.visualType === "comparator_circuit"
                            ? "Circuit View"
                            : "3-Panel View"}
                        </span>
                      </div>
                    </div>

                    {/* Visual Finding Body: Type 1 (Standard 3-Paper) vs Type 2 (Comparator Circuit) */}
                    {selectedFinding.visualType === "comparator_circuit" ? (
                      <ComparatorFindingCard finding={selectedFinding} />
                    ) : (
                      <StandardPortmasterFindingCard finding={selectedFinding} />
                    )}

                    {/* Universal Advocate Decision Controls */}
                    <AdvocateDecisionControls
                      currentDecision={selectedFinding.decision}
                      onDecide={handleDecide}
                      onUndo={handleUndo}
                      canUndo={!!lastDecisionHistory}
                    />

                    {/* Collapsible Evidence & Details */}
                    <EvidenceDetailsArea
                      finding={selectedFinding}
                      onUpdateNotes={handleUpdateNotes}
                    />
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#144E8A] p-12 text-center text-blue-200/60 bg-[#05162A]/40 space-y-2">
                    <p className="text-sm font-bold text-white">No finding selected</p>
                    <p className="text-xs">Click a finding from the Review Queue on the left.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 7: Review Progress & Bottom Action Controls */}
          {!showCompletionView && (
            <div className="rounded-xl bg-[#041224] border border-[#0F3865] p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
              <div className="w-full sm:w-1/2 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-blue-300 font-semibold">
                    Review Progress: {reviewedCount} of {session.findings.length} evaluated
                  </span>
                  <span className="text-teal-300 font-bold">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-1.5 bg-[#092244]" />
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    toast.success("Progress saved automatically.");
                    handleBack();
                  }}
                  className="h-8 text-xs font-semibold bg-[#06182D] border-[#103D6D] text-blue-200 hover:text-white"
                >
                  <Save className="h-3.5 w-3.5 text-blue-300" />
                  <span>Save & Exit</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowCompletionView(true)}
                  className="h-8 text-xs font-bold bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 px-3.5 cursor-pointer shadow-md border border-teal-400/40"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Complete Portmaster Review</span>
                </Button>
              </div>
            </div>
          )}
        </main>

        {/* Universal IEP Document Intake Dialog */}
        <UniversalIepIntakeModal
          isOpen={isUniversalIntakeOpen}
          onClose={() => setIsUniversalIntakeOpen(false)}
          studentName={studentName}
          recentMeetingDate={meetingDate}
          onTriggerPortmaster={() => {
            setShowCompletionView(false);
            setSession((prev) => ({
              ...prev,
              findings: INITIAL_PORTMASTER_FINDINGS,
              status: "in_review",
            }));
          }}
        />
      </div>
    </ScopedErrorBoundary>
  );
}
