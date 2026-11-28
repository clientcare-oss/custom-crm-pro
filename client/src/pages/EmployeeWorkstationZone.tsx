import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import {
  LighthouseAmbientEffects,
  TodaysWatchBoard,
  HarborRadarPorthole,
  WatchAlertsPopover,
  type WatchCounts,
} from "@/components/workstation/WorkstationZoneParts";
import "@/styles/workstationZone.css";

interface ConsoleCommandItem {
  id: string;
  label: string;
  path: string;
  left: string;
  width: string;
  title: string;
}

const CONSOLE_COMMANDS: ConsoleCommandItem[] = [
  {
    id: "my-tasks",
    label: "My Tasks",
    path: "/tasks",
    left: "21.0%",
    width: "12.4%",
    title: "Open My Tasks & Case To-Dos (PG-009)",
  },
  {
    id: "my-meetings",
    label: "My Meetings",
    path: "/meeting-workspace",
    left: "33.5%",
    width: "11.8%",
    title: "Open Live Meeting Workspace (PG-043)",
  },
  {
    id: "my-messages",
    label: "My Messages",
    path: "/crew-quarters?tab=messages",
    left: "45.4%",
    width: "11.8%",
    title: "Open Crew Messages Workspace (PG-038-MSG)",
  },
  {
    id: "my-notes",
    label: "My Notes",
    path: "/brain-dump",
    left: "57.4%",
    width: "11.8%",
    title: "Open My Notes & BrainDump (PG-021)",
  },
  {
    id: "work-center",
    label: "Work Center",
    path: "/students",
    left: "69.2%",
    width: "12.4%",
    title: "Open Student Cases & Work Center (PG-004)",
  },
];

