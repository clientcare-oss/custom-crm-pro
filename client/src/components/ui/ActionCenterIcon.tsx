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
      {/* Document Sheet */}
      <path d="M3.5 2.5h14a1.5 1.5 0 0 1 1.5 1.5v3" />
      <path d="M19 12.5V20a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 3 20V4a1.5 1.5 0 0 1 1.5-1.5" />
      
      {/* Official Notary Seal in Top-Right */}
      <circle cx="14.5" cy="6.5" r="2.2" />
      <circle cx="14.5" cy="6.5" r="1.1" />
      
      {/* Document Content Lines */}
      <path d="M6.5 7h4.5" />
      <path d="M6.5 10h6" />
      <path d="M6.5 13h5" />
      
      {/* Bottom Signature Line */}
      <path d="M6 19.5h7.5" />
      
      {/* Signature Cursive Loop */}
      <path d="M6 19c1.2-2.2 2.4.4 3.4-.6" />
      
      {/* Diagonal Fountain Pen with Nib and Clip */}
      <path d="M20.5 5.5l-5.5 5.5-1.5-1.5 5.5-5.5a1 1 0 0 1 1.5 1.5z" />
      <path d="M21 7.5l-1.5 1.5" />
      <path d="M13.5 9.5l-2.5 4.5 4.5-2.5-2-2z" />
      <path d="M11 14l-1 1" />
    </svg>
  );
}

export default ActionCenterIcon;
