import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Phone, GraduationCap, Globe, Edit2, PhoneCall, Calendar } from "lucide-react";
import type { DiscoveryCallItem } from "./types";

interface DiscoveryCallCardProps {
  call: DiscoveryCallItem;
  isToday?: boolean;
  onOpenRecord: (call: DiscoveryCallItem) => void;
  onStartCall?: (leadId: number) => void;
}

export function DiscoveryCallCard({
  call,
  isToday,
  onOpenRecord,
  onStartCall,
}: DiscoveryCallCardProps) {
  return (
    <Card className="rounded-xl border border-[#3A2C18] bg-[#05142B]/90 p-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] hover:border-[#C5A059]/60 transition-all flex flex-col justify-between gap-3 select-none">
      <div className="space-y-2">
        {/* Top Time Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#FFE394] bg-[#020A17] border border-[#3A2C18] px-2 py-0.5 rounded-md">
            <Clock className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
            <span>{call.timeDisplay}</span>
          </div>
          {isToday ? (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/40 shadow-xs">
              Today
            </span>
          ) : (
            <span className="text-xs font-medium text-[#C6B697] flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#A69371]" />
              <span>{call.dateDisplay}</span>
            </span>
          )}
        </div>

        {/* Parent & Student Information */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-serif font-bold text-sm text-[#FFF4D4] truncate">
              {call.parentName}
            </h4>
            {call.parentPhone && (
              <span className="text-xs text-[#C6B697] shrink-0 flex items-center gap-1">
                <Phone className="w-3 h-3 text-[#A69371]" />
                {call.parentPhone}
              </span>
            )}
          </div>
          {call.studentName && (
            <div className="flex items-center gap-1.5 text-xs text-[#C6B697]">
              <GraduationCap className="w-3.5 h-3.5 shrink-0 text-[#A69371]" />
              <span className="truncate">
                Student: <span className="font-medium text-[#FFF4D4]">{call.studentName}</span>
                {(call.studentAge || call.studentGrade) && (
                  <span className="text-[#A69371]">
                    {" "}({[call.studentAge ? `Age ${call.studentAge}` : null, call.studentGrade].filter(Boolean).join(" · ")})
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* National Timezone & Calling Appropriateness Plate */}
        <div className="rounded-lg bg-[#020A17]/85 border border-[#3A2C18]/80 p-2.5 space-y-1.5 shadow-inner">
          <div className="flex items-center justify-between gap-1.5 text-xs flex-wrap">
            <div className="flex items-center gap-1.5 font-medium text-[#FFF4D4]">
              <Globe className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
              <span className="text-[#A69371] text-[11px]">Local:</span>
              <span className="font-mono font-bold text-[#FFE394]">
                {call.clientTimeInfo.timeString}
              </span>
              <span className="text-[10px] text-[#C6B697] font-semibold">
                ({call.callingStatus.tzAbbr} · {call.friendlyTz})
              </span>
            </div>

            <span className="text-[10px] text-[#A69371] font-medium">
              {call.diffHours === 0 ? "Same time as Eastern HQ" : call.diffText}
            </span>
          </div>

          {/* Calling Appropriateness status badge */}
          <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap">
            {call.callingStatus.status === "green" ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#04241B]/90 text-[#6EE7B7] border border-[#059669]/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>✓ Appropriate calling time</span>
              </span>
            ) : call.callingStatus.status === "yellow" ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#2D1B00]/90 text-[#FDE047] border border-[#A35900]/60">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>⚠ Use discretion ({call.callingStatus.recommendation})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#33090F]/90 text-[#FDA4AF] border border-[#9F1239]/60">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span>⚠ {call.callingStatus.label === "Too early" ? "Too early to call" : "Too late to call"}</span>
              </span>
            )}

            {(call.city || call.state) && (
              <span className="text-[10px] text-[#A69371] font-medium truncate max-w-[120px]" title={[call.city, call.state].filter(Boolean).join(", ")}>
                {[call.city, call.state].filter(Boolean).join(", ")}
              </span>
            )}
          </div>
        </div>

        {/* Inquiry Reason */}
        {call.inquiryReason && (
          <div className="text-xs text-[#C6B697] bg-[#000814]/70 rounded-md p-2 border border-[#3A2C18]/60 line-clamp-2">
            <span className="font-semibold text-[#FFE394]">Inquiry: </span>
            {call.inquiryReason}
          </div>
        )}
      </div>

      {/* Card Action Footer */}
      <div className="flex items-center gap-2 pt-2 border-t border-[#3A2C18]">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onOpenRecord(call)}
          className="flex-1 text-xs font-semibold h-8 gap-1.5 border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] rounded-lg cursor-pointer"
        >
          <Edit2 className="w-3 h-3 text-[#A69371]" />
          <span>Open Lead Record</span>
        </Button>
        {call.leadId && onStartCall ? (
          <Button
            size="sm"
            onClick={() => onStartCall(call.leadId!)}
            className="text-xs font-bold h-8 bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-[0_2px_8px_rgba(0,0,0,0.6)] hover:brightness-110 gap-1.5 px-3 cursor-pointer rounded-lg"
          >
            <PhoneCall className="w-3 h-3" />
            <span>Start Call</span>
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