export default function EmployeeWorkstationZone() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [alertsOpen, setAlertsOpen] = useState(false);

  const isStaff = Boolean(user && user.role !== "client");

  // Live CRM operational counts for Today's Watch & Harbor Radar
  const { data: tasks = [] } = trpc.internalTasks.list.useQuery(
    { status: "all" },
    { enabled: isStaff, refetchInterval: 30000 }
  );
  const { data: appointments = [] } = trpc.appointments.list.useQuery(undefined, {
    enabled: isStaff,
    refetchInterval: 30000,
  });
  const { data: crewStats } = trpc.crewMessages.getOverviewStats.useQuery(undefined, {
    enabled: isStaff,
    refetchInterval: 20000,
  });
  const { data: unreadClientMsgs = [] } = trpc.messages.unread.useQuery(undefined, {
    enabled: Boolean(user),
    refetchInterval: 20000,
  });
  const { data: contacts = [] } = trpc.contacts.list.useQuery(undefined, {
    enabled: isStaff,
    refetchInterval: 60000,
  });

  const watchCounts = useMemo<WatchCounts>(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const openTasks = (tasks as Array<{ status?: string | null; priority?: string | null; dueDate?: string | Date | null }>).filter(
      (t) => t.status !== "completed" && t.status !== "done" && t.status !== "cancelled"
    );

    const todaysMeetings = (appointments as Array<{ startTime?: string | Date | null; date?: string | null; status?: string | null }>).filter(
      (a) => {
        if (a.status === "cancelled") return false;
        const raw = a.startTime ?? a.date;
        if (!raw) return false;
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return false;
        return d.toISOString().slice(0, 10) === todayStr;
      }
    );

    const unreadMessages = (crewStats?.unreadTotal ?? 0) + (Array.isArray(unreadClientMsgs) ? unreadClientMsgs.length : 0);

    const urgentOrOverdueTasks = openTasks.filter((t) => {
      if (t.priority === "urgent" || t.priority === "high") return true;
      if (t.dueDate) {
        const due = new Date(t.dueDate);
        if (!Number.isNaN(due.getTime()) && due.getTime() < now.getTime()) return true;
      }
      return false;
    }).length;

    const atRiskStudents = (contacts as Array<{ studentStatus?: string | null; status?: string | null }>).filter((c) => {
      const s = `${c.studentStatus || ""} ${c.status || ""}`.toLowerCase();
      return s.includes("risk") || s.includes("urgent") || s.includes("escalat");
    }).length;

    return {
      tasks: openTasks.length,
      meetings: todaysMeetings.length,
      messages: unreadMessages,
      atRisk: Math.max(atRiskStudents, urgentOrOverdueTasks),
    };
  }, [tasks, appointments, crewStats, unreadClientMsgs, contacts]);

  const activeCasesCount = useMemo(() => {
    return (contacts as Array<{ studentStatus?: string | null; gradeLevel?: string | null; caseId?: string | null }>).filter(
      (c) => Boolean(c.studentStatus || c.gradeLevel || c.caseId)
    ).length;
  }, [contacts]);

  const totalAlerts = watchCounts.messages + watchCounts.atRisk;

  return (
    <ScopedErrorBoundary moduleName="Employee Workstation Zone">
      <div className="wp-wz-viewport">
        <div className="wp-wz-stage">
          {/* ── Photorealistic Lighthouse Lantern Room Backdrop ── */}
          <img
            src="/assets/workstation/workstation-zone-base.jpg"
            alt="Waypoint Advocates Lighthouse Lantern Room Employee Workstation"
            className="wp-wz-backdrop-img"
            draggable={false}
          />

          {/* ── Ambient Fresnel Lantern Breathing Glow + Steaming Waypoint Mug ── */}
          <LighthouseAmbientEffects />

          {/* ── Top-Left WAYPOINT ADVOCATES Badge (Click to return to PG-052 Arrival Lounge) ── */}
          <button
            type="button"
            onClick={() => setLocation("/my-workstation")}
            className="absolute left-[5.8%] top-[0.4%] w-[23.0%] h-[11.8%] z-[8] rounded-lg cursor-pointer bg-transparent hover:bg-amber-300/[0.06] transition-colors"
            title="Return to My Workstation Observatory & Focus Radio (PG-052)"
            aria-label="Return to My Workstation Observatory"
          />

          {/* ── Top-Center Razor-Sharp Retina Engraved Title Plaque ── */}
          <div className="wp-wz-title-plaque">
            <h1 className="wp-wz-main-title">Employee Workstation</h1>
            <p className="wp-wz-main-subtitle">OPERATION · ADVOCACY · SUPPORT</p>
          </div>

          {/* ── Top-Right 4 Circular Cast-Brass Hardware Buttons ── */}
          <button
            type="button"
            onClick={() => setAlertsOpen((v) => !v)}
            className="wp-wz-top-btn"
            style={{ left: "73.3%" }}
            title={totalAlerts > 0 ? `${totalAlerts} Watch Alerts` : "Watch Alerts"}
            aria-label="Open Watch Alerts"
          >
            {totalAlerts > 0 && (
              <span className="wp-wz-bell-badge">{totalAlerts > 99 ? "99+" : totalAlerts}</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setLocation("/calendar")}
            className="wp-wz-top-btn"
            style={{ left: "79.9%" }}
            title="Open Waypoint Calendar (PG-007)"
            aria-label="Open Calendar"
          />

          <button
            type="button"
            onClick={() => setLocation("/knowledge-base")}
            className="wp-wz-top-btn"
            style={{ left: "86.4%" }}
            title="Open Knowledge Base & SOP Help (PG-016)"
            aria-label="Open Help & Knowledge Base"
          />

          <button
            type="button"
            onClick={() => setLocation("/crew-quarters?tab=profile")}
            className="wp-wz-top-btn"
            style={{ left: "92.8%" }}
            title="My Employee Profile & Credentials (PG-038-CRD)"
            aria-label="Open Employee Profile"
          />

          <WatchAlertsPopover
            open={alertsOpen}
            onClose={() => setAlertsOpen(false)}
            counts={watchCounts}
            onNavigate={setLocation}
          />

          {/* ── Left Hanging Parchment Board: Live Today's Watch ── */}
          <TodaysWatchBoard counts={watchCounts} onNavigate={setLocation} />

          {/* ── Left Stacked IDEA / IEP / 504 Law Volumes Shortcut ── */}
          <button
            type="button"
            onClick={() => setLocation("/knowledge-base/state-law")}
            className="absolute left-[0.4%] top-[66.2%] w-[13.0%] h-[24.5%] z-[6] rounded-md cursor-pointer bg-transparent hover:bg-amber-300/[0.06] transition-colors"
            title="Open IDEA / IEP / 504 Education Law Library (PG-016-LAW)"
            aria-label="Open Education Law Library"
          />

          {/* ── Right Circular Animated Harbor Radar Porthole (Opens PG-054 Task Radar) ── */}
          <HarborRadarPorthole
            activeCasesCount={watchCounts.tasks || activeCasesCount}
            onOpenPipeline={() => setLocation("/my-workstation/radar")}
          />

          {/* ── Bottom 5 Cast-Brass Command Console Buttons ── */}
          {CONSOLE_COMMANDS.map((cmd) => (
            <button
              key={cmd.id}
              type="button"
              onClick={() => setLocation(cmd.path)}
              className="wp-wz-console-btn"
              style={{ left: cmd.left, width: cmd.width }}
              title={cmd.title}
              aria-label={cmd.label}
            >
              <span className="wp-wz-console-label">{cmd.label}</span>
            </button>
          ))}
        </div>
      </div>
    </ScopedErrorBoundary>
  );
}
