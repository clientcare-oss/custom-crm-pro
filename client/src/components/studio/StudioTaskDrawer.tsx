import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  ExternalLink,
  Calendar,
  User,
  Flag,
  Layers,
  Target,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { StudioTaskRecord } from "./studioTypes";

interface StudioTaskDrawerProps {
  task: StudioTaskRecord | null;
  isOpen: boolean;
  boardTitle: string;
  pageTitle: string;
  teamRoster: { id: number; name: string; role: string; initials: string }[];
  canEdit: boolean;
  onClose: () => void;
  onUpdateTask: (updates: {
    taskId: number;
    title?: string;
    description?: string | null;
    status?: "not_started" | "in_progress" | "paused" | "stuck" | "complete";
    assigneeId?: number | null;
    assigneeName?: string | null;
    priority?: "low" | "medium" | "high" | "urgent";
    dueDate?: string | null;
    isMyFocus?: boolean;
  }) => void;
  onAddChecklistItem: (taskId: number, title: string) => void;
  onToggleChecklistItem: (taskId: number, subtaskId: number, isComplete: boolean) => void;
  onDeleteChecklistItem: (taskId: number, subtaskId: number) => void;
  onOpenFullTaskPage: (taskId: number) => void;
}

export function StudioTaskDrawer({
  task,
  isOpen,
  boardTitle,
  pageTitle,
  teamRoster,
  canEdit,
  onClose,
  onUpdateTask,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
  onOpenFullTaskPage,
}: StudioTaskDrawerProps) {
  const [titleDraft, setTitleDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");
  const [newChecklistTitle, setNewChecklistTitle] = useState("");

  useEffect(() => {
    if (task) {
      setTitleDraft(task.title || "");
      setDescDraft(task.description || "");
    }
  }, [task?.id, task?.title, task?.description]);

  if (!isOpen || !task) return null;

  const dueDateInputVal = task.dueDate
    ? new Date(task.dueDate).toISOString().split("T")[0]
    : "";

  const completedSubtasks = task.subtasks.filter((s) => s.isComplete).length;

  return (
    <aside
      data-testid="studio-task-drawer"
      aria-label="Linked CRM Task Inspector"
      className="w-[340px] sm:w-[375px] shrink-0 h-full bg-[#030B22]/98 border-l border-[#1E3264] shadow-[-16px_0_40px_rgba(0,0,0,0.85)] flex flex-col z-30 text-slate-100 select-none"
    >
      {/* Top Drawer Header */}
      <div className="px-4 py-3 border-b border-[#1E3264] bg-[#05102E] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-wider">
            <CheckSquare className="w-3 h-3" />
            Task #{task.id}
          </span>
          {task.isMyFocus && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#C5A059]/20 border border-[#FFE394]/50 text-[#FFE394] text-[10px] font-semibold">
              <Target className="w-2.5 h-2.5" />
              My Focus
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          data-testid="close-studio-task-drawer"
          className="h-7 w-7 rounded-lg border border-[#1E3264] bg-[#02081A] text-slate-300 hover:text-white hover:border-cyan-400/50 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close task drawer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scrollable Inspector Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 1. Title */}
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Task Title
          </label>
          <Input
            data-testid="studio-task-title-input"
            disabled={!canEdit}
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => {
              if (titleDraft.trim() && titleDraft.trim() !== task.title) {
                onUpdateTask({ taskId: task.id, title: titleDraft.trim() });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            className="h-9 bg-[#02081A] border-[#1E3264] text-white font-semibold text-xs focus-visible:ring-cyan-400"
          />
        </div>

        {/* 2. Status & Priority Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Status
            </label>
            <select
              data-testid="studio-task-status-select"
              disabled={!canEdit}
              value={task.status}
              onChange={(e) =>
                onUpdateTask({
                  taskId: task.id,
                  status: e.target.value as StudioTaskRecord["status"],
                })
              }
              className="w-full h-8.5 rounded-lg bg-[#02081A] border border-[#1E3264] px-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="not_started">Open (Not Started)</option>
              <option value="in_progress">In Progress</option>
              <option value="paused">Paused</option>
              <option value="stuck">Stuck</option>
              <option value="complete">Complete</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Flag className="w-2.5 h-2.5 text-[#DFBE77]" />
              Priority
            </label>
            <select
              data-testid="studio-task-priority-select"
              disabled={!canEdit}
              value={task.priority || "medium"}
              onChange={(e) =>
                onUpdateTask({
                  taskId: task.id,
                  priority: e.target.value as StudioTaskRecord["priority"],
                })
              }
              className="w-full h-8.5 rounded-lg bg-[#02081A] border border-[#1E3264] px-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* 3. Assignee & Due Date Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <User className="w-2.5 h-2.5 text-cyan-400" />
              Assignee
            </label>
            <select
              data-testid="studio-task-assignee-select"
              disabled={!canEdit}
              value={task.assigneeId ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                const uid = val ? Number(val) : null;
                const member = teamRoster.find((m) => m.id === uid);
                onUpdateTask({
                  taskId: task.id,
                  assigneeId: uid,
                  assigneeName: member ? member.name : null,
                });
              }}
              className="w-full h-8.5 rounded-lg bg-[#02081A] border border-[#1E3264] px-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="">Unassigned</option>
              {teamRoster.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5 text-violet-400" />
              Due Date
            </label>
            <input
              type="date"
              data-testid="studio-task-duedate-input"
              disabled={!canEdit}
              value={dueDateInputVal}
              onChange={(e) =>
                onUpdateTask({
                  taskId: task.id,
                  dueDate: e.target.value ? e.target.value : null,
                })
              }
              className="w-full h-8.5 rounded-lg bg-[#02081A] border border-[#1E3264] px-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* My Focus quick toggle */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#061230] border border-[#1E3264]">
          <div className="flex items-center gap-2">
            <Target className="w-3.5 h-3.5 text-[#FFE394]" />
            <span className="text-xs font-medium text-slate-200">
              In My Personal Focus List
            </span>
          </div>
          <button
            type="button"
            disabled={!canEdit}
            onClick={() =>
              onUpdateTask({
                taskId: task.id,
                isMyFocus: !task.isMyFocus,
              })
            }
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
              task.isMyFocus
                ? "bg-[#FFE394] text-[#000820] border-white"
                : "bg-[#02081A] text-slate-300 border-[#1E3264] hover:border-[#FFE394]/60"
            }`}
          >
            {task.isMyFocus ? "Active" : "Add to Focus"}
          </button>
        </div>

        {/* 4. Description */}
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Description & Notes
          </label>
          <Textarea
            data-testid="studio-task-description-input"
            disabled={!canEdit}
            rows={3}
            value={descDraft}
            onChange={(e) => setDescDraft(e.target.value)}
            onBlur={() => {
              if (descDraft !== (task.description || "")) {
                onUpdateTask({ taskId: task.id, description: descDraft });
              }
            }}
            placeholder="Add context, case details, or action criteria..."
            className="bg-[#02081A] border-[#1E3264] text-white text-xs resize-none focus-visible:ring-cyan-400"
          />
        </div>

        {/* 5. Checklist (Subtasks synchronized with internalSubtasks) */}
        <div className="space-y-2 pt-2 border-t border-[#1E3264]">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Checklist ({completedSubtasks}/{task.subtasks.length})
            </label>
          </div>

          <div className="space-y-1.5">
            {task.subtasks.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#05102B] border border-[#172852] group"
              >
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() =>
                    onToggleChecklistItem(task.id, sub.id, !sub.isComplete)
                  }
                  className="flex items-center gap-2 text-left flex-1 min-w-0 cursor-pointer"
                >
                  {sub.isComplete ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span
                    className={`text-xs truncate ${
                      sub.isComplete ? "line-through text-slate-500" : "text-slate-100"
                    }`}
                  >
                    {sub.title}
                  </span>
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onDeleteChecklistItem(task.id, sub.id)}
                    className="opacity-70 hover:opacity-100 text-slate-400 hover:text-rose-400 transition-opacity cursor-pointer"
                    aria-label="Remove checklist item"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {canEdit && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newChecklistTitle.trim()) return;
                onAddChecklistItem(task.id, newChecklistTitle.trim());
                setNewChecklistTitle("");
              }}
              className="flex items-center gap-1.5"
            >
              <Input
                data-testid="studio-checklist-add-input"
                value={newChecklistTitle}
                onChange={(e) => setNewChecklistTitle(e.target.value)}
                placeholder="Add checklist step..."
                className="h-8 bg-[#02081A] border-[#1E3264] text-white text-xs"
              />
              <Button
                type="submit"
                size="sm"
                className="h-8 px-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 text-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </form>
          )}
        </div>

        {/* 6. Linked Board Context */}
        <div className="p-2.5 rounded-xl bg-[#05102B] border border-[#172852] space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Layers className="w-3 h-3 text-[#DFBE77]" />
            Linked Studio Board
          </div>
          <div className="text-xs font-semibold text-[#FFF4D4] truncate">
            {boardTitle}
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            {pageTitle} · Synced with CRM Tasks
          </div>
        </div>
      </div>

      {/* Drawer Footer: Open Full Task */}
      <div className="p-3 border-t border-[#1E3264] bg-[#05102E] shrink-0">
        <Button
          type="button"
          data-testid="open-full-crm-task-btn"
          onClick={() => onOpenFullTaskPage(task.id)}
          className="w-full h-9 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#000820] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Open Full Task in Tasks</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Button>
      </div>
    </aside>
  );
}
