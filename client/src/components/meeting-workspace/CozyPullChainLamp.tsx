import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "waypoint-cozy-lamp-on";

interface CozyPullChainLampProps {
  className?: string;
  onToggle?: (isOn: boolean) => void;
}

export function CozyPullChainLamp({
  className,
  onToggle,
}: CozyPullChainLampProps) {
  const [isOn, setIsOn] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === null ? true : saved === "true";
    } catch {
      return true;
    }
  });
  const [isPulling, setIsPulling] = useState(false);

  useEffect(() => {
    onToggle?.(isOn);
  }, [isOn, onToggle]);

  useEffect(() => {
    const handleSync = (e: Event) => {
      const custom = e as CustomEvent<{ isOn: boolean }>;
      if (typeof custom.detail?.isOn === "boolean") {
        setIsOn(custom.detail.isOn);
      }
    };
    window.addEventListener("waypoint:cozy-lamp-change", handleSync);
    return () =>
      window.removeEventListener("waypoint:cozy-lamp-change", handleSync);
  }, []);

  const handlePullChain = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPulling(true);
    const next = !isOn;
    setIsOn(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
      window.dispatchEvent(
        new CustomEvent("waypoint:cozy-lamp-change", {
          detail: { isOn: next },
        })
      );
    } catch {
      // ignore storage errors
    }
    setTimeout(() => setIsPulling(false), 220);
  };

  return (
    <>
      {/* ── COZY WARM READING LIGHT WASH ACROSS THE CARD (WHEN ON) ── */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-64 transition-opacity duration-500 z-[1]",
          isOn ? "opacity-100" : "opacity-0"
        )}
        style={{
          background:
            "radial-gradient(ellipse 52% 68% at 50% 0%, rgba(255, 224, 140, 0.26) 0%, rgba(245, 181, 68, 0.11) 42%, rgba(16, 37, 80, 0) 100%)",
        }}
      />

      {/* Focused warm pool immediately beneath the brass shade */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-56 h-20 rounded-full blur-xl transition-opacity duration-500 z-[2]",
          isOn ? "opacity-95 bg-[#FFE299]/35" : "opacity-0"
        )}
      />

      {/* ── BRASS CAPTAIN'S DESK LAMP SHADE + BEADED PULL CHAIN ── */}
      <div
        className={cn(
          "absolute top-0 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center select-none",
          className
        )}
      >
        {/* Brass Canopy Shade */}
        <button
          type="button"
          data-testid="cozy-lamp-pull-chain"
          onClick={handlePullChain}
          title={
            isOn
              ? "Pull chain to turn off cozy reading light"
              : "Pull chain to turn on cozy reading light"
          }
          aria-label={
            isOn
              ? "Turn off cozy reading light"
              : "Turn on cozy reading light"
          }
          className="group relative flex flex-col items-center focus:outline-none cursor-pointer"
        >
          {/* Brass Shade Housing */}
          <div
            className={cn(
              "relative h-2.5 w-20 rounded-b-xl border-x border-b transition-all duration-300",
              isOn
                ? "bg-gradient-to-r from-[#8D6824] via-[#FFF0B8] to-[#8D6824] border-[#FFF3C4]/80 shadow-[0_3px_16px_rgba(255,220,130,0.85),0_0_28px_rgba(255,196,77,0.55)]"
                : "bg-gradient-to-r from-[#4A3714] via-[#8E6F36] to-[#4A3714] border-[#6E5528] shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
            )}
          >
            {/* Warm Glowing Bulb Filament Under the Shade */}
            <div
              className={cn(
                "absolute left-1/2 -translate-x-1/2 -bottom-1 w-10 h-1.5 rounded-b-full transition-all duration-300",
                isOn
                  ? "bg-[#FFFDF5] shadow-[0_2px_10px_#FFE082,0_0_18px_#FFC107] opacity-100"
                  : "bg-[#3A2E1B] opacity-40"
              )}
            />
          </div>

          {/* Hanging Beaded Brass Pull Chain (offset slightly to the right like a classic banker's lamp) */}
          <div
            className={cn(
              "relative left-6 -mt-0.5 flex flex-col items-center transition-transform duration-200 ease-out",
              isPulling
                ? "translate-y-2"
                : "group-hover:translate-y-0.5"
            )}
          >
            {/* Chain Beads */}
            <span className="w-[2.5px] h-[2.5px] rounded-full bg-gradient-to-br from-[#FFF3C4] to-[#9E7B36] shadow-sm" />
            <span className="w-[1px] h-[2px] bg-[#C5A059]/80" />
            <span className="w-[2.5px] h-[2.5px] rounded-full bg-gradient-to-br from-[#FFF3C4] to-[#9E7B36] shadow-sm" />
            <span className="w-[1px] h-[2px] bg-[#C5A059]/80" />
            <span className="w-[2.5px] h-[2.5px] rounded-full bg-gradient-to-br from-[#FFF3C4] to-[#9E7B36] shadow-sm" />
            <span className="w-[1px] h-[2px] bg-[#C5A059]/80" />

            {/* Brass Acorn / Teardrop Pull Handle */}
            <span
              className={cn(
                "w-2 h-3 rounded-b-full rounded-t-sm border transition-all",
                isOn
                  ? "bg-gradient-to-b from-[#FFF3C4] via-[#DFBE77] to-[#8C6722] border-[#FFF5D6]/80 shadow-[0_0_8px_rgba(255,227,148,0.75)]"
                  : "bg-gradient-to-b from-[#B39252] via-[#7D6029] to-[#4A3714] border-[#8E6F36]/70 shadow-sm"
              )}
            />
          </div>
        </button>
      </div>
    </>
  );
}

