import {
  getRailPieceGeometry,
  type MonorailCosmeticPiece,
  type MonorailGeometry,
  type RailPieceKind,
  type RailTrayItemKind,
  type WorkflowStageDefinition,
} from "@shared/workflowModel";
import type { CanvasSocket } from "./MonorailTrackElements";

export const COSMETIC_PIECE_KINDS = new Set<RailTrayItemKind>([
  "straight",
  "quarter_turn",
  "u_turn",
  "branch",
  "merge",
]);

export function isCosmeticPieceKind(kind: RailTrayItemKind): kind is RailPieceKind {
  return COSMETIC_PIECE_KINDS.has(kind);
}

/**
 * Computes all active connection sockets across stations, gold transitions,
 * and placed cosmetic rail pieces in world SVG coordinates.
 */
export function buildCanvasSockets(
  stages: WorkflowStageDefinition[],
  geometry: MonorailGeometry,
  railPieces: MonorailCosmeticPiece[]
): CanvasSocket[] {
  const sockets: CanvasSocket[] = [];

  for (const stage of stages) {
    const pos = geometry.stationMap[stage.id];
    if (!pos) continue;

    // Gold main-line entry & exit sockets at left/right rims of circular station
    const outAngle = pos.direction === 1 ? 0 : 180;
    const inAngle = pos.direction === 1 ? 180 : 0;
    const outX = pos.x + pos.direction * 35;
    const inX = pos.x - pos.direction * 35;

    sockets.push({
      id: `st:${stage.id}:out`,
      targetType: "station",
      targetId: stage.id,
      socketName: "out",
      accepts: "rail",
      routeType: "main",
      x: outX,
      y: pos.y,
      angleDeg: outAngle,
      label: `${stage.name} · Gold rail exit socket`,
    });

    sockets.push({
      id: `st:${stage.id}:in`,
      targetType: "station",
      targetId: stage.id,
      socketName: "in",
      accepts: "rail",
      routeType: "main",
      x: inX,
      y: pos.y,
      angleDeg: inAngle,
      label: `${stage.name} · Gold rail entry socket`,
    });

    // Blue Guide-step socket beneath the circular station
    sockets.push({
      id: `st:${stage.id}:guide`,
      targetType: "station",
      targetId: stage.id,
      socketName: "guide",
      accepts: "guide",
      routeType: "guide",
      x: pos.x - 16,
      y: pos.y + 30,
      angleDeg: 90,
      label: `${stage.name} · Blue guide-step socket`,
    });

    // Violet Automation socket on the station rim
    sockets.push({
      id: `st:${stage.id}:automation`,
      targetType: "station",
      targetId: stage.id,
      socketName: "automation",
      accepts: "automation",
      routeType: "automation",
      x: pos.x + 16,
      y: pos.y + 30,
      angleDeg: 90,
      label: `${stage.name} · Violet automation socket`,
    });
  }

  // Gold transition midpoint sockets (compatible with Approval Gates & inserting Stations)
  for (const seg of geometry.segmentPaths) {
    sockets.push({
      id: `seg:${seg.fromStageId}:${seg.toStageId}`,
      targetType: "segment",
      targetId: seg.fromStageId,
      toStageId: seg.toStageId,
      socketName: "midpoint",
      accepts: "gate_or_station",
      routeType: "main",
      x: seg.midPoint.x,
      y: seg.midPoint.y,
      angleDeg: seg.angleDeg,
      label: "Gold transition slot (Approval gate or insert station)",
    });
  }

  // Endpoint sockets on already-placed cosmetic snap rail pieces
  for (const piece of railPieces) {
    const geo = getRailPieceGeometry(piece);
    for (const ws of geo.worldSockets) {
      sockets.push({
        id: `pc:${piece.id}:${ws.name}`,
        targetType: "piece",
        targetId: piece.id,
        socketName: ws.name,
        accepts: "rail",
        routeType: piece.routeType,
        x: ws.x,
        y: ws.y,
        angleDeg: ws.angleDeg,
        label: `${piece.kind.replace("_", " ")} · ${ws.name} socket`,
      });
    }
  }

  return sockets;
}

