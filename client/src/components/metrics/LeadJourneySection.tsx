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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#3A2C18] pb-3">
        <div>
          <h2 className="text-lg sm:text-xl font-serif font-bold text-[#FFF4D4] tracking-wide flex items-center gap-2">
            <span>Lead Journey</span>
          </h2>
          <p className="text-xs text-[#C6B697] mt-0.5">
            Full lifecycle progression from initial inquiry to active advocacy engagement.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-[#020A17]/80 border border-[#3A2C18] shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] text-xs">
            <span className="text-[#C6B697]/80 mr-1.5 font-medium">Avg Lead → Advocacy:</span>
            <strong className="text-[#FFE394] font-mono font-bold">
              {data.totalLeadToAdvocacyDays} days
            </strong>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-[#020A17]/80 border border-[#3A2C18] shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] text-xs">
            <span className="text-[#C6B697]/80 mr-1.5 font-medium">Overall Conversion:</span>
            <strong className="text-emerald-400 font-mono font-bold">
              {data.overallConversionRate}%
            </strong>
          </div>
        </div>
      </div>

      {/* ── 7-Stage Interactive Pipeline Funnel ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
        {data.funnelStages.map((stage, idx) => {
          const isLast = idx === data.funnelStages.length - 1;

          return (
            <div
              key={stage.stage}
              onClick={() => onStageClick(stage.stage)}
              className="group relative bg-[#05142B]/90 hover:bg-[#081B38] border border-[#3A2C18] hover:border-[#C5A059]/60 rounded-xl p-3 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] transition-all duration-200 flex flex-col justify-between cursor-pointer select-none"
            >
              {/* Stage Step Indicator & Arrow */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-[#FFE394] bg-[#020A17] px-2 py-0.5 rounded-full border border-[#3A2C18]">
                  0{idx + 1}
                </span>

                {!isLast && (
                  <ArrowRight className="w-3.5 h-3.5 text-[#C6B697]/40 group-hover:text-[#FFE394] group-hover:translate-x-0.5 transition-all hidden lg:block" />
                )}
              </div>

              {/* Stage Name & Count */}
              <div className="py-2.5">
                <div className="text-xl sm:text-2xl font-black font-serif text-[#FFF4D4] tracking-tight group-hover:text-[#FFE394] transition-colors">
                  {stage.count}
                </div>
                <h4 className="text-xs font-bold text-[#E8DCC4] line-clamp-2 mt-0.5">
                  {stage.stage}
                </h4>
              </div>

              {/* Velocity & Drop-off Metadata */}
              <div className="border-t border-[#3A2C18]/60 pt-2 space-y-1 text-[10px]">
                <div className="flex items-center justify-between text-[#C6B697] font-medium">
                  <span>Step Conv:</span>
                  <strong className="text-emerald-400 font-mono">
                    {stage.conversionRate}%
                  </strong>
                </div>

                <div className="flex items-center justify-between text-[#C6B697] font-medium">
                  <span>Avg Time:</span>
                  <strong className="text-[#FFE394] font-mono">
                    {stage.avgDays > 0 ? `${stage.avgDays}d` : "Instant"}
                  </strong>
                </div>

                {stage.dropOffCount > 0 && (
                  <div className="flex items-center justify-between text-rose-400 font-medium">
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
        <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-serif font-bold text-[#FFE394] uppercase tracking-wider flex items-center gap-1.5">
              <span>Leads by Referral Source</span>
            </h3>
            <span className="text-[10px] text-[#A69371]">Volume & Conv %</span>
          </div>

          <div className="space-y-2">
            {data.leadsByReferralSource.map((s) => (
              <div key={s.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#E8DCC4] font-medium truncate pr-2">{s.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-emerald-400 font-mono text-[11px] font-bold">
                      {s.convRate}% conv
                    </span>
                    <span className="font-bold text-[#FFF4D4] font-mono text-xs w-6 text-right">
                      {s.count}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-[#020A17] h-1.5 rounded-full overflow-hidden border border-[#3A2C18]/40">
                  <div
                    className="bg-gradient-to-r from-[#C5A059] to-[#DFBE77] h-full rounded-full"
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Leads by State & District */}
        <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-serif font-bold text-[#FFE394] uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Top States & Districts</span>
            </h3>
            <span className="text-[10px] text-[#A69371]">Distribution</span>
          </div>

          <div className="space-y-2">
            {data.leadsByDistrict.slice(0, 5).map((d) => (
              <div
                key={d.district}
                className="flex items-center justify-between p-2.5 rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/60 text-xs"
              >
                <div className="truncate pr-2">
                  <span className="font-semibold text-[#FFF4D4] truncate block">{d.district}</span>
                  <span className="text-[10px] text-[#C6B697] font-mono">{d.state}</span>
                </div>
                <span className="font-bold font-mono text-[#FFE394] bg-[#020A17] px-2 py-0.5 rounded-md border border-[#3A2C18]">
                  {d.count} leads
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Conversion Rate by Employee */}
        <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-serif font-bold text-[#FFE394] uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Conversion by Advocate</span>
            </h3>
            <span className="text-[10px] text-[#A69371]">Close Rates</span>
          </div>

          <div className="space-y-2.5">
            {data.conversionRateByEmployee.map((emp) => (
              <div
                key={emp.employeeName}
                className="p-3 rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/60 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-[#FFF4D4]">{emp.employeeName}</h5>
                    <span className="text-[10px] text-[#C6B697]">{emp.role}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black font-mono text-emerald-400">
                      {emp.rate}%
                    </span>
                    <span className="text-[10px] text-[#A69371] block">
                      {emp.converted} of {emp.leads}
                    </span>
                  </div>
                </div>

                <div className="w-full bg-[#020A17] h-1.5 rounded-full overflow-hidden border border-[#3A2C18]/40">
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
        <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-serif font-bold text-[#FFE394] uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Leads by Case Type</span>
            </h3>
            <span className="text-[10px] text-[#A69371]">Inquiry Categories</span>
          </div>

          <div className="space-y-2">
            {data.leadsByCaseType.map((c) => (
              <div key={c.caseType} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#E8DCC4] font-medium truncate pr-2">{c.caseType}</span>
                  <span className="font-bold text-[#FFF4D4] font-mono text-xs">{c.count}</span>
                </div>
                <div className="w-full bg-[#020A17] h-1.5 rounded-full overflow-hidden border border-[#3A2C18]/40">
                  <div
                    className="bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] h-full rounded-full"
                    style={{ width: `${c.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Non-Conversion Reasons (Structured choices) */}
        <div className="md:col-span-2 bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-serif font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Reasons Leads Did Not Convert</span>
            </h3>
            <span className="text-[10px] text-[#A69371]">Structured Drop-Off Analysis</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.nonConversionReasons.map((r) => (
              <div
                key={r.reason}
                className="p-2.5 rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/60 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <span className="font-bold text-[#FFF4D4] text-xs block truncate">{r.reason}</span>
                  <span className="text-[10px] text-[#C6B697] line-clamp-1">{r.desc}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold font-mono text-rose-300 block">
                    {r.count} leads
                  </span>
                  <span className="text-[10px] text-[#A69371] font-mono">{r.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
