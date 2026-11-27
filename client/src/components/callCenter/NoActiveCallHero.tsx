import React from "react";
import { Headset, ExternalLink, PhoneCall, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NoActiveCallHeroProps {
  onOpenQuoPhone: () => void;
  onOpenCallWorkspace?: () => void;
  onStartNewInquiry?: () => void;
}

export function NoActiveCallHero({
  onOpenQuoPhone,
  onOpenCallWorkspace,
  onStartNewInquiry,
}: NoActiveCallHeroProps) {
  return (
    <div className="adm-hero-card relative overflow-hidden rounded-[20px] p-6 sm:p-7 text-center select-none">
      <div aria-hidden="true" className="adm-rim-glint-top" />
      <div aria-hidden="true" className="adm-rim-glint-bottom" />

      <div className="relative z-10 max-w-xl mx-auto flex flex-col items-center">
        {/* Sculpted Brass & Leather Headset Medallion with Soft Live Pulse */}
        <div className="relative mb-3">
          <div className="adm-icon-tile w-14 h-14 rounded-2xl flex items-center justify-center text-[#ECC97B]">
            <Headset className="h-6 w-6 drop-shadow-[0_2px_6px_rgba(0,0,0,0.88)]" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#061121] flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.7)]">
            <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
          </span>
        </div>

        {/* Title & Description */}
        <h2 className="text-2xl sm:text-[28px] font-serif font-bold text-[#FAF6EC] tracking-tight drop-shadow-[0_3px_10px_rgba(0,0,0,0.85)]">
          No Active Call
        </h2>
        <p className="text-xs sm:text-sm text-[#C6D4E6] mt-1 max-w-md leading-relaxed">
          Use Quo to place or receive calls. Work callbacks, voicemails, and prospective family discovery calls from here.
        </p>

        {/* Primary Machined Brass Action Button & Sculpted Leather Launchers */}
        <div className="mt-4 sm:mt-5 flex items-center justify-center gap-2.5 sm:gap-3 flex-wrap">
          <Button
            asChild
            className="adm-cal-pill-active font-bold px-5 py-2.5 h-auto rounded-xl gap-2 text-xs sm:text-sm cursor-pointer"
          >
            <a
              href="quo://"
              onClick={() => {
                try {
                  window.location.href = "quo://";
                } catch {}
                onOpenQuoPhone();
              }}
            >
              <ExternalLink className="h-3.5 w-3.5 stroke-[2.5]" />
              Open Quo Phone
            </a>
          </Button>

          {onStartNewInquiry && (
            <Button
              variant="outline"
              onClick={onStartNewInquiry}
              data-testid="call-center-hero-new-inquiry-btn"
              className="adm-cal-pill text-[#E8DEC8] hover:text-[#FAF6EC] font-semibold px-5 py-2.5 h-auto rounded-xl gap-2 text-xs sm:text-sm cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5 text-[#ECC97B]" />
              New Service Inquiry
            </Button>
          )}

          {onOpenCallWorkspace && (
            <Button
              variant="outline"
              onClick={onOpenCallWorkspace}
              data-testid="call-center-open-workspace-btn"
              className="adm-cal-pill text-[#E8DEC8] hover:text-[#FAF6EC] font-semibold px-5 py-2.5 h-auto rounded-xl gap-2 text-xs sm:text-sm cursor-pointer"
            >
              <PhoneCall className="h-3.5 w-3.5 text-[#ECC97B]" />
              Open Call Workspace
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default NoActiveCallHero;
