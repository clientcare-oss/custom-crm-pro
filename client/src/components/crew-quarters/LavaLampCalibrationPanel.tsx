import React, { useState } from "react";
import {
  RotateCcw,
  X,
  Eye,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flame,
  Check,
  Move,
  Layers,
} from "lucide-react";

export interface LavaLampConfig {
  top: number; // percentage (e.g. 33.0%)
  left: number; // percentage (e.g. 3.14%)
  width: number; // percentage (e.g. 3.73%)
  height: number; // percentage (e.g. 41.5%)
  topWidth: number; // flow width at top of tube in % (e.g. 74%)
  bottomWidth: number; // flow width at bottom of tube in % (e.g. 96%)
  riseTravel: number; // pixels rising (e.g. 48px)
  glowIntensity: number; // multiplier (0.5 to 2.0)
  speedMultiplier: number; // speed factor (0.5 to 2.0)
}

export const DEFAULT_LAVA_LAMP_CONFIG: LavaLampConfig = {
  top: 33.0,
  left: 3.14,
  width: 3.73,
  height: 41.5,
  topWidth: 74,
  bottomWidth: 96,
  riseTravel: 48,
  glowIntensity: 1.0,
  speedMultiplier: 1.0,
};

export const LAVA_LAMP_STORAGE_KEY = "waypoint_crew_quarters_lava_lamp_cfg_v2";

export function loadLavaLampConfig(): LavaLampConfig {
  try {
    const raw = localStorage.getItem(LAVA_LAMP_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        top: typeof parsed.top === "number" ? parsed.top : DEFAULT_LAVA_LAMP_CONFIG.top,
        left: typeof parsed.left === "number" ? parsed.left : DEFAULT_LAVA_LAMP_CONFIG.left,
        width: typeof parsed.width === "number" ? parsed.width : DEFAULT_LAVA_LAMP_CONFIG.width,
        height: typeof parsed.height === "number" ? parsed.height : DEFAULT_LAVA_LAMP_CONFIG.height,
        topWidth: typeof parsed.topWidth === "number" ? parsed.topWidth : DEFAULT_LAVA_LAMP_CONFIG.topWidth,
        bottomWidth: typeof parsed.bottomWidth === "number" ? parsed.bottomWidth : DEFAULT_LAVA_LAMP_CONFIG.bottomWidth,
        riseTravel: typeof parsed.riseTravel === "number" ? parsed.riseTravel : DEFAULT_LAVA_LAMP_CONFIG.riseTravel,
        glowIntensity: typeof parsed.glowIntensity === "number" ? parsed.glowIntensity : DEFAULT_LAVA_LAMP_CONFIG.glowIntensity,
        speedMultiplier: typeof parsed.speedMultiplier === "number" ? parsed.speedMultiplier : DEFAULT_LAVA_LAMP_CONFIG.speedMultiplier,
      };
    }
  } catch (e) {
    console.warn("Failed to load lava lamp config from localStorage", e);
  }
  return DEFAULT_LAVA_LAMP_CONFIG;
}

export function saveLavaLampConfig(config: LavaLampConfig): void {
  try {
    localStorage.setItem(LAVA_LAMP_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn("Failed to save lava lamp config to localStorage", e);
  }
}

interface LavaLampCalibrationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  config: LavaLampConfig;
  onChange: (config: LavaLampConfig) => void;
  onReset: () => void;
  showGuide: boolean;
  onToggleGuide: (show: boolean) => void;
}

