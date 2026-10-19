import React, { useState, useRef, useEffect } from "react";
import SignaturePad from "signature_pad";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  PenTool,
  RotateCcw,
  Check,
  FileSignature,
  Type,
  ShieldCheck,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";

export interface AdoptedSignatureData {
  signatureName: string;
  signatureDate: string;
  signatureDataUrl?: string;
  signatureStyle?: string;
  signatureScale?: number;
  signatureType?: "type" | "draw";
}

interface AdoptAndSignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdopt: (data: AdoptedSignatureData) => void;
  initialName?: string;
  initialDate?: string;
  initialScale?: number;
  initialStyle?: string;
  initialType?: "type" | "draw";
}

export const SIGNATURE_STYLES = [
  {
    id: "dancing-script",
    name: "Executive Flow",
    fontFamily: "'Dancing Script', cursive",
    letterSpacing: "0.02em",
  },
  {
    id: "great-vibes",
    name: "Formal Calligraphy",
    fontFamily: "'Great Vibes', cursive",
    letterSpacing: "0.04em",
  },
  {
    id: "caveat",
    name: "Modern Hand",
    fontFamily: "'Caveat', cursive",
    letterSpacing: "0.01em",
  },
  {
    id: "alex-brush",
    name: "Classic Script",
    fontFamily: "'Alex Brush', cursive",
    letterSpacing: "0.05em",
  },
];

