import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, ChevronRight, ChevronLeft, User, GraduationCap, Heart, Calendar, ExternalLink, Loader2, Eye } from "lucide-react";

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
export const ALL_FIELDS = [
  // Step 1 — Parent Info
  { key: "parentFirstName",   label: "Parent First Name",         step: 1, required: true },
  { key: "parentLastName",    label: "Parent Last Name",          step: 1, required: true },
  { key: "parentEmail",       label: "Parent Email",              step: 1, required: true },
  { key: "parentPhone",       label: "Parent Phone",              step: 1, required: true },
  { key: "timezone",          label: "Timezone",                  step: 1, required: false },
  { key: "bestTimeToCall",    label: "Best Time to Call",         step: 1, required: false },
  { key: "secondParent",      label: "Second Parent / Guardian",  step: 1, required: false },
  { key: "howHeardAboutUs",   label: "How Did You Hear About Us", step: 1, required: false },
  // Step 2 — Student Info
  { key: "studentFirstName",  label: "Student First Name",        step: 2, required: true },
  { key: "studentLastName",   label: "Student Last Name",         step: 2, required: true },
  { key: "dateOfBirth",       label: "Date of Birth",             step: 2, required: false },
  { key: "gradeLevel",        label: "Grade Level",               step: 2, required: false },
  { key: "diagnosis",         label: "Diagnosis / Disability",    step: 2, required: false },
  { key: "schoolName",        label: "School Name",               step: 2, required: false },
  { key: "countyDistrict",    label: "County / School District",  step: 2, required: false },
  { key: "cityStateZip",      label: "City / State / ZIP",        step: 2, required: false },
  // Step 3 — Challenges
  { key: "challenges",        label: "Challenges & Concerns",     step: 3, required: false },
] as const;

export type FieldKey = typeof ALL_FIELDS[number]["key"];

