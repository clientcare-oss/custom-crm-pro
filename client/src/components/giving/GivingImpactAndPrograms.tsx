import React, { useState } from "react";
import { Link } from "wouter";
import { GivingParchmentCard } from "./GivingParchmentCard";
import { HandHeart, Users, Heart, ChevronLeft, ChevronRight, ChevronRight as ArrowChevron } from "lucide-react";
import { cn } from "@/lib/utils";

export function GivingImpactAndPrograms() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const testimonials = [
    {
      quote: "Because of this scholarship, our family finally has the support we needed to move forward.",
      author: "PARENT, GEORGIA",
    },
    {
      quote: "Waypoint advocated for our daughter when the district refused evaluations. This program changed her trajectory.",
      author: "SARAH & DAVID M., ATLANTA",
    },
    {
      quote: "We could never afford legal dispute support on our own. The Rise & Thrive grant gave our son a real voice.",
      author: "IEP PARENT, FULTON COUNTY",
    },
  ];

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* ─── Recent Impact Showcase (~58% width on lg) ─── */}
      <GivingParchmentCard className="lg:col-span-7 flex flex-col justify-between p-4 sm:p-5">
        <div className="border-b border-[#D8C7A5]/80 pb-3">
          <h2
            className="text-base sm:text-lg font-bold text-[#1B293C] tracking-wide"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Recent Impact
          </h2>
        </div>

        {/* Visual Photographic Banner with Quote Overlay */}
        <div className="relative mt-3.5 h-48 sm:h-52 rounded-xl overflow-hidden shadow-inner border border-[#C5A059]/60">
          {/* Scenic Mountain Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-500"
            style={{
              backgroundImage: "url('/decor/giving-impact-mountain.jpg')",
            }}
          />

          {/* Dark Vignette Overlay for Readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-transparent pointer-events-none" />

          {/* Testimonial Content Box */}
          <div className="relative z-10 h-full p-4 sm:p-6 flex flex-col justify-between max-w-md text-white select-none">
            <div className="space-y-2">
              <span className="text-3xl text-amber-300/80 font-serif leading-none block">“</span>
              <p
                className="text-xs sm:text-sm md:text-[15px] font-medium leading-snug text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {testimonials[currentSlide].quote}
              </p>
              <p className="text-[11px] font-bold text-amber-300/90 tracking-wider">
                — {testimonials[currentSlide].author}
              </p>
            </div>

            {/* Carousel Controls */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Slider Dots */}
              <div className="flex items-center gap-1.5">
                {testimonials.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentSlide(idx)}
                    className={cn(
                      "h-1.5 rounded-full transition-all cursor-pointer",
                      currentSlide === idx ? "w-5 bg-amber-400" : "w-1.5 bg-white/40 hover:bg-white/60"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </GivingParchmentCard>

      {/* ─── Active Programs (~42% width on lg) ─── */}
      <GivingParchmentCard className="lg:col-span-5 flex flex-col justify-between p-4 sm:p-5">
        <div className="flex items-center justify-between border-b border-[#D8C7A5]/80 pb-3">
          <h2
            className="text-base sm:text-lg font-bold text-[#1B293C] tracking-wide"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Active Programs
          </h2>

          <Link href="/giving/funds">
            <button
              type="button"
              className="px-3 py-1 rounded-full bg-[#0A1A33] hover:bg-[#0E2548] text-[#F3EAD3] border border-[#234575]/80 text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
            >
              <span>Manage Programs</span>
              <ArrowChevron className="w-3 h-3" />
            </button>
          </Link>
        </div>

        {/* 3 Program Rows */}
        <div className="space-y-3 pt-3">
          {/* Program 1 */}
          <Link href="/giving/scholarships">
            <div className="p-3 rounded-xl bg-[#EFE4CC]/75 border border-[#D5C1A0] hover:bg-[#EAE0C4] flex items-center justify-between gap-3 transition-colors cursor-pointer group">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#C59B3F]/25 border border-[#C59B3F]/50 text-[#8C6511] flex items-center justify-center shrink-0 shadow-xs">
                  <HandHeart className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-[#182638] leading-tight group-hover:text-[#8C6511] transition-colors truncate">
                    Rise and Thrive Scholarship
                  </h4>
                  <p className="text-[11px] text-[#69543C] leading-tight mt-0.5 truncate">
                    Full year of advocacy support for qualifying families.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-right shrink-0">
                <div>
                  <span className="text-xs font-bold text-[#182638] font-serif block">12</span>
                  <span className="text-[9.5px] text-[#69543C] leading-none">Active Recipients</span>
                </div>
                <ArrowChevron className="w-4 h-4 text-[#8C6511] group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Program 2 */}
          <Link href="/giving/supporters">
            <div className="p-3 rounded-xl bg-[#EFE4CC]/75 border border-[#D5C1A0] hover:bg-[#EAE0C4] flex items-center justify-between gap-3 transition-colors cursor-pointer group">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#C59B3F]/25 border border-[#C59B3F]/50 text-[#8C6511] flex items-center justify-center shrink-0 shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-[#182638] leading-tight group-hover:text-[#8C6511] transition-colors truncate">
                    Sponsor a Family
                  </h4>
                  <p className="text-[11px] text-[#69543C] leading-tight mt-0.5 truncate">
                    Support a family directly for one year.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-right shrink-0">
                <div>
                  <span className="text-xs font-bold text-[#182638] font-serif block">8</span>
                  <span className="text-[9.5px] text-[#69543C] leading-none">Active Sponsors</span>
                </div>
                <ArrowChevron className="w-4 h-4 text-[#8C6511] group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Program 3 */}
          <Link href="/giving/donations">
            <div className="p-3 rounded-xl bg-[#EFE4CC]/75 border border-[#D5C1A0] hover:bg-[#EAE0C4] flex items-center justify-between gap-3 transition-colors cursor-pointer group">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#C59B3F]/25 border border-[#C59B3F]/50 text-[#8C6511] flex items-center justify-center shrink-0 shadow-xs">
                  <Heart className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-[#182638] leading-tight group-hover:text-[#8C6511] transition-colors truncate">
                    General Giving
                  </h4>
                  <p className="text-[11px] text-[#69543C] leading-tight mt-0.5 truncate">
                    Flexible support where it's needed most.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-right shrink-0">
                <div>
                  <span className="text-xs font-bold text-[#182638] font-serif block">$6,200</span>
                  <span className="text-[9.5px] text-[#69543C] leading-none">Available Funds</span>
                </div>
                <ArrowChevron className="w-4 h-4 text-[#8C6511] group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>
        </div>
      </GivingParchmentCard>
    </div>
  );
}
