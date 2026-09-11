/**
 * Stage 4: Finish PDF & Vault Save
 * Styled with the Blue Wavy Theme across the natural workspace (no simulated phone frame).
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Check, Download, Mail, CheckCircle2, ArrowRight } from "lucide-react";
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
    <div className="flex-1 flex flex-col items-center justify-center min-h-0 py-4 px-3 sm:px-6 w-full max-w-3xl mx-auto gap-5">
      {/* Top Banner / Confirmation Card: Saved automatically to Document Vault */}
      <div className="w-full max-w-xl p-4 sm:p-5 rounded-3xl bg-white text-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-slate-200 flex items-start sm:items-center gap-4 text-left animate-in zoom-in-95 duration-200">
        <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-lg">
          <Check className="w-6 h-6 stroke-[3]" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
            Saved automatically to Document Vault
          </h4>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Your flattened, signed PDF is secure in Byron’s client vault and ready whenever you need it.
          </p>
        </div>
      </div>

      {/* Main Content Area: Document Sheet Preview + Direct Action Buttons */}
      <div className="w-full max-w-xl flex flex-col sm:flex-row items-center justify-center gap-6">
        {/* Document Sheet Preview with PDF badge */}
        <div className="relative w-44 sm:w-52 aspect-[3/4] bg-white rounded-none shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden border border-slate-300 shrink-0">
          {firstPage && (
            <img
              src={firstPage.dataUrl}
              alt="Completed Document"
              className="w-full h-full object-contain pointer-events-none rounded-none"
            />
          )}

          {/* Black PDF Badge in top right corner */}
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-slate-950 text-white font-black text-[10px] tracking-wider shadow">
            PDF
          </div>
        </div>

        {/* Action Buttons Column */}
        <div className="w-full flex-1 space-y-3">
          {/* Button 1: Download to Device */}
          <Button
            type="button"
            onClick={onSaveToDevice}
            className="w-full bg-[#091D3C]/90 hover:bg-[#0E2954] border-2 border-blue-500/40 hover:border-blue-400 text-white font-bold text-xs sm:text-sm h-12 rounded-2xl flex items-center justify-center gap-2.5 cursor-pointer shadow-lg transition-all group"
          >
            <Download className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>Download to Device</span>
          </Button>

          {/* Button 2: Open in Email App */}
          <Button
            type="button"
            onClick={onShareOrEmail}
            className="w-full bg-[#091D3C]/90 hover:bg-[#0E2954] border-2 border-amber-400/40 hover:border-amber-400 text-white font-bold text-xs sm:text-sm h-12 rounded-2xl flex items-center justify-center gap-2.5 cursor-pointer shadow-lg transition-all group"
          >
            <Mail className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>Open in Email App</span>
          </Button>

          <p className="text-[11px] text-blue-200/60 text-center select-none pt-1">
            Opens your default email app on this device (Phone or computer).
          </p>

          <div className="pt-2">
            <Button
              type="button"
              onClick={onClose}
              className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm h-11 rounded-2xl shadow-[0_0_20px_rgba(245,181,68,0.3)] cursor-pointer"
            >
              Done & Return to Vault
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WaypointScanStage4Finish;
