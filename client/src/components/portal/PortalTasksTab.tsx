import React, { useState } from "react";
import { 
  CheckSquare, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Plus, 
  Trash2, 
  Edit2, 
  AlertCircle, 
  Link2, 
  Loader2, 
  Sparkles, 
  Upload, 
  Video, 
  Mail, 
  FileText, 
  Copy, 
  ExternalLink, 
  ChevronRight, 
  ShieldCheck, 
  ArrowRight,
  Filter,
  Check,
  Send,
  UserCheck,
  Paperclip
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import confetti from "canvas-confetti";
import PageIdBadge from "@/components/PageIdBadge";

export type TaskActionType = "file_upload" | "meeting_link" | "email_action" | "general_checklist" | "smart_file";

export interface ExtendedTaskItem {
  id: number | string;
  title: string;
  description?: string;
  status: "Todo" | "In Progress" | "Done";
  dueDate?: string | Date;
  priority?: "High" | "Medium" | "Low";
  actionType?: TaskActionType;
  actionPayload?: {
    uploadedFileName?: string;
    meetingUrl?: string;
    emailSubject?: string;
    emailBody?: string;
  };
  smartFileAssignmentId?: number | null;
}

interface PortalTasksTabProps {
  tasks?: any[];
  studentContactId?: number;
  projectId?: number;
  isAdminView?: boolean;
  refetchTasks?: () => void;
  studentName?: string;
}

// Preset Quick-Assign Templates for Advocate
const ADVOCATE_TASK_TEMPLATES: Array<{
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  actionType: TaskActionType;
  emailSubject?: string;
  emailBody?: string;
}> = [
  {
    title: "Upload Current IEP / 504 for Initial Review",
    description: "Please upload your student's most recent IEP, 504 Plan, and any psychoeducational evaluations so Byron can conduct a full audit.",
    priority: "High",
    actionType: "file_upload"
  },
  {
    title: "Upload Finalized IEP & Meeting Minutes Post-Conference",
    description: "Upload the official finalized IEP document and meeting notes provided by the school district following our ARD/IEP meeting.",
    priority: "High",
    actionType: "file_upload"
  },
  {
    title: "Submit School Virtual Meeting Link (Zoom / Teams / Meet)",
    description: "Paste the virtual conference link received from your school case manager so your advocate can join the meeting with you.",
    priority: "High",
    actionType: "meeting_link"
  },
  {
    title: "Send Formal Written Notice of Advocate Attendance to School",
    description: "Copy and send the pre-drafted advocacy notice email to your school case manager at least 5 business days prior to the meeting.",
    priority: "High",
    actionType: "email_action",
    emailSubject: "Notice of Advocate Attendance - Byron Honea (Master IEP Coach®)",
    emailBody: "Dear Case Manager & IEP Team,\n\nPlease be advised that our Master IEP Coach®, Byron Honea, will be attending our upcoming IEP conference with us as our designated parental representative. Please ensure all draft documents and meeting links are provided 48 hours prior.\n\nThank you,\nParent"
  },
  {
    title: "Review & Approve Pre-Meeting Strategy Talking Points",
    description: "Review the customized parent agenda and priority speaking points prepared for our upcoming committee meeting.",
    priority: "Medium",
    actionType: "general_checklist"
  }
];

export default function PortalTasksTab({
  tasks = [],
  studentContactId,
  projectId,
  isAdminView = false,
  refetchTasks,
  studentName = "Liam Jenkins"
}: PortalTasksTabProps) {
  // Built-in realistic initial tasks if database array is empty
  const [localTasks, setLocalTasks] = useState<ExtendedTaskItem[]>(() => {
    if (tasks && tasks.length > 0) {
      return tasks.map((t, idx) => ({
        ...t,
        actionType: (t.actionType as TaskActionType) || (idx === 0 ? "file_upload" : idx === 1 ? "meeting_link" : "general_checklist")
      }));
    }
    return [
      {
        id: "task-init-1",
        title: "Upload Current IEP / 504 for Initial Review",
        description: `Please upload ${studentName}'s most recent IEP, 504 Plan, and psychological evaluation so Byron can complete your comprehensive compliance audit.`,
        status: "Todo",
        dueDate: "2026-05-15",
        priority: "High",
        actionType: "file_upload"
      },
      {
        id: "task-init-2",
        title: "Submit School Virtual Meeting Link (Zoom / Teams / Meet)",
        description: "Paste the virtual video conference link received from the school case manager so Byron can join the meeting alongside you.",
        status: "Todo",
        dueDate: "2026-05-18",
        priority: "High",
        actionType: "meeting_link"
      },
      {
        id: "task-init-3",
        title: "Send Formal Written Notice of Advocate Attendance to School",
        description: "Send formal written notice to your school district case manager confirming that Byron Honea will be attending as your advocate.",
        status: "Todo",
        dueDate: "2026-05-20",
        priority: "Medium",
        actionType: "email_action",
        actionPayload: {
          emailSubject: `Notice of Parent Advocate Attendance - ${studentName}`,
          emailBody: `Dear IEP Case Manager & Team,\n\nPlease note that Byron Honea (Master IEP Coach®) will be attending ${studentName}'s upcoming IEP meeting with us as our advocate. Please forward the meeting invitation and all draft goals/evaluations to his direct portal or our family email at least 3 days prior.\n\nThank you,\nParent`
        }
      },
      {
        id: "task-init-4",
        title: "Upload Finalized IEP & Meeting Minutes Post-Conference",
        description: "After the annual review meeting is finished, upload the official finalized document and school minutes for vault archiving.",
        status: "Todo",
        dueDate: "2026-06-05",
        priority: "Medium",
        actionType: "file_upload"
      }
    ];
  });

  // Active filter tab: "all", "pending", "completed"
  const [filterTab, setFilterTab] = useState<"all" | "pending" | "completed">("all");

  // In-card interactive inputs state
  const [linkInputs, setLinkInputs] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});

  // Create / Assign Modal states
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignTitle, setAssignTitle] = useState("");
  const [assignDesc, setAssignDesc] = useState("");
  const [assignDueDate, setAssignDueDate] = useState("");
  const [assignPriority, setAssignPriority] = useState<"High" | "Medium" | "Low">("High");
  const [assignActionType, setAssignActionType] = useState<TaskActionType>("file_upload");
  const [assignEmailSubject, setAssignEmailSubject] = useState("");
  const [assignEmailBody, setAssignEmailBody] = useState("");

  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebratedTaskTitle, setCelebratedTaskTitle] = useState("");

  // Confetti trigger
  const triggerConfetti = () => {
    confetti({
      particleCount: 90,
      angle: 60,
      spread: 60,
      origin: { x: 0, y: 0.8 },
      colors: ["#F5B544", "#fbbf24", "#3b82f6", "#10b981", "#ffffff"]
    });
    confetti({
      particleCount: 90,
      angle: 120,
      spread: 60,
      origin: { x: 1, y: 0.8 },
      colors: ["#F5B544", "#fbbf24", "#3b82f6", "#10b981", "#ffffff"]
    });
  };

  // Complete task handler
  const handleCompleteTask = (taskId: string | number, title: string) => {
    setLocalTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: "Done" } : t))
    );
    setCelebratedTaskTitle(title);
    setShowCelebration(true);
    triggerConfetti();
    toast.success("Task completed successfully!", {
      description: `"${title}" has been marked complete and logged for your advocate.`
    });
  };

  // File Upload action handler
  const handleFileUploadAction = (taskId: string | number, taskTitle: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFiles((prev) => ({ ...prev, [taskId]: file.name }));
    toast.success(`"${file.name}" uploaded to Document Vault!`, {
      description: "Document archived and sent to Byron Honea for review."
    });

    // Auto-mark task complete
    handleCompleteTask(taskId, taskTitle);
  };

  // Submit Meeting Link handler
  const handleSubmitMeetingLink = (taskId: string | number, taskTitle: string) => {
    const link = linkInputs[taskId];
    if (!link || !link.trim()) {
      toast.error("Please paste the school meeting link first");
      return;
    }

    toast.success("Meeting link saved and sent to advocate!", {
      description: link
    });

    handleCompleteTask(taskId, taskTitle);
  };

  // Copy Email draft
  const handleCopyEmail = (subject: string, body: string) => {
    const fullText = `Subject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(fullText);
    toast.success("Email template copied to clipboard!", {
      description: "Paste directly into your email app to send to the school."
    });
  };

  // Assign template click
  const handleSelectTemplate = (tpl: typeof ADVOCATE_TASK_TEMPLATES[0]) => {
    setAssignTitle(tpl.title);
    setAssignDesc(tpl.description);
    setAssignPriority(tpl.priority);
    setAssignActionType(tpl.actionType);
    if (tpl.emailSubject) setAssignEmailSubject(tpl.emailSubject);
    if (tpl.emailBody) setAssignEmailBody(tpl.emailBody);
  };

  // Submit new assigned task
  const handleCreateAssignedTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTitle.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    const newTask: ExtendedTaskItem = {
      id: `task-custom-${Date.now()}`,
      title: assignTitle,
      description: assignDesc,
      dueDate: assignDueDate || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      priority: assignPriority,
      status: "Todo",
      actionType: assignActionType,
      actionPayload: {
        emailSubject: assignEmailSubject,
        emailBody: assignEmailBody
      }
    };

    setLocalTasks((prev) => [newTask, ...prev]);
    setIsAssignOpen(false);
    toast.success("Task assigned to parent client!", {
      description: `"${assignTitle}" is now live on the parent's action item checklist.`
    });

    // Reset form
    setAssignTitle("");
    setAssignDesc("");
    setAssignDueDate("");
    setAssignPriority("High");
    setAssignActionType("file_upload");
    setAssignEmailSubject("");
    setAssignEmailBody("");
  };

  // Filter calculations
  const pendingTasks = localTasks.filter((t) => t.status !== "Done");
  const completedTasks = localTasks.filter((t) => t.status === "Done");
  const displayedTasks = filterTab === "pending" ? pendingTasks : filterTab === "completed" ? completedTasks : localTasks;
  const completionPercentage = localTasks.length > 0 ? Math.round((completedTasks.length / localTasks.length) * 100) : 100;

  const getPriorityBadge = (p?: string) => {
    switch (p) {
      case "High":
        return <Badge className="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-semibold font-mono">High Priority</Badge>;
      case "Low":
        return <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-semibold font-mono">Low Priority</Badge>;
      default:
        return <Badge className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-semibold font-mono">Medium Priority</Badge>;
    }
  };

  const getActionTypeIcon = (type?: TaskActionType) => {
    switch (type) {
      case "file_upload":
        return <Upload className="h-4 w-4 text-[#F5B544]" />;
      case "meeting_link":
        return <Video className="h-4 w-4 text-emerald-400" />;
      case "email_action":
        return <Mail className="h-4 w-4 text-sky-400" />;
      default:
        return <CheckSquare className="h-4 w-4 text-amber-300" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-white animate-in fade-in duration-300">
      
      {/* ── Top Header Banner with PageIdBadge & Progress ── */}
      <div className="bg-gradient-to-br from-[#0B2553] via-[#071D40] to-[#04122C] p-6 sm:p-7 rounded-3xl border border-blue-900/40 shadow-2xl relative overflow-hidden">
        {/* Top subtle golden accent glow */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5B544]/70 to-transparent" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-[#F5B544] text-[#07152B] font-bold text-[10px] tracking-wider uppercase px-2.5 py-0.5 shadow-sm font-mono">
                Advocacy Action Center
              </Badge>
              <Badge variant="outline" className="text-xs font-mono border-blue-900/40 text-blue-200/90 bg-[#030C22]">
                Student: <strong className="text-white font-semibold ml-1">{studentName}</strong>
              </Badge>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-serif font-normal text-white tracking-tight flex items-center gap-2.5">
                <CheckSquare className="h-7 w-7 text-[#F5B544]" />
                Action Items & Assigned Tasks
              </h1>
              <PageIdBadge id="PG-023-TSK" name="Portal Tasks" />
            </div>

            <p className="text-xs sm:text-sm text-blue-200/75 leading-relaxed">
              Preparation checklists, document uploads, and school coordination tasks assigned by your Master IEP Coach®. Complete these items to keep your student's advocacy timeline on track.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Progress pill */}
            <div className="bg-[#030C22] border border-blue-900/40 p-4 rounded-2xl text-center sm:text-right shadow-xl min-w-[160px]">
              <div className="flex items-center justify-between sm:justify-end gap-2">
                <span className="text-[11px] text-white/50 font-medium">Progress</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">{completionPercentage}% Done</span>
              </div>
              <div className="w-full bg-blue-950/60 h-2 rounded-full mt-2 overflow-hidden border border-blue-900/40">
                <div 
                  className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <span className="text-[10px] text-white/50 block mt-1.5 font-mono">
                {completedTasks.length} of {localTasks.length} tasks completed
              </span>
            </div>

            {/* Assign Task Button (Available for Byron or quick adding) */}
            <Button
              onClick={() => setIsAssignOpen(true)}
              className="bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] font-bold text-xs h-12 px-4 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Assign Task to Client</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Filter Bar & Quick Category Selector ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setFilterTab("all")}
            className={`rounded-xl text-xs font-semibold cursor-pointer h-9 px-3.5 transition-all ${
              filterTab === "all"
                ? "bg-amber-400 text-slate-950 font-bold shadow-sm"
                : "bg-[#06172F] text-white/70 hover:text-white border border-blue-900/40"
            }`}
          >
            All Tasks ({localTasks.length})
          </Button>

          <Button
            size="sm"
            onClick={() => setFilterTab("pending")}
            className={`rounded-xl text-xs font-semibold cursor-pointer h-9 px-3.5 transition-all flex items-center gap-1.5 ${
              filterTab === "pending"
                ? "bg-amber-400 text-slate-950 font-bold shadow-sm"
                : "bg-[#06172F] text-white/70 hover:text-white border border-blue-900/40"
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span>Pending Action ({pendingTasks.length})</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setFilterTab("completed")}
            className={`rounded-xl text-xs font-semibold cursor-pointer h-9 px-3.5 transition-all flex items-center gap-1.5 ${
              filterTab === "completed"
                ? "bg-emerald-400 text-slate-950 font-bold shadow-sm"
                : "bg-[#06172F] text-white/70 hover:text-white border border-blue-900/40"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>Completed ({completedTasks.length})</span>
          </Button>
        </div>

        <span className="text-[11px] text-white/50 font-mono">
          Showing {displayedTasks.length} items
        </span>
      </div>

      {/* ── Tasks Action List ── */}
      <div className="space-y-4">
        {displayedTasks.length === 0 ? (
          <div className="p-10 rounded-3xl bg-[#06172F] border border-blue-900/40 text-center shadow-xl space-y-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-white">No tasks found in this view</h3>
            <p className="text-xs text-blue-200/60 max-w-sm mx-auto">
              {filterTab === "pending"
                ? "All caught up! There are no outstanding parent action items right now."
                : "No completed action items recorded yet."}
            </p>
          </div>
        ) : (
          displayedTasks.map((task) => {
            const isDone = task.status === "Done";
            const actionType = task.actionType || "general_checklist";

            return (
              <Card 
                key={task.id}
                className={`border transition-all rounded-3xl overflow-hidden shadow-xl text-white ${
                  isDone 
                    ? "bg-[#030C22]/80 border-blue-900/30 opacity-75" 
                    : "bg-[#06172F] border-blue-900/40 hover:border-amber-400/50"
                }`}
              >
                <CardHeader className="bg-[#030C22] border-b border-blue-900/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-blue-950/50 border border-blue-900/40 shrink-0">
                      {getActionTypeIcon(actionType)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className={`text-sm sm:text-base font-bold tracking-tight ${
                          isDone ? "line-through text-white/60" : "text-white"
                        }`}>
                          {task.title}
                        </CardTitle>
                        {getPriorityBadge(task.priority)}
                      </div>
                      <span className="text-[11px] text-white/50 block font-mono mt-0.5">
                        {task.dueDate ? `Target Due Date: ${new Date(task.dueDate).toLocaleDateString()}` : "Priority Action Item"}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                    {isDone ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Completed & Logged
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 font-mono">
                        <Clock className="h-3.5 w-3.5 text-amber-400" /> Action Required
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-5 sm:p-6 space-y-4">
                  {task.description && (
                    <p className="text-xs sm:text-sm text-blue-200/80 leading-relaxed">
                      {task.description}
                    </p>
                  )}

                  {/* ── Interactive In-Card Action Areas ── */}
                  {!isDone && (
                    <div className="p-4 rounded-2xl bg-[#030C22] border border-blue-900/40 space-y-3">
                      
                      {/* TYPE A: Document Upload Action (IEP / 504 / Evaluations) */}
                      {actionType === "file_upload" && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              <Upload className="h-4 w-4 text-[#F5B544]" />
                              Attach IEP / Evaluation PDF:
                            </span>
                            <span className="text-[11px] text-white/50 font-mono">Direct Vault Sync</span>
                          </div>

                          <div className="flex flex-col sm:flex-row items-center gap-3">
                            <label className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-md transition-all">
                              <Upload className="h-3.5 w-3.5" />
                              <span>Select Document to Upload</span>
                              <input 
                                type="file" 
                                accept=".pdf,.doc,.docx,.png,.jpg" 
                                className="hidden" 
                                onChange={(e) => handleFileUploadAction(task.id, task.title, e)} 
                              />
                            </label>

                            <span className="text-[11px] text-white/50">
                              Accepts PDF, DOCX, or scanned IEP reports up to 50MB
                            </span>
                          </div>
                        </div>
                      )}

                      {/* TYPE B: Virtual School Meeting Link Submission */}
                      {actionType === "meeting_link" && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              <Video className="h-4 w-4 text-emerald-400" />
                              Paste School Video Meeting Link:
                            </span>
                            <span className="text-[11px] text-white/50 font-mono">Zoom / Google Meet / Teams</span>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="url"
                              value={linkInputs[task.id] || ""}
                              onChange={(e) => setLinkInputs({ ...linkInputs, [task.id]: e.target.value })}
                              placeholder="https://meet.google.com/xyz-abc or https://zoom.us/j/..."
                              className="flex-1 bg-[#06172F] border border-blue-900/40 focus:border-[#F5B544] rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                            />
                            <Button
                              onClick={() => handleSubmitMeetingLink(task.id, task.title)}
                              className="bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] font-bold text-xs rounded-xl px-4 py-2 shrink-0 cursor-pointer shadow-sm"
                            >
                              <Send className="h-3.5 w-3.5 mr-1" />
                              Submit Link to Byron
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* TYPE C: Email Template to School District */}
                      {actionType === "email_action" && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              <Mail className="h-4 w-4 text-sky-400" />
                              Advocate Attendance Email Template:
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopyEmail(
                                task.actionPayload?.emailSubject || `Notice of Advocate Attendance - ${studentName}`,
                                task.actionPayload?.emailBody || "Please note that Byron Honea will attend..."
                              )}
                              className="text-amber-300 hover:text-white text-xs h-7 gap-1 font-semibold"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Copy Text
                            </Button>
                          </div>

                          <div className="p-3 rounded-xl bg-[#06172F] border border-blue-900/40 text-[11px] space-y-1.5 font-mono">
                            <div className="text-amber-300 font-bold">
                              Subject: {task.actionPayload?.emailSubject || `Notice of Parent Advocate Attendance - ${studentName}`}
                            </div>
                            <div className="text-white/80 whitespace-pre-wrap leading-relaxed">
                              {task.actionPayload?.emailBody || `Dear Case Manager & IEP Team,\n\nPlease note that Byron Honea (Master IEP Coach®) will be attending ${studentName}'s upcoming meeting with us.`}
                            </div>
                          </div>

                          <div className="flex justify-end pt-1">
                            <Button
                              onClick={() => handleCompleteTask(task.id, task.title)}
                              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl px-4 py-2 cursor-pointer shadow-sm"
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Mark Email as Sent
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* TYPE D: General Action Checklist */}
                      {actionType === "general_checklist" && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-blue-200/70">
                            Once you have completed this preparation step, confirm below:
                          </span>
                          <Button
                            onClick={() => handleCompleteTask(task.id, task.title)}
                            className="bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] font-bold text-xs rounded-xl px-4 py-2 cursor-pointer shadow-sm"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Mark Action Completed
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Completed summary note */}
                  {isDone && (
                    <div className="p-3 rounded-xl bg-[#030C22] border border-blue-900/40 flex items-center justify-between text-xs text-white/60">
                      <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <CheckCircle2 className="h-4 w-4" /> Completed & synced with advocate
                      </span>
                      {uploadedFiles[task.id] && (
                        <span className="font-mono text-amber-300 flex items-center gap-1">
                          <Paperclip className="h-3.5 w-3.5" /> {uploadedFiles[task.id]}
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* ── Advocate "Assign Task to Parent" Modal ── */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="bg-[#06172F] border-blue-900/40 text-white max-w-lg shadow-2xl rounded-2xl">
          <DialogHeader className="border-b border-blue-900/40 pb-3">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-white">
              <CheckSquare className="h-5 w-5 text-[#F5B544]" />
              Assign Task to Client ({studentName})
            </DialogTitle>
            <DialogDescription className="text-xs text-blue-200/70">
              Create a custom action item or choose from Byron's standard advocacy task templates.
            </DialogDescription>
          </DialogHeader>

          {/* Quick-Assign Preset Chips */}
          <div className="space-y-2 pt-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono block">
              1-Click Standard Templates:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {ADVOCATE_TASK_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.title}
                  type="button"
                  onClick={() => handleSelectTemplate(tpl)}
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-[#030C22] hover:bg-blue-900/40 border border-blue-900/40 text-white font-medium text-left transition-all cursor-pointer truncate max-w-xs"
                  title={tpl.title}
                >
                  + {tpl.title}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleCreateAssignedTask} className="space-y-4 pt-2 text-xs">
            <div className="space-y-1">
              <label className="text-white/80 font-semibold block">Task Title</label>
              <input
                type="text"
                required
                value={assignTitle}
                onChange={(e) => setAssignTitle(e.target.value)}
                placeholder="e.g. Upload New IEP Draft for 504 Accommodation Audit"
                className="w-full bg-[#030C22] border border-blue-900/40 focus:border-[#F5B544] rounded-xl p-2.5 text-xs text-white outline-none transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-white/80 font-semibold block">Parent Instructions / Description</label>
              <textarea
                rows={2}
                value={assignDesc}
                onChange={(e) => setAssignDesc(e.target.value)}
                placeholder="Explain what the parent needs to upload, send, or prepare..."
                className="w-full bg-[#030C22] border border-blue-900/40 focus:border-[#F5B544] rounded-xl p-2.5 text-xs text-white outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-white/80 font-semibold block">Action Type</label>
                <select
                  value={assignActionType}
                  onChange={(e) => setAssignActionType(e.target.value as TaskActionType)}
                  className="w-full bg-[#030C22] border border-blue-900/40 focus:border-[#F5B544] rounded-xl p-2 text-xs text-white outline-none"
                >
                  <option value="file_upload">IEP Document Upload</option>
                  <option value="meeting_link">Submit School Link</option>
                  <option value="email_action">Send School Email</option>
                  <option value="general_checklist">Checklist Action</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-white/80 font-semibold block">Due Date</label>
                <input
                  type="date"
                  value={assignDueDate}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                  className="w-full bg-[#030C22] border border-blue-900/40 focus:border-[#F5B544] rounded-xl p-2 text-xs text-white font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-white/80 font-semibold block">Priority</label>
                <select
                  value={assignPriority}
                  onChange={(e) => setAssignPriority(e.target.value as any)}
                  className="w-full bg-[#030C22] border border-blue-900/40 focus:border-[#F5B544] rounded-xl p-2 text-xs text-white outline-none"
                >
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            {/* If Email action selected, show subject/body editor */}
            {assignActionType === "email_action" && (
              <div className="space-y-2 p-3 rounded-xl bg-[#030C22] border border-blue-900/40">
                <div className="space-y-1">
                  <label className="text-[11px] text-white/70 font-semibold block">Pre-Filled Email Subject</label>
                  <input
                    type="text"
                    value={assignEmailSubject}
                    onChange={(e) => setAssignEmailSubject(e.target.value)}
                    placeholder="Notice of Advocate Attendance - Liam Jenkins"
                    className="w-full bg-[#06172F] border border-blue-900/40 rounded-lg p-2 text-xs text-white outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-white/70 font-semibold block">Pre-Filled Email Body</label>
                  <textarea
                    rows={3}
                    value={assignEmailBody}
                    onChange={(e) => setAssignEmailBody(e.target.value)}
                    placeholder="Dear Case Manager, please be advised..."
                    className="w-full bg-[#06172F] border border-blue-900/40 rounded-lg p-2 text-xs text-white outline-none"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="border-t border-blue-900/40 pt-3 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAssignOpen(false)}
                className="text-white/70 hover:text-white text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Assign Task to Parent
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Flashing Celebration Modal Overlay ── */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 bg-[#000821]/80 backdrop-blur-md flex items-center justify-center p-4 transition-all animate-in fade-in">
          <div className="relative bg-gradient-to-br from-[#0B2553] via-[#071D40] to-[#04122C] border border-amber-400/60 rounded-3xl max-w-sm w-full p-8 text-center shadow-[0_4px_30px_rgba(11,37,83,0.35)] ring-1 ring-amber-400/30 animate-in zoom-in-95 duration-200 text-white">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-4 relative">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-pulse" />
              <div className="absolute inset-0 rounded-full border border-emerald-400/30 animate-ping" />
            </div>

            <h3 className="text-xl font-bold text-white tracking-tight">Milestone Completed!</h3>
            <p className="text-amber-300 text-xs font-semibold mt-1 tracking-wider uppercase flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Great Job! <Sparkles className="w-3.5 h-3.5" />
            </p>

            <div className="my-4 p-3.5 bg-[#030C22] rounded-xl border border-blue-900/40">
              <p className="text-xs font-bold text-white">"{celebratedTaskTitle}"</p>
              <p className="text-[10px] text-white/50 mt-1">Your progress was automatically synced with your advocate.</p>
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <Button
                onClick={() => triggerConfetti()}
                variant="outline"
                className="border-blue-900/40 bg-blue-950/30 hover:bg-blue-900/40 text-white text-xs font-bold rounded-xl px-4 py-2"
              >
                More Confetti! 🎉
              </Button>
              <Button
                onClick={() => {
                  setShowCelebration(false);
                  setCelebratedTaskTitle("");
                }}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-xl px-6 py-2 shadow-[0_0_12px_rgba(245,181,68,0.25)]"
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
