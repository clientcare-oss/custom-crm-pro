import { useState } from "react";
import {
  ClipboardList, Copy, ExternalLink, Eye, CheckCircle2, Users, GraduationCap,
  Link2, Zap, Globe, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Calendar,
  MoreHorizontal, Hash
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import QuickSetupModal from "@/components/QuickSetupModal";
import { LeadFormModal } from "@/components/LeadFormModal";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

export default function LeadForms() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showQuickSetup, setShowQuickSetup] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingForm, setEditingForm] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: allForms, refetch } = trpc.leadForms.list.useQuery(undefined, { retry: false });
  const { data: recentLeads } = trpc.leads.list.useQuery(undefined, { retry: false });
  const { data: publicIntakeForm } = trpc.leadForms.getPublicIntakeForm.useQuery(undefined, { retry: false });
  // Filter out the built-in public-intake record from the custom forms list
  const customForms = allForms?.filter((f: any) => f.slug !== "public-intake") ?? null;

  const deleteMutation = trpc.leadForms.delete.useMutation({
    onSuccess: () => { toast.success("Form deleted"); refetch(); setDeletingId(null); },
    onError: (e) => toast.error("Delete failed: " + e.message),
  });

  const toggleActiveMutation = trpc.leadForms.update.useMutation({
    onSuccess: () => { refetch(); },
    onError: (e) => toast.error("Update failed: " + e.message),
  });

  const intakeUrl = `${window.location.origin}/form/public-intake`;
  const formLeads = recentLeads?.filter((l: any) => l.source === "Lead Form" || l.source?.includes("Form")) ?? [];

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleActive = (form: any) => {
    toggleActiveMutation.mutate({ id: form.id, isActive: !form.isActive });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Page ID */}
      <div className="fixed bottom-3 right-3 z-50">
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground/40 bg-background/60 border border-border/30 rounded px-1.5 py-0.5">
          <Hash className="w-2.5 h-2.5" /> PG-012
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-7 w-7 text-accent" />
          <div>
            <h1 className="text-2xl font-bold">Lead Forms</h1>
            <p className="text-sm text-muted-foreground">Manage your client intake forms</p>
          </div>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create New Form
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <ClipboardList className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{1 + (customForms?.length ?? 0)}</p>
                <p className="text-xs text-muted-foreground">Active Forms</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formLeads.length}</p>
                <p className="text-xs text-muted-foreground">Form Submissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">Auto</p>
                <p className="text-xs text-muted-foreground">Student + Portal Setup</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── BUILT-IN: Internal Quick Setup ── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Built-in Forms</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Internal Form Card */}
          <Card className="border-border/60 border-l-4 border-l-orange-500">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Internal Quick Setup</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Phone call · Staff only</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-orange-600 border-orange-500/40 bg-orange-500/10 text-xs shrink-0">
                  Internal
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Use during a live phone call to instantly create a parent contact, student profile, and case — no appointment ID needed.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" onClick={() => setShowQuickSetup(true)} className="gap-1.5 bg-orange-600 hover:bg-orange-700 text-white">
                  <Zap className="w-3.5 h-3.5" />
                  Open Quick Setup
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Public Intake Form Card */}
          <Card className="border-border/60 border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Public Intake Form</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Default · Families fill this out</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-500/40 bg-green-500/10 text-xs shrink-0">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 bg-muted/40 border border-border/60 rounded-lg px-3 py-2">
                <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-mono text-muted-foreground truncate flex-1">{intakeUrl}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 shrink-0"
                  onClick={() => handleCopy(intakeUrl, "intake")}
                >
                  {copiedId === "intake" ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => window.open(`${intakeUrl}?preview=true`, "_blank")} className="gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  Preview
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleCopy(intakeUrl, "intake")} className="gap-1.5">
                  <Copy className="w-3.5 h-3.5" />
                  Copy Link
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.open(intakeUrl, "_blank")} className="gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open
                </Button>
                <Button size="sm" variant="outline" onClick={() => publicIntakeForm && setEditingForm(publicIntakeForm)} className="gap-1.5" disabled={!publicIntakeForm}>
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── CUSTOM FORMS ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Custom Forms</p>
          <Button size="sm" variant="outline" onClick={() => setShowCreateModal(true)} className="gap-1.5 h-7 text-xs">
            <Plus className="w-3 h-3" />
            New Form
          </Button>
        </div>

        {!customForms || customForms.length === 0 ? (
          <Card className="border-border/60 border-dashed">
            <CardContent className="py-12 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No custom forms yet</p>
                <p className="text-xs text-muted-foreground mt-1">Create additional forms for different campaigns, referral sources, or service types.</p>
              </div>
              <Button size="sm" onClick={() => setShowCreateModal(true)} className="gap-1.5 mt-1">
                <Plus className="w-3.5 h-3.5" />
                Create Your First Custom Form
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {customForms.map((form: any) => {
              const formUrl = `${window.location.origin}/form/${form.slug}`;
              return (
                <Card key={form.id} className={`border-border/60 ${!form.isActive ? "opacity-60" : ""}`}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                        <ClipboardList className="w-5 h-5 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold">{form.name}</p>
                          {form.isActive ? (
                            <Badge variant="outline" className="text-green-600 border-green-500/40 bg-green-500/10 text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-xs">Inactive</Badge>
                          )}
                          {form.schedulingEnabled && (
                            <Badge variant="outline" className="text-blue-600 border-blue-500/40 bg-blue-500/10 text-xs">
                              <Calendar className="w-3 h-3 mr-1" /> Scheduling
                            </Badge>
                          )}
                        </div>
                        {form.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{form.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 bg-muted/40 border border-border/60 rounded-lg px-3 py-1.5">
                          <Link2 className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="text-xs font-mono text-muted-foreground truncate flex-1">{formUrl}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 px-1.5 shrink-0"
                            onClick={() => handleCopy(formUrl, `form-${form.id}`)}
                          >
                            {copiedId === `form-${form.id}` ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          </Button>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>{form.submissionCount ?? 0} submissions</span>
                          <span>·</span>
                          <span>Created {new Date(form.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 text-xs"
                          onClick={() => window.open(`${formUrl}?preview=true`, "_blank")}
                        >
                          <Eye className="w-3.5 h-3.5" /> Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 text-xs"
                          onClick={() => setEditingForm(form)}
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingForm(form)}>
                              <Pencil className="w-3.5 h-3.5 mr-2" /> Edit Form
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCopy(formUrl, `form-${form.id}`)}>
                              <Copy className="w-3.5 h-3.5 mr-2" /> Copy Link
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(formUrl, "_blank")}>
                              <ExternalLink className="w-3.5 h-3.5 mr-2" /> Open Form
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleActive(form)}>
                              {form.isActive
                                ? <><ToggleLeft className="w-3.5 h-3.5 mr-2" /> Deactivate</>
                                : <><ToggleRight className="w-3.5 h-3.5 mr-2" /> Activate</>
                              }
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeletingId(form.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Form
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <QuickSetupModal open={showQuickSetup} onClose={() => setShowQuickSetup(false)} />

      <LeadFormModal
        open={showCreateModal || !!editingForm}
        onOpenChange={(open: boolean) => {
          if (!open) { setShowCreateModal(false); setEditingForm(null); }
        }}
        editingForm={editingForm}
        onSuccess={() => { refetch(); setShowCreateModal(false); setEditingForm(null); }}
      />

      {/* Delete Confirm */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Form?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the form and its shareable link. Existing submissions in the Leads pipeline will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deletingId && deleteMutation.mutate({ id: deletingId })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
