export interface CallFlowStep {
  id: string;
  title: string;
  description: string;
  instructions: string[];
  suggestedPhrasing?: string;
  whatNotToPromise?: string;
  quickActions?: Array<{
    label: string;
    actionType: "link" | "modal";
    path?: string;
    getPath?: (call: any) => string;
  }>;
}

export interface CallFlowDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  badgeColor: string;
  steps: CallFlowStep[];
  guide: {
    overview: string;
    questionsToAsk: string[];
    informationToCollect: string[];
    howToExplain: string;
    pricingGuidance?: string;
    whatNotToPromise: string[];
    escalationTriggers: string[];
    closingSteps: string[];
  };
}

export const CALL_FLOWS: Record<string, CallFlowDefinition> = {
  "New Lead / Sales": {
    id: "new-lead-sales",
    name: "New Lead / Sales",
    category: "Intake",
    description: "Inbound prospective client seeking special education advocacy or IEP consulting.",
    badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    steps: [
      {
        id: "step-1",
        title: "Identify Caller & Student",
        description: "Verify parent's name, phone, email, and the student's name, grade, and school district.",
        instructions: [
          "Confirm spelling of parent's name and student's name.",
          "Check preferred contact number and email for follow-up documentation.",
          "Note the school district (e.g., Cobb County, Fulton County, Atlanta Public Schools).",
        ],
        suggestedPhrasing:
          "“Thank you for calling Waypoint Advocates. My name is Wyatt. Who am I speaking with today, and who is the student we'll be discussing?”",
        whatNotToPromise: "Do not promise school placement or guaranteed service hours on the initial intake call.",
      },
      {
        id: "step-2",
        title: "Understand Reason for Inquiry",
        description: "Determine the primary issue (IEP dispute, 504 plan, evaluation refusal, discipline, etc.).",
        instructions: [
          "Ask what triggered their call today (upcoming meeting, denied evaluation, incident).",
          "Identify if there is an active deadline (e.g. 10-day notice, manifestation hearing).",
          "Select the core issue chips in the Lead Form below.",
        ],
        suggestedPhrasing:
          "“What has been happening at school that prompted you to reach out to us today? Is there an upcoming meeting or urgent deadline?”",
      },
      {
        id: "step-3",
        title: "Explain Waypoint & Advocate Model",
        description: "Introduce Byron Honea and Waypoint's student-centered, non-adversarial Master IEP Coach methodology.",
        instructions: [
          "Highlight that Byron is a Master IEP Coach® dedicated to building collaborative school partnerships.",
          "Explain our philosophy: 'People first. Always.'",
          "Clarify our role: Expert advocacy, procedural compliance, document analysis, and meeting presence.",
        ],
        suggestedPhrasing:
          "“At Waypoint Advocates, Byron Honea works alongside families as a Master IEP Coach®. We prepare the data, analyze school evaluations, and attend meetings so your child receives the accommodations they deserve under IDEA.”",
        whatNotToPromise: "Do not give formal legal advice. Clarify that we provide educational advocacy and coaching.",
      },
      {
        id: "step-4",
        title: "Determine Service Fit",
        description: "Assess whether the family needs a Discovery Call, comprehensive IEP review, or meeting representation.",
        instructions: [
          "If early stage: Recommend a 30-minute Discovery Call.",
          "If impending IEP meeting with draft document: Recommend Comprehensive IEP Review & Meeting Attendance.",
          "Check family urgency and schedule.",
        ],
      },
      {
        id: "step-5",
        title: "Review Plan & Pricing",
        description: "Provide transparent investment guidance based on current Waypoint service tiers.",
        instructions: [
          "Quote standard service rates: $250 Discovery Consultation, $750 IEP Comprehensive Audit, or Retainer Packages.",
          "Confirm whether scholarship/sponsor fund support is requested through Giving & Impact.",
        ],
        suggestedPhrasing:
          "“Our initial Discovery Assessment starts at $250, where Byron performs a deep dive into the current IEP and sets your action plan. Does that align with what you're looking for?”",
      },
      {
        id: "step-6",
        title: "Send Agreement or Payment Link",
        description: "Trigger digital contract or invoice link directly from the Call Workspace.",
        instructions: [
          "Use the 'Create Lead' button below to save the lead record.",
          "Optionally generate a Smart File agreement link or payment link.",
        ],
        quickActions: [
          { label: "Open Scheduler", actionType: "link", path: "/scheduler" },
          { label: "View Services Catalog", actionType: "link", path: "/services" },
        ],
      },
      {
        id: "step-7",
        title: "Schedule Discovery Call",
        description: "Book an available calendar slot with Byron Honea for the parent.",
        instructions: [
          "Open the appointment scheduler directly or reserve the selected date/time.",
          "Inform parent that a calendar invite with Zoom/phone details will be dispatched immediately.",
        ],
        quickActions: [
          { label: "Book Discovery Call →", actionType: "link", path: "/scheduler" },
        ],
      },
      {
        id: "step-8",
        title: "Complete Call & Save Record",
        description: "Review final notes, select wrap-up outcome, and complete call to log activity.",
        instructions: [
          "Confirm all phone numbers and emails are accurate.",
          "Select outcome: 'Lead Created' or 'Discovery Scheduled'.",
          "Click Complete Call to finalize.",
        ],
      },
    ],
    guide: {
      overview: "Standard Operating Procedure for new inquiries seeking special education advocacy.",
      questionsToAsk: [
        "What grade is your child in and what school do they attend?",
        "Do they currently have an active IEP, a 504 plan, or are they being evaluated?",
        "When is the next scheduled school meeting or deadline?",
        "Have you received any Prior Written Notice (PWN) from the district?",
        "What is the single biggest struggle your student faces right now?",
      ],
      informationToCollect: [
        "Parent full name, mobile number, primary email",
        "Student full name, age, grade, diagnosis/eligibility category",
        "School district and campus name",
        "Key dispute points (Speech, OT, Behavior, Resource vs Inclusion)",
      ],
      howToExplain:
        "Explain that Waypoint bridges the gap between parents and school districts with data-backed Master IEP coaching, ensuring meetings are productive and focused on measurable goals.",
      pricingGuidance:
        "Discovery Assessment: $250. Comprehensive IEP Audit: $750. Full Case Representation: Retainer based on scope.",
      whatNotToPromise: [
        "Never promise a specific IEP placement or private school voucher.",
        "Never claim to be attorneys or provide formal legal counsel.",
        "Never promise Byron will attend a meeting without checking his calendar availability first.",
      ],
      escalationTriggers: [
        "Emergency Manifestation Determination Review (MDR) within 48 hours.",
        "Imminent expulsion or law enforcement involvement at school.",
        "Parent received formal Notice of Due Process from the school district.",
      ],
      closingSteps: [
        "Summarize next steps clearly for the parent.",
        "Send confirmation email or SMS with scheduler link.",
        "Log the call outcome in Waypoint CRM.",
      ],
    },
  },

  "Current Client": {
    id: "current-client",
    name: "Current Client",
    category: "Client Service",
    description: "Active family calling regarding ongoing advocacy, meeting preparation, or status updates.",
    badgeColor: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    steps: [
      {
        id: "step-1",
        title: "Identify Client & Active Student",
        description: "Search the client database and select the relevant student record.",
        instructions: [
          "Search parent name or phone in the Client Lookup.",
          "If family has multiple students, confirm which child this call concerns.",
          "Review assigned advocate and case status.",
        ],
      },
      {
        id: "step-2",
        title: "Review Case Status & Recent Notes",
        description: "Check the student's recent timeline, open tasks, and upcoming meetings.",
        instructions: [
          "Glance at latest meeting date and active tasks.",
          "Acknowledge recent milestones or document submissions.",
        ],
        quickActions: [
          {
            label: "Open Student Workspace →",
            actionType: "link",
            getPath: (c) => `/students/${c.studentId || c.contactId || ""}`,
          },
          {
            label: "Open Document Vault →",
            actionType: "link",
            getPath: (c) => `/contacts/${c.contactId || ""}?tab=vault`,
          },
        ],
      },
      {
        id: "step-3",
        title: "Address Inquiry & Document Notes",
        description: "Listen to the parent's update and record detailed notes in the live call window.",
        instructions: [
          "Document any new incident, teacher email, or school notice.",
          "Clarify if this requires an immediate advocate callback or appointment.",
        ],
      },
      {
        id: "step-4",
        title: "Action Items & Escalation",
        description: "Determine next step: create task, schedule session, or request advocate callback.",
        instructions: [
          "If advocate review is required, click 'Request Advocate Callback'.",
          "If client wants to schedule prep session, open Scheduler.",
        ],
        quickActions: [
          { label: "Open Scheduler →", actionType: "link", path: "/scheduler" },
          { label: "Open Tasks →", actionType: "link", path: "/tasks" },
        ],
      },
      {
        id: "step-5",
        title: "Wrap Up & Activity Log",
        description: "Complete call and save interaction directly to client timeline.",
        instructions: [
          "Select outcome: 'Client Question Answered' or 'Advocate Callback Requested'.",
          "Ensure follow-up task is assigned if needed.",
        ],
      },
    ],
    guide: {
      overview: "SOP for handling inquiries from active contracted families.",
      questionsToAsk: [
        "How did the recent school meeting go / how has your student been doing this week?",
        "Did the school send the updated draft IEP or Prior Written Notice yet?",
        "Is there a specific document Byron needs to review prior to your next meeting?",
      ],
      informationToCollect: [
        "New school communications or meeting dates",
        "Specific goal progress reports or incident logs",
      ],
      howToExplain:
        "Reassure the parent that Byron and the advocacy team are monitoring their case timeline closely.",
      whatNotToPromise: [
        "Do not promise immediate response within 1 hour unless marked as Urgent.",
        "Do not approve IEP modifications without Byron's sign-off.",
      ],
      escalationTriggers: [
        "School announced sudden change in placement without parent consent.",
        "Student suspended or subjected to emergency seclusion/restraint.",
      ],
      closingSteps: [
        "Confirm assigned tasks and timeline.",
        "Attach call note to student record.",
      ],
    },
  },

  "Advocacy / Case Question": {
    id: "advocacy-case",
    name: "Advocacy / Case Question",
    category: "Advocacy",
    description: "Detailed special education question, IEP dispute, procedural compliance, or case strategy.",
    badgeColor: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
    steps: [
      {
        id: "step-1",
        title: "Select Student & Case File",
        description: "Lock the call to the specific student record to bring up case telemetry.",
        instructions: [
          "Select the student from CRM records.",
          "Check eligibility category (SLD, OHI, Autism, Speech, etc.).",
        ],
        quickActions: [
          {
            label: "Open Student Workspace →",
            actionType: "link",
            getPath: (c) => `/students/${c.studentId || ""}`,
          },
          {
            label: "Open Case Compass →",
            actionType: "link",
            path: "/case-compass",
          },
        ],
      },
      {
        id: "step-2",
        title: "Triage the Advocacy Need",
        description: "Determine whether staff can resolve or if Master IEP Coach review is needed.",
        instructions: [
          "Ask parent to state the exact dilemma.",
          "Check: Can staff handle? Advocate review needed? Callback needed? Urgent?",
          "Record notes under 'What does the client need?'",
        ],
      },
      {
        id: "step-3",
        title: "Check Document & Evaluation Status",
        description: "Verify if latest psychological, speech, OT evaluation or IEP is in the Document Vault.",
        instructions: [
          "If missing new records, prompt parent to upload to portal or email them.",
        ],
        quickActions: [
          {
            label: "Open Document Vault →",
            actionType: "link",
            getPath: (c) => `/contacts/${c.contactId || ""}?tab=vault`,
          },
        ],
      },
      {
        id: "step-4",
        title: "Route or Request Advocate Callback",
        description: "Submit a callback ticket to Byron Honea or assigned advocate with urgency level.",
        instructions: [
          "Click 'Request Advocate Callback'.",
          "Specify Priority: Normal (within 24h), Important (same day), Urgent (immediate).",
        ],
      },
      {
        id: "step-5",
        title: "Wrap Up & Set Follow-Up Task",
        description: "Finalize notes and confirm follow-up expectations with parent.",
        instructions: [
          "Set a task for the team with due date.",
          "Complete call.",
        ],
      },
    ],
    guide: {
      overview: "SOP for triage and routing of complex special education case questions.",
      questionsToAsk: [
        "What is the specific disagreement between you and the IEP team?",
        "Did the school provide Prior Written Notice (PWN) stating their reasons for refusal?",
        "Has an Independent Educational Evaluation (IEE) been requested or conducted?",
      ],
      informationToCollect: [
        "Exact dates of upcoming IEP team meetings",
        "Document titles parent is referencing",
      ],
      howToExplain:
        "Explain that special education law (IDEA) requires decisions to be individualized and data-driven, not based on district convenience or staffing.",
      whatNotToPromise: [
        "Never promise that the school district will pay for private placement.",
      ],
      escalationTriggers: [
        "IEP meeting scheduled within the next 48 hours.",
        "School refusal to evaluate under Child Find.",
      ],
      closingSteps: [
        "Log full notes to student timeline.",
        "Notify assigned advocate.",
      ],
    },
  },

  "Scheduling": {
    id: "scheduling",
    name: "Scheduling",
    category: "Operations",
    description: "Caller requesting to book, reschedule, or cancel a consultation or meeting.",
    badgeColor: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    steps: [
      {
        id: "step-1",
        title: "Identify Appointment Type",
        description: "Confirm whether caller wants Discovery Call, IEP Prep Session, or meeting attendance.",
        instructions: [
          "Verify caller contact details.",
          "Check existing calendar for prior scheduled bookings.",
        ],
        quickActions: [
          { label: "Open Scheduler →", actionType: "link", path: "/scheduler" },
          { label: "Open Calendar →", actionType: "link", path: "/calendar" },
        ],
      },
      {
        id: "step-2",
        title: "Check Advocate Availability",
        description: "View Byron's open calendar slots in the CRM Scheduler.",
        instructions: [
          "Propose 2-3 available date/time windows.",
          "Confirm time zone (default Eastern Time / Atlanta).",
        ],
      },
      {
        id: "step-3",
        title: "Confirm Booking & Send Invite",
        description: "Lock in the slot and dispatch calendar confirmation.",
        instructions: [
          "Verify video meeting link or dial-in phone preference.",
        ],
      },
      {
        id: "step-4",
        title: "Wrap Up Call",
        description: "Log appointment scheduled in call wrap-up.",
        instructions: [
          "Select outcome 'Appointment Scheduled'.",
          "Complete call.",
        ],
      },
    ],
    guide: {
      overview: "Standard operating procedure for managing appointments.",
      questionsToAsk: [
        "Are you scheduling a discovery consultation or an IEP meeting prep session?",
        "What days and times of day generally work best for your schedule?",
      ],
      informationToCollect: [
        "Client time zone",
        "Key topics to prepare for the session",
      ],
      howToExplain:
        "All appointments include calendar invitations with direct video and phone dial-in details.",
      whatNotToPromise: [
        "Do not overbook advocate when calendar shows blocked slots.",
      ],
      escalationTriggers: ["School changed meeting time on short notice."],
      closingSteps: ["Verify invitation received.", "Complete call."],
    },
  },

  "Billing": {
    id: "billing",
    name: "Billing",
    category: "Financial",
    description: "Questions regarding invoices, payment links, retainers, receipts, or scholarship funds.",
    badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    steps: [
      {
        id: "step-1",
        title: "Locate Client Account & Invoices",
        description: "Pull up the client's financial profile and recent invoice records.",
        instructions: [
          "Search client name or account ID.",
          "Open Invoices page to inspect balance, paid invoices, and pending drafts.",
        ],
        quickActions: [
          { label: "Open Invoices →", actionType: "link", path: "/invoices" },
          { label: "Open Contracts →", actionType: "link", path: "/contracts" },
        ],
      },
      {
        id: "step-2",
        title: "Review Invoice Details",
        description: "Address questions regarding hourly rates, retainer draws, or payment methods.",
        instructions: [
          "Explain charges clearly.",
          "If payment link needed, copy from invoice record.",
        ],
      },
      {
        id: "step-3",
        title: "Process Payment or Note Dispute",
        description: "Assist client with paying online via Stripe or document billing dispute.",
        instructions: [
          "Confirm transaction receipt was delivered to client email.",
        ],
      },
      {
        id: "step-4",
        title: "Wrap Up & Financial Log",
        description: "Record outcome ('Payment Link Sent' or 'Client Question Answered').",
        instructions: ["Complete call."],
      },
    ],
    guide: {
      overview: "SOP for billing, receipts, retainer questions, and invoice management.",
      questionsToAsk: [
        "Are you inquiring about an existing invoice or looking to pay for a new service?",
        "Would you like me to resend the secure online payment link to your email or mobile?",
      ],
      informationToCollect: ["Invoice number", "Billing email address"],
      howToExplain:
        "Waypoint uses secure Stripe payment links. We accept all major credit cards, ACH, and approved educational scholarship funds.",
      whatNotToPromise: [
        "Do not waive fees or alter retainer agreements without Byron's authorization.",
      ],
      escalationTriggers: ["Billing dispute or disputed credit card charge."],
      closingSteps: ["Record transaction details.", "Complete call."],
    },
  },

  "School / Provider": {
    id: "school-provider",
    name: "School / Provider",
    category: "External Partner",
    description: "School district representative, teacher, psychologist, therapist, or legal counsel calling.",
    badgeColor: "bg-teal-500/15 text-teal-400 border-teal-500/30",
    steps: [
      {
        id: "step-1",
        title: "Identify Caller Organization & Role",
        description: "Verify caller name, school/district, professional role, and student concerned.",
        instructions: [
          "Confirm exact school campus and district.",
          "Confirm student name and date of birth.",
        ],
      },
      {
        id: "step-2",
        title: "Verify FERPA / Consent on File",
        description: "CRITICAL: Ensure parent has an active signed Consent / Release of Information in Document Vault.",
        instructions: [
          "Open Student Workspace to check FERPA release tag.",
          "If no release is on file, politely inform caller that we cannot disclose or discuss student records without written parental authorization.",
        ],
        quickActions: [
          {
            label: "Check Student Vault →",
            actionType: "link",
            getPath: (c) => `/contacts/${c.contactId || ""}?tab=vault`,
          },
        ],
        whatNotToPromise: "NEVER discuss confidential student IEP data without confirming signed FERPA release.",
      },
      {
        id: "step-3",
        title: "Document Meeting Notice or Request",
        description: "Record meeting proposed dates, draft delivery notifications, or evaluation updates.",
        instructions: [
          "Log proposed dates into call notes.",
          "Ask caller to send formal notice via email to clientcare@waypointadvocates.com.",
        ],
      },
      {
        id: "step-4",
        title: "Route to Lead Advocate",
        description: "Create an alert task for Byron Honea with the school district's request.",
        instructions: [
          "Tag task as 'School Communication'.",
          "Include caller contact info and deadline.",
        ],
      },
      {
        id: "step-5",
        title: "Wrap Up Call",
        description: "Complete call and save interaction log attached to student file.",
        instructions: [
          "Select outcome 'School/Provider Communication'.",
          "Complete call.",
        ],
      },
    ],
    guide: {
      overview: "SOP for interacting with school districts, evaluators, therapists, and outside professionals.",
      questionsToAsk: [
        "What school or clinic are you calling from?",
        "What student is this concerning?",
        "Is there an upcoming meeting notice or evaluation draft being transmitted?",
      ],
      informationToCollect: [
        "Caller full title and direct callback number",
        "Proposed meeting times and attendees",
      ],
      howToExplain:
        "Explain that Waypoint Advocates represents the family and coordinates all IEP correspondence directly through the student's case advocate.",
      whatNotToPromise: [
        "NEVER waive statutory timeline notice on behalf of a family over the phone.",
        "NEVER agree to IEP changes verbally without written client approval.",
      ],
      escalationTriggers: [
        "District legal counsel calling.",
        "Emergency disciplinary or placement meeting notice.",
      ],
      closingSteps: ["Verify FERPA compliance.", "Notify advocate immediately.", "Complete call."],
    },
  },

  "Portal / Technical Support": {
    id: "portal-tech",
    name: "Portal / Technical Support",
    category: "Technical",
    description: "Client or partner experiencing trouble accessing the Client Portal, uploading records, or viewing files.",
    badgeColor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    steps: [
      {
        id: "step-1",
        title: "Identify User Account",
        description: "Verify client email and portal access permissions.",
        instructions: [
          "Confirm client email address.",
          "Verify user exists in Clerk auth or Client Portal directory.",
        ],
      },
      {
        id: "step-2",
        title: "Diagnose Technical Issue",
        description: "Identify whether issue is login, document upload, smart file signature, or permissions.",
        instructions: [
          "Ask what device and browser they are using.",
          "Check if they received magic login link or password reset.",
        ],
      },
      {
        id: "step-3",
        title: "Guide Client to Resolution",
        description: "Provide step-by-step instructions to access portal.",
        instructions: [
          "Provide portal direct link: /portal.",
          "If uploading documents fails, offer direct upload helper or email submission.",
        ],
      },
      {
        id: "step-4",
        title: "Wrap Up & Follow-Up",
        description: "Ensure client is successfully logged in before completing call.",
        instructions: ["Select outcome 'Client Question Answered'.", "Complete call."],
      },
    ],
    guide: {
      overview: "SOP for troubleshooting client portal login, document uploading, and smart files.",
      questionsToAsk: [
        "What error message are you seeing on screen?",
        "Are you accessing the portal on a smartphone or computer?",
      ],
      informationToCollect: ["Browser (Chrome, Safari, Edge)", "Operating system"],
      howToExplain:
        "The Waypoint Client Portal is encrypted and secure, allowing you to access IEP drafts, meeting notes, and upload psychological records directly.",
      whatNotToPromise: ["Never give out internal API credentials or bypass FERPA protections."],
      escalationTriggers: ["Widespread portal outage or corrupted file upload."],
      closingSteps: ["Verify login.", "Complete call."],
    },
  },

  "Complaint / Escalation": {
    id: "complaint-escalation",
    name: "Complaint / Escalation",
    category: "Priority",
    description: "Frustrated client, urgent school violation, or service quality concern requiring leadership escalation.",
    badgeColor: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    steps: [
      {
        id: "step-1",
        title: "Listen Actively & De-escalate",
        description: "Hear the caller's concern completely without interrupting.",
        instructions: [
          "Maintain a calm, empathetic, and professional tone.",
          "Validate their frustration: 'I understand how critical this is for your family.'",
        ],
        suggestedPhrasing:
          "“I hear you, and I understand why you're frustrated. Let me document everything you're telling me so Byron and our senior team can address this immediately.”",
        whatNotToPromise: "Do not place blame or make defensive statements.",
      },
      {
        id: "step-2",
        title: "Document Root Cause in Detail",
        description: "Record precise facts: what occurred, when, who was involved, and current impact.",
        instructions: [
          "Capture specific dates and names.",
          "Determine if this is an internal CRM/communication issue or an urgent school district violation.",
        ],
      },
      {
        id: "step-3",
        title: "Immediate Leadership Escalation",
        description: "Flag Byron Honea with an URGENT alert and immediate callback requirement.",
        instructions: [
          "Click 'Request Advocate Callback' with Priority set to 'Urgent'.",
          "Provide best phone number and time window.",
        ],
      },
      {
        id: "step-4",
        title: "Provide Clear Next Steps",
        description: "Inform caller exactly when Byron will follow up.",
        instructions: [
          "Give realistic commitment: 'Byron will review this file and reach out personally within 2 hours.'",
        ],
      },
      {
        id: "step-5",
        title: "Wrap Up & High-Priority Task",
        description: "Complete call with outcome 'Advocate Callback Requested'.",
        instructions: ["Complete call."],
      },
    ],
    guide: {
      overview: "High-priority SOP for de-escalating customer complaints and urgent emergencies.",
      questionsToAsk: [
        "Can you walk me through exactly what happened?",
        "What is the most urgent issue that needs to be addressed today?",
      ],
      informationToCollect: [
        "Detailed timeline of events",
        "Personnel involved",
        "Direct callback number with best availability",
      ],
      howToExplain:
        "Reassure the caller that leadership takes every concern seriously and that Byron will intervene directly.",
      whatNotToPromise: [
        "Do not promise financial refunds or legal outcomes on the spot.",
      ],
      escalationTriggers: [
        "Any caller expressing severe distress or threatening legal action.",
        "School physical altercation or law enforcement involvement.",
      ],
      closingSteps: [
        "Send urgent Slack/email notification to Byron.",
        "Log interaction to CRM with high priority.",
      ],
    },
  },

  "General Question": {
    id: "general-question",
    name: "General Question",
    category: "General",
    description: "General questions about Waypoint Advocates, special education laws, or community resources.",
    badgeColor: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    steps: [
      {
        id: "step-1",
        title: "Understand Inquiry",
        description: "Listen to the caller's general question and determine relevant resources.",
        instructions: ["Record caller name and phone number."],
      },
      {
        id: "step-2",
        title: "Provide Accurate Information",
        description: "Answer questions using Waypoint Knowledge Base and service information.",
        instructions: [
          "Offer relevant guides or recommend a 30-minute Discovery Call if individualized support is needed.",
        ],
        quickActions: [
          { label: "Open Knowledge Base →", actionType: "link", path: "/knowledge-base" },
        ],
      },
      {
        id: "step-3",
        title: "Wrap Up & Log Interaction",
        description: "Record call outcome and complete.",
        instructions: ["Complete call."],
      },
    ],
    guide: {
      overview: "SOP for general community and public information inquiries.",
      questionsToAsk: ["How did you hear about Waypoint Advocates?"],
      informationToCollect: ["Caller name and contact details"],
      howToExplain: "Provide high-level educational information and invite them to explore our resources.",
      whatNotToPromise: ["Do not provide case-specific legal interpretation over general inquiry calls."],
      escalationTriggers: ["If inquiry evolves into an active IEP dispute, transition to New Lead flow."],
      closingSteps: ["Log call outcome."],
    },
  },

  "Other": {
    id: "other",
    name: "Other",
    category: "General",
    description: "Uncategorized incoming or outbound communication.",
    badgeColor: "bg-slate-600/15 text-slate-400 border-slate-600/30",
    steps: [
      {
        id: "step-1",
        title: "Document Contact & Purpose",
        description: "Identify caller identity, affiliation, and objective of the call.",
        instructions: ["Record notes in the live call window."],
      },
      {
        id: "step-2",
        title: "Take Necessary Action",
        description: "Follow up, assign task, or transfer if applicable.",
        instructions: ["Create task if team follow-up is required."],
      },
      {
        id: "step-3",
        title: "Complete Call",
        description: "Select outcome and complete interaction.",
        instructions: ["Complete call."],
      },
    ],
    guide: {
      overview: "Standard operating procedure for miscellaneous calls.",
      questionsToAsk: ["How can Waypoint Advocates assist you today?"],
      informationToCollect: ["Caller name, company/school, phone, email"],
      howToExplain: "Explain our advocacy model and direct to appropriate staff.",
      whatNotToPromise: ["No unauthorized commitments."],
      escalationTriggers: ["High-urgency student issues."],
      closingSteps: ["Complete call."],
    },
  },
};

export const CALL_TYPES_LIST = Object.keys(CALL_FLOWS);
