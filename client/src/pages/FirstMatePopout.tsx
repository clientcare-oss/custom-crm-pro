import React from "react";
import { FirstMateUnifiedConsole } from "@/components/firstMate/FirstMateUnifiedConsole";

export default function FirstMatePopout() {
  return (
    <div className="min-h-screen w-full bg-[#040d1a] p-2 flex flex-col justify-between select-none font-sans overflow-hidden">
      <div className="flex-1 h-full w-full flex flex-col">
        <FirstMateUnifiedConsole mode="popout" title="First Mate Copilot (Floating Window)" />
      </div>
    </div>
  );
}
