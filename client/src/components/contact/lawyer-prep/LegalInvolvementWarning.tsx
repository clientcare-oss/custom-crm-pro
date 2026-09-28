import React from "react";
import { AlertTriangle, Scale, Sparkles, User, Building, Calendar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LegalInvolvementWarningProps {
  attorneyName?: string | null;
  attorneyFirm?: string | null;
  attorneyRepresents?: string | null;
  attorneyInvolvementDate?: string | null;
  onOpenDetails: () => void;
  onOpenLawyerPrep: () => void;
}

export function LegalInvolvementWarning({
  attorneyName,
  attorneyFirm,
  attorneyRepresents = "Parent/Student",
  attorneyInvolvementDate,
  onOpenDetails,
  onOpenLawyerPrep,
}: LegalInvolvementWarningProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-rose-500/80 bg-gradient-to-r from-[#240509] via-[#330910] to-[#240509] p-4 sm:p-5 shadow-[0_0_25px_rgba(244,63,94,0.25)] transition-all">
      {/* Background ambient red glow */}
      <div className="absolute -top-12 -left-12 h-36 w-36 rounded-full bg-rose-600/15 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 h-36 w-36 rounded-full bg-rose-600/15 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Alert Icon + Warning Message + Attorney Identity */}
        <div 
          onClick={onOpenDetails}
          className="flex items-start gap-3.5 cursor-pointer group select-none min-w-0 flex-1"
          title="Click to view and edit legal representation details"
        >
          {/* Pulsing Alert Light & Icon */}
          <div className="relative shrink-0 mt-0.5">
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
            </span>
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-rose-950/90 border border-rose-500/50 flex items-center justify-center text-rose-300 shadow-inner group-hover:border-rose-400 transition-colors">
              <Scale className="w-5 h-5 text-rose-400" />
            </div>
          </div>

          {/* Warning Copy */}
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/25 border border-rose-500/60 text-rose-200 flex items-center gap-1 shadow-xs">
                <AlertTriangle className="w-3 h-3 text-rose-300 inline shrink-0" />
                🚨 ⚖️ LAWYER INVOLVED
              </span>

              {attorneyRepresents && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/10 text-slate-200 border border-white/10">
                  Represents: {attorneyRepresents}
                </span>
              )}
            </div>

            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5 group-hover:text-rose-200 transition-colors">
              <span>This student has active legal involvement.</span>
              <ChevronRight className="w-4 h-4 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </h3>

            {/* Quick Attorney Snapshot */}
            <div className="flex items-center gap-3 flex-wrap text-xs text-rose-200/90 pt-0.5">
              {attorneyName && (
                <span className="flex items-center gap-1 font-medium">
                  <User className="w-3 h-3 text-rose-400 shrink-0" />
                  <strong className="text-white">{attorneyName}</strong>
                </span>
              )}
              {attorneyFirm && (
                <span className="flex items-center gap-1 text-slate-300">
                  <Building className="w-3 h-3 text-rose-400 shrink-0" />
                  <span>{attorneyFirm}</span>
                </span>
              )}
              {attorneyInvolvementDate && (
                <span className="flex items-center gap-1 text-slate-300">
                  <Calendar className="w-3 h-3 text-rose-400 shrink-0" />
                  <span>Involved: {attorneyInvolvementDate}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-rose-500/30">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenDetails}
            className="h-8 sm:h-9 px-3 text-xs font-semibold border-rose-500/40 bg-rose-950/40 text-rose-200 hover:bg-rose-900/60 hover:text-white hover:border-rose-400 transition-all cursor-pointer"
          >
            <Scale className="w-3.5 h-3.5 mr-1.5 text-rose-300" />
            Attorney Details
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onOpenLawyerPrep}
            className="h-8 sm:h-9 px-3.5 text-xs font-bold bg-gradient-to-r from-[#F5B544] via-amber-400 to-[#F5B544] text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-md shadow-amber-500/20 border border-amber-300/40 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
            <Scale className="w-3.5 h-3.5 text-slate-950" />
            <span>Prepare Case for Lawyer</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
