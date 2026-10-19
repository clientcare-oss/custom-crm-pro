import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Scale,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronRight,
  Plus,
  Trash2,
  Search,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Layers,
  Wand2,
  Clock,
  HelpCircle,
  Check,
  X,
  Copy,
  MessageSquare,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  PenTool,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { VoiceTextarea } from "./VoiceTextarea";
import {
  COMMON_ALLEGATION_PRESETS,
  EXTENSIVE_COMMON_RESOLUTIONS,
  RESOLUTION_CATEGORIES,
  type ResolutionCategory,
  type ResolutionItem,
} from "./complaintSetupData";
import {
  type OfficialComplaintFormState,
  SUPPORTED_STATE_FORMS,
} from "./stateFormsData";

interface ComplaintSetupViewProps {
  formState: OfficialComplaintFormState;
  onChange: (updater: (prev: OfficialComplaintFormState) => OfficialComplaintFormState) => void;
  caseDetails: {
    studentName?: string;
    district?: string;
    state?: string;
    school?: string;
    grade?: string;
    preparedBy?: string;
  };
  onApplyToDocketSections?: (updates: {
    statementOfViolations: string;
    factsRelatingToViolations: string;
    proposedResolution: string;
  }) => void;
  onNavigateToStateForm?: () => void;
  onNavigateToRestatement?: () => void;
}

