import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  Sparkles,
  Clock,
  Mail,
  FileText,
  CheckSquare,
  Plus,
  Play,
  Layers,
  CheckCircle2,
  Lightbulb,
  Wand2,
  ArrowRight,
  Search,
  Filter,
  History,
  Send,
  Loader2,
  FolderKanban,
  ShieldAlert,
  Calendar,
  Star,
  BookOpen,
} from "lucide-react";
import {
  AutomationStatsBanner,
  AutomationExecutionLedger,
  getRunStatusBadge,
} from "@/components/automations/AutomationExecutionLedger";

export interface HubAutomationStep {
  id: string;
  type: "email" | "file" | "task";
  title: string;
  delayValue: number;
  delayUnit: "minutes" | "hours" | "days" | "weeks";
  delayAnchor: "after_trigger" | "after_prev" | "before_event" | "after_event";
  config: {
    templateId?: string;
    templateName?: string;
    emailSubject?: string;
    emailBody?: string;
    fileId?: string;
    fileName?: string;
    notifyParentByEmail?: boolean;
    taskTitle?: string;
    taskAssignee?: string;
    taskPriority?: "low" | "medium" | "high";
    createImmediateTaskWithDueDate?: boolean;
    hasCondition?: boolean;
    conditionField?: string;
    conditionOperator?: string;
    conditionValue?: string;
  };
}

export interface HubAutomationTemplate {
  id: string;
  name: string;
  category:
    | "Intake & Discovery"
    | "IEP Meeting Prep"
    | "Post-Meeting & PWN"
    | "Proposals & Billing"
    | "Reviews & Retention";
  description: string;
  impactBadge: string;
  triggerEvent: string;
  triggerLabel: string;
  triggerConfig?: {
    meetingType?: string;
    projectDateSource?: "appointment_date" | "next_iep_date";
    googleReviewUrl?: string;
    pastScheduledPolicy?: "skip_past_steps" | "run_immediately";
  };
  steps: HubAutomationStep[];
}

