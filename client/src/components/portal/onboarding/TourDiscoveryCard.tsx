import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, X, CheckCircle2, ArrowRight } from "lucide-react";

interface TourDiscoveryCardProps {
  moduleId: string;
  title: string;
  description: string;
  onDismiss: () => void;
  onFinishTourEarly: () => void;
  exploredCount: number;
  totalCount: number;
}

export function TourDiscoveryCard({
  moduleId,
  title,
  description,
  onDismiss,
  onFinishTourEarly,
  exploredCount,
  totalCount
}: TourDiscoveryCardProps) {
  const isAllComplete = exploredCount >= totalCount;

  return (
    <div className="mb-6 animate-in slide-in-from-top-3 fade-in duration-300">
      <Card className="border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-[#071422] to-[#071422] p-4 rounded-xl shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h4>
                <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                  ({exploredCount} of {totalCount} explored)
                </span>
              </div>
              <p className="text-xs text-white/80 leading-relaxed max-w-2xl">
                {description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={onFinishTourEarly}
              className="h-7 text-[11px] font-semibold border-white/20 text-white/70 hover:text-white hover:bg-white/10"
            >
              I'm Ready
            </Button>
            <Button
              size="sm"
              onClick={onDismiss}
              className="h-7 text-[11px] font-bold gap-1 bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs px-3"
            >
              <Check className="h-3.5 w-3.5" />
              Got It
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
