import React, { useState } from "react";
import { Link } from "wouter";
import {
  Zap,
  User,
  GraduationCap,
  Building2,
  Calendar,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Copy,
  ChevronDown,
  ChevronUp,
  FileText,
  ShieldCheck,
  Headphones,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import PageIdBadge from "@/components/PageIdBadge";

interface ExpressSetupResult {
  success: boolean;
  parentContactId: number;
  studentContactId: number;
  parentName: string;
  studentName: string;
  caseId: string;
  planTier: string;
  workspaceUrl: string;
  meetingWorkspaceUrl: string;
}

export function ExpressStudentSetupCard() {
  const utils = trpc.useUtils();

  // Form State
  const [parentName, setParentName] = useState("");
  const [studentName, setStudentName] = useState("");
  const [planType, setPlanType] = useState<"IEP" | "504 Plan">("IEP");
  const [planTier, setPlanTier] = useState<"$55" | "$105" | "Scholarship" | "Pay Per Use">("$55");
  
  // Optional secondary fields
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);
  const [schoolName, setSchoolName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [city, setCity] = useState("Atlanta");
  const [state, setState] = useState("GA");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");

  // Result state
  const [createdCase, setCreatedCase] = useState<ExpressSetupResult | null>(null);
  const [copiedCaseId, setCopiedCaseId] = useState(false);

  // Mutation
  const expressMutation = trpc.contacts.expressSetup.useMutation({
    onSuccess: (data) => {
      setCreatedCase(data as ExpressSetupResult);
      utils.contacts.list.invalidate();
      utils.nationalCoverage.invalidate();
      toast.success(
        `Case ${data.caseId} initialized for ${data.studentName}! Workspace is ready.`
      );
    },
    onError: (err) => {
      toast.error(err.message || "Failed to set up student. Please check input values.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentName.trim()) {
      toast.error("Please enter the parent or guardian name.");
      return;
    }
    if (!studentName.trim()) {
      toast.error("Please enter the student name.");
      return;
    }

    expressMutation.mutate({
      parentName: parentName.trim(),
      studentName: studentName.trim(),
      planType,
      planTier,
      schoolName: schoolName.trim() || undefined,
      gradeLevel: gradeLevel.trim() || undefined,
      city: city.trim() || "Atlanta",
      state: state.trim() || "GA",
      diagnosis: diagnosis.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  const handlePreFillSample = () => {
    setParentName("Sarah Jenkins");
    setStudentName("Liam Jenkins");
    setPlanType("IEP");
    setPlanTier("$105");
    setSchoolName("Midtown High School");
    setGradeLevel("9th Grade");
    setCity("Atlanta");
    setState("GA");
    setDiagnosis("ADHD (Combined), Dyslexia");
    setNotes("Transitioning to 9th grade. Need co-taught class review and assistive tech accommodations.");
    setShowOptionalDetails(true);
    toast.info("Pre-filled realistic parent & student demo profile.");
  };

  const handleResetForAnother = () => {
    setCreatedCase(null);
    setParentName("");
    setStudentName("");
    setSchoolName("");
    setGradeLevel("");
    setDiagnosis("");
    setNotes("");
    setShowOptionalDetails(false);
  };

  const handleCopyCaseId = (caseId: string) => {
    navigator.clipboard.writeText(caseId);
    setCopiedCaseId(true);
    toast.success(`Copied Case ID ${caseId} to clipboard`);
    setTimeout(() => setCopiedCaseId(false), 2000);
  };

  return (
    <div className="rounded-xl border border-[#3A2C18] bg-[#05142B]/95 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.06)] relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#C5A059]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#3A2C18]/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-[#020A17] text-[#FFE394] border border-[#3A2C18] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 px-2.5 py-1">
              <Zap className="w-3 h-3 text-[#DFBE77]" />
              Rapid Client Onboarding
            </Badge>
            <PageIdBadge id="PG-024-IMP" name="Express Setup" />
            <span className="text-[11px] text-[#A69371] font-mono">No Email or Phone Required</span>
          </div>

          <h3 className="text-xl md:text-2xl font-serif font-black text-[#FFF4D4] flex items-center gap-2">
            30-Second Quick Student Setup
          </h3>
          <p className="text-xs text-[#C6B697] max-w-2xl leading-relaxed">
            Need to get working right away? Enter just the <strong className="text-[#FFF4D4]">Parent's Name</strong> and <strong className="text-[#FFF4D4]">Student's Name</strong>. The CRM will instantly provision the student file, generate an official <code className="text-[#FFE394] font-mono">WP-2026-XXXX</code> Case ID, link the parent, and launch the workspace. You can add email, phone, and complete history later!
          </p>
        </div>

        {!createdCase && (
          <Button
            type="button"
            onClick={handlePreFillSample}
            variant="outline"
            size="sm"
            className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs h-8 cursor-pointer shrink-0 font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-[#DFBE77]" />
            Try Sample (Sarah & Liam)
          </Button>
        )}
      </div>

      {/* SUCCESS CONFIRMATION STATE */}
      {createdCase ? (
        <div className="mt-6 space-y-6 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="rounded-xl border border-emerald-500/40 bg-[#021815]/90 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-3 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Student Case Successfully Provisioned & Active
                    </span>
                    <Badge variant="outline" className="border-emerald-500/40 bg-[#010D0B] text-emerald-300 font-mono text-[11px]">
                      {createdCase.caseId}
                    </Badge>
                  </div>
                  <h4 className="text-xl font-serif font-black text-[#FFF4D4]">
                    {createdCase.studentName}
                  </h4>
                  <p className="text-xs text-[#C6B697]">
                    Linked Parent: <strong className="text-[#FFF4D4]">{createdCase.parentName}</strong> • Plan: <strong className="text-[#FFE394]">{planType} ({createdCase.planTier}/mo)</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleCopyCaseId(createdCase.caseId)}
                  variant="outline"
                  size="sm"
                  className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-xs h-9 cursor-pointer"
                >
                  {copiedCaseId ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1.5 text-[#DFBE77]" />
                      Copy Case ID
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Action Destinations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link href={createdCase.workspaceUrl} className="block">
              <div className="p-4 rounded-xl border border-[#3A2C18] bg-[#020A17]/90 hover:bg-[#071E3D] hover:border-[#FFE394] transition-all cursor-pointer group shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-[#05142B] border border-[#3A2C18] text-[#FFE394] group-hover:scale-105 transition-transform">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#C6B697] group-hover:text-[#FFE394] group-hover:translate-x-1 transition-all" />
                </div>
                <h5 className="text-sm font-bold text-[#FFF4D4] group-hover:text-[#FFE394]">
                  Open Student Workspace
                </h5>
                <p className="text-[11px] text-[#A69371] mt-1 leading-snug">
                  View Case Compass, manage IEP goals, or add contact phone/email at your leisure.
                </p>
              </div>
            </Link>

            <Link href={createdCase.meetingWorkspaceUrl} className="block">
              <div className="p-4 rounded-xl border border-[#3A2C18] bg-[#020A17]/90 hover:bg-[#071E3D] hover:border-[#FFE394] transition-all cursor-pointer group shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-[#05142B] border border-[#3A2C18] text-emerald-400 group-hover:scale-105 transition-transform">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#C6B697] group-hover:text-[#FFE394] group-hover:translate-x-1 transition-all" />
                </div>
                <h5 className="text-sm font-bold text-[#FFF4D4] group-hover:text-[#FFE394]">
                  Launch Meeting Recorder
                </h5>
                <p className="text-[11px] text-[#A69371] mt-1 leading-snug">
                  Jump right into First Mate live audio transcription, notes, and strategy.
                </p>
              </div>
            </Link>

            <button
              onClick={handleResetForAnother}
              className="p-4 rounded-xl border border-[#3A2C18] bg-[#020A17]/90 hover:bg-[#071E3D] hover:border-[#FFE394] transition-all cursor-pointer group text-left shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-[#05142B] border border-[#3A2C18] text-[#DFBE77] group-hover:scale-105 transition-transform">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <Zap className="w-4 h-4 text-[#C6B697] group-hover:text-[#FFE394]" />
              </div>
              <h5 className="text-sm font-bold text-[#FFF4D4] group-hover:text-[#FFE394]">
                Set Up Another Student
              </h5>
              <p className="text-[11px] text-[#A69371] mt-1 leading-snug">
                Clear fields to quickly onboard another family into Waypoint Advocates.
              </p>
            </button>
          </div>
        </div>
      ) : (
        /* INPUT FORM STATE */
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Required Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Parent Name */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#FFF4D4] uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#DFBE77]" />
                  Parent / Guardian Name
                  <span className="text-[#FFE394]">*</span>
                </span>
                <span className="text-[10px] text-[#A69371] font-normal lowercase font-sans">
                  (first & last)
                </span>
              </label>
              <Input
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="e.g. Sarah Jenkins or Marcus Vance"
                className="bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] placeholder:text-[#A69371]/50 focus:border-[#FFE394] h-11 text-sm font-medium"
                required
              />
              <p className="text-[11px] text-[#C6B697]">
                Creates client profile and primary decision-maker billing account.
              </p>
            </div>

            {/* Student Name */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#FFF4D4] uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-[#DFBE77]" />
                  Student Name
                  <span className="text-[#FFE394]">*</span>
                </span>
                <span className="text-[10px] text-[#A69371] font-normal lowercase font-sans">
                  (child's legal or preferred name)
                </span>
              </label>
              <Input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Liam Jenkins or Chloe Vance"
                className="bg-[#020A17] border-[#3A2C18] text-[#FFF4D4] placeholder:text-[#A69371]/50 focus:border-[#FFE394] h-11 text-sm font-medium"
                required
              />
              <p className="text-[11px] text-[#C6B697]">
                Auto-generates official <code className="text-[#FFE394] font-mono">WP-YYYY-XXXX</code> Case ID.
              </p>
            </div>
          </div>

          {/* Quick Plan & Tier Pickers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            {/* Plan Type */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#A69371] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#DFBE77]" />
                Advocacy Plan Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPlanType("IEP")}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2 ${
                    planType === "IEP"
                      ? "bg-[#071E3D] border-[#FFE394] text-[#FFF4D4] shadow-[0_0_12px_rgba(197,160,89,0.25)]"
                      : "bg-[#020A17] border-[#3A2C18] text-[#C6B697] hover:border-[#C5A059]/60 hover:text-[#FFF4D4]"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#DFBE77]" />
                  IEP (Special Education Advocacy)
                </button>
                <button
                  type="button"
                  onClick={() => setPlanType("504 Plan")}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2 ${
                    planType === "504 Plan"
                      ? "bg-[#071E3D] border-[#FFE394] text-[#FFF4D4] shadow-[0_0_12px_rgba(197,160,89,0.25)]"
                      : "bg-[#020A17] border-[#3A2C18] text-[#C6B697] hover:border-[#C5A059]/60 hover:text-[#FFF4D4]"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-[#DFBE77]" />
                  Section 504 Plan
                </button>
              </div>
            </div>

            {/* Plan Tier */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#A69371] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#DFBE77]" />
                Support / Billing Tier
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(["$55", "$105", "Scholarship", "Pay Per Use"] as const).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setPlanTier(tier)}
                    className={`py-2 px-1 rounded-lg border text-xs font-bold cursor-pointer text-center transition-all ${
                      planTier === tier
                        ? "bg-[#071E3D] border-[#FFE394] text-[#FFF4D4] shadow-[0_0_12px_rgba(197,160,89,0.25)]"
                        : "bg-[#020A17] border-[#3A2C18] text-[#C6B697] hover:border-[#C5A059]/60 hover:text-[#FFF4D4]"
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Optional Expansion Toggle */}
          <div className="border-t border-[#3A2C18]/60 pt-4">
            <button
              type="button"
              onClick={() => setShowOptionalDetails(!showOptionalDetails)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#DFBE77] hover:text-[#FFF4D4] cursor-pointer"
            >
              {showOptionalDetails ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Hide Optional Details (School, Grade, City)
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Add Optional Details Now (School, Grade, City, Initial Note)
                </>
              )}
            </button>

            {showOptionalDetails && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 p-4 rounded-xl bg-[#020A17]/80 border border-[#3A2C18]/60 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#A69371] uppercase">School Name</label>
                  <Input
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="e.g. Midtown High School"
                    className="bg-[#05142B] border-[#3A2C18] text-xs text-[#FFF4D4] h-9"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#A69371] uppercase">Grade Level</label>
                  <Input
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    placeholder="e.g. 9th Grade"
                    className="bg-[#05142B] border-[#3A2C18] text-xs text-[#FFF4D4] h-9"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#A69371] uppercase">City, State</label>
                  <div className="flex gap-1.5">
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Atlanta"
                      className="bg-[#05142B] border-[#3A2C18] text-xs text-[#FFF4D4] h-9 flex-1"
                    />
                    <Input
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="GA"
                      className="bg-[#05142B] border-[#3A2C18] text-xs text-[#FFF4D4] h-9 w-14"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#A69371] uppercase">Diagnosis / Category</label>
                  <Input
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="e.g. ADHD, Dyslexia"
                    className="bg-[#05142B] border-[#3A2C18] text-xs text-[#FFF4D4] h-9"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-4 space-y-1 mt-1">
                  <label className="text-[11px] font-bold text-[#A69371] uppercase">Advocacy Initial Note</label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Parent requested urgent IEP meeting review before semester end"
                    className="bg-[#05142B] border-[#3A2C18] text-xs text-[#FFF4D4] h-9"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#3A2C18]/80 pt-4">
            <div className="flex items-center gap-2 text-xs text-[#C6B697]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                Phone number & email can be provided at any time from the student workspace.
              </span>
            </div>

            <Button
              type="submit"
              disabled={expressMutation.isPending || !parentName.trim() || !studentName.trim()}
              className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-sm h-11 px-6 shadow-[0_4px_16px_rgba(0,0,0,0.8)] border border-[#FFE394]/60 hover:brightness-105 cursor-pointer disabled:opacity-50 w-full sm:w-auto"
            >
              {expressMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin text-[#07162B]" />
                  Provisioning Student Case...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2 text-[#07162B] fill-current" />
                  Set Up Student & Launch Case
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