export const PREMADE_AUTOMATION_TEMPLATES: HubAutomationTemplate[] = [
  {
    id: "tpl-discovery-intake",
    name: "New Family Inquiry → Discovery Call & Intake Pack",
    category: "Intake & Discovery",
    description:
      "Immediately welcomes inquiring families, assigns the Confidential Student Intake Smart File in the Parent Portal, and creates a 24-hour advocate triage task.",
    impactBadge: "Saves ~45 mins per lead",
    triggerEvent: "inquiry_received",
    triggerLabel: "When an inquiry is received (Lead Form)",
    triggerConfig: { pastScheduledPolicy: "skip_past_steps" },
    steps: [
      {
        id: "step-1",
        type: "email",
        title: "Send Lead Inquiry Welcome & Discovery Guide",
        delayValue: 0,
        delayUnit: "minutes",
        delayAnchor: "after_trigger",
        config: {
          templateId: "tpl_intake_welcome",
          templateName: "Lead Inquiry Welcome & Discovery Guide",
          emailSubject:
            "We received your inquiry for {{studentName}} — Next Steps with Waypoint Advocates",
        },
      },
      {
        id: "step-2",
        type: "file",
        title: "Assign Student History & IEP Upload Smart File",
        delayValue: 15,
        delayUnit: "minutes",
        delayAnchor: "after_trigger",
        config: {
          fileId: "1",
          fileName: "Intake Questionnaire & IEP Records Upload",
          notifyParentByEmail: true,
        },
      },
      {
        id: "step-3",
        type: "task",
        title: "Triage Family Inquiry & Review District Urgency",
        delayValue: 1,
        delayUnit: "days",
        delayAnchor: "after_trigger",
        config: {
          taskTitle: "Triage family inquiry & verify upcoming IEP dates for {{studentName}}",
          taskAssignee: "Lead Special Education Advocate (Byron)",
          taskPriority: "high",
          createImmediateTaskWithDueDate: true,
        },
      },
    ],
  },
  {
    id: "tpl-contract-onboarding",
    name: "Signed Advocacy Agreement → Full Case Onboarding",
    category: "Intake & Discovery",
    description:
      "Triggers the moment a family signs their Advocacy Retainer Agreement: sends welcome confirmation, assigns FERPA Release & Records Smart File, and schedules the Initial Audit.",
    impactBadge: "Zero-drop-off onboarding",
    triggerEvent: "contract_completed",
    triggerLabel: "When a contract is completed (Signed by Client)",
    triggerConfig: { pastScheduledPolicy: "run_immediately" },
    steps: [
      {
        id: "step-1",
        type: "email",
        title: "Send Signed Agreement Welcome & Portal Orientation",
        delayValue: 0,
        delayUnit: "minutes",
        delayAnchor: "after_trigger",
        config: {
          templateId: "tpl_contract_thanks",
          templateName: "Signed Contract Confirmation",
          emailSubject:
            "Welcome aboard! Your signed agreement for {{studentName}} is confirmed",
        },
      },
      {
        id: "step-2",
        type: "file",
        title: "Assign FERPA Consent & Prior Evaluations Smart File",
        delayValue: 1,
        delayUnit: "hours",
        delayAnchor: "after_trigger",
        config: {
          fileId: "2",
          fileName: "FERPA Release & Comprehensive Records Checklist",
          notifyParentByEmail: true,
        },
      },
      {
        id: "step-3",
        type: "task",
        title: "Complete Deep Baseline IEP & Evaluation Audit",
        delayValue: 3,
        delayUnit: "days",
        delayAnchor: "after_trigger",
        config: {
          taskTitle: "Complete Baseline IEP & Evaluation Audit for {{studentName}}",
          taskAssignee: "Lead Special Education Advocate (Byron)",
          taskPriority: "high",
          createImmediateTaskWithDueDate: true,
        },
      },
    ],
  },
  {
    id: "tpl-pre-iep-countdown",
    name: "7-Day & 48-Hour Pre-IEP Meeting Strategy Countdown",
    category: "IEP Meeting Prep",
    description:
      "Anchors to the scheduled IEP Meeting date: sends the Parent Goal & Concern Formulation Guide 7 days prior, assigns the Parent Vision Statement Smart File, and locks in final talking points 48 hours before.",
    impactBadge: "100% meeting readiness",
    triggerEvent: "before_meeting_ starts",
    triggerLabel: "Before a meeting starts (Countdown to Scheduled Time)",
    triggerConfig: {
      meetingType: "Any Meeting",
      pastScheduledPolicy: "skip_past_steps",
    },
    steps: [
      {
        id: "step-1",
        type: "email",
        title: "Send 7-Day Parent Goal & Concern Formulation Guide",
        delayValue: 7,
        delayUnit: "days",
        delayAnchor: "before_event",
        config: {
          templateId: "iep-parent-prep",
          templateName: "IEP Prep: Parent Goal Formulation Guide",
          emailSubject:
            "1 Week Until {{studentName}}'s IEP Meeting — Parent Vision & Priority Checklist",
        },
      },
      {
        id: "step-2",
        type: "file",
        title: "Assign Parent Concerns Agenda Builder Smart File",
        delayValue: 5,
        delayUnit: "days",
        delayAnchor: "before_event",
        config: {
          fileId: "3",
          fileName: "Parent Input & IEP Agenda Priority Worksheet",
          notifyParentByEmail: true,
        },
      },
      {
        id: "step-3",
        type: "task",
        title: "Finalize IEP Comparator Delta Brief & Blueprint",
        delayValue: 2,
        delayUnit: "days",
        delayAnchor: "before_event",
        config: {
          taskTitle:
            "Finalize IEP Comparator Delta Brief & Meeting Blueprint for {{studentName}}",
          taskAssignee: "Lead Special Education Advocate (Byron)",
          taskPriority: "high",
          createImmediateTaskWithDueDate: true,
        },
      },
    ],
  },
  {
    id: "tpl-post-iep-pwn-audit",
    name: "Post-IEP Meeting PWN & 10-Day District Accountability Sequence",
    category: "Post-Meeting & PWN",
    description:
      "Runs automatically after an IEP session concludes: sends parent debrief summary, schedules a 5-day check for the school's Prior Written Notice (PWN), and creates an advocate PWN Decoder audit task.",
    impactBadge: "Protects procedural safeguards",
    triggerEvent: "after_meeting_ends",
    triggerLabel: "After a meeting ends (Scheduled Session Concludes)",
    triggerConfig: {
      meetingType: "Any Meeting",
      pastScheduledPolicy: "skip_past_steps",
    },
    steps: [
      {
        id: "step-1",
        type: "email",
        title: "Send Post-Meeting Debrief & PWN Watch Checklist",
        delayValue: 2,
        delayUnit: "hours",
        delayAnchor: "after_event",
        config: {
          templateId: "pwn-review",
          templateName: "Post-IEP: PWN Document Review Checklist",
          emailSubject:
            "Post-IEP Debrief for {{studentName}} & What to Watch for in the District's PWN",
        },
      },
      {
        id: "step-2",
        type: "file",
        title: "Assign Post-Meeting PWN & Final Draft Upload Smart File",
        delayValue: 3,
        delayUnit: "days",
        delayAnchor: "after_event",
        config: {
          fileId: "4",
          fileName: "Prior Written Notice (PWN) & Final Proposed IEP Upload",
          notifyParentByEmail: true,
        },
      },
      {
        id: "step-3",
        type: "task",
        title: "Run PWN Decoder & Verify All Agreed Accommodations",
        delayValue: 7,
        delayUnit: "days",
        delayAnchor: "after_event",
        config: {
          taskTitle:
            "Audit District PWN against Meeting Recording & Blueprint for {{studentName}}",
          taskAssignee: "Lead Special Education Advocate (Byron)",
          taskPriority: "high",
          createImmediateTaskWithDueDate: true,
        },
      },
    ],
  },
  {
    id: "tpl-proposal-followup",
    name: "14-Day Advocacy Proposal & Retainer Follow-Up Cadence",
    category: "Proposals & Billing",
    description:
      "When a custom Advocacy Proposal is sent after a Discovery Call, follows up warmly at Day 2 and Day 5, and alerts the advocate at Day 10 before the proposal expires.",
    impactBadge: "+32% proposal conversion",
    triggerEvent: "proposal_submitted",
    triggerLabel: "When a proposal is submitted (Sent to Family)",
    triggerConfig: { pastScheduledPolicy: "skip_past_steps" },
    steps: [
      {
        id: "step-1",
        type: "email",
        title: "Send 48-Hour Proposal Check-In & Q&A Offer",
        delayValue: 2,
        delayUnit: "days",
        delayAnchor: "after_trigger",
        config: {
          templateId: "welcome-email",
          templateName: "Advocate Welcome & Calendar Invite",
          emailSubject:
            "Checking in on {{studentName}}'s Advocacy Plan Proposal — Any questions?",
          emailBody:
            "Hi {{parentName}},\n\nI wanted to follow up on the custom IEP Advocacy Plan we prepared for {{studentName}} after our Discovery Consultation.\n\nIf you have any questions about the recommended scope, timeline, or upcoming district deadlines, reply directly here and I will be glad to help.\n\nWarmly,\nByron Honea\nLead Special Education Advocate\nWaypoint Advocates",
        },
      },
      {
        id: "step-2",
        type: "task",
        title: "Personal Phone/SMS Touchpoint on Open Proposal",
        delayValue: 5,
        delayUnit: "days",
        delayAnchor: "after_trigger",
        config: {
          taskTitle: "Call/text {{parentName}} regarding open Advocacy Proposal for {{studentName}}",
          taskAssignee: "Lead Special Education Advocate (Byron)",
          taskPriority: "medium",
          createImmediateTaskWithDueDate: true,
        },
      },
    ],
  },
  {
    id: "tpl-first-payment-receipt",
    name: "First Retainer Payment Received → Billing Confirmation & Kickoff",
    category: "Proposals & Billing",
    description:
      "Fires once on a family's first payment: sends an official receipt acknowledgement and creates an internal task to unlock the full Student Workspace.",
    impactBadge: "Instant financial peace of mind",
    triggerEvent: "first_payment_paid",
    triggerLabel: "When first payment is paid (Initial Deposit / Retainer)",
    triggerConfig: { pastScheduledPolicy: "run_immediately" },
    steps: [
      {
        id: "step-1",
        type: "email",
        title: "Send Retainer Receipt & Case Kickoff Confirmation",
        delayValue: 0,
        delayUnit: "minutes",
        delayAnchor: "after_trigger",
        config: {
          templateId: "tpl_contract_thanks",
          templateName: "Signed Contract Confirmation",
          emailSubject:
            "Retainer Payment Confirmed — {{studentName}}'s Advocacy Workspace is Active",
        },
      },
      {
        id: "step-2",
        type: "task",
        title: "Activate Full Student Dossier & Schedule Strategy Session",
        delayValue: 2,
        delayUnit: "hours",
        delayAnchor: "after_trigger",
        config: {
          taskTitle:
            "Verify portal access & send Strategy Session booking link for {{studentName}}",
          taskAssignee: "Client Care Coordinator",
          taskPriority: "high",
          createImmediateTaskWithDueDate: true,
        },
      },
    ],
  },
  {
    id: "tpl-annual-iep-60day",
    name: "60-Day Annual IEP Review Horizon Alert & Evaluation Check",
    category: "IEP Meeting Prep",
    description:
      "Anchored to the student's Next IEP Date: alerts both family and advocate 60 days before the annual review so Independent Educational Evaluations (IEEs) or updated testing can be requested on time.",
    impactBadge: "Never miss an annual deadline",
    triggerEvent: "project_date",
    triggerLabel: "On project date (Scheduled Appointment or Next IEP Date)",
    triggerConfig: {
      projectDateSource: "next_iep_date",
      pastScheduledPolicy: "skip_past_steps",
    },
    steps: [
      {
        id: "step-1",
        type: "email",
        title: "Send 60-Day Annual IEP Horizon Planning Notice",
        delayValue: 8,
        delayUnit: "weeks",
        delayAnchor: "before_event",
        config: {
          templateId: "iep-parent-prep",
          templateName: "IEP Prep: Parent Goal Formulation Guide",
          emailSubject:
            "60-Day Horizon Alert: Preparing for {{studentName}}'s Upcoming Annual IEP Review",
        },
      },
      {
        id: "step-2",
        type: "task",
        title: "Audit Progress Monitoring Data & Recommend Evaluations",
        delayValue: 6,
        delayUnit: "weeks",
        delayAnchor: "before_event",
        config: {
          taskTitle:
            "Review quarterly IEP progress reports & draft pre-meeting evaluation requests for {{studentName}}",
          taskAssignee: "Lead Special Education Advocate (Byron)",
          taskPriority: "high",
          createImmediateTaskWithDueDate: true,
        },
      },
    ],
  },
  {
    id: "tpl-google-review-milestone",
    name: "Milestone Win → Google Review & Family Testimonial Request",
    category: "Reviews & Retention",
    description:
      "Triggered when a case reaches a major advocacy milestone: sends a warm thank-you email with the direct Waypoint Google Review link and assigns the Quick Feedback Smart File.",
    impactBadge: "Grows 5-star family trust",
    triggerEvent: "review_request_point",
    triggerLabel: "When case reaches Review Request Milestone",
    triggerConfig: {
      googleReviewUrl: "https://g.page/r/waypoint-advocates/review",
      pastScheduledPolicy: "run_immediately",
    },
    steps: [
      {
        id: "step-1",
        type: "email",
        title: "Send Warm Milestone Celebration & Google Review Invite",
        delayValue: 0,
        delayUnit: "minutes",
        delayAnchor: "after_trigger",
        config: {
          templateId: "tpl_review_request",
          templateName: "Google Review & Testimonial Request",
          emailSubject:
            "It has been an honor advocating for {{studentName}} — Would you share your experience?",
        },
      },
      {
        id: "step-2",
        type: "file",
        title: "Assign 2-Minute Family Impact Reflection Smart File",
        delayValue: 2,
        delayUnit: "days",
        delayAnchor: "after_trigger",
        config: {
          fileId: "5",
          fileName: "Family Advocacy Experience & Testimonial Survey",
          notifyParentByEmail: false,
        },
      },
    ],
  },
];

