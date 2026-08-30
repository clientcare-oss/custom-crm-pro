import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft, Phone, Mail, User, GraduationCap, Calendar,
  ChevronDown, ChevronRight, Copy, Check, Edit2, Plus, Trash2,
  Loader2, Save, CheckCircle2, Circle, BookOpen, Send,
  PhoneCall, Star, Lock, FileText, Globe, X, Settings, Settings2, Sliders,
  Sparkles, Eye, AlertCircle, Info, ShieldCheck, CheckSquare,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import DiscoveryHeader from "@/components/discovery/DiscoveryHeader";
import DiscoverySectionHeader from "@/components/discovery/DiscoverySectionHeader";

interface DiscoveryCallPageProps {
  leadId: number;
}

const NEXT_STEPS_KEYS = [
  { key: "agreement", label: "Send Membership Agreement" },
  { key: "welcome_email", label: "Send Welcome Email" },
  { key: "portal_access", label: "Create Client Portal Access" },
  { key: "records_review", label: "Schedule Records Review" },
  { key: "onboarding", label: "Add to Onboarding Pipeline" },
];

const LOST_STEPS_KEYS = [
  { key: "ask_reason", label: "Ask for reason (optional)" },
  { key: "add_notes", label: "Add notes" },
  { key: "mark_lost", label: "Mark as Lost / Not a Fit" },
  { key: "archive", label: "Archive Lead" },
];

// SectionHeader component imported from @/components/discovery/DiscoverySectionHeader
const SectionHeader = DiscoverySectionHeader;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy Script"}
    </button>
  );
}

