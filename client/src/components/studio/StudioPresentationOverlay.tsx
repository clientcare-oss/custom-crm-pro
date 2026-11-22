import React, { useState, useEffect } from "react";
import {
  MousePointer,
  PenTool,
  Highlighter,
  Eraser,
  Type,
  Square,
  Sparkles,
  Undo2,
  Redo2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  MoreHorizontal,
  LogOut,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  STUDIO_COLOR_LIST,
  STUDIO_COLORS,
  STROKE_THICKNESS_OPTIONS,
  type StudioColorKey,
  type StudioToolId,
  type StudioPage,
} from "./studioTypes";

interface StudioPresentationOverlayProps {
  boardTitle: string;
  surface: "neon" | "whiteboard";
  pages: StudioPage[];
  activePageIndex: number;
  activeTool: StudioToolId;
  activeColor: StudioColorKey;
  strokeThickness: number;
  canUndo: boolean;
  canRedo: boolean;
  children: React.ReactNode; // The dominating StudioCanvas
  onToolChange: (tool: StudioToolId) => void;
  onColorChange: (color: StudioColorKey) => void;
  onThicknessChange: (thickness: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSelectPageIndex: (idx: number) => void;
  onAddPage: () => void;
  onClearCurrentPage: () => void;
  onSurfaceToggle: (surface: "neon" | "whiteboard") => void;
  onOpenAudienceWindow: () => void;
  onOpenAudienceFilterModal: () => void;
  onExitPresentation: () => void;
}

export function StudioPresentationOverlay({
  boardTitle,
  surface,
  pages,
  activePageIndex,
  activeTool,
  activeColor,
  strokeThickness,
  canUndo,
  canRedo,
  children,
  onToolChange,
  onColorChange,
  onThicknessChange,
  onUndo,
  onRedo,
  onSelectPageIndex,
  onAddPage,
  onClearCurrentPage,
  onSurfaceToggle,
  onOpenAudienceWindow,
  onOpenAudienceFilterModal,
  onExitPresentation,
}: StudioPresentationOverlayProps) {
  const [controlsMinimized, setControlsMinimized] = useState(false);
  const [pagesPanelOpen, setPagesPanelOpen] = useState(false);
  const [penPopoverOpen, setPenPopoverOpen] = useState(true);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync browser fullscreen state
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleBrowserFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Graceful fallback when browser blocks Fullscreen API
      setControlsMinimized((v) => !v);
    }
  };

  const activePalette = STUDIO_COLORS[activeColor] || STUDIO_COLORS.cyan;

  return (
    <div
      data-testid="studio-presentation-mode"
      className="fixed inset-0 z-50 bg-[#000820] text-white flex flex-col overflow-hidden select-none"
    >
      {/* ── 1. SLIM TOP TEACHING BAR (Matching Reference + "Go Full Screen" Button) ── */}
      {!controlsMinimized ? (
        <header className="h-12 px-5 bg-[#02081F]/95 border-b border-[#2A2D64]/70 shadow-[0_2px_20px_rgba(88,80,236,0.22)] flex items-center justify-between gap-4 shrink-0 z-30">
          {/* Left: WAYPOINT / STUDIO */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-extrabold tracking-[0.18em] text-white uppercase">
              WAYPOINT
            </span>
            <span className="text-xs font-semibold text-[#7C83BC]">/</span>
            <span className="text-xs font-bold tracking-[0.18em] text-[#9A9FF2] uppercase">
              STUDIO
            </span>
          </div>

          {/* Center: Board Title */}
          <h1 className="text-sm sm:text-base font-medium text-white truncate text-center">
            {boardTitle}
          </h1>

          {/* Right: Presenting Indicator | Go Full Screen | Exit presentation */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22D3EE] shadow-[0_0_10px_#22D3EE]" />
              <span>Presenting</span>
            </div>

            <span className="hidden sm:inline text-[#323A6E]">|</span>

            {/* Dedicated "Go Full Screen" / "Exit Full Screen" Button */}
            <button
              type="button"
              data-testid="presentation-go-fullscreen-btn"
              onClick={toggleBrowserFullscreen}
              title={isFullscreen ? "Exit Full Screen" : "Go Full Screen"}
              className="h-8 px-3 rounded-lg bg-[#081236] hover:bg-[#11225A] border border-[#3E478A] hover:border-cyan-400/70 text-xs font-medium text-slate-100 inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(34,211,238,0.12)]"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Exit Full Screen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Go Full Screen</span>
                </>
              )}
            </button>

            {/* Hide Controls toggle */}
            <button
              type="button"
              data-testid="presentation-hide-controls-btn"
              onClick={() => setControlsMinimized(true)}
              title="Hide teaching bars to maximize canvas"
              className="hidden md:inline-flex h-8 px-2.5 rounded-lg bg-[#081236] hover:bg-[#11225A] border border-[#3E478A] text-xs text-slate-300 hover:text-white items-center gap-1 cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Hide UI</span>
            </button>

            {/* Exit Presentation */}
            <button
              type="button"
              data-testid="exit-presentation-top-btn"
              onClick={onExitPresentation}
              className="h-8 px-3.5 rounded-lg bg-[#0B1333] hover:bg-[#172356] border border-[#49508C] text-xs font-medium text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Exit presentation</span>
            </button>
          </div>
        </header>
      ) : (
        /* Restorable Floating Pill when Teaching Controls are Hidden */
        <div className="fixed top-3 right-3 z-50 flex items-center gap-2">
          <button
            type="button"
            data-testid="presentation-fullscreen-minimized-btn"
            onClick={toggleBrowserFullscreen}
            className="px-3 py-1.5 rounded-full bg-[#040D28]/90 border border-cyan-400/50 text-xs font-semibold text-cyan-200 shadow-xl hover:bg-[#081A4B] flex items-center gap-1.5 cursor-pointer"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit Full Screen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Go Full Screen</span>
              </>
            )}
          </button>
          <button
            type="button"
            data-testid="presentation-restore-controls-btn"
            onClick={() => setControlsMinimized(false)}
            className="px-3 py-1.5 rounded-full bg-[#040D28]/90 border border-cyan-400/50 text-xs font-semibold text-cyan-200 shadow-xl hover:bg-[#081A4B] flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Show Teaching Controls</span>
          </button>
        </div>
      )}

      {/* ── 2. DOMINATING TEACHING CANVAS + RIGHT-EDGE VERTICAL "< Pages" TAB ── */}
      <div className="relative flex-1 flex min-h-0 overflow-hidden">
        {/* Main Canvas Viewport */}
        <div className="relative flex-1 flex flex-col min-w-0 min-h-0">
          {children}
        </div>

        {/* Right-edge Vertical "< Pages" Tab (Matching Reference Image) */}
        {!controlsMinimized && (
          <button
            type="button"
            data-testid="presentation-pages-panel-toggle"
            onClick={() => setPagesPanelOpen((p) => !p)}
            title="Toggle Teaching Pages Drawer"
            className="fixed right-0 top-1/2 -translate-y-1/2 z-40 py-3.5 px-2 rounded-l-xl bg-[#0D1333]/95 hover:bg-[#172154] border border-r-0 border-[#4A508F] text-xs font-medium text-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.8)] flex flex-col items-center gap-1.5 cursor-pointer"
          >
            <span
              className="tracking-wider text-[11px] font-medium"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              {pagesPanelOpen ? "Pages ›" : "‹ Pages"}
            </span>
          </button>
        )}

        {/* Collapsible Right Pages Thumbnail Panel */}
        {pagesPanelOpen && !controlsMinimized && (
          <aside
            data-testid="presentation-pages-thumbnail-panel"
            className="w-64 bg-[#030B22]/98 border-l border-[#2B336E] p-3.5 flex flex-col justify-between gap-3 z-30 overflow-y-auto"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#1E3264]">
                <span className="text-xs font-semibold text-white">
                  Teaching Pages ({pages.length})
                </span>
                <button
                  type="button"
                  onClick={onAddPage}
                  className="text-xs font-semibold text-cyan-300 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Page</span>
                </button>
              </div>

              <div className="space-y-2">
                {pages.map((p, idx) => {
                  const isCurrent = idx === activePageIndex;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      data-testid={`presentation-page-thumb-${idx + 1}`}
                      onClick={() => onSelectPageIndex(idx)}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isCurrent
                          ? "border-cyan-400 bg-[#081A46] shadow-[0_0_16px_rgba(34,211,238,0.2)]"
                          : "border-[#182954] bg-[#040D24] hover:border-cyan-400/40"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold text-white">
                        <span className="truncate">{p.title}</span>
                        <span className="font-mono text-[10px] text-cyan-300">
                          {idx + 1} / {pages.length}
                        </span>
                      </div>
                      <div className="mt-1.5 h-12 rounded-lg bg-[#01071B] border border-[#182954] p-2 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{p.strokes.length} strokes</span>
                        <span>{p.objects.length} items</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={onAddPage}
              className="w-full py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-xs font-semibold text-cyan-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Teaching Page</span>
            </button>
          </aside>
        )}
      </div>

      {/* ── 3. FLOATING BOTTOM TEACHING DOCK (Closely Matching Approved Reference Image) ── */}
      {!controlsMinimized && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-[98vw] flex flex-col items-center gap-2">
          {/* Confirmation Popover for Clear Page (Only clears current page & is undoable) */}
          {confirmClearOpen && (
            <div
              data-testid="confirm-clear-page-popover"
              className="px-4 py-2.5 rounded-2xl bg-[#0B1230]/98 border border-rose-400/60 shadow-2xl flex items-center gap-3 text-xs"
            >
              <span className="text-slate-200">
                Clear all strokes and annotations on{" "}
                <strong className="text-white">
                  Page {activePageIndex + 1}
                </strong>
                ? (Undoable)
              </span>
              <button
                type="button"
                data-testid="confirm-clear-page-yes"
                onClick={() => {
                  onClearCurrentPage();
                  setConfirmClearOpen(false);
                }}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
              >
                Clear page
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="px-2.5 py-1 rounded-lg bg-[#02081A] border border-[#1E3264] text-slate-300 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Bottom Dock Row: Left Page Pills | Center Main Tool Dock | Right Clear Page, Full Screen & More Pills */}
          <div className="flex items-end gap-2.5 max-w-full overflow-x-auto px-2 py-1">
            {/* Left Detached Page Controls: [< 1 / 4 >]  [+ Page] */}
            <div className="flex items-center gap-2 shrink-0 mb-0.5">
              <div className="h-10 px-2 rounded-xl bg-[#0A102D]/95 border border-[#3B427C] flex items-center gap-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.75)]">
                <button
                  type="button"
                  data-testid="teaching-prev-page-btn"
                  disabled={activePageIndex <= 0}
                  onClick={() => onSelectPageIndex(activePageIndex - 1)}
                  title="Previous Page"
                  aria-label="Previous Page"
                  className="w-6 h-6 rounded-lg text-slate-300 hover:text-white disabled:opacity-35 flex items-center justify-center cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPagesPanelOpen((p) => !p)}
                  className="px-1.5 text-xs font-mono font-semibold text-slate-100 hover:text-cyan-300 cursor-pointer"
                >
                  {activePageIndex + 1} / {pages.length}
                </button>
                <button
                  type="button"
                  data-testid="teaching-next-page-btn"
                  disabled={activePageIndex >= pages.length - 1}
                  onClick={() => onSelectPageIndex(activePageIndex + 1)}
                  title="Next Page"
                  aria-label="Next Page"
                  className="w-6 h-6 rounded-lg text-slate-300 hover:text-white disabled:opacity-35 flex items-center justify-center cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                data-testid="teaching-add-page-btn"
                onClick={onAddPage}
                title="Add Teaching Page"
                className="h-10 px-3.5 rounded-xl bg-[#0A102D]/95 hover:bg-[#141E4D] border border-[#3B427C] text-xs font-medium text-slate-100 inline-flex items-center gap-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.75)] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Page</span>
              </button>
            </div>

            {/* Center Main Teaching Dock (with Floating Pen Popover anchored above Pen) */}
            <div className="relative flex flex-col items-start">
              {/* Nearby Floating Pen Options Panel (Sine-wave preview + thickness dropdown) */}
              {activeTool === "pen" && penPopoverOpen && (
                <div
                  data-testid="pen-options-panel"
                  className="mb-2 ml-8 px-3.5 py-2.5 rounded-2xl bg-[#0D1435]/98 border border-[#4B5293] shadow-[0_12px_32px_rgba(0,0,0,0.9)] flex flex-col gap-1.5 relative"
                >
                  <span className="text-[11px] font-medium text-slate-200">
                    Pen
                  </span>
                  <div className="flex items-center gap-3">
                    {/* Glowing Wavy Stroke Preview */}
                    <svg
                      width="68"
                      height="20"
                      viewBox="0 0 68 20"
                      className="overflow-visible"
                    >
                      <path
                        d="M 4 13 Q 18 2, 34 11 T 64 9"
                        fill="none"
                        stroke={activePalette.swatchHex}
                        strokeWidth={Math.min(10, Math.max(2, strokeThickness))}
                        strokeLinecap="round"
                        style={{
                          filter: `drop-shadow(0 0 6px ${activePalette.neonGlow})`,
                        }}
                      />
                    </svg>

                    <div className="h-4 w-[1px] bg-[#2D356B]" />

                    {/* Thickness Selector Pills */}
                    <div className="flex items-center gap-1">
                      {STROKE_THICKNESS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          data-testid={`pen-thickness-${opt.value}`}
                          onClick={() => onThicknessChange(opt.value)}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
                            strokeThickness === opt.value
                              ? "bg-[#5B45BA] text-white font-bold border border-violet-300/60"
                              : "text-slate-300 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          {opt.value} px
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Main Dock Container */}
              <div
                data-testid="teaching-bottom-toolbar"
                className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#0A102D]/95 border border-[#3D4482] shadow-[0_16px_48px_rgba(0,0,0,0.92),0_0_28px_rgba(88,80,236,0.18)] backdrop-blur-xl"
              >
                {/* 7 Stacked Icon + Label Tools: Select, Pen, Highlighter, Eraser, Text, Shapes, Pointer */}
                <div className="flex items-center gap-1">
                  {(
                    [
                      { id: "select", label: "Select", icon: MousePointer },
                      { id: "pen", label: "Pen", icon: PenTool },
                      { id: "highlighter", label: "Highlighter", icon: Highlighter },
                      { id: "eraser", label: "Eraser", icon: Eraser },
                      { id: "text", label: "Text", icon: Type },
                      { id: "rect", label: "Shapes", icon: Square },
                      { id: "pointer", label: "Pointer", icon: Sparkles },
                    ] as const
                  ).map((tool) => {
                    const Icon = tool.icon;
                    const isActive =
                      activeTool === tool.id ||
                      (tool.id === "rect" &&
                        (activeTool === "rect" ||
                          activeTool === "circle" ||
                          activeTool === "diamond"));
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        data-testid={`teaching-tool-${tool.id}`}
                        onClick={() => {
                          onToolChange(tool.id);
                          if (tool.id === "pen") {
                            setPenPopoverOpen((v) =>
                              activeTool === "pen" ? !v : true
                            );
                          } else {
                            setPenPopoverOpen(false);
                          }
                        }}
                        title={tool.label}
                        className={`w-13 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shrink-0 ${
                          isActive
                            ? "bg-gradient-to-b from-[#6C4CE0] to-[#4A32A8] border border-[#A48BFF] text-white shadow-[0_0_16px_rgba(139,92,246,0.55)]"
                            : "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[10px] font-medium leading-none">
                          {tool.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="h-8 w-[1px] bg-[#283166] mx-1 shrink-0" />

                {/* 6 Color Swatches: white, cyan, violet, pink, gold, green */}
                <div className="flex items-center gap-2 px-1 shrink-0">
                  {STUDIO_COLOR_LIST.map((c) => {
                    const isSelected = activeColor === c.key;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        data-testid={`teaching-color-${c.key}`}
                        onClick={() => onColorChange(c.key)}
                        title={c.label}
                        aria-label={`Color ${c.label}`}
                        className={`w-6 h-6 rounded-full transition-all cursor-pointer ${
                          isSelected
                            ? "scale-115 ring-2 ring-white ring-offset-2 ring-offset-[#0A102D]"
                            : "opacity-85 hover:opacity-100 hover:scale-110"
                        }`}
                        style={{
                          backgroundColor: c.swatchHex,
                          boxShadow: isSelected
                            ? `0 0 12px ${c.neonGlow}`
                            : undefined,
                        }}
                      />
                    );
                  })}
                </div>

                <div className="h-8 w-[1px] bg-[#283166] mx-1 shrink-0" />

                {/* 3 Dot Stroke Thickness Selector (Matching Reference Image) */}
                <div className="flex items-center gap-1.5 px-1 shrink-0">
                  {STROKE_THICKNESS_OPTIONS.map((opt) => {
                    const isSelected = strokeThickness === opt.value;
                    const dotPx =
                      opt.value <= 2
                        ? 5
                        : opt.value <= 4
                        ? 8
                        : opt.value <= 8
                        ? 11
                        : 14;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        data-testid={`teaching-dot-thickness-${opt.value}`}
                        onClick={() => onThicknessChange(opt.value)}
                        title={`Stroke thickness: ${opt.value}px`}
                        aria-label={`Stroke thickness ${opt.value}px`}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? "border-2 border-white bg-[#1D2556]"
                            : "hover:bg-white/10"
                        }`}
                      >
                        <span
                          className="rounded-full bg-white"
                          style={{ width: dotPx, height: dotPx }}
                        />
                      </button>
                    );
                  })}
                </div>

                <div className="h-8 w-[1px] bg-[#283166] mx-1 shrink-0" />

                {/* Undo & Redo Stacked Icon + Label */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    data-testid="teaching-undo-btn"
                    disabled={!canUndo}
                    onClick={onUndo}
                    title="Undo (Ctrl+Z)"
                    aria-label="Undo"
                    className="w-11 h-12 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-35 flex flex-col items-center justify-center gap-1 cursor-pointer"
                  >
                    <Undo2 className="w-4 h-4" />
                    <span className="text-[10px] leading-none">Undo</span>
                  </button>
                  <button
                    type="button"
                    data-testid="teaching-redo-btn"
                    disabled={!canRedo}
                    onClick={onRedo}
                    title="Redo (Ctrl+Y)"
                    aria-label="Redo"
                    className="w-11 h-12 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-35 flex flex-col items-center justify-center gap-1 cursor-pointer"
                  >
                    <Redo2 className="w-4 h-4" />
                    <span className="text-[10px] leading-none">Redo</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Detached Pills: [Clear page] [Go Full Screen] [... More] */}
            <div className="flex items-center gap-2 shrink-0 mb-0.5">
              <button
                type="button"
                data-testid="teaching-clear-page-btn"
                onClick={() => setConfirmClearOpen(true)}
                title="Clear Current Page"
                className="h-10 px-3.5 rounded-xl bg-[#0A102D]/95 hover:bg-rose-950/70 border border-[#3B427C] hover:border-rose-400/60 text-xs font-medium text-slate-200 hover:text-rose-200 inline-flex items-center gap-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.75)] cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear page</span>
              </button>

              {/* Go Full Screen Button in Bottom Dock */}
              <button
                type="button"
                data-testid="teaching-bottom-fullscreen-btn"
                onClick={toggleBrowserFullscreen}
                title={isFullscreen ? "Exit Full Screen" : "Go Full Screen"}
                className="h-10 px-3.5 rounded-xl bg-[#0A102D]/95 hover:bg-[#141E4D] border border-[#3B427C] hover:border-cyan-400/60 text-xs font-medium text-slate-100 inline-flex items-center gap-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.75)] cursor-pointer"
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-cyan-300" />
                    <span>Exit Full Screen</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-cyan-300" />
                    <span>Go Full Screen</span>
                  </>
                )}
              </button>

              {/* More Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    data-testid="teaching-more-menu-btn"
                    aria-label="More teaching options"
                    className="h-10 px-3.5 rounded-xl bg-[#0A102D]/95 hover:bg-[#141E4D] border border-[#3B427C] text-xs font-medium text-slate-200 hover:text-white inline-flex items-center gap-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.75)] cursor-pointer"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                    <span>More</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-[#040D28] border border-[#2D356B] text-slate-100 text-xs"
                >
                  <DropdownMenuItem
                    onClick={toggleBrowserFullscreen}
                    className="cursor-pointer"
                  >
                    <span>
                      {isFullscreen ? "Exit Full Screen" : "Go Full Screen"}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      onSurfaceToggle(
                        surface === "neon" ? "whiteboard" : "neon"
                      )
                    }
                    className="cursor-pointer"
                  >
                    <span>
                      Switch to {surface === "neon" ? "Whiteboard" : "Neon"}{" "}
                      Surface
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onOpenAudienceFilterModal}
                    className="cursor-pointer"
                  >
                    <span>Choose Audience Visible Pages & Content…</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onOpenAudienceWindow}
                    className="cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5 text-cyan-300" />
                    <span>Open Synchronized Audience Window</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#1E3264]" />
                  <DropdownMenuItem
                    onClick={onExitPresentation}
                    className="text-rose-300 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1.5" />
                    <span>Exit presentation</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
