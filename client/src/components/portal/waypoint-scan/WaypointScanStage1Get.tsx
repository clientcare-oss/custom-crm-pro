/**
 * Stage 1: Get Document (Live Camera & File Picker)
 * Styled with the Blue Wavy Theme across the natural workspace (no simulated phone frame).
 */

import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Point, detectDocumentCorners, getNativeFallbackCorners } from "@/lib/scannerEngine";
import {
  Camera,
  FolderOpen,
  RefreshCw,
  Zap,
  AlertCircle,
  ArrowLeft,
  RectangleVertical,
  RectangleHorizontal,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface WaypointScanStage1GetProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraActive: boolean;
  cameraError: string | null;
  orientation: "portrait" | "landscape";
  onToggleOrientation: () => void;
  onSetOrientation: (orient: "portrait" | "landscape") => void;
  onScanPage: () => void;
  onToggleFacingMode: () => void;
  onNativeCapture: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileOpen: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStartCamera: () => void;
  hasExistingPages: boolean;
  onBackToReview?: () => void;
}

export function WaypointScanStage1Get({
  videoRef,
  cameraActive,
  cameraError,
  orientation,
  onToggleOrientation,
  onSetOrientation,
  onScanPage,
  onToggleFacingMode,
  onNativeCapture,
  onFileOpen,
  onStartCamera,
  hasExistingPages,
  onBackToReview,
}: WaypointScanStage1GetProps) {
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileUploadInputRef = useRef<HTMLInputElement | null>(null);

  const [liveCorners, setLiveCorners] = useState<{
    topLeft: Point;
    topRight: Point;
    bottomRight: Point;
    bottomLeft: Point;
  } | null>(null);
  const [isDocDetected, setIsDocDetected] = useState(false);

  // Real-time live paper edge detection loop
  useEffect(() => {
    if (!cameraActive) {
      setLiveCorners(null);
      setIsDocDetected(false);
      return;
    }

    const intervalId = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth) return;

      try {
        const thumbW = 160;
        const thumbH = Math.max(
          100,
          Math.round((video.videoHeight / video.videoWidth) * thumbW)
        );
        const offCanvas = document.createElement("canvas");
        offCanvas.width = thumbW;
        offCanvas.height = thumbH;
        const ctx = offCanvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, thumbW, thumbH);
        const corners = detectDocumentCorners(offCanvas, 0.05);

        // Check if detected corners differ from fallback
        const fb = getNativeFallbackCorners(thumbW, thumbH, 0.05);
        const isFallback =
          Math.abs(corners.topLeft.x - fb.topLeft.x) < 4 &&
          Math.abs(corners.topLeft.y - fb.topLeft.y) < 4 &&
          Math.abs(corners.bottomRight.x - fb.bottomRight.x) < 4 &&
          Math.abs(corners.bottomRight.y - fb.bottomRight.y) < 4;

        if (!isFallback) {
          const toPct = (pt: Point) => ({
            x: Number(((pt.x / thumbW) * 100).toFixed(1)),
            y: Number(((pt.y / thumbH) * 100).toFixed(1)),
          });
          setLiveCorners({
            topLeft: toPct(corners.topLeft),
            topRight: toPct(corners.topRight),
            bottomRight: toPct(corners.bottomRight),
            bottomLeft: toPct(corners.bottomLeft),
          });
          setIsDocDetected(true);
        } else {
          setLiveCorners(null);
          setIsDocDetected(false);
        }
      } catch {
        // Ignore sampling errors
      }
    }, 160);

    return () => clearInterval(intervalId);
  }, [cameraActive, videoRef]);

  return (
    <div
      className={cn(
        "flex-1 flex flex-col items-center justify-center min-h-0 py-4 px-3 sm:px-6 w-full mx-auto transition-all duration-300",
        orientation === "landscape" ? "max-w-3xl" : "max-w-2xl"
      )}
    >
      {cameraActive && !cameraError ? (
        /* Live Camera Viewfinder */
        <div
          className={cn(
            "relative w-full rounded-3xl overflow-hidden border-2 border-blue-900/60 bg-slate-950/80 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col justify-between transition-all duration-300",
            orientation === "landscape"
              ? "max-w-xl sm:max-w-2xl aspect-[4/3] max-h-[66vh]"
              : "max-w-md aspect-[3/4] max-h-[62vh]"
          )}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Top Bar inside Viewfinder */}
          <div className="relative z-20 flex items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent gap-2">
            {/* Left: Back to review if pages exist, or lightning badge */}
            {hasExistingPages && onBackToReview ? (
              <button
                type="button"
                onClick={onBackToReview}
                className="p-2 rounded-xl bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-colors cursor-pointer shrink-0 border border-white/10"
                title="Back to review pages"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="p-2 rounded-xl bg-black/50 text-amber-300 backdrop-blur-md shrink-0 border border-white/10">
                <Zap className="w-4 h-4" />
              </div>
            )}

            {/* Center: Segmented Orientation Selector Pill */}
            <div className="flex items-center bg-black/70 backdrop-blur-md rounded-full p-1 border border-white/15 shadow-lg">
              <button
                type="button"
                onClick={() => onSetOrientation("portrait")}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                  orientation === "portrait"
                    ? "bg-amber-400 text-slate-950 shadow-md font-bold"
                    : "text-white/80 hover:text-white"
                )}
                title="Portrait Mode (Standard 8.5 × 11 vertical documents)"
              >
                <RectangleVertical className="w-3.5 h-3.5" />
                <span>Portrait</span>
              </button>
              <button
                type="button"
                onClick={() => onSetOrientation("landscape")}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                  orientation === "landscape"
                    ? "bg-amber-400 text-slate-950 shadow-md font-bold"
                    : "text-white/80 hover:text-white"
                )}
                title="Landscape Mode (Wide 11 × 8.5 horizontal documents & tables)"
              >
                <RectangleHorizontal className="w-3.5 h-3.5" />
                <span>Landscape</span>
              </button>
            </div>

            {/* Right: Dropdown / Quick Action Button prompting Orientation & Camera */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="p-2 rounded-xl bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-colors cursor-pointer shrink-0 border border-white/10 flex items-center gap-1 hover:border-amber-400/50"
                  title={
                    orientation === "portrait"
                      ? "Portrait Mode active — Click to switch to Landscape or view options"
                      : "Landscape Mode active — Click to switch to Portrait or view options"
                  }
                >
                  {orientation === "portrait" ? (
                    <RectangleVertical className="w-4 h-4 text-amber-300" />
                  ) : (
                    <RectangleHorizontal className="w-4 h-4 text-amber-300" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-slate-950/95 border border-blue-900/60 text-white backdrop-blur-xl rounded-2xl p-1.5 shadow-2xl z-[100]"
              >
                <div className="px-3 py-2 text-[11px] font-semibold text-blue-200/60 uppercase tracking-wider">
                  Viewport Orientation
                </div>
                <DropdownMenuItem
                  onClick={() => onSetOrientation("portrait")}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer focus:bg-blue-600/30",
                    orientation === "portrait" && "text-amber-300 font-bold bg-amber-400/15"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <RectangleVertical className="w-4 h-4 text-amber-400" />
                    <div>
                      <p className="leading-none">Portrait Mode</p>
                      <p className="text-[10px] text-blue-200/60 mt-0.5">8.5" × 11" vertical</p>
                    </div>
                  </div>
                  {orientation === "portrait" && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => onSetOrientation("landscape")}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer focus:bg-blue-600/30",
                    orientation === "landscape" && "text-amber-300 font-bold bg-amber-400/15"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <RectangleHorizontal className="w-4 h-4 text-amber-400" />
                    <div>
                      <p className="leading-none">Landscape Mode</p>
                      <p className="text-[10px] text-blue-200/60 mt-0.5">11" × 8.5" horizontal</p>
                    </div>
                  </div>
                  {orientation === "landscape" && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </DropdownMenuItem>

                <div className="my-1 border-t border-white/10" />

                <DropdownMenuItem
                  onClick={onToggleFacingMode}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs cursor-pointer text-white/80 hover:text-white focus:bg-blue-600/30"
                >
                  <RefreshCw className="w-4 h-4 text-blue-400" />
                  <span>Flip Camera (Front / Back)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Live Document Edge Detection Polygon or Alignment Guide */}
          {liveCorners ? (
            <div className="relative z-10 flex-1 m-2 pointer-events-none flex flex-col justify-between">
              <svg className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-150">
                <polygon
                  points={`${liveCorners.topLeft.x}%,${liveCorners.topLeft.y}% ${liveCorners.topRight.x}%,${liveCorners.topRight.y}% ${liveCorners.bottomRight.x}%,${liveCorners.bottomRight.y}% ${liveCorners.bottomLeft.x}%,${liveCorners.bottomLeft.y}%`}
                  className="fill-emerald-400/15 stroke-emerald-400 stroke-2"
                  strokeDasharray="6 3"
                />
                {[
                  liveCorners.topLeft,
                  liveCorners.topRight,
                  liveCorners.bottomRight,
                  liveCorners.bottomLeft,
                ].map((c, i) => (
                  <circle
                    key={i}
                    cx={`${c.x}%`}
                    cy={`${c.y}%`}
                    r="6"
                    className="fill-emerald-300 stroke-slate-950 stroke-2 shadow-lg"
                  />
                ))}
              </svg>
              <div className="mt-auto mx-auto mb-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-400/60 backdrop-blur-md text-[11px] font-bold text-emerald-300 flex items-center gap-1.5 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                Paper Edges Locked · Perspective Ready
              </div>
            </div>
          ) : (
            /* Glowing Golden Contour Box on Viewfinder */
            <div
              className={cn(
                "relative z-10 flex-1 border-2 border-amber-400/90 rounded-2xl pointer-events-none shadow-[0_0_35px_rgba(245,181,68,0.85)] flex flex-col justify-between p-3 animate-pulse transition-all duration-300",
                orientation === "portrait" ? "m-6 sm:m-8" : "m-4 sm:m-6"
              )}
            >
              <div className="flex justify-between">
                <span className="w-4 h-4 border-t-2 border-l-2 border-amber-300" />
                <span className="w-4 h-4 border-t-2 border-r-2 border-amber-300" />
              </div>
              <div className="flex justify-between">
                <span className="w-4 h-4 border-b-2 border-l-2 border-amber-300" />
                <span className="w-4 h-4 border-b-2 border-r-2 border-amber-300" />
              </div>
            </div>
          )}

          {/* Bottom Shutter Controls */}
          <div className="relative z-20 pb-5 pt-3 px-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col items-center gap-2.5">
            <button
              type="button"
              onClick={onScanPage}
              className="w-16 h-16 rounded-full border-4 border-slate-900 bg-white ring-4 ring-white/50 shadow-2xl active:scale-95 transition-transform cursor-pointer"
              title="Capture"
            />
            <Button
              type="button"
              onClick={onScanPage}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-sm py-2 px-8 rounded-2xl shadow-xl hover:shadow-amber-400/20 cursor-pointer"
            >
              Scan Page
            </Button>
          </div>
        </div>
      ) : (
        /* Choice Screen: Two Large Option Cards */
        <div className="w-full max-w-lg space-y-4 py-6">
          <div className="text-center space-y-1 mb-6">
            <h3 className="text-lg sm:text-xl font-serif font-bold text-white tracking-wide">
              How would you like to add your document?
            </h3>
            <p className="text-xs text-blue-200/70">
              Works directly from your mobile phone, tablet, or desktop browser.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Choice 1: Scan Document (Camera) */}
            <button
              type="button"
              onClick={() => {
                if (nativeCameraInputRef.current) {
                  nativeCameraInputRef.current.click();
                } else {
                  onStartCamera();
                }
              }}
              className="p-6 rounded-3xl bg-[#091D3C]/90 hover:bg-[#0E2954] border-2 border-amber-400/40 hover:border-amber-400 text-left flex flex-col justify-between gap-4 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_15px_40px_rgba(245,181,68,0.2)] cursor-pointer group backdrop-blur-md"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-400/15 border border-amber-400/30 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                <Camera className="w-7 h-7" />
              </div>
              <div>
                <p className="text-base font-extrabold text-white group-hover:text-amber-300">
                  Scan Document
                </p>
                <p className="text-xs text-blue-200/70 mt-1 leading-relaxed">
                  Use your device camera with auto-edge detection and perspective correction.
                </p>
              </div>
              <div className="flex items-center text-xs font-bold text-amber-400 pt-1">
                <span>Start Camera →</span>
              </div>
            </button>

            {/* Choice 2: Open Document (File/PDF) */}
            <button
              type="button"
              onClick={() => fileUploadInputRef.current?.click()}
              className="p-6 rounded-3xl bg-[#091D3C]/90 hover:bg-[#0E2954] border-2 border-blue-500/40 hover:border-blue-400 text-left flex flex-col justify-between gap-4 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_15px_40px_rgba(59,130,246,0.2)] cursor-pointer group backdrop-blur-md"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-400/30 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                <FolderOpen className="w-7 h-7" />
              </div>
              <div>
                <p className="text-base font-extrabold text-white group-hover:text-blue-300">
                  Open Document
                </p>
                <p className="text-xs text-blue-200/70 mt-1 leading-relaxed">
                  Select an existing PDF file or saved photo from your device.
                </p>
              </div>
              <div className="flex items-center text-xs font-bold text-blue-400 pt-1">
                <span>Choose File →</span>
              </div>
            </button>
          </div>

          {cameraError && (
            <div className="mt-4 p-3 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs flex items-center gap-2.5 text-left backdrop-blur-md">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}
        </div>
      )}

      {/* Hidden File Inputs for native mobile camera / browser picker */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onNativeCapture}
        className="hidden"
      />
      <input
        ref={fileUploadInputRef}
        type="file"
        accept="application/pdf,image/*"
        onChange={onFileOpen}
        className="hidden"
      />
    </div>
  );
}

export default WaypointScanStage1Get;
