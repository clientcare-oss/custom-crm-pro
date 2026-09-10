/**
 * Waypoint Adjust Edges Modal
 * Allows parents to manually drag and refine the 4 document corners
 * if auto-detection was affected by tricky room lighting or background clutter.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { CornerQuad, Point } from "@/lib/scannerEngine";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Crop, RotateCcw, Check } from "lucide-react";

interface WaypointAdjustEdgesModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  initialCorners: CornerQuad;
  onApplyCorners: (corners: CornerQuad) => void;
}

type CornerKey = keyof CornerQuad;

export function WaypointAdjustEdgesModal({
  isOpen,
  onClose,
  imageSrc,
  initialCorners,
  onApplyCorners,
}: WaypointAdjustEdgesModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [corners, setCorners] = useState<CornerQuad>(initialCorners);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 1, height: 1 });
  const [activeCorner, setActiveCorner] = useState<CornerKey | null>(null);

  // Initialize or reset when opened
  useEffect(() => {
    if (isOpen) {
      setCorners(initialCorners);
      const img = new Image();
      img.onload = () => {
        setNaturalSize({ width: img.naturalWidth || 1, height: img.naturalHeight || 1 });
      };
      img.src = imageSrc;
    }
  }, [isOpen, initialCorners, imageSrc]);

  // Convert image coordinates to container percentage
  const toPercent = useCallback(
    (p: Point) => ({
      x: (p.x / naturalSize.width) * 100,
      y: (p.y / naturalSize.height) * 100,
    }),
    [naturalSize]
  );

  // Handle pointer down on a corner handle
  const handlePointerDown = (key: CornerKey, e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setActiveCorner(key);
  };

  // Handle pointer move while dragging
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeCorner || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    const clientX = Math.max(rect.left, Math.min(rect.right, e.clientX));
    const clientY = Math.max(rect.top, Math.min(rect.bottom, e.clientY));

    const relX = (clientX - rect.left) / rect.width;
    const relY = (clientY - rect.top) / rect.height;

    const imgX = Math.round(relX * naturalSize.width);
    const imgY = Math.round(relY * naturalSize.height);

    setCorners((prev) => ({
      ...prev,
      [activeCorner]: { x: imgX, y: imgY },
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeCorner) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setActiveCorner(null);
    }
  };

  const handleReset = () => {
    setCorners(initialCorners);
  };

  const handleDone = () => {
    onApplyCorners(corners);
    onClose();
  };

  const tl = toPercent(corners.topLeft);
  const tr = toPercent(corners.topRight);
  const br = toPercent(corners.bottomRight);
  const bl = toPercent(corners.bottomLeft);

  const polygonPoints = `${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl w-[94vw] bg-[#06172F] border-blue-900/50 text-white rounded-2xl p-4 sm:p-6 shadow-2xl z-[1150] flex flex-col max-h-[92vh]">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Crop className="w-4 h-4" />
            </div>
            <DialogTitle className="text-base sm:text-lg font-bold text-white">
              Adjust Page Corners
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-blue-200/70 pt-0.5">
            Drag the 4 gold corner circles to align precisely with the paper edges.
          </DialogDescription>
        </DialogHeader>

        {/* Interactive canvas area */}
        <div className="flex-1 min-h-[300px] sm:min-h-[420px] flex items-center justify-center my-2 select-none overflow-hidden">
          <div
            ref={containerRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative max-w-full max-h-[58vh] aspect-[3/4] rounded-xl overflow-hidden shadow-2xl border border-blue-900/40 touch-none"
          >
            {/* Background captured image */}
            <img
              src={imageSrc}
              alt="Scan capture"
              className="w-full h-full object-contain pointer-events-none"
            />

            {/* SVG Polygon overlay */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {/* Darkened background cutout */}
              <polygon
                points={polygonPoints}
                fill="rgba(245, 181, 68, 0.15)"
                stroke="#F5B544"
                strokeWidth="0.75"
                strokeDasharray="1.5 1.5"
              />
            </svg>

            {/* Corner Draggable Handles */}
            {(["topLeft", "topRight", "bottomRight", "bottomLeft"] as CornerKey[]).map((key) => {
              const p = toPercent(corners[key]);
              const isActive = activeCorner === key;

              return (
                <div
                  key={key}
                  onPointerDown={(e) => handlePointerDown(key, e)}
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  className={`absolute w-8 h-8 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing transition-transform touch-none z-20 ${
                    isActive ? "scale-125 z-30" : "hover:scale-110"
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-amber-400 border-2 border-slate-950 shadow-[0_0_12px_rgba(245,181,68,0.8)] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="flex flex-row items-center justify-between gap-2 shrink-0 pt-2 border-t border-blue-900/30">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="border-blue-900/40 text-blue-200 hover:bg-white/10 text-xs font-semibold h-10 rounded-xl gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </Button>

          <Button
            type="button"
            onClick={handleDone}
            className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs h-10 px-5 rounded-xl gap-1.5 shadow-md hover:shadow-amber-400/20 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            Apply Corners
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
