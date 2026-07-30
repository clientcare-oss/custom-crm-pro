import React from "react";
import { CheckSquare, CheckCircle2, Clock, Calendar } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TaskItem {
  id: number;
  title: string;
  description?: string;
  status: string;
  dueDate?: string | Date;
  priority?: string;
}

interface PortalTasksTabProps {
  tasks?: TaskItem[];
  onToggleTaskStatus?: (taskId: number, newStatus: "Todo" | "In Progress" | "Done") => void;
}

export default function PortalTasksTab({ tasks = [], onToggleTaskStatus }: PortalTasksTabProps) {
  const pendingTasks = tasks.filter((t) => t.status !== "Done");
  const completedTasks = tasks.filter((t) => t.status === "Done");

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-amber-400" />
            Action Items & Tasks
          </h2>
          <p className="text-xs text-slate-400 mt-1">Key preparation steps assigned by your advocate</p>
        </div>
        <Badge className="bg-amber-400/10 text-amber-300 border-amber-400/30 text-xs px-3 py-1">
          {pendingTasks.length} Pending Actions
        </Badge>
      </div>

      {/* Pending Tasks */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">PENDING ACTION ITEMS</h3>
        {pendingTasks.length === 0 ? (
          <div className="p-6 bg-[#0A1628]/60 border border-slate-800 rounded-xl text-center text-slate-400 text-xs">
            🎉 All action items are complete! You are all caught up.
          </div>
        ) : (
          pendingTasks.map((task) => (
            <Card key={task.id} className="border-slate-800 bg-[#0A1628]/90 text-slate-100 shadow-md hover:border-slate-700 transition-all">
              <CardContent className="p-4 flex items-start gap-3">
                <button
                  onClick={() => onToggleTaskStatus?.(task.id, "Done")}
                  className="w-5 h-5 rounded border border-slate-600 bg-slate-900 hover:border-amber-400 flex items-center justify-center shrink-0 mt-0.5 transition-colors"
                  title="Mark Task Completed"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-white truncate">{task.title}</h4>
                    {task.dueDate && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Due {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{task.description}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-800/80">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">COMPLETED ACTIONS</h3>
          {completedTasks.map((task) => (
            <Card key={task.id} className="border-slate-800/60 bg-[#0A1628]/40 text-slate-400">
              <CardContent className="p-3.5 flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs line-through">{task.title}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
