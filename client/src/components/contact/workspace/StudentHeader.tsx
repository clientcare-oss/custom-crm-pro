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
      {/* Top Banner Row: Title + Tagline + Actions + Mountain Crest */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#0E274D]/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif">
              Student Workspace
            </h1>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-[#0F2342] border border-[#F5B544]/30 text-[#F5B544]">
              PG-030
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 italic">
            Advocacy. Clarity. Progress. A brighter path forward.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={onPreviewPortal}
            className="h-9 px-3 text-xs font-semibold border-[#F5B544]/40 bg-[#0B2144]/80 text-[#F5B544] hover:bg-[#F5B544]/15 hover:text-[#F5B544] hover:border-[#F5B544] shadow-xs cursor-pointer transition-all"
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Preview Parent Portal
          </Button>

          {isArchived ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onUnarchive}
              className="h-9 px-3 text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
            >
              <Archive className="h-3.5 w-3.5 mr-1.5" />
              Unarchive
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onArchive}
              className="h-9 px-3 text-xs border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 hover:text-white cursor-pointer"
            >
              <Archive className="h-3.5 w-3.5 mr-1.5" />
              Archive
            </Button>
          )}

          {/* Nautical Mountain Silhouette Watermark Crest */}
          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-[#0E274D]">
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#F5B544]">Waypoint Advocates</div>
              <div className="text-[8.5px] uppercase tracking-wider text-slate-400">Students · Families · Brighter Futures</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#0F2342] border border-[#F5B544]/30 flex items-center justify-center text-[#F5B544] shadow-inner">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Student Header Console (2 Columns: Left identity & plan, Right student info) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Card: Monogram, Name, Parent, Case #, Badges, Plan Tier (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-gradient-to-br from-[#0A1A33] to-[#07162B] border border-[#0E274D] p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#F5B544]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            {/* Monogram + Names */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#0F284F] border-2 border-[#F5B544]/50 flex items-center justify-center text-xl font-bold text-white shadow-md shrink-0">
                {initials}
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {fullName}
                </h2>
                <div className="text-xs text-slate-300">
                  <span className="text-slate-400">Parent: </span>
                  <strong className="text-slate-200 font-medium">{parentFullName}</strong>
                </div>
                <div className="text-xs font-mono text-[#F5B544]">
                  Case # {caseNumber}
                </div>
              </div>
            </div>

            {/* Plan Type Box + Edit Button */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 w-full sm:w-auto bg-[#07162B]/80 border border-[#0E274D] rounded-xl p-3 shadow-inner">
              <div className="text-left sm:text-right">
                <div className="flex items-center sm:justify-end gap-1 text-[11px] text-slate-400">
                  <Tag className="h-3 w-3 text-[#F5B544]" />
                  <span>Plan Type</span>
                </div>
                <div className="text-sm font-semibold text-white mt-0.5">
                  {planTypeTier}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onEditStudent}
                className="h-7 px-2.5 text-xs text-slate-200 hover:text-white bg-[#0F2342] border-[#F5B544]/30 hover:border-[#F5B544] hover:bg-[#F5B544]/15 cursor-pointer rounded-lg"
              >
                <Pencil className="h-3 w-3 mr-1 text-[#F5B544]" />
                Edit Student
              </Button>
            </div>
          </div>

          {/* Bottom Badges and Subtitle Row */}
          <div className="mt-4 pt-4 border-t border-[#0E274D]/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs relative z-10">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Plan status dropdown badge */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold border transition-all cursor-pointer shadow-xs",
                      currentPlanType === "IEP"
                        ? "bg-indigo-500/20 text-indigo-200 border-indigo-500/40 hover:bg-indigo-500/30"
                        : currentPlanType === "504"
                        ? "bg-cyan-500/20 text-cyan-200 border-cyan-500/40 hover:bg-cyan-500/30"
                        : "bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-700/70"
                    )}
                    title="Click to change plan status"
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        currentPlanType === "IEP"
                          ? "bg-indigo-400 animate-pulse"
                          : currentPlanType === "504"
                          ? "bg-cyan-400"
                          : "bg-slate-400"
                      )}
                    />
                    <span>{currentPlanType}</span>
                    <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-[#07162B] border-[#0E274D] text-slate-200 shadow-xl">
                  <DropdownMenuItem
                    onClick={() => onUpdatePlanType("IEP")}
                    className="gap-2 cursor-pointer hover:bg-white/[0.08] text-xs font-medium"
                  >
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    <span>IEP</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onUpdatePlanType("504")}
                    className="gap-2 cursor-pointer hover:bg-white/[0.08] text-xs font-medium"
                  >
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span>504</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onUpdatePlanType("No IEP/504 Yet")}
                    className="gap-2 cursor-pointer hover:bg-white/[0.08] text-xs font-medium"
                  >
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>No IEP/504 Yet</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Case status badge */}
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold border shadow-xs",
                isArchived
                  ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                  : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
              )}>
                <span className={cn("w-2 h-2 rounded-full", isArchived ? "bg-amber-400" : "bg-emerald-400")} />
                <span>{isArchived ? "Archived Case" : "Active Case"}</span>
              </span>
            </div>

            {/* Subtitle status line */}
            <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <KeyRound className="h-3 w-3 text-slate-400" />
                Portal: <strong className={portalStatus?.hasCredentials ? "text-emerald-400" : "text-amber-400"}>
                  {portalStatus?.hasCredentials ? "Active" : "Pending"}
                </strong>
              </span>
              <span>·</span>
              <span>Participants: <strong className="text-slate-200">2</strong></span>
              <span>·</span>
              <span>Visible to you + <strong className="text-slate-200">{parentFullName}</strong></span>
            </div>
          </div>
        </div>

        {/* Right Card: Student Information Reference (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl bg-[#0A1A33] border border-[#0E274D] p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#0E274D] pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-[#F5B544]" />
                <h3 className="text-sm font-bold text-white font-serif tracking-wide">
                  Student Information
                </h3>
              </div>
              <span className="text-[11px] italic text-slate-400 font-serif">
                Every student has a brighter path.
              </span>
            </div>

            {/* Structured Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
              <div>
                <span className="text-slate-400 block text-[10.5px]">Age</span>
                <span className="font-semibold text-white">
                  {calculatedAge !== null ? `${calculatedAge} yrs` : (contact.dateOfBirth || "Not set")}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10.5px]">District</span>
                <span className="font-semibold text-white truncate block">
                  {contact.countyDistrict || contact.schoolDistrict || "Marietta City Schools"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10.5px]">Grade</span>
                <span className="font-semibold text-white">
                  {contact.gradeLevel || "Not set"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10.5px]">Transfer School</span>
                <span className="font-semibold text-white truncate block">
                  {contact.previousSchool && contact.goingToSchool
                    ? `${contact.previousSchool} → ${contact.goingToSchool}`
                    : (contact.previousSchool || contact.goingToSchool || "—")}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10.5px]">School</span>
                <span className="font-semibold text-white truncate block">
                  {contact.schoolName || "Not set"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10.5px]">GTID / Student ID</span>
                <span className="font-mono font-semibold text-[#F5B544]">
                  {contact.gtid || contact.studentIdNumber || `GTID-${contact.id * 10427}`}
                </span>
              </div>
            </div>
          </div>

          {/* Optional Transition Callout if defined */}
          {(contact.previousSchool || contact.goingToSchool) && (
            <div className="mt-3 pt-2.5 border-t border-[#0E274D]/80 flex items-center gap-1.5 text-[11px] text-[#F5B544] bg-[#07162B]/60 px-2.5 py-1.5 rounded-lg">
              <ArrowRight className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {contact.previousSchool ? `From ${contact.previousSchool}` : ""}
                {contact.previousSchool && contact.goingToSchool ? " to " : ""}
                {contact.goingToSchool ? `${contact.goingToSchool}` : ""}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
