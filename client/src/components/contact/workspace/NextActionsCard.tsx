import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CheckSquare, ArrowRight, Plus, CheckCircle2, Circle, Clock } from "lucide-react";

export interface CaseTaskItem {
  id: number;
  title: string;
  dueDate?: string | null;
  completed: boolean;
  priority?: string | null;
  assignedTo?: string | null;
}

interface NextActionsCardProps {
  tasks: CaseTaskItem[];
  onToggleTask: (taskId: number, completed: boolean) => void;
  onAddTask: () => void;
  onViewAllTasks: () => void;
}

export function NextActionsCard({
  tasks,
  onToggleTask,
  onAddTask,
  onViewAllTasks,
}: NextActionsCardProps) {
  const activeTasks = tasks.filter((t) => !t.completed);
  const displayTasks = tasks.slice(0, 5);

  const formatDue = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const isOverdue = d < new Date() && !isNaN(d.getTime());
    const formatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { text: `Due ${formatted}`, isOverdue };
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#0A1A33] to-[#07162B] border border-[#0E274D] p-5 shadow-lg flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#0E274D] pb-3 mb-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-[#F5B544]" />
            <h3 className="text-base font-bold text-white font-serif tracking-wide">
              Next Actions
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400 font-mono">
              {activeTasks.length} {activeTasks.length === 1 ? "task" : "tasks"}
            </span>
            <button
              onClick={onViewAllTasks}
              className="text-xs font-semibold text-[#F5B544] hover:text-[#F5B544]/80 inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-2 mb-4">
          {displayTasks.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 italic">
              No pending actions. Add a new action below!
            </div>
          ) : (
            displayTasks.map((task) => {
              const dueInfo = formatDue(task.dueDate);
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-[#07162B]/80 hover:bg-[#0F2342] border border-[#0E274D] transition-colors group cursor-pointer"
                  onClick={() => onToggleTask(task.id, !task.completed)}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      className="text-slate-400 group-hover:text-[#F5B544] shrink-0 transition-colors"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </button>
                    <span
                      className={cn(
                        "text-xs font-medium truncate transition-colors",
                        task.completed
                          ? "line-through text-slate-500"
                          : "text-slate-200 group-hover:text-white"
                      )}
                    >
                      {task.title}
                    </span>
                  </div>

                  {dueInfo && (
                    <span
                      className={cn(
                        "text-[10.5px] font-mono shrink-0 px-2 py-0.5 rounded border",
                        dueInfo.isOverdue && !task.completed
                          ? "text-rose-400 border-rose-500/30 bg-rose-500/10"
                          : "text-slate-400 border-slate-700 bg-slate-800/40"
                      )}
                    >
                      {dueInfo.text}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Gold Add Action Button */}
      <Button
        onClick={onAddTask}
        className="w-full h-9 bg-[#F5B544] text-[#07162B] hover:bg-[#F5B544]/90 font-bold text-xs gap-1.5 shadow-sm cursor-pointer"
      >
        <Plus className="h-4 w-4" />
        Add Action
      </Button>
    </div>
  );
}