/** Strict compatibility check between a tray/dragged piece and a canvas socket */
export function isPieceCompatibleWithSocket(
  kind: RailTrayItemKind,
  socket: CanvasSocket,
  excludePieceId?: string | null
): boolean {
  if (excludePieceId && socket.targetType === "piece" && socket.targetId === excludePieceId) {
    return false;
  }

  if (isCosmeticPieceKind(kind)) {
    return socket.accepts === "rail";
  }
  if (kind === "guide_step") {
    return socket.accepts === "guide";
  }
  if (kind === "automation") {
    return socket.accepts === "automation";
  }
  if (kind === "approval_gate") {
    return socket.accepts === "gate_or_station";
  }
  if (kind === "station") {
    return socket.accepts === "gate_or_station" || socket.accepts === "rail";
  }
  return false;
}

/** Clear short explanation when the user attempts an invalid socket connection */
export function explainInvalidConnection(
  kind: RailTrayItemKind,
  nearestSocket: CanvasSocket | null
): string {
  if (kind === "approval_gate") {
    return nearestSocket
      ? "Invalid connection: Approval gates can only snap onto a gold transition between two stations."
      : "Place Approval gates directly onto a gold track transition between two stations.";
  }
  if (kind === "guide_step") {
    return "Invalid connection: Guide steps must snap to a station's blue guide socket.";
  }
  if (kind === "automation") {
    return "Invalid connection: Automations must snap to a station's violet automation socket.";
  }
  if (kind === "station") {
    return "Snap a Station onto a gold transition slot or station rail exit socket.";
  }
  return nearestSocket?.accepts === "guide"
    ? "Invalid connection: Gold track bends cannot snap onto a blue guide-step socket."
    : nearestSocket?.accepts === "automation"
    ? "Invalid connection: Gold track bends cannot snap onto a violet automation socket."
    : "Invalid connection: Snap track pieces onto a compatible gold rail socket.";
}

export function findNearestSocket(
  worldX: number,
  worldY: number,
  sockets: CanvasSocket[],
  maxRadius = 74,
  excludePieceId?: string | null
): { socket: CanvasSocket; dist: number } | null {
  let best: { socket: CanvasSocket; dist: number } | null = null;
  for (const s of sockets) {
    if (excludePieceId && s.targetType === "piece" && s.targetId === excludePieceId) continue;
    const dist = Math.hypot(s.x - worldX, s.y - worldY);
    if (dist <= maxRadius && (!best || dist < best.dist)) {
      best = { socket: s, dist };
    }
  }
  return best;
}

/**
 * Keeps connected cosmetic rail pieces attached when a station or parent rail piece is moved!
 * Recursively propagates delta (dx, dy) to any child piece attached to moved parent(s).
 */
export function translateAttachedRailPieces(
  pieces: MonorailCosmeticPiece[],
  rootTargetType: "station" | "piece",
  rootTargetId: string,
  dx: number,
  dy: number
): MonorailCosmeticPiece[] {
  if (dx === 0 && dy === 0) return pieces;

  // BFS to find all transitively attached pieces
  const movedPieceIds = new Set<string>();
  const queue: Array<{ type: "station" | "piece"; id: string }> = [
    { type: rootTargetType, id: rootTargetId },
  ];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const p of pieces) {
      if (movedPieceIds.has(p.id)) continue;
      if (
        p.attachedTo &&
        p.attachedTo.targetType === curr.type &&
        p.attachedTo.targetId === curr.id
      ) {
        movedPieceIds.add(p.id);
        queue.push({ type: "piece", id: p.id });
      }
    }
  }

  if (movedPieceIds.size === 0 && rootTargetType === "station") return pieces;

  return pieces.map((p) => {
    if (
      (rootTargetType === "piece" && p.id === rootTargetId) ||
      movedPieceIds.has(p.id)
    ) {
      return {
        ...p,
        x: Math.round(p.x + dx),
        y: Math.round(p.y + dy),
      };
    }
    return p;
  });
}
