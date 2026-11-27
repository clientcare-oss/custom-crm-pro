import React from "react";

/**
 * Engraved dark-sepia Lighthouse with Graduation Cap & Coastal Waves
 * Styled to match the Waypoint Advocates antique parchment login plaque.
 */
export function EngravedLighthouseMark({ className = "w-20 h-14" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 112"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Distant coastal hills & stylized ink waves behind base */}
      <path
        d="M14 96C30 92 42 84 54 79C62 76 68 78 74 82"
        stroke="#1C140D"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M166 96C150 92 138 84 126 79C118 76 112 78 106 82"
        stroke="#1C140D"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Left & right headland ridge fill lines */}
      <path
        d="M28 96C40 89 52 84 65 86L66 96H28Z"
        fill="#1C140D"
        fillOpacity="0.16"
      />
      <path
        d="M152 96C140 89 128 84 115 86L114 96H152Z"
        fill="#1C140D"
        fillOpacity="0.16"
      />

      {/* Base wave curls */}
      <path
        d="M10 101C22 97 34 97 46 101C58 105 70 105 82 101C94 97 106 97 118 101C130 105 142 105 154 101C160 99 166 99 170 101"
        stroke="#1C140D"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M26 107C38 104 49 104 60 107C72 110 84 110 96 107C108 104 120 104 132 107C142 109 150 109 156 107"
        stroke="#1C140D"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.72"
      />

      {/* Subtle light-beam etchings radiating left/right from lantern room */}
      <path d="M71 39L44 33" stroke="#1C140D" strokeWidth="1.15" strokeLinecap="round" strokeOpacity="0.45" />
      <path d="M71 43L48 44" stroke="#1C140D" strokeWidth="1.15" strokeLinecap="round" strokeOpacity="0.4" />
      <path d="M109 39L136 33" stroke="#1C140D" strokeWidth="1.15" strokeLinecap="round" strokeOpacity="0.45" />
      <path d="M109 43L132 44" stroke="#1C140D" strokeWidth="1.15" strokeLinecap="round" strokeOpacity="0.4" />

      {/* Lighthouse tapered masonry body (parchment-tinted fill with dark ink outline) */}
      <path
        d="M74 49H106L114 98H66L74 49Z"
        fill="#E9D5B0"
        fillOpacity="0.55"
        stroke="#1C140D"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />

      {/* Diagonal / horizontal engraving stripes on lighthouse body */}
      <path d="M72.6 58H107.4L109 67H71L72.6 58Z" fill="#1C140D" />
      <path d="M69.6 76H110.4L112 85H68L69.6 76Z" fill="#1C140D" />

      {/* Right-side woodcut vertical shading strokes on tower */}
      <path d="M99 50L104 97" stroke="#1C140D" strokeWidth="1.1" strokeOpacity="0.35" />
      <path d="M103 50L109 97" stroke="#1C140D" strokeWidth="1.4" strokeOpacity="0.48" />

      {/* Arched doorway & tiny window */}
      <path
        d="M84.5 98V87.5C84.5 84.5 87 82 90 82C93 82 95.5 84.5 95.5 87.5V98H84.5Z"
        fill="#1C140D"
      />
      <rect x="87.5" y="69" width="5" height="6" rx="1.5" fill="#EBD7B2" stroke="#1C140D" strokeWidth="1.5" />

      {/* Gallery deck rail & corbel */}
      <rect x="69" y="45.5" width="42" height="4.2" rx="1.5" fill="#1C140D" />
      <path d="M72 45.5V41M79 45.5V41M90 45.5V41M101 45.5V41M108 45.5V41" stroke="#1C140D" strokeWidth="1.4" />
      <line x1="70" y1="41" x2="110" y2="41" stroke="#1C140D" strokeWidth="1.8" strokeLinecap="round" />

      {/* Lantern glass room */}
      <rect
        x="76.5"
        y="30"
        width="27"
        height="15.5"
        fill="#F6E6C3"
        fillOpacity="0.65"
        stroke="#1C140D"
        strokeWidth="2.4"
      />
      <line x1="85.5" y1="30" x2="85.5" y2="45.5" stroke="#1C140D" strokeWidth="1.8" />
      <line x1="94.5" y1="30" x2="94.5" y2="45.5" stroke="#1C140D" strokeWidth="1.8" />
      {/* Inner Fresnel lamp glow dot */}
      <circle cx="90" cy="37.5" r="2.6" fill="#1C140D" />

      {/* Graduation Cap (Mortarboard) perched atop lantern room */}
      {/* Skullcap base */}
      <path
        d="M75.5 29.5L78 22H102L104.5 29.5H75.5Z"
        fill="#1C140D"
      />
      {/* Diamond mortarboard top */}
      <path
        d="M90 8L121 19L90 29L59 19L90 8Z"
        fill="#1C140D"
        stroke="#1C140D"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Crisp highlight line along mortarboard rim */}
      <path
        d="M64 19L90 10.8L116 19"
        stroke="#EAD5AD"
        strokeWidth="1"
        strokeOpacity="0.55"
      />
      {/* Tassel cord & fringed tassel hanging down left side */}
      <path
        d="M90 18.5L65.5 22.5V37.5"
        stroke="#1C140D"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="90" cy="18.5" r="2" fill="#EBD7B2" />
      <path
        d="M65.5 36.5L62.2 44.5H68.8L65.5 36.5Z"
        fill="#1C140D"
      />
    </svg>
  );
}

