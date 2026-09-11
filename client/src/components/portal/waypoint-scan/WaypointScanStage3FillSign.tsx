/**
 * Stage 3: Fill and Sign
 * Styled with the Blue Wavy Theme across the natural workspace (no simulated phone frame).
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Check, Type, Calendar, Pen, X, CheckSquare, ArrowLeft, Sparkles, RotateCw } from "lucide-react";
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
  onRotate?: () => void;
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
  onRotate,
  isProcessingPdf,
  pageNumber,
  totalPages,
}: WaypointScanStage3FillSignProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-between min-h-0 py-3 px-3 sm:px-6 w-full max-w-4xl mx-auto gap-3">
      {/* Top Bar: Back & Page indicator */}
      <div className="w-full flex items-center justify-between px-2 gap-2 flex-wrap">
        <button
          type="button"
          onClick={onBackToReview}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#091D3C]/80 hover:bg-[#0E2954] text-blue-200 hover:text-white border border-blue-900/40 text-xs font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Review</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-400 font-bold px-3 py-1 rounded-xl bg-amber-400/10 border border-amber-400/25">
            Page {pageNumber} of {totalPages}
          </span>

          {onRotate && (
            <button
              type="button"
              onClick={onRotate}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#091D3C]/80 hover:bg-[#0E2954] text-blue-200 hover:text-white border border-blue-900/40 text-xs font-semibold transition-colors cursor-pointer"
              title="Rotate 90°"
            >
              <RotateCw className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">Rotate</span>
            </button>
          )}
        </div>

        {/* Finish CTA button in top header for quick desktop access */}
        <Button
          type="button"
          onClick={onFinishDocument}
          disabled={isProcessingPdf}
          className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-xs h-9 px-4 rounded-xl shadow-[0_0_15px_rgba(245,181,68,0.3)] cursor-pointer"
        >
          {isProcessingPdf ? "Flattening..." : "Finish PDF →"}
        </Button>
      </div>

      {/* Interactive Document Workspace */}
      <div className="relative flex-1 w-full flex flex-col items-center justify-center min-h-[340px] max-h-[58vh] overflow-hidden p-2 select-none">
        <div
          onClick={onDocumentClick}
          className={`relative inline-block max-h-full max-w-full bg-white rounded-none shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden border border-slate-300 transition-all ${
            activeTool !== "none" ? "cursor-crosshair ring-2 ring-amber-400/80" : "cursor-default"
          }`}
        >
          <img
            src={currentPage.dataUrl}
            alt="Document for signing"
            className="max-h-[52vh] max-w-full w-auto h-auto block object-contain pointer-events-none rounded-none"
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
                  ? "ring-2 ring-amber-400 bg-amber-400/15 p-0.5 rounded-lg shadow-md"
                  : "hover:ring-1 hover:ring-blue-400"
              }`}
            >
              {/* Checkmark icon */}
              {annot.type === "check" && (
                <span className="text-xl font-black text-blue-950 leading-none select-none">
                  ✓
                </span>
              )}

              {/* Text, Date, or Initials */}
              {(annot.type === "text" || annot.type === "date" || annot.type === "initials") && (
                <span
                  className={`font-semibold text-blue-950 select-none whitespace-nowrap ${
                    annot.type === "initials"
                      ? "font-black text-xs px-1.5 py-0.5 border-b-2 border-blue-950 bg-white/70 rounded"
                      : "text-xs px-1 bg-white/70 rounded"
                  }`}
                >
                  {annot.content}
                </span>
              )}

              {/* Signature rendered in soft blue highlight box */}
              {annot.type === "signature" && annot.content && (
                <div className="p-1 rounded-lg border border-blue-400/80 bg-blue-50/90 flex items-center justify-center shadow-sm">
                  <img
                    src={annot.content}
                    alt="Signature"
                    className="h-8 sm:h-10 w-auto object-contain pointer-events-none"
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
                  className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[11px] shadow-md hover:bg-red-700 transition-colors"
                >
                  <X className="w-3 h-3 stroke-[3]" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Dynamic Tool Hint Pill */}
        <div className="mt-2">
          <span className="px-4 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-amber-300 text-xs font-semibold border border-amber-400/20 shadow-md inline-block">
            {activeTool !== "none"
              ? `🎯 Tap anywhere on document to place ${activeTool}`
              : "Select a tool below to sign, date, or add text"}
          </span>
        </div>
      </div>

      {/* 5-Tool Toolbar Dock matching the reference specs */}
      <div className="w-full max-w-xl bg-[#091D3C]/90 border border-blue-800/50 rounded-2xl p-2 flex items-center justify-between gap-1 sm:gap-2 shadow-[0_15px_30px_rgba(0,0,0,0.6)] backdrop-blur-md">
        {/* Tool 1: Check */}
        <button
          type="button"
          onClick={() => onSelectTool(activeTool === "check" ? "none" : "check")}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
            activeTool === "check"
              ? "bg-amber-400 text-slate-950 font-black shadow-[0_0_12px_rgba(245,181,68,0.4)] scale-105"
              : "text-blue-200/80 hover:text-white hover:bg-white/5"
          }`}
        >
          <CheckSquare className="w-5 h-5" />
          <span className="text-[11px] font-bold mt-1">Check</span>
        </button>

        {/* Tool 2: Text */}
        <button
          type="button"
          onClick={() => onSelectTool(activeTool === "text" ? "none" : "text")}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
            activeTool === "text"
              ? "bg-amber-400 text-slate-950 font-black shadow-[0_0_12px_rgba(245,181,68,0.4)] scale-105"
              : "text-blue-200/80 hover:text-white hover:bg-white/5"
          }`}
        >
          <Type className="w-5 h-5" />
          <span className="text-[11px] font-bold mt-1">Text</span>
        </button>

        {/* Tool 3: Date */}
        <button
          type="button"
          onClick={() => onSelectTool(activeTool === "date" ? "none" : "date")}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
            activeTool === "date"
              ? "bg-amber-400 text-slate-950 font-black shadow-[0_0_12px_rgba(245,181,68,0.4)] scale-105"
              : "text-blue-200/80 hover:text-white hover:bg-white/5"
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[11px] font-bold mt-1">Date</span>
        </button>

        {/* Tool 4: Initials (AA) */}
        <button
          type="button"
          onClick={() => onSelectTool(activeTool === "initials" ? "none" : "initials")}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
            activeTool === "initials"
              ? "bg-amber-400 text-slate-950 font-black shadow-[0_0_12px_rgba(245,181,68,0.4)] scale-105"
              : "text-blue-200/80 hover:text-white hover:bg-white/5"
          }`}
        >
          <span className="text-[13px] font-black tracking-tighter leading-none h-5 flex items-center">
            AA
          </span>
          <span className="text-[11px] font-bold mt-1">Initials</span>
        </button>

        {/* Tool 5: Signature */}
        <button
          type="button"
          onClick={() => onSelectTool("signature")}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
            activeTool === "signature"
              ? "bg-amber-400 text-slate-950 font-black shadow-[0_0_12px_rgba(245,181,68,0.4)] scale-105"
              : "text-blue-200/80 hover:text-white hover:bg-white/5"
          }`}
        >
          <Pen className="w-5 h-5" />
          <span className="text-[11px] font-bold mt-1">Signature</span>
        </button>
      </div>
    </div>
  );
}

export default WaypointScanStage3FillSign;
