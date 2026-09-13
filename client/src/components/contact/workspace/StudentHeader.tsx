import React from "react";
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
} from "lucide-react";

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
  const fullName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Student";
  const initials = `${(contact.firstName || "S")[0]}${(contact.lastName || "W")[0]}`.toUpperCase();
  const parentFullName = parentContact
    ? `${parentContact.firstName || ""} ${parentContact.lastName || ""}`.trim()
    : (contact.parentName || "Not set");
  const caseNumber = contact.caseId || `WP-${new Date().getFullYear()}-${String(contact.id).padStart(4, "0")}`;
  const currentPlanType = contact.planType || "No IEP/504 Yet";
  const planTypeTier = contact.servicePlan || contact.planTier || "Monthly $55";
  const isArchived = Boolean(contact.archivedAt);

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
                    <DropdownMenuItem onClick={() => onUpdatePlanType("IEP")} className="gap-2 cursor-pointer text-xs font-semibold">
                      <span className="w-2 h-2 rounded-full bg-indigo-400" />
                      <span>IEP PLAN</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onUpdatePlanType("504")} className="gap-2 cursor-pointer text-xs font-semibold">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span>504 PLAN</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onUpdatePlanType("No IEP/504 Yet")} className="gap-2 cursor-pointer text-xs font-semibold">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      <span>NO IEP/504 YET</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Grade · School line */}
              <p className="text-xs text-slate-300/90 pt-0.5 truncate">
                {contact.gradeLevel ? `${contact.gradeLevel} Grade` : "Grade Not Set"}
                {" · "}
                {contact.schoolName || contact.goingToSchool || contact.countyDistrict || "School Not Set"}
              </p>
            </div>
          </div>

          {/* SECTION 2 (MIDDLE): Metadata Reference List (4 cols) */}
          <div className="lg:col-span-4 lg:border-l lg:border-[#0E356A]/90 lg:pl-6 space-y-2 text-xs">
            {/* Age */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-300">
                <User className="h-4 w-4 text-[#38BDF8] shrink-0" />
                <span>Age:</span>
              </div>
              <span className="font-bold text-white">
                {calculatedAge !== null ? calculatedAge : (contact.dateOfBirth || "14")}
              </span>
            </div>

            {/* Grade */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-300">
                <GraduationCap className="h-4 w-4 text-[#38BDF8] shrink-0" />
                <span>Grade:</span>
              </div>
              <span className="font-bold text-white">
                {contact.gradeLevel || "4"}
              </span>
            </div>

            {/* School */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-300">
                <School className="h-4 w-4 text-[#38BDF8] shrink-0" />
                <span>School:</span>
              </div>
              <span className="font-bold text-white truncate max-w-[170px] text-right" title={contact.schoolName || contact.goingToSchool || "Bentonville High School"}>
                {contact.schoolName || contact.goingToSchool || "Bentonville High School"}
              </span>
            </div>

            {/* Transfer School */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-300">
                <ArrowRight className="h-4 w-4 text-[#38BDF8] shrink-0" />
                <span>Transfer School:</span>
              </div>
              <span className="font-bold text-white truncate max-w-[170px] text-right" title={contact.previousSchool || "The Lovett School"}>
                {contact.previousSchool || "The Lovett School"}
              </span>
            </div>

            {/* GTID */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="h-4 w-4 text-[#38BDF8] shrink-0" />
                <span>GTID:</span>
              </div>
              <span className="font-bold text-white font-mono">
                {contact.gtid || contact.studentIdNumber || "1"}
              </span>
            </div>

            {/* Case Type */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-300">
                <Tag className="h-4 w-4 text-[#38BDF8] shrink-0" />
                <span>Case Type:</span>
              </div>
              <span className="font-bold text-white truncate max-w-[170px] text-right">
                {contact.caseType || "Student Support"}
              </span>
            </div>
          </div>

          {/* SECTION 3 (RIGHT): Quote + Gold Bar + Quick Admin Chip (3 cols) */}
          <div className="lg:col-span-3 lg:border-l lg:border-[#0E356A]/90 lg:pl-6 flex flex-col justify-between h-full space-y-4">
            <div>
              <blockquote className="font-serif italic text-lg sm:text-xl text-[#F5B544] leading-snug">
                “Advocacy turns potential into possibility.”
              </blockquote>
              <div className="h-1 w-14 bg-[#F5B544] rounded-full mt-3" />
            </div>

            {/* Compact Admin Card Footer */}
            <div className="pt-2 border-t border-[#0E356A]/60 flex items-center justify-between gap-2 text-[11px] text-slate-300">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">Plan Tier:</span>
                  <span className="font-semibold text-white">{planTypeTier}</span>
                </div>
                <div className="flex items-center gap-1 text-[10.5px]">
                  <KeyRound className="h-3 w-3 text-slate-400" />
                  <span className="text-slate-400">Portal:</span>
                  <strong className={portalStatus?.hasCredentials ? "text-emerald-400" : "text-amber-400"}>
                    {portalStatus?.hasCredentials ? "Active" : "Pending"}
                  </strong>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={onEditStudent}
                className="h-7 px-2.5 text-xs text-slate-200 hover:text-white bg-[#0F2342] border-[#F5B544]/30 hover:border-[#F5B544] hover:bg-[#F5B544]/15 cursor-pointer rounded-lg"
              >
                <Pencil className="h-3 w-3 mr-1 text-[#F5B544]" />
                Edit
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