export function AdoptAndSignModal({
  isOpen,
  onClose,
  onAdopt,
  initialName = "Byron Honea",
  initialDate,
  initialScale = 1.35,
  initialStyle,
  initialType = "type",
}: AdoptAndSignModalProps) {
  const [activeTab, setActiveTab] = useState<"type" | "draw">(() => initialType || "type");
  const [name, setName] = useState(initialName);
  const [selectedStyleId, setSelectedStyleId] = useState(() => initialStyle || SIGNATURE_STYLES[0].id);
  const [scalePercent, setScalePercent] = useState(() => Math.round((initialScale || 1.35) * 100));

  // Compute initials from name
  const computeInitials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return "BH";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const [initials, setInitials] = useState(() => computeInitials(initialName));

  // Today's date in MM/DD/YYYY format
  const getTodayFormatted = () => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  const [signDate, setSignDate] = useState(() => initialDate || getTodayFormatted());

  // Keep state in sync with latest props whenever modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialName) {
        setName(initialName);
        setInitials(computeInitials(initialName));
      }
      if (initialStyle) setSelectedStyleId(initialStyle);
      if (initialScale) setScalePercent(Math.round(initialScale * 100));
      if (initialDate) setSignDate(initialDate);
      if (initialType) setActiveTab(initialType);
    }
  }, [isOpen, initialName, initialStyle, initialScale, initialDate, initialType]);

  // Freehand canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);

  // Reset initials when name changes
  const handleNameChange = (val: string) => {
    setName(val);
    setInitials(computeInitials(val));
  };

  // Initialize SignaturePad when draw tab is opened
  useEffect(() => {
    if (!isOpen || activeTab !== "draw") return;

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
        penColor: "#051329", // Executive deep navy ink
        minWidth: 2.8,
        maxWidth: 6.0,
        throttle: 16,
      });

      pad.addEventListener("endStroke", () => {
        setHasDrawnSignature(!pad.isEmpty());
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
  }, [isOpen, activeTab]);

  const handleClearDrawing = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      setHasDrawnSignature(false);
    }
  };

  // Trim transparent outer whitespace so signature strokes fill the display area cleanly
  const trimCanvasWhitespace = (canvas: HTMLCanvasElement): string => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas.toDataURL("image/png");

    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let hasPixels = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 10) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          hasPixels = true;
        }
      }
    }

    if (!hasPixels) return canvas.toDataURL("image/png");

    const pad = 8;
    const cropX = Math.max(0, minX - pad);
    const cropY = Math.max(0, minY - pad);
    const cropW = Math.min(width - cropX, maxX - minX + pad * 2);
    const cropH = Math.min(height - cropY, maxY - minY + pad * 2);

    const trimmedCanvas = document.createElement("canvas");
    trimmedCanvas.width = cropW;
    trimmedCanvas.height = cropH;
    const trimmedCtx = trimmedCanvas.getContext("2d");
    if (!trimmedCtx) return canvas.toDataURL("image/png");

    trimmedCtx.drawImage(
      canvas,
      cropX, cropY, cropW, cropH,
      0, 0, cropW, cropH
    );

    return trimmedCanvas.toDataURL("image/png");
  };

  // Convert typed cursive text to a crisp transparent PNG for true cross-platform parity
  const generatePngFromFont = (
    textToRender: string,
    fontFamily: string,
    scaleFactor: number = 1.35
  ): Promise<string> => {
    return new Promise((resolve) => {
      try {
        const offCanvas = document.createElement("canvas");
        offCanvas.width = 1400;
        offCanvas.height = 360;
        const ctx = offCanvas.getContext("2d");
        if (!ctx) {
          resolve("");
          return;
        }

        const baseFontSize = Math.round(150 * scaleFactor);
        ctx.clearRect(0, 0, offCanvas.width, offCanvas.height);
        ctx.fillStyle = "#07162B"; // deep legal ink
        ctx.font = `italic bold ${baseFontSize}px ${fontFamily}, Georgia, serif`;
        ctx.textBaseline = "middle";
        ctx.fillText(textToRender, 40, 180);

        const trimmed = trimCanvasWhitespace(offCanvas);
        resolve(trimmed || offCanvas.toDataURL("image/png"));
      } catch {
        resolve("");
      }
    });
  };

  // Adopt and apply signature
  const handleAdoptAndSign = async () => {
    if (!name.trim()) {
      toast.error("Please enter your name to adopt a signature");
      return;
    }

    let finalDataUrl = "";
    if (activeTab === "draw") {
      if (!signaturePadRef.current || signaturePadRef.current.isEmpty() || !canvasRef.current) {
        toast.error("Please draw your signature or switch to 'Select Style'");
        return;
      }
      finalDataUrl = trimCanvasWhitespace(canvasRef.current);
    }

    onAdopt({
      signatureName: name.trim(),
      signatureDate: signDate.trim() || getTodayFormatted(),
      signatureDataUrl: activeTab === "draw" ? (finalDataUrl || undefined) : undefined,
      signatureStyle: selectedStyleId,
      signatureScale: scalePercent / 100,
      signatureType: activeTab,
    });

    toast.success("Signature adopted & applied to official complaint filing");
    onClose();
  };

  const activeStyle =
    SIGNATURE_STYLES.find((s) => s.id === selectedStyleId) || SIGNATURE_STYLES[0];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-3xl w-[94vw] max-h-[90vh] flex flex-col bg-[#05142B] border border-[#3A2C18] text-slate-100 rounded-xl p-0 shadow-2xl overflow-hidden z-[1150] gap-0">
        {/* Header Bar — Pinned at Top */}
        <DialogHeader className="shrink-0 px-5 sm:px-6 py-3.5 sm:py-4 border-b border-[#3A2C18] bg-[#07162B] text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] flex items-center justify-center text-[#07162B] shadow-[0_2px_8px_rgba(0,0,0,0.5)] shrink-0">
                <FileSignature className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <DialogTitle className="font-serif text-base sm:text-lg text-[#FFF4D4] font-bold tracking-wide">
                  Adopt Your Signature
                </DialogTitle>
                <DialogDescription className="text-[11px] sm:text-xs text-[#C6B697] font-sans mt-0.5">
                  Confirm your name, initials, and signature style for the official GaDOE filing.
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#020A17] border border-emerald-500/30 text-emerald-300 text-[10px] font-mono uppercase font-semibold shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>34 C.F.R. § 300.153</span>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body — Scrollable Middle Area */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4 space-y-4 custom-scrollbar">
          {/* Signer Demographics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs font-semibold text-[#DFBE77] flex items-center gap-1.5">
                <span>Full Legal Name</span>
                <span className="text-slate-400 font-normal">(Printed on filing)</span>
              </Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Byron Honea"
                className="bg-[#020A17] border-[#3A2C18] focus:border-[#C5A059] text-white text-sm h-8.5 rounded-md"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#DFBE77]">Initials</Label>
              <Input
                type="text"
                value={initials}
                onChange={(e) => setInitials(e.target.value.toUpperCase())}
                placeholder="BH"
                maxLength={4}
                className="bg-[#020A17] border-[#3A2C18] focus:border-[#C5A059] text-white text-sm h-8.5 rounded-md uppercase font-mono"
              />
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-[#020A17] p-1 rounded-lg border border-[#3A2C18] gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("type")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer",
                activeTab === "type"
                  ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-sm"
                  : "text-[#C6B697] hover:text-[#FFF4D4] hover:bg-white/[0.05]"
              )}
            >
              <Type className="w-4 h-4" />
              <span>Select Style (Typed Cursive)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("draw")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer",
                activeTab === "draw"
                  ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold shadow-sm"
                  : "text-[#C6B697] hover:text-[#FFF4D4] hover:bg-white/[0.05]"
              )}
            >
              <PenTool className="w-4 h-4" />
              <span>Draw Signature (Mouse / Stylus)</span>
            </button>
          </div>

          {/* TAB 1: SELECT CURSIVE SIGNATURE STYLE */}
          {activeTab === "type" && (
            <div className="space-y-3.5">
              {/* Master Active Live Signature Preview Banner */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-b from-[#0B213F] to-[#040E1B] border-2 border-[#DFBE77] shadow-[0_4px_20px_rgba(0,0,0,0.6)] text-left relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-[#DFBE77] font-semibold mb-1">
                  <span className="flex items-center gap-2 uppercase tracking-wider text-[11px] font-mono">
                    <FileSignature className="w-3.5 h-3.5 text-[#FFE394]" />
                    <span>Live Filing Signature Preview</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-[#DFBE77] px-2 py-0.5 rounded bg-[#020A17] border border-[#3A2C18] font-bold">
                      {scalePercent}% Scale
                    </span>
                    <span className="text-[11px] font-mono text-[#FFF4D4] px-2.5 py-0.5 rounded bg-[#020A17] border border-[#3A2C18] font-bold">
                      {activeStyle.name}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: activeStyle.fontFamily,
                    letterSpacing: activeStyle.letterSpacing,
                    fontSize: `${Math.max(26, Math.min(64, Math.round(34 * (scalePercent / 100))))}px`,
                  }}
                  className="text-[#FFF4D4] py-2 text-center sm:text-left drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] select-none truncate font-normal leading-tight transition-all"
                >
                  {name.trim() || "Byron Honea"}
                </div>
                <div className="text-[11px] font-mono text-[#A69371] border-t border-[#3A2C18]/60 pt-1.5 flex items-center justify-between">
                  <span>Initials: <strong style={{ fontFamily: activeStyle.fontFamily }} className="text-lg text-[#FFE394] ml-1.5">{initials}</strong></span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Scaled to {scalePercent}%</span>
                  </span>
                </div>
              </div>

              {/* Interactive Signature Size Controller */}
              <div className="p-3 rounded-lg bg-[#020A17] border border-[#3A2C18] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#DFBE77]" />
                    <span className="text-xs font-semibold text-[#DFBE77]">Adjust Signature Size</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#091D38] border border-[#DFBE77]/40 text-[#FFF4D4] font-mono text-xs font-bold">
                    {scalePercent}%
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-[#A69371] font-mono shrink-0">Smaller</span>
                  <input
                    type="range"
                    min={25}
                    max={225}
                    step={5}
                    value={scalePercent}
                    onChange={(e) => setScalePercent(Number(e.target.value))}
                    className="w-full accent-[#DFBE77] cursor-pointer h-1.5 bg-[#05142B] rounded-lg"
                  />
                  <span className="text-[10px] text-[#A69371] font-mono shrink-0">Larger</span>
                </div>

                <div className="flex items-center justify-between gap-1 pt-1">
                  {[
                    { label: "50%", val: 50 },
                    { label: "75%", val: 75 },
                    { label: "100%", val: 100 },
                    { label: "125%", val: 125 },
                    { label: "150%", val: 150 },
                    { label: "175%", val: 175 },
                    { label: "200%", val: 200 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setScalePercent(preset.val)}
                      className={cn(
                        "flex-1 py-1 px-1 rounded text-[10px] font-mono transition-all border cursor-pointer",
                        scalePercent === preset.val
                          ? "bg-[#DFBE77] text-[#07162B] font-bold border-[#DFBE77] shadow-xs"
                          : "bg-[#05142B] text-[#C6B697] border-[#3A2C18] hover:text-[#FFF4D4] hover:border-[#6B5328]"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <Label className="text-xs font-semibold text-[#DFBE77] block">
                Choose Signature Font Flourish
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SIGNATURE_STYLES.map((style) => {
                  const isSelected = selectedStyleId === style.id;
                  return (
                    <div
                      key={style.id}
                      onClick={() => setSelectedStyleId(style.id)}
                      className={cn(
                        "relative p-3 sm:p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between min-h-[95px] sm:min-h-[105px]",
                        isSelected
                          ? "bg-[#091D38] border-[#DFBE77] shadow-[0_0_14px_rgba(223,190,119,0.3)] ring-2 ring-[#DFBE77]"
                          : "bg-[#020A17]/85 border-[#3A2C18] hover:border-[#6B5328] hover:bg-[#07162B]"
                      )}
                    >
                      <div className="flex items-center justify-between text-xs font-mono text-[#A69371] mb-0.5">
                        <span className="font-semibold text-[11px]">{style.name}</span>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-[#DFBE77] text-[#07162B] flex items-center justify-center shadow-sm">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          fontFamily: style.fontFamily,
                          letterSpacing: style.letterSpacing,
                        }}
                        className="text-2xl sm:text-3xl text-[#FFF4D4] truncate py-1 leading-snug drop-shadow-sm"
                      >
                        {name.trim() || "Byron Honea"}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#C6B697]/70 font-mono pt-1 border-t border-[#3A2C18]/60">
                        <span>Initials:</span>
                        <span
                          style={{ fontFamily: style.fontFamily }}
                          className="text-sm text-[#FFE394]"
                        >
                          {initials}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: DRAW FREEHAND SIGNATURE */}
          {activeTab === "draw" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-[#DFBE77]">
                  Draw signature with mouse or stylus (bold fountain pen weight)
                </Label>
                <button
                  type="button"
                  onClick={handleClearDrawing}
                  className="flex items-center gap-1 text-[11px] text-[#FFE394] hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear Drawing</span>
                </button>
              </div>

              <div className="relative w-full h-[170px] bg-white rounded-lg border border-[#3A2C18] overflow-hidden shadow-inner flex flex-col justify-end">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full cursor-crosshair touch-none"
                />
                {/* Signature Baseline Guide */}
                <div className="absolute bottom-8 left-6 right-6 h-[1px] border-b border-dashed border-slate-300 pointer-events-none flex items-center justify-between px-2 text-[10px] font-mono text-slate-400">
                  <span>Sign Above Formal Line</span>
                  <span>✕</span>
                </div>
              </div>
            </div>
          )}

          {/* Execution Date & Legal Agreement */}
          <div className="p-3 rounded-lg bg-[#020A17] border border-[#3A2C18] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#C6B697] font-medium">Signature Execution Date:</span>
              <Input
                type="text"
                value={signDate}
                onChange={(e) => setSignDate(e.target.value)}
                placeholder="MM/DD/YYYY"
                className="w-32 bg-[#05142B] border-[#3A2C18] text-[#FFF4D4] text-xs h-7 text-center rounded font-mono"
              />
            </div>
            <p className="text-[11px] text-[#A69371] leading-relaxed">
              By clicking <strong className="text-[#FFF4D4]">"Adopt and Sign"</strong>, I agree that this electronic signature is as legally binding, valid, and enforceable as my original handwritten signature under Georgia Comp. R. & Regs. 160-4-7-.12, 34 C.F.R. § 300.153, UETA, and the federal E-SIGN Act.
            </p>
          </div>
        </div>

        {/* Footer Actions — Pinned at Bottom */}
        <DialogFooter className="shrink-0 px-5 sm:px-6 py-3 sm:py-3.5 border-t border-[#3A2C18] bg-[#07162B] flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-[#3A2C18] bg-[#020A17] text-[#C6B697] hover:text-white hover:bg-[#07162B] text-xs h-8.5 cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleAdoptAndSign}
            className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs h-8.5 px-5 gap-2 rounded-md border border-[#FFE394]/70 shadow-[0_3px_12px_rgba(0,0,0,0.8)] hover:brightness-105 cursor-pointer"
          >
            <FileSignature className="w-4 h-4" />
            <span>Adopt and Sign</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
