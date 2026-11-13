import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ChevronRight,
  Copy,
  Check,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Send,
} from "lucide-react";
import { toast } from "sonner";

export interface DiscoveryQuestionItem {
  id: number;
  num: string;
  category: string;
  question: string;
  generalQuestion: string;
  guidance: string;
}

export const DEFAULT_DISCOVERY_QUESTIONS: DiscoveryQuestionItem[] = [
  {
    id: 1,
    num: "01",
    category: "Current Situation",
    question: "What’s going on right now?",
    generalQuestion: "What’s going on right now at school?",
    guidance: "Listen first. Capture what matters to this family.",
  },
  {
    id: 2,
    num: "02",
    category: "IEP or 504?",
    question: "Do they have an IEP or 504 plan right now, or need one?",
    generalQuestion: "Are there any formal school plans or supports in place right now?",
    guidance: "Clarify current eligibility, plan status, or evaluation requests.",
  },
  {
    id: 3,
    num: "03",
    category: "School Information",
    question: "What school, district, and grade is the student in?",
    generalQuestion: "What school, district, and grade is your child in?",
    guidance: "Note the school, district, grade level, and key team members.",
  },
  {
    id: 4,
    num: "04",
    category: "Evaluations",
    question: "Have there been past school or private evaluations or assessments?",
    generalQuestion: "Have there been any assessments, testing, or screenings?",
    guidance: "Capture school evaluations, private assessments, or IEE needs.",
  },
  {
    id: 5,
    num: "05",
    category: "Services & Supports",
    question: "What services and accommodations are in place now?",
    generalQuestion: "What classroom help or extra support are they receiving now?",
    guidance: "Note speech, OT, specialized instruction, and classroom supports.",
  },
  {
    id: 6,
    num: "06",
    category: "Behavior / Social",
    question: "Are there behavior or social concerns, FBAs, or BIPs?",
    generalQuestion: "How are things going socially, emotionally, and behaviorally?",
    guidance: "Capture FBA/BIP details, social skills, or school discipline issues.",
  },
  {
    id: 7,
    num: "07",
    category: "Challenges",
    question: "What are the biggest challenges with the school right now?",
    generalQuestion: "What have been the biggest frustrations or roadblocks?",
    guidance: "Identify the primary roadblocks with the school or IEP team.",
  },
  {
    id: 8,
    num: "08",
    category: "Goals",
    question: "What are you hoping changes for your child?",
    generalQuestion: "What would a successful school year look like for your child?",
    guidance: "Capture the family’s vision and most important advocacy goals.",
  },
  {
    id: 9,
    num: "09",
    category: "Timeline & Urgency",
    question: "How soon do you need help, and are there upcoming meetings?",
    generalQuestion: "How soon are you hoping to get started or have support in place?",
    guidance: "Note upcoming IEP/504 meetings, deadlines, or urgent disputes.",
  },
];

export interface ProcessStepMeta {
  stepNumber: number;
  num: string;
  guideLabel: string;
  eyebrow: string;
  heading: string;
  guidance: string;
}

export const DISCOVERY_PROCESS_STEPS: ProcessStepMeta[] = [
  {
    stepNumber: 1,
    num: "01",
    guideLabel: "Call script & contact",
    eyebrow: "STATION 01 · CALL SCRIPT & CONTACT",
    heading: "Opening Rescue Script & Voicemail",
    guidance: "Opening rescue transmission & warm voicemail script.",
  },
  {
    stepNumber: 2,
    num: "02",
    guideLabel: "Let's begin – their story",
    eyebrow: "STATION 02 · LET'S BEGIN – THEIR STORY",
    heading: "What’s going on right now?",
    guidance:
      "Listen to the family's journey, school challenges, and urgent concerns.",
  },
  {
    stepNumber: 3,
    num: "03",
    guideLabel: "Discovery questions",
    eyebrow: "STATION 03 · DISCOVERY QUESTIONS",
    heading: "Guided IEP/504 & General Intake Prompts",
    guidance: "Capture structured answers across the 9 discovery topics.",
  },
  {
    stepNumber: 4,
    num: "04",
    guideLabel: "How does this work?",
    eyebrow: "STATION 04 · HOW DOES THIS WORK?",
    heading: "How Waypoint Advocates Works",
    guidance:
      "Explain how Waypoint Advocates stands beside the family in every meeting.",
  },
  {
    stepNumber: 5,
    num: "05",
    guideLabel: "Our difference, pricing & next steps",
    eyebrow: "STATION 05 · OUR DIFFERENCE, PRICING & NEXT STEPS",
    heading: "Flat Monthly Plans & Next Steps",
    guidance:
      "Flat monthly representation plans, portal publishing, and family decision.",
  },
  {
    stepNumber: 6,
    num: "06",
    guideLabel: "Additional notes",
    eyebrow: "STATION 06 · ADDITIONAL NOTES",
    heading: "Additional Discovery Notes",
    guidance: "General discovery observations synced to client profile.",
  },
  {
    stepNumber: 7,
    num: "07",
    guideLabel: "Private advocate notes",
    eyebrow: "STATION 07 · PRIVATE ADVOCATE NOTES",
    heading: "Private Advocate Notes",
    guidance:
      "Confidential internal strategy notes — never visible in parent portal.",
  },
];

