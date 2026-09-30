import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Plus, Paperclip as PaperclipIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type MarkerType =
  | "paperclip"
  | "star"
  | "violet_bookmark"
  | "green_bookmark"
  | "calendar"
  | "red_exclamation";

export interface MarkerOption {
  id: MarkerType | "none";
  label: string;
  reason: string;
}

export const MARKER_OPTIONS: MarkerOption[] = [
  { id: "none", label: "No Marker", reason: "Standard file without flags" },
  { id: "paperclip", label: "Gold Paperclip", reason: "Active documents / notes clipped" },
  { id: "star", label: "Leather Star Tab", reason: "High priority / key focus student" },
  { id: "violet_bookmark", label: "Violet Ribbon", reason: "Milestone reached / in progress" },
  { id: "green_bookmark", label: "Green Ribbon", reason: "IEP review scheduled / compliant" },
  { id: "calendar", label: "Calendar Tag", reason: "Upcoming meeting / eval due" },
  { id: "red_exclamation", label: "Urgent Alert", reason: "Dispute / immediate action required" },
];

/**
 * Miniature Physical Marker Visual Previews for the Selector Box
 */
export function MarkerPreview({ type }: { type: MarkerType | "none" }) {
  if (type === "none") {
    return (
      <div className="w-6 h-6 rounded-full border border-dashed border-[#556984] flex items-center justify-center text-[#748BA7]">
        <X className="w-3.5 h-3.5" />
      </div>
    );
  }

  if (type === "paperclip") {
    return (
      <div className="w-5 h-7 flex items-center justify-center drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]">
        <svg width="12" height="24" viewBox="0 0 15 30" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M4 11V23C4 25.5 6 27.5 8.5 27.5C11 27.5 13 25.5 13 23V5C13 2.5 11 0.5 8.5 0.5C6 0.5 4 2.5 4 5V21C4 22.4 5.1 23.5 6.5 23.5C7.9 23.5 9 22.4 9 21V10"
            stroke="url(#clip-box-grad)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="clip-box-grad" x1="4" y1="0.5" x2="13" y2="28" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFF9E8" />
              <stop offset="0.3" stopColor="#F5D07A" />
              <stop offset="0.7" stopColor="#B88939" />
              <stop offset="1" stopColor="#5E3F0F" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  if (type === "star") {
    return (
      <div className="w-5.5 h-6 rounded-[3px] bg-gradient-to-b from-[#E7B863] via-[#C08C36] to-[#7D5215] border border-[#FFE2A4] flex items-center justify-center shadow-sm">
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#2C1904] drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]">
          <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
        </svg>
      </div>
    );
  }

  if (type === "violet_bookmark") {
    return (
      <div className="w-5 h-7 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
        <svg width="16" height="24" viewBox="0 0 18 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M1 0H17V26L9 20.5L1 26V0Z"
            fill="url(#v-ribbon-box)"
            stroke="#553488"
            strokeWidth="0.8"
          />
          <defs>
            <linearGradient id="v-ribbon-box" x1="1" y1="0" x2="17" y2="28" gradientUnits="userSpaceOnUse">
              <stop stopColor="#BEA4F0" />
              <stop offset="0.4" stopColor="#8F67D1" />
              <stop offset="1" stopColor="#55338D" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  if (type === "green_bookmark") {
    return (
      <div className="w-5 h-7 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
        <svg width="16" height="24" viewBox="0 0 18 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M1 0H17V26L9 20.5L1 26V0Z"
            fill="url(#g-ribbon-box)"
            stroke="#23663C"
            strokeWidth="0.8"
          />
          <defs>
            <linearGradient id="g-ribbon-box" x1="1" y1="0" x2="17" y2="28" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8DEAA9" />
              <stop offset="0.4" stopColor="#48B876" />
              <stop offset="1" stopColor="#22643A" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  if (type === "calendar") {
    return (
      <div className="w-5.5 h-5.5 rounded bg-[#FAF5EB] border border-[#8C6225]/70 flex flex-col items-center justify-between p-0.5 shadow-xs overflow-hidden">
        <div className="w-full flex justify-around px-0.5 border-b border-[#D8A452]/40 pb-0.5">
          <span className="w-0.5 h-1 bg-[#4A320A] rounded-full" />
          <span className="w-0.5 h-1 bg-[#4A320A] rounded-full" />
          <span className="w-0.5 h-1 bg-[#4A320A] rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-0.5 w-full px-0.5 pb-0.5">
          <span className="w-1 h-0.5 bg-[#8C6225]/70 rounded-2xs" />
          <span className="w-1 h-0.5 bg-[#8C6225]/70 rounded-2xs" />
          <span className="w-1 h-0.5 bg-[#8C6225]/70 rounded-2xs" />
        </div>
      </div>
    );
  }

  if (type === "red_exclamation") {
    return (
      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#FF4D4D] to-[#C92222] border border-[#FFA199] flex items-center justify-center text-white font-black text-xs leading-none shadow-xs">
        !
      </div>
    );
  }

  return null;
}

/**
 * Physical Marker Selector Box Component
 * Displays the physical markers in an archival selection box for attaching to student cards.
 */
interface MarkerSelectorBoxProps {
  currentMarker?: MarkerType | "none";
  onSelect: (marker: MarkerType | "none") => void;
  className?: string;
}

export function MarkerSelectorBox({
  currentMarker = "none",
  onSelect,
  className,
}: MarkerSelectorBoxProps) {
  return (
    <div
      className={cn(
        "p-3.5 bg-gradient-to-b from-[#081528] via-[#050F1D] to-[#020712] border border-[#8A6731]/60 rounded-xl shadow-[0_12px_32px_rgba(0,3,10,0.95)] text-[#F0DFC5]",
        className
      )}
    >
      {/* Box Header */}
      <div className="pb-2.5 mb-2.5 border-b border-[#8A6731]/30">
        <h4 className="font-serif font-bold text-sm text-[#F7D287] flex items-center gap-1.5">
          <PaperclipIcon className="w-3.5 h-3.5 text-[#E9BA6B]" />
          Physical Document Markers
        </h4>
        <p className="text-[11px] text-[#8AA2C0] mt-0.5 leading-tight">
          Select an archival marker to attach to this student file:
        </p>
      </div>

      {/* Markers Options Grid */}
      <div className="space-y-1.5">
        {MARKER_OPTIONS.map((opt) => {
          const isSelected = currentMarker === opt.id || (!currentMarker && opt.id === "none");
          return (
            <button
              key={opt.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(opt.id);
              }}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all cursor-pointer select-none",
                isSelected
                  ? "bg-[#142C4E]/80 border border-[#E9BA6B]/70 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                  : "hover:bg-[#0E2038]/60 border border-transparent"
              )}
            >
              {/* Marker Mini Preview */}
              <div className="w-7 h-7 flex items-center justify-center shrink-0">
                <MarkerPreview type={opt.id} />
              </div>

              {/* Marker Name & Purpose */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p
                    className={cn(
                      "font-serif text-xs font-bold leading-tight",
                      isSelected ? "text-[#FFF3D6]" : "text-[#D8E4F2]"
                    )}
                  >
                    {opt.label}
                  </p>
                  {isSelected && (
                    <span className="text-[10px] font-mono font-bold text-[#E9BA6B] bg-[#071324] px-1.5 py-0.2 rounded border border-[#8A6731]/40">
                      Attached
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#768DA8] truncate leading-tight mt-0.5">
                  {opt.reason}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Popover Trigger for attaching/changing markers on a student file card
 */
interface MarkerSelectorPopoverProps {
  currentMarker?: MarkerType;
  studentName?: string;
  onSelect: (marker: MarkerType | "none") => void;
  children?: React.ReactNode;
}

export function MarkerSelectorPopover({
  currentMarker,
  studentName,
  onSelect,
  children,
}: MarkerSelectorPopoverProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children || (
          <button
            type="button"
            className="w-5 h-5 rounded-md bg-[#0A172A]/70 hover:bg-[#142C4E] border border-[#8A6731]/40 text-[#D8B478] hover:text-white flex items-center justify-center shadow-xs cursor-pointer transition-colors"
            title={currentMarker ? "Change attached marker" : "Attach marker"}
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={6}
        className="w-80 p-0 bg-transparent border-none shadow-none z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <MarkerSelectorBox
          currentMarker={currentMarker || "none"}
          onSelect={(marker) => {
            onSelect(marker);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
