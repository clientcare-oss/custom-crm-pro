import {
  History,
  ShieldCheck,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { EmployeeRecord } from "../teamTypes";

interface EmployeeActivityTabProps {
  employee: EmployeeRecord;
}

export default function EmployeeActivityTab({
  employee,
}: EmployeeActivityTabProps) {
  const activities = employee.activity || [];

  return (
    <div className="space-y-6 text-xs text-white">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#000d2b] border border-blue-900/60 rounded-2xl p-4 shadow-lg">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-sky-400" />
            <h3 className="font-bold text-white text-sm">
              Personnel Activity &amp; Administrative Audit Log
            </h3>
          </div>
          <p className="text-[11px] text-blue-200/70">
            Immutable log tracking role changes, PTO decisions, compensation adjustments, and asset assignments.
          </p>
        </div>

        <span className="text-[10px] text-slate-400 font-mono">
          {activities.length} Recorded Event{activities.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Activity Timeline */}
      <div className="rounded-2xl border border-blue-900/50 bg-[#000820] p-4 sm:p-5 space-y-4">
        <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-blue-900/40">
          {activities.map((act) => (
            <div key={act.id} className="relative flex items-start gap-4 pl-8 group">
              {/* Timeline marker */}
              <div className="absolute left-1.5 top-1 -translate-x-1/2 w-4 h-4 rounded-full bg-[#000820] border-2 border-sky-400 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              </div>

              <div className="p-3.5 rounded-xl border border-blue-900/40 bg-[#000d2b] flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">{act.action}</span>
                    <span className="text-[10px] text-slate-400">by {act.actor}</span>
                  </div>
                  <span className="text-[10px] text-blue-300 font-mono">{act.timestamp}</span>
                </div>
                <p className="text-xs text-blue-200/80 leading-relaxed">{act.details}</p>
              </div>
            </div>
          ))}

          {activities.length === 0 && (
            <div className="p-8 text-center space-y-1">
              <History className="w-6 h-6 text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-white">No administrative activity recorded</p>
              <p className="text-xs text-slate-400">
                Administrative changes, PTO reviews, and role assignments will log here automatically.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
