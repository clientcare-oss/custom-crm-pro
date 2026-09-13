import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { BookOpen, HelpCircle, AlertTriangle, ShieldAlert, CheckCircle2, DollarSign, Info } from "lucide-react";
import { CALL_FLOWS } from "./callFlowRegistry";
import { Badge } from "@/components/ui/badge";
import { useActiveCall } from "@/contexts/ActiveCallContext";

interface CallGuideDrawerProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  callType?: string | null;
}

export function CallGuideDrawer({
  open,
  onOpenChange,
  onClose,
  callType,
}: CallGuideDrawerProps) {
  const { call } = useActiveCall();
  const effectiveCallType = callType || call?.callType || "New Lead / Sales";
  const currentFlow = CALL_FLOWS[effectiveCallType] || CALL_FLOWS["New Lead / Sales"];
  const guide = currentFlow.guide;

  const handleOpenChange = (nextOpen: boolean) => {
    if (onOpenChange) onOpenChange(nextOpen);
    if (!nextOpen && onClose) onClose();
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl bg-[#061830] border-l border-sky-500/30 text-white p-6 overflow-y-auto"
      >
        <SheetHeader className="space-y-2 pb-4 border-b border-sky-500/20 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider px-2.5 py-0.5">
              Call Guide & SOP
            </Badge>
            <Badge className={currentFlow.badgeColor}>
              {currentFlow.name}
            </Badge>
          </div>
          <SheetTitle className="text-2xl font-black text-white tracking-tight">
            Workflow Directions
          </SheetTitle>
          <SheetDescription className="text-xs text-slate-300">
            {guide.overview}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6 text-sm text-slate-200">
          {/* Key Questions to Ask */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4" />
              Key Questions to Ask
            </h4>
            <div className="space-y-2">
              {guide.questionsToAsk.map((q, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#092244] border border-sky-500/20 text-xs text-slate-100 flex items-start gap-2.5"
                >
                  <span className="font-mono text-amber-400 font-bold shrink-0">
                    Q{idx + 1}.
                  </span>
                  <span className="leading-relaxed font-medium">{q}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Information to Collect */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
              <Info className="h-4 w-4" />
              Information to Collect
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {guide.informationToCollect.map((info, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-sky-400 shrink-0 mt-0.5" />
                  <span>{info}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* How to Explain Waypoint */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#092244] to-[#0a2750] border border-sky-400/30 space-y-1.5">
            <div className="text-xs font-bold uppercase tracking-wider text-white">
              How to Explain Waypoint
            </div>
            <p className="text-xs text-slate-300 leading-relaxed italic">
              “{guide.howToExplain}”
            </p>
          </div>

          {/* Pricing & Service Fit */}
          {guide.pricingGuidance && (
            <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/30 space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <DollarSign className="h-4 w-4" />
                Current Plan & Pricing Guidance
              </div>
              <p className="text-xs text-amber-100/90 leading-relaxed">
                {guide.pricingGuidance}
              </p>
            </div>
          )}

          {/* What NOT to Promise (Crucial Guardrail) */}
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-rose-400" />
              What NOT to Promise
            </div>
            <ul className="space-y-1.5 text-xs text-rose-200/90">
              {guide.whatNotToPromise.map((warn, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <span>{warn}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Escalation Triggers */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              When to Escalate Call to Advocate
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {guide.escalationTriggers.map((trig, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                  <span>{trig}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* How to Close the Call */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              How to Close & Next Steps
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {guide.closingSteps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="font-mono text-emerald-400 font-bold shrink-0">{idx + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default CallGuideDrawer;
