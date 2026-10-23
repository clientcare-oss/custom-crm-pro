import React from "react";
import { Button } from "@/components/ui/button";

interface Step5ReadyViewProps {
  onPreviewMeetingMode: () => void;
  onLaunchLiveMeeting: () => void;
}

export function Step5ReadyView({
  onPreviewMeetingMode,
  onLaunchLiveMeeting,
}: Step5ReadyViewProps) {
  return (
    <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-8 text-center max-w-2xl mx-auto space-y-6 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)]">
      <div className="w-14 h-14 rounded-2xl bg-[#020A17] border border-[#3A2C18] text-[#FFE394] flex items-center justify-center mx-auto shadow-inner">
        <span className="text-2xl select-none">⚡</span>
      </div>
      <div>
        <h3 className="text-xl sm:text-2xl font-serif font-black text-[#FFF4D4]">Meeting Preparation Complete</h3>
        <p className="text-xs text-[#C6B697] mt-1.5 max-w-md mx-auto leading-relaxed">
          All IEP intel, parent concerns, and meeting targets have been approved. You are ready to run the IEP meeting.
        </p>
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button
          onClick={onPreviewMeetingMode}
          variant="outline"
          className="border border-[#3A2C18] bg-[#020A17] text-[#D8C7A5] hover:bg-[#07162B] hover:text-[#FFF4D4] hover:border-[#C5A059]/60 text-xs cursor-pointer"
        >
          Preview Meeting Mode
        </Button>
        <Button
          onClick={onLaunchLiveMeeting}
          className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] font-bold text-xs gap-2 cursor-pointer shadow-[0_3px_10px_rgba(0,0,0,0.8)] border border-[#FFE394]/50 hover:brightness-105"
        >
          ⚡ Launch Live Meeting Mode
        </Button>
      </div>
    </div>
  );
}
