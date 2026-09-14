import React from "react";
import { Headset, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NoActiveCallHeroProps {
  onOpenQuoPhone: () => void;
}

export function NoActiveCallHero({ onOpenQuoPhone }: NoActiveCallHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#000821] via-[#001035] to-[#000821] border border-sky-500/25 p-5 sm:p-6 text-center shadow-lg">
      {/* Background Nautical Bathymetric Ocean Wave SVG */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-25"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 800 240"
        preserveAspectRatio="none"
      >
        <path
          d="M0,80 C150,140 300,30 450,90 C600,150 720,50 800,70 L800,240 L0,240 Z"
          fill="none"
          stroke="rgba(56, 189, 248, 0.25)"
          strokeWidth="1.5"
        />
        <path
          d="M0,110 C180,50 320,160 480,110 C620,60 710,130 800,100"
          fill="none"
          stroke="rgba(14, 165, 233, 0.2)"
          strokeWidth="1.2"
          strokeDasharray="4 4"
        />
        <path
          d="M0,140 C140,190 280,100 440,150 C580,200 700,120 800,150"
          fill="none"
          stroke="rgba(34, 211, 238, 0.15)"
          strokeWidth="1"
        />
      </svg>

      {/* Script Motto Flourish in Upper Right */}
      <div className="absolute top-3 right-4 text-xs sm:text-sm font-serif italic text-amber-300/80 pointer-events-none select-none tracking-wide">
        People first. Always.
      </div>

      <div className="relative z-10 max-w-lg mx-auto flex flex-col items-center">
        {/* Headphone Icon Circle with Soft Glowing Pulse */}
        <div className="relative mb-2">
          <div className="w-12 h-12 rounded-full bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-[0_0_24px_rgba(56,189,248,0.2)]">
            <Headset className="h-6 w-6" />
          </div>
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#000821] flex items-center justify-center">
            <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
          </span>
        </div>

        {/* Title & Description */}
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          No Active Call
        </h2>
        <p className="text-xs sm:text-sm text-slate-300/90 mt-0.5 max-w-md leading-relaxed">
          Use Quo to place or receive calls. Work callbacks, voicemails, and lead follow-up from here.
        </p>

        {/* Primary Gold Action Button */}
        <div className="mt-3.5 sm:mt-4">
          <Button
            asChild
            className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold px-5 py-2 h-auto rounded-xl shadow-[0_4px_16px_rgba(245,158,11,0.35)] hover:shadow-[0_6px_22px_rgba(245,158,11,0.5)] transition-all transform hover:-translate-y-0.5 gap-2 text-xs sm:text-sm cursor-pointer"
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
        </div>
      </div>
    </div>
  );
}

export default NoActiveCallHero;
