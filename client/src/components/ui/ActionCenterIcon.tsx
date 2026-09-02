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
      {/* Wavy Signature Line */}
      <path d="M2.5 21.5c1.4-2.5 2.8-2.5 4.2 0s2.8 2.5 4.2 0c1.8-1 2.7 1 2.7 1" />

      {/* Pen Body / Cap */}
      <path d="M17.2 4.2c.7-1.1 2-.7 2.8.8l.5 1.1c.8 1.4.2 2.5-.8 3l-5.2 10.5-2.8-1.4L17.2 4.2z" />

      {/* Pen Clip on Left Side of Cap */}
      <path d="M17.8 4.6l-1.8 3.5-.8 1.5" />

      {/* Middle Dividing Band */}
      <path d="M16.5 10.5l-2.8-1.4" />

      {/* Lower Grip Band */}
      <path d="M14.2 15l-2.8-1.4" />

      {/* Tapered Writing Cone to Scribble Line */}
      <path d="M11.4 17.6l2.2 4.9 1.9-3.5" />
    </svg>
  );
}

export default ActionCenterIcon;