export interface SmartSuggestedAutomation {
  id: string;
  title: string;
  problemSolved: string;
  whySuggested: string;
  urgency: "High Impact" | "Compliance Guardrail" | "Time Saver";
  template: HubAutomationTemplate;
}

export const SMART_SUGGESTED_AUTOMATIONS: SmartSuggestedAutomation[] = [
  {
    id: "sug-ferpa-records-escalation",
    title: "10-Day School District FERPA Records Request Follow-Up",
    problemSolved:
      "School districts frequently delay sending cumulative files, raw testing protocols, and discipline logs prior to an IEP meeting.",
    whySuggested:
      "Automatically tracks the 10-day window after a FERPA records request is submitted and prompts the advocate + parent to send a compliance reminder before the 45-day statutory cap.",
    urgency: "Compliance Guardrail",
    template: {
      id: "tpl-ferpa-followup",
      name: "10-Day District FERPA Records Request Tracker",
      category: "IEP Meeting Prep",
      description:
        "Tracks pending school district educational record requests and triggers a 10-day compliance check task + parent update email.",
      impactBadge: "Prevents missing records at IEP table",
      triggerEvent: "form_completed",
      triggerLabel: "When a form is completed (Smart File / Questionnaire)",
      steps: [
        {
          id: "s-1",
          type: "task",
          title: "Verify School District Receipt of FERPA Records Request",
          delayValue: 3,
          delayUnit: "days",
          delayAnchor: "after_trigger",
          config: {
            taskTitle: "Confirm district special ed office logged FERPA request for {{studentName}}",
            taskAssignee: "Client Care Coordinator",
            taskPriority: "medium",
            createImmediateTaskWithDueDate: true,
          },
        },
        {
          id: "s-2",
          type: "task",
          title: "10-Day Escalation: Send District Records Follow-Up Notice",
          delayValue: 10,
          delayUnit: "days",
          delayAnchor: "after_trigger",
          config: {
            taskTitle:
              "Send 10-Day FERPA Compliance Follow-Up to Special Education Director for {{studentName}}",
            taskAssignee: "Lead Special Education Advocate (Byron)",
            taskPriority: "high",
            createImmediateTaskWithDueDate: true,
          },
        },
        {
          id: "s-3",
          type: "email",
          title: "Update Parent on District Records Status",
          delayValue: 10,
          delayUnit: "days",
          delayAnchor: "after_trigger",
          config: {
            templateId: "tpl_prep_checklist",
            templateName: "IEP Meeting Prep Checklist",
            emailSubject: "Status Update: Following up on {{studentName}}'s school records request",
          },
        },
      ],
    },
  },
  {
    id: "sug-discovery-no-show",
    title: "Discovery Call Booked → Instant Prep Brief & 24hr Reminder",
    problemSolved:
      "Parents often arrive at Discovery Consultations unsure which documents to have handy, reducing time spent on strategic guidance.",
    whySuggested:
      "Sends a warm confirmation the moment a Discovery Call is booked and follows up 24 hours prior with a 3-question prep checklist.",
    urgency: "High Impact",
    template: {
      id: "tpl-discovery-prep",
      name: "Discovery Consultation Booked → Prep Sequence",
      category: "Intake & Discovery",
      description:
        "Prepares parents for their Discovery Consultation with an instant confirmation and a 24-hour pre-call checklist.",
      impactBadge: "Higher Discovery-to-Retainer conversion",
      triggerEvent: "session_booked",
      triggerLabel: "When a session is booked (Calendar Appointment Created)",
      triggerConfig: {
        meetingType: "Discovery Consultation",
        pastScheduledPolicy: "skip_past_steps",
      },
      steps: [
        {
          id: "s-1",
          type: "email",
          title: "Send Discovery Consultation Confirmation & What to Bring",
          delayValue: 0,
          delayUnit: "minutes",
          delayAnchor: "after_trigger",
          config: {
            templateId: "tpl_intake_welcome",
            templateName: "Lead Inquiry Welcome & Discovery Guide",
            emailSubject:
              "Confirmed: Your Discovery Consultation for {{studentName}} with Waypoint Advocates",
          },
        },
        {
          id: "s-2",
          type: "task",
          title: "Pre-Call Intake Notes & District Lookup",
          delayValue: 2,
          delayUnit: "hours",
          delayAnchor: "before_event",
          config: {
            taskTitle: "Review intake notes & school district profile before Discovery Call for {{studentName}}",
            taskAssignee: "Lead Special Education Advocate (Byron)",
            taskPriority: "medium",
            createImmediateTaskWithDueDate: true,
          },
        },
      ],
    },
  },
  {
    id: "sug-30day-implementation-check",
    title: "30-Day Post-IEP Accommodation & Service Implementation Check",
    problemSolved:
      "Even after winning strong IEP goals and accommodations at the table, classroom implementation can slip after the first few weeks.",
    whySuggested:
      "Automatically checks in with the family 30 days after the IEP meeting to verify speech/OT minutes and classroom accommodations are being delivered as written.",
    urgency: "Time Saver",
    template: {
      id: "tpl-30day-implementation",
      name: "30-Day Post-IEP Classroom Implementation Audit",
      category: "Post-Meeting & PWN",
      description:
        "30 days after an IEP meeting, sends the parent an implementation check-in email and assigns a quick service-delivery audit form.",
      impactBadge: "Catches district non-compliance early",
      triggerEvent: "after_meeting_ends",
      triggerLabel: "After a meeting ends (Scheduled Session Concludes)",
      steps: [
        {
          id: "s-1",
          type: "email",
          title: "Send 30-Day IEP Implementation & Service Delivery Check-In",
          delayValue: 30,
          delayUnit: "days",
          delayAnchor: "after_event",
          config: {
            templateId: "tpl_post_session",
            templateName: "Post-Meeting Action Items",
            emailSubject:
              "30-Day Check-In: How is {{studentName}}'s new IEP working in the classroom?",
          },
        },
        {
          id: "s-2",
          type: "task",
          title: "Review 30-Day Parent Implementation Feedback",
          delayValue: 33,
          delayUnit: "days",
          delayAnchor: "after_event",
          config: {
            taskTitle:
              "Check 30-day accommodation & service minute compliance for {{studentName}}",
            taskAssignee: "Lead Special Education Advocate (Byron)",
            taskPriority: "medium",
            createImmediateTaskWithDueDate: true,
          },
        },
      ],
    },
  },
];