/**
 * Vintage Engraved 8-Point Nautical Compass Rose Divider
 */
export function EngravedCompassDivider({ className = "w-full" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`} aria-hidden="true">
      <div
        className="h-[1px] flex-1"
        style={{
          background:
            "linear-gradient(90deg, rgba(46,32,18,0.12) 0%, rgba(46,32,18,0.68) 45%, rgba(46,32,18,0.85) 100%)",
        }}
      />
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-7 h-7 shrink-0"
      >
        <circle cx="24" cy="24" r="11.5" stroke="#241910" strokeWidth="1.15" strokeOpacity="0.72" />
        <circle cx="24" cy="24" r="8.5" stroke="#241910" strokeWidth="0.75" strokeDasharray="1.8 1.8" strokeOpacity="0.65" />
        {/* Secondary diagonal points */}
        <path d="M24 24L13.5 13.5L21 19.5Z" fill="#241910" />
        <path d="M24 24L13.5 13.5L19.5 21Z" stroke="#241910" strokeWidth="0.9" fill="#E6D0A7" fillOpacity="0.45" />
        <path d="M24 24L34.5 13.5L28.5 21Z" fill="#241910" />
        <path d="M24 24L34.5 13.5L27 19.5Z" stroke="#241910" strokeWidth="0.9" fill="#E6D0A7" fillOpacity="0.45" />
        <path d="M24 24L34.5 34.5L27 28.5Z" fill="#241910" />
        <path d="M24 24L34.5 34.5L28.5 27Z" stroke="#241910" strokeWidth="0.9" fill="#E6D0A7" fillOpacity="0.45" />
        <path d="M24 24L13.5 34.5L19.5 27Z" fill="#241910" />
        <path d="M24 24L13.5 34.5L21 28.5Z" stroke="#241910" strokeWidth="0.9" fill="#E6D0A7" fillOpacity="0.45" />
        {/* Cardinal North/South/East/West star points (split light/dark woodcut style) */}
        {/* North */}
        <path d="M24 3L27.5 20.5L24 24Z" fill="#1C130C" />
        <path d="M24 3L20.5 20.5L24 24Z" fill="#EBD7B1" fillOpacity="0.6" stroke="#1C130C" strokeWidth="1" />
        {/* South */}
        <path d="M24 45L20.5 27.5L24 24Z" fill="#1C130C" />
        <path d="M24 45L27.5 27.5L24 24Z" fill="#EBD7B1" fillOpacity="0.6" stroke="#1C130C" strokeWidth="1" />
        {/* East */}
        <path d="M45 24L27.5 27.5L24 24Z" fill="#1C130C" />
        <path d="M45 24L27.5 20.5L24 24Z" fill="#EBD7B1" fillOpacity="0.6" stroke="#1C130C" strokeWidth="1" />
        {/* West */}
        <path d="M3 24L20.5 20.5L24 24Z" fill="#1C130C" />
        <path d="M3 24L20.5 27.5L24 24Z" fill="#EBD7B1" fillOpacity="0.6" stroke="#1C130C" strokeWidth="1" />
        {/* Center jewel */}
        <circle cx="24" cy="24" r="2.2" fill="#EBD7B1" stroke="#1C130C" strokeWidth="1.2" />
      </svg>
      <div
        className="h-[1px] flex-1"
        style={{
          background:
            "linear-gradient(90deg, rgba(46,32,18,0.85) 0%, rgba(46,32,18,0.68) 55%, rgba(46,32,18,0.12) 100%)",
        }}
      />
    </div>
  );
}

/**
 * Vintage Steel-Engraved Suspension Bridge Footer Emblem
 */
export function EngravedSuspensionBridge({ className = "w-56 h-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 360 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Distant horizon hills */}
      <path
        d="M8 54C36 48 64 46 96 51C124 55 154 57 180 57C206 57 236 55 264 51C296 46 324 48 352 54"
        stroke="#2B1E12"
        strokeWidth="1.2"
        strokeOpacity="0.55"
        strokeLinecap="round"
      />
      {/* Bridge arched roadway deck & under-truss */}
      <path
        d="M28 53C96 36 264 36 332 53"
        stroke="#22170D"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M36 55.5C102 40 258 40 324 55.5"
        stroke="#22170D"
        strokeWidth="1.2"
        strokeOpacity="0.78"
        strokeLinecap="round"
      />
      {/* Under-deck arch truss struts */}
      <path
        d="M66 49V53M84 46.5V51M102 44.5V49.5M120 43V47.5M144 41.5V46M162 41V45.5M180 40.8V45.2M198 41V45.5M216 41.5V46M240 43V47.5M258 44.5V49.5M276 46.5V51M294 49V53"
        stroke="#22170D"
        strokeWidth="1"
        strokeOpacity="0.65"
      />

      {/* Left Suspension Tower */}
      <g stroke="#1E140B" strokeLinecap="round" strokeLinejoin="round">
        <path d="M126 54L130 14H136L140 54" strokeWidth="1.9" fill="#E8D3AC" fillOpacity="0.42" />
        <line x1="128.5" y1="22" x2="137.5" y2="22" strokeWidth="1.5" />
        <line x1="128" y1="30" x2="138" y2="30" strokeWidth="1.5" />
        <line x1="127.5" y1="38" x2="138.5" y2="38" strokeWidth="1.5" />
        <path d="M129 14L133 9L137 14" strokeWidth="1.4" />
        <path d="M128.5 22L137.5 30M137.5 22L128.5 30" strokeWidth="0.9" strokeOpacity="0.7" />
        <path d="M128 30L138 38M138 30L128 38" strokeWidth="0.9" strokeOpacity="0.7" />
      </g>

      {/* Right Suspension Tower */}
      <g stroke="#1E140B" strokeLinecap="round" strokeLinejoin="round">
        <path d="M220 54L224 14H230L234 54" strokeWidth="1.9" fill="#E8D3AC" fillOpacity="0.42" />
        <line x1="222.5" y1="22" x2="231.5" y2="22" strokeWidth="1.5" />
        <line x1="222" y1="30" x2="232" y2="30" strokeWidth="1.5" />
        <line x1="221.5" y1="38" x2="232.5" y2="38" strokeWidth="1.5" />
        <path d="M223 14L227 9L231 14" strokeWidth="1.4" />
        <path d="M222.5 22L231.5 30M231.5 22L222.5 30" strokeWidth="0.9" strokeOpacity="0.7" />
        <path d="M222 30L232 38M232 30L222 38" strokeWidth="0.9" strokeOpacity="0.7" />
      </g>

      {/* Sweeping Main Catenary Cables */}
      <path
        d="M36 53C74 44 106 31 133 13C157 38 203 38 227 13C254 31 286 44 324 53"
        stroke="#1E140B"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M44 52C79 44 108 32 133 16C157 40 203 40 227 16C252 32 281 44 316 52"
        stroke="#1E140B"
        strokeWidth="0.85"
        strokeOpacity="0.55"
      />

      {/* Vertical Suspender Cables */}
      <path
        d="M74 46V50M86 42V48M98 37V46M110 31V44M120 24V43M147 26V42M158 32V41.5M169 35V41M180 36V40.8M191 35V41M202 32V41.5M213 26V42M240 24V43M250 31V44M262 37V46M274 42V48M286 46V50"
        stroke="#22170D"
        strokeWidth="0.85"
        strokeOpacity="0.72"
      />

      {/* Subtle shoreline water ripples below bridge */}
      <path
        d="M96 58H264M132 61.5H228"
        stroke="#2B1E12"
        strokeWidth="0.9"
        strokeOpacity="0.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Monochrome dark-sepia ink OAuth provider glyphs matching the embossed parchment buttons */
export function GoogleInkIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M21.35 11.1H12v3.7h5.35c-.45 2.3-2.45 3.8-5.35 3.8a6.2 6.2 0 1 1 0-12.4c1.65 0 3.05.6 4.1 1.6l2.75-2.75A9.92 9.92 0 0 0 12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c5.75 0 9.6-4.05 9.6-9.75 0-.65-.08-1.15-.25-1.15Z" />
    </svg>
  );
}

export function AppleInkIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43Zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45Z" />
    </svg>
  );
}

export function MicrosoftInkIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 22 22" fill="currentColor" className={className} aria-hidden="true">
      <rect x="1" y="1" width="9.2" height="9.2" rx="0.6" />
      <rect x="11.8" y="1" width="9.2" height="9.2" rx="0.6" />
      <rect x="1" y="11.8" width="9.2" height="9.2" rx="0.6" />
      <rect x="11.8" y="11.8" width="9.2" height="9.2" rx="0.6" />
    </svg>
  );
}

/**
 * Ornate Notched-Corner Navy Calfskin Leather & Double-Brass Frame Button
 * Faithfully reproduces the stepped-notch antique brass nameplate "Log In" button.
 */
interface OrnateLeatherButtonProps {
  type?: "submit" | "button";
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export function OrnateLeatherButton({
  type = "submit",
  disabled = false,
  onClick,
  children,
}: OrnateLeatherButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="wp-login-leather-btn group relative w-full h-[54px] select-none focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {/* Photorealistic SVG stepped-notch beveled brass frame + fine navy calfskin interior */}
      <svg
        viewBox="0 0 420 60"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none wp-login-leather-btn-svg"
        aria-hidden="true"
      >
        <defs>
          {/* Burnished antique brass gradient */}
          <linearGradient id="wpBtnBrassOuter" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F5DC98" />
            <stop offset="22%" stopColor="#D6AE5E" />
            <stop offset="55%" stopColor="#9A722A" />
            <stop offset="82%" stopColor="#CFA552" />
            <stop offset="100%" stopColor="#5D4013" />
          </linearGradient>
          <linearGradient id="wpBtnBrassInner" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E6C77A" />
            <stop offset="50%" stopColor="#A67E32" />
            <stop offset="100%" stopColor="#F0D284" />
          </linearGradient>
          {/* Deep rich midnight navy calfskin lighting gradient */}
          <radialGradient id="wpBtnNavyFill" cx="50%" cy="22%" r="78%">
            <stop offset="0%" stopColor="#0E223D" />
            <stop offset="48%" stopColor="#071528" />
            <stop offset="100%" stopColor="#030913" />
          </radialGradient>
          {/* Subtle top specular leather sheen */}
          <linearGradient id="wpBtnSheen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.16" />
            <stop offset="32%" stopColor="#FFFFFF" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.28" />
          </linearGradient>
          {/* Pebbled calfskin leather image fill */}
          <pattern id="wpBtnLeatherTex" patternUnits="userSpaceOnUse" width="160" height="160">
            <image
              href="/assets/pos/navy-leather-pebble.png"
              x="0"
              y="0"
              width="160"
              height="160"
              preserveAspectRatio="xMidYMid slice"
            />
          </pattern>
        </defs>

        {/* Outer stepped-notch brass rim */}
        <path
          d="M 12 3 H 408 L 410 7.5 L 416.5 11.5 V 48.5 L 410 52.5 L 408 57 H 12 L 10 52.5 L 3.5 48.5 V 11.5 L 10 7.5 Z"
          fill="url(#wpBtnBrassOuter)"
          stroke="#462F0E"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* Dark recessed bevel groove */}
        <path
          d="M 14.5 6.2 H 405.5 L 407.5 10.2 L 413 13.8 V 46.2 L 407.5 49.8 L 405.5 53.8 H 14.5 L 12.5 49.8 L 7 46.2 V 13.8 L 12.5 10.2 Z"
          fill="#060F1E"
        />

        {/* Navy calfskin leather interior */}
        <path
          d="M 15.5 7.4 H 404.5 L 406.4 11.2 L 411.8 14.6 V 45.4 L 406.4 48.8 L 404.5 52.6 H 15.5 L 13.6 48.8 L 8.2 45.4 V 14.6 L 13.6 11.2 Z"
          fill="url(#wpBtnNavyFill)"
        />
        <path
          d="M 15.5 7.4 H 404.5 L 406.4 11.2 L 411.8 14.6 V 45.4 L 406.4 48.8 L 404.5 52.6 H 15.5 L 13.6 48.8 L 8.2 45.4 V 14.6 L 13.6 11.2 Z"
          fill="url(#wpBtnLeatherTex)"
          opacity="0.42"
        />
        <path
          d="M 15.5 7.4 H 404.5 L 406.4 11.2 L 411.8 14.6 V 45.4 L 406.4 48.8 L 404.5 52.6 H 15.5 L 13.6 48.8 L 8.2 45.4 V 14.6 L 13.6 11.2 Z"
          fill="url(#wpBtnSheen)"
        />

        {/* Crisp inner antique gold hairline */}
        <path
          d="M 17 9.4 H 403 L 404.6 12.6 L 409.5 15.8 V 44.2 L 404.6 47.4 L 403 50.6 H 17 L 15.4 47.4 L 10.5 44.2 V 15.8 L 15.4 12.6 Z"
          fill="none"
          stroke="url(#wpBtnBrassInner)"
          strokeWidth="1.05"
          strokeOpacity="0.88"
        />
      </svg>

      {/* Cream-Gold Serif Label */}
      <span className="relative z-10 flex items-center justify-center gap-2 font-serif font-semibold text-[19px] tracking-[0.02em] text-[#F5E0AC] drop-shadow-[0_1px_2px_rgba(0,0,0,0.92)] group-hover:text-[#FFF0C8] transition-colors">
        {children}
      </span>
    </button>
  );
}