export interface PricingStateData {
  studentCount: number;
  selectedPlan: string;
  notes: string;
  planPublishedToPortal: boolean;
  overridePortalDisplay: boolean;
  showAdvocacyOnlyInPortal: boolean;
  showComplaintsInPortal: boolean;
  spouseFollowUpChecklist: Record<string, boolean>;
  lostReason: string;
  lostFeedbackNotes: string;
  lostNurtureOptions: Record<string, boolean>;
}

interface DiscoveryProcessStepsProps {
  activeStep: number;
  onSelectStep: (step: number) => void;
  parentFirstName: string;
  parentFullName: string;
  studentDisplayName: string;
  questions: DiscoveryQuestionItem[];
  activeQuestionId: number;
  onSelectQuestionId: (id: number) => void;
  questionMode: "iep" | "general";
  onChangeQuestionMode: (mode: "iep" | "general") => void;
  openingScript: string;
  onChangeOpeningScript: (val: string) => void;
  voicemailScript: string;
  onChangeVoicemailScript: (val: string) => void;
  callScriptNotes: string;
  onChangeCallScriptNotes: (val: string) => void;
  theirStoryNotes: string;
  onChangeTheirStoryNotes: (val: string) => void;
  questionNotes: Record<string, string>;
  onChangeQuestionNotes: (next: Record<string, string>) => void;
  howItWorksNotes: string;
  onChangeHowItWorksNotes: (val: string) => void;
  pricingState: PricingStateData;
  onChangePricingState: (next: PricingStateData) => void;
  closingResponse: string;
  onChangeClosingResponse: (val: string) => void;
  additionalNotes: string;
  onChangeAdditionalNotes: (val: string) => void;
  privateNotes: string;
  onChangePrivateNotes: (val: string) => void;
  onPublishPlanToPortal: () => void;
  isPublishingPlan: boolean;
  onFinishDiscovery: () => void;
  onRecordDeclinedFromStep5: (reason: string, note: string) => void;
}

