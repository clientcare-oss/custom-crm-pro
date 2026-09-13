/**
 * Responsive Device Preview Modal for Website Tools
 * Interactive Desktop (1024px), Tablet (768px), and Mobile (375px) device preview.
 */

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Monitor, Tablet, Smartphone, ExternalLink, RefreshCw } from "lucide-react";
import PublicGivingWidget from "./PublicGivingWidget";

interface WebsiteToolPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool: any | null;
}

export default function WebsiteToolPreviewModal({ open, onOpenChange, tool }: WebsiteToolPreviewModalProps) {
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [refreshKey, setRefreshKey] = useState(0);

  if (!tool) return null;

  const deviceWidthClass =
    device === "mobile" ? "max-w-[375px]" : device === "tablet" ? "max-w-[768px]" : "max-w-[1024px]";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] bg-[#07162B] border border-[#D4AF37]/30 text-white p-4 md:p-6 max-h-[92vh] flex flex-col">
        <DialogHeader className="pb-2 border-b border-white/10 flex flex-row items-center justify-between space-y-0">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-xs">
                Live Interactive Preview
              </Badge>
              <Badge variant="outline" className="text-white/60 border-white/20 text-xs">
                {tool.type.replace("_", " ").toUpperCase()}
              </Badge>
            </div>
            <DialogTitle className="text-lg md:text-xl font-bold tracking-tight text-white pt-1">
              {tool.name}
            </DialogTitle>
          </div>

          {/* Device Switcher Toolbar */}
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDevice("desktop")}
              className={`h-8 px-2.5 text-xs ${
                device === "desktop" ? "bg-[#D4AF37] text-black font-bold" : "text-white/60 hover:text-white"
              }`}
            >
              <Monitor className="h-3.5 w-3.5 mr-1" /> Desktop
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDevice("tablet")}
              className={`h-8 px-2.5 text-xs ${
                device === "tablet" ? "bg-[#D4AF37] text-black font-bold" : "text-white/60 hover:text-white"
              }`}
            >
              <Tablet className="h-3.5 w-3.5 mr-1" /> Tablet
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDevice("mobile")}
              className={`h-8 px-2.5 text-xs ${
                device === "mobile" ? "bg-[#D4AF37] text-black font-bold" : "text-white/60 hover:text-white"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5 mr-1" /> Mobile
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="h-8 w-8 p-0 text-white/60 hover:text-white"
              title="Reset Preview State"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Viewport Frame */}
        <div className="flex-1 overflow-y-auto py-6 bg-black/50 rounded-2xl border border-white/10 flex justify-center items-start mt-4">
          <div
            key={refreshKey}
            className={`w-full transition-all duration-300 ${deviceWidthClass} px-3`}
          >
            {/* Device chrome frame for mobile/tablet */}
            {device !== "desktop" && (
              <div className="text-center pb-2 text-[10px] text-white/40 tracking-wider uppercase font-mono">
                {device === "mobile" ? "375px × 667px (Mobile Safari / Chrome)" : "768px × 1024px (Tablet)"}
              </div>
            )}

            <div className={device !== "desktop" ? "border-2 border-white/20 rounded-3xl p-3 bg-[#001A41]/80 shadow-2xl" : ""}>
              <PublicGivingWidget tool={tool} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
