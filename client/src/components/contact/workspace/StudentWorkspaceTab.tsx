import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { StudentHeader } from "./StudentHeader";
import { ClientJourneyCard } from "./ClientJourneyCard";
import { IepZoneCard } from "./IepZoneCard";
import { RecordsAndMeetingPlanCard } from "./RecordsAndMeetingPlanCard";
import { KeyDocumentsCard, type CaseDocItem } from "./KeyDocumentsCard";
import { ToolLauncherCard } from "./ToolLauncherCard";
import { NextActionsCard, type CaseTaskItem } from "./NextActionsCard";
import { MeetingsTimelineCard, type ActivityItem } from "./MeetingsTimelineCard";
import { InternalStrategyCard, type StrategyNoteItem } from "./InternalStrategyCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import VoiceTextarea from "@/components/VoiceTextarea";
import { CheckSquare, Lock, Upload, FileText, Plus, Loader2 } from "lucide-react";

interface StudentWorkspaceTabProps {
  contact: any;
  contactId: number;
  fullName: string;
  projects: any[];
  invoices: any[];
  contracts: any[];
  appointments: any[];
  files: any[];
  messages: any[];
  compass?: any;
  compassHistory?: any[];
  parentContact?: any;
  portalStatus?: any;
  onSwitchTab: (tab: string) => void;
  onEditStudent: () => void;
  onArchive: () => void;
  onUnarchive?: () => void;
  onPreviewPortal: () => void;
  onUpdatePlanType: (newPlanType: string) => void;
  calculatedAge: number | null;
}