const AI_BUILDER_PROMPT_EXAMPLES = [
  {
    label: "Signed Contract Onboarding",
    prompt:
      "When a parent signs the contract, send a welcome email immediately, assign the FERPA Release & Intake Questionnaire Smart File after 1 hour, and create a high-priority task for Byron to audit the student's IEP in 3 days.",
  },
  {
    label: "Pre-IEP 7-Day Countdown",
    prompt:
      "7 days before an IEP meeting starts, send the Parent Goal Formulation Guide email, assign the Parent Agenda Smart File 5 days before, and create a high-priority task 2 days before to finalize the IEP Comparator brief.",
  },
  {
    label: "Post-IEP PWN Compliance Audit",
    prompt:
      "After an IEP meeting ends, send a post-meeting debrief email after 2 hours, assign the PWN Upload Smart File after 3 days, and create a high-priority task after 7 days to run the PWN Decoder audit.",
  },
  {
    label: "New Lead Discovery Fast-Track",
    prompt:
      "When a new lead inquiry is received, send the Discovery Welcome email immediately, assign the Student Intake Smart File in 15 minutes, and create a high-priority task in 1 day to call the parent.",
  },
  {
    label: "Proposal 48hr & 5-Day Follow-Up",
    prompt:
      "When a proposal is submitted to a family, wait 2 days and send a friendly proposal Q&A email, then create a medium-priority task after 5 days for Byron to call the family.",
  },
  {
    label: "Milestone 5-Star Review Request",
    prompt:
      "When a case reaches the review request milestone, send the Google Review & Testimonial email immediately and assign the Family Feedback Smart File after 2 days.",
  },
];

