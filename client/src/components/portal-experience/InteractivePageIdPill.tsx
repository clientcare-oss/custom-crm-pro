import React, { useState } from "react";
import { Hash, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface InteractivePageIdPillProps {
  pageId: string;
  name?: string;
  size?: "sm" | "default" | "lg";
  className?: string;
  showName?: boolean;
}

export function InteractivePageIdPill({
  pageId,
  name,
  size = "default",
  className = "",
  showName = false
}: InteractivePageIdPillProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = name ? `${pageId} · ${name}` : pageId;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success(`Copied "${textToCopy}" to clipboard`);
    setTimeout(() => setCopied(false), 2000);
  };

  const isSmall = size === "sm";

  return (
    <div
      onClick={handleCopy}
      title={copied ? "Copied!" : `Click to copy: ${pageId}${name ? ` · ${name}` : ""}`}
      className={`
        inline-flex items-center gap-1.5 rounded-full border border-border/70 
        bg-background/90 hover:bg-muted/60 backdrop-blur-sm shadow-xs 
        transition-all duration-200 cursor-pointer select-none group
        ${isSmall ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"}
        ${copied ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600" : "text-foreground"}
        ${className}
      `}
    >
      <Hash className={`${isSmall ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} text-primary/70 group-hover:text-primary shrink-0`} />
      <span className="font-mono font-bold tracking-tight">
        {pageId}
      </span>

      {showName && name && (
        <span className="text-muted-foreground truncate max-w-[150px] font-normal border-l border-border/50 pl-1.5 ml-0.5">
          {name}
        </span>
      )}

      <span className="shrink-0 text-muted-foreground/60 group-hover:text-foreground transition-colors ml-0.5">
        {copied ? (
          <Check className={`${isSmall ? "h-2.5 w-2.5" : "h-3 w-3"} text-emerald-500`} />
        ) : (
          <Copy className={`${isSmall ? "h-2.5 w-2.5" : "h-3 w-3"} opacity-0 group-hover:opacity-100 transition-opacity`} />
        )}
      </span>
    </div>
  );
}
