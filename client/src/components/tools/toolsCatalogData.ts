import React from "react";
import {
  Users,
  FileText,
  Search,
  Layers,
  Sparkles,
  Mic,
  Video,
  Compass,
  FolderKanban,
  Wand2,
  PenTool,
  ShieldCheck,
  Target,
  Puzzle,
  LineChart,
} from "lucide-react";

export interface InstrumentDefinition {
  id: string;
  sku: string;
  drawerTitle: string;
  drawerSubtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  categoryOverline: string;
  stageTitle: string;
  stageSubtitle: string;
  includedLabel: string;
  previewCardTitle: string;
  previewLines: Array<{
    speaker: string;
    text: string;
  }>;
  placardHeader: string;
  placardQuote: string;
  ctaLabel: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  capabilities: [string, string, string];
  howItWorksSteps: Array<{
    title: string;
    detail: string;
  }>;
  taskCategory: "meeting" | "document" | "concern";
  onOpen: () => void;
}

export function buildAllInstruments({
  contactId,
  setLocation,
  onOpenIepComparisonModal,
  onOpenRecorderModal,
}: {
  contactId?: number;
  setLocation: (path: string) => void;
  onOpenIepComparisonModal: () => void;
  onOpenRecorderModal: () => void;
}): InstrumentDefinition[] {
  return [
    // 1. First Mate
    {
      id: "first-mate",
      sku: "PG-037 · LIVE AI COPILOT",
      drawerTitle: "First Mate",
      drawerSubtitle: "Support during meetings",
      icon: Users,
      categoryOverline: "MEETING SUPPORT",
      stageTitle: "First Mate",
      stageSubtitle: "Stay present. Keep your next question close.",
      includedLabel: "Included in your plan",
      previewCardTitle: "Live meeting",
      previewLines: [
        {
          speaker: "Team:",
          text: "He's making progress in small group with reading fluency.",
        },
        {
          speaker: "Parent:",
          text: "Can you say more about how that progress is measured?",
        },
        {
          speaker: "Team:",
          text: "We're using weekly fluency checks and tracking the results.",
        },
      ],
      placardHeader: "A QUESTION TO ASK",
      placardQuote: "How will the team measure progress?",
      ctaLabel: "Open First Mate",
      secondaryActionLabel: "Launch Pop-out Window",
      onSecondaryAction: () => {
        window.open(
          "/first-mate/popout",
          "firstmate_popout",
          "width=440,height=720,menubar=no,toolbar=no"
        );
      },
      capabilities: ["Live guidance", "Meeting notes", "Follow-up questions"],
      howItWorksSteps: [
        {
          title: "1. Launch before or during your IEP meeting",
          detail:
            "First Mate listens to the conversation or lets you log key district statements in real time.",
        },
        {
          title: "2. Receive calm, immediate questions to ask",
          detail:
            "When vague claims arise, First Mate surfaces clear, data-backed follow-up prompts right on screen.",
        },
        {
          title: "3. Save structured meeting notes automatically",
          detail:
            "Every decision, action item, and unanswered question is preserved for your post-meeting review.",
        },
      ],
      taskCategory: "meeting",
      onOpen: () =>
        setLocation(
          contactId ? `/first-mate?contactId=${contactId}` : "/first-mate"
        ),
    },

    // 2. State Complaint Builder
    {
      id: "state-complaint-builder",
      sku: "PG-020 · COMPLIANCE ENGINE",
      drawerTitle: "State Complaint Builder",
      drawerSubtitle: "Prepare a structured draft",
      icon: FileText,
      categoryOverline: "CONCERN & DISPUTE RESOLUTION",
      stageTitle: "State Complaint Builder",
      stageSubtitle:
        "Turn timeline facts and IDEA violations into a clear filing.",
      includedLabel: "Included in your plan",
      previewCardTitle: "Drafting workspace",
      previewLines: [
        {
          speaker: "Issue:",
          text: "Speech-language therapy minutes were missed for 6 consecutive weeks.",
        },
        {
          speaker: "Evidence:",
          text: "IEP Section VII service log vs. district quarterly therapy attendance report.",
        },
        {
          speaker: "Remedy:",
          text: "Request 18 hours of compensatory speech-language instruction.",
        },
      ],
      placardHeader: "KEY REMEDY PROMPT",
      placardQuote: "What compensatory services will make your child whole?",
      ctaLabel: "Open Complaint Builder",
      capabilities: [
        "Violation mapping",
        "Evidence exhibits",
        "Proposed remedies",
      ],
      howItWorksSteps: [
        {
          title: "1. Select the procedural or substantive violation",
          detail:
            "Choose from IDEA violation categories such as missed services, evaluation delays, or PWN omissions.",
        },
        {
          title: "2. Attach dates and documentary exhibits",
          detail:
            "Link IEP pages, emails, and service logs directly to each factual statement.",
        },
        {
          title: "3. Generate a state-ready formal draft",
          detail:
            "Export a structured complaint complete with legal citations and proposed compensatory remedies.",
        },
      ],
      taskCategory: "concern",
      onOpen: () =>
        setLocation(
          contactId
            ? `/tools/state-complaint-builder?contactId=${contactId}`
            : "/tools/state-complaint-builder"
        ),
    },

    // 3. PWN Decoder
    {
      id: "pwn-decoder",
      sku: "PG-010-PWN · NOTICE ANALYZER",
      drawerTitle: "PWN Decoder",
      drawerSubtitle: "Review a district decision",
      icon: Search,
      categoryOverline: "DOCUMENT ANALYSIS",
      stageTitle: "PWN Decoder",
      stageSubtitle:
        "See what the district proposed, refused, and left unsaid.",
      includedLabel: "Included in your plan",
      previewCardTitle: "Notice scan",
      previewLines: [
        {
          speaker: "Refused:",
          text: "District declined parent request for an independent reading evaluation.",
        },
        {
          speaker: "Gap:",
          text: "No objective evaluation data or baseline scores were cited in Section 4.",
        },
        {
          speaker: "Next step:",
          text: "Request the specific assessment data used to justify the refusal.",
        },
      ],
      placardHeader: "A QUESTION TO ASK",
      placardQuote: "Which evaluation data supported this refusal?",
      ctaLabel: "Open PWN Decoder",
      capabilities: [
        "7 federal checks",
        "Missing rationale scan",
        "Response letter draft",
      ],
      howItWorksSteps: [
        {
          title: "1. Upload or paste your Prior Written Notice",
          detail:
            "PWN Decoder checks all 7 mandatory IDEA elements (§300.503) required for any proposal or refusal.",
        },
        {
          title: "2. Spot vague rationales and missing data",
          detail:
            "Instantly see where the school failed to cite concrete evaluation results or options considered.",
        },
        {
          title: "3. Draft a targeted parent response",
          detail:
            "Generate a calm, firm follow-up letter requesting clarification or invoking IEE rights.",
        },
      ],
      taskCategory: "document",
      onOpen: () =>
        setLocation(
          contactId
            ? `/tools/pwn-decoder?contactId=${contactId}`
            : "/tools/pwn-decoder"
        ),
    },

    // 4. IEP Review / IEP Comparator
    {
      id: "iep-review",
      sku: "PG-010-IEP · DIFF ENGINE",
      drawerTitle: "IEP Review",
      drawerSubtitle: "Find gaps and prepare questions",
      icon: Layers,
      categoryOverline: "DOCUMENT COMPARISON & REVIEW",
      stageTitle: "IEP Review & Comparator",
      stageSubtitle:
        "Compare drafts side-by-side to uncover service changes and gaps.",
      includedLabel: "Included in your plan",
      previewCardTitle: "Draft comparison",
      previewLines: [
        {
          speaker: "Baseline:",
          text: "Present Levels note decoding needs, but no decoding goal is included.",
        },
        {
          speaker: "Change:",
          text: "Occupational therapy changed from 60 min/week to 30 min/week (-50%).",
        },
        {
          speaker: "Focus:",
          text: "Ask the team to align service minutes with current evaluation baselines.",
        },
      ],
      placardHeader: "A QUESTION TO ASK",
      placardQuote: "Why were direct therapy minutes reduced in this draft?",
      ctaLabel: "Open IEP Comparator",
      secondaryActionLabel: "Quick PDF Compare Modal",
      onSecondaryAction: onOpenIepComparisonModal,
      capabilities: [
        "Side-by-side redline",
        "Goal & baseline audit",
        "Meeting question list",
      ],
      howItWorksSteps: [
        {
          title: "1. Upload your previous and proposed IEP drafts",
          detail:
            "Compare two IEP versions side-by-side or inspect a single draft for alignment between Present Levels and Goals.",
        },
        {
          title: "2. Review highlighted additions and reductions",
          detail:
            "Every change to accommodations, service minutes, and placement is flagged clearly.",
        },
        {
          title: "3. Bring prioritized questions to the table",
          detail:
            "Export your findings straight into First Mate or Worksheet Studio before the meeting.",
        },
      ],
      taskCategory: "document",
      onOpen: () =>
        setLocation(
          contactId
            ? `/tools/iep-comparator?contactId=${contactId}`
            : "/tools/iep-comparator"
        ),
    },

    // 5. Worksheet Studio
    {
      id: "worksheet-builder",
      sku: "PG-010-WS · PRACTICE STUDIO",
      drawerTitle: "Worksheet Studio",
      drawerSubtitle: "Custom intake forms & prep sheets",
      icon: Sparkles,
      categoryOverline: "MEETING PREPARATION",
      stageTitle: "Worksheet Studio",
      stageSubtitle:
        "Build custom branded parent prep sheets, intake forms, and discovery guides.",
      includedLabel: "Included in your plan",
      previewCardTitle: "Parent prep packet",
      previewLines: [
        {
          speaker: "Strength:",
          text: "Creative problem solver who thrives with visual schedules and hands-on tasks.",
        },
        {
          speaker: "Concern:",
          text: "Homework takes 2+ hours nightly due to multi-step decoding fatigue.",
        },
        {
          speaker: "Request:",
          text: "Attach this written parent input statement to the official IEP record.",
        },
      ],
      placardHeader: "AGENDA PRIORITY",
      placardQuote: "What is your top priority for the team to address today?",
      ctaLabel: "Open Worksheet Studio",
      capabilities: [
        "12 interactive templates",
        "Custom practice branding",
        "Fillable PDF export",
      ],
      howItWorksSteps: [
        {
          title: "1. Choose an intake or meeting prep template",
          detail:
            "Select from Parent Concerns Agenda, Vision Statement, or Accommodation Checklist.",
        },
        {
          title: "2. Customize sections with AI prompt directives",
          detail:
            "Add drag-and-drop question blocks tailored to the student's evaluation history.",
        },
        {
          title: "3. Export a pixel-perfect printable PDF",
          detail:
            "Share with the IEP team ahead of time so parent input is recorded verbatim.",
        },
      ],
      taskCategory: "meeting",
      onOpen: () =>
        setLocation(
          contactId
            ? `/tools/worksheet-builder?contactId=${contactId}`
            : "/tools/worksheet-builder"
        ),
    },

    // 6. Voyage — Meeting Recorder
    {
      id: "voyage-recorder",
      sku: "PG-010-REC · LIVE AUDIO & SCREEN",
      drawerTitle: "Voyage — Meeting Recorder",
      drawerSubtitle: "Live audio & screen transcription",
      icon: Mic,
      categoryOverline: "MEETING CAPTURE",
      stageTitle: "Voyage — Meeting Recorder",
      stageSubtitle:
        "Capture live IEP audio and screen streams with instant speaker transcription.",
      includedLabel: "Included in your plan",
      previewCardTitle: "Live audio capture",
      previewLines: [
        {
          speaker: "04:12",
          text: "Psychologist confirms full reading & cognitive battery will finish by Nov 18.",
        },
        {
          speaker: "11:45",
          text: "Case manager agrees to send weekly fluency progress charts every Friday.",
        },
        {
          speaker: "19:08",
          text: "Team schedules 30-day review meeting to check accommodation fidelity.",
        },
      ],
      placardHeader: "KEY COMMITMENT LOGGED",
      placardQuote: "Weekly progress charts promised every Friday.",
      ctaLabel: "Open Voyage Recorder",
      secondaryActionLabel: "Quick Screen Capture Modal",
      onSecondaryAction: onOpenRecorderModal,
      capabilities: [
        "Browser & mic capture",
        "Whisper AI transcription",
        "Student Voyage Log sync",
      ],
      howItWorksSteps: [
        {
          title: "1. Capture Zoom, Meet, Teams, or in-person audio",
          detail:
            "Select your active meeting tab or microphone with one click.",
        },
        {
          title: "2. Real-time Whisper AI speech-to-text stream",
          detail:
            "Watch speaker-labeled transcript lines appear live as the meeting unfolds.",
        },
        {
          title: "3. Pin key commitments to the Student Dossier",
          detail:
            "Automatically saves the recording and action items to the student's Voyage Log.",
        },
      ],
      taskCategory: "meeting",
      onOpen: () =>
        setLocation(
          contactId
            ? `/tools/voyage-recorder?contactId=${contactId}`
            : "/tools/voyage-recorder"
        ),
    },

    // 7. Meeting Analyzer
    {
      id: "meeting-analyzer",
      sku: "PG-044 · POST-MEETING AI",
      drawerTitle: "Meeting Analyzer",
      drawerSubtitle: "Search transcripts & takeaways",
      icon: Video,
      categoryOverline: "POST-MEETING SYNTHESIS",
      stageTitle: "Meeting Analyzer",
      stageSubtitle:
        "Jump to exact timestamps, extract school commitments, and draft recap letters.",
      includedLabel: "Included in your plan",
      previewCardTitle: "Post-meeting synthesis",
      previewLines: [
        {
          speaker: "14:31",
          text: "Commitment: District agreed to fund an Independent Educational Evaluation (IEE).",
        },
        {
          speaker: "28:04",
          text: "Refusal: Request for 1:1 paraprofessional aide during transitions was declined.",
        },
        {
          speaker: "Recap:",
          text: "48-hour parent follow-up summary letter generated and ready to send.",
        },
      ],
      placardHeader: "FOLLOW-UP PROMPT",
      placardQuote:
        "Confirm every verbal agreement in writing within 48 hours.",
      ctaLabel: "Open Meeting Analyzer",
      capabilities: [
        "Timestamp keyword search",
        "Commitment extraction",
        "48-hour recap letter",
      ],
      howItWorksSteps: [
        {
          title: "1. Review recorded IEP sessions with synced transcripts",
          detail:
            "Search any keyword across full meeting audio to jump straight to that moment.",
        },
        {
          title: "2. Extract school commitments and refused requests",
          detail:
            "Automatically separates agreed action items from items requiring a PWN.",
        },
        {
          title: "3. Generate a 48-hour parent follow-up email",
          detail:
            "Send a clear written summary to memorialize what was decided at the table.",
        },
      ],
      taskCategory: "meeting",
      onOpen: () =>
        setLocation(
          contactId
            ? `/post-meeting-review/${contactId}`
            : "/post-meeting-review"
        ),
    },

    // 8. Case Compass & Timeline
    {
      id: "timeline-builder",
      sku: "PG-025 · CASE COMPASS",
      drawerTitle: "Case Compass & Timeline",
      drawerSubtitle: "Visual chronology & deadlines",
      icon: Compass,
      categoryOverline: "CASE CHRONOLOGY & STRATEGY",
      stageTitle: "Case Compass & Timeline",
      stageSubtitle:
        "Map evaluations, IEPs, PWNs, and statutory 60-day or 30-day compliance deadlines.",
      includedLabel: "Included in your plan",
      previewCardTitle: "Chronological map",
      previewLines: [
        {
          speaker: "Oct 05:",
          text: "Parent signed consent for initial psychoeducational evaluation.",
        },
        {
          speaker: "Dec 04:",
          text: "Statutory 60-day evaluation completion deadline (14 days remaining).",
        },
        {
          speaker: "Export:",
          text: "Chronology linked to State Complaint and Mediation timeline packet.",
        },
      ],
      placardHeader: "NEXT STATUTORY DEADLINE",
      placardQuote: "Request evaluation copies 5 days before the meeting.",
      ctaLabel: "Open Case Compass",
      capabilities: [
        "Visual case chronology",
        "60-day & annual countdowns",
        "Mediation timeline export",
      ],
      howItWorksSteps: [
        {
          title: "1. Plot every evaluation, IEP, and PWN on one timeline",
          detail:
            "See your child's entire special education history in chronological order.",
        },
        {
          title: "2. Monitor 60-day and 30-day statutory countdowns",
          detail:
            "Automatic alerts flag overdue evaluations or missed annual review windows.",
        },
        {
          title: "3. Export chronological packets for dispute resolution",
          detail:
            "Generate a clean timeline exhibit for state complaints or mediation.",
        },
      ],
      taskCategory: "concern",
      onOpen: () =>
        setLocation(
          contactId ? `/case-compass?studentId=${contactId}` : "/case-compass"
        ),
    },

    // 9. Secure Smart Files & Vault
    {
      id: "document-vault",
      sku: "PG-033 · SMART FILES SUITE",
      drawerTitle: "Secure Smart Files & Vault",
      drawerSubtitle: "Encrypted IEP repository & packets",
      icon: FolderKanban,
      categoryOverline: "ENCRYPTED DOCUMENT REPOSITORY",
      stageTitle: "Secure Smart Files & Vault",
      stageSubtitle:
        "Store, organize, assign, and collect e-signatures on IEP records and packets.",
      includedLabel: "Included in your plan",
      previewCardTitle: "Indexed vault records",
      previewLines: [
        {
          speaker: "IEP PDF:",
          text: "2026 Annual IEP Draft — OCR-indexed with 6 goals and service matrix.",
        },
        {
          speaker: "EVAL:",
          text: "Private Neuropsychological Evaluation — subtest percentiles extracted.",
        },
        {
          speaker: "SIGNED:",
          text: "Family Release & Intake Smart File Packet — completed and verified.",
        },
      ],
      placardHeader: "ORGANIZED RECORD",
      placardQuote: "Every evaluation score and service log in one vault.",
      ctaLabel: "Open Smart Files Vault",
      capabilities: [
        "OCR-indexed IEP storage",
        "Interactive questionnaires",
        "E-signature collection",
      ],
      howItWorksSteps: [
        {
          title: "1. Upload IEPs, psychoeducational evaluations, and PWNs",
          detail:
            "Documents are OCR-indexed and organized chronologically by school year.",
        },
        {
          title: "2. Assign interactive Smart File questionnaires",
          detail:
            "Collect structured family intake answers and legally binding e-signatures.",
        },
        {
          title: "3. Link files directly to comparison and complaint tools",
          detail:
            "Pull any vault document straight into IEP Review or State Complaint Builder.",
        },
      ],
      taskCategory: "document",
      onOpen: () =>
        setLocation(
          contactId ? `/contacts/${contactId}?tab=files` : "/smart-files"
        ),
    },

    // 10. Advocacy AI Strategy Engine
    {
      id: "advocacy-assistant",
      sku: "PG-013-AI · AI PROMPT VAULT",
      drawerTitle: "Advocacy AI Strategy Engine",
      drawerSubtitle: "Locked IEP prompts & SMART goals",
      icon: Wand2,
      categoryOverline: "AI STRATEGY & PROMPT VAULT",
      stageTitle: "Advocacy AI Strategy Engine",
      stageSubtitle:
        "Curated special education legal prompts, SMART goal writers, and rebuttal scripts.",
      includedLabel: "Included in your plan",
      previewCardTitle: "Strategy generator",
      previewLines: [
        {
          speaker: "Goal AI:",
          text: "Generated measurable Orton-Gillingham decoding SMART goal with 85% mastery criteria.",
        },
        {
          speaker: "Matrix:",
          text: "Matched executive functioning deficits to 8 classroom testing accommodations.",
        },
        {
          speaker: "Rebuttal:",
          text: "Drafted parent response to ‘making adequate grade-level progress’ claim.",
        },
      ],
      placardHeader: "SMART GOAL FORMULA",
      placardQuote:
        "Is the goal specific, measurable, and tied to a baseline?",
      ctaLabel: "Open AI Strategy Engine",
      capabilities: [
        "SMART Goal Generator",
        "Accommodation Matrix",
        "Parent Rebuttal Drafter",
      ],
      howItWorksSteps: [
        {
          title: "1. Browse the Locked IEP & Section 504 Prompt Vault",
          detail:
            "Select proven advocacy prompts for goals, accommodations, IEE requests, and rebuttals.",
        },
        {
          title: "2. Generate measurable SMART goals in seconds",
          detail:
            "Turn vague draft goals into baseline-driven, quantifiable IEP objectives.",
        },
      ],
      taskCategory: "concern",
      onOpen: () => setLocation("/automations?tab=ai-vault"),
    },

    // 11. Letter Builder (Quick Micro-Tool)
    {
      id: "letter-builder",
      sku: "QUICK TOOL · CORRESPONDENCE",
      drawerTitle: "Letter Builder",
      drawerSubtitle: "Create custom advocacy letters",
      icon: PenTool,
      categoryOverline: "QUICK MICRO-TOOL · CORRESPONDENCE",
      stageTitle: "Letter Builder",
      stageSubtitle:
        "Draft formal IEE requests, 10-day notices, and evaluation consent letters.",
      includedLabel: "Included in your plan",
      previewCardTitle: "Formal letter draft",
      previewLines: [
        {
          speaker: "Template:",
          text: "Request for Independent Educational Evaluation (IEE) at Public Expense.",
        },
        {
          speaker: "Citation:",
          text: "Pursuant to 34 C.F.R. § 300.502, I disagree with the district's evaluation.",
        },
        {
          speaker: "Action:",
          text: "Requesting written response and IEE criteria within 10 business days.",
        },
      ],
      placardHeader: "PAPER TRAIL RULE",
      placardQuote: "If it wasn't written down, it didn't happen.",
      ctaLabel: "Open Letter Builder",
      capabilities: [
        "IEE request letters",
        "Evaluation requests",
        "Post-meeting follow-ups",
      ],
      howItWorksSteps: [
        {
          title: "1. Choose a formal correspondence template",
          detail:
            "Select from IEE requests, initial evaluation referrals, or record requests.",
        },
        {
          title: "2. Customize with student dates and export",
          detail:
            "Send a clear, legally grounded letter that starts statutory timelines.",
        },
      ],
      taskCategory: "concern",
      onOpen: () =>
        setLocation(
          contactId
            ? `/state-complaint-builder?contactId=${contactId}`
            : "/state-complaint-builder"
        ),
    },

    // 12. PWN Checker (Quick Micro-Tool)
    {
      id: "pwn-checker",
      sku: "QUICK TOOL · COMPLIANCE CHECK",
      drawerTitle: "PWN Checker",
      drawerSubtitle: "Review for PWN indicators",
      icon: ShieldCheck,
      categoryOverline: "QUICK MICRO-TOOL · COMPLIANCE",
      stageTitle: "PWN Checker",
      stageSubtitle:
        "Quickly verify whether a school decision triggered a mandatory Prior Written Notice.",
      includedLabel: "Included in your plan",
      previewCardTitle: "Trigger checklist",
      previewLines: [
        {
          speaker: "Trigger 1:",
          text: "Did the district propose or refuse to change identification or placement?",
        },
        {
          speaker: "Trigger 2:",
          text: "Did the district refuse a parent request for an evaluation or service?",
        },
        {
          speaker: "Result:",
          text: "Formal Prior Written Notice under 34 C.F.R. § 300.503 is required.",
        },
      ],
      placardHeader: "COMPLIANCE CHECK",
      placardQuote:
        "Did the school put their refusal in a formal Prior Written Notice?",
      ctaLabel: "Open PWN Checker",
      capabilities: [
        "§300.503 trigger check",
        "Refusal documentation",
        "Notice demand draft",
      ],
      howItWorksSteps: [
        {
          title: "1. Check if a verbal refusal requires a PWN",
          detail:
            "Any refusal relating to identification, evaluation, placement, or FAPE requires written notice.",
        },
      ],
      taskCategory: "document",
      onOpen: () =>
        setLocation(
          contactId
            ? `/tools/pwn-decoder?contactId=${contactId}`
            : "/tools/pwn-decoder"
        ),
    },

    // 13. Goal Bank (Quick Micro-Tool)
    {
      id: "goal-bank",
      sku: "QUICK TOOL · SMART GOALS",
      drawerTitle: "Goal Bank",
      drawerSubtitle: "Browse measurable goal examples",
      icon: Target,
      categoryOverline: "QUICK MICRO-TOOL · IEP GOALS",
      stageTitle: "Goal Bank",
      stageSubtitle:
        "Browse measurable, baseline-driven IEP goals across reading, math, speech, and executive function.",
      includedLabel: "Included in your plan",
      previewCardTitle: "Sample SMART goals",
      previewLines: [
        {
          speaker: "Reading:",
          text: "Given a grade-level passage, student will decode multisyllabic words at 90% accuracy.",
        },
        {
          speaker: "Exec Fn:",
          text: "Using a visual checklist, student will initiate multi-step tasks within 2 minutes.",
        },
        {
          speaker: "Speech:",
          text: "Across 4 of 5 trials, student will formulate complex sentences during peer dialogue.",
        },
      ],
      placardHeader: "MEASURABLE TARGET",
      placardQuote: "Every goal needs a clear baseline and mastery criterion.",
      ctaLabel: "Browse Goal Bank",
      capabilities: [
        "Reading & dyslexia goals",
        "Executive function targets",
        "Speech & OT benchmarks",
      ],
      howItWorksSteps: [
        {
          title: "1. Filter goals by domain and grade level",
          detail:
            "Explore hundreds of IDEA-compliant SMART goals ready to adapt for your child's IEP.",
        },
      ],
      taskCategory: "meeting",
      onOpen: () => setLocation("/automations?tab=ai-vault"),
    },

    // 14. Accommodation Bank (Quick Micro-Tool)
    {
      id: "accommodation-bank",
      sku: "QUICK TOOL · SUPPORTS",
      drawerTitle: "Accommodation Bank",
      drawerSubtitle: "Find classroom & testing supports",
      icon: Puzzle,
      categoryOverline: "QUICK MICRO-TOOL · ACCOMMODATIONS",
      stageTitle: "Accommodation Bank",
      stageSubtitle:
        "Match your child's learning profile to concrete presentation, setting, and timing supports.",
      includedLabel: "Included in your plan",
      previewCardTitle: "Support matrix",
      previewLines: [
        {
          speaker: "Timing:",
          text: "Extended time (1.5x–2x) on all timed assignments, quizzes, and state assessments.",
        },
        {
          speaker: "Setting:",
          text: "Small-group, reduced-distraction testing environment with noise-canceling headphones.",
        },
        {
          speaker: "Access:",
          text: "Teacher-provided guided notes and chunked multi-step instructions.",
        },
      ],
      placardHeader: "SUPPORT QUESTION",
      placardQuote:
        "Which accommodations remove barriers without lowering expectations?",
      ctaLabel: "Browse Accommodations",
      capabilities: [
        "Presentation supports",
        "Testing environments",
        "Sensory & ADHD tools",
      ],
      howItWorksSteps: [
        {
          title: "1. Search accommodations by area of need",
          detail:
            "Find specific wording for IEP Section IV and Section 504 accommodation plans.",
        },
      ],
      taskCategory: "meeting",
      onOpen: () => setLocation("/automations?tab=ai-vault"),
    },

    // 15. Progress Tracker (Quick Micro-Tool)
    {
      id: "progress-tracker",
      sku: "QUICK TOOL · DATA MONITORING",
      drawerTitle: "Progress Tracker",
      drawerSubtitle: "Track and visualize IEP progress",
      icon: LineChart,
      categoryOverline: "QUICK MICRO-TOOL · PROGRESS MONITORING",
      stageTitle: "Progress Tracker",
      stageSubtitle:
        "Track benchmark data across grading periods to spot stagnation early.",
      includedLabel: "Included in your plan",
      previewCardTitle: "Progress trendline",
      previewLines: [
        {
          speaker: "Q1 Data:",
          text: "Reading fluency baseline: 62 words correct per minute (WCPM).",
        },
        {
          speaker: "Q2 Data:",
          text: "Current probe: 64 WCPM — flat trendline indicates need for intensive intervention.",
        },
        {
          speaker: "Action:",
          text: "Request an IEP review to adjust instructional methodology and frequency.",
        },
      ],
      placardHeader: "DATA QUESTION",
      placardQuote:
        "If the data shows flat progress for two quarters, what are we changing?",
      ctaLabel: "Open Progress Tracker",
      capabilities: [
        "Quarterly probe logging",
        "Regression detection",
        "IEP review triggers",
      ],
      howItWorksSteps: [
        {
          title: "1. Compare quarterly progress reports against annual targets",
          detail:
            "Spot when a student is not on track to master annual goals so you can request an early IEP review.",
        },
      ],
      taskCategory: "document",
      onOpen: () =>
        setLocation(
          contactId ? `/case-compass?studentId=${contactId}` : "/case-compass"
        ),
    },
  ];
}

