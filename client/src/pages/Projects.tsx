import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VoiceInput from "@/components/VoiceInput";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Edit2, Calendar, DollarSign } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTerminology } from "@/contexts/TerminologyContext";

const PROJECT_STAGES = [
  "Planning",
  "In Progress",
  "Completed",
  "On Hold",
] as const;
type ProjectStage = (typeof PROJECT_STAGES)[number];

export default function Projects() {
  const { user } = useAuth();
  const { projectLabel, projectLabelPlural } = useTerminology();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "Planning" as ProjectStage,
    budget: "",
    startDate: "",
    endDate: "",
  });

  const { data: projects, isLoading, refetch } = trpc.projects.list.useQuery(
    undefined,
    {
      enabled: user?.role === "admin",
    }
  );

  const createMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      toast.success("Project created successfully");
      refetch();
      setOpen(false);
      setFormData({
        name: "",
        description: "",
        status: "Planning" as ProjectStage,
        budget: "",
        startDate: "",
        endDate: "",
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create project");
    },
  });

  const updateMutation = trpc.projects.update.useMutation({
    onSuccess: () => {
      toast.success("Project updated successfully");
      refetch();
      setOpen(false);
      setEditingId(null);
      setFormData({
        name: "",
        description: "",
        status: "Planning" as ProjectStage,
        budget: "",
        startDate: "",
        endDate: "",
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update project");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("Project name is required");
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        name: formData.name,
        description: formData.description,
        status: formData.status,
        budget: formData.budget ? String(parseFloat(formData.budget)) : undefined,
        startDate: formData.startDate ? new Date(formData.startDate) : undefined,
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
      });
    } else {
      createMutation.mutate({
        name: formData.name,
        description: formData.description,
        status: formData.status,
        budget: formData.budget ? String(parseFloat(formData.budget)) : undefined,
        startDate: formData.startDate ? new Date(formData.startDate) : undefined,
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
      });
    }
  };

  const handleEdit = (project: any) => {
    setEditingId(project.id);
    setFormData({
      name: project.name,
      description: project.description || "",
      status: project.status,
      budget: project.budget?.toString() || "",
      startDate: project.startDate
        ? new Date(project.startDate).toISOString().split("T")[0]
        : "",
      endDate: project.endDate
        ? new Date(project.endDate).toISOString().split("T")[0]
        : "",
    });
    setOpen(true);
  };

  // Group projects by stage
  const projectsByStage = PROJECT_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = projects?.filter((p) => p.status === stage) || [];
      return acc;
    },
    {} as Record<ProjectStage, any[]>
  );

  const getStageColor = (stage: ProjectStage) => {
    const colors: Record<ProjectStage, string> = {
      Planning: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
      "In Progress":
        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      Completed:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      "On Hold": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };
    return colors[stage];
  };

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{projectLabelPlural}</h1>
          <p className="text-muted-foreground">
            Manage your {projectLabel.toLowerCase()} workflow and timeline
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingId(null);
                setFormData({
                  name: "",
                  description: "",
                  status: "Planning" as ProjectStage,
                  budget: "",
                  startDate: "",
                  endDate: "",
                });
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-accent-foreground shadow-sm transition-all hover:shadow-md"
            >
              <Plus className="h-4 w-4" />
              New {projectLabel}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? `Edit ${projectLabel}` : `Create New ${projectLabel}`}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold">
                  {projectLabel} Name *
                </label>
                <VoiceInput
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Website Redesign"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold">
                  Description
                </label>
                <VoiceInput
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Project details and objectives"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold">Stage</label>
                <Select
                  value={String(formData.status) || "Planning"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      status: value as ProjectStage,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_STAGES.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold">
                  Budget ($)
                </label>
                <VoiceInput
                  type="number"
                  value={formData.budget}
                  onChange={(e) =>
                    setFormData({ ...formData, budget: e.target.value })
                  }
                  placeholder="5000"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold">Start Date</label>
                <VoiceInput
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold">End Date</label>
                <VoiceInput
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                  className="flex-1 rounded-lg bg-accent px-4 py-2 font-semibold text-accent-foreground shadow-sm transition-all hover:shadow-md disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingId ? (
                    `Update ${projectLabel}`
                  ) : (
                    `Create ${projectLabel}`
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Project Stages Kanban */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-lg border border-border bg-muted/50 p-12">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          {PROJECT_STAGES.map((stage) => (
            <div key={stage} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">{stage}</h3>
                <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                  {projectsByStage[stage].length}
                </span>
              </div>
              <div className="space-y-3">
                {projectsByStage[stage].length > 0 ? (
                  projectsByStage[stage].map((project) => (
                    <Card
                      key={project.id}
                      className="rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md"
                    >
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-foreground">
                            {project.name}
                          </h4>
                          {project.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {project.description}
                            </p>
                          )}
                        </div>
                        <div
                          className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${getStageColor(
                            stage
                          )}`}
                        >
                          {stage}
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          {project.budget && (
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-3 w-3" />
                              ${parseFloat(project.budget).toLocaleString()}
                            </div>
                          )}
                          {project.endDate && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              {new Date(project.endDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <Button
                          onClick={() => handleEdit(project)}
                          variant="outline"
                          size="sm"
                          className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs font-semibold text-foreground shadow-sm transition-all hover:bg-muted"
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      No projects yet
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
