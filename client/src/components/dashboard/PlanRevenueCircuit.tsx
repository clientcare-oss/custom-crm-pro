import React from "react";
import { Shield, Scale, Zap, DollarSign, Users, TrendingUp, Sparkles } from "lucide-react";

export interface PlanClientItem {
  id: number;
  name: string;
  planTier: string; // "$55" or "$105"
  planMonthsRemaining: number;
  accountStatus?: string;
  billingStatus?: string;
  schoolName?: string;
}

interface PlanRevenueCircuitProps {
  clients55: PlanClientItem[];
  clients105: PlanClientItem[];
  totalMRR: number;
  totalClients: number;
  isLoading?: boolean;
}

export function PlanRevenueCircuit({
  clients55,
  clients105,
  totalMRR,
  totalClients,
  isLoading = false,
}: PlanRevenueCircuitProps) {
  const count55 = clients55.length;
  const count105 = clients105.length;

  const mrr55 = count55 * 55;
  const mrr105 = count105 * 105;
  const arr = totalMRR * 12;
  const arpu = totalClients > 0 ? (totalMRR / totalClients).toFixed(2) : "0.00";

  // Calculate average months remaining per tier
  const avgMonths55 =
    count55 > 0
      ? (clients55.reduce((sum, c) => sum + (c.planMonthsRemaining || 0), 0) / count55).toFixed(1)
      : "0";
  const avgMonths105 =
    count105 > 0
      ? (clients105.reduce((sum, c) => sum + (c.planMonthsRemaining || 0), 0) / count105).toFixed(1)
      : "0";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-950/90 via-slate-900/80 to-slate-950/95 p-6 shadow-2xl backdrop-blur-xl">
      {/* Ambient background glow orbs */}
      <div className="pointer-events-none absolute -top-24 left-1/4 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -top-24 right-1/4 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 h-72 w-96 rounded-full bg-blue-600/10 blur-3xl" />

      {/* Section Header */}
      <div className="relative z-10 mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/20 text-cyan-400">
              <Zap className="h-3.5 w-3.5 animate-pulse" />
            </span>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Recurring Membership Plans & Revenue Conduits
            </h2>
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
              Live Telemetry
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Active monthly subscriptions feeding the practice recurring income pipeline via neon circuit conflux.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="h-2 w-2 rounded-full bg-emerald-400 -ml-3.5" />
            <span className="font-mono font-medium">Billing Pipeline Active</span>
          </div>
        </div>
      </div>

      {/* Row 1: The Two Plan Blocks */}
      <div className="relative z-10 grid gap-6 md:grid-cols-2">
        {/* $55 Plan Block */}
        <div className="group relative rounded-xl border border-sky-500/30 bg-gradient-to-br from-sky-950/40 via-slate-900/70 to-slate-950/80 p-5 shadow-lg shadow-sky-950/20 transition-all duration-300 hover:border-sky-400/60 hover:shadow-sky-500/10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-400/40 bg-sky-500/15 text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.25)]">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Anchor Membership</span>
                  <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">Tier 1</span>
                </div>
                <h3 className="text-lg font-bold text-white">Advocacy Only Plan</h3>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black tracking-tight text-sky-400 font-mono drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]">
                $55<span className="text-xs font-normal text-sky-300/80">/mo</span>
              </div>
              <div className="text-[11px] text-slate-400">per student case</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-sky-900/40 pt-4">
            <div>
              <div className="text-xs font-medium text-slate-400">Active Clients Paying</div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold tracking-tight text-white font-mono drop-shadow-[0_0_10px_rgba(56,189,248,0.4)]">
                  {isLoading ? "-" : count55}
                </span>
                <span className="text-xs text-sky-300">families</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium text-slate-400">Monthly Yield</div>
              <div className="mt-1 text-xl font-bold font-mono text-sky-400">
                ${isLoading ? "-" : mrr55.toLocaleString()}
                <span className="text-xs font-normal text-slate-400">/mo</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg bg-sky-950/30 px-3 py-2 text-xs text-sky-200/90 border border-sky-800/30">
            <span>Avg Remaining Term:</span>
            <span className="font-mono font-semibold text-sky-300">{avgMonths55} months</span>
          </div>

          {/* Bottom Terminal Point (Origin of Circuit) */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_10px_#38bdf8] ring-4 ring-sky-500/20" />
          </div>
        </div>

        {/* $105 Plan Block */}
        <div className="group relative rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-slate-900/70 to-slate-950/80 p-5 shadow-lg shadow-amber-950/20 transition-all duration-300 hover:border-amber-400/60 hover:shadow-amber-500/10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-500/15 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                <Scale className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Compass Membership</span>
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">Tier 2</span>
                </div>
                <h3 className="text-lg font-bold text-white">Advocacy + State Complaints</h3>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black tracking-tight text-amber-400 font-mono drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                $105<span className="text-xs font-normal text-amber-300/80">/mo</span>
              </div>
              <div className="text-[11px] text-slate-400">comprehensive support</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-amber-900/40 pt-4">
            <div>
              <div className="text-xs font-medium text-slate-400">Active Clients Paying</div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold tracking-tight text-white font-mono drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]">
                  {isLoading ? "-" : count105}
                </span>
                <span className="text-xs text-amber-300">families</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium text-slate-400">Monthly Yield</div>
              <div className="mt-1 text-xl font-bold font-mono text-amber-400">
                ${isLoading ? "-" : mrr105.toLocaleString()}
                <span className="text-xs font-normal text-slate-400">/mo</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg bg-amber-950/30 px-3 py-2 text-xs text-amber-200/90 border border-amber-800/30">
            <span>Avg Remaining Term:</span>
            <span className="font-mono font-semibold text-amber-300">{avgMonths105} months</span>
          </div>

          {/* Bottom Terminal Point (Origin of Circuit) */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_10px_#f59e0b] ring-4 ring-amber-500/20" />
          </div>
        </div>
      </div>

      {/* Row 2: Responsive Neon Circuit Board Connector */}
      <div className="relative z-10 -my-1 py-2 overflow-visible">
        <svg
          className="w-full h-24 overflow-visible"
          viewBox="0 0 800 100"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Neon Glow Filters */}
            <filter id="neonGlowCyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="neonGlowAmber" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="neonGlowNexus" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Gradient Conduits */}
            <linearGradient id="cyanConduit" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#00f5ff" />
            </linearGradient>
            <linearGradient id="amberConduit" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
          </defs>

          {/* Background PCB Grid Lines */}
          <line x1="200" y1="20" x2="600" y2="20" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 6" opacity="0.4" />
          <line x1="300" y1="50" x2="500" y2="50" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 6" opacity="0.4" />

          {/* LEFT CONDUIT ($55 Plan from x=200 down to center x=400, y=90) */}
          {/* Outer soft glow track */}
          <path
            d="M 200 4 L 200 35 L 380 35 L 396 52 L 396 92"
            stroke="#38bdf8"
            strokeWidth="6"
            strokeOpacity="0.25"
            filter="url(#neonGlowCyan)"
          />
          {/* Solid core circuit path */}
          <path
            d="M 200 4 L 200 35 L 380 35 L 396 52 L 396 92"
            stroke="url(#cyanConduit)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Flowing animated electricity pulses */}
          <path
            d="M 200 4 L 200 35 L 380 35 L 396 52 L 396 92"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeDasharray="8 20"
            strokeLinecap="round"
            className="animate-circuit-flow"
          />

          {/* RIGHT CONDUIT ($105 Plan from x=600 down to center x=400, y=90) */}
          {/* Outer soft glow track */}
          <path
            d="M 600 4 L 600 35 L 420 35 L 404 52 L 404 92"
            stroke="#fbbf24"
            strokeWidth="6"
            strokeOpacity="0.25"
            filter="url(#neonGlowAmber)"
          />
          {/* Solid core circuit path */}
          <path
            d="M 600 4 L 600 35 L 420 35 L 404 52 L 404 92"
            stroke="url(#amberConduit)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Flowing animated electricity pulses */}
          <path
            d="M 600 4 L 600 35 L 420 35 L 404 52 L 404 92"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeDasharray="8 20"
            strokeLinecap="round"
            className="animate-circuit-flow"
          />

          {/* Vias and Circuit Junction Pads */}
          {/* Left Bend Via (200, 35) */}
          <circle cx="200" cy="35" r="4.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="200" cy="35" r="2" fill="#38bdf8" />

          {/* Left Intermediate Via (380, 35) */}
          <circle cx="380" cy="35" r="4.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="380" cy="35" r="2" fill="#38bdf8" />

          {/* Right Bend Via (600, 35) */}
          <circle cx="600" cy="35" r="4.5" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.5" />
          <circle cx="600" cy="35" r="2" fill="#fbbf24" />

          {/* Right Intermediate Via (420, 35) */}
          <circle cx="420" cy="35" r="4.5" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.5" />
          <circle cx="420" cy="35" r="2" fill="#fbbf24" />

          {/* Center Nexus Convergence Hub (x=400, y=90) */}
          <g transform="translate(400, 92)">
            {/* Pulsing Aura */}
            <circle cx="0" cy="0" r="14" fill="none" stroke="#38bdf8" strokeWidth="1" opacity="0.3" className="animate-ping" />
            {/* Hexagonal Connector Plate */}
            <rect x="-12" y="-6" width="24" height="12" rx="3" fill="#090d16" stroke="#38bdf8" strokeWidth="1.5" filter="url(#neonGlowNexus)" />
            <circle cx="-5" cy="0" r="2.5" fill="#00f5ff" />
            <circle cx="5" cy="0" r="2.5" fill="#fbbf24" />
          </g>
        </svg>
      </div>

      {/* Row 3: Monthly Recurring Income (MRR) Display Console */}
      <div className="relative z-10 overflow-hidden rounded-xl border border-cyan-500/40 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 shadow-2xl shadow-cyan-950/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/50 bg-cyan-500/20 text-cyan-300 shadow-[0_0_25px_rgba(0,245,255,0.4)]">
              <DollarSign className="h-8 w-8 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                  Total Monthly Recurring Income
                </span>
                <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  Current MRR
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl lg:text-5xl font-black tracking-tight text-white font-mono drop-shadow-[0_0_15px_rgba(0,245,255,0.5)]">
                  ${isLoading ? "..." : totalMRR.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-sm font-semibold text-slate-400">/ month</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Combined recurring revenue generated across all active {totalClients} student advocacy memberships.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-8 w-full md:w-auto">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                <TrendingUp className="h-3 w-3 text-cyan-400" />
                <span>Annual Run-Rate</span>
              </div>
              <div className="text-lg font-bold font-mono text-cyan-300">
                ${isLoading ? "..." : arr.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[10px] text-slate-500">ARR extrapolation</div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                <Users className="h-3 w-3 text-amber-400" />
                <span>Active Subscriptions</span>
              </div>
              <div className="text-lg font-bold font-mono text-white">
                {isLoading ? "..." : totalClients}
              </div>
              <div className="text-[10px] text-slate-500">total accounts</div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                <Sparkles className="h-3 w-3 text-purple-400" />
                <span>Blended ARPU</span>
              </div>
              <div className="text-lg font-bold font-mono text-purple-300">
                ${isLoading ? "..." : arpu}
              </div>
              <div className="text-[10px] text-slate-500">avg / family</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
