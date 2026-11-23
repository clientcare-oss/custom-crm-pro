import React from "react";
import { AlertTriangle, Check, RotateCw, Trash2 } from "lucide-react";
import {
  getRailPieceGeometry,
  type MonorailCosmeticPiece,
  type WorkflowApprovalGate,
} from "@shared/workflowModel";

export type RailVariant = "main" | "guide" | "automation";

export interface CanvasSocket {
  id: string;
  targetType: "station" | "piece" | "segment";
  targetId: string;
  /** Secondary stage ID for gold transition segments (from -> to) */
  toStageId?: string;
  socketName: string;
  accepts: "rail" | "guide" | "automation" | "gate_or_station";
  routeType: RailVariant;
  x: number;
  y: number;
  angleDeg: number;
  label: string;
}

/**
 * Shared SVG definitions for dimensional brushed metallic tracks, 3D circular brass stations,
 * controlled lighting glows, and soft ground cast shadows on Waypoint's #000820 navy canvas.
 */
export function MonorailSvgDefs() {
  return (
    <defs>
      {/* Brushed Champagne Gold Main Monorail Track */}
      <linearGradient id="monorail-gold-rail" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFF5D4" />
        <stop offset="28%" stopColor="#E6C57B" />
        <stop offset="65%" stopColor="#A9833D" />
        <stop offset="100%" stopColor="#563F18" />
      </linearGradient>

      {/* Cool Sapphire Blue Guide Route Rail */}
      <linearGradient id="monorail-blue-rail" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#D6ECFF" />
        <stop offset="35%" stopColor="#60B2FF" />
        <stop offset="72%" stopColor="#2563EB" />
        <stop offset="100%" stopColor="#132F7A" />
      </linearGradient>

      {/* Luminous Amethyst Violet Automation Route Rail */}
      <linearGradient id="monorail-violet-rail" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#F1E5FF" />
        <stop offset="35%" stopColor="#B185FF" />
        <stop offset="72%" stopColor="#7C3AED" />
        <stop offset="100%" stopColor="#3B1278" />
      </linearGradient>

      {/* Circular Metallic Station Top Bezel (Brushed Champagne Brass) */}
      <linearGradient id="station-brass-rim" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFF4D1" />
        <stop offset="32%" stopColor="#DFBC70" />
        <stop offset="70%" stopColor="#8E6B2E" />
        <stop offset="100%" stopColor="#3B2A10" />
      </linearGradient>

      {/* Circular Metallic Station 3D Cylindrical Plinth Wall */}
      <linearGradient id="station-base-side" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#2A1E0C" />
        <stop offset="22%" stopColor="#7B5D2B" />
        <stop offset="50%" stopColor="#DCBA70" />
        <stop offset="78%" stopColor="#6C5023" />
        <stop offset="100%" stopColor="#21170A" />
      </linearGradient>

      {/* Deep Obsidian Navy Recessed Dish inside Circular Station */}
      <radialGradient id="station-navy-core" cx="50%" cy="38%" r="65%">
        <stop offset="0%" stopColor="#162749" />
        <stop offset="55%" stopColor="#081229" />
        <stop offset="100%" stopColor="#030817" />
      </radialGradient>

      {/* Controlled Selected Station Golden Floor Halo */}
      <radialGradient id="station-selected-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FFE8A6" stopOpacity="0.82" />
        <stop offset="36%" stopColor="#DFBA6A" stopOpacity="0.44" />
        <stop offset="68%" stopColor="#B88D3D" stopOpacity="0.14" />
        <stop offset="100%" stopColor="#B88D3D" stopOpacity="0" />
      </radialGradient>

      {/* Subtle Active Case Halo */}
      <radialGradient id="station-case-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.48" />
        <stop offset="58%" stopColor="#3B82F6" stopOpacity="0.16" />
        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
      </radialGradient>

      {/* Blue Guide Node Medallion */}
      <radialGradient id="guide-node-core" cx="45%" cy="35%" r="68%">
        <stop offset="0%" stopColor="#1A428A" />
        <stop offset="65%" stopColor="#091C42" />
        <stop offset="100%" stopColor="#040D24" />
      </radialGradient>

      {/* Violet Automation Node Medallion */}
      <radialGradient id="auto-node-core" cx="45%" cy="35%" r="68%">
        <stop offset="0%" stopColor="#3D1E7A" />
        <stop offset="65%" stopColor="#160C36" />
        <stop offset="100%" stopColor="#09051A" />
      </radialGradient>

      {/* Soft Architectural Cast Shadow for Raised Rails */}
      <filter id="rail-drop-shadow" x="-15%" y="-15%" width="130%" height="148%">
        <feDropShadow dx="0" dy="9" stdDeviation="4.8" floodColor="#00020A" floodOpacity="0.78" />
      </filter>

      {/* Soft Controlled Glow for Active Branches */}
      <filter id="soft-route-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

/**
 * Reusable Component #1: Slender Dimensional Metallic Monorail Track
 * Dark underside for physical depth, metallic brushed body, narrow reflective highlight,
 * soft cast shadow, and restrained colored illumination.
 */
export function MetallicMonorailTrack({
  d,
  variant = "main",
  disabled = false,
  dashed = false,
  pathRef,
  opacity = 1,
  strokeScale = 1,
}: {
  d: string;
  variant?: RailVariant;
  disabled?: boolean;
  dashed?: boolean;
  pathRef?: React.Ref<SVGPathElement>;
  opacity?: number;
  strokeScale?: number;
}) {
  if (!d) return null;

  const isMain = variant === "main";
  const bodyW = (isMain ? 7.8 : variant === "guide" ? 5.2 : 4.8) * strokeScale;
  const underW = bodyW + 3.2 * strokeScale;
  const glowW = bodyW + (isMain ? 7.5 : 8.5) * strokeScale;
  const specW = (isMain ? 1.55 : 1.15) * strokeScale;

  const glowColor =
    variant === "main"
      ? "#D8B364"
      : variant === "guide"
      ? "#3B82F6"
      : "#8B5CF6";
  const underColor =
    variant === "main"
      ? "#18120A"
      : variant === "guide"
      ? "#071738"
      : "#160830";
  const bodyStroke = disabled
    ? variant === "automation"
      ? "#574A75"
      : "#4B5874"
    : variant === "main"
    ? "url(#monorail-gold-rail)"
    : variant === "guide"
    ? "url(#monorail-blue-rail)"
    : "url(#monorail-violet-rail)";
  const specColor =
    variant === "main"
      ? "#FFF9E5"
      : variant === "guide"
      ? "#E0F2FE"
      : "#F3E8FF";

  return (
    <g opacity={opacity} pointerEvents="none">
      {/* Ground cast shadow */}
      <g transform="translate(0, 9.5)" opacity={disabled ? 0.3 : 0.62}>
        <path
          d={d}
          fill="none"
          stroke="#00020B"
          strokeWidth={bodyW + 3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Restrained colored illumination halo */}
      {!disabled && (
        <path
          d={d}
          fill="none"
          stroke={glowColor}
          strokeOpacity={isMain ? 0.16 : 0.28}
          strokeWidth={glowW}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Dark metallic underside for sleek 3D thickness */}
      <g transform="translate(0, 2.3)">
        <path
          d={d}
          fill="none"
          stroke={underColor}
          strokeWidth={underW}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dashed ? "7 6" : undefined}
        />
      </g>

      {/* Metallic brushed rail body */}
      <path
        ref={pathRef}
        d={d}
        fill="none"
        stroke={bodyStroke}
        strokeWidth={bodyW}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dashed ? "7 6" : undefined}
      />

      {/* Narrow reflective top specular highlight */}
      {!disabled && (
        <g transform="translate(0, -1.55)">
          <path
            d={d}
            fill="none"
            stroke={specColor}
            strokeOpacity={isMain ? 0.78 : 0.66}
            strokeWidth={specW}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={dashed ? "7 6" : undefined}
          />
        </g>
      )}
    </g>
  );
}

/**
 * Reusable Component #4: Track Junction & Connection Socket
 * Small visible metallic spots strictly in Edit Routes mode.
 * Restrained glow when compatible during drag/placement; hidden outside Edit Routes mode.
 */
export function TrackJunctionSocket({
  x,
  y,
  routeType,
  state = "idle",
  label,
  onClick,
}: {
  x: number;
  y: number;
  routeType: RailVariant;
  state?: "idle" | "compatible" | "snapping" | "invalid";
  label?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const palette =
    state === "invalid"
      ? { ring: "#FB7185", core: "#3B0A18", glow: "#F43F5E" }
      : routeType === "guide"
      ? { ring: "#7CC4FF", core: "#081C44", glow: "#3B82F6" }
      : routeType === "automation"
      ? { ring: "#C4B5FD", core: "#1A0D3D", glow: "#8B5CF6" }
      : { ring: "#F2D388", core: "#1E1608", glow: "#DFBA6A" };

  const isHighlighted = state === "compatible" || state === "snapping";
  const r = state === "snapping" ? 7.5 : isHighlighted ? 6.2 : 4.8;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      data-interactive-node="true"
      data-testid={`rail-socket-${routeType}-${state}`}
      onClick={onClick}
      className={onClick ? "cursor-pointer" : "pointer-events-none"}
    >
      <title>{label || "Connection socket"}</title>
      <circle r={14} fill="transparent" />
      {(isHighlighted || state === "invalid") && (
        <circle
          r={state === "snapping" ? 15 : 11.5}
          fill={palette.glow}
          fillOpacity={state === "snapping" ? 0.42 : 0.22}
        />
      )}
      {state === "snapping" && (
        <circle
          r={11.5}
          fill="none"
          stroke={palette.ring}
          strokeWidth={1.3}
          strokeDasharray="3 2.5"
        />
      )}
      <circle
        r={r}
        fill={palette.core}
        stroke={palette.ring}
        strokeWidth={state === "snapping" ? 2.1 : 1.4}
      />
      <circle
        r={state === "snapping" ? 2.5 : 1.7}
        fill={state === "snapping" ? "#FFFFFF" : palette.ring}
      />
    </g>
  );
}

/**
 * Reusable Component #5: Dimensional Champagne-Gold Approval Gate
 * Matches "Advocate approval" twin brass posts + arched bar + circular check medallion astride the rail.
 */
export function MonorailApprovalGate({
  gate,
  x,
  y,
  status,
  onSelect,
}: {
  gate: WorkflowApprovalGate;
  x: number;
  y: number;
  status: "pending" | "approved" | "rejected";
  onSelect: (gate: WorkflowApprovalGate) => void;
}) {
  const isApproved = status === "approved";
  const isRejected = status === "rejected";
  const accent = isApproved ? "#34D399" : isRejected ? "#FB7185" : "#E8CA82";

  return (
    <g
      transform={`translate(${x}, ${y})`}
      role="button"
      tabIndex={0}
      data-interactive-node="true"
      data-testid={`approval-gate-${gate.id}`}
      aria-label={`Approval gate: ${gate.title}, requires ${gate.requiredRole}, status ${status}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(gate);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(gate);
        }
      }}
      className="cursor-pointer outline-none"
    >
      <circle r={30} fill="transparent" />
      {/* Soft ground shadow under posts */}
      <ellipse cx={-14} cy={14} rx={5.5} ry={2.2} fill="#00020B" fillOpacity={0.85} />
      <ellipse cx={14} cy={14} rx={5.5} ry={2.2} fill="#00020B" fillOpacity={0.85} />

      {/* Restrained gate aura */}
      <circle cx={0} cy={-2} r={20} fill={accent} fillOpacity={0.14} />

      {/* Twin slender dimensional brass gate stanchions */}
      <rect
        x={-16.5}
        y={-15}
        width={4.6}
        height={28}
        rx={2.3}
        fill="url(#station-brass-rim)"
        stroke="#271C0B"
        strokeWidth={0.7}
      />
      <rect
        x={11.9}
        y={-15}
        width={4.6}
        height={28}
        rx={2.3}
        fill="url(#station-brass-rim)"
        stroke="#271C0B"
        strokeWidth={0.7}
      />

      {/* Arching brass header bridge */}
      <path
        d="M -14.2 -13.5 C -14.2 -25.5, 14.2 -25.5, 14.2 -13.5"
        fill="none"
        stroke="#23190A"
        strokeWidth={4.2}
      />
      <path
        d="M -14.2 -13.5 C -14.2 -25.5, 14.2 -25.5, 14.2 -13.5"
        fill="none"
        stroke={accent}
        strokeWidth={2.2}
      />

      {/* Center approval check medallion */}
      <circle
        cx={0}
        cy={-2}
        r={10.2}
        fill="#061028"
        stroke={accent}
        strokeWidth={1.7}
      />
      {isApproved ? (
        <Check width={10.5} height={10.5} x={-5.25} y={-7.25} color="#6EE7B7" strokeWidth={2.7} />
      ) : isRejected ? (
        <AlertTriangle width={10} height={10} x={-5} y={-7} color="#FDA4AF" />
      ) : (
        <Check width={10} height={10} x={-5} y={-7} color="#FFF1C9" strokeWidth={2.2} />
      )}

      {/* Readable label above gate */}
      <foreignObject x={-68} y={-62} width={136} height={36} className="pointer-events-none overflow-visible">
        <div className="text-center leading-tight">
          <p className="text-[11px] font-medium text-[#F7E7BE] line-clamp-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
            {gate.title}
          </p>
        </div>
      </foreignObject>
    </g>
  );
}

/**
 * Renders a user-placed premade cosmetic snap rail piece (straight, quarter turn, U-turn, branch, merge)
 * with dimensional metallic shading, Edit Routes drag handle, rotate/remove controls, and endpoint sockets.
 */
export function PlacedCosmeticRailPiece({
  piece,
  editRoutesMode,
  selected,
  onSelect,
  onPointerDownMove,
  onRotate,
  onDelete,
}: {
  piece: MonorailCosmeticPiece;
  editRoutesMode: boolean;
  selected: boolean;
  onSelect: () => void;
  onPointerDownMove: (e: React.PointerEvent) => void;
  onRotate: () => void;
  onDelete: () => void;
}) {
  const geo = getRailPieceGeometry(piece);

  return (
    <g
      data-interactive-node="true"
      data-testid={`cosmetic-rail-piece-${piece.id}`}
      className={editRoutesMode ? "cursor-move" : "pointer-events-none"}
      onPointerDown={(e) => {
        if (!editRoutesMode) return;
        e.stopPropagation();
        onSelect();
        onPointerDownMove(e);
      }}
      onClick={(e) => {
        if (!editRoutesMode) return;
        e.stopPropagation();
        onSelect();
      }}
    >
      <g transform={`translate(${piece.x}, ${piece.y}) rotate(${piece.rotationDeg})`}>
        {/* Generous invisible hit area in Edit Routes mode */}
        {editRoutesMode && (
          <path
            d={geo.localPathD}
            fill="none"
            stroke="transparent"
            strokeWidth={26}
            strokeLinecap="round"
          />
        )}
        {/* Selection outline halo */}
        {editRoutesMode && selected && (
          <path
            d={geo.localPathD}
            fill="none"
            stroke="#FFF2CC"
            strokeOpacity={0.42}
            strokeWidth={16}
            strokeLinecap="round"
            strokeDasharray="5 4"
          />
        )}
        <MetallicMonorailTrack d={geo.localPathD} variant={piece.routeType} strokeScale={0.95} />
      </g>

      {/* Endpoint sockets visible in Edit Routes mode */}
      {editRoutesMode &&
        geo.worldSockets.map((sock) => (
          <TrackJunctionSocket
            key={`${piece.id}-${sock.name}`}
            x={sock.x}
            y={sock.y}
            routeType={piece.routeType}
            state={selected ? "compatible" : "idle"}
            label={`${piece.kind.replace("_", " ")} (${sock.name} socket)`}
          />
        ))}

      {/* Compact inline Rotate / Remove pill when piece is selected in Edit Routes */}
      {editRoutesMode && selected && (
        <foreignObject
          x={piece.x - 10}
          y={piece.y - 42}
          width={92}
          height={30}
          className="overflow-visible"
        >
          <div
            data-interactive-node="true"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#06132E]/95 border border-[#C9A55A]/65 shadow-lg"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              title="Rotate piece 90°"
              onClick={(e) => {
                e.stopPropagation();
                onRotate();
              }}
              className="p-1 rounded-full text-[#F5E3B8] hover:bg-[#132957] cursor-pointer"
            >
              <RotateCw className="w-3 h-3" />
            </button>
            <button
              type="button"
              title="Remove cosmetic rail piece"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 rounded-full text-rose-300 hover:bg-rose-950/80 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </foreignObject>
      )}
    </g>
  );
}
