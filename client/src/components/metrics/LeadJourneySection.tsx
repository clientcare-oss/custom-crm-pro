import React from "react";
import {
  ArrowRight,
  Clock,
  UserCheck,
  TrendingDown,
  Compass,
  FileSignature,
  CreditCard,
  Rocket,
  AlertTriangle,
  MapPin,
  Building,
  Briefcase,
  HelpCircle,
} from "lucide-react";

interface LeadJourneySectionProps {
  data: {
    funnelStages: Array<{
      stage: string;
      count: number;
      conversionRate: number;
      avgDays: number;
      dropOffCount: number;
    }>;
    totalLeadToAdvocacyDays: number;
    overallConversionRate: number;
    leadsByReferralSource: Array<{ name: string; count: number; pct: number; convRate: number }>;
    leadsByState: Array<{ state: string; count: number; pct: number }>;
    leadsByDistrict: Array<{ district: string; count: number; state: string }>;
    leadsByCaseType: Array<{ caseType: string; count: number; pct: number }>;
    conversionRateBySource: Array<{ source: string; leads: number; converted: number; rate: number }>;
    conversionRateByEmployee: Array<{ employeeName: string; role: string; leads: number; converted: number; rate: number }>;
    nonConversionReasons: Array<{ reason: string; count: number; pct: number; desc: string }>;
  };
  onStageClick: (stageName: string) => void;
}

