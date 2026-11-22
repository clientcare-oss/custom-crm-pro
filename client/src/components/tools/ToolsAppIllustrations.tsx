import React from "react";

/**
 * Custom 3D-styled glossy app icons for the Waypoint Tools Hub (PG-010).
 * Matches the 6-app 2-column grid reference design (First Mate, PWN Decoder,
 * Parent Concerns, State Complaint Builder, IEP Comparator, Document Vault).
 */

export function Tool3DAppIcon({
  id,
  size = "md",
}: {
  id: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims =
    size === "lg"
      ? "w-[50px] h-[50px] sm:w-[54px] sm:h-[54px]"
      : size === "sm"
      ? "w-7 h-7"
      : "w-[44px] h-[44px] sm:w-[48px] sm:h-[48px]";

  // 1. First Mate — Glossy Violet/Purple Square with Two 3D Speech Bubbles & "?"
  if (id === "first-mate") {
    return (
      <svg viewBox="0 0 96 96" fill="none" className={`${dims} shrink-0 select-none`}>
        <defs>
          <radialGradient id="fmBg" cx="28%" cy="18%" r="82%">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="48%" stopColor="#6D28D9" />
            <stop offset="100%" stopColor="#2E1065" />
          </radialGradient>
          <linearGradient id="fmBackBubble" x1="14" y1="42" x2="54" y2="78" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#C4B5FD" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
          <linearGradient id="fmFrontBubble" x1="30" y1="16" x2="80" y2="62" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F5F3FF" />
            <stop offset="45%" stopColor="#C4B5FD" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
        <rect
          x="2"
          y="2"
          width="92"
          height="92"
          rx="22"
          fill="url(#fmBg)"
          stroke="#C4B5FD"
          strokeOpacity="0.55"
          strokeWidth="1.5"
        />
        {/* Lower-left 3D speech bubble */}
        <path
          d="M15 56C15 46.6 23.7 39 34.5 39C45.3 39 54 46.6 54 56C54 65.4 45.3 73 34.5 73C31 73 27.7 72.2 24.8 70.7L16.5 74.5L19.4 66.8C16.6 63.8 15 60.1 15 56Z"
          fill="url(#fmBackBubble)"
          stroke="#DDD6FE"
          strokeOpacity="0.6"
          strokeWidth="1"
        />
        {/* Upper-right primary 3D speech bubble with "?" */}
        <path
          d="M32 40C32 28.4 42.7 19 56 19C69.3 19 80 28.4 80 40C80 51.6 69.3 61 56 61C51.5 61 47.3 59.9 43.7 58L33.5 62.5L37.2 53.4C33.9 49.7 32 45.1 32 40Z"
          fill="url(#fmFrontBubble)"
          stroke="#FFFFFF"
          strokeOpacity="0.85"
          strokeWidth="1.2"
        />
        <text
          x="56"
          y="48.5"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="28"
          fontWeight="700"
          fontFamily="sans-serif"
        >
          ?
        </text>
      </svg>
    );
  }

  // 2. PWN Decoder — Glossy Sky/Sapphire Blue Square with 3D Document & Gold-Handled Magnifying Glass
  if (id === "pwn-decoder" || id === "pwn-checker") {
    return (
      <svg viewBox="0 0 96 96" fill="none" className={`${dims} shrink-0 select-none`}>
        <defs>
          <radialGradient id="pwnBg" cx="25%" cy="18%" r="85%">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="48%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#0F2356" />
          </radialGradient>
          <linearGradient id="pwnDoc" x1="18" y1="14" x2="68" y2="78" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#EFF6FF" />
            <stop offset="100%" stopColor="#93C5FD" />
          </linearGradient>
          <radialGradient id="pwnLens" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.85" />
            <stop offset="70%" stopColor="#1D4ED8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#1E3A8A" />
          </radialGradient>
        </defs>
        <rect
          x="2"
          y="2"
          width="92"
          height="92"
          rx="22"
          fill="url(#pwnBg)"
          stroke="#93C5FD"
          strokeOpacity="0.6"
          strokeWidth="1.5"
        />
        {/* 3D Document with folded corner */}
        <rect
          x="18"
          y="15"
          width="50"
          height="64"
          rx="7"
          fill="url(#pwnDoc)"
          stroke="#FFFFFF"
          strokeWidth="1.2"
        />
        {/* Document text lines */}
        <rect x="26" y="28" width="28" height="4" rx="2" fill="#2563EB" opacity="0.75" />
        <rect x="26" y="36" width="32" height="4" rx="2" fill="#2563EB" opacity="0.65" />
        <rect x="26" y="44" width="22" height="4" rx="2" fill="#2563EB" opacity="0.65" />
        <rect x="26" y="52" width="18" height="4" rx="2" fill="#2563EB" opacity="0.65" />
        <rect x="26" y="60" width="20" height="4" rx="2" fill="#2563EB" opacity="0.55" />

        {/* Gold Magnifying Glass Handle */}
        <line
          x1="67"
          y1="65"
          x2="81"
          y2="79"
          stroke="#F59E0B"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <line
          x1="67"
          y1="65"
          x2="81"
          y2="79"
          stroke="#FDE68A"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Magnifying Glass Rim & Blue Lens */}
        <circle
          cx="56"
          cy="54"
          r="15"
          fill="url(#pwnLens)"
          stroke="#E2E8F0"
          strokeWidth="3.5"
        />
        {/* Specular lens glint */}
        <path
          d="M47 48C49 44 54 42 59 43"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.8"
        />
      </svg>
    );
  }

  // 3. Parent Concerns — Glossy Warm Cream/Parchment Square with Tilted Note & Navy/Gold Fountain Pen
  if (id === "worksheet-builder" || id === "letter-builder") {
    return (
      <svg viewBox="0 0 96 96" fill="none" className={`${dims} shrink-0 select-none`}>
        <defs>
          <radialGradient id="pcBg" cx="28%" cy="20%" r="85%">
            <stop offset="0%" stopColor="#FEF3C7" />
            <stop offset="55%" stopColor="#D6BC94" />
            <stop offset="100%" stopColor="#785A3C" />
          </radialGradient>
          <linearGradient id="pcSheet" x1="16" y1="16" x2="72" y2="78" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFDF9" />
            <stop offset="100%" stopColor="#EAD7B7" />
          </linearGradient>
        </defs>
        <rect
          x="2"
          y="2"
          width="92"
          height="92"
          rx="22"
          fill="url(#pcBg)"
          stroke="#FDE68A"
          strokeOpacity="0.65"
          strokeWidth="1.5"
        />
        {/* Tilted 3D Cream Note Sheet */}
        <g transform="rotate(-7 45 48)">
          <rect
            x="18"
            y="18"
            width="52"
            height="58"
            rx="6"
            fill="url(#pcSheet)"
            stroke="#FFFFFF"
            strokeWidth="1.2"
          />
          <rect x="26" y="30" width="32" height="3.8" rx="1.9" fill="#9A7B56" opacity="0.7" />
          <rect x="26" y="38" width="34" height="3.8" rx="1.9" fill="#9A7B56" opacity="0.65" />
          <rect x="26" y="46" width="28" height="3.8" rx="1.9" fill="#9A7B56" opacity="0.6" />
          <rect x="26" y="54" width="22" height="3.8" rx="1.9" fill="#9A7B56" opacity="0.55" />
        </g>
        {/* 3D Navy & Gold Fountain Pen */}
        <g transform="rotate(-52 64 52)">
          <rect
            x="40"
            y="47"
            width="44"
            height="10"
            rx="5"
            fill="#1E3A8A"
            stroke="#93C5FD"
            strokeWidth="0.9"
          />
          {/* Gold nib cone */}
          <polygon points="40,47 28,52 40,57" fill="#F59E0B" />
          <polygon points="32,50.3 28,52 32,53.7" fill="#1E293B" />
          {/* Gold trim rings & clip */}
          <rect x="56" y="47" width="3.5" height="10" fill="#FBBF24" />
          <rect x="76" y="47" width="3" height="10" fill="#FBBF24" />
        </g>
      </svg>
    );
  }

  // 4. State Complaint Builder — Glossy Deep Sapphire Square with 3D Checklist & 3 Gold Checkmarks
  if (id === "state-complaint-builder") {
    return (
      <svg viewBox="0 0 96 96" fill="none" className={`${dims} shrink-0 select-none`}>
        <defs>
          <radialGradient id="scbBg" cx="25%" cy="18%" r="85%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="48%" stopColor="#1E3A8A" />
            <stop offset="100%" stopColor="#091536" />
          </radialGradient>
          <linearGradient id="scbDoc" x1="20" y1="14" x2="76" y2="82" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="50%" stopColor="#1D4ED8" />
            <stop offset="100%" stopColor="#172554" />
          </linearGradient>
        </defs>
        <rect
          x="2"
          y="2"
          width="92"
          height="92"
          rx="22"
          fill="url(#scbBg)"
          stroke="#93C5FD"
          strokeOpacity="0.55"
          strokeWidth="1.5"
        />
        {/* 3D Dark Sapphire Checklist Document */}
        <rect
          x="19"
          y="15"
          width="58"
          height="66"
          rx="8"
          fill="url(#scbDoc)"
          stroke="#93C5FD"
          strokeOpacity="0.7"
          strokeWidth="1.2"
        />
        {/* Row 1: Checkbox + Gold Checkmark + Line */}
        <rect x="27" y="27" width="11" height="11" rx="2.5" stroke="#93C5FD" strokeWidth="1.5" fill="#0F172A" fillOpacity="0.4" />
        <path d="M29.5 32.5L32 35L37.5 29" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="44" y="31" width="24" height="3.5" rx="1.75" fill="#DBEAFE" opacity="0.85" />

        {/* Row 2: Checkbox + Gold Checkmark + Line */}
        <rect x="27" y="43" width="11" height="11" rx="2.5" stroke="#93C5FD" strokeWidth="1.5" fill="#0F172A" fillOpacity="0.4" />
        <path d="M29.5 48.5L32 51L37.5 45" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="44" y="47" width="24" height="3.5" rx="1.75" fill="#DBEAFE" opacity="0.8" />

        {/* Row 3: Checkbox + Gold Checkmark + Line */}
        <rect x="27" y="59" width="11" height="11" rx="2.5" stroke="#93C5FD" strokeWidth="1.5" fill="#0F172A" fillOpacity="0.4" />
        <path d="M29.5 64.5L32 67L37.5 61" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="44" y="63" width="20" height="3.5" rx="1.75" fill="#DBEAFE" opacity="0.75" />
      </svg>
    );
  }

  // 5. IEP Comparator — Glossy Azure Square with Dual Overlapping Documents (Blue & Seafoam Green) + Yellow Diff Bars
  if (id === "iep-review") {
    return (
      <svg viewBox="0 0 96 96" fill="none" className={`${dims} shrink-0 select-none`}>
        <defs>
          <radialGradient id="iepBg" cx="25%" cy="18%" r="85%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="52%" stopColor="#1D4ED8" />
            <stop offset="100%" stopColor="#0D1F49" />
          </radialGradient>
          <linearGradient id="iepLeftDoc" x1="14" y1="16" x2="54" y2="74" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#DBEAFE" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
          <linearGradient id="iepRightDoc" x1="42" y1="24" x2="82" y2="82" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#A7F3D0" />
            <stop offset="55%" stopColor="#5EEAD4" />
            <stop offset="100%" stopColor="#14B8A6" />
          </linearGradient>
        </defs>
        <rect
          x="2"
          y="2"
          width="92"
          height="92"
          rx="22"
          fill="url(#iepBg)"
          stroke="#93C5FD"
          strokeOpacity="0.6"
          strokeWidth="1.5"
        />
        {/* Left Blue Document */}
        <g transform="rotate(-6 36 46)">
          <rect
            x="15"
            y="16"
            width="42"
            height="56"
            rx="6"
            fill="url(#iepLeftDoc)"
            stroke="#FFFFFF"
            strokeWidth="1.1"
          />
          <rect x="22" y="26" width="26" height="4" rx="2" fill="#1D4ED8" opacity="0.65" />
          <rect x="22" y="34" width="28" height="4" rx="2" fill="#1D4ED8" opacity="0.55" />
          <rect x="22" y="42" width="22" height="4" rx="2" fill="#1D4ED8" opacity="0.55" />
          <rect x="22" y="50" width="24" height="4" rx="2" fill="#1D4ED8" opacity="0.55" />
        </g>
        {/* Right Seafoam Document with Highlighted Diff Lines */}
        <g transform="rotate(4 60 54)">
          <rect
            x="40"
            y="26"
            width="42"
            height="54"
            rx="6"
            fill="url(#iepRightDoc)"
            stroke="#FFFFFF"
            strokeWidth="1.1"
          />
          <rect x="47" y="36" width="26" height="4" rx="2" fill="#0F766E" opacity="0.65" />
          <rect x="47" y="44" width="28" height="5" rx="2.5" fill="#FACC15" />
          <rect x="47" y="53" width="24" height="4" rx="2" fill="#0F766E" opacity="0.55" />
          <rect x="47" y="61" width="27" height="5" rx="2.5" fill="#FACC15" />
        </g>
      </svg>
    );
  }

  // 6. Document Vault — Glossy Cobalt Square with 3D Folder & Warm Gold Padlock
  if (id === "document-vault") {
    return (
      <svg viewBox="0 0 96 96" fill="none" className={`${dims} shrink-0 select-none`}>
        <defs>
          <radialGradient id="dvBg" cx="25%" cy="18%" r="85%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="50%" stopColor="#1E40AF" />
            <stop offset="100%" stopColor="#0A1940" />
          </radialGradient>
          <linearGradient id="dvFolderBack" x1="16" y1="22" x2="72" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id="dvFolderFront" x1="16" y1="36" x2="76" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="45%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1E3A8A" />
          </linearGradient>
          <linearGradient id="dvGoldLock" x1="48" y1="48" x2="76" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
        </defs>
        <rect
          x="2"
          y="2"
          width="92"
          height="92"
          rx="22"
          fill="url(#dvBg)"
          stroke="#93C5FD"
          strokeOpacity="0.55"
          strokeWidth="1.5"
        />
        {/* Folder Back Tab */}
        <path
          d="M16 28C16 24.7 18.7 22 22 22H38L44 28H68C71.3 28 74 30.7 74 34V68C74 71.3 71.3 74 68 74H22C18.7 74 16 71.3 16 68V28Z"
          fill="url(#dvFolderBack)"
        />
        {/* White Document Sheets Sticking Out */}
        <rect x="23" y="27" width="44" height="26" rx="4" fill="#EFF6FF" opacity="0.9" />
        {/* Folder Front Flap */}
        <path
          d="M16 40C16 36.7 18.7 34 22 34H70C73.3 34 76 36.7 76 40L73 70C72.7 73.1 70.1 75.5 67 75.5H22C18.7 75.5 16 72.8 16 69.5V40Z"
          fill="url(#dvFolderFront)"
          stroke="#BFDBFE"
          strokeOpacity="0.7"
          strokeWidth="1"
        />
        {/* 3D Gold Padlock */}
        <path
          d="M55 52V47C55 43.1 58.1 40 62 40C65.9 40 69 43.1 69 47V52"
          stroke="#E2E8F0"
          strokeWidth="3.8"
          strokeLinecap="round"
        />
        <rect
          x="50"
          y="51"
          width="24"
          height="21"
          rx="5"
          fill="url(#dvGoldLock)"
          stroke="#FEF3C7"
          strokeWidth="1"
        />
        <circle cx="62" cy="59.5" r="2.3" fill="#1E293B" />
        <rect x="60.8" y="60.5" width="2.4" height="5.5" rx="1.2" fill="#1E293B" />
      </svg>
    );
  }

  // 7. The Studio — Glossy Deep Navy / Neon Cyan & Violet Teaching Canvas Icon
  if (id === "the-studio") {
    return (
      <svg viewBox="0 0 96 96" fill="none" className={`${dims} shrink-0 select-none`}>
        <defs>
          <radialGradient id="studioBg" cx="25%" cy="18%" r="85%">
            <stop offset="0%" stopColor="#1E1B4B" />
            <stop offset="50%" stopColor="#091538" />
            <stop offset="100%" stopColor="#000820" />
          </radialGradient>
        </defs>
        <rect
          x="2"
          y="2"
          width="92"
          height="92"
          rx="22"
          fill="url(#studioBg)"
          stroke="#38BDF8"
          strokeOpacity="0.6"
          strokeWidth="1.5"
        />
        <rect
          x="14"
          y="18"
          width="68"
          height="50"
          rx="10"
          fill="#02081F"
          stroke="#818CF8"
          strokeWidth="1.8"
        />
        <path
          d="M22 48 Q 34 26, 48 42 T 74 34"
          stroke="#22D3EE"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="30" cy="33" r="4" fill="#A78BFA" />
        <circle cx="66" cy="54" r="4" fill="#FFE394" />
        <rect
          x="26"
          y="73"
          width="44"
          height="8"
          rx="4"
          fill="#1E295B"
          stroke="#A78BFA"
          strokeWidth="1"
        />
      </svg>
    );
  }

  // Remaining Waypoint Tools 3D Glossy Badge
  return (
    <svg viewBox="0 0 96 96" fill="none" className={`${dims} shrink-0 select-none`}>
      <defs>
        <radialGradient id={`genBg-${id}`} cx="28%" cy="18%" r="85%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="52%" stopColor="#1E3A8A" />
          <stop offset="100%" stopColor="#091534" />
        </radialGradient>
      </defs>
      <rect
        x="2"
        y="2"
        width="92"
        height="92"
        rx="22"
        fill={`url(#genBg-${id})`}
        stroke="#93C5FD"
        strokeOpacity="0.55"
        strokeWidth="1.5"
      />
      <circle
        cx="48"
        cy="48"
        r="24"
        fill="#FFFFFF"
        fillOpacity="0.12"
        stroke="#E0E7FF"
        strokeOpacity="0.55"
        strokeWidth="1.4"
      />
      <circle cx="48" cy="48" r="10" fill="#DFBE77" />
    </svg>
  );
}
