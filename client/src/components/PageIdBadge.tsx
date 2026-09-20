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

  // ── Global Floating Corner Mode (Discreet # launcher at bottom right) ──
  return (
    <aside
      aria-label="Waypoint Page ID Utility"
      className={cn("fixed bottom-3 right-3 z-50 flex items-center flex-row-reverse select-none", className)}
    >
      {/* Trigger button — always visible, sleek 3D oceanic # symbol at bottom right */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        title={open ? "Hide Page ID" : `Page ID: ${page.id} · ${page.name} (Click to toggle)`}
        className={`
          flex h-7.5 w-7.5 sm:h-8 sm:w-8 items-center justify-center rounded-full
          border transition-all duration-200 cursor-pointer shadow-md
          ${open
            ? "border-sky-400 bg-gradient-to-b from-[#0e3b75] to-[#041d40] text-white shadow-[0_0_15px_rgba(56,189,248,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] scale-105"
            : "border-sky-500/35 bg-gradient-to-b from-[#0a2347]/95 via-[#061730]/95 to-[#020b18]/95 text-sky-300 hover:text-white hover:border-sky-400 hover:scale-105 backdrop-blur-md shadow-[0_4px_12px_rgba(0,10,30,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)]"
          }
        `}
        aria-label="Toggle Page ID"
      >
        <Hash className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>

      {/* Expanded pill (slides smoothly to the left) */}
      <div
        className={`
          flex items-center gap-2 rounded-full border border-sky-400/40
          bg-gradient-to-r from-[#030e20]/95 via-[#061833]/95 to-[#020b18]/95 backdrop-blur-md
          shadow-[0_8px_25px_rgba(0,10,30,0.85),inset_0_1px_1px_rgba(255,255,255,0.15)]
          overflow-hidden transition-all duration-300 ease-in-out
          ${open ? "max-w-[360px] opacity-100 pl-3 pr-1.5 py-1 mr-2" : "max-w-0 opacity-0 p-0 border-0 mr-0 pointer-events-none"}
        `}
      >
        {/* Page ID Code */}
        <span className="text-[11px] font-mono font-bold text-sky-300 whitespace-nowrap tracking-wide bg-sky-950/90 px-2 py-0.5 rounded-full border border-sky-400/40 shadow-inner">
          {page.id}
        </span>

        {/* Page Name */}
        <span className="text-[11px] font-semibold text-slate-200 whitespace-nowrap truncate max-w-[160px] sm:max-w-[200px]" title={page.name}>
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
              ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
              : "bg-sky-500/15 text-sky-300 hover:text-white hover:bg-sky-500/30 border border-sky-400/30"
            }
          `}
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
    </aside>
  );
}

// Registry exports are in pageIdRegistry.ts to keep Fast Refresh happy

