/**
 * Waypoint Wavy Background & Brand Flourishes
 * Implements the maritime depth wave contour theme inspired by nautical navigation charts.
 */

import React from "react";

export function WaypointWaveIcon({ className = "w-7 h-4 text-amber-400" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Upper flowing wave */}
      <path
        d="M2 12C9 6 17 6 24 10C31 14 39 14 46 8"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Lower subtle echo wave */}
      <path
        d="M8 15C13 12 18 12 24 14C30 16 36 16 41 12"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeOpacity="0.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WaypointWavyBackdrop({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-[#051122] ${className}`}>
      {/* High-res Topographic Wave Image Texture Layer */}
      <div 
        className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-45 mix-blend-screen scale-105"
        style={{ backgroundImage: `url('/waypoint-wave-bg.jpg')` }}
      />

      {/* Dark Vignette & Gradient Overlay for Perfect Legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#061427]/85 via-[#040C1A]/75 to-[#030914]/90 pointer-events-none" />
      
      {/* Radial maritime glow highlights */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* SVG Nautical Wave Contours */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none select-none opacity-50"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 1440 900"
      >
        <defs>
          <linearGradient id="waveBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#60A5FA" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#1E40AF" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="waveGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F5B544" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#F5B544" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#D97706" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Top Wave Lines */}
        <path
          d="M-50,120 C250,40 500,180 800,90 C1100,0 1300,160 1500,80"
          fill="none"
          stroke="url(#waveBlueGrad)"
          strokeWidth="1.6"
        />
        <path
          d="M-50,170 C280,90 480,220 830,130 C1150,50 1280,200 1500,130"
          fill="none"
          stroke="url(#waveGoldGrad)"
          strokeWidth="1.2"
        />
        <path
          d="M-50,230 C320,150 450,280 860,180 C1180,90 1260,250 1500,180"
          fill="none"
          stroke="url(#waveBlueGrad)"
          strokeWidth="1"
          strokeOpacity="0.6"
        />

        {/* Mid Contour Lines */}
        <path
          d="M-50,420 C200,340 450,490 750,400 C1050,310 1250,470 1500,390"
          fill="none"
          stroke="url(#waveBlueGrad)"
          strokeWidth="1.4"
        />
        <path
          d="M-50,480 C240,400 480,540 800,450 C1100,360 1280,520 1500,440"
          fill="none"
          stroke="url(#waveGoldGrad)"
          strokeWidth="1.2"
          strokeDasharray="4 4"
        />
        <path
          d="M-50,540 C280,460 510,590 850,500 C1150,410 1310,570 1500,490"
          fill="none"
          stroke="url(#waveBlueGrad)"
          strokeWidth="1"
          strokeOpacity="0.7"
        />

        {/* Bottom Ocean Depth Lines */}
        <path
          d="M-50,720 C220,640 460,780 770,690 C1080,600 1280,750 1500,680"
          fill="none"
          stroke="url(#waveGoldGrad)"
          strokeWidth="1.5"
        />
        <path
          d="M-50,780 C260,700 490,830 820,740 C1120,650 1310,800 1500,730"
          fill="none"
          stroke="url(#waveBlueGrad)"
          strokeWidth="1.3"
        />
        <path
          d="M-50,840 C300,760 520,880 870,790 C1170,700 1340,850 1500,780"
          fill="none"
          stroke="url(#waveBlueGrad)"
          strokeWidth="1"
          strokeOpacity="0.5"
        />
      </svg>

      {/* Foreground Content */}
      <div className="relative z-10 w-full h-full flex flex-col">
        {children}
      </div>
    </div>
  );
}

export default WaypointWavyBackdrop;
