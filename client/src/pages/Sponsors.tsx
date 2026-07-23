import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Heart, Gift, Plus, MoreHorizontal, Pencil, Trash2, DollarSign, User, Calendar, X, Save } from "lucide-react";
import { toast } from "sonner";

type SponsorEntry = {
  id: number;
  type: string;
  donorName: string;
  donorEmail: string | null;
  donorPhone: string | null;
  amount: number | null;
  familyContactId: number | null;
  familyName: string | null;
  notes: string | null;
  status: string | null;
  donatedAt: Date;
  createdAt: Date;
};

type FormData = {
  donorName: string;
  donorEmail: string;
  donorPhone: string;
  amount: string;
  familyContactId: number | null;
  familyName: string;
  caseId: string;
  notes: string;
  status: string;
  donatedAt: string;
};

const STATUS_OPTIONS = [
  { value: "received", label: "Received", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "acknowledged", label: "Acknowledged", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "pending", label: "Pending", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
];

function formatCurrency(cents: number | null) {
  if (!cents) return "$0.00";
  return `$${(cents / 100).toFixed(2)}`;
}

export default function Sponsors() {
  const [activeTab, setActiveTab] = useState<"sponsor" | "gift">("sponsor");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<(SponsorEntry & { caseId?: string }) | null>(null);

  const utils = trpc.useUtils();
  const { data: entries = [], isLoading } = trpc.sponsors.list.useQuery({ type: activeTab });
  const { data: contacts = [] } = trpc.contacts.list.useQuery();

  // Extract case IDs from contacts that have students with caseIds
  const { data: projects = [] } = trpc.projects.list.useQuery();
  const caseOptions = projects
    .filter((p: any) => p.caseId)
    .map((p: any) => ({ caseId: p.caseId, studentName: p.studentName || p.name }));

  const createMutation = trpc.sponsors.create.useMutation({
    onSuccess: () => { utils.sponsors.list.invalidate(); setDialogOpen(false); setEditing(null); toast.success(activeTab === "sponsor" ? "Sponsor added" : "Gift recorded"); },
    onError: () => toast.error("Failed to save"),
  });

  const updateMutation = trpc.sponsors.update.useMutation({
    onSuccess: () => { utils.sponsors.list.invalidate(); setDialogOpen(false); setEditing(null); toast.success("Updated"); },
    onError: () => toast.error("Failed to update"),
  });

  const deleteMutation = trpc.sponsors.delete.useMutation({
    onSuccess: () => { utils.sponsors.list.invalidate(); toast.success("Deleted"); },
    onError: () => toast.error("Failed to delete"),
  });

  const handleSave = (form: FormData) => {
    const payload = {
      type: activeTab as "sponsor" | "gift",
      donorName: form.donorName,
      donorEmail: form.donorEmail || undefined,
      donorPhone: form.donorPhone || undefined,
      amount: form.amount ? Math.round(parseFloat(form.amount) * 100) : undefined,
      familyContactId: form.familyContactId ?? undefined,
      familyName: form.familyName || undefined,
      caseId: form.caseId || undefined,
      notes: form.notes || undefined,
      status: form.status || "received",
      donatedAt: form.donatedAt || undefined,
    };

    if (editing?.id) {
      updateMutation.mutate({ id: editing.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const totalAmount = (entries as SponsorEntry[]).reduce((sum, e) => sum + (e.amount ?? 0), 0);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Heart className="h-6 w-6 text-rose-500" />
            Sponsors & Gifts
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track donations to the foundation and gifts to specific families</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> {activeTab === "sponsor" ? "New Sponsor" : "New Gift"}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab("sponsor")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "sponsor" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
        >
          <Heart className="h-4 w-4" /> Sponsors
        </button>
        <button
          onClick={() => setActiveTab("gift")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "gift" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
        >
          <Gift className="h-4 w-4" /> Gifts
        </button>
      </div>

      {/* Summary Card */}
      <Card className="p-4 mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{activeTab === "sponsor" ? "Total Sponsor Donations" : "Total Gifts to Families"}</p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(totalAmount)}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm">{(entries as SponsorEntry[]).length} {activeTab === "sponsor" ? "sponsors" : "gifts"}</Badge>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted/40 rounded-lg animate-pulse" />)}
        </div>
      ) : (entries as SponsorEntry[]).length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">{activeTab === "sponsor" ? "No sponsors yet" : "No gifts recorded yet"}</p>
          <Button variant="outline" className="mt-3 gap-2" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> Add {activeTab === "sponsor" ? "Sponsor" : "Gift"}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {(entries as SponsorEntry[]).map((entry) => {
            const statusCfg = STATUS_OPTIONS.find((s) => s.value === entry.status) ?? STATUS_OPTIONS[0];
            return (
              <Card key={entry.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{entry.donorName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {entry.donorEmail && <span>{entry.donorEmail}</span>}
                      {activeTab === "gift" && entry.familyName && (
                        <span className="text-blue-600 dark:text-blue-400 font-medium">→ {entry.familyName}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{formatCurrency(entry.amount)}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(entry.donatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-xs ${statusCfg.color}`}>{statusCfg.label}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditing(entry); setDialogOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => { if (confirm("Delete this entry?")) deleteMutation.mutate({ id: entry.id }); }}>
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <SponsorDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        initial={editing}
        type={activeTab}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
        caseOptions={caseOptions}
        contacts={contacts as any[]}
      />
    </div>
  );
}

// ─── Dialog ──────────────────────────────────────────────────────────────────

function SponsorDialog({
  open, onClose, initial, type, onSave, saving, caseOptions, contacts,
}: {
  open: boolean;
  onClose: () => void;
  initial: SponsorEntry | null;
  type: "sponsor" | "gift";
  onSave: (data: FormData) => void;
  saving: boolean;
  caseOptions: { caseId: string; studentName: string }[];
  contacts: { id: number; firstName: string; lastName: string }[];
}) {
  // Parse caseId from familyName if editing (stored as "Name [CASE-ID]")
  const parsedCaseId = initial?.familyName?.match(/\[(.+)\]$/)?.[1] ?? "";
  const parsedFamilyName = initial?.familyName?.replace(/\s*\[.+\]$/, "") ?? "";

  const [form, setForm] = useState<FormData>({
    donorName: initial?.donorName ?? "",
    donorEmail: initial?.donorEmail ?? "",
    donorPhone: initial?.donorPhone ?? "",
    amount: initial?.amount ? (initial.amount / 100).toString() : "",
    familyContactId: initial?.familyContactId ?? null,
    familyName: parsedFamilyName,
    caseId: parsedCaseId,
    notes: initial?.notes ?? "",
    status: initial?.status ?? "received",
    donatedAt: initial?.donatedAt ? new Date(initial.donatedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
  });

  // Reset form when dialog opens
  const prevOpen = useState(open)[0];
  if (open && !prevOpen) {
    // handled by key prop or parent re-render
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === "sponsor" ? <Heart className="h-5 w-5 text-rose-500" /> : <Gift className="h-5 w-5 text-purple-500" />}
            {initial ? "Edit" : "New"} {type === "sponsor" ? "Sponsor" : "Gift"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Donor Name *</Label>
            <Input placeholder="e.g. John Smith" value={form.donorName} onChange={(e) => setForm((f) => ({ ...f, donorName: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input placeholder="email@example.com" value={form.donorEmail} onChange={(e) => setForm((f) => ({ ...f, donorEmail: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input placeholder="(555) 123-4567" value={form.donorPhone} onChange={(e) => setForm((f) => ({ ...f, donorPhone: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount ($)</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.donatedAt} onChange={(e) => setForm((f) => ({ ...f, donatedAt: e.target.value }))} />
            </div>
          </div>

          {/* Gift-specific: Case ID selector */}
          {type === "gift" && (
            <>
              <div className="space-y-1.5">
                <Label>Link to Case ID</Label>
                <Select value={form.caseId || "none"} onValueChange={(v) => {
                  const selected = caseOptions.find((c) => c.caseId === v);
                  setForm((f) => ({
                    ...f,
                    caseId: v === "none" ? "" : v,
                    familyName: selected?.studentName ?? f.familyName,
                  }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Select a case..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No case linked</SelectItem>
                    {caseOptions.map((c) => (
                      <SelectItem key={c.caseId} value={c.caseId}>
                        {c.caseId} — {c.studentName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Sponsor will NOT have access to client files unless you explicitly allow it</p>
              </div>
              <div className="space-y-1.5">
                <Label>Family / Student Name</Label>
                <Input placeholder="Auto-filled from case" value={form.familyName} onChange={(e) => setForm((f) => ({ ...f, familyName: e.target.value }))} />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input placeholder="Optional notes..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}><X className="h-4 w-4 mr-1" /> Cancel</Button>
            <Button onClick={() => onSave(form)} disabled={saving || !form.donorName.trim()}>
              <Save className="h-4 w-4 mr-1" />{saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
