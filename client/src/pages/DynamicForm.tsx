import { useState, useEffect, useMemo } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  User,
  GraduationCap,
  Heart,
  Calendar,
  ExternalLink,
  Loader2,
  Eye,
  Phone,
  Check,
  Copy,
  FileText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import InlineScheduler from "@/components/InlineScheduler";
import PageIdBadge from "@/components/PageIdBadge";
import { ALL_FIELDS, DEFAULT_FIELDS } from "@/lib/formFields";
import type { FieldKey } from "@/lib/formFields";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const TIMEZONES = [
  "Eastern Time (ET)", "Central Time (CT)", "Mountain Time (MT)",
  "Pacific Time (PT)", "Alaska Time (AKT)", "Hawaii Time (HT)",
];

const GRADE_LEVELS = [
  "Pre-K", "Kindergarten", "1st Grade", "2nd Grade", "3rd Grade",
  "4th Grade", "5th Grade", "6th Grade", "7th Grade", "8th Grade",
  "9th Grade", "10th Grade", "11th Grade", "12th Grade", "Post-Secondary",
];

const HOW_HEARD = [
  "Google Search", "Social Media (Facebook/Instagram)", "Friend or Family Referral",
  "School Staff", "Therapist / Doctor", "Support Group", "Other",
];

// All available fields with their labels and which step they belong to
// ALL_FIELDS, FieldKey, DEFAULT_FIELDS are imported from @/lib/formFields);

interface FormData {
  parentFirstName: string; parentLastName: string; parentEmail: string; parentPhone: string;
  timezone: string; bestTimeToCall: string; howHeardAboutUs: string; referredBy: string;
  secondParentName: string; secondParentPhone: string; secondParentEmail: string;
  studentFirstName: string; studentLastName: string; dateOfBirth: string;
  diagnosis: string; schoolName: string; gradeLevel: string;
  city: string; state: string; zipCode: string; countyDistrict: string; challenges: string;
}

const EMPTY: FormData = {
  parentFirstName: "", parentLastName: "", parentEmail: "", parentPhone: "",
  timezone: "", bestTimeToCall: "", howHeardAboutUs: "", referredBy: "",
  secondParentName: "", secondParentPhone: "", secondParentEmail: "",
  studentFirstName: "", studentLastName: "", dateOfBirth: "",
  diagnosis: "", schoolName: "", gradeLevel: "", city: "", state: "", zipCode: "",
  countyDistrict: "", challenges: "",
};

