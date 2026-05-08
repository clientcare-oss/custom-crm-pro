/**
 * CreateTaskInline — unified task creation widget used on:
 *   - PG-009 Tasks page (standalone, no pre-linked contact/project)
 *   - PG-030 Contact Detail Tasks tab (pre-linked studentContactId + parentContactId)
 *
 * Task Types:
 *   general      → internalTasks.create  (assignee = team user)
 *   client       → tasks.createForStudent (assignee = contact, visible in portal)
 *   case         → tasks.createForStudent (assignee = team member or none, internal)
 *
 * When studentContactId is pre-linked (PG-030):
 *   - Task Type selector is hidden; type auto-defaults to "case"
 *   - Assignee dropdown shows team members + parent contact (if parentContactId provided)
 *   - Selecting the parent contact auto-switches type to "client" (visible in portal)
 *   - Selecting a team member keeps type as "case"
 */
import { useState } from "react";
import { Plus, Loader2, FileText, Users, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

type TaskType = "general" | "client" | "case";

interface Props {
  /** Pre-linked student contact ID (PG-030). When provided, type defaults to "case" and type selector is hidden. */
  studentContactId?: number;
  /** Parent contact ID — when provided, shown in assignee dropdown; selecting them auto-switches type to "client" */
  parentContactId?: number | null;
  /** Pre-linked case ID string for display only */
  caseId?: string;
  /** Pre-linked project ID (skips project selector) */
  projectId?: number;
  /** Called after a task is successfully created */
  onCreated?: () => void;
}

const TYPE_CONFIG: Record<TaskType, { label: string; icon: React.ReactNode; color: string }> = {
  general: {
    label: "General",
    icon: <Briefcase className="h-3 w-3" />,
    color: "bg-muted text-muted-foreground border-border",
  },
  client: {
    label: "Client Facing",
    icon: <Users className="h-3 w-3 text-blue-500" />,
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  case: {
    label: "Case Task",
    icon: <FileText className="h-3 w-3 text-amber-500" />,
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
};

export function CreateTaskInline({ studentContactId, parentContactId, caseId, projectId, onCreated }: Props) {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // When in student context, always start as "case"; otherwise "general"
  const isStudentContext = !!studentContactId;
  const defaultType: TaskType = isStudentContext ? "case" : "general";
  const [taskType, setTaskType] = useState<TaskType>(defaultType);
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(projectId ? String(projectId) : "");
  const [selectedContactId, setSelectedContactId] = useState(
    studentContactId ? String(studentContactId) : ""
  );

  // Data queries
  const { data: teamUsers = [] } = trpc.internalTasks.getTeamUsers.useQuery();
  const { data: contacts = [] } = trpc.contacts.list.useQuery();
  const { data: projectsData = [] } = trpc.projects.list.useQuery();

  // Fetch parent contact details when parentContactId is provided
  const { data: parentContact } = trpc.contacts.get.useQuery(
    { id: parentContactId! },
    { enabled: !!parentContactId }
  );

  // Mutations
  const createGeneral = trpc.internalTasks.create.useMutation({
    onSuccess: () => {
      utils.internalTasks.list.invalidate();
      resetForm();
      toast.success("Task created");
      onCreated?.();
    },
    onError: (e) => toast.error("Failed: " + e.message),
  });

  const createProjectTask = trpc.tasks.createForStudent.useMutation({
    onSuccess: () => {
      utils.tasks.getAll.invalidate();
      if (studentContactId) utils.tasks.getByStudent.invalidate({ studentContactId });
      resetForm();
      toast.success("Task created");
      onCreated?.();
    },
    onError: (e) => toast.error("Failed: " + e.message),
  });

  function resetForm() {
    setTitle("");
    setAssigneeId("");
    setPriority("Medium");
    setDueDate("");
    if (!projectId) setSelectedProjectId("");
    if (!studentContactId) setSelectedContactId("");
    if (isStudentContext) setTaskType("case");
  }

  /**
   * When in student context, selecting the parent contact as assignee
   * auto-switches the task type to "client" (visible in portal).
   * Selecting a team member keeps it as "case".
   */
  function handleAssigneeChange(value: string) {
    setAssigneeId(value);
    if (isStudentContext) {
      const isParent = value.startsWith("parent-");
      setTaskType(isParent ? "client" : "case");
    } else if (value.startsWith("parent-") && taskType === "general") {
      // Auto-switch to client-facing when parent contact is assigned in general context
      setTaskType("client");
    }
  }

  function handleCreate() {
    if (!title.trim()) return;

    if (taskType === "general") {
      // Parse assignee — could be a user ID or parent-{contactId}
      let generalAssigneeId: number | undefined;
      let generalAssigneeContactId: number | undefined;
      if (assigneeId) {
        if (assigneeId.startsWith("parent-")) {
          generalAssigneeContactId = parseInt(assigneeId.replace("parent-", ""), 10);
        } else {
          generalAssigneeId = parseInt(assigneeId, 10);
        }
      }
      createGeneral.mutate({
        title: title.trim(),
        assigneeId: generalAssigneeId,
        assigneeContactId: generalAssigneeContactId,
        projectId: selectedProjectId ? parseInt(selectedProjectId) : undefined,
        dueDate: dueDate || undefined,
        status: "not_started",
      });
    } else {
      // client or case task — uses projectTasks table
      const contactId = studentContactId ?? (selectedContactId ? parseInt(selectedContactId) : undefined);
      if (!contactId) {
        toast.error("Please select a contact for this task");
        return;
      }

      let assignedTo: number | undefined;
      let assignedToUserId: number | undefined;

      if (taskType === "client") {
        // Client-facing: assignedTo = student contact ID (for portal visibility)
        assignedTo = contactId;
        // Also assign to a team member if one was selected
        if (assigneeId && !assigneeId.startsWith("parent-")) {
          assignedToUserId = parseInt(assigneeId);
        }
      } else {
        // Case task: team member assignment only (no portal visibility)
        if (assigneeId && !assigneeId.startsWith("parent-")) {
          assignedToUserId = parseInt(assigneeId);
        }
      }

      createProjectTask.mutate({
        studentContactId: contactId,
        title: title.trim(),
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        status: "Todo",
        assignedTo,
        assignedToUserId,
      });
    }
  }

  const isPending = createGeneral.isPending || createProjectTask.isPending;
  const typeCfg = TYPE_CONFIG[taskType];

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-3">
      {/* Title */}
      <Input
        placeholder="Task title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) handleCreate(); }}
        className="text-sm bg-background"
      />

      {/* Controls row */}
      <div className="flex gap-2 flex-wrap items-center">

        {/* Task Type — only shown when NOT in student context */}
        {!isStudentContext && (
          <Select value={taskType} onValueChange={(v) => { setTaskType(v as TaskType); setAssigneeId(""); }}>
            <SelectTrigger className={`text-xs h-8 w-40 border ${typeCfg.color}`}>
              <span className="flex items-center gap-1.5">
                {typeCfg.icon}
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(TYPE_CONFIG) as [TaskType, typeof TYPE_CONFIG[TaskType]][]).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">
                  <span className="flex items-center gap-1.5">{v.icon} {v.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* In student context: show auto-linked case chip */}
        {isStudentContext && caseId && (
          <div className="flex items-center gap-1.5 text-xs bg-accent/10 border border-accent/20 rounded-md px-2.5 py-1.5 h-8">
            <span className="text-muted-foreground">Case:</span>
            <span className="font-mono font-semibold text-accent">{caseId}</span>
            <span className="text-muted-foreground/60">· auto-linked</span>
          </div>
        )}

        {/* Contact selector — only when NOT in student context and type is not general */}
        {!isStudentContext && taskType !== "general" && (
          <Select value={selectedContactId} onValueChange={setSelectedContactId}>
            <SelectTrigger className="text-xs h-8 w-44">
              <SelectValue placeholder="Select contact..." />
            </SelectTrigger>
            <SelectContent>
              {(contacts as any[]).map((c: any) => (
                <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                  {c.firstName} {c.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Assignee dropdown */}
        {isStudentContext ? (
          // Student context: team members + parent contact
          <Select value={assigneeId} onValueChange={handleAssigneeChange}>
            <SelectTrigger className="text-xs h-8 w-48">
              <SelectValue placeholder="Assign to..." />
            </SelectTrigger>
            <SelectContent>
              {/* Current user (me) */}
              {user && (
                <SelectItem value={String(user.id)} className="text-xs">
                  <span className="flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                      {(user.name ?? "Y").charAt(0).toUpperCase()}
                    </div>
                    {user.name ?? "You"} (me)
                  </span>
                </SelectItem>
              )}
              {/* Other team members */}
              {(teamUsers as any[]).filter((u: any) => u.id !== user?.id).map((u: any) => (
                <SelectItem key={u.id} value={String(u.id)} className="text-xs">
                  <span className="flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded-full bg-violet-100 flex items-center justify-center text-[9px] font-bold text-violet-600">
                      {(u.name ?? "?").charAt(0).toUpperCase()}
                    </div>
                    {u.name}
                  </span>
                </SelectItem>
              ))}
              {/* Parent contact — shown only if parentContactId is provided */}
              {parentContact && (
                <SelectItem value={`parent-${parentContact.id}`} className="text-xs">
                  <span className="flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded-full bg-green-100 flex items-center justify-center text-[9px] font-bold text-green-700">
                      {(parentContact.firstName ?? "P").charAt(0).toUpperCase()}
                    </div>
                    {parentContact.firstName} {parentContact.lastName}
                    <span className="text-green-600 ml-0.5">(parent · client facing)</span>
                  </span>
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        ) : taskType === "general" ? (
          // General task: team members + parent contacts
          <Select value={assigneeId} onValueChange={handleAssigneeChange}>
            <SelectTrigger className="text-xs h-8 w-40">
              <SelectValue placeholder="Assign to..." />
            </SelectTrigger>
            <SelectContent>
              {/* Staff */}
              <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Staff</div>
              {user && (
                <SelectItem value={String(user.id)} className="text-xs">
                  <span className="flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                      {(user.name ?? "Y").charAt(0).toUpperCase()}
                    </div>
                    {user.name ?? "You"} (me)
                  </span>
                </SelectItem>
              )}
              {(teamUsers as any[]).filter((u: any) => u.id !== user?.id).map((u: any) => (
                <SelectItem key={u.id} value={String(u.id)} className="text-xs">
                  <span className="flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                      {(u.name ?? "?").charAt(0).toUpperCase()}
                    </div>
                    {u.name}
                  </span>
                </SelectItem>
              ))}
              {/* Parent contacts */}
              {(contacts as any[]).filter((c: any) => c.jobTitle !== "Student").length > 0 && (
                <div className="px-2 py-1 mt-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-t">Parents / Contacts</div>
              )}
              {(contacts as any[]).filter((c: any) => c.jobTitle !== "Student").map((c: any) => (
                <SelectItem key={`parent-${c.id}`} value={`parent-${c.id}`} className="text-xs">
                  <span className="flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded-full bg-green-100 flex items-center justify-center text-[9px] font-bold text-green-700">
                      {(c.firstName ?? "P").charAt(0).toUpperCase()}
                    </div>
                    {c.firstName} {c.lastName}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          // Client/case task (standalone, no student context): staff + parent contacts
          <Select value={assigneeId} onValueChange={handleAssigneeChange}>
            <SelectTrigger className="text-xs h-8 w-44">
              <SelectValue placeholder="Assign to..." />
            </SelectTrigger>
            <SelectContent>
              {/* Staff */}
              <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Staff</div>
              {user && (
                <SelectItem value={String(user.id)} className="text-xs">
                  <span className="flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                      {(user.name ?? "Y").charAt(0).toUpperCase()}
                    </div>
                    {user.name ?? "You"} (me)
                  </span>
                </SelectItem>
              )}
              {(teamUsers as any[]).filter((u: any) => u.id !== user?.id).map((u: any) => (
                <SelectItem key={u.id} value={String(u.id)} className="text-xs">
                  <span className="flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                      {(u.name ?? "?").charAt(0).toUpperCase()}
                    </div>
                    {u.name}
                  </span>
                </SelectItem>
              ))}
              {/* Parent contacts */}
              {(contacts as any[]).filter((c: any) => c.jobTitle !== "Student").length > 0 && (
                <div className="px-2 py-1 mt-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-t">Parents / Contacts</div>
              )}
              {(contacts as any[]).filter((c: any) => c.jobTitle !== "Student").map((c: any) => (
                <SelectItem key={`parent-${c.id}`} value={`parent-${c.id}`} className="text-xs">
                  <span className="flex items-center gap-1.5">
                    <div className="h-4 w-4 rounded-full bg-green-100 flex items-center justify-center text-[9px] font-bold text-green-700">
                      {(c.firstName ?? "P").charAt(0).toUpperCase()}
                    </div>
                    {c.firstName} {c.lastName}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Priority */}
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="text-xs h-8 w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="High" className="text-xs">High</SelectItem>
            <SelectItem value="Medium" className="text-xs">Medium</SelectItem>
            <SelectItem value="Low" className="text-xs">Low</SelectItem>
          </SelectContent>
        </Select>

        {/* Due date */}
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="text-xs h-8 w-36"
        />

        {/* Auto-type indicator when in student context */}
        {isStudentContext && (
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded border h-8 ${typeCfg.color}`}>
            {typeCfg.icon}
            <span>{typeCfg.label}</span>
          </div>
        )}
      </div>

      {/* Create button */}
      <Button
        className="w-full h-9 text-sm font-medium"
        disabled={!title.trim() || isPending}
        onClick={handleCreate}
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
        ) : (
          <Plus className="h-3.5 w-3.5 mr-2" />
        )}
        Create Task
      </Button>
    </div>
  );
}
