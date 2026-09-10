/**
 * Waypoint Signature Pad
 * Provides smooth finger, stylus, and mouse drawing capture for parent signatures.
 */

import React, { useRef, useEffect } from "react";
import SignaturePad from "signature_pad";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Pen, RotateCcw, Check, X } from "lucide-react";
import { WaypointWavyBackdrop, WaypointWaveIcon } from "./WaypointWavyBackdrop";

interface WaypointSignaturePadProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void;
  title?: string;
  description?: string;
}

export function WaypointSignaturePad({
  isOpen,
  onClose,
  onSave,
  title = "Draw Your Signature",
  description = "Use your finger, stylus, or mouse to sign on the line below.",
}: WaypointSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Give modal animation a moment to establish layout dimensions
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(ratio, ratio);
      }

      const pad = new SignaturePad(canvas, {
        penColor: "#051329", // Waypoint executive navy ink
        minWidth: 1.8,
        maxWidth: 3.5,
        throttle: 16,
      });

      signaturePadRef.current = pad;
    }, 120);

    return () => {
      clearTimeout(timer);
      if (signaturePadRef.current) {
        signaturePadRef.current.off();
        signaturePadRef.current = null;
      }
    };
  }, [isOpen]);

  const handleClear = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
    }
  };

  const handleSave = () => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      return;
    }
    const dataUrl = signaturePadRef.current.toDataURL("image/png");
    onSave(dataUrl);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-[92vw] overflow-hidden bg-[#061325] border-blue-900/60 text-white rounded-3xl p-0 shadow-2xl z-[1100]">
        <WaypointWavyBackdrop className="p-5 sm:p-6 flex flex-col">
          <DialogHeader className="relative z-10 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(245,181,68,0.2)]">
                  <Pen className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold text-white tracking-wide">
                    {title}
                  </DialogTitle>
                </div>
              </div>
              <WaypointWaveIcon className="w-7 h-4 text-amber-400/80" />
            </div>
            <DialogDescription className="text-xs text-blue-200/70 pt-1.5">
              {description}
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 relative z-10">
            <div className="relative w-full h-48 bg-white rounded-2xl overflow-hidden border border-blue-800/40 shadow-xl flex flex-col justify-between p-3">
              <canvas
                ref={canvasRef}
                className="w-full h-full touch-none cursor-crosshair"
              />
              {/* Signature line guide */}
              <div className="absolute bottom-8 left-6 right-6 border-b-2 border-slate-300 pointer-events-none flex items-center justify-between text-[11px] font-semibold text-slate-400 select-none pb-1">
                <span>✕ Sign above this line</span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-row items-center justify-between gap-2 sm:gap-3 relative z-10">
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              className="flex-1 border-blue-900/50 bg-[#0A1B33]/80 text-blue-200 hover:bg-[#0E2649] text-xs font-semibold h-10 rounded-xl gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear
            </Button>

            <Button
              type="button"
              onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs h-10 rounded-xl gap-1.5 shadow-[0_0_16px_rgba(245,181,68,0.3)] cursor-pointer transition-transform active:scale-[0.98]"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              Use Signature
            </Button>
          </DialogFooter>
        </WaypointWavyBackdrop>
      </DialogContent>
    </Dialog>
  );
}