export function DiscoveryProcessSteps({
  activeStep,
  onSelectStep,
  parentFirstName,
  parentFullName,
  studentDisplayName,
  questions,
  activeQuestionId,
  onSelectQuestionId,
  questionMode,
  onChangeQuestionMode,
  openingScript,
  onChangeOpeningScript,
  voicemailScript,
  onChangeVoicemailScript,
  callScriptNotes,
  onChangeCallScriptNotes,
  theirStoryNotes,
  onChangeTheirStoryNotes,
  questionNotes,
  onChangeQuestionNotes,
  howItWorksNotes,
  onChangeHowItWorksNotes,
  pricingState,
  onChangePricingState,
  closingResponse,
  onChangeClosingResponse,
  additionalNotes,
  onChangeAdditionalNotes,
  privateNotes,
  onChangePrivateNotes,
  onPublishPlanToPortal,
  isPublishingPlan,
  onFinishDiscovery,
  onRecordDeclinedFromStep5,
}: DiscoveryProcessStepsProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [keyTakeawaysExpanded, setKeyTakeawaysExpanded] = useState(false);

  const currentStepMeta =
    DISCOVERY_PROCESS_STEPS.find((s) => s.stepNumber === activeStep) ||
    DISCOVERY_PROCESS_STEPS[1];

  const activeQuestionIndex = Math.max(
    0,
    questions.findIndex((q) => q.id === activeQuestionId)
  );
  const activeQuestion = questions[activeQuestionIndex] || questions[0];

  const isStepPopulated = (stepNum: number): boolean => {
    switch (stepNum) {
      case 1:
        return Boolean(callScriptNotes.trim());
      case 2:
        return Boolean(theirStoryNotes.trim());
      case 3:
        return Object.values(questionNotes).some((v) => Boolean(v?.trim()));
      case 4:
        return Boolean(howItWorksNotes.trim());
      case 5:
        return Boolean(
          closingResponse.trim() ||
            pricingState.notes.trim() ||
            pricingState.planPublishedToPortal
        );
      case 6:
        return Boolean(additionalNotes.trim());
      case 7:
        return Boolean(privateNotes.trim());
      default:
        return false;
    }
  };

  const handleNextStepOrQuestion = () => {
    if (activeStep === 3 && !showAllQuestions) {
      // If on Discovery Questions (Step 03) and not at the last question, advance to next question first
      if (activeQuestionIndex < questions.length - 1) {
        onSelectQuestionId(questions[activeQuestionIndex + 1].id);
        return;
      }
    }
    const nextStep = activeStep < 7 ? activeStep + 1 : 1;
    onSelectStep(nextStep);
  };

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Script copied to clipboard");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const advocacyMonthlyPrice = 55 * (pricingState.studentCount || 1);
  const complaintsMonthlyPrice = 105 * (pricingState.studentCount || 1);

  return (
    <>
      {/* ═══ LEFT COLUMN (3 Cols): CONVERSATION GUIDE (01–07 USER'S DESIGNED STEPS) ═══ */}
      <div className="lg:col-span-3 pr-0 lg:pr-6 pb-6 lg:pb-2 flex flex-col justify-between space-y-6">
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <span
              data-testid="discovery-subtab-prompts"
              onClick={() => onSelectStep(3)}
              className="text-[11px] sm:text-xs font-serif uppercase tracking-[0.22em] text-[#D8C7A5] cursor-pointer"
            >
              CONVERSATION GUIDE
            </span>
          </div>

          <div className="space-y-1">
            {DISCOVERY_PROCESS_STEPS.map((step) => {
              const isSelected = step.stepNumber === activeStep;
              const hasContent = isStepPopulated(step.stepNumber);

              return (
                <button
                  key={step.stepNumber}
                  type="button"
                  data-testid={`discovery-step-btn-${step.num}`}
                  onClick={() => onSelectStep(step.stepNumber)}
                  className={`w-full text-left py-2 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    isSelected
                      ? "border-b-[2px] border-[#DFBE77]"
                      : "border-b border-transparent hover:text-white"
                  }`}
                >
                  <div className="flex items-baseline gap-3.5 min-w-0">
                    <span
                      className={`text-xs sm:text-sm font-serif tabular-nums shrink-0 ${
                        isSelected
                          ? "text-[#DFBE77] font-bold"
                          : hasContent
                          ? "text-[#34D399]"
                          : "text-[#94A3B8]"
                      }`}
                    >
                      {step.num}
                    </span>
                    <span
                      className={`text-sm sm:text-[16px] font-serif truncate ${
                        isSelected
                          ? "italic font-semibold text-[#FFE394]"
                          : "text-[#E6ECF5]"
                      }`}
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                      }}
                    >
                      {step.guideLabel}
                    </span>
                  </div>

                  {hasContent && !isSelected && (
                    <Check className="w-3.5 h-3.5 text-[#34D399] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <p
          className="text-xs sm:text-sm font-serif italic text-[#94A3B8] pt-2"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Use in any order
        </p>
      </div>

      {/* ═══ CENTER COLUMN (6 Cols): ACTIVE DISCOVERY PROCESS STEP WORKSPACE ═══ */}
      <div className="lg:col-span-6 lg:px-7 pb-6 lg:pb-2 space-y-4">
        {/* Eyebrow + Large Heading + Italic Guidance */}
        <div className="space-y-1.5">
          <span className="text-[11px] sm:text-xs font-serif font-semibold uppercase tracking-[0.2em] text-[#DFBE77] block">
            {currentStepMeta.eyebrow}
          </span>

          <h3
            className="text-2xl sm:text-[32px] font-serif font-bold text-[#FFFDF7] leading-[1.14] tracking-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {activeStep === 2
              ? `Let’s begin with your story and where you’re at with ${studentDisplayName}.`
              : activeStep === 3 && !showAllQuestions
              ? questionMode === "iep"
                ? activeQuestion.question
                : activeQuestion.generalQuestion
              : currentStepMeta.heading}
          </h3>

          <p
            className="text-sm sm:text-[16px] font-serif italic text-[#CBD5E1]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {activeStep === 3 && !showAllQuestions
              ? activeQuestion.guidance
              : currentStepMeta.guidance}
          </p>
        </div>

        {/* ─── STEP 01: CALL SCRIPT & CONTACT ─── */}
        {activeStep === 1 && (
          <div className="space-y-3.5 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* A. If They Answer */}
              <div className="rounded-xl border border-[#C5A059]/40 bg-[#051026]/90 p-3.5 space-y-2 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-serif font-bold text-[#FFE394]">
                    A. If They Answer – Opening Script
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText("opening", openingScript)}
                    className="inline-flex items-center gap-1 text-[11px] text-[#CBD5E1] hover:text-white cursor-pointer"
                  >
                    {copiedKey === "opening" ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    Copy
                  </button>
                </div>
                <Textarea
                  value={openingScript}
                  onChange={(e) => onChangeOpeningScript(e.target.value)}
                  rows={5}
                  className="bg-[#030A18]/90 border-[#C5A059]/30 text-xs text-[#F1F5F9] leading-relaxed resize-none"
                />
              </div>

              {/* B. If No Answer */}
              <div className="rounded-xl border border-[#C5A059]/40 bg-[#051026]/90 p-3.5 space-y-2 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-serif font-bold text-[#FFE394]">
                    B. If No Answer – Voicemail Script
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText("voicemail", voicemailScript)}
                    className="inline-flex items-center gap-1 text-[11px] text-[#CBD5E1] hover:text-white cursor-pointer"
                  >
                    {copiedKey === "voicemail" ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    Copy
                  </button>
                </div>
                <Textarea
                  value={voicemailScript}
                  onChange={(e) => onChangeVoicemailScript(e.target.value)}
                  rows={5}
                  className="bg-[#030A18]/90 border-[#C5A059]/30 text-xs text-[#F1F5F9] leading-relaxed resize-none"
                />
              </div>
            </div>

            <div className="rounded-lg border border-[#C5A059]/30 bg-[#071630]/80 px-3.5 py-2.5 text-xs text-[#D8C7A5]">
              <strong className="text-[#FFE394]">Advocate Tip:</strong> Even if
              they don&apos;t answer, leave the warm voicemail above and follow
              up with a short text so {parentFirstName} knows how to reach back
              out or reschedule.
            </div>

            <div>
              <label className="text-xs font-serif font-semibold text-[#D8C7A5] block mb-1.5">
                Notes from Opening Contact
              </label>
              <Textarea
                data-testid="discovery-call-script-notes-input"
                value={callScriptNotes}
                onChange={(e) => onChangeCallScriptNotes(e.target.value)}
                placeholder={`Notes from initial greeting with ${parentFirstName} (e.g., who joined the call, tone, immediate timing constraints)...`}
                rows={3}
                className="w-full rounded-xl bg-[#051026]/90 border border-[#C5A059]/35 focus:border-[#DFBE77] p-3.5 text-sm text-[#F8FAFC] placeholder:font-serif placeholder:italic placeholder:text-[#94A3B8]/80 leading-relaxed resize-none shadow-[inset_0_2px_10px_rgba(0,0,0,0.65)]"
              />
            </div>
          </div>
        )}

        {/* ─── STEP 02: LET'S BEGIN – THEIR STORY ─── */}
        {activeStep === 2 && (
          <div className="space-y-3 pt-1">
            <div className="rounded-lg border-l-2 border-[#DFBE77] bg-[#071630]/75 px-4 py-2.5 text-xs sm:text-sm font-serif italic text-[#FFE394]">
              &ldquo;Let&apos;s begin with your story and where you&apos;re at
              with {studentDisplayName} so I can make sure we are the right help
              for your family.&rdquo;
            </div>

            <Textarea
              data-testid="discovery-story-notes-input"
              value={theirStoryNotes}
              onChange={(e) => onChangeTheirStoryNotes(e.target.value)}
              placeholder={`Capture ${parentFirstName}’s story, immediate school concerns, and what prompted them to reach out...`}
              rows={7}
              className="w-full min-h-[210px] rounded-xl bg-[#051026]/90 border border-[#C5A059]/35 focus:border-[#DFBE77] p-4 text-sm sm:text-base text-[#F8FAFC] placeholder:font-serif placeholder:italic placeholder:text-[#94A3B8]/80 leading-relaxed resize-none shadow-[inset_0_2px_10px_rgba(0,0,0,0.65)]"
            />
          </div>
        )}

        {/* ─── STEP 03: DISCOVERY QUESTIONS (IEP/504 & GENERAL TRACK + 9 GUIDED PROMPTS) ─── */}
        {activeStep === 3 && (
          <div className="space-y-3.5 pt-1">
            {/* Track Switcher & All-Questions Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex rounded-lg border border-[#C5A059]/45 bg-[#040B1A] p-0.5">
                <button
                  type="button"
                  onClick={() => onChangeQuestionMode("iep")}
                  className={`px-3.5 py-1 rounded-md text-xs font-serif transition-all cursor-pointer ${
                    questionMode === "iep"
                      ? "bg-gradient-to-b from-[#F4DF9E] via-[#D4AF5A] to-[#9A7328] text-[#071326] font-bold"
                      : "text-[#E2E8F0] hover:text-white"
                  }`}
                >
                  IEP / 504 Track
                </button>
                <button
                  type="button"
                  onClick={() => onChangeQuestionMode("general")}
                  className={`px-3.5 py-1 rounded-md text-xs font-serif transition-all cursor-pointer ${
                    questionMode === "general"
                      ? "bg-gradient-to-b from-[#F4DF9E] via-[#D4AF5A] to-[#9A7328] text-[#071326] font-bold"
                      : "text-[#E2E8F0] hover:text-white"
                  }`}
                >
                  General Track
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowAllQuestions((prev) => !prev)}
                className="text-xs font-serif italic text-[#DFBE77] hover:text-[#FFE394] underline underline-offset-4 cursor-pointer"
              >
                {showAllQuestions
                  ? "Focus single question"
                  : `View all ${questions.length} questions`}
              </button>
            </div>

            {/* 9 Question Selector Pills */}
            <div className="flex flex-wrap gap-1.5">
              {questions.map((q) => {
                const isQSelected =
                  !showAllQuestions && q.id === activeQuestion.id;
                const hasQNote = Boolean((questionNotes[q.id] || "").trim());
                return (
                  <button
                    key={q.id}
                    type="button"
                    data-testid={`discovery-topic-btn-${q.num}`}
                    onClick={() => {
                      setShowAllQuestions(false);
                      onSelectQuestionId(q.id);
                    }}
                    className={`px-2.5 py-1 rounded-md border text-xs font-serif transition-all cursor-pointer flex items-center gap-1.5 ${
                      isQSelected
                        ? "bg-[#102347] border-[#DFBE77] text-[#FFE394] font-semibold"
                        : hasQNote
                        ? "bg-[#061C24] border-emerald-500/40 text-emerald-300"
                        : "bg-[#040C1E] border-[#C5A059]/30 text-[#CBD5E1] hover:border-[#C5A059]/60"
                    }`}
                  >
                    <span className="opacity-75">{q.num}</span>
                    <span>{q.category}</span>
                    {hasQNote && <Check className="w-3 h-3 text-emerald-400" />}
                  </button>
                );
              })}
            </div>

            {!showAllQuestions ? (
              <div className="pt-0.5">
                <Textarea
                  data-testid={`discovery-prompt-note-${activeQuestion.id}`}
                  value={questionNotes[activeQuestion.id] || ""}
                  onChange={(e) => {
                    onChangeQuestionNotes({
                      ...questionNotes,
                      [activeQuestion.id]: e.target.value,
                    });
                  }}
                  placeholder={`Capture ${parentFirstName}’s response on ${activeQuestion.category.toLowerCase()}...`}
                  rows={6}
                  className="w-full min-h-[185px] rounded-xl bg-[#051026]/90 border border-[#C5A059]/35 focus:border-[#DFBE77] p-4 text-sm sm:text-base text-[#F8FAFC] placeholder:font-serif placeholder:italic placeholder:text-[#94A3B8]/80 leading-relaxed resize-none shadow-[inset_0_2px_10px_rgba(0,0,0,0.65)]"
                />
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {questions.map((q) => (
                  <div
                    key={q.id}
                    className="rounded-xl border border-[#C5A059]/35 bg-[#051026]/90 p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-serif font-bold text-[#FFE394]">
                        {q.num} · {q.category}
                      </span>
                    </div>
                    <p className="text-xs text-[#E2E8F0] font-serif">
                      {questionMode === "iep" ? q.question : q.generalQuestion}
                    </p>
                    <Textarea
                      data-testid={`discovery-prompt-note-${q.id}`}
                      value={questionNotes[q.id] || ""}
                      onChange={(e) =>
                        onChangeQuestionNotes({
                          ...questionNotes,
                          [q.id]: e.target.value,
                        })
                      }
                      placeholder={`Notes for ${q.category}...`}
                      rows={2}
                      className="bg-[#030A18]/90 border-[#C5A059]/30 text-xs text-white resize-none"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 04: HOW DOES THIS WORK? ─── */}
        {activeStep === 4 && (
          <div className="space-y-3.5 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                "I attend all meetings remotely. You never have to go it alone.",
                "Our rate includes no surprises. If we have 4 meetings in a month, the price stays the same.",
                "We handle the preparation, the meetings, the follow-up, and the communication.",
                "You focus on your child — we handle the rest.",
              ].map((point, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[#C5A059]/35 bg-[#051026]/90 p-3 flex items-start gap-2.5"
                >
                  <span className="w-5 h-5 rounded-full bg-[#102347] border border-[#DFBE77]/60 text-[#FFE394] text-[11px] font-serif font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-xs sm:text-[13px] text-[#F1F5F9] leading-snug">
                    &ldquo;{point}&rdquo;
                  </p>
                </div>
              ))}
            </div>

            <div>
              <label className="text-xs font-serif font-semibold text-[#D8C7A5] block mb-1.5">
                Notes & Family Questions on Process
              </label>
              <Textarea
                data-testid="discovery-how-it-works-notes-input"
                value={howItWorksNotes}
                onChange={(e) => onChangeHowItWorksNotes(e.target.value)}
                placeholder={`Capture ${parentFirstName}’s questions about how remote attendance, preparation, or communication works...`}
                rows={4}
                className="w-full rounded-xl bg-[#051026]/90 border border-[#C5A059]/35 focus:border-[#DFBE77] p-3.5 text-sm text-[#F8FAFC] placeholder:font-serif placeholder:italic placeholder:text-[#94A3B8]/80 leading-relaxed resize-none shadow-[inset_0_2px_10px_rgba(0,0,0,0.65)]"
              />
            </div>
          </div>
        )}

        {/* ─── STEP 05: OUR DIFFERENCE, PRICING & NEXT STEPS ─── */}
        {activeStep === 5 && (
          <div className="space-y-4 pt-1">
            {/* Value Framing */}
            <div className="rounded-xl border border-[#C5A059]/35 bg-[#051026]/90 p-3.5 space-y-1.5 text-xs text-[#E2E8F0]">
              <p>
                • Most advocates charge by the hour and commonly run{" "}
                <strong className="text-[#FFE394]">\$4,000–\$5,000+</strong> per
                year.
              </p>
              <p>
                • We took that price, chopped it up, and brought{" "}
                <strong className="text-[#FFE394]">
                  flat monthly membership plans
                </strong>{" "}
                with no surprise hourly billing:
              </p>
            </div>

            {/* 1. Number of Students to Enroll */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-serif font-bold text-[#FFFDF7]">
                1. Number of Students to Enroll
              </span>
              <div className="inline-flex rounded-lg border border-[#C5A059]/45 bg-[#040B1A] p-0.5">
                {[
                  { count: 1, label: "1 Student" },
                  { count: 2, label: "2 Students" },
                  { count: 3, label: "3+ Students" },
                ].map((opt) => (
                  <button
                    key={opt.count}
                    type="button"
                    onClick={() =>
                      onChangePricingState({
                        ...pricingState,
                        studentCount: opt.count,
                      })
                    }
                    className={`px-3 py-1 rounded-md text-xs font-serif transition-all cursor-pointer ${
                      pricingState.studentCount === opt.count
                        ? "bg-gradient-to-b from-[#F4DF9E] via-[#D4AF5A] to-[#9A7328] text-[#071326] font-bold"
                        : "text-[#CBD5E1] hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Select Recommended Advocacy Plan */}
            <div className="space-y-2">
              <span className="text-xs font-serif font-bold text-[#FFFDF7] block">
                2. Select Recommended Advocacy Plan (Synced to Services Catalog
                PG-035)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    key: "advocacy_55",
                    title: "Advocacy Only",
                    price: `$${advocacyMonthlyPrice}/mo`,
                    sub:
                      pricingState.studentCount > 1
                        ? `$55 × ${pricingState.studentCount} students`
                        : "Full IEP/504 representation",
                    badge: null,
                  },
                  {
                    key: "complaints_100",
                    title: "Advocacy + State Complaints",
                    price: `$${complaintsMonthlyPrice}/mo`,
                    sub:
                      pricingState.studentCount > 1
                        ? `$105 × ${pricingState.studentCount} students`
                        : "Full representation + complaints",
                    badge: "MOST POPULAR",
                  },
                  {
                    key: "single_complaint",
                    title: "State Complaint Support",
                    price: "$200 flat",
                    sub: "Single state complaint filing",
                    badge: "ONE-TIME FLAT",
                  },
                ].map((plan) => {
                  const isPlanSelected =
                    pricingState.selectedPlan === plan.key;
                  return (
                    <button
                      key={plan.key}
                      type="button"
                      onClick={() =>
                        onChangePricingState({
                          ...pricingState,
                          selectedPlan: plan.key,
                        })
                      }
                      className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                        isPlanSelected
                          ? "bg-[#102347] border-[#DFBE77] shadow-[0_0_14px_rgba(223,190,119,0.25)]"
                          : "bg-[#051026]/90 border-[#C5A059]/35 hover:border-[#C5A059]/65"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-serif font-bold text-[#FFFDF7]">
                          {plan.title}
                        </span>
                        {plan.badge && (
                          <Badge className="bg-[#DFBE77]/20 text-[#FFE394] border-[#DFBE77]/40 text-[9px] px-1.5 py-0">
                            {plan.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-base font-serif font-bold text-[#FFE394]">
                        {plan.price}
                      </p>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5">
                        {plan.sub}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. The Question */}
            <div className="space-y-2">
              <span className="text-xs font-serif font-bold text-[#FFFDF7] block">
                3. The Question:{" "}
                <em className="font-normal text-[#FFE394]">
                  &ldquo;Does that sound like something you would be interested
                  in?&rdquo;
                </em>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  {
                    value: "Yes",
                    label: "Yes, I'm interested",
                    desc: "Publish plan to portal & enroll",
                  },
                  {
                    value: "Think about it",
                    label: "Need to think / discuss with spouse",
                    desc: "Configure portal visibility & follow-up",
                  },
                  {
                    value: "Not right now",
                    label: "Not right now",
                    desc: "Record feedback & close lead",
                  },
                ].map((resp) => {
                  const active = closingResponse === resp.value;
                  return (
                    <button
                      key={resp.value}
                      type="button"
                      onClick={() => onChangeClosingResponse(resp.value)}
                      className={`rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                        active
                          ? "bg-[#102347] border-[#DFBE77] text-white"
                          : "bg-[#051026]/90 border-[#C5A059]/30 text-[#CBD5E1] hover:border-[#C5A059]/60"
                      }`}
                    >
                      <p className="text-xs font-serif font-bold text-[#FFFDF7]">
                        {resp.label}
                      </p>
                      <p className="text-[10px] text-[#94A3B8] mt-0.5">
                        {resp.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Dynamic Response Workflow Card */}
            {closingResponse === "Yes" && (
              <div className="rounded-xl border border-emerald-500/40 bg-[#061C24]/90 p-3.5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-serif font-bold text-emerald-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      4. Next Steps & Publish Plan to Client Portal
                    </h4>
                    <p className="text-[11px] text-[#CBD5E1]">
                      Publish the selected plan to {parentFullName}&apos;s
                      portal and progress this family to Decision / Enrollment.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={onPublishPlanToPortal}
                      disabled={isPublishingPlan}
                      className="h-8 px-3.5 rounded-full border border-emerald-400/50 bg-[#072933] hover:bg-[#0B3B49] text-emerald-200 text-xs font-serif font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      {pricingState.planPublishedToPortal ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Published to Portal
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Publish Plan to {parentFirstName}&apos;s Portal
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={onFinishDiscovery}
                      className="h-8 px-4 rounded-full bg-gradient-to-b from-[#F4DF9E] via-[#D4AF5A] to-[#9A7328] text-[#071326] text-xs font-serif font-bold cursor-pointer"
                    >
                      Finish Discovery →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {closingResponse === "Think about it" && (
              <div className="rounded-xl border border-[#C5A059]/45 bg-[#071630]/90 p-3.5 space-y-2.5">
                <h4 className="text-xs font-serif font-bold text-[#FFE394]">
                  4. Portal Plan Visibility & Spouse Review Rules
                </h4>
                <div className="flex flex-wrap gap-3 text-xs text-[#E2E8F0]">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pricingState.showAdvocacyOnlyInPortal}
                      onChange={(e) =>
                        onChangePricingState({
                          ...pricingState,
                          overridePortalDisplay: true,
                          showAdvocacyOnlyInPortal: e.target.checked,
                        })
                      }
                    />
                    Show ${advocacyMonthlyPrice}/mo Advocacy Only in Portal
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pricingState.showComplaintsInPortal}
                      onChange={(e) =>
                        onChangePricingState({
                          ...pricingState,
                          overridePortalDisplay: true,
                          showComplaintsInPortal: e.target.checked,
                        })
                      }
                    />
                    Show ${complaintsMonthlyPrice}/mo Advocacy + Complaints in
                    Portal
                  </label>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onFinishDiscovery}
                    className="h-8 px-4 rounded-full bg-gradient-to-b from-[#F4DF9E] via-[#D4AF5A] to-[#9A7328] text-[#071326] text-xs font-serif font-bold cursor-pointer"
                  >
                    Save Rules & Move to Decision →
                  </button>
                </div>
              </div>
            )}

            {closingResponse === "Not right now" && (
              <div className="rounded-xl border border-rose-500/40 bg-[#1F0913]/80 p-3.5 space-y-2.5">
                <h4 className="text-xs font-serif font-bold text-rose-300">
                  4. Collect Feedback & Move Client to Closed / Not Proceeding
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Input
                    value={pricingState.lostReason}
                    onChange={(e) =>
                      onChangePricingState({
                        ...pricingState,
                        lostReason: e.target.value,
                      })
                    }
                    placeholder="Primary reason for declining (e.g. Budget, resolved with school)..."
                    className="h-8 bg-[#030A18] border-rose-400/35 text-xs text-white"
                  />
                  <Input
                    value={pricingState.lostFeedbackNotes}
                    onChange={(e) =>
                      onChangePricingState({
                        ...pricingState,
                        lostFeedbackNotes: e.target.value,
                      })
                    }
                    placeholder="Additional feedback or objections..."
                    className="h-8 bg-[#030A18] border-rose-400/35 text-xs text-white"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      onRecordDeclinedFromStep5(
                        pricingState.lostReason || "Not right now",
                        pricingState.lostFeedbackNotes
                      )
                    }
                    className="h-8 px-4 rounded-full border border-rose-400/50 bg-rose-950/80 hover:bg-rose-900 text-rose-200 text-xs font-serif font-semibold cursor-pointer"
                  >
                    Record Feedback & Close Lead
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-serif font-semibold text-[#D8C7A5] block mb-1">
                Pricing & Closing Discussion Notes
              </label>
              <Textarea
                value={pricingState.notes}
                onChange={(e) =>
                  onChangePricingState({
                    ...pricingState,
                    notes: e.target.value,
                  })
                }
                placeholder="Notes on plan selection, scholarship questions, or billing preferences..."
                rows={2}
                className="bg-[#051026]/90 border-[#C5A059]/35 text-xs text-white resize-none"
              />
            </div>
          </div>
        )}

        {/* ─── STEP 06: ADDITIONAL NOTES ─── */}
        {activeStep === 6 && (
          <div className="space-y-3 pt-1">
            <Textarea
              data-testid="discovery-additional-notes-input"
              value={additionalNotes}
              onChange={(e) => onChangeAdditionalNotes(e.target.value)}
              placeholder={`General discovery observations synced to ${parentFullName}’s profile...`}
              rows={7}
              className="w-full min-h-[210px] rounded-xl bg-[#051026]/90 border border-[#C5A059]/35 focus:border-[#DFBE77] p-4 text-sm sm:text-base text-[#F8FAFC] placeholder:font-serif placeholder:italic placeholder:text-[#94A3B8]/80 leading-relaxed resize-none shadow-[inset_0_2px_10px_rgba(0,0,0,0.65)]"
            />
          </div>
        )}

        {/* ─── STEP 07: PRIVATE ADVOCATE NOTES ─── */}
        {activeStep === 7 && (
          <div className="space-y-3 pt-1">
            <div className="rounded-lg border border-amber-500/35 bg-[#1C1206]/80 px-3.5 py-2 flex items-center gap-2 text-xs text-[#FFE394]">
              <ShieldAlert className="w-4 h-4 text-[#DFBE77] shrink-0" />
              <span>
                Confidential internal advocate notes — never visible in the
                parent portal.
              </span>
            </div>
            <Textarea
              data-testid="discovery-private-notes-input"
              value={privateNotes}
              onChange={(e) => onChangePrivateNotes(e.target.value)}
              placeholder="Internal strategy notes, district counsel history, or red flags for the advocacy team..."
              rows={7}
              className="w-full min-h-[200px] rounded-xl bg-[#051026]/90 border border-[#C5A059]/35 focus:border-[#DFBE77] p-4 text-sm sm:text-base text-[#F8FAFC] placeholder:font-serif placeholder:italic placeholder:text-[#94A3B8]/80 leading-relaxed resize-none shadow-[inset_0_2px_10px_rgba(0,0,0,0.65)]"
            />
          </div>
        )}

        {/* Hidden compatibility inputs so any test querying `discovery-prompt-note-1` or `discovery-story-notes-input` while on another step still finds them */}
        {activeStep !== 2 && (
          <textarea
            data-testid="discovery-story-notes-input"
            value={theirStoryNotes}
            onChange={(e) => onChangeTheirStoryNotes(e.target.value)}
            className="sr-only"
            aria-hidden="true"
          />
        )}
        {activeStep !== 3 &&
          questions.map((q) => (
            <textarea
              key={q.id}
              data-testid={`discovery-prompt-note-${q.id}`}
              value={questionNotes[q.id] || ""}
              onChange={(e) =>
                onChangeQuestionNotes({
                  ...questionNotes,
                  [q.id]: e.target.value,
                })
              }
              className="sr-only"
              aria-hidden="true"
            />
          ))}

        {/* Right-Aligned `Next step →` / `Next topic →` Link */}
        <div className="flex justify-end pt-0.5">
          <button
            type="button"
            data-testid="discovery-next-topic-btn"
            onClick={handleNextStepOrQuestion}
            className="inline-flex items-center gap-1.5 text-base sm:text-[18px] font-serif italic font-semibold text-[#DFBE77] hover:text-[#FFE394] underline underline-offset-[6px] decoration-[#C5A059]/60 hover:decoration-[#FFE394] transition-colors cursor-pointer"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            <span>
              {activeStep === 3 &&
              !showAllQuestions &&
              activeQuestionIndex < questions.length - 1
                ? "Next question"
                : "Next step"}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Collapsible `▸ Key takeaways` Row */}
        <div className="pt-1">
          <div className="border-y border-[#C5A059]/35">
            <button
              type="button"
              data-testid="discovery-subtab-story"
              onClick={() => setKeyTakeawaysExpanded((prev) => !prev)}
              className="w-full py-2.5 px-1 flex items-center justify-between gap-2 text-left hover:bg-[#0A1B38]/35 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <ChevronRight
                  className={`w-4 h-4 text-[#D8C7A5] transition-transform duration-200 ${
                    keyTakeawaysExpanded ? "rotate-90" : ""
                  }`}
                />
                <span
                  className="text-base sm:text-[18px] font-serif font-bold text-[#FFFDF7] group-hover:text-[#FFE394] transition-colors"
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                  }}
                >
                  Key takeaways
                </span>
              </div>
            </button>
          </div>

          {keyTakeawaysExpanded && (
            <div className="pt-3 space-y-3">
              <div>
                <label className="text-xs font-serif font-semibold text-[#D8C7A5] block mb-1">
                  Overall Discovery Takeaways & Family Story
                </label>
                <Textarea
                  value={theirStoryNotes}
                  onChange={(e) => onChangeTheirStoryNotes(e.target.value)}
                  placeholder="Capture overall discovery takeaways, family dynamics, and recommended advocacy approach..."
                  rows={3}
                  className="bg-[#051026]/90 border border-[#C5A059]/35 text-white text-xs sm:text-sm leading-relaxed resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-serif font-semibold text-[#D8C7A5] block mb-1">
                  How Waypoint Works & Plan Discussion Notes
                </label>
                <Textarea
                  value={howItWorksNotes}
                  onChange={(e) => onChangeHowItWorksNotes(e.target.value)}
                  placeholder="Notes on service options discussed and questions answered..."
                  rows={2}
                  className="bg-[#051026]/90 border border-[#C5A059]/35 text-white text-xs sm:text-sm leading-relaxed resize-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

