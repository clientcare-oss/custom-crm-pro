/**
 * Waypoint Employee Time Clock (PG-055) — Persistent Daily Punch Engine & Mechanical Audio Feedback
 * Synchronizes live shift state between PG-055 (Employee Time Clock) and PG-052 (My Workstation arrival card),
 * and integrates cleanly with backend trpc.timeTracking.* procedures.
 */

export type TimeClockStatus = "clocked_out" | "working" | "on_break" | "on_lunch";

export type TimeClockPunchAction =
  | "punch_in"
  | "punch_out"
  | "start_break"
  | "end_break"
  | "start_lunch"
  | "end_lunch";

export interface TimeClockPunchRecord {
  id: string;
  action: TimeClockPunchAction;
  label: string;
  timestamp: number;
}

export interface TimeClockShiftConfig {
  startLabel: string;
  endLabel: string;
  scheduledHours: string;
  breakMinutes: number;
  lunchMinutes: number;
}

export interface TimeClockDayState {
  dateKey: string;
  status: TimeClockStatus;
  activeSegmentStartMs: number | null;
  firstPunchInMs: number | null;
  workedAccumMs: number;
  breakAccumMs: number;
  lunchAccumMs: number;
  punches: TimeClockPunchRecord[];
  shiftConfig: TimeClockShiftConfig;
}

export const TIME_CLOCK_STORAGE_KEY = "waypoint_employee_time_clock_v1";
export const LEGACY_SHIFT_STORAGE_KEY = "waypoint_workstation_shift_start";

export const DEFAULT_SHIFT_CONFIG: TimeClockShiftConfig = {
  startLabel: "8:00 AM",
  endLabel: "4:00 PM",
  scheduledHours: "8.00 hrs",
  breakMinutes: 30,
  lunchMinutes: 60,
};

export function getLocalDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function createEmptyDayState(date = new Date()): TimeClockDayState {
  return {
    dateKey: getLocalDateKey(date),
    status: "clocked_out",
    activeSegmentStartMs: null,
    firstPunchInMs: null,
    workedAccumMs: 0,
    breakAccumMs: 0,
    lunchAccumMs: 0,
    punches: [],
    shiftConfig: { ...DEFAULT_SHIFT_CONFIG },
  };
}

export function loadTimeClockState(): TimeClockDayState {
  const todayKey = getLocalDateKey();
  try {
    const raw = localStorage.getItem(TIME_CLOCK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TimeClockDayState;
      if (parsed && parsed.dateKey === todayKey) {
        return {
          ...createEmptyDayState(),
          ...parsed,
          shiftConfig: {
            ...DEFAULT_SHIFT_CONFIG,
            ...(parsed.shiftConfig || {}),
          },
          punches: Array.isArray(parsed.punches) ? parsed.punches : [],
        };
      }
      // New calendar day: preserve custom shiftConfig while resetting daily accumulators
      if (parsed?.shiftConfig) {
        return {
          ...createEmptyDayState(),
          shiftConfig: { ...DEFAULT_SHIFT_CONFIG, ...parsed.shiftConfig },
        };
      }
    }
    // Migrate legacy PG-052 shift start if user already clocked in earlier today
    const legacy = localStorage.getItem(LEGACY_SHIFT_STORAGE_KEY);
    if (legacy) {
      const startMs = Number(legacy);
      if (Number.isFinite(startMs) && startMs > 0 && getLocalDateKey(new Date(startMs)) === todayKey) {
        return {
          ...createEmptyDayState(),
          status: "working",
          activeSegmentStartMs: startMs,
          firstPunchInMs: startMs,
          punches: [
            {
              id: `migrated_${startMs}`,
              action: "punch_in",
              label: "Punch In",
              timestamp: startMs,
            },
          ],
        };
      }
    }
  } catch {
    // ignore storage failures
  }
  return createEmptyDayState();
}