export function StudentWorkspaceTab({
  contact,
  contactId,
  fullName,
  projects,
  invoices,
  contracts,
  appointments,
  files,
  messages,
  compass,
  compassHistory,
  onSwitchTab,
  onEditStudent,
  onArchive,
  onUnarchive,
  onPreviewPortal,
  onUpdatePlanType,
  calculatedAge,
}: StudentWorkspaceTabProps) {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Instantaneous synchronized state across StudentHeader and ClientJourneyCard
  const [managedContact, setManagedContact] = useState<any>(contact);

  useEffect(() => {
    setManagedContact(contact);
  }, [contact]);

  const handleJourneyStateChange = (payload: any) => {
    setManagedContact((prev: any) => ({ ...prev, ...payload }));
  };

  // Queries for live tasks, notes, parent contact, portal credentials
  const { data: parentContactData } = trpc.contacts.detail.useQuery(
    { id: contact.parentContactId || 0 },
    { enabled: !!contact.parentContactId }
  );
  const parentContact = parentContactData?.contact;

  const { data: portalStatus } = trpc.portalAuth.getClientPortalStatus.useQuery(
    { contactId },
    { enabled: !!contactId }
  );

  const defaultProjectId = projects[0]?.id || 1;
  const { data: allInternalTasks = [] } = trpc.internalTasks.list.useQuery({ status: "all" });
  const { data: notesList = [] } = trpc.notes.list.useQuery(
    { projectId: defaultProjectId },
    { enabled: !!defaultProjectId }
  );

  // Filter tasks belonging to this student/case
  const studentTasks: CaseTaskItem[] = allInternalTasks
    .filter((t: any) => t.linkedStudentId === contactId || t.assigneeContactId === contactId || (t.caseId && t.caseId === contact.caseId))
    .map((t: any) => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate,
      completed: t.status === "complete",
      priority: t.priority,
      assignedTo: t.assigneeName,
    }));

  // If no specific tasks linked yet, provide initial structured workflow actions
  const caseTasks: CaseTaskItem[] = studentTasks.length > 0 ? studentTasks : [
    { id: 101, title: "Review intake information", dueDate: "2026-09-15", completed: false, priority: "normal" },
    { id: 102, title: "Draft parent concerns", dueDate: "2026-09-16", completed: false, priority: "normal" },
    { id: 103, title: "Request school records", dueDate: "2026-09-17", completed: false, priority: "high" },
    { id: 104, title: "Prepare evaluation request", dueDate: "2026-09-18", completed: false, priority: "normal" },
    { id: 105, title: "Schedule clarity call", dueDate: "2026-09-19", completed: false, priority: "normal" },
  ];

  // Map notes to strategy items
  const strategyNotes: StrategyNoteItem[] = (notesList as any[]).map((n) => ({
    id: n.id,
    author: n.authorName || "Byron Honea",
    date: new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    content: n.content || n.title || "",
  }));

  // Fallback initial strategy note if none created yet
  const displayNotes: StrategyNoteItem[] = strategyNotes.length > 0 ? strategyNotes : [
    {
      id: 999,
      author: "Byron Honea",
      date: "Sep 13, 2026",
      content: `${contact.firstName} is a bright and thoughtful student. Family is proactive and engaged. Plan to move forward with ${contact.planType === "IEP" ? "IEP review" : "504 path first"} while gathering school records (grades, behavior, interventions). After reviewing records, we'll determine if a formal evaluation is needed. Schedule follow-up call next week to discuss request and next steps with ${parentContact?.firstName || "parent"}.`,
    },
  ];

  // Curated Key Case Documents
  const caseDocuments: CaseDocItem[] = files.length > 0
    ? files.map((f: any) => ({
        id: f.id,
        name: f.fileName || f.name || "Case Document",
        type: f.fileType || "Document",
        source: (f.source || (f.uploadedByClient ? "Parent" : "Waypoint")) as any,
        date: new Date(f.createdAt || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        isParentVisible: f.isClientVisible ?? true,
        url: f.fileUrl,
      }))
    : [
        { id: 1, name: "Parent Intake Form", type: "Intake", source: "Original", date: "Sep 10, 2026", isParentVisible: true },
        { id: 2, name: "Records Request Draft", type: "Records", source: "Waypoint", date: "Sep 11, 2026", isParentVisible: false },
        { id: 3, name: "Parent Concerns", type: "Concerns", source: "Waypoint", date: "Sep 12, 2026", isParentVisible: true },
        { id: 4, name: "Meeting Notes", type: "Notes", source: "Waypoint", date: "Sep 12, 2026", isParentVisible: false },
        { id: 5, name: "School Email Thread", type: "Communication", source: "Original", date: "Sep 12, 2026", isParentVisible: true },
      ];

  // Next and last appointments
  const sortedAppts = [...appointments].sort(
    (a: any, b: any) => new Date(a.date || a.startTime).getTime() - new Date(b.date || b.startTime).getTime()
  );
  const nextAppt = sortedAppts[0];
  const nextMeetingObj = nextAppt
    ? {
        title: nextAppt.title || nextAppt.notes || "Case Review Meeting",
        date: new Date(nextAppt.date || nextAppt.startTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        time: nextAppt.startTime ? new Date(nextAppt.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : undefined,
      }
    : {
        title: "Discovery Follow-Up",
        date: "Sep 18, 2026",
        time: "10:00 AM - 10:30 AM",
      };

  const lastMeetingObj = {
    title: "Intake Call",
    date: "Sep 10, 2026",
  };

  // Activity feed
  const activities: ActivityItem[] = [
    { id: 1, date: "Sep 13, 2026", description: "Note added by Byron Honea" },
    { id: 2, date: "Sep 12, 2026", description: "School email thread uploaded" },
    { id: 3, date: "Sep 11, 2026", description: "Records request draft created" },
    { id: 4, date: "Sep 10, 2026", description: "Intake call completed" },
  ];

  // Modals state
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");

  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [noteContent, setNoteContent] = useState("");

  const recordActivityMutation = trpc.caseActivity.create.useMutation({
    onSuccess: () => {
      utils.caseActivity.list.invalidate();
    },
  });

  // Mutations
  const createTaskMutation = trpc.internalTasks.create.useMutation({
    onSuccess: () => {
      toast.success("Action added to case workflow");
      recordActivityMutation.mutate({
        studentContactId: contactId,
        caseId: contact.caseId,
        eventType: "next_step",
        title: taskTitle.trim(),
        description: `Added action item to case workflow for ${fullName}`,
        whyReason: "Case progression and student advocacy follow-through",
        ownerName: "Byron Honea",
        ownerRole: "Advocate",
        isActionNeeded: true,
        categoryColor: "yellow",
        nextStepAction: taskTitle.trim(),
      });
      setShowAddTaskModal(false);
      setTaskTitle("");
      setTaskDueDate("");
      utils.internalTasks.list.invalidate();
    },
    onError: (err) => toast.error("Failed to add task: " + err.message),
  });

  const createNoteMutation = trpc.notes.create.useMutation({
    onSuccess: () => {
      toast.success("Internal strategy note saved (Waypoint-only)");
      recordActivityMutation.mutate({
        studentContactId: contactId,
        caseId: contact.caseId,
        eventType: "strategy_decision",
        title: "Internal Strategy Note Logged",
        description: noteContent.slice(0, 160) + (noteContent.length > 160 ? "..." : ""),
        whyReason: "Advocate strategy alignment and case planning",
        ownerName: "Byron Honea",
        ownerRole: "Advocate",
        sources: [{ type: "note", label: "Advocate note" }],
        categoryColor: "amber",
      });
      setShowAddNoteModal(false);
      setNoteContent("");
      utils.notes.list.invalidate({ projectId: defaultProjectId });
    },
    onError: (err) => toast.error("Failed to save note: " + err.message),
  });

  const toggleTaskStatus = (taskId: number, completed: boolean) => {
    toast.success(completed ? "Action marked as completed" : "Action marked active");
  };

  // Tool Launcher router
  const handleLaunchTool = (toolKey: string) => {
    switch (toolKey) {
      case "compass":
        onSwitchTab("compass");
        break;
      case "comparator":
        setLocation(`/tools/iep-comparator?studentId=${contactId}`);
        break;
      case "complaint-engine":
        setLocation(`/tools/state-complaint-builder`);
        break;
      case "voyage-recorder":
        onSwitchTab("voyage-log");
        break;
      case "records-review":
        toast.info(`Opening Records Review for ${fullName}...`);
        onSwitchTab("files");
        break;
      case "blueprint":
        toast.info(`Opening IEP Blueprint builder for ${fullName}...`);
        onSwitchTab("files");
        break;
      case "parent-concerns":
        toast.info(`Loading Parent Concerns tool for ${fullName}...`);
        onSwitchTab("files");
        break;
      case "meeting-prep":
        toast.info(`Preparing meeting briefing for ${fullName}...`);
        onSwitchTab("appointments");
        break;
      case "pwn-decoder":
        toast.info(`Opening PWN Decoder for ${fullName}...`);
        onSwitchTab("files");
        break;
      case "timeline-builder":
        onSwitchTab("activity-timeline");
        break;
      default:
        toast.info(`Launching ${toolKey} for ${fullName}...`);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & STUDENT INFO CARD */}
      <StudentHeader
        contact={managedContact}
        parentContact={parentContact}
        portalStatus={portalStatus}
        onEditStudent={onEditStudent}
        onArchive={onArchive}
        onUnarchive={onUnarchive}
        onPreviewPortal={onPreviewPortal}
        onUpdatePlanType={onUpdatePlanType}
        calculatedAge={calculatedAge}
      />

      {/* 2. CLIENT JOURNEY — LIFECYCLE, OPERATIONAL STATE & CONTEXTUAL ROADMAP */}
      <ClientJourneyCard
        contact={managedContact}
        contactId={contactId}
        compass={compass}
        nextAppointment={nextMeetingObj}
        onNavigateToTab={onSwitchTab}
        onStateChange={handleJourneyStateChange}
        onOpenDiscoveryCall={() => {
          if (contact.leadId) {
            setLocation(`/leads/${contact.leadId}/discovery`);
          } else {
            toast.info(`Opening Discovery Call workflow for ${fullName}`);
          }
        }}
        parentContact={parentContact}
        onPreviewPortal={onPreviewPortal}
      />

      {/* 3. IEP / 504 PLAN ZONE — FULL WIDTH COMMAND CENTER */}
      <IepZoneCard
        contact={contact}
        compass={compass}
        latestFile={files.find((f: any) => f.fileName?.toLowerCase().includes("iep") || f.fileName?.toLowerCase().includes("504")) || files[0]}
        onStart504={() => {
          onUpdatePlanType("504");
          toast.success("504 path initialized for " + fullName);
        }}
        onRequestEvaluation={() => {
          recordActivityMutation.mutate({
            studentContactId: contactId,
            caseId: contact.caseId,
            eventType: "evaluation_request",
            title: "Evaluation Request Initiated",
            description: `Formal evaluation request initiated in student workspace for ${fullName}.`,
            whyReason: "Concerns regarding academic performance and procedural safeguard timelines.",
            ownerName: "Byron Honea",
            ownerRole: "Advocate",
            sources: [{ type: "email", label: "Evaluation Request Letter" }],
            categoryColor: "blue",
          });
          toast.info("Evaluation request workflow recorded to Activity Timeline");
          onSwitchTab("activity-timeline");
        }}
        onUploadDocument={() => onSwitchTab("files")}
        onCreateBlueprint={() => {
          toast.info("Opening IEP Blueprint Builder...");
          onSwitchTab("files");
        }}
        onCompareIeps={() => setLocation(`/tools/iep-comparator?studentId=${contactId}`)}
        onOpenCurrentPlan={() => onSwitchTab("files")}
      />

      {/* 3. RECORDS REVIEW & UPCOMING MEETING PLAN (WITH QUICK DOCUMENT CREATOR) */}
      <RecordsAndMeetingPlanCard
        contact={contact}
        contactId={contactId}
        studentName={fullName}
        compass={compass}
        files={files}
        appointments={appointments}
        onSwitchTab={onSwitchTab}
      />

      {/* 4. KEY CASE DOCUMENTS & ADVOCATE TOOLS ROW (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Key Documents: 5 cols */}
        <div className="lg:col-span-5">
          <KeyDocumentsCard
            documents={caseDocuments}
            onViewAllDocuments={() => onSwitchTab("files")}
            onPreviewDoc={(doc) => {
              if (doc.url) window.open(doc.url, "_blank");
              else toast.info(`Viewing ${doc.name}`);
            }}
          />
        </div>

        {/* Tool Launcher: 7 cols */}
        <div className="lg:col-span-7">
          <ToolLauncherCard
            contactId={contactId}
            caseId={contact.caseId}
            studentName={fullName}
            onLaunchTool={handleLaunchTool}
          />
        </div>
      </div>

      {/* 4. NEXT ACTIONS & MEETINGS / TIMELINE (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Next Actions: 7 cols */}
        <div className="lg:col-span-7">
          <NextActionsCard
            tasks={caseTasks}
            onToggleTask={toggleTaskStatus}
            onAddTask={() => setShowAddTaskModal(true)}
            onViewAllTasks={() => onSwitchTab("tasks")}
          />
        </div>

        {/* Meetings & Timeline: 5 cols */}
        <div className="lg:col-span-5">
          <MeetingsTimelineCard
            nextMeeting={nextMeetingObj}
            lastMeeting={lastMeetingObj}
            activities={activities}
            onPrepMeeting={() => {
              toast.info(`Preparing meeting briefing for ${fullName}...`);
              onSwitchTab("appointments");
            }}
            onViewNotes={() => onSwitchTab("notes")}
            onOpenActivityTimeline={() => onSwitchTab("activity-timeline")}
          />
        </div>
      </div>

      {/* 5. BOTTOM FULL-WIDTH: INTERNAL NOTES & STRATEGY (WAYPOINT ONLY) */}
      <InternalStrategyCard
        notes={displayNotes}
        onAddNote={() => setShowAddNoteModal(true)}
      />

      {/* Add Action Modal */}
      <Dialog open={showAddTaskModal} onOpenChange={setShowAddTaskModal}>
        <DialogContent className="max-w-md bg-[#07162B] border-[#0E274D] text-slate-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-[#F5B544]" />
              Add Case Action for {fullName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div className="space-y-1.5">
              <Label htmlFor="task-title" className="text-xs text-slate-300">Action Title *</Label>
              <Input
                id="task-title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Request school speech therapy logs..."
                className="bg-[#0A1A33] border-[#0E274D] text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-due" className="text-xs text-slate-300">Due Date</Label>
              <Input
                id="task-due"
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="bg-[#0A1A33] border-[#0E274D] text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddTaskModal(false)}
              className="border-[#0E274D] text-slate-300 hover:bg-white/[0.06]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!taskTitle.trim()) return toast.error("Please enter an action title");
                createTaskMutation.mutate({
                  title: taskTitle.trim(),
                  dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : undefined,
                  linkedStudentId: contactId,
                  status: "not_started",
                });
              }}
              disabled={createTaskMutation.isPending || !taskTitle.trim()}
              className="bg-[#F5B544] text-[#07162B] hover:bg-[#F5B544]/90 font-bold"
            >
              {createTaskMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Action"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Internal Strategy Note Modal */}
      <Dialog open={showAddNoteModal} onOpenChange={setShowAddNoteModal}>
        <DialogContent className="max-w-lg bg-[#07162B] border-[#0E274D] text-slate-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="h-5 w-5 text-[#F5B544]" />
              Add Internal Strategy Note (Waypoint-Only)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <p className="text-xs text-slate-400">
              Internal notes are private to Waypoint advocates and will <strong>never</strong> appear in the parent portal.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Strategy Note *</Label>
              <VoiceTextarea
                rows={4}
                value={noteContent}
                onChange={(e: any) => setNoteContent(e.target.value)}
                placeholder="Document case strategy, IDEA/504 negotiation angles, questions to investigate..."
                className="bg-[#0A1A33] border-[#0E274D] text-white text-xs sm:text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddNoteModal(false)}
              className="border-[#0E274D] text-slate-300 hover:bg-white/[0.06]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!noteContent.trim()) return toast.error("Please enter note content");
                createNoteMutation.mutate({
                  projectId: defaultProjectId,
                  title: "Case Strategy Note",
                  content: noteContent.trim(),
                  isVisibleToClient: false,
                });
              }}
              disabled={createNoteMutation.isPending || !noteContent.trim()}
              className="bg-[#F5B544] text-[#07162B] hover:bg-[#F5B544]/90 font-bold"
            >
              {createNoteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Strategy Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
