import React from "react";
import { JourneyStage } from "./types";
import { InteractivePageIdPill } from "./InteractivePageIdPill";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  Eye, 
  Sliders, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Lock, 
  FileText, 
  Calendar, 
  Users, 
  CreditCard, 
  GraduationCap, 
  UploadCloud, 
  ClipboardList, 
  ShieldCheck, 
  Archive,
  Activity,
  Layers,
  ChevronRight,
  Hash
} from "lucide-react";

interface JourneyStageCardProps {
  stage: JourneyStage;
  onDesign: (stage: JourneyStage) => void;
  onPreview: (stage: JourneyStage) => void;
  onToggleStatus: (stageId: string) => void;
}

export function JourneyStageCard({
  stage,
  onDesign,
  onPreview,
  onToggleStatus
}: JourneyStageCardProps) {
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "Discovery & Intake":
        return "border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400";
      case "Plan & Checkout":
        return "border-purple-500/30 bg-purple-500/5 text-purple-600 dark:text-purple-400";
      case "Progressive Onboarding":
        return "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400";
      case "Active Service":
        return "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400";
      case "Account Lifecycle":
        return "border-slate-500/30 bg-slate-500/5 text-slate-600 dark:text-slate-400";
      default:
        return "border-primary/30 bg-primary/5 text-primary";
    }
  };

  return (
    <Card className="relative flex flex-col justify-between border-border/70 hover:border-primary/50 transition-all duration-200 hover:shadow-md bg-card/80 backdrop-blur-sm group overflow-hidden">
      {/* Top indicator bar */}
      <div className={`h-1.5 w-full ${stage.status === "published" ? "bg-gradient-to-r from-emerald-500 to-teal-400" : "bg-gradient-to-r from-amber-500 to-orange-400"}`} />

      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          {/* # Page ID badge */}
          <InteractivePageIdPill pageId={stage.pageId || `PG-027-S${stage.stepNumber}`} size="sm" />

          <button
            onClick={() => onToggleStatus(stage.id)}
            title="Click to toggle Draft / Published"
            className="transition-transform hover:scale-105"
          >
            {stage.status === "published" ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border-emerald-500/30 text-[11px] gap-1 cursor-pointer">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Published
              </Badge>
            ) : (
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 border-amber-500/30 text-[11px] gap-1 cursor-pointer">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Draft
              </Badge>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-muted/80 text-foreground/80 border border-border/50">
            Stage {stage.stepNumber}
          </span>
          <Badge variant="outline" className={`text-[11px] font-medium py-0 px-2 ${getCategoryColor(stage.category)}`}>
            {stage.category}
          </Badge>
        </div>

        <CardTitle className="text-base font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
          <span>{stage.name}</span>
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {stage.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 pb-3 text-xs">
        {/* Trigger Condition */}
        <div className="bg-muted/40 rounded-md p-2.5 border border-border/40">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
            Trigger / Entry Condition
          </div>
          <p className="text-foreground/90 font-medium text-[11px] leading-snug">
            {stage.triggerCondition}
          </p>
        </div>

        {/* Associated Portal Page */}
        <div className="flex items-center justify-between text-xs py-1 border-b border-border/40">
          <span className="text-muted-foreground font-medium flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-primary" />
            Portal Page:
          </span>
          <span className="font-semibold text-foreground truncate max-w-[190px] text-right">
            {stage.associatedPortalPage}
          </span>
        </div>

        {/* Required & Available actions count */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="bg-muted/30 rounded p-2 border border-border/30">
            <div className="text-[10px] text-muted-foreground font-medium mb-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Required ({stage.requiredClientActions.length})
            </div>
            <ul className="space-y-1">
              {stage.requiredClientActions.slice(0, 2).map((act, i) => (
                <li key={i} className="text-[10px] text-foreground/80 truncate" title={act}>
                  • {act}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-muted/30 rounded p-2 border border-border/30">
            <div className="text-[10px] text-muted-foreground font-medium mb-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-indigo-500" />
              Available ({stage.availableClientActions.length})
            </div>
            <ul className="space-y-1">
              {stage.availableClientActions.slice(0, 2).map((act, i) => (
                <li key={i} className="text-[10px] text-foreground/80 truncate" title={act}>
                  • {act}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-2.5 pb-3.5 px-3.5 border-t border-border/40 bg-muted/15 flex items-center justify-between gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDesign(stage)}
          className="flex-1 h-8 text-xs font-semibold gap-1.5 border-border/70 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all whitespace-nowrap px-2.5"
          title={`Design Stage ${stage.stepNumber} Experience`}
        >
          <Sliders className="h-3.5 w-3.5 shrink-0" />
          <span>Design</span>
        </Button>

        <Button
          size="sm"
          onClick={() => onPreview(stage)}
          className="flex-1 h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm whitespace-nowrap px-2.5"
          title={`Preview Stage ${stage.stepNumber} Live Client Experience`}
        >
          <Eye className="h-3.5 w-3.5 shrink-0" />
          <span>Preview</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
