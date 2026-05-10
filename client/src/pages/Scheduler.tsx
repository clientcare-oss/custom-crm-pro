import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Phone, Video, Link2, Eye, Copy, Wrench,
  Plus, ChevronDown, ChevronUp, Trash2, Calendar, ExternalLink,
  Clock, Bell, Users, CheckCircle2, AlertCircle, Loader2
} from "lucide-react";
import { toast } from "sonner";

// ── Color palette matching the screenshot ──────────────────────────────────
const COLOR_OPTIONS = [
  "#3b82f6", "#6366f1", "#d4a017", "#92400e", "#78350f",
  "#0ea5e9", "#1d4ed8", "#64748b", "#93c5fd", "#f97316",
  "#ea580c", "#b45309", "#f9a8d4", "#ec4899", "#a855f7",
  "#7c3aed", "#c026d3", "#9333ea", "#db2777", "#e11d48",
  "#be123c", "#991b1b",
];

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABELS: Record<string, string> = {
  mon: "MON", tue: "TUE", wed: "WED", thu: "THU",
  fri: "FRI", sat: "SAT", sun: "SUN",
};

// ── Default values ─────────────────────────────────────────────────────────
const DEFAULT_WEEKLY_HOURS = {
  mon: [{ start: "08:00", end: "17:00" }],
  tue: [{ start: "08:00", end: "17:00" }],
  wed: [] as { start: string; end: string }[],
  thu: [{ start: "08:00", end: "17:00" }],
  fri: [{ start: "08:00", end: "17:00" }],
  sat: [] as { start: string; end: string }[],
  sun: [] as { start: string; end: string }[],
};

const DEFAULT_REMINDERS = [
  { method: "both" as const, amount: 1, unit: "hours" as const, notifyOwner: true },
  { method: "both" as const, amount: 15, unit: "minutes" as const, notifyOwner: true },
];

type WeeklyHours = Record<string, { start: string; end: string }[]>;
type Reminder = { method: "email" | "sms" | "both"; amount: number; unit: "minutes" | "hours"; notifyOwner: boolean };

interface SessionFormData {
  name: string;
  description: string;
  sessionFormat: "phone" | "video";
  videoType: string;
  videoLink: string;
  timezone: string;
  duration: number;
  durationUnit: "minutes" | "hours";
  dateRange: "rolling" | "indefinitely" | "fixed";
  dateRangeDays: number;
  color: string;
  instructions: string;
  confirmationMessage: string;
  bufferBefore: number;
  bufferBeforeUnit: "minutes" | "hours";
  bufferAfter: number;
  bufferAfterUnit: "minutes" | "hours";
  minNotice: number;
  minNoticeUnit: "minutes" | "hours" | "days";
  customIncrements: number;
  canReschedule: boolean;
  canCancel: boolean;
  sendConfirmationEmail: boolean;
  weeklyHours: WeeklyHours;
  reminders: Reminder[];
}

const defaultForm = (): SessionFormData => ({
  name: "",
  description: "",
  sessionFormat: "phone",
  videoType: "other",
  videoLink: "",
  timezone: "EDT/EST",
  duration: 60,
  durationUnit: "minutes",
  dateRange: "indefinitely",
  dateRangeDays: 30,
  color: "#e11d48",
  instructions: "",
  confirmationMessage: "",
  bufferBefore: 30,
  bufferBeforeUnit: "minutes",
  bufferAfter: 6,
  bufferAfterUnit: "hours",
  minNotice: 3,
  minNoticeUnit: "days",
  customIncrements: 15,
  canReschedule: true,
  canCancel: false,
  sendConfirmationEmail: true,
  weeklyHours: JSON.parse(JSON.stringify(DEFAULT_WEEKLY_HOURS)),
  reminders: JSON.parse(JSON.stringify(DEFAULT_REMINDERS)),
});

