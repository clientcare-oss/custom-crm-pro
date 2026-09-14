import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  TrendingDown,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Plus,
  Minus,
  Sparkles,
  Info,
} from "lucide-react";
import { PlanClientItem } from "./PlanRevenueCircuit";

interface StaleRevenueProjectionChartProps {
  initialClients55: PlanClientItem[];
  initialClients105: PlanClientItem[];
  currentMRR: number;
}

export interface MonthProjectionItem {
  monthIndex: number;
  month: string;
  fullName: string;
  totalRevenue: number;
  plan55Revenue: number;
  plan105Revenue: number;
  activeClients55: number;
  activeClients105: number;
  activeTotalClients: number;
  retentionPct: number;
  expiringCount: number;
}

export function StaleRevenueProjectionChart({
  initialClients55,
  initialClients105,
  currentMRR,
}: StaleRevenueProjectionChartProps) {
  // Horizon view state: 6 months or 12 months
  const [horizon, setHorizon] = useState<6 | 12>(12);
  // View mode: all lines vs total only
  const [viewMode, setViewMode] = useState<"all" | "total" | "breakdown">("all");
  // Collapsible client commitment ledger
  const [showLedger, setShowLedger] = useState(false);

  // Local simulated client state allowing interactive adjustment of remaining months
  const [clients, setClients] = useState<PlanClientItem[]>(() => [
    ...initialClients55,
    ...initialClients105,
  ]);

  // Sync if initial props change
  React.useEffect(() => {
    setClients([...initialClients55, ...initialClients105]);
  }, [initialClients55, initialClients105]);

  // Adjust remaining months for a client
  const handleAdjustMonths = (id: number, delta: number) => {
    setClients((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const newMonths = Math.max(1, Math.min(24, (c.planMonthsRemaining || 1) + delta));
          return { ...c, planMonthsRemaining: newMonths };
        }
        return c;
      })
    );
  };

  // Base month is Sep 2026
  const baseDate = useMemo(() => new Date(2026, 8, 1), []); // Sep 2026 (0-indexed month: 8 = Sep)

  // Compute month-by-month stale projection data
  const projectionData = useMemo<MonthProjectionItem[]>(() => {
    const data: MonthProjectionItem[] = [];
    const numMonths = horizon;

    for (let m = 1; m <= numMonths; m++) {
      const monthDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + (m - 1), 1);
      const shortMonth = monthDate.toLocaleDateString("en-US", { month: "short" });
      const yearShort = String(monthDate.getFullYear()).slice(-2);
      const label = `${shortMonth} '${yearShort}`;
      const fullMonthName = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

      // In the stale model, a client contributes in month m if their planMonthsRemaining >= m
      const active55 = clients.filter(
        (c) => c.planTier === "$55" && (c.planMonthsRemaining || 0) >= m
      );
      const active105 = clients.filter(
        (c) => c.planTier === "$105" && (c.planMonthsRemaining || 0) >= m
      );

      // Clients who roll off / expire exactly in this month
      const expiringThisMonth = clients.filter((c) => (c.planMonthsRemaining || 0) === m);

      const rev55 = active55.length * 55;
      const rev105 = active105.length * 105;
      const totalRev = rev55 + rev105;
      const totalActiveCount = active55.length + active105.length;

      const baselineRev = currentMRR > 0 ? currentMRR : 1235;
      const retentionPct = Math.round((totalRev / baselineRev) * 100);

      data.push({
        monthIndex: m,
        month: label,
        fullName: fullMonthName,
        totalRevenue: totalRev,
        plan55Revenue: rev55,
        plan105Revenue: rev105,
        activeClients55: active55.length,
        activeClients105: active105.length,
        activeTotalClients: totalActiveCount,
        retentionPct,
        expiringCount: expiringThisMonth.length,
      });
    }
    return data;
  }, [clients, horizon, baseDate, currentMRR]);

  // Aggregate metrics
  const cumulativeBacklog = useMemo(() => {
    return projectionData.reduce((sum, item) => sum + item.totalRevenue, 0);
  }, [projectionData]);

  // Half life month (when revenue drops below 50% of starting month)
  const startingRevenue = projectionData[0]?.totalRevenue || currentMRR;
  const halfLifeItem = projectionData.find((item) => item.totalRevenue <= startingRevenue * 0.5);
  const halfLifeText = halfLifeItem ? `Month ${halfLifeItem.monthIndex} (${halfLifeItem.month})` : "> Horizon";

  const terminalRevenue = projectionData[projectionData.length - 1]?.totalRevenue || 0;
  const terminalPct = startingRevenue > 0 ? Math.round((terminalRevenue / startingRevenue) * 100) : 0;

  // Custom Neon Tooltip
  const CustomNeonTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="rounded-xl border border-cyan-500/40 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl text-xs space-y-2 min-w-[240px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-white text-sm">{dataPoint.fullName}</span>
            <span className="rounded bg-cyan-500/20 px-2 py-0.5 font-mono text-[11px] text-cyan-300 font-semibold">
              Month {dataPoint.monthIndex}
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
                <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f5ff]" />
                Total Monthly Income:
              </span>
              <span className="font-mono font-bold text-white text-sm">
                ${dataPoint.totalRevenue.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" />
                $105 Tier ({dataPoint.activeClients105} active):
              </span>
              <span className="font-mono font-semibold text-amber-300">
                ${dataPoint.plan105Revenue.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 text-purple-400">
                <span className="h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]" />
                $55 Tier ({dataPoint.activeClients55} active):
              </span>
              <span className="font-mono font-semibold text-purple-300">
                ${dataPoint.plan55Revenue.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Retention vs Baseline:</span>
            <span
              className={`font-mono font-semibold ${
                dataPoint.retentionPct >= 70
                  ? "text-emerald-400"
                  : dataPoint.retentionPct >= 40
                  ? "text-amber-400"
                  : "text-rose-400"
              }`}
            >
              {dataPoint.retentionPct}% ({dataPoint.activeTotalClients} accounts)
            </span>
          </div>

          {dataPoint.expiringCount > 0 && (
            <div className="text-[10px] text-rose-300/80 bg-rose-950/30 px-2 py-1 rounded border border-rose-800/30">
              ⚠️ {dataPoint.expiringCount} client plan{dataPoint.expiringCount > 1 ? "s" : ""} conclude in this month
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-950/95 via-slate-900/85 to-slate-950/95 p-6 shadow-2xl backdrop-blur-xl space-y-6">
      {/* Glow Orbs */}
      <div className="pointer-events-none absolute -top-32 right-1/3 h-72 w-72 rounded-full bg-cyan-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-purple-600/10 blur-3xl" />

      {/* Header with Title and Horizon Controls */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-500/20 text-purple-400">
              <TrendingDown className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Stale Closed-Cohort Monthly Income Projection
            </h2>
            <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-purple-400">
              0 New Clients Added
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Simulates monthly recurring income runoff based strictly on each active client's remaining contract duration.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Pills */}
          <div className="flex rounded-lg border border-slate-800 bg-slate-900/90 p-1 text-xs">
            <button
              onClick={() => setViewMode("all")}
              className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                viewMode === "all"
                  ? "bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All Lines
            </button>
            <button
              onClick={() => setViewMode("total")}
              className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                viewMode === "total"
                  ? "bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Total Only
            </button>
            <button
              onClick={() => setViewMode("breakdown")}
              className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                viewMode === "breakdown"
                  ? "bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Tiers Only
            </button>
          </div>

          {/* Horizon Selector */}
          <div className="flex rounded-lg border border-slate-800 bg-slate-900/90 p-1 text-xs">
            <button
              onClick={() => setHorizon(6)}
              className={`rounded-md px-3 py-1 font-medium transition-all ${
                horizon === 6
                  ? "bg-primary text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              6 Months
            </button>
            <button
              onClick={() => setHorizon(12)}
              className={`rounded-md px-3 py-1 font-medium transition-all ${
                horizon === 12
                  ? "bg-primary text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              12 Months
            </button>
          </div>
        </div>
      </div>

      {/* Main Neon Line Chart */}
      <div className="relative z-10 h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={projectionData} margin={{ top: 20, right: 25, left: 10, bottom: 5 }}>
            {/* SVG Defs for Neon Stroke Glows */}
            <defs>
              <filter id="neonGlowCyanLine" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#00f5ff" floodOpacity="0.8" />
              </filter>
              <filter id="neonGlowAmberLine" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#fbbf24" floodOpacity="0.75" />
              </filter>
              <filter id="neonGlowPurpleLine" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#c084fc" floodOpacity="0.75" />
              </filter>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />

            <XAxis
              dataKey="month"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "#334155" }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "#334155" }}
              tickFormatter={(value) => `$${value}`}
            />

            <Tooltip content={<CustomNeonTooltip />} />

            <Legend
              verticalAlign="top"
              height={36}
              wrapperStyle={{ fontSize: "12px", paddingBottom: "10px" }}
              formatter={(value) => {
                if (value === "totalRevenue") return <span className="text-cyan-400 font-semibold">Total Monthly Runoff MRR</span>;
                if (value === "plan105Revenue") return <span className="text-amber-400 font-medium">$105 Plan (Advocacy + State Complaints)</span>;
                if (value === "plan55Revenue") return <span className="text-purple-400 font-medium">$55 Plan (Advocacy Only)</span>;
                return value;
              }}
            />

            {/* 1. Total Projected Monthly Income (Neon Cyan) */}
            {(viewMode === "all" || viewMode === "total") && (
              <Line
                type="monotone"
                dataKey="totalRevenue"
                name="totalRevenue"
                stroke="#00f5ff"
                strokeWidth={3.5}
                dot={{
                  r: 5,
                  fill: "#0f172a",
                  stroke: "#00f5ff",
                  strokeWidth: 2.5,
                  filter: "url(#neonGlowCyanLine)",
                }}
                activeDot={{
                  r: 8,
                  fill: "#00f5ff",
                  stroke: "#ffffff",
                  strokeWidth: 2,
                }}
                style={{ filter: "url(#neonGlowCyanLine)" }}
              />
            )}

            {/* 2. $105 Plan Income (Neon Amber/Gold) */}
            {(viewMode === "all" || viewMode === "breakdown") && (
              <Line
                type="monotone"
                dataKey="plan105Revenue"
                name="plan105Revenue"
                stroke="#fbbf24"
                strokeWidth={2.5}
                strokeDasharray={viewMode === "all" ? "6 4" : undefined}
                dot={{
                  r: 4,
                  fill: "#0f172a",
                  stroke: "#fbbf24",
                  strokeWidth: 2,
                  filter: "url(#neonGlowAmberLine)",
                }}
                activeDot={{
                  r: 7,
                  fill: "#fbbf24",
                  stroke: "#ffffff",
                  strokeWidth: 2,
                }}
                style={{ filter: "url(#neonGlowAmberLine)" }}
              />
            )}

            {/* 3. $55 Plan Income (Neon Purple/Violet) */}
            {(viewMode === "all" || viewMode === "breakdown") && (
              <Line
                type="monotone"
                dataKey="plan55Revenue"
                name="plan55Revenue"
                stroke="#c084fc"
                strokeWidth={2.5}
                strokeDasharray={viewMode === "all" ? "4 4" : undefined}
                dot={{
                  r: 4,
                  fill: "#0f172a",
                  stroke: "#c084fc",
                  strokeWidth: 2,
                  filter: "url(#neonGlowPurpleLine)",
                }}
                activeDot={{
                  r: 7,
                  fill: "#c084fc",
                  stroke: "#ffffff",
                  strokeWidth: 2,
                }}
                style={{ filter: "url(#neonGlowPurpleLine)" }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary KPI Cards Underneath Graph */}
      <div className="relative z-10 grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Cumulative Backlog */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Cumulative Backlog</span>
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-black font-mono text-cyan-400">
            ${cumulativeBacklog.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500">
            Total {horizon}-month contracted cash
          </div>
        </div>

        {/* Runoff Half-Life */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Runoff Half-Life</span>
            <Calendar className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-black font-mono text-amber-300">
            {halfLifeText}
          </div>
          <div className="text-[11px] text-slate-500">
            Point when revenue reaches ≤ 50%
          </div>
        </div>

        {/* Horizon Floor */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Month {horizon} Terminal Floor</span>
            <TrendingDown className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div className="text-2xl font-black font-mono text-purple-400">
            ${terminalRevenue.toLocaleString()}
            <span className="text-xs font-normal text-slate-400 ml-1">({terminalPct}%)</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Residual monthly baseline
          </div>
        </div>

        {/* Zero-Acquisition Model Note */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Model Dynamics</span>
            <Info className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-sm font-semibold text-slate-200">
            Closed Cohort
          </div>
          <div className="text-[11px] text-slate-400 leading-tight">
            Assumes 0 client conversions or renewals to stress-test runway.
          </div>
        </div>
      </div>

      {/* Interactive Client Commitment Ledger (Collapsible) */}
      <div className="relative z-10 border-t border-slate-800/80 pt-4">
        <button
          onClick={() => setShowLedger((prev) => !prev)}
          className="flex items-center justify-between w-full rounded-lg bg-slate-900/50 px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-900 transition-colors border border-slate-800"
        >
          <span className="flex items-center gap-2 font-semibold">
            <Layers className="h-4 w-4 text-cyan-400" />
            Client Plan Runoff Ledger ({clients.length} Active Accounts) — View & Simulate Durations
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            {showLedger ? "Hide Ledger" : "Expand Ledger"}
            {showLedger ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </button>

        {showLedger && (
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-2 px-3">Client / Student</th>
                  <th className="py-2 px-3">Plan Tier</th>
                  <th className="py-2 px-3">Monthly Rate</th>
                  <th className="py-2 px-3">Months Remaining</th>
                  <th className="py-2 px-3">Expires Month</th>
                  <th className="py-2 px-3 text-right">Simulate Term</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {clients.map((c) => {
                  const expireDate = new Date(
                    baseDate.getFullYear(),
                    baseDate.getMonth() + (c.planMonthsRemaining || 1),
                    1
                  );
                  const expireStr = expireDate.toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  });
                  return (
                    <tr key={c.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-2 px-3 font-sans font-medium text-white">
                        {c.name}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            c.planTier === "$105"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                          }`}
                        >
                          {c.planTier}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-300">
                        {c.planTier === "$105" ? "$105.00/mo" : "$55.00/mo"}
                      </td>
                      <td className="py-2 px-3 font-bold text-cyan-300">
                        {c.planMonthsRemaining} mos
                      </td>
                      <td className="py-2 px-3 text-slate-400">
                        {expireStr}
                      </td>
                      <td className="py-2 px-3 text-right font-sans">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleAdjustMonths(c.id, -1)}
                            disabled={(c.planMonthsRemaining || 1) <= 1}
                            className="rounded bg-slate-800 p-1 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30"
                            title="Decrease 1 month"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleAdjustMonths(c.id, 1)}
                            disabled={(c.planMonthsRemaining || 1) >= 24}
                            className="rounded bg-slate-800 p-1 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30"
                            title="Increase 1 month"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
