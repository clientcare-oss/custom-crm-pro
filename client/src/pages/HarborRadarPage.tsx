import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ScopedErrorBoundary } from "@/components/ScopedErrorBoundary";
import { WatchAlertsPopover } from "@/components/workstation/WorkstationZoneParts";
import {
  HarborStatusBoard,
  RadarTaskShip,
  TaskCommandDrawer,
  TaskFleetOverlay,
} from "@/components/workstation/HarborRadarParts";
import {
  DURATION_META,
  computeDoFirstScore,
  formatDueSummary,
  inferDurationBucket,
  loadBucketOverrides,
  normalizePriority,
  placeShipsOnRadar,
  saveBucketOverride,
  type DurationBucket,
  type HarborViewMode,
  type RadarTaskItem,
} from "@/lib/harborRadarTasks";
import "@/styles/workstationRadar.css";

const HARBOR_MODES: Array<{ mode: HarborViewMode; label: string; top: string }> = [
  { mode: "radar", label: "Radar View", top: "28.4%" },
  { mode: "fleet", label: "Task Fleet (All)", top: "35.8%" },
  { mode: "priority", label: "By Priority", top: "43.2%" },
  { mode: "student", label: "By Student", top: "50.6%" },
  { mode: "due", label: "By Due Time", top: "58.0%" },
];

const BOTTOM_COMMANDS = [
  { id: "my-tasks", label: "My Tasks", path: "/tasks", left: "16.4%", width: "14.4%", title: "Open Full Tasks Queue (PG-009)" },
  { id: "my-meetings", label: "My Meetings", path: "/meeting-workspace", left: "30.8%", width: "14.2%", title: "Open Live Meeting Workspace (PG-043)" },
  { id: "my-messages", label: "My Messages", path: "/crew-quarters?tab=messages", left: "45.2%", width: "14.2%", title: "Open Crew Messages (PG-038-MSG)" },
  { id: "my-notes", label: "My Notes", path: "/brain-dump", left: "59.6%", width: "14.2%", title: "Open My Notes & BrainDump (PG-021)" },
  { id: "work-center", label: "Work Center", path: "/students", left: "73.6%", width: "15.0%", title: "Open Student Work Center (PG-004)" },
];

const RING_TAGS: Array<{ bucket: DurationBucket; top: string }> = [
  { bucket: "2-3h", top: "7.8%" },
  { bucket: "1h", top: "18.2%" },
  { bucket: "30m", top: "28.6%" },
  { bucket: "short", top: "38.8%" },
];

