import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Clock,
  CalendarCheck,
  UserPlus,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
} from "lucide-react";

interface SnapshotCardsProps {
  data: {
    newLeads: { value: number; change: number; trend: number[] };
    conversionRate: { value: number; change: number; trend: number[] };
    activeFamilies: { value: number; change: number; trend: number[] };
    revenue: { value: number; change: number; trend: number[] };
    advocacyHours: { value: number; change: number; trend: number[] };
    renewalsDue: { value: number; change: number; trend: number[] };
  };
  onCardClick: (metricKey: string, title: string) => void;
}

// Sparkline SVG renderer
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 24;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible shrink-0">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export default function SnapshotCards({ data, onCardClick }: SnapshotCardsProps) {
  const cards = [
    {
      key: "new_leads",
      title: "New Leads",
      description: "Leads received during period",
      value: data.newLeads.value,
      format: (v: number) => String(v),
      change: data.newLeads.change,
      trend: data.newLeads.trend,
      icon: UserPlus,
      color: "#0062E3", // Electric blue
      sparkColor: "#38bdf8",
    },
    {
      key: "conversion_rate",
      title: "Conversion Rate",
      description: "Became paying clients",
      value: data.conversionRate.value,
      format: (v: number) => `${v.toFixed(1)}%`,
      change: data.conversionRate.change,
      trend: data.conversionRate.trend,
      icon: TrendingUp,
      color: "#0D9488", // Teal
      sparkColor: "#14b8a6",
    },
    {
      key: "active_families",
      title: "Active Families",
      description: "Current active family accounts",
      value: data.activeFamilies.value,
      format: (v: number) => String(v),
      change: data.activeFamilies.change,
      trend: data.activeFamilies.trend,
      icon: Users,
      color: "#8B5CF6", // Violet
      sparkColor: "#a78bfa",
    },
    {
      key: "revenue",
      title: "Revenue",
      description: "Collected revenue, not invoiced",
      value: data.revenue.value,
      format: (v: number) => `$${v.toLocaleString()}`,
      change: data.revenue.change,
      trend: data.revenue.trend,
      icon: DollarSign,
      color: "#F59E0B", // Gold
      sparkColor: "#fbbf24",
    },
    {
      key: "advocacy_hours",
      title: "Advocacy Hours",
      description: "Team time serving clients",
      value: data.advocacyHours.value,
      format: (v: number) => `${v} hrs`,
      change: data.advocacyHours.change,
      trend: data.advocacyHours.trend,
      icon: Clock,
      color: "#0084FF", // Cerulean
      sparkColor: "#60a5fa",
    },
    {
      key: "renewals_due",
      title: "Renewals Due",
      description: "Approaching within 30 days",
      value: data.renewalsDue.value,
      format: (v: number) => String(v),
      change: data.renewalsDue.change,
      trend: data.renewalsDue.trend,
      icon: CalendarCheck,
      color: "#38BDF8", // Sky blue
      sparkColor: "#7dd3fc",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
      {cards.map((c) => {
        const Icon = c.icon;
        const isPositive = c.change >= 0;

        return (
          <div
            key={c.key}
            onClick={() => onCardClick(c.key, c.title)}
            className="group relative bg-[#07162B] hover:bg-[#001A41] border border-sky-500/25 hover:border-sky-400/50 rounded-2xl p-4 transition-all duration-200 shadow-md hover:shadow-[0_10px_30px_rgba(0,120,255,0.18)] cursor-pointer flex flex-col justify-between select-none"
          >
            {/* Top row: Icon & Trendline */}
            <div className="flex items-center justify-between gap-2">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-inner group-hover:scale-105 transition-transform"
                style={{ backgroundColor: `${c.color}25`, border: `1px solid ${c.color}50` }}
              >
                <Icon className="w-4.5 h-4.5" style={{ color: c.sparkColor }} />
              </div>

              <Sparkline data={c.trend} color={c.sparkColor} />
            </div>

            {/* Middle: Big Metric Value & Label */}
            <div className="pt-3">
              <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight group-hover:text-sky-300 transition-colors">
                {c.format(c.value)}
              </div>
              <div className="text-xs font-bold text-slate-200 mt-0.5 tracking-wide">
                {c.title}
              </div>
              <div className="text-[10px] text-blue-200/60 truncate mt-0.5">
                {c.description}
              </div>
            </div>

            {/* Bottom: Change Badge & Drilldown Hint */}
            <div className="pt-3 border-t border-sky-500/15 flex items-center justify-between text-[11px] font-semibold">
              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                  isPositive
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                }`}
              >
                {isPositive ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                <span>{Math.abs(c.change)}%</span>
              </span>

              <span className="text-[10px] text-blue-300/50 group-hover:text-sky-300 flex items-center gap-0.5 transition-colors">
                <span>View</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
