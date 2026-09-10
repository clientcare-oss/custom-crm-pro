/**
 * Stage 4: Finish PDF & Vault Save
 * Styled with the Blue Wavy Theme & Phone Viewport matching Phone 4 in the visual spec.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { WaypointWaveIcon } from "../WaypointWavyBackdrop";
import { Check, Download, Mail, CheckCircle2 } from "lucide-react";
import { GeneratePdfResult } from "@/lib/pdfFinisher";
import { WaypointScanPageDraft } from "@/lib/waypointScanStorage";

interface WaypointScanStage4FinishProps {
  firstPage?: WaypointScanPageDraft;
  pdfResult: GeneratePdfResult;
  onSaveToDevice: () => void;
  onShareOrEmail: () => void;
  onClose: () => void;
}

export function WaypointScanStage4Finish({
  firstPage,
  pdfResult,
  onSaveToDevice,
  onShareOrEmail,
  onClose,
}: WaypointScanStage4FinishProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-0 py-2">
      {/* Mobile Device Frame Container */}
      <div className="relative w-full max-w-sm sm:max-w-md bg-[#040C1A] rounded-[2.5rem] border-4 border-slate-800 shadow-[0_15px_40px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col aspect-[9/16] max-h-[66vh]">
        
        {/* Status Bar */}
        <div className="px-6 pt-3 pb-2 flex items-center justify-between text-white/70 text-[11px] font-semibold select-none z-20">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-2.5 border border-white/60 rounded-sm inline-block" />
          </div>
        </div>

        {/* In-Phone Header Bar */}
        <div className="px-5 py-2 flex items-center justify-between border-b border-white/10 z-20 bg-slate-950/40 backdrop-blur-md">
          <span className="w-4" />

          <div className="flex items-center gap-1.5">
            <WaypointWaveIcon className="w-5 h-3 text-amber-400" />
            <span className="font-serif text-white text-xs font-bold tracking-wide">
              Waypoint <span className="text-amber-400 italic">Scan</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-white hover:text-amber-400 text-xs font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Document Sheet with PDF Badge in Top-Right */}
        <div className="relative flex-1 bg-[#06152B] flex flex-col items-center justify-start p-4 select-none overflow-hidden">
          
          {/* Document Sheet preview */}
          <div className="relative w-full max-w-[240px] aspect-[3/4] bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-300">
            {firstPage && (
              <img
                src={firstPage.dataUrl}
                alt="Completed Document"
                className="w-full h-full object-contain pointer-events-none opacity-90"
              />
            )}

            {/* Black PDF Badge in top right corner */}
            <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-slate-950 text-white font-black text-[9px] tracking-wider shadow">
              PDF
            </div>
          </div>

          {/* Floating Confirmation Card: Saved automatically to Document Vault */}
          <div className="w-full max-w-[280px] -mt-12 z-20 p-3.5 rounded-2xl bg-white text-slate-900 shadow-2xl border border-slate-200 flex items-start gap-3 text-left animate-in zoom-in-95 duration-200">
            <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 leading-tight">
                Saved automatically to Document Vault
              </h4>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                Your document is secure and ready whenever you need it.
              </p>
            </div>
          </div>
        </div>

        {/* Two Large Action Buttons & Email App Subtitle */}
        <div className="p-4 bg-[#040C1A] border-t border-white/10 space-y-2.5">
          {/* Button 1: Download to Device */}
          <Button
            type="button"
            onClick={onSaveToDevice}
            className="w-full border border-white/40 bg-white/5 hover:bg-white/10 text-white font-bold text-xs h-11 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Download to Device</span>
          </Button>

          {/* Button 2: Open in Email App */}
          <Button
            type="button"
            onClick={onShareOrEmail}
            className="w-full border border-white/40 bg-white/5 hover:bg-white/10 text-white font-bold text-xs h-11 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow"
          >
            <Mail className="w-4 h-4 text-amber-400" />
            <span>Open in Email App</span>
          </Button>

          <p className="text-[10px] text-blue-200/50 text-center select-none pt-0.5">
            Opens your default email app on this device (Phone or computer).
          </p>
        </div>
      </div>
    </div>
  );
}

export default WaypointScanStage4Finish;
