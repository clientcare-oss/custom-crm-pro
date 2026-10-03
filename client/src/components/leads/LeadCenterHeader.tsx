import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Zap, PhoneCall, ClipboardList, TrendingUp } from "lucide-react";
import PageIdBadge from "@/components/PageIdBadge";

interface LeadCenterHeaderProps {
  onManageForms: () => void;
  onViewDiscoveryProcess: () => void;
  onQuickSetup: () => void;
  onAddLead: () => void;
}

export function LeadCenterHeader({
  onManageForms,
  onViewDiscoveryProcess,
  onQuickSetup,
  onAddLead,
}: LeadCenterHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#3A2C18]">
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-[#020A17] border border-[#3A2C18] flex items-center justify-center text-[#FFE394] shadow-md shadow-black/40 shrink-0">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#FFF4D4] tracking-wide">
              Lead Center
            </h1>
            <PageIdBadge id="PG-003" />
          </div>
          <p className="text-xs sm:text-sm text-[#C6B697] mt-0.5">
            Track families through your discovery process, call pipeline, and prospective intake.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={onManageForms}
          variant="outline"
          size="sm"
          className="h-9 px-3 text-xs font-semibold border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <ClipboardList className="size-3.5 shrink-0 text-[#C5A059]" />
          <span>Manage Forms</span>
        </Button>

        <Button
          onClick={onViewDiscoveryProcess}
          variant="outline"
          size="sm"
          className="h-9 px-3 text-xs font-semibold border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <PhoneCall className="size-3.5 shrink-0 text-[#FFE394]" />
          <span>Discovery Call Console</span>
        </Button>

        <Button
          onClick={onQuickSetup}
          variant="outline"
          size="sm"
          className="h-9 px-3 text-xs font-semibold border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Zap className="size-3.5 shrink-0 text-[#DFBE77]" />
          <span>Quick Setup</span>
        </Button>

        <Button
          onClick={onAddLead}
          size="sm"
          className="h-9 px-4 text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-105 rounded-xl inline-flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Lead</span>
        </Button>
      </div>
    </div>
  );
}
