import React from "react";

export function VaultSafeIcon({ 
  className = "h-4 w-4", 
  size,
  ...props 
}: React.SVGProps<SVGSVGElement> & { size?: number | string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      {...props}
    >
      {/* Outer Safe Housing */}
      <rect x="2.5" y="2.5" width="19" height="17" rx="2" />
      
      {/* Left & Right Tapered Bottom Feet */}
      <path d="M5 19.5v2" />
      <path d="M19 19.5v2" />
      
      {/* Inner Door Panel */}
      <rect x="5.5" y="5" width="13" height="12" rx="1" />
      
      {/* Left Dual Hinges on Door */}
      <rect x="4.5" y="6.5" width="1.8" height="2.8" rx="0.6" />
      <rect x="4.5" y="12.5" width="1.8" height="2.8" rx="0.6" />
      
      {/* Center Safe Dial Wheel */}
      <circle cx="12" cy="11" r="3.75" />
      <circle cx="12" cy="11" r="1.75" />
      
      {/* Radial Combination Notches */}
      <path d="M12 7.25v0.9" />
      <path d="M12 13.85v0.9" />
      <path d="M8.25 11h0.9" />
      <path d="M14.85 11h0.9" />
      <path d="M9.35 8.35l0.65.65" />
      <path d="M14 13l0.65.65" />
      <path d="M14.65 8.35l-0.65.65" />
      <path d="M10 13l-0.65.65" />
    </svg>
  );
}

export default VaultSafeIcon;
