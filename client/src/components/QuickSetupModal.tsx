import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Zap, ChevronRight, ChevronLeft, User, GraduationCap,
  CheckCircle2, MessageSquareQuote, ExternalLink, Copy
} from "lucide-react";

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
  // Parent 1
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  parentPhone: string;
  timezone: string;
  bestTimeToCall: string;
  howHeardAboutUs: string;
  referredBy: string;
  // Parent 2 (optional)
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
  countyDistrict: string;
  state: string;
  zipCode: string;
  city: string;
  challenges: string;
}

const EMPTY: FormData = {
  parentFirstName: "", parentLastName: "", parentEmail: "", parentPhone: "",
  timezone: "", bestTimeToCall: "", howHeardAboutUs: "", referredBy: "",
  secondParentName: "", secondParentPhone: "", secondParentEmail: "",
  studentFirstName: "", studentLastName: "", dateOfBirth: "", diagnosis: "",
  schoolName: "", gradeLevel: "", countyDistrict: "", state: "", zipCode: "", city: "",
  challenges: "",
};

interface QuickSetupModalProps {
  open: boolean;
  onClose: () => void;
}

export default function QuickSetupModal({ open, onClose }: QuickSetupModalProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [result, setResult] = useState<{ caseId: string; parentContactId: number; studentContactId: number } | null>(null);
  const [, navigate] = useLocation();

  const set = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const submitMutation = trpc.quickSetup.create.useMutation({
    onSuccess: (data: { caseId: string; parentContactId: number; studentContactId: number }) => {
      setResult(data);
      toast.success(`Setup complete! Case ID: ${data.caseId}`);
    },
    onError: (err: { message: string }) => {
      toast.error("Setup failed: " + err.message);
    },
  });

  const validateStep1 = () => {
    if (!form.parentFirstName.trim()) { toast.error("Parent first name is required"); return false; }
    if (!form.parentLastName.trim()) { toast.error("Parent last name is required"); return false; }
    if (!form.parentEmail.trim() || !form.parentEmail.includes("@")) { toast.error("Valid email is required"); return false; }
    if (!form.parentPhone.trim()) { toast.error("Phone number is required"); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!form.studentFirstName.trim()) { toast.error("Student first name is required"); return false; }
    if (!form.studentLastName.trim()) { toast.error("Student last name is required"); return false; }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    setStep(2);
  };

  const handleSubmit = () => {
    if (!validateStep2()) return;
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
      countyDistrict: form.countyDistrict || undefined,
      state: form.state || undefined,
      zipCode: form.zipCode || undefined,
      city: form.city || undefined,
      challenges: form.challenges || undefined,
    });
  };

  const handleClose = () => {
    setStep(1);
    setForm(EMPTY);
    setResult(null);
    onClose();
  };

  const handleGoToStudent = () => {
    if (result) {
      navigate(`/contacts/${result.studentContactId}`);
      handleClose();
    }
  };

  const handleGoToParent = () => {
    if (result) {
      navigate(`/contacts/${result.parentContactId}`);
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-white text-lg font-bold leading-none">
                Quick Client Setup
              </DialogTitle>
              <p className="text-blue-100 text-xs mt-0.5">Internal use only — Staff setup during phone calls</p>
            </div>
            <Badge className="ml-auto bg-white/20 text-white border-0 text-xs">
              🔒 Staff Only
            </Badge>
          </div>
        </div>

        {result ? (
          /* ── SUCCESS STATE ── */
          <div className="p-6 space-y-5">
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-green-100 border-2 border-green-400 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Setup Complete!</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Parent contact, student profile, and case have been created.
                </p>
              </div>
            </div>

            <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Case ID</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-lg text-foreground">{result.caseId}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => { navigator.clipboard.writeText(result.caseId); toast.success("Copied!"); }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm text-muted-foreground">Parent</span>
                <span className="text-sm font-medium">{form.parentFirstName} {form.parentLastName}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm text-muted-foreground">Student</span>
                <span className="text-sm font-medium">{form.studentFirstName} {form.studentLastName}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={handleGoToStudent} className="gap-2">
                <GraduationCap className="w-4 h-4" />
                Open Student Profile
              </Button>
              <Button variant="outline" onClick={handleGoToParent} className="gap-2">
                <User className="w-4 h-4" />
                Open Parent Contact
              </Button>
            </div>
            <Button variant="ghost" onClick={handleClose} className="w-full text-muted-foreground">
              Close &amp; Return
            </Button>
          </div>
        ) : (
          /* ── FORM ── */
          <div className="p-6 space-y-5">
            {/* Script Prompt */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <MessageSquareQuote className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">
                    What to Tell the Client
                  </p>
                  <p className="text-sm text-amber-900 dark:text-amber-200 italic leading-relaxed">
                    "I'm going to get your client portal set up for you. It's free and gives us a secure place to share documents, make recommendations, track progress, and keep everything organized as we move forward together."
                  </p>
                </div>
              </div>
            </div>

            {/* Step Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => step === 2 && setStep(1)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  step === 1
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Step 1: Parent Info
                {step > 1 && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
              </button>
              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  step === 2
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-muted text-muted-foreground"
                }`}
                disabled={step < 2}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                Step 2: Student Info
              </button>
            </div>

            {/* Step 1: Parent Info */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">First Name <span className="text-red-500">*</span></Label>
                    <Input
                      value={form.parentFirstName}
                      onChange={(e) => set("parentFirstName", e.target.value)}
                      placeholder="Jane"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Last Name <span className="text-red-500">*</span></Label>
                    <Input
                      value={form.parentLastName}
                      onChange={(e) => set("parentLastName", e.target.value)}
                      placeholder="Smith"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Email <span className="text-red-500">*</span></Label>
                    <Input
                      type="email"
                      value={form.parentEmail}
                      onChange={(e) => set("parentEmail", e.target.value)}
                      placeholder="jane@example.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Phone <span className="text-red-500">*</span></Label>
                    <Input
                      type="tel"
                      value={form.parentPhone}
                      onChange={(e) => set("parentPhone", e.target.value)}
                      placeholder="555-123-4567"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Timezone</Label>
                    <Select value={form.timezone} onValueChange={(v) => set("timezone", v)}>
                      <SelectTrigger>
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
                    <Label className="text-sm">Best Time to Reach</Label>
                    <Input
                      value={form.bestTimeToCall}
                      onChange={(e) => set("bestTimeToCall", e.target.value)}
                      placeholder="Weekdays after 3pm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">How Did They Hear About Us?</Label>
                    <Select value={form.howHeardAboutUs} onValueChange={(v) => set("howHeardAboutUs", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        {HOW_HEARD.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Referred By</Label>
                    <Input
                      value={form.referredBy}
                      onChange={(e) => set("referredBy", e.target.value)}
                      placeholder="Name of referrer"
                    />
                  </div>
                </div>

                {/* Second Parent (collapsible) */}
                <div className="border border-border/60 rounded-xl p-4 space-y-3 bg-muted/20">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    2nd Parent / Guardian (Optional)
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5 col-span-1">
                      <Label className="text-xs">Full Name</Label>
                      <Input
                        value={form.secondParentName}
                        onChange={(e) => set("secondParentName", e.target.value)}
                        placeholder="John Smith"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Phone</Label>
                      <Input
                        value={form.secondParentPhone}
                        onChange={(e) => set("secondParentPhone", e.target.value)}
                        placeholder="555-000-0000"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Email (gives portal access)</Label>
                      <Input
                        value={form.secondParentEmail}
                        onChange={(e) => set("secondParentEmail", e.target.value)}
                        placeholder="john@example.com"
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={handleNext} className="gap-2 px-6">
                    Continue to Student Info
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Student Info */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Student First Name <span className="text-red-500">*</span></Label>
                    <Input
                      value={form.studentFirstName}
                      onChange={(e) => set("studentFirstName", e.target.value)}
                      placeholder="Michael"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Student Last Name <span className="text-red-500">*</span></Label>
                    <Input
                      value={form.studentLastName}
                      onChange={(e) => set("studentLastName", e.target.value)}
                      placeholder="Smith"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Date of Birth</Label>
                    <Input
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(e) => set("dateOfBirth", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Grade Level</Label>
                    <Select value={form.gradeLevel} onValueChange={(v) => set("gradeLevel", v)}>
                      <SelectTrigger>
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
                  <Label className="text-sm">Diagnosis / Disability</Label>
                  <Input
                    value={form.diagnosis}
                    onChange={(e) => set("diagnosis", e.target.value)}
                    placeholder="List known or suspected diagnoses"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">School Name</Label>
                    <Input
                      value={form.schoolName}
                      onChange={(e) => set("schoolName", e.target.value)}
                      placeholder="Lincoln Elementary"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">County / District</Label>
                    <Input
                      value={form.countyDistrict}
                      onChange={(e) => set("countyDistrict", e.target.value)}
                      placeholder="Fulton County District 1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">City</Label>
                    <Input
                      value={form.city}
                      onChange={(e) => set("city", e.target.value)}
                      placeholder="Atlanta"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">State</Label>
                    <Input
                      value={form.state}
                      onChange={(e) => set("state", e.target.value)}
                      placeholder="Georgia"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">ZIP Code</Label>
                    <Input
                      value={form.zipCode}
                      onChange={(e) => set("zipCode", e.target.value)}
                      placeholder="30104"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Top 3 Challenges / Concerns</Label>
                  <Textarea
                    value={form.challenges}
                    onChange={(e) => set("challenges", e.target.value)}
                    placeholder="Briefly describe the student's challenges, goals, and what the family is hoping to achieve..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button variant="ghost" onClick={() => setStep(1)} className="gap-2 text-muted-foreground">
                    <ChevronLeft className="w-4 h-4" />
                    Back to Parent Info
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitMutation.isPending}
                    className="gap-2 px-6 bg-green-600 hover:bg-green-700"
                  >
                    {submitMutation.isPending ? (
                      "Creating..."
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Create Client Setup
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
