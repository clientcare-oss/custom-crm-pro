import React from "react";
import { 
  User, Pencil, GraduationCap, School, 
  ArrowRight, ShieldCheck, Award, Activity, Globe,
  Landmark, Star, AlertTriangle, CheckCircle2, Clock
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
  displayDistrict?: string;
  currentSchool?: string;
  originalSchool?: string;
  transferSchool?: string;
  gtidValue: string;
  displayEligibility: string;
  displayMedicalDiagnoses: string;
  clientTime: string;
  onEditDetails: () => void;
  offset?: { x: number; y: number };
  reviewStatus?: "none" | "requested" | "followup_due" | "verified";
  onOpenReviews?: () => void;
  contactConcernStatus?: "active" | "resolved" | null;
  hasPendingVerification?: boolean;
  isContactUpdated?: boolean;
  onOpenContactHistory?: () => void;
}

export function StudentProfileDossier({
  student,
  studentInitials,
  fullName,
  parentName,
  parentPhone,
  calculatedAge,
  cleanGrade,
  displayDistrict,
  currentSchool,
  originalSchool,
  transferSchool,
  gtidValue,
  displayEligibility,
  displayMedicalDiagnoses,
  clientTime,
  onEditDetails,
  offset = { x: -34, y: -10 },
  reviewStatus = "none",
  onOpenReviews,
  contactConcernStatus = null,
  hasPendingVerification = false,
  isContactUpdated = false,
  onOpenContactHistory,
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
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap justify-center">
          <Badge className="bg-[#123159]/85 text-sky-200 border border-sky-400/40 text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full">
            IEP
          </Badge>
          <Badge className="bg-[#093527]/85 text-emerald-300 border border-emerald-500/40 text-[9px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
            <span>{student?.studentStatus || "Active"}</span>
          </Badge>

          {/* Contextual Contact Concern Pill */}
          {contactConcernStatus === "active" && (
            <button
              type="button"
              onClick={onOpenContactHistory}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-rose-500/20 border border-rose-500/50 text-rose-200 hover:bg-rose-500/30 transition-all cursor-pointer animate-pulse"
              title="Active Contact Concern — Click to open Contact History"
            >
              <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
              <span>Contact Concern</span>
            </button>
          )}

          {/* Contextual Verification Pending Pill */}
          {hasPendingVerification && contactConcernStatus !== "active" && (
            <button
              type="button"
              onClick={onOpenContactHistory}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-sky-500/20 border border-sky-400/40 text-sky-200 hover:bg-sky-500/30 transition-all cursor-pointer"
              title="Verification Pending — Proposed email/phone change requires verification"
            >
              <Clock className="w-2.5 h-2.5 text-sky-300" />
              <span>Verification Pending</span>
            </button>
          )}

          {/* Contextual Contact Updated Pill */}
          {isContactUpdated && !hasPendingVerification && contactConcernStatus !== "active" && (
            <button
              type="button"
              onClick={onOpenContactHistory}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/30 transition-all cursor-pointer"
              title="Contact Updated — Recent contact changes recorded"
            >
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-300" />
              <span>Contact Updated</span>
            </button>
          )}

          {/* Contextual Review Status Pill */}
          {reviewStatus === "verified" && (
            <button
              type="button"
              onClick={onOpenReviews}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/15 border border-[#F1CB6C]/40 text-[#FFE394] hover:bg-amber-500/25 transition-all shadow-[0_0_8px_rgba(241,203,108,0.2)] cursor-pointer"
              title="Google Review Verified — Click to view Reviews"
            >
              <Star className="w-2.5 h-2.5 fill-[#F1CB6C] text-[#F1CB6C]" />
              <span>Review Verified</span>
            </button>
          )}
          {reviewStatus === "requested" && (
            <button
              type="button"
              onClick={onOpenReviews}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-sky-500/15 border border-sky-400/35 text-sky-200 hover:bg-sky-500/25 transition-all cursor-pointer"
              title="Review Requested — Click to view Reviews"
            >
              <span>Review Requested</span>
            </button>
          )}
          {reviewStatus === "followup_due" && (
            <button
              type="button"
              onClick={onOpenReviews}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/20 border border-amber-500/50 text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer animate-pulse"
              title="Follow-Up Due — Click to view Reviews"
            >
              <span>Follow-Up Due</span>
            </button>
          )}
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

        {/* State */}
        <div className="flex items-center justify-between gap-1.5 py-0.5">
          <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
            <Globe className="h-3 w-3 text-[#38BDF8]" />
            <span>State:</span>
          </div>
          <span className="font-bold text-white text-right">
            {student?.state || "Georgia"}
          </span>
        </div>

        {/* District */}
        <div className="flex items-center justify-between gap-1.5 py-0.5">
          <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
            <Landmark className="h-3 w-3 text-[#38BDF8] shrink-0" />
            <span>District:</span>
          </div>
          <span 
            className="font-bold text-white truncate max-w-[145px] text-right" 
            title={displayDistrict || student?.countyDistrict || "Paulding County School District"}
          >
            {displayDistrict || student?.countyDistrict || "Paulding County School District"}
          </span>
        </div>

        {/* Current School */}
        <div className="flex items-center justify-between gap-1.5 py-0.5">
          <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
            <School className="h-3 w-3 text-[#38BDF8] shrink-0" />
            <span>Current School:</span>
          </div>
          <span 
            className="font-bold text-white truncate max-w-[145px] text-right" 
            title={student?.schoolName || currentSchool || "Connie Dugan Elementary"}
          >
            {student?.schoolName || currentSchool || "Connie Dugan Elementary"}
          </span>
        </div>

        {/* Original School */}
        <div className="flex items-center justify-between gap-1.5 py-0.5">
          <div className="flex items-center gap-1.5 text-slate-300 shrink-0">
            <ArrowRight className="h-3 w-3 text-[#38BDF8] shrink-0" />
            <span>Original School:</span>
          </div>
          <span 
            className="font-bold text-white truncate max-w-[130px] text-right" 
            title={originalSchool || student?.previousSchool || student?.schoolName || "The Lovett School"}
          >
            {originalSchool || student?.previousSchool || student?.schoolName || "The Lovett School"}
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
        <div className="pt-1.5 border-t border-white/10 space-y-1">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onOpenContactHistory}
              title="Click to view Parent Profile, Contact History & Concerns"
              className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-left group cursor-pointer"
            >
              <User className="h-3 w-3 text-white/50 group-hover:text-[#D4AF37] transition-colors" />
              <span>Parent: <strong className="text-white group-hover:text-[#FFE394] transition-colors underline decoration-dotted decoration-white/30">{parentName}</strong></span>
            </button>
            <a href={`tel:${parentPhone}`} className="text-sky-300 hover:text-amber-300 transition-colors font-medium">
              {parentPhone}
            </a>
          </div>

          {/* Contextual Account Review Status Pill */}
          {reviewStatus && reviewStatus !== "none" && (
            <div className="flex items-center justify-between pt-0.5 text-[10px]">
              <span className="text-slate-400">Account Review:</span>
              {reviewStatus === "verified" && (
                <button
                  type="button"
                  onClick={onOpenReviews}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/15 border border-[#F1CB6C]/40 text-[#FFE394] hover:bg-amber-500/25 transition-all shadow-[0_0_8px_rgba(241,203,108,0.2)] cursor-pointer"
                  title="Google Review Verified — Click to view in Reviews"
                >
                  <Star className="w-2.5 h-2.5 fill-[#F1CB6C] text-[#F1CB6C]" />
                  <span>Review Verified</span>
                </button>
              )}
              {reviewStatus === "requested" && (
                <button
                  type="button"
                  onClick={onOpenReviews}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-sky-500/15 border border-sky-400/35 text-sky-200 hover:bg-sky-500/25 transition-all cursor-pointer"
                  title="Review Requested — Click to view in Reviews"
                >
                  <span>Review Requested</span>
                </button>
              )}
              {reviewStatus === "followup_due" && (
                <button
                  type="button"
                  onClick={onOpenReviews}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/20 border border-amber-500/50 text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer animate-pulse"
                  title="Follow-Up Due — Click to view in Reviews"
                >
                  <span>Follow-Up Due</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