export default function DynamicForm() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "public-intake";

  // Detect preview mode from URL query param
  const isPreview = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "true";
  // ?confirmed=true jumps straight to the confirmation screen (admin preview)
  const isConfirmedPreview = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("confirmed") === "true";
  // Support ?step=N to auto-jump to a specific step (useful for admin previewing the scheduler)
  const initialStep = (() => {
    if (typeof window === "undefined") return 1;
    const s = parseInt(new URLSearchParams(window.location.search).get("step") ?? "1", 10);
    return isNaN(s) || s < 1 ? 1 : s;
  })();

  const [step, setStep] = useState(initialStep);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitted, setSubmitted] = useState(isConfirmedPreview);
  const [confettiDone, setConfettiDone] = useState(false);
  const [caseId, setCaseId] = useState("");
  const [bookedSlot, setBookedSlot] = useState<{ date: string; time: string } | null>(null);
  const [copiedCaseId, setCopiedCaseId] = useState(false);
  const [worksheetUrl, setWorksheetUrl] = useState<string | null>(null);

  const { data: businessPhoneData } = trpc.system.getBusinessPhone.useQuery(undefined, { enabled: true });
  const [businessPhone, setBusinessPhone] = useState("");

  // Sync phone from server when available
  useEffect(() => {
    if (businessPhoneData?.phone) setBusinessPhone(businessPhoneData.phone);
  }, [businessPhoneData?.phone]);

  // Fire confetti when confirmation screen appears (including preview)
  useEffect(() => {
    if (submitted && !confettiDone) {
      setConfettiDone(true);
      import("canvas-confetti").then(({ default: confetti }) => {
        const end = Date.now() + 1200;
        const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"];
        (function frame() {
          confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
          confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
          if (Date.now() < end) requestAnimationFrame(frame);
        })();
      }).catch(() => {});
    }
  }, [submitted, confettiDone]);

  const { data: rawFormConfig, isLoading } = trpc.leadForms.getBySlug.useQuery(
    { slug },
    { retry: false, enabled: !!slug, refetchOnMount: "always", staleTime: 0 }
  );

  const fallbackFormConfig = useMemo(() => ({
    id: 0,
    ownerId: "default",
    name: "Public Intake Form",
    slug: slug || "public-intake",
    description: "Initial consultation and student intake form",
    schedulingEnabled: false,
    schedulingType: "builtin" as const,
    schedulingUrl: null,
    schedulingLabel: "Schedule Your Consultation",
    sessionTypeId: null,
    fields: JSON.stringify(DEFAULT_FIELDS),
    customLabels: null,
    isActive: true,
    confirmationHeadline: "Thank You!",
    confirmationBody: "Your intake form has been submitted successfully. Byron Honea will review your details and reach out shortly.",
    saveOurNumberMessage: "Save our number in your contacts so you don't miss our call!",
    confirmationImageUrl: null,
    confirmationHeadlineAlign: "center" as const,
  }), [slug]);

  // Use fetched form configuration from database; fall back to default template once loading finishes
  const formConfig = rawFormConfig || (!isLoading ? fallbackFormConfig : null);

  // Fetch session type details for confirmation screen (after formConfig is available)
  const sessionTypeId = (formConfig as any)?.sessionTypeId ?? null;
  const { data: sessionTypeData } = trpc.sessionTypes.getById.useQuery(
    { id: sessionTypeId! },
    { enabled: !!sessionTypeId, retry: false }
  );

  const submitMutation = trpc.leadForms.submit.useMutation({
    onSuccess: (data) => {
      setCaseId(data.caseId);
      setWorksheetUrl(data.worksheetUrl || null);
      setSubmitted(true);
    },
    onError: (e) => toast.error("Submission failed: " + e.message),
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCaseId(true);
      setTimeout(() => setCopiedCaseId(false), 2000);
    }).catch(() => toast.info("Case ID: " + text));
  };

  const set = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const totalSteps = formConfig?.schedulingEnabled ? 4 : 3;

  // Parse enabled fields from form config (dynamically reacts to saved DB preferences)
  const enabledFields: FieldKey[] = useMemo(() => {
    if (!formConfig?.fields) return DEFAULT_FIELDS;
    try {
      const parsed = typeof formConfig.fields === "string" ? JSON.parse(formConfig.fields) : formConfig.fields;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as FieldKey[];
    } catch { /* ignore */ }
    return DEFAULT_FIELDS;
  }, [formConfig?.fields]);

  const isFieldEnabled = (key: FieldKey) => enabledFields.includes(key);

  // Parse custom labels from form config
  const customLabels: Record<string, string> = useMemo(() => {
    if (!formConfig?.customLabels) return {};
    try {
      const parsed = typeof formConfig.customLabels === "string" ? JSON.parse(formConfig.customLabels) : formConfig.customLabels;
      if (parsed && typeof parsed === "object") return parsed as Record<string, string>;
    } catch { /* ignore */ }
    return {};
  }, [formConfig?.customLabels]);

  // Get the display label for a field (custom label overrides default)
  const getLabel = (key: FieldKey): string => {
    if (customLabels[key]) return customLabels[key];
    const field = ALL_FIELDS.find((f) => f.key === key);
    return field?.label ?? key;
  };

  const validateStep = () => {
    if (isPreview) return true; // skip all validation in preview mode
    if (step === 1) {
      if (isFieldEnabled("parentFirstName") && !form.parentFirstName.trim()) { toast.error("First name is required"); return false; }
      if (isFieldEnabled("parentLastName") && !form.parentLastName.trim()) { toast.error("Last name is required"); return false; }
      if (isFieldEnabled("parentEmail") && (!form.parentEmail.trim() || !form.parentEmail.includes("@"))) { toast.error("Valid email is required"); return false; }
      if (isFieldEnabled("parentPhone") && !form.parentPhone.trim()) { toast.error("Phone number is required"); return false; }
    }
    if (step === 2) {
      if (isFieldEnabled("studentFirstName") && !form.studentFirstName.trim()) { toast.error("Student first name is required"); return false; }
      if (isFieldEnabled("studentLastName") && !form.studentLastName.trim()) { toast.error("Student last name is required"); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, totalSteps));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = () => {
    if (isPreview) { toast.info("Preview mode — form won't be submitted"); return; }
    if (!validateStep()) return;
    submitMutation.mutate({
      slug,
      parentFirstName: form.parentFirstName, parentLastName: form.parentLastName,
      parentEmail: form.parentEmail, parentPhone: form.parentPhone,
      timezone: form.timezone || undefined, bestTimeToCall: form.bestTimeToCall || undefined,
      howHeardAboutUs: form.howHeardAboutUs || undefined, referredBy: form.referredBy || undefined,
      secondParentName: form.secondParentName || undefined, secondParentPhone: form.secondParentPhone || undefined,
      secondParentEmail: form.secondParentEmail || undefined,
      studentFirstName: form.studentFirstName, studentLastName: form.studentLastName,
      dateOfBirth: form.dateOfBirth || undefined, diagnosis: form.diagnosis || undefined,
      schoolName: form.schoolName || undefined, gradeLevel: form.gradeLevel || undefined,
      city: form.city || undefined, state: form.state || undefined, zipCode: form.zipCode || undefined,
      countyDistrict: form.countyDistrict || undefined, challenges: form.challenges || undefined,
    });
  };

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#000821] text-white flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-600/20 via-blue-700/10 to-transparent blur-3xl pointer-events-none -z-10" />
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#0A254D]/80 border border-[#0D4B84] flex items-center justify-center mx-auto shadow-xl shadow-blue-950/50">
            <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
          </div>
          <p className="text-sm font-medium text-blue-200/80 tracking-wide">Loading intake form...</p>
        </div>
      </div>
    );
  }

  // ── Not found ──
  if (!isLoading && !formConfig) {
    return (
      <div className="min-h-screen bg-[#000821] text-white flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-red-600/15 via-blue-900/10 to-transparent blur-3xl pointer-events-none -z-10" />
        <div className="max-w-md w-full bg-[#0A254D]/80 border border-[#0D4B84]/80 backdrop-blur-2xl rounded-3xl p-8 text-center space-y-4 shadow-2xl shadow-black/50">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center mx-auto shadow-lg shadow-red-500/20">
            <span className="text-red-400 text-2xl font-bold">✕</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Form Not Found</h1>
          <p className="text-blue-200/70 text-sm">This intake link is no longer active or does not exist. Please contact Waypoint Advocates for assistance.</p>
        </div>
      </div>
    );
  }

  // ── Success screen ──
  if (submitted) {
    const confHeadline = (formConfig as any)?.confirmationHeadline || "Thank You!";
    const confBody = (formConfig as any)?.confirmationBody || "Your information has been submitted successfully.";
    const confPhone = (formConfig as any)?.saveOurNumberMessage || "Remember to save our number!";
    const confImageUrl = (formConfig as any)?.confirmationImageUrl;
    const headlineAlign = ((formConfig as any)?.confirmationHeadlineAlign as "left" | "center") || "left";
    return (
      <div className="min-h-screen bg-[#000821] text-white flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        {/* Ambient deep blue glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-blue-600/20 via-blue-700/10 to-transparent blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#0D4B84]/20 blur-[100px] pointer-events-none -z-10" />

        <div className="max-w-xl w-full bg-[#0A254D]/80 backdrop-blur-2xl border border-[#0D4B84]/80 rounded-3xl p-6 sm:p-10 shadow-[0_24px_70px_rgba(0,8,33,0.9)] space-y-6 text-center relative overflow-hidden">
          {/* Top highlight bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500/40 via-blue-400/60 to-emerald-500/40" />

          {/* Animated checkmark */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400/80 flex items-center justify-center shadow-[0_0_35px_rgba(52,211,153,0.35)] animate-[bounce_0.6s_ease-out_1]">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
          </div>

          <div className={headlineAlign === "center" ? "text-center" : "text-left"}>
            <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">{confHeadline}</h1>
            <div className="text-blue-100/90 text-sm sm:text-base space-y-2">
              {confBody.split(/;|\n/).map((line: string, i: number) => {
                const trimmed = line.trim();
                return trimmed ? <p key={i} className="leading-relaxed">{trimmed}</p> : null;
              })}
            </div>
          </div>

          {/* Case ID card */}
          <div className="bg-[#030C22]/85 border border-[#0D4B84]/70 rounded-2xl p-5 text-left space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-blue-300/80 text-xs font-semibold uppercase tracking-wider">Case ID</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-mono font-bold text-lg">{caseId}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(caseId)}
                  className="p-1.5 rounded-lg bg-[#0A254D] border border-[#0D4B84] hover:bg-[#082148] transition-colors"
                  title="Copy Case ID"
                >
                  {copiedCaseId
                    ? <Check className="w-4 h-4 text-emerald-400" />
                    : <Copy className="w-4 h-4 text-blue-300" />}
                </button>
              </div>
            </div>
            <div className="border-t border-[#0D4B84]/50 pt-3">
              <p className="text-blue-200/80 text-xs sm:text-sm">
                We have received your intake and will be in touch within <strong className="text-white font-semibold">1–2 business days</strong>.
              </p>
            </div>
          </div>

          {/* QR code / image */}
          {confImageUrl && (
            <div className="flex justify-center p-2 rounded-2xl bg-[#030C22]/60 border border-[#0D4B84]/50">
              <img src={confImageUrl} alt="Contact QR code" className="max-h-52 max-w-full object-contain rounded-xl" />
            </div>
          )}

          {/* Worksheet section */}
          {worksheetUrl && (
            <div className="bg-gradient-to-br from-blue-600/20 via-[#0A254D]/60 to-indigo-600/20 border border-blue-400/40 rounded-2xl p-5 space-y-3 text-center">
              <div className="flex items-center gap-2 justify-center mb-1">
                <FileText className="w-5 h-5 text-blue-400" />
                <p className="text-blue-200 font-semibold text-base">Check Your Email</p>
              </div>
              <p className="text-blue-100/90 text-sm leading-relaxed">We've sent you a discovery call worksheet to get prepared for your discovery call with your advocate.</p>
              <p className="text-blue-300 font-medium italic text-xs">Confidence starts now.</p>
              <a
                href={worksheetUrl}
                download
                className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/30 transition-all text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Download Worksheet
              </a>
            </div>
          )}

          {/* Save our number notice */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 justify-center">
              <Phone className="w-4 h-4 text-amber-400" />
              <p className="text-amber-300 font-semibold text-sm">{confPhone}</p>
            </div>
            {businessPhone && (
              <div className="flex items-center justify-center">
                <span className="text-white font-mono text-xl font-bold tracking-wider">{businessPhone}</span>
              </div>
            )}
          </div>

          {/* Appointment details card — shown when a slot was booked */}
          {bookedSlot && (
            <div className="bg-[#030C22]/85 border border-blue-500/40 rounded-2xl p-5 text-left space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-blue-300 font-semibold text-xs uppercase tracking-wider">Your Appointment</p>
                  {sessionTypeData?.name && (
                    <p className="text-white font-bold text-base leading-tight mt-0.5">{sessionTypeData.name}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0A254D]/60 border border-[#0D4B84]/50 rounded-xl p-3">
                  <p className="text-blue-300/70 text-[10px] uppercase tracking-wider mb-1 font-semibold">Date</p>
                  <p className="text-white font-semibold text-sm">
                    {new Date(bookedSlot.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <div className="bg-[#0A254D]/60 border border-[#0D4B84]/50 rounded-xl p-3">
                  <p className="text-blue-300/70 text-[10px] uppercase tracking-wider mb-1 font-semibold">Time</p>
                  <p className="text-white font-semibold text-sm">
                    {(() => {
                      const [h, m] = bookedSlot.time.split(":").map(Number);
                      const period = h >= 12 ? "PM" : "AM";
                      return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${period} ET`;
                    })()}
                  </p>
                </div>
                {sessionTypeData && (
                  <div className="bg-[#0A254D]/60 border border-[#0D4B84]/50 rounded-xl p-3">
                    <p className="text-blue-300/70 text-[10px] uppercase tracking-wider mb-1 font-semibold">Format</p>
                    <p className="text-white font-semibold text-sm capitalize">
                      {sessionTypeData.sessionFormat === "video" ? "📹 Video Call" : "📞 Phone Call"}
                    </p>
                  </div>
                )}
                {sessionTypeData && (
                  <div className="bg-[#0A254D]/60 border border-[#0D4B84]/50 rounded-xl p-3">
                    <p className="text-blue-300/70 text-[10px] uppercase tracking-wider mb-1 font-semibold">Duration</p>
                    <p className="text-white font-semibold text-sm">
                      {sessionTypeData.duration} {sessionTypeData.durationUnit === "hours" ? (sessionTypeData.duration === 1 ? "hour" : "hours") : "min"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <p className="text-blue-200/60 text-xs">
            Please save your Case ID for reference. You will receive a confirmation email at{" "}
            <strong className="text-blue-100">{form.parentEmail}</strong>.
          </p>
        </div>
      </div>
    );
  }

  const STEPS = [
    { id: 1, title: "Parent / Guardian Info", icon: User },
    { id: 2, title: "Student Info", icon: GraduationCap },
    { id: 3, title: "Challenges & Concerns", icon: Heart },
    ...(formConfig.schedulingEnabled ? [{ id: 4, title: "Schedule a Session", icon: Calendar }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#000821] text-white flex flex-col relative overflow-x-hidden selection:bg-blue-600/40 selection:text-white">
      {/* Ambient Mesh & Radial Blue Gradients matching Waypoint CRM theme */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[550px] bg-gradient-to-b from-blue-600/20 via-blue-700/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-[#0D4B84]/20 blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-0 w-[600px] h-[600px] bg-blue-900/15 blur-[120px] pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(59,130,246,0.06)_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none -z-10 opacity-70" />

      {/* Preview Mode Banner */}
      {isPreview && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 px-6 py-2.5 flex items-center justify-center gap-2">
          <Eye className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-amber-300 text-sm font-medium">
            Preview Mode — This is how your form looks to families. Click through any step freely. No data will be submitted.
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 ml-2 h-7 px-2 text-xs"
            onClick={() => window.close()}
          >
            Close Preview
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-[#0D4B84]/50 bg-[#000821]/80 backdrop-blur-xl px-6 py-4 sticky top-0 z-30 shadow-[0_4px_24px_rgba(0,8,33,0.6)]">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 border border-blue-400/40 flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
              <span className="text-white font-extrabold text-base tracking-wider">W</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-white font-bold text-base sm:text-lg leading-tight tracking-tight">Waypoint Advocates</h1>
                <span className="hidden sm:inline-block text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-400/30">
                  Intake
                </span>
              </div>
              <p className="text-blue-200/70 text-xs mt-0.5 line-clamp-1">{formConfig.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0A254D]/70 border border-[#0D4B84]/70 text-[11px] font-medium text-blue-200/90 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Secure & FERPA-Compliant</span>
            </div>
            <PageIdBadge id="PG-028" name="Dynamic Intake Form" />
          </div>
        </div>
      </div>

      {/* Progress Steps — clickable in preview mode */}
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 pt-8 pb-4">
        <div className="bg-[#0A254D]/50 border border-[#0D4B84]/60 backdrop-blur-xl rounded-2xl p-3 sm:p-4 shadow-xl shadow-black/25">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isDone = step > s.id;
              return (
                <div key={s.id} className="flex items-center gap-2 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => isPreview && setStep(s.id)}
                    className={`flex items-center gap-2.5 flex-shrink-0 transition-all ${
                      isPreview ? "cursor-pointer" : "cursor-default"
                    } ${isActive ? "text-blue-300" : isDone ? "text-emerald-400" : "text-slate-400 hover:text-slate-300"}`}
                    title={isPreview ? `Jump to ${s.title}` : undefined}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xs font-bold transition-all ${
                        isActive
                          ? "border-blue-300 bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-[0_0_18px_rgba(59,130,246,0.65)] scale-105"
                          : isDone
                            ? "border-emerald-400/70 bg-emerald-500/15 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.25)]"
                            : isPreview
                              ? "border-[#0D4B84]/60 bg-[#030C22]/80 hover:border-blue-400/50 hover:text-blue-200"
                              : "border-[#0D4B84]/50 bg-[#030C22]/60 text-slate-400"
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <div className="hidden sm:block text-left min-w-0">
                      <p className="text-[10px] uppercase tracking-wider font-semibold opacity-60">Step {s.id}</p>
                      <p className={`text-xs font-semibold truncate ${isActive ? "text-white" : isDone ? "text-emerald-300/90" : "text-slate-400"}`}>
                        {s.title}
                      </p>
                    </div>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 rounded-full transition-all ${
                        isDone ? "bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" : "bg-[#0D4B84]/40"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 pb-12">
        <div className="bg-[#0A254D]/75 backdrop-blur-2xl border border-[#0D4B84]/80 rounded-3xl p-6 sm:p-8 md:p-10 shadow-[0_20px_60px_rgba(0,8,33,0.85)] space-y-7 relative overflow-hidden">
          {/* Subtle top specular glow highlight */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />

          <div className="flex items-start justify-between flex-wrap gap-2 border-b border-[#0D4B84]/50 pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-400/30 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                Step {step} of {STEPS.length}
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{STEPS[step - 1].title}</h2>
              <p className="text-blue-200/70 text-sm mt-1">
                {step === 1 && "Tell us about yourself so Byron and our advocate team can connect with your family."}
                {step === 2 && "Share details about your child to help us tailor our IEP advocacy support."}
                {step === 3 && "Help us understand your school challenges, IEP roadblocks, and immediate priorities."}
                {step === 4 && "Choose a dedicated time for your initial Discovery consultation."}
              </p>
            </div>
          </div>

          {/* Step 1: Parent Info */}
          {step === 1 && (
            <div className="space-y-5">
              {(isFieldEnabled("parentFirstName") || isFieldEnabled("parentLastName")) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {isFieldEnabled("parentFirstName") && (
                    <div className="space-y-1.5">
                      <Label className="text-blue-100 font-medium text-xs sm:text-sm tracking-wide">
                        {getLabel("parentFirstName")} <span className="text-amber-400 font-bold ml-0.5">*</span>
                      </Label>
                      <Input
                        value={form.parentFirstName}
                        onChange={(e) => set("parentFirstName", e.target.value)}
                        placeholder="Jane"
                        className="bg-[#030C22]/85 border-[#0D4B84]/80 text-white placeholder:text-blue-200/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25 rounded-xl h-11 px-3.5 text-sm transition-all hover:border-[#1E40AF]"
                      />
                    </div>
                  )}
                  {isFieldEnabled("parentLastName") && (
                    <div className="space-y-1.5">
                      <Label className="text-blue-100 font-medium text-xs sm:text-sm tracking-wide">
                        {getLabel("parentLastName")} <span className="text-amber-400 font-bold ml-0.5">*</span>
                      </Label>
                      <Input
                        value={form.parentLastName}
                        onChange={(e) => set("parentLastName", e.target.value)}
                        placeholder="Smith"
                        className="bg-[#030C22]/85 border-[#0D4B84]/80 text-white placeholder:text-blue-200/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25 rounded-xl h-11 px-3.5 text-sm transition-all hover:border-[#1E40AF]"
                      />
                    </div>
                  )}
                </div>
              )}
              {isFieldEnabled("parentEmail") && (
                <div className="space-y-1.5">
                  <Label className="text-blue-100 font-medium text-xs sm:text-sm tracking-wide">
                    {getLabel("parentEmail")} <span className="text-amber-400 font-bold ml-0.5">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={form.parentEmail}
                    onChange={(e) => set("parentEmail", e.target.value)}
                    placeholder="jane@example.com"
                    className="bg-[#030C22]/85 border-[#0D4B84]/80 text-white placeholder:text-blue-200/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25 rounded-xl h-11 px-3.5 text-sm transition-all hover:border-[#1E40AF]"
                  />
                </div>
              )}
              {isFieldEnabled("parentPhone") && (
                <div className="space-y-1.5">
                  <Label className="text-blue-100 font-medium text-xs sm:text-sm tracking-wide">
                    {getLabel("parentPhone")} <span className="text-amber-400 font-bold ml-0.5">*</span>
                  </Label>
                  <Input
                    type="tel"
                    value={form.parentPhone}
                    onChange={(e) => set("parentPhone", e.target.value)}
                    placeholder="(555) 000-0000"
                    className="bg-[#030C22]/85 border-[#0D4B84]/80 text-white placeholder:text-blue-200/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25 rounded-xl h-11 px-3.5 text-sm transition-all hover:border-[#1E40AF]"
                  />
                </div>
              )}
              {(isFieldEnabled("timezone") || isFieldEnabled("bestTimeToCall")) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {isFieldEnabled("timezone") && (
                    <div className="space-y-1.5">
                      <Label className="text-blue-100 font-medium text-xs sm:text-sm tracking-wide">{getLabel("timezone")}</Label>
                      <Select value={form.timezone} onValueChange={(v) => set("timezone", v)}>
                        <SelectTrigger className="bg-[#030C22]/85 border-[#0D4B84]/80 text-white rounded-xl h-11 px-3.5 focus:ring-blue-500/25 hover:border-[#1E40AF] text-sm">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0A254D] border-[#0D4B84] text-white shadow-2xl">
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz} value={tz} className="hover:bg-blue-600/30 focus:bg-blue-600/30 text-white">
                              {tz}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {isFieldEnabled("bestTimeToCall") && (
                    <div className="space-y-1.5">
                      <Label className="text-blue-100 font-medium text-xs sm:text-sm tracking-wide">{getLabel("bestTimeToCall")}</Label>
                      <Select value={form.bestTimeToCall} onValueChange={(v) => set("bestTimeToCall", v)}>
                        <SelectTrigger className="bg-[#030C22]/85 border-[#0D4B84]/80 text-white rounded-xl h-11 px-3.5 focus:ring-blue-500/25 hover:border-[#1E40AF] text-sm">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0A254D] border-[#0D4B84] text-white shadow-2xl">
                          <SelectItem value="Morning (8am–12pm)" className="hover:bg-blue-600/30 focus:bg-blue-600/30 text-white">Morning (8am–12pm)</SelectItem>
                          <SelectItem value="Afternoon (12pm–5pm)" className="hover:bg-blue-600/30 focus:bg-blue-600/30 text-white">Afternoon (12pm–5pm)</SelectItem>
                          <SelectItem value="Evening (5pm–8pm)" className="hover:bg-blue-600/30 focus:bg-blue-600/30 text-white">Evening (5pm–8pm)</SelectItem>
                          <SelectItem value="Anytime" className="hover:bg-blue-600/30 focus:bg-blue-600/30 text-white">Anytime</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
              {isFieldEnabled("secondParent") && (
                <div className="border-t border-[#0D4B84]/50 pt-5 mt-2">
                  <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    {getLabel("secondParent")} <span className="text-blue-200/50 normal-case font-normal">(Optional)</span>
                  </p>
                  <div className="space-y-3">
                    <Input
                      value={form.secondParentName}
                      onChange={(e) => set("secondParentName", e.target.value)}
                      placeholder="Full name"
                      className="bg-[#030C22]/85 border-[#0D4B84]/80 text-white placeholder:text-blue-200/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25 rounded-xl h-11 px-3.5 text-sm transition-all hover:border-[#1E40AF]"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        type="tel"
                        value={form.secondParentPhone}
                        onChange={(e) => set("secondParentPhone", e.target.value)}
                        placeholder="Phone"
                        className="bg-[#030C22]/85 border-[#0D4B84]/80 text-white placeholder:text-blue-200/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25 rounded-xl h-11 px-3.5 text-sm transition-all hover:border-[#1E40AF]"
                      />
                      <Input
                        type="email"
                        value={form.secondParentEmail}
                        onChange={(e) => set("secondParentEmail", e.target.value)}
                        placeholder="Email"
                        className="bg-[#030C22]/85 border-[#0D4B84]/80 text-white placeholder:text-blue-200/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25 rounded-xl h-11 px-3.5 text-sm transition-all hover:border-[#1E40AF]"
                      />
                    </div>
                  </div>
                </div>
              )}
              {isFieldEnabled("howHeardAboutUs") && (
                <div className="border-t border-[#0D4B84]/50 pt-5 mt-2">
                  <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-3">{getLabel("howHeardAboutUs")}</p>
                  <Select value={form.howHeardAboutUs} onValueChange={(v) => set("howHeardAboutUs", v)}>
                    <SelectTrigger className="bg-[#030C22]/85 border-[#0D4B84]/80 text-white rounded-xl h-11 px-3.5 focus:ring-blue-500/25 hover:border-[#1E40AF] text-sm">
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A254D] border-[#0D4B84] text-white shadow-2xl">
                      {HOW_HEARD.map((h) => (
                        <SelectItem key={h} value={h} className="hover:bg-blue-600/30 focus:bg-blue-600/30 text-white">
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.howHeardAboutUs === "Friend or Family Referral" && (
                    <Input
                      value={form.referredBy}
                      onChange={(e) => set("referredBy", e.target.value)}
                      placeholder="Who referred you? (optional)"
                      className="mt-3 bg-[#030C22]/85 border-[#0D4B84]/80 text-white placeholder:text-blue-200/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25 rounded-xl h-11 px-3.5 text-sm transition-all hover:border-[#1E40AF]"
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Student Info */}
          {step === 2 && (
            <div className="space-y-5">
              {(isFieldEnabled("studentFirstName") || isFieldEnabled("studentLastName")) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {isFieldEnabled("studentFirstName") && (
                    <div className="space-y-1.5">
                      <Label className="text-blue-100 font-medium text-xs sm:text-sm tracking-wide">
                        {getLabel("studentFirstName")} <span className="text-amber-400 font-bold ml-0.5">*</span>
                      </Label>
                      <Input
                        value={form.studentFirstName}
                        onChange={(e) => set("studentFirstName", e.target.value)}
                        placeholder="Alex"
                        className="bg-[#030C22]/85 border-[#0D4B84]/80 text-white placeholder:text-blue-200/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25 rounded-xl h-11 px-3.5 text-sm transition-all hover:border-[#1E40AF]"
                      />
                    </div>
                  )}
                  {isFieldEnabled("studentLastName") && (
                    <div className="space-y-1.5">
                      <Label className="text-blue-100 font-medium text-xs sm:text-sm tracking-wide">
                        {getLabel("studentLastName")} <span className="text-amber-400 font-bold ml-0.5">*</span>
                      </Label>
                      <Input
                        value={form.studentLastName}
                        onChange={(e) => set("studentLastName", e.target.value)}
                        placeholder="Smith"
                        className="bg-[#030C22]/85 border-[#0D4B84]/80 text-white placeholder:text-blue-200/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25 rounded-xl h-11 px-3.5 text-sm transition-all hover:border-[#1E40AF]"
                      />
                    </div>
                  )}
                </div>
              )}
              {(isFieldEnabled("dateOfBirth") || isFieldEnabled("gradeLevel")) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {isFieldEnabled("dateOfBirth") && (
                    <div className="space-y-1.5">
                      <Label className="text-blue-100 font-medium text-xs sm:text-sm tracking-wide">{getLabel("dateOfBirth")}</Label>
                      <Input
                        type="date"
                        value={form.dateOfBirth}
                        onChange={(e) => set("dateOfBirth", e.target.value)}
                        className="bg-[#030C22]/85 border-[#0D4B84]/80 text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25 rounded-xl h-11 px-3.5 text-sm transition-all hover:border-[#1E40AF]"
                      />
                    </div>
                  )}
                  {isFieldEnabled("gradeLevel") && (
                    <div className="space-y-1.5">
                      <Label className="text-blue-100 font-medium text-xs sm:text-sm tracking-wide">{getLabel("gradeLevel")}</Label>
                      <Select value={form.gradeLevel} onValueChange={(v) => set("gradeLevel", v)}>
                        <SelectTrigger className="bg-[#030C22]/85 border-[#0D4B84]/80 text-white rounded-xl h-11 px-3.5 focus:ring-blue-500/25 hover:border-[#1E40AF] text-sm">
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0A254D] border-[#0D4B84] text-white shadow-2xl">
                          {GRADE_LEVELS.map((g) => (
                            <SelectItem key={g} value={g} className="hover:bg-blue-600/30 focus:bg-blue-600/30 text-white">
                              {g}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
              {isFieldEnabled("diagnosis") && (
                <div className="space-y-1.5">
                  <Label className="text-blue-100 font-medium text-xs sm:text-sm tracking-wide">{getLabel("diagnosis")}</Label>
                  <Input
                    value={form.diagnosis}
                    onChange={(e) => set("diagnosis", e.target.value)}
                    placeholder="e.g., Autism, ADHD, Dyslexia, Speech Impairment"
                    className="bg-[#030C22]/85 border-[#0D4B84]/80 text-white placeholder:text-blue-200/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25 rounded-xl h-11 px-3.5 text-sm transition-all hover:border-[#1E40AF]"
                  />
                </div>
              )}
              {isFieldEnabled("schoolName") && (
                <div className="space-y-1.5">
                  <Label className="text-blue-100 font-medium text-xs sm:text-sm tracking-wide">{getLabel("schoolName")}</Label>
                  <Input
                    value={form.schoolName}
                    onChange={(e) => set("schoolName", e.target.value)}
                    placeholder="Lincoln Elementary School"
                    className="bg-[#030C22]/85 border-[#0D4B84]/80 text-white placeholder:text-blue-200/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25 rounded-xl h-11 px-3.5 text-sm transition-all hover:border-[#1E40AF]"
                  />
                </div>
              )}
              {isFieldEnabled("countyDistrict") && (
                <div className="space-y-1.5">
                  <Label className="text-blue-100 font-medium text-xs sm:text-sm tracking-wide">{getLabel("countyDistrict")}</Label>
                  <Input
                    value={form.countyDistrict}
                    onChange={(e) => set("countyDistrict", e.target.value)}
                    placeholder="e.g., Fulton County Schools, Atlanta Public Schools"
                    className="bg-[#030C22]/85 border-[#0D4B84]/80 text-white placeholder:text-blue-200/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25 rounded-xl h-11 px-3.5 text-sm transition-all hover:border-[#1E40AF]"
                  />
                </div>
              )}
              {isFieldEnabled("cityStateZip") && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-blue-100 font-medium text-xs sm:text-sm tracking-wide">City</Label>
                    <Input
                      value={form.city}
                      onChange={(e) => set("city", e.target.value)}
                      placeholder="Atlanta"
                      className="bg-[#030C22]/85 border-[#0D4B84]/80 text-white placeholder:text-blue-200/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25 rounded-xl h-11 px-3.5 text-sm transition-all hover:border-[#1E40AF]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-blue-100 font-medium text-xs sm:text-sm tracking-wide">State</Label>
                    <Select value={form.state} onValueChange={(v) => set("state", v)}>
                      <SelectTrigger className="bg-[#030C22]/85 border-[#0D4B84]/80 text-white rounded-xl h-11 px-3.5 focus:ring-blue-500/25 hover:border-[#1E40AF] text-sm">
                        <SelectValue placeholder="State" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A254D] border-[#0D4B84] text-white shadow-2xl">
                        {US_STATES.map((s) => (
                          <SelectItem key={s} value={s} className="hover:bg-blue-600/30 focus:bg-blue-600/30 text-white">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-blue-100 font-medium text-xs sm:text-sm tracking-wide">ZIP</Label>
                    <Input
                      value={form.zipCode}
                      onChange={(e) => set("zipCode", e.target.value)}
                      placeholder="30301"
                      className="bg-[#030C22]/85 border-[#0D4B84]/80 text-white placeholder:text-blue-200/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25 rounded-xl h-11 px-3.5 text-sm transition-all hover:border-[#1E40AF]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Challenges */}
          {step === 3 && (
            <div className="space-y-5">
              {isFieldEnabled("challenges") && (
                <div className="space-y-1.5">
                  <Label className="text-blue-100 font-medium text-xs sm:text-sm tracking-wide">{getLabel("challenges")}</Label>
                  <Textarea
                    value={form.challenges}
                    onChange={(e) => set("challenges", e.target.value)}
                    placeholder="Please describe the 3 biggest challenges your child is facing at school, any recent IEP meetings, and what support you're looking for..."
                    rows={6}
                    className="bg-[#030C22]/85 border-[#0D4B84]/80 text-white placeholder:text-blue-200/30 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25 rounded-xl p-3.5 text-sm transition-all hover:border-[#1E40AF] resize-none"
                  />
                </div>
              )}
              {!isPreview && (
                <div className="bg-[#030C22]/70 border border-[#0D4B84]/60 rounded-2xl p-4 sm:p-5 shadow-inner">
                  <p className="text-blue-300 text-sm font-semibold mb-2.5 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-400" /> Review before submitting:
                  </p>
                  <div className="space-y-1.5 text-xs text-blue-200/80">
                    <p><strong className="text-white">Parent / Guardian:</strong> {form.parentFirstName} {form.parentLastName} · {form.parentEmail}</p>
                    <p><strong className="text-white">Student:</strong> {form.studentFirstName} {form.studentLastName} · {form.gradeLevel || "Grade not specified"}</p>
                    <p><strong className="text-white">School:</strong> {form.schoolName || "Not specified"}</p>
                  </div>
                </div>
              )}
              {isPreview && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
                  <p className="text-amber-300 text-xs sm:text-sm font-semibold">Preview Mode Active</p>
                  <p className="text-blue-200/70 text-xs mt-1">In the live form, a summary of the parent and student info entered in previous steps appears here for review before submission.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Scheduling (optional) */}
          {step === 4 && formConfig.schedulingEnabled && (
            <div className="space-y-5">
              {formConfig.schedulingType === "builtin" && formConfig.sessionTypeId ? (
                // Inline scheduler widget
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <h3 className="text-white font-bold text-xl tracking-tight">Schedule Your Session</h3>
                    <p className="text-blue-200/70 text-sm">Pick a convenient date and time that fits your schedule.</p>
                  </div>
                  <InlineScheduler
                    sessionTypeId={formConfig.sessionTypeId}
                    parentName={`${form.parentFirstName} ${form.parentLastName}`.trim()}
                    parentEmail={form.parentEmail}
                    onBooked={(date, time) => {
                      setBookedSlot({ date, time });
                      // Auto-submit the form immediately after booking so confirmation shows right away
                      if (!isPreview) {
                        submitMutation.mutate({
                          slug,
                          parentFirstName: form.parentFirstName, parentLastName: form.parentLastName,
                          parentEmail: form.parentEmail, parentPhone: form.parentPhone,
                          timezone: form.timezone || undefined, bestTimeToCall: form.bestTimeToCall || undefined,
                          howHeardAboutUs: form.howHeardAboutUs || undefined, referredBy: form.referredBy || undefined,
                          secondParentName: form.secondParentName || undefined, secondParentPhone: form.secondParentPhone || undefined,
                          secondParentEmail: form.secondParentEmail || undefined,
                          studentFirstName: form.studentFirstName, studentLastName: form.studentLastName,
                          dateOfBirth: form.dateOfBirth || undefined, diagnosis: form.diagnosis || undefined,
                          schoolName: form.schoolName || undefined, gradeLevel: form.gradeLevel || undefined,
                          city: form.city || undefined, state: form.state || undefined, zipCode: form.zipCode || undefined,
                          countyDistrict: form.countyDistrict || undefined, challenges: form.challenges || undefined,
                        });
                      }
                    }}
                    isPreview={isPreview}
                  />
                </div>
              ) : (
                // External URL button
                <div className="text-center space-y-5 py-6">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-400/50 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25">
                    <Calendar className="w-8 h-8 text-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-white font-bold text-xl">Schedule Your Session</h3>
                    <p className="text-blue-200/70 text-sm">Book your initial consultation at a time that works for you.</p>
                  </div>
                  <Button
                    className="w-full gap-2 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3.5 text-base rounded-xl shadow-lg shadow-blue-600/30 transition-all"
                    onClick={() => {
                      if (isPreview) { toast.info(`Preview: This button would open ${formConfig.schedulingUrl || "/book"}`); return; }
                      if (formConfig.schedulingUrl) window.open(formConfig.schedulingUrl, "_blank");
                    }}
                  >
                    <Calendar className="w-5 h-5" />
                    {formConfig.schedulingLabel || "Schedule Your Consultation"}
                    <ExternalLink className="w-4 h-4 ml-auto" />
                  </Button>
                  <p className="text-blue-300/60 text-xs">You can also skip this step and we’ll reach out to schedule.</p>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-[#0D4B84]/50">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1}
              className="border-[#0D4B84]/80 bg-[#030C22]/70 hover:bg-[#082148] text-blue-200 hover:text-white rounded-xl h-11 px-5 gap-1.5 transition-all disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>

            {isPreview ? (
              // Preview mode: simple Next/Close buttons, no submit
              step < totalSteps ? (
                <Button
                  onClick={handleNext}
                  className="h-11 px-7 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-600/35 hover:shadow-blue-500/50 active:scale-[0.98] transition-all gap-1.5 text-sm"
                >
                  Next Step <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => window.close()}
                  className="border-[#0D4B84]/80 bg-[#030C22]/70 hover:bg-[#082148] text-blue-200 hover:text-white rounded-xl h-11 px-6 gap-1.5 transition-all"
                >
                  Close Preview
                </Button>
              )
            ) : step < totalSteps ? (
              // Not yet at last step — always show Continue
              <Button
                onClick={handleNext}
                className="h-11 px-7 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-600/35 hover:shadow-blue-500/50 active:scale-[0.98] transition-all gap-1.5 text-sm"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              // At last step — show Submit
              <Button
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                className="h-11 px-7 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-600/35 hover:shadow-blue-500/50 active:scale-[0.98] transition-all gap-2 text-sm"
              >
                {submitMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                ) : formConfig?.schedulingEnabled ? (
                  <>Submit & Schedule <CheckCircle2 className="w-4 h-4" /></>
                ) : (
                  <>Submit Form <CheckCircle2 className="w-4 h-4" /></>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
