import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Hourglass,
  Coffee,
  Utensils,
  Play,
  Pause,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import {
  loadTimeClockState,
  saveTimeClockState,
  computeLiveTotals,
  applyTimeClockAction,
  formatHoursMins,
  formatHMS,
  formatShiftDate,
  getSplitFlapParts,
  playMechanicalPunchSound,
  type TimeClockDayState,
  type TimeClockPunchAction,
  type TimeClockShiftConfig,
} from "@/lib/employeeTimeClock";
import {
  TimeClockButtonIcon,
  SplitFlapPair,
  MechanicalPunchCard,
  PunchLogModal,
} from "@/components/workstation/EmployeeTimeClockParts";
import "@/styles/workstationTimeClock.css";

export default function EmployeeTimeClockPage() {
  const [, setLocation] = useLocation();
  const [clockState, setClockState] = useState<TimeClockDayState>(() => loadTimeClockState());
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [vfdFlashMsg, setVfdFlashMsg] = useState<string | null>(null);
  const [isCardStamping, setIsCardStamping] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const flashTimerRef = useRef<number | null>(null);
  const stampTimerRef = useRef<number | null>(null);

  const startTimerMutation = trpc.timeTracking.startTimer.useMutation();
  const stopTimerMutation = trpc.timeTracking.stopTimer.useMutation();

  // Live 1-second clock & running shift ticker
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
      if (stampTimerRef.current) window.clearTimeout(stampTimerRef.current);
    };
  }, []);

  const triggerStampFeedback = (vfdMessage: string) => {
    playMechanicalPunchSound();

    setIsCardStamping(false);
    window.requestAnimationFrame(() => setIsCardStamping(true));
    if (stampTimerRef.current) window.clearTimeout(stampTimerRef.current);
    stampTimerRef.current = window.setTimeout(() => setIsCardStamping(false), 960);

    setVfdFlashMsg(vfdMessage);
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => setVfdFlashMsg(null), 4200);
  };

  const handlePunch = (action: TimeClockPunchAction) => {
    const ts = Date.now();
    const res = applyTimeClockAction(clockState, action, ts);
    if (!res.ok) {
      toast.info(res.error || "Action unavailable in current shift state.");
      setVfdFlashMsg(res.vfdMessage);
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
      flashTimerRef.current = window.setTimeout(() => setVfdFlashMsg(null), 2600);
      return;
    }

    setClockState(res.next);
    setNowMs(ts);
    saveTimeClockState(res.next);
    triggerStampFeedback(res.vfdMessage);

    // Sync cleanly with backend Timesheet live timer (non-blocking)
    if (action === "punch_in" || action === "end_break" || action === "end_lunch") {
      startTimerMutation.mutate(
        { workType: "Workstation Shift", notes: `Employee Time Clock (${action})` },
        { onError: () => {} }
      );
    } else if (action === "punch_out" || action === "start_break" || action === "start_lunch") {
      stopTimerMutation.mutate(
        { notes: `Employee Time Clock (${action})` },
        { onError: () => {} }
      );
    }

    if (action === "punch_in") {
      toast.success("Punched in — your shift is now active.");
    } else if (action === "punch_out") {
      const totals = computeLiveTotals(res.next, ts);
      toast.success(`Punched out — ${formatHoursMins(totals.workedMs)} worked logged today.`);
    } else if (action === "start_break") {
      toast.success("Break started — work timer paused.");
    } else if (action === "end_break") {
      toast.success("Break ended — welcome back to your shift.");
    } else if (action === "start_lunch") {
      toast.success("Lunch started — enjoy your meal.");
    } else if (action === "end_lunch") {
      toast.success("Lunch ended — back on the clock.");
    }
  };

  const handleSaveShiftConfig = (shiftConfig: TimeClockShiftConfig) => {
    const next: TimeClockDayState = { ...clockState, shiftConfig };
    setClockState(next);
    saveTimeClockState(next);
    toast.success("Scheduled shift updated.");
  };

  const nowDate = new Date(nowMs);
  const flap = getSplitFlapParts(nowDate);
  const totals = computeLiveTotals(clockState, nowMs);

  const isClockedOut = clockState.status === "clocked_out";
  const isWorking = clockState.status === "working";
  const isOnBreak = clockState.status === "on_break";
  const isOnLunch = clockState.status === "on_lunch";

  const vfdText =
    vfdFlashMsg ??
    (isWorking
      ? `ON SHIFT · ${formatHMS(totals.workedMs)}`
      : isOnBreak
        ? `ON BREAK · ${formatHMS(totals.currentSegmentMs)}`
        : isOnLunch
          ? `ON LUNCH · ${formatHMS(totals.currentSegmentMs)}`
          : "READY TO PUNCH");

  const vfdAmber = !vfdFlashMsg && (isOnBreak || isOnLunch);

  return (
    <ScopedErrorBoundary moduleName="Employee Time Clock">
      <div className="wp-tc-viewport">
        <div className="wp-tc-stage">
          {/* ── Photorealistic Vintage Maritime Employee Time Clock Backdrop ── */}
          <img
            src="/assets/workstation/workstation-time-clock-base.jpg?v=1"
            alt="Waypoint Employee Time Clock Mechanical Recorder"
            className="wp-tc-backdrop-img"
            draggable={false}
          />

          {/* ── Warm Breathing Lantern Glow ── */}
          <div className="wp-tc-lantern-glow" aria-hidden="true" />

          {/* ── Quiet Top Navigation Pills ── */}
          <button
            type="button"
            onClick={() => setLocation("/my-workstation")}
            className="wp-tc-nav-pill"
            style={{ left: "1.6%" }}
            title="Return to My Workstation Observatory (PG-052)"
          >
            <ArrowLeft className="w-[0.95cqw] h-[0.95cqw]" />
            <span>Observatory</span>
          </button>

          <button
            type="button"
            onClick={() => setLogOpen(true)}
            className="wp-tc-nav-pill"
            style={{ right: "1.6%" }}
            title="Inspect today's stamped punches or open full Timesheet"
          >
            <FileSpreadsheet className="w-[0.95cqw] h-[0.95cqw]" />
            <span>Punch Log ({clockState.punches.length})</span>
          </button>

          {/* ── LEFT CLIPBOARD: MY SHIFT ── */}
          <div
            className="wp-tc-clip-header"
            style={{ left: "11.5%", top: "21.2%", width: "17.5%", height: "7.6%" }}
          >
            <Calendar className="w-[1.55cqw] h-[1.55cqw] text-[#F5D68B] shrink-0" />
            <span>My Shift</span>
          </div>

          <div
            className="wp-tc-clip-body"
            style={{ left: "11.5%", top: "30.6%", width: "17.5%", height: "32.2%" }}
          >
            <div className="wp-tc-shift-row">
              <Calendar className="w-[1.35cqw] h-[1.35cqw] text-[#1c1208] shrink-0" />
              <span className="truncate">{formatShiftDate(nowDate)}</span>
            </div>
            <div className="wp-tc-shift-row">
              <Clock className="w-[1.35cqw] h-[1.35cqw] text-[#1c1208] shrink-0" />
              <span className="truncate">
                {clockState.shiftConfig.startLabel} – {clockState.shiftConfig.endLabel}
              </span>
            </div>
            <div className="wp-tc-shift-row">
              <Hourglass className="w-[1.35cqw] h-[1.35cqw] text-[#1c1208] shrink-0" />
              <span>{clockState.shiftConfig.scheduledHours}</span>
            </div>
            <div className="wp-tc-shift-row">
              <Coffee className="w-[1.35cqw] h-[1.35cqw] text-[#1c1208] shrink-0" />
              <span>Break: {clockState.shiftConfig.breakMinutes} min</span>
            </div>
            <div className="wp-tc-shift-row">
              <Utensils className="w-[1.35cqw] h-[1.35cqw] text-[#1c1208] shrink-0" />
              <span>Lunch: {clockState.shiftConfig.lunchMinutes} min</span>
            </div>
          </div>

          {/* ── CENTER MECHANICAL SPLIT-FLAP CLOCK DISPLAY ── */}
          <div className="wp-tc-flap-zone" aria-label={`Current time ${flap.hours}:${flap.minutes} ${flap.period}`}>
            <SplitFlapPair value={flap.hours} />
            <SplitFlapPair value={flap.minutes} />
            <div className="wp-tc-flap-period">{flap.period}</div>
          </div>

          {/* ── FOUR RIVETED BRASS MECHANICAL PUSH BUTTONS ── */}
          <div className="wp-tc-buttons-grid">
            {/* 1. PUNCH IN */}
            <button
              type="button"
              onClick={() => handlePunch("punch_in")}
              disabled={!isClockedOut}
              data-testid="time-clock-punch-in"
              className={`wp-tc-brass-btn ${isClockedOut ? "wp-tc-brass-btn-lit" : ""}`}
              title={isClockedOut ? "Punch in and begin your shift" : "Already punched in"}
            >
              <TimeClockButtonIcon kind="punch_in" />
              <span className="text-left">
                PUNCH
                <br />
                IN
              </span>
            </button>

            {/* 2. PUNCH OUT */}
            <button
              type="button"
              onClick={() => handlePunch("punch_out")}
              disabled={isClockedOut}
              data-testid="time-clock-punch-out"
              className={`wp-tc-brass-btn ${isWorking ? "wp-tc-brass-btn-lit" : ""}`}
              title={isClockedOut ? "Punch in first before punching out" : "Punch out and end your shift"}
            >
              <TimeClockButtonIcon kind="punch_out" />
              <span className="text-left">
                PUNCH
                <br />
                OUT
              </span>
            </button>

            {/* 3. START / END BREAK */}
            <button
              type="button"
              onClick={() => handlePunch(isOnBreak ? "end_break" : "start_break")}
              disabled={isClockedOut || isOnLunch}
              data-testid="time-clock-break"
              className={`wp-tc-brass-btn ${isOnBreak ? "wp-tc-brass-btn-lit" : ""}`}
              title={
                isOnBreak
                  ? "End break and resume shift"
                  : isClockedOut
                    ? "Punch in first to take a break"
                    : "Pause work timer for a break"
              }
            >
              <TimeClockButtonIcon kind="break" />
              <span className="text-left">
                {isOnBreak ? "END" : "START"}
                <br />
                BREAK
              </span>
            </button>

            {/* 4. START / END LUNCH */}
            <button
              type="button"
              onClick={() => handlePunch(isOnLunch ? "end_lunch" : "start_lunch")}
              disabled={isClockedOut || isOnBreak}
              data-testid="time-clock-lunch"
              className={`wp-tc-brass-btn ${isOnLunch ? "wp-tc-brass-btn-lit" : ""}`}
              title={
                isOnLunch
                  ? "End lunch and resume shift"
                  : isClockedOut
                    ? "Punch in first to take lunch"
                    : "Pause work timer for lunch"
              }
            >
              <TimeClockButtonIcon kind="lunch" />
              <span className="text-left">
                {isOnLunch ? "END" : "START"}
                <br />
                LUNCH
              </span>
            </button>
          </div>

          {/* ── GREEN PHOSPHOR DOT-MATRIX VFD STATUS READOUT ── */}
          <div className="wp-tc-vfd-screen" role="status" aria-live="polite">
            <span className={`wp-tc-vfd-text ${vfdAmber ? "wp-tc-vfd-text-amber" : ""}`}>
              {vfdText}
            </span>
          </div>

          {/* ── ANIMATED MECHANICAL PAPER TIME CARD SLOT ── */}
          <MechanicalPunchCard
            punches={clockState.punches}
            isStamping={isCardStamping}
            onClick={() => setLogOpen(true)}
          />

          {/* ── RIGHT CLIPBOARD: MY TIME TODAY ── */}
          <div
            className="wp-tc-clip-header"
            style={{ left: "73.2%", top: "21.2%", width: "20.3%", height: "7.6%" }}
          >
            <Hourglass className="w-[1.5cqw] h-[1.5cqw] text-[#F5D68B] shrink-0" />
            <span>My Time Today</span>
          </div>

          <div
            className="wp-tc-clip-body"
            style={{ left: "73.2%", top: "30.6%", width: "20.3%", height: "32.2%" }}
          >
            <div className="wp-tc-time-row">
              <div className="flex items-center gap-[0.55cqw]">
                <span
                  className={`inline-flex items-center justify-center w-[1.75cqw] h-[1.75cqw] rounded-full shadow-sm ${
                    isWorking
                      ? "bg-[#30a828] text-white shadow-[0_0_8px_rgba(48,168,40,0.65)]"
                      : isOnBreak || isOnLunch
                        ? "bg-amber-600 text-white"
                        : "bg-[#3f8f34]/85 text-white"
                  }`}
                >
                  {isOnBreak || isOnLunch ? (
                    <Pause className="w-[0.95cqw] h-[0.95cqw] fill-current" />
                  ) : (
                    <Play className="w-[0.95cqw] h-[0.95cqw] fill-current ml-[0.1cqw]" />
                  )}
                </span>
                <span>Worked:</span>
              </div>
              <span className="wp-tc-time-val">{formatHoursMins(totals.workedMs)}</span>
            </div>

            <div className="wp-tc-time-row">
              <div className="flex items-center gap-[0.55cqw]">
                <Coffee className="w-[1.55cqw] h-[1.55cqw] text-[#1c1208] shrink-0" />
                <span>Break:</span>
              </div>
              <span className="wp-tc-time-val">{formatHoursMins(totals.breakMs)}</span>
            </div>

            <div className="wp-tc-time-row">
              <div className="flex items-center gap-[0.55cqw]">
                <Utensils className="w-[1.55cqw] h-[1.55cqw] text-[#1c1208] shrink-0" />
                <span>Lunch:</span>
              </div>
              <span className="wp-tc-time-val">{formatHoursMins(totals.lunchMs)}</span>
            </div>

            <div className="wp-tc-time-row">
              <div className="flex items-center gap-[0.55cqw]">
                <span className="inline-flex items-center justify-center w-[1.55cqw] font-serif font-black text-[1.45cqw] text-[#1c1208]">
                  Σ
                </span>
                <span>Total:</span>
              </div>
              <span className="wp-tc-time-val">{formatHoursMins(totals.totalMs)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Punch Card History & Shift Schedule Modal */}
      <PunchLogModal
        open={logOpen}
        onClose={() => setLogOpen(false)}
        state={clockState}
        workedMs={totals.workedMs}
        breakMs={totals.breakMs}
        lunchMs={totals.lunchMs}
        totalMs={totals.totalMs}
        onSaveShiftConfig={handleSaveShiftConfig}
        onOpenFullTimesheet={() => {
          setLogOpen(false);
          setLocation("/crew-quarters?tab=timesheet");
        }}
      />
    </ScopedErrorBoundary>
  );
}
