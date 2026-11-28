/**
 * Harbor Radar · Task Operations (PG-054)
 * Effort-bucket classification, smart "Do First" priority scoring, persistent per-task duration overrides,
 * and collision-free polar placement on the 4 concentric radar rings.
 */

export type DurationBucket = "short" | "30m" | "1h" | "2-3h";
export type HarborViewMode = "radar" | "fleet" | "priority" | "student" | "due";

export interface RadarTaskItem {
  uid: string; // e.g. "internal-42" or "case-17"
  source: "internal" | "case";
  rawId: number;
  title: string;
  description: string | null;
  status: string;
  priority: "urgent" | "high" | "medium" | "low";
  dueDate: Date | null;
  studentName: string | null;
  projectName: string | null;
  bucket: DurationBucket;
  isOverdue: boolean;
  isDueToday: boolean;
  isUrgent: boolean;
  isInProgress: boolean;
  score: number;
  isRecommendedFirst: boolean;
}

export interface PlacedRadarShip {
  task: RadarTaskItem;
  /** Percentage coordinates inside the circular radar glass container (0..100) */
  xPct: number;
  yPct: number;
  angleDeg: number;
}

export const DURATION_META: Record<
  DurationBucket,
  {
    label: string;
    shortLabel: string;
    ringTag: string;
    flagColor: string;
    flagStroke: string;
    ringRadiusPct: number; // % of half-radar box (0 = lighthouse hub, 100 = outer rim)
  }
> = {
  short: {
    label: "Short (5–10m)",
    shortLabel: "5–10 Min",
    ringTag: "5–10 Min",
    flagColor: "#22C55E",
    flagStroke: "#14532D",
    ringRadiusPct: 33,
  },
  "30m": {
    label: "30 Min",
    shortLabel: "30 Min",
    ringTag: "30 Min",
    flagColor: "#FACC15",
    flagStroke: "#713F12",
    ringRadiusPct: 54,
  },
  "1h": {
    label: "1 Hour",
    shortLabel: "1 Hour",
    ringTag: "1 Hour",
    flagColor: "#3B82F6",
    flagStroke: "#1E3A8A",
    ringRadiusPct: 72,
  },
  "2-3h": {
    label: "2 – 3 Hours",
    shortLabel: "2–3 Hrs",
    ringTag: "2 – 3 Hours",
    flagColor: "#EF4444",
    flagStroke: "#7F1D1D",
    ringRadiusPct: 87,
  },
};

const BUCKET_STORAGE_KEY = "waypoint_harbor_radar_buckets_v1";

