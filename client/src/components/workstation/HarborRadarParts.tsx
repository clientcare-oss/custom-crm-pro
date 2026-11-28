import React, { useState } from "react";
import {
  CheckCircle2,
  Play,
  X,
  Clock,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  Plus,
  Flag,
  User,
  Calendar as CalendarIcon,
} from "lucide-react";
import {
  DURATION_META,
  formatDueSummary,
  type DurationBucket,
  type HarborViewMode,
  type PlacedRadarShip,
  type RadarTaskItem,
} from "@/lib/harborRadarTasks";

/** Crisp miniature maritime ship icon for the left Harbor Status header row */
function MiniShipGlyph() {
  return (
    <svg viewBox="0 0 28 20" className="w-[1.55cqw] h-[1.15cqw] shrink-0" fill="none" aria-hidden="true">
      <line x1="14" y1="2" x2="14" y2="6" stroke="#45270A" strokeWidth="1.6" />
      <rect x="9" y="5.5" width="10" height="4" rx="0.8" fill="#8C6231" stroke="#361E08" strokeWidth="1.2" />
      <path d="M2.5 10.5H25.5L22 17H6L2.5 10.5Z" fill="#6B441C" stroke="#2D1705" strokeWidth="1.3" />
    </svg>
  );
}

/** Crisp colored maritime pennant flag matching the reference parchment legend */
function PennantFlagGlyph({ color, stroke }: { color: string; stroke: string }) {
  return (
    <svg viewBox="0 0 22 22" className="w-[1.32cqw] h-[1.32cqw] shrink-0" fill="none" aria-hidden="true">
      <line x1="4" y1="3" x2="4" y2="20" stroke="#3D240B" strokeWidth="2.1" strokeLinecap="round" />
      <path
        d="M5 4.2C9 3.2 13 6.2 19 4.8L17.4 9.5L19 13.8C13 15 9 12.2 5 13.2V4.2Z"
        fill={color}
        stroke={stroke}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface HarborStatusBoardProps {
  counts: Record<DurationBucket, number> & { total: number };
  activeFilter: DurationBucket | "all";
  onSelectFilter: (bucket: DurationBucket | "all") => void;
}

/** Left Hanging Parchment Board — Live Harbor Status & Interactive Ring Filter */
export function HarborStatusBoard({ counts, activeFilter, onSelectFilter }: HarborStatusBoardProps) {
  const rows: Array<{ key: DurationBucket; meta: (typeof DURATION_META)[DurationBucket] }> = [
    { key: "short", meta: DURATION_META.short },
    { key: "30m", meta: DURATION_META["30m"] },
    { key: "1h", meta: DURATION_META["1h"] },
    { key: "2-3h", meta: DURATION_META["2-3h"] },
  ];

  return (
    <div className="wp-hr-status-board" role="region" aria-label="Harbor Status task duration breakdown">
      <div className="wp-hr-status-heading">Harbor Status</div>

      <div className="flex flex-col flex-1 justify-evenly pt-[0.2cqw]">
        <button
          type="button"
          onClick={() => onSelectFilter("all")}
          className={`wp-hr-status-row ${activeFilter === "all" ? "wp-hr-status-row-active" : ""}`}
          title="Show all tasks across all radar rings"
        >
          <span className="flex items-center gap-[0.42cqw] min-w-0">
            <MiniShipGlyph />
            <span className="wp-hr-status-label">Total Tasks</span>
          </span>
          <span className="wp-hr-status-count">{counts.total}</span>
        </button>

        {rows.map(({ key, meta }) => (
          <button
            key={key}
            type="button"
            onClick={() => onSelectFilter(activeFilter === key ? "all" : key)}
            className={`wp-hr-status-row ${activeFilter === key ? "wp-hr-status-row-active" : ""}`}
            title={`Filter radar to ${meta.label} tasks`}
          >
            <span className="flex items-center gap-[0.42cqw] min-w-0">
              <PennantFlagGlyph color={meta.flagColor} stroke={meta.flagStroke} />
              <span className="wp-hr-status-label">{meta.label}</span>
            </span>
            <span className="wp-hr-status-count">{counts[key]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface RadarTaskShipProps {
  ship: PlacedRadarShip;
  isSelected: boolean;
  dimmed: boolean;
  onSelect: (task: RadarTaskItem) => void;
  onHover: (task: RadarTaskItem | null) => void;
}

/** Photorealistic miniature Task Ship plotted onto its exact duration ring with colored pennant & reflection */
export function RadarTaskShip({ ship, isSelected, dimmed, onSelect, onHover }: RadarTaskShipProps) {
  const { task, xPct, yPct } = ship;
  const meta = DURATION_META[task.bucket];
  const showAlert = task.isOverdue || task.isUrgent;
  const bobDelay = `${((task.rawId * 0.7) % 3.6).toFixed(2)}s`;

  return (
    <button
      type="button"
      onClick={() => onSelect(task)}
      onMouseEnter={() => onHover(task)}
      onMouseLeave={() => onHover(null)}
      className="wp-hr-ship-btn"
      style={{
        left: `${xPct.toFixed(2)}%`,
        top: `${yPct.toFixed(2)}%`,
        animationDelay: bobDelay,
        opacity: dimmed ? 0.24 : 1,
      }}
      title={`${task.title} (${meta.shortLabel})`}
      aria-label={`Task ship: ${task.title}, estimated ${meta.label}`}
    >
      {/* Golden pulsing target lock on Recommended First or Selected ship */}
      {(task.isRecommendedFirst || isSelected) && (
        <span className="wp-hr-ship-target-ring" aria-hidden="true" />
      )}

      <svg viewBox="0 0 64 52" className="w-full h-full overflow-visible drop-shadow-[0_3px_6px_rgba(0,0,0,0.92)]" fill="none">
        {/* Warm golden water shimmer reflection below hull */}
        <ellipse cx="32" cy="40" rx="14" ry="3.2" fill="#FDE68A" fillOpacity="0.28" />
        <ellipse cx="32" cy="44.5" rx="9" ry="1.8" fill="#F59E0B" fillOpacity="0.22" />

        {/* Mast + Color-coded Duration Pennant Flag */}
        <line x1="33" y1="6" x2="33" y2="23" stroke="#E7C883" strokeWidth="1.7" strokeLinecap="round" />
        <path
          d="M34 7.2C38.5 6.4 42.5 8.8 48.5 7.4L47 11.4L48.5 15.2C42.5 16.4 38.5 13.8 34 14.8V7.2Z"
          fill={meta.flagColor}
          stroke={meta.flagStroke}
          strokeWidth="1.1"
        />

        {/* Cabin superstructure with warm lit porthole windows */}
        <rect x="20" y="20" width="22" height="7" rx="1.5" fill="#F6E9C8" stroke="#4A2E10" strokeWidth="1.1" />
        <rect x="23" y="22.2" width="3.2" height="2.4" rx="0.4" fill="#FBBF24" />
        <rect x="28.5" y="22.2" width="3.2" height="2.4" rx="0.4" fill="#FBBF24" />
        <rect x="34" y="22.2" width="3.2" height="2.4" rx="0.4" fill="#FBBF24" />

        {/* Dark mahogany & brass ship hull */}
        <path
          d="M11 27.5H53L47.5 36.2H16.5L11 27.5Z"
          fill={task.bucket === "2-3h" ? "#5C1914" : "#3E2610"}
          stroke="#DFB664"
          strokeWidth="1.2"
        />
        <line x1="13.5" y1="30.5" x2="50.5" y2="30.5" stroke="#F8D888" strokeWidth="0.9" strokeOpacity="0.7" />
      </svg>

      {/* Crimson Alert "!" Beacon on Overdue / Urgent Ships */}
      {showAlert && (
        <span
          className="absolute right-[4%] bottom-[16%] w-[1.35cqw] h-[1.35cqw] min-w-[14px] min-h-[14px] rounded-full bg-gradient-to-b from-red-500 to-red-700 border border-[#FDE68A] text-white font-extrabold text-[0.82cqw] flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.9)]"
          aria-label="Urgent or overdue task"
        >
          !
        </span>
      )}
    </button>
  );
}

interface TaskCommandDrawerProps {
  task: RadarTaskItem | null;
  onClose: () => void;
  onChangeBucket: (uid: string, bucket: DurationBucket) => void;
  onStartTask: (task: RadarTaskItem) => void;
  onCompleteTask: (task: RadarTaskItem) => void;
  onOpenAllTasks: () => void;
  isBusy: boolean;
}

/** Interactive Admiralty Command Orders Drawer when an employee clicks a ship on Harbor Radar */
export function TaskCommandDrawer({
  task,
  onClose,
  onChangeBucket,
  onStartTask,
  onCompleteTask,
  onOpenAllTasks,
  isBusy,
}: TaskCommandDrawerProps) {
  if (!task) return null;
  const meta = DURATION_META[task.bucket];

  return (
    <div
      role="dialog"
      aria-label={`Task Orders: ${task.title}`}
      className="absolute right-[2.2%] bottom-[17.2%] z-30 w-[26cqw] min-w-[290px] max-w-[380px] rounded-xl bg-[#05142B]/96 border border-[#C5A059]/75 shadow-[0_22px_54px_rgba(0,0,0,0.95)] backdrop-blur-md p-4 text-[#F6E8C8]"
    >
      <div className="flex items-start justify-between gap-2 border-b border-[#C5A059]/25 pb-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            {task.isRecommendedFirst && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-[#FFE394] border border-amber-400/55">
                <Sparkles className="w-3 h-3" /> Do First
              </span>
            )}
            {(task.isOverdue || task.isUrgent) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-400/50">
                <AlertTriangle className="w-3 h-3" /> {task.isOverdue ? "Overdue" : "Urgent"}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#020A17]/80 text-[#DFC896] border border-[#3A2C18]">
              <Clock className="w-2.5 h-2.5" /> {meta.shortLabel}
            </span>
          </div>
          <h3 className="font-serif font-bold text-base leading-snug text-[#FFF5D8]">{task.title}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-[#C6B697] hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
          aria-label="Close task orders"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {task.description && (
        <p className="text-xs text-[#C6B697] mt-2.5 leading-relaxed line-clamp-3">{task.description}</p>
      )}

      <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
        <div className="rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/70 px-2.5 py-1.5">
          <div className="text-[#9E8B6B] text-[10px] uppercase tracking-wider flex items-center gap-1">
            <User className="w-3 h-3" /> Student / Case
          </div>
          <div className="font-semibold text-[#F6E8C8] truncate mt-0.5">
            {task.studentName || task.projectName || "General Practice"}
          </div>
        </div>
        <div className="rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/70 px-2.5 py-1.5">
          <div className="text-[#9E8B6B] text-[10px] uppercase tracking-wider flex items-center gap-1">
            <CalendarIcon className="w-3 h-3" /> Due Window
          </div>
          <div className={`font-semibold truncate mt-0.5 ${task.isOverdue ? "text-rose-300" : "text-[#FFE394]"}`}>
            {formatDueSummary(task.dueDate)}
          </div>
        </div>
      </div>

      {/* Move ship between the 4 radar duration rings */}
      <div className="mt-3">
        <div className="text-[10px] uppercase tracking-wider text-[#A69371] mb-1.5 flex items-center gap-1">
          <Flag className="w-3 h-3" /> Estimated Time Ring
        </div>
        <div className="grid grid-cols-4 gap-1">
          {(["short", "30m", "1h", "2-3h"] as DurationBucket[]).map((b) => {
            const active = task.bucket === b;
            return (
              <button
                key={b}
                type="button"
                onClick={() => onChangeBucket(task.uid, b)}
                className={`px-1.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer border ${
                  active
                    ? "bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border-[#FFE394]/60"
                    : "bg-[#020A17]/85 text-[#D8C7A5] border-[#3A2C18] hover:border-[#C5A059]/60"
                }`}
              >
                {DURATION_META[b].shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="flex items-center gap-2 mt-3.5">
        {!task.isInProgress && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onStartTask(task)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-bold bg-gradient-to-r from-[#DFBE77] via-[#C5A059] to-[#9E7D3B] text-[#07162B] border border-[#FFE394]/50 hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Start Now
          </button>
        )}
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onCompleteTask(task)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-bold bg-emerald-600/90 hover:bg-emerald-500 text-white border border-emerald-400/50 transition-all cursor-pointer disabled:opacity-50"
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Complete
        </button>
        <button
          type="button"
          onClick={onOpenAllTasks}
          className="h-8 px-2.5 rounded-lg bg-[#020A17] border border-[#3A2C18] text-[#D8C7A5] hover:text-[#FFF4D4] hover:border-[#C5A059]/60 transition-colors cursor-pointer"
          title="Open Full Tasks Queue (PG-009)"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

interface TaskFleetOverlayProps {
  mode: Exclude<HarborViewMode, "radar">;
  tasks: RadarTaskItem[];
  onSelectTask: (task: RadarTaskItem) => void;
  onCompleteTask: (task: RadarTaskItem) => void;
  onCreateQuickTask: (title: string, bucket: DurationBucket) => void;
  onReturnToRadar: () => void;
  isBusy: boolean;
}

/** Translucent Admiralty Fleet Deck overlay inside the radar viewport for Fleet / Priority / Student / Due Time views */
export function TaskFleetOverlay({
  mode,
  tasks,
  onSelectTask,
  onCompleteTask,
  onCreateQuickTask,
  onReturnToRadar,
  isBusy,
}: TaskFleetOverlayProps) {
  const [newTitle, setNewTitle] = useState("");
  const [newBucket, setNewBucket] = useState<DurationBucket>("short");

  const modeTitle: Record<Exclude<HarborViewMode, "radar">, string> = {
    fleet: "Task Fleet — Ranked Do-First Order",
    priority: "Task Fleet — Grouped By Priority",
    student: "Task Fleet — Grouped By Student / Case",
    due: "Task Fleet — Grouped By Due Time",
  };

  const groups = React.useMemo(() => {
    const map = new Map<string, RadarTaskItem[]>();
    const push = (k: string, t: RadarTaskItem) => {
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    };

    if (mode === "fleet") {
      const sorted = [...tasks].sort((a, b) => b.score - a.score);
      if (sorted.length > 0) {
        map.set("Recommended Watch Order", sorted);
      }
      return Array.from(map.entries());
    }
    if (mode === "priority") {
      ["Urgent / Stuck", "High Priority", "Medium Priority", "Low Priority"].forEach((k) => map.set(k, []));
      tasks.forEach((t) => {
        if (t.priority === "urgent") push("Urgent / Stuck", t);
        else if (t.priority === "high") push("High Priority", t);
        else if (t.priority === "medium") push("Medium Priority", t);
        else push("Low Priority", t);
      });
      return Array.from(map.entries()).filter(([, list]) => list.length > 0);
    }
    if (mode === "student") {
      tasks.forEach((t) => push(t.studentName || t.projectName || "General Practice", t));
      return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
    }
    // due
    ["Overdue", "Due Today", "Upcoming", "Unscheduled"].forEach((k) => map.set(k, []));
    tasks.forEach((t) => {
      if (t.isOverdue) push("Overdue", t);
      else if (t.isDueToday) push("Due Today", t);
      else if (t.dueDate) push("Upcoming", t);
      else push("Unscheduled", t);
    });
    return Array.from(map.entries()).filter(([, list]) => list.length > 0);
  }, [mode, tasks]);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTitle.trim();
    if (!clean) return;
    onCreateQuickTask(clean, newBucket);
    setNewTitle("");
  };

  return (
    <div className="absolute left-[31.2%] top-[12.2%] width-[41.6%] w-[41.6%] h-[66.2%] z-25 rounded-2xl bg-[#041225]/94 border border-[#C5A059]/65 shadow-[0_24px_60px_rgba(0,0,0,0.92)] backdrop-blur-md flex flex-col overflow-hidden text-[#F6E8C8]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#C5A059]/25 bg-[#020A17]/75 shrink-0">
        <h2 className="font-serif font-bold text-sm text-[#FFE4A0] tracking-wide">{modeTitle[mode]}</h2>
        <button
          type="button"
          onClick={onReturnToRadar}
          className="text-[11px] font-semibold text-[#C6B697] hover:text-[#FFF4D4] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 cursor-pointer"
        >
          Back to Radar
        </button>
      </div>

      {/* Quick Dispatch New Task bar */}
      <form onSubmit={handleQuickAdd} className="flex items-center gap-1.5 px-3 py-2 border-b border-[#C5A059]/15 bg-[#061830]/70 shrink-0">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Dispatch a new task onto Harbor Radar..."
          className="flex-1 min-w-0 h-7 px-2.5 rounded-md bg-[#020A17]/90 border border-[#3A2C18] focus:border-[#C5A059] text-xs text-[#FFF4D4] placeholder:text-[#8E7D60] focus:outline-none"
        />
        <select
          value={newBucket}
          onChange={(e) => setNewBucket(e.target.value as DurationBucket)}
          className="h-7 px-1.5 rounded-md bg-[#020A17]/90 border border-[#3A2C18] text-[11px] text-[#FFE394] focus:outline-none"
        >
          <option value="short">5–10m</option>
          <option value="30m">30m</option>
          <option value="1h">1 Hr</option>
          <option value="2-3h">2–3 Hr</option>
        </select>
        <button
          type="submit"
          disabled={isBusy || !newTitle.trim()}
          className="h-7 px-2.5 rounded-md bg-gradient-to-r from-[#DFBE77] to-[#A67C2E] text-[#07162B] font-bold text-xs inline-flex items-center gap-1 cursor-pointer disabled:opacity-45"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </form>

      <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-3">
        {groups.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#A69371]">
            Harbor clear — no open tasks in this view.
          </div>
        ) : (
          groups.map(([groupName, items]) => (
            <div key={groupName} className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#C5A059] px-1">
                {groupName} ({items.length})
              </div>
              {items.map((t) => {
                const meta = DURATION_META[t.bucket];
                return (
                  <div
                    key={t.uid}
                    className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-[#020A17]/80 border border-[#3A2C18]/75 hover:border-[#C5A059]/60 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectTask(t)}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: meta.flagColor, boxShadow: `0 0 6px ${meta.flagColor}` }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-[#FFF4D4] truncate flex items-center gap-1.5">
                          <span className="truncate">{t.title}</span>
                          {t.isRecommendedFirst && (
                            <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded bg-amber-400/20 text-[#FFE394] border border-amber-400/50 shrink-0">
                              Do First
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#A69371] truncate">
                          {meta.shortLabel} · {t.studentName || t.projectName || "General"} · {formatDueSummary(t.dueDate)}
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onCompleteTask(t)}
                      className="p-1.5 rounded-md text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/15 transition-colors cursor-pointer shrink-0"
                      title="Mark complete"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
