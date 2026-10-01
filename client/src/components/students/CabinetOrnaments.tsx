import React from "react";

/**
 * 8-point polished Waypoint brass compass emblem with faceted bevels
 */
export function CompassEmblem({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <div className={`relative shrink-0 ${className} drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)]`}>
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Outer beaded brass ring */}
        <circle cx="32" cy="32" r="30" stroke="url(#c-ring-gold)" strokeWidth="2.2" />
        <circle cx="32" cy="32" r="26.5" stroke="url(#c-inner-gold)" strokeWidth="1" strokeDasharray="3 3" opacity="0.9" />
        <circle cx="32" cy="32" r="24" stroke="#684210" strokeWidth="0.8" />

        {/* Cardinal Points (North, South, East, West) */}
        {/* North */}
        <polygon points="32,4 36.5,27.5 32,23 27.5,27.5" fill="url(#c-pt-light)" />
        <polygon points="32,4 32,23 36.5,27.5" fill="url(#c-pt-dark)" />
        {/* South */}
        <polygon points="32,60 36.5,36.5 32,41 27.5,36.5" fill="url(#c-pt-light)" />
        <polygon points="32,60 32,41 36.5,36.5" fill="url(#c-pt-dark)" />
        {/* West */}
        <polygon points="4,32 27.5,36.5 23,32 27.5,27.5" fill="url(#c-pt-light)" />
        <polygon points="4,32 23,32 27.5,27.5" fill="url(#c-pt-dark)" />
        {/* East */}
        <polygon points="60,32 36.5,27.5 41,32 36.5,36.5" fill="url(#c-pt-light)" />
        <polygon points="60,32 41,32 36.5,36.5" fill="url(#c-pt-dark)" />

        {/* Diagonal Points (NE, NW, SE, SW) */}
        <polygon points="12,12 28,28 24.5,26.5 26.5,24.5" fill="url(#c-pt-light)" opacity="0.95" />
        <polygon points="52,12 36,28 37.5,24.5 39.5,26.5" fill="url(#c-pt-dark)" opacity="0.95" />
        <polygon points="12,52 28,36 26.5,39.5 24.5,37.5" fill="url(#c-pt-dark)" opacity="0.95" />
        <polygon points="52,52 36,36 39.5,37.5 37.5,39.5" fill="url(#c-pt-light)" opacity="0.95" />

        {/* Center core brass hub */}
        <circle cx="32" cy="32" r="5.5" fill="url(#c-ring-gold)" stroke="#3D2908" strokeWidth="1" />
        <circle cx="32" cy="32" r="2.8" fill="#FFF8E8" />

        <defs>
          <linearGradient id="c-ring-gold" x1="2" y1="2" x2="62" y2="62" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFF2D6" />
            <stop offset="0.3" stopColor="#F7D287" />
            <stop offset="0.7" stopColor="#B88943" />
            <stop offset="1" stopColor="#5E3F0F" />
          </linearGradient>
          <linearGradient id="c-inner-gold" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFEAA7" />
            <stop offset="1" stopColor="#8C6225" />
          </linearGradient>
          <linearGradient id="c-pt-light" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFA" />
            <stop offset="0.45" stopColor="#F9D788" />
            <stop offset="1" stopColor="#C99849" />
          </linearGradient>
          <linearGradient id="c-pt-dark" x1="32" y1="32" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop stopColor="#B88943" />
            <stop offset="0.6" stopColor="#7E551B" />
            <stop offset="1" stopColor="#3E2606" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

/**
 * Upper-left decorative potted plant resting on 3 vintage leather-bound books
 */
export function PlantOnBooks({ className = "w-24 h-24" }: { className?: string }) {
  return (
    <div className={`relative shrink-0 pointer-events-none select-none ${className}`}>
      <svg viewBox="0 0 115 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_12px_24px_rgba(0,0,0,0.95)]">
        {/* Book 1 (Bottom): Deep Navy Leather with Gold Spine Bands & Pages */}
        <rect x="6" y="80" width="94" height="15" rx="3" fill="#132136" stroke="#0A121E" strokeWidth="1.2" />
        <rect x="8" y="82.5" width="90" height="2" fill="#D4AF37" opacity="0.8" />
        <rect x="8" y="90.5" width="90" height="2" fill="#D4AF37" opacity="0.8" />
        {/* Deckled pages on right edge */}
        <path d="M100 81C102 81 103 84.5 103 88C103 91.5 102 95 100 95" stroke="#F1E4CB" strokeWidth="2" opacity="0.9" />

        {/* Book 2 (Middle): Antique Burgundy Leather with Gold Tooling */}
        <rect x="14" y="66" width="82" height="15" rx="3" fill="#3D121B" stroke="#22070D" strokeWidth="1.2" />
        <rect x="17" y="68.5" width="76" height="1.8" fill="#E6B762" opacity="0.85" />
        <rect x="17" y="76.5" width="76" height="1.8" fill="#E6B762" opacity="0.85" />
        <path d="M96 67C98 67 99 70.5 99 74C99 77.5 98 81 96 81" stroke="#F1E4CB" strokeWidth="2" opacity="0.9" />

        {/* Book 3 (Top): Forest Green / Dark Emerald Leather */}
        <rect x="22" y="53" width="70" height="14" rx="2.5" fill="#143020" stroke="#0B1A11" strokeWidth="1.2" />
        <rect x="24" y="55" width="66" height="1.5" fill="#D4AF37" opacity="0.75" />
        <rect x="24" y="63" width="66" height="1.5" fill="#D4AF37" opacity="0.75" />

        {/* Solid Hammered Brass Planter Pot */}
        <path d="M38 54L43 32H75L80 54H38Z" fill="url(#p-pot-brass)" stroke="#523910" strokeWidth="1.2" />
        <ellipse cx="59" cy="32" rx="16" ry="3.5" fill="#2E1C07" />
        <path d="M42 34H76" stroke="#FFF2D6" strokeWidth="1.2" opacity="0.75" />

        {/* Lush Glossy Green Leaves cascading naturally */}
        <path d="M42 46C26 49 14 60 10 70C20 72 32 62 44 50Z" fill="#2D5438" />
        <path d="M34 38C18 41 8 49 4 58C14 59 24 51 36 41Z" fill="#417852" />

        <path d="M58 30C46 14 26 16 16 21C21 30 38 32 57 33Z" fill="#274A31" />
        <path d="M58 30C46 14 26 16 16 21C21 30 38 32 57 33Z" fill="url(#p-leaf-hl1)" opacity="0.7" />

        <path d="M59 29C52 8 36 2 26 1C22 11 36 24 58 29Z" fill="#386A45" />
        <path d="M59 29C52 8 36 2 26 1C22 11 36 24 58 29Z" fill="url(#p-leaf-hl2)" opacity="0.65" />

        <path d="M60 28C66 4 78 1 86 1C88 10 80 23 60 28Z" fill="#24442C" />

        <path d="M61 30C72 12 90 11 100 16C100 24 85 30 61 33Z" fill="#325F3E" />
        <path d="M61 31C73 22 93 26 104 34C100 40 82 38 61 34Z" fill="#25472E" />

        <path d="M76 42C86 46 96 56 100 64C92 66 82 58 74 46Z" fill="#356641" />

        <defs>
          <linearGradient id="p-pot-brass" x1="38" y1="32" x2="80" y2="54" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFF2D6" />
            <stop offset="0.3" stopColor="#E9BA6B" />
            <stop offset="0.7" stopColor="#B88943" />
            <stop offset="1" stopColor="#5E3F0F" />
          </linearGradient>
          <linearGradient id="p-leaf-hl1" x1="16" y1="14" x2="58" y2="33" gradientUnits="userSpaceOnUse">
            <stop stopColor="#96E8AF" />
            <stop offset="1" stopColor="#2D5438" />
          </linearGradient>
          <linearGradient id="p-leaf-hl2" x1="26" y1="1" x2="59" y2="29" gradientUnits="userSpaceOnUse">
            <stop stopColor="#B4F2C8" />
            <stop offset="1" stopColor="#386A45" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

/**
 * Upper-right decorative antique brass nautical hurricane lantern with trailing ivy
 */
export function BrassLantern({ className = "w-24 h-28" }: { className?: string }) {
  return (
    <div className={`relative shrink-0 pointer-events-none select-none ${className}`}>
      {/* Warm ambient lantern halo glow */}
      <div className="absolute top-8 left-6 w-20 h-20 rounded-full bg-[#FFA502]/40 blur-2xl pointer-events-none" />

      <svg viewBox="0 0 115 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_14px_28px_rgba(0,0,0,0.98)]">
        {/* Hanging Ivy leaves trailing from top wood ledge */}
        <path d="M12 0C14 16 6 30 2 38C9 38 18 25 18 2Z" fill="#1C3824" />
        <path d="M26 0C30 12 24 26 18 32C26 30 34 18 30 2Z" fill="#2E5A39" />
        <path d="M42 0C46 16 36 32 30 40C40 38 50 25 46 2Z" fill="#24492E" />
        <path d="M84 0C90 16 100 24 108 30C106 20 96 11 88 2Z" fill="#2E5837" />
        <path d="M90 22C96 36 104 42 112 46C108 38 100 28 94 20Z" fill="#3D734B" />

        {/* Lantern Top Ring & Cap */}
        <circle cx="58" cy="14" r="9" stroke="url(#l-brass)" strokeWidth="3.2" />
        <path d="M45 25H71L67 17H49L45 25Z" fill="url(#l-brass)" />
        <path d="M34 30C34 26 38 25 58 25C78 25 82 26 82 30L77 38H39L34 30Z" fill="url(#l-brass)" stroke="#4A310A" strokeWidth="1.2" />

        {/* Lantern Glass Globe with Warm Flame Glow */}
        <rect x="39" y="38" width="38" height="52" rx="6" fill="url(#l-glass-glow)" stroke="url(#l-brass)" strokeWidth="2" />

        {/* Vertical protective brass cage bars */}
        <line x1="47" y1="38" x2="47" y2="90" stroke="url(#l-brass)" strokeWidth="2.4" />
        <line x1="58" y1="38" x2="58" y2="90" stroke="url(#l-brass)" strokeWidth="2.4" />
        <line x1="69" y1="38" x2="69" y2="90" stroke="url(#l-brass)" strokeWidth="2.4" />

        {/* Inner Flame & Radiant Core */}
        <ellipse cx="58" cy="68" rx="4.8" ry="10" fill="#FFFFFD" />
        <ellipse cx="58" cy="68" rx="9" ry="14" fill="#FFC83B" opacity="0.85" />
        <circle cx="58" cy="68" r="16" fill="#FF9200" opacity="0.45" filter="blur(3px)" />

        {/* Stepped Cast-Brass Base */}
        <path d="M36 90H80L84 100H32L36 90Z" fill="url(#l-brass)" stroke="#4A310A" strokeWidth="1.2" />
        <rect x="29" y="100" width="58" height="9" rx="3" fill="url(#l-brass-dark)" stroke="#382407" strokeWidth="1.2" />

        <defs>
          <linearGradient id="l-brass" x1="32" y1="10" x2="84" y2="105" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFF2D6" />
            <stop offset="0.3" stopColor="#F7D287" />
            <stop offset="0.7" stopColor="#B88943" />
            <stop offset="1" stopColor="#5E3F0F" />
          </linearGradient>
          <linearGradient id="l-brass-dark" x1="29" y1="100" x2="87" y2="109" gradientUnits="userSpaceOnUse">
            <stop stopColor="#B88943" />
            <stop offset="0.5" stopColor="#6C4D19" />
            <stop offset="1" stopColor="#3A270D" />
          </linearGradient>
          <radialGradient id="l-glass-glow" cx="58" cy="67" r="30" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFF5D6" />
            <stop offset="0.35" stopColor="#FDCB6E" />
            <stop offset="0.75" stopColor="#E17055" opacity="0.55" />
            <stop offset="1" stopColor="#1E272E" opacity="0.35" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

/**
 * Slotted antique brass screw rivet (for corners of plates & drawers)
 */
export function BrassScrewRivet({ className = "w-2.5 h-2.5" }: { className?: string }) {
  return (
    <div className={`shrink-0 ${className} drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]`}>
      <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <circle cx="8" cy="8" r="7" fill="url(#s-gold)" stroke="#4A310A" strokeWidth="1" />
        <circle cx="8" cy="8" r="5" stroke="#2B1C05" strokeWidth="0.5" opacity="0.6" />
        <line x1="4" y1="6" x2="12" y2="10" stroke="#1F1303" strokeWidth="1.4" strokeLinecap="round" />
        <defs>
          <linearGradient id="s-gold" x1="2" y1="2" x2="14" y2="14" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFF2D6" />
            <stop offset="0.4" stopColor="#E9BA6B" />
            <stop offset="0.8" stopColor="#B88943" />
            <stop offset="1" stopColor="#5E3F0F" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

/**
 * Antique Brass Nameplate with authentic card catalog label frame, corner screw rivets,
 * aged parchment paper insert, document icon, letterpress serif title, and dark navy pill badge.
 */
interface AntiqueBrassNameplateProps {
  icon?: React.ElementType;
  title: string;
  count: number | string;
  type?: "active" | "onboarding" | "paused" | "archived";
  className?: string;
}

export function AntiqueBrassNameplate({
  icon: IconComponent,
  title,
  count,
  type = "onboarding",
  className = "",
}: AntiqueBrassNameplateProps) {
  return (
    <div
      className={`relative inline-flex items-center h-[38px] p-[3px] rounded-[4px] border border-[#5E3B0D] bg-gradient-to-b from-[#F5DE9B] via-[#C99849] to-[#7A5119] shadow-[0_3px_10px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.7)] select-none ${className}`}
    >
      {/* 4 Corner Brass Screws with slotted heads on the frame corners */}
      <div className="absolute top-[1.5px] left-[2px] pointer-events-none z-20">
        <BrassScrewRivet className="w-2 h-2" />
      </div>
      <div className="absolute top-[1.5px] right-[2px] pointer-events-none z-20">
        <BrassScrewRivet className="w-2 h-2" />
      </div>
      <div className="absolute bottom-[1.5px] left-[2px] pointer-events-none z-20">
        <BrassScrewRivet className="w-2 h-2" />
      </div>
      <div className="absolute bottom-[1.5px] right-[2px] pointer-events-none z-20">
        <BrassScrewRivet className="w-2 h-2" />
      </div>

      {/* Recessed Aged Parchment Paper Insert */}
      <div className="relative flex items-center gap-2.5 sm:gap-3 h-full px-3.5 sm:px-4 py-0.5 rounded-[2px] bg-gradient-to-b from-[#F7E7CD] via-[#EED5A9] to-[#DEBA82] border border-[#6B4715]/75 shadow-[inset_0_2px_4px_rgba(50,30,10,0.5),inset_0_-1px_1px_rgba(255,255,255,0.35)]">
        {/* Document/Category Icon */}
        <div className="shrink-0 text-[#3D240E] flex items-center justify-center">
          {type === "active" ? (
            <svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4.5 h-4.5 drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]">
              <path d="M9 2.5L1.5 6.5L9 10.5L16.5 6.5L9 2.5Z" fill="#3D240E" />
              <path d="M4.5 8.2V12.8C4.5 12.8 6.2 15 9 15C11.8 15 13.5 12.8 13.5 12.8V8.2" stroke="#3D240E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15.5 7V12.5" stroke="#663F1B" strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="15.5" cy="13" r="0.9" fill="#663F1B" />
            </svg>
          ) : type === "onboarding" ? (
            <svg viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4.5 drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]">
              <path
                d="M2 1C1.44772 1 1 1.44772 1 2V16C1 16.5523 1.44772 17 2 17H14C14.5523 17 15 16.5523 15 16V5.5L10.5 1H2Z"
                fill="#3D240E"
              />
              <path
                d="M10.5 1V5H14.5L10.5 1Z"
                fill="#663F1B"
              />
              <line x1="3.5" y1="8" x2="12.5" y2="8" stroke="#EED5A9" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="3.5" y1="11" x2="12.5" y2="11" stroke="#EED5A9" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="3.5" y1="14" x2="8.5" y2="14" stroke="#EED5A9" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          ) : IconComponent ? (
            <IconComponent className="w-4 h-4 text-[#3D240E] fill-[#3D240E]/20 stroke-[2.2] drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]" />
          ) : null}
        </div>

        {/* Serif Letterpressed Title */}
        <span className="font-serif font-bold tracking-[0.16em] text-xs sm:text-[12.5px] text-[#291708] uppercase whitespace-nowrap drop-shadow-[0_1px_0px_rgba(255,255,255,0.45)]">
          {title}
        </span>

        {/* Dark Midnight Inset Count Pill */}
        <span className="shrink-0 px-2.5 sm:px-3 py-0.5 rounded-full bg-[#081528] text-[#F3E5D0] text-[11px] sm:text-[12px] font-mono font-bold border border-[#7D5B27]/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.85)]">
          {count}
        </span>
      </div>
    </div>
  );
}

/**
 * Solid heavy cast-brass horizontal drawer pull handle with circular rosette escutcheons
 * matching the nautical vintage campaign furniture drawer reference image.
 */
export function CastBrassDrawerHandle({ className = "w-52 h-8" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center select-none pointer-events-none drop-shadow-[0_6px_12px_rgba(0,0,0,0.92)] ${className}`}>
      <svg viewBox="0 0 240 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
          {/* Rosette brass radial gradient */}
          <radialGradient id="rosette-brass" cx="50%" cy="50%" r="50%" fx="35%" fy="35%">
            <stop offset="0%" stopColor="#FFF4DB" />
            <stop offset="35%" stopColor="#E5B55E" />
            <stop offset="70%" stopColor="#9C6B22" />
            <stop offset="100%" stopColor="#4A2F08" />
          </radialGradient>

          {/* Rosette outer rim bevel */}
          <linearGradient id="rosette-bevel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFF6DE" />
            <stop offset="50%" stopColor="#B37D28" />
            <stop offset="100%" stopColor="#2E1B04" />
          </linearGradient>

          {/* Handle bar horizontal brass metallic gradient */}
          <linearGradient id="handle-bar-brass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFF8E7" />
            <stop offset="15%" stopColor="#F5CE7B" />
            <stop offset="50%" stopColor="#C9943B" />
            <stop offset="85%" stopColor="#7E5215" />
            <stop offset="100%" stopColor="#301A03" />
          </linearGradient>

          {/* Curved elbow gradient left */}
          <linearGradient id="elbow-left" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8C5C1A" />
            <stop offset="50%" stopColor="#E2B157" />
            <stop offset="100%" stopColor="#FFF4DB" />
          </linearGradient>

          {/* Curved elbow gradient right */}
          <linearGradient id="elbow-right" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="#8C5C1A" />
            <stop offset="50%" stopColor="#E2B157" />
            <stop offset="100%" stopColor="#FFF4DB" />
          </linearGradient>
        </defs>

        {/* ── Left Circular Rosette Escutcheon ── */}
        <g id="left-rosette">
          <circle cx="28" cy="16" r="11" fill="#020814" opacity="0.6" />
          <circle cx="28" cy="16" r="10.5" fill="url(#rosette-bevel)" stroke="#382105" strokeWidth="0.8" />
          <circle cx="28" cy="16" r="8" fill="url(#rosette-brass)" stroke="#52340A" strokeWidth="0.6" />
          <circle cx="28" cy="16" r="5.5" stroke="#FFF7E0" strokeWidth="0.5" opacity="0.75" />
          {/* 4 rosette perimeter screw notches */}
          <circle cx="28" cy="8.5" r="0.9" fill="#241402" />
          <circle cx="28" cy="23.5" r="0.9" fill="#241402" />
          <circle cx="20.5" cy="16" r="0.9" fill="#241402" />
          <circle cx="35.5" cy="16" r="0.9" fill="#241402" />
          {/* Central post boss */}
          <circle cx="28" cy="16" r="3.8" fill="url(#rosette-bevel)" stroke="#2B1703" strokeWidth="0.7" />
        </g>

        {/* ── Right Circular Rosette Escutcheon ── */}
        <g id="right-rosette">
          <circle cx="212" cy="16" r="11" fill="#020814" opacity="0.6" />
          <circle cx="212" cy="16" r="10.5" fill="url(#rosette-bevel)" stroke="#382105" strokeWidth="0.8" />
          <circle cx="212" cy="16" r="8" fill="url(#rosette-brass)" stroke="#52340A" strokeWidth="0.6" />
          <circle cx="212" cy="16" r="5.5" stroke="#FFF7E0" strokeWidth="0.5" opacity="0.75" />
          {/* 4 rosette perimeter screw notches */}
          <circle cx="212" cy="8.5" r="0.9" fill="#241402" />
          <circle cx="212" cy="23.5" r="0.9" fill="#241402" />
          <circle cx="204.5" cy="16" r="0.9" fill="#241402" />
          <circle cx="219.5" cy="16" r="0.9" fill="#241402" />
          {/* Central post boss */}
          <circle cx="212" cy="16" r="3.8" fill="url(#rosette-bevel)" stroke="#2B1703" strokeWidth="0.7" />
        </g>

        {/* ── Connecting Stems / Curved Brackets ── */}
        <path d="M28 12.5 C36 12.5 42 11 50 11 L50 21 C42 21 36 19.5 28 19.5 Z" fill="url(#elbow-left)" stroke="#4A2F08" strokeWidth="0.8" />
        <path d="M212 12.5 C204 12.5 198 11 190 11 L190 21 C198 21 204 19.5 212 19.5 Z" fill="url(#elbow-right)" stroke="#4A2F08" strokeWidth="0.8" />

        {/* ── Main Horizontal Cast-Brass Bar ── */}
        <rect x="46" y="10.5" width="148" height="11" rx="4" fill="url(#handle-bar-brass)" stroke="#4A2F08" strokeWidth="1" />

        {/* Top Glint Highlight Line */}
        <line x1="50" y1="12" x2="190" y2="12" stroke="#FFFDF5" strokeWidth="1.2" strokeLinecap="round" opacity="0.95" />
        {/* Secondary Warm Glint */}
        <line x1="54" y1="13.2" x2="186" y2="13.2" stroke="#FFE7AF" strokeWidth="0.8" strokeLinecap="round" opacity="0.8" />

        {/* Bottom Underside Core Shadow */}
        <line x1="49" y1="19.8" x2="191" y2="19.8" stroke="#2B1602" strokeWidth="1.4" strokeLinecap="round" opacity="0.9" />
      </svg>
    </div>
  );
}