function sessionToForm(s: any): SessionFormData {
  return {
    name: s.name ?? "",
    description: s.description ?? "",
    sessionFormat: s.sessionFormat ?? "phone",
    videoType: s.videoType ?? "other",
    videoLink: s.videoLink ?? "",
    timezone: s.timezone ?? "EDT/EST",
    duration: s.duration ?? 60,
    durationUnit: s.durationUnit ?? "minutes",
    dateRange: s.dateRange ?? "indefinitely",
    dateRangeDays: s.dateRangeDays ?? 30,
    color: s.color ?? "#e11d48",
    instructions: s.instructions ?? "",
    confirmationMessage: s.confirmationMessage ?? "",
    bufferBefore: s.bufferBefore ?? 30,
    bufferBeforeUnit: s.bufferBeforeUnit ?? "minutes",
    bufferAfter: s.bufferAfter ?? 6,
    bufferAfterUnit: s.bufferAfterUnit ?? "hours",
    minNotice: s.minNotice ?? 3,
    minNoticeUnit: s.minNoticeUnit ?? "days",
    customIncrements: s.customIncrements ?? 15,
    canReschedule: s.canReschedule ?? true,
    canCancel: s.canCancel ?? false,
    sendConfirmationEmail: s.sendConfirmationEmail ?? true,
    weeklyHours: s.weeklyHours ? JSON.parse(s.weeklyHours) : JSON.parse(JSON.stringify(DEFAULT_WEEKLY_HOURS)),
    reminders: s.reminderSettings ? JSON.parse(s.reminderSettings) : JSON.parse(JSON.stringify(DEFAULT_REMINDERS)),
  };
}

