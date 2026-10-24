import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  Compass, 
  ShieldCheck, 
  GraduationCap, 
  ArrowRight,
  CalendarCheck,
  FolderUp,
  FileSearch,
  MessageSquare,
  Users,
  CheckCircle2,
  Calendar
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
      actionLabel: "View Discovery Details",
      actionTab: "discovery-call",
    },
    {
      step: "02",
      stepBadge: "STEP 02",
      title: "Gather Documents",
      icon: FolderUp,
      desc: "Upload your child's IEP, evaluations, and other important school records.",
      actionLabel: "Go to Document Vault",
      actionTab: "vault",
    },
    {
      step: "03",
      stepBadge: "STEP 03",
      title: "Records Review",
      icon: FileSearch,
      desc: "We review your documents to better understand your child's needs and identify areas of concern.",
      actionLabel: null,
      actionTab: null,
    },
    {
      step: "04",
      stepBadge: "STEP 04",
      title: "Blueprint Meeting",
      icon: Compass,
      desc: "We meet with you to discuss priorities, recommendations, and our plan for the school meeting.",
      actionLabel: null,
      actionTab: null,
    },
    {
      step: "05",
      stepBadge: "STEP 05",
      title: "Your IEP Meeting",
      icon: Users,
      desc: "Your Waypoint advocate attends virtually, helps communicate your concerns, asks important questions, and supports you throughout the meeting.",
      actionLabel: null,
      actionTab: null,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-white animate-in fade-in duration-300">
      
      {/* ── Hero Header: YOUR WAYPOINT JOURNEY ── */}
      <div className="bg-gradient-to-br from-[#0B2553] via-[#071D40] to-[#04122C] p-6 sm:p-8 rounded-3xl border border-blue-900/40 shadow-2xl relative overflow-hidden">
        {/* Top subtle golden accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5B544]/80 to-transparent" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div className="space-y-3 max-w-2xl">
            {/* Tag / Eyebrow */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-[#F5B544] text-[#07152B] font-extrabold text-[11px] tracking-wider uppercase px-3 py-1 shadow-sm font-mono">
                YOUR WAYPOINT JOURNEY
              </Badge>
              <Badge variant="outline" className="text-xs font-mono border-blue-900/40 text-blue-200/90 bg-[#030C22]">
                <ShieldCheck className="h-3.5 w-3.5 mr-1 inline text-emerald-400" />
                Special Education Advocacy
              </Badge>
            </div>

            {/* Main Headline: Here's what to expect. */}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-white tracking-tight flex items-center gap-3">
                <Compass className="h-8 w-8 text-[#F5B544] shrink-0" />
                Here&apos;s what to expect.
              </h1>
              <PageIdBadge id="PG-027-S03" name="Your Advocacy Journey" />
            </div>

            {/* Subtitle / Intro text */}
            <p className="text-sm sm:text-base text-blue-100/90 font-medium leading-relaxed">
              From our first conversation to your child&apos;s school meeting, we&apos;re here to guide you.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
            <Button
              onClick={() => onNavigateTab("discovery-call")}
              className="bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] font-bold text-xs h-11 px-4 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 transition-transform hover:scale-[1.02]"
            >
              <Calendar className="h-4 w-4" />
              <span>Discovery Call</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── 5 Steps Timeline (STEPS 01 to 05) ── */}
      <div className="space-y-4">
        {steps.map((s, idx) => {
          const Icon = s.icon;

          return (
            <Card 
              key={idx} 
              className="border border-blue-900/40 bg-[#06172F] p-5 sm:p-6 rounded-3xl hover:border-amber-400/50 hover:bg-[#081B36] transition-all shadow-xl text-white relative overflow-hidden group"
            >
              {/* Subtle hover gradient accent */}
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#F5B544] opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Step Number Badge */}
                <div className="h-12 w-12 rounded-2xl bg-[#030C22] border border-blue-900/40 text-amber-300 font-mono font-bold flex flex-col items-center justify-center shrink-0 shadow-inner">
                  <span className="text-[9px] uppercase tracking-wider text-amber-400/70 font-semibold -mb-0.5">STEP</span>
                  <span className="text-base font-extrabold text-amber-300 leading-none">{s.step}</span>
                </div>

                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2.5 font-serif">
                      <Icon className="h-5 w-5 text-amber-400 shrink-0" />
                      {s.title}
                    </h3>
                    <Badge variant="outline" className="text-[10px] font-mono text-amber-300 border-amber-400/30 bg-amber-400/10 font-bold px-2 py-0.5">
                      {s.stepBadge}
                    </Badge>
                  </div>

                  <p className="text-sm text-blue-100/85 leading-relaxed font-normal">
                    {s.desc}
                  </p>

                  {s.actionLabel && s.actionTab && (
                    <div className="pt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onNavigateTab(s.actionTab!)}
                        className="text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 px-3 py-1 h-7 rounded-lg -ml-2 flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <span>{s.actionLabel}</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── Reassurance Banner: Beyond the Meeting ── */}
      <Card className="border border-amber-400/40 bg-gradient-to-br from-[#0B2553] via-[#071D40] to-[#04122C] p-6 sm:p-7 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-2xl text-white relative overflow-hidden">
        {/* Ambient gold glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#F5B544]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1.5 relative z-10 max-w-xl">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#F5B544] shrink-0" />
            <h4 className="text-lg sm:text-xl font-bold text-white font-serif tracking-tight">
              We&apos;re here beyond the meeting.
            </h4>
          </div>
          <p className="text-sm text-blue-100/90 leading-relaxed font-normal pl-7">
            We&apos;ll help you understand what was decided and determine what needs to happen next.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 relative z-10 self-start sm:self-auto pl-7 sm:pl-0">
          <Button
            onClick={() => onNavigateTab("communication")}
            className="gap-2 bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] font-bold text-xs h-10 px-5 rounded-xl shadow-md cursor-pointer transition-transform hover:scale-[1.02]"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Message Advocate</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default YourJourneyExperience;

