import React from "react";
import {
  Award,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  FileCheck,
  Scale,
  Zap,
  TrendingUp,
} from "lucide-react";

interface AdvocacyOutcomesSectionProps {
  data: {
    goalAchievement: {
      achieved: { count: number; percentage: number };
      partiallyAchieved: { count: number; percentage: number };
      inProgress: { count: number; percentage: number };
      notAchieved: { count: number; percentage: number };
    };
    outcomesByType: Array<{ outcome: string; count: number }>;
    stateComplaints: {
      totalFiled: number;
      favorableFinding: number;
      settlementMediation: number;
      averageResolutionDays: number;
    };
    averageTimeToResolutionDays: number;
    ideaRiskLevels: Array<{ level: string; count: number; percentage: number }>;
    casesRequiringEscalation: number;
  };
}

export default function AdvocacyOutcomesSection({ data }: AdvocacyOutcomesSectionProps) {
  const goalStats = [
    { label: "Fully Achieved", count: data.goalAchievement.achieved.count, pct: data.goalAchievement.achieved.percentage, color: "#10B981" },
    { label: "Partially Achieved", count: data.goalAchievement.partiallyAchieved.count, pct: data.goalAchievement.partiallyAchieved.percentage, color: "#38BDF8" },
    { label: "Still in Progress", count: data.goalAchievement.inProgress.count, pct: data.goalAchievement.inProgress.percentage, color: "#8B5CF6" },
    { label: "Not Achieved", count: data.goalAchievement.notAchieved.count, pct: data.goalAchievement.notAchieved.percentage, color: "#F43F5E" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Section Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#3A2C18] pb-3">
        <div>
          <h2 className="text-lg sm:text-xl font-serif font-bold text-[#FFF4D4] tracking-wide flex items-center gap-2">
            <span>Advocacy Outcomes</span>
          </h2>
          <p className="text-xs text-[#C6B697] mt-0.5">
            Real student impact: goals achieved, accommodations won, placement changes, and IDEA risk resolution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-[#020A17]/80 border border-[#3A2C18] shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] text-xs">
            <span className="text-[#C6B697]/80 mr-1.5">Avg Time to Resolution:</span>
            <strong className="text-emerald-400 font-mono font-bold">
              {data.averageTimeToResolutionDays} days
            </strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#020A17]/80 border border-[#3A2C18] shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] text-xs">
            <span className="text-[#C6B697]/80 mr-1.5">Escalations Handled:</span>
            <strong className="text-[#FFE394] font-mono font-bold">
              {data.casesRequiringEscalation} cases
            </strong>
          </div>
        </div>
      </div>

      {/* ── Top Grid: Primary Goal Achievements & IDEA Risk Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Goal Achievement Breakdown */}
        <div className="lg:col-span-2 bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-serif font-bold text-[#FFE394] uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Primary Educational Goal Status</span>
            </h3>
            <span className="text-[11px] font-mono text-emerald-400 font-bold">
              83.3% Total Positive Outcomes
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {goalStats.map((st) => (
              <div
                key={st.label}
                className="p-3.5 rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/60 text-center space-y-1"
              >
                <div className="text-2xl font-black font-serif" style={{ color: st.color }}>
                  {st.pct}%
                </div>
                <div className="text-xs font-bold text-[#E8DCC4]">{st.label}</div>
                <div className="text-[10px] text-[#A69371] font-mono">{st.count} cases</div>
              </div>
            ))}
          </div>
        </div>

        {/* IDEA Risk Level Breakdown */}
        <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-serif font-bold text-[#FFE394] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Cases by IDEA Risk Level</span>
            </h3>
          </div>

          <div className="space-y-2">
            {data.ideaRiskLevels.map((risk) => {
              const riskColors: Record<string, string> = {
                Low: "#10B981",
                Moderate: "#DFBE77",
                High: "#F59E0B",
                Critical: "#F43F5E",
              };
              const c = riskColors[risk.level] || "#94A3B8";

              return (
                <div key={risk.level} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#E8DCC4] font-semibold">{risk.level} Risk</span>
                    <span className="font-mono text-[#FFF4D4] text-[11px]">
                      {risk.count} ({risk.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#020A17] h-1.5 rounded-full overflow-hidden border border-[#3A2C18]/40">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${risk.percentage}%`, backgroundColor: c }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Multi-Outcome Impact Deliverables & State Complaint Resolution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Concrete Educational Outcomes Secured */}
        <div className="lg:col-span-2 bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] space-y-3">
          <h3 className="text-xs font-serif font-bold text-[#FFE394] uppercase tracking-wider flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Educational Deliverables & Rights Secured</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {data.outcomesByType.map((o) => (
              <div
                key={o.outcome}
                className="flex items-center justify-between p-3 rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/60 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-[#E8DCC4] font-medium truncate">{o.outcome}</span>
                </div>
                <span className="font-bold font-mono text-[#FFE394] bg-[#020A17] px-2.5 py-0.5 rounded-md border border-[#3A2C18] shrink-0">
                  {o.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: State Complaint Card */}
        <div className="bg-[#05142B]/90 border border-[#3A2C18] rounded-xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.06)] flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-xs font-serif font-bold text-[#DFBE77] uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>State Complaints</span>
            </h3>
            <p className="text-xs text-[#C6B697] mt-1">
              Formal IDEA state-level compliance actions filed with Department of Education.
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/60">
              <span className="text-[#C6B697]">Complaints Filed:</span>
              <strong className="text-[#FFF4D4] font-mono">{data.stateComplaints.totalFiled}</strong>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/60">
              <span className="text-[#C6B697]">Favorable Findings:</span>
              <strong className="text-emerald-400 font-mono">
                {data.stateComplaints.favorableFinding} of {data.stateComplaints.totalFiled} (75%)
              </strong>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/60">
              <span className="text-[#C6B697]">Settlement / Mediation:</span>
              <strong className="text-[#DFBE77] font-mono">
                {data.stateComplaints.settlementMediation}
              </strong>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/60">
              <span className="text-[#C6B697]">Avg Resolution Time:</span>
              <strong className="text-[#FFE394] font-mono">
                {data.stateComplaints.averageResolutionDays} days
              </strong>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-200">
            100% of state complaints resolved favorably with corrective action or mediation.
          </div>
        </div>
      </div>
    </div>
  );
}
