import React from "react";
import { Headset, ExternalLink, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NoActiveCallHeroProps {
  onOpenQuoPhone: () => void;
  onOpenCallWorkspace?: () => void;
}

export function NoActiveCallHero({ onOpenQuoPhone, onOpenCallWorkspace }: NoActiveCallHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#05142B]/90 border border-[#3A2C18] p-5 sm:p-6 text-center shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] select-none">
      {/* Background Nautical Bathymetric Ocean Wave SVG in Aged Brass */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 800 240"
        preserveAspectRatio="none"
      >
        <path
          d="M0,80 C150,140 300,30 450,90 C600,150 720,50 800,70 L800,240 L0,240 Z"
          fill="none"
          stroke="rgba(197, 160, 89, 0.22)"
          strokeWidth="1.5"
        />
        <path
          d="M0,110 C180,50 320,160 480,110 C620,60 710,130 800,100"
          fill="none"
          stroke="rgba(197, 160, 89, 0.16)"
          strokeWidth="1.2"
          strokeDasharray="4 4"
        />
        <path
          d="M0,140 C140,190 280,100 440,150 C580,200 700,120 800,150"
          fill="none"
          stroke="rgba(197, 160, 89, 0.10)"
          strokeWidth="1"
        />
      </svg>


      <div className="relative z-10 max-w-lg mx-auto flex flex-col items-center">
        {/* Headphone Icon Circle with Soft Glowing Pulse */}
        <div className="relative mb-2">
          <div className="w-12 h-12 rounded-full bg-[#020A17] border border-[#3A2C18] flex items-center justify-center text-[#C5A059] shadow-[0_0_24px_rgba(0,0,0,0.8)]">
            <Headset className="h-6 w-6" />
          </div>
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#020A17] flex items-center justify-center">
            <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
          </span>
        </div>

        {/* Title & Description */}
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#FFF4D4] tracking-tight">
          No Active Call
        </h2>
        <p className="text-xs sm:text-sm text-[#C6B697] mt-0.5 max-w-md leading-relaxed">
          Use Quo to place or receive calls. Work callbacks, voicemails, and prospective family discovery calls from here.
        </p>

        {/* Primary Gold Action Button & Workspace Launcher */}
        <div className="mt-3.5 sm:mt-4 flex items-center justify-center gap-3 flex-wrap">
          <Button
            asChild
            className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold px-5 py-2.5 h-auto rounded-xl border border-[#FFE394]/50 shadow-[0_3px_10px_rgba(0,0,0,0.8)] hover:brightness-105 transition-all gap-2 text-xs sm:text-sm cursor-pointer"
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

          {onOpenCallWorkspace && (
            <Button
              variant="outline"
              onClick={onOpenCallWorkspace}
              className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] font-semibold px-5 py-2.5 h-auto rounded-xl gap-2 text-xs sm:text-sm cursor-pointer transition-all"
            >
              <PhoneCall className="h-3.5 w-3.5 text-[#FFE394]" />
              Open Call Workspace
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default NoActiveCallHero;
