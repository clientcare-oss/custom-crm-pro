import { useState, useRef, useEffect } from "react";
import {
  ClipboardList, Copy, ExternalLink, Eye, CheckCircle2, Users, GraduationCap,
  Link2, Zap, Globe, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Calendar,
  MoreHorizontal, Hash, ImagePlus, Save, Sparkles, Phone, MessageSquare, X,
  Upload, ChevronDown, ChevronUp, AlignCenter, AlignLeft, ArrowLeft,
  ArrowRight, Clock, Mail, CheckSquare, Layers
} from "lucide-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import VoiceInput from "@/components/VoiceInput";
import { Textarea } from "@/components/ui/textarea";
import VoiceTextarea from "@/components/VoiceTextarea";
import { Label } from "@/components/ui/label";
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
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger
} from "@/components/ui/collapsible";

export default function LeadForms() {
  const [, setLocation] = useLocation();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showQuickSetup, setShowQuickSetup] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingForm, setEditingForm] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(true);

  // Confirmation customization state
  const [confHeadline, setConfHeadline] = useState("");
  const [confBody, setConfBody] = useState("");
  const [confPhone, setConfPhone] = useState("");
  const [confImageUrl, setConfImageUrl] = useState<string | null>(null);
  const [confImageKey, setConfImageKey] = useState<string | null>(null);
  const [confSaving, setConfSaving] = useState(false);
  const [confImageUploading, setConfImageUploading] = useState(false);
  const [confHeadlineAlign, setConfHeadlineAlign] = useState<"left" | "center">("left");
  const imageInputRef = useRef<HTMLInputElement>(null);
  // Business phone number (shown on confirmation screen)
  const [businessPhone, setBusinessPhone] = useState("");
  const [phoneSaving, setPhoneSaving] = useState(false);
  const { data: businessPhoneData, refetch: refetchPhone } = trpc.system.getBusinessPhone.useQuery(undefined, { retry: false });

  const { data: allForms, refetch } = trpc.leadForms.list.useQuery(undefined, { retry: false });
  const { data: recentLeads } = trpc.leads.list.useQuery(undefined, { retry: false });
  const { data: publicIntakeForm, refetch: refetchIntake } = trpc.leadForms.getPublicIntakeForm.useQuery(undefined, {
    retry: false,
  });

  // Populate phone from server — only once on first load
  useEffect(() => {
    if (businessPhoneData?.phone !== undefined) {
      setBusinessPhone(businessPhoneData.phone ?? "");
    }
  }, [businessPhoneData?.phone]);

  // Populate confirmation fields when form data loads — only once
  const [confInitialized, setConfInitialized] = useState(false);
  useEffect(() => {
    if (publicIntakeForm && !confInitialized) {
      setConfHeadline((publicIntakeForm as any).confirmationHeadline ?? "");
      setConfBody((publicIntakeForm as any).confirmationBody ?? "");
      setConfPhone((publicIntakeForm as any).saveOurNumberMessage ?? "");
      setConfImageUrl((publicIntakeForm as any).confirmationImageUrl ?? null);
      setConfImageKey((publicIntakeForm as any).confirmationImageKey ?? null);
      setConfHeadlineAlign(((publicIntakeForm as any).confirmationHeadlineAlign as "left" | "center") ?? "left");
      setConfInitialized(true);
    }
  }, [publicIntakeForm, confInitialized]);

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
  const updateConfirmationMutation = trpc.leadForms.update.useMutation({
    onSuccess: () => {
      toast.success("Confirmation page saved!");
      refetchIntake();
      setConfSaving(false);
    },
    onError: (e) => { toast.error("Save failed: " + e.message); setConfSaving(false); },
  });
  const uploadImageMutation = trpc.leadForms.uploadConfirmationImage.useMutation({
    onSuccess: (data: any) => {
      setConfImageUrl(data.url);
      setConfImageKey(data.key);
      setConfImageUploading(false);
      toast.success("Image uploaded!");
    },
    onError: (e) => { toast.error("Upload failed: " + e.message); setConfImageUploading(false); },
  });
  const setPhoneMutation = trpc.system.setBusinessPhone.useMutation({
    onSuccess: () => { toast.success("Phone number saved!"); refetchPhone(); setPhoneSaving(false); },
    onError: (e) => { toast.error("Save failed: " + e.message); setPhoneSaving(false); },
  });
  const handleSavePhone = () => {
    setPhoneSaving(true);
    setPhoneMutation.mutate({ phone: businessPhone });
  };

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

  const handleSaveConfirmation = () => {
    if (!publicIntakeForm) return;
    setConfSaving(true);
    updateConfirmationMutation.mutate({
      id: (publicIntakeForm as any).id,
      confirmationHeadline: confHeadline || undefined,
      confirmationBody: confBody || undefined,
      saveOurNumberMessage: confPhone || undefined,
      confirmationImageKey: confImageKey,
      confirmationImageUrl: confImageUrl,
      confirmationHeadlineAlign: confHeadlineAlign,
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !publicIntakeForm) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setConfImageUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadImageMutation.mutate({
        formId: (publicIntakeForm as any).id,
        fileName: file.name,
        fileData: base64,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveImage = () => {
    if (!publicIntakeForm) return;
    setConfImageUrl(null);
    setConfImageKey(null);
    updateConfirmationMutation.mutate({
      id: (publicIntakeForm as any).id,
      confirmationImageKey: null,
      confirmationImageUrl: null,
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back to Lead Center Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/leads")}
          className="gap-1.5 text-muted-foreground hover:text-foreground text-xs -ml-2 h-7 px-2 font-medium cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Lead Center</span>
        </Button>
        <span className="text-muted-foreground/30">/</span>
        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal bg-sky-500/10 text-sky-400 border-sky-500/30">
          Lead Center · Form Studio
        </Badge>
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
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => window.open(`${window.location.origin}/book`, '_blank')}>
            <Calendar className="w-4 h-4" />
            View Live Scheduler
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create New Form
          </Button>
        </div>
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

      {/* ── BUILT-IN FORMS ── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Built-in Forms</p>
        <div className="space-y-3">
          {/* Quick Setup Card */}
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
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Default · Families fill this out
                      {publicIntakeForm?.fields && (() => {
                        try {
                          const p = JSON.parse(publicIntakeForm.fields);
                          return Array.isArray(p) ? ` · ${p.length} questions active` : "";
                        } catch { return ""; }
                      })()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLocation("/automations?trigger=lead_form_submitted")}
                    className="cursor-pointer group"
                    title="Click to view attached automated flow"
                  >
                    <Badge variant="outline" className="text-purple-400 border-purple-500/40 bg-purple-500/10 text-xs shrink-0 flex items-center gap-1 group-hover:bg-purple-500/20 transition-colors">
                      <Zap className="w-3 h-3 text-purple-400" /> Automations Attached
                    </Badge>
                  </button>
                  <Badge variant="outline" className="text-green-600 border-green-500/40 bg-green-500/10 text-xs shrink-0">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                  </Badge>
                </div>
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

              {/* Attached Automation Notification Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Zap className="w-4 h-4 text-purple-400 shrink-0" />
                  <div className="truncate">
                    <span className="font-semibold text-foreground">Attached Workflow: </span>
                    <span className="text-purple-300 font-medium">Client Intake & Onboarding Flow</span>
                    <span className="text-muted-foreground hidden lg:inline"> (Fires welcome email + discovery invite immediately upon submission)</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-purple-500/30 text-purple-300 hover:text-purple-200 hover:bg-purple-500/20 gap-1.5 shrink-0"
                  onClick={() => setLocation("/automations?trigger=lead_form_submitted")}
                >
                  <span>View in Automations</span>
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => window.open(`${intakeUrl}?preview=true`, "_blank")} className="gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  Preview Form
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.open(`${intakeUrl}?preview=true&confirmed=true`, "_blank")} className="gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Preview Confirmation
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
                  Edit Form & Settings
                </Button>
                <Button size="sm" variant="outline" onClick={() => setLocation("/automations?trigger=lead_form_submitted")} className="gap-1.5 text-purple-400 border-purple-500/30 hover:bg-purple-500/10">
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  Attached Automations
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── AUTOMATIONS & SUBMISSION LIFECYCLE GUIDE ── */}
      <Card className="border-border/60 border-l-4 border-l-purple-500 bg-purple-500/[0.03] dark:bg-[#071328]/80">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm sm:text-base font-semibold">Post-Submission Automations & Next Steps</CardTitle>
                  <Badge variant="outline" className="text-purple-300 border-purple-500/40 bg-purple-500/10 text-[10px]">
                    Live Trigger Connected
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  What happens in the CRM the moment a family submits any lead form
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => setLocation("/automations?trigger=lead_form_submitted")}
                className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>View & Edit in Automations Module</span>
                <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-background/80 dark:bg-[#040C1A] border border-border/70 rounded-xl p-4 space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              When a prospective client completes your public intake form, the CRM automatically provisions their profiles and executes the 
              <strong className="text-foreground"> Client Intake & Onboarding Flow</strong>. Here is the step-by-step lifecycle:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-card/60 border border-border/60 flex flex-col justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-blue-500 dark:text-blue-400">
                    <Users className="w-4 h-4" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">1. Instant Profiles</span>
                  </div>
                  <p className="font-semibold text-xs text-foreground">Contact & Case Created</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Parent contact, student profile, and a dedicated case record (with unique Case ID) are generated automatically.
                  </p>
                </div>
                <Badge variant="secondary" className="w-fit text-[10px]">CRM Database</Badge>
              </div>

              <div className="p-3 rounded-lg bg-card/60 border border-border/60 flex flex-col justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-500">
                    <Clock className="w-4 h-4" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">2. Step 1 (0 min)</span>
                  </div>
                  <p className="font-semibold text-xs text-foreground">Welcome & Discovery Link</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Sends the personalized advocate welcome email with your Discovery Call calendar booking link.
                  </p>
                </div>
                <Badge variant="secondary" className="w-fit text-[10px] text-amber-600 dark:text-amber-400">Email Dispatched</Badge>
              </div>

              <div className="p-3 rounded-lg bg-card/60 border border-border/60 flex flex-col justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-purple-500 dark:text-purple-400">
                    <Mail className="w-4 h-4" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">3. Step 2 (+24h)</span>
                  </div>
                  <p className="font-semibold text-xs text-foreground">Intake Questionnaire</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Sends follow-up requesting student documentation, current IEP/504, and school evaluation files.
                  </p>
                </div>
                <Badge variant="secondary" className="w-fit text-[10px] text-purple-600 dark:text-purple-400">Follow-up Step</Badge>
              </div>

              <div className="p-3 rounded-lg bg-card/60 border border-border/60 flex flex-col justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-500">
                    <CheckSquare className="w-4 h-4" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">4. Step 3 (+48h)</span>
                  </div>
                  <p className="font-semibold text-xs text-foreground">Advocate Review Task</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Automatically queues a high-priority task on the student's project board to audit their paperwork.
                  </p>
                </div>
                <Badge variant="secondary" className="w-fit text-[10px] text-emerald-600 dark:text-emerald-400">Internal Task</Badge>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border/50 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Need to customize email templates, timing delays, or add SMS/task steps?</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 gap-1 px-2"
                  onClick={() => setLocation("/automations?trigger=lead_form_submitted")}
                >
                  <span>Open Flow Builder</span>
                  <ExternalLink className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
                  onClick={() => setLocation("/automations")}
                >
                  All Automations
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── CUSTOMIZE CONFIRMATION PAGE ── */}
      <Collapsible open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <Card className="border-border/60 border-l-4 border-l-purple-500">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between w-full">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-3 text-left flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Customize Confirmation Page</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">What families see after submitting the intake form</p>
                  </div>
                </button>
              </CollapsibleTrigger>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  className="gap-1.5 text-xs"
                  onClick={(e) => { e.stopPropagation(); window.open(`${intakeUrl}?preview=true&confirmed=true`, "_blank"); }}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview
                </Button>
                <CollapsibleTrigger asChild>
                  <button type="button" className="p-1 rounded hover:bg-muted/50 transition-colors">
                    {confirmationOpen
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    }
                  </button>
                </CollapsibleTrigger>
              </div>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-4 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left: text fields */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                      Confirmation Headline
                    </Label>
                    <VoiceInput
                      value={confHeadline}
                      onChange={(e) => setConfHeadline(e.target.value)}
                      placeholder="Thank You!"
                      maxLength={200}
                      className="text-sm"
                    />
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setConfHeadlineAlign(confHeadlineAlign === "center" ? "left" : "center")}
                        className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded border transition-colors ${
                          confHeadlineAlign === "center"
                            ? "bg-purple-500/20 border-purple-400/50 text-purple-300"
                            : "bg-muted/40 border-border/50 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {confHeadlineAlign === "center" ? <AlignCenter className="w-3 h-3" /> : <AlignLeft className="w-3 h-3" />}
                        {confHeadlineAlign === "center" ? "Centered" : "Left-aligned"}
                      </button>
                      <span className="text-[10px] text-muted-foreground">Click to toggle headline alignment</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Leave blank to use the default "Thank You!" heading</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                      Confirmation Message
                    </Label>
                    <VoiceTextarea
                      value={confBody}
                      onChange={(e) => setConfBody(e.target.value)}
                      placeholder="Your information has been submitted successfully. We will be in touch within 1–2 business days."
                      rows={3}
                      className="text-sm resize-none"
                    />
                    <p className="text-[10px] text-muted-foreground">Shown below the headline on the confirmation screen</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-amber-400" />
                      "Save Our Number" Message
                    </Label>
                    <VoiceInput
                      value={confPhone}
                      onChange={(e) => setConfPhone(e.target.value)}
                      placeholder="Remember to save our number so you don't miss our call!"
                      className="text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground">Shown in the amber reminder box on the confirmation screen</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-green-400" />
                      Business Phone Number
                    </Label>
                    <div className="flex items-center gap-2">
                      <VoiceInput
                        value={businessPhone}
                        onChange={(e) => setBusinessPhone(e.target.value)}
                        placeholder="(555) 123-4567"
                        className="text-sm font-mono"
                        type="tel"
                      />
                      <Button
                        size="sm"
                        onClick={handleSavePhone}
                        disabled={phoneSaving}
                        className="shrink-0 gap-1.5"
                      >
                        {phoneSaving
                          ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
                          : <><Save className="w-3.5 h-3.5" />Save</>}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">The big bold number shown to families on the confirmation screen — edit here, not on the form itself</p>
                  </div>
                </div>

                {/* Right: image upload */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <ImagePlus className="w-3.5 h-3.5 text-green-400" />
                    QR Code / Image
                  </Label>
                  <div className="border-2 border-dashed border-border/60 rounded-xl p-4 flex flex-col items-center justify-center gap-3 min-h-[200px] bg-muted/20 hover:bg-muted/30 transition-colors">
                    {confImageUrl ? (
                      <>
                        <img
                          src={confImageUrl}
                          alt="Confirmation image"
                          className="max-h-44 max-w-full object-contain rounded-lg"
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs h-7"
                            onClick={() => imageInputRef.current?.click()}
                            disabled={confImageUploading}
                          >
                            <Upload className="w-3 h-3" />
                            Replace
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1.5 text-xs h-7 text-destructive hover:text-destructive"
                            onClick={handleRemoveImage}
                          >
                            <X className="w-3 h-3" />
                            Remove
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                          <ImagePlus className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium">Upload your QR code</p>
                          <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, GIF up to 5MB</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => imageInputRef.current?.click()}
                          disabled={confImageUploading || !publicIntakeForm}
                        >
                          {confImageUploading ? (
                            <><span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />Uploading...</>
                          ) : (
                            <><Upload className="w-3.5 h-3.5" />Choose Image</>
                          )}
                        </Button>
                      </>
                    )}
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Displayed on the confirmation screen — great for your QR code or logo</p>
                </div>
              </div>

              {/* Save button */}
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <p className="text-xs text-muted-foreground">Changes apply to the public intake form confirmation screen</p>
                <Button
                  onClick={handleSaveConfirmation}
                  disabled={confSaving || !publicIntakeForm}
                  className="gap-2"
                >
                  {confSaving ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
                  ) : (
                    <><Save className="w-4 h-4" />Save Confirmation Page</>
                  )}
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ── DISCOVERY WORKSHEET ── */}
      <Card className="border-border/60 border-l-4 border-l-green-500">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <Upload className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Discovery Call Worksheet</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">PDF sent to families after form submission</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Upload a PDF worksheet that will be sent to families who submit the discovery call form. They'll receive a download link in their confirmation email.</p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.pdf';
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async () => {
                  const base64 = (reader.result as string).split(',')[1];
                  try {
                    const { key, url } = await (window as any).uploadToStorage(base64, file.name, 'application/pdf');
                    const mutation = trpc.discovery.uploadWorksheet.useMutation();
                    await mutation.mutateAsync({
                      fileKey: key,
                      fileName: file.name,
                      fileSize: file.size,
                    });
                    toast.success('Worksheet uploaded successfully');
                    refetch();
                  } catch (err) {
                    toast.error('Failed to upload worksheet');
                  }
                };
                reader.readAsDataURL(file);
              };
              input.click();
            }}>
              <Upload className="w-3.5 h-3.5" />
              Upload PDF
            </Button>
          </div>
        </CardContent>
      </Card>

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
                          <button
                            type="button"
                            onClick={() => setLocation("/automations?trigger=lead_form_submitted")}
                            className="inline-flex items-center gap-1 cursor-pointer"
                            title="Click to view attached automated flow"
                          >
                            <Badge variant="outline" className="text-purple-400 border-purple-500/40 bg-purple-500/10 text-xs hover:bg-purple-500/20 transition-colors">
                              <Zap className="w-3 h-3 mr-1 text-purple-400" /> Automations Attached
                            </Badge>
                          </button>
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
                          {form.fields && (() => {
                            try {
                              const p = JSON.parse(form.fields);
                              return Array.isArray(p) ? (
                                <>
                                  <span>·</span>
                                  <span>{p.length} questions</span>
                                </>
                              ) : null;
                            } catch { return null; }
                          })()}
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
        onSuccess={() => {
          refetch();
          refetchIntake();
          setShowCreateModal(false);
          setEditingForm(null);
        }}
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