export function synthesizeAutomationFromPrompt(promptText: string): HubAutomationTemplate {
  const lower = promptText.toLowerCase();

  let triggerEvent = "inquiry_received";
  let triggerLabel = "When an inquiry is received (Lead Form)";
  let category: HubAutomationTemplate["category"] = "Intake & Discovery";
  let defaultAnchor: HubAutomationStep["delayAnchor"] = "after_trigger";

  if (lower.includes("contract") || lower.includes("retainer") || lower.includes("signed")) {
    triggerEvent = "contract_completed";
    triggerLabel = "When a contract is completed (Signed by Client)";
    category = "Intake & Discovery";
  } else if (lower.includes("before") && (lower.includes("meeting") || lower.includes("iep"))) {
    triggerEvent = "before_meeting_ starts";
    triggerLabel = "Before a meeting starts (Countdown to Scheduled Time)";
    category = "IEP Meeting Prep";
    defaultAnchor = "before_event";
  } else if (
    lower.includes("after") &&
    (lower.includes("meeting") || lower.includes("session") || lower.includes("pwn"))
  ) {
    triggerEvent = "after_meeting_ends";
    triggerLabel = "After a meeting ends (Scheduled Session Concludes)";
    category = "Post-Meeting & PWN";
    defaultAnchor = "after_event";
  } else if (lower.includes("proposal")) {
    triggerEvent = "proposal_submitted";
    triggerLabel = "When a proposal is submitted (Sent to Family)";
    category = "Proposals & Billing";
  } else if (lower.includes("payment") || lower.includes("invoice")) {
    triggerEvent = "first_payment_paid";
    triggerLabel = "When first payment is paid (Initial Deposit / Retainer)";
    category = "Proposals & Billing";
  } else if (lower.includes("review") || lower.includes("testimonial") || lower.includes("google")) {
    triggerEvent = "review_request_point";
    triggerLabel = "When case reaches Review Request Milestone";
    category = "Reviews & Retention";
  } else if (lower.includes("booked") || lower.includes("discovery call")) {
    triggerEvent = "session_booked";
    triggerLabel = "When a session is booked (Calendar Appointment Created)";
    category = "Intake & Discovery";
  }

  const steps: HubAutomationStep[] = [];
  const clauses = promptText
    .split(/(?:,\s*(?:and\s+|then\s+)?|\s+and\s+then\s+|\s+then\s+|\.\s+)/i)
    .map((c) => c.trim())
    .filter((c) => c.length > 6);

  clauses.forEach((clause, idx) => {
    const cl = clause.toLowerCase();
    // Skip pure trigger clauses if there are other action clauses
    if (
      idx === 0 &&
      clauses.length > 1 &&
      (cl.startsWith("when ") || cl.startsWith("if ") || cl.startsWith("once ")) &&
      !cl.includes("send") &&
      !cl.includes("assign") &&
      !cl.includes("create") &&
      !cl.includes("task")
    ) {
      return;
    }

    let delayValue = 0;
    let delayUnit: HubAutomationStep["delayUnit"] = "days";
    let delayAnchor: HubAutomationStep["delayAnchor"] = defaultAnchor;

    if (cl.includes("immediately") || cl.includes("right away") || cl.includes("instant")) {
      delayValue = 0;
      delayUnit = "minutes";
    } else {
      const timeMatch = cl.match(/(\d+)\s*(minute|min|hour|hr|day|week)s?/i);
      if (timeMatch) {
        delayValue = parseInt(timeMatch[1], 10);
        const unitRaw = timeMatch[2].toLowerCase();
        if (unitRaw.startsWith("min")) delayUnit = "minutes";
        else if (unitRaw.startsWith("h")) delayUnit = "hours";
        else if (unitRaw.startsWith("w")) delayUnit = "weeks";
        else delayUnit = "days";
      } else if (steps.length > 0) {
        delayValue = steps.length * 2;
        delayUnit = "days";
      }
    }

    if (cl.includes("before")) delayAnchor = "before_event";
    else if (cl.includes("after") && defaultAnchor === "after_event") delayAnchor = "after_event";

    if (
      cl.includes("smart file") ||
      cl.includes("questionnaire") ||
      cl.includes("upload") ||
      cl.includes("ferpa") ||
      cl.includes("assign")
    ) {
      const isPwn = cl.includes("pwn") || cl.includes("prior written");
      const isFerpa = cl.includes("ferpa") || cl.includes("release");
      const isAgenda = cl.includes("agenda") || cl.includes("goal");
      const fileName = isPwn
        ? "Prior Written Notice (PWN) & Final Draft Upload"
        : isFerpa
          ? "FERPA Release & Comprehensive Records Checklist"
          : isAgenda
            ? "Parent Input & IEP Agenda Priority Worksheet"
            : "Intake Questionnaire & IEP Records Upload";

      steps.push({
        id: `ai-step-${Date.now()}-${idx}`,
        type: "file",
        title: `Assign ${fileName}`,
        delayValue,
        delayUnit,
        delayAnchor,
        config: {
          fileId: isPwn ? "4" : isFerpa ? "2" : isAgenda ? "3" : "1",
          fileName,
          notifyParentByEmail: true,
        },
      });
    } else if (
      cl.includes("task") ||
      cl.includes("audit") ||
      cl.includes("call") ||
      cl.includes("byron") ||
      cl.includes("advocate")
    ) {
      const isHigh = cl.includes("high") || cl.includes("urgent") || cl.includes("audit");
      const cleanedTitle = clause
        .replace(/^(and\s+|then\s+)?(create\s+a\s+(high-priority\s+|medium-priority\s+)?task\s+(for\s+byron\s+)?to\s+)/i, "")
        .replace(/\b(in|after|before)\s+\d+\s*(minute|min|hour|hr|day|week)s?\b/gi, "")
        .trim();
      const taskTitle =
        cleanedTitle.length > 5
          ? cleanedTitle.charAt(0).toUpperCase() + cleanedTitle.slice(1)
          : "Advocate Follow-Up & Case Audit for {{studentName}}";

      steps.push({
        id: `ai-step-${Date.now()}-${idx}`,
        type: "task",
        title: taskTitle.slice(0, 72),
        delayValue: delayValue || 2,
        delayUnit,
        delayAnchor,
        config: {
          taskTitle: `${taskTitle} ({{studentName}})`,
          taskAssignee: "Lead Special Education Advocate (Byron)",
          taskPriority: isHigh ? "high" : "medium",
          createImmediateTaskWithDueDate: true,
        },
      });
    } else {
      const isPrep = cl.includes("prep") || cl.includes("goal") || cl.includes("countdown");
      const isPwn = cl.includes("pwn") || cl.includes("debrief") || cl.includes("post-meeting");
      const isReview = cl.includes("review") || cl.includes("testimonial");
      const templateId = isPrep
        ? "iep-parent-prep"
        : isPwn
          ? "pwn-review"
          : isReview
            ? "tpl_review_request"
            : "welcome-email";
      const emailTitle = isPrep
        ? "Send Pre-IEP Parent Strategy & Goal Guide"
        : isPwn
          ? "Send Post-IEP Debrief & PWN Watch Checklist"
          : isReview
            ? "Send Milestone Celebration & Google Review Invite"
            : "Send Automated Family Update Email";

      steps.push({
        id: `ai-step-${Date.now()}-${idx}`,
        type: "email",
        title: emailTitle,
        delayValue,
        delayUnit,
        delayAnchor,
        config: {
          templateId,
          templateName: emailTitle,
          emailSubject: `${emailTitle.replace(/^Send\s+/i, "")} for {{studentName}}`,
        },
      });
    }
  });

  if (steps.length === 0) {
    steps.push(
      {
        id: `ai-step-1`,
        type: "email",
        title: "Send Automated Family Welcome & Next Steps Email",
        delayValue: 0,
        delayUnit: "minutes",
        delayAnchor: defaultAnchor,
        config: {
          templateId: "welcome-email",
          templateName: "Advocate Welcome & Calendar Invite",
          emailSubject: "Update regarding {{studentName}}'s Advocacy Plan — Waypoint Advocates",
        },
      },
      {
        id: `ai-step-2`,
        type: "file",
        title: "Assign Student Intake & Records Smart File",
        delayValue: 1,
        delayUnit: "hours",
        delayAnchor: defaultAnchor,
        config: {
          fileId: "1",
          fileName: "Intake Questionnaire & IEP Records Upload",
          notifyParentByEmail: true,
        },
      },
      {
        id: `ai-step-3`,
        type: "task",
        title: "Advocate Case Strategy & Document Audit",
        delayValue: 2,
        delayUnit: "days",
        delayAnchor: defaultAnchor,
        config: {
          taskTitle: "Complete IEP & Evaluation Review for {{studentName}}",
          taskAssignee: "Lead Special Education Advocate (Byron)",
          taskPriority: "high",
          createImmediateTaskWithDueDate: true,
        },
      }
    );
  }

  const shortTitle =
    category === "Intake & Discovery"
      ? "AI-Built Family Onboarding & Intake Sequence"
      : category === "IEP Meeting Prep"
        ? "AI-Built Pre-IEP Strategy & Readiness Sequence"
        : category === "Post-Meeting & PWN"
          ? "AI-Built Post-IEP & PWN Accountability Sequence"
          : category === "Proposals & Billing"
            ? "AI-Built Proposal & Retainer Follow-Up Sequence"
            : "AI-Built Milestone Review & Retention Sequence";

  return {
    id: `ai-gen-${Date.now()}`,
    name: shortTitle,
    category,
    description: promptText.trim(),
    impactBadge: "Generated by Waypoint AI Architect",
    triggerEvent,
    triggerLabel,
    triggerConfig: {
      pastScheduledPolicy: "skip_past_steps",
    },
    steps,
  };
}

/* ──────────────────────────────────────────────────────────────────────────
   SECTION 1: PRE-MADE TEMPLATES GALLERY
   ────────────────────────────────────────────────────────────────────────── */
interface PreMadeTemplatesSectionProps {
  onOpenInBuilder: (template: HubAutomationTemplate) => void;
  onInstallTemplate: (template: HubAutomationTemplate, activateNow: boolean) => Promise<void>;
  isSaving: boolean;
}

