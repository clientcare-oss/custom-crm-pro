import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Phone, GraduationCap, Calendar, PhoneCall, Edit2, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseDiscoveryDateTime, getStatusColor, type LeadStatus } from "./types";

interface LeadCardProps {
  lead: any;
  status: LeadStatus;
  onEdit: (lead: any) => void;
  onBeginCall: (leadId: number) => void;
  onViewContact: (contactId: number) => void;
}

export function LeadCard({
  lead,
  status,
  onEdit,
  onBeginCall,
  onViewContact,
}: LeadCardProps) {
  const parsed = lead.discoveryCallDate ? parseDiscoveryDateTime(lead.discoveryCallDate) : null;

  return (
    <Card className="rounded-xl border border-[#3A2C18] bg-[#020A17]/95 hover:bg-[#05142B] hover:border-[#C5A059]/80 p-3.5 shadow-[0_4px_16px_rgba(0,0,0,0.7)] transition-all space-y-2.5 overflow-hidden select-none">
      <div className="space-y-2.5">
        {/* Student Name as Card Title */}
        <div className="min-w-0">
          <h4 className="font-serif font-bold text-[#FFF4D4] text-sm leading-snug break-words">
            {lead.studentName || lead.source || "Untitled Lead"}
          </h4>
          {lead.studentName && lead.source && (
            <p className="text-xs text-[#C6B697] mt-0.5 truncate" title={`via ${lead.source}`}>
              via {lead.source}
            </p>
          )}
        </div>

        {/* Parent Info */}
        {(lead.parentName || lead.parentPhone) && (
          <div className="space-y-1">
            {lead.parentName && (
              <div className="flex items-center gap-1.5 text-xs text-[#C6B697] min-w-0">
                <User className="size-3.5 shrink-0 text-[#A69371]" />
                <span className="truncate">{lead.parentName}</span>
              </div>
            )}
            {lead.parentPhone && (
              <div className="flex items-center gap-1.5 text-xs text-[#C6B697] min-w-0">
                <Phone className="size-3.5 shrink-0 text-[#A69371]" />
                <span className="truncate">{lead.parentPhone}</span>
              </div>
            )}
          </div>
        )}

        {/* Student Details */}
        {(lead.studentAge || lead.studentGrade) && (
          <div className="flex items-center gap-1.5 text-xs text-[#C6B697] min-w-0">
            <GraduationCap className="size-3.5 shrink-0 text-[#A69371]" />
            <span className="truncate">
              {[
                lead.studentAge ? `Age ${lead.studentAge}` : null,
                lead.studentGrade || null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
        )}

        {/* Discovery Call Scheduled Date & Time */}
        {parsed && (
          <div className="flex items-center justify-between gap-1.5 text-xs p-2 rounded-lg bg-[#000814]/70 border border-[#3A2C18]/60 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <Calendar className={cn("size-3.5 shrink-0", parsed.isToday ? "text-[#C5A059]" : "text-[#A69371]")} />
              <span className={cn("truncate", parsed.isToday ? "font-bold text-[#FFE394]" : "text-[#C6B697]")}>
                Discovery: {parsed.dateDisplay}{parsed.hasSpecificTime ? ` · ${parsed.timeDisplay}` : ""}
              </span>
            </div>
            {parsed.isToday && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/40 shrink-0 shadow-xs">
                Today
              </span>
            )}
          </div>
        )}

        {/* Deal Value */}
        {lead.value && (
          <div className="text-sm font-serif font-bold text-[#FFE394]">
            ${parseFloat(lead.value).toLocaleString()}
          </div>
        )}

        {/* Status Badge */}
        <div>
          <div
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold max-w-full truncate shadow-xs ${getStatusColor(
              status
            )}`}
          >
            {status === "New" ? "Discovery Call" : status}
          </div>
        </div>

        {/* Notes */}
        {lead.notes && (
          <p className="text-xs text-[#A69371] line-clamp-2 break-words" title={lead.notes}>
            {lead.notes}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-1.5 pt-1 border-t border-[#3A2C18]/60">
          {status === "New" && (
            <Button
              onClick={() => onBeginCall(lead.id)}
              size="sm"
              className="w-full min-w-0 rounded-lg bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] text-xs font-bold gap-1.5 px-3 py-1.5 border border-[#FFE394]/50 shadow-[0_2px_8px_rgba(0,0,0,0.6)] hover:brightness-110 justify-center cursor-pointer"
            >
              <PhoneCall className="size-3.5 shrink-0" />
              <span className="truncate">Begin Discovery Call</span>
            </Button>
          )}
          <div className="flex items-center gap-1.5">
            <Button
              onClick={() => onEdit(lead)}
              variant="outline"
              size="sm"
              title="Edit Lead"
              aria-label="Edit Lead"
              className={cn(
                "rounded-lg border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] shadow-xs text-xs font-semibold gap-1.5 cursor-pointer",
                (lead as any).contactId ? "h-8 w-8 p-0 shrink-0 justify-center" : "flex-1 min-w-0 py-1 px-2.5 justify-center"
              )}
            >
              <Edit2 className="size-3.5 shrink-0 text-[#A69371]" />
              {!(lead as any).contactId && <span className="truncate">Edit Lead</span>}
            </Button>
            {(lead as any).contactId ? (
              <Button
                onClick={() => onViewContact((lead as any).contactId)}
                variant="outline"
                size="sm"
                className="flex-1 min-w-0 rounded-lg border border-[#3A2C18] bg-[#020A17] px-2.5 py-1 text-xs font-semibold text-[#FFE394] hover:bg-[#07162B] gap-1.5 justify-center cursor-pointer"
              >
                <UserCircle className="size-3.5 shrink-0 text-[#C5A059]" />
                <span className="truncate">View Contact</span>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
