import React, { useState } from "react";
import { Link } from "wouter";
import {
  Search,
  Mail,
  Clock,
  CheckSquare,
  FileText,
  UserPlus,
  ClipboardCheck,
  Calendar,
  Users,
  Lightbulb,
  Layers,
  MoreHorizontal,
  User,
  ArrowRight,
  Pencil,
  Zap,
  Play,
  Copy,
  Trash2,
  CheckCircle2,
} from "lucide-react";

export interface ShowcaseTimelineNode {
  id: string;
  icon: "user" | "clock" | "mail" | "check" | "file" | "zap";
  title: string;
  subtitle: string;
  branchPill?: {
    title: string;
    subtitle: string;
  };
}

export interface ShowcaseWorkflowMeta {
  shortSubtitle: string;
  rowIcon: "inquiry" | "intake" | "calendar" | "meeting" | "post_meeting" | "zap";
  timelineNodes?: ShowcaseTimelineNode[];
}

export const SHOWCASE_WORKFLOW_PRESETS: Record<string, ShowcaseWorkflowMeta> = {
  "New inquiry welcome": {
    shortSubtitle: "Welcome new families immediately and guide them to their first step.",
    rowIcon: "inquiry",
    timelineNodes: [
      {
        id: "n-1",
        icon: "user",
        title: "New inquiry submitted",
        subtitle: "Trigger: when a family submits the lead inquiry form.",
      },
      {
        id: "n-2",
        icon: "mail",
        title: "Send welcome message & next steps",
        subtitle: "Deliver warm introduction and Discovery Call scheduling link.",
        branchPill: {
          title: "Call booked?",
          subtitle: "Advance to Discovery Prep",
        },
      },
      {
        id: "n-3",
        icon: "file",
        title: "Assign Student Intake Smart File",
        subtitle: "Share confidential intake questionnaire in the Parent Portal.",
      },
      {
        id: "n-4",
        icon: "check",
        title: "Create advocate triage task",
        subtitle: "Prompt the assigned advocate to review district urgency within 24h.",
      },
    ],
  },
  "Intake questionnaire review": {
    shortSubtitle: "Notify the assigned advocate and queue preparation as soon as intake is complete.",
    rowIcon: "intake",
    timelineNodes: [
      {
        id: "n-1",
        icon: "file",
        title: "Intake questionnaire completed",
        subtitle: "Trigger: when a family submits their intake questionnaire.",
      },
      {
        id: "n-2",
        icon: "mail",
        title: "Confirm receipt with family",
        subtitle: "Reassure the family that their student records are under review.",
      },
      {
        id: "n-3",
        icon: "check",
        title: "Create baseline IEP & evaluation prep task",
        subtitle: "Assign deep record review task to the Lead Special Education Advocate.",
        branchPill: {
          title: "Records missing?",
          subtitle: "Queue FERPA request",
        },
      },
    ],
  },
  "Not yet • Stay in touch": {
    shortSubtitle: "Keep the connection until the timing is right.",
    rowIcon: "calendar",
    timelineNodes: [
      {
        id: "n-1",
        icon: "user",
        title: "Lead marked Not yet",
        subtitle: "Trigger: when a lead is updated to Not yet.",
      },
      {
        id: "n-2",
        icon: "clock",
        title: "Wait until follow-up date",
        subtitle: "Hold until the next planned follow-up date.",
      },
      {
        id: "n-3",
        icon: "mail",
        title: "Send a personal check-in",
        subtitle: "Send a friendly, helpful message to keep the connection warm.",
        branchPill: {
          title: "Ready now?",
          subtitle: "Return to Lead Center",
        },
      },
      {
        id: "n-4",
        icon: "check",
        title: "Create a task if no reply",
        subtitle: "If there's no reply within a few days, create a follow-up task for the advocate.",
      },
    ],
  },
  "Meeting preparation": {
    shortSubtitle: "Ensure every family and advocate walks into the IEP meeting prepared.",
    rowIcon: "meeting",
    timelineNodes: [
      {
        id: "n-1",
        icon: "user",
        title: "IEP or Strategy Meeting scheduled",
        subtitle: "Trigger: when a meeting is booked on the calendar.",
      },
      {
        id: "n-2",
        icon: "clock",
        title: "Wait until 7 days before meeting",
        subtitle: "Hold until the 7-day pre-meeting preparation window opens.",
      },
      {
        id: "n-3",
        icon: "mail",
        title: "Send parent preparation note & agenda guide",
        subtitle: "Share the Parent Goal & Priority Formulation checklist.",
        branchPill: {
          title: "Draft IEP received?",
          subtitle: "Open IEP Comparator",
        },
      },
      {
        id: "n-4",
        icon: "check",
        title: "Create advocate prep task",
        subtitle: "Finalize the Meeting Blueprint and accommodation delta brief 48h prior.",
      },
    ],
  },
  "Post-meeting follow-up": {
    shortSubtitle: "Capture momentum after the meeting and monitor the school district's PWN.",
    rowIcon: "post_meeting",
    timelineNodes: [
      {
        id: "n-1",
        icon: "user",
        title: "Meeting concludes",
        subtitle: "Trigger: after a scheduled IEP or strategy session ends.",
      },
      {
        id: "n-2",
        icon: "mail",
        title: "Send thank-you with next steps",
        subtitle: "Deliver post-meeting summary and Prior Written Notice (PWN) watch checklist.",
      },
      {
        id: "n-3",
        icon: "clock",
        title: "Wait 5 days for district PWN",
        subtitle: "Hold while awaiting the school district's written proposal.",
        branchPill: {
          title: "PWN uploaded?",
          subtitle: "Launch PWN Decoder",
        },
      },
      {
        id: "n-4",
        icon: "check",
        title: "Create follow-up task for advocate",
        subtitle: "Audit final PWN against agreed meeting accommodations and goals.",
      },
    ],
  },
};

