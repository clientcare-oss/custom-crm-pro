import React from "react";
import {
  Star,
  Heart,
  Smile,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  ThumbsUp,
  Quote,
} from "lucide-react";

interface FamilyExperienceSectionProps {
  data: {
    overallSatisfaction: number;
    advocateSatisfaction: number;
    communicationSatisfaction: number;
    meetingPrepSatisfaction: number;
    portalSatisfaction: number;
    confidenceGainedPercentage: number;
    goalsAchievedPercentage: number;
    npsScore: number;
    surveyResponseRate: number;
    testimonialsReceivedCount: number;
    testimonialsApprovedForWebsite: number;
    featuredTestimonials: Array<{
      id: number;
      parentName: string;
      studentInitials: string;
      state: string;
      rating: number;
      text: string;
      date: string;
    }>;
  };
}

export default function FamilyExperienceSection({ data }: FamilyExperienceSectionProps) {
  const ratingCards = [
    { label: "Overall Rating", value: data.overallSatisfaction, max: 5, color: "#F59E0B" },
    { label: "Advocate Care", value: data.advocateSatisfaction, max: 5, color: "#10B981" },
    { label: "Communication", value: data.communicationSatisfaction, max: 5, color: "#0062E3" },
    { label: "Meeting Prep", value: data.meetingPrepSatisfaction, max: 5, color: "#8B5CF6" },
    { label: "Client Portal", value: data.portalSatisfaction, max: 5, color: "#38BDF8" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Section Title ── */}
      <div className="border-b border-sky-500/20 pb-3">
        <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide flex items-center gap-2">
          <span>Family Experience</span>
        </h2>
        <p className="text-xs text-blue-200/70 mt-0.5">
          Client satisfaction surveys, family confidence growth, NPS score, and approved parent testimonials.
        </p>
      </div>

      {/* ── Rating Score Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {ratingCards.map((rc) => (
          <div
            key={rc.label}
            className="p-3.5 rounded-2xl bg-[#07162B] border border-sky-500/25 text-center space-y-1"
          >
            <div className="flex items-center justify-center gap-1">
              <Star className="w-4 h-4 fill-current" style={{ color: rc.color }} />
              <span className="text-xl font-black font-mono text-white">
                {rc.value.toFixed(2)}
              </span>
              <span className="text-xs text-blue-200/50 font-mono">/5</span>
            </div>
            <div className="text-xs font-bold text-slate-200">{rc.label}</div>
          </div>
        ))}
      </div>

      {/* ── Key Experience Metrics ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#001026] border border-sky-500/20 text-center space-y-1">
          <span className="text-[10px] font-bold text-blue-200/60 uppercase block">Confidence Gained</span>
          <div className="text-xl font-black text-emerald-400 font-mono">
            {data.confidenceGainedPercentage}%
          </div>
          <span className="text-[10px] text-blue-200/50">Parent felt prepared</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#001026] border border-sky-500/20 text-center space-y-1">
          <span className="text-[10px] font-bold text-blue-200/60 uppercase block">Goals Met</span>
          <div className="text-xl font-black text-teal-300 font-mono">
            {data.goalsAchievedPercentage}%
          </div>
          <span className="text-[10px] text-blue-200/50">Objectives secured</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#001026] border border-sky-500/20 text-center space-y-1">
          <span className="text-[10px] font-bold text-blue-200/60 uppercase block">Net Promoter (NPS)</span>
          <div className="text-xl font-black text-sky-300 font-mono">
            +{data.npsScore}
          </div>
          <span className="text-[10px] text-blue-200/50">World-class recommendation</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#001026] border border-sky-500/20 text-center space-y-1">
          <span className="text-[10px] font-bold text-blue-200/60 uppercase block">Response Rate</span>
          <div className="text-xl font-black text-amber-300 font-mono">
            {data.surveyResponseRate}%
          </div>
          <span className="text-[10px] text-blue-200/50">Post-meeting surveys</span>
        </div>
      </div>

      {/* ── Testimonials with Website Permission ── */}
      <div className="bg-[#07162B] border border-sky-500/25 rounded-2xl p-5 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
            <Quote className="w-3.5 h-3.5" />
            <span>Family Testimonials ({data.testimonialsApprovedForWebsite} Approved for Public Release)</span>
          </h3>
          <span className="text-[10px] text-emerald-400 font-mono">
            {data.testimonialsReceivedCount} Total Testimonials Received
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {data.featuredTestimonials.map((t) => (
            <div
              key={t.id}
              className="p-4 rounded-xl bg-[#001026]/80 border border-sky-500/15 flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
                <p className="text-xs text-slate-200 leading-relaxed italic">
                  "{t.text}"
                </p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-blue-300/60 border-t border-sky-500/10 pt-2 font-medium">
                <span>
                  {t.parentName} ({t.state})
                </span>
                <span className="font-mono text-[10px]">{t.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
