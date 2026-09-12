import React from "react";
import { Headset, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NoActiveCallHeroProps {
  onOpenQuoPhone: () => void;
}

export function NoActiveCallHero({ onOpenQuoPhone }: NoActiveCallHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#061830] via-[#082245] to-[#041022] border border-sky-500/25 p-8 text-center shadow-lg">
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
      <div className="absolute top-4 right-5 text-sm font-serif italic text-amber-300/80 pointer-events-none select-none tracking-wide">
        People first. Always.
      </div>

      <div className="relative z-10 max-w-lg mx-auto flex flex-col items-center">
        {/* Headphone Icon Circle with Soft Glowing Pulse */}
        <div className="relative mb-3">
          <div className="w-16 h-16 rounded-full bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-[0_0_30px_rgba(56,189,248,0.25)]">
            <Headset className="h-8 w-8" />
          </div>
          <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#061830] flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          </span>
        </div>

        {/* Title & Description */}
        <h2 className="text-2xl font-bold text-white tracking-tight">
          No Active Call
        </h2>
        <p className="text-xs sm:text-sm text-slate-300/90 mt-1 max-w-md leading-relaxed">
          Use Quo to place or receive calls. Work callbacks, voicemails, and lead follow-up from here.
        </p>

        {/* Primary Gold Action Button */}
        <div className="mt-5">
          <Button
            onClick={onOpenQuoPhone}
            className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold px-6 py-2.5 h-auto rounded-xl shadow-[0_4px_20px_rgba(245,158,11,0.35)] hover:shadow-[0_6px_25px_rgba(245,158,11,0.5)] transition-all transform hover:-translate-y-0.5 gap-2 text-sm"
          >
            <ExternalLink className="h-4 w-4 stroke-[2.5]" />
            Open Quo Phone
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NoActiveCallHero;