export const SIGNATURE_SHOWCASE_AUTOMATIONS = [
  {
    id: "showcase-new-inquiry",
    name: "New inquiry welcome",
    description:
      "When a new inquiry is submitted, send a welcome message and next steps.",
    triggerEvent: "inquiry_received",
    isActive: true,
    activeRunsCount: 0,
    steps: [
      {
        id: "sc-1-1",
        type: "email" as const,
        title: "Send welcome message and next steps",
        delayValue: 0,
        delayUnit: "minutes" as const,
        delayAnchor: "after_trigger" as const,
        config: {
          templateId: "tpl_intake_welcome",
          templateName: "Lead Inquiry Welcome & Discovery Guide",
          emailSubject:
            "Welcome to Waypoint Advocates — Next steps for {{studentName}}",
        },
      },
      {
        id: "sc-1-2",
        type: "file" as const,
        title: "Assign Student Intake Smart File",
        delayValue: 15,
        delayUnit: "minutes" as const,
        delayAnchor: "after_trigger" as const,
        config: {
          fileId: "1",
          fileName: "Intake Questionnaire & IEP Records Upload",
          notifyParentByEmail: true,
        },
      },
      {
        id: "sc-1-3",
        type: "task" as const,
        title: "Create advocate triage task",
        delayValue: 1,
        delayUnit: "days" as const,
        delayAnchor: "after_trigger" as const,
        config: {
          taskTitle: "Review new inquiry and upcoming IEP dates for {{studentName}}",
          taskPriority: "high" as const,
          createImmediateTaskWithDueDate: true,
        },
      },
    ],
  },
  {
    id: "showcase-intake-review",
    name: "Intake questionnaire review",
    description:
      "When a family completes the intake questionnaire, notify the assigned advocate and create a prep task.",
    triggerEvent: "form_completed",
    isActive: true,
    activeRunsCount: 0,
    steps: [
      {
        id: "sc-2-1",
        type: "email" as const,
        title: "Confirm questionnaire receipt with family",
        delayValue: 0,
        delayUnit: "minutes" as const,
        delayAnchor: "after_trigger" as const,
        config: {
          templateId: "welcome-email",
          templateName: "Advocate Welcome & Calendar Invite",
          emailSubject:
            "We received {{studentName}}'s intake questionnaire — Advocate review underway",
        },
      },
      {
        id: "sc-2-2",
        type: "task" as const,
        title: "Notify assigned advocate & create prep task",
        delayValue: 2,
        delayUnit: "hours" as const,
        delayAnchor: "after_trigger" as const,
        config: {
          taskTitle:
            "Review completed intake questionnaire & historical IEPs for {{studentName}}",
          taskPriority: "high" as const,
          createImmediateTaskWithDueDate: true,
        },
      },
    ],
  },
  {
    id: "showcase-not-yet",
    name: "Not yet • Stay in touch",
    description:
      "When a lead is marked Not yet, stay in touch with timely, helpful follow-up until they're ready.",
    triggerEvent: "stage_changed",
    isActive: true,
    activeRunsCount: 0,
    steps: [
      {
        id: "sc-3-1",
        type: "email" as const,
        title: "Send a personal check-in",
        delayValue: 14,
        delayUnit: "days" as const,
        delayAnchor: "after_trigger" as const,
        config: {
          templateId: "welcome-email",
          templateName: "Advocate Welcome & Calendar Invite",
          emailSubject:
            "Thinking of {{studentName}} — Checking in from Waypoint Advocates",
        },
      },
      {
        id: "sc-3-2",
        type: "task" as const,
        title: "Create a task if no reply",
        delayValue: 3,
        delayUnit: "days" as const,
        delayAnchor: "after_prev" as const,
        config: {
          taskTitle:
            "If no reply within a few days, follow up with {{parentName}} regarding {{studentName}}",
          taskPriority: "medium" as const,
          createImmediateTaskWithDueDate: true,
        },
      },
    ],
  },
  {
    id: "showcase-meeting-prep",
    name: "Meeting preparation",
    description:
      "When a meeting is scheduled, send a preparation note and create a prep task.",
    triggerEvent: "session_booked",
    isActive: true,
    activeRunsCount: 0,
    steps: [
      {
        id: "sc-4-1",
        type: "email" as const,
        title: "Send preparation note & parent goal guide",
        delayValue: 7,
        delayUnit: "days" as const,
        delayAnchor: "before_event" as const,
        config: {
          templateId: "iep-parent-prep",
          templateName: "IEP Prep: Parent Goal Formulation Guide",
          emailSubject:
            "Preparing for {{studentName}}'s upcoming meeting — Parent Priority Guide",
        },
      },
      {
        id: "sc-4-2",
        type: "task" as const,
        title: "Create advocate prep task",
        delayValue: 2,
        delayUnit: "days" as const,
        delayAnchor: "before_event" as const,
        config: {
          taskTitle: "Complete IEP Comparator & Blueprint prep for {{studentName}}",
          taskPriority: "high" as const,
          createImmediateTaskWithDueDate: true,
        },
      },
    ],
  },
  {
    id: "showcase-post-meeting",
    name: "Post-meeting follow-up",
    description:
      "After a meeting, send a thank-you with next steps and create a follow-up task.",
    triggerEvent: "after_meeting_ends",
    isActive: false,
    activeRunsCount: 0,
    steps: [
      {
        id: "sc-5-1",
        type: "email" as const,
        title: "Send thank-you with next steps",
        delayValue: 2,
        delayUnit: "hours" as const,
        delayAnchor: "after_event" as const,
        config: {
          templateId: "pwn-review",
          templateName: "Post-IEP: PWN Document Review Checklist",
          emailSubject:
            "Thank you for meeting today — Next steps & PWN checklist for {{studentName}}",
        },
      },
      {
        id: "sc-5-2",
        type: "task" as const,
        title: "Create follow-up task",
        delayValue: 5,
        delayUnit: "days" as const,
        delayAnchor: "after_event" as const,
        config: {
          taskTitle:
            "Verify school district Prior Written Notice (PWN) delivery for {{studentName}}",
          taskPriority: "high" as const,
          createImmediateTaskWithDueDate: true,
        },
      },
    ],
  },
];

