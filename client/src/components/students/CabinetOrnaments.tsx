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
 * Antique Brass Nameplate with 4 authentic corner rivets, icon, title, and dark pill badge
 */
interface AntiqueBrassNameplateProps {
  icon: React.ElementType;
  title: string;
  count: number | string;
  className?: string;
}

export function AntiqueBrassNameplate({
  icon: IconComponent,
  title,
  count,
  className = "",
}: AntiqueBrassNameplateProps) {
  return (
    <div
      className={`relative inline-flex items-center gap-3 px-6 py-2 rounded-lg border border-[#B88943] bg-gradient-to-b from-[#FCE09E] via-[#D8A452] to-[#8C6225] shadow-[0_4px_14px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.85)] select-none ${className}`}
    >
      {/* 4 corner brass slotted screw rivets positioned precisely at the 4 corners */}
      <div className="absolute top-1 left-1.5 pointer-events-none">
        <BrassScrewRivet className="w-2.5 h-2.5" />
      </div>
      <div className="absolute top-1 right-1.5 pointer-events-none">
        <BrassScrewRivet className="w-2.5 h-2.5" />
      </div>
      <div className="absolute bottom-1 left-1.5 pointer-events-none">
        <BrassScrewRivet className="w-2.5 h-2.5" />
      </div>
      <div className="absolute bottom-1 right-1.5 pointer-events-none">
        <BrassScrewRivet className="w-2.5 h-2.5" />
      </div>

      {/* Plate Content */}
      <div className="flex items-center gap-2.5 px-1">
        <IconComponent className="w-4.5 h-4.5 text-[#1A1208] fill-[#1A1208]/20 stroke-[2.4]" />
        <span className="font-serif font-black tracking-wider text-xs sm:text-[13px] text-[#1A1208] uppercase">
          {title}
        </span>
        {/* Dark inset record count pill badge */}
        <span className="px-3 py-0.5 rounded-full bg-[#050D1A] text-[#FCE09E] text-xs font-mono font-bold border border-[#B88943]/60 shadow-inner">
          {count}
        </span>
      </div>
    </div>
  );
}

/**
 * Solid heavy cast-brass horizontal drawer pull handle matching reference image
 */
export function CastBrassDrawerHandle({ className = "w-48 h-6" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className} drop-shadow-[0_8px_16px_rgba(0,0,0,0.95)]`}>
      <svg viewBox="0 0 220 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Left mounting plate with 2 brass screws */}
        <rect x="12" y="2" width="18" height="24" rx="3" fill="url(#h-plate)" stroke="#4A310A" strokeWidth="1.2" />
        <circle cx="21" cy="7" r="2.2" fill="#241604" />
        <circle cx="21" cy="21" r="2.2" fill="#241604" />

        {/* Right mounting plate with 2 brass screws */}
        <rect x="190" y="2" width="18" height="24" rx="3" fill="url(#h-plate)" stroke="#4A310A" strokeWidth="1.2" />
        <circle cx="199" cy="7" r="2.2" fill="#241604" />
        <circle cx="199" cy="21" r="2.2" fill="#241604" />

        {/* Left connecting bracket post */}
        <path d="M28 8L44 11V17L28 20V8Z" fill="url(#h-post)" stroke="#382508" strokeWidth="1" />
        {/* Right connecting bracket post */}
        <path d="M192 8L176 11V17L192 20V8Z" fill="url(#h-post)" stroke="#382508" strokeWidth="1" />

        {/* Solid heavy horizontal grip bar */}
        <rect x="40" y="8" width="140" height="12" rx="5" fill="url(#h-bar)" stroke="#4A310A" strokeWidth="1.2" />
        {/* Upper metallic glint highlight */}
        <line x1="44" y1="10.5" x2="176" y2="10.5" stroke="#FFF7E6" strokeWidth="1.5" strokeLinecap="round" opacity="0.95" />
        {/* Lower shadow reflection line */}
        <line x1="44" y1="17.5" x2="176" y2="17.5" stroke="#2B1B04" strokeWidth="1.5" strokeLinecap="round" opacity="0.95" />

        <defs>
          <linearGradient id="h-plate" x1="12" y1="2" x2="30" y2="26" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFF2D6" />
            <stop offset="0.3" stopColor="#E9BA6B" />
            <stop offset="0.8" stopColor="#B88943" />
            <stop offset="1" stopColor="#5E3F0F" />
          </linearGradient>
          <linearGradient id="h-post" x1="28" y1="8" x2="44" y2="20" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FCE09E" />
            <stop offset="0.5" stopColor="#B88943" />
            <stop offset="1" stopColor="#4A310A" />
          </linearGradient>
          <linearGradient id="h-bar" x1="40" y1="8" x2="40" y2="20" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFF2D6" />
            <stop offset="0.25" stopColor="#F7D287" />
            <stop offset="0.6" stopColor="#B88943" />
            <stop offset="0.9" stopColor="#7E551B" />
            <stop offset="1" stopColor="#3E2606" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

