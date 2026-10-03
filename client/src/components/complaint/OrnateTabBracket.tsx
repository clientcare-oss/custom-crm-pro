import React, { useId } from "react";
import { cn } from "@/lib/utils";

interface OrnateTabBracketProps {
  isActive?: boolean;
  className?: string;
  height?: number | string;
  variant?: "vector" | "composite";
}

/**
 * Handcrafted 3D Ornate Gold & Navy Corner Bracket / Tab Clamp
 * Rebuilt from Byron's reference hardware into real UI pieces:
 *
 * PIECE 1: Outer Heavy Brass Backplate with beveled frame and brushed core.
 * PIECE 2: 3D Cylindrical Brass Pull Handle on the left with specular highlights.
 * PIECE 3: Imperial Navy Enamelled Clamping Bracket with gold beveled border and star glint.
 * PIECE 4: Four Precision-Turned Brass Philips-Head Screws in countersunk wells.
 */
export function OrnateTabBracket({
  isActive = false,
  className,
  height = 40,
  variant = "composite",
}: OrnateTabBracketProps) {
  const uid = useId().replace(/:/g, "_");
  const pixelHeight = typeof height === "number" ? height : 40;

  if (variant === "composite") {
    return (
      <div
        className={cn(
          "relative flex items-center justify-center shrink-0 pointer-events-none select-none transition-all duration-200",
          isActive
            ? "scale-[1.04] drop-shadow-[0_0_10px_rgba(255,215,100,0.55)]"
            : "opacity-95 group-hover:opacity-100 group-hover:scale-[1.02]",
          className
        )}
        style={{
          height: `${pixelHeight}px`,
          width: `${(pixelHeight * 702) / 1762}px`,
        }}
      >
        {/* Layer 1: Contact Drop-Shadow onto card */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            filter: "drop-shadow(2px 3px 6px rgba(0, 0, 0, 0.85))",
          }}
        >
          {/* Layer 2: True-Alpha Clean 3D Rendered Hardware Piece (No Checkerboard) */}
          <img
            src="/decor/ornate-bracket-clean.png"
            alt="Ornate Brass & Navy Tab Bracket"
            className={cn(
              "w-full h-full object-contain pointer-events-none select-none transition-all duration-200",
              isActive ? "brightness-110 contrast-105" : "brightness-95 contrast-100 group-hover:brightness-105"
            )}
          />
        </div>
      </div>
    );
  }

  // Pure Scalable Vector SVG Implementation
  return (
    <div
      className={cn(
        "relative flex items-center justify-center shrink-0 pointer-events-none select-none transition-transform duration-200",
        isActive ? "scale-[1.05]" : "opacity-95 hover:opacity-100",
        className
      )}
      style={{
        height: typeof height === "number" ? `${height}px` : height,
        aspectRatio: "702 / 1762",
      }}
    >
      <svg
        viewBox="0 0 100 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible drop-shadow-[2px_3px_5px_rgba(0,0,0,0.85)]"
      >
        <defs>
          <filter id={`shadow_${uid}`} x="-20%" y="-15%" width="150%" height="135%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="3" dy="4" stdDeviation="3.5" floodColor="#000000" floodOpacity="0.8" />
          </filter>

          <filter id={`handleShadow_${uid}`} x="-30%" y="-20%" width="160%" height="140%">
            <feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="#180C02" floodOpacity="0.9" />
          </filter>

          <linearGradient id={`brassBevel_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF2B8" />
            <stop offset="18%" stopColor="#DFB253" />
            <stop offset="42%" stopColor="#9C6F1E" />
            <stop offset="70%" stopColor="#E5C26B" />
            <stop offset="88%" stopColor="#7A5012" />
            <stop offset="100%" stopColor="#4A2F08" />
          </linearGradient>

          <linearGradient id={`brassPlate_${uid}`} x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor="#C99B3D" />
            <stop offset="25%" stopColor="#E8C976" />
            <stop offset="50%" stopColor="#B3832B" />
            <stop offset="75%" stopColor="#E2BD64" />
            <stop offset="100%" stopColor="#7E5616" />
          </linearGradient>

          <linearGradient id={`brassInner_${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#966C21" />
            <stop offset="12%" stopColor="#C89D42" />
            <stop offset="48%" stopColor="#DBB45F" />
            <stop offset="82%" stopColor="#B98B32" />
            <stop offset="100%" stopColor="#6C4711" />
          </linearGradient>

          <linearGradient id={`handleGrad_${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4A2E0A" />
            <stop offset="12%" stopColor="#875E1C" />
            <stop offset="26%" stopColor="#DFBA62" />
            <stop offset="42%" stopColor="#FFF4D0" />
            <stop offset="58%" stopColor="#E9C770" />
            <stop offset="80%" stopColor="#996E23" />
            <stop offset="100%" stopColor="#412708" />
          </linearGradient>

          <linearGradient id={`handleArch_${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFF2BF" />
            <stop offset="10%" stopColor="#D4A747" />
            <stop offset="50%" stopColor="#F7DB8A" />
            <stop offset="90%" stopColor="#A87926" />
            <stop offset="100%" stopColor="#4F310A" />
          </linearGradient>

          <linearGradient id={`navyEnamel_${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#08182D" />
            <stop offset="22%" stopColor="#0C2548" />
            <stop offset="52%" stopColor="#153B6A" />
            <stop offset="78%" stopColor="#0E284D" />
            <stop offset="100%" stopColor="#061224" />
          </linearGradient>

          <linearGradient id={`navyGlaze_${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2A5B9C" stopOpacity="0.8" />
            <stop offset="8%" stopColor="#173B6B" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#0B2344" stopOpacity="0.1" />
            <stop offset="92%" stopColor="#193E70" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#2D64AA" stopOpacity="0.7" />
          </linearGradient>

          <radialGradient id={`screwCap_${uid}`} cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#FFF7D8" />
            <stop offset="35%" stopColor="#E5C167" />
            <stop offset="70%" stopColor="#AC802B" />
            <stop offset="100%" stopColor="#5E3C0B" />
          </radialGradient>

          <radialGradient id={`screwWell_${uid}`} cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#261706" />
            <stop offset="80%" stopColor="#472F10" />
            <stop offset="100%" stopColor="#D9B156" />
          </radialGradient>
        </defs>

        {/* PIECE 1: BRASS BACKPLATE */}
        <g filter={`url(#shadow_${uid})`}>
          <rect
            x="17"
            y="9"
            width="44"
            height="182"
            rx="9"
            ry="9"
            fill={`url(#brassPlate_${uid})`}
            stroke={`url(#brassBevel_${uid})`}
            strokeWidth="2.5"
          />
          <rect
            x="20.5"
            y="12.5"
            width="37"
            height="175"
            rx="6.5"
            ry="6.5"
            fill="none"
            stroke="#382206"
            strokeWidth="1.2"
            opacity="0.85"
          />
          <rect
            x="22"
            y="14"
            width="34"
            height="172"
            rx="5.5"
            ry="5.5"
            fill={`url(#brassInner_${uid})`}
            stroke={`url(#brassBevel_${uid})`}
            strokeWidth="0.8"
          />
          <line x1="26" y1="20" x2="52" y2="20" stroke="#FFF0B0" strokeWidth="0.8" opacity="0.6" />
          <line x1="26" y1="180" x2="52" y2="180" stroke="#362106" strokeWidth="0.8" opacity="0.7" />
        </g>

        {/* PIECE 2: 3D CYLINDRICAL BRASS PULL HANDLE */}
        <g filter={`url(#handleShadow_${uid})`}>
          <path
            d="M 23 48 C 23 46, 29 45, 34 46 C 36 50, 34 56, 29 57 C 25 57, 23 54, 23 48 Z"
            fill={`url(#brassBevel_${uid})`}
            stroke="#3D2506"
            strokeWidth="0.75"
          />
          <path
            d="M 23 152 C 23 158, 29 159, 34 158 C 36 154, 34 148, 29 147 C 25 147, 23 150, 23 152 Z"
            fill={`url(#brassBevel_${uid})`}
            stroke="#3D2506"
            strokeWidth="0.75"
          />
          <path
            d="M 24 50
               C 21 50, 16 57, 15 68
               L 14 132
               C 15 143, 21 150, 24 150
               C 27 150, 29 144, 27 136
               C 25 128, 23 120, 23 100
               C 23 80, 25 72, 27 64
               C 29 56, 27 50, 24 50 Z"
            fill={`url(#handleGrad_${uid})`}
            stroke={`url(#brassBevel_${uid})`}
            strokeWidth="1.2"
          />
          <path
            d="M 23 52
               C 19 55, 15 62, 14.5 72
               L 14.5 128
               C 15 138, 19 145, 23 148"
            fill="none"
            stroke={`url(#handleArch_${uid})`}
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <path d="M 17 68 L 16.5 132" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" opacity="0.9" />
          <path d="M 17.5 76 L 17 124" stroke="#FFF9E0" strokeWidth="0.8" strokeLinecap="round" opacity="0.95" />
          <path
            d="M 24 62 C 22 75, 21 88, 21 100 C 21 112, 22 125, 24 138"
            fill="none"
            stroke="#2B1804"
            strokeWidth="1.2"
            opacity="0.7"
          />
        </g>

        {/* PIECE 3: NAVY ENAMELED CLAMP BRACKET */}
        <g filter={`url(#shadow_${uid})`}>
          <path
            d="M 57 11
               L 88 11
               L 95 18
               L 95 34
               L 89 40
               L 73 40
               L 73 160
               L 89 160
               L 95 166
               L 95 182
               L 88 189
               L 57 189
               L 57 167
               L 41 167
               L 41 33
               L 57 33
               Z"
            fill={`url(#brassBevel_${uid})`}
            stroke="#342005"
            strokeWidth="1.5"
            strokeLinejoin="bevel"
          />
          <path
            d="M 59 13.5
               L 87 13.5
               L 92.5 19
               L 92.5 32
               L 86.5 37.5
               L 71 37.5
               L 71 162.5
               L 86.5 162.5
               L 92.5 168
               L 92.5 181
               L 87 186.5
               L 59 186.5
               L 59 164.5
               L 43.5 164.5
               L 43.5 35.5
               L 59 35.5
               Z"
            fill={`url(#navyEnamel_${uid})`}
            stroke={`url(#brassBevel_${uid})`}
            strokeWidth="1.2"
            strokeLinejoin="bevel"
          />
          <path
            d="M 59 13.5
               L 87 13.5
               L 92.5 19
               L 92.5 32
               L 86.5 37.5
               L 71 37.5
               L 71 162.5
               L 86.5 162.5
               L 92.5 168
               L 92.5 181
               L 87 186.5
               L 59 186.5
               L 59 164.5
               L 43.5 164.5
               L 43.5 35.5
               L 59 35.5
               Z"
            fill={`url(#navyGlaze_${uid})`}
            opacity="0.85"
            strokeLinejoin="bevel"
          />
          <path d="M 61 16 L 85 16 L 90 21" fill="none" stroke="#FFEB9E" strokeWidth="1" opacity="0.7" />
          <line x1="70" y1="40" x2="70" y2="160" stroke="#4A7BBF" strokeWidth="1.4" opacity="0.5" />
          <line x1="72" y1="42" x2="72" y2="158" stroke="#FFDE82" strokeWidth="1" opacity="0.75" />
          <path d="M 61 184 L 85 184 L 90 179" fill="none" stroke="#D9A845" strokeWidth="1" opacity="0.6" />
        </g>

        {/* PIECE 4: FOUR AUTHENTIC BRASS PHILIPS-HEAD COUNTERSUNK SCREWS */}
        <ScrewHead cx={45} cy={34} r={7.2} uid={uid} rotation={18} />
        <ScrewHead cx={45} cy={166} r={7.2} uid={uid} rotation={74} />
        <ScrewHead cx={74} cy={23} r={6.2} uid={uid} rotation={32} />
        <ScrewHead cx={74} cy={177} r={6.2} uid={uid} rotation={105} />
      </svg>
    </div>
  );
}

function ScrewHead({
  cx,
  cy,
  r,
  uid,
  rotation = 0,
}: {
  cx: number;
  cy: number;
  r: number;
  uid: string;
  rotation?: number;
}) {
  const slotW = r * 0.32;
  const slotL = r * 1.25;

  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <circle cx="0" cy="0" r={r + 1.2} fill={`url(#screwWell_${uid})`} stroke="#1E1103" strokeWidth="0.8" />
      <circle cx="0" cy="0" r={r} fill={`url(#screwCap_${uid})`} stroke="#593B0F" strokeWidth="0.75" />
      <path
        d={`M ${-r * 0.7} ${-r * 0.5} A ${r} ${r} 0 0 1 ${r * 0.7} ${-r * 0.5}`}
        stroke="#FFF8E0"
        strokeWidth="0.7"
        fill="none"
        opacity="0.85"
      />
      <g transform={`rotate(${rotation})`}>
        <rect x={-slotL / 2} y={-slotW / 2} width={slotL} height={slotW} rx="0.5" fill="#1C0E02" />
        <rect x={-slotW / 2} y={-slotL / 2} width={slotW} height={slotL} rx="0.5" fill="#1C0E02" />
        <line
          x1={-slotL / 2 + 0.5}
          y1={slotW / 2}
          x2={slotL / 2 - 0.5}
          y2={slotW / 2}
          stroke="#FFE399"
          strokeWidth="0.6"
          opacity="0.85"
        />
        <line
          x1={slotW / 2}
          y1={-slotL / 2 + 0.5}
          x2={slotW / 2}
          y2={slotL / 2 - 0.5}
          stroke="#FFE399"
          strokeWidth="0.6"
          opacity="0.85"
        />
      </g>
    </g>
  );
}

export default OrnateTabBracket;
