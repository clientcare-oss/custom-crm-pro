import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Circle,
  User,
  Calendar,
  Flag,
  Target,
  Sparkles,
  ArrowRight,
  Plus,
  Layers,
  CheckSquare,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { STUDIO_COLORS, type StudioCanvasObject, type StudioTaskRecord } from "./studioTypes";

interface StudioCardsSurfaceProps {
  taskLinkedObjects: { object: StudioCanvasObject; pageTitle: string; pageId: string }[];
  ordinaryNotesCount: number;
  drawingsAndShapesCount: number;
  tasksById: Map<number, StudioTaskRecord>;
  teamRoster: { id: number; name: string; role: string; initials: string }[];
  selectedTaskId: number | null;
  canEdit: boolean;
  onSelectTask: (taskId: number, objectId?: string) => void;
  onChangeTaskStatus: (
    taskId: number,
    newStatus: "not_started" | "in_progress" | "complete"
  ) => void;
  onAssignTask: (
    taskId: number,
    assigneeId: number | null,
    assigneeName: string | null,
    isMyFocus?: boolean
  ) => void;
  onStartTaskDrag: (payload: { type: "task"; taskId: number; objectId?: string; title: string }) => void;
  onEndTaskDrag: () => void;
  onSwitchToNeonCanvas: () => void;
  onCreateNewTaskNote: (initialStatus: "not_started" | "in_progress" | "complete") => void;
}

const COLUMNS: {
  id: "open" | "in_progress" | "complete";
  label: string;
  targetStatus: "not_started" | "in_progress" | "complete";
  accentBorder: string;
  badgeClass: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "open",
    label: "Open",
    targetStatus: "not_started",
    accentBorder: "border-cyan-400/40",
    badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-400/40",
    icon: Circle,
  },
  {
    id: "in_progress",
    label: "In Progress",
    targetStatus: "in_progress",
    accentBorder: "border-violet-400/40",
    badgeClass: "bg-violet-500/15 text-violet-300 border-violet-400/40",
    icon: Clock,
  },
  {
    id: "complete",
    label: "Complete",
    targetStatus: "complete",
    accentBorder: "border-emerald-400/40",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-400/40",
    icon: CheckCircle2,
  },
];

