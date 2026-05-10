import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, ChevronRight, ChevronLeft, User, GraduationCap, Heart } from "lucide-react";

const STEPS = [
  { id: 1, title: "Parent / Guardian Info", icon: User },
  { id: 2, title: "Student Info", icon: GraduationCap },
  { id: 3, title: "Challenges & Concerns", icon: Heart },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const TIMEZONES = [
  "Eastern Time (ET)",
  "Central Time (CT)",
  "Mountain Time (MT)",
  "Pacific Time (PT)",
  "Alaska Time (AKT)",
  "Hawaii Time (HT)",
];

const GRADE_LEVELS = [
  "Pre-K", "Kindergarten", "1st Grade", "2nd Grade", "3rd Grade",
  "4th Grade", "5th Grade", "6th Grade", "7th Grade", "8th Grade",
  "9th Grade", "10th Grade", "11th Grade", "12th Grade", "Post-Secondary",
];

const HOW_HEARD = [
  "Google Search",
  "Social Media (Facebook/Instagram)",
  "Friend or Family Referral",
  "School Staff",
  "Therapist / Doctor",
  "Support Group",
  "Other",
];

interface FormData {
  // Parent
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  parentPhone: string;
  timezone: string;
  bestTimeToCall: string;
  howHeardAboutUs: string;
  referredBy: string;
  secondParentName: string;
  secondParentPhone: string;
  secondParentEmail: string;
  // Student
  studentFirstName: string;
  studentLastName: string;
  dateOfBirth: string;
  diagnosis: string;
  schoolName: string;
  gradeLevel: string;
  city: string;
  state: string;
  zipCode: string;
  countyDistrict: string;
  // Challenges
  challenges: string;
}

const EMPTY_FORM: FormData = {
  parentFirstName: "", parentLastName: "", parentEmail: "", parentPhone: "",
  timezone: "", bestTimeToCall: "", howHeardAboutUs: "", referredBy: "",
  secondParentName: "", secondParentPhone: "", secondParentEmail: "",
  studentFirstName: "", studentLastName: "", dateOfBirth: "", diagnosis: "",
  schoolName: "", gradeLevel: "", city: "", state: "", zipCode: "", countyDistrict: "",
  challenges: "",
};

export default function IntakeForm() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [caseId, setCaseId] = useState("");

  // Detect preview mode from URL query param
  const isPreview = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "true";

  const submitMutation = trpc.intake.submit.useMutation({
    onSuccess: (data) => {
      setCaseId(data.caseId);
      setSubmitted(true);
    },
    onError: (err) => {
      toast.error("Submission failed: " + err.message);
    },
  });

  const set = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const validateStep = () => {
    if (isPreview) return true; // skip all validation in preview mode
    if (step === 1) {
      if (!form.parentFirstName.trim()) { toast.error("First name is required"); return false; }
      if (!form.parentLastName.trim()) { toast.error("Last name is required"); return false; }
      if (!form.parentEmail.trim() || !form.parentEmail.includes("@")) { toast.error("Valid email is required"); return false; }
      if (!form.parentPhone.trim()) { toast.error("Phone number is required"); return false; }
    }
    if (step === 2) {
      if (!form.studentFirstName.trim()) { toast.error("Student first name is required"); return false; }
      if (!form.studentLastName.trim()) { toast.error("Student last name is required"); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, 3));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = () => {
    if (isPreview) { toast.info("Preview mode — form won't be submitted"); return; }
    if (!validateStep()) return;
    submitMutation.mutate({
      parentFirstName: form.parentFirstName,
      parentLastName: form.parentLastName,
      parentEmail: form.parentEmail,
      parentPhone: form.parentPhone,
      timezone: form.timezone || undefined,
      bestTimeToCall: form.bestTimeToCall || undefined,
      howHeardAboutUs: form.howHeardAboutUs || undefined,
      referredBy: form.referredBy || undefined,
      secondParentName: form.secondParentName || undefined,
      secondParentPhone: form.secondParentPhone || undefined,
      secondParentEmail: form.secondParentEmail || undefined,
      studentFirstName: form.studentFirstName,
      studentLastName: form.studentLastName,
      dateOfBirth: form.dateOfBirth || undefined,
      diagnosis: form.diagnosis || undefined,
      schoolName: form.schoolName || undefined,
      gradeLevel: form.gradeLevel || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      zipCode: form.zipCode || undefined,
      countyDistrict: form.countyDistrict || undefined,
      challenges: form.challenges || undefined,
    });
  };

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
            <p className="text-slate-300 text-lg">Your intake form has been submitted successfully.</p>
          </div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Case ID</span>
              <span className="text-white font-mono font-bold text-lg">{caseId}</span>
            </div>
            <div className="border-t border-slate-700 pt-3">
              <p className="text-slate-300 text-sm">
                We have received your information and will be in touch within <strong className="text-white">1–2 business days</strong> to schedule your initial consultation.
              </p>
            </div>
          </div>
          <p className="text-slate-500 text-sm">
            Please save your Case ID for reference. You will receive a confirmation email at <strong className="text-slate-300">{form.parentEmail}</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">W</span>
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg leading-none">Waypoint Advocates</h1>
            <p className="text-slate-400 text-xs mt-0.5">New Client Intake Form</p>
          </div>
        </div>
      </div>

      {/* Preview Mode Banner */}
      {isPreview && (
        <div className="max-w-2xl mx-auto w-full px-6 pt-4">
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-2.5">
            <span className="text-yellow-400 text-xs font-semibold">👁 Preview Mode</span>
            <span className="text-yellow-300/70 text-xs">— Click any step tab to jump between steps. This form won't submit.</span>
          </div>
        </div>
      )}

      {/* Progress Steps */}
      <div className="max-w-2xl mx-auto w-full px-6 pt-8 pb-4">
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div
                  className={`flex items-center gap-2 flex-shrink-0 ${isActive ? "text-blue-400" : isDone ? "text-green-400" : "text-slate-500"} ${isPreview ? "cursor-pointer" : "cursor-default"}`}
                  onClick={() => isPreview && setStep(s.id)}
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
                </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">First Name <span className="text-red-400">*</span></Label>
                  <Input
                    value={form.parentFirstName}
                    onChange={(e) => set("parentFirstName", e.target.value)}
                    placeholder="Jane"
                    className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Last Name <span className="text-red-400">*</span></Label>
                  <Input
                    value={form.parentLastName}
                    onChange={(e) => set("parentLastName", e.target.value)}
                    placeholder="Smith"
                    className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Email Address <span className="text-red-400">*</span></Label>
                <Input
                  type="email"
                  value={form.parentEmail}
                  onChange={(e) => set("parentEmail", e.target.value)}
                  placeholder="jane@example.com"
                  className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Phone Number <span className="text-red-400">*</span></Label>
                <Input
                  type="tel"
                  value={form.parentPhone}
                  onChange={(e) => set("parentPhone", e.target.value)}
                  placeholder="(555) 000-0000"
                  className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Timezone</Label>
                  <Select value={form.timezone} onValueChange={(v) => set("timezone", v)}>
                    <SelectTrigger className="bg-slate-900/60 border-slate-600 text-white">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Best Time to Call</Label>
                  <Select value={form.bestTimeToCall} onValueChange={(v) => set("bestTimeToCall", v)}>
                    <SelectTrigger className="bg-slate-900/60 border-slate-600 text-white">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Morning (8am–12pm)">Morning (8am–12pm)</SelectItem>
                      <SelectItem value="Afternoon (12pm–5pm)">Afternoon (12pm–5pm)</SelectItem>
                      <SelectItem value="Evening (5pm–8pm)">Evening (5pm–8pm)</SelectItem>
                      <SelectItem value="Anytime">Anytime</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">Second Parent / Guardian (Optional)</p>
                <div className="space-y-3">
                  <Input
                    value={form.secondParentName}
                    onChange={(e) => set("secondParentName", e.target.value)}
                    placeholder="Full name"
                    className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="tel"
                      value={form.secondParentPhone}
                      onChange={(e) => set("secondParentPhone", e.target.value)}
                      placeholder="Phone"
                      className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                    />
                    <Input
                      type="email"
                      value={form.secondParentEmail}
                      onChange={(e) => set("secondParentEmail", e.target.value)}
                      placeholder="Email"
                      className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-3">How did you hear about us?</p>
                <Select value={form.howHeardAboutUs} onValueChange={(v) => set("howHeardAboutUs", v)}>
                  <SelectTrigger className="bg-slate-900/60 border-slate-600 text-white">
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    {HOW_HEARD.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.howHeardAboutUs === "Friend or Family Referral" && (
                  <Input
                    value={form.referredBy}
                    onChange={(e) => set("referredBy", e.target.value)}
                    placeholder="Who referred you? (optional)"
                    className="mt-2 bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                  />
                )}
              </div>
            </div>
          )}

          {/* Step 2: Student Info */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Student First Name <span className="text-red-400">*</span></Label>
                  <Input
                    value={form.studentFirstName}
                    onChange={(e) => set("studentFirstName", e.target.value)}
                    placeholder="Alex"
                    className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Student Last Name <span className="text-red-400">*</span></Label>
                  <Input
                    value={form.studentLastName}
                    onChange={(e) => set("studentLastName", e.target.value)}
                    placeholder="Smith"
                    className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Date of Birth</Label>
                  <Input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => set("dateOfBirth", e.target.value)}
                    className="bg-slate-900/60 border-slate-600 text-white focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Grade Level</Label>
                  <Select value={form.gradeLevel} onValueChange={(v) => set("gradeLevel", v)}>
                    <SelectTrigger className="bg-slate-900/60 border-slate-600 text-white">
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADE_LEVELS.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Diagnosis / Disability</Label>
                <Input
                  value={form.diagnosis}
                  onChange={(e) => set("diagnosis", e.target.value)}
                  placeholder="e.g., Autism, ADHD, Dyslexia, Speech/Language Impairment"
                  className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">School Name</Label>
                <Input
                  value={form.schoolName}
                  onChange={(e) => set("schoolName", e.target.value)}
                  placeholder="Lincoln Elementary School"
                  className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">County / School District</Label>
                <Input
                  value={form.countyDistrict}
                  onChange={(e) => set("countyDistrict", e.target.value)}
                  placeholder="e.g., Los Angeles Unified School District"
                  className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">City</Label>
                  <Input
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                    placeholder="Los Angeles"
                    className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">State</Label>
                  <Select value={form.state} onValueChange={(v) => set("state", v)}>
                    <SelectTrigger className="bg-slate-900/60 border-slate-600 text-white">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">ZIP Code</Label>
                  <Input
                    value={form.zipCode}
                    onChange={(e) => set("zipCode", e.target.value)}
                    placeholder="90001"
                    className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Challenges */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-blue-300 text-sm">
                  Please describe the challenges your student is facing and what you hope advocacy support can help with. The more detail you provide, the better we can prepare for your consultation.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Describe the challenges and concerns</Label>
                <Textarea
                  value={form.challenges}
                  onChange={(e) => set("challenges", e.target.value)}
                  placeholder="For example: My child has an IEP but the school is not providing the services listed. They are struggling with reading and we believe they need additional support that the school has denied..."
                  className="bg-slate-900/60 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 min-h-[160px] resize-none"
                />
              </div>
              <div className="bg-slate-700/30 border border-slate-700 rounded-xl p-4 space-y-2">
                <p className="text-slate-300 text-sm font-medium">Review your submission:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-slate-500">Parent:</span>
                  <span className="text-slate-300">{form.parentFirstName} {form.parentLastName}</span>
                  <span className="text-slate-500">Email:</span>
                  <span className="text-slate-300">{form.parentEmail}</span>
                  <span className="text-slate-500">Student:</span>
                  <span className="text-slate-300">{form.studentFirstName} {form.studentLastName}</span>
                  <span className="text-slate-500">School:</span>
                  <span className="text-slate-300">{form.schoolName || "—"}</span>
                  <span className="text-slate-500">Diagnosis:</span>
                  <span className="text-slate-300">{form.diagnosis || "—"}</span>
                  <span className="text-slate-500">Grade:</span>
                  <span className="text-slate-300">{form.gradeLevel || "—"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-700">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1}
              className="text-slate-400 hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            {step < 3 ? (
              <Button
                onClick={handleNext}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
              >
                Continue
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white px-8"
              >
                {submitMutation.isPending ? "Submitting..." : "Submit Intake Form"}
                {!submitMutation.isPending && <CheckCircle2 className="w-4 h-4 ml-2" />}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-6 text-slate-600 text-xs">
        <p>Waypoint Advocates · Confidential Intake Form · Your information is secure</p>
      </div>
    </div>
  );
}
