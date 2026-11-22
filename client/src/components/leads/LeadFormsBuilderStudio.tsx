import React, { useEffect, useMemo, useState } from "react";
import {
  Type,
  AlignLeft,
  List,
  CheckSquare,
  ToggleLeft,
  Calendar,
  Phone,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Eye,
  Sparkles,
  Settings,
  User,
  GraduationCap,
  Heart,
  CheckCircle2,
  Lock,
  Layers,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  ALL_FIELDS,
  DEFAULT_FIELDS,
  parseFormBuilderConfig,
  serializeFormBuilderConfig,
  type CustomFormQuestion,
  type CustomQuestionType,
  type FieldKey,
} from "@/lib/formFields";

interface LeadFormsBuilderStudioProps {
  allForms: any[];
  publicIntakeForm: any;
  businessPhone?: string;
  onSaved: () => void;
  onOpenCreateModal: () => void;
}

const QUESTION_TOOLBOX: {
  type: CustomQuestionType;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultLabel: string;
  defaultPlaceholder?: string;
  defaultOptions?: string[];
}[] = [
  {
    type: "short_text",
    label: "Short Text Field",
    subtitle: "Single-line answer",
    icon: Type,
    defaultLabel: "Current IEP Case Manager / Coordinator",
    defaultPlaceholder: "Enter name or role…",
  },
  {
    type: "long_text",
    label: "Long Paragraph",
    subtitle: "Multi-line detailed response",
    icon: AlignLeft,
    defaultLabel: "What accommodations or services are currently missing?",
    defaultPlaceholder: "Share details about services, goals, or placement…",
  },
  {
    type: "dropdown",
    label: "Dropdown Select",
    subtitle: "Single choice from list",
    icon: List,
    defaultLabel: "Current Plan Type",
    defaultOptions: [
      "Active IEP",
      "Active 504 Plan",
      "Initial Evaluation Requested",
      "Private School / Service Plan",
      "No Plan Yet",
    ],
  },
  {
    type: "checkboxes",
    label: "Multi-Checkboxes",
    subtitle: "Select all that apply",
    icon: CheckSquare,
    defaultLabel: "Primary Areas of Advocacy Support Needed",
    defaultOptions: [
      "IEP Goal & Service Audit",
      "Upcoming IEP Meeting Representation",
      "Independent Educational Evaluation (IEE)",
      "Prior Written Notice / Dispute Resolution",
      "School Placement or Transition",
    ],
  },
  {
    type: "yes_no",
    label: "Yes / No Toggle",
    subtitle: "Quick binary question",
    icon: ToggleLeft,
    defaultLabel: "Do you have an IEP or 504 meeting scheduled in the next 30 days?",
  },
  {
    type: "date",
    label: "Date Picker",
    subtitle: "Meeting or evaluation date",
    icon: Calendar,
    defaultLabel: "Next Scheduled IEP Meeting Date",
  },
  {
    type: "phone",
    label: "Phone Number",
    subtitle: "Formatted telephone input",
    icon: Phone,
    defaultLabel: "Emergency / Alternate Contact Number",
    defaultPlaceholder: "(404) 555-0100",
  },
];

const QUICK_ADVOCACY_PRESETS: {
  label: string;
  step: 1 | 2 | 3;
  type: CustomQuestionType;
  placeholder?: string;
  options?: string[];
}[] = [
  {
    label: "Current Plan Status (IEP / 504 / Evaluation)",
    step: 2,
    type: "dropdown",
    options: [
      "Current IEP",
      "Current 504 Plan",
      "Requesting Initial Evaluation",
      "Transitioning Districts",
      "Other",
    ],
  },
  {
    label: "Next Upcoming IEP / School Meeting Date",
    step: 3,
    type: "date",
  },
  {
    label: "Has the school issued a Prior Written Notice (PWN) recently?",
    step: 3,
    type: "yes_no",
  },
  {
    label: "Most Recent Psychoeducational Evaluation Year",
    step: 2,
    type: "short_text",
    placeholder: "e.g., Spring 2025 or Never Evaluated",
  },
  {
    label: "Desired Outcome for Your Child This School Year",
    step: 3,
    type: "long_text",
    placeholder: "What would a successful IEP outcome look like for your family?",
  },
];