export function loadBucketOverrides(): Record<string, DurationBucket> {
  try {
    const raw = localStorage.getItem(BUCKET_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export function saveBucketOverride(uid: string, bucket: DurationBucket): Record<string, DurationBucket> {
  const next = { ...loadBucketOverrides(), [uid]: bucket };
  try {
    localStorage.setItem(BUCKET_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage failures
  }
  return next;
}

/** Heuristic effort-duration classifier when a task has no manual ring override */
export function inferDurationBucket(title: string, description: string | null, priority: string): DurationBucket {
  const text = `${title} ${description || ""}`.toLowerCase();

  // Explicit time mentions in title/description
  if (/\b(2\s*[-–to]+\s*3\s*h|2\s*hr|3\s*hr|deep\s*dive|state\s*complaint|full\s*iep|iep\s*audit|evaluation\s*review|due\s*process|comprehensive)\b/.test(text)) {
    return "2-3h";
  }
  if (/\b(1\s*hr|1\s*hour|60\s*min|prep|draft|pwn|comparator|strategy|meeting\s*prep|blueprint|write\s*letter|review\s*iep)\b/.test(text)) {
    return "1h";
  }
  if (/\b(30\s*min|half\s*hour|follow\s*up|follow-up|update|notes|summary|schedule|organize|intake|call\s*parent)\b/.test(text)) {
    return "30m";
  }
  if (/\b(5\s*min|10\s*min|quick|email|text|sms|send|confirm|remind|ping|check|upload|sign|approve|reply)\b/.test(text)) {
    return "short";
  }

  // Fallback by priority / length
  if (priority === "urgent") return "2-3h";
  if (priority === "high") return "1h";
  if (title.length > 48) return "1h";
  if (title.length < 24) return "short";
  return "30m";
}

export function normalizePriority(raw: string | null | undefined, status: string): "urgent" | "high" | "medium" | "low" {
  if (status === "stuck") return "urgent";
  const p = (raw || "").toLowerCase().trim();
  if (p === "urgent" || p === "critical") return "urgent";
  if (p === "high") return "high";
  if (p === "low") return "low";
  return "medium";
}

/**
 * Computes a smart "Do First" priority score so employees immediately see which ship to tackle next:
 * Overdue + Urgent rise to the top, followed by Due Today, In-Progress momentum, and Quick 5-10m wins.
 */
export function computeDoFirstScore(item: Omit<RadarTaskItem, "score" | "isRecommendedFirst">): number {
  let score = 0;
  if (item.isOverdue) score += 120;
  if (item.isDueToday) score += 75;
  if (item.priority === "urgent") score += 90;
  else if (item.priority === "high") score += 50;
  else if (item.priority === "medium") score += 20;
  if (item.isInProgress) score += 35;
  // Tie-breaker bonus for fast quick wins (5-10m) to clear deck fast
  if (item.bucket === "short") score += 18;
  else if (item.bucket === "30m") score += 10;
  if (item.dueDate) {
    const daysAway = (item.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysAway > 0 && daysAway <= 3) score += Math.round((4 - daysAway) * 12);
  }
  return score;
}

/**
 * Places tasks onto their exact concentric radar rings with balanced angular spread,
 * strictly avoiding the North duration-tag corridor (-26° to +26° from North / top).
 */
export function placeShipsOnRadar(tasks: RadarTaskItem[]): PlacedRadarShip[] {
  const byBucket: Record<DurationBucket, RadarTaskItem[]> = {
    short: [],
    "30m": [],
    "1h": [],
    "2-3h": [],
  };
  tasks.forEach((t) => byBucket[t.bucket].push(t));

  // Preferred pleasing maritime angles (degrees clockwise from North = 0°),
  // avoiding [-26°, +26°] (duration tags) and [172°, 188°] (South marker)
  const preferredAngles: Record<DurationBucket, number[]> = {
    short: [76, 242, 134, 295, 110, 210],
    "30m": [296, 128, 224, 62, 156, 326, 260, 95],
    "1h": [244, 124, 52, 304, 152, 208, 86, 274],
    "2-3h": [48, 296, 138, 226, 74, 268, 158, 320],
  };

  const placed: PlacedRadarShip[] = [];

  (["short", "30m", "1h", "2-3h"] as DurationBucket[]).forEach((bucket) => {
    const list = byBucket[bucket];
    const baseRadius = DURATION_META[bucket].ringRadiusPct;
    const slots = preferredAngles[bucket];

    list.forEach((task, idx) => {
      let angleDeg: number;
      if (idx < slots.length) {
        angleDeg = slots[idx];
      } else {
        // Distribute extra tasks smoothly in the safe 36°..324° arc
        const extra = idx - slots.length;
        angleDeg = 40 + ((extra * 57) % 280);
        if (angleDeg > 170 && angleDeg < 190) angleDeg += 22;
      }

      // Slight radial stagger if many ships share one ring so they never overlap
      const radialJitter = list.length > 4 ? ((idx % 3) - 1) * 3.2 : 0;
      const r = Math.max(24, Math.min(91, baseRadius + radialJitter));
      const rad = ((angleDeg - 90) * Math.PI) / 180; // 0° = North (top)

      // Convert polar % radius into (xPct, yPct) inside circular radar container
      const xPct = 50 + Math.cos(rad) * (r * 0.485);
      const yPct = 50 + Math.sin(rad) * (r * 0.485);
      placed.push({ task, xPct, yPct, angleDeg });
    });
  });

  return placed;
}

export function formatDueSummary(dueDate: Date | null): string {
  if (!dueDate) return "No due date";
  const now = new Date();
  const diffDays = Math.floor(
    (new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  if (diffDays < -1) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === -1) return "Overdue (Yesterday)";
  if (diffDays === 0) return "Due Today";
  if (diffDays === 1) return "Due Tomorrow";
  return dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
