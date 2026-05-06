import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckSquare, Circle, CheckCircle2, Loader2, Filter } from "lucide-react";

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <CheckSquare className="h-12 w-12 text-muted-foreground/40 mb-4" />
      <p className="text-lg font-semibold text-foreground">No tasks yet</p>
      <p className="text-sm text-muted-foreground mt-1">
        Tasks assigned to students will appear here. Add them from each student's contact page.
      </p>
    </div>
  );
}

const PRIORITY_COLORS: Record<string, string> = {
  High: "text-red-600 bg-red-50 border-red-200",
  Medium: "text-amber-600 bg-amber-50 border-amber-200",
  Low: "text-emerald-600 bg-emerald-50 border-emerald-200",
};

const STATUS_FILTERS = ["All", "Todo", "In Progress", "Done"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

export default function Tasks() {
  const [filter, setFilter] = useState<StatusFilter>("All");
  const utils = trpc.useUtils();

  const { data: tasks = [], isLoading } = trpc.tasks.getAll.useQuery();

  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => utils.tasks.getAll.invalidate(),
  });

  const filtered = filter === "All" ? tasks : tasks.filter((t: any) => t.status === filter);

  const counts = {
    All: tasks.length,
    Todo: tasks.filter((t: any) => t.status === "Todo").length,
    "In Progress": tasks.filter((t: any) => t.status === "In Progress").length,
    Done: tasks.filter((t: any) => t.status === "Done").length,
  };

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-accent" />
            Tasks
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            All tasks across every student case
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              filter === s
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-transparent text-muted-foreground border-border hover:border-accent/50"
            }`}
          >
            {s}
            <span className="ml-1.5 opacity-70">{counts[s]}</span>
          </button>
        ))}
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          {filtered.map((task: any) => (
            <Card key={task.id} className="p-4 rounded-xl border border-border flex items-start gap-3">
              <button
                onClick={() =>
                  updateTask.mutate({
                    id: task.id,
                    status: task.status === "Done" ? "Todo" : "Done",
                  })
                }
                className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-accent transition-colors"
              >
                {task.status === "Done" ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    task.status === "Done"
                      ? "line-through text-muted-foreground"
                      : "text-foreground"
                  }`}
                >
                  {task.title}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {task.clientName && (
                    <span className="text-xs text-muted-foreground font-medium">
                      {task.clientName}
                    </span>
                  )}
                  {task.projectName && (
                    <span className="text-xs text-muted-foreground">· {task.projectName}</span>
                  )}
                  {task.priority && (
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        PRIORITY_COLORS[task.priority] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {task.priority}
                    </span>
                  )}
                  {task.dueDate && (
                    <span className="text-xs text-muted-foreground">
                      Due {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                  {task.status && task.status !== "Todo" && task.status !== "Done" && (
                    <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-semibold">
                      {task.status}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
