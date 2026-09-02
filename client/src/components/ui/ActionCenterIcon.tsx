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
      {/* Background Layered Sheet */}
      <path d="M3.5 18V4.5A1.5 1.5 0 0 1 5 3h8" />
      
      {/* Main Foreground Document with Folded Corner */}
      <path d="M6.5 21h9a1.5 1.5 0 0 0 1.5-1.5V7.5L13.5 3.5H8A1.5 1.5 0 0 0 6.5 5v16z" />
      <path d="M13.5 3.5v4h3.5" />
      
      {/* Document Text Lines */}
      <path d="M9 7.5h3.5" />
      <path d="M9 10.5h5" />
      <path d="M9 13.5h4" />
      
      {/* Signature Squiggle */}
      <path d="M9 17c.7-.4 1.4.4 2.1 0" />
      
      {/* Signature Action Pen */}
      <path d="M15 19.5l4-4a1 1 0 0 1 1.4 1.4l-4 4-1.8.4.4-1.8z" />
    </svg>
  );
}

export default ActionCenterIcon;
