import React from "react";
import { CALL_FLOWS, CALL_TYPES_LIST } from "./callFlowRegistry";
import { useActiveCall } from "@/contexts/ActiveCallContext";
import {
  UserPlus,
  UserCheck,
  Compass,
  Calendar,
  CreditCard,
  Building,
  Laptop,
  AlertTriangle,
  HelpCircle,
  MoreHorizontal,
  LucideIcon,
} from "lucide-react";

const CALL_TYPE_ICONS: Record<string, LucideIcon> = {
  "New Lead / Sales": UserPlus,
  "Current Client": UserCheck,
  "Advocacy / Case Question": Compass,
  Scheduling: Calendar,
  Billing: CreditCard,
  "School / Provider": Building,
  "Portal / Technical Support": Laptop,
  "Complaint / Escalation": AlertTriangle,
  "General Question": HelpCircle,
  Other: MoreHorizontal,
};

interface CallTypeSelectorProps {
  onSelectCallType?: (type: string) => void;
}

export function CallTypeSelector({ onSelectCallType }: CallTypeSelectorProps) {
  const { call, setCallType } = useActiveCall();

  const handlePick = (type: string) => {
    setCallType(type);
    onSelectCallType?.(type);
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
          <span>Section 2</span>
          <span className="text-slate-400">•</span>
          <span className="text-white text-base">What is this call about?</span>
        </h3>
        <p className="text-xs text-slate-300/80 mt-0.5">
          Selecting a call type automatically loads the exact SOP checklist and guidance workflow.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {CALL_TYPES_LIST.map((type) => {
          const isSelected = call.callType === type;
          const Icon = CALL_TYPE_ICONS[type] || MoreHorizontal;
          const def = CALL_FLOWS[type];

          return (
            <button
              key={type}
              type="button"
              onClick={() => handlePick(type)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                isSelected
                  ? "bg-gradient-to-br from-[#0a264a] to-[#051830] border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/50"
                  : "bg-[#061830] border-sky-500/20 hover:border-sky-400/40 hover:bg-[#072038] text-slate-300"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                    isSelected
                      ? "bg-amber-400 text-slate-950 border-amber-300"
                      : "bg-[#040D1A] text-sky-400 border-slate-800 group-hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </div>

              <div className="mt-3">
                <div className="text-xs font-bold leading-tight group-hover:text-white transition-colors">
                  {type}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                  {def?.category || "Workflow"}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CallTypeSelector;
