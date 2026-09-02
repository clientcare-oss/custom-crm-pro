import React from "react";

export function ActionCenterIcon({ 
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
      {/* Document with Top-Left Folded Dog-Ear Corner */}
      <path d="M8 2.5h8.5a2 2 0 0 1 2 2V8" />
      <path d="M18.5 13.5v5a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2V7.5L8 2.5" />
      <path d="M3.5 7.5H8V2.5" />
      
      {/* Horizontal Document Text Lines */}
      <path d="M7 10.5h5.5" />
      <path d="M7 13.5h4.5" />
      
      {/* Signature Squiggle Wave */}
      <path d="M6.5 18c.7-.6 1.4.6 2.1 0s1.4.6 2.1 0" />
      
      {/* Fountain Pen with Top Clip and Pointed Nib */}
      <path d="M20.5 6.5l-5.5 5.5-1.5-1.5 5.5-5.5a1 1 0 0 1 1.5 1.5z" />
      <path d="M21 8.5l-1.5 1.5" />
      <path d="M13.5 10.5l-2.5 4.5 4.5-2.5-2-2z" />
      <path d="M11 15l-.8.8" />
    </svg>
  );
}

export default ActionCenterIcon;
