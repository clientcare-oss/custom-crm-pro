import { Check, Copy, Hash } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { resolvePageId, PAGE_IDS, broadcastPageId } from "@/lib/pageIdRegistry";
import { cn } from "@/lib/utils";

export interface PageIdBadgeProps {
  id?: string;
  name?: string;
  inline?: boolean;
  variant?: "floating" | "inline";
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function PageIdBadge({
  id: explicitId,
  name: explicitName,
  inline,
  variant,
  className,
}: PageIdBadgeProps = {}) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const autoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isInline = inline || variant === "inline" || (Boolean(explicitId) && variant !== "floating");

  // Dynamic active page state (supports sub-tabs like PG-038-MSG, PG-023-ACT, PG-023-VAULT, etc.)
  const [activePage, setActivePage] = useState(() => {
    if (explicitId) {
      return { id: explicitId, name: explicitName || PAGE_IDS[location]?.name || "Waypoint View" };
    }
    return resolvePageId(location);
  });

  // Re-resolve when location changes or explicit props change
  useEffect(() => {
    if (explicitId) {
      const pageInfo = { id: explicitId, name: explicitName || PAGE_IDS[location]?.name || "Waypoint View" };
      setActivePage(pageInfo);
      broadcastPageId(pageInfo);
    } else {
      setActivePage(resolvePageId(location));
    }
    setOpen(false);
    setCopied(false);
  }, [location, explicitId, explicitName]);

  // Listen for broadcasted page/tab sub-id changes (e.g. from ClientPortal or CrewQuarters tab switching)
  useEffect(() => {
    const handlePageIdChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.id && !explicitId) {
        setActivePage({
          id: customEvent.detail.id,
          name: customEvent.detail.name || "Waypoint View",
        });
      }
    };

    window.addEventListener("waypoint:page-id-change", handlePageIdChange);
    return () => window.removeEventListener("waypoint:page-id-change", handlePageIdChange);
  }, [explicitId]);

  const page = activePage;

  if (!page) return null;

  const handleCopy = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const text = `${page.id} · ${page.name}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      // Reset the auto-close timer so it doesn't close right after copy
      if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
      autoCloseTimer.current = setTimeout(() => setOpen(false), 4000);
      // Reset copied state after 2 seconds
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Inline Badge Mode (Rendered inside headers, tool consoles, and sub-pages) ──
  if (isInline) {
    return (
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? "Copied!" : `Copy Page ID (${page.id} · ${page.name})`}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold tracking-wider uppercase border transition-all duration-200 cursor-pointer select-none",
          copied
            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
            : "bg-sky-950/80 text-sky-300 border-sky-400/30 hover:bg-sky-900/80 hover:border-sky-400/60 hover:text-white shadow-xs",
          className
        )}
        aria-label={`Page ID ${page.id}`}
      >
        <Hash className="w-2.5 h-2.5 opacity-70 shrink-0" />
        <span>{page.id}</span>
        {copied ? (
          <Check className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
        ) : (
          <Copy className="w-2.5 h-2.5 opacity-40 hover:opacity-100 shrink-0" />
        )}
      </button>
    );
  }

  // ── Floating Corner Mode (Persistent global badge in bottom-left) ──
  return (
    <div className={cn("fixed bottom-4 left-4 z-50 flex items-center justify-start", className)}>
      {/* Trigger button — always visible, minimal in bottom-left */}
      <button
        onClick={() => setOpen(prev => !prev)}
        title={open ? "Hide page ID" : `Page ID: ${page.id}`}
        className={`
          flex h-7 w-7 items-center justify-center rounded-full
          border transition-all duration-200 cursor-pointer
          ${open
            ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
            : "border-border/50 bg-background/70 text-muted-foreground/50 hover:text-muted-foreground hover:border-border hover:bg-background/90 backdrop-blur-sm shadow-sm"
          }
        `}
        aria-label="Show page ID"
      >
        <Hash className="h-3.5 w-3.5" />
      </button>

      {/* Expanded pill */}
      <div
        className={`
          flex items-center gap-2 rounded-full border border-border/70
          bg-background/95 backdrop-blur-sm shadow-md
          overflow-hidden transition-all duration-300 ease-in-out
          ${open ? "max-w-[280px] opacity-100 pl-3 pr-1.5 py-1.5 ml-2" : "max-w-0 opacity-0 p-0 border-0 ml-0"}
        `}
      >
        {/* ID + name */}
        <span className="text-[11px] font-mono font-bold text-foreground whitespace-nowrap tracking-wide">
          {page.id}
        </span>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          · {page.name}
        </span>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          title={copied ? "Copied!" : "Copy page ID"}
          className={`
            flex h-6 w-6 shrink-0 items-center justify-center rounded-full
            transition-all duration-200 ml-0.5 cursor-pointer
            ${copied
              ? "bg-emerald-500/15 text-emerald-600"
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }
          `}
        >
          {copied
            ? <Check className="h-3 w-3" />
            : <Copy className="h-3 w-3" />
          }
        </button>
      </div>
    </div>
  );
}

// Registry exports are in pageIdRegistry.ts to keep Fast Refresh happy

