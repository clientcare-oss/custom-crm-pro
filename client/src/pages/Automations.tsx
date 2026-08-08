import React, { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLocation, Link } from "wouter";
import { toast } from "sonner";
import {
  Zap, Plus, Trash2, Play, Sliders, Clock, Mail, FileText, CheckSquare,
  ArrowRight, ChevronRight, Info, X, Check, Loader2, RefreshCw, User,
  Calendar, Layers, Sparkles, AlertCircle, ShieldAlert, Eye, Settings,
  AlertTriangle, CheckCircle2, FileCheck, Send, HelpCircle, Split,
  FileSignature, DollarSign, Tag, Landmark, CalendarDays, Maximize,
  Minimize2, ZoomIn, ZoomOut, CheckSquare as CheckIcon, MoreVertical
} from "lucide-react";

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
    fileName?: string;
    emailSubject?: string;
    emailBody?: string;
    
    // Conditional logic rule configurations
    hasCondition?: boolean;
    conditionField?: "contact_status" | "student_tag" | "contract_status";
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
}

// ============ MOCK EMAIL TEMPLATES PREVIEW DATA ============
const EMAIL_TEMPLATES: Record<string, { subject: string; body: string }> = {
  "welcome-email": {
    subject: "Welcome to Waypoint Advocates — {{studentName}}'s Case Workspace Setup",
    body: `Dear Family,

We are thrilled to begin working with you to support {{studentName}}! 

To help us advocate effectively, we have set up your personal Parent Portal. You can use this space to:
1. Upload existing IEPs, evaluations, and school documentation.
2. Track our active case tasks and agreed-upon milestones.
3. Access your Case Compass progress meter.

Please use the following booking link to select a date for our 60-minute Case Strategy consultation session:
[Link: Book Strategy Session]

If you have any initial concerns, please log in and write them in the "Notes" section of your portal.

Best regards,
Byron Honea, Master IEP Coach®
Waypoint Advocates`
  },
  "iep-parent-prep": {
    subject: "Action Needed: IEP Preparation & Goal Priorities Form for {{studentName}}",
    body: `Dear Family,

Our upcoming IEP meeting for {{studentName}} is approaching! To make sure we present a unified, high-impact parent perspective, please review and fill out our Pre-IEP Strategy Form inside your portal.

Key things to consider:
- What are {{studentName}}'s greatest strengths at home and in the classroom?
- What are your primary concerns regarding reading, behavior, or social-emotional support?
- What accommodations (e.g. frequent breaks, sensory tools, simplified directions) do you feel are most critical?

Please submit the form at least 48 hours before the scheduled meeting date so we can review it together.

Best regards,
Byron Honea, Master IEP Coach®`
  },
  "pwn-review": {
    subject: "IEP Meeting Debrief & PWN Document Audit for {{studentName}}",
    body: `Dear Family,

Congratulations on completing today's IEP meeting! 

The school will follow up by issuing a **Prior Written Notice (PWN)** document detailing what services they agreed to or refused. Once you receive this paperwork:
1. Upload it directly to the "Files" section of {{studentName}}'s Parent Portal.
2. Do not sign consent until we audit the document together.
3. We will cross-reference the draft agreement against the team notes to ensure all accommodations were recorded correctly.

I have created an internal check task to follow up on this with you next week.

Warmly,
Byron Honea, Master IEP Coach®`
  }
};

// ============ TRIGGERS DATABASE ============
const TRIGGER_OPTIONS = [
  { id: "meeting_scheduled", label: "Meeting scheduled", category: "Scheduling", desc: "Triggers when a discovery call or consultation is booked" },
  { id: "lead_form_submitted", label: "Lead form submitted", category: "Inquiry", desc: "Triggers when a new client submits the intake form" },
  { id: "session_scheduled", label: "Session scheduled", category: "Scheduling", desc: "Triggers when an advocacy session is booked on the calendar" },
  { id: "session_starts", label: "Session starts", category: "Session Lifecycle", desc: "Triggers at the exact start time of an advocacy session" },
  { id: "session_ends", label: "Session ends", category: "Session Lifecycle", desc: "Triggers immediately when an advocacy session wraps up" },
  { id: "file_completed", label: "File is completed", category: "Files & Documents", desc: "Triggers when all forms/templates in a smart file are completed" },
  { id: "questionnaire_submitted", label: "Questionnaire submitted", category: "Inquiry", desc: "Triggers when a parent submits their IEP intake questions" },
  { id: "first_payment_paid", label: "First payment paid", category: "Billing", desc: "Triggers when the first retainer payment is cleared" },
  { id: "invoice_paid_in_full", label: "Invoice paid in full", category: "Billing", desc: "Triggers when the balance of an invoice is paid to 100%" },
  { id: "contract_signed", label: "Contract signed", category: "Agreement", desc: "Triggers when the parent signs the advocacy contract" },
  { id: "all_signatures_collected", label: "All required signatures collected", category: "Agreement", desc: "Triggers when both parent and advocate execute the contract" },
  { id: "project_date", label: "Project date", category: "Project Timeline", desc: "Triggers relative to a key student project milestone date" },
  { id: "stage_changed", label: "Project stage changed", category: "Project Status", desc: "Triggers when a student transitions to a new advocacy stage" },
  { id: "tags_added", label: "Tags added to project", category: "Project Status", desc: "Triggers when custom tags (e.g. IEP, 504) are appended" },
  { id: "manual_trigger", label: "Manual trigger", category: "Quick Start", desc: "Runs only when manually triggered by the advocate" }
];

// Grouped triggers list for display in the sidebar categories
const TRIGGER_CATEGORIES = ["Quick Start", "Scheduling", "Inquiry", "Session Lifecycle", "Files & Documents", "Billing", "Agreement", "Project Timeline", "Project Status"];

