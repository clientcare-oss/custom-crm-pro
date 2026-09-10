/**
 * Stage 3: Fill and Sign
 * Styled with the Blue Wavy Theme & Phone Viewport matching Phone 3 in the visual spec.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { WaypointWaveIcon } from "../WaypointWavyBackdrop";
import { Check, Type, Calendar, Pen, X, CheckSquare } from "lucide-react";
import { DocumentAnnotation, WaypointScanPageDraft } from "@/lib/waypointScanStorage";

export type AnnotationTool = "none" | "check" | "text" | "date" | "initials" | "signature";

interface WaypointScanStage3FillSignProps {
  currentPage: WaypointScanPageDraft;
  annotations: DocumentAnnotation[];
  activeTool: AnnotationTool;
  onSelectTool: (tool: AnnotationTool) => void;
  onDocumentClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  onRemoveAnnotation: (id: string) => void;
  onBackToReview: () => void;
  onFinishDocument: () => void;
  isProcessingPdf: boolean;
  pageNumber: number;
  totalPages: number;
}

export function WaypointScanStage3FillSign({
  currentPage,
  annotations,
  activeTool,
  onSelectTool,
  onDocumentClick,
  selectedAnnotationId,
  onSelectAnnotation,
  onRemoveAnnotation,
  onBackToReview,
  onFinishDocument,
  isProcessingPdf,
  pageNumber,
  totalPages,
}: WaypointScanStage3FillSignProps) {
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
          <button
            type="button"
            onClick={onBackToReview}
            className="text-white hover:text-amber-400 p-1 cursor-pointer"
          >
            ‹
          </button>

          <div className="flex items-center gap-1.5">
            <WaypointWaveIcon className="w-5 h-3 text-amber-400" />
            <span className="font-serif text-white text-xs font-bold tracking-wide">
              Waypoint <span className="text-amber-400 italic">Scan</span>
            </span>
          </div>

          <span className="text-[10px] text-amber-400 font-bold">
            {pageNumber}/{totalPages}
          </span>
        </div>

        {/* Interactive Document Viewport */}
        <div className="relative flex-1 bg-[#06152B] flex flex-col items-center justify-center p-3 select-none overflow-hidden">
          
          {/* Document Sheet with active annotation placement */}
          <div
            onClick={onDocumentClick}
            className={`relative max-h-[44vh] aspect-[3/4] bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-300 ${
              activeTool !== "none" ? "cursor-crosshair" : "cursor-default"
            }`}
          >
            <img
              src={currentPage.dataUrl}
              alt="Document"
              className="w-full h-full object-contain pointer-events-none"
            />

            {/* Render Placed Annotations */}
            {annotations.map((annot) => (
              <div
                key={annot.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectAnnotation(annot.id);
                }}
                style={{
                  left: `${annot.x}%`,
                  top: `${annot.y}%`,
                }}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all ${
                  selectedAnnotationId === annot.id
                    ? "ring-2 ring-amber-400 bg-amber-400/10 p-0.5 rounded"
                    : "hover:ring-1 hover:ring-blue-400"
                }`}
              >
                {/* Checkmark icon */}
                {annot.type === "check" && (
                  <span className="text-lg font-black text-blue-950 leading-none select-none">
                    ✓
                  </span>
                )}

                {/* Text or Date or Initials */}
                {(annot.type === "text" || annot.type === "date" || annot.type === "initials") && (
                  <span className={`font-semibold text-blue-950 select-none whitespace-nowrap ${
                    annot.type === "initials" ? "font-black text-xs border-b border-blue-950" : "text-[11px]"
                  }`}>
                    {annot.content}
                  </span>
                )}

                {/* Signature rendered in soft blue highlight box like Phone 3 */}
                {annot.type === "signature" && annot.content && (
                  <div className="p-1 rounded border border-blue-400/80 bg-blue-500/10 flex items-center justify-center shadow-sm">
                    <img
                      src={annot.content}
                      alt="Signature"
                      className="h-7 sm:h-9 w-auto object-contain pointer-events-none"
                    />
                  </div>
                )}

                {/* Delete button when selected */}
                {selectedAnnotationId === annot.id && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveAnnotation(annot.id);
                    }}
                    className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px]"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Helper hint */}
          <p className="text-[10px] text-amber-300/90 font-medium mt-1 select-none text-center truncate max-w-[280px]">
            {activeTool !== "none"
              ? `Tap anywhere on document to place ${activeTool}`
              : "Tap a tool below to add to document"}
          </p>
        </div>

        {/* Bottom 5-Tool Editing Toolbar matching Phone 3 */}
        <div className="px-3 py-2 bg-[#040C1A] border-t border-white/10 flex items-center justify-around gap-1">
          
          {/* Tool 1: Check */}
          <button
            type="button"
            onClick={() => onSelectTool(activeTool === "check" ? "none" : "check")}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
              activeTool === "check"
                ? "bg-amber-400 text-slate-950 font-black shadow-md scale-105"
                : "text-blue-200/80 hover:text-white hover:bg-white/5"
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span className="text-[10px] font-bold mt-0.5">Check</span>
          </button>

          {/* Tool 2: Text */}
          <button
            type="button"
            onClick={() => onSelectTool(activeTool === "text" ? "none" : "text")}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
              activeTool === "text"
                ? "bg-amber-400 text-slate-950 font-black shadow-md scale-105"
                : "text-blue-200/80 hover:text-white hover:bg-white/5"
            }`}
          >
            <Type className="w-4 h-4" />
            <span className="text-[10px] font-bold mt-0.5">Text</span>
          </button>

          {/* Tool 3: Date */}
          <button
            type="button"
            onClick={() => onSelectTool(activeTool === "date" ? "none" : "date")}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
              activeTool === "date"
                ? "bg-amber-400 text-slate-950 font-black shadow-md scale-105"
                : "text-blue-200/80 hover:text-white hover:bg-white/5"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span className="text-[10px] font-bold mt-0.5">Date</span>
          </button>

          {/* Tool 4: Initials (AA) */}
          <button
            type="button"
            onClick={() => onSelectTool(activeTool === "initials" ? "none" : "initials")}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
              activeTool === "initials"
                ? "bg-amber-400 text-slate-950 font-black shadow-md scale-105"
                : "text-blue-200/80 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="text-[11px] font-black tracking-tighter">AA</span>
            <span className="text-[10px] font-bold mt-0.5">Initials</span>
          </button>

          {/* Tool 5: Signature */}
          <button
            type="button"
            onClick={() => onSelectTool("signature")}
            className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
              activeTool === "signature"
                ? "bg-amber-400 text-slate-950 font-black shadow-md scale-105"
                : "text-blue-200/80 hover:text-white hover:bg-white/5"
            }`}
          >
            <Pen className="w-4 h-4" />
            <span className="text-[10px] font-bold mt-0.5">Signature</span>
          </button>
        </div>

        {/* Primary Action Button: Finish Document */}
        <div className="p-3 bg-[#030914] border-t border-white/5 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onBackToReview}
            className="border-white/30 text-white hover:bg-white/10 text-xs h-10 rounded-xl"
          >
            Back
          </Button>

          <Button
            type="button"
            onClick={onFinishDocument}
            disabled={isProcessingPdf}
            className="flex-1 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs h-10 rounded-xl shadow-lg hover:shadow-amber-400/20 cursor-pointer"
          >
            {isProcessingPdf ? "Flattening PDF..." : "Finish Document"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default WaypointScanStage3FillSign;