export function LeadFormsBuilderStudio({
  allForms,
  publicIntakeForm,
  businessPhone,
  onSaved,
  onOpenCreateModal,
}: LeadFormsBuilderStudioProps) {
  // Combine publicIntakeForm + custom forms so any form can be visually built
  const availableForms = useMemo(() => {
    const list: any[] = [];
    if (publicIntakeForm) {
      list.push(publicIntakeForm);
    }
    if (Array.isArray(allForms)) {
      for (const f of allForms) {
        if (!list.some((x) => x.id === f.id || x.slug === f.slug)) {
          list.push(f);
        }
      }
    }
    return list;
  }, [allForms, publicIntakeForm]);

  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
  const activeForm = useMemo(() => {
    if (selectedFormId) {
      const found = availableForms.find((f) => f.id === selectedFormId);
      if (found) return found;
    }
    return availableForms[0] || null;
  }, [availableForms, selectedFormId]);

  // Active Step inside the Interactive Builder (1 = Parent, 2 = Student, 3 = Concerns, 4 = Scheduling)
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);

  // Selected Field or Custom Question for the Right Inspector Panel
  const [selectedItemKey, setSelectedItemKey] = useState<string>("parentFirstName");

  // Builder Draft State
  const [formName, setFormName] = useState("Public Family Intake Form");
  const [formDescription, setFormDescription] = useState("");
  const [schedulingEnabled, setSchedulingEnabled] = useState(true);
  const [schedulingLabel, setSchedulingLabel] = useState(
    "Schedule Your Consultation"
  );
  const [sessionTypeId, setSessionTypeId] = useState<number | null>(null);
  const [enabledFields, setEnabledFields] = useState<FieldKey[]>([
    ...DEFAULT_FIELDS,
  ]);
  const [customLabels, setCustomLabels] = useState<Record<string, string>>({});
  const [customPlaceholders, setCustomPlaceholders] = useState<
    Record<string, string>
  >({});
  const [stepTitles, setStepTitles] = useState<{
    step1?: string;
    step2?: string;
    step3?: string;
    step4?: string;
  }>({});
  const [customQuestions, setCustomQuestions] = useState<CustomFormQuestion[]>(
    []
  );
  const [isDirty, setIsDirty] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const { data: sessionTypes = [] } = trpc.sessionTypes.list.useQuery();

  // Hydrate builder state whenever activeForm changes
  useEffect(() => {
    if (!activeForm) return;
    setSelectedFormId(activeForm.id);
    setFormName(activeForm.name || "Public Family Intake Form");
    setFormDescription(activeForm.description || "");
    setSchedulingEnabled(Boolean(activeForm.schedulingEnabled));
    setSchedulingLabel(
      activeForm.schedulingLabel || "Schedule Your Consultation"
    );
    setSessionTypeId(activeForm.sessionTypeId ?? null);

    let parsedFields: FieldKey[] = [...DEFAULT_FIELDS];
    if (activeForm.fields) {
      try {
        const raw =
          typeof activeForm.fields === "string"
            ? JSON.parse(activeForm.fields)
            : activeForm.fields;
        if (Array.isArray(raw) && raw.length > 0) {
          parsedFields = raw as FieldKey[];
        }
      } catch {
        // use defaults
      }
    }
    setEnabledFields(parsedFields);

    const parsedBuilder = parseFormBuilderConfig(activeForm.customLabels);
    setCustomLabels(parsedBuilder.labels);
    setCustomPlaceholders(parsedBuilder.placeholders);
    setStepTitles(parsedBuilder.stepTitles);
    setCustomQuestions(parsedBuilder.customQuestions);
    setIsDirty(false);
  }, [activeForm?.id]);

  const updateFormMutation = trpc.leadForms.update.useMutation({
    onSuccess: () => {
      setIsDirty(false);
      toast.success(`Saved form builder changes to "${formName}"!`);
      onSaved();
    },
    onError: (err) => toast.error("Failed to save form: " + err.message),
  });

  const handleSaveBuilder = () => {
    if (!activeForm) return;
    const serializedCustomConfig = serializeFormBuilderConfig({
      labels: customLabels,
      placeholders: customPlaceholders,
      stepTitles,
      customQuestions,
    });

    updateFormMutation.mutate({
      id: activeForm.id,
      name: formName.trim() || activeForm.name,
      description: formDescription.trim() || undefined,
      schedulingEnabled,
      schedulingLabel: schedulingLabel.trim() || "Schedule Your Consultation",
      sessionTypeId: sessionTypeId ?? null,
      fields: enabledFields,
      customLabels: serializedCustomConfig,
    });
  };

  const toggleStandardField = (key: FieldKey) => {
    const meta = ALL_FIELDS.find((f) => f.key === key);
    if (meta?.required) {
      toast.info(`"${meta.label}" is a required core identity field.`);
      return;
    }
    setIsDirty(true);
    setEnabledFields((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleAddCustomQuestion = (
    type: CustomQuestionType,
    preset?: {
      label?: string;
      step?: 1 | 2 | 3;
      placeholder?: string;
      options?: string[];
    }
  ) => {
    const toolMeta =
      QUESTION_TOOLBOX.find((t) => t.type === type) || QUESTION_TOOLBOX[0];
    const targetStep: 1 | 2 | 3 =
      preset?.step || (activeStep === 4 ? 3 : activeStep);
    const newId = `cq_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 5)}`;

    const newQuestion: CustomFormQuestion = {
      id: newId,
      label: preset?.label || toolMeta.defaultLabel,
      type,
      step: targetStep,
      required: false,
      placeholder: preset?.placeholder || toolMeta.defaultPlaceholder || "",
      helpText: "",
      options: preset?.options
        ? [...preset.options]
        : toolMeta.defaultOptions
        ? [...toolMeta.defaultOptions]
        : undefined,
    };

    setCustomQuestions((prev) => [...prev, newQuestion]);
    setActiveStep(targetStep);
    setSelectedItemKey(newId);
    setIsDirty(true);
    toast.success(`Added "${newQuestion.label}" to Step ${targetStep}`);
  };

  const handleUpdateCustomQuestion = (
    id: string,
    patch: Partial<CustomFormQuestion>
  ) => {
    setIsDirty(true);
    setCustomQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...patch } : q))
    );
  };

  const handleMoveCustomQuestion = (id: string, dir: -1 | 1) => {
    setIsDirty(true);
    setCustomQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === id);
      if (idx < 0) return prev;
      const targetIdx = idx + dir;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, item);
      return copy;
    });
  };

  const handleDeleteCustomQuestion = (id: string) => {
    setIsDirty(true);
    setCustomQuestions((prev) => prev.filter((q) => q.id !== id));
    setSelectedItemKey("parentFirstName");
    toast.success("Removed custom question");
  };

  // Resolve currently selected item for the Right Inspector
  const selectedStandardField = useMemo(
    () => ALL_FIELDS.find((f) => f.key === selectedItemKey) || null,
    [selectedItemKey]
  );
  const selectedCustomQuestion = useMemo(
    () => customQuestions.find((q) => q.id === selectedItemKey) || null,
    [customQuestions, selectedItemKey]
  );

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://waypointadvocates.com";
  const formUrl = `${origin}/form/${activeForm?.slug || "public-intake"}`;

  const stepFields = useMemo(
    () => ALL_FIELDS.filter((f) => f.step === activeStep),
    [activeStep]
  );
  const stepCustomQuestions = useMemo(
    () => customQuestions.filter((q) => q.step === activeStep),
    [customQuestions, activeStep]
  );

  return (
    <div
      data-testid="lead-forms-interactive-builder"
      className="rounded-xl bg-[#05142B]/95 border border-[#3A2C18] shadow-[0_12px_32px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.08)] overflow-hidden flex flex-col"
    >
      {/* ── 1. BUILDER STUDIO TOP COMMAND BAR ── */}
      <div className="px-4 sm:px-5 py-3.5 bg-[#030C1D] border-b border-[#3A2C18] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            <span
              className="text-sm sm:text-base font-bold text-[#FFF4D4]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Interactive Form Builder Studio
            </span>
          </div>

          {/* Form Selector Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono uppercase text-[#A69371]">
              Editing Form:
            </span>
            <select
              data-testid="builder-form-selector"
              value={activeForm?.id ?? ""}
              onChange={(e) => setSelectedFormId(Number(e.target.value))}
              className="h-8 px-3 rounded-lg bg-[#07162B] border border-[#C5A059]/60 text-xs font-semibold text-[#FFE394] focus:outline-none cursor-pointer"
            >
              {availableForms.map((f) => (
                <option key={f.id} value={f.id} className="bg-[#05142B]">
                  {f.name} ({f.slug === "public-intake" ? "Default" : `/${f.slug}`})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onOpenCreateModal}
              title="Create a new custom form"
              className="h-8 px-2.5 rounded-lg border border-[#3A2C18] bg-[#020A17] hover:border-[#C5A059] text-xs font-semibold text-[#FAD77B] inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Form</span>
            </button>
          </div>
        </div>

        {/* Right Controls: URL Copy | Preview Live | Save Builder */}
        <div className="flex flex-wrap items-center gap-2">
          {isDirty && (
            <span className="px-2.5 py-0.5 rounded-full bg-[#C5A059]/20 border border-[#FFE394]/50 text-[#FFE394] text-[11px] font-semibold">
              Unsaved Builder Changes
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(formUrl);
              setCopiedUrl(true);
              toast.success("Form URL copied!");
              setTimeout(() => setCopiedUrl(false), 2000);
            }}
            className="h-8 px-3 rounded-lg border border-[#3A2C18] bg-[#020A17] hover:border-[#C5A059] text-xs text-[#D8C7A5] hover:text-[#FFF4D4] inline-flex items-center gap-1.5 cursor-pointer"
          >
            {copiedUrl ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[#FAD77B]" />
            )}
            <span>Copy Link</span>
          </button>

          <button
            type="button"
            data-testid="builder-preview-live-btn"
            onClick={() =>
              window.open(
                `${formUrl}?preview=true&step=${activeStep}`,
                "_blank"
              )
            }
            className="h-8 px-3 rounded-lg border border-[#3A2C18] bg-[#020A17] hover:border-[#C5A059] text-xs font-semibold text-[#FFE394] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview Step {activeStep}</span>
          </button>

          <button
            type="button"
            data-testid="builder-save-form-btn"
            disabled={updateFormMutation.isPending || !activeForm}
            onClick={handleSaveBuilder}
            className="h-8 px-4 rounded-lg bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-bold text-xs inline-flex items-center gap-1.5 shadow-[0_3px_10px_rgba(0,0,0,0.8)] cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>
              {updateFormMutation.isPending ? "Saving…" : "Save Form Builder"}
            </span>
          </button>
        </div>
      </div>

      {/* ── 2. THREE-PANE INTERACTIVE FORM BUILDER WORKSPACE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[640px] divide-y lg:divide-y-0 lg:divide-x divide-[#3A2C18]">
        {/* ── LEFT PANE (3 Cols): FIELD TOOLBOX & ADVOCACY QUESTION PALETTE ── */}
        <aside className="lg:col-span-3 p-4 bg-[#030C1B]/90 flex flex-col justify-between gap-4 overflow-y-auto max-h-[720px]">
          <div className="space-y-4">
            {/* Section A: Add Custom Question Palette */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#FAD77B] font-bold">
                  1. Add Custom Question
                </span>
                <span className="text-[10px] font-mono text-[#A69371]">
                  To Step {activeStep === 4 ? 3 : activeStep}
                </span>
              </div>
              <p className="text-[11px] text-[#C6B697]">
                Click any field type to insert a custom question into the current step:
              </p>

              <div className="grid grid-cols-1 gap-1.5">
                {QUESTION_TOOLBOX.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.type}
                      type="button"
                      data-testid={`builder-add-type-${tool.type}`}
                      onClick={() => handleAddCustomQuestion(tool.type)}
                      className="p-2.5 rounded-xl bg-[#05142B] hover:bg-[#0A2046] border border-[#3A2C18] hover:border-[#C5A059] text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#020A17] border border-[#3A2C18] group-hover:border-[#C5A059]/60 flex items-center justify-center text-[#FFE394] shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[#FFF4D4] truncate">
                            {tool.label}
                          </div>
                          <div className="text-[10px] text-[#A69371] truncate">
                            {tool.subtitle}
                          </div>
                        </div>
                      </div>
                      <Plus className="w-4 h-4 text-[#FAD77B] shrink-0 opacity-75 group-hover:opacity-100" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section B: 1-Click Special Education Advocacy Question Presets */}
            <div className="space-y-2 pt-3 border-t border-[#3A2C18]">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#FAD77B] font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>2. IEP Advocacy Presets</span>
              </span>
              <div className="space-y-1.5">
                {QUICK_ADVOCACY_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      handleAddCustomQuestion(preset.type, {
                        label: preset.label,
                        step: preset.step,
                        placeholder: preset.placeholder,
                        options: preset.options,
                      })
                    }
                    className="w-full p-2 rounded-lg bg-[#020A17]/90 hover:bg-[#081A38] border border-[#3A2C18] hover:border-[#C5A059]/60 text-left flex items-center justify-between gap-2 text-[11px] text-[#D8C7A5] hover:text-[#FFF4D4] cursor-pointer"
                  >
                    <span className="line-clamp-1">{preset.label}</span>
                    <span className="text-[9px] font-mono text-[#FFE394] px-1.5 py-0.5 rounded bg-[#C5A059]/15 shrink-0">
                      +Step {preset.step}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Section C: Standard CRM Mapped Fields Toggle List */}
            {activeStep !== 4 && (
              <div className="space-y-2 pt-3 border-t border-[#3A2C18]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#FAD77B] font-bold">
                    3. Step {activeStep} CRM Mapped Fields
                  </span>
                  <span className="text-[10px] font-mono text-[#FFE394]">
                    {
                      stepFields.filter((f) => enabledFields.includes(f.key))
                        .length
                    }
                    /{stepFields.length}
                  </span>
                </div>
                <div className="space-y-1">
                  {stepFields.map((field) => {
                    const isOn = enabledFields.includes(field.key);
                    const isSelected = selectedItemKey === field.key;
                    const displayLabel =
                      customLabels[field.key] || field.label;
                    return (
                      <div
                        key={field.key}
                        onClick={() => setSelectedItemKey(field.key)}
                        className={`px-2.5 py-2 rounded-lg border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                          isSelected
                            ? "bg-[#0B2144] border-[#C5A059] text-[#FFF4D4]"
                            : "bg-[#020A17]/80 border-[#3A2C18]/70 text-[#C6B697] hover:border-[#C5A059]/40"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium truncate flex items-center gap-1.5">
                            <span>{displayLabel}</span>
                            {field.required && (
                              <Lock className="w-2.5 h-2.5 text-[#FAD77B] shrink-0" />
                            )}
                          </div>
                        </div>
                        <Switch
                          checked={isOn}
                          disabled={field.required}
                          onCheckedChange={() => toggleStandardField(field.key)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── CENTER PANE (6 Cols): LIVE INTERACTIVE FORM CANVAS ── */}
        <main className="lg:col-span-6 p-4 sm:p-6 bg-[#020916] flex flex-col justify-between gap-4 overflow-y-auto max-h-[720px]">
          <div className="space-y-4">
            {/* Step Switcher Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#3A2C18]">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    {
                      step: 1 as const,
                      title: stepTitles.step1 || "1. Parent / Guardian",
                      icon: User,
                    },
                    {
                      step: 2 as const,
                      title: stepTitles.step2 || "2. Student Profile",
                      icon: GraduationCap,
                    },
                    {
                      step: 3 as const,
                      title: stepTitles.step3 || "3. IEP Concerns",
                      icon: Heart,
                    },
                    {
                      step: 4 as const,
                      title: stepTitles.step4 || "4. Discovery Scheduler",
                      icon: Calendar,
                    },
                  ] as const
                ).map((s) => {
                  const Icon = s.icon;
                  const isCurrent = activeStep === s.step;
                  return (
                    <button
                      key={s.step}
                      type="button"
                      data-testid={`builder-step-tab-${s.step}`}
                      onClick={() => setActiveStep(s.step)}
                      className={`h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                        isCurrent
                          ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-md"
                          : "bg-[#05142B] border border-[#3A2C18] text-[#C6B697] hover:text-[#FFF4D4]"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{s.title}</span>
                    </button>
                  );
                })}
              </div>

              <span className="text-[10px] font-mono text-[#A69371]">
                Click any field on the canvas to edit its label & options
              </span>
            </div>

            {/* Simulated Public Form Card Canvas */}
            <div className="rounded-2xl bg-[#071A38]/90 border border-[#C5A059]/40 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.85)] space-y-4">
              {/* Form Canvas Title Banner */}
              <div className="pb-3 border-b border-[#3A2C18] flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[#FAD77B]">
                    WAYPOINT ADVOCATES · STEP {activeStep} OF{" "}
                    {schedulingEnabled ? 4 : 3}
                  </div>
                  <h3
                    className="text-lg font-bold text-[#FFF4D4]"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    {formName}
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#020A17] border border-[#3A2C18] text-[10px] font-mono text-[#FFE394]">
                  /form/{activeForm?.slug || "public-intake"}
                </span>
              </div>

              {/* Steps 1–3 Field Canvas */}
              {activeStep !== 4 ? (
                <div className="space-y-3">
                  {/* Standard Enabled CRM Fields for this Step */}
                  {stepFields
                    .filter((f) => enabledFields.includes(f.key))
                    .map((field) => {
                      const isSelected = selectedItemKey === field.key;
                      const displayLabel =
                        customLabels[field.key] || field.label;
                      const displayPlaceholder =
                        customPlaceholders[field.key] || field.placeholder;
                      return (
                        <div
                          key={field.key}
                          data-testid={`canvas-field-${field.key}`}
                          onClick={() => setSelectedItemKey(field.key)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[#0D2752] border-[#FFE394] ring-1 ring-[#FFE394]/50 shadow-[0_0_16px_rgba(255,227,148,0.2)]"
                              : "bg-[#041024]/90 border-[#3A2C18] hover:border-[#C5A059]/60"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-xs font-semibold text-[#FFF4D4] flex items-center gap-1.5">
                              <span>{displayLabel}</span>
                              {field.required && (
                                <span className="text-[#FAD77B] font-bold">
                                  *
                                </span>
                              )}
                              {customLabels[field.key] && (
                                <span className="px-1.5 py-0.2 rounded bg-[#C5A059]/20 text-[#FFE394] text-[9px] font-mono">
                                  Custom Label
                                </span>
                              )}
                            </span>
                            <span className="text-[9px] font-mono uppercase text-[#A69371]">
                              CRM Field · {field.type}
                            </span>
                          </div>

                          {field.type === "textarea" ? (
                            <div className="h-16 rounded-lg bg-[#020A17] border border-[#3A2C18]/80 p-2 text-xs text-[#A69371]">
                              {displayPlaceholder}
                            </div>
                          ) : (
                            <div className="h-9 rounded-lg bg-[#020A17] border border-[#3A2C18]/80 px-3 flex items-center text-xs text-[#A69371]">
                              {displayPlaceholder}
                            </div>
                          )}
                        </div>
                      );
                    })}

                  {/* Custom Builder Questions for this Step */}
                  {stepCustomQuestions.map((cq) => {
                    const isSelected = selectedItemKey === cq.id;
                    return (
                      <div
                        key={cq.id}
                        data-testid={`canvas-custom-question-${cq.id}`}
                        onClick={() => setSelectedItemKey(cq.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#0D2752] border-[#FFE394] ring-1 ring-[#FFE394]/50 shadow-[0_0_16px_rgba(255,227,148,0.2)]"
                            : "bg-[#051836]/95 border-[#C5A059]/50 hover:border-[#FFE394]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[9px] font-mono uppercase shrink-0">
                              Custom · {cq.type.replace("_", " ")}
                            </span>
                            <span className="text-xs font-semibold text-[#FFF4D4] truncate">
                              {cq.label}
                            </span>
                            {cq.required && (
                              <span className="text-[#FAD77B] font-bold">
                                *
                              </span>
                            )}
                          </div>

                          <div
                            className="flex items-center gap-1 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                handleMoveCustomQuestion(cq.id, -1)
                              }
                              title="Move Up"
                              className="p-1 rounded bg-[#020A17] border border-[#3A2C18] text-[#C6B697] hover:text-white cursor-pointer"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveCustomQuestion(cq.id, 1)}
                              title="Move Down"
                              className="p-1 rounded bg-[#020A17] border border-[#3A2C18] text-[#C6B697] hover:text-white cursor-pointer"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteCustomQuestion(cq.id)
                              }
                              title="Delete Question"
                              className="p-1 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300 hover:text-white cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Render preview according to question type */}
                        {cq.type === "long_text" && (
                          <div className="h-14 rounded-lg bg-[#020A17] border border-[#3A2C18] p-2 text-xs text-[#A69371]">
                            {cq.placeholder || "Long answer text…"}
                          </div>
                        )}
                        {(cq.type === "short_text" ||
                          cq.type === "phone" ||
                          cq.type === "date") && (
                          <div className="h-8.5 rounded-lg bg-[#020A17] border border-[#3A2C18] px-3 flex items-center text-xs text-[#A69371]">
                            {cq.type === "date"
                              ? "YYYY-MM-DD"
                              : cq.placeholder || "Short answer text…"}
                          </div>
                        )}
                        {cq.type === "dropdown" && (
                          <div className="space-y-1.5">
                            <div className="h-8.5 rounded-lg bg-[#020A17] border border-[#3A2C18] px-3 flex items-center justify-between text-xs text-[#D8C7A5]">
                              <span>Select an option…</span>
                              <span>▾</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {(cq.options || []).map((opt, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded bg-[#020A17] border border-[#3A2C18] text-[10px] text-[#C6B697]"
                                >
                                  {opt}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {cq.type === "checkboxes" && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                            {(cq.options || []).map((opt, idx) => (
                              <div
                                key={idx}
                                className="px-2.5 py-1.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[11px] text-[#D8C7A5] flex items-center gap-2"
                              >
                                <span className="w-3.5 h-3.5 rounded border border-[#C5A059]" />
                                <span className="truncate">{opt}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {cq.type === "yes_no" && (
                          <div className="flex items-center gap-2 pt-1">
                            <span className="px-3 py-1 rounded-lg bg-[#020A17] border border-[#C5A059] text-xs font-semibold text-[#FFE394]">
                              Yes
                            </span>
                            <span className="px-3 py-1 rounded-lg bg-[#020A17] border border-[#3A2C18] text-xs text-[#C6B697]">
                              No
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Quick Add Question Bar at Bottom of Canvas Step */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      data-testid="canvas-quick-add-question-btn"
                      onClick={() => handleAddCustomQuestion("short_text")}
                      className="h-8 px-3 rounded-lg border border-dashed border-[#C5A059]/60 bg-[#020A17]/70 hover:bg-[#0B2144] text-xs font-semibold text-[#FFE394] inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Custom Question to Step {activeStep}</span>
                    </button>
                    <span className="text-[11px] text-[#A69371]">
                      {
                        stepFields.filter((f) => enabledFields.includes(f.key))
                          .length
                      }{" "}
                      CRM fields + {stepCustomQuestions.length} custom questions
                    </span>
                  </div>
                </div>
              ) : (
                /* Step 4: Discovery Call Scheduling Step Configuration on Canvas */
                <div className="p-4 rounded-xl bg-[#041024] border border-[#3A2C18] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-5 h-5 text-[#FAD77B]" />
                      <div>
                        <div className="text-sm font-bold text-[#FFF4D4]">
                          Step 4 · Inline Discovery Call Scheduler
                        </div>
                        <div className="text-xs text-[#C6B697]">
                          Families can book their consultation immediately after Step 3
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={schedulingEnabled}
                      onCheckedChange={(v) => {
                        setSchedulingEnabled(v);
                        setIsDirty(true);
                      }}
                    />
                  </div>

                  {schedulingEnabled ? (
                    <div className="space-y-3 pt-2 border-t border-[#3A2C18]">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#FFE394]">
                          Connected Session Type (PG-008)
                        </label>
                        <select
                          value={sessionTypeId ?? ""}
                          onChange={(e) => {
                            setSessionTypeId(
                              e.target.value ? Number(e.target.value) : null
                            );
                            setIsDirty(true);
                          }}
                          className="w-full h-9 px-3 rounded-lg bg-[#020A17] border border-[#3A2C18] text-xs text-[#FFF4D4]"
                        >
                          <option value="">
                            — Default Discovery Call Calendar —
                          </option>
                          {sessionTypes.map((st: any) => (
                            <option key={st.id} value={st.id}>
                              {st.name} ({st.duration} {st.durationUnit})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#FFE394]">
                          Scheduling CTA Button Label
                        </label>
                        <input
                          value={schedulingLabel}
                          onChange={(e) => {
                            setSchedulingLabel(e.target.value);
                            setIsDirty(true);
                          }}
                          className="w-full h-9 px-3 rounded-lg bg-[#020A17] border border-[#3A2C18] text-xs text-[#FFF4D4]"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#A69371]">
                      Scheduling step is currently disabled for this form. Families will submit directly on Step 3.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* ── RIGHT PANE (3 Cols): FIELD & QUESTION PROPERTY INSPECTOR ── */}
        <aside className="lg:col-span-3 p-4 bg-[#030C1B]/90 flex flex-col justify-between gap-4 overflow-y-auto max-h-[720px]">
          <div className="space-y-4">
            <div className="pb-2 border-b border-[#3A2C18] flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#FAD77B] flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5" />
                <span>Field & Form Inspector</span>
              </span>
            </div>

            {/* Selected Standard CRM Field Inspector */}
            {selectedStandardField && (
              <div className="p-3.5 rounded-xl bg-[#05142B] border border-[#3A2C18] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-[#C5A059]/20 text-[#FFE394] text-[10px] font-mono uppercase">
                    CRM Mapped Field · Step {selectedStandardField.step}
                  </span>
                  {selectedStandardField.required && (
                    <span className="text-[10px] font-mono text-emerald-300">
                      Required Core Field
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#FFE394]">
                    Question Label Shown to Parents
                  </label>
                  <input
                    data-testid="inspector-field-label-input"
                    value={
                      customLabels[selectedStandardField.key] ??
                      selectedStandardField.label
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      setIsDirty(true);
                      setCustomLabels((prev) => {
                        const next = { ...prev };
                        if (!val || val === selectedStandardField.label) {
                          delete next[selectedStandardField.key];
                        } else {
                          next[selectedStandardField.key] = val;
                        }
                        return next;
                      });
                    }}
                    className="w-full h-8.5 px-2.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-xs text-[#FFF4D4] focus:outline-none focus:border-[#C5A059]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#FFE394]">
                    Placeholder Hint Text
                  </label>
                  <input
                    value={
                      customPlaceholders[selectedStandardField.key] ??
                      selectedStandardField.placeholder
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      setIsDirty(true);
                      setCustomPlaceholders((prev) => ({
                        ...prev,
                        [selectedStandardField.key]: val,
                      }));
                    }}
                    className="w-full h-8.5 px-2.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-xs text-[#D8C7A5] focus:outline-none focus:border-[#C5A059]"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#3A2C18]">
                  <span className="text-xs text-[#C6B697]">
                    Include on Form
                  </span>
                  <Switch
                    checked={enabledFields.includes(selectedStandardField.key)}
                    disabled={selectedStandardField.required}
                    onCheckedChange={() =>
                      toggleStandardField(selectedStandardField.key)
                    }
                  />
                </div>

                {(customLabels[selectedStandardField.key] ||
                  customPlaceholders[selectedStandardField.key]) && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDirty(true);
                      setCustomLabels((prev) => {
                        const n = { ...prev };
                        delete n[selectedStandardField.key];
                        return n;
                      });
                      setCustomPlaceholders((prev) => {
                        const n = { ...prev };
                        delete n[selectedStandardField.key];
                        return n;
                      });
                    }}
                    className="w-full h-7 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[11px] text-[#A69371] hover:text-white inline-flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset to Default Label</span>
                  </button>
                )}
              </div>
            )}

            {/* Selected Custom Question Inspector */}
            {selectedCustomQuestion && (
              <div className="p-3.5 rounded-xl bg-[#05142B] border border-[#C5A059]/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono uppercase">
                    Custom Question
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteCustomQuestion(selectedCustomQuestion.id)
                    }
                    className="text-[11px] text-rose-400 hover:text-rose-300 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#FFE394]">
                    Question Prompt
                  </label>
                  <input
                    data-testid="inspector-custom-question-label"
                    value={selectedCustomQuestion.label}
                    onChange={(e) =>
                      handleUpdateCustomQuestion(selectedCustomQuestion.id, {
                        label: e.target.value,
                      })
                    }
                    className="w-full h-8.5 px-2.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-xs text-[#FFF4D4]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#FFE394]">
                      Field Type
                    </label>
                    <select
                      value={selectedCustomQuestion.type}
                      onChange={(e) =>
                        handleUpdateCustomQuestion(selectedCustomQuestion.id, {
                          type: e.target.value as CustomQuestionType,
                        })
                      }
                      className="w-full h-8 px-2 rounded-lg bg-[#020A17] border border-[#3A2C18] text-xs text-[#FFF4D4]"
                    >
                      {QUESTION_TOOLBOX.map((t) => (
                        <option key={t.type} value={t.type}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#FFE394]">
                      Form Step
                    </label>
                    <select
                      value={selectedCustomQuestion.step}
                      onChange={(e) => {
                        const nextStep = Number(e.target.value) as 1 | 2 | 3;
                        handleUpdateCustomQuestion(selectedCustomQuestion.id, {
                          step: nextStep,
                        });
                        setActiveStep(nextStep);
                      }}
                      className="w-full h-8 px-2 rounded-lg bg-[#020A17] border border-[#3A2C18] text-xs text-[#FFF4D4]"
                    >
                      <option value={1}>Step 1 · Parent</option>
                      <option value={2}>Step 2 · Student</option>
                      <option value={3}>Step 3 · Concerns</option>
                    </select>
                  </div>
                </div>

                {(selectedCustomQuestion.type === "short_text" ||
                  selectedCustomQuestion.type === "long_text" ||
                  selectedCustomQuestion.type === "phone") && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#FFE394]">
                      Placeholder Hint
                    </label>
                    <input
                      value={selectedCustomQuestion.placeholder || ""}
                      onChange={(e) =>
                        handleUpdateCustomQuestion(selectedCustomQuestion.id, {
                          placeholder: e.target.value,
                        })
                      }
                      className="w-full h-8 px-2.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-xs text-[#D8C7A5]"
                    />
                  </div>
                )}

                {(selectedCustomQuestion.type === "dropdown" ||
                  selectedCustomQuestion.type === "checkboxes") && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#FFE394]">
                      Answer Choices (One per line)
                    </label>
                    <textarea
                      rows={4}
                      value={(selectedCustomQuestion.options || []).join("\n")}
                      onChange={(e) =>
                        handleUpdateCustomQuestion(selectedCustomQuestion.id, {
                          options: e.target.value
                            .split("\n")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      className="w-full p-2 rounded-lg bg-[#020A17] border border-[#3A2C18] text-xs text-[#FFF4D4] font-mono resize-none"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-[#3A2C18]">
                  <span className="text-xs text-[#C6B697]">
                    Required Question
                  </span>
                  <Switch
                    checked={selectedCustomQuestion.required}
                    onCheckedChange={(v) =>
                      handleUpdateCustomQuestion(selectedCustomQuestion.id, {
                        required: v,
                      })
                    }
                  />
                </div>
              </div>
            )}

            {/* Form-Wide Title & Step Header Customization */}
            <div className="p-3.5 rounded-xl bg-[#020A17]/90 border border-[#3A2C18] space-y-2.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#FAD77B] font-bold">
                Form Identity & Settings
              </span>
              <div className="space-y-1">
                <label className="text-[11px] text-[#C6B697]">Form Title</label>
                <input
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full h-8 px-2.5 rounded-lg bg-[#05142B] border border-[#3A2C18] text-xs text-[#FFF4D4]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-[#C6B697]">
                  Internal Subtitle / Notes
                </label>
                <input
                  value={formDescription}
                  onChange={(e) => {
                    setFormDescription(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="e.g., Primary family intake & discovery booking"
                  className="w-full h-8 px-2.5 rounded-lg bg-[#05142B] border border-[#3A2C18] text-xs text-[#D8C7A5]"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={updateFormMutation.isPending || !activeForm}
            onClick={handleSaveBuilder}
            className="w-full h-9 rounded-xl bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-bold text-xs inline-flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>
              {updateFormMutation.isPending
                ? "Saving Form…"
                : "Save Changes to Live Form"}
            </span>
          </button>
        </aside>
      </div>
    </div>
  );
}
