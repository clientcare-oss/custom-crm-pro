import React from "react";
import { FirstMateUnifiedConsole } from "@/components/firstMate/FirstMateUnifiedConsole";

interface MiniFirstMatePanelProps {
  onAddToNotes?: (text: string) => void;
  clientContextName?: string;
  scenario?: string | null;
}

export function MiniFirstMatePanel({
  onAddToNotes,
  clientContextName,
}: MiniFirstMatePanelProps) {
  return (
    <div className="w-full h-[640px] flex flex-col">
      <FirstMateUnifiedConsole
        mode="panel"
        title="First Mate Call Assist"
        clientContextName={clientContextName}
        onAddToNotes={onAddToNotes}
      />
    </div>
  );
}

export default MiniFirstMatePanel;