// ============ STARTER SEEDS ============
const DEFAULT_AUTOMATIONS: Automation[] = [
  {
    id: "auto-1",
    name: "Client Intake & Onboarding Flow",
    description: "Automates initial welcome emails, questionnaire requests, and scheduling links when a new lead submits the intake form.",
    triggerEvent: "lead_form_submitted",
    isActive: true,
    activeRunsCount: 4,
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
        title: "Request Advocacy Intake Questionnaire",
        delayValue: 1,
        delayUnit: "days",
        delayAnchor: "after_prev",
        config: {
          fileName: "Client IEP Onboarding Form"
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
          hasCondition: true,
          conditionField: "student_tag",
          conditionOperator: "contains",
          conditionValue: "IEP"
        }
      }
    ]
  },
  {
    id: "auto-2",
    name: "IEP Pre-Meeting Strategy Sequence",
    description: "Coordinates pre-meeting prep questionnaire dispatch, requests draft documentation, and queues up audit checklists for the advocate.",
    triggerEvent: "meeting_scheduled",
    isActive: true,
    activeRunsCount: 2,
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
          taskPriority: "medium"
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

  // Load custom list or seed defaults
  const [automations, setAutomations] = useState<Automation[]>(() => {
    const saved = localStorage.getItem("crm_automations");
    return saved ? JSON.parse(saved) : DEFAULT_AUTOMATIONS;
  });

  const [activeView, setActiveView] = useState<"list" | "edit" | "simulate">("list");
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [zoomLevel, setZoomLevel] = useState(100);

  // Email template preview drawer overlay state
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const [previewTargetName, setPreviewTargetName] = useState("Baaarbra Sheep");

  // Sidebar context triggers & steps configuration
  const [configuringTrigger, setConfiguringTrigger] = useState(false);

  // Request trigger Dialog overlay state
  const [requestTriggerOpen, setRequestTriggerOpen] = useState(false);
  const [newTriggerText, setNewTriggerText] = useState("");
  const [isSubmittingTriggerRequest, setIsSubmittingTriggerRequest] = useState(false);

  // Simulator state
  const { data: contactsList } = trpc.contacts.list.useQuery();
  const [selectedContactId, setSelectedContactId] = useState<number | null>(3); // Baaarbra Sheep default
  const [isSimulating, setIsSimulating] = useState(false);
  const [simLogs, setSimLogs] = useState<string[]>([]);
  const [currentSimStep, setCurrentSimStep] = useState(0);

  const saveAutomations = (list: Automation[]) => {
    setAutomations(list);
    localStorage.setItem("crm_automations", JSON.stringify(list));
  };

  const handleSubmitTriggerRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTriggerText.trim()) return;
    setIsSubmittingTriggerRequest(true);
    setTimeout(() => {
      setIsSubmittingTriggerRequest(false);
      setRequestTriggerOpen(false);
      toast.success("Trigger request submitted to developer queue! We will notify you once implemented.");
      setSimLogs((logs) => [
        ...logs,
        `[${new Date().toLocaleTimeString()}] 📩 [Tech Queue] Received custom trigger request: "${newTriggerText}"`
      ]);
    }, 1200);
  };

  const handleToggleActive = (id: string) => {
    const updated = automations.map((a) =>
      a.id === id ? { ...a, isActive: !a.isActive } : a
    );
    saveAutomations(updated);
    toast.success("Workflow status updated");
  };

  const handleCreateNew = () => {
    const newAuto: Automation = {
      id: "auto-" + Date.now(),
      name: "New Custom Automation Sequence",
      description: "Custom trigger-based workspace flow builder template.",
      triggerEvent: "", // Set empty initially to show "Set a trigger in the sidebar" warning card!
      isActive: false,
      activeRunsCount: 0,
      steps: []
    };
    saveAutomations([newAuto, ...automations]);
    setSelectedAutomation(newAuto);
    setActiveView("edit");
    setConfiguringTrigger(true); // Open trigger side menu automatically!
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = automations.filter((a) => a.id !== id);
    saveAutomations(filtered);
    toast.success("Automation workflow deleted");
  };

  const handleSeedStarters = () => {
    saveAutomations(DEFAULT_AUTOMATIONS);
    toast.success("Default templates seeded successfully!");
  };

  // Step Node actions inside Editor
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
    saveAutomations(automations.map((a) => (a.id === selectedAutomation.id ? updatedAuto : a)));
    setActiveStepId(newStep.id);
    setConfiguringTrigger(false);
    toast.success("Action step added to workflow");
  };

  const handleDeleteStep = (stepId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedAutomation) return;
    const updatedSteps = selectedAutomation.steps.filter((s) => s.id !== stepId);
    const updatedAuto = { ...selectedAutomation, steps: updatedSteps };

    setSelectedAutomation(updatedAuto);
    saveAutomations(automations.map((a) => (a.id === selectedAutomation.id ? updatedAuto : a)));
    if (activeStepId === stepId) setActiveStepId(null);
    toast.success("Action step removed");
  };

  const handleUpdateStep = (stepId: string, updates: Partial<AutomationStep>) => {
    if (!selectedAutomation) return;
    const updatedSteps = selectedAutomation.steps.map((s) => {
      if (s.id !== stepId) return s;
      const stepCopy = { ...s, ...updates } as AutomationStep;

      // Auto fill template bodies if templateId changes
      if (updates.config?.templateId && EMAIL_TEMPLATES[updates.config.templateId]) {
        stepCopy.config = {
          ...stepCopy.config,
          ...updates.config,
          emailSubject: EMAIL_TEMPLATES[updates.config.templateId].subject,
          emailBody: EMAIL_TEMPLATES[updates.config.templateId].body
        };
      }
      return stepCopy;
    });

    const updatedAuto = { ...selectedAutomation, steps: updatedSteps };
    setSelectedAutomation(updatedAuto);
    saveAutomations(automations.map((a) => (a.id === selectedAutomation.id ? updatedAuto : a)));
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

  // Run Test simulation sequence
  const startSimulation = () => {
    if (!selectedAutomation || selectedAutomation.steps.length === 0) return;
    const student = contactsList?.find(c => c.id === selectedContactId);
    const parent = contactsList?.find(c => c.id === student?.parentContactId);
    const studentName = student ? `${student.firstName} ${student.lastName}` : "Baaarbra Sheep";
    const parentName = parent ? `${parent.firstName} ${parent.lastName}` : "Shawn Sheep";

    setIsSimulating(true);
    setCurrentSimStep(0);
    setSimLogs([
      `[${new Date().toLocaleTimeString()}] 🚀 Initiating dry-run simulation for workflow: "${selectedAutomation.name}"`,
      `[${new Date().toLocaleTimeString()}] 🔗 Student Target: ${studentName} (ID: ${selectedContactId})`,
      `[${new Date().toLocaleTimeString()}] 🔗 Parent Portal target: ${parentName}`,
      `[${new Date().toLocaleTimeString()}] ⚙️ Loading automated action pipeline triggers...`
    ]);
  };

  useEffect(() => {
    let timer: any = null;
    if (isSimulating && selectedAutomation) {
      if (currentSimStep < selectedAutomation.steps.length) {
        timer = setTimeout(() => {
          const step = selectedAutomation.steps[currentSimStep];
          let message = "";

          const student = contactsList?.find(c => c.id === selectedContactId);
          const studentName = student ? `${student.firstName} ${student.lastName}` : "Baaarbra Sheep";

          // Evaluate conditional logic if step specifies it
          let conditionPassed = true;
          if (step.config?.hasCondition) {
            const field = step.config.conditionField || "student_tag";
            const val = (step.config.conditionValue || "").toLowerCase();
            const op = step.config.conditionOperator || "equals";

            let testFieldValue = "";
            if (field === "contact_status") {
              testFieldValue = student?.status || "lead";
            } else if (field === "student_tag") {
              // Mock resolved tag parameters for Baaarbra Sheep (ID: 3)
              testFieldValue = selectedContactId === 3 ? "iep, speech therapy" : "504 plan";
            } else if (field === "contract_status") {
              testFieldValue = "signed";
            }

            if (op === "equals") {
              conditionPassed = testFieldValue.toLowerCase() === val;
            } else if (op === "contains") {
              conditionPassed = testFieldValue.toLowerCase().includes(val);
            } else if (op === "not_equals") {
              conditionPassed = testFieldValue.toLowerCase() !== val;
            }

            setSimLogs((logs) => [
              ...logs,
              `🔍 [Rule Check] Evaluating condition: If ${field.replace('_', ' ')} ${op} "${val}" (Resolved: "${testFieldValue}")`
            ]);
          }

          if (conditionPassed) {
            if (step.type === "email") {
              const subject = (step.config.emailSubject || "Hello").replace("{{studentName}}", studentName);
              message = `📧 [Step ${currentSimStep + 1}/${selectedAutomation.steps.length}] Email template "${step.config.templateName || 'Inquiry Guide'}" dispatched. \n   └─ Subject: "${subject}"`;
            } else if (step.type === "file") {
              message = `📄 [Step ${currentSimStep + 1}/${selectedAutomation.steps.length}] Smart File "${step.config.fileName || 'Intake questionnaire'}" sent to Parent Portal interface.`;
            } else {
              message = `✅ [Step ${currentSimStep + 1}/${selectedAutomation.steps.length}] Created CRM Task: "${step.config.taskTitle || step.title}" (Priority: ${step.config.taskPriority?.toUpperCase() || 'MEDIUM'}).`;
            }
          } else {
            message = `⚠️ [Step ${currentSimStep + 1}/${selectedAutomation.steps.length}] Action SKIPPED. Conditional logic rules were not met.`;
          }

          setSimLogs((logs) => [
            ...logs,
            `[${new Date().toLocaleTimeString()}] ${message}`,
            `[${new Date().toLocaleTimeString()}] ⏳ Wait parameter: ${step.delayValue} ${step.delayUnit} (${step.delayAnchor.replace('_', ' ')})`
          ]);
          setCurrentSimStep(currentSimStep + 1);
        }, 1500);
      } else {
        timer = setTimeout(() => {
          setSimLogs((logs) => [
            ...logs,
            `[${new Date().toLocaleTimeString()}] 🎉 Dry-run audit completed! All tasks generated and email nodes verified for quality control.`
          ]);
          setIsSimulating(false);
        }, 1200);
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isSimulating, currentSimStep, selectedAutomation]);

  // Filtered automations list
  const filteredAutomations = automations.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Trigger labels helper
  const getTriggerLabel = (id: string) => {
    return TRIGGER_OPTIONS.find((t) => t.id === id)?.label || id;
  };

  return (
    <div className="min-h-screen bg-background text-slate-100 p-6 md:p-8">
      <div className="max-w-6xl mx-auto w-full space-y-8">

        {/* ── VIEW 1: DASHBOARD LISTING ── */}
        {activeView === "list" && (
          <div className="space-y-6">
            {/* Header Block */}
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-6 gap-4 text-left">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">
                    HoneyBook Engine
                  </span>
                  <h1 className="text-2xl font-bold tracking-tight text-white font-serif">Workflow Automations</h1>
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  Build trigger-based action flows to automate communication, smart file requests, and internal task queues.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSeedStarters} className="border-white/10 text-slate-300 hover:bg-white/5">
                  <RefreshCw className="h-4 w-4 mr-2" /> Seed Starters
                </Button>
                <Button onClick={handleCreateNew} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold">
                  <Plus className="h-4 w-4 mr-2" /> New Automation
                </Button>
              </div>
            </div>

            <div className="flex items-center bg-[#07162B]/50 border border-white/5 rounded-xl px-4 py-2">
              <Sliders className="h-4 w-4 text-slate-400 mr-3" />
              <input
                type="text"
                placeholder="Search workflows, triggers, or description templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-0 text-white text-xs w-full focus:ring-0 focus:outline-none placeholder-slate-500"
              />
            </div>

            {filteredAutomations.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-white/5 rounded-2xl">
                <Zap className="h-12 w-12 text-slate-500/40 mx-auto mb-4" />
                <h3 className="text-base font-bold text-white mb-1">No automations configured</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Seed the starter templates or create a custom sequence to get started.
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
                    className="bg-[#07162B]/40 hover:bg-[#07162B]/60 border border-white/5 hover:border-amber-500/20 rounded-2xl p-5 cursor-pointer transition-all flex flex-col justify-between min-h-[190px] group text-left"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <h3 className="font-bold text-base text-white group-hover:text-amber-400 transition-colors">
                            {item.name}
                          </h3>
                          <p className="text-xs text-slate-400 leading-normal line-clamp-2 pr-4">
                            {item.description || "No description configured."}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-3.5">
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-900 border border-white/10 px-2 py-0.5 rounded text-slate-400">
                              Trigger: {getTriggerLabel(item.triggerEvent) || "Set trigger in sidebar"}
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded text-indigo-400">
                              {item.steps.length} {item.steps.length === 1 ? 'Step' : 'Steps'}
                            </span>
                            {item.isActive && (
                              <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-emerald-450">
                                Active
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Toggle active switch */}
                        <label className="relative inline-flex items-center cursor-pointer shrink-0" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={item.isActive}
                            onChange={() => handleToggleActive(item.id)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-950/80 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-amber-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500/20 peer-checked:border peer-checked:border-amber-500/35"></div>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <User className="h-3.5 w-3.5" />
                        <span>Active runs: {item.activeRunsCount} students</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => handleDelete(item.id, e)}
                        className="h-8 w-8 text-slate-500 hover:text-rose-455 hover:bg-rose-500/10 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── VIEW 2: HONEYBOOK STYLE CANVAS EDITOR ── */}
        {activeView === "edit" && selectedAutomation && (
          <div className="space-y-6">
            
            {/* Screenshot Header Bar */}
            <div className="flex items-center justify-between bg-[#07162B]/80 border border-white/10 rounded-xl p-3 md:px-5">
              <div className="flex items-center gap-3">
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
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={selectedAutomation.name}
                    onChange={(e) => {
                      const updated = { ...selectedAutomation, name: e.target.value };
                      setSelectedAutomation(updated);
                      saveAutomations(automations.map((a) => (a.id === selectedAutomation.id ? updated : a)));
                    }}
                    className="bg-transparent border-0 font-bold text-sm md:text-base text-white focus:ring-0 focus:outline-none p-0 w-48 md:w-72"
                  />
                  <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] uppercase tracking-wider font-mono">
                    {getTriggerLabel(selectedAutomation.triggerEvent) || "Trigger Pending"}
                  </Badge>
                </div>
                
                {/* Active switch */}
                <div className="h-4 w-px bg-white/10 mx-2" />
                <label className="relative inline-flex items-center cursor-pointer scale-90">
                  <input
                    type="checkbox"
                    checked={selectedAutomation.isActive}
                    onChange={() => {
                      const updated = { ...selectedAutomation, isActive: !selectedAutomation.isActive };
                      setSelectedAutomation(updated);
                      saveAutomations(automations.map((a) => (a.id === selectedAutomation.id ? updated : a)));
                      toast.success(updated.isActive ? "Automation activated" : "Automation paused");
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-950/80 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-amber-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500/20 peer-checked:border peer-checked:border-amber-500/35"></div>
                  <span className="text-[10px] text-slate-400 ml-2 font-bold uppercase tracking-wider group-data-[collapsible=icon]:hidden">
                    {selectedAutomation.isActive ? "Active" : "Draft"}
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSimLogs([]);
                    setIsSimulating(false);
                    setActiveView("simulate");
                  }}
                  className="border-white/10 text-slate-300 hover:bg-white/5 text-xs h-9 px-3.5"
                  disabled={!selectedAutomation.steps.length}
                >
                  <Play className="h-3.5 w-3.5 mr-1.5 fill-slate-300" /> Test run
                </Button>
                <Button
                  onClick={() => {
                    toast.success("Automation sequence saved to database!");
                  }}
                  className="bg-indigo-650 hover:bg-indigo-600 text-white text-xs h-9 px-4 font-bold"
                >
                  Save
                </Button>
                <Button
                  onClick={() => {
                    const updated = { ...selectedAutomation, isActive: true };
                    setSelectedAutomation(updated);
                    saveAutomations(automations.map((a) => (a.id === selectedAutomation.id ? updated : a)));
                    toast.success("Automation published & activated!");
                  }}
                  className="bg-amber-500 hover:bg-amber-450 text-slate-950 text-xs h-9 px-4 font-bold"
                >
                  Activate
                </Button>
              </div>
            </div>

            {/* Split layout: Canvas editor vs Config Drawer */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Canvas Board Area (Left 8 Cols) */}
              <div className="lg:col-span-8 bg-[#030e1e] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:18px_18px] border border-white/5 rounded-2xl p-6 min-h-[580px] relative flex flex-col justify-between overflow-hidden">
                
                {/* Visual Node Sequence Canvas */}
                <div className="flex-1 flex flex-col items-center justify-start py-8 space-y-6 relative">
                  
                  {/* Dotted Vertical Connector line */}
                  <div className="absolute left-1/2 top-14 bottom-14 w-0.5 border-l-2 border-dashed border-white/10 -translate-x-1/2 z-0" />

                  {/* Trigger Node Card (HoneyBook style) */}
                  <div
                    onClick={() => {
                      setConfiguringTrigger(true);
                      setActiveStepId(null);
                    }}
                    className={`relative z-10 w-full max-w-md bg-[#07162B]/95 border rounded-2xl p-4 flex items-center justify-between gap-4 cursor-pointer transition-all hover:scale-102 hover:shadow-xl ${
                      configuringTrigger 
                        ? "border-amber-500 shadow-md shadow-amber-500/5 bg-[#08182e]" 
                        : selectedAutomation.triggerEvent 
                          ? "border-white/10" 
                          : "border-rose-500/40 animate-pulse bg-rose-500/5"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 text-left">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                        <Zap className="h-5 w-5 animate-pulse" />
                      </div>
                      <div>
                        {selectedAutomation.triggerEvent ? (
                          <>
                            <h4 className="font-serif font-black text-sm text-white">{getTriggerLabel(selectedAutomation.triggerEvent)}</h4>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 block">Trigger Event</span>
                          </>
                        ) : (
                          <>
                            <h4 className="font-sans font-bold text-sm text-rose-350">Set a trigger in the sidebar</h4>
                            <span className="text-[9px] font-bold text-rose-455 uppercase tracking-widest mt-0.5 block">Trigger Required</span>
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
                      No actions in this automation flow. Click the "+" button to add an email or task.
                    </div>
                  ) : (
                    selectedAutomation.steps.map((step, idx) => {
                      const isSelected = activeStepId === step.id;
                      const hasCondition = step.config?.hasCondition;
                      return (
                        <React.Fragment key={step.id}>
                          {/* Action Node Card (HoneyBook style) */}
                          <div
                            onClick={() => {
                              setActiveStepId(step.id);
                              setConfiguringTrigger(false);
                            }}
                            className={`relative z-10 w-full max-w-md bg-[#07162B]/95 border rounded-2xl p-4 flex items-center justify-between gap-4 cursor-pointer transition-all hover:scale-102 hover:shadow-xl ${
                              isSelected ? "border-indigo-500 shadow-md shadow-indigo-500/5 bg-[#08182e]" : "border-white/10"
                            }`}
                          >
                            <div className="flex items-center gap-3.5 text-left min-w-0 flex-1">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-inner ${
                                step.type === "email" ? "bg-indigo-500/10 border-indigo-500/25 text-indigo-400" :
                                step.type === "file" ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-450" :
                                "bg-amber-500/10 border-amber-500/25 text-amber-450"
                              }`}>
                                {step.type === "email" && <Mail className="h-4.5 w-4.5" />}
                                {step.type === "file" && <FileText className="h-4.5 w-4.5" />}
                                {step.type === "task" && <CheckSquare className="h-4.5 w-4.5" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                    {step.type === "email" && "Send Email"}
                                    {step.type === "file" && "Send Smart File"}
                                    {step.type === "task" && "Create Task"}
                                  </span>
                                  <span className="text-[9px] font-semibold bg-slate-950/60 px-1.5 py-0.5 rounded text-slate-500 flex items-center gap-0.5">
                                    <Clock className="h-3 w-3 text-slate-500" />
                                    {step.delayValue === 0 ? 'Immediately' : `${step.delayValue} ${step.delayUnit}`}
                                  </span>
                                  {hasCondition && (
                                    <span className="text-[8px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                      <Split className="h-2.5 w-2.5" />
                                      Rule
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-serif font-black text-sm text-white mt-1 truncate">{step.title}</h4>
                                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                  {step.type === "email" && `Template: ${step.config.templateName || 'Welcome response'}`}
                                  {step.type === "file" && `Smart File: ${step.config.fileName || 'Intake questionnaire'}`}
                                  {step.type === "task" && `Task: ${step.config.taskTitle || 'Review file'} (Priority: ${step.config.taskPriority || 'medium'})`}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {step.type === "email" && step.config.templateId && (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewTemplateId(step.config.templateId || null);
                                  }}
                                  className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={(e) => handleDeleteStep(step.id, e)}
                                className="h-8 w-8 text-slate-500 hover:text-rose-455 hover:bg-rose-500/10 rounded-lg"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Inline plus trigger to add next step */}
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
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">End automation</span>
                  </div>

                </div>

                {/* Bottom-left zoom controls widget (HoneyBook style) */}
                <div className="absolute bottom-4 left-4 bg-slate-950/80 border border-white/10 rounded-lg p-1 flex items-center gap-1.5 shadow-lg select-none">
                  <button
                    onClick={() => setZoomLevel(100)}
                    className="h-6 px-1.5 rounded text-[10px] font-bold text-slate-400 hover:text-white hover:bg-white/5 flex items-center gap-0.5"
                    title="Fit Canvas"
                  >
                    <Maximize className="h-3 w-3" />
                    <span>{zoomLevel}%</span>
                  </button>
                  <div className="w-px h-3.5 bg-white/15" />
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
                    className="h-6 w-6 rounded text-slate-400 hover:text-white hover:bg-white/5 flex items-center justify-center"
                    title="Zoom Out"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                    className="h-6 w-6 rounded text-slate-400 hover:text-white hover:bg-white/5 flex items-center justify-center"
                    title="Zoom In"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                </div>

              </div>

              {/* Sidebar Config Panel Drawer (Right 4 Cols) */}
              <div className="lg:col-span-4 bg-[#07162B]/40 border border-white/5 rounded-2xl p-6 text-left space-y-6 self-start max-h-[600px] overflow-y-auto">
                
                {/* ── SUB-VIEW A: SELECT A TRIGGER (Drawer state) ── */}
                {configuringTrigger ? (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4.5 w-4.5 text-amber-400" />
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Select a trigger</h3>
                      </div>
                      <button
                        onClick={() => setConfiguringTrigger(false)}
                        className="text-slate-450 hover:text-white rounded"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Choose the event that initiates this automated flow. You can change this trigger at any time.
                    </p>

                    {/* Grouped triggers categories */}
                    <div className="space-y-5">
                      {TRIGGER_CATEGORIES.map((category) => {
                        const categoryTriggers = TRIGGER_OPTIONS.filter((t) => t.category === category);
                        if (categoryTriggers.length === 0) return null;
                        return (
                          <div key={category} className="space-y-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block border-b border-white/5 pb-1">
                              {category}
                            </span>
                            <div className="space-y-1.5">
                              {categoryTriggers.map((trig) => (
                                <button
                                  key={trig.id}
                                  type="button"
                                  onClick={() => {
                                    if (selectedAutomation) {
                                      const updated = { ...selectedAutomation, triggerEvent: trig.id };
                                      setSelectedAutomation(updated);
                                      saveAutomations(automations.map((a) => (a.id === selectedAutomation.id ? updated : a)));
                                      setConfiguringTrigger(false);
                                      toast.success(`Workflow trigger set to: "${trig.label}"`);
                                    }
                                  }}
                                  className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex flex-col gap-0.5 group ${
                                    selectedAutomation.triggerEvent === trig.id
                                      ? "bg-amber-500/10 border-amber-500 text-white font-semibold"
                                      : "bg-slate-900 border-white/5 text-slate-400 hover:border-white/10 hover:bg-slate-900/60"
                                  }`}
                                >
                                  <span className="text-white group-hover:text-amber-400 transition-colors">
                                    {trig.label}
                                  </span>
                                  <span className="text-[9px] text-slate-550 leading-normal">
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
                    <div className="border-t border-white/5 pt-4 mt-4">
                      <Button
                        type="button"
                        onClick={() => {
                          setNewTriggerText("");
                          setRequestTriggerOpen(true);
                        }}
                        className="w-full bg-[#0b1e36] hover:bg-[#122846] border border-white/10 text-slate-300 text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5"
                      >
                        <HelpCircle className="h-4 w-4 text-indigo-400" />
                        <span>Request New Trigger</span>
                      </Button>
                    </div>

                  </div>
                ) : activeStepId ? (
                  /* ── SUB-VIEW B: CONFIGURE ACTION STEP ── */
                  (() => {
                    const step = selectedAutomation.steps.find((s) => s.id === activeStepId);
                    if (!step) return null;
                    return (
                      <div className="space-y-6 animate-fade-in">
                        
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <div className="flex items-center gap-2">
                            <Sliders className="h-4.5 w-4.5 text-indigo-400" />
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Configure Action</h3>
                          </div>
                          <button
                            onClick={() => setActiveStepId(null)}
                            className="text-slate-450 hover:text-white rounded"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Step type selector */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-350">Action Node Type</label>
                          <select
                            value={step.type}
                            onChange={(e) => handleUpdateStep(step.id, { type: e.target.value as any })}
                            className="w-full bg-slate-900 border border-white/10 text-white rounded-lg p-2.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="email">Send Automated Email</option>
                            <option value="file">Send Portal Smart File</option>
                            <option value="task">Create Internal Team Task</option>
                          </select>
                        </div>

                        {/* Title label input */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-350">Step Action Title</label>
                          <input
                            type="text"
                            value={step.title}
                            onChange={(e) => handleUpdateStep(step.id, { title: e.target.value })}
                            className="w-full bg-slate-900 border border-white/10 text-white rounded-lg p-2.5 text-xs focus:border-indigo-500"
                          />
                        </div>

                        {/* Timing Config delays */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-350 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            Timing & Delays
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="0"
                              value={step.delayValue}
                              onChange={(e) => handleUpdateStep(step.id, { delayValue: parseInt(e.target.value, 10) || 0 })}
                              className="w-16 bg-slate-900 border border-white/10 text-white rounded-lg p-2 text-xs text-center focus:border-indigo-500"
                            />
                            <select
                              value={step.delayUnit}
                              onChange={(e) => handleUpdateStep(step.id, { delayUnit: e.target.value as any })}
                              className="flex-1 bg-slate-900 border border-white/10 text-white rounded-lg p-2 text-xs focus:border-indigo-500"
                            >
                              <option value="minutes">Minutes</option>
                              <option value="hours">Hours</option>
                              <option value="days">Days</option>
                              <option value="weeks">Weeks</option>
                            </select>
                          </div>

                          <select
                            value={step.delayAnchor}
                            onChange={(e) => handleUpdateStep(step.id, { delayAnchor: e.target.value as any })}
                            className="w-full bg-slate-900 border border-white/10 text-white rounded-lg p-2 text-xs mt-2 focus:border-indigo-500"
                          >
                            <option value="after_trigger">After Initial Trigger</option>
                            <option value="after_prev">After Previous Step Completed</option>
                            <option value="before_event">Before Scheduled Event Date</option>
                            <option value="after_event">After Scheduled Event Date</option>
                          </select>
                        </div>

                        {/* Node Config detail options */}
                        <div className="border-t border-white/5 pt-4 space-y-4">
                          {step.type === "email" && (
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-350">Email Template Target</label>
                                <select
                                  value={step.config.templateId || ""}
                                  onChange={(e) => {
                                    const opt = e.target.selectedOptions[0];
                                    handleUpdateStepConfig(step.id, {
                                      templateId: e.target.value,
                                      templateName: opt.text
                                    });
                                  }}
                                  className="w-full bg-slate-900 border border-white/10 text-white rounded-lg p-2.5 text-xs focus:border-indigo-500"
                                >
                                  <option value="welcome-email">Advocate Welcome & Calendar Invite</option>
                                  <option value="iep-parent-prep">IEP Prep: Parent Goal Formulation Guide</option>
                                  <option value="pwn-review">Post-IEP: PWN Document Review Checklist</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Email Subject</span>
                                <div className="bg-slate-950/60 border border-white/5 rounded-lg p-2.5 text-xs text-slate-350 truncate">
                                  {step.config.emailSubject || "Workflow message"}
                                </div>
                              </div>

                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setPreviewTemplateId(step.config.templateId || null)}
                                className="w-full border-white/10 text-slate-300 hover:bg-white/5 text-xs"
                              >
                                <Eye className="h-3.5 w-3.5 mr-2" /> View Email Text
                              </Button>
                            </div>
                          )}

                          {step.type === "file" && (
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-350">Attachment Smart File</label>
                              <select
                                value={step.config.fileName || ""}
                                onChange={(e) => handleUpdateStepConfig(step.id, { fileName: e.target.value })}
                                className="w-full bg-slate-900 border border-white/10 text-white rounded-lg p-2.5 text-xs focus:border-indigo-500"
                              >
                                <option value="Client IEP Onboarding Form">Client IEP Onboarding Form</option>
                                <option value="Standard Service Agreement">Standard Service Agreement</option>
                                <option value="Classroom Accommodations sheet">Classroom Accommodations Checklist</option>
                              </select>
                            </div>
                          )}

                          {step.type === "task" && (
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-350">Task Description</label>
                                <textarea
                                  value={step.config.taskTitle || ""}
                                  onChange={(e) => handleUpdateStepConfig(step.id, { taskTitle: e.target.value })}
                                  className="w-full h-20 bg-slate-900 border border-white/10 rounded-lg p-2 text-xs focus:border-indigo-500"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-350">Task Priority Level</label>
                                <div className="grid grid-cols-3 gap-2">
                                  {["low", "medium", "high"].map((p) => (
                                    <button
                                      key={p}
                                      type="button"
                                      onClick={() => handleUpdateStepConfig(step.id, { taskPriority: p })}
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

                        {/* CONDITIONAL LOGIC */}
                        <div className="border-t border-white/5 pt-4 space-y-4">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={step.config.hasCondition || false} 
                              onChange={(e) => handleUpdateStepConfig(step.id, { hasCondition: e.target.checked })} 
                              className="rounded border-white/10 bg-slate-900 text-indigo-650 focus:ring-0 focus:ring-offset-0 h-4 w-4"
                            />
                            <span className="text-xs font-bold text-slate-350">Apply Conditional Logic Rule</span>
                          </label>

                          {step.config.hasCondition && (
                            <div className="space-y-3 bg-slate-950/40 p-3 rounded-lg border border-white/5">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Condition Field</label>
                                <select
                                  value={step.config.conditionField || "student_tag"}
                                  onChange={(e) => handleUpdateStepConfig(step.id, { conditionField: e.target.value })}
                                  className="w-full bg-slate-900 border border-white/10 text-white rounded p-1 text-[11px]"
                                >
                                  <option value="student_tag">Student Tag</option>
                                  <option value="contact_status">Contact Status</option>
                                  <option value="contract_status">Contract Status</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operator</label>
                                <select
                                  value={step.config.conditionOperator || "equals"}
                                  onChange={(e) => handleUpdateStepConfig(step.id, { conditionOperator: e.target.value })}
                                  className="w-full bg-slate-900 border border-white/10 text-white rounded p-1 text-[11px]"
                                >
                                  <option value="equals">Equals</option>
                                  <option value="contains">Contains</option>
                                  <option value="not_equals">Does Not Equal</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Value to Compare</label>
                                <input
                                  type="text"
                                  value={step.config.conditionValue || ""}
                                  onChange={(e) => handleUpdateStepConfig(step.id, { conditionValue: e.target.value })}
                                  placeholder="e.g. IEP, lead, active, signed"
                                  className="w-full bg-slate-900 border border-white/10 text-white rounded p-1 text-[11px]"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="border-t border-white/5 pt-4">
                          <Button
                            onClick={() => setActiveStepId(null)}
                            className="w-full bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold"
                          >
                            Confirm & Save Config
                          </Button>
                        </div>

                      </div>
                    );
                  })()
                ) : (
                  /* ── SUB-VIEW C: IDLE INSTRUCTIONS ── */
                  <div className="py-12 text-center text-slate-500 space-y-3">
                    <Settings className="h-8 w-8 text-slate-500/40 mx-auto" />
                    <p className="text-xs max-w-[200px] mx-auto leading-relaxed">
                      Click the **Trigger Node** or any **Action Card** in the center sequence canvas to configure its settings.
                    </p>
                    <div className="pt-4 border-t border-white/5 mt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setConfiguringTrigger(true);
                          setActiveStepId(null);
                        }}
                        className="w-full border-white/10 text-slate-300 text-xs"
                      >
                        Change Flow Trigger
                      </Button>
                    </div>
                  </div>
                )}

              </div>

            </div>
          </div>
        )}

        {/* ── VIEW 3: FLOW SIMULATOR DRY RUN ── */}
        {activeView === "simulate" && selectedAutomation && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
            
            {/* Simulation Setup card (Left 5 Cols) */}
            <div className="lg:col-span-5 bg-[#07162B]/40 border border-white/5 rounded-2xl p-6 space-y-6 self-start">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Play className="h-4 w-4 text-emerald-400 fill-emerald-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Simulation Workspace</h3>
              </div>

              {/* Student linkage Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-350">Choose Target Student Profile</label>
                <select 
                  value={selectedContactId || ""}
                  onChange={(e) => setSelectedContactId(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="w-full bg-slate-900 border border-white/10 text-white rounded-lg p-2.5 text-xs focus:border-indigo-500"
                >
                  {contactsList?.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.firstName} {contact.lastName} (Student ID: {contact.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-[#0b1e36]/30 rounded-xl p-4 border border-white/5 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-indigo-400" />
                  Sequence Dry Run Specs
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Executing this test mock models actual trigger callbacks without modifying live database states. This tests schema routing constraints, timing variables, and email template dispatch blocks.
                </p>
                <div className="text-[10px] text-slate-400 space-y-2 border-t border-white/5 pt-2 mt-2">
                  <div><strong>Total Steps queued:</strong> {selectedAutomation.steps.length}</div>
                  <div><strong>Triggering event:</strong> {getTriggerLabel(selectedAutomation.triggerEvent) || "Manual Trigger"}</div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={startSimulation}
                  disabled={isSimulating}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  {isSimulating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 mr-2 fill-white" />
                      Trigger Flow
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsSimulating(false);
                    setSimLogs([]);
                    setActiveView("edit");
                  }}
                  className="border-white/10 hover:bg-white/5 text-slate-350 font-bold"
                >
                  Cancel
                </Button>
              </div>
            </div>

            {/* Simulation Logger terminal (Right 7 Cols) */}
            <div className="lg:col-span-7 bg-slate-950 border border-white/5 rounded-2xl p-6 flex flex-col justify-between min-h-[420px]">
              <div className="border-b border-white/5 pb-3 flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">Live Simulation Log Console</span>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-450 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                  {isSimulating ? "Simulation Active" : "Console Ready"}
                </span>
              </div>

              {/* Logs display */}
              <div className="flex-1 my-4 bg-black/60 rounded-xl p-4 border border-white/5 font-mono text-[11px] leading-relaxed text-slate-350 space-y-2 h-72 overflow-y-auto">
                {simLogs.length === 0 ? (
                  <p className="text-slate-650 italic text-center py-24">Waiting to initialize simulation triggers...</p>
                ) : (
                  simLogs.map((log, idx) => (
                    <div key={idx} className="animate-slide-up">
                      <span className="text-slate-400">{log}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-white/5 pt-4 text-slate-550 text-[10px] leading-normal flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 text-slate-500" />
                <p>
                  All simulated actions generated above mimic standard integrations logic. Dispatched templates use context parameters (student name, advocate profile) to ensure templates format properly.
                </p>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ── EMAIL TEMPLATE PREVIEW MODAL OVERLAY ── */}
      {previewTemplateId && EMAIL_TEMPLATES[previewTemplateId] && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm text-left">
          <div className="w-full max-w-2xl bg-[#081628] border border-white/10 rounded-2xl shadow-2xl p-6 relative flex flex-col max-h-[90vh]">
            <button
              onClick={() => setPreviewTemplateId(null)}
              className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-lg bg-slate-900 border border-white/10 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-4">
              <Mail className="h-5 w-5 text-indigo-400" />
              <div>
                <h3 className="font-bold text-sm text-white">Email Node Template Preview</h3>
                <p className="text-[10px] text-slate-400">Verifying live personalization token mappings</p>
              </div>
            </div>

            {/* Simulated selector for student variables */}
            <div className="bg-slate-900 border border-white/5 rounded-xl p-3 flex items-center justify-between gap-4 mb-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Simulate Student:</span>
              <select
                value={previewTargetName}
                onChange={(e) => setPreviewTargetName(e.target.value)}
                className="bg-slate-950 border border-white/10 text-white rounded p-1 text-[10px] focus:ring-0 focus:outline-none"
              >
                <option value="Baaarbra Sheep">Baaarbra Sheep</option>
                <option value="Shawn Sheep">Shawn Sheep (Parent Portal)</option>
                <option value="Jimmy Lamb">Jimmy Lamb</option>
              </select>
            </div>

            {/* Email Container preview */}
            <div className="flex-1 bg-slate-950 border border-white/5 rounded-xl p-5 overflow-y-auto space-y-4 text-xs font-sans text-slate-350">
              <div className="space-y-1.5 border-b border-white/5 pb-3">
                <div><span className="text-slate-500 font-semibold">Subject:</span> <span className="text-white font-bold">{EMAIL_TEMPLATES[previewTemplateId].subject.replace("{{studentName}}", previewTargetName)}</span></div>
                <div><span className="text-slate-500 font-semibold">From:</span> <span className="text-slate-300">Byron Honea &lt;byron@waypointadvocates.com&gt;</span></div>
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed font-sans text-slate-300">
                {EMAIL_TEMPLATES[previewTemplateId].body.replace("{{studentName}}", previewTargetName)}
              </pre>
            </div>

            <div className="border-t border-white/5 pt-4 mt-4 flex justify-end gap-2">
              <Button
                onClick={() => setPreviewTemplateId(null)}
                className="bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold px-5"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── REQUEST NEW TRIGGER DIALOG MODAL ── */}
      {requestTriggerOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm text-left animate-fade-in">
          <div className="w-full max-w-md bg-[#081628] border border-white/10 rounded-2xl shadow-2xl p-6 relative flex flex-col">
            <button
              onClick={() => setRequestTriggerOpen(false)}
              className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-lg bg-slate-900 border border-white/10 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2.5 border-b border-white/5 pb-4 mb-4">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              <div>
                <h3 className="font-bold text-sm text-white">Request New Trigger Event</h3>
                <p className="text-[10px] text-slate-400">Submit a request to our tech department to add a custom event</p>
              </div>
            </div>

            <form onSubmit={handleSubmitTriggerRequest} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-350">Describe the trigger event & condition</label>
                <textarea
                  required
                  rows={4}
                  value={newTriggerText}
                  onChange={(e) => setNewTriggerText(e.target.value)}
                  placeholder="e.g., Trigger when school calendar changes, or when advocate logs a voice memo note"
                  className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-white/5 pt-4 mt-2">
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
                  disabled={isSubmittingTriggerRequest}
                  className="bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold px-5"
                >
                  {isSubmittingTriggerRequest ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Submit Request"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
