import { JourneyStage, StateEngineRule, SampleClientPersona } from "./types";

export const INITIAL_JOURNEY_STAGES: JourneyStage[] = [
  {
    id: "stage-01",
    pageId: "PG-027-S01",
    stepNumber: "01",
    name: "Discovery Inquiry Submitted",
    category: "Discovery & Intake",
    description: "Prospective client submits initial web intake/inquiry. Account record created in CRM.",
    status: "published",
    triggerCondition: "Form submission on public website / discovery inquiry webhook",
    associatedPortalPage: "Discovery Scheduled Dashboard",
    associatedRoute: "/portal/discovery",
    requiredClientActions: [
      "Select available calendar slot for Discovery Call",
      "Confirm primary phone and email contact info"
    ],
    availableClientActions: [
      "Read 'What to Expect at Waypoint' overview",
      "Download IEP Preparation Checklist"
    ],
    stateEngineKey: "DISCOVERY_INQUIRY",
    iconName: "FileSpreadsheet",
    lastUpdated: "2026-08-20"
  },
  {
    id: "stage-02",
    pageId: "PG-027-S02",
    stepNumber: "02",
    name: "Discovery Call Scheduled",
    category: "Discovery & Intake",
    description: "Prospective client has scheduled their free 30-min call with Byron Honea. Authenticated pre-sale portal activated.",
    status: "published",
    triggerCondition: "Calendar booking confirmed with prospective client email & phone",
    associatedPortalPage: "Discovery Call Details & Pre-Portal",
    associatedRoute: "/portal/discovery-call",
    requiredClientActions: [
      "Add scheduled Discovery Call to personal calendar",
      "Review appointment video link details"
    ],
    availableClientActions: [
      "Preview future Student Workspace & Document Library",
      "Reschedule or manage Discovery Call booking",
      "Send introductory note or concerns to Byron"
    ],
    stateEngineKey: "DISCOVERY_SCHEDULED",
    iconName: "CalendarCheck",
    lastUpdated: "2026-08-22"
  },
  {
    id: "stage-03",
    pageId: "PG-027-S03",
    stepNumber: "03",
    name: "Discovery Call Completed",
    category: "Discovery & Intake",
    description: "Discovery Call held. Coach notes logged and customized support recommendations ready for parent review.",
    status: "published",
    triggerCondition: "Coach marks discovery call attended / completed in CRM",
    associatedPortalPage: "Discovery Call Summary & Next Steps",
    associatedRoute: "/portal/discovery-summary",
    requiredClientActions: [
      "Review Discovery Call summary notes & recommendations",
      "Acknowledge next step proposal"
    ],
    availableClientActions: [
      "Ask follow-up question via secure message",
      "Proceed directly to student selection"
    ],
    stateEngineKey: "DISCOVERY_COMPLETED",
    iconName: "CheckCircle",
    lastUpdated: "2026-08-25"
  },
  {
    id: "stage-04",
    pageId: "PG-027-S04",
    stepNumber: "04",
    name: "Select Support Tier & Package",
    category: "Plan & Checkout",
    description: "Parent selects their desired advocacy representation tier, membership, or standalone state complaint package.",
    status: "published",
    triggerCondition: "Parent clicks 'Choose Advocacy Support' from completed discovery",
    associatedPortalPage: "Support Tier Selection",
    associatedRoute: "/portal/support-selection",
    requiredClientActions: [
      "Select advocacy tier or membership plan",
      "Choose payment schedule (Pay in Full or 2 Installments)"
    ],
    availableClientActions: [
      "Review package features & catalog deliverables",
      "Save progress and resume checkout later"
    ],
    stateEngineKey: "PLAN_SELECTION",
    iconName: "ShieldCheck",
    lastUpdated: "2026-08-30"
  },
  {
    id: "stage-05",
    pageId: "PG-027-S05",
    stepNumber: "05",
    name: "Select Support Level",
    category: "Plan & Checkout",
    description: "Parent selects the appropriate advocacy tier (Full IEP Representation, Document Review & Strategy, or Retainer).",
    status: "published",
    triggerCondition: "Student count selected and validated",
    associatedPortalPage: "Support Selection",
    associatedRoute: "/portal/support-selection",
    requiredClientActions: [
      "Select package / support tier",
      "Choose billing schedule (Full Upfront or 2-Pay Installments)"
    ],
    availableClientActions: [
      "Compare feature breakdown matrix",
      "Request customized retainer review"
    ],
    stateEngineKey: "PLAN_SELECTION",
    iconName: "ShieldCheck",
    lastUpdated: "2026-08-18"
  },
  {
    id: "stage-06",
    pageId: "PG-027-S06",
    stepNumber: "06",
    name: "Checkout / Payment",
    category: "Plan & Checkout",
    description: "Secure Stripe checkout process with household invoice receipt and payment ledger recording.",
    status: "published",
    triggerCondition: "Tier selected and parent initiates checkout",
    associatedPortalPage: "Checkout",
    associatedRoute: "/portal/checkout",
    requiredClientActions: [
      "Enter credit card / ACH billing credentials",
      "Authorize payment for selected advocacy tier"
    ],
    availableClientActions: [
      "Apply approved promo code or scholarship voucher",
      "Download invoice receipt"
    ],
    stateEngineKey: "PAYMENT_PENDING",
    iconName: "CreditCard",
    lastUpdated: "2026-08-28"
  },
  {
    id: "stage-07",
    pageId: "PG-027-S07",
    stepNumber: "07",
    name: "Welcome to Waypoint",
    category: "Progressive Onboarding",
    description: "Post-payment onboarding kickoff. Confetti milestone and orientation video from Byron Honea.",
    status: "published",
    triggerCondition: "Payment webhook received and verified with household receipt",
    associatedPortalPage: "Welcome to Waypoint",
    associatedRoute: "/portal/welcome",
    requiredClientActions: [
      "Watch 2-minute client orientation video",
      "Click 'Begin Progressive Onboarding'"
    ],
    availableClientActions: [
      "Download 'Parent Rights & Waypoint Promise' PDF",
      "Add Waypoint contact card to phone"
    ],
    stateEngineKey: "ONBOARDING",
    iconName: "Sparkles",
    lastUpdated: "2026-08-24"
  },
  {
    id: "stage-08",
    pageId: "PG-027-S08",
    stepNumber: "08",
    name: "Advocacy Agreements",
    category: "Progressive Onboarding",
    description: "Master Representation Agreement and FERPA Authorization electronic signature capture.",
    status: "published",
    triggerCondition: "Orientation completed; agreement dynamically generated for household",
    associatedPortalPage: "Advocacy Agreement",
    associatedRoute: "/portal/agreements",
    requiredClientActions: [
      "Review Scope of IEP Representation Terms",
      "Electronically sign Advocacy Agreement with e-signature pad"
    ],
    availableClientActions: [
      "Download unsigned preview copy",
      "Request legal terminology clarification"
    ],
    stateEngineKey: "ONBOARDING",
    iconName: "PenTool",
    lastUpdated: "2026-08-27"
  },
  {
    id: "stage-09",
    pageId: "PG-027-S09",
    stepNumber: "09",
    name: "Student Setup",
    category: "Progressive Onboarding",
    description: "Detailed student profile builder: school district, current placement, diagnosis, accommodations, and IEP team names.",
    status: "published",
    triggerCondition: "Agreement signed; saves independently per student",
    associatedPortalPage: "Student Setup",
    associatedRoute: "/portal/student-setup",
    requiredClientActions: [
      "Confirm student school, district, and current grade",
      "Input primary exceptionality/eligibility category",
      "List case manager & principal contact info"
    ],
    availableClientActions: [
      "Add additional family member / co-parent authorizations",
      "Save progress as draft"
    ],
    stateEngineKey: "ONBOARDING",
    iconName: "GraduationCap",
    lastUpdated: "2026-08-26"
  },
  {
    id: "stage-10",
    pageId: "PG-027-S10",
    stepNumber: "10",
    name: "Records & Document Upload",
    category: "Progressive Onboarding",
    description: "Secure R2 document vault upload for current IEP, BIP, 504 Plan, psychological evaluations, and medical reports.",
    status: "published",
    triggerCondition: "Student setup profile saved; independently verifiable upload slots",
    associatedPortalPage: "Document Upload",
    associatedRoute: "/portal/document-upload",
    requiredClientActions: [
      "Upload most recent IEP document (PDF / Scan)",
      "Upload latest Psychological / Multidisciplinary Evaluation (if available)"
    ],
    availableClientActions: [
      "Upload prior testing, private OT/ST reports, work samples",
      "Indicate if physical records need to be scanned by Waypoint"
    ],
    stateEngineKey: "ONBOARDING",
    iconName: "UploadCloud",
    lastUpdated: "2026-08-27"
  },
  {
    id: "stage-11",
    pageId: "PG-027-S11",
    stepNumber: "11",
    name: "Advocacy Intake",
    category: "Progressive Onboarding",
    description: "In-depth parent priorities worksheet: student strengths, parent concerns, goals for upcoming IEP meeting, and district friction points.",
    status: "published",
    triggerCondition: "Key records uploaded; independently autosaving questionnaire",
    associatedPortalPage: "Advocacy Intake",
    associatedRoute: "/portal/advocacy-intake",
    requiredClientActions: [
      "Answer 6 core IEP advocacy priority prompts",
      "State top 3 desired outcomes from Waypoint representation"
    ],
    availableClientActions: [
      "Use Voice Note recorder for spoken parent thoughts",
      "Attach supplemental incident notes"
    ],
    stateEngineKey: "ONBOARDING",
    iconName: "ClipboardList",
    lastUpdated: "2026-08-25"
  },
  {
    id: "stage-12",
    pageId: "PG-027-S12",
    stepNumber: "12",
    name: "Onboarding Complete",
    category: "Progressive Onboarding",
    description: "All 5 progressive onboarding steps validated. Case Compass initialized and initial Strategy Session scheduled.",
    status: "published",
    triggerCondition: "All required steps (Agreement, Student, Documents, Intake) completed",
    associatedPortalPage: "Onboarding Checklist & Congratulations",
    associatedRoute: "/portal/onboarding-complete",
    requiredClientActions: [
      "Schedule 45-minute IEP Strategy & Case Launch Call",
      "Review Case Compass initial dashboard"
    ],
    availableClientActions: [
      "Send first message to Byron & IEP Team via portal chat",
      "Print onboarding record receipt"
    ],
    stateEngineKey: "ONBOARDING",
    iconName: "Award",
    lastUpdated: "2026-08-29"
  },
  {
    id: "stage-13",
    pageId: "PG-027-S13",
    stepNumber: "13",
    name: "Active Advocacy",
    category: "Active Service",
    description: "Full active representation workspace. Case Compass status tracking, upcoming IEP meetings, real-time messaging, task boards, and document archives.",
    status: "published",
    triggerCondition: "Case active with assigned Byron Honea advocate; regular service cycle",
    associatedPortalPage: "Client Dashboard & Case Workspace",
    associatedRoute: "/portal/dashboard",
    requiredClientActions: [
      "Respond to assigned parent action items/tasks",
      "Confirm availability for upcoming school IEP meetings"
    ],
    availableClientActions: [
      "View live Case Compass status & stage",
      "Access Document Vault & IEP comparison tool",
      "Schedule follow-up clarity sessions",
      "Message Byron directly"
    ],
    stateEngineKey: "ACTIVE",
    iconName: "Activity",
    lastUpdated: "2026-08-29"
  },
  {
    id: "stage-14",
    pageId: "PG-027-S14",
    stepNumber: "14",
    name: "Closing / Inactive Client",
    category: "Account Lifecycle",
    description: "IEP resolution achieved, school year concluded, or representation closed. Read-only permanent records archive and satisfaction survey.",
    status: "published",
    triggerCondition: "Advocate marks case resolved or client marks inactive",
    associatedPortalPage: "Closing Experience & Records Archive",
    associatedRoute: "/portal/closing",
    requiredClientActions: [
      "Complete 3-question Waypoint Advocacy Feedback Survey",
      "Confirm permanent download of student document bundle"
    ],
    availableClientActions: [
      "Re-open case or book annual IEP tune-up check",
      "Leave a Google / Waypoint review for Byron",
      "Access permanent read-only record archive anytime"
    ],
    stateEngineKey: "CLOSING",
    iconName: "Archive",
    lastUpdated: "2026-08-21"
  },
  {
    id: "stage-15",
    pageId: "PG-027-S15",
    stepNumber: "15",
    name: "Annual Advocacy Renewal & Listing",
    category: "Retention & Renewal",
    description: "Annual IEP representation rollover, retainer block replenishment, and continuation packages for the upcoming school year.",
    status: "published",
    triggerCondition: "Contract expiration within 60 days, annual IEP cycle rollover, or client clicks Renew Plan",
    associatedPortalPage: "Advocacy Plan Renewal & Extension",
    associatedRoute: "/portal/renewal",
    requiredClientActions: [
      "Select annual renewal tier (Comprehensive Representation, Goal Audit, or Retainer Block)",
      "Confirm continuing student enrollment details",
      "Sign renewed representation agreement addendum"
    ],
    availableClientActions: [
      "Select optional riders (IEE oversight, BIP evaluation, Sibling plan)",
      "Choose payment frequency (Annual Lump-Sum with 10% Loyalty Savings vs 3-Pay)",
      "Schedule Byron Honea Renewal Alignment Consultation"
    ],
    stateEngineKey: "RENEWAL_PENDING",
    iconName: "RefreshCw",
    lastUpdated: "2026-08-30"
  }
];

