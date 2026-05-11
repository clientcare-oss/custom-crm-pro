import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Calendar, Clock, ExternalLink, MapPin, Plus, User, Video, X } from "lucide-react";
import VoiceTextarea from "@/components/VoiceTextarea";
import VoiceInput from "@/components/VoiceInput";
import { useState } from "react";
import { toast } from "sonner";
import CalendarView from "@/components/CalendarView";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MEETING_TYPES = ["IEP Meeting", "1:1 with Advocate", "Progress Update", "Consultation", "Follow-up"];

interface Appointment {
  id: number;
  clientId: number | null;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  location: string | null;
  videoLink?: string | null;
  parentName?: string | null;
  studentName?: string | null;
  status: string;
  ownerId: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function Appointments() {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [formData, setFormData] = useState({
    clientId: "",
    title: "",
    description: "",
    meetingType: "",
    startTime: "",
    endTime: "",
    location: "",
    videoLink: "",
    parentName: "",
    studentName: "",
  });

  const { data: appointments = [], refetch } = trpc.appointments.list.useQuery();
  const { data: contacts = [] } = trpc.contacts.list.useQuery();
  const { data: availability = [], refetch: refetchAvailability } = trpc.availability.get.useQuery();

  const createMutation = trpc.appointments.create.useMutation({
    onSuccess: () => {
      toast.success("Appointment created!");
      setShowCreate(false);
      setFormData({ clientId: "", title: "", description: "", meetingType: "", startTime: "", endTime: "", location: "", videoLink: "", parentName: "", studentName: "" });
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.appointments.update.useMutation({
    onSuccess: () => {
      toast.success("Appointment updated!");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateAvailabilityMutation = trpc.availability.update.useMutation({
    onSuccess: () => {
      toast.success("Availability updated!");
      refetchAvailability();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCreate = () => {
    if (!formData.clientId || !formData.title || !formData.startTime || !formData.endTime) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (new Date(formData.endTime) <= new Date(formData.startTime)) {
      toast.error("End time must be after start time");
      return;
    }
    createMutation.mutate({
      clientId: parseInt(formData.clientId),
      title: formData.title,
      description: formData.description || undefined,
      startTime: new Date(formData.startTime),
      endTime: new Date(formData.endTime),
      location: formData.location || undefined,
      videoLink: formData.videoLink || undefined,
      parentName: formData.parentName || undefined,
      studentName: formData.studentName || undefined,
    });
  };

  const handleStatusChange = (id: number, status: string) => {
    updateMutation.mutate({ id, status: status as "Scheduled" | "Confirmed" | "Completed" | "Cancelled" });
    if (selectedApt?.id === id) {
      setSelectedApt((prev) => prev ? { ...prev, status } : null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Scheduled": return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
      case "Confirmed": return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
      case "Completed": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      case "Cancelled": return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBarColor = (status: string) => {
    switch (status) {
      case "Confirmed": return "bg-green-500";
      case "Cancelled": return "bg-red-500";
      case "Completed": return "bg-gray-400";
      default: return "bg-blue-500";
    }
  };

  const sortedAppointments = [...appointments].sort(
    (a: Appointment, b: Appointment) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const upcomingAppointments = sortedAppointments.filter(
    (a: Appointment) => new Date(a.startTime) >= new Date() && a.status !== "Cancelled"
  );

  const pastAppointments = sortedAppointments.filter(
    (a: Appointment) => new Date(a.startTime) < new Date() || a.status === "Cancelled"
  );

  const fmt = (dt: Date | string) => {
    const d = new Date(dt);
    return {
      date: d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
      time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  };

  return (
    <div className="p-6 space-y-6">
      {/* ── Event Detail Popup ── */}
      {selectedApt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedApt(null)}
        >
          <div
            className="bg-card text-card-foreground rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`h-1.5 w-full ${getStatusBarColor(selectedApt.status)}`} />
            <div className="p-5 space-y-4">
              {/* Title + close */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold leading-tight">{selectedApt.title}</h2>
                  <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedApt.status)}`}>
                    {selectedApt.status}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedApt(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors mt-0.5 shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Date & Time */}
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">{fmt(selectedApt.startTime).date}</p>
                  <p className="text-muted-foreground">
                    {fmt(selectedApt.startTime).time} – {fmt(selectedApt.endTime).time}
                  </p>
                </div>
              </div>

              {/* Join Meeting */}
              {selectedApt.videoLink && (
                <a
                  href={selectedApt.videoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                >
                  <Video className="h-4 w-4" />
                  Join Meeting
                  <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                </a>
              )}

              {/* Location */}
              {selectedApt.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-sm">{selectedApt.location}</p>
                </div>
              )}

              {/* Participants */}
              {(selectedApt.parentName || selectedApt.studentName) && (
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="text-sm space-y-1">
                    {selectedApt.parentName && (
                      <p>
                        <span className="font-medium text-muted-foreground">Parent:</span>{" "}
                        {selectedApt.parentName}
                      </p>
                    )}
                    {selectedApt.studentName && (
                      <p>
                        <span className="font-medium text-muted-foreground">Student:</span>{" "}
                        {selectedApt.studentName}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedApt.description && (
                <p className="text-sm text-muted-foreground border-t pt-3">{selectedApt.description}</p>
              )}

              {/* Status change */}
              <div className="flex items-center gap-2 border-t pt-3">
                <span className="text-xs text-muted-foreground shrink-0">Status:</span>
                <Select
                  value={selectedApt.status}
                  onValueChange={(v) => handleStatusChange(selectedApt.id, v)}
                >
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                    <SelectItem value="Confirmed">Confirmed</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">Manage your schedule and client meetings</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Schedule Appointment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">Client *</label>
                <Select value={formData.clientId} onValueChange={(v) => setFormData({ ...formData, clientId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((c: any) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.firstName} {c.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Title *</label>
                <VoiceInput
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Meeting title"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Meeting Type</label>
                <Select value={formData.meetingType} onValueChange={(v) => setFormData({ ...formData, meetingType: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEETING_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Start Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      let newEnd = formData.endTime;
                      if (newStart) {
                        const startDate = new Date(newStart);
                        const startDateStr = newStart.split("T")[0];
                        const endDateStr = formData.endTime ? formData.endTime.split("T")[0] : "";
                        if (!formData.endTime || endDateStr !== startDateStr) {
                          const autoEnd = new Date(startDate.getTime() + 60 * 60 * 1000);
                          newEnd = autoEnd.toISOString().slice(0, 16);
                        }
                      }
                      setFormData({ ...formData, startTime: newStart, endTime: newEnd });
                    }}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.endTime}
                    min={formData.startTime || undefined}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Location</label>
                <VoiceInput
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="e.g., Zoom, Office, Phone"
                />
              </div>
              <div>
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5" /> Video / Meeting Link
                </label>
                <VoiceInput
                  type="text"
                  value={formData.videoLink}
                  onChange={(e) => setFormData({ ...formData, videoLink: e.target.value })}
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="https://teams.microsoft.com/... or Zoom link"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Parent Name</label>
                  <VoiceInput
                    type="text"
                    value={formData.parentName}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Parent name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Student Name</label>
                  <VoiceInput
                    type="text"
                    value={formData.studentName}
                    onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Student name"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <VoiceTextarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                  placeholder="Notes about this meeting..."
                />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Scheduling..." : "Schedule Appointment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingAppointments.length}</p>
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {appointments.filter((a: Appointment) => a.status === "Confirmed").length}
                </p>
                <p className="text-sm text-muted-foreground">Confirmed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{appointments.length}</p>
                <p className="text-sm text-muted-foreground">Total Meetings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Calendar View ── */}
      <CalendarView appointments={appointments as any} />

      {/* ── Upcoming Appointments ── */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingAppointments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No upcoming appointments</p>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((apt: Appointment) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedApt(apt)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/5 flex flex-col items-center justify-center shrink-0">
                      <span className="text-xs font-medium text-primary">
                        {new Date(apt.startTime).toLocaleDateString([], { month: "short" })}
                      </span>
                      <span className="text-lg font-bold text-primary leading-none">
                        {new Date(apt.startTime).getDate()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{apt.title}</p>
                        {apt.videoLink && <Video className="h-3.5 w-3.5 text-blue-500" aria-label="Video meeting" />}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(apt.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {" – "}
                        {new Date(apt.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      {(apt.parentName || apt.studentName) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[apt.parentName, apt.studentName].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                      {apt.status}
                    </span>
                    <Select
                      value={apt.status}
                      onValueChange={(v) => handleStatusChange(apt.id, v)}
                    >
                      <SelectTrigger className="w-[130px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                        <SelectItem value="Confirmed">Confirmed</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Availability Management ── */}
      <Card>
        <CardHeader>
          <CardTitle>Your Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Set your available hours for client bookings</p>
          <div className="space-y-3">
            {DAYS.map((day, index) => {
              const dayAvail = (availability as any[]).find((a: any) => a.dayOfWeek === index);
              const isAvailable = dayAvail?.isAvailable ?? (index >= 1 && index <= 5);
              const startTime = dayAvail?.startTime ?? "09:00";
              const endTime = dayAvail?.endTime ?? "17:00";
              return (
                <div key={day} className="flex items-center gap-4 p-3 rounded-lg border">
                  <div className="w-28">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAvailable}
                        onChange={(e) => {
                          const updated = DAYS.map((_, i) => {
                            const existing = (availability as any[]).find((a: any) => a.dayOfWeek === i);
                            if (i === index) {
                              return { dayOfWeek: i, startTime: existing?.startTime ?? "09:00", endTime: existing?.endTime ?? "17:00", isAvailable: e.target.checked };
                            }
                            return { dayOfWeek: i, startTime: existing?.startTime ?? "09:00", endTime: existing?.endTime ?? "17:00", isAvailable: existing?.isAvailable ?? (i >= 1 && i <= 5) };
                          });
                          updateAvailabilityMutation.mutate(updated);
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm font-medium">{day}</span>
                    </label>
                  </div>
                  {isAvailable && (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        defaultValue={startTime}
                        onBlur={(e) => {
                          const updated = DAYS.map((_, i) => {
                            const existing = (availability as any[]).find((a: any) => a.dayOfWeek === i);
                            if (i === index) {
                              return { dayOfWeek: i, startTime: e.target.value, endTime: existing?.endTime ?? "17:00", isAvailable: true };
                            }
                            return { dayOfWeek: i, startTime: existing?.startTime ?? "09:00", endTime: existing?.endTime ?? "17:00", isAvailable: existing?.isAvailable ?? (i >= 1 && i <= 5) };
                          });
                          updateAvailabilityMutation.mutate(updated);
                        }}
                        className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                      />
                      <span className="text-sm text-muted-foreground">to</span>
                      <input
                        type="time"
                        defaultValue={endTime}
                        onBlur={(e) => {
                          const updated = DAYS.map((_, i) => {
                            const existing = (availability as any[]).find((a: any) => a.dayOfWeek === i);
                            if (i === index) {
                              return { dayOfWeek: i, startTime: existing?.startTime ?? "09:00", endTime: e.target.value, isAvailable: true };
                            }
                            return { dayOfWeek: i, startTime: existing?.startTime ?? "09:00", endTime: existing?.endTime ?? "17:00", isAvailable: existing?.isAvailable ?? (i >= 1 && i <= 5) };
                          });
                          updateAvailabilityMutation.mutate(updated);
                        }}
                        className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                      />
                    </div>
                  )}
                  {!isAvailable && (
                    <span className="text-sm text-muted-foreground italic">Unavailable</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Past Appointments ── */}
      {pastAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground">Past & Cancelled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pastAppointments.slice(0, 10).map((apt: Appointment) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-3 rounded-lg border opacity-70 cursor-pointer hover:opacity-100 hover:bg-accent/30 transition-all"
                  onClick={() => setSelectedApt(apt)}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-sm">{apt.title}</p>
                        {apt.videoLink && <Video className="h-3 w-3 text-blue-500" />}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(apt.startTime).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
