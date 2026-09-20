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
    return resolvePageId(location, typeof window !== "undefined" ? window.location.search : "");
  });

  // Re-resolve when location changes or explicit props change
  useEffect(() => {
    if (explicitId) {
      const pageInfo = { id: explicitId, name: explicitName || PAGE_IDS[location]?.name || "Waypoint View" };
      setActivePage(pageInfo);
      broadcastPageId(pageInfo);
    } else {
      setActivePage(resolvePageId(location, typeof window !== "undefined" ? window.location.search : ""));
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

  // If explicitId or inline is specified, this is a local declaration on a page/subpage.
  // It registers/broadcasts the ID to the global widget at the bottom right and renders NOTHING in the header.
  if (isInline || Boolean(explicitId)) {
    return null;
  }

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

  // ── Global Floating Corner Mode (Subtle Petite Frosted Glass Orb at bottom right) ──
  return (
    <aside
      aria-label="Waypoint Page ID Utility"
      className={cn("fixed bottom-2.5 right-2.5 z-50 flex items-center flex-row-reverse select-none", className)}
    >
      {/* Trigger button — petite translucent frosted glass orb with white # */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        title={open ? "Hide Page ID" : `Page ID: ${page.id} · ${page.name} (Click to toggle)`}
        className={`
          group relative flex h-6 w-6 sm:h-6.5 sm:w-6.5 items-center justify-center rounded-full
          cursor-pointer select-none transition-all duration-300 backdrop-blur-md
          ${open
            ? "opacity-100 bg-white/[0.20] border border-white/60 shadow-[0_0_12px_rgba(255,255,255,0.35),0_4px_12px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.6)] scale-105"
            : "opacity-35 hover:opacity-100 bg-white/[0.05] hover:bg-white/[0.16] border border-white/20 hover:border-white/50 shadow-[0_2px_8px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95"
          }
        `}
        aria-label="Toggle Page ID"
      >
        {/* Top subtle glass specular reflection crescent */}
        <span className="absolute top-0.5 inset-x-1 h-1.5 rounded-t-full bg-gradient-to-b from-white/35 to-transparent pointer-events-none" />

        {/* Crisp luminous white # icon */}
        <Hash className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white/70 group-hover:text-white drop-shadow-[0_0_2px_rgba(255,255,255,0.8)] relative z-10 transition-transform duration-200 group-hover:scale-110" />

        {/* Soft bottom ambient glow */}
        <span className="absolute -bottom-0.5 inset-x-1 h-1 bg-white/15 rounded-full blur-[1px] pointer-events-none" />
      </button>

      {/* Expanded pill (slides smoothly to the left in refined frosted dark glass) */}
      <div
        className={`
          flex items-center gap-1.5 rounded-full border border-white/20
          bg-slate-950/70 backdrop-blur-xl
          shadow-[0_6px_24px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.25)]
          overflow-hidden transition-all duration-300 ease-in-out select-none
          ${open ? "max-w-[340px] opacity-100 pl-2.5 pr-1 py-0.5 mr-1.5" : "max-w-0 opacity-0 p-0 border-0 mr-0 pointer-events-none"}
        `}
      >
        {/* Page ID Code in frosted glass capsule */}
        <span className="text-[10px] font-mono font-bold text-white whitespace-nowrap tracking-wide bg-white/10 px-1.5 py-0.5 rounded-full border border-white/20 shadow-inner">
          {page.id}
        </span>

        {/* Page Name */}
        <span className="text-[10.5px] font-medium text-slate-100/90 whitespace-nowrap truncate max-w-[150px] sm:max-w-[180px]" title={page.name}>
          {page.name}
        </span>

        {/* Copy Button */}
        <button
          type="button"
          onClick={handleCopy}
          title={copied ? "Copied!" : `Copy "${page.id} · ${page.name}"`}
          className={`
            flex h-5 w-5 shrink-0 items-center justify-center rounded-full
            transition-all duration-200 ml-0.5 cursor-pointer
            ${copied
              ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400/50 shadow-[0_0_6px_rgba(16,185,129,0.4)]"
              : "bg-white/10 text-white/70 hover:text-white hover:bg-white/25 border border-white/20 shadow-xs"
            }
          `}
        >
          {copied ? <Check className="h-2.5 w-2.5 text-emerald-300" /> : <Copy className="h-2.5 w-2.5" />}
        </button>
      </div>
    </aside>
  );
}

// Registry exports are in pageIdRegistry.ts to keep Fast Refresh happy