export const STATE_ENGINE_RULES: StateEngineRule[] = [
  {
    state: "DISCOVERY_INQUIRY",
    label: "Discovery Inquiry",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    description: "Inquiry received. Pre-portal profile generated. Parent prompted to schedule Discovery Call.",
    entryTriggers: ["Lead form submission", "Direct phone intake logging"],
    resolvedExperience: "Discovery Scheduled Dashboard (Pre-booking mode)",
    householdResolution: "Matches contact by email or phone; creates prospective household stub.",
    exitCondition: "Appointment booked in calendar (transitions to DISCOVERY_SCHEDULED).",
    fallbackBehavior: "Shows public booking calendar widget if no time chosen yet."
  },
  {
    state: "DISCOVERY_SCHEDULED",
    label: "Discovery Scheduled",
    color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
    description: "Prospective client has an active Discovery Call appointment. Pre-sale portal shows upcoming call info and locked workspace teasers.",
    entryTriggers: ["Calendar appointment linked to contact"],
    resolvedExperience: "Discovery Call Portal (Experience 01)",
    householdResolution: "Resolves upcoming discovery appointment details, contact name, and pre-sale teasers.",
    exitCondition: "Discovery call conducted & marked complete by Byron.",
    fallbackBehavior: "If appointment cancelled, reverts to DISCOVERY_INQUIRY."
  },
  {
    state: "DISCOVERY_COMPLETED",
    label: "Discovery Completed",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/30",
    description: "Discovery Call concluded. Shows call recap and clear next step to choose support package.",
    entryTriggers: ["Coach marks discovery call completed"],
    resolvedExperience: "Discovery Summary & Tier Recommendation",
    householdResolution: "Resolves discovery notes & custom recommended tier from CRM.",
    exitCondition: "Client clicks 'Choose Support' (transitions to PLAN_SELECTION).",
    fallbackBehavior: "Allows 1-click rebooking if parent wants another clarity discussion."
  },
  {
    state: "PLAN_SELECTION",
    label: "Plan & Tier Selection",
    color: "bg-violet-500/10 text-violet-600 border-violet-500/30",
    description: "Client selects number of students and desired representation package.",
    entryTriggers: ["Client enters package selector from discovery summary or direct link"],
    resolvedExperience: "Student Selection -> Support Selection",
    householdResolution: "Calculates multi-student discounts dynamically based on selected student count.",
    exitCondition: "Package selected & parent proceeds to checkout.",
    fallbackBehavior: "Defaults to Standard 1-Student Comprehensive Advocacy Tier."
  },
  {
    state: "PAYMENT_PENDING",
    label: "Payment Pending",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    description: "Order generated; awaiting Stripe invoice payment or checkout completion.",
    entryTriggers: ["Checkout page opened / payment intent created"],
    resolvedExperience: "Stripe Checkout & Billing Authorization",
    householdResolution: "Locks price and creates pending invoice on household ledger.",
    exitCondition: "Payment webhook received with status 'paid'.",
    fallbackBehavior: "Provides retry button and alternative invoice payment link."
  },
  {
    state: "ONBOARDING",
    label: "Progressive Onboarding",
    color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30",
    description: "Paid client completing 5 independent onboarding milestones (Agreements, Students, Records, Intake, Strategy Call).",
    entryTriggers: ["Payment verified on account"],
    resolvedExperience: "Progressive Onboarding Step Engine (Welcome -> Agreements -> Setup -> Upload -> Intake)",
    householdResolution: "Reads household's saved steps independently; resumes exactly where parent left off.",
    exitCondition: "All mandatory steps complete -> advances to ACTIVE.",
    fallbackBehavior: "Autosaves partial steps to local/cloud storage so no work is lost."
  },
  {
    state: "ACTIVE",
    label: "Active Advocacy",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    description: "Full active IEP advocacy representation. Live Case Compass, meeting countdowns, IEP comparison, and task boards.",
    entryTriggers: ["Onboarding marked complete / case active in CRM"],
    resolvedExperience: "Full Client Portal Dashboard (Multi-tab workspace)",
    householdResolution: "Resolves all authorized students, active IEP cases, documents in R2, and tasks.",
    exitCondition: "Case resolution achieved or advocate transitions case to closing.",
    fallbackBehavior: "If multi-student household, enables seamless student switcher in header."
  },
  {
    state: "RENEWAL_PENDING",
    label: "Renewal Approaching",
    color: "bg-orange-500/10 text-orange-600 border-orange-500/30",
    description: "Active contract expiring within 60 days or academic year rollover approaching. Portal presents tailored renewal packages and loyalty discounts.",
    entryTriggers: ["Contract expiration <= 60 days", "Admin issues annual renewal notice", "Parent clicks 'Renew Support'"],
    resolvedExperience: "Advocacy Plan Renewal & Package Selector (/portal/renewal)",
    householdResolution: "Preserves existing student profiles and IEP documents while activating new academic year tier options.",
    exitCondition: "Renewal package selected and paid (transitions to RENEWED / ACTIVE).",
    fallbackBehavior: "Maintains current active workspace while showcasing top-level renewal notification banner."
  },
  {
    state: "RENEWED",
    label: "Renewed Continuity",
    color: "bg-teal-500/10 text-teal-600 border-teal-500/30",
    description: "Renewal executed for upcoming school year. Representation dates extended and Case Compass updated.",
    entryTriggers: ["Renewal checkout successful / agreement countersigned"],
    resolvedExperience: "Active Client Dashboard with Extended Term Confirmation",
    householdResolution: "Increments contract term and updates Case Compass goals for new academic cycle.",
    exitCondition: "Standard active case lifecycle.",
    fallbackBehavior: "Emits renewal receipt and calendar sync."
  },
  {
    state: "CLOSING",
    label: "Closing / Resolved",
    color: "bg-teal-500/10 text-teal-600 border-teal-500/30",
    description: "Advocacy cycle concluding. Final satisfaction survey, summary wrap-up, and permanent archive download.",
    entryTriggers: ["Advocate sets case status to 'Closing'"],
    resolvedExperience: "Closing Experience & Records Archive",
    householdResolution: "Provides permanent 1-click ZIP export of all student IEP documents & notes.",
    exitCondition: "Client acknowledges wrap-up -> transitions to INACTIVE (read-only).",
    fallbackBehavior: "Retains perpetual portal login for historic record access."
  },
  {
    state: "INACTIVE",
    label: "Inactive / Alumni",
    color: "bg-slate-500/10 text-slate-600 border-slate-500/30",
    description: "Past client with read-only record access. Easy 1-click button to re-activate for new school year or annual IEP.",
    entryTriggers: ["Case closed over 30 days ago with no active retainer"],
    resolvedExperience: "Alumni Archive View + 'Re-Engage Waypoint' Banner",
    householdResolution: "Preserves historic records without allowing new task creation until renewed.",
    exitCondition: "Client books new Discovery Call or renews retainer.",
    fallbackBehavior: "Displays historical IEP comparison and document downloads."
  },
  {
    state: "CANCELED",
    label: "Canceled",
    color: "bg-rose-500/10 text-rose-600 border-rose-500/30",
    description: "Inquiry or engagement canceled. Clear re-activation option.",
    entryTriggers: ["Client or admin manually cancels engagement"],
    resolvedExperience: "Canceled Status View + Help & Re-activation Options",
    householdResolution: "Disables active notifications while allowing login.",
    exitCondition: "New discovery booking made.",
    fallbackBehavior: "Provides contact support link."
  }
];