export function StudioCardsSurface({
  taskLinkedObjects,
  ordinaryNotesCount,
  drawingsAndShapesCount,
  tasksById,
  teamRoster,
  selectedTaskId,
  canEdit,
  onSelectTask,
  onChangeTaskStatus,
  onAssignTask,
  onStartTaskDrag,
  onEndTaskDrag,
  onSwitchToNeonCanvas,
  onCreateNewTaskNote,
}: StudioCardsSurfaceProps) {
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // Deduplicate by linkedTaskId so each task record appears once in Cards view
  const uniqueTaskEntries = React.useMemo(() => {
    const seen = new Set<number>();
    const list: {
      taskId: number;
      task: StudioTaskRecord;
      object?: StudioCanvasObject;
      pageTitle: string;
    }[] = [];

    for (const item of taskLinkedObjects) {
      const tid = item.object.linkedTaskId;
      if (!tid || seen.has(tid)) continue;
      seen.add(tid);
      const task = tasksById.get(tid) || {
        id: tid,
        title: item.object.title || item.object.text || "Untitled Task",
        description: item.object.text || null,
        status: "not_started",
        priority: item.object.priority || "medium",
        assigneeId: null,
        assigneeName: null,
        dueDate: null,
        boardId: null,
        boardTitle: null,
        isMyFocus: Boolean(item.object.isMyFocus),
        subtasks: [],
      };
      list.push({
        taskId: tid,
        task,
        object: item.object,
        pageTitle: item.pageTitle,
      });
    }
    return list;
  }, [taskLinkedObjects, tasksById]);

  const getColumnForStatus = (
    status: StudioTaskRecord["status"]
  ): "open" | "in_progress" | "complete" => {
    if (status === "complete") return "complete";
    if (status === "in_progress" || status === "paused" || status === "stuck") {
      return "in_progress";
    }
    return "open";
  };

  return (
    <div
      data-testid="studio-cards-surface"
      className="flex-1 h-full overflow-y-auto bg-[#000820] px-4 sm:px-6 py-4 flex flex-col gap-4 select-none"
    >
      {/* Clear explanation banner when ordinary notes or drawings are omitted from Cards view */}
      <div
        data-testid="cards-omitted-explanation-banner"
        className="rounded-xl border border-[#1E3264] bg-[#040D28]/95 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md"
      >
        <div className="flex items-center gap-2.5 text-xs text-slate-200">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            <strong className="text-white">Cards Surface:</strong> Showing{" "}
            <span className="text-cyan-300 font-semibold">
              {uniqueTaskEntries.length} task-linked{" "}
              {uniqueTaskEntries.length === 1 ? "item" : "items"}
            </span>{" "}
            by status.{" "}
            {(ordinaryNotesCount > 0 || drawingsAndShapesCount > 0) && (
              <span className="text-slate-300">
                ({ordinaryNotesCount} ordinary{" "}
                {ordinaryNotesCount === 1 ? "note" : "notes"} and{" "}
                {drawingsAndShapesCount} freehand{" "}
                {drawingsAndShapesCount === 1 ? "drawing/shape" : "drawings/shapes"}{" "}
                are omitted from Cards view and preserved in their original arrangement on the canvas.)
              </span>
            )}
          </span>
        </div>

        <button
          type="button"
          onClick={onSwitchToNeonCanvas}
          className="text-xs font-semibold text-[#FFE394] hover:text-white inline-flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>Return to Neon Canvas</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3 Status Columns: Open | In Progress | Complete */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[420px]">
        {COLUMNS.map((col) => {
          const Icon = col.icon;
          const items = uniqueTaskEntries.filter(
            (entry) => getColumnForStatus(entry.task.status) === col.id
          );
          const isDropTarget = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              data-testid={`studio-cards-col-${col.id}`}
              onDragOver={(e) => {
                if (!canEdit) return;
                e.preventDefault();
                setDragOverCol(col.id);
              }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => {
                if (!canEdit) return;
                e.preventDefault();
                setDragOverCol(null);
                try {
                  const raw = e.dataTransfer.getData("application/x-waypoint-studio");
                  if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed.taskId) {
                      onChangeTaskStatus(Number(parsed.taskId), col.targetStatus);
                    }
                  }
                } catch {}
              }}
              className={`rounded-2xl border bg-[#030B22]/95 p-3.5 flex flex-col justify-between transition-all ${
                isDropTarget
                  ? "border-cyan-400 ring-2 ring-cyan-400/35 bg-[#07163B]"
                  : "border-[#182954]"
              }`}
            >
              <div className="space-y-3">
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-[#182954]">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${col.badgeClass}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{col.label}</span>
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-300 px-2 py-0.5 rounded-full bg-[#061230] border border-[#1E3264]">
                    {items.length}
                  </span>
                </div>

                {/* Cards List */}
                <div className="space-y-2.5">
                  {items.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#1E3264] bg-[#02081A]/60 p-6 text-center space-y-2">
                      <p className="text-xs text-slate-400">
                        No {col.label.toLowerCase()} board tasks yet.
                      </p>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => onCreateNewTaskNote(col.targetStatus)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-white cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add task note</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    items.map(({ taskId, task, object, pageTitle }) => {
                      const isSelected = selectedTaskId === taskId;
                      const palette =
                        STUDIO_COLORS[object?.colorKey || "cyan"] || STUDIO_COLORS.cyan;
                      const doneSubs = task.subtasks.filter((s) => s.isComplete).length;

                      return (
                        <div
                          key={taskId}
                          data-testid={`studio-task-card-${taskId}`}
                          draggable={canEdit}
                          onDragStart={(e) => {
                            const payload = {
                              type: "task" as const,
                              taskId,
                              objectId: object?.id,
                              title: task.title,
                            };
                            e.dataTransfer.setData(
                              "application/x-waypoint-studio",
                              JSON.stringify(payload)
                            );
                            onStartTaskDrag(payload);
                          }}
                          onDragEnd={onEndTaskDrag}
                          onClick={() => onSelectTask(taskId, object?.id)}
                          className={`rounded-xl border p-3.5 space-y-2.5 transition-all cursor-pointer ${
                            isSelected
                              ? "border-[#FFE394] bg-[#091A42] shadow-[0_0_20px_rgba(255,227,148,0.2)]"
                              : "border-[#1E3264] bg-[#05102C] hover:border-cyan-400/50 hover:bg-[#08173B]"
                          }`}
                        >
                          {/* Top Row: Task Badge + Priority + My Focus */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: palette.swatchHex }}
                              />
                              <span className="text-[10px] font-mono text-cyan-300 font-bold">
                                TASK #{taskId}
                              </span>
                              {task.isMyFocus && (
                                <span className="px-1.5 py-0.2 rounded-full bg-[#C5A059]/25 border border-[#FFE394]/50 text-[#FFE394] text-[9px] font-bold flex items-center gap-0.5">
                                  <Target className="w-2.5 h-2.5" />
                                  Focus
                                </span>
                              )}
                            </div>

                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#02081A] border border-[#1E3264] text-slate-300">
                              {task.priority || "medium"}
                            </span>
                          </div>

                          {/* Title & Description */}
                          <div>
                            <h4 className="text-sm font-semibold text-white leading-snug">
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-xs text-slate-300 line-clamp-2 mt-1">
                                {task.description}
                              </p>
                            )}
                          </div>

                          {/* Checklist & Page Metadata */}
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#182954] text-[11px] text-slate-300">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="truncate text-slate-400">{pageTitle}</span>
                              {task.subtasks.length > 0 && (
                                <span className="inline-flex items-center gap-1 text-cyan-300 font-mono text-[10px]">
                                  <CheckSquare className="w-3 h-3" />
                                  {doneSubs}/{task.subtasks.length}
                                </span>
                              )}
                            </div>

                            {/* Quick Click-to-Assign Selector */}
                            <select
                              disabled={!canEdit}
                              value={task.assigneeId ?? ""}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                const val = e.target.value;
                                const uid = val ? Number(val) : null;
                                const member = teamRoster.find((m) => m.id === uid);
                                onAssignTask(
                                  taskId,
                                  uid,
                                  member ? member.name : null
                                );
                              }}
                              aria-label={`Assign ${task.title}`}
                              className="h-6 rounded bg-[#02081A] border border-[#1E3264] px-1.5 text-[10px] text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
                            >
                              <option value="">Unassigned</option>
                              {teamRoster.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Quick Status Switch Pills */}
                          {canEdit && (
                            <div
                              className="flex items-center gap-1 pt-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {COLUMNS.map((c) => {
                                const active =
                                  getColumnForStatus(task.status) === c.id;
                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() =>
                                      onChangeTaskStatus(taskId, c.targetStatus)
                                    }
                                    className={`flex-1 py-1 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                                      active
                                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                                        : "bg-[#02081A] border-[#182954] text-slate-400 hover:text-white"
                                    }`}
                                  >
                                    {c.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {canEdit && items.length > 0 && (
                <button
                  type="button"
                  onClick={() => onCreateNewTaskNote(col.targetStatus)}
                  className="mt-3 w-full py-1.5 rounded-xl border border-dashed border-[#1E3264] hover:border-cyan-400/50 text-xs text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-cyan-400" />
                  <span>New {col.label} Task Note</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
