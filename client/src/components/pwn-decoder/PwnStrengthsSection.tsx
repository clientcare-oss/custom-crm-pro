import React from "react";
import { CheckCircle2, ShieldCheck, ThumbsUp } from "lucide-react";

interface PwnStrengthsSectionProps {
  strengths: Array<{ title: string; type: string; description: string }>;
}

export const PwnStrengthsSection: React.FC<PwnStrengthsSectionProps> = ({ strengths }) => {
  if (!strengths || strengths.length === 0) return null;

  return (
    <div id="section-strengths" className="w-full space-y-3">
      {/* Header */}
      <div className="border-b border-white/5 pb-2.5">
        <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <span className="text-emerald-400">✓</span>
          <span>WHAT THIS PWN DOES WELL</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Genuinely strong documentation areas located in this notice for a balanced advocate evaluation.
        </p>
      </div>

      {/* Strengths Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {strengths.map((s, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-xl border border-emerald-500/25 bg-[#000820] space-y-1.5 shadow-sm hover:border-emerald-500/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                {s.title}
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed pl-6">
              {s.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
