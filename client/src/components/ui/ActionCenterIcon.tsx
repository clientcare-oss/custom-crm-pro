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
      {/* Flowing Cursive Loop Signature */}
      <path d="M2.5 19.5c1.8-6 3.5-9.5 5-9.5s.8 8.5 2.2 8.5c1.2 0 1.8-3.2 2.8-3.2s1.5 3.2 3.5 3.2" />
      
      {/* Pen Top Click Plunger */}
      <path d="M19.5 2.5l1.5 1.5" />
      
      {/* Pen Clip */}
      <path d="M20.5 5.5c1 .5 1.2 2 .4 3l-.9.9" />
      
      {/* Pen Barrel & Grip */}
      <path d="M20 4l-4 4-1.5-1.5 4-4a1 1 0 0 1 1.5 1.5z" />
      <path d="M14.5 6.5l-3 3 1.5 1.5 3-3" />
      
      {/* Pen Writing Cone & Tip Touching Signature */}
      <path d="M11.5 9.5l-3 7 7-3-4-4z" />
      <path d="M15 17.5l.5.5" />
    </svg>
  );
}

export default ActionCenterIcon;
