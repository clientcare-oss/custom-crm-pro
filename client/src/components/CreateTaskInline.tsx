/**
 * CreateTaskInline — unified task creation widget used on:
 *   - PG-009 Tasks page (standalone, no pre-linked contact/project)
 *   - PG-030 Contact Detail Tasks tab (pre-linked studentContactId)
 *
 * Task Types:
 *   general      → internalTasks.create  (assignee = team user)
 *   client       → tasks.createForStudent (assignee = contact, visible in portal)
 *   case         → tasks.createForStudent (no assignee, internal case work)
 */
import { useState } from "react";
import { Plus, Loader2, FileText, Users, Briefcase, ChevronDown } from "lucide-react";
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
  /** Pre-linked student contact ID (PG-030). When provided, type defaults to "case". */
  studentContactId?: number;
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

export function CreateTaskInline({ studentContactId, caseId, projectId, onCreated }: Props) {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const defaultType: TaskType = studentContactId ? "case" : "general";
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
  }

  function handleCreate() {
    if (!title.trim()) return;

    if (taskType === "general") {
      createGeneral.mutate({
        title: title.trim(),
        assigneeId: assigneeId ? parseInt(assigneeId) : undefined,
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
      // For client-facing, assignedTo = the contact themselves (or override)
      const assignedTo =
        taskType === "client"
          ? assigneeId
            ? parseInt(assigneeId)
            : contactId
          : undefined; // case tasks have no assignee

      createProjectTask.mutate({
        studentContactId: contactId,
        title: title.trim(),
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        status: "Todo",
        assignedTo,
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

        {/* Task Type */}
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

        {/* Case chip (when pre-linked) or Contact selector */}
        {taskType !== "general" && (
          studentContactId ? (
            caseId ? (
              <div className="flex items-center gap-1.5 text-xs bg-accent/10 border border-accent/20 rounded-md px-2.5 py-1.5 h-8">
                <span className="text-muted-foreground">Case:</span>
                <span className="font-mono font-semibold text-accent">{caseId}</span>
                <span className="text-muted-foreground/60">· auto-linked</span>
              </div>
            ) : null
          ) : (
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
          )
        )}

        {/* Assignee */}
        {taskType === "general" ? (
          <Select value={assigneeId} onValueChange={setAssigneeId}>
            <SelectTrigger className="text-xs h-8 w-40">
              <SelectValue placeholder="Assign to..." />
            </SelectTrigger>
            <SelectContent>
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
            </SelectContent>
          </Select>
        ) : taskType === "client" ? (
          // For client-facing, assignee = the contact (student/parent)
          <Select value={assigneeId} onValueChange={setAssigneeId}>
            <SelectTrigger className="text-xs h-8 w-44">
              <SelectValue placeholder="Assign to contact..." />
            </SelectTrigger>
            <SelectContent>
              {studentContactId ? (
                // Pre-linked: only show this contact
                (contacts as any[])
                  .filter((c: any) => c.id === studentContactId)
                  .map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                      {c.firstName} {c.lastName}
                    </SelectItem>
                  ))
              ) : (
                (contacts as any[]).map((c: any) => (
                  <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                    {c.firstName} {c.lastName}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        ) : null}

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
