import React from "react";

export function IvyGreeneryDecor({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none select-none z-10 ${className}`}>
      <svg
        viewBox="0 0 160 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-28 sm:w-36 lg:w-44 h-auto drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
      >
        {/* Main curved vine stem */}
        <path
          d="M 5 0 C 15 45, 10 90, 28 135 C 38 160, 48 185, 35 215"
          stroke="#2d4a22"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M 28 85 C 45 100, 65 110, 80 130"
          stroke="#385e2b"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M 18 40 C 35 50, 50 65, 60 85"
          stroke="#385e2b"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Realistic layered Ivy Leaves */}
        {/* Leaf 1 (Top Left) */}
        <g transform="translate(10, 15) rotate(-15)">
          <path
            d="M 0 0 C -12 10, -18 25, 0 35 C 18 25, 12 10, 0 0 Z"
            fill="#3f6e2f"
          />
          <path
            d="M 0 0 C -6 12, -9 22, 0 32 C 9 22, 6 12, 0 0 Z"
            fill="#4d8239"
          />
          <path d="M 0 3 L 0 30" stroke="#71a858" strokeWidth="0.8" opacity="0.7" />
        </g>

        {/* Leaf 2 */}
        <g transform="translate(30, 45) rotate(25)">
          <path
            d="M 0 0 C -15 12, -22 30, 0 42 C 22 30, 15 12, 0 0 Z"
            fill="#325a24"
          />
          <path
            d="M 0 0 C -8 15, -12 28, 0 38 C 12 28, 8 15, 0 0 Z"
            fill="#447533"
          />
          <path d="M 0 4 L 0 36" stroke="#68a14e" strokeWidth="0.9" opacity="0.6" />
        </g>

        {/* Leaf 3 */}
        <g transform="translate(5, 75) rotate(-35)">
          <path
            d="M 0 0 C -14 14, -20 32, 0 44 C 20 32, 14 14, 0 0 Z"
            fill="#3b682c"
          />
          <path
            d="M 0 0 C -7 16, -10 28, 0 40 C 10 28, 7 16, 0 0 Z"
            fill="#4e873b"
          />
          <path d="M 0 4 L 0 38" stroke="#7bb564" strokeWidth="0.8" opacity="0.7" />
        </g>

        {/* Leaf 4 */}
        <g transform="translate(52, 78) rotate(40)">
          <path
            d="M 0 0 C -12 10, -16 24, 0 32 C 16 24, 12 10, 0 0 Z"
            fill="#2c5220"
          />
          <path
            d="M 0 0 C -6 11, -8 20, 0 28 C 8 20, 6 11, 0 0 Z"
            fill="#3e6f2f"
          />
        </g>

        {/* Leaf 5 */}
        <g transform="translate(24, 115) rotate(-10)">
          <path
            d="M 0 0 C -16 14, -24 35, 0 48 C 24 35, 16 14, 0 0 Z"
            fill="#437732"
          />
          <path
            d="M 0 0 C -9 18, -13 32, 0 44 C 13 32, 9 18, 0 0 Z"
            fill="#559341"
          />
          <path d="M 0 5 L 0 42" stroke="#87c670" strokeWidth="0.9" opacity="0.6" />
        </g>

        {/* Leaf 6 */}
        <g transform="translate(68, 125) rotate(30)">
          <path
            d="M 0 0 C -11 9, -15 22, 0 30 C 15 22, 11 9, 0 0 Z"
            fill="#355e27"
          />
          <path
            d="M 0 0 C -6 10, -8 18, 0 26 C 8 18, 6 10, 0 0 Z"
            fill="#487e37"
          />
        </g>

        {/* Leaf 7 (Bottom trailing) */}
        <g transform="translate(32, 170) rotate(-20)">
          <path
            d="M 0 0 C -12 10, -18 26, 0 36 C 18 26, 12 10, 0 0 Z"
            fill="#3c6d2d"
          />
          <path
            d="M 0 0 C -6 12, -9 22, 0 32 C 9 22, 6 12, 0 0 Z"
            fill="#4c843b"
          />
        </g>
      </svg>
    </div>
  );
}

export function BrassCompassDecor({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none select-none z-10 ${className}`}>
      <svg
        viewBox="0 0 110 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-16 sm:w-20 lg:w-24 h-auto drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
      >
        {/* Leather top hanging loop & brass crown knob */}
        <path d="M 55 10 L 55 24" stroke="#5c3a21" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="55" cy="8" rx="8" ry="4" stroke="#d4af37" strokeWidth="2.5" fill="none" />
        <rect x="52" y="18" width="6" height="8" rx="1.5" fill="#c59b27" />

        {/* Outer Heavy Brass Casing with multi-bevel shadow */}
        <circle cx="55" cy="78" r="46" fill="#785918" />
        <circle cx="55" cy="78" r="44" fill="url(#brassGradient)" />
        <circle cx="55" cy="78" r="41" fill="#4d370d" />
        <circle cx="55" cy="78" r="39" fill="#1e232d" />

        {/* Compass Dial Inner Ring */}
        <circle cx="55" cy="78" r="36" fill="#141821" stroke="#a3822c" strokeWidth="1" />

        {/* Compass Cardinal Points */}
        <text x="55" y="52" textAnchor="middle" fill="#f59e0b" fontSize="8" fontWeight="bold" fontFamily="sans-serif">N</text>
        <text x="55" y="110" textAnchor="middle" fill="#d1d5db" fontSize="7" fontFamily="sans-serif">S</text>
        <text x="84" y="81" textAnchor="middle" fill="#d1d5db" fontSize="7" fontFamily="sans-serif">E</text>
        <text x="26" y="81" textAnchor="middle" fill="#d1d5db" fontSize="7" fontFamily="sans-serif">W</text>

        {/* Compass Rose Star */}
        <polygon points="55,54 58,74 55,78 52,74" fill="#ef4444" />
        <polygon points="55,54 55,78 52,74" fill="#dc2626" />
        <polygon points="55,102 58,82 55,78 52,82" fill="#cbd5e1" />
        <polygon points="55,102 55,78 58,82" fill="#94a3b8" />
        <polygon points="79,78 63,75 55,78 63,81" fill="#d4af37" />
        <polygon points="31,78 47,75 55,78 47,81" fill="#c59b27" />

        {/* Center Pivot Jewel */}
        <circle cx="55" cy="78" r="4" fill="#fbbf24" stroke="#78350f" strokeWidth="1" />
        <circle cx="54" cy="77" r="1.2" fill="#ffffff" opacity="0.8" />

        {/* Glass Glint Reflection Across Face */}
        <path
          d="M 24 64 C 36 44, 74 44, 86 64 C 74 54, 36 54, 24 64 Z"
          fill="#ffffff"
          opacity="0.18"
        />

        <defs>
          <linearGradient id="brassGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="30%" stopColor="#ca8a04" />
            <stop offset="70%" stopColor="#854d0e" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export function PencilCupDecor({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none select-none z-10 ${className}`}>
      <svg
        viewBox="0 0 90 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-16 sm:w-20 lg:w-22 h-auto drop-shadow-[0_12px_24px_rgba(0,0,0,0.65)]"
      >
        {/* Pens & Pencils sticking out */}
        {/* Yellow wooden pencil angled left */}
        <g transform="translate(26, 4) rotate(-14)">
          <rect x="0" y="10" width="6" height="55" rx="1" fill="#f59e0b" />
          <polygon points="0,10 3,0 6,10" fill="#fed7aa" />
          <polygon points="2,3 3,0 4,3" fill="#1e293b" />
          <rect x="0" y="55" width="6" height="6" fill="#cbd5e1" />
          <rect x="0" y="61" width="6" height="5" rx="1" fill="#f43f5e" />
        </g>

        {/* Executive Blue ink stylus angled right */}
        <g transform="translate(48, 6) rotate(16)">
          <rect x="0" y="0" width="7" height="65" rx="2" fill="#1e3a8a" />
          <rect x="1" y="2" width="5" height="15" fill="#2563eb" />
          <path d="M 6 12 L 10 14 L 6 35" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
          <rect x="0" y="58" width="7" height="4" fill="#94a3b8" />
        </g>

        {/* Black sharpie / marker upright */}
        <g transform="translate(38, 2) rotate(2)">
          <rect x="0" y="0" width="8" height="68" rx="2" fill="#0f172a" />
          <rect x="1" y="22" width="6" height="3" fill="#ffffff" opacity="0.7" />
          <rect x="0" y="0" width="8" height="20" rx="2" fill="#334155" />
        </g>

        {/* Heavy Matte Charcoal Ceramic Cup Container */}
        <path
          d="M 16 55 L 22 110 C 23 114, 26 116, 30 116 L 60 116 C 64 116, 67 114, 68 110 L 74 55 Z"
          fill="#181e29"
        />
        <ellipse cx="45" cy="55" rx="29" ry="6" fill="#283344" />
        <ellipse cx="45" cy="55" rx="27" ry="5" fill="#111620" />

        {/* Subtle highlights on ceramic cup */}
        <path
          d="M 24 60 L 28 108"
          stroke="#475569"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.4"
        />
      </svg>
    </div>
  );
}

export function BigIdeasSignDecor({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none select-none z-10 ${className}`}>
      <div className="relative transform rotate-3 rounded-lg border-2 border-[#5c4028] bg-gradient-to-br from-[#d4a373] via-[#bc8a5f] to-[#a47148] p-3 text-center shadow-[0_8px_20px_rgba(0,0,0,0.55)]">
        {/* Hanging twine loop */}
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-6 h-4 border-t-2 border-l-2 border-r-2 border-[#8c6239] rounded-t-full pointer-events-none" />
        {/* Metal eyelet screws */}
        <div className="absolute top-1 left-2 w-1.5 h-1.5 rounded-full bg-[#5c4028] shadow-inner" />
        <div className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-[#5c4028] shadow-inner" />

        <div className="border border-[#7f5539]/60 rounded px-2.5 py-1.5 bg-[#faedcd]/20">
          <div className="text-[11px] font-black uppercase tracking-widest text-[#462b17] font-serif leading-tight">
            BIG
          </div>
          <div className="text-sm font-black uppercase tracking-wider text-[#341d0e] font-serif leading-none mt-0.5">
            IDEAS
          </div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-[#5e381e] font-serif mt-0.5">
            HAPPEN
          </div>
          <div className="text-[10px] font-black uppercase tracking-wider text-[#341d0e] font-serif leading-none">
            HERE
          </div>
          <div className="text-[#8c2d19] text-xs mt-1 leading-none">♥</div>
        </div>
      </div>
    </div>
  );
}

export function PolaroidLighthouseDecor({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none select-none z-10 ${className}`}>
      <div className="relative transform -rotate-2 w-28 sm:w-32 bg-[#fafaf9] rounded shadow-[0_10px_25px_rgba(0,0,0,0.6)] p-2 pb-5 border border-neutral-300">
        {/* Red Pushpin pinned through top center */}
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <ellipse cx="12" cy="20" rx="3.5" ry="1.5" fill="rgba(0,0,0,0.4)" />
            <circle cx="12" cy="8" r="5" fill="#dc2626" />
            <ellipse cx="10.8" cy="6.5" rx="1.6" ry="1" fill="#fca5a5" />
          </svg>
        </div>

        {/* Sunset Lighthouse Artwork Container */}
        <div className="w-full h-24 rounded overflow-hidden bg-gradient-to-b from-[#ea580c] via-[#f59e0b] to-[#1e3a8a] relative">
          {/* Golden sun */}
          <div className="absolute bottom-6 left-6 w-7 h-7 rounded-full bg-[#fef08a] blur-[1px] shadow-[0_0_12px_#fde047]" />
          {/* Ocean Water */}
          <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-[#0284c7] to-[#0369a1] opacity-90" />
          {/* Rocky shoreline */}
          <path d="M 0 24 L 20 18 L 40 24 Z" fill="#0f172a" />
          {/* Lighthouse Silhouette */}
          <div className="absolute bottom-4 right-5 w-4 h-14 flex flex-col items-center">
            {/* Lantern room & beacon */}
            <div className="w-2.5 h-3 bg-[#fef08a] rounded-t-sm shadow-[0_0_8px_#fde047] flex items-center justify-center">
              <div className="w-1 h-1 bg-[#ffffff]" />
            </div>
            {/* Tower */}
            <div className="w-3.5 h-10 bg-[#f1f5f9] clip-path-polygon border-r border-[#cbd5e1] flex flex-col justify-around py-1">
              <div className="w-full h-1.5 bg-[#dc2626]" />
              <div className="w-full h-1.5 bg-[#dc2626]" />
            </div>
            {/* Rocky base */}
            <div className="w-6 h-2 bg-[#1e293b] rounded-t-sm -mt-0.5" />
          </div>
        </div>

        <div className="text-center mt-1 text-[8px] font-medium tracking-wide text-neutral-500 font-mono">
          Guided Horizons
        </div>
      </div>
    </div>
  );
}
