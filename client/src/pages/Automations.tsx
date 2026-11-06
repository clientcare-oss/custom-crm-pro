import React, { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation, Link } from "wouter";
import { toast } from "sonner";
import {
  Zap, Plus, Trash2, Play, Sliders, Clock, Mail, FileText, CheckSquare,
  ChevronRight, Info, X, Loader2, RefreshCw, User,
  Sparkles, Eye, Settings,
  AlertTriangle, CheckCircle2, Split, HelpCircle, Maximize,
  ZoomIn, ZoomOut, Copy, Send
} from "lucide-react";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import AiPromptVault from "@/components/automations/AiPromptVault";
import { broadcastPageId } from "@/lib/pageIdRegistry";
import { VAULT_LOCK_STATUS_KEY } from "@/components/automations/defaultAiPrompts";
import {
  AutomationStatsBanner,
  AutomationExecutionLedger,
} from "@/components/automations/AutomationExecutionLedger";
import {
  AutomationSimulationWorkspace,
  RunManualAutomationModal,
} from "@/components/automations/AutomationSimulationAndModals";

// ============ TYPES & SCHEMAS ============
interface AutomationStep {
  id: string;
  type: "email" | "task" | "file";
  title: string;
  delayValue: number;
  delayUnit: "minutes" | "hours" | "days" | "weeks";
  delayAnchor: "after_trigger" | "after_prev" | "before_event" | "after_event";
  config: {
    templateId?: string;
    templateName?: string;
    taskTitle?: string;
    taskPriority?: "low" | "medium" | "high";
    createImmediateTaskWithDueDate?: boolean;
    fileId?: string;
    fileName?: string;
    notifyParentByEmail?: boolean;
    emailSubject?: string;
    emailBody?: string;
    googleReviewUrl?: string;
    testimonialUrl?: string;
    hasCondition?: boolean;
    conditionField?:
      | "contact_status"
      | "student_tag"
      | "student_diagnosis"
      | "iep_eligibility"
      | "plan_type"
      | "contract_status";
    conditionOperator?: "equals" | "contains" | "not_equals";
    conditionValue?: string;
  };
}

interface Automation {
  id: string;
  name: string;
  triggerEvent: string;
  isActive: boolean;
  steps: AutomationStep[];
  description: string;
  activeRunsCount: number;
  queuedRunsCount?: number;
  runningRunsCount?: number;
  completedRunsCount?: number;
  failedRunsCount?: number;
  triggerConfig?: {
    meetingType?: string;
    googleReviewUrl?: string;
    emailTemplateId?: string;
    projectDateSource?: "appointment_date" | "next_iep_date";
    pastScheduledPolicy?: "skip_past_steps" | "run_immediately";
  };
}

// ============ BUILT-IN EMAIL TEMPLATES PREVIEW DATA ============
const EMAIL_TEMPLATES: Record<string, { subject: string; body: string }> = {
  "welcome-email": {
    subject: "Welcome to Waypoint Advocates — {{studentName}}'s Case Workspace Setup",
    body: `Dear {{parentName}},

We are thrilled to begin working with you to support {{studentName}}! 

To help us advocate effectively, we have set up your personal Parent Portal. You can use this space to:
1. Upload existing IEPs, evaluations, and school documentation.
2. Track our active case tasks and agreed-upon milestones.
3. Access your Case Compass progress meter.

Please use your portal booking link to select a date for our 60-minute Case Strategy consultation session.

Best regards,
Byron Honea, Lead Special Education Advocate
Waypoint Advocates`
  },
  "iep-parent-prep": {
    subject: "Action Needed: IEP Preparation & Goal Priorities Form for {{studentName}}",
    body: `Dear {{parentName}},

Our upcoming IEP meeting for {{studentName}} is approaching! To make sure we present a unified, high-impact parent perspective, please review and fill out our Pre-IEP Strategy Form inside your portal.

Key things to consider:
- What are {{studentName}}'s greatest strengths at home and in the classroom?
- What are your primary concerns regarding reading, behavior, or social-emotional support?
- What accommodations (e.g. frequent breaks, sensory tools, simplified directions) do you feel are most critical?

Please submit the form at least 48 hours before the scheduled meeting date so we can review it together.

Best regards,
Byron Honea, Lead Special Education Advocate`
  },
  "pwn-review": {
    subject: "IEP Meeting Debrief & PWN Document Audit for {{studentName}}",
    body: `Dear {{parentName}},

Congratulations on completing today's IEP meeting for {{studentName}}! 

The school will follow up by issuing a Prior Written Notice (PWN) document detailing what services they agreed to or refused. Once you receive this paperwork:
1. Upload it directly to the "Files" section of {{studentName}}'s Parent Portal.
2. Do not sign consent until we audit the document together.
3. We will cross-reference the draft agreement against the team notes to ensure all accommodations were recorded accurately.

Warmly,
Byron Honea, Lead Special Education Advocate`
  },
  "review-request": {
    subject: "How did we do? Support other families with {{studentName}}'s story",
    body: `Dear {{parentName}},

Thank you for choosing Waypoint Advocates to support you and {{studentName}}! 

We recently completed our consultation / IEP meeting milestone, and we would love to hear about your experience. Your feedback helps us refine our advocacy and guides other families searching for dedicated special education advocacy support.

Could you take 2 minutes to leave us a Google review?
Google Review: {{googleReviewUrl}}

Thank you so much for your trust and partnership!

Warmly,
Byron Honea, Lead Special Education Advocate`
  },
  "tpl_intake_welcome": {
    subject: "Welcome to Waypoint Advocates — Next Steps for {{studentName}}",
    body: `Dear {{parentName}},\n\nThank you for reaching out to Waypoint Advocates regarding {{studentName}}.\n\nWe have created your family profile and look forward to connecting during your discovery consultation.\n\nWarmly,\nByron Honea\nLead Special Education Advocate`
  },
  "tpl_prep_checklist": {
    subject: "IEP Meeting Preparation Checklist for {{studentName}}",
    body: `Dear {{parentName}},\n\nAs we prepare for {{studentName}}'s upcoming IEP meeting, please upload any recent evaluations, progress reports, or school drafts to your Parent Portal.\n\nWarmly,\nByron Honea\nLead Special Education Advocate`
  },
  "tpl_post_session": {
    subject: "Post-Meeting Action Items & Follow-Up for {{studentName}}",
    body: `Dear {{parentName}},\n\nThank you for meeting today regarding {{studentName}}. We have logged our next advocacy action items and will follow up as soon as the school issues the Prior Written Notice (PWN).\n\nWarmly,\nByron Honea\nLead Special Education Advocate`
  },
  "tpl_contract_thanks": {
    subject: "Signed Advocacy Agreement Confirmation — {{studentName}}",
    body: `Dear {{parentName}},\n\nThank you for executing your Waypoint Advocates representation agreement for {{studentName}}. Your copy is stored in the Parent Portal.\n\nWarmly,\nByron Honea\nLead Special Education Advocate`
  },
  "tpl_review_request": {
    subject: "How did we do? Share your experience with Waypoint Advocates",
    body: `Dear {{parentName}},\n\nIt has been a privilege advocating for {{studentName}}. If you have two minutes, we would be grateful if you shared a review:\n{{googleReviewUrl}}\n\nWarmly,\nByron Honea\nLead Special Education Advocate`
  },
};

const MEETING_TRIGGERS = [
  "meeting_scheduled",
  "session_scheduled",
  "session_starts",
  "session_ends",
  "review_request_point",
];

// ============ TRIGGERS DATABASE ============
const TRIGGER_OPTIONS = [
  { id: "manual_trigger", label: "Manual trigger", category: "Quick Start", desc: "Runs only when explicitly triggered by an authorized advocate via Run Now" },
  { id: "meeting_scheduled", label: "Meeting scheduled", category: "Scheduling", desc: "Triggers when a discovery call or consultation is booked" },
  { id: "session_scheduled", label: "Session scheduled", category: "Scheduling", desc: "Triggers when an advocacy session is booked on the calendar" },
  { id: "session_starts", label: "Session starts", category: "Session Lifecycle", desc: "Triggers via durable background scheduler when an advocacy session start time arrives" },
  { id: "session_ends", label: "Session ends", category: "Session Lifecycle", desc: "Triggers when an advocacy session is marked completed" },
  { id: "lead_form_submitted", label: "Lead form submitted", category: "Inquiry", desc: "Triggers when a new family submits a public intake/lead form" },
  { id: "questionnaire_submitted", label: "Questionnaire submitted", category: "Inquiry", desc: "Triggers when a parent submits their IEP intake questionnaire" },
  { id: "file_completed", label: "File is completed", category: "Files & Documents", desc: "Triggers when a parent completes and submits an assigned Smart File" },
  { id: "payment_received", label: "Payment received (any charge)", category: "Billing", desc: "Fires for every valid positive recorded payment (excludes failed, refunded, or $0 items)" },
  { id: "first_payment_paid", label: "First payment paid (account-level)", category: "Billing", desc: "Fires once per family billing account when their very first valid payment is recorded" },
  { id: "invoice_paid_in_full", label: "Invoice paid in full (balance → $0)", category: "Billing", desc: "Fires only when a specific invoice transitions from an outstanding balance (> $0) to $0 remaining" },
  { id: "contract_signed", label: "Contract signed", category: "Agreement", desc: "Triggers when the parent signs the advocacy contract" },
  { id: "all_signatures_collected", label: "All required signatures collected", category: "Agreement", desc: "Triggers when all required contract signatures are executed" },
  { id: "project_date", label: "Project date", category: "Project Timeline", desc: "Triggers relative to the student's scheduled appointment date or Next IEP Review date" },
  { id: "review_request_point", label: "Meeting completed (Review request)", category: "Project Timeline", desc: "Triggers after a milestone meeting completes to request family feedback" },
  { id: "stage_changed", label: "Project stage changed", category: "Project Status", desc: "Triggers when a student transitions to a new advocacy stage" },
  { id: "tags_added", label: "Tags added to project", category: "Project Status", desc: "Triggers only when a custom student tag is newly added (not on diagnosis/plan edits)" },
];

const TRIGGER_CATEGORIES = [
  "Quick Start",
  "Scheduling",
  "Session Lifecycle",
  "Inquiry",
  "Files & Documents",
  "Billing",
  "Agreement",
  "Project Timeline",
  "Project Status",
];