export default function DiscoveryCall({ leadId }: DiscoveryCallPageProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Section open/close state (7 total sections)
  const [openSections, setOpenSections] = useState<Record<number | string, boolean>>({
    1: true, 2: false, 3: false, 4: false, 5: false,
    6: false, 7: false,
  });

  // Active tab: "call" | "resources"
  const [activeTab, setActiveTab] = useState<"call" | "resources">("call");

  // Question mode
  const [questionMode, setQuestionMode] = useState<"IEP/504" | "General">("IEP/504");

  // Per-question notes (keyed by question id)
  const [questionNotes, setQuestionNotes] = useState<Record<number, string>>({});
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({});

  // Script content (editable)
  const DEFAULT_OPENING_SCRIPT = `"Hi, is this [Parent Name]?"

My name is [Your Name] with Waypoint Advocates. I'm calling because you requested a discovery call to talk about [Student Name] and how we might be able to help. Do you have a few minutes?`;
  const DEFAULT_VOICEMAIL_SCRIPT = `"Hi, this is [Your Name] with Waypoint Advocates. I'm calling to connect with [Parent Name] about [Student Name]. Please give me a call back at your earliest convenience. Thanks, talk soon!"`;
  const [openingScript, setOpeningScript] = useState(DEFAULT_OPENING_SCRIPT);
  const [voicemailScript, setVoicemailScript] = useState(DEFAULT_VOICEMAIL_SCRIPT);
  const [editingOpeningScript, setEditingOpeningScript] = useState(false);
  const [editingVoicemailScript, setEditingVoicemailScript] = useState(false);

  // Section notes
  const [callScriptNotes, setCallScriptNotes] = useState("");
  const [theirStoryNotes, setTheirStoryNotes] = useState("");
  const [howItWorksNotes, setHowItWorksNotes] = useState("");
  const [pricingNotes, setPricingNotes] = useState("");
  const [studentCount, setStudentCount] = useState<number>(1);
  const [selectedPlan, setSelectedPlan] = useState<string>("advocacy_55");
  const [closingResponse, setClosingResponse] = useState("");
  const [planPublishedToPortal, setPlanPublishedToPortal] = useState(false);
  const [overridePortalDisplay, setOverridePortalDisplay] = useState(false);
  const [showAdvocacyOnlyInPortal, setShowAdvocacyOnlyInPortal] = useState(true);
  const [showComplaintsInPortal, setShowComplaintsInPortal] = useState(true);
  const [spouseFollowUpChecklist, setSpouseFollowUpChecklist] = useState<string[]>([]);
  const [lostReason, setLostReason] = useState("");
  const [lostFeedbackNotes, setLostFeedbackNotes] = useState("");
  const [lostNurtureOptions, setLostNurtureOptions] = useState<string[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");
  const [preliminaryNotes, setPreliminaryNotes] = useState("");
  const [nextStepsCompleted, setNextStepsCompleted] = useState<string[]>([]);
  const [lostStepsCompleted, setLostStepsCompleted] = useState<string[]>([]);

  // Step tracker
  const [currentStepId, setCurrentStepId] = useState<number | null>(null);
  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const [editingStepLabel, setEditingStepLabel] = useState("");
  const [pipelineEditMode, setPipelineEditMode] = useState(false);
  const [newStepLabel, setNewStepLabel] = useState("");
  const [addingAfterStepId, setAddingAfterStepId] = useState<number | null>(null);

  // Resource share dialog
  const [shareResourceId, setShareResourceId] = useState<number | null>(null);
  const [shareContactId, setShareContactId] = useState<number | null>(null);
  const [shareMessage, setShareMessage] = useState("");
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [addResourceOpen, setAddResourceOpen] = useState(false);
  const [newResource, setNewResource] = useState({ name: "", specialty: "", phone: "", email: "", website: "", notes: "", category: "" });
  const [editResourceId, setEditResourceId] = useState<number | null>(null);

  // Question editor
  const [questionEditorOpen, setQuestionEditorOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ label: "", subLabel: "", mode: "both" });

  // Autosave timer
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  // Data queries
  const { data: lead } = trpc.leads.get.useQuery({ id: leadId }, { enabled: !!leadId });
  const { data: callSession, refetch: refetchSession } = trpc.discovery.getOrCreate.useQuery(
    { leadId },
    { enabled: !!leadId }
  );
  const { data: steps, refetch: refetchSteps } = trpc.discovery.getSteps.useQuery(undefined, { enabled: !!user });
  const { data: questions, refetch: refetchQuestions } = trpc.discovery.getQuestions.useQuery(undefined, { enabled: !!user });
  const { data: resources, refetch: refetchResources } = trpc.resources.list.useQuery(undefined, { enabled: !!user });
  const { data: contacts } = trpc.contacts.list.useQuery(undefined, { enabled: !!user });
  const { data: preliminaryNote } = trpc.discovery.getPreliminaryNote.useQuery(
    { projectId: leadId },
    { enabled: !!leadId }
  );
  const updatePreliminaryNoteMutation = trpc.discovery.updatePreliminaryNote.useMutation();

  // Mutations
  const saveMutation = trpc.discovery.save.useMutation({
    onSuccess: () => { setSaving(false); setLastSaved(new Date()); },
    onError: () => setSaving(false),
  });
  const syncNotesMutation = trpc.discovery.syncNotes.useMutation();
  const updateStepMutation = trpc.discovery.updateStep.useMutation({
    onSuccess: () => { refetchSteps(); setEditingStepId(null); },
  });
  const createPipelineStepMutation = trpc.discovery.createPipelineStep.useMutation({
    onSuccess: () => { refetchSteps(); setNewStepLabel(""); setAddingAfterStepId(null); },
    onError: (e) => toast.error(e.message),
  });
  const deletePipelineStepMutation = trpc.discovery.deletePipelineStep.useMutation({
    onSuccess: () => refetchSteps(),
    onError: (e) => toast.error(e.message),
  });
  const reorderPipelineStepsMutation = trpc.discovery.reorderPipelineSteps.useMutation({
    onSuccess: () => refetchSteps(),
    onError: (e) => toast.error(e.message),
  });
  const createQuestionMutation = trpc.discovery.createQuestion.useMutation({
    onSuccess: () => { refetchQuestions(); setNewQuestion({ label: "", subLabel: "", mode: "both" }); },
  });
  const updateQuestionMutation = trpc.discovery.updateQuestion.useMutation({
    onSuccess: () => refetchQuestions(),
  });
  const deleteQuestionMutation = trpc.discovery.deleteQuestion.useMutation({
    onSuccess: () => refetchQuestions(),
  });
  const createResourceMutation = trpc.resources.create.useMutation({
    onSuccess: () => { refetchResources(); setAddResourceOpen(false); setNewResource({ name: "", specialty: "", phone: "", email: "", website: "", notes: "", category: "" }); },
  });
  const updateResourceMutation = trpc.resources.update.useMutation({
    onSuccess: () => { refetchResources(); setEditResourceId(null); },
  });
  const deleteResourceMutation = trpc.resources.delete.useMutation({
    onSuccess: () => refetchResources(),
  });
  const shareResourceMutation = trpc.resources.share.useMutation({
    onSuccess: (data) => {
      setResourceDialogOpen(false);
      toast.success(`Resource shared${data.emailSent ? " via email" : ""}${data.messageSent ? " and portal message" : ""}`);
    },
    onError: (e) => toast.error(e.message),
  });

  // Load session data into state
  useEffect(() => {
    if (!callSession) return;
    if (callSession.openingScript) setOpeningScript(callSession.openingScript);
    if (callSession.voicemailScript) setVoicemailScript(callSession.voicemailScript);
    if (callSession.callScriptNotes) setCallScriptNotes(callSession.callScriptNotes);
    if (callSession.theirStoryNotes) setTheirStoryNotes(callSession.theirStoryNotes);
    if (callSession.howItWorksNotes) setHowItWorksNotes(callSession.howItWorksNotes);
    if (callSession.pricingNotes) {
      try {
        const parsed = JSON.parse(callSession.pricingNotes);
        if (parsed && typeof parsed === "object") {
          if (parsed.studentCount) setStudentCount(Number(parsed.studentCount));
          if (parsed.selectedPlan) setSelectedPlan(String(parsed.selectedPlan));
          if (parsed.notes !== undefined) setPricingNotes(String(parsed.notes));
          if (parsed.planPublishedToPortal !== undefined) setPlanPublishedToPortal(Boolean(parsed.planPublishedToPortal));
          if (parsed.overridePortalDisplay !== undefined) setOverridePortalDisplay(Boolean(parsed.overridePortalDisplay));
          if (parsed.showAdvocacyOnlyInPortal !== undefined) setShowAdvocacyOnlyInPortal(Boolean(parsed.showAdvocacyOnlyInPortal));
          if (parsed.showComplaintsInPortal !== undefined) setShowComplaintsInPortal(Boolean(parsed.showComplaintsInPortal));
          if (parsed.spouseFollowUpChecklist && Array.isArray(parsed.spouseFollowUpChecklist)) setSpouseFollowUpChecklist(parsed.spouseFollowUpChecklist);
          if (parsed.lostReason) setLostReason(String(parsed.lostReason));
          if (parsed.lostFeedbackNotes) setLostFeedbackNotes(String(parsed.lostFeedbackNotes));
          if (parsed.lostNurtureOptions && Array.isArray(parsed.lostNurtureOptions)) setLostNurtureOptions(parsed.lostNurtureOptions);
        } else {
          setPricingNotes(callSession.pricingNotes);
        }
      } catch {
        setPricingNotes(callSession.pricingNotes);
      }
    }
    if (callSession.closingResponse) setClosingResponse(callSession.closingResponse);
    if (callSession.additionalNotes) setAdditionalNotes(callSession.additionalNotes);
    if (callSession.privateNotes) setPrivateNotes(callSession.privateNotes);
    if (callSession.currentStepId) setCurrentStepId(callSession.currentStepId);
    if (callSession.questionMode) setQuestionMode(callSession.questionMode as "IEP/504" | "General");
    if (callSession.nextStepsCompleted) {
      try { setNextStepsCompleted(JSON.parse(callSession.nextStepsCompleted)); } catch {}
    }
    if (callSession.lostStepsCompleted) {
      try { setLostStepsCompleted(JSON.parse(callSession.lostStepsCompleted)); } catch {}
    }
    if (callSession.questionNotes) {
      try { setQuestionNotes(JSON.parse(callSession.questionNotes)); } catch {}
    }
  }, [callSession]);

  // Load preliminary notes from client account
  useEffect(() => {
    if (preliminaryNote?.content) {
      setPreliminaryNotes(preliminaryNote.content);
    }
  }, [preliminaryNote?.id]);

  // Autosave
  const triggerSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaving(true);
      const encodedPricing = JSON.stringify({
        studentCount,
        selectedPlan,
        notes: pricingNotes,
        planPublishedToPortal,
        overridePortalDisplay,
        showAdvocacyOnlyInPortal,
        showComplaintsInPortal,
        spouseFollowUpChecklist,
        lostReason,
        lostFeedbackNotes,
        lostNurtureOptions,
      });
      saveMutation.mutate({
        leadId,
        openingScript,
        voicemailScript,
        callScriptNotes,
        theirStoryNotes,
        questionNotes: JSON.stringify(questionNotes),
        questionMode,
        howItWorksNotes,
        pricingNotes: encodedPricing,
        closingResponse,
        nextStepsCompleted: JSON.stringify(nextStepsCompleted),
        lostStepsCompleted: JSON.stringify(lostStepsCompleted),
        additionalNotes,
        privateNotes,
        currentStepId: currentStepId ?? undefined,
      });
    }, 1500);
  }, [leadId, openingScript, voicemailScript, callScriptNotes, theirStoryNotes, questionNotes, questionMode,
      howItWorksNotes, pricingNotes, studentCount, selectedPlan, closingResponse, planPublishedToPortal,
      overridePortalDisplay, showAdvocacyOnlyInPortal, showComplaintsInPortal, spouseFollowUpChecklist,
      lostReason, lostFeedbackNotes, lostNurtureOptions, nextStepsCompleted,
      lostStepsCompleted, additionalNotes, privateNotes, currentStepId]);

  // Sync notes to contact profile when additionalNotes or privateNotes change
  const syncNotesDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!lead?.contactId) return;
    if (!additionalNotes && !privateNotes) return;
    if (syncNotesDebounce.current) clearTimeout(syncNotesDebounce.current);
    syncNotesDebounce.current = setTimeout(() => {
      const combined = [
        additionalNotes ? `**Call Notes:**\n${additionalNotes}` : null,
        privateNotes ? `**Private Advocate Notes:**\n${privateNotes}` : null,
      ].filter(Boolean).join("\n\n");
      if (combined) {
        syncNotesMutation.mutate({
          leadId,
          contactId: lead.contactId!,
          notes: combined,
          label: "Discovery Call Notes",
        });
      }
    }, 3000);
  }, [additionalNotes, privateNotes, lead?.contactId]);

  const toggleSection = (n: number) =>
    setOpenSections((s) => ({ ...s, [n]: !s[n] }));

  const toggleNextStep = (key: string) => {
    setNextStepsCompleted((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
    triggerSave();
  };

  const toggleLostStep = (key: string) => {
    setLostStepsCompleted((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
    triggerSave();
  };

  const parentName = lead?.parentName || "Parent";
  const studentName = lead?.studentName || "Student";
  const studentGrade = lead?.studentGrade || "";
  const parentPhone = lead?.parentPhone || "";

  const filteredQuestions = questions?.filter(
    (q) => q.isActive && (q.mode === "both" || q.mode === questionMode)
  ) ?? [];

  const completedStepIds = steps
    ? steps.filter((s) => currentStepId && s.id <= currentStepId).map((s) => s.id)
    : [];

  // Resource categories
  const resourceCategories = Array.from(new Set(resources?.map((r) => r.category).filter(Boolean) ?? []));

  return (
    <div className="min-h-screen bg-[#071422] text-white">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-[#071422]/95 backdrop-blur border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/leads")}
            className="text-muted-foreground hover:text-white gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Leads
          </Button>
          <span className="text-white/30">|</span>
          <PhoneCall className="w-4 h-4 text-amber-400" />
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white tracking-tight">Discovery Call Process</span>
            <span className="rounded border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider text-amber-300">
              PG-003-DC
            </span>
          </div>

          {/* Discovery Call Process Settings Gear */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-slate-400 hover:text-amber-300 hover:bg-white/5 rounded-full ml-1"
                title="Discovery Call Process Settings"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="sr-only">Discovery Call Process Settings</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 bg-[#0d1f33] border-slate-700 text-slate-200 shadow-xl z-50">
              <DropdownMenuLabel className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5" /> Discovery Process Settings
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem
                onClick={() => setQuestionEditorOpen(true)}
                className="text-xs cursor-pointer hover:bg-slate-800 hover:text-white focus:bg-slate-800 focus:text-white"
              >
                <Edit2 className="w-3.5 h-3.5 mr-2 text-amber-400" /> Manage Question Bank
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setPipelineEditMode(!pipelineEditMode)}
                className="text-xs cursor-pointer hover:bg-slate-800 hover:text-white focus:bg-slate-800 focus:text-white"
              >
                <Sliders className="w-3.5 h-3.5 mr-2 text-blue-400" />
                {pipelineEditMode ? "Exit Pipeline Edit Mode" : "Configure Pipeline Steps"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setEditingVoicemailScript(true)}
                className="text-xs cursor-pointer hover:bg-slate-800 hover:text-white focus:bg-slate-800 focus:text-white"
              >
                <FileText className="w-3.5 h-3.5 mr-2 text-emerald-400" /> Edit Voicemail / Call Scripts
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem
                onClick={() => setLocation("/tools/worksheet-builder")}
                className="text-xs cursor-pointer hover:bg-slate-800 hover:text-white focus:bg-slate-800 focus:text-white"
              >
                <BookOpen className="w-3.5 h-3.5 mr-2 text-purple-400" /> Open Worksheet Studio (PG-010-WS)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-3">
          {saving && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Saving…</span>}
          {!saving && lastSaved && <span className="text-xs text-muted-foreground">Saved {lastSaved.toLocaleTimeString()}</span>}
          <Button
            size="sm"
            onClick={() => { setSaving(true); triggerSave(); }}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold gap-1"
          >
            <Save className="w-3 h-3" />
            Save
          </Button>
        </div>
      </div>

      {/* Lead header card */}
      <div className="px-6 pt-5 pb-4">
        <div className="rounded-xl bg-[#0d1f33] border border-white/10 p-5">
          <div className="flex flex-wrap items-start gap-6">
            {/* Avatar + name */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-xl font-bold flex-shrink-0">
                {parentName.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{parentName} <span className="text-white/50 text-sm font-normal">(Parent)</span></h1>
                <p className="text-sm text-amber-300 mt-0.5">
                  For: <span className="font-semibold">{studentName}</span>
                  {studentGrade && <span className="text-white/50"> · {studentGrade}</span>}
                </p>
                {lead?.source && <p className="text-xs text-white/40 mt-0.5">Referral: {lead.source}</p>}
              </div>
            </div>

            {/* Contact info */}
            <div className="flex flex-wrap gap-4 text-sm">
              {parentPhone && (
                <div className="flex items-center gap-2 text-white/70">
                  <Phone className="w-4 h-4 text-amber-400/70" />
                  <span>{parentPhone}</span>
                </div>
              )}
              {lead?.discoveryCallDate && (
                <div className="flex items-center gap-2 text-white/70">
                  <Calendar className="w-4 h-4 text-amber-400/70" />
                  <span>Scheduled: {new Date(lead.discoveryCallDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
              )}
            </div>

            {/* Status */}
            <div className="ml-auto flex items-center gap-3">
              <Select
                value={callSession?.status ?? "Preparing"}
                onValueChange={(v) => {
                  saveMutation.mutate({ leadId, status: v as any });
                }}
              >
                <SelectTrigger className="w-36 bg-[#071422] border-white/20 text-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Preparing", "In Progress", "Completed", "Lost"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Step tracker */}
      <div className="px-6 pb-4">
        <div className="rounded-xl bg-[#0d1f33] border border-white/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wide text-white/50">Pipeline Progress</span>
            <button
              onClick={() => { setPipelineEditMode((v) => !v); setEditingStepId(null); setAddingAfterStepId(null); }}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                pipelineEditMode ? "bg-amber-500 text-black font-semibold" : "bg-white/10 text-white/60 hover:bg-white/20"
              }`}
            >
              <Settings2 className="w-3 h-3" />
              {pipelineEditMode ? "Done Editing" : "Edit Steps"}
            </button>
          </div>

          {/* Normal view */}
          {!pipelineEditMode && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {steps?.map((step, i) => {
                const isCompleted = currentStepId !== null && step.id <= currentStepId;
                const isCurrent = step.id === currentStepId;
                return (
                  <div key={step.id} className="flex items-center gap-1 flex-shrink-0">
                    {i > 0 && (
                      <div className={`w-4 h-0.5 flex-shrink-0 ${isCompleted ? "bg-amber-400" : "bg-white/20"}`} />
                    )}
                    <button
                      onClick={() => { setCurrentStepId(step.id); triggerSave(); }}
                      title={`Mark "${step.label}" as current step`}
                      className="flex flex-col items-center gap-1 group transition-all"
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                        ${isCompleted ? "bg-amber-400 text-black" : "bg-white/10 text-white/50 hover:bg-white/20"}`}>
                        {isCompleted ? <Check className="w-3.5 h-3.5" /> : i + 1}
                      </div>
                      <span className={`text-[10px] text-center max-w-[64px] leading-tight
                        ${isCurrent ? "text-amber-400 font-semibold" : isCompleted ? "text-white/70" : "text-white/40"}`}>
                        {step.label}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Edit mode: list with rename, move, delete, add */}
          {pipelineEditMode && (
            <div className="space-y-1.5 mt-1">
              {steps?.map((step, i) => (
                <div key={step.id}>
                  <div className="flex items-center gap-2 bg-[#071422] rounded-lg px-3 py-2 border border-white/10">
                    {/* Move up/down */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        disabled={i === 0}
                        onClick={() => {
                          if (!steps || i === 0) return;
                          const newOrder = [...steps];
                          [newOrder[i - 1], newOrder[i]] = [newOrder[i], newOrder[i - 1]];
                          reorderPipelineStepsMutation.mutate({ orderedIds: newOrder.map((s) => s.id) });
                        }}
                        className="text-white/30 hover:text-white/70 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        title="Move up"
                      >
                        <ChevronRight className="w-3 h-3 -rotate-90" />
                      </button>
                      <button
                        disabled={i === (steps?.length ?? 0) - 1}
                        onClick={() => {
                          if (!steps || i === steps.length - 1) return;
                          const newOrder = [...steps];
                          [newOrder[i], newOrder[i + 1]] = [newOrder[i + 1], newOrder[i]];
                          reorderPipelineStepsMutation.mutate({ orderedIds: newOrder.map((s) => s.id) });
                        }}
                        className="text-white/30 hover:text-white/70 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        title="Move down"
                      >
                        <ChevronRight className="w-3 h-3 rotate-90" />
                      </button>
                    </div>

                    {/* Step number badge */}
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 text-white/50 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>

                    {/* Editable label */}
                    {editingStepId === step.id ? (
                      <input
                        autoFocus
                        value={editingStepLabel}
                        onChange={(e) => setEditingStepLabel(e.target.value)}
                        onBlur={() => {
                          if (editingStepLabel.trim()) updateStepMutation.mutate({ id: step.id, label: editingStepLabel.trim() });
                          else setEditingStepId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && editingStepLabel.trim()) updateStepMutation.mutate({ id: step.id, label: editingStepLabel.trim() });
                          if (e.key === "Escape") setEditingStepId(null);
                        }}
                        className="flex-1 text-sm bg-transparent border-b border-amber-400 text-white outline-none py-0.5"
                      />
                    ) : (
                      <span className="flex-1 text-sm text-white/80">{step.label}</span>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        onClick={() => { setEditingStepId(step.id); setEditingStepLabel(step.label); }}
                        className="text-white/40 hover:text-amber-400 transition-colors p-1"
                        title="Rename step"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setAddingAfterStepId(step.id)}
                        className="text-white/40 hover:text-green-400 transition-colors p-1"
                        title="Add step below"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          if (!confirm(`Delete step "${step.label}"?`)) return;
                          deletePipelineStepMutation.mutate({ id: step.id });
                        }}
                        className="text-white/40 hover:text-red-400 transition-colors p-1"
                        title="Delete step"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Inline add-step row after this step */}
                  {addingAfterStepId === step.id && (
                    <div className="flex items-center gap-2 mt-1 ml-6">
                      <input
                        autoFocus
                        value={newStepLabel}
                        onChange={(e) => setNewStepLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newStepLabel.trim()) {
                            createPipelineStepMutation.mutate({ label: newStepLabel.trim(), afterId: step.id });
                          }
                          if (e.key === "Escape") { setAddingAfterStepId(null); setNewStepLabel(""); }
                        }}
                        placeholder="New step name…"
                        className="flex-1 text-sm bg-[#071422] border border-green-400/50 rounded px-2 py-1 text-white outline-none placeholder:text-white/30"
                      />
                      <button
                        onClick={() => {
                          if (newStepLabel.trim()) createPipelineStepMutation.mutate({ label: newStepLabel.trim(), afterId: step.id });
                        }}
                        disabled={!newStepLabel.trim()}
                        className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded disabled:opacity-40"
                      >Add</button>
                      <button
                        onClick={() => { setAddingAfterStepId(null); setNewStepLabel(""); }}
                        className="text-white/40 hover:text-white/70"
                      ><X className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>
              ))}

              {/* Add step at end */}
              {addingAfterStepId === null && (
                <button
                  onClick={() => setAddingAfterStepId(-1)}
                  className="w-full flex items-center justify-center gap-1 text-xs text-white/40 hover:text-white/70 border border-dashed border-white/20 hover:border-white/40 rounded-lg py-2 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add step at end
                </button>
              )}
              {addingAfterStepId === -1 && (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={newStepLabel}
                    onChange={(e) => setNewStepLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newStepLabel.trim()) createPipelineStepMutation.mutate({ label: newStepLabel.trim() });
                      if (e.key === "Escape") { setAddingAfterStepId(null); setNewStepLabel(""); }
                    }}
                    placeholder="New step name…"
                    className="flex-1 text-sm bg-[#071422] border border-green-400/50 rounded px-2 py-1 text-white outline-none placeholder:text-white/30"
                  />
                  <button
                    onClick={() => { if (newStepLabel.trim()) createPipelineStepMutation.mutate({ label: newStepLabel.trim() }); }}
                    disabled={!newStepLabel.trim()}
                    className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded disabled:opacity-40"
                  >Add</button>
                  <button onClick={() => { setAddingAfterStepId(null); setNewStepLabel(""); }} className="text-white/40 hover:text-white/70">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {!pipelineEditMode && (
            <p className="text-[10px] text-white/30 mt-2">Click a step to mark it complete · Click "Edit Steps" to rename, reorder, add, or remove steps</p>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="px-6 pb-3 flex gap-2">
        <button
          onClick={() => setActiveTab("call")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === "call" ? "bg-amber-500 text-black" : "bg-white/10 text-white/60 hover:bg-white/20"}`}
        >
          <PhoneCall className="w-4 h-4 inline mr-1.5" />
          Call Guide
        </button>
        <button
          onClick={() => setActiveTab("resources")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === "resources" ? "bg-amber-500 text-black" : "bg-white/10 text-white/60 hover:bg-white/20"}`}
        >
          <BookOpen className="w-4 h-4 inline mr-1.5" />
          Resources
        </button>
      </div>

      {/* ===== CALL GUIDE TAB ===== */}
      {activeTab === "call" && (
        <div className="px-6 pb-10 grid grid-cols-1 gap-4">

          {/* Section 1: Call Script & Contact */}
          <div className="space-y-2">
            <SectionHeader number={1} title="Call Script & Contact" isOpen={openSections[1]} onToggle={() => toggleSection(1)} />
            {openSections[1] && (
              <div className="rounded-xl bg-[#0d1f33] border border-white/10 p-4 space-y-4">
                {/* Opening script */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">A. If They Answer – Opening Script</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingOpeningScript((v) => !v)}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                          editingOpeningScript ? "bg-amber-500 text-black font-semibold" : "bg-white/10 text-white/60 hover:bg-white/20"
                        }`}
                      >
                        <Edit2 className="w-3 h-3" />
                        {editingOpeningScript ? "Done" : "Edit"}
                      </button>
                      <CopyButton text={openingScript} />
                    </div>
                  </div>
                  {editingOpeningScript ? (
                    <Textarea
                      autoFocus
                      value={openingScript}
                      onChange={(e) => { setOpeningScript(e.target.value); triggerSave(); }}
                      className="bg-[#071422] border-amber-400/50 text-white text-sm resize-none leading-relaxed"
                      rows={6}
                    />
                  ) : (
                    <div className="bg-[#071422] rounded-lg p-3 text-sm text-white/80 leading-relaxed border border-white/5 whitespace-pre-wrap">
                      {openingScript}
                    </div>
                  )}
                </div>
                {/* Voicemail script */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white/50 uppercase tracking-wide">B. If No Answer – Voicemail Script</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingVoicemailScript((v) => !v)}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                          editingVoicemailScript ? "bg-amber-500 text-black font-semibold" : "bg-white/10 text-white/60 hover:bg-white/20"
                        }`}
                      >
                        <Edit2 className="w-3 h-3" />
                        {editingVoicemailScript ? "Done" : "Edit"}
                      </button>
                      <CopyButton text={voicemailScript} />
                    </div>
                  </div>
                  {editingVoicemailScript ? (
                    <Textarea
                      autoFocus
                      value={voicemailScript}
                      onChange={(e) => { setVoicemailScript(e.target.value); triggerSave(); }}
                      className="bg-[#071422] border-amber-400/50 text-white text-sm resize-none leading-relaxed"
                      rows={4}
                    />
                  ) : (
                    <div className="bg-[#071422] rounded-lg p-3 text-sm text-white/60 leading-relaxed border border-white/5 whitespace-pre-wrap">
                      {voicemailScript}
                    </div>
                  )}
                </div>
                {/* Pro tip */}
                <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <Star className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-200">Pro Tip: Personalize with parent and student names when available. Speak slowly and warmly.</p>
                </div>
                {/* Notes */}
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Notes from this section</label>
                  <Textarea
                    value={callScriptNotes}
                    onChange={(e) => { setCallScriptNotes(e.target.value); triggerSave(); }}
                    placeholder="Take notes here..."
                    className="bg-[#071422] border-white/10 text-white placeholder:text-white/30 text-sm resize-none"
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Let's Begin – Their Story */}
          <div className="space-y-2">
            <SectionHeader number={2} title="Let's Begin – Their Story" isOpen={openSections[2]} onToggle={() => toggleSection(2)} />
            {openSections[2] && (
              <div className="rounded-xl bg-[#0d1f33] border border-white/10 p-4 space-y-3">
                <p className="text-sm text-white/70">Let's begin with your story and where you're at so I can make sure we are the right help for you.</p>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Notes</label>
                  <Textarea
                    value={theirStoryNotes}
                    onChange={(e) => { setTheirStoryNotes(e.target.value); triggerSave(); }}
                    placeholder="Take notes here..."
                    className="bg-[#071422] border-white/10 text-white placeholder:text-white/30 text-sm resize-none"
                    rows={6}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Discovery Questions */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <SectionHeader number={3} title="Discovery Questions" isOpen={openSections[3]} onToggle={() => toggleSection(3)} />
              </div>
              <button
                onClick={() => setQuestionEditorOpen(true)}
                className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors px-2 py-1"
                title="Edit questions"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Edit Questions
              </button>
            </div>
            {openSections[3] && (
              <div className="rounded-xl bg-[#0d1f33] border border-white/10 p-4 space-y-3">
                {/* Mode toggle */}
                <div className="flex gap-2">
                  {(["IEP/504", "General"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => { setQuestionMode(mode); triggerSave(); }}
                      className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${questionMode === mode ? "bg-blue-600 text-white" : "bg-white/10 text-white/50 hover:bg-white/20"}`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                {/* Questions */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredQuestions.map((q) => (
                    <div key={q.id} className="bg-[#071422] rounded-lg border border-white/5 overflow-hidden">
                      <button
                        onClick={() => setExpandedQuestions((s) => ({ ...s, [q.id]: !s[q.id] }))}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors"
                      >
                        <div className="text-left">
                          <p className="text-sm font-semibold text-white">{q.label}</p>
                          {q.subLabel && <p className="text-xs text-white/40 mt-0.5">{q.subLabel}</p>}
                        </div>
                        {expandedQuestions[q.id] ? (
                          <ChevronDown className="w-4 h-4 text-white/40 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0" />
                        )}
                      </button>
                      {expandedQuestions[q.id] && (
                        <div className="px-3 pb-3">
                          <Textarea
                            value={questionNotes[q.id] ?? ""}
                            onChange={(e) => {
                              setQuestionNotes((n) => ({ ...n, [q.id]: e.target.value }));
                              triggerSave();
                            }}
                            placeholder="Notes for this question..."
                            className="bg-[#0d1f33] border-white/10 text-white placeholder:text-white/30 text-xs resize-none"
                            rows={3}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const allOpen = filteredQuestions.reduce((acc, q) => ({ ...acc, [q.id]: true }), {});
                    setExpandedQuestions(allOpen);
                  }}
                  className="text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  Expand all questions
                </button>
                <div className="border-t border-white/10 pt-3 mt-3">
                  <p className="text-xs font-semibold text-white/60 mb-2">Preliminary Notes</p>
                  <Textarea
                    value={preliminaryNotes}
                    onChange={(e) => {
                      setPreliminaryNotes(e.target.value);
                      if (saveTimer.current) clearTimeout(saveTimer.current);
                      saveTimer.current = setTimeout(() => {
                        if (preliminaryNotes) {
                          setSaving(true);
                          updatePreliminaryNoteMutation.mutate(
                            { projectId: leadId, content: e.target.value },
                            { onSuccess: () => { setSaving(false); setLastSaved(new Date()); } }
                          );
                        }
                      }, 500);
                    }}
                    placeholder="Advocate-only notes (syncs with client profile)..."
                    className="bg-[#071422] border-white/10 text-white placeholder:text-white/30 text-sm resize-none"
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 4: How Does This Work? */}
          <div className="space-y-2">
            <SectionHeader number={4} title="How Does This Work?" isOpen={openSections[4]} onToggle={() => toggleSection(4)} />
            {openSections[4] && (
              <div className="rounded-xl bg-[#0d1f33] border border-white/10 p-4 space-y-3">
                <div className="space-y-2 text-sm text-white/80">
                  {[
                    "I attend all meetings remotely. You never have to go it alone.",
                    "Our rate includes no surprises. If we have 4 meetings in a month, the price stays the same.",
                    "We handle the preparation, the meetings, the follow-up, and the communication.",
                    "You focus on your child — we handle the rest.",
                  ].map((point, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Notes</label>
                  <Textarea
                    value={howItWorksNotes}
                    onChange={(e) => { setHowItWorksNotes(e.target.value); triggerSave(); }}
                    placeholder="Take notes here..."
                    className="bg-[#071422] border-white/10 text-white placeholder:text-white/30 text-sm resize-none"
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Our Difference, Pricing & Next Steps */}
          <div className="space-y-2">
            <SectionHeader number={5} title="Our Difference, Pricing & Next Steps" isOpen={openSections[5]} onToggle={() => toggleSection(5)} />
            {openSections[5] && (
              <div className="rounded-xl bg-[#0d1f33] border border-white/10 p-5 space-y-6">
                {/* Value bullet points */}
                <div className="space-y-2 text-sm text-white/80">
                  {[
                    "Most advocates charge by the hour and commonly run $4,000–$5,000+ per year.",
                    "We've been there, done that.",
                    "We believe advocacy should be accessible, predictable, and transparent for every family.",
                    "We took that price, chopped it up, and brought flat monthly membership plans:",
                  ].map((point, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>

                {/* 1. Student Count Selector */}
                <div className="bg-[#071422] border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-white uppercase tracking-wider">1. Number of Students to Enroll</p>
                      <p className="text-[11px] text-white/50">Select how many students will be covered under this advocacy agreement</p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 self-start sm:self-auto">
                      {studentCount} {studentCount === 1 ? "Student" : "Students"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => {
                          setStudentCount(count);
                          triggerSave();
                        }}
                        className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                          studentCount === count
                            ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm shadow-amber-500/10"
                            : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <User className="w-3.5 h-3.5" />
                        {count === 4 ? "4+ Students" : `${count} ${count === 1 ? "Student" : "Students"}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Selectable Plans */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <p className="text-xs font-bold text-white uppercase tracking-wider">2. Select Advocacy Membership Plan</p>
                    <p className="text-[11px] text-white/50">Click to select the plan recommended for this client</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Plan A: $55/mo Advocacy Only */}
                    <div
                      onClick={() => {
                        setSelectedPlan("advocacy_55");
                        triggerSave();
                      }}
                      className={`cursor-pointer rounded-xl border p-4 transition-all flex flex-col justify-between space-y-3 relative ${
                        selectedPlan === "advocacy_55"
                          ? "bg-amber-500/10 border-amber-400 ring-1 ring-amber-400/50 shadow-lg shadow-amber-500/10"
                          : "bg-[#071422] border-white/10 hover:border-white/20 text-white/80"
                      }`}
                    >
                      {selectedPlan === "advocacy_55" && (
                        <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-sm">
                          <Check className="w-3 h-3" /> Selected Plan
                        </span>
                      )}
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-bold text-amber-300">
                            ${55 * studentCount}
                          </span>
                          <span className="text-xs text-white/60">/ month</span>
                          {studentCount > 1 && (
                            <span className="text-[11px] text-amber-400/70 ml-1">($55/mo × {studentCount})</span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1">Advocacy Only</h4>
                        <p className="text-xs text-amber-300/80 font-medium">$55 per month · All fees included · Advocacy only</p>
                        <p className="text-xs text-white/60 mt-2 leading-relaxed">
                          Year-round special education IEP advocacy representation, IEP meeting strategy & attendance, document & evaluation review, and direct advocate communications.
                        </p>
                      </div>
                      <div className="pt-2 border-t border-white/5 text-[11px] text-white/50 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" /> Cancel anytime · All fees included
                      </div>
                    </div>

                    {/* Plan B: $100/mo State Complaints Included */}
                    <div
                      onClick={() => {
                        setSelectedPlan("complaints_100");
                        triggerSave();
                      }}
                      className={`cursor-pointer rounded-xl border p-4 transition-all flex flex-col justify-between space-y-3 relative ${
                        selectedPlan === "complaints_100"
                          ? "bg-amber-500/10 border-amber-400 ring-1 ring-amber-400/50 shadow-lg shadow-amber-500/10"
                          : "bg-[#071422] border-white/10 hover:border-white/20 text-white/80"
                      }`}
                    >
                      {selectedPlan === "complaints_100" && (
                        <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-sm">
                          <Check className="w-3 h-3" /> Selected Plan
                        </span>
                      )}
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-bold text-amber-300">
                            ${100 * studentCount}
                          </span>
                          <span className="text-xs text-white/60">/ month</span>
                          {studentCount > 1 && (
                            <span className="text-[11px] text-amber-400/70 ml-1">($100/mo × {studentCount})</span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1">Advocacy + State Complaints</h4>
                        <p className="text-xs text-amber-300/80 font-medium">$100 per month · Includes state complaints at no extra cost</p>
                        <p className="text-xs text-white/60 mt-2 leading-relaxed">
                          Complete advocacy representation plus full drafting, legal citation indexing, and filing of Georgia IDEA State Complaints without separate legal drafting fees.
                        </p>
                      </div>
                      <div className="pt-2 border-t border-white/5 text-[11px] text-white/50 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" /> Includes State Complaints at no extra cost ($1,500+ value)
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. The Question & Response */}
                <div className="bg-[#071422] border border-white/10 rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-xs font-bold text-white uppercase tracking-wider">3. The Question</p>
                    <p className="text-sm text-amber-300/90 italic mt-1">"Does that sound like something you would be interested in?"</p>
                  </div>
                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] font-bold text-white/50 uppercase tracking-wide">Client Response</p>
                    {[
                      { value: "Yes", color: "emerald", label: "Yes, I'm interested" },
                      { value: "Think about it", color: "amber", label: "I need to think about it or discuss with spouse" },
                      { value: "Not right now", color: "red", label: "Not right now" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setClosingResponse(opt.value); triggerSave(); }}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all text-sm font-medium
                          ${closingResponse === opt.value
                            ? opt.color === "emerald" ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                              : opt.color === "amber" ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                              : "bg-red-500/20 border-red-500/50 text-red-300"
                            : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"}`}
                      >
                        {closingResponse === opt.value ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Next Steps & Dynamic Action Workflow */}
                {closingResponse === "Yes" && (
                  <div className="bg-[#071422] border border-emerald-500/40 rounded-xl p-5 space-y-4 shadow-lg shadow-emerald-950/30">
                    <div className="border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <p className="text-xs font-bold text-white uppercase tracking-wider">
                          4. Next Steps & Publish Plan to Client Portal
                        </p>
                      </div>
                      <p className="text-[11px] text-emerald-300/80 mt-0.5">
                        Client is ready! Publish the selected plan to {parentName}'s portal for purchase processing & agreement execution.
                      </p>
                    </div>

                    {/* Publish Plan to Portal Card */}
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-white">
                            {selectedPlan === "advocacy_55" ? "Advocacy Only Plan" : "Advocacy + State Complaints Plan"}
                          </span>
                          <span className="text-xs font-mono font-bold text-amber-300">
                            ${(selectedPlan === "advocacy_55" ? 55 : 100) * studentCount}/mo
                          </span>
                          <span className="text-[10px] text-white/50">
                            ({studentCount} {studentCount === 1 ? "Student" : "Students"})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Target Portal: <span className="text-white font-medium">{parentName}</span>
                          {studentName && ` (Student: ${studentName})`}
                        </p>
                      </div>

                      {planPublishedToPortal ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Published to Portal
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPlanPublishedToPortal(false);
                              triggerSave();
                            }}
                            className="text-[10px] text-slate-400 hover:text-white h-7 px-2"
                          >
                            Update
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => {
                            setPlanPublishedToPortal(true);
                            triggerSave();
                            toast.success(`Published ${selectedPlan === "advocacy_55" ? "$55/mo Advocacy Only" : "$100/mo Advocacy + State Complaints"} plan to ${parentName}'s client portal!`);
                          }}
                          className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs gap-1.5 shadow-md shadow-amber-500/20"
                        >
                          <Send className="w-3.5 h-3.5" /> Publish Plan to {parentName}'s Portal
                        </Button>
                      )}
                    </div>

                    <Button
                      onClick={() => {
                        saveMutation.mutate({ leadId, status: "Completed" });
                        toast.success("Lead moved to Won / Active Client!");
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 shadow-lg"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> Move to Won / Active Client
                    </Button>
                  </div>
                )}

                {/* Case 2: Think about it / Spouse review */}
                {closingResponse === "Think about it" && (
                  <div className="bg-[#071422] border border-amber-500/40 rounded-xl p-5 space-y-4 shadow-lg shadow-amber-950/30">
                    <div className="border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-amber-400" />
                        <p className="text-xs font-bold text-white uppercase tracking-wider">
                          4. Portal Plan Visibility & Spouse Review Rules
                        </p>
                      </div>
                      <p className="text-[11px] text-amber-300/80 mt-0.5">
                        Client is reviewing with spouse. Configure portal display rules and plan visibility for {parentName}.
                      </p>
                    </div>

                    {/* Notice & Defined Rules */}
                    <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-3.5 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
                        <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        Notice & Defined Rules for Portal Display
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        By default, when <strong className="text-white">{parentName}</strong> logs into the client portal to review options with their spouse, the portal displays both membership options calculated for <strong className="text-amber-300">{studentCount} {studentCount === 1 ? "student" : "students"}</strong> (${55 * studentCount}/mo and ${100 * studentCount}/mo) alongside a comparison breakdown.
                      </p>
                    </div>

                    {/* Override Checkbox & Plan Options */}
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3.5 space-y-3">
                      <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-white">
                        <input
                          type="checkbox"
                          checked={overridePortalDisplay}
                          onChange={(e) => {
                            setOverridePortalDisplay(e.target.checked);
                            triggerSave();
                          }}
                          className="rounded border-slate-600 text-amber-500 focus:ring-amber-400 h-4 w-4 bg-slate-900 cursor-pointer"
                        />
                        <span>Override Portal Display Rules for this Client</span>
                      </label>

                      {overridePortalDisplay ? (
                        <div className="pt-2 pl-6 border-t border-white/5 space-y-2">
                          <p className="text-[11px] text-amber-300/80 font-medium">
                            Select which plan(s) to make visible on {parentName}'s portal:
                          </p>
                          <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80 hover:text-white">
                            <input
                              type="checkbox"
                              checked={showAdvocacyOnlyInPortal}
                              onChange={(e) => {
                                setShowAdvocacyOnlyInPortal(e.target.checked);
                                triggerSave();
                              }}
                              className="rounded border-slate-600 text-amber-500 h-4 w-4 bg-slate-900 cursor-pointer"
                            />
                            <span>Show $55/mo Advocacy Only Plan (${55 * studentCount}/mo)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80 hover:text-white">
                            <input
                              type="checkbox"
                              checked={showComplaintsInPortal}
                              onChange={(e) => {
                                setShowComplaintsInPortal(e.target.checked);
                                triggerSave();
                              }}
                              className="rounded border-slate-600 text-amber-500 h-4 w-4 bg-slate-900 cursor-pointer"
                            />
                            <span>Show $100/mo Advocacy + State Complaints Plan (${100 * studentCount}/mo)</span>
                          </label>
                        </div>
                      ) : (
                        <p className="text-[11px] text-white/40 pl-6">
                          Standard rules active: Both plans visible in portal with spouse comparison matrix.
                        </p>
                      )}
                    </div>

                    {/* Follow-up Checklist for Spouse Review */}
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-white/60 uppercase tracking-wide">Spouse Review Follow-Up Actions</p>
                      {[
                        { key: "email_summary", label: `Email plan comparison summary to ${parentName} & spouse` },
                        { key: "portal_link", label: "Send direct parent portal access link" },
                        { key: "schedule_checkin", label: "Schedule 48-hour follow-up call" },
                        { key: "pipeline_reminder", label: "Set task reminder on advocate calendar" },
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setSpouseFollowUpChecklist((prev) =>
                              prev.includes(item.key) ? prev.filter((k) => k !== item.key) : [...prev, item.key]
                            );
                            triggerSave();
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm
                            ${spouseFollowUpChecklist.includes(item.key)
                              ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                              : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"}`}
                        >
                          {spouseFollowUpChecklist.includes(item.key) ? <CheckCircle2 className="w-4 h-4 text-amber-400" /> : <Circle className="w-4 h-4" />}
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <Button
                      onClick={() => {
                        triggerSave();
                        toast.success("Saved portal display rules & queued follow-up!");
                      }}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2.5 mt-2"
                    >
                      <Save className="w-3.5 h-3.5 mr-1.5" /> Save Portal Rules & Queue Follow-Up
                    </Button>
                  </div>
                )}

                {/* Case 3: Not right now / Lost */}
                {closingResponse === "Not right now" && (
                  <div className="bg-[#071422] border border-red-500/40 rounded-xl p-5 space-y-4 shadow-lg shadow-red-950/30">
                    <div className="border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <p className="text-xs font-bold text-white uppercase tracking-wider">
                          4. Collect Feedback & Move Client to Lost Position
                        </p>
                      </div>
                      <p className="text-[11px] text-red-300/80 mt-0.5">
                        Capture feedback on why the client is declining and update lead status.
                      </p>
                    </div>

                    {/* Reason for Declining */}
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-white/60 uppercase tracking-wide">Primary Reason for Declining</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          "Budget / Price",
                          "Timing / Later Date",
                          "Handling Independently",
                          "Hired Other Advocate",
                          "School Resolved Issue",
                          "Other",
                        ].map((reason) => (
                          <button
                            key={reason}
                            type="button"
                            onClick={() => {
                              setLostReason(reason);
                              triggerSave();
                            }}
                            className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all text-left ${
                              lostReason === reason
                                ? "bg-red-500/20 border-red-400 text-red-300 shadow-sm"
                                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            {lostReason === reason ? "✓ " : ""}{reason}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Feedback Notes */}
                    <div className="space-y-1">
                      <label className="text-xs text-white/60 font-medium">Feedback Details & Client Objections</label>
                      <Textarea
                        value={lostFeedbackNotes}
                        onChange={(e) => {
                          setLostFeedbackNotes(e.target.value);
                          triggerSave();
                        }}
                        placeholder="Collect specific feedback on why the family is declining advocacy at this time..."
                        className="bg-[#0A1628] border-white/10 text-white placeholder:text-white/30 text-xs resize-none"
                        rows={3}
                      />
                    </div>

                    {/* Nurture & Closing Options */}
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-white/60 uppercase tracking-wide">Follow-Up & Archive Actions</p>
                      {[
                        { key: "send_free_guide", label: `Send Free IEP Checklist & Rights Guide to ${parentName}` },
                        { key: "nurture_list", label: "Keep on Monthly Advocacy Newsletter / Nurture List" },
                        { key: "six_month_check", label: "Schedule 6-Month Fall/Spring IEP Check-In" },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => {
                            setLostNurtureOptions((prev) =>
                              prev.includes(opt.key) ? prev.filter((k) => k !== opt.key) : [...prev, opt.key]
                            );
                            triggerSave();
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm
                            ${lostNurtureOptions.includes(opt.key)
                              ? "bg-red-500/20 border-red-500/40 text-red-300"
                              : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"}`}
                        >
                          {lostNurtureOptions.includes(opt.key) ? <CheckCircle2 className="w-4 h-4 text-red-400" /> : <Circle className="w-4 h-4" />}
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    <Button
                      onClick={() => {
                        saveMutation.mutate({ leadId, status: "Lost" });
                        toast.info("Feedback recorded and lead moved to Lost position.");
                      }}
                      className="w-full bg-red-700 hover:bg-red-800 text-white font-semibold text-xs py-2.5 mt-2"
                    >
                      <X className="w-4 h-4 mr-1.5" /> Record Feedback & Move to Lost Position
                    </Button>
                  </div>
                )}

                {/* Case 4: No selection yet */}
                {!closingResponse && (
                  <div className="bg-[#071422] border border-dashed border-white/15 rounded-xl p-6 text-center space-y-1">
                    <p className="text-xs font-bold text-white/70">4. Next Steps & Onboarding Workflow</p>
                    <p className="text-[11px] text-white/40">
                      Select the client's response in <strong>3. The Question</strong> above to load the appropriate next steps (Publish Plan to Portal, Spouse Review Rules, or Feedback & Lost).
                    </p>
                  </div>
                )}

                <div className="space-y-1 text-xs text-white/70 pt-1">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /><span>No surprises. Ever.</span></div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /><span>Cancel anytime with 30 days notice.</span></div>
                </div>

                <div>
                  <label className="text-xs text-white/50 mb-1 block">Pricing & Closing Discussion Notes</label>
                  <Textarea
                    value={pricingNotes}
                    onChange={(e) => { setPricingNotes(e.target.value); triggerSave(); }}
                    placeholder="Take notes on client budget preferences, student needs, payment schedule..."
                    className="bg-[#071422] border-white/10 text-white placeholder:text-white/30 text-sm resize-none"
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 6: Additional Notes */}
          <div className="space-y-2">
            <SectionHeader number={6} title="Additional Notes" isOpen={openSections[6]} onToggle={() => toggleSection(6)} />
            {openSections[6] && (
              <div className="rounded-xl bg-[#0d1f33] border border-white/10 p-4 space-y-3">
                <p className="text-xs text-white/40">These notes auto-save to the client profile (advocate-only).</p>
                <Textarea
                  value={additionalNotes}
                  onChange={(e) => { setAdditionalNotes(e.target.value); triggerSave(); }}
                  placeholder="Add notes from their responses..."
                  className="bg-[#071422] border-white/10 text-white placeholder:text-white/30 text-sm resize-none"
                  rows={6}
                />
              </div>
            )}
          </div>

          {/* Section 7: Private Advocate Notes */}
          <div className="space-y-2">
            <SectionHeader number={7} title="Private Advocate Notes" isOpen={openSections[7]} onToggle={() => toggleSection(7)} badge="Advocate Only" />
            {openSections[7] && (
              <div className="rounded-xl bg-[#0d1f33] border border-white/10 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs text-amber-300/70">
                  <Lock className="w-3.5 h-3.5" />
                  <span>These notes are private and only visible to advocates. Auto-saved to client profile.</span>
                </div>
                <Textarea
                  value={privateNotes}
                  onChange={(e) => { setPrivateNotes(e.target.value); triggerSave(); }}
                  placeholder="Add private notes..."
                  className="bg-[#071422] border-white/10 text-white placeholder:text-white/30 text-sm resize-none"
                  rows={6}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== RESOURCES TAB ===== */}
      {activeTab === "resources" && (
        <div className="px-6 pb-10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Resources Directory</h2>
            <Button
              onClick={() => setAddResourceOpen(true)}
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Resource
            </Button>
          </div>

          {!resources || resources.length === 0 ? (
            <div className="rounded-xl bg-[#0d1f33] border border-white/10 p-8 text-center">
              <BookOpen className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-white/50">No resources yet. Add lawyers, therapists, or other contacts to share with families.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {resources.map((r) => (
                <div key={r.id} className="rounded-xl bg-[#0d1f33] border border-white/10 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-white">{r.name}</h3>
                      {r.specialty && <p className="text-xs text-amber-300 mt-0.5">{r.specialty}</p>}
                      {r.category && <Badge className="mt-1 bg-blue-500/20 text-blue-300 text-xs border-0">{r.category}</Badge>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditResourceId(r.id)} className="text-white/30 hover:text-white/70 transition-colors p-1">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { if (confirm("Delete this resource?")) deleteResourceMutation.mutate({ id: r.id }); }} className="text-white/30 hover:text-red-400 transition-colors p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-white/60">
                    {r.phone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{r.phone}</div>}
                    {r.email && <div className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{r.email}</div>}
                    {r.website && <div className="flex items-center gap-1.5"><Globe className="w-3 h-3" /><a href={r.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate">{r.website}</a></div>}
                    {r.notes && <p className="text-white/40 mt-1">{r.notes}</p>}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setShareResourceId(r.id);
                      setShareContactId(lead?.contactId ?? null);
                      setShareMessage("");
                      setResourceDialogOpen(true);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1"
                  >
                    <Send className="w-3 h-3" />
                    Share with Family
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== DIALOGS ===== */}

      {/* Share Resource Dialog */}
      <Dialog open={resourceDialogOpen} onOpenChange={setResourceDialogOpen}>
        <DialogContent className="bg-[#0d1f33] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Share Resource with Family</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Select Contact to Share With</label>
              <Select value={shareContactId?.toString() ?? ""} onValueChange={(v) => setShareContactId(parseInt(v))}>
                <SelectTrigger className="bg-[#071422] border-white/20 text-white">
                  <SelectValue placeholder="Select a contact..." />
                </SelectTrigger>
                <SelectContent>
                  {contacts?.filter((c) => c.portalUserId || c.email).map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.firstName} {c.lastName} {c.email ? `(${c.email})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Optional Message</label>
              <Textarea
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                placeholder="Add a personal note to accompany the resource..."
                className="bg-[#071422] border-white/10 text-white placeholder:text-white/30 text-sm resize-none"
                rows={3}
              />
            </div>
            <p className="text-xs text-white/40">This will send an email to the contact and post a message to their client portal.</p>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (!shareResourceId || !shareContactId) return;
                  shareResourceMutation.mutate({ resourceId: shareResourceId, contactId: shareContactId, message: shareMessage });
                }}
                disabled={!shareContactId || shareResourceMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {shareResourceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-1" />Send</>}
              </Button>
              <Button variant="outline" onClick={() => setResourceDialogOpen(false)} className="border-white/20 text-white">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Resource Dialog */}
      <Dialog open={addResourceOpen || editResourceId !== null} onOpenChange={(o) => { if (!o) { setAddResourceOpen(false); setEditResourceId(null); } }}>
        <DialogContent className="bg-[#0d1f33] border-white/10 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editResourceId ? "Edit Resource" : "Add Resource"}</DialogTitle>
          </DialogHeader>
          <ResourceForm
            initial={editResourceId ? resources?.find((r) => r.id === editResourceId) : undefined}
            onSave={(data) => {
              if (editResourceId) {
                updateResourceMutation.mutate({ id: editResourceId, ...data });
              } else {
                createResourceMutation.mutate(data);
              }
            }}
            onCancel={() => { setAddResourceOpen(false); setEditResourceId(null); }}
            isPending={createResourceMutation.isPending || updateResourceMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Question Editor Dialog */}
      <Dialog open={questionEditorOpen} onOpenChange={setQuestionEditorOpen}>
        <DialogContent className="bg-[#0d1f33] border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Discovery Questions</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {questions?.map((q) => (
              <div key={q.id} className="flex items-start gap-2 bg-[#071422] rounded-lg p-3 border border-white/5">
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-semibold text-white">{q.label}</p>
                  {q.subLabel && <p className="text-xs text-white/40">{q.subLabel}</p>}
                  <Badge className="text-xs bg-blue-500/20 text-blue-300 border-0">{q.mode}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuestionMutation.mutate({ id: q.id, isActive: !q.isActive })}
                    className={`text-xs px-2 py-1 rounded transition-colors ${q.isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/40"}`}
                  >
                    {q.isActive ? "Active" : "Hidden"}
                  </button>
                  <button
                    onClick={() => { if (confirm("Delete this question?")) deleteQuestionMutation.mutate({ id: q.id }); }}
                    className="text-white/30 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {/* Add new question */}
            <div className="bg-[#071422] rounded-lg p-3 border border-amber-500/20 space-y-2">
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wide">Add New Question</p>
              <Input
                value={newQuestion.label}
                onChange={(e) => setNewQuestion((q) => ({ ...q, label: e.target.value }))}
                placeholder="Question label (e.g. Current Situation)"
                className="bg-[#0d1f33] border-white/10 text-white placeholder:text-white/30 text-sm"
              />
              <Input
                value={newQuestion.subLabel}
                onChange={(e) => setNewQuestion((q) => ({ ...q, subLabel: e.target.value }))}
                placeholder="Sub-label (e.g. What's going on right now?)"
                className="bg-[#0d1f33] border-white/10 text-white placeholder:text-white/30 text-sm"
              />
              <Select value={newQuestion.mode} onValueChange={(v) => setNewQuestion((q) => ({ ...q, mode: v }))}>
                <SelectTrigger className="bg-[#0d1f33] border-white/10 text-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Both (IEP/504 & General)</SelectItem>
                  <SelectItem value="IEP/504">IEP/504 only</SelectItem>
                  <SelectItem value="General">General only</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => {
                  if (!newQuestion.label.trim()) return;
                  createQuestionMutation.mutate(newQuestion);
                }}
                disabled={!newQuestion.label.trim() || createQuestionMutation.isPending}
                size="sm"
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Question
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Resource form sub-component
function ResourceForm({
  initial,
  onSave,
  onCancel,
  isPending,
}: {
  initial?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    specialty: initial?.specialty ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    website: initial?.website ?? "",
    address: initial?.address ?? "",
    notes: initial?.notes ?? "",
    category: initial?.category ?? "",
  });
  return (
    <div className="space-y-3">
      {[
        { key: "name", label: "Name *", placeholder: "Dr. Jane Smith" },
        { key: "specialty", label: "Specialty", placeholder: "Speech-Language Pathology" },
        { key: "category", label: "Category", placeholder: "Speech Therapy, Attorney, OT..." },
        { key: "phone", label: "Phone", placeholder: "(555) 000-0000" },
        { key: "email", label: "Email", placeholder: "contact@example.com" },
        { key: "website", label: "Website", placeholder: "https://example.com" },
        { key: "address", label: "Address", placeholder: "123 Main St, City, State" },
      ].map(({ key, label, placeholder }) => (
        <div key={key} className="space-y-1">
          <label className="text-xs font-semibold text-white/70">{label}</label>
          <Input
            value={(form as any)[key]}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            placeholder={placeholder}
            className="bg-[#071422] border-white/10 text-white placeholder:text-white/30 text-sm"
          />
        </div>
      ))}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-white/70">Notes</label>
        <Textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Any notes about this resource..."
          className="bg-[#071422] border-white/10 text-white placeholder:text-white/30 text-sm resize-none"
          rows={3}
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button
          onClick={() => onSave(form)}
          disabled={!form.name.trim() || isPending}
          className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Resource"}
        </Button>
        <Button variant="outline" onClick={onCancel} className="border-white/20 text-white">Cancel</Button>
      </div>
    </div>
  );
}
