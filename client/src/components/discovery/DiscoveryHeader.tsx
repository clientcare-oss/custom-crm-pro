import React from "react";
import { ArrowLeft, Phone, Mail, User, GraduationCap, Calendar, Save, CheckCircle2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DiscoveryHeaderProps {
  lead?: {
    name?: string;
    parentName?: string;
    parentEmail?: string;
    parentPhone?: string;
    studentName?: string;
    schoolName?: string;
    gradeLevel?: string;
    status?: string;
  };
  saving: boolean;
  lastSaved: Date | null;
  onBack: () => void;
  onManualSave: () => void;
  onOpenSettings?: () => void;
}

export default function DiscoveryHeader({
  lead,
  saving,
  lastSaved,
  onBack,
  onManualSave,
  onOpenSettings,
}: DiscoveryHeaderProps) {
  return (
    <div className="bg-[#0A1628]/95 border-b border-slate-800 p-4 sticky top-0 z-20 backdrop-blur-md">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            onClick={onBack}
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white hover:bg-slate-800/60 p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase font-bold tracking-wider text-amber-400">
                Discovery Call Process
              </span>
              <span className="rounded border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider text-amber-300">
                PG-003-DC
              </span>
              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  title="Discovery Call Process Settings"
                  className="p-1 rounded-full text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              )}
              {lead?.status && (
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                  {lead.status}
                </Badge>
              )}
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight mt-0.5">
              {lead?.parentName || lead?.name || "Discovery Call Worksheet"}
            </h1>
            <div className="flex items-center gap-4 text-xs text-slate-400 mt-1 flex-wrap">
              {lead?.studentName && (
                <span className="flex items-center gap-1.5 text-amber-400">
                  <GraduationCap className="w-3.5 h-3.5" />
                  {lead.studentName} {lead.gradeLevel ? `(${lead.gradeLevel})` : ""}
                </span>
              )}
              {lead?.parentPhone && (
                <a href={`tel:${lead.parentPhone}`} className="flex items-center gap-1 hover:text-amber-400 transition-colors">
                  <Phone className="w-3.5 h-3.5" />
                  {lead.parentPhone}
                </a>
              )}
              {lead?.parentEmail && (
                <a href={`mailto:${lead.parentEmail}`} className="flex items-center gap-1 hover:text-amber-400 transition-colors truncate max-w-[200px]">
                  <Mail className="w-3.5 h-3.5" />
                  {lead.parentEmail}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          {saving ? (
            <span className="text-xs text-amber-400/80 animate-pulse">Saving changes...</span>
          ) : lastSaved ? (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              Saved {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          ) : null}

          <Button
            onClick={onManualSave}
            disabled={saving}
            size="sm"
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs gap-1.5"
          >
            <Save className="w-3.5 h-3.5" /> Save Session
          </Button>
        </div>
      </div>
    </div>
  );
}
