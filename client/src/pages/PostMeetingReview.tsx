import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import PageIdBadge from "@/components/PageIdBadge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft,
  Anchor,
  FileSpreadsheet,
  ArrowRight,
  Upload,
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
import { TwinOverviewDeck } from "@/components/post-meeting-review/TwinOverviewDeck";
import { ReviewQueueList } from "@/components/post-meeting-review/ReviewQueueList";
import { StandardPortmasterFindingCard } from "@/components/post-meeting-review/StandardPortmasterFindingCard";
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
  const meetingDate = "Sept 18, 2026";

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
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
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
  const [isFullComparisonOpen, setIsFullComparisonOpen] = useState<boolean>(false);

  // Filtered queue items
  const filteredFindings = session.findings.filter((f) => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "review_first" || selectedFilter === "check") {
      return f.severity === selectedFilter;
    }
    return f.category === selectedFilter;
  });

  const selectedFinding =
    session.findings.find((f) => f.id === selectedFindingId) ||
    filteredFindings[0] ||
    session.findings[0];

  const currentFindingIndex = filteredFindings.findIndex((f) => f.id === selectedFinding?.id) + 1 || 1;

  // Handlers for navigation
  const handlePrevFinding = () => {
    const idx = filteredFindings.findIndex((f) => f.id === selectedFinding?.id);
    if (idx > 0) {
      setSelectedFindingId(filteredFindings[idx - 1].id);
    }
  };

  const handleNextFinding = () => {
    const idx = filteredFindings.findIndex((f) => f.id === selectedFinding?.id);
    if (idx < filteredFindings.length - 1) {
      setSelectedFindingId(filteredFindings[idx + 1].id);
    }
  };

  // Calculated progress
  const reviewedCount = session.findings.filter(
    (f) => f.decision === "confirmed" || f.decision === "not_a_concern" || f.decision === "hold"
  ).length;
  const progressPercent = Math.round((reviewedCount / session.findings.length) * 100);

  // Handlers: Decision & Auto-advance
  const handleDecide = (decision: FindingDecision) => {
    if (!selectedFinding) return;

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
      toast.warning(`Held for now: ${selectedFinding.title}`);
    }

    // Auto-advance to next unreviewed finding
    const currentIndex = filteredFindings.findIndex((f) => f.id === selectedFinding.id);
    const remainingUnreviewed = filteredFindings.filter(
      (f, idx) => idx > currentIndex && f.decision === "unreviewed"
    );

    if (remainingUnreviewed.length > 0) {
      setSelectedFindingId(remainingUnreviewed[0].id);
    } else {
      const anyUnreviewed = session.findings.find(
        (f) => f.id !== selectedFinding.id && f.decision === "unreviewed"
      );
      if (anyUnreviewed) {
        setSelectedFindingId(anyUnreviewed.id);
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
    toast.success("Portmaster Review completed! Case Compass synchronized.");
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
      <div className="min-h-screen bg-[#000820] text-slate-100 flex flex-col font-sans selection:bg-blue-500/30 selection:text-white">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-[#000820]/95 backdrop-blur-md border-b border-[#0F355E] px-4 sm:px-8 py-3 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
            {/* Left: Back button & Title hierarchy */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={handleBack}
                className="text-xs text-blue-300 hover:text-white cursor-pointer inline-flex items-center gap-1 transition-colors group font-medium"
              >
                <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                <span>Back to Student</span>
              </button>

              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
                  Post-Meeting Review
                </h1>
                <PageIdBadge id="PG-044" name="Post-Meeting Review" />
              </div>

              <div className="flex items-center gap-2 text-xs text-blue-200/80">
                <span className="font-semibold text-white">{studentName}</span>
                <span>•</span>
                <span>{grade}</span>
                <span>•</span>
                <span>{schoolDistrict}</span>
              </div>
            </div>

            {/* Right: Meeting info, View Meeting button & Portmaster Emblem */}
            <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <span className="text-xs text-blue-200/70 block">
                    Meeting: <span className="font-medium text-white">{meetingType}</span>
                  </span>
                  <span className="text-xs text-blue-300/90 font-mono block">
                    {meetingDate}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setLocation(`/meeting-workspace/${studentId}`)}
                  className="h-8.5 px-3 rounded-lg bg-[#061C38] border border-[#103D6D] text-xs font-semibold text-blue-200 hover:text-white hover:border-[#1E5D9C] cursor-pointer inline-flex items-center gap-1.5 transition-all shadow-sm"
                  title="View live meeting record and audio"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-blue-300" />
                  <span>View Meeting</span>
                </button>
              </div>

              {/* Portmaster IEP Agreement Verification Emblem */}
              <div className="flex items-center gap-2.5 pl-2 sm:pl-4 border-l border-[#0F355E]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0F3D78] to-[#061933] border border-[#F5B544] flex items-center justify-center shadow-md">
                  <Anchor className="h-4 w-4 text-[#F5B544]" />
                </div>
                <div>
                  <span className="text-sm font-black tracking-widest text-[#F5B544] block font-serif uppercase">
                    PORTMASTER
                  </span>
                  <span className="text-[9px] tracking-widest text-blue-200/80 block uppercase font-mono">
                    IEP AGREEMENT VERIFICATION
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5 pb-24">
          {/* SECTION 1: Guided Horizons Portmaster Process Strip */}
          <GuidedHorizonsProcessStrip
            currentStage={session.status === "completed" ? "complete" : "advocate_review"}
            previousIepDate="Aug 14, 2025"
            meetingDate="Sept 18, 2026"
            updatedIepDate="Sept 25, 2026"
          />

          {/* SECTION 2: Portmaster Review Summary Row */}
          <PortmasterReviewSummary
            totalAnalyzed={session.totalAnalyzedCount}
            clearedAutomatically={session.clearedAutomaticallyCount}
            findings={session.findings}
            isFullComparisonOpen={isFullComparisonOpen}
            onToggleFullComparison={() => setIsFullComparisonOpen(!isFullComparisonOpen)}
            activeViewMode="review"
          />

          {/* SECTION 3: Twin-Tile Overview Deck */}
          <TwinOverviewDeck
            onViewAllChanges={() => setIsFullComparisonOpen(true)}
            onFilterStatus={(status) => {
              if (status === "need_review") setSelectedFilter("check");
              if (status === "not_located") setSelectedFilter("review_first");
            }}
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
            /* SECTIONS 4 & 5: 2-Column Responsive Workspace */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* LEFT COLUMN: Unified Review Queue (4 cols on lg) */}
              <div className="lg:col-span-4 w-full">
                <ReviewQueueList
                  findings={filteredFindings}
                  selectedFindingId={selectedFinding?.id || null}
                  onSelectFinding={(id) => setSelectedFindingId(id)}
                  selectedFilter={selectedFilter}
                  onSelectFilter={(filter) => setSelectedFilter(filter)}
                />
              </div>

              {/* RIGHT COLUMN: Finding Workspace & Controls (8 cols on lg) */}
              <div className="lg:col-span-8 w-full space-y-4">
                {selectedFinding ? (
                  <>
                    {/* Visual 3-Panel Document Progression */}
                    <StandardPortmasterFindingCard
                      finding={selectedFinding}
                      currentIndex={currentFindingIndex}
                      totalCount={filteredFindings.length}
                      onPrev={handlePrevFinding}
                      onNext={handleNextFinding}
                    />

                    {/* Universal Advocate Decision Controls */}
                    <AdvocateDecisionControls
                      currentDecision={selectedFinding.decision}
                      onDecide={handleDecide}
                      onUndo={handleUndo}
                      canUndo={!!lastDecisionHistory}
                    />

                    {/* Collapsible Evidence & Details with 4 action tiles */}
                    <EvidenceDetailsArea
                      finding={selectedFinding}
                      onUpdateNotes={(notes) => {
                        setSession((prev) => ({
                          ...prev,
                          findings: prev.findings.map((f) =>
                            f.id === selectedFinding.id ? { ...f, decisionNotes: notes } : f
                          ),
                        }));
                      }}
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
        </main>

        {/* SECTION 6: Sticky Bottom Action Bar */}
        {!showCompletionView && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#000B26]/95 backdrop-blur-md border-t border-[#0F355E] px-4 sm:px-8 py-3.5 shadow-2xl">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
              {/* Left: Review Progress */}
              <div className="flex items-center gap-3 min-w-[240px] sm:min-w-[320px]">
                <span className="text-xs font-bold text-white whitespace-nowrap">
                  Review Progress
                </span>
                <Progress
                  value={progressPercent}
                  className="h-2 flex-1 bg-[#061C38] [&>div]:bg-[#2563EB]"
                />
                <span className="text-xs font-medium text-blue-200/80 whitespace-nowrap font-mono">
                  {reviewedCount} of {session.findings.length} completed
                </span>
              </div>

              {/* Right: Save and Exit + Complete Portmaster Review */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    toast.success("Progress saved automatically.");
                    handleBack();
                  }}
                  className="h-9 px-4 rounded-xl bg-[#061C38] border border-[#103D6D] text-xs font-semibold text-blue-200 hover:text-white hover:bg-[#0B2C52] cursor-pointer transition-all"
                >
                  Save and Exit
                </button>

                <button
                  type="button"
                  onClick={() => setShowCompletionView(true)}
                  className="h-9 px-4 sm:px-5 rounded-xl bg-gradient-to-r from-[#F5B544] to-[#E5A024] hover:from-[#F7BE5D] hover:to-[#F5B544] text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 cursor-pointer inline-flex items-center gap-2 transition-all"
                >
                  <span>Complete Portmaster Review</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

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
