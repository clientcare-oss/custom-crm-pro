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
 * Authentic Slotted Brass Screw Head with realistic metallic bevel
 */
function BrassScrewHead({ className = "w-2 h-2" }: { className?: string }) {
  return (
    <div className={`shrink-0 ${className} drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]`}>
      <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <circle cx="8" cy="8" r="7" fill="url(#b-screw-grad)" stroke="#3A2407" strokeWidth="0.9" />
        <circle cx="8" cy="8" r="5.2" stroke="#261704" strokeWidth="0.5" opacity="0.6" />
        <line x1="4.5" y1="5.5" x2="11.5" y2="10.5" stroke="#1A0F02" strokeWidth="1.5" strokeLinecap="round" />
        <defs>
          <linearGradient id="b-screw-grad" x1="2" y1="2" x2="14" y2="14" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFF8E8" />
            <stop offset="0.35" stopColor="#E9BA6B" />
            <stop offset="0.75" stopColor="#B88943" />
            <stop offset="1" stopColor="#5E3F0F" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

/**
 * Solid Cast Brass Dish Slider Knob with Center Rivet Boss (Matching reference photo)
 */
function BrassSliderDishKnob({ className = "w-5.5 h-5.5" }: { className?: string }) {
  return (
    <div className={`relative shrink-0 ${className} drop-shadow-[0_4px_10px_rgba(0,0,0,0.95)]`}>
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Outer Beveled Brass Rim */}
        <circle cx="16" cy="16" r="14.5" fill="url(#knob-rim-grad)" stroke="#2B1B04" strokeWidth="1.2" />
        {/* Specular Glint Ring */}
        <circle cx="16" cy="16" r="13" stroke="#FFF7E6" strokeWidth="0.8" opacity="0.9" />
        
        {/* Recessed Inner Dark Bronze Dish */}
        <circle cx="16" cy="16" r="10" fill="url(#knob-dish-grad)" stroke="#1F1202" strokeWidth="0.8" />
        <circle cx="16" cy="16" r="8" fill="#3D2508" opacity="0.65" />

        {/* Center Raised Spherical Brass Rivet Boss */}
        <circle cx="16" cy="16" r="4.2" fill="url(#knob-boss-grad)" stroke="#261704" strokeWidth="0.9" />
        <circle cx="15.2" cy="15.2" r="1.5" fill="#FFFFFD" opacity="0.9" />

        <defs>
          <linearGradient id="knob-rim-grad" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFF8E8" />
            <stop offset="0.3" stopColor="#F9D788" />
            <stop offset="0.65" stopColor="#C49340" />
            <stop offset="0.95" stopColor="#63400D" />
          </linearGradient>
          <linearGradient id="knob-dish-grad" x1="6" y1="6" x2="26" y2="26" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2E1C06" />
            <stop offset="0.5" stopColor="#5E3C0F" />
            <stop offset="1" stopColor="#8A5C1E" />
          </linearGradient>
          <linearGradient id="knob-boss-grad" x1="12" y1="12" x2="20" y2="20" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFC" />
            <stop offset="0.3" stopColor="#FCDA8B" />
            <stop offset="0.75" stopColor="#B38031" />
            <stop offset="1" stopColor="#4A2E07" />
          </linearGradient>
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
  // Determine index of active slider bead (default to M = index 12 if ALL, exactly matching reference image)
  const activeIndex = selectedLetter === "ALL" ? 12 : ALPHABET.indexOf(selectedLetter);

  return (
    <div
      className={cn(
        "relative rounded-full h-[48px] sm:h-[50px] md:h-[52px] border-[1.5px] border-[#B88943] ring-1 ring-[#FCE09E]/25 shadow-[0_10px_28px_rgba(0,0,0,0.95)] select-none overflow-visible",
        "bg-gradient-to-b from-[#091322] via-[#050C17] to-[#02060D]",
        className
      )}
    >
      {/* ─── Outer Brass Rim Inner Bevel Line ─── */}
      <div className="absolute inset-[1px] rounded-full border border-[#FFF5D6]/20 pointer-events-none z-30" />

      {/* ─── Horizontal Assembly: [Left ALL Plate] | [A–Z Track with Lower Rod] | [Right Terminal Plate] ─── */}
      <div className="relative flex items-center h-full w-full">

        {/* ─── 1. LEFT END CAP: Solid Brushed Brass "ALL" Plaque ─── */}
        <button
          type="button"
          onClick={() => onSelectLetter("ALL")}
          title="Show All Students"
          className={cn(
            "relative shrink-0 flex items-center justify-between pl-3.5 pr-3 h-full rounded-l-full cursor-pointer z-20 transition-all",
            "bg-gradient-to-b from-[#F5D895] via-[#D8A854] to-[#805518]",
            "border-r border-[#4A320A] shadow-[inset_0_1px_1px_rgba(255,255,255,0.85),2px_0_6px_rgba(0,0,0,0.7)]",
            "hover:brightness-105 active:scale-[0.99] w-[86px] sm:w-[96px]"
          )}
        >
          {/* Top-left brass screw */}
          <div className="absolute top-1.5 left-3.5 pointer-events-none">
            <BrassScrewHead className="w-1.5 h-1.5 sm:w-2 sm:h-2" />
          </div>

          {/* Bottom-left brass screw (in line with top-left and bottom-right) */}
          <div className="absolute bottom-1.5 left-3.5 pointer-events-none">
            <BrassScrewHead className="w-1.5 h-1.5 sm:w-2 sm:h-2" />
          </div>

          {/* Top-right brass screw */}
          <div className="absolute top-1.5 right-2.5 pointer-events-none">
            <BrassScrewHead className="w-1.5 h-1.5 sm:w-2 sm:h-2" />
          </div>

          {/* Bottom-right brass screw */}
          <div className="absolute bottom-1.5 right-2.5 pointer-events-none">
            <BrassScrewHead className="w-1.5 h-1.5 sm:w-2 sm:h-2" />
          </div>

          {/* "ALL" Engraved Text */}
          <div className="flex-1 text-center pl-2">
            <span
              className={cn(
                "font-serif font-black tracking-widest text-[13px] sm:text-[15px] uppercase select-none transition-colors",
                selectedLetter === "ALL"
                  ? "text-[#100B04] drop-shadow-[0_1px_0_rgba(255,248,230,0.8)]"
                  : "text-[#2B1B07] hover:text-[#0D0802]"
              )}
            >
              ALL
            </span>
          </div>

          {/* Right edge pointer arrow */}
          <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center z-30 pointer-events-none">
            <div className="w-0 h-0 border-y-[4.5px] border-y-transparent border-l-[6px] border-l-[#C49443] drop-shadow-[1px_0_2px_rgba(0,0,0,0.8)]" />
          </div>

          {/* Starting brass bracket for guide rod */}
          <div className="absolute -right-1.5 bottom-[9px] sm:bottom-[10.5px] w-2 h-2 rounded-xs bg-gradient-to-b from-[#FFF2D6] via-[#B88943] to-[#4A310A] border border-[#2E1A03] shadow-xs pointer-events-none z-20" />
        </button>

        {/* ─── 2. CENTER SECTION: Alphabet Letters + Continuous Lower Brass Guide Rail ─── */}
        <div className="relative flex-1 h-full px-2.5 sm:px-3 flex flex-col justify-start">
          
          {/* Shared 1:1 Track Container: Guarantees exact coordinate parity for letters, rod, and slider */}
          <div className="relative w-full h-full">
            {/* Upper letters row */}
            <div className="relative flex items-center justify-between w-full h-[30px] sm:h-[32px] pt-1 z-10">
              {ALPHABET.map((letter) => {
                const isSelected = selectedLetter === letter;
                const count = letterCounts[letter] ?? 0;

                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => onSelectLetter(letter)}
                    title={`${letter}${count ? ` (${count} students)` : ""}`}
                    className="relative flex items-center justify-center flex-1 h-full cursor-pointer transition-all duration-150 focus:outline-none"
                  >
                    <span
                      className={cn(
                        "font-serif text-[13px] sm:text-[14.5px] md:text-[15.5px] leading-none transition-all select-none",
                        isSelected
                          ? "text-[#FFF8EA] font-black scale-115 drop-shadow-[0_0_10px_rgba(255,224,158,0.98)]"
                          : "text-[#D0A75D] hover:text-[#FFF8EA] font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
                      )}
                    >
                      {letter}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Continuous horizontal cylindrical brass guide rod */}
            <div className="absolute left-0 right-0 bottom-[9.5px] sm:bottom-[10.5px] h-[2.5px] rounded-full bg-gradient-to-r from-[#B88943] via-[#FCE09E] to-[#B88943] shadow-[0_1.5px_3px_rgba(0,0,0,0.95)] pointer-events-none z-10">
              {/* Top specular glint highlight line */}
              <div className="absolute inset-x-0 top-0 h-[0.9px] bg-gradient-to-r from-transparent via-[#FFF9EC] to-transparent pointer-events-none" />
            </div>

            {/* Active Cast Brass Slider Knob riding on the guide rail directly under the active letter */}
            {activeIndex >= 0 && activeIndex < 26 && (
              <div
                className="absolute z-20 pointer-events-none transition-all duration-200 ease-out flex items-center justify-center"
                style={{
                  left: `${((activeIndex + 0.5) / 26) * 100}%`,
                  bottom: "10.5px",
                  transform: "translate(-50%, 50%)",
                }}
              >
                <BrassSliderDishKnob className="w-[22px] h-[22px] sm:w-[25px] sm:h-[25px]" />
              </div>
            )}
          </div>
        </div>

        {/* ─── 3. RIGHT END CAP: Solid Brushed Brass Terminal Fitting ─── */}
        <div
          className={cn(
            "relative shrink-0 flex items-center justify-center pl-2.5 pr-3 h-full rounded-r-full select-none z-20",
            "bg-gradient-to-b from-[#F5D895] via-[#D8A854] to-[#805518]",
            "border-l border-[#4A320A] shadow-[inset_0_1px_1px_rgba(255,255,255,0.85),-2px_0_6px_rgba(0,0,0,0.7)]",
            "w-[76px] sm:w-[86px]"
          )}
        >
          {/* Terminal brass bracket collar for guide rod */}
          <div className="absolute -left-1.5 bottom-[9px] sm:bottom-[10.5px] w-2 h-2 rounded-xs bg-gradient-to-b from-[#FFF2D6] via-[#B88943] to-[#4A310A] border border-[#2E1A03] shadow-xs pointer-events-none z-20" />

          {/* Top-left brass screw */}
          <div className="absolute top-1.5 left-2.5 pointer-events-none">
            <BrassScrewHead className="w-1.5 h-1.5 sm:w-2 sm:h-2" />
          </div>

          {/* Bottom-left brass screw */}
          <div className="absolute bottom-1.5 left-2.5 pointer-events-none">
            <BrassScrewHead className="w-1.5 h-1.5 sm:w-2 sm:h-2" />
          </div>

          {/* Top-right brass screw */}
          <div className="absolute top-1.5 right-3.5 pointer-events-none">
            <BrassScrewHead className="w-1.5 h-1.5 sm:w-2 sm:h-2" />
          </div>

          {/* Bottom-right brass screw */}
          <div className="absolute bottom-1.5 right-3.5 pointer-events-none">
            <BrassScrewHead className="w-1.5 h-1.5 sm:w-2 sm:h-2" />
          </div>
        </div>


      </div>
    </div>
  );
}
