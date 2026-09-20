import { useEffect } from "react";
import { useLocation } from "wouter";
import { resolvePageId, PAGE_IDS, broadcastPageId } from "@/lib/pageIdRegistry";
import FloatingUtilityDock from "./FloatingUtilityDock";

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
}: PageIdBadgeProps = {}) {
  const [location] = useLocation();

  const isInline = inline || variant === "inline" || (Boolean(explicitId) && variant !== "floating");

  // Re-broadcast when location changes or explicit props change
  useEffect(() => {
    if (explicitId) {
      const pageInfo = { id: explicitId, name: explicitName || PAGE_IDS[location]?.name || "Waypoint View" };
      broadcastPageId(pageInfo);
    } else {
      const pageInfo = resolvePageId(location, typeof window !== "undefined" ? window.location.search : "");
      if (pageInfo) {
        broadcastPageId(pageInfo);
      }
    }
  }, [location, explicitId, explicitName]);

  // If explicitId or inline is specified, this is a local declaration on a page/subpage.
  // It registers/broadcasts the ID to the global dock at the bottom right and renders NOTHING in the header.
  if (isInline || Boolean(explicitId)) {
    return null;
  }

  // ── Global Floating Corner Mode (Unified Frosted Glass Micro-Dock) ──
  return <FloatingUtilityDock />;
}

// Registry exports are in pageIdRegistry.ts to keep Fast Refresh happy
