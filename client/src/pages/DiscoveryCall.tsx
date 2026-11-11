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
  Zap, Scale, Radio, Compass,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import DiscoveryHeader from "@/components/discovery/DiscoveryHeader";
import DiscoverySectionHeader from "@/components/discovery/DiscoverySectionHeader";
import { FamilyEnrollmentApprovalModal } from "@/components/enrollment/FamilyEnrollmentApprovalModal";


interface DiscoveryCallPageProps {
  leadId: number;
  embedded?: boolean;
  onCallCompleted?: (data?: any) => void;
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
      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-[#051022] border border-[#2A4268] text-[#FFE394] hover:border-[#C5A059] hover:text-[#FFF5DA] transition-colors cursor-pointer"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-[#E5C168]" />}
      {copied ? "Copied" : "Copy Script"}
    </button>
  );
}

export default function DiscoveryCall({
  leadId,
  embedded = false,
  onCallCompleted,
}: DiscoveryCallPageProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Section open/close state (7 total sections)
  const [openSections, setOpenSections] = useState<Record<number | string, boolean>>({
    1: true, 2: false, 3: false, 4: false, 5: false,
    6: false, 7: false,
  });

  // Active tab: "call" | "resources"
  const [activeTab, setActiveTab] = useState<"call" | "resources">("call");
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState<boolean>(false);


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
  const { data: servicesCatalog = [] } = trpc.services.list.useQuery(undefined, { enabled: !!user });
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

  const parentName = lead?.parentName || lead?.name || "Eleanor Vance";
  const studentName = lead?.studentName || "Leo";
  const studentGrade = lead?.studentGrade || "Grade 4";
  const parentPhone = lead?.parentPhone || "(404) 555-0192";
  const familyInitials = parentName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "EV";

  const filteredQuestions = questions?.filter(
    (q) => q.isActive && (q.mode === "both" || q.mode === questionMode)
  ) ?? [];

  const completedStepIds = steps
    ? steps.filter((s) => currentStepId && s.id <= currentStepId).map((s) => s.id)
    : [];

  // Resource categories
  const resourceCategories = Array.from(new Set(resources?.map((r) => r.category).filter(Boolean) ?? []));

  const dialFamilyPhone = () => {
    const clean = parentPhone.replace(/\D/g, "");
    const formatted = clean.length === 10 ? `+1${clean}` : `+${clean}`;
    try {
      window.location.href = `openphone://call?number=${formatted}`;
    } catch {}
    toast.success(`Keying mic to dial ${parentName} (${parentPhone})...`);
  };

  return (
    <div
      className={
        embedded
          ? "w-full space-y-5 text-[#F5ECD9] pb-6"
          : "min-h-screen w-full text-[#F5ECD9] pb-12 relative overflow-x-hidden"
      }
      style={
        embedded
          ? undefined
          : {
              background:
                "radial-gradient(ellipse at 50% 0%, #10294E 0%, #06142A 50%, #030A16 100%)",
            }
      }
    >
      {/* Ambient top spotlight glow */}
      {!embedded && (
        <div
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[280px] opacity-35 blur-3xl"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(229,193,104,0.35) 0%, rgba(16,43,78,0.1) 60%, transparent 100%)",
          }}
        />
      )}

      {/* Top Admiralty Command Bar */}
      <div
        className={
          embedded
            ? "bg-gradient-to-r from-[#0B1D38] via-[#09182F] to-[#061123] border border-[#C5A059]/45 rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-[0_8px_24px_rgba(0,0,0,0.75)] flex-wrap gap-3"
            : "sticky top-0 z-30 bg-[#051020]/95 backdrop-blur-md border-b border-[#253B60] px-6 py-3.5 flex items-center justify-between flex-wrap gap-3 shadow-[0_8px_24px_rgba(0,0,0,0.7)]"
        }
      >
        <div className="flex items-center gap-3 flex-wrap">
          {embedded ? (
            <div className="flex items-center gap-2">
              <Badge className="bg-[#1F1A10] text-[#FFE394] border border-[#C5A059]/50 text-[10px] font-bold tracking-wider">
                CALL CENTER ACTIVE
              </Badge>
              <span className="text-xs text-[#8DA2C0] font-mono">PG-018 ↔ PG-003-DC</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setLocation("/leads")}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#051022] border border-[#2A4268] text-xs font-medium text-[#C5D3E8] hover:text-[#FFF5DA] hover:border-[#C5A059]/60 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#E5C168]" />
              <span>Lead Center</span>
            </button>
          )}
          <span className="text-[#263B5E]">|</span>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1
              className="text-xl sm:text-2xl font-bold text-[#FFF5DA] tracking-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Discovery Call Process
            </h1>
            <span className="inline-flex items-center rounded-md border border-[#C5A059]/55 bg-[#1F1A10] px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider text-[#FFE394] shadow-inner">
              PG-003-DC
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/60 px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-300">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              CB / VHF CH-16 RESCUE LINE • LIVE
            </span>
          </div>

          {/* Discovery Call Process Settings Gear */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-[#9FB2CD] hover:text-[#FFE394] hover:bg-[#0D2140] border border-transparent hover:border-[#C5A059]/40 rounded-lg ml-0.5 cursor-pointer"
                title="Discovery Call Process Settings"
              >
                <Settings className="w-4 h-4" />
                <span className="sr-only">Discovery Call Process Settings</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 bg-[#071428] border-[#C5A059]/50 text-[#FFF4D4] shadow-2xl z-50">
              <DropdownMenuLabel className="text-xs font-semibold text-[#FFE394] flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-[#E5C168]" /> Discovery Process Settings
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#23385A]" />
              <DropdownMenuItem
                onClick={() => setQuestionEditorOpen(true)}
                className="text-xs cursor-pointer hover:bg-[#102544] hover:text-[#FFF5DA] focus:bg-[#102544] focus:text-[#FFF5DA]"
              >
                <Edit2 className="w-3.5 h-3.5 mr-2 text-[#E5C168]" /> Manage Question Bank
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setPipelineEditMode(!pipelineEditMode)}
                className="text-xs cursor-pointer hover:bg-[#102544] hover:text-[#FFF5DA] focus:bg-[#102544] focus:text-[#FFF5DA]"
              >
                <Sliders className="w-3.5 h-3.5 mr-2 text-sky-400" />
                {pipelineEditMode ? "Exit Pipeline Edit Mode" : "Configure Pipeline Steps"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setEditingVoicemailScript(true)}
                className="text-xs cursor-pointer hover:bg-[#102544] hover:text-[#FFF5DA] focus:bg-[#102544] focus:text-[#FFF5DA]"
              >
                <FileText className="w-3.5 h-3.5 mr-2 text-emerald-400" /> Edit Voicemail / Call Scripts
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#23385A]" />
              <DropdownMenuItem
                onClick={() => setLocation("/tools/worksheet-builder")}
                className="text-xs cursor-pointer hover:bg-[#102544] hover:text-[#FFF5DA] focus:bg-[#102544] focus:text-[#FFF5DA]"
              >
                <BookOpen className="w-3.5 h-3.5 mr-2 text-purple-400" /> Open Worksheet Studio (PG-010-WS)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2.5">
          {parentPhone && (
            <button
              type="button"
              onClick={dialFamilyPhone}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-[#0B2A22] hover:bg-[#103B30] border border-emerald-500/45 text-emerald-300 font-semibold text-xs cursor-pointer transition-all shadow-sm"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Key Mic • {parentPhone}</span>
            </button>
          )}
          {saving && (
            <span className="text-xs text-[#D6C6A5] flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E5C168]" />
              Saving…
            </span>
          )}
          {!saving && lastSaved && (
            <span className="text-xs text-[#8DA2C0] hidden md:inline">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setSaving(true);
              triggerSave();
            }}
            className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-gradient-to-b from-[#EAD08A] via-[#CEA452] to-[#9E762A] hover:brightness-105 text-[#07162B] font-bold text-xs border border-[#FFE5A3]/70 shadow-[0_3px_10px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.45)] cursor-pointer transition-all"
          >
            <Save className="w-3.5 h-3.5 text-[#07162B]" />
            <span>Save Log</span>
          </button>
        </div>
      </div>

      {/* Main Content Container */}
      <div className={embedded ? "space-y-4" : "max-w-[1440px] mx-auto px-4 sm:px-6 pt-5 space-y-5 relative z-10"}>
        {/* ============================================================
            BESPOKE BRASS-FRAMED FAMILY RESCUE TRANSCEIVER & PIPELINE TUNER
            (Matches PG-003 Lead Center Hardware Aesthetic)
           ============================================================ */}
        <div
          className="relative rounded-[28px] p-[3px] shadow-[0_24px_60px_rgba(0,0,0,0.88),0_0_45px_rgba(197,160,89,0.12)]"
          style={{
            background:
              "linear-gradient(180deg, #E5C67E 0%, #9F7833 25%, #5A4016 55%, #B88E42 85%, #6A4C1B 100%)",
          }}
        >
          {/* Inner Navy Leather Instrument Chassis */}
          <div
            className="relative rounded-[25px] px-4 sm:px-6 pt-4 pb-5 overflow-hidden"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, #142E56 0%, #091933 55%, #050F20 100%)",
              boxShadow:
                "inset 0 2px 12px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,235,179,0.2)",
            }}
          >
            {/* 4 Corner Brass Rivets */}
            <span className="pointer-events-none absolute top-3 left-3.5 w-2 h-2 rounded-full bg-gradient-to-br from-[#FFE5A3] to-[#6E501C] shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />
            <span className="pointer-events-none absolute top-3 right-3.5 w-2 h-2 rounded-full bg-gradient-to-br from-[#FFE5A3] to-[#6E501C] shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />
            <span className="pointer-events-none absolute bottom-3 left-3.5 w-2 h-2 rounded-full bg-gradient-to-br from-[#FFE5A3] to-[#6E501C] shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />
            <span className="pointer-events-none absolute bottom-3 right-3.5 w-2 h-2 rounded-full bg-gradient-to-br from-[#FFE5A3] to-[#6E501C] shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />

            {/* Top CB / VHF Rescue Transceiver Strip */}
            <div className="mb-3.5 rounded-xl bg-[#040C18]/90 border border-[#C5A059]/35 px-3.5 py-2 flex flex-wrap items-center justify-between gap-3 shadow-[inset_0_2px_8px_rgba(0,0,0,0.85)]">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-[#091A32] border border-[#C5A059]/45 rounded-lg px-2.5 py-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 -ml-4" />
                  <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-[#FFE394]">
                    CB / VHF CH-16 • RESCUE DISCOVERY LOCKED
                  </span>
                </div>
                {/* S-Meter Signal Bars */}
                <div className="hidden sm:flex items-center gap-1" title="Signal Strength S9+20dB">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-[#8DA2C0] mr-1">
                    S-METER
                  </span>
                  <span className="w-1.5 h-2 rounded-[1px] bg-emerald-400" />
                  <span className="w-1.5 h-2.5 rounded-[1px] bg-emerald-400" />
                  <span className="w-1.5 h-3 rounded-[1px] bg-emerald-400" />
                  <span className="w-1.5 h-3.5 rounded-[1px] bg-[#E5C168]" />
                  <span className="w-1.5 h-4 rounded-[1px] bg-[#E5C168]" />
                </div>
                <span className="text-xs text-[#C6B697] italic">
                  “Copy that — we hear the family’s call on the radio and we’re charting the rescue plan together.”
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-[#FFE394]">
                <Compass className="w-3.5 h-3.5 text-[#E5C168]" />
                <span>
                  STEP {completedStepIds.length} OF {steps?.length ?? 6} COMPLETE
                </span>
              </div>
            </div>

            {/* Family Rescue Dossier Header Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#22385E]">
              {/* Monogram + Parent & Student Identity */}
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-full bg-[#1A2421] border-2 border-[#C5A059]/75 flex items-center justify-center text-[#FFE394] text-lg font-serif font-bold flex-shrink-0 shadow-[0_4px_14px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,235,179,0.25)]">
                  {familyInitials}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2
                      className="text-xl sm:text-2xl font-bold text-[#FFF5DA] leading-tight"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      {parentName}
                    </h2>
                    <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0F2442] border border-[#2C4875] text-[#B7C8E2]">
                      Parent / Guardian
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-1 text-sm">
                    <span className="text-[#FFE394] font-semibold">
                      Student: {studentName}
                    </span>
                    {studentGrade && (
                      <span className="text-[#9FB2CD]">· {studentGrade}</span>
                    )}
                    {lead?.source && (
                      <span className="text-xs text-[#8DA2C0] bg-[#051022] border border-[#1E3354] px-2 py-0.5 rounded-md">
                        Source: {lead.source}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Badges + Call Status Selector */}
              <div className="flex flex-wrap items-center gap-3 ml-auto">
                {parentPhone && (
                  <button
                    type="button"
                    onClick={dialFamilyPhone}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#051022]/90 border border-[#243B61] hover:border-[#C5A059]/60 text-xs text-[#DCE6F5] transition-colors cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#E5C168]" />
                    <span className="font-mono">{parentPhone}</span>
                  </button>
                )}
                {lead?.discoveryCallDate && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#051022]/90 border border-[#243B61] text-xs text-[#DCE6F5]">
                    <Calendar className="w-3.5 h-3.5 text-[#E5C168]" />
                    <span>
                      Scheduled:{" "}
                      {new Date(lead.discoveryCallDate).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {!(
                        new Date(lead.discoveryCallDate).getHours() === 0 &&
                        new Date(lead.discoveryCallDate).getMinutes() === 0
                      )
                        ? ` at ${new Date(lead.discoveryCallDate).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}`
                        : ""}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#9FB2CD]">
                    Status
                  </span>
                  <Select
                    value={callSession?.status ?? "Preparing"}
                    onValueChange={(v) => {
                      saveMutation.mutate({ leadId, status: v as any });
                    }}
                  >
                    <SelectTrigger className="w-36 h-9 bg-[#051022] border-[#C5A059]/50 text-[#FFF4D4] text-xs font-semibold rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#071428] border-[#C5A059]/50 text-[#FFF4D4]">
                      {["Preparing", "In Progress", "Completed", "Lost"].map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* ============================================================
                RECESSED BRASS-RIMMED PIPELINE FREQUENCY WINDOW
                (Mirrors the Illuminated Frequency Scale Window of PG-003)
               ============================================================ */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#FFE394]">
                    Rescue Pipeline Frequency Scale
                  </span>
                  <span className="text-[11px] text-[#8DA2C0] hidden sm:inline">
                    · Click any stage beacon to lock current position
                  </span>
                </div>
                <button
                  onClick={() => {
                    setPipelineEditMode((v) => !v);
                    setEditingStepId(null);
                    setAddingAfterStepId(null);
                  }}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                    pipelineEditMode
                      ? "bg-gradient-to-b from-[#EAD08A] via-[#CEA452] to-[#9E762A] text-[#07162B] font-bold border-[#FFE5A3]"
                      : "bg-[#051022] border-[#2A4268] text-[#C5D3E8] hover:border-[#C5A059]/60 hover:text-[#FFF5DA]"
                  }`}
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  {pipelineEditMode ? "Done Editing Scale" : "Edit Steps"}
                </button>
              </div>

              <div
                className="relative rounded-[20px] p-[2px]"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(229,198,126,0.65) 0%, rgba(122,90,34,0.4) 50%, rgba(229,198,126,0.55) 100%)",
                }}
              >
                <div
                  className="relative rounded-[18px] px-4 py-4 overflow-hidden"
                  style={{
                    background:
                      "linear-gradient(180deg, #040B17 0%, #091A34 50%, #040C1A 100%)",
                    boxShadow: "inset 0 4px 18px rgba(0,0,0,0.92)",
                  }}
                >
                  {/* Top & Bottom Brass Frequency Ruler Ticks */}
                  <div
                    className="pointer-events-none absolute top-0 inset-x-6 h-1.5 opacity-45"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(to right, rgba(229,193,104,0.75) 0px, rgba(229,193,104,0.75) 1px, transparent 1px, transparent 14px)",
                    }}
                  />
                  <div
                    className="pointer-events-none absolute bottom-0 inset-x-6 h-1.5 opacity-45"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(to right, rgba(229,193,104,0.75) 0px, rgba(229,193,104,0.75) 1px, transparent 1px, transparent 14px)",
                    }}
                  />

                  {/* Normal View: Illuminated Brass Step Beacons */}
                  {!pipelineEditMode && (
                    <div className="relative flex items-center justify-between gap-2 overflow-x-auto py-1">
                      {steps?.map((step, i) => {
                        const isCompleted =
                          currentStepId !== null && step.id <= currentStepId;
                        const isCurrent = step.id === currentStepId;
                        return (
                          <div
                            key={step.id}
                            className="flex items-center flex-1 min-w-[95px]"
                          >
                            {i > 0 && (
                              <div
                                className={`h-[2px] flex-1 mx-1.5 rounded-full transition-all ${
                                  isCompleted
                                    ? "bg-gradient-to-r from-[#C5A059] via-[#FFE394] to-[#C5A059] shadow-[0_0_8px_rgba(229,193,104,0.65)]"
                                    : "bg-[#1E3252]"
                                }`}
                              />
                            )}
                            <button
                              onClick={() => {
                                setCurrentStepId(step.id);
                                triggerSave();
                              }}
                              title={`Lock frequency on "${step.label}"`}
                              className="flex flex-col items-center gap-1.5 group cursor-pointer transition-all relative"
                            >
                              {isCurrent && (
                                <span className="pointer-events-none absolute -top-2 w-10 h-10 rounded-full bg-[#E5C168]/25 blur-md" />
                              )}
                              <div
                                className={`relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                  isCurrent
                                    ? "bg-gradient-to-b from-[#FFF2C2] via-[#E5C168] to-[#9E762A] text-[#07162B] border-2 border-[#FFF8DF] shadow-[0_0_16px_rgba(229,193,104,0.9)] scale-110"
                                    : isCompleted
                                    ? "bg-gradient-to-b from-[#EAD08A] via-[#CEA452] to-[#9E762A] text-[#07162B] border border-[#FFE5A3]/80 shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                                    : "bg-[#0B1B34] border border-[#2A4268] text-[#8DA2C0] group-hover:border-[#C5A059]/60 group-hover:text-[#FFF5DA]"
                                }`}
                              >
                                {isCompleted ? (
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                ) : (
                                  i + 1
                                )}
                              </div>
                              <span
                                className={`text-[11px] text-center max-w-[96px] leading-tight transition-colors ${
                                  isCurrent
                                    ? "text-[#FFE394] font-bold"
                                    : isCompleted
                                    ? "text-[#E2D6BE] font-medium"
                                    : "text-[#7F95B5] group-hover:text-[#C5D3E8]"
                                }`}
                              >
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
                          <div className="flex items-center gap-2 bg-[#071428] rounded-xl px-3 py-2 border border-[#243B61]">
                            {/* Move up/down */}
                            <div className="flex flex-col gap-0.5">
                              <button
                                disabled={i === 0}
                                onClick={() => {
                                  if (!steps || i === 0) return;
                                  const newOrder = [...steps];
                                  [newOrder[i - 1], newOrder[i]] = [
                                    newOrder[i],
                                    newOrder[i - 1],
                                  ];
                                  reorderPipelineStepsMutation.mutate({
                                    orderedIds: newOrder.map((s) => s.id),
                                  });
                                }}
                                className="text-[#8DA2C0] hover:text-[#FFE394] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                title="Move up"
                              >
                                <ChevronRight className="w-3 h-3 -rotate-90" />
                              </button>
                              <button
                                disabled={i === (steps?.length ?? 0) - 1}
                                onClick={() => {
                                  if (!steps || i === steps.length - 1) return;
                                  const newOrder = [...steps];
                                  [newOrder[i], newOrder[i + 1]] = [
                                    newOrder[i + 1],
                                    newOrder[i],
                                  ];
                                  reorderPipelineStepsMutation.mutate({
                                    orderedIds: newOrder.map((s) => s.id),
                                  });
                                }}
                                className="text-[#8DA2C0] hover:text-[#FFE394] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                title="Move down"
                              >
                                <ChevronRight className="w-3 h-3 rotate-90" />
                              </button>
                            </div>

                            {/* Step number badge */}
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#102544] border border-[#C5A059]/40 text-[#FFE394] text-[10px] font-bold flex items-center justify-center">
                              {i + 1}
                            </span>

                            {/* Editable label */}
                            {editingStepId === step.id ? (
                              <input
                                autoFocus
                                value={editingStepLabel}
                                onChange={(e) => setEditingStepLabel(e.target.value)}
                                onBlur={() => {
                                  if (editingStepLabel.trim())
                                    updateStepMutation.mutate({
                                      id: step.id,
                                      label: editingStepLabel.trim(),
                                    });
                                  else setEditingStepId(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && editingStepLabel.trim())
                                    updateStepMutation.mutate({
                                      id: step.id,
                                      label: editingStepLabel.trim(),
                                    });
                                  if (e.key === "Escape") setEditingStepId(null);
                                }}
                                className="flex-1 text-sm bg-transparent border-b border-[#E5C168] text-[#FFF5DA] outline-none py-0.5"
                              />
                            ) : (
                              <span className="flex-1 text-sm text-[#FFF4D4]">
                                {step.label}
                              </span>
                            )}

                            {/* Action buttons */}
                            <div className="flex items-center gap-1 ml-auto">
                              <button
                                onClick={() => {
                                  setEditingStepId(step.id);
                                  setEditingStepLabel(step.label);
                                }}
                                className="text-[#8DA2C0] hover:text-[#FFE394] transition-colors p-1"
                                title="Rename step"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setAddingAfterStepId(step.id)}
                                className="text-[#8DA2C0] hover:text-emerald-400 transition-colors p-1"
                                title="Add step below"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => {
                                  if (!confirm(`Delete step "${step.label}"?`)) return;
                                  deletePipelineStepMutation.mutate({ id: step.id });
                                }}
                                className="text-[#8DA2C0] hover:text-red-400 transition-colors p-1"
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
                                    createPipelineStepMutation.mutate({
                                      label: newStepLabel.trim(),
                                      afterId: step.id,
                                    });
                                  }
                                  if (e.key === "Escape") {
                                    setAddingAfterStepId(null);
                                    setNewStepLabel("");
                                  }
                                }}
                                placeholder="New step name…"
                                className="flex-1 text-sm bg-[#040C1A] border border-emerald-400/50 rounded-lg px-2.5 py-1 text-white outline-none placeholder:text-white/30"
                              />
                              <button
                                onClick={() => {
                                  if (newStepLabel.trim())
                                    createPipelineStepMutation.mutate({
                                      label: newStepLabel.trim(),
                                      afterId: step.id,
                                    });
                                }}
                                disabled={!newStepLabel.trim()}
                                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg disabled:opacity-40"
                              >
                                Add
                              </button>
                              <button
                                onClick={() => {
                                  setAddingAfterStepId(null);
                                  setNewStepLabel("");
                                }}
                                className="text-white/40 hover:text-white/70"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Add step at end */}
                      {addingAfterStepId === null && (
                        <button
                          onClick={() => setAddingAfterStepId(-1)}
                          className="w-full flex items-center justify-center gap-1 text-xs text-[#9FB2CD] hover:text-[#FFE394] border border-dashed border-[#2A4268] hover:border-[#C5A059]/60 rounded-xl py-2 transition-colors"
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
                              if (e.key === "Enter" && newStepLabel.trim())
                                createPipelineStepMutation.mutate({
                                  label: newStepLabel.trim(),
                                });
                              if (e.key === "Escape") {
                                setAddingAfterStepId(null);
                                setNewStepLabel("");
                              }
                            }}
                            placeholder="New step name…"
                            className="flex-1 text-sm bg-[#040C1A] border border-emerald-400/50 rounded-lg px-2.5 py-1 text-white outline-none placeholder:text-white/30"
                          />
                          <button
                            onClick={() => {
                              if (newStepLabel.trim())
                                createPipelineStepMutation.mutate({
                                  label: newStepLabel.trim(),
                                });
                            }}
                            disabled={!newStepLabel.trim()}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg disabled:opacity-40"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => {
                              setAddingAfterStepId(null);
                              setNewStepLabel("");
                            }}
                            className="text-white/40 hover:text-white/70"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Admiralty Tab Bar & Quick Accordion Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center p-1 rounded-xl bg-[#061224] border border-[#243B61] shadow-inner">
            <button
              onClick={() => setActiveTab("call")}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "call"
                  ? "bg-gradient-to-b from-[#EAD08A] via-[#CEA452] to-[#9E762A] text-[#07162B] shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
                  : "text-[#9FB2CD] hover:text-[#FFF5DA]"
              }`}
            >
              <PhoneCall className="w-4 h-4" />
              <span>Discovery Call Guide (7 Stations)</span>
            </button>
            <button
              onClick={() => setActiveTab("resources")}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "resources"
                  ? "bg-gradient-to-b from-[#EAD08A] via-[#CEA452] to-[#9E762A] text-[#07162B] shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
                  : "text-[#9FB2CD] hover:text-[#FFF5DA]"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Rescue Resources Directory</span>
            </button>
          </div>

          {activeTab === "call" && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setOpenSections({
                    1: true,
                    2: true,
                    3: true,
                    4: true,
                    5: true,
                    6: true,
                    7: true,
                  })
                }
                className="text-xs px-3 py-1.5 rounded-lg bg-[#061224] border border-[#243B61] text-[#C5D3E8] hover:border-[#C5A059]/60 hover:text-[#FFE394] transition-colors cursor-pointer"
              >
                Expand All 7 Stations
              </button>
              <button
                type="button"
                onClick={() =>
                  setOpenSections({
                    1: false,
                    2: false,
                    3: false,
                    4: false,
                    5: false,
                    6: false,
                    7: false,
                  })
                }
                className="text-xs px-3 py-1.5 rounded-lg bg-[#061224] border border-[#243B61] text-[#8DA2C0] hover:border-[#C5A059]/60 hover:text-[#FFF5DA] transition-colors cursor-pointer"
              >
                Collapse All
              </button>
            </div>
          )}
        </div>

      {/* ===== CALL GUIDE TAB ===== */}
      {activeTab === "call" && (
        <div className="pb-8 grid grid-cols-1 gap-4">

          {/* Section 1: Call Script & Contact */}
          <div className="space-y-2">
            <SectionHeader
              number={1}
              title="Call Script & Contact"
              subtitle="Opening rescue transmission & warm voicemail script"
              badge="Station 01"
              isOpen={openSections[1]}
              onToggle={() => toggleSection(1)}
            />
            {openSections[1] && (
              <div className="rounded-xl bg-gradient-to-b from-[#0C1F3C] via-[#091830] to-[#061123] border border-[#243B61] p-5 space-y-4 shadow-[0_12px_32px_rgba(0,0,0,0.65)]">
                {/* Opening script */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#FFE394] uppercase tracking-wider">
                      A. If They Answer – Opening Rescue Script
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingOpeningScript((v) => !v)}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                          editingOpeningScript
                            ? "bg-gradient-to-b from-[#EAD08A] via-[#CEA452] to-[#9E762A] text-[#07162B] font-bold border-[#FFE5A3]"
                            : "bg-[#051022] border-[#2A4268] text-[#C5D3E8] hover:border-[#C5A059] hover:text-[#FFF5DA]"
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
                      className="bg-[#040C1A] border-[#C5A059]/60 text-[#FFF5DA] text-sm resize-none leading-relaxed rounded-xl"
                      rows={6}
                    />
                  ) : (
                    <div className="bg-[#040C1A] rounded-xl p-3.5 text-sm text-[#E9DFC8] leading-relaxed border border-[#1E3354] whitespace-pre-wrap shadow-inner">
                      {openingScript}
                    </div>
                  )}
                </div>
                {/* Voicemail script */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#9FB2CD] uppercase tracking-wider">
                      B. If No Answer – Voicemail Script
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingVoicemailScript((v) => !v)}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                          editingVoicemailScript
                            ? "bg-gradient-to-b from-[#EAD08A] via-[#CEA452] to-[#9E762A] text-[#07162B] font-bold border-[#FFE5A3]"
                            : "bg-[#051022] border-[#2A4268] text-[#C5D3E8] hover:border-[#C5A059] hover:text-[#FFF5DA]"
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
                      className="bg-[#040C1A] border-[#C5A059]/60 text-[#FFF5DA] text-sm resize-none leading-relaxed rounded-xl"
                      rows={4}
                    />
                  ) : (
                    <div className="bg-[#040C1A] rounded-xl p-3.5 text-sm text-[#C5D3E8] leading-relaxed border border-[#1E3354] whitespace-pre-wrap shadow-inner">
                      {voicemailScript}
                    </div>
                  )}
                </div>
                {/* Pro tip */}
                <div className="flex items-start gap-2.5 bg-[#1B170E]/90 border border-[#C5A059]/45 rounded-xl p-3">
                  <Star className="w-4 h-4 text-[#E5C168] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[#FFE394]">
                    Advocate Tip: Personalize with parent ({parentName}) and student ({studentName}) names. Let them know we heard their call on the rescue line and they don't have to navigate this alone.
                  </p>
                </div>
                {/* Notes */}
                <div>
                  <label className="text-xs font-semibold text-[#9FB2CD] mb-1.5 block">
                    Notes from Opening Contact
                  </label>
                  <Textarea
                    value={callScriptNotes}
                    onChange={(e) => { setCallScriptNotes(e.target.value); triggerSave(); }}
                    placeholder="Capture immediate parent tone, availability, or callback notes..."
                    className="bg-[#040C1A] border-[#23395B] text-[#FFF5DA] placeholder:text-[#667C9E] text-sm resize-none rounded-xl"
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Let's Begin – Their Story */}
          <div className="space-y-2">
            <SectionHeader
              number={2}
              title="Let's Begin – Their Story"
              subtitle="Listen to the family's journey, school challenges, and urgent concerns"
              badge="Station 02"
              isOpen={openSections[2]}
              onToggle={() => toggleSection(2)}
            />
            {openSections[2] && (
              <div className="rounded-xl bg-gradient-to-b from-[#0C1F3C] via-[#091830] to-[#061123] border border-[#243B61] p-5 space-y-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.65)]">
                <div className="bg-[#040C1A] border border-[#1E3354] rounded-xl px-4 py-3 text-sm text-[#FFE394] italic">
                  “Let's begin with your story and where you're at with {studentName} so I can make sure we are the right help for your family.”
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#9FB2CD] mb-1.5 block">
                    Family Story & Immediate Concerns
                  </label>
                  <Textarea
                    value={theirStoryNotes}
                    onChange={(e) => { setTheirStoryNotes(e.target.value); triggerSave(); }}
                    placeholder="Document the family's story, school district, current IEP/504 status, and key pain points..."
                    className="bg-[#040C1A] border-[#23395B] text-[#FFF5DA] placeholder:text-[#667C9E] text-sm resize-none rounded-xl"
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
                <SectionHeader
                  number={3}
                  title="Discovery Questions"
                  subtitle={`Guided ${questionMode} intake prompts (${filteredQuestions.length} active questions)`}
                  badge="Station 03"
                  isOpen={openSections[3]}
                  onToggle={() => toggleSection(3)}
                />
              </div>
              <button
                onClick={() => setQuestionEditorOpen(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-2.5 rounded-xl bg-[#061224] border border-[#243B61] text-[#C5D3E8] hover:border-[#C5A059]/60 hover:text-[#FFE394] transition-colors cursor-pointer"
                title="Edit questions"
              >
                <Settings2 className="w-3.5 h-3.5 text-[#E5C168]" />
                <span className="hidden sm:inline">Edit Questions</span>
              </button>
            </div>
            {openSections[3] && (
              <div className="rounded-xl bg-gradient-to-b from-[#0C1F3C] via-[#091830] to-[#061123] border border-[#243B61] p-5 space-y-4 shadow-[0_12px_32px_rgba(0,0,0,0.65)]">
                {/* Mode toggle */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="inline-flex p-1 rounded-xl bg-[#040C1A] border border-[#23395B]">
                    {(["IEP/504", "General"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => { setQuestionMode(mode); triggerSave(); }}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          questionMode === mode
                            ? "bg-gradient-to-b from-[#EAD08A] via-[#CEA452] to-[#9E762A] text-[#07162B] shadow"
                            : "text-[#8DA2C0] hover:text-[#FFF5DA]"
                        }`}
                      >
                        {mode} Track
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      const allOpen = filteredQuestions.reduce((acc, q) => ({ ...acc, [q.id]: true }), {});
                      setExpandedQuestions(allOpen);
                    }}
                    className="text-xs text-[#FFE394] hover:underline cursor-pointer"
                  >
                    Expand all questions
                  </button>
                </div>
                {/* Questions */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredQuestions.map((q) => (
                    <div key={q.id} className="bg-[#040C1A] rounded-xl border border-[#1E3354] hover:border-[#C5A059]/45 transition-colors overflow-hidden">
                      <button
                        onClick={() => setExpandedQuestions((s) => ({ ...s, [q.id]: !s[q.id] }))}
                        className="w-full flex items-center justify-between px-3.5 py-3 hover:bg-[#091933]/60 transition-colors cursor-pointer"
                      >
                        <div className="text-left pr-2">
                          <p className="text-sm font-semibold text-[#FFF4D4]">{q.label}</p>
                          {q.subLabel && <p className="text-xs text-[#8DA2C0] mt-0.5">{q.subLabel}</p>}
                        </div>
                        {expandedQuestions[q.id] ? (
                          <ChevronDown className="w-4 h-4 text-[#E5C168] flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-[#667C9E] flex-shrink-0" />
                        )}
                      </button>
                      {expandedQuestions[q.id] && (
                        <div className="px-3.5 pb-3.5">
                          <Textarea
                            value={questionNotes[q.id] ?? ""}
                            onChange={(e) => {
                              setQuestionNotes((n) => ({ ...n, [q.id]: e.target.value }));
                              triggerSave();
                            }}
                            placeholder="Notes for this question..."
                            className="bg-[#091830] border-[#243B61] text-[#FFF5DA] placeholder:text-[#667C9E] text-xs resize-none rounded-lg"
                            rows={3}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="border-t border-[#1E3354] pt-3.5 mt-3">
                  <p className="text-xs font-semibold text-[#FFE394] mb-1.5">Preliminary Case Notes (Syncs to Dossier)</p>
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
                    className="bg-[#040C1A] border-[#23395B] text-[#FFF5DA] placeholder:text-[#667C9E] text-sm resize-none rounded-xl"
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 4: How Does This Work? */}
          <div className="space-y-2">
            <SectionHeader
              number={4}
              title="How Does This Work?"
              subtitle="Explain how Waypoint Advocates stands beside the family in every meeting"
              badge="Station 04"
              isOpen={openSections[4]}
              onToggle={() => toggleSection(4)}
            />
            {openSections[4] && (
              <div className="rounded-xl bg-gradient-to-b from-[#0C1F3C] via-[#091830] to-[#061123] border border-[#243B61] p-5 space-y-4 shadow-[0_12px_32px_rgba(0,0,0,0.65)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-sm text-[#E9DFC8]">
                  {[
                    "I attend all meetings remotely. You never have to go it alone.",
                    "Our rate includes no surprises. If we have 4 meetings in a month, the price stays the same.",
                    "We handle the preparation, the meetings, the follow-up, and the communication.",
                    "You focus on your child — we handle the rest.",
                  ].map((point, i) => (
                    <div key={i} className="flex items-start gap-2.5 bg-[#040C1A] border border-[#1E3354] rounded-xl p-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#9FB2CD] mb-1.5 block">Notes & Family Questions on Process</label>
                  <Textarea
                    value={howItWorksNotes}
                    onChange={(e) => { setHowItWorksNotes(e.target.value); triggerSave(); }}
                    placeholder="Take notes here..."
                    className="bg-[#040C1A] border-[#23395B] text-[#FFF5DA] placeholder:text-[#667C9E] text-sm resize-none rounded-xl"
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Our Difference, Pricing & Next Steps */}
          <div className="space-y-2">
            <SectionHeader
              number={5}
              title="Our Difference, Pricing & Next Steps"
              subtitle="Flat monthly representation plans, portal publishing, and family enrollment"
              badge="Station 05"
              isOpen={openSections[5]}
              onToggle={() => toggleSection(5)}
            />
            {openSections[5] && (
              <div className="rounded-xl bg-gradient-to-b from-[#0C1F3C] via-[#091830] to-[#061123] border border-[#243B61] p-5 space-y-6 shadow-[0_12px_32px_rgba(0,0,0,0.65)]">
                {/* Value bullet points */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-sm text-[#E9DFC8]">
                  {[
                    "Most advocates charge by the hour and commonly run $4,000–$5,000+ per year.",
                    "We've been there, done that.",
                    "We believe advocacy should be accessible, predictable, and transparent for every family.",
                    "We took that price, chopped it up, and brought flat monthly membership plans:",
                  ].map((point, i) => (
                    <div key={i} className="flex items-start gap-2.5 bg-[#040C1A] border border-[#1E3354] rounded-xl p-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>

                {/* 1. Student Count Selection */}
                <div className="bg-[#040C1A] border border-[#22385E] rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-xs font-bold text-[#FFE394] uppercase tracking-wider">1. Number of Students to Enroll</p>
                    <p className="text-xs text-[#8DA2C0] mt-0.5">Select how many students in this household will receive advocacy representation.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { count: 1, label: "1 Student", note: "Standard single plan" },
                      { count: 2, label: "2 Students", note: "Dual sibling coverage" },
                      { count: 3, label: "3+ Students", note: "Multi-student family plan" },
                    ].map((opt) => (
                      <button
                        key={opt.count}
                        type="button"
                        onClick={() => {
                          setStudentCount(opt.count);
                          triggerSave();
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          studentCount === opt.count
                            ? "bg-[#191912] border-[#C5A059] text-[#FFF5DA] ring-1 ring-[#E5C168]/50 shadow-[0_4px_14px_rgba(0,0,0,0.5)]"
                            : "bg-[#091830] border-[#243B61] text-[#9FB2CD] hover:border-[#C5A059]/45 hover:text-[#FFF5DA]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-[#FFF5DA]">{opt.label}</span>
                          {studentCount === opt.count && <Check className="w-3.5 h-3.5 text-[#E5C168]" />}
                        </div>
                        <p className="text-[11px] text-[#8DA2C0] mt-0.5">{opt.note}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Selectable Plans */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-[#FFE394] uppercase tracking-wider">2. Select Recommended Advocacy Plan</p>
                      <a
                        href="/services"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-[#E5C168] hover:text-[#FFE394] underline font-mono flex items-center gap-1"
                        title="Manage and customize pricing in Advocacy Services Catalog (PG-035)"
                      >
                        <Zap className="w-2.5 h-2.5 text-[#E5C168]" />
                        Synced to Catalog (PG-035)
                      </a>
                    </div>
                    <p className="text-[11px] text-[#8DA2C0]">Click to select the plan recommended for this client</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {/* Plan A: $55/mo Advocacy Only */}
                    <div
                      onClick={() => {
                        setSelectedPlan("advocacy_55");
                        triggerSave();
                      }}
                      className={`cursor-pointer rounded-xl border p-4 transition-all flex flex-col justify-between space-y-3 relative ${
                        selectedPlan === "advocacy_55"
                          ? "bg-[#191912] border-[#C5A059] ring-1 ring-[#E5C168]/50 shadow-[0_8px_24px_rgba(0,0,0,0.65)]"
                          : "bg-[#040C1A] border-[#22385E] hover:border-[#C5A059]/45 text-[#E9DFC8]"
                      }`}
                    >
                      {selectedPlan === "advocacy_55" && (
                        <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-b from-[#EAD08A] to-[#B68D3E] text-[#07162B] shadow-sm">
                          <Check className="w-3 h-3" /> Selected
                        </span>
                      )}
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className="text-2xl font-bold text-[#FFE394]"
                            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                          >
                            ${(() => {
                              const s = (servicesCatalog as any[]).find((x: any) => x.serviceCode === "advocacy_plan_55" || x.price === 5500);
                              const p = s?.standardPrice ? s.standardPrice / 100 : (s?.price ? s.price / 100 : 55);
                              return p * studentCount;
                            })()}
                          </span>
                          <span className="text-xs text-[#9FB2CD]">/ month</span>
                          {studentCount > 1 && (
                            <span className="text-[11px] text-[#E5C168] ml-1">
                              (${(() => {
                                const s = (servicesCatalog as any[]).find((x: any) => x.serviceCode === "advocacy_plan_55" || x.price === 5500);
                                return s?.standardPrice ? s.standardPrice / 100 : (s?.price ? s.price / 100 : 55);
                              })()}/mo × {studentCount})
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-[#FFF5DA] mt-1">Advocacy Only</h4>
                        <p className="text-xs text-[#FFE394]/85 font-medium">
                          ${(() => {
                            const s = (servicesCatalog as any[]).find((x: any) => x.serviceCode === "advocacy_plan_55" || x.price === 5500);
                            const p = s?.standardPrice ? s.standardPrice / 100 : (s?.price ? s.price / 100 : 55);
                            return p * studentCount;
                          })()} per month · Year-round representation
                        </p>
                        <p className="text-xs text-[#9FB2CD] mt-2 leading-relaxed">
                          Year-round special education IEP advocacy representation, meeting strategy & attendance, document & eval review.
                        </p>
                      </div>
                      <div className="pt-2 border-t border-[#1E3354] text-[11px] text-[#8DA2C0] flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" /> Cancel anytime · All fees included
                      </div>
                    </div>

                    {/* Plan B: $105/mo State Complaints Included */}
                    <div
                      onClick={() => {
                        setSelectedPlan("complaints_100");
                        triggerSave();
                      }}
                      className={`cursor-pointer rounded-xl border p-4 transition-all flex flex-col justify-between space-y-3 relative ${
                        selectedPlan === "complaints_100"
                          ? "bg-[#191912] border-[#C5A059] ring-1 ring-[#E5C168]/50 shadow-[0_8px_24px_rgba(0,0,0,0.65)]"
                          : "bg-[#040C1A] border-[#22385E] hover:border-[#C5A059]/45 text-[#E9DFC8]"
                      }`}
                    >
                      {selectedPlan === "complaints_100" && (
                        <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-b from-[#EAD08A] to-[#B68D3E] text-[#07162B] shadow-sm">
                          <Check className="w-3 h-3" /> Selected
                        </span>
                      )}
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className="text-2xl font-bold text-[#FFE394]"
                            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                          >
                            ${(() => {
                              const s = (servicesCatalog as any[]).find((x: any) => x.serviceCode === "advocacy_plan_105" || x.price === 10500);
                              const p = s?.standardPrice ? s.standardPrice / 100 : (s?.price ? s.price / 100 : 105);
                              return p * studentCount;
                            })()}
                          </span>
                          <span className="text-xs text-[#9FB2CD]">/ month</span>
                          {studentCount > 1 && (
                            <span className="text-[11px] text-[#E5C168] ml-1">
                              (${(() => {
                                const s = (servicesCatalog as any[]).find((x: any) => x.serviceCode === "advocacy_plan_105" || x.price === 10500);
                                return s?.standardPrice ? s.standardPrice / 100 : (s?.price ? s.price / 100 : 105);
                              })()}/mo × {studentCount})
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-[#FFF5DA] mt-1">Advocacy + State Complaints</h4>
                        <p className="text-xs text-[#FFE394]/85 font-medium">
                          ${(() => {
                            const s = (servicesCatalog as any[]).find((x: any) => x.serviceCode === "advocacy_plan_105" || x.price === 10500);
                            const p = s?.standardPrice ? s.standardPrice / 100 : (s?.price ? s.price / 100 : 105);
                            return p * studentCount;
                          })()} per month · Full drafting included
                        </p>
                        <p className="text-xs text-[#9FB2CD] mt-2 leading-relaxed">
                          Complete representation plus full drafting, legal citation indexing, and filing of Georgia IDEA State Complaints without separate legal drafting fees.
                        </p>
                      </div>
                      <div className="pt-2 border-t border-[#1E3354] text-[11px] text-[#8DA2C0] flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" /> Includes State Complaints at no extra cost ($1,500+ value)
                      </div>
                    </div>

                    {/* Plan C: State Complaint Support ($200 one-time Authoritative) */}
                    <div
                      onClick={() => {
                        setSelectedPlan("single_complaint");
                        triggerSave();
                      }}
                      className={`cursor-pointer rounded-xl border p-4 transition-all flex flex-col justify-between space-y-3 relative ${
                        selectedPlan === "single_complaint"
                          ? "bg-purple-950/35 border-purple-400 ring-1 ring-purple-400/50 shadow-lg"
                          : "bg-[#040C1A] border-[#22385E] hover:border-purple-400/50 text-[#E9DFC8]"
                      }`}
                    >
                      {selectedPlan === "single_complaint" && (
                        <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-400 text-slate-950 shadow-sm">
                          <Check className="w-3 h-3" /> Selected
                        </span>
                      )}
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className="text-2xl font-bold text-purple-300"
                            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                          >
                            ${(() => {
                              const s = (servicesCatalog as any[]).find((x: any) => x.serviceCode === "state_complaint_support");
                              const p = s?.standardPrice ? s.standardPrice / 100 : (s?.price ? s.price / 100 : 200);
                              return p.toLocaleString();
                            })()}
                          </span>
                          <span className="text-xs text-[#9FB2CD]">flat rate</span>
                        </div>
                        <h4 className="text-sm font-bold text-[#FFF5DA] mt-1">State Complaint Support</h4>
                        <p className="text-xs text-purple-300/85 font-medium">One-time authoritative drafting & evidence prep</p>
                        <p className="text-xs text-[#9FB2CD] mt-2 leading-relaxed">
                          Authoritative assistance and drafting for filing a Georgia Department of Education IDEA state administrative complaint with document review and evidence timeline preparation.
                        </p>
                      </div>
                      <div className="pt-2 border-t border-[#1E3354] text-[11px] text-[#8DA2C0] flex items-center gap-1.5">
                        <Scale className="w-3 h-3 text-purple-400 flex-shrink-0" /> Full GaDOE filing support included ($200)
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. The Question & Response */}
                <div className="bg-[#040C1A] border border-[#22385E] rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-xs font-bold text-[#FFE394] uppercase tracking-wider">3. The Question</p>
                    <p className="text-sm text-[#FFF5DA] italic mt-1">"Does that sound like something you would be interested in?"</p>
                  </div>
                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] font-bold text-[#8DA2C0] uppercase tracking-wide">Client Response</p>
                    {[
                      { value: "Yes", color: "emerald", label: "Yes, I'm interested" },
                      { value: "Think about it", color: "amber", label: "I need to think about it or discuss with spouse" },
                      { value: "Not right now", color: "red", label: "Not right now" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setClosingResponse(opt.value); triggerSave(); }}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all text-sm font-medium cursor-pointer
                          ${closingResponse === opt.value
                            ? opt.color === "emerald" ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-300"
                              : opt.color === "amber" ? "bg-[#1F1A10] border-[#C5A059] text-[#FFE394]"
                              : "bg-red-500/20 border-red-500/60 text-red-300"
                            : "bg-[#091830] border-[#243B61] text-[#C5D3E8] hover:border-[#C5A059]/45"}`}
                      >
                        {closingResponse === opt.value ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Next Steps & Dynamic Action Workflow */}
                {closingResponse === "Yes" && (
                  <div className="bg-[#040C1A] border border-emerald-500/45 rounded-xl p-5 space-y-4 shadow-lg">
                    <div className="border-b border-[#1E3354] pb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <p className="text-xs font-bold text-[#FFF5DA] uppercase tracking-wider">
                          4. Next Steps & Publish Plan to Client Portal
                        </p>
                      </div>
                      <p className="text-[11px] text-emerald-300/85 mt-0.5">
                        Client is ready! Publish the selected plan to {parentName}'s portal for purchase processing & agreement execution.
                      </p>
                    </div>

                    {/* Publish Plan to Portal Card */}
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/35 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[#FFF5DA]">
                            {selectedPlan === "advocacy_55"
                              ? "Advocacy Only Plan"
                              : selectedPlan === "complaints_100"
                              ? "Advocacy + State Complaints Plan"
                              : "State Complaint Support"}
                          </span>
                          <span className="text-xs font-mono font-bold text-[#FFE394]">
                            {selectedPlan === "single_complaint" ? (
                              `$${(() => {
                                const s = (servicesCatalog as any[]).find((x: any) => x.serviceCode === "state_complaint_support");
                                const p = s?.standardPrice ? s.standardPrice / 100 : (s?.price ? s.price / 100 : 200);
                                return p.toLocaleString();
                              })()} flat`
                            ) : (
                              `$${(() => {
                                const is55 = selectedPlan === "advocacy_55";
                                const code = is55 ? "advocacy_plan_55" : "advocacy_plan_105";
                                const s = (servicesCatalog as any[]).find((x: any) => x.serviceCode === code || (is55 ? x.price === 5500 : x.price === 10500));
                                const p = s?.standardPrice ? s.standardPrice / 100 : (s?.price ? s.price / 100 : (is55 ? 55 : 105));
                                return p * studentCount;
                              })()}/mo`
                            )}
                          </span>
                          {selectedPlan !== "single_complaint" && (
                            <span className="text-[10px] text-[#9FB2CD]">
                              ({studentCount} {studentCount === 1 ? "Student" : "Students"})
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#C5D3E8]">
                          Target Portal: <span className="text-[#FFF5DA] font-medium">{parentName}</span>
                          {studentName && ` (Student: ${studentName})`}
                        </p>
                      </div>

                      {planPublishedToPortal ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Published to Portal
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPlanPublishedToPortal(false);
                              triggerSave();
                            }}
                            className="text-[10px] text-[#9FB2CD] hover:text-white h-7 px-2"
                          >
                            Update
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => {
                            setPlanPublishedToPortal(true);
                            triggerSave();
                            const planLabel = selectedPlan === "advocacy_55"
                              ? "$55/mo Advocacy Only"
                              : selectedPlan === "complaints_100"
                              ? "$105/mo Advocacy + State Complaints"
                              : "Single-Use State Complaint";
                            toast.success(`Published ${planLabel} plan to ${parentName}'s client portal!`);
                          }}
                          className="bg-gradient-to-b from-[#EAD08A] via-[#CEA452] to-[#9E762A] hover:brightness-105 text-[#07162B] font-bold text-xs gap-1.5 shadow-md"
                        >
                          <Send className="w-3.5 h-3.5" /> Publish Plan to {parentName}'s Portal
                        </Button>
                      )}
                    </div>

                    <Button
                      onClick={() => {
                        saveMutation.mutate({ leadId, status: "Completed" });
                        onCallCompleted?.({ status: "Completed", closingResponse: "Yes" });
                        toast.success("Discovery call completed! Family record saved & ready for enrollment review.");
                      }}
                      className="w-full bg-[#102B4E] hover:bg-[#153866] text-[#FFE394] border border-[#C5A059]/45 font-semibold text-xs py-2.5 shadow-lg cursor-pointer transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5 text-[#C5A059]" /> Finish Discovery
                    </Button>

                    {/* Shared Architecture Contextual Placement: Approve for Enrollment (Phase 2) */}
                    <div className="pt-2.5 border-t border-[#3A2C18]/60 flex items-center justify-between text-left">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#C5A059]" />
                          <span className="text-[11px] font-semibold text-[#FFF4D4]">Family Enrollment Status</span>
                        </div>
                        <p className="text-[10px] text-[#C6B697] mt-0.5">Pre-enrollment discovery record completed.</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsApprovalModalOpen(true)}
                        className="border-[#C5A059] text-[#FFE394] hover:text-white bg-[#020A17] hover:bg-[#07162B] text-xs font-semibold cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-[#C5A059] mr-1.5" />
                        Approve for Enrollment
                      </Button>
                    </div>
                  </div>
                )}

                {/* Case 2: Think about it / Spouse review */}
                {closingResponse === "Think about it" && (
                  <div className="bg-[#040C1A] border border-[#C5A059]/50 rounded-xl p-5 space-y-4 shadow-lg">
                    <div className="border-b border-[#1E3354] pb-3">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-[#E5C168]" />
                        <p className="text-xs font-bold text-[#FFF5DA] uppercase tracking-wider">
                          4. Portal Plan Visibility & Spouse Review Rules
                        </p>
                      </div>
                      <p className="text-[11px] text-[#FFE394]/80 mt-0.5">
                        Client is reviewing with spouse. Configure portal display rules and plan visibility for {parentName}.
                      </p>
                    </div>

                    {/* Notice & Defined Rules */}
                    <div className="rounded-xl bg-[#091A34] border border-[#2A4672] p-3.5 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#FFE394]">
                        <Info className="w-4 h-4 text-[#E5C168] flex-shrink-0" />
                        Notice & Defined Rules for Portal Display
                      </div>
                      <p className="text-xs text-[#C5D3E8] leading-relaxed">
                        By default, when <strong className="text-[#FFF5DA]">{parentName}</strong> logs into the client portal to review options with their spouse, the portal displays both membership options calculated for <strong className="text-[#FFE394]">{studentCount} {studentCount === 1 ? "student" : "students"}</strong> (${55 * studentCount}/mo and ${105 * studentCount}/mo) alongside a comparison breakdown.
                      </p>
                    </div>

                    {/* Override Checkbox & Plan Options */}
                    <div className="bg-[#091830] border border-[#243B61] rounded-xl p-3.5 space-y-3">
                      <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-[#FFF5DA]">
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
                        <div className="pt-2 pl-6 border-t border-[#1E3354] space-y-2">
                          <p className="text-[11px] text-[#FFE394] font-medium">
                            Select which plan(s) to make visible on {parentName}'s portal:
                          </p>
                          <label className="flex items-center gap-2 cursor-pointer text-xs text-[#C5D3E8] hover:text-white">
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
                          <label className="flex items-center gap-2 cursor-pointer text-xs text-[#C5D3E8] hover:text-white">
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
                        <p className="text-[11px] text-[#8DA2C0] pl-6">
                          Standard rules active: Both plans visible in portal with spouse comparison matrix.
                        </p>
                      )}
                    </div>

                    {/* Follow-up Checklist for Spouse Review */}
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-[#9FB2CD] uppercase tracking-wide">Spouse Review Follow-Up Actions</p>
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
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm cursor-pointer
                            ${spouseFollowUpChecklist.includes(item.key)
                              ? "bg-[#1F1A10] border-[#C5A059] text-[#FFE394]"
                              : "bg-[#091830] border-[#243B61] text-[#C5D3E8] hover:border-[#C5A059]/45"}`}
                        >
                          {spouseFollowUpChecklist.includes(item.key) ? <CheckCircle2 className="w-4 h-4 text-[#E5C168]" /> : <Circle className="w-4 h-4" />}
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <Button
                      onClick={() => {
                        triggerSave();
                        toast.success("Saved portal display rules & queued follow-up!");
                      }}
                      className="w-full bg-gradient-to-b from-[#EAD08A] via-[#CEA452] to-[#9E762A] hover:brightness-105 text-[#07162B] font-bold text-xs py-2.5 mt-2 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5 mr-1.5" /> Save Portal Rules & Queue Follow-Up
                    </Button>
                  </div>
                )}

                {/* Case 3: Not right now / Lost */}
                {closingResponse === "Not right now" && (
                  <div className="bg-[#040C1A] border border-red-500/40 rounded-xl p-5 space-y-4 shadow-lg">
                    <div className="border-b border-[#1E3354] pb-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <p className="text-xs font-bold text-[#FFF5DA] uppercase tracking-wider">
                          4. Collect Feedback & Move Client to Lost Position
                        </p>
                      </div>
                      <p className="text-[11px] text-red-300/80 mt-0.5">
                        Capture feedback on why the client is declining and update lead status.
                      </p>
                    </div>

                    {/* Reason for Declining */}
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-[#9FB2CD] uppercase tracking-wide">Primary Reason for Declining</p>
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
                            className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all text-left cursor-pointer ${
                              lostReason === reason
                                ? "bg-red-500/20 border-red-400 text-red-300 shadow-sm"
                                : "bg-[#091830] border-[#243B61] text-[#C5D3E8] hover:border-red-400/40 hover:text-white"
                            }`}
                          >
                            {lostReason === reason ? "✓ " : ""}{reason}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Feedback Notes */}
                    <div className="space-y-1">
                      <label className="text-xs text-[#9FB2CD] font-medium">Feedback Details & Client Objections</label>
                      <Textarea
                        value={lostFeedbackNotes}
                        onChange={(e) => {
                          setLostFeedbackNotes(e.target.value);
                          triggerSave();
                        }}
                        placeholder="Collect specific feedback on why the family is declining advocacy at this time..."
                        className="bg-[#091830] border-[#243B61] text-[#FFF5DA] placeholder:text-[#667C9E] text-xs resize-none rounded-xl"
                        rows={3}
                      />
                    </div>

                    {/* Nurture & Closing Options */}
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-[#9FB2CD] uppercase tracking-wide">Follow-Up & Archive Actions</p>
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
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm cursor-pointer
                            ${lostNurtureOptions.includes(opt.key)
                              ? "bg-red-500/20 border-red-500/40 text-red-300"
                              : "bg-[#091830] border-[#243B61] text-[#C5D3E8] hover:border-red-400/40"}`}
                        >
                          {lostNurtureOptions.includes(opt.key) ? <CheckCircle2 className="w-4 h-4 text-red-400" /> : <Circle className="w-4 h-4" />}
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    <Button
                      onClick={() => {
                        saveMutation.mutate({ leadId, status: "Lost" });
                        onCallCompleted?.({ status: "Lost", closingResponse: "Not right now" });
                        toast.info("Feedback recorded and lead moved to Lost position.");
                      }}
                      className="w-full bg-red-700 hover:bg-red-800 text-white font-semibold text-xs py-2.5 mt-2 cursor-pointer"
                    >
                      <X className="w-4 h-4 mr-1.5" /> Record Feedback & Move to Lost Position
                    </Button>
                  </div>
                )}

                {/* Case 4: No selection yet */}
                {!closingResponse && (
                  <div className="bg-[#040C1A] border border-dashed border-[#243B61] rounded-xl p-6 text-center space-y-1">
                    <p className="text-xs font-bold text-[#FFE394]">4. Next Steps & Onboarding Workflow</p>
                    <p className="text-[11px] text-[#8DA2C0]">
                      Select the client's response in <strong>3. The Question</strong> above to load the appropriate next steps (Publish Plan to Portal, Spouse Review Rules, or Feedback & Lost).
                    </p>
                  </div>
                )}

                <div className="space-y-1 text-xs text-[#C5D3E8] pt-1">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /><span>No surprises. Ever.</span></div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /><span>Cancel anytime with 30 days notice.</span></div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#9FB2CD] mb-1.5 block">Pricing & Closing Discussion Notes</label>
                  <Textarea
                    value={pricingNotes}
                    onChange={(e) => { setPricingNotes(e.target.value); triggerSave(); }}
                    placeholder="Take notes on client budget preferences, student needs, payment schedule..."
                    className="bg-[#040C1A] border-[#23395B] text-[#FFF5DA] placeholder:text-[#667C9E] text-sm resize-none rounded-xl"
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 6: Additional Notes */}
          <div className="space-y-2">
            <SectionHeader
              number={6}
              title="Additional Notes"
              subtitle="General discovery observations synced to client profile"
              badge="Station 06"
              isOpen={openSections[6]}
              onToggle={() => toggleSection(6)}
            />
            {openSections[6] && (
              <div className="rounded-xl bg-gradient-to-b from-[#0C1F3C] via-[#091830] to-[#061123] border border-[#243B61] p-5 space-y-3 shadow-[0_12px_32px_rgba(0,0,0,0.65)]">
                <p className="text-xs text-[#8DA2C0]">These notes auto-save to the client profile (advocate-only).</p>
                <Textarea
                  value={additionalNotes}
                  onChange={(e) => { setAdditionalNotes(e.target.value); triggerSave(); }}
                  placeholder="Add notes from their responses..."
                  className="bg-[#040C1A] border-[#23395B] text-[#FFF5DA] placeholder:text-[#667C9E] text-sm resize-none rounded-xl"
                  rows={6}
                />
              </div>
            )}
          </div>

          {/* Section 7: Private Advocate Notes */}
          <div className="space-y-2">
            <SectionHeader
              number={7}
              title="Private Advocate Notes"
              subtitle="Confidential internal strategy notes — never visible in parent portal"
              badge="Advocate Only"
              isOpen={openSections[7]}
              onToggle={() => toggleSection(7)}
            />
            {openSections[7] && (
              <div className="rounded-xl bg-gradient-to-b from-[#0C1F3C] via-[#091830] to-[#061123] border border-[#243B61] p-5 space-y-3 shadow-[0_12px_32px_rgba(0,0,0,0.65)]">
                <div className="flex items-center gap-2 text-xs text-[#FFE394]">
                  <Lock className="w-3.5 h-3.5 text-[#E5C168]" />
                  <span>These notes are private and only visible to advocates. Auto-saved to client profile.</span>
                </div>
                <Textarea
                  value={privateNotes}
                  onChange={(e) => { setPrivateNotes(e.target.value); triggerSave(); }}
                  placeholder="Add private notes..."
                  className="bg-[#040C1A] border-[#23395B] text-[#FFF5DA] placeholder:text-[#667C9E] text-sm resize-none rounded-xl"
                  rows={6}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== RESOURCES TAB ===== */}
      {activeTab === "resources" && (
        <div className="pb-10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2
                className="text-xl font-bold text-[#FFF5DA]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Rescue Resources Directory
              </h2>
              <p className="text-xs text-[#9FB2CD]">
                Trusted evaluators, therapists, and special education specialists to share with families
              </p>
            </div>
            <button
              onClick={() => setAddResourceOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-gradient-to-b from-[#EAD08A] via-[#CEA452] to-[#9E762A] hover:brightness-105 text-[#07162B] font-bold text-xs border border-[#FFE5A3]/70 shadow cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Resource
            </button>
          </div>

          {!resources || resources.length === 0 ? (
            <div className="rounded-2xl bg-gradient-to-b from-[#0C1F3C] via-[#091830] to-[#061123] border border-[#243B61] p-10 text-center">
              <BookOpen className="w-10 h-10 text-[#E5C168]/40 mx-auto mb-3" />
              <p className="text-[#9FB2CD] text-sm">No resources yet. Add evaluators, therapists, or other contacts to share with families.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {resources.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl bg-gradient-to-b from-[#0C1F3C] via-[#091830] to-[#061123] border border-[#243B61] hover:border-[#C5A059]/60 transition-all p-5 space-y-3 shadow-[0_10px_28px_rgba(0,0,0,0.65)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3
                        className="font-bold text-base text-[#FFF5DA]"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                      >
                        {r.name}
                      </h3>
                      {r.specialty && <p className="text-xs text-[#FFE394] mt-0.5">{r.specialty}</p>}
                      {r.category && (
                        <Badge className="mt-1.5 bg-[#040C1A] text-[#C5D3E8] text-[10px] border border-[#243B61]">
                          {r.category}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditResourceId(r.id)} className="text-[#8DA2C0] hover:text-[#FFE394] transition-colors p-1 cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Delete this resource?")) deleteResourceMutation.mutate({ id: r.id });
                        }}
                        className="text-[#8DA2C0] hover:text-red-400 transition-colors p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-[#C5D3E8]">
                    {r.phone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-[#E5C168]" />{r.phone}</div>}
                    {r.email && <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-[#E5C168]" />{r.email}</div>}
                    {r.website && (
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3 h-3 text-[#E5C168]" />
                        <a href={r.website} target="_blank" rel="noopener noreferrer" className="text-[#FFE394] hover:underline truncate">
                          {r.website}
                        </a>
                      </div>
                    )}
                    {r.notes && <p className="text-[#8DA2C0] mt-1">{r.notes}</p>}
                  </div>
                  <button
                    onClick={() => {
                      setShareResourceId(r.id);
                      setShareContactId(lead?.contactId ?? null);
                      setShareMessage("");
                      setResourceDialogOpen(true);
                    }}
                    className="w-full h-9 rounded-xl bg-[#051022] hover:bg-[#0D2140] border border-[#C5A059]/45 text-[#FFE394] text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-[#E5C168]" />
                    Share with Family
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </div>

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

      {/* Shared Family Enrollment Approval Modal */}
      <FamilyEnrollmentApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        parentContactId={lead?.contactId || 0}
        leadId={leadId}
        familyName={parentName}
        studentName={studentName}
        onSuccess={() => {
          toast.success("Family enrollment approved successfully.");
        }}
      />
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
