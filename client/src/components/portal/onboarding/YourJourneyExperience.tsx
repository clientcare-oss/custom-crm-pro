import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  Compass, 
  ShieldCheck, 
  ArrowRight,
  CalendarCheck,
  FolderUp,
  FileSearch,
  MessageSquare,
  Users,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight
} from "lucide-react";
import PageIdBadge from "@/components/PageIdBadge";

interface YourJourneyExperienceProps {
  onNavigateTab: (tabId: string) => void;
}

export function YourJourneyExperience({ onNavigateTab }: YourJourneyExperienceProps) {
  const steps = [
    {
      step: "01",
      stepBadge: "STEP 01",
      title: "Discovery Call",
      icon: CalendarCheck,
      desc: "We listen to your concerns, learn about your child, and explain how we can help.",
      actionLabel: "View Scheduled Discovery Call",
      actionTab: "discovery-call",
      statusText: "Initial Alignment",
      glowColor: "from-amber-500/20 via-amber-500/5 to-transparent",
    },
    {
      step: "02",
      stepBadge: "STEP 02",
      title: "Gather Documents",
      icon: FolderUp,
      desc: "Upload your child's IEP, evaluations, and other important school records.",
      actionLabel: "Open Secure Document Vault",
      actionTab: "vault",
      statusText: "Evidence Intake",
      glowColor: "from-blue-500/20 via-blue-500/5 to-transparent",
    },
    {
      step: "03",
      stepBadge: "STEP 03",
      title: "Records Review",
      icon: FileSearch,
      desc: "We review your documents to better understand your child's needs and identify areas of concern.",
      actionLabel: null,
      actionTab: null,
      statusText: "Advocate Analysis",
      glowColor: "from-amber-500/20 via-amber-500/5 to-transparent",
    },
    {
      step: "04",
      stepBadge: "STEP 04",
      title: "Blueprint Meeting",
      icon: Compass,
      desc: "We meet with you to discuss priorities, recommendations, and our plan for the school meeting.",
      actionLabel: null,
      actionTab: null,
      statusText: "Strategy Roadmap",
      glowColor: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    },
    {
      step: "05",
      stepBadge: "STEP 05",
      title: "Your IEP Meeting",
      icon: Users,
      desc: "Your Waypoint advocate attends virtually, helps communicate your concerns, asks important questions, and supports you throughout the meeting.",
      actionLabel: null,
      actionTab: null,
      statusText: "Live Advocacy",
      glowColor: "from-amber-500/20 via-amber-500/5 to-transparent",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 text-white animate-in fade-in duration-300">
      
      {/* ── 3D Admiralty Hero Header: YOUR WAYPOINT JOURNEY ── */}
      <div className="relative rounded-3xl p-[1px] bg-gradient-to-b from-[#FFE394]/70 via-[#C5A059]/40 to-[#3A2C18] shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.2)]">
        <div className="bg-gradient-to-b from-[#0B1E38] via-[#07162B] to-[#040D1A] p-6 sm:p-8 rounded-[23px] relative overflow-hidden">
          {/* 3D Specular Top Bevel Hairline */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFE394] to-transparent shadow-[0_0_15px_rgba(255,227,148,0.8)]" />

          {/* Ambient Maritime Background Glow */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#C5A059]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#1E3A8A]/20 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3.5 max-w-2xl">
              {/* 3D Eyebrow Badges */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-mono font-extrabold uppercase tracking-widest bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07152B] shadow-[0_4px_12px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.5)] border border-[#FFE394]/60">
                  <Compass className="h-3.5 w-3.5" />
                  YOUR WAYPOINT JOURNEY
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-semibold bg-[#020A17]/85 border border-[#3A2C18] text-[#C6B697] shadow-inner">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  Special Education Advocacy Roadmap
                </span>
              </div>

              {/* Main Headline */}
              <div className="flex items-center gap-3.5 flex-wrap">
                <div className="w-12 h-12 rounded-2xl p-[1.5px] bg-gradient-to-b from-[#FFE394] via-[#C5A059] to-[#3A2C18] shadow-[0_8px_20px_rgba(0,0,0,0.85)] shrink-0">
                  <div className="w-full h-full rounded-[14px] bg-gradient-to-b from-[#142642] to-[#051124] flex items-center justify-center border border-[#FFE394]/20 shadow-inner">
                    <Compass className="h-6 w-6 text-[#FAD77B] drop-shadow-[0_0_8px_rgba(250,215,123,0.6)]" />
                  </div>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#FFF4D4] tracking-tight drop-shadow-md">
                  Here&apos;s what to expect.
                </h1>
                <PageIdBadge id="PG-027-S03" name="Your Advocacy Journey" />
              </div>

              {/* Subtitle */}
              <p className="text-sm sm:text-base text-[#D8C7A5] font-normal leading-relaxed pl-0.5">
                From our first conversation to your child&apos;s school meeting, we&apos;re here to guide you.
              </p>
            </div>

            {/* Top Action Button with 3D Depth */}
            <div className="shrink-0 self-start sm:self-auto">
              <Button
                onClick={() => onNavigateTab("discovery-call")}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-extrabold text-xs h-11 px-5 rounded-xl border border-[#FFE394]/70 shadow-[0_6px_20px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.4)] cursor-pointer flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Calendar className="h-4 w-4 text-[#07162B]" />
                <span>Discovery Call</span>
                <ArrowRight className="h-4 w-4 text-[#07162B]" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3D Interactive Timeline Track (STEPS 01 to 05) ── */}
      <div className="relative pl-4 sm:pl-8 space-y-6">
        
        {/* Glowing 3D Nautical Braided Spine (Vertical Connection) */}
        <div 
          className="absolute left-[33px] sm:left-[49px] top-6 bottom-6 w-[3px] rounded-full pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, #FFE394 0%, #C5A059 30%, #DFBE77 60%, #856529 85%, #3A2C18 100%)",
            boxShadow: "0 0 16px rgba(223, 190, 119, 0.45), 0 0 4px rgba(255, 227, 148, 0.8)",
          }}
        />

        {steps.map((s, idx) => {
          const Icon = s.icon;

          return (
            <div key={idx} className="relative flex items-start gap-4 sm:gap-6 group">
              
              {/* ── 3D Embossed Waypoint Medallion ── */}
              <div className="relative z-10 shrink-0 select-none">
                {/* Outer Beveled Brass Rim */}
                <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl p-[2px] bg-gradient-to-b from-[#FFE394] via-[#C5A059] to-[#3A2C18] shadow-[0_10px_24px_rgba(0,0,0,0.9),inset_0_1px_2px_rgba(255,255,255,0.4)] transition-transform duration-300 group-hover:scale-105 group-hover:shadow-[0_12px_28px_rgba(197,160,89,0.35)]">
                  {/* Inner Core with Radial Depth */}
                  <div className="w-full h-full rounded-[14px] bg-gradient-to-b from-[#14233D] via-[#091529] to-[#040A15] border border-[#FFE394]/30 flex flex-col items-center justify-center shadow-[inset_0_2px_5px_rgba(0,0,0,0.9),inset_0_-1px_2px_rgba(255,255,255,0.1)]">
                    <span className="text-[8px] sm:text-[8.5px] uppercase font-mono font-extrabold tracking-widest text-[#C5A059] leading-none mb-0.5">
                      STEP
                    </span>
                    <span className="text-base sm:text-lg font-serif font-black text-[#FFF4D4] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      {s.step}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── 3D Floating Elevated Step Card ── */}
              <div className="flex-1 relative rounded-2xl p-[1px] bg-gradient-to-b from-[#3A2C18] via-[#241A0E] to-[#120D06] shadow-[0_14px_34px_-10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.08)] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_20px_45px_-10px_rgba(0,0,0,0.95),0_0_25px_rgba(197,160,89,0.18)] group-hover:from-[#C5A059]/80 group-hover:via-[#856529]/60">
                <div className="bg-gradient-to-br from-[#0A1A33]/95 via-[#061429]/95 to-[#030B17]/95 rounded-[15px] p-5 sm:p-6 relative overflow-hidden border border-[#FFE394]/5">
                  {/* Top-edge 3D Specular Highlight */}
                  <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FFE394]/40 to-transparent group-hover:via-[#FFE394]/80 transition-all duration-300" />
                  
                  {/* Subtle Corner Ambient Aura */}
                  <div className={`absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl ${s.glowColor} rounded-full blur-2xl pointer-events-none opacity-40 group-hover:opacity-75 transition-opacity`} />

                  <div className="relative z-10 space-y-3">
                    {/* Header Row: Title + Status Tag */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-3">
                        {/* 3D Jewel Icon Box */}
                        <div className="w-9 h-9 rounded-xl p-[1px] bg-gradient-to-b from-[#FFE394]/60 via-[#C5A059]/30 to-[#3A2C18] shadow-md shrink-0">
                          <div className="w-full h-full rounded-[11px] bg-gradient-to-b from-[#14233D] to-[#040A15] flex items-center justify-center border border-[#FFE394]/20 shadow-inner">
                            <Icon className="h-4.5 w-4.5 text-[#FAD77B]" />
                          </div>
                        </div>

                        <h3 className="text-lg sm:text-xl font-serif font-bold text-[#FFF4D4] tracking-tight drop-shadow-sm">
                          {s.title}
                        </h3>
                      </div>

                      {/* Recessed Pill Tag */}
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#DFBE77] bg-[#020A17]/85 border border-[#3A2C18] px-2.5 py-1 rounded-lg shadow-inner">
                        {s.statusText}
                      </span>
                    </div>

                    {/* Step Description */}
                    <p className="text-xs sm:text-sm text-[#D8C7A5] leading-relaxed font-normal pl-0.5">
                      {s.desc}
                    </p>

                    {/* Recessed Action Inset Plate if available */}
                    {s.actionLabel && s.actionTab && (
                      <div className="pt-1">
                        <div className="inline-flex items-center bg-[#020A17]/80 border border-[#3A2C18]/80 rounded-xl p-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
                          <Button
                            size="sm"
                            onClick={() => onNavigateTab(s.actionTab!)}
                            className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-bold text-xs h-7 px-3.5 rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.4)] flex items-center gap-1.5 cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
                          >
                            <span>{s.actionLabel}</span>
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 3D Reassurance Plaque: Beyond the Meeting ── */}
      <div className="relative rounded-3xl p-[1px] bg-gradient-to-b from-[#FFE394]/60 via-[#C5A059]/30 to-[#3A2C18] shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.15)]">
        <div className="bg-gradient-to-br from-[#0B1E38] via-[#07162B] to-[#040D1A] p-6 sm:p-7 rounded-[23px] relative overflow-hidden">
          {/* Top highlight hairline */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FFE394]/70 to-transparent shadow-[0_0_12px_rgba(255,227,148,0.6)]" />

          {/* Golden radial aura */}
          <div className="absolute -top-16 -right-16 w-60 h-60 bg-[#C5A059]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl p-[1px] bg-gradient-to-b from-[#FFE394] via-[#C5A059] to-[#3A2C18] shrink-0 shadow-md">
                  <div className="w-full h-full rounded-[10px] bg-gradient-to-b from-[#142642] to-[#051124] flex items-center justify-center border border-[#FFE394]/20 shadow-inner">
                    <Sparkles className="h-4 w-4 text-[#FAD77B]" />
                  </div>
                </div>
                <h4 className="text-lg sm:text-xl font-serif font-bold text-[#FFF4D4] tracking-tight drop-shadow-sm">
                  We&apos;re here beyond the meeting.
                </h4>
              </div>
              <p className="text-xs sm:text-sm text-[#D8C7A5] leading-relaxed font-normal pl-10.5">
                We&apos;ll help you understand what was decided and determine what needs to happen next.
              </p>
            </div>

            <div className="shrink-0 self-start sm:self-auto pl-10.5 sm:pl-0">
              <Button
                onClick={() => onNavigateTab("communication")}
                className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] hover:brightness-110 text-[#07162B] font-extrabold text-xs h-10 px-5 rounded-xl border border-[#FFE394]/70 shadow-[0_6px_16px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.4)] cursor-pointer flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <MessageSquare className="h-4 w-4 text-[#07162B]" />
                <span>Message Advocate</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default YourJourneyExperience;

