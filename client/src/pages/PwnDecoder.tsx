import React, { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Compass,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Printer,
  History,
  CheckCircle2,
  AlertCircle,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ErrorBoundary from "@/components/ErrorBoundary";
import { PwnStudentSelector } from "@/components/pwn-decoder/PwnStudentSelector";
import { PwnDocumentInput } from "@/components/pwn-decoder/PwnDocumentInput";
import { PwnAtAGlance } from "@/components/pwn-decoder/PwnAtAGlance";
import { PwnRequirementsMatrix } from "@/components/pwn-decoder/PwnRequirementsMatrix";
import { PwnDecisionsSection } from "@/components/pwn-decoder/PwnDecisionsSection";
import { PwnPotentialProblems } from "@/components/pwn-decoder/PwnPotentialProblems";
import { PwnStrengthsSection } from "@/components/pwn-decoder/PwnStrengthsSection";
import { PwnFinalReview } from "@/components/pwn-decoder/PwnFinalReview";
import { PwnSummarySection } from "@/components/pwn-decoder/PwnSummarySection";
import { PwnPrintModal } from "@/components/pwn-decoder/PwnPrintModal";
import type { StudentHeaderInfo, FullPwnReview, AdvocateReviewStatus } from "@/components/pwn-decoder/types";

export default function PwnDecoder() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/tools/pwn-decoder/:reviewId");
  const [, altParams] = useRoute("/pwn-decoder/:reviewId");
  const routeReviewId = params?.reviewId || altParams?.reviewId;

  // Read URL query parameters (?studentId=123 or ?reviewId=456)
  const searchParams = new URLSearchParams(window.location.search);
  const queryStudentId = searchParams.get("studentId");
  const queryReviewId = searchParams.get("reviewId") || routeReviewId;

  // Active state
  const [selectedStudent, setSelectedStudent] = useState<StudentHeaderInfo | null>(null);
  const [currentReview, setCurrentReview] = useState<FullPwnReview | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // 1. Fetch all student contacts
  const { data: contacts, isLoading: isLoadingContacts } = trpc.contacts.list.useQuery();

  // Auto-select student if passed via query param
  useEffect(() => {
    if (queryStudentId && contacts && !selectedStudent) {
      const match = contacts.find((c: any) => c.id === Number(queryStudentId));
      if (match) {
        setSelectedStudent({
          id: match.id,
          name: `${match.firstName || ""} ${match.lastName || ""}`.trim() || `Student #${match.id}`,
          school: match.schoolName || null,
          district: match.countyDistrict || null,
          state: match.state || "GA",
          gradeLevel: match.gradeLevel || null,
        });
      }
    }
  }, [queryStudentId, contacts, selectedStudent]);

  // 2. Fetch student's Document Vault documents
  const {
    data: vaultDocuments = [],
    isLoading: isLoadingVault,
  } = trpc.pwnDecoder.getStudentVaultDocuments.useQuery(
    { studentContactId: selectedStudent?.id || 0 },
    { enabled: !!selectedStudent?.id }
  );

  // 3. Fetch previous reviews for the selected student
  const {
    data: previousReviews = [],
    refetch: refetchPreviousReviews,
  } = trpc.pwnDecoder.listReviewsByStudent.useQuery(
    { studentContactId: selectedStudent?.id || 0 },
    { enabled: !!selectedStudent?.id }
  );

  // 4. Fetch specific review if queryReviewId is set
  const { data: fetchedReview } = trpc.pwnDecoder.getReview.useQuery(
    { reviewId: Number(queryReviewId) },
    { enabled: !!queryReviewId && !isNaN(Number(queryReviewId)) }
  );

  useEffect(() => {
    if (fetchedReview) {
      setCurrentReview(fetchedReview as any);
      if (!selectedStudent && fetchedReview.student) {
        setSelectedStudent({
          id: fetchedReview.student.id,
          name: `${fetchedReview.student.firstName || ""} ${fetchedReview.student.lastName || ""}`.trim(),
          school: fetchedReview.student.schoolName,
          district: fetchedReview.student.countyDistrict,
          state: fetchedReview.student.state || "GA",
        });
      }
    }
  }, [fetchedReview, selectedStudent]);

  // tRPC Mutations
  const analyzeMutation = trpc.pwnDecoder.analyzePwn.useMutation({
    onSuccess: (data) => {
      setCurrentReview(data as any);
      refetchPreviousReviews();
      toast.success("Prior Written Notice successfully decoded!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to analyze PWN. Please try again.");
    },
  });

  const saveMutation = trpc.pwnDecoder.saveReview.useMutation({
    onSuccess: () => {
      refetchPreviousReviews();
      toast.success("PWN Review saved successfully!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save review.");
    },
  });

  const updateConcernMutation = trpc.pwnDecoder.updateConcern.useMutation({
    onSuccess: (updatedConcern) => {
      if (currentReview && updatedConcern) {
        setCurrentReview({
          ...currentReview,
          concerns: currentReview.concerns.map((c) =>
            c.id === updatedConcern.id ? ({ ...c, ...updatedConcern } as any) : c
          ),
        });
      }
      toast.success("Advocate review updated.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update finding.");
    },
  });

  // Action Handlers
  const handleAnalyze = (input: {
    rawText?: string;
    documentId?: number;
    pwnDocumentName?: string;
  }) => {
    if (!selectedStudent) {
      toast.error("Please select a student first.");
      return;
    }
    analyzeMutation.mutate({
      studentContactId: selectedStudent.id,
      documentId: input.documentId,
      pwnDocumentName: input.pwnDocumentName,
      rawText: input.rawText,
    });
  };

  const handleSaveReview = (
    status: "DRAFT" | "ADVOCATE_REVIEWED" | "COMPLETED",
    notes?: string
  ) => {
    if (!currentReview) return;
    saveMutation.mutate({
      reviewId: currentReview.id,
      status,
      advocateNotes: notes,
    });
    setCurrentReview({
      ...currentReview,
      status,
      advocateNotes: notes !== undefined ? notes : currentReview.advocateNotes,
    });
  };

  const handleUpdateConcern = (
    concernId: number,
    status: AdvocateReviewStatus,
    note?: string | null,
    correction?: string | null
  ) => {
    updateConcernMutation.mutate({
      concernId,
      advocateStatus: status,
      advocateNote: note,
      advocateCorrection: correction,
    });
  };

  const handleJumpToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleStartNewReview = () => {
    setCurrentReview(null);
  };

  const handleSelectPreviousReview = (reviewId: number) => {
    setLocation(`/tools/pwn-decoder?studentId=${selectedStudent?.id}&reviewId=${reviewId}`);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#000820] text-slate-100 p-4 sm:p-6 md:p-8">
        <div className="max-w-5xl mx-auto w-full space-y-8">
          {/* Top Navigation & Tool Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
            <div className="flex items-start gap-3.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/tools")}
                className="h-9 px-3 border-white/10 hover:bg-white/5 text-slate-300 rounded-xl"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Tools Hub
              </Button>

              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-xl sm:text-2xl font-black font-serif tracking-tight text-white flex items-center gap-2">
                    <span>🧭</span>
                    <span>PWN DECODER</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-300 uppercase tracking-widest font-mono">
                    PG-010-PWN
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-snug">
                  Decode what the district proposed, refused, explained, and may have missed.
                </p>
              </div>
            </div>

            {/* Quick Actions if review is loaded */}
            {currentReview && (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="h-8 text-xs border-white/10 hover:bg-white/5 text-slate-300 flex items-center gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5 text-amber-400" />
                  <span>Print Review</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStartNewReview}
                  className="h-8 text-xs border-white/10 hover:bg-white/5 text-slate-300 flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                  <span>New PWN Review</span>
                </Button>
              </div>
            )}
          </div>

          {/* STEP 1: SELECT STUDENT */}
          <section className="bg-[#000820]/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <PwnStudentSelector
              contacts={contacts}
              isLoading={isLoadingContacts}
              selectedStudent={selectedStudent}
              onSelectStudent={(student) => {
                setSelectedStudent(student);
                setCurrentReview(null);
              }}
              onClearStudent={() => {
                setSelectedStudent(null);
                setCurrentReview(null);
              }}
              previousReviews={previousReviews}
              onSelectPreviousReview={handleSelectPreviousReview}
            />
          </section>

          {/* STEP 2: ADD PWN (if student is selected and no active review is showing, or ready to decode) */}
          {selectedStudent && !currentReview && (
            <section className="bg-[#000820]/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <PwnDocumentInput
                studentId={selectedStudent.id}
                vaultDocuments={vaultDocuments}
                isLoadingVault={isLoadingVault}
                onAnalyze={handleAnalyze}
                isAnalyzing={analyzeMutation.isPending}
              />
            </section>
          )}

          {/* ACTIVE PWN ANALYSIS REVIEW SUITE */}
          {currentReview && (
            <div className="space-y-10">
              {/* 1. PWN At A Glance */}
              <section className="bg-[#000820]/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <PwnAtAGlance
                  review={currentReview}
                  onJumpToSection={handleJumpToSection}
                />
              </section>

              {/* 2. What Did The District Decide? */}
              <section className="bg-[#000820]/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <PwnDecisionsSection decisions={currentReview.decisions} />
              </section>

              {/* 3. Required PWN Elements Matrix */}
              <section className="bg-[#000820]/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <PwnRequirementsMatrix requirements={currentReview.requirements} />
              </section>

              {/* 4. Potential Problems Radar */}
              <section className="bg-[#000820]/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <PwnPotentialProblems
                  concerns={currentReview.concerns}
                  onUpdateConcern={handleUpdateConcern}
                />
              </section>

              {/* 5. What This PWN Does Well (Balanced Strengths) */}
              {currentReview.strengths && currentReview.strengths.length > 0 && (
                <section className="bg-[#000820]/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
                  <PwnStrengthsSection strengths={currentReview.strengths} />
                </section>
              )}

              {/* 6. Final Review Triage Queue */}
              <section className="bg-[#000820]/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <PwnFinalReview
                  concerns={currentReview.concerns}
                  requirements={currentReview.requirements}
                />
              </section>

              {/* 7. PWN Review Summary & Save Actions */}
              <section className="bg-[#000820]/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <PwnSummarySection
                  review={currentReview}
                  onSaveReview={handleSaveReview}
                  isSaving={saveMutation.isPending}
                  onOpenPrint={() => setIsPrintModalOpen(true)}
                />
              </section>
            </div>
          )}

          {/* Printable Review Modal */}
          {isPrintModalOpen && currentReview && (
            <PwnPrintModal
              review={currentReview}
              onClose={() => setIsPrintModalOpen(false)}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
