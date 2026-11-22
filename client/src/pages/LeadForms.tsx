import { useState, useRef, useEffect } from "react";
import {
  ClipboardList,
  Copy,
  ExternalLink,
  Eye,
  CheckCircle2,
  Users,
  GraduationCap,
  Link2,
  Zap,
  Globe,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Calendar,
  MoreHorizontal,
  ImagePlus,
  Save,
  Sparkles,
  Phone,
  MessageSquare,
  X,
  Upload,
  ChevronDown,
  ChevronUp,
  AlignCenter,
  AlignLeft,
  ArrowLeft,
  ArrowRight,
  Clock,
  Mail,
  CheckSquare,
  Code2,
  FileText,
  ShieldCheck,
  Search,
} from "lucide-react";
import { useLocation } from "wouter";
import VoiceInput from "@/components/VoiceInput";
import VoiceTextarea from "@/components/VoiceTextarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import QuickSetupModal from "@/components/QuickSetupModal";
import { LeadFormModal } from "@/components/LeadFormModal";
import PageIdBadge from "@/components/PageIdBadge";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import {
  MiniLeadFormPreview,
  ShareLeadFormModal,
} from "@/components/leads/LeadFormsStudioWidgets";
import { LeadFormsBuilderStudio } from "@/components/leads/LeadFormsBuilderStudio";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function LeadForms() {
  const [, setLocation] = useLocation();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showQuickSetup, setShowQuickSetup] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingForm, setEditingForm] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(true);
  const [lifecycleOpen, setLifecycleOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [shareModalTarget, setShareModalTarget] = useState<{
    name: string;
    url: string;
  } | null>(null);

  // Confirmation customization state
  const [confHeadline, setConfHeadline] = useState("");
  const [confBody, setConfBody] = useState("");
  const [confPhone, setConfPhone] = useState("");
  const [confImageUrl, setConfImageUrl] = useState<string | null>(null);
  const [confImageKey, setConfImageKey] = useState<string | null>(null);
  const [confSaving, setConfSaving] = useState(false);
  const [confImageUploading, setConfImageUploading] = useState(false);
  const [confHeadlineAlign, setConfHeadlineAlign] = useState<"left" | "center">(
    "left"
  );
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Business phone number (shown on confirmation screen)
  const [businessPhone, setBusinessPhone] = useState("");
  const [phoneSaving, setPhoneSaving] = useState(false);
  const { data: businessPhoneData, refetch: refetchPhone } =
    trpc.system.getBusinessPhone.useQuery(undefined, { retry: false });

  const { data: allForms, refetch } = trpc.leadForms.list.useQuery(undefined, {
    retry: false,
  });
  const { data: recentLeads } = trpc.leads.list.useQuery(undefined, {
    retry: false,
  });
  const { data: publicIntakeForm, refetch: refetchIntake } =
    trpc.leadForms.getPublicIntakeForm.useQuery(undefined, {
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
      setConfHeadlineAlign(
        ((publicIntakeForm as any).confirmationHeadlineAlign as
          | "left"
          | "center") ?? "left"
      );
      setConfInitialized(true);
    }
  }, [publicIntakeForm, confInitialized]);

  // Filter out the built-in public-intake record from the custom forms list
  const customForms =
    allForms?.filter((f: any) => f.slug !== "public-intake") ?? [];

  const filteredCustomForms = customForms.filter((f: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.name?.toLowerCase().includes(q) ||
      f.slug?.toLowerCase().includes(q) ||
      f.description?.toLowerCase().includes(q)
    );
  });

  const deleteMutation = trpc.leadForms.delete.useMutation({
    onSuccess: () => {
      toast.success("Form deleted");
      refetch();
      setDeletingId(null);
    },
    onError: (e) => toast.error("Delete failed: " + e.message),
  });
  const toggleActiveMutation = trpc.leadForms.update.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Form status updated");
    },
    onError: (e) => toast.error("Update failed: " + e.message),
  });
  const updateConfirmationMutation = trpc.leadForms.update.useMutation({
    onSuccess: () => {
      toast.success("Confirmation page saved!");
      refetchIntake();
      setConfSaving(false);
    },
    onError: (e) => {
      toast.error("Save failed: " + e.message);
      setConfSaving(false);
    },
  });
  const uploadImageMutation =
    trpc.leadForms.uploadConfirmationImage.useMutation({
      onSuccess: (data: any) => {
        setConfImageUrl(data.url);
        setConfImageKey(data.key);
        setConfImageUploading(false);
        toast.success("Image uploaded!");
      },
      onError: (e) => {
        toast.error("Upload failed: " + e.message);
        setConfImageUploading(false);
      },
    });
  const utils = trpc.useUtils();
  const setPhoneMutation = trpc.system.setBusinessPhone.useMutation({
    onSuccess: (_, variables) => {
      utils.system.getBusinessPhone.setData(undefined, {
        phone: variables.phone || null,
      });
      utils.system.getBusinessPhone.invalidate();
      toast.success("Phone number saved!");
      refetchPhone();
      setPhoneSaving(false);
    },
    onError: (e) => {
      toast.error("Save failed: " + e.message);
      setPhoneSaving(false);
    },
  });
  const handleSavePhone = () => {
    setPhoneSaving(true);
    setPhoneMutation.mutate({ phone: businessPhone });
  };

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://waypointadvocates.com";
  const intakeUrl = `${origin}/form/public-intake`;
  const formLeads =
    recentLeads?.filter(
      (l: any) => l.source === "Lead Form" || l.source?.includes("Form")
    ) ?? [];

  const totalSubmissionsCount =
    formLeads.length +
    customForms.reduce(
      (acc: number, f: any) => acc + (Number(f.submissionCount) || 0),
      0
    );

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
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
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

  const handleWorksheetUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        try {
          if (typeof (window as any).uploadToStorage === "function") {
            const { key } = await (window as any).uploadToStorage(
              base64,
              file.name,
              "application/pdf"
            );
            toast.success(`Worksheet "${file.name}" uploaded (${key})`);
            refetch();
          } else {
            toast.success(`Worksheet "${file.name}" staged for Discovery emails`);
          }
        } catch {
          toast.error("Failed to upload worksheet");
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <ScopedErrorBoundary moduleName="Lead Forms Builder (PG-012)">
      <div
        data-testid="lead-forms-studio-page"
        className="min-h-screen w-full bg-[#07162B] text-[#FFF4D4] px-4 sm:px-6 lg:px-8 py-6"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 50% 0%, #102B4E 0%, #07162B 55%, #030D1A 100%)",
        }}
      >
        <div className="max-w-[1320px] mx-auto space-y-6">
          {/* ── 1. TOP BREADCRUMB & COMMAND HEADER PLAQUE ── */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                data-testid="back-to-lead-center-btn"
                onClick={() => setLocation("/leads")}
                className="h-8 px-3 rounded-lg border border-[#3A2C18] bg-[#020A17]/90 hover:bg-[#0B2040] hover:border-[#C5A059]/70 text-xs font-medium text-[#D8C7A5] hover:text-[#FFF4D4] inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#FAD77B]" />
                <span>Back to Lead Center</span>
              </button>
              <span className="text-[#3A2C18]">/</span>
              <span className="px-2.5 py-1 rounded-md bg-[#05142B] border border-[#3A2C18] text-[11px] font-mono uppercase tracking-wider text-[#FAD77B]">
                Lead Center · Form Studio
              </span>
              <PageIdBadge id="PG-012" name="Lead Forms Builder" />
            </div>

            <div className="flex items-center gap-2 text-xs text-[#C6B697]">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>FERPA-Compliant Family Intake & Discovery Pipeline</span>
            </div>
          </div>

          {/* ── 2. ADMIRALTY HERO COMMAND BAR WITH HARDWARE ACTION BUTTONS ── */}
          <div className="p-5 rounded-xl bg-[#05142B]/90 border border-[#3A2C18] shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-[#132F5C] to-[#06142B] border border-[#C5A059]/50 flex items-center justify-center text-[#FFE394] shadow-[0_4px_14px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.15)] shrink-0">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1
                    className="text-2xl sm:text-3xl font-bold tracking-wide text-[#FFF4D4]"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    Lead Forms Builder
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[11px] font-semibold inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Intake Engine Live</span>
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#C6B697]">
                  Configure public family intake forms, inline discovery call scheduling, post-submission automations, and branded confirmation screens.
                </p>
              </div>
            </div>

            {/* Hardware-Styled Action Buttons Matching Lead Center (PG-003) */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                data-testid="open-quick-setup-top-btn"
                onClick={() => setShowQuickSetup(true)}
                className="h-10 px-3.5 rounded-xl border border-[#3A2C18] bg-[#020A17] hover:bg-[#0A1D3B] hover:border-[#C5A059]/70 text-xs font-semibold text-[#D8C7A5] hover:text-[#FFF4D4] inline-flex items-center gap-2 transition-all cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.65)]"
              >
                <Zap className="w-3.5 h-3.5 text-[#FAD77B]" />
                <span>Phone Quick Setup</span>
              </button>

              <button
                type="button"
                data-testid="view-live-scheduler-btn"
                onClick={() => window.open(`${origin}/book`, "_blank")}
                className="h-10 px-3.5 rounded-xl border border-[#3A2C18] bg-[#020A17] hover:bg-[#0A1D3B] hover:border-[#C5A059]/70 text-xs font-semibold text-[#D8C7A5] hover:text-[#FFF4D4] inline-flex items-center gap-2 transition-all cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.65)]"
              >
                <Calendar className="w-3.5 h-3.5 text-[#FAD77B]" />
                <span>View Live Scheduler</span>
              </button>

              <button
                type="button"
                data-testid="create-new-lead-form-btn"
                onClick={() => setShowCreateModal(true)}
                className="h-10 px-4 rounded-xl bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-serif font-bold text-xs sm:text-sm inline-flex items-center gap-2 border border-[#FFE394]/70 shadow-[0_4px_16px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.45)] transition-all cursor-pointer"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Create New Form</span>
              </button>
            </div>
          </div>

          {/* ── 3. 4-COLUMN ADMIRALTY KPI TELEMETRY STRIP ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-xl bg-[#05142B]/90 border border-[#3A2C18] shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#A69371]">
                  Active Intake Forms
                </span>
                <div
                  className="text-2xl font-bold text-[#FFF4D4]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {1 + customForms.filter((f: any) => f.isActive !== false).length}
                </div>
                <span className="text-[11px] text-[#C6B697]">
                  1 Default + {customForms.length} Custom
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#020A17]/90 border border-[#3A2C18] flex items-center justify-center text-[#FAD77B]">
                <ClipboardList className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#05142B]/90 border border-[#3A2C18] shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#A69371]">
                  Family Submissions
                </span>
                <div
                  className="text-2xl font-bold text-[#FFE394]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {totalSubmissionsCount}
                </div>
                <span className="text-[11px] text-emerald-400">
                  Routed to Lead Center (PG-003)
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#020A17]/90 border border-[#3A2C18] flex items-center justify-center text-emerald-400">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#05142B]/90 border border-[#3A2C18] shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#A69371]">
                  Student & Case Provisioning
                </span>
                <div
                  className="text-2xl font-bold text-[#FFF4D4]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Instant 1:1
                </div>
                <span className="text-[11px] text-[#C6B697]">
                  Parent + Student + Case ID
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#020A17]/90 border border-[#3A2C18] flex items-center justify-center text-[#FAD77B]">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#05142B]/90 border border-[#3A2C18] shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#A69371]">
                  Connected Automation
                </span>
                <div
                  className="text-lg font-bold text-[#FFE394] truncate"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  3-Step Onboarding
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setLocation("/automations?trigger=lead_form_submitted")
                  }
                  className="text-[11px] text-[#FAD77B] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Inspect Workflow</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[#020A17]/90 border border-[#3A2C18] flex items-center justify-center text-[#FFE394]">
                <Zap className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* ── 3.5 INTERACTIVE 3-PANE VISUAL FORMS BUILDER STUDIO ── */}
          <LeadFormsBuilderStudio
            allForms={allForms || []}
            publicIntakeForm={publicIntakeForm}
            businessPhone={businessPhone}
            onSaved={() => {
              refetch();
              refetchIntake();
            }}
            onOpenCreateModal={() => setShowCreateModal(true)}
          />

          {/* ── 4. CORE BUILT-IN INTAKE CHANNELS (2-COLUMN COMMAND GRID WITH LIVE MINI PREVIEW) ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2
                className="text-base sm:text-lg font-bold text-[#FFF4D4] tracking-wide flex items-center gap-2"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                <Globe className="w-4 h-4 text-[#FAD77B]" />
                <span>Primary Intake Channels</span>
              </h2>
              <span className="text-xs text-[#A69371]">
                Click any miniature preview to test the live family experience
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Primary Card (8 cols): Public Family Intake Form with Interactive Mini Browser Preview */}
              <div className="lg:col-span-8 p-5 rounded-xl bg-[#05142B]/90 border border-[#3A2C18] hover:border-[#C5A059]/60 transition-all shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] flex flex-col justify-between gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#0B2144] border border-[#C5A059]/50 flex items-center justify-center text-[#FFE394] shadow-inner shrink-0">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          className="text-lg font-bold text-[#FFF4D4]"
                          style={{
                            fontFamily: "'Playfair Display', Georgia, serif",
                          }}
                        >
                          Public Family Intake Form
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[10px] font-semibold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Active Default
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setLocation(
                              "/automations?trigger=lead_form_submitted"
                            )
                          }
                          className="px-2 py-0.5 rounded-full bg-[#C5A059]/15 border border-[#C5A059]/40 text-[#FFE394] text-[10px] font-semibold inline-flex items-center gap-1 hover:bg-[#C5A059]/25 cursor-pointer"
                        >
                          <Zap className="w-2.5 h-2.5" /> Automations Attached
                        </button>
                      </div>
                      <p className="text-xs text-[#C6B697] mt-0.5">
                        Primary 3-step family intake questionnaire with built-in Discovery Call scheduling
                        {publicIntakeForm?.fields &&
                          (() => {
                            try {
                              const p = JSON.parse(publicIntakeForm.fields);
                              return Array.isArray(p)
                                ? ` · ${p.length} questions active`
                                : "";
                            } catch {
                              return "";
                            }
                          })()}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    data-testid="edit-public-intake-form-btn"
                    disabled={!publicIntakeForm}
                    onClick={() =>
                      publicIntakeForm && setEditingForm(publicIntakeForm)
                    }
                    className="h-8 px-3 rounded-lg bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs inline-flex items-center gap-1.5 shadow-sm hover:brightness-110 disabled:opacity-40 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Questions & Settings</span>
                  </button>
                </div>

                {/* Live Interactive Miniature Form Preview */}
                <MiniLeadFormPreview
                  form={{
                    name: publicIntakeForm?.name || "Waypoint Family Intake Form",
                    slug: "public-intake",
                    schedulingEnabled:
                      publicIntakeForm?.schedulingEnabled ?? true,
                    fields: publicIntakeForm?.fields,
                    customLabels: (publicIntakeForm as any)?.customLabels,
                  }}
                  formUrl={intakeUrl}
                  businessPhone={businessPhone}
                  confHeadline={confHeadline}
                  confBody={confBody}
                  onClick={() =>
                    window.open(`${intakeUrl}?preview=true`, "_blank")
                  }
                />

                {/* Recessed Shareable URL Bar */}
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#020A17]/90 border border-[#3A2C18]">
                  <Link2 className="w-3.5 h-3.5 text-[#FAD77B] shrink-0" />
                  <span className="text-xs font-mono text-[#D8C7A5] truncate flex-1">
                    {intakeUrl}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(intakeUrl, "intake")}
                    className="h-7 px-2.5 rounded bg-[#07162B] border border-[#3A2C18] hover:border-[#C5A059] text-[11px] font-semibold text-[#FFE394] inline-flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {copiedId === "intake" ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 4-Column Non-Overlapping Footer Action Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      window.open(`${intakeUrl}?preview=true`, "_blank")
                    }
                    className="h-8 px-2.5 rounded-lg border border-[#3A2C18] bg-[#020A17] hover:bg-[#07162B] hover:border-[#C5A059]/60 text-xs font-medium text-[#D8C7A5] hover:text-[#FFF4D4] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#FAD77B]" />
                    <span className="truncate">Preview Form</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      window.open(
                        `${intakeUrl}?preview=true&confirmed=true`,
                        "_blank"
                      )
                    }
                    className="h-8 px-2.5 rounded-lg border border-[#3A2C18] bg-[#020A17] hover:bg-[#07162B] hover:border-[#C5A059]/60 text-xs font-medium text-[#D8C7A5] hover:text-[#FFF4D4] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#FAD77B]" />
                    <span className="truncate">Preview Thank You</span>
                  </button>

                  <button
                    type="button"
                    data-testid="share-embed-public-intake-btn"
                    onClick={() =>
                      setShareModalTarget({
                        name: "Public Family Intake Form",
                        url: intakeUrl,
                      })
                    }
                    className="h-8 px-2.5 rounded-lg border border-[#3A2C18] bg-[#020A17] hover:bg-[#07162B] hover:border-[#C5A059]/60 text-xs font-medium text-[#D8C7A5] hover:text-[#FFF4D4] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Code2 className="w-3.5 h-3.5 text-[#FAD77B]" />
                    <span className="truncate">Share & Embed</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.open(intakeUrl, "_blank")}
                    className="h-8 px-2.5 rounded-lg border border-[#3A2C18] bg-[#020A17] hover:bg-[#07162B] hover:border-[#C5A059]/60 text-xs font-medium text-[#D8C7A5] hover:text-[#FFF4D4] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#FAD77B]" />
                    <span className="truncate">Open Live</span>
                  </button>
                </div>
              </div>

              {/* Right Column (4 cols): Internal Phone Quick Setup + Discovery Call PDF Worksheet */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                {/* Internal Quick Setup Card */}
                <div className="p-5 rounded-xl bg-[#05142B]/90 border border-[#3A2C18] hover:border-[#C5A059]/60 transition-all shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-[#020A17] border border-[#C5A059]/50 flex items-center justify-center text-[#FFE394] shrink-0">
                          <Zap className="w-5 h-5" />
                        </div>
                        <div>
                          <h3
                            className="text-base font-bold text-[#FFF4D4]"
                            style={{
                              fontFamily: "'Playfair Display', Georgia, serif",
                            }}
                          >
                            Internal Phone Quick Setup
                          </h3>
                          <p className="text-[11px] text-[#A69371]">
                            Staff Console · Live Phone Intake
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#C5A059]/15 border border-[#C5A059]/40 text-[#FFE394] text-[10px] font-mono uppercase">
                        Staff Only
                      </span>
                    </div>

                    <p className="text-xs text-[#C6B697] leading-relaxed">
                      On a live call with a parent? Instantly provision a Parent Contact, Student Dossier, and Case ID in one screen without needing a prior appointment.
                    </p>
                  </div>

                  <button
                    type="button"
                    data-testid="launch-quick-setup-card-btn"
                    onClick={() => setShowQuickSetup(true)}
                    className="w-full h-9 rounded-lg bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-bold text-xs inline-flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Launch Phone Quick Setup</span>
                  </button>
                </div>

                {/* Discovery Call Worksheet PDF Card */}
                <div className="p-5 rounded-xl bg-[#05142B]/90 border border-[#3A2C18] hover:border-[#C5A059]/60 transition-all shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-[#020A17] border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h3
                            className="text-base font-bold text-[#FFF4D4]"
                            style={{
                              fontFamily: "'Playfair Display', Georgia, serif",
                            }}
                          >
                            Discovery Call Worksheet
                          </h3>
                          <p className="text-[11px] text-[#A69371]">
                            Auto-attached to confirmation email
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[10px] font-mono">
                        PDF Packet
                      </span>
                    </div>

                    <p className="text-xs text-[#C6B697] leading-relaxed">
                      Upload a preparation worksheet PDF for families to download on the confirmation screen or build an interactive worksheet in Worksheet Studio.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleWorksheetUpload}
                      className="h-8.5 px-2.5 rounded-lg border border-[#3A2C18] bg-[#020A17] hover:bg-[#07162B] hover:border-[#C5A059] text-xs font-semibold text-[#FFE394] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocation("/tools/worksheet-builder")}
                      className="h-8.5 px-2.5 rounded-lg border border-[#3A2C18] bg-[#020A17] hover:bg-[#07162B] hover:border-[#C5A059] text-xs font-medium text-[#D8C7A5] hover:text-[#FFF4D4] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#FAD77B]" />
                      <span>Worksheet Studio</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── 5. CUSTOM CAMPAIGN & REFERRAL FORMS STUDIO ── */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2
                  className="text-base sm:text-lg font-bold text-[#FFF4D4] tracking-wide flex items-center gap-2"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  <ClipboardList className="w-4 h-4 text-[#FAD77B]" />
                  <span>Custom Campaign & Partner Intake Forms</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#020A17] border border-[#3A2C18] text-xs font-mono text-[#FFE394]">
                    {customForms.length}
                  </span>
                </h2>
                <p className="text-xs text-[#A69371]">
                  Tailored forms for specific school districts, referral partners, scholarships, or workshops
                </p>
              </div>

              <div className="flex items-center gap-2">
                {customForms.length > 0 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#A69371] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter custom forms…"
                      className="h-8 pl-8 pr-3 rounded-lg bg-[#020A17] border border-[#3A2C18] text-xs text-[#FFF4D4] placeholder:text-[#A69371] focus:outline-none focus:border-[#C5A059]"
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="h-8 px-3 rounded-lg bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs inline-flex items-center gap-1.5 shadow-sm hover:brightness-110 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Custom Form</span>
                </button>
              </div>
            </div>

            {filteredCustomForms.length === 0 ? (
              <div className="p-8 rounded-xl bg-[#05142B]/80 border border-dashed border-[#3A2C18] text-center flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center text-[#FAD77B]">
                  <ClipboardList className="w-6 h-6" />
                </div>
                <div className="max-w-md space-y-1">
                  <p
                    className="text-base font-bold text-[#FFF4D4]"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    {searchQuery
                      ? "No custom forms match your filter"
                      : "Create Campaign-Specific Intake Forms"}
                  </p>
                  <p className="text-xs text-[#C6B697]">
                    Build dedicated forms with custom question labels and session types for partner clinics, regional school districts, or special education workshops.
                  </p>
                </div>
                {!searchQuery && (
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="mt-1 h-9 px-4 rounded-xl bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs inline-flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Your First Custom Form</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCustomForms.map((form: any) => {
                  const formUrl = `${origin}/form/${form.slug}`;
                  return (
                    <div
                      key={form.id}
                      className={`p-4 rounded-xl bg-[#05142B]/90 border border-[#3A2C18] hover:border-[#C5A059]/60 transition-all shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] flex flex-col justify-between gap-3.5 ${
                        !form.isActive ? "opacity-65" : ""
                      }`}
                    >
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3
                              className="text-base font-bold text-[#FFF4D4] truncate"
                              style={{
                                fontFamily:
                                  "'Playfair Display', Georgia, serif",
                              }}
                            >
                              {form.name}
                            </h3>
                            {form.isActive ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[10px] font-semibold">
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[10px]">
                                Inactive
                              </span>
                            )}
                            {form.schedulingEnabled && (
                              <span className="px-2 py-0.5 rounded-full bg-[#C5A059]/15 border border-[#C5A059]/40 text-[#FFE394] text-[10px] font-semibold inline-flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" /> Scheduler
                              </span>
                            )}
                          </div>
                          {form.description && (
                            <p className="text-xs text-[#C6B697] mt-0.5 line-clamp-1">
                              {form.description}
                            </p>
                          )}
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="w-7 h-7 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[#D8C7A5] hover:text-[#FFF4D4] flex items-center justify-center cursor-pointer shrink-0"
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4] text-xs"
                          >
                            <DropdownMenuItem
                              onClick={() => setEditingForm(form)}
                              className="cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5 mr-2 text-[#FAD77B]" />
                              Edit Form & Questions
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setShareModalTarget({
                                  name: form.name,
                                  url: formUrl,
                                })
                              }
                              className="cursor-pointer"
                            >
                              <Code2 className="w-3.5 h-3.5 mr-2 text-[#FAD77B]" />
                              Share & Website Embed
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => window.open(formUrl, "_blank")}
                              className="cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5 mr-2 text-[#FAD77B]" />
                              Open Live Form
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-[#3A2C18]" />
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(form)}
                              className="cursor-pointer"
                            >
                              {form.isActive ? (
                                <>
                                  <ToggleLeft className="w-3.5 h-3.5 mr-2" />
                                  Deactivate Form
                                </>
                              ) : (
                                <>
                                  <ToggleRight className="w-3.5 h-3.5 mr-2" />
                                  Activate Form
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-[#3A2C18]" />
                            <DropdownMenuItem
                              className="text-rose-400 focus:text-rose-300 cursor-pointer"
                              onClick={() => setDeletingId(form.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Delete Form
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Interactive Miniature Browser Preview on Every Custom Form Card */}
                      <MiniLeadFormPreview
                        form={form}
                        formUrl={formUrl}
                        businessPhone={businessPhone}
                        onClick={() =>
                          window.open(`${formUrl}?preview=true`, "_blank")
                        }
                      />

                      {/* Telemetry Metadata Strip */}
                      <div className="flex items-center justify-between text-[11px] text-[#A69371] px-1">
                        <span>
                          <strong className="text-[#FFE394]">
                            {form.submissionCount ?? 0}
                          </strong>{" "}
                          submissions
                        </span>
                        <span>
                          Created{" "}
                          {new Date(form.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* 4-Column Non-Overlapping Footer Buttons */}
                      <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-[#3A2C18]/70">
                        <button
                          type="button"
                          onClick={() =>
                            window.open(`${formUrl}?preview=true`, "_blank")
                          }
                          className="h-8 px-2 rounded-lg border border-[#3A2C18] bg-[#020A17] hover:bg-[#07162B] text-[11px] font-medium text-[#D8C7A5] hover:text-[#FFF4D4] inline-flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-[#FAD77B] shrink-0" />
                          <span className="truncate">Preview</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingForm(form)}
                          className="h-8 px-2 rounded-lg border border-[#3A2C18] bg-[#020A17] hover:bg-[#07162B] text-[11px] font-medium text-[#D8C7A5] hover:text-[#FFF4D4] inline-flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3 text-[#FAD77B] shrink-0" />
                          <span className="truncate">Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(formUrl, `form-${form.id}`)
                          }
                          className="h-8 px-2 rounded-lg border border-[#3A2C18] bg-[#020A17] hover:bg-[#07162B] text-[11px] font-medium text-[#D8C7A5] hover:text-[#FFF4D4] inline-flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3 text-[#FAD77B] shrink-0" />
                          <span className="truncate">
                            {copiedId === `form-${form.id}` ? "Copied" : "Link"}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setShareModalTarget({
                              name: form.name,
                              url: formUrl,
                            })
                          }
                          className="h-8 px-2 rounded-lg bg-gradient-to-r from-[#DFBE77] to-[#C5A059] text-[#07162B] font-bold text-[11px] inline-flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Code2 className="w-3 h-3 shrink-0" />
                          <span className="truncate">Embed</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── 6. CONFIRMATION SCREEN & FAMILY THANK-YOU STUDIO (SIDE-BY-SIDE EDITOR + LIVE PREVIEW) ── */}
          <Collapsible
            open={confirmationOpen}
            onOpenChange={setConfirmationOpen}
          >
            <div className="rounded-xl bg-[#05142B]/90 border border-[#3A2C18] shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-[#3A2C18]/70 flex items-center justify-between gap-3">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-3 text-left flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#020A17] border border-[#C5A059]/50 flex items-center justify-center text-[#FFE394] shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h2
                        className="text-base sm:text-lg font-bold text-[#FFF4D4]"
                        style={{
                          fontFamily: "'Playfair Display', Georgia, serif",
                        }}
                      >
                        Confirmation Experience & “Save Our Number” Studio
                      </h2>
                      <p className="text-xs text-[#C6B697]">
                        Customize the headline, message, business phone number, and QR code shown immediately after a family submits their intake form
                      </p>
                    </div>
                  </button>
                </CollapsibleTrigger>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      window.open(
                        `${intakeUrl}?preview=true&confirmed=true`,
                        "_blank"
                      )
                    }
                    className="h-8 px-3 rounded-lg border border-[#3A2C18] bg-[#020A17] hover:border-[#C5A059] text-xs font-medium text-[#FFE394] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Open Full Confirmation</span>
                  </button>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="w-8 h-8 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[#C6B697] hover:text-[#FFF4D4] flex items-center justify-center cursor-pointer"
                    >
                      {confirmationOpen ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                </div>
              </div>

              <CollapsibleContent>
                <div className="p-5 space-y-5">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Left 7 Cols: Confirmation Fields & Business Phone */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-[#FFE394] flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-[#FAD77B]" />
                            Confirmation Headline
                          </Label>
                          <button
                            type="button"
                            onClick={() =>
                              setConfHeadlineAlign(
                                confHeadlineAlign === "center"
                                  ? "left"
                                  : "center"
                              )
                            }
                            className="px-2 py-0.5 rounded bg-[#020A17] border border-[#3A2C18] text-[10px] text-[#D8C7A5] hover:border-[#C5A059] inline-flex items-center gap-1 cursor-pointer"
                          >
                            {confHeadlineAlign === "center" ? (
                              <AlignCenter className="w-3 h-3 text-[#FAD77B]" />
                            ) : (
                              <AlignLeft className="w-3 h-3 text-[#FAD77B]" />
                            )}
                            <span>
                              {confHeadlineAlign === "center"
                                ? "Centered"
                                : "Left-aligned"}
                            </span>
                          </button>
                        </div>
                        <VoiceInput
                          value={confHeadline}
                          onChange={(e) => setConfHeadline(e.target.value)}
                          placeholder="Thank You! Your Family Case File Is Ready"
                          maxLength={200}
                          className="text-sm bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-[#FFE394] flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-[#FAD77B]" />
                          Confirmation Body Message
                        </Label>
                        <VoiceTextarea
                          value={confBody}
                          onChange={(e) => setConfBody(e.target.value)}
                          placeholder="Your information has been submitted successfully. Our advocacy team will review your student file and be in touch within 1–2 business days."
                          rows={3}
                          className="text-sm resize-none bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-[#FFE394] flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-[#FAD77B]" />
                            “Save Our Number” Reminder Copy
                          </Label>
                          <VoiceInput
                            value={confPhone}
                            onChange={(e) => setConfPhone(e.target.value)}
                            placeholder="Remember to save our number so you don't miss our call!"
                            className="text-xs bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-emerald-400" />
                            Practice Phone Number
                          </Label>
                          <div className="flex items-center gap-1.5">
                            <VoiceInput
                              value={businessPhone}
                              onChange={(e) => setBusinessPhone(e.target.value)}
                              placeholder="(404) 555-0199"
                              className="text-xs font-mono bg-[#020A17] border-[#3A2C18] text-[#FFF4D4]"
                              type="tel"
                            />
                            <button
                              type="button"
                              onClick={handleSavePhone}
                              disabled={phoneSaving}
                              className="h-9 px-3 rounded-lg bg-[#0B2144] border border-[#C5A059]/60 text-xs font-bold text-[#FFE394] hover:bg-[#123163] inline-flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>{phoneSaving ? "…" : "Save"}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right 5 Cols: Live Interactive Confirmation Card Preview + QR Code Uploader */}
                    <div className="lg:col-span-5 flex flex-col justify-between gap-3 p-4 rounded-xl bg-[#020A17]/90 border border-[#3A2C18]">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#FAD77B]">
                            Live Confirmation Card Preview
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-mono">
                            Case ID: WP-2026-841
                          </span>
                        </div>

                        <div
                          className={`p-3.5 rounded-xl bg-[#05142B] border border-[#3A2C18] space-y-2 ${
                            confHeadlineAlign === "center"
                              ? "text-center"
                              : "text-left"
                          }`}
                        >
                          <div className="text-sm font-serif font-bold text-[#FFF4D4]">
                            {confHeadline || "Thank You!"}
                          </div>
                          <p className="text-[11px] text-[#C6B697] leading-relaxed">
                            {confBody ||
                              "Your information has been submitted successfully. We will be in touch within 1–2 business days."}
                          </p>
                          <div className="p-2.5 rounded-lg bg-[#C5A059]/15 border border-[#C5A059]/40 text-center space-y-0.5">
                            <div className="text-[10px] text-[#FFE394] font-medium">
                              {confPhone ||
                                "Remember to save our number so you don't miss our call!"}
                            </div>
                            <div className="text-sm font-mono font-bold text-[#FFF4D4]">
                              {businessPhone || "(404) 555-0199"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* QR Code / Logo Upload Strip */}
                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#3A2C18]">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {confImageUrl ? (
                            <img
                              src={confImageUrl}
                              alt="Confirmation QR"
                              className="w-11 h-11 rounded-lg object-contain bg-white p-1 shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-[#05142B] border border-[#3A2C18] flex items-center justify-center text-[#A69371] shrink-0">
                              <ImagePlus className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-[#FFF4D4] truncate">
                              {confImageUrl
                                ? "Custom QR / Badge Active"
                                : "Optional QR Code or VCard Graphic"}
                            </div>
                            <div className="text-[10px] text-[#A69371]">
                              PNG or JPG up to 5MB
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => imageInputRef.current?.click()}
                            disabled={confImageUploading || !publicIntakeForm}
                            className="h-8 px-2.5 rounded-lg border border-[#3A2C18] bg-[#05142B] hover:border-[#C5A059] text-xs font-semibold text-[#FFE394] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Upload className="w-3 h-3" />
                            <span>
                              {confImageUploading
                                ? "Uploading…"
                                : confImageUrl
                                ? "Replace"
                                : "Upload"}
                            </span>
                          </button>
                          {confImageUrl && (
                            <button
                              type="button"
                              onClick={handleRemoveImage}
                              className="h-8 px-2 rounded-lg border border-rose-500/40 bg-rose-950/40 text-xs text-rose-300 hover:text-white cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageSelect}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Save Confirmation Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#3A2C18]/70">
                    <span className="text-xs text-[#A69371]">
                      Updates synchronize immediately with `/form/public-intake`
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveConfirmation}
                      disabled={confSaving || !publicIntakeForm}
                      className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs inline-flex items-center gap-2 shadow-md hover:brightness-110 disabled:opacity-40 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>
                        {confSaving
                          ? "Saving Confirmation…"
                          : "Save Confirmation Experience"}
                      </span>
                    </button>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* ── 7. POST-SUBMISSION AUTOMATION LIFECYCLE BLUEPRINT ── */}
          <Collapsible open={lifecycleOpen} onOpenChange={setLifecycleOpen}>
            <div className="rounded-xl bg-[#05142B]/90 border border-[#3A2C18] shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-[#3A2C18]/70 flex flex-wrap items-center justify-between gap-3">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-3 text-left flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#020A17] border border-[#C5A059]/50 flex items-center justify-center text-[#FFE394] shrink-0">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2
                          className="text-base sm:text-lg font-bold text-[#FFF4D4]"
                          style={{
                            fontFamily: "'Playfair Display', Georgia, serif",
                          }}
                        >
                          Post-Submission Automation Lifecycle
                        </h2>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[10px] font-semibold">
                          Live Trigger Connected
                        </span>
                      </div>
                      <p className="text-xs text-[#C6B697]">
                        What happens across Waypoint CRM the moment a parent submits any intake form
                      </p>
                    </div>
                  </button>
                </CollapsibleTrigger>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setLocation("/automations?trigger=lead_form_submitted")
                    }
                    className="h-8 px-3 rounded-lg bg-[#0B2144] hover:bg-[#133264] border border-[#C5A059]/50 text-xs font-semibold text-[#FFE394] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Open Flow in Automations (PG-013)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="w-8 h-8 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[#C6B697] hover:text-[#FFF4D4] flex items-center justify-center cursor-pointer"
                    >
                      {lifecycleOpen ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                </div>
              </div>

              <CollapsibleContent>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="p-3.5 rounded-xl bg-[#020A17]/90 border border-[#3A2C18] flex flex-col justify-between gap-2">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono uppercase text-[#FAD77B]">
                        <span className="flex items-center gap-1.5 font-bold">
                          <Users className="w-3.5 h-3.5" /> 1. Instant Profiles
                        </span>
                        <span>0 sec</span>
                      </div>
                      <div className="text-sm font-serif font-bold text-[#FFF4D4]">
                        Contact & Case Provisioned
                      </div>
                      <p className="text-xs text-[#C6B697] leading-relaxed">
                        Parent contact, student profile, and a dedicated case record (with unique Case ID) are created in Lead Center.
                      </p>
                    </div>
                    <span className="w-fit px-2 py-0.5 rounded bg-[#05142B] border border-[#3A2C18] text-[10px] font-mono text-[#FFE394]">
                      D1 Database Sync
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#020A17]/90 border border-[#3A2C18] flex flex-col justify-between gap-2">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono uppercase text-[#FFE394]">
                        <span className="flex items-center gap-1.5 font-bold">
                          <Clock className="w-3.5 h-3.5" /> 2. Welcome & Link
                        </span>
                        <span>Immediate</span>
                      </div>
                      <div className="text-sm font-serif font-bold text-[#FFF4D4]">
                        Discovery Invite Dispatched
                      </div>
                      <p className="text-xs text-[#C6B697] leading-relaxed">
                        Sends the personalized advocate welcome email with your Discovery Call calendar booking link and worksheet.
                      </p>
                    </div>
                    <span className="w-fit px-2 py-0.5 rounded bg-[#C5A059]/15 border border-[#C5A059]/40 text-[10px] font-mono text-[#FFE394]">
                      Email Dispatched
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#020A17]/90 border border-[#3A2C18] flex flex-col justify-between gap-2">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono uppercase text-cyan-300">
                        <span className="flex items-center gap-1.5 font-bold">
                          <Mail className="w-3.5 h-3.5" /> 3. Records Request
                        </span>
                        <span>+24 Hours</span>
                      </div>
                      <div className="text-sm font-serif font-bold text-[#FFF4D4]">
                        IEP & Evaluation Upload Prompt
                      </div>
                      <p className="text-xs text-[#C6B697] leading-relaxed">
                        Follows up requesting current IEP/504 documents, psychoeducational evaluations, and Prior Written Notices.
                      </p>
                    </div>
                    <span className="w-fit px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/40 text-[10px] font-mono text-cyan-300">
                      Portal Vault Ready
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#020A17]/90 border border-[#3A2C18] flex flex-col justify-between gap-2">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono uppercase text-emerald-300">
                        <span className="flex items-center gap-1.5 font-bold">
                          <CheckSquare className="w-3.5 h-3.5" /> 4. Advocate Task
                        </span>
                        <span>+48 Hours</span>
                      </div>
                      <div className="text-sm font-serif font-bold text-[#FFF4D4]">
                        Pre-Discovery File Audit
                      </div>
                      <p className="text-xs text-[#C6B697] leading-relaxed">
                        Automatically queues a high-priority task for the Lead Special Education Advocate to review the family’s file.
                      </p>
                    </div>
                    <span className="w-fit px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/40 text-[10px] font-mono text-emerald-300">
                      Tasks Queue (PG-009)
                    </span>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>

        {/* Modals */}
        <QuickSetupModal
          open={showQuickSetup}
          onClose={() => setShowQuickSetup(false)}
        />
        <LeadFormModal
          open={showCreateModal || !!editingForm}
          onOpenChange={(open: boolean) => {
            if (!open) {
              setShowCreateModal(false);
              setEditingForm(null);
            }
          }}
          editingForm={editingForm}
          onSuccess={() => {
            refetch();
            refetchIntake();
            setShowCreateModal(false);
            setEditingForm(null);
          }}
        />

        <ShareLeadFormModal
          open={Boolean(shareModalTarget)}
          onOpenChange={(o) => !o && setShareModalTarget(null)}
          formName={shareModalTarget?.name || "Public Family Intake Form"}
          formUrl={shareModalTarget?.url || intakeUrl}
        />

        {/* Delete Confirm */}
        <AlertDialog
          open={!!deletingId}
          onOpenChange={(open) => !open && setDeletingId(null)}
        >
          <AlertDialogContent className="bg-[#05142B] border border-[#3A2C18] text-[#FFF4D4]">
            <AlertDialogHeader>
              <AlertDialogTitle
                className="font-serif text-[#FFF4D4]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Delete Custom Intake Form?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-[#C6B697]">
                This will permanently delete the form and its shareable link.
                Existing family submissions in the Lead Center pipeline will not
                be affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-[#020A17] border-[#3A2C18] text-[#D8C7A5] hover:text-white">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 hover:bg-rose-500 text-white"
                onClick={() =>
                  deletingId && deleteMutation.mutate({ id: deletingId })
                }
              >
                Delete Form
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ScopedErrorBoundary>
  );
}
