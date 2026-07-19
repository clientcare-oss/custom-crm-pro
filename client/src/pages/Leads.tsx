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
import { Plus, Trash2, Edit2, Loader2, Zap, UserCircle, Phone, PhoneCall, User, GraduationCap, Calendar } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import QuickSetupModal from "@/components/QuickSetupModal";
import { useLocation } from "wouter";

const LEAD_STATUSES = ["New", "Follow-up", "Qualified", "Won", "Lost"] as const;
type LeadStatus = (typeof LEAD_STATUSES)[number];

const emptyForm = {
  source: "",
  value: "",
  status: "New" as LeadStatus,
  notes: "",
  parentName: "",
  parentPhone: "",
  studentName: "",
  studentAge: "",
  studentGrade: "",
  discoveryCallDate: "",
};

export default function Leads() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [quickSetupOpen, setQuickSetupOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptyForm);

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
      setFormData(emptyForm);
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
      setFormData(emptyForm);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update lead");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      source: formData.source || undefined,
      value: formData.value || undefined,
      status: formData.status,
      notes: formData.notes || undefined,
      parentName: formData.parentName || undefined,
      parentPhone: formData.parentPhone || undefined,
      studentName: formData.studentName || undefined,
      studentAge: formData.studentAge ? parseInt(formData.studentAge) : undefined,
      studentGrade: formData.studentGrade || undefined,
      discoveryCallDate: formData.discoveryCallDate ? new Date(formData.discoveryCallDate) : undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (lead: any) => {
    setEditingId(lead.id);
    setFormData({
      source: lead.source || "",
      value: (lead.value || 0).toString(),
      status: lead.status,
      notes: lead.notes || "",
      parentName: lead.parentName || "",
      parentPhone: lead.parentPhone || "",
      studentName: lead.studentName || "",
      studentAge: lead.studentAge?.toString() || "",
      studentGrade: lead.studentGrade || "",
      discoveryCallDate: lead.discoveryCallDate
        ? new Date(lead.discoveryCallDate).toISOString().split("T")[0]
        : "",
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
          <h1 className="text-3xl font-bold tracking-tight">Discovery Pipeline</h1>
          <p className="text-muted-foreground">
            Track families through your discovery process
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
                  setFormData(emptyForm);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-accent-foreground shadow-sm transition-all hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Lead" : "Add New Lead"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Parent Info */}
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Parent / Guardian</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold">Parent Name</label>
                    <VoiceInput
                      value={formData.parentName}
                      onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold">Parent Phone</label>
                    <VoiceInput
                      value={formData.parentPhone}
                      onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                      placeholder="(555) 000-0000"
                    />
                  </div>
                </div>

                {/* Student Info */}
                <div className="space-y-1 pt-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Student</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-3 space-y-2">
                    <label className="block text-sm font-semibold">Student Name</label>
                    <VoiceInput
                      value={formData.studentName}
                      onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                      placeholder="Alex Smith"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold">Age</label>
                    <Input
                      type="number"
                      value={formData.studentAge}
                      onChange={(e) => setFormData({ ...formData, studentAge: e.target.value })}
                      placeholder="10"
                      min={1}
                      max={25}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="block text-sm font-semibold">Grade</label>
                    <VoiceInput
                      value={formData.studentGrade}
                      onChange={(e) => setFormData({ ...formData, studentGrade: e.target.value })}
                      placeholder="4th Grade"
                    />
                  </div>
                </div>

                {/* Discovery Call */}
                <div className="space-y-1 pt-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Discovery Call</p>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold">Discovery Call Date</label>
                  <Input
                    type="date"
                    value={formData.discoveryCallDate}
                    onChange={(e) => setFormData({ ...formData, discoveryCallDate: e.target.value })}
                  />
                </div>

                {/* Lead Details */}
                <div className="space-y-1 pt-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Lead Details</p>
                </div>
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
                        {/* Student name as card title */}
                        <div>
                          <h4 className="font-semibold text-foreground leading-tight">
                            {lead.studentName || lead.source || "Untitled Lead"}
                          </h4>
                          {lead.studentName && lead.source && (
                            <p className="text-xs text-muted-foreground mt-0.5">via {lead.source}</p>
                          )}
                        </div>

                        {/* Parent info */}
                        {(lead.parentName || lead.parentPhone) && (
                          <div className="space-y-1">
                            {lead.parentName && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <User className="h-3 w-3 flex-shrink-0" />
                                <span>{lead.parentName}</span>
                              </div>
                            )}
                            {lead.parentPhone && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3 flex-shrink-0" />
                                <span>{lead.parentPhone}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Student details */}
                        {(lead.studentAge || lead.studentGrade) && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <GraduationCap className="h-3 w-3 flex-shrink-0" />
                            <span>
                              {[
                                lead.studentAge ? `Age ${lead.studentAge}` : null,
                                lead.studentGrade || null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </div>
                        )}

                        {/* Discovery call date */}
                        {lead.discoveryCallDate && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span>
                              Discovery Call:{" "}
                              {new Date(lead.discoveryCallDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}

                        {/* Value */}
                        {lead.value && (
                          <div className="text-sm font-semibold text-accent">
                            ${parseFloat(lead.value).toLocaleString()}
                          </div>
                        )}

                        {/* Status badge */}
                        <div
                          className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(
                            status
                          )}`}
                        >
                          {status === "New" ? "Discovery Call" : status}
                        </div>

                        {/* Notes */}
                        {lead.notes && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {lead.notes}
                          </p>
                        )}

                        {/* Action buttons */}
                        <div className="flex flex-col gap-2 pt-1">
                          {/* Begin Discovery Call — shown on New leads */}
                          {status === "New" && (
                            <Button
                              onClick={() => setLocation(`/leads/${lead.id}/discovery`)}
                              size="sm"
                              className="w-full rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5"
                            >
                              <PhoneCall className="h-3 w-3" />
                              Begin Discovery Call
                            </Button>
                          )}
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleEdit(lead)}
                              variant="outline"
                              size="sm"
                              className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-semibold text-foreground shadow-sm transition-all hover:bg-muted"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            {(lead as any).contactId && (
                              <Button
                                onClick={() => setLocation(`/contacts/${(lead as any).contactId}`)}
                                variant="outline"
                                size="sm"
                                className="flex-1 rounded-md border border-accent/40 bg-accent/5 px-2 py-1 text-xs font-semibold text-accent shadow-sm transition-all hover:bg-accent/10 gap-1"
                              >
                                <UserCircle className="h-3 w-3" />
                                View Contact
                              </Button>
                            )}
                          </div>
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
