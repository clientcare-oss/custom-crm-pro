import React from "react";
import {
  Clock,
  UserCheck,
  AlertTriangle,
  Calendar,
  Layers,
  ChevronRight,
  ShieldAlert,
  Gauge,
} from "lucide-react";

interface TimeWorkloadSectionProps {
  data: {
    totalHoursLogged: number;
    averageTimePerClientHours: number;
    averageTimePerPlan: Array<{ plan: string; hours: number }>;
    timeByWorkType: Array<{ workType: string; hours: number; percentage: number; color: string }>;
    timeByAdvocate: Array<{
      advocateId: number;
      advocateName: string;
      role: string;
      totalHours: number;
      activeCases: number;
      meetingsThisMonth: number;
      meetingsThisWeek: number;
      availableCapacity: number;
      capacityStatus: string;
    }>;
    highUsageOutliers: Array<{
      studentId: number;
      studentName: string;
      plan: string;
      expectedHours: number;
      actualHours: number;
      variancePct: number;
      reason: string;
    }>;
    teamCapacity: {
      idealMeetingsPerWeekPerAdvocate: number;
      totalWeeklyTeamCapacity: number;
      meetingsScheduledThisWeek: number;
      availableMeetingCapacity: number;
      advocatesNearingCapacity: string[];
      weeksOverCapacity: number;
    };
  };
  onStudentClick?: (studentId: number) => void;
}

export default function TimeWorkloadSection({
  data,
  onStudentClick,
}: TimeWorkloadSectionProps) {
  return (
    <div className="space-y-6">
      {/* ── Section Title ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-500/20 pb-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <span>Where Our Time Goes</span>
          </h2>
          <p className="text-xs text-blue-200/70 mt-0.5">
            Advocate activity tracking across 12 specialized work types and meeting load capacity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-[#001433] border border-sky-500/30 text-xs">
            <span className="text-blue-200/60 mr-1.5">Total Logged:</span>
            <strong className="text-sky-300 font-mono font-bold">
              {data.totalHoursLogged} hrs
            </strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#001433] border border-sky-500/30 text-xs">
            <span className="text-blue-200/60 mr-1.5">Avg / Family:</span>
            <strong className="text-teal-400 font-mono font-bold">
              {data.averageTimePerClientHours} hrs/mo
            </strong>
          </div>
        </div>
      </div>

      {/* ── Work Types Breakdown (12 Types) ── */}
      <div className="bg-[#07162B] border border-sky-500/25 rounded-2xl p-5 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-sky-300 uppercase tracking-wider">
            Activity Breakdown (12 Standard Work Types)
          </h3>
          <span className="text-[10px] text-blue-200/50 font-medium">Sorted by Total Hours</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
          {data.timeByWorkType.map((wt) => (
            <div key={wt.workType} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-200 font-semibold truncate pr-2">{wt.workType}</span>
                <div className="flex items-center gap-2 font-mono shrink-0">
                  <span className="text-blue-200/60 text-[11px]">{wt.percentage}%</span>
                  <span className="font-bold text-white text-xs">{wt.hours}h</span>
                </div>
              </div>

              <div className="w-full bg-[#001026] h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${wt.percentage}%`, backgroundColor: wt.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Advocate Capacity Radar vs 5 Meetings / Week Benchmark ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Advocate Profiles & Active Loads */}
        <div className="lg:col-span-2 bg-[#07162B] border border-sky-500/25 rounded-2xl p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Advocate Workload & Caseload Balance
              </h3>
              <p className="text-xs text-blue-200/70 mt-0.5">
                Target capacity is approximately 5 formal IEP/504 meetings per week per advocate.
              </p>
            </div>
            <span className="text-[11px] font-mono text-sky-400 bg-sky-950/80 px-2.5 py-1 rounded-xl border border-sky-400/30">
              Benchmark: 5 Mtgs/Wk
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {data.timeByAdvocate.map((adv) => {
              const isNearing = adv.meetingsThisWeek >= 5;

              return (
                <div
                  key={adv.advocateName}
                  className="p-4 rounded-2xl bg-[#001026]/80 border border-sky-500/20 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">{adv.advocateName}</h4>
                      <span className="text-[10px] text-blue-200/60">{adv.role}</span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isNearing
                          ? "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                      }`}
                    >
                      {isNearing ? "At Capacity" : "Available Capacity"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center py-1 bg-[#001433]/60 rounded-xl border border-sky-500/10">
                    <div>
                      <span className="text-[10px] text-blue-200/60 block">Cases</span>
                      <strong className="text-sm font-mono text-white">{adv.activeCases}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-blue-200/60 block">Hours</span>
                      <strong className="text-sm font-mono text-sky-300">{adv.totalHours}h</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-blue-200/60 block">This Wk</span>
                      <strong
                        className={`text-sm font-mono ${
                          isNearing ? "text-amber-400" : "text-emerald-400"
                        }`}
                      >
                        {adv.meetingsThisWeek}/5
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Team Capacity Summary Deck */}
        <div className="bg-[#07162B] border border-sky-500/25 rounded-2xl p-5 shadow-md flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5" />
              <span>30-Day Capacity Forecast</span>
            </h3>
            <p className="text-xs text-blue-200/70 mt-1">
              Live capacity monitoring across all practice advocates.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#001026] text-xs">
              <span className="text-blue-200/70 font-medium">Weekly Team Meetings:</span>
              <strong className="text-white font-mono">
                {data.teamCapacity.meetingsScheduledThisWeek} of{" "}
                {data.teamCapacity.totalWeeklyTeamCapacity}
              </strong>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#001026] text-xs">
              <span className="text-blue-200/70 font-medium">Available Meeting Slots:</span>
              <strong className="text-emerald-400 font-mono">
                {data.teamCapacity.availableMeetingCapacity} slot remaining
              </strong>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#001026] text-xs">
              <span className="text-blue-200/70 font-medium">Weeks Over Capacity:</span>
              <strong className="text-sky-300 font-mono">
                {data.teamCapacity.weeksOverCapacity} (Optimal)
              </strong>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/25 text-[11px] text-amber-200/90 leading-relaxed">
            <strong>Advocate Watchlist:</strong> Wyatt Smith is booked for 5 meetings this week. New bookings will automatically route to Byron Honea.
          </div>
        </div>
      </div>

      {/* ── High Usage Outliers (Significantly more time than expected) ── */}
      <div className="bg-[#07162B] border border-sky-500/25 rounded-2xl p-5 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>High-Usage Outliers (Clients Exceeding Expected Service Hours)</span>
          </h3>
          <span className="text-[10px] text-blue-200/50 font-medium">&gt; 100% Variance</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {data.highUsageOutliers.map((client) => (
            <div
              key={client.studentId}
              onClick={() => onStudentClick && onStudentClick(client.studentId)}
              className="p-3.5 rounded-xl bg-[#001026]/80 hover:bg-[#00183F] border border-sky-500/20 hover:border-sky-400/50 transition-all cursor-pointer space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors">
                  {client.studentName}
                </h4>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                  +{client.variancePct}%
                </span>
              </div>

              <p className="text-[11px] text-blue-200/70 leading-relaxed line-clamp-2">
                {client.reason}
              </p>

              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-sky-500/10 text-blue-300/60 font-mono">
                <span>Plan: {client.plan}</span>
                <span>
                  {client.actualHours}h / {client.expectedHours}h exp
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
