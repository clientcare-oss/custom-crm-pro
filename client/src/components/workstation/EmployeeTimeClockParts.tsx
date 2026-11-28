import React from "react";
import { X, Clock, Calendar, Coffee, Utensils, FileSpreadsheet } from "lucide-react";
import {
  formatPunchTimestamp,
  formatHoursMins,
  type TimeClockDayState,
  type TimeClockPunchRecord,
  type TimeClockShiftConfig,
} from "@/lib/employeeTimeClock";

/** Crisp Monochrome Vintage Ink Icons Matching the Parchment Clipboard Style */
export function TimeClockButtonIcon({
  kind,
}: {
  kind: "punch_in" | "punch_out" | "break" | "lunch";
}) {
  const cls = "w-[1.85cqw] h-[1.85cqw] shrink-0";
  if (kind === "punch_in") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5" />
        <path d="M11 8l4 4-4 4" />
        <line x1="3" y1="12" x2="15" y2="12" />
        <path d="M16 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      </svg>
    );
  }
  if (kind === "punch_out") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    );
  }
  if (kind === "break") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden="true">
        <path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z" />
        <path d="M16 10.5h2.2a2.3 2.3 0 0 1 0 4.6H16" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M3 20.5h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M8 5.8c0-1.2 1-1.6 1-2.8M11.8 5.8c0-1.2 1-1.6 1-2.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3v7a2.5 2.5 0 0 0 5 0V3" />
      <line x1="8.5" y1="3" x2="8.5" y2="21" />
      <path d="M17 3c1.6 2 2 4.6 2 7.5V13h-3V3Z" fill="currentColor" stroke="none" />
      <line x1="17.5" y1="13" x2="17.5" y2="21" />
    </svg>
  );
}

/** Mechanical Split-Flap 2-Digit Tile Pair with smooth 3D tick animation on value change */
export function SplitFlapPair({ value }: { value: string }) {
  return (
    <div className="wp-tc-flap-pair">
      <span key={value} className="wp-tc-flap-digits">
        {value}
      </span>
    </div>
  );
}