// ============ STARTER SEEDS (START AS INACTIVE DRAFTS) ============
const DEFAULT_AUTOMATIONS: Omit<Automation, "id">[] = [
  {
    name: "Client Intake & Onboarding Flow",
    description: "Automates initial welcome emails, Smart File intake assignment, and internal review tasks when a new lead submits the intake form.",
    triggerEvent: "lead_form_submitted",
    isActive: false, // Starts as Draft so seeding never auto-activates drafts
    activeRunsCount: 0,
    steps: [
      {
        id: "step-1-1",
        type: "email",
        title: "Welcome & Discovery Scheduling Link",
        delayValue: 0,
        delayUnit: "minutes",
        delayAnchor: "after_trigger",
        config: {
          templateName: "Advocate Welcome & Calendar Invite",
          templateId: "welcome-email",
          emailSubject: EMAIL_TEMPLATES["welcome-email"].subject,
          emailBody: EMAIL_TEMPLATES["welcome-email"].body
        }
      },
      {
        id: "step-1-2",
        type: "file",
        title: "Assign Advocacy Intake Questionnaire",
        delayValue: 1,
        delayUnit: "days",
        delayAnchor: "after_prev",
        config: {
          fileId: "102",
          fileName: "IEP Advocacy Intake Questionnaire",
          notifyParentByEmail: false
        }
      },
      {
        id: "step-1-3",
        type: "task",
        title: "Review returned client questionnaire",
        delayValue: 2,
        delayUnit: "days",
        delayAnchor: "after_prev",
        config: {
          taskTitle: "Analyze client onboarding details, sensory triggers, and historical timeline",
          taskPriority: "high",
          createImmediateTaskWithDueDate: true,
          hasCondition: true,
          conditionField: "student_tag",
          conditionOperator: "contains",
          conditionValue: "IEP"
        }
      }
    ]
  },
  {
    name: "IEP Pre-Meeting Strategy Sequence",
    description: "Coordinates pre-meeting prep questionnaire dispatch, requests draft documentation, and queues up audit checklists for the advocate.",
    triggerEvent: "meeting_scheduled",
    isActive: false, // Starts as Draft
    activeRunsCount: 0,
    steps: [
      {
        id: "step-2-1",
        type: "email",
        title: "IEP Prep Parent Questionnaire",
        delayValue: 7,
        delayUnit: "days",
        delayAnchor: "before_event",
        config: {
          templateName: "IEP Prep: Parent Goal Formulation Guide",
          templateId: "iep-parent-prep",
          emailSubject: EMAIL_TEMPLATES["iep-parent-prep"].subject,
          emailBody: EMAIL_TEMPLATES["iep-parent-prep"].body
        }
      },
      {
        id: "step-2-2",
        type: "task",
        title: "Request draft IEP from school staff",
        delayValue: 5,
        delayUnit: "days",
        delayAnchor: "before_event",
        config: {
          taskTitle: "Follow up with school IEP coordinator to request draft goals and services list",
          taskPriority: "medium",
          createImmediateTaskWithDueDate: true
        }
      },
      {
        id: "step-2-3",
        type: "task",
        title: "Audit school draft IEP against historical files",
        delayValue: 2,
        delayUnit: "days",
        delayAnchor: "before_event",
        config: {
          taskTitle: "Verify services logs, therapist hours, and classroom accommodations adjustments",
          taskPriority: "high",
          createImmediateTaskWithDueDate: true,
          hasCondition: true,
          conditionField: "contract_status",
          conditionOperator: "equals",
          conditionValue: "signed"
        }
      }
    ]
  }
];

