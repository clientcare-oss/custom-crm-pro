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
import { Plus, Trash2, Edit2, Loader2, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import QuickSetupModal from "@/components/QuickSetupModal";

const LEAD_STATUSES = ["New", "Follow-up", "Qualified", "Won", "Lost"] as const;
type LeadStatus = (typeof LEAD_STATUSES)[number];

export default function Leads() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [quickSetupOpen, setQuickSetupOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    source: "",
    value: "",
    status: "New" as LeadStatus,
    notes: "",
  });

  const { data: leads, isLoading, refetch } = trpc.leads.list.useQuery(
    undefined,
    {
      enabled: user?.role === "admin",
    }
  );

  const createMutation = trpc.leads.create.useMutation({
    onSuccess: () => {
      toast.success("Lead created successfully");
      refetch();
      setOpen(false);
      setFormData({
        source: "",
        value: "",
        status: "New" as LeadStatus,
        notes: "",
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create lead");
    },
  });

  const updateMutation = trpc.leads.update.useMutation({
    onSuccess: () => {
      toast.success("Lead updated successfully");
      refetch();
      setOpen(false);
      setEditingId(null);
      setFormData({
        source: "",
        value: "",
        status: "New" as LeadStatus,
        notes: "",
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update lead");
    },
  });

  // Note: Delete functionality not yet implemented in API

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        source: formData.source,
        value: formData.value,
        status: formData.status,
        notes: formData.notes,
      });
    } else {
      createMutation.mutate({
        source: formData.source,
        value: formData.value,
        status: formData.status,
        notes: formData.notes,
      });
    }
  };

  const handleEdit = (lead: any) => {
    setEditingId(lead.id);
    setFormData({
      source: lead.source || "",
      value: (lead.value || 0).toString(),
      status: lead.status,
      notes: lead.notes || "",
    });
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    toast.info("Delete functionality coming soon");
  };

  // Group leads by status
  const leadsByStatus = LEAD_STATUSES.reduce(
    (acc, status) => {
      acc[status] = leads?.filter((l) => l.status === status) || [];
      return acc;
    },
    {} as Record<LeadStatus, any[]>
  );

  const getStatusColor = (status: LeadStatus) => {
    const colors: Record<LeadStatus, string> = {
      New: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      "Follow-up":
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      Qualified:
        "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      Won: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      Lost: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };
    return colors[status];
  };

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Sales Pipeline</h1>
          <p className="text-muted-foreground">
            Track leads through your sales process
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setQuickSetupOpen(true)}
            className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
          >
            <Zap className="w-4 h-4" />
            Quick Setup
          </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingId(null);
                setFormData({
                  source: "",
                  value: "",
                  status: "New" as LeadStatus,
                  notes: "",
                });
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-accent-foreground shadow-sm transition-all hover:shadow-md"
            >
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Lead" : "Add New Lead"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold">Source</label>
                <VoiceInput
                  value={formData.source}
                  onChange={(e) =>
                    setFormData({ ...formData, source: e.target.value })
                  }
                  placeholder="e.g., Referral, Website, Cold Call"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold">
                  Deal Value ($)
                </label>
                <VoiceInput
                  type="number"
                  value={formData.value}
                  onChange={(e) =>
                    setFormData({ ...formData, value: e.target.value })
                  }
                  placeholder="10000"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold">Status</label>
                <Select
                  value={String(formData.status) || "New"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      status: value as LeadStatus,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold">Notes</label>
                <VoiceInput
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Add any notes about this lead..."
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
                    "Update Lead"
                  ) : (
                    "Create Lead"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Pipeline Columns */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-lg border border-border bg-muted/50 p-12">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          {LEAD_STATUSES.map((status) => (
            <div key={status} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">{status}</h3>
                <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                  {leadsByStatus[status].length}
                </span>
              </div>
              <div className="space-y-3">
                {leadsByStatus[status].length > 0 ? (
                  leadsByStatus[status].map((lead) => (
                    <Card
                      key={lead.id}
                      className="rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md"
                    >
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-foreground">
                            {lead.source || "Untitled Lead"}
                          </h4>
                        </div>
                        {lead.value && (
                          <div className="text-sm font-semibold text-accent">
                            ${parseFloat(lead.value).toLocaleString()}
                          </div>
                        )}
                        <div
                          className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(
                            status
                          )}`}
                        >
                          {status}
                        </div>
                        {lead.notes && (
                          <p className="text-xs text-muted-foreground">
                            {lead.notes}
                          </p>
                        )}
                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={() => handleEdit(lead)}
                            variant="outline"
                            size="sm"
                            className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-semibold text-foreground shadow-sm transition-all hover:bg-muted"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>

                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      No leads yet
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <QuickSetupModal open={quickSetupOpen} onClose={() => setQuickSetupOpen(false)} />
    </div>
  );
}
