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
      <div className="border-b border-[#3A2C18] pb-3">
        <h2 className="text-lg sm:text-xl font-serif font-bold text-[#FFF4D4] tracking-wide flex items-center gap-2">
          <span>Family Experience</span>
        </h2>
        <p className="text-xs text-[#C6B697] mt-0.5">
          Client satisfaction surveys, family confidence growth, NPS score, and approved parent testimonials.
        </p>
      </div>

      {/* ── Rating Score Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {ratingCards.map((rc) => (
          <div
            key={rc.label}
            className="p-3.5 rounded-xl bg-[#05142B]/90 border border-[#3A2C18] shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] text-center space-y-1"
          >
            <div className="flex items-center justify-center gap-1">
              <Star className="w-4 h-4 fill-current text-[#DFBE77]" />
              <span className="text-xl font-black font-serif text-[#FFF4D4]">
                {rc.value.toFixed(2)}
              </span>
              <span className="text-xs text-[#C6B697]/60 font-mono">/5</span>
            </div>
            <div className="text-xs font-bold text-[#E8DCC4]">{rc.label}</div>
          </div>
        ))}
      </div>

      {/* ── Key Experience Metrics ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/60 text-center space-y-1">
          <span className="text-[10px] font-bold text-[#C6B697] uppercase block">Confidence Gained</span>
          <div className="text-xl font-black text-emerald-400 font-serif">
            {data.confidenceGainedPercentage}%
          </div>
          <span className="text-[10px] text-[#A69371]">Parent felt prepared</span>
        </div>

        <div className="p-3.5 rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/60 text-center space-y-1">
          <span className="text-[10px] font-bold text-[#C6B697] uppercase block">Goals Met</span>
          <div className="text-xl font-black text-teal-300 font-serif">
            {data.goalsAchievedPercentage}%
          </div>
          <span className="text-[10px] text-[#A69371]">Objectives secured</span>
        </div>

        <div className="p-3.5 rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/60 text-center space-y-1">
          <span className="text-[10px] font-bold text-[#C6B697] uppercase block">Net Promoter (NPS)</span>
          <div className="text-xl font-black text-[#FFE394] font-serif">
            +{data.npsScore}
          </div>
          <span className="text-[10px] text-[#A69371]">World-class recommendation</span>
        </div>

        <div className="p-3.5 rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/60 text-center space-y-1">
          <span className="text-[10px] font-bold text-[#C6B697] uppercase block">Response Rate</span>
          <div className="text-xl font-black text-[#DFBE77] font-serif">
            {data.surveyResponseRate}%
          </div>
          <span className="text-[10px] text-[#A69371]">Post-meeting surveys</span>
        </div>
      </div>

      {/* ── Testimonials with Website Permission ── */}
      <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-serif font-bold text-[#FFE394] uppercase tracking-wider flex items-center gap-1.5">
            <Quote className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Family Testimonials ({data.testimonialsApprovedForWebsite} Approved for Public Release)</span>
          </h3>
          <span className="text-[10px] text-emerald-400 font-mono font-semibold">
            {data.testimonialsReceivedCount} Total Testimonials Received
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {data.featuredTestimonials.map((t) => (
            <div
              key={t.id}
              className="p-4 rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/60 flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-[#DFBE77]">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
                <p className="text-xs text-[#E8DCC4] leading-relaxed italic">
                  "{t.text}"
                </p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#C6B697] border-t border-[#3A2C18]/60 pt-2 font-medium">
                <span>
                  {t.parentName} ({t.state})
                </span>
                <span className="font-mono text-[10px] text-[#A69371]">{t.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
