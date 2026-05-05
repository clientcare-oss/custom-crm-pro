import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Calendar, Clock, Plus, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
  status: string;
  ownerId: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function Appointments() {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    clientId: "",
    title: "",
    description: "",
    meetingType: "",
    startTime: "",
    endTime: "",
    location: "",
  });

  const { data: appointments = [], refetch } = trpc.appointments.list.useQuery();
  const { data: contacts = [] } = trpc.contacts.list.useQuery();
  const { data: availability = [] } = trpc.availability.get.useQuery();

  const createMutation = trpc.appointments.create.useMutation({
    onSuccess: () => {
      toast.success("Appointment created!");
      setShowCreate(false);
      setFormData({ clientId: "", title: "", description: "", meetingType: "", startTime: "", endTime: "", location: "" });
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
    onSuccess: () => toast.success("Availability updated!"),
    onError: (err) => toast.error(err.message),
  });

  const handleCreate = () => {
    if (!formData.clientId || !formData.title || !formData.startTime || !formData.endTime) {
      toast.error("Please fill in all required fields");
      return;
    }
    createMutation.mutate({
      clientId: parseInt(formData.clientId),
      title: formData.title,
      description: formData.description || undefined,
      startTime: new Date(formData.startTime),
      endTime: new Date(formData.endTime),
      location: formData.location || undefined,
    });
  };

  const handleStatusChange = (id: number, status: string) => {
    updateMutation.mutate({ id, status: status as "Scheduled" | "Confirmed" | "Completed" | "Cancelled" });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Scheduled": return "bg-blue-100 text-blue-800";
      case "Confirmed": return "bg-green-100 text-green-800";
      case "Completed": return "bg-gray-100 text-gray-800";
      case "Cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Sort appointments by date
  const sortedAppointments = [...appointments].sort(
    (a: Appointment, b: Appointment) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const upcomingAppointments = sortedAppointments.filter(
    (a: Appointment) => new Date(a.startTime) >= new Date() && a.status !== "Cancelled"
  );

  const pastAppointments = sortedAppointments.filter(
    (a: Appointment) => new Date(a.startTime) < new Date() || a.status === "Cancelled"
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
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
          <DialogContent className="max-w-md">
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
                <input
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
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="e.g., Zoom, Office, Phone"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600" />
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
              <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                <Clock className="h-5 w-5 text-green-600" />
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
              <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <User className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{appointments.length}</p>
                <p className="text-sm text-muted-foreground">Total Meetings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments */}
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
                <div key={apt.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/5 flex flex-col items-center justify-center">
                      <span className="text-xs font-medium text-primary">
                        {new Date(apt.startTime).toLocaleDateString([], { month: "short" })}
                      </span>
                      <span className="text-lg font-bold text-primary leading-none">
                        {new Date(apt.startTime).getDate()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{apt.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(apt.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {" - "}
                        {new Date(apt.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}

                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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

      {/* Past Appointments */}
      {pastAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground">Past & Cancelled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pastAppointments.slice(0, 10).map((apt: Appointment) => (
                <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg border opacity-70">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-sm">{apt.title}</p>
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
