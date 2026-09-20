import React from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, X, MapPin } from "lucide-react";
import { MapClientItem } from "./USCoverageMap";

interface SelectedClientBarProps {
  client: MapClientItem;
  onClear: () => void;
  onOpenWorkspace: (clientId: number) => void;
}

export function SelectedClientBar({
  client,
  onClear,
  onOpenWorkspace,
}: SelectedClientBarProps) {
  return (
    <div className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-950/80 via-[#071d3a] to-sky-950/80 border border-sky-500/40 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-slate-200 truncate">
        <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
        <span className="text-slate-400">Showing:</span>
        <span className="font-bold text-white truncate">
          {client.studentName || client.name}
        </span>
        <span className="text-slate-400">·</span>
        <span className="text-slate-300 truncate">
          {client.city ? `${client.city}, ${client.state}` : client.state || "Approximate location"}
        </span>
        <span className="text-slate-400">·</span>
        <span className="text-sky-300 font-semibold shrink-0">
          {client.timeZoneName} ({client.localTime})
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          type="button"
          size="sm"
          onClick={() => onOpenWorkspace(client.id)}
          className="h-7 px-2.5 text-xs bg-sky-600 hover:bg-sky-500 text-white gap-1 rounded-lg shadow-sm"
        >
          <span>Open Student Workspace</span>
          <ExternalLink className="w-3 h-3" />
        </Button>
        <button
          type="button"
          onClick={onClear}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Clear Selection"
          aria-label="Clear Selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
