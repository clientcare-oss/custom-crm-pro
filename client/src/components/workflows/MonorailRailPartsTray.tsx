import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Redo2,
  Undo2,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RailTrayItemKind } from "@shared/workflowModel";

export interface RailTrayPieceMeta {
  kind: RailTrayItemKind;
  label: string;
  category: "track" | "workflow";
  routeType: "main" | "guide" | "automation";
  hint: string;
}

export const RAIL_TRAY_PIECES: RailTrayPieceMeta[] = [
  // Cosmetic premade snap rail track pieces (never alter workflow rules)
  {
    kind: "straight",
    label: "Straight",
    category: "track",
    routeType: "main",
    hint: "Cosmetic straight rail segment — snaps to any gold rail socket",
  },
  {
    kind: "quarter_turn",
    label: "Quarter turn",
    category: "track",
    routeType: "main",
    hint: "Cosmetic 90° smooth bend — snaps to gold rail sockets",
  },
  {
    kind: "u_turn",
    label: "U-turn",
    category: "track",
    routeType: "main",
    hint: "Cosmetic 180° serpentine bend — snaps to gold rail sockets",
  },
  {
    kind: "branch",
    label: "Branch",
    category: "track",
    routeType: "main",
    hint: "Cosmetic split track with 2 output sockets",
  },
  {
    kind: "merge",
    label: "Merge",
    category: "track",
    routeType: "main",
    hint: "Cosmetic merge junction combining 2 tracks into 1",
  },
  // Workflow logic pieces (explicitly synced with Traditional view)
  {
    kind: "station",
    label: "Station",
    category: "workflow",
    routeType: "main",
    hint: "Adds a synced workflow stage station onto a gold track slot",
  },
  {
    kind: "guide_step",
    label: "Guide step",
    category: "workflow",
    routeType: "guide",
    hint: "Snaps to a station's blue guide socket to add an employee step",
  },
  {
    kind: "automation",
    label: "Automation",
    category: "workflow",
    routeType: "automation",
    hint: "Snaps to a station's violet socket to add an automation rule",
  },
  {
    kind: "approval_gate",
    label: "Approval gate",
    category: "workflow",
    routeType: "main",
    hint: "Snaps onto a gold transition between two stations",
  },
];

