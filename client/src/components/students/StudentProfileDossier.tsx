import React from "react";
import { 
  User, Pencil, GraduationCap, School, 
  ArrowRight, ShieldCheck, Award, Activity, Globe 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface StudentProfileDossierProps {
  student: any;
  studentInitials: string;
  fullName: string;
  parentName: string;
  parentPhone: string;
  calculatedAge: string;
  cleanGrade: string;
  transferSchool: string;
  gtidValue: string;
  displayEligibility: string;
  displayMedicalDiagnoses: string;
  clientTime: string;
  onEditDetails: () => void;
  offset?: { x: number; y: number };
}

export function StudentProfileDossier({
  student,
  studentInitials,
  fullName,
  parentName,
  parentPhone,
  calculatedAge,
  cleanGrade,
  transferSchool,
  gtidValue,
  displayEligibility,
  displayMedicalDiagnoses,
  clientTime,
  onEditDetails,
  offset = { x: -34, y: -10 },
}: StudentProfileDossierProps) {
  return (
    <div 
      className="w-full max-w-[275px] mx-auto flex flex-col justify-between relative transition-all text-left"
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px)`,
      }}
    >
      {/* Golden Glowing Avatar Badge Centered on Top */}
      <div className="flex flex-col items-center text-center mb-2.5">
        <div className="relative mb-1.5 mt-0.5">
          <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border-2 border-[#D4AF37] bg-gradient-to-br from-[#122847] to-[#081628] flex items-center justify-center text-[#F4D068] font-bold text-xl shadow-[0_0_20px_rgba(212,175,55,0.4)] ring-4 ring-[#081b35]/50">
            {studentInitials}
          </div>
        </div>

        {/* Student Name */}
        <h2 
          className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          {fullName}
        </h2>

        {/* Pill Badges */}
        <div className="flex items-center gap-1.5 mt-1.5">
          <Badge className="bg-[#123159]/85 text-sky-200 border border-sky-400/40 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full">
            IEP
          </Badge>
          <Badge className="bg-[#093527]/85 text-emerald-300 border border-emerald-500/40 text-[9px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
            <span>{student?.studentStatus || "Active"}</span>
          </Badge>
        </div>
      </div>

      {/* ── STUDENT PROFILE Info (Tight, Transparent on Leather) ── */}
      <div className="w-full space-y-1.5 px-0.5 bg-transparent border-0 shadow-none text-[11px]">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-1 border-b border-white/15">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1">
            <User className="h-3 w-3 text-[#38BDF8]" />
            <span>STUDENT PROFILE</span>
          </span>
          <button
            type="button"
            onClick={onEditDetails}
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#38BDF8] hover:text-sky-300 transition-colors cursor-pointer"
          >
            <Pencil className="h-2.5 w-2.5" />
            <span>Edit Details</span>
          </button>
        </div>

        {/* Age */}
        <div className="flex items-center justify-between gap-1.5 py-0.5">
          <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
            <User className="h-3 w-3 text-[#38BDF8]" />
            <span>Age:</span>
          </div>
          <span className="font-bold text-white text-right">
            {calculatedAge}
          </span>
        </div>

        {/* Grade */}
        <div className="flex items-center justify-between gap-1.5 py-0.5">
          <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
            <GraduationCap className="h-3 w-3 text-[#38BDF8] shrink-0" />
            <span>Grade:</span>
          </div>
          <span className="font-bold text-white text-right">
            {cleanGrade}
          </span>
        </div>

        {/* School */}
        <div className="flex items-center justify-between gap-1.5 py-0.5">
          <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
            <School className="h-3 w-3 text-[#38BDF8] shrink-0" />
            <span>School:</span>
          </div>
          <span className="font-bold text-white truncate max-w-[145px] text-right" title={student?.schoolName || "Lincoln Elementary"}>
            {student?.schoolName || "Lincoln Elementary"}
          </span>
        </div>

        {/* Transfer School */}
        <div className="flex items-center justify-between gap-1.5 py-0.5">
          <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
            <ArrowRight className="h-3 w-3 text-[#38BDF8] shrink-0" />
            <span>Transfer School:</span>
          </div>
          <span className="font-bold text-white truncate max-w-[130px] text-right" title={transferSchool}>
            {transferSchool}
          </span>
        </div>

        {/* GTID */}
        <div className="flex items-center justify-between gap-1.5 py-0.5">
          <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
            <ShieldCheck className="h-3 w-3 text-[#38BDF8] shrink-0" />
            <span>GTID:</span>
          </div>
          <span className="font-bold text-white font-mono text-right">
            {gtidValue}
          </span>
        </div>

        {/* Eligibility */}
        <div className="flex items-center justify-between gap-1.5 py-0.5">
          <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
            <Award className="h-3 w-3 text-[#38BDF8] shrink-0" />
            <span>Eligibility:</span>
          </div>
          <span className="font-bold text-white text-right truncate max-w-[140px]" title={displayEligibility}>
            {displayEligibility}
          </span>
        </div>

        {/* Medical Diagnoses */}
        <div className="pt-1.5 border-t border-white/10">
          <div className="flex items-center gap-1.5 text-slate-300 mb-0.5">
            <Activity className="h-3 w-3 text-[#38BDF8] shrink-0" />
            <span>Medical Diagnoses:</span>
          </div>
          <div className="pl-4">
            <span className="font-bold text-white text-left block leading-snug break-words text-[10.5px]" title={displayMedicalDiagnoses}>
              {displayMedicalDiagnoses}
            </span>
          </div>
        </div>

        {/* Client Time */}
        <div className="pt-1.5 border-t border-white/10">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Globe className="h-3 w-3 text-[#38BDF8] shrink-0" />
              <span>Client Time:</span>
              <strong className="text-white font-semibold">{clientTime}</strong>
              <span className="text-white/60 text-[10px]">(Eastern)</span>
            </div>
          </div>
          <div className="flex items-center justify-between pl-4 pt-0.5 text-[10px]">
            <span className="text-slate-400">Same time as you</span>
            <span className="text-[9px] font-semibold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Good to call
            </span>
          </div>
        </div>

        {/* Parent / Guardian Row */}
        <div className="pt-1.5 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-1 text-slate-400">
            <User className="h-3 w-3 text-white/50" />
            <span>Parent: <strong className="text-white">{parentName}</strong></span>
          </div>
          <a href={`tel:${parentPhone}`} className="text-sky-300 hover:text-amber-300 transition-colors font-medium">
            {parentPhone}
          </a>
        </div>
      </div>
    </div>
  );
}