export function saveTimeClockState(state: TimeClockDayState): void {
  try {
    localStorage.setItem(TIME_CLOCK_STORAGE_KEY, JSON.stringify(state));
    if (state.status !== "clocked_out" && state.firstPunchInMs) {
      localStorage.setItem(LEGACY_SHIFT_STORAGE_KEY, String(state.firstPunchInMs));
    } else {
      localStorage.removeItem(LEGACY_SHIFT_STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent("waypoint-time-clock-updated", { detail: state }));
  } catch {
    // ignore storage failures
  }
}

export function computeLiveTotals(state: TimeClockDayState, nowMs: number) {
  const delta =
    state.activeSegmentStartMs && state.status !== "clocked_out"
      ? Math.max(0, nowMs - state.activeSegmentStartMs)
      : 0;

  const workedMs = state.workedAccumMs + (state.status === "working" ? delta : 0);
  const breakMs = state.breakAccumMs + (state.status === "on_break" ? delta : 0);
  const lunchMs = state.lunchAccumMs + (state.status === "on_lunch" ? delta : 0);
  const totalMs = workedMs + breakMs + lunchMs;

  return { workedMs, breakMs, lunchMs, totalMs, currentSegmentMs: delta };
}

export function applyTimeClockAction(
  prev: TimeClockDayState,
  action: TimeClockPunchAction,
  nowMs = Date.now()
): { next: TimeClockDayState; ok: boolean; error?: string; vfdMessage: string } {
  const todayKey = getLocalDateKey(new Date(nowMs));
  const base = prev.dateKey === todayKey ? prev : createEmptyDayState(new Date(nowMs));

  const delta =
    base.activeSegmentStartMs && base.status !== "clocked_out"
      ? Math.max(0, nowMs - base.activeSegmentStartMs)
      : 0;

  let workedAccumMs = base.workedAccumMs;
  let breakAccumMs = base.breakAccumMs;
  let lunchAccumMs = base.lunchAccumMs;

  if (base.status === "working") workedAccumMs += delta;
  else if (base.status === "on_break") breakAccumMs += delta;
  else if (base.status === "on_lunch") lunchAccumMs += delta;

  const makeRecord = (label: string): TimeClockPunchRecord => ({
    id: `${action}_${nowMs}`,
    action,
    label,
    timestamp: nowMs,
  });

  if (action === "punch_in") {
    if (base.status !== "clocked_out") {
      return {
        next: base,
        ok: false,
        error: "You are already punched in for this shift.",
        vfdMessage: "ALREADY PUNCHED IN",
      };
    }
    const next: TimeClockDayState = {
      ...base,
      status: "working",
      activeSegmentStartMs: nowMs,
      firstPunchInMs: base.firstPunchInMs ?? nowMs,
      punches: [...base.punches, makeRecord("Punch In")],
    };
    return { next, ok: true, vfdMessage: "SUCCESSFUL" };
  }

  if (action === "punch_out") {
    if (base.status === "clocked_out") {
      return {
        next: base,
        ok: false,
        error: "Punch in first before punching out.",
        vfdMessage: "NOT PUNCHED IN",
      };
    }
    const next: TimeClockDayState = {
      ...base,
      status: "clocked_out",
      activeSegmentStartMs: null,
      workedAccumMs,
      breakAccumMs,
      lunchAccumMs,
      punches: [...base.punches, makeRecord("Punch Out")],
    };
    return { next, ok: true, vfdMessage: "PUNCHED OUT" };
  }

  if (action === "start_break") {
    if (base.status !== "working") {
      return {
        next: base,
        ok: false,
        error: base.status === "clocked_out" ? "Punch in first to start a break." : "End your current pause first.",
        vfdMessage: "PUNCH IN FIRST",
      };
    }
    const next: TimeClockDayState = {
      ...base,
      status: "on_break",
      activeSegmentStartMs: nowMs,
      workedAccumMs,
      breakAccumMs,
      lunchAccumMs,
      punches: [...base.punches, makeRecord("Start Break")],
    };
    return { next, ok: true, vfdMessage: "BREAK STARTED" };
  }

  if (action === "end_break") {
    if (base.status !== "on_break") {
      return { next: base, ok: false, error: "You are not currently on break.", vfdMessage: "NOT ON BREAK" };
    }
    const next: TimeClockDayState = {
      ...base,
      status: "working",
      activeSegmentStartMs: nowMs,
      workedAccumMs,
      breakAccumMs,
      lunchAccumMs,
      punches: [...base.punches, makeRecord("End Break")],
    };
    return { next, ok: true, vfdMessage: "BREAK ENDED" };
  }

  if (action === "start_lunch") {
    if (base.status !== "working") {
      return {
        next: base,
        ok: false,
        error: base.status === "clocked_out" ? "Punch in first to start lunch." : "End your current pause first.",
        vfdMessage: "PUNCH IN FIRST",
      };
    }
    const next: TimeClockDayState = {
      ...base,
      status: "on_lunch",
      activeSegmentStartMs: nowMs,
      workedAccumMs,
      breakAccumMs,
      lunchAccumMs,
      punches: [...base.punches, makeRecord("Start Lunch")],
    };
    return { next, ok: true, vfdMessage: "LUNCH STARTED" };
  }

  // end_lunch
  if (base.status !== "on_lunch") {
    return { next: base, ok: false, error: "You are not currently on lunch.", vfdMessage: "NOT ON LUNCH" };
  }
  const next: TimeClockDayState = {
    ...base,
    status: "working",
    activeSegmentStartMs: nowMs,
    workedAccumMs,
    breakAccumMs,
    lunchAccumMs,
    punches: [...base.punches, makeRecord("End Lunch")],
  };
  return { next, ok: true, vfdMessage: "LUNCH ENDED" };
}

export function formatHoursMins(ms: number): string {
  const totalMins = Math.max(0, Math.floor(ms / 60000));
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${hrs}h ${String(mins).padStart(2, "0")}m`;
}

export function formatHMS(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function formatShiftDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatPunchTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function getSplitFlapParts(date: Date): {
  hours: string;
  minutes: string;
  period: "AM" | "PM";
  seconds: number;
} {
  const rawHrs = date.getHours();
  const period: "AM" | "PM" = rawHrs >= 12 ? "PM" : "AM";
  const hrs12 = rawHrs % 12 || 12;
  return {
    hours: String(hrs12).padStart(2, "0"),
    minutes: String(date.getMinutes()).padStart(2, "0"),
    period,
    seconds: date.getSeconds(),
  };
}

/** Synthesizes a tactile vintage mechanical punch-clock KA-CHUNK + faint brass bell chime */
export function playMechanicalPunchSound(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // 1. Mechanical solenoid strike thud (low resonant metallic punch)
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = "triangle";
    thudOsc.frequency.setValueAtTime(165, now);
    thudOsc.frequency.exponentialRampToValueAtTime(42, now + 0.09);
    thudGain.gain.setValueAtTime(0.28, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    thudOsc.connect(thudGain);
    thudGain.connect(ctx.destination);
    thudOsc.start(now);
    thudOsc.stop(now + 0.12);

    // 2. Paper stamp mechanical snap (short bandpass noise burst at +65ms)
    const snapLen = Math.floor(ctx.sampleRate * 0.055);
    const snapBuf = ctx.createBuffer(1, snapLen, ctx.sampleRate);
    const data = snapBuf.getChannelData(0);
    for (let i = 0; i < snapLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (snapLen * 0.28));
    }
    const snapSrc = ctx.createBufferSource();
    snapSrc.buffer = snapBuf;
    const snapFilter = ctx.createBiquadFilter();
    snapFilter.type = "bandpass";
    snapFilter.frequency.value = 1450;
    snapFilter.Q.value = 1.4;
    const snapGain = ctx.createGain();
    snapGain.gain.value = 0.22;
    snapSrc.connect(snapFilter);
    snapFilter.connect(snapGain);
    snapGain.connect(ctx.destination);
    snapSrc.start(now + 0.055);

    // 3. Soft vintage brass confirmation ping at +120ms
    const bellOsc = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bellOsc.type = "sine";
    bellOsc.frequency.setValueAtTime(1318.5, now + 0.12); // E6 soft brass chime
    bellGain.gain.setValueAtTime(0.001, now + 0.12);
    bellGain.gain.linearRampToValueAtTime(0.08, now + 0.13);
    bellGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.42);
    bellOsc.connect(bellGain);
    bellGain.connect(ctx.destination);
    bellOsc.start(now + 0.12);
    bellOsc.stop(now + 0.45);

    window.setTimeout(() => {
      void ctx.close();
    }, 600);
  } catch {
    // ignore audio block
  }
}