export const SAMPLE_CLIENT_PERSONAS: SampleClientPersona[] = [
  {
    id: "persona-discovery",
    name: "Sarah Jenkins (Prospective Parent)",
    email: "sarah.jenkins@example.com",
    state: "DISCOVERY_SCHEDULED",
    stageName: "02 · Discovery Call Scheduled",
    studentsCount: 1,
    students: [
      {
        name: "Liam Jenkins",
        grade: "4th Grade",
        school: "Fulton Elementary",
        iepStatus: "Initial IEP Evaluation Dispute"
      }
    ],
    appointment: {
      date: "Tuesday, September 15, 2026",
      time: "2:00 PM - 2:30 PM EDT",
      coach: "Byron Honea, Master IEP Coach®",
      type: "Discovery Call (Video via Google Meet)",
      meetLink: "https://meet.google.com/waypoint-demo"
    }
  },
  {
    id: "persona-onboarding",
    name: "Marcus & Elena Vance (New Clients)",
    email: "vance.family@example.com",
    state: "ONBOARDING",
    stageName: "08 · Advocacy Agreements",
    studentsCount: 2,
    students: [
      {
        name: "Noah Vance",
        grade: "7th Grade",
        school: "Cherokee Middle School",
        iepStatus: "Autism / Speech Therapy Goal Review"
      },
      {
        name: "Maya Vance",
        grade: "3rd Grade",
        school: "Cherokee Elementary",
        iepStatus: "504 Plan ADHD Accommodations"
      }
    ],
    onboardingProgress: {
      completedSteps: ["Account Created", "Payment Complete ($1,850 Full Representation)"],
      pendingSteps: ["Sign Advocacy Agreement", "Student Setup", "Upload Current IEP", "Advocacy Intake", "Schedule Strategy Call"]
    }
  },
  {
    id: "persona-active",
    name: "David & Rachel Miller (Active Client)",
    email: "rachel.miller@example.com",
    state: "ACTIVE",
    stageName: "13 · Active Advocacy",
    studentsCount: 1,
    students: [
      {
        name: "Ethan Miller",
        grade: "5th Grade",
        school: "Alpharetta Elementary",
        iepStatus: "Active IEP Revision in Progress"
      }
    ],
    activeCase: {
      caseTitle: "Ethan Miller — 2026 Comprehensive IEP Revision",
      focus: "Reading Specialized Instruction (Orton-Gillingham) & 1:1 Paraprofessional Support",
      nextMeeting: "IEP Annual Review — Thursday, Oct 8 @ 10:00 AM",
      recentDocument: "2026_Ethan_Miller_Psych_Eval_Reviewed.pdf"
    }
  },
  {
    id: "persona-closing",
    name: "Patricia Thornton (Resolved Client)",
    email: "patricia.t@example.com",
    state: "CLOSING",
    stageName: "14 · Closing / Inactive Client",
    studentsCount: 1,
    students: [
      {
        name: "Lucas Thornton",
        grade: "8th Grade",
        school: "Roswell Middle School",
        iepStatus: "IEP Successfully Amended & Implemented"
      }
    ]
  }
];