/** Crisp visually recognizable mini-SVG thumbnails for all 9 rail-parts tray pieces */
export function RailPieceThumbnail({ kind }: { kind: RailTrayItemKind }) {
  switch (kind) {
    case "straight":
      return (
        <svg viewBox="0 0 44 26" className="w-10 h-6 shrink-0">
          <line x1="6" y1="13" x2="38" y2="13" stroke="#C9A55A" strokeWidth="4" strokeLinecap="round" />
          <line x1="6" y1="12" x2="38" y2="12" stroke="#FFF4D1" strokeWidth="1" strokeLinecap="round" />
          <circle cx="6" cy="13" r="2.6" fill="#0B1633" stroke="#F2D388" strokeWidth="1.2" />
          <circle cx="38" cy="13" r="2.6" fill="#0B1633" stroke="#F2D388" strokeWidth="1.2" />
        </svg>
      );
    case "quarter_turn":
      return (
        <svg viewBox="0 0 44 26" className="w-10 h-6 shrink-0">
          <path d="M 8 6 C 24 6, 32 10, 32 21" fill="none" stroke="#C9A55A" strokeWidth="4" strokeLinecap="round" />
          <path d="M 8 5.2 C 24 5.2, 31.2 9.5, 31.2 21" fill="none" stroke="#FFF4D1" strokeWidth="1" strokeLinecap="round" />
          <circle cx="8" cy="6" r="2.5" fill="#0B1633" stroke="#F2D388" strokeWidth="1.2" />
          <circle cx="32" cy="21" r="2.5" fill="#0B1633" stroke="#F2D388" strokeWidth="1.2" />
        </svg>
      );
    case "u_turn":
      return (
        <svg viewBox="0 0 44 26" className="w-10 h-6 shrink-0">
          <path d="M 10 6 C 34 6, 34 20, 10 20" fill="none" stroke="#C9A55A" strokeWidth="3.8" strokeLinecap="round" />
          <path d="M 10 5.2 C 33 5.2, 33 19.2, 10 19.2" fill="none" stroke="#FFF4D1" strokeWidth="0.9" strokeLinecap="round" />
          <circle cx="10" cy="6" r="2.4" fill="#0B1633" stroke="#F2D388" strokeWidth="1.2" />
          <circle cx="10" cy="20" r="2.4" fill="#0B1633" stroke="#F2D388" strokeWidth="1.2" />
        </svg>
      );
    case "branch":
      return (
        <svg viewBox="0 0 44 26" className="w-10 h-6 shrink-0">
          <path d="M 6 10 L 38 10 M 14 10 C 23 10, 26 20, 37 20" fill="none" stroke="#C9A55A" strokeWidth="3.4" strokeLinecap="round" />
          <circle cx="6" cy="10" r="2.3" fill="#0B1633" stroke="#F2D388" strokeWidth="1.1" />
          <circle cx="38" cy="10" r="2.3" fill="#0B1633" stroke="#F2D388" strokeWidth="1.1" />
          <circle cx="37" cy="20" r="2.3" fill="#0B1633" stroke="#7CC4FF" strokeWidth="1.1" />
        </svg>
      );
    case "merge":
      return (
        <svg viewBox="0 0 44 26" className="w-10 h-6 shrink-0">
          <path d="M 6 10 L 38 10 M 7 20 C 18 20, 21 10, 30 10" fill="none" stroke="#C9A55A" strokeWidth="3.4" strokeLinecap="round" />
          <circle cx="6" cy="10" r="2.3" fill="#0B1633" stroke="#F2D388" strokeWidth="1.1" />
          <circle cx="7" cy="20" r="2.3" fill="#0B1633" stroke="#C4B5FD" strokeWidth="1.1" />
          <circle cx="38" cy="10" r="2.3" fill="#0B1633" stroke="#F2D388" strokeWidth="1.1" />
        </svg>
      );
    case "station":
      return (
        <svg viewBox="0 0 44 26" className="w-10 h-6 shrink-0">
          <line x1="4" y1="13" x2="40" y2="13" stroke="#9A7837" strokeWidth="2.6" />
          <ellipse cx="22" cy="13" rx="10" ry="7.2" fill="#08142E" stroke="#E5C784" strokeWidth="2.2" />
          <circle cx="22" cy="13" r="2.4" fill="#FFF4D1" />
        </svg>
      );
    case "guide_step":
      return (
        <svg viewBox="0 0 44 26" className="w-10 h-6 shrink-0">
          <path d="M 6 8 C 12 18, 20 18, 38 18" fill="none" stroke="#4DA3FF" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="24" cy="18" r="5.5" fill="#091D46" stroke="#93C5FD" strokeWidth="1.6" />
          <path d="M 21.8 18 L 23.4 19.6 L 26.5 16.4" fill="none" stroke="#DBEAFE" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case "automation":
      return (
        <svg viewBox="0 0 44 26" className="w-10 h-6 shrink-0">
          <path d="M 6 18 C 14 8, 22 8, 38 8" fill="none" stroke="#9D72FF" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="24" cy="8" r="5.5" fill="#1A0C3C" stroke="#C4B5FD" strokeWidth="1.6" />
          <path d="M 24.5 4.8 L 22 8.4 L 24.4 8.4 L 23.5 11.4 L 26.3 7.6 L 24 7.6 Z" fill="#EDE9FE" />
        </svg>
      );
    case "approval_gate":
      return (
        <svg viewBox="0 0 44 26" className="w-10 h-6 shrink-0">
          <line x1="5" y1="17" x2="39" y2="17" stroke="#9A7837" strokeWidth="2.4" />
          <rect x="13" y="8" width="3" height="14" rx="1.2" fill="#DFBE76" />
          <rect x="28" y="8" width="3" height="14" rx="1.2" fill="#DFBE76" />
          <path d="M 14.5 9 C 14.5 3.5, 29.5 3.5, 29.5 9" fill="none" stroke="#F2D388" strokeWidth="1.6" />
          <circle cx="22" cy="14" r="4.8" fill="#08142E" stroke="#F2D388" strokeWidth="1.3" />
          <path d="M 20 14 L 21.5 15.5 L 24.2 12.6" fill="none" stroke="#FFF4D1" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
  }
}

interface MonorailRailPartsTrayProps {
  open: boolean;
  onToggleOpen: () => void;
  armedPiece: RailTrayItemKind | null;
  onArmPiece: (kind: RailTrayItemKind | null) => void;
  onStartDragPiece: (kind: RailTrayItemKind, e: React.PointerEvent) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAutoLayout: () => void;
  snapNotice: { type: "info" | "error"; text: string } | null;
  onDismissNotice: () => void;
}

/**
 * Compact collapsible Edit Routes Rail-Parts Tray + Top Undo/Redo/Auto-layout Bar.
 * Clearly distinguishes Cosmetic Bends/Track Pieces from Synced Workflow Logic pieces.
 */
export function MonorailRailPartsTray({
  open,
  onToggleOpen,
  armedPiece,
  onArmPiece,
  onStartDragPiece,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAutoLayout,
  snapNotice,
  onDismissNotice,
}: MonorailRailPartsTrayProps) {
  const trackItems = RAIL_TRAY_PIECES.filter((p) => p.category === "track");
  const workflowItems = RAIL_TRAY_PIECES.filter((p) => p.category === "workflow");

  return (
    <>
      {/* Top-Center Edit Routes Action Strip: Undo · Redo · Auto-layout */}
      <div
        data-interactive-node="true"
        data-testid="monorail-edit-routes-bar"
        className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#05102B]/94 border border-[#C9A55A]/55 backdrop-blur-md shadow-[0_10px_28px_rgba(0,0,0,0.75)]"
      >
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#F2D388] px-1.5 border-r border-[#1F355D]">
          Edit Routes
        </span>
        <button
          type="button"
          data-testid="monorail-undo-btn"
          disabled={!canUndo}
          onClick={onUndo}
          title="Undo (Ctrl+Z)"
          className="h-6.5 px-2 rounded-md bg-[#0B1B3F] hover:bg-[#142D61] border border-[#243B64] text-[11px] text-[#DCE6F5] disabled:opacity-35 inline-flex items-center gap-1 cursor-pointer"
        >
          <Undo2 className="w-3 h-3" />
          <span>Undo</span>
        </button>
        <button
          type="button"
          data-testid="monorail-redo-btn"
          disabled={!canRedo}
          onClick={onRedo}
          title="Redo (Ctrl+Y)"
          className="h-6.5 px-2 rounded-md bg-[#0B1B3F] hover:bg-[#142D61] border border-[#243B64] text-[11px] text-[#DCE6F5] disabled:opacity-35 inline-flex items-center gap-1 cursor-pointer"
        >
          <Redo2 className="w-3 h-3" />
          <span>Redo</span>
        </button>
        <button
          type="button"
          data-testid="monorail-auto-layout-btn"
          onClick={onAutoLayout}
          title="Auto-align serpentine layout & fit to screen (preserves workflow order)"
          className="h-6.5 px-2.5 rounded-md bg-[#0B1B3F] hover:bg-[#142D61] border border-[#C9A55A]/45 text-[11px] text-[#F5E3B8] inline-flex items-center gap-1 cursor-pointer"
        >
          <LayoutGrid className="w-3 h-3" />
          <span>Auto-layout</span>
        </button>
      </div>

      {/* Inline Snap / Invalid Connection Feedback Toast Pill */}
      {snapNotice && (
        <div
          data-interactive-node="true"
          data-testid="monorail-snap-notice"
          className={cn(
            "absolute top-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11.5px] border backdrop-blur-md shadow-xl",
            snapNotice.type === "error"
              ? "bg-[#2C0B17]/95 border-rose-400/60 text-rose-100"
              : "bg-[#071838]/95 border-[#C9A55A]/60 text-[#F5E3B8]"
          )}
        >
          <span>{snapNotice.text}</span>
          <button
            type="button"
            onClick={onDismissNotice}
            className="opacity-70 hover:opacity-100 cursor-pointer"
            aria-label="Dismiss message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Left Collapsible Premade Snap Rail-Parts Tray */}
      <div
        data-interactive-node="true"
        data-testid="monorail-rail-parts-tray"
        className="absolute top-3 left-3 z-20 flex items-start"
      >
        {open ? (
          <div className="w-[218px] max-h-[calc(100vh-210px)] overflow-y-auto rounded-xl bg-[#040E26]/95 border border-[#C9A55A]/50 backdrop-blur-md shadow-[0_18px_42px_rgba(0,0,0,0.85)] p-2.5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#182B52] pb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#E5C784]" />
                <span className="text-[11.5px] font-semibold text-[#FFF4D4]">
                  Rail Parts
                </span>
              </div>
              <button
                type="button"
                onClick={onToggleOpen}
                aria-label="Collapse rail parts tray"
                className="p-1 rounded-md text-[#9BB0CE] hover:text-white hover:bg-[#0D1E45] cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[10px] text-[#94A9C7] leading-snug">
              Drag onto canvas or click to snap to a glowing socket.
            </p>

            {/* Section 1: Cosmetic Track Pieces */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] font-semibold uppercase tracking-wider text-[#C9A55A]">
                  Track Pieces
                </span>
                <span className="text-[9px] text-[#7F95B5]">Visual bends</span>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {trackItems.map((item) => {
                  const isArmed = armedPiece === item.kind;
                  return (
                    <button
                      key={item.kind}
                      type="button"
                      data-testid={`rail-tray-item-${item.kind}`}
                      title={item.hint}
                      onPointerDown={(e) => onStartDragPiece(item.kind, e)}
                      onClick={() => onArmPiece(isArmed ? null : item.kind)}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-lg border text-left transition-all cursor-grab active:cursor-grabbing select-none",
                        isArmed
                          ? "bg-[#152B59] border-[#E5C784] text-[#FFF4D4] shadow-[0_0_12px_rgba(229,199,132,0.22)]"
                          : "bg-[#081533]/90 border-[#1A2F58] text-[#D8E5F8] hover:border-[#C9A55A]/60 hover:bg-[#0E2049]"
                      )}
                    >
                      <RailPieceThumbnail kind={item.kind} />
                      <span className="text-[11.5px] font-medium truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Synced Workflow Pieces */}
            <div className="space-y-1 pt-1 border-t border-[#16294F]">
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] font-semibold uppercase tracking-wider text-[#93C5FD]">
                  Workflow Pieces
                </span>
                <span className="text-[9px] text-[#7F95B5]">Synced logic</span>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {workflowItems.map((item) => {
                  const isArmed = armedPiece === item.kind;
                  return (
                    <button
                      key={item.kind}
                      type="button"
                      data-testid={`rail-tray-item-${item.kind}`}
                      title={item.hint}
                      onPointerDown={(e) => onStartDragPiece(item.kind, e)}
                      onClick={() => onArmPiece(isArmed ? null : item.kind)}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-lg border text-left transition-all cursor-grab active:cursor-grabbing select-none",
                        isArmed
                          ? "bg-[#152B59] border-[#E5C784] text-[#FFF4D4] shadow-[0_0_12px_rgba(229,199,132,0.22)]"
                          : "bg-[#081533]/90 border-[#1A2F58] text-[#D8E5F8] hover:border-[#60A5FA]/60 hover:bg-[#0E2049]"
                      )}
                    >
                      <RailPieceThumbnail kind={item.kind} />
                      <span className="text-[11.5px] font-medium truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {armedPiece && (
              <div className="pt-1.5 border-t border-[#182B52] flex items-center justify-between text-[10px] text-[#F5E3B8]">
                <span>Click a glowing socket to place</span>
                <button
                  type="button"
                  onClick={() => onArmPiece(null)}
                  className="underline text-[#93C5FD] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onToggleOpen}
            data-testid="monorail-expand-tray-btn"
            className="h-8 px-2.5 rounded-lg bg-[#051029]/95 border border-[#C9A55A]/55 text-xs text-[#F5E3B8] hover:bg-[#0D1E45] inline-flex items-center gap-1.5 shadow-lg cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#E5C784]" />
            <span>Rail Parts</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </>
  );
}
