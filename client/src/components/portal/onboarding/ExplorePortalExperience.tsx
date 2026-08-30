import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Compass, 
  MessageSquare, 
  CheckSquare, 
  FileText, 
  FolderOpen, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2,
  Circle,
  MapPin,
  Check
} from "lucide-react";
import { TOUR_MODULES } from "../portalModuleRegistry";

interface ExplorePortalExperienceProps {
  onContinueExploring: () => void;
  onFinishTour: () => void;
  onNavigateTab: (tabId: string) => void;
  exploredModuleIds: string[];
}

export function ExplorePortalExperience({
  onContinueExploring,
  onFinishTour,
  onNavigateTab,
  exploredModuleIds
}: ExplorePortalExperienceProps) {
  const totalCount = TOUR_MODULES.length || 6;
  const exploredCount = exploredModuleIds.length;
  const isAllComplete = exploredCount >= totalCount;

  return (
    <div className="p-6 md:p-10 lg:p-12 space-y-8 max-w-4xl mx-auto animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-semibold mb-3 border border-emerald-500/20">
          <Sparkles className="h-3.5 w-3.5" />
          {isAllComplete ? "Exploration Complete" : "Self-Directed Discovery Active"}
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">
          {isAllComplete ? "You've Got It!" : "Explore Your Portal"}
        </h1>
        <p className="text-sm text-emerald-300 font-semibold mt-1">
          {isAllComplete 
            ? "You've explored the main areas of your Waypoint portal."
            : "You're already exploring."}
        </p>
        <p className="text-xs md:text-sm text-white/70 mt-2 max-w-2xl leading-relaxed">
          Take a look around your portal at your own pace. Each area you visit will fill your exploration bar.
        </p>
      </div>

      {/* Progress & Quick Action Card */}
      <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-[#0a1828] to-[#071422] p-6 md:p-8 rounded-2xl space-y-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white">
              {isAllComplete ? "All Exploration Milestones Completed" : "Current Exploration Progress"}
            </span>
            <span className="font-mono text-emerald-400 font-bold">
              {exploredCount} of {totalCount} areas explored
            </span>
          </div>

          {/* Green Illuminated Progress Bar */}
          <div className="relative h-2.5 w-full bg-slate-950/80 rounded-full border border-white/10 p-[1px]">
            {/* Ambient soft glow underlay */}
            <div
              className="absolute inset-0 bg-emerald-400/40 rounded-full blur-[4px] transition-all duration-500 pointer-events-none"
              style={{ width: `${Math.max(16, Math.min(100, (exploredCount / totalCount) * 100))}%` }}
            />
            {/* Foreground luminous gradient bar */}
            <div
              className={`relative h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-300 rounded-full transition-all duration-500 ${
                isAllComplete
                  ? "shadow-[0_0_12px_rgba(52,211,153,0.9),0_0_5px_rgba(16,185,129,1)]"
                  : "shadow-[0_0_10px_rgba(52,211,153,0.8),0_0_3px_rgba(16,185,129,0.9)]"
              }`}
              style={{ width: `${Math.max(16, Math.min(100, (exploredCount / totalCount) * 100))}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          {!isAllComplete ? (
            <>
              <Button
                onClick={onContinueExploring}
                className="flex-1 h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Compass className="h-4 w-4" />
                Continue Exploring
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>

              <Button
                variant="outline"
                onClick={onFinishTour}
                className="h-11 border-white/20 text-white hover:bg-white/10 text-xs font-semibold px-6"
              >
                I'm Ready
              </Button>
            </>
          ) : (
            <Button
              onClick={onFinishTour}
              className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Check className="h-4 w-4" />
              Finish Exploring
            </Button>
          )}
        </div>
      </Card>

      {/* 6 Exploration Areas Checklist */}
      <div className="space-y-4 pt-2">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <MapPin className="h-4 w-4 text-emerald-400" />
          Exploration Areas
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {TOUR_MODULES.map((m) => {
            const Icon = m.icon;
            const isExplored = exploredModuleIds.includes(m.id);
            return (
              <div
                key={m.id}
                onClick={() => onNavigateTab(m.id)}
                className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  isExplored
                    ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    isExplored ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-white/60"
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${isExplored ? "text-white" : "text-white/80"}`}>
                      {m.tourTitle || m.name}
                    </p>
                    <p className="text-[10px] text-white/50 line-clamp-1">{m.tourDescription}</p>
                  </div>
                </div>

                <div>
                  {isExplored ? (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] py-0 px-2 font-bold gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Done
                    </Badge>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px] text-white/40">
                      <Circle className="h-3.5 w-3.5" />
                      <span>Explore</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
