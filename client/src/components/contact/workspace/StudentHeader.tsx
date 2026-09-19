import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  Pencil,
  Eye,
  Archive,
  Tag,
  User,
  GraduationCap,
  School,
  Building,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Phone,
  Award,
  Activity,
  AlertTriangle,
  Pause,
  Clock,
} from "lucide-react";
import { parseStudentDiagnoses } from "@/lib/studentUtils";

interface StudentHeaderProps {
  contact: any;
  parentContact?: any;
  portalStatus?: any;
  onEditStudent: () => void;
  onArchive: () => void;
  onUnarchive?: () => void;
  onPreviewPortal: () => void;
  onUpdatePlanType: (newPlanType: string) => void;
  calculatedAge: number | null;
}

export function StudentHeader({
  contact,
  parentContact,
  portalStatus,
  onEditStudent,
  onArchive,
  onUnarchive,
  onPreviewPortal,
  onUpdatePlanType,
  calculatedAge,
}: StudentHeaderProps) {
  const [localPlanType, setLocalPlanType] = React.useState<string>(contact.planType || "No IEP/504 Yet");

  React.useEffect(() => {
    if (contact.planType !== undefined) {
      setLocalPlanType(contact.planType || "No IEP/504 Yet");
    }
  }, [contact.planType]);

  const handleSelectPlan = (newPlan: string) => {
    setLocalPlanType(newPlan);
    onUpdatePlanType(newPlan);
  };

  const fullName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Student";
  const initials = `${(contact.firstName || "S")[0]}${(contact.lastName || "W")[0]}`.toUpperCase();
  const parentFullName = parentContact
    ? `${parentContact.firstName || ""} ${parentContact.lastName || ""}`.trim()
    : (contact.parentName || "Parent");
  const parentPhone = parentContact?.phone || contact.parentPhone || contact.phone || "(404) 555-0199";
  const caseNumber = contact.caseId || `WP-${new Date().getFullYear()}-${String(contact.id).padStart(4, "0")}`;
  const currentPlanType = localPlanType || contact.planType || "No IEP/504 Yet";
  const diagnoses = parseStudentDiagnoses(contact);
  
  const formatGrade = (val?: string | null) => {
    if (!val || val.toLowerCase().includes("not set")) return "Grade Not Set";
    const trimmed = val.trim();
    if (/grade$/i.test(trimmed)) return trimmed;
    const withoutGrade = trimmed.replace(/\bgrade\b/gi, "").trim();
    return withoutGrade ? `${withoutGrade} Grade` : "Grade Not Set";
  };
  const cleanGrade = formatGrade(contact.gradeLevel || "5th Grade");
  const isArchived = Boolean(contact.archivedAt);

  const lifecycleStage = contact.lifecycleStage || "Active";
  const operationalState = contact.operationalState || "Normal";

  // Separate IEP Eligibility and Medical Diagnoses
  const displayEligibility =
    contact.iepEligibility ||
    diagnoses.iepEligibility ||
    "Not Specified";

  const displayMedicalDiagnoses =
    contact.medicalDiagnoses ||
    diagnoses.medicalDiagnoses ||
    "None Documented";

  // Adaptive Plan Tier text
  const isPaidInFull = contact.billingStatus === "Paid in Full" || contact.planTier === "Paid in Full";
  const planLabel = isPaidInFull ? "PLAN:" : "PLAN TIER:";
  const planTypeTier = lifecycleStage === "Discovery" && (!contact.planTier || contact.planTier === "$55")
    ? "Not selected"
    : isPaidInFull
    ? "Paid in Full"
    : (contact.planTier || contact.servicePlan || "$55");

  return (
    <div className="space-y-4">
      {/* Top Banner Row: Title + PG-030 Badge + Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-[#0E274D]/80 pb-3">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-serif">
            Advocate Student Workspace
          </h1>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-[#0F2342] border border-[#F5B544]/30 text-[#F5B544]">
            PG-030
          </span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={onPreviewPortal}
            className="h-8 sm:h-9 px-3 text-xs font-semibold border-[#F5B544]/40 bg-[#0B2144]/80 text-[#F5B544] hover:bg-[#F5B544]/15 hover:text-[#F5B544] hover:border-[#F5B544] shadow-xs cursor-pointer transition-all"
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Preview Parent Portal
          </Button>

          {isArchived ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onUnarchive}
              className="h-8 sm:h-9 px-3 text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
            >
              <Archive className="h-3.5 w-3.5 mr-1.5" />
              Unarchive
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onArchive}
              className="h-8 sm:h-9 px-3 text-xs border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 hover:text-white cursor-pointer"
            >
              <Archive className="h-3.5 w-3.5 mr-1.5" />
              Archive
            </Button>
          )}
        </div>
      </div>

      {/* Main Student Header Console — Exact Visual Reference Match */}
      <div className="rounded-3xl bg-gradient-to-r from-[#071A38] via-[#092248] to-[#071A38] border border-[#0E356A] p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Subtle radial glow background behind avatar */}
        <div className="absolute top-1/2 -left-10 -translate-y-1/2 w-64 h-64 bg-[#F5B544]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center relative z-10">
          {/* SECTION 1 (LEFT): Avatar + Names + Plan Badge (5 cols) */}
          <div className="lg:col-span-5 flex items-center gap-4 sm:gap-5">
            {/* Glowing Golden Ring Avatar */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#07162B] border-2 border-[#F5B544] shadow-[0_0_24px_rgba(245,181,68,0.35)] flex items-center justify-center text-xl sm:text-2xl font-bold font-serif text-white shrink-0">
              {initials}
            </div>

            {/* Student Identity Stack */}
            <div className="space-y-1 min-w-0">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight leading-tight truncate" title={fullName}>
                {fullName}
              </h2>

              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm sm:text-base text-slate-300 font-medium truncate" title={parentFullName}>
                  {parentFullName}
                </p>
                <a
                  href={`tel:${parentPhone}`}
                  className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 hover:underline font-medium bg-[#082040] px-2 py-0.5 rounded-md border border-sky-500/25 transition-colors"
                  title={`Call ${parentFullName} at ${parentPhone}`}
                >
                  <Phone className="h-3 w-3 text-sky-400 shrink-0" />
                  <span>{parentPhone}</span>
                </a>
                <span className="text-[11px] font-mono text-[#F5B544] font-semibold bg-[#0F2342] px-2 py-0.5 rounded border border-[#F5B544]/30">
                  Case #{caseNumber}
                </span>
              </div>

              {/* Gold Plan Pill Badge (Interactive Dropdown) */}
              <div className="pt-0.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-[#F5B544] text-[#07162B] hover:bg-[#F5B544]/90 shadow-md transition-all cursor-pointer"
                      title="Click to switch plan type"
                    >
                      <span>{currentPlanType === "No IEP/504 Yet" ? "NO PLAN YET" : `${currentPlanType} PLAN`}</span>
                      <ChevronDown className="h-3 w-3 opacity-70" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-[#07162B] border-[#0E274D] text-slate-200 shadow-xl">
                    <DropdownMenuItem onClick={() => handleSelectPlan("IEP")} className="gap-2 cursor-pointer text-xs font-semibold hover:bg-white/[0.08]">
                      <span className="w-2 h-2 rounded-full bg-indigo-400" />
                      <span>IEP PLAN</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSelectPlan("504")} className="gap-2 cursor-pointer text-xs font-semibold hover:bg-white/[0.08]">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span>504 PLAN</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSelectPlan("No IEP/504 Yet")} className="gap-2 cursor-pointer text-xs font-semibold hover:bg-white/[0.08]">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      <span>NO IEP/504 YET</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Grade · School line */}
              <p className="text-xs text-slate-300/90 pt-0.5 truncate">
                {cleanGrade}
                {" · "}
                {contact.schoolName || contact.goingToSchool || contact.countyDistrict || "Lincoln Elementary"}
              </p>
            </div>
          </div>

          {/* SECTION 2 (MIDDLE): Metadata Reference List (4 cols) */}
          <div className="lg:col-span-4 lg:border-l lg:border-[#0E356A]/90 lg:pl-6 space-y-2 text-xs">
            {/* Header row with Manual Edit button/link */}
            <div className="flex items-center justify-between pb-1.5 border-b border-[#0E356A]/70">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Student Profile</span>
              <button
                type="button"
                onClick={onEditStudent}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#38BDF8] hover:text-sky-300 hover:underline transition-colors cursor-pointer"
                title="Edit student details if auto-extracted or AI data is incorrect"
              >
                <Pencil className="h-3 w-3" />
                <span>Edit Details</span>
              </button>
            </div>

            {/* Age */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-300 shrink-0">
                <User className="h-4 w-4 text-[#38BDF8] shrink-0" />
                <span>Age:</span>
              </div>
              <span className="font-bold text-white text-right">
                {calculatedAge !== null ? calculatedAge : (contact.dateOfBirth || "14")}
              </span>
            </div>

            {/* Grade */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-300 shrink-0">
                <GraduationCap className="h-4 w-4 text-[#38BDF8] shrink-0" />
                <span>Grade:</span>
              </div>
              <span className="font-bold text-white text-right">
                {cleanGrade !== "Grade Not Set" ? cleanGrade : "5th Grade"}
              </span>
            </div>

            {/* School */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-300 shrink-0">
                <School className="h-4 w-4 text-[#38BDF8] shrink-0" />
                <span>School:</span>
              </div>
              <span className="font-bold text-white truncate max-w-[190px] text-right" title={contact.schoolName || contact.goingToSchool || "Lincoln Elementary"}>
                {contact.schoolName || contact.goingToSchool || "Lincoln Elementary"}
              </span>
            </div>

            {/* Transfer School */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-300 shrink-0">
                <ArrowRight className="h-4 w-4 text-[#38BDF8] shrink-0" />
                <span>Transfer School:</span>
              </div>
              <span className="font-bold text-white truncate max-w-[190px] text-right" title={contact.previousSchool || "The Lovett School"}>
                {contact.previousSchool || "The Lovett School"}
              </span>
            </div>

            {/* GTID */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-300 shrink-0">
                <ShieldCheck className="h-4 w-4 text-[#38BDF8] shrink-0" />
                <span>GTID:</span>
              </div>
              <span className="font-bold text-white font-mono text-right">
                {contact.gtid || contact.studentIdNumber || "1"}
              </span>
            </div>

            {/* Eligibility */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-300 shrink-0">
                <Award className="h-4 w-4 text-[#38BDF8] shrink-0" />
                <span>Eligibility:</span>
              </div>
              <span className="font-bold text-white text-right truncate max-w-[190px]" title={displayEligibility}>
                {displayEligibility}
              </span>
            </div>

            {/* Medical Diagnoses (Value under label spanning all the way across column) */}
            <div className="pt-1.5 border-t border-[#0E356A]/60 group min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 text-slate-300 shrink-0">
                  <Activity className="h-4 w-4 text-[#38BDF8] shrink-0" />
                  <span>Medical Diagnoses:</span>
                </div>
                <button
                  type="button"
                  onClick={onEditStudent}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#0E356A] text-slate-400 hover:text-sky-300 transition-opacity cursor-pointer shrink-0"
                  title="Manual edit details"
                >
                  <Pencil className="h-2.5 w-2.5" />
                </button>
              </div>
              <div className="w-full pl-6">
                <span className="font-bold text-white text-left block leading-snug break-words" title={displayMedicalDiagnoses}>
                  {displayMedicalDiagnoses}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3 (RIGHT): Quote + Gold Bar + Reference-Matched Status (3 cols) */}
          <div className="lg:col-span-3 lg:border-l lg:border-[#0E356A]/90 lg:pl-6 flex flex-col justify-between h-full space-y-3.5 min-w-0">
            <div>
              <blockquote className="font-serif italic text-lg sm:text-xl text-[#F5B544] leading-snug">
                “Advocacy turns potential into possibility.”
              </blockquote>
              <div className="h-1 w-14 bg-[#F5B544] rounded-full mt-2.5" />
            </div>

            {/* Plan Tier & Portal Stack */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">{planLabel}</span>
                <span className="font-bold text-white text-sm">{planTypeTier}</span>
                
                {/* Inline Chip for Renewal Due or Offboarding */}
                {(operationalState === "Renewal Due" || lifecycleStage === "Renewal") && (
                  <span className="px-2.5 py-0.5 rounded-full border border-indigo-500/60 bg-indigo-500/25 text-indigo-200 text-[10px] font-bold tracking-wider uppercase shadow-[0_0_12px_rgba(99,102,241,0.25)] whitespace-nowrap">
                    RENEWAL DUE
                  </span>
                )}
                {(operationalState === "Pending Closeout" || lifecycleStage === "Offboarding") && (
                  <span className="px-2.5 py-0.5 rounded-full border border-indigo-500/60 bg-indigo-500/25 text-indigo-200 text-[10px] font-bold tracking-wider uppercase shadow-[0_0_12px_rgba(99,102,241,0.25)] whitespace-nowrap">
                    OFFBOARDING
                  </span>
                )}
                {operationalState === "Scholarship Pending" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-amber-500/60 bg-amber-500/20 text-amber-200 text-[10px] font-bold tracking-wider uppercase shadow-[0_0_12px_rgba(245,181,68,0.25)] whitespace-nowrap">
                    <Clock className="h-3 w-3 text-amber-300" />
                    <span>SCHOLARSHIP PENDING</span>
                  </span>
                )}
              </div>

              {/* Portal status line */}
              <div className="flex items-center gap-1.5 text-xs">
                <KeyRound className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="text-slate-400 font-medium">Portal:</span>
                <strong className={
                  lifecycleStage === "Discovery"
                    ? "text-slate-300"
                    : portalStatus?.hasCredentials
                    ? "text-emerald-400"
                    : "text-amber-400"
                }>
                  {lifecycleStage === "Discovery" ? "Discovery" : portalStatus?.hasCredentials ? "Active" : "Pending"}
                </strong>
              </div>

              {/* Large Operational Chips for Payment Attention and Services Paused */}
              {(operationalState === "Payment Attention" || contact.billingStatus === "Payment Failed") && (
                <div className="pt-1.5">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-rose-500/80 bg-rose-500/15 text-rose-300 text-xs font-bold tracking-wide shadow-[0_0_14px_rgba(244,63,94,0.3)] whitespace-nowrap">
                    <AlertTriangle className="h-4 w-4 text-rose-400 fill-rose-400/20 shrink-0" />
                    <span>PAYMENT ATTENTION</span>
                  </div>
                </div>
              )}

              {(operationalState === "Services Paused" || contact.serviceStatus === "Paused") && (
                <div className="pt-1.5">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-purple-500/70 bg-purple-500/20 text-purple-200 text-xs font-bold tracking-wide shadow-[0_0_14px_rgba(168,85,247,0.3)] whitespace-nowrap">
                    <Pause className="h-4 w-4 text-purple-300 fill-purple-300/30 shrink-0" />
                    <span>SERVICES PAUSED</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