export default function LeadJourneySection({ data, onStageClick }: LeadJourneySectionProps) {
  const stageIcons = [
    HelpCircle,     // New Lead
    Clock,          // Discovery Scheduled
    UserCheck,      // Discovery Completed
    FileSignature,  // Agreement Signed
    CreditCard,     // Paid
    Compass,        // Onboarding Complete
    Rocket,         // Advocacy Started
  ];

  return (
    <div className="space-y-6">
      {/* ── Section Title & Funnel Velocity Summary ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-500/20 pb-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <span>Lead Journey</span>
          </h2>
          <p className="text-xs text-blue-200/70 mt-0.5">
            Full lifecycle progression from initial inquiry to active advocacy engagement.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-[#001433] border border-sky-500/30 text-xs">
            <span className="text-blue-200/60 mr-1.5 font-medium">Avg Lead → Advocacy:</span>
            <strong className="text-sky-300 font-mono font-bold">
              {data.totalLeadToAdvocacyDays} days
            </strong>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-[#001433] border border-sky-500/30 text-xs">
            <span className="text-blue-200/60 mr-1.5 font-medium">Overall Conversion:</span>
            <strong className="text-emerald-400 font-mono font-bold">
              {data.overallConversionRate}%
            </strong>
          </div>
        </div>
      </div>

      {/* ── 7-Stage Interactive Pipeline Funnel ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
        {data.funnelStages.map((stage, idx) => {
          const Icon = stageIcons[idx % stageIcons.length];
          const isFirst = idx === 0;
          const isLast = idx === data.funnelStages.length - 1;

          return (
            <div
              key={stage.stage}
              onClick={() => onStageClick(stage.stage)}
              className="group relative bg-[#07162B] hover:bg-[#001A41] border border-sky-500/25 hover:border-sky-400/50 rounded-2xl p-3 transition-all duration-200 shadow-md flex flex-col justify-between cursor-pointer select-none"
            >
              {/* Stage Step Indicator & Arrow */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-950/80 px-2 py-0.2 rounded-full border border-sky-400/30">
                  0{idx + 1}
                </span>

                {!isLast && (
                  <ArrowRight className="w-3.5 h-3.5 text-blue-300/40 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all hidden lg:block" />
                )}
              </div>

              {/* Stage Name & Count */}
              <div className="py-2.5">
                <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight group-hover:text-sky-300 transition-colors">
                  {stage.count}
                </div>
                <h4 className="text-xs font-bold text-slate-200 line-clamp-2 mt-0.5">
                  {stage.stage}
                </h4>
              </div>

              {/* Velocity & Drop-off Metadata */}
              <div className="border-t border-sky-500/15 pt-2 space-y-1 text-[10px]">
                <div className="flex items-center justify-between text-blue-200/70 font-medium">
                  <span>Step Conv:</span>
                  <strong className="text-emerald-400 font-mono">
                    {stage.conversionRate}%
                  </strong>
                </div>

                <div className="flex items-center justify-between text-blue-200/70 font-medium">
                  <span>Avg Time:</span>
                  <strong className="text-sky-300 font-mono">
                    {stage.avgDays > 0 ? `${stage.avgDays}d` : "Instant"}
                  </strong>
                </div>

                {stage.dropOffCount > 0 && (
                  <div className="flex items-center justify-between text-rose-400/80 font-medium">
                    <span>Drop-offs:</span>
                    <strong className="font-mono">-{stage.dropOffCount}</strong>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Supporting Breakdowns Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* 1. Leads by Referral Source */}
        <div className="bg-[#07162B] border border-sky-500/25 rounded-2xl p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>Leads by Referral Source</span>
            </h3>
            <span className="text-[10px] text-blue-200/50">Volume & Conv %</span>
          </div>

          <div className="space-y-2">
            {data.leadsByReferralSource.map((s) => (
              <div key={s.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200 font-medium truncate pr-2">{s.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-emerald-400 font-mono text-[11px] font-bold">
                      {s.convRate}% conv
                    </span>
                    <span className="font-bold text-white font-mono text-xs w-6 text-right">
                      {s.count}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-[#001026] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#0062E3] to-[#38BDF8] h-full rounded-full"
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Leads by State & District */}
        <div className="bg-[#07162B] border border-sky-500/25 rounded-2xl p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>Top States & Districts</span>
            </h3>
            <span className="text-[10px] text-blue-200/50">Distribution</span>
          </div>

          <div className="space-y-2">
            {data.leadsByDistrict.slice(0, 5).map((d) => (
              <div
                key={d.district}
                className="flex items-center justify-between p-2 rounded-xl bg-[#001026]/70 border border-sky-500/15 text-xs"
              >
                <div className="truncate pr-2">
                  <span className="font-semibold text-white truncate block">{d.district}</span>
                  <span className="text-[10px] text-blue-200/60 font-mono">{d.state}</span>
                </div>
                <span className="font-bold font-mono text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded-lg border border-sky-400/20">
                  {d.count} leads
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Conversion Rate by Employee */}
        <div className="bg-[#07162B] border border-sky-500/25 rounded-2xl p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Conversion by Advocate</span>
            </h3>
            <span className="text-[10px] text-blue-200/50">Close Rates</span>
          </div>

          <div className="space-y-2.5">
            {data.conversionRateByEmployee.map((emp) => (
              <div
                key={emp.employeeName}
                className="p-3 rounded-xl bg-[#001026]/70 border border-sky-500/15 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-white">{emp.employeeName}</h5>
                    <span className="text-[10px] text-blue-200/60">{emp.role}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black font-mono text-emerald-400">
                      {emp.rate}%
                    </span>
                    <span className="text-[10px] text-blue-200/60 block">
                      {emp.converted} of {emp.leads}
                    </span>
                  </div>
                </div>

                <div className="w-full bg-[#001433] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full"
                    style={{ width: `${emp.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Leads by Case Type */}
        <div className="bg-[#07162B] border border-sky-500/25 rounded-2xl p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Leads by Case Type</span>
            </h3>
            <span className="text-[10px] text-blue-200/50">Inquiry Categories</span>
          </div>

          <div className="space-y-2">
            {data.leadsByCaseType.map((c) => (
              <div key={c.caseType} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200 font-medium truncate pr-2">{c.caseType}</span>
                  <span className="font-bold text-white font-mono text-xs">{c.count}</span>
                </div>
                <div className="w-full bg-[#001026] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] h-full rounded-full"
                    style={{ width: `${c.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Non-Conversion Reasons (Structured choices) */}
        <div className="md:col-span-2 bg-[#07162B] border border-sky-500/25 rounded-2xl p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Reasons Leads Did Not Convert</span>
            </h3>
            <span className="text-[10px] text-blue-200/50">Structured Drop-Off Analysis</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.nonConversionReasons.map((r) => (
              <div
                key={r.reason}
                className="p-2.5 rounded-xl bg-[#001026]/70 border border-sky-500/15 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <span className="font-bold text-white text-xs block truncate">{r.reason}</span>
                  <span className="text-[10px] text-blue-200/60 line-clamp-1">{r.desc}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold font-mono text-rose-300 block">
                    {r.count} leads
                  </span>
                  <span className="text-[10px] text-blue-200/50 font-mono">{r.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
