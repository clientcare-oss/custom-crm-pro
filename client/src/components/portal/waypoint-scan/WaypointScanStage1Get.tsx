/**
 * Stage 1: Get Document (Live Camera & File Picker)
 * Styled with the Blue Wavy Theme & Phone Viewport matching the visual spec.
 */

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, FolderOpen, RefreshCw, Zap, AlertCircle } from "lucide-react";
import { WaypointWaveIcon } from "../WaypointWavyBackdrop";

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
    <div className="flex-1 flex flex-col items-center justify-center min-h-0 py-2">
      {/* Mobile Device Frame Container */}
      <div className="relative w-full max-w-sm sm:max-w-md bg-[#040C1A] rounded-[2.5rem] border-4 border-slate-800 shadow-[0_15px_40px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col aspect-[9/16] max-h-[66vh]">
        
        {/* Phone Top Notch / Status Bar */}
        <div className="px-6 pt-3 pb-2 flex items-center justify-between text-white/70 text-[11px] font-semibold select-none z-20">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-2.5 border border-white/60 rounded-sm inline-block" />
          </div>
        </div>

        {/* In-Phone Header Bar */}
        <div className="px-5 py-2 flex items-center justify-between border-b border-white/10 z-20 bg-slate-950/40 backdrop-blur-md">
          {hasExistingPages && onBackToReview ? (
            <button
              type="button"
              onClick={onBackToReview}
              className="text-white hover:text-amber-400 p-1 cursor-pointer"
            >
              ‹
            </button>
          ) : (
            <span className="w-4" />
          )}

          <div className="flex items-center gap-1.5">
            <WaypointWaveIcon className="w-5 h-3 text-amber-400" />
            <span className="font-serif text-white text-xs font-bold tracking-wide">
              Waypoint <span className="text-amber-400 italic">Scan</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleFacingMode}
            className="text-white hover:text-amber-400 p-1 cursor-pointer"
            title="Switch camera"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Live Camera Feed or Choice Screen */}
        <div className="relative flex-1 bg-[#071326] flex items-center justify-center overflow-hidden">
          {cameraActive && !cameraError ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover"
              />

              {/* Flash / Light Icon (Decorative indicator) */}
              <div className="absolute top-3 left-4 p-2 rounded-full bg-black/40 text-amber-300">
                <Zap className="w-4 h-4" />
              </div>

              {/* Floating Prompt Pill */}
              <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none">
                <span className="px-4 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md text-white text-xs font-semibold border border-white/15 shadow-lg">
                  Point camera at document
                </span>
              </div>

              {/* Glowing Golden Document Outline Frame */}
              <div className="absolute inset-8 sm:inset-10 border-2 border-amber-400 rounded-2xl pointer-events-none shadow-[0_0_30px_rgba(245,181,68,0.85)] flex flex-col justify-between p-3 animate-pulse">
                <div className="flex justify-between">
                  <span className="w-3 h-3 border-t-2 border-l-2 border-amber-300" />
                  <span className="w-3 h-3 border-t-2 border-r-2 border-amber-300" />
                </div>
                <div className="flex justify-between">
                  <span className="w-3 h-3 border-b-2 border-l-2 border-amber-300" />
                  <span className="w-3 h-3 border-b-2 border-r-2 border-amber-300" />
                </div>
              </div>

              {/* Shutter Controls Overlay */}
              <div className="absolute bottom-5 inset-x-0 flex flex-col items-center gap-3">
                {/* Round White Shutter Button */}
                <button
                  type="button"
                  onClick={onScanPage}
                  className="w-16 h-16 rounded-full border-4 border-slate-900 bg-white ring-4 ring-white/50 shadow-2xl active:scale-95 transition-transform cursor-pointer"
                  title="Capture"
                />

                {/* Prominent Gold Pill Button: Scan Page */}
                <Button
                  type="button"
                  onClick={onScanPage}
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-sm py-2.5 px-8 rounded-2xl shadow-xl hover:shadow-amber-400/20 cursor-pointer"
                >
                  Scan Page
                </Button>
              </div>
            </div>
          ) : (
            /* Big Choice Screen */
            <div className="p-6 text-center space-y-4 w-full">
              <p className="text-xs text-blue-200/80 font-medium">
                Choose an option to begin scanning:
              </p>

              <div className="space-y-3">
                {/* Scan Document button */}
                <button
                  type="button"
                  onClick={() => {
                    if (nativeCameraInputRef.current) {
                      nativeCameraInputRef.current.click();
                    } else {
                      onStartCamera();
                    }
                  }}
                  className="w-full p-4 rounded-2xl bg-[#0B1E3B] hover:bg-[#102B54] border border-amber-400/40 text-left flex items-center gap-3.5 transition-all shadow-lg cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-white group-hover:text-amber-300">
                      Scan Document
                    </p>
                    <p className="text-[11px] text-blue-200/60">
                      Use phone/tablet camera
                    </p>
                  </div>
                </button>

                {/* Open Document button */}
                <button
                  type="button"
                  onClick={() => fileUploadInputRef.current?.click()}
                  className="w-full p-4 rounded-2xl bg-[#0B1E3B] hover:bg-[#102B54] border border-blue-500/40 text-left flex items-center gap-3.5 transition-all shadow-lg cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-400/30 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-white group-hover:text-blue-300">
                      Open Document
                    </p>
                    <p className="text-[11px] text-blue-200/60">
                      Select existing PDF or image
                    </p>
                  </div>
                </button>
              </div>

              {cameraError && (
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-300 text-[11px] flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}
            </div>
          )}

          {/* Hidden inputs */}
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
      </div>
    </div>
  );
}

export default WaypointScanStage1Get;
