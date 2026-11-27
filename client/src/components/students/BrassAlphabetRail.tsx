import React from "react";
import { cn } from "@/lib/utils";

interface BrassAlphabetRailProps {
  selectedLetter: string;
  onSelectLetter: (letter: string) => void;
  letterCounts?: Record<string, number>;
  className?: string;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/**
 * Machined Cast Antique-Brass Dish Slider Thumb Knob riding on the real photographic brass rod
 */
function BrassSliderDishKnob({ className = "w-[26px] h-[26px]" }: { className?: string }) {
  return (
    <div className={`relative shrink-0 ${className} drop-shadow-[0_4px_9px_rgba(0,0,0,0.96)]`}>
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Outer Weathered Cast Bronze Collar */}
        <circle cx="18" cy="18" r="16" fill="url(#wp-kn-outer)" stroke="#241504" strokeWidth="1.3" />
        {/* Warm Specular Bevel Ring */}
        <circle cx="18" cy="18" r="14.2" stroke="#FBE7B2" strokeWidth="0.9" opacity="0.88" />
        {/* Deep Machined Dish Well */}
        <circle cx="18" cy="18" r="11.2" fill="url(#wp-kn-dish)" stroke="#1C1003" strokeWidth="1" />
        {/* Domed Center Antique Brass Boss */}
        <circle cx="18" cy="18" r="7.2" fill="url(#wp-kn-boss)" stroke="#2E1B05" strokeWidth="0.9" />
        <ellipse cx="15.8" cy="14.6" rx="3.1" ry="1.8" transform="rotate(-24 15.8 14.6)" fill="#FFF8E2" opacity="0.72" />
        <defs>
          <linearGradient id="wp-kn-outer" x1="4" y1="3" x2="32" y2="33" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FCE7B2" />
            <stop offset="0.34" stopColor="#D6A654" />
            <stop offset="0.72" stopColor="#8E6020" />
            <stop offset="1" stopColor="#3B2306" />
          </linearGradient>
          <radialGradient id="wp-kn-dish" cx="55%" cy="62%" r="65%">
            <stop offset="0%" stopColor="#7C511A" />
            <stop offset="55%" stopColor="#3A2207" />
            <stop offset="100%" stopColor="#160C02" />
          </radialGradient>
          <radialGradient id="wp-kn-boss" cx="35%" cy="30%" r="72%">
            <stop offset="0%" stopColor="#FFF7DF" />
            <stop offset="32%" stopColor="#E4B865" />
            <stop offset="76%" stopColor="#9C6C24" />
            <stop offset="100%" stopColor="#462A07" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

export function BrassAlphabetRail({
  selectedLetter,
  onSelectLetter,
  letterCounts = {},
  className,
}: BrassAlphabetRailProps) {
  // Default knob rests centered under M when ALL is active (matching reference photograph)
  const activeIndex = selectedLetter === "ALL" ? 12 : ALPHABET.indexOf(selectedLetter);

  return (
    <div
      className={cn(
        "wp-stu-hw-az relative flex items-stretch h-[52px] sm:h-[56px] select-none overflow-visible",
        className
      )}
    >
      {/* ─── 3-SLICE PHOTOREALISTIC HARDWARE HOUSING LAYER (Zero distortion on rivets/caps) ─── */}
      <div className="absolute inset-0 flex items-stretch pointer-events-none" aria-hidden="true">
        <img
          src="/assets/students/hw/az-left.png"
          alt=""
          className="h-full w-auto shrink-0 block"
          draggable={false}
        />
        <div
          className="flex-1 h-full min-w-0"
          style={{
            backgroundImage: "url('/assets/students/hw/az-mid.png')",
            backgroundSize: "100% 100%",
            backgroundRepeat: "no-repeat",
          }}
        />
        <img
          src="/assets/students/hw/az-right.png"
          alt=""
          className="h-full w-auto shrink-0 block"
          draggable={false}
        />
      </div>

      {/* ─── INTERACTIVE OVERLAY LAYER ALIGNED TO REAL METAL CAP & TRACK GEOMETRY ─── */}
      {/* Left "ALL" Brass End-Cap Click Zone (native cap ratio 223/165 = 1.352 × height) */}
      <button
        type="button"
        onClick={() => onSelectLetter("ALL")}
        title="Show All Students"
        className="relative z-20 h-full shrink-0 flex items-center justify-center cursor-pointer focus:outline-none group"
        style={{ width: "calc(56px * 1.24)" }}
      >
        <span
          className={cn(
            "font-serif font-bold tracking-[0.06em] text-[14px] sm:text-[15.5px] uppercase pl-2 transition-all",
            selectedLetter === "ALL"
              ? "text-[#160D04] drop-shadow-[0_1px_0_rgba(255,244,212,0.75)]"
              : "text-[#291908]/80 group-hover:text-[#140B03]"
          )}
        >
          ALL
        </span>
      </button>

      {/* Center Recessed Scuffed-Steel Track: Chiseled Bronze A–Z Letters + Sliding Knob on Real Brass Rod */}
      <div className="relative z-20 flex-1 h-full min-w-0 px-2.5 sm:px-3.5">
        <div className="relative w-full h-full">
          {/* Upper Track Letters (sits cleanly inside y=12%..56% above the real photographic rod at y=65.5%) */}
          <div
            className="absolute inset-x-0 flex items-center justify-between z-20"
            style={{ top: "13%", height: "45%" }}
          >
            {ALPHABET.map((letter) => {
              const isSelected = selectedLetter === letter;
              const count = letterCounts[letter] ?? 0;

              return (
                <button
                  key={letter}
                  type="button"
                  onClick={() => onSelectLetter(letter)}
                  title={`${letter}${count ? ` (${count} student${count === 1 ? "" : "s"})` : ""}`}
                  className="wp-stu-az-letter-btn relative flex items-center justify-center flex-1 h-full cursor-pointer focus:outline-none"
                >
                  <span
                    data-selected={isSelected ? "true" : "false"}
                    className="wp-stu-az-letter text-[13px] sm:text-[15px] md:text-[16.5px] select-none"
                  >
                    {letter}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sliding 3D Cast Brass Dish Thumb Knob riding dead-center on the real photographic brass rod (y=65.5%) */}
          {activeIndex >= 0 && activeIndex < 26 && (
            <div
              className="absolute z-30 pointer-events-none transition-all duration-200 ease-out flex items-center justify-center"
              style={{
                left: `${((activeIndex + 0.5) / 26) * 100}%`,
                top: "66%",
                transform: "translate(-50%, -50%)",
              }}
            >
              <BrassSliderDishKnob className="w-[24px] h-[24px] sm:w-[27px] sm:h-[27px]" />
            </div>
          )}
        </div>
      </div>

      {/* Right Brass Terminal End-Cap Spacer (mirrors left cap symmetrically) */}
      <div
        className="relative z-10 h-full shrink-0 pointer-events-none"
        style={{ width: "calc(56px * 1.24)" }}
        aria-hidden="true"
      />
    </div>
  );
}
