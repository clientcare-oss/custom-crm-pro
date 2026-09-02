import React, { useState } from "react";
import { 
  CheckCircle2, 
  Circle,
  Clock, 
  Calendar, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Link2, 
  Sparkles, 
  Upload, 
  Video, 
  Mail, 
  FileText, 
  Copy, 
  ExternalLink, 
  ChevronRight, 
  ChevronDown,
  ShieldCheck, 
  Check,
  Send,
  Paperclip,
  ArrowRight,
  ListTodo
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import PageIdBadge from "@/components/PageIdBadge";

export type TaskType = "upload" | "meeting_link" | "email" | "general";

export interface ClientTaskItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "Intake & Review" | "Meeting Prep" | "School Coordination" | "Post-Meeting";
  type: TaskType;
  dueDate: string;
  isCompleted: boolean;
  completedAt?: string;
  payload?: {
    uploadedFileName?: string;
    meetingUrl?: string;
    emailSubject?: string;
    emailBody?: string;
  };
}

interface PortalTasksTabProps {
  tasks?: any[];
  studentContactId?: number;
  projectId?: number;
  isAdminView?: boolean;
  refetchTasks?: () => void;
  studentName?: string;
}

export default function PortalTasksTab({
  tasks = [],
  studentContactId,
  projectId,
  isAdminView = false,
  studentName = "Liam Jenkins"
}: PortalTasksTabProps) {
  // HoneyBook / Monday style streamlined tasks
  const [taskList, setTaskList] = useState<ClientTaskItem[]>([
    {
      id: "t-1",
      title: "Upload current IEP / 504 Plan & Evaluation Reports",
      subtitle: "Attach your child's most recent school documents for Byron's initial compliance audit.",
      category: "Intake & Review",
      type: "upload",
      dueDate: "May 15, 2026",
      isCompleted: false,
    },
    {
      id: "t-2",
      title: "Provide School Virtual Meeting Link (Zoom / Teams / Meet)",
      subtitle: "Paste the video conference invitation from your case manager so Byron can attend with you.",
      category: "Meeting Prep",
      type: "meeting_link",
      dueDate: "May 18, 2026",
      isCompleted: false,
    },
    {
      id: "t-3",
      title: "Send Formal Notice of Advocate Attendance to School",
      subtitle: "Send our pre-drafted notice to the school case manager at least 5 business days prior.",
      category: "School Coordination",
      type: "email",
      dueDate: "May 20, 2026",
      isCompleted: false,
      payload: {
        emailSubject: `Notice of Parent Advocate Attendance - ${studentName}`,
        emailBody: `Dear IEP Case Manager & Team,\n\nPlease note that Byron Honea (Master IEP Coach®) will be attending ${studentName}'s upcoming IEP meeting with us as our advocate. Please ensure the meeting link and all draft goals/evaluations are sent to our family at least 3 business days prior.\n\nThank you,\nParent`
      }
    },
    {
      id: "t-4",
      title: "Review & approve Byron's 48-Hour Parent Talking Points",
      subtitle: "Check the customized priority strategy roadmap prepared for your upcoming school conference.",
      category: "Meeting Prep",
      type: "general",
      dueDate: "May 22, 2026",
      isCompleted: false,
    },
    {
      id: "t-5",
      title: "Upload Finalized IEP & Meeting Minutes Post-Conference",
      subtitle: "Upload the official document once provided by the district after the meeting is complete.",
      category: "Post-Meeting",
      type: "upload",
      dueDate: "June 5, 2026",
      isCompleted: false,
    }
  ]);

  // Expanded task row for inline actions
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>("t-1");

  // In-line inputs
  const [meetingUrlInput, setMeetingUrlInput] = useState("");
  const [customTaskTitle, setCustomTaskTitle] = useState("");
  const [isAddingPersonalTask, setIsAddingPersonalTask] = useState(false);

  // Confetti trigger
  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.7 },
      colors: ["#F5B544", "#fbbf24", "#3b82f6", "#10b981", "#ffffff"]
    });
  };

  // Toggle complete
  const toggleTask = (taskId: string) => {
    setTaskList((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const nextState = !t.isCompleted;
          if (nextState) {
            triggerConfetti();
            toast.success("Task completed!", {
              description: `"${t.title}" is marked complete.`
            });
          }
          return {
            ...t,
            isCompleted: nextState,
            completedAt: nextState ? new Date().toLocaleDateString() : undefined
          };
        }
        return t;
      })
    );
  };

  // File upload handler
  const handleFileUpload = (taskId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setTaskList((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            isCompleted: true,
            completedAt: new Date().toLocaleDateString(),
            payload: { ...t.payload, uploadedFileName: file.name }
          };
        }
        return t;
      })
    );

    triggerConfetti();
    toast.success(`"${file.name}" uploaded successfully!`, {
      description: "Archived to your Document Vault and shared with Byron."
    });
  };

  // Save Meeting Link
  const handleSaveLink = (taskId: string) => {
    if (!meetingUrlInput.trim()) {
      toast.error("Please enter a meeting URL");
      return;
    }

    setTaskList((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            isCompleted: true,
            completedAt: new Date().toLocaleDateString(),
            payload: { ...t.payload, meetingUrl: meetingUrlInput }
          };
        }
        return t;
      })
    );

    setMeetingUrlInput("");
    triggerConfetti();
    toast.success("Meeting link saved!", {
      description: "Byron has been updated with the video conference link."
    });
  };

  // Copy Email Template
  const handleCopyEmail = (taskId: string, subject?: string, body?: string) => {
    const text = `Subject: ${subject || ""}\n\n${body || ""}`;
    navigator.clipboard.writeText(text);
    toast.success("Email template copied to clipboard!", {
      description: "Paste it directly into your email client to send to the school."
    });
  };

  // Add personal client task
  const handleAddPersonalTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTaskTitle.trim()) return;

    const newTask: ClientTaskItem = {
      id: `custom-${Date.now()}`,
      title: customTaskTitle.trim(),
      subtitle: "Personal parent reminder",
      category: "Meeting Prep",
      type: "general",
      dueDate: "Upcoming",
      isCompleted: false
    };

    setTaskList((prev) => [newTask, ...prev]);
    setCustomTaskTitle("");
    setIsAddingPersonalTask(false);
    toast.success("Reminder added to your checklist!");
  };

  // Progress metrics
  const completedCount = taskList.filter((t) => t.isCompleted).length;
  const totalCount = taskList.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

  const pendingTasks = taskList.filter((t) => !t.isCompleted);
  const completedTasks = taskList.filter((t) => t.isCompleted);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-white animate-in fade-in duration-300">
      
      {/* ── Top Header Banner with PageIdBadge ── */}
      <div className="bg-gradient-to-br from-[#0B2553] via-[#071D40] to-[#04122C] p-6 rounded-3xl border border-blue-900/40 shadow-2xl relative overflow-hidden">
        {/* Top subtle golden accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5B544]/70 to-transparent" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-[#F5B544] text-[#07152B] font-bold text-[10px] tracking-wider uppercase px-2.5 py-0.5 shadow-sm font-mono">
                Parent Action Checklist
              </Badge>
              <Badge variant="outline" className="text-xs font-mono border-blue-900/40 text-blue-200/90 bg-[#030C22]">
                Student: <strong className="text-white font-semibold ml-1">{studentName}</strong>
              </Badge>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-serif font-normal text-white tracking-tight flex items-center gap-2.5">
                <ListTodo className="h-6 w-6 text-[#F5B544]" />
                Your Advocacy Action Items
              </h1>
              <PageIdBadge id="PG-023-TSK" name="Portal Tasks" />
            </div>

            <p className="text-xs sm:text-sm text-blue-200/75">
              Simple, step-by-step preparation checklist to keep your child's IEP advocacy on schedule.
            </p>
          </div>

          {/* Progress widget */}
          <div className="bg-[#030C22] border border-blue-900/40 p-3.5 rounded-2xl shrink-0 min-w-[170px] shadow-xl">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-white/60 font-medium">Checklist Progress</span>
              <span className="font-bold text-amber-300 font-mono">{progressPercent}%</span>
            </div>
            <div className="w-full bg-blue-950/60 h-2 rounded-full overflow-hidden border border-blue-900/40">
              <div 
                className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-white/50 block mt-1 font-mono text-right">
              {completedCount} of {totalCount} completed
            </span>
          </div>
        </div>
      </div>

      {/* ── HoneyBook / Monday Streamlined Task Checklist Container ── */}
      <div className="space-y-4">
        
        {/* Section: Pending Action Items */}
        <div className="bg-[#06172F] border border-blue-900/40 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-blue-900/40 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-300 font-mono flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              To Do ({pendingTasks.length})
            </h2>

            {!isAddingPersonalTask && (
              <button
                onClick={() => setIsAddingPersonalTask(true)}
                className="text-xs text-blue-300 hover:text-amber-300 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Note or Reminder</span>
              </button>
            )}
          </div>

          {/* Inline Add Personal Task Form */}
          {isAddingPersonalTask && (
            <form onSubmit={handleAddPersonalTask} className="p-3 bg-[#030C22] border border-blue-900/40 rounded-2xl flex items-center gap-2">
              <input
                type="text"
                autoFocus
                value={customTaskTitle}
                onChange={(e) => setCustomTaskTitle(e.target.value)}
                placeholder="Type a reminder (e.g. Call pediatrician for speech therapy notes)..."
                className="flex-1 bg-transparent text-xs text-white placeholder:text-white/40 outline-none"
              />
              <Button type="submit" size="sm" className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs h-7 px-3 rounded-lg">
                Add
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingPersonalTask(false)} className="text-white/60 hover:text-white text-xs h-7 px-2">
                Cancel
              </Button>
            </form>
          )}

          {/* Pending Tasks List */}
          {pendingTasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-blue-200/60 space-y-1">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto opacity-80" />
              <p className="font-bold text-white text-sm">You are all caught up!</p>
              <p>All advocacy action items for {studentName} have been completed.</p>
            </div>
          ) : (
            <div className="divide-y divide-blue-900/30">
              {pendingTasks.map((task) => {
                const isExpanded = expandedTaskId === task.id;

                return (
                  <div 
                    key={task.id}
                    className="py-3 sm:py-3.5 space-y-2 group transition-colors"
                  >
                    {/* Main Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Interactive Checkbox Circle */}
                        <button
                          onClick={() => toggleTask(task.id)}
                          className="w-5 h-5 rounded-full border border-blue-600/70 hover:border-amber-400 bg-[#030C22] hover:bg-amber-400/10 flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer group-hover:scale-105"
                          title="Mark complete"
                        >
                          <Check className="h-3 w-3 text-transparent group-hover:text-amber-400/50 transition-colors" />
                        </button>

                        <div 
                          onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                          className="space-y-0.5 cursor-pointer min-w-0"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-semibold text-white group-hover:text-amber-200 transition-colors">
                              {task.title}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950/60 border border-blue-900/40 text-blue-300 font-mono">
                              {task.category}
                            </span>
                          </div>
                          {task.subtitle && (
                            <p className="text-[11px] text-blue-200/70 line-clamp-1">
                              {task.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Action / Due Date */}
                      <div className="flex items-center gap-2 shrink-0 self-center">
                        <span className="text-[11px] text-white/50 font-mono hidden sm:inline-block">
                          {task.dueDate}
                        </span>

                        <button
                          onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                          className="p-1 rounded-lg hover:bg-blue-900/40 text-white/60 hover:text-white transition-colors cursor-pointer"
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Action Helper (Clean & Compact) */}
                    {isExpanded && (
                      <div className="ml-8 p-3.5 rounded-2xl bg-[#030C22] border border-blue-900/40 text-xs space-y-3 animate-in fade-in-50 duration-200">
                        {task.subtitle && (
                          <p className="text-blue-200/80 leading-relaxed">
                            {task.subtitle}
                          </p>
                        )}

                        {/* Action: Upload File */}
                        {task.type === "upload" && (
                          <div className="flex flex-wrap items-center gap-3 pt-1">
                            <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer shadow-sm transition-all">
                              <Upload className="h-3.5 w-3.5" />
                              <span>Select Document to Upload</span>
                              <input 
                                type="file" 
                                accept=".pdf,.doc,.docx,.png,.jpg" 
                                className="hidden" 
                                onChange={(e) => handleFileUpload(task.id, e)} 
                              />
                            </label>
                            <span className="text-[11px] text-white/50 font-mono">PDF, DOCX, or scanned pages</span>
                          </div>
                        )}

                        {/* Action: Video Link */}
                        {task.type === "meeting_link" && (
                          <div className="space-y-2 pt-1">
                            <div className="flex gap-2">
                              <input
                                type="url"
                                value={meetingUrlInput}
                                onChange={(e) => setMeetingUrlInput(e.target.value)}
                                placeholder="Paste Google Meet or Zoom URL here..."
                                className="flex-1 bg-[#06172F] border border-blue-900/40 focus:border-amber-400 rounded-xl px-3 py-1.5 text-xs text-white font-mono outline-none"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleSaveLink(task.id)}
                                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl px-3"
                              >
                                Save Link
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Action: Email School */}
                        {task.type === "email" && (
                          <div className="space-y-2.5 pt-1">
                            <div className="p-2.5 rounded-xl bg-[#06172F] border border-blue-900/40 text-[11px] font-mono space-y-1 text-white/80">
                              <div className="text-amber-300 font-bold">Subject: {task.payload?.emailSubject}</div>
                              <div className="whitespace-pre-wrap text-white/70">{task.payload?.emailBody}</div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopyEmail(task.id, task.payload?.emailSubject, task.payload?.emailBody)}
                                className="border-blue-900/40 bg-[#06172F] hover:bg-blue-900/40 text-white text-xs h-8 rounded-xl gap-1.5"
                              >
                                <Copy className="h-3 w-3 text-amber-400" />
                                <span>Copy Email Template</span>
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => toggleTask(task.id)}
                                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-8 rounded-xl gap-1"
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>Mark as Sent</span>
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Action: General Checklist */}
                        {task.type === "general" && (
                          <div className="flex justify-end pt-1">
                            <Button
                              size="sm"
                              onClick={() => toggleTask(task.id)}
                              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl px-3"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Mark Completed
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section: Completed Items */}
        {completedTasks.length > 0 && (
          <div className="bg-[#06172F]/60 border border-blue-900/30 rounded-3xl p-4 sm:p-5 shadow-lg space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-white/50 font-mono flex items-center gap-2 border-b border-blue-900/30 pb-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              Completed ({completedTasks.length})
            </h2>

            <div className="divide-y divide-blue-900/20">
              {completedTasks.map((task) => (
                <div 
                  key={task.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 cursor-pointer"
                      title="Click to unmark"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <span className="line-through text-white/50 truncate font-medium">
                      {task.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {task.payload?.uploadedFileName && (
                      <span className="text-[10px] font-mono text-amber-300 flex items-center gap-1">
                        <Paperclip className="h-3 w-3" /> {task.payload.uploadedFileName}
                      </span>
                    )}
                    <span className="text-[10px] text-emerald-400/80 font-mono">
                      ✓ Done
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
