/**
 * Stage 1: Get Document (Live Camera & File Picker)
 * Styled with the Blue Wavy Theme across the natural workspace (no simulated phone frame).
 */

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, FolderOpen, RefreshCw, Zap, AlertCircle, ArrowLeft } from "lucide-react";

interface WaypointScanStage1GetProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraActive: boolean;
  cameraError: string | null;
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

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-0 py-4 px-3 sm:px-6 w-full max-w-2xl mx-auto">
      {cameraActive && !cameraError ? (
        /* Live Camera Viewfinder */
        <div className="relative w-full max-w-md aspect-[3/4] max-h-[62vh] rounded-3xl overflow-hidden border-2 border-blue-900/60 bg-slate-950/80 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col justify-between">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Top Bar inside Viewfinder */}
          <div className="relative z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
            {hasExistingPages && onBackToReview ? (
              <button
                type="button"
                onClick={onBackToReview}
                className="p-2 rounded-xl bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors cursor-pointer"
                title="Back to pages"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="p-2 rounded-xl bg-black/40 text-amber-300 backdrop-blur-md">
                <Zap className="w-4 h-4" />
              </div>
            )}

            <div className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-white text-xs font-semibold border border-white/15 shadow-md">
              Point camera at document
            </div>

            <button
              type="button"
              onClick={onToggleFacingMode}
              className="p-2 rounded-xl bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors cursor-pointer"
              title="Flip camera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Glowing Golden Contour Box on Viewfinder */}
          <div className="relative z-10 m-6 sm:m-8 flex-1 border-2 border-amber-400/90 rounded-2xl pointer-events-none shadow-[0_0_35px_rgba(245,181,68,0.85)] flex flex-col justify-between p-3 animate-pulse">
            <div className="flex justify-between">
              <span className="w-4 h-4 border-t-2 border-l-2 border-amber-300" />
              <span className="w-4 h-4 border-t-2 border-r-2 border-amber-300" />
            </div>
            <div className="flex justify-between">
              <span className="w-4 h-4 border-b-2 border-l-2 border-amber-300" />
              <span className="w-4 h-4 border-b-2 border-r-2 border-amber-300" />
            </div>
          </div>

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