export function LavaLampCalibrationPanel({
  isOpen,
  onClose,
  config,
  onChange,
  onReset,
  showGuide,
  onToggleGuide,
}: LavaLampCalibrationPanelProps) {
  const [dockSide, setDockSide] = useState<"right" | "left">("right");

  if (!isOpen) return null;

  const update = <K extends keyof LavaLampConfig>(key: K, value: LavaLampConfig[K]) => {
    const updated = { ...config, [key]: value };
    onChange(updated);
    saveLavaLampConfig(updated);
  };

  const nudge = (key: keyof LavaLampConfig, delta: number) => {
    let next = Math.round(((config[key] as number) + delta) * 100) / 100;
    if (key === "top") next = Math.max(18, Math.min(50, next));
    if (key === "left") next = Math.max(0.5, Math.min(10, next));
    if (key === "width") next = Math.max(1.5, Math.min(8, next));
    if (key === "height") next = Math.max(20, Math.min(65, next));
    if (key === "topWidth") next = Math.max(10, Math.min(100, Math.round(next)));
    if (key === "bottomWidth") next = Math.max(20, Math.min(100, Math.round(next)));
    if (key === "riseTravel") next = Math.max(15, Math.min(80, Math.round(next)));
    update(key, next);
  };

  return (
    /* FLOATING TOOL DOCK: Fits completely in view on all screen heights.
       No backdrop blur, no darkening, user can freely switch sides or close. */
    <div
      className={`fixed top-4 z-50 pointer-events-auto transition-all duration-200 ${
        dockSide === "right" ? "right-3 sm:right-6" : "left-3 sm:left-6"
      } w-[340px] sm:w-[380px] max-h-[92vh] flex flex-col`}
    >
      <div className="relative flex flex-col flex-1 overflow-hidden rounded-2xl border border-[#C5A059]/70 bg-[#05142B]/95 shadow-[0_16px_40px_rgba(0,0,0,0.92),inset_0_1px_1px_rgba(255,255,255,0.12)] text-[#FFF4D4]">
        
        {/* Subtle decorative glow */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#C5A059]/20 rounded-full blur-2xl pointer-events-none" />

        {/* Panel Header */}
        <div className="relative flex items-center justify-between border-b border-[#3A2C18] p-3 pb-2.5 bg-[#07162B]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#C5A059]/20 border border-[#C5A059]/40 text-[#FFE394]">
              <Flame className="w-4 h-4 text-[#C5A059] animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold font-serif text-[#FFF4D4] flex items-center gap-1.5 leading-tight">
                Lava Lamp Calibration
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#C5A059]/20 text-[#FFE394] border border-[#C5A059]/40 font-mono">
                  PG-038
                </span>
              </h3>
              <p className="text-[10px] text-[#C6B697] leading-none">
                Adjust position & independent top/bottom flow widths
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Dock Position Switcher */}
            <button
              type="button"
              onClick={() => setDockSide(dockSide === "right" ? "left" : "right")}
              title={`Switch panel to ${dockSide === "right" ? "left" : "right"} side`}
              className="p-1.5 rounded-lg text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#0E2749] border border-transparent hover:border-[#3A2C18] text-[10px] transition-colors"
            >
              {dockSide === "right" ? "⇦ Move Left" : "Move Right ⇨"}
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close Panel"
              className="p-1.5 rounded-lg text-[#C6B697] hover:text-[#FFF4D4] hover:bg-[#0E2749] border border-transparent hover:border-[#3A2C18] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Visual Guide Toggle Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#020A17]/80 border-b border-[#3A2C18] text-xs">
          <div className="flex items-center gap-1.5 text-[#D8C7A5]">
            <Eye className={`w-3.5 h-3.5 ${showGuide ? "text-[#C5A059]" : "text-gray-400"}`} />
            <span className="text-[11px]">Show Geometric Outline</span>
          </div>
          <button
            type="button"
            onClick={() => onToggleGuide(!showGuide)}
            className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all ${
              showGuide
                ? "bg-[#C5A059] text-[#07162B] shadow-[0_0_8px_rgba(197,160,89,0.5)]"
                : "bg-[#07162B] text-[#C6B697] border border-[#3A2C18] hover:text-[#FFF4D4]"
            }`}
          >
            {showGuide ? "OUTLINE ON" : "OUTLINE OFF"}
          </button>
        </div>

        {/* Scrollable controls container — Fits neatly within viewport */}
        <div className="p-3 space-y-2.5 overflow-y-auto flex-1 max-h-[calc(92vh-130px)]">
          
          {/* Vertical Position (Top %) */}
          <div className="p-2 rounded-xl bg-[#020A17]/70 border border-[#3A2C18]">
            <div className="flex items-center justify-between mb-1 text-[11px]">
              <span className="font-semibold text-[#FFE394] flex items-center gap-1">
                <Move className="w-3 h-3 text-[#C5A059]" /> Vertical Position (Top)
              </span>
              <span className="font-mono text-[#C5A059] font-bold">{config.top.toFixed(2)}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => nudge("top", -0.2)}
                title="Move Up towards top cap"
                className="px-2 py-0.5 rounded bg-[#07162B] border border-[#3A2C18] hover:border-[#C5A059] text-[10px] font-mono flex items-center gap-0.5 hover:text-[#FFE394]"
              >
                <ChevronUp className="w-3 h-3" /> Up
              </button>
              <input
                type="range"
                min="20"
                max="45"
                step="0.1"
                value={config.top}
                onChange={(e) => update("top", parseFloat(e.target.value))}
                className="flex-1 accent-[#C5A059] cursor-pointer h-1.5"
              />
              <button
                type="button"
                onClick={() => nudge("top", 0.2)}
                title="Move Down"
                className="px-2 py-0.5 rounded bg-[#07162B] border border-[#3A2C18] hover:border-[#C5A059] text-[10px] font-mono flex items-center gap-0.5 hover:text-[#FFE394]"
              >
                <ChevronDown className="w-3 h-3" /> Down
              </button>
            </div>
          </div>

          {/* Rise Distance Travel (px) — Wax floats to the top of lamp */}
          <div className="p-2 rounded-xl bg-[#020A17]/70 border border-[#3A2C18]">
            <div className="flex items-center justify-between mb-1 text-[11px]">
              <span className="font-semibold text-[#FFE394] flex items-center gap-1">
                <Flame className="w-3 h-3 text-[#3B82F6]" /> Wax Rise Height (Reach Top Cap)
              </span>
              <span className="font-mono text-[#60A5FA] font-bold">{config.riseTravel}px</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => nudge("riseTravel", -2)}
                className="px-2 py-0.5 rounded bg-[#07162B] border border-[#3A2C18] hover:border-[#C5A059] text-[10px] font-mono hover:text-[#FFE394]"
              >
                -2px
              </button>
              <input
                type="range"
                min="20"
                max="75"
                step="1"
                value={config.riseTravel}
                onChange={(e) => update("riseTravel", parseInt(e.target.value, 10))}
                className="flex-1 accent-[#3B82F6] cursor-pointer h-1.5"
              />
              <button
                type="button"
                onClick={() => nudge("riseTravel", 2)}
                className="px-2 py-0.5 rounded bg-[#07162B] border border-[#3A2C18] hover:border-[#C5A059] text-[10px] font-mono hover:text-[#FFE394]"
              >
                +2px
              </button>
            </div>
          </div>

          {/* INDEPENDENT WIDTHS: TOP FLOW WIDTH & BOTTOM FLOW WIDTH */}
          <div className="p-2.5 rounded-xl bg-[#020A17]/90 border border-[#C5A059]/40 space-y-2">
            <div className="flex items-center gap-1.5 text-[#FFE394] text-[11px] font-bold border-b border-[#3A2C18] pb-1">
              <Layers className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Independent Chamber Widths (Top vs Bottom)</span>
            </div>

            {/* Top Flow Width (%) */}
            <div>
              <div className="flex items-center justify-between mb-0.5 text-[10px]">
                <span className="text-[#DFBE77] font-semibold">1. Top Flow Width (Neck / Cap)</span>
                <span className="font-mono text-[#FFE394] font-bold">{config.topWidth}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => nudge("topWidth", -2)}
                  title="Narrow Top"
                  className="px-2 py-0.5 rounded bg-[#07162B] border border-[#3A2C18] hover:border-[#C5A059] text-[10px] font-mono hover:text-[#FFE394]"
                >
                  -2%
                </button>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="1"
                  value={config.topWidth}
                  onChange={(e) => update("topWidth", parseInt(e.target.value, 10))}
                  className="flex-1 accent-[#C5A059] cursor-pointer h-1.5"
                />
                <button
                  type="button"
                  onClick={() => nudge("topWidth", 2)}
                  title="Widen Top"
                  className="px-2 py-0.5 rounded bg-[#07162B] border border-[#3A2C18] hover:border-[#C5A059] text-[10px] font-mono hover:text-[#FFE394]"
                >
                  +2%
                </button>
              </div>
            </div>

            {/* Bottom Flow Width (%) */}
            <div>
              <div className="flex items-center justify-between mb-0.5 text-[10px]">
                <span className="text-[#DFBE77] font-semibold">2. Bottom Flow Width (Base Pool)</span>
                <span className="font-mono text-[#FFE394] font-bold">{config.bottomWidth}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => nudge("bottomWidth", -2)}
                  title="Narrow Bottom"
                  className="px-2 py-0.5 rounded bg-[#07162B] border border-[#3A2C18] hover:border-[#C5A059] text-[10px] font-mono hover:text-[#FFE394]"
                >
                  -2%
                </button>
                <input
                  type="range"
                  min="30"
                  max="100"
                  step="1"
                  value={config.bottomWidth}
                  onChange={(e) => update("bottomWidth", parseInt(e.target.value, 10))}
                  className="flex-1 accent-[#C5A059] cursor-pointer h-1.5"
                />
                <button
                  type="button"
                  onClick={() => nudge("bottomWidth", 2)}
                  title="Widen Bottom"
                  className="px-2 py-0.5 rounded bg-[#07162B] border border-[#3A2C18] hover:border-[#C5A059] text-[10px] font-mono hover:text-[#FFE394]"
                >
                  +2%
                </button>
              </div>
            </div>
          </div>

          {/* Horizontal Position (Left %) */}
          <div className="p-2 rounded-xl bg-[#020A17]/70 border border-[#3A2C18]">
            <div className="flex items-center justify-between mb-1 text-[11px]">
              <span className="font-semibold text-[#FFE394] flex items-center gap-1">
                <Move className="w-3 h-3 text-[#C5A059]" /> Horizontal Position (Left)
              </span>
              <span className="font-mono text-[#C5A059] font-bold">{config.left.toFixed(2)}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => nudge("left", -0.1)}
                title="Move Left"
                className="px-2 py-0.5 rounded bg-[#07162B] border border-[#3A2C18] hover:border-[#C5A059] text-[10px] font-mono flex items-center gap-0.5 hover:text-[#FFE394]"
              >
                <ChevronLeft className="w-3 h-3" /> Left
              </button>
              <input
                type="range"
                min="1.0"
                max="6.0"
                step="0.05"
                value={config.left}
                onChange={(e) => update("left", parseFloat(e.target.value))}
                className="flex-1 accent-[#C5A059] cursor-pointer h-1.5"
              />
              <button
                type="button"
                onClick={() => nudge("left", 0.1)}
                title="Move Right"
                className="px-2 py-0.5 rounded bg-[#07162B] border border-[#3A2C18] hover:border-[#C5A059] text-[10px] font-mono flex items-center gap-0.5 hover:text-[#FFE394]"
              >
                <ChevronRight className="w-3 h-3" /> Right
              </button>
            </div>
          </div>

          {/* Overall Chamber Height (%) */}
          <div className="p-2 rounded-xl bg-[#020A17]/70 border border-[#3A2C18]">
            <div className="flex items-center justify-between mb-1 text-[11px]">
              <span className="font-semibold text-[#FFE394]">Chamber Height (%)</span>
              <span className="font-mono text-[#C5A059] font-bold">{config.height.toFixed(2)}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => nudge("height", -0.5)}
                className="px-2 py-0.5 rounded bg-[#07162B] border border-[#3A2C18] hover:border-[#C5A059] text-[10px] font-mono hover:text-[#FFE394]"
              >
                -0.5%
              </button>
              <input
                type="range"
                min="28"
                max="55"
                step="0.1"
                value={config.height}
                onChange={(e) => update("height", parseFloat(e.target.value))}
                className="flex-1 accent-[#C5A059] cursor-pointer h-1.5"
              />
              <button
                type="button"
                onClick={() => nudge("height", 0.5)}
                className="px-2 py-0.5 rounded bg-[#07162B] border border-[#3A2C18] hover:border-[#C5A059] text-[10px] font-mono hover:text-[#FFE394]"
              >
                +0.5%
              </button>
            </div>
          </div>

          {/* Overall Chamber Width (%) */}
          <div className="p-2 rounded-xl bg-[#020A17]/70 border border-[#3A2C18]">
            <div className="flex items-center justify-between mb-1 text-[11px]">
              <span className="font-semibold text-[#FFE394]">Chamber Width (%)</span>
              <span className="font-mono text-[#C5A059] font-bold">{config.width.toFixed(2)}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => nudge("width", -0.1)}
                className="px-2 py-0.5 rounded bg-[#07162B] border border-[#3A2C18] hover:border-[#C5A059] text-[10px] font-mono hover:text-[#FFE394]"
              >
                -0.1%
              </button>
              <input
                type="range"
                min="2.0"
                max="5.5"
                step="0.05"
                value={config.width}
                onChange={(e) => update("width", parseFloat(e.target.value))}
                className="flex-1 accent-[#C5A059] cursor-pointer h-1.5"
              />
              <button
                type="button"
                onClick={() => nudge("width", 0.1)}
                className="px-2 py-0.5 rounded bg-[#07162B] border border-[#3A2C18] hover:border-[#C5A059] text-[10px] font-mono hover:text-[#FFE394]"
              >
                +0.1%
              </button>
            </div>
          </div>

        </div>

        {/* Footer Actions (Sticky at bottom, never clipped) */}
        <div className="p-3 border-t border-[#3A2C18] bg-[#07162B] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] text-[11px] transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs shadow-[0_2px_8px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 hover:brightness-110 transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Done Adjusting</span>
          </button>
        </div>

      </div>
    </div>
  );
}
