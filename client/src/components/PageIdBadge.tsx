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

  // ── Global Floating Corner Mode (Discreet Frosted Glass Orb with White # at bottom right) ──
  return (
    <aside
      aria-label="Waypoint Page ID Utility"
      className={cn("fixed bottom-3 right-3 z-50 flex items-center flex-row-reverse select-none", className)}
    >
      {/* Trigger button — small frosted glass orb with white # thing */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        title={open ? "Hide Page ID" : `Page ID: ${page.id} · ${page.name} (Click to toggle)`}
        className={`
          group relative flex h-7.5 w-7.5 items-center justify-center rounded-full
          cursor-pointer select-none transition-all duration-300 backdrop-blur-md
          ${open
            ? "bg-white/[0.22] border border-white/60 shadow-[0_0_16px_rgba(255,255,255,0.45),0_6px_20px_rgba(0,0,0,0.45),inset_0_1px_2px_rgba(255,255,255,0.7)] scale-105"
            : "bg-white/[0.10] hover:bg-white/[0.20] border border-white/35 hover:border-white/60 shadow-[0_4px_16px_rgba(0,0,0,0.35),0_0_8px_rgba(255,255,255,0.18),inset_0_1px_2px_rgba(255,255,255,0.5)] hover:scale-105 active:scale-95"
          }
        `}
        aria-label="Toggle Page ID"
      >
        {/* Top subtle glass specular reflection crescent */}
        <span className="absolute top-0.5 inset-x-1.5 h-2 rounded-t-full bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />

        {/* Crisp luminous white # icon */}
        <Hash className="h-3.5 w-3.5 text-white drop-shadow-[0_0_3px_rgba(255,255,255,0.85)] relative z-10 transition-transform duration-200 group-hover:scale-110" />

        {/* Soft bottom ambient glow beneath glass orb */}
        <span className="absolute -bottom-1 inset-x-1 h-1.5 bg-white/20 rounded-full blur-xs pointer-events-none" />
      </button>

      {/* Expanded pill (slides smoothly to the left, styled in frosted dark glass) */}
      <div
        className={`
          flex items-center gap-2 rounded-full border border-white/25
          bg-slate-950/75 backdrop-blur-xl
          shadow-[0_8px_32px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,255,255,0.3)]
          overflow-hidden transition-all duration-300 ease-in-out
          ${open ? "max-w-[360px] opacity-100 pl-3 pr-1.5 py-1 mr-2" : "max-w-0 opacity-0 p-0 border-0 mr-0 pointer-events-none"}
        `}
      >
        {/* Page ID Code in frosted glass capsule */}
        <span className="text-[11px] font-mono font-bold text-white whitespace-nowrap tracking-wide bg-white/10 px-2 py-0.5 rounded-full border border-white/20 shadow-inner">
          {page.id}
        </span>

        {/* Page Name */}
        <span className="text-[11px] font-medium text-slate-100/95 whitespace-nowrap truncate max-w-[160px] sm:max-w-[200px]" title={page.name}>
          {page.name}
        </span>

        {/* Copy Button */}
        <button
          type="button"
          onClick={handleCopy}
          title={copied ? "Copied!" : `Copy "${page.id} · ${page.name}"`}
          className={`
            flex h-6 w-6 shrink-0 items-center justify-center rounded-full
            transition-all duration-200 ml-0.5 cursor-pointer
            ${copied
              ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400/50 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
              : "bg-white/10 text-white/80 hover:text-white hover:bg-white/25 border border-white/25 shadow-xs"
            }
          `}
        >
          {copied ? <Check className="h-3 w-3 text-emerald-300" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
    </aside>
  );
}

// Registry exports are in pageIdRegistry.ts to keep Fast Refresh happy