export default function HarborRadarPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const isStaff = Boolean(user && user.role !== "client");

  const [viewMode, setViewMode] = useState<HarborViewMode>("radar");
  const [bucketFilter, setBucketFilter] = useState<DurationBucket | "all">("all");
  const [bucketOverrides, setBucketOverrides] = useState<Record<string, DurationBucket>>(loadBucketOverrides);
  const [selectedTaskUid, setSelectedTaskUid] = useState<string | null>(null);
  const [hoveredTask, setHoveredTask] = useState<RadarTaskItem | null>(null);
  const [alertsOpen, setAlertsOpen] = useState(false);

  // Real CRM Tasks + Alerts Queries
  const { data: internalTasks = [] } = trpc.internalTasks.list.useQuery(
    { status: "all" },
    { enabled: isStaff, refetchInterval: 25000 }
  );
  const { data: caseTasks = [] } = trpc.tasks.getAll.useQuery(undefined, {
    enabled: isStaff,
    refetchInterval: 25000,
  });
  const { data: crewStats } = trpc.crewMessages.getOverviewStats.useQuery(undefined, {
    enabled: isStaff,
    refetchInterval: 20000,
  });
  const { data: unreadClientMsgs = [] } = trpc.messages.unread.useQuery(undefined, {
    enabled: Boolean(user),
    refetchInterval: 20000,
  });

  // Mutations with clean toast error handling (Rule B)
  const updateInternalMutation = trpc.internalTasks.update.useMutation({
    onSuccess: () => {
      void utils.internalTasks.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to update task"),
  });

  const updateCaseTaskMutation = trpc.tasks.update.useMutation({
    onSuccess: () => {
      void utils.tasks.getAll.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to update student case task"),
  });

  const createInternalMutation = trpc.internalTasks.create.useMutation({
    onSuccess: () => {
      void utils.internalTasks.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to dispatch new task"),
  });

  const isBusy =
    updateInternalMutation.isPending ||
    updateCaseTaskMutation.isPending ||
    createInternalMutation.isPending;

  // Build unified open Harbor Fleet ranked by smart Do-First score
  const fleet = useMemo<RadarTaskItem[]>(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;

    const rawItems: Array<Omit<RadarTaskItem, "score" | "isRecommendedFirst">> = [];

    (internalTasks as Array<Record<string, unknown>>).forEach((t) => {
      const status = String(t.status || "not_started");
      if (status === "complete") return;
      const id = Number(t.id);
      const uid = `internal-${id}`;
      const title = String(t.title || "Untitled Task");
      const description = t.description ? String(t.description) : null;
      const dueDate = t.dueDate ? new Date(String(t.dueDate)) : null;
      const validDue = dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null;
      const priority = normalizePriority(t.priority ? String(t.priority) : null, status);
      const bucket = bucketOverrides[uid] ?? inferDurationBucket(title, description, priority);

      rawItems.push({
        uid,
        source: "internal",
        rawId: id,
        title,
        description,
        status,
        priority,
        dueDate: validDue,
        studentName: t.linkedStudentName ? String(t.linkedStudentName) : null,
        projectName: t.projectName ? String(t.projectName) : null,
        bucket,
        isOverdue: Boolean(validDue && validDue.getTime() < todayStart),
        isDueToday: Boolean(validDue && validDue.getTime() >= todayStart && validDue.getTime() < tomorrowStart),
        isUrgent: priority === "urgent" || status === "stuck",
        isInProgress: status === "in_progress",
      });
    });

    (caseTasks as Array<Record<string, unknown>>).forEach((t) => {
      const status = String(t.status || "Todo");
      if (status === "Done") return;
      const id = Number(t.id);
      const uid = `case-${id}`;
      const title = String(t.title || "Student Case Task");
      const description = t.description ? String(t.description) : null;
      const dueDate = t.dueDate ? new Date(String(t.dueDate)) : null;
      const validDue = dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null;
      const priority = normalizePriority(t.priority ? String(t.priority) : null, status);
      const bucket = bucketOverrides[uid] ?? inferDurationBucket(title, description, priority);

      rawItems.push({
        uid,
        source: "case",
        rawId: id,
        title,
        description,
        status,
        priority,
        dueDate: validDue,
        studentName: t.studentName ? String(t.studentName) : null,
        projectName: t.projectName ? String(t.projectName) : null,
        bucket,
        isOverdue: Boolean(validDue && validDue.getTime() < todayStart),
        isDueToday: Boolean(validDue && validDue.getTime() >= todayStart && validDue.getTime() < tomorrowStart),
        isUrgent: priority === "urgent",
        isInProgress: status === "In Progress",
      });
    });

    const scored = rawItems
      .map((item) => ({
        ...item,
        score: computeDoFirstScore(item),
        isRecommendedFirst: false,
      }))
      .sort((a, b) => b.score - a.score);

    if (scored.length > 0) {
      scored[0].isRecommendedFirst = true;
    }

    return scored;
  }, [internalTasks, caseTasks, bucketOverrides]);

  const bucketCounts = useMemo(() => {
    const counts = { total: fleet.length, short: 0, "30m": 0, "1h": 0, "2-3h": 0 };
    fleet.forEach((t) => {
      counts[t.bucket] += 1;
    });
    return counts;
  }, [fleet]);

  const placedShips = useMemo(() => placeShipsOnRadar(fleet), [fleet]);
  const selectedTask = useMemo(
    () => fleet.find((t) => t.uid === selectedTaskUid) || null,
    [fleet, selectedTaskUid]
  );

  const unreadMessages =
    (crewStats?.unreadTotal ?? 0) + (Array.isArray(unreadClientMsgs) ? unreadClientMsgs.length : 0);
  const urgentCount = fleet.filter((t) => t.isOverdue || t.isUrgent).length;
  const totalAlerts = unreadMessages + urgentCount;

  const handleChangeBucket = (uid: string, nextBucket: DurationBucket) => {
    const updated = saveBucketOverride(uid, nextBucket);
    setBucketOverrides(updated);
    toast.success(`Moved ship to ${DURATION_META[nextBucket].label} ring`);
  };

  const handleStartTask = (task: RadarTaskItem) => {
    if (task.source === "internal") {
      updateInternalMutation.mutate(
        { id: task.rawId, status: "in_progress" },
        { onSuccess: () => toast.success(`Started "${task.title}"`) }
      );
    } else {
      updateCaseTaskMutation.mutate(
        { id: task.rawId, status: "In Progress" },
        { onSuccess: () => toast.success(`Started "${task.title}"`) }
      );
    }
  };

  const handleCompleteTask = (task: RadarTaskItem) => {
    if (selectedTaskUid === task.uid) setSelectedTaskUid(null);
    if (task.source === "internal") {
      updateInternalMutation.mutate(
        { id: task.rawId, status: "complete" },
        { onSuccess: () => toast.success(`Completed "${task.title}" — ship cleared from Harbor Radar!`) }
      );
    } else {
      updateCaseTaskMutation.mutate(
        { id: task.rawId, status: "Done" },
        { onSuccess: () => toast.success(`Completed "${task.title}" — ship cleared from Harbor Radar!`) }
      );
    }
  };

  const handleCreateQuickTask = (title: string, bucket: DurationBucket) => {
    createInternalMutation.mutate(
      { title, status: "not_started" },
      {
        onSuccess: (created) => {
          if (created?.id) {
            setBucketOverrides(saveBucketOverride(`internal-${created.id}`, bucket));
          }
          toast.success(`Dispatched "${title}" onto ${DURATION_META[bucket].shortLabel} ring!`);
        },
      }
    );
  };

  return (
    <ScopedErrorBoundary moduleName="Harbor Radar">
      <div className="wp-hr-viewport">
        <div className="wp-hr-stage">
          {/* ── Photorealistic Harbor Radar Command Bridge Backdrop ── */}
          <img
            src="/assets/workstation/workstation-radar-base.jpg"
            alt="Waypoint Advocates Harbor Radar Task Operations"
            className="wp-hr-backdrop-img"
            draggable={false}
          />

          {/* ── Top-Left WAYPOINT ADVOCATES Badge (Return to PG-053 Employee Workstation Zone) ── */}
          <button
            type="button"
            onClick={() => setLocation("/my-workstation/zone")}
            className="absolute left-[9.0%] top-[0.4%] w-[23.6%] h-[10.6%] z-[9] rounded-lg cursor-pointer bg-transparent hover:bg-amber-300/[0.06] transition-colors"
            title="Return to Employee Workstation Zone (PG-053)"
            aria-label="Return to Employee Workstation Zone"
          />

          {/* ── Top-Center Engraved Title Plaque ── */}
          <div className="wp-hr-title-plaque">
            <h1 className="wp-hr-main-title">Harbor Radar</h1>
            <p className="wp-hr-main-sub">Task Operations</p>
          </div>

          {/* ── Top-Right 4 Circular Cast-Brass Hardware Buttons ── */}
          <button
            type="button"
            onClick={() => setAlertsOpen((v) => !v)}
            className="wp-hr-top-btn"
            style={{ left: "76.6%" }}
            title={totalAlerts > 0 ? `${totalAlerts} Watch Alerts` : "Watch Alerts"}
            aria-label="Open Watch Alerts"
          >
            {totalAlerts > 0 && (
              <span className="wp-hr-bell-badge">{totalAlerts > 99 ? "99+" : totalAlerts}</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setLocation("/calendar")}
            className="wp-hr-top-btn"
            style={{ left: "82.6%" }}
            title="Open Calendar (PG-007)"
            aria-label="Open Calendar"
          />

          <button
            type="button"
            onClick={() => setLocation("/knowledge-base")}
            className="wp-hr-top-btn"
            style={{ left: "88.4%" }}
            title="Open Knowledge Base (PG-016)"
            aria-label="Open Knowledge Base"
          />

          <button
            type="button"
            onClick={() => setLocation("/crew-quarters?tab=profile")}
            className="wp-hr-top-btn"
            style={{ left: "94.0%" }}
            title="Employee Profile & Credentials (PG-038-CRD)"
            aria-label="Open Employee Profile"
          />

          <WatchAlertsPopover
            open={alertsOpen}
            onClose={() => setAlertsOpen(false)}
            counts={{
              tasks: fleet.length,
              meetings: 0,
              messages: unreadMessages,
              atRisk: urgentCount,
            }}
            onNavigate={setLocation}
          />

          {/* ── Left Hanging Parchment Board: Harbor Status (Live Counts + Clickable Ring Filters) ── */}
          <HarborStatusBoard
            counts={bucketCounts}
            activeFilter={bucketFilter}
            onSelectFilter={(b) => {
              setBucketFilter(b);
              setViewMode("radar");
            }}
          />

          {/* ── GIANT CENTRAL INTERACTIVE RADAR SCOPE ── */}
          <div className="wp-hr-radar-circle" role="region" aria-label="Interactive Task Duration Radar">
            {/* Live Rotating 360° Emerald Radar Sweep */}
            <div className="wp-hr-radar-sweep" aria-hidden="true" />

            {/* Cardinal Markers (N / E / S / W) */}
            <span className="wp-hr-cardinal" style={{ top: "1.4%", left: "50%", transform: "translateX(-50%)" }}>N</span>
            <span className="wp-hr-cardinal" style={{ bottom: "1.2%", left: "50%", transform: "translateX(-50%)" }}>S</span>
            <span className="wp-hr-cardinal" style={{ left: "1.6%", top: "50%", transform: "translateY(-50%)" }}>W</span>
            <span className="wp-hr-cardinal" style={{ right: "1.6%", top: "50%", transform: "translateY(-50%)" }}>E</span>

            {/* 4 Sculpted Cast-Brass Ring Duration Tags along the North Axis */}
            {RING_TAGS.map(({ bucket, top }) => (
              <button
                key={bucket}
                type="button"
                onClick={() => setBucketFilter((prev) => (prev === bucket ? "all" : bucket))}
                className={`wp-hr-ring-tag ${bucketFilter === bucket ? "wp-hr-ring-tag-active" : ""}`}
                style={{ top }}
                title={`Click to filter ${DURATION_META[bucket].label} tasks`}
              >
                {DURATION_META[bucket].ringTag}
              </button>
            ))}

            {/* Plotted Live Interactive Task Ships */}
            {placedShips.map((ship) => (
              <RadarTaskShip
                key={ship.task.uid}
                ship={ship}
                isSelected={selectedTaskUid === ship.task.uid}
                dimmed={bucketFilter !== "all" && ship.task.bucket !== bucketFilter}
                onSelect={(t) => setSelectedTaskUid((prev) => (prev === t.uid ? null : t.uid))}
                onHover={setHoveredTask}
              />
            ))}

            {/* Calm Harbor Notice if 0 open tasks exist */}
            {fleet.length === 0 && (
              <div className="absolute left-1/2 bottom-[13%] -translate-x-1/2 z-15 px-3.5 py-1.5 rounded-full bg-[#031424]/90 border border-emerald-400/45 text-emerald-200 font-serif text-[0.95cqw] whitespace-nowrap shadow-lg">
                All Clear in Harbor — 0 Open Tasks
              </div>
            )}
          </div>

          {/* Floating Ship Hover Readout Pill (bottom-center just above console) */}
          {hoveredTask && viewMode === "radar" && (
            <div className="absolute left-[52%] bottom-[19.8%] -translate-x-1/2 z-25 pointer-events-none px-3.5 py-1.5 rounded-xl bg-[#041226]/95 border border-[#C5A059]/75 shadow-[0_12px_30px_rgba(0,0,0,0.92)] flex items-center gap-2.5 max-w-[36cqw]">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: DURATION_META[hoveredTask.bucket].flagColor }}
              />
              <span className="font-serif font-bold text-[0.95cqw] text-[#FFF5D8] truncate">
                {hoveredTask.title}
              </span>
              <span className="text-[0.8cqw] font-semibold text-[#D6C197] shrink-0">
                {DURATION_META[hoveredTask.bucket].shortLabel} · {formatDueSummary(hoveredTask.dueDate)}
              </span>
            </div>
          )}

          {/* Alternate Fleet / Priority / Student / Due Time Interactive Views */}
          {viewMode !== "radar" && (
            <TaskFleetOverlay
              mode={viewMode}
              tasks={bucketFilter === "all" ? fleet : fleet.filter((t) => t.bucket === bucketFilter)}
              onSelectTask={(t) => {
                setSelectedTaskUid(t.uid);
                setViewMode("radar");
              }}
              onCompleteTask={handleCompleteTask}
              onCreateQuickTask={handleCreateQuickTask}
              onReturnToRadar={() => setViewMode("radar")}
              isBusy={isBusy}
            />
          )}

          {/* Selected Ship Command Orders Drawer */}
          <TaskCommandDrawer
            task={selectedTask}
            onClose={() => setSelectedTaskUid(null)}
            onChangeBucket={handleChangeBucket}
            onStartTask={handleStartTask}
            onCompleteTask={handleCompleteTask}
            onOpenAllTasks={() => setLocation("/tasks")}
            isBusy={isBusy}
          />

          {/* ── Right Cast-Brass Panel: Task Harbor (5 View Switchers) ── */}
          <div className="wp-hr-harbor-title">Task Harbor</div>
          {HARBOR_MODES.map((item) => {
            const isActive = viewMode === item.mode;
            return (
              <button
                key={item.mode}
                type="button"
                onClick={() => setViewMode(item.mode)}
                className={`wp-hr-harbor-btn ${isActive ? "wp-hr-harbor-btn-active" : ""}`}
                style={{ top: item.top }}
                aria-pressed={isActive}
              >
                <span className="wp-hr-harbor-btn-label">{item.label}</span>
              </button>
            );
          })}

          {/* ── Bottom 5 Cast-Brass Navigation Buttons ── */}
          {BOTTOM_COMMANDS.map((cmd) => (
            <button
              key={cmd.id}
              type="button"
              onClick={() => setLocation(cmd.path)}
              className="wp-hr-console-btn"
              style={{ left: cmd.left, width: cmd.width }}
              title={cmd.title}
              aria-label={cmd.label}
            >
              <span className="wp-hr-console-label">{cmd.label}</span>
            </button>
          ))}
        </div>
      </div>
    </ScopedErrorBoundary>
  );
}