export function PreMadeTemplatesSection({
  onOpenInBuilder,
  onInstallTemplate,
  isSaving,
}: PreMadeTemplatesSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchText, setSearchText] = useState("");

  const categories = [
    "All",
    "Intake & Discovery",
    "IEP Meeting Prep",
    "Post-Meeting & PWN",
    "Proposals & Billing",
    "Reviews & Retention",
  ];

  const filtered = PREMADE_AUTOMATION_TEMPLATES.filter((tpl) => {
    const matchesCat = selectedCategory === "All" || tpl.category === selectedCategory;
    const matchesSearch =
      !searchText.trim() ||
      tpl.name.toLowerCase().includes(searchText.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchText.toLowerCase()) ||
      tpl.triggerLabel.toLowerCase().includes(searchText.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6 text-left">
      {/* Header Banner */}
      <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#C5A059]" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#FFE394]">
              Waypoint IEP Advocacy Blueprints
            </span>
          </div>
          <h2 className="font-serif text-xl font-bold text-[#FFF4D4]">
            Pre-Made Automation Templates ({PREMADE_AUTOMATION_TEMPLATES.length})
          </h2>
          <p className="text-xs text-[#C6B697] max-w-2xl">
            Battle-tested special education advocacy sequences built for parent intake, FERPA records collection, 7-day IEP meeting countdowns, PWN compliance audits, and retainer follow-ups.
          </p>
        </div>

        {/* Search Input */}
        <div className="flex items-center bg-[#020A17] border border-[#3A2C18] rounded-xl px-3.5 py-2 w-full lg:w-72">
          <Search className="h-3.5 w-3.5 text-[#C5A059] mr-2 shrink-0" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Filter templates..."
            className="bg-transparent border-0 text-xs text-[#FFF4D4] placeholder-[#8CA4C4] focus:outline-none w-full font-serif"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((cat) => {
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-serif font-bold transition-all cursor-pointer border ${
                active
                  ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border-[#FFE394]/60 shadow"
                  : "bg-[#05142B]/80 text-[#C6B697] border-[#3A2C18] hover:text-[#FFF4D4] hover:border-[#C5A059]/50"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Template Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((tpl) => (
          <div
            key={tpl.id}
            className="bg-[#05142B]/90 border border-[#3A2C18] hover:border-[#C5A059]/60 rounded-xl p-5 flex flex-col justify-between gap-4 shadow-[0_8px_24px_rgba(0,0,0,0.85)] transition-all"
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#020A17] border border-[#3A2C18] text-[#FFE394]">
                  {tpl.category}
                </span>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/40 text-emerald-300">
                  {tpl.impactBadge}
                </span>
              </div>

              <div>
                <h3 className="font-serif font-bold text-base text-[#FFF4D4]">
                  {tpl.name}
                </h3>
                <p className="text-xs text-[#C6B697] mt-1 leading-relaxed">
                  {tpl.description}
                </p>
              </div>

              {/* Trigger Badge */}
              <div className="bg-[#020A17]/80 border border-[#3A2C18]/80 rounded-lg px-3 py-2 flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] font-mono text-[#FFE394] truncate">
                  Trigger: {tpl.triggerLabel}
                </span>
              </div>

              {/* Step Sequence Preview */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#A69371] block">
                  Included Workflow Steps ({tpl.steps.length})
                </span>
                {tpl.steps.map((step, i) => (
                  <div
                    key={step.id}
                    className="bg-[#020A17]/60 border border-white/5 rounded-lg px-3 py-2 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono text-[#C5A059] font-bold">
                        {i + 1}.
                      </span>
                      {step.type === "email" && (
                        <Mail className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                      )}
                      {step.type === "file" && (
                        <FileText className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      )}
                      {step.type === "task" && (
                        <CheckSquare className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      )}
                      <span className="text-[#FFF4D4] truncate font-serif text-xs">
                        {step.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[#8CA4C4] shrink-0">
                      {step.delayValue === 0
                        ? "Immediate"
                        : `${step.delayValue} ${step.delayUnit} (${step.delayAnchor.replace("_", " ")})`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#3A2C18]/70 pt-3.5">
              <button
                type="button"
                onClick={() => onOpenInBuilder(tpl)}
                className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] font-serif text-xs font-semibold py-2 px-3.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Wand2 className="h-3.5 w-3.5 text-[#C5A059]" />
                <span>Customize in Builder</span>
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={() => onInstallTemplate(tpl, false)}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-serif font-bold text-xs border border-[#FFE394]/50 shadow hover:brightness-110 py-2 px-3.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add to My Automations</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   SECTION 2: BUILD AUTOMATION WITH AI
   ────────────────────────────────────────────────────────────────────────── */
interface BuildAutomationWithAiSectionProps {
  onOpenInBuilder: (template: HubAutomationTemplate) => void;
  onSaveGenerated: (template: HubAutomationTemplate, activateNow: boolean) => Promise<void>;
  isSaving: boolean;
}

export function BuildAutomationWithAiSection({
  onOpenInBuilder,
  onSaveGenerated,
  isSaving,
}: BuildAutomationWithAiSectionProps) {
  const [promptInput, setPromptInput] = useState(
    AI_BUILDER_PROMPT_EXAMPLES[0].prompt
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFlow, setGeneratedFlow] = useState<HubAutomationTemplate>(() =>
    synthesizeAutomationFromPrompt(AI_BUILDER_PROMPT_EXAMPLES[0].prompt)
  );

  const handleGenerate = (customPrompt?: string) => {
    const text = (customPrompt ?? promptInput).trim();
    if (!text) return;
    setIsGenerating(true);
    setTimeout(() => {
      const built = synthesizeAutomationFromPrompt(text);
      setGeneratedFlow(built);
      setIsGenerating(false);
    }, 280);
  };

  return (
    <div className="space-y-6 text-left">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 6 Cols: Natural Language Prompt Studio */}
        <div className="lg:col-span-6 bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#FFE394]">
                Waypoint AI Workflow Architect
              </span>
            </div>
            <h2 className="font-serif text-xl font-bold text-[#FFF4D4]">
              Build an Automation with AI
            </h2>
            <p className="text-xs text-[#C6B697] leading-relaxed">
              Describe when your workflow should trigger and what emails, Parent Portal Smart Files, or advocate tasks should happen. Waypoint AI converts your plain-English instructions into a multi-step sequence.
            </p>
          </div>

          {/* Prompt Textarea */}
          <div className="space-y-2">
            <label className="text-xs font-serif font-bold text-[#FFE394] block">
              Describe your desired IEP advocacy automation in plain English:
            </label>
            <textarea
              rows={5}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="e.g., When a parent signs the contract, send a welcome email immediately, assign the FERPA Release Smart File after 1 hour, and create a high-priority task for Byron to review records in 3 days..."
              className="w-full bg-[#020A17] border border-[#3A2C18] focus:border-[#C5A059] rounded-xl p-3.5 text-xs text-[#FFF4D4] placeholder-[#647C9D] leading-relaxed font-serif focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] text-[#A69371] font-serif">
              Supports triggers, relative delays, merge tokens, Smart Files &amp; team tasks.
            </span>
            <button
              type="button"
              onClick={() => handleGenerate()}
              disabled={isGenerating || !promptInput.trim()}
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-serif font-bold text-xs border border-[#FFE394]/50 shadow-md hover:brightness-110 py-2.5 px-4 rounded-lg transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              <span>Generate Workflow with AI</span>
            </button>
          </div>

          {/* Quick Example Prompts */}
          <div className="border-t border-[#3A2C18]/70 pt-4 space-y-2.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#FFE394] block">
              One-Click Advocacy Prompt Starters:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AI_BUILDER_PROMPT_EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => {
                    setPromptInput(ex.prompt);
                    handleGenerate(ex.prompt);
                  }}
                  className="text-left p-2.5 rounded-lg bg-[#020A17]/90 border border-[#3A2C18] hover:border-[#C5A059]/60 transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-serif font-bold text-xs text-[#FFF4D4] group-hover:text-[#FFE394]">
                      {ex.label}
                    </span>
                    <ArrowRight className="h-3 w-3 text-[#C5A059] shrink-0" />
                  </div>
                  <p className="text-[10px] text-[#A69371] line-clamp-2 mt-0.5">
                    {ex.prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right 6 Cols: Live AI-Synthesized Sequence Blueprint */}
        <div className="lg:col-span-6 bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#3A2C18]/70 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 block">
                  AI-Synthesized Sequence Preview
                </span>
                <input
                  type="text"
                  value={generatedFlow.name}
                  onChange={(e) =>
                    setGeneratedFlow({ ...generatedFlow, name: e.target.value })
                  }
                  className="bg-transparent border-0 font-serif font-bold text-base text-[#FFF4D4] focus:outline-none w-full mt-0.5"
                />
              </div>
              <Badge className="bg-amber-950/80 border-amber-500/40 text-amber-300 font-mono text-[10px]">
                {generatedFlow.steps.length} Steps Ready
              </Badge>
            </div>

            {/* Synthesized Trigger Node */}
            <div className="bg-[#020A17] border border-amber-500/40 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Zap className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-mono uppercase tracking-widest text-amber-300 block">
                  Detected Trigger Event
                </span>
                <div className="font-serif font-bold text-xs text-[#FFF4D4] truncate">
                  {generatedFlow.triggerLabel}
                </div>
              </div>
            </div>

            {/* Synthesized Action Steps */}
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {generatedFlow.steps.map((step, idx) => (
                <div
                  key={step.id}
                  className="bg-[#020A17]/85 border border-[#3A2C18] rounded-xl p-3.5 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${
                        step.type === "email"
                          ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                          : step.type === "file"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                      }`}
                    >
                      {step.type === "email" && <Mail className="h-4 w-4" />}
                      {step.type === "file" && <FileText className="h-4 w-4" />}
                      {step.type === "task" && <CheckSquare className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-[#C5A059]">
                          Step {idx + 1} ·{" "}
                          {step.type === "email"
                            ? "Automated Email"
                            : step.type === "file"
                              ? "Portal Smart File"
                              : "Advocate Task"}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#05142B] border border-[#3A2C18] text-[#FFE394]">
                          {step.delayValue === 0
                            ? "Immediately"
                            : `${step.delayValue} ${step.delayUnit} (${step.delayAnchor.replace("_", " ")})`}
                        </span>
                      </div>
                      <div className="font-serif font-bold text-xs text-[#FFF4D4] mt-1">
                        {step.title}
                      </div>
                      <div className="text-[11px] text-[#A69371] mt-0.5">
                        {step.type === "email" &&
                          `Subject: ${step.config.emailSubject || step.config.templateName}`}
                        {step.type === "file" &&
                          `Smart File: ${step.config.fileName} (+ Parent Notification)`}
                        {step.type === "task" &&
                          `Assignee: ${step.config.taskAssignee} · Priority: ${(step.config.taskPriority || "high").toUpperCase()}`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Controls: Open in Visual Canvas vs Save Directly */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#3A2C18] pt-4">
            <button
              type="button"
              onClick={() => onOpenInBuilder(generatedFlow)}
              className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] font-serif text-xs font-semibold py-2.5 px-4 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Layers className="h-3.5 w-3.5 text-[#C5A059]" />
              <span>Open in Visual Canvas Builder</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => onSaveGenerated(generatedFlow, false)}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-serif font-bold text-xs border border-[#FFE394]/50 shadow-md hover:brightness-110 py-2.5 px-4 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Save as Draft Automation</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   SECTION 3: SUGGEST AN AUTOMATION (PRACTICE RECOMMENDATIONS + USER REQUESTS)
   ────────────────────────────────────────────────────────────────────────── */
interface SuggestAutomationSectionProps {
  triggerRequests: any[];
  onSubmitSuggestion: (payload: {
    category: string;
    triggerText: string;
    desiredOutcome: string;
  }) => Promise<void>;
  isSubmitting: boolean;
  onOpenTemplateInBuilder: (template: HubAutomationTemplate) => void;
  onInstallTemplate: (template: HubAutomationTemplate, activateNow: boolean) => Promise<void>;
}

export function SuggestAutomationSection({
  triggerRequests,
  onSubmitSuggestion,
  isSubmitting,
  onOpenTemplateInBuilder,
  onInstallTemplate,
}: SuggestAutomationSectionProps) {
  const [category, setCategory] = useState("IEP Compliance & Deadlines");
  const [triggerText, setTriggerText] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!triggerText.trim()) return;
    await onSubmitSuggestion({
      category,
      triggerText: triggerText.trim(),
      desiredOutcome: desiredOutcome.trim(),
    });
    setTriggerText("");
    setDesiredOutcome("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
      {/* Left 7 Cols: Smart Recommended Automations for Waypoint Practice */}
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85)] space-y-1">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#FFE394]">
              Proactive Practice Intelligence
            </span>
          </div>
          <h2 className="font-serif text-xl font-bold text-[#FFF4D4]">
            Suggested Automations for Your Advocacy Practice
          </h2>
          <p className="text-xs text-[#C6B697]">
            Based on common special education procedural bottlenecks (FERPA 45-day record delays, Discovery Consultation prep, and 30-day IEP implementation checks), we recommend activating these sequences:
          </p>
        </div>

        <div className="space-y-4">
          {SMART_SUGGESTED_AUTOMATIONS.map((item) => (
            <div
              key={item.id}
              className="bg-[#05142B]/90 border border-[#3A2C18] hover:border-[#C5A059]/60 rounded-xl p-5 space-y-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.85)] transition-all"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300">
                  {item.urgency}
                </span>
                <span className="text-[10px] font-mono text-[#FFE394] bg-[#020A17] border border-[#3A2C18] px-2.5 py-0.5 rounded">
                  {item.template.steps.length} Automated Steps
                </span>
              </div>

              <div>
                <h3 className="font-serif font-bold text-base text-[#FFF4D4]">
                  {item.title}
                </h3>
                <p className="text-xs text-[#C6B697] mt-1 leading-relaxed">
                  <strong className="text-[#FFE394]">Bottleneck Solved:</strong>{" "}
                  {item.problemSolved}
                </p>
                <p className="text-xs text-[#A69371] mt-1 leading-relaxed">
                  <strong className="text-emerald-300">How It Works:</strong>{" "}
                  {item.whySuggested}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#3A2C18]/70 pt-3">
                <button
                  type="button"
                  onClick={() => onOpenTemplateInBuilder(item.template)}
                  className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] font-serif text-xs font-semibold py-2 px-3.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Wand2 className="h-3.5 w-3.5 text-[#C5A059]" />
                  <span>Preview &amp; Customize</span>
                </button>

                <button
                  type="button"
                  onClick={() => onInstallTemplate(item.template, false)}
                  className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-serif font-bold text-xs border border-[#FFE394]/50 shadow hover:brightness-110 py-2 px-3.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Suggested Automation</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right 5 Cols: Submit a Custom Automation or Trigger Idea */}
      <div className="lg:col-span-5 space-y-5">
        <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-5 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
          <div className="space-y-1 border-b border-[#3A2C18]/70 pb-3">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-[#C5A059]" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#FFE394]">
                Team &amp; Advocate Idea Box
              </span>
            </div>
            <h3 className="font-serif text-lg font-bold text-[#FFF4D4]">
              Suggest an Automation or Trigger
            </h3>
            <p className="text-xs text-[#C6B697]">
              Have an idea for a new workflow trigger or repetitive task you want automated? Submit it below — it saves directly to the Waypoint D1 Automation Roadmap queue.
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-serif font-bold text-[#FFE394] block">
                Workflow Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#020A17] border border-[#3A2C18] rounded-lg p-2.5 text-xs text-[#FFF4D4] font-serif"
              >
                <option value="IEP Compliance & Deadlines">
                  IEP Compliance &amp; Statutory Deadlines
                </option>
                <option value="Lead Intake & Discovery">
                  Lead Intake &amp; Discovery Calls
                </option>
                <option value="Parent Portal & Smart Files">
                  Parent Portal &amp; Smart Files
                </option>
                <option value="Billing, Invoices & Retainers">
                  Billing, Invoices &amp; Retainers
                </option>
                <option value="Post-Meeting PWN & State Complaints">
                  Post-Meeting PWN &amp; State Complaints
                </option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-serif font-bold text-[#FFE394] block">
                When should this automation trigger? (Event / Condition)
              </label>
              <textarea
                required
                rows={3}
                value={triggerText}
                onChange={(e) => setTriggerText(e.target.value)}
                placeholder="e.g., When a school district uploads a Prior Written Notice (PWN) or when 10 school days pass after an IEE request..."
                className="w-full bg-[#020A17] border border-[#3A2C18] rounded-lg p-2.5 text-xs text-[#FFF4D4] placeholder-[#647C9D] font-serif"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-serif font-bold text-[#FFE394] block">
                What actions should happen automatically? (Optional)
              </label>
              <textarea
                rows={2}
                value={desiredOutcome}
                onChange={(e) => setDesiredOutcome(e.target.value)}
                placeholder="e.g., Send parent PWN checklist email and create a high-priority task for Byron..."
                className="w-full bg-[#020A17] border border-[#3A2C18] rounded-lg p-2.5 text-xs text-[#FFF4D4] placeholder-[#647C9D] font-serif"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !triggerText.trim()}
              className="w-full bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-serif font-bold text-xs border border-[#FFE394]/50 shadow-md hover:brightness-110 py-2.5 px-4 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving Suggestion...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Save Automation Suggestion</span>
                </>
              )}
            </button>
          </form>

          {/* Saved Suggestions Queue */}
          <div className="border-t border-[#3A2C18] pt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#FFE394]">
                Submitted Suggestions Queue ({triggerRequests?.length || 0})
              </span>
            </div>

            {!triggerRequests || triggerRequests.length === 0 ? (
              <div className="text-xs text-[#A69371] bg-[#020A17]/60 border border-[#3A2C18]/60 rounded-lg p-4 text-center font-serif">
                No custom suggestions submitted yet. Use the form above to log your first idea.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {triggerRequests.map((req: any) => (
                  <div
                    key={req.id}
                    className="bg-[#020A17]/85 border border-[#3A2C18]/80 rounded-lg p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-[#C5A059]">
                        {req.useCaseCategory || "General"}
                      </span>
                      <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/30 text-amber-300">
                        {req.status || "submitted"}
                      </span>
                    </div>
                    <p className="text-xs text-[#FFF4D4] font-serif">
                      {req.requestedTriggerText || req.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   SECTION 4: DEDICATED EXECUTION HISTORY & DURABLE QUEUE VIEW
   ────────────────────────────────────────────────────────────────────────── */
interface AutomationHistorySectionProps {
  stats: any;
  automationRuns: any[];
  automationJobs: any[];
  onRefresh: () => void;
  onProcessDueJobs: () => void;
  isProcessingJobs: boolean;
  onRetryRun: (runId: number) => void;
  onCancelRun: (runId: number) => void;
  onCancelJob: (jobId: number) => void;
  onResolveHeldJob: (jobId: number, action: "send_now" | "skip") => void;
  isBusy: boolean;
}

export function AutomationHistorySection({
  stats,
  automationRuns,
  automationJobs,
  onRefresh,
  onProcessDueJobs,
  isProcessingJobs,
  onRetryRun,
  onCancelRun,
  onCancelJob,
  onResolveHeldJob,
  isBusy,
}: AutomationHistorySectionProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRuns = (automationRuns || []).filter((run: any) => {
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "completed" &&
        ["completed", "submitted_to_provider", "delivered"].includes(
          (run.status || "").toLowerCase()
        )) ||
      (statusFilter === "queued" &&
        ["queued", "running", "processing"].includes(
          (run.status || "").toLowerCase()
        )) ||
      (statusFilter === "failed" &&
        (run.status || "").toLowerCase() === "failed") ||
      (statusFilter === "simulated" &&
        (run.status || "").toLowerCase() === "simulated");

    const matchesSearch =
      !searchQuery.trim() ||
      (run.automationName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (run.contactName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (run.triggerEvent || "").toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 text-left">
      <AutomationStatsBanner
        stats={stats}
        onProcessDueJobs={onProcessDueJobs}
        isProcessingJobs={isProcessingJobs}
      />

      {/* Filter Bar */}
      <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "all", label: `All Runs (${automationRuns?.length || 0})` },
            { id: "completed", label: "Completed" },
            { id: "queued", label: "Queued / Active" },
            { id: "failed", label: "Failed" },
            { id: "simulated", label: "Simulated Dry-Runs" },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setStatusFilter(pill.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-serif font-bold transition-all cursor-pointer border ${
                statusFilter === pill.id
                  ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border-[#FFE394]/60"
                  : "bg-[#020A17] text-[#C6B697] border-[#3A2C18] hover:text-[#FFF4D4]"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <div className="flex items-center bg-[#020A17] border border-[#3A2C18] rounded-xl px-3.5 py-2 w-full md:w-72">
          <Search className="h-3.5 w-3.5 text-[#C5A059] mr-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student, family, or workflow..."
            className="bg-transparent border-0 text-xs text-[#FFF4D4] placeholder-[#8CA4C4] focus:outline-none w-full font-serif"
          />
        </div>
      </div>

      {/* Full Durable Queue & Execution History Ledger */}
      <AutomationExecutionLedger
        automationRuns={filteredRuns}
        automationJobs={automationJobs || []}
        onRefresh={onRefresh}
        onRetryRun={onRetryRun}
        onCancelRun={onCancelRun}
        onCancelJob={onCancelJob}
        onResolveHeldJob={onResolveHeldJob}
        isBusy={isBusy}
      />
    </div>
  );
}