export function ComplaintSetupView({
  formState,
  onChange,
  caseDetails,
  onApplyToDocketSections,
  onNavigateToStateForm,
  onNavigateToRestatement,
}: ComplaintSetupViewProps) {
  // Working draft states — initialized from parent formState without erasing empty strings
  const [statement, setStatement] = useState<string>(
    formState.statementOfViolations !== undefined
      ? formState.statementOfViolations
      : "The public agency failed to provide mandated specialized instruction and missed related services specified in the student's IEP."
  );
  const [facts, setFacts] = useState<string>(
    formState.factsRelatingToViolations !== undefined
      ? formState.factsRelatingToViolations
      : "The operative IEP required 150 minutes weekly of specialized instruction. Starting in October 2025, scheduled sessions were canceled without compensatory make-up time. Requests for assessment and written notice went unanswered."
  );
  const [resolutionText, setResolutionText] = useState<string>(
    formState.proposedResolution !== undefined
      ? formState.proposedResolution
      : "1. Award 60 hours of certified 1-on-1 academic compensatory instruction.\n2. Fund an Independent Educational Evaluation (IEE) at public expense.\n3. Reconvene the IEP team within 15 school days to amend the operative IEP.\n4. Mandate administrative training on Prior Written Notice (PWN) timelines."
  );

  // Ref to track last synced values and prevent feedback loops
  const lastSyncedRef = useRef({ statement, facts, resolutionText });

  // Sync external changes (e.g. from draft loading or Quick Text Editor) into local fields
  useEffect(() => {
    if (
      formState.statementOfViolations !== undefined &&
      formState.statementOfViolations !== lastSyncedRef.current.statement
    ) {
      lastSyncedRef.current.statement = formState.statementOfViolations;
      setStatement(formState.statementOfViolations);
    }
    if (
      formState.factsRelatingToViolations !== undefined &&
      formState.factsRelatingToViolations !== lastSyncedRef.current.facts
    ) {
      lastSyncedRef.current.facts = formState.factsRelatingToViolations;
      setFacts(formState.factsRelatingToViolations);
    }
    if (
      formState.proposedResolution !== undefined &&
      formState.proposedResolution !== lastSyncedRef.current.resolutionText
    ) {
      lastSyncedRef.current.resolutionText = formState.proposedResolution;
      setResolutionText(formState.proposedResolution);
    }
  }, [
    formState.statementOfViolations,
    formState.factsRelatingToViolations,
    formState.proposedResolution,
  ]);

  // Real-time automatic two-way sync to parent officialFormState on every keystroke
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    lastSyncedRef.current = { statement, facts, resolutionText };
    onChange((prev) => {
      if (
        prev.statementOfViolations === statement &&
        prev.factsRelatingToViolations === facts &&
        prev.proposedResolution === resolutionText
      ) {
        return prev;
      }
      return {
        ...prev,
        statementOfViolations: statement,
        factsRelatingToViolations: facts,
        proposedResolution: resolutionText,
      };
    });
  }, [statement, facts, resolutionText, onChange]);

  // Resolution library selection states
  const [selectedResolutions, setSelectedResolutions] = useState<string[]>([
    "comp-tutoring-1on1",
    "iee-comprehensive",
    "iep-reconvene-15days",
    "train-pwn-timelines",
  ]);
  const [activeCategory, setActiveCategory] = useState<ResolutionCategory | "All">("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [customResolutionInput, setCustomResolutionInput] = useState<string>("");

  // Dispute Storyboard & Educational Guidance States (persists across binder navigation)
  const [rawStory, setRawStory] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem(`complaint_raw_story_${caseDetails.studentName || "active"}`) || "";
      } catch (e) {}
    }
    return "";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`complaint_raw_story_${caseDetails.studentName || "active"}`, rawStory);
      } catch (e) {}
    }
  }, [rawStory, caseDetails.studentName]);

  const [showGuidance, setShowGuidance] = useState<boolean>(true);

  // tRPC mutation for AI statutory refinement
  const refineMutation = trpc.stateComplaint.refineIssues.useMutation({
    onSuccess: (data) => {
      if (data.refinedStatementOfViolations) {
        setStatement(data.refinedStatementOfViolations);
      }
      if (data.refinedFactsRelatingToViolations) {
        setFacts(data.refinedFactsRelatingToViolations);
      }
      if (data.refinedProposedResolution) {
        setResolutionText(data.refinedProposedResolution);
      }

      // Immediately sync to parent form state
      onChange((prev) => ({
        ...prev,
        statementOfViolations: data.refinedStatementOfViolations || prev.statementOfViolations,
        factsRelatingToViolations: data.refinedFactsRelatingToViolations || prev.factsRelatingToViolations,
        proposedResolution: data.refinedProposedResolution || prev.proposedResolution,
      }));

      // Update docket sections if handler provided
      if (onApplyToDocketSections) {
        onApplyToDocketSections({
          statementOfViolations: data.refinedStatementOfViolations || statement,
          factsRelatingToViolations: data.refinedFactsRelatingToViolations || facts,
          proposedResolution: data.refinedProposedResolution || resolutionText,
        });
      }

      toast.success("AI synthesized your story into formal statutory counts & facts below!");

      setTimeout(() => {
        document.getElementById("prong-1-statement")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    },
    onError: (err) => {
      toast.error(`Refinement failed: ${err.message}`);
    },
  });

  const stateConfig =
    SUPPORTED_STATE_FORMS[formState.stateCode?.toUpperCase() || "GA"] ||
    SUPPORTED_STATE_FORMS.GA;

  // Toggle resolution item
  const toggleResolution = (id: string) => {
    setSelectedResolutions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Filtered resolutions
  const filteredResolutions = EXTENSIVE_COMMON_RESOLUTIONS.filter((res) => {
    const matchesCategory = activeCategory === "All" || res.category === activeCategory;
    const matchesSearch =
      searchQuery === "" ||
      res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.details.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Insert selected resolutions into resolutionText
  const handleInsertSelectedResolutions = () => {
    const selectedItems = EXTENSIVE_COMMON_RESOLUTIONS.filter((r) =>
      selectedResolutions.includes(r.id)
    );
    if (!selectedItems.length) {
      toast.error("Please click to select at least one resolution from the library below");
      return;
    }

    const formatted = selectedItems
      .map((item, idx) => `${idx + 1}. ${item.title}: ${item.details}`)
      .join("\n\n");

    setResolutionText((prev) => (prev.trim() ? `${prev.trim()}\n\n${formatted}` : formatted));
    toast.success(`Inserted ${selectedItems.length} selected resolutions into Proposed Resolution (Prong #3)`);
  };

  // Master AI Refinement action
  const handleRunAiRefinement = () => {
    const selectedItemTexts = EXTENSIVE_COMMON_RESOLUTIONS.filter((r) =>
      selectedResolutions.includes(r.id)
    ).map((r) => `${r.title}: ${r.details}`);

    refineMutation.mutate({
      statementOfViolations: statement,
      factsRelatingToViolations: facts,
      proposedResolution: resolutionText,
      selectedResolutions: selectedItemTexts,
      stateCode: formState.stateCode || "GA",
      studentName: caseDetails.studentName || formState.studentName || "Student",
      districtName: caseDetails.district || formState.publicAgency || "Local Educational Agency",
    });
  };

  // Convert raw dispute narrative into 3 formal legal prongs
  const handleBuildFromStory = () => {
    if (!rawStory.trim()) {
      toast.error("Please describe what happened first or click a Quick Story Starter above");
      return;
    }

    const selectedItemTexts = EXTENSIVE_COMMON_RESOLUTIONS.filter((r) =>
      selectedResolutions.includes(r.id)
    ).map((r) => `${r.title}: ${r.details}`);

    refineMutation.mutate({
      statementOfViolations: rawStory,
      factsRelatingToViolations: rawStory,
      proposedResolution: resolutionText,
      selectedResolutions: selectedItemTexts,
      stateCode: formState.stateCode || "GA",
      studentName: caseDetails.studentName || formState.studentName || "Student",
      districtName: caseDetails.district || formState.publicAgency || "Local Educational Agency",
    });
  };

  // Apply to State Form & Sections
  const handleApplyToStateForm = () => {
    // Update parent officialFormState
    onChange((prev) => ({
      ...prev,
      statementOfViolations: statement,
      factsRelatingToViolations: facts,
      proposedResolution: resolutionText,
    }));

    // Update docket pages (Clarity Control and Chronological Summary)
    if (onApplyToDocketSections) {
      onApplyToDocketSections({
        statementOfViolations: statement,
        factsRelatingToViolations: facts,
        proposedResolution: resolutionText,
      });
    }

    toast.success("Inserted issues, facts & resolutions into Official State Form and Legal Restatement!");
  };

  // Copy full 3-prong complaint draft summary to clipboard
  const handleCopyComplaintSummary = async () => {
    const fullText = `=== STATE COMPLAINT DRAFT SUMMARY ===\nSTUDENT: ${caseDetails.studentName || formState.studentName || "Student"}\nAGENCY: ${caseDetails.district || formState.publicAgency || "District"}\nJURISDICTION: ${stateConfig.shortAgency} (${stateConfig.name})\n\n[1. STATEMENT OF ALLEGED VIOLATIONS]\n${statement}\n\n[2. FACTS RELATING TO ALLEGED VIOLATIONS]\n${facts}\n\n[3. PROPOSED RESOLUTIONS / PRAYER FOR RELIEF]\n${resolutionText}`;
    try {
      await navigator.clipboard.writeText(fullText);
      toast.success("Copied 3-prong complaint summary to clipboard!");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 pb-52 text-slate-100">
      {/* ── Admiralty Studio Header & Context Banner ─────────────────────── */}
      <div className="rounded-xl border border-[#3A2C18] bg-gradient-to-r from-[#05142B] via-[#0A2244] to-[#05142B] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#DFBE77]/10 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono tracking-wider font-bold bg-[#DFBE77]/20 border border-[#DFBE77]/40 text-[#FFE394]">
                PG-020-SET · COMPLAINT SETUP STUDIO
              </span>
              <span className="flex items-center gap-1 text-[11px] text-[#A69371] font-serif">
                <ShieldCheck className="w-3.5 h-3.5 text-[#DFBE77]" />
                <span>Statutory Pre-Filing Intake & Legal Refinement</span>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#FFF4D4] tracking-tight">
              State Complaint Setup & Statutory Issue Builder
            </h2>
            <p className="text-xs sm:text-[13px] text-[#C6B697] max-w-3xl mt-1 leading-relaxed">
              Walk through your client's dispute in plain English. Waypoint AI will refine your allegations into formal counts under 34 C.F.R. § 300, connect governing state education rules, and structure an authoritative prayer for relief before pushing directly into the official state complaint filing form.
            </p>
          </div>

          {/* Student & Agency Quick Stats */}
          <div className="flex items-center gap-3 bg-[#020A17]/90 border border-[#3A2C18] rounded-lg p-2.5 shadow-inner">
            <div className="text-right">
              <div className="text-[10px] font-mono uppercase text-[#A69371]">Complainant / Student</div>
              <div className="text-xs font-serif font-bold text-[#FFE394]">
                {caseDetails.studentName || formState.studentName || "Student on Record"}
              </div>
              <div className="text-[10px] text-[#C6B697]">
                {caseDetails.district || formState.publicAgency || "Local School District"}
              </div>
            </div>
            <div className="h-8 w-[1px] bg-[#3A2C18]" />
            <div className="text-left">
              <div className="text-[10px] font-mono uppercase text-[#A69371]">Filing Jurisdiction</div>
              <div className="text-xs font-serif font-bold text-white">
                {stateConfig.shortAgency} ({stateConfig.name})
              </div>
              <div className="text-[10px] text-[#DFBE77] font-medium">60-Day Investigation Rule</div>
            </div>
          </div>
        </div>

        {/* 1-Year Statute of Limitations Guardrail Alert Banner */}
        <div className="mt-4 pt-3 border-t border-[#3A2C18]/60 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 text-[#FFE394] font-medium">
            <Clock className="w-4 h-4 text-[#DFBE77] shrink-0" />
            <span>
              <strong>Statutory 1-Year Limitation (34 C.F.R. § 300.153(c)):</strong> All alleged violations must have occurred not more than one year prior to the date the complaint is received by {stateConfig.shortAgency}.
            </span>
          </div>
          <div className="text-[11px] text-[#C6B697] font-mono">
            Filing Window: {new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toLocaleDateString()} — {new Date().toLocaleDateString()}
          </div>
        </div>

        {/* Quick Top Actions & Form Status Bar */}
        <div className="mt-3 pt-3 border-t border-[#3A2C18]/80 flex items-center justify-between flex-wrap gap-3 bg-[#020A17]/60 -mx-5 -mb-5 px-5 py-2.5 rounded-b-xl">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-[#FFF4D4] font-medium">
              3 Prongs Ready: Violations, Relevant Facts & Resolutions
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              size="sm"
              onClick={handleApplyToStateForm}
              className="bg-[#061C3D] hover:bg-[#0C2E5E] text-[#FFE394] hover:text-[#FFF4D4] font-serif font-bold text-xs h-8 px-3.5 gap-1.5 rounded-md border border-[#C5A059] shadow-xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-[#DFBE77]" />
              <span>Sync & Apply</span>
            </Button>

            {onNavigateToStateForm && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  handleApplyToStateForm();
                  onNavigateToStateForm();
                }}
                className="bg-gradient-to-r from-[#FFE394] via-[#DFBE77] to-[#C5A059] text-[#05142B] font-serif font-bold text-xs h-8 px-4 gap-1.5 rounded-md border border-[#FFF4D4] shadow-xs hover:brightness-110 cursor-pointer"
              >
                <span>Next Step: Insert Form & Restatement</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── 3 CORE FILING PRONGS (STUDIO INPUT CARDS) ────────────────────── */}
      <div className="grid grid-cols-1 gap-6">

        {/* ── STAGE 0: DISPUTE STORYBOARD & PLAIN-ENGLISH INTAKE ────────── */}
        <div className="rounded-xl border-2 border-[#C5A059]/70 bg-gradient-to-r from-[#05142B] via-[#092244] to-[#05142B] p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFE394] via-[#DFBE77] to-[#9E7D3B] text-[#05142B] flex items-center justify-center shadow-md border border-[#FFF4D4] shrink-0 mt-0.5">
                <MessageSquare className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#DFBE77]/20 text-[#FFE394] border border-[#DFBE77]/40 tracking-wider">
                    START HERE · THE ADVOCATE'S STORYBOARD
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono text-emerald-300 bg-emerald-500/20 border border-emerald-500/40">
                    Voice Dictation Enabled
                  </span>
                </div>
                <h3 className="font-serif text-lg sm:text-xl font-bold text-[#FFF4D4] mt-1">
                  What Happened? Tell the Story in Plain English
                </h3>
                <p className="text-xs text-[#C6B697] leading-relaxed max-w-2xl mt-0.5">
                  Start here! Don't worry about legal citations or counts yet. Talk through what the school did or failed to do. Click <strong>"Build Out Into 3 Legal Prongs ✨"</strong> to have Waypoint AI transform your narrative into formal IDEA counts below.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowGuidance((prev) => !prev)}
              className="border-[#C5A059]/60 bg-[#061833] text-[#FFE394] hover:text-[#FFF4D4] hover:border-[#FFE394] text-xs gap-1.5 shrink-0 cursor-pointer shadow-xs"
            >
              <Lightbulb className="w-3.5 h-3.5 text-[#DFBE77]" />
              <span>{showGuidance ? "Hide Violation Guide" : "What Should a Violation Look Like?"}</span>
              {showGuidance ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </div>

          {/* ── EDUCATIONAL GUIDE: What a Statement of Alleged Violation Should Look Like ── */}
          {showGuidance && (
            <div className="mb-4 rounded-lg border border-[#C5A059]/40 bg-[#020C1B] p-4 text-xs space-y-3 shadow-inner">
              <div className="flex items-center gap-2 text-[#FFE394] font-serif font-bold text-sm border-b border-[#3A2C18] pb-2">
                <BookOpen className="w-4 h-4 text-[#DFBE77]" />
                <span>Understanding What a Statement of Alleged Violation Must Contain</span>
              </div>

              {/* 3 Core Rules Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-[#05142B] border border-[#213A5E] rounded-md p-2.5">
                  <div className="font-mono text-[10px] text-[#DFBE77] font-bold uppercase mb-1">
                    1. The Legal Duty
                  </div>
                  <p className="text-[11px] text-[#C6B697] leading-relaxed">
                    Must cite an IDEA obligation (34 C.F.R. § 300) or {stateConfig.shortAgency} special ed rule (e.g. Failure to Implement IEP, Child Find delays, PWN omission, or disciplinary removal without MDR).
                  </p>
                </div>

                <div className="bg-[#05142B] border border-[#213A5E] rounded-md p-2.5">
                  <div className="font-mono text-[10px] text-[#DFBE77] font-bold uppercase mb-1">
                    2. Within 1 Year
                  </div>
                  <p className="text-[11px] text-[#C6B697] leading-relaxed">
                    Under 34 C.F.R. § 300.153(c), the incident must have occurred not more than 365 days prior to filing. Always include specific calendar dates or date ranges.
                  </p>
                </div>

                <div className="bg-[#05142B] border border-[#213A5E] rounded-md p-2.5">
                  <div className="font-mono text-[10px] text-[#DFBE77] font-bold uppercase mb-1">
                    3. The Concrete Breach
                  </div>
                  <p className="text-[11px] text-[#C6B697] leading-relaxed">
                    State exactly what the LEA did or failed to do (e.g., missed 60 hours of speech, altered placement without consent, refused evaluation without written notice).
                  </p>
                </div>
              </div>

              {/* Before & After Example */}
              <div className="border border-[#2E4A73] rounded-md overflow-hidden">
                <div className="bg-[#0B254A] px-3 py-1.5 font-serif font-bold text-[11px] text-[#FFF4D4] flex items-center justify-between">
                  <span>Example: Everyday Parent Story ➔ Formal State Complaint Count</span>
                  <span className="text-[10px] font-mono text-[#DFBE77]">34 C.F.R. § 300.153 Compliant</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#213A5E] bg-[#031124] p-3 gap-3">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-rose-300 font-bold mb-1 flex items-center gap-1">
                      <span>✕ Raw Parent Story (What Happened):</span>
                    </div>
                    <p className="text-[11px] text-[#D8C7A5] italic leading-relaxed bg-[#05142B] p-2 rounded border border-[#213A5E]">
                      "The school principal ignored my emails about testing and my son didn't get his reading help all fall semester even though the IEP said he gets it daily."
                    </p>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase text-emerald-300 font-bold mb-1 flex items-center gap-1">
                      <span>✓ Formal State Complaint Violation (Prong #1):</span>
                    </div>
                    <p className="text-[11px] text-[#FFE394] leading-relaxed bg-[#061C3D] p-2 rounded border border-[#C5A059]/60 font-serif">
                      <strong>COUNT I — FAILURE TO IMPLEMENT OPERATIVE IEP</strong> (34 C.F.R. § 300.323(c)(2); {stateConfig.shortAgency} Rule): The Local Educational Agency failed to provide 150 weekly minutes of specialized reading instruction mandated in the student's October 14, 2025 IEP between October 2025 and January 2026, constituting a substantive denial of FAPE within the statutory filing period.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Factual Story Starters */}
          <div className="mb-2.5">
            <div className="text-[11px] font-mono text-[#A69371] uppercase mb-1.5 flex items-center gap-1.5">
              <span>Quick Story Starters:</span>
              <span className="text-[10px] text-[#C6B697] lowercase">(click to append to your story narrative)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Evaluation Request Ignored", snippet: "\n• Parent submitted a formal written request for special education evaluation, but the district failed to provide consent forms or issue a Prior Written Notice (PWN) within the required timeline." },
                { label: "Missed Speech / OT Services", snippet: "\n• The student's IEP mandates related therapy services, but service delivery logs show that scheduled sessions were canceled for months without compensatory make-up time." },
                { label: "Unilateral Placement Change", snippet: "\n• The district unilaterally altered the student's educational placement and classroom setting without convening an IEP team meeting or obtaining parent consent." },
                { label: "Sent Home Without MDR", snippet: "\n• The school repeatedly sent the student home for behavior (informal disciplinary removal) exceeding 10 cumulative school days without conducting a Manifestation Determination Review (MDR)." },
                { label: "Accommodations Denied", snippet: "\n• Mandated classroom accommodations and testing modifications specified in the operative IEP were ignored by general education teachers." },
              ].map((starter) => (
                <button
                  key={starter.label}
                  type="button"
                  onClick={() => {
                    setRawStory((prev) => `${prev.trim()}${starter.snippet}`);
                    toast.success(`Appended: ${starter.label}`);
                  }}
                  className="px-2.5 py-1 rounded-md bg-[#020A17] hover:bg-[#071C3A] border border-[#3A2C18] hover:border-[#DFBE77] text-[#C6B697] hover:text-[#FFF4D4] text-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-[#DFBE77]" />
                  <span>{starter.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Story Typing Box Container with Admiralty Brass Header */}
          <div className="rounded-xl border border-[#3A2C18] bg-[#031124]/90 p-4 sm:p-5 shadow-lg">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#DFBE77]/15 border border-[#DFBE77]/40 text-[#FFE394] font-serif text-xs font-bold shadow-xs">
                  <PenTool className="w-3.5 h-3.5 text-[#DFBE77]" />
                  Main Dispute Narrative Input Box
                </span>
                <span className="text-[#C6B697] text-xs font-sans">
                  Type what happened or click the microphone to speak
                </span>
              </div>
              <span className="text-xs text-[#A69371] font-mono hidden sm:inline">
                Plain English · No Legal Citations Needed
              </span>
            </div>

            <VoiceTextarea
              value={rawStory}
              onChange={setRawStory}
              rows={6}
              placeholder="Start typing your dispute story here... (e.g., 'In October we asked for an evaluation in writing because he was failing reading, but the school never responded. Then in November they cut his speech therapy in half without telling us, and last week they suspended him for 3 days without an MDR...')"
              className="w-full"
              textareaClassName="bg-[#0D2B52] border-2 border-[#C5A059] hover:border-[#DFBE77] focus:border-[#FFE394] focus:ring-2 focus:ring-[#DFBE77]/40 focus:bg-[#103362] text-[#FFFDF5] text-base font-medium placeholder:text-[#8EA6C5] shadow-inner rounded-lg p-3.5 leading-relaxed transition-all"
            />
          </div>

          {/* Bottom Bar: Action Trigger to Build 3 Prongs */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-[#3A2C18]/60">
            <div className="flex items-center gap-3 text-xs text-[#A69371]">
              <span>Click mic above to dictate · Speak naturally</span>
              <span>·</span>
              <span className="font-mono">{rawStory.length} characters</span>
            </div>

            <div className="flex items-center gap-2.5">
              {rawStory && (
                <button
                  type="button"
                  onClick={() => setRawStory("")}
                  className="text-xs text-[#C6B697] hover:text-rose-300 underline cursor-pointer"
                >
                  Clear Story
                </button>
              )}

              <Button
                type="button"
                onClick={handleBuildFromStory}
                disabled={refineMutation.isPending}
                className="bg-gradient-to-r from-[#FFE394] via-[#DFBE77] to-[#C5A059] text-[#05142B] font-serif font-bold text-xs sm:text-sm h-9 px-4 gap-2 rounded-lg border border-[#FFF4D4] shadow-md hover:brightness-110 transition-all cursor-pointer"
              >
                <Wand2 className="w-4 h-4 stroke-[2.5]" />
                <span>{refineMutation.isPending ? "Analyzing & Building..." : "Build Out Into 3 Legal Prongs ✨"}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ── PRONG #1: Statement of Alleged Violation(s) ──────────────────── */}
        <div id="prong-1-statement" className="rounded-xl border border-[#3A2C18] bg-[#05142B]/95 p-5 shadow-lg relative scroll-mt-24">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-start gap-2.5">
              <span className="w-7 h-7 rounded-full bg-[#DFBE77]/20 border border-[#DFBE77]/50 text-[#FFE394] font-serif font-bold text-sm flex items-center justify-center shrink-0">
                1
              </span>
              <div>
                <h3 className="font-serif text-base sm:text-lg font-bold text-[#FFF4D4] flex items-center gap-2">
                  <span>*Statement of Alleged Violation(s)</span>
                  <span className="text-[11px] font-sans font-normal px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Mandatory Section
                  </span>
                </h3>
                <p className="text-xs text-[#C6B697] mt-0.5 leading-relaxed">
                  State the requirement(s) or obligation(s) you believe the public agency failed to follow as it pertains to the IDEA and/or state special education rules. The alleged violation(s) must have occurred not more than one year prior to the date the complaint is received by {stateConfig.shortAgency}.
                </p>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleRunAiRefinement}
              disabled={refineMutation.isPending}
              className="border-[#DFBE77]/60 bg-[#092244] text-[#FFE394] hover:text-white hover:border-[#FFE394] gap-1.5 text-xs shrink-0 cursor-pointer shadow-xs"
            >
              <Wand2 className="w-3.5 h-3.5 text-[#DFBE77]" />
              <span>Refine with AI</span>
            </Button>
          </div>

          {/* Quick-Pick Common Violation Chips */}
          <div className="mb-3">
            <div className="text-[11px] font-mono text-[#A69371] uppercase mb-1.5 flex items-center gap-1.5">
              <span>Quick-Add Common Violations:</span>
              <span className="text-[10px] text-[#C6B697] lowercase">(click to append to statement)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_ALLEGATION_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    const toAdd = `\n\n• ${preset.shortTitle} (${preset.federalCitation}): ${preset.promptSnippet}`;
                    setStatement((prev) => (prev ? `${prev.trim()}${toAdd}` : preset.promptSnippet));
                    toast.success(`Appended: ${preset.shortTitle}`);
                  }}
                  className="px-2.5 py-1 rounded bg-[#031124] hover:bg-[#071C3A] border border-[#3A2C18] hover:border-[#DFBE77]/80 text-[#C6B697] hover:text-[#FFF4D4] text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3 h-3 text-[#DFBE77]" />
                  <span>{preset.shortTitle}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Voice-to-Text Enabled Textarea */}
          <VoiceTextarea
            value={statement}
            onChange={setStatement}
            rows={5}
            placeholder="Describe the legal requirements or special education obligations the public agency failed to follow (e.g., failure to implement IEP accommodations, Child Find evaluation delays, unilateral removal, or missing PWN)..."
            className="w-full"
            textareaClassName="bg-[#092244] border border-[#3A5D8A] focus:border-[#C5A059] focus:ring-2 focus:ring-[#DFBE77]/30 focus:bg-[#0C2A54] text-white text-sm font-medium placeholder:text-[#8EA6C5] shadow-inner rounded-lg p-3 leading-relaxed transition-all"
          />

          <div className="flex items-center justify-between text-[11px] text-[#A69371] mt-2">
            <span>Voice transcription supported · Click mic to dictate directly</span>
            <span className="font-mono">{statement.length} characters</span>
          </div>
        </div>

        {/* ── PRONG #2: Facts Relating to Alleged Violation(s) ─────────────── */}
        <div className="rounded-xl border border-[#3A2C18] bg-[#05142B]/95 p-5 shadow-lg relative">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-start gap-2.5">
              <span className="w-7 h-7 rounded-full bg-[#DFBE77]/20 border border-[#DFBE77]/50 text-[#FFE394] font-serif font-bold text-sm flex items-center justify-center shrink-0">
                2
              </span>
              <div>
                <h3 className="font-serif text-base sm:text-lg font-bold text-[#FFF4D4] flex items-center gap-2">
                  <span>*Facts Relating to Alleged Violation(s)</span>
                  <span className="text-[11px] font-sans font-normal px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Mandatory Section
                  </span>
                </h3>
                <p className="text-xs text-[#C6B697] mt-0.5 leading-relaxed">
                  State the facts relevant to the alleged violations that help explain or clarify how, or in what way, the public agency failed to follow the IDEA and/or state special education rules. Include key dates, meetings, service logs, and communications.
                </p>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleRunAiRefinement}
              disabled={refineMutation.isPending}
              className="border-[#DFBE77]/60 bg-[#092244] text-[#FFE394] hover:text-white hover:border-[#FFE394] gap-1.5 text-xs shrink-0 cursor-pointer shadow-xs"
            >
              <Wand2 className="w-3.5 h-3.5 text-[#DFBE77]" />
              <span>Refine Facts</span>
            </Button>
          </div>

          {/* Quick Factual Milestone Prompt Helpers */}
          <div className="mb-3">
            <div className="text-[11px] font-mono text-[#A69371] uppercase mb-1.5 flex items-center gap-1.5">
              <span>Timeline Helpers:</span>
              <span className="text-[10px] text-[#C6B697] lowercase">(click to insert structured date markers)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "IEP Annual Date", template: "\n• [Date]: Annual IEP meeting held. Mandated services included..." },
                { label: "Evaluation Request", template: "\n• [Date]: Parent submitted formal written request for evaluation..." },
                { label: "Service Cancellation", template: "\n• [Date]: Service delivery logs indicate therapy session was canceled without make-up..." },
                { label: "Notice of Refusal", template: "\n• [Date]: District refused request without issuing required Prior Written Notice (PWN)..." },
                { label: "Disciplinary Exclusion", template: "\n• [Date]: Student removed from educational placement without an MDR meeting..." },
              ].map((helper) => (
                <button
                  key={helper.label}
                  type="button"
                  onClick={() => {
                    setFacts((prev) => `${prev.trim()}${helper.template}`);
                    toast.success(`Inserted ${helper.label} template`);
                  }}
                  className="px-2 py-0.5 rounded bg-[#020A17] hover:bg-[#071C3A] border border-[#3A2C18] text-[#C6B697] hover:text-[#FFE394] text-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Calendar className="w-3 h-3 text-[#DFBE77]" />
                  <span>{helper.label}</span>
                </button>
              ))}
            </div>
          </div>

          <VoiceTextarea
            value={facts}
            onChange={setFacts}
            rows={6}
            placeholder="Chronologically state the factual events that demonstrate the district's failure (include dates within the 1-year window, IEP commitments, service logs, missed hours, and parent communications)..."
            className="w-full"
            textareaClassName="bg-[#092244] border border-[#3A5D8A] focus:border-[#C5A059] focus:ring-2 focus:ring-[#DFBE77]/30 focus:bg-[#0C2A54] text-white text-sm font-medium placeholder:text-[#8EA6C5] shadow-inner rounded-lg p-3 leading-relaxed transition-all"
          />

          <div className="flex items-center justify-between text-[11px] text-[#A69371] mt-2">
            <span>Clearly cite dates to substantiate the 1-year statutory filing requirement</span>
            <span className="font-mono">{facts.length} characters</span>
          </div>
        </div>

        {/* ── PRONG #3: Proposed Resolution & Clickable Resolutions Library ── */}
        <div className="rounded-xl border border-[#3A2C18] bg-[#05142B]/95 p-5 shadow-lg relative">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-start gap-2.5">
              <span className="w-7 h-7 rounded-full bg-[#DFBE77]/20 border border-[#DFBE77]/50 text-[#FFE394] font-serif font-bold text-sm flex items-center justify-center shrink-0">
                3
              </span>
              <div>
                <h3 className="font-serif text-base sm:text-lg font-bold text-[#FFF4D4] flex items-center gap-2">
                  <span>*Proposed Resolution to Alleged Violations</span>
                  <span className="text-[11px] font-sans font-normal px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Remedies & Corrective Orders
                  </span>
                </h3>
                <p className="text-xs text-[#C6B697] mt-0.5 leading-relaxed">
                  State the solution(s) or action(s) you feel will resolve the problem(s) to the extent known and available at this time. Use the extensive clickable common remedies library below to select as many resolutions as apply to this student's case.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleInsertSelectedResolutions}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs gap-1.5 cursor-pointer shadow-xs hover:brightness-110"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Insert Selected ({selectedResolutions.length})</span>
              </Button>
            </div>
          </div>

          {/* Current Working Proposed Resolution Textarea */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-[#E8DCC2] mb-1.5 font-medium">
              <span>Proposed Resolution Working Text (Prong #3 on Official State Form):</span>
              <span className="text-[11px] text-[#A69371] font-mono">{resolutionText.length} characters</span>
            </div>
            <VoiceTextarea
              value={resolutionText}
              onChange={setResolutionText}
              rows={5}
              placeholder="State the requested remedies (e.g., compensatory tutoring hours, independent educational evaluation funding, IEP team reconvene, staff training, or reimbursement)..."
              className="w-full"
              textareaClassName="bg-[#092244] border border-[#3A5D8A] focus:border-[#C5A059] focus:ring-2 focus:ring-[#DFBE77]/30 focus:bg-[#0C2A54] text-white text-sm font-medium placeholder:text-[#8EA6C5] shadow-inner rounded-lg p-3 leading-relaxed transition-all"
            />
          </div>

          {/* ── EXTENSIVE CLICKABLE RESOLUTIONS LIBRARY ───────────────────── */}
          <div className="rounded-xl border-2 border-[#3A2C18] bg-[#020C1B] p-5 shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-[#233A5E]/80">
              <div className="flex items-center gap-2.5">
                <Scale className="w-5 h-5 text-[#DFBE77]" />
                <span className="font-serif font-bold text-base text-[#FFF4D4]">
                  Extensive Common Resolutions Library
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#DFBE77]/20 border border-[#DFBE77]/50 text-[#FFE394] font-mono font-bold">
                  {selectedResolutions.length} Selected
                </span>
              </div>

              {/* Search filter input */}
              <div className="relative min-w-[220px] sm:min-w-[280px]">
                <Search className="w-4 h-4 text-[#C6B697] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search remedies (e.g. tutoring, IEE, OT, PWN)..."
                  className="w-full bg-[#05142B] border border-[#2B476E] rounded-lg pl-9 pr-8 py-1.5 text-xs text-[#FFF4D4] placeholder:text-[#8C7D64] focus:outline-none focus:border-[#DFBE77] shadow-inner"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C7D64] hover:text-[#FFF4D4] p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto py-3 custom-scrollbar">
              <button
                type="button"
                onClick={() => setActiveCategory("All")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-serif transition-all cursor-pointer flex items-center gap-1.5 shrink-0",
                  activeCategory === "All"
                    ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-md border border-[#FFF4D4]/40"
                    : "bg-[#061833] text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#0A2244] border border-[#233A5E]"
                )}
              >
                <span>All Remedies</span>
                <span
                  className={cn(
                    "text-[10px] font-mono px-1.5 py-0.2 rounded-full",
                    activeCategory === "All"
                      ? "bg-[#07162B]/30 text-[#07162B] font-bold"
                      : "bg-[#020A17] text-[#A69371]"
                  )}
                >
                  {EXTENSIVE_COMMON_RESOLUTIONS.length}
                </span>
              </button>
              {RESOLUTION_CATEGORIES.map((cat) => {
                const count = EXTENSIVE_COMMON_RESOLUTIONS.filter((r) => r.category === cat).length;
                const isCatActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-serif transition-all cursor-pointer flex items-center gap-1.5 shrink-0",
                      isCatActive
                        ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-md border border-[#FFF4D4]/40"
                        : "bg-[#061833] text-[#D8C7A5] hover:text-[#FFF4D4] hover:bg-[#0A2244] border border-[#233A5E]"
                    )}
                  >
                    <span>{cat}</span>
                    <span
                      className={cn(
                        "text-[10px] font-mono px-1.5 py-0.2 rounded-full",
                        isCatActive
                          ? "bg-[#07162B]/30 text-[#07162B] font-bold"
                          : "bg-[#020A17] text-[#A69371]"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Bulk Selection Controls */}
            <div className="flex items-center justify-between text-xs py-2 px-1 border-b border-[#233A5E]/60 mb-3 flex-wrap gap-2">
              <span className="text-xs text-[#D8C7A5]">
                Click remedy cards to select them for your prayer for relief:
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const popularIds = EXTENSIVE_COMMON_RESOLUTIONS.filter((r) => r.isPopular).map(
                      (r) => r.id
                    );
                    setSelectedResolutions((prev) => Array.from(new Set([...prev, ...popularIds])));
                    toast.success("Selected all high-frequency common advocacy remedies");
                  }}
                  className="text-xs font-medium text-[#FFE394] hover:text-[#FFF4D4] underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-[#DFBE77]" />
                  <span>Select Popular Remedies</span>
                </button>
                <span className="text-[#3A2C18]">|</span>
                <button
                  type="button"
                  onClick={() => {
                    const currentCategoryIds = filteredResolutions.map((r) => r.id);
                    setSelectedResolutions((prev) => Array.from(new Set([...prev, ...currentCategoryIds])));
                    toast.success(`Selected all ${currentCategoryIds.length} remedies in view`);
                  }}
                  className="text-xs font-medium text-[#DFBE77] hover:text-[#FFE394] underline cursor-pointer"
                >
                  Select All in View
                </button>
                <span className="text-[#3A2C18]">|</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedResolutions([]);
                    toast.info("Cleared resolution selections");
                  }}
                  className="text-xs font-medium text-rose-300 hover:text-rose-200 underline cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Scrollable Grid of Clickable Resolution Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1.5 custom-scrollbar">
              {filteredResolutions.map((item) => {
                const isSelected = selectedResolutions.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleResolution(item.id)}
                    className={cn(
                      "p-3.5 rounded-lg border text-left transition-all cursor-pointer select-none flex items-start gap-3 relative group",
                      isSelected
                        ? "bg-gradient-to-br from-[#0B2A54] to-[#061A36] border-2 border-[#DFBE77] shadow-[0_4px_16px_rgba(0,0,0,0.6),0_0_12px_rgba(223,190,119,0.25)] ring-1 ring-[#FFE394]/30"
                        : "bg-[#031124] border border-[#213A5E] hover:border-[#DFBE77]/70 hover:bg-[#071E3D] hover:shadow-md"
                    )}
                  >
                    {/* Custom Checkbox indicator */}
                    <div
                      className={cn(
                        "w-5 h-5 rounded-md border mt-0.5 flex items-center justify-center shrink-0 transition-all",
                        isSelected
                          ? "bg-gradient-to-b from-[#FFE394] via-[#DFBE77] to-[#B38F40] border-[#FFF4D4] text-[#05142B] shadow-sm"
                          : "border-[#4A6488] bg-[#020A17] group-hover:border-[#DFBE77]"
                      )}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={cn(
                            "font-serif text-[13px] font-bold leading-snug",
                            isSelected ? "text-[#FFF4D4]" : "text-[#EFE5D0]"
                          )}
                        >
                          {item.title}
                        </span>
                        {item.isPopular && (
                          <span className="text-[10px] font-serif font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-[#FFE394] border border-amber-400/40 shrink-0">
                            Common Remedy
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#C6B697] mt-1.5 leading-relaxed">
                        {item.details}
                      </p>

                      <div className="mt-2.5 pt-2 border-t border-[#1C3352]/60 flex items-center justify-between text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-[#0A1F3B] border border-[#24426A] text-[#DFBE77] font-mono text-[10px] uppercase tracking-wider">
                          {item.category}
                        </span>
                        {isSelected ? (
                          <span className="text-emerald-300 font-bold bg-emerald-950/70 border border-emerald-500/50 px-2 py-0.5 rounded text-[10px] flex items-center gap-1 shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Selected</span>
                          </span>
                        ) : (
                          <span className="text-[#8C7D64] text-[10px] group-hover:text-[#D8C7A5] transition-colors">
                            Click to add +
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom Resolution Quick-Add Row */}
            <div className="mt-4 pt-3.5 border-t border-[#233A5E]/80 flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 min-w-[240px]">
                <input
                  type="text"
                  value={customResolutionInput}
                  onChange={(e) => setCustomResolutionInput(e.target.value)}
                  placeholder="Type a custom resolution or specific remedy request..."
                  className="w-full bg-[#05142B] border border-[#2B476E] rounded-lg px-3.5 py-2 text-xs text-[#FFF4D4] placeholder:text-[#8C7D64] focus:outline-none focus:border-[#DFBE77] shadow-inner"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customResolutionInput.trim()) {
                      setResolutionText((prev) =>
                        prev.trim()
                          ? `${prev.trim()}\n• ${customResolutionInput.trim()}`
                          : `• ${customResolutionInput.trim()}`
                      );
                      toast.success("Added custom resolution to working text");
                      setCustomResolutionInput("");
                    }
                  }}
                />
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (!customResolutionInput.trim()) return;
                  setResolutionText((prev) =>
                    prev.trim()
                      ? `${prev.trim()}\n• ${customResolutionInput.trim()}`
                      : `• ${customResolutionInput.trim()}`
                  );
                  toast.success("Added custom resolution to working text");
                  setCustomResolutionInput("");
                }}
                className="bg-[#092244] border border-[#DFBE77]/70 text-[#FFE394] hover:bg-[#113A6E] hover:text-[#FFF4D4] hover:border-[#FFE394] text-xs h-9 px-4 cursor-pointer shrink-0 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 mr-1 text-[#DFBE77]" />
                <span>Add Custom Remedy</span>
              </Button>
            </div>
          </div>
        </div>

      </div>

      {/* ── GROUNDED ADMIRALTY NEXT STEP ACTION CONSOLE ────────────────── */}
      <div className="mt-12 mb-36 rounded-2xl border-2 border-[#C5A059] bg-[#031124] p-6 sm:p-8 shadow-2xl">
        {/* Top: Description & Status Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFE394] via-[#DFBE77] to-[#9E7D3B] text-[#05142B] flex items-center justify-center shadow-lg border border-[#FFF4D4] shrink-0 mt-0.5">
            <ShieldCheck className="w-7 h-7 stroke-[2.5]" />
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-[#DFBE77]/20 text-[#FFE394] border border-[#DFBE77]/50 tracking-wider whitespace-nowrap">
                STEP 1 COMPLETE · PROCEED TO STEP 2
              </span>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 whitespace-nowrap">
                <Check className="w-3 h-3 stroke-[3]" />
                <span>3 Prongs Ready</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0A1F3B] text-[#DFBE77] border border-[#24426A] whitespace-nowrap">
                {stateConfig.shortAgency} AcroForm + Restatement Sync
              </span>
            </div>
            <h3 className="font-serif font-bold text-lg sm:text-xl text-[#FFF4D4] tracking-tight">
              Next Step: Insert Form & Legal Restatement
            </h3>
            <p className="text-xs sm:text-[13px] text-[#D8C7A5] leading-relaxed max-w-3xl">
              Transfers your 3 statutory prongs directly into the official {stateConfig.shortAgency} State Complaint Form (AcroForm) and populates Section 02 (Clarity Control Legal Restatement) & Section 03 (Chronological Summary) in your packet. Choose an action below to proceed:
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#3A2C18] my-5" />

        {/* Bottom: Action Buttons Arranged Under the Text */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Primary Navigation Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            {onNavigateToStateForm && (
              <Button
                type="button"
                onClick={() => {
                  handleApplyToStateForm();
                  onNavigateToStateForm();
                }}
                className="bg-gradient-to-r from-[#FFE394] via-[#DFBE77] to-[#C5A059] hover:brightness-110 text-[#05142B] font-serif font-bold text-xs sm:text-sm h-11 px-6 rounded-lg border-2 border-[#FFF4D4] shadow-md transition-all cursor-pointer whitespace-nowrap flex items-center gap-2"
              >
                <span>Next Step: Insert Form & Restatement</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </Button>
            )}

            {onNavigateToRestatement && (
              <Button
                type="button"
                onClick={() => {
                  handleApplyToStateForm();
                  onNavigateToRestatement();
                }}
                className="bg-[#0B254A] hover:bg-[#12386E] text-[#FFE394] hover:text-[#FFF4D4] font-serif font-bold text-xs sm:text-sm h-11 px-5 rounded-lg border border-[#C5A059] shadow-sm transition-all cursor-pointer whitespace-nowrap flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-[#DFBE77]" />
                <span>Open Restatement (Section 02)</span>
              </Button>
            )}
          </div>

          {/* Secondary Utilities & In-Place Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              type="button"
              variant="outline"
              onClick={handleRunAiRefinement}
              disabled={refineMutation.isPending}
              className="border-[#DFBE77]/60 bg-[#061833] text-[#FFE394] hover:text-[#FFF4D4] hover:border-[#FFE394] font-serif text-xs h-11 px-4 gap-1.5 rounded-lg cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5 text-[#DFBE77]" />
              <span>Refine with AI</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleCopyComplaintSummary}
              className="border-[#3A2C18] bg-[#020A17] text-[#C6B697] hover:text-[#FFF4D4] hover:border-[#C5A059] font-serif text-xs h-11 px-3.5 gap-1.5 rounded-lg cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-[#DFBE77]" />
              <span>Copy Summary</span>
            </Button>

            <Button
              type="button"
              onClick={handleApplyToStateForm}
              className="bg-[#072044] hover:bg-[#0E356A] text-[#FFE394] hover:text-[#FFF4D4] font-serif font-bold text-xs h-11 px-4 rounded-lg border border-[#C5A059] shadow-sm transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 text-[#DFBE77]" />
              <span>Sync & Apply Only</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