export default function Automations() {
  const [, setLocation] = useLocation();

  // Queries
  const { data: dbAutomations, refetch } = trpc.automations.list.useQuery();
  const { data: automationStats, refetch: refetchStats } = trpc.automations.stats.useQuery();
  const { data: savedEmailTemplates } = trpc.emailTemplates.list.useQuery();
  const { data: smartFileCatalog } = trpc.automations.smartFileCatalog.useQuery();
  const { data: automationRuns, refetch: refetchRuns } = trpc.automations.listRuns.useQuery({ limit: 50 });
  const { data: automationJobs, refetch: refetchJobs } = trpc.automations.listJobs.useQuery({ limit: 50 });
  const { data: triggerRequests, refetch: refetchTriggerRequests } = trpc.automations.listTriggerRequests.useQuery();
  const { data: contactsList } = trpc.contacts.list.useQuery();

  const refreshAll = () => {
    refetch();
    refetchStats();
    refetchRuns();
    refetchJobs();
  };

  // Mutations
  const saveMutation = trpc.automations.save.useMutation();
  const deleteMutation = trpc.automations.delete.useMutation();
  const duplicateMutation = trpc.automations.duplicate.useMutation({
    onSuccess: (res) => {
      toast.success(`Duplicated as inactive draft (#${res.id})`);
      refreshAll();
    },
    onError: (err) => toast.error(err.message || "Failed to duplicate automation"),
  });
  const simulateMutation = trpc.automations.simulate.useMutation();
  const runNowMutation = trpc.automations.runNow.useMutation();
  const processDueJobsMutation = trpc.automations.processDueJobs.useMutation({
    onSuccess: (res) => {
      toast.success(
        `Processed due queue (${res.processedCount} claimed, ${res.completedCount} completed, ${res.failedCount} failed)`
      );
      refreshAll();
    },
    onError: (err) => toast.error(err.message || "Failed to process due queue"),
  });
  const retryRunMutation = trpc.automations.retryRun.useMutation({
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Retried uncompleted steps! Completed steps were preserved.");
      } else {
        toast.error("Retry executed; check updated run logs.");
      }
      refreshAll();
    },
    onError: (err) => toast.error(err.message || "Failed to retry automation run"),
  });
  const cancelRunMutation = trpc.automations.cancelRun.useMutation({
    onSuccess: () => {
      toast.success("Pending automation run and queued steps canceled.");
      refreshAll();
    },
    onError: (err) => toast.error(err.message || "Failed to cancel run"),
  });
  const cancelJobMutation = trpc.automations.cancelJob.useMutation({
    onSuccess: () => {
      toast.success("Queued step canceled.");
      refreshAll();
    },
    onError: (err) => toast.error(err.message || "Failed to cancel queued step"),
  });
  const resolveHeldJobMutation = trpc.automations.resolveHeldJob.useMutation({
    onSuccess: (_, vars) => {
      toast.success(
        vars.action === "send_now"
          ? "Overdue step released for immediate execution."
          : "Overdue step skipped."
      );
      refreshAll();
    },
    onError: (err) => toast.error(err.message || "Failed to resolve held job"),
  });
  const requestTriggerMutation = trpc.automations.requestNewTrigger.useMutation({
    onSuccess: () => {
      toast.success("Trigger request persisted to database!");
      refetchTriggerRequests();
    },
    onError: (err) => toast.error(err.message || "Failed to save trigger request"),
  });

  const [automations, setAutomations] = useState<Automation[]>([]);
  const [pageTab, setPageTab] = useState<"workflows" | "ai-vault">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "ai-vault" || tab === "ai" || tab === "prompts" || tab === "vault") {
        return "ai-vault";
      }
    }
    return "workflows";
  });
  const [, setIsVaultUnlocked] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(VAULT_LOCK_STATUS_KEY) === "true";
    }
    return false;
  });

  const handleTabSwitch = (tab: "workflows" | "ai-vault") => {
    setPageTab(tab);
    const params = new URLSearchParams(window.location.search);
    if (tab === "ai-vault") {
      params.set("tab", "ai-vault");
      broadcastPageId({
        id: "PG-013-AI",
        name: "Locked AI Prompt Vault",
        category: "Automation",
        description: "Secure executive library prompts and AI model configuration"
      });
    } else {
      params.delete("tab");
      setActiveView("list");
      broadcastPageId({
        id: "PG-013",
        name: "Automations Engine",
        category: "Automation",
        description: "Trigger-based action sequences, smart file routing, and workflows"
      });
    }
    const newSearch = params.toString() ? `?${params.toString()}` : "";
    window.history.replaceState(null, "", `${window.location.pathname}${newSearch}`);
  };

  const [activeView, setActiveView] = useState<"list" | "edit" | "simulate">("list");
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [zoomLevel, setZoomLevel] = useState(100);

  // Email preview modal state (supports both template preview and custom step override preview)
  const [previewEmailStep, setPreviewEmailStep] = useState<{
    subject: string;
    body: string;
    templateName?: string;
    isCustomOverride?: boolean;
  } | null>(null);
  const [previewTargetName, setPreviewTargetName] = useState("Baaarbra Sheep");

  // Sidebar context triggers & steps configuration
  const [configuringTrigger, setConfiguringTrigger] = useState(false);

  // Request trigger Dialog overlay state
  const [requestTriggerOpen, setRequestTriggerOpen] = useState(false);
  const [newTriggerText, setNewTriggerText] = useState("");
  const [newTriggerCategory, setNewTriggerCategory] = useState("Custom Workflow");

  // Simulator & Run Now state
  const [selectedContactId, setSelectedContactId] = useState<number | null>(3);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simLogs, setSimLogs] = useState<string[]>([]);
  const [simStepPreviews, setSimStepPreviews] = useState<any[]>([]);

  const [runNowTargetAutomation, setRunNowTargetAutomation] = useState<Automation | null>(null);
  const [runNowPreviewSteps, setRunNowPreviewSteps] = useState<any[]>([]);
  const [runNowPreviewLogs, setRunNowPreviewLogs] = useState<string[]>([]);

  useEffect(() => {
    if (contactsList && contactsList.length > 0 && !selectedContactId) {
      setSelectedContactId(contactsList[0].id);
    }
  }, [contactsList, selectedContactId]);

  // Sync state whenever D1 backend returns loaded automations list
  useEffect(() => {
    if (dbAutomations) {
      const mapped: Automation[] = dbAutomations.map((a: any) => ({
        id: String(a.id),
        name: a.name,
        description: a.description || "",
        triggerEvent: a.triggerEvent,
        isActive: Boolean(a.isActive),
        activeRunsCount: Number(a.activeRunsCount ?? 0),
        queuedRunsCount: Number(a.queuedRunsCount ?? 0),
        runningRunsCount: Number(a.runningRunsCount ?? 0),
        completedRunsCount: Number(a.completedRunsCount ?? 0),
        failedRunsCount: Number(a.failedRunsCount ?? 0),
        triggerConfig: a.triggerConfig || {
          meetingType: "Any Meeting",
          googleReviewUrl: "https://g.page/r/waypoint-advocates/review",
          emailTemplateId: "review-request",
          projectDateSource: "appointment_date",
          pastScheduledPolicy: "skip_past_steps",
        },
        steps: (a.steps || []).map((s: any) => ({
          id: String(s.id),
          type: s.type,
          title: s.title,
          delayValue: s.delayValue,
          delayUnit: s.delayUnit,
          delayAnchor: s.delayAnchor,
          config: s.config || {}
        }))
      }));
      setAutomations(mapped);

      const params = new URLSearchParams(window.location.search);
      const requestedTrigger = params.get("trigger");
      const requestedId = params.get("id");
      if (requestedTrigger && !selectedAutomation) {
        const found = mapped.find(m => m.triggerEvent === requestedTrigger);
        if (found) {
          setSelectedAutomation(found);
          setActiveView("edit");
        }
      } else if (requestedId && !selectedAutomation) {
        const found = mapped.find(m => String(m.id) === requestedId);
        if (found) {
          setSelectedAutomation(found);
          setActiveView("edit");
        }
      } else if (selectedAutomation && !selectedAutomation.id.startsWith("auto-")) {
        const updatedSelection = mapped.find(m => String(m.id) === String(selectedAutomation.id));
        if (updatedSelection && activeView === "list") {
          setSelectedAutomation(updatedSelection);
        }
      }
    }
  }, [dbAutomations]);

  // Detect unsaved changes between selectedAutomation and dbAutomations
  const hasUnsavedChanges = useMemo(() => {
    if (!selectedAutomation) return false;
    if (selectedAutomation.id.startsWith("auto-")) return true;
    const saved = (dbAutomations || []).find(
      (a: any) => String(a.id) === String(selectedAutomation.id)
    );
    if (!saved) return true;
    const normalizeSteps = (steps: any[]) =>
      (steps || []).map((s) => ({
        type: s.type,
        title: s.title,
        delayValue: Number(s.delayValue || 0),
        delayUnit: s.delayUnit,
        delayAnchor: s.delayAnchor,
        config: s.config || {},
      }));
    return (
      saved.name !== selectedAutomation.name ||
      (saved.description || "") !== (selectedAutomation.description || "") ||
      saved.triggerEvent !== selectedAutomation.triggerEvent ||
      JSON.stringify(saved.triggerConfig || {}) !==
        JSON.stringify(selectedAutomation.triggerConfig || {}) ||
      JSON.stringify(normalizeSteps(saved.steps)) !==
        JSON.stringify(normalizeSteps(selectedAutomation.steps))
    );
  }, [selectedAutomation, dbAutomations]);

  const handleToggleActive = async (id: string) => {
    const item = automations.find((a) => a.id === id);
    if (!item) return;

    try {
      const nextActive = !item.isActive;
      await saveMutation.mutateAsync({
        id: id.startsWith("auto-") ? undefined : Number(id),
        name: item.name,
        description: item.description,
        triggerEvent: item.triggerEvent,
        isActive: nextActive,
        triggerConfig: item.triggerConfig,
        steps: item.steps.map((s) => ({
          type: s.type,
          title: s.title,
          delayValue: s.delayValue,
          delayUnit: s.delayUnit,
          delayAnchor: s.delayAnchor,
          config: s.config
        }))
      });
      toast.success(
        nextActive
          ? "Automation activated. Any overdue paused external emails are held for manual confirmation."
          : "Automation paused. New triggers are blocked and pending steps are held."
      );
      refreshAll();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update automation status");
    }
  };

  const handleCreateNew = () => {
    const newAuto: Automation = {
      id: "auto-" + Date.now(),
      name: "New Custom Automation Sequence",
      description: "Custom trigger-based workspace flow builder template.",
      triggerEvent: "",
      isActive: false,
      activeRunsCount: 0,
      triggerConfig: {
        meetingType: "Any Meeting",
        googleReviewUrl: "https://g.page/r/waypoint-advocates/review",
        emailTemplateId: "review-request",
        projectDateSource: "appointment_date",
        pastScheduledPolicy: "skip_past_steps",
      },
      steps: []
    };
    setAutomations([newAuto, ...automations]);
    setSelectedAutomation(newAuto);
    setActiveView("edit");
    setConfiguringTrigger(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (id.startsWith("auto-")) {
        setAutomations(automations.filter((a) => a.id !== id));
      } else {
        await deleteMutation.mutateAsync({ id: Number(id) });
      }
      toast.success("Automation deleted. Completed run history has been preserved.");
      refreshAll();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete automation");
    }
  };

  const handleDuplicate = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (id.startsWith("auto-")) {
      toast.error("Save this new draft automation first before duplicating.");
      return;
    }
    await duplicateMutation.mutateAsync({ id: Number(id) });
  };

  const handleSeedStarters = async () => {
    try {
      for (const auto of DEFAULT_AUTOMATIONS) {
        await saveMutation.mutateAsync({
          name: auto.name,
          description: auto.description || "",
          triggerEvent: auto.triggerEvent,
          isActive: false, // Always seed as inactive Draft
          triggerConfig: {
            meetingType: "Any Meeting",
            googleReviewUrl: "https://g.page/r/waypoint-advocates/review",
            emailTemplateId: "review-request",
            projectDateSource: "appointment_date",
            pastScheduledPolicy: "skip_past_steps",
          },
          steps: auto.steps.map((s) => ({
            type: s.type,
            title: s.title,
            delayValue: s.delayValue,
            delayUnit: s.delayUnit,
            delayAnchor: s.delayAnchor,
            config: s.config
          }))
        });
      }
      toast.success("Starter templates seeded as inactive Drafts!");
      refreshAll();
    } catch (err: any) {
      toast.error(err?.message || "Failed to seed templates");
    }
  };

  const handleAddStep = (index: number) => {
    if (!selectedAutomation) return;
    const newStep: AutomationStep = {
      id: "step-" + Date.now(),
      type: "email",
      title: "New Automated Action Step",
      delayValue: 1,
      delayUnit: "days",
      delayAnchor: "after_prev",
      config: {
        templateName: "Advocate Welcome & Calendar Invite",
        templateId: "welcome-email",
        emailSubject: EMAIL_TEMPLATES["welcome-email"].subject,
        emailBody: EMAIL_TEMPLATES["welcome-email"].body,
        taskPriority: "medium",
        createImmediateTaskWithDueDate: true,
        fileId: "102",
        fileName: "IEP Advocacy Intake Questionnaire",
        notifyParentByEmail: false,
        hasCondition: false,
        conditionField: "student_tag",
        conditionOperator: "equals",
        conditionValue: "IEP"
      }
    };
    const stepsCopy = [...selectedAutomation.steps];
    stepsCopy.splice(index, 0, newStep);

    const updatedAuto = { ...selectedAutomation, steps: stepsCopy };
    setSelectedAutomation(updatedAuto);
    setAutomations(automations.map((a) => (a.id === selectedAutomation.id ? updatedAuto : a)));
    setActiveStepId(newStep.id);
    setConfiguringTrigger(false);
    toast.success("Action step added to canvas");
  };

  const handleDeleteStep = (stepId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedAutomation) return;
    const updatedSteps = selectedAutomation.steps.filter((s) => s.id !== stepId);
    const updatedAuto = { ...selectedAutomation, steps: updatedSteps };

    setSelectedAutomation(updatedAuto);
    setAutomations(automations.map((a) => (a.id === selectedAutomation.id ? updatedAuto : a)));
    if (activeStepId === stepId) setActiveStepId(null);
    toast.success("Action step removed");
  };

  const handleUpdateStep = (stepId: string, updates: Partial<AutomationStep>) => {
    if (!selectedAutomation) return;
    const updatedSteps = selectedAutomation.steps.map((s) => {
      if (s.id !== stepId) return s;
      const stepCopy = { ...s, ...updates } as AutomationStep;
      // When switching to 'file', ensure a real template ID is populated if none set
      if (updates.type === "file" && !stepCopy.config.fileId) {
        const firstCatalog = (smartFileCatalog || [])[0] as any;
        stepCopy.config = {
          ...stepCopy.config,
          fileId: firstCatalog ? String(firstCatalog.id) : "102",
          fileName: firstCatalog ? (firstCatalog.name || firstCatalog.title) : "Comprehensive Parent Intake & IEP History Questionnaire",
          notifyParentByEmail: Boolean(stepCopy.config.notifyParentByEmail),
        };
      }
      return stepCopy;
    });

    const updatedAuto = { ...selectedAutomation, steps: updatedSteps };
    setSelectedAutomation(updatedAuto);
    setAutomations(automations.map((a) => (a.id === selectedAutomation.id ? updatedAuto : a)));
  };

  const handleUpdateStepConfig = (stepId: string, configUpdates: any) => {
    if (!selectedAutomation) return;
    const step = selectedAutomation.steps.find((s) => s.id === stepId);
    if (!step) return;
    const updatedStep = {
      ...step,
      config: { ...step.config, ...configUpdates }
    };
    handleUpdateStep(stepId, updatedStep);
  };

  const handleSaveAutomation = async (): Promise<number | null> => {
    if (!selectedAutomation) return null;
    if (!selectedAutomation.triggerEvent) {
      toast.error("Please configure a trigger event before saving");
      return null;
    }

    try {
      const result = await saveMutation.mutateAsync({
        id: selectedAutomation.id.startsWith("auto-") ? undefined : Number(selectedAutomation.id),
        name: selectedAutomation.name,
        description: selectedAutomation.description,
        triggerEvent: selectedAutomation.triggerEvent,
        isActive: selectedAutomation.isActive,
        triggerConfig: selectedAutomation.triggerConfig,
        steps: selectedAutomation.steps.map((s) => ({
          type: s.type,
          title: s.title,
          delayValue: s.delayValue,
          delayUnit: s.delayUnit,
          delayAnchor: s.delayAnchor,
          config: s.config
        }))
      });
      toast.success("Automation workflow saved to database!");
      const savedId = Number(result.id);
      if (selectedAutomation.id.startsWith("auto-")) {
        setSelectedAutomation({
          ...selectedAutomation,
          id: String(savedId)
        });
      }
      refreshAll();
      return savedId;
    } catch (err: any) {
      toast.error(err?.message || "Failed to save automation to database");
      return null;
    }
  };

  // Run tRPC server-side simulation sandbox on the SPECIFIC selected automation
  const startSimulation = async (overrideAutomationId?: number) => {
    if (!selectedAutomation) return;
    if (!selectedAutomation.triggerEvent) {
      toast.error("Trigger event must be set to simulate");
      return;
    }
    const targetAutoId =
      overrideAutomationId ??
      (selectedAutomation.id.startsWith("auto-") ? undefined : Number(selectedAutomation.id));

    if (!targetAutoId) {
      toast.error("Please save this new draft automation first so Test Run can evaluate it.");
      return;
    }

    setIsSimulating(true);
    setSimStepPreviews([]);
    setSimLogs([`[${new Date().toLocaleTimeString()}] 🚀 Running safe dry-run on Automation #${targetAutoId} (${selectedAutomation.name})...`]);

    try {
      const res = await simulateMutation.mutateAsync({
        automationId: targetAutoId,
        triggerEvent: selectedAutomation.triggerEvent,
        contactId: selectedContactId || 3,
        dryRun: true
      });

      if (res && res.logs) {
        setSimLogs(res.logs.map((log: string) => `[${new Date().toLocaleTimeString()}] ${log}`));
      }
      if (res && Array.isArray((res as any).simulationSteps)) {
        setSimStepPreviews((res as any).simulationSteps);
      }
      setIsSimulating(false);
      refreshAll();
    } catch (err: any) {
      setSimLogs((logs) => [
        ...logs,
        `[${new Date().toLocaleTimeString()}] ❌ Simulation error: ${err?.message || String(err)}`
      ]);
      setIsSimulating(false);
    }
  };

  const handleSaveAndTest = async () => {
    const savedId = await handleSaveAutomation();
    if (savedId) {
      await startSimulation(savedId);
    }
  };

  const handlePreviewManualRun = async () => {
    if (!runNowTargetAutomation || !selectedContactId) return;
    const autoId = Number(runNowTargetAutomation.id);
    if (!Number.isFinite(autoId)) {
      toast.error("Save this automation before running it.");
      return;
    }
    try {
      const res = await runNowMutation.mutateAsync({
        automationId: autoId,
        contactId: selectedContactId,
        dryRun: true,
      });
      setRunNowPreviewSteps((res as any).simulationSteps || []);
      setRunNowPreviewLogs(res.logs || []);
      toast.success("Action preview generated (0 live changes made).");
    } catch (err: any) {
      toast.error(err?.message || "Failed to preview manual automation");
    }
  };

  const handleExecuteManualRunLive = async () => {
    if (!runNowTargetAutomation || !selectedContactId) return;
    const autoId = Number(runNowTargetAutomation.id);
    if (!Number.isFinite(autoId)) {
      toast.error("Save this automation before running it.");
      return;
    }
    try {
      const res = await runNowMutation.mutateAsync({
        automationId: autoId,
        contactId: selectedContactId,
        dryRun: false,
      });
      setRunNowPreviewLogs(res.logs || []);
      toast.success(`Manual automation executed (${res.status})!`);
      refreshAll();
      setRunNowTargetAutomation(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to execute manual automation");
    }
  };

  const handleSubmitTriggerRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTriggerText.trim()) return;
    await requestTriggerMutation.mutateAsync({
      description: `[${newTriggerCategory}] ${newTriggerText.trim()}`,
      requestedTriggerText: newTriggerText.trim(),
      useCaseCategory: newTriggerCategory,
    });
    setNewTriggerText("");
    setRequestTriggerOpen(false);
  };

  const filteredAutomations = automations.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTriggerLabel = (id: string) => {
    return TRIGGER_OPTIONS.find((t) => t.id === id)?.label || id;
  };

  if (pageTab === "ai-vault") {
    return (
      <ScopedErrorBoundary moduleName="Waypoint AI Prompt Library">
        <AiPromptVault
          onUnlockChange={(unlocked) => setIsVaultUnlocked(unlocked)}
          onSwitchToWorkflows={() => handleTabSwitch("workflows")}
        />
      </ScopedErrorBoundary>
    );
  }

  return (
    <ScopedErrorBoundary moduleName="Automations Engine">
      <div className="min-h-screen w-full relative text-[#F0DFC5] p-4 sm:p-6 lg:p-8 bg-[#000820] overflow-x-hidden">
        <div className="max-w-7xl mx-auto w-full space-y-7">

          {/* ─── Top Header Deck & Tab Switcher ─── */}
          <div className="w-full flex flex-col gap-4 border-b border-[#3A2C18] pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-serif text-[10px] font-bold uppercase tracking-[0.2em] text-[#C5A059] px-2.5 py-0.5 rounded-full bg-[#1F1404] border border-[#8C6418]">
                    PG-013 · Autonomous Systems
                  </span>
                </div>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-wide text-[#FFF4D4]">
                  Automations Engine
                </h1>
                <p className="font-serif text-xs sm:text-sm text-[#E8D1A7] leading-relaxed max-w-2xl">
                  Trigger-based action sequences, durable background scheduling, Smart File portal assignments, and verified client communications.
                </p>
              </div>

              {/* Navigation Tab Bar: Sequences vs Waypoint AI */}
              <div className="flex items-center gap-2 bg-[#020A17]/85 p-1.5 rounded-xl border border-[#3A2C18] w-fit shadow-inner">
                <button
                  type="button"
                  onClick={() => handleTabSwitch("workflows")}
                  className="py-2 px-3.5 rounded-lg font-serif text-xs font-bold transition-all cursor-pointer flex items-center gap-2 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-[0_2px_8px_rgba(0,0,0,0.7)]"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Workflow Sequences</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-[#07162B]/20 text-[#07162B]">
                    {automations.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabSwitch("ai-vault")}
                  className="py-2 px-3.5 rounded-lg font-serif text-xs font-bold transition-all cursor-pointer flex items-center gap-2 relative text-[#C6B697] hover:text-[#FFF4D4] hover:bg-white/5 border border-transparent"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Waypoint AI</span>
                  <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded border bg-amber-950/80 text-amber-300 border-amber-500/40">
                    PG-013-AI
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* ─── WORKFLOWS CONTENT ─── */}
          <div className="w-full space-y-6">

            {/* ── VIEW 1: DASHBOARD LISTING ── */}
            {activeView === "list" && (
              <div className="space-y-6">
                {/* Accurate Stats & Provider Status Banner */}
                <AutomationStatsBanner
                  stats={automationStats}
                  onProcessDueJobs={() => processDueJobsMutation.mutate({ limit: 50 })}
                  isProcessingJobs={processDueJobsMutation.isPending}
                />

                {/* Header Action Strip */}
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#3A2C18] pb-4 gap-4 text-left">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-[#FFF4D4] font-serif">
                      Workflow Automations
                    </h2>
                    <p className="text-xs text-[#C6B697] mt-0.5">
                      Build trigger-based action flows to automate verified email delivery, portal Smart File assignments, and internal advocate tasks.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={handleSeedStarters}
                      className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] font-serif text-xs font-semibold py-2 px-3.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-[#C5A059]" /> Seed Starter Drafts
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateNew}
                      className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-serif font-bold text-xs border border-[#FFE394]/50 shadow-md hover:brightness-110 active:scale-95 py-2 px-4 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="h-4 w-4" /> New Automation
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="flex items-center bg-[#020A17]/90 border border-[#3A2C18] rounded-xl px-4 py-2.5 shadow-inner">
                  <Sliders className="h-4 w-4 text-[#7E97B8] mr-3" />
                  <input
                    type="text"
                    placeholder="Search workflows, triggers, or descriptions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-0 text-[#F0F6FC] text-xs w-full focus:ring-0 focus:outline-none placeholder-[#647C9D] font-serif"
                  />
                </div>

                {filteredAutomations.length === 0 ? (
                  <div className="text-center py-20 border border-dashed border-[#3A2C18] rounded-2xl bg-[#05142B]/40">
                    <Zap className="h-12 w-12 text-[#C5A059]/40 mx-auto mb-4" />
                    <h3 className="text-base font-serif font-bold text-[#FFF4D4] mb-1">
                      No automations configured
                    </h3>
                    <p className="text-xs text-[#C6B697] max-w-sm mx-auto">
                      Seed the starter draft templates or create a custom sequence to get started.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredAutomations.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedAutomation(item);
                          setActiveView("edit");
                          setConfiguringTrigger(false);
                        }}
                        className="bg-[#05142B]/90 hover:bg-[#07162B] border border-[#3A2C18] hover:border-[#C5A059]/60 rounded-xl p-5 cursor-pointer transition-all flex flex-col justify-between min-h-[205px] group text-left shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <h3 className="font-serif font-bold text-base text-[#FFF4D4] group-hover:text-[#FFE394] transition-colors">
                                {item.name}
                              </h3>
                              <p className="text-xs text-[#C6B697] leading-relaxed line-clamp-2 pr-4">
                                {item.description || "No description configured."}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-3.5">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-[#020A17] border border-[#3A2C18] px-2 py-0.5 rounded text-[#FFE394]">
                                  Trigger: {getTriggerLabel(item.triggerEvent) || "Set trigger in sidebar"}
                                </span>
                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-[#020A17] border border-[#3A2C18] px-2 py-0.5 rounded text-[#8CA4C4]">
                                  {item.steps.length} {item.steps.length === 1 ? "Step" : "Steps"}
                                </span>
                                {item.isActive ? (
                                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded text-emerald-400">
                                    Active
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-900 border border-slate-600/40 px-2 py-0.5 rounded text-slate-300">
                                    Draft / Paused
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Toggle active switch */}
                            <label
                              className="relative inline-flex items-center cursor-pointer shrink-0"
                              onClick={(e) => e.stopPropagation()}
                              title={item.isActive ? "Pause automation" : "Activate automation"}
                            >
                              <input
                                type="checkbox"
                                checked={item.isActive}
                                onChange={() => handleToggleActive(item.id)}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-[#020A17] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#8CA4C4] peer-checked:after:bg-[#07162B] after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#C5A059] peer-checked:border peer-checked:border-[#FFE394]"></div>
                            </label>
                          </div>
                        </div>

                        {/* Accurate Per-Automation Run Status Breakdown + Card Controls */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#3A2C18]/60 pt-3.5 mt-3.5">
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                            <span className="px-2 py-0.5 rounded bg-sky-950/60 border border-sky-500/30 text-sky-300">
                              Queued: {item.queuedRunsCount ?? 0}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-500/30 text-indigo-300">
                              Running: {item.runningRunsCount ?? 0}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                              Completed: {item.completedRunsCount ?? 0}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/30 text-rose-300">
                              Failed: {item.failedRunsCount ?? 0}
                            </span>
                          </div>

                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {item.triggerEvent === "manual_trigger" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setRunNowTargetAutomation(item);
                                  setRunNowPreviewSteps([]);
                                  setRunNowPreviewLogs([]);
                                }}
                                className="h-7 px-2.5 text-[10px] font-bold border-amber-500/40 bg-amber-950/50 text-[#FFE394] hover:bg-amber-900/60"
                              >
                                <Play className="h-3 w-3 mr-1 fill-[#FFE394]" />
                                Run Now
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Duplicate as inactive draft"
                              onClick={(e) => handleDuplicate(item.id, e)}
                              className="h-8 w-8 text-[#A69371] hover:text-[#FFE394] hover:bg-white/5 rounded-lg"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Delete automation (preserves completed run history)"
                              onClick={(e) => handleDelete(item.id, e)}
                              className="h-8 w-8 text-[#A69371] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Durable Queue & Execution History Ledger */}
                <AutomationExecutionLedger
                  automationRuns={automationRuns || []}
                  automationJobs={automationJobs || []}
                  onRefresh={refreshAll}
                  onRetryRun={(runId) =>
                    retryRunMutation.mutate({ runId, clearFailureFlags: true })
                  }
                  onCancelRun={(runId) =>
                    cancelRunMutation.mutate({ runId, reason: "Canceled by staff from PG-013" })
                  }
                  onCancelJob={(jobId) =>
                    cancelJobMutation.mutate({ jobId, reason: "Step canceled by staff from PG-013" })
                  }
                  onResolveHeldJob={(jobId, action) =>
                    resolveHeldJobMutation.mutate({ jobId, action })
                  }
                  isBusy={
                    retryRunMutation.isPending ||
                    cancelRunMutation.isPending ||
                    cancelJobMutation.isPending ||
                    resolveHeldJobMutation.isPending
                  }
                />
              </div>
            )}

            {/* ── VIEW 2: CANVAS BUILDER & CONFIG DRAWER ── */}
            {activeView === "edit" && selectedAutomation && (
              <div className="space-y-6">
                {/* Builder Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#07162B]/80 border border-[#3A2C18] rounded-xl p-3 md:px-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => {
                        setActiveView("list");
                        setSelectedAutomation(null);
                        setActiveStepId(null);
                      }}
                      className="text-slate-400 hover:text-white"
                      title="Back to Dashboard"
                    >
                      <ChevronRight className="h-5 w-5 transform rotate-180" />
                    </button>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="text"
                        value={selectedAutomation.name}
                        onChange={(e) => {
                          const updated = { ...selectedAutomation, name: e.target.value };
                          setSelectedAutomation(updated);
                          setAutomations(
                            automations.map((a) =>
                              a.id === selectedAutomation.id ? updated : a
                            )
                          );
                        }}
                        className="bg-transparent border-0 font-bold text-sm md:text-base text-white focus:ring-0 focus:outline-none p-0 w-48 md:w-72"
                      />
                      <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] uppercase tracking-wider font-mono">
                        {getTriggerLabel(selectedAutomation.triggerEvent) || "Trigger Pending"}
                      </Badge>
                      {hasUnsavedChanges && (
                        <Badge className="bg-rose-950/80 text-rose-300 border border-rose-500/40 text-[9px] uppercase tracking-wider font-mono">
                          Unsaved Changes
                        </Badge>
                      )}
                    </div>

                    {/* Active switch */}
                    <div className="h-4 w-px bg-white/10 mx-1" />
                    <label className="relative inline-flex items-center cursor-pointer scale-90">
                      <input
                        type="checkbox"
                        checked={selectedAutomation.isActive}
                        onChange={() => {
                          const updated = {
                            ...selectedAutomation,
                            isActive: !selectedAutomation.isActive,
                          };
                          setSelectedAutomation(updated);
                          setAutomations(
                            automations.map((a) =>
                              a.id === selectedAutomation.id ? updated : a
                            )
                          );
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-950/80 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-amber-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500/20 peer-checked:border peer-checked:border-amber-500/35"></div>
                      <span className="text-[10px] text-slate-300 ml-2 font-bold uppercase tracking-wider">
                        {selectedAutomation.isActive ? "Active" : "Draft / Paused"}
                      </span>
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {selectedAutomation.triggerEvent === "manual_trigger" && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setRunNowTargetAutomation(selectedAutomation);
                          setRunNowPreviewSteps([]);
                          setRunNowPreviewLogs([]);
                        }}
                        className="border-amber-500/40 bg-amber-950/40 text-[#FFE394] hover:bg-amber-900/50 text-xs h-9 px-3.5 font-bold"
                      >
                        <Play className="h-3.5 w-3.5 mr-1.5 fill-[#FFE394]" /> Run Now
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => handleDuplicate(selectedAutomation.id)}
                      disabled={selectedAutomation.id.startsWith("auto-")}
                      className="border-white/10 text-slate-300 hover:bg-white/5 text-xs h-9 px-3"
                      title="Duplicate as inactive draft"
                    >
                      <Copy className="h-3.5 w-3.5 mr-1.5" /> Duplicate
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSimLogs([]);
                        setSimStepPreviews([]);
                        setIsSimulating(false);
                        setActiveView("simulate");
                      }}
                      className="border-white/10 text-slate-200 hover:bg-white/5 text-xs h-9 px-3.5"
                      disabled={!selectedAutomation.steps.length}
                      title="Safe dry-run on this automation (works on Draft & Paused without activating)"
                    >
                      <Play className="h-3.5 w-3.5 mr-1.5 fill-slate-300" /> Test Run
                    </Button>
                    <Button
                      onClick={handleSaveAutomation}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-9 px-4 font-bold"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={async () => {
                        const updated = { ...selectedAutomation, isActive: true };
                        setSelectedAutomation(updated);
                        await saveMutation.mutateAsync({
                          id: selectedAutomation.id.startsWith("auto-")
                            ? undefined
                            : Number(selectedAutomation.id),
                          name: selectedAutomation.name,
                          description: selectedAutomation.description,
                          triggerEvent: selectedAutomation.triggerEvent,
                          isActive: true,
                          triggerConfig: selectedAutomation.triggerConfig,
                          steps: selectedAutomation.steps.map((s) => ({
                            type: s.type,
                            title: s.title,
                            delayValue: s.delayValue,
                            delayUnit: s.delayUnit,
                            delayAnchor: s.delayAnchor,
                            config: s.config,
                          })),
                        });
                        toast.success(
                          `Automation published & activated! Past-due step policy: ${
                            selectedAutomation.triggerConfig?.pastScheduledPolicy ===
                            "run_immediately"
                              ? "Execute past-due steps immediately"
                              : "Skip past-due steps; run future steps"
                          }`
                        );
                        refreshAll();
                      }}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs h-9 px-4 font-bold"
                    >
                      Save &amp; Activate
                    </Button>
                  </div>
                </div>

                {/* Pre-Activation Past-Scheduled-Time Behavior Notice */}
                <div className="bg-[#020A17]/90 border border-[#3A2C18] rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#C6B697]">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-[#C5A059] shrink-0" />
                    <span>
                      <strong className="text-[#FFF4D4]">When a scheduled time is already past:</strong>{" "}
                      {selectedAutomation.triggerConfig?.pastScheduledPolicy === "run_immediately"
                        ? "Past-due relative steps will execute immediately upon booking (configured in Trigger Settings)."
                        : "Past-due relative steps (e.g., 7 days before a session booked 2 days out) are safely skipped while remaining future steps still run."}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-[#FFE394]">
                    Historical events are never replayed on rollout.
                  </span>
                </div>

                {/* Split layout: Canvas editor vs Config Drawer */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Canvas Board Area (Left 8 Cols) */}
                  <div className="lg:col-span-8 bg-[#030e1e] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:18px_18px] border border-white/5 rounded-2xl p-6 min-h-[580px] relative flex flex-col justify-between overflow-hidden">
                    <div className="flex-1 flex flex-col items-center justify-start py-8 space-y-6 relative">
                      <div className="absolute left-1/2 top-14 bottom-14 w-0.5 border-l-2 border-dashed border-white/10 -translate-x-1/2 z-0" />

                      {/* Trigger Node Card */}
                      <div
                        onClick={() => {
                          setConfiguringTrigger(true);
                          setActiveStepId(null);
                        }}
                        className={`relative z-10 w-full max-w-md bg-[#07162B]/95 border rounded-2xl p-4 flex items-center justify-between gap-4 cursor-pointer transition-all hover:shadow-xl ${
                          configuringTrigger
                            ? "border-amber-500 shadow-md shadow-amber-500/5 bg-[#08182e]"
                            : selectedAutomation.triggerEvent
                              ? "border-white/10"
                              : "border-rose-500/40 animate-pulse bg-rose-500/5"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 text-left">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                            <Zap className="h-5 w-5" />
                          </div>
                          <div>
                            {selectedAutomation.triggerEvent ? (
                              <>
                                <h4 className="font-serif font-black text-sm text-white">
                                  {getTriggerLabel(selectedAutomation.triggerEvent)}
                                </h4>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 block">
                                  Trigger Event
                                  {MEETING_TRIGGERS.includes(selectedAutomation.triggerEvent) &&
                                    selectedAutomation.triggerConfig?.meetingType &&
                                    ` · ${selectedAutomation.triggerConfig.meetingType}`}
                                </span>
                              </>
                            ) : (
                              <>
                                <h4 className="font-sans font-bold text-sm text-rose-300">
                                  Set a trigger in the sidebar
                                </h4>
                                <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest mt-0.5 block">
                                  Trigger Required
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div>
                          {!selectedAutomation.triggerEvent ? (
                            <AlertTriangle className="h-4 w-4 text-rose-500" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          )}
                        </div>
                      </div>

                      {/* Add action button node link */}
                      <div className="relative z-10 flex justify-center">
                        <button
                          onClick={() => handleAddStep(0)}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 border border-white/10 hover:border-amber-500/40 text-slate-400 hover:text-white transition-all transform hover:scale-110 shadow-lg"
                          title="Insert action step"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Steps nodes list */}
                      {selectedAutomation.steps.length === 0 ? (
                        <div className="w-full max-w-sm text-center py-8 bg-slate-950/20 border border-dashed border-white/5 rounded-2xl relative z-10 text-slate-500 text-xs">
                          No actions in this automation flow. Click the &ldquo;+&rdquo; button to add an email, portal Smart File, or internal task.
                        </div>
                      ) : (
                        selectedAutomation.steps.map((step, idx) => {
                          const isSelected = activeStepId === step.id;
                          const hasCondition = step.config?.hasCondition;
                          return (
                            <React.Fragment key={step.id}>
                              <div
                                onClick={() => {
                                  setActiveStepId(step.id);
                                  setConfiguringTrigger(false);
                                }}
                                className={`relative z-10 w-full max-w-md bg-[#07162B]/95 border rounded-2xl p-4 flex items-center justify-between gap-4 cursor-pointer transition-all hover:shadow-xl ${
                                  isSelected
                                    ? "border-indigo-500 shadow-md shadow-indigo-500/5 bg-[#08182e]"
                                    : "border-white/10"
                                }`}
                              >
                                <div className="flex items-center gap-3.5 text-left min-w-0 flex-1">
                                  <div
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-inner ${
                                      step.type === "email"
                                        ? "bg-indigo-500/10 border-indigo-500/25 text-indigo-400"
                                        : step.type === "file"
                                          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                                          : "bg-amber-500/10 border-amber-500/25 text-amber-400"
                                    }`}
                                  >
                                    {step.type === "email" && <Mail className="h-4 w-4" />}
                                    {step.type === "file" && <FileText className="h-4 w-4" />}
                                    {step.type === "task" && <CheckSquare className="h-4 w-4" />}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                        {step.type === "email" && "Send Email"}
                                        {step.type === "file" && "Assign Smart File"}
                                        {step.type === "task" && "Create Task"}
                                      </span>
                                      <span className="text-[9px] font-semibold bg-slate-950/60 px-1.5 py-0.5 rounded text-slate-400 flex items-center gap-0.5">
                                        <Clock className="h-3 w-3 text-slate-400" />
                                        {step.delayValue === 0
                                          ? "Immediately"
                                          : `${step.delayValue} ${step.delayUnit} (${step.delayAnchor.replace("_", " ")})`}
                                      </span>
                                      {hasCondition && (
                                        <span className="text-[8px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                          <Split className="h-2.5 w-2.5" />
                                          Step Filter
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="font-serif font-black text-sm text-white mt-1 truncate">
                                      {step.title}
                                    </h4>
                                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                      {step.type === "email" &&
                                        `Subject: ${step.config.emailSubject || step.config.templateName || "Email Template"}`}
                                      {step.type === "file" &&
                                        `Template #${step.config.fileId || "?"}: ${step.config.fileName || "Select Smart File"}${
                                          step.config.notifyParentByEmail ? " (+ Parent Email)" : " (Portal Only)"
                                        }`}
                                      {step.type === "task" &&
                                        `Task: ${step.config.taskTitle || step.title} (${
                                          step.config.createImmediateTaskWithDueDate !== false
                                            ? "Created immediately w/ due date"
                                            : "Created after delay"
                                        })`}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {step.type === "email" && (
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const tpl = EMAIL_TEMPLATES[step.config.templateId || "welcome-email"];
                                        setPreviewEmailStep({
                                          subject:
                                            step.config.emailSubject ||
                                            tpl?.subject ||
                                            "Waypoint Advocates Update",
                                          body:
                                            step.config.emailBody ||
                                            tpl?.body ||
                                            "",
                                          templateName: step.config.templateName,
                                          isCustomOverride: Boolean(
                                            step.config.emailSubject || step.config.emailBody
                                          ),
                                        });
                                      }}
                                      className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg"
                                      title="Preview resolved email"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={(e) => handleDeleteStep(step.id, e)}
                                    className="h-8 w-8 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              <div className="relative z-10 flex justify-center">
                                <button
                                  onClick={() => handleAddStep(idx + 1)}
                                  className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 border border-white/10 hover:border-amber-500/40 text-slate-400 hover:text-white transition-all transform hover:scale-110 shadow-lg"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                            </React.Fragment>
                          );
                        })
                      )}

                      {/* End Node */}
                      <div className="relative z-10 flex flex-col items-center text-center pt-2">
                        <div className="w-5 h-5 rounded-full bg-slate-950 border-2 border-white/10 shrink-0" />
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">
                          End automation
                        </span>
                      </div>
                    </div>

                    {/* Zoom controls */}
                    <div className="absolute bottom-4 left-4 bg-slate-950/80 border border-white/10 rounded-lg p-1 flex items-center gap-1.5 shadow-lg select-none">
                      <button
                        onClick={() => setZoomLevel(100)}
                        className="h-6 px-1.5 rounded text-[10px] font-bold text-slate-400 hover:text-white hover:bg-white/5 flex items-center gap-0.5"
                      >
                        <Maximize className="h-3 w-3" />
                        <span>{zoomLevel}%</span>
                      </button>
                      <div className="w-px h-3.5 bg-white/15" />
                      <button
                        onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
                        className="h-6 w-6 rounded text-slate-400 hover:text-white hover:bg-white/5 flex items-center justify-center"
                      >
                        <ZoomOut className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                        className="h-6 w-6 rounded text-slate-400 hover:text-white hover:bg-white/5 flex items-center justify-center"
                      >
                        <ZoomIn className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Sidebar Config Panel Drawer (Right 4 Cols) */}
                  <div className="lg:col-span-4 bg-[#07162B]/60 border border-[#3A2C18] rounded-2xl p-6 text-left space-y-6 self-start max-h-[680px] overflow-y-auto">
                    {/* ── SUB-VIEW A: SELECT A TRIGGER ── */}
                    {configuringTrigger ? (
                      <div className="space-y-5">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-amber-400" />
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                              Configure Trigger
                            </h3>
                          </div>
                          <button
                            onClick={() => setConfiguringTrigger(false)}
                            className="text-slate-400 hover:text-white rounded"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Meeting-Type Filter exposed for ALL Meeting Triggers */}
                        {MEETING_TRIGGERS.includes(selectedAutomation.triggerEvent) && (
                          <div className="bg-[#0b1e36]/80 border border-amber-500/30 rounded-xl p-4 space-y-3">
                            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Sliders className="h-3.5 w-3.5 text-amber-400" />
                              Meeting Trigger Filter
                            </h4>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                                Required Meeting / Session Type
                              </label>
                              <select
                                value={selectedAutomation.triggerConfig?.meetingType || "Any Meeting"}
                                onChange={(e) => {
                                  const updated = {
                                    ...selectedAutomation,
                                    triggerConfig: {
                                      ...(selectedAutomation.triggerConfig || {}),
                                      meetingType: e.target.value,
                                    },
                                  };
                                  setSelectedAutomation(updated);
                                  setAutomations(
                                    automations.map((a) =>
                                      a.id === selectedAutomation.id ? updated : a
                                    )
                                  );
                                }}
                                className="w-full bg-slate-900 border border-white/10 text-white rounded p-2 text-xs"
                              >
                                <option value="Any Meeting">Any Meeting / Session Type</option>
                                <option value="Discovery Consultation">Discovery Consultation Session</option>
                                <option value="First IEP Meeting">First IEP Meeting</option>
                                <option value="Annual IEP Review">Annual IEP Review Session</option>
                                <option value="Eligibility Meeting">Eligibility / Consent Meeting</option>
                                <option value="Strategy Session">Case Strategy Session</option>
                              </select>
                            </div>

                            {selectedAutomation.triggerEvent === "review_request_point" && (
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                                  Google Review Link ({"{{googleReviewUrl}}"})
                                </label>
                                <input
                                  type="text"
                                  value={
                                    selectedAutomation.triggerConfig?.googleReviewUrl ||
                                    "https://g.page/r/waypoint-advocates/review"
                                  }
                                  onChange={(e) => {
                                    const updated = {
                                      ...selectedAutomation,
                                      triggerConfig: {
                                        ...(selectedAutomation.triggerConfig || {}),
                                        googleReviewUrl: e.target.value,
                                      },
                                    };
                                    setSelectedAutomation(updated);
                                    setAutomations(
                                      automations.map((a) =>
                                        a.id === selectedAutomation.id ? updated : a
                                      )
                                    );
                                  }}
                                  className="w-full bg-slate-900 border border-white/10 text-white rounded p-2 text-xs"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Project Date Source Configuration */}
                        {selectedAutomation.triggerEvent === "project_date" && (
                          <div className="bg-[#0b1e36]/80 border border-amber-500/30 rounded-xl p-4 space-y-2.5">
                            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                              Project Date Source Field
                            </h4>
                            <p className="text-[11px] text-slate-300">
                              Select which student/case date anchors this automation&apos;s schedule:
                            </p>
                            <select
                              value={
                                selectedAutomation.triggerConfig?.projectDateSource ||
                                "appointment_date"
                              }
                              onChange={(e) => {
                                const updated = {
                                  ...selectedAutomation,
                                  triggerConfig: {
                                    ...(selectedAutomation.triggerConfig || {}),
                                    projectDateSource: e.target.value as any,
                                  },
                                };
                                setSelectedAutomation(updated);
                                setAutomations(
                                  automations.map((a) =>
                                    a.id === selectedAutomation.id ? updated : a
                                  )
                                );
                              }}
                              className="w-full bg-slate-900 border border-white/10 text-white rounded p-2 text-xs"
                            >
                              <option value="appointment_date">
                                Scheduled Appointment / IEP Meeting Date (appointments.scheduledAt)
                              </option>
                              <option value="next_iep_date">
                                Student Next IEP / Annual Review Date (contacts.nextIepDate)
                              </option>
                            </select>
                          </div>
                        )}

                        {/* Billing Trigger Definitions Box */}
                        {["payment_received", "first_payment_paid", "invoice_paid_in_full"].includes(
                          selectedAutomation.triggerEvent
                        ) && (
                          <div className="bg-[#020A17] border border-[#3A2C18] rounded-xl p-3.5 space-y-2 text-[11px] text-[#E8D1A7]">
                            <div className="font-serif font-bold text-[#FFE394]">
                              Billing Trigger Precision Rules:
                            </div>
                            <ul className="list-disc pl-4 space-y-1 text-[#C6B697]">
                              <li>
                                <strong>payment_received:</strong> Fires on each valid positive payment recorded.
                              </li>
                              <li>
                                <strong>first_payment_paid:</strong> Fires <em>once</em> per family billing account on their first successful payment.
                              </li>
                              <li>
                                <strong>invoice_paid_in_full:</strong> Fires <em>only</em> when a specific invoice transitions from an outstanding balance (&gt; $0) to $0 remaining.
                              </li>
                            </ul>
                          </div>
                        )}

                        {/* Past-Scheduled-Time Behavior Selector */}
                        <div className="bg-[#020A17]/90 border border-white/10 rounded-xl p-3.5 space-y-2">
                          <label className="text-[10px] font-bold text-[#FFE394] uppercase tracking-wider block">
                            If a Scheduled Step Time Is Already Past
                          </label>
                          <select
                            value={
                              selectedAutomation.triggerConfig?.pastScheduledPolicy ||
                              "skip_past_steps"
                            }
                            onChange={(e) => {
                              const updated = {
                                ...selectedAutomation,
                                triggerConfig: {
                                  ...(selectedAutomation.triggerConfig || {}),
                                  pastScheduledPolicy: e.target.value as any,
                                },
                              };
                              setSelectedAutomation(updated);
                              setAutomations(
                                automations.map((a) =>
                                  a.id === selectedAutomation.id ? updated : a
                                )
                              );
                            }}
                            className="w-full bg-slate-900 border border-white/10 text-white rounded p-2 text-xs"
                          >
                            <option value="skip_past_steps">
                              Skip past-due relative steps; execute remaining future steps (Recommended)
                            </option>
                            <option value="run_immediately">
                              Execute past-due steps immediately upon trigger
                            </option>
                          </select>
                        </div>

                        {/* Grouped triggers categories */}
                        <div className="space-y-4">
                          {TRIGGER_CATEGORIES.map((category) => {
                            const categoryTriggers = TRIGGER_OPTIONS.filter(
                              (t) => t.category === category
                            );
                            if (categoryTriggers.length === 0) return null;
                            return (
                              <div key={category} className="space-y-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-white/5 pb-1">
                                  {category}
                                </span>
                                <div className="space-y-1.5">
                                  {categoryTriggers.map((trig) => (
                                    <button
                                      key={trig.id}
                                      type="button"
                                      onClick={() => {
                                        const updated = {
                                          ...selectedAutomation,
                                          triggerEvent: trig.id,
                                        };
                                        setSelectedAutomation(updated);
                                        setAutomations(
                                          automations.map((a) =>
                                            a.id === selectedAutomation.id ? updated : a
                                          )
                                        );
                                        toast.success(`Trigger set to: "${trig.label}"`);
                                      }}
                                      className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex flex-col gap-0.5 group ${
                                        selectedAutomation.triggerEvent === trig.id
                                          ? "bg-amber-500/15 border-amber-500 text-white font-semibold"
                                          : "bg-slate-900 border-white/5 text-slate-400 hover:border-white/15"
                                      }`}
                                    >
                                      <span className="text-white group-hover:text-amber-400 transition-colors">
                                        {trig.label}
                                      </span>
                                      <span className="text-[10px] text-slate-400 leading-normal">
                                        {trig.desc}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Request New Trigger button */}
                        <div className="border-t border-white/10 pt-4 mt-4 space-y-2">
                          <Button
                            type="button"
                            onClick={() => {
                              setNewTriggerText("");
                              setRequestTriggerOpen(true);
                            }}
                            className="w-full bg-[#0b1e36] hover:bg-[#122846] border border-white/10 text-slate-200 text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5"
                          >
                            <HelpCircle className="h-4 w-4 text-indigo-400" />
                            <span>Request New Trigger ({triggerRequests?.length || 0} saved)</span>
                          </Button>
                        </div>
                      </div>
                    ) : activeStepId ? (
                      /* ── SUB-VIEW B: CONFIGURE ACTION STEP ── */
                      (() => {
                        const step = selectedAutomation.steps.find(
                          (s) => s.id === activeStepId
                        );
                        if (!step) return null;
                        const matchedSmartFile = (smartFileCatalog || []).find(
                          (sf: any) =>
                            String(sf.id) === String(step.config.fileId || "") ||
                            String(sf.name || sf.title || "").toLowerCase() ===
                              String(step.config.fileName || "").toLowerCase()
                        );

                        return (
                          <div className="space-y-5">
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                              <div className="flex items-center gap-2">
                                <Sliders className="h-4 w-4 text-indigo-400" />
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                                  Configure Action Step
                                </h3>
                              </div>
                              <button
                                onClick={() => setActiveStepId(null)}
                                className="text-slate-400 hover:text-white rounded"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Step type selector */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-200">
                                Action Node Type
                              </label>
                              <select
                                value={step.type}
                                onChange={(e) =>
                                  handleUpdateStep(step.id, { type: e.target.value as any })
                                }
                                className="w-full bg-slate-900 border border-white/10 text-white rounded-lg p-2.5 text-xs"
                              >
                                <option value="email">Send Automated Email</option>
                                <option value="file">Assign Portal Smart File</option>
                                <option value="task">Create Internal Team Task</option>
                              </select>
                            </div>

                            {/* Title label input */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-200">
                                Step Action Title
                              </label>
                              <input
                                type="text"
                                value={step.title}
                                onChange={(e) =>
                                  handleUpdateStep(step.id, { title: e.target.value })
                                }
                                className="w-full bg-slate-900 border border-white/10 text-white rounded-lg p-2.5 text-xs"
                              />
                            </div>

                            {/* Timing Config delays */}
                            <div className="space-y-2 bg-[#020A17]/80 border border-white/10 rounded-xl p-3.5">
                              <label className="text-xs font-bold text-[#FFE394] flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-[#C5A059]" />
                                Step Timing &amp; Schedule (America/New_York)
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={step.delayValue}
                                  onChange={(e) =>
                                    handleUpdateStep(step.id, {
                                      delayValue: Math.max(0, parseInt(e.target.value, 10) || 0),
                                    })
                                  }
                                  className="w-16 bg-slate-900 border border-white/10 text-white rounded-lg p-2 text-xs text-center"
                                />
                                <select
                                  value={step.delayUnit}
                                  onChange={(e) =>
                                    handleUpdateStep(step.id, {
                                      delayUnit: e.target.value as any,
                                    })
                                  }
                                  className="flex-1 bg-slate-900 border border-white/10 text-white rounded-lg p-2 text-xs"
                                >
                                  <option value="minutes">Minutes</option>
                                  <option value="hours">Hours</option>
                                  <option value="days">Days</option>
                                  <option value="weeks">Weeks</option>
                                </select>
                              </div>

                              <select
                                value={step.delayAnchor}
                                onChange={(e) =>
                                  handleUpdateStep(step.id, {
                                    delayAnchor: e.target.value as any,
                                  })
                                }
                                className="w-full bg-slate-900 border border-white/10 text-white rounded-lg p-2 text-xs mt-1"
                              >
                                <option value="after_trigger">After Initial Trigger</option>
                                <option value="after_prev">
                                  After Previous Step Completes (Chained)
                                </option>
                                <option value="before_event">
                                  Before Scheduled Session / Project Date
                                </option>
                                <option value="after_event">
                                  After Scheduled Session / Project Date
                                </option>
                              </select>
                              <p className="text-[10px] text-[#A69371] leading-snug">
                                {step.delayValue === 0 && step.delayAnchor === "after_trigger"
                                  ? "Runs immediately when triggered."
                                  : step.delayAnchor === "after_prev"
                                    ? "Queued in D1 and scheduled relative to the preceding step's completion timestamp."
                                    : "Queued in D1 and executed by the background scheduler even when no browser is open."}
                              </p>
                            </div>

                            {/* Node Config detail options */}
                            <div className="border-t border-white/10 pt-4 space-y-4">
                              {step.type === "email" && (
                                <div className="space-y-3.5">
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-200">
                                      Base Email Template
                                    </label>
                                    <select
                                      value={step.config.templateId || "welcome-email"}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const opt = e.target.selectedOptions[0];
                                        const matchedSaved = (savedEmailTemplates || []).find(
                                          (t: any) => String(t.id) === val
                                        );
                                        const builtin = EMAIL_TEMPLATES[val];
                                        handleUpdateStepConfig(step.id, {
                                          templateId: val,
                                          templateName: opt?.text || val,
                                          emailSubject:
                                            matchedSaved?.subject ||
                                            builtin?.subject ||
                                            step.config.emailSubject,
                                          emailBody:
                                            matchedSaved?.body ||
                                            builtin?.body ||
                                            step.config.emailBody,
                                        });
                                      }}
                                      className="w-full bg-slate-900 border border-white/10 text-white rounded-lg p-2.5 text-xs"
                                    >
                                      <optgroup label="Built-in Waypoint Templates">
                                        <option value="welcome-email">
                                          Advocate Welcome &amp; Calendar Invite
                                        </option>
                                        <option value="iep-parent-prep">
                                          IEP Prep: Parent Goal Formulation Guide
                                        </option>
                                        <option value="pwn-review">
                                          Post-IEP: PWN Document Review Checklist
                                        </option>
                                        <option value="review-request">
                                          Milestone Review Request
                                        </option>
                                        <option value="tpl_intake_welcome">
                                          Lead Inquiry Welcome &amp; Discovery Guide
                                        </option>
                                        <option value="tpl_prep_checklist">
                                          IEP Meeting Prep Checklist
                                        </option>
                                        <option value="tpl_post_session">
                                          Post-Meeting Action Items
                                        </option>
                                        <option value="tpl_contract_thanks">
                                          Signed Contract Confirmation
                                        </option>
                                        <option value="tpl_review_request">
                                          Google Review &amp; Testimonial Request
                                        </option>
                                      </optgroup>
                                      {savedEmailTemplates && savedEmailTemplates.length > 0 && (
                                        <optgroup label="Saved CRM Email Templates (D1)">
                                          {savedEmailTemplates.map((tpl: any) => (
                                            <option key={tpl.id} value={String(tpl.id)}>
                                              {tpl.name} ({tpl.category || "General"})
                                            </option>
                                          ))}
                                        </optgroup>
                                      )}
                                    </select>
                                  </div>

                                  {/* Editable Custom Subject Override */}
                                  <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-[#FFE394] block">
                                      Step Email Subject (Custom Override Supported)
                                    </label>
                                    <input
                                      type="text"
                                      value={step.config.emailSubject || ""}
                                      onChange={(e) =>
                                        handleUpdateStepConfig(step.id, {
                                          emailSubject: e.target.value,
                                        })
                                      }
                                      placeholder="Leave blank to use selected template subject..."
                                      className="w-full bg-slate-900 border border-white/10 text-white rounded-lg p-2 text-xs"
                                    />
                                  </div>

                                  {/* Editable Custom Body Override */}
                                  <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-[#FFE394] block">
                                      Step Email Body (Merge Tokens: {"{{studentName}}"}, {"{{parentName}}"}, {"{{googleReviewUrl}}"})
                                    </label>
                                    <textarea
                                      rows={6}
                                      value={step.config.emailBody || ""}
                                      onChange={(e) =>
                                        handleUpdateStepConfig(step.id, {
                                          emailBody: e.target.value,
                                        })
                                      }
                                      placeholder="Custom body text for this step (overrides template body when non-empty)..."
                                      className="w-full bg-slate-900 border border-white/10 text-white rounded-lg p-2.5 text-xs font-mono"
                                    />
                                  </div>

                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const tpl =
                                        EMAIL_TEMPLATES[step.config.templateId || "welcome-email"];
                                      setPreviewEmailStep({
                                        subject:
                                          step.config.emailSubject ||
                                          tpl?.subject ||
                                          "Waypoint Advocates Update",
                                        body: step.config.emailBody || tpl?.body || "",
                                        templateName: step.config.templateName,
                                        isCustomOverride: Boolean(
                                          step.config.emailSubject || step.config.emailBody
                                        ),
                                      });
                                    }}
                                    className="w-full border-white/10 text-slate-200 hover:bg-white/5 text-xs"
                                  >
                                    <Eye className="h-3.5 w-3.5 mr-2" /> Preview Merged Email
                                  </Button>
                                </div>
                              )}

                              {step.type === "file" && (
                                <div className="space-y-3.5">
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-200">
                                      Select Smart File Template (PG-033 Catalog)
                                    </label>
                                    <select
                                      value={
                                        matchedSmartFile
                                          ? String(matchedSmartFile.id)
                                          : step.config.fileId || ""
                                      }
                                      onChange={(e) => {
                                        const chosenId = e.target.value;
                                        const found = (smartFileCatalog || []).find(
                                          (sf: any) => String(sf.id) === chosenId
                                        ) as any;
                                        handleUpdateStepConfig(step.id, {
                                          fileId: chosenId,
                                          fileName: found ? (found.name || found.title) : "",
                                        });
                                      }}
                                      className="w-full bg-slate-900 border border-white/10 text-white rounded-lg p-2.5 text-xs"
                                    >
                                      <option value="">-- Select a Smart File Template --</option>
                                      {(smartFileCatalog || []).map((sf: any) => (
                                        <option key={sf.id} value={String(sf.id)}>
                                          #{sf.id} — {sf.name || sf.title} ({sf.category || sf.type})
                                        </option>
                                      ))}
                                    </select>
                                    {!matchedSmartFile && (
                                      <p className="text-[11px] text-rose-400 font-mono">
                                        ⚠️ No valid Smart File template selected. Missing or deleted templates will fail with a configuration error rather than silently assigning ID #1.
                                      </p>
                                    )}
                                  </div>

                                  {/* Portal Assignment vs Parent Notification Toggle */}
                                  <div className="bg-[#020A17]/90 border border-[#3A2C18] rounded-xl p-3 space-y-2">
                                    <label className="flex items-start gap-2.5 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(step.config.notifyParentByEmail)}
                                        onChange={(e) =>
                                          handleUpdateStepConfig(step.id, {
                                            notifyParentByEmail: e.target.checked,
                                          })
                                        }
                                        className="mt-0.5 rounded border-white/20 bg-slate-900"
                                      />
                                      <span className="text-xs text-[#FFF4D4] leading-snug">
                                        <strong>Also send parent an email notification</strong> when this Smart File is assigned to their portal
                                      </span>
                                    </label>
                                    <p className="text-[10px] text-[#C6B697]">
                                      When unchecked, this step assigns the Smart File to the student&apos;s Parent Portal without sending an external email. Duplicate assignments for the same student + template are automatically prevented.
                                    </p>
                                  </div>
                                </div>
                              )}

                              {step.type === "task" && (
                                <div className="space-y-3.5">
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-200">
                                      Task Description
                                    </label>
                                    <textarea
                                      value={step.config.taskTitle || ""}
                                      onChange={(e) =>
                                        handleUpdateStepConfig(step.id, {
                                          taskTitle: e.target.value,
                                        })
                                      }
                                      className="w-full h-20 bg-slate-900 border border-white/10 text-white rounded-lg p-2 text-xs"
                                    />
                                  </div>

                                  <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-200">
                                      Task Creation Time vs. Task Due Date
                                    </label>
                                    <select
                                      value={
                                        step.config.createImmediateTaskWithDueDate !== false
                                          ? "immediate_with_due"
                                          : "wait_until_delay"
                                      }
                                      onChange={(e) =>
                                        handleUpdateStepConfig(step.id, {
                                          createImmediateTaskWithDueDate:
                                            e.target.value === "immediate_with_due",
                                        })
                                      }
                                      className="w-full bg-slate-900 border border-white/10 text-white rounded-lg p-2 text-xs"
                                    >
                                      <option value="immediate_with_due">
                                        Create task immediately &amp; set Due Date to step schedule time
                                      </option>
                                      <option value="wait_until_delay">
                                        Wait in background queue &amp; create task when step delay elapses
                                      </option>
                                    </select>
                                  </div>

                                  <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-200">
                                      Task Priority Level
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                      {["low", "medium", "high"].map((p) => (
                                        <button
                                          key={p}
                                          type="button"
                                          onClick={() =>
                                            handleUpdateStepConfig(step.id, {
                                              taskPriority: p,
                                            })
                                          }
                                          className={`py-1.5 rounded text-[10px] font-bold uppercase transition-all ${
                                            step.config.taskPriority === p
                                              ? "bg-amber-500 text-slate-950 border border-amber-500/20"
                                              : "bg-slate-900 text-slate-400 hover:bg-slate-900/60 border border-white/5"
                                          }`}
                                        >
                                          {p}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* STEP FILTER / CONDITIONAL LOGIC */}
                            <div className="border-t border-white/10 pt-4 space-y-3">
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={step.config.hasCondition || false}
                                  onChange={(e) =>
                                    handleUpdateStepConfig(step.id, {
                                      hasCondition: e.target.checked,
                                    })
                                  }
                                  className="rounded border-white/10 bg-slate-900 h-4 w-4"
                                />
                                <span className="text-xs font-bold text-slate-200">
                                  Apply Step Filter Condition
                                </span>
                              </label>
                              <p className="text-[10px] text-[#C6B697]">
                                <strong>Step Filter Behavior:</strong> If this condition evaluates to false when the step runs, <strong>only this step is skipped</strong> and any subsequent steps in the sequence still continue.
                              </p>

                              {step.config.hasCondition && (
                                <div className="space-y-3 bg-slate-950/60 p-3 rounded-lg border border-white/10">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                                      CRM Field to Evaluate
                                    </label>
                                    <select
                                      value={step.config.conditionField || "student_tag"}
                                      onChange={(e) =>
                                        handleUpdateStepConfig(step.id, {
                                          conditionField: e.target.value,
                                        })
                                      }
                                      className="w-full bg-slate-900 border border-white/10 text-white rounded p-1.5 text-[11px]"
                                    >
                                      <option value="student_tag">
                                        Custom Student Tag (contacts.tags — PG-004)
                                      </option>
                                      <option value="student_diagnosis">
                                        Clinical Diagnosis (contacts.diagnosis)
                                      </option>
                                      <option value="iep_eligibility">
                                        IEP Eligibility Category (contacts.iepEligibility)
                                      </option>
                                      <option value="plan_type">
                                        Plan Type: IEP / 504 (contacts.planType)
                                      </option>
                                      <option value="contact_status">
                                        Student / Lead Stage (contacts.status)
                                      </option>
                                      <option value="contract_status">
                                        Contract Signature Status (contracts.status)
                                      </option>
                                    </select>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                                      Operator
                                    </label>
                                    <select
                                      value={step.config.conditionOperator || "equals"}
                                      onChange={(e) =>
                                        handleUpdateStepConfig(step.id, {
                                          conditionOperator: e.target.value,
                                        })
                                      }
                                      className="w-full bg-slate-900 border border-white/10 text-white rounded p-1.5 text-[11px]"
                                    >
                                      <option value="equals">Equals</option>
                                      <option value="contains">Contains</option>
                                      <option value="not_equals">Does Not Equal</option>
                                    </select>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                                      Value to Compare
                                    </label>
                                    <input
                                      type="text"
                                      value={step.config.conditionValue || ""}
                                      onChange={(e) =>
                                        handleUpdateStepConfig(step.id, {
                                          conditionValue: e.target.value,
                                        })
                                      }
                                      placeholder="e.g. High Priority, Autism, IEP, active, signed"
                                      className="w-full bg-slate-900 border border-white/10 text-white rounded p-1.5 text-[11px]"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="border-t border-white/10 pt-4">
                              <Button
                                onClick={handleSaveAutomation}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                              >
                                Save Step &amp; Workflow Config
                              </Button>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      /* ── SUB-VIEW C: IDLE INSTRUCTIONS ── */
                      <div className="py-12 text-center text-slate-400 space-y-3">
                        <Settings className="h-8 w-8 text-slate-400/50 mx-auto" />
                        <p className="text-xs max-w-[220px] mx-auto leading-relaxed">
                          Click the <strong>Trigger Node</strong> or any <strong>Action Card</strong> on the canvas to configure its settings.
                        </p>
                        <div className="pt-4 border-t border-white/10 mt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setConfiguringTrigger(true);
                              setActiveStepId(null);
                            }}
                            className="w-full border-white/10 text-slate-200 text-xs"
                          >
                            Configure Trigger &amp; Policies
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── VIEW 3: SAFE FLOW SIMULATOR DRY RUN ── */}
            {activeView === "simulate" && selectedAutomation && (
              <AutomationSimulationWorkspace
                selectedAutomation={selectedAutomation}
                hasUnsavedChanges={hasUnsavedChanges}
                onSaveAndTest={handleSaveAndTest}
                contactsList={contactsList || []}
                selectedContactId={selectedContactId}
                setSelectedContactId={setSelectedContactId}
                startSimulation={() => startSimulation()}
                isSimulating={isSimulating}
                simLogs={simLogs}
                simStepPreviews={simStepPreviews}
                onClose={() => {
                  setIsSimulating(false);
                  setActiveView("edit");
                }}
                getTriggerLabel={getTriggerLabel}
              />
            )}
          </div>

          {/* ── RUN MANUAL AUTOMATION NOW MODAL ── */}
          <RunManualAutomationModal
            automation={runNowTargetAutomation}
            contactsList={contactsList || []}
            selectedContactId={selectedContactId}
            setSelectedContactId={setSelectedContactId}
            onClose={() => setRunNowTargetAutomation(null)}
            onPreviewDryRun={handlePreviewManualRun}
            onExecuteLive={handleExecuteManualRunLive}
            isRunning={runNowMutation.isPending}
            previewSteps={runNowPreviewSteps}
            previewLogs={runNowPreviewLogs}
          />

          {/* ── EMAIL TEMPLATE & OVERRIDE PREVIEW MODAL ── */}
          {previewEmailStep && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm text-left">
              <div className="w-full max-w-2xl bg-[#081628] border border-[#3A2C18] rounded-2xl shadow-2xl p-6 relative flex flex-col max-h-[90vh]">
                <button
                  onClick={() => setPreviewEmailStep(null)}
                  className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-lg bg-slate-900 border border-white/10 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-2 border-b border-white/10 pb-4 mb-4">
                  <Mail className="h-5 w-5 text-indigo-400" />
                  <div>
                    <h3 className="font-bold text-sm text-white">
                      Email Step Merge Preview
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      {previewEmailStep.isCustomOverride
                        ? "Showing step-specific custom subject/body override"
                        : `Template: ${previewEmailStep.templateName || "Default"}`}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-4 mb-4">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                    Preview Student Merge Tokens:
                  </span>
                  <select
                    value={previewTargetName}
                    onChange={(e) => setPreviewTargetName(e.target.value)}
                    className="bg-slate-950 border border-white/10 text-white rounded p-1.5 text-xs"
                  >
                    {(contactsList || []).slice(0, 10).map((c: any) => (
                      <option
                        key={c.id}
                        value={`${c.firstName || ""} ${c.lastName || ""}`.trim()}
                      >
                        {c.firstName} {c.lastName}
                      </option>
                    ))}
                    <option value="Baaarbra Sheep">Baaarbra Sheep</option>
                  </select>
                </div>

                <div className="flex-1 bg-slate-950 border border-white/10 rounded-xl p-5 overflow-y-auto space-y-4 text-xs font-sans text-slate-300">
                  <div className="space-y-1.5 border-b border-white/10 pb-3">
                    <div>
                      <span className="text-slate-500 font-semibold">Subject:</span>{" "}
                      <span className="text-white font-bold">
                        {previewEmailStep.subject
                          .replace(/\{\{studentName\}\}/g, previewTargetName)
                          .replace(/\{\{parentName\}\}/g, "Parent / Guardian")}
                      </span>
                    </div>
                  </div>
                  <pre className="whitespace-pre-wrap leading-relaxed font-sans text-slate-200">
                    {previewEmailStep.body
                      .replace(/\{\{studentName\}\}/g, previewTargetName)
                      .replace(/\{\{parentName\}\}/g, "Parent / Guardian")
                      .replace(
                        /\{\{googleReviewUrl\}\}/g,
                        selectedAutomation?.triggerConfig?.googleReviewUrl ||
                          "https://g.page/r/waypoint-advocates/review"
                      )}
                  </pre>
                </div>

                <div className="border-t border-white/10 pt-4 mt-4 flex justify-end">
                  <Button
                    onClick={() => setPreviewEmailStep(null)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5"
                  >
                    Done
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── REQUEST NEW TRIGGER DIALOG MODAL (PERSISTED TO D1) ── */}
          {requestTriggerOpen && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm text-left">
              <div className="w-full max-w-lg bg-[#081628] border border-[#3A2C18] rounded-2xl shadow-2xl p-6 relative flex flex-col max-h-[90vh] overflow-y-auto">
                <button
                  onClick={() => setRequestTriggerOpen(false)}
                  className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-lg bg-slate-900 border border-white/10 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-2.5 border-b border-white/10 pb-4 mb-4">
                  <Sparkles className="h-5 w-5 text-indigo-400" />
                  <div>
                    <h3 className="font-bold text-sm text-white">
                      Request New Trigger Event
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Persisted to the Waypoint D1 trigger request queue
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmitTriggerRequest} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-200">
                      Category
                    </label>
                    <input
                      type="text"
                      value={newTriggerCategory}
                      onChange={(e) => setNewTriggerCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-200">
                      Describe the trigger event &amp; source record condition
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={newTriggerText}
                      onChange={(e) => setNewTriggerText(e.target.value)}
                      placeholder="e.g., Trigger when school district PWN deadline passes without response"
                      className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-xs text-white"
                    />
                  </div>

                  {triggerRequests && triggerRequests.length > 0 && (
                    <div className="space-y-1.5 border-t border-white/10 pt-3">
                      <span className="text-[10px] font-mono uppercase text-[#FFE394] block">
                        Saved Trigger Requests ({triggerRequests.length})
                      </span>
                      <div className="max-h-32 overflow-y-auto space-y-1.5">
                        {triggerRequests.slice(0, 6).map((req: any) => (
                          <div
                            key={req.id}
                            className="bg-slate-950 border border-white/10 rounded p-2 text-[11px] text-slate-300 flex items-center justify-between gap-2"
                          >
                            <span className="truncate">{req.requestedTriggerText}</span>
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 shrink-0">
                              {req.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 border-t border-white/10 pt-4 mt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setRequestTriggerOpen(false)}
                      className="hover:bg-white/5 text-slate-400 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={requestTriggerMutation.isPending}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5"
                    >
                      {requestTriggerMutation.isPending ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Trigger Request"
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </ScopedErrorBoundary>
  );
}