/** Vintage Manila Paper Time Card with Waypoint Lighthouse Stamp & Live Printed Punches */
export function MechanicalPunchCard({
  punches,
  isStamping,
  onClick,
}: {
  punches: TimeClockPunchRecord[];
  isStamping: boolean;
  onClick: () => void;
}) {
  const recent = punches.slice(-3);

  return (
    <div className="wp-tc-card-slot-mask">
      <button
        type="button"
        onClick={onClick}
        className={`wp-tc-punch-card ${isStamping ? "wp-tc-punch-card-stamping" : ""}`}
        title="Click to inspect today's complete time card punch log"
        aria-label="Inspect today's stamped time card punch log"
      >
        {/* Faint vintage manila timecard table lines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-35"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(96,64,28,0.45) 1px, transparent 1px), linear-gradient(to bottom, rgba(96,64,28,0.45) 1px, transparent 1px)",
            backgroundSize: "20% 25%",
          }}
        />

        {/* Top printed mini-stamps row */}
        <div className="relative z-10 flex items-center justify-between text-[0.52cqw] font-mono font-bold uppercase tracking-wider text-[#3b240c]/85 px-[0.2cqw]">
          <span>IN</span>
          <span>BRK</span>
          <span>LCH</span>
          <span>OUT</span>
        </div>

        {/* Center Lighthouse Stamp + Latest Stamped Time */}
        <div className="relative z-10 flex items-center justify-center gap-[0.55cqw] my-auto">
          <svg
            viewBox="0 0 36 44"
            className="w-[2.1cqw] h-[2.5cqw] text-[#1c1106] shrink-0"
            fill="currentColor"
            aria-hidden="true"
          >
            <polygon points="18,2 13,9 23,9" />
            <rect x="14" y="9" width="8" height="5" />
            <rect x="11" y="14" width="14" height="2.2" />
            <polygon points="13,16.2 23,16.2 26,38 10,38" />
            <rect x="16.4" y="19.5" width="3.2" height="3.8" rx="0.6" fill="#eed8a6" />
            <rect x="16.4" y="26" width="3.2" height="3.8" rx="0.6" fill="#eed8a6" />
            <rect x="7" y="38" width="22" height="3.2" rx="1" />
          </svg>

          {recent.length > 0 && (
            <div className="text-left font-mono text-[0.55cqw] leading-tight text-[#251506] font-bold">
              {recent.map((p) => (
                <div key={p.id} className="truncate max-w-[8.2cqw]">
                  {p.label.replace("Start ", "").replace("End ", "✓ ")} {formatPunchTimestamp(p.timestamp)}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative z-10 text-center text-[0.46cqw] font-serif uppercase tracking-[0.14em] text-[#4b3113]/80">
          {punches.length > 0 ? `${punches.length} stamped · View Log` : "Waypoint Time Card"}
        </div>
      </button>
    </div>
  );
}

/** Clean #000820 Navy & Brass Punch Card History + Shift Schedule Pop-Up */
export function PunchLogModal({
  open,
  onClose,
  state,
  workedMs,
  breakMs,
  lunchMs,
  totalMs,
  onSaveShiftConfig,
  onOpenFullTimesheet,
}: {
  open: boolean;
  onClose: () => void;
  state: TimeClockDayState;
  workedMs: number;
  breakMs: number;
  lunchMs: number;
  totalMs: number;
  onSaveShiftConfig: (cfg: TimeClockShiftConfig) => void;
  onOpenFullTimesheet: () => void;
}) {
  const [editingShift, setEditingShift] = React.useState(false);
  const [draft, setDraft] = React.useState<TimeClockShiftConfig>(state.shiftConfig);

  React.useEffect(() => {
    setDraft(state.shiftConfig);
  }, [state.shiftConfig]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-[#000412]/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Today's Time Card Log"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-xl bg-[#000820] border border-[#C5A059]/35 shadow-[0_24px_65px_rgba(0,0,0,0.92)] overflow-hidden text-[#F5ECD6]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#C5A059]/25 bg-[#030D2B]">
          <div>
            <h2 className="font-serif text-lg font-semibold text-[#FFF4D4]">
              Today&apos;s Stamped Time Card
            </h2>
            <p className="text-xs text-[#9AA9C5] mt-0.5">
              Complete mechanical punch record for {state.dateKey}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[#9AA9C5] hover:text-white hover:bg-white/5 cursor-pointer"
            aria-label="Close time card log"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Summary Totals */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Worked", val: formatHoursMins(workedMs), icon: Clock },
              { label: "Break", val: formatHoursMins(breakMs), icon: Coffee },
              { label: "Lunch", val: formatHoursMins(lunchMs), icon: Utensils },
              { label: "Total", val: formatHoursMins(totalMs), icon: Calendar },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-lg bg-[#05102E] border border-[#C5A059]/20 p-2.5 text-center"
                >
                  <Icon className="w-3.5 h-3.5 mx-auto text-[#C5A059] mb-1" />
                  <div className="text-[10px] uppercase tracking-wider text-[#9AA9C5]">{item.label}</div>
                  <div className="text-sm font-mono font-bold text-[#FFF4D4] mt-0.5">{item.val}</div>
                </div>
              );
            })}
          </div>

          {/* Stamped Punches */}
          <div className="space-y-1.5">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-[#C5A059]">
              Stamped Punches ({state.punches.length})
            </div>
            {state.punches.length === 0 ? (
              <div className="rounded-lg bg-[#040E2A] border border-[#C5A059]/18 py-6 text-center text-xs text-[#9AA9C5]">
                No punches recorded yet today. Press <span className="text-[#DFBE77] font-semibold">PUNCH IN</span> to start your shift.
              </div>
            ) : (
              <div className="space-y-1.5">
                {state.punches.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-[#05102E] border border-[#C5A059]/20 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-[#C5A059] font-bold">#{idx + 1}</span>
                      <span className="font-semibold text-[#FFF4D4]">{p.label}</span>
                    </div>
                    <span className="font-mono text-[#DFBE77]">{formatPunchTimestamp(p.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Optional Shift Schedule Adjustment */}
          <div className="rounded-lg bg-[#040E2A] border border-[#C5A059]/20 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#FFF4D4]">Scheduled Shift Display</span>
              <button
                type="button"
                onClick={() => setEditingShift((v) => !v)}
                className="text-[11px] text-[#DFBE77] hover:underline cursor-pointer"
              >
                {editingShift ? "Cancel" : "Edit Shift"}
              </button>
            </div>
            {editingShift ? (
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <input
                  value={draft.startLabel}
                  onChange={(e) => setDraft((d) => ({ ...d, startLabel: e.target.value }))}
                  placeholder="8:00 AM"
                  className="px-2.5 py-1.5 rounded bg-[#000820] border border-[#C5A059]/35 text-[#FFF4D4]"
                />
                <input
                  value={draft.endLabel}
                  onChange={(e) => setDraft((d) => ({ ...d, endLabel: e.target.value }))}
                  placeholder="4:00 PM"
                  className="px-2.5 py-1.5 rounded bg-[#000820] border border-[#C5A059]/35 text-[#FFF4D4]"
                />
                <input
                  value={draft.scheduledHours}
                  onChange={(e) => setDraft((d) => ({ ...d, scheduledHours: e.target.value }))}
                  placeholder="8.00 hrs"
                  className="px-2.5 py-1.5 rounded bg-[#000820] border border-[#C5A059]/35 text-[#FFF4D4]"
                />
                <button
                  type="button"
                  onClick={() => {
                    onSaveShiftConfig(draft);
                    setEditingShift(false);
                  }}
                  className="px-3 py-1.5 rounded font-semibold bg-[#C5A059] text-[#050D24] hover:bg-[#DFBE77] cursor-pointer"
                >
                  Save Shift
                </button>
              </div>
            ) : (
              <div className="text-xs text-[#9AA9C5]">
                {state.shiftConfig.startLabel} – {state.shiftConfig.endLabel} ({state.shiftConfig.scheduledHours}) · Break {state.shiftConfig.breakMinutes}m · Lunch {state.shiftConfig.lunchMinutes}m
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#C5A059]/20 bg-[#020B26]">
          <button
            type="button"
            onClick={onOpenFullTimesheet}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#DFBE77] hover:text-[#FFF4D4] cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Open Full Timesheet (PG-038-TIM)
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#0D1E42] border border-[#C5A059]/40 text-[#FFF4D4] hover:border-[#DFBE77] cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
