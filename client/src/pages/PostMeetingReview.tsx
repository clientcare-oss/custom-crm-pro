import React from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import PageIdBadge from "@/components/PageIdBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Anchor,
  FileCheck2,
  GitCompare,
  Clock,
  Sparkles,
  Shield,
  Layers,
  CheckCircle2,
} from "lucide-react";

export default function PostMeetingReview() {
  const params = useParams<{ studentId?: string }>();
  const [, setLocation] = useLocation();

  const searchParams =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const rawStudentId = params.studentId || searchParams?.get("studentId");
  const studentId = rawStudentId ? parseInt(rawStudentId, 10) : null;

  // Fetch student details if studentId is provided
  const { data: contacts } = trpc.contacts.list.useQuery();
  const activeStudent = contacts?.find((c) => c.id === studentId) || null;

  const studentName = activeStudent
    ? `${activeStudent.firstName} ${activeStudent.lastName}`
    : studentId
    ? `Student #${studentId}`
    : "Select a Student";

  const handleBack = () => {
    if (studentId) {
      setLocation(`/contacts/${studentId}`);
    } else {
      setLocation("/contacts");
    }
  };

  return (
    <ScopedErrorBoundary moduleName="PostMeetingReview (PG-044)">
      <div className="min-h-screen bg-[#030D1A] text-slate-100 flex flex-col">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-[#07192F]/90 backdrop-blur-md border-b border-[#0F355E] px-4 sm:px-6 py-3 shadow-md">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="h-8 px-2.5 text-xs text-blue-200 hover:text-white hover:bg-white/10 cursor-pointer inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-blue-400" />
                <span className="hidden sm:inline">Back to Workspace</span>
              </Button>

              <div className="h-4 w-[1px] bg-blue-500/30" />

              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-300">
                  <Anchor className="h-4 w-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-sm sm:text-base font-bold text-white tracking-wide">
                      Post-Meeting Review
                    </h1>
                    <PageIdBadge id="PG-044" name="Post-Meeting Review" />
                  </div>
                  <p className="text-[11px] text-blue-200/70">
                    Portmaster · IEP Amendment Review & Post-Meeting Verification
                  </p>
                </div>
              </div>
            </div>

            {/* Right side: Active Student Indicator & Quick Actions */}
            <div className="flex items-center gap-2.5">
              {activeStudent && (
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#051426] border border-[#103A66] text-xs">
                  <span className="text-[11px] text-blue-300/70">Student:</span>
                  <span className="font-bold text-[#F5B544]">{studentName}</span>
                </div>
              )}

              <Badge
                variant="outline"
                className="border-amber-500/40 text-amber-300 bg-amber-950/40 text-[10.5px] font-mono font-semibold"
              >
                Canvas Ready
              </Badge>
            </div>
          </div>
        </header>

        {/* Main Canvas Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4">
          {/* Top Info Banner (Small-Box Layout) */}
          <div className="rounded-xl bg-[#092244]/90 border border-[#144A7E] p-3 sm:p-4 shadow-md flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-[#0B2E5C] border border-[#1D5E9E] text-amber-400 shrink-0">
                <FileCheck2 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white">
                  Post-Meeting Review Workspace (PG-044)
                </h2>
                <p className="text-xs text-blue-200/70">
                  Inspect district amendment IEPs, verify team commitments against meeting notes, and audit PWN documents.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-[#051426] border border-[#103A66] text-[11px] font-mono text-teal-300">
                Module Canvas Initialized
              </span>
            </div>
          </div>

          {/* Blank Canvas / Awaiting Build-Out Directions */}
          <div className="rounded-2xl border-2 border-dashed border-[#133F6E] bg-[#05162B]/50 p-8 sm:p-12 text-center space-y-4 shadow-inner">
            <div className="w-14 h-14 rounded-2xl bg-[#082245] border border-[#1A5492] text-teal-300 flex items-center justify-center mx-auto shadow-md">
              <Anchor className="h-7 w-7 text-teal-400" />
            </div>

            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-base sm:text-lg font-bold text-white">
                Portmaster · Post-Meeting Review Canvas
              </h3>
              <p className="text-xs text-blue-200/75 leading-relaxed">
                This blank workspace is numbered <strong className="text-[#F5B544]">PG-044</strong> and ready for your build-out specifications.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-md bg-[#081F3B] border border-[#144A7E] text-[11px] text-blue-200 inline-flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-amber-400" />
                <span>IEP Amendment Comparison</span>
              </span>
              <span className="px-2.5 py-1 rounded-md bg-[#081F3B] border border-[#144A7E] text-[11px] text-blue-200 inline-flex items-center gap-1.5">
                <Shield className="h-3 w-3 text-teal-400" />
                <span>PWN Audit & Reconciliation</span>
              </span>
              <span className="px-2.5 py-1 rounded-md bg-[#081F3B] border border-[#144A7E] text-[11px] text-blue-200 inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                <span>Post-Meeting Action Verification</span>
              </span>
            </div>
          </div>
        </main>
      </div>
    </ScopedErrorBoundary>
  );
}