// ── Session Type Card ──────────────────────────────────────────────────────
function SessionCard({
  session,
  onEdit,
  onToggle,
  onDelete,
  onCopy,
}: {
  session: any;
  onEdit: () => void;
  onToggle: (val: boolean) => void;
  onDelete: () => void;
  onCopy: () => void;
}) {
  const durationLabel = `${session.duration} ${session.durationUnit === "hours" ? (session.duration === 1 ? "hour" : "hours") : "min"}`;
  const dateRangeLabel = session.dateRange === "rolling"
    ? `Rolling-window (${session.dateRangeDays ?? 30} days)`
    : session.dateRange === "indefinitely" ? "Indefinitely" : "Fixed range";

  return (
    <Card className="p-5 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: session.color }}
          />
          <span className="text-xs text-muted-foreground capitalize">
            {session.sessionFormat === "video" ? "Video call" : "Phone call"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">
            {session.isActive ? "Active" : "Inactive"}
          </span>
          <Switch
            checked={session.isActive}
            onCheckedChange={onToggle}
            className="scale-90"
          />
        </div>
      </div>

      <div>
        <p className="font-bold text-foreground text-sm uppercase tracking-wide leading-tight line-clamp-2">
          {session.name}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {durationLabel}, {dateRangeLabel}, {session.timezone ?? "EDT/EST"}
        </p>
      </div>

      <div className="flex items-center gap-3 pt-1 border-t border-border">
        <button
          onClick={onEdit}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          title="Settings"
        >
          <Wrench className="h-3.5 w-3.5" />
        </button>
        <button
          className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          title="Copy booking link"
          onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/book?session=${session.id}`);
            toast.success("Booking link copied!");
          }}
        >
          <Link2 className="h-3.5 w-3.5" />
        </button>
        <button
          className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          title="Preview"
          onClick={() => window.open(`/book?session=${session.id}&preview=true`, "_blank")}
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
        <button
          className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          title="Duplicate"
          onClick={onCopy}
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onEdit}
          className="ml-auto text-xs font-semibold text-accent hover:text-accent/80 transition-colors"
        >
          Edit
        </button>
      </div>
    </Card>
  );
}

// ── Edit Form ──────────────────────────────────────────────────────────────
function SessionEditForm({
  initialData,
  sessionId,
  onSave,
  onDelete,
  onClose,
}: {
  initialData: SessionFormData;
  sessionId: number | null;
  onSave: (data: SessionFormData) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<SessionFormData>(initialData);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [availOpen, setAvailOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const set = (key: keyof SessionFormData, val: any) =>
    setForm((f) => ({ ...f, [key]: val }));

  const toggleDay = (day: string) => {
    const current = form.weeklyHours[day] ?? [];
    if (current.length > 0) {
      setForm((f) => ({ ...f, weeklyHours: { ...f.weeklyHours, [day]: [] } }));
    } else {
      setForm((f) => ({
        ...f,
        weeklyHours: { ...f.weeklyHours, [day]: [{ start: "08:00", end: "17:00" }] },
      }));
    }
  };

  const updateDayTime = (day: string, idx: number, field: "start" | "end", val: string) => {
    const slots = [...(form.weeklyHours[day] ?? [])];
    slots[idx] = { ...slots[idx], [field]: val };
    setForm((f) => ({ ...f, weeklyHours: { ...f.weeklyHours, [day]: slots } }));
  };

  const updateReminder = (idx: number, key: keyof Reminder, val: any) => {
    const r = [...form.reminders];
    r[idx] = { ...r[idx], [key]: val };
    setForm((f) => ({ ...f, reminders: r }));
  };

  const addReminder = () => {
    if (form.reminders.length >= 2) return;
    setForm((f) => ({
      ...f,
      reminders: [...f.reminders, { method: "both", amount: 30, unit: "minutes", notifyOwner: true }],
    }));
  };

  const removeReminder = (idx: number) => {
    setForm((f) => ({ ...f, reminders: f.reminders.filter((_, i) => i !== idx) }));
  };

  return (
    <div className="space-y-0 divide-y divide-border">
      {/* ── Details ── */}
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
        <CollapsibleTrigger className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            Details
          </div>
          {detailsOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-5 pb-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground pt-1">General</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1 space-y-1.5">
                <Label className="text-xs">Session Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. FREE DISCOVERY CALL"
                  maxLength={64}
                />
                <p className="text-xs text-muted-foreground text-right">{form.name.length}/64</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Session Type *</Label>
                <Select value={form.sessionFormat} onValueChange={(v) => set("sessionFormat", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.sessionFormat === "video" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Video type</Label>
                  <Select value={form.videoType} onValueChange={(v) => set("videoType", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zoom">Zoom</SelectItem>
                      <SelectItem value="google_meet">Google Meet</SelectItem>
                      <SelectItem value="teams">Microsoft Teams</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Video link</Label>
                  <Input
                    value={form.videoLink}
                    onChange={(e) => set("videoLink", e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Timezone *</Label>
                <Select value={form.timezone} onValueChange={(v) => set("timezone", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EDT/EST">EDT/EST</SelectItem>
                    <SelectItem value="CDT/CST">CDT/CST</SelectItem>
                    <SelectItem value="MDT/MST">MDT/MST</SelectItem>
                    <SelectItem value="PDT/PST">PDT/PST</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Duration *</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.duration}
                  onChange={(e) => set("duration", parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Interval</Label>
                <Select value={form.durationUnit} onValueChange={(v) => set("durationUnit", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Date range *</Label>
              <Select value={form.dateRange} onValueChange={(v) => set("dateRange", v)}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="indefinitely">Indefinitely</SelectItem>
                  <SelectItem value="rolling">Rolling-window</SelectItem>
                  <SelectItem value="fixed">Fixed range</SelectItem>
                </SelectContent>
              </Select>
              {form.dateRange === "rolling" && (
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="number"
                    min={1}
                    className="w-20"
                    value={form.dateRangeDays}
                    onChange={(e) => set("dateRangeDays", parseInt(e.target.value) || 30)}
                  />
                  <span className="text-sm text-muted-foreground">days ahead</span>
                </div>
              )}
            </div>

            {/* Color picker */}
            <div className="space-y-1.5">
              <Label className="text-xs">Color</Label>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_OPTIONS.map((c, ci) => (
                  <button
                    key={ci}
                    type="button"
                    onClick={() => set("color", c)}
                    className={`h-6 w-6 rounded-sm border-2 transition-all ${
                      form.color === c ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Colors help you identify session types.</p>
            </div>

            {/* Instructions */}
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground pt-2">Instructions</p>
              <p className="text-xs text-muted-foreground">Advise attendees how to come prepared.</p>
              <Textarea
                value={form.instructions}
                onChange={(e) => set("instructions", e.target.value)}
                rows={4}
                placeholder="e.g. 🚨 You have scheduled an IEP meeting with your advocate..."
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ── Availability ── */}
      <Collapsible open={availOpen} onOpenChange={setAvailOpen}>
        <CollapsibleTrigger className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Availability
          </div>
          {availOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-5 pb-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground pt-1">Weekly Hours</p>
            <p className="text-xs text-muted-foreground">Timezone: {form.timezone}</p>

            <div className="space-y-2">
              {DAYS.map((day) => {
                const slots = form.weeklyHours[day] ?? [];
                const isOn = slots.length > 0;
                return (
                  <div key={day} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isOn}
                      onChange={() => toggleDay(day)}
                      className="h-4 w-4 rounded border-border accent-accent"
                    />
                    <span className="text-xs font-semibold w-8 text-muted-foreground">{DAY_LABELS[day]}</span>
                    {isOn && slots.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={slots[0].start}
                          onChange={(e) => updateDayTime(day, 0, "start", e.target.value)}
                          className="h-8 w-28 text-xs"
                        />
                        <span className="text-muted-foreground text-xs">-</span>
                        <Input
                          type="time"
                          value={slots[0].end}
                          onChange={(e) => updateDayTime(day, 0, "end", e.target.value)}
                          className="h-8 w-28 text-xs"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No hours set</span>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground pt-2">Additional Settings</p>

            {/* Buffer time */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Switch checked={true} disabled />
                <div>
                  <p className="text-sm font-semibold text-foreground">Buffer time</p>
                  <p className="text-xs text-muted-foreground">Block off time before and/or after a scheduled timeslot.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pl-8">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={form.bufferBefore}
                    onChange={(e) => set("bufferBefore", parseInt(e.target.value) || 0)}
                    className="w-16 h-8 text-xs"
                  />
                  <Select value={form.bufferBeforeUnit} onValueChange={(v) => set("bufferBeforeUnit", v)}>
                    <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">Minutes</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">before</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={form.bufferAfter}
                    onChange={(e) => set("bufferAfter", parseInt(e.target.value) || 0)}
                    className="w-16 h-8 text-xs"
                  />
                  <Select value={form.bufferAfterUnit} onValueChange={(v) => set("bufferAfterUnit", v)}>
                    <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">Minutes</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">after</span>
                </div>
              </div>
            </div>

            {/* Minimum notice */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Switch checked={true} disabled />
                <div>
                  <p className="text-sm font-semibold text-foreground">Minimum notice</p>
                  <p className="text-xs text-muted-foreground">Time needed between scheduling and session start.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pl-8">
                <Input
                  type="number"
                  min={0}
                  value={form.minNotice}
                  onChange={(e) => set("minNotice", parseInt(e.target.value) || 0)}
                  className="w-16 h-8 text-xs"
                />
                <Select value={form.minNoticeUnit} onValueChange={(v) => set("minNoticeUnit", v)}>
                  <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Custom increments */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Switch checked={true} disabled />
                <div>
                  <p className="text-sm font-semibold text-foreground">Custom increments</p>
                  <p className="text-xs text-muted-foreground">Set availability by unique time intervals.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pl-8">
                <Select
                  value={String(form.customIncrements)}
                  onValueChange={(v) => set("customIncrements", parseInt(v))}
                >
                  <SelectTrigger className="h-8 text-xs w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20, 30, 45, 60].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">minutes</span>
              </div>
            </div>

            {/* Team availability */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Switch checked={true} disabled />
                <div>
                  <p className="text-sm font-semibold text-foreground">Team availability</p>
                  <p className="text-xs text-muted-foreground">Round robin — team members take turns handling this session.</p>
                </div>
              </div>
              <div className="pl-8 flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-7 w-7 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">W</div>
                  <span className="text-xs text-muted-foreground">Waypoint Advocates</span>
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">AH</div>
                  <span className="text-xs text-muted-foreground">Abby Honea</span>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ── Confirmation ── */}
      <Collapsible open={confirmOpen} onOpenChange={setConfirmOpen}>
        <CollapsibleTrigger className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            Confirmation
          </div>
          {confirmOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-5 pb-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground pt-1">Customizable Message</p>
            <p className="text-xs text-muted-foreground">This message appears on the confirmation page after the invitee schedules.</p>
            <Textarea
              value={form.confirmationMessage}
              onChange={(e) => set("confirmationMessage", e.target.value)}
              rows={5}
              placeholder="e.g. Thank you for scheduling! We look forward to supporting you..."
            />

            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground pt-2">Reminders</p>
            <p className="text-xs text-muted-foreground">Send attendees up to 2 reminders before a session starts.</p>

            <div className="space-y-3">
              {form.reminders.map((r, idx) => (
                <div key={idx} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Send</span>
                    <Select value={r.method} onValueChange={(v) => updateReminder(idx, "method", v)}>
                      <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="both">Email & SMS</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      value={r.amount}
                      onChange={(e) => updateReminder(idx, "amount", parseInt(e.target.value) || 1)}
                      className="h-8 w-16 text-xs"
                    />
                    <Select value={r.unit} onValueChange={(v) => updateReminder(idx, "unit", v)}>
                      <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">Minutes</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">before session</span>
                    <button onClick={() => removeReminder(idx)} className="ml-auto text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={r.notifyOwner}
                      onChange={(e) => updateReminder(idx, "notifyOwner", e.target.checked)}
                      className="h-3.5 w-3.5 accent-accent"
                    />
                    <span className="text-xs text-muted-foreground">Also send email reminders to me</span>
                  </div>
                </div>
              ))}
              {form.reminders.length < 2 && (
                <Button variant="outline" size="sm" onClick={addReminder} className="text-xs gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add reminder
                </Button>
              )}
            </div>

            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground pt-2">Additional Settings</p>
            <div className="space-y-3">
              {[
                { key: "canReschedule" as const, label: "Clients can reschedule", desc: "Attendees can reschedule using the link in confirmation messages." },
                { key: "canCancel" as const, label: "Clients can cancel", desc: "Attendees can cancel using the link in confirmation messages." },
                { key: "sendConfirmationEmail" as const, label: "Clients get confirmation email", desc: "Attendees will get an email confirming the scheduled session." },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-start gap-3">
                  <Switch
                    checked={form[key] as boolean}
                    onCheckedChange={(v) => set(key, v)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between px-5 py-4">
        {sessionId && onDelete ? (
          <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> Delete session
          </Button>
        ) : <div />}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onSave(form)} className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Save &amp; publish session
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Scheduler Page ────────────────────────────────────────────────────
export default function Scheduler() {
  const utils = trpc.useUtils();
  const { data: sessions = [], isLoading } = trpc.sessionTypes.list.useQuery();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<SessionFormData>(defaultForm());

  const createMutation = trpc.sessionTypes.create.useMutation({
    onSuccess: () => {
      toast.success("Session type created!");
      utils.sessionTypes.list.invalidate();
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Failed to create session"),
  });

  const updateMutation = trpc.sessionTypes.update.useMutation({
    onSuccess: () => {
      toast.success("Session type saved!");
      utils.sessionTypes.list.invalidate();
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Failed to save session"),
  });

  const deleteMutation = trpc.sessionTypes.delete.useMutation({
    onSuccess: () => {
      toast.success("Session type deleted");
      utils.sessionTypes.list.invalidate();
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete"),
  });

  const toggleMutation = trpc.sessionTypes.toggleActive.useMutation({
    onSuccess: () => utils.sessionTypes.list.invalidate(),
    onError: (e: any) => toast.error(e.message || "Failed to update"),
  });

  const openCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setFormData(defaultForm());
    setDialogOpen(true);
  };

  const openEdit = (session: any) => {
    setIsCreating(false);
    setEditingId(session.id);
    setFormData(sessionToForm(session));
    setDialogOpen(true);
  };

  const openCopy = (session: any) => {
    setIsCreating(true);
    setEditingId(null);
    const f = sessionToForm(session);
    f.name = `${f.name} (copy)`;
    setFormData(f);
    setDialogOpen(true);
  };

  const handleSave = (data: SessionFormData) => {
    const payload = {
      ...data,
      weeklyHours: JSON.stringify(data.weeklyHours),
      reminderSettings: JSON.stringify(data.reminders),
    };
    if (isCreating) {
      createMutation.mutate(payload as any);
    } else if (editingId !== null) {
      updateMutation.mutate({ id: editingId, ...payload } as any);
    }
  };

  const handleDelete = () => {
    if (editingId !== null) {
      deleteMutation.mutate({ id: editingId });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Scheduler</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open("/book", "_blank")} className="text-xs gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" /> View Live Scheduler
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.location.href = "/calendar"} className="text-xs gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> Go to calendar
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground">Manage your sessions</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Edit the details of your sessions, copy the links to send to clients, and preview their experience.
        </p>
      </div>

      {/* Session type grid */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading sessions…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* New session type card */}
          <button
            onClick={openCreate}
            className="rounded-xl border-2 border-dashed border-accent/40 bg-accent/5 hover:bg-accent/10 hover:border-accent/60 transition-colors flex items-center justify-center min-h-[140px] gap-2 text-accent font-semibold text-sm"
          >
            <Plus className="h-5 w-5" />
            New session type
          </button>

          {sessions.map((session: any) => (
            <SessionCard
              key={session.id}
              session={session}
              onEdit={() => openEdit(session)}
              onToggle={(val) => toggleMutation.mutate({ id: session.id, isActive: val })}
              onDelete={() => {
                setEditingId(session.id);
                deleteMutation.mutate({ id: session.id });
              }}
              onCopy={() => openCopy(session)}
            />
          ))}
        </div>
      )}

      {/* Edit / Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
            <DialogTitle className="text-base font-bold">
              {isCreating ? "New session type" : "Edit session type"}
            </DialogTitle>
          </DialogHeader>
          <SessionEditForm
            initialData={formData}
            sessionId={editingId}
            onSave={handleSave}
            onDelete={editingId ? handleDelete : undefined}
            onClose={() => setDialogOpen(false)}
          />
          {isSaving && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-xl">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