// Default: all fields enabled
export const DEFAULT_FIELDS: FieldKey[] = ALL_FIELDS.map((f) => f.key);

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
  const slug = params.slug ?? "";

  // Detect preview mode from URL query param
  const isPreview = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "true";

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [caseId, setCaseId] = useState("");

  const { data: formConfig, isLoading, error } = trpc.leadForms.getBySlug.useQuery(
    { slug },
    { retry: false, enabled: !!slug }
  );

  const submitMutation = trpc.leadForms.submit.useMutation({
    onSuccess: (data) => { setCaseId(data.caseId); setSubmitted(true); },
    onError: (e) => toast.error("Submission failed: " + e.message),
  });

  const set = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const totalSteps = formConfig?.schedulingEnabled ? 4 : 3;

  // Parse enabled fields from form config (falls back to all fields)
  const enabledFields: FieldKey[] = (() => {
    if (!formConfig?.fields) return DEFAULT_FIELDS;
    try {
      const parsed = typeof formConfig.fields === "string" ? JSON.parse(formConfig.fields) : formConfig.fields;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as FieldKey[];
    } catch { /* ignore */ }
    return DEFAULT_FIELDS;
  })();

  const isFieldEnabled = (key: FieldKey) => enabledFields.includes(key);

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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  // ── Not found ──
  if (error || !formConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center mx-auto">
            <span className="text-red-400 text-2xl">✕</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Form Not Found</h1>
          <p className="text-slate-400">This form link is no longer active or does not exist.</p>
        </div>
      </div>
    );
  }

  // ── Success screen ──
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Thank You!</h1>
            <p className="text-slate-300 text-lg">Your information has been submitted successfully.</p>
          </div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Case ID</span>
              <span className="text-white font-mono font-bold text-lg">{caseId}</span>
            </div>
            <div className="border-t border-slate-700 pt-3">
              <p className="text-slate-300 text-sm">
                We have received your information and will be in touch within <strong className="text-white">1–2 business days</strong>.
              </p>
            </div>
          </div>
          {formConfig.schedulingEnabled && formConfig.schedulingUrl && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 justify-center">
                <Calendar className="w-5 h-5 text-blue-400" />
                <p className="text-blue-300 font-medium">Ready to schedule your session?</p>
              </div>
              <p className="text-slate-400 text-sm">
                Book your initial consultation at a time that works for you.
              </p>
              <Button
                className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => window.open(formConfig.schedulingUrl!, "_blank")}
              >
                <Calendar className="w-4 h-4" />
                {formConfig.schedulingLabel || "Schedule Your Consultation"}
                <ExternalLink className="w-3.5 h-3.5 ml-auto" />
              </Button>
            </div>
          )}
          <p className="text-slate-500 text-sm">
            Please save your Case ID for reference. You will receive a confirmation email at{" "}
            <strong className="text-slate-300">{form.parentEmail}</strong>.
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
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
      <div className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">W</span>
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg leading-none">Waypoint Advocates</h1>
            <p className="text-slate-400 text-xs mt-0.5">{formConfig.name}</p>
          </div>
        </div>
      </div>

      {/* Progress Steps — clickable in preview mode */}
      <div className="max-w-2xl mx-auto w-full px-6 pt-8 pb-4">
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <button
                  type="button"
                  onClick={() => isPreview && setStep(s.id)}
                  className={`flex items-center gap-2 flex-shrink-0 transition-all ${
                    isPreview ? "cursor-pointer" : "cursor-default"
                  } ${isActive ? "text-blue-400" : isDone ? "text-green-400" : "text-slate-500"}`}
                  title={isPreview ? `Jump to ${s.title}` : undefined}
                >
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                    isActive ? "border-blue-400 bg-blue-400/10" :
                    isDone ? "border-green-400 bg-green-400/10" :
                    isPreview ? "border-slate-500 bg-slate-800 hover:border-slate-400" :
                    "border-slate-600 bg-slate-800"
                  }`}>
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">{s.title}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 rounded transition-all ${isDone ? "bg-green-400/40" : "bg-slate-700"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Card */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-6 pb-8">
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">{STEPS[step - 1].title}</h2>
            <p className="text-slate-400 text-sm mt-1">Step {step} of {STEPS.length}</p>
          </div>

          {/* Step 1: Parent Info */}
          {step === 1 && (
            <div className="space-y-5">
              {(isFieldEnabled("parentFirstName") || isFieldEnabled("parentLastName")) && (
                <div className="grid grid-cols-2 gap-4">
                  {isFieldEnabled("parentFirstName") && (
                    <div className="space-y-1.5">
                      <Label className="text-slate-300 text-sm">First Name <span className="text-red-400">*</span></Label>
                      <Input value={form.parentFirstName} onChange={(e) => set("parentFirstName", e.target.value)} placeholder="Jane" className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500" />
                    </div>
                  )}
                  {isFieldEnabled("parentLastName") && (
                    <div className="space-y-1.5">
                      <Label className="text-slate-300 text-sm">Last Name <span className="text-red-400">*</span></Label>
                      <Input value={form.parentLastName} onChange={(e) => set("parentLastName", e.target.value)} placeholder="Smith" className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500" />
                    </div>
                  )}
                </div>
              )}
              {isFieldEnabled("parentEmail") && (
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Email Address <span className="text-red-400">*</span></Label>
                  <Input type="email" value={form.parentEmail} onChange={(e) => set("parentEmail", e.target.value)} placeholder="jane@example.com" className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500" />
                </div>
              )}
              {isFieldEnabled("parentPhone") && (
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Phone Number <span className="text-red-400">*</span></Label>
                  <Input type="tel" value={form.parentPhone} onChange={(e) => set("parentPhone", e.target.value)} placeholder="(555) 000-0000" className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500" />
                </div>
              )}
              {(isFieldEnabled("timezone") || isFieldEnabled("bestTimeToCall")) && (
                <div className="grid grid-cols-2 gap-4">
                  {isFieldEnabled("timezone") && (
                    <div className="space-y-1.5">
                      <Label className="text-slate-300 text-sm">Timezone</Label>
                      <Select value={form.timezone} onValueChange={(v) => set("timezone", v)}>
                        <SelectTrigger className="bg-slate-900/60 border-slate-600 text-white"><SelectValue placeholder="Select timezone" /></SelectTrigger>
                        <SelectContent>{TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  {isFieldEnabled("bestTimeToCall") && (
                    <div className="space-y-1.5">
                      <Label className="text-slate-300 text-sm">Best Time to Call</Label>
                      <Select value={form.bestTimeToCall} onValueChange={(v) => set("bestTimeToCall", v)}>
                        <SelectTrigger className="bg-slate-900/60 border-slate-600 text-white"><SelectValue placeholder="Select time" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Morning (8am–12pm)">Morning (8am–12pm)</SelectItem>
                          <SelectItem value="Afternoon (12pm–5pm)">Afternoon (12pm–5pm)</SelectItem>
                          <SelectItem value="Evening (5pm–8pm)">Evening (5pm–8pm)</SelectItem>
                          <SelectItem value="Anytime">Anytime</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
              {isFieldEnabled("secondParent") && (
                <div className="border-t border-slate-700 pt-4">
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">Second Parent / Guardian (Optional)</p>
                  <div className="space-y-3">
                    <Input value={form.secondParentName} onChange={(e) => set("secondParentName", e.target.value)} placeholder="Full name" className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500" />
                    <div className="grid grid-cols-2 gap-3">
                      <Input type="tel" value={form.secondParentPhone} onChange={(e) => set("secondParentPhone", e.target.value)} placeholder="Phone" className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500" />
                      <Input type="email" value={form.secondParentEmail} onChange={(e) => set("secondParentEmail", e.target.value)} placeholder="Email" className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500" />
                    </div>
                  </div>
                </div>
              )}
              {isFieldEnabled("howHeardAboutUs") && (
                <div className="border-t border-slate-700 pt-4">
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">How did you hear about us?</p>
                  <Select value={form.howHeardAboutUs} onValueChange={(v) => set("howHeardAboutUs", v)}>
                    <SelectTrigger className="bg-slate-900/60 border-slate-600 text-white"><SelectValue placeholder="Select an option" /></SelectTrigger>
                    <SelectContent>{HOW_HEARD.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                  </Select>
                  {form.howHeardAboutUs === "Friend or Family Referral" && (
                    <Input value={form.referredBy} onChange={(e) => set("referredBy", e.target.value)} placeholder="Who referred you? (optional)" className="mt-2 bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500" />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Student Info */}
          {step === 2 && (
            <div className="space-y-5">
              {(isFieldEnabled("studentFirstName") || isFieldEnabled("studentLastName")) && (
                <div className="grid grid-cols-2 gap-4">
                  {isFieldEnabled("studentFirstName") && (
                    <div className="space-y-1.5">
                      <Label className="text-slate-300 text-sm">Student First Name <span className="text-red-400">*</span></Label>
                      <Input value={form.studentFirstName} onChange={(e) => set("studentFirstName", e.target.value)} placeholder="Alex" className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500" />
                    </div>
                  )}
                  {isFieldEnabled("studentLastName") && (
                    <div className="space-y-1.5">
                      <Label className="text-slate-300 text-sm">Student Last Name <span className="text-red-400">*</span></Label>
                      <Input value={form.studentLastName} onChange={(e) => set("studentLastName", e.target.value)} placeholder="Smith" className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500" />
                    </div>
                  )}
                </div>
              )}
              {(isFieldEnabled("dateOfBirth") || isFieldEnabled("gradeLevel")) && (
                <div className="grid grid-cols-2 gap-4">
                  {isFieldEnabled("dateOfBirth") && (
                    <div className="space-y-1.5">
                      <Label className="text-slate-300 text-sm">Date of Birth</Label>
                      <Input type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} className="bg-slate-900/60 border-slate-600 text-white focus:border-blue-500" />
                    </div>
                  )}
                  {isFieldEnabled("gradeLevel") && (
                    <div className="space-y-1.5">
                      <Label className="text-slate-300 text-sm">Grade Level</Label>
                      <Select value={form.gradeLevel} onValueChange={(v) => set("gradeLevel", v)}>
                        <SelectTrigger className="bg-slate-900/60 border-slate-600 text-white"><SelectValue placeholder="Select grade" /></SelectTrigger>
                        <SelectContent>{GRADE_LEVELS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
              {isFieldEnabled("diagnosis") && (
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Diagnosis / Disability</Label>
                  <Input value={form.diagnosis} onChange={(e) => set("diagnosis", e.target.value)} placeholder="e.g., Autism, ADHD, Dyslexia" className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500" />
                </div>
              )}
              {isFieldEnabled("schoolName") && (
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">School Name</Label>
                  <Input value={form.schoolName} onChange={(e) => set("schoolName", e.target.value)} placeholder="Lincoln Elementary School" className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500" />
                </div>
              )}
              {isFieldEnabled("countyDistrict") && (
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">County / School District</Label>
                  <Input value={form.countyDistrict} onChange={(e) => set("countyDistrict", e.target.value)} placeholder="e.g., Los Angeles Unified School District" className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500" />
                </div>
              )}
              {isFieldEnabled("cityStateZip") && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300 text-sm">City</Label>
                    <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Los Angeles" className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300 text-sm">State</Label>
                    <Select value={form.state} onValueChange={(v) => set("state", v)}>
                      <SelectTrigger className="bg-slate-900/60 border-slate-600 text-white"><SelectValue placeholder="State" /></SelectTrigger>
                      <SelectContent>{US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300 text-sm">ZIP</Label>
                    <Input value={form.zipCode} onChange={(e) => set("zipCode", e.target.value)} placeholder="90001" className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500" />
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
                  <Label className="text-slate-300 text-sm">Describe your child's challenges and concerns</Label>
                  <Textarea
                    value={form.challenges}
                    onChange={(e) => set("challenges", e.target.value)}
                    placeholder="Please describe the 3 biggest challenges your child is facing at school, any recent IEP meetings, and what support you're looking for..."
                    rows={6}
                    className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 resize-none"
                  />
                </div>
              )}
              {!isPreview && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <p className="text-blue-300 text-sm font-medium mb-2">Review before submitting:</p>
                  <div className="space-y-1 text-xs text-slate-400">
                    <p><strong className="text-slate-300">Parent:</strong> {form.parentFirstName} {form.parentLastName} · {form.parentEmail}</p>
                    <p><strong className="text-slate-300">Student:</strong> {form.studentFirstName} {form.studentLastName} · {form.gradeLevel || "Grade not specified"}</p>
                    <p><strong className="text-slate-300">School:</strong> {form.schoolName || "Not specified"}</p>
                  </div>
                </div>
              )}
              {isPreview && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                  <p className="text-amber-300 text-sm font-medium">Preview Mode</p>
                  <p className="text-slate-400 text-xs mt-1">In the live form, a summary of the parent and student info entered in previous steps would appear here for review before submission.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Scheduling (optional) */}
          {step === 4 && formConfig.schedulingEnabled && (
            <div className="space-y-5">
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center mx-auto">
                  <Calendar className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Schedule Your Session</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Book your initial consultation at a time that works for you.
                  </p>
                </div>
                <Button
                  className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 text-base"
                  onClick={() => {
                    if (isPreview) { toast.info("Preview: This button would open your scheduling link"); return; }
                    window.open(formConfig.schedulingUrl!, "_blank");
                  }}
                >
                  <Calendar className="w-5 h-5" />
                  {formConfig.schedulingLabel || "Schedule Your Consultation"}
                  <ExternalLink className="w-4 h-4 ml-auto" />
                </Button>
                <p className="text-slate-500 text-xs">
                  {isPreview
                    ? `Scheduling URL: ${formConfig.schedulingUrl}`
                    : "This will open your scheduling page in a new tab. You can also skip this step and we'll reach out to schedule."}
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-700">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1}
              className="text-slate-400 hover:text-white gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>

            {isPreview ? (
              // Preview mode: simple Next/Close buttons, no submit
              step < totalSteps ? (
                <Button onClick={() => setStep((s) => Math.min(s + 1, totalSteps))} className="gap-1.5">
                  Next Step <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button variant="outline" onClick={() => window.close()} className="gap-1.5">
                  Close Preview
                </Button>
              )
            ) : step < totalSteps ? (
              <Button onClick={step === 3 ? handleSubmit : handleNext} disabled={submitMutation.isPending} className="gap-1.5">
                {step === 3 ? (
                  submitMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                  ) : (
                    <>Submit Form <ChevronRight className="w-4 h-4" /></>
                  )
                ) : (
                  <>Continue <ChevronRight className="w-4 h-4" /></>
                )}
              </Button>
            ) : step === 3 ? (
              <Button onClick={handleSubmit} disabled={submitMutation.isPending} className="gap-1.5">
                {submitMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                ) : (
                  <>Submit Form <CheckCircle2 className="w-4 h-4" /></>
                )}
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitMutation.isPending} className="gap-1.5">
                {submitMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                ) : (
                  <>Submit & Schedule <CheckCircle2 className="w-4 h-4" /></>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
