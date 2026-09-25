import React from "react";
import { Anchor, FileText, CalendarCheck2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GuidedHorizonsProcessStripProps {
  previousIepDate?: string;
  meetingDate?: string;
  updatedIepDate?: string;
  currentStage?: "waiting" | "received" | "processing" | "advocate_review" | "complete";
}

export function GuidedHorizonsProcessStrip({
  previousIepDate = "Aug 14, 2025",
  meetingDate = "Sept 18, 2026",
  updatedIepDate = "Sept 25, 2026",
}: GuidedHorizonsProcessStripProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#020B1A] via-[#041530] to-[#010917] border border-[#0D3868] shadow-2xl p-4 sm:p-5 select-none">
      {/* Background Starry Sky & Moon Atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Distant mountains/headland horizon */}
        <svg
          className="absolute bottom-6 w-full h-24 text-[#061B36] opacity-60"
          preserveAspectRatio="none"
          viewBox="0 0 1200 120"
        >
          <path
            d="M0,80 Q200,30 400,65 T800,40 T1200,70 L1200,120 L0,120 Z"
            fill="currentColor"
          />
        </svg>

        {/* Ocean Waves on lower half */}
        <svg
          className="absolute bottom-0 w-full h-16 text-[#0A2E59] opacity-75"
          preserveAspectRatio="none"
          viewBox="0 0 1200 120"
        >
          <path
            d="M0,40 C150,70 350,15 500,45 C650,75 900,20 1200,40 L1200,120 L0,120 Z"
            fill="#051D3B"
          />
          <path
            d="M0,60 C200,35 450,85 700,45 C950,15 1100,70 1200,50 L1200,120 L0,120 Z"
            fill="#03152C"
          />
        </svg>

        {/* Lighthouse on Right Shore with Soft Light Beam */}
        <div className="absolute right-6 sm:right-10 bottom-8 flex flex-col items-center opacity-85 z-0">
          {/* Lighthouse Lantern Glow */}
          <div className="relative">
            <div className="w-5 h-6 rounded-t-sm bg-gradient-to-b from-amber-100 to-amber-400 shadow-[0_0_25px_rgba(245,181,68,0.9)] flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white animate-ping" />
            </div>
            {/* Soft Ambient Light Beam across the horizon */}
            <div
              className="absolute top-1 right-3 w-72 h-16 pointer-events-none opacity-25"
              style={{
                background: "linear-gradient(250deg, rgba(254,240,138,0.7) 0%, rgba(56,189,248,0.15) 50%, transparent 100%)",
                transform: "rotate(-10deg)",
                transformOrigin: "right center",
              }}
            />
          </div>
          {/* Lighthouse Tower */}
          <div className="w-4 h-10 bg-gradient-to-b from-slate-200 via-rose-700 to-slate-900 border-x border-[#07244A]" />
          {/* Lighthouse Base Rocks */}
          <div className="w-10 h-4 bg-[#020A17] rounded-t-lg border-t border-[#092B54]" />
        </div>
      </div>

      {/* Main Nautical Horizon Navigation Track (4 Nodes + Boat + Anchor) */}
      <div className="relative z-10 max-w-5xl mx-auto py-2">
        {/* Curved Glowing Dotted Path SVG */}
        <div className="absolute top-8 left-8 right-8 h-12 pointer-events-none hidden sm:block">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 60">
            <path
              d="M 50 30 Q 220 5 400 30 T 750 30"
              fill="none"
              stroke="#1E5C99"
              strokeWidth="2"
              strokeDasharray="6 6"
              strokeOpacity="0.8"
            />
          </svg>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end relative">
          {/* Node 1: Previous IEP */}
          <div className="flex flex-col items-center text-center space-y-2 relative">
            <div className="relative w-14 h-14 rounded-full bg-gradient-to-b from-[#092A52] to-[#04162E] border-2 border-teal-400/60 flex items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.3)]">
              <FileText className="h-6 w-6 text-teal-300" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#020B1A] flex items-center justify-center text-white text-[10px] font-bold">
                ✓
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white block tracking-wide">Previous IEP</span>
              <span className="text-[11px] font-semibold text-emerald-400 block">Found</span>
              <span className="text-[10px] font-mono text-blue-200/70 block">{previousIepDate}</span>
            </div>
          </div>

          {/* Sailboat Graphic floating between Node 1 and Node 2 */}
          <div className="hidden sm:flex absolute left-[22%] top-0 -translate-y-2 flex-col items-center z-20 pointer-events-none animate-pulse">
            <div className="text-2xl drop-shadow-[0_4px_12px_rgba(56,189,248,0.5)]">⛵</div>
            <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-teal-300 bg-[#04142B]/90 px-1.5 py-0.5 rounded border border-teal-400/40 mt-1">
              Active Voyage
            </span>
          </div>

          {/* Node 2: Meeting Record */}
          <div className="flex flex-col items-center text-center space-y-2 relative">
            <div className="relative w-14 h-14 rounded-full bg-gradient-to-b from-[#092A52] to-[#04162E] border-2 border-teal-400/60 flex items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.3)]">
              <CalendarCheck2 className="h-6 w-6 text-teal-300" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#020B1A] flex items-center justify-center text-white text-[10px] font-bold">
                ✓
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white block tracking-wide">Meeting Record</span>
              <span className="text-[11px] font-semibold text-emerald-400 block">Found</span>
              <span className="text-[10px] font-mono text-blue-200/70 block">{meetingDate}</span>
            </div>
          </div>

          {/* Node 3: Portmaster (Center Anchor) */}
          <div className="flex flex-col items-center text-center space-y-2 relative">
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-b from-[#0F3D78] via-[#092750] to-[#061933] border-2 border-[#F5B544] flex items-center justify-center shadow-[0_0_28px_rgba(245,181,68,0.45)] ring-4 ring-teal-500/20">
              <Anchor className="h-8 w-8 text-[#F5B544]" />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#F5B544] animate-ping" />
            </div>
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white block tracking-wide uppercase font-mono">
                Portmaster
              </span>
              <span className="text-[10.5px] text-blue-200/90 leading-tight block max-w-[130px]">
                Analyzing changes and agreements
              </span>
            </div>
          </div>

          {/* Node 4: Updated IEP */}
          <div className="flex flex-col items-center text-center space-y-2 relative">
            <div className="relative w-14 h-14 rounded-full bg-gradient-to-b from-[#092A52] to-[#04162E] border-2 border-teal-400/60 flex items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.3)]">
              <FileText className="h-6 w-6 text-teal-300" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#020B1A] flex items-center justify-center text-white text-[10px] font-bold">
                ✓
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white block tracking-wide">Updated IEP</span>
              <span className="text-[11px] font-semibold text-emerald-400 block">Received</span>
              <span className="text-[10px] font-mono text-blue-200/70 block">{updatedIepDate}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
