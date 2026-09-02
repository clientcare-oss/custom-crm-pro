import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  Compass, 
  ShieldCheck, 
  GraduationCap, 
  FileText, 
  Award, 
  ArrowRight,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  Target,
  Users,
  BarChart2,
  FileCheck
} from "lucide-react";
import PageIdBadge from "@/components/PageIdBadge";

interface YourJourneyExperienceProps {
  onNavigateTab: (tabId: string) => void;
}

export function YourJourneyExperience({ onNavigateTab }: YourJourneyExperienceProps) {
  const pillars = [
    {
      step: "01",
      title: "Discovery & Priority Mapping",
      tag: "Phase 1: Alignment",
      icon: Target,
      desc: "We analyze your student's IEP, psychoeducational testing, and 504 accommodation records to uncover accommodation gaps, vague goals, and placement friction points.",
      deliverables: ["Initial 30-min Strategy Call", "IEP Preparation Checklist", "Parent Priorities Worksheet"]
    },
    {
      step: "02",
      title: "Student Profiling & Evidence Gathering",
      tag: "Phase 2: Onboarding",
      icon: FileCheck,
      desc: "Our progressive onboarding collects school records, medical evaluations, and parental observations into a centralized, FERPA-compliant digital Document Vault.",
      deliverables: ["Cloudflare R2 Document Vault", "Electronic Representation Agreement", "Student Accommodation Ledger"]
    },
    {
      step: "03",
      title: "Strategy Formulation & Pre-Meeting Agendas",
      tag: "Phase 3: Preparation",
      icon: Sparkles,
      desc: "Prior to any school IEP meeting, Byron prepares concrete parent talking points, proposed SMART goal amendments, and Prior Written Notice (PWN) strategies.",
      deliverables: ["Pre-IEP Talking Points Document", "Side-by-Side Goal Comparison", "School Correspondence Strategy"]
    },
    {
      step: "04",
      title: "Active Representation & Case Compass",
      tag: "Phase 4: Representation",
      icon: Users,
      desc: "Live meeting representation, real-time negotiation with district personnel, post-meeting debriefs, and continuous tracking through our 5-point Case Compass.",
      deliverables: ["IEP Table Representation", "Post-Meeting Debrief Notes", "5-Point Case Compass Live Tracker"]
    }
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-white animate-in fade-in duration-300">
      
      {/* ── Hero Header with PageIdBadge ── */}
      <div className="bg-gradient-to-br from-[#0B2553] via-[#071D40] to-[#04122C] p-6 sm:p-7 rounded-3xl border border-blue-900/40 shadow-2xl relative overflow-hidden">
        {/* Top subtle golden accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5B544]/70 to-transparent" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-[#F5B544] text-[#07152B] font-bold text-[10px] tracking-wider uppercase px-2.5 py-0.5 shadow-sm font-mono">
                The Waypoint Advocacy Method
              </Badge>
              <Badge variant="outline" className="text-xs font-mono border-blue-900/40 text-blue-200/90 bg-[#030C22]">
                <ShieldCheck className="h-3 w-3 mr-1 inline text-emerald-400" />
                Master IEP Coach® Blueprint
              </Badge>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-serif font-normal text-white tracking-tight flex items-center gap-2.5">
                <Compass className="h-7 w-7 text-[#F5B544]" />
                Your Waypoint Representation Journey
              </h1>
              <PageIdBadge id="PG-027-S03" name="Your Advocacy Journey" />
            </div>

            <p className="text-xs sm:text-sm text-blue-200/75 leading-relaxed">
              From your initial Discovery Call to post-IEP implementation, here is how Waypoint partners with your family every step of the way.
            </p>
          </div>

          <Button
            onClick={() => onNavigateTab("discovery-call")}
            className="bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] font-bold text-xs h-11 px-4 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
          >
            <span>View Scheduled Call</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── 4 Pillars Timeline (Strict Midnight Nautical Navy) ── */}
      <div className="space-y-4">
        {pillars.map((p, idx) => {
          const Icon = p.icon;

          return (
            <Card 
              key={idx} 
              className="border border-blue-900/40 bg-[#06172F] p-5 sm:p-6 rounded-3xl hover:border-amber-400/50 hover:bg-[#081B36] transition-all shadow-xl text-white"
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Step Number Badge */}
                <div className="h-12 w-12 rounded-2xl bg-[#030C22] border border-blue-900/40 text-amber-300 font-mono font-bold flex items-center justify-center shrink-0 text-base shadow-inner">
                  {p.step}
                </div>

                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                      <Icon className="h-4 w-4 text-amber-400" />
                      {p.title}
                    </h3>
                    <Badge variant="outline" className="text-[10px] font-mono text-amber-300 border-amber-400/30 bg-amber-400/10">
                      {p.tag}
                    </Badge>
                  </div>

                  <p className="text-xs sm:text-sm text-blue-200/80 leading-relaxed">
                    {p.desc}
                  </p>

                  {/* Deliverables Pills in #030C22 Obsidian Navy */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {p.deliverables.map((d, i) => (
                      <span 
                        key={i} 
                        className="text-[11px] bg-[#030C22] border border-blue-900/40 px-3 py-1 rounded-xl text-white font-medium flex items-center gap-1.5 shadow-sm"
                      >
                        <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── Reassurance CTA Banner ── */}
      <Card className="border border-amber-400/40 bg-gradient-to-br from-[#0B2553] via-[#071D40] to-[#04122C] p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl text-white relative overflow-hidden">
        {/* Amber corner glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#F5B544]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="space-y-1 relative z-10">
          <h4 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#F5B544]" />
            Have questions about your representation journey?
          </h4>
          <p className="text-xs text-blue-200/70">
            We will cover your child's specific case roadmap during your scheduled Discovery Call.
          </p>
        </div>

        <Button
          onClick={() => onNavigateTab("discovery-call")}
          className="gap-2 bg-[#F5B544] hover:bg-[#E5A534] text-[#07152B] font-bold text-xs h-10 px-5 rounded-xl shadow-md shrink-0 cursor-pointer relative z-10"
        >
          <span>View Discovery Details</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Card>
    </div>
  );
}

export default YourJourneyExperience;
