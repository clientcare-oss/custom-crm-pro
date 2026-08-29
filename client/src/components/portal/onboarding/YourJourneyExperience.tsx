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
  ChevronRight
} from "lucide-react";

interface YourJourneyExperienceProps {
  onNavigateTab: (tabId: string) => void;
}

export function YourJourneyExperience({ onNavigateTab }: YourJourneyExperienceProps) {
  const pillars = [
    {
      step: "01",
      title: "Discovery & Priority Mapping",
      tag: "Phase 1: Alignment",
      desc: "We analyze your student's IEP, psycho-ed testing, and 504 plans to uncover accommodation deficits, goal vagueness, and placement friction points.",
      deliverables: ["Initial 30-min Strategy Call", "IEP Preparation Checklist", "Parent Priorities Worksheet"]
    },
    {
      step: "02",
      title: "Student Profiling & Evidence Gathering",
      tag: "Phase 2: Onboarding",
      desc: "Our progressive onboarding collects IEP records, medical evaluations, and parent concerns into a centralized, FERPA-compliant digital workspace.",
      deliverables: ["Cloudflare R2 Document Vault", "Electronic Representation Agreement", "Student Accommodation Ledger"]
    },
    {
      step: "03",
      title: "Strategy Formulation & Pre-Meeting Agendas",
      tag: "Phase 3: Preparation",
      desc: "Before any school IEP meeting, Byron prepares concrete parent talking points, proposed SMART goal edits, and Prior Written Notice (PWN) strategies.",
      deliverables: ["Pre-IEP Talking Points Document", "Side-by-Side Goal Comparison", "School Correspondence Strategy"]
    },
    {
      step: "04",
      title: "Active Representation & Case Compass",
      tag: "Phase 4: Representation",
      desc: "Live meeting attendance, real-time negotiation with district personnel, post-meeting debriefs, and continuous tracking through our 6-stage Case Compass.",
      deliverables: ["IEP Table Representation", "Post-Meeting Debrief Notes", "6-Stage Case Compass Live Tracker"]
    }
  ];

  return (
    <div className="p-6 md:p-8 lg:p-10 space-y-8 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 text-amber-300 text-xs font-semibold mb-3 border border-amber-400/20">
          <Compass className="h-3.5 w-3.5" />
          The Waypoint Advocacy Method
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">
          Your Waypoint Representation Journey
        </h1>
        <p className="text-sm text-white/70 mt-1.5 max-w-3xl leading-relaxed">
          From your first Discovery Call to post-IEP implementation, here is how Waypoint partners with your family every step of the way.
        </p>
      </div>

      {/* 4 Pillars Timeline */}
      <div className="space-y-4">
        {pillars.map((p, idx) => (
          <Card key={idx} className="border-white/10 bg-white/[0.02] p-6 rounded-2xl hover:border-amber-400/30 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <span className="h-10 w-10 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 font-mono font-bold flex items-center justify-center shrink-0 text-sm">
                {p.step}
              </span>
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-white">{p.title}</h3>
                  <Badge variant="outline" className="text-[10px] text-amber-300 border-amber-400/30">
                    {p.tag}
                  </Badge>
                </div>
                <p className="text-xs md:text-sm text-white/70 leading-relaxed">
                  {p.desc}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {p.deliverables.map((d, i) => (
                    <span key={i} className="text-[11px] bg-white/[0.04] border border-white/10 px-2.5 py-1 rounded-md text-white/80 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* CTA Section */}
      <Card className="border-amber-400/30 bg-gradient-to-r from-amber-400/10 via-[#0a1828] to-[#071422] p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-base font-bold text-white">Have questions about the journey?</h4>
          <p className="text-xs text-white/60 mt-0.5">We'll cover everything during your scheduled Discovery Call.</p>
        </div>
        <Button
          onClick={() => onNavigateTab("discovery-call")}
          className="gap-2 bg-amber-400 hover:bg-amber-500 text-[#071422] font-bold text-xs shadow-md"
        >
          View Scheduled Call
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Card>
    </div>
  );
}