interface AutomationsMasterDetailViewProps {
  automations: any[];
  selectedAutomation: any | null;
  onSelectAutomation: (item: any) => void;
  onEditWorkflow: (item: any) => void;
  onToggleActive: (id: string) => void;
  onDuplicate: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onRunNow: (item: any) => void;
  onViewActivity: () => void;
  onSuggestAutomation: () => void;
  onBrowseTemplates: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  stats: any;
  getTriggerLabel: (triggerId: string) => string;
}

export function AutomationsMasterDetailView({
  automations,
  selectedAutomation,
  onSelectAutomation,
  onEditWorkflow,
  onToggleActive,
  onDuplicate,
  onDelete,
  onRunNow,
  onViewActivity,
  onSuggestAutomation,
  onBrowseTemplates,
  searchQuery,
  onSearchChange,
  stats,
  getTriggerLabel,
}: AutomationsMasterDetailViewProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft">("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filteredList = automations.filter((item) => {
    const matchesSearch =
      !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      statusFilter === "all" ||
      (statusFilter === "active" && item.isActive) ||
      (statusFilter === "draft" && !item.isActive);
    return matchesSearch && matchesFilter;
  });

  const activeSelection =
    selectedAutomation ||
    filteredList.find((a) => a.name === "Not yet • Stay in touch") ||
    filteredList[0] ||
    automations[0] ||
    null;

  const activeCount = automations.filter((a) => a.isActive).length;
  const runningCount = Number(stats?.runningRuns ?? 0);
  const needAttentionCount =
    Number(stats?.failedRuns ?? 0) + Number(stats?.heldOverdueJobs ?? 0);
  const isEmailConfigured = Boolean(stats?.emailProvider?.configured);

  const renderRowIcon = (item: any, isSelected: boolean) => {
    const preset = SHOWCASE_WORKFLOW_PRESETS[item.name];
    const iconType = preset?.rowIcon;
    const baseBox = `w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
      isSelected
        ? "bg-[#152E54] border-[#C5A059]/60 text-[#FFE394]"
        : "bg-[#091830] border-[#1E3354] text-[#C5A059]"
    }`;

    if (iconType === "inquiry" || item.triggerEvent === "inquiry_received") {
      return (
        <div className={baseBox}>
          <UserPlus className="w-4 h-4" />
        </div>
      );
    }
    if (iconType === "intake" || item.triggerEvent === "form_completed") {
      return (
        <div className={baseBox}>
          <ClipboardCheck className="w-4 h-4" />
        </div>
      );
    }
    if (iconType === "calendar" || item.name.includes("Not yet")) {
      return (
        <div className={baseBox}>
          <Calendar className="w-4 h-4" />
        </div>
      );
    }
    if (
      iconType === "meeting" ||
      item.triggerEvent === "session_booked" ||
      item.triggerEvent === "meeting_scheduled"
    ) {
      return (
        <div className={baseBox}>
          <Users className="w-4 h-4" />
        </div>
      );
    }
    if (iconType === "post_meeting" || item.triggerEvent === "after_meeting_ends") {
      return (
        <div className={baseBox}>
          <Mail className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className={baseBox}>
        <Zap className="w-4 h-4" />
      </div>
    );
  };

  // Build timeline nodes for the right-hand preview pane
  const buildTimelineNodes = (item: any): ShowcaseTimelineNode[] => {
    if (!item) return [];
    const preset = SHOWCASE_WORKFLOW_PRESETS[item.name];
    if (preset?.timelineNodes) {
      return preset.timelineNodes;
    }

    const nodes: ShowcaseTimelineNode[] = [
      {
        id: "trig-node",
        icon: "user",
        title: getTriggerLabel(item.triggerEvent) || "Workflow Trigger",
        subtitle: `Trigger: when ${getTriggerLabel(item.triggerEvent).toLowerCase()} occurs.`,
      },
    ];

    (item.steps || []).forEach((step: any, idx: number) => {
      if (step.delayValue > 0) {
        nodes.push({
          id: `wait-${step.id || idx}`,
          icon: "clock",
          title: `Wait ${step.delayValue} ${step.delayUnit}`,
          subtitle: `Hold ${step.delayValue} ${step.delayUnit} (${(step.delayAnchor || "after_trigger").replace("_", " ")}).`,
        });
      }
      nodes.push({
        id: `step-${step.id || idx}`,
        icon:
          step.type === "email"
            ? "mail"
            : step.type === "file"
              ? "file"
              : "check",
        title: step.title,
        subtitle:
          step.type === "email"
            ? step.config?.emailSubject ||
              "Send a personalized follow-up email to the family."
            : step.type === "file"
              ? `Assign ${step.config?.fileName || "Portal Smart File"} in the Parent Portal.`
              : step.config?.taskTitle ||
                "Create a follow-up task for the assigned advocate.",
        branchPill:
          idx === 0 && step.type === "email"
            ? {
                title: "Reply received?",
                subtitle: "Update Student Workspace",
              }
            : undefined,
      });
    });

    return nodes;
  };

  const timelineNodes = buildTimelineNodes(activeSelection);
  const activeSubtitle =
    (activeSelection &&
      SHOWCASE_WORKFLOW_PRESETS[activeSelection.name]?.shortSubtitle) ||
    activeSelection?.description ||
    "Thoughtful follow-up sequence.";

  return (
    <div className="space-y-4 text-left">
      {/* 1. Compact Status Line: "9 active • 0 running • 0 need attention" */}
      <div className="flex items-center gap-2.5 text-xs text-[#B0C4DE] px-0.5">
        <span className="w-2 h-2 rounded-full bg-[#34D399] shadow-[0_0_8px_#34D399] inline-block" />
        <span className="font-medium text-[#E2E8F0]">{activeCount} active</span>
        <span className="text-[#4B6382]">•</span>
        <span>{runningCount} running</span>
        <span className="text-[#4B6382]">•</span>
        <button
          type="button"
          onClick={onViewActivity}
          className="hover:text-[#FFE394] transition-colors cursor-pointer"
        >
          {needAttentionCount} need attention
        </button>
      </div>

      {/* 2. Email Delivery Banner */}
      <div className="relative overflow-hidden rounded-xl border border-[#223859] bg-gradient-to-r from-[#08162C] via-[#0D2140] to-[#08162C] px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_10px_28px_rgba(0,0,0,0.65)]">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#0E2240] border border-[#29436B] flex items-center justify-center text-[#E5C98B] shrink-0 shadow-inner">
            <Mail className="w-5 h-5" />
          </div>
          <div className="h-8 w-px bg-[#1E3557] hidden sm:block" />
          <div>
            {isEmailConfigured ? (
              <>
                <h3 className="text-sm font-semibold text-[#FFF4D4] flex items-center gap-2">
                  <span>Email delivery connected</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-[#0B2E27] border border-[#1E5E4E] text-[#4ADE80]">
                    <CheckCircle2 className="w-3 h-3" /> Ready
                  </span>
                </h3>
                <p className="text-xs text-[#94A8C4] mt-0.5">
                  Sending automated follow-up emails via{" "}
                  {stats?.emailProvider?.senderEmail || "verified account"}.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-[#FFF4D4]">
                  Connect email to enable delivery
                </h3>
                <p className="text-xs text-[#94A8C4] mt-0.5">
                  Send follow-up emails from your account and keep conversations moving automatically.
                </p>
              </>
            )}
          </div>
        </div>

        <Link href="/integrations">
          <button
            type="button"
            className="bg-gradient-to-b from-[#E8CD92] via-[#D4AF63] to-[#B58E43] text-[#07162B] font-semibold text-xs px-4 py-2 rounded-lg border border-[#FFE8AD]/60 shadow-[0_2px_10px_rgba(212,175,99,0.25)] hover:brightness-105 transition-all cursor-pointer shrink-0"
          >
            {isEmailConfigured ? "Manage email" : "Connect email"}
          </button>
        </Link>
      </div>

      {/* 3. Master-Detail Split Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* LEFT PANE: Workflow List Card (6 Cols) */}
        <div className="lg:col-span-6 rounded-2xl border border-[#1E3454] bg-[#071428]/95 shadow-[0_14px_34px_rgba(0,0,0,0.8)] flex flex-col justify-between overflow-hidden">
          <div>
            {/* Search & All / Active / Draft Segmented Bar */}
            <div className="p-4 border-b border-[#162944] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center bg-[#040D1C] border border-[#1B304F] rounded-lg px-3 py-2 flex-1">
                <Search className="w-3.5 h-3.5 text-[#6E85A6] mr-2.5 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search workflows..."
                  className="bg-transparent border-0 text-xs text-[#E2E8F0] placeholder-[#6E85A6] focus:outline-none w-full"
                />
              </div>

              <div className="inline-flex items-center bg-[#040D1C] border border-[#1B304F] rounded-full p-0.5 shrink-0 self-start sm:self-auto">
                {(["all", "active", "draft"] as const).map((tab) => {
                  const active = statusFilter === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setStatusFilter(tab)}
                      className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-all cursor-pointer ${
                        active
                          ? "bg-[#152C4F] text-white border border-[#355585] shadow-sm"
                          : "text-[#8DA2C0] hover:text-white border border-transparent"
                      }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Workflow Rows List */}
            <div className="divide-y divide-[#142640] max-h-[480px] overflow-y-auto">
              {filteredList.length === 0 ? (
                <div className="py-12 px-6 text-center text-xs text-[#7E95B4]">
                  No workflows match your current filter.
                </div>
              ) : (
                filteredList.map((item) => {
                  const isSelected = activeSelection?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        onSelectAutomation(item);
                        setOpenMenuId(null);
                      }}
                      className={`relative px-4 py-4 flex items-start justify-between gap-3.5 cursor-pointer transition-all ${
                        isSelected
                          ? "bg-gradient-to-r from-[#142E56] via-[#0F2444] to-[#091830]"
                          : "hover:bg-[#0B1C36]/70"
                      }`}
                    >
                      {/* Glowing left indicator bar when selected */}
                      {isSelected && (
                        <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-gradient-to-b from-[#FFE394] via-[#D8B572] to-[#9E7D3B] shadow-[0_0_12px_#D8B572]" />
                      )}

                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        {renderRowIcon(item, isSelected)}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold text-[#F8FAFC] truncate">
                            {item.name}
                          </h4>
                          <p className="text-xs text-[#94A8C4] leading-relaxed line-clamp-2 mt-0.5">
                            {item.description || "Automated follow-up sequence."}
                          </p>
                        </div>
                      </div>

                      {/* Right Controls: Status Pill + Warm Gold Switch + Three Dots */}
                      <div
                        className="flex items-center gap-2.5 shrink-0 pt-0.5 relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.isActive ? (
                          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-[#0B2E27] border border-[#1B5E4E] text-[#4ADE80]">
                            Active
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-[#152338] border border-[#263A59] text-[#94A3B8]">
                            Draft
                          </span>
                        )}

                        {/* Toggle Switch matching screenshot */}
                        <button
                          type="button"
                          onClick={() => onToggleActive(item.id)}
                          aria-label={
                            item.isActive ? "Pause automation" : "Activate automation"
                          }
                          className={`w-10 h-5 rounded-full p-0.5 transition-colors flex items-center cursor-pointer border ${
                            item.isActive
                              ? "bg-gradient-to-r from-[#DFBE77] to-[#C5A059] border-[#FFE394]/60 justify-end"
                              : "bg-[#16243A] border-[#2B4063] justify-start"
                          }`}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded-full transition-transform shadow ${
                              item.isActive ? "bg-[#07162B]" : "bg-[#647B9B]"
                            }`}
                          />
                        </button>

                        {/* Three Dots Menu */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMenuId(openMenuId === item.id ? null : item.id)
                            }
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8CA2C0] hover:text-white hover:bg-white/5 cursor-pointer"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {openMenuId === item.id && (
                            <div className="absolute right-0 top-8 z-30 w-44 rounded-xl bg-[#0A192F] border border-[#284166] shadow-2xl py-1.5 text-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onEditWorkflow(item);
                                }}
                                className="w-full px-3.5 py-2 text-left text-[#E2E8F0] hover:bg-[#142B4D] flex items-center gap-2 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5 text-[#D8B572]" />
                                <span>Edit in Canvas Builder</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onRunNow(item);
                                }}
                                className="w-full px-3.5 py-2 text-left text-[#E2E8F0] hover:bg-[#142B4D] flex items-center gap-2 cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Test / Run Now</span>
                              </button>
                              {!String(item.id).startsWith("showcase-") && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    setOpenMenuId(null);
                                    onDuplicate(item.id, e);
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-[#E2E8F0] hover:bg-[#142B4D] flex items-center gap-2 cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5 text-sky-400" />
                                  <span>Duplicate as Draft</span>
                                </button>
                              )}
                              {!String(item.id).startsWith("showcase-") && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    setOpenMenuId(null);
                                    onDelete(item.id, e);
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-rose-300 hover:bg-rose-950/50 flex items-center gap-2 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                  <span>Delete Workflow</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Bottom Bar inside Left Card: "💡 Suggest an automation" | "◇ Browse templates" */}
          <div className="px-4 py-3 border-t border-[#162944] bg-[#051022] flex items-center gap-5 text-xs">
            <button
              type="button"
              onClick={onSuggestAutomation}
              className="inline-flex items-center gap-2 text-[#B8CAE0] hover:text-[#FFE394] transition-colors cursor-pointer"
            >
              <Lightbulb className="w-3.5 h-3.5 text-[#D8B572]" />
              <span>Suggest an automation</span>
            </button>

            <button
              type="button"
              onClick={onBrowseTemplates}
              className="inline-flex items-center gap-2 text-[#B8CAE0] hover:text-[#FFE394] transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-[#D8B572]" />
              <span>Browse templates</span>
            </button>
          </div>
        </div>

        {/* RIGHT PANE: Selected Workflow Visual Timeline Preview Card (6 Cols) */}
        <div className="lg:col-span-6 rounded-2xl border border-[#1E3454] bg-[#071428]/95 p-6 shadow-[0_14px_34px_rgba(0,0,0,0.8)] flex flex-col justify-between">
          {activeSelection ? (
            <>
              <div>
                {/* Selected Workflow Header */}
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <h2 className="font-serif text-2xl text-[#FFF4D4] tracking-tight">
                      {activeSelection.name}
                    </h2>
                    <p className="text-xs text-[#94A8C4] mt-1">
                      {activeSubtitle}
                    </p>
                  </div>

                  {activeSelection.isActive ? (
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-[#0B2E27] border border-[#1B5E4E] text-[#4ADE80] shrink-0">
                      Active
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-[#152338] border border-[#263A59] text-[#94A3B8] shrink-0">
                      Draft
                    </span>
                  )}
                </div>

                {/* Vertical Connected Step Timeline */}
                <div className="relative pl-6 space-y-3.5 my-2">
                  {/* Glowing vertical gold spine */}
                  <div className="absolute left-[9px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-[#FFE394] via-[#C5A059] to-[#7A5B25]" />

                  {timelineNodes.map((node) => (
                    <div
                      key={node.id}
                      className="relative flex flex-col sm:flex-row sm:items-center gap-3"
                    >
                      {/* Glowing Gold Dot on Spine */}
                      <span className="absolute -left-[19px] top-6 w-2.5 h-2.5 rounded-full bg-[#FFE394] ring-4 ring-[#FFE394]/15 shadow-[0_0_10px_#FFE394]" />

                      {/* Main Step Card */}
                      <div
                        onClick={() => onEditWorkflow(activeSelection)}
                        className={` rounded-xl border border-[#21385A] bg-gradient-to-r from-[#0C1E3A] to-[#09172E] hover:border-[#C5A059]/60 px-4 py-3.5 flex items-start gap-3.5 cursor-pointer transition-all shadow-md ${
                          node.branchPill ? "flex-1" : "w-full max-w-[360px]"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#102547] border border-[#27426B] flex items-center justify-center text-[#E5C98B] shrink-0 mt-0.5">
                          {node.icon === "user" && <User className="w-4 h-4" />}
                          {node.icon === "clock" && <Clock className="w-4 h-4" />}
                          {node.icon === "mail" && <Mail className="w-4 h-4" />}
                          {node.icon === "check" && (
                            <CheckSquare className="w-4 h-4" />
                          )}
                          {node.icon === "file" && <FileText className="w-4 h-4" />}
                          {node.icon === "zap" && <Zap className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-[#F8FAFC]">
                            {node.title}
                          </h4>
                          <p className="text-[11px] text-[#94A8C4] leading-snug mt-0.5">
                            {node.subtitle}
                          </p>
                        </div>
                      </div>

                      {/* Optional Branch Pill (e.g. "──► Ready now? Return to Lead Center") */}
                      {node.branchPill && (
                        <div className="flex items-center gap-2 shrink-0 pl-4 sm:pl-0">
                          <ArrowRight className="w-4 h-4 text-[#7E95B4] hidden sm:block" />
                          <div className="rounded-xl border border-[#243B5E] bg-[#0B1C36] px-3.5 py-2.5 shadow-md">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F8FAFC]">
                              <ArrowRight className="w-3 h-3 text-[#E5C98B]" />
                              <span>{node.branchPill.title}</span>
                            </div>
                            <p className="text-[10px] text-[#94A8C4] mt-0.5">
                              {node.branchPill.subtitle}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Action Buttons: "View activity" & "✎ Edit workflow" */}
              <div className="flex items-center justify-end gap-3 pt-6 mt-4 border-t border-[#162944]">
                <button
                  type="button"
                  onClick={onViewActivity}
                  className="px-4 py-2 rounded-lg bg-[#0D1F3A] hover:bg-[#152C4F] border border-[#284166] text-xs font-medium text-[#E2E8F0] transition-colors cursor-pointer"
                >
                  View activity
                </button>

                <button
                  type="button"
                  onClick={() => onEditWorkflow(activeSelection)}
                  className="bg-gradient-to-b from-[#E8CD92] via-[#D4AF63] to-[#B58E43] text-[#07162B] font-semibold text-xs px-4 py-2 rounded-lg border border-[#FFE8AD]/60 shadow-[0_2px_10px_rgba(212,175,99,0.25)] hover:brightness-105 transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit workflow</span>
                </button>
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-xs text-[#7E95B4]">
              Select a workflow on the left to inspect its steps.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

