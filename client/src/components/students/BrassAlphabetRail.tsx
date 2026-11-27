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
 * Authentic Slotted Brass Rivet Head with realistic metallic bevel
 */
function BrassScrewHead({ className = "w-2 h-2" }: { className?: string }) {
  return (
    <div className={`shrink-0 ${className} drop-shadow-[0_1px_2px_rgba(0,0,0,0.88)]`}>
      <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <circle cx="8" cy="8" r="6.8" fill="url(#wp-az-screw)" stroke="#382206" strokeWidth="1" />
        <circle cx="6.2" cy="6.2" r="2" fill="#FFF9E6" opacity="0.65" />
        <defs>
          <radialGradient id="wp-az-screw" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#FFF7DF" />
            <stop offset="38%" stopColor="#DFB35F" />
            <stop offset="78%" stopColor="#9D6E25" />
            <stop offset="100%" stopColor="#492E08" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

/**
 * Machined Cast Brass Dish Slider Thumb Knob riding on the lower brass rod
 */
function BrassSliderDishKnob({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <div className={`relative shrink-0 ${className} drop-shadow-[0_4px_9px_rgba(0,0,0,0.95)]`}>
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Outer Machined Brass Ring */}
        <circle cx="16" cy="16" r="14.5" fill="url(#wp-knob-rim)" stroke="#241604" strokeWidth="1.25" />
        <circle cx="16" cy="16" r="12.8" stroke="#FFF7E2" strokeWidth="0.85" opacity="0.85" />
        {/* Recessed Inner Bronze Dish */}
        <circle cx="16" cy="16" r="9.6" fill="url(#wp-knob-dish)" stroke="#221303" strokeWidth="0.9" />
        {/* Center Raised Domed Brass Boss */}
        <circle cx="16" cy="16" r="5.2" fill="url(#wp-knob-boss)" stroke="#2B1904" strokeWidth="0.8" />
        <circle cx="14.6" cy="14.2" r="1.7" fill="#FFFFFA" opacity="0.92" />
        <defs>
          <linearGradient id="wp-knob-rim" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFF8E2" />
            <stop offset="0.32" stopColor="#F2CE7D" />
            <stop offset="0.68" stopColor="#B88635" />
            <stop offset="1" stopColor="#5A390C" />
          </linearGradient>
          <radialGradient id="wp-knob-dish" cx="55%" cy="60%" r="65%">
            <stop offset="0%" stopColor="#8E5F20" />
            <stop offset="55%" stopColor="#4A2E0A" />
            <stop offset="100%" stopColor="#1E1103" />
          </radialGradient>
          <radialGradient id="wp-knob-boss" cx="35%" cy="32%" r="70%">
            <stop offset="0%" stopColor="#FFFBEF" />
            <stop offset="35%" stopColor="#F2CB78" />
            <stop offset="78%" stopColor="#A9792C" />
            <stop offset="100%" stopColor="#4A2E07" />
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
  // Default knob rests centered under M when ALL is active (matching the photorealistic reference)
  const activeIndex = selectedLetter === "ALL" ? 12 : ALPHABET.indexOf(selectedLetter);

  return (
    <div className={cn("wp-stu-az-casing select-none overflow-visible", className)}>
      <div className="wp-stu-az-core overflow-visible">
        {/* ─── 1. LEFT END CAP: Riveted Brushed Antique Brass "ALL" Plate ─── */}
        <button
          type="button"
          onClick={() => onSelectLetter("ALL")}
          title="Show All Students"
          className={cn(
            "wp-stu-az-cap relative shrink-0 flex items-center justify-center h-full rounded-l-full cursor-pointer z-20 transition-all",
            "border-r-[1.5px] border-[#3F2807] w-[76px] sm:w-[88px] md:w-[96px]",
            "hover:brightness-106 active:brightness-95"
          )}
        >
          {/* 4 Hammered Brass Rivets */}
          <div className="absolute top-[6px] left-[14px] pointer-events-none">
            <BrassScrewHead className="w-[7px] h-[7px]" />
          </div>
          <div className="absolute bottom-[6px] left-[14px] pointer-events-none">
            <BrassScrewHead className="w-[7px] h-[7px]" />
          </div>
          <div className="absolute top-[6px] right-[9px] pointer-events-none">
            <BrassScrewHead className="w-[7px] h-[7px]" />
          </div>
          <div className="absolute bottom-[6px] right-[9px] pointer-events-none">
            <BrassScrewHead className="w-[7px] h-[7px]" />
          </div>

          {/* Engraved "ALL" Label */}
          <span
            className={cn(
              "font-serif font-bold tracking-[0.08em] text-[13.5px] sm:text-[15px] uppercase pl-1.5 transition-all",
              selectedLetter === "ALL"
                ? "text-[#140D04] drop-shadow-[0_1px_0_rgba(255,246,216,0.85)]"
                : "text-[#2A1A06]/85 hover:text-[#140D04]"
            )}
          >
            ALL
          </span>

          {/* Left Horizontal Rod Collar Fitting */}
          <div className="absolute -right-[7px] bottom-[8px] w-[9px] h-[7px] rounded-[1.5px] bg-gradient-to-b from-[#FCE2A4] via-[#C69443] to-[#4E320A] border border-[#241503] shadow-[0_1px_3px_rgba(0,0,0,0.9)] pointer-events-none z-30" />
        </button>

        {/* ─── 2. CENTER RECESSED TRACK: Embossed A–Z Letters + Lower Machined Brass Rod ─── */}
        <div className="relative flex-1 h-full px-3 sm:px-4 flex flex-col justify-start">
          <div className="relative w-full h-full">
            {/* Upper A–Z Serif Letter Row */}
            <div className="relative flex items-center justify-between w-full h-[30px] pt-1 z-10">
              {ALPHABET.map((letter) => {
                const isSelected = selectedLetter === letter;
                const count = letterCounts[letter] ?? 0;

                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => onSelectLetter(letter)}
                    title={`${letter}${count ? ` (${count} student${count === 1 ? "" : "s"})` : ""}`}
                    className="relative flex items-center justify-center flex-1 h-full cursor-pointer transition-all duration-150 focus:outline-none group"
                  >
                    <span
                      className={cn(
                        "font-serif text-[12px] sm:text-[14px] md:text-[15.5px] leading-none tracking-[0.02em] transition-all select-none",
                        isSelected
                          ? "text-[#FFF6D6] font-bold scale-115 drop-shadow-[0_0_9px_rgba(255,216,130,0.95)]"
                          : "text-[#D9B166] group-hover:text-[#FFF3CF] font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
                      )}
                    >
                      {letter}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Lower Machined Horizontal Brass Slider Rod */}
            <div className="absolute -left-[4px] -right-[4px] bottom-[9.5px] h-[3.5px] rounded-full bg-gradient-to-b from-[#FFF1C9] via-[#C99744] to-[#4E320A] shadow-[0_2px_4px_rgba(0,0,0,0.95)] pointer-events-none z-10" />

            {/* Sliding 3D Cast Brass Dish Thumb Knob */}
            {activeIndex >= 0 && activeIndex < 26 && (
              <div
                className="absolute z-30 pointer-events-none transition-all duration-200 ease-out flex items-center justify-center"
                style={{
                  left: `${((activeIndex + 0.5) / 26) * 100}%`,
                  bottom: "11px",
                  transform: "translate(-50%, 50%)",
                }}
              >
                <BrassSliderDishKnob className="w-[22px] h-[22px] sm:w-[25px] sm:h-[25px]" />
              </div>
            )}
          </div>
        </div>

        {/* ─── 3. RIGHT END CAP: Riveted Brushed Antique Brass Terminal Plate ─── */}
        <div
          className={cn(
            "wp-stu-az-cap relative shrink-0 flex items-center justify-center h-full rounded-r-full select-none z-20",
            "border-l-[1.5px] border-[#3F2807] w-[70px] sm:w-[82px] md:w-[88px]"
          )}
        >
          {/* Right Horizontal Rod Collar Fitting */}
          <div className="absolute -left-[7px] bottom-[8px] w-[9px] h-[7px] rounded-[1.5px] bg-gradient-to-b from-[#FCE2A4] via-[#C69443] to-[#4E320A] border border-[#241503] shadow-[0_1px_3px_rgba(0,0,0,0.9)] pointer-events-none z-30" />

          {/* 4 Hammered Brass Rivets */}
          <div className="absolute top-[6px] left-[9px] pointer-events-none">
            <BrassScrewHead className="w-[7px] h-[7px]" />
          </div>
          <div className="absolute bottom-[6px] left-[9px] pointer-events-none">
            <BrassScrewHead className="w-[7px] h-[7px]" />
          </div>
          <div className="absolute top-[6px] right-[14px] pointer-events-none">
            <BrassScrewHead className="w-[7px] h-[7px]" />
          </div>
          <div className="absolute bottom-[6px] right-[14px] pointer-events-none">
            <BrassScrewHead className="w-[7px] h-[7px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
