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
      {/* Outer Safe Strongbox Body */}
      <rect x="2.5" y="2.5" width="19" height="17" rx="2" />
      
      {/* Bottom Feet */}
      <path d="M5 19.5v2" />
      <path d="M19 19.5v2" />
      
      {/* Right Side Door Hinges */}
      <path d="M21.5 6.5v2" />
      <path d="M21.5 13.5v2" />
      
      {/* Center Safe Dial Wheel */}
      <circle cx="11.5" cy="10" r="3.75" />
      <circle cx="11.5" cy="10" r="1.25" />
      
      {/* Safe Dial Radial Notches */}
      <path d="M11.5 6.25v1.2" />
      <path d="M11.5 12.55v1.2" />
      <path d="M7.75 10h1.2" />
      <path d="M14.05 10h1.2" />
      
      {/* Keypad / Handle Slot */}
      <rect x="7" y="15.5" width="9" height="1.5" rx="0.5" />
    </svg>
  );
}

export default VaultSafeIcon;
